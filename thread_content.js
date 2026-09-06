/* Cultural Thread — content (RC, non-indexed).
   Thread の本文・Object・Relation・資料は、すべてここに置く。thread.html は
   殻だけで、本文の copy を持たない（JavaScript が無いときは generic な noscript
   文だけが出る）。

   原則（KOENJI R2 HQ FREEZE）:
   - DISPLAY PRECISION <= EVIDENCE PRECISION。資料が支える以上に正確な
     時刻・場所・因果を描かない。
   - INTERPRETATION MUST NEVER INHERIT A FACT BADGE。事実（claim）・裏づけ
     （support）・編集部の読み（editorialReading）は別の項目に置き、描画でも
     別の DOM に分ける。
   - NO EVIDENCE = NO BRIDGE。relation / fact は必ず sourceIds を持つ。
   - 編集部の読みは scene の editorialReading にだけ置く。読みを relation として
     relations[] に合成しない。
   - 資料は HQ が supplied / verified したものだけ。新しい事実は足さない。

   supportMode: direct_statement / oral_testimony / editorial_synthesis
   verificationState: single_source / corroborated / source_difference / unresolved
   temporal.resolution: year / year_range / day（表示は resolution を超えない）
   spatial.resolution: street_segment / not_applicable（一点の resolution は RC で使わない） */
(function () {
  'use strict';

  var KOENJI = {
    threadId: 'koenji-dance-history',
    eyebrow: '高円寺',
    title: '踊りが街に根づくまで',
    documentTitle: '高円寺｜踊りが街に根づくまで｜みんなの感情書店',
    subjectLabel: '主題：高円寺で受け継がれてきた踊り',
    editor: '編集：みんなの感情書店 編集部',
    lens: 'このThreadでは「教わる／伝わる」に注目しました。',
    checkedAt: '2026-09-04',
    checkedLabel: '最終確認：2026-09-04',
    duration: '約15分',
    guidance: [
      '約15分。いつ止めてもかまいません。',
      'アカウント・位置情報・カメラは使いません。',
      '歩きながら見ないでください。立ち止まれる場所で。'
    ],

    /* 承認済み HOME asset を一度だけ使う（credits.html に権利記録あり）。 */
    image: {
      src: './assets/home-thread-koenji-awaodori.jpg',
      alt: '夜の高円寺の路上で踊る連。白い衣装の踊り手たち',
      width: 1524,
      height: 1016
    },

    nodes: [
      { id: 'place:koenji', type: 'Place', label: '高円寺' },
      { id: 'place:koenji-pal', type: 'Place', label: '高円寺パル商店街' },
      { id: 'place:tokushima', type: 'Place', label: '徳島' },
      { id: 'event:koenji-baka-odori', type: 'Event', label: '高円寺ばか踊り' },
      { id: 'event:koenji-awaodori', type: 'Event', label: '現在の踊り' },
      { id: 'org:koenji-organizers', type: 'Organization', label: '高円寺の主催者たち' },
      { id: 'org:tokushima-shimbun', type: 'Organization', label: '徳島新聞社' },
      { id: 'org:kiba-ren', type: 'Organization', label: '木場連' },
      { id: 'person:kamogawa-choji', type: 'Person', label: '鴨川長二', note: '当時の木場連の連長' }
    ],

    /* Relation を持たない現在の事実（S0）。 */
    facts: [
      {
        id: 'fact:present-groups',
        claim: '現在、この催しには40を超える連が活動している。多くの連は、一年を通して練習を続けている。',
        supportMode: ['direct_statement'],
        verificationState: 'single_source',
        sourceIds: ['src:official-join'],
        temporal: { resolution: 'day', display: '2026-09-04 時点', variants: [] }
      }
    ],

    relations: [
      {
        id: 'rel:originated-1957',
        from: 'event:koenji-baka-odori',
        to: 'place:koenji-pal',
        relationType: 'originated_in',
        displayVerb: 'はじまる',
        claim: '1957年、高円寺ばか踊りが、高円寺パル商店街の通りで始まった。',
        supportMode: ['direct_statement'],
        verificationState: 'single_source',
        sourceIds: ['src:official-history'],
        spatial: { resolution: 'street_segment', display: '範囲：商店街の通り（一点ではありません）' },
        temporal: { resolution: 'year', display: '1957', variants: [] }
      },
      {
        id: 'rel:connected-1961',
        from: 'org:koenji-organizers',
        to: 'org:kiba-ren',
        relationType: 'connected_with',
        displayVerb: 'つながる',
        via: 'org:tokushima-shimbun',
        claim: '1961年、高円寺の主催者たちは、徳島新聞社を介して木場連とつながった。',
        supportMode: ['direct_statement'],
        verificationState: 'corroborated',
        sourceIds: ['src:official-history', 'src:suginami-gaku'],
        spatial: { resolution: 'not_applicable' },
        temporal: { resolution: 'year', display: '1961', variants: [] }
      },
      {
        /* 向きは learner → source。木場連 → 高円寺 を learned_from にしない。 */
        id: 'rel:learned-1961-62',
        from: 'org:koenji-organizers',
        to: 'org:kiba-ren',
        relationType: 'learned_from',
        displayVerb: '教わる',
        people: ['person:kamogawa-choji'],
        claim: '高円寺の主催者たちは、木場連（当時の連長・鴨川長二）から、阿波おどりを教わった。',
        supportMode: ['direct_statement'],
        verificationState: 'source_difference',
        sourceIds: ['src:official-history', 'src:suginami-gaku'],
        spatial: { resolution: 'not_applicable' },
        temporal: {
          resolution: 'year_range',
          display: '1961–62',
          variants: [
            { sourceId: 'src:official-history', display: '1961', reading: '1961年の出会いと手ほどきを、ひと続きの流れとして記している。' },
            { sourceId: 'src:suginami-gaku', display: '1961／1962', reading: '1961年の出会いと、1962年の指導を分けて記している。' }
          ]
        },
        differenceNote: 'どちらが正しいかは、このThreadでは決めていません。資料がそう分かれていることまでが、いま分かっていることです。'
      },
      {
        /* 名称変更は事実。教わったことの結果だとは言わない（読みは scene 側）。 */
        id: 'rel:renamed-1963',
        from: 'event:koenji-baka-odori',
        to: 'event:koenji-awaodori',
        relationType: 'renamed_to',
        displayVerb: '名を変える',
        claim: '1963年、「高円寺ばか踊り」の正式名称が、現在使われている名称へ変わった。',
        supportMode: ['direct_statement'],
        verificationState: 'single_source',
        sourceIds: ['src:official-history'],
        spatial: { resolution: 'not_applicable' },
        temporal: { resolution: 'year', display: '1963', variants: [] }
      }
    ],

    /* HQ supplied / verified の資料だけ。URL は全部 https。 */
    sources: [
      { id: 'src:official-history', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体 公式サイト（歴史資料）', url: 'https://koenji-awaodori.com/about/his01.html' },
      { id: 'src:suginami-gaku', kind: 'local_archive', kindLabel: '地域の文化アーカイブ', name: 'すぎなみ学倶楽部（高円寺の踊り）', url: 'https://suginamigaku.org/2022/11/koenji-awaodori.html' },
      { id: 'src:official-about', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体 公式サイト（団体について）', url: 'https://www.koenji-awaodori.com/about/about01.html' },
      { id: 'src:official-join', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体 公式サイト（参加案内）', url: 'https://koenji-awaodori.com/category1/join.html' },
      { id: 'src:official-archive', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体 公式サイト（アーカイブ）', url: 'https://www.koenji-awaodori.com/about/about05.html' },
      { id: 'src:official-anniversary', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体 公式サイト（周年アーカイブ）', url: 'https://www.koenji-awaodori.com/about/his04.html' },
      { id: 'src:official-plus', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体 公式サイト（plus+）', url: 'https://koenji-awaodori.com/stage/stage04.html' },
      { id: 'src:koenji-pal-about', kind: 'official_place', kindLabel: '公式（商店街）', name: '高円寺パル商店街 公式サイト（商店街について）', url: 'https://www.koenji-pal.jp/about' },
      { id: 'src:koenji-pal-access', kind: 'official_place', kindLabel: '公式（商店街）', name: '高円寺パル商店街 公式サイト（アクセス）', url: 'https://www.koenji-pal.jp/access' },
      { id: 'src:official-home', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体 公式サイト', url: 'https://koenji-awaodori.com/' },
      /* FOUNDER PREVIEW FIX UNIT E: 主催団体の公式映像（Works で承認済みの同じ URL）。埋め込まず、user click でだけ開く。 */
      { id: 'src:official-video', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体の公式映像', url: 'https://www.youtube.com/watch?v=dt33RGSRuo0' }
    ],

    /* S0–S5。S2 の五拍（BEFORE → ENCOUNTER → QUESTION → EVIDENCE → REVEAL）
       は、この高円寺の learned_from のための構成で、あらゆる Relation の
       共通 template ではない。renderer は beats[] を数に依らず描く。 */
    scenes: [
      {
        id: 's0',
        title: 'いま',
        figure: true,
        lead: '高円寺の通りで、連が踊っている。',
        factIds: ['fact:present-groups'],
        close: 'この状態が、どう始まり、誰から渡ってきたのか。ここから辿る。'
      },
      {
        id: 's1',
        title: '1957 ／ はじまる',
        relationIds: ['rel:originated-1957'],
        close: '起点は、一点ではなく通りです。'
      },
      {
        id: 's2',
        title: '1957のあと',
        beats: [
          {
            id: 'before',
            kind: 'pair',
            label: 'まえ',
            lead: 'つながる前の、二つ。',
            items: [
              { name: '高円寺', text: '1957年に始まったばかりの、高円寺ばか踊り。' },
              { name: '徳島', text: '阿波おどりの本場。' }
            ]
          },
          {
            id: 'encounter',
            kind: 'names',
            label: '出会い',
            lead: 'ここに、三つの名前が入る。',
            items: [
              { name: '徳島新聞社', text: '徳島の新聞社。' },
              { name: '木場連', text: '徳島県人会で結成された連。' },
              { name: '鴨川長二', text: '当時の木場連の連長。' }
            ]
          },
          {
            id: 'question',
            kind: 'question',
            label: '問い',
            line: 'この二つの間に、何が起きた？'
          },
          {
            id: 'evidence',
            kind: 'evidence',
            label: '資料が言っていること',
            items: [
              '高円寺の側は、阿波おどりの手ほどきを求めた。',
              '徳島新聞社を介して、木場連とつながった。',
              '当時の木場連の連長・鴨川長二が、手ほどきをした。'
            ],
            sourceIds: ['src:official-history', 'src:suginami-gaku']
          },
          {
            id: 'reveal',
            kind: 'reveal',
            label: '関係',
            relationIds: ['rel:connected-1961', 'rel:learned-1961-62']
          }
        ]
      },
      {
        id: 's3',
        title: '1963 ／ 名を変える',
        relationIds: ['rel:renamed-1963'],
        close: 'いまの名称が最初からあったのではなく、1963年に正式に変わったことが見える。',
        editorialReading: {
          text: '受け取ったものが、街の中で別の形になっていく。——これは編集部の読みです。名称が変わった理由そのものは、このThreadでは扱っていません。',
          refs: ['rel:learned-1961-62', 'rel:renamed-1963']
        }
      },
      {
        id: 's4',
        title: 'いま、もう一度',
        editorialReading: {
          text: '同じ高円寺の踊りが、人から人へ渡り、この街で名前を変えながら続いてきたものとして見える。——これは編集部の読みです。',
          refs: ['fact:present-groups', 'rel:learned-1961-62', 'rel:renamed-1963']
        }
      },
      {
        id: 's5',
        title: '現実へ',
        kind: 'reality'
      }
    ],

    /* 現在へ返す。期限の過ぎたものを「これから」として見せない。 */
    presentReturn: {
      lead: 'いま辿った文化の続きを、現実で触れる。',
      statusTitle: 'いまの状況',
      notes: [
        {
          id: 'note:2026-main-ended',
          text: '2026年の本祭（8月29日・30日）は、終了しています。',
          status: 'ended',
          temporal: { resolution: 'day', display: '2026年8月29日・30日', variants: [] },
          sourceIds: ['src:official-home'],
          checkedAt: '2026-09-04'
        },
        {
          id: 'note:plus-suspended',
          text: '定期公演 plus+ は休止中で、申込は締め切られています。',
          status: 'suspended',
          sourceIds: ['src:official-plus'],
          checkedAt: '2026-09-04'
        }
      ]
    },

    /* Thread との Relation を説明できる行き先だけ。順位や広告の順ではない。 */
    realityDestinations: [
      {
        id: 'dest:pal-street',
        label: '1957の起点を歩く（高円寺パル商店街）',
        url: 'https://www.koenji-pal.jp/about',
        why: '1957年に踊りが始まった、商店街の通り。',
        note: '起点は通りとして辿ります。一点には特定していません。歩くことは必須ではありません。',
        relationIds: ['rel:originated-1957'],
        sourceIds: ['src:koenji-pal-about', 'src:koenji-pal-access']
      },
      {
        id: 'dest:join',
        label: '現在の連を知る／参加・体験を相談する',
        url: 'https://koenji-awaodori.com/category1/join.html',
        why: 'このThreadで1961–62年の「教わる」を辿ったあと、現在活動する連を知る入口です。',
        note: '参加の条件は連ごとに異なります。それぞれの案内で確かめてください。',
        relationIds: ['rel:learned-1961-62'],
        factIds: ['fact:present-groups'],
        sourceIds: ['src:official-join']
      },
      {
        id: 'dest:official',
        label: '現在の公式情報を見る',
        url: 'https://koenji-awaodori.com/',
        why: '1963年からの名称で続く、いまの公式情報。',
        note: '',
        relationIds: ['rel:renamed-1963'],
        sourceIds: ['src:official-home']
      },
      /* FOUNDER PREVIEW FIX UNIT E: 最後の 4 つ目。ここまで辿った踊りを、主催団体の公式映像で見る。
         埋め込み・自動再生・サムネイル・事前読込は使わない。user click でだけ開く。 */
      {
        id: 'dest:official-video',
        label: '最後に、現在の公式映像を見る',
        url: 'https://www.youtube.com/watch?v=dt33RGSRuo0',
        why: 'ここまで辿った踊りが、現在の街の中でどう見えるかを、主催団体の公式映像で確かめます。',
        note: '2025年の催しを伝える、主催団体の公式映像です。',
        sourceIds: ['src:official-video']
      }
    ],

    ending: {
      line: 'このスレッドは、ここまでです。',
      exitLabel: '入口へ戻る',
      exitHref: './index.html'
    }
  };

  /* ---------------------------------------------------------------------
     WORKS ENTRY + CROSS-MEDIA PROOF — 『森崎書店の日々』（本 ／ 映画 ／ 神保町）。
     Book-first（morisaki-book）と Film-first（morisaki-film）は 1 つの truth graph
     を共有する。nodes / facts / relations / sources は同一参照（配列を複製しない）。
     違うのは entry framing・W0 の pair 順・W1 の title と close だけ。
     modes（remote / onsite）・image・cue（20秒）は持たない。KOENJI object には触れない。

     Precision guard: 実在の店を「森崎書店」と同定しない。ロケセットを現存店と
     しない。正確な地点・座標を出さない。filmed_in は area より細かくしない。
     adapted_as は Book → Film の 1 本だけ（adapted_from を作らない）。
     現行 2025 年新装版は adaptation source node にしない（works.html の
     current reading / action metadata）。screened_at は W5 destination の
     secondary context にだけ使い、W0–W4 には出さない。
     relation に temporal を付けない（fake temporal を作らない）。 */

  var MORISAKI_NODES = [
    { id: 'work:morisaki-book', type: 'Book', label: '森崎書店の日々' },
    { id: 'work:morisaki-film', type: 'Film', label: '森崎書店の日々' },
    { id: 'place:jinbocho', type: 'Place', label: '神保町' },
    { id: 'org:jinbocho-theater', type: 'Organization', label: '神保町シアター' }
  ];

  /* HQ supplied / verified の資料だけ。URL を発明しない。kind は表示メタデータ。 */
  var MORISAKI_SOURCES = [
    {
      id: 'src:morisaki-ndl',
      kind: 'library_catalog',
      kindLabel: '国立国会図書館',
      name: '国立国会図書館サーチ（森崎書店の日々）',
      url: 'https://ndlsearch.ndl.go.jp/books/R100000002-I034360568'
    },
    {
      id: 'src:morisaki-jfdb',
      kind: 'film_database',
      kindLabel: '映画情報',
      name: 'JFDB（森崎書店の日々）',
      url: 'https://jfdb.jp/title/2240'
    },
    {
      id: 'src:morisaki-theater-archive',
      kind: 'cultural_archive',
      kindLabel: '文化施設アーカイブ',
      name: '神保町シアター（街と映画 Bプログラム）',
      url: 'https://www.shogakukan.co.jp/jinbocho-theater/archive/program/towns-b_list.html'
    }
  ];

  var MORISAKI_FACTS = [
    {
      id: 'fact:morisaki-film-identity',
      claim: '映画『森崎書店の日々』は2010年10月23日公開、上映時間109分。監督・脚本は日向朝子。',
      supportMode: ['direct_statement'],
      verificationState: 'single_source',
      sourceIds: ['src:morisaki-jfdb'],
      temporal: { resolution: 'day', display: '2010-10-23', variants: [] }
    }
  ];

  var MORISAKI_RELATIONS = [
    {
      id: 'rel:morisaki-adapted',
      from: 'work:morisaki-book',
      to: 'work:morisaki-film',
      relationType: 'adapted_as',
      displayVerb: '映画になる',
      claim: '映画『森崎書店の日々』は、八木沢里志の小説をもとにつくられた作品です。',
      supportMode: ['direct_statement'],
      verificationState: 'single_source',
      sourceIds: ['src:morisaki-jfdb'],
      spatial: { resolution: 'not_applicable' }
    },
    {
      id: 'rel:morisaki-set-in',
      from: 'work:morisaki-book',
      to: 'place:jinbocho',
      relationType: 'set_in',
      displayVerb: '舞台になる',
      claim: '『森崎書店の日々』は、神保町の古書店を物語の中心の場所にしています。',
      supportMode: ['direct_statement'],
      verificationState: 'single_source',
      sourceIds: ['src:morisaki-ndl'],
      spatial: { resolution: 'area', display: '範囲：神保町の街（一点ではありません）' }
    },
    {
      id: 'rel:morisaki-depicts',
      from: 'work:morisaki-film',
      to: 'place:jinbocho',
      relationType: 'depicts',
      displayVerb: '描かれる',
      claim: '映画は、神田神保町の古書店街をめぐる作品として紹介されています。',
      supportMode: ['direct_statement'],
      verificationState: 'single_source',
      sourceIds: ['src:morisaki-jfdb'],
      spatial: { resolution: 'area', display: '範囲：神保町の街（一点ではありません）' }
    },
    {
      id: 'rel:morisaki-filmed-in',
      from: 'work:morisaki-film',
      to: 'place:jinbocho',
      relationType: 'filmed_in',
      displayVerb: '撮影される',
      claim: '映画は、神保町の街中に「森崎書店」のロケセットを組んで撮影されました。',
      supportMode: ['direct_statement'],
      verificationState: 'single_source',
      sourceIds: ['src:morisaki-theater-archive'],
      spatial: { resolution: 'area', display: '範囲：神保町の街なか（一点ではありません）' }
    },
    {
      /* secondary context only。W0–W4 では使わない（W5 destination の理由にだけ）。 */
      id: 'rel:morisaki-screened-at',
      from: 'work:morisaki-film',
      to: 'org:jinbocho-theater',
      relationType: 'screened_at',
      displayVerb: '上映される',
      claim: '神保町シアターは『森崎書店の日々』を上映プログラムで扱ってきました。',
      supportMode: ['direct_statement'],
      verificationState: 'single_source',
      sourceIds: ['src:morisaki-theater-archive'],
      spatial: { resolution: 'not_applicable' }
    }
  ];

  var MORISAKI_GUIDANCE = [
    '本と映画を、ひとつの関係として辿ります。',
    '資料は、必要なところだけ開けます。',
    '位置情報・カメラは使いません。'
  ];

  /* W0 / W4 の pair。W4 は W0 と同じ pair を（既存 primitive のまま）繰り返す。 */
  var MORISAKI_PAIR_BOOK = { name: '本', text: '八木沢里志『森崎書店の日々』' };
  var MORISAKI_PAIR_FILM = { name: '映画', text: '日向朝子監督『森崎書店の日々』（2010）' };

  /* filmed_in の必須注記（W3）。W5 でそのまま再掲する。 */
  var MORISAKI_FILMED_IN_NOTES = [
    '撮影のために街中に組まれたセットです。いま神保町にある店ではありません。',
    '範囲：神保町の街なか（一点ではありません）'
  ];

  /* W0–W5。entry は 'book' / 'film'。違いは W0 の pair 順と W1 の title・close だけで、
     事実・関係・資料・並び順（W2 以降）は同じ。 */
  function morisakiScenes(entry) {
    var bookFirst = entry === 'book';
    return [
      {
        id: 'w0',
        title: '二つの『森崎書店の日々』',
        lead: '同じ名前の、本と映画。まずは二つの作品として置きます。',
        beats: [
          {
            id: 'w0-pair',
            kind: 'pair',
            label: '',
            items: bookFirst ? [MORISAKI_PAIR_BOOK, MORISAKI_PAIR_FILM] : [MORISAKI_PAIR_FILM, MORISAKI_PAIR_BOOK]
          }
        ],
        close: 'この二つは、どうつながっているのか。'
      },
      {
        id: 'w1',
        title: bookFirst ? '原作と映画' : 'この映画には、原作がある',
        relationIds: ['rel:morisaki-adapted'],
        close: bookFirst ? 'ここまでは、原作と映画の関係です。' : '同じひとつの関係を、逆から読んでいます。矢印は 本 → 映画 のままです。'
      },
      {
        id: 'w2',
        title: '残ったもの、変わったもの',
        lead: '媒体が変わっても残るものと、映画になることで変わるものがあります。',
        beats: [
          {
            id: 'w2-pair',
            kind: 'pair',
            label: '',
            items: [
              { name: '残ったもの', text: '貴子、叔父のサトル、神保町の古書店をめぐる物語。' },
              { name: '変わったもの', text: '文字で読む作品から、109分の映画へ。監督・脚本・俳優・撮影など、多くの手で形になる作品へ。' }
            ]
          }
        ],
        close: 'けれど、変わったのは媒体だけではありません。'
      },
      {
        /* Figure–Ground Flip（中心）。舞台になる → 描かれる → 撮影される。 */
        id: 'w3',
        title: '街が入る',
        lead: '神保町は、本と映画で同じ役割をしているわけではありません。',
        relationIds: ['rel:morisaki-set-in', 'rel:morisaki-depicts', 'rel:morisaki-filmed-in'],
        beats: [
          { id: 'w3-notes', kind: 'evidence', label: '', items: MORISAKI_FILMED_IN_NOTES }
        ],
        close: '街は、物語の背景であることをやめて、この映画がどう作られたかの一部になる。'
      },
      {
        /* Retroactive Re-reading。W0 の pair をそのまま繰り返す（新しい beat kind は無い）。 */
        id: 'w4',
        title: 'もう一度、二つを見る',
        lead: '本 →（原作になる）→ 映画 →（神保町で撮る）→ 神保町',
        beats: [
          {
            id: 'w4-pair',
            kind: 'pair',
            label: '',
            items: [MORISAKI_PAIR_BOOK, MORISAKI_PAIR_FILM]
          }
        ],
        close: 'ここまでの関係を、資料に沿って並べ直したものです。',
        editorialReading: {
          text: '同じ物語が媒体を移るとき、街は「舞台」から「制作の場所」にもなる。',
          refs: ['rel:morisaki-adapted', 'rel:morisaki-set-in', 'rel:morisaki-filmed-in']
        }
      },
      {
        /* 現実へ。filmed_in の注記を再掲し、持ち帰る問い（M10）を置き、必須の開示を
           close として destinations の直前に置く → destinations → 有限の終わり。 */
        id: 'w5',
        title: '現実へ',
        kind: 'reality',
        lead: 'ここから先は、いまの神保町です。',
        beats: [
          { id: 'w5-notes', kind: 'evidence', label: '', items: MORISAKI_FILMED_IN_NOTES },
          { id: 'w5-transfer-1', kind: 'question', label: '', line: '別の媒体になったとき、何が残って、何が変わったんだろう？' },
          { id: 'w5-transfer-2', kind: 'question', label: '', line: 'この画面は、現実のどこにつながっているんだろう？' }
        ],
        close: '森崎書店は作中の書店です。ここに挙げた店は、いずれも神保町に実在する別の店です。'
      }
    ];
  }

  /* Thread との Relation を説明できる行き先だけ。矢口書店は編集部が選んだ
     現在の一例で、作品との factual relation ではない（why / relationIds を持たない）。 */
  var MORISAKI_DESTINATIONS = [
    {
      id: 'dest:jimbou-map',
      label: '古書店街を歩く',
      url: 'https://jimbou.info/map/',
      why: '本が舞台とし、映画が描き、撮影した神保町の古書店街そのものへ戻る入口です。',
      relationIds: ['rel:morisaki-set-in', 'rel:morisaki-depicts', 'rel:morisaki-filmed-in']
    },
    {
      id: 'dest:jinbocho-theater',
      label: '神保町シアターの現在を見る',
      url: 'https://www.shogakukan.co.jp/jinbocho-theater/features/',
      why: 'この映画を上映してきた神保町の映画館の、現在のプログラムを見る入口です。',
      relationIds: ['rel:morisaki-screened-at']
    },
    {
      id: 'dest:yaguchi-shoten',
      label: '矢口書店を見る',
      url: 'https://yaguchishoten.jp/',
      editorialExample: true,
      note: '編集部が選んだ、いま神保町にある専門古書店の一例です。作品との関係が確認されている店ではありません。'
    }
  ];

  var MORISAKI_ENDING = {
    line: 'このスレッドは、ここまでです。',
    exitLabel: '作品の入口へ戻る',
    exitHref: './works.html'
  };

  var MORISAKI_BOOK = {
    threadId: 'morisaki-book',
    eyebrow: '本から',
    title: '二つの『森崎書店の日々』',
    documentTitle: '本から｜森崎書店の日々｜みんなの感情書店',
    subjectLabel: '主題：森崎書店の日々',
    editor: '編集：みんなの感情書店 編集部',
    lens: '本と映画、その先の神保町を辿ります。',
    checkedAt: '2026-09-05',
    checkedLabel: '最終確認：2026-09-05',
    guidance: MORISAKI_GUIDANCE,
    nodes: MORISAKI_NODES,
    facts: MORISAKI_FACTS,
    relations: MORISAKI_RELATIONS,
    sources: MORISAKI_SOURCES,
    scenes: morisakiScenes('book'),
    realityDestinations: MORISAKI_DESTINATIONS,
    ending: MORISAKI_ENDING
  };

  /* Film-first。同一の graph を映画側から読む。 */
  var MORISAKI_FILM = {
    threadId: 'morisaki-film',
    eyebrow: '映画から',
    title: '二つの『森崎書店の日々』',
    documentTitle: '映画から｜森崎書店の日々｜みんなの感情書店',
    subjectLabel: '主題：森崎書店の日々',
    editor: '編集：みんなの感情書店 編集部',
    lens: '本と映画、その先の神保町を辿ります。',
    checkedAt: '2026-09-05',
    checkedLabel: '最終確認：2026-09-05',
    guidance: MORISAKI_GUIDANCE,
    nodes: MORISAKI_NODES,
    facts: MORISAKI_FACTS,
    relations: MORISAKI_RELATIONS,
    sources: MORISAKI_SOURCES,
    scenes: morisakiScenes('film'),
    realityDestinations: MORISAKI_DESTINATIONS,
    ending: MORISAKI_ENDING
  };

  window.V3_THREAD_CONTENT = {
    schema: 'v3-thread/rc1',
    threads: [KOENJI, MORISAKI_BOOK, MORISAKI_FILM]
  };
})();
