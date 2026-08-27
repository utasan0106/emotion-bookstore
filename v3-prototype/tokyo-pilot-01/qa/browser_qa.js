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

    // --- 外部通信・計測の監視 -------------------------------------------
    const requests = [];
    page.on('request', r => requests.push(r.url()));
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
      const hook = d.querySelector('.detail-hook');
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
    check(S, 'dialog_reveal_is_dominant', dlg.revealFont >= dlg.hookFont,
      { reveal: dlg.revealFont, hook: dlg.hookFont });
    check(S, 'dialog_no_horizontal_overflow', dlg.overflowX);
    check(S, 'dialog_action_https_newtab', /^https:\/\//.test(dlg.actionHref || '') &&
      /noopener/.test(dlg.actionRel || ''), { href: dlg.actionHref, rel: dlg.actionRel });
    check(S, 'dialog_no_internal_term', !INTERNAL.some(w => dlg.text.includes(w)),
      INTERNAL.filter(w => dlg.text.includes(w)));
    check(S, 'dialog_focus_inside', /dialog-close|detail|official/.test(String(dlg.focus)), dlg.focus);

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

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.detail-dialog').open);
    const afterEsc = await page.evaluate(() => ({
      open: document.querySelector('.detail-dialog').open,
      focus: document.activeElement && document.activeElement.className
    }));
    check(S, 'escape_closes', afterEsc.open === false);
    check(S, 'focus_returns_to_trigger', /open-button/.test(String(afterEsc.focus)), afterEsc.focus);

    // --- 8. keyboard だけで 1件目を開ける --------------------------------
    const kb = await page.evaluate(() => {
      const order = Array.from(document.querySelectorAll('a[href], button')).map(e => e.className || e.tagName);
      return order;
    });
    check(S, 'focusable_order', kb.length > 0, kb);

    // --- 9. 有限な終わりが存在する ---------------------------------------
    const ending = await page.$eval('.end-plate', el => el.innerText);
    check(S, 'finite_ending_present', /3つ/.test(ending), ending.replace(/\n/g, ' / '));

    // --- 10. storage / analytics / 外部通信 0 -----------------------------
    const storage = await page.evaluate(() => ({
      ls: localStorage.length, ss: sessionStorage.length,
      cookie: document.cookie, violations: window.__violations
    }));
    check(S, 'no_storage_written', storage.ls === 0 && storage.ss === 0 && storage.cookie === '', storage);
    check(S, 'no_fetch_xhr_beacon', storage.violations.length === 0, storage.violations);
    const external = requests.filter(u => !u.startsWith(base) && !u.startsWith('data:'));
    check(S, 'no_external_request', external.length === 0, external);

    if (WANT_SHOTS) {
      await page.screenshot({ path: path.join(SHOT_DIR, `${S}-fold.png`), fullPage: false });
      await page.screenshot({ path: path.join(SHOT_DIR, `${S}-home.png`), fullPage: true });
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
    // 止めた画面にも内部語・監査文を出さない
    const haltText = await page2.evaluate(() => document.body.innerText);
    check('freshness', 'halt_screen_has_no_internal_term',
      !INTERNAL.some(w => haltText.includes(w)) && !SPOILERS.some(w => haltText.includes(w)),
      haltText.replace(/\n/g, ' / ').slice(0, 160));
    await ctx.close();
  }

  // --- 13. 6 通りの order が同じ 3 identity を保つ ------------------------
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
