# 下北沢 LADY JANE — ローカル実装 R1

2026-09-07 / 未公開

Branch: astra/shimokitazawa-ladyjane-thread-r1-20260907

Parent: 18aaba707fc382e8b5e791da8a1cba9460240857（吉祥寺PARKS背景更新を含む未公開候補）

このbranchを公開する場合はPARKSも含む。Production mainから独立した差分ではない。push / PR / deploy / main操作は行わない。

## 体験

下北沢の3 Objectを読む → 別区画「この街の読みもの」→ 店から劇場へ移った経緯 → 記録する制作意図 → 同じ街の映画館との接点 → 映画公式情報、または下北沢の棚へ戻る。

4場面、4関係、1fact、1出典、1公式出口。登場人物の心情や利用者の感情を推定しない。

## 出典対応

全て S1 https://shimokita-ladyjane-movie.com/ （2026-09-07本文取得）。

| ID | 根拠箇所 |
|---|---|
| rel:ladyjane-finale | Introduction・Chronology |
| rel:ladyjane-venue | Dear LADY JANE：山田亜樹の文章 |
| fact:ladyjane-recording | Dear LADY JANE：山田亜樹と栁澤裕美子の文章 |
| rel:ladyjane-film | Introduction・栁澤裕美子の文章 |
| rel:ladyjane-screening | Dear LADY JANE：山田亜樹の文章 |

同一ページの複数記載を複数独立資料とは数えない。全項目single_source。会場の比較選定理由、閉店の因果、新作と別作品の関係は補完しない。2027年予定の別映画とは混同しない。

公式出口は作品情報であり、現在の上映・予約可能性の保証ではない。過去の閉店・公演は年月日を明示。地図・歴史地点・経路・位置不明badgeなし。

## 画像

採用: assets/suzunari-2008.jpg

原典: https://commons.wikimedia.org/wiki/File:The_Suzunari_-_a_small_theater_(HDR)_-_Shimokitazawa,_2008-03-22_14.48.45_(by_Guwashi999).jpg

作者Guwashi999 / CC BY 2.0 / 撮影2008-03-22 / 1024×768 / 729390 bytes。

License: https://creativecommons.org/licenses/by/2.0/

原典の個別ライセンス、Flickr由来とライセンス確認記録、実画像を確認。劇場の看板と入口を示す街景写真。人物や掲示物は背景に含まれるが、それらを主題に切り抜かず、元画像のまま使用。出演者や映画の推奨を示す表現はしない。

2008年の会場外観として表示し、2025年終幕式の写真ではないことをcaptionに明記。作者・ライセンス・creditへのリンクを写真下に表示。credits.htmlに原典とライセンスリンク、改変なしを記載。same-origin配信、画像加工なし、外部画像runtimeなし。

## 保持した契約

- 既存4Threadのデータ・順序は完全一致。
- 4街それぞれ3 Object、finite end-plate維持。下北沢に別区画の読みもの1件のみ追加。
- Works inventory、既存renderer、CSS、privacy、storage、CSP、Atlas demotion変更なし。
- 計測は既存17eventのまま、公開ID shimokitazawa_ladyjane と l0〜l3の複合IDを固定許可値へ追加。
- 未知Threadはfail-closed。Preview/localは本番GA4送信0。

## QA

- qa/ladyjane_thread_qa.js：390/430/1440、87チェックGO。日本語fontの実描画、画像寸法、credit遷移、出典開閉、公式出口、棚帰還、横overflow0、JS error0、外部runtime0、既存4Thread不変。
- Measurement selftest：426/426GO。
- Thread / release static：GO。
- Works static：旧Koenji frozen契約の5FAILが継続。今回のinventory順序更新以外にテストを緩和しない。
- 構文チェック・git diff --check：GO。

検証画像: /workspace/scratch/92e9a8c7c403/ladyjane-qa/ （ローカルQA出力）。

## 次の境界

他の街との関連は、同じジャンルや閉店の類似だけでrelationにしない。まずこの読みものと吉祥寺をPreviewで確認する。新しい外部サービス・API・推薦・自動関連生成は追加しない。

## 独立レビュー

Reviewer: PASS — ready for Preview。映画公式・Commonsを独立確認し、87件の画面QAと426件の計測QAを再実行。新規失敗・意図しない変更なし。

追加回帰: PARKS 101件GO。Worksの5FAILはparent18aaba7でも再現し、今回の新規失敗ではない。

最終回帰: Release browser 776/776GO。初回は追加creditの項目分離不足のみ2FAILで、原典URLとライセンスURLを既存8項目形式へ揃えた。テスト変更なしで全件再実行PASS。限定修正も独立レビューPASS。GA4 client selftest GO。
