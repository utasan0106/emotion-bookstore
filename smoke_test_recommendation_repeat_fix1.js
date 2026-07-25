// Recommendation Repeat Fix 1 専用テスト。
// 感情の棚の「他も見る／Show more」ボタンを押しても本の推薦が一切変わらない不具合の修正を検証する。
// 指示書「6. 必須テスト」のA〜E（項目1〜29）に対応する（各assertionのコメント冒頭に項目番号を付す）。
// F（項目30〜32＝既存テストの回帰）は、この新規ファイルではなく既存の各専用テスト
// （smoke_test_content_trust_fix1.js、smoke_test_visual_rc1.js、その他既存tests/一式）を
// 直接再実行して確認する（全回帰テストログを参照）。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..'); // 成果物内で再実行可能な相対パス（tests/の親＝ソース直下）
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}
function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

function buildDom(){
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
  window.gtag = function(){};
  window.fetch = function(){ return Promise.resolve({ ok:true, json: () => Promise.resolve([]) }); };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';
  return { dom, window, document };
}

function runInPageScope(document, code){
  const s = document.createElement('script');
  s.textContent = code;
  document.body.appendChild(s);
}

// ---- DOM状態からの安定フィンガープリント取得ヘルパー ----
// r.title / r.by（BOOK_POOL側の原本フィールド）はamazonSearchUrlの検索語として
// 言語モードに関わらず常に使われるため、表示言語が変わっても作品の同一性を判定できる。
function chipAmazonHrefs(doc){
  return Array.from(doc.querySelectorAll('#shelfDisplay .recommend-chip')).map(chip=>{
    const links = Array.from(chip.querySelectorAll('a.recommend-buy'));
    const amazon = links.find(a => !a.classList.contains('kindle') && !a.classList.contains('audible') && !a.classList.contains('rakuten'));
    return amazon ? amazon.getAttribute('href') : null;
  });
}
function musicSpotifyHrefs(doc){
  return Array.from(doc.querySelectorAll('#shelfDisplay .playlist-track-row')).map(row=>{
    const a = Array.from(row.querySelectorAll('a')).find(x => (x.getAttribute('href')||'').indexOf('spotify.com') !== -1);
    return a ? a.getAttribute('href') : null;
  });
}
function sameArr(a, b){ return JSON.stringify(a) === JSON.stringify(b); }

async function main(){
  const dataSrc = fs.readFileSync(path.join(SRC, 'data.js'), 'utf-8');
  const mainSrc = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');

  const { window, document } = buildDom();
  const s1 = document.createElement('script'); s1.textContent = dataSrc; document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = mainSrc; document.body.appendChild(s2);
  await wait(300);
  await wait(300);

  // ============================================================
  // 事前準備：CATEGORIES一覧と各棚の実効候補数（getShelfBookOrder経由）を取得し、
  // 実行日に応じて動的に「候補4件以上／3件／2件」の棚をそれぞれ1つ以上見つける。
  // （unlockedWaveCount()は実行日に依存するため、棚IDをハードコードしない）
  // ============================================================
  runInPageScope(document, 'window.__catIds = CATEGORIES.map(c=>c.id);');
  const catIds = window.__catIds;
  ok('事前確認：CATEGORIESが21棚取得できる', Array.isArray(catIds) && catIds.length === 21);
  ok('事前確認：getShelfBookOrder が関数として存在する', typeof window.getShelfBookOrder === 'function');
  ok('事前確認：getShelfBookRerollStep が関数として存在する', typeof window.getShelfBookRerollStep === 'function');
  ok('事前確認：showMoreShelfBooks が関数として存在する', typeof window.showMoreShelfBooks === 'function');

  const poolCounts = {};
  catIds.forEach(id => { poolCounts[id] = window.getShelfBookOrder(id).length; });
  const withGE4 = catIds.filter(id => poolCounts[id] >= 4);
  const with3 = catIds.filter(id => poolCounts[id] === 3);
  const with2 = catIds.filter(id => poolCounts[id] === 2);
  console.log('実効候補数の内訳:', JSON.stringify(poolCounts));
  ok('事前確認：実効候補4件以上の棚が存在する', withGE4.length > 0);
  ok('事前確認：実効候補3件の棚が存在する', with3.length > 0);
  ok('事前確認：実効候補2件の棚が存在する', with2.length > 0);

  const shelf4 = withGE4[0];
  const shelf3 = with3[0];
  const shelf2 = with2[0];
  const shelfOther = catIds.find(id => id !== shelf4); // 棚往復用の退避先

  // ============================================================
  // A. 不具合修正（項目1〜5）
  // ============================================================
  window.goToShelf(shelf4);
  await wait(30);
  let disp = document.getElementById('shelfDisplay');
  const btnInitial = disp.querySelector('.recommend-shuffle');
  ok(`(1) 実効候補4件以上の棚（${shelf4}, 候補${poolCounts[shelf4]}件）にボタンが表示される`, btnInitial !== null);

  const before1 = chipAmazonHrefs(document);
  btnInitial.click();
  await wait(20);
  const after1 = chipAmazonHrefs(document);
  ok('(2) クリック1回後、表示3冊のうち最低1冊以上が変わる', !sameArr(before1, after1) &&
      before1.some((h, i) => h !== after1[i]));

  // (3) 10回クリックを繰り返し、毎回直前と完全一致しないことを確認
  let prevSet = after1;
  let allDiffer = true;
  for(let i = 0; i < 10; i++){
    const btn = document.querySelector('#shelfDisplay .recommend-shuffle');
    if(!btn){ allDiffer = false; break; }
    btn.click();
    await wait(15);
    const curSet = chipAmazonHrefs(document);
    if(sameArr(curSet, prevSet)) allDiffer = false;
    prevSet = curSet;
  }
  ok('(3) クリックを10回繰り返しても、毎回直前と完全一致しない', allDiffer);

  // (4) 日本語・英語の両方で成立する（英語モードでも他も見るで最低1冊変わる）
  window.toggleLanguage();
  await wait(30);
  window.goToShelf(shelf4);
  await wait(30);
  const beforeEn = chipAmazonHrefs(document);
  const btnEn = document.querySelector('#shelfDisplay .recommend-shuffle');
  ok('(4) 英語モードでも実効候補4件以上の棚にボタンが表示される', btnEn !== null);
  btnEn.click();
  await wait(20);
  const afterEn = chipAmazonHrefs(document);
  ok('(4) 英語モードでもクリック1回後に最低1冊以上変わる', !sameArr(beforeEn, afterEn));
  window.toggleLanguage(); // 日本語へ戻す
  await wait(30);

  // (5) ボタンのonclickが単なるrenderShelfDisplay()ではない
  window.goToShelf(shelf4);
  await wait(30);
  const btn5 = document.querySelector('#shelfDisplay .recommend-shuffle');
  const onclickAttr = btn5 ? btn5.getAttribute('onclick') : null;
  ok('(5) ボタンのonclickが "renderShelfDisplay()" と完全一致しない', onclickAttr !== 'renderShelfDisplay()');
  ok('(5) ボタンのonclickが専用関数 showMoreShelfBooks() を呼ぶ', onclickAttr === 'showMoreShelfBooks()');

  // ============================================================
  // B. 候補3件以下（項目6〜9）
  // ============================================================
  window.goToShelf(shelf3);
  await wait(30);
  disp = document.getElementById('shelfDisplay');
  ok(`(6) 候補3件の棚（${shelf3}）ではボタンを生成しない`, disp.querySelector('.recommend-shuffle') === null);
  ok(`(8) 候補3件の棚では本推薦が${poolCounts[shelf3]}件表示される（変更なし）`,
    disp.querySelectorAll('.recommend-chip').length === poolCounts[shelf3]);
  let emptyFocusable3 = Array.from(disp.querySelectorAll('button, [tabindex]'))
    .filter(el => /recommend/i.test(el.className || '') && !el.textContent.trim());
  ok('(9) 候補3件の棚で空のフォーカス可能要素が残らない', emptyFocusable3.length === 0);

  window.goToShelf(shelf2);
  await wait(30);
  disp = document.getElementById('shelfDisplay');
  ok(`(7) 候補2件の棚（${shelf2}）ではボタンを生成しない`, disp.querySelector('.recommend-shuffle') === null);
  ok(`(8) 候補2件の棚では本推薦が${poolCounts[shelf2]}件表示される（変更なし）`,
    disp.querySelectorAll('.recommend-chip').length === poolCounts[shelf2]);
  let emptyFocusable2 = Array.from(disp.querySelectorAll('button, [tabindex]'))
    .filter(el => /recommend/i.test(el.className || '') && !el.textContent.trim());
  ok('(9) 候補2件の棚で空のフォーカス可能要素が残らない', emptyFocusable2.length === 0);

  // ============================================================
  // C. 安定性（項目10〜16）
  // ============================================================
  window.goToShelf(shelf4);
  await wait(30);
  const before10 = chipAmazonHrefs(document);
  window.renderShelfDisplay();
  await wait(15);
  const after10 = chipAmazonHrefs(document);
  ok('(10) 通常のrenderShelfDisplay()再実行では本が変わらない', sameArr(before10, after10));

  // (11) 言語切替では作品ID・順序が変わらない（クリックなし）
  const beforeLangSwitch = chipAmazonHrefs(document);
  window.toggleLanguage();
  await wait(30);
  const afterToEn = chipAmazonHrefs(document);
  ok('(11) 日本語→英語で作品ID・順序が変わらない', sameArr(beforeLangSwitch, afterToEn));
  window.toggleLanguage();
  await wait(30);
  const afterBackJa = chipAmazonHrefs(document);
  ok('(11) 英語→日本語で作品ID・順序が変わらない', sameArr(beforeLangSwitch, afterBackJa));

  // (12) 棚を往復して戻っても現在のreroll結果を維持する
  window.goToShelf(shelf4);
  await wait(30);
  const btn12 = document.querySelector('#shelfDisplay .recommend-shuffle');
  btn12.click();
  await wait(20);
  const afterClick12 = chipAmazonHrefs(document);
  window.goToShelf(shelfOther);
  await wait(20);
  window.goToShelf(shelf4);
  await wait(30);
  const afterRoundTrip = chipAmazonHrefs(document);
  ok('(12) 棚を往復して戻っても現在のreroll結果を維持する', sameArr(afterClick12, afterRoundTrip));

  // (13) ページ再読み込み相当（同じsessionStorageのまま#shelfDisplayを空にして再描画）でも維持
  document.getElementById('shelfDisplay').innerHTML = '';
  window.renderShelfDisplay();
  await wait(15);
  const afterReloadSim = chipAmazonHrefs(document);
  ok('(13) 再読み込み相当でも同じsessionStorageなら維持する', sameArr(afterClick12, afterReloadSim));

  // (14) 新しいencounter seedではstepが0へ戻る
  const seedBeforeRotate = window.recoEncounterSeed();
  window.rotateRecoEncounter();
  const seedAfterRotate = window.recoEncounterSeed();
  ok('(14前提) rotateRecoEncounter()でeb-reco-seedが実際に変わる', seedBeforeRotate !== seedAfterRotate);
  const stepAfterRotate = window.getShelfBookRerollStep(shelf4, seedAfterRotate);
  ok('(14) 新しいencounter seedではstepが0へ戻る', stepAfterRotate === 0);
  // 元のencounterへ戻す（以降のテストに影響しないよう、eb-reco-seedを書き戻す）
  window.sessionStorage.setItem('eb-reco-seed', String(seedBeforeRotate));
  window.goToShelf(shelf4);
  await wait(20);

  // ============================================================
  // C続き／D. 本以外への影響（項目15〜21）
  // ============================================================
  window.goToShelf(shelf4);
  await wait(30);
  const seedBefore15 = window.sessionStorage.getItem('eb-reco-seed');
  const quoteBefore = document.querySelector('#shelfDisplay .quote-card').textContent;
  const musicBefore = musicSpotifyHrefs(document);
  const shelfPickBefore = document.getElementById('shelfPickRecommend') ? document.getElementById('shelfPickRecommend').innerHTML : null;
  const shioriBefore = document.getElementById('shioriCard') ? document.getElementById('shioriCard').innerHTML : null;
  const fictionalCountBefore = document.querySelectorAll('#shelfDisplay .episode-card:not(.mine)').length;

  const btn15 = document.querySelector('#shelfDisplay .recommend-shuffle');
  btn15.click();
  await wait(20);

  const seedAfter15 = window.sessionStorage.getItem('eb-reco-seed');
  ok('(15) eb-reco-seedはクリック前後で不変', seedBefore15 === seedAfter15);

  const shelfPickAfter = document.getElementById('shelfPickRecommend') ? document.getElementById('shelfPickRecommend').innerHTML : null;
  const shioriAfter = document.getElementById('shioriCard') ? document.getElementById('shioriCard').innerHTML : null;
  ok('(16) 製本直後／本棚到着推薦（#shelfPickRecommend）はクリック前後で不変', shelfPickBefore === shelfPickAfter);
  ok('(16) 今日の栞（#shioriCard）の内容もクリック前後で不変', shioriBefore === shioriAfter);

  const quoteAfter = document.querySelector('#shelfDisplay .quote-card').textContent;
  ok('(17) 名言がクリック前後で変わらない', quoteBefore === quoteAfter);

  const musicAfter = musicSpotifyHrefs(document);
  ok('(18) 音楽の作品ID・順序がクリック前後で変わらない', sameArr(musicBefore, musicAfter));

  ok('(19) 今日の栞の器（#shioriCard）がクリック後もページに残る', document.getElementById('shioriCard') !== null);
  ok('(19) 今月の寄り道の器（#detourSection）がクリック後もページに残る', document.getElementById('detourSection') !== null);

  const fictionalCountAfter = document.querySelectorAll('#shelfDisplay .episode-card:not(.mine)').length;
  ok('(20) Content Trust Fix 1の仮短編非表示がクリック後も維持される（0件のまま）',
    fictionalCountBefore === 0 && fictionalCountAfter === 0);

  // (21) 利用者自身の本が従来どおり表示・開閉できる
  const myBook = { id:'rrf1-mybook-1', title:'RRF1テスト用の本', story:'これはテスト用の本文です。', category: shelf4, date:'2026-07-20T10:00:00.000Z' };
  window.__rrf1_myBook = myBook;
  runInPageScope(document, 'libraryCache.push(window.__rrf1_myBook);');
  window.goToShelf(shelfOther);
  await wait(20);
  window.goToShelf(shelf4);
  await wait(30);
  const mineCard = document.querySelector('#shelfDisplay .episode-card.mine');
  ok('(21) 利用者自身の本のカードが表示される', mineCard !== null);
  if(mineCard){
    mineCard.click();
    await wait(20);
    const modalTitle = document.getElementById('modalTitle');
    ok('(21) 利用者自身の本をクリックすると開く（#modalTitleが一致）', modalTitle && modalTitle.textContent === myBook.title);
    const closeBtn = document.getElementById('modalClose');
    if(closeBtn) closeBtn.click();
    await wait(10);
  }
  // 後片付け：後続の項目に影響しないよう、テスト専用のmyBookを取り除く
  runInPageScope(document, 'libraryCache = libraryCache.filter(e => e.id !== window.__rrf1_myBook.id);');

  // ============================================================
  // E. 保存・安全（項目22〜29）
  // ============================================================
  window.goToShelf(shelf4);
  await wait(30);

  // (22)(23) 新しい状態はsessionStorageだけに保存され、localStorage/Cookieへ新規キーを作らない。
  // ・document.cookieがクリックの前後で不変であることを動的に確認する。
  // ・localStorageへの非書き込みは、新規/変更関数のソースを静的検査する項目(28)(29)の中で
  //   'localStorage' という識別子自体が一切登場しないことを確認する形で担保する
  //   （このテスト用のlocalStorageスタブはgetItem/setItemのみでキー列挙APIを持たないため、
  //   実行時のキー集合比較ではなく、ソース参照の不在で安全側に確認する）。
  const cookieBefore = document.cookie;
  for(let i = 0; i < 5; i++){
    const b = document.querySelector('#shelfDisplay .recommend-shuffle');
    if(b) b.click();
    await wait(10);
  }
  const cookieAfter = document.cookie;
  ok('(23) Cookieへ新しい推薦キーを作らない（document.cookieが不変）', cookieBefore === cookieAfter);

  // (24)(25) 棚ごとにrerollキーは最大1件。50回クリックしても増えない
  window.goToShelf(shelf4);
  await wait(20);
  for(let i = 0; i < 50; i++){
    const b = document.querySelector('#shelfDisplay .recommend-shuffle');
    if(b) b.click();
  }
  await wait(30);
  runInPageScope(document, `
    window.__rrf1_sessionKeys = Object.keys(sessionStorage);
  `);
  const rerollKeys = window.__rrf1_sessionKeys.filter(k => k.indexOf('eb-shelf-book-reroll-') === 0);
  const rerollKeysForShelf4 = rerollKeys.filter(k => k === 'eb-shelf-book-reroll-' + shelf4);
  ok('(24) 棚ごとにrerollキーは最大1件（同一棚IDに対して1件だけ）', rerollKeysForShelf4.length === 1);
  ok('(25) 50回クリックしてもrerollキー総数がカテゴリ数を超えて増えない', rerollKeys.length <= catIds.length);

  // (26) 50回クリックしてもeb-shelf-*-memo-*キーがクリック回数に比例して増えない
  const memoKeysForShelf4 = window.__rrf1_sessionKeys.filter(k => k.indexOf('eb-shelf-book-memo-' + shelf4 + '-') === 0);
  ok('(26) 50回クリックしてもeb-shelf-book-memo-キーが1件（seed単位）のまま増えない', memoKeysForShelf4.length <= 1);

  // (27) 壊れたJSONやsessionStorage例外でも表示が壊れない
  window.sessionStorage.setItem('eb-shelf-book-reroll-' + shelf4, '{not-valid-json{{{');
  let threw27a = false;
  try{ window.renderShelfDisplay(); }catch(e){ threw27a = true; }
  await wait(15);
  ok('(27) 壊れたJSONのreroll値があっても renderShelfDisplay() は例外を投げない', !threw27a);
  ok('(27) 壊れたJSONのreroll値があっても本のおすすめ欄は表示される',
    document.querySelectorAll('#shelfDisplay .recommend-chip').length > 0);

  // sessionStorage自体が例外を投げるケース（プライベートブラウジング等を模擬）
  const proto = Object.getPrototypeOf(window.sessionStorage);
  const origGetItem = proto.getItem;
  const origSetItem = proto.setItem;
  proto.getItem = function(){ throw new Error('simulated sessionStorage exception'); };
  proto.setItem = function(){ throw new Error('simulated sessionStorage exception'); };
  let threw27b = false;
  try{
    window.showMoreShelfBooks();
    window.renderShelfDisplay();
  }catch(e){ threw27b = true; }
  await wait(15);
  ok('(27) sessionStorageが例外を投げても showMoreShelfBooks()/renderShelfDisplay() は落ちない', !threw27b);
  proto.getItem = origGetItem;
  proto.setItem = origSetItem;
  // 例外テストで壊れたキーを正常値へ戻す
  window.sessionStorage.removeItem('eb-shelf-book-reroll-' + shelf4);
  window.goToShelf(shelf4);
  await wait(20);
  ok('(27後始末) sessionStorage復旧後は通常どおり描画される',
    document.querySelectorAll('#shelfDisplay .recommend-chip').length > 0);

  // (28) 本文、題名、写真を参照しない：追加した関数のソース本文を静的に検査する
  function extractFunctionSource(src, name){
    const idx = src.indexOf('function ' + name + '(');
    if(idx === -1) return '';
    let depth = 0, started = false, out = '';
    for(let i = idx; i < src.length; i++){
      const ch = src[i];
      out += ch;
      if(ch === '{'){ depth++; started = true; }
      else if(ch === '}'){ depth--; if(started && depth === 0) break; }
    }
    return out;
  }
  const newFnSrc = [
    extractFunctionSource(mainSrc, 'getShelfBookOrder'),
    extractFunctionSource(mainSrc, 'getShelfBookRerollStep'),
    extractFunctionSource(mainSrc, 'showMoreShelfBooks'),
    extractFunctionSource(mainSrc, 'pickRecommend')
  ].join('\n');
  const forbiddenRefs = ['entry.story', 'entry.title', 'entry.image', 'entry.photo', 'libraryCache', '.story', '.photo'];
  const foundForbidden = forbiddenRefs.filter(t => newFnSrc.indexOf(t) !== -1);
  ok('(28) 新規/変更関数が利用者の本文・題名・写真（entry.story/entry.title/entry.image/libraryCache等）を参照しない',
    foundForbidden.length === 0);

  // (22)(23) 新規/変更関数のソースに localStorage / indexedDB / document.cookie への
  // 書き込みが一切登場しないことを静的に確認する（sessionStorageの1系統キー以外の
  // 保存先を使っていないことの裏付け）。
  const storageRefs = ['localStorage', 'indexedDB', 'document.cookie'];
  const foundStorageRefs = storageRefs.filter(t => newFnSrc.indexOf(t) !== -1);
  ok('(22) 新規/変更関数がlocalStorage/indexedDB/document.cookieに触れない（sessionStorageのみ使用）',
    foundStorageRefs.length === 0 && newFnSrc.indexOf('sessionStorage') !== -1);

  // (29) 新しいGA4イベント、fetch、外部通信を追加しない（main.js全体での出現回数が既存と同数のまま）
  const trackCount = (mainSrc.match(/trackAnalyticsEvent\(/g) || []).length;
  const fetchCount = (mainSrc.match(/fetch\(/g) || []).length;
  ok('(29) main.js中のtrackAnalyticsEvent呼び出し箇所数が既存の10件のまま（新規イベント追加なし）', trackCount === 10);
  ok('(29) main.js中のfetch(呼び出し箇所数が既存の4件のまま（新規追加なし）', fetchCount === 4);
  ok('(29) 新規関数のソースにfetch(呼び出しが含まれない', newFnSrc.indexOf('fetch(') === -1);
  ok('(29) 新規関数のソースにgtag呼び出しが含まれない', newFnSrc.indexOf('gtag(') === -1 && newFnSrc.indexOf('trackAnalyticsEvent(') === -1);

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('RECOMMENDATION REPEAT FIX1 TEST CRASHED:', e); process.exit(2); });
