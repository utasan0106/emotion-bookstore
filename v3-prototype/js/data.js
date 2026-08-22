/* =============================================================================
 * V3 Isolated UX Prototype — prototype data
 * -----------------------------------------------------------------------------
 * ここにあるのは UX 確認用の prototype data のみ。
 * 実在するイベント・店舗・展覧会ではない。住所・店名・外部 URL は持たない。
 * ========================================================================== */
(function (global) {
  'use strict';

  var EMOTIONS = [
    {
      id: 'hajimu', label: '心が弾む', asset: 'emotion_hajimu.png',
      description: 'わくわくする、軽やか、嬉しいような気持ち'
    },
    {
      id: 'atatamaru', label: '心があたたまる', asset: 'emotion_atatamaru.png',
      description: 'ほっとする、やさしい、つながりを感じる'
    },
    {
      id: 'hikareru', label: '惹かれる', asset: 'emotion_hikareru.png',
      description: '惹きつけられる、気になる、もっと知りたい'
    },
    {
      id: 'shizumu', label: '沈む', asset: 'emotion_shizumu.png',
      description: '落ち込む、寂しい、気持ちが重い'
    },
    {
      id: 'zawatsuku', label: 'ざわつく', asset: 'emotion_zawatsuku.png',
      description: '落ち着かない、心配、なんとなく気になる'
    },
    {
      id: 'butsukaru', label: 'ぶつかる', asset: 'emotion_butsukaru.png',
      description: 'イライラする、反発する、納得できない'
    },
    {
      id: 'miwohiku', label: '身を引く', asset: 'emotion_miwohiku.png',
      description: 'こわい、避けたい、距離を置きたい'
    },
    {
      id: 'mada', label: 'まだ名前がない', asset: 'emotion_mada.png',
      description: 'どの言葉もしっくりこない、うまく言えない'
    }
  ];

  /* Understanding の言い換えは canonical に「ざわつく」だけが与えられている。
     他の語の説明文は仕様外なので作らない（undefined のときは表示しない）。 */
  var UNDERSTANDING = {
    zawatsuku: {
      body: '何かがまだ定まりきらず、心の中で動いている感じ。',
      note: '不安とも、期待とも、違和感とも重なることがあります。'
    }
  };

  /* typeKey は「少し異なる Experience type」を機械的に判定するための内部値。
     UI には表示しない。表示するのは canonical の type 文字列だけ。 */
  var EXPERIENCES = [
    {
      id: 'E01',
      title: '寄り道を20分する',
      type: 'Place / Small action',
      typeKey: 'place',
      duration: '20分',
      price: '無料',
      tags: ['movement', 'place', 'novelty', 'solitude'],
      reason: '何かを決める代わりに、いつもと違う景色をひとつ入れる。'
    },
    {
      id: 'E02',
      title: '図書館で写真集を一冊見る',
      type: 'Book / Place',
      typeKey: 'book',
      duration: '30分',
      price: '無料',
      tags: ['quiet', 'light', 'visual', 'solitude'],
      reason: '言葉を増やさず、視線だけを別の場所へ置けるものとして。'
    },
    {
      id: 'E03',
      title: '短編映画を一本見る',
      type: 'Film',
      typeKey: 'film',
      duration: '30分',
      price: '〜500円',
      tags: ['story', 'reflection', 'novelty'],
      reason: '自分の時間から、短いあいだ別の時間へ移る。'
    },
    {
      id: 'E04',
      title: 'エッセイを一冊選ぶ',
      type: 'Book',
      typeKey: 'book',
      duration: 'variable',
      price: '〜1,000円',
      tags: ['story', 'language', 'reflection'],
      reason: '答えより、誰かの見方に触れる入口として。'
    },
    {
      id: 'E05',
      title: '写真展を見る',
      type: 'Exhibition',
      typeKey: 'exhibition',
      duration: '60分',
      price: '〜2,000円',
      tags: ['light', 'visual', 'place', 'quiet'],
      reason: '視線を一度自分の外へ置く時間として。'
    },
    {
      id: 'E06',
      title: '小さなワークショップに参加する',
      type: 'Workshop',
      typeKey: 'workshop',
      duration: '90–120分',
      price: '〜5,000円',
      tags: ['craft', 'sensory', 'social', 'novelty'],
      reason: '考えるだけではなく、手を動かす方向へ少し広げる。'
    }
  ];

  /* M03/W03 Canonical visual fixture only.
     This is not Production selection logic or a verified real-world pool.
     PROTOTYPE_FIXTURE_NOT_VERIFIED / PRODUCTION_RIGHTS_UNREVIEWED */
  var DISCOVERY_FIXTURES = [
    {
      slot: 'cafe', recordId: 'E01', category: '場所・喫茶店', relation: 'ざわつくに近い体験',
      mobileTitle: 'リトルモア喫茶室',
      desktopTitle: ['清澄白河の喫茶店', '「リトルモア喫茶室」'],
      address: '東京都江東区三好1-7-14（清澄白河）',
      description: '木漏れ日がゆれる静かな店内で、ゆっくりと時間が流れる。',
      mobileAsset: 'm03_cafe_clean.png', desktopAsset: 'w03_cafe_main.png',
      gallery: [
        'w03_thumb_01.png', 'w03_thumb_02.png', 'w03_thumb_03.png',
        'w03_thumb_04.png', 'w03_thumb_05.png'
      ],
      mobileFacts: [
        { value: 'カフェ', label: 'Type' },
        { value: '30分', label: 'Duration' },
        { value: '¥900〜1,300', label: 'Price' },
        { value: '火曜定休', label: 'Close' }
      ],
      desktopFacts: [
        { label: '清澄白河駅から', value: '徒歩7分', note: '（東京都江東区）' },
        { label: '滞在の目安', value: '60〜90分', note: '' },
        { label: '予算の目安', value: '¥900〜1,300', note: '（税込）' },
        { label: '営業時間', value: '10:00〜18:00', note: '（火曜定休）' }
      ],
      mobileReason: ['何かを決める代わりに、', 'いつもと少し違う景色をひとつ入れる。'],
      desktopReason: [
        'ざわつく日は、少しだけ外の世界に出てみたくなる日。',
        'この場所は、街の気配を感じながらも、',
        '自分のペースを取り戻せる静けさがあります。',
        '窓からの光や、ゆっくりとした時間の流れが、',
        'あなたの心のざわめきをやさしくほどいてくれるはずです。'
      ]
    },
    {
      slot: 'book', recordId: 'E02', category: '本', relation: 'ざわつくに近い体験',
      mobileTitle: '「また、同じ夢を見ていた」',
      desktopTitle: ['「また、同じ夢を見ていた」'],
      creator: '住野よる（双葉社）',
      description: '静かな余韻が心に残る、優しい物語。',
      mobileAsset: 'w03_book_cover.png', desktopAsset: 'w03_book_cover.png',
      gallery: [], mobileFacts: [], desktopFacts: [], mobileReason: [], desktopReason: []
    },
    {
      slot: 'film', recordId: 'E03', category: '映画', relation: 'ざわつくに近い体験',
      mobileTitle: '「PERFECT DAYS」',
      desktopTitle: ['「PERFECT DAYS」'],
      creator: '監督：ヴィム・ヴェンダース',
      description: '日常の中の小さな瞬間が、静かに心を揺らす。',
      mobileAsset: 'w03_film_poster.png', desktopAsset: 'w03_film_poster.png',
      gallery: [], mobileFacts: [], desktopFacts: [], mobileReason: [], desktopReason: []
    }
  ];

  /* M05/W05 Phase 1 Trace vocabulary.
     Experience-side facets only: no diagnosis, classification, or inference. */
  var FACETS = [
    { id: 'atmosphere', label: '空気・雰囲気', sublabel: 'その場に流れていた気配' },
    { id: 'taste-scent', label: '味・香り', sublabel: '口や鼻に残ったもの' },
    { id: 'words-story', label: '言葉・物語', sublabel: '言葉や場面、物語の流れ' },
    { id: 'sound', label: '音', sublabel: '音楽、声、環境の音' },
    { id: 'light-color', label: '光・色', sublabel: '光の入り方や色の印象' },
    { id: 'people-gaze', label: '人・まなざし', sublabel: 'その場にいた人の存在' },
    { id: 'place-scenery', label: '場所・風景', sublabel: '街、建物、眺め' },
    { id: 'passage-of-time', label: '時間の流れ', sublabel: '速さ、間、過ごした時間' },
    { id: 'not-yet-words', label: 'まだ言葉にならないもの', sublabel: 'うまく言えないけれど残ったもの' }
  ];

  /* facet と experience tag の語彙的な対応表。
     心理的な意味づけ・診断ではなく、同じ記述語彙どうしの対応にとどめる。
     対応語を持たない facet は空配列（signal として使わない）。 */
  var FACET_TAGS = {
    '光':   ['light'],
    '音':   ['sensory'],
    '人':   ['social'],
    '風景': ['visual', 'place'],
    '言葉': ['language', 'story'],
    '手触り': ['craft', 'sensory'],
    '静けさ': ['quiet', 'solitude'],
    '違和感': [],
    '高揚': [],
    '距離': [],
    '余韻': []
  };

  var PLAN_OPTIONS = [
    { id: 'today',    label: '今日' },
    { id: 'weekend',  label: '今週末' },
    { id: 'datetime', label: '日時を決める' },
    { id: 'later',    label: 'あとで決める' }
  ];

  global.V3_DATA = {
    EMOTIONS: EMOTIONS,
    UNDERSTANDING: UNDERSTANDING,
    EXPERIENCES: EXPERIENCES,
    DISCOVERY_FIXTURES: DISCOVERY_FIXTURES,
    FACETS: FACETS,
    FACET_TAGS: FACET_TAGS,
    PLAN_OPTIONS: PLAN_OPTIONS,
    byId: function (id) {
      for (var i = 0; i < EXPERIENCES.length; i++) {
        if (EXPERIENCES[i].id === id) return EXPERIENCES[i];
      }
      return null;
    },
    emotionById: function (id) {
      for (var i = 0; i < EMOTIONS.length; i++) {
        if (EMOTIONS[i].id === id) return EMOTIONS[i];
      }
      return null;
    }
  };
})(window);
