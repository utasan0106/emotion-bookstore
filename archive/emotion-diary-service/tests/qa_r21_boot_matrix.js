/* =============================================================================
 * V2 Beta0 — Round 2.1 / FIX-11 初回表示マトリクス
 * -----------------------------------------------------------------------------
 * URL 直接入力 / hard reload / normal reload / 新規タブからの直アクセス を
 * 320・390・430・1024・1440 × DAY/NIGHT × JA/EN で回し、
 * V2 が mount するまでのあいだ旧UIが 1 フレームも見えないことを確認する。
 *
 * 判定は v2-mount.css が mount 後に隠す集合とまったく同じ条件で行う
 *   .entrance.hero > *:not(.v2-page) / #counter|#shelves|#desk|#bookshelf > *:not(.v2-page)
 *   / .experience-bar / .page-nav / .doma / .shop-footer
 *
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21_boot_matrix.js [--throttle] [--quick]
 * ========================================================================== */
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const THROTTLE = process.argv.includes('--throttle');
const QUICK = process.argv.includes('--quick');
/* 起動経路（直接入力 / reload 系 / 新規タブ）の違いを見るのが目的で、boot 状態は
   viewport / theme / lang に依存しないため、全 20 通りは「直接入力」で網羅し、
   reload 系まで含む 4 モードは下の代表組み合わせで回す。 */
const FULL_MODES = ['320-day-ja', '390-day-ja', '1440-day-ja', '390-night-ja', '390-day-en'];

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}

const PROBE = `(() => {
  window.__paintLog = [];
  window.__mountAt = null;
  window.__fp = null;
  window.__atPaint = null;
  const LEGACY = ['.entrance.hero > *:not(.v2-page)', '#counter > *:not(.v2-page)',
                  '#shelves > *:not(.v2-page)', '#desk > *:not(.v2-page)',
                  '#bookshelf > *:not(.v2-page)',
                  '.experience-bar', '.page-nav', '.doma', '.shop-footer'];
  function legacyVisible() {
    const out = [];
    for (const sel of LEGACY) {
      for (const el of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        if (r.width <= 8 || r.height <= 8 || r.bottom <= 0 || r.top >= innerHeight) continue;
        out.push((el.id ? '#' + el.id : el.tagName.toLowerCase()));
        if (out.length > 8) return out;
      }
    }
    return out;
  }
  function mounted() {
    const de = document.documentElement;
    return !!de && de.getAttribute('data-v2-mounted') === 'true';
  }
  window.__legacyVisible = legacyVisible;
  try {
    new MutationObserver(() => {
      if (window.__mountAt === null && mounted()) window.__mountAt = performance.now();
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-v2-mounted'] });
  } catch (e) {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.name === 'first-paint' && window.__fp === null) {
          window.__fp = e.startTime;
          window.__atPaint = { t: e.startTime, mounted: mounted(), legacy: legacyVisible() };
        }
      }
    }).observe({ type: 'paint', buffered: true });
  } catch (e) {}
  try {
    (function tick() {
      window.__paintLog.push({ t: performance.now(), mounted: mounted(), legacy: legacyVisible() });
      if (window.__paintLog.length < 900) requestAnimationFrame(tick);
    })();
  } catch (e) {}
})()`;

const READ = `({
  paintLog: window.__paintLog || [], mountAt: window.__mountAt,
  fp: window.__fp, atPaint: window.__atPaint,
  mountedNow: document.documentElement.getAttribute('data-v2-mounted'),
  bootingNow: document.documentElement.getAttribute('data-v2-booting'),
  lang: (typeof currentLang === 'function' ? currentLang() : null)
})`;

async function settle(page) {
  await page.waitForSelector('html[data-v2-mounted="true"]', { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(900);
}

function verdict(tag, log) {
  const pre = log.paintLog.filter(p => !p.mounted);
  const preLegacy = pre.filter(p => p.legacy.length > 0);
  console.log(`  [${tag}] fp=${log.fp === null ? 'n/a' : Math.round(log.fp)} mount=${log.mountAt === null ? 'n/a' : Math.round(log.mountAt)} ` +
    `mount前フレーム=${pre.length} legacy可視=${preLegacy.length} lang=${log.lang} booting=${log.bootingNow}`);
  check(`[${tag}] 計測が空振りでない（mount 済み・first paint 記録あり）`,
    log.mountedNow === 'true' && log.atPaint !== null,
    `mounted=${log.mountedNow} atPaint=${JSON.stringify(log.atPaint)}`);
  check(`[${tag}] first paint で legacy UI が可視でない`,
    !!log.atPaint && log.atPaint.legacy.length === 0,
    log.atPaint ? log.atPaint.legacy.join(',') : 'n/a');
  check(`[${tag}] mount 前のどのフレームでも legacy UI が可視でない`,
    preLegacy.length === 0, preLegacy.slice(0, 1).map(p => Math.round(p.t) + 'ms ' + p.legacy.join(',')).join(''));
  check(`[${tag}] mount 後に boot 状態が残っていない`, log.bootingNow === null, 'booting=' + log.bootingNow);
}

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  const VPS = QUICK ? [{ width: 390, height: 844, label: '390' }] : [...L.MOBILE, ...L.DESKTOP];
  const THEMES = QUICK ? ['day'] : ['day', 'night'];
  const LANGS = QUICK ? ['ja'] : ['ja', 'en'];
  /* R21_ONLY で組み合わせを絞れる（例: R21_ONLY=1024-day-ja,1440-day-ja） */
  const ONLY = process.env.R21_ONLY ? process.env.R21_ONLY.split(',') : null;

  console.log(`=== FIX-11 初回表示マトリクス${THROTTLE ? '（400kbps / 150ms 遅延）' : ''} ===\n`);

  for (const theme of THEMES) {
    for (const lang of LANGS) {
      for (const vp of VPS) {
        if (ONLY && ONLY.indexOf(`${vp.label}-${theme}-${lang}`) === -1) continue;
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        await ctx.addInitScript(L.clockInit(theme === 'night' ? 22 : 12));
        await ctx.addInitScript(PROBE);
        const page = await ctx.newPage();
        const cdp = await ctx.newCDPSession(page);
        if (THROTTLE) {
          await cdp.send('Network.enable');
          await cdp.send('Network.emulateNetworkConditions', {
            offline: false, latency: 150,
            downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8
          });
        }

        /* (1) URL 直接入力（about:blank から。遷移前ページの snapshot を持たない） */
        await page.goto(base, { waitUntil: 'load', timeout: 120000 });
        await settle(page);
        if (lang === 'en') { await L.ensureLang(page, 'en'); }
        verdict(`${vp.label}-${theme}-${lang}/直接入力`, await page.evaluate(READ));

        if (!QUICK && FULL_MODES.indexOf(`${vp.label}-${theme}-${lang}`) === -1) {
          await ctx.close();
          continue;
        }

        /* (2) normal reload */
        await page.reload({ waitUntil: 'load', timeout: 120000 });
        await settle(page);
        verdict(`${vp.label}-${theme}-${lang}/normal reload`, await page.evaluate(READ));

        /* (3) hard reload（キャッシュ無視） */
        await cdp.send('Page.reload', { ignoreCache: true });
        await page.waitForLoadState('load', { timeout: 120000 }).catch(() => {});
        await settle(page);
        verdict(`${vp.label}-${theme}-${lang}/hard reload`, await page.evaluate(READ));

        /* (4) 新規タブからの直アクセス */
        const tab = await ctx.newPage();
        await tab.goto(base, { waitUntil: 'load', timeout: 120000 });
        await settle(tab);
        verdict(`${vp.label}-${theme}-${lang}/新規タブ`, await tab.evaluate(READ));
        await tab.close();

        await ctx.close();
      }
    }
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) { console.log('--- FAILED ---'); fail.slice(0, 20).forEach(f => console.log('  ' + f.name + '  → ' + f.detail)); }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
