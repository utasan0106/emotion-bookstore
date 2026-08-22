#!/usr/bin/env python3
"""Validate and import Job A's patch packet as untrusted data on fresh Job B."""

import argparse
import hashlib
import json
import os
import shutil
import stat
import tarfile
from pathlib import Path, PurePosixPath

from content_manifest import VERSION, canonical_bytes, manifest_map, read_manifest
from validate_request import load_and_validate_request

BUNDLE_ROOT = Path(__file__).resolve().parents[1]
MAX_ARCHIVE_BYTES = 300_000_000
MAX_MEMBER_BYTES = 100_000_000
MAX_MEMBERS = 20_000


def literal_path(value):
    if not isinstance(value, str) or not value or value.startswith("/") or "\\" in value:
        return False
    return all(part not in ("", ".", "..") for part in PurePosixPath(value).parts)


def validate_record(record, path):
    if record is None:
        return
    required = {"path", "type", "mode", "size", "sha256"}
    if not isinstance(record, dict) or not required.issubset(record):
        raise ValueError(f"invalid candidate record: {path}")
    if record["path"] != path or record["type"] != "file":
        raise ValueError(f"candidate records must be regular files: {path}")
    if isinstance(record["mode"], bool) or not isinstance(record["mode"], int) or record["mode"] < 0 or record["mode"] > 0o777:
        raise ValueError(f"invalid candidate mode: {path}")
    if isinstance(record["size"], bool) or not isinstance(record["size"], int) or not 0 <= record["size"] <= MAX_MEMBER_BYTES:
        raise ValueError(f"invalid candidate size: {path}")
    if not isinstance(record["sha256"], str) or len(record["sha256"]) != 64 or any(character not in "0123456789abcdef" for character in record["sha256"]):
        raise ValueError(f"invalid candidate sha256: {path}")


def validate_candidate_manifest(payload, baseline, allowed_paths):
    if not isinstance(payload, dict) or payload.get("authority") != VERSION:
        raise ValueError("unsupported candidate authority")
    expected_digest = payload.get("candidate_manifest_sha256")
    unsigned = {key: value for key, value in payload.items() if key != "candidate_manifest_sha256"}
    if hashlib.sha256(canonical_bytes(unsigned)).hexdigest() != expected_digest:
        raise ValueError("candidate manifest digest mismatch")
    if payload.get("pre_manifest_sha256") != baseline["manifest_sha256"]:
        raise ValueError("candidate baseline does not match fresh Job B checkout")
    changes = payload.get("changes")
    if not isinstance(changes, list):
        raise ValueError("candidate changes must be an array")
    baseline_by_path = manifest_map(baseline)
    allowed = set(allowed_paths)
    seen = set()
    for change in changes:
        if not isinstance(change, dict) or set(change) != {"path", "status", "before", "after"}:
            raise ValueError("invalid candidate change object")
        path = change["path"]
        if not literal_path(path) or path not in allowed or not path.startswith("v3-prototype/"):
            raise ValueError(f"candidate path is not explicitly authorized: {path!r}")
        if path in seen:
            raise ValueError(f"duplicate candidate path: {path}")
        seen.add(path)
        before, after = change["before"], change["after"]
        validate_record(before, path)
        validate_record(after, path)
        if before != baseline_by_path.get(path):
            raise ValueError(f"candidate before-state differs from fresh Job B: {path}")
        status = "added" if before is None else "deleted" if after is None else "modified"
        if change["status"] != status or before == after:
            raise ValueError(f"invalid candidate status: {path}")
    ordered = sorted(seen)
    for index, path in enumerate(ordered):
        prefix = path + "/"
        if any(other.startswith(prefix) for other in ordered[index + 1:]):
            raise ValueError(f"candidate paths have a file/descendant conflict: {path}")
    return changes


def safe_target(repo_root, relative):
    root = Path(repo_root).resolve()
    target = root / relative
    current = root
    for component in PurePosixPath(relative).parts[:-1]:
        current = current / component
        if current.is_symlink():
            raise ValueError(f"symlink ancestor is forbidden: {relative}")
    if target.is_symlink():
        raise ValueError(f"symlink target is forbidden: {relative}")
    return target


def read_archive(archive_path, staging_root, baseline, allowed_paths):
    archive_path = Path(archive_path)
    if archive_path.is_symlink() or not archive_path.is_file() or archive_path.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError("candidate archive is missing, symlinked, or too large")
    staging = Path(staging_root)
    if staging.exists() or staging.is_symlink():
        raise FileExistsError("candidate staging root must not pre-exist")
    staging.mkdir(parents=True, mode=0o700)
    with tarfile.open(archive_path, mode="r:gz") as archive:
        members = archive.getmembers()
        if len(members) > MAX_MEMBERS:
            raise ValueError("candidate archive has too many members")
        if sum(member.size for member in members) > MAX_ARCHIVE_BYTES:
            raise ValueError("candidate archive expands beyond the total byte limit")
        by_name = {}
        for member in members:
            if not literal_path(member.name) or not member.isfile() or member.islnk() or member.issym():
                raise ValueError(f"unsafe candidate archive member: {member.name!r}")
            if member.size > MAX_MEMBER_BYTES or member.name in by_name:
                raise ValueError(f"invalid or duplicate candidate member: {member.name}")
            by_name[member.name] = member
        if "manifest.json" not in by_name:
            raise ValueError("candidate manifest missing from archive")
        manifest_file = archive.extractfile(by_name["manifest.json"])
        if manifest_file is None:
            raise ValueError("candidate manifest cannot be read")
        payload = json.loads(manifest_file.read(MAX_MEMBER_BYTES + 1).decode("utf-8"))
        changes = validate_candidate_manifest(payload, baseline, allowed_paths)
        expected_members = {"manifest.json"}
        for change in changes:
            after = change["after"]
            if after is not None:
                expected_members.add(f"files/{change['path']}")
        if set(by_name) != expected_members:
            raise ValueError("candidate archive contains missing or extra members")
        staged = {}
        for change in changes:
            after = change["after"]
            if after is None:
                continue
            member = by_name[f"files/{change['path']}"]
            extracted = archive.extractfile(member)
            if extracted is None:
                raise ValueError(f"candidate content cannot be read: {change['path']}")
            data = extracted.read(MAX_MEMBER_BYTES + 1)
            if len(data) != after["size"] or hashlib.sha256(data).hexdigest() != after["sha256"]:
                raise ValueError(f"candidate content hash mismatch: {change['path']}")
            target = staging / change["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            os.chmod(target, 0o400)
            staged[change["path"]] = target
    return payload, changes, staged


def apply_changes(repo_root, changes, staged):
    # Validate every target before the first worktree write.
    for change in changes:
        target = safe_target(repo_root, change["path"])
        current = target.parent
        root = Path(repo_root).resolve()
        while current != root:
            if current.exists() and not current.is_dir():
                raise ValueError(f"non-directory import ancestor: {change['path']}")
            current = current.parent
        before = change["before"]
        if before is None:
            if target.exists():
                raise ValueError(f"add target appeared after validation: {change['path']}")
        else:
            if not target.is_file() or target.is_symlink():
                raise ValueError(f"existing target changed after validation: {change['path']}")
            data = target.read_bytes()
            if len(data) != before["size"] or hashlib.sha256(data).hexdigest() != before["sha256"]:
                raise ValueError(f"existing target hash changed after validation: {change['path']}")
    applied = []
    for change in changes:
        target = safe_target(repo_root, change["path"])
        after = change["after"]
        if after is None:
            if not target.exists() or not target.is_file():
                raise ValueError(f"delete target changed after validation: {change['path']}")
            target.unlink()
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.parent / f".{target.name}.job-b-import"
            if temporary.exists() or temporary.is_symlink():
                raise ValueError(f"temporary import path already exists: {change['path']}")
            shutil.copyfile(staged[change["path"]], temporary, follow_symlinks=False)
            os.chmod(temporary, after["mode"])
            os.replace(temporary, target)
        applied.append(change["path"])
    return applied


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--archive", required=True)
    parser.add_argument("--pre-manifest", required=True)
    parser.add_argument("--staging-root", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    request, _ = load_and_validate_request(BUNDLE_ROOT / "REQUEST.json", require_task_file=False)
    baseline = read_manifest(args.pre_manifest)
    payload, changes, staged = read_archive(args.archive, args.staging_root, baseline, request["allowed_paths"])
    applied = apply_changes(args.repo_root, changes, staged)
    result = {
        "untrusted_input": True,
        "git_state_imported": False,
        "candidate_manifest_sha256": payload["candidate_manifest_sha256"],
        "applied": applied,
        "ok": True,
    }
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
