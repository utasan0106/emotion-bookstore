# 感情書店 AI社員 PoC v0.1

目的: CEOがClaude Codeへの細かい指示・再指示・レビュー伝達を繰り返さず、
Implementer → Reviewer の内部ループで Preview直前まで到達できるかを検証する。

最初の実験課題:
`POC_TASK_001_SINGLE_BOOK_DELETE_CONFIRM.md`

成功条件:
- CEOの入力は最初の1回だけ
- Implementerが実装
- Reviewerが独立監査
- 必要なら内部差し戻し
- 最後に `PASS — ready for Preview` だけCEOへ上げる
- merge/deployはCEO承認まで禁止

このPoCが通ったら、次にUX Fix 02へ適用する。
