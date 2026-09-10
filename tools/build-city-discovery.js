'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {items, excludedItems, commonVideos, checkedAt} = require('./city-discovery-source');
const workMedia=require('./work-media');
const profiles=require('./artist-profiles');
const research=require('./city-research');
const citySignals=[
  {event:'shimokita-moon',title:'通りを、アートを観る場所に',reading:'下北線路街を含む街全体に作品を展開する企画。線路跡の変化を読んだあと、そこで何が行われるのかを確かめる入口に。'},
  {event:'kichijoji-livepainting',title:'絵本の作り手に、街で出会う',reading:'吉祥寺をイメージしたギターサンタの公開制作。作品を見るだけでなく、色が加わる過程を楽しむという過ごし方。'},
  {event:'jinbocho-pokemon',title:'昔の短編を、映画館で見直す',reading:'1999年・2001年・2003年の短編をまとめて上映する企画。記憶のある作品に、今の映画館で出会い直す入口。'},
  {event:'koenji-cafetalk',title:'観劇の先に、つくり手の話を',reading:'ろう者と聴者の協働について話すカフェトーク。舞台の鑑賞と、その背景を知る時間をつなぐ提案。'}
];
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
const crossMediaPairs={
  jirokichi:'next-town-koenji','next-town-koenji':'jirokichi',
  honnoniwa:'musashino-green','musashino-green':'honnoniwa',
  indies:'bocchi-main-pv','bocchi-main-pv':'indies',
  kaijin:'used-book-festival','used-book-festival':'kaijin'
};
function relatedWork(item) {
  const target=items.find(candidate=>candidate.city===item.city&&candidate.id===crossMediaPairs[item.id]);
  if(!target) return '';
  const heading=item.kind==='book'?'本を閉じたら、この映像へ':'映像のあと、この本へ';
  return `<section class="related-work"><p class="eyebrow">${heading}</p><h2><a href="/discover/${target.city}/${target.id}.html">${esc(target.title)} →</a></h2><p>${esc(target.hook)}</p><small>${esc(categories[target.kind].name)} · このサイト内の紹介</small></section>`;
}
function cityContinuation(city,kind) {
  const name=cityNames[city];
  if(!items.some(item=>item.city===city&&item.kind===kind)) return `<aside class="feature"><p class="eyebrow">同じ街から探す</p><h2><a href="/discover/${city}/video.html">${name}の街を映像で見る →</a></h2><p>この種類の作品は現在掲載していません。${name}の風景や人に触れる映像から選べます。</p><p><a href="/discover/${city}/">${name}の作品一覧へ →</a></p></aside>`;
  const reason=kind==='audio'?'演奏を聴いたあとは、会場のある街の風景や人を映像で。':kind==='video'?'映像で気になった街の場所や来歴を、次に辿れます。':kind==='book'?'本で触れた街を、今度は映像から眺めてみる。':'映画と街の関係を辿ったあとは、その街の風景も。';
  const target=kind==='video'?`/shelf.html?shelf=${city}`:`/discover/${city}/video.html`;
  const label=kind==='video'?`${name}の場所・歴史を見る`:`${name}の街を映像で見る`;
  return `<aside class="feature"><p class="eyebrow">次は、街へ</p><h2><a href="${target}">${label} →</a></h2><p>${reason}</p><small>このサイト内の案内</small></aside>`;
}
// 街へ出かけたくなる。編集部が選んだ、いま行ける場所が写っている映像。
// 基準：映像の主題が「いま行ける場所」であること。作品（アニメ・舞台）が主題のもの、
// 閉じた施設や過去を主題にしたもの、自治体の市・区全体を紹介するものは入れない。
// 外したものと理由：
//   koenji/awa-history            祭りの来歴が主題
//   shimokitazawa/kitazawa-guide  世田谷区による地区PR映像
//   shimokitazawa/womenslib-interview  上演された舞台が主題
//   shimokitazawa/bocchi-main-pv  アニメのPV。場所そのものではない
//   jinbocho/jinbocho-1960s       1960年代が主題
//   jinbocho/iwanami-hall         2022年に閉館。もう行けない
//   kichijoji/musashino-green     武蔵野市全体の風景
const outingVideoIds = [
  'koenji/awa-2025', 'koenji/tenguren', 'koenji/pal-street', 'koenji/street-food', 'koenji/next-town-koenji',
  'shimokitazawa/shelter-news', 'shimokitazawa/tefu-1500', 'shimokitazawa/obonro-walk',
  'kichijoji/park-voice', 'kichijoji/uplink', 'kichijoji/kichion-ichihara', 'kichijoji/kichion-toranoko', 'kichijoji/kichion-lady',
  'jinbocho/gyokueido', 'jinbocho/italia', 'jinbocho/used-book-festival'
];
// 棚を通った本と音楽は、その時点で採否が済んでいる。だから絞り込みはせず、
// 街をまたいで一つにまとめるだけ。順序は編集部の並びで、公開したものが一つでも
// 抜ければビルドが落ちる（数合わせではなく、全部が出る保証のため）。
const readingBookIds = [
  'koenji/junjo', 'koenji/jirokichi', 'koenji/shiroku-somaru', 'koenji/1q84',
  'shimokitazawa/nekomachi', 'shimokitazawa/lady-jane', 'shimokitazawa/indies', 'shimokitazawa/honda',
  'kichijoji/cinema-history', 'kichijoji/honnoniwa', 'kichijoji/gou-gou-book',
  'jinbocho/morisaki', 'jinbocho/morisaki-sequel', 'jinbocho/furuhon', 'jinbocho/furuhon-sequel', 'jinbocho/kaijin'
];
const listeningAudioIds = [
  'koenji/moon-in-june-play', 'koenji/big-the-grape', 'koenji/night-glory-scarlet', 'koenji/seabirth-live', 'koenji/pink-minds-live',
  'shimokitazawa/kaho-asa', 'shimokitazawa/bilingualboy-love', 'shimokitazawa/sleepinside-recycle', 'shimokitazawa/metrois-tokyo', 'shimokitazawa/mabuta-roundabout',
  'kichijoji/yoshida-night-edge', 'kichijoji/yoshida-tinderness', 'kichijoji/kobayashi-kokuhaku', 'kichijoji/uchu-mao-haircolor', 'kichijoji/takeuchi-ai-rain',
  'jinbocho/honobe-girl', 'jinbocho/gorilla-secret', 'jinbocho/sunshin-anniversary', 'jinbocho/chikuon-beautiful', 'jinbocho/motoki-tongping'
];
function seriesItems(ids, kind, label, complete) {
  const picked = ids.map(key => {
    const [city, id] = key.split('/');
    const item = items.find(i => i.city === city && i.id === id && i.kind === kind);
    if (!item) throw new Error(label + ' names an unpublished ' + kind + ': ' + key);
    return item;
  });
  if (new Set(ids).size !== ids.length) throw new Error(label + ' lists the same object twice');
  if (complete) {
    const missing = items.filter(i => i.kind === kind && !ids.includes(i.city + '/' + i.id));
    if (missing.length) throw new Error(label + ' leaves out a published ' + kind + ': ' + missing.map(i => i.city + '/' + i.id).join(', '));
  }
  return picked;
}
const outingVideos = outingVideoIds.map(key => {
  const [city, id] = key.split('/');
  const item = items.find(i => i.city === city && i.id === id && i.kind === 'video');
  if (!item) throw new Error('Outing series names an unpublished video: ' + key);
  return item;
});
const readingBooks = seriesItems(readingBookIds, 'book', '読みたくなる本', true);
const listeningAudio = seriesItems(listeningAudioIds, 'audio', '聴きたくなる音楽', true);
function seriesEntry(kind) {
  const e = {
    video: ['outing', '街へ出かけたくなる映像', 'いま行ける場所が写っている' + outingVideos.length + '本を、4つの街から選びました。', outingVideos.length + '本を見る'],
    book:  ['reading', '読みたくなる、街の本', '背景を知ると、その街の本だと分かる' + readingBooks.length + '冊。4つの街ぶんをまとめて置いています。', readingBooks.length + '冊を見る'],
    audio: ['listening', '聴きたくなる、街の音', 'その街で実際に鳴った演奏' + listeningAudio.length + '曲。4つの街ぶんをまとめて置いています。', listeningAudio.length + '曲を聴く']
  }[kind];
  if (!e) return '';
  return `<section class="quick"><h2>${e[1]}</h2><p>${e[2]}</p><a href="/discover/${e[0]}/">${e[3]} →</a></section>`;
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
${body.includes('data-video-id') ? '<script src="/video-embed.js" defer></script>' + (body.includes('class="player-stop"') ? '<script src="/discover/player.js" defer></script>' : '') : ''}${body.includes('data-rotation-epoch') ? '<script src="/outings/week.js" defer></script><script src="/discover/feature-week.js" defer></script>' : ''}</body></html>\n`;
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
  const essay=research.find(entry=>file===`essays/${entry.id}.html`);
  const isResearchIndex=file==='essays/index.html';
  const schemaObject=essay?{'@context':'https://schema.org','@type':'Article',headline:essay.title,description:essay.lead,datePublished:essay.publishedAt,dateModified:essay.modifiedAt,mainEntityOfPage:canonical,author:{'@type':'Organization',name:'みんなの感情書店編集部',url:'https://emotionbookstore.com/about.html'},publisher:{'@type':'Organization',name:'みんなの感情書店',url:'https://emotionbookstore.com/'},about:{'@type':'Place',name:essay.cityLabel},citation:essay.sources.map(source=>source.url)}:{'@context':'https://schema.org','@type':isResearchIndex?'CollectionPage':'WebPage',name:heading,description,url:canonical,isPartOf:{'@type':'WebSite',name:'みんなの感情書店',url:'https://emotionbookstore.com/'}};
  const schema=JSON.stringify(schemaObject).replace(/</g,'\\u003c');
  const type=essay?'article':'website';
  const robotMeta=essay||isResearchIndex?'<meta name="robots" content="max-image-preview:large">':'';
  const articleMeta=essay?`<meta property="article:published_time" content="${esc(essay.publishedAt)}"><meta property="article:modified_time" content="${esc(essay.modifiedAt)}">`:'';
  return html
    .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`)
    .replace('</title>',`</title><link rel="canonical" href="${canonical}">${robotMeta}<meta property="og:type" content="${type}"><meta property="og:site_name" content="みんなの感情書店"><meta property="og:title" content="${esc(pageTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">${articleMeta}<meta name="twitter:card" content="summary"><script type="application/ld+json">${schema}</script>`);
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
    html=html.replace(`紹介先・出典確認：${checkedAt}。`,`紹介先・出典確認：${detailItem.checkedAt || checkedAt}。`);
    const relation=`<section class="work-city-context" aria-label="街とのつながり"><h2>${cityNames[city]}とのつながり</h2><p>${esc(detailItem.relationNote)}</p></section>`;
    html=html.replace('<details class="background"><summary>この街との関係・出典</summary>',relation+'<details class="background"><summary>この街との関係・出典</summary>');
  }
  const editorialKind={koenji:'book',kichijoji:'book',shimokitazawa:'video',jinbocho:'film'}[city];
  if(editorials && (categoryFile==='index.html' || kind===editorialKind)) {
    const heading=city==='kichijoji'?'漫画家と、吉祥寺':`人と作品から知る、${cityNames[city]}`;
    const section=`<section class="city-editorials" aria-labelledby="editorials-title"><h2 id="editorials-title">${esc(heading)}</h2><p>知っている作品から、街とのつながりを辿る。</p>${editorials.map(entry=>`<details class="background" id="${esc(entry.id)}"><summary>${esc(entry.title)}</summary>${entry.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<p>${external(entry.sourceUrl,entry.sourceLabel)}</p>${entry.relatedUrl?`<p><a href="${esc(entry.relatedUrl)}">${esc(entry.relatedLabel)} →</a></p>`:''}<p>感情書店の独自編集文 · 出典確認：${esc(entry.checkedAt)}</p></details>`).join('')}<p>本人・関係団体による監修や公認を受けた記事ではありません。</p></section>`;
    html=html.replace('<section class="quick">',section+'<section class="quick">');
  }
  if(categoryFile==='index.html') {
    const related=research.filter(essay=>essay.city===city&&!html.includes(`/discover/essays/${essay.id}.html`));
    if(related.length) html=html.replace('<section class="quick">',`<section class="quick"><h2>あの頃の街に、もう一度。</h2>${related.map(essay=>`<p><a href="/discover/essays/${essay.id}.html">${esc(essay.title)}</a></p>`).join('')}</section><section class="quick">`);
  }
  if(cityNames[city] && categories[kind]) {
    const alternatives=Object.entries(cityNames).filter(([id])=>id!==city).map(([id,name])=>({id,name,count:items.filter(item=>item.city===id&&item.kind===kind).length})).filter(entry=>entry.count>0);
    if(alternatives.length) {
      const links=alternatives.map(entry=>`<a href="/discover/${entry.id}/${kind}.html">${entry.name}<span>${entry.count}件</span></a>`).join('');
      const navigation=`<nav class="other-cities" aria-label="別の街の${categories[kind].name}"><h2>別の街の${categories[kind].name}も見る</h2><div>${links}</div></nav>`;
      html=html.replace('<aside class="feature">', navigation+'<aside class="feature">');
    }
  }
  const section=file.startsWith('essays/')?'stories':'cities';
  html=html.replace('</header>','</header>'+require('./site-navigation')(section));
  html=require('./page-chrome')(html);
  const themedCity=cityNames[city]?city:research.find(entry=>file===`essays/${entry.id}.html`)?.city;
  if(themedCity) html=html.replace('<body ',`<body data-editorial-city="${themedCity}" `);
  html=enrichSeo(file,html);
  html=require('./design-redesign')(file,html);
  const output=path.join(root,'discover',file);
  if(process.argv.includes('--check')) {
    if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html)throw new Error('Generated page differs: '+output);
  }else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);}
  generatedFiles.push(file);
  written++;
}
const cities=Object.keys(cityNames);
const researchCards=research.map(essay=>`<article class="research-card"><p class="eyebrow">${esc(essay.issue)} · ${esc(essay.cityLabel)}</p><h2><a href="/discover/essays/${essay.id}.html">${esc(essay.title)}</a></h2><p>${esc(essay.lead)}</p><ul aria-label="調査の視点">${essay.lenses.map(lens=>`<li>${esc(lens)}</li>`).join('')}</ul><p class="research-meta">更新 ${esc(essay.modifiedAt)}</p><a class="research-link" href="/discover/essays/${essay.id}.html">記事を読む →</a></article>`).join('');
write('essays/index.html',shell('街の記事',`<section class="intro research-intro"><p class="eyebrow">広告・歴史・人と作品</p><h1>街の記事</h1><p class="lead">駅前はどう変わった？ あの作品と街には、どんなつながりがある？ 広告や公開資料から、街の背景を読みます。</p></section><section class="research-grid" aria-label="公開中の街の調査">${researchCards}</section><section class="quick"><h2>人と作品から知る街</h2><div class="quick-grid">${cities.map(city=>`<a href="/discover/${city}/#editorials-title"><strong>${cityNames[city]}のコラム →</strong><span>${city==='kichijoji'?'漫画家と街のつながり':'人・作品と街のつながり'}</span></a>`).join('')}</div><p><a href="/thread.html?thread=koenji-dance-history">高円寺の阿波おどりの歴史を読む →</a></p></section><aside class="research-method"><h2>この調査で守ること</h2><p>出典の数を結論の強さに置き換えません。広告主の意図、調査結果、編集上の解釈を区別し、分からないことも記事に残します。</p></aside>`,'<a href="/discover/">街から探す</a>'));
for(const essay of research) {
  const sources=new Map(essay.sources.map(source=>[source.id,source]));
  for(const entry of [...essay.comparisons,...essay.timeline,...essay.sections.filter(section=>section.source)]) {
    if(!sources.has(entry.source)) throw new Error(`Unknown research source: ${entry.source}`);
  }
  const methods=essay.methods||[];
  const sections=essay.sections.map(section=>{
    const refs=section.sources||(section.source?[section.source]:[]);
    for(const id of refs) if(!sources.has(id)) throw new Error(`Unknown section source: ${id}`);
    for(const id of section.methodRefs||[]) if(!Number.isInteger(id)||!methods[id]) throw new Error(`Unknown method reference: ${id}`);
    return `<section><p class="eyebrow">${esc(section.kind)}</p><h2>${esc(section.title)}</h2>${(section.paragraphs||[section.text]).map(p=>`<p>${esc(p)}</p>`).join('')}${refs.map(id=>`<p><a href="#source-${esc(id)}">出典：${esc(sources.get(id).title)} →</a></p>`).join('')}${(section.methodRefs||[]).map(id=>`<p>${external(methods[id].url,methods[id].label)}</p>`).join('')}</section>`;
  }).join('');
  const analysis=essay.analysisNotes?`<details class="background"><summary>結論をどう確かめたか</summary>${essay.analysisNotes.map(note=>`<p>${esc(note)}</p>`).join('')}</details>`:'';
  const methodList=methods.length?`<details class="background"><summary>参考にした調査・メディア研究の方法</summary>${methods.map(method=>`<p>${external(method.url,method.label)}</p><p>${esc(method.application)}</p>`).join('')}<p>これらの機関・著者による監修や認定を受けた記事ではありません。</p></details>`:'';
  const visibleMedia=essay.sources.filter(source=>source.media?.status==='official-embed').map(source=>`${workMedia.youtube(source.media.videoId,source.media.title,'公式広告動画')}<p>${esc(source.media.note)}</p>`).join('');
  const media=essay.mediaIntro ? `<section class="research-media" id="research-media"><h2>${esc(essay.mediaIntro.title)}</h2><p>${esc(essay.mediaIntro.text)}</p><p>${external(sources.get(essay.mediaIntro.source).url,'自治体の映像紹介ページを開く')}</p></section>` : `<section class="research-media" id="research-media"><p class="eyebrow">広告を実物で見る</p><h2>${visibleMedia?'映像と文章を、並べて読む。':'広告資料と文章を、並べて読む。'}</h2>${visibleMedia}<details class="background"><summary>広告画像の扱い</summary><p>${esc(essay.mediaPolicy.visible)}</p><p>${esc(essay.mediaPolicy.linked)}</p><p>${esc(essay.mediaPolicy.withheld)}</p></details></section>`;
  const ledger=analysis+methodList+essay.sources.map(source=>`<section id="source-${esc(source.id)}" class="research-source"><h3>${esc(source.title)}</h3><p>${esc(source.publisher)} · ${esc(source.type)}<br>発表：${esc(source.publishedAt)} / 対象：${esc(source.period)}</p><p>${esc(source.limitation)}</p>${external(source.url,'発表元の資料を開く')}<p><a href="#research-reading">本文に戻る ↑</a></p></section>`).join('')+(essay.reviewNote?`<p>${esc(essay.reviewNote)}</p>`:'');
  const comparison=`<section id="research-comparison"><h2>${esc(essay.comparisonTitle || '広告・販促企画を4つの入口から読む')}</h2><p>${esc(essay.comparisonIntro || '以下は当時の告知内容の整理です。すべて終了した企画で、現在のイベント案内ではありません。')}</p>${essay.comparisons.map(row=>`<details class="background"><summary>${esc(row.when)} · ${esc(row.person)}</summary><dl><dt>街との関係</dt><dd>${esc(row.relation)}</dd>${row.role?`<dt>広告が用意する役割</dt><dd>${esc(row.role)}</dd>`:''}<dt>誘っている行動</dt><dd>${esc(row.action)}</dd><dt>ここからは分からないこと</dt><dd>${esc(row.missing)}</dd></dl><p>${external(sources.get(row.source).url,essay.mediaIntro?'資料を発表元で読む':'当時の広告・発表画像を見る')}</p><p><a href="#source-${esc(row.source)}">出典と確認範囲 →</a></p></details>`).join('')}</section>`;
  const timeline=`<section id="research-timeline"><h2>高校生のころから、何が変わった？</h2><p>${esc(essay.timelineIntro || '2026年の30代の高校時代は、おおむね2000年代〜2010年代前半にまたがります。今の年齢ではなく、自分が通っていた年を手掛かりに読んでください。現段階では2010年以降の出来事を掲載し、2000年代の資料・当事者の声は未収集です。')}</p><ol>${essay.timeline.map(row=>`<li><h3>${esc(row.year)} · ${esc(row.title)}</h3><p>${esc(row.text)}</p><p><a href="#source-${esc(row.source)}">根拠の資料と確認範囲 →</a></p></li>`).join('')}</ol><p>${esc(essay.timelineEnd || '街そのものの変化と、自分が高校生から大人になったことで変わった行動は別です。「昔のほうが良かった」「若者が来なくなった」といった評価は、この年表からは導けません。')}</p></section>`;
  if(!Array.isArray(essay.summary)||essay.summary.length!==3||essay.summary.some(point=>typeof point!=='string'||!point.trim())) throw new Error(`Missing editorial summary: ${essay.id}`);
  const summary=`<aside class="article-summary" aria-labelledby="article-summary-title"><h2 id="article-summary-title">この記事の要点</h2><ul>${essay.summary.map(point=>`<li>${esc(point)}</li>`).join('')}</ul></aside>`;
  write(`essays/${essay.id}.html`,shell(essay.title,`<article class="detail research-article"><p class="eyebrow">${esc(essay.series)} · ${esc(essay.issue)}</p><p class="research-back"><a href="/discover/essays/">街の記事一覧</a> / ${esc(essay.cityLabel)}</p><h1>${esc(essay.title)}</h1><p class="detail-hook">${esc(essay.lead)}</p><p class="research-byline">みんなの感情書店編集部 · 更新 ${esc(essay.modifiedAt)}</p>${summary}<nav class="research-toc" aria-label="記事の目次"><a href="#research-reading">本文を読む</a><a href="#research-timeline">街の変化を辿る</a><a href="#research-comparison">${essay.mediaIntro?'視点を比べる':'広告を比べる'}</a><a href="#research-sources">調べ方・出典</a></nav><div class="research-reading" id="research-reading">${sections}</div>${timeline}${comparison}${media}<section><h2>${esc(essay.nextTitle || '今度は、映像の吉祥寺へ。')}</h2><p>${esc(essay.nextText || '広告の中の街と見比べたら、映画や街の映像では何が目に留まるだろう。')}</p><p><a href="/discover/${essay.city}/film.html">${esc(essay.cityLabel)}とつながる映画を見る →</a></p><p><a href="/discover/${essay.city}/video.html">街の映像を選ぶ →</a></p></section><section id="research-sources"><h2>調べ方と出典：確認済み${essay.sources.length}資料</h2><p>${esc(essay.methodology)}</p><p>資料の発表内容と編集上の解釈を区別しています。AIを資料探索・比較・文章化に使用しています。出典ごとの対象期間と確認範囲は以下に記載しています。</p>${ledger}<p>出典確認：${esc(essay.checkedAt)}</p></section></article>`,'<a href="/discover/essays/">街の記事へ戻る</a>'));
}
function workCard(i) {
  return `<article class="work-card ${i.kind}">${workMedia.forItem(i)}<div class="card-body"><p class="relation">${esc(categories[i.kind].name)} · ${esc(i.relation)}</p><h2><a href="/discover/${i.city}/${i.id}.html">${esc(i.title)}</a></h2><p class="creator">${esc(i.creator)}</p><p class="card-hook">${esc(i.hook)}</p>${artistProfile(i)}<div class="card-links"><a class="primary" href="/discover/${i.city}/${i.id}.html">作品を見る</a><a href="/discover/${i.city}/${i.kind}.html">${categories[i.kind].name}の一覧</a></div></div></article>`;
}
// The rotation the city pages walk. Each list is an editorial order: the first entry
// is what the page leads with in week one, the next in week two, and after the last
// it starts again. Reordering a list here is how the shop window is changed — nothing
// picks for us, and no object is dropped from its collection by not being first.
const featuredRotation={
  'koenji/audio': ['moon-in-june-play','big-the-grape','night-glory-scarlet','seabirth-live','pink-minds-live'],
  'koenji/video': ['awa-2025','tenguren','awa-history','pal-street','street-food','next-town-koenji'],
  'koenji/book': ['jirokichi','junjo','shiroku-somaru','1q84'],
  'koenji/film': ['unnameable-dance','ramen-heads','rokkoku-kitchen','shogakko','monterey-pop'],
  'shimokitazawa/audio': ['kaho-asa','bilingualboy-love','sleepinside-recycle','metrois-tokyo','mabuta-roundabout'],
  'shimokitazawa/video': ['shelter-news','kitazawa-guide','tefu-1500','obonro-walk','womenslib-interview','bocchi-main-pv'],
  'shimokitazawa/book': ['indies','nekomachi','lady-jane','honda'],
  'shimokitazawa/film': ['machinouede','gekijyo','aterui','blazer','zawazawa'],
  'kichijoji/audio': ['yoshida-night-edge','yoshida-tinderness','kobayashi-kokuhaku','uchu-mao-haircolor','takeuchi-ai-rain'],
  'kichijoji/video': ['park-voice','uplink','kichion-ichihara','kichion-toranoko','kichion-lady','musashino-green'],
  'kichijoji/book': ['honnoniwa','cinema-history','gou-gou-book'],
  'kichijoji/film': ['parks','baus','rocky-horror','gou-gou-film','asahina'],
  'jinbocho/audio': ['honobe-girl','gorilla-secret','sunshin-anniversary','chikuon-beautiful','motoki-tongping'],
  'jinbocho/video': ['gyokueido','italia','jinbocho-1960s','iwanami-hall','used-book-festival'],
  'jinbocho/book': ['morisaki','morisaki-sequel','furuhon','furuhon-sequel','kaijin'],
  'jinbocho/film': ['morisaki-film','ugetsu','ginga']
};
// Monday of the week the rotation starts from (JST), so week one is a real date and
// not "whenever this happened to be built".
const rotationEpoch='2026-09-14';
// Every city entry has a real static destination, including without JavaScript.
for (const city of cities) {
  const available=Object.entries(categories).filter(([kind])=>items.some(i=>i.city===city&&i.kind===kind));
  const tabs=available.map(([kind,category])=>`<a href="/discover/${city}/${kind}.html">${category.name} <small>${items.filter(i=>i.city===city&&i.kind===kind).length}</small></a>`).join('');
  // Every week of the rotation is written into the page. The first is the one the
  // page opens with — that is what a reader without JavaScript keeps seeing — and
  // feature-week.js swaps in the week's entry. Adding an object never moves the
  // shop window on its own; only the list above does.
  const featured=available.flatMap(([kind])=>{
    const order=featuredRotation[city+'/'+kind];
    if(!order||!order.length) throw new Error('No editorial rotation for the city page: '+city+' '+kind);
    const published=items.filter(i=>i.city===city&&i.kind===kind);
    if(order.length!==published.length||new Set(order).size!==order.length) throw new Error('Rotation must list each published '+kind+' of '+city+' exactly once');
    return order.map((id,week)=>{
      const item=published.find(i=>i.id===id);
      if(!item) throw new Error('Rotation names an unpublished object: '+city+'/'+id);
      return {item,kind,week};
    });
  });
  write(`${city}/index.html`,shell(`${cityNames[city]}の作品`, `<section class="city-hero"><div class="city-panorama">${photo(city,true)}</div><div class="city-heading"><div><p class="eyebrow">街から見つける</p><h1>${cityNames[city]}<span>の作品</span></h1></div><figure class="city-motif"><img src="/assets/city-editorial/${city}.webp" alt="" width="640" height="214" decoding="async"><figcaption>街のイメージ · AIイラスト</figcaption></figure></div></section><div class="collection"><nav class="category-nav" aria-label="${cityNames[city]}の種類を選ぶ">${tabs}</nav><section class="work-grid" aria-label="${cityNames[city]}の作品" data-rotation-epoch="${rotationEpoch}">${featured.map(({item,kind,week})=>workCard(item).replace('<article class="work-card ',`<article data-feature-kind="${kind}" data-feature-week="${week}"${week?' hidden':''} class="work-card `)).join('')}</section>${shortFilmsEntry()}<div class="city-next"><a href="/outings/?city=${city}">${cityNames[city]}の催し</a><a href="/shelf.html?shelf=${city}">ゆかりの場所・歴史</a></div>${credits([city])}</div>`, '<a href="/discover/">街を選び直す</a>',city));
}
const featuredVideoIds=['bocchi-main-pv','next-town-koenji','kichion-toranoko','used-book-festival'];
const featuredVideos=featuredVideoIds.map(id=>items.find(item=>item.id===id));
if(featuredVideos.some(item=>!item||item.kind!=='video')) throw new Error('Featured video missing');
const leadVideo=featuredVideos[0];
const watchNow=`<section class="watch-now" aria-labelledby="watch-now-title"><div class="watch-heading"><p class="eyebrow">今、観るなら</p><h2 id="watch-now-title">物語から、街へ。</h2><p>観光案内だけではなく、音楽や物語から街を好きになる映像を選びました。</p></div><div class="watch-layout"><article class="watch-lead">${workMedia.forItem(leadVideo)}<div><p class="relation">${cityNames[leadVideo.city]} · ${esc(leadVideo.relation)}</p><h3><a href="/discover/${leadVideo.city}/${leadVideo.id}.html">${esc(leadVideo.title)}</a></h3><p>${esc(leadVideo.hook)}</p><a class="watch-detail" href="/discover/${leadVideo.city}/${leadVideo.id}.html">紹介と街との関係を見る →</a></div></article><nav class="watch-list" aria-label="ほかの注目映像">${featuredVideos.slice(1).map(item=>`<a href="/discover/${item.city}/${item.id}.html"><span>${cityNames[item.city]}</span><strong>${esc(item.title)}</strong><small>${esc(item.hook)}</small></a>`).join('')}</nav></div></section>`;
const researchSpotlight=`<section class="research-spotlight" aria-labelledby="research-spotlight-title"><div><h2 id="research-spotlight-title">あの頃の街に、もう一度。</h2><p>駅前の変化と、広告が誘った過ごし方。覚えている街を、資料と作品から読み直す。</p></div><div>${research.map(essay=>`<p><a class="research-link" href="/discover/essays/${essay.id}.html">${esc(essay.title)}</a></p>`).join('')}<a class="research-link" href="/discover/essays/">街の記事一覧 →</a></div></section>`;
const signalEvents=require('./weekly-outings-source').events;
const signals=`<section class="quick" id="city-signals"><h2>9月の街の動き</h2><p>編集部が選んだ4つの文化企画。日程と参加条件は、それぞれの案内で確認できます。</p>${citySignals.map(signal=>{const event=signalEvents.find(e=>e.id===signal.event);if(!event)throw new Error('Missing city signal event: '+signal.event);const dates=event.dates||[event.start,event.end];return `<article><p class="eyebrow">${cityNames[event.city]} · 告知された開催期間 ${esc(dates[0])}〜${esc(dates.at(-1))}</p><h3>${esc(signal.title)}</h3><p>${esc(event.title)}</p><p>編集部の視点：${esc(signal.reading)}</p><p><a href="/outings/events/${event.id}.html">日程・参加条件を見る</a> · ${external(event.url,'公式告知')}</p></article>`;}).join('')}<p>公式告知の確認日：2026年9月9日。自動更新や人気ランキングではありません。開催変更・空席は公式案内をご確認ください。</p><a href="/outings/">開催週を選んで探す →</a></section>`;
write('index.html', shell('街から音楽、映像、本、映画を探す', `<section class="intro"><p class="eyebrow">聴く・観る・読む</p><h1>街から探す</h1><p class="lead">街を選んで、ゆかりの本・音楽・映像・映画へ。</p></section>
<section class="city-grid" aria-label="街を選ぶ">${cities.map(c=>`<a class="city-card" href="/discover/${c}/"><div class="city-image">${photo(c)}</div><div class="city-caption"><h2>${cityNames[c]}</h2><p>音楽 ${items.filter(i=>i.city===c&&i.kind==='audio').length} / 映像 ${items.filter(i=>i.city===c&&i.kind==='video').length} / 本・漫画 ${items.filter(i=>i.city===c&&i.kind==='book').length} / 映画 ${items.filter(i=>i.city===c&&i.kind==='film').length}</p><span>${cityNames[c]}の作品を選ぶ →</span></div></a>`).join('')}</section>${watchNow}${signals}${researchSpotlight}
<section class="quick"><p class="eyebrow">街をまたいで選ぶ</p><h2>観る、読む、聴く。</h2><div class="quick-grid"><a href="/discover/outing/index.html"><strong>街へ出かけたくなる映像 ${outingVideos.length}本 →</strong><span>公園・商店街・ライブハウス・古書店。いま行ける場所が写っているもの</span></a><a href="/discover/reading/index.html"><strong>読みたくなる、街の本 ${readingBooks.length}冊 →</strong><span>書名に街の名前が無くても、背景を知るとその街の本だと分かる</span></a><a href="/discover/listening/index.html"><strong>聴きたくなる、街の音 ${listeningAudio.length}曲 →</strong><span>その街のライブハウスや路上で、実際に鳴った演奏</span></a></div></section>
<section class="quick"><p class="eyebrow">街を決めずに観る</p><h2>街へ出たくなる、${commonVideos.length}つの短編。</h2><div class="quick-grid"><a href="/discover/short-films/index.html"><strong>人・移動・出会いを描く映像へ →</strong><span>企業広告も、単体で心に残る映像作品として選びました</span></a></div></section>
<section class="quick"><p class="eyebrow">短い体験から</p><h2>同じ場所、違う聴こえ方。</h2><div class="quick-grid"><a href="/v3-prototype/culture-experience-r2/shimokitazawa/?recording=shelter"><strong>「夕暮れのジャイロ」を聴き比べる →</strong><span>下北沢SHELTERのライブとソロ盤</span></a><a href="/v3-prototype/culture-experience-r2/kichijoji/?scene=film"><strong>『PARKS』の予告と公園の声へ →</strong><span>吉祥寺・井の頭公園 / 1分59秒と57秒</span></a></div></section>${credits(cities)}`));

const commonCards = commonVideos.map(video=>`<article class="work-card video">${workMedia.youtube(video.videoId,video.title)}<div class="card-body"><p class="relation">街へ出る気分をつくる短編</p><h2><a href="/discover/short-films/${video.id}.html">${esc(video.title)}</a></h2><p class="creator">${esc(video.creator)}</p><p class="card-hook">${esc(video.hook)}</p><div class="card-links">${external(video.url,'YouTubeで観る','primary official-exit')}<a href="/discover/short-films/${video.id}.html">紹介を読む →</a></div></div></article>`).join('');
// 街をまたいだシリーズのページ。3つとも同じ型で出す。
// 一覧は work ページと同じ .wk-list（文字の一覧）。カードを二度見せない。
function seriesPage(slug, title, eyebrow, heading, lead, list, extraExit) {
  const byCity = {};
  for (const v of list) (byCity[v.city] = byCity[v.city] || []).push(v);
  const sections = Object.entries(byCity).map(([city, group]) =>
    `<section class="wk-list" aria-label="${cityNames[city]}の${group.length}件"><h2>${cityNames[city]}</h2><ul>${
      group.map(v => `<li><a href="/discover/${v.city}/${v.id}.html">${esc(v.title)}</a><span class="wk-list-by">${esc(v.creator)}</span><span class="wk-list-rel">${esc(v.relation)}</span></li>`).join('')
    }</ul></section>`).join('');
  write(`${slug}/index.html`, shell(title,
    `<section class="intro"><p class="eyebrow">${eyebrow}</p><h1>${heading}</h1><p class="lead">${lead}</p></section><div class="collection">${sections}<p class="city-exit"><a href="/discover/index.html">街から作品を探す →</a></p>${extraExit}</div>`,
    '<a href="/discover/index.html">街から探す ←</a>'));
}
seriesPage('outing', '街へ出かけたくなる映像', `4つの街 / ${outingVideos.length}本`, '街へ出かけたく、<br>なる映像。',
  '公園、商店街、ライブハウス、古書店、映画館。いま行ける場所が写っている映像を選びました。閉じた施設や、過ぎた出来事そのものを扱う映像は入れていません。',
  outingVideos, '<p class="city-exit"><a href="/discover/short-films/">街を決めずに観る短編へ →</a></p>');
seriesPage('reading', '読みたくなる本', `4つの街 / ${readingBooks.length}冊`, '読みたくなる、<br>街の本。',
  '街の名前が書名に無くても、背景を知るとその街の本だと分かる。そういう一冊から並べています。棚に出す時点で関係を確かめているので、ここには全部あります。',
  readingBooks, '<p class="city-exit"><a href="/works.html#book">本の紹介から入る →</a></p>');
seriesPage('listening', '聴きたくなる音楽', `4つの街 / ${listeningAudio.length}曲`, '聴きたくなる、<br>街の音。',
  'その街のライブハウスや路上で、実際に鳴った演奏です。街の紹介曲ではなく、そこで録られた音を選んでいます。',
  listeningAudio, '<p class="city-exit"><a href="/works.html#music">音楽の紹介から入る →</a></p>');
write('short-films/index.html', shell('街へ出たくなる短編映像', `<section class="intro"><p class="eyebrow">全街共通 / 約1〜4分</p><h1>街へ出たくなる、<br>${commonVideos.length}つの短編。</h1><p class="lead">人との出会いや移動、暮らしを描く短編を選びました。特定の街の観光案内ではなく、企業広告を含む映像作品です。</p></section><div class="collection"><section class="work-grid" aria-label="共通の短編映像${commonVideos.length}件">${commonCards}</section><p class="city-exit"><a href="/discover/index.html">街から作品を探す →</a></p></div>`, '<a href="/discover/index.html">街から探す ←</a>'));

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
  write(`${city}/${kind}.html`, shell(`${cityNames[city]}の${category.name}`, `<section class="city-hero"><div class="city-panorama">${photo(city,true)}</div><div class="city-heading"><p class="eyebrow">街と作品の文化案内</p><h1>${cityNames[city]}<span>の${category.name}</span></h1></div></section><div class="collection"><nav class="category-nav" aria-label="${cityNames[city]}の種類を選ぶ">${tabs}</nav><p class="collection-lead">${kind==='audio'?'この街で実際に鳴った音楽やサウンドを、まず一曲。':kind==='video'?'街の人、店先、時間。気になる映像をひとつ。':kind==='book'?'物語から入って、ゆかりの街を知る。': '街が舞台の映画と、街の映画館が選んだ映画。'}</p><section class="work-grid" aria-label="${category.name}の${selected.length}件">${cards || `<p>この街の${category.name}は現在掲載していません。<a href="/works.html">紹介中の作品を見る →</a></p>`}</section>${cityContinuation(city,kind)}${seriesEntry(kind)}${shortFilmsEntry()}<p class="city-exit"><a href="/shelf.html?shelf=${city}">${cityNames[city]}の場所・歴史へ →</a></p><p class="city-exit"><a href="/outings/?city=${city}">${cityNames[city]}の今の文化イベントへ →</a></p>${credits([city])}</div>`, '<a href="/discover/index.html">街を選び直す ←</a>', city));
}
for(const item of items) {
  const {city,kind}=item;
  const mainAction=item.id==='1q84'?'新潮社の作品ゆかりの地特集を読む':item.id==='honda'?'ぴあの出版案内を読む':item.action;
  const action=item.url.startsWith('/')?`<a class="primary" href="${esc(item.url)}">${esc(mainAction)} →</a>`:external(item.url,mainAction,'primary official-exit');
  const player=workMedia.forItem(item);
  const trailer='';
  const sourceLinks=item.sources.filter(s=>s!==item.url&&s!==item.trailerUrl);
  const background=`<details class="background"><summary>この街との関係・出典</summary><p>${esc(item.relationNote)}</p>${sourceLinks.map(s=>`<p>${external(s,new URL(s).hostname.replace('www.','')+' の掲載情報')}</p>`).join('')}<p>紹介先・出典確認：${checkedAt}。${item.videoId?(kind==='audio'?'音楽・サウンド':'映像')+'は公開元のプレイヤーで提供されます。':'外部の視聴・読書条件は各提供元の案内で確認できます。'}</p></details>`;
write(`${city}/${item.id}.html`, shell(`${item.title}｜${cityNames[city]}の${categories[kind].name}`, `<article class="detail"><p class="eyebrow">${cityNames[city]} / ${categories[kind].name} / ${esc(item.relation)}</p><h1>${esc(item.title)}</h1><p class="detail-creator">${esc(item.creator)}</p><p class="detail-hook">${esc(item.hook)}</p>${player}${trailer}<div class="destination">${action}<p>${item.url.startsWith('/')?'このサイト内で、本人操作による映像・音の体験へ。':item.videoId?'表示・再生できない場合は、公開元の同じ'+(kind==='audio'?'音':'映像')+'へ。':'外部の作品・特集ページへ。'}${item.url.startsWith('/')?'':'新しいタブで開きます。'}</p></div>${artistProfile(item)}${background}${relatedPerformance(item)}${relatedWork(item)}<p class="city-exit"><a href="/discover/${city}/${kind}.html">${categories[kind].name}を選び直す →</a></p><p class="city-exit"><a href="/shelf.html?shelf=${city}">${cityNames[city]}の場所・歴史へ →</a></p></article>`, `<a href="/discover/${city}/${kind}.html">${categories[kind].name}を選び直す ←</a>`, city));
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
const retiredPaths=new Set([...excludedItems,...items].map(i=>`/discover/${i.city}/${i.id}.html`));
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
