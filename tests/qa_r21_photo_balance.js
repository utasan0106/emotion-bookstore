/* =============================================================================
 * V2 Beta0 — Round 2.1 / FIX-10 写真と文字の比率 QA
 * -----------------------------------------------------------------------------
 * portrait / square / landscape の「無加工の元画像」をそのまま流し込み、
 *   ・写真 1 枚で first view を使い切らないこと
 *   ・写真の直後のことば（本文）が同じ体験の中で読めること
 *   ・3 比率とも同じ component で破綻しないこと
 * を実測する。人手による事前 crop / resize / 専用 thumbnail を前提にしない。
 *
 * 表示だけを検証する（保存・写真契約・schema には触れない）。
 * 使い方: node tests/qa_r21_photo_balance.js
 * ========================================================================== */
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

/* 無加工の元画像を模した SVG data URI（縦長 3:4 / 正方形 / 横長 16:9）。
   実際の投稿画像と同じく、こちら側で crop も resize もしていないものを渡す。 */
function img(w, h, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#8a6b4a"/>
    <circle cx="${w / 2}" cy="${h * 0.32}" r="${Math.min(w, h) * 0.18}" fill="#e6d6bb"/>
    <text x="${w / 2}" y="${h * 0.9}" font-size="${Math.min(w, h) * 0.1}" fill="#f4e9d6"
      text-anchor="middle" font-family="sans-serif">${label}</text></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

const CASES = [
  { name: 'portrait 3:4', src: img(900, 1200, 'P') },
  { name: 'portrait 9:16', src: img(900, 1600, 'P16') },
  { name: 'square 1:1', src: img(1000, 1000, 'S') },
  { name: 'landscape 16:9', src: img(1600, 900, 'L') }
];

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();

  for (const theme of ['day', 'night']) {
    for (const vp of [...L.MOBILE, ...L.DESKTOP]) {
      const { ctx, page } = await L.openPage(browser, { ...vp, theme, lang: 'ja' });
      await L.boot(page, base);
      await L.enterStore(page);

      for (const c of CASES) {
        /* 07 Reader の紙面へ、無加工の元画像をそのまま入れて表示だけを測る。
           保存も製本もしない（DOM を一時的に表示して寸法を読むだけ）。 */
        const m = await page.evaluate(async ({ src }) => {
          /* 07 は subview なので、既存の切り替え規則どおり
             「本棚ページを表示 → .v2c07 を現在の subview にする」で見える状態にする。
             保存も製本もしない。測り終えたら元に戻す。 */
          if (typeof goToPage === 'function') goToPage('bookshelf');
          await new Promise(r => setTimeout(r, 150));
          const page07 = document.querySelector('.v2c07');
          const siblings = Array.from(document.querySelectorAll('[data-v2-subview-of]'));
          const had = siblings.map(el => el.classList.contains('is-v2-current-subview'));
          siblings.forEach(el => el.classList.remove('is-v2-current-subview'));
          page07.classList.add('is-v2-current-subview');
          const fig = page07.querySelector('.v2c07__photo');
          fig.classList.remove('v2-placeholder');
          let im = fig.querySelector('img');
          if (!im) { im = document.createElement('img'); im.className = 'v2-reader__cover-img'; fig.appendChild(im); }
          im.setAttribute('src', src);
          const body = page07.querySelector('.v2c07__body');
          if (!body.textContent.trim()) {
            body.textContent = 'ここに本文が入ります。'.repeat(6);
          }
          await new Promise(r => { if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const fr = fig.getBoundingClientRect();
          const br = body.getBoundingClientRect();
          const ir = im.getBoundingClientRect();
          const cs = getComputedStyle(im);
          const out = {
            figH: +fr.height.toFixed(1), figW: +fr.width.toFixed(1),
            imgH: +ir.height.toFixed(1), imgW: +ir.width.toFixed(1),
            objectFit: cs.objectFit,
            natural: im.naturalWidth + 'x' + im.naturalHeight,
            bodyTopFromFigTop: +(br.top - fr.top).toFixed(1),
            ih: window.innerHeight,
            figShareOfViewport: +(fr.height / window.innerHeight).toFixed(3),
            overflowX: document.documentElement.scrollWidth > window.innerWidth + 1
          };
          // 後始末：注入した画像と subview 状態を元へ戻す
          im.remove(); fig.classList.add('v2-placeholder');
          siblings.forEach((el, i) => el.classList.toggle('is-v2-current-subview', had[i]));
          return out;
        }, { src: c.src });

        const tag = `[${vp.label}-${theme}][${c.name}]`;
        // 空振り検知：非表示要素を測って「PASS」になるのを防ぐ
        check(`${tag} 07 Reader が実際に表示されている（計測が空振りでない）`,
          m.figH > 0 && m.imgW > 0, `figH=${m.figH} imgW=${m.imgW}`);
        check(`${tag} 写真 1 枚が first view を使い切らない（<= 60%）`,
          m.figShareOfViewport <= 0.60, `share=${(m.figShareOfViewport * 100).toFixed(0)}% figH=${m.figH} ih=${m.ih}`);
        check(`${tag} 写真の直後の本文が first view 内から始まる`,
          m.figH + 40 < m.ih, `figH=${m.figH} ih=${m.ih}`);
        check(`${tag} 表示側で比率を吸収している（object-fit 指定あり）`,
          m.objectFit === 'cover' || m.objectFit === 'contain', 'object-fit=' + m.objectFit);
        check(`${tag} 横スクロールが出ない`, !m.overflowX);
        check(`${tag} 画像が潰れていない（高さ 80px 以上）`, m.imgH >= 80, `imgH=${m.imgH}`);
      }
      await ctx.close();
    }
  }
  await browser.close(); srv.close();

  const fail = results.filter(r => !r.ok);
  console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  if (fail.length) {
    console.log('--- FAILED ---');
    fail.slice(0, 20).forEach(f => console.log('  ' + f.name + '  → ' + f.detail));
  }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
