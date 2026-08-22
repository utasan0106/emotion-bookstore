# V3 AI Handoff v2 — Codex ↔ OpenAI HQ Reviewer

## What this automates

After a bounded task is placed into `.ai-handoff/CODEX_TASK.md`:

1. Codex implements locally in a GitHub Actions checkout.
2. Deterministic scope guard inspects changed paths.
3. OpenAI GPT-5.6 Sol HQ Reviewer independently reviews:
   - HQ rules
   - task
   - Codex report
   - git diff
   - scope guard
   - any Actual screenshots found in the workspace
4. If `LIMITED_FIX`, the review's minimal fix prompt is automatically sent back to Codex.
5. Repeat up to 3 total Codex attempts.
6. `GO` is converted to `CEO_APPROVAL_REQUIRED`.
7. No commit, push, PR, merge, or deploy is performed by the loop.
8. All evidence is uploaded as a GitHub Actions artifact.

## This is not the current ChatGPT thread itself

The GitHub Action uses the OpenAI Responses API to instantiate an automated HQ Reviewer
with the same bounded review contract.

This ChatGPT thread remains the place for:
- CEO visual approval
- exceptions
- strategic decisions
- Production/main/deploy approval

## Required GitHub secret

Repository → Settings → Secrets and variables → Actions

Create:
- `OPENAI_API_KEY`

The workflow remains disabled until you explicitly set `REQUEST.json.enabled=true`.

API usage can incur separate OpenAI API charges.

## Models

Defaults:
- Codex: `gpt-5.6-sol`, reasoning `max`
- HQ Reviewer: `gpt-5.6-sol`, reasoning `max`

You can override with repository variables:
- `CODEX_MODEL`
- `CODEX_EFFORT`
- `HQ_REVIEW_MODEL`
- `HQ_REVIEW_EFFORT`

## Workbench branch

`automation/ai-handoff-v1`

This is an integration workbench only.
It is not main or Production.

## Why one-time bootstrap is required

The current V3 `v3-prototype/**` has historically not been represented by the historical repo HEAD.
The first bootstrap therefore commits the current verified V3 snapshot to the dedicated workbench branch.

That is the only reason the bootstrap performs a commit/push.

## Task lifecycle

Update:
- `.ai-handoff/CODEX_TASK.md`
- `.ai-handoff/REQUEST.json`

Push those two files to `automation/ai-handoff-v1`.

The action runs automatically.

The action itself does not push implementation changes anywhere.
Its final working-tree diff and reports live in an Actions artifact.

A human/CEO decides whether to take that diff forward.

## Deterministic safety

`REQUEST.json` contains `allowed_paths`.

If Codex changes a file outside those paths, or touches automation files,
the HQ review is automatically forced to `NO_GO` before model judgment.

Examples:
```json
"allowed_paths": [
  "v3-prototype/css/v3.css",
  "v3-prototype/js/app.js",
  "v3-prototype/js/data.js",
  "v3-prototype/verify/core_loop.js",
  "v3-prototype/verify/edge_cases.js",
  "v3-prototype/verify/a11y_responsive.js"
]
```

Always protected:
- `.ai-handoff/**`
- `.github/**`
- product package/lockfiles unless explicitly allowed
- anything not listed in allowed_paths

## Visual review

If `requires_runtime_visual=true`, HQ `GO` is impossible without post-change Actual screenshots.
The reviewer receives up to 6 discovered PNG/JPG screenshots as image input.
No CSS/source-only claim can substitute for Actual visual evidence.

## Outputs

Artifact:
`ai-handoff-<task-id>-<run-id>`

Contains:
- STATUS.json
- SOURCE_DIFF.patch
- changed filenames
- scope guard reports
- CODEX_REPORT_1..3.md
- HQ_REVIEW_1..3.json
- discovered screenshots
- task/rules snapshot
