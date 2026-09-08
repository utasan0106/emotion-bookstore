'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {items, commonVideos, checkedAt} = require('./city-discovery-source');
const root = path.resolve(__dirname, '..');
const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'release_content.js'), 'utf8'), sandbox);
const content = sandbox.window.V3_RELEASE_CONTENT;
const cityNames = {koenji:'高円寺', shimokitazawa:'下北沢', kichijoji:'吉祥寺', jinbocho:'神保町'};
const categories = {audio:{name:'音楽・サウンド', verb:'音を選ぶ', mark:'♪'}, video:{name:'映像', verb:'映像を選ぶ', mark:'▶'}, book:{name:'本・漫画', verb:'本を選ぶ', mark:'本'}, film:{name:'映画', verb:'映画を選ぶ', mark:'映'}};
const features = {
  koenji:{title:'作品の舞台かもしれない場所を歩く', note:'新潮社の『1Q84』めぐり。高円寺の公園と小説を巡る特集。', url:'https://www.shinchosha.co.jp/harukimurakami/review/100163-e.html'},
  shimokitazawa:{title:'下北沢の音楽・演劇・街歩きを知る', note:'東京の観光公式サイト GO TOKYO による下北沢ガイド。', url:'https://www.gotokyo.org/jp/destinations/western-tokyo/shimokitazawa/index.html'},
  kichijoji:{title:'映画『吉祥寺の朝日奈くん』の撮影地へ', note:'武蔵野市観光機構の映画紹介。街を映した作品の背景を辿る。', url:'https://blog.musashino-kanko.com/?p=8101'},
  jinbocho:{title:'古書店から始まるミステリーに出会う', note:'東京創元社による紀田順一郎の作品案内。神保町と本を巡る物語をさらに。', url:'https://www.tsogen.co.jp/sp/author/214'}
};
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function media(city) { return content.shelves.find(c => c.id === city).heroMedia; }
function photo(city, eager=false) {
  const m = media(city);
  return `<img src="/${m.url.replace('./','')}" alt="${esc(m.alt)}" width="${m.width}" height="${m.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const external = (url, label, cls='') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
const plain = value => String(value).replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
const canonicalFor = file => `https://emotionbookstore.com/discover/${file === 'index.html' ? '' : file.replace(/index\.html$/, '')}`;
function credits(cities) {
  return `<details class="credits"><summary>街の写真・出典</summary>${cities.map(c => {const m=media(c);return `<p>${cityNames[c]}の街の写真：${external(m.sourceUrl,m.author)} / ${external(m.licenseUrl,m.license)}。既存の縮小画像を使用し、表示範囲をトリミング。作品の表紙・場面写真ではありません。</p>`;}).join('')}</details>`;
}
function shell(title, body, back, active='') {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="referrer" content="strict-origin-when-cross-origin"><meta name="description" content="街とつながる音楽、映像、本、映画を選ぶ文化案内。作品に触れたあと、ゆかりの場所や関連特集へ。"><title>${esc(title)}｜みんなの感情書店</title><link rel="icon" href="/assets/favicon.ico"><link rel="stylesheet" href="/discover/discover.css"></head>
<body class="${active}"><a class="skip" href="#main">本文へ</a><header class="masthead"><a class="brand" href="/index.html">みんなの感情書店<span>街と作品の文化案内</span></a>${back || '<a href="/works.html">紹介した作品へ →</a>'}</header>
<main id="main">${body}</main><footer class="footer"><p>気になる作品から、街と人のつながりへ。</p><a href="/credits.html">写真と出典について</a></footer>
${body.includes('data-video-id') ? '<script src="/video-embed.js" defer></script><script src="/discover/player.js" defer></script>' : ''}</body></html>\n`;
}
let written = 0;
const generatedFiles = [];
function enrichSeo(file, html) {
  const pageTitle=plain((html.match(/<title>(.*?)<\/title>/s)||[])[1]||'みんなの感情書店');
  const heading=plain((html.match(/<h1>(.*?)<\/h1>/s)||[])[1]||pageTitle).replace(/\s+の/g,'の');
  const hook=plain((html.match(/class="(?:detail-hook|collection-lead|lead)"[^>]*>(.*?)<\/p>/s)||[])[1]||'');
  const creator=plain((html.match(/class="detail-creator"[^>]*>(.*?)<\/p>/s)||[])[1]||'');
  const description=plain([heading,creator,hook,'作品から街と人のつながりを辿る、みんなの感情書店。'].filter(Boolean).join('。')).replace(/。+/g,'。').slice(0,155);
  const canonical=canonicalFor(file);
  const schema=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:heading,description,url:canonical,isPartOf:{'@type':'WebSite',name:'みんなの感情書店',url:'https://emotionbookstore.com/'}}).replace(/</g,'\\u003c');
  return html
    .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`)
    .replace('</title>',`</title><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="みんなの感情書店"><meta property="og:title" content="${esc(pageTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary"><script type="application/ld+json">${schema}</script>`);
}
function write(file, html) {
  html=enrichSeo(file,html);
  const output=path.join(root,'discover',file);
  if(process.argv.includes('--check')) {
    if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html)throw new Error('Generated page differs: '+output);
  }else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);}
  generatedFiles.push(file);
  written++;
}
const cities=Object.keys(cityNames);
write('index.html', shell('街から音楽、映像、本、映画を探す', `<section class="intro"><p class="eyebrow">聴く・観る・読む</p><h1>街から、<br>気になる作品へ。</h1><p class="lead">街で鳴った音楽、街を映す映像、本、映画に出会う文化案内。<br>まずひとつ楽しんで、ゆかりの場所や関連特集へ。</p></section>
<section class="city-grid" aria-label="街を選ぶ">${cities.map(c=>`<a class="city-card" href="/discover/${c}/audio.html"><div class="city-image">${photo(c)}</div><div class="city-caption"><h2>${cityNames[c]}</h2><p>音楽 ${items.filter(i=>i.city===c&&i.kind==='audio').length} / 映像 ${items.filter(i=>i.city===c&&i.kind==='video').length} / 本・漫画 ${items.filter(i=>i.city===c&&i.kind==='book').length} / 映画 ${items.filter(i=>i.city===c&&i.kind==='film').length}</p><span>${cityNames[c]}の4つの棚から選ぶ →</span></div></a>`).join('')}</section>
<section class="quick"><p class="eyebrow">街を決めずに観る</p><h2>街へ出たくなる、${commonVideos.length}つの短編。</h2><div class="quick-grid"><a href="/discover/short-films/index.html"><strong>人・移動・出会いを描く映像へ →</strong><span>企業広告も、単体で心に残る映像作品として選びました</span></a></div></section>
<section class="quick"><p class="eyebrow">短い体験から</p><h2>同じ場所、違う聴こえ方。</h2><div class="quick-grid"><a href="/v3-prototype/culture-experience-r2/shimokitazawa/?recording=shelter"><strong>「夕暮れのジャイロ」を聴き比べる →</strong><span>下北沢SHELTERのライブとソロ盤</span></a><a href="/v3-prototype/culture-experience-r2/kichijoji/?scene=film"><strong>『PARKS』の予告と公園の声へ →</strong><span>吉祥寺・井の頭公園 / 1分59秒と57秒</span></a></div></section>${credits(cities)}`));

const commonCards = commonVideos.map((video,n)=>`<article class="work-card video"><a href="/discover/short-films/${video.id}.html"><div class="card-art" aria-hidden="true"><span class="media-mark">▶</span><span class="card-number">${String(n+1).padStart(2,'0')}</span></div><div class="card-body"><p class="relation">街へ出る気分をつくる短編</p><h2>${esc(video.title)}</h2><p class="creator">${esc(video.creator)}</p><p class="card-action">この映像を見る <span aria-hidden="true">→</span></p></div></a></article>`).join('');
write('short-films/index.html', shell('街へ出たくなる短編映像', `<section class="intro"><p class="eyebrow">全街共通 / 約1〜4分</p><h1>街へ出たくなる、<br>${commonVideos.length}つの短編。</h1><p class="lead">街の資料だけではなく、単体の映像作品として面白く、人や移動、出会いの余韻が残るものを選びました。企業広告は、広告主の業種ではなく、この場所で観る理由から選んでいます。</p></section><div class="collection"><section class="work-grid" aria-label="共通の短編映像${commonVideos.length}件">${commonCards}</section><p class="city-exit"><a href="/discover/index.html">街から作品を探す →</a></p></div>`, '<a href="/discover/index.html">街と作品の一覧へ ←</a>'));

for (const video of commonVideos) {
  const sourceLinks = video.sources.map(source => `<p>${external(source,new URL(source).hostname.replace('www.','')+' の掲載情報')}</p>`).join('');
  const player = `<section class="player v3-video" data-video-id="${video.videoId}" data-video-title="${esc(video.title)}" aria-label="映像プレイヤー"><div class="v3-video-frame"><button class="v3-video-load primary" type="button" hidden>このページでプレイヤーを開く ▶</button><noscript><p>下のYouTubeへのリンクから、この映像を観られます。</p></noscript></div><button class="player-stop" type="button" hidden>プレイヤーを閉じて停止</button><p class="player-status" role="status" aria-live="polite">YouTubeの公開映像です。下のリンクからも観られます。</p></section>`;
  write(`short-films/${video.id}.html`, shell(`${video.title}｜街へ出たくなる短編`, `<article class="detail"><p class="eyebrow">全街共通 / 街へ出たくなる短編</p><h1>${esc(video.title)}</h1><p class="detail-creator">${esc(video.creator)}</p><p class="detail-hook">${esc(video.hook)}</p>${player}<div class="destination">${external(video.url,'YouTubeでこの映像を見る','primary official-exit')}<p>表示・再生できない場合は、公開元の同じ映像へ。新しいタブで開きます。</p></div><details class="background"><summary>このサイトで紹介する理由・出典</summary><p>${esc(video.note)}</p>${sourceLinks}<p>紹介先・出典確認：${checkedAt}。映像は公開元のプレイヤーで提供されます。</p></details><p class="city-exit"><a href="/discover/index.html">次は街から作品を探す →</a></p></article>`, '<a href="/discover/short-films/index.html">短編を選び直す ←</a>'));
}

function youtubePlayer(videoId, title, mediaKind='video') {
  const audioMode=mediaKind==='audio';
  const noun=audioMode?'音':'映像';
  return `<section class="player v3-video ${audioMode?'audio-player':''}" data-video-id="${videoId}" data-video-title="${esc(title)}" aria-label="${audioMode?'音楽・サウンド':'映像'}プレイヤー"><div class="v3-video-frame"><button class="v3-video-load primary" type="button" hidden>このページで${noun}を${audioMode?'聴く':'観る'} ▶</button><noscript><p>下のYouTubeへのリンクから、この${noun}を${audioMode?'聴け':'観られ'}ます。</p></noscript></div><button class="player-stop" type="button" hidden>プレイヤーを閉じて停止</button><p class="player-status" role="status" aria-live="polite">YouTubeで公開された${audioMode?'演奏・音源':'映像'}です。下のリンクからも${audioMode?'聴け':'観られ'}ます。</p></section>`;
}

for(const city of cities) for(const [kind, category] of Object.entries(categories)) {
  const selected=items.filter(i=>i.city===city&&i.kind===kind);
  if(selected.length<5||selected.length>10)throw new Error(city+' '+kind+': keep a collection between five and ten entries');
  const tabs=Object.entries(categories).map(([k,v])=>k===kind?`<span aria-current="page">${v.name} <small>${items.filter(i=>i.city===city&&i.kind===k).length}</small></span>`:`<a href="/discover/${city}/${k}.html">${v.name} <small>${items.filter(i=>i.city===city&&i.kind===k).length}</small></a>`).join('');
  const cards=selected.map((i,n)=>`<article class="work-card ${kind}"><a href="/discover/${city}/${i.id}.html"><div class="card-art" aria-hidden="true"><span class="media-mark">${category.mark}</span><span class="card-number">${String(n+1).padStart(2,'0')}</span></div><div class="card-body"><p class="relation">${esc(i.relation)}</p><h2>${esc(i.title)}</h2><p class="creator">${esc(i.creator)}</p><p class="card-action">${kind==='audio'?'この音を聴く':kind==='video'?'この映像を見る':kind==='book'?'この本に出会う':'この映画に出会う'} <span aria-hidden="true">→</span></p></div></a></article>`).join('');
  const f=features[city];
  write(`${city}/${kind}.html`, shell(`${cityNames[city]}の${category.name}`, `<section class="city-hero"><div class="city-panorama">${photo(city,true)}</div><div class="city-heading"><p class="eyebrow">街と作品の文化案内</p><h1>${cityNames[city]}<span>の${category.name}</span></h1></div></section><div class="collection"><nav class="category-nav" aria-label="${cityNames[city]}の種類を選ぶ">${tabs}</nav><p class="collection-lead">${kind==='audio'?'この街で実際に鳴った音楽やサウンドを、まず一曲。':kind==='video'?'街の人、店先、時間。気になる映像をひとつ。':kind==='book'?'物語から入って、ゆかりの街を知る。': '街が舞台の映画と、街の映画館が選んだ映画。'}</p><section class="work-grid" aria-label="${category.name}の${selected.length}件">${cards}</section><aside class="feature"><p class="eyebrow">この街を、もう少し深く</p><h2>${external(f.url,f.title)}</h2><p>${esc(f.note)}</p><small>関連する外部特集・新しいタブ</small></aside><p class="city-exit"><a href="/shelf.html?shelf=${city}">${cityNames[city]}の場所・催しの案内へ →</a></p>${credits([city])}</div>`, '<a href="/discover/index.html">街を選び直す ←</a>', city));
}
for(const item of items) {
  const {city,kind}=item;
  const mainAction=item.id==='1q84'?'新潮社の作品ゆかりの地特集を読む':item.id==='honda'?'ぴあの出版案内を読む':item.action;
  const action=item.url.startsWith('/')?`<a class="primary" href="${esc(item.url)}">${esc(mainAction)} →</a>`:external(item.url,mainAction,'primary official-exit');
  const player=item.videoId?youtubePlayer(item.videoId,item.title,kind):'';
  const trailer=item.trailerVideoId?`<section class="trailer"><p class="eyebrow">公式・公開予告</p><h2>まず予告を観る</h2>${youtubePlayer(item.trailerVideoId,item.title+' 予告')}<p class="trailer-fallback">${external(item.trailerUrl,'YouTubeで同じ予告を見る')}</p><p class="player-status">予告であり、本編ではありません。表示・再生できない場合は公開元へ。</p></section>`:'';
  const sourceLinks=item.sources.filter(s=>s!==item.url&&s!==item.trailerUrl);
  const background=`<details class="background"><summary>この街との関係・出典</summary><p>${esc(item.relationNote)}</p>${sourceLinks.map(s=>`<p>${external(s,new URL(s).hostname.replace('www.','')+' の掲載情報')}</p>`).join('')}<p>紹介先・出典確認：${checkedAt}。${item.videoId?(kind==='audio'?'音楽・サウンド':'映像')+'は公開元のプレイヤーで提供されます。':'外部の視聴・読書条件は各提供元の案内で確認できます。'}</p></details>`;
  write(`${city}/${item.id}.html`, shell(`${item.title}｜${cityNames[city]}の${categories[kind].name}`, `<article class="detail"><p class="eyebrow">${cityNames[city]} / ${categories[kind].name} / ${esc(item.relation)}</p><h1>${esc(item.title)}</h1><p class="detail-creator">${esc(item.creator)}</p><p class="detail-hook">${esc(item.hook)}</p>${player}${trailer}<div class="destination">${action}<p>${item.url.startsWith('/')?'このサイト内で、本人操作による映像・音の体験へ。':item.videoId?'表示・再生できない場合は、公開元の同じ'+(kind==='audio'?'音':'映像')+'へ。':'外部の作品・特集ページへ。'}${item.url.startsWith('/')?'':'新しいタブで開きます。'}</p></div>${background}<p class="city-exit"><a href="/shelf.html?shelf=${city}">${cityNames[city]}の場所・催しの案内へ →</a></p></article>`, `<a href="/discover/${city}/${kind}.html">${categories[kind].name}を選び直す ←</a>`, city));
}
// Entries are replaced during editorial maintenance. Remove only obsolete generated
// detail pages inside known city directories; category pages and hand-authored assets
// are explicitly protected.
const protectedPages = new Set(['audio.html', 'video.html', 'book.html', 'film.html']);
const expectedDetails = new Set(items.map(item => `${item.city}/${item.id}.html`));
for (const city of cities) {
  const dir = path.join(root, 'discover', city);
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.html') || protectedPages.has(file)) continue;
    const relative = `${city}/${file}`;
    if (expectedDetails.has(relative)) continue;
    const obsolete = path.join(dir, file);
    if (process.argv.includes('--check')) throw new Error('Obsolete generated page remains: ' + obsolete);
    fs.unlinkSync(obsolete);
  }
}
const expectedCommonDetails = new Set(commonVideos.map(video => `${video.id}.html`));
const commonDir = path.join(root, 'discover', 'short-films');
for (const file of fs.readdirSync(commonDir)) {
  if (!file.endsWith('.html') || file === 'index.html' || expectedCommonDetails.has(file)) continue;
  const obsolete = path.join(commonDir, file);
  if (process.argv.includes('--check')) throw new Error('Obsolete generated page remains: ' + obsolete);
  fs.unlinkSync(obsolete);
}
const sitemapPaths=['','works.html',...generatedFiles.map(file=>`discover/${file === 'index.html' ? '' : file.replace(/index\.html$/, '')}`)];
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map((file,index)=>`  <url>\n    <loc>https://emotionbookstore.com/${file}</loc>\n    <lastmod>${checkedAt}</lastmod>\n    <changefreq>${index<2?'weekly':'monthly'}</changefreq>\n    <priority>${index===0?'1.0':index<3?'0.9':file.endsWith('/')?'0.8':'0.6'}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
const sitemapFile=path.join(root,'sitemap.xml');
if(process.argv.includes('--check')) {
  if(!fs.existsSync(sitemapFile)||fs.readFileSync(sitemapFile,'utf8')!==sitemap)throw new Error('Generated sitemap differs: '+sitemapFile);
} else fs.writeFileSync(sitemapFile,sitemap);
console.log(`PASS ${written} discovery pages ${process.argv.includes('--check')?'match source':'generated'}; ${items.length} city entries + ${commonVideos.length} common shorts`);
