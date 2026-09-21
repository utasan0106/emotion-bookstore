'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const roots=['index.html','shelf.html','works.html','work-book.html','work-film.html','work-music.html','work-video.html','credits.html','data.html','suggest.html','discover','outings'];
const files=[];
function walk(rel){
  const full=path.join(root,rel);
  if(!fs.existsSync(full))return;
  const st=fs.statSync(full);
  if(st.isDirectory()){for(const name of fs.readdirSync(full))walk(path.join(rel,name));return;}
  if(rel.endsWith('.html'))files.push(rel);
}
roots.forEach(walk);
let imageCount=0,externalCount=0;
for(const rel of files){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  for(const match of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)){
    imageCount++; const tag=match[0],src=match[1];
    if(/^https?:\/\//.test(src)){
      externalCount++;
      assert.ok(html.includes('/page-nav.js')||html.includes('./page-nav.js'),'external image needs global failure guard: '+rel);
      if(/Kiyosumi_Teien/.test(src)){
        assert.match(src,/\/640px-Kiyosumi_Teien_-_Japanese_gardern_4\.JPG$/,'Kiyosumi must use the reviewed Commons preview');
        assert.match(tag,/data-image-fallback="\/assets\/city-kiyosumi\.svg"/,'Kiyosumi external photo needs same-origin fallback');
      }
      continue;
    }
    if(/^data:/.test(src))continue;
    const clean=src.split(/[?#]/)[0];
    let target;
    if(clean.startsWith('/'))target=path.join(root,clean.slice(1));
    else if(clean.startsWith('./'))target=path.join(root,clean.slice(2));
    else target=path.resolve(path.dirname(path.join(root,rel)),clean);
    assert.ok(fs.existsSync(target),'missing local image '+src+' in '+rel);
  }
}
const nav=fs.readFileSync(path.join(root,'page-nav.js'),'utf8');
assert.match(nav,/addEventListener\('error'/);
assert.match(nav,/media-unavailable/);
assert.match(nav,/dataset\.imageFallback/);
const release=fs.readFileSync(path.join(root,'release_content.js'),'utf8');
assert.match(release,/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/d\/d2\/Kiyosumi_Teien/);
assert.match(release,/640px-Kiyosumi_Teien_-_Japanese_gardern_4\.JPG/);
console.log('PASS media image integrity: '+imageCount+' img tags, '+externalCount+' external images, local existence + fallback contracts');
