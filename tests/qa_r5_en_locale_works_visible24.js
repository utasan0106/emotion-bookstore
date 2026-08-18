/* =============================================================================
 * V2 Beta0 — R5：04「作品」の English locale（可視 24 件）
 * -----------------------------------------------------------------------------
 * 対象は 8 大棚 x displayRank 1-3 = 24 件の可視作品だけ。
 * 非可視 56 件は対象外であり、EN editorial を持たないことも併せて確認する。
 *
 * Localization Contract
 *   - English locale では JA editorial へ silent fallback しない
 *   - EN editorial を持つ作品だけが EN で露出しうる
 *   - JA locale の表示は従来のまま（回帰なし）
 *
 * 期待値（R3 FINAL 24 件）は下の R3_FINAL に凍結して持つ。
 * repository のデータが正本からずれたら、この fixture との突合で落ちる。
 *
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r5_en_locale_works_visible24.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const ROOT = path.resolve(__dirname, '..');
const JP = /[぀-ゟ゠-ヿ一-鿿]/;

/* R3 FINAL（承認済み・凍結）。publicId → EN editorial の完全一致期待値。 */
const R3_FINAL = {
  "hazumu-01": "Watching someone move through their days by their own sense of what is interesting, rather than by anyone else's measure, widens the world on this side a little too. Not encouragement: a book that leaves behind the lightness felt before starting something.",
  "hazumu-02": "Simply having walked through the same hours alongside someone takes on a particular outline later. Placed here for the sense of moving a little further forward inside time that is drawing to a close.",
  "hazumu-03": "There is a heat in the time spent seriously making something you love, one that moves people before any result has arrived. Placed here not as a story of youthful success, but for the momentum of hours spent caught up in something with someone else.",
  "atatamaru-01": "What stays is not a large answer but the quiet accumulation of living day to day and of deciding things for yourself. Shelved here without assuming anyone is worn down, for when you want to stay somewhere quiet for a while.",
  "atatamaru-02": "A family is not a single feeling; it is also built out of absences, memories and the accumulation of daily life. Placed here as a work in which small everyday scenes take on meaning only afterwards.",
  "atatamaru-03": "What stays is not a striking event but the sense of hours gathering with someone inside ordinary life. Shelved here without promising reassurance, where the scenery of daily life looks a little softer.",
  "hikareru-01": "When supporting someone as a fan runs deep into your daily life and the sense of your own body, what is left when that figure is shaken? Shelved here for a feeling that the single word \"like\" cannot hold.",
  "hikareru-02": "Even inside days that look the same, there are small differences of light, of sound, of the people around you. Placed here from the kind of time in which, with no large event, something still feels left over from today.",
  "hikareru-03": "From having looked at a single painting, an obsession and a curiosity rise up that knowledge alone cannot reach. Shelved here not for understanding art, but for the pull of wanting to look longer and know more.",
  "shizumu-01": "Not only voices that do not reach and the solitude around them, but also what can change after meeting someone. Edited from the relation of a voice reaching or not reaching, rather than closing on \"lonely\".",
  "shizumu-02": "Loss does not disappear once the event is over; it stays, changing shape through language, through places, through time spent with others. Placed here as a work about staying a long while with what cannot be put in order quickly.",
  "shizumu-03": "The person you are now and the person you were rise up inside the same stretch of time. Placed here not only for nostalgia, but for the quiet of choosing where to go next while still carrying the past.",
  "zawatsuku-01": "Who is deciding what counts as normal? Placed here as a work that leaves an unease you cannot put into words right after reading. It is not resolved into sympathy or a lesson; what it handles is the wavering of the border between yourself and society.",
  "zawatsuku-02": "A single event changes meaning as the position you watch it from changes. No answer is set out in advance; what is placed here is how it feels after something you thought you had understood has come loose.",
  "zawatsuku-03": "Money, staying alive, a family-like arrangement, guilt: none of these come apart cleanly from one another. Placed here as a work where \"why did it come to this\" stays with you ahead of \"what would I have done\".",
  "butsukaru-01": "It unsettles the idea that a world can be put in order using only the kinds of diversity that happen to be understandable. No answer is handed over; this shelf is treated as where you stand after the range of your own understanding has moved.",
  "butsukaru-02": "It handles the sting and the comparing that remain when the eye you watch others with and the eye you show yourself through drift apart. Placed on this shelf not only as a job-hunting story, but where the image of yourself collides with the image others hold.",
  "butsukaru-03": "Returning to society and rebuilding a relationship with someone are not the same thing. Placed here from the point where institutions, good intentions and clumsiness cross, without shutting a person inside a single attribute.",
  "miwohiku-01": "Some things come into view only when you stop asking for meaning straight away and put yourself inside a season and a set of steps. Not a prescription for resting: what is placed here is unhurried time itself.",
  "miwohiku-02": "What is placed here is not an escape to somewhere special but the time of coming back to ordinary life. Edited from the small comedy of living alongside someone, without pressing any picture of what a household should be.",
  "miwohiku-03": "As the world slowly changes: opening the shop, looking out at the scenery, waiting for people. Placed on a shelf that does not treat time spent doing nothing as something lacking.",
  "namae-ga-nai-01": "Even in a stretch of time when going outside is not possible, there are reasons and scenery only that person can see. Placed here alongside a feeling that cannot be named yet, rather than sorted into \"lonely\" or \"afraid\".",
  "namae-ga-nai-02": "There is a wide gap between the account applied from outside and a relationship only those involved can understand. Placed on the shelf for what cannot be explained, rather than resolved into easy right and wrong or into a name for the relation.",
  "namae-ga-nai-03": "The things you loved, the things you had in common, the things that change little by little. Edited less from the category of romance film than from the afterglow in which time that certainly existed later takes on a different meaning.",};

/* R2 title/creator table（承認済み・凍結）。publicId → EN 題名 / 著者の期待値。
   verification status（VERIFIED / CORROBORATED_INDEX / CANDIDATE_UNVERIFIED 等）は
   ここには持ち込まない。今回は承認済みの表示文字列を mount しているだけであり、
   direct verification 完了を意味しない。user-facing にも出さない。 */
const R2_TITLE_CREATOR = {
  "hazumu-01": { title: "Naruse wa Tenka o Tori ni Iku", creator: "Mina Miyajima" },
  "hazumu-02": { title: "Yoru no Picnic", creator: "Riku Onda" },
  "hazumu-03": { title: "It's a Summer Film!", creator: "Dir. Sōshi Matsumoto" },
  "atatamaru-01": { title: "Nishi no Majo ga Shinda", creator: "Kaho Nashiki" },
  "atatamaru-02": { title: "Our Little Sister", creator: "Dir. Hirokazu Kore-eda" },
  "atatamaru-03": { title: "Haru no Hi", creator: "Aimyon" },
  "hikareru-01": { title: "Idol, Burning", creator: "Rin Usami" },
  "hikareru-02": { title: "PERFECT DAYS", creator: "Dir. Wim Wenders" },
  "hikareru-03": { title: "Rakuen no Kanvasu", creator: "Maha Harada" },
  "shizumu-01": { title: "52 Hertz no Kujiratachi", creator: "Sonoko Machida" },
  "shizumu-02": { title: "Drive My Car", creator: "Dir. Ryusuke Hamaguchi" },
  "shizumu-03": { title: "Only Yesterday", creator: "Dir. Isao Takahata" },
  "zawatsuku-01": { title: "Convenience Store Woman", creator: "Sayaka Murata" },
  "zawatsuku-02": { title: "Monster", creator: "Dir. Hirokazu Kore-eda" },
  "zawatsuku-03": { title: "Sisters in Yellow", creator: "Mieko Kawakami" },
  "butsukaru-01": { title: "Seiyoku", creator: "Ryo Asai" },
  "butsukaru-02": { title: "Nanimono", creator: "Ryo Asai" },
  "butsukaru-03": { title: "Under the Open Sky", creator: "Dir. Miwa Nishikawa" },
  "miwohiku-01": { title: "Every Day a Good Day", creator: "Morishita Noriko" },
  "miwohiku-02": { title: "Kigeki", creator: "Gen Hoshino" },
  "miwohiku-03": { title: "Yokohama Kaidashi Kikou", creator: "Hitoshi Ashinano" },
  "namae-ga-nai-01": { title: "Lonely Castle in the Mirror", creator: "Mizuki Tsujimura" },
  "namae-ga-nai-02": { title: "Rurō no Tsuki", creator: "Yuu Nagira" },
  "namae-ga-nai-03": { title: "We Made a Beautiful Bouquet", creator: "Dir. Nobuhiro Doi" },
};

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}
function note(m) { console.log('        · ' + m); }

/* 04 の作品カードをそのまま読む */
const READ_WORKS = `(() => {
  const body = document.querySelector('[data-v2-works="body"]');
  if (!body) return null;
  return {
    count: body.getAttribute('data-v2-works-count'),
    source: body.getAttribute('data-v2-works-source'),
    shelf: body.getAttribute('data-v2-works-shelf'),
    items: Array.from(body.querySelectorAll('.v2c04__work')).map(li => ({
      id: li.getAttribute('data-v2-work-id') || '',
      title: (li.querySelector('.v2c04__work-title') || {}).textContent || '',
      creator: (li.querySelector('.v2c04__work-creator') || {}).textContent || '',
      reason: (li.querySelector('.v2c04__work-reason') || {}).textContent || ''
    }))
  };
})()`;

(async () => {
  /* ---- A) 静的：正本 fixture ↔ repository データ ---- */
  const jsonPath = path.join(ROOT, 'visual-refit-v2-prototype/data/04_Beta0_PublicInventory_v0_1.json');
  const inv = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const ids = Object.keys(R3_FINAL);
  check('(A) fixture は 24 件', ids.length === 24, 'count=' + ids.length);

  let exact = 0; const mism = [];
  for (const id of ids) {
    const hit = inv.items.filter(x => x.publicId === id);
    if (hit.length !== 1) { mism.push(id + ': 該当 ' + hit.length + ' 件'); continue; }
    if (hit[0].editorialReasonEn === R3_FINAL[id]) exact++;
    else mism.push(id + ': EN 文字列不一致');
  }
  check('(A) R3 FINAL ↔ 正本 JSON が 24/24 完全一致', exact === 24, mism.slice(0, 5).join(' / '));

  let tExact = 0, cExact = 0; const tcMism = [];
  for (const id of ids) {
    const hit = inv.items.filter(x => x.publicId === id);
    if (hit.length !== 1) { tcMism.push(id + ': 該当 ' + hit.length + ' 件'); continue; }
    if (hit[0].titleEn === R2_TITLE_CREATOR[id].title) tExact++; else tcMism.push(id + ': titleEn 不一致');
    if (hit[0].creatorEn === R2_TITLE_CREATOR[id].creator) cExact++; else tcMism.push(id + ': creatorEn 不一致');
  }
  check('(A) R2 titleEn ↔ 正本 JSON が 24/24 完全一致', tExact === 24, tcMism.slice(0, 5).join(' / '));
  check('(A) R2 creatorEn ↔ 正本 JSON が 24/24 完全一致', cExact === 24, tcMism.slice(0, 5).join(' / '));

  const visible = inv.items.filter(x => x.displayRank >= 1 && x.displayRank <= 3);
  check('(A) 可視 rank1-3 は 24 件', visible.length === 24, 'count=' + visible.length);
  const hidden = inv.items.filter(x => x.displayRank > 3);
  const hiddenWithEn = hidden.filter(x =>
    ('editorialReasonEn' in x) || ('titleEn' in x) || ('creatorEn' in x));
  check('(A) 非可視 56 件へ EN 3 field を追加していない',
    hidden.length === 56 && hiddenWithEn.length === 0,
    'hidden=' + hidden.length + ' withEn=' + hiddenWithEn.length);

  /* runtime JS 側も同じ 24 件を同じ文字列で持つ */
  const w = {};
  new Function('window', fs.readFileSync(
    path.join(ROOT, 'visual-refit-v2-prototype/data/public-inventory-beta0.js'), 'utf8')
    .replace("(typeof window !== 'undefined' ? window : this)", '(window)'))(w);
  const rt = [];
  for (const k of Object.keys(w.V2_PUBLIC_INVENTORY.shelves)) rt.push(...w.V2_PUBLIC_INVENTORY.shelves[k].items);
  let rtExact = 0;
  for (const id of ids) {
    const hit = rt.filter(x => x.publicId === id);
    if (hit.length === 1 &&
        hit[0].editorialReasonEn === R3_FINAL[id] &&
        hit[0].titleEn === R2_TITLE_CREATOR[id].title &&
        hit[0].creatorEn === R2_TITLE_CREATOR[id].creator) rtExact++;
  }
  check('(A) runtime JS も EN 3 field が 24/24 完全一致', rtExact === 24, 'exact=' + rtExact);
  const rtHiddenEn = rt.filter(x => x.displayRank > 3 &&
    (('editorialReasonEn' in x) || ('titleEn' in x) || ('creatorEn' in x)));
  check('(A) runtime JS の非可視へ EN 追加 0', rtHiddenEn.length === 0, 'n=' + rtHiddenEn.length);

  /* ---- B) ブラウザ：EN / JA / 復帰 / negative ---- */
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const SHELVES = ['hazumu', 'atatamaru', 'hikareru', 'shizumu', 'zawatsuku', 'butsukaru', 'miwohiku', 'namae-ga-nai'];
  const pageErrors = [];

  async function collect(page) {
    const seen = [];
    for (const s of SHELVES) {
      await L.go(page, '03');
      await L.openShelf(page, s);
      const got = await page.evaluate(READ_WORKS);
      if (!got) { seen.push({ shelf: s, err: 'no body' }); continue; }
      seen.push({ shelf: s, ...got });
    }
    return seen;
  }

  for (const lang of ['en', 'ja']) {
    const { ctx, page } = await L.openPage(browser, { width: 1440, height: 900, theme: 'day', lang });
    page.on('pageerror', e => pageErrors.push(lang + ': ' + e.message));
    await L.boot(page, base);
    if ((await L.ensureLang(page, lang)) !== lang) { check(`[${lang}] locale 切替`, false); await ctx.close(); continue; }
    await L.enterStore(page);

    const seen = await collect(page);
    const total = seen.reduce((n, x) => n + (x.items ? x.items.length : 0), 0);
    check(`[${lang}] 8 棚 x rank1-3 = 24 件が描画される`, total === 24, 'total=' + total);
    check(`[${lang}] すべて在庫由来（hold 0）`,
      seen.every(x => x.source === 'inventory'), seen.filter(x => x.source !== 'inventory').map(x => x.shelf).join(','));

    if (lang === 'en') {
      const badR = [], badT = [], badC = [], jp = [];
      for (const s of seen) for (const it of (s.items || [])) {
        if (R3_FINAL[it.id] === undefined) { badR.push(it.id + ': fixture 外'); continue; }
        if (it.reason !== R3_FINAL[it.id]) badR.push(it.id + ': editorial 不一致');
        if (it.title !== R2_TITLE_CREATOR[it.id].title) badT.push(it.id + ': title 不一致');
        if (it.creator !== R2_TITLE_CREATOR[it.id].creator) badC.push(it.id + ': creator 不一致');
        if (JP.test(it.reason)) jp.push(it.id + '/editorial');
        if (JP.test(it.title)) jp.push(it.id + '/title');
        if (JP.test(it.creator)) jp.push(it.id + '/creator');
      }
      check('[en] 表示 EN editorial が R3 FINAL と 24/24 一致', badR.length === 0, badR.slice(0, 5).join(' / '));
      check('[en] 表示 EN title が R2 と 24/24 一致', badT.length === 0, badT.slice(0, 5).join(' / '));
      check('[en] 表示 EN creator が R2 と 24/24 一致', badC.length === 0, badC.slice(0, 5).join(' / '));
      check('[en] title / creator / editorial すべてに日本語混在 0', jp.length === 0, jp.slice(0, 6).join(','));
    } else {
      const jaMap = new Map(inv.items.map(x => [x.publicId, x]));
      const bad = [];
      for (const s of seen) for (const it of (s.items || [])) {
        const b = jaMap.get(it.id) || {};
        if (it.reason !== b.editorialReason) bad.push(it.id + '/editorial');
        if (it.title !== b.title) bad.push(it.id + '/title');
        if (it.creator !== b.creator) bad.push(it.id + '/creator');
      }
      check('[ja] JA title / creator / editorial が 24/24 既存表示と完全一致',
        bad.length === 0, bad.slice(0, 5).join(' / '));
    }
    await ctx.close();
  }

  /* EN → JA → EN 復帰 */
  {
    const { ctx, page } = await L.openPage(browser, { width: 1440, height: 900, theme: 'day', lang: 'en' });
    page.on('pageerror', e => pageErrors.push('toggle: ' + e.message));
    await L.boot(page, base);
    await L.ensureLang(page, 'en');
    await L.enterStore(page);
    await L.go(page, '03'); await L.openShelf(page, 'hazumu');
    const en1 = await page.evaluate(READ_WORKS);
    await L.ensureLang(page, 'ja');
    await L.go(page, '03'); await L.openShelf(page, 'hazumu');
    const ja1 = await page.evaluate(READ_WORKS);
    await L.ensureLang(page, 'en');
    await L.go(page, '03'); await L.openShelf(page, 'hazumu');
    const en2 = await page.evaluate(READ_WORKS);
    const enSame = JSON.stringify((en1.items || []).map(x => x.reason)) === JSON.stringify((en2.items || []).map(x => x.reason));
    check('[toggle] EN→JA→EN で EN 表示が復帰する', enSame && (en2.items || []).length === 3);
    check('[toggle] 途中の JA は日本語で出る', (ja1.items || []).every(x => JP.test(x.reason)));
    await ctx.close();
  }

  /* negative：EN の 3 field それぞれについて、1 件落としても JA へ fallback しない。
     欠落した作品は EN 有効在庫から外れ、その棚は既存の HOLD へ倒れる（fail-closed）。 */
  for (const field of ['editorialReasonEn', 'titleEn', 'creatorEn']) {
    const { ctx, page } = await L.openPage(browser, { width: 1440, height: 900, theme: 'day', lang: 'en' });
    page.on('pageerror', e => pageErrors.push('negative/' + field + ': ' + e.message));
    await L.boot(page, base);
    await L.ensureLang(page, 'en');
    await L.enterStore(page);
    const dropped = await page.evaluate(`(() => {
      const inv = window.V2_PUBLIC_INVENTORY;
      if (!inv) return false;
      const row = inv.shelves['hazumu'].items.filter(x => x.publicId === 'hazumu-01')[0];
      if (!row) return false;
      delete row[${JSON.stringify(field)}];
      return true;
    })()`);
    check(`[negative/${field}] 該当 field を除去できた`, dropped === true);

    await L.go(page, '03');
    await L.openShelf(page, 'hazumu');
    const got = await page.evaluate(READ_WORKS);
    const b = inv.items.filter(x => x.publicId === 'hazumu-01')[0] || {};
    const items = got.items || [];
    const shown = items.map(x => [x.title, x.creator, x.reason].join('\u0001'));

    check(`[negative/${field}] 欠落作品が EN 一覧に出ない`,
      !items.some(x => x.id === 'hazumu-01'), 'ids=' + items.map(x => x.id).join(','));
    check(`[negative/${field}] JA の題名 / 著者 / 編集理由へ fallback しない`,
      !shown.some(t => t.indexOf(b.title) > -1 || t.indexOf(b.creator) > -1 || t.indexOf(b.editorialReason) > -1),
      '表示=' + shown.slice(0, 2).join(' | ').slice(0, 90));
    check(`[negative/${field}] 表示中の作品に日本語が出ない`,
      items.every(x => !JP.test(x.title) && !JP.test(x.creator) && !JP.test(x.reason)), '');

    /* 他棚は無傷（fail-closed の影響範囲がその棚に限られる） */
    await L.go(page, '03');
    await L.openShelf(page, 'shizumu');
    const other = await page.evaluate(READ_WORKS);
    check(`[negative/${field}] 他棚は 3 件のまま無傷`,
      (other.items || []).length === 3 && other.source === 'inventory',
      'count=' + other.count + ' source=' + other.source);
    await ctx.close();
  }

  await browser.close();
  srv.close();

  check('(page) JS エラー 0', pageErrors.length === 0, pageErrors.slice(0, 3).join(' / '));

  const pass = results.filter(r => r.ok).length;
  console.log(`\ntotal=${results.length} pass=${pass} fail=${results.length - pass}`);
  if (pass !== results.length) {
    console.log('--- FAILED ---');
    results.filter(r => !r.ok).forEach(r => console.log('  ' + r.name + (r.detail ? '\n     → ' + r.detail : '')));
    process.exit(1);
  }
})();
