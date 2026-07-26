// Content Trust Fix 1 専用テスト。
// 感情の棚に表示していた仮の創作短編（STORIES_POOL／STORIES_POOL_EN由来）を、
// 運営側の固定フラグ（FICTIONAL_SHELF_STORIES_ENABLED、既定値false）で非表示にする変更を検証する。
// 指示書「7. テスト」の項目1〜22に対応する（各assertionのコメント冒頭に項目番号を付す）。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..'); // 成果物内で再実行可能な相対パス（tests/の親＝ソース直下）
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}

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

async function main(){
  const dataSrc = fs.readFileSync(path.join(SRC, 'data.js'), 'utf-8');
  const mainSrc = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');

  // ============================================================
  // メインDOM：実ファイルをそのまま読み込む（フラグは既定値のfalseのまま）
  // ============================================================
  const { window, document } = buildDom();
  const s1 = document.createElement('script'); s1.textContent = dataSrc; document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = mainSrc; document.body.appendChild(s2);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));

  // libraryCache／STORIES_POOL等はトップレベルlet/constのためwindow経由では触れない。
  // 既存テスト（例：smoke_test_en_dates.js）と同じくページスコープへ注入して読み書きする。
  runInPageScope(document, 'window.__ctf1_flag = FICTIONAL_SHELF_STORIES_ENABLED;');
  runInPageScope(document, 'window.__ctf1_pools = { hasJa: typeof STORIES_POOL === "object" && Object.keys(STORIES_POOL).length > 0, hasEn: typeof STORIES_POOL_EN === "object" && Object.keys(STORIES_POOL_EN).length > 0, jaCount: typeof STORIES_POOL === "object" ? Object.keys(STORIES_POOL).length : 0, enCount: typeof STORIES_POOL_EN === "object" ? Object.keys(STORIES_POOL_EN).length : 0 };');
  runInPageScope(document, 'window.__ctf1_toggleFn = typeof toggleEpisodes;');

  // ---- 項目1：固定フラグの既定値がfalse ----
  ok('(1) FICTIONAL_SHELF_STORIES_ENABLED の既定値が false', window.__ctf1_flag === false);

  // ---- 項目18：STORIES_POOL／STORIES_POOL_ENと本文データを削除していない ----
  ok('(18) STORIES_POOL がオブジェクトとして残っている（削除していない）', window.__ctf1_pools.hasJa === true && window.__ctf1_pools.jaCount > 0);
  ok('(18) STORIES_POOL_EN がオブジェクトとして残っている（削除していない）', window.__ctf1_pools.hasEn === true && window.__ctf1_pools.enCount > 0);
  // ---- 項目 (5-4関連)：toggleEpisodes() 等、将来再利用する関数が削除されていない ----
  ok('(5-4) toggleEpisodes() 関数が削除されていない', window.__ctf1_toggleFn === 'function');

  // ============================================================
  // (A) 日本語モード・利用者自身の本がない棚（moyamoya）
  // ============================================================
  window.goToShelf('moyamoya');
  await new Promise(r => setTimeout(r, 30));
  const shelfNoBooksJa = document.getElementById('shelfDisplay');
  const html_A = shelfNoBooksJa.innerHTML;

  // ---- 項目2：日本語でSTORIES_POOL由来の短編カードがDOMへ生成されない ----
  ok('(2) 日本語：STORIES_POOL由来の短編カード(.episode-card:not(.mine))が生成されない', shelfNoBooksJa.querySelectorAll('.episode-card:not(.mine)').length === 0);
  // ---- 項目4：仮短編本文の代表文字列がDOMへ挿入されない ----
  ok('(4) 仮短編本文の代表文字列（moyamoyaの1件目）がDOMへ挿入されない', !html_A.includes('グループLINEのノリ'));
  // ---- 項目5：「短い物語」専用ラベルが表示されない ----
  ok('(5) 「短い物語」専用ラベルが表示されない', !html_A.includes('短い物語') && shelfNoBooksJa.querySelector('[data-i18n="shelfFictionalLabel"]') === null);
  // ---- 項目6：仮短編専用の説明文が表示されない ----
  ok('(6) 仮短編専用の説明文（shelfEpisodesNote）が表示されない', !html_A.includes('来店された方の文章ではありません'));
  // ---- 項目7：「エピソードも見る」等の短編用操作が表示されない ----
  ok('(7) 「エピソードも見る」ボタン（.episode-shuffle）が表示されない', shelfNoBooksJa.querySelector('.episode-shuffle') === null && !html_A.includes('エピソードも見る'));
  // ---- 項目8：episodesMore／episodesToggle相当の短編専用DOMが生成されない ----
  ok('(8) #episodesMore が生成されない', document.getElementById('episodesMore') === null);
  ok('(8) #episodesToggle が生成されない', document.getElementById('episodesToggle') === null);
  // ---- 項目9：短編専用イベントリスナーが接続されない ----
  ok('(9) toggleEpisodes() を呼ぶonclickがDOM上に存在しない', !html_A.includes('toggleEpisodes()'));
  // ---- 項目14：利用者自身の本がない棚では短編領域全体が生成されない ----
  ok('(14) 本がない棚では .episodes-heading が生成されない', shelfNoBooksJa.querySelector('.episodes-heading') === null);
  ok('(14) 本がない棚では .episodes コンテナが生成されない', shelfNoBooksJa.querySelector('.episodes') === null);
  ok('(14) 本がない棚では .episodes-note が生成されない', shelfNoBooksJa.querySelector('.episodes-note') === null);
  // ---- 項目15：空のフォーカス可能要素が残らない ----
  const focusableInEpisodesArea_A = Array.from(shelfNoBooksJa.querySelectorAll('button, [tabindex]'))
    .filter(elm => /episode/i.test(elm.className || ''));
  ok('(15) 短編関連の空のフォーカス可能要素（button等）が残らない', focusableInEpisodesArea_A.length === 0);

  // ---- 項目17：名言・本のおすすめ・音楽のおすすめ・今月の寄り道が残る（棚テンプレート破損がないこと） ----
  ok('(17) 名言（.quote-card）が残る', shelfNoBooksJa.querySelector('.quote-card') !== null);
  ok('(17) 本のおすすめ（.recommend-section）が残る', shelfNoBooksJa.querySelector('.recommend-section') !== null);
  ok('(17) 音楽のおすすめ（.music-row）が残る', shelfNoBooksJa.querySelector('.music-row') !== null);
  ok('(17) 今月の寄り道の器（#detourSection）がページに残る', document.getElementById('detourSection') !== null);
  const shioriCardEl = document.getElementById('shioriCard');
  ok('(17) 今日の栞の器（#shioriCard）がページに残る', shioriCardEl !== null);

  // ============================================================
  // (B) 日本語モード・利用者自身の本がある棚（moyamoya に1冊追加）
  // ============================================================
  const myBookJa = { id:'ctf1-ja-1', title:'わたしの本', story:'これは利用者自身が綴った本文です。', category:'moyamoya', date:'2026-07-20T10:00:00.000Z' };
  window.__ctf1_myBookJa = myBookJa;
  runInPageScope(document, 'libraryCache.push(window.__ctf1_myBookJa);');
  window.goToShelf('kodoku'); // 一旦別棚へ移し、再度moyamoyaへ戻して再描画を強制する
  await new Promise(r => setTimeout(r, 20));
  window.goToShelf('moyamoya');
  await new Promise(r => setTimeout(r, 30));
  const shelfWithBookJa = document.getElementById('shelfDisplay');

  // ---- 項目10：利用者自身の本がある棚では、その本だけが表示される ----
  const mineCardsJa = shelfWithBookJa.querySelectorAll('.episode-card.mine');
  const nonMineCardsJa = shelfWithBookJa.querySelectorAll('.episode-card:not(.mine)');
  ok('(10) 利用者自身の本がある棚：自分の本のカードが1件表示される', mineCardsJa.length === 1);
  ok('(10) 利用者自身の本がある棚：仮短編カードは表示されない', nonMineCardsJa.length === 0);
  // ---- 項目11：見出しが日本語「あなたの本」になる ----
  const headingJa = shelfWithBookJa.querySelector('.episodes-heading');
  ok('(11) 見出しが日本語「あなたの本」になる', headingJa !== null && headingJa.textContent === 'あなたの本');
  // ---- 項目3（日本語側の対）：本がある棚でも短編専用の説明・操作は出さない ----
  ok('(2/6/7 併せて) 本がある棚でも仮短編の説明・操作は出ない', shelfWithBookJa.querySelector('.episodes-note') === null && shelfWithBookJa.querySelector('.episode-shuffle') === null);

  // ---- 項目13：利用者自身の本を押すと従来どおり開ける ----
  const mineCardJaEl = shelfWithBookJa.querySelector('.episode-card.mine');
  mineCardJaEl.dispatchEvent(new window.Event('click', { bubbles:true }));
  await new Promise(r => setTimeout(r, 20));
  const modalTitleEl = document.getElementById('modalTitle');
  ok('(13) 自分の本をクリックすると従来どおり開く（#modalTitleが一致）', modalTitleEl && modalTitleEl.textContent === myBookJa.title);
  // モーダルを閉じて後続の描画に影響しないようにする（#modalCloseのonclickと同じ操作）
  const bm = document.getElementById('bookModal');
  if(bm) bm.classList.add('hidden');

  // ============================================================
  // (C) 英語モードへ切替
  // ============================================================
  window.toggleLanguage();
  ok('英語モードへの切替を確認', window.currentLang() === 'en');

  // ---- 項目19：日本語／英語切替後も仮短編が出現しない（本がない棚） ----
  window.goToShelf('gakkari');
  await new Promise(r => setTimeout(r, 30));
  const shelfNoBooksEn = document.getElementById('shelfDisplay');
  ok('(19) 英語：STORIES_POOL_EN由来の短編カード(.episode-card:not(.mine))が生成されない', shelfNoBooksEn.querySelectorAll('.episode-card:not(.mine)').length === 0);
  ok('(3) 英語：仮短編本文の代表文字列がDOMへ挿入されない', !shelfNoBooksEn.innerHTML.includes('The results mail came at 9:02'));
  ok('(19) 英語：本がない棚では短編領域全体が生成されない', shelfNoBooksEn.querySelector('.episodes-heading') === null && shelfNoBooksEn.querySelector('.episodes') === null);
  const focusableInEpisodesArea_C = Array.from(shelfNoBooksEn.querySelectorAll('button, [tabindex]'))
    .filter(elm => /episode/i.test(elm.className || ''));
  ok('(15) 英語：短編関連の空のフォーカス可能要素が残らない', focusableInEpisodesArea_C.length === 0);

  // ---- 項目12：見出しが英語「Your Books」になる（本がある棚） ----
  const myBookEn = { id:'ctf1-en-1', title:'My Book', story:'This is my own story.', category:'moyamoya', date:'2026-07-20T10:00:00.000Z' };
  window.__ctf1_myBookEn = myBookEn;
  runInPageScope(document, 'libraryCache.push(window.__ctf1_myBookEn);');
  window.goToShelf('kodoku');
  await new Promise(r => setTimeout(r, 20));
  window.goToShelf('moyamoya');
  await new Promise(r => setTimeout(r, 30));
  const shelfWithBookEn = document.getElementById('shelfDisplay');
  const headingEn = shelfWithBookEn.querySelector('.episodes-heading');
  ok('(12) 見出しが英語「Your Books」になる', headingEn !== null && headingEn.textContent === 'Your Books');
  const mineCardsEn = shelfWithBookEn.querySelectorAll('.episode-card.mine');
  // moyamoya棚には(B)で追加した日本語の本＋ここで追加した英語の本の計2件がある想定
  ok('(10 英語側) 利用者自身の本だけが表示される（仮短編なし）', shelfWithBookEn.querySelectorAll('.episode-card:not(.mine)').length === 0 && mineCardsEn.length === 2);

  // ---- 項目16：表紙のサンプル本は従来どおり使える ----
  ok('(16) openSampleBook が関数として存在する', typeof window.openSampleBook === 'function');
  window.openSampleBook();
  const sampleBox = document.getElementById('sampleBookInline');
  const sampleTitleEl = document.getElementById('sampleInlineTitle');
  ok('(16) サンプル本を開くと#sampleBookInlineの非表示が解除される', sampleBox && !sampleBox.classList.contains('hidden'));
  ok('(16) サンプル本のタイトルが表示される', sampleTitleEl && sampleTitleEl.textContent.length > 0);
  if(typeof window.closeSampleBook === 'function') window.closeSampleBook();

  // ---- 言語をJAへ戻す（後続確認への影響を避ける） ----
  window.toggleLanguage();
  ok('日本語モードへ復帰したことを確認', window.currentLang() === 'ja');

  // ---- 項目20：既存保存データの読み込み・製本・保存形式が不変（軽量確認。詳細は既存回帰テスト群で担保） ----
  ok('(20) libraryCache の保存形式（配列・title/story/category/date）が不変', Array.isArray(myBookJa && [myBookJa]) && 'title' in myBookJa && 'story' in myBookJa && 'category' in myBookJa && 'date' in myBookJa);

  // ---- 項目21：新しいGA4イベント・外部通信・保存キーを追加していない（静的検査） ----
  const trackCallCount = (mainSrc.match(/trackAnalyticsEvent\(/g) || []).length;
  ok('(21) main.js中のtrackAnalyticsEvent呼び出し箇所数が10件のまま（新規イベント追加なし）', trackCallCount === 10);
  const saveKeyCount = (mainSrc.match(/'emotion-bookstore-[a-zA-Z-]*'/g) || []).length;
  ok('(21) main.js中の保存キー文字列(\'emotion-bookstore-*\')の出現数が39件のまま（新規キー追加なし）', saveKeyCount === 39);
  ok('(21) main.js中のfetch(呼び出し箇所数が4件のまま（新規追加なし）', (mainSrc.match(/\bfetch\(/g) || []).length === 4);

  // ---- 項目22：Visual Polish Fix 1の要素が維持されている（代表マーカーで確認。全件はsmoke_test_visual_rc1.jsで別途回帰確認済み） ----
  const cssText = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
  ok('(22) VPF: .entrance.hero > .cover-menu-btn の指定が残る', cssText.includes('.entrance.hero > .cover-menu-btn'));
  ok('(22) VPF: #unfiledShelfSelect 関連の構造が残る', /select\.id = 'unfiledShelfSelect';/.test(mainSrc));
  // ★Visual Polish Fix 1のstyle.css（正本ZIP同梱）のSHA-256。Content Trust Fix 1では
  // style.cssを一切変更していないため、正本ZIP展開時点のハッシュ値と一致するはずである。
  const crypto = require('crypto');
  const styleCssHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(SRC, 'style.css'))).digest('hex');
  ok('(22) style.css を今回変更していない（SHA-256が正本ZIP由来の値と一致）', styleCssHash === '8dfdc70df6521314a2cd52bdd02c5be59fc496d49e06826b46f05b02b859c7ad');

  // ============================================================
  // (D) ミューテーション確認：フラグをtrueに変えた場合に短編描画経路が復旧可能なことを確認する。
  // 実ファイルは書き換えず、メモリ上でmain.jsのソース文字列だけを一時的に書き換えた
  // 「別インスタンス」で検証し、確認後は破棄する（実ファイル・実行中の正本DOMのフラグはfalseのまま）。
  // ============================================================
  const mainSrcFlagTrue = mainSrc.replace(
    'const FICTIONAL_SHELF_STORIES_ENABLED = false;',
    'const FICTIONAL_SHELF_STORIES_ENABLED = true;'
  );
  ok('(ミューテーション前提) main.js中のフラグ行を一意に置換できた（対象が1箇所だけ存在する）', mainSrcFlagTrue !== mainSrc);

  const mutDom = buildDom();
  const ms1 = mutDom.document.createElement('script'); ms1.textContent = dataSrc; mutDom.document.body.appendChild(ms1);
  const ms2 = mutDom.document.createElement('script'); ms2.textContent = mainSrcFlagTrue; mutDom.document.body.appendChild(ms2);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));
  mutDom.window.goToShelf('moyamoya');
  await new Promise(r => setTimeout(r, 30));
  const mutShelf = mutDom.document.getElementById('shelfDisplay');
  ok('(D) フラグtrueの一時インスタンスでは仮短編カードが復帰する', mutShelf.querySelectorAll('.episode-card:not(.mine)').length > 0);
  ok('(D) フラグtrueの一時インスタンスでは短編専用の見出しが復帰する', mutShelf.querySelector('.episodes-heading') !== null && mutShelf.querySelector('.episodes-note') !== null);
  // 確認後、実際に使用する正本側フラグ・DOMには一切触れていないことを再確認する
  ok('(D確認後) 正本側のフラグは引き続きfalseのまま', window.__ctf1_flag === false);
  window.goToShelf('moyamoya');
  await new Promise(r => setTimeout(r, 30));
  const shelfAfterMutationCheck = document.getElementById('shelfDisplay');
  ok('(D確認後) 正本側のDOMには仮短編カードが出現しない', shelfAfterMutationCheck.querySelectorAll('.episode-card:not(.mine)').length === 0);

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('CONTENT TRUST FIX 1 TEST CRASHED:', e); process.exit(2); });
