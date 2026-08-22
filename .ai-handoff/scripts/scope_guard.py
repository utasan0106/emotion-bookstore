#!/usr/bin/env python3
"""Fail-closed scope guard using content manifests, never Git diff/status."""

import argparse
import json
from pathlib import Path, PurePosixPath

from content_manifest import VERSION, differences, read_manifest
from validate_request import load_and_validate_request
from verify_head import verify

BUNDLE_ROOT = Path(__file__).resolve().parents[1]


def literal_path(value):
    path = PurePosixPath(value)
    return bool(value) and not value.startswith("/") and "\\" not in value and all(part not in ("", ".", "..") for part in path.parts)


def evaluate(pre_manifest, post_manifest, request, head_check=None):
    changes = differences(pre_manifest, post_manifest)
    allowed = request["allowed_paths"]
    allowed_set = set(allowed)
    violations = []
    if head_check is not None:
        if not head_check["head_byte_identical"]:
            violations.append({"path": "HEAD", "reason": "checkout HEAD moved after freeze"})
        if not head_check["ref_byte_identical"]:
            violations.append({"path": "HEAD", "reason": "checkout ref moved after freeze"})
    for change in changes:
        path = change["path"]
        after = change["after"]
        if not literal_path(path):
            violations.append({"path": path, "reason": "non-literal or traversing changed path"})
            continue
        if path.startswith((".ai-handoff/", ".github/")):
            violations.append({"path": path, "reason": "automation infrastructure is protected"})
            continue
        if path not in allowed_set:
            violations.append({"path": path, "reason": "outside exhaustive literal allowed_paths"})
            continue
        if after is not None and after.get("type") != "file":
            violations.append({"path": path, "reason": "changed symlinks or special objects are forbidden"})
    return {
        "authority": VERSION,
        "git_is_not_scope_authority": True,
        "pre_manifest_sha256": pre_manifest["manifest_sha256"],
        "post_manifest_sha256": post_manifest["manifest_sha256"],
        "head_check": head_check,
        "changed": [change["path"] for change in changes],
        "changes": changes,
        "allowed_paths": allowed,
        "violations": violations,
        "ok": not violations,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pre-manifest", required=True)
    parser.add_argument("--post-manifest", required=True)
    parser.add_argument("--pre-head")
    parser.add_argument("--pre-ref")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if bool(args.pre_head) != bool(args.pre_ref):
        raise ValueError("pre-head and pre-ref must be supplied together")
    head_check = verify(args.pre_head, args.pre_ref) if args.pre_head else None
    request, _ = load_and_validate_request(BUNDLE_ROOT / "REQUEST.json", require_task_file=False)
    result = evaluate(read_manifest(args.pre_manifest), read_manifest(args.post_manifest), request, head_check)
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if not result["ok"]:
        raise SystemExit(10)


if __name__ == "__main__":
    main()
