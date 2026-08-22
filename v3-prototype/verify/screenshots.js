/* =============================================================================
 * V3 M01/W01 protected + M02/W02 canonical screenshot evidence
 * 実行: NODE_PATH=/opt/node22/lib/node_modules node verify/screenshots.js
 * 出力: outputs/V3_M02_W02_CANONICAL_REBUILD_2026-08-21/screenshots/
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const REPO = path.resolve(__dirname, '..', '..');
const OUT = path.join(REPO, 'outputs', 'V3_M02_W02_CANONICAL_REBUILD_2026-08-21', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const targets = [
  { name: 'W01_1536x1024', width: 1536, height: 1024, surface: 'entrance' },
  { name: 'M01_941x1672', width: 941, height: 1672, surface: 'entrance' },
  { name: 'M01_390x844', width: 390, height: 844, surface: 'entrance' },
  { name: 'M01_430x932', width: 430, height: 932, surface: 'entrance' },
  { name: 'M01_tablet_768x1024', width: 768, height: 1024, surface: 'entrance' },
  { name: 'W01_sanity_1536x960', width: 1536, height: 960, surface: 'entrance' },
  { name: 'M02_1024x1536_unselected', width: 1024, height: 1536, surface: 'emotion' },
  { name: 'M02_1024x1536_selected', width: 1024, height: 1536, surface: 'emotion', selected: true },
  { name: 'M02_390x844', width: 390, height: 844, surface: 'emotion' },
  { name: 'M02_430x932', width: 430, height: 932, surface: 'emotion' },
  { name: 'M02_768x1024', width: 768, height: 1024, surface: 'emotion' },
  { name: 'W02_1536x1024_closed', width: 1536, height: 1024, surface: 'emotion' },
  { name: 'W02_1536x1024_open', width: 1536, height: 1024, surface: 'emotion', menuOpen: true },
  { name: 'W02_1536x1024_selected', width: 1536, height: 1024, surface: 'emotion', selected: true },
  { name: 'W02_1536x960_sanity', width: 1536, height: 960, surface: 'emotion' }
];

(async () => {
  const { server, base } = await start(4176);
  const browser = await chromium.launch();
  const computed = [];
  const requestLog = [];
  const consoleLog = [];

  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
    const requests = [];
    const consoleErrors = [];
    page.on('request', (request) => requests.push({ method: request.method(), url: request.url() }));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    /* selected Evidenceでは実際のcard clickを使い、120msの既存routeだけを
       browser harness側で保留する。Production UI/query parameterは追加しない。 */
    if (target.selected) {
      await page.addInitScript(() => {
        const realSetTimeout = window.setTimeout.bind(window);
        window.setTimeout = (fn, delay, ...args) => delay === 120 ? 0 : realSetTimeout(fn, delay, ...args);
      });
    }

    await page.goto(base);
    await page.waitForSelector('.surface');
    await page.evaluate(() => document.fonts.ready);

    if (target.surface === 'emotion') {
      await page.locator('.cta-primary').click();
      await page.waitForSelector('.emotion-selection');
      if (target.selected) {
        await page.locator('.emotion-card').first().click();
        await page.waitForSelector('.emotion-card[aria-pressed="true"]');
      }
      if (target.menuOpen) {
        await page.locator('#headerMenuTrigger').click();
        await page.waitForSelector('#headerNavPanel:not([hidden])');
      }
    }

    computed.push(await page.evaluate((name) => {
      const style = (selector) => {
        const n = document.querySelector(selector);
        if (!n) return null;
        const s = getComputedStyle(n);
        const r = n.getBoundingClientRect();
        return {
          selector, rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          display: s.display, fontFamily: s.fontFamily, fontSize: s.fontSize,
          fontWeight: s.fontWeight, lineHeight: s.lineHeight,
          color: s.color, backgroundColor: s.backgroundColor, border: s.border
        };
      };
      return {
        target: name,
        viewport: { width: innerWidth, height: innerHeight },
        surface: document.querySelector('.surface').getAttribute('data-surface'),
        selectedCount: document.querySelectorAll('.emotion-card[aria-pressed="true"]').length,
        headerVisible: !!document.querySelector('.site-header') && getComputedStyle(document.querySelector('.site-header')).display !== 'none',
        menuExpanded: document.getElementById('headerMenuTrigger').getAttribute('aria-expanded'),
        fonts: {
          serifLoaded: document.fonts.check('400 38px "Noto Serif JP"', 'いまの気持ちに'),
          sansLoaded: document.fonts.check('400 16px "Noto Sans JP"', '感情を選ぶ')
        },
        styles: [style('body'), style('.emotion-heading'), style('.emotion-grid'),
          style('.emotion-card'), style('.emotion-card[aria-pressed="true"]'),
          style('.emotion-footer'), style('.site-header')].filter(Boolean),
        document: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
        }
      };
    }, target.name));

    requestLog.push({
      target: target.name,
      requests,
      externalFontRequests: requests.filter((r) => /fonts\.(googleapis|gstatic)\.com/i.test(r.url)),
      localFontRequests: requests.filter((r) => /\/assets\/fonts\//.test(r.url)),
      networkRequestsOutsideLocalOrigin: requests.filter((r) => !r.url.startsWith(base))
    });
    consoleLog.push({ target: target.name, errors: consoleErrors });

    const file = path.join(OUT, target.name + '_actual_fullpage.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log('saved ' + path.relative(REPO, file));
    await page.close();
  }

  fs.writeFileSync(path.join(OUT, 'computed_styles.json'), JSON.stringify(computed, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'font_request_log.json'), JSON.stringify(requestLog, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'console_errors.json'), JSON.stringify(consoleLog, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'comparison_targets.json'), JSON.stringify({
    M02: 'handoff/canonical/M02_Emotion.png',
    W02: 'handoff/canonical/W02_Emotion.png',
    required: ['actual full screenshot', 'canonical/actual side-by-side', 'overlay', 'pixel diff']
  }, null, 2) + '\n');
  await browser.close();
  server.close();
})();
