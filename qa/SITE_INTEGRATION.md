# Public catalogue integration — 2026-09-08

Local implementation on `astra/editorial-cover-20260908`, following home integration af51ded. Not pushed or deployed. The accepted home has not been replaced.

## Implemented

- Shared `site-system.css`, injected through repeatable `tools/page-chrome.js`: white, charcoal and cobalt; local Japanese gothic; reading 16px, description 15px, metadata 13px, work-card title 18px, mobile h1 24px and wide h1 32px (rem equivalents). Japanese titles prefer breaks at spaces; long strings still wrap without horizontal overflow. Controls retain at least 44px targets.
- Catalogue, work details, events, shelf/thread, suggest, saved, about/data/credits and English visit pages use the same contract. Removed duplicated shared script/style/IDs on saved.html.
- City/category cards expose the original external destination directly and keep a secondary introduction link. Event cards already have direct official destinations; their layout now matches the new theme.
- 40 audio/video entries, 9 film trailers and 3 common shorts use the exact existing source-checked YouTube IDs via official privacy-enhanced iframe previews. Lazy loading, autoplay=0, minimum 200px player height. Trailers explicitly identified as trailers, with direct same-video fallback links. The player can load when its area approaches the viewport; privacy copy updated to explain this.
- Boris's exact 170px official Bandcamp artwork is also on works.html and work-music.html. CSP permission is scoped to those exact paths in addition to the accepted home; no overlapping policies.
- Added the actual publisher cover for 下北沢インディーズ ライブハウスの名探偵, ISBN 9784408557588, with credits and intact aspect ratio. Publisher introduction-use terms and exact current product checked. Policy notes retained in tools/work-cover-source.json.
- Legacy work detail pages now name the work in the main heading once, put the official destination before the optional background route, and preserve the sourced editorial text.
- Corrected four English visit links that pointed at nonexistent city directory indexes.

## Verification

- `node qa/site_integration_check.js`: 149 public pages; local links/assets, unique IDs, idempotent shared chrome, exact media IDs, direct destinations, one applicable CSP per route and matching iframe origins.
- Source builders checked: city discovery, work pages, weekly outings, shared page navigation.
- Event timing/expiry/filter and local-memory tests pass. Home integration check passes.
- Browser layout: no horizontal overflow or duplicate IDs in 9 representative cases: outings 390, work-music 320, saved 390, suggest 390, dance/history thread 390, shelf Koenji 390, book collection 390 at 200% root text, outings 320 at 200%, work-music 1440. White body and Japanese gothic confirmed.
- Browser interaction: work menu opens/closes; reflection form opens/closes without entering or sending any personal text. Suggest page exposes its existing direct Google Form URL; no form was submitted.
- Actual publisher book image loaded in the browser. Mobile screenshot is an unaltered crop of that page, after fixing the subtitle break.

## Still incomplete / publication gates

- 19 of 20 city-book covers remain unresolved. See qa/BOOK_MEDIA_REVIEW.json for exact editions, publisher links and the difference between applicable permission and conditional/personal-use terms. Morisaki and its sequel are specifically not declared cleared. No stock image or different edition has been substituted.
- 11 city-film works still lack a verified still/poster/trailer in the catalogue. Their real source links and text remain; there are no fake artworks or placeholder illustration blocks.
- YouTube player UI rendered in this cloud browser, but thumbnails remained black. This run does not claim successful playback or thumbnail rendering for every video. The same-video external links stay available. Final media display/playback QA is pending.
- Weather data is unavailable on the local static server. No claim of weather API verification in this run.
- Full production/site completion must not be claimed. No GitHub push, Vercel deployment or external publication occurred.

## User instruction: no subagents

During this run the user explicitly requested complete disablement of Codex subagents, with `features.multi_agent = false`, preserving all existing settings and backing up config before writing. After that instruction no subagents were used. The accessible local /root/.codex/config.toml is false and has a timestamped backup. This environment has no Codex binary, so effective state after restarting a Codex host is not verified. Do not treat a local config change as a guaranteed account-wide/hosted ChatGPT setting. Continue all subsequent development without subagents unless the user changes this instruction.


## Mobile approval and film media follow-up — 2026-09-08

User approved the shown mobile direction (「携帯はそれで良いので進めて」). Preserve this visual direction; continue implementation without another design-selection round. This is not publication approval. No subagents used.

Added the exact YouTube embeds present in two official film sites to both catalogue cards and work detail pages:
- 名付けようのない踊り: https://happinet-phantom.com/unnameable-dance/ → ELXE7PGOBT8
- ロッコク・キッチン: https://rokkokukitchen.com/ → HrRTahmwIYI

Both iframe URLs were read from official page HTML on 2026-09-08. Preserve explicit trailer labeling, no autoplay, and direct external links. This verifies provenance, not actual playback: YouTube fetches were throttled, so playback remains unverified. Film media gaps decrease from 11 to 9; 19 book-cover gaps remain. 149-page integration check passes after regeneration. Public site unchanged.
