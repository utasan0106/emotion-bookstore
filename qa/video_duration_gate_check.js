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
// Any unpublished item must be absent from generated detail routes and sitemap,
// including 181–300 second videos without an approved exception and unknowns.
const publicSitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const item of excludedItems) {
  const route='/discover/'+item.city+'/'+item.id+'.html';
  assert.ok(!fs.existsSync(path.join(root,route.slice(1))), 'excluded detail page remains: '+route);
  assert.ok(!publicSitemap.includes(route), 'excluded detail remains in public sitemap: '+route);
}

const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'release_content.js'),'utf8'),sandbox);
const releaseMedia=[];
const visit=value=>{
  if(!value||typeof value!=='object') return;
  if(value.media?.kind==='youtube') releaseMedia.push({...value.media, editorialKind:value.kind});
  for(const child of Object.values(value)) visit(child);
};
assert.ok(sandbox.window.V3_RELEASE_CONTENT, 'V3_RELEASE_CONTENT must exist; never pass an empty traversal');
visit(sandbox.window.V3_RELEASE_CONTENT);
// Source-reviewed release entries. New entries must be explicitly classified,
// rather than silently exempting every object which calls itself music.
const expectedReleaseKinds = {'15crm4zuB04':'映画', 'iy-YU6QHEQY':'音楽'};
assert.equal(releaseMedia.length, 2, 'inspect exactly the two source-reviewed release media entries');
assert.equal(new Set(releaseMedia.map(m=>m.videoId)).size, 2, 'release media IDs must be unique');
for(const media of releaseMedia) {
  assert.equal(media.editorialKind, expectedReleaseKinds[media.videoId], 'release media classification requires review: '+media.videoId);
  assert.ok(Object.hasOwn(expectedReleaseKinds,media.videoId), 'unreviewed release media: '+media.videoId);
  if(media.editorialKind==='音楽') {
    assert.equal(media.videoId,'iy-YU6QHEQY','only the reviewed Fishmans official audio is exempt');
    assert.equal(media.sourceUrl,'https://www.youtube.com/watch?v=iy-YU6QHEQY');
    continue;
  }
  assert.ok(visualMedia.allowed(media.videoId),'release visual media lacks an allowed measured duration: '+media.videoId);
}
assert.equal(visualMedia.durationFor('K_LDvvjC8Uw'),181,'180.442 seconds must round up, not pass the 180-second default');

assert.ok(!fs.existsSync(path.join(root,'work-video.html')),'retired 5:39 work page remains');
assert.ok(!fs.readFileSync(path.join(root,'thread_content.js'),'utf8').includes('dt33RGSRuo0'),'retired 5:39 video remains in the public Thread');
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).redirects.find(r=>r.source==='/work-video.html')?.destination,'/discover/short-films/');
console.log('PASS visual-media gate: '+publicVisual.length+' public videos measured; '+releaseMedia.length+' release entries classified (1 visual, 1 reviewed music exemption); 3-minute default, 5-minute absolute maximum');
