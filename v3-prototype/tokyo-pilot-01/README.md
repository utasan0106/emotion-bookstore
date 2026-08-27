# 東京の棚 — Tokyo Pilot 01

「検索前の3分」に向けた、有限 Human Editorial Discovery の隔離 Pilot。
この directory の中だけで完結する。V3 本体 / V2 / 本番の資産は読み込まない。

## 状態

- 技術面: 隔離 Human Test を実施できる状態
- 外部参加者の募集・配布・実施: 未着手
- Production / main への昇格: NO-GO

## 起動

    python -m http.server 4180 --directory .
    # http://127.0.0.1:4180/index.html

`file://` でも動くが、Human Test では Preview 配信面の HTTPS URL を使う。

## 参加者へ渡す URL

    …/v3-prototype/tokyo-pilot-01/index.html?participant=1&order=abc

- `participant=1` … 参加者モード。掲載事実が期限切れなら棚を出さずに止まる。
- `order` … `abc / acb / bac / bca / cab / cba` の6通り。順序効果の相殺用で、
  出る3件の中身は常に同じ。

## 検証

外部サイクル直前は、これ1本でよい。3つの検査をまとめて回し、
期限の残りと、機械で確認できない前提条件を必ず表示する。

    NODE_PATH=/opt/node22/lib/node_modules node qa/cycle_gate.js [配信URL]

配信URL を渡すと、参加者 18 名分の URL（順序割り当て済み）も出る。

個別に回す場合:

    node pilot_check.js                    # 静的契約（開発中はこちら）
    node pilot_check.js --external-cycle   # 期限切れを FAIL にする
    python media_validate.py               # 実バイト / 寸法 / SHA-256 と証跡の一致
    NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js [--shots]

`--shots` を付けると `qa/shots/` に 320 / 390 / 430 / 1024 / 1440 の
実 viewport screenshot を出す。`qa/shots/` と、毎回上書きされる
`qa/qa-report.json` は git 管理しない。履歴として残すのは
`qa/qa-baseline-20260827.json`（取り込み時点）と
`qa/qa-evidence-20260827.json`（この日の最終結果）の2つ。

`media_validate.py` は Pillow が必要（`pip install Pillow`）。

## 見え方の決めごと

- 地は夜の展示室（`#141312`）。3枚の写真はどれも暗い室内で照明の当たった
  物を撮ったもので、地を暗くすると写真の中の空間が画面へ続く。
  画面で光っているのは Real Media だけにする。
- 刷り物（詳細）は紙（`#f1ebe0`）。地と紙をはっきり分け、
  中間のグレーを何段も使わない。
- signal は朱の1色だけ。通し番号と Official Action にしか使わない。
  暗い地に載せる `--signal` と、白文字を載せる `--signal-fill` で
  明度を分けてある（どちらも AA を満たす値。触るときは
  `text_contrast_meets_aa` / `detail_text_contrast_meets_aa` が守る）。
- 書体は明朝（標題・Hook・Reveal・札）と sans（facts・注記）の2系統だけ。
  外部 Web Font は追加しない。
- 一覧の composition は product 名のとおり「棚」。desktop は1本の棚板の上に
  3点が実寸比のまま立ち、札は棚板の下。列幅は等分にせず1点目を広くとる。
- Object は箱に入れない。カード・角丸・pill は使わない。
  plate 全体が触れる面で、「ひらく」は札の最後の一行。

## 守っている契約

runtime:

- Object はちょうど3件、明確に終わる
- search / account / 保存 / 履歴 / ranking / infinite feed / autoplay なし
- localStorage / sessionStorage / IndexedDB / cookie への書き込み 0
- GA4 / GTM なし、fetch / XHR / sendBeacon 0、外部への background 通信 0
- 感情選択・感情診断・スコアリング・AI 推薦・personalization なし
- Official Action は HTTPS で、押したときだけ別 tab で開く

編集・権利:

- 一覧に Reveal の答えを出さない（`objectName` / 剥製 / 標本 などを出さない）
- Real Media を frame の都合で切らない。切ってよい端は
  `pilot_content.js` の `mediaCrop` / `mediaCropNote` で明示する
- 内部の検証メモ（`verifiedNote`）や rights 監査文を参加者画面へ出さない
- 掲載事実に期限があるものは、期限を過ぎたら参加者に出さない
- Human Test 用 media は Production asset へ自動昇格しない
  （`production_promotion: false`）

これらは `pilot_check.js` と `qa/browser_qa.js` が機械的に検査する。
壊すと FAIL するので、仕様を変えるときはテスト側も同時に変える。

## Human Test

手順・前提条件・記録様式は `HUMAN_TEST_CYCLE_01.md` と
`HUMAN_TEST_SCORECARD.csv` を参照。
