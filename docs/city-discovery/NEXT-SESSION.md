# 次のセッションはここから

2026-09-11 作成。**新しいクラウド環境 `emotion-bookstore` で開いたセッション向け。**

ファウンダーが環境を作り直した。カスタムのドメイン許可と `YOUTUBE_API_KEY` が入っている
**はず**。入っていなければ以下は全部できないので、まず確かめること。

## 0. まず接続を確かめる（推測しない）

```sh
[ -n "$YOUTUBE_API_KEY" ] && echo "key: あり" || echo "key: なし"
for h in www.enjoytokyo.jp za-koenji.jp jirokichi.net www.shogakukan.co.jp github.com; do
  printf "%-24s %s\n" "$h" "$(curl -s -o /dev/null -w '%{http_code}' -m 12 "https://$h/")"
done
```

`000` は届いていない（プロキシが 403）。**`github.com` が届かないと本番反映ができない。**
そこが落ちていたらファウンダーに知らせて止まること。

## 1. 催しの補充 — これだけ期限がある

**2026-09-21 に、公開中の24件すべてが一度に表示から消える。** 会期ではなく再確認期限
（`reviewThrough` が全件 `2026-09-20`）が原因。詳細は `EVENTS-SUPPLY-20260911` ではなく
`EVENTS-SUPPLY-20260910.md`。

安い順に：

1. **会期が9/20以降も残っている7件を再確認して `reviewThrough` を延ばす**
   （`koenji-midsummer` `koenji-cafetalk` `kichijoji-taniguchi` `kichijoji-winter`
   `jinbocho-ginga` `shimokita-moon` `jinbocho-pokemon`）。
   **公式ページを開いて開催が生きていることを確かめてから延ばす。**
   確認せずに日付だけ書き換えない。`checkedAt` も更新する。
2. **新しい催しを足す。** 探し先は `EVENT-SOURCES.md`。一覧サイトは出発点であって出典ではない。
   必ず主催者・会場の公式ページまで辿り、そちらを `url` と `sources` に書く。
   **展示3件・ライブ4件が薄い。** トップの「展示」「ライブ」はここへ来る。

`node qa/event_supply_check.js` が今週・来週の件数と種類別内訳を出す。下限5件。

## 2. 映像の点検

```sh
node tools/check-videos.js --catalogue    # 公開中59本
```

続いて保留中の12本（`OUTING-VIDEOS-HANDOVER.md` に ID がある）。
`NG` の行と埋め込み不可の行は公開しない。**API は権利者本人のチャンネルかを答えない。**
そこは人が判断する。

## 3. 台帳50件

`LEDGER-AUDIT-20260911.md` に精査済み。進める順序もそこに書いた。要点：

- **B-011 雨月物語（上田秋成）が最有力。** 12点、相手の映画 `jinbocho/ugetsu` は既に棚にあり、
  岩波書店の公式書籍ページがある。今日作った「同じ物語の、別のかたち」で対になる
- **B-007 ボン書店の幻／V-013 大屋書房**（どちらも12点）は `/discover/places/` に入る
- **国立映画アーカイブ10本**（1926〜1936年の東京）は街に紐づかない。
  ファウンダーが許可した「街に限らないコーナー」の種。全件が再ホスト禁止・公式embedのみ
- Drive 台帳の5件が古い（公開済みなのに「図版待ち」のまま）。Drive 側の更新が要る

## 変わっていないこと

- `CLAUDE.md` の禁止事項はそのまま。推測で関係を書かない。文言は編集部が決める
- 本番反映はファウンダー承認済み。`main` へ早送りで push。force-push はしない
- 検証は `node qa/verify-product.js`（22本）と `node qa/design_redesign_check.js`
- 生成物は4本の `--check` が一致すること

## 編集部の判断待ち（Claude は書き換えない）

- 会場ページ冒頭の一文5本（Claude が書いた。サイト上でこの位置の文はここだけ）
- `kichion-toranoko` と `kichion-lady` が同じ `relationNote`
- `home_canonical_check` / `thread_check` の60件は再設計で消えた旧HOMEを検査している
