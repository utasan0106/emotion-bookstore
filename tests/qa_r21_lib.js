/* =============================================================================
 * V2 Beta0 — Round 2.1 実ブラウザ QA 共通ライブラリ
 * -----------------------------------------------------------------------------
 * 既存 smoke test（tests/smoke_test_v2_round1_localization.js 等）と同じ
 * 「静的サーバ + Chromium」方式を再利用する。保存・製本・GA4・外部通信の契約は
 * 一切呼び分けない（読み取りと計測のみ）。
 * ========================================================================== */
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

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

/* DAY / NIGHT を端末時刻に依存させずに固定する。
   main.js の isNightHour() は Date#getHours() を見るため、Date を差し替える。
   タイムゾーン契約（HARDEN-01 HOLD）には触れない。テスト側の時刻固定のみ。 */
function clockInit(hour) {
  return `(() => {
    const H = ${hour};
    const RealDate = Date;
    // 2026-08-13（木）の指定時刻に固定する
    const FIXED = new RealDate(2026, 7, 13, H, 24, 0);
    function FakeDate(...a) {
      if (!(this instanceof FakeDate)) return new RealDate(FIXED).toString();
      if (a.length === 0) return new RealDate(FIXED);
      return new RealDate(...a);
    }
    FakeDate.prototype = RealDate.prototype;
    FakeDate.now = () => FIXED.getTime();
    FakeDate.parse = RealDate.parse;
    FakeDate.UTC = RealDate.UTC;
    window.Date = FakeDate;
  })()`;
}

async function openPage(browser, { width, height, theme, lang }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page._errors = errors;
  // theme: 'day' → 12時 / 'night' → 22時
  await page.addInitScript(clockInit(theme === 'night' ? 22 : 12));
  // 言語は保存キーを直接触らず、既存のメニュー内トグル（ensureLang）で切り替える。
  page._wantLang = lang || 'ja';
  return { ctx, page };
}

async function boot(page, base) {
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForSelector('html[data-v2-mounted="true"]', { timeout: 15000 });
  await page.waitForTimeout(250);
}

async function currentLang(page) {
  return page.evaluate('typeof currentLang === "function" ? currentLang() : null');
}

/* 言語を確実に want へ合わせる（メニューのトグルを使う既存経路） */
async function ensureLang(page, want) {
  let cur = await currentLang(page);
  if (cur === want) return cur;
  await page.evaluate('(() => { if (typeof openExperienceMenu === "function") openExperienceMenu(); })()');
  await page.waitForTimeout(150);
  await page.click('#langToggle');
  await page.waitForTimeout(350);
  await page.evaluate('(() => { if (typeof closeExperienceMenu === "function") closeExperienceMenu(); })()');
  await page.waitForTimeout(250);
  return currentLang(page);
}

async function activeScreen(page) {
  return page.evaluate(`(() => {
    const p = Array.from(document.querySelectorAll('.v2-page')).find(el => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && el.getClientRects().length > 0;
    });
    return p ? p.getAttribute('data-v2-screen') : null;
  })()`);
}

async function go(page, screen) {
  await page.evaluate(`(() => {
    const b = document.querySelector('[data-v2-go="${screen}"]:not([hidden])');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(420);
}

/* 01 → 02（入店） */
async function enterStore(page) {
  await page.evaluate(`(() => {
    const b = document.querySelector('.v2c01 [data-v2-go="02"], .v2c01__cta');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(520);
}

async function openShelf(page, shelfId) {
  await page.evaluate(`(() => {
    const b = document.querySelector('[data-v2-shelf-trigger="${shelfId}"]');
    if (b) b.click();
  })()`);
  await page.waitForTimeout(520);
}

async function openMenu(page) {
  await page.evaluate('(() => { if (typeof openExperienceMenu === "function") openExperienceMenu(); })()');
  await page.waitForTimeout(300);
}

async function closeMenu(page) {
  await page.evaluate('(() => { if (typeof closeExperienceMenu === "function") closeExperienceMenu(); })()');
  await page.waitForTimeout(250);
}

/* 要素の可視 rect（複数ヒット時は先頭の可視要素） */
const RECT_FN = `(sel) => {
  const els = Array.from(document.querySelectorAll(sel));
  const el = els.find(e => {
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && e.getClientRects().length > 0;
  });
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
}`;

async function rect(page, sel) {
  return page.evaluate(`(${RECT_FN})(${JSON.stringify(sel)})`);
}

/* テキストノードだけの実測 bounding box（Range 単位。padding / letter-spacing を含まない） */
const TEXT_RECT_FN = `(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const range = document.createRange();
  let box = null;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!(n.nodeValue || '').trim()) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width <= 0 || r.height <= 0) continue;
      box = box
        ? { left: Math.min(box.left, r.left), right: Math.max(box.right, r.right),
            top: Math.min(box.top, r.top), bottom: Math.max(box.bottom, r.bottom) }
        : { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }
  }
  if (!box) return null;
  box.w = box.right - box.left; box.h = box.bottom - box.top;
  return box;
}`;

async function textRect(page, sel) {
  return page.evaluate(`(${TEXT_RECT_FN})(${JSON.stringify(sel)})`);
}

/* 折り返し後の実際の行を返す（Range を 1 文字ずつ走査し top で行を切る） */
const LINES_FN = `(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const out = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const s = n.nodeValue || '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      range.setStart(n, i); range.setEnd(n, i + 1);
      const r = range.getBoundingClientRect();
      if (!r.height) continue;
      const last = out[out.length - 1];
      if (last && Math.abs(last.top - r.top) < 2) { last.text += ch; last.right = Math.max(last.right, r.right); }
      else out.push({ top: r.top, left: r.left, right: r.right, text: ch });
    }
  }
  return out.map(l => ({ top: Math.round(l.top), text: l.text, trimmed: l.text.trim(), w: Math.round(l.right - l.left) }));
}`;

async function lines(page, sel) {
  return page.evaluate(`(${LINES_FN})(${JSON.stringify(sel)})`);
}

function overlapX(a, b) {
  if (!a || !b) return null;
  return Math.min(a.right, b.right) - Math.max(a.left, b.left);
}

const MOBILE = [
  { width: 320, height: 568, label: '320' },
  { width: 390, height: 844, label: '390' },
  { width: 430, height: 932, label: '430' }
];
const DESKTOP = [
  { width: 1024, height: 768, label: '1024' },
  { width: 1440, height: 900, label: '1440' }
];
const SHELVES = ['hazumu', 'atatamaru', 'hikareru', 'shizumu', 'zawatsuku', 'butsukaru', 'miwohiku', 'namae-ga-nai'];

module.exports = {
  ROOT, serve, openPage, boot, ensureLang, currentLang, activeScreen, go,
  enterStore, openShelf, openMenu, closeMenu, rect, textRect, lines, overlapX,
  MOBILE, DESKTOP, SHELVES
};
