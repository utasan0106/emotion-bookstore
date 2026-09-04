# HOME VISUAL FIDELITY — 853px

Review artifacts only. **Not runtime.** Excluded from the delivery surface via
`/experiments/` in `.vercelignore`.

| File | What it is |
|---|---|
| `HOME_VISUAL_CONTRACT.md` | Every value measured off the VISUAL_CANONICAL, split OBSERVED / INFERRED / UNKNOWN |
| `HOME_DIFFERENCE_INVENTORY.md` | BLOCKER / MAJOR / MINOR classification, the 3 correction cycles, and the holds |
| `HOME_ASSET_INVENTORY.md` | Provenance and rights for every file in `assets/`, and which canonical slot each can serve |
| `HOME_BASELINE_853.png` | `origin/main` HOME at 853 px — 853 × 3788 |
| `HOME_CURRENT_853.png` | This branch at 853 px — 853 × 1844 |
| `HOME_SIDE_BY_SIDE_853.png` | Baseline and current, same scale, same width |
| `HOME_OVERLAY_DIFF_853.png` | Current render with the Visual Contract's target rectangles drawn on it (pass 1, before the reference existed) |
| `reference/HOME_REFERENCE_853.png` | **The Founder/HQ canonical bytes** (Round 3, sha256 `cc31aef9…`) |
| `HOME_TRUE_SIDE_BY_SIDE_853.png` | Canonical and current render, same size, true bytes on both sides (Round 3) |
| `HOME_TRUE_OVERLAY_853.png` | 50 / 50 blend of canonical over current (Round 3) |
| `HOME_TRUE_PIXEL_DIFF_853.png` | Per-pixel absolute difference, ×3 amplified (Round 3) |
| `tools/capture_home_853.js` | Renders HOME at 853 × 1844 in one viewport and reports the platform font of every text probe over CDP |
| `tools/true_compare.py` | Writes the three TRUE artifacts and prints MAE per section |
| `asset-round-3/` | HOME Asset Round 3 — supply record, `HOME_ASSET_LEDGER.json` (rights source of truth for HOME-only photos), `HOME_CURRENT_853_R3_FINAL.png` and the `*_R3_FINAL` true side-by-side / overlay / pixel diff after the asset insertion, holds |

## Pass 2 — ASSET / RIGHTS / QA LIMITED FIX (this branch, HEAD+1)

Geometry from pass 1 is kept byte-for-byte (every contract rect re-read at
853 × 1844: hero 0/0/853/617, CTA 32/452/244×52, city grid 32/706/789×311,
work grid 32/1104/789×143, thread 25/1275/803×292, strip 333/1620/512×186,
spots 32/1746/212×48; document exactly 853 × 1844). What changed:

| Item | State |
|---|---|
| HERO cultural trace | **added** — static inline SVG (`.hc-hero-trace`), one 1px ivory line + 4 gold dots + the four Founder/HQ evidence-cleared Koenji years `1957 / 1961 / 1963 / 2026`. `pointer-events: none`, `aria-hidden`, no animation, sits between the photo scrim and the text (z 1 < 2). No other year, no captions. |
| 高円寺 card / Featured Thread (阿波おどり) | **ASSET_HOLD — network** — the egress policy of this session denies `commons.wikimedia.org` and `upload.wikimedia.org` (CONNECT 403, also via WebFetch), so neither File page could be verified nor a byte fetched. Nothing was substituted. |
| 作品から入る ×4 | **ASSET_HOLD — network** — same cause. Cards keep canonical geometry with the dark image plane. No gradient / blob / illustration. |
| 現実へ出る #1 (cafe) | **ASSET_HOLD — network** — same cause; `city-kichijoji.jpg` (Harmonica Yokocho, a gathering alley) stays. #2 `yaguchi-shoten.jpg` and #3 `shimokitazawa-shelter.jpg` kept as the brief allows. Alt text names only what the photos actually show. |
| Rights surface | **`credits.html` added** — 写真・出典. Reachable from the MENU of every page (index / shelf / suggest / data / credits). Records Used on / Subject / Author / Source / Source URL / License / License URL / Modification for all 7 third-party photographs in the site (6 on HOME + 井の頭池 on the kichijoji shelf). CC0 recorded the same way. `qa/release_check.js` cross-checks author / license / URLs against `release_content.js`. File pages could **not** be re-fetched from this session (egress) — the entries restate the repo's documented provenance (`CITY_MEDIA_ATTRIBUTION.md`, `release_content.js` rights, both dated 2026-09-01 / 2026-08-28). |
| Dead HOME anchors | **0** — `#by-kind` → `#hc-works` (作品から入る), `#weekly-detour` → `#hc-thread` (いま辿れるスレッド) in shelf / suggest / data menus and `growth-improvements.js` (also `#weekly-video-title` → `#hc-works`, and saved 気になる records with retired hrefs are re-pointed at render time only — storage untouched). `release_check.js` now fails on any `index.html#id` whose id does not exist. |
| MENU same-page anchor | `release.js` closes the dialog when a link inside it targets the current document, so `#hc-works` from HOME lands on the section instead of leaving the modal open. |
| QA migration | `qa/release_check.js`, `qa/ga4_v3_client_selftest.js`, `qa/browser_qa.js` migrated from the old HOME (今日は、どの街へ。／種類から見る／今週の寄り道／週間動画／AI city illustration／`.shelf-tagline`) to the canonical contract. `release_check` now runs `home_canonical_check.js` as a sub-gate. `browser_qa` gained a `home853` block (geometry rects, 5 sections, wordmark header, 4 cities in canonical order, 4 route-held works, 5 nodes, 8 non-navigating holds, trace years, reduced-motion = 0 animations, 0 external, menu anchor behaviour) and a `credits` block at 390 / 1440. Non-853 widths for HOME are reported **NOT OBSERVABLE** (Founder/HQ deferred 390 / 1024 / 1440), never silently passed. |
| Capture host font | `fonts-noto-cjk` installed and `/etc/fonts/local.conf` maps the shipped stacks → Noto Serif CJK JP / Noto Sans CJK JP (capture host only). CDP `CSS.getPlatformFontsForNode` confirms every `--serif` node rasterises in **Noto Serif CJK JP** and every `--sans` node in **Noto Sans CJK JP**, including the SVG year numerals. |
| TRUE pixel comparison | **REFERENCE_FILE_HOLD** — see `reference/README.md`. The canonical reached this session only as an inline conversation image (no bytes on disk, none in `/mnt/attach`, none in Drive). `tools/true_compare.py` is committed and proven on a stand-in pair in scratch space; it exits 2 and writes nothing when the reference is absent. Drop the PNG into `reference/` and run it to get `HOME_TRUE_SIDE_BY_SIDE_853.png` / `HOME_TRUE_OVERLAY_853.png` / `HOME_TRUE_PIXEL_DIFF_853.png`. No image was fabricated to stand in for it. |

Review shots added: `CREDITS_390.png` (credits page, full height) and
`MENU_CREDITS_390.png` (MENU open, showing 写真・出典).

## `HOME_REFERENCE_853.png` — present since Round 3

Pass 1 and pass 2 ran without the canonical bytes (the image had only reached
the implementer as an inline conversation attachment), so `HOME_OVERLAY_DIFF_853.png`
is a rect overlay, not an image diff. On 2026-09-03 Founder/HQ supplied the PNG
with a checksum manifest; it is committed at
`reference/HOME_REFERENCE_853.png` and the true comparison now exists:

| | MAE / 255 (2981ad76 render vs canonical) |
|---|---|
| overall | 30.4 |
| HERO | 26.4 |
| 街から入る | 28.5 |
| 作品から入る | 25.0 |
| いま辿れるスレッド | 37.0 |
| 現実へ出る | 39.8 |

The residual is concentrated in the photographic slots that are still
`ASSET_HOLD` (thread image 51.6, 現実へ出る strip 62–70) and in glyph outlines
(the canonical was rasterised with a different Mincho / Gothic than the
capture host's Noto CJK). Geometry and section order coincide. Details and
per-slot numbers: `asset-round-3/README.md`.

## How to reproduce the capture

```sh
python3 -m http.server 8899 --bind 127.0.0.1     # from the repo root
```

Or run `NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_853.js --out <png>`,
which does all of the below and prints the platform font per text probe.

Then render at viewport 853 × 1844, `deviceScaleFactor: 1`, in a single viewport —
**not** a scrolling full-page capture. Chromium's full-page stitching intermittently
drops decoded images from the lower part of a long page; two photographs in
現実へ出る came back blank that way and were fine on re-capture. Size the viewport to
`document.documentElement.scrollHeight` first, then screenshot.

## Font gate

The product ships a system font stack targeting macOS / iOS / Windows / Android and
loads no webfont. A stock Linux capture host has no Japanese Mincho, so
`document.fonts.check` lies (it returns `true` for any resolvable generic) and
Chromium silently rendered every Japanese glyph in **WenQuanYi Zen Hei**, a Chinese
sans.

Verified instead with CDP `CSS.getPlatformFontsForNode`, which reports the family
actually used to rasterise. `/etc/fonts/local.conf` on the capture host maps the
stack's declared families onto the packaged Noto CJK faces and rejects WenQuanYi
for Japanese. This changes the **capture host only** — no product CSS was touched.

Result: `--serif` elements rasterise as **Noto Serif CJK JP** and `--sans` as
**Noto Sans CJK JP**. Both are named members of the shipped stacks (Google
publishes them as "Noto Serif JP" / "Noto Sans JP"), so this is a stack member, not
a fallback.

## Static gate

```sh
node qa/home_canonical_check.js
```

Verifies the new canonical contract: 5 sections in order, exact core copy, the 4
`.shelf-entry` links GA4 depends on, the site-menu hooks, no dead anchors, every
`ROUTE_HOLD` element non-navigating, zero external hosts, zero iframes, every asset
present on disk, and the HOME CSS block fully scoped inside `.home-canonical`.

It does **not** replace `qa/release_check.js`. That gate encodes the previous HOME
and now reports 15 failures against it — which of those the canonical supersedes is
a Founder/HQ decision, so it was left untouched rather than rewritten to match this
implementation.
