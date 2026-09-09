'use strict';
// Source-grounded pilot. Facts and interpretation are separate; no source images,
// advertisement copy, interviews, or individual visitor data are republished.
module.exports = [{
  id: 'kichijoji-advertising', city: 'kichijoji',
  title: '広告の吉祥寺と、あなたが行く吉祥寺。',
  lead: '同じ吉祥寺でも、広告が誘う楽しみは違う。作品に会う、俳優に会う、街の過ごし方を見つける。2015〜2021年の広告・販促企画を、2024年の来街調査と読み比べる。',
  checkedAt: '2026-09-09',
  sources: [
    {id:'atre-history', title:'アトレ：会社沿革', publisher:'株式会社アトレ', publishedAt:'掲載日記載なし', period:'2010年4月', type:'運営会社の沿革', url:'https://www.atre.co.jp/company/corporate/history/', limitation:'吉祥寺ロンロンのアトレ化の記録。全店舗の入れ替わりや建物全体の建て替えを示すものではない。'},
    {id:'city-history', title:'武蔵野市：歴史年表', publisher:'武蔵野市', publishedAt:'掲載日記載なし', period:'2014年4月', type:'自治体の年表', url:'https://www.city.musashino.lg.jp/citypromotion_75/folder/history.html', limitation:'南北自由通路整備の年月を確認。通行しやすさの個人差や来街増加の因果は測定しない。'},
    {id:'atre-2024', title:'アトレ：吉祥寺の2024年リニューアル発表', publisher:'株式会社アトレ', publishedAt:'2024-09-12', period:'2024年10月の改装', type:'運営会社の改装発表', url:'https://www.atpress.ne.jp/news/407101', limitation:'一部売場の改装告知。施設全体の建て替えではない。当時の店を現在も営業中とは保証しない。'},
    {id:'city-2026', title:'武蔵野市：吉祥寺駅南口交通環境基本方針', publisher:'武蔵野市', publishedAt:'2026-08-03（更新）', period:'2026年の方針・検討状況', type:'自治体の交通環境方針', url:'https://www.city.musashino.lg.jp/shiseijoho/shisaku_keikaku/toshiseibibu_shisaku_keikaku/1041654.html', limitation:'方針・検討中の内容を完成済み整備として扱わない。'},
    {id:'durarara', title:'パルコ：デュラララ!!期間限定ショップの発表', publisher:'株式会社パルコ', publishedAt:'2015-11-12', period:'2015年11月13日〜30日（終了）', type:'販促企画の主催者発表', url:'https://prtimes.jp/main/html/rd/p/000000247.000003639.html', limitation:'期間限定の展示・販売企画の告知。作品の舞台や作者の居住地が吉祥寺であることの証拠ではない。'},
    {id:'kirarina-spring', title:'京王電鉄：キラリナ開業5周年と春の改装発表', publisher:'京王電鉄株式会社', publishedAt:'2019-03-18', period:'2019年4月の5周年・改装企画（終了）', type:'施設運営者の広告・改装発表', url:'https://prtimes.jp/main/html/rd/p/000000300.000022856.html', limitation:'磯村勇斗の起用はキャンペーンとの関係。出身地や居住地との関係を示すものではない。'},
    {id:'kirarina-autumn', title:'京王電鉄：キラリナ秋の改装とキャンペーン発表', publisher:'京王電鉄株式会社', publishedAt:'2019-09-19', period:'2019年11月〜12月の改装・販促企画（終了）', type:'施設運営者の広告・改装発表', url:'https://prtimes.jp/main/html/rd/p/000000363.000022856.html', limitation:'春と同一施設・同一年の改装計画に属する続報。独立した来街者調査として数えず、当時の店舗情報を現在の案内に転用しない。'},
    {id:'parco', title:'パルコ：吉祥寺パルコ40周年キャンペーン発表', publisher:'株式会社パルコ', publishedAt:'2021-03-09', period:'2021年3月19日〜5月31日の企画（終了）', type:'広告主の発表', url:'https://prtimes.jp/main/html/rd/p/000001505.000003639.html', limitation:'制作側が説明した企画意図。鑑賞者の受け取り方や広告効果の調査ではない。', media:{kind:'youtube',videoId:'jw5y9UXNp58',title:'吉祥寺パルコ40周年キャンペーンの公式ムービー',status:'official-embed',note:'パルコの公式発表に埋め込まれたYouTube動画。動画はYouTubeのプレイヤーから配信されます。'}},
    {id:'survey', title:'吉祥寺来街動機等調査2024：結果発表', publisher:'一般財団法人武蔵野市開発公社', publishedAt:'2025-03-13', period:'2024年1月1日〜12月31日', type:'調査実施団体の結果概要', url:'https://prtimes.jp/main/html/rd/p/000000013.000070948.html', limitation:'フリーWi-Fi利用156,623端末を対象とする調査。人数や全来街者の無作為標本ではない。本稿は概要のみを参照し、設問別の母数・生データは未検証。'}
  ],
  comparisons: [
    {source:'durarara', when:'2015年 · 吉祥寺パルコ', person:'デュラララ!!', relation:'作品の展示・販売会場', action:'作品の展示や限定ショップに立ち寄る', missing:'作品のファンが、実際に何人来街したかは不明。'},
    {source:'kirarina-spring', when:'2019年春 · キラリナ', person:'磯村勇斗', relation:'5周年広告への起用', action:'館内ポスターや一日支配人イベントを楽しむ', missing:'広告出演を、吉祥寺出身・在住という意味に広げない。'},
    {source:'kirarina-autumn', when:'2019年秋 · キラリナ', person:'フジサキタクマのモール作品', relation:'改装広告と館内企画', action:'フォトスポット、館内の探索、ワークショップを楽しむ', missing:'告知された企画であり、参加者の満足度を測った資料ではない。'},
    {source:'parco', when:'2021年 · 吉祥寺パルコ', person:'又吉直樹と街の人々', relation:'街とのゆかりを使った広告・参加企画', action:'好きな場所や過ごし方を共有する', missing:'街に暮らす全員の意見を集めたものではない。'}
  ],
  mediaPolicy: {
    visible:'公式発表に埋め込まれたYouTube動画を、公式プレイヤーのまま表示します。',
    linked:'広告・ポスターの静止画は、各発表元のページで確認できます。',
    withheld:'プレス素材を一般サイトへ転載できる明示的な許諾は確認できていないため、画像ファイルの複製・保存・切り抜きは行っていません。'
  },
  timeline: [
    {year:'2010', title:'ロンロンからアトレへ', source:'atre-history', text:'会社沿革は2010年4月に吉祥寺ロンロンをアトレ化したと記録している。高校時代に何と呼んでいたかは、世代の中でも分かれそうだ。'},
    {year:'2014', title:'駅の南北を結ぶ通路の整備', source:'city-history', text:'市の年表には4月の南北自由通路整備が載る。店の名前だけでなく、駅から街へ歩く経路も比較の対象になる。'},
    {year:'2014', title:'キラリナ京王吉祥寺が開業', source:'kirarina-spring', text:'京王電鉄の施設概要は開業日を2014年4月23日と記載。2014年より前の高校時代を振り返る人にとっては、現在と違う駅前を確かめる目印になる。'},
    {year:'2015', title:'作品の企画が街へ来る', source:'durarara', text:'吉祥寺パルコが「デュラララ!!」の展示・販売企画を告知。街の歴史的なゆかりとは別に、期間限定の目的地が生まれる例。'},
    {year:'2019', title:'施設が想定する過ごし方も変える', source:'kirarina-autumn', text:'キラリナは幅広い年代・生活スタイルに対応する改装を発表。広告だけの変化ではなく、施設側が示した対象と売場計画を併せて読める。'},
    {year:'2021', title:'制約のある時期に、街の楽しみを共有', source:'parco', text:'パルコの発表はコロナ禍の制約を背景として明記し、街の好きな場所や過ごし方を共有する企画を案内した。'},
    {year:'2024', title:'建て替えだけが街の変化ではない', source:'atre-2024', text:'アトレは本館2階の一部などの改装を発表。開発・改装・ブランド変更を同じ「再開発」とまとめず、何が変わったかを分けて辿りたい。'},
    {year:'2026', title:'南口の交通環境は、なお検討が続く', source:'city-2026', text:'市は事業中の駅前広場だけでは改善されない交通課題も示している。街は完成済みの結果だけでなく、進行中の課題も抱えている。'}
  ],
  sections: [
    {title:'有名人が出ている。でも、街との関係は同じではない', kind:'感情書店の読み解き', text:'人物名だけを集めると、どれも「吉祥寺ゆかり」に見えてしまう。ところが資料を関係の種類で整理すると、広告出演、展示会場、街での生活に触れた紹介は別物だと分かる。街の魅力は、有名人の人数より、その人や作品とここで何が起きたかから辿りたい。'},
    {title:'店を宣伝する広告が、街の過ごし方を集めていた', kind:'確認できること', source:'parco', text:'パルコは2021年の吉祥寺店40周年企画に又吉直樹を起用。発表には、街の人が好きな場所や過ごし方をポスター、コラム、SNSで共有する企画も記されている。商品だけでなく、街で過ごす時間を扱う広告だった。'},
    {title:'用事が先の訪問も、街が先の訪問もある', kind:'確認できること', source:'survey', text:'開発公社の2024年調査概要は、平日には仕事・学校、週末には買い物・飲食が多いと報告している。また、特定の用事に先立って吉祥寺で過ごすことを選ぶ層にも言及している。同じ街への訪問でも、目的は一つではない。'},
    {title:'売っているものより、そこで過ごす自分に惹かれる？', kind:'感情書店の読み解き', text:'二つを並べると、「何が買えるか」とは別に「どんな時間を過ごせるか」で街を選ぶ、という問いが浮かぶ。広告が提案する楽しみと、自分が街へ行く理由は、重なるだろうか。これは編集上の問いであり、広告が来街を増やしたという結論ではない。'},
    {title:'広告に映っていない吉祥寺もある', kind:'次に確かめたいこと', text:'仕事に向かう人、学校へ通う人、買い物をする人では、同じ道の意味も違うはずだ。今後は同時期の複数の広告、公開インタビュー、調査を比べ、目立つ風景だけでなく、語られにくい用事や不便さも探したい。この資料群だけで世代差は結論づけない。2019年の2資料は同じ施設の改装の続報であり、独立した二つの傾向としては数えない。'}
  ]
}];
