# Privacy / Terms Exact Redline Map for Current V3

This is a recommendation map, not a Legal-file mutation. Root `privacy.html`
and `terms.html` are legacy/current-service documents containing V2 and future
claims. Sprint05 does not edit them or start the follow-on Legal/Metadata phase.

## P0 — MUST FIX BEFORE V3 RELEASE (8)

### P0-01 — V3 applicability/version

**Location:** Privacy title/version + Article 1; Terms title/version + Article 1.

**Issue:** The documents do not identify the V3 Release truth boundary and mix
V2/current/future functionality.

**Exact insertion:**

> 本ポリシー（本規約）の「V3 Release」に関する記載は、V3の公開画面、端末内保存、確認済みの公式外部リンクおよびサイト配信に適用します。V2または将来機能の記載は、V3で現在有効な機能を意味しません。

### P0-02 — GA4 is currently inactive

**Location:** Privacy 3.3, 8, 12, Appendix; Terms 8.

**Replace current-V3 claim with:**

> 現在のV3 Releaseでは、Google Analytics 4その他のアクセス解析への送信を有効にしていません。V3の計測実装には送信先が設定されておらず、イベントは外部送信されません。将来V3専用の送信先を確認して有効化する場合は、開始前に本ポリシーと外部送信一覧を更新します。

### P0-03 — Google Fonts is not a V3 external request

**Location:** Privacy Article 5 + Appendix Google Fonts row; Terms Article 8.

**Exact replacement:**

> V3 Releaseの表示用フォントは、サイトと同じ配信元から読み込む自己ホスト方式です。V3の表示時に fonts.googleapis.com または fonts.gstatic.com へフォントを要求しません。

### P0-04 — Remove inactive APIs/weather from current-V3 statements

**Location:** Privacy Articles 6–7 + Appendix; Terms Articles 1, 7–8.

**Exact replacement:**

> 現在のV3 Releaseには、Google Books API、Apple iTunes Search API、Open-Meteoその他の天気API、位置情報取得、外部AI、外部検索による推薦表示はありません。これらの将来導入を本記載で事前承認するものではなく、導入前に仕様・規約・プライバシーを別途確認します。

### P0-05 — Replace current external-transmission table

**Location:** Privacy Appendix.

**Exact current rows:**

1. サイト配信元 — 文書・同一オリジンの静的ファイル。通常の配信メタデータ。ページ表示時。
2. 新宿御苑公式サイト（`fng.or.jp`）— 利用者が公式サイトを見る操作をした時だけ。
3. Google Maps（`www.google.com`）— 利用者が地図/経路操作をした時だけ。公開目的地住所のみ、origin/現在地なし。
4. GA4 — 現在は送信先未設定、送信0。将来条件は別記。
5. Editorial video providers — 現在の有効レコード0。将来も人が承認したレコードへの明示操作後のみ。

Do not list X, weather, external book/music APIs, ads, support, payments, or
Marketplace as current V3 flows.

### P0-06 — Correct recommendation/editorial semantics

**Location:** Terms Articles 1 and 7.

**Exact replacement:**

> V3の公開体験は、人が承認した編集基準と確認済みの実在Experience Registryに基づき、0〜3件の有限な寄り道を表示します。外部APIの自動検索結果で棚を埋めず、利用者の心理状態を診断しません。

### P0-07 — Correct Terms external-service statement

**Location:** Terms Article 8.

**Exact replacement:**

> 現在のV3 Releaseで常時発生するのは、サイト配信元への同一オリジン通信です。公式サイトおよびGoogle Mapsへの移動は、利用者が該当ボタンを選んだ場合だけ発生します。GA4、Google Fonts、外部書籍・音楽API、天気API、共有、支援、広告、決済はV3 Releaseでは有効ではありません。

### P0-08 — Discoverable Legal access

**Location:** V3 shared navigation/footer (currently absent).

**Exact requirement:** After the updated V3 documents exist, add same-origin,
discoverable `プライバシー` and `利用規約` links without adding tracking or a
new data flow. This must occur in the authorized Legal/Metadata phase, not here.

## P1 — SHOULD FIX BEFORE V3 RELEASE (5)

### P1-01 — Plain, bounded Trust headings

Current `登録不要・完全に非公開` and `AIは使用しません` can be read more
broadly than their supporting sentences.

**Recommended exact copy:**

- `登録不要・記録は非公開` / `この端末に保存した記録は公開されません。`
- `記録を外部AIへ送りません` / `この端末に保存した内容を、外部AIへ送る機能はありません。`

### P1-02 — Replace Beta0/private-language FAQ wording

**Recommended exact answers:**

> 自分の記録は公開されません。現在のV3ではこの端末のブラウザに保存し、外部サービスへ送信しません。公式サイトや地図を開いた後は、移動先の方針が適用されます。

> この端末に保存した記録を外部AIへ送る機能はありません。

### P1-03 — Current storage inventory and recovery boundary

Describe current V3 `session` and `interested-experiences-v1`, including shelf,
Interested, Plan, and Trace state; state that browser/site-data deletion or
device change can remove it and the operator cannot restore it. Do not import
V2 body/photo/bookshelf language into V3 unless that UI actually exists.

### P1-04 — Explicit-action destinations and future provider storage

Disclose that official sites/Maps apply their own policies after explicit
navigation. Before any Editorial embed is activated, disclose that a provider
may receive IP/browser metadata and may set provider-controlled identifiers.

### P1-05 — Hosting technical metadata

Retain the hosting disclosure, but separate ordinary delivery logs from Product
analytics and state that V3 itself does not append private state to URLs.

## POST-RELEASE / future-gated

- Verify actual GA4 Admin settings before any activation.
- Draft Memory Print Legal/Privacy only after its separate explicit opt-in flow
  and providers are approved.
- Draft Creator Support/Marketplace/ads/payment disclosures only if separately
  specified and implemented later.

## NO CHANGE

- No-affiliate/no-commercial-ranking current truth.
- No diagnosis, geolocation, external AI, login, or cloud sync current truth.
- New-tab external-action icons/labels and `noopener,noreferrer` behavior.
- Local Plan statement that no external calendar sync exists.
