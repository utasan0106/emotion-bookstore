/* =============================================================================
 * Release Closure — runtime certification
 * 実行: node verify/release_closure_runtime_cert.js
 * -----------------------------------------------------------------------------
 * 8棚 x 390/430/1440 の実ブラウザで次を確認する:
 *  - 各棚 exactly 1件の Outing card と一行の公式導入
 *  - Detail の読み順 title -> 公式説明 -> なぜこの棚 -> 実用情報 -> Action
 *  - 出典表示と公式リンクの描画
 *  - 横方向 overflow / clipping 0
 *  - third-party network request 0
 * screenshots は v3-prototype/.rc-evidence/screens/ に保存する。
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const SHELVES = [
  ['心が弾む', 'チームラボボーダレス'],
  ['心があたたまる', '東京おもちゃ美術館'],
  ['惹かれる', 'ザ・ペーパーログ：膜と核'],
  ['沈む', '東京都復興記念館'],
  ['ざわつく', 'TOPコレクション 明日の食卓'],
  ['ぶつかる', '80 GRAPHIC TRIALS'],
  ['身を引く', '文喫 六本木'],
  ['まだ名前がない', '新宿御苑']
];
const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '1440x1000', width: 1440, height: 1000 }
];
const OUT = path.resolve(__dirname, '..', '.rc-evidence', 'screens');
fs.mkdirSync(OUT, { recursive: true });

async function waitSurface(page, name, timeout = 8000) {
  /* 固定 wait ではなく surface 遷移そのものを待つ。 */
  try {
    await page.waitForFunction(
      (expected) => {
        const el = document.querySelector('.surface');
        return el && el.getAttribute('data-surface') === expected;
      }, name, { timeout });
    return true;
  } catch (error) { return false; }
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail: String(detail || '') });
  if (!ok) console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

(async () => {
  const { server, base } = await start(4390);
  const browser = await chromium.launch();
  const netLog = [];

  for (const vp of VIEWPORTS) {
    for (const [shelf, expectedTitle] of SHELVES) {
      /* 棚ごとに新しい context を使い、保存済み session state の漏れを防ぐ。 */
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      context.on('request', (r) => {
        const u = r.url();
        if (!u.startsWith(base) && !u.startsWith('data:')) netLog.push(vp.name + ' ' + u);
      });
      const page = await context.newPage();
      await page.goto(base);
      await waitSurface(page, '01-entrance');
      await page.locator('.cta-primary').click();
      await waitSurface(page, '02-emotion');
      await page.locator(`button:has-text("${shelf}")`).first().click();
      await waitSurface(page, '03-understanding');
      const surfU = await page.locator('.surface').first().getAttribute('data-surface');
      check(`${vp.name} ${shelf} understanding`, surfU === '03-understanding', surfU);
      await page.screenshot({ path: `${OUT}/${vp.name}_${shelf}_03understanding.png`, fullPage: true });

      // proceed to discovery
      const cta = page.locator('.surface button').filter({ hasText: /寄り道|見る/ }).last();
      await cta.click();
      await waitSurface(page, '04-discovery');
      const surfD = await page.locator('.surface').first().getAttribute('data-surface');
      check(`${vp.name} ${shelf} discovery`, surfD === '04-discovery', surfD);

      const cardTitle = await page.locator('.real-discovery-card .card-title').first().textContent().catch(() => null);
      check(`${vp.name} ${shelf} card title exact`, cardTitle === expectedTitle, `${cardTitle}`);
      const cardCount = await page.locator('.real-discovery-card').count();
      check(`${vp.name} ${shelf} exactly one outing card`, cardCount === 1, `${cardCount}`);
      const officialLine = await page.locator('.real-discovery-official').first().textContent().catch(() => null);
      check(`${vp.name} ${shelf} card official summary present`, !!officialLine && officialLine.length > 5, `${officialLine}`);
      await page.screenshot({ path: `${OUT}/${vp.name}_${shelf}_04discovery.png`, fullPage: true });

      // open detail
      const detailBtn = page.locator('.real-discovery-actions button', { hasText: '詳しく見る' }).first();
      const btnTexts = (await page.locator('.real-discovery-actions button').allTextContents()).join(' | ');
      await detailBtn.click();
      await waitSurface(page, '05-experience-detail');
      let surfX = await page.locator('.surface').first().getAttribute('data-surface');
      if (surfX !== '05-experience-detail') {
        const p2 = page.locator('.surface button').filter({ hasText: /詳しく|この体験を見る|進む/ }).first();
        if (await p2.count()) { await p2.click(); await waitSurface(page, '05-experience-detail'); }
        surfX = await page.locator('.surface').first().getAttribute('data-surface');
      }
      check(`${vp.name} ${shelf} detail reached`, surfX === '05-experience-detail', `${surfX} | actions=${btnTexts}`);

      if (surfX === '05-experience-detail') {
        // reader order check
        const order = await page.evaluate(() => {
          const s = document.querySelector('.surface');
          const marks = [];
          s.querySelectorAll('h1, h2, .detail-official-attribution, .detail-official-provenance, .detail-actions, .place-detail-access').forEach((el) => {
            if (el.matches('h1')) marks.push('TITLE');
            else if (el.matches('.detail-official-attribution')) marks.push('ATTRIB');
            else if (el.matches('.detail-official-provenance')) marks.push('SOURCE');
            else if (el.matches('.detail-actions')) marks.push('ACTIONS');
            else if (el.matches('.place-detail-access')) marks.push('FACTS');
            else if (el.textContent.trim() === 'どんな場所か') marks.push('OFFICIAL');
            else if (el.textContent.trim() === 'なぜ、この棚に？') marks.push('WHY');
          });
          return marks;
        });
        const idx = (m) => order.indexOf(m);
        check(`${vp.name} ${shelf} order TITLE<OFFICIAL<WHY`,
          idx('TITLE') >= 0 && idx('OFFICIAL') > idx('TITLE') && idx('WHY') > idx('OFFICIAL'), order.join('>'));
        check(`${vp.name} ${shelf} order WHY<FACTS<ACTIONS`,
          idx('FACTS') > idx('WHY') && idx('ACTIONS') > idx('FACTS'), order.join('>'));
        check(`${vp.name} ${shelf} attribution + source rendered`,
          idx('ATTRIB') > 0 && idx('SOURCE') > idx('ATTRIB'), order.join('>'));

        const srcHost = await page.locator('.detail-official-source-link').first().getAttribute('href');
        const actHost = expectedTitle;
        check(`${vp.name} ${shelf} source link https official`, /^https:\/\//.test(srcHost || ''), srcHost);

        // overflow / clipping
        const overflow = await page.evaluate(() => {
          const bad = [];
          document.querySelectorAll('.surface *').forEach((el) => {
            if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible') {
              bad.push((el.className || el.tagName) + ':' + el.scrollWidth + '>' + el.clientWidth);
            }
          });
          return bad.slice(0, 4);
        });
        check(`${vp.name} ${shelf} no horizontal overflow`, overflow.length === 0, overflow.join(','));
        const bodyScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
        check(`${vp.name} ${shelf} page does not scroll horizontally`, bodyScroll);

        await page.screenshot({ path: `${OUT}/${vp.name}_${shelf}_05detail.png`, fullPage: true });
      }
      await page.close();
      await context.close();
    }
  }
  check('zero third-party network requests', netLog.length === 0, netLog.slice(0, 5).join(' '));
  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  fs.writeFileSync(path.resolve(__dirname, '..', '.rc-evidence', 'runtime_cert.json'), JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
