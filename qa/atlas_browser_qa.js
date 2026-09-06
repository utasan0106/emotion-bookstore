#!/usr/bin/env node
/* ATLAS BROWSER QA — 街を立体で辿る（β）/atlas/ の実ブラウザ検査（Production Beta 0、高円寺だけ、Correction C）。
   vercel.json の Content-Security-Policy をそのまま header に付けた local static server で確認する。
   - A. 通常ページ（HOME / Works / Thread / data / credits / shelf）: Cesium / PLATEAU / YouTube への request 0、CSP violation 0
   - B. Atlas at 320 / 390 / 430 / 1024 / 1440: 外部 request 0（same-origin だけ）、CSP violation 0、console error 0、overflow 0、
        現在の街の形（PLATEAU 由来の建物・道路）が描かれる、5 つの見方と 5 場面が動く、歴史上の地点 0、
        保護名 0、synthetic fixture 0、出典表示、Thread へ戻る、外部 link は click-only
   - C. 空間データが取れない場合（404）: 関係・資料・現実への導線は使える、console error 0
   - D. prefers-reduced-motion: 動く要素 0
   - E. キーボード: 見方 → 年表 → 資料 → 次へ → 戻る の順に到達
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
const PROVIDER_RE = /cesium|plateauview|reearth|3dtiles|tile\./i;
const VIDEO_RE = /youtube|ytimg|googlevideo/;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.geojson': 'application/geo+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.md': 'text/markdown' };
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const CSP = vercel.headers.find((h) => h.source === '/(.*)').headers.find((h) => h.key === 'Content-Security-Policy').value;
const runtime = JSON.parse(fs.readFileSync(path.join(ROOT, 'atlas/data/runtime-spatial.json'), 'utf8'));
const BUILDINGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'atlas', runtime.buildings.slice(2)), 'utf8')).features.length;
const ROADS = JSON.parse(fs.readFileSync(path.join(ROOT, 'atlas', runtime.roads.slice(2)), 'utf8')).features.length;
const FORBIDDEN = ['東京高円寺阿波おどり', '高円寺阿波おどり', '高円寺阿波踊り'];

let pass = 0; const fails = [];
function check(scope, name, ok, detail) { if (ok) pass++; else fails.push(`${scope} ${name} ${detail === undefined ? '' : JSON.stringify(detail).slice(0, 700)}`); }

function serve() {
  const s = http.createServer((q, r) => {
    const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '');
    let f = path.join(ROOT, rel || 'index.html');
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    const headers = { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' };
    /* production header contract (vercel.json) — CSP is enforced by the browser exactly as in production */
    for (const h of vercel.headers.find((x) => x.source === '/(.*)').headers) if (h.key !== 'Strict-Transport-Security') headers[h.key] = h.value;
    if (/^atlas\//.test(rel)) headers['X-Robots-Tag'] = 'noindex, nofollow';
    r.writeHead(200, headers); r.end(fs.readFileSync(f));
  });
  return new Promise((res) => s.listen(0, '127.0.0.1', () => res(s)));
}

async function open(browser, base, origin, pageName, opts) {
  const ctx = await browser.newContext(Object.assign({ deviceScaleFactor: 1, reducedMotion: opts && opts.motion ? 'no-preference' : 'reduce' }, opts && opts.context ? opts.context : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
  const external = []; const providerReqs = []; const all = [];
  ctx.on('request', (r) => { const u = r.url(); all.push(u); if (!u.startsWith(origin)) { external.push(u); if (PROVIDER_RE.test(u)) providerReqs.push(u); } });
  const page = await ctx.newPage();
  const errs = []; const cspConsole = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/.test(t)) cspConsole.push(t.slice(0, 200)); else if (m.type() === 'error') errs.push('console: ' + t.slice(0, 200)); });
  await page.addInitScript(() => {
    window.__cspv = []; document.addEventListener('securitypolicyviolation', (e) => { window.__cspv.push((e.violatedDirective || '') + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '')); });
    window.__perm = []; if (navigator.geolocation) { const g = navigator.geolocation; ['getCurrentPosition', 'watchPosition'].forEach((k) => { const o = g[k]; g[k] = function () { window.__perm.push(k); return o.apply(g, arguments); }; }); }
    window.__writes = 0; const so = Storage.prototype.setItem; Storage.prototype.setItem = function () { window.__writes++; return so.apply(this, arguments); };
  });
  return { ctx, page, external, providerReqs, all, errs, cspConsole, goto: async (p) => { await page.goto(base + (p || pageName), { waitUntil: 'load' }); } };
}
const READY = () => document.getElementById('buildingLayer').childElementCount > 0 || /表示できません|読み込めません/.test(document.getElementById('dataStatus').textContent);
const ATLAS_STATE = () => ({
  status: document.getElementById('dataStatus').textContent, statusHold: document.getElementById('dataStatus').dataset.state === 'hold',
  buildings: document.getElementById('buildingLayer').childElementCount, roads: document.getElementById('roadLayer').childElementCount, ref: document.getElementById('refLayer').childElementCount,
  refVisible: getComputedStyle(document.getElementById('refLayer')).display !== 'none', refLabel: (document.querySelector('#refLayer text') || {}).textContent,
  flats: document.querySelectorAll('#buildingLayer .al-flat').length, tops: document.querySelectorAll('#buildingLayer .al-top').length,
  stationHighlighted: document.querySelectorAll('#buildingLayer .al-station').length,
  gmlIds: [...document.querySelectorAll('#buildingLayer g')].slice(0, 5).map((g) => g.dataset.gmlId),
  view: document.querySelector('.al-lens').dataset.view, frame: document.querySelector('.al-lens').dataset.frame, views: [...document.querySelectorAll('.al-view')].map((b) => b.textContent),
  pressedView: (document.querySelector('.al-view[aria-pressed="true"]') || {}).textContent, caption: document.getElementById('viewCaption').textContent, chapter: document.getElementById('viewChapter').textContent,
  rail: [...document.querySelectorAll('.al-rail-item')].map((b) => b.textContent), activeIndex: [...document.querySelectorAll('.al-rail-item')].findIndex((b) => b.getAttribute('aria-pressed') === 'true'),
  year: document.getElementById('year').textContent, title: document.getElementById('title').textContent, claim: document.getElementById('claim').textContent, precision: document.getElementById('precision').textContent,
  evidenceOpen: document.getElementById('evidenceDetails').open, links: [...document.querySelectorAll('#links a')].map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), rp: a.getAttribute('referrerpolicy') })),
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, back: [...document.querySelectorAll('a[href="../thread.html?thread=koenji-dance-history"]')].length,
  h1: document.querySelector('h1').textContent, docTitle: document.title, robots: (document.querySelector('meta[name="robots"]') || {}).content, referrer: (document.querySelector('meta[name="referrer"]') || {}).content,
  iframes: document.querySelectorAll('iframe, video, audio, canvas, embed, object').length, inputs: document.querySelectorAll('input, textarea, form, select').length, scripts: [...document.scripts].map((s) => s.getAttribute('src')),
  cspv: window.__cspv, perm: window.__perm, writes: window.__writes, ls: localStorage.length, ss: sessionStorage.length,
  attribution: document.getElementById('attribution').textContent, provenanceNote: document.getElementById('provenanceNote').textContent, attributionLinks: [...document.querySelectorAll('.al-attribution-links a')].map((a) => a.href),
  historicalPins: document.querySelectorAll('[data-historical-pin], [data-scene-point]').length, svgH: document.getElementById('lens').getBoundingClientRect().height,
  text: document.body.innerText,
});

(async () => {
  const server = await serve(); const base = `http://127.0.0.1:${server.address().port}/`; const origin = new URL(base).origin;
  console.log('CSP policy under test: vercel.json (production)');
  const browser = await chromium.launch();
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const shot = async (page, name, full) => { if (OUT) await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full }); };

  /* ---- A. normal pages: no provider / video request, no CSP violation ---- */
  for (const p of ['index.html', 'works.html', 'thread.html?thread=koenji-dance-history', 'thread.html?thread=morisaki-book', 'data.html', 'credits.html', 'shelf.html?shelf=koenji']) {
    const S = 'normal-' + p.replace(/[^a-z-]+/gi, '_');
    const o = await open(browser, base, origin, p);
    await o.goto(); await o.page.waitForTimeout(700);
    const st = await o.page.evaluate(() => ({ cspv: window.__cspv, iframes: document.querySelectorAll('iframe').length, cesium: !!document.querySelector('script[src*="cesium"], link[href*="cesium"]'), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
    check(S, 'no_provider_or_video_request_on_first_paint', o.providerReqs.length === 0 && o.external.every((u) => !VIDEO_RE.test(u)) && !st.cesium, { provider: o.providerReqs.slice(0, 3), external: o.external.slice(0, 3) });
    check(S, 'no_csp_violation_under_production_csp', st.cspv.length === 0 && o.cspConsole.length === 0, { cspv: st.cspv.slice(0, 3), console: o.cspConsole.slice(0, 3) });
    check(S, 'no_iframe_no_overflow_no_js_error', st.iframes === 0 && !st.overflow && o.errs.length === 0, { iframes: st.iframes, overflow: st.overflow, errs: o.errs.slice(0, 2) });
    await o.ctx.close();
  }

  /* ---- B. Atlas: local substrate + finite views, zero external requests ---- */
  const VIEWPORTS = [{ w: 320, h: 568, m: true }, { w: 390, h: 844, m: true }, { w: 430, h: 932, m: true }, { w: 1024, h: 768, m: false }, { w: 1440, h: 900, m: false }];
  for (const v of VIEWPORTS) {
    const S = `atlas-${v.w}`;
    const o = await open(browser, base, origin, 'atlas/', { context: { viewport: { width: v.w, height: v.h }, isMobile: v.m, hasTouch: v.m } });
    const t0 = Date.now(); await o.goto();
    await o.page.waitForFunction(READY, null, { timeout: 15000 }).catch(() => {});
    const readyMs = Date.now() - t0;
    await o.page.waitForTimeout(300);
    const st = await o.page.evaluate(ATLAS_STATE);
    check(S, 'zero_external_requests_all_same_origin', o.external.length === 0 && o.providerReqs.length === 0 && o.all.every((u) => u.startsWith(origin)), { external: o.external.slice(0, 3) });
    check(S, 'local_plateau_substrate_rendered', st.buildings === BUILDINGS && st.roads === ROADS && st.tops + st.flats >= BUILDINGS && st.gmlIds.every((id) => /^bldg_[0-9a-f-]{36}$/.test(id)) && /建物 1,045 件・道路 341 件/.test(st.status) && !st.statusHold && readyMs < 15000, { readyMs, status: st.status, buildings: st.buildings, roads: st.roads, ids: st.gmlIds.slice(0, 2) });
    check(S, 'no_csp_violation_no_console_error', st.cspv.length === 0 && o.cspConsole.length === 0 && o.errs.length === 0, { cspv: st.cspv.slice(0, 3), console: o.cspConsole.slice(0, 3), errs: o.errs.slice(0, 3) });
    check(S, 'no_overflow_no_player_no_input_no_storage_no_geolocation', !st.overflow && st.iframes === 0 && st.inputs === 0 && st.writes === 0 && st.ls === 0 && st.ss === 0 && st.perm.length === 0 && st.scripts.join() === './app.js', { overflow: st.overflow, inputs: st.inputs, writes: st.writes, perm: st.perm, scripts: st.scripts });
    check(S, 'koenji_only_noindex_neutral_names_return_to_thread', st.robots === 'noindex,nofollow' && st.referrer === 'no-referrer' && /踊りが街に根づくまで/.test(st.h1) && st.back >= 2 && FORBIDDEN.every((f) => !st.text.includes(f)) && !st.text.includes('編集部の読み') && !/synthetic|fixture|Cesium|cesium|3D viewer/i.test(st.text) && !/神保町|下北沢|吉祥寺/.test(st.text), { h1: st.h1, back: st.back });
    check(S, 'relation_first_city_underneath', st.view === 'relation' && st.frame === 'overview' && st.views.join() === '関係,街の形,証拠,時間,現在' && st.pressedView === '関係' && st.rail.length === 5 && st.activeIndex === 0 && st.year === '1957' && st.title === 'はじまる' && /1957年、高円寺ばか踊りが/.test(st.claim) && /線で示すことは、この版ではしていません/.test(st.precision) && !st.refVisible && st.historicalPins === 0, { view: st.view, views: st.views, year: st.year, precision: st.precision.slice(0, 40) });
    check(S, 'source_attribution_visible', st.attribution === '出典：3D都市モデル（Project PLATEAU）杉並区（2025年度）（国土交通省）を加工して作成' && /建物 1,045 件・道路 341 件/.test(st.provenanceNote) && /CityGML 2\.0/.test(st.provenanceNote) && /現状を正確に反映していない場合がある/.test(st.provenanceNote) && st.attributionLinks.join() === 'https://www.mlit.go.jp/plateau/,https://www.geospatial.jp/ckan/dataset/plateau-13115-suginami-ku-2025', { attribution: st.attribution, links: st.attributionLinks });
    if (OUT && (v.w === 390 || v.w === 1440)) await shot(o.page, `ATLAS_${v.w}_relation`, true);
    /* finite views */
    const seen = {};
    for (const id of ['city', 'evidence', 'time', 'now', 'relation']) {
      await o.page.click(`.al-view[data-view="${id}"]`); await o.page.waitForTimeout(120);
      seen[id] = await o.page.evaluate(ATLAS_STATE);
      if (OUT && (v.w === 390 || v.w === 1440) && (id === 'city' || id === 'now')) { await o.page.evaluate(() => document.getElementById('lens').scrollIntoView({ block: 'start' })); await shot(o.page, `ATLAS_${v.w}_${id}`); }
    }
    check(S, 'view_city_shows_close_frame_with_present_station_reference', seen.city.view === 'city' && seen.city.frame === 'close' && seen.city.refVisible && seen.city.ref === 3 && seen.city.refLabel === '現在の駅（目安）' && seen.city.stationHighlighted === 2 && seen.city.buildings === BUILDINGS && /Project PLATEAU（杉並区 2025年度）の現在の形です。過去の姿ではありません/.test(seen.city.caption), { frame: seen.city.frame, ref: seen.city.ref, label: seen.city.refLabel, station: seen.city.stationHighlighted });
    check(S, 'view_evidence_opens_sources_click_only', seen.evidence.view === 'evidence' && seen.evidence.evidenceOpen && seen.evidence.links.length >= 1 && seen.evidence.links.every((l) => /^https:\/\/(koenji-awaodori\.com|www\.koenji-awaodori\.com|suginamigaku\.org|www\.koenji-pal\.jp|www\.youtube\.com)\//.test(l.href) && l.target === '_blank' && /noopener/.test(l.rel || '') && l.rp === 'no-referrer') && !seen.evidence.refVisible, seen.evidence.links);
    check(S, 'view_time_states_no_historical_point', seen.time.view === 'time' && /1961年・1961–62年・1963年は地図上に地点を作りません/.test(seen.time.caption) && !seen.time.refVisible && seen.time.historicalPins === 0, { caption: seen.time.caption.slice(0, 60) });
    check(S, 'view_now_returns_to_present_and_thread', seen.now.view === 'now' && seen.now.frame === 'close' && seen.now.refVisible && seen.now.activeIndex === 4 && seen.now.year === '現在' && /駅の位置は目安です/.test(seen.now.precision) && seen.now.back >= 2, { year: seen.now.year, active: seen.now.activeIndex });
    check(S, 'view_relation_restores_overview', seen.relation.view === 'relation' && seen.relation.frame === 'overview' && !seen.relation.refVisible, { frame: seen.relation.frame });
    /* timeline: 1961 (no point), next → 1961–62, last → 最初から */
    await o.page.click('.al-rail-item:nth-child(2)'); await o.page.waitForTimeout(80);
    const s2 = await o.page.evaluate(ATLAS_STATE);
    await o.page.click('#nextBtn'); await o.page.waitForTimeout(80);
    const s3 = await o.page.evaluate(ATLAS_STATE);
    check(S, 'timeline_1961_and_next_create_no_point', s2.activeIndex === 1 && s2.year === '1961' && /一地点を特定していません/.test(s2.precision) && s2.buildings === BUILDINGS && s2.historicalPins === 0 && !s2.refVisible && s3.activeIndex === 2 && s3.year === '1961–62' && s3.links.length === 2, { y2: s2.year, y3: s3.year, links: s3.links.length });
    check(S, 'no_external_request_from_any_interaction', o.external.length === 0 && o.errs.length === 0 && o.cspConsole.length === 0 && (await o.page.evaluate(() => window.__cspv.length)) === 0, { external: o.external.slice(0, 3), errs: o.errs.slice(0, 2) });
    await o.ctx.close();
  }

  /* ---- C. substrate unavailable (404): story usable, no console error, no external request ---- */
  {
    const S = 'substrate-404-390';
    const o = await open(browser, base, origin, 'atlas/');
    await o.ctx.route((url) => /koenji-plateau-2025-buildings/.test(url.pathname), (r) => r.fulfill({ status: 404, body: '' }));
    await o.goto(); await o.page.waitForFunction(READY, null, { timeout: 15000 }).catch(() => {}); await o.page.waitForTimeout(200);
    const st = await o.page.evaluate(ATLAS_STATE);
    await o.page.click('.al-rail-item:nth-child(3)'); await o.page.waitForTimeout(80);
    const s2 = await o.page.evaluate(ATLAS_STATE);
    check(S, 'story_and_sources_usable_without_substrate', st.statusHold && /表示できません/.test(st.status) && st.buildings === 0 && st.roads === 0 && st.rail.length === 5 && st.views.length === 5 && s2.year === '1961–62' && s2.links.length === 2 && st.back >= 2 && /表示できませんでした/.test(st.caption), { status: st.status, buildings: st.buildings, year: s2.year });
    check(S, 'no_error_no_external_request_in_fallback', o.errs.filter((e) => !/404/.test(e)).length === 0 && o.external.length === 0 && st.cspv.length === 0 && !st.overflow, { errs: o.errs.slice(0, 3) });
    await o.ctx.close();
  }

  /* ---- D. prefers-reduced-motion: nothing animates ---- */
  {
    const S = 'reduced-motion-390';
    const o = await open(browser, base, origin, 'atlas/');
    await o.goto(); await o.page.waitForFunction(READY, null, { timeout: 15000 }).catch(() => {});
    const st = await o.page.evaluate(() => { let animated = 0; document.querySelectorAll('body *').forEach((el) => { const s = getComputedStyle(el); if ((s.animationName && s.animationName !== 'none' && parseFloat(s.animationDuration) > 0) || (s.transitionDuration && s.transitionDuration.split(',').some((d) => parseFloat(d) > 0))) animated++; }); return { animated }; });
    check(S, 'no_running_animation_or_transition', st.animated === 0, st);
    await o.ctx.close();
  }

  /* ---- E. keyboard: return → views → rail → summary → next → return ---- */
  {
    const S = 'keyboard-1440';
    const o = await open(browser, base, origin, 'atlas/', { context: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false } });
    await o.goto(); await o.page.waitForFunction(READY, null, { timeout: 15000 }).catch(() => {});
    const order = [];
    for (let i = 0; i < 24; i++) { await o.page.keyboard.press('Tab'); order.push(await o.page.evaluate(() => { const a = document.activeElement; return (a.className || a.tagName).toString().split(' ')[0]; })); }
    check(S, 'focus_order_reaches_views_rail_evidence_next_return', order.join('>').includes('al-view>al-view>al-view>al-view>al-view>al-rail-item>al-rail-item>al-rail-item>al-rail-item>al-rail-item>al-evidence-summary>al-next>al-return-link'), order.join('>'));
    await o.page.focus('.al-view[data-view="time"]'); await o.page.keyboard.press('Enter'); await o.page.waitForTimeout(80);
    const st = await o.page.evaluate(ATLAS_STATE);
    check(S, 'views_operable_by_keyboard', st.view === 'time' && st.pressedView === '時間', { view: st.view });
    await o.ctx.close();
  }

  await browser.close(); server.close();
  if (fails.length) { console.log(`ATLAS_BROWSER_QA_FAIL (${pass}/${pass + fails.length})`); for (const f of fails) console.log('- FAIL ' + f); process.exit(1); }
  console.log(`ATLAS_BROWSER_QA_GO (${pass}/${pass})`);
  console.log(`atlas external requests=0 at 320/390/430/1024/1440; substrate buildings=${BUILDINGS} roads=${ROADS} (local); CSP violations=0; historical pins=0`);
})().catch((e) => { console.error('ATLAS_BROWSER_QA_ERROR', e); process.exit(1); });
