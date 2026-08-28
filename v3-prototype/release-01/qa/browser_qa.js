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
        media: document.querySelectorAll('img, .media-frame').length,
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

  /* ---- A. site explainer が最初の media より先 ---- */
  const EXPLAINER = '人が選んだ場所・本・音楽・映画・催しを、街や種類ごとに少しずつ並べる文化案内です。';
  for (const target of [
    { name: 'foyer', url: 'index.html' },
    { name: 'tokyo', url: 'shelf.html?shelf=tokyo' },
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

  /* ---- B/C. 二軸の入口と種類の索引 ---- */
  {
    const S = 'entrance';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const external = [];
    ctx.on('request', (req) => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    const page = await ctx.newPage();
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.category-link').length === 5);
    const dual = await page.evaluate(() => ({
      axes: [...document.querySelectorAll('.entry-axis')].map((e) => e.textContent.trim()),
      shelves: document.querySelectorAll('.shelf-entry').length,
      cats: [...document.querySelectorAll('.category-link')].map((a) => ({
        id: a.dataset.categoryId, name: a.querySelector('.category-name').textContent,
        n: a.querySelector('.category-count').textContent,
        h: Math.round(a.getBoundingClientRect().height)
      })),
      resultsEmptyAtStart: document.getElementById('categoryResults').children.length === 0,
      images: document.querySelectorAll('.category-results img').length,
      pager: document.querySelectorAll('[class*=pagin], [class*=page-next], [rel=next]').length
    }));
    check(S, 'both_entry_axes_present',
      dual.axes.join('|') === '街から見る|種類から見る', dual.axes);
    check(S, 'four_city_shelves_kept', dual.shelves === 4, dual.shelves);
    check(S, 'exactly_5_controlled_categories', dual.cats.length === 5, dual.cats.length);
    check(S, 'category_ids_and_names',
      dual.cats.map((c) => c.id + '=' + c.name).join('|') ===
      'food=飲食・喫茶|experience=体験・おでかけ|books=本・古書|music=音楽・ライブ|film-stage=映画・演劇',
      dual.cats);
    check(S, 'category_controls_are_comfortable_to_hit',
      dual.cats.every((c) => c.h >= 44), dual.cats.map((c) => c.h));
    check(S, 'no_results_until_a_category_is_chosen', dual.resultsEmptyAtStart);
    check(S, 'no_pagination_control', dual.pager === 0, dual.pager);

    // deep link
    await page.goto(base + 'index.html?category=books', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.result-row').length > 0);
    const deep = await page.evaluate(() => ({
      selected: [...document.querySelectorAll('.category-link.is-selected')].map((a) => a.dataset.categoryId),
      rows: [...document.querySelectorAll('.result-row')].map((r) => ({
        id: r.dataset.objectId,
        town: r.querySelector('.result-town').textContent,
        type: r.querySelector('.result-type').textContent,
        name: r.querySelector('.result-name').textContent,
        hook: r.querySelector('.result-hook').innerText.replace(/\s+/g, ''),
        go: r.querySelector('.result-link').getAttribute('href')
      })),
      images: document.querySelectorAll('.category-results img, .category-results .media-frame').length,
      count: document.querySelector('.result-count-n').textContent
    }));
    check(S, 'category_deep_link_selects_it', deep.selected.join(',') === 'books', deep.selected);
    check(S, 'deep_link_results_are_the_mapped_objects',
      deep.rows.map((r) => r.id).sort().join(',') ===
      'jinbocho-book-town,koenji-junjo-shotengai-book,yaguchi-shoten', deep.rows.map((r) => r.id));
    check(S, 'results_are_text_first', deep.images === 0, deep.images);
    check(S, 'result_row_carries_the_required_fields',
      deep.rows.every((r) => r.name && r.town && r.type && r.hook &&
        /^\.\/shelf\.html\?shelf=/.test(r.go)), deep.rows[0]);
    check(S, 'result_count_is_honest', deep.count === 'いま 3 件', deep.count);

    // 1件だけのカテゴリを水増ししない
    await page.goto(base + 'index.html?category=food', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.result-row').length > 0);
    const food = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('.result-row')].map((r) => r.dataset.objectId),
      count: document.querySelector('.result-count-n').textContent
    }));
    check(S, 'single_item_category_is_not_padded',
      food.rows.join(',') === 'manuscript-cafe' && food.count === 'いま 1 件', food);

    // 知らない category は静かに無選択へ倒す
    await page.goto(base + 'index.html?category=nowhere', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.category-link').length === 5);
    const unknown = await page.evaluate(() => ({
      selected: document.querySelectorAll('.category-link.is-selected').length,
      rows: document.querySelectorAll('.result-row').length
    }));
    check(S, 'unknown_category_selects_nothing',
      unknown.selected === 0 && unknown.rows === 0, unknown);

    // クリックで選べ、URL に category だけが載る
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.category-link').length === 5);
    await page.click('.category-link[data-category-id="music"]');
    await page.waitForTimeout(120);
    const clicked = await page.evaluate(() => ({
      url: location.search,
      rows: [...document.querySelectorAll('.result-row')].map((r) => r.dataset.objectId)
    }));
    check(S, 'click_updates_deep_link', clicked.url === '?category=music', clicked.url);
    check(S, 'click_shows_the_mapped_objects',
      clicked.rows.sort().join(',') === 'jirokichi,shimokitazawa-shelter', clicked.rows);
    check(S, 'entrance_makes_no_external_request', external.length === 0, external.slice(0, 3));
    await ctx.close();
  }

  /* ---- C. 期限切れは索引にも出さない ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const fixed = new Date('2026-08-31T00:00:00+09:00').getTime();
      const RealDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...a) { if (!a.length) super(fixed); else super(...a); }
        static now() { return fixed; }
      };
    });
    await page.goto(base + 'index.html?category=experience', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.category-link').length === 5);
    await page.waitForTimeout(150);
    const exp = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('.result-row')].map((r) => r.dataset.objectId),
      count: document.querySelector('.result-count-n') && document.querySelector('.result-count-n').textContent,
      allCounts: [...document.querySelectorAll('.category-link')].map((a) =>
        a.dataset.categoryId + ':' + a.querySelector('.category-count').textContent)
    }));
    check('expired-index', 'expired_current_is_not_listed',
      !exp.rows.includes('koenji-awaodori-2026'), exp.rows);
    check('expired-index', 'no_auto_substitute_for_the_expired_one',
      exp.rows.sort().join(',') === 'hachiko-taxidermy,manuscript-cafe,meguro-tapeworm', exp.rows);
    check('expired-index', 'counts_shrink_honestly',
      exp.count === 'いま 3 件' && exp.allCounts.includes('experience:3'), exp);
    await ctx.close();
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
    { name: 'forced-shelf', page: 'shelf.html?shelf=jinbocho', zoom: 1, forcedColors: 'active' },
    { name: 'zoom200-category', page: 'index.html?category=books', zoom: 2, forcedColors: 'none' },
    { name: 'zoom200-suggest', page: 'suggest.html', zoom: 2, forcedColors: 'none' },
    { name: 'forced-suggest', page: 'suggest.html', zoom: 1, forcedColors: 'active' }
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
      document.querySelectorAll('.object-card').length === 3 ||
      document.querySelectorAll('#sg-category option').length === 5);
    await page.waitForTimeout(200);
    const st = await page.evaluate(() => {
      const doc = document.documentElement;
      const wide = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
      });
      const control = document.querySelector('.open-button, .shelf-entry, #sg-copy');
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
