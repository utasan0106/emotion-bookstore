/* =============================================================================
 * V2 Beta0 — 21感情 自動 Quality Audit（Final Field Fix 横断検証）
 * -----------------------------------------------------------------------------
 * 21感情すべての 04 ページを実ブラウザで開き、以下を機械的に確認する。
 *   1. Hero：title 表示・lead（説明）が途中分割で孤立行になっていない
 *      （FIX 8：390px で 26字以下の短文 lead は 1 行、それ以外も 3 行以内）
 *   2. ことば：意味 / ニュアンス / 近い言葉 の欠落なし（canonical どおり）
 *   3. 近い言葉：21語と一致する語だけが walk chip（FIX 2 の全数確認）
 *   4. 作品：在庫が引けて 3 件表示・外部リンクは https のみ（FIX 3）
 *   5. 横スクロール（overflow）が 320 / 390 で発生していない
 *   6. Hero に sprig 装飾が残っていない（FIX 6）
 *
 * 使い方: NODE_PATH=<playwright置き場> node tests/qa_beta0_21emotion_audit.js
 * 読み取りと計測のみ。storage / GA4 / 外部通信の契約には触れない。
 * ========================================================================== */
const { chromium } = require('playwright');
const lib = require('./qa_r21_lib');

/* CHROMIUM_PATH があればそれを使い、無ければ playwright 同梱の chromium に任せる */
const EXEC = process.env.CHROMIUM_PATH ||
  (require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);

/* 感情 → 入口棚（canonical。shitto は primary の惹かれる経由で開く） */
const ENTRY = {
  hazumu: ['ureshii', 'wakuwaku', 'hokorashii'],
  atatamaru: ['ando', 'kansha', 'itooshii'],
  hikareru: ['akogare', 'shitto', 'natsukashii'],
  shizumu: ['kanashii', 'kodoku', 'gakkari'],
  zawatsuku: ['fuan', 'aseri', 'odoroki'],
  butsukaru: ['ikari', 'kuyashii'],
  miwohiku: ['hazukashii', 'ushirometai', 'keno'],
  'namae-ga-nai': ['moyamoya']
};

(async () => {
  const srv = await lib.serve();
  const base = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
  const problems = [];
  let checked = 0;

  for (const width of [320, 390]) {
    const { ctx, page } = await lib.openPage(browser, { width, height: 844, theme: 'day' });
    await lib.boot(page, base);
    await lib.enterStore(page);
    await page.waitForTimeout(300);

    for (const [shelf, emotions] of Object.entries(ENTRY)) {
      for (const emo of emotions) {
        await page.evaluate(`(() => {
          V2EmotionShelfAdapter.enterShelf('${shelf}');
          V2EmotionShelfAdapter.selectEmotion('${emo}');
        })()`);
        await page.waitForTimeout(220);

        const r = await page.evaluate(`(() => {
          const q = s => document.querySelector(s);
          const lead = q('[data-v2-emotion="lead"]');
          const leadCS = getComputedStyle(lead);
          const leadLines = Math.round(lead.getBoundingClientRect().height / parseFloat(leadCS.lineHeight));
          const wd = q('[data-v2-worddetail="body"]');
          const heads = [...wd.querySelectorAll('.v2c04__wd-h')].map(h => h.textContent);
          const walk = [...wd.querySelectorAll('button.v2c04__wd-chip--walk')].map(c => c.textContent);
          const spans = [...wd.querySelectorAll('span.v2c04__wd-chip')].map(c => c.textContent);
          const labels = {};
          (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).forEach(c => { if (c && c.id !== 'unfiled') labels[c.label] = c.id; });
          const works = q('[data-v2-works="body"]');
          const links = [...works.querySelectorAll('a')].map(a => a.href);
          return {
            title: q('[data-v2-emotion="title"]').textContent,
            leadText: lead.textContent,
            leadLines,
            state: wd.getAttribute('data-v2-worddetail-state'),
            heads, walk, spans,
            walkAllValid: walk.every(t => labels[t]),
            spanNoneValid: spans.every(t => !labels[t]),
            worksCount: works.getAttribute('data-v2-works-count'),
            worksSource: works.getAttribute('data-v2-works-source'),
            linksHttps: links.every(h => h.startsWith('https://')),
            sprig: !!q('.v2c04__hero .v2c04__sprig'),
            hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
          };
        })()`);
        checked++;

        const id = `${emo}@${width}(${shelf})`;
        if (!r.title) problems.push(`${id}: title 空`);
        if (r.state !== 'ready') problems.push(`${id}: ことば欠落 state=${r.state}`);
        if (width === 390 && r.leadText.length <= 26 && r.leadLines > 1) {
          problems.push(`${id}: 短文leadが${r.leadLines}行「${r.leadText}」`);
        }
        if (r.leadLines > 3) problems.push(`${id}: leadが${r.leadLines}行`);
        if (!r.walkAllValid) problems.push(`${id}: walk chipに21語外 ${JSON.stringify(r.walk)}`);
        if (!r.spanNoneValid) problems.push(`${id}: 21語一致がspanのまま ${JSON.stringify(r.spans)}`);
        if (r.worksSource !== 'inventory' || r.worksCount !== '3') {
          problems.push(`${id}: works ${r.worksSource}/${r.worksCount}`);
        }
        if (!r.linksHttps) problems.push(`${id}: 非https link`);
        if (r.sprig) problems.push(`${id}: hero sprig 残存`);
        if (r.hscroll) problems.push(`${id}: 横スクロール発生`);
      }
    }
    const errs = page._errors.filter(e => !/ERR_CONNECTION_RESET/.test(e));
    if (errs.length) problems.push(`pageerror@${width}: ${errs.join(' | ')}`);
    await ctx.close();
  }

  await browser.close();
  srv.close();
  console.log(`checked=${checked} (21感情 × 320/390)`);
  if (problems.length) {
    console.log('PROBLEMS:');
    problems.forEach(p => console.log('  ✗ ' + p));
    process.exit(1);
  }
  console.log('ALL PASS');
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
