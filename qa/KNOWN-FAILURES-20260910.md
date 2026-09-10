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
