/* =============================================================================
 * V2 Beta0 — Round 2.1 Final Closeout / 04 感情詳細 hero の実ピクセル計測
 * -----------------------------------------------------------------------------
 * FIX-07        感情名・lead と halo のコントラスト（8棚 × DAY/NIGHT）
 * ACTIVE-FIX-02 halo / haze が「丸」「長方形」として輪郭を持たない
 *
 * 判定は CSS の値ではなく、実際に描かれたピクセルで行う。
 *   1. 文字だけを visibility:hidden にして背景を撮る
 *   2. 文字が乗る矩形の平均色・下位5%色を採り、文字色との WCAG 比を出す
 *   3. hero 内の隣接行／隣接列の輝度差の最大値を「縁の段差」として採る
 *      gradient は連続なので段差は小さい。クリップされた縁があると跳ね上がる。
 *
 * 保存・製本・GA4・外部通信は呼ばない（描画の読み取りのみ）。
 * 使い方: node tests/qa_r21c_hero_contrast.js
 * ========================================================================== */
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

/* 受入値。FIX-07 実装時に v2-mount.css へ記録した実測レンジを下回らないこと。 */
const MIN_TITLE = 4.50;   /* 感情名（大きい文字）*/
const MIN_LEAD = 4.50;    /* lead 平均 */
const MIN_LEAD_P05 = 3.00;/* lead の最も条件が悪い 5% */
const MAX_STEP = 9.0;     /* 隣接 1px の平均 RGB 差。これを超えると人の目に「縁」として出る */

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}
function note(m) { console.log('        · ' + m); }

const PIXELS = async (page, dataUrl, info) => page.evaluate(async ({ dataUrl, t, l, h, tc, lc }) => {
  const img = new Image();
  await new Promise(r => { img.onload = r; img.src = dataUrl; });
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);

  const lum = (r, g, b) => {
    const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const x = lum(...a), y = lum(...b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const parse = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  const box = (x0, y0, x1, y1) => {
    x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0));
    x1 = Math.min(cv.width, Math.round(x1)); y1 = Math.min(cv.height, Math.round(y1));
    return cx.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)).data;
  };
  const stat = (d, fg) => {
    let r = 0, g = 0, b = 0, n = 0; const all = [];
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      all.push(ratio(fg, [d[i], d[i + 1], d[i + 2]]));
    }
    all.sort((p, q) => p - q);
    return { avg: +ratio(fg, [r / n, g / n, b / n]).toFixed(2), p05: +all[Math.floor(all.length * 0.05)].toFixed(2) };
  };

  /* 縁の段差：hero 全域で、隣接行 / 隣接列の平均 RGB 差の最大値 */
  const X = Math.max(0, Math.round(h.x + 4)), Y = Math.max(0, Math.round(h.y + 2));
  const W = Math.max(8, Math.min(cv.width - X, Math.round(h.w - 8)));
  const H = Math.max(8, Math.min(cv.height - Y, Math.round(h.h - 4)));
  const d = cx.getImageData(X, Y, W, H).data;
  const at = (x, y) => { const i = ((y * W) + x) << 2; return [d[i], d[i + 1], d[i + 2]]; };
  let stepY = 0, stepX = 0;
  for (let y = 1; y < H; y++) {
    let s = 0, n = 0;
    for (let x = 0; x < W; x += 2) { const a = at(x, y), b = at(x, y - 1); s += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); n++; }
    s /= (n * 3); if (s > stepY) stepY = s;
  }
  for (let x = 1; x < W; x++) {
    let s = 0, n = 0;
    for (let y = 0; y < H; y += 2) { const a = at(x, y), b = at(x - 1, y); s += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); n++; }
    s /= (n * 3); if (s > stepX) stepX = s;
  }

  return {
    title: stat(box(t.x + t.w * 0.12, t.y + t.h * 0.18, t.x + t.w * 0.88, t.y + t.h * 0.82), parse(tc)),
    lead: stat(box(l.x + l.w * 0.12, l.y + l.h * 0.18, l.x + l.w * 0.88, l.y + l.h * 0.82), parse(lc)),
    stepY: +stepY.toFixed(2), stepX: +stepX.toFixed(2)
  };
}, { dataUrl, ...info });

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const theme of ['day', 'night']) {
    for (const vp of [{ label: '390', width: 390, height: 844 }, { label: '1440', width: 1440, height: 900 }]) {
      const tag = `${vp.label}-${theme}`;
      const { ctx, page } = await L.openPage(browser, { ...vp, theme, lang: 'ja' });
      await L.boot(page, base);
      await L.enterStore(page);

      const rows = [];
      for (const sh of L.SHELVES) {
        await L.go(page, '03');
        await L.openShelf(page, sh);
        const info = await page.evaluate(`(() => {
          const t = document.querySelector('.v2c04__title');
          const l = document.querySelector('.v2c04__lead');
          const h = document.querySelector('.v2c04__hero');
          const R = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
          return { t: R(t), l: R(l), h: R(h), tc: getComputedStyle(t).color, lc: getComputedStyle(l).color };
        })()`);
        await page.evaluate(`(() => { const s = document.createElement('style'); s.id = '__hide';
          s.textContent = '.v2c04__title,.v2c04__lead,.v2c04__sprig{visibility:hidden !important}';
          document.head.appendChild(s); })()`);
        await page.waitForTimeout(60);
        const shot = await page.screenshot({
          clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, Math.ceil(info.h.y + info.h.h + 6)) }
        });
        await page.evaluate(`(() => { const e = document.getElementById('__hide'); if (e) e.remove(); })()`);
        const px = await PIXELS(page, 'data:image/png;base64,' + shot.toString('base64'), info);
        rows.push({ sh, ...px });
      }

      const f = a => `${Math.min(...a).toFixed(2)}–${Math.max(...a).toFixed(2)}`;
      const titleAvg = rows.map(r => r.title.avg);
      const leadAvg = rows.map(r => r.lead.avg);
      const leadP05 = rows.map(r => r.lead.p05);
      const step = Math.max(...rows.map(r => Math.max(r.stepX, r.stepY)));
      note(`[${tag}] titleAvg=${f(titleAvg)} leadAvg=${f(leadAvg)} leadP05=${f(leadP05)} 縁の段差max=${step.toFixed(2)}`);

      check(`[${tag}] FIX-07 感情名のコントラスト（8棚）`,
        Math.min(...titleAvg) >= MIN_TITLE, `min=${Math.min(...titleAvg)} (>=${MIN_TITLE})`);
      check(`[${tag}] FIX-07 lead 平均のコントラスト（8棚）`,
        Math.min(...leadAvg) >= MIN_LEAD, `min=${Math.min(...leadAvg)} (>=${MIN_LEAD})`);
      check(`[${tag}] FIX-07 lead 下位5%のコントラスト（8棚）`,
        Math.min(...leadP05) >= MIN_LEAD_P05, `min=${Math.min(...leadP05)} (>=${MIN_LEAD_P05})`);
      check(`[${tag}] ACTIVE-FIX-02 hero に硬い縁（丸・長方形）が出ていない`,
        step <= MAX_STEP,
        rows.map(r => `${r.sh}:${Math.max(r.stepX, r.stepY).toFixed(1)}`).join(' '));

      await ctx.close();
    }
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) { console.log('--- FAILED ---'); fail.forEach(x => console.log('  ' + x.name + '\n     → ' + x.detail)); }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
