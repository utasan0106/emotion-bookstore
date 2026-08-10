/* GA4 / Network / Privacy QA（本番 root 上・READ-ONLY 検証）
 * ・production-host guard（非本番ホストからのヒット 0 / GA4タグ自体を読み込まない）
 * ・重複イベント 0（page_view・view_landing は各1回、view_shelf は同一遷移で重複しない）
 * ・本文 / 題名 / 具体的な感情ID / 自由記述パラメータの送信 0
 * ・利用者コンテンツの意図しない外部送信 0（通信先は既知の宛先のみ）
 *
 * 実行:  node tests/smoke_test_ga4_privacy_network.js
 * 依存:  playwright-core。Chromium の場所は CHROMIUM_PATH で上書きできる。
 *        本番ホスト判定は hostname 完全一致のため、file:// では常に非本番になる。
 *        本番相当の検証では window.__IS_ANALYTICS_PRODUCTION_HOST__ だけを
 *        書き換え不可で先に立て、main.js 側のガードが正しく効くかを見る。 */
const { chromium } = require('playwright-core');
const ROOT = require('path').resolve(__dirname, '..');
const R = []; let fails = 0;
const chk = (id, ok, d) => { R.push((ok ? 'PASS ' : 'FAIL ') + id + (d ? '  ' + d : '')); if (!ok) fails++; };

const SECRETS = {
  story: 'ヒミツノホンブンXYZ',
  title: 'ヒミツノダイメイXYZ',
  note: 'ヒミツノシオリXYZ'
};

/* gtag と fetch / sendBeacon / Image を捕まえる。実際の送信はさせない。 */
const SPY = () => {
  const s = { ga: [], net: [], beacon: [] };
  window.__spy = s;
  window.gtag = function () { s.ga.push(Array.prototype.slice.call(arguments)); };
  const oF = window.fetch;
  window.fetch = function (u, o) { s.net.push({ u: String(u), body: o && o.body ? String(o.body) : '' }); return oF.apply(this, arguments); };
  if (navigator.sendBeacon) {
    navigator.sendBeacon = function (u, d) { s.beacon.push({ u: String(u), d: String(d || '') }); return true; };
  }
  return 'ok';
};

async function boot(browser, hostProd) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  /* 本番ホスト判定は hostname 完全一致。file:// では常に非本番になるため、
     本番相当の検証では index.html 側のフラグだけを本番と同じ値にして
     main.js のガードが正しく効くかを見る（実ホストは変えない）。 */
  await ctx.addInitScript((prod) => {
    const s = { ga: [], net: [], beacon: [] };
    window.__spy = s;
    /* index.html / main.js より前に仕掛ける。本番判定は書き換え不可にして
       index.html 側の代入（非strict）を無効化し、実際の初回ロードから数える。 */
    if (prod) {
      Object.defineProperty(window, '__IS_ANALYTICS_PRODUCTION_HOST__', {
        value: true, writable: false, configurable: false
      });
    }
    /* index.html は top-level で function gtag(){dataLayer.push(arguments)} を宣言するため、
       事前に仕込んだ window.gtag は上書きされる。実際の送信経路である dataLayer を
       あらかじめ用意して、そこへ積まれた内容を計測結果として読む。 */
    window.dataLayer = [];
    const oF = window.fetch;
    window.fetch = function (u, o) {
      s.net.push({ u: String(u), body: o && o.body ? String(o.body) : '' });
      return oF.apply(this, arguments);
    };
    if (navigator.sendBeacon) {
      navigator.sendBeacon = function (u, d) { s.beacon.push({ u: String(u), d: String(d || '') }); return true; };
    }
  }, hostProd);
  await p.goto(`file://${ROOT}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  return { ctx, p, errs };
}

/* dataLayer に積まれた arguments 相当のオブジェクトを配列へ正規化する */
const readGa = p => p.evaluate(() => (window.dataLayer || []).map(a => {
  try { return Array.prototype.slice.call(a); } catch (e) { return [String(a)]; }
}));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  /* ---- 非本番ホスト：ヒット 0 ---- */
  {
    const { ctx, p, errs } = await boot(b, false);
    await p.evaluate(() => { try { enterBookExperience(); } catch (e) {} });
    await p.waitForTimeout(800);
    const ga = await readGa(p);
    const tagLoaded = await p.evaluate(() =>
      !!document.querySelector('script[src*="googletagmanager.com"]'));
    chk('GUARD-1 非本番ホストで gtag イベント送信 0', ga.length === 0, 'n=' + ga.length);
    chk('GUARD-2 非本番ホストで GA4 タグを読み込まない', tagLoaded === false);
    chk('GUARD-3 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---- 本番相当：許可イベントのみ・重複 0・利用者コンテンツ 0 ---- */
  {
    const { ctx, p, errs } = await boot(b, true);

    /* 実際の利用に近い一巡：入店 → 書く → 製本 → 棚を見る */
    await p.evaluate((S) => {
      try { enterBookExperience(); } catch (e) {}
      const story = document.getElementById('storyInput');
      if (story) { story.value = S.story; story.dispatchEvent(new Event('input', { bubbles: true })); }
      const title = document.getElementById('titleInput');
      if (title) { title.value = S.title; title.dispatchEvent(new Event('input', { bubbles: true })); }
    }, SECRETS);
    await p.waitForTimeout(600);
    await p.evaluate(() => { try { goToPage('shelves'); } catch (e) {} });
    await p.waitForTimeout(400);
    await p.evaluate(() => { try { goToPage('shelves'); } catch (e) {} });
    await p.waitForTimeout(400);
    await p.evaluate(() => { try { goToShelf('kodoku'); } catch (e) {} });
    await p.waitForTimeout(400);
    await p.evaluate(() => { try { goToShelf('kodoku'); } catch (e) {} });
    await p.waitForTimeout(600);

    const ga = await readGa(p);
    const net = await p.evaluate(() => window.__spy.net);
    const beacon = await p.evaluate(() => window.__spy.beacon);
    const allowed = ['page_view', 'view_landing', 'start_writing', 'create_book_success',
      'create_book_error', 'create_book_validation_error', 'view_shelf'];

    const names = ga.filter(a => a[0] === 'event').map(a => a[1]);
    const unknown = names.filter(n => allowed.indexOf(n) === -1);
    chk('EV-1 許可リスト外のイベント 0', unknown.length === 0, unknown.join(','));

    const dup = {};
    names.forEach(n => { dup[n] = (dup[n] || 0) + 1; });
    const dupPV = (dup['page_view'] || 0) === 1;
    const dupVL = (dup['view_landing'] || 0) === 1;
    const dupSW = (dup['start_writing'] || 0) <= 1;
    const dupVS = (dup['view_shelf'] || 0) <= 2; // shelves 一覧 + 個別棚（各1回まで）
    chk('EV-2 page_view 重複 0', dupPV, 'n=' + (dup['page_view'] || 0));
    chk('EV-3 view_landing 重複 0', dupVL, 'n=' + (dup['view_landing'] || 0));
    chk('EV-4 start_writing 重複 0', dupSW, 'n=' + (dup['start_writing'] || 0));
    chk('EV-5 view_shelf 同一遷移の重複 0', dupVS, 'n=' + (dup['view_shelf'] || 0) + ' ' + JSON.stringify(names));

    const blob = JSON.stringify(ga);
    chk('PRIV-1 本文を送信していない', blob.indexOf(SECRETS.story) === -1);
    chk('PRIV-2 題名を送信していない', blob.indexOf(SECRETS.title) === -1);
    chk('PRIV-3 具体的な感情ID（棚ID）を送信していない',
      blob.indexOf('kodoku') === -1, blob.slice(0, 400));
    /* 送信され得るのは固定の許可値のみ */
    const params = ga.filter(a => a[0] === 'event' && a[2]).map(a => JSON.stringify(a[2]));
    chk('PRIV-4 イベントパラメータは固定許可値のみ',
      params.every(x => /^\{"reason":"(save_failed|readback_failed|shelf_render_failed|unhandled_exception|empty_story|story_too_long|invalid_tweet_url)"\}$/.test(x)),
      params.join(' '));

    const netBlob = JSON.stringify(net) + JSON.stringify(beacon);
    chk('NET-1 外部リクエストへ本文が混入していない', netBlob.indexOf(SECRETS.story) === -1);
    chk('NET-2 外部リクエストへ題名が混入していない', netBlob.indexOf(SECRETS.title) === -1);
    const hosts = [...new Set(net.map(x => { try { return new URL(x.u, 'https://x/').host; } catch (e) { return x.u; } }))];
    chk('NET-3 通信先は既知の宛先のみ',
      hosts.every(h => /^(www\.googleapis\.com|itunes\.apple\.com|api\.open-meteo\.com|x|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(h)),
      hosts.join(','));
    chk('EV-6 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  await b.close();
  console.log(R.join('\n'));
  console.log(fails === 0 ? `\n==== ALL PASS / ${R.length} checks ====` : `\n==== ${fails} FAIL / ${R.length} checks ====`);
})();
