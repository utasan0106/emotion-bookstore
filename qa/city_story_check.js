'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),stories=require('../tools/city-stories');
for(const story of stories){
 const url=`/discover/essays/${story.id}.html`,html=fs.readFileSync(path.join(root,url),'utf8');
 for(const entry of ['discover/essays/index.html',`discover/${story.city}/index.html`])assert.ok(fs.readFileSync(path.join(root,entry),'utf8').includes(url),'Reachable from '+entry);
 assert.ok(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes(url));
 assert.ok(html.includes(`rel="canonical" href="https://emotionbookstore.com${url}"`));
 assert.match(html,/<meta property="og:type" content="article">/);
 assert.match(html,/読了目安 3分/);assert.match(html,/現在のクリープハイプの出演予定を示すものではありません/);
 assert.match(html,/本人・関係団体による監修や公認を受けた記事ではありません/);
 const article=html.match(/<article[\s\S]*?<\/article>/)[0];
 assert.doesNotMatch(article,/<img|<iframe|<video|<audio/,'No artist or venue media');
 for(const s of story.sources)assert.ok(article.includes(s.url.replace(/&/g,'&amp;')));
 for(const m of html.matchAll(/href="(\/[^"]+)"/g)){
  const u=new URL(m[1],'https://emotionbookstore.com');let local=path.join(root,u.pathname);
  if(u.pathname.endsWith('/'))local=path.join(local,'index.html');
  assert.ok(fs.existsSync(local),'Local link exists: '+m[1]);
 }
 for(const id of ['research-reading','venue-action','research-sources'])assert.ok(html.includes(`href="#${id}"`)&&html.includes(`id="${id}"`));
 for(const exit of [`/discover/${story.city}/audio.html`,`/outings/?city=${story.city}`,`/discover/${story.city}/`])assert.ok(article.includes(`href="${exit}"`));
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const schema=schemas.find(s=>s['@type']==='Article');assert.equal(schema.datePublished,story.publishedAt);assert.equal(schema.citation.length,4);
}
console.log('PASS culture stories: source-backed text, historical/current separation, discoverability, official exits, metadata and internal links');
