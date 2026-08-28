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
const SHELVES = ['tokyo', 'koenji', 'shimokitazawa', 'jinbocho'];
const FORBIDDEN = ['次の3つ', 'また見たい', 'おすすめ', 'あなた向け', 'ランキング', '人気順',
  'トレンド', 'NEW', 'TRENDING', 'FOR YOU', '見終わりました'];

let pass = 0;
const fails = [];
function check(scope, name, ok, detail) {
  if (ok) { pass++; return; }
  fails.push(`${scope} ${name} ${detail === undefined ? '' : JSON.stringify(detail)}`);
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

    /* ---- 玄関 ---- */
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.shelf-entry').length === 4);
    const foyer = await page.evaluate((shelves) => {
      const entries = [...document.querySelectorAll('.shelf-entry')];
      const doc = document.documentElement;
      const wide = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
      });
      const size = (el) => parseFloat(getComputedStyle(el.querySelector('.shelf-tagline')).fontSize);
      return {
        count: entries.length,
        ids: entries.map((e) => e.dataset.shelfId),
        hrefs: entries.map((e) => e.getAttribute('href')),
        taglines: entries.map((e) => e.querySelector('.shelf-tagline').textContent),
        flagshipBigger: size(entries[0]) > size(entries[1]),
        h1: document.querySelectorAll('h1').length,
        lead: document.querySelector('h1').innerText.replace(/\s+/g, ''),
        endVisible: !document.querySelector('.end-plate').hidden,
        overflow: doc.scrollWidth > doc.clientWidth + 1, wide: wide.slice(0, 4),
        text: document.body.innerText
      };
    }, SHELVES);
    check(v.name, 'foyer_has_exactly_4_shelves', foyer.count === 4, foyer.count);
    check(v.name, 'foyer_shelf_order', foyer.ids.join(',') === SHELVES.join(','), foyer.ids);
    check(v.name, 'foyer_deep_link_hrefs',
      foyer.hrefs.every((h, i) => h === `./shelf.html?shelf=${SHELVES[i]}`), foyer.hrefs);
    check(v.name, 'foyer_taglines',
      foyer.taglines.join('|') === '東京を、3つだけ。|高円寺を、3つだけ。|下北沢を、3つだけ。|神保町を、3つだけ。',
      foyer.taglines);
    check(v.name, 'foyer_tokyo_is_visually_primary', foyer.flagshipBigger);
    check(v.name, 'foyer_single_h1', foyer.h1 === 1, foyer.h1);
    check(v.name, 'foyer_lead_copy', foyer.lead === '今日は、どの棚へ。', foyer.lead);
    check(v.name, 'foyer_finite_ending_shown', foyer.endVisible);
    check(v.name, 'foyer_no_horizontal_overflow', !foyer.overflow, foyer.wide);
    check(v.name, 'foyer_no_engagement_words',
      !FORBIDDEN.some((w) => foyer.text.includes(w)), FORBIDDEN.filter((w) => foyer.text.includes(w)));
    check(v.name, 'foyer_no_external_request', external.length === 0, external.slice(0, 3));

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

    /* ---- 既定の棚 ---- */
    await page.goto(base + 'shelf.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
    const fallback = await page.evaluate(() => document.body.dataset.shelf);
    check(v.name, 'shelf_without_param_falls_back_to_tokyo', fallback === 'tokyo', fallback);

    await ctx.close();
  }

  /* ---- 期限切れ: 棚を閉じる（負のテスト） ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    // Koenji の会期終了後に時計を進める。content は書き換えない。
    await page.addInitScript(() => {
      const fixed = new Date('2026-08-31T00:00:00+09:00').getTime();
      const RealDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...a) { if (!a.length) super(fixed); else super(...a); }
        static now() { return fixed; }
      };
    });
    await page.goto(base + 'shelf.html?shelf=koenji', { waitUntil: 'load' });
    await page.waitForTimeout(200);
    const stale = await page.evaluate(() => ({
      cards: document.querySelectorAll('.object-card').length,
      endHidden: document.querySelector('.end-plate').hidden,
      text: document.body.innerText
    }));
    check('expired', 'expired_current_closes_the_shelf', stale.cards === 0, stale.cards);
    check('expired', 'expired_shelf_hides_finite_ending', stale.endHidden === true);
    check('expired', 'expired_shelf_says_nothing_internal',
      !/expire|期限|current/i.test(stale.text), stale.text.slice(0, 60));
    check('expired', 'expired_shelf_does_not_auto_replace',
      !stale.text.includes('JIROKICHI') && !stale.text.includes('純情商店街'), stale.text.slice(0, 60));
    await ctx.close();
  }

  /* ---- 旧 Pilot の 8/30 16:00 で東京が閉じないこと ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const fixed = new Date('2026-08-30T16:00:00+09:00').getTime();
      const RealDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...a) { if (!a.length) super(fixed); else super(...a); }
        static now() { return fixed; }
      };
    });
    await page.goto(base + 'shelf.html?shelf=tokyo', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    const t = await page.evaluate(() => ({
      cards: document.querySelectorAll('.object-card').length,
      endHidden: document.querySelector('.end-plate').hidden,
      text: document.body.innerText
    }));
    check('2026-08-30T16:00+09:00', 'tokyo_flagship_stays_open', t.cards === 3, t.cards);
    check('2026-08-30T16:00+09:00', 'tokyo_finite_ending_still_shown', t.endHidden === false);
    check('2026-08-30T16:00+09:00', 'tokyo_still_shows_its_three_hooks',
      ['原稿執筆する人限定のカフェ。', '渋谷のハチ公、本物は上野。', '8.8mのサナダムシ。']
        .every((w) => t.text.replace(/\s+/g, '').includes(w.replace(/\s+/g, ''))), t.text.slice(0, 60));
    // 同じ時刻で高円寺もまだ開いている（阿波おどりは 20:00 まで）。
    await page.goto(base + 'shelf.html?shelf=koenji', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    const k = await page.evaluate(() => document.querySelectorAll('.object-card').length);
    check('2026-08-30T16:00+09:00', 'koenji_still_open_before_its_own_expiry', k === 3, k);
    await ctx.close();
  }

  /* ---- 200% 拡大 / forced-colors / coarse touch ---- */
  const RESILIENCE = [
    { name: 'zoom200-foyer', page: 'index.html', zoom: 2, forcedColors: 'none' },
    { name: 'zoom200-shelf', page: 'shelf.html?shelf=koenji', zoom: 2, forcedColors: 'none' },
    { name: 'forced-foyer', page: 'index.html', zoom: 1, forcedColors: 'active' },
    { name: 'forced-shelf', page: 'shelf.html?shelf=jinbocho', zoom: 1, forcedColors: 'active' }
  ];
  for (const r of RESILIENCE) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', forcedColors: r.forcedColors
    });
    const page = await ctx.newPage();
    await page.goto(base + r.page, { waitUntil: 'load' });
    if (r.zoom > 1) await page.evaluate((z) => { document.documentElement.style.zoom = z; }, r.zoom);
    await page.waitForFunction(() =>
      document.querySelectorAll('.shelf-entry').length === 4 ||
      document.querySelectorAll('.object-card').length === 3);
    await page.waitForTimeout(200);
    const st = await page.evaluate(() => {
      const doc = document.documentElement;
      const wide = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
      });
      const control = document.querySelector('.open-button, .shelf-entry');
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
    await page.goto(base + 'shelf.html?shelf=tokyo', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
    await page.hover('.object-card:nth-child(1) .card-media img').catch(() => {});
    await page.waitForTimeout(250);
    const t = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.object-card .card-media img')).transform);
    check('coarse-touch', 'no_sticky_hover_transform', t === 'none', t);
    const ta = await page.evaluate(() => ['.open-button'].map((s) =>
      getComputedStyle(document.querySelector(s)).touchAction));
    check('coarse-touch', 'primary_control_touch_action', ta[0] === 'manipulation', ta);
    await ctx.close();
  }

  await browser.close();
  server.close();

  const total = pass + fails.length;
  if (fails.length) {
    console.error(`RELEASE_BROWSER_QA_FAIL (${pass}/${total})`);
    fails.forEach((f) => console.error('- FAIL ' + f));
    process.exit(1);
  }
  console.log(`RELEASE_BROWSER_QA_GO (${pass}/${total})`);
})().catch((e) => { console.error(e); process.exit(1); });
