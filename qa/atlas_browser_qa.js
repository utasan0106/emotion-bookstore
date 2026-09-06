#!/usr/bin/env node
/* ATLAS BROWSER QA — 街を立体で辿る（β）/atlas/ の実ブラウザ検査（Production Beta 0、高円寺だけ）。
   ATLAS_KOENJI_RUNTIME_FALLBACK_ACCEPTANCE v0.2 の Gate A–D を、vercel.json の Content-Security-Policy を
   そのまま header に付けた local static server で確認する。
   - A. 通常ページ（HOME / Works / Thread / data / credits）: Cesium / PLATEAU / YouTube への request 0、CSP violation 0
   - B. Atlas、provider 遮断: 2.5D と story が使える、loading overlay が provider 待ちで固定されない、overflow 0
   - C. Atlas ?mode=2d: Cesium / PLATEAU への request 0
   - D. Atlas、provider 遅延（応答しない）: すぐ使える、操作可能
   - E. Atlas、provider 成功のエミュレーション（環境変数 CESIUM_LOCAL に CesiumJS 1.117 の Build/Cesium がある場合だけ）:
        cesium.com の script / worker / assets を local build で応答、PLATEAU tileset は空の tileset、imagery は 1×1 PNG。
        bounded CSP（unsafe-eval なし）で 3D layer へ切り替わるか、CSP violation が 0 かを見る。無い場合は NOT OBSERVABLE。
   使い方: NODE_PATH=/opt/node22/lib/node_modules node qa/atlas_browser_qa.js [--out <dir>] */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('--out', '');
const ROOT = path.resolve(__dirname, '..');
const CESIUM_LOCAL = process.env.CESIUM_LOCAL || '';
const CESIUM_BASE = 'https://cesium.com/downloads/cesiumjs/releases/1.117/Build/Cesium/';
const PROVIDER_RE = /cesium\.com|plateauview\.mlit\.go\.jp|plateau\.reearth\.io/;
const VIDEO_RE = /youtube|ytimg|googlevideo/;
const DECLARED = ['cesium.com', 'api.plateauview.mlit.go.jp', 'tile.plateauview.mlit.go.jp', 'assets.cms.plateau.reearth.io'];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.glsl': 'text/plain', '.xml': 'application/xml', '.txt': 'text/plain', '.md': 'text/markdown' };
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const PRODUCTION_CSP = vercel.headers.find((h) => h.source === '/(.*)').headers.find((h) => h.key === 'Content-Security-Policy').value;
/* test-only: ATLAS_CSP_OVERRIDE lets HQ evidence runs try a variant policy; the default is the exact vercel.json policy */
const CSP = process.env.ATLAS_CSP_OVERRIDE || PRODUCTION_CSP;
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const TILESET = JSON.stringify({ asset: { version: '1.1' }, geometricError: 500, root: { boundingVolume: { region: [2.4372, 0.6229, 2.4378, 0.6236, 0, 60] }, geometricError: 0, refine: 'ADD' } });

let pass = 0; const fails = []; const unobserved = [];
function check(scope, name, ok, detail) { if (ok) pass++; else fails.push(`${scope} ${name} ${detail === undefined ? '' : JSON.stringify(detail).slice(0, 700)}`); }
function notObservable(scope, name, why) { unobserved.push(`${scope} ${name}: ${why}`); }

function serve() {
  const s = http.createServer((q, r) => {
    const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '');
    let f = path.join(ROOT, rel || 'index.html');
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    const headers = { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' };
    /* production header contract (vercel.json) — CSP is enforced by the browser exactly as in production */
    for (const h of vercel.headers.find((x) => x.source === '/(.*)').headers) if (h.key !== 'Strict-Transport-Security') headers[h.key] = h.key === 'Content-Security-Policy' ? CSP : h.value;
    if (/^atlas\//.test(rel)) headers['X-Robots-Tag'] = 'noindex, nofollow';
    r.writeHead(200, headers); r.end(fs.readFileSync(f));
  });
  return new Promise((res) => s.listen(0, '127.0.0.1', () => res(s)));
}

async function open(browser, base, origin, pageName, opts) {
  const ctx = await browser.newContext(Object.assign({ deviceScaleFactor: 1, reducedMotion: opts && opts.motion ? 'no-preference' : 'reduce' }, opts && opts.context ? opts.context : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
  const external = []; const providerReqs = [];
  ctx.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin)) { external.push(u); if (PROVIDER_RE.test(u)) providerReqs.push(u); } });
  const page = await ctx.newPage();
  const errs = []; const cspConsole = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/.test(t)) cspConsole.push(t.slice(0, 200)); else if (m.type() === 'error') errs.push('console: ' + t.slice(0, 200)); });
  await page.addInitScript(() => {
    window.__cspv = []; document.addEventListener('securitypolicyviolation', (e) => { window.__cspv.push((e.violatedDirective || '') + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '')); });
    window.__perm = []; if (navigator.geolocation) { const g = navigator.geolocation; ['getCurrentPosition', 'watchPosition'].forEach((k) => { const o = g[k]; g[k] = function () { window.__perm.push(k); return o.apply(g, arguments); }; }); }
    window.__writes = 0; const so = Storage.prototype.setItem; Storage.prototype.setItem = function () { window.__writes++; return so.apply(this, arguments); };
  });
  return { ctx, page, external, providerReqs, errs, cspConsole, goto: async (p) => { await page.goto(base + (p || pageName), { waitUntil: 'load' }); } };
}
const ATLAS_STATE = () => ({
  loadingVisible: (() => { const l = document.getElementById('loading'); return !!l && getComputedStyle(l).display !== 'none'; })(),
  status: (document.getElementById('dataStatus') || {}).textContent, tech: (document.getElementById('techNote') || {}).textContent,
  title: (document.getElementById('title') || {}).textContent, year: (document.getElementById('year') || {}).textContent, claim: (document.getElementById('claim') || {}).textContent, precision: (document.getElementById('precision') || {}).textContent,
  timeline: document.querySelectorAll('#timeline button').length, activeIndex: [...document.querySelectorAll('#timeline button')].findIndex((b) => b.classList.contains('active')),
  fallback: !!document.querySelector('.fallback-city'), plateauLayers: document.querySelectorAll('.spatial-layer').length, cesiumCanvas: document.querySelectorAll('canvas').length, cesiumScript: !!document.querySelector('script[src*="cesium.com"]'), cesiumCss: !!document.querySelector('link[href*="cesium.com"]'),
  credit: (() => { const c = document.getElementById('mapCredit'); return !!c && !c.hidden; })(), switcherHidden: (document.getElementById('citySwitcher') || {}).hidden, cityTabs: document.querySelectorAll('.city-tab').length,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, back: (document.querySelector('.atlas-back-link') || {}).getAttribute ? document.querySelector('.atlas-back-link').getAttribute('href') : null,
  links: [...document.querySelectorAll('#links a')].map((a) => a.getAttribute('href')), h1: (document.querySelector('h1') || {}).textContent, docTitle: document.title, robots: (document.querySelector('meta[name="robots"]') || {}).content,
  iframes: document.querySelectorAll('iframe, video, audio').length, inputs: document.querySelectorAll('input, textarea, form').length, cspv: window.__cspv, perm: window.__perm, writes: window.__writes, ls: localStorage.length, ss: sessionStorage.length,
  compareOpen: document.getElementById('compareOverlay').classList.contains('open'), text: document.body.innerText,
});
const FORBIDDEN = ['東京高円寺阿波おどり', '高円寺阿波おどり', '高円寺阿波踊り'];

(async () => {
  const server = await serve(); const base = `http://127.0.0.1:${server.address().port}/`; const origin = new URL(base).origin;
  console.log('CSP policy under test: ' + (CSP === PRODUCTION_CSP ? 'vercel.json (production)' : 'OVERRIDE ' + CSP.slice(0, 160) + '…'));
  const browser = await chromium.launch({ args: ['--disable-checker-imaging', '--disable-partial-raster', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }); };

  /* ---- A. normal pages: no provider leak, no CSP violation ---- */
  for (const p of ['index.html', 'works.html', 'thread.html?thread=koenji-dance-history', 'thread.html?thread=morisaki-book', 'data.html', 'credits.html', 'shelf.html?shelf=koenji']) {
    const S = 'normal-' + p.replace(/[^a-z-]+/gi, '_');
    const o = await open(browser, base, origin, p);
    await o.goto(); await o.page.waitForTimeout(700);
    const st = await o.page.evaluate(() => ({ cspv: window.__cspv, iframes: document.querySelectorAll('iframe').length, cesium: !!document.querySelector('script[src*="cesium"], link[href*="cesium"]'), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
    check(S, 'no_provider_request_on_first_paint', o.providerReqs.length === 0 && o.external.every((u) => !VIDEO_RE.test(u)) && !st.cesium, { provider: o.providerReqs.slice(0, 3), external: o.external.slice(0, 3) });
    check(S, 'no_csp_violation_under_production_csp', st.cspv.length === 0 && o.cspConsole.length === 0, { cspv: st.cspv.slice(0, 3), console: o.cspConsole.slice(0, 3) });
    check(S, 'no_iframe_no_overflow_no_js_error', st.iframes === 0 && !st.overflow && o.errs.length === 0, { iframes: st.iframes, overflow: st.overflow, errs: o.errs.slice(0, 2) });
    await o.ctx.close();
  }

  /* ---- B. Atlas with providers blocked: 2.5D + story usable, overlay released, no fatal loop ---- */
  const VIEWPORTS = [{ w: 320, h: 568, m: true }, { w: 390, h: 844, m: true }, { w: 430, h: 932, m: true }, { w: 853, h: 1280, m: false }, { w: 1024, h: 768, m: false }, { w: 1440, h: 900, m: false }];
  for (const v of VIEWPORTS) {
    const S = `blocked-${v.w}`;
    const o = await open(browser, base, origin, 'atlas/', { context: { viewport: { width: v.w, height: v.h }, isMobile: v.m, hasTouch: v.m } });
    await o.ctx.route((url) => PROVIDER_RE.test(url.hostname), (r) => r.abort('failed'));
    const t0 = Date.now(); await o.goto();
    await o.page.waitForFunction(() => { const l = document.getElementById('loading'); return l && getComputedStyle(l).display === 'none'; }, null, { timeout: 8000 }).catch(() => {});
    const readyMs = Date.now() - t0;
    await o.page.waitForTimeout(900);
    const st = await o.page.evaluate(ATLAS_STATE);
    check(S, 'overlay_released_and_2_5d_story_usable_without_provider', !st.loadingVisible && readyMs < 8000 && st.fallback && st.timeline === 5 && st.activeIndex === 0 && st.year === '1957' && st.title === 'はじまる' && /1957年、高円寺ばか踊りが/.test(st.claim || '') && /一点の史跡としては置きません/.test(st.precision || ''), { readyMs, status: st.status, timeline: st.timeline, title: st.title });
    check(S, 'status_reports_fallback_not_a_hang', /2\.5D/.test(st.status || '') && !st.cesiumCanvas && st.plateauLayers >= 1, { status: st.status, tech: st.tech, canvas: st.cesiumCanvas });
    check(S, 'no_overflow_no_iframe_no_input_no_storage_no_geolocation', !st.overflow && st.iframes === 0 && st.inputs === 0 && st.writes === 0 && st.ls === 0 && st.ss === 0 && st.perm.length === 0, { overflow: st.overflow, inputs: st.inputs, writes: st.writes, perm: st.perm });
    check(S, 'no_csp_violation_and_no_fatal_error_loop', st.cspv.length === 0 && o.cspConsole.length === 0 && o.errs.length <= 2, { cspv: st.cspv.slice(0, 3), console: o.cspConsole.slice(0, 3), errs: o.errs.slice(0, 3) });
    check(S, 'koenji_only_noindex_neutral_names_return_to_thread', st.switcherHidden === true && st.cityTabs === 1 && st.robots === 'noindex,nofollow' && /踊りが街に/.test(st.h1 || '') && st.back === '../thread.html?thread=koenji-dance-history' && FORBIDDEN.every((f) => !st.text.includes(f)) && !st.text.includes('編集部の読み'), { h1: st.h1, back: st.back, tabs: st.cityTabs });
    /* interaction: next → 1961 (no point), keyboard reaches evidence, compare overlay, Escape */
    await o.page.click('#nextBtn'); await o.page.waitForTimeout(200);
    const s2 = await o.page.evaluate(ATLAS_STATE);
    await o.page.click('#compareBtn'); await o.page.waitForTimeout(200);
    const cmp = await o.page.evaluate(() => ({ open: document.getElementById('compareOverlay').classList.contains('open'), items: document.querySelectorAll('.compare-item').length }));
    await o.page.keyboard.press('Escape'); await o.page.waitForTimeout(150);
    const closed = await o.page.evaluate(() => document.getElementById('compareOverlay').classList.contains('open'));
    await o.page.focus('#evidenceDetails summary'); await o.page.keyboard.press('Enter'); await o.page.waitForTimeout(150);
    const ev = await o.page.evaluate(() => ({ open: document.getElementById('evidenceDetails').open, links: [...document.querySelectorAll('#links a')].map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), rp: a.getAttribute('referrerpolicy') })) }));
    check(S, 'timeline_next_moves_to_1961_without_creating_a_point', s2.activeIndex === 1 && s2.year === '1961' && /一地点を特定していません/.test(s2.precision || '') && s2.timeline === 5, { year: s2.year, precision: s2.precision });
    check(S, 'compare_overlay_opens_and_escape_closes', cmp.open && cmp.items === 5 && closed === false, cmp);
    check(S, 'evidence_links_keyboard_reachable_and_click_only', ev.open && ev.links.length >= 1 && ev.links.every((l) => /^https:\/\//.test(l.href) && l.target === '_blank' && /noopener/.test(l.rel || '') && l.rp === 'no-referrer') && o.external.every((u) => !/koenji-awaodori|suginamigaku|koenji-pal|youtube/.test(u)), ev);
    if (OUT && (v.w === 390 || v.w === 1440)) await shot(o.page, `ATLAS_BLOCKED_${v.w}`);
    await o.ctx.close();
  }

  /* ---- C. ?mode=2d: zero provider requests, no Cesium tag ---- */
  for (const v of [{ w: 390, h: 844, m: true }, { w: 1440, h: 900, m: false }]) {
    const S = `mode2d-${v.w}`;
    const o = await open(browser, base, origin, 'atlas/?mode=2d', { context: { viewport: { width: v.w, height: v.h }, isMobile: v.m, hasTouch: v.m } });
    await o.goto(); await o.page.waitForTimeout(1500);
    const st = await o.page.evaluate(ATLAS_STATE);
    check(S, 'mode_2d_makes_zero_provider_requests', o.providerReqs.length === 0 && !st.cesiumScript && !st.cesiumCss && st.cesiumCanvas === 0 && st.plateauLayers === 1, { provider: o.providerReqs.slice(0, 3), status: st.status });
    check(S, 'mode_2d_story_usable', !st.loadingVisible && st.fallback && st.timeline === 5 && /2\.5D manual/.test(st.status || '') && !st.overflow && st.cspv.length === 0 && o.errs.length === 0, { status: st.status, errs: o.errs.slice(0, 2) });
    if (OUT && v.w === 390) await shot(o.page, 'ATLAS_MODE2D_390');
    await o.ctx.close();
  }

  /* ---- D. slow / unresolved provider: usable immediately ---- */
  {
    const S = 'slow-390';
    const o = await open(browser, base, origin, 'atlas/');
    await o.ctx.route((url) => PROVIDER_RE.test(url.hostname), () => { /* never respond: provider hang */ });
    const t0 = Date.now(); await o.goto();
    await o.page.waitForFunction(() => { const l = document.getElementById('loading'); return l && getComputedStyle(l).display === 'none'; }, null, { timeout: 8000 }).catch(() => {});
    const readyMs = Date.now() - t0;
    await o.page.waitForTimeout(600);
    const st = await o.page.evaluate(ATLAS_STATE);
    await o.page.click('#nextBtn'); await o.page.click('#nextBtn'); await o.page.waitForTimeout(200);
    const s3 = await o.page.evaluate(ATLAS_STATE);
    check(S, 'usable_before_provider_resolves', !st.loadingVisible && readyMs < 5000 && st.fallback && /PLATEAU読込中|2\.5D/.test(st.status || '') && s3.activeIndex === 2 && s3.year === '1961–62', { readyMs, status: st.status, year: s3.year });
    check(S, 'no_csp_violation_no_error_while_waiting', st.cspv.length === 0 && o.cspConsole.length === 0 && o.errs.length === 0 && !st.overflow, { errs: o.errs.slice(0, 2) });
    await o.ctx.close();
  }

  /* ---- E. provider success emulation under the production CSP (needs the local CesiumJS 1.117 build) ---- */
  if (CESIUM_LOCAL && fs.existsSync(path.join(CESIUM_LOCAL, 'Cesium.js'))) {
    for (const v of [{ w: 390, h: 844, m: true }, { w: 1440, h: 900, m: false }]) {
      const S = `success-${v.w}`;
      const o = await open(browser, base, origin, 'atlas/', { context: { viewport: { width: v.w, height: v.h }, isMobile: v.m, hasTouch: v.m } });
      const hosts = new Set();
      await o.ctx.route((url) => PROVIDER_RE.test(url.hostname), (route) => {
        const u = route.request().url(); hosts.add(new URL(u).hostname);
        if (u.startsWith(CESIUM_BASE)) { const f = path.join(CESIUM_LOCAL, decodeURIComponent(u.slice(CESIUM_BASE.length).split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); return route.fulfill({ status: 404, body: '' }); }
        if (/tileset\.json$/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: TILESET });
        if (/\.png$/.test(u)) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
        return route.fulfill({ status: 404, body: '' });
      });
      const t0 = Date.now(); await o.goto();
      await o.page.waitForFunction(() => { const l = document.getElementById('loading'); return l && getComputedStyle(l).display === 'none'; }, null, { timeout: 8000 }).catch(() => {});
      const readyMs = Date.now() - t0;
      const early = await o.page.evaluate(ATLAS_STATE);
      /* select a scene while PLATEAU is still loading, then wait for the upgrade */
      await o.page.click('#nextBtn'); await o.page.waitForTimeout(100);
      await o.page.waitForFunction(() => /PLATEAU 高円寺|2\.5D fallback/.test((document.getElementById('dataStatus') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
      await o.page.waitForTimeout(1500);
      const st = await o.page.evaluate(ATLAS_STATE);
      const upgraded = /PLATEAU 高円寺 maxLOD2/.test(st.status || '');
      check(S, 'story_usable_before_plateau_completes', !early.loadingVisible && readyMs < 8000 && early.fallback && early.timeline === 5, { readyMs, status: early.status });
      check(S, 'plateau_upgrade_succeeds_under_bounded_csp_without_unsafe_eval', upgraded && st.cesiumCanvas >= 1 && st.credit === true && st.cspv.length === 0 && o.cspConsole.length === 0, { status: st.status, tech: st.tech, canvas: st.cesiumCanvas, credit: st.credit, cspv: st.cspv.slice(0, 4), console: o.cspConsole.slice(0, 4), errs: o.errs.slice(0, 3) });
      check(S, 'scene_selection_survives_fallback_to_3d_switch', st.activeIndex === 1 && st.year === '1961', { active: st.activeIndex, year: st.year });
      check(S, 'only_declared_provider_hosts', [...hosts].every((h) => DECLARED.includes(h)) && o.external.every((u) => PROVIDER_RE.test(u)), { hosts: [...hosts], external: o.external.filter((u) => !PROVIDER_RE.test(u)).slice(0, 3) });
      check(S, 'no_overflow_no_storage_no_geolocation_in_3d', !st.overflow && st.writes === 0 && st.perm.length === 0 && st.inputs === 0, { overflow: st.overflow, writes: st.writes, perm: st.perm });
      if (OUT) await shot(o.page, `ATLAS_3D_${v.w}`);
      await o.ctx.close();
    }
  } else {
    notObservable('success', 'plateau_upgrade_under_csp', 'CESIUM_LOCAL (CesiumJS 1.117 Build/Cesium) not provided; cesium.com is not reachable from this host');
  }

  /* ---- F. prefers-reduced-motion: no animation, still usable ---- */
  {
    const S = 'reduced-motion-390';
    const o = await open(browser, base, origin, 'atlas/?mode=2d');
    await o.goto(); await o.page.waitForTimeout(800);
    const st = await o.page.evaluate(() => { let animated = 0; document.querySelectorAll('#app *').forEach((el) => { const s = getComputedStyle(el); if (s.animationName && s.animationName !== 'none' && s.animationPlayState !== 'paused' && parseFloat(s.animationDuration) > 0) animated++; }); return { animated, loading: getComputedStyle(document.getElementById('loading')).display }; });
    check(S, 'no_running_animation_under_reduced_motion', st.animated === 0 && st.loading === 'none', st);
    await o.ctx.close();
  }

  await browser.close(); server.close();
  for (const u of unobserved) console.log('- NOT OBSERVABLE: ' + u);
  if (fails.length) { console.log(`ATLAS_BROWSER_QA_FAIL (${pass}/${pass + fails.length})`); for (const f of fails) console.log('- FAIL ' + f); process.exit(1); }
  console.log(`ATLAS_BROWSER_QA_GO (${pass}/${pass})`);
})().catch((e) => { console.error('ATLAS_BROWSER_QA_ERROR', e); process.exit(1); });
