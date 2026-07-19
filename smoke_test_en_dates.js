// 英語モードで本棚・本の詳細画面に残っていた日本語固定表示（formatDate／「以前を振り返って
// 綴った一冊」／月別タブの「すべて」／monthLabelOf()の年月表示／「日付不明」／「蔵書○冊」）の
// 修正を検証する専用テスト。要望どおり、(A) 異なる2か月の本を保存して月別タブを表示するケースと、
// (B) 本を開いて日付・振り返り表示を確認するケースを含む。
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
  window.gtag = function(){};
  window.fetch = function(){ return Promise.resolve({ ok:true, json: () => Promise.resolve([]) }); };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';

  const dataSrc = fs.readFileSync(path.join(SRC, 'data.js'), 'utf-8');
  const mainSrc = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');
  const s1 = document.createElement('script'); s1.textContent = dataSrc; document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = mainSrc; document.body.appendChild(s2);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));

  function runInPageScope(code){
    const s = document.createElement('script');
    s.textContent = code;
    document.body.appendChild(s);
  }

  // ============================================================
  // まず日本語モードのまま、従来どおりの表示を確認する（回帰確認）
  // ============================================================
  const sealedEntryJa = { id:'ja1', title:'JA本', story:'本文', category:'kanashii', date:'2026-05-10T10:00:00.000Z', sealed:true };
  window.__sealedEntryJa = sealedEntryJa;
  runInPageScope('libraryCache.push(window.__sealedEntryJa);');
  window.openBook(sealedEntryJa);
  const modalDateJa = document.getElementById('modalDate').textContent;
  ok('(JA) formatDate keeps the original "YYYY年M月D日 納品" style', /^2026年5月10日 納品/.test(modalDateJa));
  ok('(JA) sealed note keeps the original text', modalDateJa.includes('｜以前を振り返って綴った一冊'));

  // ============================================================
  // 英語へ切り替える
  // ============================================================
  window.toggleLanguage();
  ok('switched to English mode', window.currentLang() === 'en');

  // ---- (A) 異なる2か月の本を保存して月別タブを表示するケース ----
  const bookMay = { id:'en-may', title:'May Book', story:'story', category:'ureshii', date:'2026-05-12T10:00:00.000Z' };
  const bookJuly = { id:'en-jul', title:'July Book', story:'story', category:'natsukashii', date:'2026-07-15T10:00:00.000Z' };
  const bookUnknown = { id:'en-unknown', title:'No Date Book', story:'story', category:'fuan', date:'not-a-real-date' };
  window.__bookMay = bookMay; window.__bookJuly = bookJuly; window.__bookUnknown = bookUnknown;
  runInPageScope('libraryCache.push(window.__bookMay, window.__bookJuly, window.__bookUnknown);');
  window.renderShelf();

  const tabLabels = Array.from(document.querySelectorAll('#shelfMonthTabs .shelf-month-tab')).map(b=>b.textContent);
  ok('(EN) month tabs are rendered for 3+ books across different months', tabLabels.length >= 3);
  ok('(EN) the "All" tab reads "All (N)", not "すべて (N)"', tabLabels.some(t=>/^All \(\d+\)$/.test(t)));
  ok('(EN) no month tab uses the Japanese "すべて" label', !tabLabels.some(t=>t.includes('すべて')));
  ok('(EN) the May tab is formatted as "May 2026 (N)"', tabLabels.some(t=>/^May 2026 \(\d+\)$/.test(t)));
  ok('(EN) the July tab is formatted as "July 2026 (N)"', tabLabels.some(t=>/^July 2026 \(\d+\)$/.test(t)));
  ok('(EN) the invalid-date book gets a "Date Unknown" tab (not "日付不明")', tabLabels.some(t=>/^Date Unknown \(\d+\)$/.test(t)));

  const countBadge = document.getElementById('shelfCount').textContent;
  ok('(EN) the book-count badge reads "{n} books", not "蔵書 {n}冊"', /^\d+ books$/.test(countBadge));

  const headings = Array.from(document.querySelectorAll('#myShelf .shelf-month-heading')).map(h=>h.textContent);
  ok('(EN) month-group headings use the English "Month Year Shelf" format', headings.some(h=>/^July 2026 Shelf$/.test(h)));
  // ★2026-07-18更新：ご依頼により英語表現を「Shelf: Date Unknown」→「Undated Shelf」へ変更。
  ok('(EN) the unknown-date group heading reads "Undated Shelf"', headings.some(h=>h === 'Undated Shelf'));

  // ---- (B) 本を開いて日付・振り返り表示を確認するケース ----
  const sealedEntryEn = { id:'en-sealed', title:'Sealed EN Book', story:'story', category:'kanashii', date:'2026-07-18T10:00:00.000Z', sealed:true };
  window.__sealedEntryEn = sealedEntryEn;
  runInPageScope('libraryCache.push(window.__sealedEntryEn);');
  window.openBook(sealedEntryEn);
  const modalDateEn = document.getElementById('modalDate').textContent;
  ok('(EN) formatDate renders "July 18, 2026 · Delivered"', modalDateEn.startsWith('July 18, 2026 · Delivered'));
  ok('(EN) the sealed note is translated (not the Japanese "以前を振り返って綴った一冊")', modalDateEn.includes('A book written looking back on the past') && !modalDateEn.includes('以前を振り返って'));

  // 非sealedの本ではEN・JAどちらでも振り返り注記が付かないことも確認する
  const plainEntryEn = { id:'en-plain', title:'Plain EN Book', story:'story', category:'ureshii', date:'2026-07-01T10:00:00.000Z' };
  window.__plainEntryEn = plainEntryEn;
  runInPageScope('libraryCache.push(window.__plainEntryEn);');
  window.openBook(plainEntryEn);
  const modalDatePlainEn = document.getElementById('modalDate').textContent;
  ok('(EN) a non-sealed book shows no "looking back" note', !modalDatePlainEn.includes('looking back'));

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('EN DATES TEST CRASHED:', e); process.exit(2); });
