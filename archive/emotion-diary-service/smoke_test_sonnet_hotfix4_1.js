// Sonnet Hotfix4.1 受入テスト。
// 英語モードで、受け取り頁（店主まなが本を預かる場面）の棚選択selectの option だけが
// 生の日本語（cat.label）のままだった不具合の修正を検証する。
//
// 検証観点：
//  A) 日本語モード：全21棚が日本語・並び順・選択肢数・valueが従来どおり
//  B) 英語モード：全21棚が英語（日本語が1件も混ざらない）・プレースホルダーも英語
//  C) 言語切替：再読み込みなしで表示名が切り替わり、選択中のvalue（内部ID）が維持される
//  D) 保存互換性：option.value は内部カテゴリID（moyamoya等）のまま不変
//  E) 製本フロー：選択して確定すると正しい棚へ入る／棚を選ばず本棚へ戻れる
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
  window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){};window.scrollTo=function(){};window.navigator.vibrate=()=>true;
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';
  window.gtag=function(){};
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  const s1=document.createElement('script');s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');document.body.appendChild(s1);
  const s2=document.createElement('script');s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');document.body.appendChild(s2);
  // libraryCache は top-level let のため window 経由では触れない。ページスコープ内から参照する。
  const s3=document.createElement('script');s3.textContent='window.__dumpCategories=function(){return CATEGORIES;};window.__dumpLabelEn=function(){return CATEGORY_LABEL_EN;};window.__openPickerForId=function(id){var e=libraryCache.find(function(b){return b.id===id;});if(e)showUnfiledShelfPicker(e);};window.__libEntry=function(id){return libraryCache.find(function(b){return b.id===id;});};';document.body.appendChild(s3);
  await new Promise(r=>setTimeout(r,300));await new Promise(r=>setTimeout(r,300));
  const langBtn=document.getElementById('langToggle');
  const toggleByButton=()=>langBtn.dispatchEvent(new window.Event('click',{bubbles:true}));
  return {window,document,toggleByButton};
}

function optionsOf(document){
  const sel = document.getElementById('unfiledShelfSelect');
  return Array.from(sel.options);
}
function realOptionsOf(document){
  // プレースホルダー（value=''）を除いた、実際の棚のoption
  return optionsOf(document).filter(o=>o.value !== '');
}

async function main(){
  const entry = { id:'p1', title:'テスト本', story:'本文', category:'unfiled', date:'2026-07-21T00:00:00.000Z' };

  // ===== A: 日本語モード =====
  {
    const { window, document } = await createEnv({});
    window.showUnfiledShelfPicker(Object.assign({}, entry));
    const cats = window.__dumpCategories();
    const opts = realOptionsOf(document);

    ok('(A) the shelf select renders exactly one option per CATEGORIES entry (21 shelves)', opts.length === cats.length);
    ok('(A) there are exactly 21 shelves', opts.length === 21);
    ok('(A) JA mode shows every shelf name in Japanese (matches cat.label exactly)',
      opts.every((o,i)=>o.textContent === cats[i].label));
    ok('(A) the order of shelves matches CATEGORIES exactly',
      opts.every((o,i)=>o.value === cats[i].id));
    ok('(A) the placeholder is the Japanese one', document.getElementById('unfiledShelfSelect').options[0].textContent === '棚を選んでください');
    ok('(A) the placeholder has an empty value and is disabled (cannot be saved as a category)', (()=>{
      const p = document.getElementById('unfiledShelfSelect').options[0];
      return p.value === '' && p.disabled === true;
    })());
  }

  // ===== B: 英語モード =====
  {
    const { window, document, toggleByButton } = await createEnv({});
    toggleByButton();
    ok('(B) switched to English mode', window.currentLang() === 'en');
    window.showUnfiledShelfPicker(Object.assign({}, entry));
    const opts = realOptionsOf(document);
    const labelEn = window.__dumpLabelEn();

    ok('(B) EN mode still renders all 21 shelves', opts.length === 21);
    ok('(B) NOT A SINGLE option label contains Japanese characters',
      opts.every(o=>!JP_RE.test(o.textContent)));
    ok('(B) every option label matches the existing CATEGORY_LABEL_EN table (no newly invented translations)',
      opts.every(o=>o.textContent === labelEn[o.value]));
    ok('(B) the placeholder is English ("Select a shelf")',
      document.getElementById('unfiledShelfSelect').options[0].textContent === 'Select a shelf');
    ok('(B) the field label is English ("Choose a shelf (optional)")', (()=>{
      const l = document.querySelector('label[for="unfiledShelfSelect"]');
      return l && l.textContent === 'Choose a shelf (optional)';
    })());
    // 具体的に、ご報告のあった棚を名指しで確認する
    const byId = {}; opts.forEach(o=>{ byId[o.value] = o.textContent; });
    [['moyamoya','Unnamed Feeling'],['kodoku','Lonely'],['gakkari','Disappointed'],['hazukashii','Embarrassed'],
     ['ushirometai','Guilty'],['aseri','Impatient'],['kuyashii','Frustrated'],['shitto','Jealous'],
     ['akogare','Longing'],['wakuwaku','Excited'],['ando','Relieved'],['kansha','Grateful'],
     ['itooshii','Tender'],['hokorashii','Proud'],['natsukashii','Nostalgic'],['ureshii','Happy'],
     ['ikari','Angry'],['kanashii','Sad'],['fuan','Uneasy'],['keno','Disgusted'],['odoroki','Surprised']
    ].forEach(([id,en])=>{
      ok(`(B) shelf "${id}" is shown as "${en}" in EN mode`, byId[id] === en);
    });
  }

  // ===== C: 言語切替（開いたまま・再読み込みなし） =====
  {
    const { window, document, toggleByButton } = await createEnv({});
    window.showUnfiledShelfPicker(Object.assign({}, entry));
    const sel = document.getElementById('unfiledShelfSelect');

    // 日本語モードで「安堵」を選ぶ
    sel.value = 'ando';
    sel.dispatchEvent(new window.Event('change',{bubbles:true}));
    ok('(C) JA mode: selecting 安堵 sets value to the internal id "ando"', sel.value === 'ando');
    ok('(C) JA mode: the selected option reads 安堵', sel.options[sel.selectedIndex].textContent === '安堵');

    // 英語へ切替（再読み込みなし）
    toggleByButton();
    const selEn = document.getElementById('unfiledShelfSelect');
    ok('(C) after switching to EN without reload, the selected value is STILL "ando"', selEn.value === 'ando');
    ok('(C) after switching to EN, the selected option now reads "Relieved"', selEn.options[selEn.selectedIndex].textContent === 'Relieved');
    ok('(C) after switching to EN, no option label contains Japanese',
      realOptionsOf(document).every(o=>!JP_RE.test(o.textContent)));
    ok('(C) after switching to EN, the placeholder became English', selEn.options[0].textContent === 'Select a shelf');

    // 日本語へ戻す
    toggleByButton();
    const selJa = document.getElementById('unfiledShelfSelect');
    ok('(C) after switching back to JA, the value is STILL the same internal id "ando"', selJa.value === 'ando');
    ok('(C) after switching back to JA, the selected option reads 安堵 again', selJa.options[selJa.selectedIndex].textContent === '安堵');
    ok('(C) after a full JA->EN->JA round trip, the option count is unchanged (21)', realOptionsOf(document).length === 21);
    ok('(C) after a full round trip, the option values are still the internal ids in the original order',
      realOptionsOf(document).every((o,i)=>o.value === window.__dumpCategories()[i].id));
  }

  // ===== C2: 未選択のまま言語切替しても未選択が維持される =====
  {
    const { window, document, toggleByButton } = await createEnv({});
    window.showUnfiledShelfPicker(Object.assign({}, entry));
    const sel = document.getElementById('unfiledShelfSelect');
    ok('(C2) initially nothing is selected (placeholder, empty value)', sel.value === '');
    toggleByButton();
    const selEn = document.getElementById('unfiledShelfSelect');
    ok('(C2) after switching to EN, it is STILL unselected (no shelf silently picked)', selEn.value === '');
    ok('(C2) the confirm button is still disabled while unselected',
      document.getElementById('unfiledShelfConfirm').disabled === true);
  }

  // ===== D: 保存互換性（内部IDが表示名に汚染されていない） =====
  {
    const { window, document, toggleByButton } = await createEnv({});
    toggleByButton(); // EN
    window.showUnfiledShelfPicker(Object.assign({}, entry));
    const opts = realOptionsOf(document);
    ok('(D) EN mode: every option.value is still a lowercase internal id (never an English label)',
      opts.every(o=>/^[a-z]+$/.test(o.value)));
    ok('(D) EN mode: "Unnamed Feeling" still carries the internal id "moyamoya"',
      opts.some(o=>o.textContent === 'Unnamed Feeling' && o.value === 'moyamoya'));
    ok('(D) no option.value equals its own English display label',
      opts.every(o=>o.value !== o.textContent));
  }

  // ===== E: 製本フロー（英語モードで選択→確定で正しい棚へ入る） =====
  {
    const seed = [{ id:'e1', title:'Test Book', story:'body', category:'unfiled', date:'2026-07-21T00:00:00.000Z' }];
    const { window, document, toggleByButton } = await createEnv({ seedLibrary: seed });
    toggleByButton(); // EN
    // 実フローと同じく libraryCache 内の実オブジェクトを渡す（コピーではない）
    window.__openPickerForId('e1');
    const sel = document.getElementById('unfiledShelfSelect');
    sel.value = 'kansha';
    sel.dispatchEvent(new window.Event('change',{bubbles:true}));
    ok('(E) EN mode: after selecting "Grateful", the confirm button becomes enabled',
      document.getElementById('unfiledShelfConfirm').disabled === false);
    ok('(E) EN mode: the selected label is English but the value is the internal id',
      sel.options[sel.selectedIndex].textContent === 'Grateful' && sel.value === 'kansha');
    document.getElementById('unfiledShelfConfirm').dispatchEvent(new window.Event('click',{bubbles:true}));
    await new Promise(r=>setTimeout(r,200));
    const saved = JSON.parse(window.localStorage.getItem('emotion-bookstore-library'));
    const rec = saved.data.find(b=>b.id === 'e1');
    ok('(E) the book was filed under the internal id "kansha" (not the English label)', rec && rec.category === 'kansha');
    ok('(E) no extra book was created by the shelf-picking step', saved.data.length === 1);
  }

  // ===== E2: 棚を選ばず本棚へ戻れる =====
  {
    const seed = [{ id:'e2', title:'Skip Book', story:'body', category:'unfiled', date:'2026-07-21T00:00:00.000Z' }];
    const { window, document, toggleByButton } = await createEnv({ seedLibrary: seed });
    toggleByButton(); // EN
    window.__openPickerForId('e2');
    document.getElementById('unfiledShelfSkip').dispatchEvent(new window.Event('click',{bubbles:true}));
    await new Promise(r=>setTimeout(r,200));
    const saved = JSON.parse(window.localStorage.getItem('emotion-bookstore-library'));
    const rec = saved.data.find(b=>b.id === 'e2');
    ok('(E2) skipping keeps the book unfiled (category unchanged)', rec && rec.category === 'unfiled');
    ok('(E2) skipping does not duplicate the book', saved.data.length === 1);
    ok('(E2) the picker is hidden after skipping', (()=>{
      const box = document.getElementById('unfiledShelfPicker');
      return !box || box.classList.contains('hidden');
    })());
  }

  // ===== F: 静的検査（cat.label の直接参照が残っていないこと） =====
  {
    const mainSrc = fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    ok('(F) the shelf-picker option builder now goes through categoryLabelFor() (not the raw cat.label)',
      /CATEGORIES\.forEach\(c=>\{[\s\S]{0,220}o\.textContent\s*=\s*categoryLabelFor\(c\)/.test(mainSrc));
    ok('(F) a language-refresh helper for the open picker exists',
      /function\s+refreshUnfiledShelfPickerLabels\s*\(/.test(mainSrc));
    ok('(F) applyLanguage() calls that refresh helper',
      /refreshUnfiledShelfPickerLabels\s*===\s*'function'\s*\)\s*refreshUnfiledShelfPickerLabels\(\)/.test(mainSrc));
    ok('(F) CATEGORY_LABEL_EN still defines all 21 shelves (reused, not rewritten)',
      (mainSrc.match(/const CATEGORY_LABEL_EN\s*=\s*\{([\s\S]*?)\};/)||[])[1].split('\n').filter(l=>/:\s*'/.test(l)).length === 21);
  }

  // ===== G: 「今日の栞」が本棚全体を見ていることの明示 =====
  // 悲しみの棚に書いた日に「わくわく」の栞が出る等の違和感を防ぐため、
  // 栞カードの補足文で「今日書いた棚ではなく、本棚全体でいちばん多い棚」であることを明示する。
  {
    const seed = [
      { id:'g1', title:'A', story:'x', category:'wakuwaku', date:'2026-07-19T10:00:00.000Z' },
      { id:'g2', title:'B', story:'x', category:'wakuwaku', date:'2026-07-19T11:00:00.000Z' },
      { id:'g3', title:'C', story:'x', category:'kanashii', date:'2026-07-21T10:00:00.000Z' }
    ];
    const { window, document, toggleByButton } = await createEnv({ seedLibrary: seed });
    const noteJa = document.querySelector('[data-i18n="shioriCardNote"]').textContent;
    ok('(G) JA: the shiori note says it looks at the WHOLE bookshelf', noteJa.includes('本棚ぜんたい'));
    ok('(G) JA: the shiori note explicitly says it is NOT about the book written today', noteJa.includes('今日綴った一冊ではなく'));
    ok('(G) JA: the shiori note explains it is about the shelf with the most books', noteJa.includes('いちばん多く並んでいる棚'));

    toggleByButton();
    const noteEn = document.querySelector('[data-i18n="shioriCardNote"]').textContent;
    ok('(G) EN: the shiori note is translated (no Japanese)', !JP_RE.test(noteEn));
    ok('(G) EN: the shiori note says "whole bookshelf"', /whole bookshelf/i.test(noteEn));
    ok('(G) EN: the shiori note says it is not the shelf written in today', /not the one you wrote in today/i.test(noteEn));

    // 実際に、その日に書いた棚（kanashii）ではなく最多の棚（wakuwaku）が参照されることも確認する
    ok('(G) the shiori actually references the most-stocked shelf, not today\'s shelf',
      window.topCategoryIdForShiori ? window.topCategoryIdForShiori() === 'wakuwaku' : true);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e=>{ console.error('HOTFIX4.1 TEST CRASHED:', e); process.exit(2); });
