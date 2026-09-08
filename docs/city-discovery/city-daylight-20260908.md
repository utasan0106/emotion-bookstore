# 街の明るさ・表紙・天気操作 — 2026-09-08

## 今回の判断
目的は「作品との出会いから街へ出たくなる文化案内」。街・作品・今の催しの関係を保つ。大規模な3D空間を主役にする段階ではない。
最新の共有画像は、明るい色、人の自然な動き、街の発見、現実に混ざるイラストの遊びを参考にする。広告素材や他社ロゴ自体は掲載しない。
表紙の一般人物はマナではない。マナを登場させるのは街のライブ映像内が基本という方針は維持する。

## 実装
- HOMEの文字だけのブランド表示を、既存の正式なマーク・和文・英文のロゴへ復元。明るい背景で読める単色表示。
- HOMEに街歩き、本、音楽、映画がつながるオリジナル表紙を追加。特定の街を代表扱いせず、イメージイラストと明記。実景の4街選択は次のセクション。
- 見出しに文字サイズの強弱、差し色、余白を設ける。主ボタン「作品を探す」は一つ。
- 街の写真への黒い幕を外し、写真と説明欄を分離。HOME、街の棚、作品一覧・詳細、文化イベントの配色を明るい紙と濃い文字に調整。
- 天気に「閉じる ×」「天気を表示」を追加。詳細を開くと「詳細を閉じる」と表示。閉じた間は定期更新・色合い変更を停止し、操作後のフォーカスを移す。ページ内のみの設定。
- 同一オリジンの天気取得は既存のPreviewセッションを使う。旧credentials: omitが保護されたPreviewの認証情報を落としていた可能性への対応であり、スクリーンショットの取得失敗の原因を断定しない。
- 文化イベントの中身と週・街・同行者フィルターは変更しない。

## 検証と限界
- 天気の閉じる・再表示、取得中に閉じた場合の遅延応答、非表示中の更新停止、フォーカス、日付跨ぎ、期限切れ、障害時表示を自動検証。
- 気象庁データ処理の17項目、HOMEの導線、文化イベント24件の週・終了日・キャンセル・戻り導線の既存検証を使用。
- ローカルのブラウザーでHOMEの320/390/1280幅、神保町の本一覧の320幅、PCで高円寺の街と催しを確認。全ページ・全幅の総当たりやiPhone実機検証とは区別する。
- 天気の実データ取得はローカル確認では「取得できません」。数値の捏造・静的代用はしない。共有Vercel Previewの実データ取得は更新後に確認が必要。
- 今回の表紙は静止画。人物が動く動画が完成したとは報告しない。

## 表紙を短いCMにする次工程（未制作）
生成能力を検索し、画像から動画を作れるRunwayを確認。未接続のため接続候補を提示済み。接続後に残高・使用条件を確認し、追加課金や契約を勝手にしない。
10秒程度のワンカット。0〜3秒：友人たちが自然に1〜2歩進み、軽く顔を見合わせる。3〜7秒：髪・シャツ・木の葉がそよぎ、本の庇のページが少し揺れる。7〜10秒：街の奥へ視線を誘い、自然な姿勢で収める。
顔・手・足・服・街の構造は参照画から維持。笑顔を誇張せず、人物を踊らせない。画像全体の拡大縮小のみで完成としない。
サイト上は無音・インライン表示、明示的な停止/再開、画面外と別タブで停止。動きを減らす設定では静止画を初期表示する。音声の自動再生はしない。
動画が読めないときは今の表紙を表示。文字・ロゴ・操作は映像に焼き込まずHTMLに残す。実データの動画ができてから再生制御を実装・検証し、空のプレイヤーや偽の再生ボタンは公開しない。
配信用目安：H.264 MP4、24fps、最大1280px程度、4MB以内を目指す。GIFは使わない。
受入条件：歩き・髪・服の動きが見える、顔や手足の破綻がない、文字が読める、開始/停止/復帰が機能する、iOS/Androidで確認できる。条件未達なら公開を保留。

## 共有資料をどう使うか
- PLATEAU「大学生が3D都市モデルで生みだした13のアイデア」（2025-10-22）：具体的な利用場面から体験を考える点を採用。大学生のアイデア紹介であり、実装効果の証明として扱わない。
  https://www.mlit.go.jp/plateau/journal/j094/
- LIFE LAND SHIBUYA「ワンダーハロウィンキャッスル」制作インタビュー：世界観の統一と試して改善する工程を採用。地図やアート素材を転載せず、ゲームの目的を本サイトへ持ち込まない。
  https://www.life-land-shibuya.com/article/whc
- 東急の過去渋谷マップ発表：場所の記憶を資料・写真・音で伝える点を採用。街全体の3D再現は後回し。公開予定の発表と実際の動作確認を区別する。PR TIMESは同じ発表の配信であり、独立した別証拠ではない。
  https://www.tokyu.co.jp/company/news/detail/60781.html
  https://prtimes.jp/main/html/rd/p/000001302.000010686.html
- ファミ通『8番出口』（2026-09-07）：分かりやすい一つの行動と、日常風景への気づきが体験になる点を参考にする。広告掲出の場所を作品の舞台と扱わず、ホラー・迷路の仕組みは導入しない。
  https://www.famitsu.com/article/202609/86932

## マナの追加参考（2026-09-08 追記）
ユーザーから田牧そらさん・武田玲奈さんも雰囲気の参考に追加する指示。田牧さんは共有先の公式表記を使用する。
制作上の方向：自然な笑顔、目元の柔らかさ、軽やかな表情を、従来の平面的な2Dイラストへ取り入れる。本人と特定されないオリジナルキャラクターという既存条件を維持。今回の表紙の人物をマナに変更せず、マナの新しい造形や歩行動画は未完成として引き継ぐ。
公式参考：https://www.tristone.co.jp/artists/sora-tamaki/ 、https://trustar.co.jp/talents/rena-takeda/

## 表紙素材と制作プロンプト
配信ファイル：assets/home-culture-walk-20260908.webp（1448×1086、405,074 bytes）
制作：内蔵画像生成。原画をWebPへ圧縮。原画の人物・背景・構図は変更しない。
最終プロンプト：
Use case: illustration-story. Asset type: polished original hero illustration for a Japanese culture discovery website, Emotion Bookstore. Create a landscape 4:3 editorial illustration that makes someone spontaneously want to go for a walk and discover culture. A coherent lively human-scale Tokyo side street in warm daylight, viewed at pedestrian height with a gentle diagonal receding perspective. Two or three casually dressed young adult friends walking with animated, natural gestures, one carrying a book, one with headphones; a small bookshop, an intimate music venue and a tiny cinema are glimpsed along the same street. Make a few cultural motifs (an open book's pages, a vinyl record, a simple strip of film) subtly flow into awnings and street shapes, like reality opening into imagination, not a collage of unrelated icons. Hand painted flat gouache and fine ink, sophisticated Japanese magazine and travel-poster quality, slight paper texture, crisp thoughtfully edited shapes. Off-white cream base, luminous sky and teal blue, restrained coral orange and butter yellow accents, dark navy fine details. Happy anticipation, friendly everyday warmth, visual movement and space to breathe, not childish, no 3D rendering, no generic AI glowing effects. Composition fills a single frame with an inviting walking route and people large enough to read at mobile size; keep complexity low. This is a fictional shared cultural street, not a named real Tokyo location. No landmarks or particular store advertising, no commercial logos, no mascots, no text or lettering, no border, no UI, no watermark. It should sit beautifully next to Japanese serif headline on a warm ivory website.

動画用プロンプト（接続後の初稿）：
Animate the supplied original illustration into a refined ten-second hand-painted Japanese culture-film shot. Preserve the identities, faces, clothing, number of people, gouache texture, shop geometry, palette and illustrated appearance exactly. The three friends take one or two natural walking steps and briefly turn toward each other with warm subtle smiles. Their hair and loose clothing move gently in a light breeze, nearby leaves sway, and the oversized book-page awning softly flutters. Maintain believable feet contact and natural hand anatomy. A very slow forward camera drift supports the street's depth but must not substitute for actual character motion. No new characters, logos, text, scene cuts, 3D look, exaggerated acting, morphing buildings or floating limbs. Quiet cheerful anticipation. Silent. End in a stable natural pose; do not fake a seamless loop if the walking cannot reconnect.
