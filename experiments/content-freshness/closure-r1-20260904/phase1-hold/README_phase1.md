# CONTENT FRESHNESS CLOSURE R1 — 2026-09-04 — evidence

Review artifacts only. **Not runtime.** `/experiments/` は `.vercelignore` で配信除外。

- Brief: `CONTENT_FRESHNESS_CLOSURE_AUTHORITATIVE_V1.md`（HQ 添付。repo には置かない）
- Accepted source: `claude/home-responsive-round-4-hq-go-3jdayn` @ `ce92b6eda3b9736ed31da16acb548d26c845af07`
- 853 Golden: frozen `e440c81d5499d2ed505b40e7a8837e9aad8c4d1b`, sha256 `6f8a8e98…`（触れていない）
- Execution branch: `claude/content-freshness-closure-r1-20260904`
- Execution time (JST): `2026-09-04T16:16:30+09:00`

## 結論 — FRESHNESS STATUS = HOLD

Brief §2 が要求する「実行時に公式ソースを再度開く」が、この session の egress policy で
**5 件すべて不可能**だった（CONNECT 403 policy denial。`source_reverify.txt`）。
Brief §3「公式ページが開けないときは推測しない。record は HOLD / unchanged」に従い、
**`release_content.js` は 1 byte も変更していない。** 新しい `verifiedAt` / `expiresAt` を
ソースを見ずに書くことは、NO EVIDENCE = NO ROUTE に反するのでしていない。

| 候補 | 公式ソース | 結果 | 該当 record | 状態 |
|---|---|---|---|---|
| 吉祥寺 谷口智則展 | musashino.or.jp | CONNECT 403 | `kichijoji.weeklyFeature`（井の頭アートマーケッツ, expires 2026-09-06T17:00+09:00） | HOLD / unchanged |
| 高円寺 座・高円寺『夏の夜の夢』 | za-koenji.jp | CONNECT 403 | `koenji.weeklyFeature`（セシオン杉並まつり2026, expires 2026-09-06T15:00+09:00） | HOLD / unchanged |
| 下北沢 SHELTER 35th “IGNITION GIGS” | loft-prj.co.jp | CONNECT 403 | `shimokitazawa.weeklyFeature`（Outside dandy, expires 2026-09-05T23:59:59+09:00）/ object `shimokitazawa-shelter`（expires 2026-09-27T23:59+09:00） | HOLD / unchanged |
| 神保町 アリス館45周年企画 | bookhousecafe.jp | CONNECT 403 | `jinbocho.weeklyFeature`（『まごわやさしい』3D原画展, expires 2026-09-15T17:00+09:00） | HOLD / unchanged |
| 神保町 女優魂2026 | shogakukan.co.jp | CONNECT 403 | object `jinbocho-theater-mizoguchi-2026`（expires 2026-09-11T23:59+09:00） | HOLD / unchanged |

Changed record IDs: **none**。before → after: **none**。Rights / media changes: **NONE**。
Brief の「Previously verified」値は、公式ページを開き直せていないので runtime に入れていない
（`CANDIDATES_UNVERIFIED.md` に人の再確認用として転記。runtime からは参照されない）。

## 固定時刻 QA（現行コンテンツのまま）

`fixed_clock_preflight.txt`（`qa/release_preflight.js --at`）と `fixed_clock_browser.md`
（実ブラウザ、Date を固定。tool は `tools/fixed_clock_browser.js`）。

| JST | preflight | 吉祥寺 | 高円寺 | 下北沢 | 神保町 | HOME |
|---|---|---|---|---|---|---|
| 実行時 2026-09-04T16:16:30+09:00 | GO | open, weekly 表示 | open, weekly 表示 | open, weekly 表示 | open, weekly 表示 | 5 section / 4 city / 5 node |
| 09-06 00:00 | GO | open | open | weekly HIDDEN（Outside dandy 期限） | open | 5 |
| 09-06 15:00 | GO | open | weekly HIDDEN | weekly HIDDEN | open | 5 |
| 09-06 17:00 | GO | weekly HIDDEN | weekly HIDDEN | weekly HIDDEN | open | 5 |
| 09-11 23:58 | GO | open | open | open | open | 5 |
| 09-11 23:59 | **FAIL** jinbocho/jinbocho-theater-mizoguchi-2026 | open | open | open | **CLOSED**（準備中、cards 0） | 5 |
| 09-12 00:01 / 09-13 00:01 | FAIL（同上） | open | open | open | CLOSED | 5 |
| 09-15 17:00 / 09-16 00:01 / 09-19 00:01 | FAIL（同上） | open | open | open | CLOSED, weekly HIDDEN | 5 |
| 09-27 23:58 | FAIL（同上） | open | open | open | CLOSED | 5 |
| 09-27 23:59 / 09-30 00:01 / 10-07 00:01 | FAIL ×2（+ shimokitazawa/shimokitazawa-shelter） | open | open | **CLOSED** | CLOSED | 5 |

- 期限切れ Object は current として出ない（棚が fail-closed、cards 0）。自動差し替え 0。
- Archive は空のまま（`archive: []`、explore の Archive 欄 hidden、rows 0）。期限切れでない entry を入れていない。
- HOME は全時刻で 5 section。route 変更なし。JS error 0、外部 request 0。
- 09-11 23:59 〜 09-15 17:00 の神保町は「準備中」表示の上に weekly 特集（会期内）が残る。
  eyebrow「今週の特集」は `shelf.html` の固定文言で本 task の allowed files 外。stale claim ではない
  （特集自体は会期内）。`fixed_clock_browser.md` の該当セルは tool の regex 命中を注記に置き換えた。
- 「開催中」「上映中」「いま」を含む本文（mizoguchi）は期限と同時に棚ごと閉じるので、窓の外では表示されない。

## Visual regression（content 不変なので identity を要求）

`home_regression_sha256.txt` / `capture_853_after.json`。capture host: fonts-noto-cjk + `/etc/fonts/local.conf`
（出荷 stack → Noto Serif / Sans CJK JP、WenQuanYi reject）。CDP font probe 23/23 Noto CJK JP。

| 幅 | 結果 |
|---|---|
| 853 | Golden と **byte 一致**（sha256 `6f8a8e98…`、853×1844、5 section、error 0） |
| 320 / 390 / 430 / 768 / 1024 / 1440 | responsive-round-4 の accepted PNG と **byte 一致** |
| `qa/home_responsive_check.js` | GO 251/251 |

## Static / browser QA

`static_qa_after.txt` / `browser_qa_after.txt` / `fail_id_set_diff.txt` / `home_responsive_check.txt`。

| gate | 結果 |
|---|---|
| home_canonical_check | GO |
| release_check | GO（current=2） |
| ga4_v3_client_selftest | GO |
| growth_improvements | PASS |
| release_expiry_boundaries | GO（soonest jinbocho-theater-mizoguchi-2026 2026-09-11T23:59+09:00） |
| seo_check | GO |
| release_preflight（now） | GO |
| browser_qa | 734/754、FAIL 20、NOT OBSERVABLE 0 — FAIL ID 集合は accepted 20 と **同一**（diff なし） |
| git diff --check | clean |

新規 FAIL: **0**。既知 20 は直していない（Brief §8）。

## 残る freshness risk（HQ 判断）

1. **2026-09-05 23:59:59 JST** 下北沢 weekly、**09-06 15:00** 高円寺 weekly、**09-06 17:00** 吉祥寺 weekly が順に非表示になる（棚は開いたまま）。
2. **2026-09-11 23:59 JST** に神保町の棚が閉じ、release preflight が FAIL に転じる。次の release gate をそれより前に通すか、
   人が公式ページを開いて `jinbocho-theater-mizoguchi-2026` を差し替える必要がある。
3. **2026-09-27 23:59 JST** に下北沢の棚が閉じる（`shimokitazawa-shelter`）。
4. 公式ソースを開ける環境（または HQ が公式ページの実表示を添付）で、`CANDIDATES_UNVERIFIED.md` の
   5 件を再確認してから content edit を行う。

## 再現

```bash
node qa/release_preflight.js --at 2026-09-12T00:01:00+09:00
NODE_PATH=/opt/node22/lib/node_modules node experiments/content-freshness/closure-r1-20260904/tools/fixed_clock_browser.js \
  2026-09-11T23:58:00+09:00 2026-09-11T23:59:00+09:00 2026-09-12T00:01:00+09:00
NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_853.js --out /tmp/HOME_853.png
```
