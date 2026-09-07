'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../v3-prototype/culture-experience-r2');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function records(file,name){const text=read(file).split('const '+name+' = Object.freeze(')[1].split('\n  });')[0];return vm.runInNewContext('('+text+'\n})');}
const music=read('shimokitazawa/index.html'),film=read('kichijoji/index.html');
const recordings=records('shimokitazawa/room.js','recordings'),scenes=records('kichijoji/screen.js','scenes');
const labels=[...music.matchAll(/<small>([^<]+)<\/small>/g)].map(m=>m[1]);
function list(items,isMusic){return '<ol>'+Object.values(items).map((x,i)=>'<li><h2>'+esc(isMusic?x.kind:x.label)+'</h2>'+(isMusic?'<p>'+esc(labels[i])+'</p><p>'+esc(x.artist)+'</p>':'')+'<p>'+esc(x.note)+'</p><a href="'+esc(x.href)+'" target="_blank" rel="noopener noreferrer">'+esc(isMusic?'公式の曲ページで聴く ↗':x.exit)+'</a></li>').join('')+'</ol>';}
function shell(title,body){return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>'+title+'</title><link rel="stylesheet" href="links.css"></head><body><main><h1 id="listening">'+title+'</h1>'+body+'</main></body></html>\n';}
const output={
'music.html':shell('夕暮れのジャイロ / Time to Go',music.match(/<p class="intro">[\s\S]*?<\/p>/)[0]+list(recordings,true)+music.match(/<p class="listening-question">[\s\S]*?<\/details>/)[0]+music.match(/<figure class="place">[\s\S]*?<\/figure>/)[0]+music.match(/<section class="return"[\s\S]*?<\/section>/)[0]),
'film.html':shell('PARKS パークス',film.match(/<p class="intro">[\s\S]*?<\/p>/)[0]+'<div id="watch">'+list(scenes,false)+'</div>'+film.slice(film.indexOf('<section class="questions"'),film.indexOf('    <footer>')).replaceAll('data-scene-target="film" ','').replaceAll('data-scene-target="park" ','') )};
fs.mkdirSync(path.join(root,'link-list'),{recursive:true});
for(const [name,content] of Object.entries(output)){const file=path.join(root,'link-list',name);if(process.argv.includes('--check')){if(read('link-list/'+name)!==content)throw Error('Control drift: '+name);}else fs.writeFileSync(file,content);}
console.log('PASS: matched control media, explanation, source and official exits');
