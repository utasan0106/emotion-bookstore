/* =============================================================================
 * V2 Beta0 — Round 2.1 Final Closeout / Visual Evidence
 * -----------------------------------------------------------------------------
 * 指示書 §24 が求める証跡スクリーンショットを、実ブラウザからそのまま撮る。
 *
 *   390 mobile   02 / 03 / 04 心があたたまる / 04 作品 / 05 empty / 05 long /
 *                05 portrait photo / 製本・題名決定 / 07 portrait photo /
 *                book detail modal / Menu 見出し / Menu accordion closed /
 *                Menu accordion open / Menu 店主項目 / EN Reader
 *   1024 / 1440  01 / 02 / 03 / 04 / 05 / 06 / 07 / 08 / Menu
 *   Initial Paint  direct URL / hard reload
 *
 * 何も変更しない（観測のみ）。撮影のために一時的に写真を差し込むが、
 * 保存はせず、撮り終えたら DOM から取り除く。
 * 使い方: node tests/qa_r21c_evidence.js <出力ディレクトリ>
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const OUT = process.argv[2];
if (!OUT) { console.error('出力ディレクトリを指定してください'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const taken = [];
async function shot(page, name) {
  const f = path.join(OUT, name + '.png');
  await page.screenshot({ path: f });
  taken.push(name);
  console.log('  shot  ' + name);
}
async function waitUntil(page, expr, timeout) {
  const end = Date.now() + (timeout || 15000);
  while (Date.now() < end) { if (await page.evaluate(expr)) return true; await page.waitForTimeout(150); }
  return false;
}

const PORTRAIT = 'data:image/svg+xml;base64,' + Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="1200" fill="#8a7455"/>
    <circle cx="450" cy="420" r="200" fill="#e8dcc4"/>
    <rect x="6" y="6" width="888" height="1188" fill="none" stroke="#f2ead9" stroke-width="10"/>
    <text x="450" y="1060" font-size="110" fill="#f6efe0" text-anchor="middle" font-family="sans-serif">photo</text>
  </svg>`).toString('base64');

const LONG_DRAFT = 'きょうは、いつもより少しだけ早く目が覚めた。' +
  'カーテンの隙間から入る光がやわらかくて、しばらくそのまま天井を見ていた。' +
  '思い出したのは、去年の秋に歩いた坂道のこと。' +
  '別に何があったわけでもないのに、あの日のにおいだけが、いまも残っている。' +
  'こういう、誰にも話さないままの日のことを、どこかに置いておきたかった。';

async function attachPhoto05(page) {
  await page.evaluate(async (src) => {
    const prev = document.querySelector('.v2c05__photoprev');
    const im = document.querySelector('.v2c05__photoimg');
    if (!prev || !im) return;
    prev.removeAttribute('hidden');
    im.setAttribute('src', src);
    await new Promise(r => { if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
  }, PORTRAIT);
  await page.waitForTimeout(250);
}
async function detachPhoto05(page) {
  await page.evaluate(`(() => {
    const p = document.querySelector('.v2c05__photoprev');
    if (p) p.setAttribute('hidden', '');
    const i = document.querySelector('.v2c05__photoimg');
    if (i) i.removeAttribute('src');
  })()`);
}

/* 受け取り頁を確実に閉じる。棚を選べたら confirm、選べなければ skip。 */
async function closePicker(page) {
  const done = await page.evaluate(`(() => {
    const sel = document.querySelector('#unfiledShelfPicker select');
    const real = sel && Array.from(sel.options).find(o => o.value && o.value !== 'unfiled');
    if (real) {
      sel.value = real.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      const c = document.getElementById('unfiledShelfConfirm');
      if (c) { c.click(); return 'confirm'; }
    }
    const s = document.getElementById('unfiledShelfSkip');
    if (s) { s.click(); return 'skip'; }
    return 'none';
  })()`);
  const closed = await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !b || b.classList.contains('hidden'); })()`, 15000);
  if (!closed) {
    await page.evaluate(`(() => { const s = document.getElementById('unfiledShelfSkip'); if (s) s.click(); })()`);
    await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
      return !b || b.classList.contains('hidden'); })()`, 15000);
  }
  await page.waitForTimeout(1000);
  return done;
}

/* 一冊書いて製本し、受け取り頁（題名決定）で止める */
async function bindAndHold(page, story, title) {
  await L.go(page, '02'); await L.go(page, '05');
  await page.fill('#v2bStoryInput', story);
  await page.waitForTimeout(150);
  if (title) { await page.fill('#v2bTitleInput', title); await page.waitForTimeout(150); }
  await page.evaluate(`document.querySelector('[data-v2-write="bind"]').click()`);
  return waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !!(b && !b.classList.contains('hidden')); })()`, 20000);
}

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  /* ===================== 390 mobile（DAY / JA） ===================== */
  {
    const { ctx, page } = await L.openPage(browser, { width: 390, height: 844, theme: 'day', lang: 'ja' });
    await L.boot(page, base);
    await L.enterStore(page);
    await shot(page, 'm390-02-lobby');
    await L.go(page, '03'); await shot(page, 'm390-03-shelves');
    await L.openShelf(page, 'atatamaru'); await shot(page, 'm390-04-atatamaru');
    await page.evaluate(`(() => { const s = document.querySelector('[data-v2-region-panel="sakuhin"]');
      if (s) s.scrollIntoView({ block: 'start' }); })()`);
    await page.waitForTimeout(400); await shot(page, 'm390-04-works');

    await L.go(page, '02'); await L.go(page, '05');
    await shot(page, 'm390-05-empty-draft');
    await page.fill('#v2bStoryInput', LONG_DRAFT); await page.waitForTimeout(500);
    await shot(page, 'm390-05-long-draft');
    await attachPhoto05(page); await shot(page, 'm390-05-portrait-photo');
    await detachPhoto05(page);

    /* 製本・題名決定（受け取り頁） */
    await page.fill('#v2bStoryInput', '');
    const held = await bindAndHold(page, '証跡用の一冊。写真つきで本にする。', '坂道のにおい');
    if (held) { await page.waitForTimeout(400); await shot(page, 'm390-binding-title'); }
    await closePicker(page);

    /* 07 Reader に写真を挟んだ状態 */
    await page.evaluate(`(() => { const b = document.querySelector('[data-v2-bookshelf="rack"] .v2-shelf__spine');
      if (b) b.click(); })()`);
    await page.waitForTimeout(800);
    await page.evaluate(async (src) => {
      const fig = document.querySelector('.v2c07__photo');
      if (!fig) return;
      fig.classList.remove('v2-placeholder');
      let im = fig.querySelector('img');
      if (!im) { im = document.createElement('img'); im.className = 'v2-reader__cover-img'; fig.appendChild(im); }
      im.setAttribute('src', src);
      await new Promise(r => { if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
    }, PORTRAIT);
    await page.waitForTimeout(300);
    await shot(page, 'm390-07-portrait-photo');

    /* book detail modal（写真つき） */
    await page.evaluate(async (src) => {
      const m = document.getElementById('bookModal');
      if (!m) return;
      const ph = document.getElementById('modalPhoto');
      if (ph) {
        ph.classList.remove('hidden'); ph.removeAttribute('hidden');
        let im = ph.querySelector('img');
        if (!im) { im = document.createElement('img'); ph.appendChild(im); }
        im.setAttribute('src', src);
        await new Promise(r => { if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
      }
      m.classList.remove('hidden');
    }, PORTRAIT);
    await page.waitForTimeout(350);
    await shot(page, 'm390-book-detail-modal');
    await page.evaluate(`(() => { const m = document.getElementById('bookModal'); if (m) m.classList.add('hidden'); })()`);

    /* Menu：見出し / accordion closed / accordion open / 店主項目 */
    await L.openMenu(page);
    await page.waitForTimeout(250);
    await shot(page, 'm390-menu-accordion-closed');
    await page.evaluate(`(() => { const h = Array.from(document.querySelectorAll('#experienceMenu .experience-menu-section'))
      .find(s => s.getAttribute('data-i18n') === 'v2MenuTrustSection');
      if (h) h.scrollIntoView({ block: 'center' }); })()`);
    await page.waitForTimeout(300);
    await shot(page, 'm390-menu-section-heading');
    await page.click('.about-data-accordion summary').catch(() => {});
    await page.waitForTimeout(350);
    await shot(page, 'm390-menu-accordion-open');
    await page.evaluate(`(() => { const b = document.querySelector('#experienceMenu [data-menu-page="counter"]');
      if (b) b.scrollIntoView({ block: 'center' }); })()`);
    await page.waitForTimeout(300);
    await shot(page, 'm390-menu-shopkeeper-item');
    await L.closeMenu(page);

    /* EN Reader */
    await L.ensureLang(page, 'en');
    await L.go(page, '02'); await L.go(page, 'bookshelf');
    await page.waitForTimeout(400);
    await page.evaluate(`(() => { const b = document.querySelector('[data-v2-bookshelf="rack"] .v2-shelf__spine');
      if (b) b.click(); })()`);
    await page.waitForTimeout(800);
    await shot(page, 'm390-07-reader-en');

    await ctx.close();
  }

  /* ===================== Desktop 1024 / 1440 × DAY / NIGHT ===================== */
  for (const theme of ['day', 'night']) {
    for (const vp of [{ label: '1024', width: 1024, height: 768 }, { label: '1440', width: 1440, height: 900 }]) {
      const { ctx, page } = await L.openPage(browser, { ...vp, theme, lang: 'ja' });
      await L.boot(page, base);
      const p = `d${vp.label}-${theme}`;
      await shot(page, `${p}-01`);
      await L.enterStore(page); await shot(page, `${p}-02`);
      await L.go(page, '03'); await shot(page, `${p}-03`);
      await L.openShelf(page, 'atatamaru'); await shot(page, `${p}-04`);
      await L.go(page, '02'); await L.go(page, '05'); await shot(page, `${p}-05`);
      /* 08（空の本棚） */
      await L.go(page, '02'); await L.go(page, 'bookshelf'); await shot(page, `${p}-08-empty`);
      /* 一冊入れて 06 / 07 */
      const held = await bindAndHold(page, 'desktop 証跡用の一冊。', 'デスクトップの一冊');
      if (held) {
        await closePicker(page);
      }
      await shot(page, `${p}-06`);
      await page.evaluate(`(() => { const b = document.querySelector('[data-v2-bookshelf="rack"] .v2-shelf__spine');
        if (b) b.click(); })()`);
      await page.waitForTimeout(800);
      await shot(page, `${p}-07`);
      await L.openMenu(page); await page.waitForTimeout(300);
      await shot(page, `${p}-menu`);
      await L.closeMenu(page);
      await ctx.close();
    }
  }

  /* ===================== Initial Paint ===================== */
  for (const [name, vp] of [['m390', { width: 390, height: 844 }], ['d1440', { width: 1440, height: 900 }]]) {
    const { ctx, page } = await L.openPage(browser, { ...vp, theme: 'day', lang: 'ja' });
    /* direct URL：mount 完了を待たず、最初に描かれた面をそのまま撮る */
    await page.goto(base, { waitUntil: 'commit' });
    await page.waitForTimeout(120);
    await shot(page, `paint-${name}-direct-url-early`);
    await page.waitForSelector('html[data-v2-mounted="true"]', { timeout: 15000 });
    await page.waitForTimeout(300);
    await shot(page, `paint-${name}-direct-url-mounted`);
    /* hard reload */
    await page.evaluate('location.reload(true)').catch(() => {});
    await page.waitForTimeout(120);
    await shot(page, `paint-${name}-hard-reload-early`);
    await page.waitForSelector('html[data-v2-mounted="true"]', { timeout: 15000 });
    await page.waitForTimeout(300);
    await shot(page, `paint-${name}-hard-reload-mounted`);
    await ctx.close();
  }

  await browser.close(); srv.close();
  console.log(`\n証跡 ${taken.length} 枚を ${OUT} に保存しました。`);
})().catch(e => { console.error(e); process.exit(2); });
