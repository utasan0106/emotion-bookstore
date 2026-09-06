#!/usr/bin/env python3
"""
Audit an official PLATEAU CityGML file and pin its schema generation.

Why:
Project PLATEAU has announced a future transition toward CityGML 3.0.
The current Beta pipeline is designed for the exact 2025 Suginami snapshot,
so a future schema must not be accepted silently.

This tool:
- records SHA-256
- detects CityGML namespace generation
- records root envelope CRS
- counts target features
- records gml:id
- records measuredHeight where observable
- fails closed when the CityGML generation is not explicitly allowed

No third-party GIS conversion is performed here.
"""

import argparse, hashlib, json
from pathlib import Path
from lxml import etree

GML_NS = "http://www.opengis.net/gml"
GML_ID = f"{{{GML_NS}}}id"

CITYGML_NAMESPACE_VERSION = {
    "http://www.opengis.net/citygml/2.0": "2.0",
    "http://www.opengis.net/citygml/building/2.0": "2.0",
    "http://www.opengis.net/citygml/transportation/2.0": "2.0",
    "http://www.opengis.net/citygml/3.0": "3.0",
    "http://www.opengis.net/citygml/building/3.0": "3.0",
    "http://www.opengis.net/citygml/transportation/3.0": "3.0",
}

def sha256(path):
    h=hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def lname(tag):
    if not isinstance(tag,str): return ""
    return tag.split("}",1)[-1] if "}" in tag else tag

def ns(tag):
    if isinstance(tag,str) and tag.startswith("{") and "}" in tag:
        return tag[1:].split("}",1)[0]
    return None

def detect_version_from_nsmap(nsmap):
    versions=set()
    for uri in (nsmap or {}).values():
        v=CITYGML_NAMESPACE_VERSION.get(uri)
        if v: versions.add(v)
    if len(versions)==1:
        return next(iter(versions))
    if len(versions)>1:
        return "mixed"
    return "unknown"

def text_first(el, local_name):
    for child in el.iter():
        if lname(child.tag)==local_name and child.text and child.text.strip():
            return child.text.strip(), child.attrib.get("uom")
    return None, None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--feature",required=True,help="Building or Road")
    ap.add_argument("--max-ids",type=int,default=200000)
    ap.add_argument("--allow-citygml-version",action="append",default=["2.0"])
    args=ap.parse_args()

    inp=Path(args.input)
    ids=[]
    measured={}
    feature_count=0
    envelope=None
    version=None
    root_nsmap=None

    context=etree.iterparse(
        str(inp),events=("start","end"),huge_tree=True,recover=False
    )
    root_seen=False
    for event,el in context:
        if event=="start" and not root_seen:
            root_seen=True
            root_nsmap={str(k):v for k,v in (el.nsmap or {}).items()}
            version=detect_version_from_nsmap(el.nsmap)

        local=lname(el.tag)
        if event=="end" and local=="Envelope" and envelope is None:
            lower=None; upper=None
            for child in el:
                if lname(child.tag)=="lowerCorner" and child.text:
                    lower=child.text.strip()
                if lname(child.tag)=="upperCorner" and child.text:
                    upper=child.text.strip()
            envelope={
              "srsName":el.attrib.get("srsName"),
              "lowerCorner":lower,
              "upperCorner":upper
            }

        if event=="end" and local==args.feature:
            feature_count+=1
            gid=el.attrib.get(GML_ID)
            if gid:
                if len(ids)>=args.max_ids:
                    raise SystemExit(
                        f"HOLD: gml:id count exceeds --max-ids {args.max_ids}"
                    )
                ids.append(gid)
                val,uom=text_first(el,"measuredHeight")
                if val is not None:
                    measured[gid]={"value":val,"uom":uom}
            el.clear()
            while el.getprevious() is not None:
                del el.getparent()[0]

    allowed=set(args.allow_citygml_version)
    if version not in allowed:
        raise SystemExit(
          f"HOLD: CityGML version {version!r} not in allowed {sorted(allowed)}"
        )

    result={
      "audit_version":"0.2",
      "source_file":inp.name,
      "source_bytes":inp.stat().st_size,
      "source_sha256":sha256(inp),
      "citygml_version":version,
      "allowed_citygml_versions":sorted(allowed),
      "root_namespaces":root_nsmap,
      "feature_local_name":args.feature,
      "feature_count":feature_count,
      "gml_id_count":len(ids),
      "gml_ids":ids,
      "measured_height_count":len(measured),
      "measured_heights":measured,
      "envelope":envelope,
      "historicalGeometry":False,
      "note":"Source lineage audit only. Current PLATEAU geometry is not historical evidence."
    }
    Path(args.output).write_text(
      json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8"
    )
    print(json.dumps({
      "status":"GO",
      "citygml_version":version,
      "feature":args.feature,
      "feature_count":feature_count,
      "gml_id_count":len(ids),
      "measured_height_count":len(measured),
      "source_sha256":result["source_sha256"]
    },ensure_ascii=False))

if __name__=="__main__":
    main()
