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
network 送信・analytics・外部 AI・login は 0。
`Reset Prototype` で初期化する。

## data

`js/data.js` の 6 件は UX 確認用の prototype data。実在の店舗・イベントではない。
