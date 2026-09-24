'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const {items,excludedItems,commonVideos,visualMedia}=require('../tools/city-discovery-source');

const publicVisual=[
  ...items.filter(i=>i.kind==='video').map(i=>({key:i.city+'/'+i.id,id:i.videoId,duration:i.durationSeconds,reason:i.durationExceptionReason})),
  ...items.filter(i=>i.trailerVideoId).map(i=>({key:i.city+'/'+i.id+' trailer',id:i.trailerVideoId,duration:i.trailerDurationSeconds,reason:i.trailerDurationExceptionReason})),
  ...commonVideos.map(i=>({key:'common/'+i.id,id:i.videoId,duration:i.durationSeconds,reason:i.durationExceptionReason}))
];
for(const media of publicVisual){
  assert.equal(media.duration,visualMedia.durationFor(media.id),media.key+' duration must be measured');
  assert.ok(visualMedia.allowed(media.id),media.key+' exceeds the public duration gate');
  assert.ok(media.duration<=300,media.key+' is over five minutes');
  if(media.duration>180) assert.ok(media.reason,media.key+' needs an explicit 3–5 minute exception reason');
}

const overlong=Object.entries(visualMedia.durations).filter(([,seconds])=>seconds>300).map(([id])=>id);
const publicIds=new Set(publicVisual.map(media=>media.id));
for(const id of overlong) assert.ok(!publicIds.has(id),'overlong video published: '+id);
for(const item of excludedItems.filter(i=>i.kind==='video'&&overlong.includes(i.videoId))) {
  assert.ok(!fs.existsSync(path.join(root,'discover',item.city,item.id+'.html')),'overlong detail page remains: '+item.city+'/'+item.id);
}

const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'release_content.js'),'utf8'),sandbox);
const releaseMedia=[];
const visit=value=>{
  if(!value||typeof value!=='object') return;
  if(value.media?.kind==='youtube') releaseMedia.push(value.media);
  for(const child of Object.values(value)) visit(child);
};
visit(sandbox.window.RELEASE_CONTENT);
for(const media of releaseMedia) assert.ok(visualMedia.allowed(media.videoId),'release video lacks an allowed measured duration: '+media.videoId);

assert.ok(!fs.existsSync(path.join(root,'work-video.html')),'retired 5:39 work page remains');
assert.ok(!fs.readFileSync(path.join(root,'thread_content.js'),'utf8').includes('dt33RGSRuo0'),'retired 5:39 video remains in the public Thread');
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).redirects.find(r=>r.source==='/work-video.html')?.destination,'/discover/short-films/');
console.log('PASS visual-media gate: '+publicVisual.length+' public videos measured, 3-minute default, 5-minute absolute maximum');
