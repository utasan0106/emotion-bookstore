/* Storage Reliability / false-success QA
 * 本番 root（index.html + data.js + main.js）の上で、永続化の失敗を注入し
 * 「失敗なのに成功表示 / 失敗後の reload / optimistic mutation の残留 / silent data loss」
 * が起きないことを確認する。合成データのみを使い、schema・key・backup format は変更しない。
 *
 * 実行:  node tests/smoke_test_storage_reliability.js
 * 依存:  playwright-core（実ブラウザの IndexedDB / localStorage / reload 挙動を見るため、
 *        他の smoke test が使う jsdom では代替できない）。
 *        Chromium の場所は CHROMIUM_PATH で上書きできる。
 *
 * 対象（DataRepository.set が false を返す状況を注入して検証する）:
 *   製本 / 書き直し / 棚収納 / 個別削除 / 本棚全リセット /
 *   復元（全失敗・部分失敗・成功→再読込→一致）  */
const { chromium } = require('playwright-core');
const ROOT = require('path').resolve(__dirname, '..');

const R = []; let fails = 0;
const chk = (id, ok, d) => { R.push((ok ? 'PASS ' : 'FAIL ') + id + (d ? '  ' + d : '')); if (!ok) fails++; };

/* DataRepository は top-level const（window のプロパティではない）ため、
   load 後に evaluate して自由変数として参照し、set だけを包む。既存実装は書き換えない。 */
const SPY = () => {
  if (window.__spy) return 'already';
  const s = { failKeys: null, writes: [], reloaded: false, sets: [] };
  window.__spy = s;
  /* eslint-disable-next-line no-undef */
  const D = DataRepository;
  const oSet = D.set.bind(D);
  D.set = function (key, value) {
    s.sets.push(String(key));
    if (s.failKeys && s.failKeys.indexOf(String(key)) !== -1) return Promise.resolve(false);
    if (s.failKeys === 'ALL') return Promise.resolve(false);
    return oSet(key, value);
  };
  return 'ok';
};

const SEED = [
  { id: 'b1', title: '一冊目', story: '本文A', category: 'kodoku', date: '2026-08-01T00:00:00.000Z' },
  { id: 'b2', title: '二冊目', story: '本文B', category: 'ureshii', date: '2026-08-02T00:00:00.000Z' },
  { id: 'b3', title: '三冊目', story: '本文C', category: 'fuan', date: '2026-08-03T00:00:00.000Z' }
];

async function boot(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 } });
  /* location.reload は Chromium では差し替えられないため、
     実際に再読込が起きたかを sessionStorage のカウンタで観測する */
  await ctx.addInitScript(() => {
    try {
      const n = Number(sessionStorage.getItem('__loads') || 0) + 1;
      sessionStorage.setItem('__loads', String(n));
    } catch (e) {}
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(`file://${ROOT}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  if (seed) {
    await p.evaluate((lib) => {
      localStorage.setItem('emotion-bookstore-library', JSON.stringify({ v: 1, data: lib }));
    }, seed);
    await p.reload({ waitUntil: 'load' });
  }
  await p.waitForTimeout(1800);
  await p.evaluate(SPY);
  return { ctx, p, errs };
}

/* 永続層を直接読む（main.js のグローバルに依存しない。
   復元で reload が起きた直後でも観測できるようにするため） */
const readLib = async (p) => {
  await p.waitForLoadState('load');
  return p.evaluate(() => {
    try {
      const raw = localStorage.getItem('emotion-bookstore-library');
      if (!raw) return [];
      const w = JSON.parse(raw);
      const v = (w && typeof w === 'object' && 'data' in w) ? w.data : w;
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  });
};
const memLib = p => p.evaluate(() => (typeof libraryCache !== 'undefined' ? libraryCache : null));
const loadCount = p => p.evaluate(() => Number(sessionStorage.getItem('__loads') || 0));
const loadsSince = async (p, base) => (await loadCount(p)) > base;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  /* ---------------- 4) 個別削除の書き込み失敗 ---------------- */
  {
    const { ctx, p, errs } = await boot(b, SEED);
    await p.evaluate(() => { window.confirm = () => true; window.__spy.failKeys = ['emotion-bookstore-library']; });
    const before = await readLib(p);
    chk('DEL-0 前提：3冊が永続化されている', before.length === 3, 'n=' + before.length);
    await p.evaluate(() => { openBook(libraryCache.find(e => e.id === 'b2')); });
    await p.waitForTimeout(200);
    await p.evaluate(async () => { await document.getElementById('modalDel').onclick(); });
    await p.waitForTimeout(400);
    const after = await readLib(p);
    const mem = await memLib(p);
    const modalHidden = await p.evaluate(() => {
      const m = document.getElementById('bookModal');
      return !!(m && m.classList.contains('hidden'));
    });
    const shelfHasB2 = await p.evaluate(() => document.body.innerText.indexOf('二冊目') !== -1);
    chk('DEL-1 永続データは削除されていない', after.length === 3 && after.some(e => e.id === 'b2'), 'n=' + after.length);
    chk('DEL-2 メモリ上の楽観的削除が残っていない（silent data loss なし）',
      Array.isArray(mem) && mem.length === 3 && mem.some(e => e.id === 'b2'), 'mem=' + (mem ? mem.length : 'null'));
    chk('DEL-3 失敗時にモーダルを閉じて成功の見た目にしない', modalHidden === false, 'hidden=' + modalHidden);
    chk('DEL-4 画面上からも本が消えていない', shelfHasB2 === true);
    chk('DEL-5 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------------- 4b) 個別削除の成功パス（回帰） ---------------- */
  {
    const { ctx, p, errs } = await boot(b, SEED);
    await p.evaluate(() => { window.confirm = () => true; });
    await p.evaluate(() => { openBook(libraryCache.find(e => e.id === 'b2')); });
    await p.waitForTimeout(200);
    await p.evaluate(async () => { await document.getElementById('modalDel').onclick(); });
    await p.waitForTimeout(400);
    const after = await readLib(p);
    chk('DELOK-1 成功時は永続データから1冊だけ消える',
      after.length === 2 && !after.some(e => e.id === 'b2'), 'n=' + after.length);
    chk('DELOK-2 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------------- 2) 書き直し（編集）の書き込み失敗 ---------------- */
  {
    const { ctx, p, errs } = await boot(b, SEED);
    await p.evaluate(() => { window.__spy.failKeys = ['emotion-bookstore-library']; });
    const res = await p.evaluate(async () => {
      const entry = libraryCache.find(e => e.id === 'b2');
      openBook(entry);
      enterBookEditMode(entry);
      document.getElementById('modalEditTitleInput').value = 'アタラシイダイメイ';
      document.getElementById('modalEditStoryInput').value = 'アタラシイホンブン';
      await document.getElementById('modalEditSave').onclick();
      const m = document.getElementById('modalEditMsg');
      return {
        msg: m ? m.textContent : '',
        shown: !!(m && !m.classList.contains('hidden')),
        memTitle: libraryCache.find(e => e.id === 'b2').title,
        memStory: libraryCache.find(e => e.id === 'b2').story
      };
    });
    const after = await readLib(p);
    const b2 = after.find(e => e.id === 'b2');
    chk('EDIT-1 失敗を利用者に伝える', res.shown && res.msg.length > 0, 'msg=' + res.msg);
    chk('EDIT-2 永続データは書き換わっていない',
      b2 && b2.title === '二冊目' && b2.story === '本文B', JSON.stringify(b2 && [b2.title, b2.story]));
    chk('EDIT-3 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------------- 3) 棚収納（未分類→棚の確定）の書き込み失敗 ---------------- */
  {
    const { ctx, p, errs } = await boot(b, null);
    const res = await p.evaluate(async () => {
      const entry = { id: 'u1', title: '未分類の本', story: '未分類の本文',
        category: UNFILED_CATEGORY_ID, date: new Date().toISOString() };
      libraryCache.push(entry);
      await DataRepository.set('emotion-bookstore-library', libraryCache);
      window.__spy.failKeys = ['emotion-bookstore-library'];
      showUnfiledShelfPicker(entry);
      const box = document.getElementById('unfiledShelfPicker');
      const select = box.querySelector('select');
      select.value = 'kodoku';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const confirmBtn = document.getElementById('unfiledShelfConfirm');
      await confirmBtn.onclick();
      const err = box.querySelector('.mana-receive-error');
      return {
        errShown: !!(err && !err.classList.contains('hidden')),
        errMsg: err ? err.textContent : '',
        pickerOpen: !box.classList.contains('hidden'),
        confirmDisabled: document.getElementById('unfiledShelfConfirm').disabled,
        memCategory: libraryCache.find(e => e.id === 'u1').category
      };
    });
    const after = await readLib(p);
    const u1 = after.find(e => e.id === 'u1');
    chk('ASSIGN-1 失敗を伝え、受け取り頁を閉じない', res.errShown && res.pickerOpen, JSON.stringify(res));
    chk('ASSIGN-2 メモリの棚が unfiled へ巻き戻る', res.memCategory === 'unfiled', 'mem=' + res.memCategory);
    chk('ASSIGN-3 永続データの棚も変わっていない', !!u1 && u1.category === 'unfiled', u1 && u1.category);
    chk('ASSIGN-4 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------------- 5) 本棚全リセットの書き込み失敗 ---------------- */
  {
    const { ctx, p, errs } = await boot(b, SEED);
    await p.evaluate(() => { window.__spy.failKeys = ['emotion-bookstore-library']; });
    const okReset = await p.evaluate(async () => await performShelfReset());
    const after = await readLib(p);
    const mem = await memLib(p);
    chk('RESET-1 失敗時 performShelfReset は false を返す', okReset === false, 'ret=' + okReset);
    chk('RESET-2 永続データが消えていない', after.length === 3, 'n=' + after.length);
    chk('RESET-3 メモリも元のまま', Array.isArray(mem) && mem.length === 3, 'mem=' + (mem ? mem.length : 'null'));
    chk('RESET-4 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------------- 6) 復元：全書き込み失敗 ---------------- */
  {
    const { ctx, p, errs } = await boot(b, SEED);
    await p.evaluate(() => { window.confirm = () => true; window.__spy.failKeys = 'ALL'; });
    const M = await p.evaluate(() => ({ ok: t('restoreSuccess'), ng: t('restoreSaveFail') }));
    const baseLoads = await loadCount(p);
    const res = await p.evaluate(async () => {
      const payload = {
        app: 'みんなの感情書店', format: 'emotion-bookstore-backup', version: 1,
        exportedAt: new Date().toISOString(), bookCount: 1,
        stores: { 'emotion-bookstore-library': [{ id: 'r1', title: '復元本', story: '復元本文', category: 'kodoku', date: '2026-08-05T00:00:00.000Z' }] }
      };
      const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
      await handleRestoreFile(file);
      return {
        msg: (document.getElementById('restoreMsg') || {}).textContent || '',
        btn: (document.getElementById('restoreBtn') || {}).textContent || ''
      };
    });
    await p.waitForTimeout(1600);
    const reloaded = await loadsSince(p, baseLoads);
    const after = await readLib(p);
    chk('RESTORE-ALLFAIL-1 成功メッセージを出さない', res.msg !== M.ok, 'msg=' + res.msg);
    chk('RESTORE-ALLFAIL-2 失敗を利用者に伝える', res.msg.length > 0 && res.msg !== M.ok, 'msg=' + res.msg);
    chk('RESTORE-ALLFAIL-3 reload しない', reloaded === false, 'reloaded=' + reloaded);
    chk('RESTORE-ALLFAIL-4 既存の本棚を壊していない', after.length === 3, 'n=' + after.length);
    chk('RESTORE-ALLFAIL-5 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------------- 7) 復元：部分失敗 ---------------- */
  {
    const { ctx, p, errs } = await boot(b, SEED);
    await p.evaluate(() => {
      window.confirm = () => true;
      /* library は成功、prefs だけ失敗させる */
      window.__spy.failKeys = ['emotion-bookstore-prefs'];
    });
    const M = await p.evaluate(() => ({ ok: t('restoreSuccess'), ng: t('restoreSaveFail') }));
    const baseLoads = await loadCount(p);
    const res = await p.evaluate(async () => {
      const payload = {
        app: 'みんなの感情書店', format: 'emotion-bookstore-backup', version: 1,
        exportedAt: new Date().toISOString(), bookCount: 1,
        stores: {
          'emotion-bookstore-library': [{ id: 'r1', title: '復元本', story: '復元本文', category: 'kodoku', date: '2026-08-05T00:00:00.000Z' }],
          'emotion-bookstore-prefs': { theme: 'x' }
        }
      };
      const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
      await handleRestoreFile(file);
      return { msg: (document.getElementById('restoreMsg') || {}).textContent || '' };
    });
    await p.waitForTimeout(1600);
    const reloaded = await loadsSince(p, baseLoads);
    chk('RESTORE-PARTIAL-1 部分失敗を成功表示にしない', res.msg !== M.ok, 'msg=' + res.msg);
    chk('RESTORE-PARTIAL-2 部分失敗で reload しない', reloaded === false, 'reloaded=' + reloaded);
    chk('RESTORE-PARTIAL-3 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------------- 8) 復元成功 → 再読込 → 一致 ---------------- */
  {
    const { ctx, p, errs } = await boot(b, SEED);
    await p.evaluate(() => { window.confirm = () => true; });
    const M = await p.evaluate(() => ({ ok: t('restoreSuccess'), ng: t('restoreSaveFail') }));
    const baseLoads = await loadCount(p);
    const res = await p.evaluate(async () => {
      const payload = {
        app: 'みんなの感情書店', format: 'emotion-bookstore-backup', version: 1,
        exportedAt: new Date().toISOString(), bookCount: 2,
        stores: {
          'emotion-bookstore-library': [
            { id: 'r1', title: '復元本1', story: '復元本文1', category: 'kodoku', date: '2026-08-05T00:00:00.000Z' },
            { id: 'r2', title: '復元本2', story: '復元本文2', category: 'ureshii', date: '2026-08-06T00:00:00.000Z' }
          ]
        }
      };
      const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
      await handleRestoreFile(file);
      return { msg: (document.getElementById('restoreMsg') || {}).textContent || '' };
    });
    await p.waitForTimeout(1600);
    const reloaded = await loadsSince(p, baseLoads);
    chk('RESTORE-OK-1 成功メッセージを出す', res.msg === M.ok, 'msg=' + res.msg);
    chk('RESTORE-OK-2 成功時は reload する', reloaded === true, 'reloaded=' + reloaded);
    /* 実際に再読込して一致を見る */
    await p.reload({ waitUntil: 'load' });
    await p.waitForTimeout(1600);
    const after = await readLib(p);
    chk('RESTORE-OK-3 再読込後も復元内容と一致',
      after.length === 2 && after[0].id === 'r1' && after[1].id === 'r2'
      && after[0].story === '復元本文1' && after[1].story === '復元本文2',
      JSON.stringify(after.map(e => e.id)));
    chk('RESTORE-OK-4 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  await b.close();
  console.log(R.join('\n'));
  console.log(fails === 0 ? `\n==== ALL PASS / ${R.length} checks ====` : `\n==== ${fails} FAIL / ${R.length} checks ====`);
})();
