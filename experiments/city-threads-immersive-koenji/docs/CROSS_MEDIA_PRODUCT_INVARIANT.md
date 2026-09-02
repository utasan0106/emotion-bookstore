# CROSS_MEDIA_PRODUCT_INVARIANT — City Threads は「街の歴史サイト」ではない

作成日：2026-09-02　位置づけ：Founder/HQ 指示による Product Invariant。Phase 3 の Scope は変えない（コード変更なし）。
対象文書：`INTERACTION_DIRECTIONS.md`、`NORTH_STAR_RECONCILIATION.md`、`city-threads-prototype/v0.9/BLUEPRINT.md`、Deep Research の Content Model。

## 1. 不変条件（Invariant）

1. City Threads の対象は **文化関係** である：Place → Time → Event → Person → Organization → Cultural Practice → Work → Another Place → Present Action。街だけを Node にしない。
2. **Work は第一級 Node**：Book / Film / Music / Video / Photography / Theatre・Performance / Exhibition / Publication を Node として持てる。本・映画・音楽・映像を「関連リンク」へ降格させない。
3. **方向は一方向ではない**：City → Culture だけでなく、Culture → City、Work → Work、Time → Work を将来扱える構造にする。
4. **Evidence rule は作品にも同じ**：creator / location / publication・release / performance / influence / participation / collaboration / documented reference / archive / interview / official record のいずれかの Fact を要求する。Fact と Editorial Interpretation を分離する。No evidence = no bridge。
5. **Action は「行く」だけではない**：行く／観る／読む／聴く／見る／参加する／公式Archiveを見る を同格の Real-world / Real-cultural Action とする。「現実へ戻る」は物理移動に限らない。
6. **機械的に全媒体を入れない**：1 Thread に Book が 0 件でも構わない。強い文化的関係があれば、一つの Book や Film が主要 Node になってもよい。編集責任は「なぜ、この街・この時代・この作品がつながるのか」を説明できること。

## 2. 現状の構造が Place に閉じていないかの確認（読み取り）

| 層 | 現状 | Place 閉じ？ | 判定 |
|---|---|---|---|
| Deep Research Content Model（Thread / Node / Evidence / Bridge） | Evidence.type に `book / poster / ticket / map / audio / video / text_document` があり、Bridge に `entityThatMoved`（人・作品・団体・出来事） | 閉じていない。ただし **Node は `city / year / location` を持つ場所・時間の単位**で、Work を Node として置く型がない | **拡張が必要（Node.type）** |
| v0.9 / Immersive prototype の実装（beat＝年の節目、plate＝資料） | `beat` は `data-year / data-label`、`plate` は `data-title / data-source / data-url / data-confirms` | Node が「街の年」に固定。plate は Text Evidence で、作品の Node ではない | **試作としては許容（Scope 内）。将来モデルでは beat を typed Node に一般化する** |
| Direction A の設計（層＝資料の面） | 「層」は写真・紙（資料）。層の中身は資料であれば何でもよい | 層の概念は媒体非依存（ポスター・本の装丁・写真・地図・映像の静止フレームが層になれる） | **閉じていない** |
| Ending の Action | 行く／観る・読む／公式情報 の 3 群 | 「観る・読む」「公式Archive」が既にある。聴く・参加する は未使用（該当資料なし） | **型として持てる。Thread により省略可** |
| 既存 V3 本体（release_content.js の棚） | 本・映画・音楽・催しを object として扱う Cross-media の棚 | — | City Threads はこれと接続する側であり、置き換えない |

結論：**Interaction Architecture（層・時間・近づく・出口）は媒体非依存で、Place に閉じていない。閉じているのは Node の型（年の節目）だけ**で、これは将来の data / IA 拡張で解消する。Phase 3 では拡張しない。

## 3. 将来の Node / Relationship model（設計メモ。実装は別 Phase）

```
Node
- id
- type: place | time | event | person | organization | practice | work | action
- title / year / (place | work の属性)
- editorialText / whyThisMatters
- evidence[]           ← 既存 Evidence（種類は Deep Research のまま）
- relations[]          ← 下記 Relation

Work（Node.type = work）
- medium: book | film | music | video | photography | theatre_performance | exhibition | publication
- creator / publisher_or_label / release_or_performance_date / venue
- rights / availability（観る・読む・聴く の可否と場所）

Relation（Bridge を一般化）
- from / to（任意の Node 型の組み合わせ：City→Work、Work→City、Work→Work、Time→Work、Work→Person…）
- kind: creator | location | publication_release | performance | influence | participation | collaboration | documented_reference | archive | interview | official_record
- factualProof（Fact）
- editorialReason（Editorial Interpretation。Fact と分離）
- evidenceIds[]
- actionLabel（日本語の動詞）

Action（Node.type = action、Ending にも途中にも置ける）
- verb: 行く | 観る | 読む | 聴く | 見る | 参加する | 公式Archiveを見る
- target（place / work / archive の URL・所在）
```

- 「層」への写像：Work Node は「本の装丁の面」「フィルムの一コマの面」「レコードのジャケットの面」として同じ層の文法に載る（権利確認済の場合のみ）。権利がなければ Text Evidence の紙になる。
- 「近づく」は Work にも同じ：資料名／年代／Source／この資料から確認できること／Action（読む・観る・聴く）。
- 「渡る」は街と街だけでなく、Work を経由してよい（高円寺 → 記録映像 → 別の街）。ただし Relation.kind と Evidence が揃うまで開かない。

## 4. 高円寺 Thread への適用（今回はしない）

- 現 Thread に本・映画・音楽・映像は追加しない（Invariant 6、Phase 3 Scope 維持）。
- 将来、Evidence が揃えば候補になり得る Work の型：史料館の広報紙「踊れ高円寺」（publication）、創成期の写真（photography）、公式の記録映像（video）。いずれも Rights と Relation.kind（archive / official_record）の確認が先。
- Ending の Action は既に「観る・読む」「公式Archive」を持つ。聴く・参加する は該当 Evidence が出た時にのみ追加する。

## 5. 各設計文書との対応

- `INTERACTION_DIRECTIONS.md` §Direction A「Evidence interaction」「Ending」：媒体非依存であることをこの文書で確認した。
- `NORTH_STAR_RECONCILIATION.md` §16：Bridge がなくても成立する構造は、Relation が街同士に限らないことと矛盾しない。
- `city-threads-prototype/v0.9/BLUEPRINT.md` §方向：Direction B（Transfer Ledger）を content model とする方針は、上記 Relation model に置き換えて読む。
