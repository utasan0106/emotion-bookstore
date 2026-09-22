'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
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

assert.equal(source.commonVideos.length,3,'weekly short shelf stays finite at 3');
for(const video of source.commonVideos){
  const approved=policy.approved['common/'+video.id];
  assert.ok(approved,'common/'+video.id+': duration approval required');
  assert.equal(video.videoId,approved.videoId,'common/'+video.id+': video id drift');
  assert.equal(video.durationSeconds,approved.durationSeconds,'common/'+video.id+': duration drift');
}

const held=[];
for(const item of source.items.filter(i=>i.kind==='video')){
  const key='city/'+item.city+'/'+item.id;
  if(policy.approved[key]) continue;
  const route='/discover/'+item.city+'/'+item.id+'.html';
  assert.ok(policy.blockedPaths.includes(route),key+': unverified city video must be fail-closed');
  held.push(item);
}

const config=JSON.parse(read('vercel.json'));
const redirects=config.redirects||[];
for(const route of policy.blockedPaths){
  assert.ok(redirects.some(r=>r.source===route),route+': blocked route needs redirect');
}
const sitemap=read('sitemap.xml');
for(const route of policy.blockedPaths){
  assert.ok(!sitemap.includes('https://emotionbookstore.com'+route),route+': blocked route leaked to sitemap');
}

const publicFiles=['index.html','release_content.js','works.html','work-video.html','discover/short-films/index.html','discover/kiyosumi/index.html'];
for(const item of held){
  if(!item.videoId) continue;
  for(const file of publicFiles) assert.ok(!read(file).includes(item.videoId),file+': held video leaked: '+item.videoId);
}
for(const file of publicFiles) assert.ok(!read(file).includes('bLuK6QHKc7E'),file+': retired long Kiyosumi video leaked');

for(const video of source.commonVideos){
  const detail='discover/short-films/'+video.id+'.html';
  assert.ok(fs.existsSync(path.join(root,detail)),detail+': approved short detail missing');
  assert.ok(read('discover/short-films/index.html').includes(video.videoId),video.id+': approved short missing from index');
}
console.log('PASS video duration integrity: <=3m default, 3-5m explicit exception, >5m/unknown fail-closed');
