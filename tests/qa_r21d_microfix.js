/* =============================================================================
 * V2 Beta0 — Post-Closeout Microfix（BASE 6f2b237）
 * -----------------------------------------------------------------------------
 * MICRO-01  05 題名 placeholder が枠内に収まる（font-size は下げない）
 * MICRO-02  05 サブ見出しが「一／冊」等で不自然に分断されない
 * MICRO-03  店内メニューの短い案内文で助詞・「本棚へ」等が孤立しない
 * MICRO-04  データ保存説明の技術内訳が実装事実（IndexedDB と localStorage の併用）と一致
 *
 * 判定は CSS の値ではなく、折り返し後の実際の行と実測幅で行う。
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21d_microfix.js [--shots <dir>]
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const i = process.argv.indexOf('--shots');
const SHOT = i > -1 ? process.argv[i + 1] : null;
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}
function note(m) { console.log('        · ' + m); }
async function shot(page, n) { if (SHOT) await page.screenshot({ path: path.join(SHOT, n + '.png') }); }

/* 折り返し後の実際の行（Range を 1 文字ずつ走査して top で切る） */
const LINES = `(sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const out = []; const r = document.createRange();
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const s = n.nodeValue || '';
    for (let i = 0; i < s.length; i++) { r.setStart(n, i); r.setEnd(n, i + 1);
      const b = r.getBoundingClientRect(); if (!b.height) continue;
      const last = out[out.length - 1];
      if (last && Math.abs(last.top - b.top) < 2) last.t += s[i]; else out.push({ top: b.top, t: s[i] });
    } }
  return out.map(l => l.t.trim()).filter(Boolean);
}`;

/* input の placeholder が枠内に入るか。実フォントで幅を測る（省略記号は出ない要素なので実測が要る） */
const PH_FIT = `(sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const c = getComputedStyle(el);
  const cv = document.createElement('canvas').getContext('2d');
  cv.font = c.fontStyle + ' ' + c.fontWeight + ' ' + c.fontSize + ' ' + c.fontFamily;
  const ph = el.placeholder || '';
  const lsp = parseFloat(c.letterSpacing) || 0;
  const textW = cv.measureText(ph).width + lsp * ph.length;
  const r = el.getBoundingClientRect();
  const inner = r.width - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight)
              - parseFloat(c.borderLeftWidth) - parseFloat(c.borderRightWidth);
  return { ph, fs: +parseFloat(c.fontSize).toFixed(2), box: +r.width.toFixed(1),
           inner: +inner.toFixed(1), textW: +textW.toFixed(1), over: +(textW - inner).toFixed(1) };
}`;

/* 助詞・記号だけ、あるいは 1〜2 文字だけの行を「孤立」とみなす */
const JA_ORPHAN = /^[。、・！？\)）」』]*$|^.{1,2}$/;

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const theme of ['day', 'night']) {
    for (const lang of ['ja', 'en']) {
      for (const vp of [...L.MOBILE, ...L.DESKTOP]) {
        const tag = `${vp.label}-${theme}-${lang}`;
        const { ctx, page } = await L.openPage(browser, { ...vp, theme, lang });
        await L.boot(page, base);
        if ((await L.ensureLang(page, lang)) !== lang) { await ctx.close(); continue; }
        const isMobile = L.MOBILE.some(m => m.label === vp.label);
        await L.enterStore(page);

        /* ---------- 05 ---------- */
        await L.go(page, '05');

        /* MICRO-01：題名 placeholder */
        const ph = await page.evaluate(`(${PH_FIT})('#v2bTitleInput')`);
        note(`[${tag}] 題名ph「${ph.ph}」 textW=${ph.textW} inner=${ph.inner} over=${ph.over} fs=${ph.fs}`);
        check(`[${tag}] MICRO-01 題名 placeholder が枠内に収まる（clip 0）`,
          ph.over <= 0, JSON.stringify(ph));
        /* font-size を下げて解決していないこと（本文 textarea と同じ水準を保つ） */
        const taFs = await page.evaluate(`parseFloat(getComputedStyle(document.querySelector('.v2c05__textarea')).fontSize)`);
        check(`[${tag}] MICRO-01 題名欄の文字サイズを下げていない`,
          ph.fs >= taFs - 0.5, `title=${ph.fs} textarea=${taFs}`);

        /* MICRO-02：05 サブ見出し */
        const sub = await page.evaluate(`(${LINES})('.v2c05__sub')`);
        if (sub) {
          note(`[${tag}] 05 sub: ${sub.map(x => `「${x}」`).join(' ')}`);
          check(`[${tag}] MICRO-02 05 サブ見出しで「一／冊」が分断されない`,
            !sub.some(l => l.endsWith('一') || l.startsWith('冊')), sub.join(' | '));
          const orph = lang === 'ja'
            ? sub.filter(l => JA_ORPHAN.test(l))
            : sub.filter(l => l.replace(/[.,]/g, '').length <= 3);
          check(`[${tag}] MICRO-02 05 サブ見出しに孤立行がない`, orph.length === 0, sub.join(' | '));
        }
        await shot(page, `05-${tag}`);

        /* ---------- 店内メニュー ---------- */
        await L.openMenu(page);
        await page.waitForTimeout(200);

        /* MICRO-03：短い案内文 */
        const sm = await page.evaluate(`(${LINES})('#experienceMenu .about-accordion-summary')`);
        if (sm) {
          note(`[${tag}] menu summary: ${sm.map(x => `「${x}」`).join(' ')}`);
          const orph = lang === 'ja'
            ? sm.filter(l => JA_ORPHAN.test(l))
            : sm.filter(l => l.replace(/[.,]/g, '').length <= 3);
          check(`[${tag}] MICRO-03 メニュー案内文に孤立行がない`, orph.length === 0, sm.join(' | '));
          if (lang === 'ja') {
            check(`[${tag}] MICRO-03「本棚へ。」が単独行にならない`,
              !sm.some(l => /^本棚へ。?$/.test(l) || /^へ。?$/.test(l)), sm.join(' | '));
          }
        }

        /* MICRO-04：データ保存説明の技術内訳 */
        await page.click('.about-data-accordion summary').catch(() => {});
        await page.waitForTimeout(250);
        const data = await page.evaluate(`(() => {
          const el = document.querySelector('#experienceMenu [data-i18n-html="dataAboutBody"]');
          if (!el) return null;
          const cs = getComputedStyle(el);
          return { text: el.textContent.replace(/\\s+/g, ' ').trim(),
                   fs: +parseFloat(cs.fontSize).toFixed(2),
                   lh: cs.lineHeight,
                   overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
        })()`);
        if (data) {
          /* Legal / Trust Alignment Fix 01（M-06）以後の正式契約。
             利用者データの保存先（IndexedDB / localStorage）と、
             一時記憶にのみ使う sessionStorage を書き分けている。 */
          const wantJa = 'この端末のブラウザ保存領域に保存されます。保存にはIndexedDBとlocalStorageを併用し、表示状態などの一時的な記憶にだけsessionStorageを使います。';
          /* FIX-03（Trust / A11y Limited Fix）で EN の重複表現を解消した後の正式契約 */
          const wantEn = "stored in this device\u2019s browser storage. The service uses both IndexedDB and localStorage for that, and sessionStorage only for temporary display state.";
          check(`[${tag}] MICRO-04 技術内訳が実装事実（併用）になっている`,
            data.text.includes(lang === 'ja' ? wantJa : wantEn), data.text.slice(0, 120));
          check(`[${tag}] MICRO-04 旧い分離説明が残っていない`,
            !/本はIndexedDB|books in IndexedDB|下書きはlocalStorage|drafts in localStorage/.test(data.text),
            data.text.slice(0, 120));
          check(`[${tag}] MICRO-04 長文だからと文字を小さくしていない`, data.fs >= 12, 'fs=' + data.fs);
          check(`[${tag}] MICRO-04 横スクロールが出ない`, !data.overflowX);
        }
        if (isMobile && theme === 'day') await shot(page, `menu-data-${tag}`);
        await L.closeMenu(page);

        if (page._errors.length) note(`[${tag}] JS error: ${page._errors.slice(0, 2).join(' | ')}`);
        await ctx.close();
      }
    }
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
      v.slice(0, 3).forEach(f => console.log(`   ${f.name} → ${f.detail}`));
    }
  }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
