#!/usr/bin/env python3
"""Create the one-time immutable HQ authority bundle before Codex runs."""

import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path

from secure_temp import secure_directory, secure_write_text

AUTHORITY_FILES = ("HQ_RULES.md", "REQUEST.json", "CODEX_TASK.md")
AUTHORITY_DIRS = ("scripts", "schemas")


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def source_files(source_root):
    root = Path(source_root).resolve()
    selected = []
    for relative in AUTHORITY_FILES:
        path = root / relative
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"authority must be a regular file: {relative}")
        selected.append((relative, path))
    for relative in AUTHORITY_DIRS:
        directory = root / relative
        if directory.is_symlink() or not directory.is_dir():
            raise ValueError(f"authority must be a real directory: {relative}")
        for path in sorted(directory.rglob("*")):
            if path.is_symlink():
                raise ValueError(f"authority symlink is forbidden: {path.relative_to(root)}")
            if path.is_file():
                selected.append((path.relative_to(root).as_posix(), path))
    return sorted(selected)


def freeze(source_root, bundle, manifest_path, sums_path, allowed_root):
    bundle = secure_directory(bundle, allowed_root)
    records = []
    for relative, source in source_files(source_root):
        content = source.read_bytes()
        target = bundle / relative
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        shutil.copyfile(source, target, follow_symlinks=False)
        os.chmod(target, 0o400)
        records.append({
            "path": relative,
            "size": len(content),
            "sha256": hashlib.sha256(content).hexdigest(),
        })
    for directory in sorted((item for item in bundle.rglob("*") if item.is_dir()), reverse=True):
        os.chmod(directory, 0o500)
    os.chmod(bundle, 0o500)
    manifest = {"authority": "frozen-hq-authority-sha256-v1", "files": records}
    manifest["manifest_sha256"] = hashlib.sha256(canonical_bytes(manifest)).hexdigest()
    rendered = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    sums = "".join(f"{record['sha256']}  {record['path']}\n" for record in records)
    secure_write_text(manifest_path, rendered, allowed_root, mode=0o400)
    secure_write_text(sums_path, sums, allowed_root, mode=0o400)
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", default=".ai-handoff")
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--sha256sums", required=True)
    parser.add_argument("--allowed-root", required=True)
    args = parser.parse_args()
    manifest = freeze(args.source_root, args.bundle, args.manifest, args.sha256sums, args.allowed_root)
    print(json.dumps({"ok": True, "files": len(manifest["files"]), "manifest_sha256": manifest["manifest_sha256"]}, indent=2))


if __name__ == "__main__":
    main()
