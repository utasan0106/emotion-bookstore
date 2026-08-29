/* =============================================================================
 * V2 Beta0 — Round 2.1 Final Closeout / 用語・EN・店主表現の実挙動監査
 * -----------------------------------------------------------------------------
 * ACTIVE-FIX-06  「店主と会話できる」ように見える表現の実挙動確認
 * ACTIVE-FIX-07  旧用語（納品 / Delivered / 店主に話す / みんなの本棚 等）の残存監査
 * ACTIVE-FIX-10  EN 表示に意図しない日本語が混ざらないかの全画面監査
 *
 * V2 を一周し、そのとき「実際に見えている」文字だけを集める。
 * 利用者本文・題名・写真・実在作品の原題は対象外（既存 smoke と同じ許可リスト）。
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21c_text_audit.js
 * ========================================================================== */
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const JP_RE = /[぀-ゟ゠-ヿ一-鿿]/;
/* 現行 V2 の正式用語と一致しない旧表現 */
const OBSOLETE = ['納品', 'Delivered', '店主に話す', '店主に相談', '店主に題名',
                  'みんなの本棚', 'わたしの本棚', 'わたしの本', 'Talk to the shopkeeper',
                  "Everyone's Bookshelf", 'Ask the shopkeeper'];

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}

/* いま見えている V2 の system text を集める（利用者コンテンツは除外） */
const COLLECT = `(() => {
  const ALLOW = [
    '[data-v2-reader="title"]', '[data-v2-reader="body"]', '[data-v2-reader="note"]',
    '[data-v2-emotion="title"]', '[data-v2-emotion="lead"]',
    '[data-v2-worddetail="body"]',
    '.v2-book-card__title', '.v2c06__grid', '[data-v2-bookshelf="rack"]',
    '.v2c04__works', '[data-v2-works="body"]', '[data-v2-mybooks="body"]',
    '.hero-lang-toggle', 'script', 'style'
  ];
  const roots = Array.from(document.querySelectorAll('.v2-page, #experienceMenu, #bookModal'));
  const visible = roots.filter(p => {
    const cs = getComputedStyle(p);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return p.getClientRects().length > 0;
  });
  const out = [];
  for (const root of visible) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const txt = (n.nodeValue || '').trim();
      if (!txt) continue;
      let el = n.parentElement, skip = false;
      while (el && el !== root.parentElement) {
        if (el.hasAttribute && el.hasAttribute('aria-hidden')) { skip = true; break; }
        if (el.hasAttribute && el.hasAttribute('inert')) { skip = true; break; }
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') { skip = true; break; }
        if (ALLOW.some(s => el.matches && el.matches(s))) { skip = true; break; }
        el = el.parentElement;
      }
      if (!skip) out.push(txt);
    }
  }
  return out;
})()`;

const HITTABLE = `(sel) => {
  const e = document.querySelector(sel);
  if (!e) return 'なし';
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  if (cs.display === 'none' || cs.visibility === 'hidden' || !r.width || !r.height) return '存在するが不可視';
  if (cs.pointerEvents === 'none' || e.closest('[inert]')) return '存在するが操作不可';
  return '到達可能';
}`;

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const lang of ['ja', 'en']) {
    const { ctx, page } = await L.openPage(browser, { width: 390, height: 844, theme: 'day', lang });
    await L.boot(page, base);
    const got = await L.ensureLang(page, lang);
    check(`[${lang}] 言語切替`, got === lang, 'got=' + got);

    const seen = [];
    async function sweep(label) {
      const txt = await page.evaluate(COLLECT);
      seen.push({ label, txt });
    }

    await sweep('01 表紙');
    await L.enterStore(page);           await sweep('02 広間');
    await L.go(page, '03');             await sweep('03 感情棚');
    await L.openShelf(page, 'atatamaru'); await sweep('04 感情詳細');
    await L.go(page, '02');
    await L.go(page, '05');             await sweep('05 編纂室');
    await L.go(page, '02');
    await L.go(page, 'bookshelf').catch(() => {}); await sweep('06/08 本棚');
    await L.openMenu(page);             await sweep('メニュー');
    await page.click('#aboutAccordionBtn').catch(() => {});
    await page.waitForTimeout(250);     await sweep('メニュー/はじめての方へ');
    await page.click('#samplePeekBtn').catch(() => {});
    await page.waitForTimeout(250);     await sweep('メニュー/見本の一冊');
    await page.click('.about-data-accordion summary').catch(() => {});
    await page.waitForTimeout(250);     await sweep('メニュー/データ');

    /* ---- ACTIVE-FIX-07：旧用語の残存 ---- */
    const hits = [];
    for (const s of seen) {
      for (const line of s.txt) {
        for (const w of OBSOLETE) if (line.includes(w)) hits.push(`${s.label}:「${line.slice(0, 40)}」(${w})`);
      }
    }
    check(`[${lang}] ACTIVE-FIX-07 旧用語が user-facing に残っていない`,
      hits.length === 0, [...new Set(hits)].slice(0, 6).join(' / '));

    /* ---- ACTIVE-FIX-10：EN に日本語が混ざらない ---- */
    if (lang === 'en') {
      const jp = [];
      for (const s of seen) for (const line of s.txt) if (JP_RE.test(line)) jp.push(`${s.label}:「${line.slice(0, 30)}」`);
      check(`[en] ACTIVE-FIX-10 EN 表示に日本語が混ざらない`,
        jp.length === 0, [...new Set(jp)].slice(0, 8).join(' / '));
    }

    /* ---- ACTIVE-FIX-06：店主表現の実挙動 ---- */
    const behave = await page.evaluate(`(() => {
      const H = ${HITTABLE};
      const menuBtn = document.querySelector('#experienceMenu [data-menu-page="counter"]');
      return {
        メニュー店主項目の文言: menuBtn ? menuBtn.textContent.trim() : '(なし)',
        メニュー店主項目の遷移先ページ: menuBtn ? menuBtn.getAttribute('data-menu-page') : null,
        題名相談ボタン: H('#titleConsultBtn'),
        店主に話す旧番台UI: H('#counter > *:not(.v2-page)'),
        自由入力の会話field: H('#counter textarea, #counter input[type=text]')
      };
    })()`);
    console.log(`  [${lang}] 店主表現の実挙動: ${JSON.stringify(behave, null, 0)}`);

    await ctx.close();
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) { console.log('--- FAILED ---'); fail.forEach(f => console.log('  ' + f.name + '\n     → ' + f.detail)); }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
