# ADDENDUM — COVER=0 COLLECTION ROUTING LIMITED FIX

- Branch: `claude/v3-shelf-abundance-foundation-20260825`（継続）
- Start HEAD: `73a65714e1bc505cd2aa325bc58c6376903af69c`（local/origin一致を確認してから着手）

## 対象の欠陥

cover=0（正当な空）かつ collection>=6（有効）のとき、ユーザーは完了画面
`surfaceNone()` に到達できず、唯一の `棚を一覧で見る（N件）` 導線が到達不能だった。
さらに `failClosedStaleShelfRoute()` が cover deck の一致を前提としていたため、
仮に `collection` 画面へ遷移しても即座に Understanding へ差し戻されていた。

## Routing変更（app.jsのみ、39行追加・3行変更）

1. **`surfaceUnderstanding()`**: `deckState === 'empty'` かつ context絞り込みでない、
   かつ `collectionAvailable()` のときだけ、空状態の本文を正直な一文に切り替え
   （「いま、この棚の寄り道はありません。棚に並んでいるものは、一覧から見られます。」）、
   静かな `棚を一覧で見る（N件）`（`.understanding-collection-entry`、btn-line）を
   `別の棚をのぞく` の前に置く。自動遷移はしない。collection<6・16以上の
   fail closed・context絞り込み空・cover 1〜3 では従来表示のまま（導線なし）。
2. **`zeroCoverCollectionRouteActive()`**（新規）: cover承認deckが `empty`
   （errorではない）かつ collection利用可能なら、`collection` 画面と、そこから開いた
   `detail`（selectedId ∈ collection）を cover deck のstale判定から除外。
   `failClosedStaleShelfRoute()` に1行の例外として追加。
3. **`collectionBackScreen()`**（新規）: 全棚一覧の戻り先を分岐。cover経由
   （deck ready）は従来通り完了画面 `none`、zero-cover経由は `understanding`。
   stepbarの戻ると一覧下部の `戻る` の両方に適用。

cover/collectionのcardinality・registry権威・保存schema・category filter・
Detail構造・実在庫・CSP/vercel.json・GA4 はすべて不変更。

## Zero-coverテスト（verify/shelf_abundance_foundation.js に22件追加 → 114/114 PASS）

| ケース | 結果 |
| --- | --- |
| cover=0 + collection=5 | CTA非表示・従来の空状態文言を保持 |
| cover=0 + collection=6 | `棚を一覧で見る（6件）` が到達可能な位置に出現 |
| cover=0 + collection=15 | `棚を一覧で見る（15件）`（Nの正確表示） |
| cover=0 + collection=16 | fail closed・CTA非表示・従来の空状態文言 |
| cover=3 + collection=8 | Understandingに重複CTAなし・従来のDiscovery→完了→完了CTAは不変 |
| zero-cover CTAクリック | 既存の有限 `15-shelf-collection` が開く（6件、有限文法保持） |
| storage/URL/Interested | CTAクリック前後で差分0 |
| zero-cover Detail | 開いて一覧へ戻れる。一覧の戻るはUnderstandingへ |
| 320 / 390×844 / 430×932 / 1440 | CTA >=44px・横溢れ0・一覧も横溢れ0 |
| Production実在庫（心が弾む: cover=0・collection=0） | CTA非表示・従来の空状態のまま |

## 既存regression

- 権威regression suite: **9/9 suites・332 assertions PASS・0 FAIL**
- Browser QA: **17/17 PASS**
- `node --check` / `git diff --check`: OK

## スクリーンショット

- `m390-06-zero-cover-understanding.png` / `d1440-06-zero-cover-understanding.png`
- `m390-07-zero-cover-collection.png` / `d1440-07-zero-cover-collection.png`
- `prod-m390-04-zero-cover-no-cta.png`（実在庫の空棚はCTAなしのまま）

## main

- `origin/main` = `eca334f9671bee07833892b2476aac118f8ed018`（不変）
