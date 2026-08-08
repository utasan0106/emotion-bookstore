// ============================================================================
// PR-A｜第三頁（店主まながお預かり）インライン改題＋フォーカストラップ 受入テスト
// tests/smoke_test_page3_title_inline_focustrap.js
//
// 検証観点（CEO承認済みタスクブリーフ A〜I）：
//  A) 「今は棚を決めず、本棚へ」の経路が従来どおり・同じクリック数で動作すること。
//  B) 第三頁のカード内でタイトルを直接タイプ・確定できること（頁1/2へは戻らない）。
//  C) 確定直後、プレビュー背表紙のtext/height/tilt/colorがすべて再計算されること
//     （textだけの差し替えではないこと）。
//  D) 本棚到達後、実物の背表紙が第三頁プレビューと一致すること。
//  E) title以外のentryフィールドが一切変化しないこと。
//  F) 保存失敗時、メモリ上のtitleが巻き戻り、保存内容（libraryCache）と常に一致すること。
//  G) 改題操作（開く／やめる／確定／保存失敗）からGA4イベントが新規に発火しないこと。
//  H) 第三頁が開いている間、Tabを繰り返しても背後の頁（desk等）へフォーカスが漏れず、
//     ダイアログ内だけを巡回すること（inert付与・解除の対応も含む）。
//  I) 新規追加した文言がEN表示でも空文字にならないこと（英語モード完全性）。
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
const rawCss = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
const rawMain = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');

function wrap(value){ return JSON.stringify({ v:1, data:value }); }

async function createEnv(opts){
  opts = opts || {};
  let html = rawHtml;
  html = html.replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '');
  html = html.replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');
  const dom = new JSDOM(html, { url:'https://example.com/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true });
  const { window } = dom;
  const { document } = window;
  if(opts.seedLibrary){
    window.localStorage.setItem('emotion-bookstore-library', wrap(opts.seedLibrary));
  }
  window.matchMedia = function(q){ return { matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }; };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.navigator.vibrate = function(){ return true; };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';
  const gaCalls = [];
  window.gtag = function(){ gaCalls.push(Array.from(arguments)); };
  window.fetch = function(){ return Promise.resolve({ ok:true, json: () => Promise.resolve({}) }); };
  // ★jsdomはレイアウトを計算しないため offsetParent は常に null を返す。
  // 本番コードのフォーカス走査（unfiledShelfPickerFocusables 等）は既存の
  // experienceMenuFocusables と同じ「offsetParent !== null」で可視性を判定しているため、
  // 実ブラウザに近い挙動（display:none系・.hidden系だけを不可視とみなす）をテスト側で
  // 再現する。本番コードは一切変更していない（テスト環境の補完のみ）。
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(){
      let el = this;
      while(el){
        if(el.hidden) return null;
        if(el.classList && el.classList.contains('hidden')) return null;
        if(el.style && el.style.display === 'none') return null;
        if(el.hasAttribute && el.hasAttribute('inert')) return null;
        el = el.parentElement;
      }
      return document.body;
    }
  });
  const s1 = document.createElement('script'); s1.textContent = fs.readFileSync(path.join(SRC,'data.js'),'utf-8'); document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = fs.readFileSync(path.join(SRC,'main.js'),'utf-8'); document.body.appendChild(s2);
  const s3 = document.createElement('script');
  s3.textContent = [
    "window.__getLibraryCache = function(){ return libraryCache; };",
    "window.__libEntry = function(id){ return libraryCache.find(function(b){ return b.id === id; }); };",
    "window.__visibleShelfEntries = function(){ return visibleShelfEntries(); };"
  ].join('\n');
  document.body.appendChild(s3);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));
  return { window, document, gaCalls };
}

async function bindUnfiledBook(window, document, story, title){
  window.goToPage('desk');
  document.getElementById('storyInput').value = story;
  document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
  if(title !== undefined){
    document.getElementById('titleInput').value = title;
  }
  document.getElementById('submitStory').click();
  for(let i=0;i<20 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
    await new Promise(r=>setTimeout(r,150));
  }
  await new Promise(r=>setTimeout(r,300));
  const lib = window.__getLibraryCache();
  return lib[lib.length - 1];
}

function normStyle(document, prop, value){
  const scratch = document.createElement('div');
  scratch.style[prop] = value;
  return scratch.style[prop];
}

async function main(){

  // ==========================================================================
  // A. 「今は棚を決めず、本棚へ」経路：クリック数・挙動が従来どおり（改題UIに触れない）
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    const entry = await bindUnfiledBook(window, document, 'スキップ動線の回帰確認用の本文です。', '');
    const box = document.getElementById('unfiledShelfPicker');
    ok('(A) picker is shown after bind', !!box && !box.classList.contains('hidden'));

    const skipBtn = document.getElementById('unfiledShelfSkip');
    ok('(A) skip button exists', !!skipBtn);
    // 改題UIには一切触れず、スキップボタンを1回クリックするだけで完了する。
    skipBtn.click();
    await new Promise(r=>setTimeout(r,150));

    ok('(A) after a single skip click, the picker is hidden', box.classList.contains('hidden'));
    ok('(A) skipping keeps the entry unfiled (unchanged behavior)', window.__libEntry(entry.id).category === 'unfiled');
    const realSpine = document.querySelector('#myShelf .spine[data-entry-id="'+entry.id+'"]');
    ok('(A) the real shelf spine exists after skip', !!realSpine);
  }

  // ==========================================================================
  // B/C/D/E. インライン改題：入力→確定→プレビュー全部再計算→本棚実物と一致、
  // title以外は不変
  // ==========================================================================
  {
    const { window, document, gaCalls } = await createEnv({});
    const entry = await bindUnfiledBook(window, document, 'インライン改題の確認用本文です。', '');
    ok('(B) newly bound entry starts with the untitled fallback title', entry.title === 'まだ、題名のない本');

    const before = Object.assign({}, entry); // story/category/date/id/image/tweetUrl/sealed等の比較用スナップショット

    const trigger = document.getElementById('unfiledTitleEditTrigger');
    ok('(B) the low-emphasis "add a title" trigger is visible by default', !!trigger && !trigger.classList.contains('hidden'));
    ok('(B) default state shows the "add" label for an untitled book', trigger.textContent === '題名をつける');

    const form = document.querySelector('.mana-title-form');
    ok('(B) the inline edit form is NOT open by default', !!form && form.classList.contains('hidden'));

    const gaCountBeforeOpen = gaCalls.length;
    trigger.click();
    ok('(B) clicking the trigger opens the inline form', !form.classList.contains('hidden'));
    ok('(B) clicking the trigger hides the low-emphasis button itself', trigger.classList.contains('hidden'));
    ok('(G) opening the inline editor fires no new GA4 event', gaCalls.length === gaCountBeforeOpen);

    const input = document.getElementById('unfiledTitleInput');
    ok('(B) the input is pre-filled with an empty string for an untitled book', !!input && input.value === '');

    // ---- キャンセル（やめる）：entry.titleは一切変わらない ----
    input.value = 'キャンセルされるはずの題名';
    const cancelBtn = document.getElementById('unfiledTitleCancel');
    const gaCountBeforeCancel = gaCalls.length;
    cancelBtn.click();
    ok('(B) cancel collapses the form back to the trigger', form.classList.contains('hidden') && !trigger.classList.contains('hidden'));
    ok('(B) cancel does not change entry.title', window.__libEntry(entry.id).title === before.title);
    ok('(G) cancelling fires no new GA4 event', gaCalls.length === gaCountBeforeCancel);

    // ---- 再度開いて実際に確定する ----
    trigger.click();
    const previewSpine = document.querySelector('#unfiledShelfPicker .mana-receive-book .spine');
    const beforeHeight = previewSpine.style.height;
    const beforeTilt = previewSpine.style.getPropertyValue('--tilt');
    input.value = '  インライン確定テスト題名  '; // 前後の空白はtrimされる想定
    const confirmBtn = document.getElementById('unfiledTitleConfirm');
    const gaCountBeforeConfirm = gaCalls.length;
    confirmBtn.click();
    await new Promise(r=>setTimeout(r,150));

    ok('(B) confirming updates entry.title (trimmed)', window.__libEntry(entry.id).title === 'インライン確定テスト題名');
    ok('(B) the form collapses back to the trigger after confirm', form.classList.contains('hidden') && !trigger.classList.contains('hidden'));
    ok('(B) the trigger now reads "edit title" since the book has a real title', trigger.textContent === '題名を直す');
    ok('(G) confirming a title fires no new GA4 event', gaCalls.length === gaCountBeforeConfirm);

    // ---- C. プレビューのtext/height/tilt/colorが全部再計算されている ----
    const visIdx = window.__visibleShelfEntries().findIndex(e=>e.id===entry.id);
    const expected = window.computeSpineVisual(window.__libEntry(entry.id), visIdx);
    ok('(C) preview text updates to the new title', previewSpine.textContent === 'インライン確定テスト題名');
    ok('(C) preview background matches a fresh computeSpineVisual() call', previewSpine.style.background === normStyle(document, 'background', expected.background));
    ok('(C) preview color matches a fresh computeSpineVisual() call', previewSpine.style.color === normStyle(document, 'color', expected.color));
    ok('(C) preview textShadow matches a fresh computeSpineVisual() call', previewSpine.style.textShadow === expected.textShadow);
    ok('(C) preview height is recomputed (not just text) and matches computeSpineVisual()', previewSpine.style.height === expected.height);
    ok('(C) preview --tilt is recomputed (not just text) and matches computeSpineVisual()', previewSpine.style.getPropertyValue('--tilt') === expected.tiltDeg);
    // 題名の文字数が変わっているのでheight/tiltが「前と同じ」のままではないはず（式が本当に再実行された証跡）
    ok('(C) height/--tilt actually changed from their pre-edit values (proves a real recompute, not a no-op)',
      (previewSpine.style.height !== beforeHeight) || (previewSpine.style.getPropertyValue('--tilt') !== beforeTilt));

    // ---- E. title以外のフィールドは一切変わっていない ----
    const after = window.__libEntry(entry.id);
    ok('(E) story is unchanged', after.story === before.story);
    ok('(E) category is unchanged (still unfiled, no shelf chosen)', after.category === before.category);
    ok('(E) date is unchanged', after.date === before.date);
    ok('(E) id is unchanged', after.id === before.id);
    ok('(E) image field is unchanged', after.image === before.image);
    ok('(E) tweetUrl is unchanged', after.tweetUrl === before.tweetUrl);
    ok('(E) sealed is unchanged', after.sealed === before.sealed);

    // ---- D. 本棚到達後、実物の背表紙がpage3プレビューと一致する ----
    document.getElementById('unfiledShelfSkip').click();
    await new Promise(r=>setTimeout(r,150));
    const realSpine = document.querySelector('#myShelf .spine[data-entry-id="'+entry.id+'"]');
    ok('(D) the real shelf spine exists after leaving page 3', !!realSpine);
    if(realSpine){
      ok('(D) the real shelf spine shows the edited title', realSpine.textContent === 'インライン確定テスト題名');
      ok('(D) the real shelf spine height matches what page 3 showed', realSpine.style.height === expected.height);
      ok('(D) the real shelf spine --tilt matches what page 3 showed', realSpine.style.getPropertyValue('--tilt') === expected.tiltDeg);
    }
  }

  // ==========================================================================
  // 棚選択後にタイトルを直しても、その後さらに棚を選び直すと「新しい題名」を
  // 使って色だけが再計算される（applyPreviewColorが生きたentry.titleを読むこと）
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    const entry = await bindUnfiledBook(window, document, '棚選択後の改題確認用本文です。', '');
    const select = document.getElementById('unfiledShelfSelect');
    select.value = 'kansha';
    select.dispatchEvent(new window.Event('change', { bubbles:true }));

    document.getElementById('unfiledTitleEditTrigger').click();
    document.getElementById('unfiledTitleInput').value = '棚選択後の新しい題名';
    document.getElementById('unfiledTitleConfirm').click();
    await new Promise(r=>setTimeout(r,150));

    const previewSpine = document.querySelector('#unfiledShelfPicker .mana-receive-book .spine');
    // 題名編集時点で棚は選択済みだったので、確定直後の再計算でも選択中の棚色を維持しているはず
    const idx = window.__visibleShelfEntries().findIndex(e=>e.id===entry.id);
    const expectedWithShelf = window.computeSpineVisual(Object.assign({}, window.__libEntry(entry.id), { category:'kansha' }), idx);
    ok('(11) after editing the title while a shelf is already selected, the preview keeps the selected shelf color',
      previewSpine.style.background === normStyle(document, 'background', expectedWithShelf.background));

    // さらに別の棚へ選び直すと、新しい題名を使ってcolor系だけが再計算される
    select.value = 'kodoku';
    select.dispatchEvent(new window.Event('change', { bubbles:true }));
    const expectedKodoku = window.computeSpineVisual(Object.assign({}, window.__libEntry(entry.id), { category:'kodoku' }), idx);
    ok('(11) re-selecting a shelf after a title edit recolors using the NEW title (applyPreviewColor reads live entry.title)',
      previewSpine.style.background === normStyle(document, 'background', expectedKodoku.background));
    ok('(11) re-selecting a shelf after a title edit keeps the NEW title text (height/tilt formula unaffected)',
      previewSpine.textContent === '棚選択後の新しい題名');
  }

  // ==========================================================================
  // F. 保存失敗：メモリのtitleが巻き戻り、libraryCacheと常に一致する（乖離しない）
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    const entry = await bindUnfiledBook(window, document, '改題保存失敗の確認用本文です。', '見えている元の題名');
    ok('(F) the entry starts with a real, non-fallback title', entry.title === '見えている元の題名');

    document.getElementById('unfiledTitleEditTrigger').click();
    document.getElementById('unfiledTitleInput').value = '保存に失敗するはずの新題名';

    const origSaveJSON = window.saveJSON;
    window.saveJSON = async ()=> false;
    document.getElementById('unfiledTitleConfirm').click();
    await new Promise(r=>setTimeout(r,150));

    const afterFail = window.__libEntry(entry.id);
    ok('(F) in-memory entry.title rolls back to the pre-edit value on save failure', afterFail.title === '見えている元の題名');
    const storedRaw = window.localStorage.getItem('emotion-bookstore-library');
    const storedLib = JSON.parse(storedRaw).data;
    const storedEntry = storedLib.find(e=>e.id===entry.id);
    ok('(F) persisted storage also still has the pre-edit title (memory and storage never diverge)',
      !!storedEntry && storedEntry.title === '見えている元の題名');
    ok('(F) memory and storage titles are identical after the failed save', afterFail.title === storedEntry.title);

    const box = document.getElementById('unfiledShelfPicker');
    ok('(F) the dialog stays open after a save failure (existing behavior preserved)', !box.classList.contains('hidden'));
    const errEl = document.querySelector('#unfiledShelfPicker .mana-receive-error');
    ok('(F) the existing page-3 error area is used to show the failure (no new separate error UI)', !!errEl && !errEl.classList.contains('hidden') && errEl.textContent.length > 0);

    window.saveJSON = origSaveJSON;
  }

  // ==========================================================================
  // H. フォーカストラップ：背後頁がinertになり、Tabがダイアログ内だけを巡回する
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    // 受け取り頁が開く直前まで #desk がアクティブな頁になっている
    const entry = await bindUnfiledBook(window, document, 'フォーカストラップ確認用本文です。', '');
    const desk = document.getElementById('desk');
    ok('(H) the underlying #desk page is made inert while page 3 is open', !!desk && desk.hasAttribute('inert'));
    ok('(H) #desk keeps its is-active class (navigation state itself is untouched)', desk.classList.contains('is-active'));

    const box = document.getElementById('unfiledShelfPicker');
    const focusables = Array.from(box.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'))
      .filter(el => !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null);
    ok('(H) the dialog has at least one focusable element', focusables.length > 0);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // 最後の要素からTabを1回 → 先頭へラップする（背後の#deskへは絶対に出ない）
    last.focus();
    ok('(H) sanity: focus is on the last focusable element inside the dialog', document.activeElement === last);
    const tabEvent = new window.KeyboardEvent('keydown', { key:'Tab', bubbles:true, cancelable:true });
    document.dispatchEvent(tabEvent);
    ok('(H) Tab from the last element wraps to the first element inside the dialog (does not escape)', document.activeElement === first);

    // 先頭要素からShift+Tabを1回 → 末尾へラップする
    first.focus();
    const shiftTabEvent = new window.KeyboardEvent('keydown', { key:'Tab', shiftKey:true, bubbles:true, cancelable:true });
    document.dispatchEvent(shiftTabEvent);
    ok('(H) Shift+Tab from the first element wraps to the last element inside the dialog (does not escape)', document.activeElement === last);

    // 新しく追加された改題UIの要素（トリガー・入力・確定・キャンセル）も、
    // フォーカス可能一覧に自然に含まれていること（固定IDリストのハードコードではないことの確認）
    const ids = focusables.map(el=>el.id).filter(Boolean);
    ok('(H) the title-edit trigger button is included in the dialog\'s focusable set', ids.includes('unfiledTitleEditTrigger'));

    // ダイアログを閉じると、トラップが付与したinertが正確に元通り解除される。
    // ★注意：skipBtn/confirmBtnのハンドラはhideUnfiledShelfPicker()の直後にgoToPage('bookshelf')
    // を呼ぶため、#deskはこの一連の処理の中で「トラップ解除→（今度は通常のページ遷移により
    // 非アクティブ頁として）再度inert化」という2段階を経る。ここではhideUnfiledShelfPicker()を
    // 直接呼び、ページ遷移を挟まずにトラップ解除そのものだけを検証する。
    window.hideUnfiledShelfPicker();
    ok('(H) calling hideUnfiledShelfPicker() directly releases the inert it had set on #desk (no navigation involved)', !desk.hasAttribute('inert'));

    // 通常のページ遷移（goToPage）は、非アクティブになった頁へ改めてinertを付与する。
    // これはこのPRが触れる対象ではない既存のページ切替の仕組みであり、正しい挙動。
    window.goToPage('bookshelf');
    ok('(H) after actually navigating away, #desk is inert again via the ordinary page-navigation mechanism (not a stuck trap)', desk.hasAttribute('inert'));
    const bookshelfPage = document.getElementById('bookshelf');
    ok('(H) #bookshelf, now the active page, is not inert', bookshelfPage && !bookshelfPage.hasAttribute('inert'));
  }

  // 保存失敗経路ではダイアログを閉じないため、フォーカストラップ・inertも解除されないこと
  {
    const { window, document } = await createEnv({});
    await bindUnfiledBook(window, document, '保存失敗時のトラップ維持確認用本文です。', '');
    const desk = document.getElementById('desk');
    ok('(H) #desk is inert while page 3 is open (save-failure sub-case setup)', desk.hasAttribute('inert'));

    window.saveJSON = async ()=> false;
    const select = document.getElementById('unfiledShelfSelect');
    select.value = 'kansha';
    select.dispatchEvent(new window.Event('change', { bubbles:true }));
    document.getElementById('unfiledShelfConfirm').click();
    await new Promise(r=>setTimeout(r,150));

    const box = document.getElementById('unfiledShelfPicker');
    ok('(H) the dialog is still open after a (shelf) save failure', !box.classList.contains('hidden'));
    ok('(H) #desk remains inert after a save failure (trap is not released while the dialog stays open)', desk.hasAttribute('inert'));
  }

  // ==========================================================================
  // I. 英語モードでの文言完全性（新規追加文言が空文字にならない）
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    window.toggleLanguage(); // → EN
    const entry = await bindUnfiledBook(window, document, 'EN mode inline title check.', '');
    const trigger = document.getElementById('unfiledTitleEditTrigger');
    ok('(I) EN mode: the trigger label is the English "Add a title" string', trigger.textContent === 'Add a title');
    trigger.click();
    const input = document.getElementById('unfiledTitleInput');
    ok('(I) EN mode: the input has a non-empty English aria-label', (input.getAttribute('aria-label')||'').length > 0 && input.getAttribute('aria-label') !== '');
    ok('(I) EN mode: the confirm button reads "Use this title"', document.getElementById('unfiledTitleConfirm').textContent === 'Use this title');
    ok('(I) EN mode: the cancel button reads "Cancel"', document.getElementById('unfiledTitleCancel').textContent === 'Cancel');

    input.value = 'A proper English title';
    document.getElementById('unfiledTitleConfirm').click();
    await new Promise(r=>setTimeout(r,150));
    ok('(I) EN mode: after confirming, the trigger switches to "Edit title"', trigger.textContent === 'Edit title');
    ok('(I) EN mode: entry.title was actually updated', window.__libEntry(entry.id).title === 'A proper English title');

    // 言語切替中のラベル追従（refreshUnfiledShelfPickerLabels）
    window.toggleLanguage(); // → JA
    ok('(I) switching back to JA while the picker is open updates the trigger label live', trigger.textContent === '題名を直す');
    window.toggleLanguage(); // → EN（後片付け目的の再切替。以降の断言はしない）
  }

  // ==========================================================================
  // J. Preview-NG追加修正：16文字までの長い題名でも背表紙からテキストがはみ出さないこと
  //    (spineHeightForTitle() の保証: height >= 28 + titleLength*18 (fit-minimum) を、
  //    独立に再構成した定数で検証する。1/9/15/16文字の4ケースを、CEO指定どおり検証する。
  //    9文字は未題本フォールバック「まだ、題名のない本」そのもの。)
  // ==========================================================================
  {
    const SPINE_TEXT_VERTICAL_PADDING_PX = 28;
    const SPINE_CHAR_ADVANCE_PX = 18;
    function fitMinimumFor(titleLength){
      return SPINE_TEXT_VERTICAL_PADDING_PX + titleLength * SPINE_CHAR_ADVANCE_PX;
    }

    ok('(J) sanity: the untitled fallback string is exactly 9 characters (as hardcoded below)',
      'まだ、題名のない本'.length === 9);

    const lengthCases = [
      { length: 1, title: 'あ' },
      { length: 9, title: '' }, // '' -> binds to the untitled fallback "まだ、題名のない本" (9 chars, see sanity check above)
      { length: 15, title: 'あ'.repeat(15) },
      { length: 16, title: 'あ'.repeat(16) } // 16 = maxlength on the title inputs; the worst case this fix must guarantee
    ];

    for(const { length, title } of lengthCases){
      const { window, document } = await createEnv({});
      const entry = await bindUnfiledBook(window, document, `overflow確認用本文 length=${length}`, title);
      ok(`(J) length=${length}: bound entry.title has the expected character count`, entry.title.length === length);

      const previewSpine = document.querySelector('#unfiledShelfPicker .mana-receive-book .spine');
      ok(`(J) length=${length}: page-3 preview spine exists`, !!previewSpine);
      const previewHeightPx = previewSpine ? parseFloat(previewSpine.style.height) : NaN;
      ok(`(J) length=${length}: preview spine height (${previewSpine && previewSpine.style.height}) is >= the guaranteed fit-minimum (${fitMinimumFor(length)}px), so the title is guaranteed to fit`,
        previewHeightPx >= fitMinimumFor(length));

      if(length === 1){
        // 短い題名(length=1)はfitMinimum(46px)が有機的な揺らぎ(152px)を上回らないため、
        // 修正前と完全に同じ高さのはず（短い題名の見た目を変えない、という要件の回帰確認）。
        ok('(J) length=1: preview spine height is byte-identical to the untouched pre-fix organic formula (140+(1%4)*12=152px)',
          previewSpine.style.height === (140 + (1 % 4) * 12) + 'px');
      }

      const previewHeightValue = previewSpine.style.height;
      document.getElementById('unfiledShelfSkip').click();
      await new Promise(r=>setTimeout(r,150));
      const realSpine = document.querySelector('#myShelf .spine[data-entry-id="'+entry.id+'"]');
      ok(`(J) length=${length}: real shelf spine exists after reaching the bookshelf`, !!realSpine);
      if(realSpine){
        ok(`(J) length=${length}: real shelf spine height is identical to what page 3 previewed (preview/shelf visual parity)`,
          realSpine.style.height === previewHeightValue);
      }
    }

    // ========================================================================
    // K. CSS側の .spine max-height が length=16 の fit-minimum を下回らないこと。
    //    JS側の高さ計算が正しくても、CSSの上限キャップで再び切られては意味がない。
    // ========================================================================
    const spineBlockMatch = /\.spine\{([^}]*)\}/.exec(rawCss);
    ok('(K) the base .spine{...} rule (with max-height) is found in style.css', !!spineBlockMatch);
    const maxHeightMatch = spineBlockMatch && /max-height:\s*(\d+)px/.exec(spineBlockMatch[1]);
    ok('(K) .spine has a numeric max-height declared', !!maxHeightMatch);
    const maxHeightPx = maxHeightMatch ? parseInt(maxHeightMatch[1], 10) : NaN;
    const fitMinimumFor16 = fitMinimumFor(16); // 28 + 16*18 = 316
    ok(`(K) .spine max-height (${maxHeightPx}px) is >= the length=16 fit-minimum (${fitMinimumFor16}px), so the CSS cap never re-clips the JS-computed height`,
      maxHeightPx >= fitMinimumFor16);
  }

  // ==========================================================================
  // 静的検査：i18nキー・focus-trap関数・375px幅での折り返し用CSSが存在すること
  // ==========================================================================
  ok('(static) MESSAGES.ja has all new PR-A keys', /manaTitleAddLabel:\s*"題名をつける"/.test(rawMain)
    && /manaTitleEditLabel:\s*"題名を直す"/.test(rawMain)
    && /manaTitleConfirm:\s*"これにする"/.test(rawMain)
    && /manaTitleCancel:\s*"やめる"/.test(rawMain));
  ok('(static) MESSAGES.en has all new PR-A keys', /manaTitleAddLabel:\s*"Add a title"/.test(rawMain)
    && /manaTitleEditLabel:\s*"Edit title"/.test(rawMain)
    && /manaTitleConfirm:\s*"Use this title"/.test(rawMain)
    && /manaTitleCancel:\s*"Cancel"/.test(rawMain));
  ok('(static) no new trackAnalyticsEvent(...) call was added inside the title-edit block', (()=>{
    const start = rawMain.indexOf('titleEditor.appendChild(titleTrigger)');
    const blockStart = rawMain.indexOf('const titleEditor = document.createElement');
    const blockEnd = start > -1 ? start : rawMain.length;
    if(blockStart === -1 || blockEnd === -1) return false;
    const block = rawMain.slice(blockStart, blockEnd);
    return !/trackAnalyticsEvent/.test(block);
  })());
  // ★Preview-NG追加修正：computeSpineVisual()のheight算出は、長い題名の背表紙オーバーフロー
  // 修正のためspineHeightForTitle()経由に変更された（このPRの正当な変更対象そのもの）。
  // background/color/textShadow/tiltDeg/titleの5フィールド構成・他の式は今回も無変更であることを
  // 引き続き白箱で検証する（heightだけ新しいヘルパー呼び出しに変わったことも含めて検証する）。
  ok('(static) computeSpineVisual() still derives all 5 fields from entry/index, with height now routed through spineHeightForTitle() (Preview-NG overflow fix)',
    /function computeSpineVisual\(entry, index\)\{\s*\n\s*return \{\s*\n\s*background: spineGradientFor\(entry\.category, entry\.title\.length \+ index\),\s*\n\s*color: textColorFor\(spineColorFor\(entry\.category\)\),\s*\n\s*textShadow: textShadowFor\(spineColorFor\(entry\.category\)\),\s*\n\s*height: spineHeightForTitle\(entry\.title\.length\) \+ 'px',\s*\n\s*tiltDeg: \(\(\(entry\.title\.length \* 7 \+ index \* 13\) % 5\) - 2\) \+ 'deg',\s*\n\s*title: entry\.title\s*\n\s*\};\s*\n\}/.test(rawMain));
  ok('(static) .mana-title-editor / .mana-title-trigger / .mana-title-form / .mana-title-input CSS classes exist',
    /\.mana-title-editor\{/.test(rawCss) && /\.mana-title-trigger\{/.test(rawCss) && /\.mana-title-form\{/.test(rawCss) && /\.mana-title-input\{/.test(rawCss));
  ok('(static) the title-edit action row wraps instead of overflowing at narrow widths (flex-wrap on .mana-title-form-actions)',
    /\.mana-title-form-actions\{[^}]*flex-wrap:wrap/.test(rawCss));
  ok('(static) .mana-title-input is full-width and border-boxed (no 375px overflow)',
    /\.mana-title-input\{[^}]*width:100%[^}]*box-sizing:border-box/.test(rawCss));
  ok('(static) no Escape-to-close / backdrop-click-to-close was added for #unfiledShelfPicker (front-only-progression preserved)',
    !/unfiledShelfPicker[\s\S]{0,400}Escape/.test(rawMain.slice(rawMain.indexOf('function showUnfiledShelfPicker'), rawMain.indexOf('function showUnfiledShelfPicker') + 6000)));

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('PAGE3 TITLE INLINE / FOCUS TRAP TEST CRASHED:', e); process.exit(2); });
