#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from capture_diff import changed_paths, validate_pre_head
from validate_request import load_and_validate_request
from verify_head import verify

BUNDLE_ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pre-head", required=True)
    parser.add_argument("--pre-ref", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    head_check = verify(args.pre_head, args.pre_ref)
    pre_head = validate_pre_head(Path(args.pre_head).read_text(encoding="ascii"))
    request, _ = load_and_validate_request(
        BUNDLE_ROOT / "REQUEST.json", require_task_file=False
    )
    allowed = request["allowed_paths"]
    changed = changed_paths(pre_head)

    violations = []
    if not head_check["head_byte_identical"]:
        violations.append({"path": "HEAD", "reason": "checkout HEAD moved after freeze"})
    if not head_check["ref_byte_identical"]:
        violations.append({"path": "HEAD", "reason": "checkout ref moved after freeze"})

    allowed_set = set(allowed)
    for path in changed:
        if path.startswith((".ai-handoff/", ".github/")):
            violations.append(
                {"path": path, "reason": "automation infrastructure is protected"}
            )
            continue
        if Path(path).is_symlink():
            violations.append({"path": path, "reason": "changed symlinks are not allowed"})
            continue
        if path not in allowed_set:
            violations.append(
                {"path": path, "reason": "outside exhaustive literal allowed_paths"}
            )

    result = {
        "pre_head": pre_head,
        "head_check": head_check,
        "changed": changed,
        "allowed_paths": allowed,
        "violations": violations,
        "ok": not violations,
    }
    Path(args.output).write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    if violations:
        raise SystemExit(10)


if __name__ == "__main__":
    main()
