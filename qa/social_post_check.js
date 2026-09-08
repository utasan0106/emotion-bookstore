'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const posts=require('../tools/social-posts-source');
const chrome=require('../tools/page-chrome');
assert.equal(new Set(posts.map(p=>p.path)).size,posts.length,'At most one curated post per page');
for(const p of posts){
 assert.match(p.url,/^https:\/\/bsky\.app\/profile\/[^/]+\/post\/[a-z2-7]+$/);
 assert.ok(p.reason&&p.checkedOn&&p.reviewThrough&&p.author);
 const html=fs.readFileSync(path.join(__dirname,'..',p.path),'utf8');
 assert.ok(html.includes('data-social-post'));
 assert.doesNotMatch(html,/<iframe/,'No initial Bluesky iframe');
 assert.equal((html.match(/data-social-post=/g)||[]).length,1);
 assert.equal(chrome(html),html,'No duplicate windows');
}
assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),/data-social-post|embed\.bsky/);
const js=fs.readFileSync(path.join(__dirname,'../social-post.js'),'utf8');
assert.doesNotMatch(js,/fetch\(|localStorage|gtag|setInterval|memory-text/);
assert.ok(js.includes('reviewThrough')&&js.includes('pagehide'));
console.log('PASS one curated public post, explicit loading, close, expiry, no keyword stream or memory transfer');
