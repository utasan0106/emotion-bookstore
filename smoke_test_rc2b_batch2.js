// 「最新版ReleaseCandidate2b」への9項目追加修正の検証テスト。
// 1.本棚の年月グループ化 2.番台の相談導線 3.原稿に戻る/改題 4.製本後の棚を巡る導線
// 5.表紙の言語切替常時表示 6.今月の寄り道モバイルスワイプ 7.退店メッセージ
// 8.背表紙詳細/栞コントラスト 9.旧チャット完全非表示+助け舟
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..'); // ★成果物内で再実行可能な相対パス（tests/の親＝ソース直下）
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}

async function main(){
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
  html = html.replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '');
  html = html.replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');

  const dom = new JSDOM(html, {
    url: 'https://example.com/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });
  const { window } = dom;
  const { document } = window;

  const store = {};
  window.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k,v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
  window.matchMedia = function(q){
    return { matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} };
  };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.navigator.vibrate = function(){ return true; };
  let gaCalls = [];
  window.gtag = function(...args){ gaCalls.push(args); };
  window.fetch = function(){ return Promise.resolve({ ok:true, json: () => Promise.resolve([]) }); };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';

  const dataSrc = fs.readFileSync(path.join(SRC, 'data.js'), 'utf-8');
  const mainSrc = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');
  const s1 = document.createElement('script'); s1.textContent = dataSrc; document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = mainSrc; document.body.appendChild(s2);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));

  const cssText = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');

  // ★main.jsのlibraryCacheはlet宣言のトップレベル変数のため、window.libraryCacheとしては
  // 露出しない。同じ<script>実行コンテキストへ追加のscriptタグを注入し、その中で直接操作する。
  function runInPageScope(code){
    const s = document.createElement('script');
    s.textContent = code;
    document.body.appendChild(s);
  }

  // ============================================================
  // 項目1：本棚の年月グループ化
  // ============================================================
  runInPageScope(`
    libraryCache.push({ id:'b1', title:'五月の本', story:'s', category:'natsukashii', date:'2026-05-10T10:00:00.000Z' });
    libraryCache.push({ id:'b2', title:'七月の本', story:'s', category:'ureshii', date:'2026-07-15T10:00:00.000Z' });
    renderShelf();
  `);
  const headings = Array.from(document.querySelectorAll('#myShelf .shelf-month-heading')).map(h=>h.textContent);
  ok('renderShelf() inserts .shelf-month-heading elements', headings.length >= 2);
  ok('month heading text matches "YYYY年M月の棚" pattern (ja)', headings.some(h=>/^\d{4}年\d{1,2}月の棚$/.test(h)));
  ok('2026年7月の棚 heading is present for the July entry', headings.includes('2026年7月の棚'));
  ok('2026年5月の棚 heading is present for the May entry', headings.includes('2026年5月の棚'));

  // ============================================================
  // 項目2：番台の名称変更＋「まだ言葉にならない方へ」導線
  // ============================================================
  const sectionHead1 = document.querySelector('#counter .section-head h2');
  ok('#counter heading is renamed to 店主と棚を相談する', sectionHead1 && sectionHead1.textContent === '店主と棚を相談する');
  const shelvesPrompt = document.querySelector('#shelves .section-return-prompt');
  const deskPrompt = document.querySelector('#desk .section-return-prompt');
  const bookshelfPrompt = document.querySelector('#bookshelf .section-return-prompt');
  ok('#shelves has the pre-bandai prompt block', !!shelvesPrompt);
  ok('#desk has the pre-bandai prompt block', !!deskPrompt);
  ok('#bookshelf does NOT have the pre-bandai prompt block (item 4 changes its button)', !bookshelfPrompt);
  ok('prompt heading text is correct', shelvesPrompt && shelvesPrompt.querySelector('strong').textContent === 'まだ言葉にならない方へ');
  ok('prompt description text is correct', shelvesPrompt && shelvesPrompt.querySelector('span').textContent === '店主と、しまう棚を相談する');
  const shelvesBandai = document.querySelector('#shelves .back-to-bandai');
  ok('#shelves back-to-bandai text is 店主と棚を相談する (with arrow)', shelvesBandai && shelvesBandai.textContent === '⤴ 店主と棚を相談する');

  // ============================================================
  // 項目3：原稿に戻る／タイトル・本文を書き直す
  // ============================================================
  ok('t("curateBackToDraft") resolves to 原稿に戻る', window.t('curateBackToDraft') === '原稿に戻る');
  ok('main.js references curateBackToDraft inside the shelf-suggestion curate box', mainSrc.includes("t('curateBackToDraft')"));

  const editEntry = { id:'edit1', title:'まだ、題名のない本', story:'元の本文', category:'ureshii', date:new Date().toISOString() };
  window.__testEditEntry = editEntry;
  runInPageScope('libraryCache.push(window.__testEditEntry);');
  window.openBook(editEntry);
  const modalTitle = document.getElementById('modalTitle');
  const modalEditBtn = document.getElementById('modalEdit');
  ok('#modalEdit (タイトル・本文を書き直す) button exists', !!modalEditBtn && modalEditBtn.textContent === 'タイトル・本文を書き直す');
  modalEditBtn.onclick();
  const titleInput = document.getElementById('modalEditTitleInput');
  const storyInput = document.getElementById('modalEditStoryInput');
  ok('edit mode reveals the title input and hides the display title', !titleInput.classList.contains('hidden') && modalTitle.classList.contains('hidden'));
  ok('edit mode pre-fills the current title (including the untitled fallback)', titleInput.value === 'まだ、題名のない本');
  titleInput.value = '書き直した題名';
  storyInput.value = '書き直した本文です。';
  const saveBtn = document.getElementById('modalEditSave');
  await saveBtn.onclick();
  ok('saving updates entry.title', editEntry.title === '書き直した題名');
  ok('saving updates entry.story', editEntry.story === '書き直した本文です。');
  ok('saving updates the visible #modalTitle text', modalTitle.textContent === '書き直した題名');
  ok('saving returns to view mode (edit inputs hidden again)', titleInput.classList.contains('hidden'));
  // DataRepository.set()は{ v: STORAGE_VERSION, data: value }の形で保存する。
  const savedRaw = JSON.parse(window.localStorage.getItem('emotion-bookstore-library'));
  const savedLib = (savedRaw && typeof savedRaw === 'object' && 'data' in savedRaw) ? savedRaw.data : savedRaw;
  const savedEditEntry = Array.isArray(savedLib) ? savedLib.find(e=>e.id==='edit1') : null;
  ok('the rewritten title/story were persisted to localStorage', savedEditEntry && savedEditEntry.title === '書き直した題名' && savedEditEntry.story === '書き直した本文です。');

  // ============================================================
  // 項目4：製本後は番台ではなく感情の棚へ
  // ============================================================
  const bookshelfBandai = document.querySelector('#bookshelf .back-to-bandai');
  ok('#bookshelf return button reads いろいろな棚を巡る', bookshelfBandai && bookshelfBandai.textContent === 'いろいろな棚を巡る');
  ok('#bookshelf return button navigates to shelves, not counter', bookshelfBandai && bookshelfBandai.getAttribute('onclick') === "goToPage('shelves')");

  // ============================================================
  // 項目5：表紙の常時表示言語切替
  // ============================================================
  const heroLangBtn = document.getElementById('heroLangToggle');
  ok('#heroLangToggle exists inside .entrance.hero', !!heroLangBtn && heroLangBtn.closest('.entrance.hero') !== null);
  ok('#heroLangToggle shows both 日本語 and English', heroLangBtn && heroLangBtn.textContent.includes('日本語') && heroLangBtn.textContent.includes('English'));
  const langBeforeToggle = window.currentLang();
  heroLangBtn.onclick();
  ok('clicking #heroLangToggle toggles the app language', window.currentLang() !== langBeforeToggle);
  heroLangBtn.onclick(); // toggle back to ja for the rest of the JA-mode assertions below
  ok('language toggled back to the original', window.currentLang() === langBeforeToggle);

  // ============================================================
  // 項目6：今月の寄り道のモバイルスワイプ／scroll-snap
  // ============================================================
  ok('style.css defines a mobile @media rule that makes .detour-cards a row', /@media \(max-width:480px\)\{[^}]*\.detour-cards\{[^}]*flex-direction:row/s.test(cssText));
  ok('style.css mobile .detour-cards uses scroll-snap-type:x', /@media \(max-width:480px\)[\s\S]*?scroll-snap-type:x/.test(cssText));
  ok('style.css mobile rule sets scroll-snap-align:center on .detour-card', /@media \(max-width:480px\)[\s\S]*?scroll-snap-align:center/.test(cssText));
  ok('desktop .detour-cards alley rule (column direction) is untouched', /\.detour-cards\{\s*position:relative;\s*display:flex;\s*flex-direction:column/.test(cssText));

  // ============================================================
  // 項目7：「お店を出る」のお礼メッセージ
  // ============================================================
  ok('typeof exitShopWithFarewell is function', typeof window.exitShopWithFarewell === 'function');
  const bodyBefore = document.body.classList.contains('experience-open');
  document.body.classList.add('experience-open');
  let toastSeen = false;
  const origShowToast = window.showToast;
  window.showToast = function(msg){ if(msg === window.t('exitFarewellMsg')) toastSeen = true; return origShowToast.apply(this, arguments); };
  window.exitShopWithFarewell();
  ok('exitShopWithFarewell() shows the farewell toast message', toastSeen);
  ok('exitShopWithFarewell() does not return to cover synchronously (message shows first)', document.body.classList.contains('experience-open'));
  await new Promise(r=>setTimeout(r, 1500));
  ok('exitShopWithFarewell() eventually calls returnToCover()', !document.body.classList.contains('experience-open'));
  window.showToast = origShowToast;
  if(!bodyBefore) document.body.classList.remove('experience-open');

  // ============================================================
  // 項目8：背表紙詳細・栞コメントのコントラスト
  // ============================================================
  ok('.modal-card uses a fixed dark background (not var(--paper))', /\.modal-card\{[^}]*background:rgba\(30,24,18/.test(cssText));
  ok('.modal-card h3 uses fixed cream text', /\.modal-card h3\{[^}]*color:#F5EAD2/.test(cssText));
  ok('.modal-story uses fixed cream text', /\.modal-story\{[^}]*color:#F5EAD2/.test(cssText));
  ok('.shiori-slip uses a fixed dark background (not #fff9ec)', /\.shiori-slip\{[^}]*background:rgba\(30,24,18/.test(cssText));
  ok('.shiori-slip uses fixed cream text', /\.shiori-slip\{[^}]*color:#F5EAD2/.test(cssText));

  // ============================================================
  // 項目9：旧チャットの完全非表示＋助け舟
  // ============================================================
  const chatInputRow = document.querySelector('.chat-input-row');
  ok('.chat-input-row carries the .hidden class (fixes the [hidden]-override bug)', chatInputRow && chatInputRow.classList.contains('hidden'));
  ok('style.css .chat-input-row still sets display:flex (confirms the bug would exist without .hidden)', /\.chat-input-row\{[^}]*display:flex/.test(cssText));
  ok('.hidden class is !important in style.css (so it reliably wins the cascade)', /\.hidden\{[^}]*display:none\s*!important/.test(cssText));

  window.goToPage('desk');
  const boatItems = Array.from(document.querySelectorAll('#writingBoatList li')).map(li=>li.textContent);
  ok('#writingBoatList renders 2 prompts on a direct desk visit (default set)', boatItems.length === 2);
  ok('default prompts match WRITING_PROMPTS_DEFAULT.ja', boatItems[0] === 'いつ、どこで、何がありましたか。');

  // 番台から棚を選んでから編纂机へ来た場合は、選んだ棚に応じた問いに変わる
  window.goToDeskWithCategory('kanashii');
  await new Promise(r=>setTimeout(r, 450));
  const boatItemsAfter = Array.from(document.querySelectorAll('#writingBoatList li')).map(li=>li.textContent);
  ok('after goToDeskWithCategory("kanashii"), the boat shows category-specific prompts', boatItemsAfter[0] === '何を、失ったと感じていますか。');

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('BATCH2 TEST CRASHED:', e); process.exit(2); });
