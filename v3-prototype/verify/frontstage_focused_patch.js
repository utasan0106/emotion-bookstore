#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');
const { start } = require('./serve');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, '.rc-evidence', 'frontstage-focused-patch');
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const results = [];
const jsErrors = [];
const evidence = { viewports: {}, comprehension: {}, state: {}, lineups: {} };

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function stable(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function loadMatching() {
  const source = fs.readFileSync(path.join(ROOT, 'js', 'cultural_matching.js'), 'utf8');
  const window = {};
  vm.runInNewContext(source, {
    window, URL, Date, Object, Array, JSON, RegExp, Number, isNaN
  }, { filename: 'cultural_matching.js' });
  return { matching: window.V3_CULTURAL_MATCHING, source };
}

function lineupConfig(ids, overrides = {}) {
  return [Object.assign({
    status: 'READY', configVersion: 'fixture-v1', label: '編集部の仕入れ',
    startsOn: '2026-08-18', expiresOn: '2026-08-30', itemIds: ids
  }, overrides)];
}

function resolvedRecord(id) {
  return /^ID-[1-4]$/.test(id) ? { id } : null;
}

async function idbSnapshot(page) {
  return page.evaluate(async () => {
    function keyValues(storage) {
      return Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .sort().map((key) => [key, storage.getItem(key)]);
    }
    const indexedDb = await new Promise((resolve) => {
      const request = indexedDB.open('v3-prototype-db');
      request.onerror = () => resolve({ error: request.error && request.error.name });
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('state')) {
          db.close();
          resolve({ entries: [] });
          return;
        }
        const tx = db.transaction('state', 'readonly');
        const store = tx.objectStore('state');
        const keysRequest = store.getAllKeys();
        const valuesRequest = store.getAll();
        tx.oncomplete = () => {
          const entries = keysRequest.result.map((key, index) => [key, valuesRequest.result[index]])
            .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
          db.close();
          resolve({ entries });
        };
        tx.onerror = () => resolve({ error: tx.error && tx.error.name });
        tx.onabort = () => resolve({ error: tx.error && tx.error.name });
      };
    });
    return {
      indexedDb,
      localStorage: keyValues(localStorage),
      sessionStorage: keyValues(sessionStorage),
      url: location.href,
      query: location.search,
      hash: location.hash,
      historyState: history.state,
      historyLength: history.length,
      interested: await window.V3_STORE.loadInterested(),
      state: await window.V3_STORE.load()
    };
  });
}

async function instrumentWrites(page) {
  await page.evaluate(() => {
    const calls = [];
    ['save', 'saveInterested', 'removeInterested'].forEach((name) => {
      const original = window.V3_STORE[name];
      window.V3_STORE[name] = function () {
        calls.push({ name, args: JSON.parse(JSON.stringify(Array.from(arguments))) });
        return original.apply(this, arguments);
      };
    });
    window.__FRONTSTAGE_WRITE_CALLS__ = calls;
  });
}

async function entranceMetrics(page) {
  return page.evaluate(() => {
    const metric = (selector) => {
      const node = document.querySelector(selector);
      const rect = node.getBoundingClientRect();
      return {
        text: node.textContent.trim(), left: rect.left, top: rect.top,
        right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height
      };
    };
    const visibleText = Array.from(document.body.querySelectorAll('h1, p, button'))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight;
      }).map((node) => node.textContent.trim()).join(' ');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      headline: metric('#surface-title'),
      shelf: metric('.entrance-route-shelf'),
      noEmotion: metric('.entrance-route-no-emotion'),
      overflow: {
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth
      },
      visibleText
    };
  });
}

(async function run() {
  const { matching: M, source: matchingSource } = loadMatching();

  for (const count of [0, 1, 2, 3]) {
    const ids = Array.from({ length: count }, (_, index) => `ID-${index + 1}`);
    const first = M.resolveNoEmotionLineup(lineupConfig(ids), '2026-08-24', resolvedRecord);
    const second = M.resolveNoEmotionLineup(lineupConfig(ids), '2026-08-24', resolvedRecord);
    check(`resolver ${count}: finite deterministic result`,
      first.items.length === count && JSON.stringify(first) === JSON.stringify(second),
      JSON.stringify(first));
  }
  check('resolver >3 fails closed without truncation',
    M.resolveNoEmotionLineup(lineupConfig(['ID-1', 'ID-2', 'ID-3', 'ID-4']),
      '2026-08-24', resolvedRecord).items.length === 0);
  check('resolver duplicate ID fails closed',
    M.resolveNoEmotionLineup(lineupConfig(['ID-1', 'ID-1']),
      '2026-08-24', resolvedRecord).items.length === 0);
  check('resolver expired lineup fails closed',
    M.resolveNoEmotionLineup(lineupConfig(['ID-1'], {
      startsOn: '2026-07-01', expiresOn: '2026-07-31'
    }), '2026-08-24', resolvedRecord).reasons.includes('NO_EMOTION_LINEUP_EXPIRED'));
  check('resolver invalid item fails closed',
    M.resolveNoEmotionLineup(lineupConfig(['UNKNOWN']),
      '2026-08-24', resolvedRecord).reasons.includes('NO_EMOTION_ITEM_INVALID'));
  check('resolver duplicate active config fails closed',
    M.resolveNoEmotionLineup(lineupConfig(['ID-1']).concat(lineupConfig(['ID-2'], {
      configVersion: 'fixture-v2'
    })), '2026-08-24', resolvedRecord).reasons.includes('NO_EMOTION_LINEUP_DUPLICATE'));
  check('FIRST PULL approved Human Editorial copy resolves',
    M.resolveFirstPull({ firstPull: {
      status: 'READY', reviewerHuman: true, text: '具体的な入口。'
    } }) === '具体的な入口。');
  check('FIRST PULL missing or unapproved copy omits cleanly',
    M.resolveFirstPull({}) === null &&
    M.resolveFirstPull({ firstPull: { status: 'READY', reviewerHuman: false, text: '未承認' } }) === null);
  const resolverBlock = matchingSource.slice(
    matchingSource.indexOf('function resolveNoEmotionLineup'),
    matchingSource.indexOf('function sourceCounts')
  );
  check('resolver has no random/fill/storage/profile primitive',
    !/Math\.random|while\s*\([^)]*length\s*<\s*3|localStorage|sessionStorage|indexedDB|V3_STORE|affinity|profile/i.test(resolverBlock));

  fs.mkdirSync(EVIDENCE, { recursive: true });
  const { server, base } = await start(0);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });
  try {
    for (const viewport of [
      { width: 390, height: 844, name: 'entrance-390x844' },
      { width: 430, height: 932, name: 'entrance-430x932' },
      { width: 1200, height: 900, name: 'entrance-1200x900' },
      { width: 1440, height: 1000, name: 'entrance-1440x1000' }
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const external = [];
      page.on('pageerror', (error) => jsErrors.push(`${viewport.name}: ${error.message}`));
      page.on('request', (request) => {
        try {
          const host = new URL(request.url()).hostname;
          if (host !== '127.0.0.1') external.push(request.url());
        } catch (error) { /* non-network request */ }
      });
      await page.goto(base + '/');
      await page.waitForSelector('.surface[data-surface="01-entrance"]');
      await page.evaluate(() => document.fonts.ready);
      const metrics = await entranceMetrics(page);
      evidence.viewports[viewport.name] = metrics;
      check(`${viewport.name}: headline and both routes in first viewport`,
        metrics.headline.text === '感情から、本・映画・音楽・場所へ。' &&
        metrics.shelf.text === '棚から見る' && metrics.noEmotion.text === '選ばずに見る' &&
        metrics.headline.bottom <= viewport.height && metrics.shelf.bottom <= viewport.height &&
        metrics.noEmotion.bottom <= viewport.height,
        `bottoms=${metrics.headline.bottom.toFixed(1)}/${metrics.shelf.bottom.toFixed(1)}/${metrics.noEmotion.bottom.toFixed(1)}`);
      check(`${viewport.name}: touch targets and horizontal overflow 0`,
        metrics.shelf.height >= 44 && metrics.noEmotion.height >= 44 &&
        metrics.overflow.document === 0 && metrics.overflow.body === 0,
        `targets=${metrics.shelf.height.toFixed(1)}/${metrics.noEmotion.height.toFixed(1)} overflow=${JSON.stringify(metrics.overflow)}`);
      check(`${viewport.name}: first-paint third-party requests 0`, external.length === 0, external.join(', '));
      check(`${viewport.name}: no diagnostic or generic AI recommendation appearance`,
        !/治療|心理診断|性格診断|AI(?:による)?おすすめ|AI推薦/.test(metrics.visibleText));
      await page.screenshot({ path: path.join(EVIDENCE, viewport.name + '.png'), fullPage: true });

      if (viewport.width === 390) {
        const immediate = {
          headline: metrics.headline.text,
          routes: [metrics.shelf.text, metrics.noEmotion.text]
        };
        await page.waitForTimeout(3000);
        const after3s = await entranceMetrics(page);
        await page.waitForTimeout(7000);
        const after10s = await entranceMetrics(page);
        evidence.comprehension = { immediate, after3s, after10s };
        check('3s comprehension: purpose and both legitimate routes remain explicit',
          after3s.headline.text === immediate.headline &&
          after3s.shelf.text === immediate.routes[0] && after3s.noEmotion.text === immediate.routes[1]);
        check('10s comprehension: no rotating/random replacement changes the contract',
          after10s.headline.text === immediate.headline &&
          after10s.shelf.text === immediate.routes[0] && after10s.noEmotion.text === immediate.routes[1]);
      }
      await context.close();
    }

    const routeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const routePage = await routeContext.newPage();
    routePage.on('pageerror', (error) => jsErrors.push(`routes: ${error.message}`));
    await routePage.goto(base + '/');
    await routePage.waitForSelector('.entrance-route-shelf');
    await routePage.click('.entrance-route-shelf');
    await routePage.waitForSelector('.surface[data-surface="02-emotion"]');
    check('棚から見る reaches unchanged eight-lens flow',
      await routePage.locator('.emotion-card').count() === 8);
    await routePage.goto(base + '/');
    await routePage.waitForSelector('.entrance-route-no-emotion');
    await routePage.click('.entrance-route-no-emotion');
    await routePage.waitForSelector('.surface[data-surface="10-no-emotion"]');
    check('選ばずに見る reaches truthful live empty route',
      await routePage.locator('[data-lineup-state="empty"][data-lineup-count="0"]').count() >= 1 &&
      (await routePage.locator('#view').textContent()).includes('いま、案内できるものはありません'));
    await routeContext.close();

    for (const count of [0, 1, 2, 3]) {
      const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
      const page = await context.newPage();
      page.on('pageerror', (error) => jsErrors.push(`lineup-${count}: ${error.message}`));
      await page.goto(`${base}/verify/frontstage_runtime_fixture.html?count=${count}`);
      await page.waitForSelector('.entrance-route-no-emotion');
      await page.click('.entrance-route-no-emotion');
      await page.waitForSelector('.surface[data-surface="10-no-emotion"]');
      const state = await page.locator('.no-emotion-surface').getAttribute('data-lineup-state');
      const actualCount = Number(await page.locator('.no-emotion-surface').getAttribute('data-lineup-count'));
      evidence.lineups[count] = { state, count: actualCount };
      check(`runtime ${count}: exact finite presentation`,
        actualCount === count && state === (count ? 'ready' : 'empty'), `${state}/${actualCount}`);
      if (count === 1) {
        check('runtime 1: one card and no infinite navigation',
          await page.locator('.real-discovery-card').count() === 1 &&
          await page.locator('.no-emotion-navigation').count() === 0);
      }
      if (count > 1) {
        check(`runtime ${count}: Previous/Next controls are finite`,
          await page.locator('.no-emotion-previous').isDisabled() &&
          !(await page.locator('.no-emotion-next').isDisabled()));
        await page.click('.no-emotion-next');
        check(`runtime ${count}: Next advances exactly one`,
          (await page.locator('.real-discovery-counter').textContent()).trim() === `2 / ${count}`);
        await page.click('.no-emotion-previous');
        check(`runtime ${count}: Previous returns exactly one`,
          (await page.locator('.real-discovery-counter').textContent()).trim() === `1 / ${count}`);
      }
      await context.close();
    }

    for (const mode of ['too-many', 'duplicate', 'expired', 'invalid', 'duplicate-config']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', (error) => jsErrors.push(`${mode}: ${error.message}`));
      await page.goto(`${base}/verify/frontstage_runtime_fixture.html?mode=${mode}`);
      await page.waitForSelector('.entrance-route-no-emotion');
      await page.click('.entrance-route-no-emotion');
      await page.waitForSelector('.surface[data-surface="10-no-emotion"]');
      check(`runtime ${mode}: fails closed, never truncates/fills`,
        await page.locator('.no-emotion-surface[data-lineup-state="error"][data-lineup-count="0"]').count() === 1 &&
        await page.locator('.real-discovery-card').count() === 0);
      await context.close();
    }

    const pullContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pullPage = await pullContext.newPage();
    pullPage.on('pageerror', (error) => jsErrors.push(`first-pull: ${error.message}`));
    await pullPage.goto(`${base}/verify/frontstage_runtime_fixture.html?count=1&firstPull=approved`);
    await pullPage.waitForSelector('.entrance-route-no-emotion');
    await pullPage.click('.entrance-route-no-emotion');
    await pullPage.waitForSelector('.real-discovery-card');
    check('approved FIRST PULL renders before Object Identity',
      await pullPage.locator('[data-first-pull="approved"]').count() === 1 &&
      await pullPage.evaluate(() => {
        const pull = document.querySelector('[data-first-pull="approved"]');
        const title = document.querySelector('.real-discovery-card .card-title');
        return Boolean(pull.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING);
      }));
    check('source cue is separate from Editorial Why and follows it',
      await pullPage.evaluate(() => {
        const why = document.querySelector('.real-discovery-reason');
        const official = document.querySelector('.real-discovery-official');
        const cue = official && official.querySelector('.trust-cue-official');
        return Boolean(why && official && cue && !why.contains(cue) &&
          (why.compareDocumentPosition(official) & Node.DOCUMENT_POSITION_FOLLOWING));
      }));
    await pullPage.click('.real-discovery-detail');
    await pullPage.waitForSelector('.surface[data-surface="11-no-emotion-detail"]');
    check('Detail preserves Editorial Why / Official Fact separation',
      await pullPage.locator('.detail-editorial-reason').count() === 1 &&
      await pullPage.locator('.detail-practical-truth .trust-cue-official').count() === 1 &&
      await pullPage.locator('.detail-official-description').count() === 1);
    await pullContext.close();

    const missingPullContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const missingPullPage = await missingPullContext.newPage();
    await missingPullPage.goto(`${base}/verify/frontstage_runtime_fixture.html?count=1`);
    await missingPullPage.waitForSelector('.entrance-route-no-emotion');
    await missingPullPage.click('.entrance-route-no-emotion');
    await missingPullPage.waitForSelector('.real-discovery-card');
    check('missing FIRST PULL renders nothing and no placeholder',
      await missingPullPage.locator('[data-first-pull]').count() === 0 &&
      !/FIRST PULL|準備中|生成中/.test(await missingPullPage.locator('.real-discovery-copy').textContent()));
    await missingPullContext.close();

    const writeContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const writePage = await writeContext.newPage();
    writePage.on('pageerror', (error) => jsErrors.push(`no-write: ${error.message}`));
    await writePage.goto(`${base}/verify/frontstage_runtime_fixture.html?count=2`);
    await writePage.waitForSelector('.entrance-route-no-emotion');
    await instrumentWrites(writePage);
    const before = await idbSnapshot(writePage);
    await writePage.click('.entrance-route-no-emotion');
    await writePage.waitForSelector('.real-discovery-card');
    await writePage.click('.no-emotion-next');
    await writePage.click('.no-emotion-previous');
    await writePage.click('.real-discovery-detail');
    await writePage.waitForSelector('.surface[data-surface="11-no-emotion-detail"]');
    await writePage.click('.no-emotion-detail-back');
    await writePage.waitForSelector('.surface[data-surface="10-no-emotion"]');
    const after = await idbSnapshot(writePage);
    const writeCalls = await writePage.evaluate(() => window.__FRONTSTAGE_WRITE_CALLS__.slice());
    evidence.state = { before, after, writeCalls };
    check('no-emotion passive flow invokes no state/Interested write API', writeCalls.length === 0, JSON.stringify(writeCalls));
    check('no-emotion passive flow leaves IndexedDB byte-equivalent',
      JSON.stringify(before.indexedDb) === JSON.stringify(after.indexedDb));
    check('no-emotion passive flow leaves localStorage/sessionStorage unchanged',
      JSON.stringify(before.localStorage) === JSON.stringify(after.localStorage) &&
      JSON.stringify(before.sessionStorage) === JSON.stringify(after.sessionStorage));
    check('no-emotion passive flow leaves URL/query/hash and History state unchanged',
      before.url === after.url && before.query === after.query && before.hash === after.hash &&
      JSON.stringify(before.historyState) === JSON.stringify(after.historyState) &&
      before.historyLength === after.historyLength);
    check('no-emotion passive flow leaves state, Interested, preference/affinity unchanged',
      JSON.stringify(before.state) === JSON.stringify(after.state) &&
      JSON.stringify(before.interested) === JSON.stringify(after.interested) &&
      !/preference|affinity|profile/i.test(JSON.stringify(after)));
    await writeContext.close();

    check('browser JavaScript errors = 0', jsErrors.length === 0, jsErrors.join(' | '));
    fs.writeFileSync(path.join(EVIDENCE, 'frontstage-evidence.json'),
      JSON.stringify(evidence, null, 2) + '\n');
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exitCode = failed.length ? 1 : 0;
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
