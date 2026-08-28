# Tokyo Pilot Cycle 01 — Precommitted Decision Matrix

Status: **analysis contract / no participant results yet / Production NO-GO**

Purpose: resultsを見た後に都合の良い物語を作らないため、Cycle 01で観測し得る代表パターンと次アクションを先に固定する。

Cycle 01は12–18名のsmall behavioral testであり、単独でProduct-market fit、Production GO、Product KILLを証明しない。

## Measurement validity first

結果をProduct解釈する前に以下を満たす。

- valid consent rowsのみ
- n ≥ 12でGO判定可能（n不足は`INCOMPLETE`）
- six order assignments balanced within ±1 for `GO_CANDIDATE`
- device別に重大なruntime-only failureがない
- frozen artifact identityが維持されている
- moderatorがProduct thesis/Return hypothesisを先に説明していない

Invalid / biased dataを「弱いProduct」または「強いProduct」のEvidenceへ変換しない。

## A. Open ≥60% / Return Yes ≥40% / order balanced

**Decision: `GO_CANDIDATE` → independent Cycle 02.**

Do:
- same interaction grammar with a different exactly-3 Object set
- diversify at least one content domain / context; do not simply use three more museum oddities
- reproduce voluntary open + return desire

Do not:
- Production deploy
- account/save/feed/recommendation build
- claim PMF
- optimize engagement

Reason: Cycle 01 may only prove this exact three-item shelf works.

## B. Open ≥60% / Return Yes <40%

**Interpretation: First Pull works, repeat reason is weak.**

Likely risk: “one-time trivia / curiosity gallery.”

Next action:
- do not add retention mechanics
- inspect raw return reasons and `existing_alternative_sufficient`
- test whether a genuinely different Set 02 creates a reason to revisit
- if users say Instagram/Google/TikTok/Atlas-like sources are sufficient, treat as structural warning

Do not rescue with notifications, streaks, accounts, favorites or infinite supply.

## C. Open <60% / Return Yes ≥40%

**Interpretation: people who engage may value the concept, but First Pull is too weak or entry friction remains.**

Next action:
- inspect object×position + first-object diagnostics
- inspect whether all Objects fail or only one/two
- change one of Real Media / Hook / first-screen hierarchy at a time
- rerun bounded Cycle 01-style validation before Set 02

Do not conclude “users want more content” from this pattern.

## D. Open <60% / Return Yes <40%

**Decision: no expansion. `CONTINUE_OR_REVISE`.**

Next action:
- inspect whether failure is runtime/device, content quality, or product thesis
- if runtime is sound and reactions repeatedly say existing services are enough / no distinct use, treat thesis as weak
- run at most one clean corrective cycle if there is a specific falsifiable cause

If a second independent clean cycle remains Open <40% AND Return <25% AND majority reports no V3-specific use reason / existing services sufficient, **Pivot/Kill candidate** under the previously fixed rule.

## E. Open/Return pass, but order unbalanced

**Decision: GO withheld.**

Reason: cannot separate Product strength from position exposure.

Next action: recruit remaining participants into missing orders until balance is within ±1. Do not change Product while repairing assignment balance.

## F. One Object dominates

Diagnostic only; no automatic threshold.

If one Object is opened substantially more across all positions while the other two fail:
- treat as Object/content-specific evidence
- do not infer the three-item Product works
- replace weak Object(s) only after checking Hook→Reveal quality

If the dominant Object wins only in position 1:
- treat position effect as plausible
- do not promote that Object solely on aggregate open count

## G. Device-specific failure

If one device family is materially worse and Browser QA/replay shows interaction/layout defect:
- classify as implementation defect
- fix defect and re-run affected participants/cycle as appropriate
- do not count known broken-device exposure as Product rejection

Device rates are diagnostic; do not segment/personally optimize the Product from this small sample.

## H. Existing alternative sufficient is high

If many participants answer existing alternatives are sufficient and `distinct_v3_use=no/unclear`:
- treat as moat/use-reason warning even when Open is high
- inspect whether V3 is only “interesting content” without a distinct usage moment
- do not respond by adding generic AI/search/social features

## I. Official Action is low

Official Action is secondary. Low action alone does not fail Cycle 01 if Open and Return are strong.

Interpretation: browse/entertainment/discovery may be the immediate value; “go now” is not mandatory for every object.

Do not optimize external click-through at the expense of First Pull/Return.

## Reporting rule

Final Cycle 01 summary must state:

1. validity (n / consent / order balance / artifact freeze)
2. Open Rate + Wilson 95% CI
3. Return Yes / Maybe
4. object×position diagnostics
5. alternative-sufficient / distinct-use evidence
6. device diagnostics
7. the matching matrix branch above
8. one next action only

Raw participant quotes stay local and de-identified. Canonical Drive receives aggregate/decision evidence only.
