// 英語モード完全性監査：DOM日本語文字スキャン自動テスト
// 目的：英語モードに切り替えた状態で、可視DOM（display:none/hidden/aria-hidden以外）に
// 日本語文字（ひらがな・カタカナ・漢字）が残っていないかを検出する。
// 許可リスト：
//   1) 利用者本文欄（#storyInput 等のフォーム入力値そのもの。今回はDOM走査対象外＝input/textareaの
//      value自体はtextContentに現れないため自然に除外される）
//   2) data.js由来の書名・アーティスト名等の「正式な原題・固有名詞」。プログラムでは
//      「実在の固有名詞」を自動判定できないため、既知の要素（.recommend-chip .book title部分、
//      .playlist-track-name、.shelf-pick-title、.detour-name、引用ブロック等）を明示的に許可リストとする。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..');
const JP_RE = /[぀-ヿ一-鿿]/;

// 許可リスト：これらのセレクタにマッチする要素（またはその子孫）はスキャン対象から除外する。
// 主にdata.js由来の書名・アーティスト名・引用文・DETOUR_POOL商品名など「正式名称・原文プロセ」。
const ALLOW_SELECTORS = [
  // ★Hotfix4-6更新：BOOK_TITLE_EN/BOOK_AUTHOR_EN/SONG_ARTIST_EN/SONG_TITLE_EN
  // （英語モード候補の35冊・42曲を対象とする英語表記対応表）を追加したことで、
  // .work-title/.shelf-pick-title/.playlist-track-nameは英語モードで常に英語（またはローマ字＋
  // 英語の意味補足）表記になるはずなので、許可リストから外して実際に走査対象に含める
  // （回帰時にここへ日本語が戻ってしまったら検出できるようにする）。
  // 説明文・店主コメントを含むコンテナ（.recommend-chip全体・.detour-card全体・
  // .quote-card・.episode-card全体・.definition・.fair-line等）は除外しない＝走査対象。
  '.episode-card.mine',   // 利用者自身が綴った本文（翻訳対象外）
  '.hero-lang-toggle',    // 言語名「日本語」自身
  'script', 'style'
];

async function main(){
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
  html = html.replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '');
  html = html.replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');

  const dom = new JSDOM(html, { url:'https://example.com/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true });
  const { window } = dom;
  const { document } = window;

  const store = {};
  window.localStorage = {
    getItem:k=>(k in store?store[k]:null), setItem:(k,v)=>{store[k]=String(v);},
    removeItem:k=>{delete store[k];}, clear:()=>{Object.keys(store).forEach(k=>delete store[k]);}
  };
  window.matchMedia = window.matchMedia || function(q){ return { matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }; };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.navigator.vibrate = function(){return true;};
  window.gtag = function(){};
  window.fetch = function(){ return Promise.resolve({ok:true, json:()=>Promise.resolve([])}); };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';

  const dataSrc = fs.readFileSync(path.join(SRC,'data.js'),'utf-8');
  // ★2026-07-19 公開用リリースフラグ対応：天気設定UI・バッジ・ポップオーバーの英語文言も
  // 引き続き走査対象に含めるため、スキャン時はWEATHER_FEATURE_ENABLEDをtrueへ差し替えて実行する
  // （既定値falseの公開状態では該当UIは非表示＝利用者の目に触れない）。
  const mainSrc = fs.readFileSync(path.join(SRC,'main.js'),'utf-8')
    .replace('const WEATHER_FEATURE_ENABLED = false;', 'const WEATHER_FEATURE_ENABLED = true;');
  const s1 = document.createElement('script'); s1.textContent = dataSrc; document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = mainSrc; document.body.appendChild(s2);
  await new Promise(r=>setTimeout(r,300));
  await new Promise(r=>setTimeout(r,300));

  // ★Hotfix1-6：実際の利用順を再現する。まず日本語モードのまま各画面を操作して表示し、
  // その後は個別の再描画関数を呼ばず、言語切替ボタン（#langToggle）だけでEnglishへ切り替えて走査する。
  const langBtn = document.getElementById('langToggle');
  function toggleLangByButton(){ if(langBtn) langBtn.dispatchEvent(new window.Event('click', {bubbles:true})); }

  // walk visible text nodes（複数画面を跨いで集計できるよう関数化）
  const skipTags = new Set(['SCRIPT','STYLE','NOSCRIPT']);
  function isAllowed(el){
    while(el){
      for(const sel of ALLOW_SELECTORS){
        try{ if(el.matches && el.matches(sel)) return true; }catch(e){}
      }
      el = el.parentElement;
    }
    return false;
  }
  function isHidden(el){
    while(el){
      if(el.hidden) return true;
      if(el.classList && (el.classList.contains('hidden'))) return true;
      if(el.getAttribute && el.getAttribute('aria-hidden') === 'true') return true;
      el = el.parentElement;
    }
    return false;
  }
  const hits = [];
  function collectHits(){
    const walker = document.createTreeWalker(document.body, window.NodeFilter.SHOW_TEXT);
    let node;
    while(node = walker.nextNode()){
      const text = node.textContent;
      if(!JP_RE.test(text)) continue;
      const parent = node.parentElement;
      if(!parent) continue;
      if(skipTags.has(parent.tagName)) continue;
      if(isHidden(parent)) continue;
      if(isAllowed(parent)) continue;
      hits.push({ text: text.trim().slice(0, 80), tag: parent.tagName, cls: parent.className || '', id: parent.id || '' });
    }
    const attrsToCheck = ['title','aria-label','placeholder'];
    document.querySelectorAll('*').forEach(el=>{
      if(isHidden(el)) return;
      if(isAllowed(el)) return;
      attrsToCheck.forEach(attr=>{
        const v = el.getAttribute(attr);
        if(v && JP_RE.test(v)){
          hits.push({ text:`[${attr}] ${v.slice(0,80)}`, tag:el.tagName, cls:el.className||'', id:el.id||'' });
        }
      });
    });
  }

  // 主要な画面を一通り開き、動的に生成される文言も含めて広く走査する
  // ★2026-07-18修正：libraryCacheはlet宣言のトップレベル変数でwindow経由では触れないため、
  // 追加のscriptタグをページのスクリプトスコープへ注入して直接操作する（従来のwindow.libraryCache.push
  // は常に無音で失敗しており、本棚・月別タブへ実際にはentryが1件も入っていなかった）。
  const seedEntry = { id:'scan-test-1', title:'Test Entry', story:'test story body', category:'natsukashii', date:new Date().toISOString() };
  // 「以前を振り返って綴った一冊」（sealed）表示も走査できるよう、月の異なる2件目をsealed:trueで追加する。
  const sealedEntry = { id:'scan-test-2', title:'Sealed Entry', story:'sealed story body', category:'kanashii', date:'2026-05-10T10:00:00.000Z', sealed:true };
  window.__scanSeedEntry = seedEntry;
  window.__scanSealedEntry = sealedEntry;
  const seedScript = document.createElement('script');
  seedScript.textContent = 'libraryCache.push(window.__scanSeedEntry, window.__scanSealedEntry);';
  document.body.appendChild(seedScript);

  if(typeof window.goToPage === 'function') window.goToPage('counter');
  if(typeof window.renderCounterShelfGuideAll === 'function') window.renderCounterShelfGuideAll();
  if(typeof window.goToPage === 'function') window.goToPage('shelves');
  if(typeof window.goToShelf === 'function') window.goToShelf('natsukashii');
  await new Promise(r=>setTimeout(r,50));
  if(typeof window.goToPage === 'function') window.goToPage('desk');
  if(typeof window.goToPage === 'function') window.goToPage('bookshelf');
  // ★2026-07-18追加：2件のentryが異なる月にまたがるため、月別タブ（すべて／日付不明を含む文言）も走査する。
  if(typeof window.renderShelf === 'function'){ try{ window.renderShelf(); }catch(e){} }
  if(typeof window.renderShelfPickRecommend === 'function') window.renderShelfPickRecommend();
  if(typeof window.renderBookshelfArrival === 'function') window.renderBookshelfArrival();
  if(typeof window.applyShelfTier === 'function') window.applyShelfTier();
  if(typeof window.showFavorites === 'function'){ try{ window.showFavorites(); }catch(e){} }
  // ★2026-07-18追加：本の詳細画面（#bookModal）と、タイトル・本文を書き直す編集モードも走査する。
  // sealedEntry（以前を振り返って綴った一冊）を開いて、日付・振り返り表示も走査する。
  if(typeof window.openBook === 'function'){ try{ window.openBook(sealedEntry); }catch(e){} }
  if(typeof window.enterBookEditMode === 'function'){ try{ window.enterBookEditMode(sealedEntry); }catch(e){} }
  // ★2026-07-18追加：編纂机の「言葉にするための助け舟」も明示的に再描画して走査する。
  if(typeof window.renderWritingBoat === 'function'){ try{ window.renderWritingBoat(); }catch(e){} }
  try{
    const purifyKey = typeof window.PURIFY_LOG_KEY === 'string' ? window.PURIFY_LOG_KEY : 'emotion-bookstore-purify-log';
    window.localStorage.setItem(purifyKey, JSON.stringify([{ id:'p1', category:'natsukashii', title:'Test', date:new Date().toISOString() }]));
  }catch(e){}
  if(typeof window.showPurifyLog === 'function'){ try{ await window.showPurifyLog(); }catch(e){} }
  await new Promise(r=>setTimeout(r,50));
  if(typeof window.showProfileCard === 'function'){ try{ window.showProfileCard(); }catch(e){} }
  if(typeof window.openShareMenu === 'function'){ try{ window.openShareMenu('https://example.com/'); }catch(e){} }
  if(typeof window.applyShelfTier === 'function'){ try{ window.applyShelfTier(); }catch(e){} }
  // ★2026-07-19追加：任意設定の天気連動機能（店内メニュー・地域選択・バッジ・詳細ポップオーバー）も
  // 英語モードで開いた状態で走査する。
  if(typeof window.openExperienceMenu === 'function'){ try{ window.openExperienceMenu(); }catch(e){} }
  if(typeof window.toggleWeatherEnabled === 'function'){ try{ await window.toggleWeatherEnabled(); }catch(e){} }
  if(typeof window.onWeatherRegionSelectChange === 'function'){ try{ await window.onWeatherRegionSelectChange('tokyo'); }catch(e){} }
  await new Promise(r=>setTimeout(r,50));
  if(typeof window.toggleWeatherDetail === 'function'){ try{ await window.toggleWeatherDetail(); }catch(e){} }
  await new Promise(r=>setTimeout(r,80));
  // ★2026-07-19追加：feature/first-visit-experience の閲覧専用サンプル本も英語モードで開いて走査する
  // （表紙の説明文・余韻2行はdata-i18n走査で既にカバーされるため、動的に組み立てるサンプル本のみ明示的に開く）。
  if(typeof window.openSampleBook === 'function'){ try{ window.openSampleBook(); }catch(e){} }
  await new Promise(r=>setTimeout(r,50));
  // ★2026-07-19拡張：はじめての方へ（アコーディオン）を開いた状態も走査する
  const accBtn = document.getElementById('aboutAccordionBtn');
  if(accBtn){ try{ accBtn.dispatchEvent(new window.Event('click', {bubbles:true})); }catch(e){} }
  const accContent = document.getElementById('aboutAccordionContent');
  if(accContent) accContent.classList.add('open');
  const dataAcc = document.querySelector('.about-data-accordion');
  if(dataAcc) dataAcc.setAttribute('open','');
  // 題名相談パネル（編纂机）
  if(typeof window.goToPage === 'function') window.goToPage('desk');
  if(typeof window.toggleTitleConsult === 'function'){ try{ window.toggleTitleConsult(); }catch(e){} }
  await new Promise(r=>setTimeout(r,50));
  // 今日の栞（生成して表示）
  if(typeof window.goToPage === 'function') window.goToPage('bookshelf');
  const shioriBtn = document.getElementById('shioriBtn');
  if(shioriBtn && shioriBtn.onclick){ try{ await shioriBtn.onclick(); }catch(e){} }
  await new Promise(r=>setTimeout(r,80));
  // 今月のおすすめ棚（看板）
  if(typeof window.renderFair === 'function'){ try{ window.renderFair(); }catch(e){} }
  // 全感情棚を順に開き、棚説明・引用・短編・本・音楽・寄り道を走査対象に載せる
  if(typeof window.goToShelf === 'function' && typeof window.CATEGORIES !== 'undefined'){}
  const catIds = ['moyamoya','kodoku','gakkari','hazukashii','ushirometai','aseri','kuyashii','shitto','akogare','wakuwaku','ando','kansha','itooshii','hokorashii','natsukashii','ureshii','ikari','kanashii','fuan','keno','odoroki'];
  for(const cid of catIds){
    // 1) 日本語モードで棚を開いて名言・エピソード・本・曲・寄り道を表示する
    if(typeof window.goToShelf === 'function'){ try{ window.goToShelf(cid); }catch(e){} }
    await new Promise(r=>setTimeout(r,30));
    // 2) 言語切替ボタンだけでEnglishへ（再描画関数の直接呼び出しはしない）
    toggleLangByButton();
    await new Promise(r=>setTimeout(r,30));
    collectHits();
    // 3) 次の棚のために日本語へ戻す（これもボタン操作のみ）
    toggleLangByButton();
    await new Promise(r=>setTimeout(r,20));
  }


  // ★最終走査の前に店内メニューを開き直す（goToPage系のナビゲーションでメニューは閉じられるため。
  // メニュー内の法務リンク行・はじめての方へ・設定・上へ戻るボタン等を可視状態で走査する）。
  if(typeof window.openExperienceMenu === 'function'){ try{ window.openExperienceMenu(); }catch(e){} }
  await new Promise(r=>setTimeout(r,80));
  // 最終確認もボタン操作のみで英語へ切り替えてから走査する
  toggleLangByButton();
  await new Promise(r=>setTimeout(r,80));
  collectHits();

  console.log(`=== Japanese characters found in visible EN-mode DOM: ${hits.length} ===`);
  const seen = new Set();
  hits.forEach(h=>{
    const key = h.tag+'|'+h.cls+'|'+h.id+'|'+h.text;
    if(seen.has(key)) return;
    seen.add(key);
    console.log(`[${h.tag}${h.id ? '#'+h.id : ''}${h.cls ? '.'+String(h.cls).split(' ').join('.') : ''}] ${h.text}`);
  });
  console.log(`\nUnique hits: ${seen.size}`);
  process.exit(0);
}

main().catch(e=>{ console.error('SCAN CRASHED:', e); process.exit(2); });
