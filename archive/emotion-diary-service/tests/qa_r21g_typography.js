/* =============================================================================
 * V2 Beta0 — FIX-H / 全主要画面の改行・折り返し Typography QA
 * -----------------------------------------------------------------------------
 * コピーを書き換えるための test ではない。
 * 折り返し後の「実際の行」を採り、次を横断的に検出する。
 *   ・1〜2 文字だけ次行へ落ちる（EN は 1 単語 3 文字以下）
 *   ・助詞・句読点・閉じ括弧だけが次行へ落ちる
 *   ・横スクロール / 文字の切れ
 *
 * 「本来 1 行で十分な短文の 2 行化」はレイアウト意図と切り分けられないので、
 * 判定はせず観測値として出す（人が読む用）。
 *
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21g_typography.js [--shots <dir>]
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

async function waitUntil(page, expr, timeout) {
  const end = Date.now() + (timeout || 20000);
  while (Date.now() < end) { if (await page.evaluate(expr)) return true; await page.waitForTimeout(150); }
  return false;
}

/* 折り返し後の実際の行を返す */
const LINES = `(sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const r0 = el.getBoundingClientRect();
  if (!r0.width || !r0.height) return null;
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

/* 助詞・記号だけ、または 1〜2 文字だけの行を「孤立」とみなす */
const JA_ORPHAN = /^[。、・！？）」』〕】]*$|^.{1,2}$/;
const JA_PARTICLE_TAIL = /^(を|に|は|が|へ|で|と|も|の|や|か|ね|よ|た|す|ます|です|ました|ません)[。、]?$/;

/* 判定は UI 言語ではなく、その行の字種で選ぶ。
   04「ことば」詳細のように、EN 表示でも中身が日本語データのままの箇所があるため。 */
const JA_CHAR = /[぀-ゟ゠-ヿ一-鿿]/;
function orphans(lines, lang) {
  if (!lines || lines.length < 2) return [];
  const isJa = lines.some(l => JA_CHAR.test(l));
  return lines.slice(1).filter(l => isJa
    ? (JA_ORPHAN.test(l) || JA_PARTICLE_TAIL.test(l))
    : l.replace(/[.,!?;:]/g, '').length <= 3);
}

/* 画面ごとに測る対象。sel は代表要素、label は報告用 */
const TARGETS = {
  '02': [
    ['.v2c02__lead', '02 lead'],
    ['.v2c02__card:nth-of-type(1) .v2c02__carddesc', '02 card1'],
    ['.v2c02__card:nth-of-type(2) .v2c02__carddesc', '02 card2'],
    ['.v2c02__card:nth-of-type(3) .v2c02__carddesc', '02 card3']
  ],
  '03': [
    ['.v2c03__lead', '03 lead'],
    ['.v2c03__guide', '03 案内']
  ],
  '04': [
    ['.v2c04__lead', '04 hero lead'],
    ['[data-v2-region-panel="sakuhin"] .v2c04__intro', '04 作品 lead'],
    ['[data-v2-region-panel="jibun"] .v2c04__intro', '04 自分の本 lead'],
    ['.v2c04 .v2-detail__empty-title', '04 空状態 title'],
    ['.v2c04 .v2-detail__empty-note', '04 空状態 note'],
    ['.v2c04__works-hold-title', '04 作品 hold title'],
    ['.v2c04__works-hold-note', '04 作品 hold note']
  ],
  '05': [
    ['.v2c05__sub', '05 サブ見出し'],
    ['.v2c05__autosave', '05 自動保存'],
    ['.v2c05__photohint', '05 写真説明'],
    ['.v2c05__assure', '05 本文保存説明']
  ],
  '06': [
    ['.v2c06__lead', '06 lead'],
    ['.v2c06__invite-n', '06 新しく書く 補助']
  ],
  '08': [
    ['.v2c08__copy', '08 コピー'],
    ['.v2c08__tail', '08 末尾']
  ],
  '07': [
    ['.v2c07__body', '07 本文']
  ],
  'menu': [
    ['#experienceMenu .about-accordion-summary', 'menu 案内文'],
    ['#experienceMenu .about-data-accordion > summary', 'menu data summary'],
    ['#experienceMenu .legal-row a:nth-of-type(1)', 'menu privacy'],
    ['#sampleBookInline .sample-book-badge', '見本 badge'],
    ['#sampleBookInline .sample-inline-story', '見本 本文']
  ],
  'word': [
    ['.v2c04__worddef .v2c04__wd:nth-of-type(1) .v2c04__wd-body', '04 意味 本文'],
    ['.v2c04__worddef .v2c04__wd:nth-of-type(2) .v2c04__wd-body', '04 ニュアンス 本文']
  ]
};

async function bindOne(page, story, title) {
  await L.go(page, '02'); await L.go(page, '05');
  await page.fill('#v2bStoryInput', story);
  await page.waitForTimeout(120);
  if (title) { await page.fill('#v2bTitleInput', title); await page.waitForTimeout(120); }
  await page.evaluate(`document.querySelector('[data-v2-write="bind"]').click()`);
  if (!await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !!(b && !b.classList.contains('hidden')); })()`, 25000)) return false;
  await page.evaluate(`(() => { const s = document.getElementById('unfiledShelfSkip'); if (s) s.click(); })()`);
  await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !b || b.classList.contains('hidden'); })()`, 20000);
  await page.waitForTimeout(1000);
  return true;
}

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const lang of ['ja', 'en']) {
    for (const vp of [{ label: '390', width: 390, height: 844 }, { label: '1440', width: 1440, height: 900 }]) {
      const tag = `${vp.label}-${lang}`;
      const { ctx, page } = await L.openPage(browser, { ...vp, theme: 'day', lang });
      await L.boot(page, base);
      if ((await L.ensureLang(page, lang)) !== lang) { await ctx.close(); continue; }

      const seen = [];
      const sweep = async (screen) => {
        for (const [sel, label] of TARGETS[screen]) {
          const lines = await page.evaluate(`(${LINES})(${JSON.stringify(sel)})`);
          if (!lines || !lines.length) continue;
          const orp = orphans(lines, lang);
          seen.push({ label, lines, orp });
          note(`[${tag}] ${label}: ${lines.map(x => `「${x}」`).join(' ')}`);
          check(`[${tag}] ${label} に孤立行がない`, orp.length === 0, lines.join(' | '));
        }
        const ov = await page.evaluate(`document.documentElement.scrollWidth > innerWidth + 1`);
        check(`[${tag}] ${screen} で横スクロールが出ない`, !ov);
      };

      await L.enterStore(page); await sweep('02');
      await L.go(page, '03'); await sweep('03');
      await L.openShelf(page, 'shizumu'); await sweep('04');
      /* ことば詳細（意味 / ニュアンス / 近い言葉）を開く */
      await page.evaluate(`(() => {
        const b = document.querySelector('[data-v2-emotion="words"] [data-v2-emotion-id]');
        if (b) b.click();
      })()`);
      await page.waitForTimeout(450);
      await sweep('word');
      if (vp.label === '390' && lang === 'ja') await shot(page, `word-detail-${tag}`);

      await L.go(page, '02'); await L.go(page, '05'); await sweep('05');
      await L.go(page, '02'); await L.go(page, 'bookshelf'); await sweep('08');
      await bindOne(page, 'typography sweep 用の一冊。', 'ためし');
      await sweep('06');
      await page.evaluate(`(() => { const b = document.querySelector('[data-v2-bookshelf="rack"] .v2-shelf__spine'); if (b) b.click(); })()`);
      await page.waitForTimeout(700);
      await sweep('07');

      await L.openMenu(page); await page.waitForTimeout(250);
      await page.click('#aboutAccordionBtn').catch(() => {});
      await page.waitForTimeout(300);
      await page.click('#samplePeekBtn').catch(() => {});
      await page.waitForTimeout(400);
      await sweep('menu');
      await L.closeMenu(page);

      if (page._errors.length) note(`[${tag}] JS error: ${page._errors.slice(0, 2).join(' | ')}`);
      await ctx.close();
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
      v.slice(0, 2).forEach(f => console.log(`   ${f.name} → ${f.detail}`));
    }
  }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
