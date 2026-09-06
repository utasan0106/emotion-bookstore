#!/usr/bin/env python3
"""
production_spatial_qa.py — post-promotion gate for /atlas/data (adapted from the HQ Resume Pack:
same checks, plus certificate-SHA re-verification against the promoted files).

Usage: python3 tools/plateau/production_spatial_qa.py [--root atlas] [--lineage-dir tools/plateau/koenji]
"""
import argparse, hashlib, json, sys
from pathlib import Path


def sha256(p):
    h = hashlib.sha256()
    with Path(p).open("rb") as f:
        for c in iter(lambda: f.read(1024 * 1024), b""):
            h.update(c)
    return h.hexdigest()


ap = argparse.ArgumentParser()
ap.add_argument("--root", default="atlas")
ap.add_argument("--lineage-dir", default="tools/plateau/koenji")
args = ap.parse_args()
root = Path(args.root); data = root / "data"; errs = []
runtime = json.loads((data / "runtime-spatial.json").read_text(encoding="utf-8"))
if runtime.get("production_eligible") is not True: errs.append("production_eligible")
if runtime.get("lineage_required") is not True: errs.append("lineage_required")
if runtime.get("historicalGeometry") is not False: errs.append("historicalGeometry")
dataset = runtime.get("dataset") or {}
if str(dataset.get("city_code")) != "13115" or int(dataset.get("year", -1)) != 2025: errs.append("dataset identity")
if dataset.get("citygml_version") != "2.0": errs.append("CityGML version")


def load(rel):
    if not isinstance(rel, str) or not rel.startswith("./data/"):
        errs.append("invalid runtime path"); return {}, None
    p = root / rel[2:]
    if not p.exists():
        errs.append("runtime file missing " + rel); return {}, None
    return json.loads(p.read_text(encoding="utf-8")), p


b, bp = load(runtime.get("buildings")); r, rp = load(runtime.get("roads")); p, pp = load(runtime.get("provenance"))
for g, label in [(b, "buildings"), (r, "roads")]:
    props = g.get("properties", {})
    if props.get("plateau_derived") is not True: errs.append(label + " plateau")
    if props.get("development_fixture") is not False: errs.append(label + " fixture")
    if str(props.get("municipality_code")) != "13115": errs.append(label + " city")
    if int(props.get("dataset_year", -1)) != 2025: errs.append(label + " year")
    if props.get("historicalGeometry") is not False: errs.append(label + " historical")
    if not g.get("features"): errs.append(label + " empty")
if p.get("status") != "VERIFIED_PLATEAU_DERIVED_WITH_LINEAGE": errs.append("provenance status")
if p.get("citygml_version") != "2.0": errs.append("provenance CityGML")
if not p.get("building_lineage_certificate_sha256"): errs.append("building cert hash")
if not p.get("road_lineage_certificate_sha256"): errs.append("road cert hash")
if p.get("historicalGeometry") is not False: errs.append("provenance historical")
# certificate ↔ promoted file SHA (the certificate must describe exactly the file that ships)
ld = Path(args.lineage_dir)
for cert_name, fp, key in (("koenji-plateau-2025-buildings.lineage.json", bp, "building_lineage_certificate_sha256"),
                           ("koenji-plateau-2025-roads.lineage.json", rp, "road_lineage_certificate_sha256")):
    cp = ld / cert_name
    if not cp.exists():
        errs.append("certificate missing " + cert_name); continue
    c = json.loads(cp.read_text(encoding="utf-8"))
    if fp is None or c.get("geojson_sha256") != sha256(fp): errs.append("certificate SHA != promoted file SHA (" + cert_name + ")")
    if c.get("status") != "GO": errs.append("certificate not GO (" + cert_name + ")")
    if p.get(key) != sha256(cp): errs.append("provenance does not reference this certificate (" + cert_name + ")")
if bp is not None and p.get("buildings_sha256") != sha256(bp): errs.append("provenance buildings sha")
if rp is not None and p.get("roads_sha256") != sha256(rp): errs.append("provenance roads sha")
print("GO" if not errs else "HOLD")
for e in errs: print("-", e)
sys.exit(bool(errs))
