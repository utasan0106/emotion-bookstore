#!/usr/bin/env python3
import argparse
import re
import subprocess
from pathlib import Path

HEAD_PATTERN = re.compile(r"[0-9a-f]{40}")


def run_bytes(command, check=True):
    return subprocess.run(command, check=check, stdout=subprocess.PIPE).stdout


def split_z(data):
    return [item.decode("utf-8", "surrogateescape") for item in data.split(b"\0") if item]


def changed_paths(pre_head):
    tracked = split_z(
        run_bytes(
            ["git", "diff", "--no-renames", "--name-only", "-z", pre_head, "--", "."]
        )
    )
    untracked = split_z(
        run_bytes(["git", "ls-files", "--others", "-z", "--", "."])
    )
    return sorted(set(tracked + untracked))


def source_diff(pre_head):
    patch = bytearray(run_bytes(["git", "diff", "--binary", pre_head, "--", "."]))
    for path in split_z(run_bytes(["git", "ls-files", "--others", "-z", "--", "."])):
        process = subprocess.run(
            ["git", "diff", "--binary", "--no-index", "--", "/dev/null", path],
            stdout=subprocess.PIPE,
        )
        if process.returncode not in (0, 1):
            raise subprocess.CalledProcessError(process.returncode, process.args)
        patch.extend(process.stdout)
    return bytes(patch)


def validate_pre_head(value):
    value = value.strip()
    if HEAD_PATTERN.fullmatch(value) is None:
        raise ValueError("pre-head must be a full lowercase 40-character commit SHA")
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pre-head", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--names-output", required=True)
    args = parser.parse_args()

    pre_head = validate_pre_head(Path(args.pre_head).read_text(encoding="ascii"))
    paths = changed_paths(pre_head)
    Path(args.output).write_bytes(source_diff(pre_head))
    Path(args.names_output).write_text(
        "".join(f"{path}\n" for path in paths), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
