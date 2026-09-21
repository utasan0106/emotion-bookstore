'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const policy=require('../video-duration-policy');
const source=require('../tools/city-discovery-source');

assert.equal(policy.standardMaxSeconds,180);
assert.equal(policy.absoluteMaxSeconds,300);
for(const [key,item] of Object.entries(policy.approved)){
  assert.ok(Number.isInteger(item.durationSeconds)&&item.durationSeconds>0,key+': duration required');
  assert.ok(item.durationSeconds<=policy.absoluteMaxSeconds,key+': over five minutes');
  assert.ok(item.durationSource,key+': duration source required');
  if(item.durationSeconds>policy.standardMaxSeconds) assert.ok(item.exceptionReason,key+': >3min needs explicit exception reason');
}
assert.equal(source.commonVideos.length,3,'short shelf stays finite at 3');
for(const video of source.commonVideos){
  const key='common/'+video.id, approved=policy.approved[key];
  assert.ok(approved,key+': common short must be duration-approved');
  assert.equal(video.videoId,approved.videoId,key+': video id drift');
  assert.equal(video.durationSeconds,approved.durationSeconds,key+': duration drift');
  assert.ok(video.durationSeconds<=300);
  if(video.durationSeconds>180) assert.ok(video.durationExceptionReason);
}
for(const item of source.items.filter(i=>i.kind==='video')){
  const key='city/'+item.city+'/'+item.id;
  const approved=policy.approved[key];
  const route='/discover/'+item.city+'/'+item.id+'.html';
  if(approved){
    assert.equal(item.durationPolicyStatus,'approved');
    assert.equal(item.durationSeconds,approved.durationSeconds);
  }else{
    assert.equal(item.durationPolicyStatus,'hold',key+': unverified video must be hold');
    assert.ok(policy.blockedPaths.includes(route),key+': held video needs fail-closed route');
  }
}
const works=read('works.html'),workVideo=read('work-video.html');
for(const forbidden of ['dt33RGSRuo0','pyGxVMyZCBQ','bLuK6QHKc7E','5分39秒']){
  assert.ok(!works.includes(forbidden),'works must not expose '+forbidden);
  assert.ok(!workVideo.includes(forbidden),'work-video must not expose '+forbidden);
}
assert.ok(works.includes('80y5COiKdDw')&&workVideo.includes('80y5COiKdDw'),'57-second approved record must lead work video');
const shortIndex=read('discover/short-films/index.html');
for(const video of source.commonVideos) assert.ok(shortIndex.includes(video.videoId)&&shortIndex.includes('/discover/short-films/'+video.id+'.html'));
for(const forbidden of ['bLuK6QHKc7E','RpSlspjIeG8']) assert.ok(!shortIndex.includes(forbidden),'retired/unverified common video leaked');
const outing=read('discover/outing/index.html');
assert.ok(outing.includes('/discover/kichijoji/park-voice.html'));
for(const blocked of policy.blockedPaths.filter(p=>/\/[^/]+\.html$/.test(p))) assert.ok(!outing.includes('href="'+blocked+'"'),'blocked video leaked to outing list: '+blocked);
const sitemap=read('sitemap.xml');
for(const blocked of policy.blockedPaths) assert.ok(!sitemap.includes('https://emotionbookstore.com'+blocked),'blocked route in sitemap: '+blocked);
const config=JSON.parse(read('vercel.json'));
for(const blocked of policy.blockedPaths){
  const redirect=(config.redirects||[]).find(r=>r.source===blocked);
  assert.ok(redirect,'missing redirect for blocked video: '+blocked);
}
assert.ok(read('page-nav.js').includes('/video-duration-policy.js'),'browser must load duration guard');
console.log('PASS video duration policy: <=3m default, <=5m reasoned exception, unknown/over-limit fail closed');
