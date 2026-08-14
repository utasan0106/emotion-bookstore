/* =============================================================================
 * V2 Beta0 — Preview Trust / Accessibility Limited Fix
 * -----------------------------------------------------------------------------
 * FIX-01  05 本文の保存説明が実装事実（ブラウザ保存領域）になっている
 * FIX-02  05 写真の保存説明が実装事実になっている（「折りたたんで」を使わない）
 * FIX-03  Data 説明 EN の重複表現が解消している
 * FIX-04  製本後 shelf picker modal の helper text が WCAG AA（4.5:1）以上
 *
 * FIX-04 は CSS の値ではなく、実際に描かれたピクセルで測る。
 *   文字要素だけを一時的に visibility:hidden にして背景を撮り、
 *   その矩形の実ピクセルを採色して、文字色との WCAG コントラスト比を出す。
 *   modal は blur 背景・半透明パネルの上に載るため、算術ではなく実測が要る。
 *
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21e_trust_a11y.js [--shots <dir>]
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const i = process.argv.indexOf('--shots');
const SHOT = i > -1 ? process.argv[i + 1] : null;
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });

const AA = 4.5;

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}
function note(m) { console.log('        · ' + m); }
async function shot(page, n) { if (SHOT) await page.screenshot({ path: path.join(SHOT, n + '.png') }); }

async function waitUntil(page, expr, timeout) {
  const end = Date.now() + (timeout || 20000);
  while (Date.now() < end) { if (await page.evaluate(expr)) return true; await page.waitForTimeout(150); }
  return false;
}

/* 製本して受け取り頁（shelf picker）を開いたまま止める */
async function openPicker(page, story, title) {
  await L.go(page, '02'); await L.go(page, '05');
  await page.fill('#v2bStoryInput', story);
  await page.waitForTimeout(150);
  if (title) { await page.fill('#v2bTitleInput', title); await page.waitForTimeout(150); }
  await page.evaluate(`document.querySelector('[data-v2-write="bind"]').click()`);
  return waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !!(b && !b.classList.contains('hidden')); })()`, 25000);
}
async function closePicker(page, mode) {
  await page.evaluate(`(() => {
    if (${JSON.stringify(mode)} === 'confirm') {
      const sel = document.querySelector('#unfiledShelfPicker select');
      const real = sel && Array.from(sel.options).find(o => o.value && o.value !== 'unfiled');
      if (real) {
        sel.value = real.value; sel.dispatchEvent(new Event('change', { bubbles: true }));
        const c = document.getElementById('unfiledShelfConfirm');
        if (c) { c.click(); return; }
      }
    }
    const s = document.getElementById('unfiledShelfSkip'); if (s) s.click();
  })()`);
  await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !b || b.classList.contains('hidden'); })()`, 20000);
  await page.waitForTimeout(1000);
}

/* modal 内の user-facing helper text をすべて拾う（利用者の題名・本文は除外） */
const COLLECT_TEXT = `(() => {
  const root = document.getElementById('unfiledShelfPicker');
  if (!root) return [];
  const SKIP = ['.mana-receive-book', '.spine', '.mana-title-input', 'script', 'style',
                'input', 'textarea', 'select', 'option'];
  const out = []; let idx = 0;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const txt = (n.nodeValue || '').trim();
    if (!txt) continue;
    let el = n.parentElement, skip = false;
    while (el && el !== root.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) { skip = true; break; }
      if (el.hasAttribute && el.hasAttribute('aria-hidden')) { skip = true; break; }
      if (SKIP.some(s => el.matches && el.matches(s))) { skip = true; break; }
      el = el.parentElement;
    }
    if (skip) continue;
    const p = n.parentElement;
    const r = p.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    /* ボタンは helper text ではないが、参考として種別を残す */
    const isBtn = !!p.closest('button, a, [role=button]');
    p.setAttribute('data-a11y-probe', String(idx));
    const cs = getComputedStyle(p);
    out.push({
      id: String(idx++), text: txt.slice(0, 34), isBtn,
      color: cs.color, opacity: +cs.opacity,
      fs: +parseFloat(cs.fontSize).toFixed(1), fw: cs.fontWeight,
      x: r.x, y: r.y, w: r.width, h: r.height
    });
  }
  return out;
})()`;

/* 撮った背景から、各 probe 矩形の実ピクセルを採色してコントラストを出す */
const MEASURE = `async ({ dataUrl, items }) => {
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
  const parse = s => s.match(/[\\d.]+/g).slice(0, 3).map(Number);
  const alpha = s => { const m = s.match(/[\\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1; };
  const out = [];
  for (const it of items) {
    const x0 = Math.max(0, Math.round(it.x)), y0 = Math.max(0, Math.round(it.y));
    const x1 = Math.min(cv.width, Math.round(it.x + it.w)), y1 = Math.min(cv.height, Math.round(it.y + it.h));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    const d = cx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    const bg = [r / n, g / n, b / n];
    /* 文字色は color の alpha と element opacity を背景へ合成してから比較する */
    const fgRaw = parse(it.color);
    const a = alpha(it.color) * (it.opacity == null ? 1 : it.opacity);
    const fg = fgRaw.map((c, i) => c * a + bg[i] * (1 - a));
    out.push({ ...it, bg: bg.map(v => Math.round(v)), fgEff: fg.map(v => Math.round(v)),
               contrast: +ratio(fg, bg).toFixed(2), effAlpha: +a.toFixed(3) });
  }
  return out;
}`;

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const theme of ['day', 'night']) {
    for (const lang of ['ja', 'en']) {
      for (const vp of [{ label: '390', width: 390, height: 844 }, { label: '1440', width: 1440, height: 900 }]) {
        const tag = `${vp.label}-${theme}-${lang}`;
        const { ctx, page } = await L.openPage(browser, { ...vp, theme, lang });
        await L.boot(page, base);
        if ((await L.ensureLang(page, lang)) !== lang) { await ctx.close(); continue; }
        await L.enterStore(page);
        await L.go(page, '05');

        /* ---------- FIX-01 / FIX-02：05 の保存説明 ---------- */
        const hints = await page.evaluate(`(() => {
          const pick = sel => {
            const els = Array.from(document.querySelectorAll(sel))
              .filter(e => e.getClientRects().length > 0);
            return els.length ? els[0].textContent.replace(/\\s+/g, ' ').trim() : null;
          };
          return { assure: pick('.v2c05__assure'), photo: pick('.v2c05__photohint') };
        })()`);
        note(`[${tag}] 05 本文: ${hints.assure}`);
        note(`[${tag}] 05 写真: ${hints.photo}`);
        /* FIX-A（Preview Final 追加修正）で一文に短縮した後の正式契約 */
        const wantAssure = lang === 'ja'
          ? '本文は、この端末のブラウザ保存領域に保存されます。'
          : 'Your text is stored in this device’s browser storage.';
        const wantPhoto = lang === 'ja'
          ? '写真は、この端末のブラウザ保存領域に保存されます。長辺800pxに縮小し、運営者のサーバーへは送信しません。'
          : 'Photos are stored in this device’s browser storage. They are resized to a maximum long edge of 800px and are not sent to the operator’s server.';
        check(`[${tag}] FIX-01 05 本文の保存説明が指定どおり`, hints.assure === wantAssure, String(hints.assure));
        check(`[${tag}] FIX-02 05 写真の保存説明が指定どおり`, hints.photo === wantPhoto, String(hints.photo));
        check(`[${tag}] FIX-02「折りたたんで」を使っていない`,
          !/折りたたん/.test(hints.photo || ''), String(hints.photo));
        if (vp.label !== '1440' || theme === 'day') await shot(page, `05-${tag}`);

        /* ---------- FIX-03：Data 説明 EN ---------- */
        await L.openMenu(page);
        await page.click('.about-data-accordion summary').catch(() => {});
        await page.waitForTimeout(250);
        const dataTxt = await page.evaluate(`(() => {
          const el = document.querySelector('#experienceMenu [data-i18n-html="dataAboutBody"]');
          return el ? el.textContent.replace(/\\s+/g, ' ').trim() : null;
        })()`);
        if (lang === 'en') {
          check(`[${tag}] FIX-03 EN の重複表現が解消している`,
            dataTxt.includes('What you write is stored in this device’s browser storage. The service uses both IndexedDB and localStorage.')
            && !/for local storage/.test(dataTxt), dataTxt.slice(0, 150));
        } else {
          check(`[${tag}] FIX-03 JA は現行維持`,
            dataTxt.includes('書いたものは、この端末のブラウザ保存領域に保存されます。保存にはIndexedDBとlocalStorageを併用しています。'),
            dataTxt.slice(0, 90));
        }
        await L.closeMenu(page);

        /* ---------- FIX-04：shelf picker modal の実測コントラスト ---------- */
        const opened = await openPicker(page, '受け取り頁のコントラストを測るための一冊。', 'コントラスト確認');
        check(`[${tag}] FIX-04 受け取り頁（shelf picker）が開く`, opened);
        if (opened) {
          if (vp.label === '390' || theme === 'night') await shot(page, `picker-${tag}`);
          const items = await page.evaluate(COLLECT_TEXT);
          /* 文字だけ消して背景を撮る（背景・layout は一切変えない） */
          await page.evaluate(`(() => { const s = document.createElement('style'); s.id = '__a11y';
            s.textContent = '#unfiledShelfPicker [data-a11y-probe]{ color: transparent !important; }';
            document.head.appendChild(s); })()`);
          await page.waitForTimeout(120);
          const png = await page.screenshot();
          await page.evaluate(`(() => { const e = document.getElementById('__a11y'); if (e) e.remove(); })()`);
          /* MEASURE は文字列なので、引数は式に埋め込んで渡す
             （文字列を page.evaluate に渡すと第 2 引数は無視されるため） */
          const measured = await page.evaluate('(' + MEASURE + ')(' + JSON.stringify(
            { dataUrl: 'data:image/png;base64,' + png.toString('base64'), items }) + ')');

          const helper = measured.filter(m => !m.isBtn);
          const buttons = measured.filter(m => m.isBtn);
          for (const m of measured) {
            note(`[${tag}] ${m.isBtn ? 'btn ' : 'text'} 「${m.text}」 fs=${m.fs} α=${m.effAlpha} ` +
                 `fg=${m.fgEff.join(',')} bg=${m.bg.join(',')} contrast=${m.contrast}`);
          }
          const worstHelper = helper.length ? Math.min(...helper.map(m => m.contrast)) : null;
          const badHelper = helper.filter(m => m.contrast < AA);
          check(`[${tag}] FIX-04 helper text が WCAG AA（4.5:1）以上`,
            badHelper.length === 0,
            badHelper.map(m => `「${m.text}」=${m.contrast}`).join(' / '));
          const badBtn = buttons.filter(m => m.contrast < AA);
          check(`[${tag}] FIX-04 modal 内のボタン文字も AA 以上`,
            badBtn.length === 0, badBtn.map(m => `「${m.text}」=${m.contrast}`).join(' / '));
          note(`[${tag}] FIX-04 helper 最小 contrast = ${worstHelper}`);

          await closePicker(page, 'confirm');
        }

        if (page._errors.length) note(`[${tag}] JS error: ${page._errors.slice(0, 2).join(' | ')}`);
        await ctx.close();
      }
    }
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\n================ SUMMARY ================`);
  console.log(`total=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) { console.log('--- FAILED ---'); fail.forEach(f => console.log('  ' + f.name + '\n     → ' + f.detail)); }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
