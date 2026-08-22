/* =============================================================================
 * V3 Release Muscle Sprint 02 — Real Experience Registry contract
 * 実行: node verify/real_experience_registry.js
 * ========================================================================== */
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const BASE = 'db8689eeb4c329fb29bef6899a68ba217a879ff6';
const files = {
  registry: path.join(SRC, 'js/real_experience_registry.js'),
  ad: path.join(SRC, 'js/action_destination.js'),
  data: path.join(SRC, 'js/data.js'),
  app: path.join(SRC, 'js/app.js'),
  index: path.join(SRC, 'index.html')
};
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function git(args) {
  return cp.execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
}
function current(rel) { return fs.readFileSync(path.join(REPO, rel)); }
function atBase(rel) { return cp.execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: REPO }); }
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function forbiddenField(value, pattern) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((key) => pattern.test(key) || forbiddenField(value[key], pattern));
}

const window = { URL, open() { return null; } };
vm.runInNewContext(fs.readFileSync(files.data, 'utf8'), { window }, { filename: 'data.js' });
vm.runInNewContext(fs.readFileSync(files.ad, 'utf8'), { window, URL, Object }, { filename: 'action_destination.js' });
vm.runInNewContext(fs.readFileSync(files.registry, 'utf8'), {
  window, URL, Object, Date, JSON, RegExp, isNaN
}, { filename: 'real_experience_registry.js' });

const R = window.V3_REAL_EXPERIENCE_REGISTRY;
const D = window.V3_DATA;
const app = fs.readFileSync(files.app, 'utf8');
const index = fs.readFileSync(files.index, 'utf8');
const registrySource = fs.readFileSync(files.registry, 'utf8');
const productJs = fs.readdirSync(path.join(SRC, 'js'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(path.join(SRC, 'js', name), 'utf8'))
  .join('\n');
const records = R.snapshot();
const deck = R.deckForEmotion('mada', '2026-08-22');

check('registry version explicit', R.VERSION === 'product-semantics-state-a-v1.0');
check('A only human-approved real IDs exist', JSON.stringify(records.map((r) => r.id)) === JSON.stringify(['EXP_001', 'EXP_007']));
check('A approved ID contract exact', JSON.stringify(R.APPROVED_IDS) === JSON.stringify(['EXP_001', 'EXP_007']));
check('A approved records resolve', Boolean(R.byId('EXP_001', '2026-08-22') && R.byId('EXP_007', '2026-08-22')));
check('A human approval and Real-Data Gate provenance retained', records.every((record) =>
  record.authority.reviewerHuman === true &&
  record.authority.deckRef === 'DECK-P0-001' &&
  record.authority.realDataGateResult === 'REAL_DATA_GATE_READY_FOR_PHASE0' &&
  record.authority.livenessCheckedAt === '2026-08-22T19:17:42+09:00'));
check('returned EXP_012 cannot resolve', R.byId('EXP_012', '2026-08-22') === null);
['EXP_003', 'EXP_005', 'EXP_008', 'EXP_010', 'EXP_011'].forEach((id) => {
  check(`${id} cannot resolve`, R.byId(id, '2026-08-22') === null);
});
check('EXP_012 disposition is returned/not approved', R.EXCLUDED_DISPOSITIONS.EXP_012 === 'RETURNED_NOT_HUMAN_APPROVED');

check('B fixture and real registry remain separate',
  D.EXPERIENCES.every((record) => /^E\d{2}$/.test(record.id)) && D.EXPERIENCES.length === 6 &&
  records.every((record) => record.sourceClass === 'approved-real-experience'));
check('B fixture data contains no real registry payload',
  !fs.readFileSync(files.data, 'utf8').includes('EXP_001') &&
  !fs.readFileSync(files.data, 'utf8').includes('actionDestination'));

check('C approved Outing Deck mounts only EXP_007', deck && JSON.stringify(deck.ids) === JSON.stringify(['EXP_007']));
check('C EXP_001 remains Registry record but not Outing slot',
  R.byId('EXP_001', '2026-08-22') && R.OUTING_IDS.indexOf('EXP_001') === -1 &&
  /CULTURE_SIDECAR_NOT_OUTING/.test(R.OUTING_EXCLUSIONS.EXP_001));
check('C no forced fill', deck && deck.ids.length === 1 && deck.fillFlag === false);
check('C relation coverage exact', deck && JSON.stringify(deck.relationCoverage) === JSON.stringify({ direct: 0, adjacent: 0, opening: 1 }));
check('C all 8 shelves resolve finite 0/1 decks', R.SHELF_IDS.every((id) => {
  const candidate = R.deckForEmotion(id, '2026-08-22');
  return candidate && candidate.ids.length >= 0 && candidate.ids.length <= 3;
}));
check('C only まだ名前がない activates real Outing Deck',
  R.SHELF_IDS.filter((id) => R.deckForEmotion(id, '2026-08-22').ids.length > 0).join('|') === 'mada');
check('C Product mode routes one-card Deck through existing generic surfaces',
  app.includes("startDeck('real-approved', realDeck.ids)") &&
  app.includes("deck.mode !== 'real-approved'") &&
  app.includes("var counter = (deck.index + 1) + ' / ' + deck.ids.length"));
check('C review/retry count derives from active Deck',
  app.includes("text: activeDeckCount() + 'つをもう一度見る'") &&
  app.includes("text: count + 'つをもう一度見る'"));

check('D freshness boundary includes recheck date', Boolean(R.byId('EXP_007', '2027-02-18')));
check('D stale EXP_007 fails closed', R.byId('EXP_007', '2027-02-19') === null);
check('D stale Deck fails closed to explicit zero rather than partial render', R.deckForEmotion('mada', '2027-02-19').ids.length === 0);
check('D invalid as-of date fails closed to explicit zero', R.deckForEmotion('mada', 'not-a-date').ids.length === 0);

const exp001 = R.byId('EXP_001', '2026-08-22');
const exp007 = R.byId('EXP_007', '2026-08-22');
const exp001Actions = window.V3_ACTION_DESTINATION.actionsForExperience(exp001);
const exp007Actions = window.V3_ACTION_DESTINATION.actionsForExperience(exp007);
check('E EXP_001 AD passes Sprint 01 contract', exp001Actions.length === 1 && exp001Actions[0].url === 'https://e-comi.shogakukan.co.jp/books/098501800000d0000000');
check('E EXP_007 AD passes Sprint 01 contract', exp007Actions.length === 2 &&
  exp007Actions[0].url === 'https://fng.or.jp/shinjuku/' &&
  exp007Actions[1].destinationClass === 'map_directions');
check('E primary destinations are HTTPS', records.every((r) => new URL(r.actionDestination.url).protocol === 'https:'));
check('E no invalid/dead AD among mounted records', records.every((r) =>
  window.V3_ACTION_DESTINATION.actionsForExperience(r).length === (r.id === 'EXP_007' ? 2 : 1)));
check('F EXP_001 CTA makes electronic-comic medium explicit', /電子コミック/.test(exp001.actionDestination.label) && !/紙|ISBN/.test(exp001.actionDestination.label));
check('G EXP_007 officiality remains official', exp007.actionDestination.officiality === 'official');
check('G EXP_007 Maps utility uses approved public address only',
  exp007.physicalDestination.approved === true &&
  exp007.physicalDestination.address === '東京都新宿区内藤町11' &&
  exp007Actions[1].url === 'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent('東京都新宿区内藤町11') &&
  !(new URL(exp007Actions[1].url)).searchParams.has('origin'));

check('H placement approval does not itself claim image reuse', records.every((r) =>
  r.rights.imageReuseApproved === false));
check('H visual reuse is isolated in strict visualAsset contract', records.every((r) =>
  r.visualAsset && R.validateVisualAsset(r.visualAsset, '2026-08-22').pass));
check('H no third-party text reuse approval claimed', records.every((r) => r.rights.textReuseApproved === false));
check('I reader Editorial Reason exists and has no commercial vocabulary', records.every((r) =>
  r.reason && !/(affiliate|commission|revenue|conversion|人気|売上|アフィリエイト)/i.test(r.reason)));
check('I internal relation is not rendered by Product app', !app.includes('experience.editorial.relation'));
check('J no Commercial/Affiliate fields in active model', !records.some((r) =>
  forbiddenField(r, /(affiliate|commission|revenue|conversion|ranking|popularity|tracking)/i)));
check('J no private editorial/red-team fields in reader registry', !records.some((r) =>
  forbiddenField(r, /(private|counter_read|red.?team|founder_note|reviewer_note)/i)));

check('K index loads registry after AD and before Product app',
  index.indexOf('./js/real_experience_registry.js') > index.indexOf('./js/action_destination.js') &&
  index.indexOf('./js/real_experience_registry.js') < index.indexOf('./js/app.js'));
check('K Product resolver adapter resolves real and fixture records',
  D.byId('EXP_001').id === 'EXP_001' && D.byId('E01').id === 'E01' &&
  registrySource.includes('return byId(id) || fixtureById(id)'));
check('K missing/invalid AD remains zero dead affordance through Sprint 01 resolver',
  app.includes('approvedDestinationActions(experience).map') &&
  window.V3_ACTION_DESTINATION.actionsForExperience({ id: 'MISSING' }).length === 0);

check('L analytics network = 0', !/\bgtag\s*\(|\bsendBeacon\s*\(|\bfetch\s*\(|XMLHttpRequest/.test(productJs));
check('L geolocation access = 0', !/navigator\s*\.\s*geolocation|\bgetCurrentPosition\s*\(/.test(productJs));
check('L external AI call = 0', !/(openai|anthropic|gemini|generativelanguage|api\.openai)/i.test(productJs));
check('L registry itself has no network primitive', !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(registrySource));

const protectedFiles = [
  'v3-prototype/js/data.js',
  'v3-prototype/js/personalize.js'
];
protectedFiles.forEach((rel) => {
  check(`${rel} byte-identical`, sha(current(rel)) === sha(atBase(rel)), sha(current(rel)));
});
const assetTracked = git(['diff', '--name-only', BASE, '--', 'v3-prototype/assets']).split('\n').filter(Boolean);
const assetUntracked = git(['ls-files', '--others', '--exclude-standard', '--', 'v3-prototype/assets']).split('\n').filter(Boolean);
const assetChanges = Array.from(new Set(assetTracked.concat(assetUntracked))).sort();
check('existing Visual assets unchanged; approved Category Visuals and one rights-verified asset added',
  JSON.stringify(assetChanges) === JSON.stringify([
    'v3-prototype/assets/category-visual/category_book.webp',
    'v3-prototype/assets/category-visual/category_bookstore.webp',
    'v3-prototype/assets/category-visual/category_event.webp',
    'v3-prototype/assets/category-visual/category_exhibition.webp',
    'v3-prototype/assets/category-visual/category_film.webp',
    'v3-prototype/assets/category-visual/category_food_cafe.webp',
    'v3-prototype/assets/category-visual/category_library.webp',
    'v3-prototype/assets/category-visual/category_music.webp',
    'v3-prototype/assets/category-visual/category_place.webp',
    'v3-prototype/assets/category-visual/category_workshop.webp',
    'v3-prototype/assets/real-experience/EXP_007_shinjuku_gyoen_official_landscape.jpg'
  ]), assetChanges.join(', '));
const storeSource = current('v3-prototype/js/store.js').toString();
check('existing session key retained; Sprint03 key is separate',
  storeSource.includes("var STATE_KEY = 'session'") &&
  storeSource.includes("var INTERESTED_KEY = 'interested-experiences-v1'"));
check('personalization/Emotion mapping diff = 0',
  sha(current('v3-prototype/js/personalize.js')) === sha(atBase('v3-prototype/js/personalize.js')) &&
  sha(current('v3-prototype/js/data.js')) === sha(atBase('v3-prototype/js/data.js')));
const cssDiff = git(['diff', '--unified=0', BASE, '--', 'v3-prototype/css/v3.css']);
const cssRemoved = cssDiff.split('\n').filter((line) => /^-[^-]/.test(line));
check('Canonical CSS receives only an additive isolated Sprint 02.5 block',
  cssDiff.includes('.real-experience-visual') && cssRemoved.length === 0,
  cssRemoved.join(', '));

const tracked = git(['diff', '--name-only', BASE, '--']).split('\n').filter(Boolean);
const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
const changed = Array.from(new Set(tracked.concat(untracked))).sort();
check('scope is V3 Product + dedicated verifier only', changed.every((rel) => rel.startsWith('v3-prototype/')), changed.join(', '));
check('main/V2/Production/.ai-handoff/.github diff = 0', changed.every((rel) =>
  !['main.js', 'data.js', 'index.html', 'style.css', 'sw.js'].includes(rel) &&
  !rel.startsWith('visual-refit-v2-prototype/') &&
  !rel.startsWith('.ai-handoff/') && !rel.startsWith('.github/')));
check('package/lock/dependency diff = 0', !changed.some((rel) => /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(rel)));

check('HTML script mount appears exactly once', (index.match(/real_experience_registry\.js/g) || []).length === 1);
check('HTML retains one doctype/html/body close',
  (index.match(/<!doctype html>/ig) || []).length === 1 &&
  (index.match(/<\/html>/ig) || []).length === 1 &&
  (index.match(/<\/body>/ig) || []).length === 1);

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
