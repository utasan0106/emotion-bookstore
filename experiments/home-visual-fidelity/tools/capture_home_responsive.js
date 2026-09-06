#!/usr/bin/env node
/* HOME responsive capture — review tooling only (Round 4), not runtime.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_responsive.js \
 *       --out experiments/home-visual-fidelity/responsive-round-4
 *
 * Same capture host / font gate as capture_home_853.js (see ../README.md):
 * dsf 1, reduced motion, ONE viewport sized to document.scrollHeight. For each
 * breakpoint it writes HOME_<w>.png plus measurements (overflow, section rects,
 * grid columns, thread / reality layout, tap targets, CDP platform fonts), and
 * the extra states the Brief asks for: 390 menu open, 200 % zoom (720 CSS px at
 * dsf 2 = a 1440 window at 200 %), reduced-motion vs no-preference at 390, and
 * keyboard tab order at 390 / 1440. Emits responsive_report.json and
 * BREAKPOINT_TABLE.md. The 853 capture here is a convenience; the authoritative
 * Golden regression stays capture_home_853.js + sha256.
 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(__dirname, '..', 'responsive-round-4')));
const GOLDEN = path.join(ROOT, 'experiments/home-visual-fidelity/asset-round-3/HOME_CURRENT_853_R3_FINAL2.png');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serve() {
  const s = http.createServer((q, r) => {
    const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    r.end(fs.readFileSync(f));
  });
  return new Promise((res) => s.listen(0, '127.0.0.1', () => res(s)));
}
const VIEWPORTS = [
  { name: 'HOME_320', width: 320, height: 568, mobile: true },
  { name: 'HOME_390', width: 390, height: 844, mobile: true },
  { name: 'HOME_430', width: 430, height: 932, mobile: true },
  { name: 'HOME_768', width: 768, height: 1024, mobile: true },
  { name: 'HOME_853_GOLDEN_REGRESSION', width: 853, height: 1844, mobile: false },
  { name: 'HOME_1024', width: 1024, height: 768, mobile: false },
  { name: 'HOME_1440', width: 1440, height: 900, mobile: false },
];
const PROBES = [['brand', '.hc-brand'], ['h1', '.hc-hero-title'], ['hero-sub', '.hc-hero-sub'], ['trace-year', '.hc-trace-year'],
  ['cities-title', '#hc-cities-title'], ['city-name', '.hc-city-name'], ['city-q', '.hc-city-q-line'], ['work-label', '.hc-work-label'],
  ['thread-title', '.hc-thread-title'], ['node-name', '.hc-node-name'], ['reality-line', '.hc-reality-line'], ['reality-cta', '.hc-reality-cta-label']];
const MEASURE = () => {
  const vw = document.documentElement.clientWidth;
  const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y + window.scrollY), Math.round(b.width), Math.round(b.height)]; };
  const cols = (sel) => { const el = document.querySelector(sel); if (!el) return null; return getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length; };
  const rowsOf = (sel) => { const tops = new Set(); document.querySelectorAll(sel).forEach((e) => tops.add(Math.round(e.getBoundingClientRect().top + window.scrollY))); return tops.size; };
  const overflowCulprits = [];
  document.querySelectorAll('#main *').forEach((el) => {
    const b = el.getBoundingClientRect(); if (b.width === 0 && b.height === 0) return;
    if (b.right > vw + 1 || b.left < -1) overflowCulprits.push({ sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''), left: Math.round(b.left), right: Math.round(b.right) });
  });
  const targets = [];
  document.querySelectorAll('#main a, #main button').forEach((el) => {
    const b = el.getBoundingClientRect(); targets.push({ sel: (typeof el.className === 'string' && el.className ? el.className.split(' ')[0] : el.tagName) + (el.getAttribute('href') ? '[' + el.getAttribute('href') + ']' : ''), w: Math.round(b.width), h: Math.round(b.height) });
  });
  const h1Lines = [...document.querySelectorAll('.hc-hero-line')].map((e) => Math.round(e.getBoundingClientRect().top));
  const media = r('.hc-thread-media'), copy = r('.hc-thread-copy');
  const sectionsY = ['.hc-hero', '.hc-cities', '.hc-works', '.hc-thread-section', '.hc-reality'].map((s) => (r(s) || [0, -1])[1]);
  const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
  return {
    vw, docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth > vw, overflowCulprits: overflowCulprits.slice(0, 12), overflowCount: overflowCulprits.length,
    sectionOrderOk: sectionsY.every((y, i) => i === 0 || y > sectionsY[i - 1]), sectionsY,
    sectionsCount: document.querySelectorAll('#main .hc-hero, #main .hc-sheet > section').length,
    rects: { hero: r('.hc-hero'), header: r('.hc-header'), brand: r('.hc-brand-link'), menu: r('.hc-menu-trigger'), heroBody: r('.hc-hero-body'), title: r('.hc-hero-title'), cta: r('.hc-hero-cta'), heroAside: r('.hc-hero-aside'), scroll: r('.hc-hero-scroll'), trace: r('.hc-hero-trace'), sheet: r('.hc-sheet'), cities: r('.hc-city-grid'), works: r('.hc-work-grid'), thread: r('.hc-thread'), threadMedia: media, threadCopy: copy, chain: r('.hc-thread-chain'), reality: r('.hc-reality'), realityCopy: r('.hc-reality-copy'), strip: r('.hc-reality-strip'), spots: r('.hc-reality-cta') },
    titleSize: parseFloat(cs('.hc-hero-title', 'fontSize')), titleLH: cs('.hc-hero-title', 'lineHeight'),
    pad: parseFloat(cs('.hc-cities', 'paddingLeft')), panelPad: parseFloat(cs('.hc-thread', 'paddingLeft')),
    cityGap: cs('.hc-city-grid', 'columnGap'), workGap: cs('.hc-work-grid', 'columnGap'), threadGap: cs('.hc-thread-body', 'columnGap'), stripGap: cs('.hc-reality-strip', 'columnGap'),
    cityCols: cols('.hc-city-grid'), cityRows: rowsOf('.hc-city'), workCols: cols('.hc-work-grid'), workRows: rowsOf('.hc-work'),
    stripCols: cols('.hc-reality-strip'), stripRows: rowsOf('.hc-reality-shot'), realityCols: cols('.hc-reality'),
    threadStacked: media && copy ? copy[1] >= media[1] + media[3] - 1 : null,
    threadSplit: media && copy ? copy[0] >= media[0] + media[2] - 1 : null,
    nodeRows: rowsOf('.hc-node'), h1Lines: new Set(h1Lines).size,
    tapTargets: targets, smallTargets: targets.filter((t) => t.h < 44 || t.w < 44),
    cityCardH: [...document.querySelectorAll('.hc-city')].map((e) => Math.round(e.getBoundingClientRect().height)),
    workCardH: [...document.querySelectorAll('.hc-work')].map((e) => Math.round(e.getBoundingClientRect().height)),
    stripShotW: [...document.querySelectorAll('.hc-reality-shot')].map((e) => Math.round(e.getBoundingClientRect().width)),
    stripShotH: [...document.querySelectorAll('.hc-reality-shot')].map((e) => Math.round(e.getBoundingClientRect().height)),
    imagesOk: Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), imgCount: document.images.length,
    imagesSameOrigin: Array.from(document.images).every((i) => new URL(i.currentSrc || i.src, location.href).origin === location.origin),
  };
};
async function fontsFor(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const fonts = {};
  for (const [name, sel] of PROBES) {
    try {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      if (!nodeId) { fonts[name] = 'NODE_NOT_FOUND'; continue; }
      const { fonts: pf } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      fonts[name] = pf.map((f) => `${f.familyName}:${f.glyphCount}`).join(' | ') || 'NO_GLYPHS';
    } catch (e) { fonts[name] = 'ERR ' + e.message; }
  }
  await cdp.detach();
  return fonts;
}
async function open(browser, base, opts) {
  const ctx = await browser.newContext(Object.assign({ deviceScaleFactor: 1, reducedMotion: 'reduce' }, opts));
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('requestfailed ' + r.url()));
  page.on('request', (r) => { if (!r.url().startsWith(base)) requests.push(r.url()); });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => null)))); // decode 経路を表示 size に揃える（capture_home_853.js と同じ）
  await page.waitForTimeout(400);
  return { ctx, page, errors, requests };
}
function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  /* checker-imaging（compositor 側の遅延 decode）が JPEG の縮小 decode scale を run ごとに
     変え、thread 画像の 43 px が ±2/255 揺れて sha256 が一致しないことがある（Round 4 で判明、
     MAE 0.0・目視差なし）。無効化すると Round 3 Golden と毎回 byte 一致する。 */
  const browser = await chromium.launch({ args: ['--disable-checker-imaging', '--disable-partial-raster'] });
  const report = { root: ROOT, generatedAt: new Date().toISOString(), viewports: {} };
  for (const v of VIEWPORTS) {
    const { ctx, page, errors, requests } = await open(browser, base, { viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile });
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    if (docH !== v.height) { await page.setViewportSize({ width: v.width, height: Math.min(docH, 8000) }); await page.waitForTimeout(300); }
    const m = await page.evaluate(MEASURE);
    const fonts = await fontsFor(ctx, page);
    const file = path.join(OUT, `${v.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    report.viewports[v.name] = Object.assign({ width: v.width, file: path.basename(file), sha256: sha(file), errors, externalRequests: requests, fonts }, m);
    await ctx.close();
  }
  if (fs.existsSync(GOLDEN)) {
    const g = sha(GOLDEN);
    report.golden = { file: path.relative(ROOT, GOLDEN), sha256: g, byteEqual: report.viewports.HOME_853_GOLDEN_REGRESSION.sha256 === g };
  }
  // 390 menu open / Escape / focus return
  {
    const { ctx, page } = await open(browser, base, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.click('#siteMenuButton');
    await page.waitForSelector('#siteMenu[open]');
    await page.waitForTimeout(300);
    const menu = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const links = [...document.querySelectorAll('#siteMenu a, #siteMenu button')].map((a) => { const b = a.getBoundingClientRect(); return { t: (a.textContent || '').trim().slice(0, 20), h: Math.round(b.height), w: Math.round(b.width) }; });
      const dlg = document.getElementById('siteMenu');
      return { open: dlg.open, overflow: dlg.scrollWidth > vw || document.documentElement.scrollWidth > vw, links, focus: document.activeElement && (document.activeElement.className || document.activeElement.tagName) };
    });
    const file = path.join(OUT, 'HOME_390_MENU.png');
    await page.screenshot({ path: file, fullPage: false });
    report.menu390 = Object.assign({ file: path.basename(file), sha256: sha(file) }, menu);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    report.menu390.escapeCloses = await page.evaluate(() => document.getElementById('siteMenu').open === false);
    report.menu390.focusAfterEscape = await page.evaluate(() => document.activeElement && document.activeElement.id);
    await ctx.close();
  }
  // 200 % zoom: a 1440 window at 200 % lays out 720 CSS px at dsf 2
  {
    const { ctx, page, errors } = await open(browser, base, { viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 720, height: Math.min(docH, 4000) });
    await page.waitForTimeout(300);
    const m = await page.evaluate(MEASURE);
    const file = path.join(OUT, 'HOME_200PCT.png');
    // layout は dsf 2（1440 窓の 200 %）。画像は CSS px 等倍で保存する（layout の証跡。7 MB の 2x raster は要らない）。
    await page.screenshot({ path: file, fullPage: false, scale: 'css' });
    report.zoom200 = Object.assign({ file: path.basename(file), sha256: sha(file), note: '720 CSS px @ dsf 2 == 1440 window at 200 % (PNG saved at CSS scale)', errors }, m);
    await ctx.close();
  }
  // reduced-motion vs no-preference at 390: identical render, no animation / transition
  {
    const shots = {};
    for (const rm of ['reduce', 'no-preference']) {
      const { ctx, page } = await open(browser, base, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: rm });
      await page.waitForTimeout(600);
      const file = path.join(OUT, `HOME_390_motion-${rm}.png`);
      await page.screenshot({ path: file, fullPage: false });
      if (rm === 'no-preference') { shots[rm] = { file: path.basename(file), sha256: sha(file) }; fs.unlinkSync(file); } // 同一性は sha で記録し、重複 PNG は残さない
      const anim = await page.evaluate(() => {
        let animated = 0, transitions = 0;
        document.querySelectorAll('#main *').forEach((el) => { const cs = getComputedStyle(el); if (cs.animationName && cs.animationName !== 'none') animated++; if (cs.transitionProperty && cs.transitionProperty !== 'none' && parseFloat(cs.transitionDuration) > 0) transitions++; });
        return { animated, transitions, docAnimations: document.getAnimations ? document.getAnimations().length : null };
      });
      shots[rm] = Object.assign(shots[rm] || { file: path.basename(file), sha256: sha(file) }, { anim });
      await ctx.close();
    }
    report.reducedMotion390 = Object.assign({ identicalRender: shots.reduce.sha256 === shots['no-preference'].sha256 }, shots);
  }
  // keyboard: tab order + focus-visible at 390 and 1440
  report.keyboard = {};
  for (const w of [390, 1440]) {
    const { ctx, page } = await open(browser, base, { viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500 });
    const order = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return { el: 'BODY' };
        const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
        return { el: el.tagName + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') + (el.id ? '#' + el.id : ''), href: el.getAttribute('href'), focusVisible: el.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth, w: Math.round(b.width), h: Math.round(b.height) };
      });
      order.push(info);
      if (info.el === 'BODY' && i > 2) break;
    }
    report.keyboard[w] = order;
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'responsive_report.json'), JSON.stringify(report, null, 2));
  const md = [];
  md.push('# HOME RESPONSIVE ROUND 4 — BREAKPOINT TABLE', '', `Generated ${report.generatedAt} by tools/capture_home_responsive.js (dsf 1, reduced motion, single viewport, Noto CJK font gate).`, '');
  md.push('| capture | viewport | docW | docH | overflow | pad | hero h | title px | cities | city h | works | work h | thread | media w | strip | shot h | sheet x/w | targets <44 | ext req | JS err | non-Noto probes |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const row = (n, v) => md.push(`| ${n} | ${v.width || v.vw} | ${v.docW} | ${v.docH} | ${v.overflow ? 'YES(' + v.overflowCount + ')' : '0'} | ${v.pad} | ${v.rects.hero[3]} | ${v.titleSize} | ${v.cityCols}c/${v.cityRows}r | ${[...new Set(v.cityCardH)].join('/')} | ${v.workCols}c/${v.workRows}r | ${[...new Set(v.workCardH)].join('/')} | ${v.threadStacked ? 'stacked' : v.threadSplit ? 'split' : '?'}, nodes ${v.nodeRows}r | ${v.rects.threadMedia[2]} | ${v.stripCols}c/${v.stripRows}r | ${[...new Set(v.stripShotH)].join('/')} | ${v.rects.sheet[0]}/${v.rects.sheet[2]} | ${v.smallTargets.length} | ${(v.externalRequests || []).length} | ${(v.errors || []).length} | ${Object.values(v.fonts || {}).filter((f) => !/Noto/.test(f)).length} |`);
  for (const [n, v] of Object.entries(report.viewports)) row(n, v);
  row('HOME_200PCT (720 CSS px @ dsf 2)', Object.assign({ width: 720, externalRequests: [], fonts: {} }, report.zoom200));
  md.push('', `- 853 Golden: \`${report.golden ? report.golden.file : 'n/a'}\` sha256 \`${report.golden ? report.golden.sha256 : 'n/a'}\` — capture sha256 \`${report.viewports.HOME_853_GOLDEN_REGRESSION.sha256}\` — byte equal: **${report.golden ? report.golden.byteEqual : 'n/a'}**`);
  md.push(`- HOME_390_MENU: open=${report.menu390.open}, overflow=${report.menu390.overflow}, links=${report.menu390.links.length}, Escape closes=${report.menu390.escapeCloses}, focus returns to #${report.menu390.focusAfterEscape}`);
  md.push(`- reduced-motion 390: identical render=${report.reducedMotion390.identicalRender}, reduce ${JSON.stringify(report.reducedMotion390.reduce.anim)}, no-preference ${JSON.stringify(report.reducedMotion390['no-preference'].anim)}`);
  for (const w of [390, 1440]) md.push(`- keyboard ${w}: ` + report.keyboard[w].map((k) => `${k.el}${k.href ? '[' + k.href + ']' : ''}${k.el === 'BODY' ? '' : (k.focusVisible && /solid/.test(k.outline) ? ' (focus-visible outline)' : ' (NO OUTLINE)')}`).join(' → '));
  md.push('', '## rects (x, y, w, h)', '');
  for (const [n, v] of Object.entries(report.viewports)) md.push(`- **${n}**: hero ${JSON.stringify(v.rects.hero)}, body ${JSON.stringify(v.rects.heroBody)}, aside ${JSON.stringify(v.rects.heroAside)}, trace ${JSON.stringify(v.rects.trace)}, cities ${JSON.stringify(v.rects.cities)}, works ${JSON.stringify(v.rects.works)}, thread ${JSON.stringify(v.rects.thread)}, media ${JSON.stringify(v.rects.threadMedia)}, copy ${JSON.stringify(v.rects.threadCopy)}, reality ${JSON.stringify(v.rects.reality)}, strip ${JSON.stringify(v.rects.strip)}, spots ${JSON.stringify(v.rects.spots)}`);
  fs.writeFileSync(path.join(OUT, 'BREAKPOINT_TABLE.md'), md.join('\n') + '\n');
  console.log(md.slice(0, 16).join('\n'));
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
