#!/usr/bin/env node
'use strict';

const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'v3-prototype');
const EVIDENCE = path.join(SRC, '.rc-evidence', 'visual-system-v1');
const START = '3e063ec472df3c10dc271473a28390ce17f553c7';
const EXPECTED_BRANCH = 'codex/v3-visual-system-v1-20260825';
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const results = [];
const report = {
  generatedAt: new Date().toISOString(),
  branch: '',
  head: '',
  start: START,
  viewports: {},
  errors: []
};

function check(name, pass, detail = '') {
  const item = { name, pass: Boolean(pass), detail: String(detail || '') };
  results.push(item);
  console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${name}${item.detail ? ` — ${item.detail}` : ''}`);
}

function git(args, options = {}) {
  return cp.execFileSync('git', args, {
    cwd: ROOT,
    encoding: options.encoding === null ? null : 'utf8'
  }).toString().trim();
}

function atStart(relativePath) {
  return cp.execFileSync('git', ['show', `${START}:${relativePath}`], { cwd: ROOT });
}

function sha(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function assetIntegrity() {
  const base = path.join(SRC, 'assets', 'visual-system-v1');
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'ASSET_MANIFEST.json'), 'utf8'));
  let sources = 0;
  let runtime = 0;
  manifest.records.forEach((record) => {
    const source = fs.readFileSync(path.join(base, record.source_png));
    const derived = fs.readFileSync(path.join(base, record.runtime_webp));
    if (sha(source) === record.source_sha256 && source.length === record.source_bytes) sources += 1;
    if (sha(derived) === record.runtime_sha256 && derived.length === record.runtime_bytes) runtime += 1;
  });
  check('asset pack: all 16 canonical source PNGs are byte-preserved', sources === 16, `${sources}/16`);
  check('asset pack: all 16 bounded runtime WebPs match manifest', runtime === 16, `${runtime}/16`);
  check('asset pack: runtime derivatives are exactly 960x720 by manifest',
    manifest.records.every((record) => JSON.stringify(record.runtime_dimensions) === '[960,720]'));
}

function protectedContracts() {
  const protectedFiles = [
    'v3-prototype/js/store.js',
    'v3-prototype/js/entrance_cue_store.js',
    'v3-prototype/js/cultural_matching.js',
    'v3-prototype/js/action_destination.js',
    'v3-prototype/js/calendar_action.js',
    'v3-prototype/js/interested_retrieval.js',
    'v3-prototype/js/analytics.js'
  ];
  protectedFiles.forEach((relativePath) => {
    check(`protected byte identity: ${path.basename(relativePath)}`,
      read(relativePath).equals(atStart(relativePath)));
  });
  const cue = fs.readFileSync(path.join(SRC, 'js', 'entrance_cue_store.js'), 'utf8');
  check('Entrance cue key remains exactly entrance-cue-ack-v1',
    cue.includes("var KEY = 'entrance-cue-ack-v1'") && !/fetch|XMLHttpRequest|sendBeacon/.test(cue));
  const vercel = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
  check('separate CSP P0 remains unchanged', vercel.includes("frame-src 'none'"));
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const visible = (selector) => {
      const node = document.querySelector(selector);
      return Boolean(node && node.getBoundingClientRect().height > 0 && getComputedStyle(node).visibility !== 'hidden');
    };
    const columns = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return 0;
      return getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length;
    };
    return {
      width: innerWidth,
      overflow: {
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth
      },
      body: {
        background: getComputedStyle(document.body).backgroundColor,
        color: getComputedStyle(document.body).color,
        family: getComputedStyle(document.body).fontFamily,
        size: getComputedStyle(document.body).fontSize,
        lineHeight: getComputedStyle(document.body).lineHeight
      },
      emotionColumns: columns('.emotion-grid'),
      headerLogoVisible: visible('.site-header .site-logo'),
      bottomNavVisible: visible('.mobile-bottom-nav'),
      desktopHomeVisible: visible('.header-destination[data-nav="home"]'),
      fonts: document.fonts.status
    };
  });
}

async function performanceMetrics(page) {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: new URL(entry.name).pathname,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize || 0,
      decodedBodySize: entry.decodedBodySize || 0
    }));
    const totals = resources.reduce((all, resource) => {
      all.transferSize += resource.transferSize;
      all.decodedBodySize += resource.decodedBodySize;
      return all;
    }, { transferSize: 0, decodedBodySize: 0 });
    const navigation = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint').reduce((all, entry) => {
      all[entry.name] = entry.startTime;
      return all;
    }, {});
    return {
      resources,
      totals,
      navigation: navigation ? {
        transferSize: navigation.transferSize,
        decodedBodySize: navigation.decodedBodySize,
        domContentLoaded: navigation.domContentLoadedEventEnd,
        load: navigation.loadEventEnd
      } : null,
      paints
    };
  });
}

async function reachDiscovery(page) {
  await page.locator('.entrance-route-shelf').click();
  await page.waitForSelector('.surface[data-surface="02-emotion"]');
  await page.locator('.emotion-card[data-emotion-label="心があたたまる"]').click();
  await page.waitForSelector('.surface[data-surface="03-understanding"]');
  await page.locator('.understanding-outcome-column .btn-primary').click();
  await page.waitForSelector('.real-discovery-card');
}

async function runViewport(browser, base, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    hasTouch: viewport.mobile,
    isMobile: viewport.mobile
  });
  const page = await context.newPage();
  const external = [];
  const calendarRequests = [];
  const firstPartyHost = new URL(base).hostname;
  page.on('pageerror', (error) => report.errors.push(`${viewport.name}: ${error.message}`));
  page.on('request', (request) => {
    try {
      const url = new URL(request.url());
      if (url.hostname !== firstPartyHost) external.push(request.url());
      if (url.hostname === 'calendar.google.com') calendarRequests.push(request.url());
    } catch (error) { /* non-URL request */ }
  });

  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const entrance = await pageMetrics(page);
  const performance = await performanceMetrics(page);
  report.viewports[viewport.name] = { entrance, performance };

  check(`${viewport.name}: white/navy canonical body tokens`,
    entrance.body.background === 'rgb(255, 255, 255)' && entrance.body.color === 'rgb(31, 42, 51)',
    JSON.stringify(entrance.body));
  check(`${viewport.name}: self-hosted fonts loaded`, entrance.fonts === 'loaded');
  check(`${viewport.name}: Entrance has no horizontal overflow`,
    entrance.overflow.document <= 1 && entrance.overflow.body <= 1,
    JSON.stringify(entrance.overflow));
  check(`${viewport.name}: exact approved headline and CTA copy`,
    (await page.locator('#surface-title').textContent()).replace(/\s/g, '') === '感情の先に、世界がある' &&
    (await page.locator('.entrance-route-shelf').innerText()).trim() === 'はじめる');
  const entranceVisual = await page.evaluate(() => {
    const hero = document.querySelector('.entrance .hero');
    const overlay = getComputedStyle(hero, '::after');
    const accent = getComputedStyle(document.querySelector('.entrance .display'), '::before');
    return {
      src: document.querySelector('.entrance .hero-img').getAttribute('src'),
      overlay: overlay.backgroundImage,
      accent: accent.backgroundColor,
      heroHeight: hero.getBoundingClientRect().height
    };
  });
  check(`${viewport.name}: North Star photo + geometric Aqua treatment`,
    /runtime_webp\/emotion\/emotion_hajimu\.webp$/.test(entranceVisual.src) &&
    entranceVisual.overlay !== 'none' && entranceVisual.accent === 'rgb(70, 184, 200)' &&
    (viewport.mobile ? entranceVisual.heroHeight <= 170 : entranceVisual.heroHeight >= 390),
    JSON.stringify(entranceVisual));
  if (viewport.mobile) {
    check(`${viewport.name}: mobile header and persistent 3-item bottom nav`,
      entrance.headerLogoVisible && entrance.bottomNavVisible &&
      await page.locator('.mobile-bottom-nav-item').count() === 3);
    check(`${viewport.name}: MENU exposes no-emotion entry`,
      await page.locator('#bottomMenuTrigger').count() === 1 &&
      await page.locator('#headerNavPanel [data-nav="no-emotion"]').count() === 1);
  } else {
    check(`${viewport.name}: desktop header has Home/Saved/Menu and no bottom nav`,
      entrance.headerLogoVisible && entrance.desktopHomeVisible && !entrance.bottomNavVisible &&
      await page.locator('.header-destination').count() === 2);
    check(`${viewport.name}: exact approved desktop continuation copy`,
      (await page.locator('.entrance .lede').textContent()).replace(/\s/g, '') ===
      '本、映画、音楽、体験。8つの感情から新たな出会いを。');
  }
  check(`${viewport.name}: first paint third-party request 0`, external.length === 0, external.join(', '));
  await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-entrance.png`), fullPage: true });

  await page.locator('.entrance-route-shelf').click();
  await page.waitForSelector('.emotion-grid');
  const emotion = await pageMetrics(page);
  report.viewports[viewport.name].emotion = emotion;
  const expectedColumns = viewport.width >= 1440 ? 4 : (viewport.width >= 900 ? 3 : 2);
  check(`${viewport.name}: eight editorial emotion tiles`,
    await page.locator('.emotion-card').count() === 8 && emotion.emotionColumns === expectedColumns,
    `columns=${emotion.emotionColumns}`);
  check(`${viewport.name}: all emotion tiles use supplied runtime WebP`,
    await page.locator('.emotion-card-image').evaluateAll((images) => images.every((image) =>
      /\/assets\/visual-system-v1\/runtime_webp\/emotion\/emotion_[a-z]+\.webp$/.test(new URL(image.src).pathname) &&
      image.getAttribute('width') === '960' && image.getAttribute('height') === '720')));
  check(`${viewport.name}: shelf text is name plus one short rendered line`,
    await page.locator('.emotion-card').evaluateAll((cards) => cards.every((card) => {
      const label = card.querySelector('.emotion-card-label');
      const description = card.querySelector('.emotion-card-description');
      return Boolean(label && description && description.textContent.trim() &&
        description.scrollHeight <= parseFloat(getComputedStyle(description).lineHeight) * 1.6);
    })));
  check(`${viewport.name}: emotion grid has no horizontal overflow`,
    emotion.overflow.document <= 1 && emotion.overflow.body <= 1,
    JSON.stringify(emotion.overflow));
  await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-emotion-grid.png`), fullPage: true });

  await page.locator('.emotion-card[data-emotion-label="心があたたまる"]').click();
  await page.waitForSelector('.surface[data-surface="03-understanding"]');
  check(`${viewport.name}: Shelf Detail uses the new tile family`,
    /\/assets\/visual-system-v1\/runtime_webp\/emotion\/emotion_atatamaru\.webp$/.test(
      new URL(await page.locator('.understanding-shelf-image').getAttribute('src'), page.url()).pathname));
  check(`${viewport.name}: area labels remain exact`,
    JSON.stringify(await page.locator('[data-context-field="area"] option').allTextContents()) ===
    JSON.stringify(['指定しない', '東京23区内', '東京都内（23区外）']));
  if (viewport.mobile) {
    check(`${viewport.name}: in-service mobile back remains explicit and >=44px`,
      (await page.locator('.stepbar-back').innerText()).trim() === '感情の棚へ戻る' &&
      (await page.locator('.stepbar-back').boundingBox()).height >= 44);
  }

  await page.locator('.understanding-outcome-column .btn-primary').click();
  await page.waitForSelector('.real-discovery-card');
  check(`${viewport.name}: Discovery fallback is supplied abstract editorial art`,
    await page.locator('.real-experience-visual.is-category-visual').count() === 1 &&
    /\/assets\/visual-system-v1\/runtime_webp\/category\/category_place\.webp$/.test(
      new URL(await page.locator('.real-experience-visual-image').getAttribute('src'), page.url()).pathname) &&
    (await page.locator('.real-experience-media-status').innerText()).trim() === '感情書店のカテゴリ図版');
  check(`${viewport.name}: Discovery has no popularity/commerce pressure signal`,
    !/評価|ランキング|人気|SALE|トレンド|残り\d|急いで/.test(await page.locator('.real-discovery-card').innerText()));
  check(`${viewport.name}: Discovery primary action follows Navy button hierarchy`,
    await page.locator('.real-discovery-primary').evaluate((node) => {
      const style = getComputedStyle(node);
      return style.backgroundColor === 'rgb(23, 50, 77)' && style.color === 'rgb(255, 255, 255)';
    }));
  check(`${viewport.name}: unsaved Interested is explicit`,
    (await page.locator('.real-discovery-interest').innerText()).trim() === '気になる' &&
    await page.locator('.real-discovery-interest').getAttribute('aria-pressed') === 'false');
  await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-discovery.png`), fullPage: true });

  await page.locator('.real-discovery-interest').click();
  await page.waitForFunction(() => document.querySelector('.real-discovery-interest')?.textContent.trim() === '保存済み');
  const savedStyleHandle = await page.waitForFunction(() => {
    const node = document.querySelector('.real-discovery-interest');
    if (!node || !node.isConnected) return null;
    const path = node.querySelector('svg path');
    const snapshot = {
      pressed: node.getAttribute('aria-pressed'),
      color: getComputedStyle(node).color,
      fill: path ? getComputedStyle(path).fill : ''
    };
    return snapshot.pressed === 'true' && snapshot.color === 'rgb(228, 95, 100)' &&
      snapshot.fill === 'rgb(228, 95, 100)' ? snapshot : null;
  });
  const savedStyle = await savedStyleHandle.jsonValue();
  check(`${viewport.name}: saved Interested is reversible coral state`,
    savedStyle.pressed === 'true' && savedStyle.color === 'rgb(228, 95, 100)' &&
    savedStyle.fill === 'rgb(228, 95, 100)', JSON.stringify(savedStyle));

  if (viewport.mobile) await page.locator('.mobile-bottom-nav [data-nav="interested"]').click();
  else await page.locator('.header-destination[data-nav="interested"]').click();
  await page.waitForSelector('.interested-item');
  check(`${viewport.name}: saved list remains image/title/category/short-line first`,
    await page.locator('.interested-item-image').count() === 1 &&
    await page.locator('.interested-item-title').count() === 1 &&
    await page.locator('.interested-item-type').count() === 1 &&
    !(await page.locator('.interested-item').innerText()).includes('保存日'));
  await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-saved-list.png`), fullPage: true });
  await page.locator('.interested-close').click();

  await page.locator('.real-discovery-detail').click();
  await page.waitForSelector('.surface[data-surface="05-experience-detail"]');
  const readerOrder = await page.evaluate(() => {
    const surface = document.querySelector('.surface[data-surface="05-experience-detail"]');
    const visual = surface.querySelector('.detail-visual-column');
    const title = surface.querySelector('#surface-title');
    const firstPull = surface.querySelector('.first-pull');
    const why = surface.querySelector('.detail-editorial-reason');
    const truth = surface.querySelector('.detail-practical-truth');
    const actions = surface.querySelector('.detail-actions');
    const relation = (left, right) => Boolean(left && right &&
      (left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING));
    return {
      visualTitle: relation(visual, title),
      titlePull: firstPull ? relation(title, firstPull) : true,
      pullWhy: firstPull ? relation(firstPull, why) : relation(title, why),
      whyTruth: relation(why, truth),
      truthAction: relation(truth, actions)
    };
  });
  check(`${viewport.name}: locked Detail reading order`, Object.values(readerOrder).every(Boolean),
    JSON.stringify(readerOrder));
  check(`${viewport.name}: Detail action family has no blank CTA`,
    await page.locator('.detail-actions button').evaluateAll((buttons) =>
      buttons.every((button) => button.textContent.trim().length > 0 && button.getBoundingClientRect().height >= 44)));
  check(`${viewport.name}: Detail keeps a visible top back affordance`,
    await page.locator('.stepbar-back').isVisible() &&
    (await page.locator('.stepbar-back').boundingBox()).height >= 44);
  check(`${viewport.name}: long copy and actions wrap without local overflow`,
    await page.locator('.place-detail-body, .detail-actions .btn, .detail-summary-column .display').evaluateAll((nodes) =>
      nodes.every((node) => node.scrollWidth <= node.clientWidth + 1)));
  const detailMetrics = await pageMetrics(page);
  check(`${viewport.name}: Detail has no horizontal overflow`,
    detailMetrics.overflow.document <= 1 && detailMetrics.overflow.body <= 1,
    JSON.stringify(detailMetrics.overflow));
  await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-detail.png`), fullPage: true });

  await page.locator('.detail-plan-action').click();
  await page.waitForSelector('.plan-form');
  await page.locator('#plan-today').check();
  await page.locator('.plan-form button[type="submit"]').click();
  await page.waitForSelector('.plan-saved-panel');
  await page.evaluate(() => {
    window.__VISUAL_CALENDAR_OPENS__ = [];
    window.open = function (url, target, features) {
      window.__VISUAL_CALENDAR_OPENS__.push({ url, target, features });
      return { opener: null };
    };
  });
  check(`${viewport.name}: Calendar causes no request before explicit click`, calendarRequests.length === 0);
  check(`${viewport.name}: Calendar wording remains explicit add action`,
    (await page.locator('.google-calendar-action').innerText()).trim() === 'Googleカレンダーに追加');
  await page.locator('.google-calendar-action').click();
  const calendarOpen = await page.evaluate(() => window.__VISUAL_CALENDAR_OPENS__[0] || null);
  check(`${viewport.name}: explicit Calendar action remains navigation-only`,
    Boolean(calendarOpen) && calendarOpen.url.startsWith('https://calendar.google.com/calendar/render?') &&
    calendarOpen.target === '_blank' && calendarRequests.length === 0);

  check(`${viewport.name}: JavaScript errors 0 so far`,
    report.errors.filter((error) => error.startsWith(`${viewport.name}:`)).length === 0,
    report.errors.filter((error) => error.startsWith(`${viewport.name}:`)).join(' | '));
  await context.close();
}

async function verifyMobileNoEmotion(browser, base) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(`no-emotion: ${error.message}`));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('#bottomMenuTrigger').click();
  check('mobile MENU opens an accessible navigation panel',
    await page.locator('#bottomMenuTrigger').getAttribute('aria-expanded') === 'true' &&
    await page.locator('#headerNavPanel').isVisible());
  await page.locator('#headerNavPanel [data-nav="no-emotion"]').click();
  await page.waitForSelector('.surface[data-surface="10-no-emotion"]');
  check('mobile no-emotion route is real and reachable',
    await page.locator('.surface[data-surface="10-no-emotion"]').count() === 1 &&
    Number(await page.locator('.no-emotion-surface').getAttribute('data-lineup-count')) >= 0);
  await page.screenshot({ path: path.join(EVIDENCE, 'mobile-390-no-emotion.png'), fullPage: true });
  await context.close();
}

async function verifyKeyboardAndMotion(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(`keyboard-motion: ${error.message}`));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const reduced = await page.evaluate(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    surfaceDuration: getComputedStyle(document.querySelector('.surface')).animationDuration
  }));
  check('prefers-reduced-motion is honored', reduced.matches && parseFloat(reduced.surfaceDuration) <= 0.01,
    JSON.stringify(reduced));
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const node = document.activeElement;
    const style = getComputedStyle(node);
    return { tag: node.tagName, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  check('keyboard focus is visible', focus.outlineStyle !== 'none' && parseFloat(focus.outlineWidth) >= 2,
    JSON.stringify(focus));
  await context.close();
}

(async function run() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  report.branch = git(['branch', '--show-current']);
  report.head = git(['rev-parse', 'HEAD']);
  check('exact fresh non-main branch', report.branch === EXPECTED_BRANCH, report.branch);
  check('exact frozen Start HEAD is ancestor', (() => {
    try {
      cp.execFileSync('git', ['merge-base', '--is-ancestor', START, 'HEAD'], { cwd: ROOT });
      return true;
    } catch (error) { return false; }
  })());
  assetIntegrity();
  protectedContracts();

  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(SRC, 'css', 'visual-system-v1.css'), 'utf8');
  const app = fs.readFileSync(path.join(SRC, 'js', 'app.js'), 'utf8');
  check('canonical visual tokens are explicit',
    ['#ffffff', '#17324d', '#1f2a33', '#46b8c8', '#e45f64'].every((token) => css.includes(token)));
  check('self-hosted WOFF2 path remains and no font CDN is added',
    html.includes('./css/visual-system-v1.css') && !/fonts\.googleapis|fonts\.gstatic/.test(html + css));
  check('mobile navigation contains exactly Home/Saved/Menu',
    (html.match(/class="mobile-bottom-nav-item"/g) || []).length === 3);
  check('no-emotion navigation binding is preserved',
    html.includes('data-nav="no-emotion"') && app.includes("document.querySelectorAll('[data-nav=\"no-emotion\"]')"));
  check('obsolete Entrance copy remains absent', !app.includes('選ばず、編集部の仕入れから。'));
  check('Supplemental North Star: legacy watercolor Entrance hero is retired',
    html.includes('runtime_webp/emotion/emotion_hajimu.webp') &&
    app.includes("src: './assets/visual-system-v1/runtime_webp/emotion/emotion_hajimu.webp'") &&
    !app.includes("src: './assets/canonical-m01-w01/m01_hero.webp'"));

  const { server, base } = await start(0);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });
  try {
    for (const viewport of [
      { width: 320, height: 720, name: 'mobile-320', mobile: true },
      { width: 390, height: 844, name: 'mobile-390', mobile: true },
      { width: 430, height: 932, name: 'mobile-430', mobile: true },
      { width: 1200, height: 900, name: 'desktop-1200', mobile: false },
      { width: 1440, height: 1000, name: 'desktop-1440', mobile: false }
    ]) {
      await runViewport(browser, base, viewport);
    }
    await verifyMobileNoEmotion(browser, base);
    await verifyKeyboardAndMotion(browser, base);
  } finally {
    await browser.close();
    server.close();
  }

  check('browser JavaScript errors = 0', report.errors.length === 0, report.errors.join(' | '));
  report.results = results;
  report.summary = {
    pass: results.filter((result) => result.pass).length,
    fail: results.filter((result) => !result.pass).length
  };
  fs.writeFileSync(path.join(EVIDENCE, 'visual-system-v1-qa.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`\n${report.summary.pass}/${results.length} PASS`);
  process.exitCode = report.summary.fail ? 1 : 0;
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
