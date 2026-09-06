#!/usr/bin/env python3
"""
promote_verified_data.py — lineage-gated promotion of PLATEAU-derived GeoJSON into /atlas/data/.

Adapted from the HQ Resume Pack (CULTURAL_SIGNAL_LENS_R3_v0_5, tools/promote_verified_data.py):
the validations are the pack's (plateau_derived / development_fixture / 13115 / 2025 /
historicalGeometry / certificate GO + SHA match), plus: feature ids must be gml:id-shaped,
feature_count must match, and the written provenance carries the full dataset identity,
license text and extraction record from the source manifest.

Promotion HOLDs (non-zero exit, nothing written) on any mismatch.
"""
import argparse, hashlib, json, re, shutil, tempfile
from datetime import datetime, timezone
from pathlib import Path


def read(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def sha256(p):
    h = hashlib.sha256()
    with Path(p).open("rb") as f:
        for c in iter(lambda: f.read(1024 * 1024), b""):
            h.update(c)
    return h.hexdigest()


ID_RE = {"buildings": re.compile(r"^bldg_[0-9a-f-]{36}$"), "roads": re.compile(r"^tran_[0-9a-f-]{36}$")}


def validate_geo(path, label):
    g = read(path); props = g.get("properties", {}); errs = []
    if g.get("type") != "FeatureCollection": errs.append("not FeatureCollection")
    if props.get("plateau_derived") is not True: errs.append("plateau_derived!=true")
    if props.get("development_fixture") is not False: errs.append("development_fixture!=false")
    if str(props.get("municipality_code")) != "13115": errs.append("municipality_code!=13115")
    if int(props.get("dataset_year", -1)) != 2025: errs.append("dataset_year!=2025")
    if props.get("citygml_version") != "2.0": errs.append("citygml_version!=2.0")
    if props.get("historicalGeometry") is not False: errs.append("historicalGeometry!=false")
    feats = g.get("features") or []
    if not feats: errs.append("no features")
    if int(props.get("feature_count", -1)) != len(feats): errs.append("feature_count mismatch")
    bad = [f.get("id") for f in feats if not isinstance(f.get("id"), str) or not ID_RE[label].match(f.get("id"))]
    if bad: errs.append("%d feature ids are not source gml:id shaped (e.g. %r)" % (len(bad), bad[0]))
    if any("synthetic" in str(f.get("id", "")).lower() for f in feats): errs.append("synthetic id present")
    if errs: raise SystemExit("HOLD %s: " % label + ", ".join(errs))
    return g


def validate_cert(cert_path, geo_path, label):
    c = read(cert_path); errs = []
    if c.get("certificate_version") != "plateau-lineage-v0.1": errs.append("certificate version")
    if c.get("status") != "GO": errs.append("certificate not GO")
    if c.get("citygml_version") != "2.0": errs.append("CityGML version not 2.0")
    if c.get("historicalGeometry") is not False: errs.append("historicalGeometry")
    if c.get("geojson_file") != Path(geo_path).name: errs.append("certificate names a different file")
    if c.get("geojson_sha256") != sha256(geo_path): errs.append("GeoJSON hash mismatch")
    if int(c.get("traceable_output_ids", 0)) < 1: errs.append("no traceable ids")
    if int(c.get("output_features", 0)) < 1: errs.append("no output features")
    if int(c.get("output_features", 0)) != int(c.get("traceable_output_ids", -1)): errs.append("not every output feature is traceable")
    if int(c.get("null_output_ids", 1)) != 0: errs.append("null output ids")
    if c.get("missing_output_ids"): errs.append("missing output ids")
    if not c.get("source_audits"): errs.append("source audits missing")
    if errs: raise SystemExit("HOLD %s lineage: " % label + ", ".join(errs))
    return c


def validate_source_manifest(path):
    m = read(path); s = m.get("source", {}); errs = []
    if str(s.get("city_code")) != "13115": errs.append("city")
    if int(s.get("year", -1)) != 2025: errs.append("year")
    if s.get("citygml_version") != "2.0": errs.append("citygml")
    if not m.get("files"): errs.append("files")
    if m.get("extraction", {}).get("historical_geometry") is not False: errs.append("historical_geometry")
    if not m.get("license", {}).get("attribution_text"): errs.append("attribution")
    if errs: raise SystemExit("HOLD source manifest: " + ", ".join(errs))
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--buildings", required=True)
    ap.add_argument("--roads", required=True)
    ap.add_argument("--building-lineage", required=True)
    ap.add_argument("--road-lineage", required=True)
    ap.add_argument("--source-manifest", required=True)
    ap.add_argument("--data-dir", required=True)
    args = ap.parse_args()

    bp = Path(args.buildings); rp = Path(args.roads)
    bg = validate_geo(bp, "buildings")
    rg = validate_geo(rp, "roads")
    bc = validate_cert(Path(args.building_lineage), bp, "buildings")
    rc = validate_cert(Path(args.road_lineage), rp, "roads")
    src = validate_source_manifest(args.source_manifest)

    # the certificate's source audits must be exactly the manifest's source files of that type
    for cert, typ, label in ((bc, "bldg", "buildings"), (rc, "tran", "roads")):
        want = sorted(f["sha256"] for f in src["files"] if f["type"] == typ)
        got = sorted(a.get("source_sha256") for a in cert["source_audits"])
        if want != got:
            raise SystemExit("HOLD %s: certificate source SHA set differs from the source manifest" % label)

    data = Path(args.data_dir); data.mkdir(parents=True, exist_ok=True)
    bsha = sha256(bp); rsha = sha256(rp); msha = sha256(Path(args.source_manifest))
    bcsha = sha256(Path(args.building_lineage)); rcsha = sha256(Path(args.road_lineage))
    bname = "koenji-plateau-2025-buildings-%s.geojson" % bsha[:12]
    rname = "koenji-plateau-2025-roads-%s.geojson" % rsha[:12]
    pname = "koenji-plateau-2025-provenance-%s.json" % msha[:12]

    # remove previously promoted files so only the certified set remains
    for old in data.glob("koenji-plateau-2025-*"):
        if old.name not in (bname, rname, pname):
            old.unlink()
    shutil.copy2(bp, data / bname)
    shutil.copy2(rp, data / rname)

    s = src["source"]; lic = src["license"]; ext = src["extraction"]
    prov = {
        "status": "VERIFIED_PLATEAU_DERIVED_WITH_LINEAGE",
        "provider": s["provider"],
        "dataset_title": s["dataset_title"],
        "municipality_code": s["city_code"],
        "municipality_name": s["city_name"],
        "dataset_year": s["year"],
        "citygml_version": s["citygml_version"],
        "spec": s["spec"],
        "source_dataset_url": s["dataset_url"],
        "source_package": s["package"],
        "source_package_sha256": s["package_sha256"],
        "selected_meshes": src["selected_meshes"],
        "source_files": [{"path": f["path"], "sha256": f["sha256"], "bytes": f["bytes"]} for f in src["files"]],
        "api_endpoint": src.get("api_endpoint"),
        "source_manifest_sha256": msha,
        "buildings_file": bname,
        "buildings_sha256": bsha,
        "roads_file": rname,
        "roads_sha256": rsha,
        "building_lineage_certificate_sha256": bcsha,
        "road_lineage_certificate_sha256": rcsha,
        "building_source_gml_sha256s": [x.get("source_sha256") for x in bc.get("source_audits", [])],
        "road_source_gml_sha256s": [x.get("source_sha256") for x in rc.get("source_audits", [])],
        "building_features": len(bg.get("features", [])),
        "road_features": len(rg.get("features", [])),
        "extraction": {
            "tool": ext["tool"], "tool_version": ext["tool_version"], "method": ext["method"],
            "bbox_present_day_wgs84": ext["bbox_present_day_wgs84"], "bbox_note": ext["bbox_note"],
            "measured_height_sentinel": ext.get("measured_height_sentinel"),
        },
        "license": {
            "selected": lic["selected_for_this_site"], "offered": lic["offered"],
            "attribution_text": lic["attribution_text"], "readme_caution": lic["readme_caution"],
        },
        "historicalGeometry": False,
        "promoted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "warning": "Present-day spatial substrate only; not historical evidence.",
    }
    (data / pname).write_text(json.dumps(prov, ensure_ascii=False, indent=2), encoding="utf-8")

    runtime = {
        "schema_version": 2,
        "mode": "production_candidate",
        "production_eligible": True,
        "buildings": "./data/" + bname,
        "roads": "./data/" + rname,
        "provenance": "./data/" + pname,
        "historicalGeometry": False,
        "dataset": {"city_code": "13115", "year": 2025, "citygml_version": "2.0"},
        "lineage_required": True,
    }
    target = data / "runtime-spatial.json"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=data, prefix=".runtime-", suffix=".json") as tf:
        json.dump(runtime, tf, ensure_ascii=False, indent=2)
        temp = Path(tf.name)
    temp.replace(target)
    target.chmod(0o644)
    print(json.dumps({"status": "PROMOTED", "buildings": bname, "roads": rname, "provenance": pname,
                      "runtime": str(target), "lineage_required": True}, ensure_ascii=False))


if __name__ == "__main__":
    main()
