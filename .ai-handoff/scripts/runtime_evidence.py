#!/usr/bin/env python3
import argparse
import hashlib
import json
import shutil
from pathlib import Path

from validate_request import load_and_validate_request

BUNDLE_ROOT = Path(__file__).resolve().parents[1]
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
MAX_IMAGE_BYTES = 8_000_000


def authorized_image_paths(repo_root=Path("."), changed_paths=None):
    request, _ = load_and_validate_request(
        BUNDLE_ROOT / "REQUEST.json", require_task_file=False
    )
    root = Path(repo_root).resolve()
    product_root = (root / "v3-prototype").resolve()
    changed_set = set(changed_paths) if changed_paths is not None else None
    authorized = []
    for literal in request["allowed_paths"]:
        if Path(literal).suffix.lower() not in IMAGE_SUFFIXES:
            continue
        if changed_set is not None and literal not in changed_set:
            continue
        path = root / literal
        if path.is_symlink() or not path.is_file():
            continue
        resolved = path.resolve()
        try:
            resolved.relative_to(product_root)
        except ValueError:
            continue
        if path.stat().st_size > MAX_IMAGE_BYTES:
            continue
        authorized.append(path)
    return authorized[:6]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--destination", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--changed-list")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    destination = Path(args.destination)
    changed = None
    if args.changed_list:
        changed = Path(args.changed_list).read_text(encoding="utf-8").splitlines()
    records = []
    for path in authorized_image_paths(repo_root, changed):
        relative = path.resolve().relative_to(repo_root)
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
        records.append(
            {
                "path": relative.as_posix(),
                "size": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )
    Path(args.manifest).write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
