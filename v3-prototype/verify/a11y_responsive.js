/* =============================================================================
 * V3 prototype — Accessibility / Responsive 検証
 * 実行: NODE_PATH=/opt/node22/lib/node_modules node verify/a11y_responsive.js
 * ========================================================================== */
const { chromium } = require('playwright');
const { start } = require('./serve');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function tabTo(page, label) {
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate((wanted) => {
      const node = document.activeElement;
      if (!node) return false;
      const text = (node.textContent || '').trim();
      if (text === wanted) return true;
      if (node.getAttribute && node.getAttribute('data-emotion-label') === wanted) return true;
      // radio / checkbox は自身にテキストがないので対応する label で判定する
      if (node.id) {
        const label = document.querySelector('label[for="' + CSS.escape(node.id) + '"]');
        if (label && label.textContent.trim() === wanted) return true;
      }
      return false;
    }, label);
    if (hit) return true;
  }
  return false;
}

(async () => {
  const { server, base } = await start(4174);
  const browser = await chromium.launch();

  /* ---------------------------------------------------------- keyboard only */
  const kb = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await kb.goto(base);
  await kb.waitForSelector('.surface');

  const steps = [
    ['はじめる感情の言葉を選ぶ', '02-emotion'],
    ['ざわつく', '03-understanding'],
    ['3つ見てみる', '04-discovery'],
    ['気になる', '04-discovery'],
    ['気になる', '04-discovery'],
    ['気になる', '04-discovery-review'],
    ['気になる', '04-discovery-review'],
    ['この体験を見てみる', '05-experience-detail'],
    ['この体験を選ぶ', '06-plan']
  ];
  let keyboardOk = true;
  for (const [label, expected] of steps) {
    const found = await tabTo(kb, label);
    if (!found) { keyboardOk = false; console.log('  focus 到達失敗: ' + label); break; }
    await kb.keyboard.press('Enter');
    await kb.waitForTimeout(160);
    const surface = await kb.getAttribute('.surface', 'data-surface');
    if (surface !== expected) { keyboardOk = false; console.log(`  ${label}: ${surface} !== ${expected}`); break; }
  }
  check('keyboard: Entrance → Plan までキーボードのみで到達', keyboardOk);

  // Plan（radio + submit）もキーボードで完了できる
  await tabTo(kb, '今日');
  await kb.keyboard.press('Space');
  await tabTo(kb, '予定を残す');
  await kb.keyboard.press('Enter');
  await kb.waitForTimeout(80);
  check('keyboard: Plan 保存', (await kb.getAttribute('.surface', 'data-surface')) === '06-plan-saved');

  /* ------------------------------------------------------------ focus 可視性 */
  const outline = await kb.evaluate(() => {
    const btn = document.querySelector('.btn');
    btn.focus();
    const style = getComputedStyle(btn, null);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  const focusVisible = await kb.evaluate(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) if (rule.selectorText && rule.selectorText.includes(':focus-visible')) rules.push(rule.cssText);
    }
    return rules.join(' ');
  });
  check('focus: :focus-visible に outline が定義されている',
    focusVisible.includes('outline') && focusVisible.includes('2px'), focusVisible.trim());

  /* --------------------------------------------------- button fallback / semantics */
  await kb.goto(base);
  await kb.waitForSelector('.surface');
  await kb.locator('.cta-primary').click();
  await kb.locator('button:has-text("ざわつく")').click();
  await kb.waitForTimeout(160);
  await kb.locator('button:has-text("3つ見てみる")').click();
  const fallback = await kb.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.m03-decisions button')).map((b) => b.textContent.trim());
    const tags = Array.from(document.querySelectorAll('.m03-decisions button')).map((b) => b.tagName);
    return { labels, tags };
  });
  check('button fallback: swipe と同じ判定が button で可能',
    fallback.labels.join(',') === '今回は違う,気になる' && fallback.tags.every((t) => t === 'BUTTON'),
    fallback.labels.join(','));

  const nonSemantic = await kb.evaluate(() =>
    document.querySelectorAll('div[onclick], span[onclick], [role="button"]:not(button)').length);
  check('semantics: クリック可能な div / span を使っていない', nonSemantic === 0);

  const srLabels = await kb.evaluate(() => ({
    live: !!document.querySelector('[role="status"][aria-live="polite"]'),
    labelled: !!document.querySelector('.surface[aria-labelledby="surface-title"]'),
    card: document.querySelector('.m03-card').getAttribute('aria-label')
  }));
  check('screen reader: live region / surface label / card label',
    srLabels.live && srLabels.labelled && !!srLabels.card, srLabels.card);

  /* -------------------------------------------------------- touch target 44px */
  const small = await kb.evaluate(() =>
    Array.from(document.querySelectorAll('button, input, label')).filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.height < 44;
    }).map((n) => n.textContent.trim() + ':' + Math.round(n.getBoundingClientRect().height)));
  check('touch target: 高さ 44px 未満なし', small.length === 0, small.join(', '));

  /* ------------------------------------------------------------ reduced motion */
  const rm = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await rm.goto(base);
  await rm.waitForSelector('.surface');
  const motion = await rm.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.surface'));
    return { animation: s.animationName, duration: s.animationDuration };
  });
  await rm.locator('.cta-primary').click();
  await rm.locator('button:has-text("ざわつく")').click();
  await rm.waitForTimeout(160);
  await rm.locator('button:has-text("3つ見てみる")').click();
  const card = await rm.locator('.m03-card');
  const box = await card.boundingBox();
  await rm.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await rm.mouse.down();
  await rm.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 4 });
  const transform = await rm.evaluate(() => document.querySelector('.m03-card').style.transform);
  await rm.mouse.up();
  check('reduced motion: surface animation 停止 / drag 中の transform なし',
    (motion.animation === 'none' || motion.duration === '0.001ms') && transform === '',
    `${motion.animation} ${motion.duration} transform="${transform}"`);

  /* -------------------------------------------------------------- responsive */
  const widths = [320, 375, 390, 430, 768, 941, 1199, 1200, 1536];
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(base);
    await page.waitForSelector('.surface');
    const overflow = [];
    const visit = async (label) => {
      const bad = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        body: document.body.scrollWidth > window.innerWidth
      }));
      if (bad.doc || bad.body) overflow.push(label);
    };
    await visit('entrance');
    await page.locator('.cta-primary').click(); await visit('emotion');
    await page.locator('button:has-text("ざわつく")').click();
    await page.waitForTimeout(160); await visit('understanding');
    await page.locator('button:has-text("3つ見てみる")').click(); await visit('discovery');
    await page.locator('button:has-text("気になる")').click();
    await page.locator('button:has-text("気になる")').click();
    await page.locator('button:has-text("気になる")').click(); await visit('review');
    await page.locator('.m04-review-card').first().locator('.m04-keep').click();
    await page.locator('.m04-primary').click(); await visit('detail');
    await page.locator('button:has-text("この体験を選ぶ")').click(); await visit('plan');
    await page.locator('#plan-today').check();
    await page.locator('button:has-text("予定を残す")').click(); await visit('plan-saved');
    await page.locator('button:has-text("入口に戻る")').click(); await visit('entrance-return');
    await page.locator('.return-surface button').click(); await visit('moment');
    await page.locator('button:has-text("残すものがある")').click(); await visit('trace');
    const traceResponsive = await page.evaluate((viewportWidth) => {
      const grid = document.querySelector('.m05-facet-grid');
      const cards = Array.from(document.querySelectorAll('.m05-facet-card label'));
      const traceText = Array.from(document.querySelectorAll('.trace-phase1 p, .trace-phase1 span, .trace-phase1 label, .trace-phase1 button, .trace-phase1 dt, .trace-phase1 dd, .trace-phase1 h1, .trace-phase1 h2'));
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
      const smallTargets = Array.from(document.querySelectorAll('.trace-phase1 button, .m05-facet-card label')).filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.height < 44;
      });
      const minText = traceText.reduce((min, node) => {
        if (!node.textContent.trim() || !node.getBoundingClientRect().height) return min;
        return Math.min(min, parseFloat(getComputedStyle(node).fontSize));
      }, Infinity);
      return {
        columns,
        expectedColumns: viewportWidth <= 374 ? 2 : 3,
        smallTargets: smallTargets.length,
        minText,
        images: document.querySelectorAll('.trace-phase1 img').length,
        mobileCountVisible: viewportWidth < 1200 ? getComputedStyle(document.querySelector('.stepbar-count')).display !== 'none' : true,
        desktopStepVisible: viewportWidth >= 1200 ? getComputedStyle(document.querySelector('.stepbar-step')).display !== 'none' : true,
        desktopCountHidden: viewportWidth >= 1200 ? getComputedStyle(document.querySelector('.stepbar-count')).display === 'none' : true
      };
    }, width);
    check(`Trace responsive ${width}px: columns / targets / type / no image / progress`,
      traceResponsive.columns === traceResponsive.expectedColumns &&
      traceResponsive.smallTargets === 0 && traceResponsive.minText >= 14 && traceResponsive.images === 0 &&
      traceResponsive.mobileCountVisible && traceResponsive.desktopStepVisible && traceResponsive.desktopCountHidden,
      JSON.stringify(traceResponsive));
    // Visual Canonical v0.1 4.2: Body M = 15px / Small label = 12px / 本文は 14px 未満にしない
    const type = await page.evaluate(() => {
      const body = parseFloat(getComputedStyle(document.body).fontSize);
      let min = Infinity, minText = '';
      document.querySelectorAll('p, span, label, button, li, dd, dt, h1, h2, h3').forEach((n) => {
        if (!n.textContent.trim() || !n.getBoundingClientRect().height) return;
        const size = parseFloat(getComputedStyle(n).fontSize);
        if (size < min) { min = size; minText = n.textContent.trim().slice(0, 12); }
      });
      return { body, min, minText };
    });
    check(`responsive ${width}px: 横スクロールなし / body ${type.body}px / 最小 ${type.min}px`,
      overflow.length === 0 && type.body >= 15 && type.min >= 12,
      [overflow.join(','), type.minText].filter(Boolean).join(' | '));
    await page.close();
  }

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
