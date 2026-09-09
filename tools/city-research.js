'use strict';
// Source-grounded pilot. Facts and interpretation are separate; no source images,
// advertisement copy, interviews, or individual visitor data are republished.
module.exports = [{
  id: 'kichijoji-advertising', city: 'kichijoji',
  cityLabel: '吉祥寺',
  series: 'AIで街を多角的に読む',
  issue: '調査 01',
  title: '広告の吉祥寺と、あなたが行く吉祥寺。',
  lead: '広告が勧める吉祥寺の楽しみと、私たちが街へ行く理由は重なるだろうか。2015〜2021年の広告・販促企画と、2024年の来街者調査から考える。',
  lenses: ['広告', '来街目的', '駅と商業施設', '世代と時間'],
  publishedAt: '2026-09-09',
  modifiedAt: '2026-09-09',
  checkedAt: '2026-09-09',
  sources: [
    {id:'atre-history', title:'アトレ：会社沿革', publisher:'株式会社アトレ', publishedAt:'掲載日記載なし', period:'2010年4月', type:'運営会社の沿革', url:'https://www.atre.co.jp/company/corporate/history/', limitation:'吉祥寺ロンロンのアトレ化の記録。全店舗の入れ替わりや建物全体の建て替えを示すものではない。'},
    {id:'city-history', title:'武蔵野市：歴史年表', publisher:'武蔵野市', publishedAt:'掲載日記載なし', period:'2014年4月', type:'自治体の年表', url:'https://www.city.musashino.lg.jp/citypromotion_75/folder/history.html', limitation:'南北自由通路整備の年月を確認。通行しやすさの個人差や来街増加の因果は測定しない。'},
    {id:'atre-2024', title:'アトレ：吉祥寺の2024年リニューアル発表', publisher:'株式会社アトレ', publishedAt:'2024-09-12', period:'2024年10月の改装', type:'運営会社の改装発表', url:'https://www.atpress.ne.jp/news/407101', limitation:'一部売場の改装告知。施設全体の建て替えではない。当時の店を現在も営業中とは保証しない。'},
    {id:'city-2026', title:'武蔵野市：吉祥寺駅南口交通環境基本方針', publisher:'武蔵野市', publishedAt:'2026-08-03（更新）', period:'2026年の方針・検討状況', type:'自治体の交通環境方針', url:'https://www.city.musashino.lg.jp/shiseijoho/shisaku_keikaku/toshiseibibu_shisaku_keikaku/1041654.html', limitation:'方針・検討中の内容を完成済み整備として扱わない。'},
    {id:'durarara', title:'パルコ：デュラララ!!期間限定ショップの発表', publisher:'株式会社パルコ', publishedAt:'2015-11-12', period:'2015年11月13日〜30日（終了）', type:'販促企画の主催者発表', url:'https://prtimes.jp/main/html/rd/p/000000247.000003639.html', limitation:'期間限定の展示・販売企画の告知。作品の舞台や作者の居住地が吉祥寺であることの証拠ではない。'},
    {id:'kirarina-spring', title:'京王電鉄：キラリナ開業5周年と春の改装発表', publisher:'京王電鉄株式会社', publishedAt:'2019-03-18', period:'2019年4月の5周年・改装企画（終了）', type:'施設運営者の広告・改装発表', url:'https://prtimes.jp/main/html/rd/p/000000300.000022856.html', limitation:'磯村勇斗の起用はキャンペーンとの関係。出身地や居住地との関係を示すものではない。'},
    {id:'kirarina-autumn', title:'京王電鉄：キラリナ秋の改装とキャンペーン発表', publisher:'京王電鉄株式会社', publishedAt:'2019-09-19', period:'2019年11月〜12月の改装・販促企画（終了）', type:'施設運営者の広告・改装発表', url:'https://prtimes.jp/main/html/rd/p/000000363.000022856.html', limitation:'春と同一施設・同一年の改装計画に属する続報。独立した来街者調査として数えず、当時の店舗情報を現在の案内に転用しない。'},
    {id:'parco', title:'パルコ：吉祥寺パルコ40周年キャンペーン発表', publisher:'株式会社パルコ', publishedAt:'2021-03-09', period:'2021年3月19日〜5月31日の企画（終了）', type:'広告主の発表', url:'https://prtimes.jp/main/html/rd/p/000001505.000003639.html', limitation:'制作側が説明した企画意図。鑑賞者の受け取り方や広告効果の調査ではない。掲載していたYouTube動画は非公開を確認し、2026年9月9日にプレイヤーと視聴リンクを取り下げた。', media:{kind:'youtube',videoId:'jw5y9UXNp58',title:'吉祥寺パルコ40周年キャンペーンの公式ムービー',status:'withdrawn-private',note:'YouTubeで非公開となったため掲載を取り下げました。'}},
    {id:'survey', title:'吉祥寺来街動機等調査2024：結果発表', publisher:'一般財団法人武蔵野市開発公社', publishedAt:'2025-03-13', period:'2024年1月1日〜12月31日', type:'調査実施団体の結果概要', url:'https://prtimes.jp/main/html/rd/p/000000013.000070948.html', limitation:'フリーWi-Fi利用156,623端末を対象とする調査。人数や全来街者の無作為標本ではない。本稿は概要のみを参照し、設問別の母数・生データは未検証。'}
  ],
  comparisons: [
    {source:'durarara', when:'2015年 · 吉祥寺パルコ', person:'デュラララ!!', relation:'作品の展示・販売会場', action:'作品の展示や限定ショップに立ち寄る', missing:'作品のファンが、実際に何人来街したかは不明。'},
    {source:'kirarina-spring', when:'2019年春 · キラリナ', person:'磯村勇斗', relation:'5周年広告への起用', action:'館内ポスターや一日支配人イベントを楽しむ', missing:'広告出演を、吉祥寺出身・在住という意味に広げない。'},
    {source:'kirarina-autumn', when:'2019年秋 · キラリナ', person:'フジサキタクマのモール作品', relation:'改装広告と館内企画', action:'フォトスポット、館内の探索、ワークショップを楽しむ', missing:'告知された企画であり、参加者の満足度を測った資料ではない。'},
    {source:'parco', when:'2021年 · 吉祥寺パルコ', person:'又吉直樹と街の人々', relation:'街とのゆかりを使った広告・参加企画', action:'好きな場所や過ごし方を共有する', missing:'街に暮らす全員の意見を集めたものではない。'}
  ],
  mediaPolicy: {
    visible:'掲載していたYouTube動画は非公開となったため、プレイヤーと視聴リンクを取り下げました。',
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
    {title:'又吉直樹の広告から、街の過ごし方へ', kind:'当時の発表から', source:'parco', paragraphs:['2021年、吉祥寺パルコは40周年企画に又吉直樹を起用した。発表には、街の人が好きな場所や過ごし方を、ポスター、コラム、SNSで共有する企画も記されている。','宣伝していたのは、店の商品だけではない。街でどんな時間を過ごすかにも目を向けた広告だった。']},
    {title:'仕事で来る平日、買い物をする週末', kind:'調査から分かること', source:'survey', paragraphs:['武蔵野市開発公社の2024年調査概要では、平日は仕事・学校、週末は買い物・飲食を目的とする訪問が多いと報告されている。','具体的な用事を決める前に、吉祥寺で過ごすことを選ぶ層にも触れている。「何かをしに行く」と「まず吉祥寺へ行く」。同じ街でも、訪れる理由は一つではない。']},
    {title:'広告出演と、街で暮らすことは違う', kind:'感情書店の読み解き', paragraphs:['有名人の名前が広告にあるだけで、その人が吉祥寺に住んでいたとは言えない。広告に出演すること、展示の会場になること、街で暮らすことは、それぞれ違う関係だ。','人物名を集めるより、その人や作品と街で何が起きたかを辿る。そうすると、広告からも街とのつながりを読み取れる。']},
    {title:'売っているものより、そこで過ごす自分に惹かれる？', kind:'感情書店の読み解き', text:'二つを並べると、「何が買えるか」とは別に「どんな時間を過ごせるか」で街を選ぶ、という問いが浮かぶ。広告が提案する楽しみと、自分が街へ行く理由は、重なるだろうか。これは編集上の問いであり、広告が来街を増やしたという結論ではない。'},
    {title:'広告に映っていない吉祥寺もある', kind:'まだ分からないこと', paragraphs:['今回の資料だけでは、世代による違いや、広告を見て訪れた人の数は分からない。2019年の2資料も、同じ施設の改装についての続報だ。二つの別々の傾向を示す資料としては数えていない。','次に比べたいのは、同じ時期の広告、公開インタビュー、来街者調査。目立つ風景だけでなく、仕事や通学の用事、街で感じる不便さにも目を向けたい。']}
  ]
}, {
  id:'shimokitazawa-railway', city:'shimokitazawa', cityLabel:'下北沢',
  series:'あの頃の街に、もう一度。', issue:'調査 02',
  title:'下北沢の線路があった場所で、いま何をしている？',
  lead:'2013年の地下化、2020年のBONUS TRACK、2022年の下北線路街全面開業。かつて電車が走っていた場所を、年表と映画の入口から読み直す。変わったのは店だけだろうか。',
  lenses:['線路跡','建築と公共空間','映画','世代と時間'],
  publishedAt:'2026-09-09', modifiedAt:'2026-09-09', checkedAt:'2026-09-09',
  comparisonTitle:'線路跡を見る、4つの立場',
  comparisonIntro:'開業年表だけでは、街の変化は語りきれない。事業者、施設運営者、自治体の資料を並べると、同じ場所に違う役割が見えてくる。住民全体の評価を集めた調査ではありません。',
  timelineIntro:'2013年3月23日を境に、下北沢の記憶を重ねてみる。高校生だった人も、まだ来たことがなかった人も、自分が知る年から辿れます。年齢や世代による好みの違いを測定した記事ではありません。',
  timelineEnd:'地下化、個別施設の開業、エリアの全面開業は別の出来事です。街が一日で入れ替わったのではありません。',
  mediaIntro:{title:'まず、歩く場所の変化を映像で。',text:'世田谷区は、駅前広場や通路などを住民参加で整備する取り組みを映像で紹介しています。観光広告とは違う視点から、普段通る場所を眺めてみてください。',source:'setagaya'},
  nextTitle:'映画を観てから、もう一度この街へ。',
  nextText:'2022年のまちびらき告知には、K2での『街の上で』上映も登場します。開発の年表と、映画が描く街は別のもの。その違いも楽しんでみたい。2022年の上映は終了しており、現在の上映案内ではありません。',
  sources:[
    {id:'odakyu-history',title:'小田急電鉄：会社小史・略年表',publisher:'小田急電鉄',publishedAt:'掲載日記載なし',period:'2013年3月23日',type:'鉄道事業者の沿革',url:'https://www.odakyu.jp/company/history/',limitation:'東北沢〜世田谷代田間の在来線地下化完了日を確認する資料。住民の満足度や街全体の変化を説明するものではない。'},
    {id:'bonus',title:'BONUS TRACK：5周年記念展の告知',publisher:'BONUS TRACK NEWS',publishedAt:'2025年（5周年企画）',period:'2020年4月1日の開業と2025年の振り返り',type:'施設運営側の記録',url:'https://note.com/bonustrack_skz/n/n74bb3ce38f7a',limitation:'施設による自己紹介と周年企画。近隣全体の意見ではない。掲載された2025年の記念展は終了している。'},
    {id:'opening',title:'下北線路街ニュース Vol.16：全面開業と下北線路祭',publisher:'小田急電鉄',publishedAt:'2022-04-27',period:'2022年5月28日・29日（催しは終了）',type:'開発事業者の発表・PDF',url:'https://www.odakyu.jp/news/o5oaa100000239vp-att/o5oaa100000239vw.pdf',limitation:'全面開業の予定と当時の催しの告知。事業の成果を独立に評価した資料ではなく、現在の上映・営業日程には使えない。'},
    {id:'results',title:'小田急電鉄：2023年3月期決算短信',publisher:'小田急電鉄',publishedAt:'2023-04-28',period:'2022年度',type:'事業者の実績報告・PDF',url:'https://www.odakyu.jp/ir/financial/d9gsqg0000000tvx-att/odakyu_2022.4Q_tansin.pdf',limitation:'2022年5月の全面開業を事後に確認するために参照。告知と同じ事業者の資料であり、独立した二者による評価ではない。'},
    {id:'setagaya',title:'世田谷区：小田急線上部利用の街づくりの取り組み',publisher:'世田谷区',publishedAt:'2023-08-07',period:'線路跡地の公共施設整備',type:'自治体の説明・映像案内',url:'https://www.city.setagaya.lg.jp/02209/7713.html',limitation:'住民参加の整備プロセスを紹介する行政資料。すべての住民の賛同や利用実態、事業の因果効果を証明するものではない。'}
  ],
  comparisons:[
    {source:'odakyu-history',when:'鉄道の視点',person:'電車が通る場所',relation:'地下化された区間',action:'地上と地下の使われ方を分けて見る',missing:'地下化の年だけで、沿道の店の入れ替わりは分からない。'},
    {source:'bonus',when:'施設の視点',person:'BONUS TRACK',relation:'下北沢駅と世田谷代田駅の間の施設',action:'施設側が語る、場所を使い育てるという考え方を読む',missing:'運営者の理念を、そのまま利用者の実感とは扱わない。'},
    {source:'opening',when:'まちびらきの視点',person:'音楽、アート、映画',relation:'2022年の全面開業企画',action:'新しい空間に、どのような文化企画が置かれたかを見る',missing:'当時の催しの参加者数や、その後の定着はこの告知からは分からない。'},
    {source:'setagaya',when:'公共空間の視点',person:'駅前広場と通路',relation:'区民参加で検討された公共施設',action:'買い物以外に、通る・立ち止まる場所として眺める',missing:'紹介映像だけで、反対意見や使いづらさがないとは言えない。'}
  ],
  timeline:[
    {year:'2013',title:'3月23日、在来線が地下へ',source:'odakyu-history',text:'小田急の沿革は、東北沢〜世田谷代田間の在来線地下化完了を記録している。まずはこの年を、記憶を確かめる目印に。'},
    {year:'2020',title:'4月1日、BONUS TRACKが開業',source:'bonus',text:'施設の5周年告知は、2020年4月1日を開業日として振り返る。地下化の日と、新しい居場所の誕生日には時間差がある。'},
    {year:'2022',title:'5月、下北線路街が全面開業',source:'results',text:'翌年の決算短信で、全13エリアの全面開業を事後に確認できる。事前の発表だけで完了と判断しない。'},
    {year:'2023',title:'公共空間のつくり方を映像で知る',source:'setagaya',text:'区の紹介ページでは、駅前広場や通路等の計画にワークショップの意見を取り入れた取り組みを辿れる。商業施設の外も街の一部だ。'}
  ],
  sections:[
    {title:'線路跡を、歩く場所として見る',kind:'感情書店の提案',paragraphs:['新しい店を探すだけでなく、以前は通れなかった場所を歩く。広場で待ち合わせる。映画の帰りに立ち寄る。線路があった場所を手掛かりにすると、街の楽しみ方も変わりそうだ。','ここに挙げた過ごし方は編集部からの提案。実際の利用者を観察した調査結果ではない。']},
    {title:'再開発の告知の中に、映画があった',kind:'確認できること',source:'opening',text:'2022年のまちびらき発表は、ミニシアターK2で下北沢が舞台の映画『街の上で』を上映すると案内していた。新しい施設の紹介と、街を描いた作品への入口が同じ資料にある。'},
    {title:'以前から通う人は、どう感じている？',kind:'まだ分からないこと',paragraphs:['今回の5資料では、家賃の変化、閉店の理由、年代ごとの来街目的は検証できていない。以前から通う人や店を営む人への独自取材も行っていない。','開発側の説明だけでは、街の変化を評価しきれない。次回は、いつの出来事かが分かる公開記録と、掲載に同意いただいた人の声を合わせて考えたい。']}
  ]
}];
