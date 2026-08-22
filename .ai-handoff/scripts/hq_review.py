#!/usr/bin/env python3
import argparse, base64, json, mimetypes, os, subprocess, urllib.request
from pathlib import Path

def response_text(resp):
    texts=[]
    for item in resp.get("output",[]):
        if item.get("type")=="message":
            for c in item.get("content",[]):
                if c.get("type")=="output_text":
                    texts.append(c.get("text",""))
    return "\n".join(texts).strip()

def images():
    roots=[Path("outputs"),Path("artifacts"),Path("screenshots"),Path("runtime"),Path("evidence")]
    out=[]
    seen=set()
    for root in roots:
        if not root.exists(): continue
        for p in root.rglob("*"):
            if p.suffix.lower() not in {".png",".jpg",".jpeg",".webp"}: continue
            if p in seen or p.stat().st_size>8_000_000: continue
            seen.add(p); out.append(p)
    return out[:6]

ap=argparse.ArgumentParser()
ap.add_argument("--iteration",type=int,required=True)
ap.add_argument("--codex-report",required=True)
ap.add_argument("--scope-guard",required=True)
ap.add_argument("--output",required=True)
ap.add_argument("--github-output",required=True)
args=ap.parse_args()

req=json.loads(Path(".ai-handoff/REQUEST.json").read_text())
guard=json.loads(Path(args.scope_guard).read_text())
rules=Path(".ai-handoff/HQ_RULES.md").read_text()
schema=json.loads(Path(".ai-handoff/schemas/hq-review.schema.json").read_text())

# deterministic hard fail before model judgment
if guard["violations"]:
    review={
        "disposition":"NO_GO",
        "summary":"Deterministic scope guard found changes outside the exhaustive allowed_paths.",
        "issues":[{"severity":"blocker","title":"Protected scope violation","detail":json.dumps(guard["violations"],ensure_ascii=False)}],
        "fix_prompt":"",
        "evidence_required":[],
        "protected_scope_violation":True,
        "runtime_visual_evidence_present":False,
        "source_authority_uncertain":False
    }
    Path(args.output).write_text(json.dumps(review,ensure_ascii=False,indent=2))
    with open(args.github_output,"a") as f:f.write("disposition=NO_GO\n")
    raise SystemExit(0)

report=Path(args.codex_report).read_text() if Path(args.codex_report).exists() else "(missing)"
diff=subprocess.run(["git","diff","--binary","--","."],capture_output=True,text=True).stdout

prompt=f"""Independent HQ review iteration {args.iteration}.

REQUEST:
{json.dumps(req,ensure_ascii=False,indent=2)}

HQ RULES:
{rules}

SCOPE GUARD:
{json.dumps(guard,ensure_ascii=False,indent=2)}

CODEX REPORT:
{report}

GIT DIFF:
{diff[:220000]}

Review the implementation. Do not edit it.
"""

content=[{"type":"input_text","text":prompt}]
img_paths=images()
for p in img_paths:
    mime=mimetypes.guess_type(p.name)[0] or "image/png"
    b64=base64.b64encode(p.read_bytes()).decode()
    content.append({"type":"input_image","image_url":f"data:{mime};base64,{b64}","detail":"high"})

model=os.environ.get("HQ_REVIEW_MODEL","gpt-5.6-sol") or "gpt-5.6-sol"
effort=os.environ.get("HQ_REVIEW_EFFORT","max") or "max"
payload={
    "model":model,
    "reasoning":{"effort":effort},
    "instructions":"Return only the structured HQ review. Be strict about visual evidence and protected scope.",
    "input":[{"role":"user","content":content}],
    "store":False,
    "text":{
        "verbosity":"medium",
        "format":{"type":"json_schema","name":"hq_review","strict":True,"schema":schema}
    }
}
request=urllib.request.Request(
    "https://api.openai.com/v1/responses",
    data=json.dumps(payload).encode(),
    headers={"Authorization":"Bearer "+os.environ["OPENAI_API_KEY"],"Content-Type":"application/json"},
    method="POST"
)
with urllib.request.urlopen(request,timeout=900) as r:
    resp=json.loads(r.read().decode())

review=json.loads(response_text(resp))
# Visual evidence is deterministic: reviewer may not claim present if none attached.
if req.get("requires_runtime_visual") and not img_paths and review["disposition"]=="GO":
    review["disposition"]="HOLD"
    review["summary"]="Runtime visual evidence is required by REQUEST but no post-change screenshot was supplied."
    review["runtime_visual_evidence_present"]=False
    review["evidence_required"].append("Post-change Actual runtime screenshots required by REQUEST.")

Path(args.output).write_text(json.dumps(review,ensure_ascii=False,indent=2))
with open(args.github_output,"a") as f:f.write("disposition="+review["disposition"]+"\n")
