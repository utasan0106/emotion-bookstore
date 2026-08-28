# Tokyo Pilot — Human Test V3.1 Operator Pack

Purpose: bind the current Art Direction runtime to one reproducible, privacy-minimal Cycle 01 measurement contract without changing participant-facing runtime code.

This directory belongs under `v3-prototype/tokyo-pilot-01/qa/human-test-v3/`. The parent `qa/` path is already excluded from the Vercel participant delivery surface.

## What V3.1 adds

- manual `first_open_latency_s` diagnostic measured from the end of the neutral `どうぞ` prompt to first voluntary Open; no runtime timer/telemetry
- `first_reveal_payoff` diagnostic asked only after the four existing post-session questions
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
9. run 12–18 first-time participants using `assignments.csv`
10. `python3 qa/human-test-v3/analyze.py qa/human-test-v3/scorecard.local.csv`
11. map the aggregate result to `decision_matrix.md`; choose one next action only

A freeze is invalid immediately if Git HEAD or any frozen file changes, or when the JIT freshness window expires.

## Data boundary

`scorecard.local.csv`, `result.json`, and `result.md` are ignored local working files. Raw rows and raw quotes do not go to GitHub or Drive. Only aggregate/de-identified cycle decisions may be copied into canonical history. `freeze.json` is not ignored because a cycle operator may intentionally commit the exact artifact identity on an isolated branch after JIT verification; never generate a freeze early.

The Freeze binds the exact Git HEAD, exact participant runtime/media/contracts, the four committed Art Reset screenshots, the exact isolated Preview URL, Founder Visual GO, and the JIT official-source timestamps.

Use an immutable deployment-specific Preview URL when possible, not a mutable branch alias. Regardless, `--check-only` compares every participant runtime/media byte to the frozen local checkout immediately before exposure.
