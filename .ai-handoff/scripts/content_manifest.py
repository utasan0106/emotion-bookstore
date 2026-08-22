#!/usr/bin/env python3
"""Worktree content authority that never consults Git state."""

import argparse
import hashlib
import json
import os
import shutil
import stat
from pathlib import Path

VERSION = "worktree-content-sha256-v1"


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def record_for(path, relative):
    info = path.lstat()
    mode = stat.S_IMODE(info.st_mode)
    if stat.S_ISREG(info.st_mode):
        content = path.read_bytes()
        return {
            "path": relative,
            "type": "file",
            "mode": mode,
            "size": len(content),
            "sha256": hashlib.sha256(content).hexdigest(),
        }
    if stat.S_ISLNK(info.st_mode):
        target = os.readlink(path)
        encoded = os.fsencode(target)
        return {
            "path": relative,
            "type": "symlink",
            "mode": mode,
            "size": len(encoded),
            "sha256": hashlib.sha256(encoded).hexdigest(),
            "target": target,
        }
    raise ValueError(f"special filesystem object is forbidden: {relative}")


def scan(root):
    root = Path(root).resolve()
    records = []

    def onerror(error):
        raise error

    for current, directories, files in os.walk(root, topdown=True, followlinks=False, onerror=onerror):
        current_path = Path(current)
        if current_path == root:
            directories[:] = [name for name in directories if name != ".git"]
        for name in sorted(directories):
            candidate = current_path / name
            if candidate.is_symlink():
                relative = candidate.relative_to(root).as_posix()
                records.append(record_for(candidate, relative))
        directories[:] = sorted(name for name in directories if not (current_path / name).is_symlink())
        for name in sorted(files):
            if current_path == root and name == ".git":
                continue
            candidate = current_path / name
            relative = candidate.relative_to(root).as_posix()
            records.append(record_for(candidate, relative))
    records.sort(key=lambda item: item["path"])
    payload = {"authority": VERSION, "files": records}
    payload["manifest_sha256"] = hashlib.sha256(canonical_bytes(payload)).hexdigest()
    return payload


def validate_manifest(payload):
    if not isinstance(payload, dict) or payload.get("authority") != VERSION:
        raise ValueError("unsupported content manifest")
    expected = payload.get("manifest_sha256")
    unsigned = {key: value for key, value in payload.items() if key != "manifest_sha256"}
    actual = hashlib.sha256(canonical_bytes(unsigned)).hexdigest()
    if expected != actual:
        raise ValueError("content manifest digest mismatch")
    files = payload.get("files")
    if not isinstance(files, list):
        raise ValueError("content manifest files must be an array")
    prior = None
    for record in files:
        if not isinstance(record, dict) or not isinstance(record.get("path"), str):
            raise ValueError("invalid content manifest record")
        if prior is not None and record["path"] <= prior:
            raise ValueError("content manifest paths must be unique and sorted")
        prior = record["path"]
    return payload


def read_manifest(path):
    return validate_manifest(json.loads(Path(path).read_text(encoding="utf-8")))


def manifest_map(payload):
    return {record["path"]: record for record in validate_manifest(payload)["files"]}


def differences(before, after):
    before_map = manifest_map(before)
    after_map = manifest_map(after)
    changes = []
    for path in sorted(set(before_map) | set(after_map)):
        old = before_map.get(path)
        new = after_map.get(path)
        if old == new:
            continue
        status = "added" if old is None else "deleted" if new is None else "modified"
        changes.append({"path": path, "status": status, "before": old, "after": new})
    return changes


def copy_preimage(root, destination, manifest):
    root = Path(root).resolve()
    destination = Path(destination)
    if destination.exists() or destination.is_symlink():
        raise FileExistsError(f"preimage destination already exists: {destination}")
    destination.mkdir(parents=True, mode=0o700)
    for record in manifest["files"]:
        source = root / record["path"]
        target = destination / record["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        if record["type"] == "file":
            shutil.copyfile(source, target, follow_symlinks=False)
            os.chmod(target, record["mode"])
        elif record["type"] == "symlink":
            os.symlink(record["target"], target)
        else:
            raise ValueError(f"unsupported preimage type: {record['type']}")


def write_json(path, payload):
    Path(path).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    snapshot = subparsers.add_parser("snapshot")
    snapshot.add_argument("--root", default=".")
    snapshot.add_argument("--output", required=True)
    snapshot.add_argument("--copy-to")
    compare = subparsers.add_parser("diff")
    compare.add_argument("--before", required=True)
    compare.add_argument("--after", required=True)
    compare.add_argument("--output", required=True)
    compare.add_argument("--names-output")
    verify = subparsers.add_parser("verify")
    verify.add_argument("--root", default=".")
    verify.add_argument("--manifest", required=True)
    args = parser.parse_args()

    if args.command == "snapshot":
        payload = scan(args.root)
        write_json(args.output, payload)
        if args.copy_to:
            copy_preimage(args.root, args.copy_to, payload)
        return
    if args.command == "diff":
        changes = differences(read_manifest(args.before), read_manifest(args.after))
        write_json(args.output, {"authority": VERSION, "changes": changes})
        if args.names_output:
            Path(args.names_output).write_text("".join(f"{item['path']}\n" for item in changes), encoding="utf-8")
        return
    expected = read_manifest(args.manifest)
    actual = scan(args.root)
    changes = differences(expected, actual)
    result = {"authority": VERSION, "ok": not changes, "changes": changes}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if changes:
        raise SystemExit(12)


if __name__ == "__main__":
    main()
