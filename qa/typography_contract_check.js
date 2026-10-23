#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),redesign=require('../tools/design-redesign');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const homeHeading=home.match(/<h2 id="hd-feature-title"[^>]*>(.*?)<\/h2>/s)[1];
const currentEdition=require('../tools/weekly-home-ledger.json').weeks.at(-1);
const currentFeature=require('../tools/city-discovery-source').items.find(item=>item.id===currentEdition.topFeatureId);
assert.equal(homeHeading.replace(/<[^>]+>/g,'').replace(/\s/g,''),currentFeature.title.replace(/\s/g,''),'Current feature wording preserved');
assert.ok((homeHeading.match(/class="hd-title-phrase"/g)||[]).length>=2,'Future covers must retain editorial phrase boundaries');
assert.ok(!/<br|&nbsp;/.test(homeHeading),'No hard line breaks or nonbreaking-space layout hacks');
for(const file of ['essays/kichijoji-advertising.html','essays/shimokitazawa-railway.html']){
 const html=fs.readFileSync(path.join(root,'discover',file),'utf8'),title=html.match(/<h1>(.*?)<\/h1>/s)[1];
 const plain=title.replace(/<[^>]+>/g,'');
 assert.equal(plain,require('../tools/city-research').find(x=>file.endsWith(x.id+'.html')).title);
 assert.ok(title.includes('class="dr-title-phrase"'));
 assert.ok(!/<br|&nbsp;|\s<\/span>|<span[^>]*>\s/.test(title));
 assert.equal(redesign(file,html),html,'Generation transform is idempotent');
 assert.ok(html.includes('AIを資料探索・比較・文章化に使用'),'Retain methodology disclosure');
 assert.ok(!html.includes('AIで街を多角的に読む'),'Remove prominent AI promotion');
 assert.ok(!/<a[^>]+href="\/feed.xml"/.test(html),'No visible RSS CTA');
}
for(const [file,cls] of [['home-discovery.css','hd-title-phrase'],['design-redesign.css','dr-title-phrase']]){
 const css=fs.readFileSync(path.join(root,file),'utf8');
 assert.match(css,new RegExp('\\.'+cls+'\\{[^}]*max-width:100%'));
 assert.match(css,new RegExp('\\.'+cls+'\\{[^}]*overflow-wrap:anywhere'));
 assert.ok(!new RegExp('\\.'+cls+'\\{[^}]*white-space:nowrap').test(css));
}
console.log('PASS editorial title text preserved, idempotent generation, phrase wrap + zoom escape, AI disclosure preserved, no visible RSS CTA');
