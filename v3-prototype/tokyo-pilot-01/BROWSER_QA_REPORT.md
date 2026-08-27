# Browser QA — Tokyo Pilot 01 / Real Media v2

Result: **`BROWSER_QA_REAL_MEDIA_V2_GO`**

Status: isolated Human Test technical QA = GO / Production = NO-GO

## Viewports

- 320 × 800
- 390 × 844
- 430 × 932
- 1024 × 768
- 1440 × 1000

## Runtime media verified

The QA harness used the **actual frozen same-origin Pilot media bytes** by inlining those bytes as data URIs. It did not use generic placeholders.

- 原稿執筆カフェ: 640×905 PNG — decoded in all viewports
- Hachiko: 2048×1536 JPEG — decoded in all viewports
- Meguro tapeworm: 1363×2048 JPEG — decoded in all viewports

The harness changes transport only for sandboxed QA; it does not change Pilot copy, DOM semantics, ordering logic, reveal logic, or stored files.

## Verified in Chromium via Playwright

At every viewport:
- exactly 3 cards render
- all 3 frozen Real Media assets decode
- horizontal overflow = 0
- pre-open cards do **not** leak Hachiko `剥製` or Meguro `標本` Reveal answers
- Object detail dialog opens
- focus moves inside the dialog
- Escape closes the dialog
- focus returns to the originating `ひらく` button
- Reveal renders only after open
- internal `verifiedNote` audit copy does not render in participant UI
- console/page errors = 0

Information architecture / controls:
- `ひらく` is an in-page dialog control and does not display an external-link arrow
- external-link arrow is reserved for Official Action
- frontstage presents `東京の棚`; `みんなの感情書店` is a quiet byline for this Pilot
- no search, account, save/history, ranking, AI recommendation, or infinite feed was introduced

## Evidence-preserving media behavior

A real-media visual review exposed one material issue: the vertical Meguro image was initially cropped by `object-fit: cover`, which removed the visual evidence of the specimen's unusual length.

Fixed:
- Meguro card: `object-fit: contain`
- Meguro detail: `object-fit: contain`
- full-frame evidence retained

This is not visual rescue of weak content; it prevents the UI from destroying the fact the photograph is meant to demonstrate.

## Order counterbalance

`order=abc/acb/bac/bca/cab/cba` preserves exactly the same three Object identities and changes order only.

## Media scope boundary

The runtime images are source-pinned Human-Test derivatives documented in `tokyo-pilot-01/MEDIA_LOCALIZATION_EVIDENCE.json` and `MEDIA_ATTRIBUTION.md`.

They are approved for **isolated Human Test only**. This QA is not Production media/legal approval.

## Evidence files

- `browser-qa-real-v2/qa-real-v2.json`
- `browser-qa-real-v2/m320-home.png`
- `browser-qa-real-v2/m320-meguro-detail.png`
- `browser-qa-real-v2/m390-home.png`
- `browser-qa-real-v2/m390-meguro-detail.png`
- `browser-qa-real-v2/m430-home.png`
- `browser-qa-real-v2/m430-meguro-detail.png`
- `browser-qa-real-v2/d1024-home.png`
- `browser-qa-real-v2/d1024-meguro-detail.png`
- `browser-qa-real-v2/d1440-home.png`
- `browser-qa-real-v2/d1440-meguro-detail.png`
