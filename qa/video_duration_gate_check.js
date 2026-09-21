'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=require('../tools/city-discovery-source');
const {items,commonVideos,videoDurationEligible,VIDEO_DEFAULT_MAX_SECONDS,VIDEO_HARD_MAX_SECONDS}=source;
const publishedVideos=items.filter(i=>i.kind==='video');
assert.ok(publishedVideos.length>0,'At least one reviewed city video should remain');
for(const video of [...publishedVideos,...commonVideos]){
  assert.ok(videoDurationEligible(video),'Published video must pass duration gate: '+video.id);
  assert.ok(Number.isInteger(video.durationSeconds)&&video.durationSeconds>0,'Duration must be verified: '+video.id);
  assert.ok(video.durationSeconds<=VIDEO_HARD_MAX_SECONDS,'No published video may exceed five minutes: '+video.id);
  if(video.durationSeconds>VIDEO_DEFAULT_MAX_SECONDS) assert.ok(video.durationExceptionReason,'3-5 minute video needs explicit editorial exception: '+video.id);
}
assert.equal(VIDEO_DEFAULT_MAX_SECONDS,180);
assert.equal(VIDEO_HARD_MAX_SECONDS,300);
assert.ok(![...publishedVideos,...commonVideos].some(v=>v.videoId==='bLuK6QHKc7E'),'20-minute Kiyosumi program must never be published as a video work');
for(const common of commonVideos){
  if(!common.reusedFrom) continue;
  const [city,id]=common.reusedFrom.split('/');
  const target=items.find(i=>i.city===city&&i.id===id);
  assert.ok(target&&target.kind==='video','reused common short must point to a published city video: '+common.id);
  assert.equal(target.videoId,common.videoId,'reused common short must be the exact same clip: '+common.id);
}
const allowed=new Set(publishedVideos.map(v=>v.videoId));
const videoPages=['work-video.html','discover/koenji/video.html','discover/shimokitazawa/video.html','discover/kichijoji/video.html','discover/jinbocho/video.html'];
for(const page of videoPages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  for(const m of html.matchAll(/data-video-id="([^"]+)"/g)) assert.ok(allowed.has(m[1]),page+' exposes unreviewed/long video '+m[1]);
}
const commonAllowed=new Set(commonVideos.map(v=>v.videoId));
for(const page of ['discover/short-films/index.html',...commonVideos.map(v=>'discover/short-films/'+v.id+'.html')]){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  for(const m of html.matchAll(/data-video-id="([^"]+)"/g)) assert.ok(commonAllowed.has(m[1]),page+' exposes non-current short '+m[1]);
}
console.log('PASS video duration gate: default <=180s; explicit exception <=300s; >300s and unknown durations fail closed');
