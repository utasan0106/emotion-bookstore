'use strict';
// Permit only generated public surfaces and the exact source-derived expiry redirects.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
function redirectContract(now=Date.now()){
 const events=require('./weekly-outings-source'),week=require('../outings/week');
 const city=require('./city-discovery-source'),today=week.date(now);
 const paths=new Set(),expected=[];
 for(const e of events.events){
  const source=`/outings/events/${e.id}.html`;paths.add(source);
  const active=events.isPublishableEvent(e)&&e.status==='scheduled'&&e.checkedAt<=today&&e.reviewThrough>=today&&week.dates(e).at(-1)>=today;
  if(!active)expected.push({source,destination:'/outings/',permanent:false});
 }
 for(const i of [...city.items,...city.excludedItems])paths.add(`/discover/${i.city}/${i.id}.html`);
 for(const i of city.excludedItems)expected.push({source:`/discover/${i.city}/${i.id}.html`,destination:city.items.some(x=>x.city===i.city&&x.kind===i.kind)?`/discover/${i.city}/${i.kind}.html`:`/discover/${i.city}/`,permanent:false});
 return {paths,expected};
}
function validate(paths,before,after,contract=redirectContract()){
 for(const file of paths)assert.match(file,/^(?:discover\/|outings\/|sitemap\.xml$|feed\.xml$|vercel\.json$)/,`Unexpected generated file: ${file}`);
 if(!paths.includes('vercel.json'))return;
 const {redirects:oldRedirects=[],...oldConfig}=before,{redirects:newRedirects=[],...newConfig}=after;
 assert.deepEqual(newConfig,oldConfig,'Non-redirect Vercel settings must not change');
 const managed=r=>contract.paths.has(r.source);
 assert.deepEqual(newRedirects.filter(r=>!managed(r)),oldRedirects.filter(r=>!managed(r)),'Unrelated redirects must not change');
 const firstManaged=newRedirects.findIndex(managed);
 const lastUnmanaged=newRedirects.findLastIndex(r=>!managed(r));
 assert.ok(firstManaged===-1||firstManaged>lastUnmanaged,'Generated redirects must follow existing canonical and unrelated rules');
 const ordered=rs=>rs.map(r=>JSON.stringify(r)).sort();
 assert.deepEqual(ordered(newRedirects.filter(managed)),ordered(contract.expected),'Generated redirects must exactly match current reviewed source');
}
module.exports={validate,redirectContract};
if(require.main===module){
 const git=args=>cp.execFileSync('git',args,{encoding:'utf8'});
 const paths=[...new Set([...git(['diff','--name-only','-z','HEAD']).split('\0'),...git(['ls-files','--others','--exclude-standard','-z']).split('\0')].filter(Boolean))];
 const before=JSON.parse(git(['show','HEAD:vercel.json'])),after=JSON.parse(fs.readFileSync('vercel.json','utf8'));
 validate(paths,before,after);
 console.log(`PASS freshness output: ${paths.length} changed files; only exact generated redirects may change Vercel config`);
}
