// Daypart1_RC2 受入テスト。
// 「店内の画面を切り替えるたびに白い光の帯が画面全体を横切る」演出（pageTurnOverlay／
// pageTurnSwipeキーフレーム／260msの表示待ち／buzz(10)）を、goToPage()から完全に廃止した
// ことを検証する。ご指示の7項目にそのまま対応する形で構成している。
//
//  1) goToPage()実行時にpageTurnOverlayへactiveが付かない（そもそも要素自体が存在しない）
//  2) 260msの待機なしで対象ページが表示される
//  3) buzz(10)が呼ばれない
//  4) 白い全画面オーバーレイが表示されない
//  5) 番台・棚・編纂机・本棚の切替先が従来どおり正しい
//  6) GA4のview_shelfの発火仕様が変わらない
//  7) （このファイル自体は、既存のsmoke_test_weather_prototype1.js 74件と合わせて
//      全回帰テストの一部として実行される。合算は実行ランナー側で確認する）
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(l,c){ if(c){pass++;console.log('PASS:',l);}else{fail++;console.log('FAIL:',l);} }

async function createEnv(opts){
  opts=opts||{};
  let html=fs.readFileSync(path.join(SRC,'index.html'),'utf-8')
    .replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/,'').replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/,'');
  const dom=new JSDOM(html,{url:'https://example.com/',runScripts:'dangerously',resources:'usable',pretendToBeVisual:true});
  const {window}=dom,{document}=window;
  window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.scrollTo=function(){};
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';
  // navigator.vibrate をスパイ化する（buzz(10)が呼ばれていないことを確認するため）。
  const vibrateCalls = [];
  Object.defineProperty(window.navigator, 'vibrate', { value: (ms)=>{ vibrateCalls.push(ms); return true; }, configurable:true });
  // gtag もスパイ化する（GA4 view_shelf の発火仕様に変化がないことを確認するため）。
  const gtagCalls = [];
  window.gtag = function(){ gtagCalls.push(Array.from(arguments)); };
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  const s1=document.createElement('script');s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');document.body.appendChild(s1);
  const s2=document.createElement('script');s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');document.body.appendChild(s2);
  await new Promise(r=>setTimeout(r,300));await new Promise(r=>setTimeout(r,300));
  return {window,document,vibrateCalls,gtagCalls};
}

function isActive(document,id){
  const el = document.getElementById(id);
  return !!el && el.classList.contains('is-active');
}
function tabActive(document,id){
  const btn = document.querySelector('.page-tab[data-page="'+id+'"]');
  return !!btn && btn.classList.contains('active');
}

async function main(){

  // ===== 1) pageTurnOverlayという要素自体がもう存在しない・activeクラスの付与先がない =====
  {
    const { window, document } = await createEnv({});
    ok('(1) #pageTurnOverlay is removed from the DOM entirely', document.getElementById('pageTurnOverlay') === null);
    ok('(1) no element anywhere carries the page-turn-overlay class', document.querySelectorAll('.page-turn-overlay').length === 0);
    window.goToPage('shelves');
    ok('(1) after goToPage(), still no page-turn-overlay element exists (nothing to add "active" to)',
      document.querySelectorAll('.page-turn-overlay').length === 0);
  }

  // ===== 2) 260msの待機なしで対象ページが表示される =====
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    // rAFを2回分だけ進める猶予（十分に260msより短い）を与えたうえで確認する。
    await new Promise(r=>setTimeout(r,50));
    ok('(2) target page is already active well before 260ms has elapsed', isActive(document,'desk'));
    ok('(2) previous/other pages are not active', !isActive(document,'counter') && !isActive(document,'shelves') && !isActive(document,'bookshelf'));
  }

  // ===== 3) buzz(10)が呼ばれない =====
  {
    const { window, document, vibrateCalls } = await createEnv({});
    // prefs.motionがONの状態でも、buzz(10)由来のvibrate呼び出しが発生しないことを確認する
    // （もしprefs.motion管理オブジェクトがあれば明示的にtrueへ）。
    try{ if(window.prefs) window.prefs.motion = true; }catch(e){}
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(3) navigator.vibrate is never called with 10 (the removed page-turn buzz)', !vibrateCalls.includes(10));
    window.goToPage('counter');
    await new Promise(r=>setTimeout(r,50));
    ok('(3) navigator.vibrate is still never called with 10 after a second transition', !vibrateCalls.includes(10));
  }

  // ===== 4) 白い全画面オーバーレイが表示されない =====
  {
    const { window, document } = await createEnv({});
    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,50));
    ok('(4) no .page-turn-overlay.active element exists in the document', document.querySelectorAll('.page-turn-overlay.active').length === 0);
    ok('(4) no element with an "active" page-turn-overlay class exists at all', document.querySelectorAll('.page-turn-overlay').length === 0);
    const css = fs.readFileSync(path.join(SRC,'style.css'),'utf-8');
    ok('(4) style.css no longer defines a functional .page-turn-overlay rule (only explanatory comment text may remain)',
      (()=>{
        // コメントを取り除いたうえで、機能的な .page-turn-overlay { ... } ルールが残っていないことを確認する。
        const noComments = css.replace(/\/\*[\s\S]*?\*\//g,'');
        return !/\.page-turn-overlay\s*\{/.test(noComments) && !/@keyframes\s+pageTurnSwipe/.test(noComments);
      })());
  }

  // ===== 5) 番台・棚・編纂机・本棚の切替先が従来どおり正しい =====
  {
    const { window, document } = await createEnv({});
    for(const id of ['counter','shelves','desk','bookshelf']){
      window.goToPage(id);
      await new Promise(r=>setTimeout(r,50));
      ok('(5) goToPage("'+id+'") activates the #'+id+' experience page', isActive(document,id));
      ok('(5) goToPage("'+id+'") sets the matching page-tab to active', tabActive(document,id));
      const others = ['counter','shelves','desk','bookshelf'].filter(x=>x!==id);
      ok('(5) goToPage("'+id+'") leaves the other 3 pages inactive', others.every(o=>!isActive(document,o)));
    }
  }

  // ===== 6) GA4のview_shelfの発火仕様が変わらない =====
  {
    const { window, document, gtagCalls } = await createEnv({});
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const viewShelfCalls = gtagCalls.filter(c=>c[0]==='event' && c[1]==='view_shelf');
    ok('(6) view_shelf fires exactly once on first entry to shelves', viewShelfCalls.length === 1);
    ok('(6) view_shelf is sent with no extra parameters (event name only)', viewShelfCalls[0].length === 2);
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const viewShelfCallsAfterRepeat = gtagCalls.filter(c=>c[0]==='event' && c[1]==='view_shelf');
    ok('(6) view_shelf does not fire again for a repeated goToPage("shelves") (dedupe unchanged)', viewShelfCallsAfterRepeat.length === 1);
    window.goToPage('desk');
    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,50));
    const viewShelfCallsAfterBookshelf = gtagCalls.filter(c=>c[0]==='event' && c[1]==='view_shelf');
    ok('(6) view_shelf fires again on entry to bookshelf (distinct tracked page)', viewShelfCallsAfterBookshelf.length === 2);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e=>{ console.error('DAYPART1_RC2 PAGETURN TEST CRASHED:', e); process.exit(2); });
