#!/usr/bin/env python3
"""Create diff/evidence from content manifests without consulting Git state."""

import argparse
import difflib
import gzip
import hashlib
import io
import json
import tarfile
from pathlib import Path

from content_manifest import VERSION, canonical_bytes, differences, read_manifest


def is_text(data):
    if b"\0" in data:
        return False
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def content_for(root, record):
    if record is None or record.get("type") != "file":
        return b""
    path = Path(root) / record["path"]
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"manifest content missing or unsafe: {record['path']}")
    data = path.read_bytes()
    if len(data) != record["size"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
        raise ValueError(f"manifest content hash mismatch: {record['path']}")
    return data


def source_diff(preimage_root, repo_root, changes):
    rendered = []
    for change in changes:
        path = change["path"]
        before = content_for(preimage_root, change["before"])
        after = content_for(repo_root, change["after"])
        if is_text(before) and is_text(after):
            old_lines = before.decode("utf-8").splitlines(keepends=True)
            new_lines = after.decode("utf-8").splitlines(keepends=True)
            old_label = "/dev/null" if change["before"] is None else f"a/{path}"
            new_label = "/dev/null" if change["after"] is None else f"b/{path}"
            rendered.extend(difflib.unified_diff(old_lines, new_lines, fromfile=old_label, tofile=new_label))
        else:
            old_hash = change["before"]["sha256"] if change["before"] else "NONE"
            new_hash = change["after"]["sha256"] if change["after"] else "NONE"
            rendered.append(f"Binary content changed: {path} {old_hash} -> {new_hash}\n")
    return "".join(rendered)


def candidate_manifest(pre_manifest, post_manifest, changes):
    payload = {
        "authority": VERSION,
        "pre_manifest_sha256": pre_manifest["manifest_sha256"],
        "post_manifest_sha256": post_manifest["manifest_sha256"],
        "changes": changes,
    }
    payload["candidate_manifest_sha256"] = hashlib.sha256(canonical_bytes(payload)).hexdigest()
    return payload


def add_bytes(archive, name, data, mode=0o600):
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = mode
    info.mtime = 0
    info.uid = info.gid = 0
    info.uname = info.gname = ""
    archive.addfile(info, io.BytesIO(data))


def write_candidate(path, repo_root, manifest):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.PAX_FORMAT) as archive:
        add_bytes(archive, "manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8") + b"\n")
        for change in manifest["changes"]:
            after = change["after"]
            if after is None:
                continue
            if after.get("type") != "file":
                raise ValueError(f"candidate cannot contain non-file: {change['path']}")
            add_bytes(archive, f"files/{change['path']}", content_for(repo_root, after), after["mode"])
    with Path(path).open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
            compressed.write(buffer.getvalue())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--preimage-root", required=True)
    parser.add_argument("--pre-manifest", required=True)
    parser.add_argument("--post-manifest", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--names-output", required=True)
    parser.add_argument("--changes-output", required=True)
    parser.add_argument("--candidate-output")
    args = parser.parse_args()
    pre_manifest = read_manifest(args.pre_manifest)
    post_manifest = read_manifest(args.post_manifest)
    changes = differences(pre_manifest, post_manifest)
    manifest = candidate_manifest(pre_manifest, post_manifest, changes)
    Path(args.output).write_text(source_diff(args.preimage_root, args.repo_root, changes), encoding="utf-8")
    Path(args.names_output).write_text("".join(f"{change['path']}\n" for change in changes), encoding="utf-8")
    Path(args.changes_output).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.candidate_output:
        write_candidate(args.candidate_output, args.repo_root, manifest)


if __name__ == "__main__":
    main()
