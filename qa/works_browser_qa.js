#!/usr/bin/env node
/* Current split-page browser contract (2026-09-08).
   Supersedes the old four-long-sections-on-one-page expectations in git history.
   Run only when browser verification is requested: node qa/works_browser_qa.js
   External responses are stubbed. This tests player loading, never actual media playback. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const ids = ['book', 'film', 'music', 'video'];
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  let file = path.resolve(root, '.' + rel);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream'});
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch();
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce'});
      const external = [], errors = [];
      await context.route(url => url.origin !== base, route => route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>provider stub</title>'}));
      context.on('request', req => { if (new URL(req.url()).origin !== base) external.push(req.url()); });
      await context.addInitScript(() => {
        window.__writes = 0;
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (...args) { window.__writes++; return original.apply(this, args); };
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(String(e)));
      async function inspect(file, expected) {
        await page.goto(base + '/' + file, {waitUntil:'load'});
        await page.evaluate(() => document.fonts.ready);
        const state = await page.evaluate(() => ({
          wide:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          h1:document.querySelectorAll('h1').length,
          work:[...document.querySelectorAll('.wk-work[data-work]')].map(e=>e.dataset.work),
          short:document.querySelectorAll('.wk-entry').length,
          frames:document.querySelectorAll('iframe').length,
          writes:window.__writes,
          ga:typeof window.gtag,
          links:[...document.querySelectorAll('main a')].filter(e=>e.getClientRects().length).map(e=>({href:e.getAttribute('href'),height:e.getBoundingClientRect().height}))
        }));
        assert.equal(state.wide, false, file + ' horizontal overflow at ' + width);
        assert.equal(state.h1, 1);
        assert.deepEqual(state.work, expected);
        assert.equal(state.frames, 0);
        assert.equal(state.writes, 0);
        assert.equal(state.ga, 'undefined');
        assert.equal(new Set(state.links.map(l=>l.href)).size, state.links.length, file + ': duplicate destination');
        assert.ok(state.links.every(l=>l.height >= 44), file + ': main target smaller than 44px');
        assert.equal(external.length, 0, file + ': external request before consent');
        await page.click('#siteMenuButton');
        await page.waitForSelector('#siteMenu[open]');
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(()=>document.activeElement.id), 'siteMenuButton');
        return state;
      }
      assert.equal((await inspect('works.html', [])).short, 4);
      for (const id of ids) {
        await page.goto(base + '/works.html#' + id);
        await page.locator('#' + id + ' .wk-route').click();
        await page.waitForURL(base + '/work-' + id + '.html');
        await inspect('work-' + id + '.html', [id]);
        await page.locator('.wk-back a').focus();
        assert.equal(await page.evaluate(()=>document.activeElement.matches(':focus-visible')), true);
        await page.keyboard.press('Enter');
        await page.waitForURL(base + '/works.html#' + id);
        await page.goBack();
        await page.waitForURL(base + '/work-' + id + '.html');
      }
      for (const id of ['book','film']) {
        await page.goto(base + '/work-' + id + '.html');
        await page.locator('.wk-work .wk-route').click();
        await page.waitForSelector('.th-thread[data-thread-id="morisaki-' + id + '"]');
        await page.goBack();
        await page.waitForURL(base + '/work-' + id + '.html');
      }
      await page.goto(base + '/work-music.html');
      await page.locator('.wk-work .wk-route').click();
      await page.waitForURL(url=>url.pathname.endsWith('/shimokitazawa/') && url.searchParams.get('recording') === 'shelter');
      assert.equal(await page.locator('button[data-recording="shelter"]').getAttribute('aria-pressed'), 'true');
      await page.goBack();
      await page.waitForURL(base + '/work-music.html');
      // HOME cards each navigate directly to their work page.
      for (const id of ids) {
        await page.goto(base + '/index.html');
        await page.locator('.hc-work[data-work="' + id + '"]').click();
        await page.waitForURL(base + '/work-' + id + '.html');
      }
      await page.goto(base + '/work-video.html');
      assert.equal(external.length, 0);
      await page.locator('.v3-video-load').click();
      const frame = page.locator('.v3-video iframe');
      await frame.waitFor();
      const src = await frame.getAttribute('src');
      assert.ok(src.startsWith('https://www.youtube-nocookie.com/embed/dt33RGSRuo0'));
      assert.ok(!src.includes('autoplay=1'));
      assert.equal(await page.locator('.v3-video iframe').count(), 1);
      assert.ok(external.every(url=>url.startsWith('https://www.youtube-nocookie.com/embed/dt33RGSRuo0')));
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS split-work browser routes, first-load privacy, focus/menu, widths 320–1440, click-to-load video (stub only)');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{ console.error(error); process.exitCode=1; });
