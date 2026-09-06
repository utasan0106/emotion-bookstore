# Candidate records — NOT VERIFIED in this session (HOLD)

Brief §2 の「Previously verified」値の転記。**この session では公式ページを開けていない**
（`source_reverify.txt`）ので runtime（`release_content.js`）には入れていない。
人が公式ページを実際に開いて確認した上で、`verifiedAt` にその時刻を入れて初めて使える。
営業時間・休館日・料金・チケット可否はここに書かない（Brief §3）。

| 街 | 候補 | 公式ソース（action URL 候補） | Previously verified（要再確認） | 差し替え先 record |
|---|---|---|---|---|
| 吉祥寺 | 谷口智則展「黒い森を抜けて－はいいろのぼくとオレンジのあいつ－」 | https://www.musashino.or.jp/museum/1002032/1002033/1009868.html | 2026-09-19 〜 2026-11-03 / 武蔵野市立吉祥寺美術館 / 10:00–19:30 / 休館日あり（公式告知） | `kichijoji.weeklyFeature` |
| 高円寺 | 座・高円寺『夏の夜の夢』 | https://za-koenji.jp/business/natsunoyo2026 | 2026-09-13 〜 2026-10-17 / 座・高円寺1 | `koenji.weeklyFeature`（city feature のみ。阿波おどり Thread の evidence にしない） |
| 下北沢 | SHELTER 35th Anniversary “IGNITION GIGS” | https://www.loft-prj.co.jp/schedule/shelter/357199 | 2026-09-23 / OPEN 12:00 / START 12:30 / 下北沢SHELTER | `shimokitazawa.weeklyFeature` |
| 神保町 | アリス館45周年企画 | https://bookhousecafe.jp/exhibition/content/2484 | 2026-09-16 13:00 〜 2026-09-29 17:00 / Book House Cafe | `jinbocho.weeklyFeature` |
| 神保町 | 神保町シアターセレクション「女優魂2026—忘れられない『この1本』」 | https://www.shogakukan.co.jp/jinbocho-theater/features/2026-09-12_joyu-damashii-2026.html | 2026-09-12 〜 2026-10-06 | object `jinbocho-theater-mizoguchi-2026` |

## 差し替え時の copy rule（Brief §3・§6）

- 開始日前は「開催中」「上映中」「いま…している」と書かない。日付を平叙で書く。
- `expiresAt` は公式情報が支える timezone 付きの終了時刻ちょうど。
- `weeklyFeature.calendarDates` は `YYYYMMDD/YYYYMMDD`（終了日翌日、`release_check.js`）。
- 差し替え後は `qa/release_expiry_boundaries.js` と 09-12 / 09-13 / 09-16 / 09-19 / 09-30 / 10-07 00:01 JST の固定時刻 QA を再実行。
- 画像は追加しない（Brief §4）。
