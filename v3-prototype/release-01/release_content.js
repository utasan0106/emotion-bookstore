/* みんなの感情書店 V3 — Release Candidate 01 / 4つの棚
 *
 * 棚は4つ、1つの棚に3件だけ。並べ替えも追加読み込みもしない。
 * hookPhrases / revealPhrases は表示上の折返し単位を宣言するだけで、
 * join('') は必ず hook / reveal と1文字も違わない（release_check.js が guard）。
 *
 * mode:
 *   evergreen … 期限のない事実。
 *   current   … 会期・公演など期限のある事実。verifiedAt と expiresAt が必須で、
 *               期限を過ぎたらその棚は fail-closed。差し替えは人の編集でだけ行う。
 *
 * media.kind:
 *   photo … 権利のはっきりした実写を同一オリジンへ置いたもの。
 *   plate … 実写を持たない対象のための、V3 独自の活字図版。既存の表紙・
 *           ポスター・スチル・チラシを模写しない。plateWord は Reveal の
 *           答えを先に言わない語だけを使う。
 */
window.V3_RELEASE_CONTENT = {
  release: {
    id: 'v3-release-01',
    title: 'みんなの感情書店',
    foyerLead: '今日は、どの棚へ。',
    // サイト共通の短い説明。玄関にも、街の棚を直接開いたときにも、
    // 最初の写真・図版より必ず先に出す。長い理念文は足さない。
    siteExplainer: '人が選んだ場所・本・音楽・映画・催しを、街や種類ごとに少しずつ並べる文化案内です。',
    verifiedAt: '2026-08-28T23:08:00+09:00',
    shelfCount: 4,
    objectsPerShelf: 3
  },
  // 種類は新しい無限棚ではなく、いま公開中の12件を横断して見るための
  // 有限な索引。初回はこの5つだけで、順番も固定する。
  categories: [
    { id: 'food', name: '飲食・喫茶' },
    { id: 'experience', name: '体験・おでかけ' },
    { id: 'books', name: '本・古書' },
    { id: 'music', name: '音楽・ライブ' },
    { id: 'film-stage', name: '映画・演劇' }
  ],
  shelves: [
    {
      id: 'tokyo',
      name: '東京の棚',
      role: 'flagship',
      tagline: '東京を、3つだけ。',
      area: '東京',
      objects: [
        {
          id: 'manuscript-cafe',
          categoryIds: ['food', 'experience'],
          objectName: '原稿執筆カフェ',
          placeName: '高円寺三角地帯 / 高円寺',
          typeLabel: 'カフェ・作業場所',
          mode: 'evergreen',
          hook: '原稿執筆する人限定のカフェ。',
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
          media: {
            kind: 'photo',
            url: './assets/manuscript-cafe.png',
            width: 640,
            height: 905,
            crop: 'none',
            listAlt: '「原稿執筆カフェ」と大きく書かれた青いポスター',
            detailAlt: '青地に「原稿執筆カフェ」と書かれた公式ビジュアル'
          },
          rights: {
            author: '高円寺「原稿執筆カフェ」公式ページ',
            source: '公式ページ',
            sourceUrl: 'https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/',
            license: 'メディア利用許可の記載にもとづく掲載',
            licenseUrl: null,
            modification: '変更なし'
          },
          factsSourceUrl: 'https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/',
          verifiedAt: '2026-08-27T17:16:00+09:00',
          // 表示している事実は「不定期。営業日は公式ページで確認」で、特定の日付に
          // 依存していない。旧 Pilot 由来の finite expiry を残すと 8/30 16:00 に
          // 東京 flagship が丸ごと閉じてしまうため、evergreen として期限を持たせない。
          expiresAt: null
        },
        {
          id: 'hachiko-taxidermy',
          categoryIds: ['experience'],
          objectName: '忠犬ハチ公の剥製',
          placeName: '国立科学博物館 / 上野',
          typeLabel: '常設展示',
          mode: 'evergreen',
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
          media: {
            kind: 'photo',
            url: './assets/hachiko.jpg',
            width: 2048,
            height: 1536,
            crop: 'none',
            listAlt: '博物館の展示ケースの中に立つ、白い秋田犬',
            detailAlt: '国立科学博物館に展示されている忠犬ハチ公の剥製'
          },
          rights: {
            author: 'Momotarou2012',
            source: 'Wikimedia Commons',
            sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hachiko_in_National_Museum_of_Nature_and_Science.jpg',
            license: 'CC BY-SA 3.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
            modification: '縮小のみ・cropなし'
          },
          factsSourceUrl: 'https://db.kahaku.go.jp/exh/detail?cls=col_z1_01&pkey=1759522',
          verifiedAt: '2026-08-27T17:16:00+09:00',
          expiresAt: null
        },
        {
          id: 'meguro-tapeworm',
          categoryIds: ['experience'],
          objectName: '8.8mのサナダムシ標本',
          placeName: '目黒寄生虫館 / 目黒',
          typeLabel: '研究博物館',
          mode: 'evergreen',
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
          media: {
            kind: 'photo',
            url: './assets/meguro-tapeworm.jpg',
            width: 1363,
            height: 2048,
            crop: 'none',
            listAlt: '細長い展示ケースの中で、白いひも状のものが何度も折り返されている',
            detailAlt: '目黒寄生虫館に展示されている長いサナダムシ標本'
          },
          rights: {
            author: 'Laika ac',
            source: 'Wikimedia Commons',
            sourceUrl: 'https://commons.wikimedia.org/wiki/File:Laika_ac_Meguro_Parasitological_Museum_(7482790682).jpg',
            license: 'CC BY-SA 2.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
            modification: '縮小のみ・cropなし'
          },
          factsSourceUrl: 'https://www.kiseichu.org/information',
          verifiedAt: '2026-08-27T17:16:00+09:00',
          expiresAt: null
        }
      ]
    },
    {
      id: 'koenji',
      name: '高円寺の棚',
      role: 'town',
      tagline: '高円寺を、3つだけ。',
      area: '高円寺',
      objects: [
        {
          id: 'kosugiyu',
          categoryIds: ['experience'],
          objectName: '小杉湯',
          placeName: '小杉湯 / 高円寺',
          typeLabel: '銭湯・まちの湯',
          mode: 'evergreen',
          hook: '昭和8年から、高円寺で湯を沸かしている。',
          hookPhrases: ['昭和8年から、', '高円寺で', '湯を沸かしている。'],
          reveal: '2021年に国の登録有形文化財になった建物で、いまも毎日ミルク風呂が立つ。',
          revealPhrases: ['2021年に', '国の登録有形文化財に', 'なった建物で、', 'いまも毎日', 'ミルク風呂が', '立つ。'],
          facts: [
            ['創業', '昭和8年（1933年）'],
            ['建物', '2021年に国の登録有形文化財へ登録'],
            ['利用', '営業時間と休みは公式ページで確認']
          ],
          actionLabel: '小杉湯の公式ページを見る',
          actionUrl: 'https://kosugiyu.co.jp/',
          media: {
            kind: 'plate',
            plateWord: '小杉湯',
            plateSub: '高円寺 / 銭湯・まちの湯',
            ratio: '4 / 5',
            listAlt: '「小杉湯」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「小杉湯」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://kosugiyu.co.jp/',
          verifiedAt: '2026-08-29T14:26:00+09:00',
          expiresAt: null
        },
        {
          id: 'jirokichi',
          categoryIds: ['music'],
          objectName: '高円寺 JIROKICHI',
          placeName: 'JIROKICHI / 高円寺',
          typeLabel: 'ライブハウス・音楽',
          mode: 'evergreen',
          hook: '高円寺駅から2分。1975年から続くライブハウス。',
          hookPhrases: ['高円寺駅から', '2分。', '1975年から続く', 'ライブハウス。'],
          reveal: '2025年に50周年。50年分のライブスケジュールや未公開写真まで、一冊の記録になった。',
          revealPhrases: ['2025年に', '50周年。', '50年分の', 'ライブスケジュールや', '未公開写真まで、', '一冊の記録に', 'なった。'],
          facts: [
            ['開業', '1975年'],
            ['節目', '2025年に50周年。50年分の記録が一冊にまとまった'],
            ['確認', '出演者と開演時刻は公式ページで確認']
          ],
          actionLabel: 'JIROKICHIの公式ページを見る',
          actionUrl: 'https://jirokichi.net/',
          media: {
            kind: 'plate',
            plateWord: 'JIROKICHI',
            plateSub: '高円寺 / ライブハウス・音楽',
            ratio: '4 / 5',
            listAlt: '「JIROKICHI」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「JIROKICHI」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://jirokichi.net/news/20260116/',
          verifiedAt: '2026-08-28T23:08:00+09:00',
          expiresAt: null
        },
        {
          id: 'koenji-junjo-shotengai-book',
          categoryIds: ['books'],
          objectName: '『高円寺純情商店街』',
          placeName: '高円寺駅北口の商店街 / 高円寺',
          typeLabel: '小説・商店街',
          mode: 'evergreen',
          hook: '高円寺の商店街は、直木賞になった。',
          hookPhrases: ['高円寺の', '商店街は、', '直木賞に', 'なった。'],
          reveal: 'ねじめ正一『高円寺純情商店街』は、高円寺駅北口の商店街とそこで暮らす人々を描いた第101回直木賞受賞作。',
          revealPhrases: ['ねじめ正一', '『高円寺純情商店街』は、', '高円寺駅北口の', '商店街と', 'そこで暮らす', '人々を描いた', '第101回直木賞', '受賞作。'],
          facts: [
            ['著者', 'ねじめ正一'],
            ['受賞', '第101回直木賞'],
            ['舞台', '高円寺駅北口の商店街とそこで暮らす人々']
          ],
          actionLabel: '新潮社の作品ページを見る',
          actionUrl: 'https://www.shinchosha.co.jp/book/102112/',
          media: {
            kind: 'plate',
            plateWord: '純情商店街',
            plateSub: '高円寺 / 小説・商店街',
            ratio: '4 / 5',
            listAlt: '「純情商店街」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「純情商店街」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://www.shinchosha.co.jp/book/102112/',
          verifiedAt: '2026-08-28T23:08:00+09:00',
          expiresAt: null
        }
      ]
    },
    {
      id: 'shimokitazawa',
      name: '下北沢の棚',
      role: 'town',
      tagline: '下北沢を、3つだけ。',
      area: '下北沢',
      objects: [
        {
          id: 'shimokitazawa-shelter',
          categoryIds: ['music'],
          objectName: '下北沢 SHELTER',
          placeName: 'SHELTER / 下北沢',
          typeLabel: 'ライブハウス・音楽',
          mode: 'current',
          hook: '下北沢の地下1階、SHELTERは今年35周年。',
          hookPhrases: ['下北沢の', '地下1階、', 'SHELTERは', '今年35周年。'],
          reveal: '1991年に始まったSHELTER。2026年は35周年企画「IGNITION GIGS」が続いている。',
          revealPhrases: ['1991年に', '始まった', 'SHELTER。', '2026年は', '35周年企画', '「IGNITION GIGS」が', '続いている。'],
          facts: [
            ['開業', '1991年'],
            ['いま', '2026年の35周年企画「IGNITION GIGS」が続いている'],
            ['確認', '出演者と開演時刻は公式スケジュールで確認']
          ],
          actionLabel: 'SHELTERの予定を見る',
          actionUrl: 'https://www.loft-prj.co.jp/schedule/shelter/schedule',
          media: {
            kind: 'photo',
            url: './assets/shimokitazawa-shelter.jpg',
            width: 960,
            height: 723,
            crop: 'none',
            listAlt: '夜の路地から、地下へ下りる階段の入口を見下ろしている',
            detailAlt: '電球で縁取られた「SHELTER」の看板と、地下へ続く階段。壁にはライブの告知が貼られている'
          },
          rights: {
            author: 'Syced',
            source: 'Wikimedia Commons',
            sourceUrl: 'https://commons.wikimedia.org/wiki/File:SHELTER.jpg',
            license: 'CC0 1.0',
            licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
            modification: '縮小のみ・cropなし'
          },
          factsSourceUrl: 'https://www.loft-prj.co.jp/schedule/shelter',
          verifiedAt: '2026-08-28T23:08:00+09:00',
          expiresAt: '2026-09-27T23:59:00+09:00'
        },
        {
          id: 'honda-theater',
          categoryIds: ['film-stage'],
          objectName: '本多劇場',
          placeName: '本多劇場 / 下北沢',
          typeLabel: '劇場・演劇',
          mode: 'evergreen',
          hook: '下北沢が演劇の街になったのは、元映画俳優が一人いたから。',
          hookPhrases: ['下北沢が', '演劇の街に', 'なったのは、', '元映画俳優が', '一人いたから。'],
          reveal: '本多一夫が1981年にザ・スズナリ、1982年に本多劇場を開いた。いまも本多劇場グループの各館が駅の周りに点在している。',
          revealPhrases: ['本多一夫が', '1981年に', 'ザ・スズナリ、', '1982年に', '本多劇場を開いた。', 'いまも', '本多劇場グループの', '各館が', '駅の周りに', '点在している。'],
          facts: [
            ['開場', '1982年11月3日'],
            ['規模', '客席386席。本多劇場グループで最大'],
            ['確認', '公演と当日券は公式ページで確認']
          ],
          actionLabel: '本多劇場の公演を見る',
          actionUrl: 'https://www.honda-geki.com/',
          media: {
            kind: 'plate',
            plateWord: '本多劇場',
            plateSub: '下北沢 / 劇場・演劇',
            ratio: '4 / 5',
            listAlt: '「本多劇場」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「本多劇場」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://www.honda-geki.com/',
          verifiedAt: '2026-08-29T14:26:00+09:00',
          expiresAt: null
        },
        {
          id: 'machinouede-film',
          categoryIds: ['film-stage'],
          objectName: '映画『街の上で』',
          placeName: '下北沢一帯 / 下北沢',
          typeLabel: '映画・街',
          mode: 'evergreen',
          hook: 'この映画、オール下北沢ロケ。',
          hookPhrases: ['この映画、', 'オール下北沢', 'ロケ。'],
          reveal: '今泉力哉監督『街の上で』は、古着屋・古本屋・自主映画・飲み屋まで、下北沢の日常そのものを舞台にした。',
          revealPhrases: ['今泉力哉監督', '『街の上で』は、', '古着屋・古本屋・', '自主映画・飲み屋まで、', '下北沢の', '日常そのものを', '舞台にした。'],
          facts: [
            ['監督', '今泉力哉'],
            ['舞台', '古着屋・古本屋・自主映画・飲み屋など下北沢の日常'],
            ['確認', '上映情報は配給元・劇場の公式ページで確認']
          ],
          /* 公開当時の公式ドメイン machinouede.com は、2026-08-29 時点で
             ERR_SSL_PROTOCOL_ERROR を返す（Founder 実機確認）。2021年公開作の
             プロモーション用ドメインが失効した形で、利用者から見れば
             「公式サイトを見る」を押すと壊れたページに着く状態だった。
             この対象は evergreen なので、期限で消える上映ページではなく、
             配給元（東京テアトル）の作品ページへ向ける。
             万一この URL が 404 になった場合の代替は、年別アーカイブの
             https://ttcg.jp/distribution/2021/ 。 */
          actionLabel: '配給元の作品ページを見る',
          actionUrl: 'https://ttcg.jp/movie/0650200.html',
          media: {
            kind: 'plate',
            plateWord: '街の上で',
            plateSub: '下北沢 / 映画・街',
            ratio: '4 / 5',
            listAlt: '「街の上で」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「街の上で」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://ttcg.jp/movie/0650200.html',
          verifiedAt: '2026-08-29T15:40:00+09:00',
          expiresAt: null
        }
      ]
    },
    {
      id: 'jinbocho',
      name: '神保町の棚',
      role: 'town',
      tagline: '神保町を、3つだけ。',
      area: '神保町',
      objects: [
        {
          id: 'jinbocho-book-town',
          categoryIds: ['books'],
          objectName: 'JIMBOCHO古書店MAP',
          placeName: '神田古書店街 / 神保町',
          typeLabel: '古書店街・本',
          mode: 'evergreen',
          hook: '神保町には、2026年版の古書店地図がある。',
          hookPhrases: ['神保町には、', '2026年版の', '古書店地図が', 'ある。'],
          reveal: '神田古書店連盟は街全体を『JIMBOCHO古書店MAP』として案内している。本を探すこと自体が街歩きになる。',
          revealPhrases: ['神田古書店連盟は', '街全体を', '『JIMBOCHO古書店MAP』として', '案内している。', '本を探すこと自体が', '街歩きに', 'なる。'],
          facts: [
            ['発行', '神田古書店連盟'],
            ['内容', '街全体を1枚で案内する古書店MAP（2026年版）'],
            ['確認', '最新版と配布状況は公式ページで確認']
          ],
          actionLabel: '公式の古書店MAPを見る',
          actionUrl: 'https://jimbou.info/map/',
          media: {
            kind: 'plate',
            plateWord: '古書店MAP',
            plateSub: '神保町 / 古書店街・本',
            ratio: '4 / 5',
            listAlt: '「古書店MAP」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「古書店MAP」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://jimbou.info/map/',
          verifiedAt: '2026-08-28T23:08:00+09:00',
          expiresAt: null
        },
        {
          id: 'yaguchi-shoten',
          categoryIds: ['books', 'film-stage'],
          objectName: '矢口書店',
          placeName: '矢口書店 / 神保町',
          typeLabel: '古書店・映画・演劇',
          mode: 'evergreen',
          hook: '100年以上続く古本屋が、映画と演劇の台本を専門にしている。',
          hookPhrases: ['100年以上続く', '古本屋が、', '映画と演劇の', '台本を', '専門にしている。'],
          reveal: '大正7年創業の矢口書店。映画・演劇・演芸・戯曲・シナリオに加え、ポスターやパンフレット、近年は音楽書籍・CD・レコードも扱う。',
          revealPhrases: ['大正7年創業の', '矢口書店。', '映画・演劇・演芸・', '戯曲・シナリオに加え、', 'ポスターや', 'パンフレット、', '近年は', '音楽書籍・CD・レコードも', '扱う。'],
          facts: [
            ['創業', '大正7年'],
            ['扱い', '映画・演劇・演芸・戯曲・シナリオ、ポスターやパンフレット、音楽書籍・CD・レコード'],
            ['確認', '営業時間と在庫は公式サイトで確認']
          ],
          actionLabel: '矢口書店の公式サイトを見る',
          actionUrl: 'https://yaguchishoten.jp/',
          media: {
            kind: 'photo',
            url: './assets/yaguchi-shoten.jpg',
            width: 960,
            height: 640,
            crop: 'none',
            listAlt: '通りに面した二階建ての店の前面いっぱいに、木の書棚が並んでいる',
            detailAlt: '「矢口書店」の看板を掲げた店構え。間口いっぱいの棚に本が詰まっている'
          },
          rights: {
            author: 'Olaf2',
            source: 'Wikimedia Commons',
            sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jimb%C5%8Dch%C5%8D_Book_Town_2025_02.jpg',
            license: 'CC BY-SA 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
            modification: '縮小のみ・cropなし'
          },
          factsSourceUrl: 'https://yaguchishoten.jp/',
          verifiedAt: '2026-08-28T23:08:00+09:00',
          expiresAt: null
        },
        {
          id: 'jinbocho-theater-mizoguchi-2026',
          categoryIds: ['film-stage'],
          objectName: '神保町シアター 溝口健二特集',
          placeName: '神保町シアター / 神保町',
          typeLabel: '名画座・映画',
          mode: 'current',
          hook: '本の街では、いま溝口健二をスクリーンで見直している。',
          hookPhrases: ['本の街では、', 'いま', '溝口健二を', 'スクリーンで', '見直している。'],
          reveal: '神保町シアターでは8月15日–9月11日、没後70年『映画監督・溝口健二の世界』を上映中。',
          revealPhrases: ['神保町シアターでは', '8月15日–9月11日、', '没後70年', '『映画監督・溝口健二の世界』を', '上映中。'],
          facts: [
            ['会期', '2026年8月15日–9月11日'],
            ['特集', '没後70年『映画監督・溝口健二の世界』'],
            ['確認', '上映作品と時刻は公式ページで確認']
          ],
          actionLabel: '神保町シアターの特集を見る',
          actionUrl: 'https://www.shogakukan.co.jp/jinbocho-theater/features/',
          media: {
            kind: 'plate',
            plateWord: '溝口健二',
            plateSub: '神保町 / 名画座・映画',
            ratio: '4 / 5',
            listAlt: '「溝口健二」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「溝口健二」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://www.shogakukan.co.jp/jinbocho-theater/features/',
          verifiedAt: '2026-08-28T23:08:00+09:00',
          expiresAt: '2026-09-11T23:59:00+09:00'
        }
      ]
    }
  ]
};
