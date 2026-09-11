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
 ['qa/event_timing_check.js', 'qa/event_supply_check.js', 'qa/events_expiry_cluster_check.js', 'qa/event_schema_check.js'],
 ['qa/memory_note_check.js'],
 ['qa/city_discovery_check.js'],
 ['qa/culture_continuity_check.js'],
 ['qa/navigation_readability_check.js'],
 ['qa/catalogue_inventory_check.js', 'qa/catalogue_supply_check.js'],
 ['qa/city_discovery_player_check.js'],
 ['qa/work_page_check.js', 'qa/work_schema_check.js', 'qa/breadcrumb_check.js'],
 ['qa/social_post_check.js'],
 ['qa/culture_delivery_csp_check.js'],
 ['qa/analytics_contract_check.js'],
 ['qa/duplicate_text_check.js'],
 ['tools/build-work-pages.js','--check'],
 ['tools/build-city-discovery.js','--check'],
 ['qa/ga4_v3_client_selftest.js'],
 /* 2026-09-11 追加。ここまで45本中22本しか回っていなかった。**通るのに誰も
    回していないテストが11本あった。** その1本（seo_check）に自分の回帰が丸一週間
    隠れていたので、環境に依らず速いものは全部ここへ入れる。
    残りはブラウザかネットワークが要るもので、qa/KNOWN-FAILURES に回し方を書いた。 */
 ['qa/home_discovery_check.js'],
 ['qa/design_redesign_check.js'],
 ['qa/culture_room_contract_check.js', 'qa/parks_screen_contract_check.js'],
 /* release_preflight は時刻で判定する門である。将来落ちたら fixture の
    賞味期限切れではなく、期限切れの current が公開されているという意味。 */
 ['qa/release_preflight.js', 'qa/release_expiry_boundaries.js'],
 ['qa/growth_improvements.js', 'qa/measurement_v04_selftest.js', 'qa/link_check_selftest.js']
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
