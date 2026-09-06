#!/usr/bin/env python3
"""
Cross-check normalized Cultural Signal Lens GeoJSON against CityGML source audits
and optionally write a signed-by-hash lineage certificate.

Certificate chain:
official GML SHA
→ audited gml:id
→ normalized GeoJSON SHA
→ traceable output feature IDs
→ lineage certificate

This does not prove a cultural relation or historical location.
"""

import argparse, json, sys, hashlib
from pathlib import Path

def read(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))

def sha256(p):
    h=hashlib.sha256()
    with Path(p).open("rb") as f:
        for c in iter(lambda:f.read(1024*1024),b""):
            h.update(c)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--geojson",required=True)
    ap.add_argument("--audit",action="append",required=True)
    ap.add_argument("--allow-null-ids",action="store_true")
    ap.add_argument("--output")
    args=ap.parse_args()

    geo_path=Path(args.geojson)
    geo=read(geo_path)
    source_ids=set()
    audits=[]
    for p in args.audit:
        a=read(p)
        if a.get("citygml_version")!="2.0":
            raise SystemExit(
              f"HOLD: source audit CityGML version {a.get('citygml_version')} != 2.0"
            )
        source_ids.update(a.get("gml_ids",[]))
        audits.append({
          "audit_file":Path(p).name,
          "source_file":a.get("source_file"),
          "source_sha256":a.get("source_sha256"),
          "citygml_version":a.get("citygml_version"),
          "feature_count":a.get("feature_count"),
          "gml_id_count":a.get("gml_id_count"),
          "envelope":a.get("envelope"),
        })

    out_ids=[]
    nulls=0
    for f in geo.get("features",[]):
        fid=f.get("id")
        if fid is None:
            props=f.get("properties") or {}
            fid=props.get("gml:id") or props.get("gml_id") or props.get("id")
        if fid is None:
            nulls+=1
        else:
            out_ids.append(str(fid))

    missing=sorted(set(out_ids)-source_ids)
    errs=[]
    if missing:
        errs.append(f"{len(missing)} output IDs not present in source CityGML audit")
    if nulls and not args.allow_null_ids:
        errs.append(f"{nulls} output features have no traceable id")
    if not out_ids:
        errs.append("no traceable output feature ids")

    result={
      "certificate_version":"plateau-lineage-v0.1",
      "status":"GO" if not errs else "HOLD",
      "geojson_file":geo_path.name,
      "geojson_sha256":sha256(geo_path),
      "output_features":len(geo.get("features",[])),
      "traceable_output_ids":len(out_ids),
      "null_output_ids":nulls,
      "source_id_count":len(source_ids),
      "missing_output_ids":missing[:20],
      "source_audits":audits,
      "citygml_version":"2.0",
      "historicalGeometry":False,
      "claim_scope":"Source lineage only; no cultural or historical-location claim."
    }

    if args.output:
        Path(args.output).write_text(
          json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8"
        )

    print(json.dumps(result,ensure_ascii=False,indent=2))
    if errs:
        for e in errs:
            print("HOLD:",e,file=sys.stderr)
        raise SystemExit(1)

if __name__=="__main__":
    main()
