#!/usr/bin/env node
/* HQ Visual Review Pack を生成する。runtime は変更しない。
   NODE_PATH=/opt/node22/lib/node_modules node experiments/city-threads-immersive-koenji/qa/hq_review_pack.js
   出力：docs/hq-review/HQ_VISUAL_REVIEW_CONTACT_SHEET.png、docs/hq-review/HQ_FIRST_PULL_SEQUENCE/ */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PAGE = '/experiments/city-threads-immersive-koenji/index.html';
const EVID = path.join(__dirname, 'evidence');
const OUT = path.resolve(__dirname, '..', 'docs', 'hq-review');
const SEQ = path.join(OUT, 'HQ_FIRST_PULL_SEQUENCE');
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
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SEQ, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();

  // ---- 不足フレームを撮る（390：1970年代／Evidence Closed、Reduced：1957） ----
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(base + PAGE); await page.waitForTimeout(400);
    await page.click('#trace'); await page.waitForTimeout(300);
    await page.click('#goOrigin'); await page.waitForTimeout(1000);
    await page.evaluate(() => document.querySelector('#b1 [data-inspect]').scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(EVID, 'im_390_10_evidence_closed.png') });
    await page.click('[data-go="b2"]'); await page.waitForTimeout(900);
    await page.click('[data-go="b3"]'); await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(EVID, 'im_390_11_mid_1970s.png') });
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(base + PAGE); await page.waitForTimeout(300);
    await page.click('#trace'); await page.waitForTimeout(100);
    await page.click('#goOrigin'); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(EVID, 'im_390_12_reduced_1957.png') });
    await ctx.close();
  }

  // ---- Contact sheet の並び ----
  const cells = [
    ['A', 'Mobile 390', 'Entrance / 2026', 'idle', 'im_390_01_entrance.png'],
    ['B', 'Mobile 390', 'Entrance / 2026', 'trace touched（First Pull 直前）', 'im_390_02_touched.png'],
    ['C', 'Mobile 390', '2026 → 1957', 'First Pull 途中（scroll 3/5）', 'im_390_seq_firstpull_3.png'],
    ['D', 'Mobile 390', '1957 / 1 of 5', 'arrived', 'im_390_03_1957.png'],
    ['E', 'Mobile 390', '1960年代 / 2 of 5', 'arrived', 'im_390_05_mid_1960s.png'],
    ['F', 'Mobile 390', '1976 / 3 of 5', 'arrived', 'im_390_11_mid_1970s.png'],
    ['G', 'Mobile 390', '1957 / 資料 01', 'evidence closed', 'im_390_10_evidence_closed.png'],
    ['H', 'Mobile 390', '1957 / 資料 01', 'evidence open', 'im_390_04_evidence_open.png'],
    ['I', 'Mobile 390', '2026 / 5 of 5', 'current（写真が戻る）', 'im_390_06_ending.png'],
    ['J', 'Mobile 390', '2026 / 5 of 5', 'ending（出口）', 'im_390_07_ending_exit.png'],
    ['K', 'Desktop 1440', 'Entrance / 2026', 'idle', 'im_1440_01_entrance.png'],
    ['L', 'Desktop 1440', '1957 / 1 of 5', 'arrived', 'im_1440_03_1957.png'],
    ['M', 'Desktop 1440', '1960年代 / 2 of 5', 'arrived', 'im_1440_05_mid_1960s.png'],
    ['N', 'Desktop 1440', '1957 / 資料 01', 'evidence open', 'im_1440_04_evidence_open.png'],
    ['O', 'Desktop 1440', '2026 / 5 of 5', 'ending', 'im_1440_06_ending.png'],
    ['P', 'Reduced motion 390', '1957 / 1 of 5', 'arrived（Z移動なし）', 'im_390_12_reduced_1957.png'],
    ['Q', 'Reduced motion 390', '1957 / 資料 01', 'evidence open', 'im_390_09_reduced_inspect.png'],
  ];
  const cell = (c) => `<figure class="${c[1].startsWith('Desktop') ? 'd' : 'm'}"><img src="${b64(path.join(EVID, c[4]))}"><figcaption><b>${c[0]}</b> ${c[1]} · ${c[2]} · ${c[3]}</figcaption></figure>`;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#e9e4da;font-family:-apple-system,"Hiragino Sans","Noto Sans CJK JP",sans-serif;color:#1b2226;padding:28px}
    h1{font-size:15px;font-weight:500;margin:0 0 14px;letter-spacing:.04em}
    .row{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-bottom:22px}
    figure{margin:0}
    figure.m img{width:238px;display:block;box-shadow:0 2px 8px rgba(0,0,0,.25)}
    figure.d img{width:600px;display:block;box-shadow:0 2px 8px rgba(0,0,0,.25)}
    figcaption{font-size:11px;line-height:1.5;margin-top:6px;max-width:238px;color:#3a3f3e}
    figure.d figcaption{max-width:600px}
    figcaption b{font-size:13px;margin-right:6px}
  </style>
  <h1>City Threads Immersive — 高円寺 × 阿波おどり｜HQ Visual Review Contact Sheet（2026-09-02、branch claude/city-threads-v0.9-slice-p02tgg）</h1>
  <div class="row">${cells.slice(0, 5).map(cell).join('')}</div>
  <div class="row">${cells.slice(5, 10).map(cell).join('')}</div>
  <div class="row">${cells.slice(10, 13).map(cell).join('')}</div>
  <div class="row">${cells.slice(13, 15).map(cell).join('')}</div>
  <div class="row">${cells.slice(15, 17).map(cell).join('')}</div>`;
  {
    const ctx = await browser.newContext({ viewport: { width: 1900, height: 1200 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(html); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'HQ_VISUAL_REVIEW_CONTACT_SHEET.png'), fullPage: true });
    await ctx.close();
  }

  // ---- First Pull sequence：番号付きコピー＋横並びの strip ----
  const seqLabels = ['0 / 5　2026 の写真（Entrance、層を開いた直後）', '1 / 5', '2 / 5　写真が沈み始める', '3 / 5　1957 の紙が手前から入る', '4 / 5', '5 / 5　1957 到着'];
  const seqFiles = [];
  for (let k = 0; k <= 5; k++) {
    const src = path.join(EVID, `im_390_seq_firstpull_${k}.png`);
    const dst = path.join(SEQ, `0${k + 1}_firstpull_390_step${k}of5.png`);
    fs.copyFileSync(src, dst); seqFiles.push([dst, seqLabels[k]]);
  }
  const strip = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#e9e4da;font-family:-apple-system,"Hiragino Sans","Noto Sans CJK JP",sans-serif;color:#1b2226;padding:22px}
    h1{font-size:14px;font-weight:500;margin:0 0 12px}
    .row{display:flex;gap:14px}figure{margin:0}img{width:238px;display:block;box-shadow:0 2px 8px rgba(0,0,0,.25)}
    figcaption{font-size:11px;line-height:1.5;margin-top:6px;max-width:238px}figcaption b{font-size:13px;margin-right:6px}
  </style><h1>First Pull sequence — Mobile 390 · 2026 → 1957（scrollY を 0 → 1957 到達まで 5 等分）</h1>
  <div class="row">${seqFiles.map(([f, l], i) => `<figure><img src="${b64(f)}"><figcaption><b>${i + 1}</b>${l}</figcaption></figure>`).join('')}</div>`;
  {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    await page.setContent(strip); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SEQ, '00_STRIP_firstpull_390.png'), fullPage: true });
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log('OK', OUT);
})().catch((e) => { console.error(e); process.exit(2); });
