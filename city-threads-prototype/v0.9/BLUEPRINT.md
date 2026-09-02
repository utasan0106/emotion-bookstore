# City Threads v0.9 — 高円寺 → 阿波おどり vertical slice｜Blueprint

STATUS: R&D ONLY / isolated prototype / Production非接続 / main変更なし

正本：`V3_CITY_THREADS_CLAUDE_HANDOFF_20260902`（Drive Doc）＋ 同フォルダ `city-threads-prototype-v0.8`。
CEOからの補足指示（2026-09-02）「歩くこと自体をHistoryにする」を反映。

---

## STEP 3｜v0.8 の Visual / UX 問題（10件）

根拠：v0.8 実画面（1440×900 / 390 fullpage）を Chromium で描画して確認。

| # | 軸 | 問題 | なぜ問題か |
|---|---|---|---|
| 1 | Composition | 第一画面の主役が「見開きの本」で、4街が本の上に散らばる。触るべき対象が4つ＋中央の注記＋左のヒーロー文で、Primary Actionが1つに絞れていない。 | Event Preflight原則「一画面一Primary Action」「5秒以内に次の行動」に反する。何を触るかを左の本文（「まず、右の見開きに触れてください」）で説明しないと伝わらない。 |
| 2 | Composition / Brand | 綴じ糸（bridge-line）が常時5本描かれ、街を触ると点滅する。糸は「関係がある」証拠ではなく「関係を表現したい」装飾になっている。 | Deep Research「常時見える糸 = REJECT」。線が証拠より先に存在すると、Human Editorialの「なぜこの橋か」が消える。 |
| 3 | Interaction | Historyが最下部の独立Timeline（6つの年ボタン＋説明カード）で、街を触る操作と年代が連動しない。年をタップしても街も道も動かない。 | 正本 7｜「移動そのものをHistoryにする」に反する。年表を「読む」UIのまま。CEO指示で「次に壊すべき部分」と明示。 |
| 4 | Interaction | 街タップ後に `scrollIntoView` で自動的にStageへ飛ばされる。ユーザーが操作した結果ではなく、画面が勝手に移動する。 | user agencyを下げる。「触ると即座に意味が返る」ではなく「触ると場所が変わる」になり、0.5秒の因果が切れる。 |
| 5 | Typography | 英字metadata（`TOUCH A CITY` `VOLUME 01 / WEST` `WHY THIS BRIDGE` `BRIDGE 0 / 3` `SOUND THREAD`）が letter-spacing uppercase で多用される。 | award-site dialect。正本11｜「英字は補助。日本語が主」に反する。年（visual anchor であるべき）より英字ラベルが目立つ箇所がある。 |
| 6 | Typography | 見出しが全部巨大（hero h1 8.4rem、section h2 5.6rem、object-title 8rem、ghost-year 15rem）。階層が「全部大見出し」になり、街→年→出来事→証拠→編集部の一文→出口 の順序が読めない。 | 正本11｜「全要素を大見出しにしない」。年が最大であるべきなのに、店名（SOMETIME）が最大になる。 |
| 7 | Texture / Color | 全面ノイズtexture（`body:before` fractalNoise）と radial-gradient を敷き、Stageは Deep Navy 全面＋ポインター追従の赤い光。 | Deep Researchの禁止項目（global grain / cursor-follow / dark=premium）。素材由来でないtextureはnoise。Navyは「世界転換」に限定する正本11｜に反し、常設区画になっている。 |
| 8 | Motion | 本の3D傾き（rotateY/rotateX）とhoverで戻る動き、綴じ糸のstitchアニメ無限ループ、タップのripple、ポインター追従。どれも「無くなると何の意味が分からなくなるか」に答えがない。 | Motionが内容と競合する。無限ループは reduced-motion でしか止まらない。意味のある4種（Touch / Time / Cross-town / Ending）に絞れていない。 |
| 9 | Brand-native metaphor | 「本の見開き」そのものが画面（spine、page-no、VOLUME）。しかし操作は「ページを進む」ではなく「街ボタンを押す→下へスクロール」。本の見た目と操作が一致していない。 | KOKUYOがliteral notebook interactionを占有している中で、見た目だけ本にすると既視感が出て、City Threads固有価値（文化が街と時間を移動した痕跡）を説明しない。 |
| 10 | Mobile | 390では本が縦長カード化し、4街が散らばり、中央注記と年whisperが重なる。Stage/Timelineがそのまま縦に積まれ、1画面で完結する beat がない。3本の道 × 4街 × 6年 を全部並べる情報量。 | 正本13｜「mobileはdesktopを縮めず再構成」。有限進捗（n/N）も無く、どこで終わるか分からない。 |

---

## STEP 4｜v0.9 Blueprint（1ページ）

### 方向
Deep Research 推奨 Direction C「街のパリンプセスト / Trace Palimpsest」を front-end、Direction B「Transfer Ledger」を content model として採用。
本は画面の形ではなく編集原理（章立て・余白・脚注・出典・有限）としてだけ残す。

### 主語
「本」ではなく「高円寺」。
**Place → trace → time layer → evidence → transfer(可能性) → real action**。

### First 5 seconds（第一画面）
- 画面にあるのは 3つだけ：`高円寺`（触れる対象）／`2026`（時間の錨）／一行のヒント「触れると、この街の時間が開く」。
- チュートリアル・メニュー・ネットワーク図・ヒーロー文なし。
- `高円寺` は button。下に痕跡線（trace mark）を持ち、触った瞬間（pointerdown / Enter / Space）に 150ms で「文化の層」が立ち上がる：**阿波おどり ｜ 1957 ── 2026 ｜ 5つの節目**。
  → 0.5秒以内に「時間の幅（Relation）」が返る。pulse/glowだけの feedback にしない。
- 次の Primary Action は1つ：「1957年へさかのぼる」。

### Primary interaction
| 入力 | 意味 | 即時feedback |
|---|---|---|
| 高円寺に触れる | 文化の層を開く | 阿波おどり／年の幅が現れる（TRACE_REVEAL） |
| 「1957年へさかのぼる」 | 時間を一気に戻す | 錨の年が 2026→1957 に転がる（TIME_SHIFT）、1957の節目が読むmodeで着地（EVIDENCE_SETTLE） |
| 縦スクロール／「〜年へ進む」button／キーボード | 街の時間を歩く | 錨の年と進捗 n/5 が変わる。到着した節目だけ濃くなり、周囲は静かになる |
| 「同じ2026年の下北沢へ渡る」 | 同じ年の別の街へ | 年は固定のまま、canvasが横へずれ、下北沢の面が入る（CITY_TRANSFER）。Deep Navyはここだけ |
| Back（ブラウザ／「高円寺へ戻る」） | 元の街・年・節目へ | 完全復元 |
| 出口 | 現実へ出る | 遅延なし。公式サイトへ |

### Koenji Awaodori vertical slice（5 stops）
| n | 年 | 節目 | 使うFact（出典） | 出典確認状態 |
|---|---|---|---|---|
| 1 | 1957 | 「ばか踊り」として始まる | 商店街の賑わいづくりとして「高円寺ばか踊り」から始まる（杉並区） | 編集部一次確認待ち |
| 2 | 1960年代 | 本場・徳島に学ぶ／連が生まれる | 徳島との交流、独立連の誕生（振興協会 史料館） | 編集部一次確認待ち |
| 3 | 1970年代 | 演舞場が街へ広がる／1976 海外へ | 演舞場の拡大、1976年の海外遠征（振興協会 史料館） | 編集部一次確認待ち |
| 4 | 2025 | その年の受賞連 | 東京都知事賞・都議会議長賞・杉並区長賞・読売新聞大賞・報知新聞賞など複数の賞体系。2025年度受賞連は公式に掲載。歴代ポスターも公式に存在 | 編集部一次確認待ち |
| 5 | 2026 | この文化は、まだここにある | 今年の東京高円寺阿波おどり（公式） | 開催日程・演舞場は公式へ |

- Ranking化しない：「大賞作品」の単一序列を作らず、「2025年の受賞連を公式で見る」「歴代ポスターをめくる（公式）」にする。
- 画像・映像・ポスターは Rights 未確認のため使わない。資料は **Text Evidence**（引用＋出典＋確認状態）として立てる。AI生成の偽ポスター・偽写真は作らない。
- Facts は CEO指示に杉並区／振興協会由来と明記されたものだけ。**Claudeは本環境で一次Sourceに到達できなかった（外部ドメインがネットワークポリシーでブロック）ため、全Factに「編集部一次確認待ち」を明示する。**

### 横糸（街を跨ぐ可能性）
- 場所：2026 の節目。1箇所だけ。
- 内容：「高円寺の連のひとつが、2026年の下北沢阿波おどりへの出演を報告している」（CEO提示・未確認）。
- 実装：**渡った先があること**と **CITY_TRANSFER の運動**だけを示す。下北沢の面には「編集部が一次資料を確かめるまで、この橋は開きません」と明記し、Factとしては提示しない。連名も出さない。
- Bridge rule：Fact＋Evidence＋編集部の理由＋行き先 が揃うまで、本当の橋にはしない。

### State transitions
```
start(2026, closed)
  --touch city-->     start(2026, direction open)
  --go 1957-->        walk(1957)  [n=1/5]
  --scroll/next-->    walk(1960s) → walk(1970s) → walk(2025) → walk(2026) [5/5]
  --prev-->           逆順に戻る
  walk(2026) --bridge--> transfer(shimokitazawa, 2026)   ※year固定
  transfer --back-->  walk(2026)  完全復元（history.pushState / popstate）
  walk(2026) --exit--> 公式サイト（新しいタブ）
```
URL：`#koenji/1957` のように街と年を保持。再読込・共有で同じ節目へ戻る。

### Motion primitives（token化、4種＋Exit）
| token | 意味 | 値 | reduced-motion |
|---|---|---|---|
| `--m-trace` TRACE_REVEAL | 触れる／痕跡がある | 150ms | opacity 0ms（即時） |
| `--m-time` TIME_SHIFT | 年が変わった | 400ms（年の数字が転がる） | 即時に数字が変わる |
| `--m-transfer` CITY_TRANSFER | 同じ年の別の街へ | 560ms（横のregistration shift） | 即時に面が入れ替わる |
| `--m-settle` EVIDENCE_SETTLE | 探索→読む | 220ms（節目が濃くなる） | 即時 |
| EXIT | 現実へ | 0ms | — |
無限ループ・particle・parallax・cursor追従・3D・全面texture・自動スクロール：なし。

### Typography / Color / Surface
- 2 family：Display＝明朝系（Hiragino Mincho / Yu Mincho / Noto Serif JP）、UI＝ゴシック系。年は tabular-nums。
- 階層：街 → 年 → 節目 → 編集部の本文 → 資料 → 出典 → 出口。年が最大。
- 英字ラベルなし。動詞は日本語（「触れる」「さかのぼる」「進む」「渡る」「戻る」「公式で見る」）。
- Warm Ivory を主面。Deep Navy は転換（下北沢の面）だけ。Accent Green は focus/state だけ。Red thread は横糸だけ。
- 枠線は資料の上罫と button の1px のみ。shadow・角丸カード・gradient・grain なし。

### Mobile recomposition（390 / 430）
- 1 beat = 1 画面。節目は縦に積み、上部の錨（街・年・n/5）が常に見える。
- 唯一の主要gestureは縦スクロール。横swipeを推測させない。街を跨ぐのは明示button。
- desktop の2段組（左：年＋余白注記／右：本文・資料）を、モバイルでは 年 → 節目 → 本文 → 資料 → 注記 → 出口 の1列に再構成。
- Primary button ≥ 48px、focus visible、200% zoom で操作維持。

### Ending
- 最後の節目 = 2026「この文化は、まだここにある。」
- 出口は最大3群：**行く**（開催日程・演舞場）／**観る・読む**（史料館・歴代ポスター・2025受賞連）／**公式情報を見る**（杉並区）。
- その後に1つだけ：「別の街にも、このつづきがある」（横糸）。おすすめ一覧・無限表示なし。
- 締め：「この先は、高円寺にある。」＋「はじめの高円寺へ戻る」。

### Acceptance（v0.8比）
1 Composition：主役が本→街と年。第一画面の触る対象は1つ。
2 Typography：年が最大、英字ラベル0。
3 Color：Navyは転換1面のみ、赤は横糸のみ。
4 Spacing：節目ごとに1画面、余白は読むためのもの。
5 Texture：全面noise廃止。資料は Text Evidence として立つ。
6 Affordance：痕跡線＋日本語動詞。hover非依存。
7 Motion：4種＋Exitに限定、token化、無限ループ0。
8 Brand：本は編集原理としてのみ。操作＝時間移動。
9 Mobile/A11y：縦1gesture、44px以上、keyboard/reduced-motion。
10 Ending：現実の公式Actionが最終node。
