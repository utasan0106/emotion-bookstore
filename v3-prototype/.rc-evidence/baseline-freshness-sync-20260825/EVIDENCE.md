# V3 BASELINE FRESHNESS SYNC — EXP_101 only

- Branch: `claude/v3-baseline-freshness-sync-20260825`
- Start HEAD: `3b5e1f6fd0a9f067fc67d76e384c767c789bd99f`（Shelf Abundance最新HEAD。Preflightでlocal/origin一致・working tree cleanを確認）
- 対象: `EXP_101 / チームラボボーダレス / 心が弾む` のfreshness不整合のみ
- Editorial変更なし・zero-cover routing変更なし・他7件のHuman-GO inventory不変更

## 変更ファイル（正確な一覧）

1. `v3-prototype/js/real_experience_registry.js` — EXP_101レコード内のみ
2. `v3-prototype/verify/shelf_abundance_foundation.js` — 古いProduction前提（心が弾む=cover 0）だったテスト2箇所を更新（synthetic zero-cover契約は全件維持）
3. `.rc-evidence/baseline-freshness-sync-20260825/` — 本evidence

## EXP_101 before / after

| フィールド | before | after |
| --- | --- | --- |
| `duration` | `8:30–21:00（通常）` | `通常 8:30–21:00（休館・短縮営業あり）` |
| `practicalTruth.hours` | `8:30–21:00（通常）` | `通常 8:30–21:00（休館・短縮営業あり）` |
| `practicalTruth.ticketStatus`（Exhibition schemaで許可済み） | `公式サイトで日時とチケットを確認` | `日時指定・料金変動あり。公式サイトで最新の営業日・時間・チケットを確認` |
| `freshness.recheckBy` | `2026-08-24` | `2026-09-07` |
| `authority.livenessCheckedAt` | `2026-08-23T22:33:00+09:00` | `2026-08-25T09:00:00+09:00` |
| `placeDetail.officialSource.verifiedOn` | `2026-08-23` | `2026-08-25` |
| `placeDetail.provenance.verifiedOn` | `2026-08-25`（同上） | `2026-08-25` |

不変更: id / title / type / relation（direct）/ Why（reason・placementReason）/ price / area / OUTING_RELATIONS / COLLECTION_RELATIONS / `authority.reviewedAt`（Human review日時）/ `authority.state`・`reviewerHuman`・`realDataGateResult`（Human approval）/ 他7件すべて。

recheckBy=2026-09-07 の根拠（コメントとしてレコード内に記録）: 8/25休館・9/1 17:00閉館・9/8休館が確認済みのため、9/8以降は再確認なしでは既存freshness gateがfail closedする状態を維持。

## Freshness boundary（実測）

| asOf | byId('EXP_101') | deckForEmotion('hajimu') |
| --- | --- | --- |
| 2026-08-25 | VALID | `["EXP_101"]`（復帰） |
| 2026-09-07 | VALID | — |
| 2026-09-08 | NULL（fail closed） | `[]`／collectionからも除外 |

他7件: EXP_102〜107・EXP_007・EXP_001 すべて 2026-08-25 でVALID、各棚のdeck idsに差分なし。

## Regressionテスト更新（Productは壊さず、古い前提だけ更新）

- unit: 「今日EXP_101がstale」前提の2 checkを、asOf明示のboundary契約3 checkへ置換（08-25有効＋cover復帰／09-07有効／09-08でcover・collection両方から除外）
- browser: 「Production 心が弾む=zero-cover空状態」checkを「cover復帰（deck 1件・空状態なし）かつ collection=1<6 でCTAどこにも非表示」へ更新
- synthetic zero-cover契約は全件維持・全件PASS: cover=0/collection=5→CTAなし、6→あり、15→あり、16→fail closed、cover1〜3通常flow不変（重複CTAなし）、zero-cover Detail往復、auto redirectなし、cover偽装なし、320/390/430/1440 overflowなし

## 検証結果

| 検証 | 結果 |
| --- | --- |
| Shelf Abundance full verifier | **115/115 PASS**（`shelf-abundance-foundation.txt`） |
| 権威regression suite | **9/9 suites・332 assertions PASS・0 FAIL**（`authority-regression-suite.txt`） |
| Browser QA | **17/17 PASS**（`browser-qa-custom.txt`） |
| `node --check`（registry・verifier） | OK |
| `git diff --check` | OK |
| storage / GA4 / network / CSP / `vercel.json` | 差分0（今回のdiffはregistryデータ2ファイルのみ） |
| 心が弾む通常flow smoke 390/1440 | 復帰確認（`m390-hajimu-discovery-restored.png` / `d1440-hajimu-discovery-restored.png`、JS errors 0・overflow 0） |

## main / working tree

- `origin/main` = `eca334f9671bee07833892b2476aac118f8ed018`（不変）
- commit後にworking tree cleanを確認（本ファイル末尾のcommit SHAは最終報告に記載）
