/* ============================================================
 * main.js — 対話ロジック・IndexedDB・番台制御など
 * 「みんなの感情書店」のロジック本体です。
 * data.js（BOOK_POOL, CATEGORIES, CHAT_TREE などのデータ）を
 * 先に読み込んだ後にこのファイルを読み込んでください。
 * <script src="data.js"></script>
 * <script src="main.js"></script>
 * ============================================================ */

/* ============================================================
 * 収益化・計測IDの定数化（ここを書き換えるだけで全リンクに反映）
 * ============================================================ */
const GA4_MEASUREMENT_ID = 'G-TGLD3KW523';
const AMAZON_ASSOCIATE_ID = 'uta0106-22';
const RAKUTEN_AFFILIATE_ID = '559f40bd.f0ebdb3f.559f40be.23fb194a';

function amazonSearchUrl(query, indexParam){
  let url = 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(query);
  if(indexParam) url += '&i=' + indexParam;
  if(AMAZON_ASSOCIATE_ID){
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

/* 選ばれた棚（tier）に応じて、DETOUR_POOLからデータを取得し、
 * IDを合体させたアフィリエイトURLを動的に生成する。 */
function buildDetourLinks(item){
  if(!item || !item.query) return null;
  return {
    amazon: amazonSearchUrl(item.query),
    rakuten: rakutenSearchUrl(item.query)
  };
}

function detourItemsFor(catId){
  return DETOUR_POOL[catId] || [];
}

function generateTitle(categoryId, story){
  if(story){
    const kw = extractCategoryKeyword(story, categoryId);
    if(kw){
      const tone = NEGATIVE_SHELVES.includes(categoryId) ? 'heavy' : 'neutral';
      const suffixes = TITLE_SUFFIXES[tone];
      const suf = suffixes[Math.floor(Math.random()*suffixes.length)];
      const cleaned = kw.replace(/(する|した|してる|な)$/, '');
      return cleaned + suf;
    }
  }
  const pool = TITLE_TEMPLATES[categoryId] || ['名前のない一冊'];
  return pool[Math.floor(Math.random()*pool.length)];
}

function recommendReasonFor(catId){
  const pool = RECOMMEND_TEMPLATES[catId];
  if(!pool || !pool.length) return '';
  return pool[Math.floor(Math.random()*pool.length)];
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

const STORY_LIMIT = 700;
let activeCategory = CATEGORIES[0].id;
let libraryCache = [];

/* ---------- 感情棚のうち、重めのトーンを持つ棚 ---------- */
const NEGATIVE_SHELVES = ['moyamoya','ushirometai','kuyashii','kodoku','aseri','shitto','hazukashii','gakkari'];

const TITLE_SUFFIXES = {
  heavy: ['の夜','だけの時間','を抱えて','という日','に、そっと','を噛みしめて'],
  neutral: ['の欠片','という日','を、そっと','がくれたもの','の頁','の記録']
};

function extractCategoryKeyword(text, categoryId){
  const words = (CATEGORY_KEYWORDS[categoryId] || []).slice().sort((a,b)=>b.length-a.length);
  for(const w of words){
    if(text.includes(w)) return w;
  }
  return null;
}

/* ---------- 番台：脱・言語化の2ステップUI ---------- */
const TEXTURE_GROUPS = [
  {
    id:'sink',
    label:'心が重く沈んでいる、気分が落ち込んでいる（静かな憂鬱）',
    keeper:'少しお疲れのようですね。このあたりの棚に、今の心に寄り添う本があるかもしれません。',
    shelves:['moyamoya','kodoku','gakkari','hazukashii','ushirometai'],
    tone:'heavy'
  },
  {
    id:'wave',
    label:'心がざわざわして落ち着かない、焦りや不安がある（動的な葛藤）',
    keeper:'感情が波立っているのですね。こちらの棚に並ぶ言葉が、ヒントになるかもしれません。',
    shelves:['aseri','kuyashii','shitto','akogare'],
    tone:'heavy'
  },
  {
    id:'light',
    label:'心が穏やか、または前向きでワクワクしている（ポジティブ）',
    keeper:'素敵な心の状態ですね。今の明るい気分にぴったりの棚を覗いてみませんか。',
    shelves:['wakuwaku','ando','kansha','itooshii','hokorashii'],
    tone:'neutral'
  },
  {
    id:'sepia',
    label:'過去の出来事や、懐かしい記憶を振り返っている（追憶）',
    keeper:'過去の頁をめくっているのですね。思い出に浸れるこちらの棚がおすすめです。',
    shelves:['natsukashii','ushirometai','kansha'],
    tone:'neutral'
  }
];

let currentTone = 'neutral';
let counterDraftText = '';

/* ---------- storage ---------- */
const STORAGE_VERSION = 1;
const IDB_NAME = 'emotion-bookstore';
const IDB_STORE = 'kv';
let storageWarned = false;
let idbHandle = null;
let idbBroken = false;

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
        idbHandle.onclose = ()=>{ idbHandle = null; };
        done(idbHandle);
      };
      req.onerror = ()=>{ idbBroken = true; done(null); };
      req.onblocked = ()=>{ done(null); };
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
  let wrapped = await idbGet(key);
  if(wrapped === undefined){
    wrapped = lsGet(key);
    if(wrapped !== undefined){
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

/* ---------- 気持ちを手放す ---------- */
const PURIFY_LOG_KEY = 'emotion-bookstore-purify-log';

function openPurify(shelfId){
  const overlay = document.getElementById('purifyOverlay');
  if(!overlay) return;
  overlay.dataset.shelf = shelfId;
  const lead = document.getElementById('purifyLead');
  const input = document.getElementById('purifyInput');
  const msg = document.getElementById('purifyMsg');
  const btn = document.getElementById('purifyBtn');
  if(lead) lead.textContent = PURIFY_LEADS[shelfId] || 'その気持ちを、そのまま書き出してみてください。';
  if(input){
    input.value = '';
    input.classList.remove('dissolving');
    input.style.display = '';
    input.disabled = false;
  }
  if(btn){
    btn.disabled = false;
    btn.textContent = '🕯 手放す';
    btn.dataset.stage = 'input';
  }
  if(msg){
    msg.classList.add('hidden');
    msg.textContent = '';
  }
  overlay.classList.remove('hidden');
  if(input) setTimeout(()=>input.focus(), 100);
}

function closePurify(){
  const overlay = document.getElementById('purifyOverlay');
  if(overlay) overlay.classList.add('hidden');
}

const btnPurifyClose = document.getElementById('purifyClose');
if(btnPurifyClose) btnPurifyClose.onclick = closePurify;

const overlayPurify = document.getElementById('purifyOverlay');
if(overlayPurify) overlayPurify.addEventListener('click', (e)=>{
  if(e.target.id === 'purifyOverlay') closePurify();
});

const btnPurify = document.getElementById('purifyBtn');
if(btnPurify) btnPurify.onclick = async ()=>{
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
  if(msg){
    msg.textContent = PURIFY_CLOSING[Math.floor(Math.random()*PURIFY_CLOSING.length)];
    msg.classList.remove('hidden');
  }
  btn.textContent = '閉じる';
  btn.dataset.stage = 'done';
  btn.disabled = false;
};

/* ★手放した気持ちの履歴を表示する関数 */
async function showPurifyLog(){
  const log = await loadJSON(PURIFY_LOG_KEY, []);
  if(log.length === 0){
    showCurateBox('まだ、手放した気持ちの記録はありません。', [{label:'閉じる', primary:true, onClick:()=>{} }]);
    return;
  }
  const msg = log.map(p => `[${new Date(p.date).toLocaleDateString('ja-JP')} / ${(CATEGORIES.find(c=>c.id===p.category)||{}).label || ''}]\n${p.text}`).join('\n\n---\n\n');

  const mCat = document.getElementById('modalCat');
  if(mCat) mCat.textContent = '記録';
  const mTitle = document.getElementById('modalTitle');
  if(mTitle) mTitle.textContent = '手放した気持ち';
  const mDate = document.getElementById('modalDate');
  if(mDate) mDate.textContent = '';
  const mStory = document.getElementById('modalStory');
  if(mStory) mStory.textContent = msg;

  const mNote = document.getElementById('modalNote');
  if(mNote) mNote.classList.add('hidden');
  const mTweet = document.getElementById('modalTweet');
  if(mTweet) mTweet.classList.add('hidden');
  const mPhoto = document.getElementById('modalPhoto');
  if(mPhoto) mPhoto.classList.add('hidden');

  const mDel = document.getElementById('modalDel');
  if(mDel) mDel.style.display = 'none';
  const mGoShelf = document.getElementById('modalGoShelf');
  if(mGoShelf) mGoShelf.style.display = 'none';

  const bModal = document.getElementById('bookModal');
  if(bModal) bModal.classList.remove('hidden');

  const closeBtn = document.getElementById('modalClose');
  const originalClose = closeBtn.onclick;
  closeBtn.onclick = () => {
    if(bModal) bModal.classList.add('hidden');
    if(mDel) mDel.style.display = '';
    if(mGoShelf) mGoShelf.style.display = '';
    closeBtn.onclick = originalClose;
  };
}

const PERSONAL_INFO_PATTERNS = [/\d{2,4}-\d{3,4}-\d{3,4}/, /[\w.+-]+@[\w-]+\.[\w.-]+/, /(本名|住所|電話番号|LINE\s*ID)[:：]/];
const ATTACK_WORDS = ['死ね','殺す','消えろ','ぶっ殺'];
const CRISIS_STORY_PATTERNS = ['死にたい','消えたい','自分を傷つけ','リストカット'];

/* ============================================================
 * 感情分析エンジン（完全ローカル・超軽量センチメント分析）
 * Step1: 否定語チェック（正規表現）でポジ→ネガの反転補正
 * Step2: スコア加算方式で最も合計スコアが高い棚を決定
 * Step3: どれにも引っかからない／拮抗した場合はnullを返し、
 *        呼び出し側で「名もなき夜の棚」へ軟着陸させる
 * ============================================================ */
const NEGATION_SUFFIX_RE = /^(ない|ません|ず|とは言えない|ではない|じゃない|わけではない)/;
const POSITIVE_FLIP_TARGET = {
  wakuwaku:'gakkari', hokorashii:'hazukashii', ando:'aseri',
  itooshii:'kodoku', kansha:'gakkari', akogare:'gakkari'
};

function scoreEmotions(text){
  const scores = {};
  const add = (id, n)=>{ scores[id] = (scores[id] || 0) + n; };
  for(const id in CATEGORY_KEYWORDS){
    const words = CATEGORY_KEYWORDS[id];
    for(const w of words){
      let from = 0, idx;
      while((idx = text.indexOf(w, from)) !== -1){
        const after = text.slice(idx + w.length, idx + w.length + 8);
        if(NEGATION_SUFFIX_RE.test(after)){
          const flipTarget = POSITIVE_FLIP_TARGET[id];
          if(flipTarget) add(flipTarget, 1); else add(id, -1);
        }else{
          add(id, 1);
        }
        from = idx + w.length;
      }
    }
  }
  return scores;
}

function extractTopKeyword(text){
  let best = null;
  for(const id in CATEGORY_KEYWORDS){
    for(const w of CATEGORY_KEYWORDS[id]){
      if(text.includes(w) && (!best || w.length > best.length)) best = w;
    }
  }
  return best;
}

function detectShelfFromText(text, minScore){
  const scores = scoreEmotions(text);
  let bestId = null, bestScore = 0, secondScore = 0;
  for(const id in scores){
    if(scores[id] > bestScore){
      secondScore = bestScore;
      bestScore = scores[id];
      bestId = id;
    }else if(scores[id] > secondScore){
      secondScore = scores[id];
    }
  }
  if(bestScore <= 0) return null;
  if(bestScore === secondScore) return null; // 完全に拮抗 → セーフティネットへ
  return bestScore >= (minScore || 1) ? bestId : null;
}

/* ---------- ペルソナ自動判定 ---------- */
function detectPersona(text){
  for(const p of PERSONA_PATTERNS){
    if(p.pattern.test(text)) return p.id;
  }
  return null;
}

/* 可変報酬型メッセージ：確率5%で激レア演出を差し込む */
function personaFlavorReply(personaId){
  if(!personaId) return null;
  const rarePool = PERSONA_RARE_MESSAGES[personaId];
  if(rarePool && rarePool.length && Math.random() < 0.05){
    return rarePool[Math.floor(Math.random()*rarePool.length)];
  }
  const pool = PERSONA_MESSAGES[personaId];
  if(!pool || !pool.length) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

function localCurate(title, story, chosenId){
  const combined = title + '\n' + story;
  if(CRISIS_STORY_PATTERNS.some(w=>combined.includes(w))){
    return {
      approved:false, category:null, note:'',
      reason:'その気持ちは、ここに書き留めるだけでなく、信頼できる大人の方や「よりそいホットライン」0120-279-338にも、ぜひ話してみてください。'
    };
  }
  if(PERSONAL_INFO_PATTERNS.some(p=>p.test(combined))){
    return { approved:false, category:null, note:'', reason:'連絡先や個人が特定できる情報が含まれているようです。そこだけ伏せて、もう一度お持ちください。' };
  }
  if(ATTACK_WORDS.some(w=>combined.includes(w))){
    return { approved:false, category:null, note:'', reason:'誰かを深く傷つける言葉が含まれているようです。ご自身の気持ちの部分だけ、綴り直してみてください。' };
  }
  const scores = scoreEmotions(combined);
  let bestId = chosenId, bestScore = 0;
  for(const id in scores){
    if(scores[id] > bestScore){ bestScore = scores[id]; bestId = id; }
  }
  const suggested = (bestScore >= 2 && bestId !== chosenId) ? bestId : chosenId;
  return {
    approved:true,
    category:suggested,
    note: SHOPKEEPER_NOTES[Math.floor(Math.random()*SHOPKEEPER_NOTES.length)],
    reason:''
  };
}

/* コールドリーディング的な、誰にでも当てはまりそうな一言（バーナム効果）
 * を、最初のやり取りで低確率にだけ差し込む。 */
function fillColdReadOpener(shelfId){
  const cat = CATEGORIES.find(c=>c.id===shelfId);
  if(!cat) return null;
  const tmpl = COLD_READ_OPENERS[Math.floor(Math.random()*COLD_READ_OPENERS.length)];
  return tmpl.replace('{def}', cat.def).replace('{label}', cat.label);
}

function localShiori(topLabel){
  const t = SHIORI_TEMPLATES[Math.floor(Math.random()*SHIORI_TEMPLATES.length)];
  return t.replace('{cat}', topLabel);
}

/* ---------- preferences ---------- */
let prefs = { motion:true, sound:false };
const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function applyPrefs(){
  document.body.classList.toggle('no-motion', !prefs.motion);
  const mt = document.getElementById('motionToggle');
  const st = document.getElementById('soundToggle');
  if(mt){
    mt.textContent = '演出：' + (prefs.motion ? '入' : '切');
    mt.classList.toggle('on', prefs.motion);
  }
  if(st){
    st.textContent = '環境音：' + (prefs.sound ? '入' : '切');
    st.classList.toggle('on', prefs.sound);
  }
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

const mtBtn = document.getElementById('motionToggle');
if(mtBtn) mtBtn.onclick = ()=>{
  prefs.motion = !prefs.motion;
  applyPrefs();
  saveJSON('emotion-bookstore-prefs', prefs);
};
const stBtn = document.getElementById('soundToggle');
if(stBtn) stBtn.onclick = ()=>{
  prefs.sound = !prefs.sound;
  applyPrefs();
  saveJSON('emotion-bookstore-prefs', prefs);
};

/* ---------- ambience ---------- */
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

function buzz(ms){
  if(prefs.motion && navigator.vibrate){
    try{ navigator.vibrate(ms); }catch(e){}
  }
}

const HEAVY_WORDS = ['つら','しんど','悲し','泣','苦し','不安','怖','孤独','疲れ','嫌','消え'];
const BRIGHT_WORDS = ['嬉し','楽し','わくわく','ワクワク','好き','幸','誇ら','最高'];
function setMood(text){
  if(!prefs.motion) return;
  const layer = document.getElementById('moodLayer');
  if(!layer) return;
  if(HEAVY_WORDS.some(w=>text.includes(w))){
    layer.style.background = 'rgba(45,60,110,0.07)';
  }else if(BRIGHT_WORDS.some(w=>text.includes(w))){
    layer.style.background = 'rgba(255,150,60,0.06)';
  }else{
    layer.style.background = 'rgba(0,0,0,0)';
  }
}

function scrollToId(id){
  const el = document.getElementById(id);
  if(el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 20;
    window.scrollTo({ top: y, behavior: prefs.motion ? 'smooth' : 'auto' });
  }
}

function setActivePageTab(id){
  document.querySelectorAll('.page-tab').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.page === id);
  });
}

function goToPage(id){
  setActivePageTab(id);
  if(id === 'desk') syncCounterDraftToDesk();
  if(!prefs.motion){
    scrollToId(id);
    return;
  }
  const overlay = document.getElementById('pageTurnOverlay');
  if(!overlay){
    scrollToId(id);
    return;
  }
  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');
  buzz(10);
  setTimeout(()=>scrollToId(id), 260);
  setTimeout(()=>overlay.classList.remove('active'), 650);
}

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

/* ---------- ページ最下部での「トップに戻る」ボタン ---------- */
(function(){
  const btn = document.getElementById('backToTopBtn');
  if(!btn) return;
  const onScroll = ()=>{
    if(window.scrollY > 480) btn.classList.remove('hidden');
    else btn.classList.add('hidden');
  };
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
  btn.onclick = ()=>{
    buzz(6);
    window.scrollTo({ top:0, behavior: prefs.motion ? 'smooth' : 'auto' });
    setActivePageTab('');
  };
})();

function renderFair(){
  const box = document.getElementById('fairBox');
  if(!box) return;
  const m = new Date().getMonth() + 1;
  const fair = MONTH_FAIR[m];
  if(!fair) return;
  const cat = CATEGORIES.find(c=>c.id===fair.id);
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

function topCategoryId(){
  if(libraryCache.length === 0) return null;
  const counts = {};
  libraryCache.forEach(e=>{ counts[e.category] = (counts[e.category]||0) + 1; });
  return CATEGORIES.filter(c=>counts[c.id]).sort((a,b)=>counts[b.id]-counts[a.id])[0].id;
}

function renderShelfTabs(){
  const wrap = document.getElementById('shelfTabs');
  if(!wrap) return;
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
  const el = document.getElementById('shelfDisplay');
  if(!el) return;
  const cat = CATEGORIES.find(c=>c.id===activeCategory);
  if(!cat) return;
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
              <a class="recommend-buy" href="${amazonUrl}" target="_blank" rel="noopener sponsored">Amazon</a>
              <a class="recommend-buy kindle" href="${kindleUrl}" target="_blank" rel="noopener sponsored">Kindle</a>
              <a class="recommend-buy audible" href="${audibleUrl}" target="_blank" rel="noopener sponsored">Audible</a>
              <a class="recommend-buy rakuten" href="${rakutenUrl}" target="_blank" rel="noopener sponsored">楽天</a>
            </span>
            ${r.source ? `<a class="recommend-source" href="${r.sourceUrl}" target="_blank" rel="noopener">出典：${r.source}</a>` : ''}
          </span>`;
        }).join('')}
        <button type="button" class="recommend-shuffle" onclick="renderShelfDisplay()" title="他のおすすめを見る">🔀 他も見る</button>
        <a class="recommend-more" href="${moodSearchUrl}" target="_blank" rel="noopener">🔎 「${cat.label}」な気分の本を、いろんな人のおすすめから探す →</a>
        </div>
       </div>`
    : '';

  /* ★感情の「処方箋ソング」— MUSIC_QUERIESからランダムに1曲を抽出して反映 */
  const songs = MUSIC_QUERIES[cat.id] || [];
  let musicHtml;
  if(songs.length){
    const song = songs[Math.floor(Math.random()*songs.length)];
    const q = song.title + ' ' + song.artist;
    const amUrl = amazonSearchUrl(q + ' 音楽', 'digital-music');
    const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
    const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q);
    musicHtml = `<div class="music-row prescription">
      <p class="playlist-label">🎵 店主の処方箋ソング — 「${cat.label}」なあなたに、今日はこの一曲を</p>
      <div class="playlist-track-row">
        <span class="playlist-track-name">『${song.title}』${song.artist}</span>
        <span class="playlist-services">
          <a href="${spUrl}" target="_blank" rel="noopener">Spotify</a>
          <a href="${amUrl}" target="_blank" rel="noopener sponsored">Amazon Music</a>
          <a href="${ytUrl}" target="_blank" rel="noopener">YouTube</a>
        </span>
      </div>
      <button type="button" class="recommend-shuffle" onclick="renderShelfDisplay()" title="別の一曲を処方してもらう">🔀 別の一曲を処方してもらう</button>
    </div>`;
  }else{
    const musicUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(cat.label + ' 邦楽 プレイリスト');
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
    <button type="button" class="episode-shuffle" onclick="renderShelfDisplay()">🔀 エピソードも見る</button>
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

function renderCategorySelect(){
  const sel = document.getElementById('categorySelect');
  if(!sel) return;
  sel.innerHTML = CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  sel.addEventListener('change', ()=>{
    const deskLabel = document.getElementById('deskCategoryLabel');
    if(deskLabel) deskLabel.textContent = shelfLabelOf(sel.value);
  });
}

function spineColorFor(catId){
  const idx = CATEGORIES.findIndex(c=>c.id===catId);
  return SPINE_COLORS[idx % SPINE_COLORS.length];
}

function renderShelf(markNewest){
  const shelf = document.getElementById('myShelf');
  if(!shelf) return;
  const emptyMsg = document.getElementById('shelfEmptyMsg');
  const countBadge = document.getElementById('shelfCount');
  shelf.querySelectorAll('.spine').forEach(n=>n.remove());
  if(countBadge) countBadge.textContent = libraryCache.length ? `蔵書 ${libraryCache.length}冊` : '';
  if(libraryCache.length === 0){
    if(emptyMsg) emptyMsg.style.display = 'block';
    appendEmptySpine(shelf);
    applyShelfTier();
    renderTrend();
    renderShioriCard();
    renderRecordCorner();
    return;
  }
  if(emptyMsg) emptyMsg.style.display = 'none';
  libraryCache.forEach((entry, i)=>{
    const cat = CATEGORIES.find(c=>c.id===entry.category);
    const spine = document.createElement('div');
    spine.className = 'spine';
    spine.style.background = spineColorFor(entry.category);
    spine.style.height = (140 + (entry.title.length % 4) * 12) + 'px';
    const tilt = ((entry.title.length * 7 + i * 13) % 5) - 2;
    spine.style.setProperty('--tilt', tilt + 'deg');
    spine.textContent = (entry.sealed ? '🔖 ' : '') + (entry.image ? '📷 ' : '') + entry.title;
    spine.title = cat ? cat.label : '';
    spine.onclick = ()=>{ buzz(8); openBook(entry); };
    if(markNewest && i === libraryCache.length - 1 && prefs.motion){
      spine.classList.add('new');
      setTimeout(()=>spine.classList.remove('new'), 600);
    }
    shelf.appendChild(spine);
  });
  appendEmptySpine(shelf);
  applyShelfTier();
  renderTrend();
  renderShioriCard();
  renderRecordCorner();
}

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
  if(!box || !bars || !sum) return;
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
  if(top) sum.textContent = `いまのあなたの本棚は、「${top.label}」の棚がいちばん厚いようです。`;
}

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
  if(!card || !slip || !btn || !imgBtn || !imgHint) return;

  if(libraryCache.length === 0){
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  const cached = await loadJSON('emotion-bookstore-shiori', null);
  if(cached && cached.date === todayStr() && cached.text){
    const stext = document.getElementById('shioriText');
    if(stext) stext.textContent = cached.text;
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

const btnStoryImg = document.getElementById('storyImageBtn');
if(btnStoryImg) {
  btnStoryImg.onclick = async ()=>{
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
        a.download = 'emotion-bookstore-shiori.png';
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
}

const btnShiori = document.getElementById('shioriBtn');
if(btnShiori){
  btnShiori.onclick = async ()=>{
    const btn = document.getElementById('shioriBtn');
    btn.disabled = true;
    btn.textContent = '店主が言葉を選んでいます…';
    await wait(prefs.motion ? 600 : 50);
    const topId = topCategoryId();
    const topLabel = (CATEGORIES.find(c=>c.id===topId) || {}).label || 'あなた';
    const text = localShiori(topLabel);

    const sText = document.getElementById('shioriText');
    if(sText) sText.textContent = text;

    const slip = document.getElementById('shioriSlip');
    if(slip) slip.classList.remove('hidden');
    btn.classList.add('hidden');

    const imgBtn = document.getElementById('storyImageBtn');
    if(imgBtn) imgBtn.classList.remove('hidden');
    const imgHint = document.getElementById('storyImageHint');
    if(imgHint) imgHint.classList.remove('hidden');

    saveJSON('emotion-bookstore-shiori', { date: todayStr(), text });
  };
}

function formatDate(iso){
  try{
    return new Date(iso).toLocaleDateString('ja-JP', {year:'numeric', month:'long', day:'numeric'}) + ' 納品';
  }catch(e){ return ''; }
}

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
    s.onerror = resolve;
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
  }catch(e){}
}

function openBook(entry){
  const cat = CATEGORIES.find(c=>c.id===entry.category);
  const mCat = document.getElementById('modalCat');
  if(mCat) mCat.textContent = cat ? cat.label + 'の棚' : '';
  const mTitle = document.getElementById('modalTitle');
  if(mTitle) mTitle.textContent = entry.title;
  const mDate = document.getElementById('modalDate');
  if(mDate) mDate.textContent = (entry.date ? formatDate(entry.date) : '') + (entry.sealed ? ' 🔖 以前を振り返って綴った一冊' : '');

  const photoBox = document.getElementById('modalPhoto');
  if(photoBox){
    if(entry.image){
      document.getElementById('modalPhotoImg').src = entry.image;
      photoBox.classList.remove('hidden');
    }else{
      photoBox.classList.add('hidden');
    }
  }
  const mStory = document.getElementById('modalStory');
  if(mStory) mStory.textContent = entry.story;

  const noteSlip = document.getElementById('modalNote');
  if(noteSlip){
    if(entry.note){
      document.getElementById('modalNoteText').textContent = entry.note;
      noteSlip.classList.remove('hidden');
    }else{
      noteSlip.classList.add('hidden');
    }
  }

  const tweetBox = document.getElementById('modalTweet');
  if(tweetBox){
    if(entry.tweetUrl){
      renderTweetEmbed(tweetBox, entry.tweetUrl);
    }else{
      tweetBox.classList.add('hidden');
      tweetBox.innerHTML = '';
    }
  }

  const bModal = document.getElementById('bookModal');
  if(bModal) bModal.classList.remove('hidden');

  const goShelf = document.getElementById('modalGoShelf');
  if(goShelf) goShelf.onclick = ()=>{
    if(bModal) bModal.classList.add('hidden');
    goToShelf(entry.category);
  };

  const mDel = document.getElementById('modalDel');
  if(mDel) mDel.onclick = async ()=>{
    libraryCache = libraryCache.filter(e=>e.id !== entry.id);
    await saveJSON('emotion-bookstore-library', libraryCache);
    renderShelf();
    renderShelfTabs();
    if(bModal) bModal.classList.add('hidden');
  };
}

const btnModalClose = document.getElementById('modalClose');
if(btnModalClose) btnModalClose.onclick = ()=>{
  const m = document.getElementById('bookModal');
  if(m) m.classList.add('hidden');
};

function runBinding(onDone){
  if(!prefs.motion){ onDone(); return; }
  const ov = document.getElementById('bindOverlay');
  const txt = document.getElementById('bindText');
  if(!ov || !txt){ onDone(); return; }
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

/* ★推薦状：INVITES本文に加えて、DETOUR_POOLを使ってAmazon/楽天の
 * 実リンク（アフィリエイトタグ付き）を動的生成して添える */
function showInvitation(catId){
  const inv = INVITES[catId];
  if(!inv) return;
  const t = document.getElementById('invTitle');
  if(t) t.textContent = inv.t;
  const b = document.getElementById('invBody');
  if(b) b.textContent = inv.b;

  const productBox = document.getElementById('invProduct');
  if(productBox){
    const items = [{ label:inv.productQuery ? '店主の一番のおすすめ' : '', query: inv.productQuery }]
      .concat(detourItemsFor(catId).slice(0, 2))
      .filter(it=>it && it.query);
    productBox.innerHTML = items.map(it=>{
      const links = buildDetourLinks(it);
      if(!links) return '';
      return `<span class="inv-product-chip">${it.label ? it.label + '：' : ''}<a href="${links.amazon}" target="_blank" rel="noopener sponsored">Amazon</a><a href="${links.rakuten}" target="_blank" rel="noopener sponsored">楽天</a></span>`;
    }).join('');
  }

  const c = document.getElementById('invitationCard');
  if(c) c.classList.remove('hidden');
}

const btnInvClose = document.getElementById('invClose');
if(btnInvClose) btnInvClose.onclick = ()=>{
  const c = document.getElementById('invitationCard');
  if(c) c.classList.add('hidden');
};

function showCurateBox(message, actions){
  const box = document.getElementById('curateBox');
  const msgEl = document.getElementById('curateMsg');
  const actEl = document.getElementById('curateActions');
  if(!box || !msgEl || !actEl) return;
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
  const box = document.getElementById('curateBox');
  if(box) box.classList.add('hidden');
}

const btnAssist = document.getElementById('assistBtn');
if(btnAssist) {
  btnAssist.onclick = ()=>{
    const ta = document.getElementById('storyInput');
    if(!ta) return;
    if(ta.value.trim() === ''){
      ta.value = 'いつ：\nどこで：\nなにがあった：\nそのとき、胸の中は：\n';
      updateStoryCount();
    }
    ta.focus();
  };
}

function updateStoryCount(){
  const ta = document.getElementById('storyInput');
  const el = document.getElementById('storyCount');
  if(!ta || !el) return;
  const len = ta.value.length;
  el.textContent = len + ' / ' + STORY_LIMIT + '字';
  el.classList.toggle('over', len > STORY_LIMIT);
}

const inputStory = document.getElementById('storyInput');
if(inputStory) {
  inputStory.addEventListener('input', updateStoryCount);
}

const DRAFT_KEY = 'emotion-bookstore-draft';
let draftTimer = null;
if(inputStory) {
  inputStory.addEventListener('input', ()=>{
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
}

async function restoreDraftIfAny(){
  const draft = await loadJSON(DRAFT_KEY, null);
  if(!draft || !draft.text) return;
  const ta = document.getElementById('storyInput');
  if(!ta) return;
  if(ta.value.trim()) return;
  const msg = document.getElementById('deskMsg');
  ta.value = draft.text;
  updateStoryCount();
  if(msg) msg.textContent = '書きかけの下書きを復元しました。続きからどうぞ。';
}

const btnSubmit = document.getElementById('submitStory');
if(btnSubmit) {
  btnSubmit.onclick = async ()=>{
    const sel = document.getElementById('categorySelect');
    if(!sel) return;
    const chosenId = sel.value;
    const ta = document.getElementById('storyInput');
    const story = ta ? ta.value.trim() : '';
    const msg = document.getElementById('deskMsg');
    const btn = document.getElementById('submitStory');
    hideCurateBox();
    if(!story){
      if(msg) msg.textContent = 'まずは、そのときの気持ちを書いてみてください。';
      return;
    }
    const tInput = document.getElementById('titleInput');
    const title = (tInput ? tInput.value.trim() : '') || generateTitle(chosenId, story);
    if(story.length > STORY_LIMIT){
      if(msg) msg.textContent = '本文は' + STORY_LIMIT + '字までに収めてください。';
      return;
    }
    btn.disabled = true;
    if(msg) msg.textContent = '店主が物語に目を通しています…';

    const chosenLabel = (CATEGORIES.find(c=>c.id===chosenId) || {}).label || '';
    const twInput = document.getElementById('tweetInput');
    const tweetRaw = twInput ? twInput.value.trim() : '';
    const tweetUrl = /^https:\/\/(x\.com|twitter\.com)\/[^\/]+\/status\/\d+/.test(tweetRaw) ? tweetRaw : '';
    const wSel = document.getElementById('whenSelect');
    const isPast = wSel ? (wSel.value === 'past') : false;

    if(tweetRaw && !tweetUrl){
      if(msg) msg.textContent = 'Xの投稿リンクの形式が正しくないようです（例：https://x.com/ユーザー名/status/12345）。';
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
          image: attachedPhoto || '',
          tweetUrl: tweetUrl || '',
          sealed: isPast,
          date: new Date().toISOString()
        };
        libraryCache.push(entry);
        clearAttachedPhoto();
        playSuckAnimation(finalCategory);
        renderShelf(true);
        renderShelfTabs();
        if(tInput) tInput.value = '';
        if(ta) ta.value = '';
        deleteKey(DRAFT_KEY);
        if(twInput) twInput.value = '';
        if(wSel) wSel.value = 'now';
        updateStoryCount();
        const label = shelfLabelOf(finalCategory);
        if(msg) msg.textContent = priorCount > 0
          ? `製本して、本棚に納品しました。「${label}」の棚に綴るのは、これで${priorCount + 1}冊目です。`
          : '製本して、本棚に納品しました。';

        await saveJSON('emotion-bookstore-library', libraryCache);
        await celebrateMilestoneIfNeeded(libraryCache.length);
        btn.disabled = false;
        const boundMsg = msg ? msg.textContent : '';
        setTimeout(()=>{ if(msg && msg.textContent === boundMsg) msg.textContent = ''; }, 4200);

        const inv = INVITES[finalCategory];
        if(inv){
          showInvitation(finalCategory);
          const closeBtn = document.getElementById('invClose');
          const originalClick = closeBtn.onclick;
          closeBtn.onclick = () => {
             document.getElementById('invitationCard').classList.add('hidden');
             goToPage('bookshelf');
             closeBtn.onclick = originalClick;
          };
        } else {
          setTimeout(() => goToPage('bookshelf'), 1500);
        }
      });
    };

    if(!cur){
      if(msg) msg.textContent = '';
      bind(chosenId, '');
      return;
    }

    if(!cur.approved){
      if(msg) msg.textContent = '';
      btn.disabled = false;
      showCurateBox(
        (cur.reason || 'この内容は、いまはお預かりできません。') + '\n少し書き方を変えて、また持ってきてくださいね。',
        [{ label:'書き直す', primary:true, onClick:()=>{ if(ta) ta.focus(); } }]
      );
      return;
    }

    const suggested = cur.category;
    if(suggested && suggested !== chosenId){
      const sLabel = (CATEGORIES.find(c=>c.id===suggested) || {}).label || '';
      if(msg) msg.textContent = '';
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

    if(msg) msg.textContent = '';
    bind(chosenId, cur.note);
  };
}

const btnReset = document.getElementById('resetShelf');
if(btnReset) {
  btnReset.onclick = async ()=>{
    if(!confirm('本棚のすべての本を下げます。よろしいですか？')) return;
    libraryCache = [];
    await saveJSON('emotion-bookstore-library', libraryCache);
    renderShelf();
    renderShelfTabs();
  };
}

const CRISIS_PATTERNS = ['死にたい','消えたい','いなくなりたい','自分を傷つけ','リストカット','殺し'];
const CRISIS_REPLY =
  '……そのお気持ちを、一人で抱えないでください。ここは静かな書店ですが、専門の方に話す方がずっと力になれます。' +
  '信頼できる大人の方、または「よりそいホットライン」0120-279-338、18歳までなら「チャイルドライン」0120-99-7777にも、ぜひ話してみてください。';

function matchShopkeeperReply(text){
  if(CRISIS_PATTERNS.some(w=>text.includes(w))){
    return CRISIS_REPLY;
  }
  for(const entry of KEYWORD_BANK){
    if(entry.patterns.some(p=>text.includes(p))){
      return entry.replies[Math.floor(Math.random()*entry.replies.length)];
    }
  }
  const isQuestion = text.includes('？') || text.includes('?') || /(か|の)$/.test(text.trim());
  const scores = scoreEmotions(text);
  const hasScore = Object.keys(scores).some(id=>scores[id] > 0);
  if(!hasScore){
    if(isQuestion){
      return GENERIC_QUESTION_REPLIES[Math.floor(Math.random()*GENERIC_QUESTION_REPLIES.length)];
    }
    // ★感情分析Step3：セーフティネット（名もなき夜の棚へ軟着陸）
    return '……言葉にならない、複雑な夜ですね。それでも、ここに来て話してくれてありがとうございます。';
  }
  if(isQuestion){
    return GENERIC_QUESTION_REPLIES[Math.floor(Math.random()*GENERIC_QUESTION_REPLIES.length)];
  }
  return GENERIC_REPLIES[Math.floor(Math.random()*GENERIC_REPLIES.length)];
}

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
  const container = document.getElementById('chartOptions');
  if(!container) return;
  if(nodeKey === 'root'){
    container.innerHTML = '';
    renderTextureStep();
    return;
  }
  const node = CHAT_TREE[nodeKey];
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
  focusLatestTurn(null);
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
  focusLatestTurn(null);
}

async function handleChartChoice(label, nextKey){
  const container = document.getElementById('chartOptions');
  if(container) container.innerHTML = '';
  appendBubble('user', label);
  const kf = document.getElementById('keeperFigure');
  if(kf) kf.classList.add('listening');

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bubble loading';
  loadingBubble.textContent = LOADING_LINES[Math.floor(Math.random()*LOADING_LINES.length)];
  const cw = document.getElementById('chatWindow');
  if(cw){
    cw.appendChild(loadingBubble);
    cw.scrollTop = cw.scrollHeight;
  }

  await wait(prefs.motion ? (500 + Math.random()*400) : 40);
  loadingBubble.remove();
  const node = CHAT_TREE[nextKey];
  const replyText = pickReply(node.reply);
  const bubble = appendBubble('shopkeeper', replyText);
  setMood(replyText);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 3000);
  renderChartOptions(nextKey);
  focusLatestTurn(bubble);
}

function pickReply(reply){
  if(Array.isArray(reply)) return reply[Math.floor(Math.random()*reply.length)];
  return reply;
}

const chatHistory = [];

function typeIntoNode(node, text, speed){
  if(!prefs.motion || text.length > 260){
    node.textContent = text;
    return;
  }
  node.textContent = '';
  let i = 0;
  const cw = document.getElementById('chatWindow');
  const step = ()=>{
    if(i >= text.length) return;
    node.textContent += text[i++];
    if(node.closest && node.closest('.chat-window') && cw){
      cw.scrollTop = cw.scrollHeight;
    }
    setTimeout(step, speed || 34);
  };
  step();
}

/* ★見た目の変化がすぐ分かるよう、新しい吹き出しに一瞬だけ
 * ハイライトのアニメーションを掛ける（バグと誤解されない工夫） */
function appendBubble(role, text){
  const cw = document.getElementById('chatWindow');
  if(!cw) return null;
  const div = document.createElement('div');
  div.className = 'bubble ' + (role === 'user' ? 'you' : 'shopkeeper');
  div.classList.add('bubble-flash');
  setTimeout(()=>div.classList.remove('bubble-flash'), role === 'user' ? 900 : 1300);
  if(role !== 'user'){
    if(currentTone === 'heavy') div.classList.add('tone-heavy');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = '店主';
    div.appendChild(name);
    const body = document.createElement('span');
    div.appendChild(body);
    typeIntoNode(body, text);
  } else {
    div.textContent = text;
  }
  cw.appendChild(div);
  cw.scrollTop = cw.scrollHeight;
  return div;
}

/* ★スクロールを見直し、対話を送ったら必ず最新の吹き出し（と、その
 * 下の選択肢）が画面内に来るように、内側スクロール＋外側スクロール
 * の両方を一度にまとめて行う。 */
function focusLatestTurn(bubbleEl){
  const cw = document.getElementById('chatWindow');
  if(cw) cw.scrollTop = cw.scrollHeight;
  requestAnimationFrame(()=>{
    if(bubbleEl && bubbleEl.scrollIntoView){
      bubbleEl.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block:'center' });
    }
  });
  setTimeout(()=>{
    const opts = document.getElementById('chartOptions');
    if(opts && opts.children.length){
      opts.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block:'end' });
    }
  }, prefs.motion ? 380 : 60);
}

function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

let freeTextTurns = 0;

async function sendToShopkeeper(){
  const ui = document.getElementById('userInput');
  const sb = document.getElementById('sendBtn');
  const kf = document.getElementById('keeperFigure');
  const cw = document.getElementById('chatWindow');
  if(!ui) return;
  const text = ui.value.trim();
  if(!text) return;
  if(text.length > 800){
    appendBubble('shopkeeper', '（ゆっくりで大丈夫です。長いお話は、少しずつに分けてお聞かせください。）');
    return;
  }
  const userBubble = appendBubble('user', text);
  counterDraftText = counterDraftText ? (counterDraftText + '\n' + text) : text;
  chatHistory.push({ role:'user', content:text });
  ui.value = '';
  if(sb) sb.disabled = true;
  if(kf) kf.classList.add('listening');
  setMood(text);
  focusLatestTurn(userBubble);

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bubble loading';
  loadingBubble.textContent = LOADING_LINES[Math.floor(Math.random()*LOADING_LINES.length)];
  if(cw){
    cw.appendChild(loadingBubble);
    cw.scrollTop = cw.scrollHeight;
  }

  await wait(prefs.motion ? (700 + Math.random()*600) : 60);
  currentTone = HEAVY_WORDS.some(w=>text.includes(w)) ? 'heavy' : 'neutral';
  const isCrisis = CRISIS_PATTERNS.some(w=>text.includes(w));
  const personaId = isCrisis ? null : detectPersona(text);

  let reply = matchShopkeeperReply(text);

  // ★バックトラッキング（オウム返し）：2回目以降のやり取りで、
  // ユーザーの言葉をそのまま一部返してから応じる
  if(!isCrisis && freeTextTurns >= 1){
    const kwHit = extractTopKeyword(text);
    if(kwHit) reply = `「${kwHit}」……${reply}`;
  }
  // ★心理学的リフレーミングを、たまに差し込む（怒り＝期待の裏返し 等）
  const suggestedShelf = isCrisis ? null : detectShelfFromText(text, 1);
  if(!isCrisis && suggestedShelf && REFRAME_LINES[suggestedShelf] && Math.random() < 0.4){
    reply += '\n' + REFRAME_LINES[suggestedShelf];
  }
  // ★コールドリーディング：最初のやり取りだけ、当てはまりやすい一言を低確率で前置きする
  if(!isCrisis && freeTextTurns === 0 && suggestedShelf && Math.random() < 0.35){
    const opener = fillColdReadOpener(suggestedShelf);
    if(opener) reply = opener + '\n' + reply;
  }

  loadingBubble.remove();
  const replyBubble = appendBubble('shopkeeper', reply);
  chatHistory.push({ role:'assistant', content:reply });
  focusLatestTurn(replyBubble);

  // ★可変報酬型メッセージ：判定されたペルソナに応じて、聴く・共感する
  // ことに徹したメッセージを追加で差し込む（5%で激レア演出）
  if(!isCrisis && personaId){
    const flavor = personaFlavorReply(personaId);
    if(flavor){
      await wait(prefs.motion ? 450 : 30);
      const flavorBubble = appendBubble('shopkeeper', flavor);
      focusLatestTurn(flavorBubble);
    }
  }

  freeTextTurns++;

  if(isCrisis){
    renderChartOptions('root');
  }else if(freeTextTurns >= 2){
    // ★3往復目以降は会話が拡散しがちなので、占い師のイエス誘導法・
    // フット・イン・ザ・ドアを参考に、必ず選べる選択肢へ滑らかに誘導する
    const yesPrompt = YES_LADDER_PROMPTS[Math.floor(Math.random()*YES_LADDER_PROMPTS.length)];
    const yesBubble = appendBubble('shopkeeper', yesPrompt);
    focusLatestTurn(yesBubble);
    renderSuggestionActions(suggestedShelf || 'moyamoya');
  }else if(suggestedShelf){
    renderSuggestionActions(suggestedShelf);
  }else{
    renderChartOptions('root');
  }

  if(freeTextTurns === 3 && !isCrisis){
    appendBubble('shopkeeper',
      '……私は決まった言葉しか持たない、しがない店番です。もしもっと深く話を聞いてほしい夜は、' +
      '言葉の達者な相談相手（AI）を訪ねてみるのも一つの手です。ここの棚は、いつでも開けておきますから。');

    const linkDiv = document.createElement('div');
    linkDiv.style.textAlign = 'left';
    linkDiv.style.marginLeft = '50px';
    linkDiv.style.marginTop = '8px';
    linkDiv.style.marginBottom = '16px';

    const gptLink = document.createElement('a');
    gptLink.className = 'chart-btn';
    gptLink.href = 'https://chatgpt.com/';
    gptLink.target = '_blank';
    gptLink.rel = 'noopener';
    gptLink.textContent = 'ChatGPTと話してみる';
    gptLink.style.display = 'inline-block';
    gptLink.style.marginRight = '8px';

    const gemLink = document.createElement('a');
    gemLink.className = 'chart-btn';
    gemLink.href = 'https://gemini.google.com/';
    gemLink.target = '_blank';
    gemLink.rel = 'noopener';
    gemLink.textContent = 'Geminiと話してみる';
    gemLink.style.display = 'inline-block';

    linkDiv.appendChild(gptLink);
    linkDiv.appendChild(gemLink);

    if(cw) cw.appendChild(linkDiv);
  }

  if(sb) sb.disabled = false;
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 3500);
}

const sendBtn = document.getElementById('sendBtn');
if(sendBtn) sendBtn.onclick = sendToShopkeeper;

const userInput = document.getElementById('userInput');
if(userInput){
  userInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      sendToShopkeeper();
    }
  });
}

function renderTextureStep(){
  const box = document.getElementById('textureStep');
  if(!box) return;
  box.innerHTML = '';
  TEXTURE_GROUPS.forEach((group, i)=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'texture-btn';
    btn.textContent = group.label;
    btn.style.animationDelay = (i * 70) + 'ms';
    btn.onclick = ()=>chooseTexture(group, btn);
    box.appendChild(btn);
  });
}

async function chooseTexture(group, btnEl){
  const box = document.getElementById('textureStep');
  if(box){
    box.querySelectorAll('.texture-btn').forEach(b=>{
      b.classList.toggle('selected', b === btnEl);
      b.classList.toggle('dimmed', b !== btnEl);
    });
  }
  currentTone = group.tone;
  buzz(6);
  appendBubble('user', group.label);
  const kf = document.getElementById('keeperFigure');
  if(kf) kf.classList.add('listening');
  await wait(prefs.motion ? 420 : 30);
  const bubble = appendBubble('shopkeeper', group.keeper);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 2500);
  renderEmotionChips(group);
  focusLatestTurn(bubble);
}

function renderEmotionChips(group){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';
  const shelves = group.shelves.filter(id=>CATEGORIES.some(c=>c.id === id));
  shelves.forEach((id, i)=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chart-btn shelf-chip fade-in';
    btn.style.animationDelay = (i * 90) + 'ms';
    btn.textContent = shelfLabelOf(id);
    btn.onclick = ()=>chooseEmotionShelf(id);
    container.appendChild(btn);
  });
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'chart-btn ghost fade-in';
  back.style.animationDelay = (shelves.length * 90) + 'ms';
  back.textContent = '質感から選び直す';
  back.onclick = ()=>{
    appendBubble('shopkeeper', '……今は、どんな手ざわりに近いですか。');
    renderChartOptions('root');
  };
  container.appendChild(back);
}

/* ★棚を選んだ後、CHAT_TREEを使ってもう一段だけ深く聞き返す
 * （バックトラッキングで「聴いてもらえている」感覚を強める） */
async function chooseEmotionShelf(shelfId){
  currentTone = NEGATIVE_SHELVES.includes(shelfId) ? 'heavy' : 'neutral';
  buzz(6);
  appendBubble('user', shelfLabelOf(shelfId));
  const kf = document.getElementById('keeperFigure');
  if(kf) kf.classList.add('listening');
  await wait(prefs.motion ? 380 : 30);
  const node = CHAT_TREE[shelfId];
  const replyText = node ? pickReply(node.reply) : `『${shelfLabelOf(shelfId)}』の棚ですね。文字を打たなくても大丈夫。そのまま棚を眺めても、一冊綴っていっても構いませんよ。`;
  const bubble = appendBubble('shopkeeper', replyText);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 2500);
  if(node){
    renderChartOptions(shelfId);
  }else{
    renderSuggestionActions(shelfId);
  }
  focusLatestTurn(bubble);
}

function syncCounterDraftToDesk(){
  if(!counterDraftText) return;
  const ta = document.getElementById('storyInput');
  if(!ta) return;
  if(ta.value.includes(counterDraftText)) return;
  ta.value = ta.value.trim()
    ? (ta.value.replace(/\s+$/, '') + '\n' + counterDraftText)
    : counterDraftText;
  ta.dispatchEvent(new Event('input'));
  const msg = document.getElementById('deskMsg');
  if(msg) msg.textContent = '番台でお聞きしたお話を、原稿用紙に書き留めておきました。続きをどうぞ、あなたのペースで綴ってください';
}

(function(){
  const input = document.getElementById('userInput');
  if(!input) return;
  input.addEventListener('focus', ()=>document.body.classList.add('focus-dim'));
  input.addEventListener('blur', ()=>document.body.classList.remove('focus-dim'));
})();

let attachedPhoto = '';

function loadImageFromFile(file){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

async function compressImageFile(file){
  const img = await loadImageFromFile(file);
  const MAX_EDGE = 800;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  let dataUrl = c.toDataURL('image/webp', 0.7);
  if(!dataUrl.startsWith('data:image/webp')){
    dataUrl = c.toDataURL('image/jpeg', 0.7);
  }
  return dataUrl;
}

function clearAttachedPhoto(){
  attachedPhoto = '';
  const input = document.getElementById('photoInput');
  const prev = document.getElementById('photoPreview');
  if(input) input.value = '';
  if(prev){ prev.classList.add('hidden'); prev.classList.remove('pop'); }
}

(function(){
  const photoInputEl = document.getElementById('photoInput');
  if(!photoInputEl) return;
  photoInputEl.addEventListener('change', async ()=>{
    const file = photoInputEl.files && photoInputEl.files[0];
    if(!file) return;
    const msg = document.getElementById('deskMsg');
    try{
      attachedPhoto = await compressImageFile(file);
      const prev = document.getElementById('photoPreview');
      const imgEl = document.getElementById('photoPreviewImg');
      if(imgEl) imgEl.src = attachedPhoto;
      if(prev){
        prev.classList.remove('hidden');
        void prev.offsetWidth;
        prev.classList.add('pop');
      }
      buzz(8);
    }catch(e){
      attachedPhoto = '';
      if(msg) msg.textContent = '写真を読み込めませんでした。別の写真でお試しください。';
    }
  });
  const removeBtn = document.getElementById('photoRemove');
  if(removeBtn) removeBtn.onclick = ()=>{ clearAttachedPhoto(); };
})();

function shelfTier(count){
  if(count >= 100) return 4;
  if(count >= 50) return 3;
  if(count >= 30) return 2;
  if(count >= 10) return 1;
  return 0;
}

const SHELF_TIER_ORNAMENTS = ['', '🕯', '🕯 🪴', '🏮 🕯 🪴', '🏮 🕯 🪴 🐈‍⬛'];
const SHELF_TIER_NAMES = ['', '10冊：蜜蝋の燭台が置かれました', '30冊：小さな鉢植えが増えました', '50冊：守り提灯が灯りました', '100冊：書店猫が住みつきました'];

function applyShelfTier(){
  const wood = document.querySelector('.wood-shelf');
  if(!wood) return;
  const tier = shelfTier(libraryCache.length);
  ['tier1','tier2','tier3','tier4'].forEach(c=>wood.classList.remove(c));
  if(tier > 0) wood.classList.add('tier' + tier);
  let orn = document.getElementById('shelfOrnaments');
  if(!orn){
    orn = document.createElement('div');
    orn.id = 'shelfOrnaments';
    orn.className = 'shelf-ornaments';
    orn.setAttribute('aria-hidden', 'true');
    wood.insertBefore(orn, wood.firstChild);
  }
  orn.textContent = SHELF_TIER_ORNAMENTS[tier];
  orn.title = SHELF_TIER_NAMES[tier];
}

function appendEmptySpine(shelf){
  if(!shelf) return;
  const ghost = document.createElement('div');
  ghost.className = 'spine empty-spine';
  ghost.textContent = '＋ 次の一冊';
  ghost.title = 'まだ中身が書かれていない、空の背表紙。タップすると編纂机へ。';
  ghost.onclick = ()=>{ buzz(6); goToPage('desk'); };
  shelf.appendChild(ghost);
}

function playSuckAnimation(catId){
  if(!prefs.motion) return;
  const wood = document.querySelector('.wood-shelf');
  if(!wood) return;
  const rect = wood.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'fly-book';
  fly.style.background = spineColorFor(catId);
  document.body.appendChild(fly);
  const tx = rect.left + rect.width / 2 - window.innerWidth / 2;
  const ty = rect.top + rect.height / 2 - window.innerHeight / 2;
  fly.style.setProperty('--suck-x', tx + 'px');
  fly.style.setProperty('--suck-y', ty + 'px');
  requestAnimationFrame(()=>fly.classList.add('go'));
  setTimeout(()=>fly.remove(), 950);
}

const RECORD_PICKS = {
  morning:{ label:'今朝のレコード', line:'開店前の掃除のとき、店主がよくかけている一枚。', songs:[
    { title:'風をあつめて', artist:'はっぴいえんど' },
    { title:'やさしさに包まれたなら', artist:'荒井由実' },
    { title:'虹', artist:'菅田将暉' }
  ]},
  daytime:{ label:'昼下がりのレコード', line:'頁をめくる音に混ざっても、邪魔をしない一枚。', songs:[
    { title:'日曜日よりの使者', artist:'ザ・ハイロウズ' },
    { title:'小さな恋のうた', artist:'MONGOL800' },
    { title:'ありがとう', artist:'いきものがかり' }
  ]},
  evening:{ label:'夕暮れのレコード', line:'棚の影が伸びる時間に、店主が針を落とす一枚。', songs:[
    { title:'茜色の約束', artist:'いきものがかり' },
    { title:'花火', artist:'aiko' },
    { title:'ワタリドリ', artist:'[Alexandros]' }
  ]},
  night:{ label:'今夜のレコード', line:'閉店後の書店で、ランプの灯りとよく合う一枚。', songs:[
    { title:'First Love', artist:'宇多田ヒカル' },
    { title:'くだらないの中に', artist:'星野源' },
    { title:'夜空ノムコウ', artist:'SMAP' }
  ]}
};

function currentRecordSlot(){
  const h = new Date().getHours();
  if(h >= 5 && h < 11) return 'morning';
  if(h >= 11 && h < 17) return 'daytime';
  if(h >= 17 && h < 22) return 'evening';
  return 'night';
}

function renderRecordCorner(){
  const box = document.getElementById('recordCorner');
  if(!box) return;
  const slot = RECORD_PICKS[currentRecordSlot()];
  const day = Math.floor(Date.now() / 86400000);
  const song = slot.songs[day % slot.songs.length];
  const q = song.title + ' ' + song.artist;
  const amUrl = amazonSearchUrl(q, 'digital-music');
  const cdUrl = amazonSearchUrl(q + ' CD');
  const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q);
  box.innerHTML = `
    <div class="record-disc" aria-hidden="true"></div>
    <div class="record-body">
      <p class="record-label">🎼 ${slot.label} <span class="record-pr">［PR・広告リンクを含みます］</span></p>
      <p class="record-title">『${song.title}』 ${song.artist}</p>
      <p class="record-line">${slot.line}</p>
      <p class="record-links">
        <a href="${amUrl}" target="_blank" rel="noopener sponsored">Amazon Music</a>
        <a href="${cdUrl}" target="_blank" rel="noopener sponsored">CD・レコードを探す</a>
        <a href="${spUrl}" target="_blank" rel="noopener">Spotify</a>
        <a href="${ytUrl}" target="_blank" rel="noopener">YouTube</a>
      </p>
    </div>`;
  box.classList.remove('hidden');
}

function drawImageCover(ctx, img, x, y, w, h){
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale, sh = h / scale;
  const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function loadImageFromDataUrl(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>resolve(null);
    img.src = url;
  });
}

function roundRectPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ============================================================
 * ストーリー用の画像を生成する（添付画像 image.png のしおりの
 * 雰囲気：上下の黒帯＋クリーム色の紙面＋太字の言葉＋控えめな
 * クレジット、という構成をオリジナルの意匠で再現する）
 * ============================================================ */
async function generateStoryImage(){
  try{
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
  }catch(e){}

  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 2, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const MINCHO = '"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif';

  const latest = libraryCache.length ? libraryCache[libraryCache.length - 1] : null;
  const cachedShiori = await loadJSON('emotion-bookstore-shiori', null);
  let words = (cachedShiori && cachedShiori.text)
    ? cachedShiori.text
    : ((latest && latest.note) ? latest.note : '今日も、自分の気持ちに名前をあげられましたね。');
  if(words.length > 60) words = words.slice(0, 59) + '…';

  const CREAM = '#F1E9D2';
  const INK = '#1C1712';
  const topH = Math.round(H * 0.15);
  const bottomH = Math.round(H * 0.13);

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, topH);
  ctx.fillRect(0, H - bottomH, W, bottomH);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(241,233,210,0.8)';
  ctx.font = '600 26px ' + MINCHO;
  ctx.fillText('EMOTIONAL BINDERY & BOOKSHOP', W / 2, topH * 0.42);
  ctx.fillStyle = CREAM;
  ctx.font = '700 42px ' + MINCHO;
  ctx.fillText('みんなの感情書店', W / 2, topH * 0.78);

  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = '700 56px ' + MINCHO;
  const pad = 90;
  const maxWidth = W - pad * 2;
  const lines = wrapTextLines(ctx, words, maxWidth).slice(0, 6);
  let ty = topH + 130;
  lines.forEach(line=>{
    ctx.fillText(line, pad, ty);
    ty += 78;
  });

  ctx.font = '400 24px ' + MINCHO;
  ctx.fillStyle = 'rgba(28,23,18,0.55)';
  ctx.fillText('— 今日の栞 —', pad, ty + 40);

  const photo = (latest && latest.image) ? await loadImageFromDataUrl(latest.image) : null;
  const markCx = W / 2, markCy = H - bottomH - 260;
  if(photo){
    const pSize = 260;
    const pX = markCx - pSize / 2, pY = markCy - pSize / 2;
    ctx.save();
    roundRectPath(ctx, pX, pY, pSize, pSize, 8);
    ctx.clip();
    drawImageCover(ctx, photo, pX, pY, pSize, pSize);
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRectPath(ctx, pX, pY, pSize, pSize, 8);
    ctx.stroke();
  }else{
    // オリジナルの「灯り」のマーク（円と炎のシルエット）
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(markCx, markCy, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(markCx, markCy - 34);
    ctx.quadraticCurveTo(markCx + 22, markCy, markCx, markCy + 34);
    ctx.quadraticCurveTo(markCx - 22, markCy, markCx, markCy - 34);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = CREAM;
  ctx.font = '400 26px ' + MINCHO;
  const d = (latest && latest.date) ? new Date(latest.date) : new Date();
  ctx.fillText(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`, W / 2, H - bottomH * 0.55);
  ctx.font = '600 24px ' + MINCHO;
  ctx.fillText('— 店主より（みんなの感情書店）', W / 2, H - bottomH * 0.22);

  return canvas;
}

const SHARE_TEXT = '名もなき気持ちに、名前をあげる。「みんなの感情書店」— 感情をラベリングして棚に並べる、体験型のプロトタイプです。';

function openShareMenu(url){
  const menu = document.getElementById('shareMenu');
  if(!menu) return;
  const sx = document.getElementById('shareX');
  if(sx) sx.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(SHARE_TEXT) + '&url=' + encodeURIComponent(url);
  const sl = document.getElementById('shareLine');
  if(sl) sl.href = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url);
  const nativeBtn = document.getElementById('shareNative');
  if(nativeBtn){
    if(navigator.share){
      nativeBtn.classList.remove('hidden');
      nativeBtn.onclick = async ()=>{
        try{
          await navigator.share({ title:'みんなの感情書店', text:SHARE_TEXT, url });
        }catch(e){}
      };
    }else{
      nativeBtn.classList.add('hidden');
    }
  }
  const urlInput = document.getElementById('shareUrlInput');
  if(urlInput) urlInput.value = url;
  const copyBtn = document.getElementById('shareCopy');
  if(copyBtn) copyBtn.onclick = async ()=>{
    try{
      if(!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard API unavailable');
      await navigator.clipboard.writeText(url);
      copyBtn.textContent = 'コピーしました ✓';
      setTimeout(()=>{ copyBtn.textContent = 'リンクをコピー'; }, 2000);
    }catch(e){
      if(urlInput){
        urlInput.select();
        urlInput.setSelectionRange(0, url.length);
      }
      copyBtn.textContent = '↓の欄からコピーしてください';
    }
  };
  menu.classList.remove('hidden');
}

(function(){
  const shareBtn = document.getElementById('shareBtn');
  if(shareBtn) shareBtn.onclick = ()=>{ openShareMenu(window.location.href); };
  const closeBtn = document.getElementById('shareMenuClose');
  if(closeBtn) closeBtn.onclick = ()=>{
    const menu = document.getElementById('shareMenu');
    if(menu) menu.classList.add('hidden');
  };
})();

(function(){
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  if(!copyUrlBtn) return;
  copyUrlBtn.onclick = async ()=>{
    try{
      await navigator.clipboard.writeText(window.location.href);
      copyUrlBtn.textContent = 'コピーしました ✓';
    }catch(e){
      openShareMenu(window.location.href);
    }
    setTimeout(()=>{ copyUrlBtn.textContent = '📋 URLをコピー'; }, 2000);
  };
})();

(function(){
  const pwaPinBtn = document.getElementById('pwaPinBtn');
  if(!pwaPinBtn) return;
  pwaPinBtn.onclick = ()=>{
    const p = document.getElementById('pwaPopup');
    if(p) p.classList.remove('hidden');
  };
  const closeBtn = document.getElementById('pwaClose');
  if(closeBtn) closeBtn.onclick = ()=>{
    const p = document.getElementById('pwaPopup');
    if(p) p.classList.add('hidden');
  };
})();

function applySeasonalAccent(){
  const month = new Date().getMonth() + 1;
  let color;
  if(month >= 3 && month <= 5) color = '#C97FA0';
  else if(month >= 6 && month <= 8) color = '#4F9E8C';
  else if(month >= 9 && month <= 11) color = '#C9793D';
  else color = '#5E7FA8';
  document.documentElement.style.setProperty('--season-accent', color);
}

function timeBucketNow(){
  const hour = new Date().getHours();
  if(hour >= 5 && hour < 11) return 'morning';
  if(hour >= 11 && hour < 17) return 'day';
  if(hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function applyNightModeIfNeeded(){
  const bucket = timeBucketNow();
  document.body.classList.toggle('night', bucket === 'night');
}

(async function init(){
  applySeasonalAccent();
  applyNightModeIfNeeded();
  restoreDraftIfAny();
  const greetingEl = document.getElementById('firstGreetingText');
  if(greetingEl){
    // ★時間帯メッセージ：来店時刻の4区分（朝／昼／夕／夜）で第一声を変える
    const bucket = timeBucketNow();
    const pool = TIME_GREETINGS[bucket] || TIME_GREETINGS.day;
    let line = pool[Math.floor(Math.random()*pool.length)];
    if(bucket !== 'night') line += '近いものを選んでも、下に自由に書いてもらっても構いません。';
    typeIntoNode(greetingEl, line);
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

  const shelfControls = document.querySelector('.shelf-controls');
  if(shelfControls && !document.getElementById('viewPurifyLogBtn')){
    const btn = document.createElement('button');
    btn.id = 'viewPurifyLogBtn';
    btn.className = 'reset-link';
    btn.textContent = '🕯 手放した気持ちの記録を見る';
    btn.onclick = showPurifyLog;
    shelfControls.insertBefore(btn, shelfControls.firstChild);
  }
})();
