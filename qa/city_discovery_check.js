'use strict';
// Route/content contract: not an assertion that providers played a video.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {items, commonVideos} = require('../tools/city-discovery-source');
const decode = s => s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
assert.equal(items.length,60);
assert.equal(new Set(items.map(i=>i.city+'/'+i.id)).size,items.length);
assert.equal(new Set(items.filter(i=>i.videoId).map(i=>i.videoId)).size,43);
assert.equal(commonVideos.length,3);
assert.equal(new Set(commonVideos.map(i=>i.id)).size,3);
assert.equal(new Set([...items.filter(i=>i.videoId),...commonVideos].map(i=>i.videoId)).size,46);
const playbackIds=[...items.filter(i=>i.videoId).map(i=>i.videoId),...items.filter(i=>i.trailerVideoId).map(i=>i.trailerVideoId),...commonVideos.map(i=>i.videoId)];
assert.equal(new Set(playbackIds).size,playbackIds.length,'Embedded media IDs must not be reused across entries');
const cities=['koenji','shimokitazawa','kichijoji','jinbocho'];
const directory=fs.readFileSync(path.join(root,'discover/index.html'),'utf8');
for(const city of cities) {
  assert.ok(directory.includes(`class="city-card" href="/discover/${city}/"`),'Directory city entries must open all available media, not the audio list');
  const landing=fs.readFileSync(path.join(root,`discover/${city}/index.html`),'utf8');
  const kinds=['audio','video','book','film'].filter(kind=>items.some(i=>i.city===city&&i.kind===kind));
  assert.equal((landing.match(/class="work-card /g)||[]).length,kinds.length,'City entry must contain works, not just navigation');
  for(const kind of kinds) assert.ok(landing.includes(`href="/discover/${city}/${kind}.html"`));
  for(const kind of ['audio','video','book','film'].filter(kind=>!kinds.includes(kind))) assert.ok(!landing.includes(`href="/discover/${city}/${kind}.html"`),'Do not advertise an empty category');
}
for(const city of cities)for(const kind of ['audio','video','book','film']) {
  const selected=items.filter(i=>i.city===city&&i.kind===kind);
  assert.ok(selected.length<=10);
  const html=fs.readFileSync(path.join(root,`discover/${city}/${kind}.html`),'utf8');
  const cardsOnly=(html.match(/<article class="work-card [\s\S]*?<\/article>/g)||[]).join('');
  for(const i of selected)assert.equal(cardsOnly.split(`href="/discover/${city}/${i.id}.html"`).length-1,2);
  assert.equal((html.match(/class="work-card /g)||[]).length,selected.length);
  assert.doesNotMatch(html,/data-video-id|video-embed\.js|discover\/player\.js/);
  if(selected.length)assert.match(html,/aria-current="page"/);
}
let pages=0;
const canonicals=[];
const pageTitles=[];
function inspect(dir) {
  for(const file of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,file.name);
    if(file.isDirectory()){inspect(full);continue;}
    if(!file.name.endsWith('.html'))continue;
    pages++;
    const html=fs.readFileSync(full,'utf8');
    const relative=path.relative(path.join(root,'discover'),full).replaceAll(path.sep,'/');
    const expectedCanonical=`https://emotionbookstore.com/discover/${relative==='index.html'?'':relative.replace(/index\.html$/,'')}`;
    assert.equal((html.match(/<link rel="canonical" href="([^"]+)">/)||[])[1],expectedCanonical);
    assert.equal((html.match(/<meta property="og:url" content="([^"]+)">/)||[])[1],expectedCanonical);
    assert.match(html,/<script type="application\/ld\+json">[^<]+<\/script>/);
    canonicals.push(expectedCanonical);
    const pageTitle=(html.match(/<title>([^<]+)<\/title>/)||[])[1];
    const description=(html.match(/<meta name="description" content="([^"]+)">/)||[])[1];
    assert.ok(pageTitle&&description&&description.length<=155);
    pageTitles.push(pageTitle);
    assert.equal((html.match(/<h1\b/g)||[]).length,1,full);
    assert.doesNotMatch(html,/preconnect|rel="preload"|autoplay=1|googletagmanager|analytics-v3/);
    for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url=new URL(decode(m[1]),'https://local.test/'+path.relative(root,full));
      if(url.origin!=='https://local.test'){assert.equal(url.protocol,'https:');continue;}
      let target=path.join(root,decodeURIComponent(url.pathname));
      if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
      assert.ok(fs.existsSync(target),`${full} has missing destination ${m[1]}`);
      if(url.hash)assert.ok(fs.readFileSync(target,'utf8').includes(`id="${url.hash.slice(1)}"`),`${full}: invalid fragment`);
    }
  }
}
inspect(path.join(root,'discover'));
assert.equal(pages,85);
assert.equal(new Set(canonicals).size,pages);
assert.equal(new Set(pageTitles).size,pages);
for(const i of items) {
  assert.ok(i.sources.length && i.relation && i.relationNote);
  assert.equal(i.playbackChecked,false,'Never equate indexed media with tested playback');
  const html=fs.readFileSync(path.join(root,`discover/${i.city}/${i.id}.html`),'utf8');
  // Repeated Home/Saved links in global navigation and the local memory panel are intentional.
  // Keep the actual work destinations unique inside their experience section.
  const experience=(html.match(/<div class="destination"[\s\S]*?<\/div>/)||[])[0];
  assert.ok(experience,`${i.id}: experience section missing`);
  const links=[...experience.matchAll(/href="([^"]+)"/g)].map(m=>decode(m[1]));
  assert.equal(new Set(links).size,links.length,`${i.id}: duplicate work destination`);
  assert.ok(html.indexOf('class="destination"')<html.indexOf('class="background"'),'Experience must precede background');
  if(i.videoId){
    assert.match(i.videoId,/^[A-Za-z0-9_-]{11}$/);
    assert.equal(new URL(i.url).searchParams.get('v'),i.videoId,'Fallback must be the identical clip');
    assert.ok(html.includes('/embed/'+i.videoId+'?autoplay=0'));

  }
  if(i.trailerVideoId){
    assert.equal(i.kind,'film');
    assert.match(i.trailerVideoId,/^[A-Za-z0-9_-]{11}$/);
    assert.equal(new URL(i.trailerUrl).searchParams.get('v'),i.trailerVideoId);
    assert.ok(html.includes(i.trailerLabel||'予告編（本編ではありません）'));
    assert.match(html,/本編ではありません/);
  }
}
for(const i of commonVideos) {
  assert.equal(i.playbackChecked,false,'Search availability is not tested playback');
  assert.match(i.videoId,/^[A-Za-z0-9_-]{11}$/);
  assert.equal(new URL(i.url).searchParams.get('v'),i.videoId);
  const html=fs.readFileSync(path.join(root,`discover/short-films/${i.id}.html`),'utf8');
  assert.match(html,/このサイトで紹介する理由・出典/);
  assert.ok(html.includes('/embed/'+i.videoId+'?autoplay=0'));
}
assert.match(fs.readFileSync(path.join(root,'works.html'),'utf8'),/discover\/index.html/);
assert.match(fs.readFileSync(path.join(root,'.vercelignore'),'utf8'),/^\/tools\/city-discovery-source.js$/m);
assert.ok(!fs.readFileSync(path.join(root,'.vercelignore'),'utf8').includes('/discover/'));
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
const eventCount=require('../tools/weekly-outings-source').events.length;
assert.equal(sitemapUrls.length,pages+3+1+eventCount+9);
assert.equal(new Set(sitemapUrls).size,sitemapUrls.length);
assert.ok(canonicals.every(url=>sitemapUrls.includes(url)));
assert.ok(sitemapUrls.filter(url=>url.includes('?')).every(url=>/^https:\/\/emotionbookstore\.com\/shelf\.html\?shelf=(koenji|kichijoji|shimokitazawa|jinbocho)$/.test(url)));
console.log('PASS 55 city entries + 3 common shorts, 4 populated city entries, 16 bounded lists, 80 routes, SEO metadata and sitemap, embedded audio and bounded trailers, unique detail exits, local assets, honest media types');

for (const id of require('../tools/city-discovery-source').blockedVideoIds) {
 for (const f of fs.readdirSync(path.join(root,'discover/short-films'))) if(f.endsWith('.html')) assert.ok(!fs.readFileSync(path.join(root,'discover/short-films',f),'utf8').includes(id), 'Private video leaked: '+id);
}
