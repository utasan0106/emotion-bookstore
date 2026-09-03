# HOME DIFFERENCE INVENTORY — 853px

Comparison of `HOME_CURRENT_853.png` (this branch) against the Founder/HQ
VISUAL_CANONICAL, using the measured targets in `HOME_VISUAL_CONTRACT.md`.

Correction cycles run: **3** (initial build → geometry correction → material/tone
correction). Every cycle re-rendered in a real browser at 853 CSS px,
deviceScaleFactor 1.

---

## Method, and its one limitation

The canonical was supplied as a **conversation attachment**. It exists nowhere on
disk — not in the repo, not on the capture host. So the loop was run as:

1. measure the canonical → `HOME_VISUAL_CONTRACT.md` (rect targets, type sizes, colours)
2. implement
3. real-browser render at 853 → `HOME_CURRENT_853.png`
4. read back every rect via `getBoundingClientRect` and diff against the contract
5. read back the rendered screenshot and compare it against the canonical by eye
6. root-cause fix in the §12 order, re-render

Step 4 is exact. Steps 5–6 are a measured visual comparison, **not** an automated
pixel diff — that is blocked by `REFERENCE_FILE_HOLD` (see below).

---

## Geometry — every contract target matched exactly

Read from the live DOM at 853 × 1844, deviceScaleFactor 1:

| Element | Canonical target | Rendered | Δ |
|---|---|---|---|
| document | 853 × 1844 | 853 × 1844 | **0** |
| HERO | y 0, h 617 | 0 / 617 | 0 |
| H1 block | x 32, y 147, h 222 (61px / 74px × 3) | 32 / 147 / 222 | 0 |
| hero sub | y 394 | 394 | 0 |
| hero CTA | x 32, y 452, 244 × 52 | 32 / 452 / 244 × 52 | 0 |
| hero aside | x 690, y 281 | 690 / 281 | 0 |
| warm sheet | y 617, radius 24 24 0 0 | 617 | 0 |
| city grid | x 32, y 706, 789 × 311 | 32 / 706 / 789 × 311 | 0 |
| city card | 188 wide, gap 12, radius 8 | 188.3 / 12 / 8 | +0.3 |
| city name | y 870 (baseline ≈ 893) | 870 | 0 |
| city question | y 909, h 60 (3 × 20) | 909 / 60 | 0 |
| city arrow | y 983, h 16 | 983 / 16 | 0 |
| work grid | x 32, y 1104, 789 × 143 | 32 / 1104 / 789 × 143 | 0 |
| thread panel | x 25, y 1275, 802 × 292 | 25 / 1275 / 803 × 292 | +1 w |
| thread image | x 46, y 1341, 292 × 180 | 46 / 1341 / 292 × 180 | 0 |
| pill | x 360, y 1348, 108 × 22 | 360 / 1348 / 108 × 22 | 0 |
| thread title | x 360, y 1382, 30px | 360 / 1382 / 30 | 0 |
| node chain | x 360, y 1448, h 48, 5 nodes | 360 / 1448 / 48 / 5 | 0 |
| reality section | y 1592, h 252 | 1592 / 252 | 0 |
| photo strip | x 333, y 1620, 512 × 186, 3 × 162.7 | 333 / 1620 / 512 × 186 | 0 |
| spots button | x 32, y 1746, 212 × 48 | 32 / 1746 / 212 × 48 | 0 |

`HOME_OVERLAY_DIFF_853.png` draws these target rectangles onto the render.

---

## BLOCKER — 0

- section 欠落: none. All 5 canonical sections present.
- section 順違い: none. HERO → 街から入る → 作品から入る → いま辿れるスレッド → 現実へ出る.
- hero 構造が別物: no. Photo ground, 3-line Mincho H1, sub, outlined gold CTA,
  right-hand aside, centred scroll cue — all present at canonical positions.
- warm/dark 構造が別物: no. Two materials only; warm sheet begins at the hero edge
  with a top-only 24px radius.
- reference の再解釈: none. No section, card, pill, badge or control was added.
- wrong font family: no — see FONT STATUS.
- major runtime breakage: none. 0 console errors, 0 page errors, 0 broken images,
  0 external hosts, 0 iframes, no horizontal overflow (`scrollWidth === 853`).

## MAJOR — 0

Every MAJOR-class dimension in §11 was measured, not eyeballed:

- hero proportion: exact (617 / 853).
- grid / card geometry: exact (188 × 311 and 188 × 143, gap 12, radius 8).
- heading wrap: every canonical hard line break is authored as a `<span>`; nothing
  reflows. H1 3 lines, city questions 3 lines each, reality lead 2 lines.
- image crop: all `object-fit: cover` with the object-position that reproduces the
  canonical framing.
- spacing / rhythm: all section tops and card tops land on the canonical y values.
- dark / warm material: matched (see cycle 3 below).
- major asset mismatch: **reported separately as ASSET_HOLD**, per §15.

## MINOR

| # | Item | Δ | Note |
|---|---|---|---|
| 1 | Section head note x-position | +6 / −6 px | Canonical puts 街には… at x≈258 and 本・映画… at x≈270, which no single column value satisfies. Fixed 232px column → 264. |
| 2 | Thread panel width | +1 px | 803 vs 802; panel is `padding-inline: 25px` on 853. |
| 3 | City card width | +0.3 px | Sub-pixel from `repeat(4, 1fr)` over 789. |
| 4 | Heading ink top | ±2–5 px | 31px Mincho ink height read off the canonical is ±3px reliable; the card/grid rects it feeds were prioritised instead. |
| 5 | Hero CTA arrow | ≈ +6 px right | Canonical arrow ≈ x 238; rendered ≈ 244. |

## Correction cycles

**Cycle 1 — build to contract.** Geometry within a few px everywhere; document
1822 vs 1844.
**Cycle 2 — root-cause geometry.** All residual drift traced to three causes, not
patched locally: (a) `.hc-thread-pill` was `inline-flex` inside a `<p>`, so a line
box added ~3.5px that propagated through every element below it → made it a
block-level flex container; (b) section head→grid gaps were tuned on the wrong
anchor → re-derived from the card-top rects; (c) the city card text block was
bottom-anchored 4px too low → `bottom: 14px → 18px`. Result: all rects exact,
document exactly 1844.
**Cycle 3 — material.** The four city photographs and the reality strip read too
bright against the canonical's unified night tone. Corrected at the source of the
treatment (one `filter` + one scrim gradient per family, not per card):
`brightness .62 → .48`, scrim top `.10 → .30`. Thread image raised to `.94` so it
holds its place inside the navy panel as it does in the canonical. Also fixed the
scroll chevron, which was rendering as a lopsided check mark from a stray `skew()`.

No local margin hacks were stacked; every fix in cycle 2 and 3 changed one
declaration at the root of the problem.

---

## Held separately (not counted as BLOCKER / MAJOR, per §6 and §15)

### `REFERENCE_FILE_HOLD`
The canonical exists only as a conversation attachment. Therefore
`HOME_REFERENCE_853.png` **is not in this folder** and no pixel image-diff was
produced. Nothing was fabricated to stand in for it. To lift: commit the canonical
PNG here and re-run the loop.

### `ASSET_HOLD` — Production rights-cleared imagery is short
| Slot | Canonical shows | Shipped | Gap |
|---|---|---|---|
| HERO | AI-composited night alley with baked-in year numerals and a 感情書店 KOENJI 2026 sandwich board | `city-koenji.jpg` | Different frame; correct city and correct night material |
| 高円寺 card | 阿波おどり lanterns and dancers | `city-koenji.jpg` | Correct city, different subject |
| 吉祥寺 card | green leafy street, daylight | `city-kichijoji.jpg` | Correct city, night alley instead |
| 下北沢 card | night street with signage | `city-shimokitazawa.jpg` | Correct city, daylight source darkened by CSS |
| 神保町 card | dark interior bookshelves | `city-jinbocho.jpg` | Correct city, daylight storefront darkened by CSS |
| 作品 ×4 | antique books / film projector / turntable / video monitors | **nothing** | No rights-cleared candidate exists |
| thread image | 阿波おどり | `city-koenji.jpg` | Correct city, different subject |
| reality ×3 | cafe / bookstore aisle / live venue | `city-kichijoji.jpg`, `yaguchi-shoten.jpg`, `shimokitazawa-shelter.jpg` | Subject-accurate; all three rights-documented |

The four 作品 cards keep the canonical geometry, count, radius, icon, label and
arrow exactly. Only the image plane is empty, rendered in the card's own dark
material. No generic illustration, gradient blob, or icon-only substitution (§6).

### `RIGHTS_HOLD` — needs a Founder decision before any deploy
The canonical HOME shows eight photographic slots and no credit text. Six of the
images placed there are CC BY 2.0 / CC BY-SA 4.0 works that **require**
attribution, and this HOME has no credit surface — `release.js`'s
`.shelf-entry-media-credit` renderer is unreachable from it.

The previous HOME avoided this deliberately, using the four Founder-supplied
rights-clean AI illustrations; `qa/browser_qa.js` encodes that intent as
`home_city_ai_illustrations_have_no_external_photo_credit`. Every available fix
either deviates from the canonical or edits another page, so neither was taken.
Detail in `HOME_ASSET_INVENTORY.md`.

### `ROUTE_HOLD` — 8 canonical elements have no runtime destination
`スレッドを見る`, `すべて見る`, 本 / 映画 / 音楽 / 映像, `スレッドを読む`, `スポットを探す`.
All are rendered as non-navigating `<p>` / `<div>` carrying `data-route-hold`, and
`qa/home_canonical_check.js` fails if any of them gains an `href`, an `onclick`, or
becomes an `<a>` / `<button>`. No substitute destination was invented (§8).

The existing 5-category taxonomy (`飲食・喫茶 / 体験・おでかけ / 本・古書 / 音楽・ライブ /
映画・演劇`) is deliberately **not** wired to 本 / 映画 / 音楽 / 映像 — a different
taxonomy, and there is no 映像 category at all.

### `SPEC_CONFLICT_HOLD` — brand
The canonical header is a **wordmark only**. The approved runtime asset
`assets/brand/emotion-bookstore-lockup-reversed.png` is a symbol + wordmark +
EMOTION BOOKSTORE lockup. Implemented as the canonical shows (live Mincho
wordmark). Founder/HQ owns Brand — this is theirs to settle, not the implementer's.

---

## Not evaluated in this pass (§18)

390 / 768 / 1024 / 1440 responsive, motion, hover and active states, the
高円寺 / 吉祥寺 / 下北沢 / 神保町 Thread runtimes, Book / Film / Video Threads,
Preview switch, Production deploy.
