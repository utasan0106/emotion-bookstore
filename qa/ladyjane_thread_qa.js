#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const BASE = '18aaba707fc382e8b5e791da8a1cba9460240857';
const out = process.argv[2];
let pass = 0;
function check(ok, message) { if (!ok) throw new Error(message); pass++; }
function load(code) { const c = { window: {} }; vm.runInNewContext(code, c); return c.window.V3_THREAD_CONTENT; }
const current = load(fs.readFileSync(path.join(ROOT, 'thread_content.js'), 'utf8'));
const before = load(execFileSync('git', ['show', BASE + ':thread_content.js'], { cwd: ROOT, encoding: 'utf8' }));
check(JSON.stringify(current.threads.slice(0, 4)) === JSON.stringify(before.threads), 'existing four Threads unchanged');
const t = current.threads[4];
check(t.threadId === 'shimokitazawa-ladyjane' && t.scenes.length === 4, 'finite LADYJANE identity');
for (const r of t.relations) {
  check(t.nodes.some(n => n.id === r.from) && t.nodes.some(n => n.id === r.to), 'relation endpoints resolve');
  check(r.spatial.resolution === 'not_applicable' && !r.temporal, 'no invented historical location or date');
}
for (const r of t.facts.concat(t.relations)) check(r.sourceIds.length === 1 && r.sourceIds.every(id => t.sources.some(s => s.id === id)) && r.verificationState === 'single_source', 'single source resolves');
for (const s of t.scenes) {
  check((s.relationIds || []).every(id => t.relations.some(r => r.id === id)), 'scene relations resolve');
  check((s.factIds || []).every(id => t.facts.some(r => r.id === id)), 'scene facts resolve');
  if (s.editorialReading) check(s.editorialReading.refs.every(id => t.relations.some(r => r.id === id)), 'editorial references resolve');
}
for (const f of ['release_content.js', 'works.html', 'data.html', 'vercel.json', '.vercelignore', 'release.css', 'thread.css']) {
  // Works includes the accepted Boris context and SUNSET NOTES additions.
  const baseline = f === 'works.html' ? 'c57ca7c6edfd8854ccb19f528186874d14308355' : BASE;
  check(fs.readFileSync(path.join(ROOT, f)).equals(execFileSync('git', ['show', baseline + ':' + f], { cwd: ROOT })), 'protected file unchanged: ' + f);
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = path.resolve(ROOT, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    if (out) fs.mkdirSync(out, { recursive: true });
    for (const width of [390, 430, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const external = [], errors = [];
      await page.route('**/*', route => {
        if (route.request().url().startsWith(origin + '/')) return route.continue();
        external.push(route.request().url()); return route.abort();
      });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/shelf.html?shelf=shimokitazawa');
      await page.waitForSelector('.shelf-reading-link');
      check(await page.locator('.object-card').count() === 3, 'Shelf exactly three Objects ' + width);
      check(await page.locator('.shelf-reading-link').count() === 1, 'one reading entry ' + width);
      check(await page.locator('.end-plate').innerText().then(s => s.includes('この棚は、3つで終わりです。')), 'finite Shelf end ' + width);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Shelf overflow zero ' + width);
      if (out) await page.locator('#shelfReading').screenshot({ path: path.join(out, 'ladyjane-shelf-' + width + '.png') });
      await page.locator('.shelf-reading-link').click();
      await page.waitForSelector('[data-thread-id="shimokitazawa-ladyjane"]');
      await page.evaluate(() => document.fonts.ready);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const { root: domRoot } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: domRoot.nodeId, selector: 'h1' });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      check(fonts.some(f => /Noto Serif|Mincho/i.test(f.familyName) && f.glyphCount > 0), 'Japanese title font actually rendered ' + width);
      console.log('rendered title fonts', width, fonts.map(f => f.familyName).join(', '));
      await cdp.detach();
      const m = await page.evaluate(() => {
        const img = document.querySelector('.th-figure-image');
        return { title: document.querySelector('h1').textContent, scenes: document.querySelectorAll('.th-scene').length,
          overflow: document.documentElement.scrollWidth > innerWidth,
          photo: img.complete && img.naturalWidth === 1024 && img.naturalHeight === 768,
          caption: document.querySelector('figcaption').textContent,
          ga: !!window.gtag || !!window.dataLayer,
          maps: document.querySelectorAll('canvas, iframe, .th-spatial-entry').length,
          font: getComputedStyle(document.querySelector('h1')).fontFamily };
      });
      check(m.title === t.title && m.scenes === 4, 'LADYJANE title and scenes ' + width);
      check(!m.overflow && m.photo && !m.ga && m.maps === 0, 'image loads, no overflow/GA4/map ' + width);
      check(m.caption.includes('2008年3月') && m.caption.includes('Guwashi999') && m.caption.includes('CC BY 2.0'), 'photo attribution ' + width);
      for (const detail of await page.locator('.th-evidence').all()) {
        await detail.locator('summary').click();
        const id = await detail.evaluate(el => { const card = el.closest('[data-fact-id], [data-relation-id]'); return card.dataset.factId || card.dataset.relationId; });
        const claim = t.facts.concat(t.relations).find(item => item.id === id);
        const expected = claim.sourceIds.map(id => t.sources.find(source => source.id === id).url);
        const actual = await detail.locator('.th-source-link').evaluateAll(links => links.map(link => link.getAttribute('href')));
        check(JSON.stringify(actual) === JSON.stringify(expected), 'source drawer matches its claim: ' + id);
      }
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'open evidence overflow zero ' + width);
      if (out) await page.screenshot({ path: path.join(out, 'ladyjane-evidence-' + width + '.png'), fullPage: true });
      for (const detail of await page.locator('.th-evidence').all()) await detail.locator('summary').click();
      await page.locator('h1').click();
      if (out) await page.screenshot({ path: path.join(out, 'ladyjane-thread-' + width + '.png'), fullPage: true });
      await page.locator('.th-figure a').click();
      check(await page.locator('#suzunari-2008').count() === 1, 'credit anchor resolves ' + width);
      await page.goBack();
      check(JSON.stringify(await page.locator('.th-destination-link').evaluateAll(links => links.map(link => link.getAttribute('href')))) === JSON.stringify(t.realityDestinations.map(d => d.url)), 'exact official exit ' + width);
      await page.locator('.th-exit').click();
      await page.waitForSelector('.object-card');
      check(page.url().endsWith('shelf.html?shelf=shimokitazawa'), 'returns to originating Shelf ' + width);
      await page.goto(origin + '/thread.html?thread=not-a-thread');
      check(await page.locator('.th-lost').count() === 1 && await page.locator('.th-scene').count() === 0, 'unknown Thread fail closed ' + width);
      check(external.length === 0 && errors.length === 0, 'external runtime requests and JS errors zero ' + width);
      console.log('viewport', width, 'font', m.font);
      await page.close();
    }
    console.log('LADYJANE_THREAD_QA_GO (' + pass + ' checks)');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
