#!/usr/bin/env node
/* Visual Canonical V2 の 5 状態を 390×844 で render する（art-direction-v2 のみ。runtime には触れない）。
   NODE_PATH=/opt/node22/lib/node_modules node experiments/city-threads-immersive-koenji/qa/ad_v2_render.js */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PAGE = '/experiments/city-threads-immersive-koenji/art-direction-v2/index.html';
const OUT = path.resolve(__dirname, '..', 'docs', 'hq-review', 'v2');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve() {
  const s = http.createServer((q, r) => {
    const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '');
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    r.end(fs.readFileSync(f));
  });
  return new Promise((res) => s.listen(0, '127.0.0.1', () => res(s)));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = []; const external = []; const cspv = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (q) => { if (!q.url().startsWith(base)) external.push(q.url()); });
  await page.addInitScript(() => { window.__cspv = []; document.addEventListener('securitypolicyviolation', (e) => window.__cspv.push(e.violatedDirective)); });
  await page.goto(base + PAGE); await page.waitForTimeout(500);

  // A. Entrance
  await page.screenshot({ path: path.join(OUT, 'V2_A_ENTRANCE_390.png') });
  // B. First Pull midpoint（progress .50）
  await page.evaluate(() => window.__adv2.setProgress(0.5)); await page.waitForTimeout(250);
  const mid = await page.evaluate(() => { const ph = document.getElementById('photo'), pa = document.getElementById('paper'); return { photo: ph.style.transform + ' / ' + ph.style.opacity, paperTop: pa.getBoundingClientRect().top, paperW: pa.getBoundingClientRect().width, paperOp: pa.style.opacity, restOp: document.getElementById('pRest').style.opacity }; });
  await page.screenshot({ path: path.join(OUT, 'V2_B_FIRST_PULL_MID_390.png') });
  // C. 1957 arrived（progress 1）
  await page.evaluate(() => window.__adv2.setProgress(1)); await page.waitForTimeout(250);
  const arr = await page.evaluate(() => { const pa = document.getElementById('paper').getBoundingClientRect(); return { top: pa.top, width: pa.width, left: pa.left, photoOp: document.getElementById('photo').style.opacity }; });
  await page.screenshot({ path: path.join(OUT, 'V2_C_1957_390.png') });
  // D. Evidence（footnote inline）：source 行を viewport 上部へ寄せてから開く
  await page.evaluate(() => { const b = document.getElementById('fnOpen').getBoundingClientRect(); window.scrollTo({ top: window.scrollY + b.top - 150, behavior: 'instant' }); }); await page.waitForTimeout(150);
  const before = await page.evaluate(() => window.scrollY);
  await page.click('#fnOpen'); await page.waitForTimeout(200);
  const fnState = await page.evaluate(() => ({ open: document.getElementById('fn1').classList.contains('is-open'), focus: document.activeElement?.id, scrollY: window.scrollY }));
  await page.screenshot({ path: path.join(OUT, 'V2_D_EVIDENCE_390.png') });
  await page.click('#fnClose'); await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({ open: document.getElementById('fn1').classList.contains('is-open'), focus: document.activeElement?.id, scrollY: window.scrollY }));
  // E. Ending
  await page.evaluate(() => document.getElementById('ending').scrollIntoView({ behavior: 'instant', block: 'start' })); await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, 'V2_E_ENDING_390.png') });

  const overflow = await page.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, iw: window.innerWidth }));
  const report = { mid, arrived: arr, footnote: { before, fnState, after, restored: after.scrollY === before && after.focus === 'fnOpen' }, overflow, errors, external, cspv: await page.evaluate(() => window.__cspv) };
  fs.writeFileSync(path.join(OUT, 'render_report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(2); });
