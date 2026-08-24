# V3 Visual System V1 — Local first-paint delta

Method: identical local static server and Chromium collection before implementation
at `3e063ec472df3c10dc271473a28390ce17f553c7`, then after the final Visual System V1
implementation. Resource totals are uncompressed local transfer sizes. Timing is a
single-run diagnostic and is reported without treating it as a lab benchmark.

| Viewport | Baseline payload | Final payload | Delta | Baseline FCP | Final FCP |
|---|---:|---:|---:|---:|---:|
| 320 | 1,355,416 B | 1,197,843 B | -157,573 B (-11.63%) | 268 ms | 252 ms |
| 390 | 1,355,107 B | 1,197,534 B | -157,573 B (-11.63%) | 180 ms | 176 ms |
| 430 | 1,355,107 B | 1,197,534 B | -157,573 B (-11.63%) | 156 ms | 308 ms |
| 1200 | 1,651,354 B | 1,437,210 B | -214,144 B (-12.97%) | 216 ms | 328 ms |
| 1440 | 1,651,354 B | 1,437,210 B | -214,144 B (-12.97%) | 228 ms | 252 ms |

- First-paint third-party requests: 0 before / 0 after.
- The presentation cascade is 31,633 bytes decoded. Entrance now eagerly loads one
  61,980-byte supplied runtime WebP and no longer loads the legacy watercolor hero or
  hidden stacked lockup; the resulting first-paint payload is 11.63–12.97% lower.
- The remainder of the 642,098-byte supplied runtime WebP family is loaded only on the
  relevant shelf/card surfaces.
- The 32,957,755-byte canonical PNG originals are preserved for provenance and excluded
  from Vercel delivery by `.vercelignore`.
- FCP is a single local run and varies by viewport; the stable payload and request policy,
  rather than these unthrottled timing samples, is the performance acceptance evidence.
