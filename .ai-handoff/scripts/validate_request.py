#!/usr/bin/env python3
import argparse
import json
import re
from pathlib import Path

REQUEST_FILE = Path(".ai-handoff/REQUEST.json")
TASK_FILE = Path(".ai-handoff/CODEX_TASK.md")
TASK_ID_PATTERN = re.compile(r"[A-Za-z0-9._-]{1,64}")


def load_and_validate_request(path=REQUEST_FILE):
    request = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(request, dict):
        raise ValueError("REQUEST.json must contain a JSON object")

    if request.get("task_file") != str(TASK_FILE):
        raise ValueError(f"task_file must be exactly {TASK_FILE}")

    task_id = request.get("task_id")
    if not isinstance(task_id, str) or TASK_ID_PATTERN.fullmatch(task_id) is None:
        raise ValueError("task_id must match [A-Za-z0-9._-]{1,64}")

    enabled = request.get("enabled")
    if not isinstance(enabled, bool):
        raise ValueError("enabled must be a JSON boolean")

    try:
        max_iterations = int(request.get("max_auto_iterations", 3))
    except (TypeError, ValueError) as exc:
        raise ValueError("max_auto_iterations must be an integer") from exc
    max_iterations = max(1, min(3, max_iterations))

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
    args = parser.parse_args()

    _, outputs = load_and_validate_request()
    if args.github_output:
        write_github_output(args.github_output, outputs)
    else:
        print(json.dumps(outputs, ensure_ascii=True, sort_keys=True))


if __name__ == "__main__":
    main()
