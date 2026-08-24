# Mobile Home Order — Limited Visual Fix (2026-08-25)

Start HEAD: `e95736a` · Branch: `claude/v3-visual-enterprise-baseline-20260825`

Mobile Home now reads: header → world-building illustration → 「感情の先に、世界がある」 →
「感情から、次に触れるものを見つけられます。」 → はじめる → 本/映画/音楽/展示・場所・体験 → Trust strip.

Implementation (no margin hacks, no duplicated content):
- The hero markup was already illustration-first in the DOM; the CSS `order` inversion that
  painted copy above the illustration on mobile was removed, so DOM order = reading order =
  visual order on mobile.
- The supporting copy moved before the primary CTA in the single shared DOM; it stays hidden
  on desktop (lede shown there), so nothing is duplicated.
- Desktop keeps the approved composition via its existing explicit grid areas (copy col 1 /
  illustration col 2) — verified unchanged.

Acceptance (measured at 320 / 390x844 / 430x932): order correct, DOM=visual order, CTA fully
inside the first viewport (bottom 544/610/649 px), no horizontal overflow, no JS errors.
Desktop composition and supporting-note hiding verified. Authority regression 9/9 suites
(332 assertions) PASS; custom QA 17/17 PASS.

Files: before-m390-home.png (e95736a), after-m390/320/430-home.png, after-d1440-home.png,
compare-mobile-home-order.png.
