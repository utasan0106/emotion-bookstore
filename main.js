/* ============================================================
 * main.js — 対話ロジック・IndexedDB・番台制御など
 * 「みんなの感情書店」のロジック本体です。
 * data.js（BOOK_POOL, CATEGORIES, CHAT_TREE などのデータ）を
 * 先に読み込んだ後にこのファイルを読み込んでください。
 * <script src="data.js"></script>
 * <script src="main.js"></script>
 * ============================================================ */

function scoreLabelForStory(label, story){
  if(!story) return 0;
  const chars = Array.from(new Set(label.replace(/[のをにがはでへと日頁記録一]/g,'').split('')));
  let s = 0;
  chars.forEach(ch=>{ if(story.includes(ch)) s++; });
  return s;
}

/* 物語の本文に最も響き合う背表紙ラベルを、各感情50種の中から選ぶ */
function suggestTitles(catId, story, n){
  const pool = TITLE_TEMPLATES[catId] || [];
  if(!pool.length) return [];
  const scored = shuffleArray(pool).map(l=>({ l, s: scoreLabelForStory(l, story) })).sort((a,b)=>b.s-a.s);
  return scored.slice(0, n || 4).map(x=>x.l);
}

function renderTitleSuggest(){
  const box = document.getElementById('titleSuggest');
  const sel = document.getElementById('categorySelect');
  if(!box || !sel) return;
  const ta = document.getElementById('storyInput');
  const tInput = document.getElementById('titleInput');
  const story = ta ? ta.value.trim() : '';
  const picks = suggestTitles(sel.value || activeCategory, story, 4);
  if(!picks.length){ box.innerHTML = ''; return; }
  box.innerHTML = '<span class="title-suggest-label">店主の見立て（タップで採用・自分で書き換えても）：</span>';
  picks.forEach(l=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'title-chip';
    b.textContent = l;
    b.onclick = ()=>{ if(tInput){ tInput.value = l; buzz(5); } };
    box.appendChild(b);
  });
}

function generateTitle(categoryId){
  const pool = TITLE_TEMPLATES[categoryId] || ['名前のない一冊'];
  return pool[Math.floor(Math.random()*pool.length)];
}

function recommendReasonFor(catId){
  const pool = RECOMMEND_TEMPLATES[catId];
  if(!pool || !pool.length) return '';
  return pool[Math.floor(Math.random()*pool.length)];
}

/* ---------- 収益化の設定（ここを書き換えるだけで全リンクに反映） ---------- */
const AMAZON_ASSOCIATE_ID = 'uta0106-22';
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

/* 楽天トラベルの検索URL生成 */
function rakutenTravelSearchUrl(query){
  /* 【P0バグ修正】旧 /dsearch/?f_keyword= 形式はエンドポイント廃止で404になるため、
     現行のキーワード検索エンドポイント（kw.travel.rakuten.co.jp）へ変更。
     2026-07-12 実機検証済み：「富良野」で399件の正規検索結果ページを確認。 */
  /* charset=utf-8 は必須：無いとクエリがShift_JIS等として誤解釈され文字化け→0件になる（軽井沢505件で実機検証済み） */
  return 'https://kw.travel.rakuten.co.jp/keyword/Search.do?f_query=' + encodeURIComponent(query) + '&f_max=30&charset=utf-8';
}

function detourUrlFor(item){
  if(item.affiliate_platform === 'Amazon') return amazonSearchUrl(item.search_query);
  if(item.affiliate_platform === 'Rakuten') return rakutenSearchUrl(item.search_query);
  if(item.affiliate_platform === 'RakutenTravel') return rakutenTravelSearchUrl(item.search_query);
  return amazonSearchUrl(item.search_query);
}

const SHOP_OPEN_DATE = new Date('2026-07-01T00:00:00+09:00');
const MAX_WAVE = 6;

function unlockedWaveCount(){
  const now = new Date();
  const months = (now.getFullYear() - SHOP_OPEN_DATE.getFullYear()) * 12 + (now.getMonth() - SHOP_OPEN_DATE.getMonth());
  return Math.min(MAX_WAVE, Math.max(1, months + 1));
}

/* 本物のFisher-Yatesシャッフル（Array.sortの乱数比較関数は不完全なシャッフルになるため使わない） */
function shuffleArray(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/* ---------- item 6: 日付シードのデイリーメッセージ生成（掛け算式 intro + body + outro） ---------- */
function dailySeedNumber(){
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function seededPickFromArray(arr, seed, salt){
  if(!arr || !arr.length) return '';
  let h = (seed ^ Math.imul(salt + 1, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return arr[h % arr.length];
}
function composeDailyMessage(kind, saltBase, label){
  if(typeof DAILY_MESSAGE_PARTS === 'undefined') return '';
  const parts = DAILY_MESSAGE_PARTS[kind];
  if(!parts) return '';
  const seed = dailySeedNumber();
  let text = seededPickFromArray(parts.intro, seed, saltBase + 1)
    + seededPickFromArray(parts.body, seed, saltBase + 2)
    + seededPickFromArray(parts.outro, seed, saltBase + 3);
  if(label) text = text.split('{label}').join(label);
  return text;
}

/* ---------- item 7: 「あなたの物語・みんなの物語」アコーディオンの開閉 ---------- */
function toggleEpisodes(){
  const more = document.getElementById('episodesMore');
  const btn = document.getElementById('episodesToggle');
  if(!more || !btn) return;
  if(more.classList.contains('hidden')){
    more.classList.remove('hidden');
    btn.textContent = '閉じる';
  }else{
    more.classList.add('hidden');
    btn.textContent = btn.dataset.moreLabel || 'もっと見る';
  }
  if(typeof buzz === 'function') buzz(6);
}

function pickRecommend(catId){
  const pinned = PINNED_RECOMMEND[catId] || [];
  const wave = unlockedWaveCount();
  // wave制限は「その回までに解禁された本」のみを対象にするが、
  // wave1だけでも各棚6冊以上を保証してあるため、常に十分な母集団からランダムに選べる。
  const pool = BOOK_POOL.filter(b=>b.tags.includes(catId) && b.wave <= wave);
  const shuffled = shuffleArray(pool);
  const picked = shuffled.slice(0, 3).map(b=>({
    title:b.title, by:b.by, why:recommendReasonFor(catId)
  }));
  return pinned.concat(picked);
}

const STORY_LIMIT = 700;
/* 絵文字（サロゲートペア）でカウントがズレないよう、コードポイント単位で数える */
function countChars(str){ return Array.from(str || '').length; }
let activeCategory = (CATEGORIES && CATEGORIES.length) ? CATEGORIES[0].id : 'moyamoya';
let libraryCache = [];

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

const MIDNIGHT_GREETINGS = [
  '……こんな時間まで、おつかれさまです。これからのことを考えていると、夜はどこまでも長くなりますね。今日の気持ちを、一冊だけ預けていきませんか。',
  '……夜更けの来店、歓迎します。SNSには書けない本音ほど、この棚には似合うんですよ。誰にも見られません。ここだけの話にしましょう。',
  '……眠れない夜は、無理に眠らなくてもいいと思うんです。直接では言えなかった言葉を、ここでだけ、そっと綴ってみませんか。'
];

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

/* ---------- 日記ログのエクスポート ---------- */
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

/* ---------- 気持ちを手放す ---------- */
const NEGATIVE_SHELVES = ['moyamoya','ushirometai','kuyashii','kodoku','aseri','shitto','hazukashii','gakkari'];

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

/* ★手放した気持ちの履歴を表示する関数（item 6：オーバーホール版）
   - コントラストの低い表示を避けるため、専用のオーバーレイをJSで組み立てる
   - 「閉じる」ボタンと「表示を隠す」ボタンの両方を必ず用意する
   - 「表示を隠す」は画面上の表示だけを消し、保存データ自体には触れない */
function buildPurifyLogOverlay(){
  let overlay = document.getElementById('purifyLogOverlay');
  if(overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'purifyLogOverlay';
  overlay.className = 'purify-log-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '手放した気持ちの記録');
  overlay.innerHTML = `
    <div class="purify-log-card">
      <button type="button" class="purify-log-close" id="purifyLogClose" aria-label="閉じる">×</button>
      <p class="purify-log-kicker">手放した気持ちの記録</p>
      <div class="purify-log-list" id="purifyLogList"></div>
      <div class="purify-log-actions">
        <button type="button" class="purify-log-hide" id="purifyLogHideBtn">表示を隠す</button>
        <button type="button" class="purify-log-close-btn" id="purifyLogCloseBtn">閉じる</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{
    if(e.target.id === 'purifyLogOverlay') hidePurifyLogOverlay();
  });
  const closeX = overlay.querySelector('#purifyLogClose');
  if(closeX) closeX.onclick = hidePurifyLogOverlay;
  const closeBtn = overlay.querySelector('#purifyLogCloseBtn');
  if(closeBtn) closeBtn.onclick = hidePurifyLogOverlay;
  const hideBtn = overlay.querySelector('#purifyLogHideBtn');
  if(hideBtn) hideBtn.onclick = ()=>{
    // 表示のみを空にする。保存データ（IndexedDB/localStorage）には一切触れない。
    const list = document.getElementById('purifyLogList');
    if(list) list.innerHTML = '<p class="purify-log-empty">表示を隠しました。データは端末にそのまま保存されています。もう一度開くと再表示されます。</p>';
  };
  return overlay;
}

function hidePurifyLogOverlay(){
  const overlay = document.getElementById('purifyLogOverlay');
  if(overlay) overlay.classList.add('hidden');
}

async function showPurifyLog(){
  const log = await loadJSON(PURIFY_LOG_KEY, []);
  const overlay = buildPurifyLogOverlay();
  const list = document.getElementById('purifyLogList');
  if(list){
    if(log.length === 0){
      list.innerHTML = '<p class="purify-log-empty">まだ、手放した気持ちの記録はありません。</p>';
    }else{
      list.innerHTML = log.slice().reverse().map(p=>{
        const cat = CATEGORIES.find(c=>c.id===p.category);
        const label = cat ? cat.label : (p.category || '');
        const dateStr = new Date(p.date).toLocaleDateString('ja-JP');
        const safeText = (p.text || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return `<div class="purify-log-entry">
          <p class="purify-log-meta">${dateStr}　/　${label}</p>
          <p class="purify-log-text">${safeText}</p>
        </div>`;
      }).join('');
    }
  }
  overlay.classList.remove('hidden');
}

/* ---------- ペルソナ・カウンセリング検知エンジン ----------
 * COUNSELING_MESSAGES は { persona: { state: [messages...] } } の形。
 * persona: student, jobhunter, young_worker, career_woman, middle_worker,
 *          mother, romance, creater, resting, sensitive
 * state:   oshi, yami, menbure, kagiaka, darui, capaover
 */
const PERSONA_TRIGGERS = [
  { persona:'jobhunter',    patterns:['就活','面接','エントリーシート','ES','説明会','内定','選考','企業研究'] },
  { persona:'student',      patterns:['学校','授業','宿題','部活','テスト','受験','クラス','先生','高校','中学'] },
  { persona:'mother',       patterns:['育児','ワンオペ','子ども','子供','ママ友','保育園','夜泣き','旦那'] },
  { persona:'career_woman', patterns:['キャリア','女性として','管理職','女子会','産休','昇進'] },
  { persona:'young_worker', patterns:['新卒','入社','新人','若手','社会人1年目','社会人２年目'] },
  { persona:'middle_worker',patterns:['部下','上司','板挟み','マネージャー','中間管理職','後輩指導'] },
  { persona:'romance',      patterns:['彼氏','彼女','恋人','失恋','片思い','浮気','デート','LINEの返信'] },
  { persona:'creater',      patterns:['創作','絵師','小説','同人','締め切り','イラスト','原稿'] },
  { persona:'resting',      patterns:['無職','休職','退職','ニート','療養中','休養中'] },
  { persona:'sensitive',    patterns:['繊細','HSP','敏感','眠れない','深夜','夜中'] }
];

function detectCounselingPersona(text){
  for(const t of PERSONA_TRIGGERS){
    if(t.patterns.some(p=>text.includes(p))) return t.persona;
  }
  // 来店カードで設定された属性を最優先のデフォルトにする
  return (userProfile && userProfile.persona) || 'young_worker';
}

const STATE_TRIGGERS = [
  { state:'menbure',  patterns:['メンブレ','限界','崩れ','折れ','涙が止まらない','壊れそう','パニック'] },
  { state:'kagiaka',  patterns:['鍵垢','裏アカ','本音','誰にも言えない','言えない本音','愚痴'] },
  { state:'capaover', patterns:['キャパオーバー','キャパ超え','溢れ','パンク','抱えきれ','多すぎ'] },
  { state:'darui',    patterns:['だるい','めんどくさい','やる気が出ない','動けない','サボり'] },
  { state:'oshi',     patterns:['推し','担当','箱推し','ライブ','担降り','布教'] },
  { state:'yami',     patterns:['病んで','病む','消えたい','真っ暗','どん底','孤独','苦しい'] }
];

function detectCounselingState(text, fallbackShelfId){
  for(const s of STATE_TRIGGERS){
    if(s.patterns.some(p=>text.includes(p))) return s.state;
  }
  // フォールバック：現在の棚（感情カテゴリ）から近い状態を推定
  if(NEGATIVE_SHELVES.includes(fallbackShelfId)) return 'yami';
  return 'darui';
}

function counselingFlavorReply(text, fallbackShelfId){
  const persona = detectCounselingPersona(text);
  const state = detectCounselingState(text, fallbackShelfId);
  const personaPool = COUNSELING_MESSAGES[persona] || COUNSELING_MESSAGES.young_worker;
  const pool = personaPool[state] || personaPool.darui || [];
  if(!pool.length) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

const PERSONAL_INFO_PATTERNS = [/\d{2,4}-\d{3,4}-\d{3,4}/, /[\w.+-]+@[\w-]+\.[\w.-]+/, /(本名|住所|電話番号|LINE\s*ID)[:：]/];
const ATTACK_WORDS = ['死ね','殺す','消えろ','ぶっ殺'];
const CRISIS_STORY_PATTERNS = ['死にたい','消えたい','自分を傷つけ','リストカット'];

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

/* ---------- preferences ---------- */
let prefs = { motion:true, sound:false };
const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function applyPrefs(){
  document.body.classList.toggle('no-motion', !prefs.motion);
  const mt = document.getElementById('motionToggle');
  if(mt){
    mt.textContent = '演出：' + (prefs.motion ? '入' : '切');
    mt.classList.toggle('on', prefs.motion);
  }
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

/* ---------- ambience ----------
 * 環境音機能は「オンにすれば必ず鳴る」保証ができない（ブラウザの自動再生制限）ため撤去しました */
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

// ★【UI改善】ヘッダーに隠れないようにオフセットを付けてスクロール
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
  if(id === 'desk'){ syncCounterDraftToDesk(); updateDeskLead(); }
  if(!prefs.motion){
    // レイアウトが確定してからスクロール計算するため、次フレームまで待つ
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToId(id)));
    return;
  }
  const overlay = document.getElementById('pageTurnOverlay');
  if(!overlay){
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToId(id)));
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

function renderFair(){
  try{
    const box = document.getElementById('fairBox');
    if(!box) return;
    const m = new Date().getMonth() + 1;
    const fair = MONTH_FAIR[m];
    if(!fair) return;
    const cat = CATEGORIES.find(c=>c.id===fair.id);
    if(!cat) return;
    box.innerHTML = '';
    const title = document.createElement('b');
    title.textContent = m + '月の店主のおすすめ棚 — 『' + cat.label + '』';
    const line = document.createElement('span');
    line.className = 'fair-line';
    line.textContent = fair.line;
    const go = document.createElement('button');
    go.className = 'fair-go';
    go.textContent = '棚へ';
    go.onclick = ()=>goToShelf(fair.id);
    box.appendChild(title); box.appendChild(line); box.appendChild(go);
  }catch(e){ console.error('renderFair failed', e); }
}

function topCategoryId(){
  if(libraryCache.length === 0) return null;
  const counts = {};
  libraryCache.forEach(e=>{ counts[e.category] = (counts[e.category]||0) + 1; });
  const withCounts = CATEGORIES.filter(c=>counts[c.id]);
  if(!withCounts.length) return null;
  return withCounts.sort((a,b)=>counts[b.id]-counts[a.id])[0].id;
}

function renderShelfTabs(){
  try{
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
      while(pick === activeCategory && CATEGORIES.length > 1){
        pick = CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)].id;
      }
      activeCategory = pick;
      renderShelfTabs();
      renderShelfDisplay();
    };
    wrap.appendChild(wander);
  }catch(e){ console.error('renderShelfTabs failed', e); }
}

/* 寄り道セクション（item 5）：推薦状からPR/商品要素を排除し、棚ページ側にまとめて表示する */
function renderDetourSection(catId){
  const box = document.getElementById('detourSection');
  if(!box) return;
  const items = DETOUR_POOL[catId];
  if(!items || !items.length){
    box.innerHTML = '';
    return;
  }
  const tierLabel = { low:'ちいさな寄り道', medium:'すこし贅沢な寄り道', high:'とっておきの寄り道' };
  /* item 8: DETOUR_POOL から毎回3件をランダムに表示する */
  const picks = shuffleArray(items).slice(0, 3);
  const cardsHtml = picks.map(featured=>{
    const url = detourUrlFor(featured);
    return `
      <div class="detour-card detour-tier-${featured.tier}">
        <span class="detour-tier-badge">${tierLabel[featured.tier] || featured.tier}</span>
        <p class="detour-name">${featured.name}</p>
        <p class="detour-desc">${featured.description}</p>
        <a class="detour-link" href="${url}" target="_blank" rel="noopener sponsored">見てみる →</a>
      </div>`;
  }).join('');
  box.innerHTML = `
    <p class="detour-heading">今月の寄り道<span class="detour-pr">［PR・広告リンクを含みます］</span></p>
    <div class="detour-cards">${cardsHtml}</div>
    <p class="detour-note">寄り道の品揃えは、棚を巡るたびに入れ替わります。</p>`;
}

function renderShelfDisplay(){
  try{
    const el = document.getElementById('shelfDisplay');
    if(!el) return;
    const cat = CATEGORIES.find(c=>c.id===activeCategory);
    if(!cat){ el.innerHTML = ''; return; }
    if(prefs.motion){
      el.style.transition = 'opacity .16s ease';
      el.style.opacity = '0';
    }
    const quotes = cat.quotes || [];
    const q = quotes.length ? quotes[Math.floor(Math.random()*quotes.length)] : { text:'', source:'' };
    const recs = pickRecommend(cat.id);
    const moodSearchQuery = cat.label + ' 気持ち おすすめ 本';
    const moodSearchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(moodSearchQuery);
    const recommendHtml = (recs && recs.length)
      ? `<div class="recommend-section">
          <p class="recommend-heading">「${cat.label}」な今のあなたに、店主が選んだ本</p>
          <p class="recommend-subtext">読むための本というより、この気持ちのお守りになる一冊です</p>
          <div class="recommend-row">
          ${recs.map(r=>{
            const q2 = r.title + ' ' + r.by;
            const amazonUrl = amazonSearchUrl(q2);
            const kindleUrl = amazonSearchUrl(q2, 'digital-text');
            const audibleUrl = amazonSearchUrl(q2, 'audible');
            const rakutenUrl = rakutenSearchUrl(q2);
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
    /* 音楽：MUSIC_QUERIES（各感情10曲・店主コメント付き）から3曲を選んで表示。
       「他も見る」で選曲が入れ替わる。 */
    const mq = MUSIC_QUERIES[cat.id] || [];
    const pinnedSongs = PINNED_SONGS[cat.id] || [];
    const trackSrc = mq.length
      ? shuffleArray(mq).slice(0, 3).map(t=>({ title:t.title, artist:t.artist, comment:t.comment || '' }))
      : pinnedSongs.map(t=>({ title:t.title, artist:t.artist, comment:'' }));
    let musicHtml;
    if(trackSrc.length){
      const items = trackSrc.map(song=>{
        const q3 = song.title + ' ' + song.artist;
        const amUrl = amazonSearchUrl(q3 + ' 音楽');
        const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q3);
        const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q3);
        return `<div class="playlist-track-row">
          <span class="playlist-track-name">『${song.title}』${song.artist}</span>
          ${song.comment ? `<span class="playlist-track-comment">${song.comment}</span>` : ''}
          <span class="playlist-services">
            <a href="${spUrl}" target="_blank" rel="noopener">Spotify</a>
            <a href="${amUrl}" target="_blank" rel="noopener">Amazon Music</a>
            <a href="${ytUrl}" target="_blank" rel="noopener">YouTube</a>
          </span>
        </div>`;
      }).join('');
      musicHtml = `<div class="music-row"><p class="playlist-label">🎵 「${cat.label}」なプレイリスト — 店主の選曲</p><div class="playlist-tracks">${items}</div></div>`;
    }else{
      const fallbackQuery = cat.label + ' 邦楽 プレイリスト';
      const musicUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(fallbackQuery);
      musicHtml = `<div class="music-row"><a class="music-link" href="${musicUrl}" target="_blank" rel="noopener">🎵 YouTubeでBGMを探す</a></div>`;
    }
    const myEntries = libraryCache.filter(e=>e.category===cat.id);
    const myEpisodeCards = myEntries.map(entry=>
      `<div class="episode-card mine" data-entry-id="${entry.id}"><span class="who mine-who">あなたの物語${entry.tweetUrl ? ' 🐦' : ''}</span>『${entry.title}』${entry.story.length > 60 ? entry.story.slice(0,60) + '…' : entry.story}</div>`
    );
    const storyPool = STORIES_POOL[cat.id] || [];
    const shuffledStories = shuffleArray(storyPool).slice(0, 3);
    const sampleEpisodeCards = shuffledStories.map(s=>`<div class="episode-card"><span class="who">${s.author || '名もなき誰かの物語'}</span>${s.text}</div>`);
    /* item 7: 初期表示は2件のみ。残りは「もっと見る」で開閉するアコーディオンに収納 */
    const allEpisodeCards = myEpisodeCards.concat(sampleEpisodeCards);
    const visibleEpisodesHtml = allEpisodeCards.slice(0, 2).join('');
    const hiddenEpisodeCards = allEpisodeCards.slice(2);
    const hiddenEpisodesHtml = hiddenEpisodeCards.length
      ? `<div class="episodes-more hidden" id="episodesMore">${hiddenEpisodeCards.join('')}</div><button type="button" class="episodes-toggle" id="episodesToggle" data-more-label="もっと見る（あと${hiddenEpisodeCards.length}件）" onclick="toggleEpisodes()">もっと見る（あと${hiddenEpisodeCards.length}件）</button>`
      : '';
    const episodesNote = '';
    const purifyHtml = NEGATIVE_SHELVES.includes(cat.id)
      ? `<button type="button" class="purify-trigger" onclick="openPurify('${cat.id}')">🕯 この気持ちを手放す</button>`
      : '';
    el.innerHTML = `
      <p class="definition"><b>${cat.label}</b> — ${cat.def}</p>
      <p class="quote-card">${q.text}</p>
      <p class="quote-source">— ${q.source}</p>
      <p class="episodes-heading">あなたの物語・みんなの物語</p>
      <div class="episodes">
        ${visibleEpisodesHtml}
        ${hiddenEpisodesHtml}
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
    // item 5: 寄り道セクションは棚ページ側に独立して描画する
    renderDetourSection(cat.id);
    if(prefs.motion){
      requestAnimationFrame(()=>{ el.style.opacity = '1'; });
    }
  }catch(e){
    console.error('renderShelfDisplay failed', e);
  }
}

function renderCategorySelect(){
  const sel = document.getElementById('categorySelect');
  if(!sel) return;
  sel.innerHTML = CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  sel.addEventListener('change', ()=>{
    const deskLabel = document.getElementById('deskCategoryLabel');
    if(deskLabel) deskLabel.textContent = shelfLabelOf(sel.value);
    renderTitleSuggest();
  });
}

function textColorFor(hex){
  const c = (hex || '#000000').replace('#','');
  const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  return (0.299*r + 0.587*g + 0.114*b) > 150 ? '#3A2A14' : '#F6ECD4';
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
    spine.style.color = textColorFor(spineColorFor(entry.category));
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

let trendPeriod = 'all';
const EMOTION_GLYPHS = {
  moyamoya:'🌫', kodoku:'🌙', gakkari:'🌧', hazukashii:'🫥', ushirometai:'🥀',
  aseri:'⏳', kuyashii:'⚡', shitto:'🌵', akogare:'🌠', wakuwaku:'✨',
  ando:'☕', kansha:'🌷', itooshii:'💐', hokorashii:'🏅', natsukashii:'📜'
};
function trendEntries(){
  const now = new Date();
  return libraryCache.filter(e=>{
    if(trendPeriod === 'all') return true;
    if(!e.date) return false;
    const d = new Date(e.date);
    if(trendPeriod === 'year') return d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
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
  let tabs = document.getElementById('trendPeriodTabs');
  if(!tabs){
    tabs = document.createElement('div');
    tabs.id = 'trendPeriodTabs';
    tabs.className = 'trend-period-tabs';
    bars.parentNode.insertBefore(tabs, bars);
  }
  tabs.innerHTML = '';
  [['month','今月'],['year','今年'],['all','すべて']].forEach(([k,lbl])=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'trend-period-btn' + (trendPeriod === k ? ' active' : '');
    b.textContent = lbl;
    b.onclick = ()=>{ trendPeriod = k; renderTrend(); };
    tabs.appendChild(b);
  });
  const entries = trendEntries();
  const counts = {};
  entries.forEach(e=>{ counts[e.category] = (counts[e.category]||0) + 1; });
  if(!entries.length){
    bars.innerHTML = '<p class="trend-empty">この期間に綴られた頁は、まだありません。</p>';
    sum.textContent = 'いまのあなたの本棚を、期間を変えて眺められます。';
    return;
  }
  const max = Math.max(...Object.values(counts));
  bars.innerHTML = CATEGORIES.filter(c=>counts[c.id]).map(c=>{
    const n = counts[c.id];
    const w = Math.max(8, Math.round(n / max * 100));
    const glyph = EMOTION_GLYPHS[c.id] || '';
    return `<div class="trend-row" data-cat="${c.id}" style="cursor:pointer" title="『${c.label}』の棚を見る"><span class="trend-label"><span class="trend-glyph">${glyph}</span>${c.label}</span><div class="trend-bar" style="width:${w}%;background:${spineColorFor(c.id)}"></div><span class="trend-count">${n}冊</span></div>`;
  }).join('');
  bars.querySelectorAll('.trend-row').forEach(row=>{
    row.onclick = ()=>goToShelf(row.dataset.cat);
  });
  const periodLabel = trendPeriod === 'month' ? '今月' : (trendPeriod === 'year' ? '今年' : '');
  const withCounts = CATEGORIES.filter(c=>counts[c.id]).sort((a,b)=>counts[b.id]-counts[a.id]);
  if(withCounts.length) sum.textContent = `${periodLabel ? periodLabel + 'の' : 'いまの'}あなたの本棚は、「${withCounts[0].label}」の棚がいちばん厚いようです。`;
}

function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

async function renderShioriCard(){
  const card = document.getElementById('shioriCard');
  const slip = document.getElementById('shioriSlip');
  const btn = document.getElementById('shioriBtn');
  if(!card || !slip || !btn) return;

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
  }else{
    slip.classList.add('hidden');
    btn.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = '栞を受け取る';
  }
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

/* ★推薦状（item 5）：ここは店主の支援的な言葉＋棚への簡単な導線のみ。
   商品・Amazon・楽天・アフィリエイトの要素は一切含めない。
   商品要素は renderDetourSection（棚ページの「寄り道」セクション）に完全移設済み。 */
function showInvitation(catId){
  const inv = INVITES[catId];
  if(!inv) return;
  const t = document.getElementById('invTitle');
  if(t) t.textContent = inv.t;
  const b = document.getElementById('invBody');
  if(b){
    /* item 6: 推薦状の中身は DAILY_MESSAGE_PARTS から日付シードで毎日自動生成・変化する */
    const catIdx = Math.max(0, CATEGORIES.findIndex(c=>c.id===catId));
    const dailyBody = composeDailyMessage('invitation', 100 + catIdx * 7, shelfLabelOf(catId));
    b.textContent = dailyBody || inv.b;
  }
  const goBtn = document.getElementById('invGoShelf');
  if(goBtn){
    goBtn.onclick = ()=>{
      const c = document.getElementById('invitationCard');
      if(c) c.classList.add('hidden');
      goToShelf(catId);
    };
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
  const len = countChars(ta.value);
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
      renderTitleSuggest();
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
    const title = (tInput ? tInput.value.trim() : '') || (suggestTitles(chosenId, story, 1)[0]) || generateTitle(chosenId);
    if(countChars(story) > STORY_LIMIT){
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

        // 推薦状がある場合はポップアップ後、閉じたタイミングで「④ 本棚」へ遷移するフローに改修
        const inv = INVITES[finalCategory];
        if(inv){
          showInvitation(finalCategory);
          const closeBtn = document.getElementById('invClose');
          const originalClick = closeBtn.onclick;
          closeBtn.onclick = () => {
             document.getElementById('invitationCard').classList.add('hidden');
             goToPage('bookshelf');
             closeBtn.onclick = originalClick; // 戻す
          };
        } else {
          // 推薦状がない場合は、少し間を置いてから直接本棚へ遷移
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

const btnExport = document.getElementById('exportDiary');
if(btnExport) {
  btnExport.onclick = async ()=>{
    const btn = document.getElementById('exportDiary');
    btn.textContent = '書き出しています…';
    try{
      await exportDiaryText();
      btn.textContent = '書き出しました ✓';
    }catch(e){
      btn.textContent = '書き出しに失敗しました';
    }
    setTimeout(()=>{ btn.textContent = '📥 これまでの記録をテキストでダウンロード'; }, 2500);
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

function matchShopkeeperReply(text, fallbackShelfId){
  if(CRISIS_PATTERNS.some(w=>text.includes(w))){
    return CRISIS_REPLY;
  }
  for(const entry of KEYWORD_BANK){
    if(entry.patterns.some(p=>text.includes(p))){
      return entry.replies[Math.floor(Math.random()*entry.replies.length)];
    }
  }
  // 5%の確率でカウンセリング人格の一言を混ぜる（旧PERSONA_RARE_MESSAGESのレア演出を踏襲）
  {
    const flavor = counselingFlavorReply(text, fallbackShelfId);
    if(flavor && Math.random() < 0.6) return flavor;
  }
  if(text.includes('？') || text.includes('?') || /(か|の)$/.test(text.trim())){
    return GENERIC_QUESTION_REPLIES[Math.floor(Math.random()*GENERIC_QUESTION_REPLIES.length)];
  }
  return GENERIC_REPLIES[Math.floor(Math.random()*GENERIC_REPLIES.length)];
}

function shelfLabelOf(id){
  return (CATEGORIES.find(c=>c.id===id) || {}).label || '';
}

/* ★item 1：「棚を見てみる」ボタン＝goToShelf()のフィックス。
   - データ不整合が起きても例外を握りつぶして処理を止めない（try/catch）
   - ② 棚セクションへ切り替えた後、セクション先頭がビューポート上部にくるよう
     スムーズスクロールする。goToPage側でセクションを表示状態にした直後は
     まだレイアウトが確定していない場合があるため、requestAnimationFrameを
     2回はさんでから scrollIntoView を呼ぶ。 */
function goToShelf(shelfId){
  try{
    activeCategory = shelfId;
    renderShelfTabs();
    renderShelfDisplay();
  }catch(e){
    console.error('goToShelf: render failed', e);
  }
  try{
    setActivePageTab('shelves');
    goToPage('shelves');
  }catch(e){
    console.error('goToShelf: page switch failed', e);
  }
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      const section = document.getElementById('shelves');
      if(section && section.scrollIntoView){
        section.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block: 'start' });
      }
    });
  });
}

let deskFlowFlag = false;
function updateDeskLead(){
  const el = document.getElementById('deskLead');
  if(!el) return;
  if(deskFlowFlag || counterDraftText){
    el.textContent = '——ここまでを踏まえて。番台や棚で出会った気持ちを、今度はあなた自身の言葉で綴ってみましょう。';
    el.classList.remove('hidden');
  }else{
    el.classList.add('hidden');
  }
}

function goToDeskWithCategory(shelfId){
  const sel = document.getElementById('categorySelect');
  if(sel) sel.value = shelfId;
  deskFlowFlag = true;
  goToPage('desk');
  renderTitleSuggest();
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
  renderTitleSuggest();
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
  if(!node){
    renderChartOptions('root');
  renderTitleSuggest();
    return;
  }
  if(node.options){
    appendBubble('shopkeeper', '……もう少し、近いものを選んでみてください。');
    renderChartOptions(nextKey);
    return;
  }
  const replyText = pickReply(node.reply);
  appendBubble('shopkeeper', replyText);
  setMood(replyText);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 3000);
  renderChartOptions(nextKey);
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

function appendBubble(role, text){
  const cw = document.getElementById('chatWindow');
  if(!cw) return null;
  const div = document.createElement('div');
  div.className = 'bubble ' + (role === 'user' ? 'you' : 'shopkeeper');
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
  appendBubble('user', text);
  counterDraftText = counterDraftText ? (counterDraftText + '\n' + text) : text;
  chatHistory.push({ role:'user', content:text });
  ui.value = '';
  if(sb) sb.disabled = true;
  if(kf) kf.classList.add('listening');
  setMood(text);

  // 文字を送信した瞬間に、最新の吹き出しへ確実に追従する
  // ページ全体を動かさず、チャット窓の内部だけを最新までスクロールする
  const scrollToBottom = () => { if(cw) cw.scrollTop = cw.scrollHeight; };
  scrollToBottom();

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
  const suggestedShelf = isCrisis ? null : detectShelfFromText(text, 1);
  const reply = matchShopkeeperReply(text, suggestedShelf || activeCategory);
  loadingBubble.remove();
  appendBubble('shopkeeper', reply);
  chatHistory.push({ role:'assistant', content:reply });

  // 店主の返信後にも確実にスクロール追従する
  scrollToBottom();

  if(suggestedShelf){
    renderSuggestionActions(suggestedShelf);
  }else{
    renderChartOptions('root');
  renderTitleSuggest();
  }

  freeTextTurns++;
  if(freeTextTurns === 3 && !isCrisis){
    appendBubble('shopkeeper',
      '……私は決まった言葉しか持たない、しがない店番です。もしもっと深く話を聞いてほしい夜は、' +
      '言葉の達者な相談相手（AI）を訪ねてみるのも一つの手です。ここの棚は、いつでも開けておきますから。');

    // 外部AIへのリンクを、他の選択肢に紛れさせず、店主の言葉のすぐ真下に専用エリアとして配置する
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
  appendBubble('shopkeeper', group.keeper);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 2500);
  renderEmotionChips(group);

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
  renderTitleSuggest();
  };
  container.appendChild(back);
}

async function chooseEmotionShelf(shelfId){
  currentTone = NEGATIVE_SHELVES.includes(shelfId) ? 'heavy' : 'neutral';
  buzz(6);
  appendBubble('user', shelfLabelOf(shelfId));
  const kf = document.getElementById('keeperFigure');
  if(kf) kf.classList.add('listening');
  await wait(prefs.motion ? 380 : 30);
  appendBubble('shopkeeper', `『${shelfLabelOf(shelfId)}』の棚ですね。文字を打たなくても大丈夫。そのまま棚を眺めても、一冊綴っていっても構いませんよ。`);
  if(kf) setTimeout(()=>kf.classList.remove('listening'), 2500);
  renderSuggestionActions(shelfId);

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

const BACKUP_KEYS = [
  'emotion-bookstore-library',
  PURIFY_LOG_KEY,
  'emotion-bookstore-shiori',
  'emotion-bookstore-prefs',
  'emotion-bookstore-milestones',
  'emotion-bookstore-profile',
  DRAFT_KEY
];

async function downloadBackup(){
  const stores = {};
  for(const key of BACKUP_KEYS){
    stores[key] = await loadJSON(key, null);
  }
  const payload = {
    app: 'みんなの感情書店',
    format: 'emotion-bookstore-backup',
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    bookCount: Array.isArray(stores['emotion-bookstore-library']) ? stores['emotion-bookstore-library'].length : 0,
    stores
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `感情書店_本棚の鍵_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

(function(){
  const backupBtn = document.getElementById('backupBtn');
  if(!backupBtn) return;
  backupBtn.onclick = async ()=>{
    backupBtn.textContent = '鍵を作っています…';
    try{
      await downloadBackup();
      backupBtn.textContent = '鍵を更新しました ✓';
      buzz(10);
    }catch(e){
      backupBtn.textContent = '鍵の更新に失敗しました';
    }
    setTimeout(()=>{ backupBtn.textContent = '🔑 本棚のデータをバックアップ保存する'; }, 2500);
  };
})();

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

function applyNightModeIfNeeded(){
  const hour = new Date().getHours();
  if(hour >= 22 || hour < 5){
    document.body.classList.add('night');
  }
}

/* ★item 8：ページ下部で表示される「トップへ戻る」ボタン。
   静的HTMLに無い場合はJSで生成し、スクロール量に応じて表示/非表示を切り替える。 */
function ensureBackToTopButton(){
  let btn = document.getElementById('backToTopBtn');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'backToTopBtn';
    btn.type = 'button';
    btn.className = 'back-to-top hidden';
    btn.setAttribute('aria-label', 'ページの先頭へ戻る');
    btn.textContent = '↑';
    document.body.appendChild(btn);
  }
  btn.onclick = ()=>{
    window.scrollTo({ top:0, behavior: prefs.motion ? 'smooth' : 'auto' });
  };
  const toggleVisibility = ()=>{
    const scrolled = window.scrollY || document.documentElement.scrollTop || 0;
    const footer = document.querySelector('footer.shop-footer');
    const nearFooter = footer ? (scrolled + window.innerHeight >= footer.offsetTop) : false;
    if(scrolled > 400){
      btn.classList.remove('hidden');
      btn.classList.toggle('near-footer', nearFooter);
    }else{
      btn.classList.add('hidden');
    }
  };
  window.addEventListener('scroll', toggleVisibility, { passive:true });
  toggleVisibility();
}

/* ---------- 来店カード（お名前・属性。任意・この端末にのみ保存） ---------- */
const PROFILE_KEY = 'emotion-bookstore-profile';
let userProfile = { name:'', persona:'' };
const PERSONA_CHOICES = [
  { id:'student',       label:'学生・10代' },
  { id:'jobhunter',     label:'就活生・受験生' },
  { id:'young_worker',  label:'新社会人・若手' },
  { id:'middle_worker', label:'中堅・リーダー' },
  { id:'career_woman',  label:'キャリアを生きる女性' },
  { id:'mother',        label:'子育ての真ん中' },
  { id:'romance',       label:'恋に悩んでいる' },
  { id:'creater',       label:'クリエイター・表現者' },
  { id:'resting',       label:'人生の転換期・お休み中' },
  { id:'sensitive',     label:'夜型・繊細な気質' },
  { id:'',              label:'ひみつ（設定しない）' }
];

function buildProfileOverlay(){
  let ov = document.getElementById('profileOverlay');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'profileOverlay';
  ov.className = 'profile-overlay hidden';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', '来店カード');
  ov.innerHTML = `
    <div class="profile-card">
      <button type="button" class="profile-close" id="profileClose" aria-label="閉じる">×</button>
      <p class="profile-kicker">🪪 来店カード</p>
      <p class="profile-lead">よろしければ、呼び名と「いまのあなた」に近い立場を教えてください。店主の言葉が、あなたに向けた一言に変わります。</p>
      <p class="profile-note">どちらも任意です。この端末にのみ保存され、サーバーには送信されません。あとから「🪪 来店カード」でいつでも変更できます。</p>
      <label class="profile-label" for="profileName">呼び名</label>
      <input id="profileName" maxlength="12" placeholder="例：ゆう" autocomplete="off">
      <p class="profile-label">いまのあなたに近いのは</p>
      <div class="profile-personas" id="profilePersonas"></div>
      <button type="button" class="profile-save" id="profileSave">この内容で来店する</button>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', (e)=>{ if(e.target.id === 'profileOverlay') ov.classList.add('hidden'); });
  const x = ov.querySelector('#profileClose');
  if(x) x.onclick = ()=>ov.classList.add('hidden');
  return ov;
}

function showProfileCard(){
  const ov = buildProfileOverlay();
  const nameInput = ov.querySelector('#profileName');
  if(nameInput) nameInput.value = userProfile.name || '';
  const grid = ov.querySelector('#profilePersonas');
  let chosen = userProfile.persona || '';
  if(grid){
    grid.innerHTML = '';
    PERSONA_CHOICES.forEach(p=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'persona-chip' + (chosen === p.id ? ' selected' : '');
      b.textContent = p.label;
      b.onclick = ()=>{
        chosen = p.id;
        grid.querySelectorAll('.persona-chip').forEach(el=>el.classList.toggle('selected', el === b));
      };
      grid.appendChild(b);
    });
  }
  const saveBtn = ov.querySelector('#profileSave');
  if(saveBtn) saveBtn.onclick = async ()=>{
    userProfile.name = nameInput ? nameInput.value.trim().slice(0, 12) : '';
    userProfile.persona = chosen;
    await saveJSON(PROFILE_KEY, userProfile);
    ov.classList.add('hidden');
    let welcome = userProfile.name
      ? ('……' + userProfile.name + 'さん、ですね。お名前、覚えました。')
      : '……ようこそ。ゆっくりしていってください。';
    if(userProfile.persona && typeof MIDNIGHT_MESSAGES !== 'undefined' && MIDNIGHT_MESSAGES[userProfile.persona]){
      const pool = MIDNIGHT_MESSAGES[userProfile.persona];
      welcome += '\n' + pool[Math.floor(Math.random()*pool.length)];
    }
    appendBubble('shopkeeper', welcome);
    buzz(8);
  };
  ov.classList.remove('hidden');
}

function warnInAppBrowserIfNeeded(){
  try{
    const ua = navigator.userAgent || '';
    const inApp = /Line\//i.test(ua) || /FBAV|FB_IAB|Instagram|TikTok|Twitter for/i.test(ua);
    if(!inApp || document.getElementById('inAppBrowserNote')) return;
    const bar = document.createElement('div');
    bar.id = 'inAppBrowserNote';
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:sticky;top:0;z-index:300;background:#6E2A34;color:#F6ECD4;font-size:12.5px;line-height:1.7;padding:10px 40px 10px 14px;';
    bar.innerHTML = 'アプリ内ブラウザで開いています。この環境では<b>記録が保存されない場合があります</b>。Safari や Chrome で開き直すことをおすすめします。<button type="button" aria-label="閉じる" style="position:absolute;right:8px;top:8px;background:none;border:none;color:#F6ECD4;font-size:16px;cursor:pointer;">×</button>';
    bar.querySelector('button').onclick = ()=>bar.remove();
    document.body.insertBefore(bar, document.body.firstChild);
  }catch(e){}
}

(async function init(){
  applySeasonalAccent();
  applyNightModeIfNeeded();
  warnInAppBrowserIfNeeded();
  restoreDraftIfAny();
  ensureBackToTopButton();
  const savedProfile = await loadJSON(PROFILE_KEY, null);
  if(savedProfile && typeof savedProfile === 'object'){
    userProfile = Object.assign(userProfile, savedProfile);
  }
  const greetingEl = document.getElementById('firstGreetingText');
  if(greetingEl){
    const hour = new Date().getHours();
    let line;
    if(hour >= 22 || hour < 5){
      const nightPool = (userProfile.persona && typeof MIDNIGHT_MESSAGES !== 'undefined' && MIDNIGHT_MESSAGES[userProfile.persona])
        ? MIDNIGHT_MESSAGES[userProfile.persona]
        : MIDNIGHT_GREETINGS;
      line = nightPool[Math.floor(Math.random()*nightPool.length)];
    }else{
      let bucket;
      if(hour >= 5 && hour < 11) bucket = TIME_GREETINGS.morning;
      else if(hour >= 11 && hour < 17) bucket = TIME_GREETINGS.day;
      else bucket = TIME_GREETINGS.evening;
      if(!bucket || !bucket.length) bucket = TIME_GREETINGS.day;
      line = bucket[Math.floor(Math.random()*bucket.length)] + '近いものを選んでも、下に自由に書いてもらっても構いません。';
    }
    if(userProfile.name){
      line = '……おかえりなさい、' + userProfile.name + 'さん。\n' + line;
    }
    /* item 6: 店主のデイリーメッセージ（DAILY_MESSAGE_PARTS を日付シードで合成、毎日変化） */
    const dailyLine = composeDailyMessage('daily', 11);
    if(dailyLine) line += '\n' + dailyLine;
    typeIntoNode(greetingEl, line);
  }
  if(!savedProfile){
    // 初来店：来店カードをおすすめする（任意）
    setTimeout(()=>showProfileCard(), 1400);
  }
  const profileBtn = document.getElementById('profileBtn');
  if(profileBtn) profileBtn.onclick = ()=>showProfileCard();
  await initPrefs();
  renderFair();
  renderCategorySelect();
  libraryCache = await loadJSON('emotion-bookstore-library', []);
  // 旧カテゴリID（moya）で保存された本を新ID（moyamoya）へ移行
  let _migrated = false;
  libraryCache.forEach(e=>{ if(e && e.category === 'moya'){ e.category = 'moyamoya'; _migrated = true; } });
  if(_migrated) saveJSON('emotion-bookstore-library', libraryCache);
  loadJSON(PURIFY_LOG_KEY, []).then(plog=>{
    if(Array.isArray(plog) && plog.some(p=>p && p.category === 'moya')){
      plog.forEach(p=>{ if(p && p.category === 'moya') p.category = 'moyamoya'; });
      saveJSON(PURIFY_LOG_KEY, plog);
    }
  });
  renderShelfTabs();
  renderShelfDisplay();
  renderShelf();
  updateStoryCount();
  renderChartOptions('root');
  renderTitleSuggest();

  // 初期化時に文言を直感的なものに強制上書きし、さらに手放した気持ちの履歴ボタンを追加する
  const backupBtn = document.getElementById('backupBtn');
  if(backupBtn) backupBtn.innerHTML = '🔑 本棚のデータをバックアップ保存する';
  const exportBtn = document.getElementById('exportDiary');
  if(exportBtn) exportBtn.innerHTML = '📥 これまでの記録をテキストでダウンロード';

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
