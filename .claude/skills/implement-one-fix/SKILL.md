---
name: implement-one-fix
description: Use when implementing one approved bug fix or small UX change with strict scope, targeted tests, and Preview handoff.
---

# Implement one fix

## Process
1. Confirm current branch/status and inspect the relevant implementation.
2. Restate the exact scope in one sentence.
3. Implement the smallest viable diff.
4. Update/add tests only where the formal contract changed.
5. Run targeted tests and `git diff --check`.
6. Compare new failures against the pre-change baseline.
7. Ask the reviewer agent to audit the result.
8. If reviewer says REQUEST_CHANGES, fix only the cited issue and re-review.
9. Stop at `PASS — ready for Preview`.

## Output
- changed files
- diff summary
- test result summary
- reviewer verdict
- Preview checks (max 3)
