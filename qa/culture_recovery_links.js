'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'v3-prototype/culture-experience-r2');
let count=0;
for(const file of ['index.html','shimokitazawa/index.html','kichijoji/index.html','link-list/music.html','link-list/film.html']){
 const full=path.join(base,file),html=fs.readFileSync(full,'utf8');assert.match(html,/noindex/);
 for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const raw=m[1];if(/^(https?:|#)/.test(raw))continue;
  const u=new URL(raw,'https://local.test/'+path.relative(root,full));let p=path.join(root,u.pathname);
  if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
  assert.ok(fs.existsSync(p),file+': '+raw);count++;
 }
 if(file.startsWith('link-list/'))assert.doesNotMatch(html,/<script|<iframe|<button/);
}
for(const [a,b] of [['culture-room-r1','shimokitazawa'],['parks-screen-r1','kichijoji']])for(const ext of ['js','css']){
 const name=a==='culture-room-r1'?'room':'screen';assert.equal(fs.readFileSync(path.join(root,'experiments',a,name+'.'+ext),'utf8'),fs.readFileSync(path.join(base,b,name+'.'+ext),'utf8'));
}
console.log('PASS '+count+' local references and runtime parity');
