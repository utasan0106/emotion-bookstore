'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const samples=['index.html','works.html','saved.html','outings/index.html','discover/index.html','discover/essays/index.html'];
const cities=['kichijoji','koenji','shimokitazawa','jinbocho'];
const expected=[['/discover/','街から探す'],['/works.html','作品を探す'],['/outings/','催しを探す'],['/discover/essays/','街の記事']];
for(const city of cities)for(const file of ['index','audio','video','book','film'])samples.push(`discover/${city}/${file}.html`);
for(const file of samples){
 const html=read(file),navs=[...html.matchAll(/<nav class="site-sections"[^>]*>(.*?)<\/nav>/gs)];
 assert.equal(navs.length,1,`One shared navigation: ${file}`);
 for(const [href,label] of expected){
  assert.ok(navs[0][1].includes(`href="${href}"`),`${file}: ${href}`);
  assert.ok(navs[0][1].includes(`>${label}</a>`),`${file}: ${label}`);
  assert.ok(fs.existsSync(path.join(root,href.endsWith('/')?href+'index.html':href)));
 }
}
const home=read('discover/index.html');
assert.ok(home.indexOf('class="city-grid"')<home.indexOf('class="watch-now"'),'City selection precedes recommendations');
for(const city of cities)for(const kind of ['audio','video','book','film']){
 const html=read(`discover/${city}/${kind}.html`);
 if(html.includes('class="other-cities"'))assert.ok(html.indexOf('class="other-cities"')>html.indexOf('class="work-grid"'),'Show selected city before alternatives');
}
for(const essay of require('../tools/city-research')){
 const html=read(`discover/essays/${essay.id}.html`);
 assert.ok(html.indexOf('id="research-reading"')<html.indexOf('id="research-timeline"'));
 assert.ok(html.indexOf('id="research-reading"')<html.indexOf('id="research-comparison"'));
 for(const section of essay.sections){assert.ok((section.paragraphs||[section.text]).every(p=>typeof p==='string'&&p.length>0));}
 for(const link of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${link[1]}"`),`Missing article anchor ${link[1]}`);
}
const hub=read('discover/essays/index.html');
for(const city of cities){assert.ok(hub.includes(`/discover/${city}/#editorials-title`));assert.ok(read(`discover/${city}/index.html`).includes('id="editorials-title"'));}
console.log('PASS stable navigation, city-first results, article order and source anchors');
