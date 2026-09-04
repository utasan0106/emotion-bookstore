# HOME VISUAL CONTRACT — 853px

Source of truth: Founder/HQ-supplied HOME image `文化のつながりを歩く街案内.png`
(853 × 1844 CSS px, deviceScaleFactor 1).

Mode: **FIDELITY**. No redesign, no reinterpretation. Every value below is either
OBSERVED (measured off the canonical), INFERRED (derived from an observed relation),
or UNKNOWN (not decidable from the canonical — listed, not invented).

---

## 0. Reference availability — HOLD

`REFERENCE_FILE_HOLD` — the canonical image was supplied as a **conversation
attachment**, not as a file in the repository or on the capture host. It is
readable by the implementer but there are no pixel bytes on disk. Consequences:

- `HOME_REFERENCE_853.png` cannot be written as an artifact.
- A true pixel `HOME_OVERLAY_DIFF_853.png` / image-diff cannot be computed.
- Comparison in this pass is **measured visual comparison** (geometry read off the
  canonical, then verified against the rendered screenshot), not automated pixel diff.

To lift this hold: commit the canonical PNG to
`experiments/home-visual-fidelity/HOME_REFERENCE_853.png` and re-run the loop.

**Lifted 2026-09-03 (HOME Asset Round 3):** the Founder/HQ bytes are committed at
`experiments/home-visual-fidelity/reference/HOME_REFERENCE_853.png` (sha256
`cc31aef9666dabf2f9a763f8948b67980860e970dba42df0b01ca0e383936625`) and the true
comparison artifacts exist — see `README.md` and `asset-round-3/README.md`.
Every OBSERVED value below was measured off that same image.

---

## 1. Global page

| Property | Value | Status |
|---|---|---|
| Reference viewport | 853 × 1844 | OBSERVED |
| Page horizontal gutter (warm sections) | 32px left / 32px right → content width 789px | OBSERVED |
| Warm sheet ground | `#f2ead8` warm ivory paper | OBSERVED |
| Dark ground (hero + thread panel) | `#0e0f12` → `#131a24` deep cool night | OBSERVED |
| Ink on warm | `#23201b` primary, `#6b6459` secondary | OBSERVED |
| Ivory on dark | `#f2ece0` primary, `#a49c90` secondary | OBSERVED |
| Signal / accent | warm gold `#c2a068` (hero button border, thread pill, node outlines) | OBSERVED |
| Heading typeface | Japanese **Mincho** (serif stack) | OBSERVED |
| Body typeface | Japanese **Gothic** (sans stack) | OBSERVED |
| Total document height | 1844px | OBSERVED |

The existing runtime `--serif` / `--sans` stacks are kept verbatim. No webfont is
added (no new dependency, §9).

**Material rule:** the page is two materials only — *deep night* and *warm paper*.
The warm sheet begins at the hero's lower edge with a **top-only radius**, so the
dark ground shows as two small corner slivers and nowhere else. No third material,
no glass, no gradient blobs.

---

## 2. Section map (fixed order, no additions)

| # | Section | y (top) | y (bottom) | Height | Ground |
|---|---|---|---|---|---|
| 1 | HERO | 0 | 617 | 617 | night photo |
| 2 | 街から入る | 617 | 1030 | 413 | warm |
| 3 | 作品から入る | 1030 | 1262 | 232 | warm |
| 4 | いま辿れるスレッド | 1262 | 1592 | 330 | warm, holds dark panel |
| 5 | 現実へ出る | 1592 | 1844 | 252 | warm |

Hero proportion: **617 / 853 = 0.723** of viewport width. Implemented as
`height: 72.3vw` clamped, not `100vh` — the canonical hero is *not* full-viewport.

---

## 3. HERO

### 3.1 Header (over the photo)
| Element | Geometry | Status |
|---|---|---|
| Brand 「みんなの感情書店」 | x 28, baseline ≈ 44, cap-height ≈ 22px → font-size 23px, Mincho, letter-spacing .06em, colour `#efe4cd` warm ivory | OBSERVED |
| Menu trigger | 3 rules, x 790→822 (w 32), y 27 / 35 / 43, stroke 1.5px, colour `#f2ece0` | OBSERVED |

`SPEC_CONFLICT_HOLD (brand)` — the canonical header shows a **wordmark only**.
The approved runtime brand asset `assets/brand/emotion-bookstore-lockup-reversed.png`
is a **symbol + wordmark + EMOTION BOOKSTORE lockup**. The canonical is implemented
as written (live Mincho wordmark). Founder decision required.

### 3.2 Background
Full-bleed night alley photograph, `object-fit: cover`, `object-position: center`.
Warm shopfront light on the right, cool black upper-left, a bright vertical corridor
down the centre. Legibility scrim: linear gradient, `rgba(8,9,12,.72)` at the left
edge → transparent at ~62% width, plus a vertical `rgba(8,9,12,.55)` → transparent
→ `rgba(8,9,12,.65)` pass.

`ASSET_HOLD (hero)` — no rights-cleared asset in `assets/` matches this frame.

### 3.3 Type
| Element | Copy | Geometry | Status |
|---|---|---|---|
| H1 | 文化の / つながりを、 / 歩く。 | x 32, block y 158→385; font-size **61px**; line-height **74px** (1.21); weight 600; letter-spacing .01em; colour `#f7f3ec`; 3 hard lines | OBSERVED |
| Sub | 街から。作品から。ひとつの痕跡から。 | x 33, baseline ≈ 411; font-size **15px**; sans; colour `#cfc7b8`; letter-spacing .04em | OBSERVED |
| CTA | スレッドを見る → | x 33, y 452, **244 × 52**, radius **4px**, 1px border `rgba(194,160,104,.85)`, transparent fill; label Mincho 15px `#f0e7d6` at x 72; arrow at x 232 | OBSERVED |
| Right note | この先に、/ 物語がある。 | x 690, y 285→330; font-size 13px; line-height 24px; sans; colour `#e6ded0` | OBSERVED |
| Scroll cue | スクロールして、はじまる | centred, baseline ≈ 578; font-size 12px; letter-spacing .12em; colour `rgba(242,236,224,.72)` | OBSERVED |
| Scroll chevron | ∨ | centred, y 590→601, 16px wide, 1.3px stroke | OBSERVED |

Copy note: the sandwich-board reading 「感情書店 KOENJI 2026 / この先に、高円寺にある。」
is **inside the photograph** in the canonical, not runtime text. Not implemented as markup.

---

## 4. 街から入る

| Element | Geometry | Status |
|---|---|---|
| Warm sheet top | y 617, `border-radius: 24px 24px 0 0`, full width | OBSERVED |
| Heading 街から入る | x 37, glyph box y 657→687 → font-size **31px**, Mincho, weight 600, colour `#23201b` | OBSERVED |
| Heading note 街には、文化が息づく理由がある。 | x 258, baseline ≈ 678, font-size 13px, sans, colour `#6b6459` | OBSERVED |
| すべて見る → | right-aligned to x 820, baseline ≈ 678, font-size 13px, colour `#4a443c` | OBSERVED |
| Card row | y 706 → 1017 (**height 311**) | OBSERVED |
| Grid | x 32 → 820, 4 columns, gap **12px**, card width **188px** | OBSERVED |
| Card radius | 8px | OBSERVED |
| Card image | `object-fit: cover`, full card, dark cinematic treatment | OBSERVED |
| Card scrim | transparent at 38% → `rgba(10,10,13,.88)` at bottom | INFERRED |
| City name | x card+14, baseline ≈ 893, font-size **25px**, Mincho, `#f6f2ea` | OBSERVED |
| Question | 3 hard lines, x card+14, y 908→968, font-size **12.5px**, line-height **20px**, `#c8c1b4` | OBSERVED |
| Arrow → | x card+15, baseline ≈ 998, 16px, `rgba(230,222,208,.8)` | OBSERVED |

Card order and copy (fixed, §4):

1. 高円寺 — 踊りは、/ どうやって / 街の文化になった？
2. 吉祥寺 — 音は、/ どうやって / 街を育てた？
3. 下北沢 — 舞台は、/ どうやって / 街を変えた？
4. 神保町 — 本は、/ どうやって / 街の形になった？

---

## 5. 作品から入る

| Element | Geometry | Status |
|---|---|---|
| Heading 作品から入る | x 37, glyph box y 1046→1076 → font-size **30px** | OBSERVED |
| Heading note | 本・映画・音楽・映像… あらゆる作品が、街とつながっている。 x 270, baseline ≈ 1067, 12.5px, `#6b6459` | OBSERVED |
| Card row | y 1104 → 1247 (**height 143**) | OBSERVED |
| Grid | identical to §4: x 32→820, 4 × 188, gap 12, radius 8 | OBSERVED |
| Foot row | icon 16px at x card+14; label at x card+38; arrow right-aligned to card−16; baseline ≈ 1224 | OBSERVED |
| Label | font-size **15px**, Mincho, `#f4f0e8` | OBSERVED |
| Icons | outline line-art: book / film-strip / musical-note / video-camera, 1.4px stroke | OBSERVED |

Entries (fixed): 本 / 映画 / 音楽 / 映像.

This is **not** a category filter UI (§5). Four separate entrances into culture,
same card grammar as the city row.

`ASSET_HOLD (works ×4)` — the canonical shows photographs (antique books, a film
projector, a turntable, video monitors). `assets/` holds no rights-cleared
equivalent. Geometry, card count, radius, foot row and grid are held **unchanged**;
the image plane renders as the dark card material only. No generic illustration,
gradient blob, or icon-only substitution (§6).

**Round 3 status (2026-09-04):** 映画 / 音楽 / 映像 filled with Founder/HQ
rights-cleared photographs (`assets/home-work-film.jpg` / `-music.jpg` / `-video.jpg`,
ledger `asset-round-3/HOME_ASSET_LEDGER.json`). 本 still held — the HQ-chosen
replacement (`Books on a Shelf.JPG`, CC0) has not reached the implementer as bytes.
Geometry unchanged.

---

## 6. いま辿れるスレッド

| Element | Geometry | Status |
|---|---|---|
| Panel | x 25 → 827 (**width 802**), y 1275 → 1567 (**height 292**), radius **12px**, fill `#131a24` | OBSERVED |
| Heading いま辿れるスレッド | x 49, baseline ≈ 1316, font-size **23px**, Mincho, `#ede6da` | OBSERVED |
| Panel note ひとつの痕跡から、物語をたどる。 | right-aligned to x 805, baseline ≈ 1314, 12.5px, `#8e8880` | OBSERVED |
| Thread image | x 44, y 1341, **292 × 180**, radius 6px, 1px border `rgba(194,160,104,.38)` | OBSERVED |
| Right column | starts x 360 | OBSERVED |
| Pill 注目のスレッド | x 360, y 1348, **108 × 22**, radius 3px, fill `#c9a063`, ink `#1a1710`, 11px, letter-spacing .04em | OBSERVED |
| Title 高円寺阿波おどり | x 360, glyph box y 1382→1412 → font-size **30px**, Mincho, `#f0e9dc` | OBSERVED |
| Sub 踊りがつなぐ、街・人・記憶の輪。 | x 360, baseline ≈ 1435, 13px, `#9c958b` | OBSERVED |
| Node chain | x 360 → 810, y 1448 → 1496 (**height 48**) | OBSERVED |
| Node | min-width **66px**, height 48px, radius 999px, 1px border `rgba(200,165,105,.42)`, transparent fill | OBSERVED |
| Node text | 2 centred lines, 10.5px, line-height 15px; line 1 `#a99b84`, line 2 `#e4dcce` | OBSERVED |
| Chain arrow | → 12px, `#7a7266`, 8px gap either side | OBSERVED |
| Link スレッドを読む → | right-aligned to x 806, baseline ≈ 1537, 13px, `#d8cdbb`, arrow ~26px with 14px gap | OBSERVED |

Node sequence (fixed): 街/高円寺 → 出来事/阿波おどり → 人/踊り手たち → 資料/記録と写真 → 現在/つづく祭り.

Cross-media meaning per §5: this is a Cultural Thread whose *first* node happens to
be a city. It is not a city-guide teaser.

`ASSET_HOLD (thread)` — the canonical image is an Awa Odori lantern/dancer frame.
Nearest rights-cleared asset is `assets/city-koenji.jpg` (Koenji night street,
CC BY-SA 4.0, NMaia) — correct city, different subject.

**Round 3 status (2026-09-04):** filled with `assets/home-thread-koenji-awaodori.jpg`
(Lucertola, PD dedication) — Awa Odori dancers on the Koenji street. Geometry unchanged.

`ROUTE_HOLD (thread)` — no runtime route exists for a 高円寺阿波おどり Cultural
Thread page. 「スレッドを読む」 and the hero CTA 「スレッドを見る」 are rendered as
**non-navigating** elements. No substitute destination is invented (§8).

---

## 7. 現実へ出る

| Element | Geometry | Status |
|---|---|---|
| Heading 現実へ出る | x 37, glyph box y 1616→1650 → font-size **31px** | OBSERVED |
| Body line 1 | 物語の終着点は、いつも現実のどこかにある。 x 33, baseline ≈ 1680 | OBSERVED |
| Body line 2 | お店、場所、イベント、人に会いに行く。 x 33, baseline ≈ 1706 | OBSERVED |
| Body type | font-size **13.5px**, line-height **26px**, sans, `#5c554b` | OBSERVED |
| Button スポットを探す ⌖ | x 33, y 1746, **212 × 48**, radius 3px, fill `#1e1c19`, label Mincho 14px `#f0e9dc`, pin glyph right at x ≈ 215 | OBSERVED |
| Photo strip | y 1620 → 1806 (**height 186**), x 333 → 845, 3 items, gap 12 → item width **162px**, radius 4px | INFERRED |
| Page bottom | 1844 (38px warm below the strip) | OBSERVED |

Strip note: in the canonical the third photo runs to (or just past) the right edge.
Read here as a 3-up grid whose right margin is 8px rather than the 32px used
elsewhere. Implemented **without** page-level horizontal overflow. Marked INFERRED —
if the intent is a scroll rail, this is the one value to re-check with Founder/HQ.

`ROUTE_HOLD (spots)` — no runtime route exists for 「スポットを探す」. Rendered as
non-navigating.

Photo slots — best available rights-documented matches (all three verified against
`CITY_MEDIA_ATTRIBUTION.md` and the `rights` blocks in `release_content.js`):
1. cafe / 店 → `assets/city-kichijoji.jpg` — Harmonica Yokocho, Stephen Kelly, **CC BY 2.0**
   — **Round 3 (2026-09-04):** replaced by `assets/home-reality-kichijoji-cafe.jpg`
   (tea shop / cafe front in Kichijoji, Stephen Kelly, **CC BY 2.0**, LIMITED GO).
2. bookstore → `assets/yaguchi-shoten.jpg` — 矢口書店, Olaf2, **CC BY-SA 4.0**, downscale only
3. live venue → `assets/shimokitazawa-shelter.jpg` — 下北沢 SHELTER, Syced, **CC0 1.0**, downscale only

---

## 7b. RIGHTS_HOLD — attribution has nowhere to go on this HOME

The canonical HOME shows **eight photographic slots and no credit text anywhere**.
Six of the images this implementation puts in those slots are third-party
CC BY 2.0 / CC BY-SA 4.0 works whose licences **require attribution**.

The previous HOME did not have this problem: it used the four Founder-supplied,
rights-clean AI illustrations (`assets/entry-*.webp`), and `qa/browser_qa.js`
asserts exactly that — `home_city_ai_illustrations_have_no_external_photo_credit`.
That was a deliberate editorial decision: photographs appear only *after* a city
is opened, where `release.js` renders `.shelf-entry-media-credit`.

Putting CC BY / CC BY-SA photographs on a HOME that has no credit surface is a
licence problem, not a visual one, and it cannot be resolved inside FIDELITY mode:
every available fix either deviates from the canonical (add credits) or changes a
different page (a credits route). Founder/HQ decision required **before any
Preview or Production deploy**. Nothing here is deployed.

Related: `assets/city-kichijoji.jpg` carries a burned-in
"© Stephen Kelly Photography" watermark in the lower-left of the frame. Both crops
that use it (city card, reality strip) place `object-position` above that band, so
the only attribution currently attached to the pixels is cropped out of view.

## 8. No footer

The canonical page ends at 1844px with warm paper. There is no site footer,
no affiliate disclosure, no repeated brand lockup. The canonical HOME carries
**no affiliate link**, so the Amazon Associates disclosure has no link to disclose
on this page (it remains on the shelf pages that do carry those links).

---

## 9. Explicitly UNKNOWN (not invented)

1. Hero photograph — exact frame, and whether the year numerals (1918 / 1957 / 1960 /
   2026 / 2029) are baked into the image or are runtime elements. Treated as baked.
2. Behaviour of 「すべて見る」 for the city row — no all-cities index exists.
3. Whether 作品から入る entries navigate to the existing `index.html?category=…`
   taxonomy or to future work-type Threads. Not wired either way.
4. Hover / focus / active treatments — the canonical is a single static frame.
   Existing focus-visible tokens are reused unchanged (§8 accessibility).
5. Motion. Out of scope this pass (§7).
6. Any viewport other than 853 (§2, §18).
