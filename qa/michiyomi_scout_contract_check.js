'use strict';
const assert = require('node:assert/strict');
const {parseArgs, normalizeScene, buildUrl} = require('../tools/michiyomi-scout');

const args = parseArgs(['--lat','35.705347','--lon','139.649825','--radius','500','--limit','12']);
assert.equal(args.lat,35.705347);
assert.equal(args.lon,139.649825);
assert.equal(args.radiusM,500);
assert.equal(args.limit,12);
assert.equal(args.yearFrom,null);

const url = buildUrl('https://michiyomi.dev','/v1/scenes/nearby',{
  lat:35.705347,lon:139.649825,radius_m:500,limit:12
});
assert.equal(url.hostname,'michiyomi.dev');
assert.equal(url.pathname,'/v1/scenes/nearby');
assert.equal(url.searchParams.get('limit'),'12');

const scene = normalizeScene({
  id:'964535250779795',
  distance_m:3,
  capture_year:2019,
  summary:'施設: 一般道路',
  image_page:'https://www.mapillary.com/app/?pKey=964535250779795',
  generation:{id:'gen1-codex'},
  model:'example-model'
},{
  snapshot:'2026-09-13-r1',
  license:{id:'CC-BY-SA-4.0',attribution:'Derived from © Mapillary contributors'}
});
assert.deepEqual(scene,{
  sceneId:'964535250779795',
  captureYear:2019,
  distanceM:3,
  summary:'施設: 一般道路',
  imagePage:'https://www.mapillary.com/app/?pKey=964535250779795',
  generationId:'gen1-codex',
  model:'example-model',
  snapshot:'2026-09-13-r1',
  attribution:'Derived from © Mapillary contributors',
  licenseId:'CC-BY-SA-4.0'
});
assert.throws(()=>normalizeScene({
  id:'1',capture_year:2019,image_page:'https://example.com/not-mapillary'
},{snapshot:'x',license:{}}),/Mapillary source page/);

console.log('PASS michiyomi scout contract: coverage-first args, provenance and source-page preservation');
