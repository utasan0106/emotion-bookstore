#!/usr/bin/env python3
import argparse,json
from pathlib import Path
ap=argparse.ArgumentParser()
ap.add_argument("--task-id",required=True)
ap.add_argument("--output",required=True)
ap.add_argument("--reviews",nargs="+",required=True)
a=ap.parse_args()
reviews=[json.loads(Path(p).read_text()) for p in a.reviews if Path(p).exists()]
if not reviews:
    status="SETUP_REQUIRED"; final={}
else:
    final=reviews[-1]
    status={"GO":"CEO_APPROVAL_REQUIRED","LIMITED_FIX":"HOLD_MAX_ITERATIONS","HOLD":"HOLD","NO_GO":"NO_GO"}[final["disposition"]]
Path(a.output).write_text(json.dumps({
    "task_id":a.task_id,
    "status":status,
    "iterations_reviewed":len(reviews),
    "final_review":final,
    "automatic_commit":False,
    "automatic_push":False,
    "automatic_pr":False,
    "automatic_merge":False,
    "automatic_deploy":False
},ensure_ascii=False,indent=2))
