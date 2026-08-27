# Browser QA — Tokyo Pilot 01

Result: **`BROWSER_QA_GO` — 281 / 281**
Last run: 2026-08-27 JST
Status: 隔離 Human Test の技術 QA = GO / Production = NO-GO

この文書は要約。実際の判定は毎回 harness が出す。

```bash
NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js [--shots]
# 判定 → qa/qa-report.json（毎回上書き。git 管理しない）
# screenshot → qa/shots/（git 管理しない）
```

harness は同梱の静的サーバで実ファイルを配信し、実バイトの Real Media を
Chromium で描画する。data URI の差し替えや placeholder は使わない。

## 条件

| scope | 条件 | 件数 |
| --- | --- | --- |
| m320 / m390 / m430 / d1024 / d1440 | 320×800 / 390×844 / 430×932 / 1024×768 / 1440×1000 | 各 45 |
| `<viewport>/<order>` | 1件目が入れ替わる3通り（abc / bac / cab）× 5 viewport | 各 1 |
| order | 6通りの順列が同じ3 identity を保つ | 1 |
| freshness | 参加者モードの正常描画 / 期限切れ停止 / 停止画面の漏れ | 3 |
| landscape-390h | 844×390（横向き） | 5 |
| zoom200-m390 / zoom200-d1440 | 200% 拡大 | 各 5 |
| forced-colors | ハイコントラスト | 5 |
| no-js | JavaScript 無効 | 3 |
| rootfont-20px / rootfont-24px | ブラウザの既定文字サイズを拡大 | 各 6 |
| self | harness 自身が空振りしていないか | 1 |

freshness には media 欠落時の停止も含む。

58 種類の検査。

## 検査していること

**Real Media**
- 3枚とも実バイトが decode される
- スクロールを待たずに3枚とも読み込まれている（灰色の枠が出ない）
- frame の都合で被写体が切れていない（card / detail とも、実測の可視面積で判定）
- 代替テキストが空でない

**First Pull**
- 1画面目に Real Media と Hook が見える
- 1件目の Hook 全文と「ひらく」がスクロールなしで見える
- 「01 / 03」が1画面目で読める（有限であることが伝わる）
- どの Object が1件目に来ても上記が成立する

**ネタバレ / 内部語**
- 一覧の可視テキストに Reveal の答えが出ない
- alt / aria-label / title など読み上げに渡る文字列にも出ない
- DOM に `objectName` が出ない
- 参加者画面・停止画面に内部語（verifiedNote / Reveal / Human Test / Pilot 等）が出ない

**Object Open → Reveal**
- 「ひらく」は button で、外部リンクの見た目を持たない
- dialog が開き、Reveal が最大の要素である
- 2件目以降も必ず頭から始まる（前の Object のスクロール位置を引き継がない）
- dialog のスクロールが背面の棚へ連鎖しない

**Official Action**
- HTTPS かつ `noopener`、押したときだけ開く

**操作性**
- 横スクロール 0（一覧・dialog とも）
- 初見の状態から 2 打鍵以内で1件目の「ひらく」に到達し、Enter で開く
- 棚側の操作要素はちょうど4件（skip-link +「ひらく」×3）
- focus が dialog の中から始まり、背面の棚へ抜けない
- Escape で閉じ、focus が元の「ひらく」へ戻る
- 参加者が読む文字が 10px を下回らない
- ハイコントラストでも「ひらく」が操作に見える
- ブラウザの既定文字サイズを上げている利用者で、本文まわりが実際に拡大する

**有限な終わり**
- 3件が並んだときだけ「3つ、見終わりました。」が出る
- JS 無効時は終わりだけが残らず、理由が表示される

**保存 / 計測 / 外部通信**
- localStorage / sessionStorage / cookie への書き込み 0
- Service Worker の registration / controller 0、Cache Storage の key 0
- IndexedDB の DB 0
- fetch / XMLHttpRequest / sendBeacon の呼び出し 0
- 同一オリジン以外への request 0
- pageerror / console error 0

## 経緯（この日の実測で見つけて直したもの）

1. 縦位置の原稿執筆カフェのポスターを横フレームに `cover` しており、
   card 46〜57% / detail 39〜53% しか見えていなかった。
   frame を media の実寸比にして解消。目黒だけ `contain` で救済していた
   対症も不要になった。
2. 詳細で既読の Hook が未知の Reveal より大きかった。入れ替えた。
3. 一覧の `alt` が「剥製」「標本」と Reveal の答えを名指ししており、
   読み上げ利用者にだけ先に答えが渡っていた。
4. dialog の scroll 位置が Object をまたいで残り、2件目以降は Real Media と
   Reveal を飛ばした途中から始まっていた（m390 で scrollTop 232）。
5. ハイコントラストで「ひらく」が背景を失い、ただの文字になっていた。
6. JS 無効時に空の棚と「3つ、見終わりました。」だけが残っていた。
7. ヘッダの店名が行き先の無い link で、1件目の「ひらく」の手前で
   tab stop を消費していた。
8. 一覧のコンテナに aria-live が付いており、読み込み時に3件ぶんが
   一気に読み上げられていた。開いた瞬間にも payoff の手前へ
   「〇〇の詳細を開きました。」が挟まっていた。
9. Hook と Reveal が語の途中で折れていた（原稿執筆する人限定のカ / フェ。）。
10. 文字サイズがすべて px で、ブラウザの既定フォントサイズ設定に
    追従していなかった。
11. QA 自身のバグ: 要素名を変えたのに検査側を直し忘れ、存在しない
    セレクタと比較して常に PASS していた検査が1件あった。
    以後は harness が自分のセレクタを毎回検証する。

いずれも意図的に元へ戻す negative test で FAIL することを確認している。

## 範囲外

- 横向き（844×390）と 200% 拡大では、1件目の Hook と「ひらく」に到達するのに
  スクロールが要る。被写体を切らないことを優先した結果で、内容は欠けていない。
  この2条件には First Pull の fold 条件を課していない。
- runtime の3枚は隔離 Human Test 限定の technical derivative。
  この QA は Production の media / legal 承認ではない。

## 前提

この QA が GO でも、公式一次情報の再確認（`HUMAN_TEST_CYCLE_01.md` の
前提条件 13）が済むまで参加者に見せてはならない。
