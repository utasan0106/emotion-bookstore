'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../city-weather'),'utf8');
const at=Date.parse('2026-09-08T16:50:00+09:00');
function element(){return {dataset:{},events:{},children:[],textContent:'',setAttribute(){},append(x){this.children.push(x);},prepend(x){this.children.unshift(x);},addEventListener(n,f){this.events[n]=f;}};}
async function mount(path='/',options={}){
 let clock=at;
 const nodes=Object.fromEntries(['select','.city-weather-reading','[data-weather-forecast]','[data-weather-observation]','input'].map(k=>[k,element()]));
 const panel=element();panel.querySelector=k=>nodes[k];
 const main=element(),body=element(),events={},intervals=[],calls=[];
 let fail=Boolean(options.fail);
 const payload={forecast:{date:'2026-09-08',issuedAt:'2026-09-08T11:00:00+09:00',description:'くもり 後 雨 所により 雷を伴う',theme:'cloudy'},stations:{'44132':{name:'東京',temperature:26.7,observedAt:'2026-09-08T16:40:00+09:00'},'44071':{name:'練馬',temperature:26.2,observedAt:'2026-09-08T16:40:00+09:00'}}};
 const doc={documentElement:{lang:'ja'},body,hidden:false,querySelector:k=>k==='main'?main:null,createElement:k=>k==='section'?panel:element(),addEventListener:(n,f)=>events[n]=f};
 const ctx={document:doc,location:{pathname:path,search:''},URLSearchParams,Intl,AbortSignal,Date:class extends Date{static now(){return clock;}},setInterval:f=>intervals.push(f),fetch:async(url,opts)=>{calls.push({url,opts});return {ok:!fail,json:async()=>payload};}};
 vm.runInNewContext(source,ctx);
 await new Promise(setImmediate);
 return {nodes,body,doc,main,events,intervals,calls,payload,advance:n=>clock+=n,setFail:v=>fail=v,flush:()=>new Promise(setImmediate)};
}
(async()=>{
 const h=await mount('/discover/koenji/');
 assert.equal(h.nodes.select.value,'koenji');
 assert.match(h.nodes['.city-weather-reading'].textContent,/26.2℃（練馬/);
 assert.match(h.nodes['.city-weather-reading'].textContent,/くもり 後 雨/,'Rain later must remain visible in summary');
 assert.equal(h.body.dataset.cityWeather,'cloudy');
 h.nodes.select.value='jinbocho';h.nodes.select.events.change();
 assert.match(h.nodes['.city-weather-reading'].textContent,/26.7℃（東京/);
 assert.equal(h.calls.length,1,'Changing street reuses the same regional payload');
 h.nodes.input.events.change({target:{checked:false}});
 assert.equal(h.body.dataset.cityWeather,undefined);
 h.nodes.input.events.change({target:{checked:true}});
 assert.equal(h.body.dataset.cityWeather,'cloudy');
 h.advance(23*60000);h.doc.hidden=true;h.intervals[0]();await h.flush();
 assert.equal(h.calls.length,1,'No network while hidden');
 h.doc.hidden=false;h.events.visibilitychange();await h.flush();assert.equal(h.calls.length,2);
 h.setFail(true);h.advance(16*60000);h.intervals[0]();await h.flush();
 assert.equal(h.body.dataset.cityWeather,undefined);assert.match(h.nodes['.city-weather-reading'].textContent,/取得できません/);
 const midnight=await mount();midnight.advance(8*3600000);midnight.intervals[0]();await midnight.flush();
 assert.equal(midnight.body.dataset.cityWeather,undefined,'Cached yesterday data cannot keep the theme');
 assert.match(midnight.nodes['.city-weather-reading'].textContent,/取得できません/);
 const detail=await mount('/discover/koenji/1q84.html');assert.equal(detail.calls.length,0);assert.equal(detail.main.children.length,0);
 const privacy=await mount('/data.html');assert.equal(privacy.calls.length,0);
 assert.equal(h.calls[0].url,'/api/tokyo-weather');assert.equal(h.calls[0].opts.credentials,'omit');assert.equal(h.calls[0].opts.referrerPolicy,'no-referrer');
 assert.doesNotMatch(source,/localStorage|sessionStorage|geolocation|gtag\(/);
 console.log('WEATHER_CLIENT_GO: city choice, forecast wording, theme control, outage, expiry, visibility, detail exclusion and request privacy');
})().catch(e=>{console.error(e);process.exitCode=1;});
