#!/usr/bin/env python3
"""One-shot, fail-closed media localization for Tokyo Pilot 01.

Downloads only the three frozen rights-traced source assets, validates source
identity constraints, creates same-origin runtime media, writes machine-readable
acquisition evidence, and only then flips the Pilot to same-origin media.

Run only in an isolated non-main development branch. This script does not
commit, push, deploy, or touch Production by itself.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import shutil
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
ASSET_DIR = ROOT / "assets"
CONTENT = ROOT / "pilot_content.js"
ATTRIBUTION = ROOT / "MEDIA_ATTRIBUTION.md"
EVIDENCE = ROOT / "MEDIA_LOCALIZATION_EVIDENCE.json"
UA = "EmotionBookstoreTokyoPilot/1.0 (+media-localization-build-step)"

SOURCES = [
    {
        "id": "manuscript-cafe",
        "url": "https://livedoor.blogimg.jp/himag-g8p7khnw/imgs/e/0/e02beafe-s.png",
        "source_page_url": "https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/",
        "source_revision_or_oldid": None,
        "rights_basis": "official bounded media permission for this Pilot editorial/media context",
        "attribution": "Image: 高円寺『原稿執筆カフェ』公式ページ / メディア利用許可記載あり",
        "runtime": "manuscript-cafe.png",
        "mode": "preserve",
        "min_size": (400, 600),
    },
    {
        "id": "hachiko-taxidermy",
        "url": "https://upload.wikimedia.org/wikipedia/commons/6/66/Hachiko_in_National_Museum_of_Nature_and_Science.jpg",
        "source_page_url": "https://commons.wikimedia.org/wiki/File:Hachiko_in_National_Museum_of_Nature_and_Science.jpg",
        "source_revision_or_oldid": "1255524112",
        "rights_basis": "CC BY-SA 3.0",
        "attribution": "Photo: Momotarou2012 / Wikimedia Commons / CC BY-SA 3.0",
        "runtime": "hachiko.webp",
        "mode": "webp",
        "expected_size": (2752, 2064),
    },
    {
        "id": "meguro-tapeworm",
        "url": "https://upload.wikimedia.org/wikipedia/commons/0/06/Laika_ac_Meguro_Parasitological_Museum_%287482790682%29.jpg",
        "source_page_url": "https://commons.wikimedia.org/wiki/File:Laika_ac_Meguro_Parasitological_Museum_(7482790682).jpg",
        "source_revision_or_oldid": "1181727555",
        "rights_basis": "CC BY-SA 2.0",
        "attribution": "Photo: Laika ac / Wikimedia Commons / CC BY-SA 2.0",
        "runtime": "meguro-tapeworm.webp",
        "mode": "webp",
        "expected_size": (3328, 5002),
    },
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str) -> tuple[bytes, str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=30) as response:
        ctype = response.headers.get_content_type()
        final_url = response.geturl()
        if ctype not in {"image/jpeg", "image/png"}:
            raise RuntimeError(f"unexpected content-type {ctype} for {url}")
        data = response.read()
    if len(data) < 10_000:
        raise RuntimeError(f"download suspiciously small ({len(data)} bytes): {url}")
    return data, ctype, final_url


def validate_image(data: bytes, item: dict) -> Image.Image:
    image = Image.open(io.BytesIO(data))
    image.load()
    image = ImageOps.exif_transpose(image)
    if "expected_size" in item and image.size != item["expected_size"]:
        raise RuntimeError(f"{item['id']} size mismatch: {image.size} != {item['expected_size']}")
    if "min_size" in item:
        mw, mh = item["min_size"]
        if image.width < mw or image.height < mh:
            raise RuntimeError(f"{item['id']} too small: {image.size}")
    return image


def write_runtime(data: bytes, image: Image.Image, item: dict, staging: Path) -> tuple[str, tuple[int, int], bool, str]:
    target = staging / item["runtime"]
    if item["mode"] == "preserve":
        target.write_bytes(data)
        return "image/png", image.size, False, "source bytes preserved"

    converted = image.convert("RGB")
    converted.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    converted.save(target, "WEBP", quality=84, method=6)
    return (
        "image/webp",
        converted.size,
        True,
        "format conversion to WebP and proportional downscale only; no crop or compositing",
    )


def switch_content_to_local() -> None:
    text = CONTENT.read_text(encoding="utf-8")
    for item in SOURCES:
        pattern = re.compile(
            rf"(id:\s*'{re.escape(item['id'])}'[\s\S]*?mediaUrl:\s*)'https://[^']+'",
            re.MULTILINE,
        )
        text, count = pattern.subn(rf"\1'./assets/{item['runtime']}'", text, count=1)
        if count != 1:
            raise RuntimeError(f"could not switch mediaUrl for {item['id']}")
    if "mediaPolicy: 'external-preview-only'" not in text:
        raise RuntimeError("expected external-preview-only policy before localization")
    text = text.replace("mediaPolicy: 'external-preview-only'", "mediaPolicy: 'same-origin-localized'", 1)
    CONTENT.write_text(text, encoding="utf-8")


def update_runtime_note() -> None:
    text = ATTRIBUTION.read_text(encoding="utf-8")
    old = (
        "This isolated package uses external HTTPS image URLs because repository binary write is unavailable in the current ChatGPT GitHub connector session. "
        "`referrerpolicy=no-referrer` is applied. Production localization should replace these with same-origin rights-traced assets before main/Production promotion."
    )
    new = (
        "This isolated package uses same-origin localized media. Source-byte and runtime SHA-256, dimensions, acquisition time, modification status, "
        "source page/revision, rights basis and attribution are recorded in `MEDIA_LOCALIZATION_EVIDENCE.json`. Main/Production promotion remains a separate approval gate."
    )
    if old in text:
        text = text.replace(old, new, 1)
    elif "MEDIA_LOCALIZATION_EVIDENCE.json" not in text:
        text += "\n\n## Localization runtime evidence\n\n" + new + "\n"
    ATTRIBUTION.write_text(text, encoding="utf-8")


def main() -> None:
    acquired_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    records = []

    with tempfile.TemporaryDirectory(prefix="tokyo-pilot-media-") as tmp:
        staging = Path(tmp)

        # Phase 1: all sources must download and validate before any runtime switch.
        for item in SOURCES:
            data, source_mime, final_url = download(item["url"])
            image = validate_image(data, item)
            runtime_mime, runtime_size, modified, note = write_runtime(data, image, item, staging)
            runtime_path = staging / item["runtime"]
            records.append(
                {
                    "id": item["id"],
                    "acquired_at": acquired_at,
                    "source_page_url": item["source_page_url"],
                    "source_asset_url": item["url"],
                    "resolved_asset_url": final_url,
                    "source_revision_or_oldid": item["source_revision_or_oldid"],
                    "rights_basis": item["rights_basis"],
                    "attribution_text": item["attribution"],
                    "source_content_type": source_mime,
                    "source_dimensions": [image.width, image.height],
                    "source_sha256": sha256_bytes(data),
                    "runtime_file": f"./assets/{item['runtime']}",
                    "runtime_content_type": runtime_mime,
                    "runtime_dimensions": [runtime_size[0], runtime_size[1]],
                    "runtime_sha256": sha256_file(runtime_path),
                    "modified": modified,
                    "modification_note": note,
                }
            )

        # Phase 2: publish all validated assets/evidence, then atomically switch policy/content.
        ASSET_DIR.mkdir(exist_ok=True)
        for item in SOURCES:
            shutil.copy2(staging / item["runtime"], ASSET_DIR / item["runtime"])

        evidence_tmp = ROOT / ".MEDIA_LOCALIZATION_EVIDENCE.json.tmp"
        evidence_tmp.write_text(
            json.dumps(
                {
                    "schema": "tokyo-pilot-media-localization-v1",
                    "acquired_at": acquired_at,
                    "asset_count": len(records),
                    "assets": records,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        evidence_tmp.replace(EVIDENCE)
        switch_content_to_local()
        update_runtime_note()

    print("MEDIA_LOCALIZATION_GO")
    for record in records:
        target = ROOT / record["runtime_file"]
        print(
            f"{record['id']}: {target.name} {target.stat().st_size} bytes "
            f"sha256={record['runtime_sha256']}"
        )


if __name__ == "__main__":
    main()
