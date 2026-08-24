# V3 S1A Cultural Matching — execution evidence

- 実施日: 2026-08-24 JST
- 最優先正本: `V3_S1_EXECUTION_START_INSTRUCTION_20260824_1338_JST`
- Repository: `utasan0106/emotion-bookstore`
- Branch: `codex/v3-cultural-matching-s1a-20260824`
- Exact Start / V3_RELEASE_BASELINE: `eca334f9671bee07833892b2476aac118f8ed018`
- S1A implementation commit: `e7f2148450f5874d6016445f10ccf8aa9dae6ecc`
- Preview: local isolated preview only (`127.0.0.1:4174`); Production/domain/main mutation 0

## Implemented S1A contract

- 0/1/2/3件を別状態として扱い、重複ID・3件超・Registry不備・表示契約不備はerrorへfail closed。
- 2–3件は有限の左右swipeと明示Previous/Nextを同じnavigationへ接続。最終件はdisabled Nextではなく「棚を見終える」。
- swipe / Previous / Next / ArrowLeft / ArrowRight / Detail閲覧は、pass/keep/Interested/affinity/personalizationを更新しない。
- Interestedは明示した「気になる」だけが既存キー・既存schemaへdurable save/removeする。
- real-ready実画像を優先し、権利未確認の7件は既存カテゴリ図版を「実画像の表示権利を確認中」と明示。
- Warm Paper shell内にcool-neutral Cultural surface、白/near-white reading panel、Deep Navy primary actionを実装。
- 8棚のShelf Lensを正本copyへ更新。`atatamaru`は正本指定文と完全一致。
- Detailを公式説明 / なぜこの棚に / 実用情報 / Primary Action / 情報・メディア確認状況の共有contractへ接続。
- navigation時にaudio/videoをpauseし、iframeをblank化。reduced motionは120ms opacity-only。
- loading / load error / Registry error / true zero / finite completionを別状態として実装。

## Static and regression evidence

- `v3-prototype/verify/s1a_cultural_matching.js`: 64/64 PASS, exit 0
- 既存の現行PASS群: 340/340 PASS, 全8ファイル exit 0
  - Action Destination 24/24
  - Interested retrieval 34/34
  - Public Editorial shell 44/44
  - Place Detail 27/27
  - Official description closure 118/118
  - Security/accessibility 62/62
  - Interested durable contract 31/31
- browser依存スクリプトとS1A新規検証を除く既存static全体:
  - Exact Start: 840 PASS / 38 historical FAIL / nonzero files 18
  - S1A branch: 840 PASS / 38 historical FAIL / nonzero files 18
  - new FAIL: 0
- `git diff --check`: PASS
- `node --check` (Product app / S1A verifier / fixture): PASS
- protected files byte-identical to Exact Start: `vercel.json`, Legal 2 pages, store, Interested resolver, analytics, Action Destination, personalization, Registry, public Editorial/data.
- Product first-paint script set unchanged; `connect-src 'none'`; JSON-LD CSP SHA-256 exact.

## Isolated real-browser QA

Browser: Codex in-app Chromium, actual Product route plus `/v3-prototype/verify/` isolated cardinality fixture.

- true zero: empty copy present、fabricated CTA 0
- Registry error: error state 1、zero-state誤表示 0
- one: Previous 0 / Next 0 / truthful finish 1
- two: final counter `2 / 2` / Next 0 / finish 1
- three: counter `1 / 3` → `2 / 3` → `3 / 3`; final focus target `finish`
- real pointer left swipe → next, right swipe → previous
- explicit Next and ArrowRight → same finite movement; focus continuity PASS
- browsing / swipe / Detail after Interested entry count 0 and `aria-pressed=false`
- explicit Interested: save → reload → retrieve actionable item → remove → reload; final entry count 0
- actual Product route (fixtureなし): `1 / 1`, finish present, Next absent, horizontal overflow 0, console error 0
- real-ready media: 新宿御苑の既存権利確認済み実画像を表示
- fallback media: 既存カテゴリ図版と権利確認中表示を同時に確認
- reduced motion: `s1a-deck-fade-in`, `0.12s`, transform `none`
- media lifecycle source/runtime contract: navigation前stop、interactive/media target上のArrow navigation抑止

### Required viewports

Discovery / Detailの両方で検証:

| Viewport | Horizontal overflow | Horizontal target clips | Minimum relevant target height |
|---|---:|---:|---:|
| 390×844 | 0 | 0 | 48px |
| 430×932 | 0 | 0 | 48px |
| 1280×800 | 0 | 0 | 48px |
| 1440×900 | 0 | 0 | 48px |
| 1440×1000 | 0 | 0 | 48px |
| 1920×1080 | 0 | 0 | 48px |

Detailの全viewportで、公式説明→なぜこの棚にのreader order、独立reading panel、実用情報2 sectionを確認。

## Visual evidence hashes

- `V3_S1A_before_430x932.png`: `79533cc2e8550476c86b6000e0210754b52db38c24d7d7b8d1e72148bab7fa3d`
- `V3_S1A_after_430x932.png`: `ecd0a8bf0b92db39b846fbaf49d5ead1ea7e38aa007f9ab7b2590d0426f4633c`
- `V3_S1A_after_1440x900.png`: `0a630301e7da5d719529e51b792b562dc17cb19565494354fa3d75c1a1803037`
- `V3_S1A_detail_1440x900.png`: `e1db6c671ddafba17a2ff2f25561b76de136eef2e6f9f48b9533664dadee8c09`

## Explicit non-actions

- main変更 0
- Production deployment / alias / environment mutation 0
- domain / DNS変更 0
- Legal / Privacy / protected Interested schema変更 0
- GA4 destination/config変更 0
- S1B context / Today lineup / Sprint 2実装 0
- external inventory addition 0

## Decision

`CULTURAL_MATCHING_S1A_GO`
