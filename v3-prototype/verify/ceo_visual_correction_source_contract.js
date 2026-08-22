/* CEO Visual Correction Round — dependency-free source contract */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const SNAPSHOT_MANIFEST = path.join(
  REPO, 'outputs/V3_CEO_VISUAL_CORRECTION_2026-08-21/snapshot/PRECHANGE_SOURCE_MANIFEST.json'
);
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}
function read(rel) { return fs.readFileSync(path.join(SRC, rel), 'utf8'); }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function git(...args) { return cp.execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim(); }
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

const app = read('js/app.js');
const css = read('css/v3.css');
const html = read('index.html');
const data = read('js/data.js');
const manifest = JSON.parse(read('assets/canonical-m01-w01/ASSET_MANIFEST.json'));
const pre = JSON.parse(fs.readFileSync(SNAPSHOT_MANIFEST, 'utf8'));
const preByPath = new Map(pre.files.map((item) => [item.path, item]));

check('branch exact', git('branch', '--show-current') === 'codex/v3-99-canonical-rebuild');
check('HEAD exact', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('origin/main exact', git('rev-parse', 'origin/main') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('index.html byte-identical', sha(path.join(SRC, 'index.html')) === preByPath.get('v3-prototype/index.html').sha256);
for (const rel of ['js/data.js', 'js/store.js', 'js/personalize.js']) {
  check(`${rel} byte-identical`, sha(path.join(SRC, rel)) === preByPath.get(`v3-prototype/${rel}`).sha256);
}
check('package/lock absent', !fs.existsSync(path.join(SRC, 'package.json')) && !fs.existsSync(path.join(SRC, 'package-lock.json')));

new vm.Script(app, { filename: 'app.js' });
new vm.Script(data, { filename: 'data.js' });
check('app/data syntax', true);
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
check('CSS brace balance', (cssNoComments.match(/\{/g) || []).length === (cssNoComments.match(/\}/g) || []).length);

const expectedSteps = {
  'm01_step_01.png': [90, 1300, 135, 145, 20836, 'f5ca12b16f08c4f0d770ef60ce71636a9aed3a1be07d12d1db3495720a46065c'],
  'm01_step_02.png': [295, 1300, 135, 145, 20000, '5bc3d881b5e3d01e911f9826c88b8567917bd5d6e82f096d2f02e8c9f4efe504'],
  'm01_step_03.png': [500, 1300, 135, 145, 20594, '45a587caeeaad138006f664d85303f3df9188394128e545b49e88c83464d8ddc'],
  'm01_step_04.png': [700, 1300, 135, 145, 19503, 'b19e3a22b3f25c2323a3300b59c17cab1a8e0aae14501c439c17b092bbacde73']
};
for (const [name, expected] of Object.entries(expectedSteps)) {
  const item = manifest.assets.find((asset) => path.basename(asset.local_path) === name);
  const file = path.join(SRC, 'assets/canonical-m01-w01', name);
  const dim = pngSize(file);
  check(`${name} manifest entry`, Boolean(item));
  check(`${name} clean crop`, JSON.stringify(item.crop_xywh) === JSON.stringify(expected.slice(0, 4)));
  check(`${name} dimensions`, dim.width === 135 && dim.height === 145 && item.output_width === 135 && item.output_height === 145);
  check(`${name} bytes`, fs.statSync(file).size === expected[4] && item.bytes === expected[4]);
  check(`${name} SHA-256`, sha(file) === expected[5] && item.sha256 === expected[5]);
  check(`${name} same Canonical source`, item.source_canonical_sha256 === '89d8306b168f1ab4ae354b87ba6bcf22f1571fa6c1d52a53f363fa03e1e51c3e');
}
check('M01 clean assets stay in canonical directory', !/assets\/reference\/(m01|w01)/.test(app));
for (const token of [
  '.entrance .display {', 'font-weight: 500;', 'width: min(72vw, 672px);',
  'min-height: clamp(58px, 9vw, 92px);'
]) check(`M01 correction CSS: ${token}`, css.includes(token));

const flowCopy = [
  '体験の流れ', '感じていることから、次に触れるものを見つけるまで。',
  '感情の言葉をひとつ選ぶ', '正解はありません。いまの自分に近い言葉を、出会いの入口にします。',
  '3つの体験を見る', '本、映画、場所などから、少しずつ角度の違う3つの体験を置きます。',
  '気になるものに触れる', 'すぐに触れる、あとで予定する、今回は選ばない。決めるのはあなたです。',
  '残ったものを、必要なら残す', '体験のあとに自分の中に残ったものを、必要なら自分の記録として残せます。'
];
const faqCopy = [
  '登録は必要ですか？', '登録しなくても利用できます。V3 Beta0の基本体験は、アカウントを作らずに使える設計です。',
  '感情の言葉は診断ですか？', 'いいえ。感情の言葉は出会いの入口です。正解を決めたり、あなたの状態を判定したりするものではありません。',
  '選んだ言葉はあとから変えられますか？', 'はい。あとから選び直せます。「まだ名前がない」も、ひとつの正式な選択肢です。',
  '自分の記録は公開されますか？', '自分の記録は公開を前提に扱いません。現在のBeta0では、この端末で扱うことを基本にしています。',
  'AIが自分の本文を読みますか？', '現在のBeta0では、privateな本文を外部AIへ送る設計にはしません。',
  '位置情報は自動で使われますか？', '現在のBeta0では、自動で位置情報を取得しません。将来利用する場合も、本人が明示的に選べることを前提にします。'
];
for (const copy of flowCopy.concat(faqCopy)) check(`W01 exact copy: ${copy}`, app.includes(copy));
check('W01 flow heading focus target', app.includes("id: 'experience-flow', tabindex: '-1'"));
check('W01 FAQ heading focus target', app.includes("id: 'faq', tabindex: '-1'"));
check('W01 runtime destination #experience-flow', app.includes("setAttribute('href', '#experience-flow')"));
check('W01 runtime destination #faq', app.includes("setAttribute('href', '#faq')"));
check('W01 target receives focus', app.includes('target.focus({ preventScroll: true })'));
check('W01 finite FAQ count 6', (app.match(/question: '/g) || []).length === 6);
check('W01 flow count 4', (app.match(/copy: '/g) || []).length >= 4 && app.includes('EXPERIENCE_FLOW_ITEMS.map'));
check('W01 closed primary CTA remains exactly one', (app.match(/class: 'btn btn-primary cta-primary'/g) || []).length === 1);
check('W01 MENU remains 4 items', [...html.matchAll(/class="site-nav-link"[^>]*>([^<]+)</g)].length === 4);
check('W01 no accordion/modal', !app.includes("h('details'") && !app.includes("h('dialog'"));
check('W01 editorial desktop-only', css.includes('.w01-editorial-section { display: none; }') && /@media \(min-width: 1200px\)[\s\S]*?\.w01-editorial-section \{[\s\S]*?display: block;/.test(css));

const dataContext = { window: {} };
vm.runInNewContext(data, dataContext, { filename: 'data.js' });
const emotions = dataContext.window.V3_DATA.EMOTIONS;
check('M02 exact 8 emotions', emotions.length === 8);
for (const emotion of emotions) {
  check(`M02 continuous description: ${emotion.label}`,
    typeof emotion.description === 'string' && !/[\r\n]/.test(emotion.description) && !/<br\s*\/?\s*>/i.test(emotion.description));
}
const emotionSource = (app.match(/function surfaceEmotion\(\)[\s\S]*?function surfaceUnderstanding\(\)/) || [''])[0];
check('M02 <br> absent', !/<br\b|h\(['"]br['"]/.test(emotionSource));
for (const sentence of [
  'いまのあなたに、いちばんしっくりくる言葉をひとつ選んでください。',
  'どの言葉もしっくりこないときは、「まだ名前がない」を選んでも大丈夫です。',
  '選んだ言葉は、あなただけの手がかりとして使われます。'
]) check(`M02 sentence is one text value: ${sentence}`, emotionSource.includes(`text: '${sentence}'`));
check('W02 heading mass', css.includes('font-size: 40px;') && css.includes('font-weight: 500;'));
check('W02 common card rows', css.includes('grid-template-rows: 36px minmax(78px, auto);'));
check('W02 leaf blend treatment', css.includes('mix-blend-mode: multiply;') && css.includes('opacity: 0.82;'));

for (const token of [
  'padding-inline: clamp(18px, 5.13vw, 22px);', '.m03-card-media { border-radius: inherit; }',
  '.m03-address > span:last-child { min-width: 0; overflow-wrap: anywhere; }',
  '.m03-fact dd { font-weight: 500; }', '.m03-external-action {',
  'min-height: clamp(54px, 14vw, 64px);'
]) check(`M03 correction CSS: ${token}`, css.includes(token));
check('M03 decision implementation retained', app.includes("function () { decide(recordId, 'pass'); }") && app.includes("function () { decide(recordId, 'keep'); }"));
check('M03 swipe retained', app.includes('attachSwipe(card,'));
check('M03 undo retained', app.includes("class: 'm03-undo'"));

for (const token of [
  'min-height: clamp(540px, 38vw, 590px);',
  'height: clamp(390px, 28.1vw, 432px);',
  'grid-template-columns: repeat(2, minmax(390px, 1fr));',
  'grid-template-columns: clamp(76px, 6.25vw, 96px) minmax(0, 1fr) 132px;',
  'white-space: nowrap;',
  '.w03-editorial-note {',
  'font-size: 16px;'
]) check(`W03 correction CSS: ${token}`, css.includes(token));
check('W03 detail copy retained', app.includes("text: '詳細を見る'"));
check('W03 editorial note exact', app.includes('ここで紹介しているのは編集部の視点です。選ぶのはあなた自身の気持ちです。'));
check('W03 SINGLE_KEEP_TO_REVIEW retained', app.includes('function singleKeepToReview(recordId)') && app.includes("state.deck.decisions[id] = id === recordId ? 'keep' : 'pass'"));

const appBefore = fs.readFileSync(path.join(REPO, 'work/ceo-visual-correction-prechange-restore/v3-prototype/js/app.js'), 'utf8');
function functionSlice(source, start, end) {
  const a = source.indexOf(start); const b = source.indexOf(end, a);
  return a >= 0 && b > a ? source.slice(a, b) : '';
}
for (const [start, end, name] of [
  ['function surfaceUnderstanding()', 'function surfaceLegacyDiscovery', 'M04+ understanding region'],
  ['function singleKeepToReview(recordId)', 'function mobileDiscoveryCard', 'W03 decision function'],
  ['function mobileDiscoveryCard', 'function desktopDiscoveryStep', 'M03 card behavior'],
  ['function desktopDiscoveryMain', 'function desktopAlternateCard', 'W03 main behavior'],
  ['function desktopAlternateCard', 'function surfaceCanonicalDiscovery', 'W03 alternate behavior']
]) check(`${name} byte-identical`, functionSlice(app, start, end) === functionSlice(appBefore, start, end));

check('network/API additions absent', !/\bfetch\s*\(|new\s+XMLHttpRequest|sendBeacon\s*\(|\bgtag\s*\(/.test(app));
check('external URL additions absent',
  JSON.stringify(app.match(/https?:\/\/[^'"\s)]+/g) || []) ===
  JSON.stringify(appBefore.match(/https?:\/\/[^'"\s)]+/g) || []));
check('storage implementation byte-identical', sha(path.join(SRC, 'js/store.js')) === preByPath.get('v3-prototype/js/store.js').sha256);

const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
console.log(`\nCEO_VISUAL_CORRECTION_SOURCE_CONTRACT: ${passed} PASS / ${failed} FAIL`);
if (failed) process.exit(1);
