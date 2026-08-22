#!/usr/bin/env python3
import argparse
import json
import subprocess
from pathlib import Path


def git_bytes(*args):
    return subprocess.run(
        ["git", *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    ).stdout


def current_ref_bytes():
    process = subprocess.run(
        ["git", "symbolic-ref", "-q", "HEAD"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if process.returncode == 0:
        return process.stdout
    if process.returncode == 1:
        return b"DETACHED\n"
    raise subprocess.CalledProcessError(
        process.returncode, process.args, process.stdout, process.stderr
    )


def verify(pre_head_file, pre_ref_file):
    expected_head = Path(pre_head_file).read_bytes()
    expected_ref = Path(pre_ref_file).read_bytes()
    actual_head = git_bytes("rev-parse", "HEAD")
    actual_ref = current_ref_bytes()
    result = {
        "expected_head": expected_head.decode("ascii").rstrip("\n"),
        "actual_head": actual_head.decode("ascii").rstrip("\n"),
        "expected_ref": expected_ref.decode("utf-8").rstrip("\n"),
        "actual_ref": actual_ref.decode("utf-8").rstrip("\n"),
        "head_byte_identical": actual_head == expected_head,
        "ref_byte_identical": actual_ref == expected_ref,
    }
    result["ok"] = result["head_byte_identical"] and result["ref_byte_identical"]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pre-head", required=True)
    parser.add_argument("--pre-ref", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()

    result = verify(args.pre_head, args.pre_ref)
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    if not result["ok"]:
        raise SystemExit(9)


if __name__ == "__main__":
    main()
