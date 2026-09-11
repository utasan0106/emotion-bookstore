'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,monday,select,dates}=require('../outings/week');
const {audiences,events,cities}=require('../tools/weekly-outings-source');
assert.equal(monday(Date.parse('2026-09-13T14:59:59Z')),'2026-09-07');
assert.equal(monday(Date.parse('2026-09-13T15:00:00Z')),'2026-09-14');
assert.equal(state('2026-09-07','2026-09-14',Date.parse('2026-09-13T15:00:00Z')),'past');
assert.deepEqual(audiences.map(a=>a.id),['couple','children','family','friends','solo']);
const now=Date.parse('2026-09-11T12:00:00+09:00');
for(const city of Object.keys(cities))assert.ok(select(events,{now,city}).length>=3,city+' needs 3 actual events this week');
for(const city of Object.keys(cities))assert.ok(select(events,{now,city,week:'2026-09-14'}).length>=3,city+' needs 3 actual events next week');
const future=select(events,{now,week:'2026-09-14'});assert.ok(future.some(e=>e.id==='jinbocho-ginga'));assert.ok(!select(events,{now}).some(e=>e.id==='jinbocho-ginga'));
assert.ok(!select(events,{now:Date.parse('2026-09-14T00:00:00+09:00')}).some(e=>e.id==='koenji-azuma'),'Ended events excluded');
// 再確認期限は会期と別に効く。会期が残っていても、期限を過ぎた催しは出さない（fail closed）。
// 期限を延ばした催しだけが残る。
//
// この契約は合成データで見る。実データの特定の催しに結びつけると、**その催しを
// 再確認したとたんにテストが落ちる**。実際 shimokita-moon でそうなった（2026-09-11）。
// 会期が残っているのに未確認、という状態は本来すぐ解消されるべきもので、
// それを契約の題材にすると「直すと落ちる」テストになってしまう。
const stillRunning=reviewThrough=>({id:'x',status:'scheduled',city:'koenji',audiences:[],browseKinds:[],
  checkedAt:'2026-09-01',reviewThrough,dates:['2026-09-22','2026-09-30']});
const atExpiry=Date.parse('2026-09-21T00:00:00+09:00');
assert.equal(select([stillRunning('2026-09-20')],{now:atExpiry}).length,0,'Unreviewed schedules fail closed');
assert.equal(select([stillRunning('2026-10-04')],{now:atExpiry}).length,1,'Re-checked schedules stay listed');
const event=events.find(e=>e.id==='kichijoji-taniguchi');assert.ok(!dates(event).includes('2026-09-30'),'Museum closure is not an event day');
assert.equal(select([{...event,status:'cancelled'}],{now,week:'2026-09-14'}).length,0);
assert.ok(select(events,{now,audience:'children'}).every(e=>e.audiences.includes('children')));
const root=path.resolve(__dirname,'..');
for(const e of events){const page=fs.readFileSync(path.join(root,`outings/events/${e.id}.html`),'utf8');assert.equal(page.split(`href="${e.url.replaceAll('&','&amp;')}"`).length-1,1,'one official action');assert.match(page,/この街で、なぜこの催し/);assert.match(page,/data-event-status/);assert.match(page,/data-page-tools/);for(const link of page.matchAll(/href="(\/[^"]*)"/g)){const target=path.join(root,link[1].split(/[?#]/)[0]);assert.ok(fs.existsSync(target),target);}}
assert.doesNotMatch(fs.readFileSync(path.join(root,'outings/week.js'),'utf8'),/fetch\(|localStorage|geolocation|gtag/);
console.log('PASS '+events.length+' sourced events; 3+ per city this and next week; JST weekly rollover, closures, expiry, cancellation, filters, details and returns');
