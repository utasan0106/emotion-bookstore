/* =============================================================================
 * V3 prototype — Accessibility / Responsive 検証
 * 実行: NODE_PATH=/opt/node22/lib/node_modules node verify/a11y_responsive.js
 * ========================================================================== */
const fs = require('fs');
const { chromium } = require('playwright');
const { start } = require('./serve');
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });

  /* ---------------------------------------------------------- keyboard only */
  const kbContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const kb = await kbContext.newPage();
  await kb.goto(base);
  await kb.waitForSelector('.surface');

  const steps = [
    ['はじめる', '02-emotion'],
    ['ざわつく', '03-understanding'],
    ['1つの寄り道を見る', '04-discovery'],
    ['詳しく見る', '05-experience-detail'],
    ['日時を決めて予定を残す', '06-plan']
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
  await kbContext.close();

  /* --------------------------------------------------- button fallback / semantics */
  const fbContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fb = await fbContext.newPage();
  await fb.goto(base);
  await fb.waitForSelector('.surface');
  await fb.locator('.entrance-route-shelf').click();
  await fb.locator('button:has-text("ざわつく")').click();
  await fb.waitForTimeout(160);
  await fb.locator('.understanding-outcome-column .btn-primary').click();
  const fallback = await fb.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.real-discovery-actions button')).map((b) => b.textContent.trim());
    const tags = Array.from(document.querySelectorAll('.real-discovery-actions button')).map((b) => b.tagName);
    return { labels, tags };
  });
  check('button fallback: 詳細 / Interested は native button で操作可能',
    fallback.labels.includes('詳しく見る') && fallback.labels.includes('気になる') &&
      fallback.tags.every((t) => t === 'BUTTON'),
    fallback.labels.join(','));

  const nonSemantic = await fb.evaluate(() =>
    document.querySelectorAll('div[onclick], span[onclick], [role="button"]:not(button)').length);
  check('semantics: クリック可能な div / span を使っていない', nonSemantic === 0);

  const srLabels = await fb.evaluate(() => ({
    live: !!document.querySelector('[role="status"][aria-live="polite"]'),
    labelled: !!document.querySelector('.surface[aria-labelledby="surface-title"]'),
    card: document.querySelector('.real-discovery-card').getAttribute('aria-label')
  }));
  check('screen reader: live region / surface label / card label',
    srLabels.live && srLabels.labelled && !!srLabels.card, srLabels.card);

  /* -------------------------------------------------------- touch target 44px */
  const small = await fb.evaluate(() =>
    Array.from(document.querySelectorAll('button, input, label')).filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.height < 44;
    }).map((n) => n.textContent.trim() + ':' + Math.round(n.getBoundingClientRect().height)));
  check('touch target: 高さ 44px 未満なし', small.length === 0, small.join(', '));
  await fbContext.close();

  /* ------------------------------------------------------------ reduced motion */
  const rmContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const rm = await rmContext.newPage();
  await rm.goto(base);
  await rm.waitForSelector('.surface');
  const motion = await rm.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.surface'));
    return { animation: s.animationName, duration: s.animationDuration };
  });
  await rm.locator('.entrance-route-shelf').click();
  await rm.locator('button:has-text("ざわつく")').click();
  await rm.waitForTimeout(160);
  await rm.locator('.understanding-outcome-column .btn-primary').click();
  await rm.locator('.real-discovery-detail').click();
  check('reduced motion: surface animation 停止 / finite navigation は動作',
    (motion.animation === 'none' || motion.duration === '0.001ms') &&
      (await rm.getAttribute('.surface', 'data-surface')) === '05-experience-detail',
    `${motion.animation} ${motion.duration}`);
  await rmContext.close();

  /* -------------------------------------------------------------- responsive */
  const widths = [320, 375, 390, 430, 768, 941, 1199, 1200, 1536];
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
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
    await page.locator('.entrance-route-shelf').click(); await visit('emotion');
    await page.locator('button:has-text("ざわつく")').click();
    await page.waitForTimeout(160); await visit('understanding');
    await page.locator('.understanding-outcome-column .btn-primary').click(); await visit('discovery');
    await page.locator('.real-discovery-detail').click(); await visit('detail');
    await page.locator('.detail-plan-action').click(); await visit('plan');
    await page.locator('#plan-today').check();
    await page.locator('button:has-text("予定を残す")').click(); await visit('plan-saved');
    await page.locator('button:has-text("入口に戻る")').click(); await visit('entrance-return');
    const navigation = await page.evaluate(() => {
      const menu = document.getElementById('headerMenuTrigger');
      const rect = menu.getBoundingClientRect();
      return { visible: rect.width > 0 && rect.height > 0, height: rect.height,
        expanded: menu.getAttribute('aria-expanded') };
    });
    check(`responsive ${width}px: service MENU is reachable`,
      navigation.visible && navigation.height >= 44 && navigation.expanded === 'false',
      JSON.stringify(navigation));
    // Visual Canonical v0.1 4.2: Body M = 15px / Small label = 12px / 本文は 14px 未満にしない
    const type = await page.evaluate(() => {
      const body = parseFloat(getComputedStyle(document.body).fontSize);
      let min = Infinity, minText = '';
      document.querySelectorAll('p, span, label, button, li, dd, dt, h1, h2, h3').forEach((n) => {
        if (!n.textContent.trim() || !n.getBoundingClientRect().height ||
            n.closest('[aria-hidden="true"]') || n.closest('.sr-only')) return;
        const size = parseFloat(getComputedStyle(n).fontSize);
        if (size < min) { min = size; minText = n.textContent.trim().slice(0, 12); }
      });
      return { body, min, minText };
    });
    check(`responsive ${width}px: 横スクロールなし / body ${type.body}px / 最小 ${type.min}px`,
      overflow.length === 0 && type.body >= 15 && type.min >= 12,
      [overflow.join(','), type.minText].filter(Boolean).join(' | '));
    await context.close();
  }

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
