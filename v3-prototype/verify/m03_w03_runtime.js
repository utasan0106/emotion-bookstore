/* =============================================================================
 * V3 M03/W03 runtime evidence targets (uses existing Playwright environment)
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const REPO = path.resolve(__dirname, '../..');
const OUT = path.join(REPO, 'outputs/V3_M03_W03_CANONICAL_REBUILD_2026-08-21/screenshots');
const consoleErrors = [];

const targets = [
  { name: 'M03_1024x1536_candidate1', width: 1024, height: 1536, candidate: 0 },
  { name: 'M03_1024x1536_candidate2', width: 1024, height: 1536, candidate: 1 },
  { name: 'M03_1024x1536_candidate3', width: 1024, height: 1536, candidate: 2 },
  { name: 'M03_390x844', width: 390, height: 844, candidate: 0 },
  { name: 'M03_430x932', width: 430, height: 932, candidate: 0 },
  { name: 'M03_768x1024', width: 768, height: 1024, candidate: 0 },
  { name: 'W03_1536x1024_closed', width: 1536, height: 1024, candidate: 0 },
  { name: 'W03_1536x1024_open', width: 1536, height: 1024, candidate: 0, menu: true },
  { name: 'W03_1536x960_sanity', width: 1536, height: 960, candidate: 0 }
];

async function enterDiscovery(page, candidate) {
  await page.getByRole('button', { name: /はじめる/ }).first().click();
  await page.getByRole('button', { name: /ざわつく。/ }).click();
  await page.waitForTimeout(160);
  await page.getByRole('button', { name: '3つ見てみる' }).click();
  for (let i = 0; i < candidate; i += 1) {
    await page.getByRole('button', { name: '今回は違う' }).click();
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await start(0);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const target of targets) {
      const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => consoleErrors.push(error.message));
      await page.goto(server.url, { waitUntil: 'networkidle' });
      await enterDiscovery(page, target.candidate);
      if (target.menu) await page.getByRole('button', { name: 'MENU' }).click();
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      if (overflow.scrollWidth > overflow.clientWidth) throw new Error(`${target.name}: horizontal overflow`);
      await page.screenshot({ path: path.join(OUT, target.name + '.png'), fullPage: true });
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await enterDiscovery(page, 0);
    await page.getByRole('button', { name: '写真2を表示' }).click();
    await page.getByRole('button', { name: '公式サイトを見る' }).click();
    const liveText = await page.locator('#live').textContent();
    if (!/Prototypeでは開きません/.test(liveText || '')) throw new Error('PROTOTYPE_EXTERNAL_LINK_STUB feedback missing');
    await page.getByRole('button', { name: '詳細を見る' }).first().click();
    await page.keyboard.press('Tab');
    await page.close();

    if (consoleErrors.length) throw new Error('console errors: ' + consoleErrors.join(' | '));
    console.log(`PASS ${targets.length} screenshot targets; console error 0; overflow 0`);
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
