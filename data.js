/* ============================================================
 * data.js — データ格納用ファイル
 * 「みんなの感情書店」のコンテンツデータをまとめたファイルです。
 * main.js からは <script> の読み込み順によりグローバル変数として
 * 参照されます（例: BOOK_POOL, CATEGORIES, CHAT_TREE など）。
 * カテゴリidはすべて短縮形（moya等）で統一しています。
 * ============================================================ */

/* ---------- 15の感情の棚 ---------- */
const CATEGORIES = [
  { id:'moya', label:'モヤモヤ', def:'理由がはっきりしない、もやがかかったような気持ち。', quotes:[
    { text:'霧の中を歩くとき、大切なのは急ぐことではなく、足元を一歩ずつ確かめることだ。', source:'店主の手帳より' },
    { text:'すべての感情に、すぐ名前がつけられるわけではない。', source:'店主の手帳より' },
    { text:'曖昧さに耐える力も、ひとつの知性である。', source:'店主の手帳より' }
  ]},
  { id:'kodoku', label:'孤独', def:'ひとりだと感じる、静かな寂しさ。', quotes:[
    { text:'孤独は、埋めるものではなく、時に住みこなすものだ。', source:'店主の手帳より' },
    { text:'一人の時間は、自分自身と再会するための時間でもある。', source:'店主の手帳より' },
    { text:'寂しさを感じられるのは、誰かを大切に思える証拠でもある。', source:'店主の手帳より' }
  ]},
  { id:'gakkari', label:'がっかり', def:'期待していたものが叶わなかったときの落胆。', quotes:[
    { text:'期待した分だけ、がっかりもする。それは真剣に生きている証拠だ。', source:'店主の手帳より' },
    { text:'落胆は、次の期待を選び直すための、ただの通過点にすぎない。', source:'店主の手帳より' },
    { text:'がっかりした夜こそ、自分を甘やかしていい夜だ。', source:'店主の手帳より' }
  ]},
  { id:'hazukashii', label:'恥ずかしい', def:'消えてしまいたくなるような、きまり悪さ。', quotes:[
    { text:'恥ずかしさは、後から思えばたいてい笑い話になる。', source:'店主の手帳より' },
    { text:'完璧でいようとするから、恥ずかしさが生まれる。', source:'店主の手帳より' },
    { text:'不格好な自分ほど、後になって愛おしくなるものだ。', source:'店主の手帳より' }
  ]},
  { id:'ushirometai', label:'後ろめたい', def:'誰かに対する、小さな罪悪感やうしろめたさ。', quotes:[
    { text:'完璧な人間などいない。後ろめたさは、良心が生きている証だ。', source:'店主の手帳より' },
    { text:'自分を責め続けることは、償いにはならない。', source:'店主の手帳より' },
    { text:'許すことは、まず自分から始めていい。', source:'店主の手帳より' }
  ]},
  { id:'aseri', label:'焦り', def:'置いていかれるような、急かされるような気持ち。', quotes:[
    { text:'他人の時計で自分の人生を測る必要はない。', source:'店主の手帳より' },
    { text:'焦りは、まだ諦めていないという証拠でもある。', source:'店主の手帳より' },
    { text:'急ぐ人生の先に、必ずしも良いものが待っているとは限らない。', source:'店主の手帳より' }
  ]},
  { id:'kuyashii', label:'悔しい', def:'届かなかった、報われなかったことへの悔しさ。', quotes:[
    { text:'悔しさは、次に進むための燃料になる。', source:'店主の手帳より' },
    { text:'負けを認められる人は、次に勝てる人だ。', source:'店主の手帳より' },
    { text:'涙のあとには、また立ち上がる力が残っている。', source:'店主の手帳より' }
  ]},
  { id:'shitto', label:'嫉妬', def:'誰かを羨む、ざらついた気持ち。', quotes:[
    { text:'嫉妬は、自分の本当の願いを映す鏡だ。', source:'店主の手帳より' },
    { text:'他人の花を羨むより、自分の庭に水をやろう。', source:'店主の手帳より' },
    { text:'ざらついた気持ちも、正直に見つめれば道しるべになる。', source:'店主の手帳より' }
  ]},
  { id:'akogare', label:'憧れ', def:'手の届かない何かへの、まっすぐな憧れ。', quotes:[
    { text:'憧れは、まだ見ぬ自分への招待状だ。', source:'店主の手帳より' },
    { text:'遠い光にも、必ず最初の一歩がある。', source:'店主の手帳より' },
    { text:'憧れを持ち続けられることは、それ自体が才能だ。', source:'店主の手帳より' }
  ]},
  { id:'wakuwaku', label:'わくわく', def:'胸が高鳴る、前向きな期待や高揚。', quotes:[
    { text:'まだ見ぬ景色への期待こそ、生きる原動力だ。', source:'店主の手帳より' },
    { text:'わくわくする心を持つ人は、いつまでも若い。', source:'店主の手帳より' },
    { text:'胸の高鳴りに、素直に従っていい。', source:'店主の手帳より' }
  ]},
  { id:'ando', label:'安堵', def:'肩の力が抜けるような、深い安心感。', quotes:[
    { text:'安堵は、頑張った人にだけ訪れるご褒美だ。', source:'店主の手帳より' },
    { text:'ほっとできる瞬間を、見逃さず味わっていい。', source:'店主の手帳より' },
    { text:'安心できる場所があることは、それ自体が幸福だ。', source:'店主の手帳より' }
  ]},
  { id:'kansha', label:'感謝', def:'誰かの優しさに、静かに満たされる気持ち。', quotes:[
    { text:'感謝は、伝えた瞬間に二倍になる。', source:'店主の手帳より' },
    { text:'当たり前だと思っていたことほど、実は誰かの優しさだった。', source:'店主の手帳より' },
    { text:'ありがとうと言えることは、幸福を見つける力そのものだ。', source:'店主の手帳より' }
  ]},
  { id:'itooshii', label:'愛おしい', def:'かけがえのないものへの、深い愛おしさ。', quotes:[
    { text:'不完全なものほど、かけがえなく愛おしい。', source:'店主の手帳より' },
    { text:'愛おしいと感じる心は、世界を柔らかくする。', source:'店主の手帳より' },
    { text:'何気ない日常こそ、いちばんの宝物だ。', source:'店主の手帳より' }
  ]},
  { id:'hokorashii', label:'誇らしい', def:'自分の頑張りを、静かに誇れる気持ち。', quotes:[
    { text:'誰にも気づかれない頑張りにも、価値がある。', source:'店主の手帳より' },
    { text:'自分を誇れる人は、他人にも優しくなれる。', source:'店主の手帳より' },
    { text:'小さな達成の積み重ねが、いつか大きな自信になる。', source:'店主の手帳より' }
  ]},
  { id:'natsukashii', label:'懐かしい', def:'遠い日の記憶が、ふっと蘇る気持ち。', quotes:[
    { text:'懐かしさは、過去が今のあなたを支えている証拠だ。', source:'店主の手帳より' },
    { text:'思い出は、色褪せても消えることはない。', source:'店主の手帳より' },
    { text:'あの頃の自分も、今のあなたの一部だ。', source:'店主の手帳より' }
  ]}
];

/* ---------- 棚ごとの背表紙カラー（CATEGORIES と同じ順） ---------- */
const SPINE_COLORS = [
  '#5C6B8A','#3E4A6B','#8A7A6B','#D8909B','#6B5C7A',
  '#C97F5A','#A85C5C','#5C7A5C','#7FA8C9','#F0C060',
  '#A8C9A0','#E8B87F','#E8A0B0','#C9A85C','#D8B48A'
];

/* ---------- 棚ごとの実在書籍プール（各棚6冊以上・wave:1中心） ---------- */
const BOOK_POOL = [
  // moya
  { title:'夜と霧', by:'ヴィクトール・E・フランクル', tags:['moya','kodoku'], wave:1 },
  { title:'方丈記', by:'鴨長明', tags:['moya','natsukashii'], wave:1 },
  { title:'モヤモヤの正体', by:'ちきりん', tags:['moya'], wave:1 },
  { title:'嫌われる勇気', by:'岸見一郎・古賀史健', tags:['moya','aseri'], wave:1 },
  { title:'枕草子', by:'清少納言', tags:['moya','itooshii'], wave:1 },
  { title:'思考の整理学', by:'外山滋比古', tags:['moya'], wave:1 },
  { title:'downtown', by:'吉本ばなな', tags:['moya'], wave:2 },
  // kodoku
  { title:'人間失格', by:'太宰治', tags:['kodoku','ushirometai'], wave:1 },
  { title:'コンビニ人間', by:'村田沙耶香', tags:['kodoku'], wave:1 },
  { title:'孤独の科学', by:'ジョン・T・カシオポ', tags:['kodoku'], wave:1 },
  { title:'海辺のカフカ', by:'村上春樹', tags:['kodoku','akogare'], wave:1 },
  { title:'砂の女', by:'安部公房', tags:['kodoku'], wave:1 },
  { title:'一人称単数', by:'村上春樹', tags:['kodoku'], wave:1 },
  { title:'停止した時計', by:'小川洋子', tags:['kodoku'], wave:2 },
  // gakkari
  { title:'夜のピクニック', by:'恩田陸', tags:['gakkari','natsukashii'], wave:1 },
  { title:'失われた時を求めて', by:'マルセル・プルースト', tags:['gakkari','natsukashii'], wave:1 },
  { title:'ノルウェイの森', by:'村上春樹', tags:['gakkari','kodoku'], wave:1 },
  { title:'そして誰もいなくなった', by:'アガサ・クリスティ', tags:['gakkari'], wave:1 },
  { title:'蹴りたい背中', by:'綿矢りさ', tags:['gakkari'], wave:1 },
  { title:'風の歌を聴け', by:'村上春樹', tags:['gakkari'], wave:1 },
  { title:'流', by:'東山彰良', tags:['gakkari'], wave:2 },
  // hazukashii
  { title:'こころ', by:'夏目漱石', tags:['hazukashii','ushirometai'], wave:1 },
  { title:'人間椅子', by:'江戸川乱歩', tags:['hazukashii'], wave:1 },
  { title:'恥の多い生涯を送ってきました', by:'太宰治（『人間失格』より）', tags:['hazukashii'], wave:1 },
  { title:'桜の樹の下には', by:'梶井基次郎', tags:['hazukashii'], wave:1 },
  { title:'羅生門', by:'芥川龍之介', tags:['hazukashii','ushirometai'], wave:1 },
  { title:'瓶詰地獄', by:'夢野久作', tags:['hazukashii'], wave:1 },
  { title:'黒い雨', by:'井伏鱒二', tags:['hazukashii'], wave:2 },
  // ushirometai
  { title:'罪と罰', by:'フョードル・ドストエフスキー', tags:['ushirometai','kuyashii'], wave:1 },
  { title:'高瀬舟', by:'森鴎外', tags:['ushirometai'], wave:1 },
  { title:'金閣寺', by:'三島由紀夫', tags:['ushirometai'], wave:1 },
  { title:'砂糖菓子の弾丸は撃ちぬけない', by:'桜庭一樹', tags:['ushirometai'], wave:1 },
  { title:'火花', by:'又吉直樹', tags:['ushirometai','kuyashii'], wave:1 },
  { title:'悼む人', by:'天童荒太', tags:['ushirometai'], wave:1 },
  { title:'贖罪', by:'湊かなえ', tags:['ushirometai'], wave:2 },
  // aseri
  { title:'モモ', by:'ミヒャエル・エンデ', tags:['aseri'], wave:1 },
  { title:'限りある時間の使い方', by:'オリバー・バークマン', tags:['aseri'], wave:1 },
  { title:'走ることについて語るときに僕の語ること', by:'村上春樹', tags:['aseri','hokorashii'], wave:1 },
  { title:'夜のピクニック（再読）', by:'恩田陸', tags:['aseri'], wave:1 },
  { title:'反脆弱性', by:'ナシーム・ニコラス・タレブ', tags:['aseri'], wave:1 },
  { title:'マインドフルネスストレス低減法', by:'ジョン・カバットジン', tags:['aseri'], wave:1 },
  { title:'置かれた場所で咲きなさい', by:'渡辺和子', tags:['aseri'], wave:2 },
  // kuyashii
  { title:'firefly', by:'村山由佳', tags:['kuyashii'], wave:1 },
  { title:'一瞬の風になれ', by:'佐藤多佳子', tags:['kuyashii','hokorashii'], wave:1 },
  { title:'四畳半神話大系', by:'森見登美彦', tags:['kuyashii'], wave:1 },
  { title:'失敗の本質', by:'戸部良一ほか', tags:['kuyashii'], wave:1 },
  { title:'負けを生かす技術', by:'為末大', tags:['kuyashii'], wave:1 },
  { title:'博士の愛した数式', by:'小川洋子', tags:['kuyashii'], wave:1 },
  { title:'流浪の月', by:'凪良ゆう', tags:['kuyashii'], wave:2 },
  // shitto
  { title:'嫉妬論', by:'山本圭', tags:['shitto'], wave:1 },
  { title:'人間失格（再）', by:'太宰治', tags:['shitto'], wave:1 },
  { title:'黒革の手帖', by:'松本清張', tags:['shitto'], wave:1 },
  { title:'File15 嫉妬', by:'湊かなえ（『告白』収録想定）', tags:['shitto'], wave:1 },
  { title:'夜行観覧車', by:'湊かなえ', tags:['shitto'], wave:1 },
  { title:'グレート・ギャツビー', by:'F・スコット・フィッツジェラルド', tags:['shitto','akogare'], wave:1 },
  { title:'渇き。', by:'中村文則', tags:['shitto'], wave:2 },
  // akogare
  { title:'風立ちぬ', by:'堀辰雄', tags:['akogare','itooshii'], wave:1 },
  { title:'銀河鉄道の夜', by:'宮沢賢治', tags:['akogare'], wave:1 },
  { title:'ティファニーで朝食を', by:'トルーマン・カポーティ', tags:['akogare'], wave:1 },
  { title:'アルケミスト', by:'パウロ・コエーリョ', tags:['akogare'], wave:1 },
  { title:'星の王子さま', by:'サン＝テグジュペリ', tags:['akogare','itooshii'], wave:1 },
  { title:'いちご同盟', by:'三田誠広', tags:['akogare'], wave:1 },
  { title:'キッチン', by:'吉本ばなな', tags:['akogare'], wave:2 },
  // wakuwaku
  { title:'ハリー・ポッターと賢者の石', by:'J.K.ローリング', tags:['wakuwaku'], wave:1 },
  { title:'旅する力', by:'沢木耕太郎', tags:['wakuwaku','akogare'], wave:1 },
  { title:'夢を叶えるゾウ', by:'水野敬也', tags:['wakuwaku'], wave:1 },
  { title:'モンテ・クリスト伯', by:'アレクサンドル・デュマ', tags:['wakuwaku'], wave:1 },
  { title:'深夜特急', by:'沢木耕太郎', tags:['wakuwaku'], wave:1 },
  { title:'ヘルタースケルター', by:'岡崎京子', tags:['wakuwaku'], wave:1 },
  { title:'風の又三郎', by:'宮沢賢治', tags:['wakuwaku'], wave:2 },
  // ando
  { title:'かもめ食堂', by:'群ようこ', tags:['ando'], wave:1 },
  { title:'モモ（再）', by:'ミヒャエル・エンデ', tags:['ando'], wave:1 },
  { title:'つばめの手紙', by:'東野圭吾', tags:['ando'], wave:1 },
  { title:'コーヒーが冷めないうちに', by:'川口俊和', tags:['ando','itooshii'], wave:1 },
  { title:'よだかの星', by:'宮沢賢治', tags:['ando'], wave:1 },
  { title:'いのちの車窓から', by:'星野源', tags:['ando'], wave:1 },
  { title:'すーちゃん', by:'益田ミリ', tags:['ando'], wave:2 },
  // kansha
  { title:'いのちの初夜', by:'北条民雄', tags:['kansha'], wave:1 },
  { title:'ありがとうを言えたら', by:'伊集院静', tags:['kansha'], wave:1 },
  { title:'置き手紙', by:'重松清', tags:['kansha'], wave:1 },
  { title:'living', by:'重松清', tags:['kansha'], wave:1 },
  { title:'家族のはなし', by:'山本文緒', tags:['kansha'], wave:1 },
  { title:'博士の愛した数式（再）', by:'小川洋子', tags:['kansha'], wave:1 },
  { title:'あなたへ', by:'瀬尾まいこ', tags:['kansha'], wave:2 },
  // itooshii
  { title:'ちいさいおうち', by:'バージニア・リー・バートン', tags:['itooshii'], wave:1 },
  { title:'アルジャーノンに花束を', by:'ダニエル・キイス', tags:['itooshii'], wave:1 },
  { title:'注文の多い料理店', by:'宮沢賢治', tags:['itooshii'], wave:1 },
  { title:'ライオンのおやつ', by:'小川糸', tags:['itooshii'], wave:1 },
  { title:'西の魔女が死んだ', by:'梨木香歩', tags:['itooshii'], wave:1 },
  { title:'思い出のマーニー', by:'ジョーン・ロビンソン', tags:['itooshii'], wave:1 },
  { title:'岸辺の旅', by:'湯本香樹実', tags:['itooshii'], wave:2 },
  // hokorashii
  { title:'夜明け前', by:'島崎藤村', tags:['hokorashii'], wave:1 },
  { title:'一瞬の風になれ（再）', by:'佐藤多佳子', tags:['hokorashii'], wave:1 },
  { title:'GIVE&TAKE', by:'アダム・グラント', tags:['hokorashii'], wave:1 },
  { title:'夢をかなえるゾウ（再）', by:'水野敬也', tags:['hokorashii'], wave:1 },
  { title:'武士道', by:'新渡戸稲造', tags:['hokorashii'], wave:1 },
  { title:'雨ニモマケズ', by:'宮沢賢治', tags:['hokorashii'], wave:1 },
  { title:'置かれた場所で咲きなさい（再）', by:'渡辺和子', tags:['hokorashii'], wave:2 },
  // natsukashii
  { title:'思い出のマーニー（再）', by:'ジョーン・ロビンソン', tags:['natsukashii'], wave:1 },
  { title:'あのころはフリードリヒがいた', by:'ハンス・ペーター・リヒター', tags:['natsukashii'], wave:1 },
  { title:'兎の眼', by:'灰谷健次郎', tags:['natsukashii'], wave:1 },
  { title:'夏の庭 The Friends', by:'湯本香樹実', tags:['natsukashii','itooshii'], wave:1 },
  { title:'キッチン（再）', by:'吉本ばなな', tags:['natsukashii'], wave:1 },
  { title:'銀河鉄道の夜（再）', by:'宮沢賢治', tags:['natsukashii'], wave:1 },
  { title:'ビタミンF', by:'重松清', tags:['natsukashii'], wave:2 }
];

/* ---------- 棚ごとの背表紙タイトル案 ---------- */
const TITLE_TEMPLATES = {
  moya:['名前のない靄','霧の中の一頁','うまく言えない日'],
  kodoku:['ひとりの部屋','誰もいない頁','静かな夜の記録'],
  gakkari:['しぼんだ予定','届かなかった頁','肩を落とした日'],
  hazukashii:['消えたい夜の記録','顔から火が出た日','赤面の一頁'],
  ushirometai:['小さな棘の記録','言えなかった謝罪','後ろめたい頁'],
  aseri:['急かされた一日','置いていかれた気がした日','焦りの記録'],
  kuyashii:['届かなかった一歩','悔しさの記録','奥歯を噛んだ日'],
  shitto:['ざらついた頁','羨んだ夜の記録','黒い炎の記録'],
  akogare:['遠い光への頁','憧れの記録','まだ見ぬ景色'],
  wakuwaku:['胸が高鳴った日','まだ見ぬ明日への頁','わくわくの記録'],
  ando:['ほっとした夜','安堵の一頁','肩の力が抜けた日'],
  kansha:['ありがとうの記録','温かい頁','受け取った優しさ'],
  itooshii:['愛おしい一頁','かけがえのない記録','小さな宝物の日'],
  hokorashii:['誇らしい一頁','静かな達成の記録','よくやった日'],
  natsukashii:['懐かしい頁','あの頃の記録','セピア色の一日']
};

const RECOMMEND_TEMPLATES = {
  moya:['言葉にならない気持ちに、そっと寄り添う一冊です。','答えを急がなくていい、と教えてくれる一冊です。'],
  kodoku:['一人の時間を、豊かな時間に変えてくれる一冊です。','孤独を否定せず、そっと隣にいてくれる一冊です。'],
  gakkari:['落胆した心を、静かに慰めてくれる一冊です。','期待が外れた日の、良き道連れになる一冊です。'],
  hazukashii:['恥ずかしさを、いつか笑い話に変えてくれる一冊です。','不格好な自分を肯定してくれる一冊です。'],
  ushirometai:['小さな罪悪感を、そっと軽くしてくれる一冊です。','許すことを、教えてくれる一冊です。'],
  aseri:['焦る心に、深呼吸をくれる一冊です。','自分の歩幅を思い出させてくれる一冊です。'],
  kuyashii:['悔しさを、次への力に変えてくれる一冊です。','負けを認める強さを教えてくれる一冊です。'],
  shitto:['ざらついた気持ちの奥にある願いに、気づかせてくれる一冊です。','嫉妬を、自分を知る手がかりに変える一冊です。'],
  akogare:['憧れを、行動への一歩に変えてくれる一冊です。','遠い光への旅路をともにしてくれる一冊です。'],
  wakuwaku:['胸の高鳴りを、そのまま肯定してくれる一冊です。','まだ見ぬ明日への期待を後押ししてくれる一冊です。'],
  ando:['安堵の時間を、より深く味わわせてくれる一冊です。','ほっとひと息つける一冊です。'],
  kansha:['感謝の気持ちを、言葉にする助けになる一冊です。','受け取った優しさを思い出させてくれる一冊です。'],
  itooshii:['愛おしさを、より鮮やかにしてくれる一冊です。','かけがえのない日常に光を当てる一冊です。'],
  hokorashii:['誇らしい気持ちを、静かに肯定してくれる一冊です。','自分の頑張りに気づかせてくれる一冊です。'],
  natsukashii:['懐かしい記憶を、優しく呼び覚ましてくれる一冊です。','あの頃の自分と再会させてくれる一冊です。']
};

/* ---------- 音楽の動的反映（MUSIC_QUERIES） ---------- */
const MUSIC_QUERIES = {
  moya: [
    { artist: "羊文学", title: "1999", genre: "Shoegaze / Alternative", comment: "霧がかった思考や言語化できないモヤモヤを、ファズギターのノイズがそのまま肯定し包み込んでくれます。" },
    { artist: "STUTS & 松たか子 with 3exes", title: "Presence I", genre: "Lo-fi / Chill", comment: "答えが出ない夜に無理に解決しようとせず、揺れるビートに乗せてただ感情を漂わせるのに最適な温度感です。" },
    { artist: "キリンジ", title: "エイリアンズ", genre: "City Pop", comment: "都会の夜の孤独と、どうしようもなく渦巻く鬱屈とした感情を、極上のメロディが優しく引き受けます。" },
    { artist: "Tempalay", title: "大東京万博", genre: "Psychedelic Pop", comment: "雑多な思考が絡み合う夜に。サイケデリックで奇妙な音像が、モヤモヤを別の次元へと飛ばしてくれます。" },
    { artist: "D.A.N.", title: "Zidane", genre: "Minimal Indie", comment: "繰り返されるミニマルで冷たいビートが、答えの出ない思考のループに心地よく寄り添う一曲。" },
    { artist: "iri", title: "ナイトグルーヴ", genre: "R&B / Chill", comment: "スモーキーな歌声が、心に溜まった澱（おり）を夜風と一緒に少しだけ流してくれるような感覚に陥ります。" },
    { artist: "くるり", title: "ばらの花", genre: "Alternative", comment: "気の抜けたジンジャーエールのような、微かな焦燥感とモヤモヤに静かに寄り添う、深夜の特効薬です。" },
    { artist: "スピッツ", title: "夜を駆ける", genre: "Alternative Rock", comment: "美しいのにどこか不穏。心の奥底にある得体の知れない淀みを、文学的な歌詞でなぞり続けます。" },
    { artist: "サニーデイ・サービス", title: "セツナ", genre: "Indie Rock", comment: "粗削りなギターサウンドが、行き場のない鬱屈とした感情を無理に整えず、そのままの形で肯定します。" },
    { artist: "EGO-WRAPPIN'", title: "色彩のブルース", genre: "Jazz / Blues", comment: "大人の夜のアンニュイな空気に。煙のように揺らぐ複雑な感情を、そのまま味わい尽くすための曲です。" }
  ],
  wakuwaku: [
    { artist: "SIRUP", title: "LOOP", genre: "Night Groove / R&B", comment: "派手な高揚感ではなく、自室のベッドの上でフツフツと湧き上がる、大人でパーソナルな期待感を表現しています。" },
    { artist: "カネコアヤノ", title: "ロマンス宣言", genre: "Indie Pop", comment: "日常の中にある小さな革命や、明日へのささやかなワクワクを、力強い歌声で生々しく彩ってくれます。" },
    { artist: "Vaundy", title: "東京フラッシュ", genre: "Neo City Pop", comment: "都会の夜を歩きながら、これから何かが始まりそうな予感に胸を躍らせる、スタイリッシュな高揚感です。" },
    { artist: "TENDRE", title: "DOCUMENT", genre: "Soul / Pop", comment: "新しいフェーズに向かう自分の背中を、心地よいベースラインと柔らかい声がグルーヴィーに押してくれます。" },
    { artist: "PUNPEE", title: "Renaissance", genre: "Hip Hop", comment: "SF映画の主人公になったような、日常が少しだけ特別に見えてくるようなワクワク感を味わえるビートです。" },
    { artist: "星野源", title: "喜劇", genre: "R&B / Pop", comment: "血の通った温かいビートが、明日という日への静かな期待と、ささやかな喜びをじんわりと育ててくれます。" },
    { artist: "TOMOO", title: "Super Ball", genre: "Piano Pop", comment: "弾むようなピアノの旋律が、抑えきれない好奇心や無邪気な楽しみを、大人の感性で上品に表現します。" },
    { artist: "tofubeats", title: "水星 feat.オノマトペ大臣", genre: "Club / Pop", comment: "深夜から夜明けにかけての魔法のような時間帯に、未来への期待を淡く輝かせてくれるアンセムです。" },
    { artist: "Nulbarich", title: "NEW ERA", genre: "Acid Jazz / Pop", comment: "新しい風が吹き込むような爽快感。軽快なリズムに乗せて、自分の中の新しい可能性に胸が躍ります。" },
    { artist: "唾奇 × Sweet William", title: "Let me", genre: "Chill Rap", comment: "チルアウトしながらも、内側から静かに沸騰してくるような、等身大でクールな期待感に包まれます。" }
  ],
  hokorashii: [
    { artist: "中村佳穂", title: "きっとね！", genre: "Soul / Uplifting", comment: "自分の選択や頑張りを、軽やかに、しかし確かなグルーヴで「それでいいんだよ」と肯定してくれます。" },
    { artist: "坂本龍一", title: "Aqua", genre: "Post-Classical", comment: "何かを成し遂げた後や踏ん張った自分を静かに讃えるような、深い自己肯定と静寂の時間をお届けします。" },
    { artist: "KID FRESINO", title: "Coincidence", genre: "Hip Hop", comment: "鋭いビートとフロウが、自分の足で立ち、自分の人生を切り拓いているという確かな誇りをブーストさせます。" },
    { artist: "折坂悠太", title: "朝顔", genre: "Acoustic / Folk", comment: "地に足をつけて生きる日々の力強さを、唯一無二の歌声で土着的に、そして雄大に讃えてくれます。" },
    { artist: "SUPER BEAVER", title: "人として", genre: "Rock", comment: "泥臭く生き抜いた自分自身に対して、真正面から「よくやった」と胸を張らせてくれるストレートな熱量です。" },
    { artist: "宇多田ヒカル", title: "道", genre: "Pop / Dance", comment: "これまで歩んできた道のりと、これから進む道への誇りを、しなやかでダンサブルなビートで祝福します。" },
    { artist: "BUMP OF CHICKEN", title: "アンサー", genre: "Alternative Rock", comment: "迷いながらも手にした自分だけの答えを、透明感のあるギターサウンドが高らかに祝福してくれます。" },
    { artist: "Omoinotake", title: "モラトリアム", genre: "Piano Rock", comment: "葛藤を乗り越え、自分のアイデンティティを確立した瞬間の、静かで熱い誇りをエモーショナルに歌い上げます。" },
    { artist: "クラムボン", title: "シカゴ", genre: "Post Rock", comment: "日常の些細な達成を、浮遊感のあるサウンドと力強いリズム隊が、ドラマチックな誇りへと昇華させます。" },
    { artist: "Awich", title: "Remember", genre: "Hip Hop / Soul", comment: "逆境を跳ね返して生きる強さと、自分自身であることの誇りを、圧倒的なスケール感で刻み込みます。" }
  ],
  ushirometai: [
    { artist: "藤井風", title: "罪の香り", genre: "Dark R&B", comment: "隠しきれない罪悪感や後ろめたさを、ジャジーで色気のあるメロディによって一種の美学として昇華させます。" },
    { artist: "きのこ帝国", title: "クロノスタシス", genre: "Melancholic Alternative", comment: "少しの背徳感や後悔を抱えながら夜道を歩くような、ダウナーでセンチメンタルな空気にぴったり寄り添います。" },
    { artist: "米津玄師", title: "死神", genre: "Alternative Pop", comment: "落語をモチーフにしたシニカルな世界観が、自分の中にあるズルさや後ろ暗い部分を皮肉交じりに肯定します。" },
    { artist: "King Gnu", title: "白日", genre: "Alternative R&B", comment: "消し去りたい過去や過ちに対する後悔を、冬の冷たい空気のように澄み切ったサウンドで浄化してくれます。" },
    { artist: "syrup16g", title: "落堕", genre: "Alternative Rock", comment: "堕ちていく自分への諦めと後ろめたさを、ヒリヒリするようなギターノイズと共に吐き出す深夜の劇薬です。" },
    { artist: "椎名林檎", title: "罪と罰", genre: "Rock", comment: "ドロドロとした罪悪感や情念を、鋭利な刃物のような歌声とバンドサウンドでドラマチックに切り裂きます。" },
    { artist: "ちゃんみな", title: "Never Grow Up", genre: "R&B / Pop", comment: "断ち切れない関係性に対する甘い後ろめたさを、等身大の言葉とメロウなトラックで描いています。" },
    { artist: "indigo la End", title: "夏夜のマジック", genre: "Indie Rock", comment: "過去の恋愛に対する消えない未練と背徳感を、アーバンで切ないメロディに乗せて美しくフラッシュバックさせます。" },
    { artist: "クリープハイプ", title: "ラブホテル", genre: "Alternative", comment: "どうしようもない一夜の後悔と情けなさを、独特の高音ボーカルと生々しい歌詞でチクリと刺してきます。" },
    { artist: "My Hair is Bad", title: "真赤", genre: "Rock", comment: "若さゆえの過ちや赤裸々な後ろめたさを、疾走感のあるギターに乗せて隠すことなく叫び散らします。" }
  ],
  natsukashii: [
    { artist: "くるり", title: "琥珀色の街、上海蟹の朝", genre: "Alternative Folk / Hip Hop", comment: "過去の情景と今の自分が交差するような、強烈なノスタルジーと都会的な洗練が同居しています。" },
    { artist: "cero", title: "Summer Soul", genre: "Modern City Pop", comment: "過ぎ去った記憶を、ただ感傷に浸るだけでなく、洗練されたアーバンな音色で心地よくフラッシュバックさせます。" },
    { artist: "宇多田ヒカル", title: "First Love", genre: "R&B / Pop", comment: "誰もが胸の奥にしまっている原風景のような記憶を、圧倒的な歌唱力で夜の静寂に呼び起こします。" },
    { artist: "フジファブリック", title: "若者のすべて", genre: "Alternative Rock", comment: "二度と戻らない夏の終わりと、過ぎ去った青春の匂いを、痛いほどのノスタルジーで包み込む名曲です。" },
    { artist: "サカナクション", title: "忘れられないの", genre: "City Pop / Electro", comment: "80年代の空気感をまとったサウンドが、架空の懐かしい記憶すらも色鮮やかに脳内へ立ち上がらせます。" },
    { artist: "荒井由実", title: "ひこうき雲", genre: "Folk / Pop", comment: "セピア色に染まった遠い日の記憶が、アコースティックの乾いた音色と共に静かに蘇ってきます。" },
    { artist: "never young beach", title: "明るい未来", genre: "Indie Pop", comment: "昭和の歌謡曲にも通じる温かく陽気なメロディが、家族や昔の恋人とのささやかな日々を懐かしくさせます。" },
    { artist: "スチャダラパー", title: "サマージャム'95", genre: "Hip Hop", comment: "90年代のゆるい夏の空気感が真空パックされた、いつ聴いても「あの頃」に戻れるタイムマシンのような曲です。" },
    { artist: "ASIAN KUNG-FU GENERATION", title: "ソラニン", genre: "Alternative Rock", comment: "モラトリアム期の焦燥と、すでに過去になってしまった若き日々の輝きを、切なくも力強く鳴らします。" },
    { artist: "森山直太朗", title: "夏の終わり", genre: "Acoustic / Folk", comment: "祭りの後のような言い知れぬ寂しさと懐かしさを、透き通るようなファルセットが優しく撫でていきます。" }
  ],
  kuyashii: [
    { artist: "toe", title: "グッドバイ", genre: "Emotional / Math Rock", comment: "言葉にならない悔しさのうねりや激情を、変拍子とインストゥルメンタルの爆発力でダイレクトに代弁してくれます。" },
    { artist: "ZORN", title: "My Life", genre: "Hip Hop", comment: "泥臭い敗北感や忸怩たる思いを抱えながらも、再び日常を生き抜こうとするリアルな言葉が心に刺さります。" },
    { artist: "MOROHA", title: "革命", genre: "Acoustic / Spoken Word", comment: "どうしようもない無力感と悔しさを、アコギ一本と魂の叫びで真っ向から撃ち抜き、再起を誓わせます。" },
    { artist: "エレファントカシマシ", title: "悲しみの果て", genre: "Rock", comment: "打ちひしがれたどん底の夜に、悔しさを飲み込み、それでも前を向くための武骨で優しいアンセムです。" },
    { artist: "amazarashi", title: "空に歌えば", genre: "Alternative Rock", comment: "理不尽な現実への悔しさと抗いを、ポエトリーリーディングのような濃密な歌詞と轟音で叩きつけます。" },
    { artist: "般若", title: "あの頃じゃねえ", genre: "Hip Hop", comment: "過去の自分への苛立ちや、現状への悔しさをバネにして、泥水をすするような執念で立ち上がる一曲です。" },
    { artist: "Age Factory", title: "TONBO", genre: "Alternative Rock", comment: "ヒリヒリとするような焦燥感と、届かないもどかしさを、荒々しいオルタナティブサウンドで咆哮します。" },
    { artist: "マカロニえんぴつ", title: "ヤングアダルト", genre: "Pop Rock", comment: "理想通りにいかない夜、情けない自分への悔しさを「絶望ごっこ」として笑い飛ばしながら寄り添ってくれます。" },
    { artist: "BUMP OF CHICKEN", title: "才悩人応援歌", genre: "Rock", comment: "才能がないと打ちひしがれる夜に、その悔しさすらも生きる証明なのだと全力で肯定してくれる救いの曲です。" },
    { artist: "あいみょん", title: "生きていたんだよな", genre: "Acoustic", comment: "世の中の不条理に対する怒りや悔しさを、生々しいアコースティックギターのストロークと共に刻み込みます。" }
  ],
  kodoku: [
    { artist: "君島大空", title: "遠視のコントラルト", genre: "Bedroom Pop", comment: "誰もいない部屋で一人きりの時間に、そっと毛布をかけてくれるような、極めてパーソナルで繊細な音像です。" },
    { artist: "Nujabes", title: "Aruarian Dance", genre: "Ambient Beat", comment: "孤独をネガティブな寂しさとしてではなく、自分と向き合うための美しく豊かな時間として再定義してくれます。" },
    { artist: "崎山蒼志", title: "夏至", genre: "Acoustic Folk", comment: "静寂の中で自分の内面へと深く沈み込んでいくような、鋭利で純粋なアコースティックの調べです。" },
    { artist: "青葉市子", title: "月の丘", genre: "Folk", comment: "真夜中の暗闇の中で、一筋の月の光のように静かに心へ差し込み、絶対的な孤独を優しく見守ります。" },
    { artist: "Cornelius", title: "Breezin'", genre: "Ambient / Electronica", comment: "水の中を漂うような心地よい電子音が、社会から切り離された一人の時間を、極上のリラクゼーションに変えます。" },
    { artist: "Spangle call Lilli line", title: "nano", genre: "Post Rock", comment: "冷たさと温かさが同居するウィスパーボイスが、孤独な夜の思考の海をどこまでも深く漂わせてくれます。" },
    { artist: "Daichi Yamamoto", title: "Let It Be", genre: "Hip Hop", comment: "一人で抱え込む孤独を、メロウなビートと寄り添うようなフロウが「そのままでいい」と肯定してくれます。" },
    { artist: "Ichiko Aoba", title: "Asleep Among Endives", genre: "Acoustic", comment: "世界の終わりに一人で取り残されたような、美しくも寂寥感のある音色に、ただただ身を委ねたくなります。" },
    { artist: "Haruka Nakamura", title: "Arno", genre: "Ambient / Classical", comment: "ピアノの静謐な響きが、孤独でこわばった心をゆっくりと溶かし、深い内省の時間を与えてくれます。" },
    { artist: "七尾旅人", title: "サーカスナイト", genre: "Alternative", comment: "都会の片隅で感じるどうしようもない孤独感を、甘くメランコリックなメロディが優しく抱きしめる夜の賛歌です。" }
  ],
  ando: [
    { artist: "ハナレグミ", title: "深呼吸", genre: "Acoustic Chill", comment: "張り詰めていた糸がふっと切れた夜に、温かいお茶を飲んだ時のような、確かな安心感を与えてくれる声です。" },
    { artist: "rei harakami", title: "owari no kisetsu", genre: "Electronica", comment: "優しい電子音が、一日の終わりの緊張やこわばった感情を、時間をかけてゆっくりと解きほぐしてくれます。" },
    { artist: "星野源", title: "くだらないの中に", genre: "Acoustic", comment: "飾らない日常の描写と温かいギターの音が、無事に一日を終えられたことへの深い安堵感をもたらします。" },
    { artist: "大橋トリオ", title: "HONEY", genre: "Acoustic Pop", comment: "暖炉の火を見つめているような、オーガニックで優しいアンサンブルが、疲れた心を芯から温めます。" },
    { artist: "コトリンゴ", title: "悲しくてやりきれない", genre: "Pop / Cover", comment: "全てを吐き出した後に訪れる、凪のような安堵の時間。透明な歌声が優しく心の隙間を埋めてくれます。" },
    { artist: "菅田将暉", title: "虹", genre: "Acoustic Pop", comment: "雨上がりの空を見上げるような、当たり前の日常がそこにあることへの絶対的な安心感を歌い上げます。" },
    { artist: "高木正勝", title: "Girls", genre: "Piano / Classical", comment: "自然の営みを感じるような大らかなピアノの旋律が、日々の悩みすらも包み込む圧倒的な安心感を与えます。" },
    { artist: "EVISBEATS", title: "ゆれる feat. 田我流", genre: "Chill Hip Hop", comment: "肩の力を抜いて、揺れるビートに身を任せるだけ。今日を生き延びた自分を労うための最高のチルソングです。" },
    { artist: "ペトロールズ", title: "雨", genre: "Indie R&B", comment: "雨降りの夜に部屋の中で感じる、外の世界から守られているような独特の安堵感を、艶やかなギターと共に。" },
    { artist: "Predawn", title: "Suddenly", genre: "Acoustic", comment: "絵本を読み聞かせてもらっているような、ノスタルジックで柔らかな歌声が、深い眠りへと誘ってくれます。" }
  ],
  aseri: [
    { artist: "サカナクション", title: "ネイティブダンサー", genre: "Up-tempo Alternative", comment: "焦燥感を無理に抑え込むのではなく、その心拍数の速さをそのまま心地よいステップへと変換してくれます。" },
    { artist: "崎山蒼志", title: "Samidare", genre: "Indie Folk", comment: "焦って空回りする鼓動とリンクするような、鋭くも切迫感のあるアコースティックギターのストロークが共鳴します。" },
    { artist: "Number Girl", title: "透明少女", genre: "Alternative Rock", comment: "何かを焦り、急き立てられるような都市のスピード感を、鋭角なギターリフと共に駆け抜けます。" },
    { artist: "ずっと真夜中でいいのに。", title: "秒針を噛む", genre: "Up-tempo Pop", comment: "時間が足りない焦りや自己嫌悪を、高速のピアノリフとスリリングなメロディに乗せて夜空に放ちます。" },
    { artist: "Vaundy", title: "不可幸力", genre: "Alternative R&B", comment: "どうにもならない現実への焦りや虚無感を、重たいベースラインと気怠いボーカルで乗りこなしていく一曲。" },
    { artist: "ゲスの極み乙女。", title: "キラーボール", genre: "Indie Rock", comment: "心がざわつき、立ち止まっていられない夜の焦燥感を、狂騒的なダンスビートへと昇華させます。" },
    { artist: "秋山黄色", title: "やさぐれカイドー", genre: "Rock", comment: "焦りからくる自暴自棄な感情を、攻撃的なギターサウンドと共に掻き鳴らし、モヤモヤを吹き飛ばします。" },
    { artist: "Base Ball Bear", title: "changes", genre: "Rock", comment: "早く変わらなきゃいけないという焦りを、疾走感あふれるギターロックが肯定し、背中を押してくれます。" },
    { artist: "神山羊", title: "YELLOW", genre: "Electro Pop", comment: "焦燥感すらもお洒落なグルーヴに変換してしまう、中毒性のあるエレクトロニックなビートが夜を支配します。" },
    { artist: "People In The Box", title: "旧市街", genre: "Math Rock", comment: "迷路に迷い込んだような焦りと不安を、変拍子と繊細なアンサンブルで見事なアートへと仕立て上げています。" }
  ],
  itooshii: [
    { artist: "鈴木真海子", title: "Contact", genre: "Mellow Indie", comment: "日常の些細な瞬間や身近な人への「押し付けがましくない、体温のような愛」をゆるやかに表現しています。" },
    { artist: "ハンバート ハンバート", title: "ぼくのお日さま", genre: "Acoustic Pop", comment: "飾らない言葉とアコースティックの音色で紡がれる、不器用だけど確かな愛情の形が心に染み渡ります。" },
    { artist: "奇妙礼太郎", title: "君が誰かの彼女になりくさっても", genre: "Acoustic", comment: "どうしようもなく泥臭く、それでいて純粋な愛おしさを、魂を絞り出すような声で歌い上げます。" },
    { artist: "Vaundy", title: "napori", genre: "Chill R&B", comment: "夜のドライブや部屋でのまどろみに似合う、甘くアンニュイで、肌に触れるような距離感の愛おしさです。" },
    { artist: "LUCKY TAPES", title: "MOON", genre: "Urban Pop", comment: "夜風に吹かれながら感じる、大切な人へのロマンチックな愛おしさを、極上のアーバンソウルに乗せて。" },
    { artist: "くるり", title: "奇跡", genre: "Acoustic Rock", comment: "何気ない日常が続くことの尊さと、目の前にいる人への深く静かな愛情を、温かいバンドサウンドで包みます。" },
    { artist: "YUKI", title: "歓びの種", genre: "Pop", comment: "愛しい存在がそこにいるだけで世界が輝いて見えるような、溢れんばかりの純粋な愛情が弾けます。" },
    { artist: "マカロニえんぴつ", title: "なんでもないよ、", genre: "Pop Rock", comment: "特別な言葉はいらない、ただ「君がいい」というストレートで純度の高い愛おしさをエモーショナルに歌います。" },
    { artist: "宇多田ヒカル", title: "花束を君に", genre: "Pop", comment: "感謝と共に込み上げてくる、切ないほどの愛おしさを、国民的なメロディと深いリリックで紡いだ名曲。" },
    { artist: "yonawo", title: "tokyo", genre: "Chill / R&B", comment: "気怠い夜の空気の中で、愛おしい記憶や感触だけを静かに反芻するような、メロウで美しいサウンドです。" }
  ],
  shitto: [
    { artist: "女王蜂", title: "火炎", genre: "Dark Pop / Rock", comment: "腹の底で燃えるどろどろとした嫉妬心を、隠すことなくスタイリッシュかつダンサブルに燃やし尽くしてくれます。" },
    { artist: "ミツメ", title: "煙突", genre: "Indie Rock", comment: "淡々としたサウンドの裏に隠れた、執着やモヤモヤした他者への感情を、冷たい情熱として表現しています。" },
    { artist: "Ado", title: "ギラギラ", genre: "Dark Pop", comment: "自分にないものを持つ他者への強烈なコンプレックスと嫉妬を、鋭いボーカルで痛快に歌い飛ばします。" },
    { artist: "Cocco", title: "強く儚い者たち", genre: "Alternative Rock", comment: "愛するものを奪われる恐怖や嫉妬、情念の恐ろしさを、美しいメロディに乗せて残酷なまでに描き出します。" },
    { artist: "あいみょん", title: "愛を伝えたいだとか", genre: "Funk Pop", comment: "思い通りにならない相手に対する、少しひねくれた嫉妬や独占欲を、グルーヴィーなサウンドで軽快に。" },
    { artist: "syrup16g", title: "Reborn", genre: "Alternative Rock", comment: "他者の幸福を素直に喜べない自分の醜さや嫉妬に、絶望しながらも微かな光を探す深夜の鎮魂歌です。" },
    { artist: "THE NOVEMBERS", title: "黒い虹", genre: "Shoegaze", comment: "渦巻くような嫉妬や黒い感情を、美しい轟音のノイズギターで塗りつぶし、カタルシスを与えてくれます。" },
    { artist: "ずっと真夜中でいいのに。", title: "お勉強しといてよ", genre: "Electro Pop", comment: "分かってくれない相手への苛立ちや嫉妬を、情報量の多いサウンドとハイトーンボイスでまくしたてます。" },
    { artist: "チャットモンチー", title: "染まるよ", genre: "Indie Rock", comment: "タバコの煙に紛れて消えていくような、女心に潜む静かな嫉妬や未練を、気怠いロックサウンドで。" },
    { artist: "SHISHAMO", title: "メトロ", genre: "City Pop", comment: "地下鉄に揺られながら感じる、自分だけが取り残されているような微かな嫉妬と劣等感を、淡々と歌います。" }
  ],
  hazukashii: [
    { artist: "柴田聡子", title: "後悔", genre: "Bedroom Pop", comment: "穴があったら入りたいような失敗や恥ずかしさを、チャーミングなポップセンスで笑い飛ばし救ってくれます。" },
    { artist: "BIM", title: "Bonita", genre: "Chill Rap", comment: "少し照れくさい感情や不格好な自分を、ゆるいビートに乗せて「まあいっか」と肯定してくれる空気感があります。" },
    { artist: "岡村靖幸", title: "カルアミルク", genre: "City Pop / Funk", comment: "若気の至りや情けない過去の自分を思い出し、少し赤面しながらも愛おしく振り返れる大人の名曲。" },
    { artist: "カネコアヤノ", title: "アーケード", genre: "Indie Folk", comment: "自分の不器用さや恥ずかしさを隠さず、アコギをかき鳴らしながら力強く肯定していく姿に勇気づけられます。" },
    { artist: "CHAI", title: "N.E.O.", genre: "Neo Kawaii / Punk", comment: "コンプレックスや恥ずかしい部分こそが個性だというメッセージを、パンキッシュなエネルギーで爆発させます。" },
    { artist: "TENDOUJI", title: "COCO", genre: "Indie Pop", comment: "失敗して恥をかいた夜でも、陽気なインディーポップの魔法にかかれば、全てが小さな喜劇に変わります。" },
    { artist: "スチャダラパー", title: "今夜はブギー・バック", genre: "Hip Hop", comment: "ダサい自分もイケてる夜も、すべてをひっくるめてクラシックなビートが優しく包み込む定番アンセム。" },
    { artist: "銀杏BOYZ", title: "BABY BABY", genre: "Punk / Alternative", comment: "泥臭くてみっともない、剥き出しのロマンチックさを、青春の恥ずかしさごと大声で歌い上げます。" },
    { artist: "リーガルリリー", title: "リッケンバッカー", genre: "Shoegaze", comment: "言葉にするのが恥ずかしいような繊細な感情を、透明な声と歪んだギターが代弁し、浄化してくれます。" },
    { artist: "眉村ちあき", title: "顔ドン", genre: "Pop", comment: "理不尽なことや恥ずかしい失敗すらも、圧倒的なポップネスとユーモアで明るいエネルギーへと変換させます。" }
  ],
  kansha: [
    { artist: "Ovall", title: "Stoked", genre: "Organic Soul", comment: "直接的な言葉にしなくても伝わる、温かいバンドアンサンブルに乗せた静かな「ありがとう」のバイブスです。" },
    { artist: "星野源", title: "日常", genre: "Acoustic Pop", comment: "ドラマチックな出来事ではない、なんてことない日々や周りの人への、地に足のついた感謝の念を感じさせます。" },
    { artist: "SUPER BEAVER", title: "ありがとう", genre: "Rock", comment: "照れくさくて言えない真っ直ぐな感謝の気持ちを、熱量あふれるロックバンドが代わりに叫んでくれます。" },
    { artist: "10-FEET", title: "アンテナラスト", genre: "Rock", comment: "亡き人や離れてしまった大切な人への、後悔と感謝が入り交じったエモーショナルな鎮魂歌です。" },
    { artist: "キヨサク", title: "想うた", genre: "Acoustic", comment: "離れて暮らす家族や友人への、温かくて飾らない感謝の気持ちが、ウクレレの音色と共に心に染み渡ります。" },
    { artist: "阿部芙蓉美", title: "空に星があるように", genre: "Acoustic", comment: "ウィスパーボイスが紡ぎ出す、世界や命そのものへの静かで根源的な感謝が、深夜の心を優しく撫でます。" },
    { artist: "Def Tech", title: "My Way", genre: "Reggae / Pop", comment: "支えてくれた仲間への感謝と、これからも自分らしく歩んでいく決意を乗せた、永遠のグッドバイブスです。" },
    { artist: "竹内まりや", title: "いのちの歌", genre: "Pop", comment: "生かされていること、出会えたことへの深い感謝を、普遍的なメロディで届ける珠玉のバラード。" },
    { artist: "RADWIMPS", title: "正解", genre: "Piano Rock", comment: "共に過ごした時間や教えてもらったことへの感謝を、卒業式のような厳かでエモーショナルな響きで歌います。" },
    { artist: "Nulbarich", title: "MAGIC WAYS", genre: "City Pop", comment: "山下達郎のカバー。日常を魔法のように彩ってくれる誰かへの感謝を、洗練された極上のグルーヴで。" }
  ],
  gakkari: [
    { artist: "never young beach", title: "お別れの歌", genre: "Melancholic Indie", comment: "肩を落とした心に、少し力の抜けたトロピカルで哀愁のあるギターが、寄り添うように響きます。" },
    { artist: "maco marets", title: "plain", genre: "Mellow Hip Hop", comment: "期待外れだった一日の終わりに、過剰な慰めではなく、すべてをフラットな感情に戻してくれる低体温なラップです。" },
    { artist: "奥田民生", title: "さすらい", genre: "Rock", comment: "がっかりするような出来事も「まあ、そんなもんさ」と風来坊のように笑い飛ばしてくれる大らかな一曲。" },
    { artist: "くるり", title: "東京", genre: "Alternative Rock", comment: "理想と現実のギャップに打ちひしがれた心を、泥臭くも温かいギターサウンドが優しく受け止めてくれます。" },
    { artist: "Fishmans", title: "ナイトクルージング", genre: "Dub / Dream Pop", comment: "落ち込んだ夜は、深海をたゆたうような圧倒的な浮遊感に身を任せ、全てを忘れて漂うのが一番です。" },
    { artist: "JJJ", title: "ひかり", genre: "Hip Hop", comment: "うまくいかない日々の落胆の中で、静かに燃え続ける自分だけの小さな光を見つめ直させてくれるビート。" },
    { artist: "キリンジ", title: "悪玉", genre: "City Pop", comment: "理不尽な目に遭ってすっかり嫌気が差した夜に。シニカルな歌詞と上質なポップスが毒抜きをしてくれます。" },
    { artist: "サニーデイ・サービス", title: "青春狂走曲", genre: "Indie Rock", comment: "何もかもうまくいかない夜の徒労感を、ノスタルジックなギターと枯れた歌声が優しく慰めてくれます。" },
    { artist: "スピッツ", title: "冷たい頬", genre: "Alternative", comment: "喪失感やがっかりした感情を、美しいアルペジオと透明な声が、まるで秋風のようにそっと連れ去ります。" },
    { artist: "クラムボン", title: "便箋歌", genre: "Pop", comment: "肩を落として帰ってきた夜、温かいお茶を飲んでほっと一息つくような、ささやかな癒やしをくれる音色。" }
  ],
  akogare: [
    { artist: "Yogee New Waves", title: "Climax Night", genre: "Dream Pop / City Pop", comment: "キラキラとした手の届かないものへのロマンチックな渇望を、心地よい浮遊感とともに描いています。" },
    { artist: "LUCKY TAPES", title: "22", genre: "Urban Soul", comment: "理想の自分や未来へ思わず手を伸ばしたくなるような、洗練されたブラスアレンジと甘いメロディが美しいです。" },
    { artist: "BUMP OF CHICKEN", title: "天体観測", genre: "Rock", comment: "見えないものを見ようとする、あの頃の無垢で真っ直ぐな憧れを、いつ聴いても色褪せないバンドサウンドで。" },
    { artist: "ASIAN KUNG-FU GENERATION", title: "君という花", genre: "Alternative Rock", comment: "手の届かない存在への焦燥と憧れを、四つ打ちのダンスビートと切ないギターリフで駆け抜けます。" },
    { artist: "Awesome City Club", title: "勿忘", genre: "City Pop", comment: "映画のような美しすぎる世界への憧憬や、触れられない存在への切ない想いをドラマチックに歌い上げます。" },
    { artist: "フリッパーズ・ギター", title: "恋とマシンガン", genre: "Shibuya-kei", comment: "海外の映画やカルチャーに対する無邪気な憧れが詰まった、お洒落で少し生意気なネオアコサウンド。" },
    { artist: "羊文学", title: "光るとき", genre: "Shoegaze", comment: "絶望の中にあっても、眩しい光や美しい世界への憧れを捨てきれない心に、寄り添いながら響く轟音です。" },
    { artist: "kZm", title: "Dream Chaser", genre: "Hip Hop", comment: "這い上がり、理想の場所へ辿り着いてやるというハングリーな憧れを、スタイリッシュなトラップビートで。" },
    { artist: "tofubeats", title: "LONELY NIGHTS", genre: "Club / Pop", comment: "都会の夜のきらめきに対する憧れと孤独感を、シンセサイザーの冷たくも温かい音色でロマンチックに描きます。" },
    { artist: "宇多田ヒカル", title: "Automatic", genre: "R&B", comment: "誰もが一度は夢見たような、完璧で圧倒的な才能とグルーヴに対する普遍的な憧れが詰まったクラシック。" }
  ]
};

