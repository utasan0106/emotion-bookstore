/* Final CEO Visual Polish — dependency-free source and protected-scope contract */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const OUTPUT = path.join(REPO, 'outputs/V3_FINAL_CEO_VISUAL_POLISH_2026-08-21');
const PRE_MANIFEST = path.join(OUTPUT, 'snapshot/PRECHANGE_SOURCE_MANIFEST.json');
const PRE_RESTORE = path.join(REPO, 'work/final-ceo-visual-polish-prechange-restore');
const NEW_VERIFIER = 'v3-prototype/verify/final_ceo_visual_polish_source_contract.js';
const FINAL_CSS_SHA256 = '0f0aa0ba6bdf1363b930bd3a46a9a6eef9df063fa61d00649aef7d9458d18df2';
const MARKER = '/* =============================================================================\n * Final CEO Visual Polish — authorized residuals only — 2026-08-21';
const results = [];

function check(name, pass, detail = '') {
  const item = { name, pass: Boolean(pass), detail: String(detail || '') };
  results.push(item);
  console.log(`${item.pass ? 'PASS' : 'FAIL'} ${name}${item.detail ? ` — ${item.detail}` : ''}`);
}
function shaFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function shaText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
function read(rel) { return fs.readFileSync(path.join(SRC, rel), 'utf8'); }
function git(...args) {
  return cp.execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
}
function listFiles(root, base = root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(abs, base));
    else if (entry.isFile()) out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out.sort();
}
function functionSlice(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  return a >= 0 && b > a ? source.slice(a, b) : '';
}
function ruleBody(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`, 'g'))];
  return matches.length ? matches[matches.length - 1][1] : '';
}
function propertyNames(body) {
  return [...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g)].map((m) => m[1]).sort();
}
function exactProperties(source, selector, expected) {
  const actual = propertyNames(ruleBody(source, selector));
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}
function containsAll(source, tokens) { return tokens.every((token) => source.includes(token)); }

const pre = JSON.parse(fs.readFileSync(PRE_MANIFEST, 'utf8'));
const preByPath = new Map(pre.files.map((item) => [item.path, item]));
const preCssPath = path.join(PRE_RESTORE, 'v3-prototype/css/v3.css');
const preCss = fs.readFileSync(preCssPath, 'utf8');
const css = read('css/v3.css');
const app = read('js/app.js');
const html = read('index.html');
const data = read('js/data.js');
const suffixAt = css.indexOf(MARKER);
const suffix = suffixAt >= 0 ? css.slice(suffixAt) : '';

check('branch exact', git('branch', '--show-current') === 'codex/v3-99-canonical-rebuild');
check('HEAD exact', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('origin/main exact', git('rev-parse', 'origin/main') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('prechange manifest exact count', pre.file_count === 90 && pre.files.length === 90);
check('prechange CSS restore exists', fs.existsSync(preCssPath));
check('prechange CSS SHA matches manifest', shaFile(preCssPath) === preByPath.get('v3-prototype/css/v3.css').sha256);
check('final CSS marker occurs once', suffixAt >= 0 && css.indexOf(MARKER, suffixAt + 1) === -1);
check('prechange CSS is exact final prefix', suffixAt === preCss.length + 1 && css.slice(0, suffixAt) === `${preCss}\n`);
check('final CSS exact SHA-256', shaText(css) === FINAL_CSS_SHA256);

const missing = [];
const changed = [];
for (const item of pre.files) {
  const file = path.join(REPO, item.path);
  if (!fs.existsSync(file)) missing.push(item.path);
  else if (shaFile(file) !== item.sha256) changed.push(item.path);
}
check('all prechange files still present', missing.length === 0, missing.join(', '));
check('only pre-existing CSS changed', JSON.stringify(changed) === JSON.stringify(['v3-prototype/css/v3.css']), changed.join(', '));
const currentV3 = listFiles(SRC).map((rel) => `v3-prototype/${rel}`);
const preV3 = pre.files.filter((item) => item.path.startsWith('v3-prototype/')).map((item) => item.path);
const additions = currentV3.filter((item) => !preV3.includes(item));
check('only dedicated verifier added to v3-prototype', JSON.stringify(additions) === JSON.stringify([NEW_VERIFIER]), additions.join(', '));
check('root handoff manifest unchanged', shaFile(path.join(REPO, 'V3_HANDOFF_MANIFEST.json')) === preByPath.get('V3_HANDOFF_MANIFEST.json').sha256);
check('root handoff readme unchanged', shaFile(path.join(REPO, 'V3_HANDOFF_README.md')) === preByPath.get('V3_HANDOFF_README.md').sha256);

for (const rel of ['index.html', 'js/app.js', 'js/data.js', 'js/store.js', 'js/personalize.js']) {
  check(`${rel} byte-identical`, shaFile(path.join(SRC, rel)) === preByPath.get(`v3-prototype/${rel}`).sha256);
}
for (const family of ['assets/canonical-m01-w01/', 'assets/canonical-m02-w02/', 'assets/canonical-m03-w03/', 'assets/fonts/']) {
  const familyItems = pre.files.filter((item) => item.path.startsWith(`v3-prototype/${family}`));
  const exact = familyItems.every((item) => shaFile(path.join(REPO, item.path)) === item.sha256);
  check(`${family} all bytes protected`, exact, `${familyItems.length} files`);
}
check('package and lockfiles absent', !['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].some((name) => fs.existsSync(path.join(SRC, name))));

new vm.Script(app, { filename: 'app.js' });
new vm.Script(data, { filename: 'data.js' });
check('app/data syntax', true);
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
check('CSS brace balance', (cssNoComments.match(/\{/g) || []).length === (cssNoComments.match(/\}/g) || []).length);
check('final suffix has no URL/import/asset change', !/@import\b|url\s*\(/i.test(suffix));
check('final suffix has no generated copy', !/(^|[;{])\s*content\s*:/m.test(suffix));

check('M01 title typography exact scope', exactProperties(suffix, '.entrance .loop-title', ['margin-top', 'font-size', 'font-weight', 'line-height']));
check('M01 note typography exact scope', exactProperties(suffix, '.entrance .loop-note', ['margin-top', 'font-size', 'font-weight', 'line-height']));
check('M01 residual values', containsAll(ruleBody(suffix, '.entrance .loop-title'), ['clamp(14px, 3.49vw, 15px)', 'font-weight: 500', 'line-height: 1.42']) && containsAll(ruleBody(suffix, '.entrance .loop-note'), ['clamp(12.5px, 3.02vw, 13px)', 'line-height: 1.5']));
check('M01 icon/circle/connector not overridden', !/\.loop-(visual|img|num|connector)\s*\{/.test(suffix));

check('M02 heading residual values', containsAll(ruleBody(suffix, '.emotion-heading'), ['max-width: 100%', 'clamp(25px, 6.28vw, 27px)', 'line-height: 1.45', 'letter-spacing: 0.045em']));
check('M02 support residual values', containsAll(ruleBody(suffix, '.emotion-support'), ['font-size: 15px', 'line-height: 1.82', 'letter-spacing: 0.045em']));
const emotionSource = functionSlice(app, 'function surfaceEmotion()', 'function surfaceUnderstanding()');
check('M02 no br/manual element insertion', !/<br\b|h\(['"]br['"]/.test(emotionSource));
for (const sentence of [
  '正解はありません。',
  'いまのあなたに、いちばんしっくりくる言葉をひとつ選んでください。'
]) check(`M02 exact intro copy: ${sentence}`, emotionSource.includes(`text: '${sentence}'`));
const mobileSuffix = suffix.slice(
  suffix.indexOf('@media (max-width: 599px) {'),
  suffix.indexOf('@media (min-width: 1200px) {')
);
check('M02 card CSS absent from mobile block', !mobileSuffix.includes('.emotion-card {') && !mobileSuffix.includes('.emotion-card-copy') && !mobileSuffix.includes('.emotion-card-label') && !mobileSuffix.includes('.emotion-card-description'));

for (const token of [
  'padding-inline: clamp(12px, 3.08vw, 14px);',
  '.m03-intro { padding-inline: clamp(13px, 3.59vw, 15px); }',
  'grid-template-columns: repeat(4, minmax(0, 1fr));',
  'grid-template-columns: 16px minmax(0, 1fr);',
  '.m03-fact:last-child { border-right: 0; }',
  'width: clamp(68px, 17.44vw, 75px);',
  'min-height: 50px;',
  'min-height: clamp(52px, 12.56vw, 54px);'
]) check(`M03 Canonical re-alignment token: ${token}`, suffix.includes(token));
check('M03 four facts exact values retained', ['カフェ', '30分', '¥900〜1,300', '火曜定休', 'Type', 'Duration', 'Price', 'Close'].every((token) => data.includes(token)));
check('M03 pass/keep behavior retained', app.includes("function () { decide(recordId, 'pass'); }") && app.includes("function () { decide(recordId, 'keep'); }"));
check('M03 swipe/undo retained', app.includes('attachSwipe(card,') && app.includes("class: 'm03-undo'"));

const triggerProps = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-feature-settings'];
check('MENU trigger typography-only properties', exactProperties(suffix, '.header-menu-trigger', triggerProps));
check('MENU panel item typography-only properties', exactProperties(suffix, '.header-nav-panel .site-nav-link', triggerProps));
check('MENU geometry declarations absent from suffix rules', !['width', 'min-width', 'height', 'min-height', 'padding', 'margin', 'position', 'top', 'right', 'display'].some((property) => propertyNames(ruleBody(suffix, '.header-menu-trigger')).includes(property) || propertyNames(ruleBody(suffix, '.header-nav-panel .site-nav-link')).includes(property)));
check('MENU 4 items/order exact', JSON.stringify([...html.matchAll(/class="site-nav-link"[^>]*>([^<]+)</g)].map((m) => m[1])) === JSON.stringify(['はじめる', '体験の流れ', '感情の言葉', 'よくある質問']));
check('MENU destination attributes unchanged', html.includes('href="#core-loop" data-nav="scroll">体験の流れ') && html.includes('data-nav="start">感情の言葉') && html.includes('href="#trust" data-nav="scroll">よくある質問'));

for (const token of [
  'grid-template-rows: auto auto;',
  'grid-template-columns: clamp(112px, 9.77vw, 150px) minmax(0, 1fr);',
  'font-size: clamp(19px, 1.37vw, 21px);',
  'min-height: 0;',
  'overflow-wrap: normal;'
]) check(`W02 wrap correction token: ${token}`, suffix.includes(token));
const dataContext = { window: {} };
vm.runInNewContext(data, dataContext, { filename: 'data.js' });
const emotions = dataContext.window.V3_DATA.EMOTIONS;
check('W02 all 8 emotion cards retained', emotions.length === 8);
check('W02 all descriptions continuous', emotions.every((item) => typeof item.description === 'string' && !/[\r\n]/.test(item.description) && !/<br/i.test(item.description)));

check('W03 hint typography-only properties', exactProperties(suffix, '.w03-step-hint', ['font-size', 'font-weight', 'line-height', 'letter-spacing']));
check('W03 hint values', containsAll(ruleBody(suffix, '.w03-step-hint'), ['font-size: 14px', 'font-weight: 500', 'line-height: 1.6', 'letter-spacing: 0.045em']));
check('W03 instruction exact copy', app.includes('3つのうち、気になるものを1つ選んでください'));

check('W01 fullpage DOM/source byte-identical', shaFile(path.join(SRC, 'index.html')) === preByPath.get('v3-prototype/index.html').sha256 && shaFile(path.join(SRC, 'js/app.js')) === preByPath.get('v3-prototype/js/app.js').sha256);
check('W01 desktop non-MENU final rules absent', !/@media \(min-width: 1200px\)[\s\S]*?\.(?:entrance|w01-)/.test(suffix));
check('Emotion Words new page/route absent', additions.every((item) => !/emotion|word|route/i.test(item)) && !/emotion-words|emotionWords|surfaceEmotionWords/.test(suffix));

const preApp = fs.readFileSync(path.join(PRE_RESTORE, 'v3-prototype/js/app.js'), 'utf8');
for (const [start, end, name] of [
  ['function surfaceEmotion()', 'function surfaceUnderstanding()', 'M02 selection region'],
  ['function surfaceUnderstanding()', 'function surfaceLegacyDiscovery', 'M04/W04+ region'],
  ['function singleKeepToReview(recordId)', 'function mobileDiscoveryCard', 'W03 decision region'],
  ['function mobileDiscoveryCard', 'function desktopDiscoveryStep', 'M03 card behavior region'],
  ['function desktopDiscoveryMain', 'function desktopAlternateCard', 'W03 main behavior region'],
  ['function desktopAlternateCard', 'function surfaceCanonicalDiscovery', 'W03 alternate behavior region']
]) check(`${name} byte-identical`, functionSlice(app, start, end) === functionSlice(preApp, start, end));

check('storage/data model byte-identical', ['js/data.js', 'js/store.js', 'js/personalize.js'].every((rel) => shaFile(path.join(SRC, rel)) === preByPath.get(`v3-prototype/${rel}`).sha256));
check('network/API/analytics additions absent', !/\bfetch\s*\(|new\s+XMLHttpRequest|sendBeacon\s*\(|\bgtag\s*\(|https?:\/\//.test(suffix));
check('no commit created', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');

const passed = results.filter((item) => item.pass).length;
const failed = results.length - passed;
console.log(`\nFINAL_CEO_VISUAL_POLISH_SOURCE_CONTRACT: ${passed} PASS / ${failed} FAIL`);
if (failed) process.exit(1);
