# Tokyo Pilot Cycle 01 — Moderator Sheet / Measurement V3

Status: **operator-only / no runtime telemetry / no participant PII**

## Before the first participant

From `v3-prototype/tokyo-pilot-01/`:

```bash
python3 qa/human-test-v3/prepare_workspace.py
python3 qa/human-test-v3/preflight.py
```

Proceed only if preflight prints:

`HUMAN_TEST_V3_PREFLIGHT_TECHNICAL_GO_MANUAL_FRESHNESS_REQUIRED`

Then reverify the three official sources immediately before exposure. If any current fact/action/right basis is unclear, stop. Do not estimate.

## Consent

Say:

> 試作の確認です。操作と、終わった後の回答を匿名IDでメモします。氏名や私的な内容は集めません。時間の制限はありません。途中でやめられます。参加してよければ始めます。

Continue only after explicit yes. Record only `consent_confirmed=yes` in the research scorecard. Scheduling contact details, if any, stay outside the scorecard.

Do not state a duration (`3分`, `5分` …) here or anywhere before the session. A stated
duration tells the participant how long they are expected to look, which shapes both the
latency measurement and how far they scroll.

## Prior exposure — ask before starting

First-time evidence is the whole point of Cycle 01. Before the session, ask plainly:

> この画面を前に見たことはありますか。あるいは、この中身について前に説明を受けたことはありますか。

Record `prior_pilot_exposure` as `yes` / `no`. Answer `yes` when any of these is true:

- has operated this Tokyo Pilot screen before
- has seen the Art Reset screenshots before
- was told the 3 Objects / Hooks / Reveals in advance
- was given the project's Human Test hypothesis in advance

Knowing the brand name alone is **not** exposure — record `no`.

A `yes` participant may still run the session, and their session is useful as qualitative
reference. The analyzer excludes them from primary valid n and from the GO thresholds.
Do not talk the participant out of a `yes`.

## Start

Open the participant's assigned URL from `assignments.csv`.

Load the page in advance **with the screen out of the participant's sight** — turned away,
face down, or held by the moderator. Let it fully settle without scrolling. The participant
must not see any part of the page before the prompt.

Then say only:

> これ、少し見てみてください。自由にどうぞ。

At the end of `どうぞ`, do these two things **at the same moment**:

1. show the screen to the participant
2. start the operator-side stopwatch

Showing the page first and starting the timer a few seconds later is not allowed — the
participant would already be reading, and `first_open_latency_s` would understate the real
First Pull. Equally, do not start the stopwatch before the screen is visible.

Stop the stopwatch on the first voluntary Object Open. Do **not** add timer code to the
webpage: latency is an operator stopwatch value only, and stays a diagnostic.

Do not explain the product thesis, that there are exactly three items, Human Editorial, emotion, Return Desire, or which action is desired.

## Observe silently

Record in ignored local `scorecard.local.csv`:

- `prior_pilot_exposure`: yes / no （セッション前に確認したもの）
- `recruitment_relation`: unknown / weak_tie / close_tie （下記）
- `device`: mobile / desktop / tablet
- `voluntary_open`: yes / no
- `first_open_latency_s`: approximate relative seconds if captured; blank is allowed if the operator misses it
- `first_object`: canonical ID of the first voluntarily opened Object
- `opened_objects`: canonical IDs separated by `;`, in first-open order
- `objects_opened`: 0 / 1 / 2 / 3
- `raw_spontaneous_utterance`: short verbatim only; omit identifying/private detail
- `official_action`: yes / no

Canonical IDs:

- `manuscript-cafe`
- `hachiko-taxidermy`
- `meguro-tapeworm`

Do not infer sentiment, mental state, or a hidden reason from speech. If a response contains a name, contact detail, health/mental-state detail, or another private detail, do not transcribe it; retain only the short non-identifying Product-relevant portion or write `[omitted]`.

## After the participant naturally stops

Ask in exactly this order. **Return Desire comes first.**

1. `次の3つが入ったら、また見たいですか？` — yes / maybe / no + short raw reason
2. `これ、どんな時なら開きそうですか？`
3. `こういう時、普段は何を使いますか？`
4. `それで十分ですか？ それとも、これは別の使い道がありそうですか？`

Why Return Desire is first: asking the occasion question first makes the participant
construct a use case out loud, and they then answer Return Desire against the case they
just built. That inflates Return Desire. Taking it first keeps it closer to the bare
reaction to what they actually saw.

Coding:

- `return_desire`: yes / maybe / no
- `existing_alternative_sufficient`: yes / no / unclear
- `distinct_v3_use`: yes / no / unclear

Use `unclear` instead of guessing.

Then, **only if at least one Object was opened**, ask the final diagnostic question:

> 最初に開いたものについて、開く前に見えていた情報より、開いたあとに何か増えましたか？

Record `first_reveal_payoff` as yes / maybe / no. A short raw reason is optional. If no
Object was opened, leave Reveal fields blank.

Feature requests are recorded only if the participant raises one **after all five questions
above**. Never solicit one. Never ask what they would add.

Do not interpret answers. `unclear` stays `unclear`; a hesitant `maybe` is `maybe`, not a
`yes` with a caveat. Do not infer mood, personality, or motive from tone.

## Recruitment relation

Record one value per participant, chosen by the moderator before the session:

- `unknown` — no personal relationship with anyone on the project
- `weak_tie` — acquaintance, colleague of a colleague, someone met once
- `close_tie` — friend, family, direct coworker

Target for the **first 12 primary-valid participants**: `unknown` + `weak_tie` ≥ 2/3, and
`close_tie` ≤ 1/3. The analyzer reports the actual distribution as a validity note.

If the target is not met, do **not** discard anyone. Keep the sample, and read a
close-tie-heavy result as weaker evidence of market demand. Nothing beyond these three
categories is recorded — no name, employer, age, address, gender, occupation detail, or
mental state.

Paid recruitment, incentives, gift cards, panels, or vendor contracts require Founder
approval before any commitment or spend.

## After a batch

```bash
python3 qa/human-test-v3/analyze.py qa/human-test-v3/scorecard.local.csv
```

Latency and Reveal payoff are diagnostic only. Missing diagnostic values create completeness warnings, not a fake Product failure. Core decision thresholds remain Open / Return / order balance.
