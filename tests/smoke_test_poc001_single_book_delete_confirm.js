// PoC Task 001 — 個別本削除の確認追加。
// #modalDel の直前に軽量な確認（native window.confirm、i18n化）を挟む。
// 1) cancel => 対象本・本棚状態は完全維持
// 2) confirm => 対象本のみ削除、他の本・お気に入り・バックアップは無変更
// 3) JP/EN双方の文言が用意されており、「本棚リセット」フローとは別物であること
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(l,c){ if(c){pass++;console.log('PASS:',l);}else{fail++;console.log('FAIL:',l);} }
function wrap(v){ return JSON.stringify({v:1,data:v}); }

async function createEnv(opts){
  opts=opts||{};
  let html=fs.readFileSync(path.join(SRC,'index.html'),'utf-8')
    .replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/,'').replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/,'');
  const dom=new JSDOM(html,{url:'https://example.com/',runScripts:'dangerously',resources:'usable',pretendToBeVisual:true});
  const {window}=dom,{document}=window;
  if(opts.seedLibrary) window.localStorage.setItem('emotion-bookstore-library',wrap(opts.seedLibrary));
  if(opts.seedBackup) window.localStorage.setItem('emotion-bookstore-backup',wrap(opts.seedBackup));
  window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){};window.scrollTo=function(){};window.navigator.vibrate=()=>true;
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';
  const gaCalls=[];window.gtag=function(){gaCalls.push([...arguments]);};
  const fetchLog=[];window.fetch=u=>{fetchLog.push(String(u));return Promise.resolve({ok:true,json:()=>Promise.resolve({})});};
  const s1=document.createElement('script');s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');document.body.appendChild(s1);
  const s2=document.createElement('script');s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');document.body.appendChild(s2);
  const s3=document.createElement('script');s3.textContent='window.__dumpMessages=function(){return MESSAGES;};';document.body.appendChild(s3);
  await new Promise(r=>setTimeout(r,300));await new Promise(r=>setTimeout(r,300));
  return {window,document,gaCalls,fetchLog};
}

async function main(){
  // ===== i18n: keys exist, are non-empty, and are distinct from the reset-bookshelf copy =====
  {
    const { window } = await createEnv({});
    const M = window.__dumpMessages();
    ok('MESSAGES.ja.modalDelConfirm exists and is non-empty', typeof M.ja.modalDelConfirm === 'string' && M.ja.modalDelConfirm.length > 0);
    ok('MESSAGES.en.modalDelConfirm exists and is non-empty', typeof M.en.modalDelConfirm === 'string' && M.en.modalDelConfirm.length > 0);
    ok('JA confirm text is not the reset-bookshelf copy', M.ja.modalDelConfirm !== M.ja.resetFinalTitle && M.ja.modalDelConfirm !== M.ja.resetIntroTitle);
    ok('EN confirm text is not the reset-bookshelf copy', M.en.modalDelConfirm !== M.en.resetFinalTitle && M.en.modalDelConfirm !== M.en.resetIntroTitle);
    ok('pre-existing modalDel button label key is untouched (JA)', M.ja.modalDel === 'この本を棚から下げる');
    ok('pre-existing modalDel button label key is untouched (EN)', M.en.modalDel === 'Remove this book from the shelf');
  }

  // ===== cancel: book and rest of shelf fully preserved, no storage write =====
  {
    const entries = [
      { id:'d1', title:'残す本1', story:'本文1', category:'kodoku', date:new Date().toISOString(), favorite:true },
      { id:'d2', title:'削除対象', story:'本文2', category:'kodoku', date:new Date().toISOString() },
      { id:'d3', title:'残す本2', story:'本文3', category:'ureshii', date:new Date().toISOString() },
    ];
    const backup = { entries: entries.map(e=>({...e})) };
    const { window, document } = await createEnv({ seedLibrary: entries, seedBackup: backup });
    const rawBefore = window.localStorage.getItem('emotion-bookstore-library');
    const backupBefore = window.localStorage.getItem('emotion-bookstore-backup');

    let confirmCalledWith = null;
    window.confirm = (msg)=>{ confirmCalledWith = msg; return false; };

    window.openBook(entries[1]);
    const mDel = document.getElementById('modalDel');
    ok('(cancel) #modalDel exists with an onclick handler wired', !!mDel && typeof mDel.onclick === 'function');
    await mDel.onclick();

    ok('(cancel) window.confirm was actually invoked before any deletion', confirmCalledWith !== null);
    ok('(cancel) the confirm message matches the JA i18n string (not a hardcoded ad-hoc string)', confirmCalledWith === window.__dumpMessages().ja.modalDelConfirm);
    ok('(cancel) localStorage emotion-bookstore-library is byte-for-byte unchanged', window.localStorage.getItem('emotion-bookstore-library') === rawBefore);
    ok('(cancel) localStorage emotion-bookstore-backup is untouched', window.localStorage.getItem('emotion-bookstore-backup') === backupBefore);
    const libAfter = JSON.parse(window.localStorage.getItem('emotion-bookstore-library')).data;
    ok('(cancel) all 3 books remain, including the target', libAfter.length === 3 && libAfter.some(e=>e.id==='d2'));
    ok('(cancel) the favorite flag on an unrelated book is untouched', libAfter.find(e=>e.id==='d1').favorite === true);
  }

  // ===== confirm: only the targeted book is deleted =====
  {
    const entries = [
      { id:'e1', title:'残す本1', story:'本文1', category:'kodoku', date:new Date().toISOString(), favorite:true },
      { id:'e2', title:'削除対象', story:'本文2', category:'kodoku', date:new Date().toISOString() },
      { id:'e3', title:'残す本2', story:'本文3', category:'ureshii', date:new Date().toISOString(), favorite:true },
    ];
    const backup = { entries: entries.map(e=>({...e})) };
    const { window, document } = await createEnv({ seedLibrary: entries, seedBackup: backup });
    const backupBefore = window.localStorage.getItem('emotion-bookstore-backup');

    window.confirm = ()=> true;

    window.openBook(entries[1]);
    const mDel = document.getElementById('modalDel');
    await mDel.onclick();

    const libAfter = JSON.parse(window.localStorage.getItem('emotion-bookstore-library')).data;
    ok('(confirm) exactly 2 books remain', libAfter.length === 2);
    ok('(confirm) the targeted book (e2) is gone', !libAfter.some(e=>e.id==='e2'));
    ok('(confirm) the other two books remain, untouched, favorites intact',
      libAfter.some(e=>e.id==='e1' && e.favorite===true) && libAfter.some(e=>e.id==='e3' && e.favorite===true));
    ok('(confirm) the backup store is not touched by single-book deletion', window.localStorage.getItem('emotion-bookstore-backup') === backupBefore);
    ok('(confirm) the modal is hidden after deletion', document.getElementById('bookModal').classList.contains('hidden'));
  }

  // ===== EN locale: confirmation text is in English and unambiguous =====
  {
    const entries = [
      { id:'f1', title:'Book A', story:'story', category:'kodoku', date:new Date().toISOString() },
      { id:'f2', title:'Book B', story:'story', category:'kodoku', date:new Date().toISOString() },
    ];
    const { window, document } = await createEnv({ seedLibrary: entries });
    window.toggleLanguage();

    let confirmMsg = null;
    window.confirm = (msg)=>{ confirmMsg = msg; return false; };
    window.openBook(entries[1]);
    const mDel = document.getElementById('modalDel');
    await mDel.onclick();

    const M = window.__dumpMessages();
    ok('(EN) confirm message matches MESSAGES.en.modalDelConfirm', confirmMsg === M.en.modalDelConfirm);
    ok('(EN) confirm message is in English (contains ascii letters, no raw JP)', /[a-zA-Z]/.test(confirmMsg) && !/[぀-ヿ一-鿿]/.test(confirmMsg));
    ok('(EN) cancel in EN mode leaves both books intact', JSON.parse(window.localStorage.getItem('emotion-bookstore-library')).data.length === 2);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('POC001 TEST CRASHED:', e); process.exit(2); });
