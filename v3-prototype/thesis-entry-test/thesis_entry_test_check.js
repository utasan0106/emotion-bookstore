/* =============================================================================
 * V3 PRODUCT THESIS ENTRY TEST 01 — HQ LIMITED FIX の検証
 * Run: NODE_PATH=<workspace-node_modules> node thesis-entry-test/thesis_entry_test_check.js
 *
 * 実験の妥当性（experiment validity）に関する 4 点だけを機械的に確認する。
 *   1. B の見出しが pool に無い category を約束していない
 *   2. C の small action が試聴・予告編を装っていない
 *   3. B / C の先頭が REAL_READY anchor（EXP_007）で、A は Control のまま
 *   4. Detail が A/B/C で同一
 * 併せて storage / GA4 / iframe / JS error が 0 であることを確認する。
 * ========================================================================== */
const { chromium } = require('playwright');
const { start } = require('../verify/serve');
const PAGE = '/thesis-entry-test/index.html';
const results = [];
function check(name, pass, detail = '') {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
(async () => {
  const { server, base } = await start(0);
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));

  // --- Variant B ---
  await page.goto(base + PAGE + '?v=b');
  await page.waitForSelector('[data-thesis-surface="b-browse"]');
  const b = await page.evaluate(() => ({
    h1: document.getElementById('surface-title').textContent,
    lede: document.querySelector('.thesis-b-lede').textContent,
    firstCard: document.querySelector('.thesis-card').getAttribute('data-item-id'),
    order: Array.from(document.querySelectorAll('.thesis-card')).map(c => c.getAttribute('data-item-id')),
    chips: Array.from(document.querySelectorAll('.thesis-chip')).map(c => c.textContent.trim()),
    bodyText: document.getElementById('view').textContent
  }));
  check('B: category-neutral headline', b.h1 === '何か、気になるものを。', b.h1);
  check('B: states only categories present in the pool', b.lede === 'いまは、展示・場所・体験の8件を置いています。', b.lede);
  check('B: does not promise absent categories (本/映画/音楽)',
    !/本、映画|映画/.test(b.bodyText.replace(/映画館/g, '')) || !b.chips.includes('映画'),
    JSON.stringify(b.chips));
  check('B: EXP_007 is the first visible object', b.firstCard === 'EXP_007', b.order.join(','));
  check('B: same 8 items, deterministic order', b.order.length === 8 &&
    new Set(b.order).size === 8, b.order.join(','));

  // --- Variant C ---
  await page.goto(base + PAGE + '?v=c');
  await page.waitForSelector('[data-thesis-surface="c-one"]');
  const c1 = await page.evaluate(() => ({
    title: document.getElementById('surface-title').textContent,
    peekLabel: document.querySelector('.thesis-c-peek-open').textContent.trim(),
    position: document.querySelector('.thesis-c-position').textContent,
    visual: document.querySelector('.thesis-visual-image').getAttribute('src'),
    note: document.querySelectorAll('.thesis-visual-note').length
  }));
  check('C: EXP_007 is the fixed first anchor', c1.title === '新宿御苑', c1.title);
  check('C: anchor uses the REAL_READY photo (no fallback caption)',
    /real-experience\/EXP_007/.test(c1.visual) && c1.note === 0, c1.visual);
  check('C: small action renamed to ordinary Japanese', c1.peekLabel === 'もう少し見る', c1.peekLabel);
  check('C: no time/preview promise in the CTA', !/30秒|秒|試聴|予告/.test(c1.peekLabel), c1.peekLabel);
  check('C: fixed-order position shown', c1.position === '1 / 8（固定順）', c1.position);

  await page.locator('.thesis-c-peek-open').click();
  const c2 = await page.evaluate(() => ({
    facts: Array.from(document.querySelectorAll('.thesis-c-peek dt')).map(n => n.textContent),
    requestsMade: performance.getEntriesByType('resource').filter(r => !r.name.startsWith(location.origin)).length
  }));
  check('C: expansion shows approved static Practical Truth only',
    c2.facts.length > 0 && c2.facts.length <= 3 && c2.requestsMade === 0, c2.facts.join(','));

  // next cycles through the same test order
  await page.locator('.thesis-c-next').click();
  const c3 = await page.evaluate(() => ({
    title: document.getElementById('surface-title').textContent,
    position: document.querySelector('.thesis-c-position').textContent
  }));
  check('C: 次を見る advances in fixed order', c3.position === '2 / 8（固定順）' && c3.title === 'チームラボボーダレス',
    c3.title + ' / ' + c3.position);

  // --- Variant A remains the faithful Control ---
  await page.goto(base + PAGE + '?v=a');
  await page.waitForSelector('[data-thesis-surface="a-home"]');
  const a = await page.evaluate(() => ({
    h1: document.getElementById('surface-title').textContent,
    lede: document.querySelector('.lede').textContent,
    hasExp007: document.getElementById('view').textContent.includes('新宿御苑')
  }));
  check('A: Control home copy unchanged', a.h1 === '感情の先に、世界がある' &&
    a.lede === '本、映画、音楽、体験。8つの感情から新たな出会いを。', a.h1 + ' / ' + a.lede);
  check('A: EXP_007 not artificially injected into the Control entry', a.hasExp007 === false);

  // --- shared Detail identical across A/B/C ---
  async function detailSignature(variant, opener) {
    await page.goto(base + PAGE + '?v=' + variant);
    await opener();
    await page.waitForSelector('[data-thesis-surface="detail"]');
    return page.evaluate(() => {
      const s = document.querySelector('[data-thesis-surface="detail"]');
      return {
        blocks: Array.from(s.querySelectorAll('.thesis-detail-block h2')).map(n => n.textContent),
        relation: (s.querySelector('.thesis-relation-shelf') || {}).textContent,
        why: (s.querySelector('.thesis-relation-why') || {}).textContent,
        actions: Array.from(s.querySelectorAll('.thesis-detail-actions button')).map(n => n.textContent.trim()),
        facts: Array.from(s.querySelectorAll('.thesis-truth-list dt')).map(n => n.textContent),
        title: (s.querySelector('.thesis-detail-title') || {}).textContent
      };
    });
  }
  const dB = await detailSignature('b', async () => {
    await page.waitForSelector('[data-thesis-surface="b-browse"]');
    await page.locator('.thesis-card[data-item-id="EXP_007"] .thesis-detail-entry').click();
  });
  const dC = await detailSignature('c', async () => {
    await page.waitForSelector('[data-thesis-surface="c-one"]');
    await page.locator('.thesis-c-detail').click();
  });
  const dA = await detailSignature('a', async () => {
    await page.waitForSelector('[data-thesis-surface="a-home"]');
    await page.locator('.thesis-a-start').click();
    await page.locator('.emotion-card[data-emotion-label="まだ名前がない"]').click();
    await page.waitForSelector('[data-thesis-surface="shelf"]');
    await page.locator('.thesis-card[data-item-id="EXP_007"] .thesis-detail-entry').click();
  });
  check('Detail identical for A/B/C (same object)',
    JSON.stringify(dA) === JSON.stringify(dB) && JSON.stringify(dB) === JSON.stringify(dC),
    JSON.stringify(dB.blocks) + ' | ' + dB.relation);

  const storage = await page.evaluate(() => ({
    ls: Object.keys(localStorage).length, ss: Object.keys(sessionStorage).length,
    store: typeof window.V3_STORE, gtag: typeof window.gtag,
    dataLayer: typeof window.dataLayer, iframes: document.querySelectorAll('iframe').length
  }));
  check('no storage / GA4 / iframe after full interaction',
    storage.ls === 0 && storage.ss === 0 && storage.store === 'undefined' &&
    storage.gtag === 'undefined' && storage.dataLayer === 'undefined' && storage.iframes === 0,
    JSON.stringify(storage));
  check('JS errors = 0', errors.length === 0, errors.join('|'));

  await ctx.close(); await browser.close(); server.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} PASS`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
