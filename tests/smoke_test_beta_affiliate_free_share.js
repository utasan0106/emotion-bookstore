/* Public Beta: affiliate 無効化 と X共有の利用者情報ゼロ を実証する smoke
 *  - Amazon/楽天のアフィリエイトID・アフィリエイト経由URLが href に一切現れない
 *  - 送客先は通常の検索URLとして維持される
 *  - アフィリエイトが無効なので rel="sponsored" と PR表記も出ない
 *  - X の投稿画面URLに本文・題名・棚名など利用者由来の情報が入らない
 *
 * 実行: node tests/smoke_test_beta_affiliate_free_share.js
 * 依存: playwright-core（CHROMIUM_PATH で Chromium の場所を上書き可） */
const { chromium } = require('playwright-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SEC = { title: 'ヒミツダイメイZZZ', story: 'ヒミツホンブンZZZ' };
let fails = 0;
const chk = (id, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + id + (d ? '  ' + d : '')); if (!ok) fails++; };
(async()=>{
  const b=await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:900,height:1100}});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
  await p.goto(`file://${ROOT}/index.html`,{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{ enterBookExperience(); goToPage('shelves'); });
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{ try{ goToShelf('kodoku'); }catch(e){} });
  await p.waitForTimeout(1800);
  const r=await p.evaluate(()=>{
    const as=Array.from(document.querySelectorAll('a[href]'));
    const hrefs=as.map(a=>a.getAttribute('href'));
    return {
      total: as.length,
      amazonTag: hrefs.filter(h=>/amazon\..*[?&]tag=/.test(h)),
      rakutenAfl: hrefs.filter(h=>/hb\.afl\.rakuten\.co\.jp/.test(h)),
      amazonPlain: hrefs.filter(h=>/amazon\.co\.jp\/s\?k=/.test(h)).slice(0,3),
      rakutenPlain: hrefs.filter(h=>/search\.rakuten\.co\.jp/.test(h)).slice(0,3),
      sponsored: as.filter(a=>(a.getAttribute('rel')||'').includes('sponsored')).length,
      prNotes: document.querySelectorAll('.detour-pr').length,
      prText: document.body.innerText.includes('PR・広告リンク')
    };
  });
  const d = await p.evaluate(()=>({
    az: amazonSearchUrl('テスト'), rk: rakutenSearchUrl('テスト'),
    enabled: affiliateEnabled(), rel: relForCommerceLink(), pr: prNoteHtml()
  }));
  chk('AF-1 href に Amazon アフィリエイトタグが無い', r.amazonTag.length === 0, r.amazonTag.join(','));
  chk('AF-2 href に楽天アフィリエイト経由URLが無い', r.rakutenAfl.length === 0, r.rakutenAfl.join(','));
  chk('AF-3 Amazon の送客先は通常検索URLとして残る', r.amazonPlain.length > 0);
  chk('AF-4 楽天の送客先は通常検索URLとして残る', r.rakutenPlain.length > 0);
  chk('AF-5 rel="sponsored" が付いたリンク 0', r.sponsored === 0, 'n=' + r.sponsored);
  chk('AF-6 PR表記 0', r.prNotes === 0 && r.prText === false);
  chk('AF-7 affiliateEnabled() は false', d.enabled === false);
  chk('AF-8 直接生成URLにもタグが付かない',
    d.az.indexOf('tag=') === -1 && d.rk.indexOf('hb.afl.rakuten') === -1, d.az + ' | ' + d.rk);

  const sh = await p.evaluate((S)=>{
    const withShelf={id:'s1',title:S.title,story:S.story,category:'kodoku',date:new Date().toISOString()};
    const unfiled={id:'s2',title:S.title,story:S.story,category:UNFILED_CATEGORY_ID,date:new Date().toISOString()};
    const a=buildShareText(withShelf), u=buildShareText(unfiled);
    return { a, u, fixed:t('shareText'),
      urlA:twitterIntentUrl(a, location.origin+location.pathname),
      urlU:twitterIntentUrl(u, location.origin+location.pathname) };
  }, SEC);
  const dec = x => decodeURIComponent(x);
  const leak = k => { const t2 = dec(sh[k]);
    return t2.includes(SEC.title) || t2.includes(SEC.story) || t2.includes('孤独'); };
  chk('SH-1 棚ありでも固定の紹介文だけ', sh.a === sh.fixed, sh.a);
  chk('SH-2 未分類でも固定の紹介文だけ', sh.u === sh.fixed, sh.u);
  chk('SH-3 投稿URLに題名・本文・棚名が入らない（棚あり）', !leak('urlA'), dec(sh.urlA).slice(0,120));
  chk('SH-4 投稿URLに題名・本文・棚名が入らない（未分類）', !leak('urlU'));
  chk('SH-5 JSエラー 0', errs.length === 0, errs.join('|'));
  await b.close();
  console.log(fails === 0 ? '\n==== ALL PASS / 13 checks ====' : '\n==== ' + fails + ' FAIL ====');
})();
