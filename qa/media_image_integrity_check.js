'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const roots=['index.html','shelf.html','works.html','work-book.html','work-film.html','work-music.html','work-video.html','credits.html','data.html','suggest.html','discover','outings'];
const files=[];
function walk(rel){
  const full=path.join(root,rel);
  if(!fs.existsSync(full)) return;
  const st=fs.statSync(full);
  if(st.isDirectory()){for(const name of fs.readdirSync(full)) walk(path.join(rel,name));return;}
  if(rel.endsWith('.html')) files.push(rel);
}
roots.forEach(walk);
function localTarget(rel,src){
  const clean=src.split(/[?#]/)[0];
  if(clean.startsWith('/')) return path.join(root,clean.slice(1));
  if(clean.startsWith('./')) return path.join(root,clean.slice(2));
  return path.resolve(path.dirname(path.join(root,rel)),clean);
}
let images=0,external=0;
for(const rel of files){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  const guarded=html.includes('/page-nav.js')||html.includes('./page-nav.js');
  for(const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)){
    images++; const tag=m[0],src=m[1];
    if(/^https?:\/\//.test(src)){
      external++;
      assert.ok(guarded||/data-image-fallback=/.test(tag),rel+': external img needs global error guard or explicit fallback: '+src);
      continue;
    }
    if(/^data:/.test(src)) continue;
    assert.ok(fs.existsSync(localTarget(rel,src)),rel+': missing local image '+src);
  }
  for(const m of html.matchAll(/<meta\b[^>]*(?:property|name)="(?:og:image|twitter:image)"[^>]*content="([^"]+)"/gi)){
    const src=m[1];
    if(src.startsWith('https://emotionbookstore.com/')){
      const local='/'+src.slice('https://emotionbookstore.com/'.length);
      assert.ok(fs.existsSync(localTarget(rel,local)),rel+': missing same-origin social image '+src);
    }
  }
}
const kiy=fs.readFileSync(path.join(root,'discover/kiyosumi/index.html'),'utf8');
assert.ok(/data-image-fallback="\/assets\/city-kiyosumi\.svg"/.test(kiy),'Kiyosumi external photo needs same-origin fallback');
const nav=fs.readFileSync(path.join(root,'page-nav.js'),'utf8');
assert.match(nav,/addEventListener\('error'/);
assert.match(nav,/dataset\.imageFallback/);
console.log('PASS media image integrity: '+images+' img tags checked; '+external+' external images guarded');
