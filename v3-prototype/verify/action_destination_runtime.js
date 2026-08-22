/* =============================================================================
 * V3 Release Muscle Sprint 01 — Action Destination browser contract
 * 実行: node verify/action_destination_runtime.js（既存Playwrightがある環境のみ）
 * ========================================================================== */
const { chromium } = require('playwright');
const { start } = require('./serve');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail: String(detail || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function toDetail(page) {
  await page.locator('.cta-primary').click();
  await page.locator('button:has-text("ざわつく")').click();
  await page.locator('button:has-text("3つ見てみる")').click();
  await page.locator('button:has-text("気になる")').click();
  await page.locator('button:has-text("今回は違う")').click();
  await page.locator('button:has-text("今回は違う")').click();
  await page.locator('.m04-primary').click();
}

(async () => {
  const { server, base } = await start(4178);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const routed = [];
  await context.route(/https:\/\/(approved\.example|www\.google\.com)\//, async (route) => {
    routed.push({ url: route.request().url(), referer: route.request().headers().referer || '' });
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>approved</title>' });
  });

  const missing = await context.newPage();
  await missing.goto(base);
  await toDetail(missing);
  check('E missing AD → dead affordance 0', await missing.locator('[data-action-destination]').count() === 0);
  await missing.close();

  const page = await context.newPage();
  await page.goto(base);
  await page.evaluate(() => {
    const experience = window.V3_DATA.EXPERIENCES.find((item) => item.id === 'E01');
    experience.actionDestination = {
      type: 'official_page', nextAction: 'visit', officiality: 'official_designated',
      url: 'https://approved.example/experience', label: '公式ページを見る'
    };
    experience.physicalDestination = { approved: true, address: '東京都千代田区丸の内1-1' };
    window.__externalOpenEvents = [];
    window.V3_ACTION_DESTINATION.onExternalOpen((event) => window.__externalOpenEvents.push(event));
  });
  await toDetail(page);

  check('approved AD renders primary + secondary only',
    await page.locator('[data-action-destination="primary"]').count() === 1 &&
    await page.locator('[data-action-destination="maps"]').count() === 1);
  const popupPromise = page.waitForEvent('popup');
  await page.locator('[data-action-destination="primary"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  check('A valid HTTPS destination opens in new context', popup.url() === 'https://approved.example/experience');
  check('F opened page has no opener', await popup.evaluate(() => window.opener === null));
  await popup.close();

  const mapsPopupPromise = page.waitForEvent('popup');
  await page.locator('[data-action-destination="maps"]').click();
  const mapsPopup = await mapsPopupPromise;
  await mapsPopup.waitForLoadState('domcontentloaded');
  const mapsUrl = new URL(mapsPopup.url());
  check('G/H Maps destination present and origin absent',
    mapsUrl.searchParams.get('destination') === '東京都千代田区丸の内1-1' &&
    !mapsUrl.searchParams.has('origin'));
  await mapsPopup.close();

  const hookEvents = await page.evaluate(() => window.__externalOpenEvents);
  check('analytics hook only emits allowed identifiers', hookEvents.length === 2 &&
    Object.keys(hookEvents[0]).sort().join(',') === 'actionType,destinationClass,experienceId');
  check('noreferrer on outbound requests', routed.length === 2 && routed.every((request) => request.referer === ''), JSON.stringify(routed));

  await browser.close();
  server.close();
  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
