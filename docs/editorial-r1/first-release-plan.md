# 最初の3作品：紹介原稿と限定patch plan

Research proposal, not an executed patch. Source IDs refer to `candidates.json`.
全件EVERGREEN。画像は使用しない。公式ページの画像を転載しない。商品購入は利用者が外部で判断する。

## 1. 次郎吉 to JIROKICHI－高円寺のライブハウスが歩んだ50年－

- Medium: Book / Live Music JIROKICHI 編。
- City relation: 高円寺の既存Shelf会場を記録する本。
- 紹介案: 高円寺のライブハウスが残してきた予定表や写真を、一冊から辿る。出演者だけでなく、会場が積み重ねた時間を読み、その先で今の公演予定を確かめる。
- なぜ置くか: Shelfで既に触れる記録本への実用的な出口を作る。
- Official destination / source: https://www.ele-king.net/books/012100/ （jiro）。会場の既存sourceはjiro-club。
- Thread化候補: 「演奏の予定表は、どう街の記録になるのか」。書籍内の証言本文を未読のため、制作理由の説明はHOLD。
- Image: なし。Rights: 新規転載なし。
- Difficulty: 中。新Threadを作るなら本文・入口・限定IDのQAが必要。まず外部書籍紹介として成立する。
- Gate: 書誌・出版説明の紹介はREADY。独立Threadは書籍の内容確認を終えるまでHOLD。

Exact plan（Thread Gate通過後のみ）:
1. `thread_content.js` に現行schemaの有限な1Thread。place/bookと、sourceが直接支える関係のみ。読んでいないインタビューを要約しない。
2. `release.js` の高円寺reading blockにそのThreadの入口1件。`release_content.js` の3 Objectは無変更。
3. 既存の公開Thread ID allowlistと該当QAに新IDだけ追加。event名・payload形式・privacy semanticsは変更しない。具体的な対象ファイルは実装時の `rg` で確定。
4. 本・会場の公式出口、source表示、unknown Thread fail-closed、390/430/1440、Object3件、finite endingを確認。

## 2. サンセット・ノーツ / SUNSET NOTES

- Medium: Music / 栗原ミチオ。
- City relation: 下北沢SHELTERライブ盤に収録された「夕暮れのジャイロ」から進む。ソロ盤を下北沢録音と説明しない。
- 紹介案: 下北沢SHELTERのライブ盤で演奏された「夕暮れのジャイロ」。その曲を収めた栗原ミチオのソロ盤へ。共演の記録から、一人の音楽家がつくった作品を聴きに進む。
- なぜ置くか: クレジットの名前を、実際に聴ける別作品につなぐ。
- Official destination: https://pedalrecords.bandcamp.com/album/sunset-notes
- Source: sunset（収録曲1）、shelter（収録曲3・Originally Performed by Michio Kurihara）。原発売2005／デジタル版2020を混ぜない。
- Thread化候補: 同じ曲の原盤と会場の演奏。選曲理由や編曲の意図は未確認なので独立Thread化を急がない。
- Image: なし。Rights: 音源・ジャケットはall rights reserved、転載・埋込なし。
- Timing: EVERGREEN。Difficulty: 小。
- Gate: 短い作品紹介＋外部リンクはREADY。新しい音楽一覧・プレイヤー・作品カードは不要。

Exact plan（次の限定実装）:
1. `works.html` の `#music` 内に既存 `wk-info-text` で収録関係の短文と公式ソロ盤へのリンク1件を置く。既存4 section、現在の3出口、順序を維持。
2. リンクは既存external linkの `target` / `rel` / `referrerpolicy` 契約を継承。既存計測がURLを公開情報として扱えるか確認し、未知の場合は拡大せず停止。新event・自由入力payloadなし。
3. `qa/works_check.js` と `qa/works_browser_qa.js` の該当数・文章契約を、追加した公式出口だけに合わせる。過去Thread fixtureを変更しない。
4. 出典2件で曲名照合、3 Object不変、Works4項目、mobile overflow、既存event・GA4 selftest、外部リンク先を確認して終了。

## 3. BAUS 映画から船出した映画館

- Medium: Film / 監督：甫木元空。
- City relation: 吉祥寺の映画館を扱う本が映画の原作になる。PARKSとBAUSの間に制作上の直接因果は主張しない。
- 紹介案: 吉祥寺の映画館を記した本が、青山真治の脚本を経て、甫木元空の映画へ。場所の記憶が、別の人の手と媒体を通って作品になる過程を、公式の制作紹介から辿る。
- なぜ置くか: 場所の紹介を、制作が引き継がれる背景へ深める。
- Official destination: https://bausmovie.com/
- Source: baus-producer https://www.boid-s.com/8280 （製作・配給当事者）。baus-interviewは追加調査候補で未採用。
- Thread化候補: 「映画館についての本は、誰の手を経て映画になったのか」。音楽に大友良英を選んだ詳細な理由はクレジットだけから作らない。
- Image: なし。Rights: ポスター・場面写真の転載なし。
- Timing: EVERGREEN。Difficulty: 中。
- Gate: 作品紹介と原作・脚本の継承はREADY。制作者の意図の独立した読みものは本人発言の精読後。

Exact plan（追加Evidenceを揃えた後）:
1. まずPARKSの `realityDestinations` に追加するか、独立Threadにするかを本文の厚みで決める。現時点で新Thread IDは採番しない。
2. 補助出口案なら `thread_content.js` のPARKSだけに原作・作品のnode、直接裏付けのあるrelation/sourceを追加し、その関係を読んだ後にBAUS公式へ出す。近い話題というだけのリンクは入れない。
3. `qa/parks_thread_qa.js` で既存4scene・既存source・出口を維持し、追加分とattributionを検証。元のPARKS制作理由を書き換えない。
4. 公開中という固定表示、映画館跡への案内、新地図、他街への推測リンクを作らない。

## 実装順

優先順位は編集上JIRO→SUNSET→BAUS、実装順はEvidence Gateが閉じているSUNSETの補助出口を先行。
JIROの独立ThreadとBAUSの追加背景は、足りないEvidenceを補ってから。全部が完成したことにして一括反映しない。
