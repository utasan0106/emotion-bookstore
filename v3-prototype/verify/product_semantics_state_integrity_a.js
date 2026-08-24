/* =============================================================================
 * V3 Product Semantics + State Integrity — bounded PASS A contract
 * 実行: node verify/product_semantics_state_integrity_a.js
 * ========================================================================== */
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const START = '95a5b434f8fcdae919ef8747020a92ae2dd48554';
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }
function bytes(rel) { return fs.readFileSync(path.join(REPO, rel)); }
function atStart(rel) { return cp.execFileSync('git', ['show', `${START}:${rel}`], { cwd: REPO }); }
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function slice(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  return a >= 0 && b > a ? source.slice(a, b) : '';
}

const app = read('v3-prototype/js/app.js');
const registrySource = read('v3-prototype/js/real_experience_registry.js');
const index = read('v3-prototype/index.html');
const css = read('v3-prototype/css/v3.css');
const productJs = fs.readdirSync(path.join(SRC, 'js'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(path.join(SRC, 'js', name), 'utf8'))
  .join('\n');

const window = { URL, open() { return null; } };
vm.runInNewContext(read('v3-prototype/js/data.js'), { window }, { filename: 'data.js' });
vm.runInNewContext(read('v3-prototype/js/action_destination.js'), { window, URL, Object }, { filename: 'action_destination.js' });
vm.runInNewContext(registrySource, { window, URL, Object, Date, JSON, RegExp, isNaN }, { filename: 'real_experience_registry.js' });
const D = window.V3_DATA;
const R = window.V3_REAL_EXPERIENCE_REGISTRY;
const shelfIds = D.EMOTIONS.map((item) => item.id);
const shelfLabels = D.EMOTIONS.map((item) => item.label);

check('A exact M02 primary prompt', app.includes("text: 'どんな感情の棚を、'") && app.includes("text: 'のぞいてみますか？'"));
check('A exact M02 support copy', app.includes("'今の気持ちと同じでなくて大丈夫です。少し気になる棚を、ひとつ。'"));
check('A eight-shelf terminology is 感情の棚', index.includes('>感情の棚</button>') &&
  app.includes("title: '感情の棚を選ぶ'") && app.includes("'aria-label': '感情の棚をひとつ選ぶ'"));
check('A public brand line preserved', app.includes("text: '感じていることから、'") &&
  app.includes("text: '次に触れるものを見つける。'"));
check('A superseded current-emotion assertions absent from Product UI source',
  !/いまの気持ちに近い|いま、どの言葉の近くにいますか|いちばん近い言葉|いまのあなたに、いちばん/.test(app + index));
check('A 感情の言葉 navigation terminology absent', !/感情の言葉/.test(app + index));
check('A Human Editorial wording precise', app.includes('感情書店の編集部が、理由を説明できるものだけを選んでいます。') &&
  !/すべて人が手作業|人だけで選/.test(app));

check('B shelf IDs exact 8', JSON.stringify(shelfIds) === JSON.stringify([
  'hajimu', 'atatamaru', 'hikareru', 'shizumu',
  'zawatsuku', 'butsukaru', 'miwohiku', 'mada'
]));
check('B shelf labels exact 8', JSON.stringify(shelfLabels) === JSON.stringify([
  '心が弾む', '心があたたまる', '惹かれる', '沈む',
  'ざわつく', 'ぶつかる', '身を引く', 'まだ名前がない'
]));
check('B selected shelf is UI single source of truth', app.includes('function selectedShelfLabel()') &&
  app.includes("'「' + selectedShelfLabel() + '」の棚から'") &&
  app.includes("'「' + shelfLabel + '」の棚から、' + count + 'つの文化物を。'"));
check('B stale persisted deck fails closed before render', app.includes('function currentDeckMatchesSelectedShelf()') &&
  app.includes('function failClosedStaleShelfRoute()') && app.includes("state.deck.mode !== 'real-approved'") &&
  app.includes("screen = 'understanding';") && app.includes('failClosedStaleShelfRoute();'));
check('B Understanding uses selected label and approved illustration dynamically',
  app.includes("src: './assets/canonical-m02-w02/' + word.asset") &&
  app.includes("'「' + (word ? word.label : '') + '」という感情の角度から、少し世界を見てみる。'"));
check('B no stale fixed ざわつく relation in reachable app source', !/「ざわつく」を入口に/.test(app));

const decks = Object.fromEntries(shelfIds.map((id) => [id, R.deckForEmotion(id, '2026-08-23').ids]));
check('C all 8 shelves resolve explicit finite decks', shelfIds.every((id) => Array.isArray(decks[id]) && decks[id].length <= 3));
check('C approved real Outing mapping exact', JSON.stringify(decks.mada) === JSON.stringify(['EXP_007']) &&
  shelfIds.filter((id) => id !== 'mada').every((id) => decks[id].length === 0), JSON.stringify(decks));
check('C EXP_001 excluded from Outing deck', !Object.values(decks).flat().includes('EXP_001') &&
  R.OUTING_EXCLUSIONS.EXP_001 === 'CULTURE_SIDECAR_NOT_OUTING_EXACT_SHELF_RELATION_NOT_APPROVED');
check('C Product Discovery fail-closed route uses real-approved only',
  slice(app, 'function surfaceDiscovery()', 'function personalizedExplanation').includes("deck.mode !== 'real-approved'") &&
  !slice(app, 'function surfaceDiscovery()', 'function personalizedExplanation').includes('surfaceCanonicalDiscovery'));
check('C current approved Outing is physically actionable and Action-valid', (() => {
  const exp = R.byId('EXP_007', '2026-08-23');
  const actions = window.V3_ACTION_DESTINATION.actionsForExperience(exp);
  return exp && exp.type === '場所' && exp.physicalDestination.approved === true && actions.length === 2 &&
    actions[0].kind === 'primary' && actions[1].kind === 'maps';
})());

check('D zero-deck is intentional Editorial state', app.includes('いま案内できる寄り道はありません') &&
  app.includes('この棚には、いま置けるものがありません。') && app.includes('別の棚をのぞく'));
check('D zero-deck preserves selected shelf identity', app.includes("surface.setAttribute('data-selected-shelf', state.emotion || '')") &&
  app.includes('understanding-shelf-image'));
check('D zero-deck has no fabricated CTA', slice(app, "} else if (deckState === 'empty')", '} else {').includes('別の棚をのぞく') &&
  !slice(app, "} else if (deckState === 'empty')", '} else {').includes('寄り道を見る'));
check('D multiple zero decks exist', shelfIds.filter((id) => decks[id].length === 0).length >= 2);
check('E nonzero CTA derives from actual count', app.includes("text: deckCount + 'つの寄り道を見る'") &&
  !app.includes("else startDeck('base'"));
check('E cardinality remains 0/1/2/3 without fill', Object.values(decks).every((ids) => ids.length >= 0 && ids.length <= 3) &&
  shelfIds.every((id) => R.deckForEmotion(id, '2026-08-23').fillFlag === false));

check('F Japanese-only header has no language affordance', !/class="locale|locale-globe|locale-chevron|>JP</.test(index));
check('F MENU remains available', index.includes('id="headerMenuTrigger"') && index.includes('>MENU</button>'));

const exp007 = R.byId('EXP_007', '2026-08-23');
const exp007Actions = window.V3_ACTION_DESTINATION.actionsForExperience(exp007);
check('G Action Destination contract retained', exp007Actions.length === 2 &&
  exp007Actions[0].url === 'https://fng.or.jp/shinjuku/' &&
  exp007Actions[1].url.startsWith('https://www.google.com/maps/dir/?api=1&destination='));
check('G Maps has no origin', !new URL(exp007Actions[1].url).searchParams.has('origin'));
check('G no dead fixture identity in active Outing mapping', Object.values(decks).flat().every((id) => /^EXP_/.test(id)) &&
  !Object.values(decks).flat().some((id) => /^E\d{2}$/.test(id)));

check('H Interested storage byte-identical', sha(bytes('v3-prototype/js/store.js')) === sha(atStart('v3-prototype/js/store.js')));
check('H personalization byte-identical', sha(bytes('v3-prototype/js/personalize.js')) === sha(atStart('v3-prototype/js/personalize.js')));
check('H prototype fixture data byte-identical', sha(bytes('v3-prototype/js/data.js')) === sha(atStart('v3-prototype/js/data.js')));
check('H Action Destination implementation byte-identical', sha(bytes('v3-prototype/js/action_destination.js')) === sha(atStart('v3-prototype/js/action_destination.js')));
check('H approved assets byte-identical', cp.execFileSync('git', ['diff', '--name-only', START, '--', 'v3-prototype/assets'], { cwd: REPO, encoding: 'utf8' }).trim() === '');

check('I no new analytics/network sender', !/\bgtag\s*\(|\bsendBeacon\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(productJs));
check('I geolocation = 0', !/navigator\s*\.\s*geolocation|\bgetCurrentPosition\s*\(/.test(productJs));
check('I external AI = 0', !/(api\.openai|anthropic|generativelanguage|gemini)/i.test(productJs));
check('I shelf identity added to analytics = 0', !/gtag|dataLayer|analytics/.test(slice(app, 'function chooseEmotion', 'function descriptionPhraseLines')));

check('J Understanding CSS is isolated and bounded', css.includes('.understanding-bridge') &&
  css.includes('.understanding-empty') && css.includes('.understanding-shelf-image'));
check('J HTML one document', (index.match(/<!doctype html>/ig) || []).length === 1 &&
  (index.match(/<html\b/ig) || []).length === 1 && (index.match(/<\/html>/ig) || []).length === 1);

const changed = cp.execFileSync('git', ['diff', '--name-only', START, '--'], { cwd: REPO, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
check('K scope remains V3 Product/dedicated verifier only', changed.every((rel) => rel.startsWith('v3-prototype/')), changed.join(', '));
check('K package/dependency diff = 0', !changed.some((rel) => /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(rel)));
check('K main/V2/.ai-handoff/.github diff = 0', changed.every((rel) =>
  !['main.js', 'data.js', 'index.html', 'style.css', 'sw.js'].includes(rel) &&
  !rel.startsWith('visual-refit-v2-prototype/') && !rel.startsWith('.ai-handoff/') && !rel.startsWith('.github/')));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
