// UIFix1 受入テスト。
// 店内メニューを開いたまま「この書店をシェアする」／「ホーム画面にピン留め」を押すと、
// 表示された画面（#shareMenu／#pwaPopup）が店内メニュー（z-index:210）の背後に
// 隠れてしまう不具合の修正を検証する。z-indexを上げるのではなく、店内メニュー自体を
// 閉じてから対象画面を表示する方式で直したことを確認する。ご指定の14項目に対応する。
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(l,c){ if(c){pass++;console.log('PASS:',l);}else{fail++;console.log('FAIL:',l);} }
function wrap(v){ return JSON.stringify({v:1,data:v}); }

async function createEnv(opts){
  opts=opts||{};
  let html=fs.readFileSync(path.join(SRC,'index.html'),'utf-8')
    .replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/,'').replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/,'');
  const dom=new JSDOM(html,{url:'https://example.com/',runScripts:'dangerously',resources:'usable',pretendToBeVisual:true});
  const {window}=dom,{document}=window;
  if(opts.seedLibrary) window.localStorage.setItem('emotion-bookstore-library',wrap(opts.seedLibrary));
  window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.scrollTo=function(){};
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';
  const gtagCalls = [];
  window.gtag = function(){ gtagCalls.push(Array.from(arguments)); };
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  if(opts.clipboardFails){
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: ()=>Promise.reject(new Error('no clipboard')) }, configurable:true
    });
  }else{
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: (s)=>{ window.__lastClipboardWrite = s; return Promise.resolve(); } }, configurable:true
    });
  }
  const s1=document.createElement('script');s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');document.body.appendChild(s1);
  const s2=document.createElement('script');s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');document.body.appendChild(s2);
  await new Promise(r=>setTimeout(r,300));await new Promise(r=>setTimeout(r,300));
  return {window,document,gtagCalls};
}

function isMenuHidden(document){ return document.getElementById('experienceMenu').classList.contains('hidden'); }
function isMenuInert(document){ return document.getElementById('experienceMenu').hasAttribute('inert'); }
function isMenuOpenClassOnBody(document){ return document.body.classList.contains('experience-menu-open'); }

async function main(){

  // ===== 1〜6) 店内メニューを開いた状態で「この書店をシェアする」を押す =====
  {
    const { window, document } = await createEnv({});
    window.openExperienceMenu();
    ok('(1) precondition: the experience menu is open before clicking share', !isMenuHidden(document));
    document.getElementById('shareBtn').click();
    await new Promise(r=>setTimeout(r,50));

    ok('(2) #experienceMenu is closed (hidden) after pressing "share this bookstore"', isMenuHidden(document));
    ok('(3) #experienceMenu has inert restored', isMenuInert(document));
    ok('(4) body.experience-menu-open is cleared', !isMenuOpenClassOnBody(document));
    ok('(5) #shareMenu is now visible (not hidden)', !document.getElementById('shareMenu').classList.contains('hidden'));

    document.getElementById('shareMenuClose').click();
    ok('(6) the share screen\'s "close" button closes #shareMenu normally', document.getElementById('shareMenu').classList.contains('hidden'));
    ok('(6) the experience menu does not reopen by itself after closing the share screen', isMenuHidden(document));
  }

  // ===== 7〜10) 店内メニューを開いた状態で「ホーム画面にピン留め」を押す =====
  {
    const { window, document } = await createEnv({});
    window.openExperienceMenu();
    ok('(7) precondition: the experience menu is open before clicking pin-to-home', !isMenuHidden(document));
    document.getElementById('pwaPinBtn').click();
    await new Promise(r=>setTimeout(r,50));

    ok('(8) #experienceMenu is closed (hidden) after pressing "pin to home screen"', isMenuHidden(document));
    ok('(8) #experienceMenu has inert restored', isMenuInert(document));
    ok('(8) body.experience-menu-open is cleared', !isMenuOpenClassOnBody(document));
    ok('(9) #pwaPopup is now visible (not hidden)', !document.getElementById('pwaPopup').classList.contains('hidden'));

    document.getElementById('pwaClose').click();
    ok('(10) the pin-to-home guide\'s "close" button closes #pwaPopup normally', document.getElementById('pwaPopup').classList.contains('hidden'));
    ok('(10) the experience menu does not reopen by itself after closing the pin guide', isMenuHidden(document));
  }

  // ===== 11) URLコピー失敗時に開く#shareMenuも、店内メニューの後ろへ隠れない =====
  {
    const { window, document } = await createEnv({ clipboardFails: true });
    window.openExperienceMenu();
    ok('(11) precondition: the experience menu is open', !isMenuHidden(document));
    document.getElementById('copyUrlBtn').click();
    await new Promise(r=>setTimeout(r,50));

    ok('(11) the copy-failure fallback also closes the experience menu', isMenuHidden(document));
    ok('(11) the copy-failure fallback also restores inert on the experience menu', isMenuInert(document));
    ok('(11) #shareMenu opens correctly via the copy-failure fallback path', !document.getElementById('shareMenu').classList.contains('hidden'));
  }

  // ===== 12) X、LINE、端末共有、URLコピーの既存処理が維持される =====
  {
    const { window, document } = await createEnv({ clipboardFails: false });
    const testUrl = 'https://example.com/';
    window.openShareMenu(testUrl);
    const shareX = document.getElementById('shareX');
    ok('(12) the X share link still points to twitter intent with the current URL', shareX.href.includes('twitter.com/intent/tweet') && shareX.href.includes(encodeURIComponent(testUrl)));
    const shareLine = document.getElementById('shareLine');
    ok('(12) the LINE share link still points to the LINE share endpoint with the current URL', shareLine.href.includes('social-plugins.line.me/lineit/share') && shareLine.href.includes(encodeURIComponent(testUrl)));
    const urlInput = document.getElementById('shareUrlInput');
    ok('(12) the share URL input still contains the current URL', urlInput.value === testUrl);
    const copyBtn = document.getElementById('shareCopy');
    copyBtn.onclick();
    await new Promise(r=>setTimeout(r,50));
    ok('(12) the "copy link" button still writes the URL via navigator.clipboard.writeText', window.__lastClipboardWrite === testUrl);
    ok('(12) the copy button label still switches to the "done" text on success', copyBtn.textContent === 'コピーしました ✓');
  }

  // ===== 13) RC3の795件がすべて維持される（本ファイル以外の既存テストで担保。ここでは
  //           このファイル自身が既存機能を壊していないことを、周辺機能で軽く確認する） =====
  {
    const { window, document } = await createEnv({});
    // 番台の静物ビジュアル・店主のことばカード（RC3 CounterAtmosphere）が無傷であることを確認
    ok('(13) RC3\'s counter still-life groups remain intact (unrelated to this fix)',
      document.querySelectorAll('.counter-desk-still, .counter-lamp-still, .counter-ledger-still').length === 3);
    ok('(13) RC3\'s counter note/greeting card remains intact', !!document.getElementById('counterGreeting'));
    // Daypart1_RC2のページ切替（即時切替）が無傷であることを確認
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(13) page switching (goToPage) still activates the target page instantly', document.getElementById('shelves').classList.contains('is-active'));
    ok('(13) no page-turn-overlay element was reintroduced', document.querySelectorAll('.page-turn-overlay').length === 0);
  }

  // ===== 14) 保存キー・GA4イベントに変更がない =====
  {
    const seed = [{ id:'x1', title:'t', story:'s', category:'kanashii', date:'2026-07-20T00:00:00.000Z' }];
    const { window, document, gtagCalls } = await createEnv({ seedLibrary: seed });
    const raw = window.localStorage.getItem('emotion-bookstore-library');
    ok('(14) the existing save key "emotion-bookstore-library" still round-trips seeded data', !!raw && JSON.parse(raw).data.length === 1);

    window.openExperienceMenu();
    document.getElementById('shareBtn').click();
    await new Promise(r=>setTimeout(r,50));
    const shareRelatedEvents = gtagCalls.filter(c=>c[0]==='event' && /share|pwa|pin/i.test(String(c[1])));
    ok('(14) no new GA4 event was introduced by closing the experience menu before opening the share screen', shareRelatedEvents.length === 0);

    window.openExperienceMenu();
    document.getElementById('pwaPinBtn').click();
    await new Promise(r=>setTimeout(r,50));
    const pinRelatedEvents = gtagCalls.filter(c=>c[0]==='event' && /share|pwa|pin/i.test(String(c[1])));
    ok('(14) no new GA4 event was introduced by closing the experience menu before opening the pin popup', pinRelatedEvents.length === 0);

    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const viewShelfCalls = gtagCalls.filter(c=>c[0]==='event' && c[1]==='view_shelf');
    ok('(14) view_shelf still fires exactly once (unaffected by this fix)', viewShelfCalls.length === 1);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e=>{ console.error('UIFIX1 SHARE/PIN OVERLAP TEST CRASHED:', e); process.exit(2); });
