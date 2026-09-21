'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {events,isPublishableEvent}=require('../tools/weekly-outings-source');

assert.equal(typeof isPublishableEvent,'function','publishability gate must be exported');
const pending=events.filter(e=>!isPublishableEvent(e));
const publishable=events.filter(isPublishableEvent);

const runtimeText=fs.readFileSync(path.join(root,'outings/events-data.js'),'utf8');
const prefix='window.OUTINGS_DATA=';
assert.ok(runtimeText.startsWith(prefix),'events-data prefix');
const runtime=JSON.parse(runtimeText.slice(prefix.length,runtimeText.lastIndexOf(';')));
const index=fs.readFileSync(path.join(root,'outings/index.html'),'utf8');
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');

assert.equal(runtime.events.length,publishable.length,'runtime event count must equal publishable source count');
const runtimeIds=new Set(runtime.events.map(e=>e.id));
for(const event of pending){
  const id=event.id;
  assert.ok(!runtimeIds.has(id),'pending event leaked to runtime data: '+id);
  assert.ok(!index.includes('data-event-card="'+id+'"'),'pending event card leaked to index: '+id);
  assert.ok(!index.includes('/outings/events/'+id+'.html'),'pending event link leaked to index: '+id);
  assert.ok(!sitemap.includes('/outings/events/'+id+'.html'),'pending event leaked to sitemap: '+id);
  assert.ok(!fs.existsSync(path.join(root,'outings/events',id+'.html')),'pending direct detail still exists: '+id);
}
console.log('PASS editorial pending gate: '+pending.length+' pending hidden; '+publishable.length+' publishable');
