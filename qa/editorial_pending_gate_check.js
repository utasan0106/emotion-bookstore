'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {events,isPublishableEvent}=require('../tools/weekly-outings-source');
const week=require('../outings/week');

assert.equal(typeof isPublishableEvent,'function','publishability gate must be exported');
const pending=events.filter(e=>!isPublishableEvent(e));
const publishable=events.filter(isPublishableEvent);
const today=week.date(Date.now());
const currentPublishable=publishable.filter(e=>e.status==='scheduled'&&e.checkedAt<=today&&e.reviewThrough>=today&&week.dates(e).at(-1)>=today);

const runtimeText=fs.readFileSync(path.join(root,'outings/events-data.js'),'utf8');
const prefix='window.OUTINGS_DATA=';
assert.ok(runtimeText.startsWith(prefix),'events-data prefix');
const runtime=JSON.parse(runtimeText.slice(prefix.length,runtimeText.lastIndexOf(';')));
const index=fs.readFileSync(path.join(root,'outings/index.html'),'utf8');
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');

assert.equal(runtime.events.length,currentPublishable.length,'runtime event count must equal current reviewed publishable count');
const runtimeIds=new Set(runtime.events.map(e=>e.id));
assert.deepEqual([...runtimeIds].sort(),currentPublishable.map(e=>e.id).sort(),'runtime IDs must match current reviewed events');
for(const event of pending){
  const id=event.id;
  assert.ok(!runtimeIds.has(id),'pending event leaked to runtime data: '+id);
  assert.ok(!index.includes('data-event-card="'+id+'"'),'pending event card leaked to index: '+id);
  assert.ok(!index.includes('/outings/events/'+id+'.html'),'pending event link leaked to index: '+id);
  assert.ok(!sitemap.includes('/outings/events/'+id+'.html'),'pending event leaked to sitemap: '+id);
  assert.ok(!fs.existsSync(path.join(root,'outings/events',id+'.html')),'pending direct detail still exists: '+id);
}
for(const event of publishable.filter(e=>!currentPublishable.includes(e))){
  assert.ok(!runtimeIds.has(event.id),'expired/unreviewed publishable event leaked to runtime: '+event.id);
  assert.ok(!sitemap.includes('/outings/events/'+event.id+'.html'),'expired/unreviewed event leaked to sitemap: '+event.id);
  assert.ok(!fs.existsSync(path.join(root,'outings/events',event.id+'.html')),'expired/unreviewed detail still exists: '+event.id);
}
console.log('PASS editorial/current gate: '+pending.length+' pending hidden; '+currentPublishable.length+' current reviewed published');
