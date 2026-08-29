/* =============================================================================
 * V2 Beta0 — Round 2.1 実測スクリプト（受入判定つき）
 * -----------------------------------------------------------------------------
 * FIX-01  04 Emotion Detail hero の縦伸び回帰
 * FIX-02  01 EN CTA のオーナメント衝突
 * FIX-03  03 案内カードの中央配置（+ 8棚 first view 契約の維持）
 * FIX-04  02 Lobby「自分の本棚を見る」本文の孤立行
 * FIX-05  店内メニュー「この書店について・データの扱い」の見出し階層
 * FIX-06  05 編纂室の今日の日付
 * ICON-SET-01  03 大棚アイコン
 *
 * 保存・製本・GA4・外部通信は呼ばない（描画の読み取りと計測のみ）。
 * 使い方: node tests/qa_r21_measure.js [--shots <dir>]
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('./qa_r21_lib');

const argShots = process.argv.indexOf('--shots');
const SHOT_DIR = argShots > -1 ? process.argv[argShots + 1] : null;
if (SHOT_DIR) fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  → ' + detail));
}
function note(msg) { console.log('        · ' + msg); }

async function shot(page, name) {
  if (!SHOT_DIR) return;
  await page.screenshot({ path: path.join(SHOT_DIR, name + '.png'), fullPage: false });
}

(async () => {
  const srv = await L.serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const allErrors = [];

  for (const theme of ['day', 'night']) {
    for (const lang of ['ja', 'en']) {
      for (const vp of [...L.MOBILE, ...L.DESKTOP]) {
        const tag = `${vp.label}-${theme}-${lang}`;
        const { ctx, page } = await L.openPage(browser, { ...vp, theme, lang });
        await L.boot(page, base);
        const got = await L.ensureLang(page, lang);
        if (got !== lang) { check(`[${tag}] 言語を ${lang} にできる`, false, 'got=' + got); await ctx.close(); continue; }

        /* ================= FIX-02 : 01 EN CTA ================= */
        const ctaT = await L.textRect(page, '.v2c01 .v2c01__cta');
        const flL = await L.rect(page, '.v2c01 .v2c01__cta-fl--l');
        const flR = await L.rect(page, '.v2c01 .v2c01__cta-fl--r');
        if (ctaT && flL && flR) {
          const ovL = L.overlapX(flL, ctaT);
          const ovR = L.overlapX(ctaT, flR);
          check(`[${tag}] FIX-02 01 CTA 左オーナメントと文字が重ならない`, ovL <= 0, `overlap=${ovL.toFixed(1)}px`);
          check(`[${tag}] FIX-02 01 CTA 右オーナメントと文字が重ならない`, ovR <= 0, `overlap=${ovR.toFixed(1)}px`);
          const cta = await L.rect(page, '.v2c01 .v2c01__cta');
          const off = ((ctaT.left + ctaT.right) / 2) - ((cta.left + cta.right) / 2);
          check(`[${tag}] FIX-02 01 CTA 文字が看板の中央に見える`, Math.abs(off) <= 4, `offset=${off.toFixed(1)}px`);
        } else {
          check(`[${tag}] FIX-02 01 CTA の計測対象が取得できる`, false, 'cta/ornament missing');
        }
        await shot(page, `01-entrance-${tag}`);

        /* ================= 入店 → 02 Lobby ================= */
        await L.enterStore(page);
        const s2 = await L.activeScreen(page);
        check(`[${tag}] 01 → 02 へ入店できる`, s2 === '02', 'screen=' + s2);

        /* ================= FIX-04 : 02 「自分の本棚を見る」 ================= */
        const card3 = '.v2c02__card:nth-of-type(3) .v2c02__carddesc';
        const ln = await L.lines(page, card3);
        if (ln && ln.length) {
          // 受入条件：助詞や1文字だけが1行に落ちない（JA は 2 文字、EN は 1 語を下限とする）
          const orphan = lang === 'ja'
            ? ln.filter(l => l.trimmed.length > 0 && l.trimmed.length <= 2)
            : ln.filter(l => l.trimmed.length > 0 && l.trimmed.replace(/[.,]/g, '').length <= 3);
          check(`[${tag}] FIX-04 02 本棚カード本文に孤立行がない`,
            orphan.length === 0, ln.map(l => `"${l.trimmed}"`).join(' / '));
          // 行数は JA のみ 2〜3 行契約（EN は語長が違うため参考値）
          if (lang === 'ja') {
            check(`[${tag}] FIX-04 02 本棚カード本文が2〜3行に収まる`,
              ln.length >= 2 && ln.length <= 3, 'lines=' + ln.length);
          }
          note(`[${tag}] card3 lines: ` + ln.map(l => `"${l.trimmed}"`).join(' | '));
        } else {
          check(`[${tag}] FIX-04 02 本棚カード本文を計測できる`, false, 'no lines');
        }
        // title と desc の階層（desc が title より小さい）が保たれているか
        const fs3 = await page.evaluate(`(() => {
          const t = document.querySelector('.v2c02__card:nth-of-type(3) .v2c02__cardtitle');
          const d = document.querySelector('.v2c02__card:nth-of-type(3) .v2c02__carddesc');
          if (!t || !d) return null;
          return { t: parseFloat(getComputedStyle(t).fontSize), d: parseFloat(getComputedStyle(d).fontSize) };
        })()`);
        if (fs3) check(`[${tag}] FIX-04 02 題名と本文の階層が保たれる`, fs3.t > fs3.d, `title=${fs3.t} desc=${fs3.d}`);
        await shot(page, `02-lobby-${tag}`);

        /* ================= FIX-05 : 店内メニュー見出し ================= */
        await L.openMenu(page);
        const menu = await page.evaluate(`(() => {
          const secs = Array.from(document.querySelectorAll('#experienceMenu .experience-menu-section'));
          const trust = secs.find(s => s.getAttribute('data-i18n') === 'v2MenuTrustSection');
          const opt = secs.find(s => s.getAttribute('data-i18n') === 'menuSectionOptional');
          const body = document.querySelector('#experienceMenu .about-accordion-summary');
          const px = el => el ? parseFloat(getComputedStyle(el).fontSize) : null;
          const wt = el => el ? getComputedStyle(el).fontWeight : null;
          const vis = el => {
            if (!el) return false;
            const cs = getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0;
          };
          return {
            trustPx: px(trust), optPx: px(opt), bodyPx: px(body),
            trustWeight: wt(trust), optWeight: wt(opt),
            trustVisible: vis(trust), optVisible: vis(opt),
            trustText: trust ? trust.textContent.trim() : null,
            trustColor: trust ? getComputedStyle(trust).color : null,
            bodyColor: body ? getComputedStyle(body).color : null,
            trustMarginTop: trust ? getComputedStyle(trust).marginTop : null,
            trustPadTop: trust ? getComputedStyle(trust).paddingTop : null
          };
        })()`);
        check(`[${tag}] FIX-05 メニューの Trust 見出しが見える`, menu.trustVisible, JSON.stringify(menu).slice(0, 120));
        if (menu.trustVisible) {
          check(`[${tag}] FIX-05 Trust 見出しが「任意の場所へ」と同等サイズ`,
            menu.optPx != null && menu.trustPx >= menu.optPx, `trust=${menu.trustPx} opt=${menu.optPx}`);
          check(`[${tag}] FIX-05 Trust 見出しが直下の説明文より明確に大きい`,
            menu.bodyPx != null && menu.trustPx >= menu.bodyPx + 1, `trust=${menu.trustPx} body=${menu.bodyPx}`);
          note(`[${tag}] menu: trust=${menu.trustPx}px/${menu.trustWeight} opt=${menu.optPx}px/${menu.optWeight} body=${menu.bodyPx}px`);
        }
        await shot(page, `menu-${tag}`);
        await L.closeMenu(page);

        /* ================= 03 感情棚 ================= */
        await L.go(page, '03');
        const s3 = await L.activeScreen(page);
        check(`[${tag}] 02 → 03 へ移動できる`, s3 === '03', 'screen=' + s3);

        /* R2-01 : 390px で 8 棚が first view */
        const shelfInView = await page.evaluate(`(() => {
          const bs = Array.from(document.querySelectorAll('.v2c03__grid .v2c03__book'));
          const nav = document.querySelector('.v2c03 .v2b-nav');
          const navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
          const limit = Math.min(window.innerHeight, navTop);
          return {
            total: bs.length,
            inView: bs.filter(b => { const r = b.getBoundingClientRect(); return r.top >= -1 && r.bottom <= limit + 1; }).length,
            navTop, ih: window.innerHeight
          };
        })()`);
        // R2-01 の契約は mobile（320/390/430）。desktop は契約外のため参考値として記録する。
        const isMobile = L.MOBILE.some(m => m.label === vp.label);
        if (isMobile) {
          check(`[${tag}] R2-01 8棚が first view に収まる（契約維持）`,
            shelfInView.inView === 8, `inView=${shelfInView.inView}/${shelfInView.total} navTop=${Math.round(shelfInView.navTop)} ih=${shelfInView.ih}`);
        } else {
          note(`[${tag}] R2-01 desktop 参考値 inView=${shelfInView.inView}/8（契約は mobile のみ）`);
        }

        /* FIX-03 : 案内カードの中央配置 */
        const guide = await page.evaluate(`(() => {
          const g = document.querySelector('.v2c03__guide');
          const stage = document.querySelector('.v2c03__stage');
          if (!g || !stage) return null;
          const gr = g.getBoundingClientRect(), sr = stage.getBoundingClientRect();
          const sprig = g.querySelector('.v2c03__guidesprig');
          const text = g.querySelector('.v2c03__guidetext');
          const tr = text ? text.getBoundingClientRect() : null;
          const pr = sprig ? sprig.getBoundingClientRect() : null;
          const nav = document.querySelector('.v2c03 .v2b-nav');
          const navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
          return {
            frameLeftGap: gr.left - sr.left,
            frameRightGap: sr.right - gr.right,
            frameCenter: (gr.left + gr.right) / 2,
            stageCenter: (sr.left + sr.right) / 2,
            textCenter: tr ? (tr.left + tr.right) / 2 : null,
            textAlign: text ? getComputedStyle(text).textAlign : null,
            sprigLeftGap: pr ? pr.left - gr.left : null,
            navClearance: navTop - gr.bottom,
            gr: { l: gr.left, r: gr.right, t: gr.top, b: gr.bottom }
          };
        })()`);
        if (guide) {
          check(`[${tag}] FIX-03 枠の左右 margin が対称`,
            Math.abs(guide.frameLeftGap - guide.frameRightGap) <= 1.5,
            `L=${guide.frameLeftGap.toFixed(1)} R=${guide.frameRightGap.toFixed(1)}`);
          check(`[${tag}] FIX-03 枠が main content に対して中央`,
            Math.abs(guide.frameCenter - guide.stageCenter) <= 1.5,
            `frame=${guide.frameCenter.toFixed(1)} stage=${guide.stageCenter.toFixed(1)}`);
          check(`[${tag}] FIX-03 文言の視覚中心が枠の中心と一致`,
            guide.textCenter != null && Math.abs(guide.textCenter - guide.frameCenter) <= 3,
            `text=${guide.textCenter && guide.textCenter.toFixed(1)} frame=${guide.frameCenter.toFixed(1)}`);
          check(`[${tag}] FIX-03 text-align:center`, guide.textAlign === 'center', 'align=' + guide.textAlign);
          check(`[${tag}] FIX-03 bottom nav とのクリアランスが正`,
            guide.navClearance > 0, `clearance=${guide.navClearance.toFixed(1)}`);
        } else {
          check(`[${tag}] FIX-03 案内カードを計測できる`, false, 'guide missing');
        }

        /* ICON-SET-01 : 8 棚アイコンの存在と光学スケール */
        const icons = await page.evaluate(`(() => {
          const out = [];
          for (const b of document.querySelectorAll('.v2c03__grid .v2c03__book')) {
            const svg = b.querySelector('.v2c03__ring svg');
            const ring = b.querySelector('.v2c03__ring');
            if (!svg || !ring) { out.push({ id: b.getAttribute('data-v2-shelf'), missing: true }); continue; }
            const r = svg.getBoundingClientRect(), rr = ring.getBoundingClientRect();
            const cs = getComputedStyle(svg);
            // 描画されている図形が ring からはみ出していないか（svg の bbox で判定）
            let bb = null;
            try { bb = svg.getBBox(); } catch (e) {}
            out.push({
              id: b.getAttribute('data-v2-shelf'),
              w: r.width, h: r.height, ringW: rr.width,
              stroke: cs.strokeWidth, fill: cs.fill,
              viewBox: svg.getAttribute('viewBox'),
              bb: bb ? { x: bb.x, y: bb.y, w: bb.width, h: bb.height } : null,
              paths: svg.querySelectorAll('path,circle,line,polyline,ellipse').length,
              color: cs.color
            });
          }
          return out;
        })()`);
        check(`[${tag}] ICON 8棚すべてにアイコンがある`, icons.length === 8 && icons.every(i => !i.missing), JSON.stringify(icons.filter(i => i.missing)));
        const vbs = new Set(icons.map(i => i.viewBox));
        check(`[${tag}] ICON 8棚の viewBox が統一されている`, vbs.size === 1, [...vbs].join(' / '));
        const sizes = icons.map(i => i.w);
        check(`[${tag}] ICON 8棚の描画サイズが同一（光学スケール統一）`,
          Math.max(...sizes) - Math.min(...sizes) < 0.6, `min=${Math.min(...sizes).toFixed(1)} max=${Math.max(...sizes).toFixed(1)}`);
        check(`[${tag}] ICON 8棚とも fill:none の線画`, icons.every(i => i.fill === 'none'), icons.map(i => i.fill).join(','));
        const bbOver = icons.filter(i => i.bb && (i.bb.x < -0.35 || i.bb.y < -0.35 || i.bb.x + i.bb.w > 24.35 || i.bb.y + i.bb.h > 24.35));
        check(`[${tag}] ICON 図形が viewBox からはみ出さない`, bbOver.length === 0,
          bbOver.map(i => `${i.id}:${i.bb.x.toFixed(1)},${i.bb.y.toFixed(1)},${i.bb.w.toFixed(1)},${i.bb.h.toFixed(1)}`).join(' | '));
        // ring 内に収まっているか（bbox を ring 座標へ換算）
        const bbFit = icons.filter(i => {
          if (!i.bb) return false;
          const scale = i.w / 24;
          const dw = i.bb.width * scale, dh = i.bb.height * scale;
          return dw > i.ringW * 0.95 || dh > i.ringW * 0.95;
        });
        check(`[${tag}] ICON 図形が ring からはみ出さない`, bbFit.length === 0, bbFit.map(i => i.id).join(','));
        await shot(page, `03-shelves-${tag}`);

        /* ================= 03 → 04（8棚すべて） ================= */
        for (const sh of L.SHELVES) {
          await L.go(page, '03');
          await L.openShelf(page, sh);
          const s4 = await L.activeScreen(page);
          if (s4 !== '04') { check(`[${tag}] 03 → 04 (${sh})`, false, 'screen=' + s4); continue; }

          const hero = await page.evaluate(`(() => {
            const q = s => document.querySelector('.v2c04 ' + s);
            const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; };
            const sprig = q('.v2c04__sprig');
            const stars = q('.v2c04__stars');
            const sprigSvg = sprig ? sprig.querySelector('svg') : null;
            const cs = el => el ? getComputedStyle(el) : null;
            const sc = cs(sprig), stc = cs(stars);
            const first = document.querySelector('.v2c04 [data-v2-emotion="words"], .v2c04__words, .v2c04__section');
            return {
              hero: R(q('.v2c04__hero')),
              back: R(q('.v2c04__back')),
              menu: R(q('[data-v2-open-menu]')),
              title: R(q('.v2c04__title')),
              lead: R(q('.v2c04__lead')),
              halo: R(q('.v2c04__halo')),
              sprig: R(sprig),
              sprigSvg: R(sprigSvg),
              sprigPos: sc ? sc.position : null,
              sprigDisplay: sc ? sc.display : null,
              starsPos: stc ? stc.position : null,
              haloPos: cs(q('.v2c04__halo')) ? cs(q('.v2c04__halo')).position : null,
              haloPointer: cs(q('.v2c04__halo')) ? cs(q('.v2c04__halo')).pointerEvents : null,
              firstSection: R(first),
              docH: document.documentElement.scrollHeight,
              ih: window.innerHeight,
              tint: getComputedStyle(document.documentElement).getPropertyValue('--v2-shelf-tint').trim(),
              shelfCtx: document.documentElement.getAttribute('data-v2-shelf-context')
            };
          })()`);

          const ih = hero.ih;
          check(`[${tag}][${sh}] FIX-01 sprig は absolute のまま`, hero.sprigPos === 'absolute', 'pos=' + hero.sprigPos);
          check(`[${tag}][${sh}] FIX-01 stars は absolute のまま`, hero.starsPos === 'absolute', 'pos=' + hero.starsPos);
          check(`[${tag}][${sh}] FIX-01 halo は absolute のまま`, hero.haloPos === 'absolute', 'pos=' + hero.haloPos);
          check(`[${tag}][${sh}] FIX-01 sprig が巨大化していない`,
            hero.sprigSvg && hero.sprigSvg.w < 72, `w=${hero.sprigSvg && hero.sprigSvg.w.toFixed(1)}`);
          check(`[${tag}][${sh}] FIX-01 Back が first view にある`,
            hero.back && hero.back.t >= 0 && hero.back.b <= ih, JSON.stringify(hero.back));
          check(`[${tag}][${sh}] FIX-01 menu が first view にある`,
            hero.menu && hero.menu.b <= ih, JSON.stringify(hero.menu));
          check(`[${tag}][${sh}] FIX-01 感情名が first view にある`,
            hero.title && hero.title.b <= ih, `titleBottom=${hero.title && hero.title.b.toFixed(0)} ih=${ih}`);
          check(`[${tag}][${sh}] FIX-01 lead が first view にある`,
            hero.lead && hero.lead.b <= ih, `leadBottom=${hero.lead && hero.lead.b.toFixed(0)} ih=${ih}`);
          check(`[${tag}][${sh}] FIX-01 title が画面上部1/2以内から始まる`,
            hero.title && hero.title.t < ih * 0.5, `titleTop=${hero.title && hero.title.t.toFixed(0)} ih=${ih}`);
          check(`[${tag}][${sh}] FIX-01 「01 ことば」が 1.35 viewport 以内に続く`,
            hero.firstSection && hero.firstSection.t < ih * 1.35, `top=${hero.firstSection && hero.firstSection.t.toFixed(0)}`);
          // 装飾が document height を決めていないこと：hero の実高が「Back〜lead ぶんの
          // 中身」に対して不当に大きくないかで判定する（halo は absolute なので高さは足さない）。
          check(`[${tag}][${sh}] FIX-01 hero が中身に対して縦に伸びていない`,
            hero.hero && hero.lead && (hero.hero.b - hero.lead.b) < ih * 0.28,
            `heroBottom=${hero.hero && hero.hero.b.toFixed(0)} leadBottom=${hero.lead && hero.lead.b.toFixed(0)} ih=${ih}`);
          check(`[${tag}][${sh}] FIX-01 装飾レイヤが操作を奪わない`,
            hero.haloPointer === 'none', 'pointer-events=' + hero.haloPointer);
          check(`[${tag}][${sh}] R2-02 棚別 tint が適用されている`,
            !!hero.tint && hero.shelfCtx === sh, `tint=${hero.tint} ctx=${hero.shelfCtx}`);

          if (sh === 'hazumu' || sh === 'shizumu') await shot(page, `04-detail-${sh}-${tag}`);
        }

        /* ================= FIX-06 : 05 編纂室の日付 ================= */
        await L.go(page, '02');
        await L.go(page, '05');
        const s5 = await L.activeScreen(page);
        check(`[${tag}] 02 → 05 へ移動できる`, s5 === '05', 'screen=' + s5);
        const dateInfo = await page.evaluate(`(() => {
          const el = document.querySelector('.v2c05 [data-v2-today]');
          if (!el) return { present: false };
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const sub = document.querySelector('.v2c05__sub');
          const ta = document.querySelector('.v2c05 .v2c05__textarea');
          return {
            present: true,
            tag: el.tagName,
            text: el.textContent.trim(),
            datetime: el.getAttribute('datetime'),
            px: parseFloat(cs.fontSize),
            subPx: sub ? parseFloat(getComputedStyle(sub).fontSize) : null,
            visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0,
            top: r.top, bottom: r.bottom,
            subBottom: sub ? sub.getBoundingClientRect().bottom : null,
            taTop: ta ? ta.getBoundingClientRect().top : null,
            taH: ta ? ta.getBoundingClientRect().height : null,
            ih: window.innerHeight
          };
        })()`);
        check(`[${tag}] FIX-06 05 に今日の日付がある`, dateInfo.present && dateInfo.visible, JSON.stringify(dateInfo).slice(0, 160));
        if (dateInfo.present) {
          check(`[${tag}] FIX-06 <time> 要素で datetime を持つ`,
            dateInfo.tag === 'TIME' && /^\d{4}-\d{2}-\d{2}$/.test(dateInfo.datetime || ''), `tag=${dateInfo.tag} dt=${dateInfo.datetime}`);
          const jpOk = /^2026年8月13日/.test(dateInfo.text);
          const enOk = /August/.test(dateInfo.text) && /2026/.test(dateInfo.text) && !/[぀-ゟ゠-ヿ一-鿿]/.test(dateInfo.text);
          check(`[${tag}] FIX-06 ${lang.toUpperCase()} の日付表記が正しい`, lang === 'ja' ? jpOk : enOk, 'text=' + dateInfo.text);
          check(`[${tag}] FIX-06 小さな二次テキスト（subcopy 以下）`,
            dateInfo.subPx != null && dateInfo.px <= dateInfo.subPx + 0.5, `date=${dateInfo.px} sub=${dateInfo.subPx}`);
          check(`[${tag}] FIX-06 subcopy の直下にある`,
            dateInfo.subBottom != null && dateInfo.top >= dateInfo.subBottom - 2, `dateTop=${dateInfo.top.toFixed(0)} subBottom=${dateInfo.subBottom.toFixed(0)}`);
          check(`[${tag}] FIX-06 入力欄を圧迫しない（textarea 高さ確保）`,
            dateInfo.taH != null && dateInfo.taH >= 90, `taH=${dateInfo.taH && dateInfo.taH.toFixed(0)}`);
          note(`[${tag}] date="${dateInfo.text}" (${dateInfo.px}px)`);
        }
        await shot(page, `05-editorial-${tag}`);

        if (page._errors.length) allErrors.push({ tag, errors: page._errors.slice(0, 3) });
        await ctx.close();
      }
    }
  }

  check('全 viewport で JS ページエラーが出ない', allErrors.length === 0, JSON.stringify(allErrors).slice(0, 400));

  await browser.close();
  srv.close();

  const fail = results.filter(r => !r.ok);
  console.log('\n================ SUMMARY ================');
  console.log(`total=${results.length}  pass=${results.length - fail.length}  fail=${fail.length}`);
  if (fail.length) {
    console.log('\n--- FAILED ---');
    const seen = new Map();
    for (const f of fail) {
      const key = f.name.replace(/^\[[^\]]+\]/, '').replace(/^\[[^\]]+\]/, '');
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(f);
    }
    for (const [key, arr] of seen) {
      console.log(`\n[${arr.length}x] ${key}`);
      arr.slice(0, 4).forEach(f => console.log('   ' + f.name + '  → ' + f.detail));
    }
  }
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
