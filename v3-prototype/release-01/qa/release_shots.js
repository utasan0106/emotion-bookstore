#!/usr/bin/env node
/* Release Candidate 01 の visual evidence。決まった名前で出す。 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'evidence');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg' };
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
(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const shot = async (name, url, opts) => {
    const o = opts || {};
    const ctx = await browser.newContext({
      viewport: { width: o.w || 390, height: o.h || 844 }, deviceScaleFactor: 2,
      isMobile: (o.w || 390) < 500, hasTouch: (o.w || 390) < 500, reducedMotion: 'reduce'
    });
    const page = await ctx.newPage();
    await page.goto(base + url, { waitUntil: 'load' });
    if (o.zoom) await page.evaluate((z) => { document.documentElement.style.zoom = z; }, o.zoom);
    await page.waitForFunction(() =>
      document.querySelectorAll('.shelf-entry').length === 4 ||
      document.querySelectorAll('.object-card').length === 3 ||
      document.querySelectorAll('#sg-category option').length === 5);
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(400);
    if (o.scrollTo) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ block: 'start' });
      }, o.scrollTo);
      await page.waitForTimeout(400);
    }
    if (o.open) {
      await page.click(`.object-card:nth-child(${o.open}) .open-button`);
      await page.waitForSelector('.detail-dialog[open]');
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('.detail-media img')).every((i) => i.complete && i.naturalWidth > 0));
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    await ctx.close();
  };
  await shot('RC01_FOYER_390', 'index.html');
  await shot('RC01_FOYER_1440', 'index.html', { w: 1440, h: 1000 });
  for (const id of ['tokyo', 'koenji', 'shimokitazawa', 'jinbocho']) {
    await shot(`RC01_SHELF_${id.toUpperCase()}_390`, `shelf.html?shelf=${id}`);
  }
  await shot('RC01_DETAIL_KOENJI_390', 'shelf.html?shelf=koenji', { open: 1 });
  await shot('RC01_DETAIL_SHIMOKITAZAWA_390', 'shelf.html?shelf=shimokitazawa', { open: 2 });
  await shot('RC01_DETAIL_JINBOCHO_390', 'shelf.html?shelf=jinbocho', { open: 3 });
  await shot('RC01_FOYER_390_ZOOM200', 'index.html', { zoom: 2 });
  await shot('RC01_SHELF_KOENJI_390_ZOOM200', 'shelf.html?shelf=koenji', { zoom: 2 });
  // Entrance V2
  await shot('RC02_FOYER_IDENTITY_DUALENTRY_390', 'index.html');
  await shot('RC02_SHELF_TOKYO_IDENTITY_FIRST_390', 'shelf.html?shelf=tokyo');
  await shot('RC02_FOYER_CATEGORY_BOOKS_390', 'index.html?category=books', { scrollTo: '.by-kind' });
  await shot('RC02_SUGGEST_390', 'suggest.html');
  await shot('RC02_FOYER_1440', 'index.html', { w: 1440, h: 1000 });
  await shot('RC02_FOYER_390_ZOOM200', 'index.html', { zoom: 2 });
  await shot('RC02_SHELF_TOKYO_390_ZOOM200', 'shelf.html?shelf=tokyo', { zoom: 2 });
  await browser.close(); server.close();
  console.log('RELEASE_SHOTS_OK ->', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
