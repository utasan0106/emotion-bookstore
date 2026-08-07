# PoC Task 001 — 個別本削除の確認追加

## Goal
本棚の1冊削除で、誤タップによる即時削除を防ぐ。

## Scope
- 個別本削除 (`#modalDel`) の直前に明示的な確認を追加する。
- 本棚全リセットの既存Data Safety挙動には触れない。
- 保存形式・保存キー・バックアップ形式・GA4・外部通信は変更しない。
- 削除確認以外のUI改善は混ぜない。

## UX requirement
- 削除ボタンを押しただけでは削除しない。
- キャンセル時は対象本と本棚状態を完全に維持する。
- 確認した場合のみ従来の個別削除処理を実行する。
- JP/EN双方で意味が明確。
- 「本棚リセット」と混同しない文言にする。

## Acceptance
1. cancel => book remains
2. confirm => only selected book is deleted
3. other books/favorites/backups unchanged
4. storage format/key unchanged
5. no GA4/external communication changes
6. task-induced new FAIL = 0
7. reviewer verdict = PASS — ready for Preview

## Stop condition
Do not create/merge PR or deploy. Stop when reviewer says PASS.
