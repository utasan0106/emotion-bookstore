#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
EVIDENCE = ROOT / "MEDIA_LOCALIZATION_EVIDENCE.json"
CONTENT = ROOT / "pilot_content.js"

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def fail(message: str) -> None:
    print("MEDIA_VALIDATE_FAIL")
    print("- " + message)
    raise SystemExit(1)

def main() -> None:
    if not EVIDENCE.exists(): fail("evidence missing")
    data = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    assets = data.get("assets")
    if not isinstance(assets, list) or len(assets) != 3: fail("expected exactly 3 evidence assets")
    content = CONTENT.read_text(encoding="utf-8")
    if "mediaPolicy: 'same-origin-localized'" not in content: fail("media policy not localized")
    seen = set()
    for rec in assets:
        oid = rec.get("id")
        if not oid or oid in seen: fail(f"bad/duplicate id: {oid}")
        seen.add(oid)
        if rec.get("human_test_scope_only") is not True or rec.get("production_promotion") is not False:
            fail(f"scope boundary invalid: {oid}")
        rel = rec.get("runtime_file", "")
        if not rel.startswith("./assets/"): fail(f"bad runtime path: {oid}")
        path = ROOT / rel[2:]
        if not path.exists(): fail(f"missing runtime file: {oid}")
        if sha256(path) != rec.get("runtime_sha256"): fail(f"sha256 mismatch: {oid}")
        if path.stat().st_size != rec.get("runtime_size_bytes"): fail(f"size mismatch: {oid}")
        with Image.open(path) as im:
            im.load()
            dims = [im.width, im.height]
            if dims != rec.get("runtime_dimensions"): fail(f"dimension mismatch: {oid}: {dims}")
            if im.width < 600 or im.height < 600: fail(f"unexpectedly small asset: {oid}: {dims}")
        block = re.search(r"id:\s*'" + re.escape(oid) + r"'[\s\S]*?mediaUrl:\s*'([^']+)'", content)
        if not block or block.group(1) != rel: fail(f"content/runtime path mismatch: {oid}")
    print("MEDIA_VALIDATE_GO")
    for rec in assets:
        print(f"{rec['id']}: {rec['runtime_file']} {rec['runtime_dimensions']} sha256={rec['runtime_sha256']}")

if __name__ == "__main__":
    main()
