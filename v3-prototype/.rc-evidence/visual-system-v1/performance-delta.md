# V3 Visual System V1 — Local first-paint delta

Method: identical local static server and Chromium collection before implementation
at `3e063ec472df3c10dc271473a28390ce17f553c7`, then after the final Visual System V1
implementation. Resource totals are uncompressed local transfer sizes. Timing is a
single-run diagnostic and is reported without treating it as a lab benchmark.

| Viewport | Baseline payload | Final payload | Delta | Baseline FCP | Final FCP |
|---|---:|---:|---:|---:|---:|
| 320 | 1,355,416 B | 1,419,336 B | +63,920 B (+4.72%) | 268 ms | 288 ms |
| 390 | 1,355,107 B | 1,419,027 B | +63,920 B (+4.72%) | 180 ms | 260 ms |
| 430 | 1,355,107 B | 1,419,027 B | +63,920 B (+4.72%) | 156 ms | 176 ms |
| 1200 | 1,651,354 B | 1,678,810 B | +27,456 B (+1.66%) | 216 ms | 228 ms |
| 1440 | 1,651,354 B | 1,678,810 B | +27,456 B (+1.66%) | 228 ms | 300 ms |

- First-paint third-party requests: 0 before / 0 after.
- Added first-paint code is the 30,499-byte presentation cascade plus small markup/
  navigation changes. Mobile also eagerly renders the 36,164-byte header brand mark.
- The 642,098-byte supplied runtime WebP family is loaded on the relevant shelf/card
  surfaces, not on Entrance first paint.
- The 32,957,755-byte canonical PNG originals are preserved for provenance and excluded
  from Vercel delivery by `.vercelignore`.
