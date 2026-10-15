'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'verify-product.js'),'utf8');
function inspect(failedScript,args=[]){
 const calls=[],state={execPath:process.execPath,argv:[process.execPath,'qa/verify-product.js',...args]};
 vm.runInNewContext(source,{__dirname,process:state,console:{log(){},error(){}},require:id=>id==='node:child_process'?{spawnSync:(_node,args)=>{calls.push(args);return{status:args[0]===failedScript?1:0,stdout:'',stderr:''};}}:require(id)});
 return {calls,state};
}
const {calls,state}=inspect();
const expected=[...source.matchAll(/'((?:qa|tools)\/[^']+\.js)'/g)].map(m=>m[1]);
assert.equal(calls.length,expected.length,'Each declared script must have its own Node invocation');
assert.deepEqual(calls.map(a=>a[0]),expected);
assert.equal(new Set(expected).size,expected.length,'No duplicate checks');
for(const args of calls)assert.equal(args.filter(a=>a.endsWith('.js')).length,1,'Node accepts one entry script, not a list of checks');
assert.equal(state.exitCode,0);
assert.equal(inspect('qa/social_card_check.js').state.exitCode,1,'A formerly skipped check must fail the aggregate');
const withoutSupply=inspect(null,['--skip-event-supply']);
assert.equal(withoutSupply.state.exitCode,0);
assert.ok(!withoutSupply.calls.some(args=>args[0]==='qa/event_supply_check.js'),'Dedicated freshness mode skips only the editorial supply diagnostic');
assert.deepEqual(withoutSupply.calls.map(args=>args[0]),expected.filter(script=>script!=='qa/event_supply_check.js'),'Every non-supply product check must still run before freshness push');
for(const script of ['tools/build-work-pages.js','tools/build-city-discovery.js','tools/build-weekly-outings.js'])assert.ok(calls.find(a=>a[0]===script).includes('--check'),'Builders must stay read-only');
console.log(`PASS runner executes ${calls.length} distinct scripts, preserves --check, propagates failures`);
