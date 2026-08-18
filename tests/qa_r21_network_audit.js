/* =============================================================================
 * V2 Beta0 — Round 2.1 ネットワーク実測監査
 * -----------------------------------------------------------------------------
 * 目的（FIX-09 の Source of Truth）
 *   V2 mount 済みの実 runtime を一周し、実際に発生する外部通信だけを列挙する。
 *   「外部の検索サービスへ問い合わせている」等の Menu 記述が現在の実装事実と
 *   一致しているかを、記憶や旧仕様書ではなく実測で判定する。
 *
 * 何も変更しない（読み取りと記録のみ）。本文・題名は入力するが保存はしない。
 * 使い方: node tests/qa_r21_network_audit.js
 * ========================================================================== */
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const SECRET_STORY = 'ヒミツノホンブンZZQ';
const SECRET_TITLE = 'ヒミツノダイメイZZQ';

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const origin = new URL(base).origin;
  const browser = await chromium.launch();
  const { ctx, page } = await L.openPage(browser, { width: 390, height: 844, theme: 'day', lang: 'ja' });

  const requests = [];
  page.on('request', r => {
    requests.push({ url: r.url(), method: r.method(), type: r.resourceType(), post: (r.postData() || '').slice(0, 400) });
  });
  // fetch / XHR / sendBeacon を JS 側でも捕捉する（ブロックされた宛先も記録するため）
  await page.addInitScript(`(() => {
    window.__netspy = [];
    const of = window.fetch;
    window.fetch = function (u, o) { window.__netspy.push({ kind: 'fetch', u: String(u && u.url ? u.url : u) }); return of.apply(this, arguments); };
    const ox = window.XMLHttpRequest && window.XMLHttpRequest.prototype.open;
    if (ox) window.XMLHttpRequest.prototype.open = function (m, u) { window.__netspy.push({ kind: 'xhr', u: String(u) }); return ox.apply(this, arguments); };
    if (navigator.sendBeacon) {
      const ob = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (u, d) { window.__netspy.push({ kind: 'beacon', u: String(u), d: String(d || '').slice(0, 200) }); return ob(u, d); };
    }
  })()`);

  await L.boot(page, base);
  await page.waitForTimeout(1200);

  // 01 → 02 → 03 → 04（全8棚）→ 05（入力）→ 06 → メニュー
  await L.enterStore(page);
  await L.go(page, '03');
  for (const sh of L.SHELVES) {
    await L.go(page, '03');
    await L.openShelf(page, sh);
  }
  await L.go(page, '02');
  await L.go(page, '05');
  await page.fill('#v2bTitleInput', SECRET_TITLE).catch(() => {});
  await page.fill('#v2bStoryInput', SECRET_STORY).catch(() => {});
  await page.waitForTimeout(900);
  await L.go(page, '02');
  await L.go(page, 'bookshelf').catch(() => {});
  await L.openMenu(page);
  await page.click('#aboutAccordionBtn').catch(() => {});
  await page.waitForTimeout(300);
  await page.click('#samplePeekBtn').catch(() => {});
  await page.waitForTimeout(300);
  await page.click('.about-data-accordion summary').catch(() => {});
  await page.waitForTimeout(1500);

  const spy = await page.evaluate('window.__netspy || []');
  const ga = await page.evaluate(`(() => {
    try { return (window.dataLayer || []).map(a => Array.prototype.slice.call(a)); } catch (e) { return []; } })()`);
  const flags = await page.evaluate(`({
    v2Mounted: document.documentElement.getAttribute('data-v2-mounted'),
    prodHost: window.__IS_ANALYTICS_PRODUCTION_HOST__ === true,
    hasGtagScript: !!document.querySelector('script[src*="googletagmanager"]')
  })`);

  /* FIX-09 が Menu 文言で断定する内容を、実 runtime 側でも確かめる */
  const facts = await page.evaluate(`(async () => {
    const hittable = sel => {
      const e = document.querySelector(sel);
      if (!e) return 'なし';
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || !r.width || !r.height) return '存在するが不可視';
      if (cs.pointerEvents === 'none') return '存在するが操作不可';
      return '到達可能';
    };
    let idbStores = [];
    try {
      const dbs = (indexedDB.databases ? await indexedDB.databases() : []);
      idbStores = dbs.map(d => d.name);
    } catch (e) { idbStores = ['(取得不可)']; }
    const lsKeys = Object.keys(localStorage);
    return {
      アカウントUI: hittable('#loginBtn, #signupBtn, [data-auth]'),
      気持ちを手放す導線: hittable('.purify-trigger'),
      バックアップ保存: hittable('#experienceMenu [data-v2-legacy-click="backupBtn"]'),
      テキスト書き出し: hittable('#experienceMenu [data-v2-legacy-click="exportDiary"]'),
      バックアップから復元: hittable('#experienceMenu [data-v2-legacy-click="restoreBtn"]'),
      IndexedDB名: idbStores,
      localStorageキー数: lsKeys.length,
      下書きキーの例: lsKeys.filter(k => /emotion-bookstore/.test(k)).slice(0, 6),
      天気連動の既定: (document.getElementById('weatherToggle') || {}).textContent || '(なし)'
    };
  })()`);

  await ctx.close(); await browser.close(); srv.close();

  const external = requests.filter(r => !r.url.startsWith(origin) && !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
  const hosts = {};
  for (const r of external) {
    const h = (() => { try { return new URL(r.url).host; } catch (e) { return r.url.slice(0, 40); } })();
    hosts[h] = (hosts[h] || 0) + 1;
  }

  console.log('=== V2 mount / GA4 flags ===');
  console.log(JSON.stringify(flags, null, 1));
  console.log('\n=== 実際に発生した外部ホスト（同一オリジン以外）===');
  console.log(Object.keys(hosts).length ? JSON.stringify(hosts, null, 1) : '  (なし — 外部ホストへのリクエスト 0)');
  console.log('\n=== fetch / XHR / sendBeacon の記録 ===');
  const spyExt = spy.filter(s => !String(s.u).startsWith('/') && !String(s.u).startsWith(origin));
  console.log(spyExt.length ? JSON.stringify(spyExt, null, 1) : '  (なし)');
  console.log('\n=== dataLayer（GA4）に積まれた件数 ===');
  console.log('  ' + ga.length + (ga.length ? '  ' + JSON.stringify(ga.map(a => a[0] + ':' + (a[1] || ''))) : ''));

  const leak = requests.filter(r => (r.url + r.post).includes(SECRET_STORY) || (r.url + r.post).includes(SECRET_TITLE));
  console.log('\n=== 本文/題名の外部送信 ===');
  console.log('  ' + (leak.length ? 'LEAK! ' + JSON.stringify(leak.slice(0, 3)) : '0 件（本文・題名はどのリクエストにも含まれない）'));

  console.log('\n=== 判定 ===');
  // 検索 API は www.googleapis.com/books と itunes.apple.com。
  // fonts.googleapis.com は Web フォント配信なので検索 API と混同しない。
  const searchApi = Object.keys(hosts).filter(h => /^www\.googleapis\.com$/.test(h) || /itunes\.apple\.com/.test(h));
  const fontHosts = Object.keys(hosts).filter(h => /^fonts\.(googleapis|gstatic)\.com$/.test(h));
  console.log('  外部検索サービス（www.googleapis.com/books, itunes.apple.com）: ' +
    (searchApi.length ? 'あり ' + searchApi.join(',') : 'なし'));
  console.log('  Web フォント配信（fonts.googleapis.com / fonts.gstatic.com）: ' +
    (fontHosts.length ? 'あり ' + fontHosts.join(',') : 'なし'));
  console.log('  天気サービス（api.open-meteo.com）: ' +
    (Object.keys(hosts).some(h => /open-meteo/.test(h)) ? 'あり' : 'なし（既定オフ）'));
  console.log('  GA4 タグ読み込み: ' + (flags.hasGtagScript ? 'あり' : 'なし（このホストは非本番のためガードが効いている）'));

  console.log('\n=== FIX-09 実装事実の確認 ===');
  for (const [k, v] of Object.entries(facts)) console.log('  ' + k + ': ' + JSON.stringify(v));
})().catch(e => { console.error(e); process.exit(2); });
