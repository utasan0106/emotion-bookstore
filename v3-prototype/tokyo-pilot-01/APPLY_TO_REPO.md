# Apply to repository — V3 User-First Tokyo Pilot 01

Status: **LOCAL ISOLATED PILOT READY / GITHUB WRITE BLOCKED / PRODUCTION NO-GO**

## Base

- Repository: `utasan0106/emotion-bookstore`
- Base branch: `claude/v3-product-thesis-entry-test-20260826`
- Verified base HEAD: `57c7e2e712439bf3f2a8bb0b16720d735b497a54`
- Production/main baseline: `eca334f9671bee07833892b2476aac118f8ed018`

## Target

Create a fresh non-main branch from the verified base and copy `tokyo-pilot-01/` to:

`v3-prototype/tokyo-pilot-01/`

Do not modify existing V3, CSP, storage, analytics, registry, Entry Test 01, main, Primary domain, or Production in the same change.

## Current runtime files

Core:
- `index.html`
- `pilot.css`
- `pilot_content.js`
- `pilot.js`
- `pilot_check.js`

Frozen same-origin Human-Test media:
- `assets/manuscript-cafe.png`
- `assets/hachiko.jpg`
- `assets/meguro-tapeworm.jpg`

Evidence / QA:
- `MEDIA_LOCALIZATION_EVIDENCE.json`
- `MEDIA_ATTRIBUTION.md`
- `MEDIA_LOCALIZATION_READY.md`
- `media_validate.py`
- `HUMAN_TEST_CYCLE_01.md`
- `HUMAN_TEST_SCORECARD.csv`
- `PRODUCT_BET_20260827.md`

Historical/fail-closed helper:
- `localize_media.py` — not required for the current frozen derivative set; do not rerun blindly over the frozen assets.

## Required checks after copy

```bash
cd v3-prototype/tokyo-pilot-01
node pilot_check.js
python media_validate.py
node --check pilot.js
node --check pilot_content.js
python -m py_compile media_validate.py localize_media.py
```

Expected:
- `PILOT_CHECK_GO`
- `MEDIA_VALIDATE_GO`

## Runtime invariants

- exactly 3 Objects
- finite ending
- no search
- no accounts
- no save/history
- no localStorage/sessionStorage/IndexedDB
- no GA4/GTM
- no fetch/XHR/sendBeacon runtime
- no AI recommendation/personalization/ranking
- all 3 runtime media same-origin
- pre-open card must not expose `objectName`, Hachiko `剥製`, or Meguro `標本`
- `ひらく` is an in-page dialog control; no external-link arrow
- Official Action is HTTPS and is the only external navigation from the Object detail
- internal `verifiedNote` must never render to participants
- Meguro card/detail use full-frame `object-fit: contain`
- media evidence must match actual bytes, dimensions, and SHA-256
- all media records: `human_test_scope_only=true`, `production_promotion=false`

## Real-media QA already passed locally

320×800 / 390×844 / 430×932 / 1024×768 / 1440×1000:
- all 3 actual frozen images decode
- overflow 0
- spoiler leak 0
- internal note leak 0
- dialog/focus/Escape/focus-return PASS
- Meguro full-frame evidence preserved

All six orders `abc/acb/bac/bca/cab/cba` preserve the same three identities with order only changed.

## Freshness

Current Pilot metadata reverified 2026-08-27 17:16 JST.

- Cafe: official page currently exposes scheduled operation through 2026-08-30 16:00 and later schedule as adjusting; `expiresAt=2026-08-30T16:00:00+09:00`.
- Hachiko: official exhibition DB confirms 秋田犬（ハチ） / 剥製 / 日本館2F北翼.
- Meguro: official sources confirm 10:00–17:00, Mon/Tue closure with holiday exception, free admission, and 1986 start of display for the 8.8m specimen.

Reverify immediately before every external Human Test cycle.

## Human Test state

Technical gate: READY.
External participant recruitment/distribution/test: NOT STARTED.

Do not add features before behavior evidence. Cycle 01 tests only voluntary Object Open and reason to return for the next three.

## Current connector block

GitHub branch creation/write was retried and still returns HTTP 403 `Resource not accessible by integration`. No remote repository mutation was made.
