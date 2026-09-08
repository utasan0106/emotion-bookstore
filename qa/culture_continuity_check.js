'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
assert.match(read('index.html'),/href="\/discover\/short-films\/"/);
for(const city of ['koenji','kichijoji','shimokitazawa','jinbocho']){
  for(const kind of ['audio','video','book','film']){
    const html=read('discover/'+city+'/'+kind+'.html');
    assert.doesNotMatch(html,/この街を、もう少し深く|tsogen.co.jp\/sp\/author\/214/);
    assert.match(html,/href="\/discover\/short-films\/"/);
    const feature=html.match(/<aside class="feature">[\s\S]*?<\/aside>/)[0];
    assert.ok(feature.includes(kind==='video'?'/shelf.html?shelf='+city:'/discover/'+city+'/video.html'));
  }
  assert.match(read('discover/'+city+'/index.html'),/href="\/discover\/short-films\/"/);
}
const profiles=require('../tools/artist-profiles');
const items=require('../tools/city-discovery-source').items;
for(const [id,p] of Object.entries(profiles)){
  const item=items.find(i=>i.id===id);
  assert.ok(item);
  assert.ok(p.text&&p.name&&p.checkedAt&&new URL(p.url).protocol==='https:');
  assert.ok(read('discover/'+item.city+'/'+id+'.html').includes(p.url));
}
assert.ok(!read('discover/koenji/big-the-grape.html').includes('artist-profile'));
console.log('PASS restored short-film entry points, 16 contextual next steps, 4 sourced profile placements, unknown profile omitted');
