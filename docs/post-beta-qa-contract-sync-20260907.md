# Works QA contract sync

2026-09-07 / ローカルのみ、公開操作なし。

Branch: astra/post-beta-qa-contract-sync-20260907
Parent: be0a3364cec3cdf35429f0eab04457a292998bf7

## 問題

Worksの旧5FAILは、frozen source 2389b0ecへの期待値overlayが、Founder承認済みのBeta0 Atlas降格と5ca8c4eの高円寺copy修正を含んでいなかったことによる。本文の変更は不要。

## 変更

qa/works_check.jsのみ検査条件を同期。原本2389b0ecの参照は維持し、現在のcandidateから期待値を生成しない。

- Atlas entryを期待値から除去。
- guidanceを約15分に限定。
- 商店街の公式情報案内noteを承認文に同期。
- s1の一点／通りの追加説明を除去。
- s3の名称変更理由に関する注記を除去。
- facts / relations / sources / nodesの深い比較、top-level key一致、6scene、cue非表示の検査は保持。

## 検証

WORKS_CHECK_GO / THREAD_CHECK_GO / git diff --check GO。

検査自体が回帰を検出できるか、読み込む文字列だけをメモリ内で改変してnode子プロセスで確認。実データファイルへの書き込みなし。

| 模擬回帰 | 結果 |
|---|---|
| guidanceの未承認変更 | WORKS_CHECK_FAIL |
| Atlas入口の復活 | WORKS_CHECK_FAIL |
| 1957の削除済みclose復活 | WORKS_CHECK_FAIL |
| 1963の削除済み注記復活 | WORKS_CHECK_FAIL |
| 現在の40連を50連に改変 | WORKS_CHECK_FAIL |

今回の変更はQAとこの記録のみ。Product本文、作品inventory、画像、CSS、計測、storage、privacy、ネットワーク、mainは変更しない。

親branchの下北沢追加、さらにその親の吉祥寺追加を含む累積候補。単独でProductionへ適用するbranchではない。公開判断時は累積差分を確認する。

独立レビュー: PASS — ready for Preview。5ca8c4e実差分との一致、期待値が候補由来でないこと、assert縮小なしを確認。WORKS_CHECKを独立再実行してGO。QA同期自体に新しい手動Preview確認は不要。
