# 引き継ぎ書 — 2026-09-11

**新しいクラウド環境 `emotion-bookstore` で開いたセッション向け。**
この1枚で足りるように書く。詳細が要るときだけ、指したファイルを読む。

起点コミット：`2813ebf`（main、本番反映済み）

---

## 0. 最初にやること：接続を確かめる

ファウンダーが環境を作り直した。カスタムのドメイン許可と `YOUTUBE_API_KEY` が
入っている**はず**。入っているかは**実測する。推測しない。**

```sh
[ -n "$YOUTUBE_API_KEY" ] && echo "key: あり" || echo "key: なし"
for h in github.com www.googleapis.com www.enjoytokyo.jp za-koenji.jp \
         jirokichi.net www.shogakukan.co.jp bookandbeer.com www.musashino.or.jp; do
  printf "%-24s %s\n" "$h" "$(curl -s -o /dev/null -w '%{http_code}' -m 12 "https://$h/")"
done
```

`000` は届いていない（プロキシが 403 を返している）。

**`github.com` が届かないと本番反映ができない。** そこが落ちていたら、
先に進まずファウンダーに知らせること。前の環境では全ドメインが塞がれていた。

---

## 1. いまのサイト

本番 `https://emotionbookstore.com/`、Vercel が `main` への push で自動反映。
生成ページ 170。

| | 本 | 音楽 | 映像 | 映画 | 計 |
|---|---:|---:|---:|---:|---:|
| 高円寺 | 4 | 5 | 6 | 5 | 20 |
| 下北沢 | 4 | 5 | 6 | 5 | 20 |
| 吉祥寺 | 3 | 5 | 6 | 5 | 19 |
| 神保町 | 5 | 5 | 5 | 3 | 18 |
| **計** | **16** | **20** | **23** | **18** | **77** |

ほかに街をまたぐ短編3件、催し24件。保留2件、見送り5件。

### 2026-09-10〜11 に増えた面

| 面 | 中身 |
|---|---|
| `/discover/weekly/` | 今週号。今週で終わる催し＋新しく入った作品 |
| `/feed.xml` | 新着のRSS。アカウント不要の再訪導線 |
| `/discover/venue/<id>/` | 会場5つ。本→その場所の音源→今週の催し |
| `/discover/places/` | 本屋・映画館・ライブハウス・劇場そのものの話18件（記録9／物語9） |
| 作品カード | 「なぜこの街？」＋出典を全77件に。出典50／記録27 で言い分け |
| 作品ページ | 説明・出典・確認日を1節に統合（重複していた） |
| 「同じ物語の、別のかたち」 | 森崎書店・グーグーの本↔映画 |

---

## 2. 期限があるのはこれだけ：催しが 9/21 に全部消える

**2026-09-21 に、公開中24件すべてが一度に表示から外れる。**
会期ではない。`reviewThrough` が**全件 `2026-09-20`** で揃っているため。

```
2026-09-14  12件
2026-09-21   0件   ← ここで全部
2026-09-28   0件
```

`node qa/event_supply_check.js` が実測を出す。下限5件を割ると落ちる
（正しく数えるので、9/14 に回せば来週0件で FAIL する）。

### 直し方（安い順）

**(a) 会期が9/20以降も残っている7件を再確認して `reviewThrough` を延ばす**

`koenji-midsummer` `koenji-cafetalk` `kichijoji-taniguchi` `kichijoji-winter`
`jinbocho-ginga` `shimokita-moon` `jinbocho-pokemon`

**公式ページを開いて開催が生きていることを確かめてから延ばす。**
確認せずに日付だけ書き換えない。`checkedAt` も確認した日に更新する。
これで 9/21 の週が 0件 → 7件。ただし 9/28 は3件、10/05 は2件のまま。

**(b) 新しい催しを足す。** 探し先は `docs/city-discovery/EVENT-SOURCES.md`。
**一覧サイト（enjoytokyo・walkerplus・gotokyo）は出発点であって出典ではない。**
必ず主催者・会場の公式ページまで辿り、そちらを `url` と `sources` に書く。
既存24件はすべてその形。

**展示3件・ライブ4件が薄い。** トップの「展示」「ライブ」はここへ来るので、
そこが読者の離脱点になる。優先して埋める。

1件に必要な8項目は `EVENT-SOURCES.md` に表がある。
`hook` と「なぜこの街か」は編集部が書くもので、**渡された事実から勝手に作らない。**

---

## 3. `YOUTUBE_API_KEY` があればできること

```sh
node tools/check-videos.js --catalogue        # 公開中59本
node tools/check-videos.js <id> [<id>...]     # 保留中12本（OUTING-VIDEOS-HANDOVER.md）
```

キーは絶対に出力しない作りになっている。`NG` の行と埋め込み不可の行は公開しない。
**API は「そのチャンネルが権利者本人か」を答えない。** そこは人が判断する。

---

## 4. Drive の候補台帳50件

精査済み：`docs/city-discovery/LEDGER-AUDIT-20260911.md`。要点だけ。

- **B-011 雨月物語（上田秋成）が最有力。** 12点。相手の映画 `jinbocho/ugetsu` は
  既に棚にあり、岩波書店の公式書籍ページがある。「同じ物語の、別のかたち」で対になる
- **B-007 ボン書店の幻／V-013 大屋書房**（どちらも12点）は `/discover/places/` に入る
- **国立映画アーカイブ10本**（1926〜1936年の東京）は街に紐づかない。
  ファウンダーが許可した「街に限らないコーナー」の種。全件が再ホスト禁止・公式embedのみ
- **Drive 台帳の5件が古い**（公開済みなのに「図版待ち」のまま）。Drive 側の更新が要る
- V-005・V-019 は台帳自身が9点未満としている。落とす候補

全件が「検索結果で見ただけ」か「URL未特定」。**実物の確認が要る。**

---

## 5. 検証のしかた

```sh
node qa/verify-product.js          # 22本。ここが緑でないと出さない
node qa/design_redesign_check.js   # 170ページ。文言と行き先の消失を見る
node qa/duplicate_text_check.js    # 168ページ。同じ文の二度出しを見る
node tools/build-city-discovery.js --check   # 生成物4本すべて --check が一致すること
node tools/build-work-pages.js --check
node tools/build-weekly-outings.js --check
node tools/build-design-redesign.js --check
git diff --check
```

`qa/` には48本あるが `verify-product` が回すのは22本。残りには**既知FAILがある**。
`qa/KNOWN-FAILURES-20260910.md` を先に読むこと。そこに無い指摘は今回起因である。

作品を足したら `qa/city_discovery_check.js` の固定値（件数・ページ数）と
`qa/design-redesign/routes.json` がずれる。**数字は実態に合わせて更新する。緩めない。**

```sh
node -e "const fs=require('fs'),f=require('./tools/build-design-redesign'),r=require('./qa/design-redesign/routes.json');r.public_html=f.slice().sort();fs.writeFileSync('qa/design-redesign/routes.json',JSON.stringify(r,null,1)+'\n')"
```

---

## 6. 守ること（`CLAUDE.md` が正本）

- **裏付けのない関係を出さない。** 推測で街や会場に紐付けない
- **文言は編集部が決める。** 生成物が紹介文を書かない
- 本番反映はファウンダー承認済み。`main` へ早送りで push。**force-push はしない**
- **テストを削除・skip して緑にしない。** 仕様が変わったら新しい契約を書く
- GA4・外部通信・端末内保存・棚・Object契約に触れたら、報告で影響の有無を明記する
- 権利不明の画像・映像・音源を使わない
- 完了報告は6項目（変更ファイル／変更内容／テスト結果／影響の有無／残る懸念3つまで／Previewの可否）

---

## 7. 編集部の判断待ち（Claude は書き換えない）

1. **会場ページ冒頭の一文5本** — Claude が書いた。サイト上でこの位置の文はここだけ
2. **`kichion-toranoko` と `kichion-lady` が同じ `relationNote`** — 吉祥寺の棚に
   同じ「なぜこの街？」が2枚並ぶ。`qa/duplicate_text_check.js` に名指しで登録してある
3. **`home_canonical_check` / `thread_check` の60件** — 承認済み再設計で消えた旧HOMEを
   検査し続けている。削除ではなく現行HOMEの契約へ書き直すのが筋だが、編集判断が要る

---

## 8. ファウンダー側でしか動かないこと

- 催し7件の再確認（**9/21 の期限**）
- `エンドレス・ワルツ`『影なき声』の行き先 — 台帳も「再上映まで Backlist」と判断。
  **いま何かする必要はない**
- メジャー作品の洗い出し、新しい街の選定（判断材料は `DIRECTION-20260910.md` の3条件）
- Drive 台帳の5件を「公開済み」に更新

---

## 読むもの（必要になったときだけ）

| ファイル | 何が書いてあるか |
|---|---|
| `CLAUDE.md` | 正本。禁止事項と権限 |
| `docs/city-discovery/EVENTS-SUPPLY-20260910.md` | 9/21問題の実測と直し方 |
| `docs/city-discovery/EVENT-SOURCES.md` | 催しの探し先と、1件に必要な8項目 |
| `docs/city-discovery/LEDGER-AUDIT-20260911.md` | Drive台帳50件の精査結果 |
| `docs/city-discovery/DIRECTION-20260910.md` | 在庫・メジャー・新しい街の方針 |
| `docs/city-discovery/SELECTION-20260910.md` | 採否の基準（直喩を採らない、等） |
| `docs/strategy/IDEAS.md` | 面白くするアイデア。却下したものも理由つき |
| `docs/strategy/MARKET-REVIEW-PROMPT.md` | 外部に評価させるプロンプト |
| `qa/KNOWN-FAILURES-20260910.md` | 既知FAILの台帳 |
| `docs/city-discovery/OUTING-VIDEOS-HANDOVER.md` | 保留12本のIDと手順 |
