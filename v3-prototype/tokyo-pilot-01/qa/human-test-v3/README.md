# Tokyo Pilot — Human Test V3.2 Operator Pack

Purpose: bind the current Art Direction runtime to one reproducible, privacy-minimal Cycle 01 measurement contract without changing participant-facing runtime code.

This directory belongs under `v3-prototype/tokyo-pilot-01/qa/human-test-v3/`. The parent `qa/` path is already excluded from the Vercel participant delivery surface.

## What V3.2 adds on top of V3.1

- screen exposure and the operator stopwatch start at the **same moment** (end of `どうぞ`); the page is loaded in advance but kept out of sight
- Return Desire is asked **first**, before the occasion question, so the participant is not answering against a use case they just constructed out loud
- Reveal payoff stays last; feature requests are only recorded if raised after all five questions
- recruitment copy carries no hypothesis: no stated duration, no fixed question count, no `検索前` / `3つ` / `Human Editorial` / `面白い場所` …
- `prior_pilot_exposure` is asked before the session; `yes` participants still run, but are excluded from primary valid n and every threshold
- `recruitment_relation` (unknown / weak_tie / close_tie) is reported as a validity note over the first 12 primary-valid participants; a shortfall is a caveat, never a reason to discard anyone

GO thresholds are unchanged: valid n ≥ 12, Open ≥ 60%, Return Yes ≥ 40%, six orders balanced ±1.

## What V3.2 final operator contract adds

- `return_desire` accepts `unclear` as a fourth valid value, matching the moderator rule "Use `unclear` instead of guessing." `unclear` stays in primary valid n and in the Return Yes denominator, never counts as Yes, and is never a replacement reason
- the Cycle 01 stopping rule is precommitted below, so `12–18` can no longer be read as "run 12, look at the numbers, then decide whether to add more"

Participant-facing runtime is unchanged by both.

## Cycle 01 stopping rule (precommitted)

Cycle 01 closes at **12 primary-valid participants**. A participant is primary-valid when
consent is valid, `prior_pilot_exposure=no`, the exact frozen artifact was maintained,
there was no pre-defined Major protocol/session failure, and the six orders are balanced
within ±1.

Open, Return, Reveal, and Official Action values are **not inputs to the stopping
decision**.

P13–P18 are a **replacement reserve only**. The allowed reasons to use one are:

- prior exposure exclusion
- consent invalid or withdrawn
- Major protocol deviation
- technical / session failure
- order-balance repair

The following are **not** allowed reasons to run another session:

- Open below or near 60%
- Return Yes below or near 40%
- a wide Wilson interval
- a weak Reveal result
- low Official Action
- a close-tie-heavy relation mix
- operator or Founder wanting to "see a bit more"

A recruitment relation shortfall is a validity caveat only, never a replacement reason.

If all 18 total sessions are used and primary-valid n is still < 12, the cycle result is
`INCOMPLETE`. There is no automatic P19+.

Operator handoff string for `freeze.py --note` (exact, one line):

```
stopping_rule=primary_valid_12;max_total_sessions=18;p13_p18=replacement_only;replacement_reasons=prior_exposure|consent_invalid|major_protocol_deviation|technical_failure|order_balance;outcome_based_extension=forbidden;relation_shortfall=validity_caveat_only;if_max_sessions_and_valid_lt12=incomplete;no_auto_p19_plus
```

## Major deviation handling

A session with a Major protocol deviation — accidental pre-exposure, the moderator
explaining the Product or Return hypothesis, prompting an Open, the wrong assigned order,
a broken required question order, or a runtime failure that made the normal experience
impossible — is handled as follows:

- do not reset that participant and re-run them as first-time
- do not use the session as a primary completed row
- use a replacement reserve session in the **same** order
- keep only de-identified facts in the local operator note

Major/Minor classification is fixed when the deviation happens. Never re-label it after
seeing the Product result.

## What V3.1 adds

- manual `first_open_latency_s` diagnostic measured from the end of the neutral `どうぞ` prompt to first voluntary Open; no runtime timer/telemetry
- `first_reveal_payoff` diagnostic asked only after the other post-session questions
- deterministic analyzer with Wilson intervals, open depth, Object×position, order/device diagnostics
- explicit diagnostic completeness instead of invalidating core Open/Return data when the operator misses a stopwatch/reveal field
- exact Git HEAD + runtime/contract SHA freeze after JIT official-source verification

## Non-goals

No new UI, analytics, storage, account, recommendation, search, private writing, demographic profiling, audio/video, sentiment inference, or Production promotion.

## Exact sequence

1. `python3 qa/human-test-v3/preflight.py`
2. visually approve the current Art Direction screenshots
3. pin the isolated Preview URL and run `node qa/human-test-v3/preview_verify.js 'https://<preview>/v3-prototype/tokyo-pilot-01/'` → `PREVIEW_V3_VERIFY_GO`
4. reverify Cafe / Hachiko / Meguro official sources JIT
5. Founder explicitly approves the four committed Art Reset screenshots, then run `python3 qa/human-test-v3/freeze.py --preview-url 'https://<isolated-preview>/v3-prototype/tokyo-pilot-01/' --visual-gate founder-go --cafe-verified-at ... --hachiko-verified-at ... --meguro-verified-at ...`
6. `python3 qa/human-test-v3/verify_freeze.py`
7. immediately before each participant/batch, re-check the same Preview bytes without mutating evidence: `node qa/human-test-v3/preview_verify.js --check-only 'https://<exact-preview>/v3-prototype/tokyo-pilot-01/'`
8. `python3 qa/human-test-v3/prepare_workspace.py`
9. run first-time participants using `assignments.csv` until **12 primary-valid** are reached, up to 18 total sessions; record `prior_pilot_exposure` before each session and `recruitment_relation` per participant. P13–P18 are replacement reserve only — see the stopping rule above
10. `python3 qa/human-test-v3/analyze.py qa/human-test-v3/scorecard.local.csv`
11. map the aggregate result to `decision_matrix.md`; choose one next action only

A freeze is invalid immediately if Git HEAD or any frozen file changes, or when the JIT freshness window expires.

## Data boundary

`scorecard.local.csv`, `result.json`, and `result.md` are ignored local working files. Raw rows and raw quotes do not go to GitHub or Drive. Only aggregate/de-identified cycle decisions may be copied into canonical history. `freeze.json` is not ignored because a cycle operator may intentionally commit the exact artifact identity on an isolated branch after JIT verification; never generate a freeze early.

The Freeze binds the exact Git HEAD, exact participant runtime/media/contracts, the four committed Art Reset screenshots, the exact isolated Preview URL, Founder Visual GO, and the JIT official-source timestamps.

Use an immutable deployment-specific Preview URL when possible, not a mutable branch alias. Regardless, `--check-only` compares every participant runtime/media byte to the frozen local checkout immediately before exposure.
