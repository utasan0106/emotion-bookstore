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
 assert.ok(html.includes(`data-editorial-city="${city}"`),'City theme follows selected city');
 if(html.includes('class="other-cities"'))assert.ok(html.indexOf('class="other-cities"')>html.indexOf('class="work-grid"'),'Show selected city before alternatives');
}
for(const essay of require('../tools/city-research')){
 const html=read(`discover/essays/${essay.id}.html`);
 assert.equal(essay.summary.length,3,'Three editorial summary points');
 assert.ok(essay.methodology.includes('公開資料'),'Explain actual reporting basis');
 assert.ok(html.includes(essay.methodology),'Methodology remains visible');
 assert.ok(!html.slice(html.indexOf('id="research-reading"'),html.indexOf('id="research-timeline"')).includes('独自取材も行っていない'),'Avoid process disclaimers in narrative');
 assert.ok(essay.summary.every(p=>typeof p==='string'&&p.length<=90),'Keep summary scannable');
 assert.equal((html.match(/class="article-summary"/g)||[]).length,1);
 assert.ok(html.indexOf('class="article-summary"')<html.indexOf('class="research-toc"'),'Summary before reading choices');
 for(const point of essay.summary)assert.ok(html.includes(point),'Summary is rendered without JavaScript');
 const toc=html.match(/<nav class="research-toc"[^>]*>(.*?)<\/nav>/s)[1];
 assert.ok(toc.indexOf('#research-timeline')<toc.indexOf('#research-comparison'),'TOC follows article order');
 assert.ok(html.indexOf('id="research-reading"')<html.indexOf('id="research-timeline"'));
 assert.ok(html.indexOf('id="research-reading"')<html.indexOf('id="research-comparison"'));
 for(const section of essay.sections){assert.ok((section.paragraphs||[section.text]).every(p=>typeof p==='string'&&p.length>0));}
 for(const link of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${link[1]}"`),`Missing article anchor ${link[1]}`);
}
const hub=read('discover/essays/index.html');
const css=read('site-system.css');
for(const city of cities){
 const hex=css.match(new RegExp('data-editorial-city="'+city+'"\\]\\{--city-accent:(#[0-9a-f]{6})'))?.[1];
 assert.ok(hex,'Every city has an explicit accent');
 const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const contrast=1.05/(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]+.05);
 assert.ok(contrast>=4.5,`${city}: text contrast on white ${contrast}`);
}
for(const city of cities){assert.ok(hub.includes(`/discover/${city}/#editorials-title`));assert.ok(read(`discover/${city}/index.html`).includes('id="editorials-title"'));}
console.log('PASS stable navigation, city-first results, article order and source anchors');
