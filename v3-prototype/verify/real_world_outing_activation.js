/* =============================================================================
 * V3 Real-World Outing Activation — 8/8 bounded activation contract
 * 実行: node verify/real_world_outing_activation.js
 * ========================================================================== */
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const START = 'b664d0c7ef62c0adb6766ff990fa8980316d7dcf';
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }
function bytes(rel) { return fs.readFileSync(path.join(REPO, rel)); }
function atStart(rel) {
  return cp.execFileSync('git', ['show', `${START}:${rel}`], { cwd: REPO });
}
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function forbiddenField(value, pattern) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((key) => pattern.test(key) || forbiddenField(value[key], pattern));
}

const window = { URL, open() { return null; } };
vm.runInNewContext(read('v3-prototype/js/data.js'), { window }, { filename: 'data.js' });
vm.runInNewContext(read('v3-prototype/js/action_destination.js'), {
  window, URL, Object
}, { filename: 'action_destination.js' });
vm.runInNewContext(read('v3-prototype/js/real_experience_registry.js'), {
  window, URL, Object, Date, JSON, RegExp, isNaN
}, { filename: 'real_experience_registry.js' });

const R = window.V3_REAL_EXPERIENCE_REGISTRY;
const AD = window.V3_ACTION_DESTINATION;
const app = read('v3-prototype/js/app.js');
const records = R.snapshot();
const mapping = {
  hajimu: 'EXP_101',
  atatamaru: 'EXP_102',
  hikareru: 'EXP_103',
  shizumu: 'EXP_104',
  zawatsuku: 'EXP_105',
  butsukaru: 'EXP_106',
  miwohiku: 'EXP_107',
  mada: 'EXP_007'
};
const expectedTitles = {
  EXP_101: 'チームラボボーダレス',
  EXP_102: '東京おもちゃ美術館',
  EXP_103: 'ザ・ペーパーログ：膜と核',
  EXP_104: '東京都復興記念館',
  EXP_105: 'TOPコレクション 明日の食卓',
  EXP_106: '80 GRAPHIC TRIALS',
  EXP_107: '文喫 六本木',
  EXP_007: '新宿御苑'
};
const frozenWhy = {
  EXP_101: '館内には地図がなく、作品も空間を移動する。感情書店では、決められた順路をたどるより、次の空間を自分で探しながら進む構造を見て、この場所を「心が弾む」に置きました。',
  EXP_102: 'ここでは、おもちゃを展示として眺めるだけでなく、実際に触れて遊び、おもちゃ学芸員が遊びと人の出会いをつなぐ。感情書店では、おもちゃを間にして人と人のやりとりが生まれる仕組みを見て、この場所を「心があたたまる」に置きました。',
  EXP_103: '衣服のプリーツ加工で生まれる副産物の紙が、「膜」のオブジェと「核」の家具プロトタイプへ、対照的な方法で展開されている。感情書店では、同じ紙が別の姿へ変わる対照そのものを入口にして、この展示を「惹かれる」に置きました。',
  EXP_104: '関東大震災の被災物や写真、絵画、復興模型に加え、東京空襲の実物資料も同じ建物に残されている。感情書店では、被害と復興の時間が資料として積み重なった場所に留まって見る入口として、この場所を「沈む」に置きました。',
  EXP_105: '「食」を入口に、記憶や人とのつながりだけでなく、環境、高齢化、孤食などの社会的な問いまで見せる展覧会。感情書店では、見慣れた「食べる」という行為の周りに別の層が現れる構成を見て、この展示を「ざわつく」に置きました。',
  EXP_106: 'GRAPHIC TRIALは、クリエイターとTOPPANの共創で、グラフィックデザインと印刷表現の新しい可能性を探ってきた20年の試み。感情書店では、異なる発想と技術が接触し、その試行の積み重ねが見えることを「ぶつかる」として読みました。',
  EXP_107: '文喫は、約3万冊の本を販売しながら、一人で本と向き合う閲覧室などを備え、入場料を払って滞在する書店。感情書店では、何かをすぐ選ぶより、本に囲まれる時間そのものを先に確保する仕組みを見て、この場所を「身を引く」に置きました。',
  EXP_007: '新宿御苑では、整形式庭園、風景式庭園、日本庭園など、歩くうちに景色の組み立て方が切り替わる。感情書店では、ひとつの見方に名前をつけて固定する前に、異なる景色の秩序を行き来してみる場所として、この場所を「まだ名前がない」に置きました。'
};

check('registry version is bounded activation v1.0', R.VERSION === 'real-world-outing-activation-v1.0');
check('8 shelf IDs unchanged', JSON.stringify(R.SHELF_IDS) === JSON.stringify(Object.keys(mapping)));
check('Outing IDs exact approved 8', JSON.stringify(R.OUTING_IDS) ===
  JSON.stringify(Object.values(mapping)));
check('Culture Sidecar EXP_001 remains outside Outing', R.APPROVED_IDS.includes('EXP_001') &&
  !R.OUTING_IDS.includes('EXP_001') && R.OUTING_EXCLUSIONS.EXP_001);

Object.entries(mapping).forEach(([shelfId, experienceId]) => {
  const deck = R.deckForEmotion(shelfId, '2026-08-23');
  const record = R.byId(experienceId, '2026-08-23');
  const actions = AD.actionsForExperience(record);
  check(`${shelfId} resolves only approved ${experienceId}`, deck &&
    JSON.stringify(deck.ids) === JSON.stringify([experienceId]) && deck.fillFlag === false);
  check(`${experienceId} title exact`, record && record.title === expectedTitles[experienceId]);
  check(`${experienceId} Human/real-data/liveness authority present`, record &&
    record.authority.reviewerHuman === true &&
    record.authority.realDataGateResult === 'REAL_DATA_GATE_READY_FOR_PHASE0' &&
    record.authority.livenessCheckedAt.startsWith('2026-08-23T'));
  check(`${experienceId} Why is shelf-specific and visible-ready`, record &&
    record.placeDetail && record.placeDetail.placementReason === record.reason &&
    /(感情書店|この棚に置いています)/.test(record.reason) && record.reason.length >= 45);
  check(`${experienceId} frozen source-trace Why exact`, record &&
    record.reason === frozenWhy[experienceId] &&
    record.placeDetail.placementReason === frozenWhy[experienceId]);
  check(`${experienceId} official Primary + Maps secondary`, actions.length === 2 &&
    actions[0].kind === 'primary' && actions[0].officiality === 'official' &&
    new URL(actions[0].url).protocol === 'https:' && actions[1].kind === 'maps');
  check(`${experienceId} Maps has public destination and no origin`, actions.length === 2 &&
    new URL(actions[1].url).searchParams.get('destination') === record.physicalDestination.address &&
    !new URL(actions[1].url).searchParams.has('origin'));
  check(`${experienceId} current place facts/provenance complete`, record &&
    record.duration && record.price && record.placeDetail.access.address &&
    record.placeDetail.access.nearestStation && record.placeDetail.access.walkingTime &&
    record.placeDetail.provenance.verifiedOn === '2026-08-23');
  check(`${experienceId} rights fail closed`, record &&
    record.rights.imageReuseApproved === false && record.rights.textReuseApproved === false &&
    R.validateVisualAsset(record.visualAsset, '2026-08-23').pass);
});

check('all 8 decks stay finite and never pad', R.SHELF_IDS.every((shelfId) => {
  const deck = R.deckForEmotion(shelfId, '2026-08-23');
  return deck.ids.length === 1 && deck.ids.length <= 3 && deck.fillFlag === false;
}));
check('wrong shelf relation leakage = 0', Object.entries(mapping).every(([shelfId, experienceId]) =>
  R.SHELF_IDS.every((other) => other === shelfId ||
    !R.deckForEmotion(other, '2026-08-23').ids.includes(experienceId))));
check('all event/changeover dates fail closed at recheck boundary',
  R.byId('EXP_101', '2026-08-25') === null &&
  R.byId('EXP_106', '2026-08-29') === null &&
  R.byId('EXP_103', '2026-09-14') === null &&
  R.byId('EXP_105', '2026-09-22') === null &&
  R.byId('EXP_007', '2026-09-30') === null);
check('invalid date fails every deck closed', R.SHELF_IDS.every((shelfId) =>
  R.deckForEmotion(shelfId, 'not-a-date').ids.length === 0));

check('public Shelf Lens exists for every shelf', [
  '身体や視線が前へ動き', '世話や手渡し', '形や細部へ視線', '重さや時間の堆積',
  '見慣れたものに別の面', '異なる方法や素材', '距離を取ること', '既存の言葉に閉じる前'
].every((phrase) => app.includes(phrase)) && app.includes('function selectedShelfLens()'));
check('public sequence exposes Shelf → Experience → Why → Action',
  app.indexOf('real-discovery-shelf') < app.indexOf("text: experience.title") &&
  app.indexOf("text: experience.title") < app.indexOf('real-discovery-reason') &&
  app.indexOf('real-discovery-reason') < app.indexOf('real-discovery-actions'));
check('mandatory Why label remains visible on card and Detail',
  (app.match(/なぜ、この棚に？/g) || []).length >= 2 &&
  app.includes('placeDetail.placementReason'));
check('Discovery card renders the full frozen Why without sentence truncation',
  /function cardEditorialHook\(experience\)[\s\S]*?return reason;\s*}/.test(app) &&
  !/sentences\[sentences\.length - 1\]/.test(app));
check('Human-approved Culture videos/Public Editorial are not mounted as Outing',
  !records.some((record) => /Coin Operated|One Small Step|The Black Hole|Before Dawn|Mr Indifferent/.test(record.title)));
check('Product-active public Editorial records remain 0',
  /records:\s*Object\.freeze\(\[\]\)/.test(read('v3-prototype/js/public_editorial_content.js')));
check('legacy unsupported source-trace clauses absent', ![
  '食卓を安心の象徴としてだけ見ていた視線が少し落ち着かなくなる',
  '自分の中を説明する代わりに外の景色へ視線を預ける',
  '用途より先に形へ目が引かれた'
].some((clause) => read('v3-prototype/js/real_experience_registry.js').includes(clause)));
check('Why copy makes no visitor-state or therapeutic promise', !/(あなたは|いま感じて|癒され|落ち着け|元気にな|治療|診断)/.test(
  Object.values(frozenWhy).join('\n')
));
check('commercial/affiliate/ranking fields = 0', !records.some((record) =>
  forbiddenField(record, /(affiliate|commission|revenue|conversion|ranking|popularity|tracking)/i)));

['v3-prototype/js/store.js', 'v3-prototype/js/analytics.js',
 'v3-prototype/js/action_destination.js', 'v3-prototype/js/data.js',
 'v3-prototype/js/personalize.js', 'v3-prototype/css/v3.css'].forEach((rel) => {
  check(`${rel} unchanged from activation base`, sha(bytes(rel)) === sha(atStart(rel)), sha(bytes(rel)));
});
check('assets unchanged from activation base', cp.execFileSync('git', [
  'diff', '--name-only', START, '--', 'v3-prototype/assets'
], { cwd: REPO, encoding: 'utf8' }).trim() === '');

const productJs = fs.readdirSync(path.join(SRC, 'js'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(path.join(SRC, 'js', name), 'utf8')).join('\n');
check('new analytics/network sender = 0', !/\bgtag\s*\(|\bsendBeacon\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(productJs));
check('geolocation = 0', !/navigator\s*\.\s*geolocation|\bgetCurrentPosition\s*\(/.test(productJs));
check('external AI = 0', !/(api\.openai|anthropic|generativelanguage|gemini)/i.test(productJs));
check('storage schema/key unchanged', read('v3-prototype/js/store.js').includes("var INTERESTED_KEY = 'interested-experiences-v1'") &&
  read('v3-prototype/js/store.js').includes("var STATE_KEY = 'session'"));

const changed = cp.execFileSync('git', ['diff', '--name-only', START, '--'], {
  cwd: REPO, encoding: 'utf8'
}).trim().split('\n').filter(Boolean);
check('bounded scope only', changed.every((rel) => [
  'v3-prototype/js/app.js',
  'v3-prototype/js/real_experience_registry.js',
  'v3-prototype/verify/real_world_outing_activation.js',
  'v3-prototype/verify/place_detail_content_typography.js'
].includes(rel)), changed.join(', '));
check('main/V2/Production/.ai-handoff/.github drift = 0', changed.every((rel) =>
  rel.startsWith('v3-prototype/') && !rel.startsWith('.ai-handoff/') && !rel.startsWith('.github/')));
check('dependency delta = 0', !changed.some((rel) =>
  /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(rel)));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
