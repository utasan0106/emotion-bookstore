#!/usr/bin/env node
/* HOME 853 capture — review tooling only, not runtime.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node experiments/home-visual-fidelity/tools/capture_home_853.js \
 *       --out experiments/home-visual-fidelity/asset-round-3/HOME_CURRENT_853_R3.png
 *
 * Renders index.html at 853 CSS px, deviceScaleFactor 1, reduced motion, in ONE viewport sized
 * to document.scrollHeight (not a stitched full-page capture — see ../README.md), then asks CDP
 * CSS.getPlatformFontsForNode which family actually rasterised each text node, so a fallback
 * face can never pass as the shipped stack. Prints JSON: size, sha256, fonts per probe.
 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', 'HOME_CURRENT_853.png'));
const PAGE = arg('--page', 'index.html');
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
const PROBES = [
  ['brand', '.hc-brand'], ['h1', '.hc-hero-title'], ['hero-sub', '.hc-hero-sub'], ['hero-cta', '.hc-hero-cta-label'],
  ['hero-aside', '.hc-hero-aside-line'], ['scroll-cue', '.hc-hero-scroll-label'], ['trace-year', '.hc-trace-year'],
  ['cities-title', '#hc-cities-title'], ['cities-note', '.hc-section-note'], ['city-name', '.hc-city-name'],
  ['city-q', '.hc-city-q-line'], ['works-title', '#hc-works-title'], ['work-label', '.hc-work-label'],
  ['thread-heading', '.hc-thread-heading'], ['thread-pill', '.hc-thread-pill'], ['thread-title', '.hc-thread-title'],
  ['thread-sub', '.hc-thread-sub'], ['node-kind', '.hc-node-kind'], ['node-name', '.hc-node-name'],
  ['thread-read', '.hc-thread-read'], ['reality-title', '#hc-reality-title'], ['reality-line', '.hc-reality-line'],
  ['reality-cta', '.hc-reality-cta-label'],
];
(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  /* checker-imaging（compositor 側の遅延 decode）が JPEG の縮小 decode scale を run ごとに
     変え、thread 画像の 43 px が ±2/255 揺れて sha256 が一致しないことがある（Round 4 で判明、
     MAE 0.0・目視差なし）。無効化すると Round 3 Golden と毎回 byte 一致する。 */
  const browser = await chromium.launch({ args: ['--disable-checker-imaging', '--disable-partial-raster'] });
  const ctx = await browser.newContext({ viewport: { width: 853, height: 1844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('requestfailed ' + r.url()));
  await page.goto(base + PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
  /* Round 4 で判明: JPEG の縮小 decode 経路が load 直後の timing で揺れ、thread 画像の
     43 px が ±2/255 だけ変わる（MAE 0.0、目視差なし）ことがある。img.decode() を
     全画像に待つと表示 size での decode に揃い、Round 3 の Golden と byte 一致する。 */
  await page.evaluate(() => Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => null))));
  await page.waitForTimeout(500);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const docW = await page.evaluate(() => document.documentElement.scrollWidth);
  if (docH !== 1844) await page.setViewportSize({ width: 853, height: docH });
  await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const fonts = {};
  for (const [name, sel] of PROBES) {
    try {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      if (!nodeId) { fonts[name] = 'NODE_NOT_FOUND ' + sel; continue; }
      const { fonts: pf } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      fonts[name] = pf.map((f) => `${f.familyName}${f.isCustomFont ? '(custom)' : ''}:${f.glyphCount}`).join(' | ') || 'NO_GLYPHS';
    } catch (e) { fonts[name] = 'ERR ' + e.message; }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  const buf = fs.readFileSync(OUT);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const sections = await page.evaluate(() => document.querySelectorAll('#main > section, #main > header, .hc-hero, .hc-sheet > section').length);
  const rects = await page.evaluate(() => {
    const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y + window.scrollY), Math.round(b.width), Math.round(b.height)]; };
    return { hero: r('.hc-hero'), cities: r('.hc-city-grid'), works: r('.hc-work-grid'), thread: r('.hc-thread'), strip: r('.hc-reality-strip'), spots: r('.hc-reality-cta') };
  });
  console.log(JSON.stringify({ out: path.relative(ROOT, OUT), docW, docH, sha256, bytes: buf.length, rects, sections, errors, fonts }, null, 2));
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
