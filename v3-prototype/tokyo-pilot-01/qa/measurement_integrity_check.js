#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..'), OPS=path.join(__dirname,'human-test-v3');
const fail=[];
const read=(p)=>{ if(!fs.existsSync(p)){ fail.push('missing '+p); return ''; } return fs.readFileSync(p,'utf8'); };
const req=(text,needle,label)=>{ if(!text.includes(needle)) fail.push(`${label} missing: ${needle}`); };
const forbid=(text,needle,label)=>{ if(text.includes(needle)) fail.push(`${label} contains forbidden text: ${needle}`); };
const html=read(path.join(ROOT,'index.html'));
const runtime=[html,read(path.join(ROOT,'pilot.js')),read(path.join(ROOT,'pilot_content.js'))].join('\n');
for(const phrase of ['次の3つ','また見たい','見終わりました']) forbid(runtime,phrase,'participant runtime');
req(html,'この棚は、3つで終わりです。','neutral finite ending');
req(html,'画像の出典と利用条件は各詳細に記載しています。','accurate rights/trust copy');
for(const token of ['first_open_latency_s','first_reveal_payoff','scorecard.local.csv']) forbid(runtime,token,'runtime telemetry boundary');
const csv=read(path.join(OPS,'scorecard_template.csv')).trimEnd().split(/\r?\n/);
if(csv.length!==19) fail.push(`scorecard template must be header + 18 rows, got ${csv.length}`);
const headers=(csv[0]||'').split(',');
for(const h of ['participant_id','order','prior_pilot_exposure','recruitment_relation','device','consent_confirmed','first_open_latency_s','voluntary_open','first_object','opened_objects','objects_opened','official_action','return_desire','existing_alternative_sufficient','distinct_v3_use','first_reveal_payoff','first_reveal_payoff_reason']) if(!headers.includes(h)) fail.push('scorecard missing '+h);
const orderCounts=new Map(['abc','acb','bac','bca','cab','cba'].map(x=>[x,0]));
for(let i=1;i<csv.length;i++){
  const cells=csv[i].split(','), pid=cells[headers.indexOf('participant_id')], order=cells[headers.indexOf('order')];
  if(pid!==`P${String(i).padStart(2,'0')}`) fail.push(`row ${i+1} participant mismatch ${pid}`);
  if(!orderCounts.has(order)) fail.push(`row ${i+1} bad order ${order}`); else orderCounts.set(order,orderCounts.get(order)+1);
  for(let c=0;c<headers.length;c++) if(!['participant_id','order'].includes(headers[c]) && (cells[c]||'').trim()) fail.push(`tracked template not blank ${pid}:${headers[c]}`);
}
for(const [o,n] of orderCounts) if(n!==3) fail.push(`order ${o} expected 3, got ${n}`);
const moderator=read(path.join(OPS,'moderator_sheet.md'));
const qReturn=moderator.indexOf('次の3つが入ったら、また見たいですか？');
const qReveal=moderator.indexOf('開く前に見えていた情報より、開いたあとに何か増えましたか？');
if(qReturn<0||qReveal<0||qReveal<qReturn) fail.push('Reveal diagnostic must come after Return Desire');
req(moderator,'blank is allowed if the operator misses it','latency missingness rule');
req(moderator,'if at least one Object was opened','Reveal eligibility rule');
req(moderator,'At the end of `どうぞ`','latency anchor');
req(moderator,'do not transcribe it','private-detail transcription boundary');
// --- V3.2: 実験そのものが結果を作る経路を塞ぐ ---------------------------------
// 募集文の invite そのものに hypothesis leakage が無いこと。
// （禁止語の一覧そのものは brief 内に列挙されているので、invite 引用行だけを見る）
const brief=read(path.join(OPS,'recruitment_brief.md'));
const inviteLines=brief.split(/\r?\n/).filter(l=>l.trim().startsWith('>'));
const invite=inviteLines.join('\n');
if(!invite.trim()) fail.push('recruitment brief has no quoted neutral invite');
for(const leak of ['3分','5分','検索前','文化との出会い','3つ','Human Editorial','また見たい','新しい発見','面白い場所','変わった場所','開きたくなる']){
  if(invite.includes(leak)) fail.push(`recruitment invite primes the hypothesis: ${leak}`);
}
if(/質問を[0-9０-９一二三四五六七八九十]+[つ問]/.test(invite)) fail.push('recruitment invite states a fixed question count');
req(brief,'prior_pilot_exposure','recruitment brief records prior exposure');
req(brief,'close_tie','recruitment quality target');

// Moderator: 画面露出と stopwatch 開始が同時であること。
req(moderator,'out of the participant\'s sight','screen hidden before the prompt');
req(moderator,'at the same moment','screen exposure and stopwatch start together');
forbid(moderator,'3分ほどの試作確認','consent states a duration');

// 質問順: Return Desire -> Occasion -> ... -> Reveal payoff
const iReturn=moderator.indexOf('次の3つが入ったら、また見たいですか？');
const iOccasion=moderator.indexOf('これ、どんな時なら開きそうですか？');
const iRevealQ=moderator.indexOf('開く前に見えていた情報より、開いたあとに何か増えましたか？');
if(iReturn<0||iOccasion<0) fail.push('post-session questions missing');
else if(iOccasion<iReturn) fail.push('Return Desire must be asked before the occasion question');
if(iRevealQ<0||iRevealQ<iReturn) fail.push('Reveal payoff must come after Return Desire');

// 詳細な個人属性を集めない
for(const priv of ['age','gender','address','employer','occupation_detail','income','mental_state']){
  if(headers.includes(priv)) fail.push(`scorecard must not collect ${priv}`);
}

const analyzer=read(path.join(OPS,'analyze.py'));
req(analyzer,'prior_exposure_excluded_from_primary','prior exposure primary exclusion');
req(analyzer,'recruitment_relation_is_validity_note_only','recruitment relation stays a validity note');
req(analyzer,'"measurement_version": "3.2"','analyzer measurement version');
req(analyzer,'diagnostic_missing_does_not_invalidate_core_row','diagnostic missingness decision boundary');
req(analyzer,'kill_not_permitted_from_cycle1_alone','Cycle 01 kill boundary');
const ignore=read(path.join(OPS,'.gitignore'));
for(const n of ['scorecard.local.csv','result.json','result.md']) req(ignore,n,'local data ignore');
const freeze=read(path.join(OPS,'freeze.py')), verify=read(path.join(OPS,'verify_freeze.py'));
req(freeze,'tokyo-human-test-v3.1-freeze-1','freeze schema');
req(verify,'manifest self-hash mismatch','freeze self hash');
const previewVerifier=read(path.join(OPS,'preview_verify.js'));
req(previewVerifier,'remote/local SHA mismatch','Preview byte identity gate');
req(previewVerifier,'internal file publicly delivered','Preview internal-delivery gate');
req(previewVerifier,"--check-only",'Preview non-mutating recheck mode');
if(fail.length){ console.error('MEASUREMENT_INTEGRITY_FAIL'); fail.forEach(x=>console.error('- '+x)); process.exit(1); }
console.log('MEASUREMENT_INTEGRITY_GO');
console.log('runtime_telemetry=0; return_priming=0; false_completion=0; anonymous_rows=18; diagnostic_missingness=reported; raw_rows=local; recruitment_priming=0; prior_exposure=excluded_from_primary; demographics=0');
