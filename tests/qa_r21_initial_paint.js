/* =============================================================================
 * V2 Beta0 — Round 2.1 / FIX-11 initial paint 診断
 * -----------------------------------------------------------------------------
 * 「直アクセス／hard reload で旧UIが一瞬見える」現象について、
 *   (1) ブラウザが遷移前ページの snapshot を残しているだけなのか
 *   (2) 現行 HTML の legacy UI が実際に一度 paint されているのか
 * を、推測ではなく実測で切り分ける。
 *
 * 方法
 *   ・about:blank から目的 URL へ「直アクセス」する（遷移前ページを持たない）。
 *     ここで legacy UI が出るなら snapshot ではなくアプリ側の paint。
 *   ・CDP の Page.startScreencast で response 後のフレームを連続取得し、
 *     data-v2-mounted="true" が付く前のフレームに legacy UI が含まれるかを見る。
 *   ・判定は色ではなく DOM：各フレーム取得時点で legacy root が
 *     「可視かつ面積を持つ」かどうかを同時に記録する。
 *
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21_initial_paint.js [--throttle]
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const THROTTLE = process.argv.includes('--throttle');
const OUTDIR = (() => {
  const i = process.argv.indexOf('--out');
  return i > -1 ? process.argv[i + 1] : null;
})();
if (OUTDIR) fs.mkdirSync(OUTDIR, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}

/* legacy root（V2 が担当する面の旧UI）が「見えているか」を DOM から判定する。
   v2-mount.css は html[data-v2-mounted="true"] にしか効かないため、
   mount 前はこれらが通常の描画対象になっているかどうかがそのまま答えになる。 */
const PROBE = `(() => {
  window.__paintLog = [];
  window.__mountAt = null;
  window.__fcp = null;
  window.__fp = null;
  window.__atPaint = null;
  window.__probeError = null;
  /* v2-mount.css が mount 後に隠す集合とまったく同じ条件で見る。
     ＝「mount 前に見えている＝利用者に旧UIが見えている」が直接判定できる。 */
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
        const onScreen = r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < innerHeight;
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0' && onScreen) {
          const id = el.id ? '#' + el.id : '';
          const cls = (typeof el.className === 'string' && el.className)
            ? '.' + el.className.trim().split(/\\s+/)[0] : '';
          out.push(el.tagName.toLowerCase() + id + cls + '(' + Math.round(r.width) + 'x' + Math.round(r.height) + ')');
          if (out.length > 12) return out;
        }
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
    /* document-start では documentElement がまだ無いことがあるため、
       常に存在する document を対象に subtree で監視する。 */
    new MutationObserver(() => {
      if (window.__mountAt === null && mounted()) window.__mountAt = performance.now();
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-v2-mounted'] });
  } catch (e) { window.__probeError = 'mo:' + e.message; }
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.name === 'first-contentful-paint' && window.__fcp === null) window.__fcp = e.startTime;
        if (e.name === 'first-paint' && window.__fp === null) {
          window.__fp = e.startTime;
          /* first paint の瞬間のスナップショット（決定的な証拠） */
          window.__atPaint = {
            t: e.startTime,
            mounted: mounted(),
            legacy: legacyVisible(),
            bodyBg: document.body ? getComputedStyle(document.body).backgroundColor : null
          };
        }
      }
    }).observe({ type: 'paint', buffered: true });
  } catch (e) { window.__probeError = (window.__probeError || '') + ' po:' + e.message; }
  try {
    (function tick() {
      window.__paintLog.push({ t: performance.now(), mounted: mounted(), legacy: legacyVisible() });
      if (window.__paintLog.length < 900) requestAnimationFrame(tick);
    })();
  } catch (e) { window.__probeError = (window.__probeError || '') + ' raf:' + e.message; }
})()`;

async function run(browser, label, { width, height, theme, lang, blockV2 }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(L.clockInit ? L.clockInit(theme === 'night' ? 22 : 12) : '');
  await page.addInitScript(PROBE);
  if (blockV2) await page.route('**/v2-mount.js', r => r.abort());

  const cdp = await ctx.newCDPSession(page);
  if (THROTTLE) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8
    });
  }
  const frames = [];
  cdp.on('Page.screencastFrame', async ev => {
    frames.push({ data: ev.data, ts: ev.metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }); } catch (e) {}
  });
  await cdp.send('Page.enable');
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

  // 「直アクセス」：about:blank から目的 URL へ入る（遷移前ページの snapshot を持たない）
  await page.goto(label.base, { waitUntil: 'load', timeout: 120000 });
  if (!blockV2) {
    await page.waitForSelector('html[data-v2-mounted="true"]', { timeout: 120000 }).catch(() => {});
  }
  /* v2-mount.js を落とした参照ケースでは、fail-safe が働いて旧UIへ戻ることまで見る。
     index.html の fail-safe は load から 1500ms 後なので、それより長く待つ。 */
  await page.waitForTimeout(blockV2 ? 4000 : 1200);
  await cdp.send('Page.stopScreencast').catch(() => {});

  const log = await page.evaluate(`({
    paintLog: window.__paintLog || [], mountAt: window.__mountAt,
    fcp: window.__fcp, fp: window.__fp, atPaint: window.__atPaint,
    nowLegacy: (window.__legacyVisible ? window.__legacyVisible() : null),
    mountedNow: document.documentElement.getAttribute('data-v2-mounted'),
    probeError: window.__probeError,
    bootingNow: document.documentElement.getAttribute('data-v2-booting')
  })`);
  await ctx.close();
  return { log, frames };
}

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  console.log(`=== initial paint 診断${THROTTLE ? '（400kbps / 150ms 遅延）' : ''} ===\n`);

  /* ---- 参照：v2-mount.js を落として legacy UI だけを描かせた状態 ---- */
  const ref = await run(browser, { base }, { width: 1440, height: 900, theme: 'day', lang: 'ja', blockV2: true });
  const refLegacy = ref.log.paintLog.filter(p => p.legacy.length > 0).length;
  console.log(`[参照] v2-mount.js を落とした場合:`);
  console.log(`        first paint 時点 = ${JSON.stringify(ref.log.atPaint)}`);
  console.log(`        読み取り時点の legacy = ${JSON.stringify(ref.log.nowLegacy)}`);
  console.log(`        legacy 可視フレーム ${refLegacy} / ${ref.log.paintLog.length}`);
  check('参照ケースで legacy UI を検出できる（検出器が機能している）',
    refLegacy > 0 || (ref.log.nowLegacy && ref.log.nowLegacy.length > 0),
    'legacy 可視フレーム ' + refLegacy + ' now=' + JSON.stringify(ref.log.nowLegacy));
  /* FIX-11 の fail-safe：V2 が mount しなくても blank のままにならず、
     既存の旧UI fallback へ必ず戻ること。 */
  check('fail-safe：v2-mount.js が無くても最終的に旧UIが表示される（blank のままにならない）',
    !!ref.log.nowLegacy && ref.log.nowLegacy.length > 0,
    'now=' + JSON.stringify(ref.log.nowLegacy));
  check('fail-safe：boot 状態が解除されている',
    ref.log.bootingNow === null, 'data-v2-booting=' + ref.log.bootingNow);
  if (OUTDIR && ref.frames.length) {
    fs.writeFileSync(path.join(OUTDIR, 'ref-legacy-only.png'), Buffer.from(ref.frames[ref.frames.length - 1].data, 'base64'));
  }

  /* ---- 本番相当：直アクセス ---- */
  for (const theme of (process.env.R21_FULL ? ['day', 'night'] : ['day'])) {
    for (const lang of ['ja']) {
      for (const vp of (process.env.R21_FULL ? [...L.MOBILE, ...L.DESKTOP] : [{ width: 1440, height: 900, label: '1440' }, { width: 390, height: 844, label: '390' }])) {
        const tag = `${vp.label}-${theme}-${lang}`;
        const { log, frames } = await run(browser, { base }, { ...vp, theme, lang });
        const pre = log.paintLog.filter(p => !p.mounted);
        const preLegacy = pre.filter(p => p.legacy.length > 0);
        const mountAt = log.mountAt;
        console.log(`[${tag}] fp=${log.fp === undefined ? 'n/a' : Math.round(log.fp)}ms ` +
          `fcp=${log.fcp === null ? 'n/a' : Math.round(log.fcp)}ms mount=${mountAt === null ? 'n/a' : Math.round(mountAt)}ms ` +
          `rAFフレーム=${log.paintLog.length}（mount前 ${pre.length} / うち legacy 可視 ${preLegacy.length}） screencast=${frames.length}`);
        console.log(`         first paint 時点 = ${JSON.stringify(log.atPaint)}`);
        check(`[${tag}] 計測が空振りしていない（mount 済み・paint 記録あり）`,
          log.mountedNow === 'true' && log.atPaint !== null,
          `mountedNow=${log.mountedNow} atPaint=${JSON.stringify(log.atPaint)} err=${log.probeError}`);
        check(`[${tag}] first paint の時点で legacy UI が可視でない`,
          !!log.atPaint && log.atPaint.legacy.length === 0,
          log.atPaint ? log.atPaint.legacy.join(',') : 'atPaint 取得できず err=' + log.probeError);
        check(`[${tag}] mount 前のどのフレームでも legacy UI が可視でない`,
          preLegacy.length === 0,
          preLegacy.slice(0, 2).map(p => Math.round(p.t) + 'ms ' + p.legacy.join(',')).join(' | '));
        if (OUTDIR && frames.length) {
          fs.writeFileSync(path.join(OUTDIR, `first-frame-${tag}.png`), Buffer.from(frames[0].data, 'base64'));
          const mid = frames[Math.min(2, frames.length - 1)];
          fs.writeFileSync(path.join(OUTDIR, `early-frame-${tag}.png`), Buffer.from(mid.data, 'base64'));
        }
      }
    }
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) { console.log('--- FAILED ---'); fail.forEach(f => console.log('  ' + f.name + '  → ' + f.detail)); }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
