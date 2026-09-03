#!/usr/bin/env node
/* City Threads Immersive（高円寺 × 阿波おどり）isolated prototype の実ブラウザ検査。
   NODE_PATH=/opt/node22/lib/node_modules node experiments/city-threads-immersive-koenji/qa/im_qa.js
   ローカル静的サーバ（repo root）のみ。外部リクエスト・CSP違反・idle rAF を検出して FAIL。 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DIR = '/experiments/city-threads-immersive-koenji/';
const PAGE = DIR + 'index.html';
const EVID = path.join(__dirname, 'evidence');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const VIEWPORTS = [[320, 568], [390, 844], [430, 932], [1024, 768], [1440, 900]];
const FORBIDDEN = ['おすすめ', 'ランキング', '人気順', '下北沢', '公式確認済', '完全確認済', 'EXPLORE', 'DISCOVER', 'NEXT'];

let pass = 0; const fails = []; const perf = {};
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
const INIT = () => {
  window.__cspv = []; window.__raf = 0;
  document.addEventListener('securitypolicyviolation', (e) => window.__cspv.push(e.violatedDirective + ' ' + e.blockedURI));
  const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__raf++; return orig(cb); };
  window.__lcp = 0;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
};
const overflow = (page) => page.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, iw: window.innerWidth }));
const inView = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return !!r && r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0; }, sel);
const opacity = (page, i) => page.evaluate((i) => parseFloat(getComputedStyle(document.querySelector(`.layer[data-i="${i}"]`)).opacity), i);
const scrollable = (page) => page.evaluate(() => getComputedStyle(document.body).overflowY !== 'hidden' && document.scrollingElement.scrollHeight > window.innerHeight + 10);

(async () => {
  fs.mkdirSync(EVID, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();

  for (const [w, h] of VIEWPORTS) {
    const scope = `[${w}]`;
    const mobile = w < 900;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = []; const external = []; const requests = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (q) => { requests.push(q.url()); if (!q.url().startsWith(base)) external.push(q.url()); });
    await page.addInitScript(INIT);

    await page.goto(base + PAGE);
    await page.waitForTimeout(500);

    // --- Entrance ---
    check(scope, 'entrance: trace visible without scroll', await inView(page, '#trace'));
    check(scope, 'entrance: photo loaded', await page.$eval('.layer[data-i="0"] img', (im) => im.complete && im.naturalWidth > 0));
    check(scope, 'entrance: photo layer opacity 1', (await opacity(page, 0)) > 0.95);
    check(scope, 'entrance: 1957 layer not yet visible', (await opacity(page, 1)) < 0.05);
    check(scope, 'entrance: direction hidden', await page.$eval('#direction', (el) => el.hidden));
    const bodyText = await page.evaluate(() => document.body.innerText);
    for (const wrd of FORBIDDEN) check(scope, `forbidden word "${wrd}"`, !bodyText.includes(wrd));
    check(scope, 'no bridge element', (await page.$$('.bridge, #goBridge, .transfer')).length === 0);
    check(scope, 'page scrollable (no scroll lock)', await scrollable(page));
    if (mobile) await page.screenshot({ path: path.join(EVID, `im_${w}_01_entrance.png`) }); else await page.screenshot({ path: path.join(EVID, `im_${w}_01_entrance.png`) });

    // --- Trace touch → 文化の層 ---
    const photoTop0 = await page.evaluate(() => document.querySelector('.layer[data-i="0"]').getBoundingClientRect().top);
    const t0 = Date.now();
    await page.click('#trace');
    await page.waitForSelector('#direction.is-open', { timeout: 500 });
    check(scope, 'trace: feedback <=500ms', Date.now() - t0 <= 500, Date.now() - t0);
    await page.waitForTimeout(700);
    check(scope, 'trace: photo did not move', Math.abs((await page.evaluate(() => document.querySelector('.layer[data-i="0"]').getBoundingClientRect().top)) - photoTop0) < 2);
    check(scope, 'trace: direction shows 1957-2026 阿波おどり', await page.$eval('#direction', (el) => el.innerText.includes('1957') && el.innerText.includes('2026') && el.innerText.includes('阿波おどり')));
    check(scope, 'trace: primary action visible', await inView(page, '#goOrigin'));
    await page.screenshot({ path: path.join(EVID, `im_${w}_02_touched.png`) });

    // --- First Pull → 1957（連続キャプチャ：390 のみ） ---
    if (w === 390) {
      const target = await page.evaluate(() => document.getElementById('b1').offsetTop);
      for (let k = 0; k <= 5; k++) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(target * k / 5));
        await page.waitForTimeout(120);
        await page.screenshot({ path: path.join(EVID, `im_390_seq_firstpull_${k}.png`) });
      }
      // First Pull の中点（境界の 0.35vh 手前）
      await page.evaluate(() => window.scrollTo({ top: document.getElementById('b1').offsetTop - window.innerHeight * 0.35, behavior: 'instant' })); await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(EVID, 'im_390_13_firstpull_mid.png') });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(200);
    }
    await page.click('#goOrigin');
    await page.waitForTimeout(1000);
    check(scope, '1957: anchor year', (await page.textContent('#anchorYear')).startsWith('1957'));
    check(scope, '1957: progress 1/5', (await page.textContent('#anchorProgress')).includes('1 / 5'));
    check(scope, '1957: layer1 opacity 1', (await opacity(page, 1)) > 0.95);
    check(scope, '1957: present layer sunk but persists', (await opacity(page, 0)) > 0.1 && (await opacity(page, 0)) < 0.6, await opacity(page, 0));
    check(scope, '1957: hash', await page.evaluate(() => location.hash) === '#koenji/1957');
    check(scope, '1957: focus on heading', await page.evaluate(() => document.activeElement?.id) === 'h1');
    await page.screenshot({ path: path.join(EVID, `im_${w}_03_1957.png`) });

    // --- Evidence inspection ---
    await page.evaluate(() => document.querySelector('#b1 [data-inspect]').scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(200);
    const sy = await page.evaluate(() => window.scrollY);
    await page.click('#b1 [data-inspect]');
    await page.waitForTimeout(350);
    check(scope, 'inspect: dialog open', await page.$eval('#inspect', (d) => d.open));
    check(scope, 'inspect: shows source url', (await page.textContent('#inspectUrl')).includes('city.suginami.tokyo.jp'));
    check(scope, 'inspect: shows confirms', (await page.textContent('#inspectConfirms')).length > 10);
    check(scope, 'inspect: layer moved near', await page.evaluate(() => /translate3d\([^)]*\)/.test(document.querySelector('.layer[data-i="1"]').style.transform) && parseFloat(document.querySelector('.layer[data-i="1"]').style.transform.split(',')[2]) > 0) || await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
    check(scope, 'inspect: close button >= 44px', await page.$eval('#inspectClose', (b) => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width >= 44));
    check(scope, 'inspect: no verification-status wording', !/確認済|確認待ち|SOURCE/.test(await page.textContent('#inspect')));
    check(scope, 'page: no verification-status wording', !/確認済|確認待ち|出典特定/.test(await page.evaluate(() => document.body.innerText)));
    await page.screenshot({ path: path.join(EVID, `im_${w}_04_evidence_open.png`) });
    await page.keyboard.press('Escape'); await page.waitForTimeout(350);
    check(scope, 'inspect: Escape closes', !(await page.$eval('#inspect', (d) => d.open)));
    check(scope, 'inspect: scroll restored', Math.abs((await page.evaluate(() => window.scrollY)) - sy) < 2);
    check(scope, 'inspect: focus returned to button', await page.evaluate(() => document.activeElement?.hasAttribute('data-inspect')));
    check(scope, 'inspect: layer back', (await opacity(page, 1)) > 0.95 && (await page.evaluate(() => parseFloat(document.querySelector('.layer[data-i="1"]').style.transform.split(',')[2]))) <= 0.5);
    check(scope, 'inspect: page still scrollable', await scrollable(page));
    // Back ボタンでも閉じる
    await page.click('#b1 [data-inspect]'); await page.waitForTimeout(250);
    await page.goBack(); await page.waitForTimeout(350);
    check(scope, 'inspect: browser Back closes', !(await page.$eval('#inspect', (d) => d.open)) && (await page.textContent('#anchorProgress')).includes('1 / 5'));

    // --- Mid history ---
    await page.click('[data-go="b2"]'); await page.waitForTimeout(1000);
    check(scope, '1960s: anchor label', (await page.textContent('#anchorYear')).includes('1960年代'));
    check(scope, '1960s: layer2 here, layer1 sunk', (await opacity(page, 2)) > 0.95 && (await opacity(page, 1)) < 0.6 && (await opacity(page, 1)) > 0.1);
    await page.screenshot({ path: path.join(EVID, `im_${w}_05_mid_1960s.png`) });
    await page.click('[data-go="b3"]'); await page.waitForTimeout(900);
    check(scope, '1970s: anchor 1976', (await page.textContent('#anchorYear')).startsWith('1976'));
    await page.click('[data-go="b4"]'); await page.waitForTimeout(900);
    check(scope, '2025: anchor', (await page.textContent('#anchorYear')).startsWith('2025'));

    // --- Current / Ending ---
    await page.click('[data-go="b5"]'); await page.waitForTimeout(1000);
    check(scope, '2026: progress 5/5', (await page.textContent('#anchorProgress')).includes('5 / 5'));
    const opsEnd = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => opacity(page, i)));
    check(scope, '2026: present photo returns (<=0.86, >0.7)', opsEnd[5] > 0.7 && opsEnd[5] <= 0.87, opsEnd);
    check(scope, '2026: past layers persist (>=0.1)', opsEnd.slice(1, 5).every((o) => o >= 0.1), opsEnd);
    check(scope, 'ending: exits 3 groups / <=6 links', (await page.$$('#b5 .exit a.act')).length >= 3 && (await page.$$('#b5 .exit a.act')).length <= 6);
    check(scope, 'ending: official links new tab', await page.$$eval('#b5 .exit a.act', (as) => as.every((a) => a.target === '_blank' && a.rel.includes('noopener') && /koenji-awaodori\.com|city\.suginami\.tokyo\.jp/.test(a.href))));
    await page.screenshot({ path: path.join(EVID, `im_${w}_06_ending.png`) });
    await page.evaluate(() => document.querySelector('#b5 .closing').scrollIntoView({ behavior: 'instant', block: 'center' })); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(EVID, `im_${w}_07_ending_exit.png`) });

    // --- Back to start ---
    await page.click('[data-go="b0"]'); await page.waitForTimeout(1000);
    check(scope, 'return: entrance again', (await opacity(page, 0)) > 0.95 && (await page.textContent('#anchorProgress')).trim() === '');

    // --- idle：rAF 0 / overflow / console / external / CSP / qa ---
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__raf = 0; });
    await page.waitForTimeout(1000);
    check(scope, 'idle: rAF calls in 1s = 0', (await page.evaluate(() => window.__raf)) === 0, await page.evaluate(() => window.__raf));
    const o = await overflow(page); check(scope, 'no horizontal overflow', o.sw <= o.iw, o);
    check(scope, 'console error 0', errors.length === 0, errors);
    check(scope, 'external request 0', external.length === 0, external);
    check(scope, 'CSP violation 0', (await page.evaluate(() => window.__cspv)).length === 0, await page.evaluate(() => window.__cspv));
    check(scope, 'no request to qa/', requests.every((u) => !u.includes('/qa/')));
    const targets = await page.$$eval('.act, #trace', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 16), Math.round(r.width), Math.round(r.height)]; }).filter((t) => t[1] > 0));
    check(scope, 'targets >= 44px', targets.every((t) => t[1] >= 44 && t[2] >= 44), targets.filter((t) => t[1] < 44 || t[2] < 44));

    // --- perf（ローカル実測） ---
    const res = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => [r.name.split('/').pop(), r.transferSize || r.encodedBodySize]));
    perf[w] = { lcp_ms_local: Math.round(await page.evaluate(() => window.__lcp)), resources: res, html_bytes: fs.statSync(path.join(ROOT, PAGE)).size };
    await ctx.close();
  }

  // ---- Keyboard-only（1440） ----
  {
    const scope = '[kbd]';
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage(); await page.addInitScript(INIT);
    await page.goto(base + PAGE); await page.waitForTimeout(400);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    check(scope, 'Tab reaches trace', await page.evaluate(() => document.activeElement?.id) === 'trace');
    const fo = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, w: s.outlineWidth }; });
    check(scope, 'focus visible', fo.style !== 'none' && parseFloat(fo.w) >= 2, fo);
    await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    check(scope, 'Enter opens direction, focus primary', await page.evaluate(() => document.activeElement?.id) === 'goOrigin');
    await page.keyboard.press('Enter'); await page.waitForTimeout(1000);
    check(scope, 'Enter walks to 1957', (await page.textContent('#anchorYear')).startsWith('1957') && (await page.evaluate(() => document.activeElement?.id)) === 'h1');
    let hops = 0, found = false;
    while (hops < 6) { await page.keyboard.press('Tab'); hops++; if (await page.evaluate(() => document.activeElement?.hasAttribute('data-inspect'))) { found = true; break; } }
    check(scope, 'Tab reaches inspect button', found, hops);
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    check(scope, 'Enter opens inspect, focus inside', await page.evaluate(() => document.getElementById('inspect').open && document.getElementById('inspect').contains(document.activeElement)));
    await page.keyboard.press('Escape'); await page.waitForTimeout(350);
    check(scope, 'Escape closes, focus returns', !(await page.$eval('#inspect', (d) => d.open)) && (await page.evaluate(() => document.activeElement?.hasAttribute('data-inspect'))));
    await page.screenshot({ path: path.join(EVID, 'im_1440_08_keyboard_focus.png') });
    await ctx.close();
  }

  // ---- Reduced motion（390） ----
  {
    const scope = '[reduced]';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); await page.addInitScript(INIT);
    await page.goto(base + PAGE); await page.waitForTimeout(300);
    check(scope, 'entrance layers: step opacity', (await opacity(page, 0)) === 1 && (await opacity(page, 1)) <= 0.13);
    await page.click('#trace'); await page.waitForTimeout(60);
    check(scope, 'direction instant', await page.$eval('#direction', (el) => el.classList.contains('is-open') && getComputedStyle(el).opacity === '1'));
    await page.click('#goOrigin'); await page.waitForTimeout(200);
    check(scope, 'year instant', (await page.textContent('#anchorYear')).startsWith('1957'));
    check(scope, 'layers switch without Z travel', await page.evaluate(() => Array.from(document.querySelectorAll('.layer')).every((l) => Math.abs(parseFloat(l.style.transform.split(',')[2])) < 0.01)));
    check(scope, 'meaning kept: layer1 opaque, others faint', (await opacity(page, 1)) === 1 && (await opacity(page, 0)) <= 0.13);
    await page.click('#b1 [data-inspect]'); await page.waitForTimeout(80);
    check(scope, 'inspect instant', await page.$eval('#inspect', (d) => d.open));
    await page.screenshot({ path: path.join(EVID, 'im_390_09_reduced_inspect.png') });
    await ctx.close();
  }

  await browser.close(); server.close();
  fs.writeFileSync(path.join(EVID, 'perf_local.json'), JSON.stringify(perf, null, 2));
  console.log(`PASS ${pass}  FAIL ${fails.length}`);
  fails.forEach((f) => console.log('  FAIL', f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
