# NON-HOME KNOWN-20 CLOSURE — R1 (2026-09-04)

Task Brief: `NON_HOME_KNOWN20_CLOSURE_AUTHORITATIVE_V1.md`（HQ GO）。
受け入れ済み Freshness source `e12fbe7799e21fff338c5f93bddc625c5adefaad`
（branch `claude/content-freshness-closure-r1-20260904`）から実行 branch
`claude/non-home-known20-closure-r1-20260904` を切り、受け入れ済みの
browser-QA FAIL 20 件だけを閉じた。HOME / Responsive / Freshness / Rights /
GA4 / storage / main / Production は触っていない。

この folder は review tooling と証跡だけ（runtime ではない、配信面に出ない）。

## 1. 結果

| | before | after |
|---|---|---|
| `qa/browser_qa.js` | FAIL 20 / 754（受け入れ済み 20 と ID 一致） | **GO 754/754**、FAIL 0、NOT OBSERVABLE 0、new FAIL 0 |
| 853 Golden（`capture_home_853.js` sha256） | `6f8a8e98…`（Golden と一致） | `6f8a8e98…`（**byte 一致**） |
| Responsive 320/390/430/768/1024/1440 + 200%/MENU/motion-reduce | — | 受け入れ済み `responsive-round-4/` と **全て sha256 一致** |
| `qa/home_responsive_check.js` | — | GO 251/251 |
| `release_content.js`（Freshness authority） | — | 変更なし（`git diff e12fbe7 -- release_content.js` 空） |
| static suite（canonical / release / growth / expiry / seo / preflight） | 全 GO | 全 GO |

`ga4_v3_client_selftest.js` は working tree が dirty の間だけ
`protected changed release.css` で FAIL する（Round 4 と同じ、`git diff -- release.css`
が空でないことを見る門）。commit 後の clean tree で GO を取り直した
（`static_qa_after_clean_tree.txt`）。

## 2. 原因と修正（class ごと）

### A. Identity / contract — 4（`identity/* no_object_media_before_explainer`）

- 根本原因：QA の `mediaBeforeExplainer` が `body *` の **IMG 全部** を数えていた。
  header の brand lockup `<img class="brand-lockup-image">` は explainer より前に
  あるので必ず 1 になり、Object media（`.media-frame`）は explainer の 640px 以上
  下（exBottom 123 / mediaTop 767）にあっても FAIL していた。
- 修正：`qa/browser_qa.js` の selector だけ。content media を
  `#main .media-frame, #main .media-plate, #main .card-media, #main img, #main picture, #main video`
  に限定し、その中で explainer より前にあるものを数える。explainer 自身も `#main`
  の先頭にあるので「Object media は explainer の後」という要件は弱めていない。
  explainer も brand logo も page の視覚階層も動かしていない。

### B. Flagship obsolete contract — 1（`flagship city_photo_appears_only_after_entering_city`）

- 根本原因：`.shelf-portrait.has-media img` が **ある** ことを要求する旧 assertion。
  棚上端の city portrait は 637f5e4 で撤去済みで、`qa/release_check.js` と各幅の
  `shelf_top_has_no_city_image` が「無いこと」を契約にしている。矛盾する assertion。
- 修正：`flagship shelf_top_has_no_city_portrait_after_entering_city`
  （`#shelfPortrait / .shelf-portrait` 0、`.shelf-hero img|picture|video` 0）に置き換え。
  portrait は足していない。

### C. Trust copy — 1（`suggest-validation clipboard_disclosure_present`）

- `suggest.html` の copy 出力直下 `#copy-fallback`（コピー操作に隣接、出力 textarea の
  `aria-describedby`）の先頭に、次の一文をそのまま追加：

  `「候補文をコピー」を押した場合だけ、端末のクリップボードにコピーされます。`

- 「ブラウザの外へ出ません」「決して送らない」等の絶対表現は無い（grep 0）。
  自動送信なし / 入力文を Analytics に送らない / 外部遷移は明示操作の後、はそのまま。

### D. Overflow — 14（m320 ×5、m390 ×5、zoom200 ×2、forced ×2）

`tools/overflow_probe.js` で全 scenario を先に計測した（`overflow_probe_baseline.txt`）。

- **実測：全 14 件が同じ 1 つの原因**。`release.css` の `@media (max-width: 820px)`
  にある `.site-explainer .explainer-line { white-space: nowrap; overflow-wrap: normal }`。
  1 文節目「感情書店の編集部が選んだ場所・本・音楽・映画・催しを、」（26 字）は
  320 では 13px × 26 = 338px > 284px、390 では 14px × 26 = 364px > 354px で
  block の外へはみ出す。block 自身の rect は容器幅のままなので、QA の element-rect
  collector には映らず `wide: []` で `doc.scrollWidth > clientWidth` だけが立つ。
  Range rect で text run を追うと `span.jp-phrase.explainer-line → 369 / 396` が唯一の
  超過。棚も候補 page も同じ `.site-explainer` markup。
- **疑い A `.open-button::after`（inset −14px）**：toggle `display:none` で docScrollWidth
  不変（369 → 369 / 396 → 396）。**反証**。card は viewport 端から 18px 内側にあり
  −14px は viewport の内側に収まる。CSS は触っていない（hit target 維持）。
- **疑い B `weekly-feature-meta / date / venue / verified`（zoom200）**：`min-width: 0`
  toggle で不変。**反証**（Round 4 log で名前が出たのは当時の weekly feature 文言。
  Freshness 後の文言では rect 超過 0）。CSS は触っていない。
- **forced-colors**：focus outline ではない。forced-shelf / forced-suggest とも同じ
  explainer の 396px。
- **zoom200**：`white-space: normal` だけでは 792 → 621 で残る（2 文節目は文節境界
  「・」を持たず、`overflow-wrap: normal` では折れない）。`overflow-wrap: anywhere`
  を足すと 390（overflow 0）。
- 修正：その rule だけを **safe wrap** にした（`white-space: normal` /
  `overflow-wrap: anywhere`、`display: block` と `word-break: keep-all` は維持）。
  文節ごとの改行と `<wbr>` 非表示は変わらない。幅が足りる 430 以上では以前と
  同じ 1 文節 1 行（430 control の screenshot は before/after で sha256 一致、
  docScrollWidth 430 → 430）。320 / 390 では文節境界（・）で先に折れ、200% だけ
  最終手段の anywhere が働く。文言は変えていない。`html, body { overflow-x }`
  は使っていない。
- HOME には `.site-explainer` が無い（853 / 6 幅 byte 一致で確認）。
  credits / data / explore の explainer は `.explainer-line` を使っていないので影響なし。

before / after（documentElement scrollWidth / clientWidth）：

| scenario | before | after |
|---|---|---|
| m320 shelf ×4 / suggest | 369 / 320（+49） | 320 / 320 |
| m390 shelf ×4 / suggest | 396 / 390（+6） | 390 / 390 |
| zoom200-shelf / zoom200-suggest | 792 / 390（+402） | 390 / 390 |
| forced-shelf / forced-suggest | 396 / 390（+6） | 390 / 390 |
| control m430 shelf / suggest | 430 / 430 | 430 / 430 |

## 3. 変更 file

- `qa/browser_qa.js` — identity content-media selector、flagship 契約の置換
- `release.css` — `@media (max-width: 820px) .site-explainer .explainer-line` の 2 宣言
- `suggest.html` — clipboard 開示文 1 文
- `experiments/non-home-known20/` — この folder（probe / 証跡 / review shots）

触っていない：`index.html`、`release.js`、`release_content.js`、Freshness 5 records、
assets / Rights、GA4 event、storage key / format、外部通信、route。

## 4. 端末内保存 / 棚 / Object 契約 / GA4 / 外部通信

いずれも変更なし。browser QA の `no_external_request*` / `input_is_not_stored_locally` /
`no_analytics_layer` / `no_js_error` は全 page で PASS。

## 5. capture host

Brief の precondition 「baseline FAIL set = 20」を満たすには、Round 4 / Freshness と同じ
capture host が要る。stock container には Noto CJK が無く、最初の run は 24 FAIL
（20 + `*/home actual_noto_cjk_font` ×4、WenQuanYi fallback）だった
（`browser_qa_baseline_before_font_setup.txt`）。`fonts-noto-cjk` を入れ
`/etc/fonts/local.conf` で出荷 stack → Noto Serif / Sans CJK JP に写像
（`home-visual-fidelity/README.md` と同じ方針）した後、baseline は受け入れ済み 20 と
ID 一致、853 capture は Golden と byte 一致。repo の変更ではない。

## 6. 再現

```bash
NODE_PATH=/opt/node22/lib/node_modules node experiments/non-home-known20/tools/overflow_probe.js --out /tmp/overflow_probe.json
NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js
NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_853.js --out /tmp/HOME_853.png   # sha256 = 6f8a8e98…
NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_responsive.js --out /tmp/responsive
```

## 7. files

| file | 内容 |
|---|---|
| `browser_qa_baseline_before_font_setup.txt` | stock host での最初の run（24 FAIL、font 4 件は host 起因） |
| `browser_qa_baseline.txt` | 修正前・font 設定後（20 FAIL、受け入れ済みと一致） |
| `browser_qa_after_dirty_tree.txt` / `browser_qa_after_clean_tree.txt` | 修正後（GO 754/754） |
| `fail_id_set_diff.txt` | FAIL ID 集合の比較 |
| `overflow_probe_baseline.{json,txt}` / `overflow_probe_after.{json,txt}` | 診断 probe（toggle T1–T6 の証跡） |
| `static_qa_baseline.txt` / `static_qa_after_dirty_tree.txt` / `static_qa_after_clean_tree.txt` | static suite |
| `home_responsive_check_after.txt` | Responsive contract（GO 251/251） |
| `home_regression_sha256.txt` / `capture_853_after.json` | HOME byte identity |
| `review-shots/` | 320 / 390 / zoom200 / forced / 430 control の before / after（page 上端 420px） |
| `tools/overflow_probe.js` | read-only probe |

KNOWN20 STATUS（Claude の判定、Release GO ではない）：**PASS** — HQ review 待ち。
