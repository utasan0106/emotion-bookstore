'use strict';
const assert=require('node:assert/strict');
const source=require('../tools/city-discovery-source');
assert.equal(source.commonVideos.length,3,'Short shelf stays finite at 3');
assert.deepEqual(source.commonVideos.map(v=>v.id),['thanks-tokyo','tokyo-metro-newline','inokashira-park-voice']);
for(const v of source.commonVideos){
  assert.ok(Number.isInteger(v.durationSeconds)&&v.durationSeconds>0,v.id+': duration must be verified');
  assert.ok(v.durationSeconds<=300,v.id+': over five minutes is forbidden');
  if(v.durationSeconds>180) assert.ok(v.durationExceptionReason,v.id+': 3-5 minute exception needs a reason');
  assert.ok(v.durationSource,v.id+': duration evidence required');
}
assert.ok(!source.commonVideos.some(v=>v.videoId==='bLuK6QHKc7E'),'20-minute Kiyosumi program must not be in short shelf');
console.log('PASS common short duration: 3 finite videos, verified duration, >5m excluded');
