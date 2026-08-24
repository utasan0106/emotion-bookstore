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
 *  - Emotion Step-1 が 1280x800 / 1440x900 / 1440x1000 / 1920x1080 で
 *    1 viewport に収まる（縦の追加スクロール 0、4x2 の 8棚、44x44 以上）
 * screenshots は v3-prototype/.rc-evidence/screens/ に保存する。
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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

async function settled(page) {
  /* .surface は 160ms の fade-in を持つ。途中で撮ると証跡が薄く写る。 */
  try {
    await page.waitForFunction(() => {
      const running = document.getAnimations().filter((a) => a.playState === 'running');
      return running.length === 0;
    }, null, { timeout: 4000 });
  } catch (error) { /* 動きが終わらない環境でも撮影は続ける */ }
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function tabToText(page, matcher, limit = 60) {
  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate((m) => {
      const node = document.activeElement;
      if (!node || node === document.body) return false;
      const text = (node.textContent || '').trim().replace(/\s+/g, ' ');
      return new RegExp(m).test(text);
    }, matcher);
    if (hit) return true;
  }
  return false;
}

async function focusVisible(page) {
  /* focus ring が視覚的に出ているか（outline か box-shadow のどちらか）。 */
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const cs = getComputedStyle(el);
    const ow = parseFloat(cs.outlineWidth || '0');
    return (cs.outlineStyle !== 'none' && ow > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
  });
}

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
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });
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
      await settled(page);
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
      await settled(page);
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
            else if (['どんな場所か', '公式情報からわかること'].includes(el.textContent.trim())) marks.push('OFFICIAL');
            else if (el.textContent.trim() === 'なぜ、この棚に？') marks.push('WHY');
          });
          return marks;
        });
        const idx = (m) => order.indexOf(m);
        check(`${vp.name} ${shelf} order TITLE<WHY<OFFICIAL`,
          idx('TITLE') >= 0 && idx('WHY') > idx('TITLE') && idx('OFFICIAL') > idx('WHY'), order.join('>'));
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

        await settled(page);
        await page.screenshot({ path: `${OUT}/${vp.name}_${shelf}_05detail.png`, fullPage: true });
      }
      await page.close();
      await context.close();
    }
  }
  /* ------------------------------------------------ Step-1 viewport fit
   * RC Desktop Low-Height Viewport Fit — 2026-08-24
   * Emotion Step-1 の初期状態が 1 viewport に収まることを恒久的に固定する。
   * 低背 desktop で「ほぼ収まる」縦スクロールが再発したら FAIL にする。 */
  const FIT_VIEWPORTS = [
    { name: '1280x800', width: 1280, height: 800 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1440x1000', width: 1440, height: 1000 },
    { name: '1920x1080', width: 1920, height: 1080 }
  ];
  for (const vp of FIT_VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(base);
    await waitSurface(page, '01-entrance');
    await page.locator('.cta-primary').click();
    await waitSurface(page, '02-emotion');
    await settled(page);

    const fit = await page.evaluate(() => {
      const de = document.documentElement;
      const cards = Array.from(document.querySelectorAll('.emotion-card'));
      const rects = cards.map((el) => el.getBoundingClientRect());
      const rows = Array.from(new Set(rects.map((r) => Math.round(r.top))));
      const grid = document.querySelector('.emotion-grid');
      const hidden = [];
      const required = '.emotion-card-label, .emotion-card-description, .emotion-heading,'
        + ' .emotion-support, .emotion-grid-question, .emotion-guidance-copy, .emotion-trust-copy';
      document.querySelectorAll(required).forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
          hidden.push('hidden:' + el.className);
        } else if (el.scrollHeight > el.clientHeight + 1 && cs.overflowY !== 'visible') {
          hidden.push('clipped:' + el.className);
        }
      });
      return {
        extraScroll: Math.max(0, de.scrollHeight - de.clientHeight),
        scrollHeight: de.scrollHeight,
        clientHeight: de.clientHeight,
        horizontal: de.scrollWidth - window.innerWidth,
        cards: cards.length,
        rows: rows.length,
        columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
        smallTargets: rects
          .filter((r) => r.width < 44 || r.height < 44)
          .map((r) => Math.round(r.width) + 'x' + Math.round(r.height)),
        hidden: hidden.slice(0, 4)
      };
    });

    check(`${vp.name} step-1 zero extra vertical scroll`, fit.extraScroll === 0,
      `scrollHeight=${fit.scrollHeight} clientHeight=${fit.clientHeight} extra=${fit.extraScroll}`);
    check(`${vp.name} step-1 keeps the 4x2 eight-shelf grammar`,
      fit.cards === 8 && fit.rows === 2 && fit.columns === 4,
      `cards=${fit.cards} rows=${fit.rows} columns=${fit.columns}`);
    check(`${vp.name} step-1 no required content hidden or clipped`,
      fit.hidden.length === 0, fit.hidden.join(','));
    check(`${vp.name} step-1 shelf hit targets >= 44x44`,
      fit.smallTargets.length === 0, fit.smallTargets.join(','));
    check(`${vp.name} step-1 no horizontal overflow`, fit.horizontal <= 0, `${fit.horizontal}`);

    await page.screenshot({ path: `${OUT}/${vp.name}_02emotion_viewportfit.png` });
    await ctx.close();
  }

  /* ------------------------------------------------ keyboard-only 到達性 */
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(base);
    await waitSurface(page, '01-entrance');
    const steps = [
      ['はじめる|感情の棚を選ぶ', '02-emotion'],
      ['心が弾む', '03-understanding'],
      ['寄り道を見る', '04-discovery'],
      ['詳しく見る', '05-experience-detail'],
      ['日時を決めて予定を残す', '06-plan']
    ];
    let ok = true;
    let ring = true;
    for (const [matcher, expected] of steps) {
      const found = await tabToText(page, matcher);
      if (!found) { ok = false; check(`${vp.name} keyboard focus reaches ${matcher}`, false); break; }
      if (!(await focusVisible(page))) ring = false;
      await page.keyboard.press('Enter');
      if (!(await waitSurface(page, expected))) {
        ok = false;
        const got = await page.locator('.surface').first().getAttribute('data-surface');
        check(`${vp.name} keyboard ${matcher} -> ${expected}`, false, `got ${got}`);
        break;
      }
    }
    check(`${vp.name} keyboard-only Entrance -> Plan reachable`, ok);
    check(`${vp.name} keyboard focus ring visible along the path`, ring);
    await ctx.close();
  }

  check('zero third-party network requests', netLog.length === 0, netLog.slice(0, 5).join(' '));
  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  fs.writeFileSync(path.resolve(__dirname, '..', '.rc-evidence', 'runtime_cert.json'), JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
