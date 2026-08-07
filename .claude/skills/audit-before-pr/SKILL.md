---
name: audit-before-pr
description: Use after an implementation is complete and before asking the CEO to open or merge a PR.
---

# Audit before PR

1. Verify changed files are within scope.
2. Verify no accidental storage/GA4/external-communication changes.
3. Verify new tests enforce the new contract.
4. Verify no new FAIL is introduced by this task.
5. Verify destructive operations have appropriate confirmation when required.
6. Produce PASS or REQUEST_CHANGES.

Output: verdict, scope, tests, data/privacy impact, remaining Preview checks.
