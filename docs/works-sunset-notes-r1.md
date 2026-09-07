# Works → SUNSET NOTES limited continuation — 2026-09-07

Base: d5527771c8f598cd1ef197ab38a0ff87ced67bc4
Branch: astra/works-sunset-notes-r1-20260907

## Change

既存 `works.html#music` のSHELTERライブ盤から、同曲を収めた栗原ミチオ『SUNSET NOTES』への短文・出典・外部リンク1件を追加。Works4 section・既存出口・finite endingを維持。新カード・画像・プレイヤーはない。

Evidence:
- https://boris.bandcamp.com/album/you-laughed-like-a-water-mark-live-at-shelter-20070204 — 曲03 Time to Go／夕暮れのジャイロ、栗原ミチオの原演奏というクレジット。
- https://pedalrecords.bandcamp.com/album/sunset-notes — ソロ盤の曲01 夕暮れのジャイロ／Time To Go。
- 2026-09-07の編集調査で本文照合。選曲理由・ソロ盤の録音地・音の効果は説明しない。

## Validation

- Before: WORKS_CHECK_GO; browser 378/378 GO。
- After: WORKS_CHECK_GO; browser 390/390 GO。
- 320/390/430/768/853/1024/1440、200%表示、キーボード順、44px操作領域、外部通信クリック前0、音楽の新規出口クリック後のpopupを検証。
- 実レーベルへのブラウザ遷移はQAでstub。外部ページの内容確認は上記編集調査と分離。
- 390/1440の音楽欄スクリーンショットを目視。日本語フォント実描画を確認。
- Measurement selftest 426/426 GO; release_check GO; diff check GO。
- GA4 client selftestは未コミットファイル検出で停止するため、clean commit後に再実行。最終結果は完了報告に記載。
- 独立readonly reviewer: PASS — ready for Preview。

## Protected contracts

Shelf3件、Thread本文・出典、Works既存4項目、保存形式、runtime JS/CSS、CSP、GA4の17eventとpayload定義に変更なし。
新しい外部リンク先はPedal Records。自動fetch/画像取得/埋込なし。明示クリック時は既存official/external計測を使い、外部eventはdomainのみを扱う既存形式を維持。

## Remaining

デプロイ・push・PR・mergeなし。Previewを出す際に実端末からレーベルの対象曲へ進めることを確認する。無料素材は追加していない（ジャケット・音源の転載はしない）。
