'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const files=require('../tools/build-design-redesign');
for(const file of files){
 const html=fs.readFileSync(file,'utf8');
 assert.equal((html.match(/href="\/design-redesign.css"/g)||[]).length,1,file+' stylesheet count');
 assert.match(html,/<body[^>]*class="[^"]*\bdesign-redesign\b/,file+' scoped theme');
 const once=require('../tools/design-redesign')(file.replace(/^discover\//,''),html);
 assert.equal(require('../tools/design-redesign')(file.replace(/^discover\//,''),once),once,file+' idempotence');
 const base=cp.execFileSync('git',['show','2f4a156:'+file],{encoding:'utf8'});
 // All original links and content remain available; only wrappers/classes/styles change.
 // Official players are click-to-load: the provider URL now rides on data-embed-src
 // instead of src, so it still has to be there. The loader itself is not a destination.
 // A click-to-load YouTube player carries its id; it still resolves to the same
 // provider target the page used to embed directly, so compare it in that form.
 const expand=s=>s.replace(/data-video-id="([A-Za-z0-9_-]{11})"/g,(_m,id)=>'data-embed-src="https://www.youtube-nocookie.com/embed/'+id+'?autoplay=0&amp;playsinline=1&amp;rel=0"');
 const links=s=>[...expand(s).matchAll(/(?:href|src|data-embed-src)="([^"]+)"/g)].map(m=>m[1]).filter(v=>!v.endsWith('.css')&&v!=='/assets/brand/emotion-bookstore-lockup-reversed.png'&&!/(?:^|\/)(?:video-embed|player)\.js$/.test(v)).sort();
 assert.deepEqual(links(html),links(base),file+' original destinations');
 // Everything the reader had must still be there. The only addition allowed is the
 // click-to-load affordance itself: its button and the sentence explaining it.
 const text=s=>s.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g,'')
  .replace(/<button class="v3-video-load[^"]*"[^>]*>[\s\S]*?<\/button>/g,'')
  .replace(/<(span|p) class="official-media-note">[\s\S]*?<\/\1>/g,'')
  .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 assert.equal(text(html),text(base),file+' original content');
}
for(const file of ['release.js','release_content.js','release.css','analytics-v3.js','memory-note.js','vercel.json','api/tokyo-weather.js']){
 assert.equal(fs.readFileSync(file,'utf8'),cp.execFileSync('git',['show','2f4a156:'+file],{encoding:'utf8'}),file+' protected contract');
}
console.log('PASS '+files.length+' pages: theme, idempotence, content/destination preservation; protected runtime unchanged');
