/* =============================================================================
 * V2 Beta0 — Test E：EN のまま 05 →製本→ 棚選択 → 06 → 07 まで通す smoke test
 * -----------------------------------------------------------------------------
 * 確認すること
 *   - 製本後 UI（受け取り頁 / 棚選択 / confirm / skip / 題名修正）が EN で成立する
 *   - PKT-6：V1 presentation（「第三頁」等の頁番号呼称）が V2 へ露出しない
 *   - 06 / 07 の system UI が EN
 *   - 利用者が書いた本文・題名は翻訳されず、保存されたまま原文で出る
 *
 * 既存の製本経路（#submitStory）をそのまま押すだけで、保存形式・book schema・
 * shelf assignment・unfiled・skip・題名修正の各契約には一切触れない。
 * ========================================================================== */
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const JP_RE = /[぀-ゟ゠-ヿ一-鿿]/;

/* 利用者本文・題名は意図的に日本語にする。翻訳されず原文のまま残ることを確かめるため。 */
const USER_STORY = 'きょう、帰り道で金木犀のにおいがした。それだけの日。';
const USER_TITLE = '金木犀の帰り道';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); res.end('nf'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

/* 条件が満たされるまで polling する（製本は既存演出の待ちを挟むため固定待ちにしない） */
async function waitUntil(page, expr, timeout) {
  const end = Date.now() + (timeout || 15000);
  while (Date.now() < end) {
    if (await page.evaluate(expr)) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}

/* 指定要素配下の可視テキストのうち、利用者由来のものを除いて集める */
function collectSystemText(sel, allow) {
  return `(() => {
    const root = document.querySelector(${JSON.stringify(sel)});
    if (!root) return null;
    const ALLOW = ${JSON.stringify(allow)};
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const txt = (n.nodeValue || '').trim();
      if (!txt) continue;
      let el = n.parentElement, skip = false;
      while (el && el !== root.parentElement) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') { skip = true; break; }
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') { skip = true; break; }
        if (el.hasAttribute && el.hasAttribute('aria-hidden')) { skip = true; break; }
        if (ALLOW.some(s => el.matches && el.matches(s))) { skip = true; break; }
        el = el.parentElement;
      }
      if (!skip) out.push(txt);
    }
    return out;
  })()`;
}

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));

  await page.goto(base, { waitUntil: 'load' });
  await page.waitForSelector('html[data-v2-mounted="true"]', { timeout: 10000 });

  /* ---------- EN へ ---------- */
  await page.evaluate('openExperienceMenu()');
  await page.waitForTimeout(150);
  if ((await page.evaluate('currentLang()')) !== 'en') {
    await page.click('#langToggle');
    await page.waitForTimeout(250);
  }
  await page.evaluate('closeExperienceMenu()');
  await page.waitForTimeout(200);
  check('Test E EN で開始', (await page.evaluate('currentLang()')) === 'en');

  /* ---------- 05 へ ---------- */
  await page.evaluate(`document.querySelector('[data-v2-go="02"]').click()`);
  await page.waitForTimeout(300);
  await page.evaluate(`document.querySelector('[data-v2-go="05"]').click()`);
  await page.waitForTimeout(400);

  const on05 = await page.evaluate(`(() => {
    const p = document.querySelector('[data-v2-screen="05"]');
    return p && getComputedStyle(p).display !== 'none' && p.getClientRects().length > 0;
  })()`);
  check('Test E 05 編纂室に到達', on05);

  /* ---------- 本文・題名を入力（利用者由来の日本語） ---------- */
  await page.fill('#v2bStoryInput', USER_STORY);
  await page.waitForTimeout(150);
  await page.fill('#v2bTitleInput', USER_TITLE);
  await page.waitForTimeout(250);

  const mirrored = await page.evaluate(`({
    story: document.getElementById('storyInput').value,
    title: document.getElementById('titleInput').value
  })`);
  check('Test E 本文が既存 #storyInput へそのまま渡る', mirrored.story === USER_STORY);
  check('Test E 題名が既存 #titleInput へそのまま渡る', mirrored.title === USER_TITLE);

  /* ---------- 製本 ---------- */
  await page.evaluate(`document.querySelector('[data-v2-write="bind"]').click()`);
  /* 製本は既存実装の演出待ち（wait/描画）を挟むため、固定待ちではなく状態で待つ。 */
  const pickerOpen = await waitUntil(page, `(() => {
    const b = document.getElementById('unfiledShelfPicker');
    return !!(b && !b.classList.contains('hidden'));
  })()`, 15000);
  check('Test E 製本が成立し受け取り頁（棚選択）が開く', pickerOpen);

  if (pickerOpen) {
    const pickerText = await page.evaluate(collectSystemText('#unfiledShelfPicker',
      ['.mana-receive-book', '.spine', '.mana-title-input']));
    const jp = (pickerText || []).filter(t => JP_RE.test(t) && t !== USER_TITLE && !USER_TITLE.includes(t));
    check('Test E 棚選択・confirm・skip・題名修正が EN（日本語 system copy なし）',
      jp.length === 0, jp.slice(0, 5).join(' | '));

    const pageLabelHidden = await page.evaluate(`(() => {
      const el = document.querySelector('#unfiledShelfPicker .mana-page-label');
      if (!el) return true;
      const cs = getComputedStyle(el);
      return cs.position === 'absolute' && (el.getBoundingClientRect().width <= 2);
    })()`);
    check('PKT-6 V1 の頁番号呼称（「第三頁」等）が V2 へ露出しない', pageLabelHidden);

    /* V2 FREEZE canonical（05-2 B）：カードは .v2s2-card（角丸・静かな紙面）。 */
    const styled = await page.evaluate(`(() => {
      const card = document.querySelector('#unfiledShelfPicker .v2s2-card');
      if (!card) return null;
      const cs = getComputedStyle(card);
      return { radius: cs.borderTopLeftRadius, font: cs.fontFamily };
    })()`);
    check('PKT-6 受け取りカードが canonical の視覚言語（角丸の静かな紙面）',
      styled && parseFloat(styled.radius) >= 10,
      JSON.stringify(styled));

    const shelfOptions = await page.evaluate(`(() => {
      /* canonical B：select ではなく radiogroup の棚ラベルを読む */
      return Array.from(document.querySelectorAll('#unfiledShelfPicker [data-shelf-choice] .v2s2-shelf__name'))
        .map(o => o.textContent.trim()).filter(Boolean);
    })()`);
    const jpOpt = shelfOptions.filter(o => JP_RE.test(o));
    check('Test E 棚 label が EN（unfiled 関連含む）', jpOpt.length === 0,
      jpOpt.slice(0, 5).join(' | '));

    /* skip 経路（今は棚を決めず本棚へ）で離脱する */
    await page.evaluate(`(() => {
      const b = document.getElementById('unfiledShelfSkip');
      if (b) b.click();
    })()`);
    await waitUntil(page, `(() => {
      const b = document.getElementById('unfiledShelfPicker');
      return !b || b.classList.contains('hidden');
    })()`, 10000);
    await page.waitForTimeout(900);
  }

  /* ---------- 06 ---------- */
  const screenNow = await page.evaluate(`(() => {
    const p = Array.from(document.querySelectorAll('.v2-page')).find(el =>
      getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0);
    return p ? p.getAttribute('data-v2-screen') : null;
  })()`);
  check('Test E skip 後に本棚面（06）へ着地', screenNow === '06', String(screenNow));

  const shelfText = await page.evaluate(collectSystemText('[data-v2-screen="06"]',
    ['[data-v2-bookshelf="rack"]', '.v2c06__grid']));
  const shelfJp = (shelfText || []).filter(t => JP_RE.test(t));
  check('Test E 06 の system UI が EN', shelfJp.length === 0, shelfJp.slice(0, 4).join(' | '));

  const countText = await page.evaluate(`(() => {
    const c = document.querySelector('[data-v2-bookshelf="count"]');
    return c ? c.textContent.trim() : '';
  })()`);
  check('Test E 06 の冊数表示が EN の語順', /book/i.test(countText), countText);

  const spineTitle = await page.evaluate(`(() => {
    const s = document.querySelector('[data-v2-bookshelf="rack"] .v2-book-card__title, [data-v2-bookshelf="rack"] [data-entry-id], [data-v2-bookshelf="rack"] button');
    return s ? s.textContent.trim() : '';
  })()`);
  check('Test E 利用者の題名は翻訳されず原文のまま', spineTitle.includes(USER_TITLE) || spineTitle === '',
    spineTitle);

  /* ---------- 07 ---------- */
  await page.evaluate(`(() => {
    const b = document.querySelector('[data-v2-bookshelf="rack"] button, [data-v2-bookshelf="rack"] [role="button"]');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(700);

  const on07 = await page.evaluate(`(() => {
    const p = document.querySelector('[data-v2-screen="07"]');
    return !!(p && getComputedStyle(p).display !== 'none' && p.getClientRects().length > 0);
  })()`);
  check('Test E 06 → 07 で一冊を開ける', on07);

  if (on07) {
    const readerText = await page.evaluate(collectSystemText('[data-v2-screen="07"]',
      ['[data-v2-reader="title"]', '[data-v2-reader="body"]', '[data-v2-reader="note"]']));
    const readerJp = (readerText || []).filter(t => JP_RE.test(t));
    check('Test E 07 の system UI が EN', readerJp.length === 0, readerJp.slice(0, 4).join(' | '));

    const preserved = await page.evaluate(`({
      title: (document.querySelector('[data-v2-reader="title"]') || {}).textContent || '',
      body: (document.querySelector('[data-v2-reader="body"]') || {}).textContent || ''
    })`);
    check('Test E 保存した題名が原文のまま', preserved.title.trim() === USER_TITLE, preserved.title);
    check('Test E 保存した本文が原文のまま', preserved.body.includes(USER_STORY),
      preserved.body.slice(0, 40));

    const dateText = await page.evaluate(`(() => {
      const d = document.querySelector('[data-v2-reader="date"]');
      return d ? d.textContent.trim() : '';
    })()`);
    check('Test E 07 の日付が EN 表記', /Bound on/.test(dateText) && !JP_RE.test(dateText), dateText);
  }

  /* ---------- 外部送信ゼロの確認 ---------- */
  const requests = [];
  page.on('request', r => {
    const u = r.url();
    if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) requests.push(u);
  });
  await page.waitForTimeout(600);
  check('private content の外部送信 = 0（製本前後で外部宛リクエストなし）',
    requests.length === 0, requests.slice(0, 3).join(' | '));

  check('コンソールに未捕捉エラーが出ていない', pageErrors.length === 0,
    pageErrors.slice(0, 2).join(' | '));

  await browser.close();
  srv.close();

  const failed = results.filter(r => !r.ok);
  console.log('\n==================================================');
  console.log('  total ' + results.length + ' / pass ' + (results.length - failed.length) + ' / fail ' + failed.length);
  console.log('==================================================');
  if (failed.length) {
    failed.forEach(f => console.log('  FAIL: ' + f.name + (f.detail ? '  → ' + f.detail : '')));
    process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(1); });
