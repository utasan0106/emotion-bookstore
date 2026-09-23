# Acquisition Operating System

Status: Canonical growth/SEO operating rules
Updated: 2026-09-22
Phase: Post-main-development / Acquisition & Discovery

## 1. Objective

The next phase is not feature expansion. The objective is to increase the probability that a person who has not decided where to go or what to do discovers Emotion Bookstore, finds one meaningful reason to leave the house, and reaches a real cultural destination.

Primary loop:

**Search / social / direct discovery → finite editorial landing → one work/place/event becomes interesting → official real-world destination → later return**

Do not optimize for pageviews alone, infinite browsing, popularity ranking, private emotion inference, or engagement compulsion.

## 2. Market hooks observed

### Time Out Tokyo — time intent
People arrive with a vague but urgent question: “What can I do today / this weekend?”
- dedicated “today” / weekend discovery surfaces
- editors reduce the city to a usable set
- timely items are paired with neighborhood context

Reference:
- https://www.timeout.com/tokyo/things-to-do/things-to-do-in-tokyo-today

### Walkerplus — exhaustive utility
People arrive with an explicit event-search task.
- today / tomorrow / weekend
- free / category / area
- “ending soon” labels
- broad inventory

Reference:
- https://www.walkerplus.com/event_list/ar0313/

Emotion Bookstore must not compete on inventory scale.

### Tokyo Art Beat — decision utility
People arrive because they want enough practical information to decide whether to go.
- current / ended state
- “ends tomorrow” and “ending soon”
- date, hours, fee, venue, address, access
- filters such as ends within 7 days

Reference:
- https://www.tokyoartbeat.com/events/condId/soon/orderBy/soon

### BRUTUS — editorial theme
People arrive for a strong point of view, not a database.
- finite thematic packages
- multiple media/articles under one lens
- roughly weekly editorial cadence

Reference:
- https://brutus.jp/focus/

### Casa BRUTUS — a lens that changes how the city is seen
A cultural object becomes the reason to rediscover a place.

Reference:
- https://casabrutus.com/categories/architecture/486152

## 3. Emotion Bookstore's sharp edge

Do not become:
- a generic Tokyo event database
- a recommendation algorithm
- a ranking site
- a tourism listicle factory

Sharpen:

> **まだ行き先が決まっていない人に、作品・映像・街の文脈から、今日の外出理由をつくる。**

Unique mechanism:
**work / film / music / video / place / event are allowed to lead into one another.**

The editorial value is not “best 100 things.”
It is “this one thing gives you a reason to step outside today.”

## 4. Acquisition architecture

### A. Time-intent landings
Maintain:
- HOME: broad current issue
- /discover/weekly/: current week editorial issue
- /outings/: current reviewed events
- city pages: durable city + culture intent

Future tests only when supply supports them:
- weekend
- ending soon
- free / low-cost
Do not create thin pages just to target keywords.

### B. Durable city-intent landings
Each public city landing should answer:
1. what can I encounter here?
2. why is this work/place connected to this city?
3. what can I do now?
4. where do I go next?

Titles/descriptions should use natural search vocabulary:
- city name
- books / movies / music / video
- events / exhibitions / live / places when relevant

### C. Work-intent landings
Every published work page:
- self canonical
- indexable unless explicitly stateful/private
- unique title and description
- real primary source/destination
- internal path back to city/culture context

### D. Event-intent landings
Only current, reviewed, scheduled events may be runtime/search acquisition pages.
Expired or review-expired details are removed from generated public surfaces.
Do not invent addresses, prices, organizers, or times.

## 5. Editorial selection algorithm

This is an internal editorial priority system, not personalized ranking.

A candidate may enter a visible/search surface only after:
1. **Evidence** — official/primary destination and review status are current.
2. **Reality** — the user can actually do/see/read/watch/go somewhere.
3. **Freshness** — event/date-sensitive information is inside reviewThrough.
4. **Media integrity** — media is same-origin or deliberately click-to-load; rights/provenance are recorded.
5. **Finite role** — it occupies a defined slot rather than expanding an endless feed.

Among eligible candidates, prioritize:
1. temporal usefulness — this week / weekend / ending soon
2. city-search legibility
3. a strong visual or narrative hook
4. cross-media bridge potential
5. novelty versus last issue
6. diversity of medium and neighborhood

Never prioritize because of inferred private emotion or popularity score.

## 6. Weekly finite slots

HOME / weekly issue should stay finite:
- 1 top feature
- 3 curiosity items
- 3 short videos
- current “ending soon / this week” event signal
- 1 editorial city/story lens when available

Do not grow the number of slots merely because supply grows.

## 7. Operational cadence

### Monday 09:15 JST
Mechanical freshness refresh:
- prune expired / review-expired event leaves
- rebuild outings, venue pages, weekly issue and city signals
- refresh canonical sitemap
- run acquisition QA

Editorial task:
- choose/update top feature and finite slots only if reviewed inventory supports it

### Friday 09:15 JST
Mechanical weekend freshness refresh with the same fail-closed gate.

Editorial task:
- check whether current inventory gives a real weekend reason to go out
- if not, do not manufacture content

### Monthly
Publish or refresh one durable city/editorial article only when there is a genuine question or cultural lens:
- history changed this place how?
- what does this work reveal about the city?
- why does this venue matter?
- what can be understood from primary records?

## 8. SEO technical contract

Canonical host: https://emotionbookstore.com/

Rules:
- legacy Vercel host permanently redirects to canonical host
- every indexable page has self canonical
- sitemap contains only canonical, indexable, static public URLs
- query/UI state URLs do not enter sitemap
- stateful shelf.html is noindex,follow; static /discover/<city>/ owns city search
- no stale/expired event detail remains in sitemap
- title and meta description are unique on core acquisition pages
- internal links must resolve to existing public pages
- no runtime image hotlinks on key editorial surfaces when a reviewed same-origin asset can be used

## 9. Structured data

Current event pages must remain truthful.
Google Event rich-result eligibility requires precise event name, start date and a Place with detailed address.

We currently must NOT invent missing addresses.
Next structured-data upgrade requires a separately verified venue-address registry from primary venue sources.

Reference:
- https://developers.google.com/search/docs/appearance/structured-data/event

## 10. Measurement

Primary acquisition funnel:
1. Search impressions
2. Search CTR
3. Landing page
4. Internal city/work/event continuation
5. Official external exit
6. Return visit

Do not treat impressions, events or pageviews as people.

### Search Console blocker
As of 2026-09-22 the connected Search Console integration only exposes:
- https://emotion-bookstore.vercel.app/
- permission: siteUnverifiedUser

The canonical domain https://emotionbookstore.com/ is not available with usable permission in the connected integration.

Until the canonical property is verified/connected:
- continue technical SEO and content operations
- do not claim query/ranking improvements from unavailable GSC evidence
- do not optimize based on guessed keywords

Once connected, weekly review:
- queries with impressions but weak CTR
- pages with impressions but weak CTR
- city/media intents that are appearing organically
- non-brand vs brand query share
- old Vercel URL persistence

## 11. Site-move rules

The old Vercel hostname may remain visible temporarily while Google recrawls.
Keep permanent redirects, self canonicals, internal links and sitemap aligned to the new domain.
Do not remove redirects early.

Reference:
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/crawling-indexing/301-redirects

## 12. Distribution

Do not depend on SEO alone.

For each meaningful weekly/editorial update:
- HOME / weekly issue is canonical source
- X: one concrete scene or reason to go, deep-link to the relevant page
- note: only when the topic merits more explanation; link to the canonical city/article/event surface
- preserve src parameters only within approved bounded measurement vocabulary

Do not create many low-value channels.

## 13. Stop conditions

Do not publish a new acquisition page when:
- it is only keyword variation of an existing page
- there is no distinctive content
- the underlying event is pending/unreviewed/expired
- the page exists only to catch traffic
- a title promises a scope the page does not actually satisfy

## 14. What to learn next

Highest-value evidence:
1. Which non-brand search intents first surface the site?
2. Does time-intent (“今週/週末”) outperform pure city intent?
3. Do city + cultural-medium pages lead to official exits?
4. Does the editorial lens improve continuation versus utility-only pages?
5. Which cross-media bridge most often moves a reader into a real-world action?

Decisions should follow evidence, not a predetermined answer.


## 15. Michiyomi / Mapillary street-detail source lane — RESEARCH

Purpose: use public streetscape evidence to discover small, hard-to-source details of a neighborhood without turning Emotion Bookstore into a map database.

Michiyomi is a **discovery source**, not an editorial authority. It converts public Mapillary street imagery into coordinate-searchable Japanese descriptions and exposes the originating Mapillary image page. The current public dataset is CC BY-SA 4.0 and preserves capture year / scene id / generation / provenance.

### First product hypothesis

Existing city pages are good at named cultural objects (venues, books, events) but weak at the unnamed texture between them: alleys, shutters, stairs, small public spaces, street furniture, traces of old uses, and other things a founder cannot realistically photograph or research one by one.

A reviewed Michiyomi scene may become a **街の断片 / street fragment** when it adds a concrete reason to look at the city differently.

Do not auto-publish Michiyomi analysis. Candidate flow:

1. Start from an already-approved public city/venue coordinate.
2. Call coverage first.
3. Retrieve nearby scenes.
4. Store candidate metadata only: snapshot, scene id, capture year, distance, summary, image_page, generation, license/attribution.
5. Human editorial review decides whether the scene has cultural value.
6. Verify the scene is public-street context and does not invite entry onto private property.
7. Publish at most a small finite set inside an existing city/article surface.
8. Keep the capture year visible. A past image is not current-state evidence.
9. Keep a direct link to the Mapillary source page and Michiyomi attribution.

### Publication boundary

Initial pilot should **not embed Mapillary imagery**. Link to the source image page instead. This avoids inventing an image-delivery path and keeps Mapillary display-compliance separate.

If inline source imagery is later tested:
- visible Mapillary logo/link is mandatory per Michiyomi documentation,
- license/provenance must remain visible or reachable,
- image access method must comply with Mapillary terms,
- do not copy image bytes into the repo without a separately verified right to do so.

For text derived from Michiyomi:
- preserve source scene id, capture year, release/snapshot and attribution,
- clearly separate Michiyomi/VLM observation from Emotion Bookstore human editorial,
- do not silently convert model interpretation into a factual place identity,
- preserve CC BY-SA obligations for the derived material.

### Safety / trust rules

Reject a candidate when:
- it chiefly depicts a private residence or identifiable private-life context,
- its value depends on guessing who owns/uses a place,
- the copy would imply public access that is not verified,
- capture year is missing or unreliable,
- the interesting claim exists only in VLM interpretation and cannot be presented as an interpretation,
- the only reason to publish is novelty or SEO volume.

Never label a scene as an actual destination such as “秘密基地” unless public access and identity are independently verified. A visual resemblance may be described editorially only as an impression, not a fact.

### Pilot success condition

One existing city only. Prefer 高円寺 for the first test because the current product already has a strong street/culture identity there.

Pilot evidence:
- 10–20 nearby Michiyomi candidates reviewed,
- 1–3 genuinely distinctive fragments selected,
- each fragment has source/provenance/capture-year intact,
- at least one fragment creates a useful continuation to an existing work/place/event,
- public rendering does not add a new feed, ranking, or infinite map,
- social/deep-link copy can point to the same city page rather than creating thin SEO pages.

Do not roll out to all five cities until one-city editorial value is visible.

### Research tooling

Use `tools/michiyomi-scout.js` for read-only candidate collection. It checks coverage before nearby scenes and outputs review JSON to stdout only. It does not publish, write to the product inventory, download images, or infer place identity.


### Koenji pilot evidence

The source lane has now been tested against the live Michiyomi API on the research branch.

- Koenji Station, 500 m: coverage reported 1,583 released scenes. A proximity-first sample was dominated by rail-cab/platform imagery. Station-center nearest search is therefore not a useful editorial strategy by itself.
- Koenji-kita neighborhood, 250 m: coverage reported 138 released scenes. Street-level results included narrow alleys, potted-plant edges, walls/signage and mixed residential/small-shop streets. Human screening surfaced a small review set, but many scenes remain private-life-adjacent and require source-image review.
- Za Koenji cultural anchor, 250 m: coverage reported 464 released scenes. A larger sample surfaced several non-residential candidates around under-rail commercial space, shutters, shopfronts, arcades and the boundary between cultural/transport infrastructure and the street.
- The editorial screen must be conservative and explainable. A term-matching false positive caused by the place name “Koenji” was found during the pilot and repaired; this is a reminder that machine screening is triage only.

Decision from the pilot:
**multi-anchor cultural-object sampling is promising; station-center nearest-only sampling is not.**

Next research gate:
1. start from existing approved cultural/public anchors,
2. collect a finite nearby pool,
3. remove transport-only and private-only noise,
4. human-review the Mapillary source image,
5. select at most 1–3 fragments that change how the city is seen,
6. only then design a public “街の断片” module.

No candidate from this pilot is Production-approved yet.


## 16. Michiyomi observation-to-cultural-context — three bounded uses (2026-09-23)

Founder intent: use open streetscape observations to make outings more concrete, including small facilities and the story behind something a visitor noticed. Acquisition remains the first priority: give a reader a specific reason to open an existing city page and continue to a real cultural destination. This section extends the research lane in §15; it does not approve production inventory.

### What is actually obtainable

- `/v1/coverage`: number and capture-year distribution around a coordinate. Zero means no observation, not absence of a feature.
- `/v1/scenes/nearby`: nearest photographed scenes, scene id, capture year, rough position, summary and Mapillary image-page link. The nearest photographed point need not be the nearest object or public entrance.
- `/v1/scenes/{id}`: source metadata; machine features including color/green view and geometric direction when available; VLM interpretation including permanent objects, signage, townscape, street structure, walkable-width estimates, tactile paving and visible infrastructure. The interpretation can be mistaken; width and building age are estimates.
- `/v1/changes/nearby`: selected cross-year observations. They are leads for an editorial story, not independent confirmation of construction dates or the present condition.
- `GET /v1/amenities/nearby` is now listed in the live `/v1` self-description and API wiki for `kind=vending_machine|toilet|bench`; `POST /amenities/search` accepts a JSON body so visitor coordinates need not be put in a URL. A live bench query around 高円寺北二丁目 returned 2023 and 2026 photo observations, while a 2022+ toilet query within 500 m returned zero. Those results are camera positions and capture-time clues, never a complete/current inventory, exact equipment locations, public access or opening hours. Keep the API contract and response under review before implementation.

| Visitor question | Role for Michiyomi | Required second source | Initial Emotion Bookstore surface |
| --- | --- | --- | --- |
| 「これ、何だろう。なぜここにある？」 | Recorded sign, facade, street furniture, former-looking trace or changing streetscape; capture-year/source link | Official facility, municipal archive, operator or other attributable primary history to establish identity and meaning | One reviewed 「街で見たもの」 card inside an existing city/article page, linked to an existing cultural object |
| 「このあたりで少し休める？」 | A photographed bench/shade or public-space clue | Facility/park operator for public access, opening hours and restrictions; fresh confirmation for practical claims | Optional practical note on the relevant city/outings detail, only if there is a verified usable place |
| 「行くまでの街はどんな感じ？」 | Captured street texture, greenery, arcade, underpass and source photo | Existing approved destination coordinates and official access information; no safety or accessible-route claim from one image | One contextual observation beside an approved cultural destination |
| 「この景色は変わった？」 | Before/after lead with years and image IDs | Independent official/archival evidence for the cause, dates and cultural interpretation | Article idea only after corroboration; no auto-generated change pages |

Editorial joining key: `city_id + approved public cultural anchor + scene_id`. Preserve `snapshot, capture_year, observed_feature, feature_confidence, source_image_page, source_license, checked_at`; keep separately `place_identity, identity_source, historical_context_source, current_facility_source, human_editorial_text, review_status`. A photographed object is not automatically a named place. A scene coordinate is the camera location, never a proved object coordinate or route endpoint. Keep the raw AI observation distinct from the human-written explanation and from current operational facts.

### First reviewable high-value slice

Use the already collected Koenji-kita and Za Koenji samples; do not rescout the station-centre 500 m noise. Select up to three source-image candidates with distinct public-street details. For each, write a two-sentence editorial draft: (1) what the dated image visibly records, (2) what a separate source explains about the named cultural place/object or why it invites a look on the way to an existing destination. If identity or public access cannot be corroborated, retain the observation only as an internal lead. Reject private-residence-centred, rail-cab-only or uncertain-year scenes.

The first production candidate, if any, belongs in the existing Koenji city page as a small finite card. It should lead to an existing work, venue, event or article; a dated Mapillary source link and source attribution remain visible. Do not add a standalone map, location permission, photo upload, crowdsourced reports, automated object recognition, or a new indexable keyword page in this pilot. Those would change the product/privacy/operations scope and need separate evidence and authority.

For facilities, do a separate one-place desk check after the cultural card: inspect a Michiyomi bench/toilet clue and an official operator or municipal listing for the same place. If current access, hours, exact location or usability is uncertain, do not publish a utility promise. Vending-machine products and live stock are outside this source's coverage. Never turn estimated widths, risk cues or tactile-paving observations into accessibility or route-safety assurance.

### Release and acquisition gate

1. Verify original Mapillary images visually, scene year/location, matching official identity, public access, rights/attribution, and the precise claim the card makes. Keep CC BY-SA-derived observation attribution; inline source images need a separately verified compliant delivery and visible Mapillary logo/link.
2. Human Editorial must explicitly approve any new interpretive copy. Pending remains unpublished under the existing fail-closed gate.
3. Check the published card on mobile, its source/official links, fallback when an external image is unavailable, canonical and sitemap consistency. Do not infer a successful render from a URL or build result alone.
4. Observe whether the existing city page gains non-brand search impressions when Search Console access is healthy, then continuation from card to cultural destination and official exit. With unavailable canonical Search Console data, label acquisition effect UNKNOWN; clicks and events are not people.
5. Stop the pilot if no reviewed scene yields a distinct cultural connection, if source imagery cannot be checked, if current facility facts cannot be verified, or if a card attracts curiosity but does not connect to an actual cultural experience. Do not expand to five cities by copying the format.

### One source-checked editorial specimen — pending Human Editorial

**Candidate: 庚申通りの名前をたどる.** Michiyomi scene `538363923973908` was captured in 2015 at the camera point 35.708068, 139.649746 (高円寺北二丁目). A visual check in Michiyomi's photo viewer confirms a pedestrian shopping street with lamps, storefront signs and passersby. The scene analysis mentions 高円寺オズ歯科室 and KA・RA・DA factory; the present [庚申通り商店街 map](https://koushindoori.com/map) lists these businesses in the street. The [商店街's own historical note](https://koushindoori.com/about/mame1), attributing its account to the 杉並区教育委員会, explains its 1716 庚申塔. **The tower itself is not established by this photo**, and the 2015 storefronts do not establish today's tenants.

Proposed copy for review: 「2015年の写真に写る庚申通り。商店街が伝えるその名の背景には、1716年に建てられた庚申塔があります。高円寺には、小説の題名から愛称が生まれた別の『純情商店街』も。二つの名前から、この街と一冊の本をたどってみませんか。」 Link the final sentence to the existing [『高円寺純情商店街』 work page](https://emotionbookstore.com/discover/koenji/junjo.html), whose cultural connection is corroborated by the [純情商店街自身の説明](https://www.kouenji.or.jp/event/9871.html). The two named shopping streets must remain distinct in wording and presentation. Attach the capture year, [Mapillary source image](https://www.mapillary.com/app/?pKey=538363923973908), scene ID, snapshot `2026-09-13-r1`, `© Mapillary contributors (CC BY-SA 4.0) を加工 / みちよみ`, and the [商店街の解説](https://koushindoori.com/about/mame1). The cultural continuation is to the existing book page, not a claim that the two names denote the same street. The wording is an editorial draft, not an approved public fact card.

**Facility desk check:** live `GET /v1/amenities/nearby?lat=35.70807&lon=139.64975&kind=bench&radius_m=500&limit=3&year_from=2022` yielded `bn_9d48bd4cc979b1f2` (2023, camera 292 m away, scene `641250834808470`) and `bn_3b0133932fbc5bda` (2026, camera 409 m away, scene `1931076524219118`). Both say `evidence=ベンチ：良好`, one VLM-derived observation each, and `position_basis=capture_location`. The same query for `kind=toilet` yielded 0 for 2022+ within 500 m; this says nothing about real-world absence. Neither bench is approved as a public resting spot: source images, exact equipment location, property/access and current condition need an operator or municipal source and fresh check.

The first editorial candidate joins a dated visible street scene to attributable local history. The facility lane has a live read-only API but a higher current-use burden. This is a reason to pilot the history card first and hold utility claims until verified.

Primary source checks: https://michiyomi.dev/ ; https://michiyomi.dev/docs/ ; https://michiyomi.dev/v1 ; https://michiyomi.dev/v1/meta ; https://michiyomi.dev/vending/ ; https://michiyomi.dev/toilet/ ; https://michiyomi.dev/bench/ .


## 17. Visible-street-photo operating loop (2026-09-23)

**Decision and current proof.** The owner clarified that the value of joining a Michiyomi observation ID to Mapillary is being able to see the corresponding photograph on the cultural page. Sources and technical provenance belong primarily in 「データの扱い」 and 「写真・出典」. The approved Koenji text and scene `538363923973908` now appear with the 2015 photo on `/discover/koenji/`; PR #57 was merged at `5ab596b79e0607a1491702ae9ac0cbacac045613`. A production browser check found the same-origin JPEG loaded at 1024×768 natural size, with the photograph visible, logo loaded and the data-handling link working. The photograph is a dated record, not today's facility or storefront inventory. This paragraph supersedes the earlier specimen's “pending Human Editorial” and “source link only” status for this one card; it does not preapprove any other scene or copy.

### Sequence and acceptance

1. **Keep the current card usable.** On each relevant release, check its actual image render on desktop and mobile, the book link, data-handling link and image credit. Broken image or wrong scene is a release defect. Preserve the local licensed image and visible Mapillary logo/link so the card does not depend on a Mapillary login or a third-party image hotlink.
2. **Record a baseline before adding another card.** Inspect existing aggregate signals for `/discover/koenji/`: non-brand search impressions and query/landing context if the canonical Search Console property is accessible; city-page reach, onward navigation to `/discover/koenji/junjo.html`, and official exits using only events already collected. Mark unavailable signals **UNKNOWN**. Do not equate impressions, clicks or events with people, nor attribute an overall city-page change to this card without a comparison.
3. **Review one more Koenji candidate, not a batch.** Start from the already collected candidate scenes. Require a retrievable and visibly checked source photo, capture year, scene/snapshot identity, a distinct photographed feature, independent primary evidence for any historical or place claim, a concrete cultural destination already on the site, and human editorial approval of interpretive copy. Record rejection reasons. If nothing meets all conditions, publish nothing and move to the next acquisition task.
4. **Keep facilities in a separate verification lane.** A Michiyomi bench/toilet/vending-machine observation is a lead at the camera location and capture time. Publish practical use only after separately confirming the actual facility location, public access, current status and relevant hours/restrictions with an operator or municipality and a fresh check. A zero-result query does not mean absence. No route-safety or accessibility assurance from VLM descriptions.
5. **Expand only on evidence.** After observing whether Koenji visitors can see the photo and continue to a work or real destination, evaluate one other existing city and its existing cultural anchor. Reuse the editorial gate, not the same story format. Do not multiply indexable scene/keyword pages, automatic listings or map UI merely to increase page count.

For every published card, keep `city_id + approved cultural anchor + scene_id`, image delivery path and source page, capture year, snapshot, visible observation, independent meaning/current-use source, author/license, editorial approval, checked date, and destination. The page carries only the image, date, concise credit and cultural action. Detailed source URLs, observation ID, rights and currentness limits go in `data.html` and `credits.html`. If a contributor's individual name is unavailable from the source data, do not invent it; retain `© Mapillary contributors` and the precise image link.

**Operating priority:** acquisition and cultural continuation first; image integrity and weekly freshness remain required. Use existing QA and rights/privacy checks. Spend, paid APIs, unclear rights, changed user-data flows, irreversible deletion and major brand changes go to the owner. Routine research, editorial drafts, safe corrections, QA and previously authorized production release can proceed without repeated permission. The next concrete action is the existing-metrics baseline; if access is blocked, record UNKNOWN and screen the second Koenji photo candidate as read-only work.
