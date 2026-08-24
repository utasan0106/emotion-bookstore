#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, '.rc-evidence', 'founder-review-ux-patch');
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MOBILE_SAFARI_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const results = [];
const report = { generatedAt: new Date().toISOString(), viewports: {}, errors: [] };

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function openMenu(page) {
  const trigger = page.locator('#headerMenuTrigger');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
}

async function reachDiscovery(page) {
  await page.locator('.entrance-route-shelf').click();
  await page.waitForSelector('.surface[data-surface="02-emotion"]');
  await page.locator('.emotion-card').first().click();
  await page.waitForSelector('.understanding-shelf-identity .display');
  await page.locator('.understanding-outcome-column .btn-primary').click();
  await page.waitForSelector('.real-discovery-card');
}

async function metrics(page, width) {
  return page.evaluate((desktop) => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const title = document.querySelector('.understanding-shelf-identity .display');
    const titleStyle = title ? getComputedStyle(title) : null;
    return {
      width: innerWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      surface: rect('.surface'),
      detail: rect('.place-detail'),
      loop: rect('.entrance .loop'),
      hero: rect('.hero-img'),
      cta: rect('.entrance-route-shelf'),
      titleStyle: titleStyle ? {
        family: titleStyle.fontFamily,
        size: titleStyle.fontSize,
        weight: titleStyle.fontWeight,
        lineHeight: titleStyle.lineHeight,
        spacing: titleStyle.letterSpacing
      } : null,
      documentFonts: document.fonts.status,
      desktop
    };
  }, width >= 1200);
}

(async function run() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const { server, base } = await start(0);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });

  try {
    for (const viewport of [
      { width: 390, height: 844, name: 'mobile-390', mobile: true },
      { width: 430, height: 932, name: 'mobile-430', mobile: true },
      { width: 1200, height: 900, name: 'desktop-1200', mobile: false },
      { width: 1440, height: 1000, name: 'desktop-1440', mobile: false }
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        userAgent: viewport.mobile ? MOBILE_SAFARI_UA : undefined,
        hasTouch: viewport.mobile,
        isMobile: viewport.mobile,
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo'
      });
      const page = await context.newPage();
      const thirdParty = [];
      const calendarRequests = [];
      page.on('pageerror', (error) => report.errors.push(`${viewport.name}: ${error.message}`));
      page.on('request', (request) => {
        try {
          const url = new URL(request.url());
          if (url.hostname !== '127.0.0.1') thirdParty.push(request.url());
          if (url.hostname === 'calendar.google.com') calendarRequests.push(request.url());
        } catch (error) { /* non-URL request */ }
      });

      await page.goto(base + '/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const entranceMetric = await metrics(page, viewport.width);
      report.viewports[viewport.name] = { entrance: entranceMetric };
      check(`${viewport.name}: no horizontal overflow`, entranceMetric.overflow === 0);
      check(`${viewport.name}: self-hosted fonts finish loaded`, entranceMetric.documentFonts === 'loaded');
      if (viewport.mobile) {
        check(`${viewport.name}: concise first view only before lower steps`,
          entranceMetric.hero.bottom < viewport.height && entranceMetric.cta.bottom < viewport.height &&
          entranceMetric.loop.top >= viewport.height - 1,
          `hero=${entranceMetric.hero.bottom.toFixed(1)} cta=${entranceMetric.cta.bottom.toFixed(1)} loop=${entranceMetric.loop.top.toFixed(1)}`);
      } else {
        check(`${viewport.name}: desktop copy exact`,
          (await page.locator('#surface-title').textContent()).replace(/\s/g, '') === '感情の先に、世界がある' &&
          (await page.locator('.entrance .lede').textContent()).replace(/\s/g, '') === '本、映画、音楽、体験。8つの感情から新たな出会いを。');
      }
      await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-entrance.png`), fullPage: true });

      await page.locator('.entrance-route-shelf').click();
      await page.waitForSelector('.emotion-grid');
      check(`${viewport.name}: eight Emotion shelves remain`, await page.locator('.emotion-card').count() === 8);
      await page.locator('.emotion-card').first().click();
      await page.waitForSelector('.understanding-shelf-identity .display');
      const shelfMetric = await metrics(page, viewport.width);
      report.viewports[viewport.name].shelf = shelfMetric;
      if (viewport.mobile) {
        check(`${viewport.name}: Shelf Detail type is balanced`, shelfMetric.titleStyle.size === '20px' &&
          shelfMetric.titleStyle.weight === '500' && shelfMetric.titleStyle.lineHeight === '29px',
          JSON.stringify(shelfMetric.titleStyle));
        check(`${viewport.name}: in-service Shelf back is explicit`,
          (await page.locator('.stepbar-back').innerText()).trim() === '感情の棚へ戻る' &&
          (await page.locator('.stepbar-back').boundingBox()).height >= 44);
      }
      await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-shelf-detail.png`), fullPage: true });

      await page.locator('.understanding-outcome-column .btn-primary').click();
      await page.waitForSelector('.real-discovery-card');
      check(`${viewport.name}: Discovery image has no duplicate type overlay`,
        await page.locator('.real-experience-category-label').count() === 0);
      check(`${viewport.name}: Discovery keeps type in text`,
        /展示|場所|本|映画|音楽|食|イベント|体験/.test(await page.locator('.real-discovery-copy').innerText()));
      check(`${viewport.name}: unsaved state is text plus outline heart`,
        (await page.locator('.real-discovery-interest').innerText()).trim() === '気になる' &&
        await page.locator('.real-discovery-interest').getAttribute('aria-pressed') === 'false');
      await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-discovery.png`), fullPage: true });

      await page.locator('.real-discovery-interest').click();
      await page.waitForFunction(() => document.querySelector('.real-discovery-interest')?.textContent.trim() === '保存済み');
      await page.waitForTimeout(80);
      const savedStyle = await page.evaluate(() => {
        const node = document.querySelector('.real-discovery-interest');
        return {
          color: getComputedStyle(node).color,
          fill: getComputedStyle(node.querySelector('svg path')).fill,
          pressed: node.getAttribute('aria-pressed')
        };
      });
      check(`${viewport.name}: save tap becomes red Saved state`, savedStyle.pressed === 'true' &&
        savedStyle.color === 'rgb(200, 50, 62)' && savedStyle.fill === 'rgb(200, 50, 62)', JSON.stringify(savedStyle));

      await openMenu(page);
      await page.locator('[data-nav="interested"]').click();
      await page.waitForSelector('.interested-item');
      check(`${viewport.name}: saved list has minimum retrieval truth`,
        await page.locator('.interested-item-image').count() === 1 &&
        await page.locator('.interested-item-title').count() === 1 &&
        await page.locator('.interested-item-type').count() === 1 &&
        (await page.locator('.interested-item-actions').innerText()).includes('詳しく見る') &&
        (await page.locator('.interested-item-actions').innerText()).includes('保存を解除'));
      await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-saved-list.png`), fullPage: true });
      await page.locator('.interested-close').click();

      await page.locator('.real-discovery-detail').click();
      await page.waitForSelector('.place-detail');
      const detailMetric = await metrics(page, viewport.width);
      report.viewports[viewport.name].detail = detailMetric;
      check(`${viewport.name}: Detail image has no duplicate type overlay`,
        await page.locator('.real-experience-category-label').count() === 0);
      check(`${viewport.name}: Detail has no empty visible action`, await page.locator('.detail-actions button').evaluateAll((nodes) =>
        nodes.filter((node) => node.getBoundingClientRect().height > 0 && !node.textContent.trim()).length === 0));
      check(`${viewport.name}: Map shares bordered action family`, await page.locator('.detail-utility-action').evaluate((node) => {
        const style = getComputedStyle(node);
        return node.textContent.includes('地図で見る') && style.borderTopStyle !== 'none' && parseFloat(style.borderTopWidth) > 0;
      }));
      if (!viewport.mobile) {
        check(`${viewport.name}: Detail is horizontally centered`,
          Math.abs((detailMetric.detail.left + detailMetric.detail.right) / 2 - viewport.width / 2) <= 1,
          JSON.stringify(detailMetric.detail));
        check(`${viewport.name}: bottom Back is centered`, await page.locator('.detail-bottom-back').evaluate((node) => {
          const box = node.getBoundingClientRect();
          const parent = node.parentElement.getBoundingClientRect();
          return Math.abs((box.left + box.right) / 2 - (parent.left + parent.right) / 2) <= 1;
        }));
      }
      await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-detail.png`), fullPage: true });

      await page.locator('.detail-interest-action').click();
      await page.waitForFunction(() => document.querySelector('.detail-interest-action')?.textContent.trim() === '気になる');
      check(`${viewport.name}: unsave returns outline and text`,
        await page.locator('.detail-interest-action').getAttribute('aria-pressed') === 'false');
      await page.locator('.detail-interest-action').click();
      await page.waitForFunction(() => document.querySelector('.detail-interest-action')?.textContent.trim() === '保存済み');

      await page.locator('.detail-plan-action').click();
      await page.waitForSelector('.plan-form');
      await page.locator('#plan-today').check();
      await page.locator('.plan-form button[type="submit"]').click();
      await page.waitForSelector('.plan-saved-panel');
      await page.evaluate(() => {
        window.__FOUNDER_CALENDAR_OPENS__ = [];
        window.open = function (url, target, features) {
          window.__FOUNDER_CALENDAR_OPENS__.push({ url, target, features });
          return { opener: null };
        };
      });
      check(`${viewport.name}: no Google Calendar request before click`, calendarRequests.length === 0);
      await page.locator('.google-calendar-action').click();
      const calendarOpen = await page.evaluate(() => window.__FOUNDER_CALENDAR_OPENS__[0] || null);
      check(`${viewport.name}: explicit Calendar click builds public event URL`, Boolean(calendarOpen) &&
        calendarOpen.url.startsWith('https://calendar.google.com/calendar/render?') &&
        calendarOpen.target === '_blank' && calendarOpen.features === 'noopener,noreferrer');
      check(`${viewport.name}: Calendar is still navigation-only in QA`, calendarRequests.length === 0);
      await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-plan-saved.png`), fullPage: true });

      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('.return-surface');
      check(`${viewport.name}: next Entrance shows latest saved once`,
        await page.locator('.return-surface').count() === 1 &&
        (await page.locator('.return-surface').innerText()).includes('次に見るために保存したものがあります。'));
      await page.screenshot({ path: path.join(EVIDENCE, `${viewport.name}-one-time-cue.png`), fullPage: true });
      await page.reload({ waitUntil: 'networkidle' });
      check(`${viewport.name}: second Entrance hides already-shown cue`, await page.locator('.return-surface').count() === 0);

      await openMenu(page);
      await page.locator('[data-nav="interested"]').click();
      await page.getByRole('button', { name: '保存を解除' }).click();
      await page.waitForSelector('.interested-layer', { state: 'detached' });
      await openMenu(page);
      await page.locator('[data-nav="interested"]').click();
      await page.waitForSelector('.interested-empty');
      check(`${viewport.name}: saved removal reaches truthful empty state`,
        (await page.locator('.interested-empty').innerText()).includes('保存済みのものは、まだありません。'));

      check(`${viewport.name}: first-party load has no background third-party request`, thirdParty.length === 0,
        thirdParty.join(', '));
      await context.close();
    }

    check('browser JavaScript errors = 0', report.errors.length === 0, report.errors.join(' | '));
  } finally {
    await browser.close();
    server.close();
  }

  report.results = results;
  fs.writeFileSync(path.join(EVIDENCE, 'browser-qa.json'), JSON.stringify(report, null, 2) + '\n');
  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exitCode = failed.length ? 1 : 0;
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
