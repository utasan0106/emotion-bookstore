/* =============================================================================
 * V3 Security / Accessibility Release Hardening
 * Run: node verify/security_accessibility_release_hardening.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const index = read('v3-prototype/index.html');
const privacy = read('v3-prototype/privacy.html');
const terms = read('v3-prototype/terms.html');
const css = read('v3-prototype/css/v3.css');
const app = read('v3-prototype/js/app.js');
const storeSource = read('v3-prototype/js/store.js');
const editorialSource = read('v3-prototype/js/public_editorial.js');
const editorialContent = read('v3-prototype/js/public_editorial_content.js');
const actionSource = read('v3-prototype/js/action_destination.js');
const analyticsSource = read('v3-prototype/js/analytics.js');
const runtimeJs = fs.readdirSync(path.join(SRC, 'js')).filter((name) => name.endsWith('.js'))
  .map((name) => read('v3-prototype/js/' + name)).join('\n');
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createFakeIndexedDb() {
  const data = new Map();
  let failure = null;
  const db = {
    objectStoreNames: { contains() { return true; } },
    createObjectStore() {},
    transaction(name, mode) {
      const tx = {
        oncomplete: null, onerror: null, onabort: null, aborted: false,
        abort() {
          if (tx.aborted) return;
          tx.aborted = true;
          setImmediate(() => tx.onabort && tx.onabort());
        },
        objectStore() {
          return {
            get(key) {
              const req = { onsuccess: null, onerror: null, result: undefined };
              setImmediate(() => {
                if (tx.aborted) return;
                req.result = clone(data.get(key));
                if (req.onsuccess) req.onsuccess();
                if (mode === 'readonly') setImmediate(() => tx.oncomplete && tx.oncomplete());
              });
              return req;
            },
            put(value, key) {
              setImmediate(() => {
                if (tx.aborted) return;
                const activeFailure = failure;
                failure = null;
                if (activeFailure === 'error') { if (tx.onerror) tx.onerror(); return; }
                if (activeFailure === 'abort') {
                  tx.aborted = true;
                  if (tx.onabort) tx.onabort();
                  return;
                }
                data.set(key, clone(value));
                if (tx.oncomplete) tx.oncomplete();
              });
              return {};
            },
            delete(key) {
              setImmediate(() => {
                const activeFailure = failure;
                failure = null;
                if (activeFailure === 'error') { if (tx.onerror) tx.onerror(); return; }
                if (activeFailure === 'abort') {
                  tx.aborted = true;
                  if (tx.onabort) tx.onabort();
                  return;
                }
                data.delete(key);
                if (tx.oncomplete) tx.oncomplete();
              });
            }
          };
        }
      };
      return tx;
    }
  };
  return {
    data,
    failNext(kind) { failure = kind; },
    open() {
      const req = { onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null, result: db };
      setImmediate(() => req.onsuccess && req.onsuccess());
      return req;
    }
  };
}

function loadStore(indexedDB) {
  const window = { indexedDB, Promise, Date, JSON, Object, Array, RegExp, isNaN };
  vm.runInNewContext(storeSource, { window, Promise, Date, JSON, Object, Array, RegExp, isNaN }, {
    filename: 'store.js'
  });
  return window.V3_STORE;
}

function loadEditorial() {
  const created = [];
  const window = {
    URL,
    document: {
      createElement(tag) {
        const node = {
          tagName: tag,
          attrs: {},
          setAttribute(name, value) { this.attrs[name] = String(value); }
        };
        created.push(node);
        return node;
      }
    },
    open() { return { opener: null }; }
  };
  vm.runInNewContext(actionSource, { window, URL, Object }, { filename: 'action_destination.js' });
  vm.runInNewContext(editorialSource, { window, URL, Object, Array, Date, RegExp, isNaN }, {
    filename: 'public_editorial.js'
  });
  return { E: window.V3_PUBLIC_EDITORIAL, created };
}

function extractCsp(html) {
  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i);
  return match ? match[1] : '';
}

function channel(hex) {
  return parseInt(hex, 16) / 255;
}

function luminance(hex) {
  const raw = hex.replace('#', '');
  return [raw.slice(0, 2), raw.slice(2, 4), raw.slice(4, 6)].map(channel)
    .map((value) => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4))
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

(async function run() {
  const cspIndex = extractCsp(index);
  const cspPrivacy = extractCsp(privacy);
  const cspTerms = extractCsp(terms);
  const jsonLd = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const jsonLdHash = jsonLd ? crypto.createHash('sha256').update(jsonLd[1]).digest('base64') : '';

  check('V3 index has a route-local CSP', Boolean(cspIndex));
  check('V3 Legal pages have route-local CSP', Boolean(cspPrivacy) && Boolean(cspTerms));
  check('Product CSP blocks background connect requests', cspIndex.includes("connect-src 'none'"));
  check('Legal CSP blocks every script and frame', [cspPrivacy, cspTerms].every((value) =>
    value.includes("script-src 'none'") && value.includes("frame-src 'none'") && value.includes("connect-src 'none'")));
  check('Product CSP permits only two approved click-gated frame hosts',
    /frame-src https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com(?:;|$)/.test(cspIndex));
  check('CSP contains no unsafe-inline/eval/data script permission',
    !/unsafe-inline|unsafe-eval|script-src[^;]*\bdata:/i.test(cspIndex + cspPrivacy + cspTerms));
  check('JSON-LD is covered by exact SHA-256 CSP hash',
    jsonLdHash && cspIndex.includes("'sha256-" + jsonLdHash + "'"), jsonLdHash);
  check('runtime has no inline style attribute/property',
    !/\bstyle\s*=|\bstyle\s*:/.test(index + privacy + terms + app));
  check('no HTML preconnect/prefetch/dns-prefetch',
    !/rel=["'](?:preconnect|prefetch|dns-prefetch)/i.test(index + privacy + terms));

  check('no user-controlled HTML/eval/new Function/document.write primitive',
    !/\b(?:innerHTML|outerHTML)\b|insertAdjacentHTML|\beval\s*\(|new\s+Function\b|document\.write\s*\(/.test(runtimeJs));
  check('dynamic content uses textContent/DOM construction', app.includes('node.textContent = value') && app.includes('document.createElement(tag)'));
  check('no hidden fetch/beacon/XHR/socket/event stream sender',
    !/\b(?:fetch|sendBeacon|XMLHttpRequest|WebSocket|EventSource)\b/.test(runtimeJs));
  check('no geolocation/external AI/login/cloud sync primitive',
    !/navigator\s*\.\s*geolocation|api\.openai|anthropic|generativelanguage|oauth|signIn\s*\(|cloudSync\s*\(/i.test(runtimeJs));
  check('analytics remains destinationless and fail-closed',
    analyticsSource.includes("MEASUREMENT_CONFIG_BLOCKED") &&
    analyticsSource.includes("MEASUREMENT_DESTINATION_STATUS: 'UNVERIFIED_QA_DESTINATION'") &&
    !/G-[A-Z0-9]+/.test(analyticsSource + index));
  check('active public Editorial records remain zero', /records:\s*Object\.freeze\(\[\]\)/.test(editorialContent));
  check('history state contains screen only and reuses current URL',
    app.includes("pushState({ v3Screen: next }, '', global.location.href)") &&
    !/pushState\([^\n]*(?:experienceId|selectedId|emotion|shelf|title|place)/.test(app));
  check('Action Destination enforces HTTPS/no credentials',
    actionSource.includes("parsed.protocol !== 'https:'") && actionSource.includes('parsed.username || parsed.password'));
  check('external windows use noopener/noreferrer',
    [actionSource, editorialSource].every((source) => source.includes("'_blank', 'noopener,noreferrer'")));

  const editorial = loadEditorial();
  check('approved embed host/path accepts clean YouTube privacy URL',
    editorial.E.isApprovedEmbedUrl('youtube', 'https://www.youtube-nocookie.com/embed/TEST_123') ===
      'https://www.youtube-nocookie.com/embed/TEST_123');
  check('approved embed rejects query parameters',
    editorial.E.isApprovedEmbedUrl('youtube', 'https://www.youtube-nocookie.com/embed/TEST_123?autoplay=1') === null);
  check('approved embed rejects fragments',
    editorial.E.isApprovedEmbedUrl('vimeo', 'https://player.vimeo.com/video/123#fragment') === null);
  check('approved embed rejects deceptive host and wrong path',
    editorial.E.isApprovedEmbedUrl('youtube', 'https://www.youtube-nocookie.com.evil.invalid/embed/TEST_123') === null &&
    editorial.E.isApprovedEmbedUrl('vimeo', 'https://player.vimeo.com/not-video/123') === null);
  check('iframe is created only inside explicit activateVideo',
    editorialSource.indexOf("createElement('iframe')") > editorialSource.indexOf('function activateVideo'));
  check('iframe receives title/referrer/sandbox/limited allow attributes',
    editorialSource.includes("setAttribute('title', video.video_title)") &&
    editorialSource.includes("setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')") &&
    editorialSource.includes("setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation')") &&
    editorialSource.includes("setAttribute('allow', 'fullscreen; picture-in-picture')"));

  const fake = createFakeIndexedDb();
  const store = loadStore(fake);
  const sessionState = store.emptyState();
  sessionState.emotion = 'mada';
  const saveOk = await store.save(sessionState);
  check('session durable save reports transaction completion', saveOk.ok === true && saveOk.reason === null);
  fake.failNext('error');
  const saveError = await store.save(sessionState);
  check('session transaction error never reports success', saveError.ok === false && saveError.reason === 'TRANSACTION_ERROR');
  fake.failNext('abort');
  const saveAbort = await store.save(sessionState);
  check('session transaction abort never reports success', saveAbort.ok === false && saveAbort.reason === 'TRANSACTION_ABORT');
  const unavailable = loadStore(undefined);
  const unavailableSave = await unavailable.save(sessionState);
  check('IndexedDB unavailable never reports durable success',
    unavailableSave.ok === false && unavailableSave.reason === 'INDEXEDDB_UNAVAILABLE');
  const clearOk = await store.clear();
  check('session clear reports transaction completion', clearOk.ok === true && clearOk.reason === null);
  fake.failNext('error');
  const clearError = await store.clear();
  check('session clear error never reports success', clearError.ok === false && clearError.reason === 'TRANSACTION_ERROR');
  fake.failNext('abort');
  const clearAbort = await store.clear();
  check('session clear abort never reports success', clearAbort.ok === false && clearAbort.reason === 'TRANSACTION_ABORT');
  check('Plan waits for durable save before completion screen',
    app.indexOf('persist().then(function (result)', app.indexOf("class: 'plan-form'")) <
      app.indexOf("go('plan-saved')", app.indexOf("class: 'plan-form'")));
  check('Plan failed save remains explicitly unsaved',
    app.includes('端末に予定を保存できませんでした。予定は保存済みにしていません。'));
  check('Plan remove waits for durable result and restores on failure',
    app.includes('予定を取り消せませんでした。保存済みの予定を保ちます。') &&
    app.includes('restoreState(beforeRemove)'));
  check('Plan form exposes pending state', app.includes("form.setAttribute('aria-busy', 'true')"));
  check('Trace completion waits for durable save before success/event', (() => {
    const start = app.indexOf("class: 'm05-trace-form'");
    const durable = app.indexOf('persist().then(function (result)', start);
    const event = app.indexOf("measureOnce('v3_trace_complete'", start);
    const navigation = app.indexOf("go('entrance')", event);
    return start !== -1 && durable !== -1 && durable < event && event < navigation;
  })());
  check('Trace failure remains explicitly unsaved',
    app.includes('端末に記録を保存できませんでした。記録は保存済みにしていません。'));
  check('Trace skip waits for durable state before event/navigation', (() => {
    const start = app.indexOf("class: 'btn btn-text m05-skip'");
    const durable = app.indexOf('persist().then(function (result)', start);
    const event = app.indexOf("measureOnce('v3_trace_skip'", start);
    const navigation = app.indexOf("go('entrance')", event);
    return start !== -1 && durable !== -1 && durable < event && event < navigation;
  })());
  check('Debug clear never announces success before durable clear',
    app.indexOf('if (!result || result.ok !== true)', app.indexOf('function resetPrototype')) <
      app.indexOf("announce('prototype の状態を初期化しました。')", app.indexOf('function resetPrototype')));
  check('Interested durable contract remains exact',
    store.INTERESTED_KEY === 'interested-experiences-v1' &&
    storeSource.includes("var DB_NAME = 'v3-prototype-db'") && storeSource.includes("var STORE_NAME = 'state'"));

  check('skip links and main landmark exist on all public pages',
    index.includes('<a class="skip-link" href="#view">') && index.includes('<main id="view"') &&
    [privacy, terms].every((page) => page.includes('<a class="skip-link" href="#legal-main">') && page.includes('<main id="legal-main"')));
  check('dynamic surfaces have accessible heading reference',
    app.includes("'aria-labelledby': 'surface-title'") && app.includes("id: 'surface-title'"));
  check('native semantic controls are used; dialog backdrop is the sole non-button click target', (() => {
    const tags = [];
    let cursor = 0;
    while ((cursor = app.indexOf('onclick:', cursor)) !== -1) {
      const nodeStart = app.lastIndexOf("h('", cursor);
      const tagMatch = nodeStart === -1 ? null : app.slice(nodeStart, nodeStart + 24).match(/^h\('([^']+)'/);
      tags.push(tagMatch ? tagMatch[1] : 'unknown');
      cursor += 8;
    }
    return tags.filter((tag) => tag !== 'button').length === 1 &&
      tags.indexOf('div') !== -1 &&
      app.includes("class: 'interested-layer', role: 'dialog'") &&
      app.includes('if (event.target === interestedLayer) closeInterestedLayer(true);');
  })());
  check('icon-only controls have accessible names', [
    "class: 'interested-close', type: 'button', 'aria-label': '閉じる'",
    "class: 'w03-scroll-button is-left', type: 'button', 'aria-label': '前の体験を見る'",
    "class: 'w03-scroll-button is-right', type: 'button', 'aria-label': '次の体験を見る'",
    "class: 'w03-alternate-keep', type: 'button'",
    "'aria-label': fixture.mobileTitle + 'を気になるにする'",
    "class: 'm04-review-back m04-mobile-only', type: 'button'",
    "class: 'm05-summary-remove', type: 'button'"
  ].every((needle) => app.includes(needle)));
  check('global visible focus contract exists',
    /:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--navy\);[\s\S]*?outline-offset:\s*3px;/.test(css));
  check('dialog traps focus, Escape closes, and opener focus is restored',
    app.includes("event.key === 'Escape'") && app.includes("event.key !== 'Tab'") &&
    app.includes('last.focus()') && app.includes('first.focus()') && app.includes('interestedOpener.focus()'));
  check('dialog makes all page landmarks inert including Legal footer',
    app.includes("document.querySelector('.legal-footer')") && app.includes('node.inert = value'));
  check('progress indicator exposes progressbar semantics',
    app.includes("role: 'progressbar'") && app.includes("'aria-valuenow': String(progressPercent)"));
  check('Interested entry and close targets are >=44px',
    /\.interested-entry\s*\{[\s\S]*?min-height:\s*44px;/.test(css) &&
    /\.interested-close\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/.test(css));
  check('legacy reachable Discovery controls are >=44px',
    /\.w03-link-button\s*\{[\s\S]*?min-height:\s*44px;/.test(css) &&
    /\.w03-detail-button\s*\{[\s\S]*?min-height:\s*44px;/.test(css) &&
    /\.w03-alternate-keep\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/.test(css));
  check('Legal links are discoverable 44px controls with visible focus inheritance',
    /\.legal-footer-link,[\s\S]*?\.legal-back-link\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/.test(css) &&
    css.includes(':focus-visible'));
  check('current form controls have labels/legend/status channels',
    app.includes("h('label', { for: 'plan-date', text: '日付' })") &&
    app.includes("h('label', { for: 'plan-time', text: '時刻（任意）' })") &&
    app.includes("class: 'plan-selection-summary', 'aria-live': 'polite'") &&
    app.includes("class: 'sr-only', text: '心に残っているものを最大3つまで選ぶ'"));
  check('external actions have text plus visible external indicator semantics',
    app.includes("? '地図で見る' : action.label") && app.includes("text: '↗'") && app.includes("'aria-hidden': 'true'"));
  check('reduced-motion globally disables animation/transition',
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-duration:\s*0\.001ms !important;[\s\S]*?transition-duration:\s*0\.001ms !important;/.test(css));
  check('320/390/430 responsive gutters and bounded widths exist',
    css.includes('@media (max-width: 374px)') && css.includes('@media (min-width: 430px)') &&
    css.includes('max-width: 100%') && css.includes('min-width: 0'));
  check('Legal mobile table reflows without forced 640px width',
    /@media \(max-width: 599px\)[\s\S]*?\.legal-page-main table,[\s\S]*?display:\s*block;[\s\S]*?min-width:\s*0;/.test(css));
  check('DAY base text contrast >=4.5:1', contrast('#1A2530', '#FAF5F1') >= 4.5,
    contrast('#1A2530', '#FAF5F1').toFixed(2));
  check('DAY muted text contrast >=4.5:1', contrast('#68717A', '#FAF5F1') >= 4.5,
    contrast('#68717A', '#FAF5F1').toFixed(2));
  check('DAY primary button contrast >=4.5:1', contrast('#FAF5F1', '#0F1B29') >= 4.5,
    contrast('#FAF5F1', '#0F1B29').toFixed(2));
  check('Japanese-only release has no language switch', !/class=["'](?:locale|language)|>JP<|locale-globe|locale-chevron/.test(index));
  check('no current file/photo/text input surface added',
    !/type=["']file["']|accept=["']|<textarea\b|contenteditable/i.test(index + privacy + terms + app));

  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bghp_[A-Za-z0-9]{30,}\b/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /OPENAI_API_KEY\s*=\s*[^\s$]+/
  ];
  check('no credential/secret literal in V3 runtime', !secretPatterns.some((pattern) => pattern.test(runtimeJs + index + privacy + terms)));

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
