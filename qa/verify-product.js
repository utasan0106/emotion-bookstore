'use strict';
// Run in a clean checkout. Reuse the product contracts; never generate pages here.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const checks=[
 ['qa/catalogue_regression_check.js'],
 ['qa/cover-flow-check.js'],
 ['qa/site_integration_check.js'],
 ['qa/release_check.js'],
 ['qa/weather_check.js'],
 ['qa/weather_client_check.js'],
 ['qa/weekly_outings_check.js'],
 ['qa/event_timing_check.js', 'qa/event_supply_check.js'],
 ['qa/memory_note_check.js'],
 ['qa/city_discovery_check.js'],
 ['qa/culture_continuity_check.js'],
 ['qa/navigation_readability_check.js'],
 ['qa/catalogue_inventory_check.js', 'qa/catalogue_supply_check.js'],
 ['qa/city_discovery_player_check.js'],
 ['qa/work_page_check.js'],
 ['qa/social_post_check.js'],
 ['qa/culture_delivery_csp_check.js'],
 ['qa/analytics_contract_check.js'],
 ['tools/build-work-pages.js','--check'],
 ['tools/build-city-discovery.js','--check'],
 ['qa/ga4_v3_client_selftest.js']
];
let failed=0;
for(const args of checks){
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000});
 const ok=result.status===0;
 console.log((ok?'PASS ':'FAIL ')+args.join(' '));
 if(!ok){failed++;console.error(result.error?.message||'',result.stdout,result.stderr);}
}
console.log(`${checks.length-failed}/${checks.length} product checks passed`);
process.exitCode=failed?1:0;
