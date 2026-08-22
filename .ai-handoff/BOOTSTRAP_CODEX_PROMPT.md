# ONE-TIME CODEX BOOTSTRAP — V3 AI Handoff v2

## When to run
Run this only AFTER the current M05/W05 Phase 1 implementation/evidence task has completed
and HQ has confirmed which current V3 source snapshot is authoritative.

## Input
Extract `V3_AI_HANDOFF_BOOTSTRAP_V2_2026-08-22.zip` into a temporary location.

## Goal
Create a dedicated workbench branch containing:
- the current authoritative `v3-prototype/**`
- `.ai-handoff/**`
- `.github/workflows/ai-handoff-loop.yml`

## Authorized external write — one-time only
You are explicitly authorized for this bootstrap to:
- create branch `automation/ai-handoff-v1`
- commit the current V3 snapshot + handoff infrastructure to that branch
- push ONLY that branch

This authorization does NOT include:
- main
- Production
- PR
- merge
- deploy
- force push

## Procedure

1. Verify the current source is the latest HQ-approved working snapshot.
2. Record:
   - HEAD
   - current branch
   - `v3-prototype/**` file count + SHA256 manifest
3. Create/switch to:
   `automation/ai-handoff-v1`
   without resetting/losing the current V3 working tree.
4. Copy bootstrap contents:
   - `.ai-handoff/**`
   - `.github/workflows/ai-handoff-loop.yml`
5. Confirm:
   `.ai-handoff/REQUEST.json` has `"enabled": false`.
6. Static validate:
   - Python scripts compile
   - JSON parses
   - YAML structurally parses if a YAML parser is already available
   - otherwise inspect YAML without installing dependencies
7. Security assertions:
   - workflow `permissions: contents: read`
   - checkout `persist-credentials: false`
   - no workflow `git push`
   - no deploy/merge command
   - no API key literal
   - max Codex loop = 3
   - gpt-5.6-sol default + max reasoning
8. Product source must be byte-identical to pre-bootstrap snapshot.
9. Commit only on `automation/ai-handoff-v1`.
10. Push only `automation/ai-handoff-v1`.
11. STOP. Do not enable REQUEST.

## Completion report
- workbench branch
- start HEAD
- bootstrap commit SHA
- remote branch push proof
- V3 manifest count/hash
- automation files + hashes
- Product source byte-identity proof
- main unchanged proof
- REQUEST enabled=false proof
- workflow/security checks
- any required manual setup

Expected manual setup after bootstrap:
GitHub Actions Secret `OPENAI_API_KEY`.
