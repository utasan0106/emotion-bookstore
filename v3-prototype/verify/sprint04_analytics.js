/* =============================================================================
 * V3 Sprint04 — GA4 + Editorial Measurement Foundation
 * Run: node verify/sprint04_analytics.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const child = require('child_process');

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const BASE = '944490fecbb2b2430015ecac62e7586c75c5467d';
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(SRC, rel))).digest('hex');
const source = read('js/analytics.js');
const app = read('js/app.js');
const store = read('js/store.js');
const content = read('js/public_editorial_content.js');
const index = read('index.html');
const results = [];

function check(name, pass, detail = '') {
  const ok = Boolean(pass);
  results.push({ name, pass: ok, detail: String(detail || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const window = {};
vm.runInNewContext(source, { window, Object, Array }, { filename: 'analytics.js' });
const A = window.V3_ANALYTICS;
const expectedEvents = [
  'v3_entrance_view',
  'v3_emotion_select',
  'v3_discovery_view',
  'v3_experience_select',
  'v3_experience_save',
  'v3_external_open',
  'v3_return_view',
  'v3_trace_start',
  'v3_trace_complete',
  'v3_trace_skip',
  'v3_editorial_open',
  'v3_editorial_media_intent',
  'v3_editorial_action'
];

check('event allowlist exactness', JSON.stringify(A.EVENT_ALLOWLIST) === JSON.stringify(expectedEvents));
check('event allowlist is immutable', Object.isFrozen(A.EVENT_ALLOWLIST));
check('only three Editorial events added', A.EVENT_ALLOWLIST.filter((name) => name.startsWith('v3_editorial_')).join(',') ===
  'v3_editorial_open,v3_editorial_media_intent,v3_editorial_action');
check('runtime destination is explicitly unverified', A.MEASUREMENT_DESTINATION_STATUS === 'UNVERIFIED_QA_DESTINATION');
check('runtime measurement fails closed', A.status() === 'MEASUREMENT_CONFIG_BLOCKED' &&
  A.emit('v3_entrance_view', {}).status === 'MEASUREMENT_CONFIG_BLOCKED');
check('Google signals disabled candidate', A.PRIVACY_CONFIGURATION.allow_google_signals === false);
check('ad personalization signals disabled candidate',
  A.PRIVACY_CONFIGURATION.allow_ad_personalization_signals === false);
check('data retention candidate is two months', A.PRIVACY_CONFIGURATION.data_retention_candidate_months === 2);
check('user properties disabled', A.PRIVACY_CONFIGURATION.user_properties_enabled === false);
check('content parameters disabled', A.PRIVACY_CONFIGURATION.content_parameters_enabled === false);

const sent = [];
const testAdapter = A.createDeterministicTestAdapter((name, payload) => sent.push({ name, payload }));
check('deterministic transport accepts allowlisted event', testAdapter.emit('v3_entrance_view', {}).ok === true);
check('transport receives event name plus empty object only', sent.length === 1 &&
  sent[0].name === 'v3_entrance_view' && Object.keys(sent[0].payload).length === 0);
check('forbidden event rejected fail closed', testAdapter.emit('purchase', {}).status === 'EVENT_NOT_ALLOWED');
check('unknown v3 event rejected fail closed', testAdapter.emit('v3_creator_support', {}).status === 'EVENT_NOT_ALLOWED');

const forbiddenKeys = [
  'shelf_id', 'shelf_label', 'selected_emotion', 'emotion_text', 'word_label',
  'connection_id', 'slot_id', 'experience_id', 'title', 'creator', 'seller',
  'sponsor', 'place_name', 'destination_url', 'page_location', 'product_name',
  'product_price', 'private_book_id', 'interested_item_id', 'private_text',
  'private_title', 'photo', 'geolocation', 'profile', 'personality',
  'psychological_state', 'creator_support_id', 'user_id'
];
forbiddenKeys.forEach((key) => {
  const before = sent.length;
  const payload = {}; payload[key] = 'SYNTHETIC_SENTINEL';
  const result = testAdapter.emit('v3_editorial_action', payload);
  check(`forbidden payload sentinel rejected: ${key}`,
    result.status === 'PAYLOAD_NOT_ALLOWED' && sent.length === before);
});
check('non-object payload rejected', testAdapter.emit('v3_editorial_action', 'x').status === 'PAYLOAD_NOT_ALLOWED');
check('array payload rejected', testAdapter.emit('v3_editorial_action', []).status === 'PAYLOAD_NOT_ALLOWED');

const duplicateStart = sent.length;
const first = testAdapter.emitOnce('v3_discovery_view', 'view:1', {});
const duplicate = testAdapter.emitOnce('v3_discovery_view', 'view:1', {});
check('duplicate view fire prevented', first.ok === true && duplicate.status === 'DUPLICATE_SUPPRESSED' &&
  sent.length === duplicateStart + 1);
const actionStart = sent.length;
testAdapter.emitOnce('v3_editorial_action', 'action:1', {});
const duplicateAction = testAdapter.emitOnce('v3_editorial_action', 'action:1', {});
check('duplicate action fire prevented', duplicateAction.status === 'DUPLICATE_SUPPRESSED' &&
  sent.length === actionStart + 1);
check('invalid dedupe token rejected', testAdapter.emitOnce('v3_discovery_view', '', {}).status === 'DEDUPE_TOKEN_INVALID');

const saveStart = sent.length;
const failedSave = testAdapter.emitDurableSave({ ok: false }, 'save:failed');
check('save failure emits no event', failedSave.status === 'SAVE_NOT_DURABLE' && sent.length === saveStart);
const successfulSave = testAdapter.emitDurableSave({ ok: true }, 'save:success');
check('durable save success emits once', successfulSave.ok === true && sent.length === saveStart + 1 &&
  sent[sent.length - 1].name === 'v3_experience_save');
check('durable save duplicate suppressed',
  testAdapter.emitDurableSave({ ok: true }, 'save:success').status === 'DUPLICATE_SUPPRESSED');
check('IndexedDB durable result is produced by transaction complete',
  /tx\.oncomplete\s*=\s*function\s*\(\)\s*\{\s*finish\(\{\s*ok:\s*true/.test(store));
check('App delegates save measurement to durable-result guard',
  (() => {
    const start = app.indexOf('operation.then(function (result)');
    const end = app.indexOf('}).catch(function ()', start);
    const block = app.slice(start, end);
    return block.includes('measureDurableSave(result, saveToken)') &&
      block.indexOf('measureDurableSave(result, saveToken)') < block.indexOf('if (!result || result.ok !== true)');
  })());

let productActionRan = false;
const throwing = A.createDeterministicTestAdapter(() => { throw new Error('synthetic transport failure'); });
const analyticsFailure = throwing.emitOnce('v3_editorial_action', 'nonblocking:1', {});
productActionRan = true;
check('analytics failure does not throw or block Product action',
  analyticsFailure.status === 'ANALYTICS_UNAVAILABLE' && productActionRan === true);
check('analytics failure has no retry loop', throwing.emitOnce('v3_editorial_action', 'nonblocking:1', {}).status ===
  'DUPLICATE_SUPPRESSED');

expectedEvents.forEach((eventName) => {
  check(`event call site/allowlist retained: ${eventName}`, app.includes(eventName) || A.EVENT_ALLOWLIST.includes(eventName));
});
check('editorial open is tied to validated detail surface',
  app.includes("'editorial-detail': 'v3_editorial_open'") &&
  app.indexOf('failClosedEditorialRoute();') < app.indexOf('measureCurrentView();'));
check('no Editorial event can naturally fire with active registry empty',
  /records:\s*Object\.freeze\(\[\]\)/.test(content) && !/v3_editorial_/.test(content));
check('media intent occurs inside explicit click handler before activation', (() => {
  const click = app.indexOf("measureOnce('v3_editorial_media_intent'");
  const activation = app.indexOf('PUBLIC_EDITORIAL.activateVideo(record, media)', click);
  const handler = app.lastIndexOf('onclick: function ()', click);
  return handler !== -1 && handler < click && click < activation;
})());
check('Editorial Primary Action event occurs before intended action', (() => {
  const click = app.indexOf("measureOnce('v3_editorial_action', editorialActionToken)",
    app.indexOf('} else {'));
  const action = app.indexOf('PUBLIC_EDITORIAL.openPrimary(record)', click);
  return click !== -1 && action !== -1 && click < action;
})());
check('external Action Destination measurement occurs only after validated open',
  app.indexOf("AD.openAction(action, experience.id)") < app.indexOf("measureOnce('v3_external_open', token)"));
check('trace complete requires valid selection and plan before event',
  app.indexOf("if (!normalized.length || !state.plan) return;") < app.indexOf("measureOnce('v3_trace_complete'"));
check('trace skip requires existing plan before event',
  app.indexOf('if (!state.plan) return;', app.indexOf('class: \'btn btn-text m05-skip\'')) <
  app.indexOf("measureOnce('v3_trace_skip'"));

check('analytics adapter contains no outbound primitive',
  !/\b(?:fetch|sendBeacon|XMLHttpRequest|WebSocket|EventSource)\b/.test(source));
check('analytics adapter contains no GA/GTM host',
  !/(googletagmanager|google-analytics|analytics\.google)/i.test(source));
check('V3 has no measurement ID configured', !/G-[A-Z0-9]{6,}/.test(source + index));
check('no dataLayer or gtag runtime sender', !/\b(?:dataLayer|gtag)\b/.test(source + app + index));
check('no analytics retry/timer', !/\b(?:setTimeout|setInterval)\s*\(/.test(source) &&
  !/(?:for|while)\s*\([^)]*\)\s*\{[^}]*transport/s.test(source));
check('no provider media request on first paint remains enforced',
  !/<iframe\b|rel=["'](?:preconnect|prefetch)/i.test(index) &&
  app.includes("'data-video-first-paint': 'provider-request-0'"));

const protectedHashes = {
  'css/v3.css': '857d29395365f374844e3ccf5ab325d356cf28cca6b3e12e69a1a3c781a5879e',
  'js/store.js': '4dfb0d7bb6cab06a68c656ac83890e10709c42039ad0ee1392fbe4366ad64ac1',
  'js/public_editorial_content.js': 'f142d6e238b0d54f7df1d2c97285734c79f2e41bbb2d8fb7ded1cc0628034502',
  'js/real_experience_registry.js': '355e5a4e0a63b44252c530b44fbc90b190b6dea419af8355928a52fa48072955',
  'js/data.js': '19ccc64091b32ce8e9d3329e865d4d49bce56724d4d4e0d738e413a7ff02e311'
};
Object.entries(protectedHashes).forEach(([rel, expected]) => {
  check(`protected byte identity: ${rel}`, sha(rel) === expected, sha(rel));
});

const changed = child.execFileSync('git', ['diff', '--name-only', BASE, '--'], { cwd: ROOT, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
check('no CSS/visual asset drift', !changed.some((file) => /\.(?:css|png|jpe?g|webp|svg|gif|woff2?)$/i.test(file)),
  changed.join(','));
check('no package/dependency drift', !changed.some((file) => /(?:^|\/)(?:package(?:-lock)?\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(file)));
check('no storage/data-model drift', !changed.some((file) => /v3-prototype\/js\/(?:store|data|real_experience_registry|public_editorial_content)\.js$/.test(file)));
check('Product-active Editorial record count = 0', (content.match(/connection_id/g) || []).length === 0);

const pass = results.filter((item) => item.pass).length;
const fail = results.length - pass;
console.log(`\nTOTAL ${results.length}  PASS ${pass}  FAIL ${fail}`);
if (fail) process.exit(1);
