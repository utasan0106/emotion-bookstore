/* =============================================================================
 * V2 Beta0 — Preview Final Trust / Localization Limited Fix
 * -----------------------------------------------------------------------------
 * FIX-01  店内メニュー drawer / データパネル本文の WCAG コントラスト
 * FIX-02  EN 本棚の冊数表示の単複（1 book / 2 books）
 *
 * FIX-01 は CSS の値ではなく、実際に描かれたピクセルで測る。
 *   drawer は半透明パネル＋overlay の上に載るため、算術では正しい背景が出ない。
 *   文字だけを一時的に transparent にして背景を撮り、
 *   その矩形の実ピクセルを採色して、文字色との WCAG コントラスト比を出す。
 *
 * 判定
 *   通常本文 4.5:1 以上。
 *   large text（18.66px 以上、または 14px 以上かつ bold）のみ 3:1 を認める。
 *   本文を large text 扱いして基準を緩めない。
 *
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21f_drawer_a11y.js [--shots <dir>]
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const i = process.argv.indexOf('--shots');
const SHOT = i > -1 ? process.argv[i + 1] : null;
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

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

/* drawer 内の user-facing text をすべて拾う（利用者コンテンツは対象外） */
const COLLECT = `(() => {
  const root = document.getElementById('experienceMenu');
  if (!root) return [];
  const SKIP = ['script', 'style', 'select', 'option', 'input', 'textarea',
                '#sampleBookInline .sample-inline-story', '.sample-inline-title'];
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
    /* viewport の外に出ている行は撮影範囲外なので測らない */
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(p);
    const fs = parseFloat(cs.fontSize);
    const fw = parseInt(cs.fontWeight, 10) || 400;
    p.setAttribute('data-a11y-probe', String(idx));
    out.push({
      id: String(idx++), text: txt.slice(0, 30),
      color: cs.color, opacity: +cs.opacity, fs: +fs.toFixed(1), fw,
      /* WCAG large text: 24px 以上、または 18.66px 以上かつ bold(700+) */
      large: fs >= 24 || (fs >= 18.66 && fw >= 700),
      x: r.x, y: Math.max(0, r.y), w: r.width, h: Math.min(r.height, innerHeight - Math.max(0, r.y))
    });
  }
  return out;
})()`;

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
    const fgRaw = parse(it.color);
    const a = alpha(it.color) * (it.opacity == null ? 1 : it.opacity);
    const fg = fgRaw.map((c, i) => c * a + bg[i] * (1 - a));
    out.push({ ...it, bg: bg.map(v => Math.round(v)), fgEff: fg.map(v => Math.round(v)),
               contrast: +ratio(fg, bg).toFixed(2) });
  }
  return out;
}`;

/* drawer を開き、2 つの accordion をどちらも開いた状態にする */
async function openDrawerFull(page) {
  await L.openMenu(page);
  await page.waitForTimeout(250);
  await page.click('#aboutAccordionBtn').catch(() => {});
  await page.waitForTimeout(300);
  await page.click('.about-data-accordion summary').catch(() => {});
  await page.waitForTimeout(350);
}

/* 一冊書いて製本し、棚を決めず本棚へ */
async function bindOne(page, story, title) {
  await L.go(page, '02'); await L.go(page, '05');
  await page.fill('#v2bStoryInput', story);
  await page.waitForTimeout(120);
  if (title) { await page.fill('#v2bTitleInput', title); await page.waitForTimeout(120); }
  await page.evaluate(`document.querySelector('[data-v2-write="bind"]').click()`);
  const ok = await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !!(b && !b.classList.contains('hidden')); })()`, 25000);
  if (!ok) return false;
  await page.evaluate(`(() => { const s = document.getElementById('unfiledShelfSkip'); if (s) s.click(); })()`);
  await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !b || b.classList.contains('hidden'); })()`, 20000);
  await page.waitForTimeout(1000);
  return true;
}

async function countText(page) {
  return page.evaluate(`(() => {
    const c = document.querySelector('[data-v2-bookshelf="count"]');
    return c ? c.textContent.trim() : '';
  })()`);
}

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  /* ===================== FIX-01：drawer / data panel ===================== */
  for (const theme of ['day', 'night']) {
    for (const lang of ['ja', 'en']) {
      for (const vp of [{ label: '390', width: 390, height: 844 }, { label: '1440', width: 1440, height: 900 }]) {
        const tag = `${vp.label}-${theme}-${lang}`;
        const { ctx, page } = await L.openPage(browser, { ...vp, theme, lang });
        await L.boot(page, base);
        if ((await L.ensureLang(page, lang)) !== lang) { await ctx.close(); continue; }
        await L.enterStore(page);

        await openDrawerFull(page);

        /* accordion が本当に開いているか（open/close 動作の確認も兼ねる） */
        const accState = await page.evaluate(`(() => {
          const d = document.querySelector('.about-data-accordion');
          const btn = document.getElementById('aboutAccordionBtn');
          const panel = document.getElementById('aboutAccordionContent');
          const drawer = document.getElementById('experienceMenu');
          const dr = drawer.getBoundingClientRect();
          return {
            dataOpen: !!(d && d.open),
            aboutOpen: btn ? btn.getAttribute('aria-expanded') === 'true' : null,
            aboutVisible: panel ? panel.getClientRects().length > 0 : null,
            drawerLeft: Math.round(dr.left), drawerRight: Math.round(dr.right),
            viewport: innerWidth,
            overflowX: document.documentElement.scrollWidth > innerWidth + 1
          };
        })()`);
        check(`[${tag}] FIX-01 データ accordion が開く`, accState.dataOpen, JSON.stringify(accState));
        check(`[${tag}] FIX-01「はじめての方へ」accordion が開く`, accState.aboutVisible !== false, JSON.stringify(accState));
        check(`[${tag}] FIX-01 drawer が viewport 外へはみ出さない`,
          accState.drawerRight <= accState.viewport + 1 && accState.drawerLeft >= -1, JSON.stringify(accState));
        check(`[${tag}] FIX-01 横スクロールが出ない`, !accState.overflowX);

        /* drawer の中身は縦に長いので、上から順にスクロールして測り切る */
        const scroller = await page.evaluate(`(() => {
          const d = document.getElementById('experienceMenu');
          const cands = [d].concat(Array.from(d.querySelectorAll('*')));
          const s = cands.find(e => e.scrollHeight > e.clientHeight + 8 &&
            /auto|scroll/.test(getComputedStyle(e).overflowY));
          if (s) { s.setAttribute('data-a11y-scroller', ''); return { h: s.scrollHeight, c: s.clientHeight }; }
          return null;
        })()`);
        const steps = scroller ? Math.min(6, Math.ceil(scroller.h / Math.max(1, scroller.c))) : 1;
        note(`[${tag}] drawer scroll: ${JSON.stringify(scroller)} steps=${steps}`);

        const all = [];
        for (let s = 0; s < steps; s++) {
          if (scroller) {
            await page.evaluate(`(() => { const e = document.querySelector('[data-a11y-scroller]');
              if (e) e.scrollTop = ${s} * (e.clientHeight - 24); })()`);
            await page.waitForTimeout(250);
          }
          await page.evaluate(`(() => { document.querySelectorAll('[data-a11y-probe]')
            .forEach(e => e.removeAttribute('data-a11y-probe')); })()`);
          const items = await page.evaluate(COLLECT);
          if (!items.length) continue;
          await page.evaluate(`(() => { const s = document.createElement('style'); s.id = '__a11y';
            s.textContent = '#experienceMenu [data-a11y-probe]{ color: transparent !important; }';
            document.head.appendChild(s); })()`);
          await page.waitForTimeout(120);
          const png = await page.screenshot();
          await page.evaluate(`(() => { const e = document.getElementById('__a11y'); if (e) e.remove(); })()`);
          const got = await page.evaluate('(' + MEASURE + ')(' + JSON.stringify(
            { dataUrl: 'data:image/png;base64,' + png.toString('base64'), items }) + ')');
          all.push(...got);
        }
        /* 同じ文字が複数のスクロール位置で採れた場合は、最も悪い値を残す */
        const byText = new Map();
        for (const m of all) {
          const k = m.text + '|' + m.color + '|' + m.fs;
          if (!byText.has(k) || m.contrast < byText.get(k).contrast) byText.set(k, m);
        }
        const measured = [...byText.values()];
        for (const m of measured) {
          note(`[${tag}] ${m.large ? 'LG' : '  '} 「${m.text}」 fs=${m.fs}/${m.fw} ` +
               `fg=${m.fgEff.join(',')} bg=${m.bg.join(',')} contrast=${m.contrast}`);
        }
        const bad = measured.filter(m => m.contrast < (m.large ? AA_LARGE : AA_NORMAL));
        const worst = measured.length ? Math.min(...measured.filter(m => !m.large).map(m => m.contrast)) : null;
        check(`[${tag}] FIX-01 drawer / data panel の文字が WCAG AA を満たす`,
          bad.length === 0, bad.map(m => `「${m.text}」=${m.contrast}${m.large ? '(LG)' : ''}`).join(' / '));
        note(`[${tag}] FIX-01 通常本文の最小 contrast = ${worst}（計測 ${measured.length} 箇所）`);

        if (SHOT && theme === 'day') {
          /* accordion は開いたまま撮る（ここで summary を押すと閉じてしまう） */
          await page.evaluate(`(() => { const d = document.querySelector('.about-data-accordion');
            if (d) d.scrollIntoView({ block: 'center' }); })()`);
          await page.waitForTimeout(250);
          await shot(page, `drawer-${tag}`);
        }

        /* accordion を閉じても壊れないこと */
        await page.click('.about-data-accordion summary').catch(() => {});
        await page.waitForTimeout(250);
        const closed = await page.evaluate(`(() => {
          const d = document.querySelector('.about-data-accordion');
          return { open: !!(d && d.open),
                   overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
        })()`);
        check(`[${tag}] FIX-01 データ accordion を閉じられる`, closed.open === false, JSON.stringify(closed));
        check(`[${tag}] FIX-01 閉じたあとも横スクロールが出ない`, !closed.overflowX);

        await L.closeMenu(page);
        if (page._errors.length) note(`[${tag}] JS error: ${page._errors.slice(0, 2).join(' | ')}`);
        await ctx.close();
      }
    }
  }

  /* ===================== FIX-02：EN の冊数（単複） ===================== */
  for (const lang of ['en', 'ja']) {
    const { ctx, page } = await L.openPage(browser, { width: 390, height: 844, theme: 'day', lang });
    await L.boot(page, base);
    if ((await L.ensureLang(page, lang)) !== lang) { await ctx.close(); continue; }
    await L.enterStore(page);

    /* 0 冊：既存の専用 UI（08）を維持しているか */
    await L.go(page, 'bookshelf');
    const zero = await L.activeScreen(page);
    check(`[${lang}] FIX-02 0 冊は既存の空 UI（08）のまま`, zero === '08', String(zero));

    await bindOne(page, 'first book for count check.', 'First');
    const one = await countText(page);
    note(`[${lang}] 1 冊: 「${one}」`);
    if (lang === 'en') {
      check(`[en] FIX-02 1 冊は「1 book」`, one === '1 book', one);
    } else {
      check(`[ja] FIX-02 JA の 1 冊表示は変わらない`, one === '1冊の本', one);
    }

    await bindOne(page, 'second book for count check.', 'Second');
    const two = await countText(page);
    note(`[${lang}] 2 冊: 「${two}」`);
    if (lang === 'en') {
      check(`[en] FIX-02 2 冊は「2 books」`, two === '2 books', two);
    } else {
      check(`[ja] FIX-02 JA の 2 冊表示は変わらない`, two === '2冊の本', two);
    }

    await bindOne(page, 'third book for count check.', 'Third');
    const three = await countText(page);
    note(`[${lang}] 3 冊: 「${three}」`);
    if (lang === 'en') check(`[en] FIX-02 3 冊は「3 books」`, three === '3 books', three);

    if (SHOT && lang === 'en') {
      /* 1 book の証跡は、蔵書 1 冊の状態を作り直して撮る */
      const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
      const p2 = await c2.newPage();
      await p2.addInitScript(L.clockInit(12));
      p2._wantLang = 'en'; p2._errors = [];
      await L.boot(p2, base);
      await L.ensureLang(p2, 'en');
      await L.enterStore(p2);
      await bindOne(p2, 'one book only.', 'Only One');
      await p2.waitForTimeout(400);
      await shot(p2, 'bookshelf-en-1book');
      await c2.close();
    }

    /* 言語を戻しても壊れないこと */
    const back = await L.ensureLang(page, lang === 'en' ? 'ja' : 'en');
    check(`[${lang}] FIX-02 言語を切り替えても本棚が壊れない`, !!back, String(back));
    await L.ensureLang(page, lang);

    if (page._errors.length) note(`[${lang}] JS error: ${page._errors.slice(0, 2).join(' | ')}`);
    await ctx.close();
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\n================ SUMMARY ================`);
  console.log(`total=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) {
    const g = new Map();
    for (const f of fail) { const k = f.name.replace(/^\[[^\]]+\]\s*/, ''); if (!g.has(k)) g.set(k, []); g.get(k).push(f); }
    for (const [k, v] of g) {
      console.log(`\n[${v.length}x] ${k}`);
      v.forEach(f => console.log(`   ${f.name} → ${f.detail}`));
    }
  }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
