#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..'), OPS=path.join(__dirname,'human-test-v3');
const fail=[];
const read=(p)=>{ if(!fs.existsSync(p)){ fail.push('missing '+p); return ''; } return fs.readFileSync(p,'utf8'); };
const req=(text,needle,label)=>{ if(!text.includes(needle)) fail.push(`${label} missing: ${needle}`); };
const forbid=(text,needle,label)=>{ if(text.includes(needle)) fail.push(`${label} contains forbidden text: ${needle}`); };
const html=read(path.join(ROOT,'index.html'));
// 終了文は markup（.end-phrase + <wbr>）で折返し位置を固定しているため、
// raw HTML の連続文字列では検査できない。tag を除いた text contract で見る。
function endPlateText(rawHtml) {
  const m = rawHtml.match(/<section class="end-plate"[\s\S]*?<\/section>/);
  if (!m) return '';
  return m[0].replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
}

const runtime=[html,read(path.join(ROOT,'pilot.js')),read(path.join(ROOT,'pilot_content.js'))].join('\n');
for(const phrase of ['次の3つ','また見たい','見終わりました']) forbid(runtime,phrase,'participant runtime');
req(endPlateText(html),'この棚は、3つで終わりです。','neutral finite ending');
if(!/<span class="end-phrase">この棚は、3つで<\/span><wbr><span class="end-phrase">終わりです。<\/span>/.test(html)) fail.push('finite ending must fix its line break with .end-phrase + <wbr>');
const css=read(path.join(ROOT,'pilot.css'));
const endPhraseRule=(css.match(/\.end-phrase\s*\{[^}]*\}/)||[''])[0];
if(!/word-break:\s*keep-all/.test(endPhraseRule)) fail.push('.end-phrase must be word-break: keep-all (Safari-safe fallback)');
if(!/overflow-wrap:\s*break-word/.test(endPhraseRule)) fail.push('.end-phrase needs overflow-wrap: break-word so 200% zoom cannot overflow');
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
// --- V3.2 final operator contract -------------------------------------------------
// 1) moderator contract が return_desire の unclear を正式に許可している
req(moderator,'`return_desire`: yes / maybe / no / unclear','return_desire allows unclear');
req(moderator,'yes / maybe / no のどれかに近ければどれですか？','single neutral Return clarification');
req(moderator,'`unclear` is a valid Return Desire response','unclear is a valid response, not an exclusion');
// 2) analyzer も unclear を valid として受理する
req(analyzer,'RETURN_VALUES = {"yes", "maybe", "no", "unclear"}','analyzer accepts return_desire=unclear');
// 3) unclear は Yes numerator へ入らず primary n に残る
req(analyzer,'ret_unclear = sum(norm(r["return_desire"]) == "unclear" for r in completed)','unclear counted separately');
req(analyzer,'"return_unclear_n": ret_unclear','return_unclear_n reported');
req(analyzer,'"return_unclear_pct"','return_unclear_pct reported');
req(analyzer,'ret_yes = sum(norm(r["return_desire"]) == "yes" for r in completed)','Yes numerator is yes only');
req(analyzer,'"return_yes_wilson_95_pct": wilson(ret_yes, n)','Return Yes Wilson denominator stays primary-valid n');
// completed から unclear を落としていないこと。除外 filter は prior exposure の1本だけ。
if((analyzer.match(/completed = \[r for r in completed/g)||[]).length !== 1){
  fail.push('analyzer must exclude only prior-exposure rows from primary valid n');
}
// 4) stopping rule が operator contract に precommit されている
const decision=read(path.join(OPS,'decision_matrix.md'));
for(const [needle,label] of [
  ['12 primary-valid participants','stopping rule: primary_valid_12'],
  ['max_total_sessions=18','stopping rule: max_total_sessions=18'],
  ['replacement reserve only','stopping rule: P13-P18 replacement only'],
  ['outcome-based extension','stopping rule: outcome-based extension forbidden'],
  ['automatic P19+','stopping rule: no automatic P19+'],
]) req(decision,needle,label);
req(decision,'Open / Return / Reveal / Official Actionの値を停止判断に使わない','stopping decision is outcome-blind');
const readme=read(path.join(OPS,'README.md'));
req(readme,'stopping_rule=primary_valid_12;max_total_sessions=18;p13_p18=replacement_only;replacement_reasons=prior_exposure|consent_invalid|major_protocol_deviation|technical_failure|order_balance;outcome_based_extension=forbidden;relation_shortfall=validity_caveat_only;if_max_sessions_and_valid_lt12=incomplete;no_auto_p19_plus','exact freeze --note handoff string');
forbid(readme,'run 12–18 first-time participants','README still reads as an open 12-18 range');
req(moderator,'## Stopping rule','moderator sheet carries the stopping rule');
req(moderator,'Cycle 01 closes at **12 primary-valid participants**','moderator stopping rule: primary_valid_12');

const ignore=read(path.join(OPS,'.gitignore'));
for(const n of ['scorecard.local.csv','result.json','result.md']) req(ignore,n,'local data ignore');
const previewVerifierEarly=read(path.join(OPS,'preview_verify.js'));
const freeze=read(path.join(OPS,'freeze.py')), verify=read(path.join(OPS,'verify_freeze.py'));
req(freeze,'tokyo-human-test-v3.2-freeze-1','freeze schema');
req(freeze,"'measurementVersion':'3.2'",'freeze measurement version');
forbid(freeze,'v3.1-freeze','freeze schema still on V3.1');
req(previewVerifierEarly,"schemaVersion:'tokyo-preview-v3.2-1'",'preview evidence schema');
forbid(previewVerifierEarly,'tokyo-preview-v3.1','preview evidence schema still on V3.1');
// PREVIEW_HANDOFF は tracked document なので、自分自身を含む最終 commit SHA を
// 実行条件にすると更新のたび自己参照になる。SHA の突き合わせは evidence
// (sourceGitHead) と freeze.py 側の責務であって、handoff 文書の責務ではない。
const handoff=read(path.join(OPS,'PREVIEW_HANDOFF.md'));
if(/rev-parse\s+HEAD[^\n]{0,40}=\s*['"`]?[0-9a-f]{7,40}/.test(handoff)){
  fail.push('PREVIEW_HANDOFF must not gate on a self-referential hard-coded HEAD equality');
}
req(handoff,'EXACT_HEAD="$(git rev-parse origin/','handoff resolves HEAD from origin at run time');
req(handoff,'git checkout --detach "$EXACT_HEAD"','handoff detaches at the fetched tip');
req(verify,'manifest self-hash mismatch','freeze self hash');
const previewVerifier=read(path.join(OPS,'preview_verify.js'));
req(previewVerifier,'remote/local SHA mismatch','Preview byte identity gate');
req(previewVerifier,'internal file publicly delivered','Preview internal-delivery gate');
req(previewVerifier,"--check-only",'Preview non-mutating recheck mode');
if(fail.length){ console.error('MEASUREMENT_INTEGRITY_FAIL'); fail.forEach(x=>console.error('- '+x)); process.exit(1); }
console.log('MEASUREMENT_INTEGRITY_GO');
console.log('runtime_telemetry=0; return_priming=0; false_completion=0; anonymous_rows=18; diagnostic_missingness=reported; raw_rows=local; recruitment_priming=0; prior_exposure=excluded_from_primary; demographics=0');
