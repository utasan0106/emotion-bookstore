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
