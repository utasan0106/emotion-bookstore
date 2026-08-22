/* M02 / M03 / W02 Final Residual Fix — dependency-free source contract */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const OUTPUT = path.join(REPO, 'outputs/V3_M02_M03_W02_FINAL_RESIDUAL_FIX_2026-08-22');
const PRE_RESTORE = path.join(REPO, 'work/m02-m03-w02-final-residual-prechange-restore');
const PRE_MANIFEST = path.join(OUTPUT, 'snapshot/PRECHANGE_SOURCE_MANIFEST.json');
const NEW_VERIFIER = 'v3-prototype/verify/m02_m03_w02_final_residual_source_contract.js';
const FINAL_CSS_SHA256 = 'e08a343e36a51d8f8a4f641f57db37e623748264e42ccaac732ae70cd1b1067d';
const FINAL_APP_SHA256 = 'b262301aece676061d7ee856065bde7b50ddaadda5084b78c2af55c79666dfea';
const MARKER = '/* =============================================================================\n * M02 / M03 / W02 Final Residual Fix — 2026-08-22';
const results = [];

function check(name, pass, detail = '') {
  const item = { name, pass: Boolean(pass), detail: String(detail || '') };
  results.push(item);
  console.log(`${item.pass ? 'PASS' : 'FAIL'} ${name}${item.detail ? ` — ${item.detail}` : ''}`);
}
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function read(rel) { return fs.readFileSync(path.join(SRC, rel), 'utf8'); }
function git(...args) { return cp.execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim(); }
function sourceSlice(source, start, end) {
  const a = source.indexOf(start); const b = source.indexOf(end, a);
  return a >= 0 && b > a ? source.slice(a, b) : '';
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
function containsAll(source, tokens) { return tokens.every((token) => source.includes(token)); }

const pre = JSON.parse(fs.readFileSync(PRE_MANIFEST, 'utf8'));
const preByPath = new Map(pre.files.map((item) => [item.path, item]));
const preCss = fs.readFileSync(path.join(PRE_RESTORE, 'v3-prototype/css/v3.css'), 'utf8');
const preApp = fs.readFileSync(path.join(PRE_RESTORE, 'v3-prototype/js/app.js'), 'utf8');
const css = read('css/v3.css');
const app = read('js/app.js');
const data = read('js/data.js');
const suffixAt = css.indexOf(MARKER);
const suffix = suffixAt >= 0 ? css.slice(suffixAt) : '';

check('branch exact', git('branch', '--show-current') === 'codex/v3-99-canonical-rebuild');
check('HEAD exact', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('origin/main exact', git('rev-parse', 'origin/main') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('prechange manifest exact count', pre.file_count === 92 && pre.files.length === 92);
check('final CSS exact SHA-256', sha(path.join(SRC, 'css/v3.css')) === FINAL_CSS_SHA256);
check('final app exact SHA-256', sha(path.join(SRC, 'js/app.js')) === FINAL_APP_SHA256);
check('final marker occurs once', suffixAt >= 0 && css.indexOf(MARKER, suffixAt + 1) === -1);
check('prechange CSS exact prefix', suffixAt === preCss.length + 1 && css.slice(0, suffixAt) === `${preCss}\n`);

const missing = [];
const changed = [];
for (const item of pre.files) {
  const file = path.join(REPO, item.path);
  if (!fs.existsSync(file)) missing.push(item.path);
  else if (sha(file) !== item.sha256) changed.push(item.path);
}
check('all prechange files present', missing.length === 0, missing.join(', '));
check('only CSS/app pre-existing changes', JSON.stringify(changed) === JSON.stringify(['v3-prototype/css/v3.css', 'v3-prototype/js/app.js']), changed.join(', '));
const currentV3 = listFiles(SRC).map((rel) => `v3-prototype/${rel}`);
const preV3 = pre.files.filter((item) => item.path.startsWith('v3-prototype/')).map((item) => item.path);
const additions = currentV3.filter((item) => !preV3.includes(item));
check('only dedicated verifier added', JSON.stringify(additions) === JSON.stringify([NEW_VERIFIER]), additions.join(', '));

for (const rel of ['index.html', 'js/data.js', 'js/store.js', 'js/personalize.js']) {
  check(`${rel} byte-identical`, sha(path.join(SRC, rel)) === preByPath.get(`v3-prototype/${rel}`).sha256);
}
for (const family of ['assets/canonical-m01-w01/', 'assets/canonical-m02-w02/', 'assets/canonical-m03-w03/', 'assets/fonts/']) {
  const items = pre.files.filter((item) => item.path.startsWith(`v3-prototype/${family}`));
  check(`${family} protected`, items.every((item) => sha(path.join(REPO, item.path)) === item.sha256), `${items.length} files`);
}
check('package/lockfiles absent', !['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].some((name) => fs.existsSync(path.join(SRC, name))));

new vm.Script(app, { filename: 'app.js' });
new vm.Script(data, { filename: 'data.js' });
check('app/data syntax', true);
const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
check('CSS brace balance', (cleanCss.match(/\{/g) || []).length === (cleanCss.match(/\}/g) || []).length);
check('suffix has no URL/import/generated copy', !/@import\b|url\s*\(|(^|[;{])\s*content\s*:/im.test(suffix));

/* Exact app delta normalization proves no hidden product changes. */
const yenLine = "    yenCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 7l4 5 4-5M12 12v6M8.5 13.5h7M8.5 16h7',\n";
const oldTrust = "        h('span', { class: 'emotion-copy-line', text: '選んだ言葉は、あなただけの手がかりとして使われます。' }),";
const newTrust = [
  "        h('span', {",
  "          class: 'emotion-copy-line emotion-trust-primary',",
  "          'aria-label': '選んだ言葉は、あなただけの手がかりとして使われます。'",
  '        }, [',
  "          h('span', { class: 'emotion-trust-primary-line', text: '選んだ言葉は、' }),",
  "          h('span', { class: 'emotion-trust-primary-line', text: 'あなただけの手がかりとして使われます。' })",
  '        ]),'
].join('\n');
const oldPrice = "          mark = h('span', { class: 'm03-fact-mark m03-fact-mark-empty', 'aria-hidden': 'true' });";
const newPrice = "          mark = h('span', { class: 'm03-fact-mark m03-fact-mark-price', 'aria-hidden': 'true' }, [icon('yenCircle')]);";
const normalizedApp = app.replace(yenLine, '').replace(newTrust, oldTrust).replace(newPrice, oldPrice);
check('app delta exact three authorized edits', normalizedApp === preApp);

/* M02 */
const emotion = sourceSlice(app, 'function surfaceEmotion()', 'function surfaceUnderstanding()');
check('M02 first sentence accessible copy exact', emotion.includes("'aria-label': '選んだ言葉は、あなただけの手がかりとして使われます。'"));
check('M02 permitted break lead exact', emotion.includes("class: 'emotion-trust-primary-line', text: '選んだ言葉は、'"));
check('M02 permitted break body exact', emotion.includes("class: 'emotion-trust-primary-line', text: 'あなただけの手がかりとして使われます。'"));
check('M02 second sentence separate exact block', emotion.includes("class: 'emotion-copy-line', text: '他の人に見られることはありません。'"));
check('M02 mobile lines block/nowrap', containsAll(suffix, ['.emotion-trust-primary-line {', 'display: block;', 'white-space: nowrap;']));
check('M02 no font/layout override in residual suffix', !/\.emotion-(?:trust-copy|selection-trust|footer|grid|card|support|heading)\s*\{/.test(suffix));
check('M02 selection behavior retained', containsAll(emotion, ["state.emotion = word.id;", 'persist();', "go('understanding');", "onclick: function (event) { chooseEmotion(word, event); }"]));

/* M03 */
const mobileCard = sourceSlice(app, 'function mobileDiscoveryCard', 'function desktopDiscoveryStep');
check('M03 circled-yen path present', app.includes("yenCircle: 'M12 3a9 9 0 1 0 0 18"));
check('M03 Price mark uses helper', mobileCard.includes("m03-fact-mark m03-fact-mark-price") && mobileCard.includes("[icon('yenCircle')]"));
check('M03 Price mark decorative', mobileCard.includes("class: 'm03-fact-mark m03-fact-mark-price', 'aria-hidden': 'true'"));
check('M03 Price icon 16px slot balance', containsAll(suffix, ['.m03-fact-mark-price svg {', 'width: 16px;', 'height: 16px;']));
check('M03 exact Price value/label retained', data.includes("{ value: '¥900〜1,300', label: 'Price' }"));
check('M03 Type/Duration/Close values retained', ['カフェ', '30分', '火曜定休', 'Type', 'Duration', 'Close'].every((token) => data.includes(token)));
check('M03 location/calendar implementations unchanged', sourceSlice(app, "location: '", "yenCircle: '") === sourceSlice(preApp, "location: '", "back: '"));
check('M03 behavior tail byte-identical', sourceSlice(app, "var card = h('article'", 'function desktopDiscoveryStep') === sourceSlice(preApp, "var card = h('article'", 'function desktopDiscoveryStep'));

/* W02 */
check('W02 stable final opacity', containsAll(suffix, ['@media (min-width: 1200px)', '.emotion-selection {', 'animation: none;', 'opacity: 1;']));
check('W02 contrast fix does not target card geometry', !/\.emotion-(?:card|grid|intro|footer|guidance|trust-copy|heading|support|grid-question)\s*\{/.test(suffix));
check('W02 8-card phrase presentation retained', app.includes("description.split('、')") && app.includes('descriptionPhraseLines(word.description)') && css.includes('.emotion-description-phrase {'));
const dataContext = { window: {} };
vm.runInNewContext(data, dataContext, { filename: 'data.js' });
const emotions = dataContext.window.V3_DATA.EMOTIONS;
check('W02 all 8 cards retained', emotions.length === 8);
check('W02 phrase punctuation reconstruction exact', emotions.every((item) => {
  const p = item.description.split('、');
  return p.map((value, index) => value + (index < p.length - 1 ? '、' : '')).join('') === item.description;
}));

/* Protected M01/W01/W03/M04+. */
check('M01/W01 renderer byte-identical', sourceSlice(app, 'function surfaceEntrance()', 'function surfaceEmotion()') === sourceSlice(preApp, 'function surfaceEntrance()', 'function surfaceEmotion()'));
check('W03 renderer byte-identical', sourceSlice(app, 'function desktopDiscoveryStep()', 'function surfaceDiscovery()') === sourceSlice(preApp, 'function desktopDiscoveryStep()', 'function surfaceDiscovery()'));
check('M04/W04+ regions byte-identical', sourceSlice(app, 'function surfaceUnderstanding()', 'function mobileDiscoveryCard') === sourceSlice(preApp, 'function surfaceUnderstanding()', 'function mobileDiscoveryCard') && sourceSlice(app, 'function surfaceDiscovery()', 'function render()') === sourceSlice(preApp, 'function surfaceDiscovery()', 'function render()'));
check('residual CSS excludes M01/W01/W03/header', !/\.entrance|\.w01-|\.w03-|\.header-|\.site-nav/.test(suffix));
check('storage/data model protected', ['js/data.js', 'js/store.js', 'js/personalize.js'].every((rel) => sha(path.join(SRC, rel)) === preByPath.get(`v3-prototype/${rel}`).sha256));
check('network/API/analytics additions absent', !/\bfetch\s*\(|XMLHttpRequest|sendBeacon\s*\(|\bgtag\s*\(|https?:\/\//.test(suffix + yenLine));
check('no commit created', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');

const passed = results.filter((item) => item.pass).length;
const failed = results.length - passed;
console.log(`\nM02_M03_W02_FINAL_RESIDUAL_SOURCE_CONTRACT: ${passed} PASS / ${failed} FAIL`);
if (failed) process.exit(1);
