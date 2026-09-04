# HOME ASSET ROUND 3 — SUPPLY RECORD

受け取った byte をそのまま記録する。Review artifact only、runtime ではない
（`/experiments/` は `.vercelignore` で配信除外）。

受領日: 2026-09-03（session attachment）。
Founder/HQ 指示: `ROUND3_GO_DECLARATION.txt`（sha256
`24b3cb12d84671c46aefb56931e95c19f0ac97a27ed357f791c11c0bf7963084`、908 bytes）。

## 1. VISUAL_CANONICAL — 照合 PASS

| File | sha256 | bytes | px | 照合 |
|---|---|---|---|---|
| `HOME_REFERENCE_853.png` | `cc31aef9666dabf2f9a763f8948b67980860e970dba42df0b01ca0e383936625` | 2,197,522 | 853 × 1844 RGB | `SUPPLY_CHECKSUMS.json` の sha256 / size_bytes と**一致** |

`home_round3_go_and_canonical.zip` と 6 点原本の zip の両方に同じ byte が入っていた
（sha256 同一）。`experiments/home-visual-fidelity/reference/HOME_REFERENCE_853.png`
として commit した（`REFERENCE_FILE_HOLD` 解除）。

## 2. 6 点原本 — 受領は確認、manifest 照合は **未実施**

`HOME_ASSET_INSERTION_R3_READY.md` が repository（全 ref の履歴を含む）にも
添付にも存在しないため、期待 sha256 との照合はできていない。下は**受け取った
byte の記録**であり、正当性の判定ではない。

| # | File（受領名） | sha256 | bytes | px | EXIF（機材 / 日時 / ソフト） | EXIF Artist / Copyright |
|---|---|---|---|---|---|---|
| 1 | `book.jpeg` | `dd0b6a9dd8d5274bfb5e54b136dc9d7dcc3147392ad96677672d8f364014c6c0` | 2,132,283 | 3264 × 2176 | NIKON D800 / 2014-10-05 / VSCO | **Alona Grebenyuk / "Copyright 2016. All rights reserved."**（XMP `dc:creator` / `dc:rights` にも同文） |
| 2 | `Film_Reel_on_an_IMAX_15_70_mm_Film_Projector.jpg` | `ed3da66c768cb8bac58ba7d5eee498bb9274d14fb2cd6dfe2c051a34dde8096e` | 3,015,682 | 3264 × 2448 | Apple iPad mini (5th gen) / 2022-07-12 / iOS 14.2 | なし |
| 3 | `Turntable-1328823.jpg` | `790cc6f7fb1cc3c3624b1a31b4d9b39145ba86c26c48d803d8b9d7a870a37b69` | 1,795,138 | 3888 × 2592 | Canon EOS 400D / — / — | なし |
| 4 | `Video_Camera.jpeg` | `a47bd27151552f4d22c4582aa2aa66ec68f315663c91f52c1ef78ac1ef9f9a3f` | 113,319 | 1204 × 800 | NIKON D70 / 2005-02-12 / Ver.1.02 | なし |
| 5 | `KoenjiAwaOdori.jpg` | `472b59cdb5ed0242940fa9f74c41c4d22dd2f89962e6d34121730d47ef1be1c4` | 762,711 | 1524 × 1016 | SIGMA DP1 / 2008-08-23 / SIGMA PhotoPro 2.5 | なし |
| 6 | `Tea_Shop_and_Cafe_in_Kichijoji_(53416855218).jpg` | `ae968670f15e5264da72951a00474e22889bbd97d7baa76bb1ab8e3ec6fcd8a8` | 7,052,507 | 5333 × 4000 | Apple iPhone 15 Pro / 2023-12-22 / Adobe Lightroom 7.1.2 | なし（ただし画面左下に「© Stephen Kelly Photography」の**焼き込み透かし**） |

すべて baseline JPEG、Orientation=1（回転なし）。zip 内の `__MACOSX/._*` は
macOS の resource fork で、資産ではない（無視）。

## 3. 原本 byte は commit していない

- 6 点とも repository 内に権利記録（作者・出典 URL・license・license URL）が無く、
  `CLAUDE.md`「Rights 不明の画像・映像・音源を使わない」に当たるため、
  `assets/` にも `experiments/` にも入れていない。
- この session の egress は `commons.wikimedia.org` / `upload.wikimedia.org` /
  `pixabay.com` / `flickr.com` をすべて拒否（CONNECT 失敗）するので、File page
  での作者・license 確認もできない。
- 次 round で `HOME_ASSET_INSERTION_R3_READY.md` と一緒に再添付されたとき、
  上の sha256 と manifest の両方に一致することを確認してから使う。

## 4. 前提条件（ROUND3_GO_DECLARATION）の判定

| # | 条件 | 判定 |
|---|---|---|
| 1 | HEAD が `2981ad764deae9cfa767dfbe54a0bd64bc9ca293` | **PASS** — 指定 branch `claude/integrity-round-2-hq-go-tmxflb` をこの commit に合わせて開始（main `063dc4c` からの fast-forward。それまで branch は main と同一で固有 commit なし） |
| 2 | working tree clean | **PASS**（開始時 `git status` 0 件） |
| 3 | `HOME_REFERENCE_853.png` 添付 | **PASS**（§1、checksum 一致） |
| 4 | 6 点原本の添付と manifest 照合 | **添付は PASS / 照合は HOLD** — manifest を持つ `HOME_ASSET_INSERTION_R3_READY.md` が無い |

## 5. RESUME V2（2026-09-04）— Founder/HQ の Rights 決定と追加供給

Brief: `HOME_ASSET_R3_RESUME_V2.md`（添付。sha256
`496bc79ea9e357d7bf94e2afa156cd959f233a73f02cc9503318eeb4f276f3ca`、repository には置かない）。

| 受領 file（§2） | HQ 決定 | 作者 / license（Brief §2） | 期待寸法 | 実寸法 | 判定 |
|---|---|---|---|---|---|
| `book.jpeg` | **DO NOT USE**（埋め込み "All rights reserved" と Commons の CC0 表記が矛盾 → 保守的に不使用。metadata を剥がして使うことも禁止） | — | — | 3264 × 2176 | 不使用 |
| `Books on a Shelf.JPG`（差し替え） | **REQUIRED**（MarkBuckawicki / CC0 1.0 / File:Books_on_a_Shelf.JPG） | MarkBuckawicki / CC0 1.0 | 3264 × 2448 | **byte 未着** — この session の添付は Brief の md のみ（`/root/.claude/uploads`・`/mnt/attach`・`/mnt/user-data` を検索、0 件）。メッセージ内のインライン画像には file byte が無い | **HOLD（byte 待ち）** |
| `Film_Reel_on_an_IMAX_15_70_mm_Film_Projector.jpg` | GO | DiscoA340 / CC0 1.0 | 3264 × 2448 | 3264 × 2448 | 一致 |
| `Turntable-1328823.jpg` | GO | Egle P. / CC0 1.0 | 3888 × 2592 | 3888 × 2592 | 一致 |
| `Video_Camera.jpeg` | GO（`Video Camera.JPG` と byte 同一なら） | Popperipopp / Public Domain dedication | 1204 × 800 | 1204 × 800 | 寸法一致。Commons 側 byte との同一性はこの host から取得不可（egress 拒否）— §2 の sha256 と下の sha1 を HQ 側で File page の値と照合 |
| `KoenjiAwaOdori.jpg` | GO | Lucertola / Public Domain dedication | 1524 × 1016 | 1524 × 1016 | 一致 |
| `Tea_Shop_and_Cafe_in_Kichijoji_(53416855218).jpg` | LIMITED GO | Stephen Kelly / CC BY 2.0（Flickr → Commons、FlickreviewR 済） | 5333 × 4000 | 5333 × 4000 | 一致。透かしは消さない・案内先として薦めない |

原本 sha1（Commons の File page / API の sha1 と照合する用）:

| file | sha1 |
|---|---|
| `Film_Reel_on_an_IMAX_15_70_mm_Film_Projector.jpg` | `b097640e83fefb46d0f841a1ebb12a47367c7d36` |
| `Turntable-1328823.jpg` | `70005f455c019a74aba5c7684440fa91dce9a9ee` |
| `Video_Camera.jpeg` | `be6df7b919b9f67d7bb839503d7496264d85ddc6` |
| `KoenjiAwaOdori.jpg` | `9dd4a8d6d83e636b92721ca7f9b2f88a3a851937` |
| `Tea_Shop_and_Cafe_in_Kichijoji_(53416855218).jpg` | `7d621aa30e961655dc7750041f112b3504ed87b4` |

派生 asset（runtime）の sha256 と加工内容は `HOME_ASSET_LEDGER.json` が正。

## 6. FINAL closure brief（2026-09-04、`HOME_R3_FINAL_BOOK_AND_PD_PRECISION.md`）

Brief sha256 `bb34b7381bbbb92ff3f4ab8c3046579bf91274dc8f991057dc0da6de27a0cc25`。HQ が `dfb8e6a` を checkpoint として受理。

| 供給 | 期待 | 実際 | 判定 |
|---|---|---|---|
| `Books on a Shelf.JPG`（MarkBuckawicki / CC0 1.0 / File:Books_on_a_Shelf.JPG） | 3264 × 2448、Commons SHA-1 `38ab103f6e8de295ffdb4921973ad48839cdbfc4` | **byte 未着**（2 回目）。`/root/.claude/uploads` には Brief の md のみ。`/mnt/attach` `/mnt/user-data` 空。全 filesystem の 1MB 超 JPEG を sha1 走査 → 期待 SHA-1 に一致する file なし。メッセージ内のインライン画像は表示用で、file byte も EXIF も無い | **HOLD 継続（Brief §0「readable でなければ STOP」）** |

添付の方法について: Claude Code（web）では、チャット欄に貼った画像は「会話に見せる画像」
として届き、file としては保存されません。file として届けるには、`.md` や `.zip` と同じ
「ファイル添付」（クリップ / ドラッグでファイルとして添付）で `Books on a Shelf.JPG` を
付けてください。zip に入れて添付すれば byte が確実に届きます（Round 3 の 6 点原本と同じ方法）。

## 7. WORK_BOOK — HQ 供給派生（2026-09-04、`Books_on_a_Shelf_WORK_BOOK_for_Claude.zip`）

HQ の指示: 原本 `Books on a Shelf.JPG` の Wikimedia byte はこの環境へ転送できないため、
検証済み CC0 原本の user-visible preview から HQ が作成した**派生**を authoritative
byte-supply とする。Commons 原本 SHA-1 `38ab103f…` との比較は**行わない**（派生なので一致しない）。
manifest の `derivative_sha256` を検証する。

| zip 内 file | bytes | sha256 | 判定 |
|---|---|---|---|
| `Books_on_a_Shelf_HQ_preview_derivative.jpg` | 109,768 | `d08bfe955d55751e7fa9b0d4b83720000daca514e3bec76d4c709e06f3c46598` | **manifest `derivative_sha256` と一致**。568 × 426（manifest と一致）、baseline JPEG、EXIF 0 / ICC なし |
| `BOOK_ASSET_DERIVATIVE_MANIFEST.json` | 909 | — | source_work / source_author MarkBuckawicki / source_url File:Books_on_a_Shelf.JPG / source_license CC0 1.0 / derivative_note（原本ではない・SHA-1 比較不可） |
| `README_FOR_CLAUDE.txt` | 771 | — | 同旨。WORK_BOOK 188×143 slot だけに使う。credits に「HQ supplied preview derivative / display crop」を明記 |

runtime `assets/home-work-book.jpg` は上の派生と **byte 同一**（再圧縮・縮小・切り抜きなし。EXIF は元から無い）
なので、runtime file の sha256 = HQ manifest の値。原本（3264 × 2448）はこの環境に存在しない。
権利表記は MarkBuckawicki / Wikimedia Commons / CC0 1.0 を保持し、台帳・credits の両方に
「runtime の byte は HQ 供給の派生であり原本ではない」と明記した。
