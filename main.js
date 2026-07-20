/* ============================================================
 * main.js — 対話ロジック・IndexedDB・番台制御など
 * 「みんなの感情書店」のロジック本体です。
 * data.js（BOOK_POOL, CATEGORIES, CHAT_TREE などのデータ）を
 * 先に読み込んだ後にこのファイルを読み込んでください。
 * <script src="data.js"></script>
 * <script src="main.js"></script>
 * ============================================================ */

/* ============================================================
 * ★追加：日本語 / English 切り替え（i18n）
 * ここでは「画面まわりの静的UI文言」（ナビゲーション・ボタン・フォーム・
 * フッター・各種オーバーレイなど）をすべて英訳して切り替えられるようにしています。
 * 一方で、棚の名言・店主の会話（CHAT_TREE / KEYWORD_BANK / COUNSELING_MESSAGES）・
 * おすすめ本や音楽・エピソードなど「data.js の膨大なコンテンツ本文」は、
 * 日本語の文章に深く組み込まれた表現が数千行規模であるため、今回のスコープでは
 * 意図的に対象外とし、言語を切り替えても日本語のまま表示されます
 * （中途半端な単語だけの差し替えでは不自然な文になってしまうための判断です）。
 * ============================================================ */
const LANG_STORAGE_KEY = 'emotion-bookstore-lang';
let appLang = 'ja';

function currentLang(){ return appLang; }

const MESSAGES = {
  ja: {
    shopName: "みんなの感情書店",
    tagline: "今の気持ちを、一冊の本に。",
    subTagline: "誰にも話せない気持ちを、静かに書き残せる場所です。",
    accordionSummary: "気持ちを書き、一冊の本として端末内の本棚へ。<br>登録不要。棚を選ぶかどうかも、あなたが決められます。",
    accordionOpenLabel: "はじめての方へ",
    accordionCloseLabel: "閉じる",
    accordionTitle: "みんなの感情書店とは",
    accordionP1: "誰にも話せない気持ちを、静かに書き、一冊の本として残せるデジタル書店です。<br>書いた内容は原則としてこの端末内だけに保存され、本文をAIで分析・診断しません。",
    accordionP2: "製本したあとは、21種類の感情棚から選んでしまうことも、棚を選ばず本棚へ戻ることもできます。", // ★Hotfix1：本・音楽の説明は製本後のサプライズとして執筆前から削除
    introKicker: "この書店でできること<br>— 好きな場所から、自由に巡れます",
    introTitle1: "店主に話す", introText1: "今の気持ちを、選択肢か自由な言葉で伝えます。",
    introTitle2: "棚を巡る", introText2: "21種類の感情の棚を、自由に巡ります。", // ★Hotfix1-1追加修正：本・音楽の予告を#shopGuideからも削除（サプライズ維持）
    introTitle3: "物語を綴る", introText3: "自分の体験を書き、一冊の本として製本します。棚を選ぶのは、そのあとです。",
    introTitle4: "本棚が育つ", introText4: "綴った物語が積み重なり、自分だけの本棚に。",
    enterBtn: "扉をひらく →",
    motionToggleOn: "演出：入", motionToggleOff: "演出：切",
    motionToggleTitle: "演出アニメーションの入/切",
    // ★Hotfix4追加：英語モードでも日本語のまま残っていた4箇所（既知課題）の翻訳キー。
    langToggleTitle: "言語切り替え / Language",
    // ★2026-07-18追加：任意設定の天気連動機能（店内メニュー）。
    weatherToggleTitle: "店外の天気を反映する",
    weatherToggleOn: "天気連動：入", weatherToggleOff: "天気連動：切",
    weatherRegionLabel: "地域の設定",
    weatherRegionSelectPlaceholder: "主要地域から選ぶ",
    weatherUseLocationBtn: "現在地から設定",
    weatherNearCurrentLocation: "現在地周辺",
    weatherStatusOff: "天気連動は現在オフです。",
    weatherStatusNoRegion: "地域を設定すると、店外の天気が反映されます。",
    weatherStatusUsingRegion: "反映中：{label}",
    weatherStatusLocating: "現在地を取得しています…",
    weatherStatusLocationFail: "現在地を取得できませんでした。書店は通常どおりご利用いただけます。主要地域から選ぶこともできます。",
    weatherStatusFetchFail: "天気情報を取得できませんでした。通常の表示に戻します。",
    weatherPrivacyNote: "※天気連動をオンにすると、選択した地域、または現在地から概算した緯度・経度だけが、天気情報の取得のためだけにOpen-Meteo（外部の天気情報サービス）へ送信されます。書いた文章・タイトル・写真・本棚のデータが送信されることはありません。なお、外部サービスへの通信時には、IPアドレスなど通信にともなう技術的な情報が送信先へ伝わる場合があります。",
    weatherAttribution: "天気データ：<a href=\"https://open-meteo.com/\" target=\"_blank\" rel=\"noopener noreferrer\">Open-Meteo</a>（<a href=\"https://creativecommons.org/licenses/by/4.0/\" target=\"_blank\" rel=\"noopener noreferrer\">CC BY 4.0</a>）",
    weatherDetailRegion: "地域",
    weatherDetailState: "天気",
    weatherDetailUpdated: "最終更新",
    profileBtn: "来店カード", profileBtnTitle: "お名前と属性の設定（任意・この端末にのみ保存）",
    trustBadge1: "登録不要", trustBadge2: "この端末にのみ保存", trustBadge3: "AIの学習には使われません",
    pageNavAria: "ページを選ぶ",
    pageTab1: "① 番台", pageTab2: "② 棚", pageTab3: "③ 編纂机", pageTab4: "④ 本棚",
    sectionHead1: "店主と棚を相談する", sectionSub1: "気持ちに近い棚を、一緒に探します。",
    counterReturnNote: "前に選んだ棚は、そのまま残しています。今の気持ちから、探し直すこともできます。",
    // ★2026-07-18追加：番台への導線（#shelves・#desk）の直前に表示する、小さな呼びかけ。
    preBandaiPromptHeading: "まだ言葉にならない方へ",
    preBandaiPromptDesc: "店主と、しまう棚を相談する",
    // ★v1.3公開前最終修正：番台を「棚の案内」として整理（仕様書3章）。初回・再訪とも同じ文。
    counterGreetingUnified: "こんばんは。まだ名前のつかない気持ちも、そのままで大丈夫です。今は、どんな手触りですか。",
    counterGroupSink: "重く沈む",
    counterGroupWave: "波立つ",
    counterGroupLight: "光が灯る",
    counterGroupSepia: "遠いものを見つめる",
    counterGroupOther: "それ以外",
    // ★Hotfix3新設：moyamoya専用の独立グループ「その他」（「それ以外」＝全部見る導線とは別物）
    counterGroupOtherFeeling: "その他",
    counterBackBtn: "戻る",
    counterShelfGuideNote: "「{shelf}」の棚をご案内します。",
    counterViewShelfBtn: "棚を見る",
    counterWriteWithoutChoosing: "まだ決めずに書く",
    keeperBioSummary: "店主について",
    keeperBioText: "この書店の店主。名前は「まな」と名乗っています。年齢や性別は明かしていません。普段はカウンターの奥で静かに本を読んでおり、お客さんの言葉に耳を傾けるのが仕事です。棚には、まなが長年かけて手帳に書き集めてきた、古今の名言が出典つきで並んでいます。",
    keeperNameLabel: "店主",
    firstGreeting: "こんばんは。静かに開けています。",
    textureStepAria: "今の気持ちに近い選択肢を選ぶ",
    guideLead: "当てはまるものがない場合は、下の枠に言葉を書いて「話す」を押してください",
    freeformHintDesk: "※書いた言葉は、そのまま編纂机の原稿用紙に写しておきます。",
    earlyFreeformHint: "当てはまるものがない場合は、この枠に気持ちを書いて「話す」を押してください。",
    userInputPlaceholder: "例：うまく言えないけど、朝から気持ちが落ち着かない…",
    sendBtn: "話す",
    sectionHead2: "感情の棚", sectionSub2: "棚を選んでも、あてもなく巡っても。",
    swipeHint: "← 左右にスワイプでも棚を移動できます →",
    backToBandai: "⤴ 店主と棚を相談する",
    exitShopBtn: "お店を出る",
    // ★2026-07-18追加：製本後（本棚）だけは番台へ戻らず、感情の棚を巡る導線に変更する。
    bookshelfExploreShelves: "いろいろな棚を巡る",
    // ★2026-07-18追加：表紙の常時表示言語切替（日本語｜English）。言語名そのものなので翻訳しない。
    langLabelJa: "日本語", langLabelEn: "English",
    langToggleAria: "言語を切り替える（日本語／English）",
    // ★2026-07-18追加：「お店を出る」を押したときに一瞬だけ表示するお礼のことば。
    exitFarewellMsg: "ご来店ありがとうございました。また、言葉を置きたくなった夜に。",
    // ★v1.3公開前最終修正：主動線（編纂机→製本→まな受け取り→本棚）だけに頁番号を振り直す。
    // 番台・感情の棚は任意頁のため番号を付けない（仕様書1章）。
    pageLabelCounter: "番台　",
    pageLabelDesk: "第一頁　",
    pageLabelBookshelf: "第四頁　",
    bindPageHeading: "第二頁　製本",
    manaPageHeading: "第三頁　店主まながお預かり",
    // ★v1.3公開前最終修正：棚連動の本・音楽推薦（仕様書2章）
    shelfPickHeading: "この棚を選んだあなたへ",
    shelfPickNote: "「{shelf}」の棚から、店主が一冊と一曲を選びました。",
    shelfPickBookLabel: "本",
    shelfPickMusicLabel: "音楽",
    shelfPickMoreLink: "この棚をもう少し見る",
    // ★v1.3 RC2最終微調整：装丁カードの小さな帯文字（仕様書3章）
    shelfPickJacketBookTag: "選書",
    shelfPickJacketMusicTag: "今夜の一曲",
    // ★v1.3公開前最終修正：本棚到着後の次行動（仕様書6章）
    bookshelfArrivalHeading: "本を棚に置きました。",
    bookshelfArrivalMakeAnother: "もう一冊つくる",
    bookshelfArrivalBackToCover: "表紙へ戻る",
    // ★2026-07-19 feature/first-visit-experience：製本後の余韻（到着パネルの2行）
    arrivalAfterglow1: "今夜の気持ちは、ここに置いていけます。",
    arrivalAfterglow2: "必要になったとき、また開きに来てください。",
    // ★2026-07-19 feature/first-visit-experience：表紙の初回説明とサンプル本
    firstVisitOneLine: "書いた言葉は、この端末にだけ残ります。",
    menuBackToTop: "↑ メニューの上へ戻る",
    fairKicker: "今月のおすすめ棚",
    fairHalfNote: "",
    titleConsultBtn: "店主に題名を相談する",
    titleConsultHeading: "店主の題名帖から",
    titleConsultMore: "別の題名を見る",
    titleConsultHint: "気に入った題名を押すと、そのまま書き直せます。",
    detourHalfFirst: "今月前半",
    detourHalfSecond: "今月後半",
    firstVisitAiLine1: "本をつくるのは、AIではなくあなた自身です。自分の言葉で一冊にして、棚へ置く書店です。",
    firstVisitAiLine2: "文章や写真は外部へ送信されません。診断や感情分析も行いません。",
    samplePeekBtn: "この書店の一冊を、のぞいてみる",
    sampleBookBadge: "これは見本の一冊です。あなたの本棚には追加されません。",
    sampleBookTitle: "雨上がりの帰り道",
    sampleBookStory: "傘を閉じたら、路面の匂いが少しだけ夏に戻っていた。今日うまく言えなかったことを、帰り道の水たまりにひとつずつ落としていく。急がなくていい、と自分に言えたのは久しぶりだった。玄関の灯りが見えたとき、明日はもう少しだけ素直に話してみようと思った。",
    sampleBookNote: "うまく言えなかった日ほど、言葉は静かに育っています。この棚で、ゆっくりどうぞ。",
    sectionHead3: "編纂机",
    sectionSub3: "今の気持ちを、一枚の紙に綴ります。",
    shelfAfterBindingNote: "棚は、製本したあとに選べます。",
    storyInputPlaceholder: "書けるところから、どうぞ。きれいな文章にしなくても、一冊にはできます。",
    assistBtn: "書き出しに迷ったら、店主の助け舟",
    // ★Hotfix2-2：assistBtn押下時に本文欄へ挿入する定型の書き出しテンプレート。
    // 本文解析・外部AI送信は行わない固定文言。appLangに応じてJA/ENを出し分ける。
    assistTemplate: "いつ：\nどこで：\nなにがあった：\nそのとき、胸の中は：\n",
    // ★2026-07-18追加：旧チャットの代わりに編纂机へ表示する、静的な「言葉にするための助け舟」。
    // 本文解析や外部AI送信は行わず、選んだ棚（感情）に応じた固定の問いを提示するだけ。
    writingBoatHeading: "言葉にするための助け舟",
    writingBoatNote: "答えなくても大丈夫です。書き出す手がかりに、どうぞ。",
    storyCountFormat: "{count} / {max}字",
    photoLabel: "今日の一枚を、頁に挟む（任意）",
    photoPreviewAlt: "添付写真のプレビュー",
    photoRemoveAria: "写真を外す",
    photoHint: "写真はこの端末の中だけで、長辺800pxに折りたたんで保管します。サーバーには送信されません。",
    deskExtraSummary: "タイトル・いつの気持ちかを、自分で決める（任意）",
    fieldLabelShelf: "棚", fieldLabelTitle: "背表紙のタイトル", titleInputPlaceholder: "空欄の場合は『まだ、題名のない本』になります",
    fieldLabelWhen: "いつの気持ちですか", whenOptionNow: "今の気持ち", whenOptionPast: "以前のことを振り返って",
    fieldLabelTweet: "関連するXの投稿があれば", tweetInputPlaceholder: "例：https://x.com/username/status/1234567890",
    fieldHint: "「以前のことを振り返って」を選ぶと、過去の気持ちとして本棚に残せます。",
    submitStory: "店主に預けて製本する",
    // ★2026-07-18追加：製本前の確認ダイアログ（棚のご提案）に、原稿へ戻る選択肢を追加。
    curateBackToDraft: "原稿に戻る",
    invSeal: "封", invKicker: "推薦状", invGoShelf: "棚を見てみる", invClose: "しおりに挟む",
    sectionHead4: "あなたの本棚",
    sectionSub4: "製本した物語が背表紙になって並びます。クリックすると、いつでも読み返せます。",
    shelfEmptyMsg: "まだ本がありません。編纂机で最初の一冊を綴ってみましょう。",
    // ★2026-07-18追加：本棚の年月グループ見出し（例：「2026年7月の棚」）。
    shelfMonthUnknown: "日付不明の棚",
    // ★2026-07-18追加：月別タブの「すべて」／「日付不明」（見出しとは別の短い表記）、蔵書冊数表示。
    shelfMonthAllTab: "すべて",
    shelfMonthUnknownShort: "日付不明",
    shelfCountFormat: "蔵書 {count}冊",
    // ★2026-07-18追加：本の詳細画面の日付表示（formatDate）と、振り返り本の注記を英語対応させる。
    modalDeliveredSuffix: "納品",
    modalSealedNote: "｜以前を振り返って綴った一冊",
    recordCornerAria: "店主のレコード棚",
    resetShelf: "本棚をリセットする",
    // ★2026-07-18追加：感情の地図（renderTrend）の期間タブ・要約文・行ツールチップ・冊数表示を
    // 言語対応させる（従来はハードコードされ、英語モードでも日本語のまま表示されていた）。
    trendPeriodMonth: "今月",
    trendPeriodYear: "今年",
    trendPeriodAll: "すべて",
    trendSummaryPeriodMonth: "今月の",
    trendSummaryPeriodYear: "今年の",
    trendSummaryPeriodAll: "いまの",
    trendSummaryTemplate: "{period}あなたの本棚は、「{shelf}」の棚がいちばん厚いようです。",
    trendRowTooltip: "『{shelf}』の棚を見る",
    trendCountUnit: "{n}冊",
    // ★2026-07-18追加：空の背表紙（本棚の「＋次の一冊」）のツールチップ。
    emptySpineTooltip: "まだ中身が書かれていない、空の背表紙。タップすると編纂机へ。",
    trendDetailSummary: "感情の地図を詳しく見る",
    trendNote: "※月次「感情取扱説明書」レポートの簡易デモです。この地図はあなたにだけ見えています。",
    // ★Hotfix4.1：栞が「その日に書いた棚」ではなく「本棚全体でいちばん冊数の多い棚」を
    // 見て綴られることを明示する。悲しみの棚に書いた日に「わくわく」の栞が出る等の違和感を防ぐ。
    shioriCardTitle: "今日の栞", shioriCardNote: "本棚ぜんたいを眺めた店主から、一枚。今日綴った一冊ではなく、いちばん多く並んでいる棚のお話です。",
    shioriLabel: "栞 — 店主より", shioriBtn: "栞を受け取る",
    footerBrand: "『みんなの感情書店』",
    footerNote: "綴った言葉はサーバーには送信されず、この端末にのみ保存されます。",
    // ★Hotfix4追加：フッター注記を指定どおり2行に改行表示するための版（data-i18n-html用）。
    footerNoteHtml: "綴った言葉はサーバーには送信されず、<br>この端末にのみ保存されます。",
    shareBtn: "この書店をシェアする", copyUrlBtn: "URLをコピー", pwaPinBtn: "ホーム画面にピン留め",
    privacyLink: "プライバシーポリシー", termsLink: "利用規約",
    // ★Hotfix4追加：フッター法務行の区切り文字・「専門の相談窓口」リンクの翻訳キー。
    legalSep: "・", supportLinkFooter: "専門の相談窓口",
    shareMenuTitle: "シェアする", shareX: "Xでシェア", shareLine: "LINEでシェア",
    shareNative: "端末の共有機能を使う", shareCopy: "リンクをコピー",
    shareMenuHint: "コピーできない場合は、上の欄をタップして全選択→コピーしてください。",
    closeBtn: "閉じる",
    bindText: "糸をかけています…", bindSkip: "タップで即座に完了",
    purifyOverlayAria: "気持ちを手放す",
    purifyKicker: "手放す — 誰にも見られません。この端末の「手放しの記録」にだけ、そっと残ります",
    purifyInputPlaceholder: "その気持ちを、ここにそのまま書き出してみてください。",
    purifyBtn: "手放す",
    modalPhotoAlt: "この頁に挟まれた写真", modalNoteLabel: "店主のことば",
    modalGoShelf: "この棚をもう一度見る", modalDel: "この本を棚から下げる",
    modalShare: "Xでシェア", modalShareNote: "※本文はそのまま送信されません。投稿画面が開くだけで、実際に投稿するかはあなた次第です。",
    // ★2026-07-18追加：製本後の本の詳細画面から、タイトル・本文を書き直す機能。
    modalEditBtn: "タイトル・本文を書き直す",
    modalEditSave: "書き直しを保存する",
    modalEditCancel: "やめる",
    modalEditStoryEmpty: "本文が空のままでは保存できません。",
    pwaPopupAria: "ホーム画面に追加する案内",
    pwaTitle: "この書店をスマホのホーム画面にピン留めする",
    pwaSteps: "iPhone（Safari）：下の「共有」ボタン →「ホーム画面に追加」<br>Android（Chrome）：右上のメニュー（⋮）→「ホーム画面に追加」",
    pwaNote: "アプリのように、いつでも1タップで扉をひらけるようになります。",
    inAppBrowserWarning: "アプリ内ブラウザで開いています。この環境では<b>記録が保存されない場合があります</b>。Safari や Chrome で開き直すことをおすすめします。",
    fairGoBtn: "棚へ",
    wanderBtn: "気の向くままに巡る",
    shioriChoosingWords: "店主が言葉を選んでいます…",
    bindTextStep2: "表紙を綴じています…",
    draftRestored: "前の頁が、机に残っています。続きからでも、そのまま綴じても。",
    storyTooShort: "まずは、そのときの気持ちを書いてみてください。",
    storyLimitWarning: "本文は{max}字までに収めてください。",
    storyReviewing: "製本の準備をしています…",
    tweetLinkInvalid: "Xの投稿リンクの形式が正しくないようです（例：https://x.com/ユーザー名/status/12345）。",
    // ★Hotfix4-8追加：本の詳細画面に表示する、関連するXの投稿へのリンク文言。
    modalTweetLinkLabel: "関連するXの投稿を見る",
    exportingBtn: "書き出しています…", exportedBtn: "書き出しました ✓", exportFailBtn: "書き出しに失敗しました",
    exportDefaultBtn: "これまでの記録をテキストでダウンロード",
    csvExportDefaultBtn: "これまでの記録をCSVでダウンロード（Excel等で開けます）",
    restoreDefaultBtn: "バックアップから復元する",
    restoreLoadingBtn: "復元しています…", restoreDoneBtn: "復元しました ✓", restoreFailBtn: "復元に失敗しました",
    restoreConfirm: "選択したファイルには{count}冊分の記録が含まれています。\nこの端末の現在のデータを上書きして復元します。\nこの操作は取り消せません。よろしいですか？",
    restoreInvalidFile: "このファイルは『みんなの感情書店』のバックアップ形式ではないようです。別のファイルをお試しください。",
    restoreSuccess: "復元しました。画面を更新します…",
    restoreFail: "復元に失敗しました。ファイルの内容をご確認ください。",
    mitateYesBtn: "聞いてみる", mitateNoBtn: "今はいい",
    loopShelfReferralBtn: "こちらの『{shelf}』の棚が、合うかもしれません。行ってみてください",
    appleMusicNote: "※Apple Musicはアプリが開くだけのことがあります。開いたら曲名で検索し直してください。",
    supportLink: "店主に、差し入れを贈る",
    supportHint: "この書店を気に入っていただけたら、店主へそっと差し入れを。任意です。",
    deskLeadFromCounter: "——ここまでを踏まえて。番台や棚で出会った気持ちを、今度はあなた自身の言葉で綴ってみましょう。",
    writeAtDeskBtn: "この気持ちを書き留める",
    chooseAgainBtn: "また選び直す",
    chooseFromOptionsBtn: "選択肢からも選べます",
    writeAtDeskBtn2: "この気持ちを机で書き留める",
    restartChatBtn: "最初から話し直す",
    loopBrowseShelvesBtn: "感情の棚を眺める",
    loopWriteBookBtn: "机で一冊にする",
    backToTextureBtn: "質感から選び直す",
    syncedToDeskMsg: "番台でお聞きしたお話を、原稿用紙に書き留めておきました。続きをどうぞ、あなたのペースで綴ってください",
    photoLoadFail: "写真を読み込めませんでした。別の写真でお試しください。",
    photoProcessing: "写真を頁へ挟んでいます…",
    photoUnsupportedFormat: "この形式はこのブラウザでは読み込めません。JPEGまたはPNGでお試しください",
    photoProcessFail: "写真の処理に失敗しました。別の写真かサイズでお試しください。",
    ghostNextBook: "＋ 次の一冊",
    backupCreatingBtn: "鍵を作っています…", backupDoneBtn: "鍵を更新しました ✓", backupFailBtn: "鍵の更新に失敗しました",
    backupDefaultBtn: "本棚のデータをバックアップ保存する",
    copyDoneBtn: "コピーしました ✓", copyLinkDefaultBtn: "リンクをコピー", copyManualBtn: "↓の欄からコピーしてください",
    copyUrlDoneBtn: "コピーしました ✓", copyUrlDefaultBtn: "URLをコピー",
    purifyLogBtn: "手放した気持ちの記録を見る",
    favListBtn: "☆ 気になるリストを見る",
    favEmpty: "まだ「気になる」に入れた本・曲はありません。棚のおすすめにある☆ボタンから追加できます。",
    favRemoveBtn: "リストから外す",
    favOverlayTitle: "気になるリスト",
    trendEmptyOwn: "いまのあなたの本棚を、期間を変えて眺められます。",
    aiReferralLead: "もし込み入った専門的な話（法律・医療・技術的な相談など）でしたら、こちらでより詳しく聞けるかもしれません。",
    aiReferralGpt: "ChatGPTに聞いてみる ↗", aiReferralGemini: "Geminiに聞いてみる ↗",
    goToShelfBtn: "『{shelf}』の棚を見てみる",
    dataAboutTitle: "この書店とデータについて",
    dataAboutOpenLabel: "データはどこに保存されるの？",
    dataAboutBody: "「店主」はAIチャットではなく、あらかじめ用意された言葉を状況に応じて返す簡単な仕組みです（特定のAIモデルと会話しているわけではありません）。<br>「物語を綴る」「製本する」で書いた内容は、どこにも公開されず、この端末のブラウザ内（IndexedDB/localStorage）だけに保存されます。外部サーバーへは送信されません。アカウント登録もなく、他の人があなたの記録を見ることはできません。<br>「気持ちを手放す」は、この端末だけに残る「手放しの記録」に静かに移すことで、本棚の一覧からは見えなくなる機能です（完全な削除ではなく、専用の記録欄に移されます）。<br>「みんなの本棚」の「みんな」は他ユーザーとの共有ではなく、あなた自身の本棚が育っていく様子を指す名前です。<br>棚の一部の表示は、季節の言葉と棚の名前だけを検索語として外部の検索サービスに問い合わせて表示しています。この時も、あなたが綴った文章が送信されることはありません。<br>ブラウザのデータを消去するとこの記録も失われるため、「バックアップ保存」から定期的にファイルへ書き出すことをおすすめします。サービスとして終了する場合も、事前にバックアップを取っていただければお手元にデータが残ります。", // ★Hotfix1-1追加修正：本・音楽の予告をデータ保存説明からも削除（外部通信の開示自体は維持）
    keeperNotAiHint: "※AIチャットボットではなく、あらかじめ用意した言葉を返す簡単な仕組みです。会話はモデルに送信されません。",
    submitStoryHint: "※外部には公開されず、この端末のブラウザ内にのみ保存されます。",
    // ★2025-07-17追記（v1.2フィードバック反映）：renderShelfDisplay()内にハードコードしていた
    // 棚見出し・注記・架空author固定ラベル、および製本成功文をMESSAGESへ移設し、t()経由で言語切替に対応させた。
    // ★v1.3公開前最終修正：「掌編」は意味が伝わりにくいため、公開文言を「この書店の短い物語」
    // 「短い物語」へ変更（キー名shelfFictionalLabel等は互換のため維持。仕様書4章）。
    shelfEpisodesHeading: "あなたの本・この書店の短い物語",
    recommendHeadingTpl: "「{shelf}」な今のあなたに、店主が選んだ本",
    recommendSubtext: "読むための本というより、この気持ちのお守りになる一冊です",
    recommendShuffleBtn: "他も見る",
    recommendShuffleTitle: "他のおすすめを見る",
    recommendMoreLinkTpl: "「{shelf}」な気分の本を、いろんな人のおすすめから探す →",
    playlistLabelTpl: "「{shelf}」なプレイリスト — 店主の選曲",
    musicSearchYoutube: "YouTubeでBGMを探す",
    musicSearchAppleMusic: "Apple Musicで探す",
    myStoryLabel: "あなたの物語",
    episodesMoreLabelTpl: "もっと見る（あと{n}件）",
    episodeShuffleBtn: "エピソードも見る",
    purifyTriggerBtn: "この気持ちを手放す",
    purifyLogAriaLabel: "手放した気持ちの記録",
    purifyLogHideBtn: "表示を隠す",
    purifyLogHiddenNote: "表示を隠しました。データは端末にそのまま保存されています。もう一度開くと再表示されます。",
    purifyLogEmptyNote: "まだ、手放した気持ちの記録はありません。",
    detourHeading: "今月の寄り道",
    detourPrNote: "［PR・広告リンクを含みます］",
    detourViewLink: "見てみる →",
    detourNote: "寄り道の品揃えは、棚を巡るたびに入れ替わります。",
    detourLoadingNote: "……季節に合う一冊を探しています",
    detourLiveSourceNote: "［外部の書籍情報サービスから取得］",
    detourLiveBadge: "今月の一冊",
    detourLiveNote: "同じ棚でも3種類をランダムに表示し、月が変わるとまた新しい顔ぶれになります。",
    writeFabLabel: "書く",
    backToTopAria: "ページの先頭へ戻る",
    milestoneFallbackTpl: "{count}冊目です。",
    shareText: "名もなき気持ちに、名前をあげる。「みんなの感情書店」— 感情をラベリングして棚に並べる、体験型のプロトタイプです。",
    favBtnLabelOn: "★ 気になる",
    favBtnLabelOff: "☆ 気になる",
    definitionLabelSep: "の棚",
    fairTitleTpl: "{month}月の店主のおすすめ棚 — 『{shelf}』",
    shelfEpisodesNote: "この書店のために書かれた短い物語です。来店された方の文章ではありません。",
    shelfFictionalLabel: "短い物語",
    // ★v1.3最終統合：製本直後の文言と、次の「まなが預かる」場面の文言が連続して同じ文にならないよう区別。
    bindSuccessMsg: "一冊になりました。",
    // ★v1.3追加（決裁済み文言）：Hero主CTA・本棚管理折りたたみ・店内案内見出し。既存キーの値は変更しない。
    heroCta: "今の気持ちを書く",
    shelfAdminSummary: "本棚の管理",
    shopGuideHeading: "店内案内",
    // ★v1.3最終統合追加：番台の自由入力返答を会話回数だけで3段階に分ける（本文は解析しない）。
    counterFreeReply1: "お話しくださって、ありがとうございます。ここに、いったん置いておきますね。",
    counterFreeReply2: "続きがあれば、そのままどうぞ。ここで閉じても大丈夫です。",
    counterFreeReply3: "ここまでの言葉は、机で一冊にすることも、このまま閉じることもできます。",
    // ★v1.3最終統合追加：「まなが預かる」受け取り場面の文言。
    manaReceiveAriaLabel: "店主まなが、本をお預かりします",
    manaReceiveLine: "お預かりしました。こちらの棚へ納めておきますか。",
    manaReceiveBookFallback: "まだ、題名のない本",
    manaReceiveShelfLabel: "棚を選ぶ（任意）",
    manaReceivePlaceholder: "棚を選んでください",
    manaReceiveConfirm: "この棚にしまう",
    manaReceiveSkip: "今は棚を決めず、本棚へ",
    manaReceiveSaveError: "すみません。保存がうまく完了しませんでした。書いた言葉は消さず、少ししてからもう一度お試しください。",
    manaImageAlt: "",
    // ★v1.3最終統合追加：店内メニュー（4タブの代替導線）の文言。
    // ★v1.3公開前最終修正：三本線だけでは初見で見落とすため、文字でも明示する（仕様書5章）。
    menuOpenAria: "店内メニューを開く",
    menuCloseAria: "店内メニューを閉じる",
    menuNavAria: "メニュー",
    menuTitle: "店内メニュー",
    menuBtnLabelFull: "店内メニュー",
    menuBtnLabelShort: "メニュー",
    menuItemDesk: "今の気持ちを書く",
    menuItemBookshelf: "自分の本棚",
    menuItemCounter: "店主に話す",
    menuItemShelves: "感情の棚を巡る",
    menuItemCover: "表紙へ戻る",
    menuSectionOptional: "任意の場所へ",
    menuSectionSettings: "設定・このお店について"
  },
  en: {
    shopName: "The Bookstore of Feelings",
    tagline: "Turn What You Feel Now into a Book.",
    subTagline: "A quiet place to write what you cannot say aloud.",
    accordionSummary: "Write what you feel and keep it as a book on your device.<br>No account required. Choosing a shelf is optional.",
    accordionOpenLabel: "First time here?",
    accordionCloseLabel: "Close",
    accordionTitle: "About The Bookstore of Feelings",
    accordionP1: "The Bookstore of Feelings is a quiet digital bookstore where you can write what you feel and keep it as a book.<br>Your writing stays on this device and is not analyzed or diagnosed by AI.",
    accordionP2: "After binding, you may place the book on one of 21 feeling shelves or return it to your bookshelf without choosing one.",
    introKicker: "What this bookstore offers<br>— wander freely, starting wherever you like",
    introTitle1: "Talk to the shopkeeper", introText1: "Share how you feel now — pick an option, or write freely.",
    introTitle2: "Browse the shelves", introText2: "Wander through 21 shelves of feelings.", // ★Hotfix1-1追加修正：本・音楽の予告を#shopGuideからも削除（サプライズ維持）
    introTitle3: "Write your story", introText3: "Write your experience and bind it as a book. Choosing a shelf comes afterward.",
    introTitle4: "Watch your shelf grow", introText4: "Every story you write adds up to a bookshelf all your own.",
    enterBtn: "Open the door →",
    motionToggleOn: "Motion: On", motionToggleOff: "Motion: Off",
    motionToggleTitle: "Toggle animation effects on/off",
    langToggleTitle: "Switch language / 言語切り替え",
    // ★2026-07-18追加：任意設定の天気連動機能（店内メニュー）。
    weatherToggleTitle: "Reflect the weather outside the shop",
    weatherToggleOn: "Weather sync: On", weatherToggleOff: "Weather sync: Off",
    weatherRegionLabel: "Region setting",
    weatherRegionSelectPlaceholder: "Choose a major region",
    weatherUseLocationBtn: "Set from current location",
    weatherNearCurrentLocation: "Near your current location",
    weatherStatusOff: "Weather sync is currently off.",
    weatherStatusNoRegion: "Set a region to reflect the weather outside the shop.",
    weatherStatusUsingRegion: "Using: {label}",
    weatherStatusLocating: "Getting your location…",
    weatherStatusLocationFail: "Couldn't get your location. The shop works as usual — you can also choose a major region instead.",
    weatherStatusFetchFail: "Couldn't fetch the weather. Showing the regular view instead.",
    weatherPrivacyNote: "※ Turning on weather sync sends only your selected region, or coordinates approximated from your current location, to Open-Meteo (an external weather service) — solely to fetch the weather. Your written stories, titles, photos, and bookshelf data are never sent. Note that when communicating with an external service, technical information that accompanies any network request — such as your IP address — may be visible to the receiving service.",
    weatherAttribution: "Weather data by <a href=\"https://open-meteo.com/\" target=\"_blank\" rel=\"noopener noreferrer\">Open-Meteo</a> (<a href=\"https://creativecommons.org/licenses/by/4.0/\" target=\"_blank\" rel=\"noopener noreferrer\">CC BY 4.0</a>)",
    weatherDetailRegion: "Region",
    weatherDetailState: "Weather",
    weatherDetailUpdated: "Last updated",
    profileBtn: "Visitor card", profileBtnTitle: "Set your name and details (optional, stored on this device only)",
    trustBadge1: "No sign-up", trustBadge2: "Stored on this device only", trustBadge3: "Never used to train AI",
    pageNavAria: "Choose a page",
    pageTab1: "① Counter", pageTab2: "② Shelves", pageTab3: "③ Writing desk", pageTab4: "④ Bookshelf",
    sectionHead1: "Talk to the Shopkeeper About a Shelf", sectionSub1: "Let\u2019s find the shelf closest to how you feel.",
    counterReturnNote: "The shelf you chose before is still there. You\u2019re welcome to look again, starting from how you feel right now.",
    preBandaiPromptHeading: "For When the Words Won\u2019t Come Yet",
    preBandaiPromptDesc: "Talk with the shopkeeper about which shelf to use.",
    counterGreetingUnified: "Good evening. Feelings that don\u2019t have a name yet are fine just as they are. What does it feel like right now?",
    counterGroupSink: "Heavy and Sinking",
    counterGroupWave: "Rippling",
    counterGroupLight: "A Light Comes On",
    counterGroupSepia: "Gazing at Something Far Away",
    counterGroupOther: "Something Else",
    counterGroupOtherFeeling: "Other",
    counterBackBtn: "Back",
    counterShelfGuideNote: "Here is the \u201c{shelf}\u201d shelf.",
    counterViewShelfBtn: "View This Shelf",
    counterWriteWithoutChoosing: "Write Without Choosing Yet",
    keeperBioSummary: "About the shopkeeper",
    keeperBioText: "The keeper of this bookstore goes by \"Mana.\" Their age and gender remain unrevealed. They usually read quietly at the back of the counter, and their job is to listen to what customers have to say. The shelves are lined with quotes old and new, sourced and collected by Mana over many years in a notebook.",
    keeperNameLabel: "Shopkeeper",
    firstGreeting: "Good evening. The shop is quietly open.",
    textureStepAria: "Choose the option closest to how you feel",
    guideLead: "If nothing quite fits, write your own words in the box below and press \"Talk\"",
    freeformHintDesk: "※ What you write here will also be copied onto the manuscript paper at the writing desk.",
    earlyFreeformHint: "If nothing quite fits, write how you feel in this box and press \"Talk.\"",
    userInputPlaceholder: "e.g. I can't quite explain it, but I've felt unsettled all morning…",
    sendBtn: "Talk",
    sectionHead2: "The Emotion Shelves", sectionSub2: "Pick a shelf, or just wander without a destination.",
    swipeHint: "← Swipe left or right to move between shelves →",
    backToBandai: "⤴ Find a Shelf with the Shopkeeper",
    exitShopBtn: "Leave the Bookstore",
    // ★Hotfix4-3追加：英語モードで空文字になり、ボタン文字が消えていた欠落キーを補完。
    bookshelfExploreShelves: "Browse the other shelves",
    langToggleAria: "Switch language (Japanese / English)",
    exitFarewellMsg: "Thank you for stopping by. Come back whenever you feel like leaving some words here.",
    pageLabelCounter: "Counter \u00b7 ",
    pageLabelDesk: "Page One \u00b7 ",
    pageLabelBookshelf: "Page Four \u00b7 ",
    bindPageHeading: "Page Two \u00b7 Binding",
    manaPageHeading: "Page Three \u00b7 Mana Keeps Your Book",
    shelfPickHeading: "For You, from This Shelf",
    shelfPickNote: "From the \u201c{shelf}\u201d shelf, the shopkeeper chose one book and one song.",
    shelfPickBookLabel: "Book",
    shelfPickMusicLabel: "Song",
    shelfPickMoreLink: "Browse More from This Shelf",
    shelfPickJacketBookTag: "Selected",
    shelfPickJacketMusicTag: "Tonight's Track",
    bookshelfArrivalHeading: "Your book is on the shelf.",
    bookshelfArrivalMakeAnother: "Make Another Book",
    bookshelfArrivalBackToCover: "Back to the Cover",
    // ★2026-07-19 feature/first-visit-experience：製本後の余韻（到着パネルの2行）
    arrivalAfterglow1: "You can leave tonight’s feelings here.",
    arrivalAfterglow2: "Come back and open this book whenever you need it.",
    // ★2026-07-19 feature/first-visit-experience：表紙の初回説明とサンプル本
    firstVisitOneLine: "Your words stay on this device.",
    menuBackToTop: "↑ Back to the top",
    fairKicker: "This Month's Shelf",
    fairHalfNote: "",
    titleConsultBtn: "Ask the shopkeeper for a title",
    titleConsultHeading: "From the shopkeeper's title book",
    titleConsultMore: "See other titles",
    titleConsultHint: "Tap a title you like — you can still edit it freely.",
    detourHalfFirst: "First half of the month",
    detourHalfSecond: "Second half of the month",
    firstVisitAiLine1: "You—not AI—write the book. This is a place to turn your own words into a book and place it on a shelf.",
    firstVisitAiLine2: "Your writing and photos are not sent outside your device. No diagnosis or emotion analysis is performed.",
    samplePeekBtn: "Peek inside one of this shop’s books",
    sampleBookBadge: "This is a sample book. It is never added to your bookshelf.",
    sampleBookTitle: "The Walk Home After the Rain",
    sampleBookStory: "When I closed my umbrella, the smell of the wet street felt almost like summer again. One by one, I let the things I couldn’t say today fall into the puddles along the way home. For the first time in a while, I told myself it was okay not to hurry. When I saw the light at my front door, I thought: tomorrow, I’ll try speaking a little more honestly.",
    sampleBookNote: "On the days words wouldn’t come out right, they were quietly growing. Take your time on this shelf.",
    sectionHead3: "The Writing Desk",
    sectionSub3: "Write what you feel now onto a single page.",
    shelfAfterBindingNote: "You can choose a shelf after your book is bound.",
    storyInputPlaceholder: "When, where, what happened, and how it felt. Short and imperfect is fine.",
    assistBtn: "Not sure how to start? Ask the shopkeeper for a hand",
    // ★Hotfix2-2：assistTemplateの英語版。JAと同じ4行構成・末尾改行あり。
    assistTemplate: "When:\nWhere:\nWhat happened:\nWhat I felt inside:\n",
    // ★Hotfix4-3追加：英語モードで空文字になり、見出し・注記が消えていた欠落キーを補完。
    writingBoatHeading: "A little help putting it into words",
    writingBoatNote: "You don't have to answer these — just a starting point, if you'd like one.",
    storyCountFormat: "{count} / {max} chars",
    photoLabel: "Slip in today's photo (optional)",
    photoPreviewAlt: "Preview of attached photo",
    photoRemoveAria: "Remove photo",
    photoHint: "Photos are resized to a maximum of 800px and kept only on this device. Nothing is sent to a server.",
    deskExtraSummary: "Choose the title and timing yourself (optional)",
    fieldLabelShelf: "Shelf", fieldLabelTitle: "Spine title", titleInputPlaceholder: "If left blank, it will be saved as “An Untitled Book.”",
    fieldLabelWhen: "When did you feel this?", whenOptionNow: "Right now", whenOptionPast: "Looking back on the past",
    fieldLabelTweet: "Link a related post on X, if any", tweetInputPlaceholder: "e.g. https://x.com/username/status/1234567890",
    fieldHint: "Choose “Looking back on the past” to keep it on your bookshelf as a past feeling.",
    submitStory: "Hand it to the shopkeeper for binding",
    // ★Hotfix4-3追加：英語モードで空文字になり、リンク文字が消えていた欠落キーを補完。
    curateBackToDraft: "Back to the draft",
    invSeal: "Sealed", invKicker: "Letter of Recommendation", invGoShelf: "Take a look at the shelf", invClose: "Tuck it away as a bookmark",
    sectionHead4: "Your Bookshelf",
    sectionSub4: "Your bound stories appear as book spines. Select one to read it again at any time.",
    shelfEmptyMsg: "No books yet. Try writing your first one at the writing desk.",
    // ★2026-07-18変更：「Shelf: Date Unknown」→「Undated Shelf」へ、より自然な英語表現に調整。
    shelfMonthUnknown: "Undated Shelf",
    shelfMonthAllTab: "All",
    shelfMonthUnknownShort: "Date Unknown",
    shelfCountFormat: "{count} books",
    modalDeliveredSuffix: "Delivered",
    // ★2026-07-18変更：先頭の区切りを全角｜から中黒·へ変更し、より自然な英語表現に調整。
    // formatDate()の末尾（"...Delivered"）に直接連結されるため、視認性のため先頭に半角スペースを1つ入れている。
    modalSealedNote: " · A book written looking back on the past",
    recordCornerAria: "Shopkeeper's record corner",
    resetShelf: "Reset bookshelf",
    // ★2026-07-18追加：感情の地図（renderTrend）の期間タブ・要約文・行ツールチップ・冊数表示。
    trendPeriodMonth: "This Month",
    trendPeriodYear: "This Year",
    trendPeriodAll: "All",
    trendSummaryPeriodMonth: "This month, ",
    trendSummaryPeriodYear: "This year, ",
    trendSummaryPeriodAll: "Right now, ",
    trendSummaryTemplate: "{period}your “{shelf}” shelf seems to be the fullest.",
    trendRowTooltip: "View the “{shelf}” shelf",
    trendCountUnit: "{n} books",
    // ★2026-07-18追加：空の背表紙のツールチップ。
    emptySpineTooltip: "An empty spine with nothing written yet. Tap it to go to the writing desk.",
    trendDetailSummary: "See your emotion map in detail",
    trendNote: "※ A simple demo of the monthly \"Emotion Handbook\" report. This map is visible only to you.",
    shioriCardTitle: "Today's Bookmark", shioriCardNote: "A note from the shopkeeper, after looking over your whole bookshelf — about the shelf that holds the most books, not the one you wrote in today.",
    shioriLabel: "Bookmark — from the shopkeeper", shioriBtn: "Receive today's bookmark",
    footerBrand: "\"The Bookstore of Feelings\"",
    footerNote: "What you write is never sent to a server — it's stored only on this device.",
    footerNoteHtml: "What you write is never sent to a server —<br>it's stored only on this device.",
    shareBtn: "Share this bookstore", copyUrlBtn: "Copy URL", pwaPinBtn: "Pin to home screen",
    privacyLink: "Privacy Policy", termsLink: "Terms of Service",
    legalSep: " · ", supportLinkFooter: "Support & Helplines",
    shareMenuTitle: "Share", shareX: "Share on X", shareLine: "Share on LINE",
    shareNative: "Use device share menu", shareCopy: "Copy link",
    shareMenuHint: "If copying doesn't work, tap the field above to select all, then copy.",
    closeBtn: "Close",
    bindText: "Binding the thread…", bindSkip: "Tap to finish instantly",
    purifyOverlayAria: "Let go of a feeling",
    purifyKicker: "Let go — no one will see this. It's kept quietly only in this device's \"release log.\"",
    purifyInputPlaceholder: "Write that feeling out here, just as it is.",
    purifyBtn: "Let it go",
    modalPhotoAlt: "Photo attached to this page", modalNoteLabel: "A word from the shopkeeper",
    modalGoShelf: "See this shelf again", modalDel: "Remove this book from the shelf",
    modalShare: "Share on X", modalShareNote: "Nothing is sent anywhere on its own — this only opens the post composer, and whether you actually post is entirely up to you.",
    // ★Hotfix4-3追加：英語モードで空文字になり、ボタン文字が消えていた欠落キーを補完。
    modalEditBtn: "Edit the title and story",
    modalEditSave: "Save the changes",
    modalEditCancel: "Cancel",
    modalEditStoryEmpty: "The story can't be saved while it's empty.",
    pwaPopupAria: "Instructions for adding to home screen",
    pwaTitle: "Pin this bookstore to your phone's home screen",
    pwaSteps: "iPhone (Safari): tap the \"Share\" button below → \"Add to Home Screen\"<br>Android (Chrome): tap the menu (⋮) top right → \"Add to Home Screen\"",
    pwaNote: "Just like an app, you'll be able to open the door with a single tap anytime.",
    inAppBrowserWarning: "You're viewing this inside an in-app browser. <b>Your records may not be saved</b> in this environment. We recommend reopening in Safari or Chrome.",
    fairGoBtn: "Go",
    wanderBtn: "Wander wherever it leads",
    shioriChoosingWords: "The shopkeeper is choosing their words…",
    bindTextStep2: "Binding the cover…",
    draftRestored: "Your draft has been restored. Please continue where you left off.",
    storyTooShort: "First, try writing how you felt at that moment.",
    storyLimitWarning: "Please keep the text within {max} characters.",
    storyReviewing: "Preparing your book for binding…",
    tweetLinkInvalid: "That doesn't look like a valid link to a post on X (e.g. https://x.com/username/status/12345).",
    modalTweetLinkLabel: "View the related post on X",
    exportingBtn: "Exporting…", exportedBtn: "Exported ✓", exportFailBtn: "Export failed",
    exportDefaultBtn: "Download your records as text",
    csvExportDefaultBtn: "Download your records as CSV (opens in Excel, etc.)",
    restoreDefaultBtn: "Restore from a backup file",
    restoreLoadingBtn: "Restoring…", restoreDoneBtn: "Restored ✓", restoreFailBtn: "Restore failed",
    restoreConfirm: "The selected file contains {count} book(s).\nThis will overwrite the current data on this device.\nThis cannot be undone. Continue?",
    restoreInvalidFile: "This file doesn't look like a Bookstore of Feelings backup. Please try a different file.",
    restoreSuccess: "Restored. Reloading…",
    restoreFail: "Restore failed. Please check the contents of the file.",
    mitateYesBtn: "Yes, tell me", mitateNoBtn: "Not right now",
    loopShelfReferralBtn: "The \"{shelf}\" shelf might suit you — please take a look",
    appleMusicNote: "※ Apple Music links sometimes just open the app. If so, please search the song title again there.",
    supportLink: "Leave a small tip for the shopkeeper",
    supportHint: "If you've enjoyed this bookstore, a small tip for the shopkeeper is always welcome — entirely optional.",
    deskLeadFromCounter: "——Building on that. Try writing the feeling you shared at the counter or on the shelves, now in your own words.",
    writeAtDeskBtn: "Write this feeling down",
    chooseAgainBtn: "Choose again",
    chooseFromOptionsBtn: "You can also pick from the options",
    writeAtDeskBtn2: "Write this feeling down at the desk",
    restartChatBtn: "Start the conversation over",
    loopBrowseShelvesBtn: "Browse the emotion shelves",
    loopWriteBookBtn: "Make it a book at the desk",
    backToTextureBtn: "Choose the texture again",
    syncedToDeskMsg: "I've jotted down what you told me at the counter onto the manuscript paper. Please continue at your own pace.",
    photoLoadFail: "Couldn't load that photo. Please try a different one.",
    photoProcessing: "Adding your photo to the page…",
    photoUnsupportedFormat: "This browser can't open this file type. Please try a JPEG or PNG.",
    photoProcessFail: "Couldn't process that photo. Please try a different photo or size.",
    ghostNextBook: "+ Next book",
    backupCreatingBtn: "Creating a key…", backupDoneBtn: "Key updated ✓", backupFailBtn: "Key update failed",
    backupDefaultBtn: "Back up your bookshelf data",
    copyDoneBtn: "Copied ✓", copyLinkDefaultBtn: "Copy link", copyManualBtn: "Please copy from the field below",
    copyUrlDoneBtn: "Copied ✓", copyUrlDefaultBtn: "Copy URL",
    purifyLogBtn: "View your release log",
    favListBtn: "☆ View your \"curious about\" list",
    favEmpty: "You haven't saved any books or music yet. Tap the ☆ button on a shelf's picks to add one.",
    favRemoveBtn: "Remove from list",
    favOverlayTitle: "Your \"curious about\" list",
    trendEmptyOwn: "You can view your own bookshelf across different time ranges.",
    aiReferralLead: "If this is a complex, specialized topic (legal, medical, technical, etc.), you may get a more detailed answer here:",
    aiReferralGpt: "Ask ChatGPT ↗", aiReferralGemini: "Ask Gemini ↗",
    goToShelfBtn: "View the \"{shelf}\" shelf",
    dataAboutTitle: "About this bookstore & your data",
    dataAboutOpenLabel: "Where is my data stored?",
    dataAboutBody: "The \"shopkeeper\" isn't an AI chatbot — it's a simple system that returns pre-written lines based on context (you're not talking to any particular AI model).<br>Anything you write in \"Write your story\" or have \"bound\" is never published anywhere. It's stored only inside this device's browser (IndexedDB/localStorage) and never sent to an external server. There's no account, so no one else can see your records.<br>\"Let go of a feeling\" quietly moves that entry into a device-only \"release log\" so it no longer appears on your bookshelf — it isn't permanently deleted, just moved to its own log.<br>\"Everyone's Bookshelf\" doesn't mean sharing with other users — \"everyone\" here just names the idea of your own bookshelf growing over time.<br>Some parts of the shelves are fetched from an external search service, using only a season word and the shelf's emotion label as the search terms. Your written entries are never sent in these requests either.<br>Clearing your browser data will also erase these records, so we recommend periodically exporting a backup file via \"Back up your data.\" Even if this service were ever discontinued, your data would remain safe on your device as long as you've backed it up beforehand.", // ★Hotfix1-1追加修正：本・音楽の予告をデータ保存説明からも削除（外部通信の開示自体は維持）
    keeperNotAiHint: "※ Not an AI chatbot — a simple system that replies with pre-written lines. Nothing is sent to a model.",
    submitStoryHint: "※ Never published anywhere — stored only inside this device's browser.",
    shelfEpisodesHeading: "Your Books \u00b7 Short Stories from This Bookstore",
    recommendHeadingTpl: "Books the keeper chose for your {shelf} feeling",
    recommendSubtext: "Less something to finish reading, more a small charm for this feeling.",
    recommendShuffleBtn: "Show more",
    recommendShuffleTitle: "See other recommendations",
    recommendMoreLinkTpl: "Find more books people recommend for a {shelf} mood \u2192",
    playlistLabelTpl: "A {shelf} playlist \u2014 curated by the keeper",
    musicSearchYoutube: "Find music on YouTube",
    musicSearchAppleMusic: "Find on Apple Music",
    myStoryLabel: "Your story",
    episodesMoreLabelTpl: "Show more ({n} more)",
    episodeShuffleBtn: "See more stories",
    purifyTriggerBtn: "Let go of this feeling",
    purifyLogAriaLabel: "Log of feelings you\u2019ve let go of",
    purifyLogHideBtn: "Hide the list",
    purifyLogHiddenNote: "Hidden. Your data is still safely stored on this device \u2014 open it again anytime to see it.",
    purifyLogEmptyNote: "There\u2019s nothing here yet.",
    detourHeading: "This Month\u2019s Detour",
    detourPrNote: "[Includes PR / sponsored links]",
    detourViewLink: "Take a look \u2192",
    detourNote: "The detour selection changes each time you browse the shelves.",
    detourLoadingNote: "\u2026Looking for a book that matches the season",
    detourLiveSourceNote: "[Fetched from an external book information service]",
    detourLiveBadge: "This month\u2019s pick",
    detourLiveNote: "Even for the same shelf, three picks are shown at random, and the lineup changes again each month.",
    writeFabLabel: "Write",
    backToTopAria: "Back to top of the page",
    milestoneFallbackTpl: "That\u2019s book number {count}.",
    shareText: "Giving a name to a nameless feeling. \u201cThe Bookstore of Feelings\u201d \u2014 an experimental prototype for labeling emotions and placing them on a shelf.",
    favBtnLabelOn: "\u2605 Curious",
    favBtnLabelOff: "\u2606 Curious",
    profileDialogAria: "Visitor card",
    profileKicker: "Visitor card",
    profileLead: "If you like, tell us what to call you and which stage of life feels closest to you right now. The shopkeeper\u2019s words will change to speak to you.",
    profileNote: "Both are optional. They\u2019re stored only on this device and never sent to a server. You can change them anytime from \u201cVisitor card.\u201d",
    profileNameLabel: "What should we call you",
    profileNamePlaceholder: "e.g. Alex",
    profilePersonaLabel: "Which feels closest to you now",
    profileSaveBtn: "Enter with this",
    definitionLabelSep: " shelf",
    fairTitleTpl: "This month\u2019s pick from the keeper \u2014 \u201c{shelf}\u201d",
    shelfEpisodesNote: "These short stories were written for this bookstore. Nothing written by visitors is shown here.",
    shelfFictionalLabel: "Short Story",
    bindSuccessMsg: "Your words are now a book.",
    // ★v1.3 added (approved copy): Hero primary CTA / bookshelf admin fold / shop-guide heading.
    heroCta: "Write What You Feel Now",
    shelfAdminSummary: "Manage Your Bookshelf",
    shopGuideHeading: "Inside the Bookstore",
    counterFreeReply1: "Thank you for sharing that. I\u2019ll keep it here for now.",
    counterFreeReply2: "You can continue if there is more. It is also fine to close the page here.",
    counterFreeReply3: "You can turn these words into a book at the desk, or close the page as it is.",
    manaReceiveAriaLabel: "Mana, the shopkeeper, receives your book",
    manaReceiveLine: "I\u2019ll keep it safe. Would you like to place it on a shelf?",
    manaReceiveBookFallback: "An Untitled Book",
    manaReceiveShelfLabel: "Choose a shelf (optional)",
    manaReceivePlaceholder: "Select a shelf",
    manaReceiveConfirm: "Place it on this shelf",
    manaReceiveSkip: "Not now \u2014 go to my bookshelf",
    manaReceiveSaveError: "Sorry, saving didn\u2019t complete. Your words are still here \u2014 please try again in a moment.",
    manaImageAlt: "",
    menuOpenAria: "Open the in-store menu",
    menuCloseAria: "Close the in-store menu",
    menuNavAria: "Menu",
    menuTitle: "In-Store Menu",
    menuBtnLabelFull: "In-Store Menu",
    menuBtnLabelShort: "Menu",
    menuItemDesk: "Write what you feel now",
    menuItemBookshelf: "Your bookshelf",
    menuItemCounter: "Talk to the shopkeeper",
    menuItemShelves: "Browse the emotion shelves",
    menuItemCover: "Back to the cover",
    menuSectionOptional: "Optional detours",
    menuSectionSettings: "Settings & about this shop"
  }
};

function t(key){
  const dict = MESSAGES[appLang] || MESSAGES.ja;
  if(dict && dict[key] !== undefined) return dict[key];
  // ★英語モード完全性監査：英語キーが欠けている場合に日本語へフォールバックしない。
  // 中立的な空文字（＝非表示）を返す。日本語モードのときだけ従来どおりja辞書を使う。
  if(appLang !== 'ja') return '';
  return MESSAGES.ja[key] || '';
}

// ★2026-07-18追加：気になるリスト／手放した気持ちの記録／バックアップ・エクスポート・復元の
// 各ボタン文言を、初期化時だけでなく言語切替のたびにも追従させる（従来は初期化時のみ設定され、
// 言語切替後もボタン文言が切替前の言語のまま残っていた）。
function refreshUtilityButtonLabels(){
  const backupBtn = document.getElementById('backupBtn');
  if(backupBtn) backupBtn.innerHTML = t('backupDefaultBtn');
  const exportBtn = document.getElementById('exportDiary');
  if(exportBtn) exportBtn.innerHTML = t('exportDefaultBtn');
  const exportCsvBtn = document.getElementById('exportDiaryCsv');
  if(exportCsvBtn) exportCsvBtn.innerHTML = t('csvExportDefaultBtn');
  const restoreBtnEl = document.getElementById('restoreBtn');
  if(restoreBtnEl) restoreBtnEl.innerHTML = t('restoreDefaultBtn');
  const purifyBtn = document.getElementById('viewPurifyLogBtn');
  if(purifyBtn) purifyBtn.textContent = t('purifyLogBtn');
  if(typeof updateFavoritesBtnLabel === 'function') updateFavoritesBtnLabel();
}

function applyLanguage(){
  document.documentElement.lang = appLang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
  document.querySelectorAll('[data-i18n-alt]').forEach(el=>{
    el.alt = t(el.getAttribute('data-i18n-alt'));
  });
  // ★公開文面整合：製本前に棚名を表示しない。sectionSub3に{shelf}が含まれる旧形式の場合のみ
  // 従来のテンプレート差し込みを行い、現行の固定文はそのままテキストとして表示する。
  const sectionSub3 = document.querySelector('#desk .section-sub');
  if(sectionSub3){
    const s3 = t('sectionSub3');
    if(s3.indexOf('{shelf}') >= 0){
      const [before, after] = s3.split('{shelf}');
      sectionSub3.innerHTML = `${before}「<span id="deskCategoryLabel">${(typeof shelfLabelOf === 'function' && typeof activeCategory !== 'undefined') ? shelfLabelOf(activeCategory) : ''}</span>」${after}`;
    }else{
      sectionSub3.textContent = s3;
    }
  }
  // 演出トグル・文字数カウンターなど、JS側で直接書き換えているUI文言も追従させる
  if(typeof applyPrefs === 'function') applyPrefs();
  if(typeof updateStoryCount === 'function') updateStoryCount();
  // ★店主の名前（まな／綴）は選んだ性格によって変わるため、data-i18n の一律上書きの後に
  // あらためて正しい名前入りの文章へ差し替える
  if(typeof updateKeeperBioText === 'function') updateKeeperBioText();
  if(typeof applyUserNameDisplay === 'function') applyUserNameDisplay();
  // ★v1.3公開前最終修正：番台の棚案内UIはdata-i18n走査ではなくt()で直接組み立てているため、
  // 言語切替のたびに（現在の途中状態に関わらず）先頭の4択＋それ以外へ再描画して翻訳漏れを防ぐ。
  if(typeof renderCounterShelfGuideRoot === 'function') renderCounterShelfGuideRoot();
  // ★v1.3 RC2：JP/EN切替時に今日の日付表示も再描画する（仕様書2章）。
  if(typeof renderCurrentShopDate === 'function') renderCurrentShopDate();
  // ★英語モード監査：書くFABのaria-label/title/文字ラベルも言語切替のたびに更新する。
  if(typeof ensureWriteFab === 'function') ensureWriteFab();
  // ★Hotfix4.1：受け取り頁（棚選択select）を開いたまま言語切替した場合も、
  // option の表示名を再読み込みなしで現在の言語へ追従させる（選択中のIDは維持）。
  if(typeof refreshUnfiledShelfPickerLabels === 'function') refreshUnfiledShelfPickerLabels();
  // ★英語モード監査：月間フェア（#fairBox）は起動時に一度だけ描画されるため、
  // 言語切替時も再描画して見出し・ボタン文言を現在の言語へ追従させる
  // （fair.line自体はdata.js由来の季節文のため、日本語のまま残る＝許容範囲）。
  if(typeof renderFair === 'function') renderFair();
  // ★2026-07-18追加：本棚の年月見出し（.shelf-month-heading）を言語切替のたびに再描画する。
  if(typeof renderShelf === 'function' && typeof libraryCache !== 'undefined' && libraryCache.length) renderShelf(false);
  // ★2026-07-18追加：編纂机の「言葉にするための助け舟」を言語切替のたびに再描画する。
  if(typeof renderWritingBoat === 'function') renderWritingBoat();
  // ★2026-07-18追加：表紙の常時表示言語切替（日本語｜English）の現在言語表示を更新する。
  if(typeof updateHeroLangToggle === 'function') updateHeroLangToggle();
  // ★2026-07-18追加：気になるリスト・手放した記録・バックアップ／エクスポート／復元ボタンの
  // 文言を言語切替のたびに追従させる。
  if(typeof refreshUtilityButtonLabels === 'function') refreshUtilityButtonLabels();
  // ★2026-07-18追加：感情の地図（期間タブ・要約文・行ツールチップ・冊数）を言語切替のたびに再描画する。
  if(typeof renderTrend === 'function') renderTrend();
  // ★2026-07-19 hotfix：天気バッジ（地域名・状態名・区切り文字）と、開いている場合の
  // 詳細ポップオーバーを、言語切替のたびに再取得なしで即時再描画する。
  // （★公開用リリースフラグ：WEATHER_FEATURE_ENABLEDがfalseの間は呼ばない）
  if(typeof WEATHER_FEATURE_ENABLED !== 'undefined' && WEATHER_FEATURE_ENABLED && typeof refreshWeatherLanguageViews === 'function') refreshWeatherLanguageViews();
  // ★2026-07-19 feature/first-visit-experience：閲覧専用サンプル本を開いたまま言語を
  // 切り替えた場合、見本の本文・栞・バッジも現在の言語で再描画する。
  if(typeof refreshSampleBookIfOpen === 'function') refreshSampleBookIfOpen();
  // ★2026-07-19 E：題名相談パネルを開いたまま言語を切り替えた場合も現在の言語で再描画する。
  if(typeof renderTitleConsult === 'function') renderTitleConsult();
  // ★Hotfix1-3：現在表示中の動的領域（棚の名言・エピソード・本・曲・寄り道・栞・到着推薦・本詳細）を
  // 現在の言語で再描画する。選ばれている作品・項目のIDは出会いシードのメモ化により変わらない。
  if(typeof refreshLocalizedDynamicViews === 'function') refreshLocalizedDynamicViews();
  // ★Hotfix4追加：フッターの「専門の相談窓口」リンク先を、現在の言語に応じてguide.html／
  // guide-en.htmlへ切り替える（リンク文言自体はdata-i18n="supportLinkFooter"で翻訳済み）。
  const guideSupportLink = document.getElementById('guideSupportLink');
  if(guideSupportLink) guideSupportLink.href = (appLang === 'en') ? './guide-en.html#support' : './guide.html#support';
  const langBtn = document.getElementById('langToggle');
  if(langBtn) langBtn.textContent = appLang === 'ja' ? 'JP / EN' : 'EN / JP';
  const titleEl = document.querySelector('title');
  if(titleEl){
    titleEl.textContent = appLang === 'ja'
      ? 'みんなの感情書店｜今の気持ちを、一冊の本に。'
      : 'The Bookstore of Feelings | Turn What You Feel Now into a Book.';
  }
}

async function initLanguage(){
  const saved = await loadJSON(LANG_STORAGE_KEY, null);
  if(saved === 'en' || saved === 'ja') appLang = saved;
  applyLanguage();
}

function toggleLanguage(){
  appLang = appLang === 'ja' ? 'en' : 'ja';
  saveJSON(LANG_STORAGE_KEY, appLang);
  applyLanguage();
  buzz(6);
}

// ★Step3：本文の文字を読み取って題名候補を採点する scoreLabelForStory は、
// 全参照ゼロを確認のうえ削除した（suggestTitlesは本文を読まない固定動作へ変更）。

function suggestTitles(catId, story, n){
  // ★Step3：本文（story）による題名提案を停止。引数は読まず、常に空配列を返す（関数契約は維持）。
  return [];
}

function renderTitleSuggest(){
  // ★Step3：本文を読み取る題名候補の提案（suggestTitles）を停止。
  // 候補欄を空にして終了し、題名候補ボタンは表示しない。利用者の手入力題名はそのまま維持される。
  const box = document.getElementById('titleSuggest');
  if(box) box.innerHTML = '';
}

// ★2026-07-19：棚説明文の言語対応ヘルパー（英語モードはdata.jsのCATEGORY_DEF_ENを使う）。
function categoryDefFor(cat){
  if(!cat) return '';
  if(appLang === 'en' && typeof CATEGORY_DEF_EN !== 'undefined' && CATEGORY_DEF_EN[cat.id]) return CATEGORY_DEF_EN[cat.id];
  return cat.def || '';
}

// ★2026-07-19：本・曲の紹介文の言語対応ヘルパー。英語モードでは英語紹介文を持つ候補だけが
// 選ばれる前提（pickRecommend/pickShelfLinkedRecommendation側でフィルタ）。
function bookHookFor(book){
  if(!book) return '';
  if(appLang === 'en'){
    if(typeof BOOK_HOOK_EN !== 'undefined' && BOOK_HOOK_EN[book.title]) return BOOK_HOOK_EN[book.title];
    return (typeof RECOMMEND_REASON_EN !== 'undefined') ? RECOMMEND_REASON_EN[0] : '';
  }
  return book.hook || '';
}
function songCommentFor(song){
  if(!song) return '';
  if(appLang === 'en'){
    const key = song.artist + '|' + song.title;
    if(typeof MUSIC_COMMENT_EN !== 'undefined' && MUSIC_COMMENT_EN[key]) return MUSIC_COMMENT_EN[key];
    return '';
  }
  return song.comment || '';
}
// ★Hotfix4-6追加：英語モードで本・曲の「タイトル／著者名・アーティスト名」表示を英語表記にする
// ヘルパー。bookHookFor/songCommentForと同じ方針（対応表にあれば英語表記、なければ元の
// 日本語表記のままフォールバック＝表示が空にならない）。enReadyBooks/enReadySongsにより
// 英語モードの候補はもともとBOOK_TITLE_EN等のキーを持つ本・曲だけに絞られているため、
// 実運用ではフォールバックに落ちることは通常ない。
function bookTitleFor(book){
  if(!book) return '';
  if(appLang === 'en' && typeof BOOK_TITLE_EN !== 'undefined' && BOOK_TITLE_EN[book.title]) return BOOK_TITLE_EN[book.title];
  return book.title || '';
}
function bookAuthorFor(book){
  if(!book) return '';
  if(appLang === 'en' && typeof BOOK_AUTHOR_EN !== 'undefined' && BOOK_AUTHOR_EN[book.title]) return BOOK_AUTHOR_EN[book.title];
  return book.by || '';
}
function songArtistFor(song){
  if(!song) return '';
  if(appLang === 'en' && typeof SONG_ARTIST_EN !== 'undefined' && SONG_ARTIST_EN[song.artist]) return SONG_ARTIST_EN[song.artist];
  return song.artist || '';
}
function songTitleFor(song){
  if(!song) return '';
  if(appLang === 'en'){
    const key = song.artist + '|' + song.title;
    if(typeof SONG_TITLE_EN !== 'undefined' && SONG_TITLE_EN[key]) return SONG_TITLE_EN[key];
  }
  return song.title || '';
}
// 英語対応済み候補だけへ絞る（日本語モードでも同じ母集団を使うことで、言語切替時に候補IDが変わらない）。
function enReadyBooks(pool){
  if(typeof BOOK_HOOK_EN === 'undefined') return pool;
  const filtered = pool.filter(b=>BOOK_HOOK_EN[b.title]);
  return filtered.length ? filtered : pool;
}
function enReadySongs(pool){
  if(typeof MUSIC_COMMENT_EN === 'undefined') return pool;
  const filtered = pool.filter(sg=>MUSIC_COMMENT_EN[sg.artist + '|' + sg.title]);
  return filtered.length ? filtered : pool;
}

function generateTitle(categoryId){
  const pool = TITLE_TEMPLATES[categoryId] || ['名前のない一冊'];
  return pool[Math.floor(Math.random()*pool.length)];
}

/* ==========================================================================
 * ★2026-07-19 E：店主に題名を相談する（編纂机）。
 * ・AI・外部サービス・本文解析は一切使わない。選択中の感情棚に対応する固定の題名候補
 *   プール（日本語=TITLE_TEMPLATES／英語=TITLE_SUGGEST_EN）から決定的に5件を提示する。
 * ・棚が未選択の場合は汎用候補（下のJA配列／TITLE_SUGGEST_EN_GENERIC）を使う。
 * ・候補パネルを開いている間はオフセットを固定し、「別の題名を見る」でだけ入れ替える。
 * ・候補を押すとタイトル欄へ入り、その後も自由に編集できる。maxlength(16)超の候補は出さない。
 * ・題名を付けずに製本する既存仕様には手を加えない。
 * ========================================================================== */
const TITLE_SUGGEST_JA_GENERIC = [
  '帰り道に残ったこと','まだ言えなかった言葉','あの日の続きを少しだけ','ひらいたままの頁',
  '小さな字の今夜','気持ちの置き場所','下線を引いた平日','胸の中の天気'
];
let titleConsultState = { open:false, offset:0 };

function titleConsultPool(){
  const catId = (typeof activeCategory !== 'undefined') ? activeCategory : null;
  const hasShelf = (typeof shelfWasChosen === 'undefined' || shelfWasChosen) && catId && CATEGORIES.some(c=>c.id === catId);
  const limit = 16; // #titleInputのmaxlengthと同じ
  let pool;
  if(appLang === 'en'){
    pool = (hasShelf && typeof TITLE_SUGGEST_EN !== 'undefined' && TITLE_SUGGEST_EN[catId])
      ? TITLE_SUGGEST_EN[catId]
      : (typeof TITLE_SUGGEST_EN_GENERIC !== 'undefined' ? TITLE_SUGGEST_EN_GENERIC : []);
  }else{
    pool = (hasShelf && TITLE_TEMPLATES[catId]) ? TITLE_TEMPLATES[catId] : TITLE_SUGGEST_JA_GENERIC;
  }
  return pool.filter(x=>String(x).length <= limit);
}

function renderTitleConsult(){
  const box = document.getElementById('titleConsult');
  if(!box) return;
  if(!titleConsultState.open){ box.innerHTML = ''; box.classList.add('hidden'); return; }
  const pool = titleConsultPool();
  if(!pool.length){ box.innerHTML = ''; box.classList.add('hidden'); return; }
  const count = 5;
  const start = (titleConsultState.offset * count) % pool.length;
  const picks = [];
  for(let i = 0; i < Math.min(count, pool.length); i++){
    picks.push(pool[(start + i) % pool.length]);
  }
  box.innerHTML = '';
  const head = document.createElement('p');
  head.className = 'title-consult-heading';
  head.textContent = t('titleConsultHeading');
  box.appendChild(head);
  const list = document.createElement('div');
  list.className = 'title-consult-list';
  picks.forEach(candidate=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'title-consult-item';
    b.textContent = candidate;
    b.onclick = ()=>{
      const input = document.getElementById('titleInput');
      if(input){ input.value = candidate; input.focus(); }
      buzz(6);
    };
    list.appendChild(b);
  });
  box.appendChild(list);
  const hint = document.createElement('p');
  hint.className = 'title-consult-hint';
  hint.textContent = t('titleConsultHint');
  box.appendChild(hint);
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'title-consult-more';
  more.textContent = t('titleConsultMore');
  more.onclick = ()=>{ titleConsultState.offset++; renderTitleConsult(); };
  box.appendChild(more);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'title-consult-close';
  close.textContent = t('closeBtn');
  close.onclick = ()=>toggleTitleConsult();
  box.appendChild(close);
  box.classList.remove('hidden');
  const btn = document.getElementById('titleConsultBtn');
  if(btn) btn.setAttribute('aria-expanded', 'true');
}

// ★Hotfix1-3：言語切替時に、描画済みの動的コンテンツを（IDを変えずに）現在の言語で再描画する。
let lastOpenedBookEntry = null;
function refreshLocalizedDynamicViews(){
  try{
    // 棚タブ（棚名・グループ見出し）は描画済みのままでは言語が残るため、常に再描画する
    if(typeof renderShelfTabs === 'function'){ try{ renderShelfTabs(); }catch(e){} }
    // 開いたままのオーバーレイ（気になるリスト・手放した記録・来店カード・共有メニュー）も
    // 現在の言語で再描画する（各show関数は呼ぶたびに内容を組み直す実装）
    // これらのオーバーレイは初回生成時の言語で見出し・閉じるボタンが固定されるため、
    // 一度破棄してから（開いていた場合のみ）現在の言語で作り直す。
    const favOv = document.getElementById('favoritesOverlay');
    if(favOv){
      const favWasOpen = !favOv.classList.contains('hidden');
      favOv.remove();
      if(favWasOpen && typeof showFavorites === 'function'){ try{ showFavorites(); }catch(e){} }
    }
    const puOv = document.getElementById('purifyLogOverlay');
    if(puOv){
      const puWasOpen = !puOv.classList.contains('hidden');
      puOv.remove();
      if(puWasOpen && typeof showPurifyLog === 'function'){ try{ showPurifyLog(); }catch(e){} }
    }
    const prOv = document.getElementById('profileOverlay');
    if(prOv && !prOv.classList.contains('hidden') && typeof showProfileCard === 'function'){ try{ showProfileCard(); }catch(e){} }
    // 現在開いている感情棚（棚名・説明・名言・エピソード・本・曲・寄り道）
    const shelvesPage = document.getElementById('shelves');
    if(shelvesPage && typeof renderShelfDisplay === 'function' &&
       document.body.classList.contains('experience-open') && typeof activeCategory !== 'undefined' && activeCategory){
      const disp = document.getElementById('shelfDisplay');
      if(disp && disp.innerHTML !== '') renderShelfDisplay();
    }
    // 今日の栞・到着推薦（描画済みなら）
    if(typeof renderShioriCard === 'function') renderShioriCard();
    if(typeof renderShelfPickRecommend === 'function') renderShelfPickRecommend();
    // 開いている通常の本詳細（サンプル本はrefreshSampleBookIfOpenが担当）
    const bm = document.getElementById('bookModal');
    if(bm && !bm.classList.contains('hidden') && !bm.classList.contains('sample-book-mode') &&
       lastOpenedBookEntry && typeof openBook === 'function'){
      openBook(lastOpenedBookEntry);
    }
  }catch(e){}
}

function toggleTitleConsult(){
  titleConsultState.open = !titleConsultState.open;
  if(!titleConsultState.open){
    const btn = document.getElementById('titleConsultBtn');
    if(btn) btn.setAttribute('aria-expanded', 'false');
  }
  renderTitleConsult();
}

function recommendReasonFor(catId){
  const pool = RECOMMEND_TEMPLATES[catId];
  if(!pool || !pool.length) return '';
  return pool[Math.floor(Math.random()*pool.length)];
}

const AMAZON_ASSOCIATE_ID = 'uta0106-22';
const RAKUTEN_AFFILIATE_ID = '5590cc07.86ee74b4.5590cc08.a766f047';

function amazonSearchUrl(query, indexParam){
  let url = 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(query);
  if(indexParam) url += '&i=' + indexParam;
  if(AMAZON_ASSOCIATE_ID && AMAZON_ASSOCIATE_ID !== 'your_id-22'){
    url += '&tag=' + encodeURIComponent(AMAZON_ASSOCIATE_ID);
  }
  return url;
}

function rakutenSearchUrl(query){
  const target = 'https://search.rakuten.co.jp/search/mall/' + encodeURIComponent(query) + '/';
  if(RAKUTEN_AFFILIATE_ID){
    return 'https://hb.afl.rakuten.co.jp/hgc/' + RAKUTEN_AFFILIATE_ID + '/?pc=' + encodeURIComponent(target) + '&m=' + encodeURIComponent(target);
  }
  return target;
}

function rakutenTravelSearchUrl(query){
  return 'https://kw.travel.rakuten.co.jp/keyword/Search.do?f_query=' + encodeURIComponent(query) + '&f_max=30&charset=utf-8';
}

// ★本棚エントリのXシェア機能
// 設計方針：日記本文はそのまま自動送信しない。棚名＋店主がつけたタイトルの短い定型文だけを
// 事前入力し、あとはX（twitter.com/intent/tweet）自身のcompose画面でユーザーが確認・編集した上で
// 「投稿するか」を自分で判断する。intent URLを新しいタブで開くだけなので、当店のサーバー（＝存在しない）
// への送信は一切発生しない。
function buildShareText(entry){
  const title = entry.title || '';
  const shopName = t('shopName');
  // ★Step4：棚未選択（unfiled）の場合は、棚に関する一文・棚名を完全に省略する
  if(entry.category === UNFILED_CATEGORY_ID){
    return (appLang === 'en')
      ? `I wrote "${title}" at ${shopName}.`
      : `「${title}」を、${shopName}に綴りました。`;
  }
  const cat = CATEGORIES.find(c=>c.id===entry.category);
  const shelfLabel = categoryLabelFor(cat);
  return (appLang === 'en')
    ? `I wrote "${title}" and placed it on the ${shelfLabel} shelf at ${shopName}.`
    : `「${title}」を、${shopName}の「${shelfLabel}の棚」に綴りました。`;
}

function twitterIntentUrl(text, url){
  let u = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
  if(url) u += '&url=' + encodeURIComponent(url);
  u += '&hashtags=' + encodeURIComponent('みんなの感情書店');
  return u;
}

function detourUrlFor(item){
  if(item.affiliate_platform === 'Amazon') return amazonSearchUrl(item.search_query);
  if(item.affiliate_platform === 'Rakuten') return rakutenSearchUrl(item.search_query);
  if(item.affiliate_platform === 'RakutenTravel') return rakutenTravelSearchUrl(item.search_query);
  return amazonSearchUrl(item.search_query);
}

// ★追加：棚の名言の出典（source）から書籍・作品名（『…』）を抜き出し、
// その作品に飛べるリンクを作るためのユーティリティ
function parseQuoteSource(source){
  if(!source) return { author:'', title:null };
  const m = source.match(/『([^』]+)』/);
  if(!m) return { author:source, title:null };
  const title = m[1];
  let author = source.slice(0, m.index) + source.slice(m.index + m[0].length);
  author = author
    .replace(/[（(]\s*(小説|漫画|映画|アニメ|歌詞|楽曲)?\s*[）)]/g, '')
    .replace(/(小説|漫画|映画|アニメ|歌詞|楽曲)\s*$/,'')
    .trim();
  return { author, title };
}

function escapeHtml(str){
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function quoteSourceHtml(source){
  const { author, title } = parseQuoteSource(source);
  if(!title) return escapeHtml(source);
  const url = amazonSearchUrl((author ? author + ' ' : '') + title);
  const authorHtml = author ? escapeHtml(author) + ' ' : '';
  return `${authorHtml}<a class="quote-source-link" href="${url}" target="_blank" rel="noopener sponsored">『${escapeHtml(title)}』</a>`;
}

const SHOP_OPEN_DATE = new Date('2026-07-01T00:00:00+09:00');
const MAX_WAVE = 6;

function unlockedWaveCount(){
  const now = new Date();
  const months = (now.getFullYear() - SHOP_OPEN_DATE.getFullYear()) * 12 + (now.getMonth() - SHOP_OPEN_DATE.getMonth());
  return Math.min(MAX_WAVE, Math.max(1, months + 1));
}

// ★Hotfix1-4：出会い（セッション/製本）単位の決定的シャッフル。描画のたびに再抽選しない。
function seededShuffle(arr, seed){
  const a = arr.slice();
  let s = seed >>> 0;
  for(let i = a.length - 1; i > 0; i--){
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
function shelfEncounterSeed(catId, slot){
  return shelfPickSeed(String(recoEncounterSeed()) + '_' + catId + '_' + slot);
}

// ★Hotfix1-3追加修正：感情棚側（製本後推薦とは別）にも直前回避を適用する。
// 同じ出会い（＝同じseed）の間はメモ化した順序をそのまま返し、再描画・言語切替・モーダル開閉で
// 変わらないという既存の一期一会の固定は維持する。seedが変わった＝新しい出会いのときだけ、
// 先頭候補が直前の出会いの先頭候補と一致する場合に限って先頭を後ろへ送り、連続を避ける。
// 候補が1件以下の場合は何もしない（同一候補を許容）。製本後推薦用の既存キー（eb-reco-prev-*）とは
// 別の棚ID単位のキーを使うため混同しない。
function applyShelfPrevAvoidance(catId, kind, seed, arr, stableKeyFn){
  if(!arr || arr.length < 2) return arr;
  try{
    const memoKey = 'eb-shelf-' + kind + '-memo-' + catId + '-' + seed;
    const prevKey = 'eb-shelf-prev-' + kind + '-' + catId;
    let memoOrder = null;
    try{ memoOrder = JSON.parse(sessionStorage.getItem(memoKey) || 'null'); }catch(e){}
    if(memoOrder && Array.isArray(memoOrder) && memoOrder.length === arr.length){
      const byKey = {};
      arr.forEach(item=>{ byKey[stableKeyFn(item)] = item; });
      const restored = memoOrder.map(k=>byKey[k]).filter(Boolean);
      if(restored.length === arr.length) return restored;
    }
    let result = arr.slice();
    const prev = sessionStorage.getItem(prevKey);
    if(prev && stableKeyFn(result[0]) === prev){
      result.push(result.shift()); // 先頭を末尾へ送り、直前の出会いと同じ先頭候補を避ける
    }
    sessionStorage.setItem(prevKey, stableKeyFn(result[0]));
    sessionStorage.setItem(memoKey, JSON.stringify(result.map(stableKeyFn)));
    return result;
  }catch(e){ return arr; }
}

function shuffleArray(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function dailySeedNumber(){
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function seededPickFromArray(arr, seed, salt){
  if(!arr || !arr.length) return '';
  let h = (seed ^ Math.imul(salt + 1, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return arr[h % arr.length];
}
function composeDailyMessage(kind, saltBase, label){
  if(typeof DAILY_MESSAGE_PARTS === 'undefined') return '';
  const parts = DAILY_MESSAGE_PARTS[kind];
  if(!parts) return '';
  const seed = dailySeedNumber();
  let text = seededPickFromArray(parts.intro, seed, saltBase + 1)
    + seededPickFromArray(parts.body, seed, saltBase + 2)
    + seededPickFromArray(parts.outro, seed, saltBase + 3);
  if(label) text = text.split('{label}').join(label);
  return text;
}

function toggleEpisodes(){
  const more = document.getElementById('episodesMore');
  const btn = document.getElementById('episodesToggle');
  if(!more || !btn) return;
  if(more.classList.contains('hidden')){
    more.classList.remove('hidden');
    btn.textContent = t('closeBtn');
  }else{
    more.classList.add('hidden');
    btn.textContent = btn.dataset.moreLabel || 'もっと見る';
  }
  if(typeof buzz === 'function') buzz(6);
}

function pickRecommend(catId){
  const pinned = PINNED_RECOMMEND[catId] || [];
  const wave = unlockedWaveCount();
  const pool = enReadyBooks(BOOK_POOL.filter(b=>b.tags.includes(catId) && b.wave <= wave));
  const chipsSeed = shelfEncounterSeed(catId, 'chips');
  const shuffled = applyShelfPrevAvoidance(catId, 'book', chipsSeed,
    seededShuffle(pool, chipsSeed), b=>(b.title + '|' + b.by)); // ★Hotfix1-3追加修正：直前の出会いと同じ先頭候補を避ける
  const picked = shuffled.slice(0, 3).map(b=>({
    title:b.title, by:b.by, why:(bookHookFor(b) || (appLang === 'en' ? RECOMMEND_REASON_EN[0] : recommendReasonFor(catId)))
  }));
  return pinned.concat(picked);
}

const STORY_LIMIT = 700;
function countChars(str){ return Array.from(str || '').length; }

// ★Step4：棚未選択を表す中立の内部ID。
// ・CATEGORIES（既存21棚）には追加しない
// ・null／空文字／undefinedは未選択として使用しない
// ・利用者へ生の文字列 'unfiled' は表示しない（表示箇所は各所でフォールバック）
const UNFILED_CATEGORY_ID = 'unfiled';
// ★Step4：unfiledの背表紙用の中立色（SPINE_COLORS配列そのものは変更しない）
const UNFILED_SPINE_COLOR = '#8C8578';

/* ==========================================================================
 * ★GA4整合：プライバシーファーストの独立計測ラッパー（許可リスト方式）
 * --------------------------------------------------------------------------
 * ・本アプリが明示的に送信するカスタムイベントは、下記の5種類のみ。
 *   （GA4が自動生成する session_start / first_visit 等は、本アプリが追加するものではない）
 * ・イベントパラメータは一切渡さない。利用者本文・題名・写真名・棚ID・棚名・感情名・
 *   書名・曲名・作品ID・URL入力値・エラー文字列を引数に受け取らない／送らない。
 * ・gtag未読込、広告ブロッカー、通信失敗でもアプリ機能を止めない（try/catchで隔離）。
 * ・dataLayerやgtagをこのラッパー以外の経路で直接呼ばない。
 * ・consoleへ利用者入力を出力しない。
 * ========================================================================== */
const ANALYTICS_ALLOWED_EVENTS = ['view_landing', 'start_writing', 'create_book_success', 'create_book_error', 'view_shelf'];
function trackAnalyticsEvent(eventName){
  try{
    if(ANALYTICS_ALLOWED_EVENTS.indexOf(eventName) === -1) return;
    if(typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName); // パラメータは付けない
  }catch(e){
    // 計測の失敗はアプリ機能へ影響させない（何も出力しない）
  }
}
// 発火ガード（すべてページロード単位のメモリ上ガード。ストレージには保存しない）
let _gaViewLandingSent = false;      // view_landing：フルページロードごとに1回
let _gaStartWritingSent = false;     // start_writing：本文欄が空→非空になった初回に1回
let _gaLastTrackedPage = null;       // view_shelf：同一ページへの重複発火防止
let _gaLastTrackedShelfId = null;    // view_shelf：同一の個別棚への重複発火防止（棚IDは送信しない）
let _gaSuppressNextViewShelf = false; // view_shelf：goToShelf側で送信済みの場合、直後のgoToPage('shelves')での二重発火を抑止
let activeCategory = (CATEGORIES && CATEGORIES.length) ? CATEGORIES[0].id : 'moyamoya';
// ★Hotfix1-F：利用者が実際に棚を選んだかどうか。falseの間は棚タブのハイライトを付けず、
// 題名相談も汎用候補を使う（「名もなき感情」を自動的な既定値に見せないため）。
let shelfWasChosen = false;
// ★Hotfix1-2追加修正：activeCategoryを書き換える経路を一元化する共通ヘルパー。
// 棚タブ直接クリック・「気ままに巡る」・スワイプ／左右移動・本棚での棚確定など、
// 利用者が明示的に棚（感情カテゴリ）を選んだと言える操作は、必ずこの関数を経由させ、
// shelfWasChosenの更新漏れを防ぐ。chosenをfalseで呼ぶ場合は内部処理専用（利用者操作ではない）。
function setActiveShelf(id, opts){
  opts = opts || {};
  const chosen = opts.chosen !== false; // 既定はtrue＝利用者操作扱い
  activeCategory = id;
  if(chosen) shelfWasChosen = true;
}
let libraryCache = [];
// ★追加：本棚が際限なく伸び続けるのを防ぐための「月別の棚」。
// 既定は'all'（従来通り全冊表示）で、ユーザーがタブを選んだときだけ絞り込む＝挙動を壊さない追加機能。
let selectedShelfMonth = 'all';
function monthKeyOf(dateStr){
  const d = new Date(dateStr);
  if(isNaN(d.getTime())) return '不明';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
// ★2026-07-18変更：月別タブ（renderShelfMonthTabs）向けの年月表示をappLangに対応させる。
// 見出し用のmonthHeadingLabel（「2026年7月の棚」）とは別に、タブでは「の棚」を付けない短い形。
function monthLabelOf(key){
  if(key === '不明') return t('shelfMonthUnknownShort');
  const [y, m] = key.split('-').map(Number);
  if(appLang === 'en'){
    try{
      const d = new Date(y, m - 1, 1);
      return new Intl.DateTimeFormat('en-US', { month:'long', year:'numeric' }).format(d);
    }catch(e){ return `${y}-${String(m).padStart(2,'0')}`; }
  }
  return `${y}年${m}月`;
}
// ★2026-07-18追加：本棚を年月単位でグループ化する際の見出し文言（例：「2026年7月の棚」）。
function monthHeadingLabel(key){
  if(key === '不明') return t('shelfMonthUnknown');
  const [y, m] = key.split('-').map(Number);
  if(appLang === 'en'){
    try{
      const d = new Date(y, m - 1, 1);
      return new Intl.DateTimeFormat('en-US', { month:'long', year:'numeric' }).format(d) + ' Shelf';
    }catch(e){ return `${y}-${String(m).padStart(2,'0')} Shelf`; }
  }
  return `${y}年${m}月の棚`;
}

// ★v1.3公開前最終修正：wave/light/sepiaのshelvesに重複（ushirometai/kansha）と
// 誤所属（akogare/itooshiiがwave/lightに混入）があり、21棚が一度ずつにならない不整合を発見。
// CATEGORIESは無変更のまま、このグループ分けだけを前回CHAT_TREE修正と同じ正準グループへ揃える。
const TEXTURE_GROUPS = [
  {
    id:'sink',
    label:'雨降りのように、心が重く沈んでいる',
    keeper:'少しお疲れのようですね。このあたりの棚に、今の心に寄り添う本があるかもしれません。',
    // ★Hotfix3：moyamoya（名もなき感情）は「重く沈む」の中身ではなく、どの感情にも
    // まだ当てはまらない状態を表すため、下の独立グループ'other'へ切り出した
    // （Hotfix2時点では暫定的にこのグループの最後尾へ移動していたが、今回さらに分離した）。
    // 内部ID・21棚の総数・他グループの並びは変更しない。この配列はrenderShelfTabs()の
    // 「静かに沈む気持ち」グループ内タブ順とも共通のため、両画面で一貫して反映される。
    shelves:['kodoku','gakkari','hazukashii','ushirometai','kanashii'],
    tone:'heavy'
  },
  {
    id:'wave',
    label:'風が吹くように、心がざわざわしている',
    keeper:'感情が波立っているのですね。こちらの棚に並ぶ言葉が、ヒントになるかもしれません。',
    shelves:['aseri','kuyashii','shitto','ikari','fuan','keno','odoroki'],
    tone:'heavy'
  },
  {
    id:'light',
    label:'晴れやかに、前を向いている',
    keeper:'素敵な心の状態ですね。今の明るい気分にぴったりの棚を覗いてみませんか。',
    shelves:['wakuwaku','ando','kansha','hokorashii','ureshii'],
    tone:'neutral'
  },
  {
    id:'sepia',
    label:'夕暮れ時のように、懐かしんでいる',
    keeper:'過去の頁をめくっているのですね。思い出に浸れるこちらの棚がおすすめです。',
    shelves:['natsukashii','akogare','itooshii'],
    tone:'neutral'
  },
  {
    // ★Hotfix3新設：moyamoya（名もなき感情）専用の独立グループ。「重く沈む」の一部ではなく、
    // まだどの感情にも当てはまらない状態のための別枠。番台の感情選択・全部見る一覧・
    // 自由対話の感情チップ・棚ページのタブ表示の4画面すべてがこのTEXTURE_GROUPS配列を
    // 共通参照しているため、ここに追加するだけで4画面に一貫して反映される。
    // 配列の最後尾に置くことで、「全部見る」一覧でも名もなき感情が最後に表示される。
    id:'other',
    label:'まだ、名前のつけられない気持ちがある',
    keeper:'……名前がなくても、大丈夫です。ここにだけ、そっと置いていける棚があります。',
    shelves:['moyamoya'],
    tone:'heavy'
  }
];

let currentTone = 'neutral';
let counterDraftText = '';

const MIDNIGHT_GREETINGS = [
  '……こんな時間まで、おつかれさまです。これからのことを考えていると、夜はどこまでも長くなりますね。今日の気持ちを、一冊だけ預けていきませんか。',
  '……夜更けの来店、歓迎します。SNSには書けない本音ほど、この棚には似合うんですよ。誰にも見られません。ここだけの話にしましょう。',
  '……眠れない夜は、無理に眠らなくてもいいと思うんです。直接では言えなかった言葉を、ここでだけ、そっと綴ってみませんか。'
];

const STORAGE_VERSION = 1;
const IDB_NAME = 'emotion-bookstore';
const IDB_STORE = 'kv';
let storageWarned = false;
let idbHandle = null;
let idbBroken = false;

function warnStorageOnce(message){
  if(storageWarned) return;
  storageWarned = true;
  const msg = document.getElementById('deskMsg');
  if(msg) msg.textContent = message;
}

function idbOpen(){
  if(idbBroken || !window.indexedDB) return Promise.resolve(null);
  if(idbHandle) return Promise.resolve(idbHandle);
  return new Promise((resolve)=>{
    let settled = false;
    const done = (db)=>{ if(!settled){ settled = true; resolve(db); } };
    try{
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(IDB_STORE)){
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = ()=>{
        idbHandle = req.result;
        idbHandle.onclose = ()=>{ idbHandle = null; };
        done(idbHandle);
      };
      req.onerror = ()=>{ idbBroken = true; done(null); };
      req.onblocked = ()=>{ done(null); };
      setTimeout(()=>{ if(!settled){ idbBroken = true; done(null); } }, 3000);
    }catch(e){
      idbBroken = true;
      done(null);
    }
  });
}

function idbGet(key){
  return idbOpen().then(db=>{
    if(!db) return undefined;
    return new Promise((resolve)=>{
      try{
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = ()=>resolve(req.result);
        req.onerror = ()=>resolve(undefined);
      }catch(e){ resolve(undefined); }
    });
  });
}

function idbSet(key, value){
  return idbOpen().then(db=>{
    if(!db) return false;
    return new Promise((resolve)=>{
      try{
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = ()=>resolve(true);
        tx.onerror = ()=>resolve(false);
        tx.onabort = ()=>resolve(false);
      }catch(e){ resolve(false); }
    });
  });
}

function idbDelete(key){
  return idbOpen().then(db=>{
    if(!db) return false;
    return new Promise((resolve)=>{
      try{
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = ()=>resolve(true);
        tx.onerror = ()=>resolve(false);
      }catch(e){ resolve(false); }
    });
  });
}

function lsGet(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return undefined;
    return JSON.parse(raw);
  }catch(e){ return undefined; }
}

function lsSet(key, wrapped){
  try{
    localStorage.setItem(key, JSON.stringify(wrapped));
    return true;
  }catch(e){ return false; }
}

/* ============================================================
 * ★追加：データアクセス層（Repository）の抽象化
 * ------------------------------------------------------------
 * 【ベンダーロックイン回避のための設計方針】
 * アプリの他の部分（UIロジック・各機能）は、IndexedDBやlocalStorageを
 * 直接呼び出さず、必ずこの DataRepository（と、その薄いラッパーである
 * loadJSON / saveJSON / deleteKey）を経由してデータの読み書きを行います。
 *
 * これにより、将来バックエンドAPI（例：AWS API Gateway + DynamoDB）へ
 * 移行する場合も、書き換えが必要なのはこの DataRepository の内部実装
 * （get/set/remove の中身）だけで済みます。UIやビジネスロジック側の
 * コードには一切手を入れる必要がありません。
 *
 * 移行イメージ（将来、以下のようにこのオブジェクトの中身だけ差し替える）：
 *   async get(key, fallback){
 *     const res = await fetch(`${API_BASE_URL}/items/${encodeURIComponent(key)}`);
 *     if(!res.ok) return fallback;
 *     const { data } = await res.json();
 *     return data ?? fallback;
 *   }
 * ============================================================ */
const DataRepository = {
  async get(key, fallback){
    let wrapped = await idbGet(key);
    if(wrapped === undefined){
      wrapped = lsGet(key);
      if(wrapped !== undefined){
        idbSet(key, wrapped);
      }
    }
    if(wrapped === undefined || wrapped === null) return fallback;
    try{
      if(typeof wrapped === 'object' && 'v' in wrapped && 'data' in wrapped){
        return wrapped.data;
      }
      return wrapped;
    }catch(e){
      return fallback;
    }
  },

  async set(key, value){
    const wrapped = { v: STORAGE_VERSION, data: value };
    const okIdb = await idbSet(key, wrapped);
    const okLs = lsSet(key, wrapped);
    if(!okIdb && !okLs){
      warnStorageOnce('すみません。保存がうまく完了しませんでした。書いた言葉は消さず、少ししてからもう一度お試しください。');
      return false;
    }
    return true;
  },

  async remove(key){
    await idbDelete(key);
    try{ localStorage.removeItem(key); }catch(e){}
  }
};

// 既存コードとの互換用の薄いラッパー（呼び出し側は今までどおりでOK）
async function loadJSON(key, fallback){ return DataRepository.get(key, fallback); }
async function saveJSON(key, value){ return DataRepository.set(key, value); }
async function deleteKey(key){ return DataRepository.remove(key); }

/* ==========================================================================
 * 外部API連携（季節連動の新刊・新譜取得）
 * ---------------------------------------------------------------------
 * ・利用者が編纂机やチャットで綴った文章は、この処理を含め main.js のどこからも
 *   一切サーバー／外部APIへ送信しない。ここで外部に渡すのは「季節の言葉」と
 *   「棚（感情）のラベル」だけの検索キーワードのみ。
 * ・呼び出す先はどちらも公開・無料・APIキー不要のエンドポイント：
 *     - Google Books API（書籍）
 *     - iTunes Search API（音楽）
 * ・取得結果はその日1日ぶんだけ端末内（IndexedDB/localStorage）にキャッシュし、
 *   通信回数を抑える。取得に失敗した場合（オフライン・API側の障害等）は、
 *   既存の厳選済み静的データへ静かにフォールバックし、表示が壊れないようにする。
 * ========================================================================== */

const SEASON_QUERY_BY_MONTH = {
  1:  '冬 新春 雪',
  2:  '冬 梅 立春',
  3:  '春 桜 卒業',
  4:  '春 新生活 桜',
  5:  '新緑 五月晴れ',
  6:  '梅雨 紫陽花',
  7:  '夏 七夕 梅雨明け',
  8:  '夏 花火 夏休み',
  9:  '初秋 実り 夜長',
  10: '秋 紅葉 読書の秋',
  11: '晩秋 紅葉 冬支度',
  12: '冬 年末 クリスマス'
};

function currentSeasonWord(){
  const month = new Date().getMonth() + 1;
  return SEASON_QUERY_BY_MONTH[month] || '';
}

function todayStamp(){
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

// Google Books API から、季節＋棚のラベルに合う本を数冊取得する。
// 失敗時は null を返す（呼び出し側でフォールバック判定に使う）。
// opts.granularity: 'day'（毎日入れ替え・既定）または 'month'（月内は同じ結果で安定させる）
// opts.count: 何件返すか（取得したプールからランダムに選ぶ件数）
async function fetchSeasonalBooks(catLabel, extraWord, opts){
  opts = opts || {};
  const granularity = opts.granularity === 'month' ? 'month' : 'day';
  const count = opts.count || 1;
  try{
    const seasonWord = currentSeasonWord();
    const month = new Date().getMonth() + 1;
    const cacheKey = 'emotion-bookstore-bookapi-' + month + '-' + catLabel + '-' + (extraWord||'') + '-' + granularity;
    const cached = await loadJSON(cacheKey, null);
    const stampNow = granularity === 'month' ? String(month) : todayStamp();
    if(cached && cached.stamp === stampNow && Array.isArray(cached.items) && cached.items.length) return cached.items;

    const q = encodeURIComponent([seasonWord, catLabel, extraWord||''].filter(Boolean).join(' '));
    const url = 'https://www.googleapis.com/books/v1/volumes?q=' + q + '&maxResults=12&langRestrict=ja&country=JP';
    const res = await fetch(url, { method:'GET' });
    if(!res.ok) throw new Error('Google Books API response not ok: ' + res.status);
    const json = await res.json();
    const pool = (json.items || [])
      .filter(it=>it.volumeInfo && it.volumeInfo.title)
      .map(it=>{
        const vi = it.volumeInfo;
        return {
          title: vi.title || '',
          by: (vi.authors && vi.authors.length) ? vi.authors.join('、') : '著者不明',
          hook: (vi.description || '').slice(0, 70),
          infoLink: vi.infoLink || ''
        };
      });
    const items = shuffleArray(pool).slice(0, Math.max(count, 1));
    await saveJSON(cacheKey, { stamp: stampNow, items });
    return items;
  }catch(e){
    console.warn('fetchSeasonalBooks: falling back to static data', e);
    return null;
  }
}

// iTunes Search API から、季節＋棚のラベルに合う楽曲を数曲取得する。
// 失敗時は null を返す（呼び出し側でフォールバック判定に使う）。
async function fetchSeasonalMusic(catLabel){
  try{
    const seasonWord = currentSeasonWord();
    const cacheKey = 'emotion-bookstore-musicapi-' + (new Date().getMonth()+1) + '-' + catLabel;
    const cached = await loadJSON(cacheKey, null);
    const today = todayStamp();
    if(cached && cached.date === today && Array.isArray(cached.items)) return cached.items;

    const term = encodeURIComponent(seasonWord + ' ' + catLabel + ' 邦楽');
    const url = 'https://itunes.apple.com/search?term=' + term + '&country=jp&media=music&entity=song&limit=8&lang=ja_jp';
    const res = await fetch(url, { method:'GET' });
    if(!res.ok) throw new Error('iTunes Search API response not ok: ' + res.status);
    const json = await res.json();
    const items = (json.results || [])
      .filter(r=>r.trackName && r.artistName)
      .slice(0, 3)
      .map(r=>({
        title: r.trackName,
        artist: r.artistName,
        comment: r.collectionName || ''
      }));
    await saveJSON(cacheKey, { date: today, items });
    return items;
  }catch(e){
    console.warn('fetchSeasonalMusic: falling back to static data', e);
    return null;
  }
}

/* ==========================================================================
 * ★2026-07-19追加：任意設定の天気連動機能（既定OFF）。独立機能として追加しており、
 * 製本・本棚・編集・感情棚・助け舟・推薦・英語対応済み箇所・GA4の5イベントには
 * 一切変更を加えていない。
 * ---------------------------------------------------------------------
 * ・保存先は本棚（emotion-bookstore-library）やentryとは完全に分離した専用キー
 *   （WEATHER_SETTINGS_KEY／WEATHER_CACHE_KEY）。prefs（演出・言語等）にも混在させない。
 * ・地域設定は「主要地域から選ぶ」（プリセット10都市、WEATHER_REGIONS）と
 *   「現在地から設定」の2方式のみ。自由入力の都市検索・ジオコーディングAPIは使わない。
 * ・店内メニューでONにし、地域を設定した場合だけ動作する。ページ表示時・入店時に位置情報の
 *   許可を自動要求することは一切なく、navigator.geolocation の呼び出しは
 *   useCurrentLocationForWeather()（「現在地から設定」ボタンのクリックハンドラ）の中だけ。
 *   拒否・取得失敗・タイムアウトの場合も、書店の通常表示・全機能はそのまま維持される。
 * ・呼び出す先はAPIキー不要の公開エンドポイント（Open-Meteo, https://open-meteo.com/）。
 *   送るのは選択地域のプリセット座標、または現在地から概算化した緯度・経度だけ。
 *   本文・タイトル・写真・感情棚・本棚データ・栞・来店カードは一切含めない。正確な現在地座標は
 *   概算化した値に置き換えるのみで、恒久保存もしない。
 * ・取得結果は端末内（IndexedDB/localStorage）に60分だけキャッシュし、地域が変わった場合は
 *   キャッシュを無効化して再取得する。取得できない場合（タイムアウト・オフライン・不正
 *   レスポンス・APIエラー）は data-weather 属性を外し、通常表示へフォールバックする。
 *   Service Worker（sw.js）はfetchのレスポンスを一切cachesへ書き込まないため、天気APIの
 *   応答が恒久キャッシュされることもない。
 * ・天気状態は body[data-weather] を通じて見た目（CSS）だけに反映し、感情棚の選択・
 *   助け舟・推薦・本の内容・店主の返答など機能面には一切影響させない。GA4の新規送信もない。
 * ========================================================================== */

// ★2026-07-19 公開用リリースフラグ：天気連動機能の入口制御。
// 実ブラウザでのCSP・実API通信確認と、Open-Meteoの商用利用方針の決定が完了するまで false のまま公開する。
// false の間は：店内メニューの天気設定（#weatherSettings）を表示しない／#weatherBadgeを表示しない／
// 天気設定を読み込まない／天気APIへ通信しない／navigator.geolocationを呼ばない／
// 保存済みの天気設定がONでも通常表示を維持する。
// true へ変更すると、下の実装済み天気機能がそのまま復帰する（内部ロジックはこのフラグで変更されない）。
const WEATHER_FEATURE_ENABLED = false;

const WEATHER_SETTINGS_KEY = 'emotion-bookstore-weather-settings'; // 本棚・entryとは別の専用キー
const WEATHER_CACHE_KEY = 'emotion-bookstore-weather-cache';
const WEATHER_CACHE_MS = 60 * 60 * 1000; // 60分
const WEATHER_STATES = ['clear','cloudy','rain','snow','fog','storm'];

// ★2026-07-19 hotfix：APIベースURLを定数へ分離。現在はOpen-Meteoの無料エンドポイント
// （非商用利用向け）を直接呼んでいるが、将来サーバー側プロキシ（自前ドメインの中継先）へ
// 切り替える場合は、この定数を差し替えるだけで済む構成にしている。商用APIキーは
// フロントエンドへ直書きしない（この定数にもキーを含めない）。
const WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast';

// 主要地域プリセット（初期版では自由入力の都市検索は追加しない）。座標は都市中心のおおよその
// 位置で、いずれも個人の正確な位置情報ではない。
const WEATHER_REGIONS = [
  { id:'sapporo',   lat:43.06, lon:141.35, label:{ ja:'札幌', en:'Sapporo' } },
  { id:'sendai',    lat:38.27, lon:140.87, label:{ ja:'仙台', en:'Sendai' } },
  { id:'tokyo',     lat:35.68, lon:139.65, label:{ ja:'東京', en:'Tokyo' } },
  { id:'yokohama',  lat:35.44, lon:139.64, label:{ ja:'横浜', en:'Yokohama' } },
  { id:'nagoya',    lat:35.18, lon:136.91, label:{ ja:'名古屋', en:'Nagoya' } },
  { id:'kyoto',     lat:35.01, lon:135.77, label:{ ja:'京都', en:'Kyoto' } },
  { id:'osaka',     lat:34.69, lon:135.50, label:{ ja:'大阪', en:'Osaka' } },
  { id:'hiroshima', lat:34.40, lon:132.46, label:{ ja:'広島', en:'Hiroshima' } },
  { id:'fukuoka',   lat:33.59, lon:130.40, label:{ ja:'福岡', en:'Fukuoka' } },
  { id:'naha',      lat:26.21, lon:127.68, label:{ ja:'那覇', en:'Naha' } }
];

// 天気状態の表示名（バッジ用）。夜間（body.night）は一部の状態だけ夜向けの表記に変える
// （例：「東京・雨の夜」「Tokyo · Rainy night」）。
const WEATHER_STATE_LABEL = {
  clear:  { ja:{ day:'晴れ', night:'星空' },   en:{ day:'Clear', night:'Starry night' } },
  cloudy: { ja:{ day:'曇り', night:'曇り' },   en:{ day:'Cloudy', night:'Cloudy' } },
  rain:   { ja:{ day:'雨', night:'雨の夜' },   en:{ day:'Rain', night:'Rainy night' } },
  snow:   { ja:{ day:'雪', night:'雪の夜' },   en:{ day:'Snow', night:'Snowy night' } },
  fog:    { ja:{ day:'霧', night:'霧' },       en:{ day:'Fog', night:'Fog' } },
  storm:  { ja:{ day:'嵐', night:'嵐' },       en:{ day:'Storm', night:'Storm' } }
};

// weatherSettings：本棚・entryとは完全に分離した、天気連動専用の設定オブジェクト。
// enabled: ON/OFF（既定false）。source: 'region'（プリセット地域） | 'location'（現在地） | null。
// regionId: sourceが'region'の場合のWEATHER_REGIONS内のid。lat/lon: 取得に使う概算座標（画面には出さない）。
let weatherSettings = { enabled:false, source:null, regionId:null, lat:null, lon:null };

async function loadWeatherSettings(){
  const saved = await loadJSON(WEATHER_SETTINGS_KEY, null);
  if(saved && typeof saved === 'object'){
    weatherSettings = Object.assign({ enabled:false, source:null, regionId:null, lat:null, lon:null }, saved);
  }
}
async function saveWeatherSettings(){
  await saveJSON(WEATHER_SETTINGS_KEY, weatherSettings);
}

// 緯度・経度を概算化する（小数第1位に丸め＝約11km単位）。文章や本棚データとは結び付けない。
function roundWeatherCoord(v){
  return Math.round(v * 10) / 10;
}

// weather_code（WMO表記）を基準の状態へ大まかに分類する。
function weatherCodeBaseState(code){
  if(code === 95 || code === 96 || code === 99) return 'storm';
  if(code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return 'snow';
  if(code === 45 || code === 48) return 'fog';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'rain';
  if(code === 2 || code === 3) return 'cloudy';
  if(code === 0 || code === 1) return 'clear';
  return null;
}

// weather_code・cloud_cover・precipitation・snowfall・wind_speed_10m（現在＋直近3時間の予報）を
// clear／cloudy／rain／snow／fog／stormの6状態へ正規化する。
function normalizeWeatherState(current, upcoming){
  const points = [current].concat(upcoming || []);
  const codes = points.map(p=>p.code).filter(c=>c !== undefined && c !== null);
  const maxPrecip = Math.max(0, ...points.map(p=>Number(p.precip) || 0));
  const maxSnow = Math.max(0, ...points.map(p=>Number(p.snow) || 0));
  const maxWind = Math.max(0, ...points.map(p=>Number(p.wind) || 0));
  const cloudVals = points.map(p=>Number(p.cloud)).filter(c=>!isNaN(c));
  const avgCloud = cloudVals.length ? (cloudVals.reduce((a,b)=>a+b,0) / cloudVals.length) : 0;

  // 雷（悪天候）を最優先。コードが取れない場合も、強い降水＋強風の組み合わせはstorm相当とみなす。
  if(codes.some(c=>c===95||c===96||c===99)) return 'storm';
  if(maxPrecip >= 8 && maxWind >= 40) return 'storm';
  if(maxSnow > 0 || codes.some(c=>[71,73,75,77,85,86].includes(c))) return 'snow';
  if(codes.some(c=>c===45||c===48)) return 'fog';
  if(maxPrecip > 0.1 || codes.some(c=>[51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c))) return 'rain';
  if(avgCloud >= 55 || codes.some(c=>c===2||c===3)) return 'cloudy';
  // 上記のいずれにも該当しない場合は、weather_codeの基準分類（0/1=clear等）にフォールバックする。
  const baseFallback = codes.map(weatherCodeBaseState).find(s=>s);
  return baseFallback || 'clear';
}

// Open-Meteo（https://open-meteo.com/ ／APIキー不要・無料の公開天気API）から現在の状況と
// 直近3時間の予報を取得し、6状態のいずれかへ正規化して返す。リクエストに含めるのは緯度・経度と
// 天気取得に必要なパラメータのみ。失敗時はnullを返す（呼び出し側でフォールバック判定に使う）。
async function fetchWeatherState(lat, lon){
  // タイムアウト対策：AbortControllerが使える環境では8秒で打ち切り、
  // 応答が返らないまま処理が止まり続けないようにする（未対応環境では従来どおりfetchのみ行う）。
  let timeoutId = null;
  let controller = null;
  try{
    const fields = 'weather_code,cloud_cover,precipitation,snowfall,wind_speed_10m';
    const url = WEATHER_API_BASE
      + '?latitude=' + encodeURIComponent(lat)
      + '&longitude=' + encodeURIComponent(lon)
      + '&current=' + fields
      + '&hourly=' + fields
      + '&forecast_hours=3&timezone=auto';
    // プライバシー配慮：Cookie等の資格情報は送らない・リファラーも送らない・
    // ブラウザのHTTPキャッシュにも残さない（60分キャッシュはアプリ側の専用キーだけで管理する）。
    const fetchOpts = {
      method:'GET',
      credentials:'omit',
      referrerPolicy:'no-referrer',
      cache:'no-store'
    };
    if(typeof AbortController === 'function'){
      controller = new AbortController();
      fetchOpts.signal = controller.signal;
      timeoutId = setTimeout(()=>{ try{ controller.abort(); }catch(e){} }, 8000);
    }
    const res = await fetch(url, fetchOpts);
    if(timeoutId){ clearTimeout(timeoutId); timeoutId = null; }
    if(!res.ok) throw new Error('Open-Meteo forecast response not ok: ' + res.status);
    const json = await res.json();
    // ★2026-07-19 hotfix：応答形式の検証。currentが存在しない、またはcurrent.weather_codeが
    // 数値でない場合は不正レスポンスとして取得失敗（null）にする。空オブジェクト・空配列・
    // 必須項目欠落・JSON解析失敗を「clear（晴れ）」として扱わず、通常表示へフォールバックさせる。
    if(!json || typeof json !== 'object' || Array.isArray(json)){
      throw new Error('Open-Meteo response is not an object');
    }
    if(!json.current || typeof json.current !== 'object' || Array.isArray(json.current)){
      throw new Error('Open-Meteo response is missing "current"');
    }
    if(typeof json.current.weather_code !== 'number' || !isFinite(json.current.weather_code)){
      throw new Error('Open-Meteo response "current.weather_code" is not a number');
    }
    const cur = json.current;
    const hourly = json.hourly || {};
    const times = Array.isArray(hourly.time) ? hourly.time : [];
    const upcoming = times.slice(0, 3).map((_, i)=>({
      code: Array.isArray(hourly.weather_code) ? hourly.weather_code[i] : undefined,
      precip: Array.isArray(hourly.precipitation) ? hourly.precipitation[i] : 0,
      snow: Array.isArray(hourly.snowfall) ? hourly.snowfall[i] : 0,
      cloud: Array.isArray(hourly.cloud_cover) ? hourly.cloud_cover[i] : undefined,
      wind: Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m[i] : 0
    }));
    const current = {
      code: cur.weather_code,
      precip: cur.precipitation || 0,
      snow: cur.snowfall || 0,
      cloud: cur.cloud_cover,
      wind: cur.wind_speed_10m || 0
    };
    return normalizeWeatherState(current, upcoming);
  }catch(e){
    console.warn('fetchWeatherState: falling back to the regular view', e);
    return null;
  }finally{
    if(timeoutId) clearTimeout(timeoutId);
  }
}

// 天気状態をbody[data-weather]へ反映し、天気バッジの表示も同時に更新する
// （未設定・取得失敗時は属性を外し、バッジも隠して通常表示へフォールバックする）。
function applyWeatherState(state){
  if(state && WEATHER_STATES.includes(state)){
    document.body.setAttribute('data-weather', state);
  }else{
    document.body.removeAttribute('data-weather');
  }
  if(typeof updateWeatherBadge === 'function') updateWeatherBadge(state);
}

// 天気連動がONで地域（緯度・経度）が設定されている場合だけ、キャッシュを確認したうえで
// 必要なら取得する。60分以内かつ同じ地域ならキャッシュを使い、地域変更時・force指定時・
// キャッシュ期限切れ時は再取得する。
async function refreshWeatherIfNeeded(force){
  if(!weatherSettings.enabled || weatherSettings.lat == null || weatherSettings.lon == null){
    applyWeatherState(null);
    return;
  }
  const cached = await loadJSON(WEATHER_CACHE_KEY, null);
  const now = Date.now();
  const sameLocation = !!(cached && cached.lat === weatherSettings.lat && cached.lon === weatherSettings.lon);
  if(!force && sameLocation && cached && (now - cached.fetchedAt) < WEATHER_CACHE_MS){
    applyWeatherState(cached.state);
    return;
  }
  const state = await fetchWeatherState(weatherSettings.lat, weatherSettings.lon);
  if(state){
    await saveJSON(WEATHER_CACHE_KEY, { lat: weatherSettings.lat, lon: weatherSettings.lon, state, fetchedAt: now });
    applyWeatherState(state);
  }else{
    // 取得失敗（オフライン・タイムアウト・不正な形式・APIエラー）時は、古いキャッシュへは
    // フォールバックせず、data-weatherを解除して通常表示へ戻す（受入条件どおり）。
    // ★2026-07-19 hotfix：古いキャッシュ自体も削除する。これにより、失敗後にページを
    // 再読み込みしても古い天気が復活しない。
    try{ await deleteKey(WEATHER_CACHE_KEY); }catch(e){}
    const statusEl = document.getElementById('weatherStatus');
    if(statusEl) statusEl.textContent = t('weatherStatusFetchFail');
    applyWeatherState(null);
  }
}

// 選択中の地域（プリセット名）または「現在地周辺」のラベルだけを返す。緯度・経度は画面へは出さない。
function weatherLocationDisplayLabel(){
  const lang = appLang === 'en' ? 'en' : 'ja';
  if(weatherSettings.source === 'region'){
    const region = WEATHER_REGIONS.find(r=>r.id === weatherSettings.regionId);
    if(region) return region.label[lang];
  }
  if(weatherSettings.source === 'location') return t('weatherNearCurrentLocation');
  return '';
}

// 天気状態の表示名（昼／夜で一部表記を変える）。
function weatherStateLabel(state){
  if(!state || !WEATHER_STATE_LABEL[state]) return '';
  const lang = appLang === 'en' ? 'en' : 'ja';
  const isNight = document.body.classList.contains('night');
  return WEATHER_STATE_LABEL[state][lang][isNight ? 'night' : 'day'];
}

// 店内上部の小さな天気バッジ（例：「東京・雨の夜」「Tokyo · Rainy night」）。
// 週間予報・数値の一覧は表示しない。地域または天気状態のどちらかが欠けている場合は表示しない。
function updateWeatherBadge(state){
  const badge = document.getElementById('weatherBadge');
  if(!badge) return;
  if(!weatherSettings.enabled || !state){
    badge.classList.add('hidden');
    badge.textContent = '';
    closeWeatherDetail();
    return;
  }
  const loc = weatherLocationDisplayLabel();
  const stateLabel = weatherStateLabel(state);
  if(!loc || !stateLabel){
    badge.classList.add('hidden');
    badge.textContent = '';
    return;
  }
  const sep = appLang === 'en' ? ' · ' : '・';
  badge.textContent = loc + sep + stateLabel;
  badge.classList.remove('hidden');
}

function formatWeatherUpdatedTime(ms){
  try{
    const locale = appLang === 'en' ? 'en-US' : 'ja-JP';
    return new Intl.DateTimeFormat(locale, { hour:'2-digit', minute:'2-digit' }).format(new Date(ms));
  }catch(e){ return ''; }
}

// バッジを押すと、現在の地域・天気状態・最終更新時刻の3行だけを表示する（予報サイトのような
// 週間予報・大量の数値は並べない）。
async function renderWeatherDetailPopover(){
  const pop = document.getElementById('weatherDetailPopover');
  if(!pop) return;
  const cached = await loadJSON(WEATHER_CACHE_KEY, null);
  const loc = weatherLocationDisplayLabel();
  const stateLabel = cached ? weatherStateLabel(cached.state) : '';
  const updatedText = (cached && cached.fetchedAt) ? formatWeatherUpdatedTime(cached.fetchedAt) : '';
  pop.innerHTML = '';
  [
    [t('weatherDetailRegion'), loc || '—'],
    [t('weatherDetailState'), stateLabel || '—'],
    [t('weatherDetailUpdated'), updatedText || '—']
  ].forEach(([label, value])=>{
    const row = document.createElement('div');
    row.className = 'weather-detail-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'weather-detail-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'weather-detail-value';
    valueEl.textContent = value;
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    pop.appendChild(row);
  });
}

function closeWeatherDetail(){
  const pop = document.getElementById('weatherDetailPopover');
  if(pop) pop.classList.add('hidden');
  const badge = document.getElementById('weatherBadge');
  if(badge) badge.setAttribute('aria-expanded', 'false');
}

function toggleWeatherDetail(){
  const pop = document.getElementById('weatherDetailPopover');
  const badge = document.getElementById('weatherBadge');
  if(!pop) return;
  const willShow = pop.classList.contains('hidden');
  if(willShow){
    renderWeatherDetailPopover();
    pop.classList.remove('hidden');
    if(badge) badge.setAttribute('aria-expanded', 'true');
  }else{
    pop.classList.add('hidden');
    if(badge) badge.setAttribute('aria-expanded', 'false');
  }
}

// ★2026-07-19 hotfix：ポップオーバーの閉じ方を追加する（アクセシビリティ）。
// Escapeキー、またはポップオーバー・バッジの外側をクリック／タップした場合に閉じる。
// リスナーはdocumentへ1回だけ登録し、ポップオーバーが閉じている間は何もしない。
function setupWeatherDetailDismissHandlers(){
  document.addEventListener('keydown', (ev)=>{
    if(ev.key !== 'Escape') return;
    const pop = document.getElementById('weatherDetailPopover');
    if(pop && !pop.classList.contains('hidden')) closeWeatherDetail();
  });
  document.addEventListener('click', (ev)=>{
    const pop = document.getElementById('weatherDetailPopover');
    if(!pop || pop.classList.contains('hidden')) return;
    const badge = document.getElementById('weatherBadge');
    const target = ev.target;
    if(pop.contains(target)) return;
    if(badge && badge.contains(target)) return; // バッジ自体のクリックはtoggleWeatherDetailに任せる
    closeWeatherDetail();
  });
}

// ★2026-07-19 hotfix：言語切替時に、天気バッジ（地域名・状態名・区切り文字）と、
// 開いている場合は詳細ポップオーバーも、APIへの再取得なしで即時再描画する。
// 現在の状態はbody[data-weather]から読み取る（キャッシュ・通信には触れない）。
function refreshWeatherLanguageViews(){
  const state = document.body.getAttribute('data-weather');
  if(typeof updateWeatherBadge === 'function') updateWeatherBadge(state || null);
  const pop = document.getElementById('weatherDetailPopover');
  if(pop && !pop.classList.contains('hidden')){
    renderWeatherDetailPopover();
  }
}

// 店内メニューの天気連動トグル・地域選択・状態文の表示を、weatherSettingsの現在値へ合わせて更新する。
function updateWeatherUI(){
  const btn = document.getElementById('weatherToggle');
  if(btn){
    btn.textContent = t(weatherSettings.enabled ? 'weatherToggleOn' : 'weatherToggleOff');
    btn.classList.toggle('on', weatherSettings.enabled);
  }
  const row = document.getElementById('weatherRegionRow');
  if(row) row.classList.toggle('hidden', !weatherSettings.enabled);
  const sel = document.getElementById('weatherRegionSelect');
  if(sel){
    const lang = appLang === 'en' ? 'en' : 'ja';
    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('weatherRegionSelectPlaceholder');
    sel.appendChild(placeholder);
    WEATHER_REGIONS.forEach(r=>{
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.label[lang];
      sel.appendChild(opt);
    });
    sel.value = (weatherSettings.source === 'region' && weatherSettings.regionId) ? weatherSettings.regionId : '';
  }
  updateWeatherStatusText();
  if(!weatherSettings.enabled) updateWeatherBadge(null);
}

function updateWeatherStatusText(){
  const el = document.getElementById('weatherStatus');
  if(!el) return;
  if(!weatherSettings.enabled){ el.textContent = t('weatherStatusOff'); return; }
  if(weatherSettings.lat == null || weatherSettings.lon == null){ el.textContent = t('weatherStatusNoRegion'); return; }
  const loc = weatherLocationDisplayLabel();
  el.textContent = loc ? t('weatherStatusUsingRegion').replace('{label}', loc) : t('weatherStatusNoRegion');
}

// 天気連動トグルのクリックハンドラ。位置情報は一切要求しない（既に設定済みの地域があれば
// その座標で取得を試み、なければ地域未設定の案内文を表示するだけ）。
async function toggleWeatherEnabled(){
  weatherSettings.enabled = !weatherSettings.enabled;
  await saveWeatherSettings();
  updateWeatherUI();
  if(weatherSettings.enabled){
    await refreshWeatherIfNeeded(false);
  }else{
    applyWeatherState(null);
  }
}

// 「主要地域から選ぶ」プルダウンのonchangeハンドラ。プリセットの緯度・経度をそのまま使う
// （ジオコーディングAPIは呼ばない）。
async function onWeatherRegionSelectChange(regionId){
  const region = WEATHER_REGIONS.find(r=>r.id === regionId);
  if(!region) return;
  weatherSettings.source = 'region';
  weatherSettings.regionId = region.id;
  weatherSettings.lat = region.lat;
  weatherSettings.lon = region.lon;
  await saveWeatherSettings();
  const sel = document.getElementById('weatherRegionSelect');
  if(sel) sel.value = region.id;
  updateWeatherStatusText();
  await refreshWeatherIfNeeded(true);
}

// 「現在地から設定」ボタンのクリックハンドラ。navigator.geolocationを呼ぶのはここだけで、
// ページ表示時・入店時や他の処理からは一切呼び出さない。取得した緯度・経度はここで概算化してから
// 保存し、元の詳細な位置情報は保持しない。拒否・取得失敗・タイムアウトでも通常表示を維持する。
function useCurrentLocationForWeather(){
  const statusEl = document.getElementById('weatherStatus');
  if(!navigator.geolocation){
    if(statusEl) statusEl.textContent = t('weatherStatusLocationFail');
    return;
  }
  if(statusEl) statusEl.textContent = t('weatherStatusLocating');
  navigator.geolocation.getCurrentPosition(
    async (pos)=>{
      weatherSettings.source = 'location';
      weatherSettings.regionId = null;
      weatherSettings.lat = roundWeatherCoord(pos.coords.latitude);
      weatherSettings.lon = roundWeatherCoord(pos.coords.longitude);
      await saveWeatherSettings();
      updateWeatherUI();
      await refreshWeatherIfNeeded(true);
    },
    ()=>{ if(statusEl) statusEl.textContent = t('weatherStatusLocationFail'); },
    { enableHighAccuracy:false, timeout:10000, maximumAge:0 }
  );
}

const PURIFY_LOG_KEY = 'emotion-bookstore-purify-log';

// ★「気になる」機能：棚・寄り道・レコード棚で紹介した本や音楽を、あとで見返せるように
//   端末内（IndexedDB/localStorage）だけに保存する。会員登録・ログインは不要。
const FAVORITES_KEY = 'emotion-bookstore-favorites';
let favoritesCache = [];

function favKeyOf(type, title, by){
  return type + '::' + title + '::' + (by || '');
}

function isFavorited(type, title, by){
  const key = favKeyOf(type, title, by);
  return favoritesCache.some(f => favKeyOf(f.type, f.title, f.by) === key);
}

async function toggleFavorite(type, title, by, category, extra){
  const key = favKeyOf(type, title, by);
  const idx = favoritesCache.findIndex(f => favKeyOf(f.type, f.title, f.by) === key);
  let nowFav;
  if(idx >= 0){
    favoritesCache.splice(idx, 1);
    nowFav = false;
  }else{
    favoritesCache.push({ type, title, by: by || '', category: category || '', extra: extra || '', addedAt: new Date().toISOString() });
    nowFav = true;
  }
  await saveJSON(FAVORITES_KEY, favoritesCache);
  updateFavoritesBtnLabel();
  return nowFav;
}

// ★追加：「気になる」の総数を、本棚ページのボタンに常時表示する（押した先がどこにあるか一目でわかるように）
function updateFavoritesBtnLabel(){
  const btn = document.getElementById('viewFavoritesBtn');
  if(!btn) return;
  const base = t('favListBtn');
  btn.textContent = favoritesCache.length ? base + `（${favoritesCache.length}）` : base;
}

function favBtnHtml(type, title, by, category, extra){
  if(!title) return '';
  const fav = isFavorited(type, title, by);
  const label = fav ? t('favBtnLabelOn') : t('favBtnLabelOff');
  return `<button type="button" class="fav-btn${fav ? ' is-fav' : ''}" data-fav-type="${escapeHtml(type)}" data-fav-title="${escapeHtml(title)}" data-fav-by="${escapeHtml(by || '')}" data-fav-category="${escapeHtml(category || '')}" data-fav-extra="${escapeHtml((extra || '').slice(0, 80))}" aria-pressed="${fav}">${escapeHtml(label)}</button>`;
}

document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.fav-btn');
  if(!btn) return;
  e.preventDefault();
  const { favType, favTitle, favBy, favCategory, favExtra } = btn.dataset;
  const nowFav = await toggleFavorite(favType, favTitle, favBy, favCategory, favExtra);
  if(btn.closest('#favoritesOverlay')){
    showFavorites();
    return;
  }
  document.querySelectorAll('.fav-btn').forEach(b=>{
    if(b.dataset.favType === favType && b.dataset.favTitle === favTitle && (b.dataset.favBy || '') === (favBy || '')){
      b.classList.toggle('is-fav', nowFav);
      b.setAttribute('aria-pressed', String(nowFav));
      b.textContent = nowFav ? t('favBtnLabelOn') : t('favBtnLabelOff');
    }
  });
  if(typeof buzz === 'function') buzz(6);
});

function buildFavoritesOverlay(){
  let overlay = document.getElementById('favoritesOverlay');
  if(overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'favoritesOverlay';
  overlay.className = 'purify-log-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', t('favOverlayTitle'));
  overlay.innerHTML = `
    <div class="purify-log-card">
      <button type="button" class="purify-log-close" id="favoritesClose" aria-label="${escapeHtml(t('closeBtn'))}">×</button>
      <p class="purify-log-kicker">${escapeHtml(t('favOverlayTitle'))}</p>
      <div class="purify-log-list" id="favoritesList"></div>
      <div class="purify-log-actions">
        <button type="button" class="purify-log-close-btn" id="favoritesCloseBtn">${escapeHtml(t('closeBtn'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{
    if(e.target.id === 'favoritesOverlay') hideFavoritesOverlay();
  });
  const closeX = overlay.querySelector('#favoritesClose');
  if(closeX) closeX.onclick = hideFavoritesOverlay;
  const closeBtn = overlay.querySelector('#favoritesCloseBtn');
  if(closeBtn) closeBtn.onclick = hideFavoritesOverlay;
  return overlay;
}

function hideFavoritesOverlay(){
  const overlay = document.getElementById('favoritesOverlay');
  if(overlay) overlay.classList.add('hidden');
}

async function showFavorites(){
  favoritesCache = await loadJSON(FAVORITES_KEY, []);
  const overlay = buildFavoritesOverlay();
  const list = document.getElementById('favoritesList');
  if(list){
    if(favoritesCache.length === 0){
      list.innerHTML = `<p class="purify-log-empty">${escapeHtml(t('favEmpty'))}</p>`;
    }else{
      list.innerHTML = favoritesCache.slice().reverse().map(f=>{
        const cat = CATEGORIES.find(c=>c.id===f.category);
        const label = cat ? categoryLabelFor(cat) : '';
        const q5 = f.title + ' ' + (f.by || '');
        const isMusic = f.type === 'music';
        const links = isMusic
          ? `<a href="https://open.spotify.com/search/${encodeURIComponent(q5)}" target="_blank" rel="noopener">Spotify</a> <a href="https://music.apple.com/jp/search?term=${encodeURIComponent(q5)}" target="_blank" rel="noopener">Apple Music</a> <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(q5)}" target="_blank" rel="noopener">YouTube</a>`
          : `<a href="${amazonSearchUrl(q5)}" target="_blank" rel="noopener">Amazon</a> <a href="${rakutenSearchUrl(q5)}" target="_blank" rel="noopener">${appLang === 'en' ? 'Rakuten' : '楽天'}</a>`;
        return `<div class="purify-log-entry">
          <p class="purify-log-meta"><span class="meta-type-tag ${isMusic ? 'is-music' : 'is-book'}">${isMusic ? (appLang === 'en' ? 'Song' : '曲') : (appLang === 'en' ? 'Book' : '本')}</span> ${escapeHtml(label)}</p>
          <p class="purify-log-text"><span class="work-title">${escapeHtml(f.title)}${f.by ? ' — ' + escapeHtml(f.by) : ''}</span></p>
          <p class="field-hint">${links}</p>
          <button type="button" class="fav-btn is-fav" data-fav-type="${escapeHtml(f.type)}" data-fav-title="${escapeHtml(f.title)}" data-fav-by="${escapeHtml(f.by || '')}" data-fav-category="${escapeHtml(f.category || '')}" data-fav-extra="">★ ${escapeHtml(t('favRemoveBtn'))}</button>
        </div>`;
      }).join('');
    }
  }
  overlay.classList.remove('hidden');
}

async function exportDiaryText(){
  const lib = await loadJSON('emotion-bookstore-library', []);
  const purifyLog = await loadJSON(PURIFY_LOG_KEY, []);
  const shiori = await loadJSON('emotion-bookstore-shiori', null);
  const lines = [];
  lines.push('『みんなの感情書店』 わたしの記録');
  lines.push('書き出した日：' + new Date().toLocaleString('ja-JP'));
  lines.push('='.repeat(40));
  lines.push('');
  lines.push('【本棚の物語】 ' + lib.length + '冊');
  lines.push('');
  lib.forEach((e, i)=>{
    const cat = CATEGORIES.find(c=>c.id===e.category);
    lines.push('--- ' + (i+1) + '冊目 ---');
    lines.push('タイトル：' + e.title);
    // ★Step4：unfiledは「棚：未選択」と出力する（生の'unfiled'や「棚：棚：未選択」にしない）
    lines.push('棚：' + ((e.category === UNFILED_CATEGORY_ID) ? '未選択' : (cat ? cat.label : (e.category || ''))));
    lines.push('日付：' + (e.date ? new Date(e.date).toLocaleDateString('ja-JP') : '不明'));
    if(e.sealed) lines.push('（以前を振り返って綴った一冊）');
    lines.push(e.story);
    if(e.note) lines.push('店主のことば：' + e.note);
    // ★Hotfix4-8追加：関連するXの投稿URLをテキスト書き出しにも含める。
    if(e.tweetUrl) lines.push('関連するXの投稿：' + e.tweetUrl);
    lines.push('');
  });
  lines.push('【手放した気持ちの記録】 ' + purifyLog.length + '件');
  lines.push('');
  purifyLog.forEach((p, i)=>{
    const cat = CATEGORIES.find(c=>c.id===p.category);
    lines.push('--- ' + (i+1) + '件目（' + (cat ? cat.label : p.category) + '） ' + new Date(p.date).toLocaleDateString('ja-JP') + ' ---');
    lines.push(p.text);
    lines.push('');
  });
  if(shiori && shiori.text){
    lines.push('【最後に受け取った栞】');
    lines.push(shiori.text);
  }
  const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `感情書店の記録_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

// ★追加：表計算ソフト（Excel／Googleスプレッドシート等）で開けるCSV形式の書き出し。
// 「DBをCSVとかで吐き出せるのか」というフィードバックへの直接対応。
function csvEscape(value){
  const s = (value === null || value === undefined) ? '' : String(value);
  if(/[",\n\r]/.test(s)){
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
async function exportDiaryCsv(){
  const lib = await loadJSON('emotion-bookstore-library', []);
  const purifyLog = await loadJSON(PURIFY_LOG_KEY, []);
  const rows = [];
  // ★Hotfix4-8追加：関連するXの投稿URL列をCSV書き出しにも含める。
  rows.push(['種別','通し番号','タイトル','棚','日付','振り返り','本文','店主のことば','関連するXの投稿']);
  lib.forEach((e, i)=>{
    const cat = CATEGORIES.find(c=>c.id===e.category);
    rows.push([
      '本棚の物語',
      i + 1,
      e.title || '',
      // ★Step4：unfiledはCSVのカテゴリ列に「未選択」と出力する（生の'unfiled'を出さない）
      (e.category === UNFILED_CATEGORY_ID) ? '未選択' : (cat ? cat.label : (e.category || '')),
      e.date ? new Date(e.date).toLocaleDateString('ja-JP') : '',
      e.sealed ? 'はい' : '',
      e.story || '',
      e.note || '',
      e.tweetUrl || ''
    ]);
  });
  purifyLog.forEach((p, i)=>{
    const cat = CATEGORIES.find(c=>c.id===p.category);
    rows.push([
      '手放した気持ち',
      i + 1,
      '',
      cat ? cat.label : (p.category || ''),
      p.date ? new Date(p.date).toLocaleDateString('ja-JP') : '',
      '',
      p.text || '',
      '',
      ''
    ]);
  });
  const csvBody = rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
  // Excelでの文字化け防止のためUTF-8 BOMを付与
  const blob = new Blob(['﻿' + csvBody], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `感情書店の記録_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

const NEGATIVE_SHELVES = ['moyamoya','ushirometai','kuyashii','kodoku','aseri','shitto','hazukashii','gakkari','ikari','kanashii','fuan'];

function openPurify(shelfId){
  const overlay = document.getElementById('purifyOverlay');
  if(!overlay) return;
  overlay.dataset.shelf = shelfId;
  const lead = document.getElementById('purifyLead');
  const input = document.getElementById('purifyInput');
  const msg = document.getElementById('purifyMsg');
  const btn = document.getElementById('purifyBtn');
  if(lead) lead.textContent = PURIFY_LEADS[shelfId] || 'その気持ちを、そのまま書き出してみてください。';
  if(input){
    input.value = '';
    input.classList.remove('dissolving');
    input.style.display = '';
    input.disabled = false;
  }
  if(btn){
    btn.disabled = false;
    btn.textContent = t('purifyBtn');
    btn.dataset.stage = 'input';
  }
  if(msg){
    msg.classList.add('hidden');
    msg.textContent = '';
  }
  overlay.classList.remove('hidden');
  if(input) setTimeout(()=>input.focus(), 100);
}

function closePurify(){
  const overlay = document.getElementById('purifyOverlay');
  if(overlay) overlay.classList.add('hidden');
}

const btnPurifyClose = document.getElementById('purifyClose');
if(btnPurifyClose) btnPurifyClose.onclick = closePurify;

const overlayPurify = document.getElementById('purifyOverlay');
if(overlayPurify) overlayPurify.addEventListener('click', (e)=>{
  if(e.target.id === 'purifyOverlay') closePurify();
});

const btnPurify = document.getElementById('purifyBtn');
if(btnPurify) btnPurify.onclick = async ()=>{
  const btn = document.getElementById('purifyBtn');
  if(btn.dataset.stage === 'done'){
    closePurify();
    return;
  }
  const input = document.getElementById('purifyInput');
  const msg = document.getElementById('purifyMsg');
  if(!input.value.trim()){
    closePurify();
    return;
  }
  btn.disabled = true;
  input.disabled = true;
  buzz(12);
  const shelfId = document.getElementById('purifyOverlay').dataset.shelf || '';
  const logEntry = { category: shelfId, text: input.value.trim(), date: new Date().toISOString() };
  loadJSON(PURIFY_LOG_KEY, []).then(log=>{
    log.push(logEntry);
    saveJSON(PURIFY_LOG_KEY, log);
  });
  if(prefs.motion){
    input.classList.add('dissolving');
    await wait(1000);
  }
  input.value = '';
  input.style.display = 'none';
  if(msg){
    msg.textContent = pickByStyle(PURIFY_CLOSING, PURIFY_CLOSING_TSUNDERE);
    msg.classList.remove('hidden');
  }
  btn.textContent = t('closeBtn');
  btn.dataset.stage = 'done';
  btn.disabled = false;
};

function buildPurifyLogOverlay(){
  let overlay = document.getElementById('purifyLogOverlay');
  if(overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'purifyLogOverlay';
  overlay.className = 'purify-log-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', t('purifyLogAriaLabel'));
  overlay.innerHTML = `
    <div class="purify-log-card">
      <button type="button" class="purify-log-close" id="purifyLogClose" aria-label="${escapeHtml(t('closeBtn'))}">×</button>
      <p class="purify-log-kicker">${escapeHtml(t('purifyLogAriaLabel'))}</p>
      <div class="purify-log-list" id="purifyLogList"></div>
      <div class="purify-log-actions">
        <button type="button" class="purify-log-hide" id="purifyLogHideBtn">${escapeHtml(t('purifyLogHideBtn'))}</button>
        <button type="button" class="purify-log-close-btn" id="purifyLogCloseBtn">${escapeHtml(t('closeBtn'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{
    if(e.target.id === 'purifyLogOverlay') hidePurifyLogOverlay();
  });
  const closeX = overlay.querySelector('#purifyLogClose');
  if(closeX) closeX.onclick = hidePurifyLogOverlay;
  const closeBtn = overlay.querySelector('#purifyLogCloseBtn');
  if(closeBtn) closeBtn.onclick = hidePurifyLogOverlay;
  const hideBtn = overlay.querySelector('#purifyLogHideBtn');
  if(hideBtn) hideBtn.onclick = ()=>{
    const list = document.getElementById('purifyLogList');
    if(list) list.innerHTML = `<p class="purify-log-empty">${escapeHtml(t('purifyLogHiddenNote'))}</p>`;
  };
  return overlay;
}

function hidePurifyLogOverlay(){
  const overlay = document.getElementById('purifyLogOverlay');
  if(overlay) overlay.classList.add('hidden');
}

async function showPurifyLog(){
  const log = await loadJSON(PURIFY_LOG_KEY, []);
  const overlay = buildPurifyLogOverlay();
  const list = document.getElementById('purifyLogList');
  if(list){
    if(log.length === 0){
      list.innerHTML = `<p class="purify-log-empty">${escapeHtml(t('purifyLogEmptyNote'))}</p>`;
    }else{
      list.innerHTML = log.slice().reverse().map(p=>{
        const cat = CATEGORIES.find(c=>c.id===p.category);
        const label = cat ? categoryLabelFor(cat) : (p.category || '');
        const dateStr = new Date(p.date).toLocaleDateString(appLang === 'en' ? 'en-US' : 'ja-JP');
        const safeText = escapeHtml(p.text || '');
        return `<div class="purify-log-entry">
          <p class="purify-log-meta">${escapeHtml(dateStr)}　/　${escapeHtml(label)}</p>
          <p class="purify-log-text">${safeText}</p>
        </div>`;
      }).join('');
    }
  }
  overlay.classList.remove('hidden');
}

const PERSONA_TRIGGERS = [
  { persona:'jobhunter',   patterns:['就活','面接','エントリーシート','ES','説明会','内定','選考','企業研究'] },
  { persona:'student',     patterns:['学校','授業','宿題','部活','テスト','受験','クラス','先生','高校','中学'] },
  { persona:'mother',      patterns:['育児','ワンオペ','子ども','子供','ママ友','保育園','夜泣き','旦那'] },
  { persona:'career_woman', patterns:['キャリア','女性として','管理職','女子会','産休','昇進'] },
  { persona:'young_worker', patterns:['新卒','入社','新人','若手','社会人1年目','社会人２年目'] },
  { persona:'middle_worker',patterns:['部下','上司','板挟み','マネージャー','中間管理職','後輩指導'] },
  { persona:'romance',     patterns:['彼氏','彼女','恋人','失恋','片思い','浮気','デート','LINEの返信'] },
  { persona:'creater',     patterns:['創作','絵師','小説','同人','締め切り','イラスト','原稿'] },
  { persona:'resting',     patterns:['無職','休職','退職','ニート','療養中','休養中'] },
  { persona:'sensitive',   patterns:['繊細','HSP','敏感','眠れない','深夜','夜中'] },
  { persona:'freelance',   patterns:['フリーランス','自営業','個人事業','クライアント','納品','案件','受注'] },
  { persona:'caregiver',   patterns:['介護','看病','付き添い','ケアマネ','老人ホーム'] },
  { persona:'second_life',  patterns:['定年','老後','年金','孫が','セカンドライフ','シニア'] },
  { persona:'illness',     patterns:['闘病','持病','通院','入院中','治療中','検査結果','リハビリ','体調が優れ'] },
  { persona:'jobchanger',  patterns:['転職','転職活動','今の会社を辞め','キャリアチェンジ','異業種','転職エージェント','退職を考え'] }
];

function detectCounselingPersona(text){
  // ★Step3：利用者本文からの人物像推測を停止（本文は読まない）。
  // 関数契約は維持し、来店カードで利用者が明示的に選んだ立場か、既定値のみを返す。
  return (userProfile && userProfile.persona) || 'young_worker';
}

const STATE_TRIGGERS = [
  { state:'menbure',  patterns:['メンブレ','限界','崩れ','折れ','涙が止まらない','壊れそう','パニック'] },
  { state:'kagiaka',  patterns:['鍵垢','裏アカ','本音','誰にも言えない','言えない本音','愚痴'] },
  { state:'capaover', patterns:['キャパオーバー','キャパ超え','溢れ','パンク','抱えきれ','多すぎ'] },
  { state:'darui',    patterns:['だるい','めんどくさい','やる気が出ない','動けない','サボり'] },
  { state:'oshi',     patterns:['推し','担当','箱推し','ライブ','担降り','布教'] },
  { state:'yami',     patterns:['病んで','病む','消えたい','真っ暗','どん底','孤独','苦しい'] }
];

function detectCounselingState(text, fallbackShelfId){
  // ★Step3：利用者本文からの状態推測を停止（本文・棚は読まない）。関数契約は固定値で維持。
  return 'darui';
}

function counselingFlavorReply(text, fallbackShelfId){
  // ★Step3：本文に応じたカウンセリング風応答を停止。常にnull（＝使用しない）を返す。
  return null;
}

const PERSONAL_INFO_PATTERNS = [/\d{2,4}-\d{3,4}-\d{3,4}/, /[\w.+-]+@[\w-]+\.[\w.-]+/, /(本名|住所|電話番号|LINE\s*ID)[:：]/];
const ATTACK_WORDS = ['死ね','殺す','消えろ','ぶっ殺'];
const CRISIS_STORY_PATTERNS = ['死にたい','消えたい','自分を傷つけ','リストカット'];

function detectShelfFromText(text, minScore){
  // ★Step3：利用者本文からの棚（感情）推測を停止。本文は読まず、常にnullを返す（関数契約は維持）。
  return null;
}

function localCurate(title, story, chosenId){
  // ★Step3：ブランド憲法に基づき、本文・題名の内容判定（危機ワード・キーワード一致による
  // 棚提案・ランダムな店主メモを含む）をすべて停止。本文・題名は一切読まない。
  // 関数契約（引数・返り値の形）は維持し、常に固定結果を返す。
  // 専門の相談窓口の案内は、guide.html#support への常設導線として提供する。
  return { approved:true, category:chosenId, note:'', reason:'' };
}

// ★2026-07-19 I：栞テンプレートを添字で選び、表示言語に合わせて日英を組み立てる。
// 保存形式は従来の{date, text}へ{tplIdx, catId}を追加するだけで、既存保存データもそのまま読める。
function shioriTextFor(tplIdx, catId){
  const cat = CATEGORIES.find(c=>c.id === catId);
  const label = cat ? categoryLabelFor(cat) : (appLang === 'en' ? 'you' : 'あなた');
  const pool = (appLang === 'en' && typeof SHIORI_TEMPLATES_EN !== 'undefined') ? SHIORI_TEMPLATES_EN : SHIORI_TEMPLATES;
  const tpl = pool[tplIdx % pool.length];
  return tpl.replace('{cat}', label);
}
function localShiori(topLabel){
  const t = SHIORI_TEMPLATES[Math.floor(Math.random()*SHIORI_TEMPLATES.length)];
  return t.replace('{cat}', topLabel);
}

// ★2026-07-19変更：天気連動の設定（weatherSettings）は本棚・prefsとは完全に分離した専用の
// localStorageキー（WEATHER_SETTINGS_KEY）で管理する。prefsへは混在させない。
let prefs = { motion:true, sound:false, keeperStyle:'gentle' };

// ★Step3：店主は「まな」に一本化。ツンデレ店主（綴）の選択・表示は停止。
// 既存の保存値が 'tsundere' でもエラーなく gentle として扱う（保存データは削除しない）。
// ツンデレ用の文言配列等は未使用のまま残置（スキーマ・データ非破壊）。
function isTsundere(){ return false; }
function pickByStyle(gentleArr, tsundereArr){
  const pool = (isTsundere() && Array.isArray(tsundereArr) && tsundereArr.length) ? tsundereArr : gentleArr;
  return pool[Math.floor(Math.random()*pool.length)];
}

// ★Step3：店主名は常に「まな」。（旧名「巡（めぐる）」→「まな」統一済み。内部変数名・保存キーは変更しない）
function currentKeeperName(){ return 'まな'; }

// 店主の自己紹介文（「店主について」の折りたたみ）。名前・口調が性格によって変わるため、
// data-i18n による静的差し替えとは別に、ここだけは動的に描画する。
const KEEPER_BIO_TEXT = {
  ja: {
    gentle: 'この書店の店主。名前は「まな」と名乗っています。年齢や性別は明かしていません。普段はカウンターの奥で静かに本を読んでおり、お客さんの言葉に耳を傾けるのが仕事です。棚には、まなが長年かけて手帳に書き集めてきた、古今の名言が出典つきで並んでいます。',
    tsundere: 'この書店の店主。名前は「綴（つづる）」と名乗っています。年齢や性別は明かしていません。……別に自己紹介したかったわけじゃないですけど。普段はカウンターの奥で静かに本を読んでおり、お客さんの言葉に耳を傾けるのが仕事です。棚には、綴が長年かけて手帳に書き集めてきた、古今の名言が出典つきで並んでいます。'
  },
  en: {
    gentle: 'The keeper of this bookstore goes by "Mana." Their age and gender remain unrevealed. They usually read quietly at the back of the counter, and their job is to listen to what customers have to say. The shelves are lined with quotes old and new, sourced and collected by Mana over many years in a notebook.',
    tsundere: 'The keeper of this bookstore goes by "Tsuzuru." Their age and gender remain unrevealed — not that they’re dying to tell you. They usually read quietly at the back of the counter, and their job is to listen to what customers have to say. The shelves are lined with quotes old and new, sourced and collected by Tsuzuru over many years in a notebook.'
  }
};
function updateKeeperBioText(){
  const p = document.querySelector('[data-i18n="keeperBioText"]');
  if(!p) return;
  const lang = (appLang === 'en') ? 'en' : 'ja';
  const style = isTsundere() ? 'tsundere' : 'gentle';
  const src = KEEPER_BIO_TEXT[lang] && KEEPER_BIO_TEXT[lang][style];
  if(src) p.textContent = src;
}
const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function applyPrefs(){
  document.body.classList.toggle('no-motion', !prefs.motion);
  const mt = document.getElementById('motionToggle');
  if(mt){
    mt.textContent = t(prefs.motion ? 'motionToggleOn' : 'motionToggleOff');
    mt.classList.toggle('on', prefs.motion);
  }
  // ★2026-07-19追加：天気連動トグル・地域選択・状態文の表示も、初期化・言語切替のたびに追従させる
  // （weatherSettingsはprefsとは別の専用キーで管理しているため、ここではUI更新のみ行う）。
  if(typeof WEATHER_FEATURE_ENABLED !== 'undefined' && WEATHER_FEATURE_ENABLED && typeof updateWeatherUI === 'function') updateWeatherUI();
}

async function initPrefs(){
  const saved = await loadJSON('emotion-bookstore-prefs', null);
  if(saved && typeof saved === 'object'){
    prefs = Object.assign(prefs, saved);
  }else if(reduceQuery && reduceQuery.matches){
    prefs.motion = false;
  }
  // ★Step3：既存の保存値が 'tsundere' の場合も、読み込み時は gentle として扱う。
  // 保存データそのものは書き換えない（メモリ上の正規化のみ。スキーマ・キーは不変）。
  if(prefs.keeperStyle === 'tsundere') prefs.keeperStyle = 'gentle';
  applyPrefs();
}

const mtBtn = document.getElementById('motionToggle');
if(mtBtn) mtBtn.onclick = ()=>{
  prefs.motion = !prefs.motion;
  applyPrefs();
  saveJSON('emotion-bookstore-prefs', prefs);
};

// ★追加：🌐 JP / EN 言語切り替えボタン
const langBtn = document.getElementById('langToggle');
if(langBtn) langBtn.onclick = toggleLanguage;

// ★2026-07-18追加：表紙の常時表示言語切替（日本語｜English）。
const heroLangBtn = document.getElementById('heroLangToggle');
if(heroLangBtn) heroLangBtn.onclick = toggleLanguage;
function updateHeroLangToggle(){
  const btn = document.getElementById('heroLangToggle');
  if(!btn) return;
  btn.classList.toggle('lang-is-ja', appLang === 'ja');
  btn.classList.toggle('lang-is-en', appLang === 'en');
  btn.setAttribute('aria-pressed', appLang === 'en' ? 'true' : 'false');
}

function buzz(ms){
  if(prefs.motion && navigator.vibrate){
    try{ navigator.vibrate(ms); }catch(e){}
  }
}

const HEAVY_WORDS = ['つら','しんど','悲し','泣','苦し','不安','怖','孤独','疲れ','嫌','消え'];
const BRIGHT_WORDS = ['嬉し','楽し','わくわく','ワクワク','好き','幸','誇ら','最高'];
function setMood(text){
  // ★Step3：文章の語句（HEAVY_WORDS / BRIGHT_WORDS）による背景演出を停止。
  // 関数契約は維持し、常に中立（透明）の固定値を設定する。引数は読まない。
  if(!prefs.motion) return;
  const layer = document.getElementById('moodLayer');
  if(!layer) return;
  layer.style.background = 'rgba(0,0,0,0)';
}

// ★v1.3最終統合：4タブ主ナビの代わりとなる小さなアクセシブルメニュー。
// aria-expanded/aria-controls・フォーカストラップ・Esc・背景クリックで閉じる・
// 閉時はinertでフォーカス/スクリーンリーダーから隠す（仕様書2-1メニューの要件）。
let _experienceMenuLastFocused = null;

function experienceMenuFocusables(){
  const menu = document.getElementById('experienceMenu');
  if(!menu) return [];
  return Array.from(menu.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'))
    .filter(el => !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null);
}

function experienceMenuToggleButtons(){
  return [document.getElementById('menuBtnCover'), document.getElementById('menuBtnBar')].filter(Boolean);
}

function isExperienceMenuOpen(){
  const menu = document.getElementById('experienceMenu');
  return !!(menu && !menu.classList.contains('hidden'));
}

function handleExperienceMenuKeydown(e){
  if(!isExperienceMenuOpen()) return;
  if(e.key === 'Escape'){
    e.preventDefault();
    closeExperienceMenu();
    return;
  }
  if(e.key === 'Tab'){
    const focusables = experienceMenuFocusables();
    if(!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    }else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }
}

function handleExperienceMenuOutsideClick(e){
  if(!isExperienceMenuOpen()) return;
  const menu = document.getElementById('experienceMenu');
  const card = menu ? menu.querySelector('.experience-menu-card') : null;
  if(!card) return;
  if(card.contains(e.target) || experienceMenuToggleButtons().includes(e.target)) return;
  closeExperienceMenu();
}

function openExperienceMenu(){
  const menu = document.getElementById('experienceMenu');
  if(!menu || isExperienceMenuOpen()) return;
  _experienceMenuLastFocused = document.activeElement;
  menu.classList.remove('hidden');
  menu.removeAttribute('inert');
  document.body.classList.add('experience-menu-open');
  experienceMenuToggleButtons().forEach(btn=>btn.setAttribute('aria-expanded', 'true'));
  document.addEventListener('keydown', handleExperienceMenuKeydown, true);
  document.addEventListener('mousedown', handleExperienceMenuOutsideClick, true);
  const focusables = experienceMenuFocusables();
  const closeBtn = document.getElementById('menuCloseBtn');
  if(closeBtn && closeBtn.focus) closeBtn.focus();
  else if(focusables.length) focusables[0].focus();
}

function closeExperienceMenu(){
  const menu = document.getElementById('experienceMenu');
  if(!menu || !isExperienceMenuOpen()) return;
  menu.classList.add('hidden');
  menu.setAttribute('inert', '');
  document.body.classList.remove('experience-menu-open');
  experienceMenuToggleButtons().forEach(btn=>btn.setAttribute('aria-expanded', 'false'));
  document.removeEventListener('keydown', handleExperienceMenuKeydown, true);
  document.removeEventListener('mousedown', handleExperienceMenuOutsideClick, true);
  if(_experienceMenuLastFocused && _experienceMenuLastFocused.focus){
    _experienceMenuLastFocused.focus();
  }
  _experienceMenuLastFocused = null;
}

// メニュー内の「今の気持ちを書く／自分の本棚／店主に話す／感情の棚を巡る」の現在地表示を同期する。
function syncExperienceMenuActive(id){
  document.querySelectorAll('.experience-menu .menu-item[data-menu-page]').forEach(btn=>{
    btn.classList.toggle('active', btn.getAttribute('data-menu-page') === id);
  });
}

// メニュー・体験バー・Heroのボタン配線。DOM位置に依存せずgetElementByIdで行うため、
// index.html側でこれらのブロックがどこに置かれても動作する（Phase Aと同じ方針）。
function initExperienceMenuControls(){
  document.querySelectorAll('.experience-page').forEach(sec=>{
    sec.setAttribute('inert', '');
    sec.setAttribute('aria-hidden', 'true');
  });
  experienceMenuToggleButtons().forEach(btn=>{ btn.onclick = ()=>openExperienceMenu(); });
  const closeBtn = document.getElementById('menuCloseBtn');
  if(closeBtn) closeBtn.onclick = ()=>closeExperienceMenu();
  const returnBtn = document.getElementById('menuReturnCover');
  if(returnBtn) returnBtn.onclick = ()=>returnToCover();
  document.querySelectorAll('.experience-menu .menu-item[data-menu-page]').forEach(btn=>{
    btn.onclick = ()=>goToPage(btn.getAttribute('data-menu-page'));
  });
  // ★仕様書4-2：JS初期化後に表紙状態を明示するマーカー（CSSはこのクラスの有無で
  // 店内セクション・4タブナビ・店内案内を出し分ける。JS初期化前の見た目は壊さない）。
  document.body.classList.add('experience-ready');
}

function scrollToId(id){
  const el = document.getElementById(id);
  if(el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 20;
    window.scrollTo({ top: y, behavior: prefs.motion ? 'smooth' : 'auto' });
  }
}

function setActivePageTab(id){
  document.querySelectorAll('.page-tab').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.page === id);
  });
}

// ★v1.3最終統合：長い全機能縦スクロールから「表紙→書く→製本→まなが預かる→本棚」の
// 一場面ずつの体験へ再編集するための状態管理。goToPage(id)の関数名・引数・グローバル公開・
// 既存GA4処理（許可リスト・ガード）は維持したうえで、内部だけ以下のヘルパーで拡張する
// （仕様書4-1で追加可能とされた内部関数例：enterBookExperience/activateExperiencePage/
// openExperienceMenu/closeExperienceMenu/returnToCover）。

// 体験対象の4セクション（#counter/#shelves/#desk/#bookshelf）。DOM順は不問。
function experiencePageEls(){
  return document.querySelectorAll('.experience-page');
}

// ★v1.3 RC2：店内上部・編纂机の「今日の日付」表示。端末のローカル日付をIntl.DateTimeFormatで
// JP/EN表示に変換して<time>へ書き込むだけの純粋な描画関数。保存・GA4・外部通信は追加しない。
function renderCurrentShopDate(){
  const now = new Date();
  const locale = appLang === 'en' ? 'en-US' : 'ja-JP';
  const options = { weekday:'short', year:'numeric', month:'long', day:'numeric' };
  let text = '';
  try{
    text = new Intl.DateTimeFormat(locale, options).format(now);
  }catch(e){
    text = now.toLocaleDateString(locale);
  }
  const iso = [
    now.getFullYear(),
    String(now.getMonth()+1).padStart(2,'0'),
    String(now.getDate()).padStart(2,'0')
  ].join('-');
  ['shopCurrentDate','deskCurrentDate'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){
      el.textContent = text;
      el.setAttribute('datetime', iso);
    }
  });
}

// 体験モード（body.experience-open）へ入る。何度呼んでも安全な冪等処理。
function enterBookExperience(){
  document.body.classList.add('experience-open');
  // ★v1.3 RC2：表紙から店内へ入った時に今日の日付を更新する（仕様書2章）。
  if(typeof renderCurrentShopDate === 'function') renderCurrentShopDate();
}

// 表紙（body.experience-openを外す）へ戻る。GA4は追加送信しない（表紙のview_landingは初回のみ）。
function returnToCover(){
  document.body.classList.remove('experience-open');
  closeExperienceMenu();
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      const hero = document.querySelector('.entrance.hero');
      if(hero && hero.scrollIntoView){
        hero.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block: 'start' });
      }else{
        window.scrollTo(0, 0);
      }
    });
  });
}

// ★2026-07-18追加：「お店を出る」を押した直後だけ、お礼のことばを短時間表示してから表紙へ戻す。
// 店内メニューの「表紙へ戻る」（menuReturnCover）は従来どおりreturnToCover()を直接呼び、
// このお礼表示は経由しない（保存・遷移先そのものは無変更）。
function exitShopWithFarewell(){
  if(typeof showToast === 'function') showToast(t('exitFarewellMsg'));
  const delay = prefs.motion ? 1300 : 600;
  setTimeout(()=>{ returnToCover(); }, delay);
}

// 対象頁だけを表示状態にする（非対象は display:none 相当のCSS + inert/aria-hidden）。
// 自然スクロールで別sectionへ到達する設計は廃止したため、IntersectionObserverによる
// スクロール連動のactiveタブ切替（下部の(function(){...})()）はここでは呼ばない・依存しない。
function activateExperiencePage(id){
  experiencePageEls().forEach(sec=>{
    const isActive = sec.id === id;
    sec.classList.toggle('is-active', isActive);
    if(isActive){
      sec.removeAttribute('inert');
      sec.removeAttribute('aria-hidden');
    }else{
      sec.setAttribute('inert', '');
      sec.setAttribute('aria-hidden', 'true');
    }
  });
  setActivePageTab(id);
  syncExperienceMenuActive(id);
}

function goToPage(id){
  // ★GA4整合：本棚（bookshelf）または感情棚（shelves）へ実際に移動した直後に view_shelf を1回だけ送信。
  // 同一ページへの連続遷移では重複発火させない。棚ID・棚名・遷移元等のパラメータは送らない。
  // goToShelf()経由の遷移はgoToShelf側で送信済みのため、抑止フラグで二重発火を防ぐ。
  if((id === 'bookshelf' || id === 'shelves') && !_gaSuppressNextViewShelf && _gaLastTrackedPage !== id){
    trackAnalyticsEvent('view_shelf');
  }
  _gaSuppressNextViewShelf = false;
  _gaLastTrackedPage = id;
  setActivePageTab(id);
  if(id === 'desk'){ syncCounterDraftToDesk(); updateDeskLead(); if(typeof renderWritingBoat === 'function') renderWritingBoat(); }
  // ★Hotfix1-2追加修正3：棚ページへ入るたびに、現在のactiveCategory/shelfWasChosenをタブ・棚表示へ
  // 反映する。goToShelf()以外の経路（例：goToDeskWithCategory()で棚を選んだ後、ページ内ナビの
  // 「②棚」タブで戻る場合）でactiveCategoryが更新されていても、goToPage('shelves')はこれまで
  // 再描画していなかったため、タブのハイライトが古いままになる不整合があった。
  if(id === 'shelves'){
    if(typeof renderShelfTabs === 'function') renderShelfTabs();
    if(typeof renderShelfDisplay === 'function') renderShelfDisplay();
  }
  // ★微調整：番台へ戻るたびに会話ステップを第一段階（5択＋まだ決めずに書く）へ
  // 必ずリセットする。棚選択ロジック・保存データは変更しない、UI表示状態のみの初期化。
  if(id === 'counter' && typeof renderCounterShelfGuideRoot === 'function'){
    renderCounterShelfGuideRoot();
  }

  enterBookExperience();
  closeExperienceMenu();

  // ★Daypart1_RC2：光のページめくり演出（pageTurnOverlay／pageTurnSwipeキーフレーム／
  // 260msの表示待ち／buzz(10)）を完全に廃止。prefs.motionの値（ON/OFF）に関わらず、
  // 画面切替は常にこの即時切替のみとする（光・フラッシュ・白い帯・フェードは一切挟まない）。
  activateExperiencePage(id);
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>scrollToId(id));
  });
}

(function(){
  const targets = document.querySelectorAll('.reveal');
  const pageIds = ['counter','shelves','desk','bookshelf'];
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, {threshold:0.12});
    targets.forEach(el=>io.observe(el));

    const pageIo = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting) setActivePageTab(e.target.id);
      });
    }, {threshold:0.4});
    pageIds.forEach(id=>{
      const el = document.getElementById(id);
      if(el) pageIo.observe(el);
    });
  }else{
    targets.forEach(el=>el.classList.add('visible'));
  }
})();

function renderFair(){
  try{
    const box = document.getElementById('fairBox');
    if(!box) return;
    const m = new Date().getMonth() + 1;
    const fair = MONTH_FAIR[m];
    if(!fair) return;
    const cat = CATEGORIES.find(c=>c.id===fair.id);
    if(!cat) return;
    // ★2026-07-19 D：カード/バナーではなく、店内に置かれた小さな木の看板として表示する。
    // 内容は「今月のおすすめ棚」「棚名」「店主の一言」「棚へ進む導線」の4点のみ。
    box.innerHTML = '';
    box.classList.add('fair-signboard');
    const kicker = document.createElement('p');
    kicker.className = 'fair-kicker';
    kicker.textContent = (appLang === 'en') ? t('fairKicker') : (m + '月・' + t('fairKicker'));
    const title = document.createElement('b');
    title.className = 'fair-shelf-name';
    title.textContent = '『' + categoryLabelFor(cat) + '』';
    const line = document.createElement('span');
    line.className = 'fair-line';
    line.textContent = (appLang === 'en' && typeof MONTH_FAIR_EN !== 'undefined' && MONTH_FAIR_EN[m]) ? MONTH_FAIR_EN[m] : fair.line;
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'fair-go';
    go.textContent = t('fairGoBtn');
    go.setAttribute('aria-label', t('fairGoBtn'));
    go.onclick = ()=>goToShelf(fair.id);
    box.appendChild(kicker); box.appendChild(title); box.appendChild(line); box.appendChild(go);
  }catch(e){ console.error('renderFair failed', e); }
}

function topCategoryId(){
  if(libraryCache.length === 0) return null;
  const counts = {};
  // ★Step4：棚未選択（unfiled）は最多棚判定から明示的に除外する
  libraryCache.forEach(e=>{
    if(e && e.category === UNFILED_CATEGORY_ID) return;
    counts[e.category] = (counts[e.category]||0) + 1;
  });
  const withCounts = CATEGORIES.filter(c=>counts[c.id]);
  if(!withCounts.length) return null;
  return withCounts.sort((a,b)=>counts[b.id]-counts[a.id])[0].id;
}

const SHELF_GROUP_LABELS = {
  sink:  { ja:'静かに沈む気持ち', en:'Quiet & heavy' },
  wave:  { ja:'ざわつく気持ち',   en:'Restless & turbulent' },
  light: { ja:'明るい気持ち',     en:'Bright & warm' },
  sepia: { ja:'懐かしい気持ち',   en:'Nostalgic' },
  // ★Hotfix3新設：moyamoya専用の独立グループ見出し
  other: { ja:'その他',           en:'Other' }
};

function renderShelfTabs(){
  try{
    const wrap = document.getElementById('shelfTabs');
    if(!wrap) return;
    wrap.innerHTML = '';
    const topId = topCategoryId();
    const catSelect = document.getElementById('categorySelect');
    if(catSelect && catSelect.options.length) catSelect.value = activeCategory;
    const deskLabel = document.getElementById('deskCategoryLabel');
    if(deskLabel) deskLabel.textContent = shelfLabelOf(activeCategory);
    const lang = (appLang === 'en') ? 'en' : 'ja';

    TEXTURE_GROUPS.forEach(group=>{
      const shelvesInGroup = group.shelves.map(id=>CATEGORIES.find(c=>c.id===id)).filter(Boolean);
      if(!shelvesInGroup.length) return;
      const groupEl = document.createElement('div');
      groupEl.className = 'shelf-group';
      const labelInfo = SHELF_GROUP_LABELS[group.id];
      if(labelInfo){
        const label = document.createElement('span');
        label.className = 'shelf-group-label';
        label.textContent = labelInfo[lang] || labelInfo.ja;
        groupEl.appendChild(label);
      }
      const row = document.createElement('div');
      row.className = 'shelf-group-row';
      shelvesInGroup.forEach(cat=>{
        const btn = document.createElement('button');
        btn.className = 'shelf-tab' + (shelfWasChosen && cat.id===activeCategory ? ' active' : '');
        btn.dataset.catId = cat.id;
        // ★v1.3 RC2b 項目6：未選択の棚（例：「感謝」）がtopCategoryId()と一致するだけで
        // 常時発光して見えるのを廃止。選択状態と区別できないというバグ報告のため、
        // 公開画面では.glowを付与しない。topCategoryId()自体・.shelf-tab.glowのCSSは
        // 他用途／互換性のため温存し、ここでのクラス付与のみを止める。
        btn.textContent = categoryLabelFor(cat);
        btn.onclick = ()=>{
          // ★GA4修正：棚タブで現在と異なる棚へ切り替える直前に view_shelf を1回だけ送信。
          // 同じ棚タブの再押下では送らない。棚ID・棚名・感情名は送らない。
          if(activeCategory !== cat.id){
            trackAnalyticsEvent('view_shelf');
            _gaLastTrackedShelfId = cat.id;
          }
          setActiveShelf(cat.id); // ★Hotfix1-2追加修正：棚タブ直接クリックでもshelfWasChosenを更新
          renderShelfTabs();
          renderShelfDisplay();
        };
        row.appendChild(btn);
      });
      groupEl.appendChild(row);
      wrap.appendChild(groupEl);
    });

    const wanderRow = document.createElement('div');
    wanderRow.className = 'shelf-wander-row';
    const wander = document.createElement('button');
    wander.className = 'wander-btn';
    wander.textContent = t('wanderBtn');
    wander.onclick = ()=>{
      let pick = activeCategory;
      while(pick === activeCategory && CATEGORIES.length > 1){
        pick = CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)].id;
      }
      // ★GA4修正：「棚を気ままに巡る」で異なる棚が確定した後、activeCategory変更の直前に1回だけ送信。
      // 棚ID・棚名・感情名は送らない。
      if(pick !== activeCategory){
        trackAnalyticsEvent('view_shelf');
        _gaLastTrackedShelfId = pick;
      }
      setActiveShelf(pick); // ★Hotfix1-2追加修正：「気ままに巡る」でもshelfWasChosenを更新
      renderShelfTabs();
      renderShelfDisplay();
    };
    wanderRow.appendChild(wander);
    wrap.appendChild(wanderRow);
  }catch(e){ console.error('renderShelfTabs failed', e); }
}

function renderDetourFallback(box, catId){
  const items = DETOUR_POOL[catId];
  if(!items || !items.length){
    box.innerHTML = '';
    return;
  }
  const tierLabel = (appLang === 'en')
    ? { low:'A little detour', medium:'A cozy little indulgence', high:'A special detour' }
    : { low:'ちいさな寄り道', medium:'すこし贅沢な寄り道', high:'とっておきの寄り道' };
  // ★2026-07-19 H：毎日・毎描画で変わる広告的な見え方を避け、「年・月・前半(1-15日)／後半(16日-)」を
  // キーに端末側で決定的に選ぶ。同じ半月の間は内容も順番も固定され、再読み込み・言語切替では変わらない。
  const now = new Date();
  const half = now.getDate() <= 15 ? 1 : 2;
  const halfKey = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + half + '-' + catId;
  const halfSeed = shelfPickSeed(halfKey);
  const ordered = items.slice();
  for(let i = ordered.length - 1; i > 0; i--){
    const j = (halfSeed + i * 31) % (i + 1);
    const tmp = ordered[i]; ordered[i] = ordered[j]; ordered[j] = tmp;
  }
  const picks = ordered.slice(0, 3);
  const halfLabel = t(half === 1 ? 'detourHalfFirst' : 'detourHalfSecond');
  const cardsHtml = picks.map(featured=>{
    const url = detourUrlFor(featured);
    const enOverlay = (appLang === 'en' && typeof DETOUR_EN !== 'undefined') ? DETOUR_EN[featured.name] : null;
    const dispName = enOverlay ? enOverlay.name : featured.name;
    const dispDesc = enOverlay ? enOverlay.desc : featured.description;
    return `
      <div class="detour-card detour-tier-${featured.tier}">
        <span class="detour-tier-badge">${tierLabel[featured.tier] || featured.tier}</span>
        <p class="detour-name">${escapeHtml(dispName)}</p>
        <p class="detour-desc">${escapeHtml(dispDesc)}</p>
        <a class="detour-link" href="${url}" target="_blank" rel="noopener sponsored">${escapeHtml(t('detourViewLink'))}</a>
      </div>`;
  }).join('');
  box.innerHTML = `
    <p class="detour-heading">${escapeHtml(t('detourHeading'))}<span class="detour-half-note">（${escapeHtml(halfLabel)}）</span><span class="detour-pr">${escapeHtml(t('detourPrNote'))}</span></p>
    <div class="detour-cards">${cardsHtml}</div>
    <p class="detour-note">${escapeHtml(t('detourNote'))}</p>`;
}

// ★「今月の寄り道」を、実際の現在月から導いた季節の言葉 × 棚の感情ラベルで
//   Google Books API に問い合わせ、季節に合う一冊を都度取得するように変更。
//   通信に失敗した場合や結果が空の場合は、従来の厳選リスト（DETOUR_POOL）へ
//   そのままフォールバックし、表示が空白にならないようにしている。
async function renderDetourSection(catId){
  const box = document.getElementById('detourSection');
  if(!box) return;
  const cat = CATEGORIES.find(c=>c.id===catId);
  const catLabel = cat ? cat.label : '';
  const requestedCategory = catId;

  // ★2026-07-19 H：外部API（Google Books）による都度取得の寄り道表示を停止し、
  // 常に厳選リスト（DETOUR_POOL）から半月単位の決定的な組で表示する
  // （日替わりの広告的な見え方を避けるため。fetchSeasonalBooks自体は他機能で引き続き使用）。
  renderDetourFallback(box, catId);
}

// ★棚の「店主が選んだ本」「プレイリスト」は従来どおり厳選済みの静的データを主とし、
//   そこに加えて、季節の言葉×棚のラベルでGoogle Books API／iTunes Search APIから
//   実際に見つかった新しめの一冊・一曲を1件ずつ添える。取得できなければ何も表示しない
//   （厳選データの表示自体は止めない＝壊れない設計）。
async function renderLiveNewReleases(cat){
  // ★2026-07-19：外部API（日本語クエリ）由来の紹介文は英語化できないため、英語モードでは表示しない。
  if(appLang === 'en') return;
  const wrap = document.getElementById('livePickWrap');
  if(!wrap || !cat) return;
  const requestedCategory = cat.id;
  const [books, songs] = await Promise.all([
    fetchSeasonalBooks(cat.label, '新刊'),
    fetchSeasonalMusic(cat.label)
  ]);
  if(activeCategory !== requestedCategory) return;
  const wrapEl = document.getElementById('livePickWrap');
  if(!wrapEl) return;

  let html = '';
  if(books && books.length){
    const b = books[0];
    const url = b.infoLink || amazonSearchUrl(b.title + ' ' + b.by);
    html += `<div class="live-pick-card">
      <span class="live-pick-badge">今、見つかった一冊</span>
      <p class="live-pick-name">${escapeHtml(b.title)}</p>
      <p class="live-pick-desc">${escapeHtml(b.by)}${b.hook ? ' — ' + escapeHtml(b.hook) : ''}</p>
      <a class="live-pick-link" href="${url}" target="_blank" rel="noopener">見てみる →</a>
      ${favBtnHtml('book', b.title, b.by, cat.id, b.hook || '')}
    </div>`;
  }
  if(songs && songs.length){
    const s = songs[0];
    const q4 = s.title + ' ' + s.artist;
    const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q4);
    html += `<div class="live-pick-card">
      <span class="live-pick-badge">今、見つかった一曲</span>
      <p class="live-pick-name">『${escapeHtml(s.title)}』${escapeHtml(s.artist)}</p>
      ${s.comment ? `<p class="live-pick-desc">${escapeHtml(s.comment)}</p>` : ''}
      <a class="live-pick-link" href="${spUrl}" target="_blank" rel="noopener">聴いてみる →</a>
      ${favBtnHtml('music', s.title, s.artist, cat.id, s.comment || '')}
    </div>`;
  }
  wrapEl.innerHTML = html
    ? `<p class="live-pick-heading">今、季節に合わせて見つかったもの</p><div class="live-pick-row">${html}</div>`
    : '';
}

function renderShelfDisplay(){
  try{
    const el = document.getElementById('shelfDisplay');
    if(!el) return;
    const cat = CATEGORIES.find(c=>c.id===activeCategory);
    if(!cat){ el.innerHTML = ''; return; }
    if(prefs.motion){
      el.style.transition = 'opacity .16s ease';
      el.style.opacity = '0';
    }
    // ★2026-07-19：英語モードでは、著作物引用の翻訳を避け、英語版オリジナル短文（QUOTE_POOL_EN）から選ぶ。
    const quotes = (appLang === 'en' && typeof QUOTE_POOL_EN !== 'undefined' && QUOTE_POOL_EN[cat.id])
      ? QUOTE_POOL_EN[cat.id].map(text=>({ text, source: (typeof QUOTE_POOL_EN_SOURCE !== 'undefined' ? QUOTE_POOL_EN_SOURCE : '') }))
      : (cat.quotes || []);
    const q = quotes.length ? quotes[shelfEncounterSeed(cat.id, 'quote') % quotes.length] : { text:'', source:'' };
    const recs = pickRecommend(cat.id);
    const shelfLabelDisp = categoryLabelFor(cat);
    // ★英語モード完全性監査：Google検索クエリ自体は非表示のURLパラメータのため日本語のままでも
    // 可視UIには影響しないが、日本語モードとの一貫性のため従来どおりcat.labelを使う
    // （検索結果の質を変えないよう、送信するキーワード自体はここでは変更しない）。
    const moodSearchQuery = cat.label + ' 気持ち おすすめ 本';
    const moodSearchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(moodSearchQuery);
    const recommendHtml = (recs && recs.length)
      ? `<div class="recommend-section">
          <p class="recommend-heading">${escapeHtml(t('recommendHeadingTpl').replace('{shelf}', shelfLabelDisp))}</p>
          <p class="recommend-subtext">${escapeHtml(t('recommendSubtext'))}</p>
          <div class="recommend-row">
          ${recs.map(r=>{
            const q2 = r.title + ' ' + r.by;
            const amazonUrl = amazonSearchUrl(q2);
            const kindleUrl = amazonSearchUrl(q2, 'digital-text');
            const audibleUrl = amazonSearchUrl(q2, 'audible');
            const rakutenUrl = rakutenSearchUrl(q2);
            return `<span class="recommend-chip" title="${r.why || ''}">
              ${r.hook ? `<span class="recommend-hook">${r.hook}</span>` : ''}
              <span class="work-title">『${escapeHtml(bookTitleFor(r))}』${escapeHtml(bookAuthorFor(r))}</span>
              <span class="recommend-why">${r.why || ''}</span>
              <span class="recommend-shop-links">
                <a class="recommend-buy" href="${amazonUrl}" target="_blank" rel="noopener">Amazon</a>
                <a class="recommend-buy kindle" href="${kindleUrl}" target="_blank" rel="noopener">Kindle</a>
                <a class="recommend-buy audible" href="${audibleUrl}" target="_blank" rel="noopener">Audible</a>
                <a class="recommend-buy rakuten" href="${rakutenUrl}" target="_blank" rel="noopener">${appLang === 'en' ? 'Rakuten' : '楽天'}</a>
              </span>
              ${favBtnHtml('book', r.title, r.by, cat.id, r.hook || r.why || '')}
              ${r.source ? `<a class="recommend-source" href="${r.sourceUrl}" target="_blank" rel="noopener">出典：${r.source}</a>` : ''}
            </span>`;
          }).join('')}
          <button type="button" class="recommend-shuffle" onclick="renderShelfDisplay()" title="${escapeHtml(t('recommendShuffleTitle'))}">${escapeHtml(t('recommendShuffleBtn'))}</button>
          <a class="recommend-more" href="${moodSearchUrl}" target="_blank" rel="noopener">${escapeHtml(t('recommendMoreLinkTpl').replace('{shelf}', shelfLabelDisp))}</a>
          </div>
         </div>`
      : '';
    const mq = MUSIC_QUERIES[cat.id] || [];
    const pinnedSongs = PINNED_SONGS[cat.id] || [];
    const trackPool = enReadySongs(mq.length ? mq : pinnedSongs);
    const tracksSeed = shelfEncounterSeed(cat.id, 'tracks');
    const shuffledTracks = applyShelfPrevAvoidance(cat.id, 'track', tracksSeed,
      seededShuffle(trackPool, tracksSeed), tr=>(tr.artist + '|' + tr.title)); // ★Hotfix1-3追加修正：直前の出会いと同じ先頭候補を避ける
    const trackSrc = shuffledTracks.slice(0, 3).map(tr=>({ title:tr.title, artist:tr.artist, comment: songCommentFor(tr) }));
    let musicHtml;
    if(trackSrc.length){
      const items = trackSrc.map(song=>{
        const q3 = song.title + ' ' + song.artist;
        const amUrl = amazonSearchUrl(q3 + ' 音楽');
        const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q3);
        const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q3);
        const amcUrl = 'https://music.apple.com/jp/search?term=' + encodeURIComponent(q3);
        return `<div class="playlist-track-row">
          <span class="playlist-track-name">『${escapeHtml(songTitleFor(song))}』${escapeHtml(songArtistFor(song))}</span>
          ${song.comment ? `<span class="playlist-track-comment">${song.comment}</span>` : ''}
          <span class="playlist-services">
            <a href="${spUrl}" target="_blank" rel="noopener">Spotify</a>
            <a href="${amcUrl}" target="_blank" rel="noopener">Apple Music</a>
            <a href="${amUrl}" target="_blank" rel="noopener">Amazon Music</a>
            <a href="${ytUrl}" target="_blank" rel="noopener">YouTube</a>
          </span>
          ${favBtnHtml('music', song.title, song.artist, cat.id, song.comment || '')}
        </div>`;
      }).join('');
      musicHtml = `<div class="music-row"><p class="playlist-label">${escapeHtml(t('playlistLabelTpl').replace('{shelf}', shelfLabelDisp))}</p><div class="playlist-tracks">${items}</div><p class="field-hint apple-music-note">${escapeHtml(t('appleMusicNote'))}</p></div>`;
    }else{
      const fallbackQuery = cat.label + ' 邦楽 プレイリスト';
      const musicUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(fallbackQuery);
      const musicUrlAmc = 'https://music.apple.com/jp/search?term=' + encodeURIComponent(fallbackQuery);
      musicHtml = `<div class="music-row"><a class="music-link" href="${musicUrl}" target="_blank" rel="noopener">${escapeHtml(t('musicSearchYoutube'))}</a> <a class="music-link" href="${musicUrlAmc}" target="_blank" rel="noopener">${escapeHtml(t('musicSearchAppleMusic'))}</a><p class="field-hint apple-music-note">${escapeHtml(t('appleMusicNote'))}</p></div>`;
    }
    const myEntries = libraryCache.filter(e=>e.category===cat.id);
    // ★修正（XSS対策）：ユーザーが編纂机で入力したタイトル・本文をinnerHTMLへ差し込む前に
    // 必ずescapeHtml()を通す（<script>等のタグ注入を無害化する）
    const myEpisodeCards = myEntries.map(entry=>{
      const safeTitle = escapeHtml(entry.title);
      const safeStoryRaw = entry.story.length > 60 ? entry.story.slice(0,60) + '…' : entry.story;
      const safeStory = escapeHtml(safeStoryRaw);
      const safeId = escapeHtml(entry.id);
      return `<div class="episode-card mine" data-entry-id="${safeId}"><span class="who mine-who">${escapeHtml(t('myStoryLabel'))}</span>『${safeTitle}』${safeStory}</div>`;
    });
    // ★2026-07-19：英語モードでは英語版オリジナル短編（STORIES_POOL_EN）から選ぶ。
    const storyPool = (appLang === 'en' && typeof STORIES_POOL_EN !== 'undefined' && STORIES_POOL_EN[cat.id])
      ? STORIES_POOL_EN[cat.id]
      : (STORIES_POOL[cat.id] || []);
    const shuffledStories = seededShuffle(storyPool, shelfEncounterSeed(cat.id, 'stories')).slice(0, 3);
    // ★決裁済み変更仕様v1.2 3-2：実在投稿者プロフィールに見えるauthor表示（s.author）は使用せず、
    // 架空の蔵書であることを示す固定ラベルのみを表示する（MESSAGES.shelfFictionalLabel経由）。
    // ★2025-07-17再追記：data-i18n="shelfFictionalLabel"を付与し、applyLanguage()による
    // 言語切替直後の即時更新に対応（renderShelfDisplay()の再呼び出しは行わない）。
    const sampleEpisodeCards = shuffledStories.map(s=>`<div class="episode-card"><span class="who" data-i18n="shelfFictionalLabel">${escapeHtml(t('shelfFictionalLabel'))}</span>${s.text}</div>`);
    const allEpisodeCards = myEpisodeCards.concat(sampleEpisodeCards);
    const visibleEpisodesHtml = allEpisodeCards.slice(0, 2).join('');
    const hiddenEpisodeCards = allEpisodeCards.slice(2);
    const moreLabelText = t('episodesMoreLabelTpl').replace('{n}', hiddenEpisodeCards.length);
    const hiddenEpisodesHtml = hiddenEpisodeCards.length
      ? `<div class="episodes-more hidden" id="episodesMore">${hiddenEpisodeCards.join('')}</div><button type="button" class="episodes-toggle" id="episodesToggle" data-more-label="${escapeHtml(moreLabelText)}" onclick="toggleEpisodes()">${escapeHtml(moreLabelText)}</button>`
      : '';
    const episodesNote = '';
    const purifyHtml = NEGATIVE_SHELVES.includes(cat.id)
      ? `<button type="button" class="purify-trigger" onclick="openPurify('${cat.id}')">${escapeHtml(t('purifyTriggerBtn'))}</button>`
      : '';
    el.innerHTML = `
      <p class="definition"><b>${escapeHtml(shelfLabelDisp)}</b> — ${escapeHtml(categoryDefFor(cat))}</p>
      <p class="quote-card">${q.text}</p>
      <p class="quote-source">— ${quoteSourceHtml(q.source)}</p>
      <p class="episodes-heading" data-i18n="shelfEpisodesHeading">${escapeHtml(t('shelfEpisodesHeading'))}</p>
      <p class="episodes-note" data-i18n="shelfEpisodesNote">${escapeHtml(t('shelfEpisodesNote'))}</p>
      <div class="episodes">
        ${visibleEpisodesHtml}
        ${hiddenEpisodesHtml}
      </div>
      ${episodesNote}
      <div class="shelf-tweets" id="shelfTweets"></div>
      <button type="button" class="episode-shuffle" onclick="renderShelfDisplay()">${escapeHtml(t('episodeShuffleBtn'))}</button>
      ${purifyHtml}
      ${recommendHtml}
      ${musicHtml}
      <div class="live-pick-wrap" id="livePickWrap"></div>
    `;
    el.querySelectorAll('.episode-card.mine').forEach(card=>{
      card.onclick = ()=>{
        const entry = libraryCache.find(e=>e.id === card.dataset.entryId);
        if(entry){ buzz(8); openBook(entry); }
      };
    });
    // ★公開整合：X公式埋め込み（PINNED_TWEETS）の表示は停止（renderTweetEmbedは呼ばない）。
    renderDetourSection(cat.id);
    renderLiveNewReleases(cat);
    if(prefs.motion){
      requestAnimationFrame(()=>{ el.style.opacity = '1'; });
    }
  }catch(e){
    console.error('renderShelfDisplay failed', e);
  }
}

function renderCategorySelect(){
  const sel = document.getElementById('categorySelect');
  if(!sel) return;
  sel.innerHTML = CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  sel.addEventListener('change', ()=>{
    const deskLabel = document.getElementById('deskCategoryLabel');
    if(deskLabel) deskLabel.textContent = shelfLabelOf(sel.value);
    renderTitleSuggest();
  });
  // ★Step4：製本前の棚選択UIは利用者から見えない状態にする。
  // DOM・id・classは削除・変更せず、囲みの.fieldごと非表示にするだけ（保存には使用しない）。
  // 棚は製本成功後の任意収納UI（showUnfiledShelfPicker）でのみ選択できる。
  const fieldWrap = sel.closest('.field');
  if(fieldWrap){ fieldWrap.style.display = 'none'; }
  else { sel.style.display = 'none'; }
}

// ★修正：「左右にスワイプでも棚を移動できます」という案内文があったが、
// 実際にはタッチ操作を検出する仕組みが存在せず、案内と実態が一致していなかった（不具合）。
// ここで本物のスワイプ検出を実装し、案内文の内容を実現する。
// ・タッチデバイスのみで有効（マウスのデスクトップではCSS側でヒント自体を非表示にしている）
// ・縦スクロールと誤検出しないよう、横移動量が縦移動量を明確に上回る場合のみ反応
function navigateShelfBySwipe(direction){
  const tabs = Array.from(document.querySelectorAll('#shelfTabs .shelf-tab'));
  const ids = tabs.map(btn=>btn.dataset.catId).filter(Boolean);
  if(ids.length < 2) return;
  let idx = ids.indexOf(activeCategory);
  if(idx === -1) idx = 0;
  idx = (idx + direction + ids.length) % ids.length;
  // ★GA4修正：スワイプでの棚移動も、移動先IDが現在のactiveCategoryと異なる場合だけ、
  // 変更直前に view_shelf を1回送信する。棚ID・棚名・感情名は送らない。
  if(ids[idx] !== activeCategory){
    trackAnalyticsEvent('view_shelf');
    _gaLastTrackedShelfId = ids[idx];
  }
  setActiveShelf(ids[idx]); // ★Hotfix1-2追加修正：スワイプ／左右移動でもshelfWasChosenを更新
  renderShelfTabs();
  renderShelfDisplay();
  const activeTab = document.querySelector('#shelfTabs .shelf-tab.active');
  if(activeTab && activeTab.scrollIntoView){
    try{ activeTab.scrollIntoView({behavior: prefs.motion ? 'smooth' : 'auto', inline:'center', block:'nearest'}); }catch(e){}
  }
  if(navigator.vibrate) try{ navigator.vibrate(10); }catch(e){}
}

// ★微調整：以前は#shelfDisplay単体・touchstart/touchendのみだったため、
// 反応範囲が棚内容の領域に限られ、棚タブ付近から始めたジェスチャーや、
// Pointer Eventsベースの実機（特にAndroid Chrome系）で反応しないことがあった。
// 検出範囲を#shelfSwipeZone（棚タブ＋棚内容）へ広げ、Pointer Eventsを優先しつつ
// 非対応環境だけ既存のtouchイベントへフォールバックする。
const SWIPE_INTERACTIVE_SELECTOR = 'a,button,input,textarea,select,summary,label';

function setupShelfSwipe(){
  const zone = document.getElementById('shelfSwipeZone');
  if(!zone || zone.dataset.swipeBound) return;
  zone.dataset.swipeBound = '1';
  const SWIPE_THRESHOLD = 45; // 40〜50px方針の中間値
  let startX = 0, startY = 0, tracking = false, activePointerId = null, lastSwipeAt = 0;

  const startsOnInteractive = (target)=> !!(target && target.closest && target.closest(SWIPE_INTERACTIVE_SELECTOR));

  const beginTrack = (x, y, target)=>{
    if(startsOnInteractive(target)){ tracking = false; return false; }
    startX = x; startY = y; tracking = true;
    return true;
  };

  // スワイプが成立した場合、直後に発生しがちな「ゴーストクリック」を抑止するため、
  // 発生時刻を記録し、キャプチャ段階のclickで一定時間だけ握りつぶす。
  const finishTrack = (x, y)=>{
    if(!tracking) return false;
    tracking = false;
    const dx = x - startX;
    const dy = y - startY;
    if(Math.abs(dx) < SWIPE_THRESHOLD) return false;
    if(Math.abs(dx) < Math.abs(dy) * 1.2) return false; // 縦スクロールとの誤検出防止
    navigateShelfBySwipe(dx < 0 ? 1 : -1);
    lastSwipeAt = Date.now();
    return true;
  };

  zone.addEventListener('click', (e)=>{
    if(Date.now() - lastSwipeAt < 400){
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  if(window.PointerEvent){
    // ★iOS Safari／Android Chrome双方で共通のPointer Eventsを優先する。
    // タッチ操作のみを対象とし（マウスドラッグは対象外＝従来どおりデスクトップは案内非表示のまま）、
    // pointermoveは監視せず、開始・終了位置の差分だけで判定することでネイティブスクロールと競合しない。
    zone.addEventListener('pointerdown', (e)=>{
      if(e.pointerType === 'mouse') return;
      if(activePointerId !== null) return;
      if(!beginTrack(e.clientX, e.clientY, e.target)) return;
      activePointerId = e.pointerId;
    });
    zone.addEventListener('pointerup', (e)=>{
      if(e.pointerId !== activePointerId) return;
      activePointerId = null;
      if(finishTrack(e.clientX, e.clientY)){
        try{ e.preventDefault(); }catch(err){}
      }
    });
    zone.addEventListener('pointercancel', (e)=>{
      if(e.pointerId !== activePointerId) return;
      activePointerId = null;
      tracking = false;
    });
  }else{
    // Pointer Events非対応環境向けの既存touchイベントへのフォールバック。
    zone.addEventListener('touchstart', (e)=>{
      if(!e.touches || e.touches.length !== 1){ tracking = false; return; }
      beginTrack(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, {passive:true});
    zone.addEventListener('touchend', (e)=>{
      const touch = e.changedTouches && e.changedTouches[0];
      if(!touch) return;
      if(finishTrack(touch.clientX, touch.clientY)){
        try{ e.preventDefault(); }catch(err){}
      }
    });
    zone.addEventListener('touchcancel', ()=>{ tracking = false; }, {passive:true});
  }
}

function textColorFor(hex){
  const c = (hex || '#000000').replace('#','');
  const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  return (0.299*r + 0.587*g + 0.114*b) > 150 ? '#3A2A14' : '#F6ECD4';
}

// ★微調整：本棚の背表紙タイトルに、textColorFor()と同じ明暗判定に沿った控えめな
// text-shadowを添える。明るい文字（暗い背表紙）には暗い縁取り、濃い文字（明るい背表紙）
// には明るい縁取りを薄く重ね、背表紙のグラデーションに文字が沈まないようにする。
function textShadowFor(hex){
  const c = (hex || '#000000').replace('#','');
  const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  return (0.299*r + 0.587*g + 0.114*b) > 150
    ? '0 1px 1px rgba(255,255,255,0.5)'
    : '0 1px 2px rgba(0,0,0,0.55)';
}

function spineColorFor(catId){
  // ★Step4：unfiled（棚未選択）およびCATEGORIESに無いIDは中立色へフォールバック。
  // SPINE_COLORS配列そのものは変更しない。
  const idx = CATEGORIES.findIndex(c=>c.id===catId);
  if(idx < 0) return UNFILED_SPINE_COLOR;
  return SPINE_COLORS[idx % SPINE_COLORS.length];
}

// ★追加：本棚の「有機的な成長」演出。カテゴリの基調色から、本ごとに
// ごくわずかに明暗をずらした縦グラデーションを生成する（毎回ランダムではなく、
// タイトル文字数とインデックスから決定的に算出するので、再描画しても同じ本は同じ表情のまま）。
function shadeHex(hex, percent){
  const c = (hex || '#000000').replace('#','');
  const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  const adj = (v)=> Math.max(0, Math.min(255, Math.round(v + (percent < 0 ? v : 255 - v) * percent)));
  const toHex = (v)=> v.toString(16).padStart(2,'0');
  return '#' + toHex(adj(r)) + toHex(adj(g)) + toHex(adj(b));
}
function spineGradientFor(catId, seed){
  const base = spineColorFor(catId);
  const wobble = ((seed % 7) - 3) / 100; // -0.03〜+0.03程度の穏やかな揺らぎ
  const top = shadeHex(base, 0.16 + wobble);
  const bottom = shadeHex(base, -0.12 - wobble);
  return `linear-gradient(180deg, ${top} 0%, ${base} 45%, ${bottom} 100%)`;
}

// ★追加：本棚が際限なく伸び続けないよう、月別タブを描画する。
// 既定は'all'（全冊表示、従来通り）。月が2つ以上に分かれて初めてタブを出す（1ヶ月目はタブ不要なノイズになるため）。
function renderShelfMonthTabs(){
  const wrap = document.getElementById('shelfMonthTabs');
  if(!wrap) return;
  const counts = {};
  libraryCache.forEach(e=>{ const k = monthKeyOf(e.date); counts[k] = (counts[k]||0) + 1; });
  const months = Object.keys(counts).sort().reverse();
  if(months.length <= 1){
    wrap.innerHTML = '';
    wrap.classList.add('hidden');
    if(selectedShelfMonth !== 'all') selectedShelfMonth = 'all';
    return;
  }
  wrap.classList.remove('hidden');
  wrap.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'shelf-month-tab' + (selectedShelfMonth === 'all' ? ' active' : '');
  allBtn.textContent = `${t('shelfMonthAllTab')} (${libraryCache.length})`;
  allBtn.onclick = ()=>{ selectedShelfMonth = 'all'; buzz(6); renderShelf(false); };
  wrap.appendChild(allBtn);
  months.forEach(key=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shelf-month-tab' + (selectedShelfMonth === key ? ' active' : '');
    btn.textContent = `${monthLabelOf(key)} (${counts[key]})`;
    btn.onclick = ()=>{ selectedShelfMonth = key; buzz(6); renderShelf(false); };
    wrap.appendChild(btn);
  });
}

function renderShelf(markNewest){
  const shelf = document.getElementById('myShelf');
  if(!shelf) return;
  const emptyMsg = document.getElementById('shelfEmptyMsg');
  const countBadge = document.getElementById('shelfCount');
  renderShelfMonthTabs();
  const visible = selectedShelfMonth === 'all'
    ? libraryCache
    : libraryCache.filter(e=>monthKeyOf(e.date) === selectedShelfMonth);
  const newestId = libraryCache.length ? libraryCache[libraryCache.length - 1].id : null;
  // ★2026-07-18追加：年月の見出し（.shelf-month-heading）も、再描画のたびに一旦取り除く。
  shelf.querySelectorAll('.spine, .shelf-month-heading').forEach(n=>n.remove());
  if(countBadge) countBadge.textContent = libraryCache.length ? t('shelfCountFormat').replace('{count}', libraryCache.length) : '';
  if(visible.length === 0){
    if(emptyMsg) emptyMsg.style.display = 'block';
    appendEmptySpine(shelf);
    applyShelfTier();
    renderTrend();
    renderShioriCard();
    renderShelfPickRecommend();
    renderBookshelfArrival();
    return;
  }
  if(emptyMsg) emptyMsg.style.display = 'none';
  // ★2026-07-18追加：「あなたの本棚」を年月単位でグループ化し、「2026年7月の棚」のような
  // 見出しを表示する。既存の並び順（libraryCacheのpush順＝時系列）は変更せず、月が変わる
  // 直前にだけ見出しを1つ挿入する（本の並び替え・保存形式は無変更）。
  let lastMonthKey = null;
  visible.forEach((entry, i)=>{
    const mk = monthKeyOf(entry.date);
    if(mk !== lastMonthKey){
      const heading = document.createElement('p');
      heading.className = 'shelf-month-heading';
      heading.textContent = monthHeadingLabel(mk);
      shelf.appendChild(heading);
      lastMonthKey = mk;
    }
    const cat = CATEGORIES.find(c=>c.id===entry.category);
    const spine = document.createElement('div');
    spine.className = 'spine';
    spine.style.background = spineGradientFor(entry.category, entry.title.length + i);
    spine.style.color = textColorFor(spineColorFor(entry.category));
    spine.style.textShadow = textShadowFor(spineColorFor(entry.category));
    spine.style.height = (140 + (entry.title.length % 4) * 12) + 'px';
    const tilt = ((entry.title.length * 7 + i * 13) % 5) - 2;
    spine.style.setProperty('--tilt', tilt + 'deg');
    // ★決裁済み変更仕様v1.2 4-2/4-3：絵文字（🔖📷）ではなく、CSS側の刻印・紙帯（.is-sealed/.has-photo）で状態を示す。
    spine.textContent = entry.title;
    if(entry.sealed) spine.classList.add('is-sealed');
    if(entry.image) spine.classList.add('has-photo');
    spine.title = cat ? categoryLabelFor(cat) : '';
    spine.onclick = ()=>{ buzz(8); openBook(entry); };
    if(markNewest && entry.id === newestId && prefs.motion){
      spine.classList.add('new');
      setTimeout(()=>spine.classList.remove('new'), 600);
    }
    shelf.appendChild(spine);
  });
  appendEmptySpine(shelf);
  applyShelfTier();
  renderTrend();
  renderShioriCard();
  renderShelfPickRecommend();
  renderBookshelfArrival();
}

// ★追加：汎用トースト通知。milestone-toastの見た目・挙動パターンを流用し、
// 「本棚に収めました」等の控えめな操作フィードバックを画面下部に一定時間だけ表示する。
function showToast(message, opts){
  // ★決裁済み変更仕様v1.2 4-1：既定アイコンの絵文字（📖）は廃止。opts.iconが明示された場合のみ付与する。
  const icon = (opts && opts.icon) || '';
  const toast = document.createElement('div');
  toast.className = 'milestone-toast gentle-toast';
  toast.textContent = icon ? (icon + ' ' + message) : message;
  document.body.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('show'));
  setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(), 500);
  }, prefs.motion ? 2600 : 1600);
}

const MILESTONES = [1,3,5,10,20,30,50,100];
async function celebrateMilestoneIfNeeded(count){
  if(!MILESTONES.includes(count)) return;
  const done = await loadJSON('emotion-bookstore-milestones', []);
  if(done.includes(count)) return;
  done.push(count);
  await saveJSON('emotion-bookstore-milestones', done);

  const toast = document.createElement('div');
  toast.className = 'milestone-toast';
  toast.textContent = MILESTONE_MESSAGES[count] || t('milestoneFallbackTpl').replace('{count}', count);
  document.body.appendChild(toast);
  buzz(15);
  requestAnimationFrame(()=>toast.classList.add('show'));
  setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(), 500);
  }, prefs.motion ? 4200 : 2000);
}

let trendPeriod = 'all';
// ★決裁済み変更仕様v1.2 4-2：感情の地図は絵文字ではなく棚色の点で表す（EMOTION_GLYPHSは廃止）。
function trendEntries(){
  const now = new Date();
  return libraryCache.filter(e=>{
    if(trendPeriod === 'all') return true;
    if(!e.date) return false;
    const d = new Date(e.date);
    if(trendPeriod === 'year') return d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}
function renderTrend(){
  const box = document.getElementById('trendBox');
  const bars = document.getElementById('trendBars');
  const sum = document.getElementById('trendSummary');
  if(!box || !bars || !sum) return;
  if(libraryCache.length === 0){
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  let tabs = document.getElementById('trendPeriodTabs');
  if(!tabs){
    tabs = document.createElement('div');
    tabs.id = 'trendPeriodTabs';
    tabs.className = 'trend-period-tabs';
    bars.parentNode.insertBefore(tabs, bars);
  }
  tabs.innerHTML = '';
  // ★2026-07-18変更：期間タブの文言をMESSAGESへ移し、英語モードでも追従させる。
  [['month','trendPeriodMonth'],['year','trendPeriodYear'],['all','trendPeriodAll']].forEach(([k,msgKey])=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'trend-period-btn' + (trendPeriod === k ? ' active' : '');
    b.textContent = t(msgKey);
    b.onclick = ()=>{ trendPeriod = k; renderTrend(); };
    tabs.appendChild(b);
  });
  const entries = trendEntries();
  const counts = {};
  // ★Step4：棚未選択（unfiled）は感情別冊数・分母・最大値・バー幅の計算すべてから除外する。
  // （月別本棚の表示や総冊数からは除外しない）
  entries.forEach(e=>{
    if(e && e.category === UNFILED_CATEGORY_ID) return;
    counts[e.category] = (counts[e.category]||0) + 1;
  });
  const countedValues = Object.values(counts);
  if(!entries.length || !countedValues.length){
    bars.innerHTML = '<p class="trend-empty">この期間に綴られた頁は、まだありません。</p>';
    sum.textContent = t('trendEmptyOwn');
    return;
  }
  const max = Math.max(...countedValues);
  // ★2026-07-18変更：行ツールチップ・カテゴリ名・冊数表示をMESSAGES／categoryLabelFor()へ移す。
  bars.innerHTML = CATEGORIES.filter(c=>counts[c.id]).map(c=>{
    const n = counts[c.id];
    const w = Math.max(8, Math.round(n / max * 100));
    const dotColor = spineColorFor(c.id);
    const label = categoryLabelFor(c);
    const tooltip = t('trendRowTooltip').replace('{shelf}', label);
    const countText = t('trendCountUnit').replace('{n}', n);
    return `<div class="trend-row" data-cat="${c.id}" style="cursor:pointer" title="${tooltip}"><span class="trend-label"><span class="trend-glyph" style="background:${dotColor}"></span>${label}</span><div class="trend-bar" style="width:${w}%;background:${spineColorFor(c.id)}"></div><span class="trend-count">${countText}</span></div>`;
  }).join('');
  bars.querySelectorAll('.trend-row').forEach(row=>{
    row.onclick = ()=>goToShelf(row.dataset.cat);
  });
  // ★2026-07-18変更：要約文の期間表現・棚名をMESSAGES／categoryLabelFor()へ移す。
  const periodKey = trendPeriod === 'month' ? 'trendSummaryPeriodMonth' : (trendPeriod === 'year' ? 'trendSummaryPeriodYear' : 'trendSummaryPeriodAll');
  const withCounts = CATEGORIES.filter(c=>counts[c.id]).sort((a,b)=>counts[b.id]-counts[a.id]);
  if(withCounts.length) sum.textContent = t('trendSummaryTemplate').replace('{period}', t(periodKey)).replace('{shelf}', categoryLabelFor(withCounts[0]));
}

function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

// ★Hotfix4-7追加：「今日の栞」専用のトップ棚判定。従来のtopCategoryId()は同点時の順序が
// CATEGORIES配列の並び任せで、かつ栞側は一度キャッシュしたcatIdを一日中使い回していたため、
// その日のうちに製本が進んで本棚の構成（＝どの棚が一番厚いか）が変わっても栞の文面が古いままに
// なる不具合があった。この関数は呼ぶたびに最新のlibraryCacheから再計算し、冊数が同数の場合は
// その日に最後に製本された棚を優先する。topCategoryId()自体は他機能（トレンド要約等）でも
// 使われているため、挙動を変えないようここでは新規の別関数として定義する。
function topCategoryIdForShiori(){
  if(libraryCache.length === 0) return null;
  const counts = {};
  const lastDateByCat = {};
  libraryCache.forEach(e=>{
    if(!e || e.category === UNFILED_CATEGORY_ID) return;
    counts[e.category] = (counts[e.category] || 0) + 1;
    const d = e.date || '';
    if(!lastDateByCat[e.category] || d > lastDateByCat[e.category]) lastDateByCat[e.category] = d;
  });
  const withCounts = CATEGORIES.filter(c=>counts[c.id]);
  if(!withCounts.length) return null;
  withCounts.sort((a,b)=>{
    if(counts[b.id] !== counts[a.id]) return counts[b.id] - counts[a.id];
    return (lastDateByCat[b.id] || '') > (lastDateByCat[a.id] || '') ? 1 : -1;
  });
  return withCounts[0].id;
}

async function renderShioriCard(){
  const card = document.getElementById('shioriCard');
  const slip = document.getElementById('shioriSlip');
  const btn = document.getElementById('shioriBtn');
  if(!card || !slip || !btn) return;

  if(libraryCache.length === 0){
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  const cached = await loadJSON('emotion-bookstore-shiori', null);
  if(cached && cached.date === todayStr() && (cached.text || cached.tplIdx != null)){
    const stext = document.getElementById('shioriText');
    // ★2026-07-19 I：tplIdxが保存されていれば現在の言語で再生成（英語モードで日本語栞を出さない）。
    // ★Hotfix1-5：旧形式（{date,text}のみ）は、日付＋保存文字列から決定的にtplIdxを割り当てて
    // 移行する（同じ日に何度読み込んでも同じテンプレート）。日本語モードでは既存のtextを尊重して
    // そのまま表示し、英語モードでは移行したtplIdxから英語テンプレートを再生成して表示する
    // （旧形式の日本語textを英語モードで表示しない）。移行内容は同じ保存キーへ追記保存する。
    if(cached.tplIdx == null){
      const migratedIdx = shelfPickSeed(String(cached.date || '') + '|' + String(cached.text || '')) % SHIORI_TEMPLATES.length;
      cached.tplIdx = migratedIdx;
      // ★Hotfix4-7：catIdはもう表示時に使わない（常に最新のトップ棚を再計算するため）が、
      // 互換のため保存自体は残す。
      cached.catId = topCategoryIdForShiori();
      cached.legacyText = cached.text; // 日本語モード用に原文を保持
      saveJSON('emotion-bookstore-shiori', cached);
    }
    // ★Hotfix4-7：文面（テンプレ文＝tplIdx）はその日のまま固定するが、言及する棚名は
    // キャッシュ済みcatIdではなく、呼ばれるたびに現在の本棚構成から再計算する
    // （同日中に製本が進んでトップ棚が変わった場合に、栞の文面が古い棚名のまま
    // 残ってしまう不具合の修正）。
    if(stext){
      stext.textContent = (appLang !== 'en' && cached.legacyText)
        ? cached.legacyText
        : shioriTextFor(cached.tplIdx, topCategoryIdForShiori());
    }
    slip.classList.remove('hidden');
    btn.classList.add('hidden');
  }else{
    slip.classList.add('hidden');
    btn.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = t('shioriBtn');
  }
}

const btnShiori = document.getElementById('shioriBtn');
if(btnShiori){
  btnShiori.onclick = async ()=>{
    const btn = document.getElementById('shioriBtn');
    btn.disabled = true;
    btn.textContent = t('shioriChoosingWords');
    await wait(prefs.motion ? 600 : 50);
    const topId = topCategoryIdForShiori();
    const tplIdx = Math.floor(Math.random() * SHIORI_TEMPLATES.length);
    const text = shioriTextFor(tplIdx, topId);

    const sText = document.getElementById('shioriText');
    if(sText) sText.textContent = text;

    const slip = document.getElementById('shioriSlip');
    if(slip) slip.classList.remove('hidden');
    btn.classList.add('hidden');

    saveJSON('emotion-bookstore-shiori', { date: todayStr(), text, tplIdx, catId: topId });
  };
}

// ★2026-07-18変更：appLangに対応させ、日本語は従来どおり「2026年7月18日 納品」、
// 英語は「July 18, 2026 · Delivered」のように表示する。書式・区切り以外の挙動（例外時の
// 空文字フォールバック）は変更していない。
function formatDate(iso){
  try{
    const d = new Date(iso);
    const locale = (appLang === 'en') ? 'en-US' : 'ja-JP';
    const formatted = d.toLocaleDateString(locale, {year:'numeric', month:'long', day:'numeric'});
    const sep = (appLang === 'en') ? ' · ' : ' ';
    return formatted + sep + t('modalDeliveredSuffix');
  }catch(e){ return ''; }
}

// ★公開整合：X公式埋め込み機能（ensureTwitterWidgets / renderTweetEmbed）は、
// 全参照ゼロを確認のうえ削除した。platform.twitter.com（widgets.js）を読み込む経路は存在しない。
// Xへの手動シェア（twitter.com/intent/tweet）と公式Xアカウントへの通常リンクは維持している。

function openBook(entry){
  lastOpenedBookEntry = entry; // ★Hotfix1-3：言語切替時の再描画用に保持（保存はしない）
  const cat = CATEGORIES.find(c=>c.id===entry.category);
  const mCat = document.getElementById('modalCat');
  if(mCat) mCat.textContent = cat ? categoryLabelFor(cat) + t('definitionLabelSep') : '';
  const mTitle = document.getElementById('modalTitle');
  if(mTitle) mTitle.textContent = entry.title;
  const mDate = document.getElementById('modalDate');
  // ★2026-07-18変更：「以前を振り返って綴った一冊」をMESSAGESへ移し、英語表示に対応させた。
  if(mDate) mDate.textContent = (entry.date ? formatDate(entry.date) : '') + (entry.sealed ? t('modalSealedNote') : '');

  const photoBox = document.getElementById('modalPhoto');
  if(photoBox){
    if(entry.image){
      document.getElementById('modalPhotoImg').src = entry.image;
      photoBox.classList.remove('hidden');
    }else{
      photoBox.classList.add('hidden');
    }
  }
  const mStory = document.getElementById('modalStory');
  if(mStory) mStory.textContent = entry.story;

  const noteSlip = document.getElementById('modalNote');
  if(noteSlip){
    if(entry.note){
      document.getElementById('modalNoteText').textContent = entry.note;
      noteSlip.classList.remove('hidden');
    }else{
      noteSlip.classList.add('hidden');
    }
  }

  const tweetBox = document.getElementById('modalTweet');
  if(tweetBox){
    // ★Hotfix4-8：X公式埋め込み（platform.twitter.com等への外部通信）は引き続き行わない。
    // entry.tweetUrlがあれば、外部通信を伴わない単純なリンク（<a href>のみ）として表示する。
    if(entry.tweetUrl){
      tweetBox.innerHTML = `<a class="tweet-fallback" href="${escapeHtml(entry.tweetUrl)}" target="_blank" rel="noopener">${escapeHtml(t('modalTweetLinkLabel'))}</a>`;
      tweetBox.classList.remove('hidden');
    }else{
      tweetBox.classList.add('hidden');
      tweetBox.innerHTML = '';
    }
  }

  const bModal = document.getElementById('bookModal');
  if(bModal) bModal.classList.remove('hidden');

  const goShelf = document.getElementById('modalGoShelf');
  if(goShelf){
    if(entry.category === UNFILED_CATEGORY_ID){
      // ★Step4：未収納（unfiled）の本では「棚へ行く」を非表示にする
      goShelf.style.display = 'none';
      goShelf.onclick = null;
    }else{
      // 通常棚へ収納された後は通常どおり再表示する
      goShelf.style.display = '';
      goShelf.onclick = ()=>{
        if(bModal) bModal.classList.add('hidden');
        goToShelf(entry.category);
      };
    }
  }

  const mShare = document.getElementById('modalShare');
  if(mShare) mShare.onclick = ()=>{
    // ★日記の本文（entry.story）はここでは一切使わない。棚名＋タイトルの短い定型文のみ。
    // window.openを同期的に呼ぶことでポップアップブロック回避（ユーザー操作直下）。
    const text = buildShareText(entry);
    const shareUrl = (typeof location !== 'undefined' && location.origin) ? location.origin + location.pathname : '';
    const win = window.open(twitterIntentUrl(text, shareUrl), '_blank', 'noopener');
    if(win) win.opener = null;
  };

  const mDel = document.getElementById('modalDel');
  if(mDel) mDel.onclick = async ()=>{
    libraryCache = libraryCache.filter(e=>e.id !== entry.id);
    await saveJSON('emotion-bookstore-library', libraryCache);
    renderShelf();
    renderShelfTabs();
    if(bModal) bModal.classList.add('hidden');
  };

  // ★2026-07-18追加：製本後の本の詳細画面から、タイトル・本文を書き直す（「名もなき本」も改題可）。
  // 本文解析・新規保存は行わず、既存の同じentryのtitle/storyだけを更新して再保存する。
  exitBookEditMode();
  const mEdit = document.getElementById('modalEdit');
  if(mEdit) mEdit.onclick = ()=>enterBookEditMode(entry);

  const mEditSave = document.getElementById('modalEditSave');
  if(mEditSave) mEditSave.onclick = async ()=>{
    const titleInput = document.getElementById('modalEditTitleInput');
    const storyInput = document.getElementById('modalEditStoryInput');
    const editMsg = document.getElementById('modalEditMsg');
    const story = storyInput ? storyInput.value.trim() : '';
    if(!story){
      if(editMsg){ editMsg.textContent = t('modalEditStoryEmpty'); editMsg.classList.remove('hidden'); }
      return;
    }
    if(countChars(story) > STORY_LIMIT){
      if(editMsg){ editMsg.textContent = t('storyLimitWarning').replace('{max}', STORY_LIMIT); editMsg.classList.remove('hidden'); }
      return;
    }
    const newTitle = (titleInput ? titleInput.value.trim() : '') || t('manaReceiveBookFallback') || 'まだ、題名のない本';
    entry.title = newTitle;
    entry.story = story;
    const savedOk = await saveJSON('emotion-bookstore-library', libraryCache);
    if(!savedOk){
      if(editMsg){ editMsg.textContent = t('manaReceiveSaveError'); editMsg.classList.remove('hidden'); }
      return;
    }
    if(mTitle) mTitle.textContent = entry.title;
    if(mStory) mStory.textContent = entry.story;
    renderShelf();
    renderShelfTabs();
    exitBookEditMode();
  };

  const mEditCancel = document.getElementById('modalEditCancel');
  if(mEditCancel) mEditCancel.onclick = ()=>exitBookEditMode();
}

// ★2026-07-18追加：本の詳細モーダルの編集モード切替。表示用要素は残したまま、
// 入力用要素の表示/非表示だけを切り替える（openBook()の再呼び出しに依存しない）。
function enterBookEditMode(entry){
  const mTitle = document.getElementById('modalTitle');
  const mStory = document.getElementById('modalStory');
  const titleInput = document.getElementById('modalEditTitleInput');
  const storyInput = document.getElementById('modalEditStoryInput');
  const actions = document.getElementById('modalEditActions');
  const normalActions = document.getElementById('modalActions');
  const editMsg = document.getElementById('modalEditMsg');
  if(!mTitle || !mStory || !titleInput || !storyInput || !actions) return;
  titleInput.value = entry.title || '';
  storyInput.value = entry.story || '';
  mTitle.classList.add('hidden');
  mStory.classList.add('hidden');
  titleInput.classList.remove('hidden');
  storyInput.classList.remove('hidden');
  actions.classList.remove('hidden');
  if(normalActions) normalActions.classList.add('hidden');
  if(editMsg){ editMsg.textContent = ''; editMsg.classList.add('hidden'); }
  titleInput.focus();
}
function exitBookEditMode(){
  const mTitle = document.getElementById('modalTitle');
  const mStory = document.getElementById('modalStory');
  const titleInput = document.getElementById('modalEditTitleInput');
  const storyInput = document.getElementById('modalEditStoryInput');
  const actions = document.getElementById('modalEditActions');
  const normalActions = document.getElementById('modalActions');
  const editMsg = document.getElementById('modalEditMsg');
  if(mTitle) mTitle.classList.remove('hidden');
  if(mStory) mStory.classList.remove('hidden');
  if(titleInput) titleInput.classList.add('hidden');
  if(storyInput) storyInput.classList.add('hidden');
  if(actions) actions.classList.add('hidden');
  if(normalActions) normalActions.classList.remove('hidden');
  if(editMsg){ editMsg.textContent = ''; editMsg.classList.add('hidden'); }
}

const btnModalClose = document.getElementById('modalClose');
if(btnModalClose) btnModalClose.onclick = ()=>{
  const m = document.getElementById('bookModal');
  if(m) m.classList.add('hidden');
};

/* ==========================================================================
 * ★2026-07-19 feature/first-visit-experience：閲覧専用のサンプル本。
 * ・固定データのみ（下のSAMPLE_BOOK_*）。localStorageへ保存しない・libraryCacheへ
 *   追加しない・編集/削除/共有の対象にしない。実在利用者の文章は使わず、この書店の
 *   ために作成した架空の短文（MESSAGES.sampleBookStory）を使用する。
 * ・閉じると表紙（現在の画面）へそのまま戻る。GA4の送信は行わない。
 * ★Hotfix4-1：以前は既存の本詳細画面（#bookModal、position:fixedの全画面オーバーレイ）を
 *   流用していたが、iPhone Safari幅で背景の文章と重なる／親の.about-accordion-contentが
 *   max-height:400px+overflow:hiddenで下部が切れる、という報告を受け、#bookModalは
 *   一切使わず、「はじめての方へ」パネル内の#sampleBookInline（通常のドキュメントフロー
 *   要素）へ表示する方式へ変更した。#bookModal側（実在の本の詳細表示）の挙動・DOM・
 *   スタイルは変更していない。
 * ========================================================================== */
const SAMPLE_BOOK_CATEGORY_ID = 'natsukashii'; // 既存の感情棚ID（data.jsは変更しない）
const SAMPLE_BOOK_DATE = '2026-06-01T19:00:00+09:00'; // 見本の製本日（固定）

function isSampleBookOpen(){
  const box = document.getElementById('sampleBookInline');
  return !!(box && !box.classList.contains('hidden'));
}

function openSampleBook(){
  const box = document.getElementById('sampleBookInline');
  if(!box) return;
  const cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES.find(c=>c.id === SAMPLE_BOOK_CATEGORY_ID) : null;
  const catEl = document.getElementById('sampleInlineCat');
  if(catEl) catEl.textContent = cat ? categoryLabelFor(cat) + t('definitionLabelSep') : '';
  const titleEl = document.getElementById('sampleInlineTitle');
  if(titleEl) titleEl.textContent = t('sampleBookTitle');
  const dateEl = document.getElementById('sampleInlineDate');
  if(dateEl) dateEl.textContent = formatDate(SAMPLE_BOOK_DATE);
  const storyEl = document.getElementById('sampleInlineStory');
  if(storyEl) storyEl.textContent = t('sampleBookStory');
  const noteTextEl = document.getElementById('sampleInlineNoteText');
  if(noteTextEl) noteTextEl.textContent = t('sampleBookNote');
  const badgeEl = box.querySelector('.sample-book-badge');
  if(badgeEl) badgeEl.textContent = t('sampleBookBadge');
  box.classList.remove('hidden');
  const btn = document.getElementById('samplePeekBtn');
  if(btn){ btn.textContent = t('closeBtn'); btn.setAttribute('aria-expanded','true'); }
}

function closeSampleBook(){
  const box = document.getElementById('sampleBookInline');
  if(box) box.classList.add('hidden');
  const btn = document.getElementById('samplePeekBtn');
  if(btn){ btn.textContent = t('samplePeekBtn'); btn.setAttribute('aria-expanded','false'); }
}

// 言語切替時：サンプル本を開いたままなら、見本の本文・栞・バッジも現在の言語で再描画する。
function refreshSampleBookIfOpen(){
  if(isSampleBookOpen()) openSampleBook();
}

function runBinding(onDone){
  if(!prefs.motion){ onDone(); return; }
  const ov = document.getElementById('bindOverlay');
  const txt = document.getElementById('bindText');
  if(!ov || !txt){ onDone(); return; }
  let t1, t2, finished = false;
  function finish(){
    if(finished) return;
    finished = true;
    clearTimeout(t1); clearTimeout(t2);
    ov.classList.add('hidden');
    ov.classList.remove('animating');
    ov.onclick = null;
    onDone();
  }
  ov.classList.remove('hidden');
  ov.classList.add('animating');
  txt.textContent = t('bindText');
  // ★v1.3 Phase C-2：製本演出を0.8〜1.5秒レンジへ短縮（決裁済み：850→500、1800→1200）。
  // 2段階文言（bindText/bindTextStep2）は維持。スキップ・no-motion経路・保存順序は無変更。
  t1 = setTimeout(()=>{ txt.textContent = t('bindTextStep2'); }, 500);
  t2 = setTimeout(finish, 1200);
  ov.onclick = finish;
}

function showInvitation(catId){
  const inv = INVITES[catId];
  if(!inv) return;
  const t = document.getElementById('invTitle');
  if(t) t.textContent = inv.t;
  const b = document.getElementById('invBody');
  if(b){
    const catIdx = Math.max(0, CATEGORIES.findIndex(c=>c.id===catId));
    const dailyBody = composeDailyMessage('invitation', 100 + catIdx * 7, shelfLabelOf(catId));
    b.textContent = dailyBody || inv.b;
  }
  const goBtn = document.getElementById('invGoShelf');
  if(goBtn){
    goBtn.onclick = ()=>{
      const c = document.getElementById('invitationCard');
      if(c) c.classList.add('hidden');
      goToShelf(catId);
    };
  }
  const c = document.getElementById('invitationCard');
  if(c) c.classList.remove('hidden');
}

const btnInvClose = document.getElementById('invClose');
if(btnInvClose) btnInvClose.onclick = ()=>{
  const c = document.getElementById('invitationCard');
  if(c) c.classList.add('hidden');
};

function showCurateBox(message, actions){
  const box = document.getElementById('curateBox');
  const msgEl = document.getElementById('curateMsg');
  const actEl = document.getElementById('curateActions');
  if(!box || !msgEl || !actEl) return;
  msgEl.textContent = message;
  actEl.innerHTML = '';
  actions.forEach(a=>{
    const btn = document.createElement('button');
    btn.className = a.primary ? 'curate-btn primary' : (a.link ? 'curate-cancel' : 'curate-btn');
    btn.textContent = a.label;
    btn.onclick = ()=>{ hideCurateBox(); a.onClick(); };
    actEl.appendChild(btn);
  });
  box.classList.remove('hidden');
}
function hideCurateBox(){
  const box = document.getElementById('curateBox');
  if(box) box.classList.add('hidden');
}

const btnAssist = document.getElementById('assistBtn');
if(btnAssist) {
  btnAssist.onclick = ()=>{
    const ta = document.getElementById('storyInput');
    if(!ta) return;
    if(ta.value.trim() === ''){
      // ★Hotfix2-2：現在のappLangに応じたテンプレートを挿入する（日本語ハードコードを解消）。
      // 既存の入力内容がある場合は上書きしない挙動は変更しない（空欄チェックはそのまま）。
      ta.value = t('assistTemplate');
      updateStoryCount();
    }
    ta.focus();
  };
}

function updateStoryCount(){
  const ta = document.getElementById('storyInput');
  const el = document.getElementById('storyCount');
  if(!ta || !el) return;
  const len = countChars(ta.value);
  el.textContent = t('storyCountFormat').replace('{count}', len).replace('{max}', STORY_LIMIT);
  el.classList.toggle('over', len > STORY_LIMIT);
}

const inputStory = document.getElementById('storyInput');
if(inputStory) {
  inputStory.addEventListener('input', updateStoryCount);
}

// ★GA4整合：start_writing — 本文入力欄が「空の状態から初めて非空になった」ときに1回だけ送信。
// focusでは発火しない（inputイベントのみ）。文字列・文字数・題名・棚等は送らない。ページロード単位のガード。
if(inputStory) {
  inputStory.addEventListener('input', ()=>{
    if(_gaStartWritingSent) return;
    if(inputStory.value.trim()){
      _gaStartWritingSent = true;
      trackAnalyticsEvent('start_writing');
    }
  });
}

const DRAFT_KEY = 'emotion-bookstore-draft';
let draftTimer = null;
if(inputStory) {
  inputStory.addEventListener('input', ()=>{
    clearTimeout(draftTimer);
    draftTimer = setTimeout(()=>{
      const text = document.getElementById('storyInput').value;
      if(text.trim()){
        saveJSON(DRAFT_KEY, { text, date: new Date().toISOString() });
      }else{
        deleteKey(DRAFT_KEY);
      }
      renderTitleSuggest();
    }, 500);
  });
}

async function restoreDraftIfAny(){
  const draft = await loadJSON(DRAFT_KEY, null);
  if(!draft || !draft.text) return;
  // ★Step2：下書きは保存日時（draft.date）から7日以内のみ復元。
  // 7日経過、または日時が欠落・不正な場合は破棄（クリア）する。
  const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const savedAt = draft.date ? new Date(draft.date).getTime() : NaN;
  if(!isFinite(savedAt) || (Date.now() - savedAt) > DRAFT_MAX_AGE_MS){
    deleteKey(DRAFT_KEY);
    return;
  }
  const ta = document.getElementById('storyInput');
  if(!ta) return;
  if(ta.value.trim()) return;
  const msg = document.getElementById('deskMsg');
  ta.value = draft.text;
  updateStoryCount();
  if(msg) msg.textContent = t('draftRestored');
}

// ★Step4：unfiled保存成功後の「任意の棚収納UI」。
// ・既存21棚の選択肢はCATEGORIESから動的生成（ハードコードしない）
// ・棚を選ぶと、製本済みの同じentryのcategoryだけを更新して再保存（新規本は追加しない）
// ・スキップ時はunfiledのまま再保存せず本棚へ戻る
// ・確定／スキップは一度限りガード（handled）で二重保存・二重遷移を防止
// ・視覚デザインは後続のSonnetが担当するため、ここでは機能する最低限のDOMのみ
function hideUnfiledShelfPicker(){
  const box = document.getElementById('unfiledShelfPicker');
  if(box){ box.innerHTML = ''; box.classList.add('hidden'); }
}

// ★Hotfix4.1追加：受け取り頁（棚選択）を開いたまま言語を切り替えた場合に、
// 再読み込みなしで option の表示名だけを現在の言語へ更新する。
// 選択中の value（内部カテゴリID）は保持し、未選択（プレースホルダー）の場合は未選択のまま維持する。
// 並び順・選択肢の数・value は一切変更しない（表示ラベルのみの更新）。
function refreshUnfiledShelfPickerLabels(){
  const box = document.getElementById('unfiledShelfPicker');
  if(!box || box.classList.contains('hidden')) return;
  const select = document.getElementById('unfiledShelfSelect');
  if(!select) return;
  const keepValue = select.value; // 内部IDを保持
  Array.from(select.options).forEach(o=>{
    if(o.value === ''){
      o.textContent = t('manaReceivePlaceholder');
      return;
    }
    const cat = CATEGORIES.find(c=>c.id === o.value);
    if(cat) o.textContent = categoryLabelFor(cat);
  });
  select.value = keepValue; // 切替前後で選択状態を維持
  const label = box.querySelector('label[for="unfiledShelfSelect"]');
  if(label) label.textContent = t('manaReceiveShelfLabel');
  const confirmBtn = document.getElementById('unfiledShelfConfirm');
  if(confirmBtn) confirmBtn.textContent = t('manaReceiveConfirm');
  const skipBtn = document.getElementById('unfiledShelfSkip');
  if(skipBtn) skipBtn.textContent = t('manaReceiveSkip');
  const pageLabel = box.querySelector('.mana-page-label');
  if(pageLabel) pageLabel.textContent = t('manaPageHeading');
  const line = box.querySelector('.mana-receive-line');
  if(line) line.textContent = t('manaReceiveLine');
  box.setAttribute('aria-label', t('manaReceiveAriaLabel'));
}

function showUnfiledShelfPicker(entry){
  // ★v1.3最終統合：単なる「任意の棚収納UI」から、店主まなが本を預かる場面（受け取り頁）へ
  // 再構成する。新しい別保存処理や別entryは作らない（現行の同じentryを使う）。
  // 表示するもの：まなのオリジナルイラスト／製本された本の表紙プレビュー／店主の短い言葉／
  // 棚選択（任意）／「この棚にしまう」／「今は棚を決めず、本棚へ」（仕様書1-3）。
  let box = document.getElementById('unfiledShelfPicker');
  if(!box){
    box = document.createElement('div');
    box.id = 'unfiledShelfPicker';
    box.className = 'unfiled-shelf-picker mana-receive-overlay';
    document.body.appendChild(box);
  }
  box.classList.remove('hidden');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', t('manaReceiveAriaLabel'));
  box.innerHTML = '';

  let handled = false; // 一度限りガード（連打・両ボタン連続操作の防止）

  const card = document.createElement('div');
  card.className = 'mana-receive-card';

  // ★v1.3公開前最終修正：主動線の頁番号（仕様書1章）。第三頁のみ、このカード内に見出しとして追加。
  const pageLabel = document.createElement('p');
  pageLabel.className = 'page-label mana-page-label';
  pageLabel.textContent = t('manaPageHeading');
  card.appendChild(pageLabel);

  // 店主まなのオリジナルイラスト。周辺のmanaReceiveLineと内容が重複するため装飾画像として
  // alt=""を付与（読み込み失敗時もカード自体はそのまま機能する＝画像なしフォールバック）。
  const figure = document.createElement('div');
  figure.className = 'mana-receive-figure';
  const figureImg = document.createElement('img');
  figureImg.src = '/assets/mana-counter.webp';
  figureImg.alt = t('manaImageAlt');
  figureImg.width = 1120;
  figureImg.height = 1400;
  figureImg.loading = 'lazy';
  figureImg.onerror = function(){ figure.classList.add('img-failed'); this.remove(); };
  figure.appendChild(figureImg);
  card.appendChild(figure);

  // 製本された本の表紙プレビュー（新規保存はしない。既存entryの題名をそのまま表示するだけ）
  const bookPreview = document.createElement('div');
  bookPreview.className = 'mana-receive-book';
  const bookPreviewTitle = document.createElement('span');
  bookPreviewTitle.className = 'mana-receive-book-title';
  bookPreviewTitle.textContent = entry.title || t('manaReceiveBookFallback');
  bookPreview.appendChild(bookPreviewTitle);
  card.appendChild(bookPreview);

  // 店主の確定文（同一文の連続表示・本文の理解や助言・感情棚の推測はしない）
  const line = document.createElement('p');
  line.className = 'mana-receive-line';
  line.textContent = t('manaReceiveLine');
  card.appendChild(line);

  // ★修正：棚を明示的に選ぶまで先頭棚が暗黙選択されないよう、
  // ラベルとプレースホルダー（value=''・selected・disabled）を先頭に置く。
  // プレースホルダーはCATEGORIESに追加せず、保存カテゴリとしても使用しない。
  const label = document.createElement('label');
  label.setAttribute('for', 'unfiledShelfSelect');
  label.textContent = t('manaReceiveShelfLabel');

  const select = document.createElement('select');
  select.id = 'unfiledShelfSelect';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('manaReceivePlaceholder');
  placeholder.selected = true;
  placeholder.disabled = true;
  select.appendChild(placeholder);
  // ★Hotfix4.1：英語モードでも option の表示名が生の日本語（cat.label）のままだった不具合を修正。
  // 棚タブ・棚見出しなど他のUIと同じ categoryLabelFor() を通し、既存のCATEGORY_LABEL_EN（21棚）を
  // そのまま再利用する（新しい英訳は作らない）。option.value は内部IDのまま一切変更しない。
  CATEGORIES.forEach(c=>{
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = categoryLabelFor(c);
    select.appendChild(o);
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.id = 'unfiledShelfConfirm';
  confirmBtn.className = 'chart-btn primary';
  confirmBtn.textContent = t('manaReceiveConfirm');
  confirmBtn.disabled = true; // ★修正：初期状態は無効（正規の棚を選ぶまで確定できない）

  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.id = 'unfiledShelfSkip';
  skipBtn.className = 'chart-btn ghost';
  skipBtn.textContent = t('manaReceiveSkip');

  // 選択値がCATEGORIESに存在する正規IDの場合だけ確定ボタンを有効化する
  const isValidShelfSelected = ()=>CATEGORIES.some(c=>c.id === select.value);
  const updateConfirmState = ()=>{ confirmBtn.disabled = !isValidShelfSelected(); };
  select.addEventListener('change', updateConfirmState);

  const setBusy = (busy)=>{
    select.disabled = busy;
    skipBtn.disabled = busy;
    if(busy){
      confirmBtn.disabled = true;
    }else{
      // ★修正：再有効化の際も、正規の棚が選択されている場合だけ確定ボタンを有効にする
      updateConfirmState();
    }
  };

  const errorMsg = document.createElement('p');
  errorMsg.className = 'mana-receive-error hidden';
  errorMsg.setAttribute('role', 'status');

  confirmBtn.onclick = async ()=>{
    if(handled) return;
    handled = true;
    setBusy(true);
    const selectedId = select.value;
    // 選択値がCATEGORIESに存在する正規のIDであることを確認する
    if(!CATEGORIES.some(c=>c.id === selectedId)){
      handled = false;
      setBusy(false);
      return;
    }
    // 製本済みの同じentryのcategoryだけを更新（新規本は追加しない）
    const prevCategory = entry.category; // 更新前の 'unfiled' を保持
    entry.category = selectedId;
    const savedOk = await saveJSON('emotion-bookstore-library', libraryCache);
    if(!savedOk){
      // 保存失敗：unfiledへ巻き戻し、UIは閉じず再試行可能な状態を維持。感情棚へは遷移しない。
      entry.category = prevCategory;
      errorMsg.textContent = t('manaReceiveSaveError');
      errorMsg.classList.remove('hidden');
      handled = false;
      setBusy(false);
      return;
    }
    // ★v1.3最終統合：棚選択後も感情棚へは自動遷移せず、本棚へ移動する（仕様書1-3）。
    // category更新・再保存は現行どおり。activeCategoryは感情棚を任意で開いたときのために
    // 更新するのみで、表示・保存には影響しない（renderShelfDisplay()はここでは呼ばない）。
    // ★Hotfix1-2追加修正：本棚での未分類本の棚確定も利用者の明示的な棚選択のため、shelfWasChosenを更新する。
    setActiveShelf(selectedId);
    renderShelf();
    renderShelfTabs();
    hideUnfiledShelfPicker();
    // view_shelfは本棚への移動として、goToPage('bookshelf')内の既存GA4処理で1回だけ発火する。
    goToPage('bookshelf');
    // 遷移直後に節目処理を1回だけ実行（節目判定・1回限りの記録は既存実装のまま）
    celebrateMilestoneIfNeeded(libraryCache.length);
  };

  skipBtn.onclick = ()=>{
    if(handled) return;
    handled = true;
    // categoryはunfiledのまま変更せず、再保存も行わない。招待カードも表示しない。
    hideUnfiledShelfPicker(); // UIを閉じ、同じ操作が再発火しないようにする
    goToPage('bookshelf');
    // 遷移直後に節目処理を1回だけ実行
    celebrateMilestoneIfNeeded(libraryCache.length);
  };

  card.appendChild(label);
  card.appendChild(select);
  const actions = document.createElement('div');
  actions.className = 'mana-receive-actions';
  actions.appendChild(confirmBtn);
  actions.appendChild(skipBtn);
  card.appendChild(actions);
  card.appendChild(errorMsg);

  box.appendChild(card);
  const focusTarget = document.getElementById('unfiledShelfSelect');
  if(focusTarget) focusTarget.focus();
}

const btnSubmit = document.getElementById('submitStory');
if(btnSubmit) {
  btnSubmit.onclick = async ()=>{
    // ★Step4：categorySelectの値は初回保存カテゴリとして使用しない。
    // 初回製本は必ず中立ID 'unfiled' で保存し、棚は保存成功後の任意収納UIでのみ選ぶ。
    const chosenId = UNFILED_CATEGORY_ID;
    const ta = document.getElementById('storyInput');
    const story = ta ? ta.value.trim() : '';
    const msg = document.getElementById('deskMsg');
    const btn = document.getElementById('submitStory');
    hideCurateBox();
    if(!story){
      if(msg) msg.textContent = t('storyTooShort');
      return;
    }
    const tInput = document.getElementById('titleInput');
    // ★Step3：本文からの題名提案（suggestTitles）・ランダム題名（generateTitle）を停止。
    // 手入力題名はそのまま維持し、空欄時のみ固定の題名を用いる。
    const title = (tInput ? tInput.value.trim() : '') || 'まだ、題名のない本';
    if(countChars(story) > STORY_LIMIT){
      if(msg) msg.textContent = t('storyLimitWarning').replace('{max}', STORY_LIMIT);
      return;
    }
    btn.disabled = true;
    if(msg) msg.textContent = t('storyReviewing');

    const chosenLabel = (CATEGORIES.find(c=>c.id===chosenId) || {}).label || '';
    const twInput = document.getElementById('tweetInput');
    // ★Hotfix4-8：入力しても製本後の本に反映されない不具合の修正。X公式埋め込み
    // （platform.twitter.com等への外部通信）は行わないという方針はそのまま維持し、
    // ここでは単純な入力値の保存のみを行う（外部通信なし）。空欄は任意項目のため許可する。
    const tweetUrlRaw = twInput ? twInput.value.trim() : '';
    if(tweetUrlRaw && !/^https?:\/\/\S+$/i.test(tweetUrlRaw)){
      if(msg) msg.textContent = t('tweetLinkInvalid');
      btn.disabled = false;
      return;
    }
    const tweetUrl = tweetUrlRaw;
    const wSel = document.getElementById('whenSelect');
    const isPast = wSel ? (wSel.value === 'past') : false;
    await wait(prefs.motion ? 500 : 30);
    const cur = localCurate(title, story, chosenId);

    const bind = (finalCategory, note)=>{
      runBinding(async ()=>{
        const entry = {
          id: Date.now().toString(),
          category: finalCategory,
          title, story,
          note: note || '',
          image: attachedPhoto || '',
          tweetUrl: tweetUrl || '',
          sealed: isPast,
          date: new Date().toISOString()
        };
        libraryCache.push(entry);

        // ★Step2：製本（IndexedDBへのput）を先に確定させる。
        // 失敗時は本棚へ並べず巻き戻し、入力欄・下書きはそのまま残す（保存エラーは最優先メッセージ）。
        const savedOk = await saveJSON('emotion-bookstore-library', libraryCache);
        if(!savedOk){
          libraryCache = libraryCache.filter(e=>e.id !== entry.id);
          if(msg) msg.textContent = 'すみません。保存がうまく完了しませんでした。書いた言葉は消さず、少ししてからもう一度お試しください。';
          btn.disabled = false;
          // ★GA4整合：create_book_error — 新しい本の初回保存が失敗したときに1回。
          // 棚収納時のcategory更新失敗では発火しない。エラー内容・本文・題名等は送らない。
          trackAnalyticsEvent('create_book_error');
          return;
        }
        // ★GA4整合：create_book_success — 新しい本の初回IndexedDB保存が成功した直後に1回。
        // unfiled→通常棚へのcategory更新成功では発火しない。本文・題名・category・ID・冊数等は送らない。
        trackAnalyticsEvent('create_book_success');
        // ★2026-07-19 G：製本完了ごとに、おすすめの「出会い」を新しく引き直す。
        if(typeof rotateRecoEncounter === 'function') rotateRecoEncounter();

        clearAttachedPhoto();
        playSuckAnimation(finalCategory);
        selectedShelfMonth = 'all'; // 保存直後は必ず新しい一冊が見えるよう、月別フィルタを解除する
        renderShelf(true);
        renderShelfTabs();
        if(tInput) tInput.value = '';
        if(ta) ta.value = '';
        await deleteKey(DRAFT_KEY); // ★Step2：下書きのクリアは「保存成功の直後」にのみ行い、完了を待ってから後続処理へ進む
        if(twInput) twInput.value = '';
        if(wSel) wSel.value = 'now';
        updateStoryCount();
        // ★Step2：製本成功時のメッセージは固定の一文のみ（1操作1メッセージ。トースト併発は廃止）
        // ★2025-07-17追記：MESSAGES.bindSuccessMsg経由に変更し、言語切替に対応（発火条件・位置は無変更）
        if(msg) msg.textContent = t('bindSuccessMsg');
        btn.disabled = false;
        const boundMsg = msg ? msg.textContent : '';
        setTimeout(()=>{ if(msg && msg.textContent === boundMsg) msg.textContent = ''; }, 4200);

        // ★Step4：中立ID（unfiled）で保存した場合は、通常カテゴリ保存後の処理
        // （招待カード・1.5秒後の本棚自動遷移・特定棚への遷移）へは進まない。
        // 代わりに、任意の棚収納UI（既存21棚から選ぶ／今は棚を決めず本棚へ戻る）を表示する。
        // 節目処理は、収納UIでの遷移直後に1回だけ実行される（showUnfiledShelfPicker内）。
        if(finalCategory === UNFILED_CATEGORY_ID){
          showUnfiledShelfPicker(entry);
          return;
        }

        // ★Step2修正：節目メッセージ（最初の一冊 等）は、実際に本棚へ遷移した直後にのみ発火する。
        // 招待カードの表示中には出さない（固定時間のsetTimeoutによる独立発火は廃止）。
        // 1回限りの記録ロジックはcelebrateMilestoneIfNeeded側の既存実装のまま。
        // （以下は通常カテゴリでbindが呼ばれた場合の互換として維持。現行フローの初回保存は常にunfiled）
        const goToBookshelfThenMilestone = ()=>{
          goToPage('bookshelf');
          celebrateMilestoneIfNeeded(libraryCache.length);
        };

        const inv = INVITES[finalCategory];
        if(inv){
          showInvitation(finalCategory);
          // ★Step2修正：招待カードの両方の終了経路（しおりに挟む＝invClose／棚を見てみる＝invGoShelf）とも、
          // カードを閉じて遷移した「直後」に節目処理を1回だけ実行する。
          // 連打や両ボタンの連続操作による遷移・節目処理の重複は、bind内の一度限りガード(invHandled)で防ぐ。
          // 節目の判定・1回限りの記録はcelebrateMilestoneIfNeeded側の既存実装のまま。
          let invHandled = false;
          const closeBtn = document.getElementById('invClose');
          const goShelfBtn = document.getElementById('invGoShelf');
          const originalCloseClick = closeBtn ? closeBtn.onclick : null;
          const finishInvitation = (navigate)=>{
            if(invHandled) return; // 一度限りガード
            invHandled = true;
            const card = document.getElementById('invitationCard');
            if(card) card.classList.add('hidden');
            navigate();
            celebrateMilestoneIfNeeded(libraryCache.length);
            if(closeBtn) closeBtn.onclick = originalCloseClick;
            // invGoShelfのonclickは、次回showInvitation()が毎回再設定するため復元不要
          };
          if(closeBtn) closeBtn.onclick = ()=>finishInvitation(()=>goToPage('bookshelf'));
          if(goShelfBtn) goShelfBtn.onclick = ()=>finishInvitation(()=>goToShelf(finalCategory));
        } else {
          setTimeout(() => goToBookshelfThenMilestone(), 1500);
        }
      });
    };

    if(!cur){
      if(msg) msg.textContent = '';
      bind(chosenId, '');
      return;
    }

    if(!cur.approved){
      if(msg) msg.textContent = '';
      btn.disabled = false;
      showCurateBox(
        (cur.reason || 'この内容は、いまはお預かりできません。') + '\n少し書き方を変えて、また持ってきてくださいね。',
        [{ label:'書き直す', primary:true, onClick:()=>{ if(ta) ta.focus(); } }]
      );
      return;
    }

    const suggested = cur.category;
    if(suggested && suggested !== chosenId){
      const sLabel = (CATEGORIES.find(c=>c.id===suggested) || {}).label || '';
      if(msg) msg.textContent = '';
      showCurateBox(
        'この物語、『' + sLabel + '』の棚がよく似合いそうです。どちらに納めましょうか。',
        [
          { label:'『' + sLabel + '』の棚に納品', primary:true, onClick:()=>bind(suggested, cur.note) },
          { label:'『' + chosenLabel + '』のまま納品', onClick:()=>bind(chosenId, cur.note) },
          // ★2026-07-18追加：製本前に原稿へ戻れるよう、単なる取消ではなく本文欄へフォーカスを戻す。
          { label:t('curateBackToDraft'), link:true, onClick:()=>{ btn.disabled = false; if(ta) ta.focus(); } }
        ]
      );
      return;
    }

    if(msg) msg.textContent = '';
    bind(chosenId, cur.note);
  };
}

const btnExport = document.getElementById('exportDiary');
if(btnExport) {
  btnExport.onclick = async ()=>{
    const btn = document.getElementById('exportDiary');
    btn.textContent = t('exportingBtn');
    try{
      await exportDiaryText();
      btn.textContent = t('exportedBtn');
    }catch(e){
      btn.textContent = t('exportFailBtn');
    }
    setTimeout(()=>{ btn.textContent = t('exportDefaultBtn'); }, 2500);
  };
}

const btnExportCsv = document.getElementById('exportDiaryCsv');
if(btnExportCsv) {
  btnExportCsv.onclick = async ()=>{
    const btn = document.getElementById('exportDiaryCsv');
    btn.textContent = t('exportingBtn');
    try{
      await exportDiaryCsv();
      btn.textContent = t('exportedBtn');
    }catch(e){
      btn.textContent = t('exportFailBtn');
    }
    setTimeout(()=>{ btn.textContent = t('csvExportDefaultBtn'); }, 2500);
  };
}

const btnReset = document.getElementById('resetShelf');
if(btnReset) {
  btnReset.onclick = async ()=>{
    if(!confirm('本棚のすべての本を下げます。よろしいですか？')) return;
    libraryCache = [];
    await saveJSON('emotion-bookstore-library', libraryCache);
    renderShelf();
    renderShelfTabs();
  };
}

// ★追加：25文字以上の複雑な長文には、単なる相槌ではなく
// カウンセリング的な「深掘り」の質問を返す（DEEP_DIVE_REPLIES／data.js）
const DEEP_DIVE_MIN_CHARS = 25;

// ★追加：「何でも答えてくれるAI」だと勘違いして、専門的な質問・議論・作業依頼を
// ふっかけられた際に、店主の世界観を保ったまま「AIではない」ことをやんわり伝える返答
const AI_MISMATCH_PATTERNS = [
  '教えて', 'とは何', 'とは？', 'って何', '解説して', '解説を', '解説お願い', '説明して', '説明お願い',
  'について教えて', '意見を聞かせて', 'どう思いますか', 'どう思う？', 'あなたの意見',
  '議論しよう', '討論', 'ディベート', '計算して', 'コードを', 'コーディング', 'プログラム',
  '翻訳して', '要約して', 'レポートを書いて', '作文して', '添削して', '論文', '定理', '証明して',
  '公式を', 'アルゴリズム', 'メリットとデメリット', '違いは何', '違いを教えて', 'まとめて',
  '所有論', '弁証法', '認識論', '存在論'
];
const AI_MISMATCH_REPLIES = [
  '……申し訳ありません。私は本と感情の整理をお手伝いするだけの店番ですので、難しいお話には気の利いた返しができません。ですが、そのお気持ちをお預かりすることならできますよ。',
  '……専門的なことになると、私はとんと不勉強なもので……お力になれず申し訳ないです。ただ、そのことについて考えているときのご自分の気持ちになら、耳を傾けられます。',
  '……そのご質問には、私よりもっと物知りな方が向いているかもしれません。私にできるのは、いま揺れているあなたの心に、そっと寄り添うことくらいです。',
  '……むずかしいお話ですね。明快な答えは持ち合わせていませんが、それに触れて浮かんだ気持ちになら、近い棚があるかもしれません。'
];

// ★Step3：外部AI（ChatGPT／Gemini）への案内リンク機能は完全停止のため削除した。
// （isAiMismatchTopic / renderAiReferralLinks は全参照ゼロを確認のうえ削除。
//   利用者本文をURLクエリへ含める encodeURIComponent(userText) を伴う導線は存在しない）

function matchShopkeeperReply(text, fallbackShelfId){
  // ★Step3：キーワード一致・質問判定・カウンセリング風応答・ランダム応答をすべて停止。
  // 入力内容・棚は一切参照せず、固定の一文のみを返す（関数契約は維持）。
  // 会話回数による進行の切り替えは呼び出し元（sendToShopkeeper）が行う。
  return 'お話しくださって、ありがとうございます。続けても、ここで一度閉じても大丈夫です。';
}

// ★英語モード完全性監査：CATEGORIES（data.js・変更禁止）は日本語の.labelしか持たないため、
// data.js自体には手を入れず、main.js側だけで21棚ぶんの英語表記テーブルを別途持つ。
// 英語モード時はこちらを優先して使い、日本語モードでは従来どおりcat.labelをそのまま使う。
const CATEGORY_LABEL_EN = {
  moyamoya: 'Unnamed Feeling', // ★2026-07-19：表示名変更（内部IDは不変）
  kodoku: 'Lonely',
  gakkari: 'Disappointed',
  hazukashii: 'Embarrassed',
  ushirometai: 'Guilty',
  aseri: 'Impatient',
  kuyashii: 'Frustrated',
  shitto: 'Jealous',
  akogare: 'Longing',
  wakuwaku: 'Excited',
  ando: 'Relieved',
  kansha: 'Grateful',
  itooshii: 'Tender',
  hokorashii: 'Proud',
  natsukashii: 'Nostalgic',
  ureshii: 'Happy',
  ikari: 'Angry',
  kanashii: 'Sad',
  fuan: 'Uneasy',
  keno: 'Disgusted',
  odoroki: 'Surprised'
};
function categoryLabelFor(cat){
  if(!cat) return '';
  if(appLang === 'en' && CATEGORY_LABEL_EN[cat.id]) return CATEGORY_LABEL_EN[cat.id];
  return cat.label || '';
}
function shelfLabelOf(id){
  const cat = CATEGORIES.find(c=>c.id===id);
  if(!cat) return '';
  return categoryLabelFor(cat);
}

// ★2026-07-18追加：旧チャット（自由入力・CHAT_TREE経由の会話）に代わる、編纂机の
// 「言葉にするための助け舟」。本文解析・外部AI送信は一切行わず、選んだ棚（感情）id ごとの
// 固定の問いを2つだけ提示する（data.jsは変更しない。CATEGORIESのidだけを参照する）。
const WRITING_PROMPTS = {
  moyamoya:    { ja:['まだ名前のつかないその気持ちは、どのあたりにありますか。', 'その気持ちは、いつ頃から胸にありますか。'],
                 en:['What feels the murkiest right now?', 'How long has this haze been sitting with you?'] },
  kodoku:      { ja:['ひとりだと感じたのは、どんな瞬間でしたか。', '本当は、誰にそばにいてほしかったですか。'],
                 en:['What moment made you feel most alone?', 'Who did you wish had been there with you?'] },
  gakkari:     { ja:['何を、どれくらい期待していましたか。', '叶わなかったとわかったのは、いつでしたか。'],
                 en:['What were you hoping for, and how much?', 'When did you realize it wasn’t going to happen?'] },
  hazukashii:  { ja:['消えてしまいたくなったのは、どんな場面でしたか。', '誰の前で、そう感じましたか。'],
                 en:['What scene made you want to disappear?', 'Who were you in front of when you felt it?'] },
  ushirometai: { ja:['誰に対して、うしろめたさを感じていますか。', '本当は、どうしたかったですか。'],
                 en:['Who is this guilty feeling about?', 'What did you really wish you’d done instead?'] },
  aseri:       { ja:['何に、追い立てられている気がしますか。', '誰と比べて、焦りを感じますか。'],
                 en:['What feels like it’s rushing you?', 'Who are you comparing yourself to?'] },
  kuyashii:    { ja:['何が、あと一歩で届きませんでしたか。', 'その悔しさは、誰に見せたいですか。'],
                 en:['What fell just short of reach?', 'Who do you wish could see how hard you tried?'] },
  shitto:      { ja:['誰の、何を羨んでいますか。', 'その人と自分の、何がいちばん違いますか。'],
                 en:['Who do you envy, and for what?', 'What feels most different between you and them?'] },
  akogare:     { ja:['何に、まっすぐ憧れていますか。', 'その憧れは、いつから胸にありますか。'],
                 en:['What are you drawn to, without reservation?', 'Since when has this admiration lived in you?'] },
  wakuwaku:    { ja:['何を思うと、胸が高鳴りますか。', 'その先に、何が待っていそうですか。'],
                 en:['What makes your heart race just thinking about it?', 'What do you imagine waiting on the other side?'] },
  ando:        { ja:['何が、肩の力を抜かせてくれましたか。', 'その前は、何にずっと緊張していましたか。'],
                 en:['What let your shoulders finally drop?', 'What had you been bracing for, before that?'] },
  kansha:      { ja:['誰の、どんな優しさに気づきましたか。', 'それを、どう伝えたいですか。'],
                 en:['Whose kindness did you notice?', 'How would you like to let them know?'] },
  itooshii:    { ja:['何を、かけがえないと感じていますか。', 'その愛おしさは、どんな瞬間に強くなりますか。'],
                 en:['What feels irreplaceable to you?', 'When does that tenderness feel strongest?'] },
  hokorashii:  { ja:['何を、自分でよくやったと思いますか。', 'その頑張りを、誰に知ってほしいですか。'],
                 en:['What did you do that you’re proud of?', 'Who do you wish knew how hard you worked?'] },
  natsukashii: { ja:['ふっと蘇ったのは、いつの記憶ですか。', 'その頃の自分に、何を伝えたいですか。'],
                 en:['What memory suddenly came back to you?', 'What would you tell yourself from back then?'] },
  ureshii:     { ja:['何があって、心が弾みましたか。', 'その喜びを、誰かと分かち合いたいですか。'],
                 en:['What happened that made your heart lift?', 'Is there someone you’d like to share this joy with?'] },
  ikari:       { ja:['何が、いちばん許せませんでしたか。', 'その怒りの下に、どんな気持ちがありますか。'],
                 en:['What felt most unforgivable?', 'What feeling might be sitting underneath that anger?'] },
  kanashii:    { ja:['何を、失ったと感じていますか。', '涙がこぼれそうになるのは、どんなときですか。'],
                 en:['What do you feel you’ve lost?', 'When do the tears feel closest to the surface?'] },
  fuan:        { ja:['この先の、何がいちばん気がかりですか。', 'その不安は、何が起きたら少し軽くなりますか。'],
                 en:['What about what’s ahead worries you most?', 'What would need to happen for that worry to ease, even a little?'] },
  keno:        { ja:['何に対して、「無理」だと感じましたか。', 'その感覚は、体のどこに残っていますか。'],
                 en:['What made you feel you just couldn’t stand it?', 'Where in your body does that feeling still linger?'] },
  odoroki:     { ja:['何が、いちばん思いがけませんでしたか。', 'その驚きのあと、最初に浮かんだ気持ちは何でしたか。'],
                 en:['What caught you most off guard?', 'What was the first feeling that surfaced right after?'] }
};
const WRITING_PROMPTS_DEFAULT = {
  ja:['いつ、どこで、何がありましたか。', 'そのとき、胸の中では何が起きていましたか。'],
  en:['When and where did this happen?', 'What was happening inside you, in that moment?']
};
// ★2026-07-18追加：番台／感情の棚での選択を経て編纂机に来た場合（deskFlowFlag）だけ、
// 選んだ棚（categorySelect.value）に応じた問いを表示する。直接編纂机へ来た場合は既定の問い。
function renderWritingBoat(){
  const box = document.getElementById('writingBoatList');
  if(!box) return;
  let picked = null;
  if(typeof deskFlowFlag !== 'undefined' && deskFlowFlag){
    const sel = document.getElementById('categorySelect');
    if(sel && sel.value) picked = WRITING_PROMPTS[sel.value] || null;
  }
  const set = picked || WRITING_PROMPTS_DEFAULT;
  const lines = (appLang === 'en') ? set.en : set.ja;
  box.innerHTML = lines.map(line=>`<li>${escapeHtml(line)}</li>`).join('');
}

function goToShelf(shelfId){
  // ★Hotfix1-2追加修正：shelfWasChosenの更新はsetActiveShelf()経由に統一（利用者の明示的な棚選択）。
  // ★GA4修正：個別の感情棚へ実際に移動したときに view_shelf を1回だけ送信。
  // 「異なる棚IDへの移動」または「別ページから個別棚への移動」の場合のみ発火し、
  // 同じ個別棚を表示中に同じ棚を再指定した場合は送らない。
  // 内部で呼ぶ goToPage('shelves') 側は抑止フラグで二重発火させない。棚ID等のパラメータは送らない。
  const movedFromOtherPage = _gaLastTrackedPage !== 'shelves';
  const movedToDifferentShelf = _gaLastTrackedShelfId !== shelfId;
  if(movedFromOtherPage || movedToDifferentShelf){
    trackAnalyticsEvent('view_shelf');
  }
  _gaLastTrackedShelfId = shelfId;
  _gaSuppressNextViewShelf = true;
  try{
    setActiveShelf(shelfId);
    renderShelfTabs();
    renderShelfDisplay();
  }catch(e){
    console.error('goToShelf: render failed', e);
  }
  try{
    setActivePageTab('shelves');
    goToPage('shelves');
  }catch(e){
    console.error('goToShelf: page switch failed', e);
  }
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      const section = document.getElementById('shelves');
      if(section && section.scrollIntoView){
        section.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block: 'start' });
      }
    });
  });
}

let deskFlowFlag = false;
function updateDeskLead(){
  const el = document.getElementById('deskLead');
  if(!el) return;
  if(deskFlowFlag || counterDraftText){
    el.textContent = t('deskLeadFromCounter');
    el.classList.remove('hidden');
  }else{
    el.classList.add('hidden');
  }
}

function goToDeskWithCategory(shelfId){
  // ★Hotfix1-2追加修正2：shelfWasChosen=trueだけでなくactiveCategoryもshelfIdへ揃える。
  // これが揃っていないと、店主との相談から編纂机へ直接進んだ場合に、題名相談が
  // 以前のactiveCategory（別の棚）の候補を出してしまう不整合が起きる。
  setActiveShelf(shelfId);
  const sel = document.getElementById('categorySelect');
  if(sel) sel.value = shelfId;
  deskFlowFlag = true;
  goToPage('desk');
  renderTitleSuggest();
  setTimeout(()=>{
    const ta = document.getElementById('storyInput');
    if(ta) ta.focus();
  }, 400);
}

function renderChartOptions(nodeKey){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  
  const guideWrapper = document.getElementById('nextActionGuideWrapper');
  if(guideWrapper) guideWrapper.classList.add('hidden');

  if(nodeKey === 'root'){
    container.innerHTML = '';
    renderTextureStep();
    return;
  }
  const node = CHAT_TREE[nodeKey];
  container.innerHTML = '';
  if(!node) return;
  if(node.options){
    node.options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.className = 'chart-btn';
      btn.textContent = opt.label;
      btn.onclick = ()=>handleChartChoice(opt.label, opt.next);
      container.appendChild(btn);
    });
  } else if(node.shelf){
    const goBtn = document.createElement('button');
    goBtn.className = 'chart-btn primary';
    goBtn.textContent = t('goToShelfBtn').replace('{shelf}', shelfLabelOf(node.shelf));
    goBtn.onclick = ()=>goToShelf(node.shelf);
    const writeBtn = document.createElement('button');
    writeBtn.className = 'chart-btn';
    writeBtn.textContent = t('writeAtDeskBtn');
    writeBtn.onclick = ()=>goToDeskWithCategory(node.shelf);
    const moreBtn = document.createElement('button');
    moreBtn.className = 'chart-btn';
    moreBtn.textContent = t('chooseAgainBtn');
    moreBtn.onclick = ()=>{
      appendBubble('shopkeeper', '……今はどんな気分に近いですか。');
      renderChartOptions('root');
  renderTitleSuggest();
    };
    container.appendChild(goBtn);
    container.appendChild(writeBtn);
    container.appendChild(moreBtn);
  }
}

function renderSuggestionActions(shelfId){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';
  const label = shelfLabelOf(shelfId);

  const goBtn = document.createElement('button');
  goBtn.className = 'chart-btn primary';
  goBtn.textContent = t('goToShelfBtn').replace('{shelf}', label);
  goBtn.onclick = ()=>goToShelf(shelfId);

  const writeBtn = document.createElement('button');
  writeBtn.className = 'chart-btn';
  writeBtn.textContent = t('writeAtDeskBtn');
  writeBtn.onclick = ()=>goToDeskWithCategory(shelfId);

  const moreBtn = document.createElement('button');
  moreBtn.className = 'chart-btn';
  moreBtn.textContent = t('chooseFromOptionsBtn');
  moreBtn.onclick = ()=>renderChartOptions('root');

  container.appendChild(goBtn);
  container.appendChild(writeBtn);
  container.appendChild(moreBtn);
}

async function handleChartChoice(label, nextKey){
  const container = document.getElementById('chartOptions');
  if(container) container.innerHTML = '';
  appendBubble('user', label);
  const kf = document.getElementById('keeperFigure');
  if(kf) kf.classList.add('listening');

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bubble loading';
  loadingBubble.textContent = pickByStyle(LOADING_LINES, LOADING_LINES_TSUNDERE);
  const cw = document.getElementById('chatWindow');
  if(cw){
    cw.appendChild(loadingBubble);
    scrollPageToLatestBubble(loadingBubble);
  }

  await wait(prefs.motion ? (500 + Math.random()*400) : 40);
  loadingBubble.remove();
  const node = CHAT_TREE[nextKey];
  if(!node){
    renderChartOptions('root');
  renderTitleSuggest();
    return;
  }
  if(node.options){
    appendBubble('shopkeeper', '……もう少し、近いものを選んでみてください。');
    renderChartOptions(nextKey);
    return;
  }
  const replyText = pickReply(node.reply);
  appendBubble('shopkeeper', replyText);
  setMood(replyText);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 3000);
  renderChartOptions(nextKey);
}

function pickReply(reply){
  if(Array.isArray(reply)) return reply[Math.floor(Math.random()*reply.length)];
  return reply;
}

const chatHistory = [];

// ★1文字あたりの表示間隔（30〜40ms の範囲で調整可能。既定は34ms）
const TYPE_SPEED_MS = 30;

// ★v1.3 Phase C-1：タイピングアニメーションを廃止し、即時表示へ（監査書5章-2）。
// 関数のシグネチャ（引数・onDone呼出）は維持。呼出側2箇所（appendBubble内／初回挨拶）は無変更。
// 短いフェードはCSS側（.bubble等のアニメーション。body:not(.no-motion)スコープ）で表現する。
// TYPE_SPEED_MS定数は未参照になるが、他所からの参照可能性を残すため削除しない。
function typeIntoNode(node, text, speed, onDone){
  node.textContent = text;
  if(onDone) onDone();
}

// ★修正：最新の吹き出し（店主の回答／自分の発言）が画面のどちら側に
// あってもスッと見える位置までページをスクロールする（番台でのやりとり確認のストレス軽減）
function scrollPageToLatestBubble(bubbleEl){
  const cw = document.getElementById('chatWindow');
  const target = bubbleEl || cw;
  if(!target) return;
  requestAnimationFrame(()=>{
    // block:'end' で、対象の下端が画面下端に来るように必要な分だけ上下どちらにもスクロールする
    target.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block: 'end', inline: 'nearest' });
  });
}

function appendBubble(role, text){
  const cw = document.getElementById('chatWindow');
  if(!cw) return null;
  const safeText = (text === undefined || text === null || text === '') ? '……（ここでは言葉が見つかりませんでした。よければ、もう少しだけ違う言い方で聞かせてください。）' : text;
  const div = document.createElement('div');
  div.className = 'bubble ' + (role === 'user' ? 'you' : 'shopkeeper');
  if(role !== 'user'){
    if(currentTone === 'heavy') div.classList.add('tone-heavy');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = t('keeperNameLabel');
    div.appendChild(name);
    const body = document.createElement('span');
    div.appendChild(body);
    cw.appendChild(div);
    // ★修正：吹き出しがまだ空のうちに一度だけ軽く位置合わせをしてから文字を綴り始め、
    // 綴り終わったタイミングでもう一度、優しく最終位置へ合わせ直す。
    // （文字が増えて箱の高さが変わっている最中にスクロールを続けると「瞬間移動」に見えてしまうため）
    scrollPageToLatestBubble(div);
    typeIntoNode(body, safeText, undefined, ()=>scrollPageToLatestBubble(div));
    return div;
  }
  div.textContent = safeText;
  cw.appendChild(div);
  scrollPageToLatestBubble(div);
  return div;
}

function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

let freeTextTurns = 0;

async function sendToShopkeeper(){
  const ui = document.getElementById('userInput');
  const sb = document.getElementById('sendBtn');
  const kf = document.getElementById('keeperFigure');
  const cw = document.getElementById('chatWindow');
  if(!ui) return;
  const text = ui.value.trim();
  if(!text) return;
  if(text.length > 800){
    appendBubble('shopkeeper', '（ゆっくりで大丈夫です。長いお話は、少しずつに分けてお聞かせください。）');
    return;
  }
  appendBubble('user', text);
  counterDraftText = counterDraftText ? (counterDraftText + '\n' + text) : text;
  chatHistory.push({ role:'user', content:text });
  ui.value = '';
  if(sb) sb.disabled = true;
  if(kf) kf.classList.add('listening');
  // ★Step3：setMood(text)による本文連動の背景演出は停止（setMood自体も固定化済み）

  const guideWrapper = document.getElementById('nextActionGuideWrapper');
  if(guideWrapper) guideWrapper.classList.add('hidden');
  const earlyHint = document.getElementById('earlyFreeformHint');
  if(earlyHint) earlyHint.classList.add('hidden');

  // ★修正：appendBubble('user', text) 側で既にスッとスクロールしているため、
  // ここで即座に scrollTop を動かすと「瞬間移動」の原因になる。二重の即時スクロールは行わない。
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bubble loading';
  loadingBubble.textContent = '……';
  if(cw){
    cw.appendChild(loadingBubble);
    scrollPageToLatestBubble(loadingBubble);
  }

  await wait(prefs.motion ? (700 + Math.random()*600) : 60);
  // ★Step3：本文語句（HEAVY_WORDS）によるトーン判定を停止。常に中立の固定値。
  currentTone = 'neutral';

  // ★Step3：入力内容は一切参照せず、会話回数だけで固定の応答を返す。
  // 感情棚の推測（detectShelfFromText）、キーワード一致・質問判定・ランダム応答
  // （matchShopkeeperReply内の各処理）、人物像推測、外部AIリンク案内はすべて停止。
  // ★v1.3最終統合修正：1回目と2回目が同文になっていた不具合を修正。会話回数（1/2/3回目以降）
  // だけで3段階のMESSAGESキー（counterFreeReply1〜3）を使い分ける。本文は解析しない。
  const turnNumber = freeTextTurns + 1;
  const reply = (turnNumber >= 3)
    ? t('counterFreeReply3')
    : (turnNumber === 2 ? t('counterFreeReply2') : t('counterFreeReply1'));
  loadingBubble.remove();
  appendBubble('shopkeeper', reply);
  chatHistory.push({ role:'assistant', content:reply });

  freeTextTurns++;
  // ★Step3修正：見立てメーター（「輪郭が見えてきました」等）は、店主が内面を読み取っている
  // ように見えるため、自由入力中は表示しない（updateMitateMeterの呼び出しを停止し、常にhiddenのまま）。
  // 本文内容に応じた代替演出は追加しない。関数・HTML・文言データは未使用のまま残置。
  // 3回目の自由入力で会話を区切り、中立の次行動ボタンへ誘導する
  const isLoopEnd = freeTextTurns >= 3;

  if(isLoopEnd){
    await wait(prefs.motion ? 500 : 20);
    // ★Step3：感情棚名による「要約」と店主の「見立て」演出（renderMitateOffer）は停止。
    // ★Step3修正：中立の固定3択ボタンを直接表示する（特定の感情棚は渡さない・提示しない）。
    renderLoopEndActions();
    lockFreeInput(true);
  }else{
    renderChartOptions('root');
    renderTitleSuggest();
  }

  if(sb) sb.disabled = isLoopEnd ? true : false;
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 3500);
}

// ★追加：占いが持つ「本音の言語化・自己肯定・背中押し」という価値を、
// 書店の世界観（＝店主の"見立て"）のまま提供する機能。
// 会話が一区切りついたタイミングで、ユーザーが望んだときにだけ差し出す一言。
function pickHonneMitate(shelfId){
  const pool = (typeof HONNE_MITATE !== 'undefined' && HONNE_MITATE[shelfId] && HONNE_MITATE[shelfId].length)
    ? HONNE_MITATE[shelfId]
    : (typeof HONNE_MITATE_GENERIC !== 'undefined' ? HONNE_MITATE_GENERIC : []);
  if(!pool.length) return '';
  return pool[Math.floor(Math.random()*pool.length)];
}

function renderMitateOffer(shelfId){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';

  const offerLine = '……少しだけ、あなたの言葉から見えたものを、お伝えしてもいいですか？（当たっていなければ、聞き流してくださいね）';
  appendBubble('shopkeeper', offerLine);
  chatHistory.push({ role:'assistant', content:offerLine });

  const yesBtn = document.createElement('button');
  yesBtn.type = 'button';
  yesBtn.className = 'chart-btn primary';
  yesBtn.textContent = t('mitateYesBtn');
  yesBtn.onclick = async ()=>{
    container.innerHTML = '';
    const line = pickHonneMitate(shelfId);
    if(line){
      appendBubble('shopkeeper', line);
      chatHistory.push({ role:'assistant', content:line });
    }
    await wait(prefs.motion ? 700 : 30);
    renderLoopEndActions(shelfId);
  };

  const noBtn = document.createElement('button');
  noBtn.type = 'button';
  noBtn.className = 'chart-btn ghost';
  noBtn.textContent = t('mitateNoBtn');
  noBtn.onclick = ()=>{
    renderLoopEndActions(shelfId);
  };

  container.appendChild(yesBtn);
  container.appendChild(noBtn);
}

// ★Step3修正：3回目のやりとりで表示する、次のアクションへの中立の固定3択ボタン。
// 特定の感情棚は提示しない（shelfLabelOf・goToShelf・goToDeskWithCategoryは使用せず、
// ボタン文面に感情棚名を含めない。activeCategoryも更新しない）。
// 引数shelfIdは互換のため残すが、参照しない。
function renderLoopEndActions(shelfId){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';

  // 1.「感情の棚を眺める」：棚の入口ページへ移動するだけで、特定の棚は選択しない
  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.className = 'chart-btn primary';
  goBtn.textContent = t('loopBrowseShelvesBtn');
  goBtn.onclick = ()=>goToPage('shelves');

  // 2.「机で一冊にする」：話した内容は既存のsyncCounterDraftToDesk()（goToPage('desk')内で実行）で
  // 原稿へ引き継ぐ。categorySelectの値は変更せず、特定棚の自動選択も行わない。
  const writeBtn = document.createElement('button');
  writeBtn.type = 'button';
  writeBtn.className = 'chart-btn';
  writeBtn.textContent = t('loopWriteBookBtn');
  writeBtn.onclick = ()=>{ deskFlowFlag = true; goToPage('desk'); };

  // 3.「最初から話し直す」：既存のrestartCounterChat()を維持
  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'chart-btn ghost';
  restartBtn.textContent = t('restartChatBtn');
  restartBtn.onclick = ()=>restartCounterChat();

  container.appendChild(goBtn);
  container.appendChild(writeBtn);
  container.appendChild(restartBtn);
}

// ★追加：自由入力欄（テキストエリア・送信ボタン）の表示/非表示を切り替える
function lockFreeInput(locked){
  const row = document.querySelector('.chat-input-row');
  const ui = document.getElementById('userInput');
  const sb = document.getElementById('sendBtn');
  const earlyHint = document.getElementById('earlyFreeformHint');
  if(row) row.classList.toggle('hidden', locked);
  if(ui) ui.disabled = locked;
  if(sb) sb.disabled = locked;
  if(earlyHint) earlyHint.classList.toggle('hidden', locked);
}

// ★追加：Akinatorのテーマ選択・確信度演出を参考に、対話が進むほど
// 「店主が少しずつ見えてきている」ことをそっと示す気配メーター。
// 断定はせず、あくまで寄り添いのニュアンスに留める。
const MITATE_METER_LABELS = [
  '……お話を、伺っています',
  '……少しずつ、輪郭が見えてきました',
  '……もう少しで、お伝えできそうです'
];
function updateMitateMeter(turns){
  const meter = document.getElementById('mitateMeter');
  const fill = document.getElementById('mitateMeterFill');
  const label = document.getElementById('mitateMeterLabel');
  if(!meter || !fill || !label) return;
  if(turns <= 0){
    meter.classList.add('hidden');
    fill.style.width = '0%';
    return;
  }
  meter.classList.remove('hidden');
  const clamped = Math.min(turns, 3);
  fill.style.width = Math.round((clamped / 3) * 100) + '%';
  label.textContent = MITATE_METER_LABELS[clamped - 1] || '';
}

// ★追加：「最初から話し直す」— ターン数をリセットし、自由入力を再開する
function restartCounterChat(){
  freeTextTurns = 0;
  updateMitateMeter(0);
  lockFreeInput(false);
  renderChartOptions('root');
  renderTitleSuggest();
  appendBubble('shopkeeper', '……はい、あらためてお聞かせください。今はどんな気分に近いですか。');
  buzz(6);
  const ui = document.getElementById('userInput');
  if(ui) setTimeout(()=>ui.focus(), prefs.motion ? 400 : 0);
}

const sendBtn = document.getElementById('sendBtn');
if(sendBtn) sendBtn.onclick = sendToShopkeeper;

const userInput = document.getElementById('userInput');
if(userInput){
  userInput.addEventListener('keydown', (e)=>{
    // ★修正：日本語入力（IME）で変換確定のためにEnterを押した際、
    // そのまま送信されてしまう誤送信を防止する
    if(e.isComposing || e.keyCode === 229) return;
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      sendToShopkeeper();
    }
  });
}

// ★v1.3公開前最終修正：番台の公開UI（棚の案内）。既存の会話ベースUI
// （chooseTexture/renderEmotionChips/chooseEmotionShelf/handleChartChoice等）は
// 削除せずそのまま残すが、公開画面からは呼び出さない（hiddenのDOMを対象にするだけ）。
// このUIは本文の解析・固定3段階返信・タイピング演出を一切使わない、静的な選択導線。
function counterShelfGroupBackBtn(onClick){
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'chart-btn ghost counter-shelf-back';
  back.textContent = t('counterBackBtn');
  back.onclick = onClick;
  return back;
}

function renderCounterShelfGuideRoot(){
  const box = document.getElementById('counterShelfGroups');
  if(!box) return;
  // ★微調整：既に棚を選んだ履歴がある利用者にだけ、番台へ戻った際の補足を表示する。
  // 棚選択ロジック・保存データには一切手を加えず、libraryCacheの参照のみで判定する。
  const returnNote = document.getElementById('counterReturnNote');
  if(returnNote){
    const hasChosenShelfBefore = Array.isArray(libraryCache) && libraryCache.some(
      e => e && e.category && e.category !== UNFILED_CATEGORY_ID
    );
    returnNote.textContent = t('counterReturnNote');
    returnNote.classList.toggle('hidden', !hasChosenShelfBefore);
  }
  box.innerHTML = '';
  const groupKeys = { sink:'counterGroupSink', wave:'counterGroupWave', light:'counterGroupLight', sepia:'counterGroupSepia', other:'counterGroupOtherFeeling' };
  TEXTURE_GROUPS.forEach(group=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chart-btn';
    btn.textContent = t(groupKeys[group.id] || group.id);
    btn.onclick = ()=>renderCounterShelfGuideGroup(group);
    box.appendChild(btn);
  });
  const otherBtn = document.createElement('button');
  otherBtn.type = 'button';
  otherBtn.className = 'chart-btn ghost';
  otherBtn.textContent = t('counterGroupOther');
  otherBtn.onclick = ()=>renderCounterShelfGuideAll();
  box.appendChild(otherBtn);
}

function counterShelfPillList(shelfIds){
  const list = document.createElement('div');
  list.className = 'counter-shelf-group-list';
  shelfIds.filter(id=>CATEGORIES.some(c=>c.id === id)).forEach(id=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'counter-shelf-pill';
    btn.textContent = shelfLabelOf(id);
    btn.onclick = ()=>renderCounterShelfGuideConfirm(id);
    list.appendChild(btn);
  });
  return list;
}

function renderCounterShelfGuideGroup(group){
  const box = document.getElementById('counterShelfGroups');
  if(!box) return;
  box.innerHTML = '';
  box.appendChild(counterShelfPillList(group.shelves));
  box.appendChild(counterShelfGroupBackBtn(renderCounterShelfGuideRoot));
}

// 「それ以外」：21棚を4群（重く沈む/波立つ/光が灯る/遠いものを見つめる）に分けて一覧表示する。
// 一覧から選んだ棚を直接開ける（受入条件・仕様書3章）。
function renderCounterShelfGuideAll(){
  const box = document.getElementById('counterShelfGroups');
  if(!box) return;
  box.innerHTML = '';
  box.className = 'counter-shelf-groups counter-shelf-guide-all';
  const groupKeys = { sink:'counterGroupSink', wave:'counterGroupWave', light:'counterGroupLight', sepia:'counterGroupSepia', other:'counterGroupOtherFeeling' };
  TEXTURE_GROUPS.forEach(group=>{
    const wrap = document.createElement('div');
    wrap.className = 'counter-shelf-group';
    const heading = document.createElement('p');
    heading.className = 'counter-shelf-group-heading';
    heading.textContent = t(groupKeys[group.id] || group.id);
    wrap.appendChild(heading);
    wrap.appendChild(counterShelfPillList(group.shelves));
    box.appendChild(wrap);
  });
  box.appendChild(counterShelfGroupBackBtn(renderCounterShelfGuideRoot));
  box.className = 'counter-shelf-groups';
}

// 棚選択時：自由会話の固定返信を挟まず、短文1つ＋「棚を見る」ボタン1つに統一する
// （「そのまま開く」か「ボタンを一度表示」のどちらか一つに統一、という仕様書3章の指示に対し、
// ここではボタン表示を採用。本文解析・感情の推測・同一文の連続表示は行わない）。
function renderCounterShelfGuideConfirm(shelfId){
  const box = document.getElementById('counterShelfGroups');
  if(!box) return;
  box.innerHTML = '';
  const note = document.createElement('p');
  note.className = 'counter-shelf-confirm-note';
  note.textContent = t('counterShelfGuideNote').replace('{shelf}', shelfLabelOf(shelfId));
  box.appendChild(note);
  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'chart-btn primary';
  viewBtn.textContent = t('counterViewShelfBtn');
  viewBtn.onclick = ()=>goToShelf(shelfId);
  box.appendChild(viewBtn);
  box.appendChild(counterShelfGroupBackBtn(renderCounterShelfGuideRoot));
}

function initCounterShelfGuide(){
  renderCounterShelfGuideRoot();
  const writeBtn = document.getElementById('counterWriteWithoutChoosing');
  if(writeBtn) writeBtn.onclick = ()=>goToPage('desk');
}

function renderTextureStep(){
  const box = document.getElementById('textureStep');
  if(!box) return;
  // ★追加：選び直すときに再度表示させる
  box.style.display = '';
  box.style.opacity = '1';
  box.innerHTML = '';
  TEXTURE_GROUPS.forEach((group, i)=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'texture-btn';
    btn.textContent = group.label;
    btn.style.animationDelay = (i * 70) + 'ms';
    btn.onclick = ()=>chooseTexture(group, btn);
    box.appendChild(btn);
  });
}

async function chooseTexture(group, btnEl){
  const box = document.getElementById('textureStep');
  if(box){
    box.querySelectorAll('.texture-btn').forEach(b=>{
      b.classList.toggle('selected', b === btnEl);
      b.classList.toggle('dimmed', b !== btnEl);
    });
  }
  currentTone = group.tone;
  buzz(6);
  appendBubble('user', group.label);
  const kf = document.getElementById('keeperFigure');
  if(kf) kf.classList.add('listening');

  // ★ 追加：選ばれたら大きな4つのボタンをスッと消して画面を詰める
  if (box) {
    if (prefs.motion) {
       box.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
       box.style.opacity = '0';
       box.style.transform = 'translateY(-10px)';
       setTimeout(() => { box.style.display = 'none'; box.style.transform = 'none'; }, 400);
    } else {
       box.style.display = 'none';
    }
  }

  await wait(prefs.motion ? 420 : 30);
  appendBubble('shopkeeper', group.keeper);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 2500);
  renderEmotionChips(group);

  const guideWrapper = document.getElementById('nextActionGuideWrapper');
  if(guideWrapper) {
    setTimeout(() => { guideWrapper.classList.remove('hidden'); }, prefs.motion ? 400 : 0);
  }
  // ちゃんとしたガイドに切り替わるので、最初だけの控えめな一文は隠す
  const earlyHint = document.getElementById('earlyFreeformHint');
  if(earlyHint) earlyHint.classList.add('hidden');
}

function renderEmotionChips(group){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';
  const shelves = group.shelves.filter(id=>CATEGORIES.some(c=>c.id === id));
  shelves.forEach((id, i)=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chart-btn shelf-chip fade-in';
    btn.style.animationDelay = (i * 90) + 'ms';
    btn.textContent = shelfLabelOf(id);
    btn.onclick = ()=>chooseEmotionShelf(id);
    container.appendChild(btn);
  });
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'chart-btn ghost fade-in';
  back.style.animationDelay = (shelves.length * 90) + 'ms';
  back.textContent = t('backToTextureBtn');
  back.onclick = ()=>{
    appendBubble('shopkeeper', '……今は、どんな手ざわりに近いですか。');
    renderChartOptions('root');
  renderTitleSuggest();
  };
  container.appendChild(back);
}

async function chooseEmotionShelf(shelfId){
  currentTone = NEGATIVE_SHELVES.includes(shelfId) ? 'heavy' : 'neutral';
  buzz(6);
  appendBubble('user', shelfLabelOf(shelfId));
  const kf = document.getElementById('keeperFigure');
  if(kf) kf.classList.add('listening');
  await wait(prefs.motion ? 380 : 30);
  appendBubble('shopkeeper', `『${shelfLabelOf(shelfId)}』の棚ですね。文字を打たなくても大丈夫。そのまま棚を眺めても、一冊綴っていっても構いませんよ。`);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 2500);
  renderSuggestionActions(shelfId);
  
  const guideWrapper = document.getElementById('nextActionGuideWrapper');
  if(guideWrapper) guideWrapper.classList.add('hidden');
}

function syncCounterDraftToDesk(){
  if(!counterDraftText) return;
  const ta = document.getElementById('storyInput');
  if(!ta) return;
  if(ta.value.includes(counterDraftText)) return;
  ta.value = ta.value.trim()
    ? (ta.value.replace(/\s+$/, '') + '\n' + counterDraftText)
    : counterDraftText;
  ta.dispatchEvent(new Event('input'));
  const msg = document.getElementById('deskMsg');
  if(msg) msg.textContent = t('syncedToDeskMsg');
}

(function(){
  const input = document.getElementById('userInput');
  if(!input) return;
  input.addEventListener('focus', ()=>document.body.classList.add('focus-dim'));
  input.addEventListener('blur', ()=>document.body.classList.remove('focus-dim'));
})();

let attachedPhoto = '';

// ★v1.3 RC2：EXIFの向きを尊重して正しくデコードするため、createImageBitmap(imageOrientation:'from-image')
// を優先して使う。未対応・失敗時は既存のImage()方式へフォールバックする（互換性維持）。
function loadImageFromFile(file){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

const HEIC_MIME_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
function looksLikeHeicFile(file){
  const type = (file && file.type || '').toLowerCase();
  if(HEIC_MIME_TYPES.includes(type)) return true;
  const name = (file && file.name || '').toLowerCase();
  return /\.(heic|heif)$/.test(name);
}

// decoded.drawable は canvas.drawImage() にそのまま渡せる描画元（ImageBitmapまたはHTMLImageElement）。
async function decodeImageFile(file){
  if(typeof createImageBitmap === 'function'){
    try{
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { drawable: bitmap, width: bitmap.width, height: bitmap.height, isBitmap: true };
    }catch(e){
      // createImageBitmapでの直接デコードに失敗した場合は、下の<img>方式へフォールバックする。
      // （HEIC等、両方式とも失敗した場合の形式判定は呼び出し側のcompressImageFileで行う）
    }
  }
  const img = await loadImageFromFile(file);
  return { drawable: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, isBitmap: false };
}

// ★v1.3 RC2：処理結果をエラー種別つきで返すよう拡張。
// 戻り値・呼び出し側の契約（attachedPhotoへdataURLを代入する等）・保存キー・entryスキーマは変更しない。
// エラー時は e.code に 'unsupported-format' | 'load-failed' | 'process-failed' のいずれかを設定して throw する。
async function compressImageFile(file){
  const MAX_EDGE = 800;
  let decoded;
  try{
    decoded = await decodeImageFile(file);
  }catch(e){
    const err = new Error(looksLikeHeicFile(file) ? 'unsupported-format' : 'load-failed');
    err.code = looksLikeHeicFile(file) ? 'unsupported-format' : 'load-failed';
    throw err;
  }
  const iw = decoded.width, ih = decoded.height;
  if(!iw || !ih){
    if(decoded.isBitmap && typeof decoded.drawable.close === 'function') decoded.drawable.close();
    const err = new Error('load-failed');
    err.code = 'load-failed';
    throw err;
  }
  try{
    const scale = Math.min(1, MAX_EDGE / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(decoded.drawable, 0, 0, w, h);
    if(decoded.isBitmap && typeof decoded.drawable.close === 'function') decoded.drawable.close();
    let dataUrl = c.toDataURL('image/webp', 0.7);
    if(!dataUrl || !dataUrl.startsWith('data:image/webp')){
      dataUrl = c.toDataURL('image/jpeg', 0.7);
    }
    if(!dataUrl || dataUrl === 'data:,'){
      const err = new Error('process-failed');
      err.code = 'process-failed';
      throw err;
    }
    return dataUrl;
  }catch(e){
    if(e && e.code) throw e;
    const err = new Error('process-failed');
    err.code = 'process-failed';
    throw err;
  }
}

function clearAttachedPhoto(){
  attachedPhoto = '';
  const input = document.getElementById('photoInput');
  const prev = document.getElementById('photoPreview');
  if(input) input.value = '';
  if(prev){ prev.classList.add('hidden'); prev.classList.remove('pop'); }
}

(function(){
  const photoInputEl = document.getElementById('photoInput');
  if(!photoInputEl) return;
  // ★v1.3 RC2b 項目5：写真選択が開かない不具合の修正。
  // #photoInputはdisplay:none/hidden属性をやめ「視覚的にのみ隠す」方式にしたため、
  // ユーザーのクリックイベントハンドラ内で同期的にvalue=''＋click()を呼べば、
  // 一部のスマートフォン・iOS・アプリ内ブラウザでも確実にダイアログが開く。
  // setTimeoutやPromise後、ページめくり後の遅延呼び出しは行わない（同期呼び出しが前提）。
  // ボタンは<button type="button">のためキーボード（Enter/Space）でも同じclickイベントが発火する。
  const chooseBtn = document.getElementById('photoChooseBtn');
  if(chooseBtn){
    chooseBtn.addEventListener('click', ()=>{
      photoInputEl.value = '';
      photoInputEl.click();
    });
  }
  photoInputEl.addEventListener('change', async ()=>{
    const file = photoInputEl.files && photoInputEl.files[0];
    if(!file) return;
    const msg = document.getElementById('deskMsg');
    // ★v1.3 RC2：処理中であることを利用者に伝える（保存・GA4・外部通信は追加しない、表示文言のみ）。
    if(msg) msg.textContent = t('photoProcessing');
    try{
      attachedPhoto = await compressImageFile(file);
      const prev = document.getElementById('photoPreview');
      const imgEl = document.getElementById('photoPreviewImg');
      if(imgEl) imgEl.src = attachedPhoto;
      if(prev){
        prev.classList.remove('hidden');
        void prev.offsetWidth;
        prev.classList.add('pop');
      }
      if(msg) msg.textContent = '';
      buzz(8);
    }catch(e){
      attachedPhoto = '';
      let key = 'photoLoadFail';
      if(e && e.code === 'unsupported-format') key = 'photoUnsupportedFormat';
      else if(e && e.code === 'process-failed') key = 'photoProcessFail';
      if(msg) msg.textContent = t(key);
      photoInputEl.value = '';
    }
  });
  const removeBtn = document.getElementById('photoRemove');
  if(removeBtn) removeBtn.onclick = ()=>{ clearAttachedPhoto(); };
})();

function shelfTier(count){
  if(count >= 100) return 4;
  if(count >= 50) return 3;
  if(count >= 30) return 2;
  if(count >= 10) return 1;
  return 0;
}

// ★決裁済み変更仕様v1.2 4-2：棚の成長装飾は絵文字ではなくCSS（.wood-shelf.tier1〜4 配下の #shelfOrnaments）の
// 灯りの濃淡・木口表現で行う。textContentは空のまま、tierクラスと#shelfOrnaments.titleでのみ状態を伝える。
const SHELF_TIER_ORNAMENTS = ['', '', '', '', ''];
const SHELF_TIER_NAMES = ['', '10冊：蜜蝋の燭台が置かれました', '30冊：小さな鉢植えが増えました', '50冊：守り提灯が灯りました', '100冊：書店猫が住みつきました'];
const SHELF_TIER_NAMES_EN = ['', '10 books: a beeswax candle was placed here', '30 books: a small potted plant has grown', '50 books: a guardian lantern was lit', '100 books: a bookstore cat has moved in'];

function applyShelfTier(){
  const wood = document.querySelector('.wood-shelf');
  if(!wood) return;
  const tier = shelfTier(libraryCache.length);
  ['tier1','tier2','tier3','tier4'].forEach(c=>wood.classList.remove(c));
  if(tier > 0) wood.classList.add('tier' + tier);
  let orn = document.getElementById('shelfOrnaments');
  if(!orn){
    orn = document.createElement('div');
    orn.id = 'shelfOrnaments';
    orn.className = 'shelf-ornaments';
    orn.setAttribute('aria-hidden', 'true');
    wood.insertBefore(orn, wood.firstChild);
  }
  orn.textContent = SHELF_TIER_ORNAMENTS[tier];
  orn.title = (appLang === 'en') ? SHELF_TIER_NAMES_EN[tier] : SHELF_TIER_NAMES[tier];
}

function appendEmptySpine(shelf){
  if(!shelf) return;
  const ghost = document.createElement('div');
  ghost.className = 'spine empty-spine';
  ghost.textContent = t('ghostNextBook');
  // ★2026-07-18変更：空の背表紙のツールチップをMESSAGESへ移し、英語対応させた。
  ghost.title = t('emptySpineTooltip');
  ghost.onclick = ()=>{ buzz(6); goToPage('desk'); };
  shelf.appendChild(ghost);
}

function playSuckAnimation(catId){
  if(!prefs.motion) return;
  const wood = document.querySelector('.wood-shelf');
  if(!wood) return;
  const rect = wood.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'fly-book';
  fly.style.background = spineColorFor(catId);
  document.body.appendChild(fly);
  const tx = rect.left + rect.width / 2 - window.innerWidth / 2;
  const ty = rect.top + rect.height / 2 - window.innerHeight / 2;
  fly.style.setProperty('--suck-x', tx + 'px');
  fly.style.setProperty('--suck-y', ty + 'px');
  requestAnimationFrame(()=>fly.classList.add('go'));
  setTimeout(()=>fly.remove(), 950);
}

const RECORD_PICKS = {
  morning:{ label:'今朝のレコード', line:'開店前の掃除のとき、店主がよくかけている一枚。', songs:[
    { title:'風をあつめて', artist:'はっぴいえんど' },
    { title:'やさしさに包まれたなら', artist:'荒井由実' },
    { title:'虹', artist:'菅田将暉' },
    { title:'Presence', artist:'Awesome City Club' },
    { title:'朝が来る前に', artist:'never young beach' },
    { title:'アイネクライネ', artist:'米津玄師' },
    { title:'たしかなこと', artist:'小田和正' }
  ]},
  daytime:{ label:'昼下がりのレコード', line:'頁をめくる音に混ざっても、邪魔をしない一枚。', songs:[
    { title:'日曜日よりの使者', artist:'ザ・ハイロウズ' },
    { title:'小さな恋のうた', artist:'MONGOL800' },
    { title:'ありがとう', artist:'いきものがかり' },
    { title:'サボテンの花', artist:'チューリップ' },
    { title:'ライオン', artist:'加藤登紀子' },
    { title:'ハナミズキ', artist:'一青窈' },
    { title:'虹を待つ人', artist:'絢香' }
  ]},
  evening:{ label:'夕暮れのレコード', line:'棚の影が伸びる時間に、店主が針を落とす一枚。', songs:[
    { title:'茜色の約束', artist:'いきものがかり' },
    { title:'花火', artist:'aiko' },
    { title:'ワタリドリ', artist:'[Alexandros]' },
    { title:'アポロ', artist:'ポルノグラフィティ' },
    { title:'とんぼ', artist:'長渕剛' },
    { title:'糸', artist:'中島みゆき' },
    { title:'夕焼け', artist:'サザンオールスターズ' }
  ]},
  night:{ label:'今夜のレコード', line:'閉店後の書店で、ランプの灯りとよく合う一枚。', songs:[
    { title:'First Love', artist:'宇多田ヒカル' },
    { title:'くだらないの中に', artist:'星野源' },
    { title:'夜空ノムコウ', artist:'SMAP' },
    { title:'アルデバラン', artist:'菅田将暉' },
    { title:'白日', artist:'King Gnu' },
    { title:'Lemon', artist:'米津玄師' },
    { title:'夜に駆ける', artist:'YOASOBI' }
  ]}
};

function currentRecordSlot(){
  const h = new Date().getHours();
  if(h >= 5 && h < 11) return 'morning';
  if(h >= 11 && h < 17) return 'daytime';
  if(h >= 17 && h < 22) return 'evening';
  return 'night';
}

// ★時間帯（朝/昼/夕/夜）ごとのプールから、日付（Date.now()を86400000で割った日数）を
//   インデックスにして選ぶことで、日をまたぐたびに必ず違う一枚になる仕組み。
//   プールを7曲ずつに増やし、1週間は同じ曲が続かないようにした。
// ★v1.3公開前最終修正：棚選択と本・音楽推薦の連動（仕様書2章）。
// 直近保存entryのcategoryだけを使用し、利用者本文は参照しない。新しいAPIやAI分析は使わない。
// 日付＋entry IDから決定的にインデックスを算出し、再描画のたびに内容が激しく変わらないようにする。
// unfiledの場合は非表示。書名・曲名はGA4へ送らない（trackAnalyticsEvent呼び出しなし）。
function shelfPickSeed(str){
  let seed = 0;
  for(let i = 0; i < str.length; i++){
    seed = (seed * 31 + str.charCodeAt(i)) >>> 0;
  }
  return seed;
}

// ★2026-07-19 G：おすすめの「一期一会」。出会いは製本完了ごと・来店（セッション）ごとに
// 1回だけ決定し、同じ表示中・言語切替・再描画では変えない。直前の候補はsessionStorageへ
// 保持し、同じ候補が連続しにくくする。本棚entryスキーマ・外部通信は変更しない。
function recoEncounterSeed(){
  try{
    let v = sessionStorage.getItem('eb-reco-seed');
    if(!v){ v = String(Math.floor(Math.random()*1e9)); sessionStorage.setItem('eb-reco-seed', v); }
    return parseInt(v, 10) || 0;
  }catch(e){ return 0; }
}
function rotateRecoEncounter(){
  try{ sessionStorage.setItem('eb-reco-seed', String(Math.floor(Math.random()*1e9))); }catch(e){}
}

function pickShelfLinkedRecommendation(entry){
  if(!entry || !entry.category || entry.category === UNFILED_CATEGORY_ID) return null;
  const cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES.find(c=>c.id === entry.category) : null;
  if(!cat) return null;

  // ★2026-07-19 G：日替わりではなく「出会い（セッション／製本）単位」の安定シードを使う。
  // 言語切替で候補IDが変わらないよう、母集団は日英とも英語対応済みサブセット（enReady*）に統一する。
  const baseSeed = shelfPickSeed(String(entry.id || '') + '_' + recoEncounterSeed());

  const wave = (typeof unlockedWaveCount === 'function') ? unlockedWaveCount() : 1;
  const bookPool = enReadyBooks((typeof BOOK_POOL !== 'undefined')
    ? BOOK_POOL.filter(b=>b.tags.includes(cat.id) && b.wave <= wave)
    : []);
  const mq = (typeof MUSIC_QUERIES !== 'undefined' && MUSIC_QUERIES[cat.id]) ? MUSIC_QUERIES[cat.id] : [];
  const pinnedSongs = (typeof PINNED_SONGS !== 'undefined' && PINNED_SONGS[cat.id]) ? PINNED_SONGS[cat.id] : [];
  const songPool = enReadySongs(mq.length ? mq : pinnedSongs);
  // この出会い（シード×棚）での決定は一度だけ行い、sessionStorageへメモ化する。
  // 再描画・言語切替・モーダル開閉ではメモから同じ候補を返す。「直前の候補を避ける」判定は
  // 最初の決定時にのみ適用する（毎回適用すると再描画のたびに候補がずれてしまうため）。
  const memoKey = 'eb-reco-memo-' + baseSeed + '-' + cat.id;
  let memo = null;
  try{ memo = JSON.parse(sessionStorage.getItem(memoKey) || 'null'); }catch(e){}
  let book = null, song = null;
  if(memo){
    book = bookPool.find(b=>b.title === memo.b) || (bookPool.length ? bookPool[0] : null);
    song = songPool.find(sg=>(sg.artist + '|' + sg.title) === memo.s) || (songPool.length ? songPool[0] : null);
  }else{
    let bookIdx = bookPool.length ? (baseSeed % bookPool.length) : 0;
    let songIdx = songPool.length ? ((baseSeed + 7) % songPool.length) : 0;
    try{
      const prevBook = sessionStorage.getItem('eb-reco-prev-book');
      if(bookPool.length > 1 && prevBook && bookPool[bookIdx] && bookPool[bookIdx].title === prevBook){
        bookIdx = (bookIdx + 1) % bookPool.length;
      }
      const prevSong = sessionStorage.getItem('eb-reco-prev-song');
      if(songPool.length > 1 && prevSong && songPool[songIdx] && (songPool[songIdx].artist + '|' + songPool[songIdx].title) === prevSong){
        songIdx = (songIdx + 1) % songPool.length;
      }
    }catch(e){}
    book = bookPool.length ? bookPool[bookIdx] : null;
    song = songPool.length ? songPool[songIdx] : null;
    try{
      sessionStorage.setItem(memoKey, JSON.stringify({ b: book ? book.title : null, s: song ? (song.artist + '|' + song.title) : null }));
      if(book) sessionStorage.setItem('eb-reco-prev-book', book.title);
      if(song) sessionStorage.setItem('eb-reco-prev-song', song.artist + '|' + song.title);
    }catch(e){}
  }

  if(!book && !song) return null;
  return { cat, book, song };
}

// ★v1.3 RC2：本・音楽推薦の装丁カード（仕様書3章）。
// 外部API・外部画像取得は追加しない。既存のspineColorFor/spineGradientFor/textColorForを
// 流用し、棚色を基調にした単色〜二色グラデーションと罫線だけで構成する（公式ジャケットは模倣しない）。
// 同じ作品（同タイトル・同著者/アーティスト）は常に同じ見た目になるよう、shelfPickSeed()による
// 決定的な種から生成する。book.coverUrl / song.artworkUrlが将来手動登録された場合だけ<img>を重ね、
// 読み込み失敗時はonerrorでimgを消して装丁カード（背景グラデーション）へ自然に戻す。
function renderJacketMarkup(kind, cat, item, seedStr){
  const seed = (typeof shelfPickSeed === 'function') ? shelfPickSeed(seedStr) : 0;
  const base = (typeof spineColorFor === 'function') ? spineColorFor(cat.id) : '#8A94B8';
  const bg = (typeof spineGradientFor === 'function') ? spineGradientFor(cat.id, seed) : base;
  const fg = (typeof textColorFor === 'function') ? textColorFor(base) : '#F6ECD4';
  const url = kind === 'book' ? item.coverUrl : item.artworkUrl;
  const tagKey = kind === 'book' ? 'shelfPickJacketBookTag' : 'shelfPickJacketMusicTag';
  const kindClass = kind === 'book' ? 'shelf-pick-jacket-book' : 'shelf-pick-jacket-music';
  const imgHtml = url
    ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.remove()">`
    : '';
  return `<div class="shelf-pick-jacket ${kindClass}" style="background:${bg};color:${fg};" aria-hidden="true">
      ${imgHtml}
      <span class="shelf-pick-jacket-grain"></span>
      ${kind === 'book' ? '<span class="shelf-pick-jacket-spine"></span>' : ''}
      <span class="shelf-pick-jacket-tag">${escapeHtml(t(tagKey))}</span>
    </div>`;
}

function renderShelfPickRecommend(){
  const box = document.getElementById('shelfPickRecommend');
  if(!box) return;
  const latest = libraryCache.length ? libraryCache[libraryCache.length - 1] : null;
  const picked = latest ? pickShelfLinkedRecommendation(latest) : null;
  if(!picked){
    box.innerHTML = '';
    box.classList.add('hidden');
    return;
  }
  const { cat, book, song } = picked;
  const noteText = t('shelfPickNote').replace('{shelf}', categoryLabelFor(cat));

  let bookHtml = '';
  if(book){
    const q = book.title + ' ' + book.by;
    const amazonUrl = amazonSearchUrl(q);
    const rakutenUrl = (typeof rakutenSearchUrl === 'function') ? rakutenSearchUrl(q) : amazonUrl;
    const jacket = renderJacketMarkup('book', cat, book, cat.id + '_' + book.title + '_' + book.by);
    bookHtml = `<div class="shelf-pick-book">
      ${jacket}
      <div class="shelf-pick-book-body">
        <p class="shelf-pick-kicker">${escapeHtml(t('shelfPickBookLabel'))}</p>
        <p class="shelf-pick-title">『${escapeHtml(bookTitleFor(book))}』${escapeHtml(bookAuthorFor(book))}</p>
        ${bookHookFor(book) ? `<p class="shelf-pick-meta">${escapeHtml(bookHookFor(book))}</p>` : ''}
        <a class="shelf-pick-link" href="${amazonUrl}" target="_blank" rel="noopener sponsored">Amazon</a>
        <a class="shelf-pick-link" href="${rakutenUrl}" target="_blank" rel="noopener sponsored">${appLang === 'en' ? 'Rakuten' : '楽天'}</a>
      </div>
    </div>`;
  }

  let musicHtml = '';
  if(song){
    const q2 = song.title + ' ' + song.artist;
    const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q2);
    const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q2);
    const jacket2 = renderJacketMarkup('music', cat, song, cat.id + '_' + song.title + '_' + song.artist);
    musicHtml = `<div class="shelf-pick-music">
      ${jacket2}
      <div class="shelf-pick-music-body">
        <p class="shelf-pick-kicker">${escapeHtml(t('shelfPickMusicLabel'))}</p>
        <p class="shelf-pick-title">『${escapeHtml(songTitleFor(song))}』${escapeHtml(songArtistFor(song))}</p>
        ${songCommentFor(song) ? `<p class="shelf-pick-meta">${escapeHtml(songCommentFor(song))}</p>` : ''}
        <a class="shelf-pick-link" href="${spUrl}" target="_blank" rel="noopener">Spotify</a>
        <a class="shelf-pick-link" href="${ytUrl}" target="_blank" rel="noopener">YouTube</a>
      </div>
    </div>`;
  }

  box.innerHTML = `
    <p class="shelf-pick-recommend-heading">${escapeHtml(t('shelfPickHeading'))}</p>
    <p class="shelf-pick-recommend-note">${escapeHtml(noteText)}</p>
    <div class="shelf-pick-recommend-grid">${bookHtml}${musicHtml}</div>
    <a class="shelf-pick-more" href="javascript:void(0)" data-cat="${escapeHtml(cat.id)}">${escapeHtml(t('shelfPickMoreLink'))}</a>
  `;
  const moreLink = box.querySelector('.shelf-pick-more');
  if(moreLink){
    moreLink.onclick = ()=>goToShelf(cat.id);
  }
  box.classList.remove('hidden');
}

// ★v1.3公開前最終修正：本棚到着後の次行動（仕様書6章）。ボタンは「もう一冊つくる」
// 「表紙へ戻る」の2つだけ。三つ目のボタンは追加しない。
function renderBookshelfArrival(){
  const box = document.getElementById('bookshelfArrival');
  if(!box) return;
  if(!libraryCache.length){
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  const makeAnotherBtn = document.getElementById('bookshelfArrivalMakeAnother');
  if(makeAnotherBtn) makeAnotherBtn.onclick = ()=>goToPage('desk');
  // ★微調整：到着パネルの「表紙へ戻る」は、画面下部の「お店を出る」と機能が重複していたため削除。
  // 画面下部の「店主と棚を探す／お店を出る」、および店内メニュー内の「表紙へ戻る」は現状のまま維持する。
}

function renderRecordCorner(){
  const box = document.getElementById('recordCorner');
  if(!box) return;
  const slot = RECORD_PICKS[currentRecordSlot()];
  const day = Math.floor(Date.now() / 86400000);
  const song = slot.songs[day % slot.songs.length];
  const q = song.title + ' ' + song.artist;
  const amUrl = amazonSearchUrl(q, 'digital-music');
  const cdUrl = amazonSearchUrl(q + ' CD');
  const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q);
  const amcUrl = 'https://music.apple.com/jp/search?term=' + encodeURIComponent(q);
  box.innerHTML = `
    <div class="record-disc" aria-hidden="true"></div>
    <div class="record-body">
      <p class="record-label">${slot.label} <span class="record-pr">［PR・広告リンクを含みます］</span></p>
      <p class="record-title">『${song.title}』 ${song.artist}</p>
      <p class="record-line">${slot.line}</p>
      <p class="record-links">
        <a href="${amUrl}" target="_blank" rel="noopener sponsored">Amazon Music</a>
        <a href="${cdUrl}" target="_blank" rel="noopener sponsored">CD・レコードを探す</a>
        <a href="${spUrl}" target="_blank" rel="noopener">Spotify</a>
        <a href="${amcUrl}" target="_blank" rel="noopener">Apple Music</a>
        <a href="${ytUrl}" target="_blank" rel="noopener">YouTube</a>
      </p>
      ${favBtnHtml('music', song.title, song.artist, '', slot.label)}
      <p class="field-hint apple-music-note">${escapeHtml(t('appleMusicNote'))}</p>
    </div>`;
  box.classList.remove('hidden');
}

const BACKUP_KEYS = [
  'emotion-bookstore-library',
  PURIFY_LOG_KEY,
  'emotion-bookstore-shiori',
  'emotion-bookstore-prefs',
  'emotion-bookstore-milestones',
  'emotion-bookstore-profile',
  DRAFT_KEY
];

async function downloadBackup(){
  const stores = {};
  for(const key of BACKUP_KEYS){
    stores[key] = await loadJSON(key, null);
  }
  const payload = {
    app: 'みんなの感情書店',
    format: 'emotion-bookstore-backup',
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    bookCount: Array.isArray(stores['emotion-bookstore-library']) ? stores['emotion-bookstore-library'].length : 0,
    stores
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `感情書店_本棚の鍵_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

// ★追加：バックアップJSONファイルからの復元。
// フォーマット検証 → 内容の型チェック → 確認ダイアログ → 上書き保存 → 再描画（リロード）の順で行う。
function isValidBackupPayload(payload){
  if(!payload || typeof payload !== 'object') return false;
  if(payload.format !== 'emotion-bookstore-backup') return false;
  if(!payload.stores || typeof payload.stores !== 'object') return false;
  // 既知のキー以外は無視しつつ、既知キーの値が明らかに壊れていないかだけ緩やかに検査する
  const lib = payload.stores['emotion-bookstore-library'];
  if(lib !== undefined && lib !== null && !Array.isArray(lib)) return false;
  const purify = payload.stores[PURIFY_LOG_KEY];
  if(purify !== undefined && purify !== null && !Array.isArray(purify)) return false;
  return true;
}

async function restoreBackupFromPayload(payload){
  for(const key of BACKUP_KEYS){
    if(Object.prototype.hasOwnProperty.call(payload.stores, key)){
      const value = payload.stores[key];
      if(value === null || value === undefined) continue;
      await saveJSON(key, value);
    }
  }
}

function readFileAsText(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(String(reader.result || ''));
    reader.onerror = ()=>reject(reader.error || new Error('read error'));
    reader.readAsText(file, 'utf-8');
  });
}

async function handleRestoreFile(file){
  const btn = document.getElementById('restoreBtn');
  const msg = document.getElementById('restoreMsg');
  if(!file) return;
  try{
    const text = await readFileAsText(file);
    let payload;
    try{
      payload = JSON.parse(text);
    }catch(e){
      if(msg) msg.textContent = t('restoreInvalidFile');
      return;
    }
    if(!isValidBackupPayload(payload)){
      if(msg) msg.textContent = t('restoreInvalidFile');
      return;
    }
    const count = Number.isFinite(payload.bookCount)
      ? payload.bookCount
      : (Array.isArray(payload.stores['emotion-bookstore-library']) ? payload.stores['emotion-bookstore-library'].length : 0);
    const confirmMsg = t('restoreConfirm').replace('{count}', count);
    if(!confirm(confirmMsg)) return;

    if(btn) btn.textContent = t('restoreLoadingBtn');
    await restoreBackupFromPayload(payload);
    if(msg) msg.textContent = t('restoreSuccess');
    if(btn) btn.textContent = t('restoreDoneBtn');
    setTimeout(()=>{ location.reload(); }, 900);
  }catch(e){
    if(msg) msg.textContent = t('restoreFail');
    if(btn) btn.textContent = t('restoreFailBtn');
    setTimeout(()=>{ if(btn) btn.textContent = t('restoreDefaultBtn'); }, 2500);
  }
}

(function(){
  const backupBtn = document.getElementById('backupBtn');
  if(!backupBtn) return;
  backupBtn.onclick = async ()=>{
    backupBtn.textContent = t('backupCreatingBtn');
    try{
      await downloadBackup();
      backupBtn.textContent = t('backupDoneBtn');
      buzz(10);
    }catch(e){
      backupBtn.textContent = t('backupFailBtn');
    }
    setTimeout(()=>{ backupBtn.textContent = t('backupDefaultBtn'); }, 2500);
  };
})();

(function(){
  const restoreBtn = document.getElementById('restoreBtn');
  const restoreInput = document.getElementById('restoreFileInput');
  if(!restoreBtn || !restoreInput) return;
  restoreBtn.onclick = ()=>restoreInput.click();
  restoreInput.onchange = async (e)=>{
    const file = e.target.files && e.target.files[0];
    await handleRestoreFile(file);
    restoreInput.value = '';
  };
})();

function openShareMenu(url){
  const menu = document.getElementById('shareMenu');
  if(!menu) return;
  const shareText = t('shareText');
  const sx = document.getElementById('shareX');
  if(sx) sx.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(url);
  const sl = document.getElementById('shareLine');
  if(sl) sl.href = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url);
  const nativeBtn = document.getElementById('shareNative');
  if(nativeBtn){
    if(navigator.share){
      nativeBtn.classList.remove('hidden');
      nativeBtn.onclick = async ()=>{
        try{
          await navigator.share({ title:t('shopName'), text:shareText, url });
        }catch(e){}
      };
    }else{
      nativeBtn.classList.add('hidden');
    }
  }
  const urlInput = document.getElementById('shareUrlInput');
  if(urlInput) urlInput.value = url;
  const copyBtn = document.getElementById('shareCopy');
  if(copyBtn) copyBtn.onclick = async ()=>{
    try{
      if(!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard API unavailable');
      await navigator.clipboard.writeText(url);
      copyBtn.textContent = t('copyDoneBtn');
      setTimeout(()=>{ copyBtn.textContent = t('copyLinkDefaultBtn'); }, 2000);
    }catch(e){
      if(urlInput){
        urlInput.select();
        urlInput.setSelectionRange(0, url.length);
      }
      copyBtn.textContent = t('copyManualBtn');
    }
  };
  menu.classList.remove('hidden');
}

(function(){
  const shareBtn = document.getElementById('shareBtn');
  if(shareBtn) shareBtn.onclick = ()=>{ openShareMenu(window.location.href); };
  const closeBtn = document.getElementById('shareMenuClose');
  if(closeBtn) closeBtn.onclick = ()=>{
    const menu = document.getElementById('shareMenu');
    if(menu) menu.classList.add('hidden');
  };
})();

(function(){
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  if(!copyUrlBtn) return;
  copyUrlBtn.onclick = async ()=>{
    try{
      await navigator.clipboard.writeText(window.location.href);
      copyUrlBtn.textContent = t('copyDoneBtn');
    }catch(e){
      openShareMenu(window.location.href);
    }
    setTimeout(()=>{ copyUrlBtn.textContent = t('copyUrlDefaultBtn'); }, 2000);
  };
})();

(function(){
  const pwaPinBtn = document.getElementById('pwaPinBtn');
  if(!pwaPinBtn) return;
  pwaPinBtn.onclick = ()=>{
    const p = document.getElementById('pwaPopup');
    if(p) p.classList.remove('hidden');
  };
  const closeBtn = document.getElementById('pwaClose');
  if(closeBtn) closeBtn.onclick = ()=>{
    const p = document.getElementById('pwaPopup');
    if(p) p.classList.add('hidden');
  };
})();

function applySeasonalAccent(){
  const month = new Date().getMonth() + 1;
  let color;
  if(month >= 3 && month <= 5) color = '#C97FA0';
  else if(month >= 6 && month <= 8) color = '#4F9E8C';
  else if(month >= 9 && month <= 11) color = '#C9793D';
  else color = '#5E7FA8';
  document.documentElement.style.setProperty('--season-accent', color);
}

function applyNightModeIfNeeded(){
  const hour = new Date().getHours();
  if(hour >= 22 || hour < 5){
    document.body.classList.add('night');
  }
}

// ★WeatherPrototype1（時間帯のみ版）：端末の時計だけを見て、表紙（.entrance.hero）の
// 「店外の空の色」を静かに変える。位置情報・天気API・外部通信・保存は一切行わない。
// 判定結果は表紙のdata-daypart属性としてのみ出力し、色の実体はstyle.css側が持つ。
// 店内（編纂机・棚・本棚・モーダル等）には一切影響しない。
function currentDaypart(hour){
  const h = (typeof hour === 'number') ? hour : new Date().getHours();
  if(h >= 5  && h < 9)  return 'morning';  // 朝：淡い青灰色
  if(h >= 9  && h < 16) return 'day';      // 昼：落ち着いた青（明るくしすぎない）
  if(h >= 16 && h < 19) return 'evening';  // 夕方：青紫＋わずかな暖色
  if(h >= 19 && h < 23) return 'night';    // 夜：深い青（ブランドの中心）
  return 'midnight';                        // 深夜：より暗い紺
}
function applyDaypartSky(){
  const hero = document.querySelector('.entrance.hero');
  if(!hero) return;
  hero.setAttribute('data-daypart', currentDaypart());
}

// ★追加：右下の「↑」ボタンと衝突しないよう左下に配置する、書く導線のフローティングアクションボタン（FAB）。
// 押すと編纂机（③ 編纂机）まで自動でスクロールし、入力欄にフォーカスする。
function ensureWriteFab(){
  let btn = document.getElementById('writeFab');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'writeFab';
    btn.type = 'button';
    btn.className = 'write-fab';
    document.body.appendChild(btn);
  }
  // 言語切替のたびに再実行されても常に現在の言語のラベルへ更新する
  btn.setAttribute('aria-label', t('heroCta'));
  btn.title = t('heroCta');
  // ★Hotfix4ロールバック：ロゴ画像（assets/shop-seal.png）を円ボタンいっぱいに表示する試みは、
  // 本番環境で画像読み込みに失敗し「壊れた画像」アイコン（左下の“ハテナ”表示）として見えてしまう
  // 不具合が確認されたため撤回。他9件の修正・保存互換性には影響しないよう、この関数のみを
  // Hotfix4以前の「書く」文字ラベル表示へ戻す。
  const existingIcon = btn.querySelector('img.write-fab-icon');
  if(existingIcon) existingIcon.remove();
  btn.textContent = t('writeFabLabel');
  btn.onclick = ()=>{
    goToPage('desk');
    buzz(8);
    setTimeout(()=>{
      const ta = document.getElementById('storyInput');
      if(ta) ta.focus({ preventScroll:true });
    }, prefs.motion ? 700 : 150);
  };
}

function ensureBackToTopButton(){
  let btn = document.getElementById('backToTopBtn');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'backToTopBtn';
    btn.type = 'button';
    btn.className = 'back-to-top hidden';
    btn.setAttribute('aria-label', t('backToTopAria'));
    btn.textContent = '↑';
    document.body.appendChild(btn);
  }
  btn.onclick = ()=>{
    window.scrollTo({ top:0, behavior: prefs.motion ? 'smooth' : 'auto' });
  };
  const toggleVisibility = ()=>{
    const scrolled = window.scrollY || document.documentElement.scrollTop || 0;
    const footer = document.querySelector('footer.shop-footer');
    const nearFooter = footer ? (scrolled + window.innerHeight >= footer.offsetTop) : false;
    if(scrolled > 400){
      btn.classList.remove('hidden');
      btn.classList.toggle('near-footer', nearFooter);
    }else{
      btn.classList.add('hidden');
    }
  };
  window.addEventListener('scroll', toggleVisibility, { passive:true });
  toggleVisibility();
}

const PROFILE_KEY = 'emotion-bookstore-profile';
let userProfile = { name:'', persona:'' };

// ★追加：来店カードで呼び名を登録した場合、「あなたの本棚」等の「あなた」表記の代わりに
// その名前で表示する。未登録時は従来通りの既定文言（t()経由）のまま。
function applyUserNameDisplay(){
  const name = (userProfile && userProfile.name) ? userProfile.name.trim() : '';
  const shelfHead = document.querySelector('[data-i18n="sectionHead4"]');
  if(shelfHead){
    shelfHead.textContent = name
      ? (appLang === 'ja' ? `${name}の本棚` : `${name}'s Bookshelf`)
      : t('sectionHead4');
  }
  const taglineEl = document.querySelector('[data-i18n-html="tagline"]');
  if(taglineEl){
    const safeName = typeof escapeHtml === 'function' ? escapeHtml(name) : name;
    taglineEl.innerHTML = name
      ? (appLang === 'ja'
          ? `${safeName}さんの今の気持ちを、<br>一冊の本に。`
          : `Turn what ${safeName} feels now<br>into a book.`)
      : t('tagline');
  }
}
const PERSONA_CHOICES = [
  { id:'student',       label:'学生・10代' },
  { id:'jobhunter',     label:'就活生・受験生' },
  { id:'young_worker',  label:'新社会人・若手' },
  { id:'middle_worker', label:'中堅・リーダー' },
  { id:'career_woman',  label:'キャリアを生きる女性' },
  { id:'mother',        label:'子育ての真ん中' },
  { id:'romance',       label:'恋に悩んでいる' },
  { id:'creater',       label:'クリエイター・表現者' },
  { id:'resting',       label:'人生の転換期・お休み中' },
  { id:'sensitive',     label:'夜型・繊細な気質' },
  { id:'freelance',     label:'フリーランス・自営業' },
  { id:'caregiver',     label:'介護・看病の日々' },
  { id:'second_life',   label:'セカンドライフ・シニア' },
  { id:'illness',       label:'体調と付き合う日々' },
  { id:'jobchanger',    label:'転職を考えている' },
  { id:'',              label:'ひみつ（設定しない）' }
];

// ★英語モード監査：来店カードのペルソナ選択肢は main.js 内のみで完結する語彙のため、
// data.js を変更せずに main.js 内で英訳テーブルを持たせ、categoryLabelFor と同じ方式で解決する。
const PERSONA_LABEL_EN = {
  student: 'Student / Teen',
  jobhunter: 'Job hunter / Exam prep',
  young_worker: 'New to the workforce',
  middle_worker: 'Mid-career / Leading a team',
  career_woman: 'Building a career',
  mother: 'In the thick of parenting',
  romance: 'Navigating a relationship',
  creater: 'Creator / Making things',
  resting: 'In transition / Taking a break',
  sensitive: 'Night owl / Sensitive by nature',
  freelance: 'Freelance / Self-employed',
  caregiver: 'Caregiving days',
  second_life: 'Second life / Senior years',
  illness: 'Living with a health condition',
  jobchanger: 'Considering a career change',
  '': 'Prefer not to say'
};
function personaLabelFor(p){
  if(!p) return '';
  if(appLang === 'en' && PERSONA_LABEL_EN[p.id] !== undefined) return PERSONA_LABEL_EN[p.id];
  return p.label || '';
}

/* ---------- 来店カードのペルソナ選択をグループ化するためのラベル（棚選択UIと同じ考え方） ---------- */
const PERSONA_GROUPS = [
  { label:'学び・キャリアの入り口', labelEn:'Learning & starting a career', ids:['student','jobhunter','young_worker','jobchanger'] },
  { label:'働き方・立場',         labelEn:'Work & role',                 ids:['middle_worker','career_woman','freelance'] },
  { label:'暮らしと関わり',       labelEn:'Life & relationships',        ids:['mother','romance','caregiver','illness'] },
  { label:'自分のペースで',       labelEn:'At your own pace',            ids:['creater','resting','sensitive','second_life'] }
];
function personaGroupLabelFor(group){
  if(!group) return '';
  if(appLang === 'en' && group.labelEn) return group.labelEn;
  return group.label || '';
}

function buildProfileOverlay(){
  let ov = document.getElementById('profileOverlay');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'profileOverlay';
  ov.className = 'profile-overlay hidden';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('data-i18n-aria', 'profileDialogAria');
  ov.setAttribute('aria-label', t('profileDialogAria'));
  ov.innerHTML = `
    <div class="profile-card">
      <button type="button" class="profile-close" id="profileClose" data-i18n-aria="closeBtn" aria-label="${escapeHtml(t('closeBtn'))}">×</button>
      <p class="profile-kicker" data-i18n="profileKicker">${escapeHtml(t('profileKicker'))}</p>
      <p class="profile-lead" data-i18n="profileLead">${escapeHtml(t('profileLead'))}</p>
      <p class="profile-note" data-i18n="profileNote">${escapeHtml(t('profileNote'))}</p>
      <label class="profile-label" for="profileName" data-i18n="profileNameLabel">${escapeHtml(t('profileNameLabel'))}</label>
      <input id="profileName" maxlength="12" data-i18n-ph="profileNamePlaceholder" placeholder="${escapeHtml(t('profileNamePlaceholder'))}" autocomplete="off">
      <p class="profile-label" data-i18n="profilePersonaLabel">${escapeHtml(t('profilePersonaLabel'))}</p>
      <div class="profile-personas" id="profilePersonas"></div>
      <!-- ★Step3：店主の選択（まな／綴）は停止し、店主は「まな」に一本化。
           選択UI（#profileKeeperStyle と keeper-style-chip）は表示しない。
           showProfileCard側のstyleBox参照は if(styleBox) ガード済みのため、非表示でもエラーにならない。 -->
      <button type="button" class="profile-save" id="profileSave" data-i18n="profileSaveBtn">${escapeHtml(t('profileSaveBtn'))}</button>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', (e)=>{ if(e.target.id === 'profileOverlay') ov.classList.add('hidden'); });
  const x = ov.querySelector('#profileClose');
  if(x) x.onclick = ()=>ov.classList.add('hidden');
  return ov;
}

function showProfileCard(){
  const ov = buildProfileOverlay();
  const nameInput = ov.querySelector('#profileName');
  if(nameInput) nameInput.value = userProfile.name || '';
  const grid = ov.querySelector('#profilePersonas');
  let chosen = userProfile.persona || '';
  if(grid){
    grid.innerHTML = '';
    const byId = {};
    PERSONA_CHOICES.forEach(p=>{ byId[p.id] = p; });
    const markSelected = ()=>{
      grid.querySelectorAll('.persona-chip').forEach(el=>{
        el.classList.toggle('selected', el.dataset.personaId === chosen);
      });
    };
    const makeChip = p=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'persona-chip' + (chosen === p.id ? ' selected' : '');
      b.dataset.personaId = p.id;
      b.textContent = personaLabelFor(p);
      b.onclick = ()=>{ chosen = p.id; markSelected(); };
      return b;
    };
    const usedIds = new Set();
    (typeof PERSONA_GROUPS !== 'undefined' ? PERSONA_GROUPS : []).forEach(group=>{
      const idsHere = group.ids.filter(id=>byId[id]);
      if(!idsHere.length) return;
      const groupEl = document.createElement('div');
      groupEl.className = 'persona-group';
      const label = document.createElement('span');
      label.className = 'persona-group-label';
      label.textContent = personaGroupLabelFor(group);
      groupEl.appendChild(label);
      const row = document.createElement('div');
      row.className = 'persona-group-row';
      idsHere.forEach(id=>{
        row.appendChild(makeChip(byId[id]));
        usedIds.add(id);
      });
      groupEl.appendChild(row);
      grid.appendChild(groupEl);
    });
    // グループ未分類の選択肢（「ひみつ」等）は最後に単独行で表示
    const remaining = PERSONA_CHOICES.filter(p=>!usedIds.has(p.id));
    if(remaining.length){
      const row = document.createElement('div');
      row.className = 'persona-group-row persona-group-row-other';
      remaining.forEach(p=>row.appendChild(makeChip(p)));
      grid.appendChild(row);
    }
  }
  const styleBox = ov.querySelector('#profileKeeperStyle');
  let chosenStyle = prefs.keeperStyle || 'gentle';
  if(styleBox){
    const markStyle = ()=>{
      styleBox.querySelectorAll('.keeper-style-chip').forEach(el=>{
        el.classList.toggle('selected', el.dataset.style === chosenStyle);
      });
    };
    styleBox.querySelectorAll('.keeper-style-chip').forEach(el=>{
      el.onclick = ()=>{ chosenStyle = el.dataset.style; markStyle(); };
    });
    markStyle();
  }
  const saveBtn = ov.querySelector('#profileSave');
  if(saveBtn) saveBtn.onclick = async ()=>{
    userProfile.name = nameInput ? nameInput.value.trim().slice(0, 12) : '';
    userProfile.persona = chosen;
    await saveJSON(PROFILE_KEY, userProfile);
    prefs.keeperStyle = chosenStyle;
    saveJSON('emotion-bookstore-prefs', prefs);
    if(typeof updateKeeperBioText === 'function') updateKeeperBioText();
    if(typeof applyUserNameDisplay === 'function') applyUserNameDisplay();
    ov.classList.add('hidden');
    let welcome = userProfile.name
      ? ('……' + userProfile.name + 'さん、ですね。お名前、覚えました。')
      : '……ようこそ。ゆっくりしていってください。';
    if(userProfile.persona && typeof MIDNIGHT_MESSAGES !== 'undefined' && MIDNIGHT_MESSAGES[userProfile.persona]){
      const pool = MIDNIGHT_MESSAGES[userProfile.persona];
      welcome += '\n' + pool[Math.floor(Math.random()*pool.length)];
    }
    appendBubble('shopkeeper', welcome);
    buzz(8);
  };
  ov.classList.remove('hidden');
}

function warnInAppBrowserIfNeeded(){
  try{
    const ua = navigator.userAgent || '';
    const inApp = /Line\//i.test(ua) || /FBAV|FB_IAB|Instagram|TikTok|Twitter for/i.test(ua);
    if(!inApp || document.getElementById('inAppBrowserNote')) return;
    const bar = document.createElement('div');
    bar.id = 'inAppBrowserNote';
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:sticky;top:0;z-index:300;background:#6E2A34;color:#F6ECD4;font-size:12.5px;line-height:1.7;padding:10px 40px 10px 14px;';
    const closeLabel = (typeof t === 'function') ? t('closeBtn') : '閉じる';
    const warnText = (typeof t === 'function') ? t('inAppBrowserWarning') : 'アプリ内ブラウザで開いています。この環境では<b>記録が保存されない場合があります</b>。Safari や Chrome で開き直すことをおすすめします。';
    bar.innerHTML = warnText + `<button type="button" aria-label="${closeLabel}" style="position:absolute;right:8px;top:8px;background:none;border:none;color:#F6ECD4;font-size:16px;cursor:pointer;">×</button>`;
    bar.querySelector('button').onclick = ()=>bar.remove();
    document.body.insertBefore(bar, document.body.firstChild);
  }catch(e){}
}

(async function init(){
  // ★v1.3最終統合：体験モードのメニュー配線・experience-readyマーカーは、
  // 他の非同期初期化（言語・prefs等）より先に行い、JS初期化直後から
  // 表紙のみが見える状態へできるだけ早く切り替える。
  initExperienceMenuControls();
  await initLanguage();
  // ★v1.3公開前最終修正：番台の棚案内UI（4択＋それ以外）を初期表示する。
  initCounterShelfGuide();
  // ★v1.3 RC2：初期化時にも今日の日付を描画する（仕様書2章）。
  if(typeof renderCurrentShopDate === 'function') renderCurrentShopDate();
  applySeasonalAccent();
  applyNightModeIfNeeded();
  // ★WeatherPrototype1：端末時刻のみで表紙の空の色を決める（外部通信・位置情報なし）
  applyDaypartSky();
  warnInAppBrowserIfNeeded();
  restoreDraftIfAny();
  ensureBackToTopButton();
  ensureWriteFab();
  setupShelfSwipe();
  // ★修正：以前はここより後（initPrefs()呼び出しより前）でisTsundere()を参照する挨拶文を
  // 組み立てていたため、保存済みの店主の性格設定（優しい／ツンデレ）が読み込まれる前に
  // 判定してしまい、再訪問時も常に既定値（優しい）の挨拶になってしまう不具合があった。
  // prefsの読み込みを先に済ませてから、以降の判定に進むよう順序を修正。
  await initPrefs();
  if(typeof updateKeeperBioText === 'function') updateKeeperBioText();
  const savedProfile = await loadJSON(PROFILE_KEY, null);
  if(savedProfile && typeof savedProfile === 'object'){
    userProfile = Object.assign(userProfile, savedProfile);
  }
  if(typeof applyUserNameDisplay === 'function') applyUserNameDisplay();
  // ★Step2：来店時の挨拶を判定するため、本棚データを挨拶より先に読み込む（読み込み箇所の移動のみ・二重読み込みなし）
  libraryCache = await loadJSON('emotion-bookstore-library', []);
  // ★微調整：#firstGreetingText（旧チャットUI＝#chatWindow内）は現行の公開画面では
  // 常時非表示のため、意味の通らない「こんばんは。棚は、そのままです。」という再訪文の
  // 描画自体を廃止した（#chatWindow・#firstGreeting自体はDOM・関数とも削除せず、互換性維持のため残す）。
  // ★v1.3 Phase A-3：来店カードの1.4秒自動表示を停止（監査書5章-1）。
  // showProfileCard()本体・保存キー・MIDNIGHT_MESSAGES歓迎文は無変更。手動導線（直下のprofileBtn）のみ残す。
  const profileBtn = document.getElementById('profileBtn');
  if(profileBtn) profileBtn.onclick = ()=>showProfileCard();
  renderFair();
  renderCategorySelect();
  // ★Step2：libraryCacheの読み込みは挨拶判定のため上（greeting直前）へ移動済み
  favoritesCache = await loadJSON(FAVORITES_KEY, []);
  let _migrated = false;
  libraryCache.forEach(e=>{ if(e && e.category === 'moya'){ e.category = 'moyamoya'; _migrated = true; } });
  if(_migrated) saveJSON('emotion-bookstore-library', libraryCache);
  loadJSON(PURIFY_LOG_KEY, []).then(plog=>{
    if(Array.isArray(plog) && plog.some(p=>p && p.category === 'moya')){
      plog.forEach(p=>{ if(p && p.category === 'moya') p.category = 'moyamoya'; });
      saveJSON(PURIFY_LOG_KEY, plog);
    }
  });
  renderShelfTabs();
  renderShelfDisplay();
  renderShelf();
  updateStoryCount();
  // ★微調整：起動時に旧チャットUI（#chartOptions/#textureStep）へ内容を描画していたため、
  // 表示制御（.hiddenクラス）が効いていない状況下で「第二段階の候補」が初期状態から
  // 見えてしまう不具合の一因になっていた。現行の公開導線はrenderCounterShelfGuideRoot()
  // （5択＋それ以外）に一本化されているため、この呼び出しは行わない。
  renderTitleSuggest();

  // ★2026-07-18変更：backupBtn／exportDiary／exportDiaryCsv／restoreBtnの初期文言設定を
  // refreshUtilityButtonLabels()（言語切替時にも呼ばれる共通関数）へ統一した。
  if(typeof refreshUtilityButtonLabels === 'function') refreshUtilityButtonLabels();

  // ★2026-07-19追加：任意設定の天気連動機能。ボタン・プルダウンの配線と表示更新のみここで行い、
  // navigator.geolocationの呼び出しはuseCurrentLocationForWeather()（クリック時のみ）に限定する。
  // weatherSettingsは本棚・prefsとは別の専用キーから読み込む。
  // ★2026-07-19 公開用リリースフラグ：WEATHER_FEATURE_ENABLEDがfalseの間は、天気機能の
  // 入口（設定UI・バッジ・設定読み込み・起動時取得）を一切開かない。内部ロジックは無変更。
  if(WEATHER_FEATURE_ENABLED){
    await loadWeatherSettings();
    const weatherToggleBtn = document.getElementById('weatherToggle');
    if(weatherToggleBtn) weatherToggleBtn.onclick = toggleWeatherEnabled;
    const weatherRegionSelect = document.getElementById('weatherRegionSelect');
    if(weatherRegionSelect) weatherRegionSelect.onchange = (ev)=>onWeatherRegionSelectChange(ev.target.value);
    const weatherUseLocationBtn = document.getElementById('weatherUseLocationBtn');
    if(weatherUseLocationBtn) weatherUseLocationBtn.onclick = useCurrentLocationForWeather;
    const weatherBadgeBtn = document.getElementById('weatherBadge');
    if(weatherBadgeBtn) weatherBadgeBtn.onclick = toggleWeatherDetail;
    // ★2026-07-19 hotfix：Escapeキー・外側クリックでポップオーバーを閉じるリスナーを1回だけ登録する。
    if(typeof setupWeatherDetailDismissHandlers === 'function') setupWeatherDetailDismissHandlers();
    updateWeatherUI();
    // 既にONかつ地域設定済みの場合だけ、保存済みの座標で取得を試みる（位置情報の許可は要求しない）。
    if(weatherSettings.enabled) refreshWeatherIfNeeded(false);
  }else{
    // 保存済みの天気設定がONでも読み込まず（weatherSettingsは既定のOFFのまま）、
    // 設定UI・バッジを非表示にして通常表示を維持する。通信・位置情報要求は発生しない。
    const weatherSettingsBox = document.getElementById('weatherSettings');
    if(weatherSettingsBox){ weatherSettingsBox.classList.add('hidden'); weatherSettingsBox.hidden = true; }
    const weatherBadgeBtn = document.getElementById('weatherBadge');
    if(weatherBadgeBtn){ weatherBadgeBtn.classList.add('hidden'); weatherBadgeBtn.hidden = true; }
    const weatherPop = document.getElementById('weatherDetailPopover');
    if(weatherPop){ weatherPop.classList.add('hidden'); weatherPop.hidden = true; }
  }

  // ★2026-07-19 feature/first-visit-experience：表紙の「この書店の一冊を、のぞいてみる」ボタン。
  // 閲覧専用のサンプル本を開くだけで、保存・GA4送信・画面遷移は行わない。
  // ★Hotfix4-1：同じボタンで開閉をトグルする（開いている間はラベルが「閉じる」に変わる）。
  const samplePeekBtn = document.getElementById('samplePeekBtn');
  if(samplePeekBtn) samplePeekBtn.onclick = ()=>{
    if(isSampleBookOpen()) closeSampleBook(); else openSampleBook();
  };

  // ★2026-07-19 E：編纂机「店主に題名を相談する」。
  const titleConsultBtn = document.getElementById('titleConsultBtn');
  if(titleConsultBtn) titleConsultBtn.onclick = toggleTitleConsult;

  // ★2026-07-19 C：店内メニュー最下部の「↑ メニューの上へ戻る」。ページ本体ではなく
  // メニューのスクロール領域だけを先頭へ戻す。スムーズスクロールは演出ONかつ
  // prefers-reduced-motionでない場合のみ。
  const menuBackToTopBtn = document.getElementById('menuBackToTop');
  if(menuBackToTopBtn) menuBackToTopBtn.onclick = ()=>{
    const card = document.getElementById('experienceMenuCard');
    if(!card) return;
    let reduced = false;
    try{ reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
    const smooth = prefs.motion && !reduced;
    if(typeof card.scrollTo === 'function'){
      card.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    }else{
      card.scrollTop = 0;
    }
  };

  // ★GA4整合：view_landing — DOM初期化後、トップページが表示可能になった時点で
  // フルページロードごとに1回だけ送信。二重初期化でも重複しないメモリ上のガード付き。
  // URL・referrer・言語等の独自パラメータは付けない。
  if(!_gaViewLandingSent){
    _gaViewLandingSent = true;
    trackAnalyticsEvent('view_landing');
  }

  const shelfControls = document.querySelector('.shelf-controls');
  if(shelfControls && !document.getElementById('viewPurifyLogBtn')){
    const btn = document.createElement('button');
    btn.id = 'viewPurifyLogBtn';
    btn.className = 'reset-link';
    btn.textContent = t('purifyLogBtn');
    btn.onclick = showPurifyLog;
    shelfControls.insertBefore(btn, shelfControls.firstChild);
  }
  if(shelfControls && !document.getElementById('viewFavoritesBtn')){
    const favListBtn = document.createElement('button');
    favListBtn.id = 'viewFavoritesBtn';
    favListBtn.className = 'reset-link';
    favListBtn.onclick = showFavorites;
    shelfControls.insertBefore(favListBtn, shelfControls.firstChild);
    updateFavoritesBtnLabel();
  }
})();
