# 催しの探し先

ファウンダー提供（2026-09-11）。**毎週ここを見れば在庫はつくれる。**

| 街 | 一覧 |
|---|---|
| 吉祥寺 | https://www.enjoytokyo.jp/event/list/area1333/its04/ |
| 高円寺 | https://www.enjoytokyo.jp/event/list/area1332/ |
| 下北沢 | https://www.enjoytokyo.jp/event/list/area1334/ |
| 神保町 | https://www.enjoytokyo.jp/event/list/area1321/ |

**この作業環境からは開けない。** `www.enjoytokyo.jp` はプロキシに拒否される
（`403 CONNECT`、2026-09-11 確認）。解決は「環境の許可ドメインに足す」か
「人が開いて渡す」のどちらか。手順は下記。

## 一覧サイトは出発点であって、出典ではない

enjoytokyo は集約サイトである。**ここに載っていることを根拠に掲載しない。**
必ず主催者・会場の公式ページまで辿り、そちらを `url` と `sources` に書く。
既存24件はすべてその形になっている（座・高円寺、JIROKICHI、本屋B&B、
神保町シアター、武蔵野市立吉祥寺美術館など）。

## 1件あたり、これだけあれば載せられる

`tools/weekly-outings-source.js` に必要な最小限。**これ以外は編集部が書く。**

| 欄 | 例 | 必須 |
|---|---|:-:|
| 題名 | 夏の夜の夢 | ● |
| 街 | 高円寺 | ● |
| 会場 | 座・高円寺1 | ● |
| 開催日 | 9/13, 9/17, 9/19…（全日付） | ● |
| 時刻・回 | 13:30中心、9/30は10:30 | ● |
| 種類 | 演劇 / ライブ / 映画 / 展示 / 本・トーク | ● |
| 公式URL | https://za-koenji.jp/detail/?id=251 | ● |
| 料金・年齢条件 | 中学生以下も予約要、未就学児は保護者同伴 | ● |

`hook`（一文）と `relation`（なぜこの街か）は編集部が書く。
Claude は**渡された事実からこの2つを勝手に作らない。**

## 足したあとに動くもの

`node qa/event_supply_check.js` が今週・来週の件数と、種類ごとの内訳、
再確認期限の分布を出す。下限は5件。展示とライブが薄いので、そこを優先する。

## 環境の許可ドメインに足す（根本解決）

claude.ai/code の Environment 設定に、この作業環境が接続してよいドメインの一覧がある。
そこへ足せば Claude が自分で開いて確認できるようになる。足す価値があるのは：

```
www.enjoytokyo.jp          催しの一覧（4街）
za-koenji.jp               座・高円寺
jirokichi.net              高円寺JIROKICHI
bookandbeer.com            本屋B&B
www.musashino.or.jp        吉祥寺シアター・吉祥寺美術館
www.shogakukan.co.jp       神保町シアター
cinemalice.theater         シネマリス
www.tokyodo-web.co.jp      東京堂書店
www.silver-elephant.com    吉祥寺シルバーエレファント
www.honda-geki.com         小劇場楽園
```

会場は毎月変わらないので、**この10ドメインで催しの補充は回る。**
