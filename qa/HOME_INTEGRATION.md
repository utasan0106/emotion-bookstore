# Discovery home integration — 2026-09-08

## User direction and scope

The user accepted the compact list structure, a larger feature when present, actual work images, and the white / charcoal / restrained blue visual direction. Latest instruction: 「いいのでは？進めて。」 and then 「継続して。共有。」 with PuppetLoom. The catchphrase remains provisional. This is a local root-page integration for review, not production publication. Do not report the old Awa Odori hero or characters as approved. The earlier A/B comparison is no longer undecided: the user chose A and approved subsequent refinements.

## Integrated

- Root index.html uses home-discovery.css and home-discovery.js. QA mockup is no longer the only implementation. Existing menu, saved items, city routes, historical anchors, suggestion page, metadata and analytics loader remain.
- White reading canvas, charcoal type and restrained cobalt. Japanese gothic; work title 1.125rem, feature title 1.5rem on mobile, body 1rem, short card description .9375rem, secondary metadata .8125rem. No weather tint/particles over images. These are design choices, not prescribed values from Morisawa/WCAG.
- Mobile: one feature, compact list, native expandable short reading. Desktop: feature and reading in the left column, work list on the right.
- 本 / 音楽 / 映像 filter the home list, with a visible すべて reset, URL state, back/forward handling and progressive anchor navigation. These currently filter three featured entries, not the entire catalogue.
- 展示 / ライブ enter the corresponding outings filter. A category-only entry chooses the nearest available week within the existing four-week selector; an explicit week remains exact. Date expiry, cancellation, city and companion filtering remain.
- Book: こじらせ男子とお茶をする, 月と文社 編／月と文社, ISBN 9784911191026. Actual whole cover from hanmoto; individual page permitted reuse checked earlier in this session. This is a change from the earlier Morisaki placeholder. Existing Morisaki book and film pages are still available through the catalogue/footer, not relabelled as this book.
- Music: Boris with Michio Kurihara, 不透明度 / Live at Shelter. Official 170px Bandcamp artwork player, no local copied jacket. Existing detail is optional; direct Bandcamp action comes first.
- Video: actual Koenji dance record photo, Lucertola credit, direct official 5:39 video. Not the hero.
- Events retain their sourced venue/location photos and direct official actions. Instagram artwork remains on applicable detail pages.
- Root-only Bandcamp frame CSP, with no overlap with the generic CSP; data disclosure and credits updated.

## Evidence

- Browser fixture qa/home-integration-layout.html: 320px, 390px, 390px with 200% root text, 1440px. No horizontal document overflow; reading opens/closes; music filter and reset pass. No completed broken images in these checks. This is not a full WCAG audit or a claim about embedded-player text enlargement.
- Browser: root menu opens and closes; 展示 entry selects 09/14–09/20 and displays three matching events; card links point directly to official sites.
- Visual inspection: actual book cover, Bandcamp jacket and video photograph present on mobile; desktop uses the intended two columns.
- node qa/home_discovery_check.js — passes local destinations/anchors, image sources, root-only CSP, category × city × week filtering and expiry.
- node tools/build-weekly-outings.js --check; qa/weekly_outings_check.js; qa/event_timing_check.js; qa/memory_note_check.js; qa/weather_client_check.js — pass.
- qa/ga4_v3_client_selftest.js and qa/measurement_v04_selftest.js — pass; existing 484 behavioral assertions. Updated obsolete single-external-link / no-iframe assumptions to the explicitly selected work sources; no new tracking events or private payloads added.
- Older qa/home_canonical_check.js, qa/cover-flow-check.js and screenshot scripts still describe the retired Awa hero. They are historical direction-specific checks, not evidence of this integration passing. Use the new home check for this review. Full deployment checks are outstanding.

## Remaining release work

- Not pushed or deployed. Public site state was not changed in this turn.
- Verify Vercel response CSP and official embedded-player operation on an actual deployment; local Vite does not apply Vercel headers. Audio playback was not tested in this turn.
- Long catalogue/film detail pages have not all been redesigned or supplied with actual work art; no claim of site-wide completion. Event card imagery is often the actual venue/location, not the exhibition artwork itself.
- Weather failed to load in the local browser and displayed the existing fallback. Do not claim live weather was verified.
- Reconfirm time-sensitive event sources before a later publication date. Current checkedAt remains 2026-09-08, not silently advanced.
- Catchphrase and final editorial book selection remain reviewable; do not treat metadata as newly approved marketing copy.

## Shared reference

PuppetLoom README inspected via GitHub on 2026-09-08: https://github.com/CheshireMew/PuppetLoom . Layered PSD → rigged 2D characters, revision evidence and Web/OBS export. Reference only; no installation, third-party code import, or character reintroduction. The site work remains the approved culture-discovery flow.
