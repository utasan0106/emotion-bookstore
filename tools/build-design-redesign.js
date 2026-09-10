'use strict';
// Public serving surfaces only. Archives, experiments and QA baselines stay frozen.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=['index.html','works.html','work-book.html','work-film.html','work-music.html','work-video.html','shelf.html','thread.html','explore.html','suggest.html','data.html','credits.html','saved.html','about.html','visit/index.html',...['index.html','kichijoji/index.html','shimokitazawa/index.html','link-list/film.html','link-list/music.html'].map(f=>'v3-prototype/culture-experience-r2/'+f)];
for(const dir of ['discover','outings']) {
 const walk=rel=>{for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){const f=rel+'/'+e.name;if(e.isDirectory())walk(f);else if(f.endsWith('.html'))files.push(f);}};
 walk(dir);
}
module.exports=files;
if(require.main===module){
 for(const file of files){
  const p=path.join(root,file),before=fs.readFileSync(p,'utf8');
  let after=require('./design-redesign')(file.replace(/^discover\//,''),before);
  if(file.startsWith('v3-prototype/culture-experience-r2/')) after=after.replace('class="design-redesign"','class="design-redesign dr-experience"');
  if(file==='explore.html'){
   after=after.replace('class="design-redesign explore-page"','class="design-redesign explore-page site-polished"');
   if(!after.includes('href="/site-system.css"'))after=after.replace('<link rel="stylesheet" href="/design-redesign.css">','<link rel="stylesheet" href="/site-system.css"><link rel="stylesheet" href="/design-redesign.css">');
  }
  if(!after.includes('href="/page-nav.css"'))after=after.replace('</head>','<link rel="stylesheet" href="/page-nav.css"></head>');
  if(process.argv.includes('--check')){if(before!==after)throw Error('Design generation drift: '+file);}
  else if(before!==after)fs.writeFileSync(p,after);
 }
 console.log('PASS approved design on '+files.length+' public HTML pages'+(process.argv.includes('--check')?' (idempotent)':''));
}
