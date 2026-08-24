# V3 Post-GO Visual Consolidation — Evidence (2026-08-25)

Bounded presentation-only closure pass on the accepted Enterprise Baseline.
Start HEAD: `d958bd9c8334ae67a9c96eb91e3cccaa345682b6`
Branch: `claude/v3-visual-enterprise-baseline-20260825` (unchanged)

## Scope (presentation only)

1. Home brand visual: the approved Emotion Bookstore world-building illustration
   (`assets/canonical-m01-w01/w01_hero.webp`, existing repository asset, approved alt copy)
   replaces the photographic tile inside the unchanged enterprise cover frame.
   Photo-era tint/overlay removed; native 941:680 ratio, hairline edge, aqua offset plate kept.
   Preload updated to the same asset. No new imagery, no layout restoration.
2. Saved: library-utility grammar — category chip, serif title, tighter rows; dialog
   hierarchy (eyebrow/title/note); empty state = title → one line → one action
   (「感情の棚をのぞく」 → existing shelf route). Existing data only; no tags/history/sync.
3. Factual time/period readability: dt/dd typography for existing facts
   (時間/入場/期間/アクセス etc.) with tabular numerals; plan-saved date summary emphasized.
   No calendar browsing/navigation/filters/state added.
4. Empty states: zero state (kept from baseline pass) + Saved empty now follow
   title → explanation → one useful action; no large empty containers.
5. Cards: strict Japanese line breaking on titles; stable ratios/radius/shadow unchanged.
6. Help/Flow: larger settled titles on desktop; architecture unchanged.
7. Video: poster-first presentation kept as shipped; no changes.

## Product / presentation boundary

Identical to the baseline pass: storage, Interested schema, 0/1/2/3, Context, Calendar
behavior, Action Destination, GA4, CSP, privacy/network behavior, editorial inventory,
main/Production/domain untouched. app.js changes: hero asset/alt swap, Saved empty-state
markup (button reusing existing `go('emotion')` route). Everything else CSS.

## QA

- Authority regression suite: 9/9 suites, 332 assertions PASS, 0 FAIL
  (`qa/authority-regression-final.*`).
- Custom QA 17/17 PASS: first-paint third-party requests 0 (Home + Flow/FAQ),
  focus discipline (no heading outlines, 2px keyboard focus), History/back state
  preservation, single-line back pills, video poster contract, no horizontal
  overflow + >=44px targets at 320/390/430.
- Viewports: 1200x800, 1440x900, 1440x1000, 320, 390x844, 430x932. No JS errors.
- Storage/privacy/network delta: 0.

## Evidence files

- `1440/` — Home, Emotion Shelf, zero, Discovery, Detail, Saved (populated + empty),
  Help, Flow, MENU, detail facts, plan-saved, 1200/1440x1000 Home.
- `390/` — Home, MENU, Emotion Shelf, Discovery, Detail, Saved (populated + empty),
  zero, 320/430 Home sanity.
- `compare/` — BEFORE `d958bd9` vs AFTER: desktop Home, mobile Home, Saved, zero state.
