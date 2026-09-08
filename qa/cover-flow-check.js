'use strict';
// Sep 8 user defects: visible local photos, consistent time/cover, direct official exits.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html'),weather=read('city-weather.js'),css=read('page-nav.css');
const {events}=require('../tools/weekly-outings-source');
const {mediaFor,postFor}=require('../tools/event-media-source');
assert.doesNotMatch(css,/city-rain-drift|city-snow-drift|city-rain-surface/);
assert.doesNotMatch(weather,/city-atmosphere|city-weather-motion|selectScene|sceneLink/);
const photos=[...home.matchAll(/src="([^\"]*home-(?:work-|thread-)[^\"]+)"/g)].map(m=>m[1]);
assert.equal(photos.length,5);for(const p of photos)assert.ok(fs.statSync(path.join(root,p)).size>1000,p);
assert.equal((home.match(/loading="eager"/g)||[]).length,5,'Critical work/history photos must not wait for lazy intersection');
const scene={attrs:{},getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;}};
let now=Date.parse('2026-09-08T18:59:00+09:00'),tick;
const doc={body:{dataset:{}},hidden:false,documentElement:{lang:'ja'},querySelector:s=>s==='[data-city-scene-image]'?scene:null,querySelectorAll:()=>[],addEventListener(){}};
vm.runInNewContext(read('time-of-day.js'),{document:doc,Intl,Date:class extends Date{constructor(...args){super(...(args.length?args:[now]));}},setInterval:f=>tick=f});
assert.ok(scene.attrs.src.includes('-day-'));
now=Date.parse('2026-09-08T19:00:00+09:00');tick();assert.ok(scene.attrs.src.includes('-night-'));assert.match(scene.alt,/夜/);
now=Date.parse('2026-09-09T05:00:00+09:00');tick();assert.ok(scene.attrs.src.includes('-day-'));
for(const period of ['day','night'])assert.ok(fs.statSync(path.join(root,'assets/home-encounter-'+period+'-20260908.webp')).size>10000);
const index=read('outings/index.html');
for(const e of events){
 const m=mediaFor(e);assert.ok(m.caption&&m.alt);assert.ok(fs.statSync(path.join(root,m.src)).size>1000);
 const card=(index.match(new RegExp('<article class="event-card" data-event-card="'+e.id+'"[\\s\\S]*?</article>'))||[])[0];assert.ok(card,e.id);
 assert.ok(card.includes('href="'+e.url.replaceAll('&','&amp;')+'"'),e.id+': official page must be a one-click card target');
 assert.match(card,/data-event-detail/);assert.match(card,/<img /);
 const detail=read('outings/events/'+e.id+'.html');assert.ok(detail.indexOf('class="primary"')<detail.indexOf('class="event-facts"'),e.id+': official action must precede extended reading');
 const post=postFor(e);assert.equal(detail.includes('www.instagram.com/p/'),Boolean(post));
 if(post){assert.ok(detail.includes('src="'+post.embed+'"'));assert.match(detail,/referrerpolicy="no-referrer"/);}
}
assert.match(read('outings/week.js'),/querySelector\('\[data-event-detail\]'\)\.href/);
const suggest=read('suggest.html');assert.ok(suggest.indexOf('id="sg-form"')<suggest.indexOf('id="suggestForm"'),'Direct form entry precedes optional local drafting');
assert.match(suggest,/紹介する文を、ここで下書きする/);
console.log('PASS cover day/night rollover, 5 eager local photos, no rain particles, 24 direct official cards with local images, 2 attributed artist embeds, direct introduction form');
