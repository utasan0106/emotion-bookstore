#!/usr/bin/env python3
import argparse
import json
import re
from pathlib import Path

REQUEST_FILE = Path(".ai-handoff/REQUEST.json")
TASK_FILE = Path(".ai-handoff/CODEX_TASK.md")
TASK_ID_PATTERN = re.compile(r"[A-Za-z0-9._-]{1,64}")
GLOB_META = frozenset("*?[]{}!")


def validate_allowed_paths(value):
    if not isinstance(value, list):
        raise ValueError("allowed_paths must be a JSON array")

    validated = []
    seen = set()
    for index, item in enumerate(value):
        label = f"allowed_paths[{index}]"
        if not isinstance(item, str) or not item:
            raise ValueError(f"{label} must be a non-empty string")
        if item != item.strip() or any(ord(char) < 32 for char in item):
            raise ValueError(f"{label} must be a normalized literal path")
        if "\\" in item:
            raise ValueError(f"{label} must not contain backslashes")
        if any(char in item for char in GLOB_META):
            raise ValueError(f"{label} must not contain glob metacharacters")
        if item.startswith("/"):
            raise ValueError(f"{label} must be repository-relative")

        parts = item.split("/")
        if any(part in ("", ".", "..") for part in parts):
            raise ValueError(f"{label} must not contain empty or traversal components")
        if len(parts) < 2 or parts[0] != "v3-prototype":
            raise ValueError(f"{label} must stay exclusively under v3-prototype/")
        if any(part in (".ai-handoff", ".github") for part in parts):
            raise ValueError(f"{label} must not target automation infrastructure")
        if item in seen:
            raise ValueError(f"{label} duplicates an earlier path")

        seen.add(item)
        validated.append(item)
    return validated


def validate_task_file(repo_root):
    task_path = Path(repo_root) / TASK_FILE
    if task_path.is_symlink():
        raise ValueError(f"task_file must not be a symlink: {TASK_FILE}")
    if not task_path.is_file():
        raise ValueError(f"task_file must be a regular file: {TASK_FILE}")


def load_and_validate_request(path=REQUEST_FILE, repo_root=Path("."), require_task_file=True):
    request = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(request, dict):
        raise ValueError("REQUEST.json must contain a JSON object")

    if request.get("task_file") != str(TASK_FILE):
        raise ValueError(f"task_file must be exactly {TASK_FILE}")
    if require_task_file:
        validate_task_file(repo_root)

    task_id = request.get("task_id")
    if not isinstance(task_id, str) or TASK_ID_PATTERN.fullmatch(task_id) is None:
        raise ValueError("task_id must match [A-Za-z0-9._-]{1,64}")

    enabled = request.get("enabled")
    if not isinstance(enabled, bool):
        raise ValueError("enabled must be a JSON boolean")

    max_iterations = request.get("max_auto_iterations", 3)
    if isinstance(max_iterations, bool) or not isinstance(max_iterations, int):
        raise ValueError("max_auto_iterations must be an integer")
    if not 1 <= max_iterations <= 3:
        raise ValueError("max_auto_iterations must be between 1 and 3")

    requires_runtime_visual = request.get("requires_runtime_visual", False)
    if not isinstance(requires_runtime_visual, bool):
        raise ValueError("requires_runtime_visual must be a JSON boolean")

    request["allowed_paths"] = validate_allowed_paths(request.get("allowed_paths"))

    outputs = {
        "enabled": "true" if enabled else "false",
        "task_id": task_id,
        "max_iterations": str(max_iterations),
    }
    return request, outputs


def write_github_output(path, outputs):
    with Path(path).open("a", encoding="utf-8") as output:
        for key in ("enabled", "task_id", "max_iterations"):
            output.write(f"{key}={outputs[key]}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--github-output")
    parser.add_argument("--request", default=str(REQUEST_FILE))
    parser.add_argument("--repo-root", default=".")
    args = parser.parse_args()

    _, outputs = load_and_validate_request(args.request, Path(args.repo_root))
    if args.github_output:
        write_github_output(args.github_output, outputs)
    else:
        print(json.dumps(outputs, ensure_ascii=True, sort_keys=True))


if __name__ == "__main__":
    main()
