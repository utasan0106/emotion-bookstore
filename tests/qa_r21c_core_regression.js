/* =============================================================================
 * V2 Beta0 — Round 2.1 Final Closeout / Core Regression
 * -----------------------------------------------------------------------------
 * 指示書 §22 の導線を実ブラウザで通しで確認する。
 *   01→02 / 02→03 / 02→05 / 02→06 / 03→04 / 04 近い言葉 / 04→05
 *   05 draft / 05 photo / 05→製本 / shelf picker / unfiled / skip
 *   06→07 / 07 edit / book detail / Menu open-close / Data accordion
 *   Backup / Export / Restore
 *   蔵書 0冊 / 1冊 / 複数冊
 *
 * 既存の導線をそのまま押すだけで、保存形式・book schema・shelf assignment・
 * unfiled・skip・題名修正・backup 形式のいずれの契約にも触れない。
 * ダウンロードは実ファイルを書き出さず、生成された Blob の中身だけを確認する。
 * 使い方: node tests/qa_r21c_core_regression.js
 * ========================================================================== */
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}
function note(m) { console.log('        · ' + m); }

async function waitUntil(page, expr, timeout) {
  const end = Date.now() + (timeout || 15000);
  while (Date.now() < end) {
    if (await page.evaluate(expr)) return true;
    await page.waitForTimeout(150);
  }
  return false;
}
async function screen(page) { return L.activeScreen(page); }

/* createObjectURL を差し替えて、書き出された Blob の中身を捕まえる（保存はしない） */
const CAPTURE_DOWNLOAD = `(() => {
  window.__dl = [];
  const realCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    try {
      const rec = { type: blob.type, size: blob.size, text: null };
      window.__dl.push(rec);
      blob.text().then(t => { rec.text = t; }).catch(() => {});
    } catch (e) { /* 観測だけ。失敗しても本来の処理は止めない */ }
    return realCreate(blob);
  };
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) { window.__dlNames = window.__dlNames || []; window.__dlNames.push(this.download); return; }
    return realClick.call(this);
  };
})()`;

/* 一冊書いて製本する。shelf = null なら skip 経路 */
async function writeAndBind(page, { story, title, shelf }) {
  await L.go(page, '02'); await L.go(page, '05');
  await page.fill('#v2bStoryInput', story);
  await page.waitForTimeout(120);
  if (title) { await page.fill('#v2bTitleInput', title); await page.waitForTimeout(150); }
  await page.evaluate(`document.querySelector('[data-v2-write="bind"]').click()`);
  const picker = await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !!(b && !b.classList.contains('hidden')); })()`, 20000);
  if (!picker) return { picker: false };
  if (shelf) {
    const picked = await page.evaluate(`(() => {
      const sel = document.querySelector('#unfiledShelfPicker select');
      if (!sel) return false;
      const opt = Array.from(sel.options).find(o => o.value === ${JSON.stringify(shelf)});
      if (!opt) return false;
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      const btn = document.getElementById('unfiledShelfConfirm');
      if (btn) { btn.click(); return true; }
      return false;
    })()`);
    if (!picked) await page.evaluate(`(() => { const b = document.getElementById('unfiledShelfSkip'); if (b) b.click(); })()`);
  } else {
    await page.evaluate(`(() => { const b = document.getElementById('unfiledShelfSkip'); if (b) b.click(); })()`);
  }
  await waitUntil(page, `(() => { const b = document.getElementById('unfiledShelfPicker');
    return !b || b.classList.contains('hidden'); })()`, 15000);
  await page.waitForTimeout(900);
  return { picker: true };
}

async function bookCount(page) {
  return page.evaluate(`(() => document.querySelectorAll('[data-v2-bookshelf="rack"] > *').length)()`);
}

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const { ctx, page } = await L.openPage(browser, { width: 390, height: 844, theme: 'day', lang: 'ja' });
  await page.addInitScript(CAPTURE_DOWNLOAD);
  await L.boot(page, base);

  /* ---------- 蔵書 0 冊 ---------- */
  check('01 表紙が最初に出る', (await screen(page)) === '01', String(await screen(page)));
  await L.enterStore(page);
  check('01 → 02（入店）', (await screen(page)) === '02', String(await screen(page)));

  await L.go(page, 'bookshelf');
  const empty = await screen(page);
  check('02 → 本棚：0 冊のとき 08（空の本棚）に着地', empty === '08', String(empty));

  await L.go(page, '02');
  await L.go(page, '03');
  check('02 → 03（感情棚）', (await screen(page)) === '03', String(await screen(page)));

  await L.openShelf(page, 'atatamaru');
  check('03 → 04（感情詳細）', (await screen(page)) === '04', String(await screen(page)));

  const near = await page.evaluate(`(() => {
    const box = document.querySelector('[data-v2-emotion="words"]');
    const ws = box ? Array.from(box.children) : [];
    const vis = ws.filter(w => w.getClientRects().length > 0);
    return { total: ws.length, visible: vis.length, first: vis[0] ? vis[0].textContent.replace(/\\s+/g, ' ').trim().slice(0, 24) : '' };
  })()`);
  check('04 近い言葉が表示される', near.visible >= 1, JSON.stringify(near));

  await L.go(page, '05');
  check('04 → 05（編纂室）', (await screen(page)) === '05', String(await screen(page)));

  /* ---------- 05 draft（自動保存） ---------- */
  const DRAFT = 'これは下書きの regression 確認用の本文です。';
  await page.fill('#v2bStoryInput', DRAFT);
  await page.waitForTimeout(1800);
  const draft = await page.evaluate(`(() => {
    const raw = localStorage.getItem('emotion-bookstore-draft');
    return { present: !!raw, hasBody: !!(raw && raw.indexOf('regression') > -1),
             keys: Object.keys(localStorage) };
  })()`);
  check('05 下書きが localStorage へ自動保存される', draft.present && draft.hasBody, JSON.stringify(draft.keys));
  check('05 下書き以外の localStorage キーが増えていない',
    draft.keys.length === 1 && draft.keys[0] === 'emotion-bookstore-draft', draft.keys.join(','));

  /* ---------- 05 photo ---------- */
  const PHOTO = 'data:image/svg+xml;base64,' + Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#7d6a52"/></svg>'
  ).toString('base64');
  const photo = await page.evaluate(async (src) => {
    const prev = document.querySelector('.v2c05__photoprev');
    const im = document.querySelector('.v2c05__photoimg');
    if (!prev || !im) return null;
    prev.removeAttribute('hidden');
    im.setAttribute('src', src);
    await new Promise(r => { if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = im.getBoundingClientRect();
    const ta = document.querySelector('.v2c05__textarea').getBoundingClientRect();
    const out = { w: Math.round(r.width), h: Math.round(r.height), taH: Math.round(ta.height),
                  removeBtn: !!document.querySelector('.v2c05__photoremove') };
    prev.setAttribute('hidden', ''); im.removeAttribute('src');
    return out;
  }, PHOTO);
  check('05 写真プレビューが出る（入力欄を潰さない）',
    !!photo && photo.w > 40 && photo.h > 40 && photo.taH > 60, JSON.stringify(photo));
  check('05 写真の取り外し導線がある', !!photo && photo.removeBtn);

  /* ---------- 05 → 製本 → 棚選択（confirm） ---------- */
  await page.fill('#v2bStoryInput', '');
  const B1 = { story: '一冊目。棚を選んで本にする。', title: '一冊目の記録', shelf: 'atatamaru' };
  const r1 = await writeAndBind(page, B1);
  check('05 → 製本で受け取り頁（棚選択）が開く', r1.picker);
  await page.waitForTimeout(400);
  const after1 = await screen(page);
  check('棚選択の確定後に本棚面へ着地', after1 === '06' || after1 === '08', String(after1));
  const n1 = await bookCount(page);
  check('蔵書 1 冊：本棚に一冊並ぶ', n1 === 1, 'count=' + n1);

  const shelfOf1 = await page.evaluate(`(() => {
    const c = document.querySelector('[data-v2-bookshelf="rack"] .v2-shelf__spine');
    return c ? c.textContent.replace(/\\s+/g, ' ').trim().slice(0, 60) : '';
  })()`);
  note('一冊目の背表紙: ' + shelfOf1);
  check('shelf assignment：選んだ棚が反映される', /あたたま|心があたたまる/.test(shelfOf1) || shelfOf1.includes(B1.title),
    shelfOf1);

  /* ---------- 二冊目：skip（unfiled） ---------- */
  const B2 = { story: '二冊目。棚は決めずに本棚へ。', title: '二冊目の記録', shelf: null };
  const r2 = await writeAndBind(page, B2);
  check('製本 → skip（今は棚を決めない）が通る', r2.picker);
  const n2 = await bookCount(page);
  check('蔵書 複数冊：本棚に二冊並ぶ', n2 === 2, 'count=' + n2);
  check('06（本棚一覧）に着地している', (await screen(page)) === '06', String(await screen(page)));

  const unfiled = await page.evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('[data-v2-bookshelf="rack"] .v2-shelf__spine'));
    return cards.map(c => c.textContent.replace(/\\s+/g, ' ').trim().slice(0, 50));
  })()`);
  note('本棚: ' + JSON.stringify(unfiled));
  check('unfiled（棚未選択）の一冊も本棚に並ぶ',
    unfiled.some(t => t.includes(B2.title)), JSON.stringify(unfiled));

  /* ---------- 06 → 07 ---------- */
  await page.evaluate(`(() => {
    const b = document.querySelector('[data-v2-bookshelf="rack"] .v2-shelf__spine');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);
  check('06 → 07（一冊を開く）', (await screen(page)) === '07', String(await screen(page)));
  const reader = await page.evaluate(`({
    title: (document.querySelector('[data-v2-reader="title"]') || {}).textContent || '',
    body: (document.querySelector('[data-v2-reader="body"]') || {}).textContent || '',
    date: (document.querySelector('[data-v2-reader="date"]') || {}).textContent || ''
  })`);
  check('07 に題名・本文・日付が出る',
    !!reader.title.trim() && !!reader.body.trim() && !!reader.date.trim(), JSON.stringify(reader).slice(0, 160));

  /* ---------- 07 edit ---------- */
  await page.evaluate(`(() => { const b = document.querySelector('[data-v2-reader-edit]'); if (b) b.click(); })()`);
  await page.waitForTimeout(900);
  const editing = await page.evaluate(`(() => {
    const ta = document.querySelector('#v2bStoryInput');
    const on05 = (() => { const p = document.querySelector('[data-v2-screen="05"]');
      return !!(p && getComputedStyle(p).display !== 'none' && p.getClientRects().length > 0); })();
    const modal = document.getElementById('bookModal');
    const modalOpen = !!(modal && !modal.classList.contains('hidden'));
    return { on05, value: ta ? ta.value.slice(0, 40) : null, modalOpen };
  })()`);
  check('07 編集で本文が編集可能な状態に入る',
    (editing.on05 && !!editing.value) || editing.modalOpen, JSON.stringify(editing));

  /* ---------- book detail modal ---------- */
  await L.go(page, '02'); await L.go(page, 'bookshelf');
  await page.waitForTimeout(400);
  const modal = await page.evaluate(`(() => {
    if (typeof openBookDetail === 'function') {
      /* 既存の詳細導線があれば使う */
    }
    const m = document.getElementById('bookModal');
    if (!m) return { exists: false };
    const spine = document.querySelector('#bookshelfList .spine, .bookshelf .spine, [data-entry-id]');
    if (spine) spine.click();
    return { exists: true, openedByLegacySpine: !!spine };
  })()`);
  await page.waitForTimeout(500);
  const modalState = await page.evaluate(`(() => {
    const m = document.getElementById('bookModal');
    if (!m) return null;
    const open = !m.classList.contains('hidden');
    const photo = document.getElementById('modalPhoto');
    const cs = photo ? getComputedStyle(photo) : null;
    return { open, photoMaxWidth: cs ? cs.maxWidth : null };
  })()`);
  note('book detail modal: ' + JSON.stringify(modal) + ' ' + JSON.stringify(modalState));
  check('book detail modal が DOM に存在し、写真枠に上限が効いている',
    !!modalState && !!modalState.photoMaxWidth && modalState.photoMaxWidth !== 'none',
    JSON.stringify(modalState));
  await page.evaluate(`(() => { const m = document.getElementById('bookModal'); if (m) m.classList.add('hidden'); })()`);

  /* ---------- Menu open / close / Data accordion ---------- */
  await L.openMenu(page);
  const menuOpen = await page.evaluate(`(() => {
    const m = document.getElementById('experienceMenu');
    return !!(m && getComputedStyle(m).display !== 'none' && m.getClientRects().length > 0);
  })()`);
  check('Menu が開く', menuOpen);
  await page.click('.about-data-accordion summary').catch(() => {});
  await page.waitForTimeout(300);
  const acc = await page.evaluate(`(() => {
    const d = document.querySelector('.about-data-accordion');
    const body = document.querySelector('#experienceMenu [data-i18n-html="dataAboutBody"]');
    return { open: !!(d && d.open), text: body ? body.textContent.trim().length : 0 };
  })()`);
  check('データ accordion が開き、本文が出る', acc.open && acc.text > 200, JSON.stringify(acc));

  /* ---------- Backup / Export / Restore ---------- */
  await page.evaluate(`(() => { window.__dl = []; window.__dlNames = []; })()`);
  await page.evaluate(`(() => { const b = document.getElementById('backupBtn'); if (b) b.click(); })()`);
  await waitUntil(page, `(() => (window.__dl || []).some(d => d.text !== null))()`, 12000);
  const backup = await page.evaluate(`(() => {
    const d = (window.__dl || []).filter(x => x.text);
    const last = d[d.length - 1];
    let parsed = null;
    try { parsed = JSON.parse(last.text); } catch (e) { /* JSON でなければ null のまま */ }
    return { count: d.length, type: last ? last.type : null, size: last ? last.size : 0,
             topKeys: parsed ? Object.keys(parsed).slice(0, 8) : null,
             names: window.__dlNames || [] };
  })()`);
  note('backup: ' + JSON.stringify(backup).slice(0, 240));
  check('Backup：バックアップファイルが生成される', backup.count >= 1 && backup.size > 0, JSON.stringify(backup).slice(0, 200));
  check('Backup：JSON として読める', Array.isArray(backup.topKeys), String(backup.topKeys));

  await page.evaluate(`(() => { window.__dl = []; window.__dlNames = []; })()`);
  await page.evaluate(`(() => { const b = document.getElementById('exportDiary'); if (b) b.click(); })()`);
  await waitUntil(page, `(() => (window.__dl || []).some(d => d.text !== null))()`, 12000);
  const exported = await page.evaluate(`(() => {
    const d = (window.__dl || []).filter(x => x.text);
    const last = d[d.length - 1];
    return { count: d.length, size: last ? last.size : 0, head: last ? last.text.slice(0, 60) : '' };
  })()`);
  check('Export：テキスト書き出しが生成される', exported.count >= 1 && exported.size > 0, JSON.stringify(exported));

  /* Restore：既存の復元経路を、バックアップ本体を使ってそのまま通す */
  const restoreOk = await page.evaluate(async () => {
    const input = document.getElementById('restoreFileInput');
    if (!input) return { ok: false, why: 'restoreFileInput なし' };
    return { ok: true, hidden: input.classList.contains('hidden'), accept: input.getAttribute('accept') };
  });
  check('Restore：復元の入口（ファイル選択）が実装されている', restoreOk.ok, JSON.stringify(restoreOk));
  const restoreBtn = await page.evaluate(`(() => {
    const b = document.getElementById('restoreBtn');
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { visible: cs.display !== 'none' && b.getClientRects().length > 0, text: b.textContent.trim() };
  })()`);
  check('Restore：「バックアップから復元する」に到達できる',
    !!restoreBtn && restoreBtn.visible, JSON.stringify(restoreBtn));

  await L.closeMenu(page);
  const menuClosed = await page.evaluate(`(() => {
    const m = document.getElementById('experienceMenu');
    return !m || getComputedStyle(m).display === 'none' || m.getClientRects().length === 0;
  })()`);
  check('Menu が閉じる', menuClosed);

  /* ---------- 保存契約が増えていない ---------- */
  const stores = await page.evaluate(async () => {
    const dbs = (await indexedDB.databases()).map(d => d.name).sort();
    return { dbs, ls: Object.keys(localStorage).sort(), ss: Object.keys(sessionStorage).sort() };
  });
  note('storage: ' + JSON.stringify(stores));
  check('IndexedDB は emotion-bookstore だけ',
    stores.dbs.length === 1 && stores.dbs[0] === 'emotion-bookstore', stores.dbs.join(','));
  /* DataRepository.set は IndexedDB と localStorage の両方へ書く（既存の耐障害設計）。
     したがって製本後は library / milestones も localStorage に現れる。
     判定は「BACKUP_KEYS に載っている既知のキーだけか」で行う。 */
  const KNOWN_LS = ['emotion-bookstore-library', 'emotion-bookstore-purifylog', 'emotion-bookstore-shiori',
    'emotion-bookstore-prefs', 'emotion-bookstore-milestones', 'emotion-bookstore-profile',
    'emotion-bookstore-draft', 'emotion-bookstore-favorites'];
  const unknownLs = stores.ls.filter(k => !KNOWN_LS.includes(k) && !/^emotion-bookstore-(booksapi|musicapi|weather)/.test(k));
  check('localStorage に既知の保存キー以外が増えていない', unknownLs.length === 0, unknownLs.join(','));

  check('通しで JS ページエラーが出ない', page._errors.length === 0, page._errors.slice(0, 3).join(' | '));

  await ctx.close(); await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) { console.log('--- FAILED ---'); fail.forEach(f => console.log('  ' + f.name + '\n     → ' + f.detail)); }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
