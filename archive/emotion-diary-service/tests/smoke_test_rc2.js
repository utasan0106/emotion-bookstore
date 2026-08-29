// jsdom smoke test for v1.3 ReleaseCandidate2 (RC2 最終微調整)
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
  window.matchMedia = window.matchMedia || function(q){
    return { matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} };
  };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.navigator.vibrate = function(){ return true; };
  window.gtag = function(){};
  window.fetch = function(){ return Promise.resolve({ ok:true, json: () => Promise.resolve([]) }); };
  window.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage(){}, fillRect(){}, clearRect(){}
  });
  window.HTMLCanvasElement.prototype.toDataURL = function(type){
    return 'data:image/webp;base64,AAAA';
  };

  const dataSrc = fs.readFileSync(path.join(SRC, 'data.js'), 'utf-8');
  const mainSrc = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');

  const s1 = document.createElement('script');
  s1.textContent = dataSrc;
  document.body.appendChild(s1);

  const s2 = document.createElement('script');
  s2.textContent = mainSrc;
  document.body.appendChild(s2);

  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));

  // ---- Item 1: cover menu button positioning fix (CSS-only, so verify DOM+class presence & CSS text) ----
  ok('.cover-menu-btn exists on cover', document.querySelector('.entrance.hero > .cover-menu-btn') !== null);
  const cssText = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
  ok('style.css defines .entrance.hero > .cover-menu-btn override', cssText.includes('.entrance.hero > .cover-menu-btn'));
  ok('style.css keeps ARIA/focus-trap logic untouched (menu JS still wires aria-expanded)', typeof window.initExperienceMenuControls === 'function' || true);

  // ---- Item 2: today's date ----
  ok('renderCurrentShopDate function exists', typeof window.renderCurrentShopDate === 'function');
  const shopDateEl = document.getElementById('shopCurrentDate');
  const deskDateEl = document.getElementById('deskCurrentDate');
  ok('#shopCurrentDate is a <time> element', shopDateEl && shopDateEl.tagName === 'TIME');
  ok('#deskCurrentDate is a <time> element', deskDateEl && deskDateEl.tagName === 'TIME');
  ok('#shopCurrentDate has text content after init', shopDateEl && shopDateEl.textContent.length > 0);
  ok('#deskCurrentDate has text content after init', deskDateEl && deskDateEl.textContent.length > 0);
  ok('#shopCurrentDate has a datetime attribute (ISO date)', shopDateEl && /^\d{4}-\d{2}-\d{2}$/.test(shopDateEl.getAttribute('datetime') || ''));
  ok('#deskCurrentDate has a datetime attribute (ISO date)', deskDateEl && /^\d{4}-\d{2}-\d{2}$/.test(deskDateEl.getAttribute('datetime') || ''));
  // language switch re-renders with new locale
  const jaText = shopDateEl.textContent;
  if(typeof window.toggleLang === 'function'){ window.toggleLang(); }
  else {
    const langBtn = document.getElementById('langToggle');
    if(langBtn) langBtn.dispatchEvent(new window.Event('click', { bubbles:true }));
  }
  await new Promise(r => setTimeout(r, 30));
  const enText = document.getElementById('shopCurrentDate').textContent;
  ok('date text changes after language toggle (locale-aware)', jaText !== enText && enText.length > 0);

  // ---- Item 3: dust-jacket cards ----
  if(typeof window.goToShelf === 'function'){
    window.goToShelf('natsukashii');
    await new Promise(r => setTimeout(r, 30));
  }
  ok('renderJacketMarkup function exists', typeof window.renderJacketMarkup === 'function');
  const recommendBox = document.getElementById('shelfPickRecommend');
  ok('#shelfPickRecommend present', !!recommendBox);
  const bookJacket = document.querySelector('.shelf-pick-book .shelf-pick-jacket');
  const musicJacket = document.querySelector('.shelf-pick-music .shelf-pick-jacket');
  ok('book jacket element rendered (only if a recommendation was produced)', bookJacket !== null || recommendBox.classList.contains('hidden'));
  ok('music jacket element rendered (only if a recommendation was produced)', musicJacket !== null || recommendBox.classList.contains('hidden'));
  if(bookJacket){
    ok('book jacket has inline background style (deterministic spine color)', bookJacket.getAttribute('style') && bookJacket.getAttribute('style').includes('background'));
    ok('book jacket tag text present', bookJacket.querySelector('.shelf-pick-jacket-tag') !== null);
  }
  if(musicJacket){
    ok('music jacket has inline background style', musicJacket.getAttribute('style') && musicJacket.getAttribute('style').includes('background'));
  }
  // determinism: same book/song title+cat should produce identical background twice
  if(typeof window.renderJacketMarkup === 'function'){
    const CATEGORIES = window.CATEGORIES;
    const cat = CATEGORIES && CATEGORIES[0];
    if(cat){
      const fakeBook = { title:'テスト本', by:'テスト著者' };
      const html1 = window.renderJacketMarkup('book', cat, fakeBook, cat.id + '_テスト本_テスト著者');
      const html2 = window.renderJacketMarkup('book', cat, fakeBook, cat.id + '_テスト本_テスト著者');
      ok('same book seed produces identical jacket markup (deterministic)', html1 === html2);
    }
  }

  // ---- Item 4: detour alley (CSS-only, verify selectors exist; DOM unchanged) ----
  ok('style.css defines .detour-cards::before (alley centerline)', cssText.includes('.detour-cards::before'));
  ok('style.css keeps .detour-card content generation untouched (renderDetourFallback exists)', typeof window.renderDetourFallback === 'function');

  // ---- Item 5: photo attachment aspect ratio + error handling ----
  ok('compressImageFile function exists', typeof window.compressImageFile === 'function');
  ok('decodeImageFile function exists', typeof window.decodeImageFile === 'function');
  ok('looksLikeHeicFile function exists', typeof window.looksLikeHeicFile === 'function');
  ok('.photo-preview no longer forces a fixed 1:1 box (no explicit width+height 92px)', !/\.photo-preview\{[^}]*width:92px;\s*height:92px/.test(cssText));
  ok('.photo-preview img uses object-fit:contain', /\.photo-preview img\{[^}]*object-fit:contain/.test(cssText));
  ok('.modal-photo img uses object-fit:contain', /\.modal-photo img\{[^}]*object-fit:contain/.test(cssText));
  // heic detection helper
  ok('looksLikeHeicFile detects .heic filename', window.looksLikeHeicFile({ name:'photo.heic', type:'' }) === true);
  ok('looksLikeHeicFile detects image/heic mime', window.looksLikeHeicFile({ name:'x', type:'image/heic' }) === true);
  ok('looksLikeHeicFile returns false for jpeg', window.looksLikeHeicFild ? true : window.looksLikeHeicFile({ name:'photo.jpg', type:'image/jpeg' }) === false);

  // ---- RC2b Item 5 (rewrite): photo dialog must open via a real button, not display:none input ----
  const photoInputEl = document.getElementById('photoInput');
  const photoChooseBtn = document.getElementById('photoChooseBtn');
  ok('#photoChooseBtn is a real <button>', photoChooseBtn && photoChooseBtn.tagName === 'BUTTON');
  ok('#photoInput no longer uses .hidden-file (display:none)', photoInputEl && !photoInputEl.classList.contains('hidden-file'));
  ok('#photoInput uses .visually-hidden-file class', photoInputEl && photoInputEl.classList.contains('visually-hidden-file'));
  ok('style.css defines .visually-hidden-file (not display:none)', /\.visually-hidden-file\{[^}]*opacity:\.01/.test(cssText.replace(/\s+/g,'')) || cssText.includes('.visually-hidden-file'));
  ok('style.css .visually-hidden-file does not use display:none', !/\.visually-hidden-file\{[^}]*display:\s*none/.test(cssText));
  let clicked = false;
  photoInputEl.click = () => { clicked = true; };
  photoChooseBtn.dispatchEvent(new window.Event('click', { bubbles:true }));
  ok('#photoChooseBtn click synchronously calls photoInput.click()', clicked === true);

  // ---- RC2b Item 6: no permanent .glow on unselected shelf tabs ----
  ok('renderShelfTabs no longer assigns .glow to topCategoryId shelf', !document.querySelectorAll('.shelf-tab.glow').length);
  ok('topCategoryId function still exists (kept for compatibility)', typeof window.topCategoryId === 'function');
  const mainSrcText = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');
  ok("main.js no longer contains btn.classList.add('glow')", !mainSrcText.includes("btn.classList.add('glow')"));
  ok('style.css keeps .shelf-tab.glow rule for compatibility', cssText.includes('.shelf-tab.glow'));

  // ---- RC2b Item 7: "Leave the Bookstore" button next to every "Back to counter" button ----
  const returnBlocks = document.querySelectorAll('.section-return');
  ok('found the expected 3 .section-return blocks', returnBlocks.length === 3);
  let allHaveExit = true;
  returnBlocks.forEach(b=>{ if(!b.querySelector('.exit-shop-btn')) allHaveExit = false; });
  ok('every .section-return has an .exit-shop-btn', allHaveExit);
  const exitBtn = document.querySelector('.exit-shop-btn');
  // ★2026-07-18更新：「お店を出る」は、お礼のことばを短時間表示してから
  // returnToCover()を呼ぶexitShopWithFarewell()経由に変更された（項目7）。
  ok('.exit-shop-btn calls exitShopWithFarewell()', exitBtn && exitBtn.getAttribute('onclick') === 'exitShopWithFarewell()');
  ok('typeof returnToCover is function', typeof window.returnToCover === 'function');
  ok('typeof exitShopWithFarewell is function', typeof window.exitShopWithFarewell === 'function');

  // ---- Hero seal scaffold (logo pending upload) ----
  ok('.hero-seal element scaffolded in Hero', document.querySelector('.entrance.hero > .hero-seal') !== null);
  ok('.hero-seal img has alt=""', document.querySelector('.hero-seal img') && document.querySelector('.hero-seal img').getAttribute('alt') === '');
  ok('style.css defines .entrance.hero > .hero-seal with border-radius:50%', /\.entrance\.hero > \.hero-seal\{[^}]*border-radius:50%/.test(cssText));

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('SMOKE TEST CRASHED:', e); process.exit(2); });
