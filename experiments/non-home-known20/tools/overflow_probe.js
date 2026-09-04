#!/usr/bin/env node
/* NON-HOME KNOWN-20 — read-only overflow diagnostic probe (review tooling, not runtime).
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node experiments/non-home-known20/tools/overflow_probe.js \
 *       --out experiments/non-home-known20/overflow_probe.json
 *
 * Serves the repo from a local static server (no outbound traffic), opens the
 * scenarios that fail `no_horizontal_overflow` in qa/browser_qa.js (m320 / m390
 * shelf + suggest, zoom200 / forced-colors shelf + suggest) plus m430 controls,
 * and records for each: documentElement / body scrollWidth vs clientWidth,
 * elements whose rect exceeds the viewport, elements whose own scrollWidth
 * exceeds their clientWidth (content overflow that a rect collector cannot see),
 * text runs whose Range rect exceeds the viewport, a pseudo-element inventory,
 * grid / flex track sizing, wrapping properties, and forced-colors / focus state.
 * Then it re-measures under injected diagnostic style toggles (never product CSS)
 * to prove or falsify each suspect. Nothing in the product is modified. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(__dirname, '..', 'overflow_probe.json')));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
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
const SCENARIOS = [
  { name: 'm320/shelf-kichijoji', page: 'shelf.html?shelf=kichijoji', width: 320, height: 800, mobile: true },
  { name: 'm320/shelf-koenji', page: 'shelf.html?shelf=koenji', width: 320, height: 800, mobile: true },
  { name: 'm320/shelf-shimokitazawa', page: 'shelf.html?shelf=shimokitazawa', width: 320, height: 800, mobile: true },
  { name: 'm320/shelf-jinbocho', page: 'shelf.html?shelf=jinbocho', width: 320, height: 800, mobile: true },
  { name: 'm320/suggest', page: 'suggest.html', width: 320, height: 800, mobile: true },
  { name: 'm390/shelf-kichijoji', page: 'shelf.html?shelf=kichijoji', width: 390, height: 844, mobile: true },
  { name: 'm390/shelf-koenji', page: 'shelf.html?shelf=koenji', width: 390, height: 844, mobile: true },
  { name: 'm390/shelf-shimokitazawa', page: 'shelf.html?shelf=shimokitazawa', width: 390, height: 844, mobile: true },
  { name: 'm390/shelf-jinbocho', page: 'shelf.html?shelf=jinbocho', width: 390, height: 844, mobile: true },
  { name: 'm390/suggest', page: 'suggest.html', width: 390, height: 844, mobile: true },
  { name: 'control/m430/shelf-kichijoji', page: 'shelf.html?shelf=kichijoji', width: 430, height: 932, mobile: true },
  { name: 'control/m430/suggest', page: 'suggest.html', width: 430, height: 932, mobile: true },
  { name: 'zoom200-shelf', page: 'shelf.html?shelf=koenji', width: 390, height: 844, zoom: 2, forcedColors: 'none' },
  { name: 'forced-shelf', page: 'shelf.html?shelf=jinbocho', width: 390, height: 844, zoom: 1, forcedColors: 'active' },
  { name: 'zoom200-suggest', page: 'suggest.html', width: 390, height: 844, zoom: 2, forcedColors: 'none' },
  { name: 'forced-suggest', page: 'suggest.html', width: 390, height: 844, zoom: 1, forcedColors: 'active' }
];
const TOGGLES = {
  T1_open_button_after_off: '.open-button::after{display:none!important}',
  T2_explainer_lines_wrap: '.site-explainer .explainer-line{white-space:normal!important}',
  T3_weekly_meta_min_width_0: '.weekly-feature-meta,.weekly-feature-date,.weekly-feature-venue,.weekly-feature-verified{min-width:0!important}',
  T4_T1_plus_T2: '.open-button::after{display:none!important} .site-explainer .explainer-line{white-space:normal!important}',
  T5_all: '.open-button::after{display:none!important} .site-explainer .explainer-line{white-space:normal!important} .weekly-feature-meta,.weekly-feature-date,.weekly-feature-venue,.weekly-feature-verified{min-width:0!important}',
  T6_explainer_safe_wrap: '.site-explainer .explainer-line{white-space:normal!important;overflow-wrap:anywhere!important}'
};
const MEASURE = () => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const skip = (el) => el.classList.contains('sr-only') || el.classList.contains('skip-link') || el.closest('dialog:not([open])');
  const rectWide = [], selfOverflow = [], textWide = [], pseudo = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (skip(el)) return;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (b.width > 0 && b.right > vw + 1) rectWide.push({ el: label(el), right: Math.round(b.right), width: Math.round(b.width) });
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && cs.overflowX === 'visible') {
      selfOverflow.push({ el: label(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, display: cs.display,
        whiteSpace: cs.whiteSpace, wordBreak: cs.wordBreak, overflowWrap: cs.overflowWrap, minWidth: cs.minWidth, fontSize: cs.fontSize,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) });
    }
    for (const p of ['::before', '::after']) {
      const ps = getComputedStyle(el, p);
      if (ps.content && ps.content !== 'none' && ps.content !== 'normal') {
        pseudo.push({ el: label(el), pseudo: p, content: ps.content, position: ps.position, display: ps.display,
          inset: [ps.top, ps.right, ps.bottom, ps.left].join(' '), width: ps.width, height: ps.height });
      }
    }
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.nodeValue.trim() || skip(n.parentElement)) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const b = r.getBoundingClientRect();
    if (b.width > 0 && b.right > vw + 1) textWide.push({ parent: label(n.parentElement), right: Math.round(b.right), left: Math.round(b.left), text: n.nodeValue.replace(/\s+/g, ' ').trim().slice(0, 40) });
  }
  const track = (sel) => [...document.querySelectorAll(sel)].map((el) => { const cs = getComputedStyle(el); return { el: label(el), display: cs.display, cols: cs.gridTemplateColumns, flexWrap: cs.flexWrap, width: Math.round(el.getBoundingClientRect().width), clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, minWidth: cs.minWidth }; });
  const explainer = [...document.querySelectorAll('.site-explainer, .site-explainer .explainer-line')].map((el) => { const cs = getComputedStyle(el); return { el: label(el), clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, fontSize: cs.fontSize, whiteSpace: cs.whiteSpace, wordBreak: cs.wordBreak, overflowWrap: cs.overflowWrap, display: cs.display, rectRight: Math.round(el.getBoundingClientRect().right) }; });
  return {
    docScrollWidth: doc.scrollWidth, docClientWidth: vw, bodyScrollWidth: document.body.scrollWidth, bodyClientWidth: document.body.clientWidth,
    innerWidth: window.innerWidth, zoom: doc.style.zoom || '1',
    forcedColors: matchMedia('(forced-colors: active)').matches, activeElement: document.activeElement ? label(document.activeElement) : null,
    overflow: doc.scrollWidth > vw + 1, overflowPx: doc.scrollWidth - vw,
    rectWide: rectWide.slice(0, 8), selfOverflow: selfOverflow.slice(0, 12), textWide: textWide.slice(0, 12),
    pseudoAbsolute: pseudo.filter((p) => p.position === 'absolute' || p.position === 'fixed'), pseudoCount: pseudo.length,
    tracks: track('.site-header, .weekly-feature-card, .object-card, .card-body, .suggest-form, .field, .suggest-actions-secondary, .weekly-feature-actions'),
    explainer
  };
};
(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const report = { generatedAt: new Date().toISOString(), scenarios: [] };
  for (const sc of SCENARIOS) {
    const ctx = await browser.newContext({ viewport: { width: sc.width, height: sc.height }, isMobile: !!sc.mobile, hasTouch: !!sc.mobile, reducedMotion: 'reduce', forcedColors: sc.forcedColors || 'none' });
    const page = await ctx.newPage();
    await page.goto(base + sc.page, { waitUntil: 'load' });
    if (sc.zoom > 1) await page.evaluate((z) => { document.documentElement.style.zoom = z; }, sc.zoom);
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3 || document.querySelectorAll('#sg-category option').length === 5);
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(200);
    const baseline = await page.evaluate(MEASURE);
    const toggles = {};
    for (const [key, css] of Object.entries(TOGGLES)) {
      await page.evaluate((c) => { let s = document.getElementById('__probe'); if (!s) { s = document.createElement('style'); s.id = '__probe'; document.head.appendChild(s); } s.textContent = c; }, css);
      await page.waitForTimeout(50);
      const m = await page.evaluate(MEASURE);
      toggles[key] = { docScrollWidth: m.docScrollWidth, overflow: m.overflow, overflowPx: m.overflowPx, textWide: m.textWide, rectWide: m.rectWide, selfOverflow: m.selfOverflow.map((x) => x.el) };
    }
    await page.evaluate(() => { const s = document.getElementById('__probe'); if (s) s.remove(); });
    report.scenarios.push({ ...sc, baseline, toggles });
    console.log(`${sc.name.padEnd(30)} doc ${baseline.docScrollWidth}/${baseline.docClientWidth} overflow=${baseline.overflow} (+${baseline.overflowPx}px) rectWide=${baseline.rectWide.length} textWide=${baseline.textWide.map((t) => t.parent + '→' + t.right).join(', ') || '-'}`);
    for (const [k, t] of Object.entries(toggles)) console.log(`   ${k.padEnd(28)} doc ${t.docScrollWidth} overflow=${t.overflow} (+${t.overflowPx}px) textWide=${t.textWide.map((x) => x.parent + '→' + x.right).join(', ') || '-'}`);
    await ctx.close();
  }
  await browser.close(); server.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log('wrote ' + path.relative(ROOT, OUT));
})().catch((e) => { console.error(e); process.exit(1); });
