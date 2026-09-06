#!/usr/bin/env node
/* THREAD BROWSER QA — Cultural Thread（thread.html?thread=koenji-dance-history）の実ブラウザ検査。
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

const THREAD = 'thread.html?thread=koenji-dance-history';
const TITLE = '高円寺｜踊りが街に根づくまで｜みんなの感情書店';
const KOENJI_TOKENS = ['踊りが街に根づくまで', '阿波おどり', '徳島', '1957', '木場連', '鴨川', 'パル商店街'];
const DESTINATIONS = [
  ['1957の起点を歩く（高円寺パル商店街）', 'https://www.koenji-pal.jp/about'],
  ['現在の連を知る／参加・体験を相談する', 'https://koenji-awaodori.com/category1/join.html'],
  ['現在の公式情報を見る', 'https://koenji-awaodori.com/'],
  /* FOUNDER PREVIEW FIX UNIT E: 最後の 4 つ目は主催団体の公式映像（click でだけ開く） */
  ['最後に、現在の公式映像を見る', 'https://www.youtube.com/watch?v=dt33RGSRuo0']
];
const YT_URL = 'https://www.youtube.com/watch?v=dt33RGSRuo0';
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
  const dest = [...document.querySelectorAll('.th-destination')].map((li) => { const a = li.querySelector('.th-destination-link'); const v = li.querySelector('.v3-video'); return { id: li.getAttribute('data-destination-id'), label: (li.querySelector('.th-destination-label') || {}).textContent, href: a ? a.getAttribute('href') : null, rel: a ? a.getAttribute('rel') : null, target: a ? a.getAttribute('target') : null, videoId: v ? v.getAttribute('data-video-id') : null, videoState: v ? v.getAttribute('data-video-state') : null, button: !!li.querySelector('button.v3-video-load'), watchNote: (li.querySelector('.th-video-duration') || {}).textContent }; });
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
    readingLabels: document.querySelectorAll('.th-reading-label').length,
    text: document.body.innerText,
    storage: { writes: window.__storageWrites, ls: readStore(() => localStorage.length), ss: readStore(() => sessionStorage.length), cookie: document.cookie },
    perm: window.__permCalls, dataLayer: typeof window.dataLayer, gtag: typeof window.gtag,
    search: location.search
  };
};

const FONT_PROBES = [['h1', '.th-title'], ['scene', '.th-scene-title'], ['claim', '.th-claim-text'], ['question', '.th-question'],
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

    check(S, 'thread_renders_koenji', m.threadId === 'koenji-dance-history' && m.lost === 0 && m.sceneCount === 6, { id: m.threadId, scenes: m.sceneCount });
    /* NAME AVOIDANCE（Founder no-inquiry decision）: 描画テキスト / title / alt に保護名・類似名は 0。 */
    check(S, 'no_protected_event_name_in_rendered_thread', !/東京高円寺阿波おどり|高円寺阿波おどり|高円寺阿波踊り/.test(m.text + '\n' + m.title + '\n' + m.header + '\n' + m.imgs.map((i) => i.alt || '').join('\n')), { title: m.title, alts: m.imgs.map((i) => i.alt) });
    check(S, 'title_is_the_thread_title', m.title === TITLE, m.title);
    check(S, 'single_h1_is_the_thread_h1', m.h1 === 1 && m.h1Text === '踊りが街に根づくまで', { h1: m.h1, text: m.h1Text });
    check(S, 'header_copy_present', ['高円寺', '主題：高円寺で受け継がれてきた踊り', '編集：みんなの感情書店 編集部', 'このThreadでは「教わる／伝わる」に注目しました。', '最終確認：2026-09-04',
      '約15分。いつ止めてもかまいません。', 'アカウント・位置情報・カメラは使いません。', '歩きながら見ないでください。立ち止まれる場所で。'].every((t) => m.header.includes(t)), m.header);
    check(S, 'no_horizontal_overflow', m.docW <= m.vw, { docW: m.docW, vw: m.vw });
    check(S, 'no_clipped_text', m.clipped.length === 0, m.clipped.slice(0, 6));
    check(S, 'one_column_everywhere', !!m.headRect && m.scenes.every((s) => s.rect.x === m.headRect.x && Math.abs(s.rect.w - m.headRect.w) <= 1) &&
      m.scenes.every((s, i) => i === 0 || s.rect.y >= m.scenes[i - 1].rect.y + m.scenes[i - 1].rect.h - 1) && m.headRect.w <= 640,
      { head: m.headRect, scenes: m.scenes.map((s) => [s.id, s.rect]) });
    check(S, 'scenes_in_order_s0_to_s5', m.scenes.map((s) => s.id).join('|') === 's0|s1|s2|s3|s4|s5' &&
      m.scenes.map((s) => s.title).join('|') === 'いま|1957 ／ はじまる|1957のあと|1963 ／ 名を変える|いま、もう一度|現実へ', m.scenes.map((s) => [s.id, s.title]));
    /* FOUNDER PREVIEW FIX C3: AFTER cue beat は無い。五拍。 */
    check(S, 's2_five_beats_in_order', m.beats.map((b) => b.id).join('|') === 'before|encounter|question|evidence|reveal' && m.beats.every((b, i) => i === 0 || b.y > m.beats[i - 1].y), m.beats.map((b) => [b.id, b.y]));
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
    check(S, 'editorial_reading_never_inherits_a_fact_badge', m.readings.length === 2 && m.readings.every((r) => r.layer === 'reading' && r.label === undefined && r.labelH === 0 && r.factBadges === 0 && !r.verification && !r.insideFact && r.borderStyle === 'dashed') &&
      m.readings.map((r) => r.scene).join('|') === 's3|s4', m.readings);
    /* HQ LIMITED FIX 01 UNIT A: 木場連 copy */
    const encounterText = (m.beats.find((b) => b.id === 'encounter') || {}).text || '';
    check(S, 'kiba_ren_copy_is_the_hq_fix', /徳島県人会で結成された連。/.test(encounterText) && !m.text.includes('徳島の阿波おどりの連。'), encounterText.slice(0, 120));
    /* FOUNDER PREVIEW FIX C1 / C2 / C4: location mode fieldset も cue block も出さない。 */
    check(S, 'no_mode_fieldset_no_cue', m.radios.length === 0 && m.cues.length === 0 && !/合図|高円寺にいるふり|いまは、高円寺にいない|いま、高円寺にいる|どこで読んでいますか|20秒/.test(m.text), { radios: m.radios.length, cues: m.cues.length });
    check(S, 'approved_image_once_same_origin_loaded', m.imgs.length === 1 && /home-thread-koenji-awaodori\.jpg$/.test(m.imgs[0].src) && m.imgs[0].loaded && m.imgs[0].sameOrigin && (m.imgs[0].alt || '').length > 0, m.imgs);
    check(S, 'reality_destinations_are_the_four', m.dest.length === 4 && m.dest.slice(0, 3).every((d, i) => d.label === DESTINATIONS[i][0] && d.href === DESTINATIONS[i][1] && /noopener/.test(d.rel || '') && d.target === '_blank') && m.dest[3].label === DESTINATIONS[3][0] && m.dest[3].href === null && m.dest[3].videoId === 'dt33RGSRuo0' && m.dest[3].button && m.dest[3].videoState === 'idle' && m.dest[3].watchNote === '約15分で観終わります。' && !m.dest.some((d) => /stage04/.test(d.href)), m.dest);
    check(S, 'ended_festival_and_plus_are_not_upcoming', m.statusText.some((t) => /2026年の本祭/.test(t) && /終了/.test(t) && /最終確認：2026-09-04/.test(t)) && m.statusText.some((t) => /plus\+/.test(t) && /休止/.test(t)) && !/開催予定|これから開催/.test(m.text), m.statusText);
    check(S, 'finite_end_with_exit', m.endLine === 'このスレッドは、ここまでです。' && !!m.exit && m.exit.href === './index.html' && m.exit.text === '入口へ戻る' && m.exit.h >= 44, { end: m.endLine, exit: m.exit });
    /* Founder decision v2: 公開 UI に「編集部の読み」の label は 0（読みの本文は破線の枠のまま残る） */
    check(S, 'no_visible_editorial_label', m.readingLabels === 0 && !m.text.includes('編集部の読み') && m.readings.length === 2, { labels: m.readingLabels, readings: m.readings.length });
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

    /* FOUNDER PREVIEW FIX C: mode は無いので、URL / 保存 / live region が何も変わらないことだけを見る。 */
    const noMode = await page.evaluate(() => ({ search: location.search, writes: window.__storageWrites, live: document.getElementById('live').textContent, fieldsets: document.querySelectorAll('fieldset, input').length }));
    check(S, 'no_mode_controls_no_state', noMode.search === '?thread=koenji-dance-history' && noMode.writes === 0 && noMode.live === '' && noMode.fieldsets === 0, noMode);

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

    /* Founder decision v2（2026-09-06）: 公式映像は最後の行き先で、click-to-load の inline player。押すまでは
       provider（YouTube / ytimg / googlevideo）への通信 0・iframe 0・サムネイル / preconnect 0。押すと同じ枠に
       youtube-nocookie の iframe が入り、自動再生しない。外部 anchor は無い。新しい copy は「約15分で観終わります。」だけ。 */
    const videoBefore = await page.evaluate(() => {
      const li = document.querySelector('[data-destination-id="dest:official-video"]');
      const items = [...document.querySelectorAll('.th-destination')];
      const host = li && li.querySelector('.v3-video'); const btn = li && li.querySelector('button.v3-video-load');
      return {
        isLast: !!li && items[items.length - 1] === li, count: items.length,
        label: li ? (li.querySelector('.th-destination-label') || {}).textContent : '', anchors: li ? li.querySelectorAll('a').length : -1,
        videoId: host ? host.getAttribute('data-video-id') : null, state: host ? host.getAttribute('data-video-state') : null, title: host ? host.getAttribute('data-video-title') : null,
        why: li ? (li.querySelector('.th-destination-why') || {}).textContent : '', note: li ? (li.querySelector('.th-destination-note') || {}).textContent : '', watchNote: li ? (li.querySelector('.th-video-duration') || {}).textContent : '',
        embeds: document.querySelectorAll('iframe, video, audio, embed, object, [autoplay], link[rel="preconnect"], link[rel="preload"], link[rel="prefetch"], link[rel="dns-prefetch"]').length,
        ytAssets: [...document.querySelectorAll('img, source, script, link')].filter((e) => /youtube|ytimg|googlevideo/.test(e.getAttribute('src') || e.getAttribute('href') || '')).length,
        h: btn ? Math.round(btn.getBoundingClientRect().height) : 0, w: btn ? Math.round(btn.getBoundingClientRect().width) : 0,
        text: li ? li.innerText : ''
      };
    });
    check(S, 'official_video_is_the_final_destination_click_to_load', videoBefore.isLast && videoBefore.count === 4 && videoBefore.label === DESTINATIONS[3][0] && videoBefore.anchors === 0
      && videoBefore.videoId === 'dt33RGSRuo0' && videoBefore.state === 'idle' && videoBefore.title === '主催団体の公式映像'
      && videoBefore.why === 'このThreadとの関係：ここまで辿った踊りが、現在の街の中でどう見えるかを、主催団体の公式映像で確かめます。' && videoBefore.note === '2025年の催しを伝える、主催団体の公式映像です。'
      && videoBefore.watchNote === '約15分で観終わります。' && videoBefore.embeds === 0 && videoBefore.ytAssets === 0 && videoBefore.h >= 44 && videoBefore.w >= 44
      && external.every((u) => !/youtube|ytimg|googlevideo/.test(u)), videoBefore);
    check(S, 'video_block_carries_only_the_approved_copy', [DESTINATIONS[3][0], 'このThreadとの関係：ここまで辿った踊りが、現在の街の中でどう見えるかを、主催団体の公式映像で確かめます。', '2025年の催しを伝える、主催団体の公式映像です。', '約15分で観終わります。'].reduce((t, c) => t.replace(c, ''), videoBefore.text).replace(/[▶\s]/g, '') === '', videoBefore.text);
    {
      const threadPageRequests = [];
      page.on('request', (r) => { if (!r.url().startsWith(origin)) threadPageRequests.push(r.url()); });
      await ctx.route((url) => !url.href.startsWith(origin), (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
      let popupSeen = false; ctx.once('page', () => { popupSeen = true; });
      await page.click('[data-destination-id="dest:official-video"] button.v3-video-load');
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => { const f = document.querySelector('[data-destination-id="dest:official-video"] iframe'); const host = document.querySelector('[data-destination-id="dest:official-video"] .v3-video'); return { url: location.pathname + location.search, iframes: document.querySelectorAll('iframe').length, src: f ? f.getAttribute('src') : null, title: f ? f.getAttribute('title') : null, allow: f ? f.getAttribute('allow') : null, rp: f ? f.getAttribute('referrerpolicy') : null, state: host ? host.getAttribute('data-video-state') : null, buttons: document.querySelectorAll('[data-destination-id="dest:official-video"] button').length }; });
      check(S, 'click_loads_inline_nocookie_player_without_autoplay', !popupSeen && after.url === '/thread.html?thread=koenji-dance-history' && after.iframes === 1 && after.src === 'https://www.youtube-nocookie.com/embed/dt33RGSRuo0?playsinline=1&rel=0' && after.title === '主催団体の公式映像' && after.state === 'loaded' && after.buttons === 0 && !/autoplay=1/.test(after.src) && (after.allow || '').indexOf('autoplay') < 0 && after.rp === 'strict-origin-when-cross-origin', after);
      check(S, 'provider_requests_only_after_click_and_only_nocookie', threadPageRequests.length >= 1 && threadPageRequests.every((u) => u.startsWith('https://www.youtube-nocookie.com/embed/dt33RGSRuo0')), threadPageRequests.slice(0, 3));
      await ctx.unroute((url) => !url.href.startsWith(origin));
      external.length = 0; /* the stubbed provider request happened only after the explicit click */
    }

    /* 証跡 */
    if (OUT) {
      if (v.name === 'w390' || v.name === 'w1440') await elementShot(page, '#th-s2', `THREAD_S2_FIVE_BEATS_${v.width}`, v.width);
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
    check(S, 'content_is_not_lost', fc.text > 400 && fc.radios === 0 && fc.summaries >= 5 && fc.exit, fc);
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

  /* ---- keyboard: skip → brand → menu → summaries → 外部 link → 出口 → footer（radio は無い） ---- */
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
    check(S, 'tab_order_reaches_every_real_control', names.startsWith('skip-link>brand-home>menu-trigger>th-evidence-summary') && !/th-mode-input/.test(names) &&
      (names.match(/th-evidence-summary/g) || []).length === 5 && (names.match(/th-destination-link/g) || []).length === 3 && /th-destination-link>th-destination-link>th-destination-link>v3-video-load>th-exit>footer-brand/.test(names), names);
    check(S, 'focus_visible_outline_on_every_stop', order.filter((o) => o.el !== 'BODY').every((o) => o.fv && o.outline), order.filter((o) => o.el !== 'BODY' && !(o.fv && o.outline)));
    check(S, 'no_source_link_in_tab_order_while_drawers_are_closed', !/th-source-link/.test(names), names);
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
    check(S, 'thread_still_renders_all_scenes', m.sceneCount === 6 && m.relations.length === 4 && m.dest.length === 4 && m.endLine === 'このスレッドは、ここまでです。', { scenes: m.sceneCount, relations: m.relations.length, dest: m.dest.length });
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
        heroCta: (() => { const a = document.querySelector('.hc-hero-cta'); return a ? a.tagName + ':' + a.getAttribute('href') + ':' + a.hasAttribute('data-route-hold') : null; })(),
        works: [...document.querySelectorAll('a.hc-work')].map((w) => w.getAttribute('data-work') + ':' + w.getAttribute('href')).join('|'),
        sections: document.querySelectorAll('main > section, main > .hc-sheet > section').length
      };
    });
    check(S, 'thread_read_is_a_real_anchor_to_the_exact_route', home.tag === 'A' && home.href === './thread.html?thread=koenji-dance-history' && home.text === 'スレッドを読む→' && !home.hold && home.tabIndex === 0, home);
    check(S, 'thread_read_hit_area_44', home.h === 44 && home.w >= 44, { w: home.w, h: home.h });
    /* FOUNDER PREVIEW FIX A1 / A5: hold は 0。hero の スレッドを見る も同じ Thread への実 anchor。 */
    check(S, 'no_holds_remain_and_hero_is_a_real_anchor', home.holds.length === 0 && home.heroCta === 'A:./thread.html?thread=koenji-dance-history:false', { holds: home.holds, heroCta: home.heroCta });
    check(S, 'four_work_cards_are_real_anchors', home.works === 'book:./works.html#book|film:./works.html#film|music:./works.html#music|video:./works.html#video', home.works);
    await page.focus('.hc-thread-read');
    const focused = await page.evaluate(() => { const el = document.activeElement; const cs = getComputedStyle(el); return { el: el.className, fv: el.matches(':focus-visible'), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }; });
    check(S, 'thread_read_focus_visible', /hc-thread-read/.test(focused.el) && focused.fv && focused.outline, focused);
    // HOME → Thread → back
    await page.evaluate(() => document.querySelector('.hc-thread-read').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(150);
    const scrollBefore = await page.evaluate(() => Math.round(scrollY));
    await page.click('.hc-thread-read');
    await page.waitForURL((u) => u.pathname.endsWith('/thread.html') && u.search === '?thread=koenji-dance-history', { timeout: 5000 });
    await page.waitForSelector('.th-thread');
    const arrived = await page.evaluate(() => ({ title: document.title, scenes: document.querySelectorAll('.th-scene').length, top: Math.round(scrollY) }));
    check(S, 'home_link_lands_on_the_thread', arrived.title === TITLE && arrived.scenes === 6 && arrived.top === 0, arrived);
    await page.goBack({ waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.hc-city').length === 4);
    await page.waitForTimeout(400);
    const restored = await page.evaluate(() => ({
      url: location.pathname.split('/').pop() + location.search, sections: document.querySelectorAll('main > section, main > .hc-sheet > section').length,
      anchor: !!document.querySelector('a.hc-thread-read[href="./thread.html?thread=koenji-dance-history"]'), scrollY: Math.round(scrollY),
      threadInView: (() => { const b = document.querySelector('.hc-thread-section').getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; })()
    }));
    check(S, 'browser_back_restores_home_context', restored.url === 'index.html' && restored.sections === 5 && restored.anchor, restored);
    check(S, 'browser_back_restores_scroll_position', Math.abs(restored.scrollY - scrollBefore) <= 8 && restored.threadInView, { before: scrollBefore, after: restored.scrollY, inView: restored.threadInView });
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  /* ---- WORKS CROSS-MEDIA PROOF: Morisaki Thread（Book-first / Film-first）を独立に検査 ----
     Koenji の assertion は上のまま。同じ renderer で: mode fieldset なし / 孤立した
     temporal separator なし / 同じ relation 集合へ到達 / 入口順だけ違う / Evidence drawer
     が動く / W4 の再読が見える / Reality Return が逐語 / 有限の終わり（works.html へ）/
     first-paint 外部 request 0 / 保存・位置情報・カメラ 0。 */
  const MORISAKI = {
    'morisaki-book': { title: '本から｜森崎書店の日々｜みんなの感情書店', eyebrow: '本から', w1: '原作と映画', w1close: 'ここまでは、原作と映画の関係です。', first: '本' },
    'morisaki-film': { title: '映画から｜森崎書店の日々｜みんなの感情書店', eyebrow: '映画から', w1: 'この映画には、原作がある', w1close: '同じひとつの関係を、逆から読んでいます。矢印は 本 → 映画 のままです。', first: '映画' }
  };
  const M_DEST = [['古書店街を歩く', 'https://jimbou.info/map/'], ['神保町シアターの現在を見る', 'https://www.shogakukan.co.jp/jinbocho-theater/features/'], ['矢口書店を見る', 'https://yaguchishoten.jp/']];
  const M_NOTES = '撮影のために街中に組まれたセットです。いま神保町にある店ではありません。|範囲：神保町の街なか（一点ではありません）';
  const M_MEASURE = () => {
    const txt = (sel, scope) => [...(scope || document).querySelectorAll(sel)].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    const one = (sel) => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
    const dest = (id) => document.querySelector(`[data-destination-id="${id}"]`);
    return {
      seps: document.querySelectorAll('.th-relation-sep').length, years: document.querySelectorAll('.th-relation-year').length,
      times: txt('.th-relation-time'), verbs: txt('.th-relation-verb'), spatial: txt('.th-relation-spatial'),
      scenes: txt('.th-scene-title'), w1close: one('#th-w1 .th-scene-close'), w0first: one('#th-w0 .th-pair-name'), w0pairs: txt('#th-w0 .th-pair-name'),
      w2: { facts: document.querySelectorAll('#th-w2 .th-fact').length, factIdentity: document.querySelectorAll('#th-w2 [data-fact-id="fact:morisaki-film-identity"]').length,
        order: [...document.querySelectorAll('#th-w2 > *')].map((e) => e.tagName.toLowerCase() + '.' + e.className.split(' ')[0] + (e.getAttribute('data-beat-kind') ? '[' + e.getAttribute('data-beat-kind') + ']' : '')).join('>'),
        lead: one('#th-w2 .th-scene-lead'), pairs: txt('#th-w2 .th-pair-name'), pairTexts: txt('#th-w2 .th-pair-text'), close: one('#th-w2 .th-scene-close'),
        text: (document.querySelector('#th-w2') || { innerText: '' }).innerText, html: (document.querySelector('#th-w2') || { innerHTML: '' }).innerHTML },
      w3notes: txt('#th-w3 .th-evidence-item').join('|'), w3rel: [...document.querySelectorAll('#th-w3 .th-relation')].map((r) => r.getAttribute('data-relation-id')).join('|'),
      w4: { lead: one('#th-w4 .th-scene-lead'), pairs: txt('#th-w4 .th-pair-name').join('|'), close: one('#th-w4 .th-scene-close'), readingLabel: one('#th-w4 .th-reading-label'), reading: one('#th-w4 .th-reading-text'), readingBorder: document.querySelector('#th-w4 .th-reading') ? getComputedStyle(document.querySelector('#th-w4 .th-reading')).borderTopStyle : null },
      readings: document.querySelectorAll('.th-reading').length, readingLabels: document.querySelectorAll('.th-reading-label').length, bodyText: document.body.innerText,
      w5: { lead: one('#th-w5 .th-scene-lead'), notes: txt('#th-w5 .th-evidence-item').join('|'), questions: txt('#th-w5 .th-question'), disclosure: one('#th-w5 .th-scene-close'), realityLead: one('#th-w5 .th-reality-lead'), status: document.querySelectorAll('#th-w5 .th-status').length,
        yaguchiWhy: dest('dest:yaguchi-shoten') ? dest('dest:yaguchi-shoten').querySelectorAll('.th-destination-why').length : -1, yaguchiNote: dest('dest:yaguchi-shoten') ? one('[data-destination-id="dest:yaguchi-shoten"] .th-destination-note') : null,
        dest1Why: one('[data-destination-id="dest:jimbou-map"] .th-destination-why'), dest2Why: one('[data-destination-id="dest:jinbocho-theater"] .th-destination-why'),
        disclosureBeforeDestinations: (() => { const l = document.querySelector('#th-w5 .th-scene-close'); const d = document.querySelector('#th-w5 .th-destinations'); return !!l && !!d && !!(l.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING); })() },
      modes: document.querySelectorAll('.th-mode, input[name="thread-mode"]').length, cues: document.querySelectorAll('.th-cue').length, figures: document.querySelectorAll('#main img').length,
      relIds: [...document.querySelectorAll('.th-relation')].map((r) => r.getAttribute('data-relation-id')).sort().join('|'),
      relTypes: [...document.querySelectorAll('.th-relation')].map((r) => r.getAttribute('data-relation-type')).sort().join('|'),
      claims: txt('.th-relation .th-claim-text'), summaries: txt('.th-evidence-summary'), text: document.body.innerText
    };
  };
  const M_PROBES = [['h1', '.th-title'], ['scene', '.th-scene-title'], ['claim', '.th-claim-text'], ['verb', '.th-relation-verb'], ['note', '.th-evidence-item'], ['question', '.th-question'], ['reading', '.th-reading-text'], ['destination', '.th-destination-label'], ['exit', '.th-exit']];
  async function fontsFor(ctx, page, probes) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const out = {};
    for (const [name, sel] of probes) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      if (!nodeId) { out[name] = 'NODE_NOT_FOUND'; continue; }
      const { fonts: pf } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      out[name] = pf.map((f) => f.familyName).join('|') || 'NO_GLYPHS';
    }
    await cdp.detach();
    return out;
  }
  const relSets = {};
  const w2Html = {};
  for (const id of Object.keys(MORISAKI)) for (const v of WIDTHS) {
    const S = `${v.name}/${id}`;
    const want = MORISAKI[id];
    const { ctx, page, external, errs } = await openThread(browser, base, origin, { viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile, deviceScaleFactor: v.dsf || 1 }, 'thread.html?thread=' + id);
    await settle(page);
    const m = await page.evaluate(MEASURE);
    const mm = await page.evaluate(M_MEASURE);
    check(S, 'thread_renders_morisaki', m.threadId === id && m.lost === 0 && m.sceneCount === 6 && m.title === want.title && m.h1 === 1 && m.h1Text === '二つの『森崎書店の日々』', { id: m.threadId, scenes: m.sceneCount, title: m.title, h1: m.h1Text });
    check(S, 'header_copy_present', [want.eyebrow, '主題：森崎書店の日々', '編集：みんなの感情書店 編集部', '本と映画、その先の神保町を辿ります。', '最終確認：2026-09-05',
      '本と映画を、ひとつの関係として辿ります。', '資料は、必要なところだけ開けます。', '位置情報・カメラは使いません。'].every((t) => m.header.includes(t)), m.header);
    check(S, 'no_mode_fieldset_no_cue_no_image', mm.modes === 0 && mm.cues === 0 && mm.figures === 0 && m.radios.length === 0, { modes: mm.modes, cues: mm.cues, figures: mm.figures });
    check(S, 'no_orphan_temporal_separator', mm.seps === 0 && mm.years === 0 && mm.times.join('|') === '映画になる|舞台になる|描かれる|撮影される' && mm.times.every((t, i) => t === mm.verbs[i]), { seps: mm.seps, years: mm.years, times: mm.times });
    check(S, 'scenes_w0_to_w5_in_order', mm.scenes.join('|') === `二つの『森崎書店の日々』|${want.w1}|残ったもの、変わったもの|街が入る|もう一度、二つを見る|現実へ` && m.scenes.map((s) => s.id).join('|') === 'w0|w1|w2|w3|w4|w5', mm.scenes);
    check(S, 'entry_order_and_w1_framing', mm.w0first === want.first && mm.w0pairs.join('|') === (want.first === '本' ? '本|映画' : '映画|本') && mm.w1close === want.w1close, { first: mm.w0first, pairs: mm.w0pairs, w1close: mm.w1close });
    check(S, 'relations_are_the_four_verified_ones_in_scenes', mm.relIds === 'rel:morisaki-adapted|rel:morisaki-depicts|rel:morisaki-filmed-in|rel:morisaki-set-in' && mm.relTypes === 'adapted_as|depicts|filmed_in|set_in' && mm.w3rel === 'rel:morisaki-set-in|rel:morisaki-depicts|rel:morisaki-filmed-in', { ids: mm.relIds, types: mm.relTypes, w3: mm.w3rel });
    check(S, 'claims_and_spatial_are_exact', mm.claims.join('|') === '映画『森崎書店の日々』は、八木沢里志の小説をもとにつくられた作品です。|『森崎書店の日々』は、神保町の古書店を物語の中心の場所にしています。|映画は、神田神保町の古書店街をめぐる作品として紹介されています。|映画は、神保町の街中に「森崎書店」のロケセットを組んで撮影されました。' &&
      mm.spatial.join('|') === '範囲：神保町の街（一点ではありません）|範囲：神保町の街（一点ではありません）|範囲：神保町の街なか（一点ではありません）', { claims: mm.claims, spatial: mm.spatial });
    /* HQ LIMITED FIX: Morisaki は inline fact card を描かない（fact は graph にだけ残る）。relation card の claim / support 分離はそのまま。 */
    check(S, 'claim_and_support_are_separate_blocks', m.relations.every((r) => r.claims === 1 && r.supports === 1 && r.readingsInside === 0 && r.badges === 0) && m.facts.length === 0, { relations: m.relations.map((r) => [r.id, r.claims, r.supports]), facts: m.facts.length });
    check(S, 'light_surface_with_evidence_flag', m.relations.every((r) => r.state === 'single_source' && !r.open && /^出典あり\s*資料を見る（1件）$/.test((r.summary || '').trim()) && !/検証状態/.test(r.surface)), m.relations.map((r) => [r.id, r.summary]));
    /* HQ LIMITED FIX: W2 は Lead → Pair → Close だけ。film identity fact は graph に残るが W2 に inline 表示しない。 */
    check(S, 'w2_has_no_inline_fact_card', mm.w2.facts === 0 && mm.w2.factIdentity === 0, { facts: mm.w2.facts, identity: mm.w2.factIdentity });
    check(S, 'w2_order_is_lead_pair_close', mm.w2.order === 'h2.th-scene-title>p.th-scene-lead>section.th-beat[pair]>p.th-scene-close', mm.w2.order);
    check(S, 'w2_109min_exactly_once', (mm.w2.text.match(/109分/g) || []).length === 1, mm.w2.text.replace(/\s+/g, ' ').slice(0, 200));
    check(S, 'w2_frozen_copy_exact', mm.w2.lead === '媒体が変わっても残るものと、映画になることで変わるものがあります。' && mm.w2.pairs.join('|') === '残ったもの|変わったもの' &&
      mm.w2.pairTexts.join('|') === '貴子、叔父のサトル、神保町の古書店をめぐる物語。|文字で読む作品から、109分の映画へ。監督・脚本・俳優・撮影など、多くの手で形になる作品へ。' && mm.w2.close === 'けれど、変わったのは媒体だけではありません。', { lead: mm.w2.lead, pairs: mm.w2.pairs, texts: mm.w2.pairTexts, close: mm.w2.close });
    check(S, 'w2_no_current_edition_page_count', !/ページ|頁|新装版/.test(mm.w2.text), mm.w2.text.slice(0, 120));
    w2Html[id] = w2Html[id] || mm.w2.html;
    check(S, 'w2_identical_at_every_width', w2Html[id] === mm.w2.html);
    check(S, 'w3_mandatory_notes_visible', mm.w3notes === M_NOTES, mm.w3notes);
    check(S, 'w4_reread_visible_with_editorial_reading', mm.w4.lead === '本 →（原作になる）→ 映画 →（神保町で撮る）→ 神保町' && mm.w4.pairs === '本|映画' && mm.w4.close === 'ここまでの関係を、資料に沿って並べ直したものです。' &&
      !mm.w4.readingLabel && mm.w4.reading === '同じ物語が媒体を移るとき、街は「舞台」から「制作の場所」にもなる。' && mm.w4.readingBorder === 'dashed' && mm.readings === 1 && m.readings.every((r) => r.scene === 'w4' && !r.insideFact && r.factBadges === 0), mm.w4);
    check(S, 'w5_lead_notes_questions_disclosure', mm.w5.lead === 'ここから先は、いまの神保町です。' && mm.w5.notes === M_NOTES && mm.w5.questions.join('|') === '別の媒体になったとき、何が残って、何が変わったんだろう？|この画面は、現実のどこにつながっているんだろう？' &&
      mm.w5.disclosure === '森崎書店は作中の書店です。ここに挙げた店は、いずれも神保町に実在する別の店です。' && mm.w5.disclosureBeforeDestinations && mm.w5.realityLead === '' && mm.w5.status === 0, mm.w5);
    check(S, 'reality_destinations_are_the_three', m.dest.length === 3 && m.dest.every((d, i) => d.label === M_DEST[i][0] && d.href === M_DEST[i][1] && /noopener/.test(d.rel || '') && d.target === '_blank'), m.dest);
    check(S, 'yaguchi_is_an_editorial_example_without_relation_prefix', mm.w5.yaguchiWhy === 0 && mm.w5.yaguchiNote === '編集部が選んだ、いま神保町にある専門古書店の一例です。作品との関係が確認されている店ではありません。' &&
      mm.w5.dest1Why === 'このThreadとの関係：本が舞台とし、映画が描き、撮影した神保町の古書店街そのものへ戻る入口です。' && mm.w5.dest2Why === 'このThreadとの関係：この映画を上映してきた神保町の映画館の、現在のプログラムを見る入口です。', mm.w5);
    check(S, 'finite_end_returns_to_works', m.endLine === 'このスレッドは、ここまでです。' && !!m.exit && m.exit.href === './works.html' && m.exit.text === '作品の入口へ戻る' && m.exit.h >= 44, { end: m.endLine, exit: m.exit });
    check(S, 'no_horizontal_overflow', m.docW <= m.vw, { docW: m.docW, vw: m.vw });
    check(S, 'no_clipped_text', m.clipped.length === 0, m.clipped.slice(0, 6));
    check(S, 'one_column_everywhere', !!m.headRect && m.scenes.every((s) => s.rect.x === m.headRect.x && Math.abs(s.rect.w - m.headRect.w) <= 1) && m.headRect.w <= 640, { head: m.headRect });
    check(S, 'real_targets_are_44px', m.targets.length >= 9 && m.targets.every((t) => t.w >= 44 && t.h >= 44), m.targets.filter((t) => t.w < 44 || t.h < 44));
    check(S, 'reduced_motion_animation_0', m.animated === 0 && m.docAnimations === 0, { animated: m.animated, docAnimations: m.docAnimations });
    check(S, 'no_engagement_words', !FORBIDDEN.some((w) => m.text.includes(w)), FORBIDDEN.filter((w) => m.text.includes(w)));
    check(S, 'no_visible_editorial_label_in_morisaki', mm.readingLabels === 0 && !mm.bodyText.includes('編集部の読み'), { labels: mm.readingLabels });
    check(S, 'no_koenji_copy_in_morisaki', !/阿波おどり|木場連|鴨川|パル商店街|1957/.test(m.text), m.text.slice(0, 80));
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'storage_writes_0', m.storage.writes === 0 && m.storage.ls === 0 && m.storage.ss === 0 && m.storage.cookie === '', m.storage);
    check(S, 'permission_calls_0', m.perm === 0, m.perm);
    check(S, 'no_analytics_layer_no_new_event', m.dataLayer === 'undefined' && m.gtag === 'undefined', { dataLayer: m.dataLayer, gtag: m.gtag });
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    relSets[id] = relSets[id] || mm.relIds;
    check(S, 'same_relation_set_at_every_width', relSets[id] === mm.relIds, mm.relIds);

    /* Evidence drawer: filmed_in（神保町シアター archive）を開く → 1 件、https、検証状態は drawer の中 */
    const sel = '.th-relation[data-relation-id="rel:morisaki-filmed-in"] .th-evidence-summary';
    await page.click(sel);
    await page.waitForTimeout(150);
    const drawer = await page.evaluate(() => {
      const d = document.querySelector('.th-relation[data-relation-id="rel:morisaki-filmed-in"] .th-evidence');
      return { open: d.open, body: d.querySelector('.th-evidence-body').innerText.replace(/\s+/g, ' '), cards: [...d.querySelectorAll('.th-source')].map((c) => ({ id: c.getAttribute('data-source-id'), kind: c.getAttribute('data-source-kind'), name: (c.querySelector('.th-source-name') || {}).textContent, href: c.querySelector('.th-source-link').getAttribute('href'), h: Math.round(c.getBoundingClientRect().height) })), docW: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth };
    });
    check(S, 'evidence_drawer_works', drawer.open === true && drawer.cards.length === 1 && drawer.cards[0].id === 'src:morisaki-theater-archive' && drawer.cards[0].kind === 'cultural_archive' && drawer.cards[0].name === '神保町シアター（街と映画 Bプログラム）' &&
      drawer.cards[0].href === 'https://www.shogakukan.co.jp/jinbocho-theater/archive/program/towns-b_list.html' && drawer.cards[0].h > 0 && /検証状態：単一資料/.test(drawer.body) && /裏づけの種類：資料の記述/.test(drawer.body) && drawer.docW <= drawer.vw, drawer);
    const f = await fontsFor(ctx, page, M_PROBES);
    console.log(`fonts ${v.name}/${id}: ${Object.entries(f).map(([k, x]) => `${k}=${x}`).join(' ')}`);
    check(S, 'actual_noto_cjk_font', Object.values(f).every((x) => /Noto (Serif|Sans) CJK JP/.test(x)), f);
    if (OUT && (v.name === 'w390' || v.name === 'w1440')) await elementShot(page, '.th-relation[data-relation-id="rel:morisaki-filmed-in"]', `${id.toUpperCase().replace('-', '_')}_W3_FILMED_IN_DRAWER_OPEN_${v.width}`, v.width);
    await page.click(sel);
    await page.waitForTimeout(100);
    check(S, 'no_external_request_after_interaction', external.length === 0, external.slice(0, 3));
    if (OUT) {
      if (v.name === 'w390' || v.name === 'w1440') { await elementShot(page, '#th-w3', `${id.toUpperCase().replace('-', '_')}_W3_${v.width}`, v.width); await elementShot(page, '#th-w4', `${id.toUpperCase().replace('-', '_')}_W4_${v.width}`, v.width); await elementShot(page, '#th-w5', `${id.toUpperCase().replace('-', '_')}_W5_${v.width}`, v.width); }
      if (v.dsf === 2) {
        const docH = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: 720, height: Math.min(docH, 6000) });
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(OUT, `${id.toUpperCase().replace('-', '_')}_200PCT.png`), fullPage: false, scale: 'css' });
      } else await fullShot(page, `${id.toUpperCase().replace('-', '_')}_${v.width}`, v.width);
    }
    await ctx.close();
  }
  check('morisaki', 'book_and_film_reach_the_same_relation_set', relSets['morisaki-book'] === relSets['morisaki-film'] && relSets['morisaki-book'] === 'rel:morisaki-adapted|rel:morisaki-depicts|rel:morisaki-filmed-in|rel:morisaki-set-in', relSets);
  check('morisaki', 'book_and_film_w2_rendered_composition_identical', !!w2Html['morisaki-book'] && w2Html['morisaki-book'] === w2Html['morisaki-film'] && !/th-fact/.test(w2Html['morisaki-book']), { book: (w2Html['morisaki-book'] || '').length, film: (w2Html['morisaki-film'] || '').length });

  /* Morisaki keyboard（390）: radio が無いので skip → brand → menu → summary ×4（W1 relation 1 + W3 relation 3。W2 に fact card は無い）→ 行き先 ×3 → 出口 → footer */
  {
    const S = 'keyboard-390/morisaki-book';
    const { ctx, page } = await openThread(browser, base, origin, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'thread.html?thread=morisaki-book');
    await settle(page);
    const order = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return { el: 'BODY' };
        const cs = getComputedStyle(el);
        return { el: (typeof el.className === 'string' && el.className.split(' ')[0]) || el.tagName, href: el.getAttribute('href'), fv: el.matches(':focus-visible'), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      });
      order.push(info);
      if (info.el === 'BODY') break;
    }
    const names = order.map((o) => o.el).join('>');
    check(S, 'tab_order_without_mode_radios', names === 'skip-link>brand-home>menu-trigger>th-evidence-summary>th-evidence-summary>th-evidence-summary>th-evidence-summary>th-destination-link>th-destination-link>th-destination-link>th-exit>footer-brand>BODY', names);
    check(S, 'focus_visible_outline_on_every_stop', order.filter((o) => o.el !== 'BODY').every((o) => o.fv && o.outline), order.filter((o) => o.el !== 'BODY' && !(o.fv && o.outline)));
    check(S, 'exit_href_is_works', order.some((o) => o.el === 'th-exit' && o.href === './works.html'), order.filter((o) => o.el === 'th-exit'));
    await ctx.close();
  }

  /* Morisaki forced colors（390）: 事実の枠と読みの枠が色なしでも区別できる */
  {
    const S = 'forced-390/morisaki-film';
    const { ctx, page, external } = await openThread(browser, base, origin, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, forcedColors: 'active' }, 'thread.html?thread=morisaki-film');
    await settle(page);
    const fc = await page.evaluate(() => {
      const bw = (sel) => { const el = document.querySelector(sel); return el ? parseFloat(getComputedStyle(el).borderTopWidth) : -1; };
      const bs = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).borderTopStyle : ''; };
      return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, relationBorder: bw('.th-relation'), readingBorder: bw('.th-reading'), readingStyle: bs('.th-reading'), relationStyle: bs('.th-relation'), summaries: document.querySelectorAll('summary').length, exit: !!document.querySelector('.th-exit') };
    });
    check(S, 'no_horizontal_overflow', !fc.overflow);
    check(S, 'fact_and_reading_boxes_stay_distinguishable', fc.relationBorder >= 1 && fc.readingBorder >= 1 && fc.readingStyle === 'dashed' && fc.relationStyle === 'solid' && fc.summaries === 4 && fc.exit, fc);
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
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
