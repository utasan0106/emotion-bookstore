#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FIXTURE = '/verify/s1a_runtime_fixture.html?s1b=1&shelf=atatamaru';
const results = [];
const errors = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function enterShelf(page, base, pathName) {
  await page.goto(base + pathName);
  await page.waitForSelector('.surface[data-surface="01-entrance"]');
  await page.click('.cta-primary');
  await page.waitForSelector('.surface[data-surface="02-emotion"]');
  await page.click('.emotion-card[data-emotion-label="心があたたまる"]');
  await page.waitForSelector('.surface[data-surface="03-understanding"]');
}

async function installWriteAudit(page) {
  return page.evaluate(async () => {
    const audit = {
      stateWrites: [], preferenceWrites: [], analyticsCalls: [],
      beforeState: await window.V3_STORE.load(),
      beforeInterested: await window.V3_STORE.loadInterested()
    };
    const save = window.V3_STORE.save;
    window.V3_STORE.save = function () {
      audit.stateWrites.push(JSON.parse(JSON.stringify(arguments[0])));
      return save.apply(this, arguments);
    };
    ['saveInterested', 'removeInterested'].forEach((name) => {
      const original = window.V3_STORE[name];
      window.V3_STORE[name] = function () {
        audit.preferenceWrites.push({ name, args: Array.from(arguments) });
        return original.apply(this, arguments);
      };
    });
    if (window.V3_ANALYTICS && typeof window.V3_ANALYTICS.emitOnce === 'function') {
      const emitOnce = window.V3_ANALYTICS.emitOnce;
      window.V3_ANALYTICS.emitOnce = function () {
        audit.analyticsCalls.push(Array.from(arguments));
        return emitOnce.apply(this, arguments);
      };
    }
    window.__S1B_WRITE_AUDIT__ = audit;
    return { beforeState: audit.beforeState, beforeInterested: audit.beforeInterested };
  });
}

async function writeAuditSnapshot(page) {
  return page.evaluate(async () => {
    const audit = window.__S1B_WRITE_AUDIT__;
    return {
      stateWrites: audit.stateWrites.slice(),
      preferenceWrites: audit.preferenceWrites.slice(),
      analyticsCalls: audit.analyticsCalls.slice(),
      beforeState: audit.beforeState,
      afterState: await window.V3_STORE.load(),
      beforeInterested: audit.beforeInterested,
      afterInterested: await window.V3_STORE.loadInterested()
    };
  });
}

async function startDiscovery(page) {
  await page.click('.understanding-outcome-column .btn-primary');
  await page.waitForSelector('.surface[data-surface="04-discovery"] .real-discovery-card');
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
    view: document.getElementById('view').scrollWidth - document.getElementById('view').clientWidth
  }));
}

(async function run() {
  const { server, base } = await start(0);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });

  try {
    for (const count of [0, 1, 2, 3]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`count-${count}: ${error.message}`));
      await enterShelf(page, base, `${FIXTURE}&count=${count}`);
      const visibleCount = Number(await page.locator('[data-deck-count]').getAttribute('data-deck-count'));
      check(`runtime ${count}: truthful candidate count`, visibleCount === count, String(visibleCount));
      check(`runtime ${count}: Context is optional/skippable`,
        await page.locator('.s1b-context-fit[data-context-storage="memory-only"]').count() === (count ? 1 : 0));
      if (count === 0) {
        check('runtime 0: no force-fill/start CTA',
          await page.locator('.understanding-outcome-column .btn-primary').count() === 0);
        await context.close();
        continue;
      }

      await startDiscovery(page);
      const title = await page.locator('.real-discovery-card .card-title').textContent();
      check(`runtime ${count}: exactly one object card renders`,
        await page.locator('.real-discovery-card').count() === 1, title);
      check(`runtime ${count}: Discovery Primary is informational`,
        (await page.locator('.real-discovery-primary').textContent()).trim() === '詳しく見る');
      check(`runtime ${count}: no pass/review semantics`,
        (await page.locator('#view').textContent()).includes('今回は違う') === false &&
        await page.locator('.row-actions button[aria-pressed]').count() === 0);
      check(`runtime ${count}: external real-world CTA stays out of Discovery`,
        await page.locator('.real-discovery-actions [data-action-destination]').count() === 0);

      await installWriteAudit(page);
      if (count > 1) {
        await page.click('.deck-next-action');
        await page.waitForTimeout(40);
        check(`runtime ${count}: Next advances without decision`,
          (await page.locator('.real-discovery-counter').textContent()).trim() === `2 / ${count}`);
        await page.click('.deck-previous-action');
        await page.waitForTimeout(40);
        check(`runtime ${count}: Previous restores first object`,
          (await page.locator('.real-discovery-counter').textContent()).trim() === `1 / ${count}`);

        const card = page.locator('.real-discovery-card');
        const box = await card.boundingBox();
        await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.45);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.45, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);
        check(`runtime ${count}: swipe is navigation only`,
          (await page.locator('.real-discovery-counter').textContent()).trim() === `2 / ${count}`);
        while (await page.locator('.deck-next-action[data-deck-navigation="next"]').count()) {
          await page.click('.deck-next-action[data-deck-navigation="next"]');
          await page.waitForTimeout(30);
        }
      }

      await page.click('.real-discovery-primary');
      await page.waitForSelector('.surface[data-surface="05-experience-detail"]');
      check(`runtime ${count}: Detail has type-specific Practical Truth`,
        await page.locator('.detail-practical-truth .detail-truth-list > div').count() >= 2);
      check(`runtime ${count}: official real-world Action is in Detail`,
        await page.locator('.detail-actions [data-action-destination="primary"]').count() === 1);
      const detailText = await page.locator('#view').textContent();
      check(`runtime ${count}: Official fact and Editorial Why are separate`,
        detailText.includes('公式情報からわかること') && detailText.includes('なぜ、この棚に？') &&
        await page.locator('.detail-editorial-reason').count() === 1 &&
        await page.locator('.detail-practical-truth .trust-cue-official').count() === 1 &&
        await page.locator('.detail-editorial-reason .trust-cue-official').count() === 0);
      await page.click('.detail-actions .btn-text:last-child');
      await page.waitForSelector('.surface[data-surface="04-discovery"]');

      while (await page.locator('.deck-next-action[data-deck-navigation="next"]').count()) {
        await page.click('.deck-next-action[data-deck-navigation="next"]');
      }
      await page.click('.deck-finish-action');
      await page.waitForSelector('.surface[data-surface="04-discovery-none"]');
      check(`runtime ${count}: finite completion is quiet and existing`,
        (await page.locator('#view').textContent()).includes('この棚は、ここまでです。'));
      check(`runtime ${count}: legacy Review never renders`,
        await page.locator('[data-surface="04-discovery-review"], [data-surface="09-personalized-discovery-review"]').count() === 0);
      const audit = await writeAuditSnapshot(page);
      check(`runtime ${count}: browsing writes no durable preference/Interested`,
        audit.stateWrites.length === 0 && audit.preferenceWrites.length === 0 &&
        JSON.stringify(audit.beforeState) === JSON.stringify(audit.afterState) &&
        JSON.stringify(audit.beforeInterested) === JSON.stringify(audit.afterInterested),
        JSON.stringify({ stateWrites: audit.stateWrites.length, preferenceWrites: audit.preferenceWrites.length }));
      await context.close();
    }

    const errorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const errorPage = await errorContext.newPage();
    errorPage.on('pageerror', (error) => errors.push(`registry-error: ${error.message}`));
    await enterShelf(errorPage, base, `${FIXTURE}&count=3&mode=error`);
    check('registry/error fixture fails closed separately from zero',
      await errorPage.locator('[data-deck-state="error"]').count() === 1 &&
      await errorPage.locator('[data-deck-count="0"]').count() === 0);
    await errorContext.close();

    const contextContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const contextPage = await contextContext.newPage();
    contextPage.on('pageerror', (error) => errors.push(`context: ${error.message}`));
    await enterShelf(contextPage, base, `${FIXTURE}&count=3`);
    const contextUrl = contextPage.url();
    await installWriteAudit(contextPage);
    check('Context skip preserves broader 3-object fixture',
      Number(await contextPage.locator('[data-deck-count]').getAttribute('data-deck-count')) === 3);
    await contextPage.click('.s1b-context-fit > summary');
    await contextPage.selectOption('[data-context-field="budgetBand"]', 'under-3000');
    await contextPage.waitForTimeout(100);
    const appliedContextCount = Number(await contextPage.locator('[data-deck-count]').getAttribute('data-deck-count'));
    check('Context apply filters only factual feasibility',
      appliedContextCount === 2 &&
      (await contextPage.locator('.s1b-context-result').textContent()).includes('3件中2件'),
      JSON.stringify({ appliedContextCount, result: await contextPage.locator('.s1b-context-result').textContent() }));
    check('Context materially removed candidates with visible reasons',
      await contextPage.locator('.s1b-context-reasons li').count() === 1);
    const contextAudit = await writeAuditSnapshot(contextPage);
    check('Context changes write no store/Interested/analytics state',
      contextAudit.stateWrites.length === 0 && contextAudit.preferenceWrites.length === 0 &&
      contextAudit.analyticsCalls.length === 0 &&
      JSON.stringify(contextAudit.beforeState) === JSON.stringify(contextAudit.afterState) &&
      JSON.stringify(contextAudit.beforeInterested) === JSON.stringify(contextAudit.afterInterested));
    check('Context never enters URL/hash/query/History payload',
      contextPage.url() === contextUrl &&
      await contextPage.evaluate(() => history.state && Object.keys(history.state).join(',') === 'v3Screen'));
    await contextPage.click('.s1b-context-clear');
    await contextPage.waitForFunction(() => document.querySelector('[data-deck-count]')?.getAttribute('data-deck-count') === '3');
    check('Context clear restores broader original set',
      Number(await contextPage.locator('[data-deck-count]').getAttribute('data-deck-count')) === 3);
    await contextPage.click('.s1b-context-fit > summary');
    await contextPage.selectOption('[data-context-field="budgetBand"]', 'under-3000');
    await contextPage.reload();
    await contextPage.waitForSelector('.surface[data-surface="01-entrance"]');
    await contextPage.click('.cta-primary');
    await contextPage.waitForSelector('.surface[data-surface="02-emotion"]');
    await contextPage.click('.emotion-card[data-emotion-label="心があたたまる"]');
    await contextPage.waitForSelector('.surface[data-surface="03-understanding"]');
    check('Context is in-memory only and resets on reload',
      Number(await contextPage.locator('[data-deck-count]').getAttribute('data-deck-count')) === 3 &&
      await contextPage.locator('[data-context-field="budgetBand"]').inputValue() === '');
    await contextContext.close();

    const interestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const interestPage = await interestContext.newPage();
    interestPage.on('pageerror', (error) => errors.push(`interested: ${error.message}`));
    await enterShelf(interestPage, base, `${FIXTURE}&count=1`);
    await startDiscovery(interestPage);
    await interestPage.click('.real-discovery-interest');
    await interestPage.waitForFunction(() => document.querySelector('.real-discovery-interest')?.getAttribute('aria-pressed') === 'true');
    check('only explicit Interested action saves durably',
      await interestPage.evaluate(async () => (await window.V3_STORE.loadInterested()).items.length === 1));
    await interestPage.reload();
    await interestPage.waitForSelector('.surface[data-surface="01-entrance"]');
    check('Interested survives reload',
      await interestPage.evaluate(async () => (await window.V3_STORE.loadInterested()).items.length === 1));
    await interestPage.click('.cta-primary');
    await interestPage.waitForSelector('.surface[data-surface="02-emotion"]');
    await interestPage.click('.emotion-card[data-emotion-label="心があたたまる"]');
    await interestPage.waitForSelector('.surface[data-surface="03-understanding"]');
    await startDiscovery(interestPage);
    await interestPage.click('.real-discovery-interest');
    await interestPage.waitForFunction(async () => (await window.V3_STORE.loadInterested()).items.length === 0);
    await interestPage.reload();
    await interestPage.waitForSelector('.surface[data-surface="01-entrance"]');
    check('explicit Interested removal survives reload',
      await interestPage.evaluate(async () => (await window.V3_STORE.loadInterested()).items.length === 0));
    await interestContext.close();

    const videoRequests = [];
    const videoContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const videoPage = await videoContext.newPage();
    videoPage.on('pageerror', (error) => errors.push(`video: ${error.message}`));
    videoPage.on('request', (request) => {
      if (/youtube-nocookie\.com|player\.vimeo\.com/.test(request.url())) videoRequests.push(request.url());
    });
    await videoPage.route(/youtube-nocookie\.com|player\.vimeo\.com/, (route) => route.abort());
    await enterShelf(videoPage, base, `${FIXTURE}&count=3&editorial=video`);
    check('video first paint third-party player request = 0', videoRequests.length === 0, videoRequests.join(', '));
    check('video is a separate editorial slot, not a fourth deck candidate',
      Number(await videoPage.locator('[data-deck-count]').getAttribute('data-deck-count')) === 3 &&
      await videoPage.locator('[data-video-separate-from-deck="true"]').count() === 1);
    check('Featured fixture displays new-to-shelf badge without weekly claim',
      await videoPage.locator('.s1b-newly-shelved').count() === 1 &&
      !(await videoPage.locator('.s1b-featured-card').textContent()).includes('今週'));
    await installWriteAudit(videoPage);
    await videoPage.click('.s1b-video-activate');
    await videoPage.waitForSelector('.s1b-video-mount iframe');
    const iframeAttrs = await videoPage.locator('.s1b-video-mount iframe').evaluate((frame) => ({
      src: frame.getAttribute('src'), width: frame.getAttribute('width'), height: frame.getAttribute('height'),
      allow: frame.getAttribute('allow')
    }));
    const videoBox = await videoPage.locator('.s1b-video-mount').boundingBox();
    check('video loads only after explicit click with autoplay 0',
      videoRequests.length >= 1 && !/autoplay/i.test(iframeAttrs.src), JSON.stringify(iframeAttrs));
    check('video native non-16:9 ratio is preserved',
      iframeAttrs.width === '1440' && iframeAttrs.height === '1080' &&
      Math.abs((videoBox.width / videoBox.height) - (4 / 3)) < 0.01,
      JSON.stringify({ width: videoBox.width, height: videoBox.height }));
    const videoAudit = await writeAuditSnapshot(videoPage);
    check('video view/play writes no durable preference/Interested',
      videoAudit.stateWrites.length === 0 && videoAudit.preferenceWrites.length === 0 &&
      JSON.stringify(videoAudit.beforeState) === JSON.stringify(videoAudit.afterState) &&
      JSON.stringify(videoAudit.beforeInterested) === JSON.stringify(videoAudit.afterInterested));
    await videoPage.click('.understanding-outcome-column .btn-primary');
    await videoPage.waitForSelector('.surface[data-surface="04-discovery"]');
    check('video stops/is removed on Product navigation',
      await videoPage.locator('.s1b-video-mount iframe').count() === 0);
    await videoContext.close();

    for (const viewport of [
      { name: '390x844', width: 390, height: 844 },
      { name: '430x932', width: 430, height: 932 },
      { name: 'desktop', width: 1280, height: 900 }
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`${viewport.name}: ${error.message}`));
      await enterShelf(page, base, `${FIXTURE}&count=3&editorial=video`);
      const understandingOverflow = await noHorizontalOverflow(page);
      await startDiscovery(page);
      const discoveryOverflow = await noHorizontalOverflow(page);
      const targets = await page.locator('.real-discovery-actions .btn, .deck-navigation .btn').evaluateAll((nodes) =>
        nodes.map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))
      );
      await page.click('.real-discovery-primary');
      await page.waitForSelector('.surface[data-surface="05-experience-detail"]');
      const detailOverflow = await noHorizontalOverflow(page);
      check(`${viewport.name}: no horizontal overflow`,
        [understandingOverflow, discoveryOverflow, detailOverflow].every((metric) =>
          metric.doc <= 1 && metric.body <= 1 && metric.view <= 1),
        JSON.stringify({ understandingOverflow, discoveryOverflow, detailOverflow }));
      check(`${viewport.name}: navigation/action targets remain >=44px`,
        targets.length > 0 && targets.every((target) => target.height >= 44 && target.width >= 44),
        JSON.stringify(targets));
      await context.close();
    }

    const reducedContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, reducedMotion: 'reduce'
    });
    const reducedPage = await reducedContext.newPage();
    reducedPage.on('pageerror', (error) => errors.push(`reduced-motion: ${error.message}`));
    await enterShelf(reducedPage, base, `${FIXTURE}&count=3`);
    for (let index = 0; index < 20; index += 1) {
      if (await reducedPage.locator('.s1b-context-fit > summary').evaluate((node) => node === document.activeElement)) break;
      await reducedPage.keyboard.press('Tab');
    }
    const contextSummaryFocus = await reducedPage.locator('.s1b-context-fit > summary').evaluate((node) => ({
      active: node === document.activeElement,
      outlineStyle: getComputedStyle(node).outlineStyle,
      outlineWidth: getComputedStyle(node).outlineWidth
    }));
    check('Context disclosure has visible keyboard focus',
      contextSummaryFocus.active && contextSummaryFocus.outlineStyle !== 'none' &&
        parseFloat(contextSummaryFocus.outlineWidth) >= 2,
      JSON.stringify(contextSummaryFocus));
    await reducedPage.keyboard.press('Enter');
    await reducedPage.keyboard.press('Tab');
    const contextSelectFocus = await reducedPage.locator('#context-area').evaluate((node) => ({
      active: node === document.activeElement,
      outlineStyle: getComputedStyle(node).outlineStyle,
      outlineWidth: getComputedStyle(node).outlineWidth
    }));
    check('Context control has visible keyboard focus',
      contextSelectFocus.active && contextSelectFocus.outlineStyle !== 'none' &&
        parseFloat(contextSelectFocus.outlineWidth) >= 2,
      JSON.stringify(contextSelectFocus));
    await startDiscovery(reducedPage);
    for (let index = 0; index < 20; index += 1) {
      if (await reducedPage.locator('.deck-next-action').evaluate((node) => node === document.activeElement)) break;
      await reducedPage.keyboard.press('Tab');
    }
    const focusStyle = await reducedPage.locator('.deck-next-action').evaluate((node) => ({
      active: node === document.activeElement,
      outlineStyle: getComputedStyle(node).outlineStyle,
      outlineWidth: getComputedStyle(node).outlineWidth
    }));
    check('keyboard focus remains visibly indicated',
      focusStyle.active && focusStyle.outlineStyle !== 'none' && parseFloat(focusStyle.outlineWidth) >= 2,
      JSON.stringify(focusStyle));
    await reducedPage.keyboard.press('Enter');
    await reducedPage.waitForTimeout(40);
    check('keyboard activates finite Next navigation',
      (await reducedPage.locator('.real-discovery-counter').textContent()).trim() === '2 / 3');
    const reducedAnimation = await reducedPage.locator('.real-discovery-card').evaluate((node) => ({
      name: getComputedStyle(node).animationName,
      duration: getComputedStyle(node).animationDuration
    }));
    check('reduced motion preserves finite navigation with bounded fade',
      /s1a-deck-fade-in|none/.test(reducedAnimation.name) &&
      ['0.12s', '0s'].includes(reducedAnimation.duration), JSON.stringify(reducedAnimation));
    await reducedContext.close();

    const zoomContext = await browser.newContext({ viewport: { width: 780, height: 1688 } });
    const zoomPage = await zoomContext.newPage();
    zoomPage.on('pageerror', (error) => errors.push(`zoom: ${error.message}`));
    await enterShelf(zoomPage, base, `${FIXTURE}&count=3`);
    await zoomPage.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const zoomOverflow = await noHorizontalOverflow(zoomPage);
    check('200% zoom practical sanity has no horizontal overflow',
      zoomOverflow.doc <= 1 && zoomOverflow.body <= 1 && zoomOverflow.view <= 1,
      JSON.stringify(zoomOverflow));
    await zoomContext.close();

    const liveContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const livePage = await liveContext.newPage();
    const liveThirdParty = [];
    livePage.on('pageerror', (error) => errors.push(`live-product: ${error.message}`));
    livePage.on('request', (request) => {
      if (/youtube-nocookie\.com|player\.vimeo\.com/.test(request.url())) liveThirdParty.push(request.url());
    });
    await enterShelf(livePage, base, '/');
    check('actual Product runtime mounts only current approved one-object deck',
      Number(await livePage.locator('[data-deck-count]').getAttribute('data-deck-count')) === 1);
    check('actual Product live Featured/video/daily activation remains zero',
      await livePage.locator('.s1b-editorial-foundation').count() === 0 && liveThirdParty.length === 0);
    await startDiscovery(livePage);
    await livePage.click('.real-discovery-primary');
    await livePage.waitForSelector('.surface[data-surface="05-experience-detail"]');
    check('actual Product Detail follows type-specific S1B presentation',
      await livePage.locator('.detail-practical-truth').count() === 1 &&
      await livePage.locator('.detail-primary-action').count() === 1);
    await liveContext.close();

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
