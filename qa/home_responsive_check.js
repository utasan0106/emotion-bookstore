#!/usr/bin/env node
/* HOME RESPONSIVE CHECK — Round 4 の responsive contract を実ブラウザで見る。
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node qa/home_responsive_check.js
 *
 * ローカルの静的サーバだけを使い、外向きの通信は一切しない。
 * 853 Golden の pixel identity は experiments/home-visual-fidelity/tools/capture_home_853.js
 * + sha256 で別に見る（ここでは 800 / 853 / 899 の corridor で 853 用の値が
 * responsive override に巻き込まれていないことだけを確認する）。
 * qa/browser_qa.js を置き換えない。既存 check は弱めない。 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
let pass = 0;
const fails = [];
function check(scope, name, ok, detail) {
  if (ok) { pass++; return; }
  fails.push(`${scope} ${name} ${detail === undefined ? '' : JSON.stringify(detail)}`);
}
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

/* Brief V2 §5 の値。tol は px。 */
const MOBILE = { cityCols: 2, workCols: 2, thread: 'stacked', chainRows: 3, stripCols: 2, stripRows: 2, firstShotFull: true, copyFirst: true, sheetFull: true };
const WIDTHS = [
  Object.assign({ name: 'm320', width: 320, height: 568, mobile: true, pad: 20, hero: 600, title: 44, cityH: 228, workH: 112, panelPad: 18 }, MOBILE),
  Object.assign({ name: 'm390', width: 390, height: 844, mobile: true, pad: 24, hero: 640, title: 54, cityH: 252, workH: 126, panelPad: 22 }, MOBILE),
  Object.assign({ name: 'm430', width: 430, height: 932, mobile: true, pad: 24, hero: 660, title: 58, cityH: 264, workH: 135, panelPad: 22 }, MOBILE),
  { name: 't768', width: 768, height: 1024, mobile: true, contentX: 24, contentW: 720, hero: 600, title: 64, cityCols: 4, cityGap: 12, cityH: 286, workCols: 4, workH: 132,
    thread: 'split', chainRows: 1, mediaW: 280, threadGap: 24, panelPad: 24, copyW: 240, stripCols: 3, stripGap: 10, shotH: 154, sheetFull: true },
  { name: 'c800', width: 800, height: 1844, corridor: true },
  { name: 'c853', width: 853, height: 1844, corridor: true },
  { name: 'c899', width: 899, height: 1844, corridor: true },
  { name: 'd1024', width: 1024, height: 768, mobile: false, sheetX: 32, sheetW: 960, contentX: 64, contentW: 896, hero: 640, title: 72, cityCols: 4, cityGap: 16, cityH: 320, workCols: 4, workH: 156,
    thread: 'split', chainRows: 1, mediaW: 360, threadGap: 32, panelPad: 28, copyW: 280, stripCols: 3, stripGap: 12, shotH: 184 },
  { name: 'w1440', width: 1440, height: 900, mobile: false, sheetX: 100, sheetW: 1240, contentX: 132, contentW: 1176, hero: 680, title: 84, cityCols: 4, cityGap: 18, cityH: 340, workCols: 4, workH: 170,
    thread: 'split', chainRows: 1, mediaW: 440, threadGap: 40, panelPad: 32, copyW: 320, stripCols: 3, stripGap: 14, shotH: 220 },
];
const TEXT = ['.hc-brand-link', '.hc-hero-title', '.hc-hero-sub', '.hc-hero-cta-label', '.hc-hero-aside', '.hc-hero-scroll-label',
  '.hc-section-title', '.hc-section-note', '.hc-section-more', '.hc-city-name', '.hc-city-q-line', '.hc-work-label',
  '.hc-thread-heading', '.hc-thread-note', '.hc-thread-pill', '.hc-thread-title', '.hc-thread-sub', '.hc-node-kind', '.hc-node-name',
  '.hc-thread-read', '.hc-reality-line', '.hc-reality-cta-label'];
const CONTAIN = [['.hc-city-name', '.hc-city'], ['.hc-city-q-line', '.hc-city'], ['.hc-work-label', '.hc-work'], ['.hc-node-kind', '.hc-node'],
  ['.hc-node-name', '.hc-node'], ['.hc-thread-title', '.hc-thread'], ['.hc-thread-sub', '.hc-thread'], ['.hc-thread-pill', '.hc-thread'],
  ['.hc-reality-line', '.hc-reality-copy'], ['.hc-hero-title', '.hc-hero'], ['.hc-hero-cta', '.hc-hero'], ['.hc-hero-aside', '.hc-hero'], ['.hc-hero-scroll', '.hc-hero']];
const FONT_PROBES = [['brand', '.hc-brand'], ['h1', '.hc-hero-title'], ['sub', '.hc-hero-sub'], ['year', '.hc-trace-year'], ['city', '.hc-city-name'],
  ['q', '.hc-city-q-line'], ['work', '.hc-work-label'], ['thread', '.hc-thread-title'], ['node', '.hc-node-name'], ['reality', '.hc-reality-line'], ['cta', '.hc-reality-cta-label']];

const MEASURE = (args) => {
  const { TEXT, CONTAIN } = args;
  const vw = document.documentElement.clientWidth;
  const R = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top + scrollY, w: b.width, h: b.height, r: b.right, b: b.bottom + scrollY }; };
  const r = (sel) => { const el = document.querySelector(sel); return el ? R(el) : null; };
  const rr = (o) => (o ? [Math.round(o.x), Math.round(o.y), Math.round(o.w), Math.round(o.h)] : null);
  const cs = (sel, p) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[p] : null; };
  const cols = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length : null; };
  const rows = (sel) => { const t = new Set(); document.querySelectorAll(sel).forEach((e) => t.add(Math.round(e.getBoundingClientRect().top + scrollY))); return t.size; };
  const inside = (a, b, tol) => a.x >= b.x - tol && a.r <= b.r + tol && a.y >= b.y - tol && a.b <= b.b + tol;
  const hits = (a, b) => !(a.r <= b.x || b.r <= a.x || a.b <= b.y || b.b <= a.y);
  const clipped = [];
  for (const sel of TEXT) document.querySelectorAll(sel).forEach((el, i) => {
    const b = R(el);
    if (b.w === 0) return;
    if (b.r > vw + 1 || b.x < -1) clipped.push(`${sel}[${i}] outside viewport ${Math.round(b.x)}-${Math.round(b.r)}`);
    const d = getComputedStyle(el).display;
    if (d !== 'inline' && el.scrollWidth > el.clientWidth + 1) clipped.push(`${sel}[${i}] scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
  });
  for (const [child, parent] of CONTAIN) document.querySelectorAll(child).forEach((el, i) => {
    const p = el.closest(parent); if (!p) return;
    if (!inside(R(el), R(p), 1)) clipped.push(`${child}[${i}] not inside ${parent} ${JSON.stringify(rr(R(el)))} vs ${JSON.stringify(rr(R(p)))}`);
  });
  const boxes = { title: r('.hc-hero-title'), sub: r('.hc-hero-sub'), cta: r('.hc-hero-cta'), aside: r('.hc-hero-aside'), scroll: r('.hc-hero-scroll'), menu: r('.hc-menu-trigger'), brand: r('.hc-brand-link') };
  const overlaps = [];
  const pairs = [['title', 'aside'], ['title', 'cta'], ['sub', 'aside'], ['cta', 'aside'], ['cta', 'scroll'], ['aside', 'scroll'], ['aside', 'menu'], ['brand', 'menu'], ['brand', 'aside'], ['sub', 'cta']];
  for (const [a, b] of pairs) if (boxes[a] && boxes[b] && hits(boxes[a], boxes[b])) overlaps.push(`${a}×${b}`);
  document.querySelectorAll('.hc-trace-dot, .hc-trace-year').forEach((el) => {
    const b = R(el); if (b.w === 0 && b.h === 0) return;
    for (const k of ['title', 'sub', 'cta', 'aside', 'scroll']) if (boxes[k] && hits(b, boxes[k])) overlaps.push(`trace(${el.textContent || 'dot'})×${k}`);
    if (b.x < 0 || b.r > vw) overlaps.push(`trace(${el.textContent || 'dot'}) off-viewport ${Math.round(b.x)}-${Math.round(b.r)}`);
  });
  const targets = [...document.querySelectorAll('#main a, #main button')].map((el) => { const b = R(el); return { sel: (typeof el.className === 'string' && el.className.split(' ')[0]) || el.tagName, w: Math.round(b.w), h: Math.round(b.h) }; });
  const holds = [...document.querySelectorAll('[data-route-hold]')].map((el) => ({ id: el.getAttribute('data-route-hold'), tag: el.tagName, href: el.getAttribute('href'), onclick: el.getAttribute('onclick'), tabindex: el.tabIndex, role: el.getAttribute('role') }));
  const secY = ['.hc-hero', '.hc-cities', '.hc-works', '.hc-thread-section', '.hc-reality'].map((s) => (r(s) || { y: -1 }).y);
  const media = r('.hc-thread-media'), copy = r('.hc-thread-copy'), rcopy = r('.hc-reality-copy'), strip = r('.hc-reality-strip');
  const shots = [...document.querySelectorAll('.hc-reality-shot')].map((e) => rr(R(e)));
  const qLines = [...document.querySelectorAll('.hc-city')].map((c) => new Set([...c.querySelectorAll('.hc-city-q-line')].map((l) => Math.round(l.getBoundingClientRect().top))).size);
  let animated = 0;
  document.querySelectorAll('#main *').forEach((el) => { const s = getComputedStyle(el); if ((s.animationName && s.animationName !== 'none') || (s.transitionProperty !== 'none' && parseFloat(s.transitionDuration) > 0)) animated++; });
  return {
    vw, docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight,
    sections: [...document.querySelectorAll('main > section, main > .hc-sheet > section')].map((el) => [...el.classList].find((c) => c !== 'hc-section')),
    sectionOrder: secY.every((y, i) => i === 0 || y > secY[i - 1]),
    h1: document.querySelectorAll('h1').length, h1Lines: new Set([...document.querySelectorAll('.hc-hero-line')].map((e) => Math.round(e.getBoundingClientRect().top))).size,
    titleSize: parseFloat(cs('.hc-hero-title', 'fontSize')), titleLH: parseFloat(cs('.hc-hero-title', 'lineHeight')),
    pad: parseFloat(cs('.hc-cities', 'paddingLeft')), panelPad: parseFloat(cs('.hc-thread', 'paddingLeft')),
    cityGap: parseFloat(cs('.hc-city-grid', 'columnGap')), threadGap: parseFloat(cs('.hc-thread-body', 'columnGap')), stripGap: parseFloat(cs('.hc-reality-strip', 'columnGap')),
    rects: { hero: rr(r('.hc-hero')), body: rr(r('.hc-hero-body')), title: rr(boxes.title), cta: rr(boxes.cta), aside: rr(boxes.aside), scroll: rr(boxes.scroll), sheet: rr(r('.hc-sheet')), cities: rr(r('.hc-city-grid')), works: rr(r('.hc-work-grid')), thread: rr(r('.hc-thread')), media: rr(media), copy: rr(copy), reality: rr(r('.hc-reality')), rcopy: rr(rcopy), strip: rr(strip), spots: rr(r('.hc-reality-cta')) },
    cityCols: cols('.hc-city-grid'), cityRows: rows('.hc-city'), workCols: cols('.hc-work-grid'), workRows: rows('.hc-work'), stripCols: cols('.hc-reality-strip'), stripRows: rows('.hc-reality-shot'),
    chainRows: rows('.hc-node'), qLines,
    cityH: [...document.querySelectorAll('.hc-city')].map((e) => Math.round(e.getBoundingClientRect().height)),
    workH: [...document.querySelectorAll('.hc-work')].map((e) => Math.round(e.getBoundingClientRect().height)),
    shots, threadStacked: media && copy ? copy.y >= media.b - 1 : null, threadSplit: media && copy ? copy.x >= media.r - 1 : null,
    copyBeforeStrip: rcopy && strip ? strip.y >= rcopy.b - 1 : null,
    clipped, overlaps, targets, holds,
    images: { n: document.images.length, loaded: [...document.images].every((i) => i.complete && i.naturalWidth > 0), sameOrigin: [...document.images].every((i) => new URL(i.currentSrc || i.src, location.href).origin === location.origin) },
    animated, docAnimations: document.getAnimations ? document.getAnimations().length : null,
    asideRight: boxes.aside ? Math.round(vw - boxes.aside.r) : null,
  };
};

async function fonts(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const out = {};
  for (const [name, sel] of FONT_PROBES) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    if (!nodeId) { out[name] = 'NODE_NOT_FOUND'; continue; }
    const { fonts: pf } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    out[name] = pf.map((f) => f.familyName).join('|') || 'NO_GLYPHS';
  }
  await cdp.detach();
  return out;
}
const near = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const origin = new URL(base).origin;
  const browser = await chromium.launch();

  for (const v of WIDTHS) {
    const S = v.name;
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(300);
    const m = await page.evaluate(MEASURE, { TEXT, CONTAIN });
    const f = await fonts(ctx, page);

    /* 共通契約 */
    check(S, 'five_sections_in_canonical_order', m.sections.join('|') === 'hc-hero|hc-cities|hc-works|hc-thread-section|hc-reality' && m.sectionOrder, m.sections);
    check(S, 'single_h1_in_three_lines', m.h1 === 1 && m.h1Lines === 3, { h1: m.h1, lines: m.h1Lines });
    check(S, 'no_horizontal_overflow', m.docW <= m.vw, { docW: m.docW, vw: m.vw });
    check(S, 'no_clipped_text', m.clipped.length === 0, m.clipped.slice(0, 6));
    check(S, 'no_overlap_in_hero', m.overlaps.length === 0, m.overlaps);
    check(S, 'city_questions_stay_three_lines', m.qLines.every((n) => n === 3), m.qLines);
    check(S, 'images_loaded_same_origin', m.images.loaded && m.images.sameOrigin && m.images.n >= 13, m.images);
    check(S, 'route_holds_are_static_labels', m.holds.length === 8 && m.holds.every((h) => h.tag !== 'A' && h.tag !== 'BUTTON' && !h.href && !h.onclick && h.tabindex < 0 && !h.role), m.holds);
    if (!v.corridor) check(S, 'real_targets_are_44px', m.targets.length >= 6 && m.targets.every((t) => t.w >= 44 && t.h >= 44), m.targets.filter((t) => t.w < 44 || t.h < 44));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'actual_noto_cjk_font', Object.values(f).every((x) => /Noto (Serif|Sans) CJK JP/.test(x)), f);
    check(S, 'reduced_motion_animation_0', m.animated === 0 && m.docAnimations === 0, { animated: m.animated, docAnimations: m.docAnimations });

    if (v.corridor) {
      /* 800–899: 853 用の default rule のまま（responsive override が巻き込まない） */
      check(S, 'corridor_keeps_853_hero', near(m.rects.hero[3], 617, 0) && near(m.titleSize, 61, 0) && near(m.titleLH, 74, 0), { hero: m.rects.hero, title: m.titleSize, lh: m.titleLH });
      check(S, 'corridor_keeps_853_geometry', m.pad === 32 && m.cityCols === 4 && m.cityH.every((h) => h === 311) && m.workCols === 4 && m.workH.every((h) => h === 143) && m.rects.media[2] === 292 && m.rects.media[3] === 180 && m.panelPad === 21 && m.shots.every((s) => s[3] === 186) && m.rects.sheet[0] === 0 && m.rects.sheet[2] === v.width,
        { pad: m.pad, cityH: m.cityH, workH: m.workH, media: m.rects.media, panelPad: m.panelPad, shots: m.shots, sheet: m.rects.sheet });
      check(S, 'corridor_keeps_853_hero_placement', m.rects.body[0] === 32 && m.rects.body[1] === 147 && m.rects.aside[0] === 690 && m.rects.aside[1] === 281, { body: m.rects.body, aside: m.rects.aside });
      if (v.width === 853) check(S, 'canonical_1844_tall', near(m.docH, 1844, 0), m.docH);
    } else {
      check(S, 'hero_height', near(m.rects.hero[3], v.hero, 2), m.rects.hero);
      check(S, 'title_size_and_leading', near(m.titleSize, v.title, 0.5) && m.titleLH / m.titleSize <= 1.22 + 1e-6, { size: m.titleSize, lh: m.titleLH });
      check(S, 'cta_geometry', m.rects.cta[2] >= 220 && m.rects.cta[2] <= 244 && near(m.rects.cta[3], 52, 0) && near(m.rects.cta[0], v.contentX || v.pad, 1), m.rects.cta);
      check(S, 'aside_on_right_gutter', m.rects.aside && m.rects.aside[0] > m.vw / 2 && m.asideRight >= (v.pad || 24) - 1, { aside: m.rects.aside, right: m.asideRight });
      check(S, 'city_grid', m.cityCols === v.cityCols && m.cityRows === 4 / v.cityCols && m.cityH.every((h) => near(h, v.cityH, 1)) && (v.cityGap === undefined || near(m.cityGap, v.cityGap, 0)), { cols: m.cityCols, rows: m.cityRows, h: m.cityH, gap: m.cityGap });
      check(S, 'work_grid', m.workCols === v.workCols && m.workRows === 4 / v.workCols && m.workH.every((h) => near(h, v.workH, 1)), { cols: m.workCols, rows: m.workRows, h: m.workH });
      check(S, 'thread_layout', (v.thread === 'stacked' ? m.threadStacked === true : m.threadSplit === true) && m.chainRows === v.chainRows, { stacked: m.threadStacked, split: m.threadSplit, chainRows: m.chainRows });
      check(S, 'thread_panel_padding', near(m.panelPad, v.panelPad, 0.5), m.panelPad);
      check(S, 'thread_media_aspect_292_180', near(m.rects.media[2] / m.rects.media[3], 292 / 180, 0.02), m.rects.media);
      if (v.mediaW) check(S, 'thread_media_column', near(m.rects.media[2], v.mediaW, 1) && near(m.threadGap, v.threadGap, 0), { media: m.rects.media, gap: m.threadGap });
      else check(S, 'thread_media_full_width', near(m.rects.media[2], m.rects.thread[2] - 2 * m.panelPad, 1), { media: m.rects.media, thread: m.rects.thread });
      check(S, 'reality_strip', m.stripCols === v.stripCols && m.stripRows === (v.stripRows || 1) && (v.stripGap === undefined || near(m.stripGap, v.stripGap, 0)) && (v.shotH === undefined || m.shots.every((s) => near(s[3], v.shotH, 1))), { cols: m.stripCols, rows: m.stripRows, gap: m.stripGap, shots: m.shots });
      if (v.firstShotFull) check(S, 'reality_first_shot_full_then_pair', near(m.shots[0][2], m.rects.strip[2], 1) && near(m.shots[1][2], m.shots[2][2], 1) && m.shots[1][1] === m.shots[2][1] && m.shots[1][1] > m.shots[0][1], m.shots);
      if (v.copyFirst) check(S, 'reality_copy_before_strip', m.copyBeforeStrip === true, { copy: m.rects.rcopy, strip: m.rects.strip });
      if (v.copyW) check(S, 'reality_copy_column', near(m.rects.rcopy[2], v.copyW, 1), m.rects.rcopy);
      if (v.pad !== undefined) check(S, 'mobile_shell_padding', near(m.pad, v.pad, 0.5) && near(m.rects.cities[0], v.pad, 0.5), { pad: m.pad, cities: m.rects.cities });
      if (v.contentX !== undefined) check(S, 'content_shell', near(m.rects.cities[0], v.contentX, 1) && near(m.rects.cities[2], v.contentW, 1) && near(m.rects.thread[0], v.contentX, 1) && near(m.rects.thread[2], v.contentW, 1), { cities: m.rects.cities, thread: m.rects.thread });
      if (v.sheetFull) check(S, 'sheet_is_full_bleed', m.rects.sheet[0] === 0 && m.rects.sheet[2] === v.width, m.rects.sheet);
      if (v.sheetX !== undefined) check(S, 'sheet_shell', near(m.rects.sheet[0], v.sheetX, 1) && near(m.rects.sheet[2], v.sheetW, 1), m.rects.sheet);
      check(S, 'spots_cta_48', near(m.rects.spots[3], 48, 0) && near(m.rects.spots[2], 212, 0), m.rects.spots);
    }

    /* menu: open / Escape / focus return（dialog の focus trap は release.js のまま） */
    await page.click('#siteMenuButton');
    await page.waitForSelector('#siteMenu[open]');
    const menu = await page.evaluate(() => ({ open: document.getElementById('siteMenu').open, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, focusInside: document.getElementById('siteMenu').contains(document.activeElement) }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => ({ open: document.getElementById('siteMenu').open, focus: document.activeElement && document.activeElement.id }));
    check(S, 'menu_opens_and_escape_closes', menu.open === true && menu.focusInside === true && !menu.overflow && after.open === false && after.focus === 'siteMenuButton', { menu, after });
    check(S, 'no_js_error_after_menu', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  /* 200 %: 1440 の窓を 200 % にすると 720 CSS px、dsf 2。853 Golden の CSS は変えない。 */
  {
    const S = 'zoom200-home';
    const ctx = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    const z = await page.evaluate(MEASURE, { TEXT, CONTAIN });
    check(S, 'no_horizontal_overflow', z.docW <= z.vw, { docW: z.docW, vw: z.vw });
    check(S, 'five_sections_reachable', z.sectionOrder && z.sections.length === 5, z.sections);
    check(S, 'no_clipped_text', z.clipped.length === 0, z.clipped.slice(0, 6));
    check(S, 'cta_and_menu_reachable', z.rects.cta[0] >= 0 && z.rects.cta[0] + z.rects.cta[2] <= z.vw && z.targets.every((t) => t.w >= 44 && t.h >= 44), { cta: z.rects.cta, small: z.targets.filter((t) => t.w < 44 || t.h < 44) });
    check(S, 'mobile_grammar_at_720', z.cityCols === 2 && z.workCols === 2 && z.threadStacked === true, { city: z.cityCols, work: z.workCols, stacked: z.threadStacked });
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  /* reduced-motion: reduce と no-preference で animation 0・同じ描画 */
  {
    const S = 'motion-390';
    const shots = {};
    for (const rm of ['reduce', 'no-preference']) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: rm });
      const page = await ctx.newPage();
      await page.goto(base + 'index.html', { waitUntil: 'load' });
      await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
      await page.waitForTimeout(500);
      const m = await page.evaluate(MEASURE, { TEXT, CONTAIN });
      shots[rm] = { png: (await page.screenshot({ fullPage: false })).toString('base64'), animated: m.animated, docAnimations: m.docAnimations };
      await ctx.close();
    }
    check(S, 'animation_0_under_both_preferences', shots.reduce.animated === 0 && shots['no-preference'].animated === 0 && shots.reduce.docAnimations === 0 && shots['no-preference'].docAnimations === 0, { reduce: shots.reduce.animated, nopref: shots['no-preference'].animated });
    check(S, 'identical_render_under_both_preferences', shots.reduce.png === shots['no-preference'].png);
  }

  /* keyboard: skip link → brand → menu → 4 街、focus-visible の outline が見える */
  for (const w of [390, 1440]) {
    const S = `keyboard-${w}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    const order = [];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return { el: 'BODY' };
        const cs = getComputedStyle(el);
        return { el: (typeof el.className === 'string' && el.className.split(' ')[0]) || el.tagName, href: el.getAttribute('href'), fv: el.matches(':focus-visible'), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      }));
      if (order[order.length - 1].el === 'BODY') break;
    }
    const names = order.map((o) => o.el).join('>');
    check(S, 'tab_order_reaches_the_real_targets', names.startsWith('skip-link>hc-brand-link>hc-menu-trigger>hc-city>hc-city>hc-city>hc-city'), names);
    check(S, 'focus_visible_outline_on_every_stop', order.filter((o) => o.el !== 'BODY').every((o) => o.fv && o.outline), order.filter((o) => o.el !== 'BODY' && !(o.fv && o.outline)));
    check(S, 'route_holds_not_in_tab_order', order.every((o) => !/route|hold|section-more|thread-read|reality-cta|hero-cta/.test(o.el)), names);
    // menu by keyboard
    await page.focus('#siteMenuButton');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#siteMenu[open]');
    await page.keyboard.press('Tab');
    const inMenu = await page.evaluate(() => document.getElementById('siteMenu').contains(document.activeElement));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const back = await page.evaluate(() => ({ open: document.getElementById('siteMenu').open, focus: document.activeElement && document.activeElement.id }));
    check(S, 'menu_by_keyboard', inMenu === true && back.open === false && back.focus === 'siteMenuButton', { inMenu, back });
    await ctx.close();
  }

  await browser.close();
  server.close();
  const total = pass + fails.length;
  if (fails.length) {
    console.error(`HOME_RESPONSIVE_CHECK_FAIL (${pass}/${total})`);
    fails.forEach((f) => console.error('- FAIL ' + f));
    process.exit(1);
  }
  console.log(`HOME_RESPONSIVE_CHECK_GO (${pass}/${total})`);
})().catch((e) => { console.error(e); process.exit(1); });
