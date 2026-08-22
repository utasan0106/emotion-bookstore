/* Final Four-Surface Correction — dependency-free source/protected-scope contract */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const OUTPUT = path.join(REPO, 'outputs/V3_FINAL_FOUR_SURFACE_CORRECTION_2026-08-21');
const PRE_MANIFEST = path.join(OUTPUT, 'snapshot/PRECHANGE_SOURCE_MANIFEST.json');
const PRE_RESTORE = path.join(REPO, 'work/final-four-surface-prechange-restore');
const NEW_VERIFIER = 'v3-prototype/verify/final_four_surface_source_contract.js';
const FINAL_CSS_SHA256 = '10b06bd9816de4191c677e449af241409c95c0966f7f1eb3c59677925926b99c';
const FINAL_APP_SHA256 = '9e3c368f70cbd00977b3fbed46c7b628b9bc610cda9647676128c7be635c8c54';
const MARKER = '/* =============================================================================\n * Final Four-Surface Correction — CEO residuals only — 2026-08-21';
const results = [];

function check(name, pass, detail = '') {
  const item = { name, pass: Boolean(pass), detail: String(detail || '') };
  results.push(item);
  console.log(`${item.pass ? 'PASS' : 'FAIL'} ${name}${item.detail ? ` — ${item.detail}` : ''}`);
}
function shaFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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
function sourceSlice(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  return a >= 0 && b > a ? source.slice(a, b) : '';
}
function ruleBody(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`, 'g'))];
  return matches.length ? matches[matches.length - 1][1] : '';
}
function containsAll(source, tokens) { return tokens.every((token) => source.includes(token)); }

const pre = JSON.parse(fs.readFileSync(PRE_MANIFEST, 'utf8'));
const preByPath = new Map(pre.files.map((item) => [item.path, item]));
const preCss = fs.readFileSync(path.join(PRE_RESTORE, 'v3-prototype/css/v3.css'), 'utf8');
const preApp = fs.readFileSync(path.join(PRE_RESTORE, 'v3-prototype/js/app.js'), 'utf8');
const css = read('css/v3.css');
const app = read('js/app.js');
const data = read('js/data.js');
const store = read('js/store.js');
const personalize = read('js/personalize.js');
const suffixAt = css.indexOf(MARKER);
const suffix = suffixAt >= 0 ? css.slice(suffixAt) : '';

check('branch exact', git('branch', '--show-current') === 'codex/v3-99-canonical-rebuild');
check('HEAD exact', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('origin/main exact', git('rev-parse', 'origin/main') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('prechange manifest exact count', pre.file_count === 91 && pre.files.length === 91);
check('final CSS exact SHA-256', shaFile(path.join(SRC, 'css/v3.css')) === FINAL_CSS_SHA256);
check('final app exact SHA-256', shaFile(path.join(SRC, 'js/app.js')) === FINAL_APP_SHA256);
check('final marker occurs once', suffixAt >= 0 && css.indexOf(MARKER, suffixAt + 1) === -1);
check('prechange CSS is exact final prefix', suffixAt === preCss.length + 1 && css.slice(0, suffixAt) === `${preCss}\n`);

const missing = [];
const changed = [];
for (const item of pre.files) {
  const file = path.join(REPO, item.path);
  if (!fs.existsSync(file)) missing.push(item.path);
  else if (shaFile(file) !== item.sha256) changed.push(item.path);
}
check('all prechange files still present', missing.length === 0, missing.join(', '));
check('only authorized pre-existing files changed', JSON.stringify(changed) === JSON.stringify([
  'v3-prototype/css/v3.css',
  'v3-prototype/js/app.js'
]), changed.join(', '));
const currentV3 = listFiles(SRC).map((rel) => `v3-prototype/${rel}`);
const preV3 = pre.files.filter((item) => item.path.startsWith('v3-prototype/')).map((item) => item.path);
const additions = currentV3.filter((item) => !preV3.includes(item));
check('only dedicated verifier added', JSON.stringify(additions) === JSON.stringify([NEW_VERIFIER]), additions.join(', '));

for (const rel of ['index.html', 'js/data.js', 'js/store.js', 'js/personalize.js']) {
  check(`${rel} byte-identical`, shaFile(path.join(SRC, rel)) === preByPath.get(`v3-prototype/${rel}`).sha256);
}
for (const family of ['assets/canonical-m01-w01/', 'assets/canonical-m02-w02/', 'assets/canonical-m03-w03/', 'assets/fonts/']) {
  const items = pre.files.filter((item) => item.path.startsWith(`v3-prototype/${family}`));
  check(`${family} protected`, items.every((item) => shaFile(path.join(REPO, item.path)) === item.sha256), `${items.length} files`);
}
check('root handoff files protected', ['V3_HANDOFF_MANIFEST.json', 'V3_HANDOFF_README.md'].every((rel) => shaFile(path.join(REPO, rel)) === preByPath.get(rel).sha256));
check('package/lockfiles absent', !['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].some((name) => fs.existsSync(path.join(SRC, name))));

for (const [name, source] of [['app', app], ['data', data], ['store', store], ['personalize', personalize]]) {
  new vm.Script(source, { filename: `${name}.js` });
  check(`${name}.js syntax`, true);
}
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
check('CSS brace balance', (cssNoComments.match(/\{/g) || []).length === (cssNoComments.match(/\}/g) || []).length);
check('suffix has no URL/import/generated copy', !/@import\b|url\s*\(|(^|[;{])\s*content\s*:/im.test(suffix));
check('suffix excludes W01/W03/global MENU selectors', !/\.(?:w01|w03)-|\.header-|\.site-nav/.test(suffix));

/* M01 */
const m01Title = ruleBody(suffix, '.entrance .loop-title');
const m01Note = ruleBody(suffix, '.entrance .loop-note');
check('M01 title one-line rule', containsAll(m01Title, ['clamp(12px, 3.02vw, 13px)', 'font-weight: 500', 'line-height: 1.4', 'white-space: nowrap', 'overflow-wrap: normal']));
check('M01 subcopy hierarchy', containsAll(m01Note, ['clamp(10.5px, 2.56vw, 11px)', 'font-weight: 400', 'line-height: 1.55']));
check('M01 four titles/subcopies share one rule', (suffix.match(/\.entrance \.loop-title\s*\{/g) || []).length === 1 && (suffix.match(/\.entrance \.loop-note\s*\{/g) || []).length === 1);
check('M01 copy lines preserved one line', ruleBody(suffix, '.entrance .loop-note .copy-line').includes('white-space: nowrap'));
check('M01 icon/circle/connector selectors absent', !/\.loop-(?:visual|img|num|connector)\s*\{/.test(suffix));
check('M01/W01 entrance renderer exact', sourceSlice(app, 'function surfaceEntrance()', 'function surfaceEmotion()') === sourceSlice(preApp, 'function surfaceEntrance()', 'function surfaceEmotion()'));

/* M02 */
const emotion = sourceSlice(app, 'function surfaceEmotion()', 'function surfaceUnderstanding()');
check('M02 intro first line ends after 言葉を', emotion.includes("class: 'emotion-support-choice-line', text: 'いまのあなたに、いちばんしっくりくる言葉を'"));
check('M02 intro second line exact', emotion.includes("class: 'emotion-support-choice-line', text: 'ひとつ選んでください。'"));
check('M02 intro concatenation exact', emotion.includes("'aria-label': 'いまのあなたに、いちばんしっくりくる言葉をひとつ選んでください。'"));
check('M02 guidance first line exact', emotion.includes("class: 'emotion-guidance-choice-line', text: 'どの言葉もしっくりこないときは、'"));
check('M02 guidance second line exact', emotion.includes("class: 'emotion-guidance-choice-line', text: '「まだ名前がない」を選んでも大丈夫です。'"));
check('M02 lock first sentence exact block', emotion.includes("class: 'emotion-copy-line', text: '選んだ言葉は、あなただけの手がかりとして使われます。'"));
check('M02 privacy second sentence exact block', emotion.includes("class: 'emotion-copy-line', text: '他の人に見られることはありません。'"));
check('M02 mobile grouping CSS', containsAll(suffix, ['.emotion-support-choice-line,', '.emotion-guidance-choice-line', 'display: block;', 'white-space: nowrap;']));
const mobileSuffix = sourceSlice(suffix, '@media (max-width: 599px) {', '@media (min-width: 1200px) {');
check('M02 safe 2x4 retained at 390/430', css.includes('.emotion-grid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));') && !/\.emotion-grid\s*\{[^}]*repeat\(4/.test(mobileSuffix));
check('M02 selection route/state retained', containsAll(emotion, ["state.emotion = word.id;", 'state.deck = null;', 'persist();', "go('understanding');", "onclick: function (event) { chooseEmotion(word, event); }"]));

/* W02 */
check('W02 description split helper exact', containsAll(emotion, ["description.split('、')", "phrase + (index < phrases.length - 1 ? '、' : '')", "class: 'emotion-description-phrase'", 'descriptionPhraseLines(word.description)']));
check('W02 desktop phrase-line CSS', containsAll(ruleBody(suffix, '.emotion-description-phrase'), ['display: block', 'white-space: nowrap', 'word-break: normal', 'overflow-wrap: normal']));
check('W02 desktop card copy width protected', containsAll(ruleBody(suffix, '.emotion-card'), ['minmax(88px, 36%) minmax(0, 1fr)', 'clamp(10px, 0.9vw, 14px)']));
check('W02 desktop readable phrase typography', containsAll(ruleBody(suffix, '.emotion-card-description'), ['clamp(10.5px, 0.814vw, 12.5px)', 'line-height: 1.65', 'letter-spacing: 0.005em']));
const dataContext = { window: {} };
vm.runInNewContext(data, dataContext, { filename: 'data.js' });
const emotions = dataContext.window.V3_DATA.EMOTIONS;
check('W02 all 8 cards retained', emotions.length === 8);
check('W02 all descriptions phrase-splittable', emotions.every((item) => item.description.split('、').length >= 2));
check('W02 phrase reconstruction preserves copy/punctuation', emotions.every((item) => {
  const phrases = item.description.split('、');
  return phrases.map((phrase, index) => phrase + (index < phrases.length - 1 ? '、' : '')).join('') === item.description;
}));
check('W02 no linebreak injected into data', emotions.every((item) => !/[\r\n]|<br/i.test(item.description)));

/* M03 */
const mobileCard = sourceSlice(app, 'function mobileDiscoveryCard', 'function desktopDiscoveryStep');
check('M03 location path uses existing icon helper', containsAll(app, ["location: 'M12 21s6-5.4", "[icon('location')]", "class: 'm03-address'"]));
check('M03 calendar path uses existing icon helper', containsAll(app, ["calendar: 'M6 3v3M18 3v3", "[icon('calendar')]", "index === 3"]));
check('M03 semantic marks decorative', (mobileCard.match(/'aria-hidden': 'true'/g) || []).length >= 4);
check('M03 independent yen mark removed', mobileCard.includes('index === 2') && mobileCard.includes('m03-fact-mark-empty') && !/\['◇',\s*'◷',\s*'¥'/.test(mobileCard));
check('M03 old address/close glyphs removed', !mobileCard.includes("text: '⌖'") && !mobileCard.includes("'□'"));
check('M03 exact fact values retained', ['カフェ', '30分', '¥900〜1,300', '火曜定休', 'Type', 'Duration', 'Price', 'Close'].every((token) => data.includes(token)));
check('M03 icon grid slot geometry', containsAll(ruleBody(suffix, '.m03-fact-mark'), ['width: 16px', 'height: 18px', 'align-items: center', 'justify-content: center']));
check('M03 pass/keep/swipe behavior retained', containsAll(mobileCard, ["function () { decide(recordId, 'pass'); }", "function () { decide(recordId, 'keep'); }", 'attachSwipe(card,']));
const preMobileCard = sourceSlice(preApp, 'function mobileDiscoveryCard', 'function desktopDiscoveryStep');
check('M03 behavior tail byte-identical', sourceSlice(mobileCard, "var card = h('article'", '}\n\n  function desktopDiscoveryStep') === sourceSlice(preMobileCard, "var card = h('article'", '}\n\n  function desktopDiscoveryStep'));

/* Frozen and general protected scope */
const preIconBlock = sourceSlice(preApp, 'var ICON_PATHS = {', 'function icon(name, size)');
const iconBlock = sourceSlice(app, 'var ICON_PATHS = {', 'function icon(name, size)');
const strippedIcons = iconBlock
  .replace(/^\s*location:.*\n/m, '')
  .replace(/^\s*calendar:.*\n/m, '');
check('existing icon paths unchanged', strippedIcons === preIconBlock);
check('W03 renderer byte-identical', sourceSlice(app, 'function desktopDiscoveryStep()', 'function surfaceDiscovery()') === sourceSlice(preApp, 'function desktopDiscoveryStep()', 'function surfaceDiscovery()'));
check('M04/W04 and later byte-identical', sourceSlice(app, 'function surfaceUnderstanding()', 'function mobileDiscoveryCard') === sourceSlice(preApp, 'function surfaceUnderstanding()', 'function mobileDiscoveryCard') && sourceSlice(app, 'function surfaceDiscovery()', 'function render()') === sourceSlice(preApp, 'function surfaceDiscovery()', 'function render()'));
check('storage/data model byte-identical', ['js/data.js', 'js/store.js', 'js/personalize.js'].every((rel) => shaFile(path.join(SRC, rel)) === preByPath.get(`v3-prototype/${rel}`).sha256));
check('no external network/AI/analytics code added', !/\bfetch\s*\(|XMLHttpRequest|sendBeacon\s*\(|\bgtag\s*\(|https?:\/\//.test(suffix + sourceSlice(app, 'var ICON_PATHS = {', 'function icon(name, size)')));
check('no commit created', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');

const passed = results.filter((item) => item.pass).length;
const failed = results.length - passed;
console.log(`\nFINAL_FOUR_SURFACE_SOURCE_CONTRACT: ${passed} PASS / ${failed} FAIL`);
if (failed) process.exit(1);
