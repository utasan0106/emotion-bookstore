window.TOKYO_PILOT_CONTENT = {
  feature: {
    id: 'tokyo-overcommitted-01',
    title: '「それ、本当にあるの？」な3つ',
    verifiedAt: '2026-08-27T17:16:00+09:00',
    mediaPolicy: 'same-origin-localized',
    reverifyBeforeExternalCycle: true
  },
  objects: [
    {
      id: 'manuscript-cafe',
      objectName: '原稿執筆カフェ',
      placeName: '高円寺三角地帯 / 高円寺',
      typeLabel: 'カフェ・作業場所',
      hook: '原稿執筆する人限定のカフェ。',
      // 見出しの折返しを意味単位で決めるためだけの分割。join('') は hook と一致する。
      hookPhrases: ['原稿執筆する', '人限定の', 'カフェ。'],
      reveal: '入店時に目標を書き、達成するまで精算できない。進捗チェックもある。',
      revealPhrases: ['入店時に', '目標を書き、', '達成するまで', '精算できない。', '進捗チェックも', 'ある。'],
      facts: [
        ['場所', '東京都杉並区高円寺北2-1-24'],
        ['営業', '不定期。営業日は公式ページで確認'],
        ['利用', '原稿・編集・翻訳・企画書など創作作業を目的とする人向け']
      ],
      actionLabel: '公式ページで営業日を見る',
      actionUrl: 'https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/',
      mediaWidth: 640,
      mediaHeight: 905,
      mediaCrop: 'none',
      mediaCropNote: '公式ポスターは円形ロゴ・店名・「締切に追われているあなたのためのカフェ」の3点で成立する。どこを切っても意味が減る。切らない。',
      mediaUrl: './assets/manuscript-cafe.png',
      cardMediaAlt: '「原稿執筆カフェ」と大きく書かれた青いポスター',
      mediaAlt: '青地に「原稿執筆カフェ」と書かれた公式ビジュアル',
      rights: {
        author: '高円寺「原稿執筆カフェ」公式ページ',
        source: '公式ページ',
        sourceUrl: 'https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/',
        license: 'メディア利用許可の記載にもとづく掲載',
        licenseUrl: null,
        modification: '変更なし'
      },
      attribution: 'Image: 高円寺「原稿執筆カフェ」公式ページ / メディア利用許可記載あり',
      rightsUrl: 'https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/',
      mediaLicense: 'official bounded media permission',
      verifiedAt: '2026-08-27T17:16:00+09:00',
      expiresAt: '2026-08-30T16:00:00+09:00',
      reverifyBeforeExternalCycle: true,
      verifiedNote: '公式ページで利用目的、目標達成まで精算不可、進捗確認、所在地、営業日確認導線を確認。'
    },
    {
      id: 'hachiko-taxidermy',
      objectName: '忠犬ハチ公の剥製',
      placeName: '国立科学博物館 / 上野',
      typeLabel: '常設展示',
      hook: '渋谷のハチ公、本物は上野。',
      hookPhrases: ['渋谷のハチ公、', '本物は上野。'],
      reveal: '上野にいるのは、ハチ本人の剥製。',
      revealPhrases: ['上野にいるのは、', 'ハチ本人の剥製。'],
      facts: [
        ['展示', '日本館2F北翼「日本人と自然」'],
        ['種類', '秋田犬（ハチ）の剥製'],
        ['来館', '開館時間・休館日は公式サイトで最新情報を確認']
      ],
      actionLabel: '国立科学博物館の展示情報を見る',
      actionUrl: 'https://db.kahaku.go.jp/exh/detail?cls=col_z1_01&pkey=1759522',
      mediaWidth: 2048,
      mediaHeight: 1536,
      mediaCrop: 'none',
      mediaCropNote: '被写体が展示ケースの中央にあり、原寸比のまま入る。切らない。',
      mediaUrl: './assets/hachiko.jpg',
      cardMediaAlt: '博物館の展示ケースの中に立つ、白い秋田犬',
      mediaAlt: '国立科学博物館に展示されている忠犬ハチ公の剥製',
      rights: {
        author: 'Momotarou2012',
        source: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hachiko_in_National_Museum_of_Nature_and_Science.jpg',
        license: 'CC BY-SA 3.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
        modification: '縮小のみ・cropなし'
      },
      attribution: 'Photo: Momotarou2012 / Wikimedia Commons / CC BY-SA 3.0',
      rightsUrl: 'https://commons.wikimedia.org/wiki/File:Hachiko_in_National_Museum_of_Nature_and_Science.jpg',
      mediaLicense: 'CC BY-SA 3.0',
      verifiedAt: '2026-08-27T17:16:00+09:00',
      expiresAt: null,
      reverifyBeforeExternalCycle: true,
      verifiedNote: '国立科学博物館の常設展示DBで「秋田犬（ハチ）」、剥製、日本館2F北翼を確認。'
    },
    {
      id: 'meguro-tapeworm',
      objectName: '8.8mのサナダムシ標本',
      placeName: '目黒寄生虫館 / 目黒',
      typeLabel: '研究博物館',
      hook: '8.8mのサナダムシ。',
      hookPhrases: ['8.8mの', 'サナダムシ。'],
      reveal: '1986年に駆虫。今も、その8.8mを標本で見られる。',
      revealPhrases: ['1986年に駆虫。', '今も、', 'その8.8mを', '標本で見られる。'],
      facts: [
        ['展示', '8.8mの日本海裂頭条虫（サナダムシ）の標本'],
        ['開館', '10:00–17:00 / 月・火休館（祝日の場合は変更あり）'],
        ['入館料', '無料（寄付を受付）']
      ],
      actionLabel: '目黒寄生虫館の利用案内を見る',
      actionUrl: 'https://www.kiseichu.org/information',
      mediaWidth: 1363,
      mediaHeight: 2048,
      mediaCrop: 'none',
      mediaCropNote: '8.8m という長さ自体が証拠。縦を切ると事実が壊れる。切らない。',
      mediaUrl: './assets/meguro-tapeworm.jpg',
      cardMediaAlt: '細長い展示ケースの中で、白いひも状のものが何度も折り返されている',
      mediaAlt: '目黒寄生虫館に展示されている長いサナダムシ標本',
      rights: {
        author: 'Laika ac',
        source: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Laika_ac_Meguro_Parasitological_Museum_(7482790682).jpg',
        license: 'CC BY-SA 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
        modification: '縮小のみ・cropなし'
      },
      attribution: 'Photo: Laika ac / Wikimedia Commons / CC BY-SA 2.0',
      rightsUrl: 'https://commons.wikimedia.org/wiki/File:Laika_ac_Meguro_Parasitological_Museum_(7482790682).jpg',
      mediaLicense: 'CC BY-SA 2.0',
      verifiedAt: '2026-08-27T17:16:00+09:00',
      expiresAt: null,
      reverifyBeforeExternalCycle: true,
      verifiedNote: '目黒寄生虫館公式で8.8m標本の1986年駆虫・展示開始、開館時間、休館日、入館無料を確認。'
    }
  ]
};
