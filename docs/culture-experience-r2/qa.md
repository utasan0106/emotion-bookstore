# R2 QA / checkpoint

2026-09-07。Public readiness: **HOLD**。実装と公開を区別する。

## 実行済み

- `node qa/culture_room_contract_check.js`：19/19 GO。小さな代替DOMホストでイベントを実行するstate test。初回iframe 0、同意前の演奏選択でも0、指定した正しい録音ID、同時iframe最大1、切替・停止・pagehide時の破棄、focus戻し、iframeの参照元ポリシー、明示停止、配信除外、下北沢への正しい棚URLを確認する。
- `node qa/release_check.js`：RELEASE_CHECK_GO。
- `node qa/measurement_v04_selftest.js`：426/426 GO。
- `node --check experiments/culture-room-r1/room.js`：GO。
- ローカルリンクの実在とprovenance JSON構文：GO。
- 本番のHTML/JS/CSS、CSP、Trust、Shelf/Works/Threadデータ、画像ファイルを変更していない。変更はdocs、experiments、新規QAだけ。

## ブラウザで確認した一次情報

- 両権利者のBandcamp曲ページの作品名・曲番号・曲長、Share / Embed UIの生成コードを確認。
- Standardプレイヤーは公式UIに最小幅370pxと表示されるため、狭い画面に適したSlim設定へ変更。Slimは公式UIで最小幅170px、生成iframe高さ42px。ジャケット表示は公式チェックボックスでOFF可能。録音IDは元の両曲、表示設定は同じ公式オプションを適用する。
- SHELTER Standardプレイヤーをクリックして再生後、曲03から曲04の00:53へ進んだ状態を確認。つまりアルバム次曲へ自動進行する。**単曲で止まるという主張は禁止**。試作に停止ボタンとその説明を追加。
- SUNSET NOTES Standardプレイヤー単体も明示再生後、対象曲の00:40 / 02:21を確認。音質や演奏の印象を聴取・評価したという主張ではない。
- ここでの確認は提供元プレイヤー単体。本サイト内iframeの実再生・親のCSP・実機音声を確認したことにはならない。

## 未検証

- ローカル試作のCloud Browser表示：HTTPがERR_BLOCKED_BY_CLIENT、共有file URLがbrowser security policyで拒否。迂回せず停止。このため390 / 430 / 1440のスクリーンショット、実フォント、横overflow、キーボード通し確認は未完了。
- 二つの最終Slim iframeが当サイト内で再生でき、切替で実音を停止すること。
- 実際の外部通信ログ。初期iframeなし・親fetchなしというコード検証を「実ネットワーク0測定」と呼ばない。
- Bandcamp内の第三者通信・Cookie全体。親がデータを送らないからproviderが送らないとは言わない。
- 聴き比べで文化の関係が伝わることと、再訪したいという動機。ユーザーテスト前なので未検証。

## 次の一つ

通常のHTTP Previewを利用できる環境でこの独立試作を開き、二つの音源・停止・390pxを通しで確認する。実験の配信除外や本番CSPを、そのためだけに外さない。

## 独立レビュー

`culture_room_review`：**PASS — ready for Preview**。新規コード欠陥・意図しない本番変更なし。19/19、release、Measurement426を独立再実行。Public / Visual readinessはHOLDのまま。

レビューの残る確認：390/430/1440とキーボード（読み込み後の停止ボタンからプレイヤーへ戻れること）、最終Slim iframe内の実再生・停止・通信・失敗時出口、曲末自動次曲移行の扱い。
