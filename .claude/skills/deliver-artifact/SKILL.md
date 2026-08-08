---
name: deliver-artifact
description: Use after a Reviewer PASS to hand the change to the CEO — pushes a branch/PR when GitHub write access works, otherwise falls back automatically to a product-only patch.
---

# Deliver artifact

Runs once per task, right after the reviewer returns `PASS — ready for Preview`, before anything is shown to the CEO.

## Process

1. Confirm the diff is scoped to the approved task brief: run `git diff --stat` against the allowlist of files the brief names.
2. Try the write-access path first:
   - Create/use the task's single branch, push it (`1課題・1ブランチ`).
   - Open the PR (do not merge — merge still requires separate CEO approval per `CLAUDE.md`).
   - If the push fails for an access reason (e.g. 403 Resource not accessible by integration), do **not** escalate on that alone — fall through to the patch path below automatically.
3. Patch fallback path:
   - Build the in-scope file set from the task brief. Anything outside it (e.g. `CLAUDE.md`, `.claude/**`, `docs/ops/**`, test-infra config, `.gitignore`) is scope-out.
   - If every scope-out file can be safely and unambiguously dropped from the patch (it's a distinct file, not entangled line-by-line with in-scope changes) — exclude it automatically and note what was excluded in the report. Do not ask the CEO to confirm this.
   - If a scope-out change is entangled with in-scope changes in the same file such that clean separation isn't mechanically certain, stop and escalate via the `escalate-to-ceo` skill instead of guessing.
   - Generate a diff-only patch: no user body text, titles, photos, or backup contents can appear in it because only code/test files are ever in scope — verify this holds before handing it over.
   - Do not upload the patch to any external service (gist, pastebin, etc.). Keep it local to the environment the CEO already has access to.
   - Hand the CEO exactly two things: one command to apply the patch, one command to run the tests. No explanation text beyond that.

## Approval boundary

The CEO's initial approval of the task brief already delegates branch push and PR creation once the Reviewer returns `PASS`. Do not ask the CEO to re-confirm before pushing the task branch or opening the PR — that step is pre-authorized.

This delegation stops at the PR. Merging to `main` and deploying to Production each require a separate, explicit CEO approval given after Preview review — never infer that approval from the initial brief approval, and never treat "CEO approved" as covering merge/deploy unless it was given at that later point.

## Escalate only when

- write-access push fails **and** the patch path also can't safely isolate the product diff (see step 3).
- Never escalate merely because push returned 403/405 — that is the expected trigger for the patch fallback, not a CEO decision point.

## Output

- which path was used (branch+PR vs. patch)
- files included / files auto-excluded (if any)
- CEO's next step(s), capped at 2

## Never

- merge or deploy
- include ops/PoC files in a product PR or product patch
- send patch contents to any third-party service
