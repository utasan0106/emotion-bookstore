'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {validate,redirectContract}=require('../tools/check-freshness-output');
const base={headers:[{source:'/(.*)',headers:[{key:'Content-Security-Policy',value:"default-src 'self'"}]}],redirects:[{source:'/legacy',destination:'/',permanent:false}]};
const retired={source:'/outings/events/example.html',destination:'/outings/',permanent:false};
const contract={paths:new Set([retired.source]),expected:[retired]};
const valid={...base,redirects:[...base.redirects,retired]};
const check=(paths,before,after)=>validate(paths,before,after,contract);
check(['vercel.json','outings/index.html','discover/koenji/index.html','sitemap.xml','feed.xml'],base,valid);
check(['discover/koenji/index.html'],base,base);
for(const file of ['analytics-v3.js','.github/workflows/other.yml','vercel.json.bak','sitemap.xml.bak'])assert.throws(()=>check([file],base,valid));
assert.throws(()=>check(['vercel.json'],base,{...valid,redirects:[retired,...base.redirects]}),'Generated redirects cannot shadow canonical rules');
assert.throws(()=>check(['vercel.json'],base,{...valid,headers:[]}),'CSP/header changes blocked');
assert.throws(()=>check(['vercel.json'],base,{...valid,rewrites:[{source:'/(.*)',destination:'https://example.org'}]}),'Rewrites blocked');
assert.throws(()=>check(['vercel.json'],base,{...valid,redirects:[retired]}),'Unrelated redirect removal blocked');
assert.throws(()=>check(['vercel.json'],base,{...valid,redirects:[...base.redirects,{...retired,destination:'https://example.org'}]}),'External generated destinations blocked');
assert.throws(()=>check(['vercel.json'],base,{...valid,redirects:[...base.redirects,{...retired,permanent:true}]}),'Permanent redirects blocked');
assert.throws(()=>check(['vercel.json'],base,{...valid,redirects:[...valid.redirects,retired]}),'Duplicate redirect blocked');
assert.throws(()=>check(['vercel.json'],base,base),'Missing expiry redirect blocked');
const workflow=fs.readFileSync('.github/workflows/weekly-acquisition-refresh.yml','utf8');
assert.match(workflow,/node tools\/check-freshness-output\.js/);
assert.match(workflow,/git add discover outings sitemap\.xml feed\.xml vercel\.json/);
assert.match(workflow,/node qa\/freshness_workflow_check\.js/);
assert.match(workflow,/cron: '15 0 \* \* 1'/);assert.match(workflow,/cron: '15 0 \* \* 5'/);
console.log('PASS freshness workflow positive/negative guards; existing schedules retained');

// Execute the real event generator against an in-memory filesystem at JST midnight.
// No source edits, generated files, or network calls escape this test.
const path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),builder=path.join(root,'tools/build-weekly-outings.js');
const builderRequire=createRequire(builder),builderSource=fs.readFileSync(builder,'utf8');
function generatedAt(instant,{existing=[],missing=[]}={}){
 const now=Date.parse(instant),writes=new Map(),removed=new Set();
 const seededExisting=new Set(existing.map(file=>path.resolve(file)));
 const seededMissing=new Set(missing.map(file=>path.resolve(file)));
 const fakeFs={...fs,
  writeFileSync:(file,text)=>{writes.set(path.resolve(file),String(text));removed.delete(path.resolve(file));},
  mkdirSync(){},rmSync:file=>removed.add(path.resolve(file)),
  existsSync:file=>{const absolute=path.resolve(file);return !removed.has(absolute)&&(writes.has(absolute)||seededExisting.has(absolute)||(!seededMissing.has(absolute)&&fs.existsSync(file)));},
  readFileSync:(file,...args)=>writes.has(path.resolve(file))?writes.get(path.resolve(file)):fs.readFileSync(file,...args)};
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 vm.runInNewContext(builderSource,{__dirname:path.dirname(builder),require:id=>id==='node:fs'?fakeFs:builderRequire(id),process:{argv:[]},Date:FixedDate,module:{exports:{}},console:{log(){}}},{filename:builder});
 const config=JSON.parse(writes.get(path.join(root,'vercel.json')));
 validate(['vercel.json'],JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')),config,redirectContract(now));
 return {config,writes,removed,exists:file=>fakeFs.existsSync(file)};
}
const eventIds=result=>JSON.parse(result.writes.get(path.join(root,'outings/events-data.js')).match(/^window\.OUTINGS_DATA=(.*);\s*$/s)[1]).events.map(event=>event.id);
for(const [id,lastDay,nextDay,activeId] of [['shimokita-moon','2026-10-04','2026-10-05','jinbocho-joyu'],['jinbocho-joyu','2026-10-06','2026-10-07','kichijoji-tsuijuku'],['koenji-tomovsky','2026-10-16','2026-10-17','shimokita-bergson'],['shimokita-bergson','2026-10-18','2026-10-19','kichijoji-taniguchi'],['kichijoji-taniguchi','2026-11-03','2026-11-04',null]]){
 const route=`/outings/events/${id}.html`,file=path.join(root,route);
 const before=generatedAt(lastDay+'T23:59:59.999+09:00');
 assert.ok(before.writes.has(file),'Detail remains available through final JST date: '+id);
 assert.ok(!before.config.redirects.some(r=>r.source===route),'Active event must not redirect: '+id);
 const afterExisting=generatedAt(nextDay+'T00:00:00.000+09:00',{existing:[file]});
 const afterMissing=generatedAt(nextDay+'T00:00:00.000+09:00',{missing:[file]});
 assert.ok(afterExisting.removed.has(file),'Existing ended detail must be removed: '+id);
 assert.ok(!afterMissing.removed.has(file),'Already-absent ended detail needs no removal call: '+id);
 for(const [state,result] of [['existing',afterExisting],['already absent',afterMissing]]){
  assert.ok(!result.exists(file)&&!result.writes.has(file),`Ended detail stays absent and is not regenerated (${state}): ${id}`);
  assert.ok(result.config.redirects.some(r=>r.source===route&&r.destination==='/outings/'&&r.permanent===false),`Expired URL has safe temporary redirect (${state}): ${id}`);
  assert.ok(!result.writes.get(path.join(root,'outings/events-data.js')).includes('"id":"'+id+'"'),`Expired event absent from runtime (${state}): ${id}`);
  if(activeId){
   const activeRoute=`/outings/events/${activeId}.html`,activeFile=path.join(root,activeRoute);
   assert.ok(result.writes.has(activeFile),`Active detail remains generated (${state}): ${activeId}`);
   assert.ok(!result.config.redirects.some(r=>r.source===activeRoute),`Active detail must not redirect (${state}): ${activeId}`);
  }
 }
}
const oct6=generatedAt('2026-10-06T00:00:00.000+09:00');
assert.ok(oct6.writes.has(path.join(root,'outings/events/jinbocho-joyu.html')),'女優魂 detail remains at Oct 6 00:00 JST');
assert.ok(!oct6.config.redirects.some(r=>r.source==='/outings/events/jinbocho-joyu.html'),'女優魂 does not redirect at Oct 6 00:00 JST');
const oct7=generatedAt('2026-10-07T00:00:00.000+09:00',{existing:[path.join(root,'outings/events/jinbocho-joyu.html')]});
assert.deepEqual(eventIds(oct7),eventIds(oct6).filter(id=>id!=='jinbocho-joyu'),'Oct 7 retires only 女優魂 from the Oct 6 active set');
for(const id of eventIds(oct7)){
 const route=`/outings/events/${id}.html`;
 assert.ok(oct7.writes.has(path.join(root,route)),'Oct 7 active detail remains generated: '+id);
 assert.ok(!oct7.config.redirects.some(r=>r.source===route),'Oct 7 active detail must not redirect: '+id);
}
console.log('PASS real event generator and redirect guard agree across Oct 4→5, Oct 6→7, Oct 16→17, Oct 18→19 and Nov 3→4 JST');

// Run the real discovery generator in memory too: an expired signal must not erase
// the Home menu anchor, imply all events ended, or retain the expired festival.
function generatedDiscoveryAt(instant){
 const now=Date.parse(instant),writes=new Map(),removed=new Set();
 const file=path.join(root,'tools/build-city-discovery.js'),load=createRequire(file);
 const fakeFs={...fs,writeFileSync:(p,text)=>writes.set(path.resolve(p),String(text)),mkdirSync(){},
  unlinkSync:p=>removed.add(path.resolve(p)),rmSync:p=>removed.add(path.resolve(p)),
  existsSync:p=>!removed.has(path.resolve(p))&&(writes.has(path.resolve(p))||fs.existsSync(p)),
  readFileSync:(p,...args)=>writes.has(path.resolve(p))?writes.get(path.resolve(p)):fs.readFileSync(p,...args)};
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{__dirname:path.dirname(file),require:id=>id==='node:fs'?fakeFs:id==='node:child_process'?{execFileSync(){}}:load(id),process:{argv:[]},Date:FixedDate,URL,module:{exports:{}},console:{log(){}}},{filename:file});
 return writes.get(path.join(root,'discover/index.html'));
}
const beforeSignal=generatedDiscoveryAt('2026-10-04T23:59:59.999+09:00'),afterSignal=generatedDiscoveryAt('2026-10-05T00:00:00.000+09:00');
assert.match(beforeSignal,/id="city-signals"/);assert.match(beforeSignal,/outings\/events\/shimokita-moon\.html/);
assert.match(afterSignal,/id="city-signals"><h2>今の街の動き<\/h2>/);
assert.match(afterSignal,/現在、掲載できる街の動きはありません。<\/p><a href="\/outings\/">催しを探す/);
assert.doesNotMatch(afterSignal,/outings\/events\/shimokita-moon\.html|ムーンアートナイト下北沢 2026/);
console.log('PASS Oct 4→5 real discovery generation: empty anchor and honest outings exit survive, ended signal absent');
module.exports={generatedDiscoveryAt};
