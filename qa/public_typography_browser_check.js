#!/usr/bin/env node
'use strict';

/* Authored for a separately authorized future CI run. This file does not change
 * site content or generate it. Run: node qa/public_typography_browser_check.js
 * Optional QA_ORIGIN=http://127.0.0.1:8765 uses an existing checkout server;
 * otherwise the runner serves this exact checkout on an ephemeral loopback port.
 * CHROMIUM_EXECUTABLE_PATH is optional; Playwright's installed default is valid.
 * --fixtures-only runs the real-browser positive/negative evidence fixtures.
 * --preflight-only checks current source/asset hashes without a browser/server.
 * The separate .test.cjs is offline and imports neither Playwright nor a server.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {
  FAMILY, POSTSCRIPT, FONT_FILES, isReadable, fallbackCategory, allowedSymbolCodepoints,
  splitTextRuns, firstFamily, assertStyle, assertRenderedSamples, assertLocalFontRequests
} = require('./public-typography-font-contract.cjs');
const {checkSourceIntegrity, checkoutIdentity} = require('./public-typography-source-preflight.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'artifacts/public-typography');
const AS_OF = '2026-10-24T09:00:00+09:00';
const ROUTES = [
  {route: '/works.html', card: '.wk-entry h2', body: '.wk-lead'},
  {route: '/discover/', card: '.city-card h2', body: '.intro .lead'},
  {route: '/outings/', card: '.event-card h2', body: '.intro .lead', eventList: true},
  {route: '/discover/essays/', card: '.research-card h2', body: '.intro .lead'},
  {route: '/work-book.html', card: '.wk-list li a', body: '.wk-lead', cardDescription: 'First related-book title link, not a card h2'},
  {route: '/discover/jinbocho/kaijin.html', body: '.detail-hook'},
  {route: '/discover/koenji/', card: '.work-card h2', body: '.card-hook'},
  {route: '/discover/essays/kichijoji-advertising.html', body: '.detail-hook', titlePhrases: true},
  {route: '/outings/events/kiyosumi-tada2026.html', body: '.detail-hook', eventDetail: true}
];
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon'};

function checkedOrigin(value) {
  const url = new URL(value);
  assert.equal(url.protocol, 'http:', 'Only loopback HTTP checkout previews are allowed');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Local preview only');
  assert.ok(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'QA_ORIGIN must be an origin, not a URL with credentials/path/query');
  return url.origin;
}

async function serveCheckout() {
  const server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch (_) { response.writeHead(400); response.end(); return; }
    // Deterministic local weather fallback, never proxying an external service.
    if (pathname === '/api/tokyo-weather') {
      response.writeHead(200, {'content-type': 'application/json'});
      response.end('{"forecast":null,"stations":{}}'); return;
    }
    let file = path.resolve(ROOT, '.' + pathname);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403); response.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
    const real = fs.realpathSync(file);
    if (!real.startsWith(fs.realpathSync(ROOT) + path.sep)) { response.writeHead(403); response.end(); return; }
    response.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return {server, origin: 'http://127.0.0.1:' + server.address().port};
}

async function newCase(browser, origin, options) {
  const context = await browser.newContext({viewport: {width: options.width, height: 1000}, javaScriptEnabled: options.javaScriptEnabled, reducedMotion: 'reduce', timezoneId: 'Asia/Tokyo', serviceWorkers: 'block'});
  const evidence = {externalBlocked: [], localFailures: [], pageErrors: [], fontRequests: []};
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) return route.continue();
    evidence.externalBlocked.push({url: request.url(), resourceType: request.resourceType(), navigation: request.isNavigationRequest()});
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const fontRequests = new Map();
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname.startsWith('/assets/fonts/public-gothic/')) {
      const entry = {pathname: url.pathname, url: request.url(), status: null, finished: false};
      fontRequests.set(request, entry); evidence.fontRequests.push(entry);
    }
  });
  page.on('response', response => {
    const entry = fontRequests.get(response.request());
    if (entry) entry.status = response.status();
    if (new URL(response.url()).origin === origin && response.status() >= 400) evidence.localFailures.push({url: response.url(), status: response.status()});
  });
  page.on('requestfinished', request => { const entry = fontRequests.get(request); if (entry) entry.finished = true; });
  page.on('requestfailed', request => { const entry = fontRequests.get(request); if (entry) entry.failed = request.failure(); });
  page.on('pageerror', error => evidence.pageErrors.push(error.message));
  if (options.javaScriptEnabled) await page.clock.setFixedTime(new Date(AS_OF));
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  return {context, page, cdp, evidence};
}

async function settleFonts(page) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}

async function loadVisibleImages(page) {
  const images = [];
  // isVisible deliberately includes below-fold images. Scroll each real image
  // into view before decoding: a full-page screenshot alone is not a lazy-load test.
  for (const image of await page.locator('img').all()) {
    if (!await image.isVisible()) continue;
    await image.scrollIntoViewIfNeeded();
    const entry = await image.evaluate(async element => {
      let decodeError = null;
      try { await element.decode(); } catch (error) { decodeError = error.message; }
      const rect = element.getBoundingClientRect();
      return {src: element.getAttribute('src'), currentSrc: element.currentSrc, alt: element.alt, complete: element.complete, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight, width: rect.width, height: rect.height, decodeError};
    });
    images.push(entry);
    assert.ok(entry.complete && entry.naturalWidth > 0 && entry.naturalHeight > 0 && !entry.decodeError, 'Actual visible image must decode: ' + entry.src);
  }
  assert.ok(images.length > 0, 'Visible-image checks may not pass vacuously');
  await page.evaluate(() => window.scrollTo(0, 0));
  return images;
}

async function collectLayout(page, config, options, unsupportedCodepoints) {
  const result = await page.evaluate(({unsupportedCodepoints}) => {
    const shown = element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return element.getClientRects().length > 0 && rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) !== 0 && !element.closest('.sr-only,.visually-hidden');
    };
    const styleOf = element => { const style = getComputedStyle(element); return {family: style.fontFamily, weight: style.fontWeight, fontSynthesis: style.fontSynthesis, fontSize: style.fontSize}; };
    const critical = [...document.querySelectorAll('h1,h1 *,h2,h2 *,h3,h3 *,main p,main p *,nav a,nav a *,button,button *,summary,label,input,select,textarea,.event-date span,.event-date small')].filter(shown).map(element => ({tag: element.tagName, className: element.className, text: element.textContent.trim().slice(0, 180), ...styleOf(element)}));
    const titles = [...document.querySelectorAll('main h1,.event-card h2,.dr-title-phrase,.hd-title-phrase')].filter(shown).map(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      const rect = element.getBoundingClientRect(), rects = [...range.getClientRects()].filter(item => item.width > 0 && item.height > 0).map(item => ({left: item.left, right: item.right, top: item.top, bottom: item.bottom}));
      return {text: element.textContent, phrase: element.matches('.dr-title-phrase,.hd-title-phrase'), bounds: {left: rect.left, right: rect.right}, rects, lines: new Set(rects.map(item => Math.round(item.top))).size};
    });
    const unsupported = new Set(unsupportedCodepoints), occurrences = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, element = node.parentElement;
      if (!element || element.closest('script,style,template') || !shown(element)) continue;
      for (const character of node.textContent) if (unsupported.has(character.codePointAt(0))) occurrences.push({character, codepoint: character.codePointAt(0), text: node.textContent.trim().slice(0, 160), tag: element.tagName});
    }
    return {viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, bodyStyle: styleOf(document.body), critical, titles, unsupportedOccurrences: occurrences};
  }, {unsupportedCodepoints});
  assert.ok(result.documentWidth <= options.width + 1 && result.bodyWidth <= options.width + 1, config.route + ': no horizontal page overflow at ' + options.fontPercent + '%');
  assertStyle(result.bodyStyle, 400, 'body');
  assert.ok(result.critical.length > 0, 'Critical computed-style audit is nonempty');
  for (const row of result.critical) {
    assert.equal(firstFamily(row.family), FAMILY, 'Critical primary family: ' + row.text);
    assert.ok([400, 700].includes(Number(row.weight)), 'No surviving 500/600/other weights in critical roles: ' + JSON.stringify(row));
    assert.equal(row.fontSynthesis, 'none', 'No synthesis in critical role: ' + row.text);
  }
  assert.ok(result.titles.length > 0, 'Actual title layout evidence is required');
  for (const title of result.titles) {
    assert.ok(title.text.trim() && title.rects.length > 0, 'Full title text and painted line bounds are required');
    for (const rect of title.rects) {
      assert.ok(rect.left >= -1 && rect.right <= options.width + 1, 'No clipped/out-of-viewport title phrase: ' + title.text);
      assert.ok(rect.left >= title.bounds.left - 1 && rect.right <= title.bounds.right + 1, 'Title text remains within its own layout bounds: ' + title.text);
    }
    if (title.phrase && options.fontPercent === 100) assert.equal(title.lines, 1, 'Semantic title phrase stays together at normal size: ' + title.text);
  }
  if (config.titlePhrases) assert.ok(result.titles.filter(title => title.phrase).length >= 2, 'Original semantic title phrases remain present');
  result.unsupportedReadable = result.unsupportedOccurrences.filter(row => isReadable(row.character));
  result.allowedSymbolOccurrences = result.unsupportedOccurrences.filter(row => !isReadable(row.character)).map(row => ({...row, category: fallbackCategory(row.character)}));
  assert.equal(result.unsupportedReadable.length, 0, 'Visible unsupported Japanese/alphanumeric text is NOT a symbol exception: ' + JSON.stringify(result.unsupportedReadable));
  return result;
}

async function eventLayout(page, config, javaScriptEnabled) {
  if (!config.eventList && !config.eventDetail) return {applicable: false};
  if (config.eventList && !javaScriptEnabled) {
    assert.ok(await page.locator('noscript li a').count() > 0, 'No-JS event list keeps its real dated fallback links');
    return {applicable: false, reason: 'No-JS uses the unchanged dated noscript link list; script-filtered cards remain hidden.'};
  }
  if (config.eventDetail) {
    const status = page.locator('[data-event-status]');
    assert.ok(await status.isVisible());
    assert.ok(!/終了/.test(await status.innerText()), 'Frozen date must not turn the representative event into an expired event');
    return {applicable: true, detailStatus: await status.innerText()};
  }
  const cards = [];
  for (const card of await page.locator('[data-event-card]:visible').all()) {
    const title = await card.locator('h2').boundingBox(), date = await card.locator('.event-date').boundingBox(), image = await card.locator('figure').boundingBox();
    const fontSize = await card.locator('h2').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    assert.ok(fontSize >= 24, 'Event title minimum remains 24px, including at narrow widths');
    assert.ok(title && date && image && title.y + title.height <= image.y + 1 && date.y + date.height <= image.y + 1, 'Complete title and date remain above the contextual image');
    cards.push({id: await card.getAttribute('data-event-card'), title: await card.locator('h2').innerText(), date: await card.locator('.event-date').innerText(), fontSize, titleBounds: title, dateBounds: date, imageBounds: image});
  }
  assert.ok(cards.length > 0, 'Frozen-date event layout checks may not pass with zero cards');
  return {applicable: true, cards};
}

async function firstVisible(page, selector) {
  for (const locator of await page.locator(selector).all()) if (await locator.isVisible()) return locator;
  throw new Error('No visible sample for required selector: ' + selector);
}

async function sampleRole(page, cdp, role, selector, allowedCodepoints, serial) {
  const locator = await firstVisible(page, selector);
  await locator.scrollIntoViewIfNeeded();
  const source = await locator.evaluate(element => {
    const styleOf = node => { const style = getComputedStyle(node); return {family: style.fontFamily, weight: style.fontWeight, fontSynthesis: style.fontSynthesis}; };
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), nodes = [];
    let index = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      const range = document.createRange(); range.selectNodeContents(node);
      const visible = parent && getComputedStyle(parent).visibility === 'visible' && !parent.closest('.sr-only,.visually-hidden') && [...range.getClientRects()].some(rect => rect.width > 0 && rect.height > 0);
      if (visible && node.textContent.length) nodes.push({index, text: node.textContent});
      index++;
    }
    return {textBefore: element.textContent, style: styleOf(element), nodes};
  });
  const plans = source.nodes.map(node => ({...node, runs: splitTextRuns(node.text, allowedCodepoints)}));
  const token = 'public-type-' + serial;
  const probes = await locator.evaluate((element, {plans, token}) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const descriptors = [];
    for (const plan of plans) {
      const original = nodes[plan.index], inherited = getComputedStyle(original.parentElement), fragment = document.createDocumentFragment();
      assertText(original.textContent === plan.text);
      for (let index = 0; index < plan.runs.length; index++) {
        const run = plan.runs[index];
        if (run.kind === 'space') { fragment.appendChild(document.createTextNode(run.text)); descriptors.push({...run}); continue; }
        const probe = document.createElement('span'), id = token + '-' + plan.index + '-' + index;
        probe.setAttribute('data-public-type-probe', id); probe.textContent = run.text;
        // Copy the existing computed text styles, never the expected QA font.
        // This prevents a selector such as h1 span from changing the sample.
        for (const property of ['font-family','font-weight','font-style','font-size','font-stretch','font-synthesis','font-feature-settings','font-variation-settings','font-variant','font-kerning','line-height','letter-spacing','word-spacing','text-transform','text-decoration','text-rendering','color','white-space','word-break','overflow-wrap']) probe.style.setProperty(property, inherited.getPropertyValue(property), 'important');
        for (const [property, value] of Object.entries({display:'inline',position:'static',float:'none',margin:'0',padding:'0',border:'0',opacity:'1',visibility:'visible',transform:'none'})) probe.style.setProperty(property, value, 'important');
        fragment.appendChild(probe); descriptors.push({...run, id});
      }
      original.replaceWith(fragment);
    }
    return descriptors;
    function assertText(ok) { if (!ok) throw new Error('Sample text changed before probing'); }
  }, {plans, token});
  const sample = {role, selector, style: source.style, textBefore: source.textBefore, sourceText: plans.map(plan => plan.text).join(''), runs: []};
  try {
    for (const probe of probes) {
      if (probe.kind === 'space') { sample.runs.push(probe); continue; }
      const query = '[data-public-type-probe="' + probe.id + '"]', span = page.locator(query);
      await span.scrollIntoViewIfNeeded(); await settleFonts(page);
      const actual = await span.evaluate(element => {
        const style = getComputedStyle(element), rect = element.getBoundingClientRect();
        return {visible: rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight && style.visibility === 'visible', family: style.fontFamily, weight: style.fontWeight, fontSynthesis: style.fontSynthesis};
      });
      const {root} = await cdp.send('DOM.getDocument', {depth: 0});
      const {nodeId} = await cdp.send('DOM.querySelector', {nodeId: root.nodeId, selector: query});
      assert.ok(nodeId, 'CDP found the actual in-situ text span');
      const {fonts} = await cdp.send('CSS.getPlatformFontsForNode', {nodeId});
      sample.runs.push({...probe, ...actual, fonts});
    }
  } finally {
    sample.textAfter = await locator.evaluate((element, token) => {
      for (const span of element.querySelectorAll('[data-public-type-probe]')) if (span.getAttribute('data-public-type-probe').startsWith(token + '-')) span.replaceWith(document.createTextNode(span.textContent));
      return element.textContent;
    }, token);
  }
  assert.equal(sample.textAfter, sample.textBefore, 'In-situ segmentation preserves complete text, including fallback symbols');
  return sample;
}

function roleDefinitions(config, javaScriptEnabled) {
  const definitions = [{role: 'h1', selector: 'main h1'}, {role: 'body', selector: config.body}, {role: 'nav', selector: '.site-sections a'}];
  if (config.card && !(config.eventList && !javaScriptEnabled)) definitions.push({role: 'cardHeading', selector: config.card});
  if (config.eventList && javaScriptEnabled) definitions.push({role: 'eventDate', selector: '.event-card .event-date > span'});
  if (config.eventList && !javaScriptEnabled) definitions.push({role: 'noscriptEvent', selector: 'noscript li'});
  if (config.eventDetail) definitions.push({role: 'detailDate', selector: '[data-event-status]'});
  return definitions;
}

async function keyboardNavigation(page, origin, javaScriptEnabled) {
  const start = page.url();
  const target = await page.locator('.site-sections a').evaluateAll((anchors, start) => {
    const current = new URL(start);
    const anchor = anchors.find(element => { const url = new URL(element.href); return url.origin === current.origin && url.pathname !== current.pathname && element.getClientRects().length; });
    return anchor && {href: anchor.href, text: anchor.textContent};
  }, start);
  assert.ok(target && new URL(target.href).origin === origin, 'A visible local header navigation destination exists');
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  let reached = false;
  for (let index = 0; index < 80; index++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(href => document.activeElement.matches('.site-sections a') && document.activeElement.href === href, target.href);
    if (reached) break;
  }
  assert.ok(reached, 'Actual Tab traversal reaches a local header navigation anchor');
  const focus = await page.evaluate(() => {
    const element = document.activeElement, style = getComputedStyle(element);
    return {focusVisible: element.matches(':focus-visible'), outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), outlineColor: style.outlineColor, text: element.textContent};
  });
  assert.ok(focus.focusVisible && focus.outlineStyle !== 'none' && focus.outlineWidth >= 1 && !['transparent','rgba(0, 0, 0, 0)'].includes(focus.outlineColor), 'Keyboard focus has a real visible outline');
  await Promise.all([page.waitForURL(target.href, {waitUntil: 'load'}), page.keyboard.press('Enter')]);
  assert.equal(page.url(), target.href, 'Enter follows the local navigation link');
  await page.goBack({waitUntil: 'networkidle'});
  assert.equal(page.url(), start, 'Back returns to the original route');
  const menu = {applicable: false};
  if (javaScriptEnabled && await page.locator('#siteMenuButton').count()) {
    const trigger = page.locator('#siteMenuButton');
    await trigger.focus(); await page.keyboard.press('Enter');
    await page.locator('#siteMenu[open]').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#siteMenu[open]').waitFor({state: 'hidden'});
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.ok(await trigger.evaluate(element => element === document.activeElement), 'Escape returns focus to the menu trigger');
    await page.keyboard.press('Enter'); await page.locator('#siteMenu[open]').waitFor();
    await page.locator('#siteMenuClose').focus(); await page.keyboard.press('Enter');
    await page.locator('#siteMenu[open]').waitFor({state: 'hidden'});
    menu.applicable = true; menu.keyboardOpenClose = true; menu.escapeRestoresFocus = true;
  }
  return {from: start, to: target.href, focus, enter: true, back: true, menu};
}

async function runRouteCase(browser, origin, coverage, allowedCodepoints, config, options) {
  const name = config.route.replace(/^\//, '').replace(/\/$/, '/index').replace(/[^a-z0-9_-]/gi, '-') + '-' + options.width + '-' + options.fontPercent + (options.javaScriptEnabled ? '-js' : '-no-js');
  const row = {name, ...options, route: config.route, asOf: AS_OF, passed: false, screenshot: name + '.png', samples: []};
  const state = await newCase(browser, origin, options), {context, page, cdp, evidence} = state;
  row.network = evidence;
  try {
    const response = await page.goto(origin + config.route, {waitUntil: 'networkidle'});
    assert.ok(response && response.ok(), 'Local route responds successfully');
    await page.evaluate(percent => { document.documentElement.style.fontSize = percent + '%'; }, options.fontPercent);
    await settleFonts(page);
    assert.ok(await page.locator('body.public-gothic').count(), 'Route is opted into the isolated public bridge');
    row.images = await loadVisibleImages(page);
    await settleFonts(page); await page.waitForLoadState('networkidle');
    // Take the unmodified page before inserting temporary font-measurement spans.
    await page.screenshot({path: path.join(OUT, row.screenshot), fullPage: true});
    row.layout = await collectLayout(page, config, options, coverage.upstream_unsupported_codepoints);
    row.events = await eventLayout(page, config, options.javaScriptEnabled);
    const definitions = roleDefinitions(config, options.javaScriptEnabled);
    row.coverage = {policy: 'First visible element per listed role; complete readable text runs inside that element, not every glyph on every page.', roles: definitions, cardDescription: config.cardDescription || null, absentCardReason: !config.card ? 'This detail page has no card-heading role in the requested sample set.' : config.eventList && !options.javaScriptEnabled ? 'No-JS uses the real dated fallback list instead of script-filtered cards.' : null};
    for (let index = 0; index < definitions.length; index++) {
      const definition = definitions[index];
      row.samples.push(await sampleRole(page, cdp, definition.role, definition.selector, allowedCodepoints, index));
    }
    row.renderedEvidence = assertRenderedSamples(row.samples, {requiredRoles: definitions.map(item => item.role), allowedCodepoints});
    assertLocalFontRequests(evidence.fontRequests);
    row.keyboard = await keyboardNavigation(page, origin, options.javaScriptEnabled);
    assert.deepEqual(evidence.pageErrors, [], 'No page JavaScript errors');
    assert.deepEqual(evidence.localFailures, [], 'No failed local page resources');
    row.passed = true;
  } catch (error) {
    row.error = {message: error.message, stack: error.stack};
    if (!fs.existsSync(path.join(OUT, row.screenshot))) {
      try { await page.screenshot({path: path.join(OUT, row.screenshot), fullPage: true}); }
      catch (captureError) { row.screenshotError = captureError.message; }
    }
  } finally { await context.close(); }
  return row;
}

function fixtureHtml(kind) {
  const range = kind === 'fallback-font' ? 'unicode-range:U+0000-007F;' : '';
  const bold = kind === 'missing-font' ? '/assets/fonts/public-gothic/qa-deliberately-missing-700.woff2' : FONT_FILES[700];
  const title = kind === 'all-nonreadable' ? '↗ ▶' : '街の作品 ABC 2026 ↗';
  return '<!doctype html><html lang="ja"><meta charset="utf-8"><style>' +
    '@font-face{font-family:"' + FAMILY + '";src:url("' + FONT_FILES[400] + '");font-weight:400}' +
    '@font-face{font-family:"' + FAMILY + '";src:url("' + bold + '");font-weight:700;' + range + '}' +
    'body{font:400 24px/1.8 "' + FAMILY + '",sans-serif;font-synthesis:none}h1,nav a{font-weight:700}p{font-weight:400}' +
    (kind === 'wrong-weight' ? 'h1{font-weight:500}' : '') +
    '</style><body><main><h1>' + title + '</h1><p>本と街を読む。QA 2026</p></main><nav class="site-sections"><a href="/works.html">作品を探す</a></nav></body></html>';
}

async function runBrowserFixtures(browser, origin, allowedCodepoints) {
  const rows = [];
  for (const kind of ['positive', 'fallback-font', 'wrong-weight', 'missing-font', 'all-nonreadable']) {
    const {context, page, cdp, evidence} = await newCase(browser, origin, {width: 390, javaScriptEnabled: true});
    const row = {kind, expected: kind === 'positive' ? 'accept' : 'reject', passed: false, samples: [], network: evidence};
    try {
      // Local synthetic HTML only. No app content or font binary is edited.
      const url = origin + '/__public_typography_qa_fixture__/' + kind;
      await context.route(url, route => route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: fixtureHtml(kind)}));
      await page.goto(url, {waitUntil: 'networkidle'}); await settleFonts(page);
      row.screenshot = 'fixture-' + kind + '.png';
      await page.screenshot({path: path.join(OUT, row.screenshot), fullPage: true});
      for (const [index, [role, selector]] of [['h1','h1'], ['body','p'], ['nav','nav a']].entries()) row.samples.push(await sampleRole(page, cdp, role, selector, allowedCodepoints, index));
      try {
        assertRenderedSamples(row.samples, {requiredRoles: ['h1','body','nav'], allowedCodepoints});
        assertLocalFontRequests(evidence.fontRequests);
        row.verdict = 'accept';
      } catch (error) { row.verdict = 'reject'; row.rejection = error.message; }
      assert.equal(row.verdict, row.expected, 'Real-browser evidence gate fixture: ' + kind);
      if (kind === 'fallback-font') {
        const h1 = row.samples.find(sample => sample.role === 'h1');
        assert.equal(firstFamily(h1.style.family), FAMILY, 'Fallback fixture still advertises the correct CSS family');
        assert.ok(h1.runs.some(run => run.kind === 'readable' && run.fonts.some(font => !font.isCustomFont || font.postScriptName !== POSTSCRIPT[700])), 'Fallback fixture actually paints readable glyphs with the wrong platform font');
        assert.match(row.rejection, /actual glyphs must use/, 'CDP glyph identity, not CSS family alone, rejects the fixture');
      }
      if (kind === 'missing-font') assert.ok(evidence.fontRequests.some(request => /qa-deliberately-missing/.test(request.pathname) && request.status === 404), 'The missing-font fixture must really fetch a missing local font');
      if (kind === 'all-nonreadable') assert.match(row.rejection, /symbol-only|empty sample/, 'Symbol-only fixture is rejected as vacuous');
      row.passed = true;
    } catch (error) { row.error = {message: error.message, stack: error.stack}; }
    finally { await context.close(); }
    rows.push(row);
  }
  return rows;
}

async function main() {
  if (process.argv.includes('--help')) { console.log('Future authorized CI: node qa/public_typography_browser_check.js [--fixtures-only | --preflight-only]\n62 route cases (9 routes × 3 widths × 2 font sizes, plus 4 no-JS entrances × 2 sizes at 390px), 5 actual-browser evidence fixtures. All external requests blocked.'); return; }
  const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/fonts/public-gothic/coverage.json'), 'utf8'));
  const allowedCodepoints = allowedSymbolCodepoints(coverage);
  const report = {
    schemaVersion: 1, asOf: AS_OF, family: FAMILY, postscriptNames: POSTSCRIPT,
    scope: 'Nine representative public routes, not a rendered claim for all 127 bridge routes. Static/font-corpus coverage is a separate gate.',
    enlargement: 'Root font size 100% / 200%; not an OS text-size or browser zoom simulation.',
    screenshots: 'Captured before in-situ probe spans; original text is preserved and restored.',
    fallbackPolicy: {allowedPunctuationAndSymbols: allowedCodepoints.map(codepoint => ({codepoint, character: String.fromCodePoint(codepoint), category: fallbackCategory(String.fromCodePoint(codepoint))})), neverAllowedAsSymbols: coverage.upstream_unsupported.filter(item => isReadable(item.character)), explanation: 'Only exact upstream-unsupported punctuation/symbols are exempt from exact-font matching. The existing title characters ― and ～ are punctuation, not UI icons. Visible unsupported letters/Japanese fail; supported punctuation and readable runs require the pinned custom PostScript font. All occurrences and actual sampled fonts remain in evidence.'},
    existingExpiryGate: 'qa/outings_browser_check.js remains separate and unchanged by this runner; this typography matrix freezes October 24 JST and does not replace expiry tests.',
    sourceSha: process.env.QA_SOURCE_SHA || null, commit: null, renderedChecksExecuted: false,
    fixtures: [], cases: [], passed: false
  };
  fs.mkdirSync(OUT, {recursive: true});
  let server, browser;
  try {
    try { report.checkoutIdentity = checkoutIdentity(ROOT, report.sourceSha); }
    catch (error) { report.checkoutIdentity = error.checkoutIdentity; throw error; }
    finally { report.commit = report.checkoutIdentity && report.checkoutIdentity.actualHead || null; }
    try { report.sourcePreflight = checkSourceIntegrity(ROOT); }
    catch (error) { report.sourcePreflight = error.integrityReport; throw error; }
    finally { fs.writeFileSync(path.join(OUT, 'source-preflight.json'), JSON.stringify(report.sourcePreflight, null, 2) + '\n'); }
    if (process.argv.includes('--preflight-only')) {
      report.mode = 'source-preflight-only'; report.renderedChecksExecuted = false;
      report.passed = report.sourcePreflight.passed;
      console.log('PASS ' + report.sourcePreflight.checks.length + ' source/asset hash checks; no browser or server executed.');
      return;
    }
    let origin;
    if (process.env.QA_ORIGIN) origin = checkedOrigin(process.env.QA_ORIGIN);
    else ({server, origin} = await serveCheckout());
    report.origin = origin;
    // Import/launch only in an explicit runner invocation, never offline fixtures.
    const {chromium} = require('playwright');
    browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.CHROMIUM_EXECUTABLE_PATH} : {});
    report.renderedChecksExecuted = true;
    report.fixtures = await runBrowserFixtures(browser, origin, allowedCodepoints);
    if (!process.argv.includes('--fixtures-only')) {
      for (const width of [320,390,1440]) for (const fontPercent of [100,200]) for (const config of ROUTES) {
        report.cases.push(await runRouteCase(browser, origin, coverage, allowedCodepoints, config, {width, fontPercent, javaScriptEnabled: true}));
        fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
      }
      for (const fontPercent of [100,200]) for (const config of ROUTES.slice(0,4)) report.cases.push(await runRouteCase(browser, origin, coverage, allowedCodepoints, config, {width:390, fontPercent, javaScriptEnabled:false}));
      assert.equal(report.cases.length, 62, 'Every requested case is recorded');
    }
    report.passed = report.fixtures.length === 5 && report.fixtures.every(row => row.passed) && report.cases.every(row => row.passed);
    assert.ok(report.passed, 'Public typography browser QA failed; inspect artifacts/public-typography/report.json');
    console.log('PASS ' + report.cases.length + ' rendered route cases and ' + report.fixtures.length + ' real-browser evidence fixtures');
  } catch (error) { report.error = {message: error.message, stack: error.stack}; throw error; }
  finally {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = {ROUTES, checkedOrigin, fixtureHtml, roleDefinitions};
