'use strict';
const assert=require('node:assert/strict');
const {screenCandidate,screenSet}=require('../tools/michiyomi-editorial-screen');

const alley=screenCandidate({
  sceneId:'a',captureYear:2021,distanceM:80,
  summary:'住宅地内の細い路地。住宅・店舗が並び、植木鉢と小さな看板がある。',
  imagePage:'https://www.mapillary.com/app/?pKey=a'
});
assert.equal(alley.editorialScreen.status,'HUMAN_REVIEW');
assert.ok(alley.editorialScreen.positiveReasons.includes('路地'));
assert.ok(alley.editorialScreen.privateContext.length>0);

const rail=screenCandidate({
  sceneId:'b',captureYear:2021,distanceM:5,
  summary:'鉄道車両の運転台から駅ホームと線路を見る。',
  imagePage:'https://www.mapillary.com/app/?pKey=b'
});
assert.equal(rail.editorialScreen.status,'REJECT_RAIL');

const koenji=screenCandidate({
  sceneId:'c',captureYear:2024,distanceM:40,
  summary:'高円寺駅の高架下に店舗が並ぶ一般道路。',
  imagePage:'https://www.mapillary.com/app/?pKey=c'
});
assert.ok(!koenji.editorialScreen.positiveReasons.includes('寺院'));

const set=screenSet({source:'michiyomi',fetchedAt:'x',query:{},coverage:{},candidates:[rail,alley]});
assert.equal(set.totals.all,2);
assert.equal(set.totals.humanReview,1);
assert.equal(set.candidates[0].sceneId,'a');

console.log('PASS Michiyomi editorial screen: distinctive cues surface, rail noise rejects, private context stays flagged');
