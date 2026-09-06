#!/usr/bin/env node
/* MEASUREMENT v0.4 SELFTEST — analytics-v3.js を stub DOM で実行し、payload の contract を確かめる。
   - Preview / local host: fail-closed（gtag script 0、dataLayer 無し、API 無し）
   - Production host: 8 + 9 event、param は content_type / content_id / link_domain だけ、unknown value は drop
   - once: entry / thread start / stage / complete / evidence / continue / media preview は page load ごとに 1 回
   - inline video: 明示 click の player 生成時だけ v3_media_preview_open（content_type=video, content_id=thread|work）。
     video id / title / duration を送らない。player load は v3_external_open にしない
   - Atlas: entry spatial/koenji、Thread へ戻る導線は continue thread/koenji_dance_history（重複なし）。
     座標 / frame / view / gml を送らない
   使い方: node qa/measurement_v04_selftest.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'analytics-v3.js'), 'utf8');
let pass = 0; const fails = [];
function check(name, ok, detail) { if (ok) pass++; else fails.push(name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 400))); }

/* tiny DOM stubs: elements match simple selectors (tag, .class, #id, [href]) */
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
  e.querySelector = (sel) => e.children.find((c) => c.matches(sel)) || null;
  e.querySelectorAll = (sel) => e.children.filter((c) => c.matches(sel));
  return e;
}

function run(hostname, pathName, search, dom) {
  const store = new Map(); const head = []; const listeners = {}; const observers = [];
  const ctx = {
    URL, Date, Object, Array, String, RegExp, encodeURIComponent, Math, JSON, console,
    location: { hostname, href: 'https://' + hostname + pathName + (search || ''), origin: 'https://' + hostname, pathname: pathName, search: search || '', hash: '' },
    history: { replaceState() {} }, navigator: { doNotTrack: '0', msDoNotTrack: '0' },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    IntersectionObserver: function (cb) { const o = { cb, targets: [], observe(t) { this.targets.push(t); }, unobserve() {}, disconnect() {} }; observers.push(o); return o; },
    document: { referrer: '', readyState: 'loading', head: { appendChild: (n) => head.push(n) }, createElement: (t) => ({ tagName: String(t).toUpperCase(), set src(v) { this._src = v; }, get src() { return this._src; } }),
      addEventListener(type, fn) { listeners[type] = fn; }, getElementById: (id) => (dom && dom.byId && dom.byId[id]) || null, querySelectorAll: (sel) => (dom && dom.all ? dom.all(sel) : []) },
  };
  ctx.window = ctx;
  vm.runInNewContext(src, ctx, { filename: 'analytics-v3.js' });
  return { ctx, head, listeners, observers, events: () => (ctx.dataLayer || []).filter((x) => x[0] === 'event' && x[1] !== 'page_view') };
}
const PARAM_KEYS = new Set(['page_location', 'page_title', 'page_referrer', 'campaign_source', 'content_type', 'content_id', 'link_domain']);
const EVENTS = ['v3_home_view', 'v3_shelf_open', 'v3_shelf_view', 'v3_detail_open', 'v3_official_action', 'v3_suggest_view', 'v3_suggest_copy', 'v3_suggest_form_open', 'v3_entry_open', 'v3_works_section_view', 'v3_thread_start', 'v3_thread_stage', 'v3_thread_complete', 'v3_evidence_open', 'v3_external_open', 'v3_continue_open', 'v3_media_preview_open'];
function auditParams(events) {
  for (const e of events) { const p = e[2] || {}; for (const k of Object.keys(p)) check('param key allowlisted ' + e[1] + '.' + k, PARAM_KEYS.has(k)); check('no query/hash in page_location ' + e[1], !/[?#]/.test(p.page_location || '')); if (p.link_domain) check('link_domain hostname only', /^[a-z0-9.-]+$/.test(p.link_domain) && !/[/?#]/.test(p.link_domain)); }
}

/* ---- 1. Preview / local: fail closed ---- */
for (const host of ['emotion-bookstore-n8n5kl0xu-emotion-bookstore.vercel.app', '127.0.0.1', 'localhost']) {
  const r = run(host, '/atlas/');
  check('fail-closed ' + host, r.head.length === 0 && r.ctx.dataLayer === undefined && r.ctx.v3Analytics === undefined && !r.listeners.click, { head: r.head.length });
}

/* ---- 2. Production: allowed set exact ---- */
{
  const m = src.match(/var ALLOWED_EVENTS = \{([\s\S]*?)\};/); const names = (m ? m[1] : '').match(/v3_[a-z_]+/g) || [];
  check('ALLOWED_EVENTS is exactly the 17 v0.4 events', names.join() === EVENTS.join(), names);
  check('no koenji_awaodori id in new measurement', !/koenji_awaodori/.test(src));
  check('no coordinate / map / building vocabulary', !/gml|latitude|longitude|coordinates|zoom|viewport|camera|building|frame|data-view/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')));
  check('unknown id drops the whole event (no id-less bounded event)', src.includes('if (!bounded(type, id)) return;') && src.includes("if (!bounded('external', originId) || !domain) return;"));
}

/* ---- 3. Thread page: entry + start + stages once + complete once + evidence once + external + continue to atlas ---- */
{
  const scenes = ['s0', 's1', 's2', 's3', 's4', 's5'].map((id) => el({ tag: 'section', cls: 'th-scene', attrs: { 'data-scene': id } }));
  const end = el({ tag: 'div', cls: 'th-end' });
  const root = el({ tag: 'div', id: 'threadRoot', children: [el({ tag: 'article', cls: 'th-thread' })].concat(scenes, [end]) });
  const r = run('emotionbookstore.com', '/thread.html', '?thread=koenji-dance-history', { byId: { threadRoot: root } });
  check('prod loads exactly one gtag script', r.head.length === 1 && /googletagmanager\.com\/gtag\/js\?id=G-/.test(r.head[0].src));
  r.listeners.DOMContentLoaded();
  const io = r.observers[0]; check('thread observer registered on 6 scenes + end', io && io.targets.length === 7);
  io.cb(io.targets.map((t) => ({ target: t, isIntersecting: t === scenes[0] })));
  io.cb([{ target: scenes[1], isIntersecting: true }, { target: scenes[1], isIntersecting: true }]);
  io.cb([{ target: end, isIntersecting: true }, { target: end, isIntersecting: true }]);
  const details = el({ tag: 'details', open: true, parent: el({ tag: 'div', cls: 'th-evidence' }) });
  r.listeners.toggle({ target: details }); r.listeners.toggle({ target: details });
  const official = el({ tag: 'a', cls: 'th-destination-link official-action', attrs: { href: 'https://www.koenji-pal.jp/about' } });
  r.listeners.click({ target: official });
  const source = el({ tag: 'a', cls: 'th-source-link', attrs: { href: 'https://suginamigaku.org/2022/11/koenji-awaodori.html' } });
  r.listeners.click({ target: source });
  const atlasLink = el({ tag: 'a', cls: 'th-spatial-link', attrs: { href: './atlas/' } });
  r.listeners.click({ target: atlasLink }); r.listeners.click({ target: atlasLink });
  const exit = el({ tag: 'a', cls: 'th-exit', attrs: { href: './index.html' } }); r.listeners.click({ target: exit });
  const videoButton = el({ tag: 'button', cls: 'v3-video-load th-video-load' }); r.listeners.click({ target: videoButton });
  r.ctx.v3Analytics.mediaPreviewOpen(); r.ctx.v3Analytics.mediaPreviewOpen(); r.ctx.v3Analytics.mediaPreviewOpen('UNAPPROVED');
  const ev = r.events(); const by = (n) => ev.filter((e) => e[1] === n);
  check('thread entry once', by('v3_entry_open').length === 1 && by('v3_entry_open')[0][2].content_type === 'thread' && by('v3_entry_open')[0][2].content_id === 'koenji_dance_history', by('v3_entry_open'));
  check('thread start once', by('v3_thread_start').length === 1 && by('v3_thread_start')[0][2].content_id === 'koenji_dance_history');
  check('thread stages s0, s1 once each', by('v3_thread_stage').map((e) => e[2].content_id).join() === 's0,s1', by('v3_thread_stage').map((e) => e[2].content_id));
  check('thread complete once', by('v3_thread_complete').length === 1 && by('v3_thread_complete')[0][2].content_id === 'koenji_dance_history');
  check('evidence open once', by('v3_evidence_open').length === 1 && by('v3_evidence_open')[0][2].content_type === 'thread' && by('v3_evidence_open')[0][2].content_id === 'koenji_dance_history');
  check('legacy official action kept', by('v3_official_action').length === 1);
  check('external opens: origin thread + hostname only (official + source)', by('v3_external_open').length === 2 && by('v3_external_open').every((e) => e[2].content_type === 'external' && e[2].content_id === 'thread') && by('v3_external_open').map((e) => e[2].link_domain).join() === 'www.koenji-pal.jp,suginamigaku.org', by('v3_external_open').map((e) => e[2]));
  check('continue to spatial once, exit to HOME not counted', by('v3_continue_open').length === 1 && by('v3_continue_open')[0][2].content_type === 'spatial' && by('v3_continue_open')[0][2].content_id === 'koenji');
  check('media preview: once, video type, thread id, unknown id dropped', by('v3_media_preview_open').length === 1 && by('v3_media_preview_open')[0][2].content_type === 'video' && by('v3_media_preview_open')[0][2].content_id === 'thread');
  check('player button click is not an external open', by('v3_external_open').length === 2);
  check('page_title coarse', ev.every((e) => e[2].page_title === 'V3 Thread'));
  auditParams(ev);
  check('no video id / title / duration anywhere', !JSON.stringify(ev).includes('dt33RGSRuo0') && !/"(title|video_id|duration|url|href)":/.test(JSON.stringify(ev)));
}

/* ---- 4. Works page: entry + section reach once + continue to thread + external + media preview (work) ---- */
{
  const sections = ['book', 'film', 'music', 'video'].map((id) => el({ tag: 'section', cls: 'wk-work', attrs: { 'data-work': id } }));
  const r = run('emotionbookstore.com', '/works.html', '', { all: (sel) => (sel === '.wk-work[data-work]' ? sections : []) });
  r.listeners.DOMContentLoaded();
  const io = r.observers[0]; io.cb([{ target: sections[0], isIntersecting: true }]); io.cb([{ target: sections[1], isIntersecting: true }]);
  r.listeners.click({ target: el({ tag: 'a', cls: 'wk-route', attrs: { href: './thread.html?thread=morisaki-book' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'wk-route', attrs: { href: './thread.html?thread=morisaki-book' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'wk-route', attrs: { href: './thread.html?thread=morisaki-film' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'wk-action official-action', attrs: { href: 'https://boris.bandcamp.com/album/x' } }) });
  r.ctx.v3Analytics.mediaPreviewOpen(); r.ctx.v3Analytics.mediaPreviewOpen();
  const ev = r.events(); const by = (n) => ev.filter((e) => e[1] === n);
  check('works entry once (work/works)', by('v3_entry_open').length === 1 && by('v3_entry_open')[0][2].content_type === 'work' && by('v3_entry_open')[0][2].content_id === 'works');
  check('works section view once', by('v3_works_section_view').length === 1);
  check('continue to threads: book once + film once', by('v3_continue_open').map((e) => e[2].content_id).join() === 'morisaki_book,morisaki_film');
  check('works external: origin work + hostname', by('v3_external_open').length === 1 && by('v3_external_open')[0][2].content_id === 'work' && by('v3_external_open')[0][2].link_domain === 'boris.bandcamp.com');
  check('media preview once with work id', by('v3_media_preview_open').length === 1 && by('v3_media_preview_open')[0][2].content_id === 'work');
  auditParams(ev);
}

/* ---- 5. Atlas page: entry spatial/koenji, continue back to thread once, evidence, attribution external; nothing spatial-precise ---- */
{
  const r = run('emotionbookstore.com', '/atlas/', '', {});
  r.listeners.DOMContentLoaded();
  check('atlas registers no reach observer (no view / frame measurement)', r.observers.length === 0);
  r.listeners.click({ target: el({ tag: 'a', cls: 'al-return', attrs: { href: '../thread.html?thread=koenji-dance-history' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'al-return-link', attrs: { href: '../thread.html?thread=koenji-dance-history' } }) });
  r.listeners.toggle({ target: el({ tag: 'details', open: true, parent: el({ tag: 'div', cls: 'al-evidence' }) }) });
  r.listeners.click({ target: el({ tag: 'a', attrs: { href: 'https://www.mlit.go.jp/plateau/' } }) });
  r.listeners.click({ target: el({ tag: 'button', cls: 'al-view', attrs: { 'data-view': 'city' } }) });
  r.ctx.v3Analytics.mediaPreviewOpen();
  r.ctx.v3Analytics.entryOpen('spatial', 'bldg_56f78359-a616-4c15-b57f-48bee9244f7b');
  const ev = r.events(); const by = (n) => ev.filter((e) => e[1] === n);
  check('atlas entry once (spatial/koenji)', by('v3_entry_open').length === 1 && by('v3_entry_open')[0][2].content_type === 'spatial' && by('v3_entry_open')[0][2].content_id === 'koenji', by('v3_entry_open'));
  check('atlas continue to thread once (two return links, one navigation)', by('v3_continue_open').length === 1 && by('v3_continue_open')[0][2].content_type === 'thread' && by('v3_continue_open')[0][2].content_id === 'koenji_dance_history');
  check('atlas evidence once', by('v3_evidence_open').length === 1 && by('v3_evidence_open')[0][2].content_id === 'koenji');
  check('atlas attribution external: spatial + hostname', by('v3_external_open').length === 1 && by('v3_external_open')[0][2].content_id === 'spatial' && by('v3_external_open')[0][2].link_domain === 'www.mlit.go.jp');
  check('no media preview on atlas, view button not measured, gml id dropped', by('v3_media_preview_open').length === 0 && !JSON.stringify(ev).includes('bldg_') && !JSON.stringify(ev).includes('city'));
  check('atlas page_title coarse', ev.every((e) => e[2].page_title === 'V3 Spatial Beta' && e[2].page_location === 'https://emotionbookstore.com/atlas/'));
  auditParams(ev);
}

/* ---- 6. HOME / shelf: legacy events + Founder D external + shelf entry from bounded route only ---- */
{
  const r = run('emotionbookstore.com', '/', '', {});
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-reality-card official-action', attrs: { href: 'https://yaguchishoten.jp/' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-city shelf-entry', attrs: { href: './shelf.html?shelf=koenji' } }) });
  r.listeners.click({ target: el({ tag: 'a', cls: 'hc-thread-read', attrs: { href: './thread.html?thread=koenji-dance-history' } }) });
  const ev = r.events(); const by = (n) => ev.filter((e) => e[1] === n);
  check('home view + official action + external home/hostname', by('v3_home_view').length === 1 && by('v3_official_action').length === 1 && by('v3_external_open').length === 1 && by('v3_external_open')[0][2].content_id === 'home' && by('v3_external_open')[0][2].link_domain === 'yaguchishoten.jp');
  check('home shelf_open legacy, no entry / continue from HOME', by('v3_shelf_open').length === 1 && by('v3_entry_open').length === 0 && by('v3_continue_open').length === 0);
  auditParams(ev);
  const s = run('emotionbookstore.com', '/shelf.html', '?shelf=koenji', {}); const se = s.events();
  check('shelf entry koenji + shelf_view', se.some((e) => e[1] === 'v3_entry_open' && e[2].content_type === 'shelf' && e[2].content_id === 'koenji') && se.some((e) => e[1] === 'v3_shelf_view') && !JSON.stringify(se).includes('?shelf='));
  const u = run('emotionbookstore.com', '/shelf.html', '?shelf=<script>x', {});
  check('unknown shelf route → no entry id', !u.events().some((e) => e[1] === 'v3_entry_open'));
  const d = run('emotionbookstore.com', '/data.html', '', {}); d.listeners.click({ target: el({ tag: 'a', attrs: { href: 'https://x.com/emotion_books' } }) });
  check('no external open from generic pages (no origin class)', d.events().every((e) => e[1] !== 'v3_external_open'));
}

if (fails.length) { console.log(`MEASUREMENT_V04_SELFTEST_FAIL (${pass}/${pass + fails.length})`); for (const f of fails) console.log('- FAIL ' + f); process.exit(1); }
console.log(`MEASUREMENT_V04_SELFTEST_GO (${pass}/${pass})`);
console.log('preview/local fail-closed; 17 events exact; params content_type/content_id/link_domain only; once semantics; media preview thread|work on explicit click only; atlas entry/continue bounded; no coordinates / video id / query');
