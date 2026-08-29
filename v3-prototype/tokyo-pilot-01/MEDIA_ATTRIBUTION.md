# MEDIA ATTRIBUTION / SOURCE TRACE — Tokyo Pilot 01

Verified: 2026-08-27 JST
Runtime media status: **same-origin localized / isolated Human Test scope only**

## 1. 原稿執筆カフェ

- Media: official page key visual
- Source asset: https://livedoor.blogimg.jp/himag-g8p7khnw/imgs/e/0/e02beafe-s.png
- Rights/source page: https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/
- Rights basis: official page states `本ページにある写真や文章などはメディアでご自由にお使いください`.
- Runtime asset: `./assets/manuscript-cafe.png` / 640×905 / PNG.
- Acquisition: Google Slides fetched the pinned source URL and the embedded media was exported from PPTX. Pixel dimensions were preserved; no crop/compositing. Source-byte identity could not be directly compared in the local runtime.
- Use scope: isolated editorial Human Test. Do not infer blanket Production/paid-ad/endorsement rights from this Pilot use.

## 2. 国立科学博物館 / 忠犬ハチ公

- Media: `Hachiko in National Museum of Nature and Science.jpg`
- Author: Momotarou2012
- License: CC BY-SA 3.0
- File page: https://commons.wikimedia.org/wiki/File:Hachiko_in_National_Museum_of_Nature_and_Science.jpg
- Pinned source dimensions: 2752×2064.
- Runtime asset: `./assets/hachiko.jpg` / 2048×1536 / JPEG.
- Modification: proportional technical downscale by Google Slides ingest/export; full-frame, no crop/compositing.
- Attribution/license link remains visible in the detail surface.

## 3. 目黒寄生虫館 / 8.8mサナダムシ標本

- Media: `Laika ac Meguro Parasitological Museum (7482790682).jpg`
- Author: Laika ac
- License: CC BY-SA 2.0
- File page: https://commons.wikimedia.org/wiki/File:Laika_ac_Meguro_Parasitological_Museum_(7482790682).jpg
- Pinned source dimensions: 3328×5002.
- Runtime asset: `./assets/meguro-tapeworm.jpg` / 1363×2048 / JPEG.
- Modification: proportional technical downscale by Google Slides ingest/export; full-frame, no crop/compositing.
- UX rule: this image is evidence of the length, so the Pilot uses `object-fit: contain` rather than cropping the specimen away.
- Attribution/license link remains visible in the detail surface.

## Acquisition evidence

Machine-readable source/runtime trace, dimensions, hashes, modification notes and scope are in `MEDIA_LOCALIZATION_EVIDENCE.json`.

The current local assets are deliberately approved for **isolated Human Test only**. `production_promotion=false` is recorded for every asset. Production/main promotion remains a separate media/legal/quality gate and is not implied by this localization.

## Current-truth refresh

- 原稿執筆カフェ: official page confirms the media-use sentence, purpose restriction, goal entry, checkout restriction, progress checks, address and current schedule.
- Hachiko: official exhibition data identifies `秋田犬（ハチ）`, specimen type `剥製`, Japan Gallery 2F North Wing.
- Meguro: official museum information/history supports the 8.8m specimen, its 1986 expulsion/display history, current visitor hours/closures and free admission.

All three records remain `reverifyBeforeExternalCycle=true`; a Human Test cycle must use a fresh current-operation check.
