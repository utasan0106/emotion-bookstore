'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ledger=JSON.parse(read('tools/weekly-home-ledger.json'));
assert.ok(Array.isArray(ledger.weeks)&&ledger.weeks.length>=2,'Need previous and current weekly entries');
const weeks=[...ledger.weeks].sort((a,b)=>a.weekOf.localeCompare(b.weekOf));
const prev=weeks.at(-2), cur=weeks.at(-1);

function mondayJst(now=Date.now()){
  const d=new Date(now+9*60*60*1000);
  const y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate(),dow=d.getUTCDay();
  const delta=(dow+6)%7;
  const monday=new Date(Date.UTC(y,m,day-delta));
  return monday.toISOString().slice(0,10);
}
assert.equal(cur.weekOf,mondayJst(),'Weekly home ledger must be refreshed for the current JST week');
assert.notEqual(cur.topFeatureId,prev.topFeatureId,'Top feature must change every week');
assert.ok(cur.curiosityIds.some(id=>!prev.curiosityIds.includes(id)),'At least one curiosity item must be new each week');
assert.notDeepEqual(cur.curiosityKinds,prev.curiosityKinds,'Curiosity kind mix must change every week');
assert.ok(cur.shortVideoIds.some(id=>!prev.shortVideoIds.includes(id)),'At least one of the 3 short videos must change every week');
assert.equal(cur.shortVideoIds.length,3,'Short video shelf stays at exactly 3');
assert.equal(new Set(cur.shortVideoIds).size,3,'Short videos must be unique');
assert.equal(cur.curiosityIds.length,3,'Curiosity shelf stays at exactly 3');
assert.equal(new Set(cur.curiosityIds).size,3,'Curiosity items must be unique');

const sandbox={window:{}}; vm.createContext(sandbox);
vm.runInContext(read('release_content.js'),sandbox);
const content=sandbox.window.V3_RELEASE_CONTENT;
assert.deepEqual(JSON.parse(JSON.stringify(content.weeklyEdition)),cur,'release_content weeklyEdition must equal weekly ledger');
assert.equal(content.detour.weekOf,cur.weekOf,'Detour must be on the same weekly edition');
for(const shelf of content.shelves){
  assert.ok(String(shelf.weeklyFeature?.verifiedAt||'').slice(0,10)>=cur.weekOf,shelf.id+': weeklyFeature must be reverified this week');
}

const home=read('index.html');
assert.ok(home.includes('data-weekly-edition="'+cur.weekOf+'"'),'Home must visibly identify current edition');
assert.ok(home.includes('data-weekly-feature="'+cur.topFeatureId+'"'),'Home top feature must match ledger');
for(const id of cur.curiosityIds) assert.ok(home.includes('data-weekly-item-id="'+id+'"'),'Home curiosity item missing: '+id);
const changedShorts=cur.shortVideoIds.filter(id=>!prev.shortVideoIds.includes(id));
assert.ok(changedShorts.length&&changedShorts.some(id=>home.includes('data-weekly-short-video="'+id+'"')),'Home must name at least one of this week\'s changed short videos');

const source=require('../tools/city-discovery-source');
assert.equal(source.commonVideosWeekOf,cur.weekOf,'Short-video source must carry current week');
assert.deepEqual(source.commonVideos.map(v=>v.id),cur.shortVideoIds,'Published short-video trio must equal weekly ledger');
assert.ok(source.commonVideos.some(v=>v.rotatedAt===cur.weekOf),'At least one short video must be stamped as rotated this week');

const footerDate=(home.match(/ページ更新：<time datetime="(\d{4}-\d{2}-\d{2})"/)||[])[1];
assert.ok(footerDate>=cur.weekOf,'Visible home update date must be current week');

const sitemap=read('sitemap.xml');
for(const url of [
  'https://emotionbookstore.com/',
  'https://emotionbookstore.com/shelf.html?shelf=kiyosumi',
  'https://emotionbookstore.com/discover/kiyosumi/',
  'https://emotionbookstore.com/discover/short-films/',
  'https://emotionbookstore.com/discover/short-films/find-my-tokyo-akasaka.html'
]){
  const pos=sitemap.indexOf('<loc>'+url+'</loc>');
  assert.ok(pos>=0,'Fresh weekly surface missing from sitemap: '+url);
  const near=sitemap.slice(pos,pos+220);
  const m=near.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
  assert.ok(m&&m[1]>=cur.weekOf,'Fresh weekly surface needs current sitemap lastmod: '+url);
}

console.log('PASS weekly visible rotation: top feature, curiosity mix/new item, 1-of-3 short video, weekly feature recheck, sitemap lastmod');
