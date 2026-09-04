# HOME 853 — ASSET ROUND 3（開始判定と保留）

Review artifacts only. **Not runtime.** `/experiments/` は `.vercelignore` で配信除外。

- Baseline: `2981ad764deae9cfa767dfbe54a0bd64bc9ca293`（Integrity Round 2、HQ GO）
- 指示: `ROUND3_GO_DECLARATION.txt`（HOME Asset Round 3 のみ承認。PR 作成・main merge・
  Production deploy・有償 Rights 手続き・法的十分性の判断は**不許可**）
- この round の runtime 変更: **なし**（`index.html` / `release.css` / `release.js` /
  `release_content.js` / `credits.html` / `assets/` すべて不変。HOME の描画 sha256 も不変）

## 1. 結論 — Round 3 は **BRIEF_HOLD + RIGHTS_HOLD** で asset 挿入前に停止

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

## 2. 受け取った 6 点と canonical slot の対応（目視。権利は未確認）

| 受領 file | canonical slot（`HOME_VISUAL_CONTRACT.md`） | 現在の runtime | 目視した被写体 | 注意 |
|---|---|---|---|---|
| `book.jpeg` | 作品から入る **本**（`data-asset-hold="work-book"`、188 × 143） | dark plane | 木の棚に並ぶ本、暖色の光 | EXIF/XMP に **"Copyright 2016. All rights reserved." / Alona Grebenyuk**。この文言のままでは使えない（HQ が license を確定するまで） |
| `Film_Reel_on_an_IMAX_15_70_mm_Film_Projector.jpg` | 作品から入る **映画**（`work-film`） | dark plane | 映写機にかかったフィルムリール | 権利記録なし。file 名は Commons 形式だが未確認 |
| `Turntable-1328823.jpg` | 作品から入る **音楽**（`work-music`） | dark plane | ターンテーブルとレコード | 権利記録なし。file 名の数字は stock site の ID 形式に見えるが未確認 |
| `Video_Camera.jpeg` | 作品から入る **映像**（`work-video`） | dark plane | 手持ちのビデオカメラ（レンズ正面） | 権利記録なし。canonical の映像 card もカメラ／モニタで、被写体は近い |
| `KoenjiAwaOdori.jpg` | 街から入る **高円寺** card（188 × 311、縦）と いま辿れるスレッド **thread image**（292 × 180、横） | どちらも `city-koenji.jpg`（夜の通り） | 夜の路上で踊る阿波おどりの連 | 1 frame で 2 slot。canonical は赤い「阿波おどり」提灯が主役の別 frame ×2。1524 × 1016 なので 188 × 311 の縦 crop は DPR 2 でも足りる |
| `Tea_Shop_and_Cafe_in_Kichijoji_(53416855218).jpg` | 現実へ出る **#1 cafe**（162 × 186） | `city-kichijoji.jpg`（ハモニカ横丁） | 吉祥寺の Tea MALSAN の店先、カウンターに客 | 左下に **「© Stephen Kelly Photography」の焼き込み透かし**（既存 `city-kichijoji.jpg` と同じ作者名・同じ Flickr ID 形式の file 名 → 同じ CC BY 2.0 の可能性が高いが未確認）。既存は `object-position` で透かし帯を切り出しているので、同じ扱いにするかも brief で決める |

HERO は今回の供給 6 点に含まれず、`ASSET_HOLD (hero)` のまま。

## 3. この round で終えたこと（brief 非依存）

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

## 4. TRUE comparison — canonical vs `2981ad76` の実描画

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

## 5. brief（`HOME_ASSET_INSERTION_R3_READY.md`）に必要な項目

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

## 6. brief が届いたときの手順（変更なしで実行できる）

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

## 7. 端末内保存 / 棚 / Object 契約 / GA4 / 外部通信

すべて**不変**。runtime file に触れていない。追加した `tools/capture_home_853.js` は
`127.0.0.1` の一時 server と headless Chromium だけで、外部へは出ない。

## 8. 未解決（max 3）

1. `HOME_ASSET_INSERTION_R3_READY.md` の所在（HQ 側で作成済みなら添付、未作成なら §5 で作成）
2. `book.jpeg` の "All rights reserved" と、`Tea_Shop…` の焼き込み透かし — HQ の Rights 判断
3. HOME 専用写真の rights 記録先（`release_check.js` gate の突合先）— QA 契約の HQ 決定
