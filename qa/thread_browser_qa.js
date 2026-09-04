#!/usr/bin/env node
/* THREAD BROWSER QA — Cultural Thread（thread.html?thread=koenji-awaodori）の実ブラウザ検査。
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node qa/thread_browser_qa.js [--out <dir>]
 *
 * ローカルの静的サーバだけを使い、外向きの通信は一切しない（外へ出た request は
 * それ自体が FAIL）。--out を渡したときだけ、証跡の screenshot をそこへ書く
 * （repo の中には書かない）。qa/browser_qa.js / home_responsive_check.js を
 * 置き換えない。HOME 側は「実 anchor 1 + hold 7」と HOME → Thread → 戻る だけを見る。
 *
 * 見られなかったものは pass に混ぜず、NOT OBSERVABLE として別枠で出す。 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('--out', '');
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const THREAD = 'thread.html?thread=koenji-awaodori';
const TITLE = '高円寺｜踊りが街に根づくまで｜みんなの感情書店';
const KOENJI_TOKENS = ['踊りが街に根づくまで', '阿波おどり', '徳島', '1957', '木場連', '鴨川', 'パル商店街'];
const DESTINATIONS = [
  ['1957の起点を歩く（高円寺パル商店街）', 'https://www.koenji-pal.jp/about'],
  ['現在の連を知る／参加・体験を相談する', 'https://koenji-awaodori.com/category1/join.html'],
  ['現在の公式情報を見る', 'https://koenji-awaodori.com/']
];
const FORBIDDEN = ['次の3つ', 'また見たい', 'おすすめ', 'あなた向け', 'ランキング', '人気順', 'トレンド', 'NEW', 'TRENDING', 'FOR YOU', '見終わりました',
  'スタンプ', 'ポイント', 'スコア', '正解', '不正解', 'クイズ', '診断', 'カウントダウン', '次へ'];

let pass = 0;
const fails = [];
const unobserved = [];
function check(scope, name, ok, detail) {
  if (ok) { pass++; return; }
  fails.push(`${scope} ${name} ${detail === undefined ? '' : JSON.stringify(detail)}`);
}
function notObservable(scope, name, why) { unobserved.push(`${scope} ${name} :: ${why}`); }

function serve() {
  const s = http.createServer((q, r) => {
    const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    r.end(fs.readFileSync(f));
  });
  return new Promise((res) => s.listen(0, '127.0.0.1', () => res(s)));
}

/* 位置情報・カメラ・保存の呼び出しを数える。runtime は書き換えない。 */
const GUARD = () => {
  window.__permCalls = 0;
  window.__storageWrites = 0;
  const bump = () => { window.__permCalls++; };
  try {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = bump;
      navigator.geolocation.watchPosition = bump;
    }
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { bump(); return Promise.reject(new Error('blocked')); };
    if (navigator.permissions && navigator.permissions.query) {
      const q = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = (...a) => { bump(); return q(...a); };
    }
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { window.__storageWrites++; return setItem.apply(this, arguments); };
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...a) => { window.__storageWrites++; return open(...a); };
  } catch (e) {}
};

const MEASURE = () => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const R = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
  const txt = (sel, scope) => [...(scope || document).querySelectorAll(sel)].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
  const clipped = [];
  document.querySelectorAll('#main *').forEach((el) => {
    if (el.classList.contains('sr-only')) return;
    const b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) return;
    if (b.right > vw + 1 || b.left < -1) clipped.push(`${el.tagName}.${el.className} outside ${Math.round(b.left)}-${Math.round(b.right)}`);
    const cs = getComputedStyle(el);
    if (cs.display !== 'inline' && cs.overflow !== 'hidden' && el.scrollWidth > el.clientWidth + 1) clipped.push(`${el.tagName}.${el.className} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
  });
  const scenes = [...document.querySelectorAll('.th-scene')].map((s) => ({ id: s.getAttribute('data-scene'), rect: R(s), title: (s.querySelector('.th-scene-title') || {}).textContent }));
  const head = document.querySelector('.th-head');
  const beats = [...document.querySelectorAll('[data-beat]')].map((b) => ({ id: b.getAttribute('data-beat'), y: R(b).y, text: b.textContent.replace(/\s+/g, ' ') }));
  const relations = [...document.querySelectorAll('.th-relation')].map((r) => ({
    id: r.getAttribute('data-relation-id'), type: r.getAttribute('data-relation-type'), state: r.getAttribute('data-verification'), y: R(r).y,
    time: (r.querySelector('.th-relation-time') || {}).textContent, claims: r.querySelectorAll(':scope > .th-claim[data-layer="claim"]').length,
    supports: r.querySelectorAll(':scope > .th-support[data-layer="support"]').length, readingsInside: r.querySelectorAll('.th-reading').length,
    verification: (r.querySelector(':scope > .th-support > .th-verification') || {}).textContent, verificationH: r.querySelector(':scope > .th-support > .th-verification') ? R(r.querySelector(':scope > .th-support > .th-verification')).h : 0,
    surface: r.innerText.replace(/\s+/g, ' '), summary: (r.querySelector('summary') || {}).innerText, open: !!(r.querySelector('details') || {}).open, badges: r.querySelectorAll('.th-fact-badge').length
  }));
  const facts = [...document.querySelectorAll('.th-fact')].map((f) => ({ id: f.getAttribute('data-fact-id'), state: f.getAttribute('data-verification'), claims: f.querySelectorAll(':scope > .th-claim').length, supports: f.querySelectorAll(':scope > .th-support').length,
    surface: f.innerText.replace(/\s+/g, ' '), summary: (f.querySelector('summary') || {}).innerText, open: !!(f.querySelector('details') || {}).open, badges: f.querySelectorAll('.th-fact-badge').length }));
  const readings = [...document.querySelectorAll('.th-reading')].map((r) => ({
    layer: r.getAttribute('data-layer'), label: (r.querySelector('.th-reading-label') || {}).textContent, labelH: r.querySelector('.th-reading-label') ? R(r.querySelector('.th-reading-label')).h : 0, factBadges: r.querySelectorAll('.th-fact-badge').length,
    verification: r.hasAttribute('data-verification') || !!r.querySelector('.th-verification'), insideFact: !!r.closest('.th-relation, .th-fact'),
    scene: (r.closest('.th-scene') || {}).getAttribute ? r.closest('.th-scene').getAttribute('data-scene') : null, borderStyle: getComputedStyle(r).borderTopStyle
  }));
  const question = document.querySelector('[data-beat="question"]');
  const radios = [...document.querySelectorAll('input[name="thread-mode"]')].map((i) => ({ value: i.value, checked: i.checked, label: (i.closest('label') || {}).textContent, h: i.closest('label') ? R(i.closest('label')).h : 0 }));
  const targets = [...document.querySelectorAll('#main a, #main button, #main summary, #main label.th-mode-option')].map((el) => {
    const b = R(el); return { sel: (typeof el.className === 'string' && el.className.split(' ')[0]) || el.tagName, w: b.w, h: b.h };
  });
  const dest = [...document.querySelectorAll('.th-destination-link')].map((a) => ({ label: (a.querySelector('.th-destination-label') || a).textContent, href: a.getAttribute('href'), rel: a.getAttribute('rel'), target: a.getAttribute('target') }));
  const imgs = [...document.querySelectorAll('#main img')].map((i) => ({ src: i.getAttribute('src'), alt: i.getAttribute('alt'), loaded: i.complete && i.naturalWidth > 0, sameOrigin: new URL(i.currentSrc || i.src, location.href).origin === location.origin }));
  let animated = 0;
  document.querySelectorAll('#main *').forEach((el) => { const s = getComputedStyle(el); if ((s.animationName && s.animationName !== 'none') || (s.transitionProperty !== 'none' && parseFloat(s.transitionDuration) > 0)) animated++; });
  const exit = document.querySelector('.th-exit');
  const readStore = (fn) => { try { return fn(); } catch (e) { return 'THREW'; } };
  return {
    vw, docW: doc.scrollWidth, docH: doc.scrollHeight, title: document.title,
    threadId: (document.querySelector('.th-thread') || {}).getAttribute ? document.querySelector('.th-thread').getAttribute('data-thread-id') : null,
    h1: document.querySelectorAll('h1').length, h1Text: (document.querySelector('h1') || {}).textContent,
    header: txt('.th-eyebrow, .th-subject, .th-editor, .th-lens, .th-checked, .th-guidance-item'),
    clipped, scenes, headRect: head ? R(head) : null, beats, relations, facts, readings,
    question: question ? { text: (question.querySelector('.th-question') || {}).textContent, controls: question.querySelectorAll('input, button, select, textarea, a').length } : null,
    radios, targets, dest, imgs, animated, docAnimations: document.getAnimations ? document.getAnimations().length : null,
    statusText: txt('.th-status-item'), endLine: (document.querySelector('.th-end-line') || {}).textContent,
    exit: exit ? { href: exit.getAttribute('href'), text: exit.textContent, h: R(exit).h } : null,
    lost: document.querySelectorAll('.th-lost').length, sceneCount: document.querySelectorAll('.th-scene').length,
    cues: txt('.th-cue-text'), fonts: document.fonts.status,
    text: document.body.innerText,
    storage: { writes: window.__storageWrites, ls: readStore(() => localStorage.length), ss: readStore(() => sessionStorage.length), cookie: document.cookie },
    perm: window.__permCalls, dataLayer: typeof window.dataLayer, gtag: typeof window.gtag,
    search: location.search
  };
};

const FONT_PROBES = [['h1', '.th-title'], ['scene', '.th-scene-title'], ['claim', '.th-claim-text'], ['cue', '.th-cue-text'], ['question', '.th-question'],
  ['guide', '.th-guidance-item'], ['verification', '.th-relation[data-relation-id="rel:learned-1961-62"] > .th-support > .th-verification'], ['flag', '.th-evidence-flag'],
  /* source card は開いた drawer の中のものを読む（閉じた details の中は描画されず glyph が無い） */
  ['source', '.th-relation[data-relation-id="rel:learned-1961-62"] .th-source-name'], ['variant', '.th-relation[data-relation-id="rel:learned-1961-62"] .th-source-variant-reading'],
  ['destination', '.th-destination-label'], ['exit', '.th-exit']];
async function fonts(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const out = {};
  for (const [name, sel] of FONT_PROBES) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    if (!nodeId) { out[name] = 'NODE_NOT_FOUND'; continue; }
    const { fonts: pf } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    out[name] = pf.map((f) => f.familyName).join('|') || 'NO_GLYPHS';
  }
  await cdp.detach();
  return out;
}

async function openThread(browser, base, origin, opts, url) {
  const ctx = await browser.newContext(Object.assign({ deviceScaleFactor: 1, reducedMotion: 'reduce' }, opts));
  await ctx.addInitScript(GUARD);
  const external = [];
  ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(base + (url || THREAD), { waitUntil: 'load' });
  return { ctx, page, external, errs };
}
async function settle(page) {
  await page.waitForSelector('.th-thread, .th-lost', { timeout: 10000 });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => document.fonts.status === 'loaded').catch(() => {});
  await page.waitForTimeout(250);
}
async function shot(page, name, opts) {
  if (!OUT) return;
  await page.screenshot(Object.assign({ path: path.join(OUT, name + '.png'), fullPage: false }, opts || {}));
}
async function fullShot(page, name, width, maxH) {
  if (!OUT) return;
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.min(docH, maxH || 12000) });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
}
/* 要素の証跡は、viewport を document の高さに広げた単一 viewport から clip で切る。
   locator.screenshot() の captureBeyondViewport は position: fixed の skip-link を
   要素の上に描き込むことがある（実機の状態ではない）。 */
async function elementShot(page, selector, name, width) {
  if (!OUT) return;
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.min(docH, 12000) });
  await page.waitForTimeout(200);
  const clip = await page.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: Math.max(0, Math.floor(b.left)), y: Math.max(0, Math.floor(b.top + scrollY)), width: Math.ceil(b.width), height: Math.ceil(b.height) }; }, selector);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false, clip });
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const origin = new URL(base).origin;
  const browser = await chromium.launch({ args: ['--disable-checker-imaging', '--disable-partial-raster'] });

  const WIDTHS = [
    { name: 'w320', width: 320, height: 568, mobile: true },
    { name: 'w390', width: 390, height: 844, mobile: true },
    { name: 'w430', width: 430, height: 932, mobile: true },
    { name: 'w768', width: 768, height: 1024, mobile: true },
    { name: 'w1024', width: 1024, height: 768, mobile: false },
    { name: 'w1440', width: 1440, height: 900, mobile: false },
    { name: 'zoom200', width: 720, height: 450, mobile: false, dsf: 2 }
  ];

  for (const v of WIDTHS) {
    const S = `${v.name}/thread`;
    const { ctx, page, external, errs } = await openThread(browser, base, origin, { viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile, deviceScaleFactor: v.dsf || 1 });
    await settle(page);
    const m = await page.evaluate(MEASURE);

    check(S, 'thread_renders_koenji', m.threadId === 'koenji-awaodori' && m.lost === 0 && m.sceneCount === 6, { id: m.threadId, scenes: m.sceneCount });
    check(S, 'title_is_the_thread_title', m.title === TITLE, m.title);
    check(S, 'single_h1_is_the_thread_h1', m.h1 === 1 && m.h1Text === '踊りが街に根づくまで', { h1: m.h1, text: m.h1Text });
    check(S, 'header_copy_present', ['高円寺', '主題：高円寺阿波おどり', '編集：みんなの感情書店 編集部', 'このThreadでは「教わる／伝わる」に注目しました。', '最終確認：2026-09-04',
      '約15分。いつ止めてもかまいません。', 'アカウント・位置情報・カメラは使いません。', '歩きながら見ないでください。立ち止まれる場所で。'].every((t) => m.header.includes(t)), m.header);
    check(S, 'no_horizontal_overflow', m.docW <= m.vw, { docW: m.docW, vw: m.vw });
    check(S, 'no_clipped_text', m.clipped.length === 0, m.clipped.slice(0, 6));
    check(S, 'one_column_everywhere', !!m.headRect && m.scenes.every((s) => s.rect.x === m.headRect.x && Math.abs(s.rect.w - m.headRect.w) <= 1) &&
      m.scenes.every((s, i) => i === 0 || s.rect.y >= m.scenes[i - 1].rect.y + m.scenes[i - 1].rect.h - 1) && m.headRect.w <= 640,
      { head: m.headRect, scenes: m.scenes.map((s) => [s.id, s.rect]) });
    check(S, 'scenes_in_order_s0_to_s5', m.scenes.map((s) => s.id).join('|') === 's0|s1|s2|s3|s4|s5' &&
      m.scenes.map((s) => s.title).join('|') === 'いま|1957 ／ はじまる|1957のあと|1963 ／ 名を変える|いま、もう一度|現実へ', m.scenes.map((s) => [s.id, s.title]));
    check(S, 's2_six_beats_in_order', m.beats.map((b) => b.id).join('|') === 'before|encounter|question|evidence|reveal|after' && m.beats.every((b, i) => i === 0 || b.y > m.beats[i - 1].y), m.beats.map((b) => [b.id, b.y]));
    const revealAt = m.beats.findIndex((b) => b.id === 'reveal');
    check(S, 'no_learned_copy_before_reveal', revealAt > 0 && m.beats.slice(0, revealAt).every((b) => !/教わ|learned/.test(b.text)), m.beats.slice(0, revealAt).map((b) => b.id));
    const rel = Object.fromEntries(m.relations.map((r) => [r.id, r]));
    check(S, 'reveal_shows_connected_then_learned', !!rel['rel:connected-1961'] && !!rel['rel:learned-1961-62'] && rel['rel:connected-1961'].y < rel['rel:learned-1961-62'].y &&
      /1961 ／ つながる/.test(rel['rel:connected-1961'].time || '') && /1961–62 ／ 教わる/.test(rel['rel:learned-1961-62'].time || ''), m.relations.map((r) => [r.id, r.time, r.y]));
    check(S, 'question_is_a_single_line_without_controls', !!m.question && m.question.text === 'この二つの間に、何が起きた？' && m.question.controls === 0, m.question);
    const learned = rel['rel:learned-1961-62'];
    check(S, 'source_difference_visible', !!learned && learned.state === 'source_difference' && learned.verification === '検証状態：資料間に年次差' && learned.verificationH > 0 && /検証状態：資料間に年次差/.test(learned.surface) && /資料を見る（2件）/.test(learned.summary || '') && !/裏づけの種類/.test(learned.surface) && !learned.open, learned);
    check(S, 'relations_are_the_four_verified_ones', m.relations.map((r) => r.id).sort().join('|') === 'rel:connected-1961|rel:learned-1961-62|rel:originated-1957|rel:renamed-1963' && m.relations.every((r) => !/reading/.test(r.type)), m.relations.map((r) => [r.id, r.type]));
    check(S, 'claim_and_support_are_separate_blocks', m.relations.every((r) => r.claims === 1 && r.supports === 1 && r.readingsInside === 0 && r.badges === 0) && m.facts.every((x) => x.claims === 1 && x.supports === 1 && x.badges === 0), { relations: m.relations.map((r) => [r.id, r.claims, r.supports, r.readingsInside]), facts: m.facts });
    /* HQ LIMITED FIX 01 UNIT B: 通常（single_source / corroborated）の closed surface は本文 + 「出典あり　資料を見る（N件）」だけ */
    const light = m.relations.filter((r) => r.state !== 'source_difference').concat(m.facts.filter((x) => x.state !== 'source_difference'));
    check(S, 'light_default_surface_for_normal_items', light.length === 4 && light.every((x) => !x.open && !/検証状態：単一資料|検証状態：複数の資料が一致|裏づけの種類|検証状態/.test(x.surface) && /^出典あり\s*資料を見る（\d件）$/.test((x.summary || '').trim())),
      light.map((x) => [x.id, x.summary, x.surface.slice(0, 60)]));
    check(S, 'editorial_reading_never_inherits_a_fact_badge', m.readings.length === 2 && m.readings.every((r) => r.layer === 'reading' && r.label === '編集部の読み' && r.labelH > 0 && r.factBadges === 0 && !r.verification && !r.insideFact && r.borderStyle === 'dashed') &&
      m.readings.map((r) => r.scene).join('|') === 's3|s4', m.readings);
    /* HQ LIMITED FIX 01 UNIT A: 木場連 copy */
    const encounterText = (m.beats.find((b) => b.id === 'encounter') || {}).text || '';
    check(S, 'kiba_ren_copy_is_the_hq_fix', /徳島県人会で結成された連。/.test(encounterText) && !m.text.includes('徳島の阿波おどりの連。'), encounterText.slice(0, 120));
    check(S, 'mode_radios_remote_default', m.radios.length === 2 && m.radios[0].value === 'remote' && m.radios[0].checked && m.radios[1].value === 'onsite' && !m.radios[1].checked &&
      /いまは、高円寺にいない/.test(m.radios[0].label) && /いま、高円寺にいる/.test(m.radios[1].label) && m.radios.every((r) => r.h >= 44), m.radios);
    check(S, 'approved_image_once_same_origin_loaded', m.imgs.length === 1 && /home-thread-koenji-awaodori\.jpg$/.test(m.imgs[0].src) && m.imgs[0].loaded && m.imgs[0].sameOrigin && (m.imgs[0].alt || '').length > 0, m.imgs);
    check(S, 'reality_destinations_are_the_three', m.dest.length === 3 && m.dest.every((d, i) => d.label === DESTINATIONS[i][0] && d.href === DESTINATIONS[i][1] && /noopener/.test(d.rel || '') && d.target === '_blank') && !m.dest.some((d) => /stage04/.test(d.href)), m.dest);
    check(S, 'ended_festival_and_plus_are_not_upcoming', m.statusText.some((t) => /2026年の本祭/.test(t) && /終了/.test(t) && /最終確認：2026-09-04/.test(t)) && m.statusText.some((t) => /plus\+/.test(t) && /休止/.test(t)) && !/開催予定|これから開催/.test(m.text), m.statusText);
    check(S, 'finite_end_with_exit', m.endLine === 'このスレッドは、ここまでです。' && !!m.exit && m.exit.href === './index.html' && m.exit.text === '入口へ戻る' && m.exit.h >= 44, { end: m.endLine, exit: m.exit });
    check(S, 'real_targets_are_44px', m.targets.length >= 12 && m.targets.every((t) => t.w >= 44 && t.h >= 44), m.targets.filter((t) => t.w < 44 || t.h < 44));
    check(S, 'reduced_motion_animation_0', m.animated === 0 && m.docAnimations === 0, { animated: m.animated, docAnimations: m.docAnimations });
    check(S, 'no_engagement_words', !FORBIDDEN.some((w) => m.text.includes(w)), FORBIDDEN.filter((w) => m.text.includes(w)));
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'storage_writes_0', m.storage.writes === 0 && m.storage.ls === 0 && m.storage.ss === 0 && m.storage.cookie === '', m.storage);
    check(S, 'permission_calls_0', m.perm === 0, m.perm);
    check(S, 'no_analytics_layer_no_new_event', m.dataLayer === 'undefined' && m.gtag === 'undefined', { dataLayer: m.dataLayer, gtag: m.gtag });
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));

    /* closed 状態の証跡（drawer を開く前に撮る） */
    if (v.name === 'w390') { await elementShot(page, '#th-s1', 'THREAD_S1_EVIDENCE_CLOSED_390', v.width); await elementShot(page, '.th-relation[data-relation-id="rel:learned-1961-62"]', 'THREAD_S2_SOURCE_DIFFERENCE_CLOSED_390', v.width); }
    if (v.name === 'w1440') await elementShot(page, '.th-relation[data-relation-id="rel:learned-1961-62"]', 'THREAD_S2_CLOSED_1440', v.width);

    /* 通常 item の drawer: 検証状態・裏づけの種類・資料は drawer の中に全部残る（Evidence depth を削らない） */
    const s1Sel = '.th-relation[data-relation-id="rel:originated-1957"] .th-evidence-summary';
    await page.click(s1Sel);
    await page.waitForTimeout(150);
    const s1 = await page.evaluate(() => {
      const d = document.querySelector('.th-relation[data-relation-id="rel:originated-1957"] .th-evidence');
      return { open: d.open, body: d.querySelector('.th-evidence-body').innerText.replace(/\s+/g, ' '), cards: [...d.querySelectorAll('.th-source')].map((c) => ({ id: c.getAttribute('data-source-id'), href: c.querySelector('.th-source-link').getAttribute('href'), h: Math.round(c.getBoundingClientRect().height) })) };
    });
    check(S, 'normal_drawer_keeps_verification_and_support_mode_inside', s1.open === true && /検証状態：単一資料/.test(s1.body) && /裏づけの種類：資料の記述/.test(s1.body) && s1.cards.length === 1 && s1.cards[0].id === 'src:official-history' && /^https:\/\//.test(s1.cards[0].href) && s1.cards[0].h > 0, s1);
    await page.click(s1Sel);
    await page.waitForTimeout(100);

    /* 資料の引き出し: 公式 → 地域の文化アーカイブ の順、二枚を同時に（並列に）一列で、注記つき */
    const summarySel = '.th-relation[data-relation-id="rel:learned-1961-62"] .th-evidence-summary';
    await page.click(summarySel);
    await page.waitForTimeout(150);
    const drawer = await page.evaluate(() => {
      const d = document.querySelector('.th-relation[data-relation-id="rel:learned-1961-62"] .th-evidence');
      const cards = [...d.querySelectorAll('.th-source')].map((c) => { const b = c.getBoundingClientRect(); return { id: c.getAttribute('data-source-id'), kind: c.getAttribute('data-source-kind'), x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height), name: (c.querySelector('.th-source-name') || {}).textContent, variant: (c.querySelector('.th-source-variant-year') || {}).textContent, href: (c.querySelector('.th-source-link') || {}).getAttribute ? c.querySelector('.th-source-link').getAttribute('href') : null } });
      return { open: d.open, summary: (d.querySelector('summary') || {}).textContent, cards, order: (d.querySelector('.th-order-note') || {}).textContent, difference: (d.querySelector('.th-difference-note') || {}).textContent, docW: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth,
        body: d.querySelector('.th-evidence-body').innerText.replace(/\s+/g, ' '), verificationLines: document.querySelectorAll('.th-relation[data-relation-id="rel:learned-1961-62"] .th-verification').length };
    });
    check(S, 'deep_drawer_keeps_support_mode_and_single_surface_verification', /裏づけの種類：資料の記述/.test(drawer.body) && drawer.verificationLines === 1, { body: drawer.body.slice(0, 80), lines: drawer.verificationLines });
    check(S, 'drawer_opens_with_official_first_local_archive_second', drawer.open === true && drawer.cards.length === 2 && drawer.cards[0].id === 'src:official-history' && drawer.cards[0].kind === 'official' && drawer.cards[1].id === 'src:suginami-gaku' && drawer.cards[1].kind === 'local_archive', drawer.cards.map((c) => [c.id, c.kind]));
    check(S, 'two_source_cards_shown_in_parallel_one_column', drawer.cards.length === 2 && drawer.cards.every((c) => c.h > 0 && c.w > 0) && drawer.cards[0].x === drawer.cards[1].x && drawer.cards[1].y > drawer.cards[0].y + drawer.cards[0].h - 1 && drawer.docW <= drawer.vw, drawer.cards);
    check(S, 'source_cards_carry_variant_and_https_link', drawer.cards.every((c) => /^https:\/\//.test(c.href || '') && !!c.name) && drawer.cards[0].variant === '1961' && drawer.cards[1].variant === '1961／1962', drawer.cards.map((c) => [c.variant, c.href]));
    check(S, 'official_first_ordering_note_present', drawer.order === '※並び順は、資料の正しさの順位ではありません。', drawer.order);
    check(S, 'difference_note_leaves_the_question_open', drawer.difference === 'どちらが正しいかは、このThreadでは決めていません。資料がそう分かれていることまでが、いま分かっていることです。', drawer.difference);
    check(S, 'drawer_summary_labels_two_sources', /資料を見る（2件）/.test(drawer.summary || ''), drawer.summary);
    /* platform font は drawer を開いた状態で読む（閉じた details の中は描画されず glyph が無い） */
    const f = await fonts(ctx, page);
    console.log(`fonts ${v.name}: ${Object.entries(f).map(([k, x]) => `${k}=${x}`).join(' ')}`);
    check(S, 'actual_noto_cjk_font', Object.values(f).every((x) => /Noto (Serif|Sans) CJK JP/.test(x)), f);
    if (v.name === 'w390' || v.name === 'w1440') await elementShot(page, '.th-relation[data-relation-id="rel:learned-1961-62"]', `THREAD_S2_DRAWER_OPEN_${v.width}`, v.width);
    await page.click(summarySel);
    await page.waitForTimeout(150);
    const closed = await page.evaluate(() => document.querySelector('.th-relation[data-relation-id="rel:learned-1961-62"] .th-evidence').open);
    check(S, 'drawer_closes_again', closed === false, closed);

    /* mode は合図の文だけを変える。事実・関係・資料・検証状態・並び順・URL・保存は不変。 */
    const snapshot = () => page.evaluate(() => ({
      facts: [...document.querySelectorAll('.th-scene-title, .th-relation-time, .th-relation-nodes, .th-claim, .th-support, .th-reading, .th-destination, .th-status, .th-beat-label, .th-pair, .th-question, .th-evidence-list, .th-end')].map((e) => e.textContent.replace(/\s+/g, ' ')).join('\n'),
      order: [...document.querySelectorAll('[data-relation-id], [data-source-id], [data-beat], [data-scene]')].map((e) => e.getAttribute('data-relation-id') || e.getAttribute('data-source-id') || e.getAttribute('data-beat') || e.getAttribute('data-scene')).join('|'),
      cues: [...document.querySelectorAll('.th-cue-text')].map((e) => e.textContent),
      search: location.search, writes: window.__storageWrites, live: document.getElementById('live').textContent
    }));
    const before = await snapshot();
    await page.click('label.th-mode-option:has(input[value="onsite"])');
    await page.waitForTimeout(150);
    const after = await snapshot();
    check(S, 'mode_changes_only_cue_copy', after.facts === before.facts && after.order === before.order && after.cues.length === before.cues.length && after.cues.length === 3 &&
      after.cues.every((c, i) => c !== before.cues[i]) && after.cues.every((c) => /通り|目の前/.test(c)) && before.cues.every((c) => /思い浮かべて/.test(c)), { before: before.cues, after: after.cues });
    check(S, 'mode_is_not_persisted_anywhere', after.search === '?thread=koenji-awaodori' && after.writes === 0, { search: after.search, writes: after.writes });
    check(S, 'mode_change_is_announced', /いま、高円寺にいる/.test(after.live) && /合図/.test(after.live), after.live);
    await page.click('label.th-mode-option:has(input[value="remote"])');
    await page.waitForTimeout(150);
    const back = await snapshot();
    check(S, 'mode_switches_back_to_remote_cues', back.cues.join('|') === before.cues.join('|') && back.facts === before.facts, back.cues);

    /* 外部 source が落ちても資料の metadata は消えない（runtime は fetch しないので、
       route を落としても名前と URL がそのまま残る） */
    await page.route('https://koenji-awaodori.com/**', (r) => r.abort());
    await page.route('https://www.koenji-awaodori.com/**', (r) => r.abort());
    await page.route('https://suginamigaku.org/**', (r) => r.abort());
    await page.route('https://www.koenji-pal.jp/**', (r) => r.abort());
    await page.click(summarySel);
    await page.waitForTimeout(150);
    const meta = await page.evaluate(() => [...document.querySelectorAll('.th-relation[data-relation-id="rel:learned-1961-62"] .th-source')].map((c) => ({ name: (c.querySelector('.th-source-name') || {}).textContent, href: c.querySelector('.th-source-link').getAttribute('href'), visible: c.getBoundingClientRect().height > 0 })));
    check(S, 'external_source_failure_keeps_source_metadata', meta.length === 2 && meta.every((c) => c.name && /^https:\/\//.test(c.href) && c.visible) && external.length === 0, { meta, external: external.slice(0, 3) });
    await page.unroute('https://koenji-awaodori.com/**'); await page.unroute('https://www.koenji-awaodori.com/**'); await page.unroute('https://suginamigaku.org/**'); await page.unroute('https://www.koenji-pal.jp/**');
    await page.click(summarySel);
    await page.waitForTimeout(100);

    /* menu: open / Escape / focus return（release.js の共通 dialog） */
    await page.click('#siteMenuButton');
    await page.waitForSelector('#siteMenu[open]');
    const menu = await page.evaluate(() => ({ open: document.getElementById('siteMenu').open, focusInside: document.getElementById('siteMenu').contains(document.activeElement), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, credits: !!document.querySelector('#siteMenu a[href="./credits.html"]'), thread: !!document.querySelector('#siteMenu a[href="./index.html#hc-thread"]') }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const afterMenu = await page.evaluate(() => ({ open: document.getElementById('siteMenu').open, focus: document.activeElement && document.activeElement.id }));
    check(S, 'menu_opens_and_escape_returns_focus', menu.open && menu.focusInside && !menu.overflow && menu.credits && menu.thread && afterMenu.open === false && afterMenu.focus === 'siteMenuButton', { menu, afterMenu });
    check(S, 'no_external_request_after_interaction', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error_after_interaction', errs.length === 0, errs.slice(0, 2));

    /* 証跡 */
    if (OUT) {
      if (v.name === 'w390' || v.name === 'w1440') await elementShot(page, '#th-s2', `THREAD_S2_SIX_BEATS_${v.width}`, v.width);
      if (v.dsf === 2) {
        const docH = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: 720, height: Math.min(docH, 6000) });
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(OUT, 'THREAD_200PCT.png'), fullPage: false, scale: 'css' });
      } else await fullShot(page, `THREAD_${v.width}`, v.width);
    }
    await ctx.close();
  }

  /* ---- forced colors: 事実の枠と読みの枠が色なしでも区別できる ---- */
  for (const w of [390, 1440]) {
    const S = `forced-${w}`;
    const { ctx, page, external, errs } = await openThread(browser, base, origin, { viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500, forcedColors: 'active' });
    await settle(page);
    const fc = await page.evaluate(() => {
      const doc = document.documentElement;
      const bw = (sel) => { const el = document.querySelector(sel); return el ? parseFloat(getComputedStyle(el).borderTopWidth) : -1; };
      const bs = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).borderTopStyle : ''; };
      return { overflow: doc.scrollWidth > doc.clientWidth + 1, text: document.body.innerText.length, relationBorder: bw('.th-relation'), factBorder: bw('.th-fact'), readingBorder: bw('.th-reading'), readingStyle: bs('.th-reading'), relationStyle: bs('.th-relation'), radios: document.querySelectorAll('input[name="thread-mode"]').length, summaries: document.querySelectorAll('summary').length, exit: !!document.querySelector('.th-exit') };
    });
    check(S, 'no_horizontal_overflow', !fc.overflow);
    check(S, 'content_is_not_lost', fc.text > 400 && fc.radios === 2 && fc.summaries >= 5 && fc.exit, fc);
    check(S, 'fact_and_reading_boxes_stay_distinguishable', fc.relationBorder >= 1 && fc.factBorder >= 1 && fc.readingBorder >= 1 && fc.readingStyle === 'dashed' && fc.relationStyle === 'solid', fc);
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    if (OUT && w === 390) await shot(page, 'THREAD_FORCED_390');
    await ctx.close();
  }

  /* ---- reduced-motion: reduce / no-preference で同じ描画・animation 0 ---- */
  {
    const S = 'motion-390';
    const shots = {};
    for (const rm of ['reduce', 'no-preference']) {
      const { ctx, page } = await openThread(browser, base, origin, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: rm });
      await settle(page);
      await page.waitForTimeout(400);
      const m = await page.evaluate(MEASURE);
      shots[rm] = { png: (await page.screenshot({ fullPage: false })).toString('base64'), animated: m.animated, docAnimations: m.docAnimations };
      await ctx.close();
    }
    check(S, 'animation_0_under_both_preferences', shots.reduce.animated === 0 && shots['no-preference'].animated === 0 && shots.reduce.docAnimations === 0 && shots['no-preference'].docAnimations === 0, { reduce: shots.reduce.animated, nopref: shots['no-preference'].animated });
    check(S, 'identical_render_under_both_preferences', shots.reduce.png === shots['no-preference'].png);
  }

  /* ---- keyboard: skip → brand → menu → radios → summaries → 外部 link → 出口 → footer ---- */
  for (const w of [390, 1440]) {
    const S = `keyboard-${w}`;
    const { ctx, page } = await openThread(browser, base, origin, { viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500 });
    await settle(page);
    const order = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return { el: 'BODY' };
        const cs = getComputedStyle(el);
        return { el: (typeof el.className === 'string' && el.className.split(' ')[0]) || el.tagName, href: el.getAttribute('href'), value: el.getAttribute('value'), fv: el.matches(':focus-visible'), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      });
      order.push(info);
      if (info.el === 'BODY') break;
    }
    const names = order.map((o) => o.el + (o.value ? `[${o.value}]` : '')).join('>');
    check(S, 'tab_order_reaches_every_real_control', names.startsWith('skip-link>brand-home>menu-trigger>th-mode-input[remote]>th-evidence-summary') &&
      (names.match(/th-evidence-summary/g) || []).length === 5 && (names.match(/th-destination-link/g) || []).length === 3 && /th-destination-link>th-destination-link>th-destination-link>th-exit>footer-brand/.test(names), names);
    check(S, 'focus_visible_outline_on_every_stop', order.filter((o) => o.el !== 'BODY').every((o) => o.fv && o.outline), order.filter((o) => o.el !== 'BODY' && !(o.fv && o.outline)));
    check(S, 'no_source_link_in_tab_order_while_drawers_are_closed', !/th-source-link/.test(names), names);
    // radio group: arrow keys move the choice, cues follow
    await page.focus('input[name="thread-mode"][value="remote"]');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(120);
    const arrow = await page.evaluate(() => ({ checked: [...document.querySelectorAll('input[name="thread-mode"]')].filter((i) => i.checked).map((i) => i.value).join(), cue: document.querySelector('.th-cue-text').textContent }));
    check(S, 'arrow_keys_change_mode_and_cue', arrow.checked === 'onsite' && /通り/.test(arrow.cue), arrow);
    // summary by keyboard
    await page.focus('.th-relation[data-relation-id="rel:learned-1961-62"] .th-evidence-summary');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
    const opened = await page.evaluate(() => document.querySelector('.th-relation[data-relation-id="rel:learned-1961-62"] .th-evidence').open);
    await page.keyboard.press('Tab');
    const intoDrawer = await page.evaluate(() => document.activeElement && document.activeElement.className);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
    const reclosed = await page.evaluate(() => document.querySelector('.th-relation[data-relation-id="rel:learned-1961-62"] .th-evidence').open);
    check(S, 'details_open_and_close_by_keyboard', opened === true && /th-source-link/.test(String(intoDrawer)) && reclosed === false, { opened, intoDrawer, reclosed });
    // menu by keyboard
    await page.focus('#siteMenuButton');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#siteMenu[open]');
    await page.keyboard.press('Tab');
    const inMenu = await page.evaluate(() => document.getElementById('siteMenu').contains(document.activeElement));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const backFocus = await page.evaluate(() => ({ open: document.getElementById('siteMenu').open, focus: document.activeElement && document.activeElement.id }));
    check(S, 'menu_by_keyboard', inMenu === true && backFocus.open === false && backFocus.focus === 'siteMenuButton', { inMenu, backFocus });
    await ctx.close();
  }

  /* ---- fail-closed: 不明 / 欠落の id ---- */
  for (const url of ['thread.html?thread=nope', 'thread.html', 'thread.html?thread=']) {
    const S = `fail-closed/${url}`;
    const { ctx, page, external, errs } = await openThread(browser, base, origin, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, url);
    await settle(page);
    const lost = await page.evaluate(() => ({
      lost: document.querySelectorAll('.th-lost').length, line: (document.querySelector('.th-lost-line') || {}).textContent, scenes: document.querySelectorAll('.th-scene, .th-relation, .th-source, img.th-figure-image').length,
      exit: document.querySelector('.th-exit') ? { href: document.querySelector('.th-exit').getAttribute('href'), text: document.querySelector('.th-exit').textContent, h: Math.round(document.querySelector('.th-exit').getBoundingClientRect().height) } : null,
      title: document.title, main: document.getElementById('main').innerText, live: document.getElementById('live').textContent, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      shell: !!document.getElementById('siteMenuButton') && !!document.querySelector('.site-footer')
    }));
    check(S, 'generic_message_and_exit_only', lost.lost === 1 && lost.line === 'このスレッドはありません。' && !!lost.exit && lost.exit.href === './index.html' && lost.exit.text === '入口へ戻る' && lost.exit.h >= 44 && lost.scenes === 0, lost);
    check(S, 'no_koenji_body_content', KOENJI_TOKENS.every((t) => !lost.main.includes(t)) && lost.title === 'みんなの感情書店｜スレッド', { title: lost.title, main: lost.main.slice(0, 80) });
    check(S, 'announced_and_shell_intact', lost.live === 'このスレッドはありません。' && lost.shell && !lost.overflow, { live: lost.live, shell: lost.shell });
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    if (OUT && url === 'thread.html?thread=nope') await shot(page, 'THREAD_FAIL_CLOSED_390');
    await ctx.close();
  }

  /* ---- JavaScript 無効: generic な noscript 文と shell だけ ---- */
  {
    const S = 'js-off-390';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, javaScriptEnabled: false, reducedMotion: 'reduce' });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    await page.goto(base + THREAD, { waitUntil: 'load' });
    await page.waitForTimeout(200);
    const off = await page.evaluate(() => ({
      main: document.getElementById('main').innerText, note: !!document.querySelector('.noscript-note'), shell: !!document.getElementById('siteMenuButton') && !!document.querySelector('.site-footer') && !!document.querySelector('.skip-link'),
      scenes: document.querySelectorAll('.th-scene, .th-thread, .th-lost').length, images: document.querySelectorAll('#main img').length, title: document.title, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    }));
    check(S, 'generic_noscript_only', off.note && off.main.includes('このスレッドを読むには JavaScript を有効にしてください。') && off.scenes === 0 && off.images === 0, off);
    check(S, 'no_koenji_body_content', KOENJI_TOKENS.every((t) => !off.main.includes(t)) && off.title === 'みんなの感情書店｜スレッド', { title: off.title });
    check(S, 'shell_intact_no_overflow', off.shell && !off.overflow, off);
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    if (OUT) await shot(page, 'THREAD_JS_OFF_390');
    await ctx.close();
  }

  /* ---- 画像が落ちても意味が残る ---- */
  {
    const S = 'image-failure-390';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await ctx.addInitScript(GUARD);
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.route('**/home-thread-koenji-awaodori.jpg', (r) => r.abort());
    await page.goto(base + THREAD, { waitUntil: 'load' });
    await page.waitForSelector('.th-thread');
    await page.waitForTimeout(400);
    const m = await page.evaluate(MEASURE);
    check(S, 'thread_still_renders_all_scenes', m.sceneCount === 6 && m.relations.length === 4 && m.dest.length === 3 && m.endLine === 'このスレッドは、ここまでです。', { scenes: m.sceneCount, relations: m.relations.length });
    check(S, 'image_failed_but_alt_and_meaning_remain', m.imgs.length === 1 && !m.imgs[0].loaded && (m.imgs[0].alt || '').length > 0 && /40を超える連/.test(m.text) && /1957/.test(m.text) && /教わる/.test(m.text), m.imgs);
    check(S, 'no_horizontal_overflow', m.docW <= m.vw, { docW: m.docW, vw: m.vw });
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    if (OUT) await shot(page, 'THREAD_IMAGE_FAILURE_390');
    await ctx.close();
  }

  /* ---- HOME の接続: 実 anchor 1 / hold 7 / HOME → Thread → 戻る ---- */
  for (const v of [{ name: 'm390', width: 390, height: 844, mobile: true }, { name: 'd1440', width: 1440, height: 900, mobile: false }, { name: 'c853', width: 853, height: 1844, mobile: false }]) {
    const S = `home-${v.name}`;
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(200);
    const home = await page.evaluate(() => {
      const a = document.querySelector('.hc-thread-read');
      const b = a.getBoundingClientRect();
      return {
        tag: a.tagName, href: a.getAttribute('href'), text: a.textContent.replace(/\s+/g, ''), w: Math.round(b.width), h: Math.round(b.height), hold: a.hasAttribute('data-route-hold'), tabIndex: a.tabIndex,
        holds: [...document.querySelectorAll('[data-route-hold]')].map((el) => el.getAttribute('data-route-hold')),
        heroHold: !!document.querySelector('.hc-hero-cta[data-route-hold="thread-index"]'),
        sections: document.querySelectorAll('main > section, main > .hc-sheet > section').length
      };
    });
    check(S, 'thread_read_is_a_real_anchor_to_the_exact_route', home.tag === 'A' && home.href === './thread.html?thread=koenji-awaodori' && home.text === 'スレッドを読む→' && !home.hold && home.tabIndex === 0, home);
    check(S, 'thread_read_hit_area_44', home.h === 44 && home.w >= 44, { w: home.w, h: home.h });
    check(S, 'seven_holds_remain_and_hero_stays_held', home.holds.length === 7 && !home.holds.includes('thread-koenji-awaodori') && home.heroHold && home.holds.join('|') === 'thread-index|all-cities|work-book|work-film|work-music|work-video|spots', home.holds);
    await page.focus('.hc-thread-read');
    const focused = await page.evaluate(() => { const el = document.activeElement; const cs = getComputedStyle(el); return { el: el.className, fv: el.matches(':focus-visible'), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }; });
    check(S, 'thread_read_focus_visible', /hc-thread-read/.test(focused.el) && focused.fv && focused.outline, focused);
    // HOME → Thread → back
    await page.evaluate(() => document.querySelector('.hc-thread-read').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(150);
    const scrollBefore = await page.evaluate(() => Math.round(scrollY));
    await page.click('.hc-thread-read');
    await page.waitForURL((u) => u.pathname.endsWith('/thread.html') && u.search === '?thread=koenji-awaodori', { timeout: 5000 });
    await page.waitForSelector('.th-thread');
    const arrived = await page.evaluate(() => ({ title: document.title, scenes: document.querySelectorAll('.th-scene').length, top: Math.round(scrollY) }));
    check(S, 'home_link_lands_on_the_thread', arrived.title === TITLE && arrived.scenes === 6 && arrived.top === 0, arrived);
    await page.goBack({ waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.hc-city').length === 4);
    await page.waitForTimeout(400);
    const restored = await page.evaluate(() => ({
      url: location.pathname.split('/').pop() + location.search, sections: document.querySelectorAll('main > section, main > .hc-sheet > section').length,
      anchor: !!document.querySelector('a.hc-thread-read[href="./thread.html?thread=koenji-awaodori"]'), scrollY: Math.round(scrollY),
      threadInView: (() => { const b = document.querySelector('.hc-thread-section').getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; })()
    }));
    check(S, 'browser_back_restores_home_context', restored.url === 'index.html' && restored.sections === 5 && restored.anchor, restored);
    check(S, 'browser_back_restores_scroll_position', Math.abs(restored.scrollY - scrollBefore) <= 8 && restored.threadInView, { before: scrollBefore, after: restored.scrollY, inView: restored.threadInView });
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  await browser.close();
  server.close();
  const total = pass + fails.length;
  const seen = `${pass}/${total}` + (unobserved.length ? `, ${unobserved.length} NOT OBSERVABLE` : '');
  if (fails.length) {
    console.error(`THREAD_BROWSER_QA_FAIL (${seen})`);
    fails.forEach((f) => console.error('- FAIL ' + f));
    unobserved.forEach((u) => console.error('- NOT OBSERVABLE ' + u));
    process.exit(1);
  }
  console.log(`THREAD_BROWSER_QA_GO (${seen})`);
  unobserved.forEach((u) => console.log('- NOT OBSERVABLE ' + u));
})().catch((e) => { console.error(e); process.exit(1); });
