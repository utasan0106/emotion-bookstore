# HOME 853 — INTEGRITY CLOSURE ROUND 2

Review artifacts only. **Not runtime.** Excluded from the delivery surface via
`/experiments/` in `.vercelignore`.

Baseline: `9ac0541` (origin/claude/home-visual-fidelity-853-v1-czlysk).
Scope: HQ ISSUE A（semantic route）/ B（ARCHIVE が時間経過で HOME を変える）/
C（data.html の旧 HOME 動画の trust copy）。HOME の見た目には一切触れない。

## 何を直したか

| Issue | Before (9ac0541) | After |
|---|---|---|
| A. traversal「吉祥寺の音楽」「ほかの街の音楽」 | 両方 `./index.html#hc-works`（意図が消える） | `./explore.html?category=music&town=kichijoji` / `./explore.html?category=music` |
| A. 保存済み `#by-kind` record | `#hc-works` へ読み替え（無関係な行き先） | query-before-hash も含めて `explore.html?category=…&town=…` へ。bare は `./explore.html` |
| A. 保存済み `#weekly-detour` / `#weekly-video-title` record | `#hc-thread` / `#hc-works` へ読み替え（fake route） | 題名・meta・保存内容はそのまま、非リンク「旧HOME掲載項目」。kind（detour / weekly-video）でも判定するので、9ac0541 で一度 `#hc-*` に付け替えられた形も同じ扱い |
| A. archive record | `./index.html#archive` | `./explore.html#archive` |
| A. HOME を旧 hash で開いたとき | `#archive` は runtime で section が生えて着地、`#by-kind` は無視 | `#by-kind`（query 付きも）→ explore へ `location.replace`、`#archive` → `explore.html#archive`、detour / video → hash を外して live region で知らせる。loop なし、back は HOME の前の page へ |
| B. `renderTopArchive()` | 任意の `#main` へ `#archive` を append（HOME 含む） | `explore.html` の `#archiveHost` にだけ描く。0 件なら host は hidden のまま。MENU「Archiveを見る」は `./explore.html#archive` |
| C. data.html | 「週末の前の一本」「31秒の動画を再生」「YouTube 読み込み」 | 現在の runtime だけ：外部サービスへの移動は押したときだけ／Google カレンダーには特集の題名・日時・会場・紹介文・公式 URL を引き渡す／GA4 のオン・オフとは別の操作 |
| 寄り道 / 週間動画の record 工場 | `decorateDetour` / `decorateWeeklyVideo` が `#hc-*` 向きの record を作る | 削除（受け手の DOM はどの page にも無い） |

## explore.html（compatibility surface）

旧 HOME の「種類から見る」（街 × 種類の有限索引）と ARCHIVE を引き継ぐだけの page。
新しい推薦・feed・ranking・data model ではない。`noindex`。

- hooks: `categoryTownIndex` / `categoryIndex` / `categoryResults` / `categoryArchive` /
  `categoryArchiveResults` / `archiveHost`（hidden で開始）
- `release.js` の既存 `renderCategoryIndex()` をそのまま使う（shelfList 無しで起動、
  link と `history.replaceState` の URL は `./explore.html`）。Canonical HOME にはこの
  DOM が無いので HOME では動かない。
- 期限切れ Object は載せない（既存 `isLive`）。ARCHIVE は現役の結果と分けて出す。
- page 内 `<style>` は archive host と出口 link の幅（page 幅・gutter）だけ。
  共有 `release.css` には触れていない。

## HOME visual drift

| | sha256 | document | sections |
|---|---|---|---|
| 9ac0541（before） | `be8be7a5e12e6677c33efa555d61a9cfb8c9f0afa80f654273b269ddd3abf8f3` | 853 × 1844 | 5 |
| this change（after） | `be8be7a5e12e6677c33efa555d61a9cfb8c9f0afa80f654273b269ddd3abf8f3` | 853 × 1844 | 5 |
| pixel diff | **0 / 1,572,932 px**（Chromium canvas で全画素比較） | | |

`HOME_853_INTEGRITY_2.png` が after の実描画（before と byte 一致）。同一 capture host
（Chromium / Playwright、853 × 1844、dsf 1、reduced motion）で撮っている。
この host には Noto CJK が無く CJK は WenQuanYi Zen Hei で描画される（capture host の
制約。before / after 同条件なので drift 判定には影響しない。853 の font gate 自体は
前回 round と同じく Noto CJK のある host で見る）。

時計を `2026-09-05T23:59:59+09:00` の 1 分後へ進めた HOME:

| | before (9ac0541) | after |
|---|---|---|
| sections | **6**（`archive` が生える） | 5 |
| document | **853 × 2172** | 853 × 1844 |
| `#archive` | 有 | 無 |
| MENU（閉じた dialog 内） | `./index.html#archive` | `./explore.html#archive` |

MENU の 1 link だけが時間で増える（閉じた dialog の中。geometry・画面は不変。
`HOME_MENU_TIMESHIFT_853.png`）。これを出さない方が良ければ `addArchiveMenuLink()` を
explore.html 限定にするだけで済む。

## QA

静的（すべて exit 0、post-commit の clean tree で再実行）:
`home_canonical_check` / `release_check` / `ga4_v3_client_selftest` /
`growth_improvements` / `release_expiry_boundaries` / `seo_check`（`seo_aio_check.js` は
repo に存在しない） / `release_preflight` / `git diff --check`。
`ga4_v3_client_selftest` は「release.js に uncommitted diff が無いこと」を assert する
ので、commit 前の dirty tree では exit 1 になる（この task が release.js を変えるため）。

browser QA（`qa/browser_qa.js`）:

| | pass | FAIL | NOT OBSERVABLE |
|---|---|---|---|
| baseline 9ac0541 | 555 / 575 | 20 | 5 |
| after | 669 / 689 | 20 | 5 |

FAIL 20 件は **同一集合**（`browser_qa_baseline_9ac0541.txt` / `browser_qa_after.txt`）:
m320 / m390 の shelf ×4 + suggest の横 overflow、identity/* の
`no_object_media_before_explainer` ×4、`suggest-validation clipboard_disclosure_present`、
`flagship city_photo_appears_only_after_entering_city`、zoom200 / forced の overflow ×4。
すべて非 HOME・既知。新規 FAIL 0。追加した 114 check は全部 PASS:

- `explore/m390` `explore/d1440`: deep link `?category=books`、`?category=music&town=koenji`、
  reload、keyboard（focus + Enter で選択と URL 更新、focus ring 可視、tabbable）、
  back / forward（絞り込みは history を増やさず、forward で状態復元）、zero-result
  （`いま 0 件`＋定型文、水増しなし）、unknown query、`#archive` で 0 件（空 UI 無し、
  live region で知らせる）、live objects only、archive 分離、overflow 0、外部通信 0、JS error 0
- `explore/traversal`: 棚の詳細 → link の text / href が「この街の <種類>」「ほかの街の
  <種類>」の意図どおり、実 pointer で押して explore の該当 town × category に着地、
  行はその街だけ
- `timeshift/*`: 期限 1 分後の時計で HOME 5 section・1844px・rect 7 個 canonical・
  `#archive` 無し・`#main` は hero + sheet だけ、data / credits / suggest / shelf ×4 に
  archive 無し、`explore.html#archive` に期限切れ特集（`Outside dandy 一日限りの復活公演`）
  が見え、その category の ARCHIVE 欄にも出て現役結果には混ざらない
- `legacy-hash`: `index.html#by-kind` → `explore.html`、`?category=music&town=koenji#by-kind`
  → `explore.html?category=music&town=koenji`（選択も一致）、`#archive` →
  `explore.html#archive`、`#weekly-detour` / `#weekly-video-title` は HOME に留まり
  scrollY 0・hash 除去・live region 告知、loop なし、back は前の page へ

pure（`qa/growth_improvements.js`）: query-before-hash / param 順 / 余計な param / bare /
detour・video（href 形と kind の両方）/ archive / 冪等性 / 非 HOME href 素通し。

## 端末内保存 / 棚 / Object 契約 / GA4 / 外部通信

- 端末内保存: key も形式も削除挙動も不変。旧 href は表示時にだけ読み替える。
- 棚 / Object 契約 / `release_content.js`: 不変。
- GA4: event 定義不変。explore.html は既存の generic fallback（page_title `V3 Public`）。
  旧 hash からの redirect は HOME の同期 script の後に走るので、本番では
  `v3_home_view` が 1 回記録されてから explore へ移る（定義変更なし）。
- 外部通信: 新規なし。HOME・explore とも外部 host 参照 0（browser QA で観測）。
- CSP / vercel.json / assets: 不変。

## 未解決（この round の対象外）

- ASSET Majors（作品から入る ×4、Featured Thread、現実へ出る #1）— 次の byte-supply round。
- RIGHTS_HOLD / 名称使用（前 round の `HOME_DIFFERENCE_INVENTORY.md` §RIGHTS_HOLD）— Founder 判断。
- 853 以外の幅の HOME responsive、200% 拡大 — 次 Gate（NOT OBSERVABLE のまま）。
- shelf / suggest の m320 / m390 横 overflow（explainer 2 句形式が 396px になる）— 既知、別 task。
