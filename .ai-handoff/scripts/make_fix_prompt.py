#!/usr/bin/env python3
import argparse,json
from pathlib import Path
ap=argparse.ArgumentParser()
ap.add_argument("--review",required=True)
ap.add_argument("--output",required=True)
a=ap.parse_args()
r=json.loads(Path(a.review).read_text())
if r["disposition"]!="LIMITED_FIX": raise SystemExit("not LIMITED_FIX")
Path(a.output).write_text(f"""Continue the same bounded task.

Apply ONLY this independent HQ limited fix:
{r['fix_prompt']}

Issues:
{json.dumps(r['issues'],ensure_ascii=False,indent=2)}

Evidence required:
{json.dumps(r['evidence_required'],ensure_ascii=False,indent=2)}

Do not broaden scope.
Do not commit/push/PR/merge/deploy.
Rerun affected tests and report.
""")
