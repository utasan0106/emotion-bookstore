# 気持ちのよりみち — first editorial pilot

## Scope and review

One modest Home entry after the existing work trio; one neutral `/discover/selection/` route; three existing work destinations. The October cover remains byte-for-byte unchanged. This is an editorial proposal pending final review before merge, not a new psychological product or revival of the archived diary service.

The native disclosure starts closed. Readers may open “怒った日、少し距離を置きたい”, close it, ignore it, or use the ordinary work index. No classification or automatic personal inference is made. Future labels are not published as empty promises.

## Evidence and editorial interpretation

- **緑あふれるまち 武蔵野市**: municipal source identifies the parks/green spaces and the 2022-05-06 publication. Source: https://www.city.musashino.lg.jp/gomi_kankyo/midori_koen/tokyonomoriwomamorutorikumi/1037102.html . Existing `tools/city-discovery-source.js` and `tools/visual-media-duration.js` record 104 seconds (duration checked 2026-09-24). The existing public destination and the matching official player/channel were inspected 2026-10-01. Current stable playback was not established. Do not describe it as present-day footage or exclusively Kichijoji.
- **秘密 / ゴリラ祭ーズ**: existing public destination and embedded source title identify “Live at 神保町試聴室 20241001”; the provider channel is named ゴリラ祭ーズ. Source: https://www.youtube.com/watch?v=3d49S1QGJQc . The provider UI displayed 6 minutes 10 seconds on 2026-10-01. The current source explicitly classifies this as `audio`; visual-short duration gates do not apply to the listening collection. Display “音楽 · 1曲 · 6分10秒”; do not call it a short film. Full listening/stable playback was not verified.
- **森崎書店の日々 / 八木沢里志**: https://www.shogakukan.co.jp/books/09386765 was inspected 2026-10-01. It describes the protagonist moving into her uncle's Jimbocho bookshop after a breakup and leaving her job; a sample-reading link is present. Destination is the new edition. The pilot labels the premise so readers can choose. It does not promise the whole book is free or quick to finish.

The proposed “〜したいときに” reasons are the editor's selection, not an effect claimed by a source or an assertion about the reader. No calming, healing, diagnosis or mood-improvement guarantee is made.

## Media rights and data boundary

No new picture, cover, frame capture, audio or video is downloaded or reproduced. Only the existing brand asset and local fonts are loaded. Links lead to existing detail pages, retaining their rights notes and click-to-load provider players. No existing work source, cover permission or media gate changes.

The pilot has zero executable scripts. Native `details` state is not copied into URLs, query strings, hashes, events, `dataLayer`, storage, cookies or external services. Canonical, page title, OG metadata and structured data remain generic. It uses `no-referrer`; work links additionally use `rel="noreferrer"`. It has no new analytics loader, event, account or storage key and no automatic third-party resource. Browser-native Back can restore open/closed state; that is not application persistence.

## Checks

- `node qa/selection_feature_check.js`: finite, existing destinations; explicit media classifications; neutral metadata; no executable code, form or provider loads
- `node qa/verify-product.js`: aggregate regression gate, including the pilot
- `NODE_PATH=<pinned Playwright 1.57.0> node qa/selection_browser_check.js`: 390/1440px, real font loading, closed/open screenshots, keyboard Enter/Space/repeat, URL/history/storage/cookie/analytics equality, zero requests on toggles, three detail/Back flows, referrer suppression and reload reset
- Existing `Home cover browser check` runs both the unchanged cover harness and the new feature harness against the exact PR head. All external requests are blocked and recorded; this does not prove live media playback or deployment response headers.

Local Chromium is blocked by the executor's socket permission. CI screenshots and network/state results must be reviewed before merge. Runtime GA4/storage/media-loader files remain unchanged; contract adaptations add the new static page and enforce its narrower, script-free behavior.

After approval, use existing weekly destination/freshness checks. There is no automatic topic rotation, emotion-specific analytics or new operating queue.
