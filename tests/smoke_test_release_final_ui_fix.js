// ============================================================================
// Release Final UI Fix 専用受入テスト（tests/smoke_test_release_final_ui_fix.js）
//
// 対象：Release_Final_UI_Fix_Claude_Instructions.md の要件と、実装中に追加で
//       依頼された3件の修正（① 「この気持ちを手放す」と波線の重なり解消、
//       ② 感情の棚で棚を選択したら詳細へ自動スクロール、③ 「今月の寄り道」
//       見出しの中央寄せとPR表記の独立行化）を機械的に検証する。
//
// §5 3工程の実リンク化 / §6 完成した本の見本 / §7 本の輪郭の補足文 /
// §8 「いつの気持ちか」の削除 / §9 助け舟の一本化 / §12-13 棚の導入文・
// 気ままに巡るボタンの改名 / mid-turn (a)(b)(c) を対象とする。
//
// 既存の smoke_test_desk_flow_fix1.js / smoke_test_editing_room_final_clarity.js /
// smoke_test_visual_rc1.js / smoke_test_content_trust_fix1.js 側は、DOM構造変更に
// 追随する最小限の期待値更新のみ行い（旧仕様の検証を弱めていない）、Release Final
// UI Fixで新規に増えた要件はこの専用ファイルにまとめる。
// ============================================================================
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}

const rawHtml = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
const rawCss  = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
const rawMain = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');

async function createEnv(){
  let html = rawHtml;
  html = html.replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '');
  html = html.replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');
  const dom = new JSDOM(html, { url:'https://example.com/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true });
  const { window } = dom;
  const { document } = window;
  window.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  window.HTMLElement.prototype.scrollIntoView = window.HTMLElement.prototype.scrollIntoView || function(){};
  window.scrollTo = window.scrollTo || function(){};
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'x';
  window.gtag = function(){};
  window.fetch = () => Promise.resolve({ ok:true, json:()=>Promise.resolve({}) });
  Object.defineProperty(window.navigator, 'clipboard', { value:{ writeText:()=>Promise.resolve() }, configurable:true });
  const s1 = document.createElement('script'); s1.textContent = fs.readFileSync(path.join(SRC,'data.js'),'utf-8'); document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = rawMain; document.body.appendChild(s2);
  await new Promise(r=>setTimeout(r,300)); await new Promise(r=>setTimeout(r,300));
  return { window, document };
}

async function main(){

  // ============================================================
  // §5. 3工程の道しるべを実際のリンクにする
  // ============================================================
  {
    const { window, document } = await createEnv();
    const ol = document.querySelector('.desk-steps-overview');
    ok('(S5a) .desk-steps-overview に aria-hidden が付いていない（実リンク化に伴い撤去）',
       ol && !ol.hasAttribute('aria-hidden'));
    const links = Array.from(document.querySelectorAll('.desk-steps-overview li a'));
    ok('(S5b) 3つの<a>リンクが存在する', links.length === 3);
    ok('(S5c) 1つ目のリンク先が #book-outline', links[0] && links[0].getAttribute('href') === '#book-outline');
    ok('(S5d) 2つ目のリンク先が #write-words', links[1] && links[1].getAttribute('href') === '#write-words');
    ok('(S5e) 3つ目のリンク先が #leave-book', links[2] && links[2].getAttribute('href') === '#leave-book');
    ok('(S5f) #book-outline を持つ要素が実在する', !!document.getElementById('book-outline'));
    ok('(S5g) #write-words を持つ要素が実在する', !!document.getElementById('write-words'));
    ok('(S5h) #leave-book を持つ要素が実在する', !!document.getElementById('leave-book'));
    ok('(S5i) #book-outline は本の輪郭の区画(.desk-step-1)そのもの',
       document.getElementById('book-outline').classList.contains('desk-step-1'));
    ok('(S5j) #write-words は言葉を綴るの区画(.desk-step-2)そのもの',
       document.getElementById('write-words').classList.contains('desk-step-2'));
    ok('(S5k) #leave-book は一冊にして預けるの区画(.desk-step-3)そのもの',
       document.getElementById('leave-book').classList.contains('desk-step-3'));
    ok('(S5l) リンクにフォーカス可視スタイル(:focus-visible)が定義されている',
       /\.desk-steps-overview li a:focus-visible\{[^}]*outline/.test(rawCss));
    ok('(S5m) タップ領域として44px以上のmin-heightが指定されている',
       /\.desk-steps-overview li a\{[^}]*min-height\s*:\s*44px/.test(rawCss));
    ok('(S5n) CSSのorderプロパティ等で見た目の並びだけを変えていない（DOM順=画面順のまま）',
       !/\.desk-steps-overview[^{]*\{[^}]*order\s*:/.test(rawCss));
  }

  // ============================================================
  // §6. 完成した本の見本（既定は閉じている・閲覧専用・固定データのみ）
  // ============================================================
  {
    const { window, document } = await createEnv();
    const intro = document.querySelector('.desk-sample-intro');
    const details = document.getElementById('deskSampleDetails');
    ok('(S6a) 常時表示の導入文「一冊になると、こうなります。」が存在する',
       !!intro && intro.textContent.includes('一冊になると'));
    ok('(S6b) 見本のdetailsが存在する', !!details && details.tagName === 'DETAILS');
    ok('(S6c) 見本は既定で閉じている（open属性なし）', !details.hasAttribute('open'));
    ok('(S6d) summaryに「できあがりの見本を見る」がある',
       details.querySelector('summary') && details.querySelector('summary').textContent.includes('できあがりの見本'));
    const sampleBook = details.querySelector('.desk-sample-book');
    ok('(S6e) サンプル本文・タイトル・棚・日付の静的表示がある', !!sampleBook);
    ok('(S6f) サンプルタイトルが既存の固定サンプル文言(sampleBookTitle)と一致する',
       sampleBook.querySelector('.desk-sample-title').textContent === '雨上がりの帰り道');
    ok('(S6g) サンプル本文が既存の固定サンプル文言(sampleBookStory)の書き出しと一致する',
       sampleBook.querySelector('.desk-sample-story').textContent.startsWith('傘を閉じたら'));
    ok('(S6h) 編集・削除・共有ボタンを持たない（閲覧専用）',
       !details.querySelector('button, [contenteditable], .photo-remove, .inv-close'));
    ok('(S6i) 見本ブロックの内側に#titleInput等、本物の入力欄が含まれていない',
       !details.querySelector('#titleInput, #storyInput, #categorySelect'));
    // 開閉してもlocalStorageへ何も書き込まない
    const before = JSON.stringify(window.localStorage);
    details.setAttribute('open', '');
    details.removeAttribute('open');
    const after = JSON.stringify(window.localStorage);
    ok('(S6j) 見本の開閉でlocalStorageの内容が変化しない（保存されない・閲覧専用）', before === after);
    ok('(S6k) 見本ブロックはタイトル入力欄より前、3工程案内の直後にある',
       (() => {
         const stepsOl = document.querySelector('.desk-steps-overview');
         const titleField = document.querySelector('.field-title-primary');
         if(!stepsOl || !details || !titleField) return false;
         const pos1 = stepsOl.compareDocumentPosition(details);
         const pos2 = details.compareDocumentPosition(titleField);
         return !!(pos1 & window.Node.DOCUMENT_POSITION_FOLLOWING) && !!(pos2 & window.Node.DOCUMENT_POSITION_FOLLOWING);
       })());
  }

  // ============================================================
  // §7. 本の輪郭：タイトルのみを主役にし、補足文を更新する
  // ============================================================
  {
    const { window, document } = await createEnv();
    const lead = document.querySelector('#desk .desk-step-1 .vr-stage-lead');
    ok('(S7a) JA補足文が「タイトルは空欄でも、一冊にできます。」に更新されている',
       lead && lead.textContent === 'タイトルは空欄でも、一冊にできます。');
    ok('(S7b) 旧文言「タイトルと、いつの気持ちかは、決めなくても一冊にできます。」が残っていない',
       !rawHtml.includes('タイトルと、いつの気持ちかは、決めなくても一冊にできます。') &&
       !rawMain.includes('タイトルと、いつの気持ちかは、決めなくても一冊にできます。'));
    window.toggleLanguage();
    const leadEn = document.querySelector('#desk .desk-step-1 .vr-stage-lead').textContent;
    ok('(S7c) EN補足文が更新されている', leadEn === 'You can make a book without choosing a title.');
    window.toggleLanguage();
    ok('(S7d) 店主に題名を相談するボタン(#titleConsultBtn)は維持されている', !!document.getElementById('titleConsultBtn'));
  }

  // ============================================================
  // §8. 「いつの気持ちか」を利用者向け画面から外す
  // ============================================================
  {
    const { window, document } = await createEnv();
    ok('(S8a) #whenSelect がDOMに存在しない', !document.getElementById('whenSelect'));
    ok('(S8b) 「いつの気持ちですか」ラベルが編集室のDOM表示テキストに現れない',
       !document.getElementById('desk').textContent.includes('いつの気持ちですか'));
    ok('(S8c) 新しい自由入力の日付欄を追加していない（type="date"等が増えていない）',
       !document.querySelector('#desk input[type="date"], #desk input[type="datetime-local"]'));
    // 製本しても壊れない（既存の要素なしガードで安全に動く）
    document.getElementById('storyInput').value = 'いつの気持ちか欄が無くても製本できるかの確認用本文。';
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    document.getElementById('submitStory').click();
    for(let i=0;i<20 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
      await new Promise(r=>setTimeout(r,150));
    }
    await new Promise(r=>setTimeout(r,300));
    const raw = window.localStorage.getItem('emotion-bookstore-library');
    ok('(S8d) #whenSelect が無くても製本キーへ保存される', !!raw);
  }

  // ============================================================
  // §9. 店主の助け舟を一つの入口へ統合する
  // ============================================================
  {
    const { window, document } = await createEnv();
    const boat = document.getElementById('writingBoat');
    const detailsEls = boat.querySelectorAll('details');
    ok('(S9a) 助け舟のdetailsが1つだけになっている（boat-hint/boat-aboutの二重構造を解消）',
       detailsEls.length === 1);
    ok('(S9b) 残った唯一のdetailsがboat-hintクラスを持つ', detailsEls[0].classList.contains('boat-hint'));
    ok('(S9c) .boat-about は指示どおりDOMに存在しない', !boat.querySelector('.boat-about'));
    const intro = document.querySelector('.boat-intro-heading');
    ok('(S9d) 常時表示の導入文が「書き出しに迷ったら」になっている', intro && intro.textContent === '書き出しに迷ったら');
    const summary = detailsEls[0].querySelector('summary');
    ok('(S9e) summaryが「店主の助け舟を開く」になっている', summary && summary.textContent === '店主の助け舟を開く');
    ok('(S9f) 既定で閉じている（open属性なし）', !detailsEls[0].hasAttribute('open'));
    ok('(S9g) 内容に既存の問い一覧(#writingBoatList)が含まれる', !!detailsEls[0].querySelector('#writingBoatList'));
    ok('(S9h) 説明文・問い・締めの注記が同じアコーディオン内に統合されている',
       detailsEls[0].querySelector('.boat-about-body') && detailsEls[0].querySelector('.writing-boat-note'));
    ok('(S9i) 旧ラベル「書き出しのヒントを見る」が残っていない',
       !rawHtml.includes('書き出しのヒントを見る') && !rawMain.includes('書き出しのヒントを見る'));
    ok('(S9j) 旧ラベル「店主の助け舟とは」が残っていない',
       !rawHtml.includes('店主の助け舟とは') && !rawMain.includes('店主の助け舟とは'));
    ok('(S9j2) 対応する未使用キー boatAboutSummary も main.js から削除されている', !rawMain.includes('boatAboutSummary'));
  }

  // ============================================================
  // §12-13. 感情の棚：導入文の統一と「気ままに巡る」ボタンの改名
  // ============================================================
  {
    const { window, document } = await createEnv();
    const sub = document.querySelector('#shelves .section-sub');
    ok('(S12a) 導入文が「気になる棚から、そっとのぞいてみてください。」になっている',
       sub && sub.textContent === '気になる棚から、そっとのぞいてみてください。');
    ok('(S12b) 旧文言「棚を選んでも、あてもなく巡っても。」が残っていない',
       !rawHtml.includes('棚を選んでも、あてもなく巡っても。') && !rawMain.includes('棚を選んでも、あてもなく巡っても。'));
    ok('(S12c) 旧文言「気持ちのかたちから、棚をのぞいてみます。」が残っていない',
       !rawMain.includes('気持ちのかたちから、棚をのぞいてみます。'));
    ok('(S12d) 旧文言「気の向くままに、めぐってみてください。」が残っていない',
       !rawMain.includes('気の向くままに、めぐってみてください。'));

    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const wanderBtn = document.querySelector('.wander-btn');
    ok('(S13a) ランダム棚ボタンが存在する', !!wanderBtn);
    ok('(S13b) ボタン文言が「店主に一棚選んでもらう」に改名されている',
       wanderBtn && wanderBtn.textContent === '店主に一棚選んでもらう');
    ok('(S13c) 旧文言「気の向くままに巡る」が残っていない',
       !rawMain.includes('気の向くままに巡る'));
    window.toggleLanguage();
    const wanderBtnEn = document.querySelector('.wander-btn');
    ok('(S13d) EN文言が「Let the shopkeeper choose a shelf」になっている',
       wanderBtnEn && wanderBtnEn.textContent === 'Let the shopkeeper choose a shelf');
    window.toggleLanguage();
    ok('(S13e) ボタンは全棚カードの直後・棚詳細の直前（#shelfTabs内の最後）に位置する',
       (() => {
         const tabs = document.getElementById('shelfTabs');
         const displayEl = document.getElementById('shelfDisplay');
         if(!tabs || !displayEl) return false;
         const lastChildOfTabs = tabs.lastElementChild;
         const wanderInTabs = lastChildOfTabs && lastChildOfTabs.querySelector('.wander-btn');
         const tabsBeforeDisplay = !!(tabs.compareDocumentPosition(displayEl) & window.Node.DOCUMENT_POSITION_FOLLOWING);
         return !!wanderInTabs && tabsBeforeDisplay;
       })());
  }

  // ============================================================
  // mid-turn (a). 「この気持ちを手放す」と波線の重なり解消
  // ============================================================
  {
    ok('(MTa1) body.experience-open .purify-trigger に margin-bottom が追加されている',
       /body\.experience-open \.purify-trigger\{[^}]*margin-bottom/.test(rawCss));
    ok('(MTa2) body.experience-open .recommend-section の border-top が none に上書きされている',
       /body\.experience-open \.recommend-section\{[^}]*border-top\s*:\s*none/.test(rawCss));
    ok('(MTa3) 波線そのものの由来（旧.recommend-sectionのborder-top:dashed）は残したまま、' +
       '実運用スコープ(body.experience-open)でだけ無効化している（他画面での再利用に影響しない）',
       /\.recommend-section\{\s*border-top\s*:\s*1px dashed var\(--paper-shadow\);\s*\}/.test(rawCss));
  }

  // ============================================================
  // mid-turn (b). 感情の棚：棚を選択したら詳細へすぐスクロール
  // ============================================================
  {
    const { window, document } = await createEnv();
    ok('(MTb1) main.jsにscrollToShelfDetail関数が定義されている',
       /function scrollToShelfDetail\(\)/.test(rawMain));
    ok('(MTb2) 棚タブのクリックハンドラからscrollToShelfDetailが呼ばれている',
       /renderShelfDisplay\(\);\s*\n\s*scrollToShelfDetail\(\);\s*\n\s*\};/.test(rawMain));
    ok('(MTb3) 「店主に一棚選んでもらう」ボタンのハンドラからも呼ばれている',
       (rawMain.match(/scrollToShelfDetail\(\);/g) || []).length >= 3);
    ok('(MTb4) スワイプ操作(navigateShelfBySwipe)からも呼ばれている',
       /function navigateShelfBySwipe[\s\S]*?scrollToShelfDetail\(\);[\s\S]*?\n\}/.test(rawMain));
    ok('(MTb5) prefs.motion（動きを減らす設定）を尊重している',
       /scrollIntoView\(\{behavior: prefs\.motion \? 'smooth' : 'auto', block:'start'\}\)/.test(rawMain));

    // 初期表示（棚を自分で選ぶ前）では、まだ何も自動選択・自動強調されていないという
    // 既存の保証（smoke_test_sonnet_hotfix2.jsの判定Aと同趣旨）を壊していないことを確認する。
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    ok('(MTb6) 初回表示では棚タブが自動選択されない（既存の不変条件を壊していない）',
       !document.querySelector('.shelf-tab.active'));

    // 実際に棚タブをクリックすると#shelfDisplayへスクロールを試みる（jsdomではscrollIntoViewは
    // 実描画を伴わないため「呼ばれたかどうか」をモックして確認する）。
    let scrollCalled = false;
    const displayEl = document.getElementById('shelfDisplay');
    const origScrollIntoView = displayEl.scrollIntoView;
    displayEl.scrollIntoView = function(){ scrollCalled = true; };
    const firstTab = document.querySelector('#shelfTabs .shelf-tab');
    if(firstTab) firstTab.click();
    ok('(MTb7) 棚タブを実際にクリックすると#shelfDisplay.scrollIntoViewが呼ばれる', scrollCalled === true);
    displayEl.scrollIntoView = origScrollIntoView;
  }

  // ============================================================
  // mid-turn (c). 「今月の寄り道」見出しの中央寄せとPR表記の独立行化
  // ============================================================
  {
    ok('(MTc1) renderDetourFallbackのテンプレートがheadingとPR表記を別の<p>に分けている',
       /<p class="detour-heading">\$\{escapeHtml\(t\('detourHeading'\)\)\}<span class="detour-half-note">[\s\S]*?<\/p>\s*\n\s*<p class="detour-pr">\$\{escapeHtml\(t\('detourPrNote'\)\)\}<\/p>/.test(rawMain));
    ok('(MTc2) detour-heading内にはもうdetour-prのspanが同居していない',
       !/<p class="detour-heading">[\s\S]{0,200}<span class="detour-pr">/.test(rawMain));
    ok('(MTc3) body.experience-open で.detour-headingが中央寄せされている',
       /body\.experience-open \.detour-section \.detour-heading\{[^}]*text-align\s*:\s*center/.test(rawCss));
    ok('(MTc4) body.experience-open で.detour-half-noteが中央寄せされている',
       /body\.experience-open \.detour-half-note\{[^}]*text-align\s*:\s*center/.test(rawCss));
    ok('(MTc5) body.experience-open で.detour-prが独立したブロック行として中央寄せされている',
       /body\.experience-open \.detour-pr\{[^}]*display\s*:\s*block[^}]*text-align\s*:\s*center/.test(rawCss));
    ok('(MTc6) PR表記の文言・rel属性は変更していない（既存の[PR・広告リンクを含みます]のまま）',
       rawMain.includes('detourPrNote: "［PR・広告リンクを含みます］"') &&
       /rel="noopener sponsored"/.test(rawMain));
  }

  // ============================================================
  // 全体：構文・回帰の健全性
  // ============================================================
  {
    ok('(G1) main.js / data.js / sw.js の構文チェックがPASS', (() => {
      const { execSync } = require('child_process');
      try{
        execSync(`node --check "${path.join(SRC, 'main.js')}"`);
        execSync(`node --check "${path.join(SRC, 'data.js')}"`);
        execSync(`node --check "${path.join(SRC, 'sw.js')}"`);
        return true;
      }catch(e){ return false; }
    })());
    ok('(G2) 感情の棚のGA4イベント送信回数（trackAnalyticsEvent呼び出し）を今回増やしていない（10件のまま）',
       (rawMain.match(/trackAnalyticsEvent\(/g) || []).length === 10);
    // ★content_trust_fix1.jsの(21)と同一の正規表現・同一の基準値(39)を用いる
    ok('(G3) 保存キー文字列(\'emotion-bookstore-*\')の出現数を今回変更していない',
       (rawMain.match(/'emotion-bookstore-[a-zA-Z-]*'/g) || []).length === 39);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('RELEASE FINAL UI FIX TEST CRASHED:', e); process.exit(2); });
