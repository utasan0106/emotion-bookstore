'use strict';
// Accepted discovery home: check broken navigation/embeds and the new event filter boundary.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),config=JSON.parse(read('vercel.json'));
for(const [,value] of html.matchAll(/(?:href|src)="([^\"]+)"/g)){
 if(/^(?:https?:|data:|#|\?)/.test(value))continue;
 const pathname=value.split(/[?#]/)[0];const file=path.join(root,pathname.endsWith('/')?pathname+'index.html':pathname);
 assert.ok(fs.existsSync(file),'Missing local destination: '+value);
}
const ids=[...html.matchAll(/\bid="([^\"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'No duplicate IDs');
for(const [,hash] of html.matchAll(/href="#([^\"]+)"/g))assert.ok(ids.includes(hash),'Missing anchor: '+hash);
const cspFor=url=>config.headers.filter(h=>h.headers.some(x=>x.key==='Content-Security-Policy')&&new RegExp('^'+h.source+'$').test(url)).flatMap(h=>h.headers.filter(x=>x.key==='Content-Security-Policy').map(x=>x.value));
for(const url of ['/','/index.html','/works.html','/work-music.html']){const policies=cspFor(url);assert.equal(policies.length,1,'One effective CSP for '+url);assert.match(policies[0],/frame-src [^;]*https:\/\/bandcamp\.com/);assert.match(policies[0],/object-src 'none'/);assert.match(policies[0],/frame-ancestors 'none'/);}
for(const url of ['/work-book.html','/outings/','/outings/events/kichijoji-taniguchi.html','/index.html-other']){assert.equal(cspFor(url).length,1);assert.doesNotMatch(cspFor(url)[0],/bandcamp/,'Home permission remains scoped');}
// Official update destinations are plain links: no embedded social widgets or tracking.
const footer=(html.match(/<footer class="hd-footer">[\s\S]*?<\/footer>/)||[])[0];
assert.ok(footer,'Home footer must remain present');
for(const url of ['https://x.com/emotion_books','https://note.com/emotion__books']){
 assert.ok(footer.includes('href="'+url+'" target="_blank" rel="me noopener noreferrer"'), 'Official follow link must be exact and safely open: '+url);
}
assert.doesNotMatch(html, /<script[^>]+(?:platform\.twitter|platform\.x\.com|note\.com)/, 'Follow links must not load social SDKs');

const ledger=require('../tools/weekly-home-ledger.json');
const currentWeek=ledger.weeks.at(-1);
assert.ok(html.includes('data-weekly-feature="'+currentWeek.topFeatureId+'"'));
for(const id of currentWeek.curiosityIds) assert.ok(html.includes('data-weekly-item-id="'+id+'"'),'Current weekly item missing: '+id);
assert.match(html,/src="\/assets\/city-kiyosumi\.jpg"/);
assert.ok(html.includes('href="/discover/kiyosumi/"'),'Kiyosumi works page must be reachable from Home');
assert.ok(currentWeek.shortVideoIds.some(id=>html.includes('data-weekly-short-video="'+id+'"')),'Home short film belongs to the current weekly trio');
assert.doesNotMatch(html,/upload\.wikimedia\.org[^"']*Kiyosumi/i);
assert.doesNotMatch(html,/home-work-(?:music|film|video)-/,'No generic equipment image substituted for a work');
assert.match(read('data.html'),/Bandcampの公式プレーヤー/);
// A midweek correction must preserve the previous selection rather than erase it.
for(const change of ledger.featureChanges||[]){
 assert.ok(ledger.weeks.some(week=>week.weekOf===change.weekOf),'Feature change must refer to a known weekly edition');
 assert.match(change.changedOn,/^\d{4}-\d{2}-\d{2}$/);
 assert.ok(change.changedOn>=change.weekOf,'Change date cannot precede its edition');
 assert.notEqual(change.from,change.to,'A feature refresh must change the selected work');
 assert.match(change.previousVersion,/^[a-f0-9]{40}$/,'Preserve the original published selection commit');
 assert.match(change.sourceUrl,/^https:\/\//,'Feature refresh needs an official source');
}
const latestChange=(ledger.featureChanges||[]).filter(change=>change.weekOf===currentWeek.weekOf).at(-1);
if(latestChange) assert.equal(latestChange.to,currentWeek.topFeatureId,'Current feature must match the latest recorded change');
const featuredWork=require('../tools/city-discovery-source').items.find(item=>item.id===currentWeek.topFeatureId);
if(featuredWork){
 const feature=(html.match(/<section class="hd-feature"[^>]*>[\s\S]*?<\/section>/)||[])[0];
 assert.ok(feature.includes('href="/discover/'+featuredWork.city+'/'+featuredWork.id+'.html"'),'Cover must link to its actual work');
 assert.ok(feature.includes(featuredWork.hook),'Cover must reuse reviewed editorial copy');
 assert.ok(feature.includes('href="'+featuredWork.url+'"'),'Cover must offer its verified official destination');
 assert.match(feature,/<img src="\/assets\//,'Cover image must be served locally');
}

const {events}=require('../tools/weekly-outings-source'),{select}=require('../outings/week');
const now=Date.parse('2026-09-11T19:00:00+09:00');
assert.deepEqual(select(events,{now,week:'2026-09-07',kind:'live'}).map(e=>e.id),['koenji-azuma','kichijoji-kunita']);
assert.equal(select(events,{now,week:'2026-09-07',kind:'exhibition'}).length,0,'Explicit week has no silent substitution');
assert.equal(select(events,{now,week:'2026-09-14',kind:'exhibition'}).length,3);
assert.deepEqual(select(events,{now,week:'2026-09-14',kind:'exhibition',city:'shimokitazawa'}).map(e=>e.id),['shimokita-moon']);
// 期限が切れた催しを推薦しないことは qa/weekly_outings_check.js が合成データで見る。
// ここでは、その週に実際どの展示が並ぶかだけを見る（再確認が済めば増える。それでよい）。
assert.deepEqual(select(events,{now:Date.parse('2026-09-21T00:00:00+09:00'),week:'2026-09-21',kind:'exhibition'}).map(e=>e.id),['kichijoji-taniguchi','shimokita-moon'],'Explicit week lists the exhibitions actually running');
console.log('PASS home destinations/anchors, real artwork, scoped Bandcamp CSP, combined event category/city/week/expiry');
