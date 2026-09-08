'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state}=require('../outings/week');
const {audiences,issues}=require('../tools/weekly-outings-source');
const start='2026-09-07',end='2026-09-14';
assert.equal(state(start,end,Date.parse('2026-09-06T14:59:59Z')),'future');
assert.equal(state(start,end,Date.parse('2026-09-06T15:00:00Z')),'current');
assert.equal(state(start,end,Date.parse('2026-09-13T14:59:59Z')),'current');
assert.equal(state(start,end,Date.parse('2026-09-13T15:00:00Z')),'past');
assert.deepEqual(audiences.map(a=>a.id),['couple','children','family','friends','solo']);
const root=path.resolve(__dirname,'..');
for(const i of issues)for(const s of i.spots){
 const page=fs.readFileSync(path.join(root,`outings/${i.start}/${s.id}.html`),'utf8');
 assert.equal(page.split(`href="${s.url}"`).length-1,1);
 for(const link of page.matchAll(/href="(\/[^"]*)"/g)){
 const target=path.join(root,link[1]);assert.ok(fs.existsSync(target),target);
 }
 assert.match(page,/data-week-start/);assert.match(page,/公式情報確認/);
}
const js=fs.readFileSync(path.join(root,'outings/week.js'),'utf8');
assert.doesNotMatch(js,/fetch\(|localStorage|geolocation|gtag/);
assert.match(fs.readFileSync(path.join(root,'visit/index.html'),'utf8'),/<html lang="en">/);
console.log('PASS five audiences, weekly JST start/end boundaries, dated archives, official exits, local routes, no profiling or tracking');
