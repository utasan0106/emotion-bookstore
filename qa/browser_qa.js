#!/usr/bin/env node
/* Release Candidate 01 の実ブラウザ検査。
   NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js
   ローカルの静的サーバだけを使い、外向きの通信は一切しない。 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg' };
const SHELVES = ['kichijoji', 'koenji', 'shimokitazawa', 'jinbocho'];
const FORBIDDEN = ['次の3つ', 'また見たい', 'おすすめ', 'あなた向け', 'ランキング', '人気順',
  'トレンド', 'NEW', 'TRENDING', 'FOR YOU', '見終わりました'];

let pass = 0;
const fails = [];
// 「見たが問題なかった」と「そもそも見られなかった」を同じ ◯ で返さない。
// 見られなかったものは pass に混ぜず、総括行に別枠で出す。
const unobserved = [];
function check(scope, name, ok, detail) {
  if (ok) { pass++; return; }
  fails.push(`${scope} ${name} ${detail === undefined ? '' : JSON.stringify(detail)}`);
}
function notObservable(scope, name, why) {
  unobserved.push(`${scope} ${name} :: ${why}`);
}

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

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const origin = new URL(base).origin;
  const browser = await chromium.launch();

  // 期限テストの対象は content から実行時に選ぶ。
  // 守りたいのは特定の会期ではなく fail-closed の挙動なので、テストを
  // 特定の id / 日付 / 棚へ張り付けない。content を差し替えた瞬間に落ちる
  // fixture は、product の欠陥と賞味期限切れを判定者から見分けられなくする。
  const vm = require('vm');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'release_content.js'), 'utf8'), sandbox);
  const CONTENT = sandbox.window.V3_RELEASE_CONTENT;
  const dated = [];
  for (const sh of CONTENT.shelves) {
    for (const o of sh.objects) {
      if (!o.expiresAt) continue;
      const at = Date.parse(o.expiresAt);
      if (!isNaN(at)) dated.push({ shelf: sh, object: o, at });
    }
  }
  dated.sort((a, b) => a.at - b.at);
  const soonest = dated[0] || null;

  /* category 索引の期待値を content から作る。件数や所属を書き写すと、
     棚の入れ替えのたびに product の欠陥と fixture の賞味期限切れが
     見分けられなくなる。 */
  const stillLive = (o) => !o.expiresAt || Date.parse(o.expiresAt) > Date.now();
  const allObjects = CONTENT.shelves.reduce((acc, sh) => acc.concat(sh.objects), []);
  const objectIdsIn = (catId) => allObjects
    .filter((o) => (o.categoryIds || []).includes(catId) && stillLive(o))
    .map((o) => o.id).sort();
  /* 「1件だけの category を水増ししない」を試すには、実際に1件の category が
     要る。無ければ観測できないと言う。food に固定すると、food が2件になった
     瞬間に product の欠陥のように見える。 */
  const singleCat = (CONTENT.categories || []).find((c) => objectIdsIn(c.id).length === 1) || null;

  const VIEWPORTS = [
    { name: 'm320', width: 320, height: 800, mobile: true },
    { name: 'm390', width: 390, height: 844, mobile: true },
    { name: 'm430', width: 430, height: 932, mobile: true },
    { name: 'd1440', width: 1440, height: 1000, mobile: false }
  ];

  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile,
      reducedMotion: 'reduce'
    });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    /* ---- 玄関 ----
       HOME は Founder/HQ 承認の VISUAL_CANONICAL（853 CSS px 固定 geometry）。
       390 / 1024 / 1440 の responsive は次 Gate（HOME 853 brief §9）なので、
       この幅では見ない。見なかったことを合格へ混ぜず、別枠で残す。
       HOME の実ブラウザ契約は下の home853 block で見る。 */
    notObservable(v.name, 'home_canonical_at_this_width',
      'HOME は 853px canonical 固定。' + v.width + 'px の responsive は Founder/HQ が次 Gate と定めた');

    /* ---- 4つの棚 ---- */
    for (const id of SHELVES) {
      const S = `${v.name}/${id}`;
      await page.goto(`${base}shelf.html?shelf=${id}`, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
      await page.waitForFunction(() =>
        Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
      const shelf = await page.evaluate(() => {
        const doc = document.documentElement;
        const wide = [];
        document.querySelectorAll('body *').forEach((el) => {
          if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
          const b = el.getBoundingClientRect();
          if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
        });
        const media = [...document.querySelectorAll('.card-media')].map((f) => {
          const img = f.querySelector('img');
          if (!img) return { kind: 'plate', ok: f.classList.contains('media-plate') };
          const box = img.getBoundingClientRect();
          const natural = img.naturalWidth / img.naturalHeight;
          return { kind: 'photo', ok: Math.abs(box.width / box.height - natural) < 0.02,
            fit: getComputedStyle(img).objectFit };
        });
        const end = document.querySelector('.end-plate');
        return {
          cards: document.querySelectorAll('.object-card').length,
          h1: document.querySelectorAll('h1').length,
          hero: document.querySelector('h1').innerText.replace(/\s+/g, ''),
          shelfPortraits: document.querySelectorAll('#shelfPortrait, .shelf-portrait').length,
          shelfHeroImages: document.querySelectorAll('.shelf-hero img').length,
          endVisible: !end.hidden,
          endText: end.innerText.replace(/\s+/g, ''),
          exitHref: end.querySelector('.other-shelves').getAttribute('href'),
          exitH: Math.round(end.querySelector('.other-shelves').getBoundingClientRect().height),
          media,
          openH: Math.round(document.querySelector('.open-button').getBoundingClientRect().height),
          overflow: doc.scrollWidth > doc.clientWidth + 1, wide: wide.slice(0, 4),
          text: document.body.innerText
        };
      });
      check(S, 'exactly_3_objects', shelf.cards === 3, shelf.cards);
      check(S, 'single_h1', shelf.h1 === 1, shelf.h1);
      check(S, 'hero_is_shelf_tagline', /^.+を、3つだけ。$/.test(shelf.hero), shelf.hero);
      check(S, 'shelf_top_has_no_city_image',
        shelf.shelfPortraits === 0 && shelf.shelfHeroImages === 0,
        { portraits: shelf.shelfPortraits, images: shelf.shelfHeroImages });
      check(S, 'finite_ending_shown', shelf.endVisible);
      check(S, 'ending_copy', shelf.endText.includes('この棚は、3つで終わりです。'), shelf.endText);
      check(S, 'ending_exit_to_other_shelves',
        shelf.endText.includes('ほかの棚を見る') && shelf.exitHref === './index.html', shelf.exitHref);
      check(S, 'exit_is_comfortable_to_hit', shelf.exitH >= 44, shelf.exitH);
      check(S, 'open_control_is_comfortable_to_hit', shelf.openH >= 44, shelf.openH);
      check(S, 'media_keeps_its_own_proportion', shelf.media.every((m) => m.ok), shelf.media);
      check(S, 'no_horizontal_overflow', !shelf.overflow, shelf.wide);
      check(S, 'no_engagement_words',
        !FORBIDDEN.some((w) => shelf.text.includes(w)), FORBIDDEN.filter((w) => shelf.text.includes(w)));

      /* 詳細 */
      await page.click('.object-card:nth-child(1) .open-button');
      await page.waitForSelector('.detail-dialog[open]');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const dlg = await page.evaluate(() => {
        const d = document.querySelector('.detail-dialog');
        const reveal = d.querySelector('.detail-reveal');
        const hook = d.querySelector('.detail-hook-echo');
        const action = d.querySelector('.official-action');
        const rights = d.querySelector('.rights-note');
        const close = document.activeElement;
        const cs = close && getComputedStyle(close);
        const fs_ = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
        return {
          open: d.open,
          revealText: reveal && reveal.innerText.replace(/\s+/g, ''),
          dominant: fs_(reveal) >= fs_(hook) * 1.6,
          actionHref: action && action.getAttribute('href'),
          actionRel: action && action.getAttribute('rel'),
          rightsTitle: rights && rights.querySelector('.rights-title').textContent,
          rightsRows: rights ? rights.querySelectorAll('.rights-row').length : 0,
          onClose: !!close && close.classList.contains('dialog-close'),
          focusVisible: !!close && close.matches(':focus-visible'),
          focusIndicated: !!cs && (/inset/.test(cs.boxShadow || '') ||
            (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none')),
          overflowX: d.scrollWidth <= d.clientWidth + 1,
          text: d.innerText
        };
      });
      check(S, 'dialog_opens', dlg.open === true);
      check(S, 'dialog_shows_reveal', !!dlg.revealText, dlg.revealText);
      check(S, 'dialog_reveal_is_dominant', dlg.dominant);
      check(S, 'dialog_no_horizontal_overflow', dlg.overflowX);
      check(S, 'official_action_https_newtab',
        /^https:\/\//.test(dlg.actionHref || '') && /noopener/.test(dlg.actionRel || ''),
        { href: dlg.actionHref, rel: dlg.actionRel });
      check(S, 'rights_or_plate_provenance_present',
        ['この写真について', 'この図版について'].includes(dlg.rightsTitle) && dlg.rightsRows === 4,
        { title: dlg.rightsTitle, rows: dlg.rightsRows });
      check(S, 'dialog_close_focus_stays_visible',
        dlg.onClose && dlg.focusVisible && dlg.focusIndicated, dlg);
      check(S, 'dialog_no_engagement_words',
        !FORBIDDEN.some((w) => dlg.text.includes(w)), FORBIDDEN.filter((w) => dlg.text.includes(w)));
      check(S, 'no_external_request_before_official_action', external.length === 0, external.slice(0, 3));

      await page.keyboard.press('Escape');
      const closed = await page.evaluate(() => ({
        open: document.querySelector('.detail-dialog').open,
        focus: document.activeElement && document.activeElement.className
      }));
      check(S, 'escape_closes', closed.open === false);
      check(S, 'focus_returns_to_trigger', /open-button/.test(String(closed.focus)), closed.focus);
      check(S, 'no_js_error', pageErrors.length === 0, pageErrors.slice(0, 2));
    }

    /* ---- 存在しない棚 ---- */
    await page.goto(base + 'shelf.html?shelf=nowhere', { waitUntil: 'load' });
    await page.waitForTimeout(120);
    const lost = await page.evaluate(() => ({
      cards: document.querySelectorAll('.object-card').length,
      endHidden: document.querySelector('.end-plate').hidden,
      exit: !!document.querySelector('.other-shelves'),
      text: document.body.innerText
    }));
    check(v.name, 'unknown_shelf_shows_no_objects', lost.cards === 0, lost.cards);
    check(v.name, 'unknown_shelf_hides_finite_ending', lost.endHidden === true);
    check(v.name, 'unknown_shelf_offers_a_way_back', lost.exit);

    /* ---- 候補を教える（各幅で横スクロール 0） ---- */
    await page.goto(base + 'suggest.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('#sg-category option').length === 5);
    const sg = await page.evaluate(() => {
      const doc = document.documentElement;
      const wide = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
      });
      return {
        overflow: doc.scrollWidth > doc.clientWidth + 1, wide: wide.slice(0, 4),
        h1: document.querySelectorAll('h1').length,
        media: document.querySelectorAll('main img, main .media-frame').length,
        fields: [...document.querySelectorAll('input, textarea, select')]
          .map((el) => Math.round(el.getBoundingClientRect().height))
      };
    });
    check(v.name + '/suggest', 'no_horizontal_overflow', !sg.overflow, sg.wide);
    check(v.name + '/suggest', 'single_h1', sg.h1 === 1, sg.h1);
    check(v.name + '/suggest', 'carries_no_object_media', sg.media === 0, sg.media);
    check(v.name + '/suggest', 'fields_are_comfortable_to_hit',
      sg.fields.every((h) => h >= 44), sg.fields);

    /* ---- 既定の棚 ---- */
    await page.goto(base + 'shelf.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
    const fallback = await page.evaluate(() => document.body.dataset.shelf);
    check(v.name, 'shelf_without_param_falls_back_to_kichijoji', fallback === 'kichijoji', fallback);

    await ctx.close();
  }

  /* ---- 期限切れ: 棚を閉じる（負のテスト） ---- */
  if (!soonest) {
    // content に期限を持つ object が1件も無い。fail-closed の挙動は
    // 実物では観測できない。黙って通さず、見られなかったこととして残す。
    notObservable('expired', 'shelf_fail_closed',
      'no object in release_content.js carries an expiresAt');
    notObservable('expired-index', 'expired_current_is_dropped_from_the_index',
      'no object in release_content.js carries an expiresAt');
  } else {
    const S = `expired/${soonest.shelf.id}`;
    const justAfter = soonest.at + 60 * 1000;
    const siblings = soonest.shelf.objects
      .filter((o) => o.id !== soonest.object.id)
      .map((o) => o.objectName);

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    // content は書き換えず、時計だけ期限の1分後へ進める。
    await page.addInitScript((fixed) => {
      const RealDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...a) { if (!a.length) super(fixed); else super(...a); }
        static now() { return fixed; }
      };
    }, justAfter);
    await page.goto(`${base}shelf.html?shelf=${soonest.shelf.id}`, { waitUntil: 'load' });
    await page.waitForTimeout(200);
    const stale = await page.evaluate(() => ({
      cards: document.querySelectorAll('.object-card').length,
      endHidden: document.querySelector('.end-plate').hidden,
      text: document.body.innerText
    }));
    check(S, 'expired_current_closes_the_shelf', stale.cards === 0, stale.cards);
    check(S, 'expired_shelf_hides_finite_ending', stale.endHidden === true);
    check(S, 'expired_shelf_says_nothing_internal',
      !/expire|期限|current/i.test(stale.text), stale.text.slice(0, 60));
    // 同じ棚の他の Object を繰り上げて埋めない。
    check(S, 'expired_shelf_does_not_auto_replace',
      siblings.every((name) => !stale.text.includes(name)),
      siblings.filter((name) => stale.text.includes(name)));

    // 期限の1分前は開いていること。境目が本当にそこにあるかを確かめる。
    const before = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const beforePage = await before.newPage();
    await beforePage.addInitScript((fixed) => {
      const RealDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...a) { if (!a.length) super(fixed); else super(...a); }
        static now() { return fixed; }
      };
    }, soonest.at - 60 * 1000);
    await beforePage.goto(`${base}shelf.html?shelf=${soonest.shelf.id}`, { waitUntil: 'load' });
    await beforePage.waitForTimeout(200);
    const openCards = await beforePage.evaluate(() => document.querySelectorAll('.object-card').length);
    check(S, 'shelf_is_still_open_one_minute_before_expiry', openCards === 3, openCards);
    await before.close();
    await ctx.close();
  }

  /* ---- A. site explainer が最初の media より先 ---- */
  // 2026-09-01 に「感情書店の編集部が選んだ」へ改稿済み（qa/release_check.js と同じ文）。
  const EXPLAINER = '感情書店の編集部が選んだ場所・本・音楽・映画・催しを、街や種類ごとに少しずつ並べる文化案内です。';
  /* canonical HOME に site-explainer は無い（hero copy が先に来ることは home853 で見る）。 */
  for (const target of [
    { name: 'kichijoji', url: 'shelf.html?shelf=kichijoji' },
    { name: 'koenji', url: 'shelf.html?shelf=koenji' },
    { name: 'shimokitazawa', url: 'shelf.html?shelf=shimokitazawa' },
    { name: 'jinbocho', url: 'shelf.html?shelf=jinbocho' }
  ]) {
    const S = `identity/${target.name}`;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(base + target.url, { waitUntil: 'load' });
    await page.waitForFunction(() =>
      document.querySelectorAll('.shelf-entry').length === 4 ||
      document.querySelectorAll('.object-card').length === 3);
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(150);
    const m = await page.evaluate((sentence) => {
      const ex = [...document.querySelectorAll('.site-explainer')]
        .find((el) => el.textContent.replace(/\s+/g, '') === sentence.replace(/\s+/g, ''));
      if (!ex) return { found: false };
      const firstMedia = document.querySelector('.media-frame');
      const all = [...document.querySelectorAll('body *')];
      return {
        found: true,
        exBottom: Math.round(ex.getBoundingClientRect().bottom),
        mediaTop: firstMedia ? Math.round(firstMedia.getBoundingClientRect().top) : null,
        // DOM 順: explainer より前に media / img が居ないこと
        domOrderOk: !firstMedia ||
          (ex.compareDocumentPosition(firstMedia) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        mediaBeforeExplainer: all.filter((el) =>
          (el.classList.contains('media-frame') || el.tagName === 'IMG') &&
          (ex.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) !== 0).length
      };
    }, EXPLAINER);
    check(S, 'exact_site_explainer_present', m.found === true, m);
    check(S, 'explainer_precedes_media_in_dom', m.found && m.domOrderOk === true, m);
    check(S, 'no_object_media_before_explainer', m.found && m.mediaBeforeExplainer === 0, m);
    if (m.found && m.mediaTop !== null) {
      check(S, 'explainer_bottom_above_first_media_top', m.exBottom < m.mediaTop,
        { explainerBottom: m.exBottom, firstMediaTop: m.mediaTop });
    }
    await ctx.close();
  }

  /* ---- B. HOME — VISUAL_CANONICAL 853 ----
     Founder/HQ 承認済み HOME 画像（853 × 1844）の実ブラウザ契約。
     旧「二軸の入口と種類の索引」を置き換える。二軸は 街から入る / 作品から入る。
     category 索引・週間動画・寄り道は canonical に無く、HOME は Object を
     一覧しない（有限・非 feed）。 */
  {
    const S = 'home853';
    const ctx = await browser.newContext({
      viewport: { width: 853, height: 1844 }, deviceScaleFactor: 1, reducedMotion: 'reduce'
    });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.waitForTimeout(150);
    const home = await page.evaluate((shelves) => {
      const doc = document.documentElement;
      const rect = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) };
      };
      const wide = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
      });
      const cities = [...document.querySelectorAll('.hc-city.shelf-entry')];
      const trace = document.querySelector('.hc-hero-trace');
      const body = document.querySelector('.hc-hero-body');
      return {
        docW: doc.scrollWidth, docH: doc.scrollHeight,
        overflow: doc.scrollWidth > doc.clientWidth + 1, wide: wide.slice(0, 4),
        sections: [...document.querySelectorAll('main > section, main > .hc-sheet > section')]
          .map((el) => el.id || [...el.classList].find((c) => c !== 'hc-section')),
        h1: document.querySelectorAll('h1').length,
        h1Text: document.querySelector('h1').innerText.replace(/\s+/g, ''),
        h1LineTops: [...document.querySelectorAll('.hc-hero-line')].map((el) => Math.round(el.getBoundingClientRect().top)),
        brand: (() => {
          const a = document.querySelector('.hc-brand-link');
          return a && { text: a.textContent, imgs: a.querySelectorAll('img').length, href: a.getAttribute('href') };
        })(),
        heroImgAlt: (document.querySelector('.hc-hero-media img') || {}).getAttribute ? document.querySelector('.hc-hero-media img').getAttribute('alt') : null,
        cities: cities.map((a) => ({
          href: a.getAttribute('href'), name: a.querySelector('.hc-city-name').textContent,
          qLines: a.querySelectorAll('.hc-city-q-line').length, h: Math.round(a.getBoundingClientRect().height),
          hasImg: !!a.querySelector('img')
        })),
        works: [...document.querySelectorAll('.hc-work')].map((w) => ({
          label: w.querySelector('.hc-work-label').textContent, hold: w.getAttribute('data-route-hold'),
          tag: w.tagName, href: w.getAttribute('href'), h: Math.round(w.getBoundingClientRect().height)
        })),
        nodes: [...document.querySelectorAll('.hc-node')].map((n) => n.innerText.replace(/\s+/g, '')),
        holds: [...document.querySelectorAll('[data-route-hold]')].map((el) => ({
          id: el.getAttribute('data-route-hold'), tag: el.tagName, href: el.getAttribute('href'), onclick: el.getAttribute('onclick')
        })),
        strip: document.querySelectorAll('.hc-reality-shot img').length,
        images: [...document.images].map((img) => ({
          src: img.getAttribute('src'), sameOrigin: new URL(img.src).origin === location.origin,
          loaded: img.complete && img.naturalWidth > 0
        })),
        iframes: document.querySelectorAll('iframe').length,
        trace: trace && {
          pe: getComputedStyle(trace).pointerEvents, hidden: trace.getAttribute('aria-hidden'),
          years: [...trace.querySelectorAll('.hc-trace-year')].map((t) => t.textContent),
          belowText: body && parseInt(getComputedStyle(body).zIndex, 10) > parseInt(getComputedStyle(trace).zIndex, 10),
          inHero: trace.closest('.hc-hero') !== null
        },
        animations: document.getAnimations().length,
        rects: {
          hero: rect('.hc-hero'), sheet: rect('.hc-sheet'), cta: rect('.hc-hero-cta'),
          cityGrid: rect('.hc-city-grid'), workGrid: rect('.hc-work-grid'),
          thread: rect('.hc-thread'), threadMedia: rect('.hc-thread-media'),
          strip: rect('.hc-reality-strip'), spots: rect('.hc-reality-cta')
        },
        anchors: ['hc-works', 'hc-thread'].every((id) => !!document.getElementById(id)),
        menu: {
          credits: !!document.querySelector('#siteMenu a[href="./credits.html"]'),
          works: !!document.querySelector('#siteMenu a[href="./index.html#hc-works"]'),
          thread: !!document.querySelector('#siteMenu a[href="./index.html#hc-thread"]'),
          retired: document.querySelectorAll('#siteMenu a[href*="#by-kind"], #siteMenu a[href*="#weekly-detour"]').length
        },
        listing: document.querySelectorAll('.result-row, .object-card, .category-link, .detour-item, .weekly-video, .shelf-tagline, #categoryIndex, #archive').length,
        pager: document.querySelectorAll('[class*=pagin], [class*=page-next], [rel=next]').length,
        fonts: document.fonts.status,
        text: document.body.innerText
      };
    }, SHELVES);
    const near = (r, x, y, w, h, tol) => !!r && Math.abs(r.x - x) <= tol && Math.abs(r.y - y) <= tol && Math.abs(r.w - w) <= tol && Math.abs(r.h - h) <= tol;
    check(S, 'document_is_853_wide', home.docW === 853, home.docW);
    check(S, 'document_height_is_canonical_1844', Math.abs(home.docH - 1844) <= 4, home.docH);
    check(S, 'no_horizontal_overflow', !home.overflow, home.wide);
    check(S, 'five_sections_in_canonical_order',
      home.sections.join('|') === 'hc-hero|hc-cities|hc-works|hc-thread|hc-reality', home.sections);
    check(S, 'single_h1', home.h1 === 1, home.h1);
    check(S, 'h1_is_canonical_copy', home.h1Text === '文化のつながりを、歩く。', home.h1Text);
    check(S, 'h1_breaks_into_three_lines', new Set(home.h1LineTops).size === 3, home.h1LineTops);
    check(S, 'header_is_wordmark_only',
      !!home.brand && home.brand.text === 'みんなの感情書店' && home.brand.imgs === 0 && home.brand.href === './index.html', home.brand);
    check(S, 'hero_photo_is_decorative', home.heroImgAlt === '', home.heroImgAlt);
    // canonical の並びは 高円寺 / 吉祥寺 / 下北沢 / 神保町（content の棚順とは違う）
    const CANONICAL_ORDER = ['koenji', 'kichijoji', 'shimokitazawa', 'jinbocho'];
    check(S, 'four_city_entries_in_canonical_order',
      home.cities.length === 4 && home.cities.every((c, i) => c.href === `./shelf.html?shelf=${CANONICAL_ORDER[i]}`), home.cities.map((c) => c.href));
    check(S, 'city_names', home.cities.map((c) => c.name).join('|') === '高円寺|吉祥寺|下北沢|神保町', home.cities.map((c) => c.name));
    check(S, 'city_questions_are_three_lines_with_photo', home.cities.every((c) => c.qLines === 3 && c.hasImg), home.cities);
    check(S, 'city_cards_are_311_tall', home.cities.every((c) => Math.abs(c.h - 311) <= 1), home.cities.map((c) => c.h));
    check(S, 'four_work_entries', home.works.map((w) => w.label).join('|') === '本|映画|音楽|映像', home.works);
    check(S, 'work_entries_hold_without_a_fake_route',
      home.works.every((w) => w.hold && w.tag !== 'A' && w.tag !== 'BUTTON' && !w.href), home.works);
    check(S, 'work_cards_are_143_tall', home.works.every((w) => Math.abs(w.h - 143) <= 1), home.works.map((w) => w.h));
    check(S, 'thread_chain_is_five_nodes',
      home.nodes.join('|') === '街高円寺|出来事阿波おどり|人踊り手たち|資料記録と写真|現在つづく祭り', home.nodes);
    check(S, 'eight_route_holds_do_not_navigate',
      home.holds.length === 8 && home.holds.every((h) => h.tag !== 'A' && h.tag !== 'BUTTON' && !h.href && !h.onclick), home.holds);
    check(S, 'reality_strip_is_three_photos', home.strip === 3, home.strip);
    check(S, 'all_images_same_origin_and_loaded',
      home.images.length >= 9 && home.images.every((i) => i.sameOrigin && i.loaded), home.images.filter((i) => !i.sameOrigin || !i.loaded));
    check(S, 'no_iframe', home.iframes === 0, home.iframes);
    check(S, 'hero_cultural_trace_present_static_and_inert',
      !!home.trace && home.trace.inHero && home.trace.pe === 'none' && home.trace.hidden === 'true' && home.trace.belowText === true, home.trace);
    check(S, 'hero_trace_years_are_evidence_cleared_only',
      !!home.trace && home.trace.years.join(',') === '1957,1961,1963,2026', home.trace && home.trace.years);
    check(S, 'no_running_animation_under_reduced_motion', home.animations === 0, home.animations);
    check(S, 'hero_rect', near(home.rects.hero, 0, 0, 853, 617, 1), home.rects.hero);
    check(S, 'warm_sheet_starts_at_hero_edge', !!home.rects.sheet && Math.abs(home.rects.sheet.y - 617) <= 1, home.rects.sheet);
    check(S, 'hero_cta_rect', near(home.rects.cta, 32, 452, 244, 52, 2), home.rects.cta);
    check(S, 'city_grid_rect', near(home.rects.cityGrid, 32, 706, 789, 311, 2), home.rects.cityGrid);
    check(S, 'work_grid_rect', near(home.rects.workGrid, 32, 1104, 789, 143, 2), home.rects.workGrid);
    check(S, 'thread_panel_rect', near(home.rects.thread, 25, 1275, 803, 292, 2), home.rects.thread);
    check(S, 'thread_image_rect', near(home.rects.threadMedia, 46, 1341, 292, 180, 2), home.rects.threadMedia);
    check(S, 'reality_strip_rect', near(home.rects.strip, 333, 1620, 512, 186, 2), home.rects.strip);
    check(S, 'spots_button_rect', near(home.rects.spots, 32, 1746, 212, 48, 2), home.rects.spots);
    check(S, 'menu_anchor_targets_exist_on_home', home.anchors === true);
    check(S, 'menu_reaches_works_thread_and_credits',
      home.menu.credits && home.menu.works && home.menu.thread && home.menu.retired === 0, home.menu);
    check(S, 'home_lists_no_objects_and_no_feed', home.listing === 0 && home.pager === 0, { listing: home.listing, pager: home.pager });
    check(S, 'fonts_loaded', home.fonts === 'loaded', home.fonts);
    check(S, 'no_engagement_words',
      !FORBIDDEN.some((w) => home.text.includes(w)), FORBIDDEN.filter((w) => home.text.includes(w)));
    check(S, 'no_external_request', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', pageErrors.length === 0, pageErrors.slice(0, 2));

    // MENU の同一 page anchor は dialog を閉じて section へ移動する
    await page.click('#siteMenuButton');
    await page.waitForSelector('#siteMenu[open]');
    await page.click('#siteMenu a[href="./index.html#hc-works"]');
    await page.waitForTimeout(200);
    const jumped = await page.evaluate(() => {
      const b = document.getElementById('hc-works').getBoundingClientRect();
      return {
        open: document.getElementById('siteMenu').open, hash: location.hash,
        worksInView: b.top >= -2 && b.top < window.innerHeight
      };
    });
    check(S, 'menu_anchor_closes_menu_and_lands_on_works',
      jumped.open === false && jumped.hash === '#hc-works' && jumped.worksInView === true, jumped);

    // 旧 HOME の query（?category=）は HOME を変えない
    await page.goto(base + 'index.html?category=books', { waitUntil: 'load' });
    await page.waitForTimeout(200);
    const withQuery = await page.evaluate(() => ({
      docH: document.documentElement.scrollHeight,
      listing: document.querySelectorAll('.result-row, .category-link, #categoryIndex').length
    }));
    check(S, 'retired_category_query_does_not_change_home',
      Math.abs(withQuery.docH - home.docH) <= 1 && withQuery.listing === 0, withQuery);
    check(S, 'no_external_request_after_navigation', external.length === 0, external.slice(0, 3));
    await ctx.close();
  }

  /* ---- B2. 写真・出典（credits.html）----
     HOME 本文に長い attribution を載せない代わりの静かな surface。
     HOME が使う第三者写真が全部載っていて、どのページの MENU からも届くこと。 */
  {
    const homeHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const OWN = new Set(['favicon.ico', 'icon-512.png', 'apple-touch-icon.png', 'ogp-official-artwork-20260901.png']);
    const homePhotos = [...new Set([...homeHtml.matchAll(/\.\/assets\/([^"/]+\.(?:jpg|jpeg|png|webp))"/g)].map((m) => m[1]))]
      .filter((f) => !OWN.has(f));
    for (const v of [{ name: 'm390', width: 390, height: 844, mobile: true }, { name: 'd1440', width: 1440, height: 1000, mobile: false }]) {
      const S = `credits/${v.name}`;
      const ctx = await browser.newContext({
        viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile, reducedMotion: 'reduce'
      });
      const external = [];
      ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      await page.goto(base + 'credits.html', { waitUntil: 'load' });
      await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
      const cr = await page.evaluate(() => {
        const doc = document.documentElement;
        const wide = [];
        document.querySelectorAll('body *').forEach((el) => {
          if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
          const b = el.getBoundingClientRect();
          if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
        });
        return {
          overflow: doc.scrollWidth > doc.clientWidth + 1, wide: wide.slice(0, 4),
          h1: document.querySelectorAll('h1').length,
          h1Text: document.querySelector('h1').innerText.replace(/\s+/g, ''),
          entries: [...document.querySelectorAll('.credits-entry')].map((e) => ({
            asset: e.getAttribute('data-credit-asset'),
            fields: [...e.querySelectorAll('dt')].map((d) => d.textContent),
            links: [...e.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
            visible: e.getBoundingClientRect().height > 40
          })),
          imgs: [...document.images].map((i) => ({ sameOrigin: new URL(i.src).origin === location.origin, loaded: i.complete && i.naturalWidth > 0 })),
          menuCredits: !!document.querySelector('#siteMenu a[href="./credits.html"]'),
          text: document.body.innerText
        };
      });
      check(S, 'no_horizontal_overflow', !cr.overflow, cr.wide);
      check(S, 'single_h1_is_credits', cr.h1 === 1 && cr.h1Text === '写真・出典', cr.h1Text);
      check(S, 'every_home_third_party_photo_is_credited',
        homePhotos.every((f) => cr.entries.some((e) => e.asset === f)), { homePhotos, credited: cr.entries.map((e) => e.asset) });
      check(S, 'each_entry_carries_the_eight_fields',
        cr.entries.length > 0 && cr.entries.every((e) => e.fields.join('|') === '使用場所|被写体|作者|出典|出典URL|ライセンス|ライセンスURL|改変'),
        cr.entries.map((e) => e.fields.join('|')));
      check(S, 'each_entry_links_source_and_license_over_https',
        cr.entries.every((e) => e.links.length === 2 && e.links.every((h) => /^https:\/\//.test(h))), cr.entries.map((e) => e.links));
      check(S, 'entries_are_visible', cr.entries.every((e) => e.visible));
      check(S, 'images_same_origin_and_loaded', cr.imgs.every((i) => i.sameOrigin && i.loaded), cr.imgs);
      check(S, 'credits_is_in_its_own_menu', cr.menuCredits === true);
      check(S, 'no_engagement_words',
        !FORBIDDEN.some((w) => cr.text.includes(w)), FORBIDDEN.filter((w) => cr.text.includes(w)));
      check(S, 'no_external_request_on_load', external.length === 0, external.slice(0, 3));
      check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));

      // どのページの MENU からも届く
      const reach = [];
      for (const p of ['index.html', 'shelf.html?shelf=kichijoji', 'suggest.html', 'data.html']) {
        await page.goto(base + p, { waitUntil: 'load' });
        reach.push([p, await page.evaluate(() => !!document.querySelector('#siteMenu a[href="./credits.html"]'))]);
      }
      check(S, 'credits_reachable_from_every_menu', reach.every((r) => r[1] === true), reach);
      check(S, 'no_external_request_across_pages', external.length === 0, external.slice(0, 3));
      await ctx.close();
    }
  }

  /* ---- D. 候補受付は backend を持たない ---- */
  {
    const S = 'suggest';
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(base + 'suggest.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('#sg-category option').length === 5);

    const shape = await page.evaluate(() => ({
      controls: [...document.querySelectorAll('input, textarea, select')].map((el) => el.id),
      fileInputs: document.querySelectorAll('input[type=file]').length,
      options: [...document.querySelectorAll('#sg-category option')].map((o) => o.value),
      formAction: document.getElementById('suggestForm').getAttribute('action'),
      xHref: document.getElementById('sg-x').getAttribute('href'),
      xRel: document.getElementById('sg-x').getAttribute('rel'),
      copyH: Math.round(document.getElementById('sg-copy').getBoundingClientRect().height),
      text: document.body.innerText
    }));
    check(S, 'only_approved_controls',
      shape.controls.sort().join(',') === 'sg-category,sg-name,sg-note,sg-output,sg-url', shape.controls);
    check(S, 'no_photo_upload', shape.fileInputs === 0);
    check(S, 'category_options_are_the_controlled_five',
      shape.options.join(',') === 'food,experience,books,music,film-stage', shape.options);
    check(S, 'form_posts_nowhere', shape.formAction === null, shape.formAction);
    check(S, 'x_destination_is_exact',
      shape.xHref === 'https://x.com/emotion_books' && /noopener/.test(shape.xRel || ''), shape);
    check(S, 'copy_is_comfortable_to_hit', shape.copyH >= 44, shape.copyH);
    for (const notice of ['入力内容はこのページから自動送信されません。', '送った候補がそのまま公開されることはありません。']) {
      check(S, 'notice_present_' + notice.slice(0, 6), shape.text.includes(notice));
    }

    // 入力しても外へ出ない / どこにも残らない
    const SECRET = 'ZZTESTCANDIDATE';
    await page.fill('#sg-name', SECRET + '書店');
    await page.fill('#sg-url', 'https://example.com/' + SECRET);
    await page.selectOption('#sg-category', 'books');
    await page.fill('#sg-note', SECRET + 'が気になった');
    await page.waitForTimeout(200);
    const composed = await page.evaluate((secret) => {
      const out = document.getElementById('sg-output').value;
      const readStore = (fn) => { try { return fn(); } catch (e) { return 'THREW'; } };
      return {
        out,
        counter: document.getElementById('sg-count').textContent,
        search: location.search, hash: location.hash,
        ls: readStore(() => JSON.stringify(Object.entries(localStorage))),
        ss: readStore(() => JSON.stringify(Object.entries(sessionStorage))),
        idb: typeof indexedDB,
        cookie: document.cookie,
        dataLayer: typeof window.dataLayer,
        xHref: document.getElementById('sg-x').getAttribute('href'),
        leaks: [location.href, document.cookie].filter((t) => t.includes(secret))
      };
    }, SECRET);
    check(S, 'composes_the_candidate_text_in_browser',
      composed.out.includes(SECRET + '書店') && composed.out.includes('本・古書'), composed.out.slice(0, 60));
    check(S, 'counter_tracks_the_note', composed.counter === String((SECRET + 'が気になった').length), composed.counter);
    check(S, 'input_never_reaches_the_url',
      composed.search === '' && composed.hash === '' && composed.leaks.length === 0, composed.leaks);
    check(S, 'input_is_not_stored_locally',
      !String(composed.ls).includes(SECRET) && !String(composed.ss).includes(SECRET),
      { ls: composed.ls, ss: composed.ss });
    check(S, 'no_cookie_written', composed.cookie === '', composed.cookie);
    check(S, 'no_analytics_layer', composed.dataLayer === 'undefined', composed.dataLayer);
    check(S, 'x_url_never_carries_the_candidate',
      composed.xHref === 'https://x.com/emotion_books', composed.xHref);
    check(S, 'no_external_request_while_typing', external.length === 0, external.slice(0, 3));

    await page.click('#sg-copy');
    await page.waitForTimeout(250);
    const afterCopy = await page.evaluate(() => ({
      status: document.getElementById('sg-copy-status').textContent,
      search: location.search,
      xHref: document.getElementById('sg-x').getAttribute('href')
    }));
    check(S, 'copy_reports_its_result', afterCopy.status.length > 0, afterCopy.status);
    check(S, 'copy_does_not_navigate_or_leak', afterCopy.search === '' &&
      afterCopy.xHref === 'https://x.com/emotion_books', afterCopy);
    check(S, 'no_external_request_after_copy', external.length === 0, external.slice(0, 3));
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));

    // X は押したときだけ開く。押すまで遷移は起きない。
    const stillHere = await page.evaluate(() => location.pathname.endsWith('suggest.html'));
    check(S, 'x_is_not_opened_automatically', stillHere === true);
    await ctx.close();
  }

  /* ---- D2. コピー前の検証と、クリップボードに実際に載るもの ---- */
  {
    const S = 'suggest-validation';
    const SENTINEL = 'CLIPBOARD-UNTOUCHED-SENTINEL';
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(base + 'suggest.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('#sg-category option').length === 5);

    const seed = () => page.evaluate((v) => navigator.clipboard.writeText(v), SENTINEL);
    const clip = () => page.evaluate(() => navigator.clipboard.readText());
    const state = () => page.evaluate(() => ({
      status: document.getElementById('sg-copy-status').textContent,
      valid: document.getElementById('suggestForm').checkValidity()
    }));

    // J1: クリップボードの開示があり、言い過ぎの一文が消えている
    const copy = await page.evaluate(() => document.body.innerText);
    check(S, 'clipboard_disclosure_present',
      copy.includes('「候補文をコピー」を押した場合だけ、端末のクリップボードにコピーされます。'));
    check(S, 'no_overclaim_that_input_never_leaves_the_browser',
      !copy.includes('ブラウザの外へ出ません'));

    // 3. 場所・作品名が空 → コピーさせない
    await seed();
    await page.fill('#sg-name', '');
    await page.fill('#sg-url', '');
    await page.fill('#sg-note', '');
    await page.click('#sg-copy');
    await page.waitForTimeout(250);
    const blank = await state();
    check(S, 'blank_name_is_invalid', blank.valid === false);
    check(S, 'blank_name_blocks_copy', (await clip()) === SENTINEL, await clip());
    check(S, 'blank_name_shows_no_success', !/コピーしました/.test(blank.status), blank.status);
    check(S, 'blank_name_asks_to_check_required', blank.status === '必須項目を確認してください。', blank.status);

    // 4. 非空だが壊れた URL → コピーさせない
    await seed();
    await page.fill('#sg-name', '神保町の古書店');
    await page.fill('#sg-url', 'not a url');
    await page.click('#sg-copy');
    await page.waitForTimeout(250);
    const badUrl = await state();
    check(S, 'malformed_url_is_invalid', badUrl.valid === false);
    check(S, 'malformed_url_blocks_copy', (await clip()) === SENTINEL, await clip());
    check(S, 'malformed_url_shows_no_success', !/コピーしました/.test(badUrl.status), badUrl.status);

    // 5. 正しい入力 → 組み上がった候補文がそのままコピーされる
    await seed();
    await page.fill('#sg-url', 'https://example.com/shop');
    await page.selectOption('#sg-category', 'books');
    await page.fill('#sg-note', '棚の奥がよかった');
    await page.waitForTimeout(150);
    const composed = await page.evaluate(() => document.getElementById('sg-output').value);
    await page.click('#sg-copy');
    await page.waitForTimeout(300);
    const good = await state();
    const pasted = await clip();
    check(S, 'valid_input_is_valid', good.valid === true);
    check(S, 'valid_input_copies_the_exact_composed_text', pasted === composed,
      { pasted: pasted.slice(0, 50), composed: composed.slice(0, 50) });
    check(S, 'valid_input_reports_success', /コピーしました/.test(good.status), good.status);
    check(S, 'composed_text_has_the_expected_shape',
      composed.includes('場所・作品名: 神保町の古書店') &&
      composed.includes('種類: 本・古書') &&
      composed.includes('URL: https://example.com/shop') &&
      composed.includes('棚の奥がよかった'), composed);

    // 6/7/8/9
    const after = await page.evaluate(() => {
      const readStore = (fn) => { try { return fn(); } catch (e) { return 'THREW'; } };
      return {
        href: location.href, search: location.search, hash: location.hash,
        ls: readStore(() => JSON.stringify(Object.entries(localStorage))),
        ss: readStore(() => JSON.stringify(Object.entries(sessionStorage))),
        cookie: document.cookie,
        dataLayer: typeof window.dataLayer,
        gtag: typeof window.gtag,
        xHref: document.getElementById('sg-x').getAttribute('href')
      };
    });
    const NEEDLE = '神保町の古書店';
    check(S, 'no_external_request_through_typing_validation_and_copy',
      external.length === 0, external.slice(0, 3));
    check(S, 'input_never_reaches_url_or_query',
      !after.href.includes(NEEDLE) && after.search === '' && after.hash === '', after.href);
    check(S, 'input_never_reaches_local_storage',
      !String(after.ls).includes(NEEDLE) && !String(after.ss).includes(NEEDLE),
      { ls: after.ls, ss: after.ss });
    check(S, 'input_never_reaches_cookies_or_analytics',
      after.cookie === '' && after.dataLayer === 'undefined' && after.gtag === 'undefined', after);
    check(S, 'x_destination_is_exact', after.xHref === 'https://x.com/emotion_books', after.xHref);
    check(S, 'x_url_carries_no_query', !after.xHref.includes('?') && !after.xHref.includes('#'), after.xHref);
    check(S, 'x_url_carries_no_candidate_text',
      !after.xHref.includes(NEEDLE) && !after.xHref.includes('候補'), after.xHref);
    check(S, 'no_js_error', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  /* ---- flagship evergreen regression ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(base + 'shelf.html?shelf=kichijoji', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
    const t = await page.evaluate(() => ({
      cards: document.querySelectorAll('.object-card').length,
      portrait: !!document.querySelector('.shelf-portrait.has-media img'),
      photoCards: document.querySelectorAll('.object-card .card-media img').length,
      text: document.body.innerText
    }));
    check('flagship', 'kichijoji_flagship_stays_open', t.cards === 3, t.cards);
    check('flagship', 'city_photo_appears_only_after_entering_city', t.portrait === true);
    check('flagship', 'object_list_cards_are_typography_only', t.photoCards === 0, t.photoCards);
    check('flagship', 'kichijoji_three_hooks_present',
      ['駅から5分で、街が水辺にほどける。', '地下へ降りると、昼も夜もジャズが鳴る。', '駅から5分、街の中に小さな劇場。']
        .every((w) => t.text.replace(/\s+/g,'').includes(w.replace(/\s+/g,''))), t.text.slice(0,80));
    await ctx.close();
  }

  /* ---- 200% 拡大 / forced-colors / coarse touch ---- */
  /* HOME は 853 固定の canonical。200% 拡大は実質 426px 幅の responsive と同じ
     問題なので、Founder/HQ が次 Gate と定めた範囲に入る（NOT OBSERVABLE）。
     forced-colors は 853 で見る。credits.html は responsive な共通型なので
     zoom / forced-colors の両方を見る。 */
  notObservable('zoom200-foyer', 'no_horizontal_overflow', 'HOME 853 canonical の 200% 拡大は responsive gate（次 Gate）');
  const RESILIENCE = [
    { name: 'zoom200-shelf', page: 'shelf.html?shelf=koenji', zoom: 2, forcedColors: 'none' },
    { name: 'forced-home853', page: 'index.html', zoom: 1, forcedColors: 'active', width: 853, height: 1844 },
    { name: 'forced-shelf', page: 'shelf.html?shelf=jinbocho', zoom: 1, forcedColors: 'active' },
    { name: 'zoom200-credits', page: 'credits.html', zoom: 2, forcedColors: 'none' },
    { name: 'forced-credits', page: 'credits.html', zoom: 1, forcedColors: 'active' },
    { name: 'zoom200-suggest', page: 'suggest.html', zoom: 2, forcedColors: 'none' },
    { name: 'forced-suggest', page: 'suggest.html', zoom: 1, forcedColors: 'active' }
  ];
  for (const r of RESILIENCE) {
    const ctx = await browser.newContext({
      viewport: { width: r.width || 390, height: r.height || 844 }, reducedMotion: 'reduce', forcedColors: r.forcedColors
    });
    const page = await ctx.newPage();
    await page.goto(base + r.page, { waitUntil: 'load' });
    if (r.zoom > 1) await page.evaluate((z) => { document.documentElement.style.zoom = z; }, r.zoom);
    await page.waitForFunction(() =>
      document.querySelectorAll('.shelf-entry').length === 4 ||
      document.querySelectorAll('.object-card').length === 3 ||
      document.querySelectorAll('#sg-category option').length === 5 ||
      document.querySelectorAll('.credits-entry').length >= 1);
    await page.waitForTimeout(200);
    const st = await page.evaluate(() => {
      const doc = document.documentElement;
      const wide = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
      });
      const control = document.querySelector('.open-button, .shelf-entry, #sg-copy, .other-shelves');
      const cs = getComputedStyle(control);
      return {
        overflow: doc.scrollWidth > doc.clientWidth + 1, wide: wide.slice(0, 4),
        controlH: Math.round(control.getBoundingClientRect().height),
        border: cs.borderTopWidth, bg: cs.backgroundColor, text: document.body.innerText
      };
    });
    check(r.name, 'no_horizontal_overflow', !st.overflow, st.wide);
    check(r.name, 'primary_control_stays_reachable', st.controlH >= 44, st.controlH);
    check(r.name, 'content_is_not_lost', st.text.length > 40, st.text.length);
  }

  /* ---- coarse touch で hover 状態を残さない ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(base + 'shelf.html?shelf=kichijoji', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
    await page.hover('.object-card:nth-child(1) .list-plate').catch(() => {});
    await page.waitForTimeout(250);
    const t = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.object-card .list-plate')).transform);
    check('coarse-touch', 'no_sticky_hover_transform', t === 'none', t);
    const ta = await page.evaluate(() => ['.open-button'].map((s) =>
      getComputedStyle(document.querySelector(s)).touchAction));
    check('coarse-touch', 'primary_control_touch_action', ta[0] === 'manipulation', ta);
    await ctx.close();
  }

  await browser.close();
  server.close();

  const total = pass + fails.length;
  // どこまで見たのかを総括行に出す。見られなかったものを合格へ混ぜない。
  const seen = `${pass}/${total}` +
    (unobserved.length ? `, ${unobserved.length} NOT OBSERVABLE` : '');
  if (fails.length) {
    console.error(`RELEASE_BROWSER_QA_FAIL (${seen})`);
    fails.forEach((f) => console.error('- FAIL ' + f));
    unobserved.forEach((u) => console.error('- NOT OBSERVABLE ' + u));
    process.exit(1);
  }
  console.log(`RELEASE_BROWSER_QA_GO (${seen})`);
  unobserved.forEach((u) => console.log('- NOT OBSERVABLE ' + u));
})().catch((e) => { console.error(e); process.exit(1); });
