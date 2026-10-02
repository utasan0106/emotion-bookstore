'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,monday,select,dates}=require('../outings/week');
const source=require('../tools/weekly-outings-source'),{audiences,events,cities}=source;
assert.equal(monday(Date.parse('2026-09-13T14:59:59Z')),'2026-09-07');
assert.equal(monday(Date.parse('2026-09-13T15:00:00Z')),'2026-09-14');
assert.equal(state('2026-09-07','2026-09-14',Date.parse('2026-09-13T15:00:00Z')),'past');
assert.deepEqual(audiences.map(a=>a.id),['couple','children','family','friends','solo']);
const now=Date.parse('2026-09-11T12:00:00+09:00');
// Frozen synthetic calendar exercises selection independently of later official rechecks.
// Production checkedAt must remain the real latest verification date.
const fixtures=Object.keys(cities).flatMap(city=>[11,12,13,15].map(day=>({
 id:city+'-'+day,city,status:'scheduled',checkedAt:'2026-09-01',reviewThrough:'2026-09-30',
 dates:['2026-09-'+day],audiences:day===11?['children']:['solo'],browseKinds:['stage']
})));
for(const city of Object.keys(cities)){
 assert.equal(select(fixtures,{now,city}).length,3,city+' current-week filter');
 assert.equal(select(fixtures,{now,city,week:'2026-09-14'}).length,1,city+' explicit future-week filter');
}
assert.ok(!select(events,{now,city:'kichijoji',week:'2026-09-14'}).some(e=>e.id==='kichijoji-winter'),'Retired Kichijoji performance stays out of recommendations');
assert.equal(select(fixtures,{now,week:'2026-09-14'}).length,4,'Future week selects only its dates');
assert.ok(select(fixtures,{now}).every(e=>!e.id.endsWith('-15')));
assert.ok(select(fixtures,{now:Date.parse('2026-09-14T00:00:00+09:00')}).every(e=>e.id.endsWith('-15')),'Ended event dates excluded');
assert.equal(select(fixtures,{now,audience:'children'}).length,4,'Audience filter is nonempty and exact');
assert.ok(select(fixtures,{now,audience:'children'}).every(e=>e.audiences.includes('children')));
// All dates is a date-range choice, not a relaxation of the publication gates.
const allFixture={id:'multi',city:'koenji',status:'scheduled',editorialReview:'approved',checkedAt:'2026-09-01',reviewThrough:'2026-12-31',dates:['2026-09-10','2026-09-11','2026-09-15','2026-11-20'],audiences:['solo'],browseKinds:['live']};
const allFixtures=[
 {...allFixture,id:'future',dates:['2026-11-20']},allFixture,
 {...allFixture,id:'pending',editorialReview:'pending'},
 {...allFixture,id:'expired-review',reviewThrough:'2026-09-10'},
 {...allFixture,id:'not-yet-checked',checkedAt:'2026-09-12'},
 {...allFixture,id:'unknown-review',reviewThrough:undefined},
 {...allFixture,id:'unknown-check',checkedAt:undefined},
 {...allFixture,id:'cancelled',status:'cancelled'},
 {...allFixture,id:'ended',dates:['2026-09-10']},
 {...allFixture,id:'other-city',city:'shimokitazawa'},
 {...allFixture,id:'other-kind',browseKinds:['book']},
 {...allFixture,id:'other-audience',audiences:['friends']}
];
const allOptions={now,week:'all',city:'koenji',kind:'live',audience:'solo'};
assert.deepEqual(select(allFixtures,allOptions).map(e=>[e.id,e.nextDate]),[['multi','2026-09-11'],['future','2026-11-20']],'All dates includes later months once per event, ordered by next future date, with all AND filters and gates');
assert.deepEqual(select(allFixtures,{...allOptions,now:Date.parse('2026-09-12T00:00:00+09:00')}).filter(e=>e.id==='multi').map(e=>e.nextDate),['2026-09-15'],'A multi-date event advances once after midnight');
assert.equal(select([allFixture],{...allOptions,city:'jinbocho'}).length,0,'No matching all-date events gives an honest empty result');
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
const event=events.find(e=>e.id==='kichijoji-taniguchi');assert.ok(!dates(event).includes('2026-09-30')&&!dates(event).includes('2026-10-28'),'Museum closures are not event days');
assert.equal(select([{...event,status:'cancelled'}],{now:Date.parse(event.checkedAt+'T12:00:00+09:00')}).length,0);
assert.ok(select(events,{now,audience:'children'}).every(e=>e.audiences.includes('children')));
// Every publishable real event fails closed before verification and after review/end.
for(const e of events.filter(source.isPublishableEvent)){
 const start=Date.parse(e.checkedAt+'T00:00:00+09:00');
 assert.equal(select([e],{now:start-1}).length,0,'Not verified yet: '+e.id);
 assert.equal(select([e],{now:start-1,week:'all'}).length,0,'All dates excludes unverified events: '+e.id);
 const last=dates(e).at(-1),end=[last,e.reviewThrough].sort()[0];
 const after=Date.parse(end+'T00:00:00+09:00')+86400000;
 assert.equal(select([e],{now:after}).length,0,'Expired at JST midnight: '+e.id);
 assert.equal(select([e],{now:after,week:'all'}).length,0,'All dates expires at JST midnight: '+e.id);
 if(e.status==='scheduled'&&dates(e).includes(end)&&e.checkedAt<=end){
  assert.equal(select([e],{now:after-1}).length,1,'Last valid day remains available: '+e.id);
  assert.equal(select([e],{now:after-1,week:'all'}).length,1,'All dates keeps the last valid day: '+e.id);
 }
}
const root=path.resolve(__dirname,'..');
const runtimeSource=fs.readFileSync(path.join(root,'outings/week.js'),'utf8');
const safeParams=require('node:vm').runInNewContext('('+runtimeSource.match(/function safeParams\(p\)\{[^\n]+/)[0]+')',{URLSearchParams,data:source,...require('../outings/week')});
assert.equal(safeParams(new URLSearchParams('week=all&city=koenji&kind=live&with=solo')).toString(),'week=all&city=koenji&with=solo&kind=live','All mode survives the same safe URL parser used for details and returns');
for(const invalid of ['ALL','all-dates','2026-02-30','not-a-date'])assert.equal(safeParams(new URLSearchParams({week:invalid})).has('week'),false,'Reject malformed period '+invalid);
const index=fs.readFileSync(path.join(root,'outings/index.html'),'utf8');
const filterForm=index.match(/<form id="event-filters"[\s\S]*?<\/form>/)[0];
assert.deepEqual([...filterForm.matchAll(/<select name="([^"]+)"/g)].map(m=>m[1]),['city','week','kind','with'],'City-first visual and keyboard order must come from DOM order');
const todayString=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const currentRuntime=events.filter(e=>source.isPublishableEvent(e)&&e.status==='scheduled'&&e.checkedAt<=todayString&&e.reviewThrough>=todayString&&dates(e).at(-1)>=todayString);
for(const e of currentRuntime){const page=fs.readFileSync(path.join(root,`outings/events/${e.id}.html`),'utf8');assert.equal(page.split(`href="${e.url.replaceAll('&','&amp;')}"`).length-1,1,'one official action');assert.match(page,/この街で、なぜこの催し/);assert.match(page,/data-event-status/);assert.match(page,/data-page-tools/);for(const link of page.matchAll(/href="(\/[^"]*)"/g)){const target=path.join(root,link[1].split(/[?#]/)[0]);assert.ok(fs.existsSync(target),target);}}
const redirects=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).redirects||[];
for(const e of events.filter(e=>!currentRuntime.includes(e))){
 assert.ok(!fs.existsSync(path.join(root,`outings/events/${e.id}.html`)),'inactive detail must not exist: '+e.id);
 assert.deepEqual(redirects.find(r=>r.source===`/outings/events/${e.id}.html`),{source:`/outings/events/${e.id}.html`,destination:'/outings/',permanent:false},'inactive detail must retain a safe route: '+e.id);
}
assert.doesNotMatch(fs.readFileSync(path.join(root,'outings/week.js'),'utf8'),/fetch\(|localStorage|geolocation|gtag/);
console.log('PASS event selection contracts + '+currentRuntime.length+' current reviewed detail pages; JST rollover, closures, expiry, cancellation and filters');
