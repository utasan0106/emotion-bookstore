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
    foyerLead: '今日は、どの街へ。',
    // サイト共通の短い説明。玄関にも、街の棚を直接開いたときにも、
    // 最初の写真・図版より必ず先に出す。長い理念文は足さない。
    siteExplainer: '人が選んだ場所・本・音楽・映画・催しを、街や種類ごとに少しずつ並べる文化案内です。',
    verifiedAt: '2026-09-01T13:00:00+09:00',
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
  detour: {
    label: '今週の寄り道',
    weekOf: '2026-09-01',
    theme: 'ひとりで歩くと、街は少し違って見える。',
    items: [
      {
        kind: '本', title: 'すべて真夜中の恋人たち', creator: '川上未映子',
        why: '街の名前を説明する本ではなく、真夜中をひとりで歩く時間から、灯りや距離、人との間合いを感じ直すための一冊。',
        actionLabel: '講談社で見る', actionUrl: 'https://www.kodansha.co.jp/book/products/0000206651',
        media: {
          kind: 'publisher-link',
          sourceLabel: '書影は講談社公式ページで見る',
          sourceUrl: 'https://www.kodansha.co.jp/book/products/0000206651'
        }
      },
      {
        kind: '映画', title: 'PERFECT DAYS', creator: 'ヴィム・ヴェンダース 監督',
        why: '名所を巡る映画ではなく、同じ道と同じ仕事の反復のなかで、毎日の街が少しずつ違って見えてくる一本。',
        actionLabel: '公式サイトで見る', actionUrl: 'https://www.perfectdays-movie.jp/story/',
        media: {
          kind: 'youtube',
          videoId: '15crm4zuB04',
          videoTitle: '映画『PERFECT DAYS』本予告',
          buttonLabel: '本予告を再生',
          sourceLabel: '公式予告: 映画会社ビターズ・エンド',
          sourceUrl: 'https://www.youtube.com/watch?v=15crm4zuB04'
        }
      },
      {
        kind: '音楽', title: 'ナイトクルージング', creator: 'フィッシュマンズ',
        why: 'どこかの街を名指しするのではなく、夜に移動するときの速度や遠さ、街灯のあいだを漂う感覚を置く一曲。',
        actionLabel: 'Universal Musicで見る', actionUrl: 'https://www.universal-music.co.jp/fishmans/discography/',
        media: {
          kind: 'youtube',
          videoId: 'iy-YU6QHEQY',
          videoTitle: 'Fishmans - Night Cruising',
          buttonLabel: '公式音源を再生',
          sourceLabel: '公式音源: Universal Music Group',
          sourceUrl: 'https://www.youtube.com/watch?v=iy-YU6QHEQY'
        }
      }
    ]
  },
  shelves: [
    {
      id: 'kichijoji',
      name: '吉祥寺の棚',
      role: 'flagship',
      tagline: '吉祥寺を、3つだけ。',
      area: '吉祥寺',
      heroMedia: {
        url: './assets/city-kichijoji.jpg', width: 1536, height: 2048,
        alt: '赤い提灯が並ぶ吉祥寺・ハーモニカ横丁の路地',
        author: 'Stephen Kelly', source: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Harmonica_Yokocho_in_Kichijoji_(53417122805).jpg',
        license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
        modification: 'Wikimedia Commons原本を取得後、長辺1600px以内へ縮小。表示時のみCSSでトリミング・明度・彩度・コントラスト調整'
      },
      objects: [
        {
          id: 'inokashira-park',
          categoryIds: ['experience'],
          objectName: '井の頭恩賜公園',
          placeName: '井の頭恩賜公園 / 吉祥寺',
          typeLabel: '公園・水辺',
          mode: 'evergreen',
          hook: '駅から5分で、街が水辺にほどける。',
          hookPhrases: ['駅から5分で、', '街が水辺に', 'ほどける。'],
          reveal: '井の頭池は江戸の水源として知られ、1917年に日本最初の恩賜公園・郊外公園として開園した。',
          revealPhrases: ['井の頭池は', '江戸の水源として知られ、', '1917年に', '日本最初の恩賜公園・', '郊外公園として', '開園した。'],
          facts: [
            ['開園', '1917年5月1日'],
            ['アクセス', 'JR中央線・京王井の頭線「吉祥寺」駅から徒歩5分'],
            ['園内', '井の頭池、ボート場、野外ステージなど']
          ],
          actionLabel: '井の頭恩賜公園の公式ページを見る',
          actionUrl: 'https://www.kensetsu.metro.tokyo.lg.jp/jimusho/seibuk/inokashira',
          media: {
            kind: 'photo', url: './assets/inokashira-pond.jpg', width: 1280, height: 759, crop: 'none',
            listAlt: '「井の頭恩賜公園」と組んだ活字図版',
            detailAlt: '井の頭恩賜公園の井の頭池と水辺の景色'
          },
          rights: {
            author: 'Htanaungg', source: 'Wikimedia Commons',
            sourceUrl: 'https://commons.wikimedia.org/wiki/File:Inokashira_Pond.jpg',
            license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
            modification: 'Wikimedia生成の1280px縮小版・cropなし'
          },
          factsSourceUrl: 'https://www.kensetsu.metro.tokyo.lg.jp/jimusho/seibuk/inokashira/kouenannai',
          verifiedAt: '2026-09-01T13:00:00+09:00', expiresAt: null
        },
        {
          id: 'kichijoji-sometime',
          categoryIds: ['music', 'food'],
          objectName: '吉祥寺 SOMETIME',
          placeName: 'SOMETIME / 吉祥寺',
          typeLabel: 'ジャズクラブ・飲食',
          mode: 'evergreen',
          hook: '地下へ降りると、昼も夜もジャズが鳴る。',
          hookPhrases: ['地下へ降りると、', '昼も夜も', 'ジャズが鳴る。'],
          reveal: '1975年に吉祥寺で誕生。食事と飲み物のすぐそばで、生演奏を聴ける店が続いている。',
          revealPhrases: ['1975年に', '吉祥寺で誕生。', '食事と飲み物の', 'すぐそばで、', '生演奏を聴ける店が', '続いている。'],
          facts: [
            ['開業', '1975年'],
            ['ライブ', '夜2セット。土日祝は昼のライブも実施'],
            ['場所', '東京都武蔵野市吉祥寺本町1-11-31 B1F']
          ],
          actionLabel: 'SOMETIMEの公式ページを見る',
          actionUrl: 'https://www.sometime.co.jp/sometime/',
          media: {
            kind: 'plate', plateWord: 'SOMETIME', plateSub: '吉祥寺 / ジャズクラブ', ratio: '4 / 5',
            listAlt: '「SOMETIME」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「SOMETIME」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://www.sometime.co.jp/sometime/intro.html',
          verifiedAt: '2026-09-01T13:00:00+09:00', expiresAt: null
        },
        {
          id: 'kichijoji-theatre',
          categoryIds: ['film-stage'],
          objectName: '吉祥寺シアター',
          placeName: '吉祥寺シアター / 吉祥寺',
          typeLabel: '劇場・舞台芸術',
          mode: 'evergreen',
          hook: '駅から5分、街の中に小さな劇場。',
          hookPhrases: ['駅から5分、', '街の中に', '小さな劇場。'],
          reveal: '舞台芸術の創造・普及・発信の拠点としてつくられ、劇場とけいこ場、1階のカフェと公共ロビーまで同じ建物にある。',
          revealPhrases: ['舞台芸術の', '創造・普及・発信の', '拠点としてつくられ、', '劇場とけいこ場、', '1階のカフェと', '公共ロビーまで', '同じ建物にある。'],
          facts: [
            ['開館', '2005年'],
            ['アクセス', '吉祥寺駅北口から徒歩約5分'],
            ['施設', '劇場・けいこ場・1階カフェ・公共ロビー']
          ],
          actionLabel: '吉祥寺シアターの公式ページを見る',
          actionUrl: 'https://www.musashino.or.jp/k_theatre/index.html',
          media: {
            kind: 'plate', plateWord: '吉祥寺シアター', plateSub: '吉祥寺 / 劇場・舞台芸術', ratio: '4 / 5',
            listAlt: '「吉祥寺シアター」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「吉祥寺シアター」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://www.musashino.or.jp/k_theatre/1002052/1002053.html',
          verifiedAt: '2026-09-01T13:00:00+09:00', expiresAt: null
        }
      ]
    },
    {
      id: 'koenji',
      name: '高円寺の棚',
      role: 'town',
      tagline: '高円寺を、3つだけ。',
      area: '高円寺',
      heroMedia: {
        url: './assets/city-koenji.jpg', width: 1536, height: 2048,
        alt: '夕方の高円寺の路地と店先の灯り',
        author: 'NMaia', source: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Street_in_Koenji.jpg',
        license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        modification: 'Wikimedia Commons原本を取得後、長辺1600px以内へ縮小。表示時のみCSSでトリミング・明度・彩度・コントラスト調整'
      },
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
      heroMedia: {
        url: './assets/city-shimokitazawa.jpg', width: 1280, height: 960,
        alt: '歩行者と小さな店が並ぶ下北沢の通り',
        author: 'Aw1805', source: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Shimokitazawa_Street_2015.jpg',
        license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        modification: 'Wikimedia Commons原本を取得後、長辺1600px以内へ縮小。表示時のみCSSでトリミング・明度・彩度・コントラスト調整'
      },
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
          /* 映画『街の上で』を外してここに入れ替えた。公開当時の公式ドメインが
             失効し、配給元の作品ページも公開終了とともに 404 になるため、
             「公式へ行ける」を満たし続けられる行き先が無かった。
             リンクの延命を続けるより、公式ページが独立して立っている対象に
             替える方が、棚の約束を守れる。 */
          id: 'book-and-beer',
          categoryIds: ['books', 'food'],
          objectName: '本屋B&B',
          placeName: 'BONUS TRACK / 下北沢',
          typeLabel: '本屋・イベント',
          mode: 'evergreen',
          hook: 'ビールを飲みながら本を選べる本屋が、下北沢にある。',
          hookPhrases: ['ビールを飲みながら', '本を選べる本屋が、', '下北沢にある。'],
          reveal: '本屋B&Bは2012年7月20日の開店。いまは下北線路街のBONUS TRACK 2階にあり、本にまつわるイベントを開いている。',
          revealPhrases: ['本屋B&Bは', '2012年7月20日の開店。', 'いまは下北線路街の', 'BONUS TRACK 2階に', 'あり、', '本にまつわる', 'イベントを', '開いている。'],
          facts: [
            ['開店', '2012年7月20日'],
            ['場所', '東京都世田谷区代田2-36-15 BONUS TRACK 2F'],
            ['催し', 'イベントの予定は公式ページで確認']
          ],
          actionLabel: '本屋B&Bの公式ページを見る',
          actionUrl: 'https://bookandbeer.com/',
          media: {
            kind: 'plate',
            plateWord: '本屋B&B',
            plateSub: '下北沢 / 本屋・イベント',
            ratio: '4 / 5',
            listAlt: '「本屋B&B」と大きく組んだ、この棚のための活字図版',
            detailAlt: '「本屋B&B」と大きく組んだ、この棚のための活字図版'
          },
          factsSourceUrl: 'https://bookandbeer.com/',
          verifiedAt: '2026-08-29T18:05:00+09:00',
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
      heroMedia: {
        url: './assets/city-jinbocho.jpg', width: 1280, height: 853,
        alt: '本が並ぶ神保町の古書店の店先',
        author: 'Real Estate Japan / photo credit Scott Kouchi', source: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Used_bookstore_in_Jimbocho_(50495926321).jpg',
        license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
        modification: 'Wikimedia Commons原本を取得後、長辺1600px以内へ縮小。表示時のみCSSでトリミング・明度・彩度・コントラスト調整'
      },
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
