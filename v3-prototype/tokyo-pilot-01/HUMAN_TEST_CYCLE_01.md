# Tokyo Pilot 01 — Human Test Cycle 01

Status: **TECHNICALLY READY FOR ISOLATED HUMAN TEST / PRODUCTION NO-GO**

Prepared: 2026-08-27 JST
External participant recruitment / distribution: **NOT STARTED**

## What this test is for

Test only one claim:

> When a person has not decided where to go or what to search for, can three finite Human-curated Tokyo objects create a voluntary open and a reason to return for the next three?

Do not test brand affection, emotion diagnosis, accounts, saving, AI, search, catalog breadth, monetization, or long-term retention in Cycle 01.

## Participants

- First-time users: 12–18
- No need to recruit only culture enthusiasts.
- Do not collect private writing, mental state, detailed demographics, or account identifiers.
- Use anonymous IDs only: P01, P02, …
- If recruitment requires paid incentives or a vendor contract, Founder approval is required before spending.

## Device

Use the participant's natural device when possible. Smartphone is preferred because the primary moment is commute / spare-time browsing. Desktop is allowed; do not force a device switch.

## Precondition — STOP if any fails

1. All 3 exact Pilot runtime media assets are same-origin and `mediaPolicy="same-origin-localized"`.
2. `MEDIA_LOCALIZATION_EVIDENCE.json` exists with exactly 3 records and records source URL/page, runtime SHA-256, dimensions, rights/permission basis, attribution, modification note, Human-Test-only scope, and `production_promotion=false`.
3. `media_validate.py` = GO: all 3 local assets exist, decode, match the recorded SHA-256/byte size/dimensions, and are at least 600 px on the short usable axis.
4. Cafe current schedule is reverified immediately before the cycle.
5. Hachiko and Meguro current official facts/actions are reverified immediately before the cycle.
6. `pilot_check.js` = GO.
7. Real-media Browser QA = GO at 320/390/430/1024/1440.
8. Meguro card/detail must preserve the full-frame evidence of length (`object-fit: contain`); do not crop the 8.8m display into a generic close-up.
9. No storage / GA4 / fetch / XHR / beacon / account / recommendation runtime has been added.
10. All six fixed order permutations preserve exactly the same 3 Object identities; order is the only difference.

## Media scope

Current same-origin assets are source-pinned **technical derivatives for this isolated Human Test only**:

- `assets/manuscript-cafe.png` — 640×905
- `assets/hachiko.jpg` — 2048×1536, proportional Google-ingest/export derivative of the pinned Commons source
- `assets/meguro-tapeworm.jpg` — 1363×2048, proportional Google-ingest/export derivative of the pinned Commons source

They remove runtime hotlinks and keep the full frame. They are **not Production media approval** and must not be promoted to main/Production without the later Production media/legal/quality gate.

## Assignment

Counterbalance position effects with the six fixed orders:

- abc
- acb
- bac
- bca
- cab
- cba

Assign sequentially and repeat the cycle as needed. The only allowed difference is Object order.

Suggested sequence for 18 participants:

P01 abc / P02 acb / P03 bac / P04 bca / P05 cab / P06 cba, then repeat three times.

## Moderator instruction

Before showing the page, say only:

`これ、少し見てみてください。自由にどうぞ。`

Do not explain:
- what the service is trying to do
- that it is curated
- that there are three items
- what "First Pull" or "Reveal" means
- that the test wants them to open something
- anything about emotion or the project's history

Silence is data. Do not rescue weak content with explanation.

## Observe before asking anything

Record:
- Did the participant voluntarily open at least one Object? yes/no
- First Object opened
- Number of Objects opened: 0/1/2/3
- Any raw spontaneous utterance, verbatim when short
- Did they click an Official Action? yes/no

Do not map a participant's ambiguous utterance into `お / まあまあ / いらん`. Those labels were Founder content gates, not participant analytics.

## After they naturally stop

Ask in this order:

1. `これ、どんな時なら開きそうですか？`
2. `次の3つが入ったら、また見たいですか？` — Yes / Maybe / No, plus raw reason.
3. `こういう時、普段は何を使いますか？`
4. `それで十分ですか？ それとも、これは別の使い道がありそうですか？`

Do not ask feature requests until these are answered. If they volunteer one, record it but do not turn it directly into roadmap scope.

## Cycle metrics

Primary:
- **Object Open Rate** = participants who voluntarily opened ≥1 / total participants

Secondary:
- **Return Desire** = Yes / total participants
- Maybe should be reported separately, not counted as Yes.
- Official Action is supporting evidence only; low action alone does not kill the product.

Provisional GO:
- Object Open Rate ≥60%
- Return Desire Yes ≥40%

Kill/Pivot signal after 2 cycles:
- Object Open <40%
- Return Desire Yes <25%
- AND majority cannot name a V3-specific use reason and says existing social/search/AI is enough.

## Interpretation rules

- High Open + low Return: content has click pull but no repeatable product reason. Fix editorial continuity / shelf reason before adding features.
- Low Open + high stated Return: stated preference is weak evidence; fix First Pull before trusting the survey.
- High Open + high Return: proceed to a second independent content set before adding accounts, saving, emotion, AI, or broader media.
- Low Open + low Return: do not polish visual chrome; reconsider the content wedge / product thesis.

## What Cycle 01 must not trigger

Even on GO, do not automatically add:
- accounts
- favorites/history
- personalization
- infinite feed
- ranking
- social reactions
- emotion-first entrance
- book/film/music expansion

First prove the same result with a second independently curated three-object set.
