/* =============================================================================
 * V3 Music Action Bridge — additive secondaryActionDestinations contract
 * Run: node verify/music_action_bridge.js
 *
 * Primary Action full compatibility + Music-only optional secondaries
 * (max 2, whole-set fail closed, no truncation, no provider hardcoding).
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function loadSandbox() {
  const sandbox = {
    open: (url, target, features) => {
      sandbox.__opens.push({ url, target, features });
      const win = {};
      Object.defineProperty(win, 'opener', {
        set(value) { sandbox.__openerAssignments.push(value); },
        get() { return undefined; }
      });
      return win;
    },
    __opens: [],
    __openerAssignments: []
  };
  global.window = sandbox;
  const root = path.resolve(__dirname, '..');
  ['js/cultural_matching.js', 'js/action_destination.js', 'js/real_experience_registry.js']
    .forEach((file) => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      // eslint-disable-next-line no-new-func
      new Function('window', 'global', source)(sandbox, sandbox);
    });
  return sandbox;
}

const sandbox = loadSandbox();
const AD = sandbox.V3_ACTION_DESTINATION;
const REAL = sandbox.V3_REAL_EXPERIENCE_REGISTRY;
const AS_OF = '2026-08-25';

function musicExperience(secondaries) {
  const experience = {
    id: 'QA_MUSIC_01',
    canonicalType: 'Music',
    actionDestination: {
      type: 'official_viewing',
      nextAction: 'listen',
      officiality: 'official',
      url: 'https://example-provider.test/listen/qa-album',
      label: '登録なしで試聴する'
    }
  };
  if (secondaries !== undefined) experience.secondaryActionDestinations = secondaries;
  return experience;
}

function secondary(overrides) {
  return Object.assign({
    type: 'official_viewing',
    nextAction: 'listen',
    officiality: 'official',
    url: 'https://second-provider.test/qa-album',
    label: '別の公式配信で聴く'
  }, overrides || {});
}

/* --- A. existing records: byte-for-byte Action compatibility --------------- */

const APPROVED = ['EXP_101', 'EXP_102', 'EXP_103', 'EXP_104',
  'EXP_105', 'EXP_106', 'EXP_107', 'EXP_007', 'EXP_001'];
APPROVED.forEach((id) => {
  const record = REAL.byId(id, AS_OF);
  if (!record) { check(`A. ${id} resolves for the compatibility check`, false); return; }
  const actions = AD.actionsForExperience(record);
  const hasMaps = Boolean(record.physicalDestination && record.physicalDestination.approved === true);
  const expectedCount = hasMaps ? 2 : 1;
  check(`A. ${id}: action set unchanged (primary${hasMaps ? ' + maps' : ' only'}, no secondary)`,
    actions.length === expectedCount &&
    actions[0].kind === 'primary' &&
    actions[0].url === record.actionDestination.url &&
    actions[0].label === record.actionDestination.label &&
    actions.every((action) => action.kind !== 'secondary') &&
    (!hasMaps || actions[1].kind === 'maps'),
    JSON.stringify(actions.map((action) => action.kind)));
});
check('A. absent secondaryActionDestinations changes nothing on a Music object',
  AD.actionsForExperience(musicExperience(undefined)).length === 1);
check('A. empty secondary array yields primary only',
  AD.actionsForExperience(musicExperience([])).length === 1);

/* --- B/C. valid secondaries keep authored order ---------------------------- */

const one = AD.actionsForExperience(musicExperience([secondary()]));
check('B. Music + 1 valid secondary: primary then secondary',
  one.length === 2 && one[0].kind === 'primary' && one[1].kind === 'secondary' &&
  one[1].url === 'https://second-provider.test/qa-album' &&
  one[1].actionType === 'listen' && one[1].destinationClass === 'official_viewing',
  JSON.stringify(one.map((action) => action.kind)));

const two = AD.actionsForExperience(musicExperience([
  secondary({ label: '配信サービスAで聴く', url: 'https://second-provider.test/a' }),
  secondary({ label: '配信サービスBで聴く', url: 'https://third-provider.test/b', type: 'official_page', officiality: 'official_designated' })
]));
check('C. Music + 2 valid secondaries: authored order preserved',
  two.length === 3 && two.map((action) => action.kind).join(',') === 'primary,secondary,secondary' &&
  two[1].url === 'https://second-provider.test/a' &&
  two[2].url === 'https://third-provider.test/b' &&
  two[2].destinationClass === 'official_page',
  two.map((action) => action.url).join(' | '));

/* --- D–I. fail-closed set, primary always preserved ------------------------ */

function expectPrimaryOnly(name, secondaries, experienceOverrides) {
  const experience = Object.assign(musicExperience(secondaries), experienceOverrides || {});
  const actions = AD.actionsForExperience(experience);
  check(name,
    actions.length === 1 && actions[0].kind === 'primary' &&
    actions[0].url === experience.actionDestination.url,
    JSON.stringify(actions.map((action) => action.kind)));
}

expectPrimaryOnly('D. 3 secondaries: whole set fails closed (no truncation), primary kept', [
  secondary({ url: 'https://a.test/1', label: 'A' }),
  secondary({ url: 'https://b.test/2', label: 'B' }),
  secondary({ url: 'https://c.test/3', label: 'C' })
]);
expectPrimaryOnly('E. non-Music with secondaries: set fails closed, primary kept',
  [secondary()], { canonicalType: 'Exhibition' });
expectPrimaryOnly('E2. missing canonicalType with secondaries fails closed',
  [secondary()], { canonicalType: undefined });
expectPrimaryOnly('F. duplicate secondary URLs fail closed', [
  secondary({ label: 'A' }),
  secondary({ label: 'B' })
]);
expectPrimaryOnly('G. secondary duplicating the primary URL fails closed',
  [secondary({ url: 'https://example-provider.test/listen/qa-album' })]);
expectPrimaryOnly('G2. duplicate labels fail closed', [
  secondary({ url: 'https://a.test/1' }),
  secondary({ url: 'https://b.test/2' })
]);
expectPrimaryOnly('H. HTTP secondary URL fails closed',
  [secondary({ url: 'http://second-provider.test/qa-album' })]);
expectPrimaryOnly('H2. credentialed secondary URL fails closed',
  [secondary({ url: 'https://user:pass@second-provider.test/qa' })]);
expectPrimaryOnly('H3. javascript: secondary URL fails closed',
  [secondary({ url: 'javascript:alert(1)' })]);
expectPrimaryOnly('I. invalid officiality fails closed',
  [secondary({ officiality: 'no_official_exists' })]);
expectPrimaryOnly('I2. invalid destination type fails closed',
  [secondary({ type: 'official_purchase' })]);
expectPrimaryOnly('I3. invalid nextAction fails closed',
  [secondary({ nextAction: 'view' })]);
expectPrimaryOnly('I4. malformed secondary object fails closed',
  ['https://second-provider.test/qa-album']);
expectPrimaryOnly('I5. non-array secondaryActionDestinations fails closed',
  secondary());

check('spec. no provider name is hardcoded in the runtime module',
  !/spotify|apple|itunes|youtube/i.test(
    fs.readFileSync(path.resolve(__dirname, '../js/action_destination.js'), 'utf8')));

/* --- J. openAction contract for kind='secondary' --------------------------- */

const hookEvents = [];
AD.onExternalOpen((event) => hookEvents.push(event));
const openable = AD.actionsForExperience(musicExperience([secondary()]));

sandbox.__opens.length = 0;
sandbox.__openerAssignments.length = 0;
const openedSecondary = AD.openAction(openable[1], 'QA_MUSIC_01');
check('J. secondary opens via HTTPS in a new tab with noopener,noreferrer',
  openedSecondary === true && sandbox.__opens.length === 1 &&
  sandbox.__opens[0].url === 'https://second-provider.test/qa-album' &&
  sandbox.__opens[0].target === '_blank' &&
  sandbox.__opens[0].features === 'noopener,noreferrer' &&
  sandbox.__openerAssignments.length === 1 && sandbox.__openerAssignments[0] === null,
  JSON.stringify(sandbox.__opens[0]));
check('J2. external-open event carries only experienceId/actionType/destinationClass',
  hookEvents.length === 1 &&
  Object.keys(hookEvents[0]).sort().join(',') === 'actionType,destinationClass,experienceId' &&
  hookEvents[0].actionType === 'listen' &&
  hookEvents[0].destinationClass === 'official_viewing' &&
  !JSON.stringify(hookEvents[0]).includes('https://'),
  JSON.stringify(hookEvents[0]));
check('J3. primary open contract unchanged',
  AD.openAction(openable[0], 'QA_MUSIC_01') === true &&
  sandbox.__opens[1].features === 'noopener,noreferrer');
check('J4. tampered secondary with http URL is rejected at open time',
  AD.openAction(Object.assign({}, openable[1], { url: 'http://second-provider.test/qa' }), 'QA_MUSIC_01') === false);
check('J5. unknown action kinds stay rejected',
  AD.openAction(Object.assign({}, openable[1], { kind: 'tertiary' }), 'QA_MUSIC_01') === false);

const passed = results.filter((result) => result.pass).length;
console.log(`\n${passed}/${results.length} PASS`);
process.exit(passed === results.length ? 0 : 1);
