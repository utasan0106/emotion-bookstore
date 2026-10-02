'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('discover/selection/index.html'),home=read('index.html');
const source=require('../tools/city-discovery-source');
const expected=[
 ['/discover/short-films/musashino-green.html','緑あふれるまち 武蔵野市'],
 ['/discover/jinbocho/gorilla-secret.html','秘密'],
 ['/discover/jinbocho/morisaki.html','森崎書店の日々']
];
assert.match(home,/href="\/discover\/selection\/"/,'Home offers a generic, unparameterized entry');
const entry=home.match(/<section class="hd-more" aria-labelledby="hd-selection-title">[\s\S]*?<\/section>/)[0];
assert.doesNotMatch(entry,/data-|anger|怒|shelf-entry|official-action|hc-work|hc-hero-cta/,'Home entry is not a measured emotion selection');
assert.equal((html.match(/<details\b/g)||[]).length,1);
assert.match(html,/<details class="selection-topic">/,'No topic is selected initially');
assert.match(html,/<title>作品のよりみち｜みんなの感情書店<\/title>/);
for(const attr of ['rel="canonical" href','property="og:url" content'])assert.ok(html.includes(attr+'="https://emotionbookstore.com/discover/selection/"'));
assert.match(html,/<meta name="referrer" content="no-referrer">/);
assert.match(html,/<a href="\/works\.html" aria-current="location">作品を探す<\/a>/,'The feature exposes its parent location in the stable four-item navigation');
const executable=html.replace(/<script type="application\/ld\+json">[^<]+<\/script>/g,'');
assert.equal((html.match(/<script type="application\/ld\+json">/g)||[]).length,1);
assert.doesNotMatch(read('discover/selection/selection.css'),/url\(|@import|expression/i,'Styles do not load resources');
assert.doesNotMatch(executable,/<(?:script|iframe|audio|video|form|input|textarea)\b|\bon\w+\s*=|\bdata-(?:video|embed|memory|emotion)|analytics|dataLayer|localStorage|sessionStorage|document\.cookie|preconnect|prefetch|prerender|http-equiv/i,'Selection needs no scripts, embeds, input, tracking, stored state or automatic external loads');
for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
 const url=match[1];
 if(url.startsWith('https://')){assert.equal(url,'https://emotionbookstore.com/discover/selection/');continue;}
 assert.doesNotMatch(url,/\?|(?:anger|mood|emotion)=/,'No selection parameter');
 if(url.startsWith('#'))continue;
 const file=path.join(root,url.endsWith('/')?url+'index.html':url);
 assert.ok(fs.existsSync(file),'Local destination exists: '+url);
}
const workList=html.match(/<ol class="selection-works"[\s\S]*?<\/ol>/)[0];
assert.equal((workList.match(/<article>/g)||[]).length,3,'Exactly three works');
assert.deepEqual([...new Set([...workList.matchAll(/href="([^"]+)"/g)].map(m=>m[1]))],expected.map(x=>x[0]));
for(const [url,title] of expected){assert.ok(workList.includes('>'+title+'</a>'));assert.ok(workList.includes('href="'+url+'" rel="noreferrer"'));}
const short=source.commonVideos.find(x=>x.id==='musashino-green');
assert.equal(short.durationSeconds,104);assert.ok(source.visualMedia.allowed(short.videoId));
assert.equal(source.items.find(x=>x.id==='gorilla-secret').kind,'audio');
assert.equal(source.items.find(x=>x.id==='morisaki').kind,'book');
assert.match(html,/映像 · 1分44秒/);assert.match(html,/音楽 · 1曲 · 6分10秒/);
assert.match(html,/失恋・離職から始まる小説/);
assert.match(html,/選んだ理由は、編集部からの提案/);
assert.match(html,/保存・送信しません/);
assert.doesNotMatch(html,/必ず癒|怒りが消|診断|あなたは.+タイプ|気分が改善/);
assert.ok(read('sitemap.xml').includes('<loc>https://emotionbookstore.com/discover/selection/</loc>'));
assert.ok(read('qa/verify-product.js').includes("['qa/selection_feature_check.js']"));
console.log('PASS selection feature: three existing destinations, voluntary native disclosure, generic route/title, no scripts/tracking/storage/media loads');
