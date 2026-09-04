# HOME RESPONSIVE ROUND 4 — evidence

Review artifacts only. **Not runtime.** `/experiments/` は `.vercelignore` で配信除外。

- Brief: `HOME_RESPONSIVE_R4_AUTHORITATIVE_V2.md`（HQ 添付。repo には置かない — Brief §0 のとおり）
- Frozen source: `claude/integrity-round-2-hq-go-tmxflb` @ `e440c81d5499d2ed505b40e7a8837e9aad8c4d1b`（触れていない）
- Execution branch: `claude/home-responsive-round-4-hq-go-3jdayn`（`063dc4c` = main から `e440c81` へ `--ff-only`）
- 853 Golden: `../asset-round-3/HOME_CURRENT_853_R3_FINAL2.png`
  sha256 `6f8a8e981cc731c5337224d445b6ec5469a0b81f88e1f3b6463d60905b506ce5`
- QA の記録: `RESPONSIVE_QA.md`。数値表: `BREAKPOINT_TABLE.md`（tool 生成）。

## 1. 何をしたか（runtime）

`release.css` の HOME canonical block 末尾に **Responsive Round 4** の override を追加した。
default rule（853）は 1 行も変えていない。override は Brief §3 の明示範囲だけ:

```css
@media (max-width: 799px), (min-width: 900px)   /* 実 anchor / button の当たり判定 44px（corridor 外） */
@media (max-width: 767px)                        /* Mobile */
@media (min-width: 390px) and (max-width: 767px) /* 390→430 の一次補間 */
@media (min-width: 768px) and (max-width: 799px) /* Tablet */
@media (min-width: 900px) and (max-width: 1199px)/* Desktop */
@media (min-width: 1200px)                       /* Wide */
```

800–899px（Golden corridor）には rule が無い。`index.html` / `release.js` / `release_content.js` /
`credits.html` / `assets/` は不変。route / CTA / content / animation の追加は無い。

| 幅 | shell | hero | title | cities | works | thread | reality |
|---|---|---|---|---|---|---|---|
| 320 | pad 20 | 600 | 44 / lh 1.2 | 2×2, 228 | 2×2, 112 | 1 列、画像 292:180、chain 2 列 + 5 番目 span、panel pad 18 | copy → cafe 全幅 → #2/#3 の 2 列、186 高 |
| 390 | pad 24 | 640 | 54 | 2×2, 252 | 2×2, 126 | 同上、panel pad 22 | 同上 |
| 430 | pad 24 | 660 | 58 | 2×2, 264 | 2×2, 135 | 同上、panel pad 22 | 同上 |
| 768 | content 720 中央、sheet full-bleed | 600 | 64 / lh 78 | 4 列 gap 12, 286 | 4 列, 132 | 280 + gap 24, panel pad 24 | copy 240 / 3 列 gap 10 / 154 高 |
| 853 | **不変** | 617 | 61 / 74 | 4 列 gap 12, 311 | 4 列, 143 | 292 + 22, pad 20/21/27 | 301 / 3 列 gap 12 / 186 |
| 1024 | sheet 960（左右 32）、content 896 | 640 | 72 / lh 87 | 4 列 gap 16, 320 | 4 列, 156 | 360 + gap 32, panel pad 28 | copy 280 / 3 列 gap 12 / 184 高 |
| 1440 | sheet 1240（左右 100）、content 1176 | 680 | 84 / lh 102 / max 7.2em | 4 列 gap 18, 340 | 4 列, 170 | 440 + gap 40, panel pad 32 | copy 320 / 3 列 gap 14 / 220 高 |

320→390→430 は Brief §5 A の 3 点を通る一次補間（`clamp` + `vw`）で、3 幅の実測は表の値そのもの。

## 2. Brief が決めていない点で実装側が選んだこと（HQ 判断の対象）

1. **mobile の hero aside** — 右 gutter・menu trigger の下（top 66px）に置いた。title / CTA / scroll cue /
   trace と重ならない右 gutter の位置は、320 でここしか無い（下段に置くと 320 で scroll cue と当たる）。
2. **mobile の cultural trace** — 853 の 0.25 倍（213 × 154）を CTA と scroll cue の間の帯に右寄せで置き、
   年号は user unit 36（描画 ≈ 9px）、dot は r 9。title 行が 390 で 327px 幅（ほぼ全幅）なので、
   853 のように title の右に流す余地が無い。4 年号は同じ。静的・非操作。
3. **sheet の内側 padding（1024 / 1440）** — 853 と同じ 32px。Brief は sheet 幅と viewport 余白だけを定める。
4. **thread panel の位置（768 / 1024 / 1440）** — content shell に揃えた（853 の 7px outset は持ち越さない）。
5. **mobile の reality strip の高さ** — 853 の 186px をそのまま（cafe 全幅も #2 / #3 も 186）。
6. **section 縦リズム（768 以上）** — 853 の値のまま。mobile だけ Brief §5 A3 の 44px。
7. **reality 本文の折返し** — `word-break: keep-all`（この CSS の慣例）。240 / 280 の列では
   「物語の終着点は、／いつも現実のどこかにある。」と読点の後で折れる。1440 は 1 行のまま。
8. **768 の chain connector** — node 間 18px（853 は 26px）。copy 列 368px に 5 node を欠けなく入れるため。
9. **200 % zoom の定義** — 1440 の窓を 200 % にした layout = 720 CSS px・dsf 2 で見た（mobile 文法）。
10. **capture host の決定性** — `img.decode()` 待ち + `--disable-checker-imaging --disable-partial-raster`
    を review tool に追加（`RESPONSIVE_QA.md` §1）。runtime には触れない。

## 3. Files

| file | 内容 |
|---|---|
| `HOME_320.png` `HOME_390.png` `HOME_430.png` `HOME_768.png` `HOME_1024.png` `HOME_1440.png` | 各幅の全体（dsf 1、単一 viewport、reduced motion、Noto CJK font gate） |
| `HOME_853_GOLDEN_REGRESSION.png` | 853。Golden と **byte 一致** |
| `HOME_390_MENU.png` | 390 で menu を開いた状態 |
| `HOME_200PCT.png` | 720 CSS px @ dsf 2（画像は CSS px 等倍で保存） |
| `HOME_390_motion-reduce.png` | reduced motion。no-preference と sha256 同一（`responsive_report.json`） |
| `CROP_320_HERO.png` `CROP_390_HERO.png` `CROP_1440_HERO.png` | hero closeup（aside / trace / CTA / scroll cue） |
| `CROP_390_THREAD.png` `CROP_390_REALITY.png` `CROP_768_THREAD_REALITY.png` | ambiguous crop closeup |
| `HOME_TRUE_PIXEL_DIFF_853_R4.png` `true_compare_853_R4.txt` `capture_853_final.json` | 853 regression（pixel diff は全面黒、MAE 0.0、font probe 23） |
| `BREAKPOINT_TABLE.md` `responsive_report.json` | 実測表（tool 生成） |
| `browser_qa_baseline_e440c81.txt` `browser_qa_after_r4.txt` | full browser QA（前後） |
| `home_responsive_check_after_r4.txt` `static_qa_after_r4.txt` | 専用 responsive QA / 静的 QA |
| `RESPONSIVE_QA.md` | QA の記録と FAIL ID 集合の比較 |

## 4. 再現

```bash
# capture host: fonts-noto-cjk + /etc/fonts/local.conf（出荷 stack → Noto Serif / Sans CJK JP）。../README.md 参照
NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_853.js \
  --out experiments/home-visual-fidelity/responsive-round-4/HOME_853_GOLDEN_REGRESSION.png   # sha256 = Golden
NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_responsive.js \
  --out experiments/home-visual-fidelity/responsive-round-4
NODE_PATH=/opt/node22/lib/node_modules node qa/home_responsive_check.js
NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js
```
