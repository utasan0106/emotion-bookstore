# V3 SHELF ABUNDANCE FOUNDATION — 有限フル棚アーキテクチャ

- Repository: `utasan0106/emotion-bookstore`
- Branch: `claude/v3-shelf-abundance-foundation-20260825`
- Start HEAD: `9874072aeddb3513228b0dca32e7085d36c5c4d8`（Accepted Visual HEAD）
- CSP候補 `e476fe5…` からは分岐していない。`vercel.json` / CSP は本passで一切触れていない。
- 実在庫（承認済みProduction Experience）は1件も追加していない。6〜15の挙動は検証fixtureのみで確認。

---

## 1. 変更ファイル

| ファイル | 変更内容 |
| --- | --- |
| `v3-prototype/js/real_experience_registry.js` | COVER / COLLECTION の分離。`COVER_MAX=3` / `COLLECTION_MAX=15` / `COLLECTION_MIN_AVAILABLE=6`、`COLLECTION_RELATIONS`、純粋な構造契約 `validateShelfPlan()`、`collectionForEmotion()`、cover非依存の `shelfForExperience()` を追加。既存 `deckForEmotion()` は無変更。 |
| `v3-prototype/js/interested_retrieval.js` | `approvedShelfFor()` が `shelfForExperience()`（承認済み棚メンバーシップ）を優先。旧 `deckForEmotion` 走査はfallbackとして保持。 |
| `v3-prototype/js/cultural_matching.js` | `auditReleaseReadiness()` に `role: 'collection'` の深部行を追加。`RUNTIME_DECK_OVER_3` は維持し、`RUNTIME_COLLECTION_OVER_15` を追加。棚ごとに `collectionCount` / `collectionAvailable` を出力。 |
| `v3-prototype/js/app.js` | collection helper群、`informationContract(experience, requireOfficialGrounding)` への分離（cover=officialGrounding必須／collection=任意）、完了画面の静かな継続導線、新surface `15-shelf-collection`、type-neutral Detail、`data-interest-id` によるfocus復帰。 |
| `v3-prototype/css/visual-system-v1.css` | 全棚一覧のcompact card / category chip / grid（1列→2列→3列）のstyle。 |
| `v3-prototype/verify/shelf_abundance_fixture.html` / `.js` | 内部専用fixture（将来在庫6〜15のsimulate）。Vercel配信対象外の `verify/` 配下。 |
| `v3-prototype/verify/shelf_abundance_foundation.js` | 新規検証（unit 29 + runtime 63 = 92 assertions）。 |

---

## 2. アーキテクチャ契約

### COVER（表紙）— 現行挙動を保持

- 権威: `deckForEmotion(shelfId, asOf)`（無変更）
- 上限3件、`physicalDestination.approved === true` の追加gateもそのまま
- Discovery（`04-discovery`）・完了画面・0〜3の有限体験は不変更

### COLLECTION（棚の現行メンバーシップ）— 新規

- 権威: `collectionForEmotion(shelfId, asOf)`
- 返却: `{ shelfId, state, reasons, ids, coverIds, count, available }`（frozen）
- `state === 'error'` は構造違反時のみ（fail closed、`ids` は空）
- `available === true` の条件: `6 <= ids.length <= 15`
- 順序はHuman Editorial入力順のまま。engagement並べ替え・force-fill・穴埋めは無し
- 個別のstale/無効recordは除外（棚全体は落とさない）。構造違反（重複ID・cover不在・上限超過）は棚全体をfail closed

### `validateShelfPlan(plan)` — 純粋な構造契約

| 条件 | 結果 |
| --- | --- |
| `coverIds.length <= 3` | 超過で `COVER_OVER_3` |
| `collectionIds.length <= 15` | 超過で `COLLECTION_OVER_15` |
| collection内の重複ID | `COLLECTION_DUPLICATE_ID:<id>` |
| cover内の重複ID | `COVER_DUPLICATE_ID:<id>` |
| coverIdがcollectionに不在 | `COVER_NOT_IN_COLLECTION:<id>` |
| 配列でない | `SHELF_PLAN_SHAPE_INVALID` |

順序は検証で並べ替えない（入力順を保持）。

---

## 3. Collection eligibility（CTA表示条件）

完了画面（`04-discovery-none`）に、`collectionAvailable` が真のときだけ静かな継続導線
`棚を一覧で見る（N件）` を追加。承認copyと構成は不変更。

| collection件数 | 挙動 | 実測 |
| --- | --- | --- |
| 0 | CTA非表示 | `{"count":0,"available":false}` |
| 1 / 3 / 5 | CTA非表示 | PASS |
| 6 | `棚を一覧で見る（6件）` | PASS |
| 8 | `棚を一覧で見る（8件）` | PASS |
| 10 | `棚を一覧で見る（10件）` | PASS |
| 15 | `棚を一覧で見る（15件）` | PASS |
| 16 | fail closed（CTA非表示） | PASS |
| 重複ID | fail closed（`state='error'`、CTA非表示） | PASS |

`あと1件です` 等のquota誘導文言は存在しない（検証で明示的にassert）。

**現行実在庫では各棚1件のため、この導線はProductionでは表示されない**
（`prod-m390-02-completion-no-cta.png` で確認）。

---

## 4. 全棚一覧（`15-shelf-collection`）

- 明示的にCTAを押した後にだけ生成（開く前はcard 0 / img 0 / surface 0 を実測）
- 6〜15件すべてを一度に表示。pagination・もっと見る・infinite scroll・swipe・並べ替え無し
- 画像は開いた後に `loading="lazy"`（10件すべてlazyを実測）
- compact card: 承認visual（category図版fallback可）／category label／title／編集Why（CSS3行clamp、要約はしない）／`詳しく見る`／`気になる`
- rating・人気・ランキング・バッジ・FOMOは無し（禁止語検査 0件）
- 完全なWhyはDetailが表示（fixtureで 125文字 === 125文字 を実測）

### Category filter（全棚一覧のみ）

`Book→本` / `Film→映画` / `Music→音楽` / `Exhibition→展示` / `Place+Dining→場所` /
`Activity+Travel→体験` / `Event→イベント`

- `すべて` ＋ 実在categoryのみ。空chipは生成しない
- 可視category chipの上限は5（＋すべて）
- 実測: `["すべて","本","映画","音楽","展示","場所"]`（7group中5に制限）
- filter状態はsession/UIのみ: storage差分0、URL差分0、計測差分0、Interested差分0（実測）

---

## 5. Interested / Saved

- `approvedShelfFor()` の cover 依存を解消。承認済み棚メンバーシップで解決
- cover外（深部のみ）のobjectを保存 → `status: 'actionable'` / `shelfId: 'miwohiku'` を実測
- 保存schemaは `{experienceId, savedAt}` のまま（実測keys一致）。migrationなし
- 棚ID・URL・Action Destinationは保存しない（既存契約のまま）

---

## 6. Type-neutral Detail

- 解決: `approvedOutingById(id) || approvedCollectionItemById(id)`
- 契約: cover は `officialGrounding` 必須のまま。collectionのみのobjectは `officialGrounding` 任意
- 事実の土台は既存の `resolvePracticalTruth(record)`。`placeDetail` は必須にしない
- `placeDetail` を持たないobjectでは、住所・最寄駅などのplace項目を一切描画しない（実測 `placeSections: 0` / `最寄駅` 非出現）
- Book fixtureの実測: 著者・出版社・刊行日・形式・公式の行き先＋公式Action1件
- 既存のplace Detail描画は無変更（Production実record `prod-m390-01` で確認）

---

## 7. Release-readiness audit

| 条件 | 結果 |
| --- | --- |
| cover > 3 | `RUNTIME_DECK_OVER_3:<shelf>`（維持） |
| collection > 15 | `RUNTIME_COLLECTION_OVER_15:<shelf>`（新規） |
| cover3 + 深部7 = 10 | 有効（`collectionAvailable: true`） |
| 合計15 | 有効 |
| 合計5 | blocking 0件・`collectionAvailable: false`（編集失敗ではない） |
| 深部の重複ID | `DUPLICATE_ID:<id>` |
| 深部のstale行 | countから除外 |

Source / Rights / Freshness / Action / Editorial の既存gateはすべて維持。

---

## 8. テスト結果

| 検証 | 結果 | ファイル |
| --- | --- | --- |
| Shelf Abundance Foundation（新規） | **92 / 92 PASS** | `shelf-abundance-foundation.txt` |
| 権威regression suite（9 scripts） | **9/9 suites, 332 assertions PASS, 0 FAIL** | `authority-regression-suite.txt` |
| Browser QA（既存pass由来） | **17 / 17 PASS** | `browser-qa-custom.txt` |
| `node --check`（変更5ファイル＋新規2） | OK | — |
| `git diff --check` | OK | — |

### レスポンシブ実測（全棚一覧10件）

| viewport | 列数 | 横溢れ | 44px未満のcontrol |
| --- | --- | --- | --- |
| 320 | 1 | 0 | 0 |
| 390×844 | 2 | 0 | 0 |
| 430×932 | 2 | 0 | 0 |
| 1200 | 3 | 0 | 0 |
| 1440 | 3 | 0 | 0 |
| 195（390の200%zoom相当） | 1 | layout floor基準 0 | 0 |

195px は prototype 既存の「最小レイアウト幅320px」に当たるため、未変更のProduction Home
（`/index.html`）と同一の値（125）になることを併せて実測し、本passの追加要因でないことを確認。

---

## 9. 回帰

| 項目 | 結果 |
| --- | --- |
| 0〜3 coverの挙動 | 不変更（Production実測: card 1件 / collection 1件） |
| 完了画面のcopy | `この棚は、ここまでです。` / `さあ、感情の先に出かけよう！` 保持 |
| Production完了画面のCTA | 非表示（実在庫 < 6件） |
| 選ばずに見る | 独立・有限0〜3のまま（chip 0 / collection CTA 0） |
| 既存Detail | 動作（place描画を保持） |
| storage / GA4 / privacy | 差分0（GA4イベント定義・保存key・保存形式・削除挙動いずれも未変更） |
| 外部通信 | 差分0（first-paint third-party request 0、全棚一覧でも third-party 0） |
| CSP / vercel.json | 差分0（本branchでは未編集） |
| JS runtime error | 0 |

---

## 10. スクリーンショット

| ファイル | 内容 |
| --- | --- |
| `m390-01-completion-with-cta.png` | 完了画面＋静かな継続導線（fixture 10件） |
| `m390-02-full-shelf.png` | 全棚一覧 390（2列） |
| `m390-03-category-filter.png` | category filter 適用時 |
| `m390-04-depth-item-saved.png` | cover外objectの `気になる` 保存 |
| `m390-05-type-neutral-detail.png` | type-neutral Detail（Book） |
| `m320-*` / `m430-*` | 320（1列）／430（2列） |
| `d1200-*` / `d1440-*` | desktop sanity（3列） |
| `prod-m390-01-cover-unchanged.png` | Production cover 不変更 |
| `prod-m390-02-completion-no-cta.png` | Production完了画面にCTAが出ないこと |
| `prod-m390-03-no-emotion-unchanged.png` | 選ばずに見る 不変更 |

---

## 11. main 不変更

- `origin/main` = `eca334f9671bee07833892b2476aac118f8ed018`（本pass前後で不変）
- 本passのcommitは `claude/v3-shelf-abundance-foundation-20260825` のみ
- merge・deployは実施していない
