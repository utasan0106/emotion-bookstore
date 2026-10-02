# クリープハイプ × 下北沢DaisyBar

## Scope and evidence

One independent, text-only cultural guide. Reuses the existing article typography and summary layout. Entry points: Shimokitazawa city editorial section and street-article index. Exit points: current official schedule/access, existing city audio collection, outings and both parent indexes.

Primary sources were read on 2026-10-02:
- https://www.creephyp.com/news/detail/106170?_normalbrowse_=1 — official “ホーム” wording and 2023-02-01 first tour date
- https://www.creephyp.com/feature/himehajime2026 — official 2026-01-15 venue and artist listing
- https://daisybar.jp/schedule/ — current venue listings, not a future CreepHyp booking claim
- https://daisybar.jp/access/ — public venue address and station access

No artist images, logos, lyrics, private locations, endorsements, event availability or inferred artist emotions. Two historical events are explicitly separated from the current schedule. Existing Koenji photo/editorial holds are untouched. No artist/venue assets added; inherited OGP uses the site's approved brand artwork. No existing CreepHyp/DaisyBar article or source entry was found in the checkout.

## Implementation

`tools/city-stories.js` holds short factual culture guides separately from long-form comparative research. The existing discovery generator supplies the page shell, SEO, article schema and parent links. Existing research articles are unchanged. RSS remains works-only, as before; sitemap includes the new canonical route.

No new runtime scripts, storage keys, shelf/Object contracts, analytics definitions, automatic external requests, tracking or data collection. Official links are ordinary user-initiated navigation.

## Verification

- 49/49 product checks passed locally, including the new culture-story contract
- Freshness workflow guard checks passed
- Generator reproducibility, internal links, historical/current distinction, source links, source schema, canonical/OGP and article reachability checked
- `git diff --check` and JavaScript syntax passed
- Local Chromium cannot launch because this execution environment denies socket creation. Do not treat local browser testing as passed
- Browser CI added for 390/1440 px × JavaScript on/off, fonts, overflow, keyboard entry/focus, official CTA target, source anchor, internal exits and browser Back; screenshots and report retained as workflow artifacts

Status before PR: draft for parent review. No main merge or production deployment in this task. Visual acceptance depends on actual CI screenshots and review, not static checks alone.
