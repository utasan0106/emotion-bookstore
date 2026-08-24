# みんなの感情書店 V3 — Visual System Canonical V1

Status: **FOUNDER DIRECTION LOCKED / IMPLEMENTATION READY AFTER FOUNDER UX PATCH GO**  
Date: 2026-08-24 JST

## 1. Goal

V3を「個人開発にしては良い」ではなく、初見で独立したConsumer Productに見える水準へ引き上げる。

目指す印象:

- 親しみやすい
- 少しときめく
- 次の行動へ進みたくなる
- 現代的
- 見やすさ優先
- 世界観はUIの後ろから効かせる

避ける印象:

- 子どもっぽい / かわいすぎる
- 高級すぎて近寄りがたい
- 文学的・文化的すぎて難解
- セルフケア / メンタルアプリ
- 無機質なAIサービス
- 情報過多
- 不揃いな個人開発UI
- EC / 広告サイト

## 2. Color System

V1 implementation candidate tokens. Preview QAではWCAG contrastと実機視認性のための微調整のみ許容。

- `--bg`: `#FFFFFF`
- `--surface-subtle`: `#F5F8FA`
- `--navy`: `#17324D`
- `--ink`: `#1F2A33`
- `--slate`: `#76818A`
- `--aqua`: `#46B8C8`
- `--aqua-soft`: `#E8F6F8`
- `--border`: `#E5EAF0`
- `--saved`: `#E45F64`

Usage:

- Deep Navy: logo, major headings, Primary CTA
- Aqua: selection state, current position, lightweight emphasis
- Coral Red: saved heart only (except destructive warnings if ever introduced)
- White: dominant background
- Subtle blue-gray: only where grouping needs a second plane
- Do not add decorative colors without a semantic role

## 3. Typography

Principle: **Editorial moments = Serif / Utility = Sans**.

### Serif
Use only for:

- Entrance hero copy
- Emotion shelf names
- Cultural object / work titles
- selected high-value editorial headings

### Sans
Use for:

- body copy
- descriptions
- buttons
- navigation
- practical facts
- prices / hours / access
- chips / labels / status
- form controls

### Scale target

Mobile:

- Body: 15–16px / line-height 1.65–1.8
- Utility labels: 12–14px
- Card title: 18–20px
- Section heading: 22–26px
- Hero: responsive; avoid oversized billboard treatment

Desktop:

- Body: 16–17px / line-height 1.7–1.85
- Long text max line length: roughly 40–45 Japanese full-width characters
- Scale up editorial headings, not utility text

## 4. Spacing

Base scale:

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`

- Information density: medium
- Keep enough white space for clarity but do not create sparse prototype screens
- Related elements use 8–16px gaps
- Section transitions generally 32–48px mobile, 48–64px desktop

## 5. Radius & Elevation

- Card: 12–16px
- Large panel: 16–20px
- Button: 12–16px
- Pill shape: only tags / small state indicators

Elevation:

- White cards may use a very subtle shadow
- Buttons and chips remain mostly flat
- Avoid floating-everything aesthetics

Shadow target:

`0 4px 16px rgba(23, 50, 77, 0.06)`

## 6. Icons

- Medium line weight
- Back / menu / map / calendar / share / save use one visual family
- Saved heart becomes filled Coral Red
- State must never rely on color alone; pair icon state with text / aria state

## 7. Motion

- Short fade / slight slide only
- Small saved-heart feedback
- Desktop hover can lift / tint minimally
- No large parallax / decorative motion
- `prefers-reduced-motion` must disable non-essential movement

## 8. Entrance

### Mobile

- Small logo + right-side MENU header
- First view should be simple
- Hero image visually secondary
- Main action should be obvious
- Brand/world-building content should not crowd first viewport

### Desktop

- Top header, no persistent sidebar
- Left: logo
- Right: Home / Saved / Menu (search only if genuinely needed)
- Hero: medium height
- Image: roughly 30–40% visual weight
- Copy + CTA remains primary
- Emotion shelves should become visible within same viewport or shortly below

## 9. Mobile Navigation

Hybrid navigation:

Header:

- small logo
- MENU

Bottom navigation:

- Home
- Saved
- Menu

Only three high-frequency destinations. Do not turn bottom navigation into a feature index.

## 10. Emotion Shelf Grid

Mobile:

- Fixed 2-column grid
- Each card = photo/visual + shelf name + one short line
- Remove multi-word explanatory lists from card surface
- Natural photo brightness + restrained navy overlay for text legibility

Desktop:

- Responsive grid
- 1200px class: about 3 columns where card width demands it
- 1440px+: about 4 columns
- Content stays within a centered max-width

### Tile direction

**Photo-based + geometric overlay + text**

Not watercolor-only.

Mood guide:

- 心が弾む: bright / open / airy
- 心があたたまる: warm / domestic / gentle light
- 惹かれる: detail-oriented / visually intriguing
- 沈む: calm / heavy / blue-gray / still
- ざわつく: unsettled / fragmented
- ぶつかる: sharp / intersecting / energetic
- 身を引く: distance / retreat / spacious
- まだ名前がない: ambiguous / soft / pre-verbal

Approved asset pack:

`V3_VISUAL_ASSET_PACK_READY_20260824.zip`

Runtime derivatives should be used rather than multi-megabyte source PNGs.

## 11. Cultural Object / Experience Cards

If rights-clear real media is available:

- Visual ~60%
- Text ~40%

If real media is unavailable:

- Visual ~50%
- Text ~50%
- Use approved abstract category fallback
- Never imply fallback is a real photograph of the object

List cards should show only information needed to decide whether to open Detail.

## 12. Category Fallback

Series:

- Book
- Film
- Music
- Place
- Exhibition
- Dining
- Event
- Activity

Direction:

- abstract editorial graphic
- same navy / aqua / white system
- no fake product photography
- no baked-in UI text

## 13. Detail Information Architecture

Canonical visual order:

1. Visual
2. Object Identity / Title
3. FIRST PULL
4. `なぜ、この棚に？`
5. Official Fact / Practical Truth
6. Action

### FIRST PULL

- 1–2 short sentences
- concrete
- object-side observation
- Human-approved static data only
- no generated fallback

### Editorial Why

- 2–4 sentences
- clear enough to explain why this object is on this shelf
- not an essay
- not a therapeutic promise

### Official Fact

Hybrid presentation:

1. 1–2 sentence source-grounded summary
2. structured practical fields beneath it

Examples:

- hours
- price
- area
- dates
- reservation
- runtime
- official viewing route

## 14. Action Hierarchy

### Primary

- Deep Navy fill
- most important real-world action (usually official site / official route)

### Secondary

- White + Navy border
- e.g. choose date / plan

### Utility

- smaller
- map / save / share
- still visibly part of same action family

Do not leave one action as an unstyled naked text link while the others are buttons.

## 15. Saved Experience

Saved state:

- Coral Red filled heart
- label: `保存済み`
- `aria-pressed=true`

Saved list initial design:

- image
- title
- category
- short line
- no saved date at first

Add category filtering only after saved-item volume creates evidence for it.

## 16. Image Performance

Source assets are preserved unchanged.

Runtime rules:

- use derived WebP/AVIF where appropriate
- explicit width/height
- `decoding="async"` where useful
- lazy load below-fold visuals
- do not preload all tiles/fallbacks
- only true LCP/hero may receive high fetch priority
- avoid duplicate source branches that serve identical bytes

Current prepared runtime tile/fallback derivatives are 960×720 WebP and generally tens of KB rather than multi-MB PNGs.

## 17. Font Performance

Current multi-megabyte Japanese TTF delivery must not remain the final performance architecture.

Rules:

- no third-party runtime font request
- preserve self-hosted/privacy-first behavior
- prefer legitimate self-hosted WOFF2 / subset derivatives if license and source rules permit
- maintain functional system fallbacks
- font optimization must not create visible layout jumps

## 18. Responsive Acceptance

Mandatory viewports:

- Mobile: 390 / 430
- Desktop: 1200 / 1440

Review:

- no horizontal overflow
- consistent typography
- consistent action hierarchy
- centered desktop layouts
- long text bounded
- navigation reachable
- saved state clear
- empty states coherent
- image loading stable

## 19. Protected Product Contracts

Visual work must preserve accepted UX behavior and core V3 contracts:

- finite 0/1/2/3
- no force-fill
- no-emotion route remains reachable
- FIRST PULL Human-reviewed static only
- Official Fact / Editorial Why separation
- Context remains feasibility lens, not taste profiling
- Interested core schema remains stable unless separately authorized
- no popularity/commercial ranking
- no external AI
- no account/cloud
- private content boundaries
- main / Production / primary domain / GA4 remain reserved gates

## 20. Release Discipline

Visual System V1 starts only after Founder UX Patch is independently accepted and its End HEAD is frozen.

Implementation branch must be fresh and non-main.

Visual System work does not automatically proceed to:

- Content Mount
- Sprint2/S2
- main merge
- Production deploy
- Domain cutover

Final Visual System verdict:

- `V3_VISUAL_SYSTEM_V1_GO`
- `V3_VISUAL_SYSTEM_V1_LIMITED_FIX`
- `V3_VISUAL_SYSTEM_V1_HOLD`
