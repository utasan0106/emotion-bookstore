---
name: deliver-artifact
description: Use after a Reviewer PASS to hand the change to the CEO — pushes the task branch when GitHub write access works (PR only with explicit authorization), otherwise falls back automatically to a product-only patch.
---

# Deliver artifact

Runs once per task, right after the reviewer returns `PASS — ready for Preview`, before anything is shown to the CEO.

## Process

1. Confirm the diff is scoped to the approved task brief: run `git diff --stat` against the allowlist of files the brief names.
2. Try the write-access path first:
   - Create/use the task's single branch, push it (`1課題・1ブランチ`) — allowed when the diff is within task scope.
   - Do not open a PR automatically. Open the PR only when PR creation is explicitly authorized (see Approval boundary); otherwise stop after the push and report `PR_HOLD — Founder/HQ approval required`.
   - Never merge — merge always requires separate Founder/HQ approval per `CLAUDE.md`.
   - If the push fails for an access reason (e.g. 403 Resource not accessible by integration), do **not** escalate on that alone — fall through to the patch path below automatically.
3. Patch fallback path:
   - Build the in-scope file set from the task brief. Anything outside it (e.g. `CLAUDE.md`, `.claude/**`, `docs/ops/**`, test-infra config, `.gitignore`) is scope-out.
   - If every scope-out file can be safely and unambiguously dropped from the patch (it's a distinct file, not entangled line-by-line with in-scope changes) — exclude it automatically and note what was excluded in the report. Do not ask the CEO to confirm this.
   - If a scope-out change is entangled with in-scope changes in the same file such that clean separation isn't mechanically certain, stop and escalate via the `escalate-to-ceo` skill instead of guessing.
   - Generate a diff-only patch: no user body text, titles, photos, or backup contents can appear in it because only code/test files are ever in scope — verify this holds before handing it over.
   - Do not upload the patch to any external service (gist, pastebin, etc.). Keep it local to the environment the CEO already has access to.
   - Hand the CEO exactly two things: one command to apply the patch, one command to run the tests. No explanation text beyond that.

## Approval boundary

After the Reviewer returns `PASS`, pushing the task branch is allowed when the diff is within task scope. PR creation is never automatic. A PR may be opened only when:

1. the current Task Brief explicitly states `PR CREATION AUTHORIZED`, or
2. Founder/HQ explicitly approves it after the Reviewer `PASS`.

Otherwise: push the branch, report `PR_HOLD — Founder/HQ approval required`, and do not create the PR.

Merging to `main` and deploying to Production each require a separate, explicit Founder/HQ approval given after Preview review — never infer that approval from task approval or PR authorization.

## Escalate only when

- write-access push fails **and** the patch path also can't safely isolate the product diff (see step 3).
- Never escalate merely because push returned 403/405 — that is the expected trigger for the patch fallback, not a CEO decision point.

## Output

- which path was used (branch push / branch+PR / patch) and, if no PR was created, `PR_HOLD — Founder/HQ approval required`
- files included / files auto-excluded (if any)
- CEO's next step(s), capped at 2

## Never

- merge or deploy
- include ops/PoC files in a product PR or product patch
- send patch contents to any third-party service
