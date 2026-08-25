# Mobile Responsive Final Closure (2026-08-25)

Start HEAD: `6ca1dcc` · Branch: `claude/v3-visual-enterprise-baseline-20260825`
Presentation-only. CSS changes in `visual-system-v1.css`; no markup/JS/copy/Product changes.

## Issue 1 — Mobile Home one-cover fit

Approved order unchanged (illustration → 感情の先に、世界がある → supporting copy → はじめる →
culture indication). Fit achieved by reclaiming accumulated vertical spacing at <=599px only:
entrance top padding 14→8, hero margin 10→6 + illustration rendered at 94% width (full
composition, no crop), copy gap 24→14, headline 35→32px / lh 1.4 (tick pad 17→14),
supporting-copy and routes gaps tightened, CTA 58→52px (>=44 kept), culture/trust gaps trimmed.
No negative margins, no transforms, CTA stays below illustration.

Measured at 390x844: sequence completes at y=571 vs bottom-nav top 778 (207px headroom for
real-device browser chrome); Trust strip also fits (626). 320: culture 507 < nav 634.
430x932: culture 598 < nav 866. scrollY 0, horizontal overflow 0, JS errors 0 at all three.
Desktop 1200/1440 composition verified unchanged.

## Issue 2 — Practical Truth / Official Fact layout collapse

Root cause: `.real-discovery-facts` used `grid-template-columns: minmax(0,1fr) auto` at all
widths — the `auto` column collapses toward one-character vertical wrapping and adjacent labels
can collide when the neighbor value is long (real-device fonts/width amplify it).

Fix (structural, no string patches):
- <=599px: the block becomes a single-column stacked label→value list
  (flex column; each fact div stacks dt over dd; min-width: 0).
- All widths hardening (invisible when space suffices): fact value containers get
  `min-width: 0` and `overflow-wrap: anywhere; line-break: strict` across
  `.real-discovery-facts` / `.detail-truth-list` / `.place-detail-facts` / `.facts`.
- 料金/入場 and their values stay visually associated (label directly above value).
- Factual content, Practical Truth resolution, Action Destination, registry untouched.

Verified: live long-address case (文喫 六本木, 東京都港区六本木6-1-20 六本木電気ビル1F) at
320/390/430; fixture deck (新宿御苑, long time-with-months value) at 320/390. Desktop/tablet
(768/1200/1440) keep the healthy 2-column grid, single-line values, overflow 0.

## QA

Authority regression 9/9 suites (332 assertions) PASS · custom QA 17/17 PASS ·
mobile-order acceptance 17/17 PASS. No JS errors, no horizontal overflow, >=44px targets,
focus-visible intact, reduced-motion unchanged, first-paint third-party requests 0,
storage/Interested/analytics/external-communication delta 0.

## Files

- `home/` — BEFORE/AFTER 390x844, AFTER 320 + 430x932, desktop 1200/1440 sanity, comparison.
- `facts/` — BEFORE/AFTER 390 (live long-address), AFTER 320/430, fixture 320/390, comparison.
- `qa/` — authority regression rerun for this pass.
