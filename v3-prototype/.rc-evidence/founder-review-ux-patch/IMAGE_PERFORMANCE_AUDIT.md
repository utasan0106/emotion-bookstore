# Founder Review image and font performance audit

Measured locally on 2026-08-24 with a cold Chromium profile at 390 × 844,
Mobile Safari viewport/touch/user-agent conditions, followed by a warm reload.
The visual artwork itself was not redesigned.

## Root causes

- Entrance loaded a 910,087-byte PNG as its LCP visual.
- First paint requested three full Japanese TTFs totaling 18,623,692 bytes;
  Shelf selection then requested the fourth 7,682,584-byte TTF. The late font
  completion caused the reported fallback/weight discontinuity.
- The approved Detail photo was 2,250 × 1,499 and 695,826 bytes while rendered
  at roughly 318 × 205 on mobile.
- Runtime images did not consistently state decoding/loading priority and
  intrinsic dimensions.
- Development serving supplied no reusable cache policy. No duplicate image
  URL request was observed, but a warm navigation could not rely on explicit
  CDN cache metadata.

## Before / after

| Resource / metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Mobile Entrance hero | 910,087 B PNG | 65,682 B WebP | −92.8% |
| Desktop Entrance hero | 910,087 B PNG | 65,682 B WebP | −92.8% |
| Initial three font files | 18,623,692 B TTF | 591,020 B WOFF2 | −96.8% |
| Shelf-only Serif Regular | 7,682,584 B TTF | 239,376 B WOFF2 | −96.9% |
| All four runtime fonts | 26,306,276 B | 830,396 B | −96.8% |
| EXP_007 approved visual | 695,826 B, 2250 × 1499 | 369,016 B, 1440 × 959 | −47.0% |
| Local cold Entrance LCP | ~580 ms | ~220 ms | ~−62% |
| Entrance CLS | 0 | 0 | unchanged |

Byte counts are source-file and browser encoded-body measurements. Local LCP
is directional evidence rather than a production SLA; Preview cache headers
are verified separately after deployment.

## Loading policy after the patch

- Exactly the mobile and desktop responsive hero variants are preloaded; the
  chosen hero is `eager`, `fetchpriority="high"`, and has intrinsic dimensions.
- The eight Emotion illustrations are not preloaded. They use native lazy
  loading, async decoding and dimensions. Their original 51–71 KB art files
  remain unchanged and the visual-redesign proposal stays on HOLD.
- Below-fold Entrance steps/trust assets and retrieval thumbnails are lazy.
- Discovery/Detail images use a bounded 1440px approved WebP or the existing
  1200 × 900 category WebP. Width/height placeholders prevent layout shift.
- Vercel assets receive `max-age=3600`, `s-maxage=31536000`, and
  `stale-while-revalidate=86400`; HTML/CSS/JS retain the existing general
  response policy.
- The four WOFF2 files are local OFL-derived subsets covering the V3 public
  corpus. Full official TTF sources and license files remain in the repository.
  `font-display: block` prevents a visibly different interim face.

## Browser evidence

`browser-qa.json` records 390, 430, 1200 and 1440 checks. Across those runs:

- horizontal overflow: 0;
- `document.fonts.status`: loaded;
- first-party initial/background flow third-party requests: 0;
- Google Calendar requests before click: 0;
- image category overlay nodes: 0;
- JavaScript errors: 0;
- browser QA: 89 / 89 PASS.
