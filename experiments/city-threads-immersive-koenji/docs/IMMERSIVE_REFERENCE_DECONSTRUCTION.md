# City Threads Immersive — Phase 1｜Reference Deconstruction

STATUS: 文書のみ。コード変更なし。Phase 3（実装）は Founder GO まで着手しない。
作成日：2026-09-02　場所：`experiments/city-threads-immersive-koenji/docs/`（`.vercelignore` の `docs/` パターンで配信対象外）

## 0｜到達状況と情報の等級

この作業環境は外部ドメインへの直接アクセスが遮断されている（6サイトすべて EGRESS_BLOCKED）。したがって本文書は、

- **FACT**：公式サイト・制作会社のcase study・受賞機関・報道が検索インデックス経由で返した記述（URLを併記）
- **INFERENCE**：FACTと私の既知の知識から導いた推定。画面を直接操作して確認したものではない

を明示して分ける。**pixel単位のUIを見たかのような断定はしない。** 6サイトの visual / assets / motion signature / copy / composition はコピーしない。借りるのは Interaction Pattern と Design Principle だけ。

| Site | 到達 | 主なFactの出典 |
|---|---|---|
| 1 NASA Eyes on the Solar System | 未到達 | jpl.nasa.gov / science.nasa.gov/eyes / Wikipedia |
| 2 Active Theory /work | 未到達 | Webby Awards, FWA Insights v4, Active Theory Medium (Hydra), webgpu.com showcase |
| 3 Organimo | 未到達 | Awwwards SOTD / inspiration, CSSDA, Codrops「Inside Unseen Studio」 |
| 4 Magische Spiegelungen | 未到達 | smb.museum, blog.smb.museum, about.fb.com, makemepulse case study, Vodafone featured |
| 5 サントリー天然水 ENDLESS DAWN | 未到達 | suntory.co.jp, PR TIMES, 電通クリエーティブX / Think & Craft / tsuzuku works, MoguLive |
| 6 mofu-dev.com | 未到達 | mofu-dev.com/en（検索インデックス経由の自己記述） |

---

## 1｜6サイトの分解（15観点）

### 1. NASA Eyes on the Solar System

| 観点 | 内容 |
|---|---|
| 1 Primary Interaction | **FACT**：ブラウザ内の3Dシミュレーションで、惑星・衛星・探査機を選び、時間を操作して太陽系を探索する。150以上のNASAミッションを追える。 |
| 2 Input | **FACT**：マウス／キーボード、モバイルは指のドラッグとピンチズーム。**INFERENCE**：対象をクリック＝カメラがその対象へ向かい追従する。 |
| 3 Camera behavior | **FACT**：遠景から接写、探査機に「乗る」視点まで切り替わる。**INFERENCE**：対象中心のorbit + フォーカス移動。移動中も空間が途切れない。 |
| 4 Spatial model | **FACT**：実データに基づく太陽系。**INFERENCE**：一つの連続した世界座標系。ページ遷移ではなく同一空間内の移動。 |
| 5 Time model | **FACT**：1950〜2050年を早送り・巻き戻し、再生速度を変更できる。過去・未来のミッションを含む。 |
| 6 Narrative method | **FACT**：ミッション単位で「始まりから終わりまで」追える。**INFERENCE**：時間軸そのものが物語。編集された導線（ミッション選択）と自由探索の併存。 |
| 7 Feedback | **INFERENCE**：時刻表示・軌道・ラベルが操作に即応。時間を動かすと全天体が同時に動く＝「世界が動いた」と分かる。 |
| 8 Sound role | **INFERENCE**：本質ではない（無音でも成立）。 |
| 9 Why immersive | 「時間を握っている」感覚。ユーザーの操作が世界の状態（時刻）を直接変え、その帰結が空間全体に現れる。データが本物であることが没入の根拠。 |
| 10 What NOT to copy | 宇宙／地球儀のmetaphor、HUD的な科学UI、情報密度、暗背景＝没入という等式。 |
| 11 City Threadsへ転用可能なprinciple | **P1 時間は「状態」であり、ユーザーが直接操作できる。** スクロール／ボタンが「年」を変え、その帰結が画面全体（資料の層・地名・進捗）に一斉に現れる。**P2 対象へ近づく＝詳しく見る。** カメラ移動は演出でなく「資料への接近」。 |
| 12 Asset requirements | City Threadsでは天体textureに相当するのが「実在資料のスキャン」。資料が無ければ層は文字だけになる。 |
| 13 Performance risk | 常時render loop。City Threadsでは不採用（idle時に描画しない）。 |
| 14 Mobile risk | 密なUIは390pxでは破綻しやすい。時間操作は「ボタン＋縦スクロール」に単純化する。 |
| 15 Accessibility risk | 3D空間はスクリーンリーダー・キーボードに弱い。DOMテキストを正とし、3Dは装飾層に留める。 |

### 2. Active Theory — /work

| 観点 | 内容 |
|---|---|
| 1 Primary Interaction | **FACT**：WebGLで構築されたportfolio。自社エンジン Hydra 上で、LA／Amsterdamのオフィスに着想した没入3D環境、リアルタイム粒子、AIチャットによるナビゲーション、画面上下から伸びる色付きチューブ（マウス／タッチ由来）が他の閲覧者とネットワーク同期される（Webby「Crafted with Code」、FWA Insights v4）。 |
| 2 Input | **FACT**：マウス／タッチ、AIチャット。**INFERENCE**：/work はスクロールで作品一覧を辿り、選択で作品へ遷移する。 |
| 3 Camera behavior | **INFERENCE**：ページ遷移でも同一シーンが連続し、遷移＝カメラ／マテリアルの変化として表現される。 |
| 4 Spatial model | **FACT**：オフィス空間に着想した3D環境。**INFERENCE**：作品一覧と作品詳細が同じシーンの別状態。 |
| 5 Time model | なし（時間は主題でない）。 |
| 6 Narrative method | スタジオの「作る場所」を空間化して見せるという自己紹介。 |
| 7 Feedback | **FACT**：入力に応じて常に何かが応答する（チューブ、粒子）。他者の存在も可視化される。 |
| 8 Sound role | **INFERENCE**：補助。 |
| 9 Why immersive | 「死んだ入力がない」。どの操作も1フレーム以内に世界が応え、遷移で世界が途切れない。性能（Hydra：GPUスループット最大化・CPU削減）が没入の土台。 |
| 10 What NOT to copy | ネオン、異星風フォント、AIチャット、カーソルチューブ、粒子、スタジオ自己表現としての空間。 |
| 11 転用可能なprinciple | **P3 すべての入力に即応する（0.5秒以内・1フレームが理想）。P4 遷移で世界を途切れさせない（同一シーン内の状態変化）。P5 性能設計を先に決める（描画予算・DPR・idle停止）。** |
| 12 Asset requirements | 3Dシーン一式（City Threadsでは不要）。 |
| 13 Performance risk | 高。自社エンジン前提の設計を素朴に真似ると mobile で破綻する。 |
| 14 Mobile risk | Hydraはmobileを前提に最適化されているが、同等の投資は不可能。DOM主体で「即応」だけを借りる。 |
| 15 Accessibility risk | 3D環境ナビゲーションは非視覚ユーザーに不利。AIチャットは代替導線にならない。 |

### 3. Organimo（Unseen Studio）

| 観点 | 内容 |
|---|---|
| 1 Primary Interaction | **FACT**：Sea mossサプリの製品サイト。「surreal world of wellness」。WebGL・scroll・3D・animation で構成されたスクロール駆動の3D体験（Awwwards SOTD / inspiration「Surreal WebGL Scroll Experience」「Product Page Scroll」、CSSDA）。 |
| 2 Input | **FACT**：スクロール主体。**INFERENCE**：マウス位置による微小な反応。 |
| 3 Camera behavior | **INFERENCE**：スクロール量がカメラ進行と3D形状の変形を駆動する。章ごとに止まり、製品情報がDOMで重なる。 |
| 4 Spatial model | **INFERENCE**：一つの連続した有機的空間を製品の効能（肌・免疫・呼吸…）ごとに通過する。 |
| 5 Time model | スクロール進行＝体験の時間。年代ではない。 |
| 6 Narrative method | **FACT**：Unseenは物語性と、環境音から3Dオブジェクトと同期した効果音まで「丁寧に作られた音」を特徴とし、hover・スクロール反応・遷移・easing／velocityカーブの微調整に注力する（Codrops 2026-07、Chipsa）。 |
| 7 Feedback | **INFERENCE**：ホイール1刻みごとに形が動く。止まると形が「落ち着く」。 |
| 8 Sound role | **FACT**：状態と同期した音（opt-in想定）。 |
| 9 Why immersive | スクロールが「進む」ではなく「変形させる」操作になっている。一つの物体が章をまたいで変わり続けることで、断片ではなく一つの世界として記憶される。 |
| 10 What NOT to copy | 有機的シュルレアリスム、製品ヒーロー3D、光沢マテリアル、ポストプロセス遷移、製品サイトのCTA構造。 |
| 11 転用可能なprinciple | **P6 スクロールをマスタークロックにし、章の「止まり所」を設計する。P7 多数のカードではなく「一つの層が変わり続ける」構図。P8 音は状態と同期させ、必ずopt-in。** |
| 12 Asset requirements | 3Dモデル／シェーダ（City Threadsでは不要。代わりに実資料のスキャン）。 |
| 13 Performance risk | 高（大規模3D＋ポストプロセス）。 |
| 14 Mobile risk | スクロール駆動3Dは低性能端末で入力遅延が出る。scroll hijackになりやすい。 |
| 15 Accessibility risk | 情報がアニメーションに埋まる。reduced-motion時の読める代替が必要。 |

### 4. Magische Spiegelungen（Alte Nationalgalerie × Meta × makemepulse）

| 観点 | 内容 |
|---|---|
| 1 Primary Interaction | **FACT**：画家 Johann Erdmann Hummel（1786–1822）の特別展の伴走プロジェクト。ブラウザで動く（インストール不要）VR／PC／スマホ対応の仮想ギャラリーで、選ばれた作品（Vodafone記事では7点）を辿り、最後に《Granitschale im Berliner Lustgarten》（1831）が没入型3Dとして再構築され、新しい角度から見て写真を撮り共有できる（smb.museum, blog.smb.museum, about.fb.com, Vodafone）。 |
| 2 Input | **FACT**：VRコントローラ／マウス／タッチ。**INFERENCE**：ギャラリーはスクロールまたは順送りで進む。 |
| 3 Camera behavior | **FACT**：絵画へ近づき、最後の一枚では「中へ入って」歩き回れる。 |
| 4 Spatial model | 仮想ギャラリー（線形）→ 一枚の絵画の内部（自由視点）。 |
| 5 Time model | 1831年のベルリン Lustgarten という「一つの時点」に入る。 |
| 6 Narrative method | **FACT**：作品を順に見せ、最後に主要作へ導く有限の導線。 |
| 7 Feedback | **INFERENCE**：近づくと解説が現れる。中に入ると視点移動に応じて反射（御影石の鉢）が変わる＝作家の主題（光学的反射）が操作で体感できる。 |
| 8 Sound role | **INFERENCE**：補助。 |
| 9 Why immersive | **2Dの資料が3Dの場所になる**。かつ、その3D化は作家の主題（反射・空間構成）を説明する。Effect = Meaning の好例。終点が一つの作品であること。 |
| 10 What NOT to copy | VR、美術館ギャラリーのスキュー、写真共有、絵画そのものの3D化（City Threadsに絵画はない）。 |
| 11 転用可能なprinciple | **P9 「資料の中に入る」＝一つの一次資料だけに奥行きを与える（全部を3Dにしない）。P10 有限の線形導線で、終点を一つの対象（City Threadsでは現実の場所・公式Action）にする。** |
| 12 Asset requirements | 高解像度スキャンと権利。City Threadsでは振興協会のポスター・創成期写真の許諾が前提。 |
| 13 Performance risk | 3D再構築は重い。1点だけに限定すれば制御可能。 |
| 14 Mobile risk | スマホ対応済み（FACT）。ただし操作は簡素化されているはず。 |
| 15 Accessibility risk | VR前提。テキスト解説の代替が必要。 |

### 5. サントリー天然水「ENDLESS DAWN そしてまた、朝が来る。」

| 観点 | 内容 |
|---|---|
| 1 Primary Interaction | **FACT**：2022-07-29公開。北アルプス（天然水の第4の水源）を1万枚以上の空撮写真からフォトグラメトリで丸ごと3Dモデル化し、Houdini / 3ds Max / Unreal Engine で再構築。リアルタイムレンダリングとプリレンダー映像を組み合わせてブラウザ表示（PR TIMES, MoguLive, 電通クリエーティブX, Think & Craft, tsuzuku）。 |
| 2 Input | **INFERENCE**：スクロール／タップで場面を進める。自由視点ではなく編集されたカメラパス。 |
| 3 Camera behavior | **FACT**：氷河の割れ目を見つけて雪と氷の層を突き進む、海上の気嵐の中を動くなど、3Dデータ上の仮想撮影だからできるダイナミックなカメラワーク。 |
| 4 Spatial model | 実在の山岳の3D再現（架空ではない）。 |
| 5 Time model | **INFERENCE**：夜明けから夜明けへ（「そしてまた、朝が来る」）。雪と氷の「層」は積もった時間そのもの。 |
| 6 Narrative method | ブランドの水源を「時間をかけて育まれた水」として語る一本道。 |
| 7 Feedback | **INFERENCE**：場面転換の応答。操作の自由度は低い。 |
| 8 Sound role | **INFERENCE**：音楽・環境音あり（映像的）。 |
| 9 Why immersive | **実在の場所の実データ**であること、時間の層（雪・氷）を物理的にくぐる映像、夜明けの反復という時間構造。豪華さより「本物の場所」が効いている。 |
| 10 What NOT to copy | シネマティックな飛行、プリレンダー映像主体の受動性、ブランドコピー、ローディング演出。 |
| 11 転用可能なprinciple | **P11 架空の街を作らない。実在の資料・場所のデータだけを空間化する。P12 「時間の層をくぐる」を文字通り実装する（資料の層を通過＝年代が変わる）。P13 mobile性能戦略としてのプリレンダー（映像・静止画）とリアルタイムの併用。** |
| 12 Asset requirements | フォトグラメトリ級は不要。City Threadsでは実資料スキャン＋現在地写真。 |
| 13 Performance risk | 映像重量。段階ロードが必須。 |
| 14 Mobile risk | 映像主体はmobileで動くが、通信量が大きい。 |
| 15 Accessibility risk | 映像に字幕・代替テキスト、reduced-motionで静止画差し替え。 |

### 6. mofu-dev.com（mofu / Misaki Nakano）

| 観点 | 内容 |
|---|---|
| 1 Primary Interaction | **FACT**：generative artist / programmer の Misaki Nakano が設立した mofu のサイト。スクロールに応じて背景が変わり自然を表し、液体シミュレーション効果を持つ。生成アートNFTの紹介（mofu-dev.com/en 自己記述）。 |
| 2 Input | **INFERENCE**：ポインタ／タッチで液体が動く。スクロールで色や状態が変わる。 |
| 3 Camera behavior | なし（2Dシェーダ面）。 |
| 4 Spatial model | 画面全体が一枚の素材面。 |
| 5 Time model | スクロール＝自然（季節・時間帯）の状態変化。 |
| 6 Narrative method | 作家性の提示。説明より触感。 |
| 7 Feedback | **INFERENCE**：触った場所が即座に揺れる（tactile causality）。 |
| 8 Sound role | **INFERENCE**：なし／補助。 |
| 9 Why immersive | 常に「触れる素材」がある。入力→材質の応答が連続的で、スクロールがページ送りではなく「ダイヤル」になる。 |
| 10 What NOT to copy | 流体シミュレーション、生成アートの美学、NFT文脈、全面シェーダ背景。 |
| 11 転用可能なprinciple | **P14 触れる素材が一つ常にある（City Threadsでは「痕跡」）。P15 スクロールは状態ダイヤル：連続量（年）に写像する。** |
| 12 Asset requirements | 手続き生成（資産不要）。City Threadsでは資料が素材になる。 |
| 13 Performance risk | フラグメントシェーダのフィルレート。mobileではDPR clamp必須。 |
| 14 Mobile risk | 液体シミュはmobile GPUで熱・電池を消費。 |
| 15 Accessibility risk | 純視覚。意味はテキストで担保する必要。 |

---

## 2｜横断比較

| | NASA Eyes | Active Theory | Organimo | Magische Spiegelungen | ENDLESS DAWN | mofu |
|---|---|---|---|---|---|---|
| 操作の動詞 | 時間を動かす／対象へ行く | 触れる・辿る | 変形させながら進む | 近づく・中へ入る | 場面を進める | 触れる・ダイヤルを回す |
| 空間 | 連続する実データ空間 | 一つの3Dシーン | 一つの有機空間 | 線形ギャラリー→一枚の中 | 実在山岳の再現 | 一枚の素材面 |
| 時間 | 主題（1950–2050） | なし | スクロール進行 | 一時点へ入る | 夜明けの反復・層 | 状態変化 |
| 没入の根拠 | 実データ＋時間操作 | 即応＋連続性 | 変形の連続 | 資料の中に入る | 実在の場所 | 触感 |
| City Threadsで借りる | P1 P2 | P3 P4 P5 | P6 P7 P8 | P9 P10 | P11 P12 P13 | P14 P15 |
| 借りない | 宇宙／HUD | ネオン／粒子／チャット | 有機3D／製品CTA | VR／絵画3D | 映像飛行 | 流体／生成美学 |

## 3｜City Threads Immersive の原則（借用の翻訳表）

| # | 原則 | City Threads での具体形 | Effect = Meaning の答え |
|---|---|---|---|
| P1 | 時間は操作できる状態 | 年は錨（anchor）に常時表示。スクロール／ボタン／キーが年を変える | 「時間を動かした」と分かる |
| P2 | 近づく＝詳しく見る | 資料をタップするとカメラ（またはCSS 3D）がその一枚へ寄り、DOMのcaption・出典が前面に来る | 拡大ではなく「資料の検分」 |
| P3 | 死んだ入力を作らない | pointerdown で即応（150ms以内）。hover非依存 | 触れる場所が分かる |
| P4 | 遷移で世界を途切れさせない | 節目間はページ遷移ではなく同じ空間内の移動 | 「同じ街の別の時間」 |
| P5 | 性能予算を先に決める | 後述の Performance Budget。idle時にrender loopなし | 没入より応答性 |
| P6 | スクロール＝マスタークロック、止まり所あり | 節目でスナップせず「読むmode」に落ち着く（v0.9の settle） | 読むために止まれる |
| P7 | 一つの層が変わり続ける | 「資料の層」が一枚ずつ奥から手前へ来る。カード群にしない | 層＝積もった時間 |
| P8 | 音は状態同期・opt-in | Phase 3では音なし。将来、鳴り物の許諾音源をopt-inで | 音なしで成立 |
| P9 | 資料の中に入るのは一枚だけ | 奥行きを与えるのは各節目1点（主資料）。他はDOM | 全部3Dにしない |
| P10 | 有限で、終点は一つ | 5節目→現在→公式Action | 「この先は街にある」 |
| P11 | 架空の街を作らない | 実資料・現在地写真・地図（権利確認済）のみ | 本物だから信じられる |
| P12 | 時間の層をくぐる | 資料の面を通過すると年が変わる（TIME_SHIFT） | 通過＝年代移動 |
| P13 | mobile性能戦略 | 静止画（AVIF/WebP）主体、動画は使わない。WebGLは条件付き | 390pxで壊れない |
| P14 | 触れる素材が常にある | 第一画面の痕跡、各節目の主資料 | 5秒で「触れそう」 |
| P15 | スクロールは状態ダイヤル | scroll progress → 年（連続量）→ 層の深度 | 移動そのものが年代移動 |

## 4｜Repo Audit（読み取り専用、2026-09-02）

| 項目 | 事実 |
|---|---|
| Framework | なし。静的 HTML / CSS / JS（`package.json` は name/version のみ、依存0、buildスクリプトなし） |
| Build system | なし。ファイルをそのまま配信 |
| Deployment | Vercel 静的配信。`vercel.json` はヘッダのみ（CSP / HSTS / X-Frame-Options / Permissions-Policy）。`.vercelignore` で内部ファイルを個別除外 |
| CSP | `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com`。**外部CDNのJSは読めない → Three.js等は self-host 必須**。`img-src 'self' data: https:`、`font-src` は self + Google Fonts、`connect-src` は GA系＋googleapis＋itunes のみ |
| Bundle size（Production runtime） | index.html 11.9KB / shelf.html 8.1KB / suggest.html 10.1KB / release.js 39.8KB / release_content.js 35.1KB / analytics-v3.js 4.5KB（合計 ≈ 110KB、非圧縮） |
| Asset pipeline | 手作業。`assets/` 7.7MB（jpg / webp / png）。Wikimedia Commons 由来画像は `CITY_MEDIA_ATTRIBUTION.md` で帰属管理。AI生成イラストは `AI_CITY_ILLUSTRATIONS.md` |
| Responsive architecture | 単一CSS + media query（`release.css`）。v0.9 prototype は `min(1120px, 100% - 48px)` の1カラム／2カラム切替、390/430/768/1440 で QA 済 |
| Prototype群 | `v3-prototype/`（65MB、tokyo-pilot-01 を含む）、`visual-refit-v2-prototype/`（888KB）、`city-threads-prototype/v0.9/`（2.7MB、うち QA 証跡 2.6MB） |
| QA | Playwright（`/opt/node22/lib/node_modules`）。ローカル静的サーバで実行。外部通信0を検査 |
| GA4 | `analytics-v3.js`（root runtime のみ）。prototype には未接続 |
| 結論 | 既存frameworkを変える理由はない。Immersive prototype も **静的 HTML + CSS + ES modules** で作り、WebGL を使う場合は Three.js を `experiments/.../vendor/` に self-host する（CSP準拠）。build 導入は不要 |
