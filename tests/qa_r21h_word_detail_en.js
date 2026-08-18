/* =============================================================================
 * V2 Beta0 — 04「ことば」詳細の EN localization
 * -----------------------------------------------------------------------------
 * EN 表示のとき、語の詳細パネル（意味 / ニュアンス / 近い言葉）に
 * 日本語が残っていないことを 21 感情すべてで機械確認する。
 * JA 表示は現状のまま（日本語が出ること）も併せて確認する。
 *
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21h_word_detail_en.js [--shots <dir>]
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const i = process.argv.indexOf('--shots');
const SHOT = i > -1 ? process.argv[i + 1] : null;
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });

const JP = /[぀-ゟ゠-ヿ一-鿿]/;

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}
function note(m) { console.log('        · ' + m); }

/* 21 感情の ID は canonical（V2_EMOTION_WORDS）から実行時に採る */
const ALL_IDS = `(() => Object.keys(window.V2_EMOTION_WORDS || {}))()`;

/* selectEmotion は「いまの棚の文脈にある感情」しか選べないので、
   棚 → その棚に属する感情、の対応を実行時に採る。 */
const SHELF_MAP = `(() => {
  const A = window.V2EmotionShelfAdapter;
  if (!A || typeof A.MAJOR_SHELVES !== 'function') return [];
  return A.MAJOR_SHELVES().map(s => ({
    id: s.id,
    emotions: (s.emotions || []).map(e => (typeof e === 'string' ? e : e.id))
  }));
})()`;

/* 語詳細パネルを開いて、見出しと本文をそのまま読む */
const READ = `(() => {
  const body = document.querySelector('[data-v2-worddetail="body"]');
  if (!body || body.hasAttribute('hidden')) return null;
  const blocks = Array.from(body.querySelectorAll('.v2c04__wd')).map(w => ({
    head: (w.querySelector('.v2c04__wd-h') || {}).textContent || '',
    body: (w.querySelector('.v2c04__wd-body') || {}).textContent || '',
    chips: Array.from(w.querySelectorAll('.v2c04__wd-chip')).map(c => c.textContent.trim())
  }));
  return { state: body.getAttribute('data-v2-worddetail-state'), blocks };
})()`;

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const lang of ['en', 'ja']) {
    for (const vp of [{ label: '390', width: 390, height: 844 }, { label: '1440', width: 1440, height: 900 }]) {
      /* JA は 390 だけで足りる（回帰確認用） */
      if (lang === 'ja' && vp.label === '1440') continue;
      const tag = `${vp.label}-${lang}`;
      const { ctx, page } = await L.openPage(browser, { ...vp, theme: 'day', lang });
      await L.boot(page, base);
      if ((await L.ensureLang(page, lang)) !== lang) { await ctx.close(); continue; }
      await L.enterStore(page);

      const ids = await page.evaluate(ALL_IDS);
      check(`[${tag}] 21 感情の ID を取得できる`, ids.length === 21, 'count=' + ids.length);
      const shelves = await page.evaluate(SHELF_MAP);
      /* MAJOR_SHELVES() は 7 棚しか返さない。8 棚目「まだ名前がない」は
         棚そのものが moyamoya に対応するので、明示的に足す。 */
      shelves.push({ id: 'namae-ga-nai', emotions: ['moyamoya'] });
      const seenIds = new Set();

      const jpHits = [];
      let covered = 0;
      for (const shelf of shelves) {
        await L.go(page, '03');
        await L.openShelf(page, shelf.id);
        for (const id of shelf.emotions) {
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          const opened = await page.evaluate(`(() => {
            const A = window.V2EmotionShelfAdapter;
            if (!A || typeof A.selectEmotion !== 'function') return false;
            return !!A.selectEmotion(${JSON.stringify(id)});
          })()`);
          if (!opened) { check(`[${tag}] ${id} の語詳細を開ける`, false, 'selectEmotion 失敗'); continue; }
          await page.waitForTimeout(120);
          const got = await page.evaluate(READ);
          if (!got || !got.blocks.length) { check(`[${tag}] ${id} の語詳細が描画される`, false, JSON.stringify(got)); continue; }
          covered++;

        if (lang === 'en') {
          const hits = [];
          for (const b of got.blocks) {
            if (JP.test(b.head)) hits.push(`${id}/見出し「${b.head}」`);
            if (JP.test(b.body)) hits.push(`${id}/本文「${b.body.slice(0, 26)}」`);
            b.chips.forEach(c => { if (JP.test(c)) hits.push(`${id}/近い言葉「${c}」`); });
          }
          if (hits.length) jpHits.push(...hits);
        } else {
          /* JA 回帰：日本語が出ていること */
          const anyJa = got.blocks.some(b => JP.test(b.body));
          if (!anyJa) jpHits.push(`${id}: JA なのに日本語本文がない`);
        }
        }
      }
      check(`[${tag}] 21 感情すべての語詳細を描画できた`, covered === 21, 'covered=' + covered);
      if (lang === 'en') {
        check(`[en/${vp.label}] 語詳細に日本語が残っていない（21 感情）`,
          jpHits.length === 0, [...new Set(jpHits)].slice(0, 8).join(' / '));
      } else {
        check(`[ja/${vp.label}] JA 表示は日本語のまま（回帰なし）`,
          jpHits.length === 0, jpHits.slice(0, 5).join(' / '));
      }

      /* 見出しが CEO 指定どおりか（EN） */
      if (lang === 'en') {
        await L.go(page, '03');
        await L.openShelf(page, 'shizumu');
        await page.evaluate(`window.V2EmotionShelfAdapter.selectEmotion('kanashii')`);
        await page.waitForTimeout(200);
        const got = await page.evaluate(READ);
        if (!got) { check(`[${tag}] EN 見出しを読める`, false, 'panel なし'); await ctx.close(); continue; }
        const heads = got.blocks.map(b => b.head.trim());
        note(`[${tag}] EN 見出し: ${heads.join(' / ')}`);
        check(`[${tag}] EN 見出しが Meaning / Nuance / Related words`,
          heads.join('|') === 'Meaning|Nuance|Related words', heads.join(' / '));
        note(`[${tag}] EN 例（kanashii）: ${got.blocks[0].body.slice(0, 90)}`);
        if (SHOT) {
          await page.evaluate(`(() => { const e = document.querySelector('[data-v2-worddetail="body"]');
            if (e) e.scrollIntoView({ block: 'center' }); })()`);
          await page.waitForTimeout(250);
          await page.screenshot({ path: path.join(SHOT, `word-detail-${tag}.png`) });
        }
        const ov = await page.evaluate(`document.documentElement.scrollWidth > innerWidth + 1`);
        check(`[${tag}] 横スクロールが出ない`, !ov);
      }

      if (page._errors.length) note(`[${tag}] JS error: ${page._errors.slice(0, 2).join(' | ')}`);
      await ctx.close();
    }
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) { console.log('--- FAILED ---'); fail.forEach(f => console.log('  ' + f.name + '\n     → ' + f.detail)); }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
