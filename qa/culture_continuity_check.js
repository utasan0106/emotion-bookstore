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
for(const city of ['koenji','kichijoji']) {
  const html=read('discover/'+city+'/book.html');
  assert.doesNotMatch(html,/本で触れた街を/);
  assert.match(html,/同じ街から探す/);
  const redirects=JSON.parse(read('vercel.json')).redirects;
  for(const item of require('../tools/city-discovery-source').excludedItems.filter(i=>i.city===city&&i.kind==='book')) {
    assert.equal(redirects.find(r=>r.source===`/discover/${city}/${item.id}.html`).destination,`/discover/${city}/`);
  }
}
for(const item of items) {
  const html=read('discover/'+item.city+'/'+item.id+'.html');
  const article=html.match(/<article class="detail">[\s\S]*?<\/article>/)[0];
  assert.ok(article.includes('/discover/'+item.city+'/'+item.kind+'.html'),'End of detail must offer re-selection: '+item.id);
}
for(const [from,to] of [['yoshida-night-edge','yoshida-tinderness'],['yoshida-tinderness','yoshida-night-edge']]){
  const html=read('discover/kichijoji/'+from+'.html');
  assert.ok(html.includes('/discover/kichijoji/'+to+'.html'));
  assert.match(html,/同じ人の、別の演奏/);
}
for(const [id,p] of Object.entries(profiles)){
  const item=items.find(i=>i.id===id);
  assert.ok(item);
  assert.ok(item.creator.includes(p.name)||item.title.includes(p.name), id+': profile identity must match credited artist or named interview subject');
  assert.match(p.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(p.text&&p.name&&p.checkedAt&&new URL(p.url).protocol==='https:');
  assert.ok(read('discover/'+item.city+'/'+id+'.html').includes(p.url));
}
assert.ok(!read('discover/koenji/big-the-grape.html').includes('artist-profile'));
console.log('PASS restored short-film entry points, 16 contextual next steps, '+Object.keys(profiles).length+' sourced profile placements, unknown profile omitted');
