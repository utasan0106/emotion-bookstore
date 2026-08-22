#!/usr/bin/env python3
"""Verify exact frozen HQ authority contents against the pre-Codex manifest."""

import argparse
import hashlib
import json
import os
import stat
from pathlib import Path


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def load_manifest(path):
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if payload.get("authority") != "frozen-hq-authority-sha256-v1":
        raise ValueError("unsupported frozen authority manifest")
    expected = payload.get("manifest_sha256")
    unsigned = {key: value for key, value in payload.items() if key != "manifest_sha256"}
    if hashlib.sha256(canonical_bytes(unsigned)).hexdigest() != expected:
        raise ValueError("frozen authority manifest digest mismatch")
    return payload


def verify(bundle, manifest_path):
    root = Path(bundle)
    if root.is_symlink() or not root.is_dir():
        raise ValueError("frozen authority bundle must be a real directory")
    manifest = load_manifest(manifest_path)
    expected = {record["path"]: record for record in manifest["files"]}
    actual_paths = []
    violations = []
    for current, directories, files in os.walk(root, topdown=True, followlinks=False):
        current_path = Path(current)
        for name in sorted(directories):
            candidate = current_path / name
            if candidate.is_symlink():
                violations.append({"path": candidate.relative_to(root).as_posix(), "reason": "symlink directory"})
        directories[:] = sorted(name for name in directories if not (current_path / name).is_symlink())
        for name in sorted(files):
            candidate = current_path / name
            relative = candidate.relative_to(root).as_posix()
            actual_paths.append(relative)
            mode = candidate.lstat().st_mode
            if not stat.S_ISREG(mode):
                violations.append({"path": relative, "reason": "not a regular file"})
                continue
            record = expected.get(relative)
            if record is None:
                violations.append({"path": relative, "reason": "unexpected authority file"})
                continue
            content = candidate.read_bytes()
            if len(content) != record["size"] or hashlib.sha256(content).hexdigest() != record["sha256"]:
                violations.append({"path": relative, "reason": "hash or size mismatch"})
    for relative in sorted(set(expected) - set(actual_paths)):
        violations.append({"path": relative, "reason": "missing authority file"})
    result = {
        "authority": manifest["authority"],
        "manifest_sha256": manifest["manifest_sha256"],
        "files_verified": len(expected),
        "violations": violations,
        "ok": not violations,
    }
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()
    result = verify(args.bundle, args.manifest)
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    if not result["ok"]:
        raise SystemExit(13)


if __name__ == "__main__":
    main()
