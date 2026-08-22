/* =============================================================================
 * V3 prototype — M01/W01 99_v3 canonical geometry / font contract
 * 実行: NODE_PATH=/opt/node22/lib/node_modules node verify/m01_geometry.js
 * ========================================================================== */
const { chromium } = require('playwright');
const { start } = require('./serve');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function mobileMeasure(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const h1 = document.querySelector('.display');
    const h1s = getComputedStyle(h1);
    const steps = Array.from(document.querySelectorAll('.loop-step')).map((n) => n.getBoundingClientRect());
    return {
      viewport: { width: innerWidth, height: innerHeight },
      entrance: rect('.entrance'), hero: rect('.hero-img'), lockup: rect('.brand-lockup'),
      h1: { ...rect('.display'), fontSize: parseFloat(h1s.fontSize), family: h1s.fontFamily,
        weight: h1s.fontWeight, lines: Math.round(h1.getBoundingClientRect().height / parseFloat(h1s.lineHeight)) },
      cta: { ...rect('.cta-primary'), bg: getComputedStyle(document.querySelector('.cta-primary')).backgroundColor },
      loop: rect('.loop'), trust: rect('.trust'),
      cols: getComputedStyle(document.querySelector('.loop')).gridTemplateColumns.split(' ').filter(Boolean).length,
      sameRow: steps.every((r) => Math.abs(r.top - steps[0].top) < 1),
      connectors: document.querySelectorAll('.loop-connector').length,
      step3: {
        title: document.querySelector('.loop-step:nth-child(3) .loop-title .copy-mobile').textContent,
        note: document.querySelector('.loop-step:nth-child(3) .loop-note .copy-mobile').textContent
      },
      trustText: document.querySelector('.trust-mobile').textContent.replace(/\s+/g, ''),
      bodyFamily: getComputedStyle(document.body).fontFamily,
      fontsLoaded: document.fonts.check('400 24px "Noto Serif JP"', '感じていることから') &&
        document.fonts.check('400 16px "Noto Sans JP"', '登録不要・この端末'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
}

(async () => {
  const { server, base } = await start(4186);
  const browser = await chromium.launch();

  for (const t of [
    { width: 941, height: 1672, name: 'M01 native' },
    { width: 390, height: 844, name: 'M01 responsive 390' },
    { width: 430, height: 932, name: 'M01 responsive 430' },
    { width: 768, height: 1024, name: 'M01 tablet 768' }
  ]) {
    const page = await browser.newPage({ viewport: { width: t.width, height: t.height } });
    await page.goto(base);
    await page.waitForSelector('.surface');
    await page.evaluate(() => document.fonts.ready);
    const m = await mobileMeasure(page);

    check(`${t.name}: full-width shell / hero`,
      Math.abs(m.entrance.width - t.width) <= 1 && Math.abs(m.hero.width - t.width) <= 1,
      `shell ${m.entrance.width.toFixed(1)} / hero ${m.hero.width.toFixed(1)}`);
    check(`${t.name}: H1 2行・Noto Serif JP 400`,
      m.h1.lines === 2 && m.h1.weight === '400' && m.h1.family.startsWith('"Noto Serif JP"'),
      `${m.h1.fontSize}px / ${m.h1.lines} lines / ${m.h1.family} ${m.h1.weight}`);
    check(`${t.name}: CTA centered / canonical navy / >=76px`,
      Math.abs((m.cta.left + m.cta.right) / 2 - t.width / 2) <= 1 &&
      m.cta.bg === 'rgb(13, 35, 57)' && m.cta.height >= 76,
      `${m.cta.left.toFixed(1)}..${m.cta.right.toFixed(1)} h=${m.cta.height.toFixed(1)} ${m.cta.bg}`);
    check(`${t.name}: Core Loop 4列・同一行・connector 3`,
      m.cols === 4 && m.sameRow && m.connectors === 3,
      `${m.cols} cols / sameRow=${m.sameRow} / connectors=${m.connectors}`);
    check(`${t.name}: Step 3 exact M01 copy`,
      m.step3.title === '外へ出る' && m.step3.note === '実際に触れてみる',
      `${m.step3.title} / ${m.step3.note}`);
    check(`${t.name}: M01 Trust exact copy`,
      m.trustText === '登録不要・入力内容はこの端末を基本に扱います', m.trustText);
    check(`${t.name}: Noto Sans JP / Serif JP loaded・overflow 0`,
      m.bodyFamily.startsWith('"Noto Sans JP"') && m.fontsLoaded && !m.overflow,
      `${m.bodyFamily} / loaded=${m.fontsLoaded} / overflow=${m.overflow}`);

    if (t.width === 941) {
      check('M01 native: Canonical major geometry',
        Math.abs(m.hero.height - 680) <= 2 &&
        Math.abs(m.lockup.width - 402) <= 2 &&
        Math.abs(m.cta.width - 672) <= 2 &&
        m.trust.bottom >= 1580 && m.trust.bottom <= 1700,
        `hero ${m.hero.height.toFixed(1)} / lockup ${m.lockup.width.toFixed(1)} / CTA ${m.cta.width.toFixed(1)} / trust bottom ${m.trust.bottom.toFixed(1)}`);
    }
    await page.close();
  }

  const w = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  await w.goto(base);
  await w.waitForSelector('.surface');
  await w.evaluate(() => document.fonts.ready);
  const d = await w.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const desktopText = (selector) => document.querySelector(selector).textContent.replace(/\s+/g, '');
    return {
      header: rect('.site-header'), logo: rect('.site-logo img'), heroWrap: rect('.entrance-hero'),
      hero: rect('.hero'), h1: rect('.display'), cta: rect('.cta-primary'), loop: rect('.loop'), trust: rect('.trust'),
      h1Family: getComputedStyle(document.querySelector('.display')).fontFamily,
      bodyFamily: getComputedStyle(document.body).fontFamily,
      loopCols: getComputedStyle(document.querySelector('.loop')).gridTemplateColumns.split(' ').filter(Boolean).length,
      connectors: document.querySelectorAll('.loop-connector').length,
      step3: {
        title: desktopText('.loop-step:nth-child(3) .loop-title .copy-desktop'),
        note: desktopText('.loop-step:nth-child(3) .loop-note .copy-desktop')
      },
      trustHeadings: Array.from(document.querySelectorAll('.trust-heading')).map((n) => n.textContent),
      trustSupport: Array.from(document.querySelectorAll('.trust-support')).map((n) => n.textContent),
      fontsLoaded: document.fonts.check('400 48px "Noto Serif JP"', '感じていることから') &&
        document.fonts.check('400 16px "Noto Sans JP"', '登録不要・完全に非公開'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  check('W01 native: header 106 / logo 326 / hero 528',
    Math.abs(d.header.height - 106) <= 1 && Math.abs(d.logo.width - 326) <= 1 &&
    Math.abs(d.heroWrap.height - 528) <= 1 && Math.abs(d.hero.height - 528) <= 1,
    `header ${d.header.height} / logo ${d.logo.width} / hero ${d.hero.height}`);
  check('W01 native: H1 x≈66 / CTA 358x77 / Core Loop 276',
    Math.abs(d.h1.left - 66) <= 2 && Math.abs(d.cta.width - 358) <= 2 &&
    Math.abs(d.cta.height - 77) <= 2 && Math.abs(d.loop.height - 276) <= 2,
    `H1 x=${d.h1.left} / CTA ${d.cta.width}x${d.cta.height} / loop ${d.loop.height}`);
  check('W01 native: hero integrated right mass / Trust 99',
    d.hero.left >= 488 && d.hero.left <= 492 && Math.abs(d.trust.height - 99) <= 1,
    `hero left ${d.hero.left} / trust ${d.trust.height}`);
  check('W01 native: Core Loop exact Step 3 / 4列 / connector 3',
    d.loopCols === 4 && d.connectors === 3 && d.step3.title === '実際に触れる' &&
    d.step3.note === '読む・観る・聴く・訪れる。外の世界とつながる',
    `${d.loopCols} / ${d.connectors} / ${d.step3.title} / ${d.step3.note}`);
  check('W01 native: Trust exact 3 headings + support',
    d.trustHeadings.join('|') === '登録不要・完全に非公開|AIは使用しません|記録はまずこの端末へ' &&
    d.trustSupport.join('|') ===
      'あなたの記録はあなただけのものです。|本文をAIが読むことはありません。|大切な記録は、あなたの端末に保存されます。');
  check('W01 native: self-host fonts loaded / overflow 0',
    d.h1Family.startsWith('"Noto Serif JP"') && d.bodyFamily.startsWith('"Noto Sans JP"') &&
    d.fontsLoaded && !d.overflow,
    `${d.h1Family} / ${d.bodyFamily} / loaded=${d.fontsLoaded} / overflow=${d.overflow}`);

  await w.close();
  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
