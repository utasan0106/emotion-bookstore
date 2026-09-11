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
assert.match(html,/https:\/\/img\.hanmoto\.com\/bd\/img\/9784911191026\.jpg/);assert.match(html,/月と文社 編／月と文社/);assert.match(html,/https:\/\/bandcamp\.com\/EmbeddedPlayer\/album=1846332570/);
assert.doesNotMatch(html,/home-work-(?:music|film|video)-/,'No generic equipment image substituted for a work');
assert.match(read('data.html'),/Bandcampの公式プレーヤー/);
const {events}=require('../tools/weekly-outings-source'),{select}=require('../outings/week');
const now=Date.parse('2026-09-11T19:00:00+09:00');
assert.deepEqual(select(events,{now,week:'2026-09-07',kind:'live'}).map(e=>e.id),['koenji-azuma','kichijoji-kunita']);
assert.equal(select(events,{now,week:'2026-09-07',kind:'exhibition'}).length,0,'Explicit week has no silent substitution');
assert.equal(select(events,{now,week:'2026-09-14',kind:'exhibition'}).length,3);
assert.deepEqual(select(events,{now,week:'2026-09-14',kind:'exhibition',city:'shimokitazawa'}).map(e=>e.id),['shimokita-moon']);
// 再確認期限は会期と別に効く。shimokita-moon は 9/18〜10/4 の会期中だが、再確認が 9/20 で切れる。
// 会期が残っていても、期限が切れた催しは推薦に出さない。
assert.deepEqual(select(events,{now:Date.parse('2026-09-21T00:00:00+09:00'),week:'2026-09-21',kind:'exhibition'}).map(e=>e.id),['kichijoji-taniguchi'],'Expired verification cannot recommend events');
console.log('PASS home destinations/anchors, real artwork, scoped Bandcamp CSP, combined event category/city/week/expiry');
