# 週替わりの過ごし方と海外向け入口 2026-09-08

ユーザー指示を受け、恋人と・子どもと・家族で・友人と・ひとりでの5項目を実装。属性推定ではなく本人の選択。初回は9/7〜9/13掲載、各1件。吉祥寺3件、神保町1件、高円寺1件。4街均等ではない。

HOME「実際の場所へ」に主入口1個、過ごし方一覧→週別候補→個別詳細→公式への導線。子どもと（小さい子の設備・休憩）と家族で（世代横断の鑑賞）を説明。滞在時間は編集の目安、設備・料金は公式確認日を添え、イベント開催期間と掲載期間を区別。

データ正本 tools/weekly-outings-source.js。issuesへ7日間・5項目の編集済み候補を追加し node tools/build-city-discovery.js で生成。未来号の機密予約公開を意図した仕組みではない。未来号も静的URLで到達可能なため、公開できない原稿をコミットしない。翌週分未編集なら過去のおすすめ表示。自動選定・自動公開・予約ジョブは未実装。

/visit/ は英語の4街案内。国籍による嗜好推定ではなく、各街で体験できる文化を短く説明。GO TOKYO英語版に出典・実用情報の出口。日本語の作品ページへ移るリンクに Japanese を明記。全サイト翻訳・全動画字幕確認は未実施。

公式確認元：
- https://www.tokyo-park.or.jp/park/inokashira/
- https://www.tokyo-zoo.net/inokashira/visitor-info/infant-care/index.html
- https://www.musashino.or.jp/museum/
- https://www.jimbocho-book.jp/
- https://za-koenji.jp/
- https://www.gotokyo.org/en/destinations/western-tokyo/koenji/index.html
- https://www.gotokyo.org/en/destinations/western-tokyo/shimokitazawa/index.html
- https://www.gotokyo.org/en/destinations/western-tokyo/kichijoji/index.html
- https://www.gotokyo.org/en/destinations/central-tokyo/kanda-and-jimbocho/index.html

検証：JST週開始・終了境界、5項目、内部リンク、公式出口重複なし、生成一致、既存release QA。実ブラウザ・モバイル見た目は未確認。本番未反映。R6までの修正を含む統合Preview。
