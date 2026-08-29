/* =============================================================================
 * V2 Beta0 — Round 1 再適用 + Localization Fix の smoke test
 * -----------------------------------------------------------------------------
 * 目的
 *   1. PKT-1 DAY/NIGHT 境界（05:00 DAY / 20:59 DAY / 21:00 NIGHT / 04:59 NIGHT）
 *   2. Localization：EN で V2 の system UI に日本語が残らない／JA で英語が残らない
 *   3. 05 の写真欄が V2 に露出し、既存 photo 契約へ橋渡しされている
 *   4. PKT-3 共通メニュートリガー（02/04/05/07）と Trust / Data の到達性
 *   5. PKT-5 アプリ内ブラウザ警告が 1 session 1 回であること
 *   6. Core：01→02→03→04→05→06/08→07 が V2 で成立すること
 *
 * 実ブラウザ（Chromium）で確認する。JSDOM では container query / MutationObserver /
 * IndexedDB が V2 mount の前提を満たさないため、既存の JSDOM テストとは別系統にする。
 *
 * 保存・製本・GA4・外部通信の契約は一切呼び分けを変えない（読み取りと表示の確認のみ）。
 * ========================================================================== */
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const JP_RE = /[぀-ゟ゠-ヿ一-鿿]/;
const EN_WORD_RE = /\b(Bookshelf|Shelves|Write|Words|Works|Title|Draft|Book|Enter|Back)\b/;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
};

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

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}

/* 現在表示されている V2 画面の可視 system text を集める。
   利用者本文・題名・写真・実在作品の原題は対象外（許可リスト）。 */
const COLLECT = `(() => {
  const ALLOW = [
    '[data-v2-reader="title"]', '[data-v2-reader="body"]', '[data-v2-reader="note"]',
    '[data-v2-emotion="title"]', '[data-v2-emotion="lead"]',
    '[data-v2-worddetail="body"]',
    '.v2-book-card__title', '.v2c06__grid', '[data-v2-bookshelf="rack"]',
    '.v2c04__works', '[data-v2-works="body"]', '[data-v2-mybooks="body"]',
    '.hero-lang-toggle', 'script', 'style'
  ];
  const pages = Array.from(document.querySelectorAll('.v2-page'));
  const visible = pages.filter(p => {
    const cs = getComputedStyle(p);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return p.getClientRects().length > 0;
  });
  const out = [];
  for (const page of visible) {
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const txt = (n.nodeValue || '').trim();
      if (!txt) continue;
      let el = n.parentElement, skip = false;
      while (el && el !== page.parentElement) {
        if (el.hasAttribute && el.hasAttribute('aria-hidden')) { skip = true; break; }
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') { skip = true; break; }
        if (ALLOW.some(sel => el.matches && el.matches(sel))) { skip = true; break; }
        el = el.parentElement;
      }
      if (!skip) out.push({ text: txt, screen: page.getAttribute('data-v2-screen') });
    }
  }
  return out;
})()`;

async function activeScreen(page) {
  return page.evaluate(`(() => {
    const p = Array.from(document.querySelectorAll('.v2-page')).find(el => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && el.getClientRects().length > 0;
    });
    return p ? p.getAttribute('data-v2-screen') : null;
  })()`);
}

async function scanJapanese(page, label) {
  const nodes = await page.evaluate(COLLECT);
  const bad = nodes.filter(n => JP_RE.test(n.text));
  check('EN: ' + label + ' に日本語 system copy が残らない', bad.length === 0,
    bad.slice(0, 4).map(b => '[' + b.screen + '] ' + b.text.slice(0, 40)).join(' | '));
  return bad;
}

async function setLang(page, want) {
  await page.evaluate(`(() => {
    if (typeof openExperienceMenu === 'function') openExperienceMenu();
  })()`);
  await page.waitForTimeout(120);
  const cur = await page.evaluate('typeof currentLang === "function" ? currentLang() : null');
  if (cur !== want) {
    await page.click('#langToggle');
    await page.waitForTimeout(250);
  }
  await page.evaluate(`(() => {
    if (typeof closeExperienceMenu === 'function') closeExperienceMenu();
  })()`);
  await page.waitForTimeout(200);
  return page.evaluate('typeof currentLang === "function" ? currentLang() : null');
}

async function go(page, screen) {
  await page.evaluate(`(() => {
    const b = document.querySelector('[data-v2-go="${screen}"]:not([hidden])');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(350);
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

  /* ---------- PKT-1 Theme ---------- */
  const th = await page.evaluate(`({
    h4:  isNightHour(4),  h459: isNightHour(4),
    h5:  isNightHour(5),  h20:  isNightHour(20),
    h21: isNightHour(21), h23:  isNightHour(23), h0: isNightHour(0)
  })`);
  check('PKT-1 04:59 は NIGHT', th.h4 === true);
  check('PKT-1 05:00 は DAY', th.h5 === false);
  check('PKT-1 20:59 は DAY', th.h20 === false);
  check('PKT-1 21:00 は NIGHT', th.h21 === true);
  check('PKT-1 深夜 0時 は NIGHT', th.h0 === true);

  const staticNight = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check('PKT-1 body の静的 NIGHT 固定を撤去', !/<body class="night">/.test(staticNight));

  const themeConsistent = await page.evaluate(`(() => {
    const night = isNightHour();
    return document.documentElement.getAttribute('data-theme') === (night ? 'night' : 'day')
      && document.body.classList.contains('night') === night;
  })()`);
  check('PKT-1 pre-paint theme と body.night が一致', themeConsistent);

  /* ---------- PKT-3 menu triggers ---------- */
  for (const [scr, sel] of [['02', '.v2c02'], ['04', '.v2c04'], ['05', '.v2c05'], ['07', '.v2c07']]) {
    const has = await page.evaluate(`!!document.querySelector('${sel} [data-v2-open-menu]')`);
    check('PKT-3 ' + scr + ' に共通メニュートリガーがある', has);
  }
  const has01 = await page.evaluate(`!!document.querySelector('.v2c01 [data-v2-open-menu]')`);
  check('PKT-3 01 にはトリガーを置かない（没入感維持）', !has01);

  /* ---------- PKT-5 ---------- */
  const pkt5 = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  check('PKT-5 sessionStorage の 1 session 1 回ガードがある',
    /eb-inapp-note-dismissed/.test(pkt5) && /sessionStorage\.setItem\(IN_APP_NOTE_DISMISSED_KEY/.test(pkt5));
  check('PKT-5 永続 storage キーを増やしていない',
    !/localStorage\.setItem\(\s*IN_APP_NOTE_DISMISSED_KEY/.test(pkt5));

  /* ---------- 05 photo exposure ---------- */
  const photo = await page.evaluate(`({
    choose: !!document.querySelector('.v2c05 [data-v2-photo="choose"]'),
    preview: !!document.querySelector('.v2c05 [data-v2-photo="preview"]'),
    remove: !!document.querySelector('.v2c05 [data-v2-photo="remove"]'),
    legacyChoose: !!document.getElementById('photoChooseBtn'),
    legacyInput: !!document.getElementById('photoInput')
  })`);
  check('Photo 05 に「写真を追加」が露出している', photo.choose);
  check('Photo プレビュー枠がある', photo.preview);
  check('Photo 取り外しボタンがある', photo.remove);
  check('Photo 既存 #photoChooseBtn / #photoInput をそのまま使う',
    photo.legacyChoose && photo.legacyInput);

  const photoFlow = await page.evaluate(`(() => {
    const prev = document.getElementById('photoPreview');
    const img = document.getElementById('photoPreviewImg');
    const v2box = document.querySelector('[data-v2-photo="preview"]');
    const v2img = document.querySelector('[data-v2-photo="image"]');
    const px = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    img.src = px; prev.classList.remove('hidden');
    return new Promise(r => setTimeout(() => {
      const shown = !v2box.hasAttribute('hidden') && (v2img.src || '').startsWith('data:image');
      document.getElementById('photoRemove').click();
      setTimeout(() => r({ shown, hiddenAfterRemove: v2box.hasAttribute('hidden') }), 120);
    }, 150));
  })()`);
  check('Photo add → V2 プレビューへ反映される', photoFlow.shown);
  check('Photo remove → V2 プレビューが消える', photoFlow.hiddenAfterRemove);

  /* ---------- Test A : JP 一周 ---------- */
  const jaNow = await setLang(page, 'ja');
  check('Test A 初期言語が JA', jaNow === 'ja');
  await go(page, '02');
  check('Test A 01 → 02 へ入店できる', (await activeScreen(page)) === '02');
  await go(page, '03');
  check('Test A 02 → 03 感情の棚', (await activeScreen(page)) === '03');
  const jaNodes = await page.evaluate(COLLECT);
  check('Test A JP で 03 の system UI が日本語', jaNodes.some(n => JP_RE.test(n.text)));

  /* ---------- Test B : EN へ切替えて巡回 ---------- */
  const enNow = await setLang(page, 'en');
  check('Test B EN へ切替できる', enNow === 'en');

  const enShelfTitle = await page.evaluate(`(() => {
    const el = document.querySelector('.v2c03__title');
    return el ? el.textContent.trim() : '';
  })()`);
  check('Test B 03 見出しが EN へ追従（同一 session・reload なし）',
    enShelfTitle === 'Emotion Shelves', enShelfTitle);

  await scanJapanese(page, '03 Emotion Shelves');

  await page.evaluate(`(() => {
    const b = document.querySelector('[data-v2-shelf-trigger]');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(400);
  check('Test B 03 → 04 大棚詳細', (await activeScreen(page)) === '04');
  await scanJapanese(page, '04 Emotion Detail');

  /* 04「ことば」の意味/ニュアンス/近い言葉の本文は V2_EMOTION_WORDS（CEO 承認済み
     canonical JSON / SHA-256 付き）の editorial content で、EN 版が存在しない。
     見出し（Meaning / Nuance / Near words）と感情語ラベル・定義は既存 canonical EN
     （CATEGORY_LABEL_EN / CATEGORY_DEF_EN）へ接続済み。本文の英訳は canonical
     artifact の新規作成にあたるため今回の scope 外。状態を可視化だけしておく。 */
  await page.evaluate(`(() => {
    const chip = document.querySelector('[data-v2-emotion-id]');
    if (chip) chip.click();
  })()`);
  await page.waitForTimeout(300);
  const wordBody = await page.evaluate(`(() => {
    const b = document.querySelector('[data-v2-worddetail="body"]');
    if (!b || b.hasAttribute('hidden')) return { open: false, jp: false };
    return { open: true, jp: /[぀-ゟ゠-ヿ一-鿿]/.test(b.textContent || '') };
  })()`);
  console.log('  NOTE  04 ことば本文（V2_EMOTION_WORDS canonical / EN 版なし）: '
    + (wordBody.open ? (wordBody.jp ? 'JA のまま表示（既知・scope 外）' : 'EN') : '未展開'));

  const headings = await page.evaluate(`Array.from(document.querySelectorAll('.v2c04__wd-h')).map(e => e.textContent.trim())`);
  check('04 ことばの見出しは EN へ追従する',
    headings.length === 0 || headings.every(h => !JP_RE.test(h)), headings.join(' / '));

  const wordNames = await page.evaluate(`Array.from(document.querySelectorAll('.v2c04__words [data-v2-emotion-id]')).map(e => e.textContent.trim()).slice(0,3)`);
  check('04 感情語ラベル・定義は既存 canonical EN へ接続されている',
    wordNames.length === 0 || wordNames.every(n => !JP_RE.test(n)), wordNames.join(' / '));

  await go(page, '05');
  check('Test B → 05 編纂室', (await activeScreen(page)) === '05');
  await scanJapanese(page, '05 Editorial Room');

  const enCounter = await page.evaluate(`(() => {
    const c = document.querySelector('[data-v2-write="count"]');
    return c ? c.textContent.trim() : '';
  })()`);
  check('Test B 05 カウンタが周囲と同じ言語（英数字表記）',
    !JP_RE.test(enCounter), enCounter);

  await page.evaluate(`(() => {
    const b = document.querySelector('.v2b-nav__item[data-v2-nav="bookshelf"]');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(450);
  const shelfScreen = await activeScreen(page);
  check('Test B → 06 / 08 本棚面', shelfScreen === '06' || shelfScreen === '08', shelfScreen);
  await scanJapanese(page, (shelfScreen === '08' ? '08 Empty State' : '06 Bookshelf'));

  await page.evaluate(`(() => {
    const b = document.querySelector('.v2b-nav__item[data-v2-nav="shelves"]');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(350);

  /* ---------- Overlays : Menu / Trust / Data ---------- */
  await page.evaluate('openExperienceMenu()');
  await page.waitForTimeout(250);
  const menuScan = await page.evaluate(`(() => {
    const card = document.getElementById('experienceMenuCard');
    const out = [];
    const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const txt = (n.nodeValue || '').trim();
      if (!txt) continue;
      let el = n.parentElement, skip = false;
      while (el && el !== card.parentElement) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') { skip = true; break; }
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') { skip = true; break; }
        el = el.parentElement;
      }
      if (!skip) out.push(txt);
    }
    return out;
  })()`);
  const menuJp = menuScan.filter(t => JP_RE.test(t));
  check('Overlay 店内メニューに日本語が残らない（EN）', menuJp.length === 0,
    menuJp.slice(0, 4).join(' | '));

  const ia = await page.evaluate(`(() => {
    const card = document.getElementById('experienceMenuCard');
    const secs = Array.from(card.querySelectorAll('.experience-menu-section'))
      .map(e => e.getAttribute('data-i18n'));
    return {
      secs,
      trustIdx: secs.indexOf('v2MenuTrustSection'),
      dataIdx: secs.indexOf('v2MenuDataSection'),
      setIdx: secs.indexOf('menuSectionSettings'),
      profileVisible: (() => {
        const b = document.getElementById('profileBtn');
        return b ? getComputedStyle(b).display !== 'none' : false;
      })(),
      backupReachable: !!card.querySelector('[data-v2-legacy-click="backupBtn"]'),
      restoreReachable: !!card.querySelector('[data-v2-legacy-click="restoreBtn"]'),
      langReachable: !!card.querySelector('#langToggle'),
      privacyReachable: !!card.querySelector('a[href="./privacy.html"]'),
      termsReachable: !!card.querySelector('a[href="./terms.html"]'),
      contactReachable: !!card.querySelector('#guideSupportLink')
    };
  })()`);
  check('PKT-3 Trust が設定より前にある',
    ia.trustIdx >= 0 && ia.setIdx >= 0 && ia.trustIdx < ia.setIdx, JSON.stringify(ia.secs));
  check('PKT-3 来店カードは V2 の user-facing から退場', !ia.profileVisible);
  check('PKT-3 Data / Backup へ到達できる', ia.backupReachable && ia.restoreReachable);
  check('PKT-3 JP/EN・Privacy・Terms・Contact へ到達できる',
    ia.langReachable && ia.privacyReachable && ia.termsReachable && ia.contactReachable);

  const motionLabel = await page.evaluate(`document.getElementById('motionToggle').textContent.trim()`);
  check('PKT-3 「演出」表記を使っていない（EN 表示）', !/演出/.test(motionLabel), motionLabel);
  await page.evaluate('closeExperienceMenu()');
  await page.waitForTimeout(200);

  /* ---------- Test C : EN のまま reload ---------- */
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('html[data-v2-mounted="true"]', { timeout: 10000 });
  await page.waitForTimeout(400);
  const afterReload = await page.evaluate('typeof currentLang === "function" ? currentLang() : null');
  check('Test C reload 後も EN が復元される（既存 persistence 契約のまま）', afterReload === 'en');

  /* ---------- Test D : EN → JA ---------- */
  const backJa = await setLang(page, 'ja');
  check('Test D JA へ戻せる', backJa === 'ja');
  await go(page, '02');
  await page.waitForTimeout(250);
  const jaAgain = await page.evaluate(`(() => {
    const el = document.querySelector('.v2c02__hero');
    return el ? el.textContent.trim() : '';
  })()`);
  check('Test D JA へ戻すと 02 に英語 system copy が残らない',
    !EN_WORD_RE.test(jaAgain) && JP_RE.test(jaAgain), jaAgain.slice(0, 50));

  /* ---------- 01 regression ---------- */
  const c01 = await page.evaluate(`(() => {
    const s = document.querySelector('.v2c01__stage');
    const hero = document.querySelector('.entrance.hero');
    return {
      centered: s ? getComputedStyle(s).marginInlineStart === getComputedStyle(s).marginInlineEnd : false,
      daypart: hero ? hero.getAttribute('data-daypart') : null
    };
  })()`);
  check('PKT-2 01 stage が中央寄せ（右端 strip 解消）', c01.centered);
  check('01 五段階 daypart 契約が維持されている',
    ['morning', 'day', 'evening', 'night', 'midnight'].includes(c01.daypart), String(c01.daypart));

  /* ---------- PKT-2 desktop ---------- */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  await go(page, '02');
  await page.waitForTimeout(300);
  const desk = await page.evaluate(`(() => {
    const sec = document.getElementById('counter');
    const cs = getComputedStyle(sec);
    const r = sec.getBoundingClientRect();
    return { maxWidth: cs.maxWidth, width: r.width, vw: window.innerWidth,
             docScrollW: document.documentElement.scrollWidth };
  })()`);
  check('PKT-2 desktop で section の 920px 左寄せ制約が解除されている',
    desk.maxWidth === 'none', desk.maxWidth);
  check('PKT-2 desktop で横スクロールが出ない',
    desk.docScrollW <= desk.vw + 1, desk.docScrollW + ' > ' + desk.vw);

  /* ---------- responsive sweep ---------- */
  for (const w of [320, 390, 430, 1024, 1280, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(220);
    const ov = await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1');
    check('Responsive ' + w + 'px で横 overflow なし', ov);
  }

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
