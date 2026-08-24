/* =============================================================================
 * V3 Founder Visual Closure — bounded static/protected-contract verification
 * Run: node verify/founder_visual_closure.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const START = 'aa4efc3e893b00af169190643624b483008aae0c';
const MAIN = '910dbac29e70143fe50bc6e192eaaafa40729174';
const EXPECTED_BRANCH = process.env.V3_EXPECTED_BRANCH || 'codex/v3-founder-visual-closure-final';
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const bytes = (rel) => fs.readFileSync(path.join(SRC, rel));
const atStart = (rel) => cp.execFileSync('git', ['show', `${START}:v3-prototype/${rel}`], { cwd: REPO });
const git = (args) => cp.execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

const app = read('js/app.js');
const data = read('js/data.js');
const store = read('js/store.js');
const retrieval = read('js/interested_retrieval.js');
const matching = read('js/cultural_matching.js');
const registry = read('js/real_experience_registry.js');
const ad = read('js/action_destination.js');
const css = read('css/v3.css');
const index = read('index.html');
const productJs = fs.readdirSync(path.join(SRC, 'js'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => read('js/' + name))
  .join('\n');

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const window = { URL, open() { return null; } };
vm.runInNewContext(data, { window }, { filename: 'data.js' });
vm.runInNewContext(ad, { window, URL, Object }, { filename: 'action_destination.js' });
vm.runInNewContext(matching, { window, URL, Object, Date, JSON, RegExp, Number, isNaN }, { filename: 'cultural_matching.js' });
vm.runInNewContext(registry, { window, URL, Object, Date, JSON, RegExp, isNaN }, { filename: 'real_experience_registry.js' });
const D = window.V3_DATA;
const AD = window.V3_ACTION_DESTINATION;
const R = window.V3_REAL_EXPERIENCE_REGISTRY;

check('source branch is declared bounded branch', git(['branch', '--show-current']) === EXPECTED_BRANCH, EXPECTED_BRANCH);
check('Start HEAD exists', git(['rev-parse', START]) === START);
check('main authority object exists and is unchanged', git(['rev-parse', MAIN]) === MAIN);

check('M01 approved brand line preserved', app.includes("text: '感じていることから、'") && app.includes("text: '次に触れるものを見つける。'"));
check('M01 one dominant entrance CTA retained', app.includes("class: 'btn btn-primary cta-primary'"));
check('M01 compact loop/trust retained', app.includes("class: 'loop'") && app.includes("class: 'trust'"));

check('M02 shelf-exploration prompt exact', app.includes("text: 'どんな感情の棚を、'") && app.includes("text: 'のぞいてみますか？'"));
check('M02 support exact', app.includes("'今の気持ちと同じでなくて大丈夫です。少し気になる棚を、ひとつ。'"));
check('M02 all eight shelves retained', D.EMOTIONS.length === 8);
check('M02 semantic phrase wrapping bounded', app.includes('function descriptionPhraseLines') && css.includes('.emotion-description-phrase'));

const shelfDecks = Object.fromEntries(D.EMOTIONS.map((shelf) => [shelf.id, R.deckForEmotion(shelf.id).ids]));
check('all shelf decks remain finite 0/1/2/3', Object.values(shelfDecks).every((ids) => ids.length >= 0 && ids.length <= 3));
check('approved Outing mapping unchanged', JSON.stringify(shelfDecks) === JSON.stringify({
  hajimu: [], atatamaru: [], hikareru: [], shizumu: [], zawatsuku: [],
  butsukaru: [], miwohiku: [], mada: ['EXP_007']
}));
check('Understanding preserves selected shelf identity', app.includes("class: 'understanding-shelf-image'") && app.includes("text: word ? word.label : ''"));
check('Understanding actual count remains dynamic', app.includes("text: 'この棚から案内できる寄り道は、' + deckCount + 'つです。'"));
check('Understanding zero is intentional', app.includes("text: 'いま案内できる寄り道はありません'") && app.includes("text: '別の棚をのぞく'"));

check('Discovery card exposes approved primary Action directly', app.includes("class: 'btn btn-primary real-discovery-primary'") && app.includes('openApprovedDestination(primaryAction, experience)'));
check('Discovery Detail is secondary', app.includes("class: 'btn btn-line real-discovery-detail'"));
check('Discovery Interested is tertiary', app.includes("class: 'btn btn-text real-discovery-interest'"));
check('Discovery practical facts limited to approved access', app.includes("{ label: '最寄駅', value: access.nearestStation }") && app.includes("{ label: '徒歩', value: access.walkingTime }"));
check('Discovery uses shelf-specific approved Editorial reason', app.includes('cardEditorialHook(experience)') && app.includes('placeDetail.placementReason'));
check('missing Action Destination still produces zero action', AD.actionsForExperience({ id: 'MISSING' }).length === 0);

check('desktop Back has explicit label and native 44px target', app.includes("class: 'stepbar-back-label'") && css.includes('min-width: 96px;') && css.includes('height: 44px;'));
check('History state uses same URL only',
  app.includes("pushState({ v3Screen: screen }, '', global.location.href)") &&
  !/pushState\([^\n]*(experienceId|selectedId|emotion|shelf)/.test(app));
check('FAQ is a collapsed accessible accordion', app.includes("'aria-expanded': 'false'") && app.includes("'aria-controls': answerId") && app.includes('answer.hidden = expanded'));
check('FAQ desktop is single-column', css.includes('.w01-faq-list {') && css.includes('display: block;'));

check('Detail reason heading exact and primary', app.includes("text: 'なぜ、この棚に？'") && app.includes("class: 'detail-editorial-reason'"));
check('Detail primary official Action is dominant', app.includes("class: 'btn btn-primary detail-primary-action'"));
check('Detail Maps remains secondary utility', app.includes("class: 'btn btn-text detail-utility-action'"));
check('Detail layout targets 54/46', css.includes('grid-template-columns: minmax(0, 54%) minmax(0, 46%);'));
check('EXP_007 official Action remains primary', AD.actionsForExperience(R.byId('EXP_007'))[0].kind === 'primary');

check('Plan retains existing option model', sha(bytes('js/data.js')) === sha(atStart('js/data.js')));
check('Plan retains existing storage implementation', sha(bytes('js/store.js')) === sha(atStart('js/store.js')));
check('Plan exposes approved quick choices without data migration',
  app.includes("{ id: 'today', label: '今日' }") &&
  app.includes("{ id: 'tomorrow', label: '明日' }") &&
  app.includes("{ id: 'weekend', label: '今週末' }") &&
  app.includes("{ id: 'datetime', label: '日付を選ぶ' }"));
check('Plan persists same object field set', /when:\s*chosen[\s\S]*date:[\s\S]*time:[\s\S]*experienceId:[\s\S]*status:\s*'open'/.test(app));
check('Plan has optional time and clear summary', app.includes("text: '時刻（任意）'") && app.includes("class: 'plan-selection-summary'"));
check('Plan completion cue exact', app.includes("text: '予定を残しました。'") && app.includes("class: 'plan-saved-icon'"));
check('Plan states no external calendar sync', app.includes('外部カレンダーとは同期していません。'));

check('Interested key/schema implementation byte-identical', sha(bytes('js/store.js')) === sha(atStart('js/store.js')));
check('Interested retrieval implementation byte-identical', sha(bytes('js/interested_retrieval.js')) === sha(atStart('js/interested_retrieval.js')));
check('zero-saved entrance remains conditional', app.includes("interested.items.length ? h('button'"));
check('stale Interested remains fail-closed', retrieval.includes("status: 'unavailable'") &&
  retrieval.includes('CURRENT_AUTHORITY_INVALID') && retrieval.includes('NOT_CURRENTLY_APPROVED'));

check('Japanese-only header unchanged', !/(>JP<|language-switch|language-selector)/i.test(index + app));
check('no analytics sender added', !/\bgtag\s*\(|\bsendBeacon\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(productJs));
check('no external AI added', !/(openai|anthropic|gemini|generativelanguage|api\.openai)/i.test(productJs));
check('no geolocation added', !/navigator\s*\.\s*geolocation|\bgetCurrentPosition\s*\(/.test(productJs));
check('no login/cloud sync added', !/(oauth\.|authorize\(|signIn\(|login\(|cloudSync\()/i.test(productJs));
check('no new dependency', git(['diff', '--name-only', START, '--', 'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) === '');
check('main/V2/Production/.ai-handoff/.github unchanged', git(['diff', '--name-only', START, '--', ':!v3-prototype']).split('\n').filter(Boolean).length === 0);
check('assets and Registry unchanged', git(['diff', '--name-only', START, '--', 'v3-prototype/assets', 'v3-prototype/js/real_experience_registry.js']).trim() === '');
check('personalization unchanged', sha(bytes('js/personalize.js')) === sha(atStart('js/personalize.js')));
check('HTML one document', (index.match(/<!doctype html>/gi) || []).length === 1 && (index.match(/<html\b/gi) || []).length === 1);

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
