/* =============================================================================
 * V3 Release Muscle Sprint 01 — protected scope / canonical regression
 * 実行: node verify/release_muscle_01_regression.js
 * ========================================================================== */
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const BASE = 'c3ce4cd3f85ebf53f3471be711d4c38c7a2015b9';
const CURRENT_SPRINT_START = '2d2e1c9468787b2fedf207101c57847fca96adf7';
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function git(args) {
  return cp.execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
}
function current(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }
function currentBuffer(rel) { return fs.readFileSync(path.join(REPO, rel)); }
function atBase(rel) {
  return cp.execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: REPO, encoding: 'utf8' });
}
function atBaseBuffer(rel) {
  return cp.execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: REPO, maxBuffer: 32 * 1024 * 1024 });
}
function hashText(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function functionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

const trackedChanged = git(['diff', '--name-only', CURRENT_SPRINT_START, '--']).split('\n').filter(Boolean);
const untrackedChanged = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
const changed = Array.from(new Set(trackedChanged.concat(untrackedChanged))).sort();
const allowed = changed.every((file) => file.startsWith('v3-prototype/'));
check('scope: changes stay under v3-prototype', allowed, changed.join(', '));
check('protected .ai-handoff/.github/V2/Production files unchanged', changed.every((file) =>
  !file.startsWith('.ai-handoff/') && !file.startsWith('.github/') &&
  !['main.js', 'data.js', 'index.html', 'style.css', 'sw.js'].includes(file)));

['v3-prototype/js/data.js', 'v3-prototype/js/personalize.js'].forEach((rel) => {
  const before = atBase(rel);
  const after = current(rel);
  check(`${rel} byte-identical`, hashText(before) === hashText(after), hashText(after));
});

const baseAssets = git(['ls-tree', '-r', '--name-only', BASE, '--', 'v3-prototype/assets']).split('\n').filter(Boolean);
check('all Sprint01 Visual asset bytes retained', baseAssets.every((rel) =>
  fs.existsSync(path.join(REPO, rel)) && currentBuffer(rel).equals(atBaseBuffer(rel))));
const assetChanges = git(['diff', '--name-only', BASE, '--', 'v3-prototype/assets']).split('\n').filter(Boolean);
check('later approved Visual additions are isolated', assetChanges.every((rel) =>
  rel.startsWith('v3-prototype/assets/category-visual/') ||
  rel === 'v3-prototype/assets/real-experience/EXP_007_shinjuku_gyoen_official_landscape.jpg'),
  assetChanges.join(', '));
check('package/lock/dependency diff = 0', !changed.some((file) => /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file)));

const baseApp = atBase('v3-prototype/js/app.js');
const app = current('v3-prototype/js/app.js');
[
  'finiteDiscoveryIds', 'startDeck', 'undo',
  'surfacePlan', 'surfacePlanSaved',
  'surfaceMoment', 'surfaceTrace'
].forEach((name) => {
  const before = functionSource(baseApp, name);
  const after = functionSource(app, name);
  check(`${name} behavior source unchanged`, Boolean(before && after) && before === after);
});
check('authorized Entrance/Emotion semantics changed without route redesign',
  functionSource(app, 'surfaceEntrance').includes('感情の棚を選ぶ') &&
  functionSource(app, 'surfaceEmotion').includes('どんな感情の棚を、') &&
  functionSource(app, 'surfaceEmotion').includes('今の気持ちと同じでなくて大丈夫です。少し気になる棚を、ひとつ。'));

const normalizedDecide = functionSource(app, 'decide')
  .replace("activeDeckCount() + 'つすべてを「今回は違う」としました。'", "'3つすべてを「今回は違う」としました。'")
  .replace("activeDeckCount() + 'つの体験を見終えました。'", "'3つの体験を見終えました。'");
check('decide behavior unchanged except authoritative Deck count',
  normalizedDecide === functionSource(baseApp, 'decide'));

check('prototype canonical fixture Review is not reachable from current Product router',
  functionSource(app, 'surfaceReview').includes('currentDeckMatchesSelectedShelf() ? surfaceNone() : surfaceUnderstanding()') &&
  !functionSource(app, 'surfaceReview').includes('surfaceLegacyReview') &&
  !functionSource(app, 'surfaceReview').includes('surfaceCanonicalReview'));

const deckCountSurfaces = [
  'decide', 'stepbarConfig', 'surfaceLegacyDiscovery', 'desktopDiscoveryStep',
  'safeCanonicalDiscoverySurface', 'surfaceCanonicalDiscovery',
  'personalizedExplanation', 'reviewDecision', 'surfaceCanonicalReview'
].map((name) => functionSource(app, name) || '').join('\n');
const twoRecordContext = {
  D: { emotionById() { return { label: 'まだ名前がない' }; } },
  state: { emotion: 'mada', deck: { mode: 'real-approved', ids: ['EXP_001', 'EXP_007'], index: 1 } },
  screen: 'review',
  activeDeckCount() { return 2; }
};
const twoRecordReview = vm.runInNewContext(
  `(${functionSource(app, 'stepbarConfig')})()`, twoRecordContext
);
twoRecordContext.screen = 'discovery';
const twoRecordDiscovery = vm.runInNewContext(
  `(${functionSource(app, 'stepbarConfig')})()`, twoRecordContext
);
check('2-record active Deck cannot render count-dependent 3-copy',
  twoRecordReview.title === '2つ見ました' &&
  twoRecordReview.count === '2 / 2' &&
  twoRecordReview.stepTitle === '2つの寄り道から選ぶ' &&
  twoRecordReview.hint === '2つのうち、気になるものを選んでください' &&
  twoRecordDiscovery.count === '2 / 2' &&
  twoRecordDiscovery.stepTitle === '2つの寄り道から選ぶ' &&
  twoRecordDiscovery.hint === '2つのうち、気になるものを選んでください' &&
  app.includes('function activeDeckCount()') &&
  deckCountSurfaces.includes('activeDeckCount()') &&
  !/次の3つ|気になる3つの体験|3つのうち|3つ見ました|3 \/ 3|3つ中3つ|3つを見直す|他の2つの体験/.test(deckCountSurfaces));

check('L finite-3 Discovery authority retained',
  app.includes('return ordered.slice(0, 3);') &&
  current('v3-prototype/js/data.js').match(/slot: '(cafe|book|film)'/g).length === 3);
check('M Detail → Plan handler retained',
  app.includes("if (state.recentIds.indexOf(experience.id) === -1) state.recentIds.push(experience.id);") &&
  app.includes("persist();\n          go('plan');") &&
  app.includes("text: 'この体験を選ぶ'"));
check('M Plan/Return/Trace storage contract retained',
  functionSource(baseApp, 'surfacePlan') === functionSource(app, 'surfacePlan') &&
  functionSource(baseApp, 'surfaceMoment') === functionSource(app, 'surfaceMoment') &&
  ['emptyState', 'load', 'save', 'clear'].every((name) =>
    functionSource(current('v3-prototype/js/store.js'), name) ===
    functionSource(atBase('v3-prototype/js/store.js'), name)));

const data = current('v3-prototype/js/data.js');
check('no real Experience/Action Destination inserted into fixture data',
  !data.includes('actionDestination') && !data.includes('physicalDestination'));
check('Editorial/personalization mapping unchanged',
  current('v3-prototype/js/data.js') === atBase('v3-prototype/js/data.js') &&
  current('v3-prototype/js/personalize.js') === atBase('v3-prototype/js/personalize.js'));

const indexDiff = git(['diff', '--unified=0', BASE, '--', 'v3-prototype/index.html']);
check('index keeps Action Destination mount and authorized Japanese-only header',
  indexDiff.includes('<script src="./js/action_destination.js"></script>') &&
  current('v3-prototype/index.html').includes('>感情の棚</button>') &&
  !/class="locale|locale-globe|locale-chevron|>JP</.test(current('v3-prototype/index.html')) &&
  !indexDiff.includes('<link') && !indexDiff.includes('<main'));
check('N Canonical visual source retained (CSS/assets/data)',
  !git(['diff', '--unified=0', BASE, '--', 'v3-prototype/css/v3.css']).split('\n')
    .some((line) => /^-[^-]/.test(line)) &&
  baseAssets.every((rel) => currentBuffer(rel).equals(atBaseBuffer(rel))) &&
  current('v3-prototype/js/data.js') === atBase('v3-prototype/js/data.js'));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
