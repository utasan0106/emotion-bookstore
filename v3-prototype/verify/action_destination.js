/* =============================================================================
 * V3 Release Muscle Sprint 01 — Action Destination static/unit contract
 * 実行: node verify/action_destination.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(SRC, 'js/action_destination.js'), 'utf8');
const app = fs.readFileSync(path.join(SRC, 'js/app.js'), 'utf8');
const index = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const productJs = fs.readdirSync(path.join(SRC, 'js'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(path.join(SRC, 'js', name), 'utf8'))
  .join('\n');

const openCalls = [];
const openedWindow = { opener: 'unsafe' };
const window = {
  URL,
  open(url, target, features) {
    openCalls.push({ url, target, features });
    return openedWindow;
  }
};
vm.runInNewContext(source, { window, URL, Object }, { filename: 'action_destination.js' });
const AD = window.V3_ACTION_DESTINATION;

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const valid = {
  id: 'E-APPROVED-01',
  actionDestination: {
    type: 'official_booking',
    nextAction: 'book',
    officiality: 'official',
    url: 'https://approved.example/path?slot=1',
    label: '公式サイトで予約する'
  }
};

check('Action Destination type enum exact', JSON.stringify(AD.ACTION_TYPES) === JSON.stringify([
  'official_page', 'official_booking', 'official_purchase', 'official_viewing', 'map_directions'
]));
check('nextAction enum exact', JSON.stringify(AD.NEXT_ACTIONS) === JSON.stringify([
  'read', 'view', 'listen', 'visit', 'book', 'attend', 'purchase', 'other'
]));
check('officiality enum exact', JSON.stringify(AD.OFFICIALITY) === JSON.stringify([
  'official', 'official_designated', 'no_official_exists'
]));

const validActions = AD.actionsForExperience(valid);
check('A valid HTTPS destination resolves', validActions.length === 1 &&
  validActions[0].url === 'https://approved.example/path?slot=1' &&
  validActions[0].label === '公式サイトで予約する');
check('A valid HTTPS destination opens', AD.openAction(validActions[0], valid.id) &&
  openCalls.length === 1 && openCalls[0].url === validActions[0].url);
check('F new tab + noopener/noreferrer', openCalls[0].target === '_blank' &&
  openCalls[0].features === 'noopener,noreferrer' && openedWindow.opener === null,
  JSON.stringify(openCalls[0]));

function destinationWith(url) {
  return Object.assign({}, valid, {
    actionDestination: Object.assign({}, valid.actionDestination, { url })
  });
}
const callsBeforeInvalid = openCalls.length;
check('B javascript URL rejected', AD.actionsForExperience(destinationWith('javascript:alert(1)')).length === 0);
check('C data URL rejected', AD.actionsForExperience(destinationWith('data:text/html,unsafe')).length === 0);
check('file URL rejected', AD.actionsForExperience(destinationWith('file:///tmp/unsafe')).length === 0);
check('D malformed URL rejected', AD.actionsForExperience(destinationWith('not a URL')).length === 0);
check('credentials in URL rejected', AD.actionsForExperience(destinationWith('https://user:pass@example.com/')).length === 0);
check('invalid destination never opens/falls back', !AD.openAction({
  kind: 'primary', url: 'javascript:alert(1)', actionType: 'book', destinationClass: 'official_booking'
}, valid.id) && openCalls.length === callsBeforeInvalid);

check('E missing AD produces zero actions', AD.actionsForExperience({ id: 'E-MISSING' }).length === 0);
check('missing required field produces zero actions', AD.actionsForExperience({
  id: 'E-INCOMPLETE', actionDestination: { type: 'official_page', url: 'https://example.com/' }
}).length === 0);

const physical = Object.assign({}, valid, {
  physicalDestination: { approved: true, address: '東京都千代田区丸の内1-1' }
});
const physicalActions = AD.actionsForExperience(physical);
const maps = physicalActions[1];
check('G Maps URL contains encoded destination', physicalActions.length === 2 &&
  maps.url === 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('東京都千代田区丸の内1-1'));
const mapsParsed = new URL(maps.url);
check('H Maps URL contains NO origin', !mapsParsed.searchParams.has('origin') &&
  mapsParsed.searchParams.get('destination') === '東京都千代田区丸の内1-1');
check('Maps remains secondary to approved primary', physicalActions[0].kind === 'primary' && maps.kind === 'maps');
check('unapproved address creates no Maps action', AD.actionsForExperience(Object.assign({}, valid, {
  physicalDestination: { approved: false, address: '東京都千代田区丸の内1-1' }
})).length === 1);

let hookPayload = null;
AD.onExternalOpen((payload) => { hookPayload = payload; });
AD.openAction(validActions[0], valid.id);
check('analytics-ready hook carries only non-private identifiers', JSON.stringify(hookPayload) === JSON.stringify({
  experienceId: valid.id,
  actionType: 'book',
  destinationClass: 'official_booking'
}), JSON.stringify(hookPayload));
AD.onExternalOpen(null);

const normalized = AD.normalize(Object.assign({}, valid.actionDestination, {
  affiliateId: 'forbidden', trackingCode: 'forbidden', price: 'forbidden'
}));
check('J commercial/tracking fields are not part of normalized model',
  normalized && !('affiliateId' in normalized) && !('trackingCode' in normalized) && !('price' in normalized));
check('I geolocation API usage = 0', !/navigator\s*\.\s*geolocation|\bgetCurrentPosition\s*\(/.test(productJs));
check('K analytics network = 0', !/\bgtag\s*\(|\bsendBeacon\s*\(|\bfetch\s*\(|XMLHttpRequest/.test(productJs));
check('index loads Action Destination before app',
  index.indexOf('./js/action_destination.js') > index.indexOf('./js/personalize.js') &&
  index.indexOf('./js/action_destination.js') < index.indexOf('./js/app.js'));
check('Detail/Discovery use approved actions and no prototype external stub remains',
  app.includes('approvedDestinationActions(experience)') &&
  app.includes("'data-action-destination': action.kind") &&
  !app.includes('PROTOTYPE_EXTERNAL_LINK_STUB') && !app.includes('externalPrototypeStub'));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
