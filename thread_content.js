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
    threadId: 'koenji-awaodori',
    eyebrow: '高円寺',
    title: '踊りが街に根づくまで',
    documentTitle: '高円寺｜踊りが街に根づくまで｜みんなの感情書店',
    subjectLabel: '主題：高円寺阿波おどり',
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

    /* 読む場所。位置情報は使わず、保存もしない。変わるのは合図の文だけで、
       事実・関係・資料・検証状態・並び順は変わらない。 */
    modes: {
      legend: 'いま、どこで読んでいますか',
      note: 'この選択で変わるのは、見るときの合図の文だけです。事実・関係・資料は変わりません。',
      options: [
        { id: 'remote', label: 'いまは、高円寺にいない', isDefault: true },
        { id: 'onsite', label: 'いま、高円寺にいる' }
      ]
    },

    /* 承認済み HOME asset を一度だけ使う（credits.html に権利記録あり）。 */
    image: {
      src: './assets/home-thread-koenji-awaodori.jpg',
      alt: '夜の高円寺の路上で踊る阿波おどりの連。白い衣装の踊り手たち',
      width: 1524,
      height: 1016
    },

    nodes: [
      { id: 'place:koenji', type: 'Place', label: '高円寺' },
      { id: 'place:koenji-pal', type: 'Place', label: '高円寺パル商店街' },
      { id: 'place:tokushima', type: 'Place', label: '徳島' },
      { id: 'event:koenji-baka-odori', type: 'Event', label: '高円寺ばか踊り' },
      { id: 'event:koenji-awaodori', type: 'Event', label: '高円寺阿波おどり' },
      { id: 'org:koenji-organizers', type: 'Organization', label: '高円寺の主催者たち' },
      { id: 'org:tokushima-shimbun', type: 'Organization', label: '徳島新聞社' },
      { id: 'org:kiba-ren', type: 'Organization', label: '木場連' },
      { id: 'person:kamogawa-choji', type: 'Person', label: '鴨川長二', note: '当時の木場連の連長' }
    ],

    /* Relation を持たない現在の事実（S0）。 */
    facts: [
      {
        id: 'fact:present-groups',
        claim: '高円寺阿波おどりには、40を超える連が活動している。多くの連は、一年を通して練習を続けている。',
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
        claim: '1963年、正式名称が「高円寺ばか踊り」から「高円寺阿波おどり」に変わった。',
        supportMode: ['direct_statement'],
        verificationState: 'single_source',
        sourceIds: ['src:official-history'],
        spatial: { resolution: 'not_applicable' },
        temporal: { resolution: 'year', display: '1963', variants: [] }
      }
    ],

    /* HQ supplied / verified の資料だけ。URL は全部 https。 */
    sources: [
      { id: 'src:official-history', kind: 'official', kindLabel: '公式（主催団体）', name: '東京高円寺阿波おどり 公式サイト（歴史）', url: 'https://koenji-awaodori.com/about/his01.html' },
      { id: 'src:suginami-gaku', kind: 'local_archive', kindLabel: '地域の文化アーカイブ', name: 'すぎなみ学倶楽部（高円寺阿波おどり）', url: 'https://suginamigaku.org/2022/11/koenji-awaodori.html' },
      { id: 'src:official-about', kind: 'official', kindLabel: '公式（主催団体）', name: '東京高円寺阿波おどり 公式サイト（団体について）', url: 'https://www.koenji-awaodori.com/about/about01.html' },
      { id: 'src:official-join', kind: 'official', kindLabel: '公式（主催団体）', name: '東京高円寺阿波おどり 公式サイト（参加案内）', url: 'https://koenji-awaodori.com/category1/join.html' },
      { id: 'src:official-archive', kind: 'official', kindLabel: '公式（主催団体）', name: '東京高円寺阿波おどり 公式サイト（アーカイブ）', url: 'https://www.koenji-awaodori.com/about/about05.html' },
      { id: 'src:official-anniversary', kind: 'official', kindLabel: '公式（主催団体）', name: '東京高円寺阿波おどり 公式サイト（周年アーカイブ）', url: 'https://www.koenji-awaodori.com/about/his04.html' },
      { id: 'src:official-plus', kind: 'official', kindLabel: '公式（主催団体）', name: '東京高円寺阿波おどり 公式サイト（plus+）', url: 'https://koenji-awaodori.com/stage/stage04.html' },
      { id: 'src:koenji-pal-about', kind: 'official_place', kindLabel: '公式（商店街）', name: '高円寺パル商店街 公式サイト（商店街について）', url: 'https://www.koenji-pal.jp/about' },
      { id: 'src:koenji-pal-access', kind: 'official_place', kindLabel: '公式（商店街）', name: '高円寺パル商店街 公式サイト（アクセス）', url: 'https://www.koenji-pal.jp/access' },
      { id: 'src:official-home', kind: 'official', kindLabel: '公式（主催団体）', name: '東京高円寺阿波おどり 公式サイト（トップ）', url: 'https://koenji-awaodori.com/' }
    ],

    /* S0–S5。S2 の六拍（BEFORE → ENCOUNTER → QUESTION → EVIDENCE → REVEAL → AFTER）
       は、この高円寺の learned_from のための構成で、あらゆる Relation の
       共通 template ではない。renderer は beats[] を数に依らず描く。 */
    scenes: [
      {
        id: 's0',
        title: 'いま',
        figure: true,
        lead: '高円寺の通りで、連が踊っている。',
        factIds: ['fact:present-groups'],
        cue: {
          label: '合図',
          remote: '高円寺にいるふりはしなくてかまいません。知っている範囲の、いまの高円寺を思い浮かべてください。',
          onsite: '20秒、画面から目を離して、いまの通りを見てください。'
        },
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
              { name: '木場連', text: '徳島の阿波おどりの連。' },
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
          },
          {
            id: 'after',
            kind: 'cue',
            label: 'そのあとで',
            cue: {
              label: '合図',
              remote: '画面を伏せて、20秒。いまの高円寺を、人から人へ渡ってきたものとして思い浮かべてください。',
              onsite: '画面を伏せて、20秒。目の前の通りを、人から人へ渡ってきたものとして見てください。'
            }
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
        cue: {
          label: '合図',
          remote: '画面を伏せて、20秒。いまの高円寺を、もう一度思い浮かべてください。',
          onsite: '画面を伏せて、20秒。いまの通りを、もう一度見てください。'
        },
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
        why: '1961–62年に人から人へ渡った踊りを、いま続けている連。',
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
      }
    ],

    ending: {
      line: 'このスレッドは、ここまでです。',
      exitLabel: '入口へ戻る',
      exitHref: './index.html'
    }
  };

  window.V3_THREAD_CONTENT = {
    schema: 'v3-thread/rc1',
    threads: [KOENJI]
  };
})();
