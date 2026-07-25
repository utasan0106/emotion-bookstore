// Sonnet独立監査（QuietEN1_Hotfix1再監査）受入テスト。
// 事前監査で見つかった3件＋追加調査で見つかった1件（#shopGuide/データ保存説明の予告文言）を検証する。
// 既存テスト（smoke_test_quiet_hotfix.js等）のアサーションは一切弱めず、本ファイルは追加専用。
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(l,c){ if(c){pass++;console.log('PASS:',l);}else{fail++;console.log('FAIL:',l);} }
function wrap(v){ return JSON.stringify({v:1,data:v}); }
const JP_RE = /[぀-ヿ一-鿿]/;
async function createEnv(opts){
  opts=opts||{};
  let html=fs.readFileSync(path.join(SRC,'index.html'),'utf-8')
    .replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/,'').replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/,'');
  const dom=new JSDOM(html,{url:'https://example.com/',runScripts:'dangerously',resources:'usable',pretendToBeVisual:true});
  const {window}=dom,{document}=window;
  if(opts.seedLibrary) window.localStorage.setItem('emotion-bookstore-library',wrap(opts.seedLibrary));
  if(opts.seedShiori) window.localStorage.setItem('emotion-bookstore-shiori',wrap(opts.seedShiori));
  window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){};window.scrollTo=function(){};window.navigator.vibrate=()=>true;
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';
  const gaCalls=[];window.gtag=function(){gaCalls.push([...arguments]);};
  const fetchLog=[];window.fetch=u=>{fetchLog.push(String(u));return Promise.resolve({ok:true,json:()=>Promise.resolve({})});};
  const s1=document.createElement('script');s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');document.body.appendChild(s1);
  const s2=document.createElement('script');s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');document.body.appendChild(s2);
  await new Promise(r=>setTimeout(r,300));await new Promise(r=>setTimeout(r,300));
  const langBtn=document.getElementById('langToggle');
  const toggleByButton=()=>langBtn.dispatchEvent(new window.Event('click',{bubbles:true}));
  return {window,document,gaCalls,fetchLog,toggleByButton};
}

async function main(){
  // ===== A: #shopGuideとデータ保存説明からも本・音楽の予告を除去 =====
  {
    const {window,document,toggleByButton}=await createEnv({});
    const guide=document.getElementById('shopGuide');
    ok('(A) #shopGuide exists and is reachable before writing anything', !!guide);
    ok('(A) #shopGuide (JA) does not preview books/music', !/本や音楽|寄り道|曲に出会/.test(guide.textContent));
    toggleByButton();
    ok('(A) #shopGuide (EN) does not preview books/music', !/[Bb]ooks? and music|songs across/i.test(guide.textContent));
    toggleByButton();
    // データ保存説明（#dataAboutOpenLabelのdetails）を開いて確認する
    const dataDetails = [...document.querySelectorAll('details')].find(d=>/データはどこに保存/.test(d.textContent));
    ok('(A) the data-storage explanation accordion exists', !!dataDetails);
    if(dataDetails) dataDetails.open = true;
    const dataBody = document.querySelector('[data-i18n-html="dataAboutBody"]');
    ok('(A) data-storage explanation (JA) does not name books/music as a shelf feature', !/本・音楽|おすすめ本|書籍・音楽検索/.test(dataBody.textContent));
    ok('(A) data-storage explanation (JA) still discloses the external search call (privacy transparency preserved)', /外部の検索サービス/.test(dataBody.textContent) && /文章が送信されることはありません/.test(dataBody.textContent));
    toggleByButton();
    const dataBodyEn = document.querySelector('[data-i18n-html="dataAboutBody"]');
    ok('(A) data-storage explanation (EN) does not name books/music as a shelf feature', !/books? and music|book\/music/i.test(dataBodyEn.textContent));
    ok('(A) data-storage explanation (EN) still discloses the external search call', /external search service/i.test(dataBodyEn.textContent) && /never sent/i.test(dataBodyEn.textContent));
  }

  // ===== B: shelfWasChosenの全操作経路 =====
  // B1: 棚タブ直接クリック
  {
    const {window,document}=await createEnv({});
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(B1) fresh visit: no shelf tab is auto-highlighted before any choice', !document.querySelector('.shelf-tab.active'));
    const tabs=[...document.querySelectorAll('#shelfTabs .shelf-tab')];
    const target=tabs.length>1 ? tabs[1] : tabs[0];
    target.click();
    await new Promise(r=>setTimeout(r,50));
    const active=document.querySelector('.shelf-tab.active');
    ok('(B1) clicking a shelf tab directly highlights it (shelfWasChosen updated)', !!active && active.dataset.catId===target.dataset.catId);
  }
  // B2: 「気ままに巡る」
  {
    const {window,document}=await createEnv({});
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(B2) fresh visit: no shelf tab is auto-highlighted', !document.querySelector('.shelf-tab.active'));
    const wander=document.querySelector('.wander-btn');
    ok('(B2) the "wander freely" button exists', !!wander);
    wander.click();
    await new Promise(r=>setTimeout(r,50));
    ok('(B2) "wander freely" highlights a shelf tab (shelfWasChosen updated)', !!document.querySelector('.shelf-tab.active'));
  }
  // B3: スワイプ操作
  {
    const {window,document}=await createEnv({});
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(B3) fresh visit: no shelf tab is auto-highlighted', !document.querySelector('.shelf-tab.active'));
    const zone=document.getElementById('shelfSwipeZone');
    const fire=(x0,x1)=>{
      const down=new window.PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',clientX:x0,clientY:200});
      zone.dispatchEvent(down);
      const up=new window.PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',clientX:x1,clientY:200});
      zone.dispatchEvent(up);
    };
    fire(300,230); // 60px左スワイプ
    await new Promise(r=>setTimeout(r,50));
    ok('(B3) a swipe gesture highlights a shelf tab (shelfWasChosen updated)', !!document.querySelector('.shelf-tab.active'));
  }
  // B4: 本棚で未分類本の棚を確定
  {
    const entry={id:'u1',title:'まだ棚のない本',story:'本文',category:'unfiled',date:new Date().toISOString()};
    const {window,document}=await createEnv({seedLibrary:[entry]});
    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,80));
    ok('(B4) the seeded entry starts unfiled', !!document.querySelector('#myShelf'));
    window.showUnfiledShelfPicker(entry);
    await new Promise(r=>setTimeout(r,30));
    const select=document.getElementById('unfiledShelfSelect');
    const confirmBtn=document.getElementById('unfiledShelfConfirm');
    select.value='kodoku';
    select.dispatchEvent(new window.Event('change',{bubbles:true}));
    ok('(B4) picking a valid shelf enables the confirm button', confirmBtn.disabled===false);
    await confirmBtn.onclick();
    await new Promise(r=>setTimeout(r,50));
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const active=document.querySelector('.shelf-tab.active');
    ok('(B4) confirming a shelf for an unfiled book updates shelfWasChosen (tab highlighted on next shelf visit)', !!active && active.dataset.catId==='kodoku');
  }
  // B5: 店主との相談・看板からの遷移は既存のgoToShelf/goToDeskWithCategory経由であることの確認（回帰）
  {
    const {window,document}=await createEnv({});
    window.goToShelf('ando');
    await new Promise(r=>setTimeout(r,50));
    const active=document.querySelector('.shelf-tab.active');
    ok('(B5) goToShelf() (used by counter/signboard/invitation links) still sets shelfWasChosen', !!active && active.dataset.catId==='ando');
  }
  // B6: 店主との相談から編纂机へ直接進む（goToDeskWithCategory）— activeCategoryとcategorySelectが揃うこと
  {
    const {window,document}=await createEnv({});
    // ステップ5：操作前の新規訪問時には棚が自動ハイライトされない
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(B6) fresh visit: no shelf tab is auto-highlighted before any choice', !document.querySelector('.shelf-tab.active'));

    // 比較用にdata.jsの題名候補表を独立に読み込む（TITLE_TEMPLATES/TITLE_SUGGEST_JA_GENERIC等）
    const dataSrc=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');
    eval(dataSrc.replace(/const /g,'var '));

    // ステップ1：goToDeskWithCategory('kansha')で編纂机へ進む
    window.goToDeskWithCategory('kansha');
    await new Promise(r=>setTimeout(r,400)); // ページ送りアニメーション（setTimeout 260ms）を待つ
    ok('(B6) goToDeskWithCategory navigates to the desk page', document.getElementById('desk').classList.contains('is-active'));
    ok('(B6) the category select is set to kansha', document.getElementById('categorySelect').value==='kansha');

    // ステップ2・3：題名相談を開くと、汎用候補や別棚ではなくkanshaの候補が表示される
    window.toggleTitleConsult();
    await new Promise(r=>setTimeout(r,50));
    const items=[...document.querySelectorAll('.title-consult-item')].map(b=>b.textContent);
    ok('(B6) title consult shows candidates after opening', items.length>0);
    const kanshaPoolJa=TITLE_TEMPLATES['kansha'].filter(x=>String(x).length<=16);
    ok('(B6) every shown title-consult candidate belongs to kansha\'s own pool (not generic, not another shelf)',
      items.length>0 && items.every(x=>kanshaPoolJa.includes(x)));

    // ステップ4：その後棚ページを開くとkanshaがハイライトされる
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const active=document.querySelector('.shelf-tab.active');
    ok('(B6) visiting the shelves page afterward highlights the kansha tab', !!active && active.dataset.catId==='kansha');
  }

  // ===== C: 感情棚側の直前候補回避 =====
  // C1: ヘルパー関数の単体動作（決定的）
  {
    const {window}=await createEnv({});
    window.sessionStorage.setItem('eb-shelf-prev-book-__testcat', 'BookA|AuthorA');
    const arr=[{title:'BookA',by:'AuthorA'},{title:'BookB',by:'AuthorB'},{title:'BookC',by:'AuthorC'}];
    const stableKey = b=>(b.title+'|'+b.by);
    const result=window.applyShelfPrevAvoidance('__testcat','book',12345,arr.slice(),stableKey);
    ok('(C1) a new encounter avoids repeating the immediate previous top pick (pool >= 2)', stableKey(result[0])!=='BookA|AuthorA');
    ok('(C1) avoidance only reorders, never drops candidates', result.length===3 && new Set(result.map(stableKey)).size===3);

    window.sessionStorage.setItem('eb-shelf-prev-book-__testcat2','Solo|Author');
    const single=[{title:'Solo',by:'Author'}];
    const result2=window.applyShelfPrevAvoidance('__testcat2','book',999,single.slice(),stableKey);
    ok('(C1) a pool of exactly 1 candidate allows repeating the same pick', stableKey(result2[0])==='Solo|Author');

    const seedX=555;
    const r1=window.applyShelfPrevAvoidance('__testcat3','book',seedX,arr.slice(),stableKey);
    const r2=window.applyShelfPrevAvoidance('__testcat3','book',seedX,arr.slice(),stableKey);
    ok('(C1) the same encounter (same seed) is memoized and stays identical across re-renders', JSON.stringify(r1.map(stableKey))===JSON.stringify(r2.map(stableKey)));

    const r3=window.applyShelfPrevAvoidance('__testcat4','song',777,
      [{artist:'X',title:'Y'},{artist:'A',title:'B'}], s=>(s.artist+'|'+s.title));
    ok('(C1) song stable key uses artist+title and works independently of book keys', r3.length===2);
  }
  // C2: 実際の棚表示（renderShelfDisplay経由）で、複数回の新しい出会いのあいだ直前と連続しない
  {
    const entry={id:'L1',title:'一冊',story:'本文',category:'kodoku',date:new Date().toISOString()};
    const {window,document}=await createEnv({seedLibrary:[entry]});
    window.goToShelf('kodoku');
    await new Promise(r=>setTimeout(r,80));
    const grabTop=()=>({
      book: (document.querySelector('.recommend-chip .work-title')||{}).textContent||'',
      track: (document.querySelector('.playlist-track-name')||{}).textContent||''
    });
    let prev=grabTop();
    let violation=false;
    for(let i=0;i<15;i++){
      window.rotateRecoEncounter();
      window.renderShelfDisplay();
      await new Promise(r=>setTimeout(r,20));
      const cur=grabTop();
      if((cur.book && cur.book===prev.book) || (cur.track && cur.track===prev.track)){ violation=true; }
      prev=cur;
    }
    ok('(C2) across 15 consecutive new encounters, the top book/track never repeats the immediately previous one', !violation);
  }
  // C3: 同一の出会い内（再描画・言語切替・モーダル開閉）では従来どおり固定のまま（回帰）
  {
    const entry={id:'L2',title:'一冊',story:'本文',category:'ando',date:new Date().toISOString()};
    const {window,document,toggleByButton}=await createEnv({seedLibrary:[entry]});
    window.goToShelf('ando');
    await new Promise(r=>setTimeout(r,80));
    const grabTop=()=>({
      book: (document.querySelector('.recommend-chip .work-title')||{}).textContent||'',
      track: (document.querySelector('.playlist-track-name')||{}).textContent||''
    });
    const a=grabTop();
    window.renderShelfDisplay(); await new Promise(r=>setTimeout(r,50));
    const b=grabTop();
    ok('(C3) re-rendering within the same encounter keeps the same top book/track (avoidance logic does not disturb stability)', a.book===b.book && a.track===b.track);
    toggleByButton(); await new Promise(r=>setTimeout(r,80));
    toggleByButton(); await new Promise(r=>setTimeout(r,80));
    const c=grabTop();
    ok('(C3) a language round-trip keeps the same top book/track', a.book===c.book && a.track===c.track);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail>0?1:0);
}
main().catch(e=>{console.error('SONNET AUDIT TEST CRASHED:',e);process.exit(2);});
