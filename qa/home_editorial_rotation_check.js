'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const home=fs.readFileSync('index.html','utf8'), sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('release_content.js','utf8'),sandbox);
const content=sandbox.window.V3_RELEASE_CONTENT,edition=content.weeklyEdition;
const weeks=JSON.parse(fs.readFileSync('tools/weekly-home-ledger.json','utf8')).weeks.slice().sort((a,b)=>a.weekOf.localeCompare(b.weekOf));
const ledger=weeks.at(-1),previous=weeks.at(-2);
const source=require('../tools/city-discovery-source');
assert.deepEqual(JSON.parse(JSON.stringify(edition)),ledger,'Latest recorded edition equals runtime edition');
assert.ok(previous,'Rotation requires a previous edition, not only a timestamp');
assert.notEqual(edition.topFeatureId,previous.topFeatureId,'The lead work genuinely changes');
assert.ok(edition.curiosityIds.some(id=>!previous.curiosityIds.includes(id)),'At least one genuinely different curiosity item');
assert.notDeepEqual(Array.from(edition.curiosityKinds),previous.curiosityKinds,'The curiosity kind mix genuinely changes');
assert.deepEqual(Array.from(edition.shortVideoIds),source.commonVideos.map(v=>v.id));
assert.equal(source.commonVideosWeekOf,edition.weekOf);
const changedShorts=edition.shortVideoIds.filter(id=>!previous.shortVideoIds.includes(id));
assert.ok(changedShorts.length,'At least one genuinely changed short, not only a new date');
assert.ok(changedShorts.some(id=>home.includes('data-weekly-short-video="'+id+'"')),'Home identifies an actual changed short');
assert.ok(home.includes('data-weekly-feature="'+edition.topFeatureId+'"'));
assert.ok(home.includes('data-weekly-edition="'+edition.weekOf+'"'));
const catalogue=source.items.map(item=>({...item,detail:'/discover/'+item.city+'/'+item.id+'.html'}));
for(const shelf of content.shelves) for(const item of shelf.objects) {
 if(item.expiresAt&&Date.parse(item.expiresAt)<=Date.parse(edition.weekOf+'T00:00:00+09:00'))continue;
 if(!catalogue.some(x=>x.id===item.id))catalogue.push({...item,title:item.objectName,detail:'/discover/'+shelf.id+'/'});
}
for(const id of [edition.topFeatureId,...edition.curiosityIds]){
 const item=catalogue.find(x=>x.id===id);
 assert.ok(item,'Featured work must already be publishable: '+id);
 assert.ok(home.includes(item.hook),'Use existing published editorial copy: '+id);
 assert.ok(home.includes(item.detail),'Work links to its existing published detail or city collection: '+id);
}
for(const id of edition.curiosityIds)assert.equal((home.match(new RegExp('data-weekly-item-id="'+id+'"','g'))||[]).length,1);
assert.equal(edition.curiosityIds.length,3);assert.equal(new Set(edition.curiosityIds).size,3);
assert.equal(source.commonVideos.length,3);assert.equal(new Set(source.commonVideos.map(x=>x.id)).size,3);
assert.ok(source.commonVideos.every(x=>x.durationSeconds>0&&x.durationSeconds<=180));
const title=home.match(/<h2 id="hd-feature-title"[^>]*>([\s\S]*?)<\/h2>/)[1];
const phrases=[...title.matchAll(/<span class="hd-title-phrase">([^<]+)<\/span>/g)].map(x=>x[1]);
assert.ok(phrases.length>=2,'Lead title uses meaningful phrase spans');
assert.ok(phrases.every(x=>x.trim()===x&&!x.includes('&nbsp;')),'No artificial whitespace or character-breaking tricks');
const normalize=s=>s.replace(/&amp;/g,'&').replace(/[\s\u3000]/g,'');
assert.equal(normalize(phrases.join('')),normalize(catalogue.find(x=>x.id===edition.topFeatureId).title),'Phrase spans preserve the selected work title');
const feature=home.match(/<section class="hd-feature"[\s\S]*?<\/section>/)[0];
for(const photo of feature.matchAll(/<figure[^>]*>[\s\S]*?<\/figure>/g))if(/src="\/assets\/city-/.test(photo[0])){
 assert.match(photo[0],/<figcaption>[\s\S]*(?:通り|街|庭園|公園|風景)[\s\S]*<\/figcaption>/,'Context photograph names its subject, never masquerades as a book cover');
 assert.match(photo[0],/credits\.html/,'Context photograph has provenance');
}
// Book-cover features must use the exact source-catalogue edition, with intact media and attribution.
if(feature.includes('hd-editorial-book-cover')){
 const item=catalogue.find(x=>x.id===edition.topFeatureId);
 const cover=require('../tools/work-cover-source.json')[item.city+'/'+item.id];
 assert.equal(cover.status,'usable');
 assert.ok(feature.includes('src="'+cover.imageUrl+'"'));
 assert.ok(feature.includes(item.creator));assert.ok(feature.includes(item.url));
 assert.ok(feature.includes(cover.sourceUrl));
 assert.ok(feature.includes('width="'+cover.width+'" height="'+cover.height+'"'));
 assert.ok(fs.existsSync('.'+cover.imageUrl),'Exact same-origin cover exists');
 assert.match(feature,/<figcaption>[\s\S]+<\/figcaption>/);
}
// Optional release snapshot only. Recurring verify-product runs never freeze a week or work ID.
if(process.argv.includes('--snapshot-20261019')){
 assert.equal(edition.weekOf,'2026-10-19');assert.equal(edition.topFeatureId,'honnoniwa');
 assert.deepEqual(Array.from(edition.curiosityIds),['jirokichi','baus','kaho-asa']);
 assert.deepEqual(Array.from(edition.shortVideoIds),['tefu-1500','find-my-tokyo-akasaka','musashino-green']);
 assert.ok(feature.includes('/assets/book-covers/9784867168523.jpg'));
}
console.log('PASS ledger-driven homepage rotation: real selection/mix change, exact source copy/routes, semantic title, honest photo context, <=180s shorts');
