# 引き継ぎ書 — 2026-09-11（同日 更新）

**新しいクラウド環境 `emotion-bookstore` で開いたセッション向け。**
この1枚で足りるように書く。詳細が要るときだけ、指したファイルを読む。

起点コミット：`5f16de8`（未反映。`main` は `2813ebf`）

---

## 0. 最初にやること：接続を確かめる

環境は作り直されている。**実測する。推測しない。**

```sh
[ -n "$YOUTUBE_API_KEY" ] && echo "key: あり" || echo "key: なし"
for h in github.com www.enjoytokyo.jp za-koenji.jp jirokichi.net bookandbeer.com \
         www.musashino.or.jp www.shogakukan.co.jp www.silver-elephant.com \
         www.tokyodo-web.co.jp cinemalice.theater; do
  printf "%-26s %s\n" "$h" "$(curl -s -o /dev/null -w '%{http_code}' -m 12 "https://$h/")"
done
```

`000` は届いていない（プロキシが 403 を返している）。理由は
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` の `recentRelayFailures` に出る。

**2026-09-11 の実測**：`YOUTUBE_API_KEY` あり。会場10ドメインすべてと
enjoytokyo・walkerplus に到達でき、`github.com` も通った。前の環境と違い、
**催しの確認と補充をこの環境の中で完結できる。**

届かなかったのは次の4つ。いずれも proxy policy の 403 で、許可ドメインに
足せば解決する。

| ドメイン | 何に要るか |
|---|---|
| ~~`moonartnightfes.com`~~ | 2026-09-11 にファウンダーが許可。到達できるようになった |
| `jimbou.info` | 神田古本まつりの開催確認（2026年分はファウンダーが別経路で確認済み） |
| `emotionbookstore.com` | 本番での表示確認。ローカルのページしか見られない |
| `www.gotokyo.org` | 催しの一覧（他の一覧サイトで代替できる） |

---

## 1. いまのサイト

本番 `https://emotionbookstore.com/`、Vercel が `main` への push で自動反映。
生成ページ 189（催しを19件足したぶん増えた）。

| | 本 | 音楽 | 映像 | 映画 | 計 |
|---|---:|---:|---:|---:|---:|
| 高円寺 | 4 | 5 | 6 | 5 | 20 |
| 下北沢 | 4 | 5 | 6 | 5 | 20 |
| 吉祥寺 | 3 | 5 | 6 | 5 | 19 |
| 神保町 | 5 | 5 | 5 | 3 | 18 |
| **計** | **16** | **20** | **23** | **18** | **77** |

ほかに街をまたぐ短編3件、催し43件。保留2件、見送り5件。

### 2026-09-10〜11 に増えた面

| 面 | 中身 |
|---|---|
| `/discover/weekly/` | 今週号。今週で終わる催し＋新しく入った作品 |
| `/feed.xml` | 新着のRSS。アカウント不要の再訪導線 |
| `/discover/venue/<id>/` | 会場5つ。本→その場所の音源→今週の催し |
| `/discover/places/` | 本屋・映画館・ライブハウス・劇場そのものの話18件（記録9／物語9） |
| 作品カード | 「なぜこの街？」＋出典を全77件に。出典50／記録27 で言い分け |
| 作品ページ | 説明・出典・確認日を1節に統合（重複していた） |
| 「同じ物語の、別のかたち」 | 森崎書店・グーグーの本↔映画 |

---

## 2. 催しの在庫：9/21 の一斉消滅は解消した。先の週ほど薄い

**9/21 に全24件が一度に消える問題は片づいた。** `reviewThrough` が全件
`2026-09-20` で揃っていたのが原因だったので、会期が9/20以降も残る7件のうち
6件を公式ページで確認し、公式に明記された会期終了日を期限にした。
期限が日ごとに散ったので、もう一度に空にはならない。

さらに19件を補い、催しは 24 → 43件。**見通せる6週すべてが下限5件を超えた。**

```
2026-09-07  13件   2026-09-28   9件
2026-09-14  13件   2026-10-05   6件
2026-09-21  13件   2026-10-12   5件  ← 先へ行くほど薄い
```

**残っているのは二つ。**

**(a) 先の週ほど薄い。** 全体の下限5件は満たすが、街ごとの3件は 9/21 の週まで。
9/28 の週は吉祥寺2件・神保町1件、10/05 の週は下北沢0件である。
**神保町がいちばん苦しい。** 神保町シアターの次の特集が未発表で、
シネマリスの上映スケジュールは JavaScript で後から読むため取れない。
`node qa/event_supply_check.js` を毎回回し、薄い週が「来週」になる前に足す。

**(b) 解消済み。** `shimokita-moon`（ムーンアートナイト下北沢）は、ファウンダーが
`moonartnightfes.com` を許可ドメインに足したので確認できた。公式の開催概要に
「2026年9月18日（金）〜10月4日（日） 15:00〜21:00」とあり、データと一致。
期限を会期終了日まで延ばした。これで 9/21 と 9/28 の週の下北沢が各4件になる。

### 週次で自動的に点検・補充する（2026-09-11 設定）

毎週金曜 JST 10:00 に新しいセッションが立ち上がり、催しの在庫と期限を点検して、
必要なら公式ページを確かめて補充し、`claude/weekly-<日付>` ブランチへ push する。
`main` には触れず、PR も作らない。変更が無ければ何もしない。

Routine ID：`trig_015rqQPN1AjoKDH31uknsguE`（`0 1 * * 5` UTC）。
止めたいときは claude.ai の Routines から無効化する。

**動き出す条件は、このブランチが `main` にマージされること。**
`docs/strategy/AUTONOMY-20260911.md` が無ければ、そのセッションは
何もせず「未マージのため待機」と報告して終わる安全弁を入れてある。

自走の範囲・採否基準・文言の型・越えてはいけない線は、すべて
`docs/strategy/AUTONOMY-20260911.md` にある。**`CLAUDE.md` からも参照している。**

### 同じ事故はもう先回りで鳴る

9/21 の件が10日前まで誰にも見えなかったのは、`tools/review-culture-events.js` が
**期限が切れてからしか鳴らなかった**ため（`reviewThrough < today`）。
切れた日にはもう読者も見ている。

いまは「21日以内に、会期が残ったまま3件以上が同じ日に消える」と鳴る。
会期が先に終わる催しは数えない（消えても穴が空かないので）。
事故当時のデータで試すと、9/11 の時点で当の7件を名指しする。
契約は `qa/events_expiry_cluster_check.js` が固定していて、`verify-product` が回す。

### 足し方

探し先は `docs/city-discovery/EVENT-SOURCES.md`。
**一覧サイト（enjoytokyo・walkerplus）は出発点であって出典ではない。**
必ず主催者・会場の公式ページまで辿り、そちらを `url` に書く。全43件がその形。

**まだ使っていない在庫は見てある。** JIROKICHI は10月だけで20件超、本屋B&Bは
10/3・10/4 ほか、吉祥寺シアターは『三英花 煙夕空』(10/14〜18)・
ラブ演劇博(10/23〜25)・『ヴォイツェック』(11/20〜29)、吉祥寺美術館は
谷口智則展の関連イベント(10/16・10/17)がある。次はここから取ればよい。

1件に必要な8項目は `EVENT-SOURCES.md` に表がある。

会場写真がある催し（座・高円寺／吉祥寺シアター／吉祥寺美術館／神保町シアター）は
`tools/event-media-source.js` の `byId` に足す。足さなければ街の写真になる。
どちらも権利確認済みで、新しい画像を探す必要はない。

`hook` と「なぜこの街か」は編集部のもの。**渡された事実から勝手に作らない。**
2026-09-11 の19件は、ファウンダーが「下書きまで Claude が作る」を選んだうえでの
下書きである。同じことをする前に、**その都度ファウンダーに確かめること。**

---

## 3. `YOUTUBE_API_KEY` があればできること

```sh
node tools/check-videos.js --catalogue        # 公開中59本
node tools/check-videos.js <id> [<id>...]     # 保留中12本（OUTING-VIDEOS-HANDOVER.md）
```

キーは絶対に出力しない作りになっている。`NG` の行と埋め込み不可の行は公開しない。
**API は「そのチャンネルが権利者本人か」を答えない。** そこは人が判断する。

---

## 4. Drive の候補台帳50件

精査済み：`docs/city-discovery/LEDGER-AUDIT-20260911.md`。要点だけ。

- **B-011 雨月物語（上田秋成）が最有力。** 12点。相手の映画 `jinbocho/ugetsu` は
  既に棚にあり、岩波書店の公式書籍ページがある。「同じ物語の、別のかたち」で対になる
- **B-007 ボン書店の幻／V-013 大屋書房**（どちらも12点）は `/discover/places/` に入る
- **国立映画アーカイブ10本**（1926〜1936年の東京）は街に紐づかない。
  ファウンダーが許可した「街に限らないコーナー」の種。全件が再ホスト禁止・公式embedのみ
- **Drive 台帳の5件が古い**（公開済みなのに「図版待ち」のまま）。Drive 側の更新が要る
- V-005・V-019 は台帳自身が9点未満としている。落とす候補

全件が「検索結果で見ただけ」か「URL未特定」。**実物の確認が要る。**

---

## 5. 検証のしかた

```sh
node qa/verify-product.js          # 22本。ここが緑でないと出さない
node qa/design_redesign_check.js   # 189ページ。文言と行き先の消失を見る
node qa/duplicate_text_check.js    # 187ページ。同じ文の二度出しを見る
node tools/build-city-discovery.js --check   # 生成物4本すべて --check が一致すること
node tools/build-work-pages.js --check
node tools/build-weekly-outings.js --check
node tools/build-design-redesign.js --check
git diff --check
node tools/check-post-length.js docs/city-discovery/LAUNCH-COPY-202610.md  # Xの原稿を直したとき
```

`qa/` には48本あるが `verify-product` が回すのは22本。残りには**既知FAILがある**。
`qa/KNOWN-FAILURES-20260910.md` を先に読むこと。そこに無い指摘は今回起因である。

作品を足したら `qa/city_discovery_check.js` の固定値（件数・ページ数）と
`qa/design-redesign/routes.json` がずれる。**数字は実態に合わせて更新する。緩めない。**

```sh
node -e "const fs=require('fs'),f=require('./tools/build-design-redesign'),r=require('./qa/design-redesign/routes.json');r.public_html=f.slice().sort();fs.writeFileSync('qa/design-redesign/routes.json',JSON.stringify(r,null,1)+'\n')"
```

---

## 6. 守ること（`CLAUDE.md` が正本）

- **裏付けのない関係を出さない。** 推測で街や会場に紐付けない
- **文言は編集部が決める。** 生成物が紹介文を書かない
- 本番反映はファウンダー承認済み。`main` へ早送りで push。**force-push はしない**
- **テストを削除・skip して緑にしない。** 仕様が変わったら新しい契約を書く
- GA4・外部通信・端末内保存・棚・Object契約に触れたら、報告で影響の有無を明記する
- 権利不明の画像・映像・音源を使わない
- 完了報告は6項目（変更ファイル／変更内容／テスト結果／影響の有無／残る懸念3つまで／Previewの可否）

---

## 7. 編集部の判断待ち（Claude は書き換えない）

1. **会場ページ冒頭の一文5本** — Claude が書いた。サイト上でこの位置の文はここだけ
2. **`kichion-toranoko` と `kichion-lady` が同じ `relationNote`** — 吉祥寺の棚に
   同じ「なぜこの街？」が2枚並ぶ。`qa/duplicate_text_check.js` に名指しで登録してある
3. **`home_canonical_check` / `thread_check` の60件** — 承認済み再設計で消えた旧HOMEを
   検査し続けている。削除ではなく現行HOMEの契約へ書き直すのが筋だが、編集判断が要る
4. **2026-09-11 に足した催し19件の `hook` と `relation`** — Claude の下書き。
   ファウンダーの承認を得て書いたが、**掲載前に編集部が読む前提**である。
   `tools/weekly-outings-source.js` の末尾、コメントで範囲を示してある

---

## 8. ファウンダー側でしか動かないこと

- **このブランチを `main` にマージする。期限は 2026-09-20。**
  本番（`main`）はまだ催し24件・期限が全件 `2026-09-20` のままである。
  マージしなければ **9/21 に本番の催しの節が 0件になる**（9/28 の週も 0件）。
  マージすれば 9/21 の週は13件。**この1手だけが、その事故を止める。**
  週次の自走が動き出す条件でもある（§2）
- **本番での表示確認** — `emotionbookstore.com` に接続できないので Claude にはできない
- `エンドレス・ワルツ`『影なき声』の行き先 — 台帳も「再上映まで Backlist」と判断。
  **いま何かする必要はない**
- メジャー作品の洗い出し、新しい街の選定（判断材料は `DIRECTION-20260910.md` の3条件）
- Drive 台帳の5件を「公開済み」に更新

---

## 読むもの（必要になったときだけ）

| ファイル | 何が書いてあるか |
|---|---|
| `CLAUDE.md` | 正本。禁止事項と権限 |
| `docs/city-discovery/EVENTS-SUPPLY-20260910.md` | 9/21問題の実測と直し方（問題は解消済み。考え方の記録として） |
| `docs/city-discovery/LAUNCH-COPY-202610.md` | 10月のX原稿。照合結果と、稿ごとに何が消えうるか |
| `docs/city-discovery/EVENT-SOURCES.md` | 催しの探し先と、1件に必要な8項目 |
| `docs/city-discovery/LEDGER-AUDIT-20260911.md` | Drive台帳50件の精査結果 |
| `docs/city-discovery/DIRECTION-20260910.md` | 在庫・メジャー・新しい街の方針 |
| `docs/city-discovery/SELECTION-20260910.md` | 採否の基準（直喩を採らない、等） |
| `docs/strategy/IDEAS.md` | 面白くするアイデア。却下したものも理由つき |
| `docs/strategy/MARKET-REVIEW-PROMPT.md` | 外部に評価させるプロンプト |
| `qa/KNOWN-FAILURES-20260910.md` | 既知FAILの台帳 |
| `docs/city-discovery/OUTING-VIDEOS-HANDOVER.md` | 保留12本のIDと手順 |
