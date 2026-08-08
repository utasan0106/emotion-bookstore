---
name: escalate-to-ceo
description: Use whenever an agent hits a condition it must not resolve on its own judgment — formats the ask as a short status plus up to 3 options and one recommendation.
---

# Escalate to CEO

Escalation is for genuine judgment calls only. It is not a status update and not a way to avoid a decision an agent is trusted to make.

## Conditions that require escalation

- the task brief conflicts with current implementation facts
- storage/data format must change to satisfy the task
- external communication must change to satisfy the task
- completing the task would require changing more than the approved scope
- there is ambiguity that materially affects UX or privacy
- the reviewer has returned `REQUEST_CHANGES` twice in a row on the same task
- `deliver-artifact` could not safely separate product scope from ops/PoC scope in a patch

## Conditions that do NOT require escalation

- GitHub write access failing (403 etc.) — `deliver-artifact` falls back to a patch automatically
- a scope-out file that can be cleanly and mechanically excluded from a patch
- a reviewer's first `REQUEST_CHANGES` on a task — that goes back to the Implementer, not the CEO

## Format

Every escalation to the CEO must be:

1. Situation — 1–2 sentences, no background restatement.
2. Options — up to 3, mutually exclusive.
3. Recommendation — exactly 1 of the above, stated plainly.

The CEO's reply should resolve the escalation in at most 2 steps (e.g. pick an option, or a single "OK"/"NG + reason").

## Never

- bundle multiple unrelated escalations into one message
- ask the CEO to review a diff or explain implementation detail as part of the escalation itself
- proceed past the escalation point before the CEO responds
