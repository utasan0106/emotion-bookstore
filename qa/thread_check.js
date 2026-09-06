#!/usr/bin/env node
/* THREAD CHECK — Cultural Thread（thread.html?thread=koenji-dance-history）の静的契約。
 *
 *   node qa/thread_check.js
 *
 * runtime だけを読む。ネットワークには一切出ない。
 * KOENJI R2 HQ FREEZE の受け入れ条件（§18）を、content model・renderer・殻・
 * HOME の接続・権利記録の順に固定する。既存の HOME / 棚の QA は置き換えない。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const check = (cond, msg) => { if (!cond) failures.push(msg); };
const finish = () => {
  if (failures.length) {
    console.error('THREAD_CHECK_FAIL');
    for (const f of failures) console.error('- ' + f);
    process.exit(1);
  }
};

for (const f of ['thread.html', 'thread.css', 'thread_content.js', 'thread.js', 'index.html', 'release.css', 'credits.html',
  'analytics-v3.js', 'sitemap.xml', 'qa/link_check.js', 'assets/home-thread-koenji-awaodori.jpg']) {
  check(exists(f), `missing ${f}`);
}
finish();

const html = read('thread.html');
const css = read('thread.css');
const contentJs = read('thread_content.js');
const js = read('thread.js');
const home = read('index.html');
const releaseCss = read('release.css');
const credits = read('credits.html');
const analytics = read('analytics-v3.js');
/* コメントは runtime copy ではない。語の走査は comment を落とした code に対して行う。 */
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const contentCode = stripJs(contentJs);
const jsCode = stripJs(js);
const htmlCode = html.replace(/<!--[\s\S]*?-->/g, '');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(contentJs, sandbox);
const CONTENT = sandbox.window.V3_THREAD_CONTENT;
check(CONTENT && Array.isArray(CONTENT.threads), 'thread_content.js must expose window.V3_THREAD_CONTENT.threads');
const thread = ((CONTENT && CONTENT.threads) || []).find((t) => t && t.threadId === 'koenji-dance-history');
check(!!thread, 'thread koenji-dance-history missing (public route renamed by the Founder no-inquiry decision)');
check(!((CONTENT && CONTENT.threads) || []).some((t) => t && t.threadId === 'koenji-awaodori'), 'old threadId koenji-awaodori must not remain as a public route');
finish();

const byId = (list, id) => (list || []).find((x) => x && x.id === id) || null;
const source = (id) => byId(thread.sources, id);
const relation = (id) => byId(thread.relations, id);
const fact = (id) => byId(thread.facts, id);
const flat = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 0) || '');

/* ---- 1. 殻（thread.html）: 本文を持たない・外へ出ない・同期 head JS が無い ---- */

check(html.includes('<meta name="robots" content="noindex,nofollow">'), 'thread.html must be noindex,nofollow');
check(!/property="og:|name="twitter:/.test(html), 'thread.html must carry no OGP / twitter card');
check(html.includes('<link rel="stylesheet" href="./release.css">') && html.includes('<link rel="stylesheet" href="./thread.css">') &&
  html.indexOf('./release.css') < html.indexOf('./thread.css'), 'thread.css must load after release.css');
check(html.includes('<title>みんなの感情書店｜スレッド</title>'), 'static <title> must be the generic one (Koenji title is set by thread.js)');
check(html.includes('<body class="thread-page">'), 'body must carry .thread-page');
check(html.includes('id="threadRoot"'), '#threadRoot missing');
{
  const head = html.slice(0, html.indexOf('</head>'));
  check(!/<script/i.test(head), 'no synchronous head JS');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  check(scripts.join('|') === './release_content.js|./growth-improvements.js|./release.js|./analytics-v3.js|./video-embed.js|./thread_content.js|./thread.js',
    `script order must be release_content → growth-improvements → release → analytics-v3 → video-embed → thread_content → thread (got ${scripts.join(', ')})`);
  check((html.match(/<script/g) || []).length === 7, 'exactly seven script tags (video-embed.js added by the Founder decision v2)');
  check(!/<script[^>]*>[^<]*\S[^<]*<\/script>/.test(html), 'no inline script');
}
check(/<noscript>[\s\S]*このスレッドを読むには JavaScript を有効にしてください。[\s\S]*<\/noscript>/.test(html), 'generic noscript message missing');
{
  const body = html.slice(html.indexOf('<body'));
  for (const m of body.match(/(?:src|href)="(https?:)?\/\/[^"]+"/g) || []) failures.push(`thread.html must not reference an external host at runtime: ${m}`);
  for (const t of ['<iframe', '<audio', '<video', '<canvas', '<embed', '<object']) check(!body.includes(t), `thread.html must not embed ${t}`);
  const main = (body.match(/<main[\s\S]*?<\/main>/) || [''])[0];
  check(main.length > 0, '<main> missing');
  check(!main.includes('高円寺'), '<main> of thread.html must carry no Koenji copy (content lives in thread_content.js)');
  check(!/<img/.test(main), '<main> of thread.html must carry no static image (the approved photo is rendered from content)');
}
for (const copy of ['踊りが街に根づくまで', '阿波おどり', '主題：', '徳島', '木場連', '鴨川', '1957', '1961', '1963', '教わる', 'learned_from',
  'パル商店街', '商店街の通り', 'このスレッドは、ここまでです', 'このスレッドはありません', '約15分', '高円寺にいる']) {
  check(!html.includes(copy), `thread.html must not contain Thread body copy: ${copy}`);
}
for (const hook of ['class="skip-link" href="#main"', 'id="siteMenuButton"', 'id="siteMenu"', 'id="siteMenuClose"', 'id="siteMenuFavorites"',
  'class="site-menu-secondary"', 'id="main"', 'id="live"', 'class="site-footer"', 'class="footer-brand"', 'class="brand-lockup-image"',
  'href="./data.html"', 'href="./credits.html"', 'href="./index.html#hc-thread"', 'referrer" content="no-referrer']) {
  check(html.includes(hook), `shell hook missing: ${hook}`);
}
for (const id of ['kichijoji', 'koenji', 'shimokitazawa', 'jinbocho']) check(html.includes(`data-menu-shelf="${id}"`), `menu shelf link missing: ${id}`);

/* ---- 2. content model ------------------------------------------------- */

for (const k of ['threadId', 'title', 'subjectLabel', 'editor', 'lens', 'checkedAt']) check(typeof thread[k] === 'string' && thread[k], `thread.${k} missing`);
for (const k of ['scenes', 'nodes', 'relations', 'sources', 'realityDestinations', 'facts']) check(Array.isArray(thread[k]) && thread[k].length, `thread.${k} must be a non-empty array`);
check(thread.presentReturn && typeof thread.presentReturn === 'object', 'thread.presentReturn missing');
check(/^\d{4}-\d{2}-\d{2}$/.test(thread.checkedAt || ''), 'checkedAt must be YYYY-MM-DD');

const HEADER = {
  eyebrow: '高円寺',
  title: '踊りが街に根づくまで',
  documentTitle: '高円寺｜踊りが街に根づくまで｜みんなの感情書店',
  subjectLabel: '主題：高円寺で受け継がれてきた踊り',
  editor: '編集：みんなの感情書店 編集部',
  lens: 'このThreadでは「教わる／伝わる」に注目しました。',
  checkedAt: '2026-09-04',
  checkedLabel: '最終確認：2026-09-04',
  duration: '約15分'
};
for (const [k, v] of Object.entries(HEADER)) check(thread[k] === v, `thread.${k} must be exactly「${v}」(got ${thread[k]})`);
check(thread.image && thread.image.alt === '夜の高円寺の路上で踊る連。白い衣装の踊り手たち', 'image alt must be the neutral Founder copy');
check(JSON.stringify(thread.guidance) === JSON.stringify(['約15分。いつ止めてもかまいません。', 'アカウント・位置情報・カメラは使いません。', '歩きながら見ないでください。立ち止まれる場所で。']),
  'reading guidance must be the three fixed lines');
/* FOUNDER PREVIEW FIX C1: location mode（remote / onsite）は持たない。 */
check(!('modes' in thread), 'KOENJI must carry no location modes (Founder Preview Fix C1)');
check(!/合図|いるふり|20秒|'remote'|'onsite'|kind: 'cue'/.test(contentCode), 'thread_content.js must carry no cue / mode copy (Founder Preview Fix C)');
/* 所要時間は「約15分」ひとつだけ（10–15分 / 14–16分 などの競合表記を出さない）。
   走査は Koenji thread 自身の copy と renderer / 殻に限る（thread_content.js には Works の
   Morisaki thread も同居し、その「109分」は映画の上映時間であって所要時間ではない）。 */
{
  const durations = new Set();
  for (const src of [JSON.stringify(thread), js, html]) for (const m of src.match(/約?\d+(?:[–\-〜]\d+)?分/g) || []) durations.add(m);
  check(durations.size === 1 && durations.has('約15分'), `duration copy must be exactly 約15分 (found ${[...durations].join(', ') || 'none'})`);
}

/* nodes / sources */
const nodeIds = new Set(thread.nodes.map((n) => n.id));
check(nodeIds.size === thread.nodes.length, 'node ids must be unique');
for (const n of thread.nodes) check(n.type && n.label, `node ${n.id} needs type and label`);
for (const id of ['event:koenji-baka-odori', 'event:koenji-awaodori', 'place:koenji-pal', 'org:koenji-organizers', 'org:kiba-ren', 'org:tokushima-shimbun', 'person:kamogawa-choji']) {
  check(nodeIds.has(id), `node missing: ${id}`);
}
check((byId(thread.nodes, 'person:kamogawa-choji') || {}).type === 'Person', '鴨川長二 must be a Person node');
const sourceIds = new Set();
for (const s of thread.sources) {
  check(s.id && !sourceIds.has(s.id), `source id missing/duplicate: ${s.id}`);
  sourceIds.add(s.id);
  check(typeof s.url === 'string' && /^https:\/\//.test(s.url), `source url must be https and never null: ${s.id}`);
  check(s.name && s.kindLabel && s.kind, `source ${s.id} needs name / kind / kindLabel`);
}
const SUPPLIED_URLS = [
  'https://koenji-awaodori.com/about/his01.html', 'https://suginamigaku.org/2022/11/koenji-awaodori.html',
  'https://www.koenji-awaodori.com/about/about01.html', 'https://koenji-awaodori.com/category1/join.html',
  'https://www.koenji-awaodori.com/about/about05.html', 'https://www.koenji-awaodori.com/about/his04.html',
  'https://koenji-awaodori.com/stage/stage04.html', 'https://www.koenji-pal.jp/about', 'https://www.koenji-pal.jp/access', 'https://koenji-awaodori.com/',
  /* FOUNDER PREVIEW FIX UNIT E: 主催団体の公式映像（Works で承認済みの同じ URL） */
  'https://www.youtube.com/watch?v=dt33RGSRuo0'
];
for (const s of thread.sources) check(SUPPLIED_URLS.includes(s.url), `source url is not in the HQ-supplied set: ${s.url}`);
for (const url of SUPPLIED_URLS) check(thread.sources.some((s) => s.url === url), `HQ-supplied source not recorded: ${url}`);
check((source('src:official-history') || {}).kind === 'official' && (source('src:suginami-gaku') || {}).kind === 'local_archive', 'official-history must be official, suginami-gaku must be local_archive');

/* relations / facts */
const SUPPORT_MODES = ['direct_statement', 'oral_testimony', 'editorial_synthesis'];
const STATES = ['single_source', 'corroborated', 'source_difference', 'unresolved'];
const RELATION_TYPES = ['originated_in', 'connected_with', 'learned_from', 'renamed_to'];
const SPATIAL = ['street_segment', 'area', 'not_applicable'];
const TEMPORAL = ['year', 'year_range', 'day'];
function checkEvidenceItem(item, what) {
  check(Array.isArray(item.supportMode) && item.supportMode.length && item.supportMode.every((m) => SUPPORT_MODES.includes(m)), `${what}: supportMode invalid`);
  check(STATES.includes(item.verificationState), `${what}: verificationState invalid (${item.verificationState})`);
  check(Array.isArray(item.sourceIds) && item.sourceIds.length >= 1, `${what}: every verified/direct claim needs >=1 source (NO EVIDENCE = NO BRIDGE)`);
  for (const id of item.sourceIds || []) check(sourceIds.has(id), `${what}: unknown source ${id}`);
  check(new Set(item.sourceIds || []).size === (item.sourceIds || []).length, `${what}: duplicate sourceIds`);
  check(typeof item.claim === 'string' && item.claim.length > 0, `${what}: claim missing`);
  const t = item.temporal || {};
  check(TEMPORAL.includes(t.resolution) && typeof t.display === 'string' && Array.isArray(t.variants), `${what}: temporal needs resolution / display / variants`);
  /* DISPLAY PRECISION <= EVIDENCE PRECISION */
  if (t.resolution === 'year') check(/^\d{4}$/.test(t.display), `${what}: year resolution must display a bare year (got ${t.display})`);
  if (t.resolution === 'year_range') check(/^\d{4}–\d{2}(\d{2})?$/.test(t.display), `${what}: year_range must display YYYY–YY (got ${t.display})`);
  if (t.resolution === 'year' || t.resolution === 'year_range') check(!/[月日\/]/.test(t.display) && !/\d{4}-\d{2}/.test(t.display), `${what}: year resolution cannot display month/day`);
  if (item.verificationState === 'corroborated') check((item.sourceIds || []).length >= 2, `${what}: corroborated needs >=2 sources`);
  if (item.verificationState === 'source_difference') {
    check(t.resolution === 'year_range' && /–/.test(t.display), `${what}: source_difference requires a range display`);
    check(t.variants.length >= 2, `${what}: source_difference requires >=2 variants`);
    const vs = t.variants.map((v) => v.sourceId);
    check(new Set(vs).size === vs.length && vs.every((id) => (item.sourceIds || []).includes(id)), `${what}: variants must cite distinct sources that the claim lists`);
    check(new Set(item.sourceIds || []).size >= 2, `${what}: source_difference requires distinct source support`);
    for (const v of t.variants) check(v.display && v.reading, `${what}: variant needs display and reading`);
  }
  if (item.verificationState === 'single_source') check((item.sourceIds || []).length === 1, `${what}: single_source must cite exactly one source`);
}
const relIds = new Set();
for (const r of thread.relations) {
  const what = `relation ${r.id}`;
  check(r.id && !relIds.has(r.id), `${what}: id missing/duplicate`);
  relIds.add(r.id);
  check(nodeIds.has(r.from) && nodeIds.has(r.to), `${what}: from/to must be nodes`);
  check(RELATION_TYPES.includes(r.relationType), `${what}: relationType not in the RC set (${r.relationType})`);
  check(typeof r.displayVerb === 'string' && r.displayVerb, `${what}: displayVerb missing`);
  check(r.spatial && SPATIAL.includes(r.spatial.resolution), `${what}: spatial.resolution invalid`);
  if (r.via) check(nodeIds.has(r.via), `${what}: via must be a node`);
  for (const p of r.people || []) check(nodeIds.has(p) && byId(thread.nodes, p).type === 'Person', `${what}: people must be Person nodes`);
  checkEvidenceItem(r, what);
  check(!/reading|interpret|transmission/i.test(r.id + ' ' + r.relationType), `${what}: editorial readings must not be stored as relations`);
}
const factIds = new Set();
for (const f of thread.facts) {
  check(f.id && !factIds.has(f.id), `fact ${f.id}: id missing/duplicate`);
  factIds.add(f.id);
  checkEvidenceItem(f, `fact ${f.id}`);
}
/* 一点・建物・地番・座標は RC に無い */
for (const banned of ['exact_point', 'building', 'parcel', 'latitude', 'longitude', 'coordinates', 'lat:', 'lng:', 'この一点']) {
  check(!contentCode.includes(banned), `content must not carry a pin-level location (${banned})`);
}
check(!/\d{2}\.\d{4,}/.test(contentCode), 'content must not carry decimal coordinates');

/* HQ PATCH: 1957 の主語は koenji-baka-odori、向きは learner → source、名称変更は事実のみ */
{
  const o = thread.relations.filter((r) => r.relationType === 'originated_in');
  check(o.length === 1, 'exactly one originated_in relation');
  const r = o[0] || {};
  check(r.from === 'event:koenji-baka-odori' && r.to === 'place:koenji-pal', '1957 originated_in must be event:koenji-baka-odori → place:koenji-pal');
  check(r.temporal && r.temporal.display === '1957' && r.temporal.resolution === 'year', '1957 originated_in must display 1957 at year resolution');
  check(r.spatial && r.spatial.resolution === 'street_segment' && r.spatial.display === '範囲：商店街の通り（一点ではありません）', '1957 spatial must be street_segment with the fixed display');
  check(r.displayVerb === 'はじまる', '1957 displayVerb must be はじまる');
  check(!thread.relations.some((x) => x.relationType === 'originated_in' && x.from === 'event:koenji-awaodori'), '1957 subject must not be koenji-awaodori (renamed only in 1963)');
}
{
  const l = thread.relations.filter((r) => r.relationType === 'learned_from');
  check(l.length === 1, 'exactly one learned_from relation');
  const r = l[0] || {};
  check(r.from === 'org:koenji-organizers' && r.to === 'org:kiba-ren', 'learned_from direction must be learner koenji-organizers → source kiba-ren');
  check(!thread.relations.some((x) => x.relationType === 'learned_from' && x.from === 'org:kiba-ren'), 'no reversed learned_from (kiba-ren → koenji)');
  check(r.displayVerb === '教わる', 'learned_from displayVerb must be 教わる');
  check(r.verificationState === 'source_difference', 'learned_from must be source_difference');
  check(r.temporal && r.temporal.display === '1961–62' && r.temporal.resolution === 'year_range', 'learned_from must display 1961–62 as year_range');
  check(JSON.stringify(r.sourceIds) === JSON.stringify(['src:official-history', 'src:suginami-gaku']), 'learned_from evidence order must be official first, local archive second');
  check(r.differenceNote === 'どちらが正しいかは、このThreadでは決めていません。資料がそう分かれていることまでが、いま分かっていることです。', 'learned_from differenceNote must be the fixed sentence');
  check((r.people || []).includes('person:kamogawa-choji') && /鴨川長二/.test(r.claim || ''), '鴨川長二 must be referenced as the named teacher');
  check(!/%|％|信頼度|確度/.test(flat(r)), 'no confidence percentages');
}
{
  const c = thread.relations.filter((r) => r.relationType === 'connected_with');
  check(c.length === 1, 'exactly one connected_with relation');
  const r = c[0] || {};
  check(r.from === 'org:koenji-organizers' && r.to === 'org:kiba-ren' && r.via === 'org:tokushima-shimbun', '1961 connection must be koenji-organizers → kiba-ren via tokushima-shimbun');
  check(r.verificationState === 'corroborated' && r.temporal && r.temporal.display === '1961', '1961 connection must be corroborated and display 1961');
  check(/徳島新聞社を介して/.test(r.claim || ''), '1961 connection copy must explain the mediation (徳島新聞社を介して)');
  check(r.displayVerb === 'つながる', '1961 displayVerb must be つながる');
}
{
  const n = thread.relations.filter((r) => r.relationType === 'renamed_to');
  check(n.length === 1, 'exactly one renamed_to relation');
  const r = n[0] || {};
  check(r.from === 'event:koenji-baka-odori' && r.to === 'event:koenji-awaodori', 'renamed_to must be koenji-baka-odori → koenji-awaodori');
  check(r.temporal && r.temporal.display === '1963', 'renamed_to must display 1963');
  check(r.displayVerb === '名を変える', 'renamed_to displayVerb must be 名を変える');
  check(!/教わ|結果|ため|から、/.test(r.claim || ''), 'renamed_to claim must not present the rename as a causal result of being taught');
}
/* 合成 relation は無い */
check(!thread.relations.some((r) => /transmission_reading|editorial_reading/.test(r.relationType + r.id)), 'no synthetic transmission_reading relation in verified relations');
check(!/transmission_reading/.test(contentCode + jsCode), 'transmission_reading must not exist anywhere');

/* ---- 3. scenes S0–S5 ------------------------------------------------ */

const sceneIds = thread.scenes.map((s) => s.id);
check(sceneIds.join('|') === 's0|s1|s2|s3|s4|s5', `scenes must be s0..s5 in order (got ${sceneIds.join(',')})`);
const S = Object.fromEntries(thread.scenes.map((s) => [s.id, s]));
check(S.s0 && S.s0.title === 'いま', 'S0 title must be いま');
check(S.s1 && S.s1.title === '1957 ／ はじまる' && JSON.stringify(S.s1.relationIds) === '["rel:originated-1957"]', 'S1 must be 1957 ／ はじまる with rel:originated-1957');
check(S.s3 && S.s3.title === '1963 ／ 名を変える' && JSON.stringify(S.s3.relationIds) === '["rel:renamed-1963"]', 'S3 must be 1963 ／ 名を変える with rel:renamed-1963');
check(S.s4 && S.s4.title === 'いま、もう一度', 'S4 title must be いま、もう一度');
check(S.s5 && S.s5.title === '現実へ' && S.s5.kind === 'reality', 'S5 must be 現実へ (reality)');
check(S.s3 && S.s3.close === 'いまの名称が最初からあったのではなく、1963年に正式に変わったことが見える。', 'S3 acceptance copy must be the fact-safe sentence');

/* S0: 現在の事実 + 承認済み画像 1 回（cue は無い） */
{
  const s0 = S.s0 || {};
  check(s0.figure === true && thread.scenes.filter((s) => s.figure).length === 1, 'the approved image is used exactly once, in S0');
  check(thread.image && thread.image.src === './assets/home-thread-koenji-awaodori.jpg' && thread.image.alt, 'S0 image must be the approved HOME asset with alt');
  check((contentCode.match(/\.\/assets\//g) || []).length === 1, 'content must reference exactly one local asset');
  check(!/https?:\/\/[^'"]+\.(?:jpg|jpeg|png|webp|gif|svg|mp4|mp3|pdf)/i.test(contentCode), 'content must not reference remote media');
  const f = fact((s0.factIds || [])[0]);
  check(!!f && f.claim === '現在、この催しには40を超える連が活動している。多くの連は、一年を通して練習を続けている。' && JSON.stringify(f.sourceIds) === '["src:official-join"]', 'S0 present fact (40+ groups / practice through the year) must cite the official participation source');
  check(!('cue' in s0), 'S0 carries no cue (Founder Preview Fix C2)');
}
/* S1: 一点ではなく通り */
check(S.s1 && !/この一点|一点から始ま|番地|丁目|\d+月|\d+日/.test(flat(S.s1) + flat(relation('rel:originated-1957'))), 'S1 must not name a point / building / day-month');

/* S2: 五拍（この Thread 固有。AFTER cue は Founder Preview Fix C3 で削除）。REVEAL より前に 教わる / learned_from を出さない */
{
  const s2 = S.s2 || {};
  const beats = s2.beats || [];
  check(beats.map((b) => b.id).join('|') === 'before|encounter|question|evidence|reveal', `S2 beats must be BEFORE → ENCOUNTER → QUESTION → EVIDENCE → REVEAL (got ${beats.map((b) => b.id).join(',')})`);
  check(beats.map((b) => b.kind).join('|') === 'pair|names|question|evidence|reveal', 'S2 beat kinds must be pair / names / question / evidence / reveal (no cue)');
  const revealAt = beats.findIndex((b) => b.id === 'reveal');
  const before = flat(s2.title) + beats.slice(0, revealAt).map(flat).join('');
  check(!/教わ|learned_from|learned/.test(before), 'before REVEAL, S2 copy must not expose 教わる / learned_from');
  const B = Object.fromEntries(beats.map((b) => [b.id, b]));
  check(B.before && (B.before.items || []).length === 2 && !/徳島新聞社|木場連|鴨川/.test(flat(B.before)), 'BEFORE shows only the pre-contact state (no Tokushima Shimbun / Kiba-ren / Kamogawa)');
  check(B.encounter && ['徳島新聞社', '木場連', '鴨川長二'].every((n) => (B.encounter.items || []).some((i) => i.name === n)), 'ENCOUNTER must introduce 徳島新聞社 / 木場連 / 鴨川長二');
  /* HQ LIMITED FIX 01 UNIT A: 木場連 の fact copy（地理的な誤解を招く旧 copy は残さない） */
  check(B.encounter && (B.encounter.items || []).some((i) => i.name === '木場連' && i.text === '徳島県人会で結成された連。'), 'ENCOUNTER 木場連 copy must be「徳島県人会で結成された連。」');
  check(contentCode.split('徳島県人会で結成された連。').length === 2, 'new 木場連 copy must appear exactly once');
  check(!contentCode.includes('徳島の阿波おどりの連。') && !js.includes('徳島の阿波おどりの連。') && !html.includes('徳島の阿波おどりの連。'), 'old 木場連 copy「徳島の阿波おどりの連。」must not exist');
  check(B.question && B.question.line === 'この二つの間に、何が起きた？' && Object.keys(B.question).sort().join() === 'id,kind,label,line', 'QUESTION must be the single line with no answer field / options');
  check(!/正解|不正解|答え|スコア|得点|選択肢|回答/.test(flat(B.question)), 'QUESTION must carry no correct/incorrect/score vocabulary');
  check(B.evidence && (B.evidence.items || []).length === 3 && /手ほどきを求めた/.test(B.evidence.items[0]) && /徳島新聞社を介して/.test(B.evidence.items[1]) && /鴨川長二/.test(B.evidence.items[2]) &&
    JSON.stringify(B.evidence.sourceIds) === '["src:official-history","src:suginami-gaku"]', 'MINIMAL EVIDENCE must be the three contact/instruction facts with both sources');
  check(B.reveal && JSON.stringify(B.reveal.relationIds) === '["rel:connected-1961","rel:learned-1961-62"]', 'REVEAL must show 1961 ／ つながる first, then 1961–62 ／ 教わる');
  check(!B.after && !beats.some((b) => b.kind === 'cue' || b.cue), 'no AFTER cue beat (Founder Preview Fix C3)');
  for (const b of beats) check(!/input|button|select|timer|countdown/i.test(Object.keys(b).join()), `beat ${b.id} must not declare controls`);
}
/* S3 / S4: 読みは scene の editorialReading。relation ではない */
for (const id of ['s3', 's4']) {
  const s = S[id] || {};
  const er = s.editorialReading || {};
  check(typeof er.text === 'string' && er.text.length > 0, `${id} must carry an editorialReading`);
  check(Array.isArray(er.refs) && er.refs.length && er.refs.every((r) => relIds.has(r) || factIds.has(r)), `${id} editorialReading refs must resolve to relations / facts`);
  check(!('verificationState' in er) && !('sourceIds' in er) && !('supportMode' in er), `${id} editorialReading must not carry support state`);
  check(!/編集部の読み/.test(er.text), `${id} editorialReading prose must not carry the visible meta label (Founder decision 2026-09-06 v2)`);
}
check(S.s4 && !('cue' in S.s4) && S.s4.editorialReading, 'S4 carries no cue but keeps its editorial reading (Founder Preview Fix C4)');
/* 合図は歩行を義務にしない */
for (const s of thread.scenes) {
  const cues = [s.cue].concat((s.beats || []).map((b) => b.cue)).filter(Boolean);
  for (const c of cues) check(!/歩/.test(c.remote + c.onsite), `${s.id}: cues must not mandate walking`);
}
/* S5: 現実へ。3 つの行き先、終了した本祭・休止中 plus+ を「これから」にしない、有限の終わり */
{
  const d = thread.realityDestinations;
  check(d.length === 4, 'exactly four reality destinations (three places + the final official video)');
  const want = [
    ['1957の起点を歩く（高円寺パル商店街）', 'https://www.koenji-pal.jp/about'],
    ['現在の連を知る／参加・体験を相談する', 'https://koenji-awaodori.com/category1/join.html'],
    ['現在の公式情報を見る', 'https://koenji-awaodori.com/'],
    ['最後に、現在の公式映像を見る', 'https://www.youtube.com/watch?v=dt33RGSRuo0']
  ];
  want.forEach(([label, url], i) => check(d[i] && d[i].label === label && d[i].url === url, `destination ${i + 1} must be「${label}」→ ${url}`));
  /* FOUNDER PREVIEW FIX UNIT E: 最後の行き先は主催団体の公式映像。歴史の relation は持たず、公式映像 source だけを持つ。
     埋め込み・自動再生・サムネイル・事前読込の token は content にも renderer にも無い。 */
  const video = d[3] || {};
  check(video.id === 'dest:official-video' && video.url === 'https://www.youtube.com/watch?v=dt33RGSRuo0'
    && video.why === 'ここまで辿った踊りが、現在の街の中でどう見えるかを、主催団体の公式映像で確かめます。'
    && video.note === '2025年の催しを伝える、主催団体の公式映像です。'
    && !('relationIds' in video) && !('factIds' in video) && JSON.stringify(video.sourceIds) === '["src:official-video"]', 'final destination must be the approved official video with the exact why / note and only the official-video source');
  /* Founder decision v2（2026-09-06）: 公式映像は click-to-load の inline player。content は video id と、新しく足す唯一の copy「約15分で観終わります。」だけを持つ。 */
  check(video.videoId === 'dt33RGSRuo0' && video.videoTitle === '主催団体の公式映像' && video.watchNote === '約15分で観終わります。', 'final destination carries the inline player data (approved id, neutral title, the single new copy 約15分で観終わります。)');
  check(!/プライバシー|player|プレイヤー|操作|再生ボタン|YouTube/.test([video.label, video.why, video.note, video.watchNote].join(' ')), 'no privacy / provider / player / operating copy is added to the video destination');
  check((source('src:official-video') || {}).kind === 'official' && (source('src:official-video') || {}).url === 'https://www.youtube.com/watch?v=dt33RGSRuo0' && (source('src:official-video') || {}).name === '主催団体の公式映像' && thread.sources.filter((s) => /youtube\.com/.test(s.url)).length === 1, 'exactly one official-video source, with the exact approved YouTube URL and a neutral name');
  check(!/youtube\.com\/embed|youtube-nocookie|ytimg|img\.youtube|autoplay|preload|<iframe|<video/i.test(contentCode) && !/youtube|ytimg|autoplay|<iframe|<video/i.test(js), 'no embed / autoplay / thumbnail / preload token in content or renderer (the player lives in video-embed.js)');
  /* video-embed.js: click-to-load、プライバシー強化モード、自動再生なし、サムネイル / preconnect なし、保存・計測なし */
  {
    const ve = read('video-embed.js');
    check(ve.includes("var PROVIDER = 'https://www.youtube-nocookie.com/embed/';") && ve.includes("'?playsinline=1&rel=0'") && !/autoplay=1/.test(ve), 'video-embed.js embeds youtube-nocookie without autoplay');
    check(ve.includes("addEventListener('click'") && ve.includes("iframe.referrerPolicy = 'strict-origin-when-cross-origin'") && ve.includes("iframe.allow = 'encrypted-media; picture-in-picture; fullscreen'"), 'video-embed.js click gate / referrer / allow list');
    for (const t of ['ytimg', 'img.youtube', 'preconnect', 'preload', 'prefetch', 'iframe_api', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'geolocation', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'setTimeout', 'setInterval', 'gtag', 'dataLayer', "'autoplay"]) check(!ve.includes(t), `video-embed.js must not contain ${t}`);
    check(html.indexOf('<script src="./video-embed.js"></script>') > 0 && html.indexOf('<script src="./video-embed.js"></script>') < html.indexOf('<script src="./thread.js"></script>'), 'thread.html loads video-embed.js before thread.js');
    check(js.includes("window.V3_VIDEO_EMBED.mount(root)") && js.includes("'data-video-id': d.videoId"), 'renderer mounts the shared click-to-load player on the video destination');
  }
  /* Production Beta 0: 高円寺 Thread から /atlas/ への bounded entry（1 箇所）。HOME / Works は Atlas 化しない。 */
  check(JSON.stringify(thread.spatialEntry) === JSON.stringify({ href: './atlas/', label: '街を立体で辿る（β）', note: 'Project PLATEAUの3D都市モデル（杉並区 2025年度）から取り出した、現在の街の形の上で、この関係をもう一度辿ります。' }), 'one bounded Atlas entry with the exact label / note');
  check(read('atlas/index.html').includes('<meta name="robots" content="noindex,nofollow">') && !read('sitemap.xml').includes('atlas') && !home.includes('atlas') && !read('works.html').includes('atlas'), 'Atlas is noindex, off the sitemap, and not linked from HOME / Works');
  /* Founder decision v2: 公開 UI に「編集部の読み」の label を出さない（描画される文字列に 0） */
  check(!JSON.stringify(CONTENT, (k, v) => (k === 'url' || k === 'src' ? '' : v)).includes('編集部の読み'), 'no visible 編集部の読み in rendered Thread strings');
  check(d.slice(0, 3).every((x) => Array.isArray(x.relationIds) && x.relationIds.length), 'the three place destinations keep their Thread relations');
  for (const x of d.slice(0, 3)) {
    check(/^https:\/\//.test(x.url), `destination ${x.id} must be https`);
    check(Array.isArray(x.relationIds) && x.relationIds.length && x.relationIds.every((r) => relIds.has(r)), `destination ${x.id} must explain its relation to the Thread`);
    check(typeof x.why === 'string' && x.why, `destination ${x.id} needs a why`);
    check(!/stage04/.test(x.url), 'plus+ must not be an active destination');
  }
  check(/一点には特定していません/.test(d[0].note || '') && /必須ではありません/.test(d[0].note || ''), 'destination A must not name an exact origin point nor mandate walking');
  check(/連ごとに異なります/.test(d[1].note || ''), 'destination B must not imply the same recruitment conditions across groups');
  const notes = (thread.presentReturn.notes || []);
  const ended = notes.find((n) => n.status === 'ended');
  check(!!ended && /2026年の本祭/.test(ended.text) && /8月29日・30日/.test(ended.text) && /終了/.test(ended.text), 'the 2026 main festival (Aug 29–30) must be shown as ended');
  check(!!ended && ended.temporal && ended.temporal.resolution === 'day' && ended.checkedAt === thread.checkedAt, 'ended note must carry day resolution and the checkedAt context');
  check(!!ended && (ended.sourceIds || []).length && ended.sourceIds.every((id) => source(id) && /^https:\/\//.test(source(id).url)), 'ended note must cite the verified official date source (https), never a null-URL source');
  const plus = notes.find((n) => n.status === 'suspended');
  check(!!plus && /plus\+/.test(plus.text) && /休止/.test(plus.text) && (plus.sourceIds || []).includes('src:official-plus'), 'plus+ suspension must be stated with the official plus+ source');
  check(!/開催予定|これから開催|まもなく|今年の本祭は\d/.test(contentCode), 'no upcoming-festival claim');
  check(thread.presentReturn.lead === 'いま辿った文化の続きを、現実で触れる。', 'S5 lead must be the fixed sentence');
  check(thread.ending && thread.ending.line === 'このスレッドは、ここまでです。' && thread.ending.exitLabel === '入口へ戻る' && thread.ending.exitHref === './index.html', 'finite end must be このスレッドは、ここまでです。 + 入口へ戻る');
  check(!/related|nextEpisode|recommend|次回|関連スレッド/.test(contentCode), 'no related threads / recommendation / next episode');
}

/* ---- 3b. NAME AVOIDANCE（Founder no-inquiry decision 2026-09-06）------------
   保護名・類似名（東京高円寺阿波おどり / 高円寺阿波おどり / 高円寺阿波踊り）を自分たちの
   user-facing surface に出さない。URL / asset filename / Commons File 名は provenance として除く。
   一般的な踊りの種類としての「阿波おどり」は可。 */
{
  const FORBIDDEN = ['東京高円寺阿波おどり', '高円寺阿波おどり', '高円寺阿波踊り'];
  const provenanceFree = (s) => s.replace(/https?:\/\/[^\s"'<>)]+/g, '').replace(/[\w.-]+\.(?:jpg|jpeg|png|webp|svg)\b/g, '').replace(/File:[^"'<>\s]+/g, '');
  const rendered = JSON.stringify(CONTENT, (k, v) => (k === 'url' || k === 'src' ? '' : v));
  for (const [name, text] of [['thread_content.js (rendered strings)', rendered], ['thread_content.js (whole file)', contentCode], ['thread.html', html], ['index.html', home], ['credits.html', credits], ['works.html', read('works.html')]]) {
    const hits = FORBIDDEN.filter((t) => provenanceFree(text).includes(t));
    check(hits.length === 0, `NAME AVOIDANCE: ${name} must not carry the protected / similar event name (${hits.join(' / ')})`);
  }
  check(!/thread=koenji-awaodori\b/.test(home + html + read('works.html') + credits), 'old public route thread=koenji-awaodori must be 0 on public surfaces');
  check((byId(thread.nodes, 'event:koenji-awaodori') || {}).label === '現在の踊り', 'current event node label must be the neutral「現在の踊り」(node id stays internal)');
  const rel = thread.relations.find((r) => r.id === 'rel:renamed-1963') || {};
  check(rel.claim === '1963年、「高円寺ばか踊り」の正式名称が、現在使われている名称へ変わった。' && rel.from === 'event:koenji-baka-odori' && rel.to === 'event:koenji-awaodori', '1963 claim must be the neutral Founder copy, on the same nodes');
  const NEUTRAL_SOURCE_NAMES = {
    'src:official-history': '主催団体 公式サイト（歴史資料）', 'src:suginami-gaku': 'すぎなみ学倶楽部（高円寺の踊り）', 'src:official-about': '主催団体 公式サイト（団体について）',
    'src:official-join': '主催団体 公式サイト（参加案内）', 'src:official-archive': '主催団体 公式サイト（アーカイブ）', 'src:official-anniversary': '主催団体 公式サイト（周年アーカイブ）',
    'src:official-plus': '主催団体 公式サイト（plus+）', 'src:official-home': '主催団体 公式サイト', 'src:official-video': '主催団体の公式映像'
  };
  for (const [id, name] of Object.entries(NEUTRAL_SOURCE_NAMES)) check((source(id) || {}).name === name, `source ${id} name must be the neutral「${name}」(got ${(source(id) || {}).name})`);
  check(thread.sources.every((s) => !/主催|公式/.test(s.name) || /^主催団体/.test(s.name) || /koenji-pal/.test(s.id)), 'official-domain sources are labelled 主催団体 …, never the event name');
}

/* ---- 4. renderer（thread.js）------------------------------------------ */

check(!/beats\.length\s*[!=<>]=?=?\s*\d|beats\[\s*\d\s*\]/.test(js), 'renderer must not require a fixed number of beats (six is Koenji-specific)');
check(/\(scene\.beats \|\| \[\]\)\.forEach/.test(js), 'renderer must iterate scene.beats generically');
{
  const fn = (name) => {
    const at = js.indexOf(`function ${name}(`);
    if (at < 0) return '';
    const next = js.indexOf('\n  function ', at + 1);
    return js.slice(at, next < 0 ? js.length : next);
  };
  const reading = fn('readingBlock');
  check(reading.length > 0, 'renderer must have readingBlock');
  for (const t of ['th-fact-badge', 'th-claim', 'th-support', 'data-verification', 'th-relation', 'th-fact', 'factBadge(', 'supportBlock(']) {
    check(!reading.includes(t), `readingBlock must not inherit fact / support styling (${t})`);
  }
  check(reading.includes("'data-layer': 'reading'") && !reading.includes('th-reading-label') && !js.includes('編集部の読み'), 'readingBlock marks the reading layer without a visible label (Founder decision v2)');
  const claim = fn('claimBlock'), support = fn('supportBlock');
  check(claim.includes("'data-layer': 'claim'") && support.includes("'data-layer': 'support'"), 'claim / support blocks must be DOM-separated layers');
  check(js.includes("beat.kind === 'question'") && /beat\.kind === 'question'\) body\.push\(h\('p', \{ class: 'th-question', text: beat\.line \}\)\)/.test(js), 'question beat must render as a single paragraph');
  check((js.match(/h\('input'/g) || []).length === 1 && fn('modeFieldset').includes("h('input'"), 'the only input the renderer creates is the mode radio');
  check((js.match(/h\('button'/g) || []).length === 1 && js.includes("h('button', { class: 'v3-video-load th-video-load', type: 'button' }") && !/h\('select'|h\('form'|h\('textarea'/.test(js), 'renderer creates exactly one button: the click-to-load video control (no select / form / textarea)');
  check(js.includes("'※並び順は、資料の正しさの順位ではありません。'"), 'evidence drawer must carry the ordering note');
  /* HQ LIMITED FIX 01 UNIT B: DISCOVERY CAN BE LIGHT. VERIFICATION MUST REMAIN DEEP.
     default surface は verificationState だけで決まり、Evidence data は drawer に全部残る。 */
  const isDeep = fn('isDeep'), drawer = fn('evidenceDrawer'), supportFn = fn('supportBlock');
  check(/source_difference/.test(isDeep) && /unresolved/.test(isDeep) && !/single_source|corroborated/.test(isDeep), 'light default surface must be keyed on verificationState (source_difference / unresolved stay deep)');
  check(supportFn.includes('deep ? verificationLine(item) : null') && !supportFn.includes('supportModeLine('), 'support block must show the verification line on the surface only for deep items, never the support mode');
  check(drawer.includes('if (!deep) children.push(verificationLine(item));') && drawer.includes('children.push(supportModeLine(item));'), 'verification state and support mode must remain inside the drawer for light items (evidence depth kept)');
  check(js.includes("text: '出典あり'") && js.includes("'th-evidence-flag'") && js.includes("'th-evidence-open'"), 'light closed surface must read 出典あり　資料を見る（N件）');
  check(!js.includes('th-fact-badge') && !js.includes('factBadge('), 'no fact badge on the default surface');
  check(fn('claimBlock').includes("'th-claim-text'") && !fn('claimBlock').includes('badge'), 'claim block must be the claim text only');
  check(drawer.includes("'th-order-note'") && drawer.includes("'th-difference-note'") && drawer.includes('sourceCard(source, variant)'), 'drawer must keep source cards / order note / difference note');
  check(js.includes("'このスレッドはありません。'") && js.includes("'入口へ戻る'"), 'fail-closed copy must be generic');
  check(js.includes("'みんなの感情書店｜スレッド'"), 'fail-closed title must be generic');
  check(/検証状態：資料間に年次差/.test(js) && /検証状態：単一資料/.test(js), 'verification labels must be rendered as 検証状態：…');
  check(js.includes("target: '_blank'") && js.includes("rel: 'noopener noreferrer'"), 'external links must open with noopener noreferrer');
  for (const cls of ['official-action', 'shelf-entry', 'result-link', 'open-button', 'sg-copy', 'sg-form']) check(!js.includes(cls) && !html.includes(cls), `thread must not reuse the analytics-bearing class ${cls}`);
}
for (const t of ['高円寺', '阿波おどり', '徳島', '1957', '1961', '1963', '木場連', '鴨川', 'パル商店街']) check(!jsCode.includes(t), `renderer must not carry Koenji copy (${t}) — content lives in thread_content.js`);

/* ---- 5. no storage / no permissions / no network / no timers ---------- */

for (const [name, src] of [['thread.js', jsCode], ['thread_content.js', contentCode], ['thread.html', htmlCode]]) {
  for (const t of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'geolocation', 'getUserMedia', 'mediaDevices', 'fetch(', 'XMLHttpRequest',
    'WebSocket', 'sendBeacon', 'EventSource', 'importScripts', 'import(', 'Notification', 'vibrate', 'DeviceOrientation', 'DeviceMotion', 'requestAnimationFrame',
    'setTimeout', 'setInterval', 'pushState', 'replaceState', 'gtag', 'dataLayer', 'ServiceWorker', 'serviceWorker', 'Worker(', '<iframe', '<audio', '<video', '<canvas', 'getContext(']) {
    check(!src.includes(t), `${name} must not contain ${t}`);
  }
}
/* Measurement v0.4: analytics-v3.js knows the Thread only as bounded ids (koenji_dance_history / morisaki_book / morisaki_film, stages s0–s5 / w0–w5).
   It never reads Thread text, titles, sources or destinations into a param; only the route → id map and hostname-only link_domain. */
check(analytics.includes("'koenji-dance-history': 'koenji_dance_history'") && analytics.includes("root.querySelector('.th-thread[data-thread-id]')") && analytics.includes(".th-scene[data-scene]") && analytics.includes("sendBounded('v3_thread_stage', 'thread_stage', composite)") && analytics.includes("'koenji_dance_history:s0': true") && !/\bs0: true|\bw0: true/.test(analytics) && !/textContent|innerText|\.title\b|data-video-id|dt33RGSRuo0/.test(analytics), 'analytics-v3.js measures the Thread by the rendered thread id, composite stage ids (thread:stage) and reach only (no text / title / video id)');
check(!analytics.includes('koenji_awaodori') && !/高円寺|阿波|徳島|木場連|パル/.test(analytics), 'analytics-v3.js carries no Koenji copy or the retired id');
check(/v3_home_view: true,\s*v3_shelf_open: true,\s*v3_shelf_view: true,\s*v3_detail_open: true,\s*v3_official_action: true,\s*v3_suggest_view: true,\s*v3_suggest_copy: true,\s*v3_suggest_form_open: true,\s*v3_entry_open: true,\s*v3_works_section_view: true,\s*v3_thread_start: true,\s*v3_thread_stage: true,\s*v3_thread_complete: true,\s*v3_evidence_open: true,\s*v3_external_open: true,\s*v3_continue_open: true,\s*v3_media_preview_open: true/.test(analytics), 'GA4 allowed events must be the eight Beta events + the nine Measurement v0.4 events, in this order');

/* ---- 6. thread.css: Thread selector に閉じる・動かない・影を持たない ---- */

const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
for (const banned of ['animation', 'transition', '@keyframes', 'box-shadow', 'text-shadow', 'backdrop-filter', 'transform', 'sticky', 'parallax', 'canvas', '@import', 'url(']) {
  check(!cssRules.includes(banned), `thread.css must not use ${banned}`);
}
{
  const bare = cssRules.replace(/@[^{]*\{/g, '');
  for (const m of bare.matchAll(/([^{}@;]+)\{/g)) {
    const sel = m[1].split(/[{}]/).pop().trim();
    if (!sel || /^\d/.test(sel)) continue;
    for (const one of sel.split(',').map((x) => x.trim()).filter(Boolean)) {
      if (!/^(\.thread-page\b|\.th-)/.test(one)) failures.push(`thread.css leaks outside Thread selectors: ${one}`);
    }
  }
  check(/\.th-reading \{[^}]*dashed/.test(css), 'editorial reading must be visibly distinct from fact boxes (dashed), including under forced colors');
  check(!cssRules.includes('.th-fact-badge') && cssRules.includes('.th-support-light') && cssRules.includes('.th-support-deep') && cssRules.includes('.th-evidence-flag'), 'thread.css must style the light / deep support surfaces without fact badges');
  check(!/\.th-reading-label/.test(css), 'no visible reading-label rule remains (Founder decision v2)');
  check(/\.th-video-frame \{[^}]*aspect-ratio: 16 \/ 9/.test(css) && /\.th-video-load \{[^}]*min-height: 44px/.test(css) && /\.th-spatial-link \{[^}]*min-height: 44px/.test(css), 'inline player frame is 16:9 with 44px+ controls; Atlas entry is a 44px+ link');
  check(/forced-colors: active/.test(css) && /prefers-reduced-motion/.test(css) === false, 'thread.css must handle forced colors and needs no motion guard (nothing moves)');
  check(/min-height: 44px/.test(css), 'real controls must be at least 44px tall');
}

/* ---- 7. HOME の接続: hold 3 + 実 anchor 1（+ Works の実 anchor 4） --------- */

{
  const anchor = '<a class="hc-thread-read" href="./thread.html?thread=koenji-dance-history">スレッドを読む<span class="hc-thread-read-mark" aria-hidden="true">→</span></a>';
  check(home.split(anchor).length === 2, 'HOME section 4 must carry the real Thread anchor exactly once');
  check(!home.includes('data-route-hold="thread-koenji-awaodori"'), 'the thread-koenji-awaodori hold must be gone');
  /* FOUNDER PREVIEW FIX A1 / A5: hero の スレッドを見る も同じ Thread への実 anchor。route hold は 0。 */
  check(!home.includes('data-route-hold'), 'HOME must carry no route hold');
  check(home.split('<a class="hc-hero-cta" href="./thread.html?thread=koenji-dance-history">').length === 2, 'HOME hero スレッドを見る must be a real anchor to the Koenji Thread, exactly once');
  check((home.match(/thread\.html/g) || []).length === 2, 'HOME must link the Thread route exactly twice (hero + section 4)');
  const rule = (releaseCss.match(/\.hc-thread-read \{[^}]*\}/) || [''])[0];
  for (const decl of ['display: flex;', 'align-items: flex-end;', 'justify-content: flex-end;', 'gap: 14px;', 'height: 44px;', 'margin: 0;', 'font-size: 13px;', 'line-height: 1;', 'letter-spacing: .04em;', 'color: #d8cdbb;', 'text-decoration: none;']) {
    check(rule.includes(decl), `.hc-thread-read must keep the proven 44px geometry (${decl})`);
  }
  const mobile = releaseCss.slice(releaseCss.indexOf('@media (max-width: 767px) {'));
  check(/\.hc-thread-read \{ margin-top: -7px; \}/.test(mobile), 'mobile .hc-thread-read must use margin-top: -7px');
  check(releaseCss.includes('.home-canonical .hc-thread-read:focus-visible'), 'HOME focus group must include .hc-thread-read');
}

/* ---- 8. 権利: 使用場所の記録 / 新しい画像は無い ------------------------ */

{
  const entry = (credits.match(/<article class="credits-entry" data-credit-asset="home-thread-koenji-awaodori\.jpg">[\s\S]*?<\/article>/) || [''])[0];
  check(entry.length > 0, 'credits.html entry for the Koenji photo missing');
  const usage = (entry.match(/<dt>使用場所<\/dt><dd>([^<]*)<\/dd>/) || ['', ''])[1];
  check(/トップ（いま辿れるスレッド）/.test(usage) && /スレッド（高円寺）/.test(usage), `credits usage location must include スレッド（高円寺）(got ${usage})`);
  for (const keep of ['Lucertola', 'https://commons.wikimedia.org/wiki/File:KoenjiAwaOdori.jpg', 'パブリックドメイン', '#Licensing']) check(entry.includes(keep), `credits rights record must stay intact (${keep})`);
  check(!read('sitemap.xml').includes('thread'), 'sitemap must not list the Thread');
  check(read('qa/link_check.js').includes('thread_content.js'), 'link_check must include Thread sources / destinations');
}

/* ---- 9. 禁止語（宣伝・ゲーム化） --------------------------------------- */

{
  const text = [contentCode, jsCode, htmlCode, cssRules].join('\n');
  const BANNED = ['次の3つ', 'また見たい', 'おすすめ', 'あなた向け', 'ランキング', '人気', 'トレンド', 'NEW', 'TRENDING', 'FOR YOU', '見終わりました',
    'スタンプ', 'ポイント', 'スコア', '正解', '不正解', 'クリア', 'レベル', 'ミッション', 'チャレンジ', 'バッジ', '達成', 'ストリーク', 'シェア', 'フォロー',
    'いいね', 'ログイン', '会員', 'ダウンロード', 'アプリ', '限定', '今だけ', 'カウントダウン', '次へ', 'つづきはこちら', 'クイズ', '診断', '気分', 'あなたに合う'];
  for (const w of BANNED) check(!text.includes(w), `thread runtime must not contain: ${w}`);
  for (const re of [/\bAR\b/, /\bGPS\b/, /\bquiz\b/i, /\bscore\b/i, /\bstreak\b/i, /\branking\b/i]) check(!re.test(text), `thread runtime must not contain: ${re}`);
}

/* ---- 10. WORKS CROSS-MEDIA PROOF: Morisaki Thread（Book-first / Film-first）を独立に固定 ----
   上の Koenji の契約はそのまま（KOENJI object は byte 単位で不変）。ここでは
   同じ renderer が Morisaki を「mode fieldset なし・孤立 separator なし・同一 graph・
   入口順だけ違う・W4 再読・Reality Return・有限の終わり」で描けることを見る。
   深い data 検査（逐語 copy / 語彙 / Yaguchi / 外部 destination）は qa/works_check.js。 */
{
  const book = CONTENT.threads.find((t) => t && t.threadId === 'morisaki-book');
  const film = CONTENT.threads.find((t) => t && t.threadId === 'morisaki-film');
  check(!!book && !!film, 'thread_content.js must expose morisaki-book and morisaki-film next to koenji-dance-history');
  check(CONTENT.threads.length === 3 && CONTENT.threads[0] === thread, 'KOENJI stays first; exactly three threads');
  if (book && film) {
    const same = (k) => book[k] === film[k];
    check(same('nodes') && same('facts') && same('relations') && same('sources'), 'Morisaki Book / Film must share nodes / facts / relations / sources by reference');
    check(book.nodes !== thread.nodes && book.relations !== thread.relations && book.sources !== thread.sources && book.facts !== thread.facts, 'Morisaki graph must not alias the KOENJI graph');
    for (const t of [book, film]) {
      check(!('modes' in t) && !('image' in t) && !('duration' in t) && !('spatialEntry' in t), `${t.threadId}: no modes / image / duration / Atlas entry`);
      check(t.relations.every((r) => !('temporal' in r)), `${t.threadId}: relations carry no temporal (no fake temporal, no orphan separator)`);
      check(t.relations.every((r) => Array.isArray(r.sourceIds) && r.sourceIds.length >= 1 && r.sourceIds.every((id) => t.sources.some((s) => s.id === id))), `${t.threadId}: NO EVIDENCE = NO BRIDGE`);
      check(t.scenes.map((s) => s.id).join('|') === 'w0|w1|w2|w3|w4|w5', `${t.threadId}: scenes w0..w5`);
      check(!t.scenes.some((s) => s.cue || s.figure || (s.beats || []).some((b) => b.cue || b.kind === 'cue' || b.kind === 'reveal' || b.kind === 'chain')), `${t.threadId}: no cue / figure / reveal / chain beats`);
      const w4 = t.scenes.find((s) => s.id === 'w4') || {};
      check((w4.beats || []).length === 1 && w4.beats[0].kind === 'pair' && w4.editorialReading && Array.isArray(w4.editorialReading.refs) && w4.editorialReading.refs.every((r) => t.relations.some((x) => x.id === r)), `${t.threadId}: W4 re-read uses the existing pair primitive and an editorial reading whose refs resolve`);
      check(t.ending && t.ending.line === 'このスレッドは、ここまでです。' && t.ending.exitHref === './works.html' && t.ending.exitLabel === '作品の入口へ戻る', `${t.threadId}: finite end returns to works.html`);
      check(t.realityDestinations.length === 3 && t.realityDestinations.every((d) => /^https:\/\//.test(d.url)), `${t.threadId}: three https destinations`);
      check(t.realityDestinations.filter((d) => d.editorialExample).every((d) => !('why' in d) && !('relationIds' in d) && d.note), `${t.threadId}: editorial example destination carries note only (no why prefix, no relation)`);
    }
    const pairOf = (t) => JSON.stringify(((t.scenes[0].beats || [])[0] || {}).items || []);
    check(pairOf(book) !== pairOf(film) && JSON.stringify(book.scenes.slice(2)) === JSON.stringify(film.scenes.slice(2)), 'entry order differs (W0 pair) while W2–W5 are identical');
    check(book.relations.filter((r) => r.relationType === 'adapted_as').length === 1 && !book.relations.some((r) => r.relationType === 'adapted_from'), 'one adapted_as edge, no adapted_from');
    check(!contentCode.includes('kind: \'chain\'') && !jsCode.includes('chain'), 'no chain beat kind anywhere');
  }
  /* renderer: R-01 timeless header / R-02 null fieldset — Koenji の描画は変えない */
  const fnAt = (name) => { const at = js.indexOf(`function ${name}(`); if (at < 0) return ''; const next = js.indexOf('\n  function ', at + 1); return js.slice(at, next < 0 ? js.length : next); };
  check(/rel\.temporal \? \[/.test(fnAt('relationCard')) && /\] : \[\s*h\('span', \{ class: 'th-relation-verb', text: rel\.displayVerb \}\)\s*\]/.test(fnAt('relationCard')), 'relationCard renders TIME ／ VERB only with temporal, VERB alone without');
  check(fnAt('modeFieldset').includes('if (options.length === 0) return null;'), 'modeFieldset returns null without options (no empty fieldset)');
}

if (failures.length) {
  console.error('THREAD_CHECK_FAIL');
  for (const f of failures) console.error('- ' + f);
  process.exit(1);
}
console.log('THREAD_CHECK_GO');
console.log(`thread=${thread.threadId}; scenes=${thread.scenes.length}; relations=${thread.relations.length}; facts=${thread.facts.length}; sources=${thread.sources.length} (all https); destinations=${thread.realityDestinations.length}; S2 beats=${(S.s2.beats || []).length}; HOME route holds=0 + hero anchor + section-4 anchor + 4 works anchors; storage/permissions/network tokens=0`);
