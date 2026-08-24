# V3 Visual Asset Pack — Ready

Status: **ASSET SET COMPLETE / SOURCE PRESERVED / RUNTIME DERIVATIVES READY**

## Emotion tiles

- `emotion_hajimu` — source 1.90 MB → runtime 61 KB
- `emotion_atatamaru` — source 2.51 MB → runtime 62 KB
- `emotion_hikareru` — source 1.62 MB → runtime 26 KB
- `emotion_shizumu` — source 2.32 MB → runtime 35 KB
- `emotion_zawatsuku` — source 1.90 MB → runtime 75 KB
- `emotion_butsukaru` — source 1.78 MB → runtime 49 KB
- `emotion_miwohiku` — source 1.82 MB → runtime 32 KB
- `emotion_mada` — source 1.64 MB → runtime 40 KB

## Category fallbacks

- `category_book` — source 1.74 MB → runtime 24 KB
- `category_film` — source 1.79 MB → runtime 22 KB
- `category_music` — source 1.91 MB → runtime 29 KB
- `category_place` — source 2.05 MB → runtime 36 KB
- `category_exhibition` — source 1.90 MB → runtime 24 KB
- `category_dining` — source 2.02 MB → runtime 34 KB
- `category_event` — source 2.38 MB → runtime 35 KB
- `category_activity` — source 2.14 MB → runtime 43 KB

## Implementation rules

- Keep `source_png/` as source-of-truth design assets; do not overwrite existing canonical V3 assets.
- Mount only `runtime_webp/` in UI unless a later QA requires a larger derivative.
- Emotion tiles: photo + geometric overlay, UI text added in HTML/CSS rather than baked into images.
- Category fallbacks: abstract graphic, never present them as real photos.
- Add explicit `width`/`height`, `decoding="async"`; use lazy loading below the fold.
- Do not preload all 16 assets.
- Preserve white-background / Deep Navy / Aqua visual system and medium-radius card rules.

## Corrections already applied

- Replaced old `心があたたまる` with the brighter regenerated version.
- Added missing `沈む` emotion tile.
- Added `イベント` category fallback, replacing the mistaken duplicate `惹かれる` file in the category set.