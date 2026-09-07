# 外部出口の確認と判定精度 R1

2026-09-07 / ローカルのみ
Branch: astra/link-health-precision-r1-20260907
Parent: 8f07f69192a5f6e965533c7a0874142266db50a6

## 実装

qa/link_check.jsの誤判定を修正。HTML属性の文字参照を1回decodeして実URLを調べる。元HTML・Productionリンクは変更しない。

- HTTP到達はOK。ただし作品の同一性・在庫・予約可能性の保証ではない。
- HEAD/GETとも404または410の場合だけDEADを報告。差し替え前の人による再確認は必要。
- 403/429/5xx、TLS、DNS、接続、timeout、HEAD/GET不一致はREVIEW。
- proxy遮断等はNOT OBSERVABLE。
- DEADはexit1。REVIEW/未観測はexit2。全件HTTP到達の場合だけGO。
- redirectの途中応答があってもcurl転送失敗時はOKにしない。

旧ツールのDEAD表示は、今回の確認でもJFDBのHTTP403に出た。しかし別取得では作品本文に到達した。環境によるアクセス制限と実際の消失を区別する必要がある。

## 実リンクの確認

| URL | 今回の結果 | 分類・対応 |
|---|---|---|
| https://jfdb.jp/title/2240 | curl403、Web本文取得成功・作品一致 | NO ACTION。URL維持 |
| https://www.koenji-pal.jp/about | Web取得502 | FIX SOON：実機で到達性を再確認。切断未確定、差し替えなし |
| https://www.koenji-pal.jp/access | Web取得502 | FIX SOON：同上 |
| https://mirairecords.com/stsr/2166 | 今回Web取得timeout。以前の開発時は本文確認済み | FIX SOON：再確認、切断未確定 |
| https://shimokita-ladyjane-movie.com/ | Web本文取得成功・作品一致 | NO ACTION。現在上映中とは約束しない |

全URL走査は完走していない。旧検査の部分ログは全件GOの根拠に使わない。ネットワーク承認がキャンセルされた旨の実行エラーを受けたため、全件の到達性は未確認として残す。

## QA

qa/link_check_selftest.js：30件GO、外部通信なし。HTTP各種、GET回復、404/410、転送失敗、proxy、timeout、HTML entity・二重decode防止を検証。

WORKS_CHECK_GO / RELEASE_CHECK_GO / git diff --check GO。
独立レビューPASS。指摘されたコメントと全件未観測の文言も実装に合わせて同期。

変更ファイルはQAと本記録のみ。Product本文、画像、Thread、Works在庫、JS runtime、CSS、GA4、Privacy、storage、CSP、main、Production変更0。

次の公開判断までに、上記3件の未確定出口を通常ブラウザで再確認する。今回の結果を理由にURLを推測して置換しない。
