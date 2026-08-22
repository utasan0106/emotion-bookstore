# V3 Isolated UX Prototype v0.1

V3 UX Prototype Canonical v0.1 の clickable prototype。
この directory の中だけで完結する。本番 / V2 のファイルは読み込まない。

## 起動

    node -e "require('./verify/serve').start(4173).then(r=>console.log(r.base))"

または任意の静的サーバで `v3-prototype/index.html` を開く。

## 検証（Chromium が必要）

    NODE_PATH=/opt/node22/lib/node_modules node verify/core_loop.js
    NODE_PATH=/opt/node22/lib/node_modules node verify/a11y_responsive.js
    NODE_PATH=/opt/node22/lib/node_modules node verify/edge_cases.js
    NODE_PATH=/opt/node22/lib/node_modules node verify/screenshots.js

screenshot は `evidence/` に出力される。

## 状態

prototype 専用の IndexedDB（`v3-prototype-db`）にのみ保存する。
analytics network 送信・外部 AI・login は 0。
`Reset Prototype` で初期化する。

## data

`js/data.js` の 6 件は UX 確認用の prototype data。実在の店舗・イベントではない。
この fixture には Action Destination を設定していないため、外部 CTA は表示しない。

## Action Destination

Editorial で承認済みの Experience は、任意で次の情報を持てる。

```js
actionDestination: {
  type: 'official_page', // official_page / official_booking / official_purchase / official_viewing / map_directions
  nextAction: 'read',    // read / view / listen / visit / book / attend / purchase / other
  officiality: 'official', // official / official_designated / no_official_exists
  url: 'https://…',
  label: '…'
}
```

Product は行き先を選定せず、渡された値を `js/action_destination.js` で検証して表示する。
HTTPS 以外や不完全な値には CTA を出さず、別 URL へフォールバックしない。

物理 Experience が `physicalDestination: { approved: true, address: '公開住所' }` を持つ場合だけ、
approved primary action の secondary utility として API key 不要の Google Maps directions を組み立てる。
origin や利用者の現在地は指定・取得しない。
