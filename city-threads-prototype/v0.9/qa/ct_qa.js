#!/usr/bin/env node
/* City Threads v0.9 isolated prototype の実ブラウザ検査。
   NODE_PATH=/opt/node22/lib/node_modules node city-threads-prototype/v0.9/qa/ct_qa.js
   ローカルの静的サーバだけを使い、外向きの通信は一切しない（外部リクエストは検出して FAIL）。 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PAGE = '/city-threads-prototype/v0.9/index.html';
const EVID = path.join(__dirname, 'evidence');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const VIEWPORTS = [[390, 844], [430, 932], [768, 1024], [1440, 900]];
const FORBIDDEN_WORDS = ['おすすめ', 'ランキング', '人気順', 'EXPLORE', 'DISCOVER', 'JOURNEY', 'NEXT', 'VIEW MORE', 'TOUCH A CITY'];

let pass = 0; const fails = [];
function check(scope, name, ok, detail) { if (ok) { pass++; return; } fails.push(`${scope} ${name} ${detail === undefined ? '' : JSON.stringify(detail)}`); }

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

const overflow = (page) => page.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, iw: window.innerWidth }));
const inView = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return !!r && r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0; }, sel);
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { w: r.width, h: r.height } : null; }, sel);

(async () => {
  fs.mkdirSync(EVID, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();

  for (const [w, h] of VIEWPORTS) {
    const scope = `[${w}]`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = []; const external = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (q) => { if (!q.url().startsWith(base)) external.push(q.url()); });

    await page.goto(base + PAGE);
    await page.waitForTimeout(300);

    // 第一画面：一つの街・一つの年・一つの痕跡。スクロールなしで触る対象が見える
    check(scope, 'first-screen trace visible', await inView(page, '#cityTrace'));
    check(scope, 'first-screen hint visible', await inView(page, '#startHint'));
    check(scope, 'direction hidden before touch', await page.$eval('#direction', (el) => el.hidden));
    const bodyText = await page.evaluate(() => document.body.innerText);
    for (const wrd of FORBIDDEN_WORDS) check(scope, `forbidden word "${wrd}"`, !bodyText.includes(wrd));
    check(scope, 'no uppercase english labels', !/[A-Z]{4,}/.test(bodyText.replace(/URL|HQ/g, '')));
    await page.screenshot({ path: path.join(EVID, `v09_${w}_01_start.png`) });

    // Touch：0.5秒以内に文化の層（阿波おどり / 1957──2026）が立ち上がる
    const t0 = Date.now();
    await page.click('#cityTrace');
    await page.waitForSelector('#direction.is-open', { timeout: 500 });
    check(scope, 'touch feedback <=500ms', Date.now() - t0 <= 500, Date.now() - t0);
    check(scope, 'direction shows span 1957-2026', await page.$eval('#direction', (el) => el.innerText.includes('1957') && el.innerText.includes('2026') && el.innerText.includes('阿波おどり')));
    check(scope, 'primary action visible after touch', await inView(page, '#goOrigin'));
    const cityTop0 = await page.evaluate(() => document.getElementById('cityTrace').getBoundingClientRect().top);
    await page.waitForTimeout(250);
    check(scope, 'city name does not move on touch', Math.abs((await page.evaluate(() => document.getElementById('cityTrace').getBoundingClientRect().top)) - cityTop0) < 2);
    await page.screenshot({ path: path.join(EVID, `v09_${w}_02_touched.png`) });

    // Time walk：1957へさかのぼる → 錨の年が変わり、節目が読むmodeになる
    await page.click('#goOrigin');
    await page.waitForTimeout(900);
    check(scope, 'anchor year = 1957', (await page.textContent('#anchorYear')).startsWith('1957'));
    check(scope, 'progress 1/5', (await page.textContent('#anchorProgress')).includes('1 / 5'));
    check(scope, 'node 1957 is-here', await page.$eval('#n-1957', (el) => el.classList.contains('is-here')));
    check(scope, 'hash koenji/1957', await page.evaluate(() => location.hash) === '#koenji/1957');
    await page.screenshot({ path: path.join(EVID, `v09_${w}_03_1957.png`) });

    // Scroll で歩く：次の節目に着くと年が進む
    await page.evaluate(() => document.getElementById('n-1960s').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(700);
    check(scope, 'scroll → 1960s year label', (await page.textContent('#anchorYear')).includes('1960年代'));
    check(scope, 'scroll → progress 2/5', (await page.textContent('#anchorProgress')).includes('2 / 5'));

    // Button で歩く：2025 → 2026
    await page.click('[data-go="n-1970s"]'); await page.waitForTimeout(700);
    await page.click('[data-go="n-2025"]'); await page.waitForTimeout(700);
    check(scope, 'anchor 2025', (await page.textContent('#anchorYear')).startsWith('2025'));
    await page.screenshot({ path: path.join(EVID, `v09_${w}_04_2025.png`) });
    await page.click('[data-go="n-2026"]'); await page.waitForTimeout(700);
    check(scope, 'anchor 2026 / 5/5', (await page.textContent('#anchorProgress')).includes('5 / 5'));
    check(scope, 'exit actions visible', (await page.$$('#n-2026 .exit a.act')).length >= 3 && (await page.$$('#n-2026 .exit a.act')).length <= 5);
    check(scope, 'exit links open official in new tab', await page.$$eval('#n-2026 .exit a.act', (as) => as.every((a) => a.target === '_blank' && a.rel.includes('noopener') && /koenji-awaodori\.com|city\.suginami\.tokyo\.jp/.test(a.href))));
    await page.screenshot({ path: path.join(EVID, `v09_${w}_05_2026.png`) });
    await page.evaluate(() => document.getElementById('bridge').scrollIntoView({ behavior: 'instant', block: 'center' })); await page.waitForTimeout(300);
    check(scope, 'bridge visible in 2026 node', await inView(page, '#goBridge'));
    await page.screenshot({ path: path.join(EVID, `v09_${w}_05b_bridge.png`) });

    // 横糸：同じ年のまま街が変わる。戻ると完全復元
    await page.click('#goBridge'); await page.waitForTimeout(800);
    check(scope, 'transfer city = 下北沢', (await page.textContent('#anchorCity')) === '下北沢');
    check(scope, 'transfer year stays 2026', (await page.textContent('#anchorYear')).startsWith('2026'));
    check(scope, 'transfer hash', await page.evaluate(() => location.hash) === '#shimokitazawa/2026');
    check(scope, 'transfer sealed (no fact asserted)', await page.$eval('#transfer', (el) => el.innerText.includes('一次資料を確かめてから開きます')));
    check(scope, 'transfer focus on back button', await page.evaluate(() => document.activeElement?.id) === 'backBridge');
    await page.screenshot({ path: path.join(EVID, `v09_${w}_06_transfer.png`) });
    await page.goBack(); await page.waitForTimeout(800);
    check(scope, 'back restores 高円寺 2026', (await page.textContent('#anchorCity')) === '高円寺' && (await page.textContent('#anchorProgress')).includes('5 / 5'));
    check(scope, 'back restores focus to bridge', await page.evaluate(() => document.activeElement?.id) === 'goBridge');
    check(scope, 'back: transfer hidden', await page.$eval('#transfer', (el) => getComputedStyle(el).visibility === 'hidden'));

    // Touch target / overflow / console / external
    const targets = await page.$$eval('.act, #cityTrace', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 18), r.width, r.height]; }));
    check(scope, 'primary targets >= 44px', targets.every((t) => t[1] >= 44 && t[2] >= 44), targets.filter((t) => t[1] < 44 || t[2] < 44));
    const o = await overflow(page); check(scope, 'no horizontal overflow', o.sw <= o.iw, o);
    check(scope, 'console error 0', errors.length === 0, errors);
    check(scope, 'external request 0', external.length === 0, external);

    // URL復元：再読込で同じ節目へ
    await page.goto('about:blank'); await page.goto(base + PAGE + '#koenji/2025'); await page.waitForTimeout(500);
    check(scope, 'restore #koenji/2025', (await page.textContent('#anchorProgress')).includes('4 / 5'));

    await ctx.close();
  }

  // ---- Keyboard-only critical flow（1440） ----
  {
    const scope = '[kbd]';
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + PAGE); await page.waitForTimeout(300);
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // city trace
    check(scope, 'tab reaches city trace', await page.evaluate(() => document.activeElement?.id) === 'cityTrace');
    const fo = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, w: s.outlineWidth }; });
    check(scope, 'focus visible on city trace', fo.style !== 'none' && parseFloat(fo.w) >= 2, fo);
    await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    check(scope, 'Enter opens direction', await page.$eval('#direction', (el) => el.classList.contains('is-open')));
    check(scope, 'focus moves to primary action', await page.evaluate(() => document.activeElement?.id) === 'goOrigin');
    await page.keyboard.press('Enter'); await page.waitForTimeout(900);
    check(scope, 'Enter walks to 1957', (await page.textContent('#anchorYear')).startsWith('1957'));
    check(scope, 'focus lands on 1957 heading', await page.evaluate(() => document.activeElement?.id) === 't1957');
    // 見出し → 次の「進む」button まで Tab
    let hops = 0; let id = '';
    while (hops < 8) { await page.keyboard.press('Tab'); hops++; id = await page.evaluate(() => document.activeElement?.dataset?.go || ''); if (id === 'n-1960s') break; }
    check(scope, 'Tab reaches next-step button', id === 'n-1960s', hops);
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    check(scope, 'keyboard walk to 1960s', (await page.textContent('#anchorProgress')).includes('2 / 5'));
    await page.evaluate(() => document.getElementById('goBridge').focus());
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    check(scope, 'keyboard opens transfer', (await page.textContent('#anchorCity')) === '下北沢');
    await page.keyboard.press('Escape'); await page.waitForTimeout(800);
    check(scope, 'Escape returns to 高円寺', (await page.textContent('#anchorCity')) === '高円寺');
    await page.screenshot({ path: path.join(EVID, 'v09_1440_07_keyboard_focus.png') });
    await ctx.close();
  }

  // ---- Reduced motion：意味は残り、移動は 0s ----
  {
    const scope = '[reduced]';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(base + PAGE); await page.waitForTimeout(200);
    const durs = await page.evaluate(() => ['#direction', '#transfer', '#walk', '#anchor', '.node'].map((s) => getComputedStyle(document.querySelector(s)).transitionDuration));
    check(scope, 'transition durations 0s', durs.every((d) => d.split(',').every((x) => parseFloat(x) === 0)), durs);
    await page.click('#cityTrace'); await page.waitForTimeout(50);
    check(scope, 'direction opens instantly', await page.$eval('#direction', (el) => el.classList.contains('is-open') && getComputedStyle(el).opacity === '1'));
    await page.click('#goOrigin'); await page.waitForTimeout(150);
    check(scope, 'year changes instantly', (await page.textContent('#anchorYear')).startsWith('1957'));
    await page.click('[data-go="n-1960s"]'); await page.click('[data-go="n-1970s"]'); await page.click('[data-go="n-2025"]'); await page.click('[data-go="n-2026"]'); await page.waitForTimeout(200);
    await page.click('#goBridge'); await page.waitForTimeout(100);
    check(scope, 'transfer visible instantly', await page.$eval('#transfer', (el) => getComputedStyle(el).visibility === 'visible' && getComputedStyle(el).transform === 'none'));
    await page.screenshot({ path: path.join(EVID, 'v09_390_08_reduced_transfer.png') });
    await ctx.close();
  }

  // ---- 200% zoom 相当（1440 → CSS 720px 幅）で主要操作維持 ----
  {
    const scope = '[zoom200]';
    const ctx = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(base + PAGE); await page.waitForTimeout(200);
    check(scope, 'trace visible', await inView(page, '#cityTrace'));
    await page.click('#cityTrace'); await page.waitForTimeout(250);
    const r = await rect(page, '#goOrigin');
    check(scope, 'primary action present and >=44px', !!r && r.h >= 44, r);
    const o = await overflow(page); check(scope, 'no horizontal overflow', o.sw <= o.iw, o);
    await page.click('#goOrigin'); await page.waitForTimeout(800);
    check(scope, 'walk works', (await page.textContent('#anchorYear')).startsWith('1957'));
    await page.screenshot({ path: path.join(EVID, 'v09_1440_09_zoom200.png') });
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log(`PASS ${pass}  FAIL ${fails.length}`);
  fails.forEach((f) => console.log('  FAIL', f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
