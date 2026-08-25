# V3 REAL MEDIA × EDITORIAL FIRST PULL AUDIT — 2026-08-26

- Base HEAD: `7b085f47fa6bbba8ce7824b1b02fce91158513c2`（監査時点で working tree clean）
- Production main: `eca334f9671bee07833892b2476aac118f8ed018`（変更していない）
- 本書は**監査のみ**。registry / Product runtime / UI / copy / CSS / data model / GA4 / Privacy / Terms は 1 行も変更していない。
- 監査対象: 現行 Human-approved の 8 件（各感情棚 1 件）

## 0. 監査基準と、この環境の限界

### 0-1. KEEP の基準（厳格運用）

次のどちらかが**事実で裏付けられる**場合のみ KEEP とした。

- **A**: 自分では探さなかった対象との出会い
- **B**: 知っている対象の、**知らなかった見方**との出会い

以下は KEEP の理由として採用しなかった。
「有名だから」「人気だから」「公式サイトに情報があるから」「感情棚に合うから」。
特に、**公式サイトが自ら掲げているコンセプトの言い換え**は「知らなかった見方」に数えない
（それは公式サイト要約であり、当店の Editorial ではない）。

### 0-2. 権利確認について（重大な限界・要 Human 対応）

本セッションの network egress proxy は、**8 件すべての公式ホストを遮断**している。実測:

| host | 到達 |
| --- | --- |
| www.teamlab.art / art-play.or.jp / 2121designsight.jp / topmuseum.jp | 不可（CONNECT 失敗） |
| www.printing-museum.org / roppongi.bunkitsu.jp / tokyoireikyoukai.or.jp | 不可（CONNECT 失敗） |
| fng.or.jp / www.env.go.jp / policies.env.go.jp | 不可（EGRESS_BLOCKED） |

したがって本監査は、**項目 5（rights / reuse / cache）・6（attribution）・7（local 利用可否）を一次資料で証明していない**。
これらは「**UNVERIFIED — 人手確認が必要**」として扱い、確認すべき URL と確認項目だけを提示する。
既存 registry の `rights.imageReuseApproved = false` / `textReuseApproved = false`（8 件すべて fail-closed）は維持されており、
本監査によってこの状態を緩めることは一切していない。

項目 8・9（FIRST PULL と FACT ANCHOR）の事実は **検索インデックス経由**で取得した。
実装前に**公式ページ原文での Human 確認が必須**である（本書の各 FACT ANCHOR に確認先 URL を併記）。

### 0-3. 監査で判明した全件共通の構造的欠落

- **`firstPull` が 8 件中 8 件 null**。契約（`resolveFirstPull`: status READY + reviewerHuman + 本文）は実装済みだが、
  承認済みの本文が 1 件も存在しない。→ Founder Live Review の「C は『なぜ？』に答えられない」は
  **UI の問題ではなく、コンテンツ層の未実装**である。
- **REAL_READY の visual は 1 件のみ**（EXP_007）。残り 7 件は `category fallback`（`real_visual_reuse_not_verified`）。
- **会期のある展示 3 件（EXP_103 / 105 / 106）で、終了日・会期・入替が Product に表示されていない。**
  `practicalTruth` に `startDate` / `endDate` / `ticketStatus` が入っておらず、表示は 時間・場所・料金 のみ。
  Google 検索のほうが正確という逆転が起きている（差別化以前の信頼性問題）。

---

## 1. EXP_101 チームラボボーダレス（心が弾む）

| 項目 | 内容 |
| --- | --- |
| 1. title / category | チームラボボーダレス ／ 展示（canonical `Exhibition`） |
| 2. 現在の visual | **category fallback**（`category_exhibition.webp`、`real_visual_reuse_not_verified`） |
| 3. 利用可能性のある Real Media | 公式サイトに作品写真・動画が多数存在（公式 YouTube / プレス素材の存在は高確度）。ただし**当環境から未確認** |
| 4. source URL | https://www.teamlab.art/jp/e/tokyo/ |
| 5. rights / reuse / cache | **UNVERIFIED**。商業アート施設・作品著作権は teamLab 帰属。無条件 reuse / local cache は通常不可と想定。要 Human 確認 |
| 6. attribution 条件 | **UNVERIFIED**（作品名・©表記・撮影者表記が要求される可能性が高い） |
| 7. local 利用可否 | **不可と想定**（許諾なしでは fail-closed 維持） |
| 8. FIRST PULL 候補 | 「館内には、作品の名前を確かめる手段がない。」（21字） |
| 9. FACT ANCHOR | 館内に**キャプションも地図もない**（公式が "a museum without a map" と明示、作品は部屋を出て移動し互いに影響する）。確認先: 公式サイト同 URL |
| 10. Google / Maps / Instagram / 公式との差 | **成立しない**。この一文は公式が自ら掲げるコンセプトの言い換えであり、Instagram には作品写真が飽和している。「自分では探さない対象」でもない |
| 11. 判定 | **KEEP IF REAL MEDIA** |
| 12. 判定理由 | 対象自体は誰でも到達できる超有名対象で、発見価値 A は無い。B（知らなかった見方）も現状は公式コンセプトの要約に留まる。さらに**この対象は視覚が本体**であり、category fallback 画像では FIRST PULL が構造的に成立しない。実写真の権利が取れない場合、当店に置く固有の理由が残らない（その場合は DROP 相当） |

---

## 2. EXP_102 東京おもちゃ美術館（心があたたまる）

| 項目 | 内容 |
| --- | --- |
| 1. title / category | 東京おもちゃ美術館 ／ 美術館（canonical `Activity`＝体験） |
| 2. 現在の visual | **category fallback**（`category_place.webp`） |
| 3. 利用可能性のある Real Media | 公式サイト・公式 note に館内写真が多数。NPO 法人運営で**広報協力の期待値は相対的に高い**（未確認） |
| 4. source URL | https://art-play.or.jp/ttm/info/ |
| 5. rights / reuse / cache | **UNVERIFIED**。館内写真には来館者（子ども）の肖像が入りやすく、**肖像権の観点で条件付きになる可能性が高い**。要 Human 確認 |
| 6. attribution 条件 | **UNVERIFIED**（「写真提供：東京おもちゃ美術館」相当の表記が要求される想定） |
| 7. local 利用可否 | **要許諾**。人物が写らない館内カット（校舎・木のおもちゃ）を指定して依頼するのが現実的 |
| 8. FIRST PULL 候補 | 主案「取り壊される予定だった校舎を、近所の人が残した。」（24字）／副案「赤いエプロンの案内人は、全員ボランティアです。」（23字） |
| 9. FACT ANCHOR | 1935年創立・**2007年閉校の旧新宿区立四谷第四小学校**は取り壊し予定だったが、**地域住民の要望でリノベーションされ 2008年4月に開館**。「おもちゃ学芸員」は**約350名が登録**する**ボランティア**で、毎日10〜20名が赤いエプロンで在館。確認先: 公式サイト／運営 NPO（芸術と遊び創造協会） |
| 10. Google / Maps / 公式との差 | **成立する**。Google/Maps は「子ども向け施設・料金・混雑」を返し、Instagram は木のおもちゃの写真を返す。「廃校が住民の要望で残った建物」「学芸員がボランティア」は**行った人でも言語化していない**視点 |
| 11. 判定 | **KEEP** |
| 12. 判定理由 | 発見価値 A（子連れ以外は自分で探さない）と B（知らなかった見方）の両方が成立する。かつ**常設**で会期切れが無く、Entry Test 期間中に消えない。visual は fallback だが、この対象は「建物と仕組み」が主題なので実写真の依存度は teamLab ほど致命的ではない |

---

## 3. EXP_103 ザ・ペーパーログ：膜と核（惹かれる）

| 項目 | 内容 |
| --- | --- |
| 1. title / category | ザ・ペーパーログ：膜と核 ／ 展示（canonical `Exhibition`） |
| 2. 現在の visual | **category fallback**（`category_exhibition.webp`） |
| 3. 利用可能性のある Real Media | 21_21 DESIGN SIGHT の展示写真、ISSEY MIYAKE 側のプロジェクト写真（未確認） |
| 4. source URL | https://2121designsight.jp/gallery3/the_paper_log/ |
| 5. rights / reuse / cache | **UNVERIFIED**。展示写真は撮影者・出展者・館の三者権利が絡む。**プレス利用は申請制が通例** |
| 6. attribution 条件 | **UNVERIFIED**（撮影者クレジット必須の可能性が高い） |
| 7. local 利用可否 | **要許諾**。会期終了後の継続掲載可否も併せて確認が必要 |
| 8. FIRST PULL 候補 | 「服をつくる工程で出た紙くずが、そのまま素材になっている。」（28字） |
| 9. FACT ANCHOR | プリーツ製品の製造工程で圧縮ロール状に残る紙「ペーパーログ」が素材。スペインの建築事務所 **Ensemble Studio** が紙を剥がして「膜（Shell）」を、イッセイ ミヤケ側が「核（Core）」の家具プロトタイプを制作。**2026年4月ミラノ初公開／日本初展示**。確認先: 21_21 公式ページ |
| 10. Google / Maps / 公式との差 | **成立する**（対象自体が未知）。ただし FIRST PULL の内容は公式概要に近く、**差の源泉は「見方」ではなく「そもそも知らない」側** |
| 11. 判定 | **KEEP**（条件付き） |
| 12. 判定理由 | 発見価値 A が明確に成立する（自分では絶対に探さない）。B は中程度。**ただし会期が 2026-09-13 で終了**するのに Product が終了日を表示していない。Entry Test 02 の対象にするなら会期表示の実装が前提で、テスト期間が 9/13 を跨ぐなら**対象から外すべき** |

---

## 4. EXP_104 東京都復興記念館（沈む）

| 項目 | 内容 |
| --- | --- |
| 1. title / category | 東京都復興記念館 ／ 記念館（canonical `Place`＝場所） |
| 2. 現在の visual | **category fallback**（`category_place.webp`） |
| 3. 利用可能性のある Real Media | 東京都慰霊協会サイトの建物・展示写真。**公共性が高く、外観写真は自前撮影も選択肢**（屋外・公共空間） |
| 4. source URL | https://tokyoireikyoukai.or.jp/museum/tenji.html |
| 5. rights / reuse / cache | **UNVERIFIED**。館内展示物（遺品・写真資料）は**慰霊対象であり、扱いに特段の配慮が要る**。館内撮影物の二次利用は原則不可と想定すべき |
| 6. attribution 条件 | **UNVERIFIED**（提供表記が要求される想定） |
| 7. local 利用可否 | **建物外観であれば現実的**。館内資料は不可と想定 |
| 8. FIRST PULL 候補 | 「震災のために建てられた建物が、空襲の記録も引き受けた。」（27字） |
| 9. FACT ANCHOR | 昭和6年(1931)完成、**伊東忠太**設計（隣接する震災記念堂＝現・東京都慰霊堂と同じ設計者）。**関東大震災の記念のために建てられた**が、のちに**東京大空襲の被害・復興資料が加えられ**現在の東京都復興記念館となった。入場無料。確認先: 東京都慰霊協会公式 |
| 10. Google / Maps / 公式との差 | **成立する**。Google は「無料・両国・震災資料館」を返すだけで、**「一つの災害のために建てた器が、もう一つの災害を引き受けた」という時間の構造**は出てこない |
| 11. 判定 | **KEEP** |
| 12. 判定理由 | A（自分では探さない）と B（建物そのものの来歴という知らなかった見方）が両立。**常設・入場無料**で会期リスクが無く、Entry Test に最も安全に置ける。「沈む」棚の Editorial として、感情への当てはめではなく**事実の構造**で説明できている |

---

## 5. EXP_105 TOPコレクション 明日の食卓（ざわつく）

| 項目 | 内容 |
| --- | --- |
| 1. title / category | TOPコレクション 明日の食卓 ／ 展示（canonical `Exhibition`） |
| 2. 現在の visual | **category fallback**（`category_exhibition.webp`） |
| 3. 利用可能性のある Real Media | 東京都写真美術館の広報用画像（作家作品）。**作品写真は作家・遺族の権利が別途必要** |
| 4. source URL | https://topmuseum.jp/exhibition/5419/ |
| 5. rights / reuse / cache | **UNVERIFIED**。写真作品の複製は**最も権利ハードルが高い類型**。展示風景写真も申請制が通例 |
| 6. attribution 条件 | **UNVERIFIED**（作家名・作品名・所蔵表記が必須になる想定） |
| 7. local 利用可否 | **困難**と想定 |
| 8. FIRST PULL 候補 | 候補を立てたが、いずれも**対象の説明の域を出なかった**（例:「食卓の写真だけで、社会の変化が見えてしまう。」＝展覧会趣旨の言い換え） |
| 9. FACT ANCHOR | 会期 **2026-07-02〜09-21**、当館コレクション（約39,000点）から**14作家**を構成。確認先: 東京都写真美術館公式 |
| 10. Google / Maps / 公式との差 | **成立しない**。当店の一文が公式の展覧会趣旨とほぼ同じ内容になる |
| 11. 判定 | **WEAK** |
| 12. 判定理由 | 「食」というテーマが感情棚「ざわつく」に**合うから置かれている**構造で、KEEP 基準の A も B も現時点で立っていない。会期も 9/21 で終了する。**除外候補**として次 Gate に送るのが妥当。ただし「14作家の並べ方そのものに編集意図がある」等、実見に基づく Human Editorial が立てば復活の余地はある |

---

## 6. EXP_106 80 GRAPHIC TRIALS（ぶつかる）

| 項目 | 内容 |
| --- | --- |
| 1. title / category | 80 GRAPHIC TRIALS ／ 展示（canonical `Exhibition`） |
| 2. 現在の visual | **category fallback**（`category_exhibition.webp`） |
| 3. 利用可能性のある Real Media | 印刷博物館 P&P ギャラリーの展示写真、TOPPAN のプレスリリース素材（PDF に画像あり／未確認） |
| 4. source URL | https://www.printing-museum.org/collection/exhibition/g20260627.php |
| 5. rights / reuse / cache | **UNVERIFIED**。企業運営館でプレス素材の整備は期待できるが、**掲載条件付き**が通例 |
| 6. attribution 条件 | **UNVERIFIED**（クリエイター名＋TOPPAN 表記が要求される想定） |
| 7. local 利用可否 | **要許諾**。会期終了後の掲載可否も要確認 |
| 8. FIRST PULL 候補 | 「並んでいるのは完成品ではなく、試した跡のほうです。」（25字） |
| 9. FACT ANCHOR | クリエイターと TOPPAN が印刷表現の可能性を探ってきた 20 年の企画「GRAPHIC TRIAL」から **80 組**を紹介。会期は **6/27〜9/27 の 3 期入替制**（第1期 6/27–7/28 ／ 第2期 8/1–8/28 ／ 第3期 9/1–9/27）で、**期間の谷間（7/29–7/31、8/29–8/30）は P&P ギャラリー休室**。入場無料。確認先: 印刷博物館公式・TOPPAN ニュースリリース |
| 10. Google / Maps / 公式との差 | **成立する**。「デザインの展覧会」ではなく「**試行の途中が展示される**」という読み替えは、公式の告知文にはない当店の Editorial |
| 11. 判定 | **KEEP**（条件付き） |
| 12. 判定理由 | A（自分では探さない）＋ B（完成品ではなく試作が主役という見方）が成立し、入場無料でアクセス障壁も低い。**ただし 3 期入替と休室日が Product に一切表示されていないのは重大な欠陥**で、`ticketStatus` 等での明示が前提。2026-08-29〜08-30 は休室のため、その期間に Entry Test を当てると**参加者が閉室に当たる** |

---

## 7. EXP_107 文喫 六本木（身を引く）

| 項目 | 内容 |
| --- | --- |
| 1. title / category | 文喫 六本木 ／ 書店（canonical `Place`＝場所） |
| 2. 現在の visual | **category fallback**（`category_book.webp`） |
| 3. 利用可能性のある Real Media | 公式サイトの店内写真、運営（日販グループ）の広報素材（未確認） |
| 4. source URL | https://roppongi.bunkitsu.jp/store/ |
| 5. rights / reuse / cache | **UNVERIFIED**。商業店舗のため**広報利用の交渉余地はある**が、来店者の写り込み条件が付く想定 |
| 6. attribution 条件 | **UNVERIFIED**（「写真提供：文喫」相当の想定） |
| 7. local 利用可否 | **要許諾** |
| 8. FIRST PULL 候補 | 主案「閉店した書店の跡地に、入場料を取る書店ができた。」（24字）／副案「ここが売っているのは本ではなく、居座る時間です。」（24字） |
| 9. FACT ANCHOR | **青山ブックセンター六本木店の跡地**に 2018年12月11日開業。入場料制で、**支払えば滞在時間は無制限**。約 3 万冊。区画は展示室・選書室・閲覧室・研究室・喫茶室に分かれ、**無料で入れるのは展示室のみ**。確認先: 文喫公式・カレントアウェアネス-E（国立国会図書館） |
| 10. Google / Maps / Instagram / 公式との差 | **成立する**。Google/Maps は「入場料のある本屋・混雑・料金」を返し、Instagram は本棚の写真を返す。「**閉店した書店の跡地**」という前史は、文喫を知っている層でも把握していないことが多い |
| 11. 判定 | **KEEP** |
| 12. 判定理由 | B（知っている対象の知らなかった見方）が明確に成立。**常設**で会期リスクなし。「身を引く」棚の理由も、感情への当てはめではなく「時間を先に買う」という店の仕組みから説明できている |

---

## 8. EXP_007 新宿御苑（まだ名前がない）— 基準サンプル

| 項目 | 内容 |
| --- | --- |
| 1. title / category | 新宿御苑 ／ 場所（canonical `Place`） |
| 2. 現在の visual | **REAL_READY**（`place_photo`／`EXP_007_shinjuku_gyoen_official_landscape-1440.webp`、1440px webp と元 jpg を local 保持） |
| 3. 利用可能性のある Real Media | 環境省・新宿御苑管理事務所の**公式フォトアルバム（無料ダウンロード）**。現行 1 点を取得済みで、**同条件で追加取得できる可能性が高い唯一の対象** |
| 4. source URL | https://fng.or.jp/shinjuku/place/garden/（registry 記載）／写真の出所は環境省 新宿御苑管理事務所 |
| 5. rights / reuse / cache | registry 記載: `official_photo_album_free_download_under_photo_loan_conditions`、`reuseOrCacheAllowed = true`（過去の Human 承認に基づく）。**本セッションからは再確認できていない**（fng.or.jp / env.go.jp とも EGRESS_BLOCKED） |
| 6. attribution 条件 | **必須**。`attributionText = 写真提供「新宿御苑管理事務所」`（実装済み・画面に表示されている） |
| 7. local 利用可否 | **可**（唯一 local 保持している実写真） |
| 8. FIRST PULL 候補 | 下記 Red Team を参照（3 案） |
| 9. FACT ANCHOR | 下記 Red Team を参照 |
| 10. Google / Maps / Instagram / 公式との差 | **現行の方向では成立していない**（下記 Red Team） |
| 11. 判定 | **KEEP** |
| 12. 判定理由 | 実写真が唯一 REAL_READY で、Founder Live Review でも fallback との差が最大と確認されている。対象は誰もが知っているため A は無いが、**B が複数成立する**（下記）。ただし**現行 FIRST PULL 方向は差別化に失敗しており、差し替えが KEEP の条件** |

### 8-R. RED TEAM — 現行方向「歩くうちに庭園の秩序が切り替わる」

**結論: 通常の観光紹介との差になっていない。**

1. **公式サイト要約に極めて近い。** 環境省・国民公園協会の紹介文が既に「広さ58.3ha の園内に、風景式庭園・整形式庭園・日本庭園を巧みに組み合わせている」と説明している。
   当店の一文はその言い換えであり、**KEEP 基準の「公式サイトに情報がある、だけでは不可」に自ら抵触**している。
2. **抽象的で、画像直後に読めない。** 「秩序が切り替わる」は解釈語であり、**何を見に行けばよいかが決まらない**。
   Founder Live Review の「長文はほぼ読まれない」「C は『なぜ？』に答えられない」に直撃する。
3. **事実の重みを捨てている。** 御苑には、知っている人でも知らない事実が複数あるのに、
   現行の一文はそれを使わず、庭園様式の一般論に落ちている。

#### 差し替え候補（最大 3 案・いずれも 15〜35 字）

| # | FIRST PULL 候補 | 字数 | FACT ANCHOR（要 Human 確認） | 差別化の理由 |
| --- | --- | --- | --- | --- |
| 1 | **この広さは、庭のためではなく実験のために決められた。** | 26 | 明治5年(1872)、**58.3ha の土地に「内藤新宿試験場」**が設置され、欧米品種を含む**約3,000種**の果樹・野菜栽培、養蚕・牧畜の研究が行われた。現在の御苑の面積はこの試験場に由来する。明治8年(1875)には約100㎡のガラス温室が建てられ、日本の温室園芸の先駆となった | Google/Maps は「桜・広さ・入園料」、Instagram は芝生の写真を返す。**「今立っている広さは農業実験のために囲われた広さ」**は、御苑を何度も訪れた人でも知らない。しかも**現行 WHY（秩序が切り替わる）の原因を説明できる**（庭として一から設計されていないから様式が同居する） |
| 2 | **池だけが、大名屋敷だった頃のまま残っている。** | 22 | 日本庭園の**玉藻池**は、内藤家下屋敷の庭園「**玉川園**」の遺構で、**安永元年(1772)完成**。江戸初期に徳川家康が内藤清成に与えた屋敷地が御苑の始まり | 「歩くと様式が変わる」の抽象を、**園内の一点に着地させる**。行き先が具体的に決まる（＝Detail から Action に繋がる） |
| 3 | **重要文化財の洋館は、温室へ行く途中の休憩所だった。** | 25 | **旧洋館御休所**は明治29年(1896)建築、**皇族が温室を利用する際の休憩所**として建てられたアーリーアメリカン風洋館で、**国の重要文化財** | 「重要文化財」という重い肩書きと「温室に行く途中の休憩所」という用途の落差が、そのまま見方の転換になる |

**推奨は #1。** 理由は、(a) 御苑全体に効く（特定の一点に限定されない）、(b) 画像（広い芝生の俯瞰＝現行 REAL 写真）を見た直後に読むと**意味が反転する**、(c) 現行 WHY を捨てずにその根拠として接続できる。
#2 は Action（どこへ行くか）に最も強く、#1 と併用可能（FIRST PULL に #1、Detail の Why に #2）。

---

## 9. 総括

### 集計

| 指標 | 件数 | 内訳 |
| --- | --- | --- |
| **REAL MEDIA READY** | **1 / 8** | EXP_007 のみ（`real_ready`・local 保持・attribution 実装済み） |
| **FIRST PULL STRONG** | **4 / 8** | EXP_007（差し替え案）／EXP_102／EXP_104／EXP_107 |
| （参考）FIRST PULL MEDIUM | 2 | EXP_103・EXP_106（対象が未知であること由来。見方の強度は中） |
| （参考）FIRST PULL WEAK | 2 | EXP_101（公式コンセプトの言い換え）／EXP_105（立たず） |
| **KEEP** | **6 / 8** | EXP_007・EXP_102・EXP_103・EXP_104・EXP_106・EXP_107 |
| KEEP IF REAL MEDIA | 1 | EXP_101 |
| WEAK | 1 | EXP_105 |
| **DROP 候補** | **1** | EXP_105（次 Gate で DROP 判断。現時点で確定 DROP は 0） |

※ KEEP のうち EXP_103・EXP_106 は**会期表示の実装が前提**の条件付き。

### Entry Test 02 に使える最小 3 件

**EXP_007 新宿御苑 ／ EXP_104 東京都復興記念館 ／ EXP_102 東京おもちゃ美術館**

選定理由（Entry Test の妥当性を壊さない条件で選んだ）:

1. **3 件とも常設**。会期切れ・期入替・休室日が無く、テスト期間中に対象が消えない
   （EXP_103 は 9/13 終了、EXP_105 は 9/21 終了、EXP_106 は 8/29–8/30 休室＋3 期入替のため、テストの統制条件として不適）。
2. **FIRST PULL が STRONG の 4 件のうち 3 件**を占める（残る EXP_107 は予備。商業店舗のため写真許諾の見通しが最も読みにくい）。
3. **対象の性格が互いに異なる**: 誰もが知る屋外（御苑）／ 知られていない公共の記録施設（復興記念館）／ 知られていない体験施設（おもちゃ美術館）。
   「知っている対象の知らなかった見方」と「自分では探さない対象との出会い」を**両方テストできる**。
4. **実写真取得の見込み順**: EXP_007（取得済み）＞ EXP_104（公共・屋外外観なら自前撮影も可）＞ EXP_102（NPO 運営で広報協力の余地）。

予備: **EXP_107 文喫 六本木**（FIRST PULL は STRONG、常設。写真許諾が取れた時点で 3 件目と差し替え可）。

### 現在の最大 Product Value 不足

**「知らなかった見方」を渡す層が、実装として存在しない。**

- `firstPull` は 8 件中 **8 件 null**。契約も UI 経路も実装済みなのに、**承認済み本文が 0 件**。
  つまり現在の Product が持っているのは「対象の説明」「公式要約」「棚に置いた理由（長文）」の 3 つだけで、
  **画像を見た直後に読める一文を 1 件も持っていない**。
  Founder Live Review の「C は『なぜ？』に答えられない」「長文はほぼ読まれない」は、この欠落の直接の帰結である。
- 第二の不足は **REAL MEDIA が 1/8** であること。「fallback 画像では FIRST PULL が弱い」という観測は、
  上記の一文が無いことと重なって二重に効いている（見る理由も読む理由も無い状態）。
- 第三に、**会期のある 3 件で終了日・入替・休室が表示されていない**。これは差別化以前に、
  Google 検索のほうが正確という**信頼性の逆転**であり、当店の存在意義を毀損する。

この 3 つが解消されない限り、入口構造（A/B/C）をどれだけ作り替えても Founder が観測した問題は再現する。
**入口の問題ではなく、渡すものの問題である。**

### 判定

**ENTRY_TEST_02_BUILD_HOLD**

理由: Entry Test 02 を今ビルドしても、`firstPull` 0 件・REAL MEDIA 1 件のままでは、
Live Review で既に確認された「なぜ？に答えられない」「fallback は読まれない」がそのまま再現される。
テスト条件が整っていない状態でのビルドは、実験としても Product 開発としても無駄打ちになる。

**HOLD 解除の条件（3 つとも Human 承認が必要）**

1. 最小 3 件（EXP_007 / EXP_104 / EXP_102）について、**FIRST PULL 本文の Human Editorial 承認**
   （本書の候補は素案であり、`firstPull.status = READY` / `reviewerHuman = true` の承認は CEO 判断）。
2. 同 3 件の **REAL MEDIA 権利確認**（本セッションでは公式ホストが全て遮断されており実施不能）。
   最低条件は EXP_007 の現行写真の条件再確認＋追加 1〜2 点。
3. 会期のある展示を Entry Test 02 に含める場合のみ、**会期・入替・休室の表示実装**。
   上記の最小 3 件のみで構成する場合、この条件は不要。

---

## 10. 本監査で変更したもの

- **なし**（本書の追加のみ）。thesis-entry-test UI・A/B/C 構造・Product copy・CSS・registry・data model・
  Production runtime・GA4・Privacy / Terms・main のいずれも変更していない。
- 新しい Real Media は**取得も追加もしていない**（権利確認自体が本環境では実施不能）。

## 11. 出典

事実の取得は検索インデックス経由。**実装前に公式ページ原文での Human 確認が必要**。

- 新宿御苑（概要・庭園様式・歴史・温室・玉藻池・旧洋館御休所）: 環境省 新宿御苑 / 一般財団法人国民公園協会
  https://www.env.go.jp/garden/shinjukugyoen/1_intro/outline.html ／ https://fng.or.jp/shinjuku/gyoen/history/ ／ https://fng.or.jp/shinjuku/2022/05/24/20220524/ ／ https://policies.env.go.jp/national-garden/shinjukugyoen/intro/history/
- チームラボボーダレス: https://www.teamlab.art/e/tokyo/
- 東京おもちゃ美術館: https://art-play.or.jp/area/tokyo/ ／ 東京ボランティア・市民活動センター https://www.tokyo-vln.jp/learn/hint/51683
- ザ・ペーパーログ：膜と核: https://www.2121designsight.jp/gallery3/the_paper_log/ ／ https://www.isseymiyake.com/blogs/news/18649
- 東京都復興記念館 / 東京都慰霊堂（伊東忠太）: https://tabi-mag.jp/tk1158/ ／ https://www.shouhiseikatu.metro.tokyo.lg.jp/kurashi/1709/keikan.html
- TOPコレクション 明日の食卓: https://topmuseum.jp/exhibition/5419/ ／ https://artexhibition.jp/exhibitions/20260613-AEJ2926300/
- 80 GRAPHIC TRIALS: https://www.printing-museum.org/collection/exhibition/g20260627.php ／ https://www.holdings.toppan.com/ja/news/2026/05/newsrelease260520_2.html
- 文喫 六本木: https://current.ndl.go.jp/node/37201 ／ https://www.wwdjapan.com/articles/753483
