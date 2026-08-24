/* =============================================================================
 * V3 S1A limited fix — stale History / legacy Review regression
 * Run: NODE_PATH=<workspace-node_modules> node verify/s1a_stale_review_regression.js
 *
 * Reproduces a pre-S1A session with a currently approved real deck, stale
 * keep/pass decisions, and a { v3Screen: 'review' } History entry. The second
 * scenario exposes the closure-local go() only in the served test copy so the
 * ordinary internal routing boundary is exercised without adding a Product
 * debug API.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const APP_PATH = path.resolve(__dirname, '../js/app.js');
const FIXTURE_PATH = '/verify/s1a_runtime_fixture.html?count=3&shelf=atatamaru';
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function seedPreS1AState(page, base) {
  await page.goto(base + FIXTURE_PATH);
  await page.waitForSelector('.surface[data-surface="01-entrance"]');
  const seeded = await page.evaluate(async () => {
    const qa = window.__S1A_QA__;
    const approved = window.V3_REAL_EXPERIENCE_REGISTRY.deckForEmotion(qa.shelfId);
    const next = window.V3_STORE.emptyState();
    next.emotion = qa.shelfId;
    next.deck = {
      mode: 'real-approved',
      ids: approved.ids.slice(),
      index: approved.ids.length,
      decisions: {},
      activeId: approved.ids[0],
      facets: ['pre-s1a-affinity-marker']
    };
    approved.ids.forEach((id, index) => {
      next.deck.decisions[id] = index === 0 ? 'keep' : 'pass';
    });
    next.selectedId = approved.ids[0];
    next.traceFacets = ['pre-s1a-trace-marker'];
    const stateWrite = await window.V3_STORE.save(next);
    const interestedWrite = await window.V3_STORE.saveInterested(approved.ids[0]);
    return {
      deckIds: approved.ids.slice(),
      stateWriteOk: stateWrite && stateWrite.ok === true,
      interestedWriteOk: interestedWrite && interestedWrite.ok === true
    };
  });
  await page.reload();
  await page.waitForSelector('.surface[data-surface="01-entrance"]');
  return seeded;
}

async function installMutationAudit(page) {
  return page.evaluate(async () => {
    const beforeState = await window.V3_STORE.load();
    const beforeInterested = await window.V3_STORE.loadInterested();
    const preferenceWrites = [];
    const sessionWrites = [];
    ['saveInterested', 'removeInterested'].forEach((name) => {
      const original = window.V3_STORE[name];
      window.V3_STORE[name] = function () {
        preferenceWrites.push({ name, args: Array.from(arguments) });
        return original.apply(this, arguments);
      };
    });
    const originalSave = window.V3_STORE.save;
    window.V3_STORE.save = function () {
      sessionWrites.push(JSON.parse(JSON.stringify(arguments[0])));
      return originalSave.apply(this, arguments);
    };
    const seenSurfaces = [];
    const capture = () => {
      document.querySelectorAll('#view .surface').forEach((node) => {
        seenSurfaces.push(node.getAttribute('data-surface'));
      });
    };
    capture();
    const observer = new MutationObserver(capture);
    observer.observe(document.getElementById('view'), { childList: true, subtree: true });
    window.__S1A_STALE_REVIEW_AUDIT__ = {
      beforeState, beforeInterested, preferenceWrites, sessionWrites, seenSurfaces, observer
    };
    return { beforeState, beforeInterested };
  });
}

async function snapshot(page) {
  await page.waitForTimeout(80);
  return page.evaluate(async () => {
    const audit = window.__S1A_STALE_REVIEW_AUDIT__;
    const afterState = await window.V3_STORE.load();
    const afterInterested = await window.V3_STORE.loadInterested();
    const surface = document.querySelector('#view .surface');
    const body = document.getElementById('view').textContent || '';
    const legacyDecisionControls = Array.from(document.querySelectorAll('#view .row-actions button[aria-pressed]'))
      .map((node) => node.textContent.trim());
    return {
      surface: surface && surface.getAttribute('data-surface'),
      historyScreen: history.state && history.state.v3Screen,
      differentCount: (body.match(/今回は違う/g) || []).length,
      legacyDecisionControls,
      legacyReviewCount: document.querySelectorAll('#view [data-surface="04-discovery-review"], #view [data-surface="09-personalized-discovery-review"]').length,
      seenSurfaces: audit.seenSurfaces.slice(),
      beforeState: audit.beforeState,
      afterState,
      beforeInterested: audit.beforeInterested,
      afterInterested,
      preferenceWrites: audit.preferenceWrites.slice(),
      sessionWrites: audit.sessionWrites.slice()
    };
  });
}

function sameAffinityState(before, after) {
  return JSON.stringify({
    decisions: before.deck && before.deck.decisions,
    activeId: before.deck && before.deck.activeId,
    facets: before.deck && before.deck.facets,
    selectedId: before.selectedId,
    traceFacets: before.traceFacets
  }) === JSON.stringify({
    decisions: after.deck && after.deck.decisions,
    activeId: after.deck && after.deck.activeId,
    facets: after.deck && after.deck.facets,
    selectedId: after.selectedId,
    traceFacets: after.traceFacets
  });
}

function verifySafeOutcome(prefix, result) {
  check(prefix + ': legacy Review never renders',
    result.legacyReviewCount === 0 &&
    !result.seenSurfaces.includes('04-discovery-review') &&
    !result.seenSurfaces.includes('09-personalized-discovery-review'),
    JSON.stringify(result.seenSurfaces));
  check(prefix + ': 「今回は違う」 count = 0', result.differentCount === 0, String(result.differentCount));
  check(prefix + ': legacy pass/keep decision controls = 0',
    result.legacyDecisionControls.length === 0, result.legacyDecisionControls.join(', '));
  check(prefix + ': Interested before === after',
    JSON.stringify(result.beforeInterested) === JSON.stringify(result.afterInterested));
  check(prefix + ': browsing gains no preference/affinity mutation',
    result.preferenceWrites.length === 0 && result.sessionWrites.length === 0 &&
    sameAffinityState(result.beforeState, result.afterState),
    JSON.stringify({ preferenceWrites: result.preferenceWrites, sessionWrites: result.sessionWrites.length }));
  check(prefix + ': lands on existing safe S1A finite-completion surface',
    result.surface === '04-discovery-none', String(result.surface));
}

(async function run() {
  const { server, base } = await start(0);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });
  const errors = [];
  try {
    const historyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const historyPage = await historyContext.newPage();
    historyPage.on('pageerror', (error) => errors.push('history: ' + error.message));
    const historySeed = await seedPreS1AState(historyPage, base);
    check('fixture: valid real-approved deck and durable Interested seed',
      historySeed.deckIds.length === 3 && historySeed.stateWriteOk && historySeed.interestedWriteOk,
      JSON.stringify(historySeed));
    await installMutationAudit(historyPage);
    await historyPage.evaluate(() => new Promise((resolve) => {
      addEventListener('popstate', () => resolve(), { once: true });
      history.pushState({ v3Screen: 'review' }, '', location.href);
      history.pushState({ v3Screen: 'entrance' }, '', location.href);
      history.back();
    }));
    const historyResult = await snapshot(historyPage);
    verifySafeOutcome('stale History restoration', historyResult);
    check('stale History restoration: stale entry is normalized in runtime',
      historyResult.historyScreen === 'none' && historyResult.surface === '04-discovery-none',
      JSON.stringify({ history: historyResult.historyScreen, surface: historyResult.surface }));
    await historyContext.close();

    const internalContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const internalPage = await internalContext.newPage();
    internalPage.on('pageerror', (error) => errors.push('internal: ' + error.message));
    await internalPage.route('**/js/app.js', async (route) => {
      const source = fs.readFileSync(APP_PATH, 'utf8');
      const instrumented = source.replace(/\}\)\(window\);\s*$/, '  global.__S1A_TEST_GO__ = go;\n})(window);\n');
      if (instrumented === source) throw new Error('Unable to install test-only go() bridge');
      await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: instrumented });
    });
    const internalSeed = await seedPreS1AState(internalPage, base);
    check('internal fixture: valid real-approved deck and stale decisions',
      internalSeed.deckIds.length === 3 && internalSeed.stateWriteOk && internalSeed.interestedWriteOk,
      JSON.stringify(internalSeed));
    await installMutationAudit(internalPage);
    const bridgePresent = await internalPage.evaluate(() => typeof window.__S1A_TEST_GO__ === 'function');
    check('test-only bridge exposes closure-local go()', bridgePresent);
    await internalPage.evaluate(() => window.__S1A_TEST_GO__('review'));
    const internalResult = await snapshot(internalPage);
    verifySafeOutcome('direct/internal go(review)', internalResult);
    check('direct/internal go(review): History records normalized safe screen',
      internalResult.historyScreen === 'none', String(internalResult.historyScreen));
    await internalContext.close();

    check('JS error = 0', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
