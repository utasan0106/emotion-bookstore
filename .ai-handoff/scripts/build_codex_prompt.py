#!/usr/bin/env python3
import json
from pathlib import Path

from validate_request import load_and_validate_request

BUNDLE_ROOT = Path(__file__).resolve().parents[1]
r, _ = load_and_validate_request(
    BUNDLE_ROOT / "REQUEST.json", require_task_file=False
)
task = (BUNDLE_ROOT / "CODEX_TASK.md").read_text(encoding="utf-8")
rules = (BUNDLE_ROOT / "HQ_RULES.md").read_text(encoding="utf-8")
p=f"""You are Codex implementing one bounded V3 task.

TASK_ID: {r['task_id']}

HQ RULES:
{rules}

TASK:
{task}

AUTOMATION RULES:
- Work only in current checkout.
- Allowed paths are exhaustive: {json.dumps(r.get('allowed_paths',[]), ensure_ascii=False)}
- Do not commit/push/PR/merge/deploy.
- Do not modify .ai-handoff or .github.
- Do not add package/lock/dependencies unless the task path explicitly allows them.
- Run relevant tests.
- Produce evidence and Actual screenshots if required and feasible.
- If blocked, STOP rather than inventing a workaround.
"""
Path("/tmp/codex_prompt.md").write_text(p, encoding="utf-8")
