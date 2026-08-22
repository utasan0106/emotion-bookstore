#!/usr/bin/env python3
import argparse, fnmatch, json, subprocess
from pathlib import Path

ap=argparse.ArgumentParser()
ap.add_argument("--output",required=True)
args=ap.parse_args()
req=json.loads(Path(".ai-handoff/REQUEST.json").read_text())
allowed=req.get("allowed_paths",[])

p=subprocess.run(["git","status","--porcelain=v1"],capture_output=True,text=True,check=True)
changed=[]
for line in p.stdout.splitlines():
    path=line[3:]
    if " -> " in path:
        path=path.split(" -> ",1)[1]
    changed.append(path)

hard_protected=(".ai-handoff/",".github/")
violations=[]
for path in changed:
    if path.startswith(hard_protected):
        violations.append({"path":path,"reason":"automation infrastructure is protected"})
        continue
    ok=any(fnmatch.fnmatch(path,pat) or path==pat for pat in allowed)
    if not ok:
        violations.append({"path":path,"reason":"outside exhaustive allowed_paths"})

obj={"changed":changed,"allowed_paths":allowed,"violations":violations,"ok":not violations}
Path(args.output).write_text(json.dumps(obj,ensure_ascii=False,indent=2))
