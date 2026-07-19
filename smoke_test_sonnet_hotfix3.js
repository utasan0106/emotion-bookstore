// Sonnet Hotfix3 受入テスト。
// A) 店内メニュー最下部「↑ メニューの上へ戻る」の夜モード視認性（body.night個別上書きの削除）
// B) moyamoya（名もなき感情）を「重く沈む」から独立の「その他」グループへ分離
// 既存430件（Hotfix1系＋Sonnet監査＋Hotfix2、Hotfix2内section3はHotfix3仕様へ置き換え済み）の
// アサーションは弱体化していない。本ファイルは追加専用。
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
  // ===== A: 「↑ メニューの上へ戻る」ボタンの視認性（夜モードdark-on-darkバグ） =====
  {
    const cssSrc=fs.readFileSync(path.join(SRC,'style.css'),'utf-8');
    const btnRuleMatch=cssSrc.match(/\.menu-back-to-top\{[^}]*\}/);
    ok('(A1) .menu-back-to-top base rule exists in style.css', !!btnRuleMatch);
    const btnRule=btnRuleMatch?btnRuleMatch[0]:'';
    ok('(A1) base rule uses a readable, non-low-contrast border (var(--gold))', /border:\s*1px solid var\(--gold\)/.test(btnRule));
    ok('(A1) base rule uses the day/night auto-inverting text color (var(--ink-soft))', /color:\s*var\(--ink-soft\)/.test(btnRule));
    ok('(A1) base rule keeps a quiet/transparent fill (weaker than a filled primary CTA)', /background:\s*transparent/.test(btnRule));
    ok('(A4) the old body.night rule with dark-on-dark text (color:var(--paper)) is gone',
      !/body\.night\s*\.menu-back-to-top\{[^}]*color:\s*var\(--paper\)/.test(cssSrc));
    ok('(A5) a :hover style exists for the button', /\.menu-back-to-top:hover\{/.test(cssSrc));
    ok('(A5) a :focus-visible style exists for the button', /\.menu-back-to-top:focus-visible\{/.test(cssSrc));
    // 主CTA（.bind-btn、塗りつぶし＋太字）より明確に弱いトーンのままであることの確認（Hotfix2と同じ観点）
    const bindBtnRules = cssSrc.match(/\.bind-btn\{[^}]*\}/g) || [];
    ok('(A) the primary CTA (.bind-btn) still uses a filled background (stays visually stronger)',
      bindBtnRules.some(r=>/background:/.test(r) && !/background:\s*transparent/.test(r)));

    const {window,document}=await createEnv({});
    const btn=document.getElementById('menuBackToTop');
    ok('(A1) the JA label "↑ メニューの上へ戻る" is present in the DOM (day mode)', !!btn && btn.textContent==='↑ メニューの上へ戻る');
    document.body.classList.add('night');
    const btnNight=document.getElementById('menuBackToTop');
    ok('(A1) the same button/id/class still exists after switching to night mode', !!btnNight && btnNight.classList.contains('menu-back-to-top'));
    document.body.classList.remove('night');
  }

  // ===== A2: 英語ラベルの確認 =====
  {
    const {window,document,toggleByButton}=await createEnv({});
    toggleByButton();
    const btn=document.getElementById('menuBackToTop');
    ok('(A2) EN label is not empty', !!btn && btn.textContent.trim().length>0);
    ok('(A2) EN label contains zero Japanese characters', !!btn && !JP_RE.test(btn.textContent));
    ok('(A2) EN label matches the existing translation ("↑ Back to the top")', !!btn && btn.textContent==='↑ Back to the top');
  }

  // ===== A6/A7: クリック時に店内メニューのスクロール領域だけをリセットする =====
  {
    const {window,document}=await createEnv({});
    const card=document.getElementById('experienceMenuCard');
    const btn=document.getElementById('menuBackToTop');
    ok('(A6) both the menu card and the back-to-top button exist', !!card && !!btn);
    if(card && btn){
      Object.defineProperty(card,'scrollTop',{value:0,writable:true});
      card.scrollTop = 480;
      const bodyScrollBefore = document.body.scrollTop;
      const winScrollYBefore = window.scrollY;
      btn.click();
      ok('(A6) clicking resets the menu scroll area (#experienceMenuCard) scrollTop to 0', card.scrollTop===0);
      ok('(A7) the click does not move document.body scroll position', document.body.scrollTop===bodyScrollBefore);
      ok('(A7) the click does not move the window scroll position', window.scrollY===winScrollYBefore);
    }else{
      ok('(A6) clicking resets the menu scroll area (#experienceMenuCard) scrollTop to 0', false);
      ok('(A7) the click does not move document.body scroll position', false);
      ok('(A7) the click does not move the window scroll position', false);
    }
    // ボタンの文言・クリック処理そのものは維持されている（onclickハンドラが存在する）
    ok('(A) the button retains a click handler (behavior unchanged)', typeof btn.onclick === 'function');
  }

  // ===== A8/A9: 天気フラグ・GA4・保存キー/バックアップは不変 =====
  {
    const mainSrc=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    const weatherFlagMatches = mainSrc.match(/WEATHER_FEATURE_ENABLED\s*=\s*(true|false)/g) || [];
    ok('(A8) WEATHER_FEATURE_ENABLED is declared exactly once', weatherFlagMatches.length===1);
    ok('(A8) WEATHER_FEATURE_ENABLED remains false', weatherFlagMatches[0]==='WEATHER_FEATURE_ENABLED = false');
    const allowListMatch = mainSrc.match(/ANALYTICS_ALLOWED_EVENTS\s*=\s*\[([^\]]*)\]/);
    ok('(A9) ANALYTICS_ALLOWED_EVENTS is still declared', !!allowListMatch);
    if(allowListMatch){
      const events = allowListMatch[1].split(',').map(s=>s.trim().replace(/['"]/g,'')).filter(Boolean);
      const expected = ['view_landing','start_writing','create_book_success','create_book_error','view_shelf'];
      ok('(A9) GA4 allow-list is exactly the same existing 5 events (no more, no fewer)',
        events.length===5 && expected.every(e=>events.includes(e)));
    }
    ok('(A9) the library storage key string is unchanged', mainSrc.includes("'emotion-bookstore-library'"));
    ok('(A9) the shiori storage key string is unchanged', mainSrc.includes("'emotion-bookstore-shiori'"));
    ok('(A9) backup download function still present', /function\s+downloadBackup\s*\(/.test(mainSrc));
    ok('(A9) backup restore function still present', /function\s+restoreBackupFromPayload\s*\(/.test(mainSrc));
    ok('(A9) backup payload validation function still present', /function\s+isValidBackupPayload\s*\(/.test(mainSrc));
  }

  // ===== B: moyamoyaの「その他」独立グループ化（データ構造レベルの検証） =====
  {
    const mainSrc=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    const dataSrc=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');
    const tgMatch = mainSrc.match(/const TEXTURE_GROUPS = (\[[\s\S]*?\n\]);/);
    ok('(B) TEXTURE_GROUPS array literal can be located in main.js', !!tgMatch);
    let TEXTURE_GROUPS = [];
    if(tgMatch){ TEXTURE_GROUPS = eval(tgMatch[1]); }
    eval(dataSrc.replace(/const /g,'var '));

    const sinkGroup = TEXTURE_GROUPS.find(g=>g.id==='sink');
    const otherGroup = TEXTURE_GROUPS.find(g=>g.id==='other');
    ok('(B1) the sink ("重く沈む") group no longer contains moyamoya', !!sinkGroup && !sinkGroup.shelves.includes('moyamoya'));
    ok('(B1) the sink group now has 5 shelves', !!sinkGroup && sinkGroup.shelves.length===5);
    ok('(B2) a new independent "other" group exists', !!otherGroup);
    ok('(B2) the "other" group contains only moyamoya', !!otherGroup && otherGroup.shelves.length===1 && otherGroup.shelves[0]==='moyamoya');

    const allShelves = TEXTURE_GROUPS.reduce((acc,g)=>acc.concat(g.shelves),[]);
    ok('(B7/B9) every shelf id across all groups is unique (moyamoya belongs to exactly one group)',
      new Set(allShelves).size === allShelves.length);
    ok('(B8) the total shelf count across all groups is still 21 (no duplicates, no drops)', allShelves.length===21);
    const categoryIds = CATEGORIES.map(c=>c.id).sort();
    ok('(B8) the set of shelf ids across all groups exactly matches CATEGORIES (nothing missing, nothing extra)',
      JSON.stringify(allShelves.slice().sort())===JSON.stringify(categoryIds));
    ok('(B9) internal id "moyamoya" is unchanged in CATEGORIES', CATEGORIES.some(c=>c.id==='moyamoya'));
    ok('(B) CATEGORIES still has exactly 21 shelves', CATEGORIES.length===21);
  }

  // ===== B3: 番台の感情選択・全部見る・棚タブが一貫していることのDOM確認（日本語） =====
  {
    const {window,document}=await createEnv({});
    // 番台
    window.goToPage('counter');
    await new Promise(r=>setTimeout(r,30));
    const rootBtnTexts=[...document.querySelectorAll('#counterShelfGroups .chart-btn')].map(b=>b.textContent);
    ok('(B3) the counter page shows an independent "その他" entry alongside the 4 mood groups', rootBtnTexts.includes('その他'));
    ok('(B4) 「重く沈む」は「名もなき感情」を先に表示しない（棚には表示されない）', !rootBtnTexts.includes('名もなき感情'));
  }

  // ===== B3: 自由対話の感情チップ（renderEmotionChips）でも同じ分類になっていることの確認 =====
  {
    const {window,document}=await createEnv({});
    ok('(B3) renderEmotionChips is available for direct invocation', typeof window.renderEmotionChips === 'function');
    if(typeof window.renderEmotionChips === 'function'){
      const mainSrc=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
      const tgMatch = mainSrc.match(/const TEXTURE_GROUPS = (\[[\s\S]*?\n\]);/);
      const TEXTURE_GROUPS = eval(tgMatch[1]);
      const otherGroup = TEXTURE_GROUPS.find(g=>g.id==='other');
      window.goToPage('counter'); // #chartOptionsが存在するDOM状態にする
      window.renderEmotionChips(otherGroup);
      const chips=[...document.querySelectorAll('#chartOptions .shelf-chip')].map(b=>b.textContent);
      ok('(B3) the free-conversation emotion chips for the "other" group show only moyamoya', chips.length===1 && chips[0]==='名もなき感情');
    }else{
      ok('(B3) the free-conversation emotion chips for the "other" group show only moyamoya', false);
    }
  }

  // ===== B5/B12: 英語モードでの表示確認（その他=Other、名もなき感情=Unnamed Feeling） =====
  {
    const {window,document,toggleByButton}=await createEnv({});
    toggleByButton(); // -> EN
    window.goToPage('counter');
    await new Promise(r=>setTimeout(r,30));
    const rootBtnTexts=[...document.querySelectorAll('#counterShelfGroups .chart-btn')].map(b=>b.textContent);
    ok('(B12) EN mode: the counter page shows "Other" (not "その他") for the new group', rootBtnTexts.includes('Other'));
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const groupLabels=[...document.querySelectorAll('#shelfTabs .shelf-group-label')].map(l=>l.textContent);
    ok('(B12) EN mode: the shelf-page tab bar shows "Other" as the group heading', groupLabels.includes('Other'));
    const otherTabGroup=[...document.querySelectorAll('#shelfTabs .shelf-group')].find(g=>{
      const label=g.querySelector('.shelf-group-label');
      return label && label.textContent==='Other';
    });
    if(otherTabGroup){
      const tab=otherTabGroup.querySelector('.shelf-tab');
      ok('(B12) EN mode: the moyamoya shelf label reads "Unnamed Feeling"', !!tab && tab.textContent==='Unnamed Feeling');
    }else{
      ok('(B12) EN mode: the moyamoya shelf label reads "Unnamed Feeling"', false);
    }
  }

  // ===== B10/B11: 既存moyamoya保存データの互換性・自動選択なしの再確認（回帰の安全網） =====
  {
    const entry={id:'m2',title:'古い一冊２',story:'本文',category:'moyamoya',date:new Date().toISOString(),image:'data:image/png;base64,AAAA'};
    const {window,document}=await createEnv({seedLibrary:[entry]});
    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,80));
    const spines=[...document.querySelectorAll('#myShelf .spine')];
    const mine=spines.find(s=>s.textContent==='古い一冊２');
    ok('(B10) an existing saved entry with category moyamoya (now in the "その他" group) still loads', !!mine);
    ok('(B10) the entry photo field (entry.image) is still respected (has-photo class)', !!mine && mine.classList.contains('has-photo'));

    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(B11) fresh visit still does not auto-select/auto-highlight any shelf tab (including the new "その他" group)',
      !document.querySelector('.shelf-tab.active'));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail>0?1:0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
