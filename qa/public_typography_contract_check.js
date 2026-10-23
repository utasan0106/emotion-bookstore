'use strict';
// Source integrity, route opt-in and negative fixtures. No browser or network.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(read('tools/public-typography-routes.json'));
const source=JSON.parse(read('qa/public-typography-source.json'));
const transform=require('../tools/public-typography');
function stripBridge(html){
 return html.replace(/<link rel="stylesheet" href="\/public-typography\.css">/g,'')
  .replace(/(<body[^>]*class=")([^"]*)"/,(_,prefix,classes)=>prefix+classes.split(/\s+/).filter(c=>c!=='public-gothic').join(' ')+'"');
}
function validBridge(html,originalSha){return hash(stripBridge(html))===originalSha;}
function cssErrors(css){
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,''),errors=[];
 if((clean.match(/@font-face/g)||[]).length!==2)errors.push('Exactly two real font weights');
 if([...clean.matchAll(/font-weight\s*:\s*(\d+)/g)].some(m=>!['400','700'].includes(m[1])))errors.push('No fake medium or semibold');
 if(/font\s*:\s*(?:[^;{}]*?\s)?(?:100|200|300|500|600|800|900)\s/.test(clean))errors.push('No unsupported shorthand weight');
 if(!/font-synthesis\s*:\s*none/.test(clean))errors.push('No synthetic glyphs');
 if(!/body\.design-redesign\.site-polished\.public-gothic \.city-heading h1 span\{font-weight:700\}/.test(clean))errors.push('City heading child text must retain real 700');
 for(const block of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  const selector=block[1].trim();
  if(selector==='@font-face')continue;
  if(!selector.startsWith('body.design-redesign.site-polished.public-gothic'))errors.push('Unscoped rule: '+selector);
  for(const declaration of block[2].split(';').map(x=>x.trim()).filter(Boolean)){
   const prop=declaration.split(':')[0].trim();
   if(!(prop.startsWith('--')||/^(font(?:-[a-z-]+)?|line-height|line-break|letter-spacing|word-break|overflow-wrap|text-wrap)$/.test(prop)))errors.push('Non-typography property: '+prop);
  }
 }
 return errors;
}
assert.equal(manifest.routes.length,127,'Finite catalogue/city/article/event scope');
assert.equal(new Set(manifest.routes.map(r=>r.file)).size,127);
assert.equal(new Set(manifest.routes.map(r=>r.canonical_path)).size,127);
let tests=0;
for(const row of manifest.routes){
 const html=read(row.file);
 assert.ok(html.includes('href="https://emotionbookstore.com'+row.canonical_path+'"'),row.file+' canonical matches opt-in');
 assert.equal((html.match(/\bpublic-gothic\b/g)||[]).length,1,row.file+' one body opt-in');
 assert.equal((html.match(/href="\/public-typography\.css"/g)||[]).length,1,row.file+' one stylesheet');
 assert.ok(html.includes('<link rel="stylesheet" href="/public-typography.css"></head>'),row.file+' bridge stylesheet last');
 assert.ok(validBridge(html,source.route_html_sha256[row.file]),row.file+' exact original HTML apart from class and stylesheet');
 assert.equal(transform(html),html,row.file+' transform idempotent');
 tests+=6;
}
for(const [file,sha] of Object.entries(source.frozen_sha256)){
 assert.equal(hash(fs.readFileSync(path.join(root,file))),sha,file+' frozen content, assets, functionality or workflow');tests++;
}
const pins=JSON.parse(read('qa/editorial-c3-culture-source.json'));
assert.deepEqual(Object.keys(pins),Object.keys(source.prior_culture_pins));
for(const [file,oldSha] of Object.entries(source.prior_culture_pins)){
 if(['works.html','work-film.html'].includes(file))assert.equal(pins[file],hash(read(file)),file+' accurately repinned after typography-only wrapper change');
 else assert.equal(pins[file],oldSha,file+' unrelated C3 source pin unchanged');
 tests++;
}
const deep=JSON.parse(read('qa/editorial-c3-deep-source.json'));
const expectedDeep=structuredClone(source.prior_deep_source);
const junjo=expectedDeep.sources.find(row=>row.source==='discover/koenji/junjo.html');
assert.ok(junjo,'Expected one exact Junjo provenance pin');
junjo.source_sha256=hash(read(junjo.source));
assert.deepEqual(deep,expectedDeep,'Deep source changes only Junjo wrapper hash; other 3 sources and provenance unchanged');tests++;
const css=read('public-typography.css');assert.deepEqual(cssErrors(css),[]);tests++;
for(const weight of [400,700])assert.ok(css.includes(`font-weight:${weight};`)&&css.includes(`eb-public-gothic-${weight}.woff2`));
// Negative controls prove the contract detects content, CSS-scope and route drift.
const good=read('works.html'),sha=source.route_html_sha256['works.html'];
assert.equal(validBridge(good.replace('神保町の怪人','別の作品'),sha),false,'Reject body edits');
assert.equal(validBridge(good.replace('href="./work-book.html"','href="/wrong.html"'),sha),false,'Reject link edits');
assert.equal(validBridge(good.replace('emotion-bookstore-lockup-reversed.png','wrong.png'),sha),false,'Reject image edits');
assert.equal(validBridge(good.replace('<main','<main data-unapproved="yes"'),sha),false,'Reject unrelated structure edits');
assert.ok(cssErrors(css+'\nbody{font-weight:700}').length,'Reject global font rule');
assert.ok(cssErrors(css.replace('font-weight:700','font-weight:500')).length,'Reject fake weight');
assert.ok(cssErrors(css.replace('font:700','font:500')).length,'Reject fake shorthand weight');
assert.ok(cssErrors(css+'\nbody.design-redesign.site-polished.public-gothic{display:none}').length,'Reject layout/content hiding');
assert.ok(cssErrors(css.replace('font-synthesis:none','font-synthesis:weight')).length,'Reject synthetic weight');
assert.ok(cssErrors(css.replace('.city-heading h1 span{font-weight:700}', '.city-heading h1 span{font-weight:400}')).length,'Reject the legacy regular city heading child');
for(const file of ['index.html','discover/selection/index.html','visit/index.html','saved.html','atlas/index.html','qa/editorial-study-c3/index.html'])assert.equal(transform(read(file)),read(file),file+' explicitly unaffected');
const unknown='<html><head><link rel="canonical" href="https://emotionbookstore.com/unknown/"></head><body class="site-polished">x</body></html>';
assert.equal(transform(unknown),unknown,'Unknown future route is not silently opted in');
assert.equal(transform(unknown.replace('https://emotionbookstore.com/unknown/','https://external.example/works.html')),unknown.replace('https://emotionbookstore.com/unknown/','https://external.example/works.html'),'Do not match other canonical origins');
assert.throws(()=>transform(unknown.replace('/unknown/','/works.html').replace('site-polished','other')),/public page contract/);
assert.equal(transform(good.replace('</head>','<link rel="stylesheet" href="/public-typography.css"></head>')),good,'Dedupe link without changing content');
tests+=20;
console.log(`PASS ${tests} public typography integrity and negative checks; 127 opted-in pages, ${Object.keys(source.frozen_sha256).length} frozen files, exactly 3 C3 reference pins updated (culture 2 + deep Junjo 1)`);
