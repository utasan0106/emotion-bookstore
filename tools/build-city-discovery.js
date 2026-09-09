'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {items, excludedItems, commonVideos, checkedAt} = require('./city-discovery-source');
const workMedia=require('./work-media');
const profiles=require('./artist-profiles');
const root = path.resolve(__dirname, '..');
const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'release_content.js'), 'utf8'), sandbox);
const content = sandbox.window.V3_RELEASE_CONTENT;
const cityNames = {koenji:'高円寺', shimokitazawa:'下北沢', kichijoji:'吉祥寺', jinbocho:'神保町'};
const categories = {audio:{name:'音楽・サウンド', verb:'音を選ぶ', mark:'♪'}, video:{name:'映像', verb:'映像を選ぶ', mark:'▶'}, book:{name:'本・漫画', verb:'本を選ぶ', mark:'本'}, film:{name:'映画', verb:'映画を選ぶ', mark:'映'}};

const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function media(city) { return content.shelves.find(c => c.id === city).heroMedia; }
function photo(city, eager=false) {
  const m = media(city);
  return `<img src="/${m.url.replace('./','')}" alt="${esc(m.alt)}" width="${m.width}" height="${m.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const external = (url, label, cls='') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
function artistProfile(item) {
  const profile=profiles[item.id];
  if(!profile) return '';
  return `<details class="background artist-profile"><summary>${esc(profile.name)}について</summary><p>${esc(profile.text)}</p><p>${external(profile.url,'公式プロフィール・出典')}</p><small>公式情報を要約 · 確認：${esc(profile.checkedAt)}</small></details>`;
}
function relatedPerformance(item) {
  const pairs = {
    'yoshida-night-edge': ['yoshida-tinderness', '同じ公演を、バンド編成でもう一曲。'],
    'yoshida-tinderness': ['yoshida-night-edge', '同じ公演から、TRIO編成の演奏へ。']
  };
  const relation = pairs[item.id];
  if (!relation) return '';
  const target = items.find(candidate => candidate.city === item.city && candidate.id === relation[0]);
  if (!target) throw new Error('Missing related performance: '+relation[0]);
  return `<section class="related-performance"><h2>同じ人の、別の演奏</h2><p>${esc(relation[1])}</p><p><a href="/discover/${target.city}/${target.id}.html">${esc(target.title)} →</a></p></section>`;
}
function cityContinuation(city,kind) {
  const name=cityNames[city];
  if(!items.some(item=>item.city===city&&item.kind===kind)) return `<aside class="feature"><p class="eyebrow">同じ街から探す</p><h2><a href="/discover/${city}/video.html">${name}の街を映像で見る →</a></h2><p>この種類の作品は現在掲載していません。${name}の風景や人に触れる映像から選べます。</p><p><a href="/discover/${city}/">${name}の作品一覧へ →</a></p></aside>`;
  const reason=kind==='audio'?'演奏を聴いたあとは、会場のある街の風景や人を映像で。':kind==='video'?'映像で気になった街の場所や来歴を、次に辿れます。':kind==='book'?'本で触れた街を、今度は映像から眺めてみる。':'映画と街の関係を辿ったあとは、その街の風景も。';
  const target=kind==='video'?`/shelf.html?shelf=${city}`:`/discover/${city}/video.html`;
  const label=kind==='video'?`${name}の場所・歴史を見る`:`${name}の街を映像で見る`;
  return `<aside class="feature"><p class="eyebrow">次は、街へ</p><h2><a href="${target}">${label} →</a></h2><p>${reason}</p><small>このサイト内の案内</small></aside>`;
}
function shortFilmsEntry() {
  return '<section class="quick"><h2>街へ出たくなる短編映像</h2><p>人・移動・暮らしを描く3つの短編。特定の街の観光案内ではなく、企業広告を含む映像作品です。</p><a href="/discover/short-films/">3つの映像を選ぶ →</a></section>';
}
const plain = value => String(value).replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
const canonicalFor = file => `https://emotionbookstore.com/discover/${file === 'index.html' ? '' : file.replace(/index\.html$/, '')}`;
function credits(cities) {
  return `<details class="credits"><summary>街の写真・出典</summary>${cities.map(c => {const m=media(c);return `<p>${cityNames[c]}の街の写真：${external(m.sourceUrl,m.author)} / ${external(m.licenseUrl,m.license)}。既存の縮小画像を使用し、表示範囲をトリミング。作品の表紙・場面写真ではありません。</p>`;}).join('')}</details>`;
}
function shell(title, body, back, active='') {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="referrer" content="strict-origin-when-cross-origin"><meta name="description" content="街とつながる音楽、映像、本、映画を選ぶ文化案内。作品に触れたあと、ゆかりの場所や関連特集へ。"><title>${esc(title)}｜みんなの感情書店</title><link rel="icon" href="/assets/favicon.ico"><link rel="stylesheet" href="/discover/discover.css"></head>
<body class="${active}"><a class="skip" href="#main">本文へ</a><header class="masthead"><a class="brand" href="/index.html"><img src="/assets/brand/emotion-bookstore-lockup-reversed.png" alt="みんなの感情書店" width="1429" height="331"></a>${back || '<a href="/works.html">紹介した作品へ →</a>'}</header>
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
  const column=require('./city-columns')[file.split('/')[1]?.replace(/\.html$/, '')];
  if(column && file.startsWith(column.city+'/')) {
    const section=`<section class="city-column" aria-labelledby="city-column-title"><p class="eyebrow">街と人の小さなコラム</p><h2 id="city-column-title">${esc(column.title)}</h2>${column.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<p>${esc(column.note)}</p><details class="background"><summary>コラムの出典</summary>${column.sources.map(s=>`<p>${external(s.url,s.label)}</p>`).join('')}<p>確認：${esc(column.checkedAt)}</p></details></section>`;
    html=html.replace('<details class="background"><summary>この街との関係・出典</summary>',section+'<details class="background"><summary>この街との関係・出典</summary>');
  }
  const [city, categoryFile]=file.split('/');
  const kind=categoryFile?.replace(/\.html$/, '');
  const editorials=require('./city-editorials')[city];
  // Columns are a separate reading route, including cities with no book inventory.
  if(editorials?.length) {
    const entry=`<p class="editorial-entry"><a href="/discover/${city}/#editorials-title">${cityNames[city]}の街と人のコラムを読む →</a></p>`;
    html=html.replace('</nav><section class="work-grid"', '</nav>'+entry+'<section class="work-grid"');
    html=html.replace('</nav><p class="collection-lead"', '</nav>'+entry+'<p class="collection-lead"');
  }
  const detailItem=items.find(item=>file===`${item.city}/${item.id}.html`);
  if(detailItem) {
    const relation=`<section class="work-city-context" aria-label="街とのつながり"><h2>${cityNames[city]}とのつながり</h2><p>${esc(detailItem.relationNote)}</p></section>`;
    html=html.replace('<details class="background"><summary>この街との関係・出典</summary>',relation+'<details class="background"><summary>この街との関係・出典</summary>');
  }
  const editorialKind={koenji:'book',kichijoji:'book',shimokitazawa:'video',jinbocho:'film'}[city];
  if(editorials && (categoryFile==='index.html' || kind===editorialKind)) {
    const heading=city==='kichijoji'?'漫画家と、吉祥寺':`人と作品から知る、${cityNames[city]}`;
    const section=`<section class="city-editorials" aria-labelledby="editorials-title"><h2 id="editorials-title">${esc(heading)}</h2><p>知っている作品から、街とのつながりを辿る。</p>${editorials.map(entry=>`<details class="background" id="${esc(entry.id)}"><summary>${esc(entry.title)}</summary>${entry.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<p>${external(entry.sourceUrl,entry.sourceLabel)}</p>${entry.relatedUrl?`<p><a href="${esc(entry.relatedUrl)}">${esc(entry.relatedLabel)} →</a></p>`:''}<p>感情書店の独自編集文 · 出典確認：${esc(entry.checkedAt)}</p></details>`).join('')}<p>本人・関係団体による監修や公認を受けた記事ではありません。</p></section>`;
    html=html.replace('<section class="quick">',section+'<section class="quick">');
  }
  if(cityNames[city] && categories[kind]) {
    const alternatives=Object.entries(cityNames).filter(([id])=>id!==city).map(([id,name])=>({id,name,count:items.filter(item=>item.city===id&&item.kind===kind).length})).filter(entry=>entry.count>0);
    if(alternatives.length) {
      const links=alternatives.map(entry=>`<a href="/discover/${entry.id}/${kind}.html">${entry.name}<span>${entry.count}件</span></a>`).join('');
      const navigation=`<nav class="other-cities" aria-label="別の街の${categories[kind].name}"><h2>別の街の${categories[kind].name}も見る</h2><div>${links}</div></nav>`;
      html=html.replace('<section class="work-grid"', navigation+'<section class="work-grid"');
    }
  }
  html=require('./page-chrome')(html);
  html=enrichSeo(file,html);
  const output=path.join(root,'discover',file);
  if(process.argv.includes('--check')) {
    if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html)throw new Error('Generated page differs: '+output);
  }else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);}
  generatedFiles.push(file);
  written++;
}
const cities=Object.keys(cityNames);
function workCard(i) {
  return `<article class="work-card ${i.kind}">${workMedia.forItem(i)}<div class="card-body"><p class="relation">${esc(categories[i.kind].name)} · ${esc(i.relation)}</p><h2><a href="/discover/${i.city}/${i.id}.html">${esc(i.title)}</a></h2><p class="creator">${esc(i.creator)}</p><p class="card-hook">${esc(i.hook)}</p>${artistProfile(i)}<div class="card-links"><a class="primary" href="/discover/${i.city}/${i.id}.html">作品を見る</a><a href="/discover/${i.city}/${i.kind}.html">${categories[i.kind].name}の一覧</a></div></div></article>`;
}
// Every city entry has a real static destination, including without JavaScript.
for (const city of cities) {
  const available=Object.entries(categories).filter(([kind])=>items.some(i=>i.city===city&&i.kind===kind));
  const tabs=available.map(([kind,category])=>`<a href="/discover/${city}/${kind}.html">${category.name} <small>${items.filter(i=>i.city===city&&i.kind===kind).length}</small></a>`).join('');
  const featured=available.map(([kind])=>items.find(i=>i.city===city&&i.kind===kind));
  write(`${city}/index.html`,shell(`${cityNames[city]}の作品`, `<section class="city-hero"><div class="city-panorama">${photo(city,true)}</div><div class="city-heading"><p class="eyebrow">街から見つける</p><h1>${cityNames[city]}<span>の作品</span></h1></div></section><div class="collection"><nav class="category-nav" aria-label="${cityNames[city]}の種類を選ぶ">${tabs}</nav><section class="work-grid" aria-label="${cityNames[city]}の作品">${featured.map(workCard).join('')}</section>${shortFilmsEntry()}<div class="city-next"><a href="/outings/?city=${city}">${cityNames[city]}の催し</a><a href="/shelf.html?shelf=${city}">ゆかりの場所・歴史</a></div>${credits([city])}</div>`, '<a href="/discover/">街を選び直す</a>',city));
}
write('index.html', shell('街から音楽、映像、本、映画を探す', `<section class="intro"><p class="eyebrow">聴く・観る・読む</p><h1>街から、<br>気になる作品へ。</h1><p class="lead">街で鳴った音楽、街を映す映像、本、映画に出会う文化案内。<br>まずひとつ楽しんで、ゆかりの場所や関連特集へ。</p></section>
<section class="city-grid" aria-label="街を選ぶ">${cities.map(c=>`<a class="city-card" href="/discover/${c}/"><div class="city-image">${photo(c)}</div><div class="city-caption"><h2>${cityNames[c]}</h2><p>音楽 ${items.filter(i=>i.city===c&&i.kind==='audio').length} / 映像 ${items.filter(i=>i.city===c&&i.kind==='video').length} / 本・漫画 ${items.filter(i=>i.city===c&&i.kind==='book').length} / 映画 ${items.filter(i=>i.city===c&&i.kind==='film').length}</p><span>${cityNames[c]}の作品を選ぶ →</span></div></a>`).join('')}</section>
<section class="quick"><p class="eyebrow">街を決めずに観る</p><h2>街へ出たくなる、${commonVideos.length}つの短編。</h2><div class="quick-grid"><a href="/discover/short-films/index.html"><strong>人・移動・出会いを描く映像へ →</strong><span>企業広告も、単体で心に残る映像作品として選びました</span></a></div></section>
<section class="quick"><p class="eyebrow">短い体験から</p><h2>同じ場所、違う聴こえ方。</h2><div class="quick-grid"><a href="/v3-prototype/culture-experience-r2/shimokitazawa/?recording=shelter"><strong>「夕暮れのジャイロ」を聴き比べる →</strong><span>下北沢SHELTERのライブとソロ盤</span></a><a href="/v3-prototype/culture-experience-r2/kichijoji/?scene=film"><strong>『PARKS』の予告と公園の声へ →</strong><span>吉祥寺・井の頭公園 / 1分59秒と57秒</span></a></div></section>${credits(cities)}`));

const commonCards = commonVideos.map(video=>`<article class="work-card video">${workMedia.youtube(video.videoId,video.title)}<div class="card-body"><p class="relation">街へ出る気分をつくる短編</p><h2><a href="/discover/short-films/${video.id}.html">${esc(video.title)}</a></h2><p class="creator">${esc(video.creator)}</p><p class="card-hook">${esc(video.hook)}</p><div class="card-links">${external(video.url,'YouTubeで観る','primary official-exit')}<a href="/discover/short-films/${video.id}.html">紹介を読む →</a></div></div></article>`).join('');
write('short-films/index.html', shell('街へ出たくなる短編映像', `<section class="intro"><p class="eyebrow">全街共通 / 約1〜4分</p><h1>街へ出たくなる、<br>${commonVideos.length}つの短編。</h1><p class="lead">街の資料だけではなく、単体の映像作品として面白く、人や移動、出会いの余韻が残るものを選びました。企業広告は、広告主の業種ではなく、この場所で観る理由から選んでいます。</p></section><div class="collection"><section class="work-grid" aria-label="共通の短編映像${commonVideos.length}件">${commonCards}</section><p class="city-exit"><a href="/discover/index.html">街から作品を探す →</a></p></div>`, '<a href="/discover/index.html">街と作品の一覧へ ←</a>'));

for (const video of commonVideos) {
  const sourceLinks = video.sources.map(source => `<p>${external(source,new URL(source).hostname.replace('www.','')+' の掲載情報')}</p>`).join('');
  const player = workMedia.youtube(video.videoId,video.title);
  write(`short-films/${video.id}.html`, shell(`${video.title}｜街へ出たくなる短編`, `<article class="detail"><p class="eyebrow">全街共通 / 街へ出たくなる短編</p><h1>${esc(video.title)}</h1><p class="detail-creator">${esc(video.creator)}</p><p class="detail-hook">${esc(video.hook)}</p>${player}<div class="destination">${external(video.url,'YouTubeでこの映像を見る','primary official-exit')}<p>表示・再生できない場合は、公開元の同じ映像へ。新しいタブで開きます。</p></div><details class="background"><summary>このサイトで紹介する理由・出典</summary><p>${esc(video.note)}</p>${sourceLinks}<p>紹介先・出典確認：${checkedAt}。映像は公開元のプレイヤーで提供されます。</p></details><p class="city-exit"><a href="/discover/index.html">次は街から作品を探す →</a></p></article>`, '<a href="/discover/short-films/index.html">短編を選び直す ←</a>'));
}


for(const city of cities) for(const [kind, category] of Object.entries(categories)) {
  const selected=items.filter(i=>i.city===city&&i.kind===kind);
  if(selected.length>10)throw new Error(city+' '+kind+': keep a collection at most ten entries');
  const tabs=Object.entries(categories).filter(([k])=>items.some(i=>i.city===city&&i.kind===k)).map(([k,v])=>k===kind?`<span aria-current="page">${v.name} <small>${items.filter(i=>i.city===city&&i.kind===k).length}</small></span>`:`<a href="/discover/${city}/${k}.html">${v.name} <small>${items.filter(i=>i.city===city&&i.kind===k).length}</small></a>`).join('');
  const cards=selected.map(i=>`<article class="work-card ${kind}">${workMedia.forItem(i)}<div class="card-body"><p class="relation">${esc(i.relation)}</p><h2><a href="/discover/${city}/${i.id}.html">${esc(i.title)}</a></h2><p class="creator">${esc(i.creator)}</p><p class="card-hook">${esc(i.hook)}</p>${artistProfile(i)}<div class="card-links">${i.url.startsWith('/')?`<a class="primary" href="${esc(i.url)}">${esc(i.action)} →</a>`:external(i.url,i.action,'primary official-exit')}<a href="/discover/${city}/${i.id}.html">紹介を読む →</a></div></div></article>`).join('');
  write(`${city}/${kind}.html`, shell(`${cityNames[city]}の${category.name}`, `<section class="city-hero"><div class="city-panorama">${photo(city,true)}</div><div class="city-heading"><p class="eyebrow">街と作品の文化案内</p><h1>${cityNames[city]}<span>の${category.name}</span></h1></div></section><div class="collection"><nav class="category-nav" aria-label="${cityNames[city]}の種類を選ぶ">${tabs}</nav><p class="collection-lead">${kind==='audio'?'この街で実際に鳴った音楽やサウンドを、まず一曲。':kind==='video'?'街の人、店先、時間。気になる映像をひとつ。':kind==='book'?'物語から入って、ゆかりの街を知る。': '街が舞台の映画と、街の映画館が選んだ映画。'}</p><section class="work-grid" aria-label="${category.name}の${selected.length}件">${cards || `<p>この街の${category.name}は現在掲載していません。<a href="/works.html">紹介中の作品を見る →</a></p>`}</section>${cityContinuation(city,kind)}${shortFilmsEntry()}<p class="city-exit"><a href="/shelf.html?shelf=${city}">${cityNames[city]}の場所・歴史へ →</a></p><p class="city-exit"><a href="/outings/?city=${city}">${cityNames[city]}の今の文化イベントへ →</a></p>${credits([city])}</div>`, '<a href="/discover/index.html">街を選び直す ←</a>', city));
}
for(const item of items) {
  const {city,kind}=item;
  const mainAction=item.id==='1q84'?'新潮社の作品ゆかりの地特集を読む':item.id==='honda'?'ぴあの出版案内を読む':item.action;
  const action=item.url.startsWith('/')?`<a class="primary" href="${esc(item.url)}">${esc(mainAction)} →</a>`:external(item.url,mainAction,'primary official-exit');
  const player=workMedia.forItem(item);
  const trailer='';
  const sourceLinks=item.sources.filter(s=>s!==item.url&&s!==item.trailerUrl);
  const background=`<details class="background"><summary>この街との関係・出典</summary><p>${esc(item.relationNote)}</p>${sourceLinks.map(s=>`<p>${external(s,new URL(s).hostname.replace('www.','')+' の掲載情報')}</p>`).join('')}<p>紹介先・出典確認：${checkedAt}。${item.videoId?(kind==='audio'?'音楽・サウンド':'映像')+'は公開元のプレイヤーで提供されます。':'外部の視聴・読書条件は各提供元の案内で確認できます。'}</p></details>`;
write(`${city}/${item.id}.html`, shell(`${item.title}｜${cityNames[city]}の${categories[kind].name}`, `<article class="detail"><p class="eyebrow">${cityNames[city]} / ${categories[kind].name} / ${esc(item.relation)}</p><h1>${esc(item.title)}</h1><p class="detail-creator">${esc(item.creator)}</p><p class="detail-hook">${esc(item.hook)}</p>${player}${trailer}<div class="destination">${action}<p>${item.url.startsWith('/')?'このサイト内で、本人操作による映像・音の体験へ。':item.videoId?'表示・再生できない場合は、公開元の同じ'+(kind==='audio'?'音':'映像')+'へ。':'外部の作品・特集ページへ。'}${item.url.startsWith('/')?'':'新しいタブで開きます。'}</p></div>${artistProfile(item)}${background}${relatedPerformance(item)}<p class="city-exit"><a href="/discover/${city}/${kind}.html">${categories[kind].name}を選び直す →</a></p><p class="city-exit"><a href="/shelf.html?shelf=${city}">${cityNames[city]}の場所・歴史へ →</a></p></article>`, `<a href="/discover/${city}/${kind}.html">${categories[kind].name}を選び直す ←</a>`, city));
}
// Entries are replaced during editorial maintenance. Remove only obsolete generated
// detail pages inside known city directories; category pages and hand-authored assets
// are explicitly protected.
const protectedPages = new Set(['index.html', 'audio.html', 'video.html', 'book.html', 'film.html']);
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
// Retired detail URLs retain a route to a current collection; no empty detail shells.
const configPath=path.join(root,'vercel.json');
const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
const retiredPaths=new Set(excludedItems.map(i=>`/discover/${i.city}/${i.id}.html`));
config.redirects=(config.redirects||[]).filter(r=>!retiredPaths.has(r.source));
for(const i of excludedItems)config.redirects.push({source:`/discover/${i.city}/${i.id}.html`,destination:items.some(x=>x.city===i.city&&x.kind===i.kind)?`/discover/${i.city}/${i.kind}.html`:`/discover/${i.city}/`,permanent:false});
const configText=JSON.stringify(config,null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(configPath,'utf8')!==configText)throw new Error('Retired work redirects differ');}
else fs.writeFileSync(configPath,configText);
const weeklyPaths=require('./build-weekly-outings');
const sitemapPaths=['','works.html','visit/','about.html',...Object.keys(cityNames).map(city=>'shelf.html?shelf='+city),...['book','film','music','video'].map(kind=>'work-'+kind+'.html'),...weeklyPaths,...generatedFiles.map(file=>`discover/${file === 'index.html' ? '' : file.replace(/index\.html$/, '')}`)];
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map((file,index)=>`  <url>\n    <loc>https://emotionbookstore.com/${file}</loc>\n    <lastmod>${checkedAt}</lastmod>\n    <changefreq>${index<2?'weekly':'monthly'}</changefreq>\n    <priority>${index===0?'1.0':index<3?'0.9':file.endsWith('/')?'0.8':'0.6'}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
const sitemapFile=path.join(root,'sitemap.xml');
if(process.argv.includes('--check')) {
  if(!fs.existsSync(sitemapFile)||fs.readFileSync(sitemapFile,'utf8')!==sitemap)throw new Error('Generated sitemap differs: '+sitemapFile);
} else fs.writeFileSync(sitemapFile,sitemap);
console.log(`PASS ${written} discovery pages ${process.argv.includes('--check')?'match source':'generated'}; ${items.length} city entries + ${commonVideos.length} common shorts`);
