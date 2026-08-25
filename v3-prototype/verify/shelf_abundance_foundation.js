/* =============================================================================
 * V3 Shelf Abundance Foundation — cover / collection separation
 * Run: NODE_PATH=<workspace-node_modules> node verify/shelf_abundance_foundation.js
 *
 * Layer 1 (pure): the real validateShelfPlan / collectionForEmotion contracts.
 * Layer 2 (runtime): the full-shelf surface behind the completion screen, using
 * the isolated fixture. Approved Production inventory is never expanded here.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FIXTURE = '/verify/shelf_abundance_fixture.html';
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/* ------------------------------------------------------------------ layer 1 */

function loadSandbox() {
  const sandbox = {};
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

function auditRow(shelfId, index, role) {
  return {
    shelfId,
    contentId: `${shelfId}_${role}_${index}`,
    canonicalObjectId: `https://example.org/${shelfId}/${role}/${index}`,
    normalizedType: 'Exhibition',
    sourceFamily: 'example.org',
    sourceUrl: `https://example.org/${shelfId}/${role}/${index}`,
    sourceTraceable: true,
    officialVerified: true,
    editorialWhy: 'この棚に置いた理由の検証用テキスト。',
    actionStatus: 'ready',
    freshnessStatus: 'ready',
    mediaStatus: 'real_ready',
    language: 'ja',
    eligible: true,
    role
  };
}

function auditPlan(coverCount, depthCount) {
  const rows = [];
  for (let index = 0; index < coverCount; index += 1) rows.push(auditRow('qa', index, 'base'));
  for (let index = 0; index < depthCount; index += 1) rows.push(auditRow('qa', index, 'collection'));
  return { shelfIds: ['qa'], relations: rows, videos: [] };
}

function runAuditContracts(MATCHING) {
  const overCover = MATCHING.auditReleaseReadiness(auditPlan(4, 0));
  check('audit: cover >3 stays blocking',
    overCover.blocking.includes('RUNTIME_DECK_OVER_3:qa'), overCover.blocking.join(','));

  const depth = MATCHING.auditReleaseReadiness(auditPlan(3, 7));
  check('audit: cover 3 + depth 7 is a valid 10-object collection',
    !depth.blocking.some((reason) => reason.startsWith('RUNTIME_')) &&
    depth.shelves[0].collectionCount === 10 && depth.shelves[0].collectionAvailable === true &&
    depth.shelves[0].visibleEligibleCount === 3,
    JSON.stringify(depth.shelves[0].collectionCount));

  const thin = MATCHING.auditReleaseReadiness(auditPlan(3, 2));
  check('audit: collection <6 is unavailable, never blocking',
    thin.blocking.length === 0 && thin.shelves[0].collectionAvailable === false &&
    thin.shelves[0].collectionCount === 5,
    JSON.stringify({ blocking: thin.blocking, count: thin.shelves[0].collectionCount }));

  const full = MATCHING.auditReleaseReadiness(auditPlan(3, 12));
  check('audit: collection 15 remains valid',
    full.blocking.length === 0 && full.shelves[0].collectionAvailable === true &&
    full.shelves[0].collectionCount === 15, String(full.shelves[0].collectionCount));

  const over = MATCHING.auditReleaseReadiness(auditPlan(3, 13));
  check('audit: collection >15 blocks',
    over.blocking.includes('RUNTIME_COLLECTION_OVER_15:qa'), over.blocking.join(','));

  const duplicated = auditPlan(3, 3);
  duplicated.relations.push(auditRow('qa', 0, 'collection'));
  const duplicateAudit = MATCHING.auditReleaseReadiness(duplicated);
  check('audit: duplicate depth ID blocks',
    duplicateAudit.blocking.some((reason) => reason.startsWith('DUPLICATE_ID:')),
    duplicateAudit.blocking.join(','));

  const staleDepth = auditPlan(3, 3);
  staleDepth.relations[staleDepth.relations.length - 1].freshnessStatus = 'stale';
  const staleAudit = MATCHING.auditReleaseReadiness(staleDepth);
  check('audit: stale depth row is excluded from the collection count',
    staleAudit.shelves[0].collectionCount === 5, String(staleAudit.shelves[0].collectionCount));
}

function ids(count, prefix = 'ID_') {
  return Array.from({ length: count }, (_, index) => prefix + (index + 1));
}

function runPlanContracts(REAL) {
  check('cover/collection thresholds are 3 / 15 / 6',
    REAL.COVER_MAX === 3 && REAL.COLLECTION_MAX === 15 && REAL.COLLECTION_MIN_AVAILABLE === 6,
    JSON.stringify([REAL.COVER_MAX, REAL.COLLECTION_MAX, REAL.COLLECTION_MIN_AVAILABLE]));

  [0, 1, 3].forEach((size) => {
    const plan = REAL.validateShelfPlan({ coverIds: ids(size), collectionIds: ids(Math.max(size, 6)) });
    check(`cover ${size} is structurally valid`, plan.pass === true, plan.reasons.join(','));
  });
  const cover4 = REAL.validateShelfPlan({ coverIds: ids(4), collectionIds: ids(8) });
  check('cover 4 is invalid (COVER_OVER_3)',
    cover4.pass === false && cover4.reasons.includes('COVER_OVER_3'), cover4.reasons.join(','));

  [5, 6, 8, 10, 15].forEach((size) => {
    const plan = REAL.validateShelfPlan({ coverIds: ids(Math.min(3, size)), collectionIds: ids(size) });
    check(`collection ${size} is structurally valid`, plan.pass === true, plan.reasons.join(','));
  });
  const over = REAL.validateShelfPlan({ coverIds: ids(3), collectionIds: ids(16) });
  check('collection 16 is invalid (COLLECTION_OVER_15)',
    over.pass === false && over.reasons.includes('COLLECTION_OVER_15'), over.reasons.join(','));

  const dup = REAL.validateShelfPlan({
    coverIds: ['ID_1'], collectionIds: ['ID_1', 'ID_2', 'ID_2', 'ID_3', 'ID_4', 'ID_5']
  });
  check('duplicate collection IDs fail closed',
    dup.pass === false && dup.reasons.some((reason) => reason.startsWith('COLLECTION_DUPLICATE_ID')),
    dup.reasons.join(','));

  const orphan = REAL.validateShelfPlan({ coverIds: ['ID_9'], collectionIds: ids(6) });
  check('cover ID absent from collection fails closed',
    orphan.pass === false && orphan.reasons.includes('COVER_NOT_IN_COLLECTION:ID_9'),
    orphan.reasons.join(','));

  const shaped = REAL.validateShelfPlan({ coverIds: 'ID_1', collectionIds: ids(6) });
  check('malformed plan shape fails closed',
    shaped.pass === false && shaped.reasons.includes('SHELF_PLAN_SHAPE_INVALID'),
    shaped.reasons.join(','));

  const ordered = ['ID_4', 'ID_1', 'ID_9', 'ID_2', 'ID_7', 'ID_3'];
  const orderPlan = REAL.validateShelfPlan({ coverIds: ['ID_4', 'ID_1'], collectionIds: ordered });
  check('validator never reorders the authored plan',
    orderPlan.pass === true && ordered.join(',') === ['ID_4', 'ID_1', 'ID_9', 'ID_2', 'ID_7', 'ID_3'].join(','),
    ordered.join(','));
}

function runRegistryContracts(REAL) {
  const shelf = REAL.collectionForEmotion('miwohiku');
  check('current approved shelf resolves as ok and finite',
    shelf && shelf.state === 'ok' && shelf.ids.length <= REAL.COLLECTION_MAX,
    JSON.stringify(shelf && { state: shelf.state, count: shelf.count }));
  check('current approved depth (<6) is unavailable, not an error',
    shelf && shelf.available === false && shelf.reasons.length === 0,
    JSON.stringify(shelf && { available: shelf.available, reasons: shelf.reasons }));
  check('cover is a subset of the current collection',
    shelf && shelf.coverIds.every((id) => shelf.ids.indexOf(id) !== -1),
    JSON.stringify(shelf && { cover: shelf.coverIds, collection: shelf.ids }));
  check('unknown shelf id resolves to null', REAL.collectionForEmotion('not-a-shelf') === null);

  /* Freshness boundary contract (EXP_101 recheckBy 2026-09-07 after the
     2026-08-25 official re-verification): fresh through the boundary, then
     fail closed and excluded from cover and collection without re-approval. */
  check('EXP_101 is valid as of 2026-08-25 and returns to the 心が弾む cover',
    Boolean(REAL.byId('EXP_101', '2026-08-25')) &&
    REAL.deckForEmotion('hajimu', '2026-08-25').ids.join(',') === 'EXP_101',
    JSON.stringify(REAL.deckForEmotion('hajimu', '2026-08-25').ids));
  check('EXP_101 stays valid through its recheck boundary (2026-09-07)',
    Boolean(REAL.byId('EXP_101', '2026-09-07')));
  const beyondShelf = REAL.collectionForEmotion('hajimu', '2026-09-08');
  check('a record past its recheck boundary is excluded from cover and collection',
    REAL.byId('EXP_101', '2026-09-08') === null &&
    REAL.deckForEmotion('hajimu', '2026-09-08').ids.length === 0 &&
    beyondShelf.state === 'ok' && beyondShelf.ids.indexOf('EXP_101') === -1,
    JSON.stringify({ ids: beyondShelf.ids }));

  check('shelf membership resolves independent of cover visibility',
    REAL.shelfForExperience('EXP_107') === 'miwohiku' &&
    REAL.shelfForExperience('EXP_007') === 'mada' &&
    REAL.shelfForExperience('EXP_001') === null,
    JSON.stringify([REAL.shelfForExperience('EXP_107'), REAL.shelfForExperience('EXP_007')]));

}

/* ------------------------------------------------------------------ layer 2 */

async function openShelf(page, base, query) {
  await page.goto(base + FIXTURE + query);
  await page.waitForSelector('.surface[data-surface="01-entrance"]');
  await page.locator('.entrance-route-shelf').click();
  await page.locator('.emotion-card[data-emotion-label="身を引く"]').click();
  await page.waitForSelector('.surface[data-surface="03-understanding"]');
  await page.locator('.understanding-outcome-column .btn-primary').click();
  await page.waitForSelector('.surface[data-surface="04-discovery"]');
  const coverCount = await page.evaluate(() => window.__SHELF_ABUNDANCE_QA__.coverIds.length);
  for (let step = 0; step < coverCount; step += 1) {
    await page.locator('.deck-next-action').first().click();
    await page.waitForTimeout(90);
  }
  await page.waitForSelector('.surface[data-surface="04-discovery-none"]');
}

async function completionCta(page) {
  return page.evaluate(() => {
    const node = document.querySelector('.deck-completion-collection');
    return node ? node.textContent.trim() : null;
  });
}

/* Zero-cover flows stop at the shelf Understanding surface (no cover deck). */
async function openUnderstanding(page, base, query) {
  await page.goto(base + FIXTURE + query);
  await page.waitForSelector('.surface[data-surface="01-entrance"]');
  await page.locator('.entrance-route-shelf').click();
  await page.locator('.emotion-card[data-emotion-label="身を引く"]').click();
  await page.waitForSelector('.surface[data-surface="03-understanding"]');
  await settle(page);
}

async function understandingCta(page) {
  return page.evaluate(() => {
    const node = document.querySelector('.understanding-collection-entry');
    return node ? node.textContent.trim() : null;
  });
}

async function openCollection(page) {
  await page.locator('.deck-completion-collection').click();
  await page.waitForSelector('.surface[data-surface="15-shelf-collection"]');
  await settle(page);
}

/* Surface entry animations scale the view; measure only once they finish. */
async function settle(page) {
  await page.waitForTimeout(120);
  await page.evaluate(() => Promise.all(
    document.getAnimations().map((animation) => animation.finished.catch(() => {}))
  ));
  await page.waitForTimeout(80);
}

async function collectionSnapshot(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('.collection-grid');
    const cards = Array.from(document.querySelectorAll('.collection-card'));
    const chips = Array.from(document.querySelectorAll('.collection-filter-chip'));
    const style = grid ? getComputedStyle(grid) : null;
    return {
      surface: document.querySelector('#view .surface').getAttribute('data-surface'),
      heading: (document.getElementById('surface-title') || {}).textContent || '',
      total: grid ? grid.getAttribute('data-collection-count') : null,
      visible: grid ? grid.getAttribute('data-collection-visible') : null,
      cardCount: cards.length,
      cardIds: cards.map((card) => card.getAttribute('data-collection-id')),
      cardTitles: cards.map((card) => (card.querySelector('.collection-card-title') || {}).textContent || ''),
      categories: cards.map((card) => (card.querySelector('.collection-card-category') || {}).textContent || ''),
      chips: chips.map((chip) => chip.textContent.trim()),
      pressedChips: chips.filter((chip) => chip.getAttribute('aria-pressed') === 'true').map((chip) => chip.textContent.trim()),
      columns: style ? style.gridTemplateColumns.split(' ').length : 0,
      lazyImages: Array.from(document.querySelectorAll('.collection-card img')).map((img) => img.loading),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      /* The prototype layout has a pre-existing 320px minimum width, so below
         320 CSS px (200% zoom) fit is measured against that layout floor. */
      overflowBeyondLayout: Math.round(
        document.documentElement.scrollWidth - document.body.getBoundingClientRect().width),
      smallControls: Array.from(document.querySelectorAll('#view .surface button')).filter((node) => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && (box.height < 44 || box.width < 44);
      }).map((node) => node.textContent.trim() + ':' + Math.round(node.getBoundingClientRect().height)),
      forbiddenCopy: ['もっと見る', 'さらに読み込む', 'あと1件', 'ランキング', '人気', 'おすすめ順']
        .filter((word) => (document.getElementById('view').textContent || '').includes(word))
    };
  });
}

async function storageSnapshot(page) {
  return page.evaluate(async () => ({
    state: await window.V3_STORE.load(),
    interested: await window.V3_STORE.loadInterested(),
    keys: Object.keys(window.localStorage).sort(),
    url: location.search + location.hash
  }));
}

(async function run() {
  const sandbox = loadSandbox();
  runPlanContracts(sandbox.V3_REAL_EXPERIENCE_REGISTRY);
  runRegistryContracts(sandbox.V3_REAL_EXPERIENCE_REGISTRY);
  runAuditContracts(sandbox.V3_CULTURAL_MATCHING);

  const { server, base } = await start(0);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });
  const errors = [];
  try {
    /* --- CTA eligibility ------------------------------------------------- */
    for (const [size, expected] of [[0, null], [1, null], [3, null], [5, null],
      [6, '棚を一覧で見る（6件）'], [8, '棚を一覧で見る（8件）'],
      [10, '棚を一覧で見る（10件）'], [15, '棚を一覧で見る（15件）'], [16, null]]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`cta${size}: ${error.message}`));
      if (size === 0) {
        await page.goto(`${base}${FIXTURE}?collection=0&cover=0`);
        await page.waitForSelector('.surface[data-surface="01-entrance"]');
        const empty = await page.evaluate(() => {
          const collection = window.V3_REAL_EXPERIENCE_REGISTRY.collectionForEmotion('miwohiku');
          return { count: collection.count, available: collection.available };
        });
        check('collection 0: no availability', empty.count === 0 && empty.available === false,
          JSON.stringify(empty));
      } else {
        await openShelf(page, base, `?collection=${size}&cover=${Math.min(3, size)}`);
        const cta = await completionCta(page);
        check(`collection ${size}: full-shelf CTA ${expected ? 'appears as ' + expected : 'absent'}`,
          cta === expected, String(cta));
        const copy = await page.evaluate(() => document.getElementById('view').textContent || '');
        check(`collection ${size}: completion copy preserved`,
          copy.includes('この棚は、ここまでです。') && copy.includes('さあ、感情の先に出かけよう！'));
        if (size === 6) {
          check('collection 6: no quota-filling encouragement',
            !/あと\d+件/.test(copy) && !copy.includes('もう少しで'), copy.slice(0, 40));
        }
      }
      await context.close();
    }

    /* --- structural failure fails closed --------------------------------- */
    const dupContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const dupPage = await dupContext.newPage();
    dupPage.on('pageerror', (error) => errors.push(`dup: ${error.message}`));
    await openShelf(dupPage, base, '?collection=8&cover=3&dup=1');
    const dupCta = await completionCta(dupPage);
    const dupState = await dupPage.evaluate(() =>
      window.V3_REAL_EXPERIENCE_REGISTRY.collectionForEmotion('miwohiku').state);
    check('duplicate authored ID: shelf errors and CTA stays hidden',
      dupCta === null && dupState === 'error', JSON.stringify({ dupCta, dupState }));
    await dupContext.close();

    const staleContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const stalePage = await staleContext.newPage();
    stalePage.on('pageerror', (error) => errors.push(`stale: ${error.message}`));
    await openShelf(stalePage, base, '?collection=8&cover=3&stale=1');
    const staleCta = await completionCta(stalePage);
    await openCollection(stalePage);
    const staleShelf = await collectionSnapshot(stalePage);
    check('unresolvable authored ID is excluded, remaining shelf stays valid',
      staleCta === '棚を一覧で見る（8件）' && staleShelf.cardCount === 8 &&
      staleShelf.cardIds.indexOf('QA_EXP_STALE') === -1,
      JSON.stringify({ staleCta, cards: staleShelf.cardCount }));
    await staleContext.close();

    /* --- zero-cover collection routing ------------------------------------ */
    for (const [size, expected] of [[5, null], [6, '棚を一覧で見る（6件）'],
      [15, '棚を一覧で見る（15件）'], [16, null]]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`zerocover${size}: ${error.message}`));
      await openUnderstanding(page, base, `?collection=${size}&cover=0`);
      const cta = await understandingCta(page);
      check(`cover=0 collection=${size}: understanding CTA ${expected ? 'appears as ' + expected : 'absent'}`,
        cta === expected, String(cta));
      if (expected === null) {
        const plainEmpty = await page.evaluate(() =>
          (document.querySelector('.understanding-empty') || { textContent: '' })
            .textContent.includes('この棚には、いま置けるものがありません。'));
        check(`cover=0 collection=${size}: plain empty state preserved (fail closed)`,
          plainEmpty === true);
      }
      await context.close();
    }

    const zeroContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const zeroPage = await zeroContext.newPage();
    zeroPage.on('pageerror', (error) => errors.push(`zerocover-open: ${error.message}`));
    await openUnderstanding(zeroPage, base, '?collection=6&cover=0');
    const zeroBefore = await storageSnapshot(zeroPage);
    await zeroPage.locator('.understanding-collection-entry').click();
    await zeroPage.waitForSelector('.surface[data-surface="15-shelf-collection"]');
    await settle(zeroPage);
    const zeroShelf = await collectionSnapshot(zeroPage);
    const zeroAuthored = await zeroPage.evaluate(() => window.__SHELF_ABUNDANCE_QA__.authoredIds.slice());
    check('zero-cover CTA opens the existing finite collection surface',
      zeroShelf.surface === '15-shelf-collection' && zeroShelf.cardCount === 6 &&
      zeroShelf.cardIds.join(',') === zeroAuthored.join(','),
      JSON.stringify({ surface: zeroShelf.surface, cards: zeroShelf.cardCount }));
    check('zero-cover collection keeps the finite grammar (no pagination copy)',
      zeroShelf.forbiddenCopy.length === 0 && zeroShelf.heading.includes('（6件）'),
      zeroShelf.heading);
    const zeroAfter = await storageSnapshot(zeroPage);
    check('zero-cover CTA click mutates no storage / URL / Interested',
      JSON.stringify(zeroBefore.state) === JSON.stringify(zeroAfter.state) &&
      JSON.stringify(zeroBefore.interested) === JSON.stringify(zeroAfter.interested) &&
      zeroBefore.keys.join(',') === zeroAfter.keys.join(',') &&
      zeroBefore.url === zeroAfter.url,
      JSON.stringify({ before: zeroBefore.url, after: zeroAfter.url }));
    await zeroPage.locator(`.collection-card[data-collection-id="${zeroAuthored[3]}"] .collection-card-detail`).click();
    await zeroPage.waitForSelector('.surface[data-surface="05-experience-detail"]');
    await zeroPage.locator('.detail-bottom-back').click();
    await zeroPage.waitForSelector('.surface[data-surface="15-shelf-collection"]');
    check('zero-cover Detail opens and returns to the collection', true);
    await zeroPage.locator('.collection-bottom-back').click();
    await zeroPage.waitForSelector('.surface[data-surface="03-understanding"]');
    const zeroReturn = await zeroPage.evaluate(() =>
      Boolean(document.querySelector('.understanding-collection-entry')));
    check('zero-cover collection returns to Understanding with the CTA intact',
      zeroReturn === true);
    await zeroContext.close();

    const normalContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const normalPage = await normalContext.newPage();
    normalPage.on('pageerror', (error) => errors.push(`normal-cover: ${error.message}`));
    await openUnderstanding(normalPage, base, '?collection=8&cover=3');
    const normalUnderstanding = await understandingCta(normalPage);
    check('cover=3 collection=8: no duplicate early CTA on Understanding',
      normalUnderstanding === null, String(normalUnderstanding));
    await normalPage.locator('.understanding-outcome-column .btn-primary').click();
    await normalPage.waitForSelector('.surface[data-surface="04-discovery"]');
    for (let step = 0; step < 3; step += 1) {
      await normalPage.locator('.deck-next-action').first().click();
      await normalPage.waitForTimeout(90);
    }
    await normalPage.waitForSelector('.surface[data-surface="04-discovery-none"]');
    const normalCompletion = await completionCta(normalPage);
    check('cover=3 collection=8: completion flow and its CTA unchanged',
      normalCompletion === '棚を一覧で見る（8件）', String(normalCompletion));
    await normalContext.close();

    for (const [width, height, label] of [[320, 700, '320px'], [390, 844, '390×844'],
      [430, 932, '430×932'], [1440, 900, '1440px']]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`zerocover-${width}: ${error.message}`));
      await openUnderstanding(page, base, '?collection=8&cover=0');
      const entry = await page.evaluate(() => {
        const node = document.querySelector('.understanding-collection-entry');
        const box = node ? node.getBoundingClientRect() : null;
        return {
          present: Boolean(node),
          height: box ? Math.round(box.height) : 0,
          width: box ? Math.round(box.width) : 0,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        };
      });
      check(`${label} zero-cover: CTA present >=44px, no horizontal overflow`,
        entry.present && entry.height >= 44 && entry.width >= 44 && entry.overflow <= 0,
        JSON.stringify(entry));
      await page.locator('.understanding-collection-entry').click();
      await page.waitForSelector('.surface[data-surface="15-shelf-collection"]');
      await settle(page);
      const opened = await page.evaluate(() => ({
        cards: document.querySelectorAll('.collection-card').length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      }));
      check(`${label} zero-cover: collection opens without overflow`,
        opened.cards === 8 && opened.overflow <= 0, JSON.stringify(opened));
      await context.close();
    }

    /* --- full-shelf surface ---------------------------------------------- */
    const shelfContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const shelfPage = await shelfContext.newPage();
    shelfPage.on('pageerror', (error) => errors.push(`shelf: ${error.message}`));
    const requests = [];
    shelfPage.on('request', (request) => requests.push(request.url()));
    await openShelf(shelfPage, base, '?collection=10&cover=3');
    const beforeOpen = await shelfPage.evaluate(() => ({
      cards: document.querySelectorAll('.collection-card').length,
      images: document.querySelectorAll('.collection-card img').length,
      surface: document.querySelectorAll('[data-surface="15-shelf-collection"]').length
    }));
    await openCollection(shelfPage);
    const shelf = await collectionSnapshot(shelfPage);
    const authored = await shelfPage.evaluate(() => window.__SHELF_ABUNDANCE_QA__.authoredIds.slice());

    check('full shelf renders every collection object once',
      shelf.cardCount === 10 && new Set(shelf.cardIds).size === 10,
      JSON.stringify({ cards: shelf.cardCount }));
    check('full shelf keeps exact Human Editorial order',
      shelf.cardIds.join(',') === authored.join(','), shelf.cardIds.join(','));
    check('heading states the finite count', shelf.heading.includes('（10件）'), shelf.heading);
    check('no pagination / load-more / ranking copy',
      shelf.forbiddenCopy.length === 0, shelf.forbiddenCopy.join(','));
    check('collection images lazy-load after explicit open',
      shelf.lazyImages.length === 10 && shelf.lazyImages.every((value) => value === 'lazy'),
      JSON.stringify(shelf.lazyImages.slice(0, 3)));
    check('no full-shelf card or image is generated before the explicit open',
      beforeOpen.cards === 0 && beforeOpen.images === 0 && beforeOpen.surface === 0,
      JSON.stringify(beforeOpen));
    check('third-party requests remain 0',
      requests.every((url) => url.startsWith(base)),
      requests.filter((url) => !url.startsWith(base)).join(','));

    /* --- category chips --------------------------------------------------- */
    const expectedChips = await shelfPage.evaluate(() => {
      const MAP = { Book: '本', Film: '映画', Music: '音楽', Exhibition: '展示', Place: '場所', Dining: '場所', Travel: '体験', Activity: '体験', Event: 'イベント' };
      const seen = [];
      window.__SHELF_ABUNDANCE_QA__.authoredIds.forEach((id) => {
        const record = window.V3_REAL_EXPERIENCE_REGISTRY.byId(id);
        const label = record ? MAP[record.canonicalType] : null;
        if (label && seen.indexOf(label) === -1) seen.push(label);
      });
      return seen;
    });
    const orderedGroups = ['本', '映画', '音楽', '展示', '場所', '体験', 'イベント']
      .filter((label) => expectedChips.includes(label)).slice(0, 5);
    check('only non-empty category chips appear, capped at 5 plus すべて',
      shelf.chips[0] === 'すべて' && shelf.chips.length <= 6 &&
      shelf.chips.slice(1).join(',') === orderedGroups.join(','),
      JSON.stringify({ chips: shelf.chips, expected: orderedGroups }));
    check('no empty category chip is rendered',
      shelf.chips.slice(1).every((label) => shelf.categories.includes(label)),
      JSON.stringify({ chips: shelf.chips, categories: Array.from(new Set(shelf.categories)) }));
    check('すべて is the initial state', shelf.pressedChips.join(',') === 'すべて',
      shelf.pressedChips.join(','));

    const beforeFilter = await storageSnapshot(shelfPage);
    const chipLabel = orderedGroups[1] || orderedGroups[0];
    await shelfPage.locator(`.collection-filter-chip:has-text("${chipLabel}")`).first().click();
    await settle(shelfPage);
    const filtered = await collectionSnapshot(shelfPage);
    const afterFilter = await storageSnapshot(shelfPage);
    check(`category chip「${chipLabel}」filters to that category only`,
      filtered.cardCount > 0 && filtered.cardCount < shelf.cardCount &&
      filtered.categories.every((label) => label === chipLabel),
      JSON.stringify({ visible: filtered.cardCount, categories: Array.from(new Set(filtered.categories)) }));
    check('filter state is not persisted to storage or URL',
      JSON.stringify(beforeFilter.state) === JSON.stringify(afterFilter.state) &&
      JSON.stringify(beforeFilter.interested) === JSON.stringify(afterFilter.interested) &&
      beforeFilter.keys.join(',') === afterFilter.keys.join(',') &&
      beforeFilter.url === afterFilter.url,
      JSON.stringify({ before: beforeFilter.url, after: afterFilter.url }));
    const reloaded = await shelfPage.evaluate(() => {
      const chip = document.querySelector('.collection-filter-chip[aria-pressed="true"]');
      return chip ? chip.textContent.trim() : null;
    });
    check('filter is session/UI-only state', reloaded === chipLabel, String(reloaded));
    await shelfPage.locator('.collection-filter-chip:has-text("すべて")').first().click();
    await settle(shelfPage);

    /* --- depth-object Interested ----------------------------------------- */
    const depthId = await shelfPage.evaluate(() => {
      const qa = window.__SHELF_ABUNDANCE_QA__;
      return qa.authoredIds.filter((id) => qa.coverIds.indexOf(id) === -1)[0];
    });
    await shelfPage.locator(`.collection-card[data-collection-id="${depthId}"] .collection-card-interest`).click();
    await shelfPage.waitForTimeout(220);
    const saved = await shelfPage.evaluate(async (id) => {
      const payload = await window.V3_STORE.loadInterested();
      const resolved = window.V3_INTERESTED_RETRIEVAL.resolveAll(payload);
      const entry = resolved.filter((item) => item.experienceId === id)[0];
      return {
        items: payload.items,
        keys: payload.items.map((item) => Object.keys(item).sort().join(',')),
        status: entry ? entry.status : null,
        shelfId: entry ? entry.shelfId : null,
        inCover: window.__SHELF_ABUNDANCE_QA__.coverIds.indexOf(id) !== -1
      };
    }, depthId);
    check('a collection-only object saves and resolves as actionable',
      saved.status === 'actionable' && saved.shelfId === 'miwohiku' && saved.inCover === false,
      JSON.stringify({ status: saved.status, shelf: saved.shelfId }));
    check('saved schema stays exactly {experienceId, savedAt}',
      saved.keys.every((key) => key === 'experienceId,savedAt'), saved.keys.join('|'));

    /* --- detail from the collection --------------------------------------- */
    await shelfPage.locator(`.collection-card[data-collection-id="${depthId}"] .collection-card-detail`).click();
    await shelfPage.waitForSelector('.surface[data-surface="05-experience-detail"]');
    const detail = await shelfPage.evaluate(() => {
      const view = document.getElementById('view');
      return {
        title: (document.getElementById('surface-title') || {}).textContent || '',
        hasWhy: Boolean(view.querySelector('.detail-editorial-reason')),
        why: (view.querySelector('.detail-editorial-reason p') || {}).textContent || '',
        hasTruth: Boolean(view.querySelector('.detail-practical-truth')),
        truthLabels: Array.from(view.querySelectorAll('.detail-truth-list dt')).map((node) => node.textContent),
        placeSections: view.querySelectorAll('.place-detail-content').length,
        primaryActions: view.querySelectorAll('.detail-primary-action').length,
        fakeAddress: (view.textContent || '').includes('最寄駅')
      };
    });
    const fullWhy = await shelfPage.evaluate((id) =>
      (window.V3_REAL_EXPERIENCE_REGISTRY.byId(id) || {}).reason || '', depthId);
    check('type-neutral Detail renders identity, Why and Practical Truth',
      detail.hasWhy && detail.hasTruth && detail.truthLabels.length > 0 && detail.primaryActions === 1,
      JSON.stringify({ truth: detail.truthLabels, actions: detail.primaryActions }));
    check('Detail shows the complete approved Why (no summarization)',
      detail.why === fullWhy, `${detail.why.length}/${fullWhy.length}`);
    check('non-place object shows no fabricated place fields',
      detail.placeSections === 0 && detail.fakeAddress === false,
      JSON.stringify({ placeSections: detail.placeSections }));
    await shelfPage.locator('.detail-bottom-back').click();
    await shelfPage.waitForSelector('.surface[data-surface="15-shelf-collection"]');
    check('Detail returns to the full shelf it was opened from', true);
    await shelfPage.locator('.collection-bottom-back').click();
    await shelfPage.waitForSelector('.surface[data-surface="04-discovery-none"]');
    check('the full shelf returns to the completion send-off', true);
    await shelfContext.close();

    /* --- responsive ------------------------------------------------------- */
    for (const [width, height, expectedColumns, label] of [
      [320, 700, 1, '320px'], [390, 844, 2, '390×844'], [430, 932, 2, '430×932'],
      [1200, 900, 3, '1200px'], [1440, 900, 3, '1440px'], [195, 422, 1, '195px (390 @200% zoom)']
    ]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`viewport${width}: ${error.message}`));
      await openShelf(page, base, '?collection=10&cover=3');
      await openCollection(page);
      const view = await collectionSnapshot(page);
      const belowFloor = width < 320;
      check(`${label}: ${expectedColumns}-column grid, no horizontal overflow`,
        view.columns === expectedColumns &&
        (belowFloor ? view.overflowBeyondLayout <= 0 : view.overflow <= 0),
        JSON.stringify({ columns: view.columns, overflow: view.overflow, beyondLayout: view.overflowBeyondLayout }));
      check(`${label}: every control stays >=44px`,
        view.smallControls.length === 0, view.smallControls.join(','));
      check(`${label}: Japanese titles wrap without one-character columns`,
        await page.evaluate(() => Array.from(document.querySelectorAll('.collection-card-title'))
          .every((node) => node.getBoundingClientRect().width >= 60)));
      if (belowFloor) {
        const productionPage = await context.newPage();
        await productionPage.goto(base + '/index.html');
        await productionPage.waitForSelector('.surface[data-surface="01-entrance"]');
        const productionOverflow = await productionPage.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(`${label}: fit matches the untouched production entrance (existing 320px floor)`,
          productionOverflow === view.overflow,
          JSON.stringify({ entrance: productionOverflow, collection: view.overflow }));
      }
      await context.close();
    }

    /* --- regressions ------------------------------------------------------ */
    const regressionContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const regressionPage = await regressionContext.newPage();
    regressionPage.on('pageerror', (error) => errors.push(`regression: ${error.message}`));
    await regressionPage.goto(base + '/index.html');
    await regressionPage.waitForSelector('.surface[data-surface="01-entrance"]');
    await regressionPage.locator('.entrance-route-shelf').click();
    await regressionPage.locator('.emotion-card[data-emotion-label="身を引く"]').click();
    await regressionPage.waitForSelector('.surface[data-surface="03-understanding"]');
    await regressionPage.locator('.understanding-outcome-column .btn-primary').click();
    await regressionPage.waitForSelector('.surface[data-surface="04-discovery"]');
    const production = await regressionPage.evaluate(() => ({
      cards: document.querySelectorAll('.real-discovery-card').length,
      collection: window.V3_REAL_EXPERIENCE_REGISTRY.collectionForEmotion('miwohiku')
    }));
    check('production cover behavior unchanged (finite 0–3 card view)',
      production.cards === 1 && production.collection.count <= 3,
      JSON.stringify({ cards: production.cards, collection: production.collection.count }));
    await regressionPage.locator('.deck-next-action').first().click();
    await regressionPage.waitForSelector('.surface[data-surface="04-discovery-none"]');
    const productionCompletion = await regressionPage.evaluate(() => ({
      copy: document.getElementById('view').textContent || '',
      cta: document.querySelectorAll('.deck-completion-collection').length
    }));
    check('production completion keeps its copy and hides the full-shelf CTA',
      productionCompletion.copy.includes('この棚は、ここまでです。') &&
      productionCompletion.copy.includes('さあ、感情の先に出かけよう！') &&
      productionCompletion.cta === 0,
      JSON.stringify({ cta: productionCompletion.cta }));

    await regressionPage.goto(base + '/index.html');
    await regressionPage.waitForSelector('.surface[data-surface="01-entrance"]');
    await regressionPage.locator('#bottomMenuTrigger').click();
    await regressionPage.locator('#headerNavPanel [data-nav="no-emotion"]').click();
    await regressionPage.waitForSelector('.surface[data-surface="10-no-emotion"]');
    const noEmotion = await regressionPage.evaluate(() => ({
      cards: document.querySelectorAll('.real-discovery-card').length,
      chips: document.querySelectorAll('.collection-filter-chip').length,
      collectionCta: document.querySelectorAll('.deck-completion-collection').length,
      count: Number(document.querySelector('.surface').getAttribute('data-lineup-count'))
    }));
    check('選ばずに見る stays an independent finite 0–3 lineup',
      noEmotion.count <= 3 && noEmotion.chips === 0 && noEmotion.collectionCta === 0,
      JSON.stringify(noEmotion));

    /* Real inventory after the 2026-08-25 freshness sync: 心が弾む resolves its
       1-item cover again (normal flow restored). Its collection (1 < 6) must
       still expose no full-shelf CTA anywhere. The zero-cover contract itself
       stays proven above with synthetic fixtures only. */
    await regressionPage.goto(base + '/index.html');
    await regressionPage.waitForSelector('.surface[data-surface="01-entrance"]');
    await regressionPage.locator('.entrance-route-shelf').click();
    await regressionPage.locator('.emotion-card[data-emotion-label="心が弾む"]').click();
    await regressionPage.waitForSelector('.surface[data-surface="03-understanding"]');
    const productionHajimu = await regressionPage.evaluate(() => ({
      deckCount: (document.querySelector('[data-deck-count]') || { getAttribute: () => null })
        .getAttribute('data-deck-count'),
      emptyState: document.querySelectorAll('.understanding-empty').length,
      cta: document.querySelectorAll('.understanding-collection-entry').length,
      collection: window.V3_REAL_EXPERIENCE_REGISTRY.collectionForEmotion('hajimu').count
    }));
    check('production 心が弾む cover restored; collection<6 still exposes no CTA',
      productionHajimu.deckCount === '1' && productionHajimu.emptyState === 0 &&
      productionHajimu.cta === 0 && productionHajimu.collection === 1,
      JSON.stringify(productionHajimu));
    await regressionContext.close();

    check('runtime JS errors = 0', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
    server.close();
  }

  const passed = results.filter((result) => result.pass).length;
  console.log(`\n${passed}/${results.length} PASS`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
