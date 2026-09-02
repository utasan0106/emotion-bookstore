# City Threads Immersive — Phase 2｜3 Interaction Directions と推奨

STATUS: 文書のみ。コード変更なし。Phase 3 は Founder GO まで着手しない。
作成日：2026-09-02　前提：Phase 1（`IMMERSIVE_REFERENCE_DECONSTRUCTION.md`）、v0.9 isolated prototype（`city-threads-prototype/v0.9/`）、Fact台帳（`city-threads-prototype/v0.9/FACTS.md`）

共通の内容モデル（3案とも同じ）：高円寺 × 東京高円寺阿波おどり 1 Thread。
1957「ばか踊り」→ 1960年代（木場連・徳島留学・葵新連／天狗連・演舞場拡大）→ 1970年代（独立連が出揃う・1976 海外遠征）→ 2025（各賞受賞連）→ 2026（第67回）→ 公式Action。
横糸（高円寺→下北沢）は HQ判断で HOLD。3案とも Bridge は「閉じた橋」のまま（No evidence = no bridge）。

---

## Direction A｜資料の層をくぐる — Palimpsest Depth

| 項目 | 内容 |
|---|---|
| One sentence concept | 高円寺の時間を、実在資料の面が奥行きに積み重なった「層」として置き、縦スクロールでその層を手前へくぐるたびに年が変わる。 |
| First 5 sec | 画面には「高円寺」「2026」と、奥にうっすら見える一枚の面（1957年の資料の縁、または文字の層）だけ。街名の下に痕跡線。触れると層が手前へ一段せり出し、「阿波おどり ｜ 1957 ── 2026 ｜ 5つの節目」が立ち上がる（v0.9 の TRACE_REVEAL を継承）。 |
| User action | 縦スクロール／「〜年へ進む」ボタン／キーボード＝奥へ進む（時間を進む）。資料をタップ＝その面へ寄る。Back＝元の年・節目・位置へ。 |
| Time navigation | scroll progress → 年（連続量）→ カメラのZ。節目に近づくと層が「読むmode」に落ち着き（EVIDENCE_SETTLE）、通過すると錨の年が転がる（TIME_SHIFT）。年と層は同じstate machine。 |
| Evidence interaction | 各節目に主資料1点（奥行きを持つ面）＋DOMの要旨・出典・確認状態。タップで面が正対し、caption・出典が前面へ。資料の縁（紙端・折り）は実物由来のときだけ残す。画像がない節目は「文字の層」（要旨の活字面）として立てる＝v0.9の Text Evidence と同じ。 |
| Cross-city transition | 年を固定したまま、隣の街の層へ横に平行移動（CITY_TRANSFER）。Phase 3 では下北沢の面は「閉じた橋」として存在だけを示す（v0.9と同じ）。 |
| Ending | 最後の層は「2026年の現在地」。くぐると層が尽き、DOMの公式Action（開催概要／史料館・歴代ポスター・各賞受賞連／杉並区）だけが残る。「この先は、高円寺にある。」 |
| Visual language | Warm Ivory の面、資料は原寸比・原型（ポスターはポスターの形、写真は写真の縁）。奥の層ほど薄く（空気遠近ではなく紙の重なり）。Navyは横糸の面だけ。粒子・blur・glow・grainなし。 |
| Sound | なし（Phase 3）。将来、鳴り物の許諾音源を「当時の音を聴く」opt-inで。 |
| Technical architecture | **段階1：CSS 3D（`perspective` + `transform-style: preserve-3d` + `translateZ`）＋DOM**。scroll→progress→`--z` を rAF内で更新（passive listener、idle時は処理なし）。対応ブラウザでは CSS scroll-driven animations（`animation-timeline: scroll()`）にJSフォールバック。**段階2（条件付き）：Three.js self-host** は「資料の面を通過する瞬間の紙端マスク」がCSSで表現できないと判明した場合のみ。 |
| Asset requirement | 節目ごとに主資料1点（最大5点）＋現在地写真1〜2点。権利確認済のものだけ。無ければ文字の層で成立させる。 |
| Mobile feasibility | 高。縦スクロールのみ、横swipe不要。CSS 3D は iOS Safari / Android Chrome で安定。DPR依存なし（画像はsrcset）。 |
| Performance risk | 低〜中。画像は節目ごと lazy（AVIF/WebP、各≤200KB）。WebGL不使用なら常時render loopなし。 |
| What product hypothesis it proves | B「時間を移動した」と分かるか（通過＝年）、D 資料と関係を記憶できるか（一枚の面として残る）、F 同じ文法が他の街でも使えるか（層の数と資料を差し替えるだけ）。 |
| What could fail | 資料の権利が取れず全節目が文字の層になると、v0.9との差が「奥行き」だけになり、3Dである必然が薄い。層の通過が速すぎると読めない（settleの設計が肝）。 |

## Direction B｜演舞場を歩く — Street Time-Lapse

| 項目 | 内容 |
|---|---|
| One sentence concept | 高円寺駅周辺の簡略地図（自作SVG）の上で、演舞場が1957→1965→1967→1969→現在と街へ広がっていく線を、スクロールで年を進めながら「歩く」。 |
| First 5 sec | 「高円寺」「2026」と、駅と一本の商店街だけの線画。触れると1957年の250mの線（高円寺駅〜宝橋）が現れる。 |
| User action | 縦スクロール＝年。地図上の線をタップ＝その年の演舞場の資料へ。ボタン／キーボード同等。 |
| Time navigation | 年が進むと線が伸び、北口へ、高南通りへと地図の形が変わる（「地図の線が次の文化Nodeへ変化する」）。 |
| Evidence interaction | 線のそばに資料（要旨・出典）。地図は説明のためだけ（Diagram/Map mode）。 |
| Cross-city transition | 地図が横へパンして下北沢へ（年固定）。閉じた橋。 |
| Ending | 現在の8か所の演舞場（杉並区［9］）→ 開催概要へ。 |
| Visual language | 線画・活字・年。写真は最小。地図は「街を歩く」ための足場であって地図アプリにしない。 |
| Sound | なし。 |
| Technical architecture | SVG + DOM のみ。WebGL不要。線の伸長は `stroke-dashoffset`。 |
| Asset requirement | 街路の簡略SVG（自作。OSM由来ならODbL帰属表示）。**演舞場の位置と年は一次Sourceで確認済（FACTS F09・F14）だが、地図上の正確な位置取りは FACT_REQUIRED（公式の演舞場マップPDFの権利確認と照合が必要）**。 |
| Mobile feasibility | 高。 |
| Performance risk | 最低。 |
| What product hypothesis it proves | B（線が伸びる＝年が進む）、C（街を渡る理由を地理で説明）に強い。 |
| What could fail | 徳島留学・海外遠征・受賞連は地図で語れない（節目の半分が地図外）。Google Maps的な既視感。「文化の時間を歩く」より「祭りの会場図」に見える危険。 |

## Direction C｜一枚のポスターの奥へ — Poster Portal

| 項目 | 内容 |
|---|---|
| One sentence concept | 歴代ポスター（史料館）の一枚が入口になり、近づいてその中へ入るとその年の高円寺の節目が現れ、次のポスターへ歩くことで年が進む。 |
| First 5 sec | 一枚のポスターの縁だけが見える。触れると正対し、年が読める。 |
| User action | スクロール＝ポスターに近づく／通過して次の年へ。タップ＝資料へ寄る。 |
| Time navigation | ポスター1枚＝1節目。通過で年が変わる。 |
| Evidence interaction | ポスターの奥に要旨・出典。 |
| Cross-city transition | 別の街のポスターへ横移動（閉じた橋）。 |
| Ending | 2026年のポスターの奥が公式Action。 |
| Visual language | ポスターの実物の印刷・紙質が主役。 |
| Sound | なし。 |
| Technical architecture | Aと同じ（CSS 3D → 条件付きThree.js）。 |
| Asset requirement | **歴代ポスターの掲載許諾が前提（振興協会）。許諾がなければ成立しない。** 1957年のポスターが存在するかも未確認（FACT_REQUIRED）。 |
| Mobile feasibility | 高（Aと同じ）。 |
| Performance risk | 低〜中。 |
| What product hypothesis it proves | A（触る対象が明白）、E（ポスター＝現実の祭りへの意向）に強い。 |
| What could fail | 権利ブロック。Magische Spiegelungen「絵の中へ入る」との既視感。ポスターがある年しか歩けず、1957や1960年代の節目が空く。 |

---

## 順位付け（Product Meaning × Originality × Mobile × Performance × Human Editorial）

| Direction | Product Meaning | Originality | Mobile | Performance | Human Editorial | 総合 |
|---|---|---|---|---|---|---|
| **A 資料の層をくぐる** | 5（通過＝年代、層＝積もった時間） | 4（「一枚の層が変わる」は既存参照の表面を借りない） | 5 | 4 | 5（資料が無い節目は文字の層で成立＝No evidence でも嘘をつかない） | **1位** |
| B 演舞場を歩く | 3（演舞場以外の節目が語れない） | 3（地図UIの既視感） | 5 | 5 | 4 | 2位（Aの1960年代の節目の部品として採用候補） |
| C ポスターの奥へ | 4 | 2（参照4との既視感） | 5 | 4 | 2（権利依存が最大） | 3位（権利が揃った後の SMALL TEST） |

**推奨：Direction A。** Bの「線が伸びる地図」は、Aの1960年代の節目（演舞場拡大 1965/1967/1969）の資料として1面だけ使う可能性を残す（地図の位置取りは FACT_REQUIRED）。Cはポスターの許諾後に検討。

---

## 推奨案の Technical Architecture（Phase 3 の設計。着手はGO後）

- **配置**：`experiments/city-threads-immersive-koenji/`（`index.html` / `css/` / `js/`（ES modules）/ `assets/`（権利確認済のみ）/ `qa/`）。Productionからの参照0。`.vercelignore` に `qa/` と `docs/` を追加する（既存パターンに従う。`docs/` は既に非anchoredパターンで除外される）。
- **描画**：段階1は **CSS 3D + DOM**。`perspective: 1200px` のステージ内に、節目ごとの「層」を `translateZ(-N * 900px)` で配置し、scroll progress を `--z` に写像して全層を手前へ移動。層を通過する瞬間に `arrive()`（v0.9の位置判定を継承）が年と進捗を更新。
- **WebGL導入条件**（すべて満たす場合のみ Three.js を `vendor/three.module.min.js` として self-host。CSP `script-src 'self'` のためCDN不可）：(1) 紙端マスクや資料面の通過表現がCSSで意味を失う、(2) mobile fallback（CSS 3D版）が同じ内容を提供、(3) reduced-motion fallback あり、(4) bundle影響を報告（three core ≈ 150–170KB gzip 相当を想定。実測して報告）。
- **依存**：GSAP / Lenis / その他アニメーションlibは導入しない（native scroll + CSS transition + rAF で足りる。scroll hijack禁止）。
- **状態**：URL hash `#koenji/1957` を継承。Back で街・年・節目・位置を完全復元。
- **入力**：縦スクロール、ボタン、キーボード（Tab / Enter / Escape、矢印は使わない）、タップ。hover非依存。横swipe不要。
- **Reduced motion**：層の移動を廃し、fade / cut で節目間を移動。年は即時更新。
- **Fallback**：`no-3d`（`matchMedia` と機能検出で判定）では v0.9 と同じ平面レイアウトを表示。**v0.9 が DOM-based fallback そのもの**であり、内容は同一。
- **音**：なし。将来はユーザー操作後のみ。

## Performance Budget（DESIGN TARGET）

| 指標 | 予算 |
|---|---|
| 初回転送（第一画面まで） | HTML+CSS+JS ≤ 60KB gzip（WebGLなし）。Three.js 採用時は +170KB を上限とし、遅延ロード |
| 画像 | 節目ごと lazy。1点 ≤ 200KB（AVIF/WebP、長辺 ≤ 1600px、srcset）。第一画面は画像0〜1点 |
| LCP | mobile 4G で ≤ 2.5s |
| 入力応答 | pointerdown → 視覚応答 ≤ 150ms（v0.9 QAで計測継続） |
| フレーム | 60fps 目標（iPhone 12 相当）。スクロール中のみ rAF、idle時は0 |
| DPR | 描画DPR ≤ 2 に clamp（WebGL時） |
| メモリ | 画像は表示範囲外で解放（`loading="lazy"` + `decoding="async"`）。WebGL時は texture dispose |
| Loading画面 | なし。第一画面はテキストで即時 |

## Mobile approach

- Primary target：iOS Safari / Android Chrome、390px。390で成立しない操作は core にしない。
- 縦スクロール＝時間。横方向は明示ボタンのみ（CITY_TRANSFER）。
- 層の奥行きは 390 では浅く（`perspective` を広げ、Z間隔を短く）し、1 beat = 1 画面。
- Touch target ≥ 44px（主要は 48px）。200% zoom で操作維持（v0.9 QAを継承）。

## Accessibility / Fallback

- DOMテキスト（年・見出し・要旨・出典）が正。3D層は `aria-hidden` の装飾で、意味は必ずテキストにも存在。
- `prefers-reduced-motion`：fade / cut。年・節目・資料の意味は保持。
- キーボード：Tab で節目のボタン、Enter で移動、到着先見出しへフォーカス、Escape で横糸から戻る（v0.9 実装済）。
- WebGL不可／低性能端末：CSS 3D → それも不可なら v0.9 平面。
- 画像に alt、映像は使わない（Phase 3）。

---

## 報告（13項目）

1. **repo audit**：静的HTML/CSS/JS、build なし、Vercel静的配信、CSP `script-src 'self'`（CDN不可）、Production runtime ≈ 110KB、assets 7.7MB、Playwright QA。詳細は Phase 1 §4。
2. **reference deconstruction**：Phase 1 文書。6サイト×15観点、FACT/INFERENCE 区別、未到達を明示。借用原則 P1〜P15。
3. **3 interaction directions**：A 資料の層をくぐる／B 演舞場を歩く／C ポスターの奥へ。
4. **recommended direction**：**A**（Bは1960年代の節目の部品候補、Cは権利後）。
5. **technical architecture**：CSS 3D + DOM を段階1、Three.js self-host は4条件を満たす場合のみ。依存追加なし。
6. **required assets**：節目ごと主資料1点（最大5）＋現在地写真1〜2点。無ければ文字の層。
7. **rights/source gaps**：歴代ポスター・創成期写真は振興協会の許諾が必要（未申請）。現在地写真は自撮り推奨（Commons は帰属管理の既存手順で可）。地図は自作SVGか ODbL 帰属。演舞場の地図上の位置取りは FACT_REQUIRED。史実は FACTS.md で確認済（ただし検索インデックス経由・全文未閲覧。HQの最終目視を依頼）。
8. **performance budget**：上表。
9. **mobile approach**：上記。
10. **accessibility/fallback**：上記。v0.9 が DOM fallback。
11. **exact implementation scope（Phase 3、GO後）**：`experiments/city-threads-immersive-koenji/` に 1 Thread（高円寺×阿波おどり）。状態：Entrance／1957／中間節目（1960年代・1970年代・2025）／資料の検分（寄る）／層の通過＝年代移動／閉じた橋（Bridgeなし）／現在（2026）／公式Action。QAは v0.9 の `ct_qa.js` を基に 4幅・keyboard・reduced-motion・overflow・console・外部通信0・fallback切替を検査。
12. **files that would change**：新規のみ — `experiments/city-threads-immersive-koenji/{index.html, css/*, js/*, assets/*(権利確認済のみ), qa/*}`、`.vercelignore`（`/experiments/city-threads-immersive-koenji/qa/` の追加。HQ承認後）。
13. **files that must not change**：`index.html` `shelf.html` `suggest.html` `data.html` `release.js` `release_content.js` `release.css` `analytics-v3.js` `growth-improvements.js` `weekly-video.*` `vercel.json`（CSP含む）`robots.txt` `sitemap.xml` `v3-prototype/**` `visual-refit-v2-prototype/**` `archive/**` `qa/**`、および `city-threads-prototype/v0.9/**`（fallback／参照として凍結。Fact更新のみ許可）。

**Founder GO が出るまで Phase 3 は開始しない。**
