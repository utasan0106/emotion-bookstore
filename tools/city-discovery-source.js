// Editorial input, never fetched by the browser. See docs/city-discovery/README.md.
'use strict';
const items = [];
const commonVideos = [
  {
    id: 'find-my-tokyo', title: 'Find my Tokyo. チャレンジャーズ', creator: '東京メトロ / 2024',
    hook: '知っている街の、まだ知らない楽しみ方へ。',
    note: '東京メトロが東京の新しい魅力を見つける企画として公開した企業広告です。このサイトの4街だけを扱う映像ではありません。',
    videoId: 'RpSlspjIeG8', sources: ['https://www.tokyometro.jp/news/2024/218221.html']
  },
  {
    id: 'toyota-loving-eyes', title: 'Loving Eyes', creator: 'TOYOTA / ブランドムービー',
    hook: '同じ道のりを、父と娘それぞれの目線で見つめる。',
    note: '自動車の安全技術を伝える企業広告で、父と娘の時間を二つの視点から描いた作品です。特定の街への案内ではありません。',
    videoId: 'mh_QCvulKSY', sources: []
  },
  {
    id: 'panasonic-life', title: 'Panasonic Quality「Life篇」', creator: 'パナソニック / 60秒',
    hook: '名もない一日の、小さな営みと人の表情を見る。',
    note: '暮らしの場面を描いたパナソニックの企業広告です。商品情報ではなく、人の生活を映した短編として選んでいます。',
    videoId: 'Bu5LNJYGY8k', sources: ['https://channel.panasonic.com/jp/']
  }
].map(video => ({...video, url: 'https://www.youtube.com/watch?v=' + video.videoId, checkedAt: '2026-09-08', playbackChecked: false}));
const add = (city, kind, id, title, creator, hook, relation, relationNote, url, action, sources = [], videoId = '') => items.push({
  city, kind, id, title, creator, hook, relation, relationNote, url, action,
  sources: [...new Set([...sources, ...(url.startsWith('https:') ? [url] : [])])],
  videoId, checkedAt: '2026-09-08', playbackChecked: false
});
const video = (city, id, title, creator, hook, relation, note, videoId, sources = []) => add(city, 'video', id, title, creator, hook, relation, note, 'https://www.youtube.com/watch?v=' + videoId, 'YouTubeでこの映像を見る', sources, videoId);
const audio = (city, id, title, creator, hook, relation, note, videoId, sources = []) => add(city, 'audio', id, title, creator, hook, relation, note, 'https://www.youtube.com/watch?v=' + videoId, 'YouTubeでこの音を聴く', sources, videoId);
const book = (city, id, title, creator, hook, relation, note, url, sources = []) => add(city, 'book', id, title, creator, hook, relation, note, url, '出版社で本の紹介・読書案内を見る', sources);
const film = (city, id, title, creator, hook, relation, note, url, action, sources = []) => add(city, 'film', id, title, creator, hook, relation, note, url, action, sources);
const koenjiFestival = 'https://za-koenji.jp/detail/?id=139';
const mizoguchi = 'https://www.shogakukan.co.jp/jinbocho-theater/features/2026-08-15_mizoguchi-kenji-70th.html';
const ninetiesFilm = 'https://www.shogakukan.co.jp/jinbocho-theater/features/2026-06-06_90s_2nd.html';
const crimeFilm = 'https://www.shogakukan.co.jp/jinbocho-theater/features/2026-04-25_crime-black-white.html';
const bausBook = 'https://books.bunshun.jp/ud/book/num/9784160089457';
const tefu = 'https://senrogai.com/event/by-tefu-lounge-bonus-track-members/';

// “Audio” is a listening collection. Some sources are filmed performances, but
// they are selected for the performance/sound itself and are never duplicated in
// the city video collection.
audio('koenji', 'moon-in-june-play', 'play!／帰れない山', 'Moon In June / 高円寺HIGH 2025', 'ギターの残響から、高円寺HIGHの客席へ。', '街のライブハウスでの演奏', '公開者「食パン」が2025年6月29日の高円寺HIGH公演として紹介するライブ映像です。この会場で鳴った演奏として紹介します。', 'm5T0OySBmEE');
audio('koenji', 'big-the-grape', 'THANKS GIVING LIVE', 'big the grape / 高円寺HIGH', '小さな会場の熱量を、バンドの演奏から聴く。', '街のライブハウスでの演奏', '高円寺HIGHの公演を収録したアーティスト側のライブ映像です。', 'Gub-aCbRd_w');
audio('koenji', 'night-glory-scarlet', 'scarlet', 'Night Glory / 高円寺HIGH 2024', '照明と音が立ち上がる瞬間を、一曲から。', '街のライブハウスでの演奏', '2024年4月26日に高円寺HIGHで収録された公式ライブクリップです。', 'z36AFHXk_YQ');
audio('koenji', 'seabirth-live', 'UNTITLED Release Party', 'seabirth with Atsumi / 高円寺HIGH', '映画のように展開する演奏を、会場の記録で。', '街のライブハウスでの演奏', '2022年4月24日の高円寺HIGH公演を記録したライブ映像です。', 'UQy4T4beuuM');
audio('koenji', 'pink-minds-live', 'ノーレシピLOVE', 'THE PINK MINDS / 高円寺HIGH 2025', '観客の前で跳ねるポップソングを一曲。', '街のライブハウスでの演奏', '2025年10月13日の高円寺HIGH公演から公開されたアーティスト公式ライブ映像です。', 'nXNIi_KijU0');

audio('shimokitazawa', 'kaho-asa', '朝（Band set live ver.）', '果歩 / 下北沢SHELTER 2023', '歌声が地下の会場に広がる時間を聴く。', '街のライブハウスでの演奏', '2023年12月1日の下北沢SHELTER公演を、本人の公式チャンネルが公開したライブ映像です。', '3lzRKhS08Zo');
audio('shimokitazawa', 'bilingualboy-love', 'LOVE', 'バイリンジボーイ / 下北沢SHELTER 2023', 'フロアとの距離が近い演奏を、一曲から。', '街のライブハウスでの演奏', '2023年6月30日の下北沢SHELTER公演から公開されたバンドのライブ映像です。', 'ID4fGwkTKHE');
audio('shimokitazawa', 'sleepinside-recycle', 'リサイクル', 'SleepInside / 下北沢SHELTER 2026', '舞台袖の気配ごと、新しいバンドの現在を聴く。', '街のライブハウスでの演奏', '2026年6月1日の下北沢SHELTER公演を収録した公式ライブクリップです。', 'Np7r73nw_iY');
audio('shimokitazawa', 'metrois-tokyo', '東京', 'MÉTROIS / 下北沢学生音楽祭 2024', '学生音楽祭のステージから、街で始まる一曲へ。', '街の音楽祭での演奏', '2024年1月4日の下北沢学生音楽祭で収録されたOfficial Live Music Videoです。', 'sO430hGTwj8');
audio('shimokitazawa', 'mabuta-roundabout', 'roundabout', 'mabuta / 下北沢SHELTER 2023', 'ツアーの終着点で鳴った一曲を聴く。', '街のライブハウスでの演奏', '2023年8月10日の下北沢SHELTERワンマン公演から公開されたライブ映像です。', 'DtfH_SyrjMY');

audio('kichijoji', 'yoshida-night-edge', '誰もいない夜の果てを', '吉田和史 TRIO / STAR PINE’S CAFE 2026', '夜の会場で、歌とピアノとチェロを聴く。', '街のライブハウスでの演奏', '2026年2月18日に吉祥寺STAR PINE’S CAFEで収録されたライブ映像です。', 'CO9iiYZ3Rnc');
audio('kichijoji', 'yoshida-tinderness', 'Tinderness', '吉田和史 BANDSET / STAR PINE’S CAFE 2026', '同じ夜を、バンド編成の響きで聴き比べる。', '街のライブハウスでの演奏', '2026年2月18日に吉祥寺STAR PINE’S CAFEで収録された別編成のライブ映像です。', 'W7hdph1vknw');
audio('kichijoji', 'kobayashi-kokuhaku', '告白', '小林建樹 / STAR PINE’S CAFE', '会場録音として残った歌を、一曲だけ。', '街のライブハウスで録音', '吉祥寺STAR PINE’S CAFEでの演奏を収めた公式配信音源です。', 'Yq6ccYy65z4');
audio('kichijoji', 'uchu-mao-haircolor', 'ヘアカラー', '宇宙まお / STAR PINE’S CAFE 2022', 'デビュー10周年の記念公演から、アコースティックな一曲を。', '街のライブハウスでの演奏', '2022年4月10日の吉祥寺STAR PINE’S CAFE公演から公開された公式ライブ映像です。', 'oDeXMJ_Krxw', ['https://mandala.gr.jp/SPC/schedule/20220410day/']);
audio('kichijoji', 'takeuchi-ai-rain', '雨に見惚れたい', '竹内藍 / STAR PINE’S CAFE 2021', '雨を歌う声とバンドの呼吸を聴く。', '街のライブハウスでの演奏', '2021年12月8日の吉祥寺STAR PINE’S CAFE公演から公開されたライブ映像です。', 'D3ctGcULO_c');

audio('jinbocho', 'honobe-girl', '女の子', 'ホノベミナミ / 神保町試聴室 2019', '小さな音楽室で歌われた一曲を聴く。', '街の音楽会場での演奏', '2019年10月19日に神保町試聴室で収録された本人公開のライブ映像です。', '3cAdJvRprto');
audio('jinbocho', 'gorilla-secret', '秘密', 'ゴリラ祭ーズ / 神保町試聴室 2024', '三人のインストゥルメンタルを、会場の距離で。', '街の音楽会場での演奏', '2024年10月1日に神保町試聴室で収録されたバンド公式ライブ映像です。', '3d49S1QGJQc');
audio('jinbocho', 'sunshin-anniversary', 'SUN蕊 10周年記念ライブ', 'SUN蕊 / 神保町 楽屋', '三味線、鳴り物、尺八の重なりを聴く。', '街の音楽会場での演奏', '神保町のライブレストラン「楽屋」で行われた10周年公演から、演奏2曲を公開した映像です。', '5C-_TAxiZbs');
audio('jinbocho', 'chikuon-beautiful', 'ビューティフル', '井乃頭蓄音団 / 神保町試聴室 2024', '言葉と演奏が近くにある、小さな会場の一曲。', '街の音楽会場での演奏', '2024年6月29日に神保町試聴室で収録された公式ライブ映像です。', '25fMTtfgwlk');
audio('jinbocho', 'motoki-tongping', 'とんぴんしゃん', 'motoki tanaka / 神保町試聴室 2024', 'アルバム発売の夜に鳴ったバンドの音を聴く。', '街の音楽会場での演奏', '2024年4月28日の神保町試聴室でのアルバム発売ライブから公開された演奏です。', 'mVYh6msmP7A');

video('koenji', 'awa-2025', '高円寺の踊り', '東京高円寺阿波おどり振興協会 / 2025', '踊り手と観客の距離から、お祭りの熱気に触れる。', '街の祭りの映像', '高円寺の阿波おどりを紹介する主催団体の映像。2025年の記録です。現在開催中の配信ではありません。', 'dt33RGSRuo0');
video('koenji', 'tenguren', '天狗連「日本の四季」', '天狗連 / PR映像', '阿波おどりの動きと、映像表現の組み合わせを楽しむ。', '街の踊り手', '高円寺の天狗連によるPR映像。街頭公演の生中継ではありません。', '8V9iHAM82bc', ['https://tenguren.com/gallery']);
video('koenji', 'awa-history', '高円寺阿波おどり ～60年の歩み～', '杉並区 / 記録映像', 'いまの踊りを観たあと、その歩みを映像で遡る。', '祭りの来歴', '高円寺阿波おどりの60年を振り返る杉並区の記録。現在の開催日程は扱いません。', 'cFAtkUlajUI');
video('koenji', 'pal-street', 'JOIN THE pal｜高円寺の一日', '高円寺パル商店街振興組合 / PR映像', '店先、古着、踊り。ひとつの商店街を映像で歩く。', '街を舞台にした映像', '高円寺パル商店街のプロモーション映像。実在の店舗と、物語仕立ての演出で構成されています。', 'ljxbhH_n9ak', ['https://www.value-press.com/pressrelease/352818']);
video('koenji', 'street-food', '高円寺のクレープと餃子を巡る', 'TabiEats / 街歩き・英語', '食べ歩く人の目線から、店先の空気を感じる。', '街の取材映像', '高円寺を巡る「Street Food in Tokyo | Best Crepes & Dumplings In Koenji」。映像内の価格・営業状況は撮影当時の情報です。', 'JkxNRpc7NJU');
// Not a novel that borrowed the street's name — the street took the novel's.
book('koenji', 'junjo', '高円寺純情商店街', 'ねじめ正一', '店を営む家族の日常から、商店街の人間模様へ。', '街が名前を変えた小説', '当商店街で少年時代を過ごしたねじめ正一の小説です。1989年に第101回直木賞を受賞したことから、正式名称「高円寺銀座商店会協同組合」の商店街が「高円寺純情商店街」を愛称と定め、商店街アーチにこの名前を掲げました。', 'https://www.shinchosha.co.jp/book/102112/', ['https://koenji-junjo-hotel.com/about-junjo/']);
book('koenji', 'jirokichi', '次郎吉 to JIROKICHI', 'Live Music JIROKICHI 編', 'ステージの音を支えてきた人たちの、50年の記録。', '会場の記録', '高円寺のライブハウスJIROKICHIの50年を扱う本。インタビューや公演の記録から会場の来歴を辿れます。', 'https://www.ele-king.net/books/012100/');
book('koenji', 'cafe-junjo', '高円寺かふぇ純情の事情', '石原ひな子', '喫茶店に持ち込まれる悩みから、人のつながりを覗く。', '物語の舞台', '高円寺の商店街を舞台にした喫茶店の物語。架空の人物・出来事を描く小説です。', 'https://www.kadokawa.co.jp/product/321507000438/');
book('koenji', 'shiroku-somaru', '君のいない町が白く染まる', '安倍雄太郎', '引っ越した街で始まる恋を、一冊の物語として。', '物語の舞台', '主人公が高円寺へ引っ越すところから始まる小説です。', 'https://www.shogakukan.co.jp/books/09406495');
book('koenji', '1q84', '1Q84', '村上春樹', 'いつもの街が、別の世界の入口に見えてくる。', '物語に登場する街', '天吾が月を眺める高円寺の公園が登場します。新潮社の特集は「舞台かもしれない場所」を巡るもので、特定の公園を公式のモデルと断定していません。', 'https://www.shinchosha.co.jp/harukimurakami/review/100163-e.html');
film('koenji', 'monterey-pop', 'MONTEREY POP モンタレー・ポップ', '音楽ドキュメンタリー', '1967年の音楽祭で生まれた、一度きりの演奏へ。', '高円寺の映画祭で上映', '2026年2月の座・高円寺ドキュメンタリーフェスティバルで上映。撮影地は高円寺ではなく、米国のモンタレーです。', 'https://www.sonymusic.co.jp/artist/jimihendrix/info/559938', '音楽レーベルの映画・予告案内を見る', [koenjiFestival]);
film('koenji', 'unnameable-dance', '名付けようのない踊り', '犬童一心 監督 / 田中泯', '踊る身体と、その場に流れる時間を見つめる。', '高円寺の映画祭で上映', '2026年2月の座・高円寺ドキュメンタリーフェスティバルの上映作品。田中泯の踊りを辿る映画です。', 'https://happinet-phantom.com/unnameable-dance/', '映画公式サイトで映像・作品案内を見る', [koenjiFestival]);
film('koenji', 'ramen-heads', 'ラーメンヘッズ', 'ドキュメンタリー', '一杯に向き合う人の仕事を、厨房の側から観る。', '高円寺の映画祭で上映', '2026年2月の座・高円寺ドキュメンタリーフェスティバルで上映。高円寺のラーメン店を扱った映画という意味ではありません。', 'https://www.ramenheads.com/', '映画公式サイトで作品に触れる', [koenjiFestival]);
film('koenji', 'rokkoku-kitchen', 'ロッコク・キッチン', '川内有緒・三好大輔', '福島の食卓から、暮らす人の声に出会う。', '高円寺の映画祭で上映', '2026年2月の座・高円寺ドキュメンタリーフェスティバルの上映作品。ここから福島の暮らしを映した作品へ広がります。', 'https://rokkokukitchen.com/', '映画公式サイトで予告・作品案内を見る', [koenjiFestival]);
film('koenji', 'shogakko', '小学校～それは小さな社会～', '山崎エマ 監督', '子どもたちの学校生活から、小さな社会を見つめる。', '高円寺の映画祭で上映', '2026年2月の座・高円寺ドキュメンタリーフェスティバルで上映。映画祭の選定をきっかけに紹介しています。', 'https://shogakko-film.com/', '映画公式サイトで予告・作品案内を見る', [koenjiFestival]);

video('shimokitazawa', 'shelter-news', 'ニッポンのライブハウス：下北沢SHELTER', 'SPACE SHOWER NEWS', '地下のライブハウスを、音楽メディアの取材から知る。', '会場の取材映像', '下北沢SHELTERを取り上げたSPACE SHOWER NEWSの映像。別ページの2007年ライブ音源とは異なる取材映像です。', 'cyJYxL20Z3A');
video('shimokitazawa', 'kitazawa-guide', 'ようこそ世田谷へ！北沢地区を紹介します', '世田谷区', '暮らす人に向けた案内から、街の身近な場所へ。', '地区の紹介映像', '世田谷区の北沢地区紹介。下北沢駅周辺を含む地区の見どころを扱います。', 'WkKHB5toNIg', ['https://www.city.setagaya.lg.jp/01048/8512.html']);
video('shimokitazawa', 'tefu-1500', '下北沢で仕事もする人たち｜15:00', '下北線路街 / Web CM', '午後の下北沢を舞台にした、短い映像から。', '街を舞台にしたWeb CM', '下北線路街の企画で制作された(tefu) lounge・BONUS TRACKのWeb CMです。取材記録ではなく演出のある作品です。', '5riinr6xpWo', [tefu]);
video('shimokitazawa', 'obonro-walk', '俳優と歩く、下北沢', '劇団おぼんろ / さひがしジュンペイ', '舞台に立つ人の言葉を聞きながら、劇場のある街を歩く。', '街と劇場を辿る公式映像', '本多劇場公演を控えた劇団おぼんろが、劇団員の目線で下北沢を歩き、街への思いを語る公式企画です。公演は2026年2月に終了しています。', 'jFCmoShi5ns', ['https://www.obonro-web.com/', 'https://x.com/obonro_new/status/1984938548680683574']);
video('shimokitazawa', 'womenslib-interview', '本多劇場に立つ前の、仲野太賀', '大人計画 / インタビュー', 'いま広く知られる俳優の、舞台へ向かう言葉を聴く。', '街の劇場で上演された舞台', '大人計画の舞台「もうがまんできない」出演時の仲野太賀インタビュー。公演は2023年に下北沢・本多劇場で行われました。作品の舞台設定が下北沢という意味ではありません。', 'K_LDvvjC8Uw', ['https://otonakeikaku.net/2023_mougamandekinai/']);
// 世田谷区が公開する文化地図が、この詩人とこのまちの関係に一項を立てている。
book('shimokitazawa', 'nekomachi', '猫町', '萩原朔太郎', '見慣れた道が、ふいに知らない町に見えるとき。', '街に住んだ詩人が書いた町', '世田谷区が公開する「下北沢文士町文化地図」（北沢川文化遺産保存の会 作成）は、下北沢周辺に暮らした文士として萩原朔太郎を挙げ、「小説『猫町』と下北沢」の項を設けています。1935年に発表された散文詩風の小説で、作中の町が下北沢の実在の場所を指すと確定した記述ではありません。', 'https://www.aozora.gr.jp/cards/000067/card641.html', ['https://www.city.setagaya.lg.jp/02205/10324.html']);
book('shimokitazawa', 'lady-jane', '下北沢祝祭行 レディ・ジェーンは夜の扉', '大木雄高', '店に集まった人たちの言葉から、夜の文化を辿る。', '店主が綴った街の記録', '下北沢のLADY JANEを営む大木雄高の著書。店と人の関係を記したエッセイです。', 'https://www.genki-shobou.co.jp/books/978-4-901998-72-7');
book('shimokitazawa', 'indies', '下北沢インディーズ ライブハウスの名探偵', '岡崎琢磨', 'バンドのいる日常を、音楽ミステリーとして楽しむ。', '物語の舞台', '下北沢のライブハウスを舞台にした小説。実在バンドのインディーズ時代を記録した本ではありません。', 'https://www.j-n.co.jp/books/978-4-408-55758-8/');
book('shimokitazawa', 'kamisama', '神様のたまご 下北沢センナリ劇場の事件簿', '稲羽白菟', '小さな劇場で起こる謎から、舞台の裏側へ。', '物語の舞台', '下北沢を舞台にした演劇ミステリー。センナリ劇場は小説の中の劇場です。', 'https://books.bunshun.jp/ud/book/num/9784167922030');
book('shimokitazawa', 'moshimoshi', 'もしもし下北沢', 'よしもとばなな', '料理と新しい暮らしのなかで、心が動き出す物語。', '物語の舞台', '下北沢で暮らし始める主人公を描く小説です。', 'https://www.gentosha.co.jp/book/detail/9784344419094/');
book('shimokitazawa', 'honda', '「演劇の街」をつくった男 本多一夫と下北沢', '本多一夫 語り / 徳永京子 著', '劇場をつくる人と、そこに集まった演劇人の声へ。', '劇場と街の記録', '本多一夫と下北沢の劇場文化を扱う評伝。ぴあの出版案内から内容を確認できます。', 'https://prtimes.jp/main/html/rd/p/000000987.000011710.html');
film('shimokitazawa', 'machinouede', '街の上で', '今泉力哉 監督', '偶然の会話と出会いを、一日分の散歩のように観る。', '物語の舞台', '下北沢を舞台にした映画です。', 'https://machinouede.com/', '映画公式サイトで予告・作品案内を見る');
film('shimokitazawa', 'zawazawa', 'ざわざわ下北沢', '市川準 監督 / 2000', '店と人が行き交う街の、かつての姿に出会う。', '撮影された街', '全編を下北沢で撮影した映画。しもきたシネマ商店街の2021年の上映レポートで、制作の話も辿れます。', 'https://shimokitafilm.com/2021/09/19/quickreport0919_d/', '映画祭の上映・制作トーク記録を読む');
film('shimokitazawa', 'gekijyo', '劇場', '行定勲 監督 / 2020', '舞台をつくる夢と、ふたりで暮らす時間を観る。', '物語の舞台・撮影地', '公式サイトが下北沢のロケ地を紹介しています。劇場や街並みと、登場人物の生活が重なる映画です。', 'https://gekijyo-movie.com/', '映画公式サイトで予告・作品案内を見る', ['https://gekijyo-movie.com/news/?id=54645']);
film('shimokitazawa', 'aterui', '歌舞伎NEXT 阿弖流為〈アテルイ〉', '中島かずき 作 / いのうえひでのり 演出', '舞台の身体とアクションを、映画の画面で味わう。', '下北沢の映画館で上映', '松竹の記録では、2025年8月に下北沢トリウッドで上映。元の舞台公演は2015年の新橋演舞場です。', 'https://www.shochiku.co.jp/cinemakabuki/lineup/1779', '松竹で予告動画・作品案内を見る', ['https://www.shochiku.co.jp/cinemakabuki/news/2980']);
film('shimokitazawa', 'blazer', 'シモキタブレイザー', '安藤光造 監督 / 2024', '一枚のレコードを巡る騒動を、街の疾走感とともに。', '物語の舞台', '下北沢出身の監督が下北沢を舞台にしたクライムコメディです。', 'https://shimokita-blazer.com/', '映画公式サイトで予告・作品案内を見る');

video('kichijoji', 'park-voice', '井の頭公園100周年記念放送の記録', 'MIRAI records / 57秒', '公園に流れた声を、ひとつの短い記録として聴く。', '公園で流れた放送', '井の頭公園の100周年記念放送を記録した映像。現在の園内放送・ライブ配信ではありません。', '80y5COiKdDw', ['https://yakushimaruetsuko.com/archives/2398/']);
video('kichijoji', 'uplink', 'アップリンク吉祥寺 コンセプト動画', 'アップリンク / 2018年の紹介映像', '映画を観る前の空間にも、作り手の発想がある。', '街の映画館', 'アップリンク吉祥寺のコンセプトを紹介する映像。当時の募集・案内は現在のものではありません。', 'FReSNt44TX4');
video('kichijoji', 'kichion-ichihara', '市原ひかり｜吉祥寺の野外ライブ', 'キチオン37 / 吉祥寺音楽祭', '野外で響く演奏から、街の音楽に触れる。', '街で行われた演奏', '吉祥寺音楽祭「キチオン37」の公開ライブ映像です。生配信中の表示や現在の公演案内は行いません。', 'syHFyTLO1kY', ['https://kichion.com/']);
video('kichijoji', 'kichion-toranoko', '虎の子ラミー｜吉祥寺の野外ライブ', 'キチオン37 / 吉祥寺音楽祭', '音楽祭のステージから、バンドの勢いを感じる。', '街で行われた演奏', '吉祥寺音楽祭「キチオン37」の公開ライブ映像です。', '9x2BEUFwoIw', ['https://kichion.com/']);
video('kichijoji', 'kichion-lady', 'Lady Honkerz｜吉祥寺の野外ライブ', 'キチオン37 / 吉祥寺音楽祭', 'スウィングの音色を、野外ステージの記録から。', '街で行われた演奏', '吉祥寺音楽祭「キチオン37」の公開ライブ映像です。', 'zc7OjXup06Y', ['https://kichion.com/']);
book('kichijoji', 'cinema-history', '吉祥寺に育てられた映画館', '本田拓夫', '映画館を営む人の目から、街の映画文化を辿る。', '映画館と街の記録', 'イノカン・MEG・バウスという吉祥寺の映画館の歩みを扱います。', bausBook);
book('kichijoji', 'honnoniwa', '待ち合わせは〈本の庭〉で', '藤野ふじの', '棚を分け合う書店で、誰かの一冊に出会う。', '物語の舞台', '吉祥寺のシェア型書店を舞台にした小説。出版社の特設ページに試し読みの入口があります。', 'https://kotonohabunko.jp/special/honnoniwa/');
book('kichijoji', 'yorozu', '吉祥寺よろず怪事請負処', '結城光流', '庭師のいる店に集まる、不思議な相談を辿る。', '物語の舞台', '吉祥寺を舞台にした小説。登場する店や出来事は物語の設定です。', 'https://www.kadokawa.co.jp/product/321612000260/');
book('kichijoji', 'gou-gou-book', 'グーグーだって猫である', '大島弓子', '猫との生活を、漫画家の言葉と絵から味わう。', '映画化作品から街へ', 'この漫画を原作とする2008年の映画は吉祥寺が舞台です。原作の全場面の場所を特定する紹介ではありません。', 'https://www.kadokawa.co.jp/product/199999853258/', ['https://www.wowow.co.jp/detail/021429']);
book('kichijoji', 'catwalk', '吉祥寺キャットウォーク 1', 'いしかわじゅん', '街で暮らす人たちの群像を、漫画のページから。', '物語の舞台', 'いしかわじゅんが吉祥寺を舞台に描く漫画です。', 'https://www.kadokawa.co.jp/product/301411001042/');
film('kichijoji', 'parks', 'PARKS パークス', '瀬田なつき 監督 / 2017', '一曲が時代をつなぐ映画から、公園の声を聴きにいく。', '物語の舞台', '吉祥寺・井の頭公園を舞台にした映画。ここでは公式予告と公園の記念放送を選んで観られます。', '/v3-prototype/culture-experience-r2/kichijoji/?scene=film', '公式予告と公園の声を観る', ['https://www.youtube.com/watch?v=pm7RBghFt0I']);
film('kichijoji', 'baus', 'BAUS 映画から船出した映画館', '甫木元空 監督 / 2025', '映画館を続ける人たちの時間を、一本の映画で。', '街の映画館の来歴', '吉祥寺のバウスシアターに連なる映画館の歩みをもとにした作品です。', 'https://bausmovie.com/', '映画公式サイトで予告・作品案内を見る');
film('kichijoji', 'gou-gou-film', 'グーグーだって猫である', '犬童一心 監督 / 2008', '猫との出会いから、止まっていた日常が動き出す。', '物語の舞台', '吉祥寺が舞台の2008年の映画。後年のテレビドラマ版とは別作品です。', 'https://www.wowow.co.jp/detail/021429', 'WOWOWで作品・視聴案内を見る');
film('kichijoji', 'asahina', '吉祥寺の朝日奈くん', '加藤章一 監督 / 2011', 'いつもの道と店から始まる、恋の物語。', '撮影された街', '武蔵野市観光機構が、全編吉祥寺での撮影とバウスシアターでの上映を紹介しています。', 'https://movie-tsutaya.tsite.jp/netdvd/dvd/goodsDetail.do?titleID=1745549881', 'TSUTAYAでDVDの案内を見る', ['https://blog.musashino-kanko.com/?p=8101']);
film('kichijoji', 'rocky-horror', 'ロッキー・ホラー・ショー', 'ジム・シャーマン 監督 / 1975', '音楽と奇妙な世界を楽しむ、映画館の記憶への寄り道。', 'バウスシアターの上映文化', 'バウス館主の著書を紹介する出版社ページに、この映画の上映にまつわる項目があります。映画の撮影地が吉祥寺という意味ではありません。', 'https://www.20thcenturystudios.jp/movies/rocky-horror-show', '配給元で映画・視聴案内を見る', [bausBook]);

const library = '千代田区立図書館公式チャンネル';
video('jinbocho', 'gyokueido', '古書っと神保町｜玉英堂書店・前編', library, '古書店の人に案内されながら、本の世界を覗く。', '街の古書店の取材', '千代田区立図書館の「古書っと神保町」vol.1。玉英堂書店を紹介しています。', 'zQJz9x7XzxI');
video('jinbocho', 'italia', '古書っと神保町｜イタリア書房・前編', library, '一軒の書店から、別の国の言葉や文化へ。', '街の書店の取材', '千代田区立図書館の「古書っと神保町」vol.9。イタリア書房を紹介しています。', 'hhaGzqTeIuw', ['https://italiashobo.com/']);
video('jinbocho', 'jinbocho-1960s', '1960年代の神保町を歩く', '千代田区 / 写真記録のカラー化', '本の街の今を知る前に、半世紀以上前の通りを覗く。', '街の記録映像', '千代田区の「ちよだ写真館」にある写真をもとに、1960年代の神保町をカラー化した区公式映像です。色は当時のカラー映像そのものではなく、後年の加工です。', 'bLGpAaB2zUA');
video('jinbocho', 'iwanami-hall', 'ありがとう「岩波ホール」', '千代田区 / 記録映像', '閉館した映画館の客席と、そこで育った文化の記憶へ。', '街の映画館の記録', '2022年に閉館した神保町の岩波ホールを、千代田区が撮影・編集した公式記録です。現在営業している施設の紹介ではありません。', '8tXP7QSh12Y', ['https://www.city.chiyoda.lg.jp/koho/kuse/koho/pressrelease/r4/r408/20220801.html']);
video('jinbocho', 'used-book-festival', '通りが本棚になる日｜神田古本まつり', 'TOKYO MX NEWS', '歩道に本が並び、人が集まる秋の街を短いニュース映像で。', '街の催しの報道映像', '神田神保町の恒例行事「神田古本まつり」を伝える報道映像です。開催日程は映像公開当時のもので、最新情報は主催者案内で確認してください。', 'dl8LHw1j_HI', ['https://jimbou.info/']);
book('jinbocho', 'morisaki', '森崎書店の日々', '八木沢里志', '古書店で過ごす時間から、もう一度日常へ踏み出す。', '物語の舞台', '神保町の古書店を舞台にした小説。案内先は新装版です。', 'https://www.shogakukan.co.jp/books/09386765');
book('jinbocho', 'morisaki-sequel', '続・森崎書店の日々', '八木沢里志', 'あの店に集う人たちの、その後をもう少し。', '物語の舞台', '神保町の古書店を舞台にした続編。前作の別装版ではなく、別の物語です。', 'https://www.shogakukan.co.jp/books/09386766');
book('jinbocho', 'furuhon', '古本食堂', '原田ひ香', '本と食べ物から、街で暮らす人の輪へ。', '物語の舞台', '神保町の古書店を舞台にした小説です。', 'https://www.kadokawaharuki.co.jp/book/detail/detail.php?no=5208');
book('jinbocho', 'furuhon-sequel', '古本食堂 新装開店', '原田ひ香', '古書店の続く日常に、また新しい人がやってくる。', '物語の舞台', '神保町を舞台にした『古本食堂』の続編。前作の装丁だけを変えた本ではありません。', 'https://www.kadokawaharuki.co.jp/book/detail/detail.php?no=7272');
book('jinbocho', 'kaijin', '神保町の怪人', '紀田順一郎', '本を集める情熱が、謎と事件へ姿を変える。', '物語の舞台', '古書収集と神保町を扱う三つのミステリーを収めた短編集です。', 'https://www.tsogen.co.jp/np/isbn/9784488406080');
film('jinbocho', 'morisaki-film', '森崎書店の日々', '日向朝子 監督 / 2010', '古書店の時間と人の出会いを、映像の物語で。', '撮影された街', '神保町で撮影された映画。日本映画データベースで作品の内容と制作情報を確認できます。', 'https://jfdb.jp/title/2240', '日本映画データベースで作品を知る');
film('jinbocho', 'ginga', '銀河鉄道の夜', 'アニメーション映画 / 1985', '列車と音楽が運ぶ、夜の旅へ。', '神保町シアターの上映企画', '神保町シアターが2026年9月19日からの上映企画で紹介している作品。物語の舞台が神保町という意味ではありません。', 'https://www.shogakukan.co.jp/jinbocho-theater/features/2026-09-19-ginga-tetsudou.html', '神保町シアターで作品・上映案内を見る');
film('jinbocho', 'ugetsu', '雨月物語', '溝口健二 監督 / 1953', '現実と幻想のあわいを、白黒の映像で辿る。', '神保町シアターの上映企画', '神保町シアターの2026年「没後70年 溝口健二」特集の選定作品。街の映画館を入口に、日本映画へ寄り道します。', mizoguchi, '神保町シアターの溝口健二特集を見る');
film('jinbocho', 'endless-waltz', 'エンドレス・ワルツ', '若松孝二 監督 / 1995', '音楽家と作家が生きた、激しく危うい時間へ。', '神保町シアターの上映企画', '天才サックス奏者・阿部薫と作家・鈴木いづみをモデルにした小説の映画化。神保町シアターの2026年「忘れられない90年代映画たちⅡ」で上映されました。撮影地が神保町という意味ではありません。', ninetiesFilm, '神保町シアターの上映記録で作品を知る');
film('jinbocho', 'shadowless-voice', '影なき声', '鈴木清順 監督 / 1958', '聞き覚えのある声から始まる、白黒のサスペンスへ。', '神保町シアターの上映企画', '松本清張の短編「声」を鈴木清順が映画化した作品。神保町シアターの2026年「白と黒の犯罪映画」で上映されました。撮影地が神保町という意味ではありません。', crimeFilm, '神保町シアターの上映記録で作品を知る');

// Only attach a trailer when a public, title-matching clip was identified. This is
// intentionally incomplete: “no verified trailer” is better than a wrong embed.
const trailerIds = {
  // Embedded by the film's official site, checked 2026-09-08.
  'unnameable-dance': 'ELXE7PGOBT8',
  // Embedded by rokkokukitchen.com, checked 2026-09-08.
  'rokkoku-kitchen': 'HrRTahmwIYI',
  'rocky-horror': 'Q3J9ewosl1A',
  ugetsu: '-Jz4grZPstA',
  'ramen-heads': '_Em5H7KlBSs',
  shogakko: 'FDu7cbNuaXQ',
  machinouede: '9lvk-4mVjC0',
  gekijyo: 'PJ3RKuybYzU',
  aterui: 'rakrdG7P2Jo',
  blazer: 'f-Fr5ga8u3k',
  parks: 'pm7RBghFt0I',
  baus: '0dkX_-JxhgI',
  'morisaki-film': '6M0vx8wLEbM'
};
for (const item of items.filter(item => item.kind === 'film' && trailerIds[item.id])) {
  item.trailerVideoId = trailerIds[item.id];
  item.trailerUrl = 'https://www.youtube.com/watch?v=' + item.trailerVideoId;
  if (item.id === 'ugetsu') item.trailerLabel = '特別映像（本編ではありません）';
  item.sources = [...new Set([...item.sources, item.trailerUrl])];
}

const blockedVideoIds = ['tUe6YedzjlM', 'AuxXufx5kKQ']; // User playback evidence: private, 2026-09-08.
for (const item of [...items, ...commonVideos]) {
  if (blockedVideoIds.includes(item.videoId) || blockedVideoIds.includes(item.trailerVideoId)) throw new Error('Private video must not be published: ' + item.id);
}
// Publication rule: no individual permission requests or external correspondence.
// Individually reviewed text-only books may be listed without reproducing a cover.
// This is not a blanket approval of other research candidates or cover rights.
// Selection, 2026-09-10: the shelf reads as a label when the title names the street.
// A book earns its place when the title does not say the city but the relation does,
// and the relation can be shown. checkedAt stays the date each source was read.
const textOnlyBooks = {
  'koenji/jirokichi': {source:'https://www.ele-king.net/books/012100/', checkedAt:'2026-09-09'},
  'kichijoji/honnoniwa': {source:'https://kotonohabunko.jp/special/honnoniwa/', checkedAt:'2026-09-09'},
  'koenji/shiroku-somaru': {source:'https://www.shogakukan.co.jp/books/09406495', checkedAt:'2026-09-08'},
  'koenji/1q84': {source:'https://www.shinchosha.co.jp/harukimurakami/review/100163-e.html', checkedAt:'2026-09-08', action:'出版社の特集で、この場面の紹介を読む'},
  'kichijoji/gou-gou-book': {source:'https://www.kadokawa.co.jp/product/199999853258/', checkedAt:'2026-09-08'},
  'jinbocho/morisaki': {source:'https://www.shogakukan.co.jp/books/09386765', checkedAt:'2026-09-08'},
  'jinbocho/morisaki-sequel': {source:'https://www.shogakukan.co.jp/books/09386766', checkedAt:'2026-09-08'},
  'jinbocho/furuhon': {source:'https://www.kadokawaharuki.co.jp/book/detail/detail.php?no=5208', checkedAt:'2026-09-08'},
  'jinbocho/furuhon-sequel': {source:'https://www.kadokawaharuki.co.jp/book/detail/detail.php?no=7272', checkedAt:'2026-09-08'},
  // The title names the street, and it earns that: these three are the record of how
  // the street's culture happened, written by the people who ran it. A novel merely
  // set on the street is a label, and stays off the shelf.
  'shimokitazawa/lady-jane': {source:'https://www.genki-shobou.co.jp/books/978-4-901998-72-7', checkedAt:'2026-09-08'},
  'shimokitazawa/honda': {source:'https://prtimes.jp/main/html/rd/p/000000987.000011710.html', checkedAt:'2026-09-08', action:'出版案内で内容を読む'},
  'kichijoji/cinema-history': {source:'https://books.bunshun.jp/ud/book/num/9784160089457', checkedAt:'2026-09-08'},
  // The title says the street, but the relation runs the other way: the street is
  // named after the book. Founder-verified against the street's own account, 2026-09-10.
  'koenji/junjo': {source:'https://www.shinchosha.co.jp/book/102112/', checkedAt:'2026-09-10'},
  // Out of copyright and readable in full where it is linked, so there is no cover to
  // reproduce and nothing between the reader and the text. Relation verified by the
  // Founder against the ward's own cultural map, 2026-09-10.
  'shimokitazawa/nekomachi': {source:'https://www.aozora.gr.jp/cards/000067/card641.html', checkedAt:'2026-09-10', action:'青空文庫で全文を読む'}
};
video('shimokitazawa', 'bocchi-main-pv', 'ぼっち・ざ・ろっく！｜TVアニメ本PV', 'アニプレックス / 2022', 'ひとりのギターが、バンドの音になる。下北沢を舞台にした物語の入口へ。', '下北沢が舞台のアニメ', '公式サイトが下北沢を作品の舞台として紹介しています。これはTVアニメの紹介PVで、本編や実在のライブ公演映像ではありません。映像内の放送告知は公開当時の情報です。', '1-o7fmQqSNg', ['https://bocchi.rocks/movie/', 'https://bocchi.rocks/kessokuband/info/?article_id=65508']);
items[items.length-1].checkedAt='2026-09-09';
video('koenji', 'next-town-koenji', 'となり街、高円寺', '杉並区 / 村井智 監督 / 2017', '初めて訪れる人の目線から、いつもの街を見直す。', '街を巡る観光PR映像', '杉並区の観光PR映像。高円寺を訪れる人物を通して街を紹介する作品です。2017年の制作で、登場する店舗等の営業状況を現在保証するものではありません。', 'Xswbd-IOihs', ['https://xn--elq759cnsa.com/tonarimachi/']);
video('kichijoji', 'musashino-green', '緑あふれるまち 武蔵野市', '武蔵野市 / 2022年掲載', '駅前から少し離れて、木々や緑地のある風景へ。', '吉祥寺を含む武蔵野市の風景', '武蔵野市が紹介する公園・緑地のハイライト映像。吉祥寺東町農業公園や吉祥寺北町の千川上水、むさしの自然観察園を含みます。吉祥寺だけの映像ではなく、境・関前など市内の他地域も収録されています。', 'TFGQrtHflSg', ['https://www.city.musashino.lg.jp/gomi_kankyo/midori_koen/tokyonomoriwomamorutorikumi/1037102.html']);
for(const item of items.filter(i=>['next-town-koenji','musashino-green'].includes(i.id))) item.checkedAt='2026-09-09';
for(const item of items) {
  const review=textOnlyBooks[item.city+'/'+item.id];
  if(!review) continue;
  if(item.kind!=='book'||item.url!==review.source) throw new Error('Text-only book review mismatch');
  item.presentation='text-only';
  item.checkedAt=review.checkedAt;
  item.action=review.action||(item.id==='honnoniwa'?'出版社で紹介・試し読みを見る':'出版社で書籍情報を見る');
}
const covers = require('./work-cover-source.json');
const canPublish = item => Boolean(item.videoId || item.trailerVideoId || covers[item.city+'/'+item.id]?.status === 'usable' || item.presentation==='text-only');
const excludedItems = items.filter(item => !canPublish(item));
module.exports = { items: items.filter(canPublish), excludedItems, commonVideos, blockedVideoIds, checkedAt: '2026-09-08' };
