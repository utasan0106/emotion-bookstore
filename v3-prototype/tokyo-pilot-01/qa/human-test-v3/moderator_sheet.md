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

> 3分ほどの試作確認です。操作と、終わった後の回答を匿名IDでメモします。氏名や私的な内容は集めません。途中でやめられます。参加してよければ始めます。

Continue only after explicit yes. Record only `consent_confirmed=yes` in the research scorecard. Scheduling contact details, if any, stay outside the scorecard.

## Start

Open the participant's assigned URL from `assignments.csv`.

Let the page visibly settle without scrolling. Then say only:

> これ、少し見てみてください。自由にどうぞ。

Start the operator-side stopwatch at the end of `どうぞ` (the moment free interaction begins), not at page-load start. Stop it on the first voluntary Object Open. Do **not** add timer code to the webpage.

Do not explain the product thesis, that there are exactly three items, Human Editorial, emotion, Return Desire, or which action is desired.

## Observe silently

Record in ignored local `scorecard.local.csv`:

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

Ask these four questions **before** the Reveal diagnostic:

1. `これ、どんな時なら開きそうですか？`
2. `次の3つが入ったら、また見たいですか？`
3. `こういう時、普段は何を使いますか？`
4. `それで十分ですか？ それとも、これは別の使い道がありそうですか？`

Coding:

- `return_desire`: yes / maybe / no
- `existing_alternative_sufficient`: yes / no / unclear
- `distinct_v3_use`: yes / no / unclear

Use `unclear` instead of guessing.

If at least one Object was opened, ask one final diagnostic question:

> 最初に開いたものについて、開く前に見えていた情報より、開いたあとに何か増えましたか？

Record `first_reveal_payoff` as yes / maybe / no. A short raw reason is optional. If no Object was opened, leave Reveal fields blank.

## After a batch

```bash
python3 qa/human-test-v3/analyze.py qa/human-test-v3/scorecard.local.csv
```

Latency and Reveal payoff are diagnostic only. Missing diagnostic values create completeness warnings, not a fake Product failure. Core decision thresholds remain Open / Return / order balance.
