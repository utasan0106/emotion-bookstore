#!/usr/bin/env node
/**
 * Tokyo Pilot 01 — Human Test browser QA
 *
 * Participant-visible contract を実ブラウザで検証する。
 * 出力: qa/qa-report.json（+ --shots で qa/shots/*.png）
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node qa/browser_qa.js [--shots]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'qa-report.json');
const SHOT_DIR = path.join(__dirname, 'shots');
const WANT_SHOTS = process.argv.includes('--shots');

const VIEWPORTS = [
  { name: 'm320', width: 320, height: 800, mobile: true },
  { name: 'm390', width: 390, height: 844, mobile: true },
  { name: 'm430', width: 430, height: 932, mobile: true },
  { name: 'd1024', width: 1024, height: 768, mobile: false },
  { name: 'd1440', width: 1440, height: 1000, mobile: false }
];

// 一覧に出てはいけない Reveal の答え。
const SPOILERS = ['剥製', '標本', '1986', '精算', '目標を書'];
// 参加者画面に出てはいけない内部語彙。
const INTERNAL = ['verifiedNote', 'Reveal', 'First Pull', 'Object Open', 'Human Test', 'mediaPolicy',
  'production_promotion', 'expiresAt', 'reverify', 'PILOT_CHECK', 'Pilot'];

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.json': 'application/json', '.csv': 'text/csv' };

function serve(port) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}

const results = [];
function check(scope, name, pass, detail) {
  results.push({ scope, name, pass: !!pass, detail: detail === undefined ? null : detail });
}

(async () => {
  const server = await serve(0);
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  if (WANT_SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      reducedMotion: 'reduce'
    });
    const page = await ctx.newPage();

    // --- 外部通信・計測・エラーの監視 -------------------------------------
    const requests = [];
    const consoleErrors = [];
    const pageErrors = [];
    page.on('request', r => requests.push(r.url()));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
    await page.addInitScript(() => {
      window.__violations = [];
      const flag = k => window.__violations.push(k);
      ['fetch', 'XMLHttpRequest'].forEach(k => {
        const orig = window[k];
        window[k] = function () { flag(k); return orig.apply(this, arguments); };
      });
      if (navigator.sendBeacon) {
        const b = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = function () { flag('sendBeacon'); return b.apply(this, arguments); };
      }
    });

    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
    await page.waitForFunction(() => Array.from(document.images).every(i => i.complete));

    const S = vp.name;

    // --- 1. Real Media が実際にデコードされている -----------------------
    const imgs = await page.$$eval('.object-card img', els => els.map(i => ({
      src: i.currentSrc.split('/').pop(), w: i.naturalWidth, h: i.naturalHeight,
      boxW: Math.round(i.getBoundingClientRect().width), boxH: Math.round(i.getBoundingClientRect().height),
      fit: getComputedStyle(i).objectFit
    })));
    check(S, 'card_media_decoded_3', imgs.length === 3 && imgs.every(i => i.w > 0 && i.h > 0), imgs);

    // 遅延読み込みで枠だけ灰色になる状態を作らない。
    // fold 外の Object も、スクロールを待たずに実画像が入っていること。
    const loadState = await page.$$eval('.object-card img', els => els.map(i => ({
      src: i.getAttribute('src'), loading: i.getAttribute('loading'),
      complete: i.complete, natural: i.naturalWidth, currentSrc: !!i.currentSrc
    })));
    check(S, 'all_media_loaded_without_scroll',
      loadState.length === 3 && loadState.every(i => i.loading === 'eager' && i.complete && i.natural > 0 && i.currentSrc),
      loadState);

    // --- 2. 画像の identity: crop で失われる面積 -------------------------
    const cropLoss = imgs.map(i => {
      if (i.fit === 'contain' || !i.boxW || !i.boxH) return { src: i.src, fit: i.fit, visible: 1 };
      const scale = Math.max(i.boxW / i.w, i.boxH / i.h);
      const visible = (i.boxW / scale * (i.boxH / scale)) / (i.w * i.h);
      return { src: i.src, fit: i.fit, visible: Number(visible.toFixed(3)) };
    });
    check(S, 'card_media_identity_kept', cropLoss.every(c => c.visible >= 0.75), cropLoss);

    // --- 3. 1画面目に Real Media + Hook が見える ------------------------
    const firstFold = await page.evaluate(() => {
      const vh = window.innerHeight;
      const seen = [];
      const vis = r => Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      document.querySelectorAll('.object-card').forEach(card => {
        const img = card.querySelector('img');
        const hook = card.querySelector('.object-hook');
        const btn = card.querySelector('.open-button');
        const ir = img.getBoundingClientRect(), hr = hook.getBoundingClientRect(), br = btn.getBoundingClientRect();
        // 画像は縦の 1/3 以上、Hook は 1 行以上が fold 内に入っていること
        if (vis(ir) >= ir.height / 3 && vis(hr) >= Math.min(hr.height, 20)) {
          seen.push({
            hook: hook.textContent,
            imgVisiblePx: Math.round(vis(ir)),
            imgVisibleRatio: Number((vis(ir) / ir.height).toFixed(2)),
            hookFullyVisible: vis(hr) >= hr.height - 1,
            openAffordanceVisible: vis(br) >= br.height - 1
          });
        }
      });
      // 「全部で3件しかない」ことが 1 画面目でわかるか。
      // 2件目の覗きではなく、1件目に載る 01 / 03 のカウンタがこれを担う。
      const counter = document.querySelector('.object-card .card-number');
      const cr = counter && counter.getBoundingClientRect();
      return {
        vh, seen,
        finiteCounter: counter ? counter.textContent : null,
        finiteCounterVisible: !!cr && vis(cr) >= cr.height - 1
      };
    });
    check(S, 'first_fold_has_media_and_hook', firstFold.seen.length >= 1, firstFold);
    // First Pull: 1 件目の Hook 全文と「ひらく」が、スクロールなしで見えていること
    check(S, 'first_fold_open_affordance_visible',
      firstFold.seen.length >= 1 && firstFold.seen[0].hookFullyVisible && firstFold.seen[0].openAffordanceVisible,
      firstFold.seen[0] || null);
    // 有限な棚であることが 1 画面目で伝わるか（01 / 03 が読める）
    check(S, 'first_fold_set_is_legible',
      firstFold.finiteCounterVisible && /\/\s*03/.test(firstFold.finiteCounter || ''),
      { counter: firstFold.finiteCounter, visible: firstFold.finiteCounterVisible });

    // 参加者が読む文字の最小サイズ。日本語で 10px を切ると実機で読めない。
    const tiny = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
        const hasOwnText = Array.from(el.childNodes)
          .some(n => n.nodeType === 3 && n.textContent.trim().length);
        if (!hasOwnText) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const size = parseFloat(cs.fontSize);
        if (size < 10) out.push({ el: el.className || el.tagName, size, text: el.textContent.trim().slice(0, 24) });
      });
      return out;
    });
    check(S, 'no_text_below_10px', tiny.length === 0, tiny);

    // --- 4. 横スクロール 0 ----------------------------------------------
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const wide = [];
      document.querySelectorAll('body *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > doc.clientWidth + 1 || r.left < -1)) {
          wide.push(el.className || el.tagName);
        }
      });
      return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, wide: wide.slice(0, 8) };
    });
    check(S, 'no_horizontal_overflow', overflow.scrollW <= overflow.clientW + 1, overflow);

    // --- 5. 一覧に Reveal の答え / 内部語が出ていない --------------------
    const listText = await page.evaluate(() => document.body.innerText);
    const listHtml = await page.content();
    check(S, 'list_no_spoiler', !SPOILERS.some(w => listText.includes(w)),
      SPOILERS.filter(w => listText.includes(w)));
    check(S, 'list_no_internal_term', !INTERNAL.some(w => listText.includes(w)),
      INTERNAL.filter(w => listText.includes(w)));
    check(S, 'list_no_objectname_in_dom', !/objectName/.test(listHtml));

    // 目に見えるテキストだけでなく、読み上げに渡る文字列も検査する。
    // alt / aria-label / title は「見えないから安全」ではない。
    const a11yText = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('*').forEach(el => {
        ['alt', 'aria-label', 'title', 'aria-description', 'placeholder'].forEach(attr => {
          const v = el.getAttribute && el.getAttribute(attr);
          if (v) out.push({ where: (el.className || el.tagName) + '@' + attr, text: v });
        });
      });
      return out;
    });
    const a11yLeaks = a11yText.filter(x => SPOILERS.some(w => x.text.includes(w)));
    check(S, 'list_a11y_text_no_spoiler', a11yLeaks.length === 0, a11yLeaks);
    const a11yInternal = a11yText.filter(x => INTERNAL.some(w => x.text.includes(w)));
    check(S, 'list_a11y_text_no_internal_term', a11yInternal.length === 0, a11yInternal);
    // 一覧のすべての Real Media に、中身のある代替テキストがあること
    const altCoverage = await page.$$eval('.object-card img',
      els => els.map(i => (i.getAttribute('alt') || '').trim().length));
    check(S, 'list_media_alt_present', altCoverage.length === 3 && altCoverage.every(n => n >= 8), altCoverage);

    // 読み上げの live region は1つだけ。一覧は読み込み時に描かれるだけなので
    // live にしない（初回に3件ぶん読み上げられてしまう）。
    const liveRegions = await page.$$eval('[aria-live], [role="status"], [role="alert"]',
      els => els.map(e => ({ id: e.id, role: e.getAttribute('role'), live: e.getAttribute('aria-live') })));
    check(S, 'single_live_region', liveRegions.length === 1 && liveRegions[0].id === 'live', liveRegions);

    // --- 6. ひらく が外部リンクに見えない --------------------------------
    const openBtn = await page.$$eval('.open-button', els => els.map(b => ({
      tag: b.tagName, text: b.textContent, href: b.getAttribute('href')
    })));
    check(S, 'open_control_is_button', openBtn.length === 3 &&
      openBtn.every(b => b.tag === 'BUTTON' && !b.href && !/↗|→|外部/.test(b.text)), openBtn);

    // --- 7. dialog: 開く / Reveal / Escape / focus 復帰 -------------------
    await page.click('.object-card:nth-child(1) .open-button');
    await page.waitForSelector('.detail-dialog[open]');
    const dlg = await page.evaluate(() => {
      const d = document.querySelector('.detail-dialog');
      const reveal = d.querySelector('.detail-reveal');
      const hook = d.querySelector('.detail-hook-echo');
      const action = d.querySelector('.official-action');
      const cs = el => el ? parseFloat(getComputedStyle(el).fontSize) : 0;
      return {
        open: d.open,
        revealText: reveal && reveal.textContent,
        revealFont: cs(reveal), hookFont: cs(hook),
        revealAboveFold: reveal ? reveal.getBoundingClientRect().top < window.innerHeight : false,
        actionHref: action && action.getAttribute('href'),
        actionRel: action && action.getAttribute('rel'),
        focus: document.activeElement && (document.activeElement.className || document.activeElement.tagName),
        overflowX: d.scrollWidth <= d.clientWidth + 1,
        text: d.innerText
      };
    });
    check(S, 'dialog_opens', dlg.open === true);
    check(S, 'dialog_shows_reveal', !!dlg.revealText, dlg.revealText);
    // 既読の Hook より、未知の Reveal がはっきり大きいこと（1.6 倍以上）
    check(S, 'dialog_reveal_is_dominant',
      dlg.hookFont > 0 && dlg.revealFont >= dlg.hookFont * 1.6,
      { reveal: dlg.revealFont, hookEcho: dlg.hookFont });
    check(S, 'dialog_no_horizontal_overflow', dlg.overflowX);
    check(S, 'dialog_action_https_newtab', /^https:\/\//.test(dlg.actionHref || '') &&
      /noopener/.test(dlg.actionRel || ''), { href: dlg.actionHref, rel: dlg.actionRel });
    check(S, 'dialog_no_internal_term', !INTERNAL.some(w => dlg.text.includes(w)),
      INTERNAL.filter(w => dlg.text.includes(w)));
    check(S, 'dialog_focus_inside', /dialog-close|detail|official/.test(String(dlg.focus)), dlg.focus);
    // 開いたことは dialog 名（= Reveal）が伝える。status 側で重ねて読ませない。
    const announced = await page.$eval('#live', el => el.textContent.trim());
    check(S, 'open_is_not_announced_twice', announced === '', announced);
    const dlgAlt = await page.$eval('.detail-media img', i => (i.getAttribute('alt') || '').trim());
    check(S, 'detail_media_alt_present', dlgAlt.length >= 8, dlgAlt);
    check(S, 'detail_a11y_text_no_internal_term', !INTERNAL.some(w => dlgAlt.includes(w)), dlgAlt);

    const detailImg = await page.$eval('.detail-media img', i => ({
      w: i.naturalWidth, h: i.naturalHeight,
      boxW: Math.round(i.getBoundingClientRect().width), boxH: Math.round(i.getBoundingClientRect().height),
      fit: getComputedStyle(i).objectFit
    }));
    const dScale = detailImg.fit === 'contain' ? null : Math.max(detailImg.boxW / detailImg.w, detailImg.boxH / detailImg.h);
    const dVisible = dScale === null ? 1 :
      (detailImg.boxW / dScale * (detailImg.boxH / dScale)) / (detailImg.w * detailImg.h);
    check(S, 'detail_media_identity_kept', dVisible >= 0.75, { ...detailImg, visible: Number(dVisible.toFixed(3)) });

    if (WANT_SHOTS) await page.screenshot({ path: path.join(SHOT_DIR, `${S}-detail.png`), fullPage: false });

    // 2件目を開いたとき、前の Object のスクロール位置を引き継がないこと。
    // 引き継ぐと Real Media と Reveal を飛ばした途中から始まる。
    await page.evaluate(() => { const d = document.querySelector('.detail-dialog'); d.scrollTop = d.scrollHeight; });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.detail-dialog').open);
    await page.click('.object-card:nth-child(2) .open-button');
    await page.waitForSelector('.detail-dialog[open]');
    const reopened = await page.evaluate(() => {
      const d = document.querySelector('.detail-dialog');
      const m = d.querySelector('.detail-media').getBoundingClientRect();
      const r = d.querySelector('.detail-reveal').getBoundingClientRect();
      return { scrollTop: Math.round(d.scrollTop), mediaTop: Math.round(m.top), revealTop: Math.round(r.top),
        mediaAboveFold: m.top >= 0, revealAboveFold: r.top < window.innerHeight };
    });
    check(S, 'reopening_starts_from_the_top',
      reopened.scrollTop === 0 && reopened.mediaAboveFold && reopened.revealAboveFold, reopened);
    // dialog のスクロールが背面ページへ連鎖しないこと
    const chain = await page.evaluate(() => getComputedStyle(document.querySelector('.detail-dialog')).overscrollBehaviorY);
    check(S, 'dialog_scroll_does_not_chain', chain === 'contain', chain);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.detail-dialog').open);
    const afterEsc = await page.evaluate(() => ({
      open: document.querySelector('.detail-dialog').open,
      focus: document.activeElement && document.activeElement.className
    }));
    check(S, 'escape_closes', afterEsc.open === false);
    check(S, 'focus_returns_to_trigger', /open-button/.test(String(afterEsc.focus)), afterEsc.focus);

    // --- 8. keyboard だけで 1件目を開いて、読んで、閉じられる ---------------
    // 直前の検査で focus が残っているので、初見と同じ状態から測り直す。
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
    const tabPath = [];
    let reached = false;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const on = await page.evaluate(() => {
        const el = document.activeElement;
        return el === document.body ? 'body' : (el.className || el.tagName);
      });
      tabPath.push(on);
      if (/open-button/.test(String(on))) { reached = true; break; }
    }
    // 棚に置いてよい操作要素は skip-link と3つの「ひらく」だけ。
    // 1件目の「ひらく」までに 2 打鍵を超えるなら、余計なものが挟まっている。
    check(S, 'first_open_reachable_by_tab', reached && tabPath.length <= 2, tabPath);
    // dialog の中は閉じている間 focus できないので、棚側だけを数える。
    const allFocusable = await page.$$eval(
      'body > :not(dialog) a[href], body > :not(dialog) button, body > :not(dialog) [tabindex]:not([tabindex="-1"]), body > a[href]',
      els => els.map(e => e.className || e.tagName));
    check(S, 'shelf_has_only_the_intended_controls',
      allFocusable.length === 4 && allFocusable.filter(c => /open-button/.test(c)).length === 3,
      allFocusable);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.detail-dialog[open]', { timeout: 3000 })
      .then(() => check(S, 'enter_opens_detail', true))
      .catch(() => check(S, 'enter_opens_detail', false));
    // dialog の中を Tab で回っても背後の棚へ抜けないこと
    const trapped = await page.evaluate(async () => {
      const dlg = document.querySelector('.detail-dialog');
      return dlg.contains(document.activeElement);
    });
    check(S, 'focus_starts_inside_dialog', trapped);
    // showModal 中は背後が inert になる。Tab を回しても棚側の要素へは行かないこと。
    // （最後の要素の次で body / ブラウザ UI に抜けるのは native の挙動。）
    const escapedTo = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'body';
        const dlg = document.querySelector('.detail-dialog');
        return dlg.contains(el) ? 'dialog' : ('OUTSIDE:' + (el.className || el.tagName));
      });
      if (where.startsWith('OUTSIDE')) escapedTo.push(where);
    }
    check(S, 'focus_never_reaches_the_shelf_behind', escapedTo.length === 0, escapedTo);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.detail-dialog').open);
    const backOnTrigger = await page.evaluate(() =>
      /open-button/.test(String(document.activeElement && document.activeElement.className)));
    check(S, 'keyboard_path_returns_focus', backOnTrigger);

    // --- 9. 有限な終わりが存在する ---------------------------------------
    const ending = await page.$eval('.end-plate', el => el.innerText);
    check(S, 'finite_ending_present', /3つ/.test(ending), ending.replace(/\n/g, ' / '));

    // --- 10. storage / analytics / 外部通信 0 -----------------------------
    const storage = await page.evaluate(async () => ({
      ls: localStorage.length, ss: sessionStorage.length,
      cookie: document.cookie, violations: window.__violations,
      // Service Worker / Cache Storage も「端末に残る」経路。棚は何も残さない。
      swController: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      swRegistrations: navigator.serviceWorker
        ? (await navigator.serviceWorker.getRegistrations()).length : 0,
      cacheKeys: window.caches ? (await caches.keys()).length : 0,
      idb: typeof indexedDB !== 'undefined' && indexedDB.databases
        ? (await indexedDB.databases()).length : 0
    }));
    check(S, 'no_storage_written', storage.ls === 0 && storage.ss === 0 && storage.cookie === '', storage);
    check(S, 'no_service_worker_or_cache',
      !storage.swController && storage.swRegistrations === 0 && storage.cacheKeys === 0, storage);
    check(S, 'no_indexeddb_created', storage.idb === 0, storage.idb);
    check(S, 'no_fetch_xhr_beacon', storage.violations.length === 0, storage.violations);
    const external = requests.filter(u => !u.startsWith(base) && !u.startsWith('data:'));
    check(S, 'no_external_request', external.length === 0, external);
    // 一連の操作を通して JS エラーが出ていないこと（出ると Loop が黙って壊れる）
    check(S, 'no_page_error', pageErrors.length === 0, pageErrors);
    check(S, 'no_console_error', consoleErrors.length === 0, consoleErrors);

    if (WANT_SHOTS) {
      // fullPage capture は大きい画像を取りこぼすことがあり、参加者が見る絵と一致しない。
      // 実際にスクロールした viewport をそのまま撮る。
      // 直前の dialog / focus 検査でページが動いているので、必ず先頭へ戻してから撮る。
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(SHOT_DIR, `${S}-fold.png`), fullPage: false });
      for (let i = 2; i <= 3; i++) {
        await page.evaluate(n => document.querySelector(`.object-card:nth-child(${n})`)
          .scrollIntoView({ block: 'center', behavior: 'instant' }), i);
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(SHOT_DIR, `${S}-object${i}.png`), fullPage: false });
      }
      await page.evaluate(() => document.querySelector('.end-plate').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(SHOT_DIR, `${S}-end.png`), fullPage: false });
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await ctx.close();
  }

  // --- 11. どの Object が1件目に来ても First Pull が成立する ---------------
  // order permutation で1件目が入れ替わるので、3 通りすべてで
  // 「Real Media + Hook 全文 + ひらく」が1画面目に収まることを確認する。
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile, hasTouch: vp.mobile, reducedMotion: 'reduce'
    });
    const page = await ctx.newPage();
    for (const order of ['abc', 'bac', 'cab']) {
      await page.goto(`${base}index.html?order=${order}`, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
      await page.waitForFunction(() => Array.from(document.images).every(i => i.complete));
      const fold = await page.evaluate(() => {
        const vh = window.innerHeight;
        const vis = r => Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        const card = document.querySelector('.object-card');
        const img = card.querySelector('img');
        const hook = card.querySelector('.object-hook');
        const btn = card.querySelector('.open-button');
        const ir = img.getBoundingClientRect(), hr = hook.getBoundingClientRect(), br = btn.getBoundingClientRect();
        return {
          id: card.dataset.objectId,
          mediaVisibleRatio: Number((vis(ir) / ir.height).toFixed(2)),
          hookFullyVisible: vis(hr) >= hr.height - 1,
          openAffordanceVisible: vis(br) >= br.height - 1,
          openBottom: Math.round(br.bottom), vh
        };
      });
      check(`${vp.name}/${order}`, 'first_pull_complete_in_fold',
        fold.mediaVisibleRatio >= 0.34 && fold.hookFullyVisible && fold.openAffordanceVisible, fold);
    }
    await ctx.close();
  }

  // --- 12. 期限切れの事実を参加者へ出さない（fail-closed） ------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();

    // 参加者モードは通常どおり 3 件出る
    await page.goto(`${base}index.html?participant=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3, null, { timeout: 5000 })
      .then(() => check('freshness', 'participant_mode_renders_when_fresh', true))
      .catch(() => check('freshness', 'participant_mode_renders_when_fresh', false));

    // 期限を過ぎた時計では、古い営業情報を出さずに止まる
    const page2 = await ctx.newPage();
    await page2.addInitScript(() => {
      const SHIFT = 400 * 24 * 60 * 60 * 1000;
      const RealDate = Date;
      const now = () => RealDate.now() + SHIFT;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...a) { super(...(a.length ? a : [now()])); }
        static now() { return now(); }
      };
      Date.parse = RealDate.parse;
      Date.UTC = RealDate.UTC;
    });
    await page2.goto(`${base}index.html?participant=1`, { waitUntil: 'load' });
    const stale = await page2.evaluate(() => ({
      cards: document.querySelectorAll('.object-card').length,
      gridText: document.getElementById('objectGrid').textContent,
      endHidden: document.querySelector('.end-plate').hidden
    }));
    check('freshness', 'expired_facts_block_participant_cycle',
      stale.cards === 0 && stale.endHidden === true, stale);
    // Real Media が1枚でも配信されなければ、灰色の枠を並べたまま続けない
    const page3 = await ctx.newPage();
    await page3.route('**/assets/hachiko.jpg', route => route.abort());
    await page3.goto(`${base}index.html?participant=1`, { waitUntil: 'load' });
    await page3.waitForTimeout(500);
    const broken = await page3.evaluate(() => ({
      cards: document.querySelectorAll('.object-card').length,
      gridText: document.getElementById('objectGrid').textContent,
      endHidden: document.querySelector('.end-plate').hidden
    }));
    check('freshness', 'missing_media_blocks_participant_cycle',
      broken.cards === 0 && broken.endHidden === true, broken);

    // 止めた画面にも内部語・監査文を出さない
    const haltText = await page2.evaluate(() => document.body.innerText);
    check('freshness', 'halt_screen_has_no_internal_term',
      !INTERNAL.some(w => haltText.includes(w)) && !SPOILERS.some(w => haltText.includes(w)),
      haltText.replace(/\n/g, ' / ').slice(0, 160));
    await ctx.close();
  }

  // --- 13. 極端な環境でも壊れないこと -------------------------------------
  // First Pull の fold 条件はここでは課さない（横向きや 200% 拡大では
  // スクロールが前提になる）。守るのは「壊れない・届く・漏れない」だけ。
  {
    const RESILIENCE = [
      { name: 'landscape-390h', viewport: { width: 844, height: 390 }, zoom: 1, forcedColors: 'none' },
      { name: 'zoom200-m390', viewport: { width: 390, height: 844 }, zoom: 2, forcedColors: 'none' },
      { name: 'zoom200-d1440', viewport: { width: 1440, height: 1000 }, zoom: 2, forcedColors: 'none' },
      { name: 'forced-colors', viewport: { width: 390, height: 844 }, zoom: 1, forcedColors: 'active' },
      // ブラウザの既定文字サイズを大きくしている利用者（page zoom とは別の設定）
      { name: 'rootfont-20px', viewport: { width: 390, height: 844 }, zoom: 1, forcedColors: 'none', rootFontSize: '20px' },
      { name: 'rootfont-24px', viewport: { width: 390, height: 844 }, zoom: 1, forcedColors: 'none', rootFontSize: '24px' }
    ];
    for (const r of RESILIENCE) {
      const ctx = await browser.newContext({
        viewport: r.viewport, reducedMotion: 'reduce', forcedColors: r.forcedColors
      });
      const page = await ctx.newPage();
      await page.goto(base + 'index.html', { waitUntil: 'load' });
      if (r.zoom > 1) await page.evaluate(z => { document.documentElement.style.zoom = z; }, r.zoom);
      if (r.rootFontSize) await page.evaluate(f => { document.documentElement.style.fontSize = f; }, r.rootFontSize);
      await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
      await page.waitForFunction(() => Array.from(document.images).every(i => i.complete && i.naturalWidth > 0));
      await page.waitForTimeout(200);

      const state = await page.evaluate(() => {
        const doc = document.documentElement;
        const wide = [];
        document.querySelectorAll('body *').forEach(el => {
          if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
          const b = el.getBoundingClientRect();
          if (b.width > 0 && b.right > doc.clientWidth + 1) wide.push(el.className || el.tagName);
        });
        const btn = document.querySelector('.open-button');
        const cs = getComputedStyle(btn);
        return {
          overflow: doc.scrollWidth > doc.clientWidth + 1, wide: wide.slice(0, 5),
          text: document.body.innerText,
          btnHeight: Math.round(btn.getBoundingClientRect().height),
          btnBorder: cs.borderTopWidth,
          btnBackground: cs.backgroundColor,
          btnColor: cs.color
        };
      });
      // 背景色が捨てられる環境では、輪郭が無いと「ひらく」がただの文字になる。
      // その環境では border を必須にする（背景色の有無では判定できない）。
      const btnReadsAsControl = r.forcedColors === 'active'
        ? parseFloat(state.btnBorder) >= 1
        : !['rgba(0, 0, 0, 0)', 'transparent'].includes(state.btnBackground);
      check(r.name, 'no_horizontal_overflow', !state.overflow, state.wide);
      check(r.name, 'list_no_spoiler', !SPOILERS.some(w => state.text.includes(w)),
        SPOILERS.filter(w => state.text.includes(w)));
      check(r.name, 'open_control_stays_visible_as_a_control',
        btnReadsAsControl && state.btnHeight >= 40,
        { height: state.btnHeight, border: state.btnBorder, background: state.btnBackground });
      // 既定文字サイズを上げている利用者では、本文まわりが実際に大きくなること。
      // 見出し系は clamp(_, vw, _) で card 幅に追従させているので対象にしない。
      if (r.rootFontSize) {
        const scaled = await page.evaluate(() => {
          const px = sel => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
          return { footer: px('.privacy-note'), kicker: px('.hero-kicker'), label: px('.pilot-label') };
        });
        const factor = parseFloat(r.rootFontSize) / 16;
        check(r.name, 'text_scales_with_browser_font_setting',
          scaled.footer > 12 * factor * 0.95 && scaled.kicker > 11 * factor * 0.95 &&
          scaled.label > 10 * factor * 0.95,
          { ...scaled, factor });
      }

      await page.click('.object-card:nth-child(3) .open-button');
      await page.waitForSelector('.detail-dialog[open]');
      const dlg = await page.evaluate(() => {
        const d = document.querySelector('.detail-dialog');
        return {
          overflowX: d.scrollWidth <= d.clientWidth + 1,
          reveal: !!d.querySelector('.detail-reveal'),
          action: d.querySelector('.official-action').getAttribute('href')
        };
      });
      check(r.name, 'dialog_reachable_and_intact',
        dlg.overflowX && dlg.reveal && /^https:/.test(dlg.action || ''), dlg);
      await page.keyboard.press('Escape');
      const closed = await page.evaluate(() => !document.querySelector('.detail-dialog').open);
      check(r.name, 'escape_closes', closed);
      await ctx.close();
    }
  }

  // --- 14. JS が動かない環境で、終わりだけが残らないこと --------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    const text = await page.innerText('body');
    check('no-js', 'explains_itself_without_js', /JavaScript/.test(text), text.replace(/\n/g, ' / ').slice(0, 120));
    check('no-js', 'no_false_ending_without_js', !/見終わりました/.test(text));
    check('no-js', 'no_spoiler_without_js', !SPOILERS.some(w => text.includes(w)),
      SPOILERS.filter(w => text.includes(w)));
    await ctx.close();
  }

  // --- 15. 6 通りの order が同じ 3 identity を保つ ------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    const sets = {};
    for (const order of ['abc', 'acb', 'bac', 'bca', 'cab', 'cba']) {
      await page.goto(`${base}index.html?order=${order}`, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelectorAll('.object-card').length === 3);
      sets[order] = await page.$$eval('.object-card', els => els.map(e => e.dataset.objectId));
    }
    const canon = [...sets.abc].sort().join(',');
    check('order', 'all_six_orders_same_identities',
      Object.values(sets).every(v => [...v].sort().join(',') === canon && v.length === 3), sets);
    await ctx.close();
  }

  await browser.close();
  server.close();

  const failed = results.filter(r => !r.pass);
  const report = {
    generated_at: new Date().toISOString(),
    viewports: VIEWPORTS.map(v => `${v.width}x${v.height}`),
    total: results.length,
    failed: failed.length,
    verdict: failed.length ? 'BROWSER_QA_FAIL' : 'BROWSER_QA_GO',
    results
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(report.verdict, `(${results.length - failed.length}/${results.length})`);
  failed.forEach(f => console.error('- FAIL', f.scope, f.name, JSON.stringify(f.detail)));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('BROWSER_QA_ERROR', e); process.exit(2); });
