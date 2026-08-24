/* =============================================================================
 * V3 current-authority Action Destination browser contract
 * 実行: node verify/action_destination_runtime.js（Playwright + Chromium）
 * ========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const { start } = require('./serve');
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail: String(detail || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function toCurrentDetail(page, base) {
  await page.goto(base);
  await page.waitForSelector('.surface[data-surface="01-entrance"]');
  await page.locator('.cta-primary').click();
  await page.waitForSelector('.surface[data-surface="02-emotion"]');
  await page.locator('.emotion-card[data-emotion-label="心が弾む"]').click();
  await page.waitForSelector('.surface[data-surface="03-understanding"]');
  await page.locator('.understanding-outcome-column .btn-primary').click();
  await page.waitForSelector('.real-discovery-card');
  await page.locator('.real-discovery-detail').click();
  await page.waitForSelector('.surface[data-surface="05-experience-detail"]');
}

(async () => {
  const { server, base } = await start(4178);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const routed = [];
  await context.route(/https:\/\/(www\.teamlab\.art|www\.google\.com)\//, async (route) => {
    routed.push({ url: route.request().url(), referer: route.request().headers().referer || '' });
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>approved</title>' });
  });

  const page = await context.newPage();
  await toCurrentDetail(page, base);
  check('E missing AD resolves dead affordance 0 in runtime module',
    await page.evaluate(() => window.V3_ACTION_DESTINATION.actionsForExperience({}).length === 0));
  check('current approved Detail renders primary + Maps only',
    await page.locator('[data-action-destination="primary"]').count() === 1 &&
    await page.locator('[data-action-destination="maps"]').count() === 1);
  check('external request before explicit action = 0', routed.length === 0);

  await page.evaluate(() => {
    window.__externalOpenEvents = [];
    window.V3_ACTION_DESTINATION.onExternalOpen((event) => window.__externalOpenEvents.push(event));
  });

  const popupPromise = page.waitForEvent('popup');
  await page.locator('[data-action-destination="primary"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  check('A current valid HTTPS destination opens in new context',
    popup.url() === 'https://www.teamlab.art/jp/e/tokyo/');
  check('F opened page has no opener', await popup.evaluate(() => window.opener === null));
  await popup.close();

  const mapsPopupPromise = page.waitForEvent('popup');
  await page.locator('[data-action-destination="maps"]').click();
  const mapsPopup = await mapsPopupPromise;
  await mapsPopup.waitForLoadState('domcontentloaded');
  const mapsUrl = new URL(mapsPopup.url());
  check('G/H Maps destination present and origin absent',
    mapsUrl.searchParams.get('destination') === '東京都港区虎ノ門5-9 麻布台ヒルズ ガーデンプラザB B1' &&
    !mapsUrl.searchParams.has('origin'));
  await mapsPopup.close();

  const hookEvents = await page.evaluate(() => window.__externalOpenEvents);
  check('analytics-ready hook only emits allowed identifiers', hookEvents.length === 2 &&
    Object.keys(hookEvents[0]).sort().join(',') === 'actionType,destinationClass,experienceId');
  check('noreferrer on outbound requests', routed.length === 2 &&
    routed.every((request) => request.referer === ''), JSON.stringify(routed));

  await browser.close();
  server.close();
  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
