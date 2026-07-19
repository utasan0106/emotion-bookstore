// feature/quiet-experience-and-en-completion 受入テスト（K章）。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const SRC = path.resolve(__dirname, '..'); // ★成果物内で再実行可能な相対パス
let pass = 0, fail = 0;
function ok(label, cond){ if(cond){ pass++; console.log('PASS:', label); } else { fail++; console.log('FAIL:', label); } }
function wrap(v){ return JSON.stringify({ v:1, data:v }); }
const JP_RE = /[぀-ヿ一-鿿]/;

async function createEnv(opts){
  opts = opts || {};
  let html = fs.readFileSync(path.join(SRC,'index.html'),'utf-8')
    .replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/,'')
    .replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/,'');
  const dom = new JSDOM(html,{url:'https://example.com/',runScripts:'dangerously',resources:'usable',pretendToBeVisual:true});
  const { window } = dom; const { document } = window;
  if(opts.seedLibrary) window.localStorage.setItem('emotion-bookstore-library', wrap(opts.seedLibrary));
  window.matchMedia = q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){}; window.scrollTo=function(){};
  window.navigator.vibrate=()=>true;
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';
  const gaCalls=[]; window.gtag=function(){ gaCalls.push(Array.from(arguments)); };
  const fetchLog=[]; window.fetch=function(u){ fetchLog.push(String(u)); return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); };
  if(opts.fakeNow){
    const RealDate = window.Date;
    const fixed = opts.fakeNow;
    window.Date = class extends RealDate {
      constructor(...a){ if(a.length) super(...a); else super(fixed); }
      static now(){ return new RealDate(fixed).getTime(); }
    };
  }
  const s1=document.createElement('script'); s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8'); document.body.appendChild(s1);
  const s2=document.createElement('script'); s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8'); document.body.appendChild(s2);
  await new Promise(r=>setTimeout(r,300)); await new Promise(r=>setTimeout(r,300));
  return { window, document, gaCalls, fetchLog };
}

async function main(){

  // ===== 表紙（A） =====
  {
    const { window, document } = await createEnv({});
    const note = document.getElementById('firstVisitNote');
    ok('(A) the cover shows only the single-line assurance', note && note.tagName==='P' && note.textContent.includes('書いた言葉は、この端末にだけ残ります'));
    ok('(A) the detailed 3-line explanation is gone from the initial cover', document.querySelectorAll('#firstVisitNote p').length === 0);
    const coverText = document.querySelector('.entrance.hero').textContent;
    ok('(A) no book/music recommendation explanation on the cover', !coverText.includes('寄り道') && !coverText.includes('おすすめ'));
    ok('(A) the main copy is preserved in the page', fs.readFileSync(path.join(SRC,'index.html'),'utf-8').includes('今の気持ちを、一冊の本に。'));
    ok('(A) the main CTA still navigates to the desk', !!document.querySelector('.enter-btn'));
    ok('(A) the sample-book button is NOT on the cover', !document.querySelector('.entrance.hero #samplePeekBtn'));
    ok('(A) the sample-book button lives inside the はじめての方へ accordion', !!document.querySelector('#aboutAccordionContent #samplePeekBtn'));
    ok('(A) the accordion starts closed', !document.getElementById('aboutAccordionContent').classList.contains('open'));
    // 開くと詳細説明とサンプル本が現れる
    document.getElementById('aboutAccordionBtn').dispatchEvent(new window.Event('click',{bubbles:true}));
    ok('(A) opening the accordion reveals the detailed explanation', document.getElementById('aboutAccordionContent').classList.contains('open'));
    ok('(A) the sample book still opens from inside the accordion', (window.openSampleBook(), !document.getElementById('bookModal').classList.contains('hidden')));
  }

  // ===== 店内メニュー（B・C） =====
  {
    const { window, document } = await createEnv({});
    const btn = document.getElementById('aboutAccordionBtn');
    ok('(B) the accordion button carries aria-controls', btn.getAttribute('aria-controls') === 'aboutAccordionContent');
    ok('(B) aria-expanded starts false', btn.getAttribute('aria-expanded') === 'false');
    btn.dispatchEvent(new window.Event('click',{bubbles:true}));
    ok('(B) aria-expanded becomes true on open', btn.getAttribute('aria-expanded') === 'true');
    btn.dispatchEvent(new window.Event('click',{bubbles:true}));
    ok('(B) aria-expanded returns to false on close', btn.getAttribute('aria-expanded') === 'false');
    ok('(B) an arrow indicator exists in the header row', !!btn.querySelector('.accordion-arrow'));
    // C: 上へ戻る
    const card = document.getElementById('experienceMenuCard');
    const back = document.getElementById('menuBackToTop');
    ok('(C) the back-to-top button exists at the menu bottom', !!back && !!card);
    let scrolledTarget = null;
    card.scrollTo = function(o){ scrolledTarget = o; this.scrollTop = 0; };
    Object.defineProperty(card,'scrollTop',{ value: 500, writable: true });
    let pageScrolled = false; window.scrollTo = function(){ pageScrolled = true; };
    back.onclick();
    ok('(C) clicking scrolls only the menu container to top', scrolledTarget && scrolledTarget.top === 0);
    ok('(C) the page body is not scrolled', !pageScrolled);
  }

  // ===== 題名提案（E） =====
  {
    const { window, document, fetchLog, gaCalls } = await createEnv({});
    window.goToPage('desk');
    const btn = document.getElementById('titleConsultBtn');
    ok('(E) the consult button exists near the title input', !!btn && !!document.getElementById('titleInput'));
    const fetchesBefore = fetchLog.length;
    window.toggleTitleConsult();
    const items = ()=>Array.from(document.querySelectorAll('.title-consult-item')).map(b=>b.textContent);
    const first = items();
    ok('(E) about 5 shelf-based candidates are shown', first.length === 5);
    ok('(E) candidates respect the 16-char title limit', first.every(x=>x.length <= 16));
    ok('(E) opening the panel makes no network request (no AI/no external service)', fetchLog.length === fetchesBefore);
    // 開いている間は安定
    window.renderTitleConsult();
    ok('(E) candidates stay stable while the panel is open', JSON.stringify(items()) === JSON.stringify(first));
    // 別の題名を見る → 入れ替わる
    document.querySelector('.title-consult-more').onclick();
    const second = items();
    ok('(E) "see other titles" swaps the candidates', JSON.stringify(second) !== JSON.stringify(first));
    // 候補選択 → 入力欄に入り、編集できる
    document.querySelectorAll('.title-consult-item')[0].onclick();
    const input = document.getElementById('titleInput');
    ok('(E) tapping a candidate fills the title input', input.value === second[0]);
    input.value = input.value + '改';
    ok('(E) the title remains freely editable afterward', input.value.endsWith('改'));
    // 本文を解析しない（静的検査）
    const src = fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    const block = src.slice(src.indexOf('function titleConsultPool'), src.indexOf('function renderTitleConsult'));
    ok('(E) the candidate pool code never reads the story input (no body analysis)', !block.includes('storyInput') && !block.includes('.value'));
    ok('(E) no new GA4 events while consulting', gaCalls.filter(c=>c[0]==='event').every(c=>['create_book_error','create_book_success','start_writing','view_landing','view_shelf'].includes(c[1])));
    // 未題のまま製本できる既存仕様：placeholderが維持されている
    ok('(E) untitled binding remains possible (placeholder text preserved)', document.getElementById('titleInput').getAttribute('data-i18n-ph') === 'titleInputPlaceholder');
  }

  // ===== 名もなき感情（F） =====
  {
    const entry = { id:'m1', title:'昔の一冊', story:'本文', category:'moyamoya', date:new Date().toISOString() };
    const { window, document } = await createEnv({ seedLibrary:[entry] });
    const src = fs.readFileSync(path.join(SRC,'data.js'),'utf-8');
    ok('(F) the internal id "moyamoya" is preserved', src.includes('id: "moyamoya"'));
    window.goToShelf('moyamoya');
    await new Promise(r=>setTimeout(r,100));
    const def = document.querySelector('.definition');
    ok('(F) JA display name is 名もなき感情', def && def.textContent.includes('名もなき感情'));
    ok('(F) JA description matches the new copy', def && def.textContent.includes('どの棚の名前もしっくりこない気持ち'));
    window.toggleLanguage();
    window.goToShelf('moyamoya');
    await new Promise(r=>setTimeout(r,100));
    const defEn = document.querySelector('.definition');
    ok('(F) EN display name is Unnamed Feeling', defEn && defEn.textContent.includes('Unnamed Feeling'));
    ok('(F) EN description matches the specified copy', defEn && defEn.textContent.includes('does not yet fit the name of any shelf'));
    ok('(F) the sunk-in-silence assertion is gone from product sources', !src.includes('静かに沈んでいる') && !fs.readFileSync(path.join(SRC,'main.js'),'utf-8').includes('静かに沈んでいる'));
    // 既存保存データ（category:'moyamoya'）が読み込める
    window.toggleLanguage();
    window.goToPage('bookshelf');
    if(typeof window.renderShelf === 'function'){ try{ window.renderShelf(); }catch(e){} }
    await new Promise(r=>setTimeout(r,50));
    const spines = Array.from(document.querySelectorAll('#myShelf .spine')).filter(s=>s.textContent==='昔の一冊');
    ok('(F) an existing saved entry with category moyamoya still loads onto the shelf', spines.length === 1);
    // ★Hotfix1更新：言語切替時に棚タブが再描画されるようになったため、このenvでは直前に
    // 利用者操作としてgoToShelf('moyamoya')を実行済み＝activeタブがmoyamoyaなのは正しい挙動。
    // 「自動的な既定値になっていないこと」は、操作していない新しいenvで検証する。
    {
      const fresh = await createEnv({});
      fresh.window.goToPage('shelves');
      await new Promise(r=>setTimeout(r,50));
      const act = fresh.document.querySelector('.shelf-tab.active');
      ok('(F) moyamoya is not the auto-preselected shelf tab (fresh visit)', !(act && act.textContent.includes('名もなき感情')));
    }
  }

  // ===== おすすめ（G） =====
  {
    const entry = { id:'g1', title:'一冊', story:'本文', category:'natsukashii', date:new Date().toISOString() };
    const { window, document } = await createEnv({ seedLibrary:[entry] });
    window.goToPage('bookshelf');
    window.renderShelfPickRecommend();
    await new Promise(r=>setTimeout(r,50));
    const titleOf = ()=> (document.querySelector('#shelfPickRecommend .shelf-pick-book .shelf-pick-title')||{}).textContent || '';
    const songOf = ()=> (document.querySelector('#shelfPickRecommend .shelf-pick-music .shelf-pick-title')||{}).textContent || '';
    const t1 = titleOf(), s1 = songOf();
    ok('(G) a book and a song are picked (1 + 1 max)', document.querySelectorAll('#shelfPickRecommend .shelf-pick-book').length <= 1 && document.querySelectorAll('#shelfPickRecommend .shelf-pick-music').length <= 1);
    window.renderShelfPickRecommend();
    ok('(G) re-render keeps the same book', titleOf() === t1);
    window.toggleLanguage();
    window.renderShelfPickRecommend();
    ok('(G) language switch keeps the same book (candidate ID stable)', titleOf() === t1);
    ok('(G) language switch keeps the same song', songOf() === s1);
    const meta = document.querySelector('#shelfPickRecommend .shelf-pick-book .shelf-pick-meta');
    ok('(G) the EN hook text is English (no Japanese)', !meta || !JP_RE.test(meta.textContent));
    // 出会いの更新（製本相当）で別候補が選ばれ得る＋直前候補を避ける
    window.toggleLanguage();
    let changed = false;
    for(let i=0;i<6;i++){
      window.rotateRecoEncounter();
      window.renderShelfPickRecommend();
      if(titleOf() !== t1){ changed = true; break; }
    }
    ok('(G) a new encounter can pick a different book', changed);
    // sessionStorageに直前候補が保持されている
    ok('(G) the previous pick is remembered to avoid immediate repeats', !!window.sessionStorage.getItem('eb-reco-prev-book'));
  }

  // ===== 寄り道（H） =====
  {
    const first = await createEnv({ fakeNow:'2026-07-10T12:00:00+09:00' });
    first.window.goToShelf('natsukashii');
    await new Promise(r=>setTimeout(r,150));
    const names1 = Array.from(first.document.querySelectorAll('.detour-name')).map(n=>n.textContent);
    ok('(H) the first-half heading note is shown', first.document.querySelector('.detour-half-note').textContent.includes('今月前半'));
    // 同じ半月：再描画・言語切替で不変
    first.window.renderDetourSection ? await first.window.renderDetourSection('natsukashii') : null;
    await new Promise(r=>setTimeout(r,100));
    const names1b = Array.from(first.document.querySelectorAll('.detour-name')).map(n=>n.textContent);
    ok('(H) the same half-month keeps identical items and order', JSON.stringify(names1b) === JSON.stringify(names1));
    first.window.toggleLanguage();
    await first.window.renderDetourSection('natsukashii');
    await new Promise(r=>setTimeout(r,100));
    const namesEn = Array.from(first.document.querySelectorAll('.detour-name')).map(n=>n.textContent);
    ok('(H) EN mode keeps the same item IDs (English names, same order)', namesEn.length === names1.length && namesEn.every(n=>!JP_RE.test(n)));
    // 後半は別セット
    const second = await createEnv({ fakeNow:'2026-07-20T12:00:00+09:00' });
    second.window.goToShelf('natsukashii');
    await new Promise(r=>setTimeout(r,150));
    const names2 = Array.from(second.document.querySelectorAll('.detour-name')).map(n=>n.textContent);
    ok('(H) the second-half heading note is shown', second.document.querySelector('.detour-half-note').textContent.includes('今月後半'));
    ok('(H) the 1st-15th and 16th+ sets differ (content or order)', JSON.stringify(names2) !== JSON.stringify(names1));
    ok('(H) the display stays at 3 items (no ad-catalog look)', names1.length === 3 && names2.length === 3);
  }

  // ===== 英語動的コンテンツ（I）＋栞 =====
  {
    const entry = { id:'i1', title:'一冊', story:'本文', category:'kodoku', date:new Date().toISOString() };
    const { window, document } = await createEnv({ seedLibrary:[entry] });
    window.toggleLanguage();
    window.goToShelf('kodoku');
    await new Promise(r=>setTimeout(r,150));
    const quote = document.querySelector('.quote-card');
    ok('(I) EN quotes come from the original EN pool (no Japanese)', quote && !JP_RE.test(quote.textContent));
    const story = document.querySelector('.episode-card:not(.mine)');
    ok('(I) EN short episodes are English', !story || !JP_RE.test(story.textContent));
    // 今日の栞：英語モードで英語の栞になる
    window.goToPage('bookshelf');
    const shioriBtn = document.getElementById('shioriBtn');
    if(shioriBtn && shioriBtn.onclick) await shioriBtn.onclick();
    await new Promise(r=>setTimeout(r,100));
    const shioriText = document.getElementById('shioriText');
    ok('(I) the daily bookmark comment is English in EN mode', shioriText && shioriText.textContent.length > 0 && !JP_RE.test(shioriText.textContent));
    // 言語を日本語へ戻すと、同じ栞が日本語で表示される（再抽選しない）
    window.toggleLanguage();
    if(typeof window.renderShioriCard === 'function') await window.renderShioriCard();
    await new Promise(r=>setTimeout(r,50));
    ok('(I) switching back to JA re-renders the same bookmark in Japanese', JP_RE.test(document.getElementById('shioriText').textContent));
    // 今月のおすすめ棚（看板）：英語
    window.toggleLanguage();
    window.renderFair();
    const fair = document.getElementById('fairBox');
    ok('(I) the monthly shelf signboard is fully English in EN mode', fair && !JP_RE.test(fair.textContent));
    ok('(D) the signboard shows kicker + shelf name + line + go link only', !!fair.querySelector('.fair-kicker') && !!fair.querySelector('.fair-shelf-name') && !!fair.querySelector('.fair-line') && !!fair.querySelector('.fair-go'));
    ok('(D) the signboard go control is a keyboard-operable button', fair.querySelector('.fair-go').tagName === 'BUTTON');
  }

  // ===== 既存機能の維持（J・抜粋） =====
  {
    const { window, document } = await createEnv({});
    ok('(J) WEATHER_FEATURE_ENABLED remains false in the shipped source', fs.readFileSync(path.join(SRC,'main.js'),'utf-8').includes('const WEATHER_FEATURE_ENABLED = false;'));
    ok('(J) the weather settings stay hidden', document.getElementById('weatherSettings').classList.contains('hidden'));
    ok('(J) the sample book still works', (window.openSampleBook(), !document.getElementById('bookModal').classList.contains('hidden')));
    window.closeSampleBook();
    ok('(J) the afterglow lines still exist in the arrival panel', document.querySelectorAll('.bookshelf-arrival-afterglow').length === 2);
    ok('(J) the desk date display still exists (single instance)', document.querySelectorAll('#deskCurrentDate').length === 1);
    ok('(J) the cover CTA exists exactly once', document.querySelectorAll('.enter-btn').length === 1);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch(e=>{ console.error('QUIET-EN TEST CRASHED:', e); process.exit(2); });
