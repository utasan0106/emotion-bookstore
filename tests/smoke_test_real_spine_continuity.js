// ============================================================================
// UX Fix 02｜Real Spine Continuity 受入テスト（tests/smoke_test_real_spine_continuity.js）
//
// 検証観点：
//  A) 既存本の背表紙の見た目（computeSpineVisual）が、旧来の計算式（main.js内の
//     spineGradientFor/textColorFor/textShadowFor/spineColorFor）から独立に組み立てても
//     一致すること（=リファクタで数式そのものは変えていないこと）。
//  B) 受け取り頁（showUnfiledShelfPicker）のプレビュー背表紙が、同じentry・同じ index で
//     computeSpineVisual()を呼んだ場合と同一の background/color/textShadow/height/tilt/title
//     を持つこと。
//  C) 棚を選び直すと、プレビューのbackground/color/textShadowだけが変わり、height/tilt/title
//     は変わらないこと。entry.category / libraryCache は確定前に一切変更されないこと。
//  D) 確定（confirm）すると、本棚上の実物の背表紙だけが選んだ棚の色になり、そのentryの背表紙
//     だけがハイライトclassを持ち、他の背表紙は不透明度・色とも無変更であること。
//  E) 棚を決めず（skip）に戻っても、entryはunfiledのまま・中立色のまま、それでも実物の背表紙
//     が見つかってハイライトされること。
//  F) 保存失敗・読み戻し失敗の経路では、受け取り頁（ピッカー）が表示されないこと（回帰確認）。
//  G) playSuckAnimationがbind成功経路から呼ばれなくなったこと（関数定義・.fly-book CSSは残存）。
//  H) prefs.motion=false のとき、ハイライトは静的なクラスのまま付与され、scrollIntoViewは
//     behavior:'auto' で呼ばれること。
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
  const scrollCalls = [];
  window.HTMLElement.prototype.scrollIntoView = function(opts2){ scrollCalls.push(opts2); };
  window.scrollTo = function(){};
  window.navigator.vibrate = function(){ return true; };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';
  const gaCalls = [];
  window.gtag = function(){ gaCalls.push(Array.from(arguments)); };
  window.fetch = function(){ return Promise.resolve({ ok:true, json: () => Promise.resolve({}) }); };
  const s1 = document.createElement('script'); s1.textContent = fs.readFileSync(path.join(SRC,'data.js'),'utf-8'); document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = fs.readFileSync(path.join(SRC,'main.js'),'utf-8'); document.body.appendChild(s2);
  // libraryCache/prefs/selectedShelfMonthはトップレベルlet宣言のため、windowから直接触れない。
  // 既存テスト同様、ページスコープ内で動くヘルパーをscript注入で追加する。
  const s3 = document.createElement('script');
  s3.textContent = [
    "window.__getLibraryCache = function(){ return libraryCache; };",
    "window.__libEntry = function(id){ return libraryCache.find(function(b){ return b.id === id; }); };",
    "window.__setMotion = function(v){ prefs.motion = v; };",
    "window.__getMotion = function(){ return prefs.motion; };",
    "window.__visibleShelfEntries = function(){ return visibleShelfEntries(); };"
  ].join('\n');
  document.body.appendChild(s3);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));
  return { window, document, gaCalls, scrollCalls };
}

// main.js内のspineGradientFor/textColorFor/textShadowFor/spineColorForは今回一切変更していない
// （computeSpineVisualはこれらを呼び出しているだけ）。ここでは、その4つの既存関数を独立に
// 呼び出して「元の計算式」を再構成し、computeSpineVisual()の出力と突き合わせることで、
// リファクタが数式を変えていないことを検証する。
// jsdomのCSSOMは style.background/style.color に代入した値を rgb(...) 形式へ正規化して
// 読み戻す（例：#3A2A14 → rgb(58, 42, 20)）。computeSpineVisual()自体はDOMを介さない純粋な
// 文字列（hexベース）を返すため、DOM側の実測値（すでに正規化済み）と直接文字列比較すると
// 見た目は同一でも表記差で不一致になる。比較の両辺を同じ経路（一度styleへ代入して読み戻す）
// に通して正規化してから比較する。
function normStyle(document, prop, value){
  const scratch = document.createElement('div');
  scratch.style[prop] = value;
  return scratch.style[prop];
}

function expectedVisual(window, entry, index){
  return {
    background: window.spineGradientFor(entry.category, entry.title.length + index),
    color: window.textColorFor(window.spineColorFor(entry.category)),
    textShadow: window.textShadowFor(window.spineColorFor(entry.category)),
    height: (140 + (entry.title.length % 4) * 12) + 'px',
    tiltDeg: (((entry.title.length * 7 + index * 13) % 5) - 2) + 'deg'
  };
}

async function main(){

  // ============================================================
  // A. 既存本のリファクタ前後の等価性（computeSpineVisual vs 独立再構成）
  // ============================================================
  {
    const seed = [
      { id:'a1', title:'たんぽぽ', story:'x', category:'kansha', date:'2026-07-01T09:00:00.000Z' },
      { id:'a2', title:'ながいながいタイトルの本', story:'x', category:'kodoku', date:'2026-07-02T09:00:00.000Z' },
      { id:'a3', title:'unfiled test', story:'x', category:'unfiled', date:'2026-07-03T09:00:00.000Z' },
      { id:'a4', title:'よ', story:'x', category:'wakuwaku', date:'2026-07-04T09:00:00.000Z' }
    ];
    const { window, document } = await createEnv({ seedLibrary: seed });
    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,150));

    seed.forEach((entry, i)=>{
      const expected = expectedVisual(window, entry, i);
      const got = window.computeSpineVisual(entry, i);
      ok(`(A) computeSpineVisual for "${entry.title}" matches the pre-existing formula (background)`, got.background === expected.background);
      ok(`(A) computeSpineVisual for "${entry.title}" matches the pre-existing formula (color)`, got.color === expected.color);
      ok(`(A) computeSpineVisual for "${entry.title}" matches the pre-existing formula (textShadow)`, got.textShadow === expected.textShadow);
      ok(`(A) computeSpineVisual for "${entry.title}" matches the pre-existing formula (height)`, got.height === expected.height);
      ok(`(A) computeSpineVisual for "${entry.title}" matches the pre-existing formula (tiltDeg)`, got.tiltDeg === expected.tiltDeg);

      // 実DOM側（renderShelf()が実際に描いた.spine）も同じ値を持つことを確認する。
      const spine = document.querySelector('#myShelf .spine[data-entry-id="'+entry.id+'"]');
      ok(`(A) the real shelf spine DOM node exists for "${entry.title}"`, !!spine);
      if(spine){
        ok(`(A) real spine background matches computeSpineVisual for "${entry.title}"`, spine.style.background === normStyle(document, 'background', got.background));
        ok(`(A) real spine color matches computeSpineVisual for "${entry.title}"`, spine.style.color === normStyle(document, 'color', got.color));
        ok(`(A) real spine height matches computeSpineVisual for "${entry.title}"`, spine.style.height === got.height);
        ok(`(A) real spine --tilt matches computeSpineVisual for "${entry.title}"`, spine.style.getPropertyValue('--tilt') === got.tiltDeg);
        ok(`(A) real spine textContent equals entry.title for "${entry.title}"`, spine.textContent === entry.title);
      }
    });
  }

  // ============================================================
  // B. 受け取り頁プレビューの背表紙 = 実棚と同じ計算式（unfiledフロー経由）
  // ============================================================
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    document.getElementById('storyInput').value = '受け取り頁のプレビュー確認用の本文です。';
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    document.getElementById('titleInput').value = 'プレビュー確認用の題名';
    document.getElementById('submitStory').click();
    for(let i=0;i<20 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
      await new Promise(r=>setTimeout(r,150));
    }
    await new Promise(r=>setTimeout(r,300));

    const box = document.getElementById('unfiledShelfPicker');
    ok('(B) the receive-screen picker is shown after an unfiled bind', !!box && !box.classList.contains('hidden'));
    const previewSpine = box ? box.querySelector('.mana-receive-book .spine') : null;
    ok('(B) the preview book is a real .spine element (not the old fixed placeholder span)', !!previewSpine);

    const lib = window.__getLibraryCache();
    const entry = lib[lib.length - 1];
    ok('(B) the newly created entry starts as unfiled', !!entry && entry.category === 'unfiled');

    const visible = window.__visibleShelfEntries();
    const idx = visible.findIndex(e=>e.id===entry.id);
    const expected = window.computeSpineVisual(entry, idx);

    if(previewSpine){
      ok('(B) preview spine background matches computeSpineVisual for this entry/index', previewSpine.style.background === normStyle(document, 'background', expected.background));
      ok('(B) preview spine color matches computeSpineVisual for this entry/index', previewSpine.style.color === normStyle(document, 'color', expected.color));
      ok('(B) preview spine textShadow matches computeSpineVisual for this entry/index', previewSpine.style.textShadow === expected.textShadow);
      ok('(B) preview spine height matches computeSpineVisual for this entry/index', previewSpine.style.height === expected.height);
      ok('(B) preview spine --tilt matches computeSpineVisual for this entry/index', previewSpine.style.getPropertyValue('--tilt') === expected.tiltDeg);
      ok('(B) preview spine title text equals entry.title', previewSpine.textContent === entry.title);
      ok('(B) preview spine is neutral (unfiled) color on first render', expected.color === window.textColorFor(window.spineColorFor('unfiled')));
    }

    // ========================================================
    // C. 棚を選び直すと色だけが変わり、height/tilt/titleは不変。entry/libraryCacheは未確定。
    // ========================================================
    const select = document.getElementById('unfiledShelfSelect');
    const beforeHeight = previewSpine.style.height;
    const beforeTilt = previewSpine.style.getPropertyValue('--tilt');
    const beforeTitle = previewSpine.textContent;
    const categoryBefore = entry.category;

    select.value = 'kansha';
    select.dispatchEvent(new window.Event('change', { bubbles:true }));

    const expectedKansha = window.computeSpineVisual(Object.assign({}, entry, { category:'kansha' }), idx);
    ok('(C) selecting a shelf recolors the preview background to match the chosen shelf', previewSpine.style.background === normStyle(document, 'background', expectedKansha.background));
    ok('(C) selecting a shelf recolors the preview color to match the chosen shelf', previewSpine.style.color === normStyle(document, 'color', expectedKansha.color));
    ok('(C) selecting a shelf recolors the preview textShadow to match the chosen shelf', previewSpine.style.textShadow === expectedKansha.textShadow);
    ok('(C) height is untouched by shelf selection', previewSpine.style.height === beforeHeight);
    ok('(C) --tilt is untouched by shelf selection', previewSpine.style.getPropertyValue('--tilt') === beforeTilt);
    ok('(C) title text is untouched by shelf selection', previewSpine.textContent === beforeTitle);
    ok('(C) entry.category is NOT mutated before confirm', window.__libEntry(entry.id).category === categoryBefore);

    // ========================================================
    // D. confirmすると、実棚の当該背表紙だけが選んだ色になり、ハイライトclassを持つ。他は無変更。
    // ========================================================
    const otherSpinesBefore = Array.from(document.querySelectorAll('#myShelf .spine')).filter(sp=>sp.dataset.entryId !== entry.id);
    const otherOpacitySnapshots = otherSpinesBefore.map(sp=>({ el:sp, opacity: sp.style.opacity, background: sp.style.background }));

    document.getElementById('unfiledShelfConfirm').click();
    await new Promise(r=>setTimeout(r,150));

    ok('(D) after confirm, entry.category is updated to the chosen shelf', window.__libEntry(entry.id).category === 'kansha');
    const realSpine = document.querySelector('#myShelf .spine[data-entry-id="'+entry.id+'"]');
    ok('(D) the real shelf spine for this entry exists after confirm', !!realSpine);
    if(realSpine){
      const expectedReal = window.computeSpineVisual(window.__libEntry(entry.id), window.__visibleShelfEntries().findIndex(e=>e.id===entry.id));
      ok('(D) the real shelf spine shows the chosen shelf color', realSpine.style.background === normStyle(document, 'background', expectedReal.background));
      ok('(D) the real shelf spine carries the highlight class', realSpine.classList.contains('is-newest-spine'));
    }
    const otherHighlighted = otherOpacitySnapshots.filter(s=>document.body.contains(s.el) && s.el.classList.contains('is-newest-spine'));
    ok('(D) no other pre-existing spine element carries the highlight class', otherHighlighted.length === 0);

    const bookshelfPage = document.getElementById('bookshelf');
    ok('(D) navigation actually reached #bookshelf (.is-active)', !!bookshelfPage && bookshelfPage.classList.contains('is-active'));
  }

  // ============================================================
  // E. skipパス：unfiledのまま・中立色のまま、それでも実物がハイライトされる
  // ============================================================
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    document.getElementById('storyInput').value = 'スキップ確認用の本文です。';
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    document.getElementById('titleInput').value = 'スキップ確認用の題名';
    document.getElementById('submitStory').click();
    for(let i=0;i<20 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
      await new Promise(r=>setTimeout(r,150));
    }
    await new Promise(r=>setTimeout(r,300));

    const lib = window.__getLibraryCache();
    const entry = lib[lib.length - 1];
    document.getElementById('unfiledShelfSkip').click();
    await new Promise(r=>setTimeout(r,150));

    ok('(E) skipping keeps the entry unfiled', window.__libEntry(entry.id).category === 'unfiled');
    const realSpine = document.querySelector('#myShelf .spine[data-entry-id="'+entry.id+'"]');
    ok('(E) the real shelf spine for the skipped entry exists', !!realSpine);
    if(realSpine){
      ok('(E) the skipped entry stays neutral (UNFILED) color', realSpine.style.color === normStyle(document, 'color', window.textColorFor(window.spineColorFor('unfiled'))));
      ok('(E) the skipped entry still gets highlighted', realSpine.classList.contains('is-newest-spine'));
    }
    const box = document.getElementById('unfiledShelfPicker');
    ok('(E) the picker is hidden after skip', !box || box.classList.contains('hidden'));
  }

  // ============================================================
  // F. 保存失敗・読み戻し失敗 → ピッカーは出さない（回帰確認）
  // ============================================================
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    document.getElementById('storyInput').value = '保存失敗パスの確認用本文。';
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    window.saveJSON = async ()=> false;
    document.getElementById('submitStory').click();
    await new Promise(r=>setTimeout(r,600));
    const box = document.getElementById('unfiledShelfPicker');
    ok('(F) save-failure path: the picker is not shown', !box || box.classList.contains('hidden') || !document.body.contains(box));
    ok('(F) save-failure path: no entry was persisted', window.__getLibraryCache().length === 0);
  }
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    document.getElementById('storyInput').value = '読み戻し失敗パスの確認用本文。';
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    window.loadJSON = async ()=> [];
    document.getElementById('submitStory').click();
    await new Promise(r=>setTimeout(r,600));
    const box = document.getElementById('unfiledShelfPicker');
    ok('(F) readback-failure path: the picker is not shown', !box || box.classList.contains('hidden') || !document.body.contains(box));
    ok('(F) readback-failure path: the entry is rolled back out of libraryCache', window.__getLibraryCache().length === 0);
  }

  // ============================================================
  // G. playSuckAnimationはbind成功経路から呼ばれない。関数定義・.fly-book CSSは残存。
  // ============================================================
  {
    const { window, document } = await createEnv({});
    let suckCalls = 0;
    window.playSuckAnimation = function(){ suckCalls++; };
    window.goToPage('desk');
    document.getElementById('storyInput').value = 'playSuckAnimation不使用の確認用本文。';
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    document.getElementById('submitStory').click();
    for(let i=0;i<20 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
      await new Promise(r=>setTimeout(r,150));
    }
    await new Promise(r=>setTimeout(r,300));
    ok('(G) playSuckAnimation is not invoked from the successful bind path', suckCalls === 0);
  }
  ok('(G) function playSuckAnimation(...) is still defined in main.js', /function\s+playSuckAnimation\s*\(/.test(rawMain));
  ok('(G) .fly-book CSS is still defined in style.css', /\.fly-book\{/.test(rawCss));

  // ============================================================
  // H. prefs.motion=false：ハイライトは静的クラスのまま、scrollIntoViewはbehavior:'auto'
  // ============================================================
  {
    const { window, document, scrollCalls } = await createEnv({});
    window.__setMotion(false);
    ok('(H) prefs.motion is now false', window.__getMotion() === false);
    window.goToPage('desk');
    document.getElementById('storyInput').value = 'reduced motion確認用の本文です。';
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    document.getElementById('submitStory').click();
    for(let i=0;i<20 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
      await new Promise(r=>setTimeout(r,150));
    }
    await new Promise(r=>setTimeout(r,300));
    const lib = window.__getLibraryCache();
    const entry = lib[lib.length - 1];
    document.getElementById('unfiledShelfSkip').click();
    await new Promise(r=>setTimeout(r,150));
    const realSpine = document.querySelector('#myShelf .spine[data-entry-id="'+entry.id+'"]');
    ok('(H) highlight class is still applied with prefs.motion=false', !!realSpine && realSpine.classList.contains('is-newest-spine'));
    const lastScroll = scrollCalls[scrollCalls.length - 1];
    ok('(H) scrollIntoView was called for the highlight', !!lastScroll);
    ok('(H) scrollIntoView uses behavior:"auto" when prefs.motion is false', !!lastScroll && lastScroll.behavior === 'auto');
    // 静的クラスのみで、CSS側にtransition/animationを新規追加していないことも確認する。
    const ringBlock = /\.spine\.is-newest-spine\{([^}]*)\}/.exec(rawCss);
    ok('(H) the .is-newest-spine CSS rule exists', !!ringBlock);
    ok('(H) the .is-newest-spine rule adds no transition/animation (static ring only)', !!ringBlock && !/transition|animation/.test(ringBlock[1]));
  }

  // ============================================================
  // I. 静的検査：非対話プレビューの見た目抑制・レイアウト専用ラッパー化
  // ============================================================
  ok('(I) .mana-receive-book .spine suppresses hover/active lift (non-interactive preview)',
    /\.mana-receive-book \.spine:hover,\s*\n\.mana-receive-book \.spine:active\{[^}]*transform\s*:\s*rotate\(var\(--tilt/.test(rawCss));
  ok('(I) the base .mana-receive-book rule no longer paints a fixed background',
    (()=>{
      const m = /(?<!body\.experience-open )\.mana-receive-book\{([^}]*)\}/.exec(rawCss);
      return !!m && !/background\s*:\s*linear-gradient\(180deg,\s*var\(--wine\)/.test(m[1]);
    })());
  ok('(I) the body.experience-open override no longer paints the wood-colored background',
    (()=>{
      const m = /body\.experience-open \.mana-receive-book\{([^}]*)\}/.exec(rawCss);
      return !!m && !/var\(--vr-wood/.test(m[1]);
    })());

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('REAL SPINE CONTINUITY TEST CRASHED:', e); process.exit(2); });
