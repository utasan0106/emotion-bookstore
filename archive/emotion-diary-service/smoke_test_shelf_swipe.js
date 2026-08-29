// 感情の棚：スワイプ切替の実機不具合修正の検証テスト。
// jsdomのネイティブPointerEventを使い、iPhone Safari / Android Chrome相当の
// pointerType:'touch' なジェスチャーを模擬する。
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

  // ---- 基本構造の確認 ----
  const zone = document.getElementById('shelfSwipeZone');
  ok('#shelfSwipeZone exists and wraps #shelfTabs + #shelfDisplay', !!zone &&
    zone.querySelector('#shelfTabs') !== null && zone.querySelector('#shelfDisplay') !== null);
  ok('style.css defines touch-action:pan-y for .shelf-swipe-zone', (()=>{
    const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
    return /\.shelf-swipe-zone\{[^}]*touch-action:pan-y/.test(css);
  })());
  ok('window.PointerEvent is available in this test environment', typeof window.PointerEvent === 'function');
  ok('zone.dataset.swipeBound is set after setupShelfSwipe() (idempotent binding)', zone.dataset.swipeBound === '1');

  // 棚を開いて、タブが複数あることを確認
  window.goToPage('shelves');
  window.goToShelf('natsukashii');
  await new Promise(r => setTimeout(r, 30));
  const tabs = () => Array.from(document.querySelectorAll('#shelfTabs .shelf-tab'));
  ok('multiple shelf tabs are rendered', tabs().length >= 2);
  const activeTabId = () => {
    const t = document.querySelector('#shelfTabs .shelf-tab.active');
    return t ? t.dataset.catId : null;
  };
  ok('initial active tab is natsukashii', activeTabId() === 'natsukashii');

  function firePointerGesture({ x0, y0, x1, y1, target }){
    const el = target || zone;
    const down = new window.PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', clientX: x0, clientY: y0
    });
    el.dispatchEvent(down);
    const up = new window.PointerEvent('pointerup', {
      bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', clientX: x1, clientY: y1
    });
    el.dispatchEvent(up);
  }

  // ---- 1. 左スワイプ → 次の棚 ----
  const beforeLeft = activeTabId();
  const idsAll = tabs().map(t => t.dataset.catId);
  const expectedNextIdx = (idsAll.indexOf(beforeLeft) + 1) % idsAll.length;
  firePointerGesture({ x0: 300, y0: 200, x1: 240, y1: 205 }); // dx=-60, dy=5
  await new Promise(r => setTimeout(r, 20));
  ok('left swipe (60px, mostly horizontal) moves to the NEXT shelf tab',
    activeTabId() === idsAll[expectedNextIdx] && activeTabId() !== beforeLeft);

  // ---- 2. 右スワイプ → 前の棚（元に戻る）----
  const beforeRight = activeTabId();
  const expectedPrevIdx = (idsAll.indexOf(beforeRight) - 1 + idsAll.length) % idsAll.length;
  firePointerGesture({ x0: 240, y0: 200, x1: 300, y1: 195 }); // dx=+60, dy=-5
  await new Promise(r => setTimeout(r, 20));
  ok('right swipe (60px, mostly horizontal) moves to the PREVIOUS shelf tab',
    activeTabId() === idsAll[expectedPrevIdx] && activeTabId() !== beforeRight);

  // ---- 3. 縦スクロール（縦移動が優勢）→ 棚は変わらない ----
  const beforeVertical = activeTabId();
  firePointerGesture({ x0: 200, y0: 100, x1: 220, y1: 260 }); // dx=20, dy=160 → 横<縦*1.2
  await new Promise(r => setTimeout(r, 20));
  ok('a mostly-vertical gesture (scroll) does NOT change the shelf', activeTabId() === beforeVertical);

  // ---- 4. 横移動量不足（閾値未満）→ 棚は変わらない ----
  const beforeShort = activeTabId();
  firePointerGesture({ x0: 200, y0: 200, x1: 175, y1: 202 }); // dx=-25 (< 45px threshold)
  await new Promise(r => setTimeout(r, 20));
  ok('insufficient horizontal movement (25px < threshold) does NOT change the shelf', activeTabId() === beforeShort);

  // ---- 5. リンク／ボタン上から始まったジェスチャーはスワイプ対象外 ----
  const beforeInteractive = activeTabId();
  // #shelfSwipeZone配下にa/buttonが無い場合に備え、一時的なテスト用ボタンを注入する
  let testBtn = document.getElementById('__swipeTestBtn');
  if(!testBtn){
    testBtn = document.createElement('button');
    testBtn.id = '__swipeTestBtn';
    testBtn.type = 'button';
    testBtn.textContent = 'test';
    zone.appendChild(testBtn);
  }
  firePointerGesture({ x0: 300, y0: 200, x1: 240, y1: 202, target: testBtn }); // dx=-60、ボタン起点
  await new Promise(r => setTimeout(r, 20));
  ok('a gesture starting on a <button> (interactive element) does NOT change the shelf', activeTabId() === beforeInteractive);
  testBtn.remove();

  // ---- 6. GA4 view_shelf は実際に棚が変わった場合だけ送信される ----
  const beforeGaCount = gaCalls.filter(c => c[0] === 'event' && c[1] === 'view_shelf').length;
  const beforeGaShelf = activeTabId();
  firePointerGesture({ x0: 300, y0: 200, x1: 230, y1: 200 }); // 有効な左スワイプ
  await new Promise(r => setTimeout(r, 20));
  const afterGaShelfChanged = activeTabId() !== beforeGaShelf;
  const afterGaCount = gaCalls.filter(c => c[0] === 'event' && c[1] === 'view_shelf').length;
  ok('a successful swipe that changes shelf sends exactly one view_shelf event',
    afterGaShelfChanged && (afterGaCount - beforeGaCount) === 1);

  // 変化なしジェスチャー（閾値未満）ではview_shelfが送られないことも確認
  const gaCountBeforeNoChange = gaCalls.filter(c => c[0] === 'event' && c[1] === 'view_shelf').length;
  firePointerGesture({ x0: 200, y0: 200, x1: 190, y1: 201 }); // dx=-10, 閾値未満
  await new Promise(r => setTimeout(r, 20));
  const gaCountAfterNoChange = gaCalls.filter(c => c[0] === 'event' && c[1] === 'view_shelf').length;
  ok('a gesture below threshold does not send an extra view_shelf event',
    gaCountAfterNoChange === gaCountBeforeNoChange);

  // ---- 7. スワイプ成立直後の合成クリックは抑止される ----
  const beforeClickTest = activeTabId();
  let outsideClickFired = false;
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.id = '__swipeClickMarker';
  marker.onclick = () => { outsideClickFired = true; };
  zone.appendChild(marker);
  firePointerGesture({ x0: 300, y0: 200, x1: 230, y1: 200 }); // 有効なスワイプ（ここではmarker起点ではない）
  await new Promise(r => setTimeout(r, 5));
  // スワイプ直後、同じズーム内でmarkerへの合成clickが飛んできても抑止されることを確認
  const clickEvt = new window.MouseEvent('click', { bubbles:true, cancelable:true });
  marker.dispatchEvent(clickEvt);
  ok('a click dispatched immediately after a successful swipe is suppressed',
    outsideClickFired === false);
  marker.remove();

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('SWIPE TEST CRASHED:', e); process.exit(2); });
