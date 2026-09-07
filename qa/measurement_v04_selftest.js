#!/usr/bin/env node
/* MEASUREMENT v4.1 SELFTEST — analytics-v3.js を stub DOM で実行し、payload の contract を確かめる。
   - Preview / local host: fail-closed（gtag script 0、dataLayer 無し、API 無し）
   - Production host: 8 + 9 event、param は content_type / content_id / link_domain だけ、閉じた語彙以外は event ごと drop
   - entry: HOME の文化入口 click だけ（city / work=book|film|music|video / thread）。到着ページからの推定 0。Atlas 到着だけ spatial/koenji
   - works section view: 実 section 到達、content_id=book|film|music|video、section ごと 1 回。generic works 0
   - thread: rendered な .th-thread[data-thread-id] の後だけ start。stage は content_type=thread_stage、composite id（thread:stage）。bare s0/w0 0。
     lost / unknown Thread は start / stage / complete 0
   - external: approved surface だけ（HOME reality card / Shelf official + weekly official / Works wk-action / Thread source + destination /
     Atlas al-link + attribution）。calendar utility・credits・arbitrary anchor・menu は 0。content_id は origin class、link_domain は hostname
   - GA4 config: page_location sanitized（query / hash 無し）、page_title coarse、page_referrer origin only
   - inline video: 明示 click の player 生成時だけ v3_media_preview_open（video / thread|work）。Atlas: entry spatial/koenji、continue 1 回
   使い方: node qa/measurement_v04_selftest.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'analytics-v3.js'), 'utf8');
let pass = 0; const fails = [];
function check(name, ok, detail) { if (ok) pass++; else fails.push(name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 500))); }

/* tiny DOM stubs: elements match simple selectors (tag, .class, #id, [attr]) — descendant selectors are not used by the runtime */
function el(desc) {
  const e = { tag: (desc.tag || 'div').toUpperCase(), tagName: (desc.tag || 'div').toUpperCase(), classes: (desc.cls || '').split(' ').filter(Boolean), id: desc.id || '', attrs: desc.attrs || {}, parentElement: desc.parent || null, open: !!desc.open, children: desc.children || [] };
  e.getAttribute = (k) => (k in e.attrs ? e.attrs[k] : null);
  e.matches = (selector) => selector.split(',').some((one) => {
    one = one.trim(); const m = one.match(/^([a-z]*)((?:[.#][a-zA-Z0-9_-]+)*)((?:\[[a-z-]+\])*)$/i); if (!m) return false;
    if (m[1] && m[1].toUpperCase() !== e.tag) return false;
    for (const part of m[2].match(/[.#][a-zA-Z0-9_-]+/g) || []) { if (part[0] === '.' && !e.classes.includes(part.slice(1))) return false; if (part[0] === '#' && e.id !== part.slice(1)) return false; }
    for (const a of m[3].match(/\[[a-z-]+\]/g) || []) if (!(a.slice(1, -1) in e.attrs)) return false;
    return true;
  });
  const all = (node) => node.children.flatMap((c) => [c].concat(all(c)));
  e.querySelector = (sel) => all(e).find((c) => c.matches(sel)) || null;
  e.querySelectorAll = (sel) => all(e).filter((c) => c.matches(sel));
  for (const c of e.children) if (!c.parentElement) c.parentElement = e;
  return e;
}

function run(hostname, pathName, search, dom, referrer) {
  const store = new Map(); const head = []; const listeners = {}; const observers = [];
  const ctx = {
    URL, Date, Object, Array, String, RegExp, encodeURIComponent, Math, JSON, console,
    location: { hostname, href: 'https://' + hostname + pathName + (search || ''), origin: 'https://' + hostname, pathname: pathName, search: search || '', hash: '' },
    history: { replaceState() {} }, navigator: { doNotTrack: '0', msDoNotTrack: '0' },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    IntersectionObserver: function (cb) { const o = { cb, targets: [], observe(t) { this.targets.push(t); }, unobserve() {}, disconnect() {} }; observers.push(o); return o; },
    document: { referrer: referrer || '', readyState: 'loading', head: { appendChild: (n) => head.push(n) }, createElement: (t) => ({ tagName: String(t).toUpperCase(), set src(v) { this._src = v; }, get src() { return this._src; } }),
      addEventListener(type, fn) { listeners[type] = fn; }, getElementById: (id) => (dom && dom.byId && dom.byId[id]) || null, querySelectorAll: (sel) => (dom && dom.all ? dom.all(sel) : []) },
  };
  ctx.window = ctx;
  vm.runInNewContext(src, ctx, { filename: 'analytics-v3.js' });
  return { ctx, head, listeners, observers, events: () => (ctx.dataLayer || []).filter((x) => x[0] === 'event' && x[1] !== 'page_view'), config: () => (ctx.dataLayer || []).find((x) => x[0] === 'config') };
}
const PARAM_KEYS = new Set(['page_location', 'page_title', 'page_referrer', 'campaign_source', 'content_type', 'content_id', 'link_domain']);
const EVENTS = ['v3_home_view', 'v3_shelf_open', 'v3_shelf_view', 'v3_detail_open', 'v3_official_action', 'v3_suggest_view', 'v3_suggest_copy', 'v3_suggest_form_open', 'v3_entry_open', 'v3_works_section_view', 'v3_thread_start', 'v3_thread_stage', 'v3_thread_complete', 'v3_evidence_open', 'v3_external_open', 'v3_continue_open', 'v3_media_preview_open'];
const FORBIDDEN_VALUES = /dt33RGSRuo0|youtube\.com\/watch|\?|#|calendar|139\.6|35\.7|bldg_|tran_|gml|koenji_awaodori|works\b|"s[0-5]"|"w[0-5]"/;
function auditParams(scope, events) {
  for (const e of events) {
    const p = e[2] || {};
    for (const k of Object.keys(p)) check(scope + ' param key allowlisted ' + e[1] + '.' + k, PARAM_KEYS.has(k));
    check(scope + ' no query/hash in page_location ' + e[1], !/[?#]/.test(p.page_location || ''));
    if (p.link_domain) check(scope + ' link_domain hostname only', /^[a-z0-9.-]+$/.test(p.link_domain));
    check(scope + ' forbidden value absent ' + e[1], !FORBIDDEN_VALUES.test(JSON.stringify([p.content_type, p.content_id, p.link_domain])), [p.content_type, p.content_id, p.link_domain]);
    if (e[1] !== 'v3_home_view' && e[1] !== 'v3_shelf_view' && e[1] !== 'v3_suggest_view' && !['v3_shelf_open', 'v3_detail_open', 'v3_official_action', 'v3_suggest_copy', 'v3_suggest_form_open'].includes(e[1])) check(scope + ' bounded event carries type + id ' + e[1], typeof p.content_type === 'string' && typeof p.content_id === 'string', p);
  }
}
const by = (ev, n) => ev.filter((e) => e[1] === n);

/* ---- 1. Preview / local: fail closed ---- */
for (const host of ['emotion-bookstore-n8n5kl0xu-emotion-bookstore.vercel.app', '127.0.0.1', 'localhost']) {
  const r = run(host, '/atlas/');
  check('fail-closed ' + host, r.head.length === 0 && r.ctx.dataLayer === undefined && r.ctx.v3Analytics === undefined && !r.listeners.click, { head: r.head.length });
}

/* ---- 2. Production: allowed set exact; GA4 config hardening ---- */
{
  const m = src.match(/var ALLOWED_EVENTS = \{([\s\S]*?)\};/); const names = (m ? m[1] : '').match(/v3_[a-z_]+/g) || [];
  check('ALLOWED_EVENTS is exactly the 17 events', names.join() === EVENTS.join(), names);
  check('no koenji_awaodori id', !/koenji_awaodori/.test(src));
  const r = run('emotionbookstore.com', '/thread.html', '?thread=koenji-dance-history&src=x', {}, 'https://example.org/some/path?q=secret#h');
  const cfg = r.config();
  check('GA4 config page_location sanitized (no query / hash)', cfg && cfg[2].page_location === 'https://emotionbookstore.com/thread.html', cfg && cfg[2]);
  check('GA4 config page_title coarse', cfg && cfg[2].page_title === 'V3 Thread');
  check('GA4 config page_referrer origin only', cfg && cfg[2].page_referrer === 'https://example.org');
  check('GA4 config privacy flags kept', cfg && cfg[2].send_page_view === false && cfg[2].allow_google_signals === false && cfg[2].allow_ad_personalization_signals === false && cfg[2].cookie_expires === 60 * 24 * 60 * 60);
  check('prod loads exactly one gtag script', r.head.length === 1 && /googletagmanager\.com\/gtag\/js\?id=G-/.test(r.head[0].src));
  const pv = (r.ctx.dataLayer || []).find((x) => x[0] === 'event' && x[1] === 'page_view');
  check('page_view event sanitized', pv && pv[2].page_location === 'https://emotionbookstore.com/thread.html' && pv[2].page_referrer === 'https://example.org' && pv[2].campaign_source === 'x');
}

/* ---- 3. HOME: entry = actual cultural entrance clicks only; external = reality cards only ---- */
{
  const r = run('emotionbookstore.com', '/', '', {});
  const first = r.events();
  check('HOME first paint: home_view only (no entry)', first.map((e) => e[1]).join() === 'v3_home_view', first.map((e) => e[1]));
  r.listeners.click({ target: el({ tag: 'span', cls: 'hc-city-name', parent: el({ tag: 'a', cls: 'hc-city shelf-entry', attrs: { href: './shelf.html?shelf=shimokitazawa' } }) }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-work', attrs: { 'data-work': 'film', href: './works.html#film' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-work', attrs: { 'data-work': 'video', href: './works.html#video' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-work', attrs: { 'data-work': 'poster', href: './works.html#poster' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-hero-cta', attrs: { href: './thread.html?thread=koenji-dance-history' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-thread-read', attrs: { href: './thread.html?thread=koenji-dance-history' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-reality-card official-action', attrs: { href: 'https://yaguchishoten.jp/' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'site-menu-link', attrs: { href: './shelf.html?shelf=koenji' } }) });
  r.listeners.click({ target: el({ tag: 'a', attrs: { href: 'https://example.com/arbitrary' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-brand-link', attrs: { href: './credits.html' } }) });
  const ev = r.events();
  check('HOME city click → entry city/shimokitazawa exact', by(ev, 'v3_entry_open').filter((e) => e[2].content_type === 'city').map((e) => e[2].content_id).join() === 'shimokitazawa');
  check('HOME work clicks → entry work/film + work/video exact; unknown data-work dropped', by(ev, 'v3_entry_open').filter((e) => e[2].content_type === 'work').map((e) => e[2].content_id).join() === 'film,video');
  check('HOME thread clicks → entry thread/koenji_dance_history once', by(ev, 'v3_entry_open').filter((e) => e[2].content_type === 'thread').map((e) => e[2].content_id).join() === 'koenji_dance_history');
  check('HOME legacy shelf_open kept (city card + menu)', by(ev, 'v3_shelf_open').length === 1 && by(ev, 'v3_entry_open').filter((e) => e[2].content_id === 'koenji').length === 0);
  check('HOME reality card → official_action + external home/hostname', by(ev, 'v3_official_action').length === 1 && by(ev, 'v3_external_open').length === 1 && by(ev, 'v3_external_open')[0][2].content_id === 'home' && by(ev, 'v3_external_open')[0][2].link_domain === 'yaguchishoten.jp');
  check('HOME arbitrary external anchor / credits / menu → no external, no continue', by(ev, 'v3_external_open').length === 1 && by(ev, 'v3_continue_open').length === 0);
  auditParams('home', ev);
}

/* ---- 4. Shelf: no landing entry; official + weekly official external; calendar utility 0 ---- */
{
  const r = run('emotionbookstore.com', '/shelf.html', '?shelf=koenji', {});
  const first = r.events();
  check('Shelf first paint: shelf_view only (no entry inference)', first.map((e) => e[1]).join() === 'v3_shelf_view', first.map((e) => e[1]));
  r.listeners.click({ target: el({ tag: 'a', cls: 'official-action', attrs: { href: 'https://www.koenji-pal.jp/about' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'weekly-feature-official', attrs: { href: 'https://www.loft-prj.co.jp/schedule/shelter/schedule' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'weekly-feature-secondary weekly-feature-calendar', attrs: { href: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=secret' } }) });
  r.listeners.click({ target: el({ tag: 'button', cls: 'open-button' }) });
  const ev = r.events();
  check('Shelf external: official + weekly official only, origin shelf + hostname', by(ev, 'v3_external_open').map((e) => e[2].content_id + '|' + e[2].link_domain).join() === 'shelf|www.koenji-pal.jp,shelf|www.loft-prj.co.jp');
  check('Google Calendar utility → external 0 / official_action 0 for it', by(ev, 'v3_external_open').length === 2 && by(ev, 'v3_official_action').length === 1);
  check('Shelf legacy detail_open kept', by(ev, 'v3_detail_open').length === 1);
  auditParams('shelf', ev);
}

/* ---- 5. Works: no landing entry; per-section view ids; direct hash entry; external wk-action only; continue; media preview ---- */
{
  const sections = ['book', 'film', 'music', 'video'].map((id) => el({ tag: 'section', cls: 'wk-work', attrs: { 'data-work': id } }));
  const r = run('emotionbookstore.com', '/works.html', '', { all: (sel) => (sel === '.wk-work[data-work]' ? sections : []) });
  const first = r.events();
  check('Works first paint: entry work/works = 0 (no events)', first.length === 0, first.map((e) => e[1]));
  r.listeners.DOMContentLoaded();
  const io = r.observers[0]; check('Works observer on 4 sections', io && io.targets.length === 4);
  io.cb([{ target: sections[3], isIntersecting: true }]); /* direct hash entry works.html#video: the video section is in view first */
  io.cb([{ target: sections[0], isIntersecting: true }, { target: sections[0], isIntersecting: true }]);
  io.cb([{ target: sections[3], isIntersecting: true }]);
  r.listeners.click({ target: el({ tag: 'a', cls: 'wk-route', attrs: { href: './thread.html?thread=morisaki-book' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'wk-route', attrs: { href: './thread.html?thread=morisaki-book' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'wk-action official-action', attrs: { href: 'https://boris.bandcamp.com/album/x?ref=1' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'wk-source-link', attrs: { href: 'https://example.org/not-approved' } }) });
  r.listeners.click({ target: el({ tag: 'button', cls: 'v3-video-load wk-video-load' }) });
  r.ctx.v3Analytics.mediaPreviewOpen();
  const ev = r.events();
  check('Works section view = video, book (once each, in reach order)', by(ev, 'v3_works_section_view').map((e) => e[2].content_type + '/' + e[2].content_id).join() === 'work/video,work/book', by(ev, 'v3_works_section_view').map((e) => e[2]));
  check('Works entry 0, generic works id 0', by(ev, 'v3_entry_open').length === 0 && !JSON.stringify(ev).includes('"works"'));
  check('Works continue to morisaki_book once', by(ev, 'v3_continue_open').map((e) => e[2].content_type + '/' + e[2].content_id).join() === 'thread/morisaki_book');
  check('Works external: wk-action only, origin work + hostname; non-approved anchor 0', by(ev, 'v3_external_open').length === 1 && by(ev, 'v3_external_open')[0][2].content_id === 'work' && by(ev, 'v3_external_open')[0][2].link_domain === 'boris.bandcamp.com');
  check('Works media preview: video/work, player button not an external open', by(ev, 'v3_media_preview_open').length === 1 && by(ev, 'v3_media_preview_open')[0][2].content_id === 'work' && by(ev, 'v3_official_action').length === 1);
  auditParams('works', ev);
}

/* PARKS uses the existing event definitions, with only bounded public IDs added. */
{
  const scenes = ['p0', 'p1', 'p2', 'p3'].map((id) => el({ tag: 'section', cls: 'th-scene', attrs: { 'data-scene': id } }));
  const end = el({ tag: 'div', cls: 'th-end' });
  const article = el({ tag: 'article', cls: 'th-thread', attrs: { 'data-thread-id': 'kichijoji-parks' }, children: scenes.concat([end]) });
  const dom = { byId: { threadRoot: el({ tag: 'div', id: 'threadRoot', children: [article] }) } };
  const r = run('emotionbookstore.com', '/thread.html', '?thread=kichijoji-parks', dom);
  r.listeners.DOMContentLoaded();
  const io = r.observers[0];
  check('PARKS observes four scenes and finite ending', !!io && io.targets.length === 5);
  if (io) io.cb(io.targets.map((target) => ({ target, isIntersecting: true })));
  r.ctx.v3Analytics.threadStage('kichijoji_parks', 'p99');
  r.ctx.v3Analytics.threadStage('kichijoji_parks', 's0');
  check('PARKS bounded start', by(r.events(), 'v3_thread_start').map((e) => e[2].content_id).join() === 'kichijoji_parks');
  check('PARKS stages exact; unknown and cross-thread stages dropped', by(r.events(), 'v3_thread_stage').map((e) => e[2].content_id).join() === 'kichijoji_parks:p0,kichijoji_parks:p1,kichijoji_parks:p2,kichijoji_parks:p3');
  check('PARKS complete at finite ending', by(r.events(), 'v3_thread_complete').length === 1);
  auditParams('PARKS', r.events());
  for (const host of ['localhost', 'parks-preview.vercel.app']) {
    const p = run(host, '/thread.html', '?thread=kichijoji-parks', dom);
    check('PARKS preview/local GA4 zero ' + host, p.head.length === 0 && p.events().length === 0 && !p.ctx.v3Analytics);
  }
}

/* ---- 6. Thread: start after rendered .th-thread[data-thread-id]; composite stage ids; complete; evidence; approved external; continue ---- */
{
  const scenes = ['s0', 's1', 's2', 's3', 's4', 's5'].map((id) => el({ tag: 'section', cls: 'th-scene', attrs: { 'data-scene': id } }));
  const end = el({ tag: 'div', cls: 'th-end' });
  const article = el({ tag: 'article', cls: 'th-thread', attrs: { 'data-thread-id': 'koenji-dance-history' }, children: scenes.concat([end]) });
  const root = el({ tag: 'div', id: 'threadRoot', children: [article] });
  const r = run('emotionbookstore.com', '/thread.html', '?thread=koenji-dance-history', { byId: { threadRoot: root } });
  const first = r.events();
  check('Thread first paint: no entry inference, no start before render', first.length === 0, first.map((e) => e[1]));
  r.listeners.DOMContentLoaded();
  const io = r.observers[0]; check('Thread observer on 6 scenes + end', io && io.targets.length === 7);
  io.cb(io.targets.map((t) => ({ target: t, isIntersecting: t === scenes[0] })));
  io.cb([{ target: scenes[1], isIntersecting: true }, { target: scenes[1], isIntersecting: true }]);
  io.cb([{ target: end, isIntersecting: true }, { target: end, isIntersecting: true }]);
  const details = el({ tag: 'details', open: true, parent: el({ tag: 'div', cls: 'th-evidence' }) });
  r.listeners.toggle({ target: details }); r.listeners.toggle({ target: details });
  r.listeners.click({ target: el({ tag: 'a', cls: 'th-source-link', attrs: { href: 'https://suginamigaku.org/2022/11/koenji-awaodori.html' } }) });
  r.listeners.click({ target: el({ tag: 'span', cls: 'th-destination-label', parent: el({ tag: 'a', cls: 'th-destination-link', attrs: { href: 'https://www.koenji-pal.jp/about' } }) }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'th-node-link', attrs: { href: 'https://example.org/arbitrary' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'th-spatial-link', attrs: { href: './atlas/' } }) }); r.listeners.click({ target: el({ tag: 'a', cls: 'th-spatial-link', attrs: { href: './atlas/' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'th-exit', attrs: { href: './index.html' } }) });
  r.listeners.click({ target: el({ tag: 'button', cls: 'v3-video-load th-video-load' }) });
  r.ctx.v3Analytics.mediaPreviewOpen(); r.ctx.v3Analytics.mediaPreviewOpen('UNAPPROVED');
  r.ctx.v3Analytics.threadStage('koenji_dance_history', 's9'); r.ctx.v3Analytics.threadStage('unknown_thread', 's1'); r.ctx.v3Analytics.entryOpen('spatial', 'bldg_56f78359-a616-4c15-b57f-48bee9244f7b');
  const ev = r.events();
  check('thread start once after render', by(ev, 'v3_thread_start').length === 1 && by(ev, 'v3_thread_start')[0][2].content_type === 'thread' && by(ev, 'v3_thread_start')[0][2].content_id === 'koenji_dance_history');
  check('thread stage composite ids exact, type thread_stage, once each', by(ev, 'v3_thread_stage').map((e) => e[2].content_type + '/' + e[2].content_id).join() === 'thread_stage/koenji_dance_history:s0,thread_stage/koenji_dance_history:s1', by(ev, 'v3_thread_stage').map((e) => e[2]));
  check('bare s0 / w0 never sent; unknown stage / thread dropped', !ev.some((e) => /^[sw][0-9]$/.test(String((e[2] || {}).content_id))) && !JSON.stringify(ev).includes('s9') && !JSON.stringify(ev).includes('unknown_thread'));
  check('thread complete once', by(ev, 'v3_thread_complete').length === 1 && by(ev, 'v3_thread_complete')[0][2].content_id === 'koenji_dance_history');
  check('evidence open once (thread/koenji_dance_history)', by(ev, 'v3_evidence_open').length === 1 && by(ev, 'v3_evidence_open')[0][2].content_type === 'thread' && by(ev, 'v3_evidence_open')[0][2].content_id === 'koenji_dance_history');
  check('external: source + destination only (origin thread + hostname); arbitrary anchor 0', by(ev, 'v3_external_open').map((e) => e[2].content_id + '|' + e[2].link_domain).join() === 'thread|suginamigaku.org,thread|www.koenji-pal.jp');
  check('continue to spatial once; exit to HOME not counted', by(ev, 'v3_continue_open').map((e) => e[2].content_type + '/' + e[2].content_id).join() === 'spatial/koenji');
  check('media preview once (video/thread); unknown id dropped; player button no external', by(ev, 'v3_media_preview_open').length === 1 && by(ev, 'v3_media_preview_open')[0][2].content_id === 'thread' && by(ev, 'v3_external_open').length === 2);
  check('unknown gml-shaped entry id dropped (whole event)', by(ev, 'v3_entry_open').length === 0);
  check('no video id / title / duration / query anywhere', !/dt33RGSRuo0|duration|"title"/.test(JSON.stringify(ev)));
  auditParams('thread', ev);
  /* lost / unknown thread: nothing */
  const lostRoot = el({ tag: 'div', id: 'threadRoot', children: [el({ tag: 'article', cls: 'th-lost' })] });
  const l = run('emotionbookstore.com', '/thread.html', '?thread=nonexistent', { byId: { threadRoot: lostRoot } });
  l.listeners.DOMContentLoaded(); l.listeners.toggle({ target: el({ tag: 'details', open: true, parent: el({ tag: 'div', cls: 'th-evidence' }) }) });
  check('lost thread: start / stage / complete / evidence / entry = 0', l.events().length === 0 && l.observers.length === 0, l.events().map((e) => e[1]));
  const bad = el({ tag: 'article', cls: 'th-thread', attrs: { 'data-thread-id': 'koenji-awaodori' }, children: [el({ tag: 'section', cls: 'th-scene', attrs: { 'data-scene': 's0' } })] });
  const u = run('emotionbookstore.com', '/thread.html', '?thread=koenji-awaodori', { byId: { threadRoot: el({ tag: 'div', id: 'threadRoot', children: [bad] }) } });
  u.listeners.DOMContentLoaded();
  check('unknown rendered thread id: 0 events', u.events().length === 0 && u.observers.length === 0);
}

/* ---- 7. Atlas: entry on arrival; continue once; evidence; al-link + attribution external; view / scene / gml never ---- */
{
  const r = run('emotionbookstore.com', '/atlas/', '', {});
  r.listeners.DOMContentLoaded();
  check('atlas registers no reach observer', r.observers.length === 0);
  r.listeners.click({ target: el({ tag: 'a', cls: 'al-return atlas-back-link', attrs: { href: '../thread.html?thread=koenji-dance-history' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'al-return-link', attrs: { href: '../thread.html?thread=koenji-dance-history' } }) });
  r.listeners.toggle({ target: el({ tag: 'details', open: true, parent: el({ tag: 'div', cls: 'al-evidence' }) }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'al-link', attrs: { href: 'https://koenji-awaodori.com/about/his01.html' } }) });
  r.listeners.click({ target: el({ tag: 'a', attrs: { href: 'https://www.mlit.go.jp/plateau/' }, parent: el({ tag: 'p', cls: 'al-attribution-links' }) }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'al-brand', attrs: { href: 'https://example.org/arbitrary' } }) });
  r.listeners.click({ target: el({ tag: 'button', cls: 'al-view', attrs: { 'data-view': 'city' } }) });
  r.listeners.click({ target: el({ tag: 'button', cls: 'al-rail-item' }) });
  r.ctx.v3Analytics.mediaPreviewOpen();
  const ev = r.events();
  check('atlas entry once (spatial/koenji) on arrival', by(ev, 'v3_entry_open').map((e) => e[2].content_type + '/' + e[2].content_id).join() === 'spatial/koenji');
  check('atlas continue to thread once (two return links, one navigation)', by(ev, 'v3_continue_open').map((e) => e[2].content_type + '/' + e[2].content_id).join() === 'thread/koenji_dance_history');
  check('atlas evidence once', by(ev, 'v3_evidence_open').length === 1 && by(ev, 'v3_evidence_open')[0][2].content_id === 'koenji');
  check('atlas external: al-link + attribution only, origin spatial + hostname', by(ev, 'v3_external_open').map((e) => e[2].content_id + '|' + e[2].link_domain).join() === 'spatial|koenji-awaodori.com,spatial|www.mlit.go.jp');
  check('atlas: no media preview, view / scene buttons unmeasured', by(ev, 'v3_media_preview_open').length === 0 && ev.length === 5, ev.map((e) => e[1]));
  check('atlas page fields coarse', ev.every((e) => e[2].page_title === 'V3 Spatial Beta' && e[2].page_location === 'https://emotionbookstore.com/atlas/'));
  auditParams('atlas', ev);
}

/* ---- 8. generic pages: no origin class → no external / continue ---- */
{
  const d = run('emotionbookstore.com', '/data.html', '', {}); d.listeners.click({ target: el({ tag: 'a', cls: 'official-action', attrs: { href: 'https://x.com/emotion_books' } }) });
  check('generic page: official_action legacy only, external 0', by(d.events(), 'v3_official_action').length === 1 && by(d.events(), 'v3_external_open').length === 0);
}

/* ---- 9. data.html v4.1 Trust disclosure ---- */
{
  const data = fs.readFileSync(path.join(ROOT, 'data.html'), 'utf8');
  for (const t of ['限定した公開IDで計測する場合があります', 'IPアドレス等から推定されるおおよその地域', 'GPSや現在地、アカウントやユーザーのIDを送りません', '選択した建物やその識別子も送りません', '外部サービスへの移動はGA4のオン／オフとは別の操作です。']) check('data.html discloses: ' + t.slice(0, 24), data.includes(t));
  for (const t of ['位置情報はGA4へ送らない', '位置情報を送りません', '個人情報を送りません']) check('data.html avoids over-broad claim: ' + t, !data.includes(t));
}

if (fails.length) { console.log(`MEASUREMENT_V4_1_SELFTEST_FAIL (${pass}/${pass + fails.length})`); for (const f of fails) console.log('- FAIL ' + f); process.exit(1); }
console.log(`MEASUREMENT_V4_1_SELFTEST_GO (${pass}/${pass})`);
console.log('preview/local fail-closed; 17 events exact; entry = HOME clicks + Atlas arrival; works sections book|film|music|video; thread_stage composite ids after rendered thread; external = approved surfaces only (calendar/arbitrary 0); GA4 config sanitized; forbidden payload 0');
