# Works 音楽の背景 R1

2026-09-07 / ローカル未公開
Branch: astra/works-music-context-r1-20260907
Parent: 9c487ff0ddd5a8e3b8a30138ab3a711bbc5469b2

## 編集目的

掲載作品を増やさず、すでにあるライブ盤を聴く理由と制作の時間軸を読めるようにする。WorksにPARKS／LADY JANEと同一の作品はないので、街が同じという理由だけで新Threadへリンクしない。

## 出典

S1 https://borisheavyrocks.com/discography/4525/
S2 https://boris.bandcamp.com/album/you-laughed-like-a-water-mark-live-at-shelter-20070204
S3 https://borisheavyrocks.com/discography/1748/

2026-09-07取得確認。S1は録音公演と2018盤、S2は共演の継続とデジタル版、S3はRainbowの作品identityを支える。S1/S2は同じアーティスト発信なので独立した複数証言とはみなさない。

本文は出典に基づく要約。演奏の感想や録音の音質を作らない。2007年の録音、2018年の盤、2026年デジタル版を区別する。現在の盤の在庫や無制限無料再生を保証しない。

## 画面変更

works.html #music の関係文と試聴CTAの間に、既存wk-infoで背景を掲載。下にある既存の公式リンクが出典と出口を兼ねることを明記。

新しい画像・ジャケット・音源・プレイヤーを追加しない。新規外部URLなし。CSS/JS/GA4/Storage/Privacy/Thread/Shelf/Works inventoryを変更しない。

## QA

qa/works_check.js：背景の帰属・年の区別・出典案内を追加検証。既存assertは保持。
qa/works_browser_qa.js：背景の可視表示を追加検証。既存の操作・幅・計測・外部通信検査は保持。

WORKS_CHECK_GO。git diff --check GO。ブラウザの最終結果・独立レビューは下に追記する。

## 接続の限界

公式解説には後年の別会場での再会もあるが、今回は作品を聴く前の短い背景に限定した。他街との接続を量で増やさず、別の読書目的として成立する場合に追加調査する。

累積候補には前工程の吉祥寺・下北沢の未公開更新を含む。Production mainへの直接適用・push・PR・deployは行わない。

## 最終結果

WORKS_BROWSER_QA_GO 378/378。320/390/430/768/853/1024/1440と200%表示、日本語font実描画、overflow、キーボード、外部click-only、HOMEからの往復を確認。390pxの音楽欄スクリーンショットを目視確認。

初回は旧「音楽にinfoなし」条件だけが新背景と不一致。背景の存在・claim層・exact見出しを検証する条件へ同期し、全件再実行でGO。既存本文・CTA・順序のassertは維持。

Measurement426/426GO。独立レビューPASS。意図しない変更・新規失敗なし。
