# みんなの感情書店 — Claude Code 共通ルール

## Project
- 「誰にも見せない気持ちを一冊にして、自分の時間へ残す」私的なデジタル書店。
- 本文は利用者の端末内保存を基本とし、感情診断・採点・分析・助言を行わない。
- 現行本番と最新 `main`、正式な改善指示を正とする。

## Working style
- 1課題・1ブランチ・1PR。
- スコープ外の改善、新機能、リファクタを勝手に混ぜない。
- 変更前に `git status` と対象コードを確認する。
- 既存ロジックを再利用し、必要最小限の差分を優先する。
- 既知FAILと今回起因のFAILを必ず分離する。

## Testing
- IMPORTANT: 変更後は関連テストを実行し、今回起因の新規FAILを0にする。
- IMPORTANT: テストを削除・skipして緑にしない。仕様変更時は新しい正式契約を積極的に検証する。
- 保存・製本・本棚・GA4・外部通信に影響しうる変更では、影響有無を明記する。
- 可能なら `git diff --check` と構文チェックも実行する。

## Guardrails
- YOU MUST NOT merge to `main` without CEO approval.
- YOU MUST NOT deploy to Production without CEO approval.
- YOU MUST NOT force-push.
- YOU MUST NOT add external data transmission unless explicitly approved.
- YOU MUST NOT send user-written body text, titles, photos, backup contents, or private data to external services.
- YOU MUST NOT change GA4 event definitions unless the task explicitly requires it.
- YOU MUST NOT introduce diagnosis, emotion scoring, psychological inference, streaks, rankings, or gamification.
- YOU MUST NOT change storage format, storage keys, backup format, or deletion behavior unless explicitly in scope.

## Completion report
At the end of every task, report only:
1. changed files
2. what changed
3. tests and results
4. whether storage/binding/bookshelf/GA4/external communication changed
5. remaining concerns (max 3)
6. whether it is ready for Preview

Then stop and wait for approval.
