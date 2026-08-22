#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from secure_temp import secure_write_text
from validate_request import load_and_validate_request

BUNDLE_ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--allowed-output-root", required=True)
    args = parser.parse_args()
    request, _ = load_and_validate_request(
        BUNDLE_ROOT / "REQUEST.json", require_task_file=False
    )
    task = (BUNDLE_ROOT / "CODEX_TASK.md").read_text(encoding="utf-8")
    rules = (BUNDLE_ROOT / "HQ_RULES.md").read_text(encoding="utf-8")
    prompt = f"""You are Codex implementing one bounded V3 task.

TASK_ID: {request['task_id']}

HQ RULES:
{rules}

TASK:
{task}

AUTOMATION RULES:
- Work only in current checkout.
- Allowed paths are exhaustive: {json.dumps(request.get('allowed_paths', []), ensure_ascii=False)}
- Do not commit/push/PR/merge/deploy.
- Do not modify .ai-handoff or .github.
- Do not add package/lock/dependencies unless the task path explicitly allows them.
- Run relevant tests.
- Produce evidence and Actual screenshots if required and feasible.
- If blocked, STOP rather than inventing a workaround.
"""
    secure_write_text(args.output, prompt, args.allowed_output_root, mode=0o400)


if __name__ == "__main__":
    main()
