/* =============================================================================
 * V3 Sprint05 — Privacy / External Transmission Audit
 * Run: node verify/sprint05_privacy_external_transmission.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const BASE = '5e40791412223faddb909ed407268dc6977538db';
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const readRoot = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(SRC, rel))).digest('hex');
const git = (args) => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const results = [];

function check(name, pass, detail = '') {
  const ok = Boolean(pass);
  results.push({ name, pass: ok, detail: String(detail || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const index = read('index.html');
const css = read('css/v3.css');
const app = read('js/app.js');
const store = read('js/store.js');
const adSource = read('js/action_destination.js');
const registrySource = read('js/real_experience_registry.js');
const editorialSource = read('js/public_editorial.js');
const editorialContent = read('js/public_editorial_content.js');
const analyticsSource = read('js/analytics.js');
const runtimeJs = fs.readdirSync(path.join(SRC, 'js')).filter((name) => name.endsWith('.js'))
  .map((name) => read('js/' + name)).join('\n');
const matrix = JSON.parse(read('docs/privacy-audit/EXTERNAL_TRANSMISSION_MATRIX.json'));
const networkTruth = read('docs/privacy-audit/CURRENT_RELEASE_NETWORK_TRUTH.md');
const privateProof = read('docs/privacy-audit/PRIVATE_CONTENT_TRANSMISSION_PROOF.md');
const ga4Note = read('docs/privacy-audit/GA4_CURRENT_VS_FUTURE_CONDITIONAL_NOTE.md');
const redline = read('docs/privacy-audit/PRIVACY_TERMS_EXACT_REDLINE_MAP.md');
const holdList = read('docs/privacy-audit/P0_P1_HOLD_LIST.md');
const memoryPrint = read('docs/privacy-audit/MEMORY_PRINT_FUTURE_NOTE_ONLY.md');
const privacy = readRoot('privacy.html');
const terms = readRoot('terms.html');
const rootServiceWorker = readRoot('sw.js');

const requiredFields = [
  'feature', 'classification', 'trigger', 'host', 'request_navigation_type',
  'timing', 'data_sent', 'user_authored_private_content', 'persistent_identifier',
  'purpose', 'release_disposition', 'code_evidence'
];
check('truth model version explicit', matrix.model_version === 'v3-external-transmission-truth-v1');
check('truth model anchors exact Sprint04 source', matrix.as_of_source === BASE);
check('all matrix classifications are bounded', matrix.entries.every((entry) =>
  ['A', 'B', 'C', 'D', 'E', 'NONE'].includes(entry.classification)));
check('every matrix row has required fields', matrix.entries.every((entry) =>
  requiredFields.every((field) => Object.prototype.hasOwnProperty.call(entry, field))));
check('matrix IDs are unique', new Set(matrix.entries.map((entry) => entry.id)).size === matrix.entries.length);

const byId = Object.fromEntries(matrix.entries.map((entry) => [entry.id, entry]));
check('hosting document classified same-origin', byId.HOSTING_DOCUMENT.classification === 'E');
check('static resources classified same-origin', byId.HOSTING_STATIC_RESOURCES.classification === 'E');
check('legacy service worker is environment-conditional same-origin only',
  byId.PREEXISTING_ORIGIN_SERVICE_WORKER.classification === 'E' &&
  byId.PREEXISTING_ORIGIN_SERVICE_WORKER.release_disposition === 'ENVIRONMENT_CONDITIONAL_NO_V3_REGISTRATION');
check('analytics classified D and blocked', byId.GA4_RUNTIME.classification === 'D' &&
  byId.GA4_RUNTIME.release_disposition === 'CURRENT_BLOCKED_NO_TRANSMISSION');
check('EXP_007 official navigation classified A', byId.EXP007_OFFICIAL.classification === 'A' &&
  byId.EXP007_OFFICIAL.host === 'fng.or.jp');
check('Maps navigation classified A', byId.EXP007_MAPS.classification === 'A' &&
  byId.EXP007_MAPS.host === 'www.google.com');
check('EXP_001 correctly marked registry-only',
  byId.EXP001_OFFICIAL_DORMANT.release_disposition === 'CURRENT_REGISTRY_ONLY_NO_RUNTIME_TRANSMISSION');
check('future embeds classified B', byId.EDITORIAL_YOUTUBE_EMBED_FUTURE.classification === 'B' &&
  byId.EDITORIAL_VIMEO_EMBED_FUTURE.classification === 'B');
check('browser storage classified non-transmission', byId.BROWSER_STORAGE_BOUNDARY.classification === 'NONE');
check('absent features classified no transmission', byId.ABSENT_FEATURES.release_disposition ===
  'NOT_IMPLEMENTED_NO_TRANSMISSION');

const firstPaintRefs = [
  ...index.matchAll(/<(?:script|link|img|source)\b[^>]*(?:src|href|srcset)=["']([^"']+)/gi)
].map((match) => match[1]);
check('first-paint document refs are same-origin relative', firstPaintRefs.length > 0 &&
  firstPaintRefs.every((ref) => !/^https?:\/\//i.test(ref)), firstPaintRefs.join(','));
const cssUrls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map((match) => match[1]);
check('CSS resources are local/self-hosted', cssUrls.length > 0 &&
  cssUrls.every((ref) => !/^https?:\/\//i.test(ref)), cssUrls.slice(0, 8).join(','));
check('no preconnect/prefetch or first-paint iframe', !/<iframe\b|rel=["'](?:preconnect|prefetch)/i.test(index));
check('first-paint third-party request count = 0', matrix.current_counts.first_paint_third_party_requests === 0);
check('V3 does not register a service worker', !/navigator\s*\.\s*serviceWorker|serviceWorker\s*\.\s*register/.test(runtimeJs + index));
check('legacy root service worker adds no external host or private payload',
  rootServiceWorker.includes('fetch(event.request)') &&
  rootServiceWorker.includes('caches.match(event.request)') &&
  !/https?:\/\//i.test(rootServiceWorker));

check('no hidden Product fetch/beacon/XHR/WebSocket/EventSource',
  !/\b(?:fetch|sendBeacon|XMLHttpRequest|WebSocket|EventSource)\b/.test(runtimeJs));
check('no weather/book/music/share host in V3 runtime',
  !/(open-meteo|googleapis|itunes\.apple|books\.google|api\.spotify|x\.com\/intent|twitter\.com\/intent)/i.test(runtimeJs + index));
check('no geolocation primitive', !/navigator\s*\.\s*geolocation|\b(?:getCurrentPosition|watchPosition)\s*\(/.test(runtimeJs));
check('no external AI primitive/host', !/(api\.openai|anthropic|generativelanguage|externalAI|openai\s*\()/i.test(runtimeJs));
check('no login/cloud sync primitive', !/(oauth|signIn\s*\(|login\s*\(|cloudSync\s*\()/i.test(runtimeJs));

const analyticsWindow = {};
vm.runInNewContext(analyticsSource, { window: analyticsWindow, Object, Array }, { filename: 'analytics.js' });
const analytics = analyticsWindow.V3_ANALYTICS;
check('GA4 destination absent/fail-closed', analytics.status() === 'MEASUREMENT_CONFIG_BLOCKED' &&
  analytics.MEASUREMENT_DESTINATION_STATUS === 'UNVERIFIED_QA_DESTINATION');
check('GA4 sender/host absent', !/\b(?:gtag|dataLayer|fetch|sendBeacon)\b|googletagmanager|google-analytics/i.test(
  analyticsSource + index));
check('GA4 Product payload is empty only', analytics.createDeterministicTestAdapter(() => {}).emit(
  'v3_entrance_view', { shelf_id: 'SYNTHETIC' }).status === 'PAYLOAD_NOT_ALLOWED');
let actionContinued = false;
const failingAnalytics = analytics.createDeterministicTestAdapter(() => { throw new Error('synthetic'); });
const analyticsResult = failingAnalytics.emitOnce('v3_external_open', 'proof:1', {});
actionContinued = true;
check('Product Action continues if analytics fails', analyticsResult.status === 'ANALYTICS_UNAVAILABLE' && actionContinued);
check('analytics outbound host count = 0', matrix.current_counts.analytics_outbound_hosts === 0);

const adWindow = { open() { return { opener: 'initial' }; } };
vm.runInNewContext(adSource, { window: adWindow, URL, Object }, { filename: 'action_destination.js' });
vm.runInNewContext(registrySource, { window: adWindow, URL, Object, Date, JSON, RegExp, isNaN },
  { filename: 'real_experience_registry.js' });
const AD = adWindow.V3_ACTION_DESTINATION;
const R = adWindow.V3_REAL_EXPERIENCE_REGISTRY;
const exp007Actions = AD.actionsForExperience(R.byId('EXP_007'));
check('current reachable destination hosts exact', new URL(exp007Actions[0].url).hostname === 'fng.or.jp' &&
  new URL(exp007Actions[1].url).hostname === 'www.google.com');
check('Maps sends public destination and no origin', exp007Actions[1].url.includes('destination=') &&
  !/[?&]origin=/.test(exp007Actions[1].url));
check('external actions use noopener,noreferrer', adSource.includes("'_blank', 'noopener,noreferrer'"));
check('externality is visible without warning-modal proliferation',
  registrySource.includes("label: '公式サイトを見る'") && app.includes("? '地図で見る' : action.label") &&
  app.includes("text: '↗'") && app.includes('新しいタブで開きました'));
check('Action URL contains no shelf/Interested/Plan/Trace identity', exp007Actions.every((action) =>
  !/(shelf|emotion|interested|savedAt|plan|trace)/i.test(action.url)));

check('active public Editorial record count = 0', /records:\s*Object\.freeze\(\[\]\)/.test(editorialContent));
check('Editorial provider request not present on first paint', !/<iframe\b/i.test(index) &&
  !/youtube-nocookie|player\.vimeo/.test(index));
check('Editorial embed created only inside explicit activation function',
  editorialSource.indexOf("createElement('iframe')") > editorialSource.indexOf('function activateVideo'));
check('Editorial approved embed hosts/paths strict',
  editorialSource.includes("youtube: 'www.youtube-nocookie.com'") &&
  editorialSource.includes("vimeo: 'player.vimeo.com'") &&
  editorialSource.includes('/^\\/embed\\/[A-Za-z0-9_-]+$/') &&
  editorialSource.includes('/^\\/video\\/\\d+$/'));
check('unknown video permission fails closed', editorialSource.includes("reasons.push('VIDEO_PERMISSION_UNKNOWN')"));
check('missing/invalid embed permission fails closed', editorialSource.includes("reasons.push('VIDEO_EMBED_NOT_APPROVED')"));

check('store has no network primitive', !/\b(?:fetch|sendBeacon|XMLHttpRequest|WebSocket|EventSource)\b/.test(store));
check('existing storage keys only', store.includes("var STATE_KEY = 'session'") &&
  store.includes("var INTERESTED_KEY = 'interested-experiences-v1'"));
check('private body/title/photo input absent', !/<textarea\b|type=["']file["']/i.test(index) &&
  !/type:\s*'file'|createElement\(['"]textarea/i.test(app));
check('selected state not serialized into History URL',
  app.includes("pushState({ v3Screen: screen }, '', global.location.href)") &&
  !/pushState\([^\n]*(?:experienceId|selectedId|emotion|shelf|plan|trace)/.test(app));
check('private user-authored content external transmission count = 0',
  matrix.current_counts.private_user_authored_content_external_transmissions === 0 &&
  privateProof.includes('PRIVATE USER-AUTHORED CONTENT EXTERNAL TRANSMISSION = 0'));

check('current network truth separates hosting from third-party action',
  networkTruth.includes('Current first paint') && networkTruth.includes('Current explicit external actions'));
check('current network truth discloses conditional legacy service worker',
  networkTruth.includes('V3 does not register a service worker') &&
  networkTruth.includes('network-first `fetch(event.request)`'));
check('GA4 note separates current and future', ga4Note.includes('Current V3 Release') &&
  ga4Note.includes('Future activation gates') && ga4Note.includes('現在は送信先が未設定'));
check('GA4 Admin settings remain unverified', ga4Note.includes('Source constants are implementation candidates'));
check('Memory Print is future explicit opt-in only', memoryPrint.includes('not implemented or pre-authorized') &&
  memoryPrint.includes('selected photo/text') && memoryPrint.includes('shipping information'));
check('Memory Print runtime implementation absent', !/Memory Print|memory[-_ ]?print/i.test(runtimeJs + index));

check('legacy Privacy has current-V3 Google Fonts mismatch documented',
  privacy.includes('fonts.googleapis.com') && redline.includes('P0-03'));
check('legacy Terms has current-V3 GA4 active mismatch documented',
  terms.includes('アクセス解析（Google Analytics）は公開環境でのみ動作します') && redline.includes('P0-02'));
check('legacy/future API/weather mismatch documented',
  privacy.includes('Open-Meteo') && terms.includes('Google Books API') && redline.includes('P0-04'));
check('P0 exact count = 8', (redline.match(/^### P0-/gm) || []).length === 8 && holdList.includes('P0 MUST FIX BEFORE RELEASE: **8**'));
check('P1 exact count = 5', (redline.match(/^### P1-/gm) || []).length === 5 && holdList.includes('P1 SHOULD FIX BEFORE RELEASE: **5**'));
check('Privacy alignment HOLD reason is disclosure mismatch, not GA4 block',
  holdList.includes('PRIVACY_RELEASE_ALIGNMENT_HOLD') && holdList.includes('not itself the HOLD reason'));

const protectedExpected = {
  'css/v3.css': '857d29395365f374844e3ccf5ab325d356cf28cca6b3e12e69a1a3c781a5879e',
  'js/store.js': '4dfb0d7bb6cab06a68c656ac83890e10709c42039ad0ee1392fbe4366ad64ac1',
  'js/data.js': '19ccc64091b32ce8e9d3329e865d4d49bce56724d4d4e0d738e413a7ff02e311',
  'js/personalize.js': '1125d767bac6aed317e2bdc8ba69311fda71d0a8450a264e48c536c9717bb65a',
  'js/public_editorial_content.js': 'f142d6e238b0d54f7df1d2c97285734c79f2e41bbb2d8fb7ded1cc0628034502'
};
Object.entries(protectedExpected).forEach(([rel, expected]) => {
  check(`protected byte identity: ${rel}`, sha(rel) === expected, sha(rel));
});

const changed = git(['diff', '--name-only', BASE]).split('\n').filter(Boolean);
check('Sprint05 changes restricted to audit docs and dedicated verifier', changed.every((rel) =>
  rel.startsWith('v3-prototype/docs/privacy-audit/') || rel === 'v3-prototype/verify/sprint05_privacy_external_transmission.js'), changed.join(','));
check('no dependency diff', git(['diff', '--name-only', BASE, '--', 'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) === '');
check('no runtime/visual/storage diff', git(['diff', '--name-only', BASE, '--',
  'v3-prototype/index.html', 'v3-prototype/css', 'v3-prototype/assets', 'v3-prototype/js']) === '');
check('no main/V2/Production/.ai-handoff/.github diff', git(['diff', '--name-only', BASE, '--', ':!v3-prototype']) === '');

const pass = results.filter((result) => result.pass).length;
const fail = results.length - pass;
console.log(`\nTOTAL ${results.length}  PASS ${pass}  FAIL ${fail}`);
if (fail) process.exit(1);
