/* ============================================================
 * main.js — 対話ロジック・IndexedDB・番台制御など
 * 「みんなの感情書店」のロジック本体です。
 * data.js（BOOK_POOL, CATEGORIES, CHAT_TREE などのデータ）を
 * 先に読み込んだ後にこのファイルを読み込んでください。
 * <script src="data.js"></script>
 * <script src="main.js"></script>
 * ============================================================ */


// 大量の書籍プール（実在確認済みのタイトル・著者のみ）。ジャンル・テーマのタグで棚に緩く紐付ける。
// 1件ずつ「なぜこの本か」を書くのは非現実的なため、タグに応じた汎用の紹介文をrenderShelfDisplay側で生成する。
// 本文を解析して生成しているわけではないが、棚に合った言葉が並ぶことで「私のための一冊」に見えるようにしている。

function generateTitle(categoryId){
  const pool = TITLE_TEMPLATES[categoryId] || ['名前のない一冊'];
  return pool[Math.floor(Math.random()*pool.length)];
}


function recommendReasonFor(catId){
  const pool = RECOMMEND_TEMPLATES[catId];
  if(!pool || !pool.length) return '';
  return pool[Math.floor(Math.random()*pool.length)];
}

// 実在の記事で裏取りできた「話題と紐づく」ピン留めのおすすめ（棚ごとに固定表示）。

// この書店の「開店日」。ここからの経過月数で、本のプールを段階的に解禁していく。
// サーバーを使わない静的サイトなので、本当の意味での「毎月自動追加」はできない。
// 代わりに、あらかじめ仕込んだ大きなプール（6waveぶん）を、月を追うごとに解禁する形で「毎月増える」体験を再現している。
/* ---------- 収益化の設定（ここを書き換えるだけで全リンクに反映） ---------- */
// AmazonアソシエイトID（設定済み）。
const AMAZON_ASSOCIATE_ID = 'uta0106-22';
// 楽天アフィリエイトID（設定済み）。楽天のリンクはこのIDを通した形式で生成される。
const RAKUTEN_AFFILIATE_ID = '5590cc07.86ee74b4.5590cc08.a766f047';

function amazonSearchUrl(query, indexParam){
  let url = 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(query);
  if(indexParam) url += '&i=' + indexParam;
  if(AMAZON_ASSOCIATE_ID && AMAZON_ASSOCIATE_ID !== 'your_id-22'){
    url += '&tag=' + encodeURIComponent(AMAZON_ASSOCIATE_ID);
  }
  return url;
}

function rakutenSearchUrl(query){
  const target = 'https://search.rakuten.co.jp/search/mall/' + encodeURIComponent(query) + '/';
  if(RAKUTEN_AFFILIATE_ID){
    return 'https://hb.afl.rakuten.co.jp/hgc/' + RAKUTEN_AFFILIATE_ID + '/?pc=' + encodeURIComponent(target) + '&m=' + encodeURIComponent(target);
  }
  return target;
}

const SHOP_OPEN_DATE = new Date('2026-07-01T00:00:00+09:00');
const MAX_WAVE = 6;

function unlockedWaveCount(){
  const now = new Date();
  const months = (now.getFullYear() - SHOP_OPEN_DATE.getFullYear()) * 12 + (now.getMonth() - SHOP_OPEN_DATE.getMonth());
  return Math.min(MAX_WAVE, Math.max(1, months + 1));
}

function pickRecommend(catId){
  const pinned = PINNED_RECOMMEND[catId] || [];
  const wave = unlockedWaveCount();
  const pool = BOOK_POOL.filter(b=>b.tags.includes(catId) && b.wave <= wave);
  const shuffled = pool.slice().sort(()=>Math.random()-0.5);
  const picked = shuffled.slice(0, 3).map(b=>({
    title:b.title, by:b.by, why:recommendReasonFor(catId)
  }));
  return pinned.concat(picked);
}


// 各棚の気分に合う曲を「探しに行く」ためのYouTube検索ワード。
// 歌詞や動画そのものはアプリ内に持たず、公式のYouTube検索結果ページへのリンクのみ（著作権上、最も安全な形）。
// 検索で実在を確認できた曲は「曲名 アーティスト」でピンポイントに検索リンクを作る（歌詞・音源はアプリ内に持たず、YouTube公式検索結果へのリンクのみ）。
// 確認できなかった棚は、これまで通り気分のキーワードでの検索に留めている（正直な範囲）。
// 検索で実在を確認できた曲だけを、棚ごとに2〜3曲の「プレイリスト」として並べる。
// 歌詞や音源はアプリ内に持たず、曲ごとにYouTube公式検索結果へのリンクを作るだけ（著作権上、最も安全な形）。
/* ---------- Xの実投稿の公式埋め込み（手動キュレーション方式） ----------
   ここに「この棚の気持ちを代弁している」と思う実在のX投稿のURLを貼ると、
   その棚を開いた時にXの公式埋め込みで表示される（規約に沿った正式な引用方法）。
   例： moya:['https://x.com/ユーザー名/status/1234567890'],
   注意：未ログインの閲覧者には埋め込みが表示されない場合があるため、
   その時は「Xで見る」というリンクに自動で切り替わる。 */





const STORY_LIMIT = 700;
let activeCategory = CATEGORIES[0].id;
let libraryCache = [];

/* ---------- storage（IndexedDB優先・localStorageへ自動フォールバック） ----------
   保存先はこの端末のブラウザのみ（機種変更・全データ削除で消えます）。
   IndexedDBはlocalStorageより容量が大きく、タブを閉じても消えにくい保存領域。
   万一IndexedDBが使えない環境（古いブラウザ・一部のプライベートモード）では、
   自動的にlocalStorageに切り替わる。既存のlocalStorageのデータは初回に自動移行する。 */
const STORAGE_VERSION = 1;
const IDB_NAME = 'emotion-bookstore';
const IDB_STORE = 'kv';
let storageWarned = false;
let idbHandle = null;   // 開いたデータベースの使い回し
let idbBroken = false;  // IndexedDBが使えないと判明したらtrue（以降localStorageのみ）

function warnStorageOnce(message){
  if(storageWarned) return;
  storageWarned = true;
  const msg = document.getElementById('deskMsg');
  if(msg) msg.textContent = message;
}

function idbOpen(){
  if(idbBroken || !window.indexedDB) return Promise.resolve(null);
  if(idbHandle) return Promise.resolve(idbHandle);
  return new Promise((resolve)=>{
    let settled = false;
    const done = (db)=>{ if(!settled){ settled = true; resolve(db); } };
    try{
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(IDB_STORE)){
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = ()=>{
        idbHandle = req.result;
        // 別タブでの削除等に備える
        idbHandle.onclose = ()=>{ idbHandle = null; };
        done(idbHandle);
      };
      req.onerror = ()=>{ idbBroken = true; done(null); };
      req.onblocked = ()=>{ done(null); };
      // 一部環境でイベントが一切発火しないケースへの保険
      setTimeout(()=>{ if(!settled){ idbBroken = true; done(null); } }, 3000);
    }catch(e){
      idbBroken = true;
      done(null);
    }
  });
}

function idbGet(key){
  return idbOpen().then(db=>{
    if(!db) return undefined;
    return new Promise((resolve)=>{
      try{
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = ()=>resolve(req.result);
        req.onerror = ()=>resolve(undefined);
      }catch(e){ resolve(undefined); }
    });
  });
}

function idbSet(key, value){
  return idbOpen().then(db=>{
    if(!db) return false;
    return new Promise((resolve)=>{
      try{
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = ()=>resolve(true);
        tx.onerror = ()=>resolve(false);
        tx.onabort = ()=>resolve(false);
      }catch(e){ resolve(false); }
    });
  });
}

function idbDelete(key){
  return idbOpen().then(db=>{
    if(!db) return false;
    return new Promise((resolve)=>{
      try{
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = ()=>resolve(true);
        tx.onerror = ()=>resolve(false);
      }catch(e){ resolve(false); }
    });
  });
}

function lsGet(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return undefined;
    return JSON.parse(raw);
  }catch(e){ return undefined; }
}

function lsSet(key, wrapped){
  try{
    localStorage.setItem(key, JSON.stringify(wrapped));
    return true;
  }catch(e){ return false; }
}

async function loadJSON(key, fallback){
  // 1) IndexedDBを見る → 2) なければlocalStorage（旧データの移行も兼ねる）
  let wrapped = await idbGet(key);
  if(wrapped === undefined){
    wrapped = lsGet(key);
    if(wrapped !== undefined){
      // 旧localStorageのデータをIndexedDBへ移行（失敗してもデータは残る）
      idbSet(key, wrapped);
    }
  }
  if(wrapped === undefined || wrapped === null) return fallback;
  try{
    if(typeof wrapped === 'object' && 'v' in wrapped && 'data' in wrapped){
      return wrapped.data;
    }
    return wrapped;
  }catch(e){
    return fallback;
  }
}

async function saveJSON(key, value){
  const wrapped = { v: STORAGE_VERSION, data: value };
  // IndexedDBとlocalStorageの両方に書く（二重の備え。片方が失敗しても残る）
  const okIdb = await idbSet(key, wrapped);
  const okLs = lsSet(key, wrapped);
  if(!okIdb && !okLs){
    warnStorageOnce('この端末では保存ができないようです（プライベートブラウズ中や、保存容量の設定をご確認ください）。');
    return false;
  }
  return true;
}

async function deleteKey(key){
  await idbDelete(key);
  try{ localStorage.removeItem(key); }catch(e){}
}

/* ---------- 日記ログのエクスポート（自分の端末にテキストで保存） ---------- */
const PURIFY_LOG_KEY = 'emotion-bookstore-purify-log';

async function exportDiaryText(){
  const lib = await loadJSON('emotion-bookstore-library', []);
  const purifyLog = await loadJSON(PURIFY_LOG_KEY, []);
  const shiori = await loadJSON('emotion-bookstore-shiori', null);
  const lines = [];
  lines.push('『みんなの感情書店』 わたしの記録');
  lines.push('書き出した日：' + new Date().toLocaleString('ja-JP'));
  lines.push('='.repeat(40));
  lines.push('');
  lines.push('【本棚の物語】 ' + lib.length + '冊');
  lines.push('');
  lib.forEach((e, i)=>{
    const cat = CATEGORIES.find(c=>c.id===e.category);
    lines.push('--- ' + (i+1) + '冊目 ---');
    lines.push('タイトル：' + e.title);
    lines.push('棚：' + (cat ? cat.label : e.category));
    lines.push('日付：' + (e.date ? new Date(e.date).toLocaleDateString('ja-JP') : '不明'));
    if(e.sealed) lines.push('（以前を振り返って綴った一冊）');
    lines.push(e.story);
    if(e.note) lines.push('店主のことば：' + e.note);
    lines.push('');
  });
  lines.push('【手放した気持ちの記録】 ' + purifyLog.length + '件');
  lines.push('');
  purifyLog.forEach((p, i)=>{
    const cat = CATEGORIES.find(c=>c.id===p.category);
    lines.push('--- ' + (i+1) + '件目（' + (cat ? cat.label : p.category) + '） ' + new Date(p.date).toLocaleDateString('ja-JP') + ' ---');
    lines.push(p.text);
    lines.push('');
  });
  if(shiori && shiori.text){
    lines.push('【最後に受け取った栞】');
    lines.push(shiori.text);
  }
  const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `感情書店の記録_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

/* ---------- 店主の審査・栞（ローカル判定・通信なし） ---------- */
// 棚ごとの「よくある言葉」。納品文の中にこれらが多く含まれていたら、その棚を提案する。
/* ---------- 気持ちを手放す（浄化の儀式） ---------- */
// マイナス寄りの感情の棚にだけ「手放す」ボタンを表示する。
const NEGATIVE_SHELVES = ['moya','ushirometai','kuyashii','kodoku','aseri','shitto','hazukashii','gakkari'];



function openPurify(shelfId){
  const overlay = document.getElementById('purifyOverlay');
  overlay.dataset.shelf = shelfId;
  const lead = document.getElementById('purifyLead');
  const input = document.getElementById('purifyInput');
  const msg = document.getElementById('purifyMsg');
  const btn = document.getElementById('purifyBtn');
  lead.textContent = PURIFY_LEADS[shelfId] || 'その気持ちを、そのまま書き出してみてください。';
  input.value = '';
  input.classList.remove('dissolving');
  input.style.display = '';
  input.disabled = false;
  btn.disabled = false;
  btn.textContent = '🕯 手放す';
  btn.dataset.stage = 'input';
  msg.classList.add('hidden');
  msg.textContent = '';
  overlay.classList.remove('hidden');
  setTimeout(()=>input.focus(), 100);
}

function closePurify(){
  document.getElementById('purifyOverlay').classList.add('hidden');
}

document.getElementById('purifyClose').onclick = closePurify;
document.getElementById('purifyOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'purifyOverlay') closePurify();
});

document.getElementById('purifyBtn').onclick = async ()=>{
  const btn = document.getElementById('purifyBtn');
  if(btn.dataset.stage === 'done'){
    closePurify();
    return;
  }
  const input = document.getElementById('purifyInput');
  const msg = document.getElementById('purifyMsg');
  if(!input.value.trim()){
    closePurify();
    return;
  }
  btn.disabled = true;
  input.disabled = true;
  buzz(12);
  // 消える前に「手放しの記録」へ静かに残す（この端末のみ・エクスポート可能）
  const shelfId = document.getElementById('purifyOverlay').dataset.shelf || '';
  const logEntry = { category: shelfId, text: input.value.trim(), date: new Date().toISOString() };
  loadJSON(PURIFY_LOG_KEY, []).then(log=>{
    log.push(logEntry);
    saveJSON(PURIFY_LOG_KEY, log);
  });
  if(prefs.motion){
    input.classList.add('dissolving');
    await wait(1000);
  }
  input.value = '';
  input.style.display = 'none';
  msg.textContent = PURIFY_CLOSING[Math.floor(Math.random()*PURIFY_CLOSING.length)];
  msg.classList.remove('hidden');
  btn.textContent = '閉じる';
  btn.dataset.stage = 'done';
  btn.disabled = false;
};


// 明らかに不適切な内容の簡易チェック（個人情報・攻撃的表現）。
const PERSONAL_INFO_PATTERNS = [/\d{2,4}-\d{3,4}-\d{3,4}/, /[\w.+-]+@[\w-]+\.[\w.-]+/, /(本名|住所|電話番号|LINE\s*ID)[:：]/];
const ATTACK_WORDS = ['死ね','殺す','消えろ','ぶっ殺'];
const CRISIS_STORY_PATTERNS = ['死にたい','消えたい','自分を傷つけ','リストカット'];


// テキストから最もふさわしい棚を推定する（納品審査にも、番台の対話にも共通で使う）。
// スコアが基準に満たない場合はnullを返す（無理に棚を決めつけない）。
function detectShelfFromText(text, minScore){
  let bestId = null, bestScore = 0;
  for(const id in CATEGORY_KEYWORDS){
    const score = CATEGORY_KEYWORDS[id].reduce((n,w)=>n + (text.includes(w) ? 1 : 0), 0);
    if(score > bestScore){ bestScore = score; bestId = id; }
  }
  return bestScore >= (minScore || 1) ? bestId : null;
}

function localCurate(title, story, chosenId){
  const combined = title + '\n' + story;
  if(CRISIS_STORY_PATTERNS.some(w=>combined.includes(w))){
    return {
      approved:false,
      category:null,
      note:'',
      reason:'その気持ちは、ここに書き留めるだけでなく、信頼できる大人の方や「よりそいホットライン」0120-279-338にも、ぜひ話してみてください。'
    };
  }
  if(PERSONAL_INFO_PATTERNS.some(p=>p.test(combined))){
    return { approved:false, category:null, note:'', reason:'連絡先や個人が特定できる情報が含まれているようです。そこだけ伏せて、もう一度お持ちください。' };
  }
  if(ATTACK_WORDS.some(w=>combined.includes(w))){
    return { approved:false, category:null, note:'', reason:'誰かを深く傷つける言葉が含まれているようです。ご自身の気持ちの部分だけ、綴り直してみてください。' };
  }
  // 棚の自動提案（キーワードの一致数が最も多い棚が、選んだ棚と違う場合だけ提案）
  let bestId = chosenId, bestScore = 0;
  for(const id in CATEGORY_KEYWORDS){
    const score = CATEGORY_KEYWORDS[id].reduce((n,w)=>n + (combined.includes(w) ? 1 : 0), 0);
    if(score > bestScore){ bestScore = score; bestId = id; }
  }
  const suggested = (bestScore >= 2 && bestId !== chosenId) ? bestId : chosenId;
  return {
    approved:true,
    category:suggested,
    note: SHOPKEEPER_NOTES[Math.floor(Math.random()*SHOPKEEPER_NOTES.length)],
    reason:''
  };
}


function localShiori(topLabel){
  const t = SHIORI_TEMPLATES[Math.floor(Math.random()*SHIORI_TEMPLATES.length)];
  return t.replace('{cat}', topLabel);
}


/* ---------- preferences (演出・環境音) ---------- */
let prefs = { motion:true, sound:false };
const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function applyPrefs(){
  document.body.classList.toggle('no-motion', !prefs.motion);
  const mt = document.getElementById('motionToggle');
  const st = document.getElementById('soundToggle');
  mt.textContent = '演出：' + (prefs.motion ? '入' : '切');
  mt.classList.toggle('on', prefs.motion);
  st.textContent = '環境音：' + (prefs.sound ? '入' : '切');
  st.classList.toggle('on', prefs.sound);
  if(prefs.sound) startAmbience(); else stopAmbience();
}

async function initPrefs(){
  const saved = await loadJSON('emotion-bookstore-prefs', null);
  if(saved && typeof saved === 'object'){
    prefs = Object.assign(prefs, saved);
  }else if(reduceQuery && reduceQuery.matches){
    prefs.motion = false;
  }
  applyPrefs();
}

document.getElementById('motionToggle').onclick = ()=>{
  prefs.motion = !prefs.motion;
  applyPrefs();
  saveJSON('emotion-bookstore-prefs', prefs);
};
document.getElementById('soundToggle').onclick = ()=>{
  prefs.sound = !prefs.sound;
  applyPrefs();
  saveJSON('emotion-bookstore-prefs', prefs);
};

/* ---------- ambience (Web Audio) ---------- */
let audioCtx = null, ambGain = null;
function startAmbience(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return;
  if(audioCtx){
    if(audioCtx.state === 'suspended') audioCtx.resume();
    if(ambGain) ambGain.gain.setTargetAtTime(0.02, audioCtx.currentTime, 0.8);
    return;
  }
  audioCtx = new AC();
  const len = audioCtx.sampleRate * 2;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for(let i=0;i<len;i++){
    const w = Math.random()*2-1;
    last = (last + 0.02*w) / 1.02;
    d[i] = last * 3.5;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 380;
  ambGain = audioCtx.createGain();
  ambGain.gain.value = 0;
  src.connect(filt); filt.connect(ambGain); ambGain.connect(audioCtx.destination);
  src.start();
  ambGain.gain.setTargetAtTime(0.02, audioCtx.currentTime, 1.2);
  if(audioCtx.state === 'suspended'){
    const kick = ()=>{ audioCtx.resume(); document.removeEventListener('pointerdown', kick); };
    document.addEventListener('pointerdown', kick);
  }
}
function stopAmbience(){
  if(ambGain && audioCtx){
    ambGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.4);
  }
}

/* ---------- haptics ---------- */
function buzz(ms){
  if(prefs.motion && navigator.vibrate){
    try{ navigator.vibrate(ms); }catch(e){}
  }
}

/* ---------- mood lighting (簡易ヒューリスティック) ---------- */
const HEAVY_WORDS = ['つら','しんど','悲し','泣','苦し','不安','怖','孤独','疲れ','嫌','消え'];
const BRIGHT_WORDS = ['嬉し','楽し','わくわく','ワクワク','好き','幸','誇ら','最高'];
function setMood(text){
  if(!prefs.motion) return;
  const layer = document.getElementById('moodLayer');
  if(HEAVY_WORDS.some(w=>text.includes(w))){
    layer.style.background = 'rgba(45,60,110,0.07)';
  }else if(BRIGHT_WORDS.some(w=>text.includes(w))){
    layer.style.background = 'rgba(255,150,60,0.06)';
  }else{
    layer.style.background = 'rgba(0,0,0,0)';
  }
}

/* ---------- navigation ---------- */
function scrollToId(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior: prefs.motion ? 'smooth' : 'auto'});
}

function setActivePageTab(id){
  document.querySelectorAll('.page-tab').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.page === id);
  });
}

function goToPage(id){
  setActivePageTab(id);
  if(!prefs.motion){
    scrollToId(id);
    return;
  }
  const overlay = document.getElementById('pageTurnOverlay');
  overlay.classList.remove('active');
  void overlay.offsetWidth; // restart animation
  overlay.classList.add('active');
  buzz(10);
  setTimeout(()=>scrollToId(id), 260);
  setTimeout(()=>overlay.classList.remove('active'), 650);
}

/* ---------- section reveal + ページ位置に応じたタブのアクティブ化 ---------- */
(function(){
  const targets = document.querySelectorAll('.reveal');
  const pageIds = ['counter','shelves','desk','bookshelf'];
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, {threshold:0.12});
    targets.forEach(el=>io.observe(el));

    const pageIo = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting) setActivePageTab(e.target.id);
      });
    }, {threshold:0.4});
    pageIds.forEach(id=>{
      const el = document.getElementById(id);
      if(el) pageIo.observe(el);
    });
  }else{
    targets.forEach(el=>el.classList.add('visible'));
  }
})();


/* ---------- monthly fair ---------- */
function renderFair(){
  const m = new Date().getMonth() + 1;
  const fair = MONTH_FAIR[m];
  const cat = CATEGORIES.find(c=>c.id===fair.id);
  const box = document.getElementById('fairBox');
  box.innerHTML = '';
  const title = document.createElement('b');
  title.textContent = m + '月の店主のおすすめ棚 — 『' + cat.label + '』';
  const line = document.createElement('span');
  line.className = 'fair-line';
  line.textContent = fair.line;
  const go = document.createElement('button');
  go.className = 'fair-go';
  go.textContent = '棚へ';
  go.onclick = ()=>{ activeCategory = fair.id; renderShelfTabs(); renderShelfDisplay(); };
  box.appendChild(title); box.appendChild(line); box.appendChild(go);
}

/* ---------- shelves ---------- */
function topCategoryId(){
  if(libraryCache.length === 0) return null;
  const counts = {};
  libraryCache.forEach(e=>{ counts[e.category] = (counts[e.category]||0) + 1; });
  return CATEGORIES.filter(c=>counts[c.id]).sort((a,b)=>counts[b.id]-counts[a.id])[0].id;
}

function renderShelfTabs(){
  const wrap = document.getElementById('shelfTabs');
  wrap.innerHTML = '';
  const topId = topCategoryId();
  const catSelect = document.getElementById('categorySelect');
  if(catSelect && catSelect.options.length) catSelect.value = activeCategory;
  const deskLabel = document.getElementById('deskCategoryLabel');
  if(deskLabel) deskLabel.textContent = shelfLabelOf(activeCategory);
  CATEGORIES.forEach(cat=>{
    const btn = document.createElement('button');
    btn.className = 'shelf-tab' + (cat.id===activeCategory ? ' active' : '');
    if(cat.id === topId){
      btn.classList.add('glow');
      btn.title = 'あなたの本棚と縁の深い棚';
    }
    btn.textContent = cat.label;
    btn.onclick = ()=>{ activeCategory = cat.id; renderShelfTabs(); renderShelfDisplay(); };
    wrap.appendChild(btn);
  });
  const wander = document.createElement('button');
  wander.className = 'wander-btn';
  wander.textContent = '⚘ 気の向くままに巡る';
  wander.onclick = ()=>{
    let pick = activeCategory;
    while(pick === activeCategory){
      pick = CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)].id;
    }
    activeCategory = pick;
    renderShelfTabs();
    renderShelfDisplay();
  };
  wrap.appendChild(wander);
}

function renderShelfDisplay(){
  const cat = CATEGORIES.find(c=>c.id===activeCategory);
  const el = document.getElementById('shelfDisplay');
  if(prefs.motion){
    el.style.transition = 'opacity .16s ease';
    el.style.opacity = '0';
  }
  const q = cat.quotes[Math.floor(Math.random()*cat.quotes.length)];
  const recs = pickRecommend(cat.id);
  const moodSearchQuery = cat.label + ' 気持ち おすすめ 本';
  const moodSearchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(moodSearchQuery);
  const recommendHtml = (recs && recs.length)
    ? `<div class="recommend-section">
        <p class="recommend-heading">「${cat.label}」な今のあなたに、店主が選んだ本</p>
        <p class="recommend-subtext">読むための本というより、この気持ちのお守りになる一冊です（今月は${unlockedWaveCount()}/${MAX_WAVE}段階まで棚が開いています）</p>
        <div class="recommend-row">
        ${recs.map(r=>{
          const q = r.title + ' ' + r.by;
          const amazonUrl = amazonSearchUrl(q);
          const kindleUrl = amazonSearchUrl(q, 'digital-text');
          const audibleUrl = amazonSearchUrl(q, 'audible');
          const rakutenUrl = rakutenSearchUrl(q);
          return `<span class="recommend-chip" title="${r.why || ''}">
            ${r.hook ? `<span class="recommend-hook">${r.hook}</span>` : ''}
            『${r.title}』${r.by}
            <span class="recommend-why">${r.why || ''}</span>
            <span class="recommend-shop-links">
              <a class="recommend-buy" href="${amazonUrl}" target="_blank" rel="noopener">Amazon</a>
              <a class="recommend-buy kindle" href="${kindleUrl}" target="_blank" rel="noopener">Kindle</a>
              <a class="recommend-buy audible" href="${audibleUrl}" target="_blank" rel="noopener">Audible</a>
              <a class="recommend-buy rakuten" href="${rakutenUrl}" target="_blank" rel="noopener">楽天</a>
            </span>
            ${r.source ? `<a class="recommend-source" href="${r.sourceUrl}" target="_blank" rel="noopener">出典：${r.source}</a>` : ''}
          </span>`;
        }).join('')}
        <button type="button" class="recommend-shuffle" onclick="renderShelfDisplay()" title="他のおすすめを見る">🔀 他も見る</button>
        <a class="recommend-more" href="${moodSearchUrl}" target="_blank" rel="noopener">🔎 「${cat.label}」な気分の本を、いろんな人のおすすめから探す →</a>
        </div>
       </div>`
    : '';
  const playlist = PINNED_SONGS[cat.id];
  let musicHtml;
  if(playlist && playlist.length){
    const items = playlist.map(song=>{
      const q = song.title + ' ' + song.artist;
      const amUrl = amazonSearchUrl(q + ' 音楽');
      const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
      const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q);
      return `<div class="playlist-track-row">
        <span class="playlist-track-name">『${song.title}』${song.artist}</span>
        <span class="playlist-services">
          <a href="${spUrl}" target="_blank" rel="noopener">Spotify</a>
          <a href="${amUrl}" target="_blank" rel="noopener">Amazon Music</a>
          <a href="${ytUrl}" target="_blank" rel="noopener">YouTube</a>
        </span>
      </div>`;
    }).join('');
    musicHtml = `<div class="music-row"><p class="playlist-label">🎵 「${cat.label}」なプレイリスト — 好きなサービスで聴けます</p><div class="playlist-tracks">${items}</div></div>`;
  }else{
    const musicQuery = MUSIC_QUERIES[cat.id] || (cat.label + ' 邦楽 プレイリスト');
    const musicUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(musicQuery);
    musicHtml = `<div class="music-row"><a class="music-link" href="${musicUrl}" target="_blank" rel="noopener">🎵 YouTubeでBGMを探す</a></div>`;
  }
  const myEntries = libraryCache.filter(e=>e.category===cat.id);
  const myEpisodesHtml = myEntries.map(entry=>
    `<div class="episode-card mine" data-entry-id="${entry.id}"><span class="who mine-who">あなたの物語${entry.tweetUrl ? ' 🐦' : ''}</span>『${entry.title}』${entry.story.length > 60 ? entry.story.slice(0,60) + '…' : entry.story}</div>`
  ).join('');
  const shuffledEpisodes = cat.episodes.slice().sort(()=>Math.random()-0.5).slice(0, 3);
  const sampleEpisodesHtml = shuffledEpisodes.map(ep=>`<div class="episode-card"><span class="who">名もなき誰かの物語</span>${ep}</div>`).join('');
  const episodesNote = `<p class="episodes-note">※棚に並ぶ物語には、店主・巡が見聞きし書き留めた創作が含まれます。</p>`;
  const purifyHtml = NEGATIVE_SHELVES.includes(cat.id)
    ? `<button type="button" class="purify-trigger" onclick="openPurify('${cat.id}')">🕯 この気持ちを手放す</button>`
    : '';
  el.innerHTML = `
    <p class="definition"><b>${cat.label}</b> — ${cat.def}</p>
    <p class="quote-card">${q.text}</p>
    <p class="quote-source">— ${q.source}</p>
    <div class="episodes">
      ${myEpisodesHtml}
      ${sampleEpisodesHtml}
    </div>
    ${episodesNote}
    <div class="shelf-tweets" id="shelfTweets"></div>
    <button type="button" class="episode-shuffle" onclick="renderShelfDisplay()">🔀 他のエピソードも見る</button>
    ${purifyHtml}
    ${recommendHtml}
    ${musicHtml}
  `;
  el.querySelectorAll('.episode-card.mine').forEach(card=>{
    card.onclick = ()=>{
      const entry = libraryCache.find(e=>e.id === card.dataset.entryId);
      if(entry){ buzz(8); openBook(entry); }
    };
  });
  // 手動キュレーションした実在のX投稿があれば、公式埋め込みで表示
  const tweetBox = el.querySelector('#shelfTweets');
  const urls = PINNED_TWEETS[cat.id];
  if(tweetBox && urls && urls.length){
    tweetBox.innerHTML = '<p class="shelf-tweets-label">この棚に寄せられた、実際の声（Xより）</p>';
    urls.slice(0, 3).forEach(u=>{
      const holder = document.createElement('div');
      tweetBox.appendChild(holder);
      renderTweetEmbed(holder, u);
    });
  }
  if(prefs.motion){
    requestAnimationFrame(()=>{ el.style.opacity = '1'; });
  }
}

function shiftCategory(dir){
  const i = CATEGORIES.findIndex(c=>c.id===activeCategory);
  const n = CATEGORIES.length;
  activeCategory = CATEGORIES[(i + dir + n) % n].id;
  renderShelfTabs();
  renderShelfDisplay();
}

(function enableSwipe(){
  const area = document.getElementById('shelfDisplay');
  let sx = null, sy = null, dragging = false;
  area.style.touchAction = 'pan-y';
  area.style.willChange = 'transform';

  function idxOf(){ return CATEGORIES.findIndex(c=>c.id===activeCategory); }

  area.addEventListener('touchstart', (e)=>{
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY; dragging = true;
    area.style.transition = 'none';
  }, {passive:true});

  area.addEventListener('touchmove', (e)=>{
    if(!dragging || sx === null) return;
    const t = e.touches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if(Math.abs(dy) > Math.abs(dx)) return; // 縦スクロールを優先
    // 端の棚では抵抗（バウンス）を効かせる
    const i = idxOf();
    const atStart = i === 0 && dx > 0;
    const atEnd = i === CATEGORIES.length - 1 && dx < 0;
    const damped = (atStart || atEnd) ? dx / 3 : dx / 1.5;
    area.style.transform = `translateX(${damped}px)`;
  }, {passive:true});

  area.addEventListener('touchend', (e)=>{
    if(sx === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    area.style.transition = 'transform .25s ease';
    area.style.transform = 'translateX(0)';
    if(Math.abs(dx) > 50 && Math.abs(dy) < 60){
      const dir = dx < 0 ? 1 : -1;
      const i = idxOf();
      const target = i + dir;
      if(target >= 0 && target < CATEGORIES.length){
        // 一度画面外へ流してから、新しい棚をスッと戻す
        area.style.transform = `translateX(${dir < 0 ? '' : '-'}${24}px)`;
        setTimeout(()=>{
          shiftCategory(dir);
          area.style.transition = 'transform .22s ease, opacity .18s ease';
          area.style.transform = 'translateX(0)';
        }, prefs.motion ? 120 : 0);
        buzz(6);
      }
    }
    sx = null; sy = null; dragging = false;
  }, {passive:true});
})();

function renderCategorySelect(){
  const sel = document.getElementById('categorySelect');
  sel.innerHTML = CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  sel.addEventListener('change', ()=>{
    const deskLabel = document.getElementById('deskCategoryLabel');
    if(deskLabel) deskLabel.textContent = shelfLabelOf(sel.value);
  });
}

/* ---------- bookshelf ---------- */
function spineColorFor(catId){
  const idx = CATEGORIES.findIndex(c=>c.id===catId);
  return SPINE_COLORS[idx % SPINE_COLORS.length];
}

function renderShelf(markNewest){
  const shelf = document.getElementById('myShelf');
  const emptyMsg = document.getElementById('shelfEmptyMsg');
  const countBadge = document.getElementById('shelfCount');
  shelf.querySelectorAll('.spine').forEach(n=>n.remove());
  if(countBadge) countBadge.textContent = libraryCache.length ? `蔵書 ${libraryCache.length}冊` : '';
  if(libraryCache.length === 0){
    emptyMsg.style.display = 'block';
    renderTrend();
    renderShioriCard();
    return;
  }
  emptyMsg.style.display = 'none';
  libraryCache.forEach((entry, i)=>{
    const cat = CATEGORIES.find(c=>c.id===entry.category);
    const spine = document.createElement('div');
    spine.className = 'spine';
    spine.style.background = spineColorFor(entry.category);
    spine.style.height = (140 + (entry.title.length % 4) * 12) + 'px';
    // 手で並べたようなわずかな傾き（毎回同じentryなら同じ値になるよう、タイトルの長さと位置からシード）
    const tilt = ((entry.title.length * 7 + i * 13) % 5) - 2;
    spine.style.setProperty('--tilt', tilt + 'deg');
    spine.textContent = (entry.sealed ? '🔖 ' : '') + entry.title;
    spine.title = cat ? cat.label : '';
    spine.onclick = ()=>{ buzz(8); openBook(entry); };
    if(markNewest && i === libraryCache.length - 1 && prefs.motion){
      spine.classList.add('new');
      setTimeout(()=>spine.classList.remove('new'), 600);
    }
    shelf.appendChild(spine);
  });
  renderTrend();
  renderShioriCard();
}

/* ---------- 本棚が育つ実感（マイルストーン祝福） ---------- */
const MILESTONES = [1,3,5,10,20,30,50,100];

async function celebrateMilestoneIfNeeded(count){
  if(!MILESTONES.includes(count)) return;
  const done = await loadJSON('emotion-bookstore-milestones', []);
  if(done.includes(count)) return;
  done.push(count);
  await saveJSON('emotion-bookstore-milestones', done);

  const toast = document.createElement('div');
  toast.className = 'milestone-toast';
  toast.textContent = '🏮 ' + (MILESTONE_MESSAGES[count] || `${count}冊目です。`);
  document.body.appendChild(toast);
  buzz(15);
  requestAnimationFrame(()=>toast.classList.add('show'));
  setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(), 500);
  }, prefs.motion ? 4200 : 2000);
}

function renderTrend(){
  const box = document.getElementById('trendBox');
  const bars = document.getElementById('trendBars');
  const sum = document.getElementById('trendSummary');
  if(libraryCache.length === 0){
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  const counts = {};
  libraryCache.forEach(e=>{ counts[e.category] = (counts[e.category]||0) + 1; });
  const max = Math.max(...Object.values(counts));
  bars.innerHTML = CATEGORIES.filter(c=>counts[c.id]).map(c=>{
    const n = counts[c.id];
    const w = Math.max(8, Math.round(n / max * 100));
    return `<div class="trend-row" data-cat="${c.id}" style="cursor:pointer" title="『${c.label}』の棚を見る"><span class="trend-label">${c.label}</span><div class="trend-bar" style="width:${w}%;background:${spineColorFor(c.id)}"></div><span class="trend-count">${n}冊</span></div>`;
  }).join('');
  bars.querySelectorAll('.trend-row').forEach(row=>{
    row.onclick = ()=>goToShelf(row.dataset.cat);
  });
  const top = CATEGORIES.find(c=>c.id===topCategoryId());
  sum.textContent = `いまのあなたの本棚は、「${top.label}」の棚がいちばん厚いようです。`;
}

/* ---------- 今日の栞 ---------- */
function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

async function renderShioriCard(){
  const card = document.getElementById('shioriCard');
  const slip = document.getElementById('shioriSlip');
  const btn = document.getElementById('shioriBtn');
  const imgBtn = document.getElementById('storyImageBtn');
  const imgHint = document.getElementById('storyImageHint');
  if(libraryCache.length === 0){
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  const cached = await loadJSON('emotion-bookstore-shiori', null);
  if(cached && cached.date === todayStr() && cached.text){
    document.getElementById('shioriText').textContent = cached.text;
    slip.classList.remove('hidden');
    btn.classList.add('hidden');
    imgBtn.classList.remove('hidden');
    imgHint.classList.remove('hidden');
  }else{
    slip.classList.add('hidden');
    btn.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = '栞を受け取る';
    imgBtn.classList.add('hidden');
    imgHint.classList.add('hidden');
  }
}

/* ---------- Instagramストーリー用 縦長画像（9:16）の生成 ----------
   外部ライブラリを使わず、Canvasに直接描画してPNGを書き出す。
   通信ゼロ・確実に動く方式。描く内容：背景・タイトル・本棚（背表紙）・今日の栞・日付。 */
function wrapTextLines(ctx, text, maxWidth){
  const lines = [];
  let line = '';
  for(const ch of text){
    if(ctx.measureText(line + ch).width > maxWidth && line){
      lines.push(line);
      line = ch;
    }else{
      line += ch;
    }
  }
  if(line) lines.push(line);
  return lines;
}

async function generateStoryImage(){
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  // 高解像度な端末でもクッキリした画像になるよう、出力解像度を底上げする（メモリ配慮で上限3倍）
  const dpr = Math.min(window.devicePixelRatio || 2, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); // 以降の描画コードはW×H基準のまま、解像度だけが上がる

  // 背景（紙の色 + 上下に季節色の帯）
  ctx.fillStyle = '#EFE6CD';
  ctx.fillRect(0, 0, W, H);
  const season = getComputedStyle(document.documentElement).getPropertyValue('--season-accent').trim() || '#B7791F';
  ctx.fillStyle = season;
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 14, W, 14);

  // 見出し
  ctx.fillStyle = '#6E2A34';
  ctx.font = '600 34px "Hiragino Mincho ProN", "Yu Mincho", serif';
  ctx.textAlign = 'center';
  ctx.fillText('EMOTIONAL BINDERY & BOOKSHOP', W/2, 120);
  ctx.fillStyle = '#3A2E22';
  ctx.font = '800 88px "Hiragino Mincho ProN", "Yu Mincho", serif';
  ctx.fillText('みんなの感情書店', W/2, 240);
  ctx.font = '400 40px "Hiragino Mincho ProN", "Yu Mincho", serif';
  ctx.fillStyle = '#6b5d49';
  ctx.fillText('名もなき気持ちに、名前をあげる。', W/2, 320);

  // 本棚（木目背景 + 背表紙）
  const shelfX = 90, shelfY = 420, shelfW = W - 180, shelfH = 560;
  ctx.fillStyle = '#3E2F20';
  ctx.fillRect(shelfX, shelfY, shelfW, shelfH);
  ctx.fillStyle = '#2E2318';
  ctx.fillRect(shelfX, shelfY + shelfH - 40, shelfW, 40);

  const books = libraryCache.slice(-14); // 直近14冊まで描画
  const spineW = Math.min(64, (shelfW - 60) / Math.max(books.length, 1) - 8);
  let bx = shelfX + 30;
  books.forEach((entry, i)=>{
    const spineH = 340 + ((entry.title.length * 29) % 90);
    const by = shelfY + shelfH - 40 - spineH;
    ctx.fillStyle = spineColorFor(entry.category);
    ctx.fillRect(bx, by, spineW, spineH);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(bx + spineW - 6, by, 6, spineH);
    // 縦書きタイトル（1文字ずつ）
    ctx.fillStyle = '#f2e6c8';
    ctx.font = '600 26px "Hiragino Mincho ProN", serif';
    ctx.textAlign = 'center';
    const chars = entry.title.slice(0, 9);
    let cy = by + 42;
    for(const ch of chars){
      ctx.fillText(ch, bx + spineW/2, cy);
      cy += 32;
      if(cy > by + spineH - 20) break;
    }
    bx += spineW + 8;
  });

  // 蔵書数
  ctx.fillStyle = '#6E2A34';
  ctx.font = '600 40px "Hiragino Mincho ProN", serif';
  ctx.textAlign = 'center';
  ctx.fillText(`蔵書 ${libraryCache.length}冊`, W/2, shelfY + shelfH + 80);

  // 今日の栞
  const cached = await loadJSON('emotion-bookstore-shiori', null);
  const shioriText = (cached && cached.text) ? cached.text : '';
  if(shioriText){
    const boxX = 110, boxY = shelfY + shelfH + 140, boxW = W - 220;
    ctx.font = '400 40px "Hiragino Mincho ProN", serif';
    const lines = wrapTextLines(ctx, shioriText, boxW - 100);
    const boxH = lines.length * 62 + 150;
    // 破線枠の栞カード
    ctx.fillStyle = '#FFF9EC';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#B7791F';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX + 12, boxY + 12, boxW - 24, boxH - 24);
    ctx.setLineDash([]);
    ctx.fillStyle = '#B7791F';
    ctx.font = '600 30px "Hiragino Mincho ProN", serif';
    ctx.textAlign = 'left';
    ctx.fillText('栞 — 店主より', boxX + 50, boxY + 75);
    ctx.fillStyle = '#3A2E22';
    ctx.font = '400 40px "Hiragino Mincho ProN", serif';
    let ty = boxY + 145;
    for(const line of lines){
      ctx.fillText(line, boxX + 50, ty);
      ty += 62;
    }
  }

  // 日付
  ctx.fillStyle = '#6b5d49';
  ctx.font = '400 32px "Hiragino Mincho ProN", serif';
  ctx.textAlign = 'center';
  const now = new Date();
  ctx.fillText(`${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日の本棚`, W/2, H - 80);

  return canvas;
}

document.getElementById('storyImageBtn').onclick = async ()=>{
  const btn = document.getElementById('storyImageBtn');
  btn.disabled = true;
  btn.textContent = '画像を作っています…';
  try{
    const canvas = await generateStoryImage();
    canvas.toBlob((blob)=>{
      if(!blob){
        btn.textContent = '生成に失敗しました';
        btn.disabled = false;
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'emotion-bookstore-story.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
      btn.textContent = '保存しました ✓（もう一度押せば再生成）';
      btn.disabled = false;
      buzz(12);
    }, 'image/png');
  }catch(e){
    btn.textContent = '生成に失敗しました（もう一度お試しください）';
    btn.disabled = false;
  }
};

document.getElementById('shioriBtn').onclick = async ()=>{
  const btn = document.getElementById('shioriBtn');
  btn.disabled = true;
  btn.textContent = '店主が言葉を選んでいます…';
  await wait(prefs.motion ? 600 : 50);
  const topId = topCategoryId();
  const topLabel = (CATEGORIES.find(c=>c.id===topId) || {}).label || 'あなた';
  const text = localShiori(topLabel);
  // 先に表示してから保存する（保存に失敗しても、栞自体は必ず受け取れる）
  document.getElementById('shioriText').textContent = text;
  document.getElementById('shioriSlip').classList.remove('hidden');
  btn.classList.add('hidden');
  document.getElementById('storyImageBtn').classList.remove('hidden');
  document.getElementById('storyImageHint').classList.remove('hidden');
  saveJSON('emotion-bookstore-shiori', { date: todayStr(), text });
};

function formatDate(iso){
  try{
    return new Date(iso).toLocaleDateString('ja-JP', {year:'numeric', month:'long', day:'numeric'}) + ' 納品';
  }catch(e){ return ''; }
}

/* ---------- X（Twitter）公式埋め込み ---------- */
let twitterWidgetsLoading = null;
function ensureTwitterWidgets(){
  if(window.twttr && window.twttr.widgets) return Promise.resolve();
  if(twitterWidgetsLoading) return twitterWidgetsLoading;
  twitterWidgetsLoading = new Promise((resolve)=>{
    const existing = document.getElementById('twitter-wjs');
    if(existing){ existing.addEventListener('load', resolve); return; }
    const s = document.createElement('script');
    s.id = 'twitter-wjs';
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.onload = resolve;
    s.onerror = resolve; // 読み込めなくても処理を止めない（フォールバックリンクで表示）
    document.body.appendChild(s);
  });
  return twitterWidgetsLoading;
}

async function renderTweetEmbed(container, tweetUrl){
  container.innerHTML = `<blockquote class="twitter-tweet"><a class="tweet-fallback" href="${tweetUrl}" target="_blank" rel="noopener">Xの投稿を見る →</a></blockquote>`;
  container.classList.remove('hidden');
  try{
    await ensureTwitterWidgets();
    if(window.twttr && window.twttr.widgets){
      await window.twttr.widgets.load(container);
    }
  }catch(e){
    // 埋め込みに失敗しても、上のフォールバックリンクは残る
  }
}

function openBook(entry){
  const cat = CATEGORIES.find(c=>c.id===entry.category);
  document.getElementById('modalCat').textContent = cat ? cat.label + 'の棚' : '';
  document.getElementById('modalTitle').textContent = entry.title;
  document.getElementById('modalDate').textContent = (entry.date ? formatDate(entry.date) : '') + (entry.sealed ? '　🔖 以前を振り返って綴った一冊' : '');
  document.getElementById('modalStory').textContent = entry.story;
  const noteSlip = document.getElementById('modalNote');
  if(entry.note){
    document.getElementById('modalNoteText').textContent = entry.note;
    noteSlip.classList.remove('hidden');
  }else{
    noteSlip.classList.add('hidden');
  }
  const tweetBox = document.getElementById('modalTweet');
  if(entry.tweetUrl){
    renderTweetEmbed(tweetBox, entry.tweetUrl);
  }else{
    tweetBox.classList.add('hidden');
    tweetBox.innerHTML = '';
  }
  document.getElementById('bookModal').classList.remove('hidden');
  document.getElementById('modalGoShelf').onclick = ()=>{
    document.getElementById('bookModal').classList.add('hidden');
    goToShelf(entry.category);
  };
  document.getElementById('modalDel').onclick = async ()=>{
    libraryCache = libraryCache.filter(e=>e.id !== entry.id);
    await saveJSON('emotion-bookstore-library', libraryCache);
    renderShelf();
    renderShelfTabs();
    document.getElementById('bookModal').classList.add('hidden');
  };
}

document.getElementById('modalClose').onclick = ()=>{
  document.getElementById('bookModal').classList.add('hidden');
};

/* ---------- binding ceremony ---------- */
function runBinding(onDone){
  if(!prefs.motion){ onDone(); return; }
  const ov = document.getElementById('bindOverlay');
  const txt = document.getElementById('bindText');
  let t1, t2, finished = false;
  function finish(){
    if(finished) return;
    finished = true;
    clearTimeout(t1); clearTimeout(t2);
    ov.classList.add('hidden');
    ov.classList.remove('animating');
    ov.onclick = null;
    onDone();
  }
  ov.classList.remove('hidden');
  ov.classList.add('animating');
  txt.textContent = '糸をかけています…';
  t1 = setTimeout(()=>{ txt.textContent = '表紙を綴じています…'; }, 850);
  t2 = setTimeout(finish, 1800);
  ov.onclick = finish;
}

/* ---------- invitation ---------- */
function showInvitation(catId){
  const inv = INVITES[catId];
  if(!inv) return;
  document.getElementById('invTitle').textContent = inv.t;
  document.getElementById('invBody').textContent = inv.b;
  document.getElementById('invitationCard').classList.remove('hidden');
}
document.getElementById('invClose').onclick = ()=>{
  document.getElementById('invitationCard').classList.add('hidden');
};

/* ---------- curation box ---------- */
function showCurateBox(message, actions){
  const box = document.getElementById('curateBox');
  const msgEl = document.getElementById('curateMsg');
  const actEl = document.getElementById('curateActions');
  msgEl.textContent = message;
  actEl.innerHTML = '';
  actions.forEach(a=>{
    const btn = document.createElement('button');
    btn.className = a.primary ? 'curate-btn primary' : (a.link ? 'curate-cancel' : 'curate-btn');
    btn.textContent = a.label;
    btn.onclick = ()=>{ hideCurateBox(); a.onClick(); };
    actEl.appendChild(btn);
  });
  box.classList.remove('hidden');
}
function hideCurateBox(){
  document.getElementById('curateBox').classList.add('hidden');
}

/* ---------- writing assist ---------- */
document.getElementById('assistBtn').onclick = ()=>{
  const ta = document.getElementById('storyInput');
  if(ta.value.trim() === ''){
    ta.value = 'いつ：\nどこで：\nなにがあった：\nそのとき、胸の中は：\n';
    updateStoryCount();
  }
  ta.focus();
};

function updateStoryCount(){
  const len = document.getElementById('storyInput').value.length;
  const el = document.getElementById('storyCount');
  el.textContent = len + ' / ' + STORY_LIMIT + '字';
  el.classList.toggle('over', len > STORY_LIMIT);
}
document.getElementById('storyInput').addEventListener('input', updateStoryCount);

/* ---------- 下書きの自動保存（書いている途中で消えない） ---------- */
const DRAFT_KEY = 'emotion-bookstore-draft';
let draftTimer = null;
document.getElementById('storyInput').addEventListener('input', ()=>{
  // 打鍵のたびに保存すると重いので、0.5秒落ち着いたタイミングで保存する
  clearTimeout(draftTimer);
  draftTimer = setTimeout(()=>{
    const text = document.getElementById('storyInput').value;
    if(text.trim()){
      saveJSON(DRAFT_KEY, { text, date: new Date().toISOString() });
    }else{
      deleteKey(DRAFT_KEY);
    }
  }, 500);
});

async function restoreDraftIfAny(){
  const draft = await loadJSON(DRAFT_KEY, null);
  if(!draft || !draft.text) return;
  const ta = document.getElementById('storyInput');
  if(ta.value.trim()) return; // すでに何か書いていたら邪魔しない
  const msg = document.getElementById('deskMsg');
  ta.value = draft.text;
  updateStoryCount();
  if(msg) msg.textContent = '書きかけの下書きを復元しました。続きからどうぞ。';
}

/* ---------- submit (店主の審査 → 製本) ---------- */
document.getElementById('submitStory').onclick = async ()=>{
  const chosenId = document.getElementById('categorySelect').value;
  const story = document.getElementById('storyInput').value.trim();
  const msg = document.getElementById('deskMsg');
  const btn = document.getElementById('submitStory');
  hideCurateBox();
  if(!story){
    msg.textContent = 'まずは、そのときの気持ちを書いてみてください。';
    return;
  }
  const title = document.getElementById('titleInput').value.trim() || generateTitle(chosenId);
  if(story.length > STORY_LIMIT){
    msg.textContent = '本文は' + STORY_LIMIT + '字までに収めてください。';
    return;
  }
  btn.disabled = true;
  msg.textContent = '店主が物語に目を通しています…';

  const chosenLabel = (CATEGORIES.find(c=>c.id===chosenId) || {}).label || '';
  const tweetRaw = document.getElementById('tweetInput').value.trim();
  const tweetUrl = /^https:\/\/(x\.com|twitter\.com)\/[^\/]+\/status\/\d+/.test(tweetRaw) ? tweetRaw : '';
  const isPast = document.getElementById('whenSelect').value === 'past';
  if(tweetRaw && !tweetUrl){
    msg.textContent = 'Xの投稿リンクの形式が正しくないようです（例：https://x.com/ユーザー名/status/12345）。';
    btn.disabled = false;
    return;
  }
  await wait(prefs.motion ? 500 : 30);
  const cur = localCurate(title, story, chosenId);

  const bind = (finalCategory, note)=>{
    runBinding(async ()=>{
      const priorCount = libraryCache.filter(e=>e.category===finalCategory).length;
      const entry = {
        id: Date.now().toString(),
        category: finalCategory,
        title, story,
        note: note || '',
        tweetUrl: tweetUrl || '',
        sealed: isPast,
        date: new Date().toISOString()
      };
      libraryCache.push(entry);
      renderShelf(true);
      renderShelfTabs();
      document.getElementById('titleInput').value = '';
      document.getElementById('storyInput').value = '';
      deleteKey(DRAFT_KEY);
      document.getElementById('tweetInput').value = '';
      document.getElementById('whenSelect').value = 'now';
      updateStoryCount();
      const label = shelfLabelOf(finalCategory);
      msg.textContent = priorCount > 0
        ? `製本して、本棚に納品しました。「${label}」の棚に綴るのは、これで${priorCount + 1}冊目です。`
        : '製本して、本棚に納品しました。';
      showInvitation(finalCategory);
      await saveJSON('emotion-bookstore-library', libraryCache);
      await celebrateMilestoneIfNeeded(libraryCache.length);
      btn.disabled = false;
      const boundMsg = msg.textContent;
      setTimeout(()=>{ if(msg.textContent === boundMsg) msg.textContent = ''; }, 4200);
    });
  };

  if(!cur){
    // 審査が通信等で行えなかった場合は、体験を止めずにそのまま納品する
    msg.textContent = '';
    bind(chosenId, '');
    return;
  }

  if(!cur.approved){
    msg.textContent = '';
    btn.disabled = false;
    showCurateBox(
      (cur.reason || 'この内容は、いまはお預かりできません。') + '\n少し書き方を変えて、また持ってきてくださいね。',
      [{ label:'書き直す', primary:true, onClick:()=>{ document.getElementById('storyInput').focus(); } }]
    );
    return;
  }

  const suggested = cur.category;
  if(suggested && suggested !== chosenId){
    const sLabel = (CATEGORIES.find(c=>c.id===suggested) || {}).label || '';
    msg.textContent = '';
    showCurateBox(
      'この物語、『' + sLabel + '』の棚がよく似合いそうです。どちらに納めましょうか。',
      [
        { label:'『' + sLabel + '』の棚に納品', primary:true, onClick:()=>bind(suggested, cur.note) },
        { label:'『' + chosenLabel + '』のまま納品', onClick:()=>bind(chosenId, cur.note) },
        { label:'やめておく', link:true, onClick:()=>{ btn.disabled = false; } }
      ]
    );
    return;
  }

  msg.textContent = '';
  bind(chosenId, cur.note);
};

document.getElementById('exportDiary').onclick = async ()=>{
  const btn = document.getElementById('exportDiary');
  btn.textContent = '書き出しています…';
  try{
    await exportDiaryText();
    btn.textContent = '書き出しました ✓';
  }catch(e){
    btn.textContent = '書き出しに失敗しました';
  }
  setTimeout(()=>{ btn.textContent = '📥 記録をテキストで書き出す'; }, 2500);
};

document.getElementById('resetShelf').onclick = async ()=>{
  if(!confirm('本棚のすべての本を下げます。よろしいですか？')) return;
  libraryCache = [];
  await saveJSON('emotion-bookstore-library', libraryCache);
  renderShelf();
  renderShelfTabs();
};

/* ---------- 店主の頭脳（キーワード照合の疑似AI・APIコストゼロ） ---------- */
// 学校生活・SNS周りのモヤモヤを想定したキーワード対応辞書。
// 「patterns」のどれかが本文に含まれていたら、対応する「replies」からランダムで1つ返す。
// 中身を増やしたいときは、ここに項目を追加するだけでバリエーションが増える。

// 深刻な訴えへの安全対応（キーワード一致で最優先表示）。
const CRISIS_PATTERNS = ['死にたい','消えたい','いなくなりたい','自分を傷つけ','リストカット','殺し'];
const CRISIS_REPLY =
  '……そのお気持ちを、一人で抱えないでください。ここは静かな書店ですが、専門の方に話す方がずっと力になれます。' +
  '信頼できる大人の方、または「よりそいホットライン」0120-279-338、18歳までなら「チャイルドライン」0120-99-7777にも、ぜひ話してみてください。';

// キーワードに一致しなかった時の、深い相槌（世界観を壊さない汎用返答）。

// 「？」を含む質問など、相槌より一歩踏み込みたい時の返答。


function matchShopkeeperReply(text){
  if(CRISIS_PATTERNS.some(w=>text.includes(w))){
    return CRISIS_REPLY;
  }
  for(const entry of KEYWORD_BANK){
    if(entry.patterns.some(p=>text.includes(p))){
      return entry.replies[Math.floor(Math.random()*entry.replies.length)];
    }
  }
  if(text.includes('？') || text.includes('?') || /(か|の)$/.test(text.trim())){
    return GENERIC_QUESTION_REPLIES[Math.floor(Math.random()*GENERIC_QUESTION_REPLIES.length)];
  }
  return GENERIC_REPLIES[Math.floor(Math.random()*GENERIC_REPLIES.length)];
}

/* ---------- チャート式の対話（選択肢で気分を辿る） ---------- */


function shelfLabelOf(id){
  return (CATEGORIES.find(c=>c.id===id) || {}).label || '';
}

function goToShelf(shelfId){
  activeCategory = shelfId;
  renderShelfTabs();
  renderShelfDisplay();
  goToPage('shelves');
}

function goToDeskWithCategory(shelfId){
  const sel = document.getElementById('categorySelect');
  if(sel) sel.value = shelfId;
  goToPage('desk');
  setTimeout(()=>{
    const ta = document.getElementById('storyInput');
    if(ta) ta.focus();
  }, 400);
}

function renderChartOptions(nodeKey){
  const node = CHAT_TREE[nodeKey];
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';
  if(!node) return;
  if(node.options){
    node.options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.className = 'chart-btn';
      btn.textContent = opt.label;
      btn.onclick = ()=>handleChartChoice(opt.label, opt.next);
      container.appendChild(btn);
    });
  } else if(node.shelf){
    const goBtn = document.createElement('button');
    goBtn.className = 'chart-btn primary';
    goBtn.textContent = `『${shelfLabelOf(node.shelf)}』の棚を見てみる`;
    goBtn.onclick = ()=>goToShelf(node.shelf);
    const writeBtn = document.createElement('button');
    writeBtn.className = 'chart-btn';
    writeBtn.textContent = 'この気持ちを書き留める';
    writeBtn.onclick = ()=>goToDeskWithCategory(node.shelf);
    const moreBtn = document.createElement('button');
    moreBtn.className = 'chart-btn';
    moreBtn.textContent = 'また選び直す';
    moreBtn.onclick = ()=>{
      appendBubble('shopkeeper', '……今はどんな気分に近いですか。');
      renderChartOptions('root');
    };
    container.appendChild(goBtn);
    container.appendChild(writeBtn);
    container.appendChild(moreBtn);
  }
}

function renderSuggestionActions(shelfId){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';
  const label = shelfLabelOf(shelfId);

  const goBtn = document.createElement('button');
  goBtn.className = 'chart-btn primary';
  goBtn.textContent = `『${label}』の棚を見てみる`;
  goBtn.onclick = ()=>goToShelf(shelfId);

  const writeBtn = document.createElement('button');
  writeBtn.className = 'chart-btn';
  writeBtn.textContent = 'この気持ちを書き留める';
  writeBtn.onclick = ()=>goToDeskWithCategory(shelfId);

  const moreBtn = document.createElement('button');
  moreBtn.className = 'chart-btn';
  moreBtn.textContent = '選択肢からも選べます';
  moreBtn.onclick = ()=>renderChartOptions('root');

  container.appendChild(goBtn);
  container.appendChild(writeBtn);
  container.appendChild(moreBtn);
}


async function handleChartChoice(label, nextKey){
  const container = document.getElementById('chartOptions');
  container.innerHTML = '';
  appendBubble('user', label);
  keeperFigure.classList.add('listening');

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bubble loading';
  loadingBubble.textContent = LOADING_LINES[Math.floor(Math.random()*LOADING_LINES.length)];
  chatWindow.appendChild(loadingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  await wait(prefs.motion ? (500 + Math.random()*400) : 40);
  loadingBubble.remove();
  const node = CHAT_TREE[nextKey];
  const replyText = pickReply(node.reply);
  appendBubble('shopkeeper', replyText);
  setMood(replyText);
  setTimeout(()=>keeperFigure.classList.remove('listening'), 3000);
  renderChartOptions(nextKey);
}

function pickReply(reply){
  if(Array.isArray(reply)) return reply[Math.floor(Math.random()*reply.length)];
  return reply;
}

/* ---------- AI counter chat（キーワード照合・通信なし） ---------- */
const chatHistory = [];
const chatWindow = document.getElementById('chatWindow');
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const keeperFigure = document.getElementById('keeperFigure');

function appendBubble(role, text){
  const div = document.createElement('div');
  div.className = 'bubble ' + (role === 'user' ? 'you' : 'shopkeeper');
  if(role !== 'user'){
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = '店主';
    div.appendChild(name);
    div.appendChild(document.createTextNode(text));
  } else {
    div.textContent = text;
  }
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

let freeTextTurns = 0;

async function sendToShopkeeper(){
  const text = userInput.value.trim();
  if(!text) return;
  if(text.length > 800){
    appendBubble('shopkeeper', '（ゆっくりで大丈夫です。長いお話は、少しずつに分けてお聞かせください。）');
    return;
  }
  appendBubble('user', text);
  chatHistory.push({ role:'user', content:text });
  userInput.value = '';
  sendBtn.disabled = true;
  keeperFigure.classList.add('listening');
  setMood(text);

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bubble loading';
  loadingBubble.textContent = LOADING_LINES[Math.floor(Math.random()*LOADING_LINES.length)];
  chatWindow.appendChild(loadingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // 通信は発生させず、店主のキーワード照合だけで返答を選ぶ（体感の間として短い待ち時間を演出）
  await wait(prefs.motion ? (700 + Math.random()*600) : 60);
  const reply = matchShopkeeperReply(text);
  loadingBubble.remove();
  appendBubble('shopkeeper', reply);
  chatHistory.push({ role:'assistant', content:reply });

  // 打った後に返答が見えない問題への対応：店主の返答へ視点を移動する
  const bubbles = chatWindow.querySelectorAll('.bubble.shopkeeper');
  const lastReply = bubbles[bubbles.length - 1];
  if(lastReply && lastReply.scrollIntoView){
    lastReply.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block:'nearest' });
  }

  const isCrisis = CRISIS_PATTERNS.some(w=>text.includes(w));
  const suggestedShelf = isCrisis ? null : detectShelfFromText(text, 1);
  if(suggestedShelf){
    renderSuggestionActions(suggestedShelf);
  }else{
    renderChartOptions('root');
  }

  // 3往復を超えたら、より深く話せる相手（生成AI）への案内を一度だけ添える
  freeTextTurns++;
  if(freeTextTurns === 3 && !isCrisis){
    appendBubble('shopkeeper',
      '……私は決まった言葉しか持たない、しがない店番です。もしもっと深く話を聞いてほしい夜は、' +
      '言葉の達者な相談相手（ChatGPTやGeminiのようなAI）を訪ねてみるのも一つの手です。' +
      'ここの棚は、いつでも開けておきますから。');
    const container = document.getElementById('chartOptions');
    if(container){
      const gptLink = document.createElement('a');
      gptLink.className = 'chart-btn';
      gptLink.href = 'https://chatgpt.com/';
      gptLink.target = '_blank';
      gptLink.rel = 'noopener';
      gptLink.textContent = 'ChatGPTと話してみる';
      const gemLink = document.createElement('a');
      gemLink.className = 'chart-btn';
      gemLink.href = 'https://gemini.google.com/';
      gemLink.target = '_blank';
      gemLink.rel = 'noopener';
      gemLink.textContent = 'Geminiと話してみる';
      container.prepend(gemLink);
      container.prepend(gptLink);
    }
  }

  sendBtn.disabled = false;
  setTimeout(()=>keeperFigure.classList.remove('listening'), 3500);
}

sendBtn.onclick = sendToShopkeeper;
userInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    sendToShopkeeper();
  }
});

/* ---------- init ---------- */
/* ---------- シェア機能 ---------- */
const SHARE_TEXT = '名もなき気持ちに、名前をあげる。「みんなの感情書店」— 感情をラベリングして棚に並べる、体験型のプロトタイプです。';

document.getElementById('shareBtn').onclick = ()=>{
  openShareMenu(window.location.href);
};

function openShareMenu(url){
  const menu = document.getElementById('shareMenu');
  document.getElementById('shareX').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(SHARE_TEXT) + '&url=' + encodeURIComponent(url);
  document.getElementById('shareLine').href = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url);
  const nativeBtn = document.getElementById('shareNative');
  if(navigator.share){
    nativeBtn.classList.remove('hidden');
    nativeBtn.onclick = async ()=>{
      try{
        await navigator.share({ title:'みんなの感情書店', text:SHARE_TEXT, url });
      }catch(e){
        // キャンセルや権限エラーが起きても、メニューの他の選択肢はそのまま使える
      }
    };
  }else{
    nativeBtn.classList.add('hidden');
  }
  const urlInput = document.getElementById('shareUrlInput');
  urlInput.value = url;
  document.getElementById('shareCopy').onclick = async ()=>{
    try{
      if(!navigator.clipboard || !navigator.clipboard.writeText){
        throw new Error('clipboard API unavailable');
      }
      await navigator.clipboard.writeText(url);
      document.getElementById('shareCopy').textContent = 'コピーしました ✓';
      setTimeout(()=>{ document.getElementById('shareCopy').textContent = 'リンクをコピー'; }, 2000);
    }catch(e){
      // クリップボードAPIが使えない環境でも、下の欄を選択すれば手動でコピーできる
      urlInput.select();
      urlInput.setSelectionRange(0, url.length);
      document.getElementById('shareCopy').textContent = '↓の欄からコピーしてください';
    }
  };
  menu.classList.remove('hidden');
}
document.getElementById('shareMenuClose').onclick = ()=>{
  document.getElementById('shareMenu').classList.add('hidden');
};

/* ---------- 季節のアクセントカラー（全面ではなく、装飾の一部にだけ反映） ---------- */
function applySeasonalAccent(){
  const month = new Date().getMonth() + 1;
  let color;
  if(month >= 3 && month <= 5) color = '#C97FA0';      // 春：桜色
  else if(month >= 6 && month <= 8) color = '#4F9E8C';  // 夏：涼やかな緑
  else if(month >= 9 && month <= 11) color = '#C9793D'; // 秋：紅葉色
  else color = '#5E7FA8';                                // 冬：冬空の青
  document.documentElement.style.setProperty('--season-accent', color);
}

/* ---------- 夜の書店モード（22時〜朝5時は、ランプの灯る真夜中の読書室に） ---------- */
function applyNightModeIfNeeded(){
  const hour = new Date().getHours();
  if(hour >= 22 || hour < 5){
    document.body.classList.add('night');
  }
}

(async function init(){
  applySeasonalAccent();
  applyNightModeIfNeeded();
  restoreDraftIfAny();
  const greetingEl = document.getElementById('firstGreetingText');
  if(greetingEl){
    const line = GREETING_LINES[Math.floor(Math.random()*GREETING_LINES.length)];
    greetingEl.textContent = line + '近いものを選んでも、下に自由に書いてもらっても構いません。';
  }
  await initPrefs();
  renderFair();
  renderCategorySelect();
  libraryCache = await loadJSON('emotion-bookstore-library', []);
  renderShelfTabs();
  renderShelfDisplay();
  renderShelf();
  updateStoryCount();
  renderChartOptions('root');
})();
