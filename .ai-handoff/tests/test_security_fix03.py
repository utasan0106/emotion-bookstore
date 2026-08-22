#!/usr/bin/env python3
"""Reproducible fail-closed adversarial tests for AI Handoff Security Fix 03."""

import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = REPO_ROOT / ".ai-handoff" / "scripts"
sys.path.insert(0, str(SCRIPTS))

from candidate_import import apply_changes, read_archive  # noqa: E402
from capture_diff import candidate_manifest, source_diff, write_candidate  # noqa: E402
from content_manifest import copy_preimage, differences, scan  # noqa: E402
from freeze_authority import freeze  # noqa: E402
from git_state_guard import sanitize as sanitize_git  # noqa: E402
from hq_review import write_review  # noqa: E402
from schema_validate import validate as validate_schema  # noqa: E402
from scope_guard import evaluate  # noqa: E402
from secure_temp import secure_write_text  # noqa: E402
from validate_request import TASK_ID_PATTERN, validate_allowed_paths, validate_task_file  # noqa: E402
from verify_frozen_authority import verify as verify_frozen  # noqa: E402


def run(*args, cwd):
    return subprocess.run(args, cwd=cwd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def init_repo(root, files):
    root.mkdir(parents=True)
    for relative, content in files.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    run("git", "init", "-q", cwd=root)
    run("git", "config", "user.name", "Security Test", cwd=root)
    run("git", "config", "user.email", "security@example.invalid", cwd=root)
    run("git", "add", ".", cwd=root)
    run("git", "commit", "-qm", "baseline", cwd=root)


class ContentAuthorityTests(unittest.TestCase):
    def test_forbidden_change_remains_visible_after_malicious_commit(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "repo"
            init_repo(root, {"v3-prototype/allowed.txt": "ok\n", "protected.txt": "base\n"})
            before = scan(root)
            (root / "protected.txt").write_text("committed bypass attempt\n", encoding="utf-8")
            run("git", "add", "protected.txt", cwd=root)
            run("git", "commit", "-qm", "attempt to hide forbidden content", cwd=root)
            self.assertEqual(run("git", "status", "--porcelain", cwd=root).stdout, b"")
            after = scan(root)
            result = evaluate(before, after, {"allowed_paths": ["v3-prototype/allowed.txt"]})
            self.assertFalse(result["ok"])
            self.assertEqual(result["changed"], ["protected.txt"])
            self.assertIn("outside exhaustive literal allowed_paths", result["violations"][0]["reason"])

    def test_new_allowed_file_is_in_changed_set_and_source_diff_content(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            root = base / "repo"
            root.mkdir()
            (root / "v3-prototype").mkdir()
            before = scan(root)
            preimage = base / "preimage"
            copy_preimage(root, preimage, before)
            added = root / "v3-prototype" / "evidence" / "new.txt"
            added.parent.mkdir(parents=True)
            added.write_text("new allowed evidence\n", encoding="utf-8")
            after = scan(root)
            changes = differences(before, after)
            result = evaluate(before, after, {"allowed_paths": ["v3-prototype/evidence/new.txt"]})
            self.assertTrue(result["ok"])
            self.assertEqual(result["changed"], ["v3-prototype/evidence/new.txt"])
            patch = source_diff(preimage, root, changes)
            self.assertIn("new allowed evidence", patch)
            self.assertIn("/dev/null", patch)


class FrozenAuthorityTests(unittest.TestCase):
    def test_tamper_fails_against_original_external_manifest(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            (source / "scripts").mkdir(parents=True)
            (source / "schemas").mkdir()
            (source / "scripts" / "hq_review.py").write_text("print('safe')\n", encoding="utf-8")
            (source / "schemas" / "review.json").write_text("{}\n", encoding="utf-8")
            for name in ("HQ_RULES.md", "REQUEST.json", "CODEX_TASK.md"):
                (source / name).write_text(f"{name}\n", encoding="utf-8")
            protected = root / "runner-temp"
            protected.mkdir()
            bundle = protected / "bundle"
            manifest = protected / "manifest.json"
            sums = protected / "sums.txt"
            freeze(source, bundle, manifest, sums, protected)
            self.assertTrue(verify_frozen(bundle, manifest)["ok"])
            target = bundle / "HQ_RULES.md"
            os.chmod(target, 0o600)
            target.write_text("tampered after freeze\n", encoding="utf-8")
            result = verify_frozen(bundle, manifest)
            self.assertFalse(result["ok"])
            self.assertEqual(result["violations"][0]["reason"], "hash or size mismatch")


class RunnerBoundaryTests(unittest.TestCase):
    def test_job_b_imports_candidate_bytes_not_job_a_git_state(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            job_a = base / "job-a"
            job_b = base / "job-b"
            initial = {"v3-prototype/base.txt": "base\n"}
            init_repo(job_a, initial)
            init_repo(job_b, initial)
            (job_a / ".git" / "JOB_A_POISON").write_text("must not cross boundary\n", encoding="utf-8")
            before = scan(job_a)
            preimage = base / "preimage"
            copy_preimage(job_a, preimage, before)
            new_file = job_a / "v3-prototype" / "new.txt"
            new_file.write_text("candidate bytes\n", encoding="utf-8")
            after = scan(job_a)
            changes = differences(before, after)
            manifest = candidate_manifest(before, after, changes)
            archive = base / "candidate.tar.gz"
            write_candidate(archive, job_a, manifest)
            with tarfile.open(archive, "r:gz") as packet:
                names = packet.getnames()
            self.assertFalse(any(name == ".git" or name.startswith(".git/") or "/.git/" in name for name in names))
            job_b_before_git = (job_b / ".git" / "config").read_bytes()
            staging = base / "staging"
            _, imported_changes, staged = read_archive(
                archive, staging, scan(job_b), ["v3-prototype/new.txt"]
            )
            apply_changes(job_b, imported_changes, staged)
            self.assertEqual((job_b / "v3-prototype/new.txt").read_text(encoding="utf-8"), "candidate bytes\n")
            self.assertEqual((job_b / ".git" / "config").read_bytes(), job_b_before_git)
            self.assertFalse((job_b / ".git" / "JOB_A_POISON").exists())

    def test_candidate_archive_with_git_state_is_rejected_before_apply(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            root = base / "repo"
            root.mkdir()
            (root / "v3-prototype").mkdir()
            before = scan(root)
            after = scan(root)
            manifest = candidate_manifest(before, after, [])
            archive = base / "malicious.tar.gz"
            with tarfile.open(archive, "w:gz") as packet:
                manifest_bytes = json.dumps(manifest).encode("utf-8")
                info = tarfile.TarInfo("manifest.json")
                info.size = len(manifest_bytes)
                packet.addfile(info, io.BytesIO(manifest_bytes))
                poison = b"[core]\nhooksPath=/evil\n"
                info = tarfile.TarInfo("files/.git/config")
                info.size = len(poison)
                packet.addfile(info, io.BytesIO(poison))
            with self.assertRaises(ValueError):
                read_archive(archive, base / "staging", before, [])
            self.assertFalse((root / ".git").exists())


class GitPoisonTests(unittest.TestCase):
    def test_head_movement_fails_git_defense_even_with_clean_status(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            root = base / "repo"
            init_repo(root, {"v3-prototype/file.txt": "base\n"})
            expected = sanitize_git(root, base / "neutral-hooks")
            expected_path = base / "expected.json"
            expected_path.write_text(json.dumps(expected), encoding="utf-8")
            (root / "v3-prototype/file.txt").write_text("committed movement\n", encoding="utf-8")
            run("git", "add", ".", cwd=root)
            run("git", "commit", "-qm", "move head", cwd=root)
            output = base / "verify.json"
            process = subprocess.run(
                [sys.executable, str(SCRIPTS / "git_state_guard.py"), "verify", "--repo-root", str(root), "--expected", str(expected_path), "--output", str(output)],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
            self.assertNotEqual(process.returncode, 0)
            result = json.loads(output.read_text(encoding="utf-8"))
            self.assertIn("head", result["drift"])

    def test_skip_worktree_index_poison_fails_closed(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            root = base / "repo"
            init_repo(root, {"v3-prototype/file.txt": "base\n"})
            expected = sanitize_git(root, base / "neutral-hooks")
            expected_path = base / "expected.json"
            expected_path.write_text(json.dumps(expected), encoding="utf-8")
            run("git", "update-index", "--skip-worktree", "v3-prototype/file.txt", cwd=root)
            process = subprocess.run(
                [sys.executable, str(SCRIPTS / "git_state_guard.py"), "verify", "--repo-root", str(root), "--expected", str(expected_path), "--output", str(base / "verify.json")],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
            self.assertNotEqual(process.returncode, 0)
            self.assertIn(b"abnormal Git index flags", process.stderr)


class SecurePromptAndSchemaTests(unittest.TestCase):
    def test_prompt_output_rejects_existing_symlink_and_symlink_parent(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            valid = root / "protected" / "prompt.md"
            secure_write_text(valid, "safe\n", root)
            with self.assertRaises(FileExistsError):
                secure_write_text(valid, "overwrite\n", root)
            target = root / "target"
            target.mkdir()
            symlink = root / "linked"
            symlink.symlink_to(target, target_is_directory=True)
            with self.assertRaises(ValueError):
                secure_write_text(symlink / "prompt.md", "unsafe\n", root)
            leaf_target = root / "leaf-target"
            leaf_target.write_text("target\n", encoding="utf-8")
            leaf_link = root / "prompt-link.md"
            leaf_link.symlink_to(leaf_target)
            with self.assertRaises(FileExistsError):
                secure_write_text(leaf_link, "unsafe\n", root)

    def test_invalid_hq_response_fails_local_schema_validation(self):
        schema = json.loads((REPO_ROOT / ".ai-handoff/schemas/hq-review.schema.json").read_text(encoding="utf-8"))
        valid = {
            "disposition": "HOLD", "summary": "review", "issues": [], "fix_prompt": "",
            "evidence_required": [], "protected_scope_violation": False,
            "runtime_visual_evidence_present": False, "source_authority_uncertain": False,
        }
        self.assertTrue(validate_schema(valid, schema))
        invalid = dict(valid)
        invalid["unvalidated_extra"] = True
        with self.assertRaises(ValueError):
            validate_schema(invalid, schema)
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "review.json"
            github_output = Path(temporary) / "github-output.txt"
            with self.assertRaises(ValueError):
                write_review(invalid, schema, output, github_output)
            self.assertFalse(output.exists())
            self.assertFalse(github_output.exists())

    def test_task_file_symlink_and_malicious_request_values_fail_closed(self):
        attacks = [
            "**", ["*"], ["**"], "index.html", ["index.html"],
            ["../index.html"], ["v3-prototype/../index.html"],
            [".ai-handoff/HQ_RULES.md"], [".github/workflows/x.yml"],
        ]
        for attack in attacks:
            with self.subTest(allowed_paths=attack):
                with self.assertRaises(ValueError):
                    validate_allowed_paths(attack)
        for task_id in ("bad/id", "bad id", "x\nkey=value", "${{ github.token }}", "a" * 65):
            with self.subTest(task_id=task_id):
                self.assertIsNone(TASK_ID_PATTERN.fullmatch(task_id))
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            handoff = root / ".ai-handoff"
            handoff.mkdir()
            real = root / "outside.md"
            real.write_text("outside\n", encoding="utf-8")
            (handoff / "CODEX_TASK.md").symlink_to(real)
            with self.assertRaises(ValueError):
                validate_task_file(root)


class WorkflowStaticTests(unittest.TestCase):
    def test_workflow_has_fresh_jobs_no_tmp_prompt_and_narrow_secret_steps(self):
        workflow = (REPO_ROOT / ".github/workflows/ai-handoff-loop.yml").read_text(encoding="utf-8")
        self.assertIn("job_a_codex:", workflow)
        self.assertIn("job_b_hq:", workflow)
        self.assertIn("actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093", workflow)
        self.assertNotIn("/tmp/codex", workflow)
        self.assertNotIn("prompt-file: /tmp", workflow)
        self.assertGreaterEqual(workflow.count("python -I"), 2)
        self.assertEqual(workflow.count("secrets.OPENAI_API_KEY"), 2)
        self.assertIn("git_is_not_scope_authority", (REPO_ROOT / ".ai-handoff/scripts/scope_guard.py").read_text(encoding="utf-8"))
        self.assertIn("/v3-prototype/", (REPO_ROOT / ".vercelignore").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
