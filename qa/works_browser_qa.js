#!/usr/bin/env node
/* WORKS BROWSER QA — 作品から入る（works.html）の実ブラウザ検査。
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node qa/works_browser_qa.js [--out <dir>]
 *
 * ローカルの静的サーバだけを使い、外向きの通信は一切しない（first paint で外へ出た
 * request はそれ自体が FAIL）。外部 action の「押したときだけ」は、context 全体の
 * 外部 request を stub（fulfill）して観測する — 実際の provider には決して届かない。
 * --out を渡したときだけ、証跡の screenshot をそこへ書く（repo の中には書かない）。
 * qa/browser_qa.js / home_responsive_check.js / thread_browser_qa.js を置き換えない。
 *
 * 見る範囲: #book / #film / #music / #video、320 / 390 / 430 / 768 / 853 / 1024 / 1440 /
 * 200%、keyboard / focus / 44px、reduced motion / forced colors、first-paint 外部
 * request 0、新規 storage key 0、Book / Film の内部 route、Music / Video の click-only
 * 外部 action、HOME の 4 card → works.html#<work> → 戻る。
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

const PAGE = 'works.html';
const TITLE = 'みんなの感情書店｜作品から入る';
const WORKS = ['book', 'film', 'music', 'video'];
/* 凍結された外部 destination（label / section / official-action の有無） */
const EXTERNAL = {
  'https://ebook.shogakukan.co.jp/detail.php?bc=093867650000d0000000&gid=1000': { label: '新装版を確認する ↗', section: 'book', official: true },
  'https://jfdb.jp/title/2240': { label: '作品情報を確認する ↗', section: 'film', official: false },
  'https://boris.bandcamp.com/album/you-laughed-like-a-water-mark-live-at-shelter-20070204': { label: '音源を聴く ↗', section: 'music', official: true },
  'https://borisheavyrocks.com/discography/4525/': { label: '録音日と会場を確認する ↗', section: 'music', official: false },
  'https://www.loft-prj.co.jp/schedule/shelter': { label: 'いまのSHELTERを見る ↗', section: 'music', official: true },
  'https://www.youtube.com/watch?v=dt33RGSRuo0': { label: '映像を見る ↗', section: 'video', official: true },
  'https://www.koenji-awaodori.com/': { label: '東京高円寺阿波おどり公式を見る ↗', section: 'video', official: true }
};
const INTERNAL = {
  book: { href: './thread.html?thread=morisaki-book', label: 'この本から辿る →', title: '本から｜森崎書店の日々｜みんなの感情書店', eyebrow: '本から' },
  film: { href: './thread.html?thread=morisaki-film', label: 'この映画から辿る →', title: '映画から｜森崎書店の日々｜みんなの感情書店', eyebrow: '映画から' }
};
const FORBIDDEN = ['次の3つ', 'また見たい', 'おすすめ', 'あなた向け', 'ランキング', '人気', 'トレンド', 'NEW', 'TRENDING', 'FOR YOU', '見終わりました',
  'スタンプ', 'ポイント', 'スコア', '正解', '不正解', 'クイズ', '診断', 'カウントダウン', '次へ', '再生回数', 'いいね', 'フォロワー', '名盤', 'FEELING GOOD', 'JIROKICHI'];

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
  const txt = (sel, scope) => { const el = (scope || document).querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
  const clipped = [];
  document.querySelectorAll('#main *').forEach((el) => {
    if (el.classList.contains('sr-only')) return;
    const b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) return;
    if (b.right > vw + 1 || b.left < -1) clipped.push(`${el.tagName}.${el.className} outside ${Math.round(b.left)}-${Math.round(b.right)}`);
    const cs = getComputedStyle(el);
    if (cs.display !== 'inline' && cs.overflow !== 'hidden' && el.scrollWidth > el.clientWidth + 1) clipped.push(`${el.tagName}.${el.className} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
  });
  const sections = [...document.querySelectorAll('#main section.wk-work')].map((s) => {
    const reading = s.querySelector('.wk-reading');
    const info = s.querySelector('.wk-info');
    return {
      id: s.id, work: s.getAttribute('data-work'), rect: R(s),
      category: txt('.wk-category', s), object: txt('.wk-object', s), byline: txt('.wk-byline', s),
      readingLabel: txt('.wk-reading-label', s), reading: txt('.wk-reading-text', s),
      readingLayer: reading ? reading.getAttribute('data-layer') : null, readingBorder: reading ? getComputedStyle(reading).borderTopStyle : null,
      info: info ? { layer: info.getAttribute('data-layer'), label: txt('.wk-info-label', s), text: txt('.wk-info-text', s), border: getComputedStyle(info).borderTopStyle } : null,
      infoBeforeReading: info && reading ? info.compareDocumentPosition(reading) & Node.DOCUMENT_POSITION_FOLLOWING : null,
      relation: txt('.wk-relation', s), current: txt('.wk-current', s), question: txt('.wk-question', s),
      links: [...s.querySelectorAll('a')].map((a) => {
        const b = R(a); const cs = getComputedStyle(a);
        return { href: a.getAttribute('href'), label: a.textContent.replace(/\s+/g, ' ').trim(), target: a.getAttribute('target'), rel: a.getAttribute('rel'), referrer: a.getAttribute('referrerpolicy'),
          official: a.classList.contains('official-action'), shelfEntry: a.classList.contains('shelf-entry'), cls: a.className, w: b.w, h: b.h, bg: cs.backgroundColor, display: cs.display };
      }),
      media: s.querySelectorAll('img, iframe, audio, video, canvas, embed, object, picture, source').length,
      controls: s.querySelectorAll('button, input, select, textarea, form').length,
      text: s.innerText.replace(/\s+/g, ' ')
    };
  });
  const targets = [...document.querySelectorAll('#main a, #main button')].map((el) => { const b = R(el); return { sel: (typeof el.className === 'string' && el.className.split(' ')[0]) || el.tagName, w: b.w, h: b.h }; });
  let animated = 0;
  document.querySelectorAll('#main *').forEach((el) => { const s = getComputedStyle(el); if ((s.animationName && s.animationName !== 'none') || (s.transitionProperty !== 'none' && parseFloat(s.transitionDuration) > 0)) animated++; });
  const readStore = (fn) => { try { return fn(); } catch (e) { return 'THREW'; } };
  const exit = document.querySelector('#main .other-shelves');
  const root = document.querySelector('.wk-root');
  return {
    vw, docW: doc.scrollWidth, docH: doc.scrollHeight, title: document.title,
    h1: document.querySelectorAll('h1').length, h1Text: txt('h1'), lead: txt('.wk-lead'),
    rootRect: root ? R(root) : null, clipped, sections, targets, animated, docAnimations: document.getAnimations ? document.getAnimations().length : null,
    exit: exit ? { href: exit.getAttribute('href'), text: exit.textContent.trim(), h: R(exit).h } : null,
    mainMedia: document.querySelectorAll('#main img, #main iframe, #main audio, #main video, #main canvas').length,
    iframes: document.querySelectorAll('iframe').length, thread: document.querySelectorAll('.th-thread, .th-scene, .th-relation').length,
    fonts: document.fonts.status, text: document.body.innerText,
    storage: { writes: window.__storageWrites, ls: readStore(() => localStorage.length), ss: readStore(() => sessionStorage.length), cookie: document.cookie },
    perm: window.__permCalls, dataLayer: typeof window.dataLayer, gtag: typeof window.gtag
  };
};

const FONT_PROBES = [['h1', '.wk-title'], ['lead', '.wk-lead'], ['category', '.wk-category'], ['object', '.wk-object'], ['byline', '.wk-byline'], ['reading', '.wk-reading-text'],
  ['relation', '.wk-relation'], ['route', '.wk-route'], ['action', '.wk-action'], ['current', '.wk-current'], ['question', '.wk-question'], ['info', '.wk-info-text'], ['exit', '.other-shelves']];
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

async function openPage(browser, base, origin, opts, url) {
  const ctx = await browser.newContext(Object.assign({ deviceScaleFactor: 1, reducedMotion: 'reduce' }, opts));
  await ctx.addInitScript(GUARD);
  const external = [];
  ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(base + (url || PAGE), { waitUntil: 'load' });
  return { ctx, page, external, errs };
}
async function settle(page) {
  await page.waitForSelector('.wk-root, .th-thread, .hc-hero', { timeout: 10000 });
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
    { name: 'w853', width: 853, height: 1844, mobile: false },
    { name: 'w1024', width: 1024, height: 768, mobile: false },
    { name: 'w1440', width: 1440, height: 900, mobile: false },
    { name: 'zoom200', width: 720, height: 450, mobile: false, dsf: 2 }
  ];

  /* ---- A. works.html at every width ---- */
  for (const v of WIDTHS) {
    const S = `${v.name}/works`;
    const { ctx, page, external, errs } = await openPage(browser, base, origin, { viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile, deviceScaleFactor: v.dsf || 1 });
    await settle(page);
    const m = await page.evaluate(MEASURE);
    const sec = Object.fromEntries(m.sections.map((s) => [s.id, s]));

    check(S, 'title_and_single_h1', m.title === TITLE && m.h1 === 1 && m.h1Text === '作品から入る', { title: m.title, h1: m.h1, text: m.h1Text });
    check(S, 'lead_is_the_frozen_sentence', m.lead === '作品をひとつ辿ると、別の作品や街が見えてくる。', m.lead);
    check(S, 'four_sections_book_film_music_video_in_order', m.sections.map((s) => s.id).join('|') === WORKS.join('|') && m.sections.every((s) => s.work === s.id) &&
      m.sections.every((s, i) => i === 0 || s.rect.y >= m.sections[i - 1].rect.y + m.sections[i - 1].rect.h - 1), m.sections.map((s) => [s.id, s.work, s.rect]));
    check(S, 'no_horizontal_overflow', m.docW <= m.vw, { docW: m.docW, vw: m.vw });
    check(S, 'no_clipped_text', m.clipped.length === 0, m.clipped.slice(0, 6));
    check(S, 'one_column_640_max', !!m.rootRect && m.rootRect.w <= 640 && m.sections.every((s) => s.rect.x === m.rootRect.x && Math.abs(s.rect.w - m.rootRect.w) <= 1), { root: m.rootRect, sections: m.sections.map((s) => s.rect) });

    check(S, 'book_copy_exact', !!sec.book && sec.book.category === '本' && sec.book.object === '森崎書店の日々' && sec.book.byline === '八木沢里志' && sec.book.readingLabel === '編集部の読み' &&
      sec.book.reading === '一冊の物語を辿ると、映画になったあと、その先の神保町まで見えてきます。' && sec.book.relation === 'つながり：この本が映画になり、その映画は神保町で撮影されました。' && sec.book.current === '現在は2025年刊の新装版で読むことができます。' && !sec.book.info, sec.book);
    check(S, 'film_copy_exact', !!sec.film && sec.film.category === '映画' && sec.film.object === '森崎書店の日々' && sec.film.byline === '監督・脚本：日向朝子 ／ 2010' && sec.film.readingLabel === '編集部の読み' &&
      sec.film.reading === '映画の背景に見えていた街が、作品を実際につくった場所として前に出てきます。' && sec.film.relation === 'つながり：この映画には原作があり、神保町で撮影されました。' && !sec.film.info, sec.film);
    check(S, 'music_copy_exact_boris', !!sec.music && sec.music.category === '音楽' && sec.music.object === '不透明度 -You Laughed Like a Water Mark- Live at Shelter 20070204' && sec.music.byline === 'Boris with Michio Kurihara' &&
      sec.music.readingLabel === '編集部の読み' && sec.music.reading === 'ライブ盤を、曲の集まりだけでなく、2007年2月4日の下北沢SHELTERで起きた一度の演奏として聴き直します。' && sec.music.relation === 'つながり：2007年2月4日、下北沢SHELTERで録音されたライブ盤です。' &&
      sec.music.question === 'この音は、誰と、どこで、どの時間に生まれたんだろう？' && !sec.music.info, sec.music);
    check(S, 'video_fact_and_reading_are_separate_layers', !!sec.video && sec.video.category === '映像' && sec.video.object === '第66回 東京高円寺阿波おどり - after movie -' && sec.video.byline === '東京高円寺阿波おどり ／ 2025' &&
      !!sec.video.info && sec.video.info.layer === 'claim' && sec.video.info.label === 'この映像について' && sec.video.info.text === '2025年8月23日・24日に行われた第66回東京高円寺阿波おどりを伝える、主催団体の公式映像です。' && sec.video.info.border === 'solid' &&
      sec.video.readingLayer === 'reading' && sec.video.readingLabel === '編集部の読み' && sec.video.reading === '踊り手の動きと街路の流れを続けて見ると、高円寺の通りが背景ではなく、出来事を成立させる場所として見えてきます。' &&
      sec.video.relation === 'つながり：高円寺の街で行われる阿波おどりを記録した、主催団体の公式映像です。' && sec.video.infoBeforeReading > 0, sec.video);
    check(S, 'relation_previews_are_plain_sentences', m.sections.every((s) => /^つながり：/.test(s.relation || '') && !/→/.test(s.relation || '')), m.sections.map((s) => s.relation));
    check(S, 'editorial_reading_is_dashed_everywhere', m.sections.every((s) => s.readingLayer === 'reading' && s.readingBorder === 'dashed'), m.sections.map((s) => [s.id, s.readingBorder]));

    /* 内部 route（Book / Film）と外部 action（凍結された 7 件、click-only の普通の link） */
    const internal = m.sections.flatMap((s) => s.links.filter((l) => /^\.\//.test(l.href)).map((l) => Object.assign({ section: s.id }, l)));
    check(S, 'internal_routes_book_and_film', internal.length === 2 && internal.every((l) => INTERNAL[l.section] && l.href === INTERNAL[l.section].href && l.label === INTERNAL[l.section].label && !l.target && !l.rel && !l.official && !l.shelfEntry && l.cls === 'wk-route'), internal);
    const external7 = m.sections.flatMap((s) => s.links.filter((l) => /^https?:/.test(l.href)).map((l) => Object.assign({ section: s.id }, l)));
    check(S, 'external_actions_are_the_frozen_seven', external7.length === 7 && external7.every((l) => EXTERNAL[l.href] && EXTERNAL[l.href].section === l.section && EXTERNAL[l.href].label === l.label) &&
      Object.keys(EXTERNAL).every((href) => external7.some((l) => l.href === href)), external7.map((l) => [l.section, l.href, l.label]));
    check(S, 'external_actions_open_safely', external7.every((l) => l.target === '_blank' && /noopener/.test(l.rel || '') && /noreferrer/.test(l.rel || '') && l.referrer === 'no-referrer'), external7.map((l) => [l.href, l.target, l.rel, l.referrer]));
    check(S, 'official_action_only_on_official_or_listening_actions', external7.every((l) => l.official === EXTERNAL[l.href].official && !l.shelfEntry), external7.map((l) => [l.href, l.official]));
    check(S, 'actions_are_links_not_buttons', m.sections.every((s) => s.controls === 0) && m.sections.every((s) => s.links.every((l) => l.display === 'inline-block' && l.bg === 'rgba(0, 0, 0, 0)')), m.sections.map((s) => [s.id, s.controls, s.links.map((l) => [l.display, l.bg])]));
    check(S, 'music_order_listen_source_reality_question', (() => { const t = sec.music ? sec.music.text : ''; const o = ['音源を聴く', '録音日と会場を確認する', 'いまのSHELTERを見る', 'この音は、誰と'].map((x) => t.indexOf(x)); return o.every((x, i) => x >= 0 && (i === 0 || x > o[i - 1])); })(), sec.music && sec.music.text.slice(0, 200));
    check(S, 'no_media_no_embed_no_thumbnail', m.mainMedia === 0 && m.iframes === 0 && m.sections.every((s) => s.media === 0), { main: m.mainMedia, iframes: m.iframes });
    check(S, 'works_is_static_not_a_thread', m.thread === 0, m.thread);
    check(S, 'real_targets_are_44px', m.targets.length >= 10 && m.targets.every((t) => t.w >= 44 && t.h >= 44), m.targets.filter((t) => t.w < 44 || t.h < 44));
    check(S, 'finite_exit_to_home', !!m.exit && m.exit.href === './index.html' && m.exit.text === '入口へ戻る' && m.exit.h >= 44, m.exit);
    check(S, 'reduced_motion_animation_0', m.animated === 0 && m.docAnimations === 0, { animated: m.animated, docAnimations: m.docAnimations });
    check(S, 'no_engagement_or_popularity_words', !FORBIDDEN.some((w) => m.text.includes(w)), FORBIDDEN.filter((w) => m.text.includes(w)));
    check(S, 'no_external_request_on_first_paint', external.length === 0, external.slice(0, 3));
    check(S, 'storage_writes_0_no_new_key', m.storage.writes === 0 && m.storage.ls === 0 && m.storage.ss === 0 && m.storage.cookie === '', m.storage);
    check(S, 'permission_calls_0', m.perm === 0, m.perm);
    check(S, 'no_analytics_layer_off_production', m.dataLayer === 'undefined' && m.gtag === 'undefined', { dataLayer: m.dataLayer, gtag: m.gtag });
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    const f = await fonts(ctx, page);
    console.log(`fonts ${v.name}: ${Object.entries(f).map(([k, x]) => `${k}=${x}`).join(' ')}`);
    check(S, 'actual_noto_cjk_font', Object.values(f).every((x) => /Noto (Serif|Sans) CJK JP/.test(x)), f);

    /* menu: open / Escape / focus return（release.js の共通 dialog） */
    await page.click('#siteMenuButton');
    await page.waitForSelector('#siteMenu[open]');
    const menu = await page.evaluate(() => ({ open: document.getElementById('siteMenu').open, focusInside: document.getElementById('siteMenu').contains(document.activeElement), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, credits: !!document.querySelector('#siteMenu a[href="./credits.html"]'), works: !!document.querySelector('#siteMenu a[href="./index.html#hc-works"]') }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const afterMenu = await page.evaluate(() => ({ open: document.getElementById('siteMenu').open, focus: document.activeElement && document.activeElement.id }));
    check(S, 'menu_opens_and_escape_returns_focus', menu.open && menu.focusInside && !menu.overflow && menu.credits && menu.works && afterMenu.open === false && afterMenu.focus === 'siteMenuButton', { menu, afterMenu });
    check(S, 'no_external_request_after_interaction', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error_after_interaction', errs.length === 0, errs.slice(0, 2));

    if (OUT) {
      if (v.name === 'w390' || v.name === 'w1440') { await elementShot(page, '#music', `WORKS_MUSIC_${v.width}`, v.width); await elementShot(page, '#video', `WORKS_VIDEO_${v.width}`, v.width); }
      if (v.dsf === 2) {
        const docH = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: 720, height: Math.min(docH, 6000) });
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(OUT, 'WORKS_200PCT.png'), fullPage: false, scale: 'css' });
      } else await fullShot(page, `WORKS_${v.width}`, v.width);
    }
    await ctx.close();
  }

  /* ---- B. forced colors: 事実の枠（実線）と読みの枠（破線）が色なしでも区別できる ---- */
  for (const w of [390, 1440]) {
    const S = `forced-${w}`;
    const { ctx, page, external, errs } = await openPage(browser, base, origin, { viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500, forcedColors: 'active' });
    await settle(page);
    const fc = await page.evaluate(() => {
      const doc = document.documentElement;
      const bw = (sel) => { const el = document.querySelector(sel); return el ? parseFloat(getComputedStyle(el).borderTopWidth) : -1; };
      const bs = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).borderTopStyle : ''; };
      return { overflow: doc.scrollWidth > doc.clientWidth + 1, text: document.body.innerText.length, infoBorder: bw('.wk-info'), infoStyle: bs('.wk-info'), readingBorder: bw('.wk-reading'), readingStyle: bs('.wk-reading'), links: document.querySelectorAll('#main a').length, sections: document.querySelectorAll('section.wk-work').length };
    });
    check(S, 'no_horizontal_overflow', !fc.overflow);
    check(S, 'content_is_not_lost', fc.text > 400 && fc.sections === 4 && fc.links >= 10, fc);
    check(S, 'fact_and_reading_boxes_stay_distinguishable', fc.infoBorder >= 1 && fc.infoStyle === 'solid' && fc.readingBorder >= 1 && fc.readingStyle === 'dashed', fc);
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    if (OUT && w === 390) await shot(page, 'WORKS_FORCED_390');
    await ctx.close();
  }

  /* ---- C. reduced-motion: reduce / no-preference で同じ描画・animation 0 ---- */
  {
    const S = 'motion-390';
    const shots = {};
    for (const rm of ['reduce', 'no-preference']) {
      const { ctx, page } = await openPage(browser, base, origin, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: rm });
      await settle(page);
      await page.waitForTimeout(400);
      const m = await page.evaluate(MEASURE);
      shots[rm] = { png: (await page.screenshot({ fullPage: false })).toString('base64'), animated: m.animated, docAnimations: m.docAnimations };
      await ctx.close();
    }
    check(S, 'animation_0_under_both_preferences', shots.reduce.animated === 0 && shots['no-preference'].animated === 0 && shots.reduce.docAnimations === 0 && shots['no-preference'].docAnimations === 0, { reduce: shots.reduce.animated, nopref: shots['no-preference'].animated });
    check(S, 'identical_render_under_both_preferences', shots.reduce.png === shots['no-preference'].png);
  }

  /* ---- D. keyboard: skip → brand → menu → 本 route → 新装版 → 映画 route → JFDB → 音源 → 録音情報 → SHELTER → 映像 → 公式 → 入口へ戻る → footer ---- */
  for (const w of [390, 1440]) {
    const S = `keyboard-${w}`;
    const { ctx, page } = await openPage(browser, base, origin, { viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500 });
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
    const hrefs = order.filter((o) => o.href && !/^#|^\.\/index\.html$/.test(o.href)).map((o) => o.href);
    check(S, 'tab_order_reaches_every_real_control', names.startsWith('skip-link>brand-home>menu-trigger>wk-route>wk-action>wk-route>wk-action>wk-action>wk-action>wk-action>wk-action>wk-action>other-shelves>footer-brand'), names);
    check(S, 'tab_order_follows_the_page_order', hrefs.join('|') === [
      './thread.html?thread=morisaki-book', 'https://ebook.shogakukan.co.jp/detail.php?bc=093867650000d0000000&gid=1000', './thread.html?thread=morisaki-film', 'https://jfdb.jp/title/2240',
      'https://boris.bandcamp.com/album/you-laughed-like-a-water-mark-live-at-shelter-20070204', 'https://borisheavyrocks.com/discography/4525/', 'https://www.loft-prj.co.jp/schedule/shelter',
      'https://www.youtube.com/watch?v=dt33RGSRuo0', 'https://www.koenji-awaodori.com/'].join('|'), hrefs);
    check(S, 'focus_visible_outline_on_every_stop', order.filter((o) => o.el !== 'BODY').every((o) => o.fv && o.outline), order.filter((o) => o.el !== 'BODY' && !(o.fv && o.outline)));
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

  /* ---- E. Book / Film の内部 route: works.html → thread.html?thread=morisaki-* → 出口 → works.html ---- */
  for (const w of [390, 1440]) for (const work of ['book', 'film']) {
    const S = `route-${w}/${work}`;
    const want = INTERNAL[work];
    const { ctx, page, external, errs } = await openPage(browser, base, origin, { viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500 });
    await settle(page);
    await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'start' }), work);
    await page.waitForTimeout(100);
    const scrollBefore = await page.evaluate(() => Math.round(scrollY));
    await page.click(`#${work} a.wk-route`);
    await page.waitForURL((u) => u.pathname.endsWith('/thread.html') && u.search === `?thread=morisaki-${work}`, { timeout: 5000 });
    await page.waitForSelector('.th-thread');
    await page.waitForTimeout(200);
    const arrived = await page.evaluate(() => ({
      title: document.title, id: (document.querySelector('.th-thread') || {}).getAttribute ? document.querySelector('.th-thread').getAttribute('data-thread-id') : null, top: Math.round(scrollY),
      eyebrow: (document.querySelector('.th-eyebrow') || {}).textContent, scenes: document.querySelectorAll('.th-scene').length, modes: document.querySelectorAll('.th-mode, input[name="thread-mode"]').length,
      exit: document.querySelector('.th-exit') ? { href: document.querySelector('.th-exit').getAttribute('href'), text: document.querySelector('.th-exit').textContent } : null
    }));
    check(S, 'route_lands_on_the_morisaki_thread', arrived.title === want.title && arrived.id === `morisaki-${work}` && arrived.eyebrow === want.eyebrow && arrived.scenes === 6 && arrived.top === 0 && arrived.modes === 0, arrived);
    check(S, 'thread_exit_points_back_at_works', !!arrived.exit && arrived.exit.href === './works.html' && arrived.exit.text === '作品の入口へ戻る', arrived.exit);
    await page.evaluate(() => document.querySelector('.th-exit').scrollIntoView({ block: 'center' }));
    await page.click('.th-exit');
    await page.waitForURL((u) => u.pathname.endsWith('/works.html'), { timeout: 5000 });
    await page.waitForSelector('.wk-root');
    const back = await page.evaluate(() => ({ title: document.title, sections: document.querySelectorAll('section.wk-work').length }));
    check(S, 'exit_returns_to_works', back.title === TITLE && back.sections === 4, back);
    await page.goBack({ waitUntil: 'load' });
    await page.goBack({ waitUntil: 'load' });
    await page.waitForSelector('.wk-root');
    await page.waitForTimeout(300);
    const restored = await page.evaluate(() => ({ url: location.pathname.split('/').pop(), scrollY: Math.round(scrollY) }));
    check(S, 'browser_back_restores_works_scroll_position', restored.url === 'works.html' && Math.abs(restored.scrollY - scrollBefore) <= 8, { before: scrollBefore, restored });
    check(S, 'no_external_request_across_the_route', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  /* ---- F. Music / Video: 外部 action は押したときだけ（context の外部 request を全部 stub し、実 provider へは出ない） ---- */
  for (const w of [390, 1440]) {
    const S = `click-only-${w}`;
    const { ctx, page, external, errs } = await openPage(browser, base, origin, { viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500 });
    await ctx.route((url) => !url.href.startsWith(origin), (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
    await settle(page);
    check(S, 'no_external_request_before_click', external.length === 0, external.slice(0, 3));
    for (const [sel, host, name] of [['#music a[href^="https://boris.bandcamp.com/"]', 'https://boris.bandcamp.com/', 'music_listen'], ['#video a[href^="https://www.youtube.com/"]', 'https://www.youtube.com/', 'video_watch']]) {
      const before = external.length;
      await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
      const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), page.click(sel)]);
      if (popup) await popup.waitForLoadState('load', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      const after = external.slice(before);
      check(S, `${name}_opens_only_after_click_in_a_new_tab`, !!popup && popup.url().startsWith(host) && after.length >= 1 && after.every((u) => u.startsWith(host)), { popup: popup && popup.url(), after: after.slice(0, 3) });
      const stayed = await page.evaluate(() => ({ url: location.pathname.split('/').pop(), sections: document.querySelectorAll('section.wk-work').length }));
      check(S, `${name}_keeps_works_open`, stayed.url === 'works.html' && stayed.sections === 4, stayed);
      if (popup) await popup.close();
    }
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  /* ---- G. HOME の接続: 4 card → works.html#<work> → 戻る、route hold 0（Founder Preview Fix）、853 geometry ---- */
  for (const v of [{ name: 'm390', width: 390, height: 844, mobile: true }, { name: 'c853', width: 853, height: 1844, mobile: false }, { name: 'd1440', width: 1440, height: 900, mobile: false }]) {
    const S = `home-${v.name}`;
    const { ctx, page, external, errs } = await openPage(browser, base, origin, { viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile }, 'index.html');
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(200);
    const home = await page.evaluate(() => {
      const R = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
      return {
        works: [...document.querySelectorAll('.hc-work')].map((a) => ({ tag: a.tagName, href: a.getAttribute('href'), work: a.getAttribute('data-work'), hold: a.hasAttribute('data-route-hold'), shelfEntry: a.classList.contains('shelf-entry'), label: (a.querySelector('.hc-work-label') || {}).textContent, img: !!a.querySelector('.hc-work-media img'), rect: R(a), display: getComputedStyle(a).display, deco: getComputedStyle(a).textDecorationLine, tabIndex: a.tabIndex })),
        grid: R(document.querySelector('.hc-work-grid')),
        holds: [...document.querySelectorAll('[data-route-hold]')].map((el) => el.getAttribute('data-route-hold')),
        sections: document.querySelectorAll('main > section, main > .hc-sheet > section').length
      };
    });
    check(S, 'four_work_cards_are_real_anchors_to_works', home.works.length === 4 && home.works.every((w, i) => w.tag === 'A' && w.work === WORKS[i] && w.href === './works.html#' + WORKS[i] && !w.hold && !w.shelfEntry && w.img && w.tabIndex === 0 && w.display === 'block' && w.deco === 'none'), home.works);
    check(S, 'work_card_labels_unchanged', home.works.map((w) => w.label).join('|') === '本|映画|音楽|映像', home.works.map((w) => w.label));
    check(S, 'work_cards_hit_area_44', home.works.every((w) => w.rect.w >= 44 && w.rect.h >= 44), home.works.map((w) => w.rect));
    check(S, 'no_route_holds_remain_on_home', home.holds.length === 0, home.holds);
    if (v.width === 853) check(S, 'work_grid_keeps_853_geometry', home.grid.x === 32 && home.grid.y === 1104 && home.grid.w === 789 && home.grid.h === 143 && home.works.every((w) => w.rect.h === 143 && Math.abs(w.rect.w - 188) <= 1), { grid: home.grid, cards: home.works.map((w) => w.rect) });
    await page.focus('.hc-work[data-work="book"]');
    const focused = await page.evaluate(() => { const el = document.activeElement; const cs = getComputedStyle(el); return { el: el.className, fv: el.matches(':focus-visible'), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }; });
    check(S, 'work_card_focus_visible', /hc-work/.test(focused.el) && focused.fv && focused.outline, focused);
    // HOME → works.html#film → back
    await page.evaluate(() => document.querySelector('.hc-work[data-work="film"]').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(150);
    const scrollBefore = await page.evaluate(() => Math.round(scrollY));
    await page.click('.hc-work[data-work="film"]');
    await page.waitForURL((u) => u.pathname.endsWith('/works.html') && u.hash === '#film', { timeout: 5000 });
    await page.waitForSelector('.wk-root');
    await page.waitForTimeout(300);
    const arrived = await page.evaluate(() => { const b = document.getElementById('film').getBoundingClientRect(); return { title: document.title, hash: location.hash, filmInView: b.top >= -2 && b.top < innerHeight, sections: document.querySelectorAll('section.wk-work').length }; });
    check(S, 'home_card_lands_on_works_film', arrived.title === TITLE && arrived.hash === '#film' && arrived.filmInView && arrived.sections === 4, arrived);
    await page.goBack({ waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.hc-city').length === 4);
    await page.waitForTimeout(400);
    const restored = await page.evaluate(() => ({ url: location.pathname.split('/').pop() + location.search, sections: document.querySelectorAll('main > section, main > .hc-sheet > section').length, anchors: document.querySelectorAll('a.hc-work[href^="./works.html#"]').length, scrollY: Math.round(scrollY) }));
    check(S, 'browser_back_restores_home_context', restored.url === 'index.html' && restored.sections === 5 && restored.anchors === 4, restored);
    check(S, 'browser_back_restores_scroll_position', Math.abs(restored.scrollY - scrollBefore) <= 8, { before: scrollBefore, after: restored.scrollY });
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  /* ---- H. JavaScript 無効: 本文は全部静的に読める ---- */
  {
    const S = 'js-off-390';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, javaScriptEnabled: false, reducedMotion: 'reduce' });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    await page.goto(base + PAGE, { waitUntil: 'load' });
    await page.waitForTimeout(200);
    const off = await page.evaluate(() => ({
      sections: document.querySelectorAll('section.wk-work').length, links: document.querySelectorAll('#main a').length, title: document.title,
      shell: !!document.getElementById('siteMenuButton') && !!document.querySelector('.site-footer') && !!document.querySelector('.skip-link'), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      text: document.getElementById('main').innerText
    }));
    check(S, 'static_content_fully_readable_without_js', off.sections === 4 && off.links >= 10 && off.title === TITLE && /森崎書店の日々/.test(off.text) && /Boris with Michio Kurihara/.test(off.text) && /第66回 東京高円寺阿波おどり/.test(off.text), { sections: off.sections, links: off.links });
    check(S, 'shell_intact_no_overflow', off.shell && !off.overflow, off);
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    if (OUT) await shot(page, 'WORKS_JS_OFF_390');
    await ctx.close();
  }

  await browser.close();
  server.close();
  const total = pass + fails.length;
  const seen = `${pass}/${total}` + (unobserved.length ? `, ${unobserved.length} NOT OBSERVABLE` : '');
  if (fails.length) {
    console.error(`WORKS_BROWSER_QA_FAIL (${seen})`);
    fails.forEach((f) => console.error('- FAIL ' + f));
    unobserved.forEach((u) => console.error('- NOT OBSERVABLE ' + u));
    process.exit(1);
  }
  console.log(`WORKS_BROWSER_QA_GO (${seen})`);
  unobserved.forEach((u) => console.log('- NOT OBSERVABLE ' + u));
})().catch((e) => { console.error(e); process.exit(1); });
