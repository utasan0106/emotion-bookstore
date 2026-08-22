#!/usr/bin/env python3
"""Defense-in-depth checks for Git poison; never a content-scope authority."""

import argparse
import hashlib
import json
import os
import stat
import subprocess
from pathlib import Path

DANGEROUS_ENV_PREFIXES = (
    "GIT_CONFIG_", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_OBJECT_DIRECTORY",
    "GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR",
    "GIT_CEILING_DIRECTORIES", "GIT_SSH",
)
DANGEROUS_CONFIG_PREFIXES = ("filter.", "diff.", "merge.", "url.", "include.", "includeif.")
DANGEROUS_CONFIG_KEYS = {"core.attributesfile", "core.sshcommand", "core.gitproxy"}


def run(repo_root, *arguments, check=True):
    clean_env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    return subprocess.run(
        ["git", "-C", str(repo_root), *arguments], check=check,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=clean_env,
    )


def reject_git_environment():
    poisoned = sorted(key for key in os.environ if key.startswith(DANGEROUS_ENV_PREFIXES))
    if poisoned:
        raise ValueError(f"Git environment overrides are forbidden: {poisoned}")


def local_config(repo_root):
    entries = []
    for raw in run(repo_root, "config", "--local", "--null", "--list").stdout.split(b"\0"):
        if raw:
            key, _, value = raw.decode("utf-8", "surrogateescape").partition("\n")
            entries.append((key.lower(), value))
    return sorted(entries)


def reject_dangerous_config(entries, allow_neutral=False):
    violations = []
    for key, value in entries:
        if key.startswith(DANGEROUS_CONFIG_PREFIXES) or key in DANGEROUS_CONFIG_KEYS:
            violations.append(key)
        if key in ("core.hookspath", "core.fsmonitor") and not allow_neutral:
            violations.append(key)
        if key == "core.fsmonitor" and allow_neutral and value.lower() not in ("false", "0", "no", "off"):
            violations.append(key)
    if violations:
        raise ValueError(f"dangerous local Git configuration: {sorted(set(violations))}")


def git_dir(repo_root):
    raw = run(repo_root, "rev-parse", "--absolute-git-dir").stdout.decode("utf-8").strip()
    path = Path(raw)
    if path.is_symlink() or not path.is_dir():
        raise ValueError("Git directory must be a real directory")
    return path.resolve()


def reject_repository_poison(repo_root):
    repository_git_dir = git_dir(repo_root)
    index = repository_git_dir / "index"
    if index.is_symlink() or not index.is_file():
        raise ValueError("Git index must be a regular file")
    if b"FSMN" in index.read_bytes():
        raise ValueError("Git index fsmonitor extension is forbidden")
    for entry in run(repo_root, "ls-files", "--stage", "-z").stdout.split(b"\0"):
        if entry:
            metadata = entry.split(b"\t", 1)[0].split()
            if len(metadata) < 3 or metadata[2] != b"0":
                raise ValueError("unmerged or abnormal Git index stage detected")
    abnormal = []
    for entry in run(repo_root, "ls-files", "-v", "-z").stdout.split(b"\0"):
        if entry and entry[:2] != b"H ":
            abnormal.append(entry.decode("utf-8", "surrogateescape"))
    if abnormal:
        raise ValueError(f"abnormal Git index flags detected: {abnormal[:8]}")
    hooks = repository_git_dir / "hooks"
    if hooks.exists():
        if hooks.is_symlink() or not hooks.is_dir():
            raise ValueError("repository hooks path is not a real directory")
        for candidate in hooks.iterdir():
            if candidate.is_symlink():
                raise ValueError(f"repository hook symlink is forbidden: {candidate.name}")
            if candidate.is_file() and not candidate.name.endswith(".sample"):
                raise ValueError(f"active repository hook is forbidden: {candidate.name}")
            if candidate.is_file() and stat.S_IMODE(candidate.stat().st_mode) & 0o111 and not candidate.name.endswith(".sample"):
                raise ValueError(f"executable repository hook is forbidden: {candidate.name}")
    return repository_git_dir


def sha256_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def current_ref(repo_root):
    process = run(repo_root, "symbolic-ref", "-q", "HEAD", check=False)
    if process.returncode == 0:
        return process.stdout.decode("utf-8").rstrip("\n")
    if process.returncode == 1:
        return "DETACHED"
    raise subprocess.CalledProcessError(process.returncode, process.args, process.stdout, process.stderr)


def verify_neutral_hooks(path_value):
    if not path_value:
        raise ValueError("neutral core.hooksPath is missing")
    hooks = Path(path_value)
    if not hooks.is_absolute() or hooks.is_symlink() or not hooks.is_dir():
        raise ValueError("neutral hooks path must remain an absolute real directory")
    entries = list(hooks.iterdir())
    if entries:
        raise ValueError(f"neutral hooks path must remain empty: {[entry.name for entry in entries[:8]]}")
    return str(hooks.resolve())


def snapshot(repo_root):
    repository_git_dir = reject_repository_poison(repo_root)
    entries = local_config(repo_root)
    reject_dangerous_config(entries, allow_neutral=True)
    config = dict(entries)
    hooks_path = verify_neutral_hooks(config.get("core.hookspath"))
    return {
        "defense_only_not_scope_authority": True,
        "git_dir": str(repository_git_dir),
        "head": run(repo_root, "rev-parse", "HEAD").stdout.decode("ascii").strip(),
        "ref": current_ref(repo_root),
        "index_sha256": sha256_file(repository_git_dir / "index"),
        "config_sha256": sha256_file(repository_git_dir / "config"),
        "hooks_path": hooks_path,
        "fsmonitor": config.get("core.fsmonitor"),
    }


def sanitize(repo_root, hooks_dir):
    reject_git_environment()
    reject_dangerous_config(local_config(repo_root), allow_neutral=False)
    reject_repository_poison(repo_root)
    hooks = Path(hooks_dir)
    if not hooks.is_absolute():
        raise ValueError("neutral hooks path must be absolute")
    if hooks.exists() or hooks.is_symlink():
        raise FileExistsError("neutral hooks path must not pre-exist")
    hooks.mkdir(parents=True, mode=0o500)
    os.chmod(hooks, 0o500)
    run(repo_root, "config", "--local", "core.hooksPath", str(hooks))
    run(repo_root, "config", "--local", "core.fsmonitor", "false")
    return snapshot(repo_root)


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    initialize = subparsers.add_parser("sanitize")
    initialize.add_argument("--repo-root", default=".")
    initialize.add_argument("--hooks-dir", required=True)
    initialize.add_argument("--output", required=True)
    verify_parser = subparsers.add_parser("verify")
    verify_parser.add_argument("--repo-root", default=".")
    verify_parser.add_argument("--expected", required=True)
    verify_parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if args.command == "sanitize":
        result = sanitize(args.repo_root, args.hooks_dir)
        result["ok"] = True
    else:
        reject_git_environment()
        expected = json.loads(Path(args.expected).read_text(encoding="utf-8"))
        actual = snapshot(args.repo_root)
        compared = ("head", "ref", "index_sha256", "config_sha256", "hooks_path", "fsmonitor", "git_dir")
        drift = {key: {"expected": expected.get(key), "actual": actual.get(key)} for key in compared if expected.get(key) != actual.get(key)}
        result = {"ok": not drift, "drift": drift, "actual": actual}
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if not result["ok"]:
        raise SystemExit(14)


if __name__ == "__main__":
    main()
