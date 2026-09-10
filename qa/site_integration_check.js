'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {items,excludedItems,commonVideos}=require('../tools/city-discovery-source');
const chrome=require('../tools/page-chrome');
const outputs=['works.html','work-book.html','work-film.html','work-music.html','work-video.html','saved.html','suggest.html','thread.html','shelf.html','about.html','data.html','credits.html','visit/index.html'];
const walk=d=>fs.readdirSync(path.join(root,d),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):e.name.endsWith('.html')?[d+'/'+e.name]:[]);
outputs.push(...walk('discover'),...walk('outings'));
for(const file of outputs){
 const html=read(file);assert.match(html,/site-polished/);assert.equal((html.match(/href="\/site-system.css"/g)||[]).length,1,file+' common style');assert.equal((html.match(/src="\/page-nav.js"/g)||[]).length,1,file+' navigation script');assert.equal(chrome(html),html,file+' generator chrome is idempotent');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,file+' duplicate IDs');
 for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(/^(?:https?:|data:|mailto:|tel:|#|\?)/.test(url))continue;
  const p=url.split(/[?#]/)[0],dest=p.startsWith('/')?p.slice(1):path.join(path.dirname(file),p);
  if(dest.startsWith('api/'))continue;
  assert.ok(fs.existsSync(path.join(root,dest.endsWith('/')?dest+'index.html':dest)),file+' missing '+url);
 }
}
for(const item of items){
 const detail=read(`discover/${item.city}/${item.id}.html`),list=read(`discover/${item.city}/${item.kind}.html`);
 assert.ok(list.includes('href="'+item.url.replace(/&/g,'&amp;')+'"'),'One-click destination '+item.id);
 const id=item.videoId||item.trailerVideoId;
 if(id)for(const html of [detail,list]){
  assert.ok(html.includes('data-video-id="'+id+'"'),'Correct work preview '+item.id);
  // Click-to-load: the provider URL is built by the click, never shipped in the page.
  assert.ok(!html.includes('youtube-nocookie.com/embed/'+id),'No provider contact before the click '+item.id);
 }
 assert.ok(!list.includes('card-art'),'No generic image substitute');
}
for(const v of commonVideos){const h=read('discover/short-films/'+v.id+'.html');
 assert.ok(h.includes('data-video-id="'+v.videoId+'"'));
 assert.ok(!h.includes('/embed/'+v.videoId),'No provider contact before the click '+v.id);}
assert.match(read('discover/shimokitazawa/indies.html'),/R978-4-408-55758-8.jpg/);
assert.match(read('discover/shimokitazawa/indies.html'),/岡崎琢磨／実業之日本社/);
for(const item of excludedItems){assert.ok(!fs.existsSync(path.join(root,`discover/${item.city}/${item.id}.html`)),'Excluded detail removed '+item.id);assert.ok(!read(`discover/${item.city}/${item.kind}.html`).includes(`/discover/${item.city}/${item.id}.html`),'Excluded listing removed '+item.id);}
for(const item of items) {
 const media=require('../tools/work-media').forItem(item);
 if(item.presentation==='text-only') {
  // Individually reviewed text-only books. Adding one is an editorial decision,
  // so the list is written out here rather than derived from the source.
  assert.ok(['koenji/jirokichi','kichijoji/honnoniwa','koenji/shiroku-somaru','koenji/1q84','kichijoji/gou-gou-book','jinbocho/morisaki','jinbocho/morisaki-sequel','jinbocho/furuhon','jinbocho/furuhon-sequel'].includes(item.city+'/'+item.id));
  assert.equal(item.kind,'book');
  assert.equal(media,'','Text-only editions must not reproduce unapproved covers');
  assert.ok(item.sources.includes(item.url));
 } else assert.ok(media,'Every other published work has real media '+item.id);
}
const settings=JSON.parse(read('vercel.json'));
for(const file of outputs){const url='/'+file.replace(/index.html$/,'');const csp=settings.headers.filter(h=>h.headers.some(x=>x.key==='Content-Security-Policy')&&new RegExp('^'+h.source+'$').test(url)).flatMap(h=>h.headers.filter(x=>x.key==='Content-Security-Policy').map(x=>x.value));assert.equal(csp.length,1,url+' exactly one CSP');const frames=[...read(file).matchAll(/<iframe[^>]+src="(https?:\/\/[^/]+)/g)].map(m=>m[1]);for(const origin of frames)assert.ok(csp[0].split('frame-src ')[1].split(';')[0].includes(origin),url+' blocked frame '+origin);}
console.log('PASS '+outputs.length+' public pages: local links/assets, unique IDs, repeatable generation, exact work media, direct destinations, scoped CSP');
