# 「街へ出かけたくなる」映像の追加 — 作業引き継ぎ

2026-09-10。ファウンダーが12本を提示したが、作成時のセッションは
`Allowed domains` 環境で YouTube に接続できず、実在・公開状態・権利を確認できなかった。
`Default` 環境の新セッションが続きを行う。基準は `SELECTION-20260910.md` を先に読むこと。

起点コミット：`ecbc8d9`。

## ファウンダーから受け取った12本

いずれもID形式は正常。既存カタログとの重複なし、`blockedVideoIds` との一致なし。
街・題名・関係は未確認である。**推測で埋めない。**

```
BbbHjH0KGN4  hb3Xlqd755w  ikrTss1OnSE  CngPL5TJbr8
3TA4AImUi9A  070mLqao7KA  QjikKRJi7qc  3XzllMVMVuY
s2C_RRpEe_M  vUs3HTZQmJw  CF21pq0gHws  VYphxWr7iiM
```

`VYphxWr7iiM` にはファウンダーの手元で題名が付いていた：
「いいなCM　オリンパス　OLYMPUS　OM-D　宮崎あおい」。
**CMまとめ系チャンネルによる再アップロードの可能性がある。** 権利者本人のチャンネルか
確認できないなら載せない。オリンパス公式に同じCMがあればそちらへ差し替える。

## 手順

### 1. 実在と公開状態を確認する

```sh
node tools/check-videos.js BbbHjH0KGN4 hb3Xlqd755w ikrTss1OnSE CngPL5TJbr8 \
  3TA4AImUi9A 070mLqao7KA QjikKRJi7qc 3XzllMVMVuY s2C_RRpEe_M \
  vUs3HTZQmJw CF21pq0gHws VYphxWr7iiM
```

`YOUTUBE_API_KEY` があればこれで済む。無ければ YouTube を直接開いて同じ項目を見る。
`NG` の行と、埋め込み不可の行は公開しない。

### 2. 権利を判断する

APIも閲覧も、そのチャンネルが権利者本人かどうかは答えない。
公式チャンネル、または公式サイト・ニュースリリースから辿れるものだけを採る。
既存カタログの企業広告（東京メトロ、パナソニック、トヨタ）はすべてその形になっている。

### 3. 街と関係を決める

`SELECTION-20260910.md` の映像の採否に従う。要点だけ：

- 区・市全体のプロモーション映像は**採らない**。
- 場所そのもの（公園・映画館・ライブハウス・書店・劇場）の映像を優先する。
- 街との関係を出典で説明できること。説明できないものは採らない。

どの街にも属さないが良い映像なら、`commonVideos`（`discover/short-films/`）に置く道もある。
既存の東京メトロ・トヨタ・パナソニックがその扱いである。

### 4. 追加する

`tools/city-discovery-source.js` の `video()` ヘルパーを使う。

```js
video(city, id, title, creator, hook, relation, note, videoId, sources = []);
```

`checkedAt` は自動で `2026-09-08` が入る。**別の日に確認したなら、追加後に上書きする。**
既存の例（`bocchi-main-pv` の直後）と同じ書き方をすること。

### 5. 連動して直すもの（ここを忘れるとビルドかテストが落ちる）

映像を1本足すごとに、次が全部ずれる。落ちたら数字を直す、で構わない。

| 場所 | いまの値 | 意味 |
|---|---|---|
| `tools/build-city-discovery.js` の `featuredRotation['<city>/video']` | 街ごとの配列 | **追加した作品を必ず入れる。** 抜けるとビルドが落ちる |
| `qa/city_discovery_check.js:9` | `items.length, 72` | 作品総数 |
| `qa/city_discovery_check.js:74` | `pages, 98+research.length` | discover の生成ページ数 |
| `qa/design-redesign/routes.json` | `public_html` 155件 | 生成物から再作成する |

`routes.json` は手で書かない：

```sh
node -e "const fs=require('fs'),f=require('./tools/build-design-redesign'),r=require('./qa/design-redesign/routes.json');r.public_html=f.slice().sort();fs.writeFileSync('qa/design-redesign/routes.json',JSON.stringify(r,null,1)+'\n')"
```

**1街あたり映像は10件が上限**（`build-city-discovery.js` の明示的な制限）。現在の空き：

- 高円寺 6件（あと4）／下北沢 6件（あと4）／吉祥寺 6件（あと4）／神保町 5件（あと5）

12本が同じ街に偏ると上限に当たる。上限を動かすのは編集判断なので、当たったら止めて相談する。

### 6. 検証

```sh
node tools/build-city-discovery.js && node tools/build-work-pages.js \
  && node tools/build-weekly-outings.js && node tools/build-design-redesign.js
node qa/verify-product.js            # 20/20 になること
node qa/design_redesign_check.js
git diff --check
```

ブラウザ確認も行う。ローカルに `http-server` を立て、追加したページで：

- 読み込み時に provider へ接続していないこと（クリック起動が効いていること）
- ボタンを押すと player が1つだけ開くこと
- 320〜1440px で横はみ出しが無いこと

### 7. 公開

`claude/kanji-shoten-handover-ycqcu2` へ commit・push し、`main` へ早送りで push する。
force-push はしない。ファウンダーは本番反映を承認済みだが、
**見た目に判断を入れた箇所があれば、報告で明示する。**

## やってはいけないこと

- 動画IDから題名・街・関係を推測して書くこと。
- 再生や公開状態を確認せずに公開すること。過去に非公開動画を公開して削除した経緯がある。
- 権利者不明のチャンネルの映像を載せること。
- テストの固定値を「緩める」方向に直すこと。数字は実態に合わせて更新する。
