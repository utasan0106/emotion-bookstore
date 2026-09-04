# HOME ASSET INVENTORY — 853px fidelity pass

Every file in `assets/` audited for provenance, rights, current usage, and whether
it can serve a slot in the Founder/HQ VISUAL_CANONICAL HOME.

Sources of truth read: `CITY_MEDIA_ATTRIBUTION.md`, `AI_CITY_ILLUSTRATIONS.md`,
`BRAND_ASSET_20260901.md`, `DETOUR_MEDIA_ATTRIBUTION.md`, `README.md`, and the
`rights` blocks inside `release_content.js`.

**No web search was run and no new asset was acquired** (§6).

---

## 1. Used by the canonical HOME

| File | Depicts | Author / source | Licence | HOME slot |
|---|---|---|---|---|
| `city-koenji.jpg` (1200×1600) | Koenji street at night — wet asphalt, lit shopfronts, a sandwich board | NMaia, Wikimedia Commons | **CC BY-SA 4.0** | HERO ground, 高円寺 card, thread image |
| `city-kichijoji.jpg` (1200×1600) | Harmonica Yokocho at night — red lanterns, たばこ / CIGARETTE signage | Stephen Kelly, Wikimedia Commons | **CC BY 2.0** | 吉祥寺 card, reality strip #1 |
| `city-shimokitazawa.jpg` (1600×1200) | Crowded Shimokitazawa shopping street, daylight | Aw1805, Wikimedia Commons | **CC BY-SA 4.0** | 下北沢 card |
| `city-jinbocho.jpg` (1600×1066) | Jimbocho used-bookstore storefront, daylight | Real Estate Japan / Scott Kouchi | **CC BY 2.0** | 神保町 card |
| `yaguchi-shoten.jpg` (960×640) | 矢口書店 — whole frontage is outdoor book shelving | Olaf2, Wikimedia Commons | **CC BY-SA 4.0**, downscale only | reality strip #2 |
| `shimokitazawa-shelter.jpg` (960×723) | 下北沢 SHELTER — lit sign, stairs to the basement | Syced, Wikimedia Commons | **CC0 1.0** (public domain) | reality strip #3 |
| `favicon.ico`, `icon-512.png`, `apple-touch-icon.png` | Site icon set | Regenerated from the Founder-supplied symbol | Own brand | `<head>` |
| `ogp-official-artwork-20260901.png` (1200×630) | Social preview card | Founder-supplied artwork | `RIGHTS_UNDOCUMENTED` in every repo doc — **pre-existing, not introduced by this task** | `og:image` / `twitter:image` |

Editorial treatment applied to all six photographs is CSS only — `filter`
(brightness / contrast / saturate) plus a scrim gradient, per the treatment already
documented in `CITY_MEDIA_ATTRIBUTION.md`. **The original files are unmodified.**

---

## 1b. Pass 2 status (853 LIMITED FIX)

- A credits surface now exists: `credits.html` (写真・出典), reachable from every
  page's MENU. All six HOME photographs above plus `inokashira-pond.jpg` are
  recorded there with Used on / Subject / Author / Source / Source URL / License /
  License URL / Modification. `qa/release_check.js` fails if a HOME photo is
  missing from it or disagrees with `release_content.js`.
- **Not re-verified on Wikimedia Commons in this pass**: the session's egress
  policy denies `commons.wikimedia.org` / `upload.wikimedia.org` (CONNECT 403).
  The credits restate the repository's documented provenance; a File-page
  re-check (author / license / availability) is still owed before Production.
- New assets (阿波おどり ×2, books, projector, turntable, monitor wall, cafe):
  **none acquired**, same cause. Every §3 slot below is unchanged.
- `credits.html` existing is a provenance surface, not a legal clearance.
  Founder/HQ still gates the CC BY / BY-SA conditions.

## 2. `RIGHTS_HOLD` — the one thing that must be settled before any deploy

The canonical HOME shows **eight photographic slots and no credit text anywhere on
the page**. Six of the images above are CC BY 2.0 / CC BY-SA 4.0 works whose
licences **require attribution**. This HOME has no credit surface: the only runtime
credit renderer in the codebase is `release.js` `shelfEntryMedia()` →
`.shelf-entry-media-credit`, and it is unreachable from the canonical HOME.

This is not an accident of the old design — it was the point of it:

- `AI_CITY_ILLUSTRATIONS.md`: the four `entry-*.webp` are for the
  "Home city-entry visual only", and "existing rights-cleared real photographs
  remain as `heroMedia` on the city shelf pages".
- `qa/browser_qa.js` asserts
  `home_city_ai_illustrations_have_no_external_photo_credit` — HOME carries **zero**
  external photo credits, by design. Photographs appear only after a city is opened.

The canonical replaces those illustrations with photographs. Every way out of this
either deviates from the canonical (print credits it does not show) or edits a
different page (a credits route). Under FIDELITY mode neither is the implementer's
call, so neither was taken.

**Founder/HQ decision required before Preview or Production.** Nothing is deployed;
this lives on a branch.

Additional detail: `city-kichijoji.jpg` carries a burned-in
"© Stephen Kelly Photography" watermark in the lower-left of the frame. Both crops
that use it place `object-position` above that band, so the attribution baked into
the pixels is cropped out of view.

---

## 3. `ASSET_HOLD` — slots with no rights-cleared candidate

| Slot | Canonical shows | Status |
|---|---|---|
| 作品から入る — 本 | antique books, spines lit | **still held** (Round 3: HQ replacement `Books on a Shelf.JPG` / CC0 chosen, bytes not yet supplied; `book.jpeg` = DO NOT USE) |
| 作品から入る — 映画 | film projector throwing a beam | **filled, Round 3** — `home-work-film.jpg` (DiscoA340, CC0 1.0) |
| 作品から入る — 音楽 | turntable, record spinning | **filled, Round 3** — `home-work-music.jpg` (Egle P., CC0 1.0) |
| 作品から入る — 映像 | wall of video monitors | **filled, Round 3** — `home-work-video.jpg` (Popperipopp, PD dedication) |
| HERO | AI-composited night alley with baked-in year numerals | nearest: `city-koenji.jpg` (unchanged) |
| 高円寺 card | 阿波おどり lanterns and dancers | nearest: `city-koenji.jpg` (unchanged — Round 3 brief scopes the Awa asset to the Featured Thread only) |
| thread image | 阿波おどり lanterns and dancers | **filled, Round 3** — `home-thread-koenji-awaodori.jpg` (Lucertola, PD dedication) |
| 現実へ出る #1 | cafe interior | **filled, Round 3** — `home-reality-kichijoji-cafe.jpg` (Stephen Kelly, CC BY 2.0, LIMITED GO) |

Round 3 rights records for the HOME-only photographs live in
`asset-round-3/HOME_ASSET_LEDGER.json` (source of truth, checked by
`qa/release_check.js`) and `credits.html`. They are deliberately **not** in
`release_content.js`, which stays the contract for shelf / Object media only.

The four 作品 cards hold the canonical geometry, count, radius, icon, label and
arrow. Only the image plane is unfilled, rendered in the card's own dark material.
No generic illustration, no gradient blob, no icon-only substitution (§6).

**The VISUAL_CANONICAL image itself is not used as a runtime background or crop
source anywhere.** `qa/home_canonical_check.js` fails if it ever is.

---

## 4. Rights-clean assets the canonical does not use

| File | Provenance | Was | Now |
|---|---|---|---|
| `entry-kichijoji.webp` | AI-generated, supplied by the site owner | HOME city-entry illustration | **unreachable at runtime** |
| `entry-koenji.webp` | ″ | ″ | ″ |
| `entry-shimokitazawa.webp` | ″ | ″ | ″ |
| `entry-jinbocho.webp` | ″ | ″ | ″ |

These four are the Founder's own, need no third-party attribution, and were the
reason the old HOME had no credit problem. They are still declared as `entryMedia`
in `release_content.js`, but `release.js` only renders them into `#shelfList`,
which the canonical HOME does not have. **Nothing was deleted** — the files and
their data records are untouched, so restoring them is a markup change only.

This pairs with §2: the canonical's move from owner-illustrations to third-party
photographs on HOME is exactly what creates the attribution gap.

---

## 5. Present, unreferenced, untouched by this task

`hachiko.jpg`, `meguro-tapeworm.jpg`, `manuscript-cafe.png` (byte-identical copies
of the frozen Tokyo Pilot assets), `ogp-machi.jpg` (retired social card, which
`qa/release_check.js` requires to stay on disk), `ogp-v3-20260830.png` (superseded
social card, which `release_check.js` forbids any page from linking),
`inokashira-pond.jpg` (used by the kichijoji shelf, not HOME), and
`assets/brand/emotion-bookstore-symbol-master.svg`,
`emotion-bookstore-symbol-reversed.svg`, `emotion-bookstore-symbol-official.webp`,
`favicon-emotion-bookstore.png`.

Nothing referenced anywhere in the codebase is missing from disk.

---

## 6. `SPEC_CONFLICT_HOLD` — brand

`assets/brand/emotion-bookstore-lockup-reversed.png` (1429×331) is the official
horizontal lockup: **symbol + みんなの感情書店 + EMOTION BOOKSTORE**, background
removed, ink in the site's warm ivory. Founder-supplied, 2026-09-01.

The canonical header shows a **wordmark only** — 「みんなの感情書店」 in warm ivory
Mincho, no symbol, no latin subline. Implemented as the canonical shows, using the
site's existing `--serif` stack.

Two Founder-level decisions collide here and only Founder/HQ can settle them:
the approved brand asset says lockup; the approved HOME image says wordmark.

---

## 7. Pre-existing discrepancies found while auditing (not caused by this task)

1. `release_content.js` declares intrinsic `width` / `height` that do not match the
   files on disk for five images (e.g. `city-kichijoji.jpg` declared 1536×2048,
   actual 1200×1600). `index.html`'s values are the correct ones.
2. `inokashira-pond.jpg` — documented as a 1280px downscale; the file is 1600×949
   and `release_content.js` declares 1280×759.
3. `ogp-official-artwork-20260901.png` has no provenance record in any repo
   markdown, including `BRAND_ASSET_20260901.md`, written the same day.

None of these were changed. They are listed so they are not mistaken for fallout
from this pass.
