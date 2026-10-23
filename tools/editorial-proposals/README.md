# Local editorial integration foundation

All book and shelf entries are proposals. `editorialReview: "pending"` and `adoption: null` are intentional. Source review, image permission review, a passing build, a screenshot, and this implementation do not constitute owner adoption.

`books.json` contains only two new independent book identities. Existing city works retain their original `city/id`, detail URL, displayed creator roles and source data. `shelves.json` references those identities; it does not create duplicate work pages. Shelf quantity is data-driven, not fixed to three shelves. Each individual shelf contains three works.

The proposed text and bibliography are from the source-checked V4 data reviewed on 2026-10-23. The shared stylesheet derives from B and now includes a separately reviewed shelf-detail adaptation: its current hash and the original B reference hash are both recorded in ui-reference.json. It is no longer byte-identical to B. The generator now reuses its text navigation, three header bands, current-location breadcrumb, related-book hierarchy and shelf edition layout. These are not approved publication assets: B adoption is still pending. The previous generated version passed 40 CI conditions but actual screenshot review found mobile title/prose defects; this revised adaptation has only static verification locally and requires a new CI render. This foundation is unpublished functional preparation, not visual approval. Two original cover files and `cover-provenance.json` are retained as source inputs for reproducible edition/hash checks. The repository may be public; these inputs are excluded from the deployed site. Do not copy the input folder into a public directory; `.vercelignore` excludes the entire folder.

The latest illustrated-home proposal supplies four shelves: `ordinary-day-curiosities` and `places-to-share` are proposed as featured, while `after-a-good-day` and `people-behind-the-place` remain secondary. `featuredProposal` is descriptive proposal data, not an approval flag and not an instruction to modify the current homepage. All four remain pending.

## Current default

- Published book catalogue stays at its existing 16 books.
- No `/books/` or `/shelves/` proposal page or associated public asset is emitted.
- Existing city pages, URL references, saved-memory data, counts, HTML and sitemap are unchanged.
- No new browser script, tracking, storage, permission, network call or publication workflow is added.

## Future adoption, only after an explicit owner decision

Record the decision only for the adopted book/shelf entries by changing the review state to `approved` and adding `adoption: { "reference": "the actual decision reference", "confirmedOn": "YYYY-MM-DD" }`. This record must describe a real decision, not an inferred approval or test result. An approved shelf cannot refer to an unapproved proposed book. Existing city works need not be reclassified or moved.

After legitimate adoption and remaining visual/content review:

1. `node tools/build-editorial-pages.js`
2. `node tools/build-work-pages.js`
3. `node tools/refresh-sitemap.js`
4. `node qa/verify-product.js` and the relevant browser/visual checks.

This does not publish anything. Publication requires its separate authorization. The site publication date remains unspecified; a book's original publication date and a source-check date are not reused as a WebPage publication date.

The source-input `generated-outputs.json` records the hashes of only this compiler's outputs. It permits approved → pending/rejected cleanup and preserves ownership when proposal rows are removed. The compiler refuses to replace or delete manually edited/unmanaged files, including images and CSS. All existing output/manifest path components are checked with lstat before any mutation. Symbolic links (including dangling links), non-regular targets and hardlinked targets are rejected. Writes use exclusively created regular temporary files and atomic rename instead of overwriting existing inodes. Resolve a collision deliberately rather than disabling the guard. This contract assumes a static local worktree; it is not protection against a concurrent hostile process swapping directories between checks and mutations.

`qa/editorial_catalogue_check.js` creates a temporary copy, tests pending and hypothetical approval paths (including first-shelf-only, the two featured shelves only, and all-proposals adoption), and deletes that disposable copy. Held secondary shelves have no generated pages, sitemap entries or public links in the featured-only fixture. Its adoption references explicitly say TEST FIXTURE and are never written back into these source files. It does not grant editorial approval.

The home layout is not changed by this foundation. New entries can be found through the existing work directory after adoption; adopting a new home remains a separate decision. New pages intentionally offer no saved-memory controls. Existing local-memory keys and old page URLs remain intact.

## B presentation synchronization and CI evidence

`ui-reference.json` pins the exact supplied B home and seven related HTML/CSS reference files and records the existing-work edition labels without changing authoritative city titles, creator roles, URLs or full rights credits. The B CSS is retained as the baseline with a scoped .detail-works adaptation; source inputs remain excluded from the deployed site until explicitly approved generation. The approved fixture has only the two featured shelves; held secondary shelves never leak via exits. A book without an approved containing shelf links back to the existing book list. Navigation labels reflect real destinations: shelves only when an actual approved shelf section exists, otherwise works; music list and city list are named as such. No home/outings replacement or fabricated home anchor is introduced.

`qa/editorial_ui_contract.js` verifies these structural/content contracts, not actual rendered appearance. The fast fixture verifies nine UI regressions fail, in addition to the existing ownership/approval/metadata cases. Existing public HTML and sitemap bytes must be restored exactly after each hypothetical adoption sequence.

`node qa/editorial_generated_browser_check.js --prepare-only` creates and checks a disposable 2-book + 2-featured-shelf fixture without launching Chromium, then removes it. The actual source stays pending/null and its ownership record stays empty. The report deliberately says browser `not-run`, not visual PASS.

In the existing browser CI, `node qa/editorial_generated_browser_check.js` renders those same four production-shaped canonical paths at 320/390/430/768/1440 pixels and 100%/200% text (40 conditions), checks images/overflow/links/contrast/privacy/UI/keyboard, and records screenshots under `qa/artifacts/editorial-generated-books-first/`. It reuses the supplied B preview checker engine with an explicit absent home route and zero-video interaction requirement. All external HTTP/WebSocket requests are blocked. Browser failure is a failed result, not a fallback pass. No new workflow, permission or publication mechanism is added.

## Mobile shelf-detail adaptation after actual screenshot review

The previous 0ca99 CI screenshot at 390 px left a final 「る」 alone in the title and stacked full descriptions in the narrow column beside the cover. Passing overflow/image checks was not enough. All four shelf templates now share this source order: full unchanged title, linked cover art, short creator/edition metadata, then explanation → source → complete rights credit → next-work bridge. At mobile widths the title and copy span the full card; only the cover and short bibliography sit side by side. Desktop retains the cover-left/text-right card arrangement. Cover links remain functional; natural Tab order is title → cover → source/credit/next work. No font reduction, title abbreviation, nowrap, ellipsis or hidden content is used; balanced title wrapping is allowed.

The full selection-method/reading-scope note moves after the actual works, before shelf exits. It remains visible HTML and is tested for completeness; the individual book's introductory note is unchanged. The book information table's edition row omits its repeated ISBN suffix because the exact ISBN remains in its dedicated row and Book schema.

Static all-proposals fixtures cover all four shelves, including text-only artwork. The existing browser fixture still covers only the two featured shelves plus two books (40 conditions); secondary shelves remain held, not silently approved. New browser checks measure full-width mobile title/copy, desktop geometry, title character-line endings at normal mobile text size, method-note placement, and actual card-link Tab order. These checks and the revised screenshots must pass in the existing authorized CI before any visual conclusion. No browser was launched locally.
