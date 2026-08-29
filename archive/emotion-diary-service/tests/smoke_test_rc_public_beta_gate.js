/* Public Beta Release Candidate — Final Gate smoke
 * 本番 root（index.html + data.js + main.js）を実ブラウザで通し、
 * 公開ベータの主要 loop が 0冊 / 1冊 / 複数冊 / 既存データ の各状態で成立することを確認する。
 * 合成データのみ。保存形式・キー・backup format・GA4 定義には触れない。
 *
 * 実行:  node tests/smoke_test_rc_public_beta_gate.js
 * 依存:  playwright-core。Chromium の場所は CHROMIUM_PATH で上書きできる。 */
const { chromium } = require('playwright-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const R = []; let fails = 0;
const chk = (id, ok, d) => { R.push((ok ? 'PASS ' : 'FAIL ') + id + (d ? '  ' + d : '')); if (!ok) fails++; };

const wrap = v => JSON.stringify({ v: 1, data: v });
const mk = (id, title, story, cat) => ({
  id, title, story, category: cat,
  date: new Date('2026-08-0' + (id.slice(-1)) + 'T00:00:00.000Z').toISOString()
});

async function boot(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(`file://${ROOT}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(300);
  if (seed) {
    await p.evaluate(([k, v]) => localStorage.setItem(k, v), ['emotion-bookstore-library', wrap(seed)]);
    await p.reload({ waitUntil: 'load' });
  }
  await p.waitForTimeout(1800);
  return { ctx, p, errs };
}

const lib = p => p.evaluate(() => {
  try {
    const raw = localStorage.getItem('emotion-bookstore-library');
    if (!raw) return [];
    const w = JSON.parse(raw);
    const v = (w && typeof w === 'object' && 'data' in w) ? w.data : w;
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
});

/* 実入力に近い形で書いて製本する（本文・題名は合成データ） */
async function writeAndBind(p, story, title) {
  return p.evaluate(async ([s, t]) => {
    goToPage('desk');
    const si = document.getElementById('storyInput');
    si.value = s; si.dispatchEvent(new Event('input', { bubbles: true }));
    const ti = document.getElementById('titleInput');
    if (ti) { ti.value = t; ti.dispatchEvent(new Event('input', { bubbles: true })); }
    const btn = document.getElementById('submitStory');
    if (!btn) return { ok: false, why: 'bind button not found' };
    btn.click();
    await new Promise(r => setTimeout(r, 2200));
    const picker = document.getElementById('unfiledShelfPicker');
    const pickerOpen = !!(picker && !picker.classList.contains('hidden'));
    if (pickerOpen) { document.getElementById('unfiledShelfSkip').click(); }
    await new Promise(r => setTimeout(r, 600));
    return { ok: true, pickerOpen };
  }, [story, title]);
}

(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });

  /* ---------- 0冊（初回訪問）→ 書く → 製本 → 1冊 ---------- */
  {
    const { ctx, p, errs } = await boot(b, null);
    const before = await lib(p);
    chk('EMPTY-1 初回は0冊', before.length === 0, 'n=' + before.length);
    const r = await writeAndBind(p, 'ハジメテノホンブン', 'ハジメテノダイメイ');
    chk('EMPTY-2 製本の導線が存在し実行できる', r.ok === true, r.why || '');
    const after = await lib(p);
    chk('EMPTY-3 製本後に1冊が永続化される', after.length === 1, 'n=' + after.length);
    chk('EMPTY-4 本文と題名がそのまま保存される',
      after[0] && after[0].story === 'ハジメテノホンブン' && after[0].title === 'ハジメテノダイメイ',
      JSON.stringify(after[0] && [after[0].title, after[0].story]));
    const onShelf = await p.evaluate(() => {
      goToPage('bookshelf');
      return document.body.innerText.indexOf('ハジメテノダイメイ') !== -1;
    });
    chk('EMPTY-5 本棚に並ぶ', onShelf === true);
    chk('EMPTY-6 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------- 既存の複数冊：開く・書き直す・削除する ---------- */
  {
    const SEED = [mk('e1', '既存1', '既存本文1', 'kodoku'),
                  mk('e2', '既存2', '既存本文2', 'ureshii'),
                  mk('e3', '既存3', '既存本文3', 'fuan')];
    const { ctx, p, errs } = await boot(b, SEED);
    const start = await lib(p);
    chk('MULTI-1 既存3冊が読み込まれる', start.length === 3, 'n=' + start.length);
    const shown = await p.evaluate(() => {
      goToPage('bookshelf');
      return ['既存1', '既存2', '既存3'].every(x => document.body.innerText.indexOf(x) !== -1);
    });
    chk('MULTI-2 既存の全冊が本棚に並ぶ', shown === true);

    /* 書き直し */
    await p.evaluate(async () => {
      const e = libraryCache.find(x => x.id === 'e2');
      openBook(e); enterBookEditMode(e);
      document.getElementById('modalEditTitleInput').value = 'カキナオシ';
      document.getElementById('modalEditStoryInput').value = 'カキナオシホンブン';
      await document.getElementById('modalEditSave').onclick();
    });
    await p.waitForTimeout(400);
    const edited = await lib(p);
    const e2 = edited.find(x => x.id === 'e2');
    chk('MULTI-3 書き直しが永続化される',
      e2 && e2.title === 'カキナオシ' && e2.story === 'カキナオシホンブン',
      JSON.stringify(e2 && [e2.title, e2.story]));
    chk('MULTI-4 他の本は変わらない',
      edited.length === 3 && edited.find(x => x.id === 'e1').story === '既存本文1');

    /* 削除（確認あり） */
    const confirmed = await p.evaluate(async () => {
      let asked = null;
      window.confirm = (m) => { asked = m; return true; };
      openBook(libraryCache.find(x => x.id === 'e3'));
      await document.getElementById('modalDel').onclick();
      return asked;
    });
    await p.waitForTimeout(400);
    const afterDel = await lib(p);
    chk('MULTI-5 削除前に確認する', typeof confirmed === 'string' && confirmed.length > 0);
    chk('MULTI-6 削除は対象1冊だけ',
      afterDel.length === 2 && !afterDel.some(x => x.id === 'e3'), 'n=' + afterDel.length);
    chk('MULTI-7 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------- バックアップ → 復元 → 一致 ---------- */
  {
    const SEED = [mk('k1', 'バックアップ1', 'BK本文1', 'kodoku'),
                  mk('k2', 'バックアップ2', 'BK本文2', 'ando')];
    const { ctx, p, errs } = await boot(b, SEED);
    const payload = await p.evaluate(async () => {
      const stores = {};
      for (const key of BACKUP_KEYS) stores[key] = await loadJSON(key, null);
      return {
        app: 'みんなの感情書店', format: 'emotion-bookstore-backup',
        version: STORAGE_VERSION, exportedAt: new Date().toISOString(),
        bookCount: (stores['emotion-bookstore-library'] || []).length, stores
      };
    });
    chk('BK-1 書き出したバックアップが正しい形式', payload.format === 'emotion-bookstore-backup'
      && payload.bookCount === 2, JSON.stringify([payload.format, payload.bookCount]));
    chk('BK-2 バックアップに本文が含まれる（端末内で完結）',
      JSON.stringify(payload.stores).indexOf('BK本文1') !== -1);

    /* 本棚を空にしてから復元する */
    await p.evaluate(async () => { await performShelfReset(); });
    const emptied = await lib(p);
    chk('BK-3 リセットで0冊になる', emptied.length === 0, 'n=' + emptied.length);

    await p.evaluate(async (pl) => {
      window.confirm = () => true;
      const f = new File([JSON.stringify(pl)], 'backup.json', { type: 'application/json' });
      await handleRestoreFile(f);
    }, payload);
    await p.waitForTimeout(1600);
    await p.waitForLoadState('load');
    await p.waitForTimeout(1200);
    const restored = await lib(p);
    chk('BK-4 復元後に冊数が戻る', restored.length === 2, 'n=' + restored.length);
    chk('BK-5 復元後も本文・題名が完全一致',
      restored[0].title === 'バックアップ1' && restored[0].story === 'BK本文1' &&
      restored[1].title === 'バックアップ2' && restored[1].story === 'BK本文2',
      JSON.stringify(restored.map(x => x.title)));
    chk('BK-6 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------- JA / EN 切り替え ---------- */
  {
    const { ctx, p, errs } = await boot(b, [mk('l1', 'ラング', 'ラング本文', 'kodoku')]);
    const r = await p.evaluate(async () => {
      const ja = t('modalDel');
      toggleLanguage();
      await new Promise(r => setTimeout(r, 300));
      const en = t('modalDel');
      const bodyEn = document.body.innerText;
      toggleLanguage();
      await new Promise(r => setTimeout(r, 300));
      return { ja, en, jaBack: t('modalDel'), hasEn: /[A-Za-z]{4,}/.test(bodyEn) };
    });
    chk('LANG-1 JA/EN で UI 文言が切り替わる', r.ja !== r.en && r.ja.length > 0 && r.en.length > 0,
      JSON.stringify([r.ja, r.en]));
    chk('LANG-2 EN 表示に英語が現れる', r.hasEn === true);
    chk('LANG-3 JA へ戻せる', r.jaBack === r.ja);
    const after = await lib(p);
    chk('LANG-4 言語切替で本棚は変わらない',
      after.length === 1 && after[0].story === 'ラング本文', 'n=' + after.length);
    chk('LANG-5 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  /* ---------- Privacy / Terms への到達性 ---------- */
  {
    const { ctx, p, errs } = await boot(b, null);
    const links = await p.evaluate(() => Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.getAttribute('href')));
    chk('DOC-1 プライバシーポリシーへのリンクがある',
      links.some(h => /privacy\.html/.test(h)), links.filter(h => /html/.test(h)).join(','));
    chk('DOC-2 利用規約へのリンクがある', links.some(h => /terms\.html/.test(h)));
    for (const [id, file, must] of [
      ['DOC-3', 'privacy.html', '別表'],
      ['DOC-4', 'terms.html', '第9条']
    ]) {
      const q = await ctx.newPage();
      await q.goto(`file://${ROOT}/${file}`, { waitUntil: 'load' });
      const txt = await q.evaluate(() => document.body.innerText);
      chk(id + ' ' + file + ' が開けて内容がある', txt.indexOf(must) !== -1 && txt.length > 500,
        'len=' + txt.length);
      await q.close();
    }
    /* 外部送信の別表に X共有 が載っていること（Legal で追記した事実の確認） */
    const q = await ctx.newPage();
    await q.goto(`file://${ROOT}/privacy.html`, { waitUntil: 'load' });
    const ptxt = await q.evaluate(() => document.body.innerText);
    chk('DOC-5 別表に「Xでシェア」の外部送信が記載されている',
      ptxt.indexOf('Xでシェア') !== -1);
    chk('DOC-6 別表に Google Books / iTunes / Open-Meteo / GA4 が記載されている',
      ['Google Books', 'iTunes', 'Open-Meteo', 'Google Analytics'].every(x => ptxt.indexOf(x) !== -1));
    await q.close();
    chk('DOC-7 JSエラー 0', errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  await b.close();
  console.log(R.join('\n'));
  console.log(fails === 0 ? `\n==== ALL PASS / ${R.length} checks ====` : `\n==== ${fails} FAIL / ${R.length} checks ====`);
})();
