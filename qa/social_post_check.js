'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const posts=require('../tools/social-posts-source');
const chrome=require('../tools/page-chrome');
const events=require('../tools/weekly-outings-source'),week=require('../outings/week');
const root=path.join(__dirname,'..'),today=week.date(Date.now());
const redirects=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).redirects||[];
assert.equal(new Set(posts.map(p=>p.path)).size,posts.length,'At most one curated post per page');
for(const p of posts){
 assert.match(p.url,/^https:\/\/bsky\.app\/profile\/[^/]+\/post\/[a-z2-7]+$/);
 assert.ok(p.reason&&p.checkedOn&&p.reviewThrough&&p.author);
 const file=path.join(root,p.path);
 if(!fs.existsSync(file)){
  const id=(p.path.match(/^\/outings\/events\/([^/]+)\.html$/)||[])[1];
  const event=events.events.find(e=>e.id===id);
  const active=event&&events.isPublishableEvent(event)&&event.status==='scheduled'&&event.checkedAt<=today&&event.reviewThrough>=today&&week.dates(event).at(-1)>=today;
  assert.ok(id&&event,'Missing social-post page must belong to a known dated event: '+p.path);
  assert.equal(active,false,'Active social-post target must keep its detail: '+p.path);
  assert.ok(p.reviewThrough<today,'Retired detail must not hide a still-current curated post: '+p.path);
  assert.deepEqual(redirects.find(r=>r.source===p.path),{source:p.path,destination:'/outings/',permanent:false},'Retired social-post URL needs the exact safe redirect: '+p.path);
  continue;
 }
 const html=fs.readFileSync(file,'utf8');
 assert.ok(html.includes('data-social-post'));
 assert.doesNotMatch(html,/<iframe/,'No initial Bluesky iframe');
 assert.equal((html.match(/data-social-post=/g)||[]).length,1);
 assert.equal(chrome(html),html,'No duplicate windows');
}
assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),/data-social-post|embed\.bsky/);
const js=fs.readFileSync(path.join(__dirname,'../social-post.js'),'utf8');
assert.doesNotMatch(js,/fetch\(|localStorage|gtag|setInterval|memory-text/);
assert.ok(js.includes('reviewThrough')&&js.includes('pagehide'));
console.log('PASS curated public posts or verified retired targets, explicit loading, close, expiry, no keyword stream or memory transfer');
