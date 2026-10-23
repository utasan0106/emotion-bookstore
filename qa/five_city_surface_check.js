'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {cities,events}=require('../tools/weekly-outings-source');
const week=require('../outings/week');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
const ids=['koenji','shimokitazawa','kichijoji','jinbocho','kiyosumi'];
assert.deepEqual(Object.keys(cities),ids);
const ctx={window:{}};vm.runInNewContext(read('outings/events-data.js'),ctx);
assert.deepEqual(Object.keys(ctx.window.OUTINGS_DATA.cities),ids);
const html=read('outings/index.html'),form=html.match(/<select name="city">([\s\S]*?)<\/select>/)[1];
assert.match(form,/5つの街から/);assert.doesNotMatch(html,/4つの街から/);
assert.deepEqual([...form.matchAll(/<option value="([^"]+)"/g)].map(x=>x[1]),ids);
for(const id of ids)assert.ok(html.includes('/discover/'+id+'/'),id+' has a useful empty-state route');
const visit=read('visit/index.html');assert.equal((visit.match(/class="visit-city"/g)||[]).length,5);
assert.doesNotMatch(visit,/Four Tokyo|Four neighborhoods/);assert.match(visit,/href="\/discover\/kiyosumi\/"/);
assert.match(visit,/Kiyosumi-Shirakawa/);
// The fifth filter is not permission to fabricate or publish pending events.
assert.deepEqual(week.select(events,{now:Date.parse('2026-10-23T12:00:00+09:00'),week:'all',city:'kiyosumi'}).map(e=>e.id),['kiyosumi-tada2026'],'Only the newly source-verified Kiyosumi exhibition is available');
const runtime=ctx.window.OUTINGS_DATA.events;
const today=week.date(Date.now());
assert.ok(runtime.every(e=>e.checkedAt<=today&&e.reviewThrough>=today&&week.dates(e).at(-1)>=today));
assert.doesNotMatch(read('discover/essays/kichijoji-advertising.html'),/AIで街を多角的に読む/);
assert.match(read('discover/essays/kichijoji-advertising.html'),/AIを資料探索・比較・文章化に使用/);
// Review expiry is not the exhibition's real end. Exercise the shipped detail runtime.
const mot=events.find(e=>e.id==='kiyosumi-tada2026');
assert.equal(mot.end,'2026-12-06');assert.equal(mot.reviewThrough,'2026-11-01');
assert.equal(week.dates(mot).at(-1),'2026-12-06');
assert.ok(week.dates(mot).includes('2026-11-23'));assert.ok(!week.dates(mot).includes('2026-11-24'));
assert.equal(week.select([mot],{now:Date.parse('2026-11-02T12:00:00+09:00'),week:'all'}).length,0,'Expired review suppresses listing without changing actual end');
function assertMotDetail(now,detail){
 const eligible=week.select([mot],{now,week:'all'}).length>0;
 if(!eligible){assert.equal(detail,null,'Expired or unreviewed MOT detail must be retired');return;}
 assert.equal(typeof detail,'string','Eligible MOT detail must be generated');
 const schemas=[...detail.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
 assert.equal(schemas.find(x=>x['@type']==='Event')?.endDate,mot.end,'Schema must retain actual exhibition end');
}
const detailPath=require('node:path').join(__dirname,'../outings/events/kiyosumi-tada2026.html');
assertMotDetail(Date.now(),fs.existsSync(detailPath)?fs.readFileSync(detailPath,'utf8'):null);
const motSchema='<script type="application/ld+json">'+JSON.stringify({'@type':'Event',endDate:mot.end})+'</script>';
assertMotDetail(Date.parse(mot.checkedAt+'T12:00:00+09:00'),motSchema);
assert.throws(()=>assertMotDetail(Date.parse(mot.checkedAt+'T12:00:00+09:00'),null),'Missing current detail fails');
assert.throws(()=>assertMotDetail(Date.parse(mot.checkedAt+'T12:00:00+09:00'),motSchema.replace(mot.end,mot.reviewThrough)),'Review deadline cannot replace actual end');
const reviewExpired=Date.parse(week.add(mot.reviewThrough,1)+'T00:00:00+09:00');
assertMotDetail(reviewExpired,null);
assert.throws(()=>assertMotDetail(reviewExpired,motSchema),'Stale detail fails after review expiry');
function detailLabel(instant){
 const status={dataset:{eventStatus:mot.id},classList:{toggle(){}}};
 const now=Date.parse(instant);class FixedDate extends Date{static now(){return now;}}
 vm.runInNewContext(read('outings/week.js'),{Date:FixedDate,URLSearchParams,location:{search:''},
  window:{OUTINGS_DATA:{events:[mot],cities,audiences:[],kinds:[]}},
  document:{querySelector:s=>s==='[data-event-status]'?status:null,addEventListener(){}}});
 return status.textContent;
}
assert.equal(detailLabel('2026-11-01T12:00:00+09:00'),'本日の開催予定');
assert.equal(detailLabel('2026-11-02T00:00:00+09:00'),'開催状況を再確認中');
assert.equal(detailLabel('2026-12-06T12:00:00+09:00'),'開催状況を再確認中');
assert.equal(detailLabel('2026-12-07T00:00:00+09:00'),'この催しは終了しました');
const nextIssue=require('./freshness_workflow_check').generatedDiscoveryAt('2026-10-26T12:00:00+09:00','discover/weekly/index.html');
const ending=nextIssue.match(/<ul data-ending-list>([\s\S]*?)<\/ul>/)[1];
assert.ok(!ending.includes('kiyosumi-tada2026'),'Review deadline must not advertise an exhibition ending Nov1');
console.log('PASS five-city source/runtime/filter/English guide, truthful empty state, current expiry gates, and editorial transparency');
