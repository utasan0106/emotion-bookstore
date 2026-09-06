#!/usr/bin/env node
/* Fixed-clock browser probe — review tooling only, not runtime. Reads the shipped pages
 * over a local static server with Date frozen at each JST instant and records what the
 * runtime actually shows. No network. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
function serve() { const s = http.createServer((q, r) => { const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'; const f = path.join(ROOT, rel); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }); return new Promise((res) => s.listen(0, '127.0.0.1', () => res(s))); }
const TIMES = process.argv.slice(2);
const SHELVES = ['kichijoji', 'koenji', 'shimokitazawa', 'jinbocho'];
const STALE = /開催中|今週|上映中|続いている|いま/;
(async () => {
  const server = await serve(); const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const rows = [];
  for (const T of TIMES) {
    const fixed = Date.parse(T);
    const ctx = await browser.newContext({ viewport: { width: 853, height: 1844 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((ms) => { const R = Date; class F extends R { constructor(...a) { if (a.length === 0) super(ms); else super(...a); } static now() { return ms; } } window.Date = F; }, fixed);
    const errors = []; const ext = [];
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); });
    const row = { at: T, shelves: {} };
    await page.goto(base + 'index.html', { waitUntil: 'load' }); await page.waitForTimeout(300);
    row.home = await page.evaluate(() => ({ sections: document.querySelectorAll('.hc-hero, .hc-sheet > section').length, cities: document.querySelectorAll('.hc-city.shelf-entry').length, nodes: document.querySelectorAll('.hc-node').length }));
    for (const id of SHELVES) {
      await page.goto(base + `shelf.html?shelf=${id}`, { waitUntil: 'load' }); await page.waitForTimeout(300);
      row.shelves[id] = await page.evaluate((STALE) => {
        const wf = document.getElementById('weeklyFeature'); const grid = document.getElementById('objectGrid'); const main = document.getElementById('main');
        const mainText = main ? main.innerText : '';
        const wfText = wf && !wf.hidden ? wf.innerText.replace(/\s+/g, ' ') : '';
        return { weekly: wf && !wf.hidden ? (document.querySelector('.weekly-feature-title') || {}).textContent : 'HIDDEN', weeklyDate: wf && !wf.hidden ? (document.querySelector('.weekly-feature-date') || {}).textContent : '', cards: grid ? grid.querySelectorAll('.object-card').length : -1, closed: /この棚はいま準備中です。/.test(mainText), staleOnClosedShelf: /この棚はいま準備中です。/.test(mainText) && new RegExp(STALE).test(mainText.replace('この棚はいま準備中です。', '')) };
      }, STALE.source);
    }
    await page.goto(base + 'explore.html', { waitUntil: 'load' }); await page.waitForTimeout(300);
    row.explore = await page.evaluate(() => ({ archiveHidden: document.getElementById('categoryArchive').hidden, archiveRows: document.querySelectorAll('.archive-result-row').length, results: document.querySelectorAll('#categoryResults .result-row').length }));
    row.errors = errors; row.external = ext;
    rows.push(row); await ctx.close();
  }
  await browser.close(); server.close();
  console.log('| at (JST) | HOME sections/cities/nodes | kichijoji weekly / cards / closed | koenji | shimokitazawa | jinbocho | explore archive hidden / rows / results | JS err | external req |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const s = (id) => { const x = r.shelves[id]; return `${x.weekly === 'HIDDEN' ? 'weekly HIDDEN' : 'weekly「' + x.weekly + '」'} / ${x.cards} / ${x.closed ? 'CLOSED' : 'open'}${x.staleOnClosedShelf ? ' STALE!' : ''}`; };
    console.log(`| ${r.at} | ${r.home.sections}/${r.home.cities}/${r.home.nodes} | ${s('kichijoji')} | ${s('koenji')} | ${s('shimokitazawa')} | ${s('jinbocho')} | ${r.explore.archiveHidden}/${r.explore.archiveRows}/${r.explore.results} | ${r.errors.length} | ${r.external.length} |`);
  }
  fs.writeFileSync(path.join(path.dirname(process.argv[1]), 'fixed_clock_browser.json'), JSON.stringify(rows, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
