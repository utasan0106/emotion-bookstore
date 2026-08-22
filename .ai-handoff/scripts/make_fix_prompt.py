#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from secure_temp import secure_write_text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--review", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--allowed-output-root", required=True)
    args = parser.parse_args()
    review = json.loads(Path(args.review).read_text(encoding="utf-8"))
    if review["disposition"] != "LIMITED_FIX":
        raise SystemExit("not LIMITED_FIX")
    prompt = f"""Continue the same bounded task in a new authorized run.

Apply ONLY this independent HQ limited fix:
{review['fix_prompt']}

Issues:
{json.dumps(review['issues'], ensure_ascii=False, indent=2)}

Evidence required:
{json.dumps(review['evidence_required'], ensure_ascii=False, indent=2)}

Do not broaden scope.
Do not commit/push/PR/merge/deploy.
Rerun affected tests and report.
"""
    secure_write_text(args.output, prompt, args.allowed_output_root, mode=0o400)


if __name__ == "__main__":
    main()
