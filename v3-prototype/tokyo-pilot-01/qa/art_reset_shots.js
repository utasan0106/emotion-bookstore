#!/usr/bin/env node
/* Art Direction の最終 screenshot を決まった名前で出す。
   NODE_PATH=/opt/node22/lib/node_modules node qa/art_reset_shots.js */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'art-reset');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css',
  '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve() {
  const s = http.createServer((q, r) => {
    const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    r.end(fs.readFileSync(f));
  });
  return new Promise(res => s.listen(0, '127.0.0.1', () => res(s)));
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const CASES = [
    { name: 'MOBILE_390', vp: { width: 390, height: 844 }, mobile: true },
    { name: 'DESKTOP_1440', vp: { width: 1440, height: 1000 }, mobile: false }
  ];
  for (const c of CASES) {
    const ctx = await browser.newContext({
      viewport: c.vp, deviceScaleFactor: 2, isMobile: c.mobile, hasTouch: c.mobile, reducedMotion: 'reduce'
    });
    const page = await ctx.newPage();
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
    await page.waitForFunction(() => Array.from(document.images).every(i => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `V3_TOKYO_ART_RESET_${c.name}.png`) });
    await page.click('.object-card:nth-child(1) .open-button');
    await page.waitForSelector('.detail-dialog[open]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `V3_TOKYO_ART_RESET_DETAIL_${c.name}.png`) });
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log('ART_RESET_SHOTS_OK ->', OUT);
})().catch(e => { console.error(e); process.exit(1); });
