# HOME 853 — ASSET ROUND 3

Review artifacts only. **Not runtime.** `/experiments/` は `.vercelignore` で配信除外。

- Baseline: `2981ad764deae9cfa767dfbe54a0bd64bc9ca293`（Integrity Round 2、HQ GO）
- 指示: `ROUND3_GO_DECLARATION.txt`（HOME Asset Round 3 のみ承認。PR 作成・main merge・
  Production deploy・有償 Rights 手続き・法的十分性の判断は**不許可**）
- この round の runtime 変更: **なし**（`index.html` / `release.css` / `release.js` /
  `release_content.js` / `credits.html` / `assets/` すべて不変。HOME の描画 sha256 も不変）

## 1. checkpoint `ea853ee`（HQ 受理）— 開始判定と保留（履歴）

| 前提条件（GO Declaration） | 判定 |
|---|---|
| 1. HEAD = `2981ad76` | **PASS**（指定 branch をこの commit に揃えて開始） |
| 2. working tree clean | **PASS** |
| 3. `HOME_REFERENCE_853.png` 添付 | **PASS**（sha256 `cc31aef9…` = `SUPPLY_CHECKSUMS.json`） |
| 4. 6 点原本の添付 + `HOME_ASSET_INSERTION_R3_READY.md` の manifest 照合 | **添付 PASS / 照合 HOLD** |

`HOME_ASSET_INSERTION_R3_READY.md` は、repository（`git log --all`・全 remote ref の
ツリー・履歴）にも、今回の添付（zip ×2、txt ×1）にも存在しない。この file が
持つはずのもの — 6 点の期待 sha256、slot 対応、保存名・寸法・形式、alt 方針、
そして**作者・出典・出典 URL・license・license URL・改変条件**の権利記録 —
が無い状態で挿入すると、`CLAUDE.md`「Rights 不明の画像を使わない」「未定義の
Visual choice を勝手に選ばない」に反するので、挿入は行っていない。

その代わり、brief に依存しない部分をすべて終えた（§3）。brief が届けば、
挿入そのものは §6 の手順で 1 round で終わる。

## 2. 受け取った 6 点と canonical slot の対応（`ea853ee` 時点。目視。権利は未確認）

| 受領 file | canonical slot（`HOME_VISUAL_CONTRACT.md`） | 現在の runtime | 目視した被写体 | 注意 |
|---|---|---|---|---|
| `book.jpeg` | 作品から入る **本**（`data-asset-hold="work-book"`、188 × 143） | dark plane | 木の棚に並ぶ本、暖色の光 | EXIF/XMP に **"Copyright 2016. All rights reserved." / Alona Grebenyuk**。この文言のままでは使えない（HQ が license を確定するまで） |
| `Film_Reel_on_an_IMAX_15_70_mm_Film_Projector.jpg` | 作品から入る **映画**（`work-film`） | dark plane | 映写機にかかったフィルムリール | 権利記録なし。file 名は Commons 形式だが未確認 |
| `Turntable-1328823.jpg` | 作品から入る **音楽**（`work-music`） | dark plane | ターンテーブルとレコード | 権利記録なし。file 名の数字は stock site の ID 形式に見えるが未確認 |
| `Video_Camera.jpeg` | 作品から入る **映像**（`work-video`） | dark plane | 手持ちのビデオカメラ（レンズ正面） | 権利記録なし。canonical の映像 card もカメラ／モニタで、被写体は近い |
| `KoenjiAwaOdori.jpg` | 街から入る **高円寺** card（188 × 311、縦）と いま辿れるスレッド **thread image**（292 × 180、横） | どちらも `city-koenji.jpg`（夜の通り） | 夜の路上で踊る阿波おどりの連 | 1 frame で 2 slot。canonical は赤い「阿波おどり」提灯が主役の別 frame ×2。1524 × 1016 なので 188 × 311 の縦 crop は DPR 2 でも足りる |
| `Tea_Shop_and_Cafe_in_Kichijoji_(53416855218).jpg` | 現実へ出る **#1 cafe**（162 × 186） | `city-kichijoji.jpg`（ハモニカ横丁） | 吉祥寺の Tea MALSAN の店先、カウンターに客 | 左下に **「© Stephen Kelly Photography」の焼き込み透かし**（既存 `city-kichijoji.jpg` と同じ作者名・同じ Flickr ID 形式の file 名 → 同じ CC BY 2.0 の可能性が高いが未確認）。既存は `object-position` で透かし帯を切り出しているので、同じ扱いにするかも brief で決める |

HERO は今回の供給 6 点に含まれず、`ASSET_HOLD (hero)` のまま。

## 3. `ea853ee` で終えたこと（brief 非依存）

1. **`REFERENCE_FILE_HOLD` 解除** — `reference/HOME_REFERENCE_853.png` を commit。
   `SUPPLY_RECORD.md` §1。
2. **capture 再現** — `tools/capture_home_853.js` を追加し、HEAD `2981ad76` の HOME を
   853 × 1844・dsf 1・reduced motion・単一 viewport で撮影
   (`HOME_CURRENT_853_R3.png`)。sha256 `d8a94536f40c701c593cb14d3a46fd01d4e4ed422c0534aac80980011f34dbfe`
   = pass 2 の `../HOME_CURRENT_853.png` と **byte 一致**。JS error 0、request 失敗 0、
   5 section、rect 6 個（hero 0/0/853/617、cities 32/706/789/311、works 32/1104/789/143、
   thread 25/1275/803/292、strip 333/1620/512/186、spots 32/1746/212/48）が契約どおり。
3. **font gate** — capture host に `fonts-noto-cjk` を入れ `/etc/fonts/local.conf` で
   出荷 stack を Noto CJK JP に写像（host のみ、product CSS 不変）。CDP
   `CSS.getPlatformFontsForNode` で 23 probe（brand / h1 / hero sub / CTA / aside /
   scroll cue / trace 年号 / 各 section 見出し・注記 / 街名・問い / 作品 label /
   thread 見出し・pill・題名・sub・node / 現実へ出る 本文・CTA）が全部
   **Noto Serif CJK JP か Noto Sans CJK JP** で実描画。fallback（WenQuanYi）0。
4. **TRUE comparison** — `tools/true_compare.py` を canonical vs 上の描画で実行し、
   `../HOME_TRUE_SIDE_BY_SIDE_853.png` / `../HOME_TRUE_OVERLAY_853.png` /
   `../HOME_TRUE_PIXEL_DIFF_853.png` を生成（§4）。
5. **供給記録** — 6 点の sha256 / bytes / px / EXIF を `SUPPLY_RECORD.md` に固定。
   原本 byte は権利未確認のため commit していない。

## 4. TRUE comparison — canonical vs `2981ad76` の実描画（挿入前）

MAE = 画素あたり平均絶対差（0–255、RGB 平均）。`px>32` = 3 ch のどれかが 32 以上
違う画素の割合。

| section（Contract §2） | MAE | 読み |
|---|---|---|
| overall（853 × 1844） | **30.4** | 29.7 % の画素が >32 |
| HERO 0–617 | 26.4 | 写真違い（canonical は AI 合成の路地、runtime は `city-koenji.jpg`）+ 年号の位置 |
| 街から入る 617–1030 | 28.5 | 写真違い ×4、文字は一致 |
| 作品から入る 1030–1262 | 25.0 | 写真 ×4 が未充填（dark plane）。geometry・label・icon は一致 |
| いま辿れるスレッド 1262–1592 | 37.0 | thread image が別被写体。右列は 18.7 |
| 現実へ出る 1592–1844 | 39.8 | strip 3 枚が別 frame |

| slot（Contract の rect） | MAE | px>32 | 原因 |
|---|---|---|---|
| HERO photo 0,0,853,617 | 26.4 | 30 % | 写真 |
| 高円寺 card 32,706,188,311 | 38.6 | 47 % | 写真（阿波おどり → 夜の通り） |
| 吉祥寺 card 232,706 | 33.7 | 41 % | 写真 |
| 下北沢 card 432,706 | 27.2 | 36 % | 写真 |
| 神保町 card 632,706 | 30.8 | 34 % | 写真 |
| 本 32,1104,188,143 | 27.1 | 31 % | 未充填 |
| 映画 232,1104 | 34.2 | 35 % | 未充填 |
| 音楽 432,1104 | 33.0 | 26 % | 未充填 |
| 映像 632,1104 | 35.1 | 27 % | 未充填 |
| thread image 44,1341,292,180 | **51.6** | 77 % | 写真（阿波おどり → 夜の通り） |
| thread 右列 360,1341,450,200 | 18.7 | 16 % | 字形差のみ |
| 現実へ出る #1 cafe 333,1620,162,186 | 62.5 | 71 % | 写真 |
| 現実へ出る #2 books 507,1620 | 67.9 | 72 % | 写真（同じ「本屋」でも別 frame） |
| 現実へ出る #3 live 681,1620 | 69.5 | 71 % | 写真（同じ「ライブハウス」でも別 frame） |
| 現実へ出る 本文 + CTA 32,1600,290,200 | 25.2 | 16 % | 字形差のみ |

読み方: 文字だけの領域が 18–25 なのは、canonical が別の Mincho / Gothic
（Mac 系）で描かれていて、capture host の Noto CJK と字形・ヒンティングが違うため。
pixel diff 画像で文字の縁が全面に光るのはそれで、位置ずれではない（side-by-side で
行位置・幅は重なる）。写真 slot は 50–70 で、Round 3 の asset 挿入で下がる部分。
挿入後に同じ script を回せば、この表がそのまま before / after になる。

## 5. brief に必要だった項目（→ `HOME_ASSET_R3_RESUME_V2.md` で HQ が決定）

挿入を 1 round で終えるために、file には次が要る。`qa/release_check.js` の
HOME 写真 gate（credits 8 項目 / CC license URL / **Commons File page URL** /
`release_content.js` の rights 記録との突合）を通す前提。

1. **manifest** — 6 点の期待 sha256（`SUPPLY_RECORD.md` §2 の値と一致するはず）
2. **slot 対応** — §2 の表で良いか。`KoenjiAwaOdori.jpg` を高円寺 card と thread image の
   両方に使うか、thread だけか
3. **保存名・寸法・形式** — 既存 practice は「原本を長辺 1600px 以内へ縮小して保存、
   crop なし、表示時のみ CSS で切り抜き・明度・彩度・コントラスト」（`credits.html`
   改変欄）。JPEG 品質、EXIF の除去可否
4. **権利記録（file ごと）** — 作者 / 出典 / 出典 URL（Commons の File page）/ license /
   license URL / 改変条件。特に:
   - `book.jpeg`: 埋め込み "All rights reserved" と矛盾しない license の根拠
   - `Tea_Shop…`: 焼き込み透かしの扱い（既存の `city-kichijoji.jpg` と同じく crop で
     隠すか、写すか）
   - Commons 由来でない file がある場合、gate の「Commons File page URL 必須」を
     どう扱うか（gate 変更は QA 契約変更 = HQ 決定）
5. **`release_content.js` 側の記録先** — 作品 ×4 は棚 heroMedia でも Object media でも
   ないので、いまの gate では突合先が無い。HOME 専用写真の rights table を
   `release_content.js` に置くか、gate を HOME 専用 list に拡張するか
6. **alt 文** — 既存 practice は「写真に写っているものだけを書く」

## 6. 手順（§10 で実行済み）

1. `SUPPLY_RECORD.md` §2 の sha256 と manifest を突合（不一致なら停止）
2. 派生 asset を `assets/` に生成（縮小のみ。canonical 画像は素材にしない —
   `qa/home_canonical_check.js` が禁止）
3. `index.html` の 6 slot（`is-asset-hold` ×4、高円寺 `.hc-city-media`、
   `.hc-thread-media`、現実へ出る #1 `.hc-reality-shot`）に差し替え。geometry 不変
4. `credits.html` に entry 追加、`release_content.js` に rights 記録（brief の指示どおり）
5. `node qa/home_canonical_check.js` / `release_check.js` / `ga4_v3_client_selftest.js` /
   `browser_qa.js`（home853 block）
6. `tools/capture_home_853.js` → `tools/true_compare.py` で §4 の after を取り、
   side-by-side / overlay / pixel diff を更新
7. Human Review（Founder/HQ final HOME Visual GO）

## 7. 端末内保存 / 棚 / Object 契約 / GA4 / 外部通信（`ea853ee` 時点）

すべて**不変**。runtime file に触れていない。追加した `tools/capture_home_853.js` は
`127.0.0.1` の一時 server と headless Chromium だけで、外部へは出ない。

## 8. `ea853ee` 時点の未解決（→ §10 で解消 / 更新）

1. `HOME_ASSET_INSERTION_R3_READY.md` の所在（HQ 側で作成済みなら添付、未作成なら §5 で作成）
2. `book.jpeg` の "All rights reserved" と、`Tea_Shop…` の焼き込み透かし — HQ の Rights 判断
3. HOME 専用写真の rights 記録先（`release_check.js` gate の突合先）— QA 契約の HQ 決定


---

## 10. RESUME V2 — runtime 挿入（2026-09-04）

Brief: 添付 `HOME_ASSET_R3_RESUME_V2.md`（HQ の Rights / QA 決定。repository には置かない）。
開始状態: branch `claude/integrity-round-2-hq-go-tmxflb`、HEAD = remote = `ea853ee`、tree clean。

### 10.1 使った asset / 使わなかった asset

| slot | 受領原本 | HQ 決定 | runtime 派生 | 結果 |
|---|---|---|---|---|
| WORK_FILM 映画 | `Film_Reel_on_an_IMAX_15_70_mm_Film_Projector.jpg` 3264×2448 | GO（DiscoA340 / CC0 1.0） | `assets/home-work-film.jpg` 1600×1200 | **挿入** |
| WORK_MUSIC 音楽 | `Turntable-1328823.jpg` 3888×2592 | GO（Egle P. / CC0 1.0） | `assets/home-work-music.jpg` 1600×1067 | **挿入** |
| WORK_VIDEO 映像 | `Video_Camera.jpeg` 1204×800 | GO（Popperipopp / PD dedication） | `assets/home-work-video.jpg` 1204×800（画素そのまま） | **挿入** |
| FEATURED_THREAD | `KoenjiAwaOdori.jpg` 1524×1016 | GO（Lucertola / PD dedication） | `assets/home-thread-koenji-awaodori.jpg` 1524×1016（画素そのまま） | **挿入** |
| REALITY_RETURN_1 | `Tea_Shop_and_Cafe_in_Kichijoji_(53416855218).jpg` 5333×4000 | LIMITED GO（Stephen Kelly / CC BY 2.0） | `assets/home-reality-kichijoji-cafe.jpg` 1600×1200 | **挿入**（透かしは残す。表示は中央より右寄せの縦切り抜きで、左下の透かしは枠外。消す・塗る・複製で埋める処理は無し） |
| WORK_BOOK 本 | `book.jpeg` | **DO NOT USE**（HQ） | — | 不使用 |
| WORK_BOOK 本 | `Books on a Shelf.JPG`（差し替え、MarkBuckawicki / CC0） | REQUIRED | — | **HOLD — byte 未着**。card は `is-asset-hold` のまま（地の色、偽図版なし） |

派生の作り方（`HOME_ASSET_LEDGER.json` の `derivation` に同文）: 長辺 1600 超は LANCZOS で
縮小（切り抜きなし）・JPEG q85、Display P3 は sRGB へ変換。長辺 1600 以下（映像・阿波おどり）は
再圧縮せず、EXIF / XMP / IPTC / ICC の APP segment だけを byte 単位で落とした（画素不変）。
どの派生も EXIF / GPS を持たない。原本 byte は repository に入れていない。

| 原本 sha256 | → 派生 | 派生 sha256 |
|---|---|---|
| `ed3da66c…8096e` | `home-work-film.jpg` | `5197cb9360c8e2ca739029a35a402e56e364231cffb400c974a33213e4d04c98` |
| `790cc6f7…37b69` | `home-work-music.jpg` | `3772448a90ab75db6b44871a0a9fe9c6c7b22e21af33a2b8263f06ec257246d7` |
| `a47bd271…f9a3f` | `home-work-video.jpg` | `1f93bec8be15a55035d7447b980fc47b3d0b8799fac458dfeec38c1e4b02b5ed` |
| `472b59cd…be1c4` | `home-thread-koenji-awaodori.jpg` | `a2ead0c3b9e950cf2195cda37b82acec9434b6c516fa8915a9c097472860b726` |
| `ae968670…6cd8a8` | `home-reality-kichijoji-cafe.jpg` | `774e29ee884c738c433d0db5bc8236373ea9892d86b5596b990bb5d843bab8d3` |

原本の完全な sha256 / sha1 は `SUPPLY_RECORD.md` §2 / §5。Commons 側 byte との同一性は
この host から取得できない（egress 拒否）ので、HQ 側で File page の sha1 と照合する前提。

### 10.2 runtime 変更（HOME の 6 slot のうち 5）

- `index.html`: 映画 / 音楽 / 映像 の card に `<span class="hc-work-media"><img …></span>` を
  追加し `is-asset-hold` / `data-asset-hold` を外す（`data-route-hold` は残す — route は無いまま）。
  本 は `is-asset-hold` のまま。thread image と 現実へ出る #1 の `<img>` を差し替え（alt は写って
  いるものだけ。店名は書かない）。
- `release.css`（HOME block 内、`.hc-` scope のみ）: `.hc-work-media` の image plane
  （city card と同じ「写真 + 暗い scrim」）、foot row を上に載せる `z-index: 1`、
  slot ごとの `object-position`（映画 50% 36% / 映像 40% 50% / カフェ 64% 50%）、
  映画だけ減光を弱める filter（原本が暗い室内のため）。geometry・型・copy は不変。
- 変えていないもの: HERO・trace・5 section・document 1844px・型階層・copy・route state・
  街 card（高円寺 card も `city-koenji.jpg` のまま、Brief §4）・responsive・Thread runtime・
  `release_content.js`・GA4。
- 描画差分: `HOME_CURRENT_853_R3.png`（前）→ `HOME_CURRENT_853_R3_FINAL.png`（後）で変わった
  画素 162,157 のうち、埋めた 5 箱の外は 588 px（4 箱の右端 1px 列、角丸クリップの AA）。

### 10.3 credits / 台帳 / QA 契約

- `credits.html`: 5 entry 追加（8 項目、CC license URL、Commons File page URL、「トップ」）。
  CC0 の 2 点と CC BY 2.0 の 1 点はそれぞれの license URL。PD dedication の 2 点
  （阿波おどり・映像）は `dfb8e6a` では Public Domain Mark 1.0 を license URL にしていたが、
  HQ 訂正（§11）で「権利情報URL = Commons File page の Licensing 節」に置き換えた。
- `experiments/home-visual-fidelity/asset-round-3/HOME_ASSET_LEDGER.json`: HOME 専用写真 5 件の
  台帳（Brief §5 の項目 + 原本 sha256 / sha1 / 派生の作り方 / 決定の出典）。
- `qa/release_check.js`: HOME 写真の権利突合を「`release_content.js` の rights **または** 台帳」に
  拡張。台帳 entry ごとに runtime file の存在・sha256 一致・https・必須項目・credits との
  author / license / URL 一致・index.html で実際に使われていること・棚 / Object media と
  二重管理になっていないことを見る。棚 / Object media の既存契約は不変。偽 Object は足していない。
  ネガティブテスト 3 件（sha 改変 / credits 作者不一致 / 台帳なし写真）で FAIL を確認して復元。
- `qa/home_canonical_check.js`: 作品 card は「asset-hold か写真か」の二択、thread = 阿波おどり、
  現実へ出る #1 = カフェ、を契約化。
- `qa/browser_qa.js` home853: `work_photos_fill_their_fields_same_origin`（3 枚 loaded・same-origin・
  188×143・cover・foot が上）/ `work_book_stays_asset_held_without_fake_image` /
  `featured_thread_image_is_awaodori_and_loaded` / `reality_first_shot_is_cafe_and_loaded`、
  画像総数 ≥ 12。

### 10.4 TRUE comparison — canonical vs 挿入後（`HOME_CURRENT_853_R3_FINAL.png`）

MAE は写真の**一致度**ではなく**差**なので、canonical の写真（AI 合成の提灯・映写機）と別の
実写を入れた slot は上がる。Brief §8 のとおり MAE に合わせて写真を選び直すことはしていない。

| region | MAE before (ea853ee) | MAE after (R3 FINAL) | px>32 before → after |
|---|---|---|---|
| overall 853×1844 | 30.4 | 31.2 | 29.7% → 30.3% |
| HERO y0–617 | 26.4 | 26.4 | 30.1% → 30.1% |
| 街から入る y617–1030 | 28.5 | 28.5 | 29.4% → 29.4% |
| 作品から入る y1030–1262 | 25.0 | 27.2 | 20.1% → 25.7% |
| いま辿れるスレッド y1262–1592 | 37.0 | 40.0 | 31.2% → 31.9% |
| 現実へ出る y1592–1844 | 39.8 | 39.1 | 35.8% → 34.3% |
| slot 本（held・不変） | 27.1 | 27.1 | 31.1% → 31.1% |
| slot 映画 ★ | 34.2 | 38.9 | 34.9% → 39.6% |
| slot 音楽 ★ | 33.0 | 34.4 | 26.2% → 38.0% |
| slot 映像 ★ | 35.1 | 45.8 | 26.6% → 51.8% |
| slot thread image ★ | 51.7 | 68.0 | 76.8% → 80.7% |
| slot 現実へ出る #1 cafe ★ | 62.5 | 57.5 | 70.8% → 60.1% |
| 不変: 高円寺 card | 38.6 | 38.6 | 47.1% → 47.1% |
| 不変: 現実へ出る #2/#3 | 72.5 | 72.5 | 72.0% → 72.0% |

読み: 全体 30.4 → 31.2。作品 3 slot・thread は「暗い地」や「夜の通り」から実写に替わったぶん差が
出る（映像は canonical がモニタ画面の青、こちらは暖色の手元）。カフェは canonical も店内の暖色
なので 62.5 → 57.5 に下がる。文字だけの領域（thread 右列 18.7 など）は不変。
被写体の可読性: 阿波おどりは踊り手の連が主役として読める。カフェは暖簾・看板・カウンターの客で
「店」と読める（店名が写真内に写るが、案内先・route にはしていない）。映画は原本が暗い
室内なので、card 単位で減光を弱めてリールと映写機が判別できる明度にした。

Artifacts: `HOME_CURRENT_853_R3_FINAL.png` / `HOME_TRUE_SIDE_BY_SIDE_853_R3_FINAL.png` /
`HOME_TRUE_OVERLAY_853_R3_FINAL.png` / `HOME_TRUE_PIXEL_DIFF_853_R3_FINAL.png`（この folder）。
描画: 853 × 1844、dsf 1、単一 viewport、JS error 0、request 失敗 0、rect 6 個が契約値、
CDP platform font 23 probe すべて Noto Serif / Sans CJK JP。

### 10.5 QA

静的: `home_canonical_check` GO / `release_check` GO / `growth_improvements` PASS /
`release_expiry_boundaries` GO / `seo_check` GO（`seo_aio_check.js` は repo に存在しない）/
`release_preflight` GO / `git diff --check` clean。`ga4_v3_client_selftest` は commit 後の clean tree
で GO（commit 前は protected file の uncommitted diff を assert して exit 1 — 仕様）。

browser（`qa/browser_qa.js`、同一 host、`browser_qa_baseline_ea853ee.txt` / `browser_qa_after_r3_final.txt`、この folder）:
FAIL は baseline と**同一集合 20 件**（m320 / m390 の shelf ×4 + suggest overflow、identity ×4、
suggest-validation clipboard、flagship `city_photo_appears_only_after_entering_city`、zoom200 /
forced ×4）。すべて非 HOME・既知。新規 FAIL 0。NOT OBSERVABLE 5（853 以外の幅・200% 拡大、
次 Gate）は PASS に数えない。追加 4 check は PASS。

### 10.6 端末内保存 / 棚 / Object 契約 / GA4 / 外部通信

すべて**不変**。storage key・形式・削除挙動に触れていない。`release_content.js` 不変。GA4 定義
不変（`.shelf-entry` ×4 も不変）。外部通信: 新規なし（HOME の画像 12 枚すべて same-origin、
browser QA `no_external_request` PASS）。CSP / vercel.json 不変。

### 10.7 未解決 holds

1. **WORK_BOOK**: `Books on a Shelf.JPG` の byte 待ち（HOLD）。届いたら §6 の手順で 1 slot。
2. **Rights 表記**: PD dedication 2 点は §11 で HQ 訂正どおりに直した。Commons 側 byte 同一性
   （sha1）と File page の作者 / license は HQ 検証済みという Brief の記述に依拠しており、
   この host からは再取得できていない。
3. **名称**: カフェ写真に店名が写る。案内先・route にはしていないが、写真の選定自体は HQ 判断。

`VISUAL STATUS` は Founder/HQ の独立レビューで決まる。Claude は GO を出さない。


---

## 11. FINAL closure — Book slot + Public Domain precision（2026-09-04）

Brief: 添付 `HOME_R3_FINAL_BOOK_AND_PD_PRECISION.md`。開始状態: HEAD = remote = `dfb8e6a`、clean。

### 11.1 Book slot — **HOLD 継続（byte 未着）**

Brief §0 は「差し替え原本の byte が読めなければ STOP」。`Books on a Shelf.JPG` は今回も file
として届いていない（`SUPPLY_RECORD.md` §6: uploads / `/mnt/attach` / 全 filesystem の sha1 走査で
期待 SHA-1 `38ab103f…` に一致する file なし）。Book slot は `is-asset-hold` のまま、runtime
（`index.html` / `release.css` / `assets/`）には触れていない。HOME 描画 sha256 は `dfb8e6a` と同一
（`8c140ca1…`、この節の QA で再撮影して確認）。byte が届けば §6 の手順で 1 slot を閉じる。

### 11.2 Public Domain rights precision — **完了**

HQ 訂正: Public Domain Mark 1.0 は状態表示であって作者の放棄文書ではない。

| asset | before（`dfb8e6a`） | after |
|---|---|---|
| `home-work-video.jpg` / `home-thread-koenji-awaodori.jpg` の credits | `ライセンスURL` = creativecommons.org/publicdomain/mark/1.0/ | `ライセンス` =「パブリックドメイン（著作権者本人による権利放棄。CCライセンスではなく、Public Domain Markでもない）」、`権利情報URL` = Commons File page `#Licensing` |
| 台帳 | `licenseUrl` = PDM | `license` = "Public Domain — copyright holder release"、`licenseUrl` = ""、`rightsSourceUrl` = Commons File page `#Licensing`、`licenseNote` |
| `qa/release_check.js` | credits 8 項目は固定名、全 entry に creativecommons.org 必須 | 台帳を先に読み、entry ごとに判定: CC / CC0 は従来どおり `ライセンスURL` + creativecommons.org 必須。著作権者本人の PD 放棄（`licenseUrl` 空 + `rightsSourceUrl` が Commons File page）だけ `権利情報URL` を要求し、その entry に creativecommons.org（PDM / CC）があれば FAIL、`ライセンスURL` ラベルがあれば FAIL、`rightsSourceUrl` と一致しなければ FAIL。台帳側: `licenseUrl` があれば creativecommons.org の license / CC0 URL 以外は FAIL（PDM を弾く）、無ければ PD かつ `rightsSourceUrl` 必須、それ以外は missing licenseUrl。「license URL は全部任意」にはしていない |
| `qa/browser_qa.js` credits | 8 項目名を固定比較 | 7 番目は `ライセンスURL` か `権利情報URL` のどちらか一方。新 check `public_domain_entries_link_commons_rights_not_pdm`（PD entry は Commons `#Licensing` へ link し creativecommons.org を含まない） |

CC0 3 点（映画・音楽・既存 SHELTER）と CC BY 2.0 / BY-SA の entry は不変。

### 11.3 QA（`dfb8e6a` + この変更）

- runtime 不変の証明: HOME を同 host で再撮影 → sha256 `8c140ca12577e009e0fcd30800bae8dcbc689cc1ce5c6972c045ee70755fc11d`
  = commit 済み `HOME_CURRENT_853_R3_FINAL.png`（byte 一致）。853 × 1844、5 section、JS error 0。
  Brief §4 の `*_R3_FINAL2` 画像は Book 挿入後に生成するものなので、Book が HOLD の今回は作らない
  （同じ画素の複製を別名で置かない）。
- ネガティブテスト（`release_check`、実行後に復元）: 阿波おどり entry に PDM URL を戻す → FAIL（2 件）、
  PD entry のラベルを `ライセンスURL` に戻す → FAIL、台帳の映像 `licenseUrl` に PDM → FAIL
  （"a Public Domain Mark is not a license"）、CC0 entry の `licenseUrl` を空に → FAIL（missing licenseUrl）。
- 静的: `home_canonical_check` GO / `release_check` GO / `growth_improvements` PASS /
  `release_expiry_boundaries` GO / `seo_check` GO / `release_preflight` GO / `git diff --check` clean /
  `ga4_v3_client_selftest` は commit 後の clean tree で GO。
- browser（`browser_qa_after_r3_final2.txt`）: 675 / 695、FAIL は baseline `ea853ee` と**同一集合 20 件**
  （全部非 HOME・既知）、新規 FAIL 0、NOT OBSERVABLE 5（次 Gate、PASS に数えない）。
  credits block の新 check `public_domain_entries_link_commons_rights_not_pdm` は m390 / d1440 とも PASS。

### 11.4 未解決（`34132b8` 時点 → §12 で WORK_BOOK 解消）

1. **WORK_BOOK** — `Books on a Shelf.JPG` の byte 待ち → §12 で HQ 供給派生により充填。
2. Commons 側 byte 同一性・作者・license は HQ 検証に依拠（この host は egress 拒否）。


---

## 12. WORK_BOOK closure — HQ 供給派生で 6/6 slot 充填（2026-09-04）

HQ 指示（message on `34132b8`）: `Books_on_a_Shelf_WORK_BOOK_for_Claude.zip` の派生 JPEG と
`BOOK_ASSET_DERIVATIVE_MANIFEST.json` を authoritative byte-supply とし、Commons 原本 SHA-1 とは
比較せず manifest の `derivative_sha256` を検証する。権利表記は MarkBuckawicki / Wikimedia Commons /
CC0 1.0 を保持し、runtime の byte が HQ 供給の派生であることを台帳・credits に明記する。

### 12.1 供給検証

| 項目 | 値 | 判定 |
|---|---|---|
| 派生 sha256 | `d08bfe955d55751e7fa9b0d4b83720000daca514e3bec76d4c709e06f3c46598` | manifest `derivative_sha256` と**一致** |
| 派生寸法 | 568 × 426 | manifest と一致。188 × 143 slot は DPR 2（376 × 286）まで実寸で足りる。upscale なし |
| EXIF / ICC | 0 / なし | 除去済み（元から無い） |
| Commons 原本 SHA-1 `38ab103f…` | 比較しない（HQ 指示。派生なので一致しない） | 記録のみ（`SUPPLY_RECORD.md` §7） |

### 12.2 変更（Book slot のみ）

- `assets/home-work-book.jpg`: HQ 派生と **byte 同一**（再圧縮・縮小・切り抜きなし）→ runtime file の
  sha256 = manifest 値。
- `index.html`: 本 card に `.hc-work-media` を追加、`is-asset-hold` / `data-asset-hold` を外す
  （`data-route-hold="work-book"` は残す — route は無いまま）。`is-asset-hold` の card は 0。
- `release.css`: **変更なし**（既存の `.hc-work-media` 共通 rule で描く。slot 別の override は不要と判断 —
  4:3 の派生は 188 × 143 にほぼ全面が入る）。
- `credits.html`: Book entry 追加（8 項目、CC0 URL、Commons File URL、「トップ」。出典欄と改変欄に
  「編集部（HQ）が作成した縮小版で Wikimedia の原本ファイルそのものではない」を明記）。
- `HOME_ASSET_LEDGER.json`: WORK_BOOK entry（author / source / sourceUrl / license CC0 / licenseUrl /
  modification（HQ 供給派生・display crop）/ sourceDimensions 3264 × 2448 / derivativeDimensions 568 × 426 /
  derivativeSha256 / sourceOriginalExpectedSha1（比較しない旨）/ supplyManifest / decision）。
- `qa/browser_qa.js` home853: 作品 4 枚とも写真（`work_photos_fill_their_fields_same_origin` = 4）、
  `no_work_card_is_asset_held`、画像総数 ≥ 13。`qa/home_canonical_check.js` は「asset-hold か写真か」の
  二択契約のまま（本が写真になったので通る）。`release_check.js` の台帳契約は変更なしで Book entry を検証。
- 変えていないもの: 他 5 asset の byte・markup・CSS、HERO、geometry、copy、route、`release_content.js`、GA4。

### 12.3 TRUE comparison — `HOME_CURRENT_853_R3_FINAL2.png`

| region | MAE ea853ee | MAE dfb8e6a (5 slots) | MAE FINAL2 (6 slots) |
|---|---|---|---|
| overall 853×1844 | 30.4 | 31.2 | 31.3 |
| HERO y0–617 | 26.4 | 26.4 | 26.4 |
| 街から入る y617–1030 | 28.5 | 28.5 | 28.5 |
| 作品から入る y1030–1262 | 25.0 | 27.2 | 28.4 |
| いま辿れるスレッド y1262–1592 | 37.0 | 40.0 | 40.0 |
| 現実へ出る y1592–1844 | 39.8 | 39.1 | 39.1 |
| slot 本 ★（今回） | 27.1 | 27.1 | 35.3 |
| slot 映画 | 34.2 | 38.9 | 38.9 |
| slot 音楽 | 33.0 | 34.4 | 34.4 |
| slot 映像 | 35.1 | 45.8 | 45.8 |
| slot thread image | 51.7 | 68.0 | 68.0 |
| slot 現実へ出る #1 cafe | 62.5 | 57.5 | 57.5 |

読み: 動いたのは Book slot だけ（27.1 → 35.3。canonical は暗い古書の背、runtime は明るい書店の棚を
共通 filter で暗くしたもの — MAE は差の量であり合致度ではない）。**他 5 slot の MAE は小数点以下まで
同じ**で、§4 の意図どおり drift なし。dfb8e6a → FINAL2 で変わった画素は 26,887、Book slot の外は 43 px
（thread 画像の左右端 1–6 px 列、y1341–1520 = 画像端のラスタライズ差。rect は 6 個とも不変）。

Artifacts: `HOME_CURRENT_853_R3_FINAL2.png` / `HOME_TRUE_SIDE_BY_SIDE_853_R3_FINAL2.png` /
`HOME_TRUE_OVERLAY_853_R3_FINAL2.png` / `HOME_TRUE_PIXEL_DIFF_853_R3_FINAL2.png`。
描画: 853 × 1844、5 section、rect 6 個が契約値、JS error 0、request 失敗 0、CDP 23 probe すべて
Noto Serif / Sans CJK JP。目視: 本 card は棚に並ぶ本の背と棚板が読める（共通の減光と scrim の下でも
「本」と分かる）。

### 12.4 QA — 訂正を含む記録

**訂正**: `5abc89b`（Book 挿入の commit）は、その時点の browser QA（`browser_qa_after_r3_final3_5abc89b.txt`、
673 / 695）に **新規 FAIL 2 件**（`credits/m390` と `credits/d1440` の `no_engagement_words` — Book entry の
被写体欄に書いた「店員の手書きのおすすめカード」の「おすすめ」が禁止語）を含んだまま push された。
原因は実装側の手順ミス（heredoc の終端で `&&` の連鎖が切れ、QA 差分の guard が commit / push に
届かなかった）。次の commit で被写体欄を「店員の手書きのカード」に直し（写真に写っているものの記述のみ、
runtime file は不変）、browser QA を再走した。

- 静的（訂正後）: `home_canonical_check` GO / `release_check` GO（台帳 6 entry、Book の sha256・credits 一致を含む）/
  `growth_improvements` PASS / `release_expiry_boundaries` GO / `seo_check` GO / `release_preflight` GO /
  `ga4_v3_client_selftest` GO / `git diff --check` clean。
- browser（訂正後、`browser_qa_after_r3_final4.txt`）: **675 / 695**、FAIL は baseline `ea853ee` と**同一集合 20 件**
  （全部非 HOME・既知）、**新規 FAIL 0**、NOT OBSERVABLE 5（次 Gate、PASS に数えない）。home853 の
  `work_photos_fill_their_fields_same_origin`（4 枚 loaded・same-origin・188 × 143・cover・foot が上）、
  `no_work_card_is_asset_held`、`featured_thread_image_is_awaodori_and_loaded`、`reality_first_shot_is_cafe_and_loaded`、
  credits の `no_engagement_words` / `public_domain_entries_link_commons_rights_not_pdm` は PASS。
- HOME 描画は `5abc89b` の FINAL2 から不変（訂正は credits.html の文言のみ。`index.html` / `release.css` / `assets/` 無変更）。

### 12.5 端末内保存 / 棚 / Object 契約 / GA4 / 外部通信

すべて**不変**。HOME の画像 13 枚すべて same-origin、外部 request 0、CSP / vercel.json 不変。

### 12.6 未解決

1. Commons 側の作者 / license / 原本 byte は HQ 検証に依拠（この host は egress 拒否）。Book の runtime byte は
   HQ 供給の派生で、原本 byte との同一性は定義上ない（HQ 指示どおり比較しない）。

`VISUAL STATUS = PASS（実装側。6/6 slot 充填、geometry・copy・route 不変、新規 FAIL 0）`。
HQ HOME VISUAL FIDELITY GO は Founder/HQ の独立レビューで決まり、Claude は出さない。
