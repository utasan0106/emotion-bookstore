# Tokyo Pilot 01 — Human Test Cycle 01

Status: **TECHNICAL GATES GREEN / BLOCKED ON THE HUMAN FACT RECHECK / PRODUCTION NO-GO**

Prepared: 2026-08-27 JST
Last verified: 2026-08-27 JST — all mechanical gates GO (see Precondition below)
External participant recruitment / distribution: **NOT STARTED**
Remaining blocker before any participant sees the page: **Precondition 13**

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

Run these three commands. All must pass on the exact commit the participants will see.

```bash
node pilot_check.js --external-cycle   # → PILOT_CHECK_GO
python media_validate.py               # → MEDIA_VALIDATE_GO
NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js   # → BROWSER_QA_GO
```

What they mechanically enforce (do not re-check these by hand):

1. Exactly 3 Objects, finite ending, no search/account/save/history/ranking/feed.
2. All 3 runtime media are same-origin and `mediaPolicy="same-origin-localized"`.
3. `MEDIA_LOCALIZATION_EVIDENCE.json` has exactly 3 records with source URL/page,
   runtime SHA-256, byte size, dimensions, rights basis, attribution, modification
   note, `human_test_scope_only=true`, `production_promotion=false` — and the real
   bytes on disk match all of them.
4. No Real Media is cropped by its frame. Each Object declares `mediaCrop` and
   `mediaCropNote`; all 3 are currently `none`. Meguro's 8.8 m length and the Cafe
   poster's lettering are preserved at every viewport.
5. Pre-open cards leak no Reveal answer (`objectName`, 剥製, 標本, 1986, 精算 …) and
   no internal term (`verifiedNote`, Reveal, Human Test, Pilot …).
6. `ひらく` is an in-page dialog control, never an external-link affordance.
7. Official Action is HTTPS, `noopener noreferrer`, opens only on click.
8. Dialog opens, Reveal is the dominant element, Escape closes, focus returns to
   the trigger, no horizontal overflow — at 320/390/430/1024/1440.
9. Storage writes 0, cookies 0, fetch/XHR/sendBeacon 0, external requests 0.
10. All six order permutations preserve the same 3 Object identities.
11. First Pull: whichever Object is first, its Real Media + full Hook + `ひらく`
    are visible without scrolling, at all 5 viewports.
12. Every dated fact is still inside its stated window. `--external-cycle` turns an
    expired `expiresAt` into a hard FAIL, and participant mode refuses to render.

## Precondition that is NOT mechanical — a human must do this

**13. Reverify the current official facts against the primary sources, immediately
before the cycle**, and update `verifiedAt` / `expiresAt` / the facts rows if
anything moved:

- Cafe schedule and rules — https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/
- Hachiko exhibit record — https://db.kahaku.go.jp/exh/detail?cls=col_z1_01&pkey=1759522
- Meguro hours / closures / admission — https://www.kiseichu.org/information

Do not fill a gap with an estimate. If a source is unreachable or has changed in a
way you cannot confirm, STOP the cycle and record it.

> **Open blocker (2026-08-27):** this was not done in the current run. All three
> official domains, plus `commons.wikimedia.org`, are blocked by the development
> environment's network egress proxy, so no primary source could be read. The
> Cafe's `expiresAt` is `2026-08-30T16:00:00+09:00`; after that the participant
> gate closes by itself. Item 13 must be completed from a network that can reach
> these sources before any participant sees the page.

## Media scope

Current same-origin assets are source-pinned **technical derivatives for this isolated Human Test only**:

- `assets/manuscript-cafe.png` — 640×905
- `assets/hachiko.jpg` — 2048×1536, proportional Google-ingest/export derivative of the pinned Commons source
- `assets/meguro-tapeworm.jpg` — 1363×2048, proportional Google-ingest/export derivative of the pinned Commons source

They remove runtime hotlinks and keep the full frame. They are **not Production media approval** and must not be promoted to main/Production without the later Production media/legal/quality gate.

Each is displayed at its own aspect ratio, in both the card and the detail. Nothing
is cropped, and nothing is pillarboxed into a grey band. If a future Object needs a
crop, declare it as `mediaCrop` plus a written `mediaCropNote` saying which edge may
be lost and why — `pilot_check.js` refuses an undeclared one.

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
