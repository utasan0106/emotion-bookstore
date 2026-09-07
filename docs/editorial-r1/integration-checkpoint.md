# Post-Beta R1 integration checkpoint — 2026-09-07

## Candidate identity

- Branch: `astra/post-beta-r1-integration-20260907`.
- Accepted cumulative content: `c57ca7c6edfd8854ccb19f528186874d14308355`.
- GitHub main verified read-only through connector: `5ca8c4e1543d30ca34822c087bdc0090c3deb964`.
- Local main/origin-main are stale; not used as release identity.
- PARKS, LADY JANE, Boris context and SUNSET NOTES already share one ancestry. No integration merge is required.
- This checkpoint changes QA only, not public content. PR, merge and Production deployment remain deferred.

## QA compatibility repair

PARKS and LADY JANE browser checks protected the entire Works page against their earlier branch bases. This incorrectly rejected later accepted Boris/SUNSET additions. Only the Works comparison now uses the immutable accepted content SHA above. All other protected files and existing Thread comparison bases remain unchanged. Independent read-only review: PASS.

## Reference review: useful experience, not added scope

References read 2026-09-07:

- https://speakerdeck.com/yuichi_hara7/ii-ui-toha-shoshinshamuke-ni-jirei-o-moto-ni-ui-dezain-o-bunkai — transcript, including slide 29. Function, benefit, value and experience are separate questions; the slide's example is a calendar. No claim of visual slide review.
- https://www.reelstreets.com/films-archive/ — archive explains title entries lead to film details, stills and “now” photographs; title, date, stars and locations are listed as fields. Dynamic film rows did not load in the text reader.
- https://www.reelstreets.com/about-us/ — stated focus is recognisable exterior filming locations and how they changed over time.

Editorial application (our decision, not a claim made by either reference):

1. A link should say what the reader will open.
2. A Thread should explain a sourced connection, then offer a real work/place/official-information exit.
3. Distinguish filming location, story setting, production background and a present-day place. One does not establish another.
4. A current contextual photograph is not a film still or evidence of an earlier event. Retain date, creator, license and caption.
5. No new map, then/now widget, search or archive inventory is required for this release. Adopt the editorial discipline in existing scenes and source links.

ReelStreets is a reference, not permission to reuse its images. Future images continue to require item-level Wikimedia Commons/Unsplash provenance and applicable license checks.

## Preview transport hold

Normal branch push failed: Git could not read a GitHub username in this environment. No remote branch was published by this attempt.

The connected Vercel team is visible but lists no projects; a read-only lookup of the known previous deployment returned not found. This does not establish that the public deployment is missing. Do not create a replacement project or change domains to bypass access.

Next operational action after local QA: transfer this exact reviewed candidate through the existing authorized repository connection, then verify its Preview. Do not mark Preview or Production complete from local tests.

## Local validation result

| Check | Result |
| --- | --- |
| PARKS browser | 101 checks GO |
| LADY JANE browser | 87 checks GO |
| Existing Thread browser | 1001/1001 GO |
| Works browser | 390/390 GO |
| HOME/Shelf release browser | 776/776 GO |
| Release static checks | GO |
| Measurement selftest | 426/426 GO |
| Independent QA-diff review | PASS |
| Diff whitespace | GO |

These browser checks use local servers and controlled external requests. They do not establish live external-link health or Vercel routing. Existing public-content screenshots from the component work remain applicable because this checkpoint changes no rendered content. Preview screenshot verification remains pending access.
