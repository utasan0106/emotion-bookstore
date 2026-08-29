/* =============================================================================
 * V2 Beta0 — Round 2.1 / FIX-08・FIX-09 の実ブラウザ検証
 * -----------------------------------------------------------------------------
 * FIX-08  店内メニューの「見本の一冊」が、現在の Reader（07）の紙面と一致すること
 * FIX-09  「この書店とデータについて」が現在の実装事実と一致すること
 *         （overclaim 0 / 現在提供していないサービスを現在形で書かない）
 *
 * 使い方: node tests/qa_r21_menu_sync.js
 * ========================================================================== */
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}

/* 現在の実装で「提供していない」もの、および言い過ぎの表現。
   Menu 本文にこれらが現在形で残っていたら FAIL にする。 */
const OBSOLETE_JA = [
  '外部の検索サービスに問い合わせ',
  'みんなの本棚',
  '運営者があなたの記録を読むことはできません',
  '運営者のサーバーへは送信されません'
];
const OBSOLETE_EN = [
  'fetched from an external search service',
  "Everyone's Bookshelf",
  "we can't read your records",
  'never sent to our servers'
];
/* 実装事実として必ず触れているべき論点 */
const REQUIRED_JA = [
  'ブラウザ保存領域',      // 第一階層は利用者に分かる表現
  'アカウント登録はなく',   // アカウントの有無
  '別の端末',              // 別端末への自動移行なし
  '同じ端末の同じブラウザ', // 共有端末での閲覧可能性
  '容量',                  // 容量制限
  '故障',                  // 故障
  '復元用のデータはない',   // 運営側の復元可否
  'バックアップ',          // 現在実在する backup
  '外部のAI',              // private content の外部 AI 送信有無
  '通常の通信が伴います',   // technical communication を private content と分ける
  '自分の本棚'             // 現行の本棚呼称
];

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const lang of ['ja', 'en']) {
    const { ctx, page } = await L.openPage(browser, { width: 390, height: 844, theme: 'day', lang });
    await L.boot(page, base);
    const got = await L.ensureLang(page, lang);
    check(`[${lang}] 言語を切り替えられる`, got === lang, 'got=' + got);
    await L.enterStore(page);
    await L.openMenu(page);
    await page.click('#aboutAccordionBtn').catch(() => {});
    await page.waitForTimeout(250);

    /* ---------- FIX-08：見本の一冊 ---------- */
    await page.click('#samplePeekBtn').catch(() => {});
    await page.waitForTimeout(250);
    const s = await page.evaluate(`(() => {
      const box = document.getElementById('sampleBookInline');
      const q = id => document.getElementById(id);
      const order = Array.from(box.children).map(el => el.className || el.id);
      return {
        open: !box.classList.contains('hidden'),
        badge: (box.querySelector('.sample-book-badge') || {}).textContent || '',
        title: (q('sampleInlineTitle') || {}).textContent || '',
        date: (q('sampleInlineDate') || {}).textContent || '',
        cat: (q('sampleInlineCat') || {}).textContent || '',
        story: (q('sampleInlineStory') || {}).textContent || '',
        hasNoteBlock: !!q('sampleInlineNote') || !!q('sampleInlineNoteText'),
        order,
        // 実物の Reader 側の用語
        readerDateSuffix: (document.querySelector('.v2c07__date-suffix') || {}).textContent || '',
        readerNoteLabel: (document.querySelector('.v2c07__notelabel') || {}).textContent || '',
        readerNoteHidden: (document.querySelector('.v2c07__notebox') || {}).hasAttribute
          ? document.querySelector('.v2c07__notebox').hasAttribute('hidden') : null
      };
    })()`);
    check(`[${lang}] FIX-08 見本が開く`, s.open);
    check(`[${lang}] FIX-08 「見本の一冊」であることを維持している`, s.badge.length > 0, s.badge);
    check(`[${lang}] FIX-08 旧「納品 / Delivered」表記が残っていない`,
      !/納品|Delivered/.test(s.date), 'date=' + s.date);
    check(`[${lang}] FIX-08 日付が現在の Reader と同じ書き方`,
      lang === 'ja' ? s.date.includes(s.readerDateSuffix) && /^\d{4}年\d{1,2}月\d{1,2}日/.test(s.date)
                    : /^Bound on [A-Z][a-z]+ \d{1,2}, \d{4}$/.test(s.date),
      'date=' + s.date + ' suffix=' + s.readerDateSuffix);
    check(`[${lang}] FIX-08 棚は棚名のみ（「〜の棚」を付けない＝Reader と同じ）`,
      !/の棚/.test(s.cat) && !/ shelf$/.test(s.cat), 'cat=' + s.cat);
    check(`[${lang}] FIX-08 実物に無い「店主のことば」欄を見本だけに残していない`,
      !s.hasNoteBlock);
    check(`[${lang}] FIX-08 Reader の覚え書き欄は既定で hidden（実物に note が無い裏付け）`,
      s.readerNoteHidden === true, 'hidden=' + s.readerNoteHidden);
    const iTitle = s.order.findIndex(c => /sample-inline-title/.test(c));
    const iDate = s.order.findIndex(c => /sample-inline-date/.test(c));
    const iCat = s.order.findIndex(c => /sample-inline-cat/.test(c));
    const iStory = s.order.findIndex(c => /sample-inline-story/.test(c));
    check(`[${lang}] FIX-08 並びが Reader と同じ（題名 → 日付 → 棚 → 本文）`,
      iTitle < iDate && iDate < iCat && iCat < iStory, s.order.join(' > '));

    /* ---------- FIX-09：データ説明 ---------- */
    await page.click('.about-data-accordion summary').catch(() => {});
    await page.waitForTimeout(250);
    const body = await page.evaluate(`(() => {
      const el = document.querySelector('.about-data-content [data-i18n-html="dataAboutBody"]');
      return el ? el.textContent : '';
    })()`);
    check(`[${lang}] FIX-09 データ説明が表示される`, body.length > 100, 'len=' + body.length);
    const obsolete = (lang === 'ja' ? OBSOLETE_JA : OBSOLETE_EN).filter(w => body.includes(w));
    check(`[${lang}] FIX-09 旧記述・言い過ぎの表現が残っていない`, obsolete.length === 0, obsolete.join(' / '));
    if (lang === 'ja') {
      const missing = REQUIRED_JA.filter(w => !body.includes(w));
      check(`[${lang}] FIX-09 整合させるべき論点がすべて含まれる`, missing.length === 0, '不足: ' + missing.join(' / '));
      check(`[${lang}] FIX-09 第一階層が内部実装名ではない（IndexedDB より先に「ブラウザ保存領域」）`,
        body.indexOf('ブラウザ保存領域') < body.indexOf('IndexedDB'),
        `保存領域@${body.indexOf('ブラウザ保存領域')} IndexedDB@${body.indexOf('IndexedDB')}`);
      check(`[${lang}] FIX-09 保存の永続性を断定していない`,
        /保存は永久ではありません/.test(body) && !/削除するまで(は)?残ります/.test(body));
      check(`[${lang}] FIX-09 private content と technical communication を分けている`,
        /本文・題名・写真は、外部のAIにも外部サービスにも送信しません|外部のAIにも外部サービスにも送信しません/.test(body)
        && /通常の通信が伴います/.test(body));
    } else {
      check(`[${lang}] FIX-09 EN に日本語が混ざらない`, !/[぀-ゟ゠-ヿ一-鿿]/.test(body),
        (body.match(/[぀-ゟ゠-ヿ一-鿿]+/g) || []).slice(0, 3).join(','));
      check(`[${lang}] FIX-09 EN も現在提供していない機能を現在形で書かない`,
        /are both inactive in the current Beta0 release/.test(body));
    }
    await ctx.close();
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) { console.log('--- FAILED ---'); fail.forEach(f => console.log('  ' + f.name + '  → ' + f.detail)); }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
