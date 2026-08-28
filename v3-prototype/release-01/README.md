# V3 Release Candidate 01 — 4つの棚

`v3-prototype/release-01/` は、凍結済みの Human Test 用 `tokyo-pilot-01/` とは
独立した公開候補です。`tokyo-pilot-01/` には一切手を触れていません。

## URL

| 画面 | パス |
|---|---|
| 玄関（4つの棚） | `index.html` |
| 東京の棚 | `shelf.html?shelf=tokyo` |
| 高円寺の棚 | `shelf.html?shelf=koenji` |
| 下北沢の棚 | `shelf.html?shelf=shimokitazawa` |
| 神保町の棚 | `shelf.html?shelf=jinbocho` |

`shelf` を付けない `shelf.html` は東京の棚。知らない id は Object を出さず、
ほかの棚への出口だけを出します。

## 公開される 8 ファイル

```
index.html
shelf.html
release.css
release.js
release_content.js
assets/manuscript-cafe.png
assets/hachiko.jpg
assets/meguro-tapeworm.jpg
```

`qa/` は `.vercelignore` で配信面から外しています。runtime からの参照は 0 件です。

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
node qa/release_check.js        # 静的契約（棚4×3件 / 言い回し / 権利 / CSS 契約）
node qa/release_preflight.js    # 期限の門
NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js    # 実ブラウザ
NODE_PATH=/opt/node22/lib/node_modules node qa/release_shots.js # visual evidence
```
