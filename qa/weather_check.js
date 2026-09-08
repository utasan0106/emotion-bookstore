'use strict';
const assert = require('node:assert/strict');
const {selectForecast,selectObservations,loadWeather,dayInTokyo} = require('../api/tokyo-weather');
const now = Date.parse('2026-09-08T16:50:00+09:00');
const observed = '2026-09-08T16:40:00+09:00';
const forecast = [{reportDatetime:'2026-09-08T11:00:00+09:00',timeSeries:[{
  timeDefines:['2026-09-08T11:00:00+09:00','2026-09-09T00:00:00+09:00'],
  areas:[{area:{code:'130010'},weatherCodes:['214','101'],weathers:['くもり　後　雨　所により　雷を伴う','晴れ　時々　くもり']}]
}]}];
const observations = {'44132':{temp:[26.7,0]},'44071':{temp:[26.2,0]},'99999':{temp:[12,0]}};
const copy = x=>JSON.parse(JSON.stringify(x));
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function fetcher(options={}) {
  return async url=>{
    assert.match(url,/^https:\/\/www\.jma\.go\.jp\//);
    if(url.endsWith('/forecast/130000.json')){
      if(options.forecastFails)throw Error('upstream offline');
      return {ok:true,text:async()=>JSON.stringify(forecast)};
    }
    if(url.endsWith('/latest_time.txt'))return {ok:true,text:async()=>options.latest||observed};
    assert.equal(url,'https://www.jma.go.jp/bosai/amedas/data/map/20260908164000.json');
    return {ok:!options.observationsFail,text:async()=>JSON.stringify(observations)};
  };
}
(async()=>{
 check('JST midnight boundary',()=>{assert.equal(dayInTokyo('2026-09-08T14:59:59Z'),'2026-09-08');assert.equal(dayInTokyo('2026-09-08T15:00:00Z'),'2026-09-09');});
 check('today and full official forecast retained',()=>{const f=selectForecast(forecast,now);assert.equal(f.code,'214');assert.equal(f.theme,'cloudy');assert.match(f.description,/雨 所により 雷/);});
 check('midnight selects next date',()=>assert.equal(selectForecast(forecast,Date.parse('2026-09-08T15:00:00Z')).code,'101'));
 check('old and future issued forecasts hidden',()=>{assert.equal(selectForecast(forecast,now+48*3600000),null);assert.equal(selectForecast(forecast,now-12*3600000),null);});
 check('unavailable, wrong region, malformed forecast hidden',()=>{for(const v of [null,{},[],[null], [{timeSeries:[null]}], [{timeSeries:[{areas:{}}]}]])assert.equal(selectForecast(v,now),null);const f=copy(forecast);f[0].timeSeries[0].areas[0].area.code='999999';assert.equal(selectForecast(f,now),null);});
 check('unknown weather code does not invent weather',()=>{const f=copy(forecast);f[0].timeSeries[0].areas[0].weatherCodes[0]='999';assert.equal(selectForecast(f,now),null);});
 check('only intended public observation stations',()=>assert.deepEqual(Object.keys(selectObservations(observations,observed,now)),['44071','44132']));
 check('quality flagged or missing temperatures hidden',()=>{const d=copy(observations);d['44132'].temp=[26,1];d['44071'].temp=[null,0];assert.deepEqual(selectObservations(d,observed,now),{});});
 check('stale, future and impossible observations hidden',()=>{assert.deepEqual(selectObservations(observations,observed,now+90*60000),{});assert.deepEqual(selectObservations(observations,observed,now-3600000),{});assert.deepEqual(selectObservations({'44132':{temp:[100,0]}},observed,now),{});});
 const full=await loadWeather(fetcher(),now);check('forecast and observations resolve together',()=>{assert.equal(full.forecast.date,'2026-09-08');assert.equal(full.stations['44132'].temperature,26.7);});
 const partial=await loadWeather(fetcher({forecastFails:true}),now);check('forecast outage keeps fresh temperatures',()=>{assert.equal(partial.forecast,null);assert.equal(partial.stations['44071'].temperature,26.2);});
 const noObs=await loadWeather(fetcher({observationsFail:true}),now);check('observation outage keeps forecast',()=>{assert.equal(noObs.forecast.code,'214');assert.deepEqual(noObs.stations,{});});
 const malicious=await loadWeather(fetcher({latest:'https://other.example'}),now);check('upstream text cannot redirect weather requests',()=>assert.deepEqual(malicious.stations,{}));
 const failed=await loadWeather(async()=>{throw Error('offline');},now);check('all sources unavailable returns no invented data',()=>{assert.equal(failed.forecast,null);assert.deepEqual(failed.stations,{});});
 // Exercise concurrent failures and the short failure cache through the actual handler.
 const originalFetch=global.fetch;
 let calls=0;
 global.fetch=async()=>{calls++;throw Error('offline');};
 try {
  delete require.cache[require.resolve('../api/tokyo-weather')];
  const handler=require('../api/tokyo-weather');
  const request=async method=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};await handler({method,url:'/api/tokyo-weather?city=secret'},res);return res;};
  const results=await Promise.all([request('GET'),request('GET'),request('HEAD')]);
  check('concurrent unavailable requests finish without crash',()=>{assert(results.every(x=>x.statusCode===503));assert.equal(results[2].body,'');assert.equal(calls,2);});
  await request('GET');check('failure cooldown avoids upstream request storm',()=>assert.equal(calls,2));
  const post=await request('POST');check('only read methods allowed',()=>assert.equal(post.statusCode,405));
 } finally {global.fetch=originalFetch;}
 console.log('WEATHER_CHECK_GO '+checks);
})().catch(e=>{console.error(e);process.exitCode=1;});
