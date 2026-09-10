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
 const links=s=>[...s.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]).filter(v=>!v.endsWith('.css')&&v!=='/assets/brand/emotion-bookstore-lockup-reversed.png').sort();
 assert.deepEqual(links(html),links(base),file+' original destinations');
 const text=s=>s.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 assert.equal(text(html),text(base),file+' original content');
}
for(const file of ['release.js','release_content.js','release.css','analytics-v3.js','memory-note.js','vercel.json','api/tokyo-weather.js']){
 assert.equal(fs.readFileSync(file,'utf8'),cp.execFileSync('git',['show','2f4a156:'+file],{encoding:'utf8'}),file+' protected contract');
}
console.log('PASS '+files.length+' pages: theme, idempotence, content/destination preservation; protected runtime unchanged');
