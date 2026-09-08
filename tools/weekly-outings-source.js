'use strict';
module.exports = {
  audiences: [
    {id:'couple',label:'恋人と',note:'二人で眺めて、話す時間'},
    {id:'children',label:'子どもと',note:'小さな子との休憩・設備も確認'},
    {id:'family',label:'家族で',note:'子どもから大人まで、一緒に発見'},
    {id:'friends',label:'友人と',note:'一緒に観て、感想を交わす'},
    {id:'solo',label:'ひとりで',note:'自分のペースで、好きなものへ'}
  ],
  issues: [{start:'2026-09-07',end:'2026-09-14',label:'9月7日〜13日のおすすめ',checkedAt:'2026-09-08',spots:[
    {audience:'couple',id:'inokashira',name:'井の頭恩賜公園',city:'吉祥寺',hook:'映画の余韻を持って、二人で池のまわりへ。',reason:'同じ風景を見ながら、気になった景色や作品の話をする散歩として選びました。',culture:'映画『PARKS』から公園の風景へ。',cultureUrl:'/v3-prototype/culture-experience-r2/kichijoji/',image:'/assets/inokashira-pond.jpg',imageAlt:'井の頭恩賜公園の池',format:'屋外・散歩',time:'30〜60分',practical:'散歩時間は編集部の目安です。雨天・暑さに合わせて無理のない範囲で。園内施設の営業は施設ごとに異なります。',url:'https://www.tokyo-park.or.jp/park/inokashira/',action:'公園の公式案内を見る'},
    {audience:'children',id:'inokashira-zoo',name:'井の頭自然文化園',city:'吉祥寺',hook:'今日は何が気になった？ 子どもの発見についていく。',reason:'生き物や園内の風景を、子どものペースで見る過ごし方として選びました。',culture:'自然を観察する時間から、絵や物語への興味へ。これは編集上の楽しみ方の提案です。',cultureUrl:'/discover/kichijoji/book.html',image:'/assets/city-kichijoji.jpg',imageAlt:'吉祥寺の街の参考写真。施設の写真ではありません',format:'主に屋外・生き物の観察',time:'60〜90分',practical:'公式案内に授乳室2か所・トイレのおむつ交換台の記載があります。本園管理事務所の授乳室はベビーカー持込み不可・女性のみ利用などの条件があります。出発前に公式の乳幼児向け案内をご確認ください。時間は休憩を含め調整する編集部の目安です。',url:'https://www.tokyo-zoo.net/inokashira/visitor-info/infant-care/index.html',action:'公式の乳幼児向け案内を見る'},
    {audience:'family',id:'kichijoji-museum',name:'武蔵野市立吉祥寺美術館',city:'吉祥寺',hook:'一人一つ、気になった作品を選んで話そう。',reason:'同じ作品を見ても違うところに目が止まる。その違いを家族で話す時間として選びました。',culture:'美術作品との出会い。特別な知識を前提にしない楽しみ方の提案です。',cultureUrl:'/discover/kichijoji/',image:'/assets/city-kichijoji.jpg',imageAlt:'吉祥寺の街の参考写真。美術館の写真ではありません',format:'屋内・美術',time:'30〜60分',practical:'コピス吉祥寺A館7階。公式案内では小学生以下・65歳以上は入館無料。展示替え等の臨時休館があります。展示内容・開館日・料金を公式で確認してください。時間は編集部の目安です。',url:'https://www.musashino.or.jp/museum/',action:'展示・開館日を公式で確認'},
    {audience:'friends',id:'za-koenji',name:'座・高円寺',city:'高円寺',hook:'気になる舞台を一緒に選び、観た後に感想を交わす。',reason:'演劇やダンスなど、同じ舞台から違う発見を持ち帰る場所として選びました。',culture:'街の劇場から、演劇・ダンス・パフォーマンスへ。',cultureUrl:'/discover/koenji/video.html',image:'/assets/city-koenji.jpg',imageAlt:'高円寺の街の参考写真。劇場の写真ではありません',format:'屋内・舞台',time:'公演による',practical:'開催日・上演時間・料金・対象年齢・チケットの空きは公演ごとに異なります。今週の公演開催を保証するものではありません。公式の公演案内から予定に合う回を選んでください。',url:'https://za-koenji.jp/',action:'公式で公演を選ぶ'},
    {audience:'solo',id:'jimbocho-bookcenter',name:'神保町ブックセンター',city:'神保町',hook:'気になる一冊を探し、喫茶でひと息。',reason:'誰かのペースに合わせず本を探し、気になったテーマに立ち止まれる場所として選びました。',culture:'書店と喫茶のある場所から、次に読みたい本へ。',cultureUrl:'/discover/jinbocho/book.html',image:'/assets/city-jinbocho.jpg',imageAlt:'神保町の街の参考写真。店舗の写真ではありません',format:'屋内・本と喫茶',time:'30〜60分',practical:'書店・喫茶・イベントスペースを持つ施設です。飲食代・営業案内は公式で確認してください。席の空きや静かさは保証していません。時間は編集部の目安です。',url:'https://www.jimbocho-book.jp/',action:'営業・喫茶の公式案内を見る'}
  ]}]
};
