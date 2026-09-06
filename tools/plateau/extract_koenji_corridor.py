#!/usr/bin/env python3
"""
extract_koenji_corridor.py — offline, bounded CityGML 2.0 → GeoJSON extraction
for the Cultural Signal Lens (/atlas/, 高円寺 Production Beta 0).

Source: 3D都市モデル（Project PLATEAU）杉並区（2025年度）, CityGML 2.0, EPSG:6697
        (posList axis order: latitude longitude height).
Output: two same-origin GeoJSON FeatureCollections (buildings / roads) whose
        feature ids ARE the source gml:id values, so every feature is traceable
        to the official file it came from.

What it keeps (minimum needed for a quiet present-day substrate):
  Building: gml:id, bldg:lod0RoofEdge footprint (all polygons, exterior + interior
            rings), bldg:measuredHeight (m), source mesh.
  Road:     gml:id, tran:lod1MultiSurface polygons, source mesh.

What it does NOT do:
  - no clipping / simplification / smoothing of geometry (features are kept whole;
    only coordinate rounding to --precision decimals is applied);
  - no synthetic, placeholder or manual geometry;
  - no historical claim: the crop bbox is a present-day viewing window only.

Python stdlib only. Deterministic: the same inputs produce byte-identical outputs
(no timestamps inside the GeoJSON; the run report carries the timestamp).

Usage:
  python3 tools/plateau/extract_koenji_corridor.py \
    --bldg <mesh>_bldg_6697_op.gml [--bldg ...] \
    --tran <mesh>_tran_6697_op.gml [--tran ...] \
    --bbox 139.6465,35.7027,139.6520,35.7066 \
    --out-buildings work/koenji-plateau-2025-buildings.geojson \
    --out-roads work/koenji-plateau-2025-roads.geojson \
    --report work/extract-report.json
"""
from __future__ import annotations
import argparse, hashlib, json, re, sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

TOOL_NAME = "extract_koenji_corridor.py"
TOOL_VERSION = "0.1.0"

NS_CORE = "http://www.opengis.net/citygml/2.0"
NS_BLDG = "http://www.opengis.net/citygml/building/2.0"
NS_TRAN = "http://www.opengis.net/citygml/transportation/2.0"
NS_GML = "http://www.opengis.net/gml"
NS_APP = "http://www.opengis.net/citygml/appearance/2.0"
GML_ID = "{%s}id" % NS_GML
EXPECTED_SRS = "http://www.opengis.net/def/crs/EPSG/0/6697"
HEIGHT_SENTINEL_MAX = 0.0  # measuredHeight <= 0 (PLATEAU uses -9999 for unmeasured) → null

DATASET = {
    "provider": "Project PLATEAU / 国土交通省",
    "dataset_title": "3D都市モデル（Project PLATEAU）杉並区（2025年度）",
    "municipality_code": "13115",
    "municipality_name": "杉並区",
    "dataset_year": 2025,
    "citygml_version": "2.0",
    "spec": "3D都市モデル標準製品仕様書 第5.0版",
}


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def parse_poslist(text: str, precision: int):
    """EPSG:6697 posList = lat lon height triplets → [[lon, lat], ...] (height dropped)."""
    nums = [float(x) for x in re.split(r"\s+", (text or "").strip()) if x]
    if len(nums) % 3 != 0:
        raise ValueError("posList length %d is not a multiple of 3 (expected lat lon height)" % len(nums))
    pts = []
    for i in range(0, len(nums), 3):
        lat, lon = nums[i], nums[i + 1]
        if not (20.0 < lat < 50.0 and 120.0 < lon < 155.0):
            raise ValueError("coordinate outside Japan: lat=%r lon=%r (axis order?)" % (lat, lon))
        pts.append([round(lon, precision), round(lat, precision)])
    return pts


def polygon_rings(poly, precision):
    rings = []
    ext = poly.find("{%s}exterior" % NS_GML)
    if ext is None:
        return None
    parts = [("exterior", ext)] + [("interior", i) for i in poly.findall("{%s}interior" % NS_GML)]
    for kind, holder in parts:
        pl = holder.find(".//{%s}posList" % NS_GML)
        if pl is None:
            return None
        ring = parse_poslist(pl.text, precision)
        if len(ring) < 4:
            return None
        if ring[0] != ring[-1]:
            ring.append(list(ring[0]))
        rings.append(ring)
    return rings


def polygons_under(el, precision):
    polys = []
    for poly in el.iter("{%s}Polygon" % NS_GML):
        rings = polygon_rings(poly, precision)
        if rings:
            polys.append(rings)
    return polys


def geometry_from_polygons(polys):
    if not polys:
        return None
    if len(polys) == 1:
        return {"type": "Polygon", "coordinates": polys[0]}
    return {"type": "MultiPolygon", "coordinates": polys}


def bbox_of(polys):
    xs = [p[0] for poly in polys for ring in poly for p in ring]
    ys = [p[1] for poly in polys for ring in poly for p in ring]
    return [min(xs), min(ys), max(xs), max(ys)]


def intersects(a, b):
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])


def text_first(el, tag):
    node = el.find(".//%s" % tag)
    if node is not None and node.text and node.text.strip():
        return node.text.strip()
    return None


def scan(path: Path, kind: str, crop, precision, ids_seen):
    """Stream one CityGML file; return (selected_features, stats)."""
    feature_tag = "{%s}Building" % NS_BLDG if kind == "bldg" else "{%s}Road" % NS_TRAN
    mesh = path.name.split("_", 1)[0]
    stats = {"file": path.name, "mesh": mesh, "scanned": 0, "selected": 0, "without_geometry": 0,
             "duplicate_ids": 0, "srsName": None, "citygml_namespaces": {}}
    selected = []
    root_seen = False
    for event, el in ET.iterparse(str(path), events=("start", "start-ns", "end")):
        if event == "start-ns":
            prefix, uri = el
            if "opengis.net/citygml/" in uri:
                stats["citygml_namespaces"][prefix] = uri
                if not uri.endswith("/2.0"):
                    raise SystemExit("HOLD: CityGML namespace is not 2.0: %s=%s (a 3.0 or unknown schema needs new QA)" % (prefix, uri))
            continue
        if event == "start":
            if not root_seen:
                root_seen = True
                if el.tag != "{%s}CityModel" % NS_CORE:
                    raise SystemExit("HOLD: root element is not CityGML 2.0 core:CityModel (%s)" % el.tag)
            continue
        tag = el.tag
        if stats["srsName"] is None and local(tag) == "Envelope":
            stats["srsName"] = el.attrib.get("srsName")
            if stats["srsName"] != EXPECTED_SRS:
                raise SystemExit("HOLD: unexpected srsName %r (expected %s)" % (stats["srsName"], EXPECTED_SRS))
        if tag == "{%s}appearanceMember" % NS_APP:
            el.clear()
            continue
        if tag != feature_tag:
            continue
        stats["scanned"] += 1
        gid = el.attrib.get(GML_ID)
        if not gid:
            raise SystemExit("HOLD: %s feature without gml:id in %s" % (kind, path.name))
        if gid in ids_seen:
            stats["duplicate_ids"] += 1
            raise SystemExit("HOLD: duplicate gml:id %s" % gid)
        ids_seen.add(gid)
        if kind == "bldg":
            container = el.find("{%s}lod0RoofEdge" % NS_BLDG)
        else:
            container = el.find("{%s}lod1MultiSurface" % NS_TRAN)
        polys = polygons_under(container, precision) if container is not None else []
        if not polys:
            stats["without_geometry"] += 1
            el.clear()
            continue
        fb = bbox_of(polys)
        if intersects(fb, crop):
            props = {"gml_id": gid, "mesh": mesh}
            if kind == "bldg":
                h = text_first(el, "{%s}measuredHeight" % NS_BLDG)
                hv = float(h) if h is not None else None
                # PLATEAU writes -9999 for "not measured"; keep it as null (unknown), never as a height.
                props["measuredHeight"] = None if (hv is None or hv <= HEIGHT_SENTINEL_MAX) else hv
            selected.append({"type": "Feature", "id": gid, "properties": props,
                             "geometry": geometry_from_polygons(polys)})
            stats["selected"] += 1
        el.clear()
    return selected, stats


def collection(kind, features, sources, crop, precision):
    return {
        "type": "FeatureCollection",
        "properties": {
            "plateau_derived": True,
            "development_fixture": False,
            "municipality_code": DATASET["municipality_code"],
            "municipality_name": DATASET["municipality_name"],
            "dataset_year": DATASET["dataset_year"],
            "dataset_title": DATASET["dataset_title"],
            "spec": DATASET["spec"],
            "citygml_version": DATASET["citygml_version"],
            "feature_type": kind,
            "source_crs": EXPECTED_SRS,
            "coordinate_order": "GeoJSON [lon, lat]; source posList is lat lon height, height dropped",
            "precision_decimals": precision,
            "geometry_source": "bldg:lod0RoofEdge" if kind == "bldg" else "tran:lod1MultiSurface",
            "attributes": ["gml_id", "mesh", "measuredHeight (m; PLATEAU sentinel -9999 / non-positive → null)"] if kind == "bldg" else ["gml_id", "mesh"],
            "extraction": {
                "bbox_present_day_wgs84": crop,
                "rule": "feature bbox intersects the crop bbox; geometry kept whole (no clipping / simplification)",
                "historical_boundary": False,
                "note": "The crop bbox is a present-day viewing window for the Koenji Thread. It is not a historical boundary.",
            },
            "source_files": sources,
            "feature_count": len(features),
            "historicalGeometry": False,
            "tool": TOOL_NAME,
            "tool_version": TOOL_VERSION,
            "warning": "Present-day Project PLATEAU geometry only; not historical evidence.",
        },
        "features": features,
    }


def write_json(path: Path, obj):
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    path.write_text(data, encoding="utf-8")
    return len(data.encode("utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bldg", action="append", default=[], help="CityGML bldg file (repeatable)")
    ap.add_argument("--tran", action="append", default=[], help="CityGML tran file (repeatable)")
    ap.add_argument("--bbox", required=True, help="minLon,minLat,maxLon,maxLat (present-day viewing window)")
    ap.add_argument("--precision", type=int, default=6)
    ap.add_argument("--out-buildings", required=True)
    ap.add_argument("--out-roads", required=True)
    ap.add_argument("--report", required=True)
    args = ap.parse_args()

    crop = [float(x) for x in args.bbox.split(",")]
    if len(crop) != 4 or crop[0] >= crop[2] or crop[1] >= crop[3]:
        raise SystemExit("bbox must be minLon,minLat,maxLon,maxLat")
    if not args.bldg or not args.tran:
        raise SystemExit("at least one --bldg and one --tran file are required")

    report = {"tool": TOOL_NAME, "tool_version": TOOL_VERSION, "python": sys.version.split()[0],
              "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
              "dataset": DATASET, "bbox_present_day_wgs84": crop, "precision_decimals": args.precision,
              "sources": [], "outputs": {}}

    all_b, all_r = [], []
    src_b, src_r = [], []
    ids_b, ids_r = set(), set()
    for kind, files, dest, srcs, ids in (("bldg", args.bldg, all_b, src_b, ids_b), ("tran", args.tran, all_r, src_r, ids_r)):
        for raw in files:
            p = Path(raw)
            sha = sha256_file(p)
            feats, stats = scan(p, kind, crop, args.precision, ids)
            stats["sha256"] = sha
            stats["bytes"] = p.stat().st_size
            report["sources"].append(dict(stats, kind=kind))
            srcs.append({"file": p.name, "mesh": stats["mesh"], "sha256": sha, "bytes": stats["bytes"],
                         "features_in_file": stats["scanned"], "features_selected": stats["selected"]})
            dest.extend(feats)

    if not all_b or not all_r:
        raise SystemExit("HOLD: extraction selected no buildings or no roads inside the bbox")

    ob = Path(args.out_buildings); orr = Path(args.out_roads)
    nb = write_json(ob, collection("bldg", all_b, src_b, crop, args.precision))
    nr = write_json(orr, collection("tran", all_r, src_r, crop, args.precision))
    report["outputs"] = {
        "buildings": {"file": ob.name, "features": len(all_b), "bytes": nb, "sha256": sha256_file(ob)},
        "roads": {"file": orr.name, "features": len(all_r), "bytes": nr, "sha256": sha256_file(orr)},
    }
    Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "GO", "buildings": len(all_b), "roads": len(all_r),
                      "buildings_bytes": nb, "roads_bytes": nr}, ensure_ascii=False))


if __name__ == "__main__":
    main()
