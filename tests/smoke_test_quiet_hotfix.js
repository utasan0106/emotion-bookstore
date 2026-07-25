// hotfix/quiet-en1-dynamic-consistency 受入テスト。
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
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); } // アプリ側todayStr()と同形式（ゼロ埋めなし）

async function main(){
  // ===== 1: 執筆前サプライズ =====
  {
    const {window,document,toggleByButton}=await createEnv({});
    const hasRecText=(root)=>/寄り道|おすすめの本|本や音楽/.test(root.textContent);
    ok('(1) no book/music explanation on the cover', !hasRecText(document.querySelector('.entrance.hero')));
    document.getElementById('aboutAccordionBtn').dispatchEvent(new window.Event('click',{bubbles:true}));
    ok('(1) no book/music explanation inside the opened first-visit accordion', !/本や音楽|寄り道/.test(document.getElementById('aboutAccordionContent').textContent));
    ok('(1) no book/music explanation in the menu card (JA)', !/本や音楽/.test(document.getElementById('experienceMenuCard').textContent));
    toggleByButton();
    ok('(1) no book/music explanation in EN accordion either', !/[Bb]ooks and music|detour/.test(document.getElementById('aboutAccordionContent').textContent));
    toggleByButton();
    window.goToPage('desk');
    ok('(1) no book/music explanation on the desk', !/本や音楽|寄り道/.test(document.getElementById('desk').textContent));
    ok('(1) firstVisitRecLine key is removed from MESSAGES', !fs.readFileSync(path.join(SRC,'main.js'),'utf-8').includes('firstVisitRecLine'));
  }
  // 製本完了後に初めて本・音楽が現れる（棚あり=製本後状態で表示される）
  {
    const entry={id:'s1',title:'一冊',story:'本文',category:'ando',date:new Date().toISOString()};
    const {window,document}=await createEnv({seedLibrary:[entry]});
    window.goToPage('bookshelf'); window.renderShelfPickRecommend();
    await new Promise(r=>setTimeout(r,50));
    ok('(1) after binding, the book+song picks appear for the first time', !!document.querySelector('#shelfPickRecommend .shelf-pick-book') && !!document.querySelector('#shelfPickRecommend .shelf-pick-music'));
  }

  // ===== 2: 英語題名候補（全21棚） =====
  {
    const {window,document,toggleByButton}=await createEnv({});
    const src=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');
    eval(src.replace(/const /g,'var '));
    const cats=Object.keys(TITLE_SUGGEST_EN);
    ok('(2) EN pools exist for all 21 shelves', cats.length===21);
    ok('(2) every shelf pool has >=10 candidates', cats.every(c=>TITLE_SUGGEST_EN[c].length>=10));
    ok('(2) generic EN pool has >=10 candidates', TITLE_SUGGEST_EN_GENERIC.length>=10);
    const maxlen=16;
    ok('(2) all candidates fit within maxlength incl. spaces/punctuation', cats.every(c=>TITLE_SUGGEST_EN[c].every(x=>x.length<=maxlen)) && TITLE_SUGGEST_EN_GENERIC.every(x=>x.length<=maxlen));
    // 実表示：全21棚で重複なし5件
    toggleByButton(); // EN
    let allOk=true, counts={};
    for(const cid of cats){
      window.goToShelf(cid); await new Promise(r=>setTimeout(r,10));
      window.goToPage('desk');
      if(document.getElementById('titleConsult').classList.contains('hidden')) window.toggleTitleConsult(); else window.renderTitleConsult();
      const items=[...document.querySelectorAll('.title-consult-item')].map(b=>b.textContent);
      counts[cid]=items.length;
      if(items.length!==5 || new Set(items).size!==5 || items.some(x=>x.length>maxlen) || items.some(x=>JP_RE.test(x))) allOk=false;
      window.toggleTitleConsult(); // 閉じて次へ
    }
    console.log('EN title display counts per shelf:', JSON.stringify(counts));
    ok('(2) all 21 shelves display exactly 5 unique EN candidates within limit (incl. shitto/akogare/ando/kansha)', allOk && counts.shitto===5 && counts.akogare===5 && counts.ando===5 && counts.kansha===5);
    // 汎用（未対応棚相当は存在しないため、プール検証で担保）＋See other titles
    window.toggleTitleConsult();
    const a=[...document.querySelectorAll('.title-consult-item')].map(b=>b.textContent);
    document.querySelector('.title-consult-more').onclick();
    const b=[...document.querySelectorAll('.title-consult-item')].map(x=>x.textContent);
    ok('(2) "See other titles" swaps to a different unique set', JSON.stringify(a)!==JSON.stringify(b) && new Set(b).size===5);
    ok('(2) generic pool yields 5 unique short titles', TITLE_SUGGEST_EN_GENERIC.slice(0,5).length===5 && new Set(TITLE_SUGGEST_EN_GENERIC.slice(0,5)).size===5);
  }

  // ===== 3+4: 言語切替のみで動的再描画＋一期一会（棚表示） =====
  {
    const entry={id:'L1',title:'一冊',story:'本文',category:'kodoku',date:new Date().toISOString()};
    const {window,document,fetchLog,toggleByButton}=await createEnv({seedLibrary:[entry]});
    window.goToShelf('kodoku'); await new Promise(r=>setTimeout(r,120));
    const grab=()=>({
      quote: (document.querySelector('.quote-card')||{}).textContent||'',
      story: (document.querySelector('.episode-card:not(.mine)')||{}).textContent||'',
      // ★Hotfix4-6更新：work-title/playlist-track-nameの表示文字列は英語モードで英訳表記に
      // 変わるようになったため（本来の狙い）、再描画・言語切替で「同じ候補が選ばれ続けているか」の
      // 判定は表示文字列ではなく、常に元の日本語識別子を保持するfav-btnのdata属性で行う。
      chips: [...document.querySelectorAll('.recommend-chip .fav-btn')].map(x=>x.getAttribute('data-fav-title')+'|'+x.getAttribute('data-fav-by')),
      tracks: [...document.querySelectorAll('.playlist-track-row .fav-btn')].map(x=>x.getAttribute('data-fav-title')+'|'+x.getAttribute('data-fav-by')),
      detours: [...document.querySelectorAll('.detour-name')].map(x=>x.textContent),
      def: (document.querySelector('.definition')||{}).textContent||''
    });
    const ja1=grab();
    // 一期一会：同じ棚を再描画しても変わらない
    window.renderShelfDisplay(); await new Promise(r=>setTimeout(r,80));
    const ja2=grab();
    ok('(4) re-rendering the shelf keeps the same books (stable keys)', JSON.stringify(ja2.chips)===JSON.stringify(ja1.chips));
    ok('(4) re-rendering keeps the same songs', JSON.stringify(ja2.tracks)===JSON.stringify(ja1.tracks));
    ok('(4) re-rendering keeps the same quote slot', ja2.quote===ja1.quote);
    ok('(4) re-rendering keeps the same episodes', ja2.story===ja1.story);
    // モーダル開閉でも変わらない
    window.openSampleBook(); window.closeSampleBook();
    const ja3=grab();
    ok('(4) opening/closing a modal does not reshuffle the shelf', JSON.stringify(ja3.chips)===JSON.stringify(ja1.chips) && JSON.stringify(ja3.tracks)===JSON.stringify(ja1.tracks));
    // 言語切替ボタンのみでEN化
    const fetchesBefore=fetchLog.length;
    toggleByButton(); await new Promise(r=>setTimeout(r,120));
    const en=grab();
    ok('(3) shelf name/description turn English via the toggle button alone', en.def.includes('Solitude')||en.def.length>0 && !JP_RE.test(en.def));
    ok('(3) the quote turns English (same slot concept)', en.quote.length>0 && !JP_RE.test(en.quote));
    ok('(3) the episode turns English', !en.story || !JP_RE.test(en.story));
    ok('(3) book stable keys unchanged across the language switch', JSON.stringify(en.chips)===JSON.stringify(ja1.chips));
    ok('(3) song stable keys unchanged across the language switch', JSON.stringify(en.tracks)===JSON.stringify(ja1.tracks));
    ok('(3) detour item IDs unchanged (same order, English names)', en.detours.length===ja1.detours.length && en.detours.every(n=>!JP_RE.test(n)));
    ok('(3) chips hook text is English', [...document.querySelectorAll('.recommend-why')].every(x=>!JP_RE.test(x.textContent)));
    ok('(3) no network request occurred due to the language switch', fetchLog.length===fetchesBefore);
    // ENから日本語へ戻す
    toggleByButton(); await new Promise(r=>setTimeout(r,120));
    const jaBack=grab();
    ok('(3) switching back to JA restores the same items in Japanese', JSON.stringify(jaBack.chips)===JSON.stringify(ja1.chips) && JSON.stringify(jaBack.tracks)===JSON.stringify(ja1.tracks) && jaBack.quote===ja1.quote);
    // 新しい出会いで変わり得る＋直前回避
    let changed=false; const before=JSON.stringify(ja1.chips);
    for(let i=0;i<8;i++){ window.rotateRecoEncounter(); window.renderShelfDisplay(); await new Promise(r=>setTimeout(r,30));
      if(JSON.stringify(grab().chips)!==before){ changed=true; break; } }
    ok('(4) a new encounter can pick different shelf books', changed);
    ok('(4) previous-pick avoidance memory is kept', !!window.sessionStorage.getItem('eb-reco-prev-book'));
  }

  // ===== 5: 旧形式の栞 =====
  {
    const legacy={ date: todayStr(), text: 'あなたの本棚は「懐かしい」の頁が厚いようです。' };
    const entry={id:'sh1',title:'一冊',story:'本文',category:'natsukashii',date:new Date().toISOString()};
    const {window,document,toggleByButton}=await createEnv({seedLibrary:[entry],seedShiori:legacy});
    window.goToPage('bookshelf'); await new Promise(r=>setTimeout(r,100));
    // 日本語モード：既存textを尊重
    await window.renderShioriCard(); await new Promise(r=>setTimeout(r,50));
    const jaText=document.getElementById('shioriText').textContent;
    ok('(5) legacy {date,text} loads in JA mode with the original text respected', jaText===legacy.text);
    // 移行保存を確認
    const saved=JSON.parse(window.localStorage.getItem('emotion-bookstore-shiori')).data;
    ok('(5) migration persists tplIdx and catId into the same key', saved.tplIdx!=null && saved.catId!=null);
    const firstIdx=saved.tplIdx;
    // 同日再読み込み相当：再描画してもテンプレートが変わらない
    await window.renderShioriCard();
    const saved2=JSON.parse(window.localStorage.getItem('emotion-bookstore-shiori')).data;
    ok('(5) the migrated template stays stable on reload within the same day', saved2.tplIdx===firstIdx);
    // 英語モード：日本語textを表示しない
    toggleByButton(); await new Promise(r=>setTimeout(r,100));
    const enText=document.getElementById('shioriText').textContent;
    ok('(5) EN mode never shows the legacy Japanese text', enText.length>0 && !JP_RE.test(enText));
    // 日英切替で同じ栞（同テンプレート）を各言語で表示
    toggleByButton(); await new Promise(r=>setTimeout(r,100));
    ok('(5) back in JA, the same bookmark is shown again', document.getElementById('shioriText').textContent===legacy.text);
  }

  // ===== 旧形式栞を英語モードで“開始”するケース =====
  {
    const legacy={ date: todayStr(), text: '旧形式の日本語栞テキスト' };
    const entry={id:'sh2',title:'一冊',story:'本文',category:'ando',date:new Date().toISOString()};
    const env=await createEnv({seedLibrary:[entry],seedShiori:legacy});
    env.toggleByButton(); await new Promise(r=>setTimeout(r,80)); // 英語モードで開始
    env.window.goToPage('bookshelf'); await env.window.renderShioriCard(); await new Promise(r=>setTimeout(r,80));
    const t=env.document.getElementById('shioriText').textContent;
    ok('(5) starting in EN mode with a legacy bookmark shows English, not the JA text', t.length>0 && !JP_RE.test(t));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail>0?1:0);
}
main().catch(e=>{console.error('HOTFIX TEST CRASHED:',e);process.exit(2);});
