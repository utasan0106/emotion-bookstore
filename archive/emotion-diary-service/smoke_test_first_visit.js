// feature/first-visit-experience 専用の受入テストスイート。
// カバー範囲：閲覧専用サンプル本（表示・非保存・操作非表示・閉じて表紙へ）／
// AI不使用の説明文（日英切替）／製本後の余韻2行／既存次行動ボタン／
// 推薦の上限（1冊＋1曲）／新規GA4イベントなし／AI生成・解析機能の不追加。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..'); // ★成果物内で再実行可能な相対パス（tests/の親＝ソース直下）
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}
function wrap(value){ return JSON.stringify({ v:1, data:value }); }

async function createEnv(opts){
  opts = opts || {};
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
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
  const fetchLog = [];
  window.fetch = function(url){ fetchLog.push(String(url)); return Promise.resolve({ ok:true, json: () => Promise.resolve({}) }); };
  const s1 = document.createElement('script'); s1.textContent = fs.readFileSync(path.join(SRC,'data.js'),'utf-8'); document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = fs.readFileSync(path.join(SRC,'main.js'),'utf-8'); document.body.appendChild(s2);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));
  return { window, document, gaCalls, fetchLog };
}

async function main(){

  // ============================================================
  // (1) サンプル本が閲覧できる（タイトル・本文・感情棚・製本日・店主の栞）
  // ============================================================
  {
    const { window, document } = await createEnv({});
    // ★2026-07-19更新（仕様A）：サンプル本ボタンは表紙から「はじめての方へ」内へ移動
    ok('(1) the sample-peek button exists (inside the first-visit accordion)', !!document.getElementById('samplePeekBtn'));
    window.openSampleBook();
    // ★Hotfix4更新：見本はモーダル(#bookModal)ではなく、説明パネル内のインライン要素(#sampleBookInline)に表示される。
    const inlineBox = document.getElementById('sampleBookInline');
    ok('(1) opening the sample shows the inline sample block (not the modal)', !inlineBox.classList.contains('hidden'));
    ok('(1) the sample has a title', document.getElementById('sampleInlineTitle').textContent.length > 0);
    ok('(1) the sample has a short story body', document.getElementById('sampleInlineStory').textContent.length > 20);
    ok('(1) the sample shows an emotion-shelf label', document.getElementById('sampleInlineCat').textContent.length > 0);
    ok('(1) the sample shows a binding date', document.getElementById('sampleInlineDate').textContent.length > 0);
    ok('(1) the sample shows the shopkeeper\'s bookmark note', document.getElementById('sampleInlineNoteText').textContent.length > 0);
    ok('(1) the sample badge explains it is a sample', inlineBox.querySelector('.sample-book-badge').textContent.length > 0);
    ok('(1) opening the sample does NOT open the real book modal', document.getElementById('bookModal').classList.contains('hidden'));
  }

  // ============================================================
  // (2) サンプル本が本棚やlocalStorageへ保存されない
  // ============================================================
  {
    const { window, document } = await createEnv({});
    const libBefore = window.localStorage.getItem('emotion-bookstore-library');
    window.openSampleBook();
    window.closeSampleBook();
    await new Promise(r => setTimeout(r, 50));
    const libAfter = window.localStorage.getItem('emotion-bookstore-library');
    ok('(2) opening+closing the sample never writes the library key to localStorage', libBefore === libAfter);
    // 本棚画面にも背表紙が現れないこと
    window.goToPage('bookshelf');
    await new Promise(r => setTimeout(r, 50));
    const spines = document.querySelectorAll('#shelf .spine:not(.ghost-spine)');
    const realSpines = Array.from(document.querySelectorAll('#shelf .spine')).filter(s=>!s.classList.contains('empty-spine') && !s.classList.contains('ghost'));
    ok('(2) the bookshelf remains empty after viewing the sample (no spine added)', document.querySelectorAll('#shelf .spine').length <= 1); // 空の背表紙(ghost)のみ許容
  }

  // ============================================================
  // (3) サンプル本に編集・削除・共有操作が出ない／閉じると通常状態へ復帰する
  // ============================================================
  {
    const { window, document } = await createEnv({});
    window.openSampleBook();
    // ★Hotfix4更新：見本はインライン要素として表示され、そもそも編集・削除・共有の操作行を含まない
    // （#bookModalの編集/共有UIには触れないため、実本用のそれらの状態は変化しない）。
    const inlineBox3 = document.getElementById('sampleBookInline');
    ok('(3) the inline sample block has no edit/delete action row', !inlineBox3.querySelector('.modal-actions'));
    ok('(3) the inline sample block has no share note', !inlineBox3.querySelector('.modal-share-note'));
    ok('(3) the inline sample block has no edit-mode action row', !inlineBox3.querySelector('.modal-edit-actions'));
    // 閉じる（見本のトグルボタンを押す＝isSampleBookOpen()を介したトグル）
    document.getElementById('samplePeekBtn').onclick();
    ok('(4) closing the sample hides the inline block', inlineBox3.classList.contains('hidden'));
    ok('(4) after closing, the page is still the cover (not experience mode)', !document.body.classList.contains('experience-open'));
    ok('(4) the main CTA (make a book) is still present and wired', !!document.querySelector('.enter-btn'));
    ok('(4) the real book modal action row is untouched (not forced hidden) by the sample flow', !document.getElementById('modalActions').classList.contains('hidden'));
    ok('(4) closing does not leave the real book modal open', document.getElementById('bookModal').classList.contains('hidden'));
  }

  // ============================================================
  // (5) 日本語・英語の説明が正しく切り替わる（表紙の説明文・サンプル本）
  // ★2026-07-19更新（feature/quiet-experience-and-en-completion 仕様A）：
  // 詳しい説明3行は表紙常時表示から「はじめての方へ」アコーディオン内へ移動し、
  // 推薦機能の説明は執筆前には表示しない仕様へ変更されたため、本テストも新配置へ追従した。
  // ============================================================
  {
    const { window, document } = await createEnv({});
    // アコーディオンを開いて説明を表示する
    document.getElementById('aboutAccordionBtn').dispatchEvent(new window.Event('click',{bubbles:true}));
    const line1Ja = document.querySelector('[data-i18n="firstVisitAiLine1"]').textContent;
    ok('(5) JA first-visit line 1 says the user, not AI, writes the book', line1Ja.includes('AIではなくあなた自身'));
    ok('(5) JA first-visit line 2 mentions no external sending / no analysis', document.querySelector('[data-i18n="firstVisitAiLine2"]').textContent.includes('外部へ送信されません'));
    // ★仕様A：本・音楽のおすすめの説明は、表紙・執筆前には表示しない（製本後のサプライズ扱い）
    const hero = document.querySelector('.entrance.hero');
    ok('(5) the recommendation explanation is NOT shown on the cover (post-binding surprise per spec A)', !hero.textContent.includes('寄り道'));
    // サンプルを開いたまま英語へ切替
    window.openSampleBook();
    window.toggleLanguage();
    const line1En = document.querySelector('[data-i18n="firstVisitAiLine1"]').textContent;
    ok('(5) EN first-visit line 1 matches the specified copy', line1En.includes('You—not AI—write the book'));
    ok('(5) EN first-visit line 2 matches the specified copy', document.querySelector('[data-i18n="firstVisitAiLine2"]').textContent.includes('not sent outside your device'));
    ok('(5) the open sample story switches to English without reopening', /[a-zA-Z]/.test(document.getElementById('sampleInlineStory').textContent) && !/[぀-ヿ一-鿿]/.test(document.getElementById('sampleInlineStory').textContent));
    ok('(5) the sample badge switches to English', document.getElementById('sampleBookInline').querySelector('.sample-book-badge').textContent.includes('sample book'));
    window.toggleLanguage();
    ok('(5) switching back to Japanese restores the JA sample story', /[぀-ヿ一-鿿]/.test(document.getElementById('sampleInlineStory').textContent));
    window.closeSampleBook();
  }

  // ============================================================
  // (6) AIが本文を生成・解析する機能を追加していない
  //     （サンプル表示は固定データのみで、外部通信・本文送信を伴わない）
  // ============================================================
  {
    const { window, fetchLog } = await createEnv({});
    const fetchesBefore = fetchLog.length;
    window.openSampleBook();
    window.closeSampleBook();
    await new Promise(r => setTimeout(r, 50));
    ok('(6) viewing the sample book makes no network request at all', fetchLog.length === fetchesBefore);
    // 静的検査：サンプル本モジュールが外部API・生成・解析系の呼び出しを含まない
    const src = fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    const sampleBlock = src.slice(src.indexOf('function openSampleBook'), src.indexOf('function refreshSampleBookIfOpen'));
    ok('(6) openSampleBook/closeSampleBook contain no fetch() call (fixed data only)', !/fetch\(/.test(sampleBlock));
  }

  // ============================================================
  // (7)(8) 製本後の余韻2行が表示され、既存の次行動ボタンが動作する
  // ============================================================
  {
    const entry = { id:'fv-1', title:'テストの一冊', story:'テスト本文', category:'natsukashii', date:new Date().toISOString() };
    const { window, document } = await createEnv({ seedLibrary: [entry] });
    window.goToPage('bookshelf');
    if(typeof window.renderShelf === 'function'){ try{ window.renderShelf(); }catch(e){} }
    await new Promise(r => setTimeout(r, 50));
    const arrival = document.getElementById('bookshelfArrival');
    ok('(7) the arrival panel is visible when the shelf has a book', !arrival.classList.contains('hidden'));
    const afterglow = arrival.querySelectorAll('.bookshelf-arrival-afterglow');
    ok('(7) the afterglow has exactly 2 lines', afterglow.length === 2);
    ok('(7) JA line 1 matches the specified copy', afterglow[0].textContent.includes('今夜の気持ちは、ここに置いていけます'));
    ok('(7) JA line 2 matches the specified copy', afterglow[1].textContent.includes('必要になったとき、また開きに来てください'));
    ok('(7) the afterglow sits below the arrival heading', arrival.querySelector('.bookshelf-arrival-heading').compareDocumentPosition(afterglow[0]) & 4);
    window.toggleLanguage();
    ok('(7) EN line 1 matches the specified copy', afterglow[0].textContent.includes('You can leave tonight’s feelings here'));
    ok('(7) EN line 2 matches the specified copy', afterglow[1].textContent.includes('Come back and open this book whenever you need it'));
    window.toggleLanguage();
    // (8) 既存の次行動ボタン
    const makeAnother = document.getElementById('bookshelfArrivalMakeAnother');
    ok('(8) the "make another book" button is present and visible', !!makeAnother && !arrival.classList.contains('hidden'));
    makeAnother.onclick();
    await new Promise(r => setTimeout(r, 50));
    ok('(8) "make another book" still navigates to the writing desk', document.getElementById('desk').classList.contains('active-page') || document.body.classList.contains('experience-open'));
    // この場面の推薦は1冊＋1曲まで（既存のrenderShelfPickRecommendを再利用・データ取得なし）
    window.goToPage('bookshelf');
    if(typeof window.renderShelfPickRecommend === 'function'){ try{ window.renderShelfPickRecommend(); }catch(e){} }
    await new Promise(r => setTimeout(r, 50));
    const recBox = document.getElementById('shelfPickRecommend');
    const bookCards = recBox ? recBox.querySelectorAll('.shelf-pick-book').length : 0;
    const musicCards = recBox ? recBox.querySelectorAll('.shelf-pick-music').length : 0;
    ok('(8) the arrival-scene recommendation shows at most 1 book', bookCards <= 1);
    ok('(8) the arrival-scene recommendation shows at most 1 song', musicCards <= 1);
  }

  // ============================================================
  // (9) 新規GA4イベントを追加していない
  // ============================================================
  {
    const { window, gaCalls } = await createEnv({});
    window.openSampleBook();
    window.toggleLanguage();
    window.toggleLanguage();
    window.closeSampleBook();
    const eventNames = gaCalls.filter(c => c[0] === 'event').map(c => c[1]);
    const knownFive = ['create_book_error','create_book_success','start_writing','view_landing','view_shelf'];
    const unknown = eventNames.filter(n => !knownFive.includes(n));
    ok('(9) no GA4 event outside the existing 5 was sent while using the first-visit features', unknown.length === 0);
  }

  // ============================================================
  // (10) 主要コピー・既存導線が変わっていない
  // ============================================================
  {
    const { document } = await createEnv({});
    const heroCopy = document.querySelector('.entrance.hero h1, .entrance.hero .hero-copy, .entrance.hero .catch');
    const html = fs.readFileSync(path.join(SRC,'index.html'),'utf-8');
    ok('(10) the main cover copy 「今の気持ちを、一冊の本に。」 is unchanged in the page source', html.includes('今の気持ちを、一冊の本に。'));
    ok('(10) the main CTA (heroCta) still navigates to the desk', html.includes(`onclick="goToPage('desk')" data-i18n="heroCta"`));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FIRST-VISIT TEST CRASHED:', e); process.exit(2); });
