# V3 MUSIC ACTION BRIDGE — Additive Multi-Action Foundation

- Branch: `claude/v3-music-action-bridge-20260825`
- Start HEAD: `c7c9b78407bc13408d167d10149175cb662da325`（Preflightでexact一致・tree clean・origin/main不変を確認）
- Content Mountなし（async / Music for 18 Musicians / 小津和紙 / PlayTime / Koyaanisqatsi は追加していない）
- iframe / SDK / external API / 新CSP host / embed 追加なし。Actionは従来どおり外部リンクbuttonのみ

## 変更ファイル（正確な一覧）

1. `v3-prototype/js/action_destination.js` — 63行追加・1行変更（Product runtimeはこの1ファイルのみ）
2. `v3-prototype/verify/music_action_bridge.js` — 新規verifier（33 assertions）
3. `.rc-evidence/music-action-bridge-20260825/` — 本evidence

変更なし: `app.js`（既存の複数Action描画が `kind !== 'primary'` を汎用に描画するためそのまま使える — 変更不要を確認済み）、`real_experience_registry.js`、`public_editorial_content.js`、CSS、`vercel.json`、Privacy、Terms。

## Action contract — before / after

### Before
- `experience.actionDestination` = 必須Primary 1件
- physical destination承認時のみ Maps を追加
- `openAction` は kind `primary` / `maps` のみ

### After（additive）
- Primary契約は完全互換（normalize・順序・検証・出力shape不変）
- optional `experience.secondaryActionDestinations` を新サポート:
  - `canonicalType === 'Music'` のときだけ有効
  - 最大2件、配列順＝表示順
  - nextAction: `listen` のみ／type: `official_viewing`・`official_page`／officiality: `official`・`official_designated`
  - URL: 既存 `httpsUrl()` 契約を再利用（HTTPS only・username/password拒否・制御文字拒否・2048上限）
  - provider名・label・URLはcontent dataが後から与える。runtimeにprovider名のhardcodeなし（verifierでソース走査により証明）
- Action順: `primary → secondary1 → secondary2 → maps(存在時)`（Musicは通常mapsなし）
- `openAction` は kind `secondary` を許可（`_blank`・`noopener,noreferrer`・HTTPS再検証・opener null化は従来と同一）
- 外部openイベントは従来どおり `{experienceId, actionType, destinationClass}` のみ（provider名・URLは送らない）

### Fail-closed（secondary一式のみ落とし、Primaryは常に維持。truncate・URL補完なし）
3件以上／非Music／invalid URL（http・credentials・javascript:等）／invalid nextAction・type・officiality／secondary間の重複URL・重複label／PrimaryとのURL重複／malformed object／非配列。

## 新規テスト結果（`music-action-bridge.txt` — 33/33 PASS）

- **A**: 既存9レコード（EXP_101〜107・EXP_007・EXP_001）のAction出力がBeforeと完全一致（さらにgit showによる旧module比較で全9件 IDENTICAL を実測）。secondary未指定・空配列もprimaryのみ
- **B**: Music+1 valid secondary → `primary,secondary` 順・open可能
- **C**: Music+2 → `primary,secondary,secondary` 著者順維持
- **D**: 3件 → secondary全fail closed・primary維持（truncateなし）
- **E**: 非Music／canonicalType欠落 → fail closed・primary維持
- **F/G**: secondary間重複URL・Primary重複URL・重複label → fail closed
- **H**: http／credentials付き／javascript: URL → fail closed
- **I**: invalid officiality・type・nextAction・malformed object・非配列 → fail closed
- **J**: secondary open = HTTPS・`_blank`・`noopener,noreferrer`・opener null化／イベントpayloadは`experienceId/actionType/destinationClass`のみ（URL不含）／primary open契約不変／改ざんhttp URLはopen時拒否／未知kindは拒否
- provider名（spotify/apple/itunes/youtube）のruntime hardcodeなしをソース走査で確認

## Regression

| 検証 | 結果 |
| --- | --- |
| Music Action Bridge verifier | **33/33 PASS** |
| Shelf Abundance full verifier | **115/115 PASS** |
| 権威regression suite | **9/9 suites・332 assertions PASS・0 FAIL** |
| Browser QA | **17/17 PASS** |
| `node --check` / `git diff --check` | OK |

## Diff 0 の証明

`git status`/`git diff --stat` により、Product runtime差分は `action_destination.js` のみ。したがって storage・GA4定義（analytics.js不変・イベントpayload契約はJ2で実測）・network runtime（外部リンクboutonのみ、first-paint third-party 0はbrowser QAで維持確認）・CSP・`vercel.json`・Privacy・Terms・実在庫（registry不変）・Human Editorial Reasons はすべて差分0。

## 将来のContent Mountへの注記（今回対象外）

- Music recordを実際にregistryへ載せる際は、registry側gate（`hasCompletePlaceDetail` 等）のMusic対応が別途必要（既知・本タスクのSTOP対象ではなくContent Mount側の作業）
- Product policy: Primary=登録なし試聴route、Secondary=Spotify、Secondary2=Apple Music/公式（PrimaryがApple Music web previewの場合Secondaryで重複させない。表記は「Apple Music」）— 本foundationはこのdataをそのまま受けられる

## main / working tree

- `origin/main` = `eca334f9671bee07833892b2476aac118f8ed018`（不変）
- commit後working tree clean（最終報告にcommit SHA記載）
