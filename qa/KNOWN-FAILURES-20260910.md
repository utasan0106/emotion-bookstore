# 既知FAILの台帳

2026-09-10 作成。内部運用文書。`.vercelignore` で `qa/` ごと配信面から外れている。

`CLAUDE.md` は「既知 FAIL と今回起因の FAIL を必ず分離する」と定めている。分離のたびに
過去のコミットを掘り直すのは無駄なので、その結果をここに残す。

## 発端

`qa/verify-product.js` が回すのは20本で、`qa/` にある**45本中25本は誰も回していない**。
その25本のうち5本が落ちていた。2026-09-10 の作業でこれに気づいたとき、
**自分が入れた回帰1件が、既存9件の指摘に埋もれて見えなかった。**
既知FAILを放置すると、新しい回帰を隠す。それが実際に起きた。

## 分離のやり方

引き継ぎ時点 `5630186` の worktree を作り、同じテストを両方で回して指摘を突き合わせる。

```sh
git worktree add /tmp/base 5630186
diff <(cd /tmp/base && node qa/<check>.js 2>&1) <(node qa/<check>.js 2>&1)
```

**指摘が出ない形式のテストもある**（`failures.push` ではなく `assert` を使うもの）。
`^- ` だけを比べると空同士の比較になり、差が無いように見える。
`culture_recovery_links` で実際にそうなった。**比較対象がその形式かを先に確かめること。**

## 既知FAIL 5本（すべて `5630186` 以前から）

| テスト | 指摘 | 原因 |
|---|---|---|
| `home_canonical_check` | 51件 | **再設計前のHOMEを検査している。** `.home-canonical`、HERO/いま辿れるスレッド等の節、阿波おどりのThread画像。承認済みのStage-C再設計で置き換わった画面 |
| `thread_check` | 9件 | 同上。`.thread-page` と、旧HOMEからThreadへの導線・credits記録 |
| `works_check` | 3件 | 旧 `work-video.html` の文言「約15分で観終わります。」と、そのinline player記法 |
| `seo_check` | 1件 | `index.html` に「感情書店の編集部が選んだ店・場所・本・映画・音楽・催し」の文字列を要求。現行の説明文は再設計時に書き換わっている |
| `culture_recovery_links` | 1件 | `link-list/*.html` に `<script>` を許さない。実際には `page-chrome` が `page-nav.js` を入れる |

`home_responsive_check` と `atlas_check` はテストの失敗ではなく実行環境の問題
（`playwright` の解決、ブラウザ）。`NODE_PATH=/opt/node22/lib/node_modules` で解決する。

## 2026-09-10 に減ったもの

`home_canonical_check` の2件が、クリック起動への統一で解消した。

- `HOME loads no external media`
- `HOME must not embed an iframe`

旧HOMEを検査するテストだが、この2件だけは現行HOMEにも当てはまる要件だった。

## 判断が要ること

**`home_canonical_check` と `thread_check` をどうするか。** 承認済みの再設計で消えた画面を
検査し続けており、守るものが無い。しかも件数が多いので、新しい回帰を確実に隠す。

`CLAUDE.md` は「テストを削除・skip して緑にしない。仕様変更時は新しい正式契約を検証する」
と定める。したがって選択肢は**削除ではなく、現行HOMEの契約へ書き直すこと**である。
ただし現行HOMEの正本はファウンダー承認画像であり、書き直しには編集判断が要る。
**編集部の判断待ちとして残す。**

`seo_check` の1件も同じ性格である。「編集部が選んだ」と明示する要件自体は生きているが、
どの文言でそれを満たすかは説明文の編集判断になる。

## この台帳の使い方

新しい作業で `verify-product` 以外を回して落ちたら、**まずここを見る。**
ここに載っていない指摘が出たら、それは今回起因である。
既知FAILが減ったら、この台帳を減らす。増やす方向の更新はしない。

## 2026-09-11 追加：`dead_click_check` は playwright が要る

`qa/dead_click_check.js` は入口ページのリンクを実際に押して、
「押しても読者には何も起きないリンク」を見つける。ブラウザが要るので
`verify-product` には入れていない。週次の運用で回す。

```sh
NODE_PATH=/opt/node22/lib/node_modules node qa/dead_click_check.js
```

playwright が解決できないときは `SKIP` と出て終わる（落ちない）。
落ちたときは本物の指摘である。2026-09-11 時点では 4ページ118本を押して 0件。

## 2026-09-11 追加：台帳どおりに起きた

`robots.txt` に「なぜAIクローラーを閉じないか」のコメントを足したとき、
`qa/seo_check.js` が robots.txt を1バイト単位で固定していたので落ちた。
**丸一週間、誰も気づかなかった。`seo_check` は `verify-product` が回さない
25本のうちの1本だからである。**

この台帳の冒頭に「既知FAILを放置すると、新しい回帰を隠す」と書いてある。
今回は放置ですらなく、**走らせてすらいなかった**ので、隠れる前に見えていなかった。

契約を書き直して解消した。「1バイトも違わない」から
「命令は allow-all と Sitemap の二つだけ、ブロックは一つも無い」へ移した。
コメントは通り、`Disallow` を足せば落ちる。守るものは変えていない。
したがって `seo_check` の既知FAILは1件（`index.html` の文言）のままである。

## 2026-09-11 追加：落ちるが「製品の失敗」ではないもの

全45本を回して突き合わせた結果。**いずれも `main` でも同じように落ちる。**
既知FAIL表には足さない（あれは製品の契約の話である）。掘り直さないための記録。

| テスト | 落ちる理由 |
|---|---|
| `ladyjane_thread_qa` `parks_thread_qa` | `git show <sha>:thread_content.js` が解決しない。参照先のコミットがこのクローンに無い |
| `link_check` | 実際に外部へ繋ぐ。ネットワークと相手サイトの状態で結果が変わる |
| `browser_qa` `atlas_browser_qa` `atlas_check` `home_responsive_check` `release_shots` | ブラウザ。`NODE_PATH=/opt/node22/lib/node_modules` を付けても TimeoutError になるものがある |

**45本のうち、いま毎回回っているのは27本である**（同日中に22本から増やした。下記）。
残り23本の内訳は、承認済み再設計で守るものが無くなったもの（`home_canonical_check`
`thread_check` `works_check`）、ブラウザ・ネットワークが要るもの、
そして**回せば通るのに誰も回していないもの**である。最後の一群が今回の穴だった。

## 2026-09-11 追加：`orphan_page_check` も playwright が要る

`qa/orphan_page_check.js` は配信面の185ページを**実際にブラウザで開いて**、
そのとき出ているリンクを数える。静的に `href` を数えるだけでは、
JS が後から足すリンクを見落として「行けるページを行けない」と言ってしまう。

```sh
NODE_PATH=/opt/node22/lib/node_modules node qa/orphan_page_check.js
```

`dead_click_check` と同じく、playwright が無ければ `SKIP` と出て終わる（落ちない）。
落ちたときは本物の指摘である。2026-09-11 時点では ORPHAN_PAGE_GO。

**どこからも行けないこと自体は欠陥ではない。** 役目を終えた URL を 404 にせず
`noindex` で残すのは正しい扱いで、10件がそれにあたる。
欠陥は「検索に載せるつもりなのに、どこからも行けない」ほうである。

## 2026-09-11 追加：`verify-product` を22本から27本へ

**通るのに誰も回していないテストが11本あった。** そのうち環境に依らず速い9本を
`verify-product` に入れた。全体で3.5秒しか増えない。

追加したもの：`home_discovery_check` `design_redesign_check`
`culture_room_contract_check` `parks_screen_contract_check`
`release_preflight` `release_expiry_boundaries`
`growth_improvements` `measurement_v04_selftest` `link_check_selftest`

`release_preflight` は時刻で判定する門である。**将来これが落ちたら、fixture の
賞味期限切れではなく、期限切れの `current` が公開されているという意味である。**

入れなかった2本（`thread_browser_qa` `works_browser_qa`）はブラウザが要る。
`works_browser_qa` は下記の本物の指摘を持っているので、入れれば suite が赤になる。

## 2026-09-11 追加：`works_browser_qa` の指摘は本物（main でも落ちる）

```
AssertionError: works.html: duplicate destination
```

`works.html` の本のカードに、同じ行き先へのリンクが2本ある。

| リンク | 役目 |
|---|---|
| `書籍情報 ↗`（figcaption 内） | 表紙画像の**出典表示**。権利の扱いとして要る |
| `出版社で本の紹介を見る` | Reality Return の行き先。他の3カードにもある |

**どちらも消すと何かを失う。** 出典リンクを消せば表紙の出どころが辿れなくなり、
行動リンクを消せば本のカードだけ現実側への出口を失う。

テストは「main 内に同じ行き先のリンクを2本置かない」と言っている。
出典表示と行動リンクを区別していない。契約を変えるか、片方を消すかは
**権利表示と導線の兼ね合いで、編集判断である。** 私は触っていない。

`main` でも同じ指摘が出ることを確認済み（今回起因ではない）。
