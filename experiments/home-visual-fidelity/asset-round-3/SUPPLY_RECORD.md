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
