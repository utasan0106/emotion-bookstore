# City Threads Immersive — Phase 3｜North Star Reconciliation

作成日：2026-09-02　対象：Direction A「資料の層をくぐる」× Founder/HQ North Star「CULTURAL PALIMPSEST / 街のパリンプセスト」
結論：**重大な矛盾なし。3点のCHANGE（面の色・層の運動方向・終わり方）を加えれば Direction A は North Star と整合する。同一作業内で Phase 3 実装へ進む。**

---

## 1｜Direction A のうち KEEP するもの

| 要素 | 理由 |
|---|---|
| 縦スクロール＝街の時間を歩く（scroll progress → 年 → 層の深度） | North Star 2-3「ページを下へ読んだ」ではなく「時間を進んだ」に一致 |
| 節目ごとに主資料1点だけに奥行きを与える（P9） | 2-4「Card UIとして並べない」「全部を3Dにしない」に一致 |
| 資料は原寸比・原型（ポスターはポスターの形）、要旨＋出典＋確認状態の Text Evidence | 2-1「実在する文化の痕跡を主役」、7 Asset rule に一致 |
| CSS 3D + DOM を段階1、Three.js は4条件を満たす場合のみ | 6 Implementation Priority「最初からThree.jsを入れない」に一致 |
| URL hash で街・年・節目を保持、Back で完全復元 | 2-5「Closeすると元の街・年代・位置へ正確に戻る」に一致 |
| 有限（5節目）、終点は現実の公式Action、Recommendationなし | 2-8 Ending に一致 |
| 本は Editorial Grammar（章・余白・脚注・出典・有限）としてのみ残す | 2-7 に一致 |
| 動詞は日本語、英字ラベルなし、hover非依存、44px以上 | 2-9 Mobile、v0.9 Acceptance を継承 |

## 2｜North Star によって CHANGE するもの

| 要素 | Direction A | North Star 適用後 | 理由 |
|---|---|---|---|
| 主面の色 | Warm Ivory の面。Navy は転換のみ | **深い紺〜黒に近い静かな空間**が主面。資料の層（紙）が Ivory で、暗い空間に浮かぶ | 2-1「静かな書店に入った」。紙＝資料、闇＝書店の棚の奥。Ivory は「資料の色」として残り、面の色ではなくなる |
| 層の運動 | カメラが奥へ進み、層を手前へくぐる | **現在の街が奥へ沈み、次の年代の層が手前側から読む距離に落ち着く。**沈んだ層は消えず、薄く奥に残る（persistence） | 2-3「現在の街が奥へ沈む → 古い資料が別のdepthから現れる」「過去の層を毎回完全に消去しない」 |
| 終わり方 | 最後の層をくぐると層が尽きて公式Actionが残る | **最後に現在の街の写真が再び手前へ戻る。その奥に、歩いてきた年代の層が透けて積み重なっている。**その上で公式Action | 2-4「現在の街の中に過去が透けて残っている」、3「高円寺って、今までと少し違って見える」 |
| 第一画面 | 「高円寺」「2026」と、奥にうっすら見える面 | 「高円寺」「2026」「現在の街の実写（CC BY-SA）」と、**写真の縁から覗く1957年の紙の角**が唯一の Trace | 2-2「現在の街の実写または実在資料」「一つだけ触ってみたいTrace」 |
| Evidence inspection | タップで面が正対し caption が前面 | **資料へ少し近づく**（層が手前へ寄り、周囲が沈む）→ 資料名・年代・Source・この資料から何が確認できるか → Close で元の年・位置・フォーカスへ | 2-5 |
| 光 | なし | **静かな上からの光**（面の上端が明るく、奥ほど暗い）。到着した層だけが光の中にある | 2-1「光・影」。意味＝いま読んでいる層はどれか |

## 3｜REMOVE するもの

- 横糸（高円寺→下北沢）の面と「渡る」ボタン：**実装しない。閉じた橋の演出も、将来の糸の予告も出さない**（0 Bridge HOLD、2-6）。
- 「別の街にも、このつづきがあるかもしれない」の文：出さない。
- 資料をくぐる瞬間の紙端マスク（Three.js候補）：不要。CSSの透明度と深度で意味は伝わる。
- Direction B の地図線：Phase 3 では使わない（§14）。
- 粒子・glow・lens flare・chromatic aberration・heavy blur・decorative noise・cinematic loading・過剰なカメラ回転：使わない（§12）。

## 4｜Interaction ごとの Effect → Meaning

| Interaction | Effect | Meaning（これがないと何が分かりにくくなるか） |
|---|---|---|
| 縦スクロール | 現在の層が沈み暗くなり、次の年代の層が手前から読む距離へ落ち着く。錨の年が転がる | 「時間を進んだ」。ページ送りではなく年代移動であること |
| 沈んだ層が薄く奥に残る | 過去の層が Z 奥に積み重なり、透けて見える | 「街に時間が積み重なっている」。palimpsest そのもの |
| 到着（settle） | 到着した層だけ不透明・光の中。周囲の層は静まる | 「ここで読む」。止まり所 |
| 写真の縁から覗く紙の角（Trace） | 触ると角が持ち上がり、1957 の紙が現れ始める（First Pull） | 「現在の下に過去がある」「触ると時間が動く」 |
| 資料をタップ（近づく） | その層が手前へ寄り、他が沈む。資料名・年代・Source・確認できることが読める | 「資料を検分する」。拡大ではなく接近 |
| Close / Back | 元の年・スクロール位置・フォーカスへ戻る | 「自分がどこにいたか」を失わない |
| 終点で現在の写真が戻る | 現在の写真の奥に、歩いた年代の紙が透けて積まれている | 「同じ街が違って見える」＝文化の時間を知った身体感覚 |
| 出口 | 遅延なしで公式へ | 「この先は街にある」 |

## 5｜First 5 seconds の exact experience

1. 暗い面（`#0f1518` 寄りの深い紺黒）。上部の錨に「高円寺　2026」。
2. 画面中央やや上に、現在の高円寺の街の写真（Wikimedia Commons “Street in Koenji.jpg”、CC BY-SA 4.0、帰属表示あり）が一枚、紙の縁を持って浮いている。写真の下端に「高円寺」「2026」（活字）。
3. 写真の右下の縁から、Ivory の紙の角が数ミリ覗いている。角に小さく「1957」。これが唯一の Trace（button、44px以上のヒット領域）。
4. ヒントは一行だけ：「── 角に触れると、この街の時間が開く。」
5. 触れる（pointerdown / Enter / Space）と 150ms 以内に角が持ち上がり（TRACE_REVEAL）、「阿波おどり ｜ 1957 ── 2026 ｜ 5つの節目」と「1957年へさかのぼる」が現れる。写真は動かない。
6. 「1957年へさかのぼる」（または縦スクロール）で First Pull：現在の写真が奥へ沈み暗くなり、1957 の紙が手前から読む距離へ落ち着く。錨の年が 2026 → 1957 へ転がる。

Tutorial modal・使い方・長文なし。

## 6｜1957 への最初の時間移動：DOM / CSS / camera / layer 構造

```
body（native scroll。節目ごとに 100svh の <section class="beat">。DOMテキストの正本）
├─ header.anchor（fixed：街・年・n/5）
├─ div.stage（fixed, inset 0, perspective: 1100px, pointer-events: none）
│   └─ div.layers（transform-style: preserve-3d）
│       ├─ figure.layer[data-i=0]  現在の写真（2026）
│       ├─ figure.layer[data-i=1]  1957 の紙
│       ├─ figure.layer[data-i=2]  1960年代の紙
│       ├─ figure.layer[data-i=3]  1970年代の紙
│       ├─ figure.layer[data-i=4]  2025 の紙
│       └─ figure.layer[data-i=5]  現在の写真（再び）＋透ける層
├─ main
│   ├─ section.beat#b0（Entrance：街名・年・Trace・direction）
│   ├─ section.beat#b1（1957：見出し・本文・資料・出典・進む）
│   ├─ … #b2 #b3 #b4
│   └─ section.beat#b5（2026：本文・出口・締め）
└─ dialog#inspect（資料へ近づく）
```

- scroll progress `p = scrollY / beatHeight`（0〜5、連続量）。`scroll` イベント（passive）→ `requestAnimationFrame` 1回で全層の transform を更新。**idle 時は rAF なし。**
- 層 i の深度 `d = p − i`。
  - `d < 0`（まだ来ていない）：`translateZ(+220px × min(1, −d))`、`opacity: 0 → 1`（手前側から読む距離へ落ち着く）
  - `d = 0`（到着）：`translateZ(0)`、`opacity: 1`、光の中
  - `d > 0`（過ぎた）：`translateZ(−380px × d)`、`opacity: max(0.12, 1 − 0.55d)`、色が沈む（奥へ沈む。消さない）
- 錨の年は v0.9 の TIME_SHIFT（400ms、tabular-nums）を継承。
- カメラは動かさない（`perspective-origin` 固定）。動くのは層だけ。過剰なカメラ回転なし。

## 7｜現在 → 過去 → 現在の layer persistence 設計

- 沈んだ層は `opacity` 下限 0.12 で残す。5節目を歩き終えたとき、Z 奥に 5 枚の紙と 1 枚の写真が薄く積まれている。
- 最終節目（2026 再び）は現在の写真を `opacity: 0.86` で手前に置き、奥の紙が写真越しに透ける。**「現在の街の中に過去が透けて残っている」を、この一枚で成立させる。**
- 逆方向（戻る）も同じ関数で連続。層は「消えて再生成」されない。

## 8｜Evidence inspection の interaction

- 各節目の資料ブロック（要旨）に「この資料に近づく」button。
- 押すと `dialog#inspect` を `showModal()`。同時に対応する層に `is-near` を付け、`translateZ(+140px)`、他の層を 0.35 に沈める（220ms）。
- dialog 内容（DOM）：資料名／年代／Source（URL）／この資料から何が確認できるか／確認状態（出典特定 2026-09-02・人の目視確認待ち）。
- Close（button・Escape・ブラウザ Back）：`history.pushState` を使い、Back でも閉じる。閉じたら層を戻し、開く前の `scrollY` と フォーカス元の button を復元。
- 資料画像はない（権利未確定）。近づくのは「紙（要旨の層）」であり、偽の資料を作らない。

## 9｜Mobile 390px の操作モデル

- 親指一本：縦スクロール＝時間を進む／戻る。タップ＝近づく。Close＝戻る。
- 横 swipe なし（Bridge なし）。
- 層は幅 `min(92vw, 560px)`、深度差は desktop の 0.7 倍（`--depth-scale`）。
- 錨 52px 固定。主要 button 48px。テキストは層の上に重ならないよう、各 beat の本文は層の下側（`padding-top: 46svh`）から始まる。
- scroll hijack なし。native scroll のみ。

## 10｜Reduced Motion で同じ意味を保つ

- `prefers-reduced-motion: reduce`：層の Z 移動を止め、到着した層だけを不透明、他を 0.12 に「切り替え」（transition 0）。年は即時更新。
- 「沈む」「近づく」は opacity と scale 1.0 固定の切替で表現し、意味（いま読む層・積み重なり・接近）はテキストと状態で保持。
- dialog の開閉は即時。

## 11｜使用予定 asset 一覧

| asset | 区分 | 状態 |
|---|---|---|
| “Street in Koenji.jpg”（NMaia、CC BY-SA 4.0、Wikimedia Commons）→ `assets/koenji-street-2026.jpg`（長辺1280に縮小）、`-640.jpg` | available / **rights cleared**（CC BY-SA 4.0、帰属表示を画面と `assets/ATTRIBUTION.md` に記載。改変＝縮小のみ） | 使用（Entrance／Ending の現在の街） |
| 年・要旨・出典の活字（FACTS.md F01〜F14） | available / rights n/a | 使用（各層の紙） |
| CSS で生成する中立な紙の面（gradient。noise なし） | temporary / placeholder ではなく恒久の表現 | 使用 |
| 歴代ポスター（振興協会） | **blocked**（許諾未申請） | 不使用 |
| 創成期の写真（故森田昇栄氏撮影） | **blocked**（許諾未申請） | 不使用 |
| 映像・音源 | blocked | 不使用 |
| AI生成イラスト `entry-koenji.webp` | available だが North Star 2-1 により不使用 | 不使用 |
| 地図 | temporary 候補（自作SVG）だが Phase 3 では不使用 | 不使用 |

## 12｜使用しない技術表現

大量 particle／glow／lens flare／chromatic aberration／heavy blur／decorative noise・grain／flashy shader／cinematic loading／過剰なカメラ回転／WebGL・Three.js／GSAP・Lenis／scroll hijack／autoplay audio／fullscreen。

## 13｜Performance budget との整合

| 指標 | 予算 | 設計 |
|---|---|---|
| 初回転送 | HTML+CSS+JS ≤ 60KB gzip | 単一 HTML + 外部 CSS/JS 各1。実測を報告 |
| 画像 | 1点 ≤ 200KB | 640px 版を `<picture>` で mobile に、1280px 版を desktop に。実測サイズを報告 |
| LCP | mobile 4G ≤ 2.5s | ローカル実測値と「4G は推定」を分けて報告 |
| 入力応答 | ≤ 150ms | QA で計測 |
| idle render loop | 0 | scroll 時のみ rAF。QA で idle 1秒の rAF 呼び出し数 0 を検証 |
| DPR | n/a（WebGL なし） | — |
| メモリ | 画像2枚のみ | — |

## 14｜Direction B から借りる要素

なし。演舞場拡大（F09）は 1960年代の層の活字（1965／1967／1969）として書く。地図は位置取りが FACT_REQUIRED のため使わない。

## 15｜Direction C の再確認

歴代ポスター等の rights が確定するまで使わない。Phase 3 に「ポスターの奥へ」要素は含めない。

## 16｜Cross-city Bridge が存在しなくても成立する構造

この Prototype の主題は「一つの街に積もった文化の時間を歩く」であり、横糸はその上に将来載る別の動詞である。Entrance → First Pull → 1957 → 1960年代 → 1970年代 → 2025 → 2026 → 公式Action は縦方向だけで閉じ、Ending（現在の写真の奥に層が透ける）が Bridge なしで「街が違って見える」を成立させる。Bridge は欠陥ではなく、Evidence が揃ったときに 2026 の層から横へ伸びる追加の動詞として設計余地を残す（実装・予告・装飾はしない）。
