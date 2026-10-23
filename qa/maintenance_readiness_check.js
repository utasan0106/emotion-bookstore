'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),file=path.join(__dirname,'home_weekly_refresh_check.js'),source=fs.readFileSync(file,'utf8'),load=createRequire(file);
const latestWeek=JSON.parse(fs.readFileSync(path.join(root,'tools/weekly-home-ledger.json'),'utf8')).weeks.map(x=>x.weekOf).sort().at(-1);
const shiftWeek=days=>new Date(Date.parse(latestWeek+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
const rollover=shiftWeek(7),futureWeek=shiftWeek(14);
assert.equal(new Date(rollover+'T00:00:00Z').getUTCDay(),1);
assert.equal(new Date(futureWeek+'T00:00:00Z').getUTCDay(),1);
function home({maintenance=true,change=()=>{},instant=rollover+'T00:00:00+09:00'}={}){
 const ledger=JSON.parse(fs.readFileSync(path.join(root,'tools/weekly-home-ledger.json'),'utf8'));
 const data={ledger,home:fs.readFileSync(path.join(root,'index.html'),'utf8'),release:fs.readFileSync(path.join(root,'release_content.js'),'utf8')};change(data);
 const fakeFs={...fs,readFileSync:(p,...a)=>p===path.join(root,'tools/weekly-home-ledger.json')?JSON.stringify(data.ledger):p===path.join(root,'index.html')?data.home:p===path.join(root,'release_content.js')?data.release:fs.readFileSync(p,...a)};
 class FixedDate extends Date{static now(){return Date.parse(instant);}}
 vm.runInNewContext(source,{__dirname,JSON,require:id=>id==='node:fs'?fakeFs:load(id),Date:FixedDate,process:{argv:maintenance?['--maintenance']:[]},console:{log(){}}});
}
home(); // No new content: older, internally consistent edition may remain during expiry maintenance.
assert.throws(()=>home({maintenance:false}),/current JST week/,'Full editorial gate still fails on Monday rollover');
assert.throws(()=>home({change:d=>d.ledger.weeks.at(-1).shortVideoIds=['duplicate','duplicate','duplicate']}));
assert.throws(()=>home({change:d=>d.ledger.weeks.at(-1).weekOf='2026-99-99'}));
assert.throws(()=>home({change:d=>d.ledger.weeks.at(-1).weekOf=futureWeek}),/Future edition/);
assert.throws(()=>home({change:d=>d.home=d.home.replace(/data-weekly-feature="[^"]+"/g,'data-weekly-feature="wrong"')}));
assert.throws(()=>home({change:d=>d.release=d.release.replace(/"topFeatureId"\s*:\s*"[^"]+"/,'"topFeatureId":"wrong"')}));
const runner=fs.readFileSync(path.join(__dirname,'verify-product.js'),'utf8');
function run(fail){const calls=[],state={argv:['--maintenance'],execPath:process.execPath};vm.runInNewContext(runner,{__dirname,process:state,console:{log(){},error(){}},require:id=>id==='node:child_process'?{spawnSync:(_node,args)=>{calls.push(args);return{status:args[0]===fail?1:0,stdout:'',stderr:''};}}:require(id)});return {calls,state};}
const {calls,state}=run();assert.equal(state.exitCode,0);
assert.ok(!calls.some(a=>a[0]==='qa/event_supply_check.js'));
assert.ok(calls.find(a=>a[0]==='qa/home_weekly_refresh_check.js').includes('--maintenance'));
for(const name of ['editorial_pending_gate_check','event_schema_check','work_schema_check','release_preflight','culture_delivery_csp_check','analytics_contract_check']){
 assert.ok(calls.some(a=>a[0]===`qa/${name}.js`));assert.equal(run(`qa/${name}.js`).state.exitCode,1,'Maintenance must fail closed: '+name);
}
const workflow=fs.readFileSync(path.join(root,'.github/workflows/weekly-acquisition-refresh.yml'),'utf8');
assert.ok(workflow.indexOf('Report editorial readiness separately')>workflow.indexOf('git push origin HEAD:main'));
assert.doesNotMatch(workflow,/feed\.xml|application\/rss\+xml/,'Maintenance must not restore RSS publishing');
assert.match(workflow,/if: always\(\)/);assert.match(workflow,/Editorial NOT READY/);assert.match(workflow,/node qa\/event_supply_check.js/);assert.match(workflow,/exit 1/);
console.log('PASS maintenance retains invalid-data hard gates; stale week is separately NOT READY; no editorial auto-approval');
