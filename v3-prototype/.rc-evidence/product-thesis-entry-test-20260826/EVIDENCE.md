# V3 PRODUCT THESIS ENTRY TEST 01 — A/B/C 入口比較 prototype

- Branch: `claude/v3-product-thesis-entry-test-20260826`
- Start HEAD: `8b08951afc3904d7b25f6cab87d8704e10c090a3`
- 位置づけ: Product Thesis 検証用の **isolated prototype**。Production implementation ではない。
- 判断について: どの案が良いかは Claude 側で決めていない。3案を同条件で並べただけ。

## 1. 変更ファイル（新規追加のみ・既存ファイルの変更 0）

| ファイル | 内容 |
| --- | --- |
| `v3-prototype/thesis-entry-test/index.html` | prototype shell（`<base href="../">` で既存 CSS/JS を読み取り専用に利用） |
| `v3-prototype/thesis-entry-test/thesis.js` | pool 構築＋3 variant の描画＋共有 Detail |
| `v3-prototype/thesis-entry-test/thesis.css` | 入口構造の違いを出す layout のみ |
| `.rc-evidence/product-thesis-entry-test-20260826/` | 本 evidence・screenshot・テスト出力 |

既存 V3 の runtime（`js/app.js` ほか）・CSS・registry・`vercel.json` はいずれも**未変更**。
`git status` 上、既存ファイルの modified は 0 件。

## 2. 3案が共有する条件（入口以外の差を消す）

- **コンテンツ**: `REAL.SHELF_IDS` → `collectionForEmotion()` → `byId()` で解決した現行 Human-approved の同一 pool（**8件**）。3案すべて同じ 8 件・同じ順序（registry の固定順）。
- **Visual**: `css/v3.css` + `css/visual-system-v1.css` + 承認済み実 asset のみ。新規 AI 生成画像・fake media は 0。
- **Detail**: 3案で同一の surface（同一構造・同一情報・同一 Editorial relation 表示）。
- **並び順**: 固定順のみ。random / ranking / personalization / recommendation logic は実装していない。

pool（固定順）: EXP_101 チームラボボーダレス（展示・心が弾む）／EXP_102 東京おもちゃ美術館（体験・心があたたまる）／EXP_103 ザ・ペーパーログ：膜と核（展示・惹かれる）／EXP_104 東京都復興記念館（場所・沈む）／EXP_105 TOPコレクション 明日の食卓（展示・ざわつく）／EXP_106 80 GRAPHIC TRIALS（展示・ぶつかる）／EXP_107 文喫 六本木（場所・身を引く）／EXP_007 新宿御苑（場所・まだ名前がない）

## 3. 各 Variant の DOM / interaction

切替は画面上部の `#thesisBar`（`data-variant="a|b|c"`）か URL `?v=a|b|c`。切替時に in-memory state を初期化する。

### A｜CONTROL（感情から入る／現行V3の入口を再現）
- surface 順: `a-home` → `a-shelves` → `shelf` → `detail`（現行 V3 と同じ段数）
- `a-home`: 既存 `.entrance-hero` / `.hero-img`（w01_hero）/ `.display`「感情の先に、世界がある」/ `.lede`「本、映画、音楽、体験。」「8つの感情から新たな出会いを。」/ `.entrance-route-note` / `.entrance-culture-note` を**改稿せず複写**。CTA「はじめる」→ `a-shelves`
- `a-shelves`: 既存 `.emotion-grid` / `.emotion-card` と 8 感情語・既存 tile 画像・既存短文（軽やかにひらく 等）。タップ → その棚の `shelf`
- `shelf`: 棚ラベル＋既存 lens 文＋「この棚から案内できる寄り道は、N つです。」＋カード
- 意図: 現在の Thesis が初見でどれだけ伝わるかの Control。説明を足して有利にしていない。

### B｜ITEM-FIRST DISCOVERY（実物から入る）
- surface 順: `b-browse` → `detail` →（Detail 内）「〈感情〉の棚を見る」→ `shelf`
- `b-browse` First View: `h1`「本、映画、音楽、体験。」＋`p`「気になるものを見つける場所です。」の直下に **実在コンテンツ 8 件の grid**（390px で 2 列 / 900px 以上で 3 列）
- 各カード: 実 visual → category label（展示 / 場所 / 体験）→ 対象名 → 公式一行要約 →「もっと知る」「気になる」
- category chip: 承認済み語彙（本/映画/音楽/展示/場所/体験/イベント）のうち **pool に実在するものだけ**（現行は 展示・場所・体験）。session 内 UI 状態のみ
- **First View に感情語は 1 つも出さない**。感情との関係は `detail` に入って初めて表示
- personalized 表現（「あなたにおすすめ」「今のあなたには」等）は文字列として存在しない

### C｜ONE-ITEM（一個差し出す）
- surface 順: `c-one` → `detail` →（Detail 内）同じ棚 → `shelf`／または `c-one` 上で「次を見る」
- `c-one`: `.thesis-c-eyebrow`「今日は、これ。」→ 大きい実 visual → category label → 対象名 → **「何それ？」の一文＝公式情報にもとづく既存の一行要約**
- 「30秒だけ見る」= その場で承認済み Practical Truth を最大3件展開するだけ（外部通信・遷移なし）
- 「もっと知る」→ `detail`／「次を見る」→ pool の**固定順**で次の 1 件（`(i+1) % 8`）。random / engagement 最適化なし。現在地は「N / 8（固定順）」で明示
- First View に一覧は出さない

### 共通 Detail（3案同一）
`戻る` → visual → category label → 対象名 → 「公式情報より」＋一行要約 → 「訪れる前にわかること」（Practical Truth）→ **「感情書店では『〈感情〉』の棚に置いています」＋「なぜ、この棚に？」＋承認済み placementReason** → 公式 Action（既存 `AD.openAction`）／気になる／「〈感情〉の棚を見る」

## 4. 制約の実測（390 / 1440 × A/B/C = 6 計測、すべて同値）

| 項目 | 実測 |
| --- | --- |
| pool 件数（3案とも） | 8 |
| `localStorage` キー数 | 0 |
| `sessionStorage` キー数 | 0 |
| `window.V3_STORE` | undefined（store.js を読み込まない） |
| `window.V3_ANALYTICS` / `gtag` / `dataLayer` | undefined / undefined / absent（analytics.js を読み込まない） |
| iframe 数 | 0 |
| third-party request | 0（全 request が same-origin） |
| 横スクロール | 0 |
| 44px 未満の操作要素 | 0 |
| JS error | 0 |
| 画像の読み込み失敗 | 0 |

「気になる」は in-page の memory-only state（reload で消える）。IndexedDB / localStorage / sessionStorage への書き込みは実装上存在しない。

## 5. 既存 Product への影響（diff 0）

| 対象 | 結果 |
| --- | --- |
| 既存 V3 UI / logic | 変更 0（新規ディレクトリのみ追加。既存ファイルの modified 0 件） |
| storage / IndexedDB / localStorage | 差分 0（prototype は一切書かない） |
| GA4 | 差分 0（`analytics.js` 未変更・未読込） |
| network / API | 差分 0（追加なし。prototype も same-origin のみ） |
| data model | 差分 0（registry / data.js 未変更。読み取りのみ） |
| Privacy / Terms | 差分 0 |
| 感情棚の意味 | 変更 0（棚 ID・語・lens 文・placementReason をそのまま使用） |
| 新規コンテンツ | 追加 0（既存 8 件のみ） |
| recommendation / personalization / random | 実装 0 |

### Regression（既存 Product が壊れていないことの確認）

| 検証 | 結果 |
| --- | --- |
| 権威 regression suite | 9/9 suites・332 assertions PASS・0 FAIL |
| Shelf Abundance verifier | 115/115 PASS |
| Music Action Bridge verifier | 33/33 PASS |
| Browser QA（既存 index.html） | 17/17 PASS |
| `node --check` / `git diff --check` | OK |

## 6. Screenshot

| ファイル | 内容 |
| --- | --- |
| `m390-variant-a-entry.png` / `d1440-variant-a-entry.png` | A｜CONTROL 入口 |
| `m390-variant-b-entry.png` / `d1440-variant-b-entry.png` | B｜ITEM-FIRST 入口 |
| `m390-variant-c-entry.png` / `d1440-variant-c-entry.png` | C｜ONE-ITEM 入口 |
| `m390-shared-detail.png` | 3案共通の Detail（感情との Editorial relation 表示） |
| `m390-variant-c-peek.png` | C の「30秒だけ見る」展開状態 |

## 7. 配信面についての注記（判断は CEO 側）

`thesis-entry-test/` は現状 `.vercelignore` に載っていないため、**Preview では実機で触れる**（`noindex, nofollow` 付き・Product からのリンクなし・main へ merge しない限り Production には出ない）。
検証後に配信面から外す場合は `.vercelignore` に 1 行追加すれば足りる。今回は自己判断で追加していない。

## 8. main / working tree

- `origin/main` = `eca334f9671bee07833892b2476aac118f8ed018`（不変・未 merge・未 deploy）
- commit 後 working tree clean
