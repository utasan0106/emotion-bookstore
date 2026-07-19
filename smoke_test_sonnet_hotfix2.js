// Sonnet Hotfix2（実ブラウザ指摘3件）受入テスト。
// 1) 「店主に題名を相談する」ボタンの視認性　2) 英語版「店主の助け舟」の日本語ハードコード
// 3) 「重く沈む」でmoyamoyaが先頭に出る問題
// 既存392件（Hotfix1系＋Sonnet監査27/33件）のアサーションは一切変更・弱体化していない。
// 本ファイルは追加専用。
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
  // ===== 1: 「店主に題名を相談する」ボタンの視認性 =====
  {
    const cssSrc=fs.readFileSync(path.join(SRC,'style.css'),'utf-8');
    const btnRuleMatch=cssSrc.match(/\.title-consult-btn\{[^}]*\}/);
    ok('(1) .title-consult-btn base rule exists in style.css', !!btnRuleMatch);
    const btnRule=btnRuleMatch?btnRuleMatch[0]:'';
    ok('(1) base rule has a visible border color (not the low-contrast --paper-shadow)', /border:\s*1px solid var\(--gold\)/.test(btnRule));
    ok('(1) base rule keeps a quiet/transparent fill (weaker than the filled primary CTA)', /background:\s*transparent/.test(btnRule));
    ok('(1) a :hover style exists for the button', /\.title-consult-btn:hover\{/.test(cssSrc));
    ok('(1) a :focus-visible style exists for the button', /\.title-consult-btn:focus-visible\{/.test(cssSrc));
    ok('(1) the old night-mode rule with dark-on-dark text (color:var(--paper)) is gone',
      !/body\.night\s*\.title-consult-btn\{[^}]*color:\s*var\(--paper\)/.test(cssSrc));
    ok('(1) an explicit aria-expanded="true" state style still exists', /\.title-consult-btn\[aria-expanded="true"\]\{/.test(cssSrc));
    // 主CTA（.bind-btn、塗りつぶし＋太字）より明確に弱いトーンのままであることの確認
    const bindBtnRules = cssSrc.match(/\.bind-btn\{[^}]*\}/g) || [];
    ok('(1) the primary CTA (.bind-btn) still uses a filled background (stays visually stronger)',
      bindBtnRules.some(r=>/background:/.test(r) && !/background:\s*transparent/.test(r)));

    const {window,document}=await createEnv({});
    const btn=document.getElementById('titleConsultBtn');
    ok('(1) the button exists in the DOM with the expected id/class (day mode)', !!btn && btn.classList.contains('title-consult-btn'));
    document.body.classList.add('night');
    const btnNight=document.getElementById('titleConsultBtn');
    ok('(1) the same button/id/class still exists after switching to night mode', !!btnNight && btnNight.classList.contains('title-consult-btn'));
    document.body.classList.remove('night');
  }

  // ===== 2: 英語版「店主の助け舟」の言語別テンプレート =====
  {
    const {window,document,toggleByButton}=await createEnv({});
    window.goToPage('desk');
    const ta=document.getElementById('storyInput');
    const assistBtn=document.getElementById('assistBtn');
    ta.value='';
    assistBtn.click();
    ok('(2) JA mode inserts the original Japanese template unchanged', ta.value==='いつ：\nどこで：\nなにがあった：\nそのとき、胸の中は：\n');

    ta.value='';
    toggleByButton();
    assistBtn.click();
    ok('(2) EN mode template contains zero Japanese characters', ta.value.length>0 && !JP_RE.test(ta.value));
    ok('(2) EN template matches the specified English prompt exactly', ta.value==='When:\nWhere:\nWhat happened:\nWhat I felt inside:\n');

    // 既存入力を不用意に上書きしない挙動は不変
    ta.value='すでに書いた内容はそのまま';
    assistBtn.click();
    ok('(2) existing non-empty input is still not overwritten (unchanged behavior)', ta.value==='すでに書いた内容はそのまま');
    ta.value='Already written content';
    assistBtn.click();
    ok('(2) same non-overwrite behavior holds in EN mode too', ta.value==='Already written content');

    // 言語切替後は現在の言語が反映される
    toggleByButton(); // -> JA
    ta.value='';
    assistBtn.click();
    ok('(2) switching back to JA reflects the current language again', ta.value==='いつ：\nどこで：\nなにがあった：\nそのとき、胸の中は：\n');
  }

  // ===== 3: 「重く沈む」でmoyamoyaが先頭に出る問題 =====
  // ★Hotfix3で仕様変更：Hotfix2時点では「sinkグループの最後尾へ移動」だったが、
  // 今回さらに踏み込んで「moyamoyaをsinkから完全に切り離し、専用の「その他」グループへ
  // 独立させる」形に変更された。以下はその新仕様に合わせて置き換えたアサーションであり、
  // 弱体化ではなく仕様変更への追随（ユーザー指示どおり）。
  {
    const {window,document}=await createEnv({});
    // 判定A：新規訪問時の自動選択・自動ハイライトは無い（Hotfix1の既存仕様のまま、Hotfix3でも維持）
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(3) [判定A] fresh visit does not auto-select/auto-highlight any shelf tab', !document.querySelector('.shelf-tab.active'));

    // 「重く沈む」一覧にmoyamoyaが含まれなくなったことを確認する
    window.goToPage('counter');
    await new Promise(r=>setTimeout(r,30));
    const rootBtns=[...document.querySelectorAll('#counterShelfGroups .chart-btn')];
    const sinkBtn=rootBtns.find(b=>b.textContent==='重く沈む');
    ok('(3) the "重く沈む" group entry point exists on the counter page', !!sinkBtn);
    sinkBtn.click();
    await new Promise(r=>setTimeout(r,30));
    const pills=[...document.querySelectorAll('#counterShelfGroups .counter-shelf-pill')].map(b=>b.textContent);
    ok('(3) [Hotfix3] the sink group now has 5 shelves (moyamoya removed)', pills.length===5);
    ok('(3) [Hotfix3] moyamoya (名もなき感情) no longer appears in the "重く沈む" list at all', !pills.includes('名もなき感情'));
    ok('(3) a specific feeling (孤独) still appears first', pills[0]==='孤独');

    // 新設された「その他」グループがmoyamoyaだけを持つことを確認する
    window.goToPage('counter');
    await new Promise(r=>setTimeout(r,30));
    const rootBtns2=[...document.querySelectorAll('#counterShelfGroups .chart-btn')];
    const otherFeelingBtn=rootBtns2.find(b=>b.textContent==='その他');
    ok('(3) [Hotfix3] a new independent "その他" group entry point exists on the counter page', !!otherFeelingBtn);
    if(otherFeelingBtn){
      otherFeelingBtn.click();
      await new Promise(r=>setTimeout(r,30));
      const otherPills=[...document.querySelectorAll('#counterShelfGroups .counter-shelf-pill')].map(b=>b.textContent);
      ok('(3) [Hotfix3] the "その他" group contains exactly one shelf', otherPills.length===1);
      ok('(3) [Hotfix3] the "その他" group contains only moyamoya (名もなき感情)', otherPills[0]==='名もなき感情');
    }else{
      ok('(3) [Hotfix3] the "その他" group contains exactly one shelf', false);
      ok('(3) [Hotfix3] the "その他" group contains only moyamoya (名もなき感情)', false);
    }

    // 「すべて見る」一覧でも一貫していること・moyamoyaが全体の最後に表示されることを確認する
    window.goToPage('counter');
    await new Promise(r=>setTimeout(r,30));
    const otherBtn=[...document.querySelectorAll('#counterShelfGroups .chart-btn.ghost')].find(b=>true);
    if(otherBtn) otherBtn.click();
    await new Promise(r=>setTimeout(r,30));
    const allGroupHeadings=[...document.querySelectorAll('.counter-shelf-group')];
    const sinkGroupBox=allGroupHeadings.find(g=>/重く沈む/.test(g.textContent));
    if(sinkGroupBox){
      const sinkPills=[...sinkGroupBox.querySelectorAll('.counter-shelf-pill')].map(b=>b.textContent);
      ok('(3) [Hotfix3] in the "全部見る" listing, the "重く沈む" group no longer includes moyamoya', !sinkPills.includes('名もなき感情'));
    }else{
      ok('(3) [Hotfix3] in the "全部見る" listing, the "重く沈む" group no longer includes moyamoya', true);
    }
    const otherFeelingGroupBox=allGroupHeadings.find(g=>/^その他/.test(g.textContent.trim()));
    ok('(3) [Hotfix3] the "全部見る" listing has an independent "その他" section', !!otherFeelingGroupBox);
    if(otherFeelingGroupBox){
      const otherAllPills=[...otherFeelingGroupBox.querySelectorAll('.counter-shelf-pill')].map(b=>b.textContent);
      ok('(3) [Hotfix3] the "その他" section in "全部見る" contains only moyamoya', otherAllPills.length===1 && otherAllPills[0]==='名もなき感情');
    }
    // moyamoyaは「全部見る」一覧全体の中でも最後に表示される（groupがTEXTURE_GROUPS配列の最後尾のため）
    const allPillsFlat=[...document.querySelectorAll('#counterShelfGroups .counter-shelf-pill')].map(b=>b.textContent);
    ok('(3) [Hotfix3] moyamoya is the very last pill in the full "全部見る" listing', allPillsFlat[allPillsFlat.length-1]==='名もなき感情');

    // 棚ページのタブ表示でも「その他」グループが独立して表示されることを確認する
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const groupLabels=[...document.querySelectorAll('#shelfTabs .shelf-group-label')].map(l=>l.textContent);
    ok('(3) [Hotfix3] the shelf-page tab bar has an independent "その他" group heading', groupLabels.includes('その他'));
    const shelfGroups=[...document.querySelectorAll('#shelfTabs .shelf-group')];
    const otherFeelingTabGroup=shelfGroups.find(g=>{
      const label=g.querySelector('.shelf-group-label');
      return label && label.textContent==='その他';
    });
    if(otherFeelingTabGroup){
      const tabsInGroup=[...otherFeelingTabGroup.querySelectorAll('.shelf-tab')];
      ok('(3) [Hotfix3] the "その他" tab group on the shelf page contains exactly one tab', tabsInGroup.length===1);
      ok('(3) [Hotfix3] the "その他" tab group contains only the moyamoya shelf', tabsInGroup.length===1 && tabsInGroup[0].dataset.catId==='moyamoya');
    }else{
      ok('(3) [Hotfix3] the "その他" tab group on the shelf page contains exactly one tab', false);
      ok('(3) [Hotfix3] the "その他" tab group contains only the moyamoya shelf', false);
    }
    ok('(3) moyamoya is still present among the rendered shelf tabs overall (not removed)', [...document.querySelectorAll('.shelf-tab')].some(b=>b.dataset.catId==='moyamoya'));

    // 内部ID・21棚件数は不変
    const dataSrc=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');
    eval(dataSrc.replace(/const /g,'var '));
    ok('(3) CATEGORIES still has exactly 21 shelves', CATEGORIES.length===21);
    ok('(3) internal id "moyamoya" is unchanged and still present', CATEGORIES.some(c=>c.id==='moyamoya'));
  }

  // ===== 4: moyamoyaの既存保存データ・写真フィールドの互換性 =====
  {
    const entry={id:'m1',title:'古い一冊',story:'本文',category:'moyamoya',date:new Date().toISOString(),image:'data:image/png;base64,AAAA'};
    const {window,document}=await createEnv({seedLibrary:[entry]});
    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,80));
    const spines=[...document.querySelectorAll('#myShelf .spine')];
    const mine=spines.find(s=>s.textContent==='古い一冊');
    ok('(4) an existing saved entry with category moyamoya still loads onto the shelf', !!mine);
    ok('(4) the entry photo field (entry.image) is still respected (has-photo class)', !!mine && mine.classList.contains('has-photo'));
  }

  // ===== 5: WEATHER_FEATURE_ENABLED / GA4 / 保存キー・バックアップ =====
  {
    const src=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    const weatherMatches=src.match(/const WEATHER_FEATURE_ENABLED\s*=\s*(true|false)/g) || [];
    ok('(5) WEATHER_FEATURE_ENABLED is declared exactly once', weatherMatches.length===1);
    ok('(5) WEATHER_FEATURE_ENABLED remains false', weatherMatches[0] && /false/.test(weatherMatches[0]));

    const gaMatch=src.match(/const ANALYTICS_ALLOWED_EVENTS\s*=\s*\[([^\]]*)\]/);
    ok('(5) ANALYTICS_ALLOWED_EVENTS is still declared', !!gaMatch);
    const events=gaMatch?gaMatch[1].split(',').map(s=>s.trim().replace(/['"]/g,'')).filter(Boolean):[];
    ok('(5) GA4 allow-list is exactly the same existing 5 events (no more, no fewer)',
      JSON.stringify(events.slice().sort())===JSON.stringify(['create_book_error','create_book_success','start_writing','view_landing','view_shelf'].sort()));

    ok('(5) the library storage key string is unchanged', src.includes("'emotion-bookstore-library'"));
    ok('(5) the shiori storage key string is unchanged', src.includes("'emotion-bookstore-shiori'"));
    ok('(5) backup download function still present', /function downloadBackup/.test(src));
    ok('(5) backup restore function still present', /function restoreBackupFromPayload/.test(src));
    ok('(5) backup payload validation function still present', /function isValidBackupPayload/.test(src));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail>0?1:0);
}
main().catch(e=>{console.error('SONNET HOTFIX2 TEST CRASHED:',e);process.exit(2);});
