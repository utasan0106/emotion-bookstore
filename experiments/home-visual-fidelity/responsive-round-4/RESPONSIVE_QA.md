# HOME RESPONSIVE ROUND 4 — QA 記録

Brief V2 §7–§10 の記録。数値の一次資料は `BREAKPOINT_TABLE.md` / `responsive_report.json`、
log は同 folder の `*.txt`。Claude 自身は GO を出さない（§12）。

## 1. 853 Golden regression（§4）

同じ capture host / font gate（`fonts-noto-cjk` + `/etc/fonts/local.conf` で出荷 stack → Noto Serif / Sans CJK JP）、
`tools/capture_home_853.js`、853 × 1844、dsf 1、reduced motion、単一 viewport。

| 回 | いつ | sha256 | Golden と |
|---|---|---|---|
| 1 | 実装前（`e440c81`、font gate 適用後） | `6f8a8e98…` | **byte 一致** |
| 2 | 実装途中（responsive CSS 追加直後） | `6f8a8e98…` | **byte 一致** |
| 3 | 最終（QA 修正後、決定性フラグ付き 4 回連続） | `6f8a8e98…` ×4 | **byte 一致** |

- Golden sha256: `6f8a8e981cc731c5337224d445b6ec5469a0b81f88e1f3b6463d60905b506ce5`
- final 853 sha256: 同上（`capture_853_final.json`）。byte equality = **true**
- pixel MAE: 0.0 / 255（5 section すべて 0.0、`true_compare_853_R4.txt`、`HOME_TRUE_PIXEL_DIFF_853_R4.png` は全面黒）
- 5 section geometry: hero 0/0/853/617、cities 32/706/789/311、works 32/1104/789/143、thread 25/1275/803/292、
  strip 333/1620/512/186、spots 32/1746/212/48（契約値）。docW 853、docH 1844、JS error 0、request 失敗 0
- font probe: 23 / 23 が Noto Serif CJK JP か Noto Sans CJK JP（fallback 0）
- corridor guard（`qa/home_responsive_check.js` c800 / c853 / c899）: hero 617、title 61 / 74、pad 32、city 311、
  work 143、thread media 292 × 180、panel pad 21、shot 186、sheet full-bleed、body 32/147、aside 690/281 — すべて default のまま

### 1.1 capture の決定性（Round 4 で判明、runtime 不変）

最終撮影で 3 回に 1 回ほど sha256 が `275ec709…` / `aa81a68f…` になった。差分は thread 画像
（46,1341,292,180）の **43 px・±2/255 以下**、MAE 0.0、目視差なし。原因は Chromium の
checker-imaging（compositor 側の遅延 decode）が JPEG の縮小 decode scale を run ごとに変えること。
`img.decode()` 待ち + `--disable-checker-imaging --disable-partial-raster` を review tool
（`capture_home_853.js` / `capture_home_responsive.js`）に入れ、以後 8 / 8 で Golden と byte 一致。
runtime（`index.html` / `release.css` の 853 rule / `assets/`）には触れていない。

## 2. 静的 QA（§10）

`static_qa_after_r4.txt`: `home_canonical_check` GO（CSS の全 selector が `.home-canonical` / `.hc-` 内、anti-drift 0）/
`release_check` GO / `growth_improvements` PASS / `release_expiry_boundaries` GO / `seo_check` GO /
`release_preflight` GO / `git diff --check` clean。
`ga4_v3_client_selftest` は commit 前は protected file（`release.css`）の uncommitted diff を assert して
exit 1（仕様、Round 3 と同じ）。commit 後の clean tree で GO（§5）。

## 3. Full browser QA（§7、`qa/browser_qa.js`）

| | baseline `e440c81` | after Round 4 |
|---|---|---|
| 結果 | 675 / 695、FAIL 20、NOT OBSERVABLE 5 | **734 / 754、FAIL 20、NOT OBSERVABLE 0** |
| log | `browser_qa_baseline_e440c81.txt` | `browser_qa_after_r4.txt` |

FAIL ID 集合（scope + name）は **同一の 20 件**（`diff` で差分なし）。すべて非 HOME・既知で、今回直していない:

```
m320/{kichijoji,koenji,shimokitazawa,jinbocho,suggest} no_horizontal_overflow   (5)
m390/{kichijoji,koenji,shimokitazawa,jinbocho,suggest} no_horizontal_overflow   (5)
identity/{kichijoji,koenji,shimokitazawa,jinbocho} no_object_media_before_explainer (4)
suggest-validation clipboard_disclosure_present                                    (1)
flagship city_photo_appears_only_after_entering_city                               (1)
zoom200-shelf / zoom200-suggest / forced-shelf / forced-suggest no_horizontal_overflow (4)
```

新規 FAIL: **0**。

NOT OBSERVABLE 5 件（m320 / m390 / m430 / d1440 `home_canonical_at_this_width`、zoom200-foyer）は
今回の Gate 対象なので実測 check へ移行し、**0** になった（§7 のとおり、この 5 件だけ）:

- 各幅の `<v>/home`: 5 section 順、横 overflow 0、hero 高さ（600 / 640 / 660 / 680 ±2）、title
  （44 / 54 / 58 / 84 ±0.5）3 行、city / work の列数（2 / 2 / 2 / 4）、mobile shell padding、1440 の sheet
  100 / 1240、実 anchor / button 44px、route-hold 8 件が静的 label（a / button でない、href / onclick なし、
  tabindex −1）、画像 loaded・same-origin、CDP platform font が Noto CJK JP、reduced motion で animation 0、
  menu が開き Escape で閉じて focus が trigger に戻る、外部 request 0、JS error 0（+59 check）
- `zoom200-foyer`: 720 CSS px @ dsf 2 で横 overflow 0、menu trigger / city link が 44px 以上・CTA が viewport 内、content 欠落なし

既存 check は削っていない・弱めていない（home853 block、credits、shelf、suggest 等はそのまま）。

## 4. 専用 responsive QA（`qa/home_responsive_check.js`、新規）

`home_responsive_check_after_r4.txt`: **HOME_RESPONSIVE_CHECK_GO (251 / 251)**。

幅ごと（m320 / m390 / m430 / t768 / d1024 / w1440 + corridor c800 / c853 / c899）:
5 section 順・h1 1 個 3 行・横 overflow 0・text clipping 0（22 種の text と親 box への内包）・
hero の overlap 0（title / sub / CTA / aside / scroll cue / menu / brand と trace の dot・年号）・
街の問い 3 行・画像 ≥ 13 loaded・same-origin・route-hold 8 件静的・実 target 44px・JS error 0・外部 request 0・
Noto CJK 実描画（11 probe）・animation 0・Brief §5 の数値（hero / title / lh ≤ 1.22 / CTA 220–244 × 52 /
aside 右 gutter / grid 列・行・高さ・gap / thread 1 列 or 画像列幅 + gap / panel padding / 画像 292:180 /
reality 列・gap・高さ・cafe 全幅 → 2 列・copy 先行 / shell / sheet）・menu 開閉と focus。
200 %（720 @ dsf 2）: overflow 0、5 section、clipping 0、CTA / menu 到達、mobile 文法。
reduced motion: reduce / no-preference で animation 0・描画 byte 同一。
keyboard 390 / 1440: skip link → brand → menu → 4 街の順、全 stop で `:focus-visible` + 2px outline、
route-hold は tab 順に出ない、menu を Enter で開き Tab が中に入り Escape で戻る。

## 5. Process hardening（§9）

`set -euo pipefail`。heredoc と QA guard / commit / push は別 step。順序:
baseline capture / QA（`e440c81`）→ 実装 → 853 regression → responsive captures → 静的 QA →
full browser QA → FAIL ID 集合比較（同一 20 件）→ NOT OBSERVABLE 0 確認 → `git diff --check` →
`git status` → commit → clean tree で主要 QA 再実行 → push → local / remote sha 確認。
失敗 log は消していない（決定性の切り分け log は scratchpad、要旨は §1.1）。

## 6. 実装側の目視分類（Human Review の前提。GO ではない）

- BLOCKER: 0
- MAJOR: 0
- MINOR:
  1. mobile の cultural trace は 213 × 154 と小さく、年号 4 つが 9px で密集する（重なりは無い。`CROP_390_HERO.png`）。
  2. 200 %（720 CSS px）は mobile 文法になり、hero title 58px が横幅に対して小さく見える（robustness の範囲）。
  3. 共有 site menu の secondary link（データの扱い / 写真・出典 / 入口へ戻る）は 390 で高さ 24px。
     共有 component で HOME 外なので今回は触れていない（`HOME_390_MENU.png`）。
  4. mobile の hero scrim は 853 の左寄り gradient のまま。title は capture で可読だが、写真の明部に
     「を、」が重なる（`CROP_390_HERO.png`）。scrim の変更は Brief に無いので入れていない。

## 7. 端末内保存 / 棚 / Object 契約 / GA4 / 外部通信

変更なし。`release.css`（HOME block の末尾に media query を追加）と `qa/browser_qa.js`（NOT OBSERVABLE 5 件の実測化）、
新規 `qa/home_responsive_check.js` / `tools/capture_home_responsive.js` / この folder。
storage key・storage format・削除挙動・GA4 event・外部 request・`release_content.js`・`credits.html`・
`assets/`・Rights 台帳は不変。
