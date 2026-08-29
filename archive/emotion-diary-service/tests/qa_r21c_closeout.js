/* =============================================================================
 * V2 Beta0 — Round 2.1 Final Closeout QA
 * -----------------------------------------------------------------------------
 * ACTIVE-FIX-01  02「自分の本棚を見る」本文の分断・孤立
 * ACTIVE-FIX-03  04「作品」lead の末尾落ち
 * ACTIVE-FIX-04  Menu section heading が押せる要素に見えない
 * ACTIVE-FIX-11  05 textarea / placeholder / counter の枠内収まり
 * ACTIVE-FIX-12  写真が「頁に挟まれた一枚」として、crop 0 で全体表示される
 * ACTIVE-FIX-08  desktop で mobile ribbon になっていない
 *
 * 何も変更しない（観測のみ）。
 * 使い方: node tests/qa_r21c_closeout.js [--shots <dir>]
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const i = process.argv.indexOf('--shots');
const SHOT = i > -1 ? process.argv[i + 1] : null;
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}
function note(m) { console.log('        · ' + m); }
/* ACTIVE-FIX-08 の契約
 *   01/02/03 は Reference が縦長キャンバスなので幅では判定しない。
 *   「余白が flat な地色のままでない（同じ部屋が続いている）」ことを判定する。
 *   04〜08 は文字組・grid なので、desktop で使う幅の下限で判定する。 */
const SCENE = new Set(['01', '02', '03']);
const MIN_CONTENT_W = 640;
async function shot(page, n) { if (SHOT) await page.screenshot({ path: path.join(SHOT, n + '.png') }); }

function img(w, h, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#7d6a52"/>
    <circle cx="${w / 2}" cy="${h * 0.35}" r="${Math.min(w, h) * 0.22}" fill="#e8dcc4"/>
    <rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="#f2ead9" stroke-width="4"/>
    <text x="${w / 2}" y="${h * 0.88}" font-size="${Math.min(w, h) * 0.11}" fill="#f6efe0"
      text-anchor="middle" font-family="sans-serif">${label}</text></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}
const PHOTOS = [
  { name: 'portrait 9:16', src: img(900, 1600, 'P916'), ar: 900 / 1600 },
  { name: 'portrait 3:4', src: img(900, 1200, 'P34'), ar: 900 / 1200 },
  { name: 'square 1:1', src: img(1000, 1000, 'SQ'), ar: 1 },
  { name: 'landscape 4:3', src: img(1200, 900, 'L43'), ar: 1200 / 900 },
  { name: 'landscape 16:9', src: img(1600, 900, 'L169'), ar: 1600 / 900 }
];

const LINES = `(sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const out = []; const r = document.createRange();
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const s = n.nodeValue || '';
    for (let i = 0; i < s.length; i++) { r.setStart(n, i); r.setEnd(n, i + 1);
      const b = r.getBoundingClientRect(); if (!b.height) continue;
      const last = out[out.length - 1];
      if (last && Math.abs(last.top - b.top) < 2) last.t += s[i]; else out.push({ top: b.top, t: s[i] });
    } }
  return out.map(l => l.t.trim()).filter(Boolean);
}`;

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const theme of ['day', 'night']) {
    for (const lang of ['ja', 'en']) {
      for (const vp of [...L.MOBILE, ...L.DESKTOP]) {
        const tag = `${vp.label}-${theme}-${lang}`;
        const { ctx, page } = await L.openPage(browser, { ...vp, theme, lang });
        await L.boot(page, base);
        if ((await L.ensureLang(page, lang)) !== lang) { await ctx.close(); continue; }
        const isMobile = L.MOBILE.some(m => m.label === vp.label);

        /* ---------- 01 ---------- */
        await shot(page, `01-${tag}`);
        if (!isMobile) {
          const m01 = await page.evaluate(`(() => {
            const e = document.querySelector('.v2c01__stage');
            const r = e.getBoundingClientRect();
            const pg = e.closest('.v2-page');
            const bcs = getComputedStyle(pg, '::before');
            return {
              w: Math.round(r.width), gutter: Math.round(Math.min(r.left, innerWidth - r.right)),
              groundImage: getComputedStyle(pg).backgroundImage !== 'none',
              groundBlur: /blur\\(/.test(bcs.backdropFilter || bcs.webkitBackdropFilter || ''),
              edge: getComputedStyle(e).boxShadow !== 'none',
              overflowX: document.documentElement.scrollWidth > innerWidth + 1
            };
          })()`);
          note(`[${tag}] FIX-08 01: ${JSON.stringify(m01)}`);
          check(`[${tag}] FIX-08 01: 余白が flat な地色のままでない`,
            m01.groundImage && m01.groundBlur, JSON.stringify(m01));
          check(`[${tag}] FIX-08 01: キャンバスの縁が受けられている`, m01.edge, 'box-shadow なし');
          check(`[${tag}] FIX-08 01: 横スクロールが出ない`, !m01.overflowX);
        }

        /* ---------- 02 / ACTIVE-FIX-01 ---------- */
        await L.enterStore(page);
        const c3 = await page.evaluate(`(${LINES})('.v2c02__card:nth-of-type(3) .v2c02__carddesc')`);
        if (c3) {
          note(`[${tag}] 02 card3: ${c3.map(x => `「${x}」`).join(' ')}`);
          check(`[${tag}] FIX-01「一冊に／した」が分断されない`,
            !c3.some(l => l.endsWith('一冊に') || l.startsWith('した')), c3.join(' | '));
          const orph = lang === 'ja'
            ? c3.filter(l => l.length <= 2)
            : c3.filter(l => l.replace(/[.,]/g, '').length <= 3);
          check(`[${tag}] FIX-01 孤立行がない`, orph.length === 0, c3.join(' | '));
        }
        /* 3 カードの visual balance（幅が揃っている） */
        const cw = await page.evaluate(`Array.from(document.querySelectorAll('.v2c02__card')).map(c => Math.round(c.getBoundingClientRect().width))`);
        check(`[${tag}] FIX-01 3 カードの幅が揃う`, new Set(cw).size === 1, cw.join(','));
        await shot(page, `02-${tag}`);

        /* ---------- 03 ---------- */
        await L.go(page, '03');
        const inView = await page.evaluate(`(() => {
          const bs = Array.from(document.querySelectorAll('.v2c03__grid .v2c03__book'));
          const nav = document.querySelector('.v2c03 .v2b-nav');
          const lim = Math.min(innerHeight, nav ? nav.getBoundingClientRect().top : innerHeight);
          return bs.filter(b => { const r = b.getBoundingClientRect(); return r.top >= -1 && r.bottom <= lim + 1; }).length;
        })()`);
        if (isMobile) check(`[${tag}] 03 8棚 first view 維持`, inView === 8, 'inView=' + inView);
        else note(`[${tag}] 03 desktop inView=${inView}/8`);
        await shot(page, `03-${tag}`);

        /* ---------- 04 / ACTIVE-FIX-03 ---------- */
        await L.openShelf(page, 'atatamaru');
        const wl = await page.evaluate(`(${LINES})('.v2c04__intro')`);
        if (wl) {
          note(`[${tag}] 04 作品lead: ${wl.map(x => `「${x}」`).join(' ')}`);
          const orph = lang === 'ja' ? wl.filter(l => l.length <= 2)
                                     : wl.filter(l => l.replace(/[.,]/g, '').length <= 3);
          check(`[${tag}] FIX-03 作品lead に1〜2文字落ちがない`, orph.length === 0, wl.join(' | '));
          if (lang === 'ja' && (vp.label === '390' || vp.label === '430')) {
            check(`[${tag}] FIX-03 390/430 で原則 1 行`, wl.length === 1, 'lines=' + wl.length);
          }
        }
        await shot(page, `04-atatamaru-${tag}`);

        /* ---------- 05 / ACTIVE-FIX-11 ---------- */
        await L.go(page, '02'); await L.go(page, '05');
        await shot(page, `05-empty-${tag}`);
        const fit = async (label) => {
          const m = await page.evaluate(`(() => {
            const ta = document.querySelector('.v2c05__textarea');
            const wrap = document.querySelector('.v2c05__tawrap');
            const cnt = document.querySelector('.v2c05__count');
            const tr = ta.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), cr = cnt.getBoundingClientRect();
            const cs = getComputedStyle(ta);
            return {
              boxSizing: cs.boxSizing,
              taOverflowsWrap: (tr.right > wr.right + 0.5) || (tr.left < wr.left - 0.5) || (tr.bottom > wr.bottom + 0.5),
              cntInsideWrap: cr.right <= wr.right + 0.5 && cr.bottom <= wr.bottom + 0.5 && cr.left >= wr.left - 0.5,
              cntOverlapsTa: cr.top < tr.bottom - 0.5,
              scrollOverflowX: ta.scrollWidth > ta.clientWidth + 1,
              /* placeholder clip：本文欄は複数行なので、縦に溢れていないかで見る */
              phClipped: ta.scrollHeight > ta.clientHeight + 1,
              /* 題名欄（1 行 input）の placeholder は別枠で観測する */
              titlePh: (() => {
                const el = document.querySelector('#v2bTitleInput');
                if (!el) return null;
                const c = getComputedStyle(el);
                const cv = document.createElement('canvas').getContext('2d');
                cv.font = c.fontStyle + ' ' + c.fontWeight + ' ' + c.fontSize + ' ' + c.fontFamily;
                const lsp = parseFloat(c.letterSpacing) || 0;
                const ph = el.placeholder || '';
                const tw = cv.measureText(ph).width + lsp * ph.length;
                const inner = el.getBoundingClientRect().width
                  - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight)
                  - parseFloat(c.borderLeftWidth) - parseFloat(c.borderRightWidth);
                return { over: +(tw - inner).toFixed(1) };
              })(),
              padL: cs.paddingLeft, padR: cs.paddingRight, padB: cs.paddingBottom,
              taH: Math.round(tr.height), wrapH: Math.round(wr.height)
            };
          })()`);
          check(`[${tag}] FIX-11 ${label}: textarea が枠から出ない`, !m.taOverflowsWrap, JSON.stringify(m));
          check(`[${tag}] FIX-11 ${label}: counter が枠内`, m.cntInsideWrap);
          check(`[${tag}] FIX-11 ${label}: counter が本文と重ならない`, !m.cntOverlapsTa);
          check(`[${tag}] FIX-11 ${label}: 横スクロールが出ない`, !m.scrollOverflowX);
          /* placeholder clip の判定は空欄のときだけ。長文では textarea が
             スクロールするのが正しい挙動なので、縦の溢れは欠陥ではない。 */
          if (label === '空') {
            check(`[${tag}] FIX-11 ${label}: placeholder が枠内に収まる`, !m.phClipped,
              `clientH=${m.taH} < scrollH (${JSON.stringify(m)})`);
          }
          if (m.titlePh && m.titlePh.over > 0) {
            /* ACTIVE-FIX-11 の対象は本文入力欄。題名欄の placeholder はここでは判定せず、
               既知の観測として必ずログへ残す（Completion Report で申し送る）。 */
            note(`[${tag}] 観測: 題名欄 placeholder が枠幅を ${m.titlePh.over}px 超過（本文欄ではない）`);
          }
          return m;
        };
        await fit('空');
        await page.fill('#v2bStoryInput', 'あの日の帰り道のことを、まだうまく言葉にできないでいる。'.repeat(14)).catch(() => {});
        await page.waitForTimeout(250);
        await fit('長文');
        await shot(page, `05-long-${tag}`);

        /* ---------- ACTIVE-FIX-12：写真 ---------- */
        for (const p of PHOTOS) {
          const pm = await page.evaluate(async ({ src, ar }) => {
            const prev = document.querySelector('.v2c05__photoprev');
            prev.removeAttribute('hidden');
            const im = document.querySelector('.v2c05__photoimg');
            im.setAttribute('src', src);
            await new Promise(r => { if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const cs = getComputedStyle(im);
            /* 台紙は僅かに回転しているため getBoundingClientRect は「回転後の外接矩形」を返す。
             * 歪み（crop）の判定には回転前の layout box（computed width/height）を使う。
             * 画面占有率は実際に見えている外接矩形で測る。 */
            const bw = parseFloat(cs.width), bh = parseFloat(cs.height);
            const r = im.getBoundingClientRect();
            const ta = document.querySelector('.v2c05__textarea').getBoundingClientRect();
            const out = {
              w: +bw.toFixed(1), h: +bh.toFixed(1),
              renderedAR: +(bw / bh).toFixed(3), naturalAR: +ar.toFixed(3),
              fit: cs.objectFit,
              share: +(r.height / innerHeight).toFixed(3),
              taStillVisible: ta.height > 60
            };
            prev.setAttribute('hidden', ''); im.removeAttribute('src');
            return out;
          }, { src: p.src, ar: p.ar });
          check(`[${tag}] FIX-12 05 ${p.name}: 比率が歪まない（crop 0）`,
            Math.abs(pm.renderedAR - pm.naturalAR) < 0.02 && pm.fit === 'contain',
            `rendered=${pm.renderedAR} natural=${pm.naturalAR} fit=${pm.fit} box=${pm.w}x${pm.h}`);
          check(`[${tag}] FIX-12 05 ${p.name}: 入力欄を圧迫しない`,
            pm.share <= 0.34 && pm.taStillVisible, `share=${(pm.share * 100).toFixed(0)}%`);
        }
        if (isMobile && lang === 'ja' && theme === 'day') {
          await page.evaluate(`(async () => {
            const prev = document.querySelector('.v2c05__photoprev'); prev.removeAttribute('hidden');
            const im = document.querySelector('.v2c05__photoimg');
            im.setAttribute('src', ${JSON.stringify(PHOTOS[0].src)});
            await new Promise(r => { if (im.complete) r(); else { im.onload = r; } });
          })()`);
          await page.waitForTimeout(200);
          await shot(page, `05-photo-portrait-${tag}`);
          await page.evaluate(`(() => { const p=document.querySelector('.v2c05__photoprev'); p.setAttribute('hidden',''); document.querySelector('.v2c05__photoimg').removeAttribute('src'); })()`);
        }

        /* ---------- 07 Reader：写真のない一冊で空の紙が残らない ---------- */
        const emptyFig = await page.evaluate(`(() => {
          if (typeof goToPage === 'function') goToPage('bookshelf');
          const p07 = document.querySelector('.v2c07');
          const sib = Array.from(document.querySelectorAll('[data-v2-subview-of]'));
          const had = sib.map(e => e.classList.contains('is-v2-current-subview'));
          sib.forEach(e => e.classList.remove('is-v2-current-subview'));
          p07.classList.add('is-v2-current-subview');
          const fig = p07.querySelector('.v2c07__photo');
          fig.classList.add('v2-placeholder');
          Array.from(fig.querySelectorAll('img')).forEach(i => i.remove());
          const cs = getComputedStyle(fig); const r = fig.getBoundingClientRect();
          const out = { display: cs.display, w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
          sib.forEach((e, i) => e.classList.toggle('is-v2-current-subview', had[i]));
          return out;
        })()`);
        check(`[${tag}] FIX-12 07 写真のない一冊で空の紙が残らない`,
          emptyFig.display === 'none' && emptyFig.w === 0, JSON.stringify(emptyFig));

        /* ---------- 07 Reader 写真 ---------- */
        for (const p of PHOTOS) {
          const rm = await page.evaluate(async ({ src, ar }) => {
            if (typeof goToPage === 'function') goToPage('bookshelf');
            await new Promise(r => setTimeout(r, 150));
            const p07 = document.querySelector('.v2c07');
            const sib = Array.from(document.querySelectorAll('[data-v2-subview-of]'));
            const had = sib.map(e => e.classList.contains('is-v2-current-subview'));
            sib.forEach(e => e.classList.remove('is-v2-current-subview'));
            p07.classList.add('is-v2-current-subview');
            const fig = p07.querySelector('.v2c07__photo');
            fig.classList.remove('v2-placeholder');
            let im = fig.querySelector('img');
            if (!im) { im = document.createElement('img'); im.className = 'v2-reader__cover-img'; fig.appendChild(im); }
            im.setAttribute('src', src);
            const body = p07.querySelector('.v2c07__body');
            if (!body.textContent.trim()) body.textContent = 'ここに本文が入ります。'.repeat(8);
            await new Promise(r => { if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const cs = getComputedStyle(im);
            /* 05 と同じ理由（台紙の回転）で、crop 判定は回転前の layout box を使う。 */
            const bw = parseFloat(cs.width), bh = parseFloat(cs.height);
            const fr = fig.getBoundingClientRect();
            const out = {
              w: +bw.toFixed(1), h: +bh.toFixed(1),
              renderedAR: +(bw / bh).toFixed(3), naturalAR: +ar.toFixed(3),
              fit: cs.objectFit,
              share: +(fr.height / innerHeight).toFixed(3),
              overflowX: document.documentElement.scrollWidth > innerWidth + 1
            };
            im.remove(); fig.classList.add('v2-placeholder');
            sib.forEach((e, i) => e.classList.toggle('is-v2-current-subview', had[i]));
            return out;
          }, { src: p.src, ar: p.ar });
          check(`[${tag}] FIX-12 07 ${p.name}: 比率が歪まない（crop 0）`,
            Math.abs(rm.renderedAR - rm.naturalAR) < 0.02 && rm.fit === 'contain',
            `rendered=${rm.renderedAR} natural=${rm.naturalAR} fit=${rm.fit} box=${rm.w}x${rm.h}`);
          check(`[${tag}] FIX-12 07 ${p.name}: 本文を圧倒しない`, rm.share <= 0.55, `share=${(rm.share * 100).toFixed(0)}%`);
          check(`[${tag}] FIX-12 07 ${p.name}: 横スクロールが出ない`, !rm.overflowX);
        }

        /* ---------- メニュー / ACTIVE-FIX-04 ---------- */
        await L.openMenu(page);
        const menu = await page.evaluate(`(() => {
          const h = Array.from(document.querySelectorAll('#experienceMenu .experience-menu-section'))
            .find(s => s.getAttribute('data-i18n') === 'v2MenuTrustSection');
          if (!h) return null;
          const cs = getComputedStyle(h);
          const wrap = h.nextElementSibling;
          const sum = document.querySelector('.about-data-accordion summary');
          return {
            tag: h.tagName, interactive: !!h.closest('button,summary,a,[role=button]'),
            cursor: cs.cursor, bg: cs.backgroundColor,
            borderBottom: cs.borderBottomWidth, borderLeft: cs.borderLeftWidth,
            hasArrow: /[▼▲▾▸]/.test(h.textContent),
            nextBorderTop: wrap ? getComputedStyle(wrap).borderTopWidth : null,
            realAccordionBorder: sum ? getComputedStyle(sum).borderTopWidth : null,
            fs: parseFloat(cs.fontSize)
          };
        })()`);
        if (menu) {
          check(`[${tag}] FIX-04 見出しが button/summary/a の中に無い`, !menu.interactive);
          check(`[${tag}] FIX-04 見出しに矢印が無い`, !menu.hasArrow);
          check(`[${tag}] FIX-04 見出しに背景・囲み枠が無い`,
            menu.bg === 'rgba(0, 0, 0, 0)' && menu.borderBottom === '0px' && menu.borderLeft === '0px',
            JSON.stringify(menu));
          check(`[${tag}] FIX-04 見出しの直下が破線で閉じていない`, menu.nextBorderTop === '0px', 'next=' + menu.nextBorderTop);
          check(`[${tag}] FIX-04 cursor が pointer でない`, menu.cursor !== 'pointer', menu.cursor);
        }
        await shot(page, `menu-${tag}`);
        await page.click('.about-data-accordion summary').catch(() => {});
        await page.waitForTimeout(250);
        await shot(page, `menu-data-${tag}`);
        await L.closeMenu(page);

        /* ---------- ACTIVE-FIX-08：desktop 幅の使い方 ---------- */
        if (!isMobile) {
          /* いま「実際に見えている」stage を測る。hidden な stage は幅 0 になるので必ず遷移してから測る。 */
          const MEASURE = `(() => {
            const cand = Array.from(document.querySelectorAll('[class*="__stage"]'))
              .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
            if (!cand.length) return null;
            const e = cand.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
            const r = e.getBoundingClientRect();
            const cls = (e.className.match(/v2c\\d\\d__stage/) || ['?'])[0];
            const page = e.closest('.v2-page');
            const pcs = page ? getComputedStyle(page) : null;
            const bcs = page ? getComputedStyle(page, '::before') : null;
            return {
              cls, w: Math.round(r.width), ratio: +(r.width / innerWidth).toFixed(2),
              gutter: Math.round(Math.min(r.left, innerWidth - r.right)),
              /* 余白の地：page 面が同じ部屋の続きを描いているか */
              groundImage: pcs ? pcs.backgroundImage !== 'none' : false,
              groundBlur: bcs ? /blur\\(/.test(bcs.backdropFilter || bcs.webkitBackdropFilter || '') : false,
              /* キャンバスの縁が受けられているか */
              edge: getComputedStyle(e).boxShadow !== 'none',
              overflowX: document.documentElement.scrollWidth > innerWidth + 1
            };
          })()`;
          const screens = [
            ['02', async () => L.go(page, '02')],
            ['03', async () => L.go(page, '03')],
            ['04', async () => { await L.go(page, '03'); await L.openShelf(page, 'atatamaru'); }],
            ['05', async () => { await L.go(page, '02'); await L.go(page, '05'); }],
            ['06/08', async () => { await L.go(page, '02'); await L.go(page, 'bookshelf').catch(() => {}); }]
          ];
          for (const [nm, nav] of screens) {
            await nav().catch(() => {});
            await page.waitForTimeout(150);
            const m = await page.evaluate(MEASURE);
            if (!m) { check(`[${tag}] FIX-08 ${nm}: stage を計測できた`, false, '可視 stage なし'); continue; }
            note(`[${tag}] FIX-08 ${nm}: ${JSON.stringify(m)}`);
            if (SCENE.has(nm)) {
              check(`[${tag}] FIX-08 ${nm}: 余白が flat な地色のままでない`,
                m.groundImage && m.groundBlur, JSON.stringify(m));
              check(`[${tag}] FIX-08 ${nm}: キャンバスの縁が受けられている`, m.edge, 'box-shadow なし');
            } else {
              check(`[${tag}] FIX-08 ${nm}: desktop で幅を使っている`,
                m.w >= MIN_CONTENT_W, `${m.cls} w=${m.w} (>=${MIN_CONTENT_W})`);
            }
            check(`[${tag}] FIX-08 ${nm}: 横スクロールが出ない`, !m.overflowX);
          }
        }

        if (page._errors.length) note(`[${tag}] JS error: ${page._errors.slice(0, 2).join(' | ')}`);
        await ctx.close();
      }
    }
  }

  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\n================ SUMMARY ================`);
  console.log(`total=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) {
    const g = new Map();
    for (const f of fail) { const k = f.name.replace(/^\[[^\]]+\]\s*/, ''); if (!g.has(k)) g.set(k, []); g.get(k).push(f); }
    for (const [k, arr] of g) { console.log(`\n[${arr.length}x] ${k}`); arr.slice(0, 3).forEach(f => console.log('   ' + f.name + ' → ' + f.detail)); }
  }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
