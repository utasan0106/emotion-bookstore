'use strict';
// Release inventory fixtures deliberately pin four represented collection cities
// and 15 verified places. Update these exact fixtures when approved inventory
// changes; arithmetic fixtures must continue rejecting hard-coded counts.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{}};vm.runInNewContext(read('release_content.js'),ctx);
const content=ctx.window.V3_RELEASE_CONTENT;
const expected=Array.from(content.shelves,s=>s.id).sort();
assert.equal(expected.length,5);
const pages=['credits.html','data.html','explore.html','shelf.html','suggest.html','thread.html','works.html','work-book.html','work-film.html','work-music.html'];
for(const file of [...pages,'tools/work-entry-source.html']){
 const html=read(file),nav=html.match(/<nav class="site-menu-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
 const ids=[...nav.matchAll(/data-menu-shelf="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids.slice().sort(),expected,file+' static five links');
 assert.equal(new Set(ids).size,5,file+' no duplicates');
 assert.match(html,/<h2 id="siteMenuTitle"[^>]*>5つの街<\/h2>/,file+' initial count');
 assert.match(nav,/data-menu-shelf="kiyosumi" href="\.\/shelf.html\?shelf=kiyosumi"/);
}
console.log('PASS static/no-JS source: 10 pages + work template contain five real shelf links');
const release=read('release.js');
const start=release.indexOf('  function syncCityMenuFromContent()');
const end=release.indexOf('  syncCityMenuFromContent();')+'  syncCityMenuFromContent();'.length;
const functionSource=release.slice(start,end);
const regex=vm.runInNewContext(release.match(/if \(title && (\/[^\n]*?\/)\.test/)[1]);
assert.equal(regex.test('4つの街'),true);assert.equal(regex.test('5つの街'),true);
assert.equal(regex.test('街から探す'),false);assert.equal(regex.test('\\ddddつの街'),false);
function runMenu(startIds,label,inventory=content){
 const ids=startIds.slice(),title={textContent:label};
 const nav={querySelector(s){const id=s.match(/="(.*?)"/)[1];return ids.includes(id)?{}:null;},appendChild(e){ids.push(e.attrs['data-menu-shelf']);}};
 const document={querySelector(s){return s==='.site-menu-nav'?nav:s==='#siteMenuTitle'?title:null;},createElement(){return {attrs:{},setAttribute(k,v){this.attrs[k]=v;},appendChild(){}};}};
 const sandbox={CONTENT:inventory,document};
 vm.runInNewContext(functionSource,sandbox);
 const once=JSON.stringify({ids,title:title.textContent});
 vm.runInNewContext(functionSource,sandbox);
 assert.equal(JSON.stringify({ids,title:title.textContent}),once,'second sync is idempotent');
 return {ids,title:title.textContent};
}
const oldIds=expected.filter(id=>id!=='kiyosumi');
for(const initial of [oldIds,expected]){
 const result=runMenu(initial,initial.length+'つの街');
 assert.deepEqual(result.ids.slice().sort(),expected);assert.equal(result.title,'5つの街');
}
assert.equal(runMenu(expected,'街から探す').title,'街から探す');
const expanded={shelves:[...content.shelves,{id:'future-fixture',area:'Fixture'}]};
assert.equal(runMenu(expected,'5つの街',expanded).title,'6つの街');
console.log('PASS exact runtime sync: legacy 4 → 5, initial 5 unchanged, repeated calls idempotent, future-count fixture 6');
const {items}=require(path.join(root,'tools/city-discovery-source'));
const build=read('tools/build-city-discovery.js');
const cityCount=list=>new Set(list.map(i=>i.city)).size;
const outingIds=vm.runInNewContext(build.match(/const outingVideoIds = (\[[\s\S]*?\]);/)[1]);
const series=[['outing',items.filter(i=>i.kind==='video'&&outingIds.includes(i.city+'/'+i.id)),'本'],['reading',items.filter(i=>i.kind==='book'),'冊'],['listening',items.filter(i=>i.kind==='audio'),'曲']];
for(const [slug,list,unit] of series){
 const html=read('discover/'+slug+'/index.html');
 assert.equal(cityCount(list),4);assert.ok(!list.some(i=>i.city==='kiyosumi'));
 assert.ok(html.includes(cityCount(list)+'つの街 / '+list.length+unit),slug+' real count');
 assert.equal((html.match(/<li>/g)||[]).length,list.length,slug+' rendered inventory');
}
const {verify}=require(path.join(root,'tools/places-source'));
const groups=verify(items),total=groups.reduce((n,g)=>n+g.works.length,0),cities=new Set(groups.flatMap(g=>g.works.map(k=>k.split('/')[0])));
assert.equal(total,15);assert.equal(cities.size,4);
assert.ok(read('discover/index.html').includes('場所そのものを扱った作品 '+total+'件'));
assert.ok(read('discover/places/index.html').includes(cities.size+'つの街をまたいで / '+total+'件'));
assert.equal((read('discover/places/index.html').match(/<li>/g)||[]).length,total);
assert.doesNotMatch(build,/4つの街|場所そのものを扱った作品 18件/);
assert.equal((build.match(/\$\{placeTotal\}/g)||[]).length,2,'overview and detail share count');
const calc=build.slice(build.indexOf("const {verify: verifyPlaces"),build.indexOf("const siteOgp="));
for(const keys of [['one/a','two/b'],['one/a','one/b','one/c','two/d','three/e']]){
 const fixture={require(){return {verify(){return [{works:keys}];},kinds:[]};},items:[]};
 vm.runInNewContext(calc+'; result={placeTotal,placeCityCount,cityCount:cityCount([{city:"a"},{city:"a"},{city:"b"}])};',fixture);
 assert.equal(fixture.result.placeTotal,keys.length);
 assert.equal(fixture.result.placeCityCount,new Set(keys.map(k=>k.split('/')[0])).size);
 assert.equal(fixture.result.cityCount,2);
}
console.log('PASS source/rendered counts: outing 5, reading 16, listening 20, places 15; all four-city inventories retained');
console.log('PASS inventory-count formulas respond to alternate fixtures; no numeric replacement disguised as calculation');
console.log('PASS city-count maintenance contract');
