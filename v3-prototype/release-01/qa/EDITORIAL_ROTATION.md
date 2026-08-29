# 差し替え手順（current object が期限を迎えたとき）

内部運用ドキュメント。`.vercelignore` で `qa/` ごと配信面から外れている。

## いま起きること

`current` の object は `expiresAt` を過ぎると、その棚が丸ごと閉じる
（`この棚はいま準備中です。`）。別の object へ自動で差し替わることはない。
差し替えは人の編集だけで行う、という契約になっている。

実測したカレンダー（2026-08-29 の差し替え後）:

| 日時 (JST) | 東京 | 高円寺 | 下北沢 | 神保町 |
|---|---|---|---|---|
| 〜2026-09-11 23:59 | 開 | 開 | 開 | 開 |
| 2026-09-12 00:00〜 | 開 | 開 | 開 | **閉** |
| 2026-09-28 00:00〜 | 開 | 開 | **閉** | **閉** |

玄関は4棚を出し続ける（棚自体は在るため）。閉じた棚を押すと準備中の一文になる。
索引の件数は正直に減る。水増しも自動補充もしない。

期限を持つ object は2件だけになった:

```
jinbocho/jinbocho-theater-mizoguchi-2026 2026-09-11T23:59:00+09:00
shimokitazawa/shimokitazawa-shelter      2026-09-27T23:59:00+09:00
```

2026-08-29 に、8/30 で切れる2件を期限なしへ入れ替えた。
- 高円寺 `koenji-awaodori-2026`（会期もの）→ `kosugiyu`（通年）
- 下北沢 `honda-theater` は object を残したまま、いまの公演の話をやめて
  劇場そのものの話へ。`current` → `evergreen`。

会期・公演を入れるとまた同じことが起きる。日付に縛られない事実を優先する。

## 差し替えの手順

1. `release_content.js` の該当 object を、新しい object へ置き換える。
   棚は必ず3件のまま。件数を減らして凌がない。
2. `node qa/release_check.js` と `node qa/release_preflight.js` を通す。
3. `NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js` を通す。
4. Preview で確認してから公開する。

## 新しい object に必要なもの

`release_check.js` が実際に要求している項目。ひとつでも欠けると FAIL する。

| 項目 | 決まり |
|---|---|
| `id` | 全12件で一意 |
| `objectName` / `placeName` / `typeLabel` | 必須。`placeName` は `場所 / 街` の形 |
| `mode` | `evergreen` か `current` |
| `expiresAt` | `current` なら必須。`evergreen` なら **`null`**（日付に依存しない事実に期限を持たせない） |
| `verifiedAt` | 必須。確認した時刻 |
| `hook` / `reveal` | 本文 |
| `hookPhrases` / `revealPhrases` | 2つ以上。**連結すると本文と1文字も違わないこと** |
| `facts` | ちょうど3行 |
| `actionLabel` / `actionUrl` | `https://` 必須。既定では公式ページで、物販ページにしない |
| `factsSourceUrl` | `https://` 必須。事実の出典 |
| `categoryIds` | `food` / `experience` / `books` / `music` / `film-stage` から1つ以上。重複不可 |
| `media.kind` | `photo` か `plate` |
| `media.listAlt` / `detailAlt` | 必須。**`listAlt` は Reveal の答えを先に言わない**（8文字の一致で FAIL する） |
| photo の場合 | `url` は `./assets/*`、`crop: 'none'`、`rights` 5項目（author / source / sourceUrl / license / modification） |
| plate の場合 | `plateWord` / `plateSub` / `ratio`。`rights` は持たせない（実写ではないため） |

### phrase の切り方

折返しを Safari でも意味単位に保つための分割。表示上の都合であって、本文ではない。

- 連結が本文と完全一致すること（`release_check.js` が検査する）
- 「カフェ。」「剥製。」のような意味のかたまりを phrase をまたいで割らない
- 1 phrase が長すぎると 200% 拡大で折返せなくなる。日本語は5〜8文字を目安に切る

### 事実の書き方

- 出典が支えない主張は**弱める**。盛らない。
- `facts` は出典で確認できることだけを書く。確認できない営業時間や料金を推測で足さない。
- 会期・公演のように日付に縛られるものは `current` にして `expiresAt` を入れる。

## HQ 承認済みのローテーション候補

神保町の `jinbocho-theater-mizoguchi-2026`（2026-09-11 期限）については、
`RELEASE_SHELF_INVENTORY_V0_1.json` に次の候補が入っている。

```
id     morisaki-bookshop-days
hook   神保町の古書店の2階に住むところから始まる小説。
出典   https://www.books.or.jp/book-details/093867655000v0000000
```

高円寺と下北沢には、承認済みの候補がまだ無い。事実と権利の確認が要る。

## この環境からできないこと

外向きの通信が塞がっているため、次は人がやる必要がある。

- 出典ページを開いて事実を確認すること
- Wikimedia Commons から実写を取得すること
- Preview を開いて確認すること
