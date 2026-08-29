# みんなの感情書店｜文化案内（4つの棚）

公開先は `/machi/`。凍結済みの Human Test 用
`v3-prototype/tokyo-pilot-01/` とは独立していて、そちらには一切手を触れて
いません。ドメイン直下の「一冊にする」サービス本体とも別物で、そちらの
ファイルも変更していません。

公開URLの起点:
`https://emotion-bookstore.vercel.app/machi/`

玄関と棚は検索に載せる。候補ページ（`suggest.html`）はフォーム画面なので
`noindex` のままにしてある。棚より上に出ても人の役に立たないため。

## URL

| 画面 | パス |
|---|---|
| 玄関（街から見る / 種類から見る） | `index.html` |
| 種類を選んだ状態 | `index.html?category=<food\|experience\|books\|music\|film-stage>` |
| 候補を教える | `suggest.html` |
| 東京の棚 | `shelf.html?shelf=tokyo` |
| 高円寺の棚 | `shelf.html?shelf=koenji` |
| 下北沢の棚 | `shelf.html?shelf=shimokitazawa` |
| 神保町の棚 | `shelf.html?shelf=jinbocho` |

`shelf` を付けない `shelf.html` は東京の棚。知らない id は Object を出さず、
ほかの棚への出口だけを出します。

## 公開される 9 ファイル

```
index.html
shelf.html
suggest.html
release.css
release.js
release_content.js
assets/manuscript-cafe.png
assets/hachiko.jpg
assets/meguro-tapeworm.jpg
```

`qa/` は `.vercelignore` で配信面から外しています。runtime からの参照は 0 件です。

## 何のサイトかを先に出す

サイト共通の一文

> 人が選んだ場所・本・音楽・映画・催しを、街や種類ごとに少しずつ並べる文化案内です。

を、玄関・棚・候補ページの `<main>` 先頭に static で置く。街の棚を直接開いても、
最初の写真・図版より必ず先に読める位置に来る。JavaScript が動かなくても順序は
崩れない。折返しは `.jp-phrase` + `<wbr>` で意味単位に固定している。

## 種類（controlled category）

`food` / `experience` / `books` / `music` / `film-stage` の5つだけ。新しい無限棚では
なく、いま並んでいる12件を横断して見るための有限な索引。件数を揃えるための
水増しはしない。期限切れの `current` は索引にも出さず、別の Object で補充もしない。

## 候補を教える

`suggest.html` は backend を持たない。入力はブラウザの中だけで定型文になり、
URL / query / 計測 / 端末内保存のどこにも残らない。主たる操作は「候補文をコピー」
（Clipboard が使えなければ readonly textarea を選択して手でコピー）。
「公式Xを開く」はその次の独立した操作で、候補文を URL に載せない。
採否は編集部が公式情報と権利を確認して決める。

## mode と期限

- `evergreen` … 期限のない事実。
- `current` … 会期・公演など期限のある事実。`verifiedAt` と `expiresAt` が必須。

`node qa/release_preflight.js` が `now >= expiresAt` を1件でも見つけたら FAIL します。
`--at <ISO8601>` で判定時刻を指定できます（負のテスト用）。

runtime 側は、期限切れの `current` を含む棚を丸ごと閉じます。別の Object へ
自動で差し替えることはしません。差し替えは人の編集でだけ行います。

## media

- `photo` … 権利のはっきりした実写を同一オリジンに置いたもの。現在は東京の棚の 3 件。
- `plate` … 実写を持たない対象のための、V3 が組んだ活字図版。既存の表紙・ポスター・
  スチル・チラシは使いません。詳細の最下部に「この図版について」として明記します。

## 検査

```bash
node qa/release_check.js               # 静的契約（棚4×3件 / 種類 / 説明文 / 権利 / 候補ページ）
node qa/release_preflight.js           # 期限の門
node qa/release_expiry_boundaries.js   # 期限の境目
NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js    # 実ブラウザ
NODE_PATH=/opt/node22/lib/node_modules node qa/release_shots.js # visual evidence
```
