/* =============================================================================
 * V3 Interested Retrieval — Bounded PASS B contract
 * 実行: node verify/interested_retrieval_b.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const retrievalSource = fs.readFileSync(path.join(SRC, 'js/interested_retrieval.js'), 'utf8');
const appSource = fs.readFileSync(path.join(SRC, 'js/app.js'), 'utf8');
const storeSource = fs.readFileSync(path.join(SRC, 'js/store.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const cssSource = fs.readFileSync(path.join(SRC, 'css/v3.css'), 'utf8');
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function loadRetrieval(real, action) {
  const window = {
    V3_REAL_EXPERIENCE_REGISTRY: real,
    V3_ACTION_DESTINATION: action,
    Object, Array, Date, RegExp, isNaN
  };
  vm.runInNewContext(retrievalSource, {
    window, Object, Array, Date, RegExp, isNaN
  }, { filename: 'interested_retrieval.js' });
  return window.V3_INTERESTED_RETRIEVAL;
}

const actionableRecord = {
  id: 'EXP_900', title: '検証用の場所', type: '場所',
  placeDetail: { access: { address: '公開住所' } }
};
function fakeRegistry(options = {}) {
  return {
    SHELF_IDS: ['mada'],
    byId(id) {
      if (options.withdrawn || id !== 'EXP_900') return null;
      return actionableRecord;
    },
    validateRecord() { return { pass: options.rightsInvalid !== true }; },
    deckForEmotion() {
      return { ids: options.noRelation ? [] : ['EXP_900'] };
    }
  };
}
const fakeAction = {
  actionsForExperience() {
    return [{ kind: 'primary', url: 'https://example.invalid/never-exported' }];
  }
};

function loadCurrentAuthorities() {
  const window = { URL, open() { return null; } };
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'js/data.js'), 'utf8'), { window }, {
    filename: 'data.js'
  });
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'js/action_destination.js'), 'utf8'), {
    window, URL, Object
  }, { filename: 'action_destination.js' });
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'js/cultural_matching.js'), 'utf8'), {
    window, URL, Object, Date, JSON, RegExp, Number, isNaN
  }, { filename: 'cultural_matching.js' });
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'js/real_experience_registry.js'), 'utf8'), {
    window, URL, Object, Date, JSON, RegExp, isNaN
  }, { filename: 'real_experience_registry.js' });
  vm.runInNewContext(retrievalSource, {
    window, Object, Array, Date, RegExp, isNaN
  }, { filename: 'interested_retrieval.js' });
  return window.V3_INTERESTED_RETRIEVAL;
}

const firstAt = '2026-08-23T00:00:00.000Z';
const secondAt = '2026-08-23T01:00:00.000Z';
const payload = { version: 1, items: [
  { experienceId: 'EXP_001', savedAt: firstAt },
  { experienceId: 'EXP_007', savedAt: secondAt }
] };

const fake = loadRetrieval(fakeRegistry(), fakeAction);
check('savedAt newest first', fake.sortedItems(payload)[0].experienceId === 'EXP_007');
check('sort does not mutate durable order', payload.items[0].experienceId === 'EXP_001');
check('valid current approved record resolves actionable',
  fake.resolveItem({ experienceId: 'EXP_900', savedAt: secondAt }).status === 'actionable');
const actionable = fake.resolveItem({ experienceId: 'EXP_900', savedAt: secondAt });
check('current Registry fields resolve for view', actionable.title === '検証用の場所' &&
  actionable.place === '公開住所' && actionable.shelfId === 'mada');
check('Action Destination URL not exported to retrieval view model',
  !Object.prototype.hasOwnProperty.call(actionable, 'url') && !/example\.invalid/.test(JSON.stringify(actionable)));

check('withdrawn/currently missing record fails closed',
  loadRetrieval(fakeRegistry({ withdrawn: true }), fakeAction)
    .resolveItem({ experienceId: 'EXP_900', savedAt: secondAt }).status === 'unavailable');
check('rights-invalid record fails closed',
  loadRetrieval(fakeRegistry({ rightsInvalid: true }), fakeAction)
    .resolveItem({ experienceId: 'EXP_900', savedAt: secondAt }).status === 'unavailable');
check('missing approved shelf relation fails closed',
  loadRetrieval(fakeRegistry({ noRelation: true }), fakeAction)
    .resolveItem({ experienceId: 'EXP_900', savedAt: secondAt }).status === 'unavailable');
check('missing primary Action Destination fails closed',
  loadRetrieval(fakeRegistry(), { actionsForExperience() { return []; } })
    .resolveItem({ experienceId: 'EXP_900', savedAt: secondAt }).status === 'unavailable');
check('malformed saved record fails closed',
  fake.resolveItem({ experienceId: '../x', savedAt: 'not-a-date' }).status === 'unavailable');

const current = loadCurrentAuthorities();
check('current EXP_007 resolves as actionable Outing',
  current.resolveItem({ experienceId: 'EXP_007', savedAt: secondAt }, '2026-08-23').status === 'actionable');
check('current EXP_001 resolves quiet unavailable, not fabricated Outing',
  current.resolveItem({ experienceId: 'EXP_001', savedAt: firstAt }, '2026-08-23').status === 'unavailable');
check('stale EXP_007 resolves quiet unavailable',
  current.resolveItem({ experienceId: 'EXP_007', savedAt: secondAt }, '2027-02-19').status === 'unavailable');

check('runtime module loads after Registry and before app',
  indexSource.indexOf('./js/real_experience_registry.js') < indexSource.indexOf('./js/interested_retrieval.js') &&
  indexSource.indexOf('./js/interested_retrieval.js') < indexSource.indexOf('./js/app.js'));
check('existing key unchanged', storeSource.includes("var INTERESTED_KEY = 'interested-experiences-v1'"));
check('existing schema remains version + items only',
  storeSource.includes("Object.keys(value).sort().join(',') !== 'items,version'") &&
  storeSource.includes("Object.keys(item).sort().join(',') !== 'experienceId,savedAt'"));
check('zero saved items produce zero retrieval entry',
  appSource.includes("interested.items.length ? h('button'") &&
  appSource.includes("class: 'interested-entry'"));
check('retrieval is a dialog layer, not a full-screen surface',
  appSource.includes("class: 'interested-layer', role: 'dialog'") &&
  appSource.includes("'aria-modal': 'true'") &&
  !/SURFACES\s*=\s*\{[^}]*interested/s.test(appSource));
check('actionable items provide view and remove',
  appSource.includes("text: '見る'") && appSource.includes("text: '保存を解除'"));
check('unavailable items provide no view action',
  appSource.includes("if (actionable) {") && appSource.includes("現在は案内できません"));
check('unavailable copy is quiet and fail closed',
  appSource.includes('最新の確認条件を満たしていないため、詳細は表示していません。'));
check('view reconstructs current approved shelf/deck only',
  appSource.includes("state.emotion = item.shelfId") &&
  appSource.includes("startDeck('real-approved', [item.experienceId])"));
check('external Action is not invoked from retrieval layer',
  !/openApprovedDestination|openAction/.test(
    appSource.slice(appSource.indexOf('function viewInterestedItem'), appSource.indexOf('function removeInterestedItem'))));
check('remove UI updates only after durable success',
  appSource.indexOf('result.ok !== true', appSource.indexOf('function removeInterestedItem')) <
  appSource.indexOf('interested = result.value', appSource.indexOf('function removeInterestedItem')));
check('modal focus is trapped and Escape closes',
  appSource.includes("event.key === 'Escape'") && appSource.includes("event.key !== 'Tab'") &&
  appSource.includes('last.focus()') && appSource.includes('first.focus()'));
check('modal restores opener focus',
  appSource.includes('document.contains(interestedOpener)') && appSource.includes('interestedOpener.focus()'));
check('background becomes inert while dialog is open',
  appSource.includes('node.inert = value') && appSource.includes("setBackgroundInert(true)"));
check('layer CSS has bounded sheet/modal geometry',
  cssSource.includes('.interested-layer') && cssSource.includes('max-height: min(78vh, 760px)') &&
  cssSource.includes('@media (min-width: 700px)'));

const boundedSources = retrievalSource + '\n' + appSource;
check('retrieval adds no analytics/network sender',
  !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|\bgtag\s*\(|dataLayer\.push/.test(boundedSources));
check('retrieval adds no geolocation/external AI/login/cloud sync',
  !/navigator\s*\.\s*geolocation|api\.openai|anthropic|generativelanguage|oauth|signIn|cloudSync/i.test(boundedSources));
check('retrieval does not add URL/query/history routing',
  !/location\.(search|hash|href)|history\.(pushState|replaceState)|URLSearchParams/.test(retrievalSource));
check('retrieval model has no ranking/personalization/commercial fields',
  !/popularity|ranking|rankScore|revenue|commission|affiliate|personaliz|gamif/i.test(retrievalSource));
check('saved identity is not added to analytics or URL',
  !/analytics|gtag|dataLayer|URLSearchParams|location\.(search|hash)/.test(retrievalSource));
check('private/Product fields remain absent from persisted schema',
  storeSource.includes("Object.keys(value).sort().join(',') !== 'items,version'") &&
  storeSource.includes("Object.keys(item).sort().join(',') !== 'experienceId,savedAt'"));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
