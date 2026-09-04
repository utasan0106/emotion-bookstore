# CONTENT FRESHNESS CLOSURE R1 — 2026-09-04 — evidence

Review artifacts only. **Not runtime.** `/experiments/` は `.vercelignore` で配信除外。

- Brief 1: `CONTENT_FRESHNESS_CLOSURE_AUTHORITATIVE_V1.md`（HQ 添付。repo には置かない）
- Brief 2: `CONTENT_FRESHNESS_HQ_VERIFIED_RESUME_V1.md`（HQ 添付。repo には置かない）
- Accepted source: `claude/home-responsive-round-4-hq-go-3jdayn` @ `ce92b6eda3b9736ed31da16acb548d26c845af07`
- 853 Golden: frozen `e440c81d5499d2ed505b40e7a8837e9aad8c4d1b`, sha256 `6f8a8e98…`（触れていない）
- Execution branch: `claude/content-freshness-closure-r1-20260904`

## Phase 1 — HOLD（`b217b30`）

Claude session の egress policy で公式 5 source に到達できず（CONNECT 403）、runtime を変更しなかった。
記録は `phase1-hold/`（`README_phase1.md`、`source_reverify.txt`、当時の固定時刻表・回帰・QA）。

## Phase 2 — HQ VERIFIED RESUME（this commit）

HQ が **2026-09-04T16:25:53+09:00** に 5 件の公式一次 source を独立再確認し、source-evidence HOLD を解除。
Resume Brief §2 の値を `release_content.js` にそのまま適用した（`release_content_diff.patch`）。
`verifiedAt` は **HQ の確認時刻**であり、Claude 自身の fetch 時刻ではない。

### 変更 record（before → after）

| shelf | field | before | after |
|---|---|---|---|
| kichijoji | weeklyFeature | 井の頭アートマーケッツ（expires 2026-09-06T17:00+09:00） | 谷口智則展「黒い森を抜けて」 2026-09-19〜11-03 10:00–19:30 / 武蔵野市立吉祥寺美術館 / expires `2026-11-03T19:30:00+09:00` |
| koenji | weeklyFeature | セシオン杉並まつり2026（expires 2026-09-06T15:00+09:00） | 座・高円寺『夏の夜の夢』 2026-09-13〜10-17 / 座・高円寺1 / expires `2026-10-18T00:00:00+09:00`（翌日 00:00 exclusive、公式は最終日のみ） |
| shimokitazawa | weeklyFeature | Outside dandy 一日限りの復活公演（expires 2026-09-05T23:59:59+09:00） | SHELTER 35th Anniversary “IGNITION GIGS” 2026-09-23 OPEN 12:00 / START 12:30 / 下北沢SHELTER / expires `2026-09-24T00:00:00+09:00`（翌日 00:00 exclusive） |
| jinbocho | weeklyFeature | 『まごわやさしい』3D原画展（expires 2026-09-15T17:00+09:00） | Alicekan 45th Anniversary えほんパーティー 2026-09-16 13:00〜09-29 17:00 / ブックハウスカフェ 1F ディスプレイウィンドウ / expires `2026-09-29T17:00:00+09:00` |
| jinbocho | object | `jinbocho-theater-mizoguchi-2026`（expires 2026-09-11T23:59+09:00） | `jinbocho-theater-joyu-damashii-2026` 女優魂2026 2026-09-12〜10-06 / expires `2026-10-07T00:00:00+09:00`（翌日 00:00 exclusive） |

4 weeklyFeature とも `verifiedAt: '2026-09-04T16:25:53+09:00'`。object も同じ。

### Brief の値からの LIMITED FIX（3 点、HQ 確認対象）

`qa/release_check.js` の既存契約に Brief §2 の literal がそのまま通らなかった箇所。事実・日付・URL・期限は変えていない。

1. `shimokitazawa.weeklyFeature.titlePhrases` — `['SHELTER 35th Anniversary', '“IGNITION GIGS”']` は連結すると title の空白が落ちる。
   `['SHELTER 35th Anniversary ', '“IGNITION GIGS”']`（前半に空白を含める。旧 `'Outside dandy '` と同じ流儀）。title 不変。
2. `jinbocho.weeklyFeature.titlePhrases` — 同じ理由で `['Alicekan 45th Anniversary ', 'えほんパーティー']`。title 不変。
3. `jinbocho.weeklyFeature.why` — Brief の「グッズや**人気**絵本が」は runtime 禁止語 `人気`
   （`release_check.js` の popularity guard、CLAUDE.md「Popularity ranking ではない」）に当たる。
   「グッズや絵本が」へ弱めた（主張を弱める方向のみ。事実は増やしていない）。HQ が別の言い回しを望む場合は差し替え可。

Archive（`archive: []`）には何も入れていない。`jinbocho-theater-mizoguchi-2026` は入替時点（09-04）で会期中（〜09-11）で「truly expired」ではないため（Brief 1 §6）。

## 固定時刻 QA（Resume Brief §5 + Brief 1 §6）

`fixed_clock_preflight.txt`（`qa/release_preflight.js --at`）、`fixed_clock_browser.md` / `.json`（実ブラウザ、Date 固定、`tools/fixed_clock_browser.js`）。

| JST | preflight | 吉祥寺 | 高円寺 | 下北沢 | 神保町 | HOME |
|---|---|---|---|---|---|---|
| 09-04 16:25:53（HQ verifiedAt）/ 実行時 | GO | open, weekly 表示 | open, weekly 表示 | open, weekly 表示 | open, weekly 表示 | 5 section |
| 09-06 17:00 / 09-11 23:59 / 09-12 00:01 / 09-13 00:01 / 09-16 00:01 / 09-19 00:01 | GO | open | open | open | **open（09/11 閉鎖が解消）** | 5 |
| 09-23 23:59 | GO | open | open | open, weekly 表示 | open | 5 |
| 09-24 00:00 | GO | open | open | weekly HIDDEN, open | open | 5 |
| 09-27 23:58 → 23:59 | GO → **FAIL** shimokitazawa-shelter | open | open | open → **CLOSED**（object 自身の期限） | open | 5 |
| 09-29 16:59:59 → 17:00 | FAIL（同上） | open | open | CLOSED | weekly 表示 → HIDDEN, open | 5 |
| 10-06 23:59:59 → 10-07 00:00 | FAIL → FAIL ×2（+ joyu-damashii） | open | open | CLOSED | open → **CLOSED** | 5 |
| 10-17 23:59:59 → 10-18 00:00 | FAIL ×2 | open | weekly 表示 → HIDDEN, open | CLOSED | CLOSED | 5 |
| 11-03 19:29:59 → 19:30 | FAIL ×2 | weekly 表示 → HIDDEN, open | open | CLOSED | CLOSED | 5 |

- 4 棚とも自分の current Object の期限までは open。期限切れ Object は出ない（棚が fail-closed、cards 0）。自動差し替え 0。
- 期限切れ weekly は境目の瞬間に HIDDEN。Archive は空のまま（explore の Archive 欄 hidden、rows 0）。
- HOME は全時刻で 5 section / 4 city / 5 node。JS error 0、外部 request 0。
- 会期前（〜09-19 の吉祥寺、〜09-13 の高円寺、〜09-12 の女優魂）の本文は日付の平叙のみ（「上映する」「上演する」）。「開催中」「上映中」は書いていない。

## Visual regression

`home_regression_sha256.txt` / `capture_853_after.json`。capture host: fonts-noto-cjk + `/etc/fonts/local.conf`（Noto Serif / Sans CJK JP、WenQuanYi reject）。

| 幅 | 結果 |
|---|---|
| 853 | Golden と **byte 一致**（sha256 `6f8a8e98…`、853×1844、5 section、font probe 23/23 Noto CJK JP、error 0） |
| 320 / 390 / 430 / 768 / 1024 / 1440 | responsive-round-4 の accepted PNG と **byte 一致** |
| `qa/home_responsive_check.js` | GO 251/251 |

HOME は `release_content.js` の weeklyFeature / object を描画しないので byte 一致が期待どおり成立。

## Static / browser QA

`static_qa_after.txt` / `browser_qa_after.txt` / `fail_id_set_diff.txt` / `home_responsive_check.txt`。

| gate | 結果 |
|---|---|
| home_canonical_check | GO |
| release_check | GO（current=2） |
| ga4_v3_client_selftest | GO（commit 後の clean tree で実行。protected file の uncommitted diff を見る gate のため） |
| growth_improvements | PASS |
| release_expiry_boundaries | GO（soonest shimokitazawa/shimokitazawa-shelter 2026-09-27T23:59+09:00） |
| seo_check | GO |
| release_preflight（now） | GO |
| browser_qa | 734/754、FAIL 20、NOT OBSERVABLE 0 — FAIL ID 集合は accepted 20 と **同一** |
| git diff --check | clean |

新規 FAIL: **0**。既知 20 は直していない。新規 asset: **0**。Rights ledger / credits: 不変。外部通信契約: 不変（browser QA external 0）。

## 端末内保存への影響

storage key / format / 削除挙動は不変。`weeklyFavorites` の record id は `weekly:<shelf>:<expiresAt>` なので新 weekly は新 id になり、旧 weekly の保存済み record は各自の `expiresAt` で既存 filter（`readWeeklyFavorites`）により自然に落ちる。

## 次の freshness boundary（HQ 判断）

1. **2026-09-27 23:59 JST** 下北沢の棚が閉じる（`shimokitazawa-shelter`、本 task の対象外）。
2. **2026-10-07 00:00 JST** 神保町の棚が閉じる（`jinbocho-theater-joyu-damashii-2026`）。

## 再現

```bash
node qa/release_preflight.js --at 2026-09-12T00:01:00+09:00
NODE_PATH=/opt/node22/lib/node_modules node experiments/content-freshness/closure-r1-20260904/tools/fixed_clock_browser.js \
  2026-09-11T23:59:00+09:00 2026-09-12T00:01:00+09:00 2026-10-07T00:00:00+09:00
NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_853.js --out /tmp/HOME_853.png
```
