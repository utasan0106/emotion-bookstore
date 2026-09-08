'use strict';
// Route/content contract: not an assertion that providers played a video.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {items, commonVideos} = require('../tools/city-discovery-source');
const decode = s => s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
assert.equal(items.length,60);
assert.equal(new Set(items.map(i=>i.city+'/'+i.id)).size,60);
assert.equal(new Set(items.filter(i=>i.videoId).map(i=>i.videoId)).size,20);
assert.equal(commonVideos.length,5);
assert.equal(new Set(commonVideos.map(i=>i.id)).size,5);
assert.equal(new Set([...items.filter(i=>i.videoId),...commonVideos].map(i=>i.videoId)).size,25);
const cities=['koenji','shimokitazawa','kichijoji','jinbocho'];
for(const city of cities)for(const kind of ['video','book','film']) {
  const selected=items.filter(i=>i.city===city&&i.kind===kind);
  assert.equal(selected.length,5);
  const html=fs.readFileSync(path.join(root,`discover/${city}/${kind}.html`),'utf8');
  for(const i of selected)assert.equal(html.split(`href="/discover/${city}/${i.id}.html"`).length-1,1);
  assert.equal((html.match(/class="work-card /g)||[]).length,5);
  assert.doesNotMatch(html,/<iframe|<script|data-video-id/);
  assert.match(html,/aria-current="page"/);
}
let pages=0;
function inspect(dir) {
  for(const file of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,file.name);
    if(file.isDirectory()){inspect(full);continue;}
    if(!file.name.endsWith('.html'))continue;
    pages++;
    const html=fs.readFileSync(full,'utf8');
    assert.equal((html.match(/<h1\b/g)||[]).length,1,full);
    assert.doesNotMatch(html,/<iframe|<img[^>]+src="https?:|preconnect|rel="preload"|autoplay|googletagmanager|analytics-v3/);
    for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url=new URL(decode(m[1]),'https://local.test/'+path.relative(root,full));
      if(url.origin!=='https://local.test'){assert.equal(url.protocol,'https:');continue;}
      let target=path.join(root,decodeURIComponent(url.pathname));
      if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
      assert.ok(fs.existsSync(target),`${full} has missing destination ${m[1]}`);
      if(url.hash)assert.ok(fs.readFileSync(target,'utf8').includes(`id="${url.hash.slice(1)}"`),`${full}: invalid fragment`);
    }
  }
}
inspect(path.join(root,'discover'));
assert.equal(pages,79);
for(const i of items) {
  assert.ok(i.sources.length && i.relation && i.relationNote);
  assert.equal(i.playbackChecked,false,'Never equate indexed media with tested playback');
  const html=fs.readFileSync(path.join(root,`discover/${i.city}/${i.id}.html`),'utf8');
  const links=[...html.matchAll(/href="([^"]+)"/g)].map(m=>decode(m[1]));
  assert.equal(new Set(links).size,links.length,`${i.id}: duplicate destination on detail page`);
  assert.ok(html.indexOf('class="destination"')<html.indexOf('class="background"'),'Experience must precede background');
  if(i.videoId){
    assert.match(i.videoId,/^[A-Za-z0-9_-]{11}$/);
    assert.equal(new URL(i.url).searchParams.get('v'),i.videoId,'Fallback must be the identical clip');
    assert.match(html,/class="v3-video-load primary" type="button" hidden/,'No inert no-JS button');
    assert.match(html,/<script src="\/video-embed.js" defer><\/script><script src="\/discover\/player.js" defer>/);
  }
}
for(const i of commonVideos) {
  assert.equal(i.playbackChecked,false,'Search availability is not tested playback');
  assert.match(i.videoId,/^[A-Za-z0-9_-]{11}$/);
  assert.equal(new URL(i.url).searchParams.get('v'),i.videoId);
  const html=fs.readFileSync(path.join(root,`discover/short-films/${i.id}.html`),'utf8');
  assert.match(html,/このサイトで紹介する理由・出典/);
  assert.match(html,/class="v3-video-load primary" type="button" hidden/);
}
for(const file of ['index.html','works.html'])assert.equal(fs.readFileSync(path.join(root,file),'utf8').split('href="./discover/index.html"').length-1,1);
assert.match(fs.readFileSync(path.join(root,'.vercelignore'),'utf8'),/^\/tools\/city-discovery-source.js$/m);
assert.ok(!fs.readFileSync(path.join(root,'.vercelignore'),'utf8').includes('/discover/'));
console.log('PASS 60 city entries + 5 common shorts, 12 bounded lists, 79 routes, unique detail exits, local assets, honest media types');
