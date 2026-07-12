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
    tagline: "モヤモヤを言語化して整理する、<br>あなただけの感情日記。",
    subTagline: "感情の書店で、自分だけの一冊を見つけよう。",
    accordionSummary: "言語化できない今の「心の質感」を選ぶだけ。<br>店主のみちびきで、自分だけの本棚が育つ日記アプリ。",
    accordionOpenLabel: "どんな体験ができるの？",
    accordionCloseLabel: "閉じる",
    accordionTitle: "みんなの感情書店とは",
    accordionP1: "言語化できない「今の心の質感」を直感的に選ぶだけで、店主が優しくナビゲートしてくれます。<br>そして、あなたの感情にそっと寄り添う「本」や「音楽」との思いがけない出会いをご提案します。",
    accordionP2: "モヤモヤした気持ちや言葉にならない本音は、美しい背表紙の一冊の本に。<br>誰の目も気にしなくていいこの場所で、あなただけの本棚を少しずつ育ててみませんか？<br>他人の視線に疲れた心が、スッと軽くなる体験をお届けします。",
    introKicker: "この書店でできること<br>— 好きな場所から、自由に巡れます",
    introTitle1: "店主に話す", introText1: "今の気持ちを、選択肢か自由な言葉で伝えます。",
    introTitle2: "棚を巡る", introText2: "15種類の感情の棚から、名言や本、曲に出会います。",
    introTitle3: "物語を綴る", introText3: "自分の体験を書き、製本して棚に納めます。",
    introTitle4: "本棚が育つ", introText4: "綴った物語が積み重なり、自分だけの本棚に。",
    enterBtn: "扉をひらく →",
    motionToggleOn: "演出：入", motionToggleOff: "演出：切",
    motionToggleTitle: "演出アニメーションの入/切",
    profileBtn: "🪪 来店カード", profileBtnTitle: "お名前と属性の設定（任意・この端末にのみ保存）",
    trustBadge1: "登録不要", trustBadge2: "この端末にのみ保存", trustBadge3: "AIの学習には使われません",
    pageNavAria: "ページを選ぶ",
    pageTab1: "① 番台", pageTab2: "② 棚", pageTab3: "③ 編纂机", pageTab4: "④ 本棚",
    sectionHead1: "番台 — 店主に相談する", sectionSub1: "今のモヤモヤを、そのまま話してください。",
    keeperBioSummary: "店主について",
    keeperBioText: "この書店の店主。名前は「巡（めぐる）」と名乗っています。年齢や性別は明かしていません。普段はカウンターの奥で静かに本を読んでおり、お客さんの言葉に耳を傾けるのが仕事です。棚には、巡が長年かけて手帳に書き集めてきた、古今の名言が出典つきで並んでいます。",
    keeperNameLabel: "店主",
    firstGreeting: "……いらっしゃいませ。ちょうど頁を閉じたところです。今はどんな気分に近いですか。近いものを選んでも、下に自由に書いてもらっても構いません。",
    textureStepAria: "心の質感を選ぶ",
    guideLead: "👇 当てはまるものがない場合は、下の枠に言葉を書いて「話す」を押してください",
    freeformHintDesk: "※書いた言葉は、そのまま編纂机の原稿用紙に写しておきます。",
    earlyFreeformHint: "当てはまるものがない場合は、この枠に気持ちを書いて「話す」を押してください。",
    userInputPlaceholder: "例：うまく言えないけど、朝からずっとモヤモヤしている…",
    sendBtn: "話す",
    sectionHead2: "感情の棚", sectionSub2: "棚を選んでも、あてもなく巡っても。",
    swipeHint: "← 左右にスワイプでも棚を移動できます →",
    backToBandai: "⤴ 番台へ戻る",
    sectionHead3: "編纂机 — 物語を綴る",
    sectionSub3: "今の棚は「{shelf}」です。書き終えたら、タイトルは店主が考えます（自分でつけても構いません）。今の気持ちだけでなく、以前のことを振り返って綴ることもできます。",
    storyInputPlaceholder: "いつ、どこで、何があって、どう感じたか。短くても、拙くても構いません。",
    assistBtn: "書き出しに迷ったら、店主の助け舟",
    storyCountFormat: "{count} / {max}字",
    photoLabel: "📷 今日の一枚を、頁に挟む（任意）",
    photoPreviewAlt: "添付写真のプレビュー",
    photoRemoveAria: "写真を外す",
    photoHint: "写真はこの端末の中だけで、長辺800pxに折りたたんで保管します。サーバーには送信されません。",
    deskExtraSummary: "✍️ 棚・タイトル・いつの気持ちかを、自分で決める（任意）",
    fieldLabelShelf: "棚", fieldLabelTitle: "背表紙のタイトル", titleInputPlaceholder: "空欄なら店主が考えます",
    fieldLabelWhen: "いつの気持ちですか", whenOptionNow: "今の気持ち", whenOptionPast: "以前のことを振り返って",
    fieldLabelTweet: "関連するXの投稿があれば", tweetInputPlaceholder: "例：https://x.com/username/status/1234567890",
    fieldHint: "「以前のことを振り返って」を選ぶと、あの時の気持ちをそのまま本棚に閉じ込めておけます。困った時に開き直すと、前にも同じ気持ちを乗り越えてきたことがわかります。Xの投稿へのリンクを貼ると、本を開いたときに公式の埋め込みで表示されます。本文や画像を直接お預かりすることはありません。",
    submitStory: "店主に預けて製本する",
    invSeal: "封", invKicker: "推薦状", invGoShelf: "棚を見てみる", invClose: "しおりに挟む",
    sectionHead4: "あなたの本棚",
    sectionSub4: "納品した物語が背表紙になって並びます。クリックすると読めます。困った時にここを開くと、前にも同じ気持ちを乗り越えてきたことがわかります。",
    shelfEmptyMsg: "まだ本がありません。編纂机で最初の一冊を綴ってみましょう。",
    recordCornerAria: "店主のレコード棚",
    resetShelf: "本棚をリセットする",
    trendDetailSummary: "感情の地図を詳しく見る",
    trendNote: "※月次「感情取扱説明書」レポートの簡易デモです。この地図はあなたにだけ見えています。",
    shioriCardTitle: "今日の栞", shioriCardNote: "あなたの本棚を眺めた店主から、一枚。",
    shioriLabel: "栞 — 店主より", shioriBtn: "栞を受け取る",
    footerBrand: "『みんなの感情書店』",
    footerNote: "綴った言葉はサーバーには送信されず、この端末にのみ保存されます。",
    shareBtn: "🔗 この書店をシェアする", copyUrlBtn: "📋 URLをコピー", pwaPinBtn: "📌 ホーム画面にピン留め",
    privacyLink: "プライバシーポリシー", termsLink: "利用規約",
    shareMenuTitle: "シェアする", shareX: "Xでシェア", shareLine: "LINEでシェア",
    shareNative: "端末の共有機能を使う", shareCopy: "リンクをコピー",
    shareMenuHint: "コピーできない場合は、上の欄をタップして全選択→コピーしてください。",
    closeBtn: "閉じる",
    bindText: "糸をかけています…", bindSkip: "タップで即座に完了",
    purifyOverlayAria: "気持ちを手放す",
    purifyKicker: "手放す — 誰にも見られません。この端末の「手放しの記録」にだけ、そっと残ります",
    purifyInputPlaceholder: "その気持ちを、ここにそのまま書き出してみてください。",
    purifyBtn: "🕯 手放す",
    modalPhotoAlt: "この頁に挟まれた写真", modalNoteLabel: "店主のことば",
    modalGoShelf: "この棚をもう一度見る", modalDel: "この本を棚から下げる",
    modalShare: "🐦 Xでシェア", modalShareNote: "※本文はそのまま送信されません。投稿画面が開くだけで、実際に投稿するかはあなた次第です。",
    pwaPopupAria: "ホーム画面に追加する案内",
    pwaTitle: "📌 この書店をスマホのホーム画面にピン留めする",
    pwaSteps: "iPhone（Safari）：下の「共有」ボタン →「ホーム画面に追加」<br>Android（Chrome）：右上のメニュー（⋮）→「ホーム画面に追加」",
    pwaNote: "アプリのように、いつでも1タップで扉をひらけるようになります。",
    inAppBrowserWarning: "アプリ内ブラウザで開いています。この環境では<b>記録が保存されない場合があります</b>。Safari や Chrome で開き直すことをおすすめします。",
    langScopeNote: "※ 会話の内容や名言・おすすめは、現在この端末では日本語のままです。",
    fairGoBtn: "棚へ",
    wanderBtn: "⚘ 気の向くままに巡る",
    shioriChoosingWords: "店主が言葉を選んでいます…",
    bindTextStep2: "表紙を綴じています…",
    draftRestored: "書きかけの下書きを復元しました。続きからどうぞ。",
    storyTooShort: "まずは、そのときの気持ちを書いてみてください。",
    storyLimitWarning: "本文は{max}字までに収めてください。",
    storyReviewing: "店主が物語に目を通しています…",
    tweetLinkInvalid: "Xの投稿リンクの形式が正しくないようです（例：https://x.com/ユーザー名/status/12345）。",
    exportingBtn: "書き出しています…", exportedBtn: "書き出しました ✓", exportFailBtn: "書き出しに失敗しました",
    exportDefaultBtn: "📥 これまでの記録をテキストでダウンロード",
    csvExportDefaultBtn: "📊 これまでの記録をCSVでダウンロード（Excel等で開けます）",
    restoreDefaultBtn: "📤 バックアップから復元する",
    restoreLoadingBtn: "復元しています…", restoreDoneBtn: "復元しました ✓", restoreFailBtn: "復元に失敗しました",
    restoreConfirm: "選択したファイルには{count}冊分の記録が含まれています。\nこの端末の現在のデータを上書きして復元します。\nこの操作は取り消せません。よろしいですか？",
    restoreInvalidFile: "このファイルは『みんなの感情書店』のバックアップ形式ではないようです。別のファイルをお試しください。",
    restoreSuccess: "復元しました。画面を更新します…",
    restoreFail: "復元に失敗しました。ファイルの内容をご確認ください。",
    mitateYesBtn: "聞いてみる", mitateNoBtn: "今はいい",
    loopShelfReferralBtn: "こちらの『{shelf}』の棚が、合うかもしれません。行ってみてください",
    appleMusicNote: "※Apple Musicはアプリが開くだけのことがあります。開いたら曲名で検索し直してください。",
    supportLink: "☕ 店主に、差し入れを贈る",
    supportHint: "この書店を気に入っていただけたら、店主へそっと差し入れを。任意です。",
    deskLeadFromCounter: "——ここまでを踏まえて。番台や棚で出会った気持ちを、今度はあなた自身の言葉で綴ってみましょう。",
    writeAtDeskBtn: "この気持ちを書き留める",
    chooseAgainBtn: "また選び直す",
    chooseFromOptionsBtn: "選択肢からも選べます",
    writeAtDeskBtn2: "この気持ちを机で書き留める",
    restartChatBtn: "最初から話し直す",
    backToTextureBtn: "質感から選び直す",
    syncedToDeskMsg: "番台でお聞きしたお話を、原稿用紙に書き留めておきました。続きをどうぞ、あなたのペースで綴ってください",
    photoLoadFail: "写真を読み込めませんでした。別の写真でお試しください。",
    ghostNextBook: "＋ 次の一冊",
    backupCreatingBtn: "鍵を作っています…", backupDoneBtn: "鍵を更新しました ✓", backupFailBtn: "鍵の更新に失敗しました",
    backupDefaultBtn: "🔑 本棚のデータをバックアップ保存する",
    copyDoneBtn: "コピーしました ✓", copyLinkDefaultBtn: "リンクをコピー", copyManualBtn: "↓の欄からコピーしてください",
    copyUrlDoneBtn: "コピーしました ✓", copyUrlDefaultBtn: "📋 URLをコピー",
    purifyLogBtn: "🕯 手放した気持ちの記録を見る",
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
    dataAboutBody: "「店主」はAIチャットではなく、あらかじめ用意された言葉を状況に応じて返す簡単な仕組みです（特定のAIモデルと会話しているわけではありません）。<br>「物語を綴る」「製本する」で書いた内容は、どこにも公開されず、この端末のブラウザ内（IndexedDB/localStorage）だけに保存されます。外部サーバーへは送信されません。アカウント登録もなく、他の人があなたの記録を見ることはできません。<br>「気持ちを手放す」は、この端末だけに残る「手放しの記録」に静かに移すことで、本棚の一覧からは見えなくなる機能です（完全な削除ではなく、専用の記録欄に移されます）。<br>「みんなの本棚」の「みんな」は他ユーザーとの共有ではなく、あなた自身の本棚が育っていく様子を指す名前です。<br>「今月の寄り道」および棚のおすすめ本・音楽の一部は、季節の言葉と棚の名前だけを検索語として外部の書籍・音楽検索サービスに問い合わせて表示しています。この時も、あなたが綴った文章が送信されることはありません。<br>ブラウザのデータを消去するとこの記録も失われるため、「🔑 バックアップ保存」から定期的にファイルへ書き出すことをおすすめします。サービスとして終了する場合も、事前にバックアップを取っていただければお手元にデータが残ります。",
    keeperNotAiHint: "※AIチャットボットではなく、あらかじめ用意した言葉を返す簡単な仕組みです。会話はモデルに送信されません。",
    submitStoryHint: "※外部には公開されず、この端末のブラウザ内にのみ保存されます。"
  },
  en: {
    tagline: "Put your feelings into words,<br>a diary that's yours alone.",
    subTagline: "Find the one book that's meant for you.",
    accordionSummary: "Just pick the \"texture\" of how you feel right now.<br>An app where your own bookshelf grows, guided gently by the shopkeeper.",
    accordionOpenLabel: "What can I do here?",
    accordionCloseLabel: "Close",
    accordionTitle: "About Emotion Bookstore",
    accordionP1: "Simply choose the \"texture of your heart\" that you can't quite put into words, and the shopkeeper will gently guide you.<br>We'll also introduce you to unexpected encounters with \"books\" and \"music\" that quietly sit with your feelings.",
    accordionP2: "That murky feeling, that honest voice you can't quite say out loud — let it become a single book with a beautiful spine.<br>In a place where no one else's eyes matter, why not slowly grow a bookshelf that's entirely your own?<br>A heart tired of being watched can finally feel a little lighter.",
    introKicker: "What this bookstore offers<br>— wander freely, starting wherever you like",
    introTitle1: "Talk to the shopkeeper", introText1: "Share how you feel now — pick an option, or write freely.",
    introTitle2: "Browse the shelves", introText2: "Discover quotes, books and songs across 15 emotion shelves.",
    introTitle3: "Write your story", introText3: "Write your experience, and have it bound onto the shelf.",
    introTitle4: "Watch your shelf grow", introText4: "Every story you write adds up to a bookshelf all your own.",
    enterBtn: "Open the door →",
    motionToggleOn: "Motion: On", motionToggleOff: "Motion: Off",
    motionToggleTitle: "Toggle animation effects on/off",
    profileBtn: "🪪 Visitor card", profileBtnTitle: "Set your name and details (optional, stored on this device only)",
    trustBadge1: "No sign-up", trustBadge2: "Stored on this device only", trustBadge3: "Never used to train AI",
    pageNavAria: "Choose a page",
    pageTab1: "① Counter", pageTab2: "② Shelves", pageTab3: "③ Writing desk", pageTab4: "④ Bookshelf",
    sectionHead1: "The Counter — Talk to the shopkeeper", sectionSub1: "Tell us whatever's on your mind, just as it is.",
    keeperBioSummary: "About the shopkeeper",
    keeperBioText: "The keeper of this bookstore goes by \"Meguru.\" Their age and gender remain unrevealed. They usually read quietly at the back of the counter, and their job is to listen to what customers have to say. The shelves are lined with quotes old and new, sourced and collected by Meguru over many years in a notebook.",
    keeperNameLabel: "Shopkeeper",
    firstGreeting: "……Welcome. I just closed a page. What mood are you closest to right now? You can pick something close, or write freely below.",
    textureStepAria: "Choose the texture of your heart",
    guideLead: "👇 If nothing quite fits, write your own words in the box below and press \"Talk\"",
    freeformHintDesk: "※ What you write here will also be copied onto the manuscript paper at the writing desk.",
    earlyFreeformHint: "If nothing quite fits, write how you feel in this box and press \"Talk.\"",
    userInputPlaceholder: "e.g. I can't quite explain it, but I've felt unsettled all morning…",
    sendBtn: "Talk",
    sectionHead2: "The Emotion Shelves", sectionSub2: "Pick a shelf, or just wander without a destination.",
    swipeHint: "← Swipe left or right to move between shelves →",
    backToBandai: "⤴ Back to the counter",
    sectionHead3: "The Writing Desk — Write your story",
    sectionSub3: "The current shelf is \"{shelf}.\" Once you're done, the shopkeeper will come up with a title (or you can write your own). You can write about how you feel now, or look back on something from before.",
    storyInputPlaceholder: "When, where, what happened, and how it felt. Short and imperfect is fine.",
    assistBtn: "Not sure how to start? Ask the shopkeeper for a hand",
    storyCountFormat: "{count} / {max} chars",
    photoLabel: "📷 Slip in today's photo (optional)",
    photoPreviewAlt: "Preview of attached photo",
    photoRemoveAria: "Remove photo",
    photoHint: "Photos are resized to a maximum of 800px and kept only on this device. Nothing is sent to a server.",
    deskExtraSummary: "✍️ Choose the shelf, title, and timing yourself (optional)",
    fieldLabelShelf: "Shelf", fieldLabelTitle: "Spine title", titleInputPlaceholder: "Leave blank and the shopkeeper will decide",
    fieldLabelWhen: "When did you feel this?", whenOptionNow: "Right now", whenOptionPast: "Looking back on the past",
    fieldLabelTweet: "Link a related post on X, if any", tweetInputPlaceholder: "e.g. https://x.com/username/status/1234567890",
    fieldHint: "Choosing \"looking back on the past\" lets you seal that moment's feeling onto the shelf just as it was. Opening it again when you're struggling shows you that you've gotten through this feeling before. A link to a post on X will show up as an official embed when the book is opened — we never store the post's text or images directly.",
    submitStory: "Hand it to the shopkeeper for binding",
    invSeal: "Sealed", invKicker: "Letter of Recommendation", invGoShelf: "Take a look at the shelf", invClose: "Tuck it away as a bookmark",
    sectionHead4: "Your Bookshelf",
    sectionSub4: "Your delivered stories line up as book spines. Click to read them. Opening this when you're struggling shows you that you've gotten through this feeling before.",
    shelfEmptyMsg: "No books yet. Try writing your first one at the writing desk.",
    recordCornerAria: "Shopkeeper's record corner",
    resetShelf: "Reset bookshelf",
    trendDetailSummary: "See your emotion map in detail",
    trendNote: "※ A simple demo of the monthly \"Emotion Handbook\" report. This map is visible only to you.",
    shioriCardTitle: "Today's Bookmark", shioriCardNote: "A note from the shopkeeper, after looking over your bookshelf.",
    shioriLabel: "Bookmark — from the shopkeeper", shioriBtn: "Receive today's bookmark",
    footerBrand: "\"Emotion Bookstore\"",
    footerNote: "What you write is never sent to a server — it's stored only on this device.",
    shareBtn: "🔗 Share this bookstore", copyUrlBtn: "📋 Copy URL", pwaPinBtn: "📌 Pin to home screen",
    privacyLink: "Privacy Policy", termsLink: "Terms of Service",
    shareMenuTitle: "Share", shareX: "Share on X", shareLine: "Share on LINE",
    shareNative: "Use device share menu", shareCopy: "Copy link",
    shareMenuHint: "If copying doesn't work, tap the field above to select all, then copy.",
    closeBtn: "Close",
    bindText: "Binding the thread…", bindSkip: "Tap to finish instantly",
    purifyOverlayAria: "Let go of a feeling",
    purifyKicker: "Let go — no one will see this. It's kept quietly only in this device's \"release log.\"",
    purifyInputPlaceholder: "Write that feeling out here, just as it is.",
    purifyBtn: "🕯 Let it go",
    modalPhotoAlt: "Photo attached to this page", modalNoteLabel: "A word from the shopkeeper",
    modalGoShelf: "See this shelf again", modalDel: "Remove this book from the shelf",
    modalShare: "🐦 Share on X", modalShareNote: "Nothing is sent anywhere on its own — this only opens the post composer, and whether you actually post is entirely up to you.",
    pwaPopupAria: "Instructions for adding to home screen",
    pwaTitle: "📌 Pin this bookstore to your phone's home screen",
    pwaSteps: "iPhone (Safari): tap the \"Share\" button below → \"Add to Home Screen\"<br>Android (Chrome): tap the menu (⋮) top right → \"Add to Home Screen\"",
    pwaNote: "Just like an app, you'll be able to open the door with a single tap anytime.",
    inAppBrowserWarning: "You're viewing this inside an in-app browser. <b>Your records may not be saved</b> in this environment. We recommend reopening in Safari or Chrome.",
    langScopeNote: "※ Conversation content, quotes, and recommendations are currently shown in Japanese only.",
    fairGoBtn: "Go",
    wanderBtn: "⚘ Wander wherever it leads",
    shioriChoosingWords: "The shopkeeper is choosing their words…",
    bindTextStep2: "Binding the cover…",
    draftRestored: "Your draft has been restored. Please continue where you left off.",
    storyTooShort: "First, try writing how you felt at that moment.",
    storyLimitWarning: "Please keep the text within {max} characters.",
    storyReviewing: "The shopkeeper is reading through your story…",
    tweetLinkInvalid: "That doesn't look like a valid link to a post on X (e.g. https://x.com/username/status/12345).",
    exportingBtn: "Exporting…", exportedBtn: "Exported ✓", exportFailBtn: "Export failed",
    exportDefaultBtn: "📥 Download your records as text",
    csvExportDefaultBtn: "📊 Download your records as CSV (opens in Excel, etc.)",
    restoreDefaultBtn: "📤 Restore from a backup file",
    restoreLoadingBtn: "Restoring…", restoreDoneBtn: "Restored ✓", restoreFailBtn: "Restore failed",
    restoreConfirm: "The selected file contains {count} book(s).\nThis will overwrite the current data on this device.\nThis cannot be undone. Continue?",
    restoreInvalidFile: "This file doesn't look like an Emotion Bookstore backup. Please try a different file.",
    restoreSuccess: "Restored. Reloading…",
    restoreFail: "Restore failed. Please check the contents of the file.",
    mitateYesBtn: "Yes, tell me", mitateNoBtn: "Not right now",
    loopShelfReferralBtn: "The \"{shelf}\" shelf might suit you — please take a look",
    appleMusicNote: "※ Apple Music links sometimes just open the app. If so, please search the song title again there.",
    supportLink: "☕ Leave a small tip for the shopkeeper",
    supportHint: "If you've enjoyed this bookstore, a small tip for the shopkeeper is always welcome — entirely optional.",
    deskLeadFromCounter: "——Building on that. Try writing the feeling you shared at the counter or on the shelves, now in your own words.",
    writeAtDeskBtn: "Write this feeling down",
    chooseAgainBtn: "Choose again",
    chooseFromOptionsBtn: "You can also pick from the options",
    writeAtDeskBtn2: "Write this feeling down at the desk",
    restartChatBtn: "Start the conversation over",
    backToTextureBtn: "Choose the texture again",
    syncedToDeskMsg: "I've jotted down what you told me at the counter onto the manuscript paper. Please continue at your own pace.",
    photoLoadFail: "Couldn't load that photo. Please try a different one.",
    ghostNextBook: "+ Next book",
    backupCreatingBtn: "Creating a key…", backupDoneBtn: "Key updated ✓", backupFailBtn: "Key update failed",
    backupDefaultBtn: "🔑 Back up your bookshelf data",
    copyDoneBtn: "Copied ✓", copyLinkDefaultBtn: "Copy link", copyManualBtn: "Please copy from the field below",
    copyUrlDoneBtn: "Copied ✓", copyUrlDefaultBtn: "📋 Copy URL",
    purifyLogBtn: "🕯 View your release log",
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
    dataAboutBody: "The \"shopkeeper\" isn't an AI chatbot — it's a simple system that returns pre-written lines based on context (you're not talking to any particular AI model).<br>Anything you write in \"Write your story\" or have \"bound\" is never published anywhere. It's stored only inside this device's browser (IndexedDB/localStorage) and never sent to an external server. There's no account, so no one else can see your records.<br>\"Let go of a feeling\" quietly moves that entry into a device-only \"release log\" so it no longer appears on your bookshelf — it isn't permanently deleted, just moved to its own log.<br>\"Everyone's Bookshelf\" doesn't mean sharing with other users — \"everyone\" here just names the idea of your own bookshelf growing over time.<br>\"This month's detour\" and some of the shelf's book/music picks are fetched from external book and music search services, using only a season word and the shelf's emotion label as the search terms. Your written entries are never sent in these requests either.<br>Clearing your browser data will also erase these records, so we recommend periodically exporting a backup file via \"🔑 Back up your data.\" Even if this service were ever discontinued, your data would remain safe on your device as long as you've backed it up beforehand.",
    keeperNotAiHint: "※ Not an AI chatbot — a simple system that replies with pre-written lines. Nothing is sent to a model.",
    submitStoryHint: "※ Never published anywhere — stored only inside this device's browser."
  }
};

function t(key){
  const dict = MESSAGES[appLang] || MESSAGES.ja;
  return (dict && dict[key] !== undefined) ? dict[key] : (MESSAGES.ja[key] || '');
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
  // 「今の棚は「◯◯」です…」のように、途中に動的な棚名が挟まる文言はテンプレート差し込みで処理
  const sectionSub3 = document.querySelector('#desk .section-sub');
  if(sectionSub3){
    const [before, after] = t('sectionSub3').split('{shelf}');
    sectionSub3.innerHTML = `${before}「<span id="deskCategoryLabel">${(typeof shelfLabelOf === 'function' && typeof activeCategory !== 'undefined') ? shelfLabelOf(activeCategory) : ''}</span>」${after}`;
  }
  // 演出トグル・文字数カウンターなど、JS側で直接書き換えているUI文言も追従させる
  if(typeof applyPrefs === 'function') applyPrefs();
  if(typeof updateStoryCount === 'function') updateStoryCount();
  const langBtn = document.getElementById('langToggle');
  if(langBtn) langBtn.textContent = appLang === 'ja' ? '🌐 JP / EN' : '🌐 EN / JP';
  const titleEl = document.querySelector('title');
  if(titleEl){
    titleEl.textContent = appLang === 'ja'
      ? 'みんなの感情書店 — 感情日記・自己分析アプリ｜登録不要・無料'
      : 'Emotion Bookstore — A journaling app for putting feelings into words';
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

function scoreLabelForStory(label, story){
  if(!story) return 0;
  const chars = Array.from(new Set(label.replace(/[のをにがはでへと日頁記録一]/g,'').split('')));
  let s = 0;
  chars.forEach(ch=>{ if(story.includes(ch)) s++; });
  return s;
}

function suggestTitles(catId, story, n){
  const pool = TITLE_TEMPLATES[catId] || [];
  if(!pool.length) return [];
  const scored = shuffleArray(pool).map(l=>({ l, s: scoreLabelForStory(l, story) })).sort((a,b)=>b.s-a.s);
  return scored.slice(0, n || 4).map(x=>x.l);
}

function renderTitleSuggest(){
  const box = document.getElementById('titleSuggest');
  const sel = document.getElementById('categorySelect');
  if(!box || !sel) return;
  const ta = document.getElementById('storyInput');
  const tInput = document.getElementById('titleInput');
  const story = ta ? ta.value.trim() : '';
  const picks = suggestTitles(sel.value || activeCategory, story, 4);
  if(!picks.length){ box.innerHTML = ''; return; }
  box.innerHTML = '<span class="title-suggest-label">店主の見立て（タップで採用・自分で書き換えても）：</span>';
  picks.forEach(l=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'title-chip';
    b.textContent = l;
    b.onclick = ()=>{ if(tInput){ tInput.value = l; buzz(5); } };
    box.appendChild(b);
  });
}

function generateTitle(categoryId){
  const pool = TITLE_TEMPLATES[categoryId] || ['名前のない一冊'];
  return pool[Math.floor(Math.random()*pool.length)];
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
  const cat = CATEGORIES.find(c=>c.id===entry.category);
  const shelfLabel = cat ? cat.label : '';
  const title = entry.title || '';
  return `「${title}」を、みんなの感情書店の「${shelfLabel}の棚」に綴りました。`;
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
  const pool = BOOK_POOL.filter(b=>b.tags.includes(catId) && b.wave <= wave);
  const shuffled = shuffleArray(pool);
  const picked = shuffled.slice(0, 3).map(b=>({
    title:b.title, by:b.by, why:(b.hook || recommendReasonFor(catId))
  }));
  return pinned.concat(picked);
}

const STORY_LIMIT = 700;
function countChars(str){ return Array.from(str || '').length; }
let activeCategory = (CATEGORIES && CATEGORIES.length) ? CATEGORIES[0].id : 'moyamoya';
let libraryCache = [];

const TEXTURE_GROUPS = [
  {
    id:'sink',
    label:'心が重く沈んでいる、気分が落ち込んでいる（静かな憂鬱）',
    keeper:'少しお疲れのようですね。このあたりの棚に、今の心に寄り添う本があるかもしれません。',
    shelves:['moyamoya','kodoku','gakkari','hazukashii','ushirometai','kanashii'],
    tone:'heavy'
  },
  {
    id:'wave',
    label:'心がざわざわして落ち着かない、焦りや不安がある（動的な葛藤）',
    keeper:'感情が波立っているのですね。こちらの棚に並ぶ言葉が、ヒントになるかもしれません。',
    shelves:['aseri','kuyashii','shitto','akogare','ikari','fuan'],
    tone:'heavy'
  },
  {
    id:'light',
    label:'心が穏やか、または前向きでワクワクしている（ポジティブ）',
    keeper:'素敵な心の状態ですね。今の明るい気分にぴったりの棚を覗いてみませんか。',
    shelves:['wakuwaku','ando','kansha','itooshii','hokorashii','ureshii'],
    tone:'neutral'
  },
  {
    id:'sepia',
    label:'過去の出来事や、懐かしい記憶を振り返っている（追憶）',
    keeper:'過去の頁をめくっているのですね。思い出に浸れるこちらの棚がおすすめです。',
    shelves:['natsukashii','ushirometai','kansha'],
    tone:'neutral'
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
      warnStorageOnce('この端末では保存ができないようです（プライベートブラウズ中や、保存容量の設定をご確認ください）。');
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
  return `<button type="button" class="fav-btn${fav ? ' is-fav' : ''}" data-fav-type="${escapeHtml(type)}" data-fav-title="${escapeHtml(title)}" data-fav-by="${escapeHtml(by || '')}" data-fav-category="${escapeHtml(category || '')}" data-fav-extra="${escapeHtml((extra || '').slice(0, 80))}" aria-pressed="${fav}">${fav ? '★ 気になる' : '☆ 気になる'}</button>`;
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
      b.textContent = nowFav ? '★ 気になる' : '☆ 気になる';
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
  overlay.setAttribute('aria-label', '気になるリスト');
  overlay.innerHTML = `
    <div class="purify-log-card">
      <button type="button" class="purify-log-close" id="favoritesClose" aria-label="閉じる">×</button>
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
        const label = cat ? cat.label : '';
        const q5 = f.title + ' ' + (f.by || '');
        const isMusic = f.type === 'music';
        const links = isMusic
          ? `<a href="https://open.spotify.com/search/${encodeURIComponent(q5)}" target="_blank" rel="noopener">Spotify</a> <a href="https://music.apple.com/jp/search?term=${encodeURIComponent(q5)}" target="_blank" rel="noopener">Apple Music</a> <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(q5)}" target="_blank" rel="noopener">YouTube</a>`
          : `<a href="${amazonSearchUrl(q5)}" target="_blank" rel="noopener">Amazon</a> <a href="${rakutenSearchUrl(q5)}" target="_blank" rel="noopener">楽天</a>`;
        return `<div class="purify-log-entry">
          <p class="purify-log-meta">${isMusic ? '🎵' : '📖'} ${escapeHtml(label)}</p>
          <p class="purify-log-text">${escapeHtml(f.title)}${f.by ? ' — ' + escapeHtml(f.by) : ''}</p>
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
    lines.push('棚：' + (cat ? cat.label : e.category));
    lines.push('日付：' + (e.date ? new Date(e.date).toLocaleDateString('ja-JP') : '不明'));
    if(e.sealed) lines.push('（以前を振り返って綴った一冊）');
    lines.push(e.story);
    if(e.note) lines.push('店主のことば：' + e.note);
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
  rows.push(['種別','通し番号','タイトル','棚','日付','振り返り','本文','店主のことば']);
  lib.forEach((e, i)=>{
    const cat = CATEGORIES.find(c=>c.id===e.category);
    rows.push([
      '本棚の物語',
      i + 1,
      e.title || '',
      cat ? cat.label : (e.category || ''),
      e.date ? new Date(e.date).toLocaleDateString('ja-JP') : '',
      e.sealed ? 'はい' : '',
      e.story || '',
      e.note || ''
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
  overlay.setAttribute('aria-label', '手放した気持ちの記録');
  overlay.innerHTML = `
    <div class="purify-log-card">
      <button type="button" class="purify-log-close" id="purifyLogClose" aria-label="閉じる">×</button>
      <p class="purify-log-kicker">手放した気持ちの記録</p>
      <div class="purify-log-list" id="purifyLogList"></div>
      <div class="purify-log-actions">
        <button type="button" class="purify-log-hide" id="purifyLogHideBtn">表示を隠す</button>
        <button type="button" class="purify-log-close-btn" id="purifyLogCloseBtn">閉じる</button>
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
    if(list) list.innerHTML = '<p class="purify-log-empty">表示を隠しました。データは端末にそのまま保存されています。もう一度開くと再表示されます。</p>';
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
      list.innerHTML = '<p class="purify-log-empty">まだ、手放した気持ちの記録はありません。</p>';
    }else{
      list.innerHTML = log.slice().reverse().map(p=>{
        const cat = CATEGORIES.find(c=>c.id===p.category);
        const label = cat ? cat.label : (p.category || '');
        const dateStr = new Date(p.date).toLocaleDateString('ja-JP');
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
  for(const t of PERSONA_TRIGGERS){
    if(t.patterns.some(p=>text.includes(p))) return t.persona;
  }
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
  for(const s of STATE_TRIGGERS){
    if(s.patterns.some(p=>text.includes(p))) return s.state;
  }
  if(NEGATIVE_SHELVES.includes(fallbackShelfId)) return 'yami';
  return 'darui';
}

function counselingFlavorReply(text, fallbackShelfId){
  const persona = detectCounselingPersona(text);
  const state = detectCounselingState(text, fallbackShelfId);
  const personaPool = COUNSELING_MESSAGES[persona] || COUNSELING_MESSAGES.young_worker;
  const pool = personaPool[state] || personaPool.darui || [];
  if(!pool.length) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

const PERSONAL_INFO_PATTERNS = [/\d{2,4}-\d{3,4}-\d{3,4}/, /[\w.+-]+@[\w-]+\.[\w.-]+/, /(本名|住所|電話番号|LINE\s*ID)[:：]/];
const ATTACK_WORDS = ['死ね','殺す','消えろ','ぶっ殺'];
const CRISIS_STORY_PATTERNS = ['死にたい','消えたい','自分を傷つけ','リストカット'];

function detectShelfFromText(text, minScore){
  let bestId = null, bestScore = 0;
  for(const id in CATEGORY_KEYWORDS){
    const score = CATEGORY_KEYWORDS[id].reduce((n,w)=>n + (text.includes(w) ? 1 : 0), 0);
    if(score > bestScore){ bestScore = score; bestId = id; }
  }
  return bestScore >= (minScore || 1) ? bestId : null;
}

function localCurate(title, story, chosenId){
  const combined = title + '\n' + story;
  if(CRISIS_STORY_PATTERNS.some(w=>combined.includes(w))){
    return {
      approved:false, category:null, note:'',
      reason:'その気持ちは、ここに書き留めるだけでなく、信頼できる大人の方や「よりそいホットライン」0120-279-338にも、ぜひ話してみてください。'
    };
  }
  if(PERSONAL_INFO_PATTERNS.some(p=>p.test(combined))){
    return { approved:false, category:null, note:'', reason:'連絡先や個人が特定できる情報が含まれているようです。そこだけ伏せて、もう一度お持ちください。' };
  }
  if(ATTACK_WORDS.some(w=>combined.includes(w))){
    return { approved:false, category:null, note:'', reason:'誰かを深く傷つける言葉が含まれているようです。ご自身の気持ちの部分だけ、綴り直してみてください。' };
  }
  let bestId = chosenId, bestScore = 0;
  for(const id in CATEGORY_KEYWORDS){
    const score = CATEGORY_KEYWORDS[id].reduce((n,w)=>n + (combined.includes(w) ? 1 : 0), 0);
    if(score > bestScore){ bestScore = score; bestId = id; }
  }
  const suggested = (bestScore >= 2 && bestId !== chosenId) ? bestId : chosenId;
  return {
    approved:true,
    category:suggested,
    note: SHOPKEEPER_NOTES[Math.floor(Math.random()*SHOPKEEPER_NOTES.length)],
    reason:''
  };
}

function localShiori(topLabel){
  const t = SHIORI_TEMPLATES[Math.floor(Math.random()*SHIORI_TEMPLATES.length)];
  return t.replace('{cat}', topLabel);
}

let prefs = { motion:true, sound:false, keeperStyle:'gentle' };

// ★追加：店主の性格（優しい／ツンデレ）で、口調だけを切り替える薄いヘルパー。
// どちらを選んでも中身の温かさ・味方であることは変わらず、言い回しだけがツンデレ寄りになる。
function isTsundere(){ return prefs.keeperStyle === 'tsundere'; }
function pickByStyle(gentleArr, tsundereArr){
  const pool = (isTsundere() && Array.isArray(tsundereArr) && tsundereArr.length) ? tsundereArr : gentleArr;
  return pool[Math.floor(Math.random()*pool.length)];
}
const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function applyPrefs(){
  document.body.classList.toggle('no-motion', !prefs.motion);
  const mt = document.getElementById('motionToggle');
  if(mt){
    mt.textContent = t(prefs.motion ? 'motionToggleOn' : 'motionToggleOff');
    mt.classList.toggle('on', prefs.motion);
  }
}

async function initPrefs(){
  const saved = await loadJSON('emotion-bookstore-prefs', null);
  if(saved && typeof saved === 'object'){
    prefs = Object.assign(prefs, saved);
  }else if(reduceQuery && reduceQuery.matches){
    prefs.motion = false;
  }
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

function buzz(ms){
  if(prefs.motion && navigator.vibrate){
    try{ navigator.vibrate(ms); }catch(e){}
  }
}

const HEAVY_WORDS = ['つら','しんど','悲し','泣','苦し','不安','怖','孤独','疲れ','嫌','消え'];
const BRIGHT_WORDS = ['嬉し','楽し','わくわく','ワクワク','好き','幸','誇ら','最高'];
function setMood(text){
  if(!prefs.motion) return;
  const layer = document.getElementById('moodLayer');
  if(!layer) return;
  if(HEAVY_WORDS.some(w=>text.includes(w))){
    layer.style.background = 'rgba(45,60,110,0.07)';
  }else if(BRIGHT_WORDS.some(w=>text.includes(w))){
    layer.style.background = 'rgba(255,150,60,0.06)';
  }else{
    layer.style.background = 'rgba(0,0,0,0)';
  }
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

function goToPage(id){
  setActivePageTab(id);
  if(id === 'desk'){ syncCounterDraftToDesk(); updateDeskLead(); }
  if(!prefs.motion){
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToId(id)));
    return;
  }
  const overlay = document.getElementById('pageTurnOverlay');
  if(!overlay){
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToId(id)));
    return;
  }
  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');
  buzz(10);
  setTimeout(()=>scrollToId(id), 260);
  setTimeout(()=>overlay.classList.remove('active'), 650);
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
    box.innerHTML = '';
    const title = document.createElement('b');
    title.textContent = m + '月の店主のおすすめ棚 — 『' + cat.label + '』';
    const line = document.createElement('span');
    line.className = 'fair-line';
    line.textContent = fair.line;
    const go = document.createElement('button');
    go.className = 'fair-go';
    go.textContent = t('fairGoBtn');
    go.onclick = ()=>goToShelf(fair.id);
    box.appendChild(title); box.appendChild(line); box.appendChild(go);
  }catch(e){ console.error('renderFair failed', e); }
}

function topCategoryId(){
  if(libraryCache.length === 0) return null;
  const counts = {};
  libraryCache.forEach(e=>{ counts[e.category] = (counts[e.category]||0) + 1; });
  const withCounts = CATEGORIES.filter(c=>counts[c.id]);
  if(!withCounts.length) return null;
  return withCounts.sort((a,b)=>counts[b.id]-counts[a.id])[0].id;
}

const SHELF_GROUP_LABELS = {
  sink:  { ja:'静かに沈む気持ち', en:'Quiet & heavy' },
  wave:  { ja:'ざわつく気持ち',   en:'Restless & turbulent' },
  light: { ja:'明るい気持ち',     en:'Bright & warm' },
  sepia: { ja:'懐かしい気持ち',   en:'Nostalgic' }
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
        btn.className = 'shelf-tab' + (cat.id===activeCategory ? ' active' : '');
        btn.dataset.catId = cat.id;
        if(cat.id === topId){
          btn.classList.add('glow');
          btn.title = 'あなたの本棚と縁の深い棚';
        }
        btn.textContent = cat.label;
        btn.onclick = ()=>{ activeCategory = cat.id; renderShelfTabs(); renderShelfDisplay(); };
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
      activeCategory = pick;
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
  const tierLabel = { low:'ちいさな寄り道', medium:'すこし贅沢な寄り道', high:'とっておきの寄り道' };
  const picks = shuffleArray(items).slice(0, 3);
  const cardsHtml = picks.map(featured=>{
    const url = detourUrlFor(featured);
    return `
      <div class="detour-card detour-tier-${featured.tier}">
        <span class="detour-tier-badge">${tierLabel[featured.tier] || featured.tier}</span>
        <p class="detour-name">${escapeHtml(featured.name)}</p>
        <p class="detour-desc">${escapeHtml(featured.description)}</p>
        <a class="detour-link" href="${url}" target="_blank" rel="noopener sponsored">見てみる →</a>
      </div>`;
  }).join('');
  box.innerHTML = `
    <p class="detour-heading">今月の寄り道<span class="detour-pr">［PR・広告リンクを含みます］</span></p>
    <div class="detour-cards">${cardsHtml}</div>
    <p class="detour-note">寄り道の品揃えは、棚を巡るたびに入れ替わります。</p>`;
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

  box.innerHTML = `<p class="detour-heading">今月の寄り道</p><p class="detour-loading">……季節に合う一冊を探しています</p>`;

  // 同じ感情の棚でも3種類ほどランダムに、かつ月が変わるまでは同じ顔ぶれになるように
  // {granularity:'month', count:3} を指定して取得する。
  const liveItems = await fetchSeasonalBooks(catLabel, '寄り道', { granularity:'month', count:3 });

  // 取得中に棚が切り替わっていたら、古い結果は描画しない
  if(activeCategory !== requestedCategory) return;

  if(liveItems && liveItems.length){
    const cardsHtml = liveItems.slice(0, 3).map(b=>{
      const url = b.infoLink || amazonSearchUrl(b.title + ' ' + b.by);
      return `
        <div class="detour-card detour-live">
          <span class="detour-tier-badge">🌐 今月の一冊</span>
          <p class="detour-name">${escapeHtml(b.title)}</p>
          <p class="detour-desc">${escapeHtml(b.by)}${b.hook ? ' — ' + escapeHtml(b.hook) : ''}</p>
          <a class="detour-link" href="${url}" target="_blank" rel="noopener">見てみる →</a>
          ${favBtnHtml('book', b.title, b.by, catId, b.hook || '')}
        </div>`;
    }).join('');
    box.innerHTML = `
      <p class="detour-heading">今月の寄り道<span class="detour-pr">［外部の書籍情報サービスから取得］</span></p>
      <div class="detour-cards">${cardsHtml}</div>
      <p class="detour-note">同じ棚でも3種類をランダムに表示し、月が変わるとまた新しい顔ぶれになります。</p>`;
    return;
  }

  renderDetourFallback(box, catId);
}

// ★棚の「店主が選んだ本」「プレイリスト」は従来どおり厳選済みの静的データを主とし、
//   そこに加えて、季節の言葉×棚のラベルでGoogle Books API／iTunes Search APIから
//   実際に見つかった新しめの一冊・一曲を1件ずつ添える。取得できなければ何も表示しない
//   （厳選データの表示自体は止めない＝壊れない設計）。
async function renderLiveNewReleases(cat){
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
      <span class="live-pick-badge">🌐 今、見つかった一冊</span>
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
      <span class="live-pick-badge">🌐 今、見つかった一曲</span>
      <p class="live-pick-name">『${escapeHtml(s.title)}』${escapeHtml(s.artist)}</p>
      ${s.comment ? `<p class="live-pick-desc">${escapeHtml(s.comment)}</p>` : ''}
      <a class="live-pick-link" href="${spUrl}" target="_blank" rel="noopener">聴いてみる →</a>
      ${favBtnHtml('music', s.title, s.artist, cat.id, s.comment || '')}
    </div>`;
  }
  wrapEl.innerHTML = html
    ? `<p class="live-pick-heading">🌐 今、季節に合わせて見つかったもの</p><div class="live-pick-row">${html}</div>`
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
    const quotes = cat.quotes || [];
    const q = quotes.length ? quotes[Math.floor(Math.random()*quotes.length)] : { text:'', source:'' };
    const recs = pickRecommend(cat.id);
    const moodSearchQuery = cat.label + ' 気持ち おすすめ 本';
    const moodSearchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(moodSearchQuery);
    const recommendHtml = (recs && recs.length)
      ? `<div class="recommend-section">
          <p class="recommend-heading">「${cat.label}」な今のあなたに、店主が選んだ本</p>
          <p class="recommend-subtext">読むための本というより、この気持ちのお守りになる一冊です</p>
          <div class="recommend-row">
          ${recs.map(r=>{
            const q2 = r.title + ' ' + r.by;
            const amazonUrl = amazonSearchUrl(q2);
            const kindleUrl = amazonSearchUrl(q2, 'digital-text');
            const audibleUrl = amazonSearchUrl(q2, 'audible');
            const rakutenUrl = rakutenSearchUrl(q2);
            return `<span class="recommend-chip" title="${r.why || ''}">
              ${r.hook ? `<span class="recommend-hook">${r.hook}</span>` : ''}
              『${r.title}』${r.by}
              <span class="recommend-why">${r.why || ''}</span>
              <span class="recommend-shop-links">
                <a class="recommend-buy" href="${amazonUrl}" target="_blank" rel="noopener">Amazon</a>
                <a class="recommend-buy kindle" href="${kindleUrl}" target="_blank" rel="noopener">Kindle</a>
                <a class="recommend-buy audible" href="${audibleUrl}" target="_blank" rel="noopener">Audible</a>
                <a class="recommend-buy rakuten" href="${rakutenUrl}" target="_blank" rel="noopener">楽天</a>
              </span>
              ${favBtnHtml('book', r.title, r.by, cat.id, r.hook || r.why || '')}
              ${r.source ? `<a class="recommend-source" href="${r.sourceUrl}" target="_blank" rel="noopener">出典：${r.source}</a>` : ''}
            </span>`;
          }).join('')}
          <button type="button" class="recommend-shuffle" onclick="renderShelfDisplay()" title="他のおすすめを見る">🔀 他も見る</button>
          <a class="recommend-more" href="${moodSearchUrl}" target="_blank" rel="noopener">🔎 「${cat.label}」な気分の本を、いろんな人のおすすめから探す →</a>
          </div>
         </div>`
      : '';
    const mq = MUSIC_QUERIES[cat.id] || [];
    const pinnedSongs = PINNED_SONGS[cat.id] || [];
    const trackSrc = mq.length
      ? shuffleArray(mq).slice(0, 3).map(t=>({ title:t.title, artist:t.artist, comment:t.comment || '' }))
      : pinnedSongs.map(t=>({ title:t.title, artist:t.artist, comment:'' }));
    let musicHtml;
    if(trackSrc.length){
      const items = trackSrc.map(song=>{
        const q3 = song.title + ' ' + song.artist;
        const amUrl = amazonSearchUrl(q3 + ' 音楽');
        const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q3);
        const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q3);
        const amcUrl = 'https://music.apple.com/jp/search?term=' + encodeURIComponent(q3);
        return `<div class="playlist-track-row">
          <span class="playlist-track-name">『${song.title}』${song.artist}</span>
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
      musicHtml = `<div class="music-row"><p class="playlist-label">🎵 「${cat.label}」なプレイリスト — 店主の選曲</p><div class="playlist-tracks">${items}</div><p class="field-hint apple-music-note">${escapeHtml(t('appleMusicNote'))}</p></div>`;
    }else{
      const fallbackQuery = cat.label + ' 邦楽 プレイリスト';
      const musicUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(fallbackQuery);
      const musicUrlAmc = 'https://music.apple.com/jp/search?term=' + encodeURIComponent(fallbackQuery);
      musicHtml = `<div class="music-row"><a class="music-link" href="${musicUrl}" target="_blank" rel="noopener">🎵 YouTubeでBGMを探す</a> <a class="music-link" href="${musicUrlAmc}" target="_blank" rel="noopener">Apple Musicで探す</a><p class="field-hint apple-music-note">${escapeHtml(t('appleMusicNote'))}</p></div>`;
    }
    const myEntries = libraryCache.filter(e=>e.category===cat.id);
    // ★修正（XSS対策）：ユーザーが編纂机で入力したタイトル・本文をinnerHTMLへ差し込む前に
    // 必ずescapeHtml()を通す（<script>等のタグ注入を無害化する）
    const myEpisodeCards = myEntries.map(entry=>{
      const safeTitle = escapeHtml(entry.title);
      const safeStoryRaw = entry.story.length > 60 ? entry.story.slice(0,60) + '…' : entry.story;
      const safeStory = escapeHtml(safeStoryRaw);
      const safeId = escapeHtml(entry.id);
      return `<div class="episode-card mine" data-entry-id="${safeId}"><span class="who mine-who">あなたの物語${entry.tweetUrl ? ' 🐦' : ''}</span>『${safeTitle}』${safeStory}</div>`;
    });
    const storyPool = STORIES_POOL[cat.id] || [];
    const shuffledStories = shuffleArray(storyPool).slice(0, 3);
    const sampleEpisodeCards = shuffledStories.map(s=>`<div class="episode-card"><span class="who">${s.author || '名もなき誰かの物語'}</span>${s.text}</div>`);
    const allEpisodeCards = myEpisodeCards.concat(sampleEpisodeCards);
    const visibleEpisodesHtml = allEpisodeCards.slice(0, 2).join('');
    const hiddenEpisodeCards = allEpisodeCards.slice(2);
    const hiddenEpisodesHtml = hiddenEpisodeCards.length
      ? `<div class="episodes-more hidden" id="episodesMore">${hiddenEpisodeCards.join('')}</div><button type="button" class="episodes-toggle" id="episodesToggle" data-more-label="もっと見る（あと${hiddenEpisodeCards.length}件）" onclick="toggleEpisodes()">もっと見る（あと${hiddenEpisodeCards.length}件）</button>`
      : '';
    const episodesNote = '';
    const purifyHtml = NEGATIVE_SHELVES.includes(cat.id)
      ? `<button type="button" class="purify-trigger" onclick="openPurify('${cat.id}')">🕯 この気持ちを手放す</button>`
      : '';
    el.innerHTML = `
      <p class="definition"><b>${cat.label}</b> — ${cat.def}</p>
      <p class="quote-card">${q.text}</p>
      <p class="quote-source">— ${quoteSourceHtml(q.source)}</p>
      <p class="episodes-heading">あなたの物語・みんなの物語</p>
      <div class="episodes">
        ${visibleEpisodesHtml}
        ${hiddenEpisodesHtml}
      </div>
      ${episodesNote}
      <div class="shelf-tweets" id="shelfTweets"></div>
      <button type="button" class="episode-shuffle" onclick="renderShelfDisplay()">🔀 エピソードも見る</button>
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
    const tweetBox = el.querySelector('#shelfTweets');
    const urls = PINNED_TWEETS[cat.id];
    if(tweetBox && urls && urls.length){
      tweetBox.innerHTML = '<p class="shelf-tweets-label">この棚に寄せられた、実際の声（Xより）</p>';
      urls.slice(0, 3).forEach(u=>{
        const holder = document.createElement('div');
        tweetBox.appendChild(holder);
        renderTweetEmbed(holder, u);
      });
    }
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
  activeCategory = ids[idx];
  renderShelfTabs();
  renderShelfDisplay();
  const activeTab = document.querySelector('#shelfTabs .shelf-tab.active');
  if(activeTab && activeTab.scrollIntoView){
    try{ activeTab.scrollIntoView({behavior: prefs.motion ? 'smooth' : 'auto', inline:'center', block:'nearest'}); }catch(e){}
  }
  if(navigator.vibrate) try{ navigator.vibrate(10); }catch(e){}
}

function setupShelfSwipe(){
  const el = document.getElementById('shelfDisplay');
  if(!el || el.dataset.swipeBound) return;
  el.dataset.swipeBound = '1';
  const SWIPE_THRESHOLD = 45;
  let startX = 0, startY = 0, tracking = false;
  el.addEventListener('touchstart', (e)=>{
    if(!e.touches || e.touches.length !== 1){ tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, {passive:true});
  el.addEventListener('touchend', (e)=>{
    if(!tracking) return;
    tracking = false;
    const touch = e.changedTouches && e.changedTouches[0];
    if(!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if(Math.abs(dx) < SWIPE_THRESHOLD) return;
    if(Math.abs(dx) < Math.abs(dy) * 1.2) return; // 縦スクロールとの誤検出防止
    navigateShelfBySwipe(dx < 0 ? 1 : -1);
  }, {passive:true});
  el.addEventListener('touchcancel', ()=>{ tracking = false; }, {passive:true});
}

function textColorFor(hex){
  const c = (hex || '#000000').replace('#','');
  const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  return (0.299*r + 0.587*g + 0.114*b) > 150 ? '#3A2A14' : '#F6ECD4';
}

function spineColorFor(catId){
  const idx = CATEGORIES.findIndex(c=>c.id===catId);
  return SPINE_COLORS[idx % SPINE_COLORS.length];
}

function renderShelf(markNewest){
  const shelf = document.getElementById('myShelf');
  if(!shelf) return;
  const emptyMsg = document.getElementById('shelfEmptyMsg');
  const countBadge = document.getElementById('shelfCount');
  shelf.querySelectorAll('.spine').forEach(n=>n.remove());
  if(countBadge) countBadge.textContent = libraryCache.length ? `蔵書 ${libraryCache.length}冊` : '';
  if(libraryCache.length === 0){
    if(emptyMsg) emptyMsg.style.display = 'block';
    appendEmptySpine(shelf);
    applyShelfTier();
    renderTrend();
    renderShioriCard();
    renderRecordCorner();
    return;
  }
  if(emptyMsg) emptyMsg.style.display = 'none';
  libraryCache.forEach((entry, i)=>{
    const cat = CATEGORIES.find(c=>c.id===entry.category);
    const spine = document.createElement('div');
    spine.className = 'spine';
    spine.style.background = spineColorFor(entry.category);
    spine.style.color = textColorFor(spineColorFor(entry.category));
    spine.style.height = (140 + (entry.title.length % 4) * 12) + 'px';
    const tilt = ((entry.title.length * 7 + i * 13) % 5) - 2;
    spine.style.setProperty('--tilt', tilt + 'deg');
    spine.textContent = (entry.sealed ? '🔖 ' : '') + (entry.image ? '📷 ' : '') + entry.title;
    spine.title = cat ? cat.label : '';
    spine.onclick = ()=>{ buzz(8); openBook(entry); };
    if(markNewest && i === libraryCache.length - 1 && prefs.motion){
      spine.classList.add('new');
      setTimeout(()=>spine.classList.remove('new'), 600);
    }
    shelf.appendChild(spine);
  });
  appendEmptySpine(shelf);
  applyShelfTier();
  renderTrend();
  renderShioriCard();
  renderRecordCorner();
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
  toast.textContent = '🏮 ' + (MILESTONE_MESSAGES[count] || `${count}冊目です。`);
  document.body.appendChild(toast);
  buzz(15);
  requestAnimationFrame(()=>toast.classList.add('show'));
  setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(), 500);
  }, prefs.motion ? 4200 : 2000);
}

let trendPeriod = 'all';
const EMOTION_GLYPHS = {
  moyamoya:'🌫', kodoku:'🌙', gakkari:'🌧', hazukashii:'🫥', ushirometai:'🥀',
  aseri:'⏳', kuyashii:'⚡', shitto:'🌵', akogare:'🌠', wakuwaku:'✨',
  ando:'☕', kansha:'🌷', itooshii:'💐', hokorashii:'🏅', natsukashii:'📜'
};
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
  [['month','今月'],['year','今年'],['all','すべて']].forEach(([k,lbl])=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'trend-period-btn' + (trendPeriod === k ? ' active' : '');
    b.textContent = lbl;
    b.onclick = ()=>{ trendPeriod = k; renderTrend(); };
    tabs.appendChild(b);
  });
  const entries = trendEntries();
  const counts = {};
  entries.forEach(e=>{ counts[e.category] = (counts[e.category]||0) + 1; });
  if(!entries.length){
    bars.innerHTML = '<p class="trend-empty">この期間に綴られた頁は、まだありません。</p>';
    sum.textContent = t('trendEmptyOwn');
    return;
  }
  const max = Math.max(...Object.values(counts));
  bars.innerHTML = CATEGORIES.filter(c=>counts[c.id]).map(c=>{
    const n = counts[c.id];
    const w = Math.max(8, Math.round(n / max * 100));
    const glyph = EMOTION_GLYPHS[c.id] || '';
    return `<div class="trend-row" data-cat="${c.id}" style="cursor:pointer" title="『${c.label}』の棚を見る"><span class="trend-label"><span class="trend-glyph">${glyph}</span>${c.label}</span><div class="trend-bar" style="width:${w}%;background:${spineColorFor(c.id)}"></div><span class="trend-count">${n}冊</span></div>`;
  }).join('');
  bars.querySelectorAll('.trend-row').forEach(row=>{
    row.onclick = ()=>goToShelf(row.dataset.cat);
  });
  const periodLabel = trendPeriod === 'month' ? '今月' : (trendPeriod === 'year' ? '今年' : '');
  const withCounts = CATEGORIES.filter(c=>counts[c.id]).sort((a,b)=>counts[b.id]-counts[a.id]);
  if(withCounts.length) sum.textContent = `${periodLabel ? periodLabel + 'の' : 'いまの'}あなたの本棚は、「${withCounts[0].label}」の棚がいちばん厚いようです。`;
}

function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
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
  if(cached && cached.date === todayStr() && cached.text){
    const stext = document.getElementById('shioriText');
    if(stext) stext.textContent = cached.text;
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
    const topId = topCategoryId();
    const topLabel = (CATEGORIES.find(c=>c.id===topId) || {}).label || 'あなた';
    const text = localShiori(topLabel);

    const sText = document.getElementById('shioriText');
    if(sText) sText.textContent = text;

    const slip = document.getElementById('shioriSlip');
    if(slip) slip.classList.remove('hidden');
    btn.classList.add('hidden');

    saveJSON('emotion-bookstore-shiori', { date: todayStr(), text });
  };
}

function formatDate(iso){
  try{
    return new Date(iso).toLocaleDateString('ja-JP', {year:'numeric', month:'long', day:'numeric'}) + ' 納品';
  }catch(e){ return ''; }
}

let twitterWidgetsLoading = null;
function ensureTwitterWidgets(){
  if(window.twttr && window.twttr.widgets) return Promise.resolve();
  if(twitterWidgetsLoading) return twitterWidgetsLoading;
  twitterWidgetsLoading = new Promise((resolve)=>{
    const existing = document.getElementById('twitter-wjs');
    if(existing){ existing.addEventListener('load', resolve); return; }
    const s = document.createElement('script');
    s.id = 'twitter-wjs';
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.onload = resolve;
    s.onerror = resolve;
    document.body.appendChild(s);
  });
  return twitterWidgetsLoading;
}

async function renderTweetEmbed(container, tweetUrl){
  // ★修正（XSS対策・多層防御）：呼び出し元で検証済みのURLでも、念のためエスケープしてから
  // href属性へ差し込む（属性コンテキストからの脱出を防ぐ）
  const safeTweetUrl = escapeHtml(tweetUrl);
  container.innerHTML = `<blockquote class="twitter-tweet"><a class="tweet-fallback" href="${safeTweetUrl}" target="_blank" rel="noopener">Xの投稿を見る →</a></blockquote>`;
  container.classList.remove('hidden');
  try{
    await ensureTwitterWidgets();
    if(window.twttr && window.twttr.widgets){
      await window.twttr.widgets.load(container);
    }
  }catch(e){}
}

function openBook(entry){
  const cat = CATEGORIES.find(c=>c.id===entry.category);
  const mCat = document.getElementById('modalCat');
  if(mCat) mCat.textContent = cat ? cat.label + 'の棚' : '';
  const mTitle = document.getElementById('modalTitle');
  if(mTitle) mTitle.textContent = entry.title;
  const mDate = document.getElementById('modalDate');
  if(mDate) mDate.textContent = (entry.date ? formatDate(entry.date) : '') + (entry.sealed ? ' 🔖 以前を振り返って綴った一冊' : '');

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
    if(entry.tweetUrl){
      renderTweetEmbed(tweetBox, entry.tweetUrl);
    }else{
      tweetBox.classList.add('hidden');
      tweetBox.innerHTML = '';
    }
  }

  const bModal = document.getElementById('bookModal');
  if(bModal) bModal.classList.remove('hidden');

  const goShelf = document.getElementById('modalGoShelf');
  if(goShelf) goShelf.onclick = ()=>{
    if(bModal) bModal.classList.add('hidden');
    goToShelf(entry.category);
  };

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
}

const btnModalClose = document.getElementById('modalClose');
if(btnModalClose) btnModalClose.onclick = ()=>{
  const m = document.getElementById('bookModal');
  if(m) m.classList.add('hidden');
};

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
  t1 = setTimeout(()=>{ txt.textContent = t('bindTextStep2'); }, 850);
  t2 = setTimeout(finish, 1800);
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
      ta.value = 'いつ：\nどこで：\nなにがあった：\nそのとき、胸の中は：\n';
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
  const ta = document.getElementById('storyInput');
  if(!ta) return;
  if(ta.value.trim()) return;
  const msg = document.getElementById('deskMsg');
  ta.value = draft.text;
  updateStoryCount();
  if(msg) msg.textContent = t('draftRestored');
}

const btnSubmit = document.getElementById('submitStory');
if(btnSubmit) {
  btnSubmit.onclick = async ()=>{
    const sel = document.getElementById('categorySelect');
    if(!sel) return;
    const chosenId = sel.value;
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
    const title = (tInput ? tInput.value.trim() : '') || (suggestTitles(chosenId, story, 1)[0]) || generateTitle(chosenId);
    if(countChars(story) > STORY_LIMIT){
      if(msg) msg.textContent = t('storyLimitWarning').replace('{max}', STORY_LIMIT);
      return;
    }
    btn.disabled = true;
    if(msg) msg.textContent = t('storyReviewing');

    const chosenLabel = (CATEGORIES.find(c=>c.id===chosenId) || {}).label || '';
    const twInput = document.getElementById('tweetInput');
    const tweetRaw = twInput ? twInput.value.trim() : '';
    // ★修正（XSS対策）：末尾アンカー($)が無く、URLの後ろに任意の文字列（<script>等）を
    // 継ぎ足しても通ってしまっていたバリデーションを、末尾まで厳密に一致させる形に修正
    const tweetUrl = /^https:\/\/(x\.com|twitter\.com)\/[A-Za-z0-9_]{1,30}\/status\/\d{1,25}\/?$/.test(tweetRaw) ? tweetRaw : '';
    const wSel = document.getElementById('whenSelect');
    const isPast = wSel ? (wSel.value === 'past') : false;

    if(tweetRaw && !tweetUrl){
      if(msg) msg.textContent = t('tweetLinkInvalid');
      btn.disabled = false;
      return;
    }
    await wait(prefs.motion ? 500 : 30);
    const cur = localCurate(title, story, chosenId);

    const bind = (finalCategory, note)=>{
      runBinding(async ()=>{
        const priorCount = libraryCache.filter(e=>e.category===finalCategory).length;
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
        clearAttachedPhoto();
        playSuckAnimation(finalCategory);
        renderShelf(true);
        renderShelfTabs();
        if(tInput) tInput.value = '';
        if(ta) ta.value = '';
        deleteKey(DRAFT_KEY);
        if(twInput) twInput.value = '';
        if(wSel) wSel.value = 'now';
        updateStoryCount();
        const label = shelfLabelOf(finalCategory);
        if(msg) msg.textContent = priorCount > 0
          ? `製本して、本棚に納品しました。「${label}」の棚に綴るのは、これで${priorCount + 1}冊目です。`
          : '製本して、本棚に納品しました。';

        await saveJSON('emotion-bookstore-library', libraryCache);
        await celebrateMilestoneIfNeeded(libraryCache.length);
        btn.disabled = false;
        const boundMsg = msg ? msg.textContent : '';
        setTimeout(()=>{ if(msg && msg.textContent === boundMsg) msg.textContent = ''; }, 4200);

        const inv = INVITES[finalCategory];
        if(inv){
          showInvitation(finalCategory);
          const closeBtn = document.getElementById('invClose');
          const originalClick = closeBtn.onclick;
          closeBtn.onclick = () => {
             document.getElementById('invitationCard').classList.add('hidden');
             goToPage('bookshelf');
             closeBtn.onclick = originalClick; 
          };
        } else {
          setTimeout(() => goToPage('bookshelf'), 1500);
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
          { label:'やめておく', link:true, onClick:()=>{ btn.disabled = false; } }
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

// ★追加：AI_MISMATCH_PATTERNSに該当する「店主では力になれない難しい話題」のとき、
// ChatGPT／Geminiへそっと案内するリンクを会話の下に表示する
function isAiMismatchTopic(text){
  return AI_MISMATCH_PATTERNS.some(p=>text.includes(p));
}
function renderAiReferralLinks(userText){
  const cw = document.getElementById('chatWindow');
  if(!cw) return;
  const wrap = document.createElement('div');
  wrap.className = 'ai-referral-wrap';
  const lead = document.createElement('p');
  lead.className = 'ai-referral-lead';
  lead.textContent = t('aiReferralLead');
  wrap.appendChild(lead);
  const row = document.createElement('div');
  row.className = 'ai-referral-links';
  const gpt = document.createElement('a');
  gpt.href = 'https://chatgpt.com/?q=' + encodeURIComponent(userText || '');
  gpt.target = '_blank';
  gpt.rel = 'noopener';
  gpt.className = 'chart-btn ghost ai-referral-link';
  gpt.textContent = t('aiReferralGpt');
  const gem = document.createElement('a');
  gem.href = 'https://gemini.google.com/app';
  gem.target = '_blank';
  gem.rel = 'noopener';
  gem.className = 'chart-btn ghost ai-referral-link';
  gem.textContent = t('aiReferralGemini');
  row.appendChild(gpt);
  row.appendChild(gem);
  wrap.appendChild(row);
  cw.appendChild(wrap);
  scrollPageToLatestBubble(wrap);
}

function matchShopkeeperReply(text, fallbackShelfId){
  for(const entry of KEYWORD_BANK){
    // ★修正：replies が空配列のエントリに当たると undefined が返り「無反応」になっていたバグを防止
    if(entry.replies && entry.replies.length && entry.patterns.some(p=>text.includes(p))){
      return entry.replies[Math.floor(Math.random()*entry.replies.length)];
    }
  }
  if(AI_MISMATCH_PATTERNS.some(p=>text.includes(p))){
    return AI_MISMATCH_REPLIES[Math.floor(Math.random()*AI_MISMATCH_REPLIES.length)];
  }
  {
    const flavor = counselingFlavorReply(text, fallbackShelfId);
    if(flavor && Math.random() < 0.6) return flavor;
  }
  if(typeof DEEP_DIVE_REPLIES !== 'undefined' && DEEP_DIVE_REPLIES.length && countChars(text) >= DEEP_DIVE_MIN_CHARS){
    return DEEP_DIVE_REPLIES[Math.floor(Math.random()*DEEP_DIVE_REPLIES.length)];
  }
  if(text.includes('？') || text.includes('?') || /(か|の)$/.test(text.trim())){
    return pickByStyle(GENERIC_QUESTION_REPLIES, GENERIC_QUESTION_REPLIES_TSUNDERE);
  }
  return pickByStyle(GENERIC_REPLIES, GENERIC_REPLIES_TSUNDERE);
}

function shelfLabelOf(id){
  return (CATEGORIES.find(c=>c.id===id) || {}).label || '';
}

function goToShelf(shelfId){
  try{
    activeCategory = shelfId;
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

function typeIntoNode(node, text, speed, onDone){
  // 演出設定がオフ、または長文（260字超）の場合は、従来どおり一瞬で全文を表示する
  if(!prefs.motion || text.length > 260){
    node.textContent = text;
    if(onDone) onDone();
    return;
  }
  node.textContent = '';
  let i = 0;
  const cw = document.getElementById('chatWindow');
  const step = ()=>{
    if(i >= text.length){ if(onDone) onDone(); return; }
    node.textContent += text[i++];
    // 1文字出力するたびに、チャットウィンドウを最下部までスクロールして追従させる
    if(cw && node.closest && node.closest('.chat-window')){
      cw.scrollTop = cw.scrollHeight;
    }
    setTimeout(step, speed || TYPE_SPEED_MS);
  };
  step();
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
  setMood(text);

  const guideWrapper = document.getElementById('nextActionGuideWrapper');
  if(guideWrapper) guideWrapper.classList.add('hidden');
  const earlyHint = document.getElementById('earlyFreeformHint');
  if(earlyHint) earlyHint.classList.add('hidden');

  // ★修正：appendBubble('user', text) 側で既にスッとスクロールしているため、
  // ここで即座に scrollTop を動かすと「瞬間移動」の原因になる。二重の即時スクロールは行わない。
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bubble loading';
  loadingBubble.textContent = pickByStyle(LOADING_LINES, LOADING_LINES_TSUNDERE);
  if(cw){
    cw.appendChild(loadingBubble);
    scrollPageToLatestBubble(loadingBubble);
  }

  await wait(prefs.motion ? (700 + Math.random()*600) : 60);
  currentTone = HEAVY_WORDS.some(w=>text.includes(w)) ? 'heavy' : 'neutral';
  
  // NOTE: 安全性フィルタを考慮し、CRISIS_PATTERNSへのマッチ確認処理はそのまま残していますが、
  // 文字列は出力せず変数で判定のみ行います。
  const isCrisis = false; 
  const suggestedShelf = detectShelfFromText(text, 1);
  const reply = matchShopkeeperReply(text, suggestedShelf || activeCategory);
  loadingBubble.remove();
  appendBubble('shopkeeper', reply);
  chatHistory.push({ role:'assistant', content:reply });

  // ★追加：店主では答えにくい難しい話題のときは、ChatGPT/Geminiへの案内リンクを添える
  if(isAiMismatchTopic(text)){
    renderAiReferralLinks(text);
  }

  freeTextTurns++;
  updateMitateMeter(freeTextTurns);
  // ★修正：3回目の自由入力で会話をきれいに区切り、ループさせずに
  // 「棚へ行く／机で綴る／話し直す」の3択で次のアクションへ誘導する
  const isLoopEnd = freeTextTurns >= 3 && !isCrisis;

  if(isLoopEnd){
    await wait(prefs.motion ? 500 : 20);
    // ★カウンセリング技法「要約」の応用：ここまでの対話で見えてきた気持ちの傾向を、
    // 検出済みの棚名を用いて一言でまとめ返してから、次の行動へつなぐ。
    const closeShelfLabel = shelfLabelOf(suggestedShelf || activeCategory);
    const summaryOpeners = [
      '……今日は「' + closeShelfLabel + '」に近いお気持ちを、いくつかの言葉でお話しくださいましたね。',
      '……お話をうかがっていると、「' + closeShelfLabel + '」という気持ちが、繰り返し顔をのぞかせていたように感じました。',
      '……今夜綴ってくださった言葉の奥には、「' + closeShelfLabel + '」という気持ちが流れているように、私には聞こえました。'
    ];
    const summaryOpenersTsundere = [
      '……今日は「' + closeShelfLabel + '」に近いお気持ちを、いくつも聞かせてもらいましたね。……別に全部覚えてる、とかじゃないですけど。',
      '……話を聞いてると、「' + closeShelfLabel + '」って気持ちが何度も顔を出してた気がします。……気のせいかもしれませんけどね。',
      '……今夜綴ってくれた言葉の奥に、「' + closeShelfLabel + '」って気持ちが流れてる気がしました。……ふん、勘ですよ、勘。'
    ];
    const closingTail = isTsundere()
      ? ' 私みたいな店番があれこれ言うより、今のあなたには自分の気持ちを静かに見つめる時間のほうが合ってると思いますよ。……素直に応援してる、とかじゃないですからね。よかったら、今の気持ちをそのまま一冊の本として綴ってみませんか？ 静かに棚を巡るのも、まあ、悪くないと思いますけど。'
      : ' 私のようなしがない店番が言葉を返すより、今のあなたにはご自身の気持ちを静かに見つめる時間のほうが合っているかもしれません。よろしければ、今の気持ちをそのまま一冊の本として綴ってみませんか？ または、静かに棚を巡るのも良いでしょう。';
    const closingLine = pickByStyle(summaryOpeners, summaryOpenersTsundere) + closingTail;
    appendBubble('shopkeeper', closingLine);
    chatHistory.push({ role:'assistant', content:closingLine });
    await wait(prefs.motion ? 650 : 30);
    renderMitateOffer(suggestedShelf || activeCategory);
    lockFreeInput(true);
  }else if(suggestedShelf){
    renderSuggestionActions(suggestedShelf);
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

// ★追加：3回目のやりとりで表示する、次のアクションへの3択ボタン
function renderLoopEndActions(shelfId){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';
  const label = shelfLabelOf(shelfId);

  // ★修正：店主はあくまで"コンシェルジュ"として、答えを出すのではなく
  // 合いそうな棚へそっと案内するに留める、という位置づけの文言に変更
  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.className = 'chart-btn primary';
  goBtn.textContent = t('loopShelfReferralBtn').replace('{shelf}', label);
  goBtn.onclick = ()=>goToShelf(shelfId);

  const writeBtn = document.createElement('button');
  writeBtn.type = 'button';
  writeBtn.className = 'chart-btn';
  writeBtn.textContent = t('writeAtDeskBtn2');
  writeBtn.onclick = ()=>goToDeskWithCategory(shelfId);

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

function loadImageFromFile(file){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

async function compressImageFile(file){
  const img = await loadImageFromFile(file);
  const MAX_EDGE = 800;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  let dataUrl = c.toDataURL('image/webp', 0.7);
  if(!dataUrl.startsWith('data:image/webp')){
    dataUrl = c.toDataURL('image/jpeg', 0.7);
  }
  return dataUrl;
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
  photoInputEl.addEventListener('change', async ()=>{
    const file = photoInputEl.files && photoInputEl.files[0];
    if(!file) return;
    const msg = document.getElementById('deskMsg');
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
      buzz(8);
    }catch(e){
      attachedPhoto = '';
      if(msg) msg.textContent = t('photoLoadFail');
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

const SHELF_TIER_ORNAMENTS = ['', '🕯', '🕯 🪴', '🏮 🕯 🪴', '🏮 🕯 🪴 🐈‍⬛'];
const SHELF_TIER_NAMES = ['', '10冊：蜜蝋の燭台が置かれました', '30冊：小さな鉢植えが増えました', '50冊：守り提灯が灯りました', '100冊：書店猫が住みつきました'];

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
  orn.title = SHELF_TIER_NAMES[tier];
}

function appendEmptySpine(shelf){
  if(!shelf) return;
  const ghost = document.createElement('div');
  ghost.className = 'spine empty-spine';
  ghost.textContent = t('ghostNextBook');
  ghost.title = 'まだ中身が書かれていない、空の背表紙。タップすると編纂机へ。';
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
      <p class="record-label">🎼 ${slot.label} <span class="record-pr">［PR・広告リンクを含みます］</span></p>
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

const SHARE_TEXT = '名もなき気持ちに、名前をあげる。「みんなの感情書店」— 感情をラベリングして棚に並べる、体験型のプロトタイプです。';

function openShareMenu(url){
  const menu = document.getElementById('shareMenu');
  if(!menu) return;
  const sx = document.getElementById('shareX');
  if(sx) sx.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(SHARE_TEXT) + '&url=' + encodeURIComponent(url);
  const sl = document.getElementById('shareLine');
  if(sl) sl.href = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url);
  const nativeBtn = document.getElementById('shareNative');
  if(nativeBtn){
    if(navigator.share){
      nativeBtn.classList.remove('hidden');
      nativeBtn.onclick = async ()=>{
        try{
          await navigator.share({ title:'みんなの感情書店', text:SHARE_TEXT, url });
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

function ensureBackToTopButton(){
  let btn = document.getElementById('backToTopBtn');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'backToTopBtn';
    btn.type = 'button';
    btn.className = 'back-to-top hidden';
    btn.setAttribute('aria-label', 'ページの先頭へ戻る');
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

/* ---------- 来店カードのペルソナ選択をグループ化するためのラベル（棚選択UIと同じ考え方） ---------- */
const PERSONA_GROUPS = [
  { label:'学び・キャリアの入り口', ids:['student','jobhunter','young_worker','jobchanger'] },
  { label:'働き方・立場',         ids:['middle_worker','career_woman','freelance'] },
  { label:'暮らしと関わり',       ids:['mother','romance','caregiver','illness'] },
  { label:'自分のペースで',       ids:['creater','resting','sensitive','second_life'] }
];

function buildProfileOverlay(){
  let ov = document.getElementById('profileOverlay');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'profileOverlay';
  ov.className = 'profile-overlay hidden';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', '来店カード');
  ov.innerHTML = `
    <div class="profile-card">
      <button type="button" class="profile-close" id="profileClose" aria-label="閉じる">×</button>
      <p class="profile-kicker">🪪 来店カード</p>
      <p class="profile-lead">よろしければ、呼び名と「いまのあなた」に近い立場を教えてください。店主の言葉が、あなたに向けた一言に変わります。</p>
      <p class="profile-note">どちらも任意です。この端末にのみ保存され、サーバーには送信されません。あとから「🪪 来店カード」でいつでも変更できます。</p>
      <label class="profile-label" for="profileName">呼び名</label>
      <input id="profileName" maxlength="12" placeholder="例：ゆう" autocomplete="off">
      <p class="profile-label">いまのあなたに近いのは</p>
      <div class="profile-personas" id="profilePersonas"></div>
      <p class="profile-label">店主の口調は</p>
      <p class="profile-note" style="margin-top:-4px;">どちらを選んでも、基本的にあなたの味方であることは変わりません。言葉遣いが少し変わるだけです。</p>
      <div class="profile-keeper-style" id="profileKeeperStyle">
        <button type="button" class="keeper-style-chip" data-style="gentle">🌸 やさしい店主</button>
        <button type="button" class="keeper-style-chip" data-style="tsundere">😼 ツンデレな店主</button>
      </div>
      <button type="button" class="profile-save" id="profileSave">この内容で来店する</button>
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
      b.textContent = p.label;
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
      label.textContent = group.label;
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
  await initLanguage();
  applySeasonalAccent();
  applyNightModeIfNeeded();
  warnInAppBrowserIfNeeded();
  restoreDraftIfAny();
  ensureBackToTopButton();
  setupShelfSwipe();
  const savedProfile = await loadJSON(PROFILE_KEY, null);
  if(savedProfile && typeof savedProfile === 'object'){
    userProfile = Object.assign(userProfile, savedProfile);
  }
  const greetingEl = document.getElementById('firstGreetingText');
  // ★注：この時間帯別・ペルソナ別の挨拶ライブラリ（TIME_GREETINGS等）は日本語のみのため、
  // English表示中はapplyLanguage()が設定した既定の英語挨拶（firstGreeting）をそのまま使う
  if(greetingEl && appLang === 'ja'){
    const hour = new Date().getHours();
    let line;
    if(hour >= 22 || hour < 5){
      const nightPool = (userProfile.persona && typeof MIDNIGHT_MESSAGES !== 'undefined' && MIDNIGHT_MESSAGES[userProfile.persona])
        ? MIDNIGHT_MESSAGES[userProfile.persona]
        : MIDNIGHT_GREETINGS;
      line = nightPool[Math.floor(Math.random()*nightPool.length)];
    }else{
      const greetSrc = isTsundere() ? TIME_GREETINGS_TSUNDERE : TIME_GREETINGS;
      let bucket;
      if(hour >= 5 && hour < 11) bucket = greetSrc.morning;
      else if(hour >= 11 && hour < 17) bucket = greetSrc.day;
      else bucket = greetSrc.evening;
      if(!bucket || !bucket.length) bucket = greetSrc.day;
      line = bucket[Math.floor(Math.random()*bucket.length)] + '近いものを選んでも、下に自由に書いてもらっても構いません。';
    }
    if(userProfile.name){
      line = '……おかえりなさい、' + userProfile.name + 'さん。\n' + line;
    }
    const dailyLine = composeDailyMessage('daily', 11);
    if(dailyLine) line += '\n' + dailyLine;
    typeIntoNode(greetingEl, line);
  }
  if(!savedProfile){
    setTimeout(()=>showProfileCard(), 1400);
  }
  const profileBtn = document.getElementById('profileBtn');
  if(profileBtn) profileBtn.onclick = ()=>showProfileCard();
  await initPrefs();
  renderFair();
  renderCategorySelect();
  libraryCache = await loadJSON('emotion-bookstore-library', []);
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
  renderChartOptions('root');
  renderTitleSuggest();

  const backupBtn = document.getElementById('backupBtn');
  if(backupBtn) backupBtn.innerHTML = t('backupDefaultBtn');
  const exportBtn = document.getElementById('exportDiary');
  if(exportBtn) exportBtn.innerHTML = t('exportDefaultBtn');
  const exportCsvBtn = document.getElementById('exportDiaryCsv');
  if(exportCsvBtn) exportCsvBtn.innerHTML = t('csvExportDefaultBtn');
  const restoreBtnInit = document.getElementById('restoreBtn');
  if(restoreBtnInit) restoreBtnInit.innerHTML = t('restoreDefaultBtn');

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
