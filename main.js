/* ============================================================
 * main.js — 対話ロジック・IndexedDB・番台制御など
 * ============================================================ */
let appLang = 'ja';
function currentLang(){ return appLang; }
function t(key){ return key; } // 多言語用のフォールバック簡略化

const LANG_STORAGE_KEY = 'emotion-bookstore-lang';
async function initLanguage(){ const saved = await loadJSON(LANG_STORAGE_KEY, null); if(saved === 'en' || saved === 'ja') appLang = saved; }
function toggleLanguage(){ appLang = appLang === 'ja' ? 'en' : 'ja'; saveJSON(LANG_STORAGE_KEY, appLang); buzz(6); }

function scoreLabelForStory(label, story){
  if(!story) return 0;
  const chars = Array.from(new Set(label.replace(/[のをにがはでへと日頁記録一]/g,'').split('')));
  let s = 0; chars.forEach(ch=>{ if(story.includes(ch)) s++; }); return s;
}

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
  const taEvent = document.getElementById('storyEventInput');
  const taEmotion = document.getElementById('storyEmotionInput');
  const story = (taEvent && taEmotion) ? (taEvent.value.trim() + taEmotion.value.trim()) : '';
  const picks = suggestTitles(sel.value || activeCategory, story, 4);
  if(!picks.length){ box.innerHTML = ''; return; }
  box.innerHTML = '<span class="title-suggest-label">店主の見立て（タップで採用・自分で書き換えても）：</span>';
  picks.forEach(l=>{
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'title-chip'; b.textContent = l;
    b.onclick = ()=>{ const tInput = document.getElementById('titleInput'); if(tInput){ tInput.value = l; buzz(5); } };
    box.appendChild(b);
  });
}

function generateTitle(categoryId){ const pool = TITLE_TEMPLATES[categoryId] || ['名前のない一冊']; return pool[Math.floor(Math.random()*pool.length)]; }
function recommendReasonFor(catId){ const pool = RECOMMEND_TEMPLATES[catId]; if(!pool || !pool.length) return ''; return pool[Math.floor(Math.random()*pool.length)]; }

const AMAZON_ASSOCIATE_ID = 'uta0106-22';
const RAKUTEN_AFFILIATE_ID = '5590cc07.86ee74b4.5590cc08.a766f047';
function amazonSearchUrl(query, indexParam){
  let url = 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(query);
  if(indexParam) url += '&i=' + indexParam;
  if(AMAZON_ASSOCIATE_ID && AMAZON_ASSOCIATE_ID !== 'your_id-22'){ url += '&tag=' + encodeURIComponent(AMAZON_ASSOCIATE_ID); }
  return url;
}
function rakutenSearchUrl(query){
  const target = 'https://search.rakuten.co.jp/search/mall/' + encodeURIComponent(query) + '/';
  if(RAKUTEN_AFFILIATE_ID) return 'https://hb.afl.rakuten.co.jp/hgc/' + RAKUTEN_AFFILIATE_ID + '/?pc=' + encodeURIComponent(target) + '&m=' + encodeURIComponent(target);
  return target;
}
function rakutenTravelSearchUrl(query){ return 'https://kw.travel.rakuten.co.jp/keyword/Search.do?f_query=' + encodeURIComponent(query) + '&f_max=30&charset=utf-8'; }

function buildShareText(entry){
  const cat = CATEGORIES.find(c=>c.id===entry.category);
  const shelfLabel = cat ? cat.label : '';
  const title = entry.title || '';
  return `「${title}」を、みんなの感情書店の「${shelfLabel}の棚」に綴りました。`;
}

function detourUrlFor(item){
  if(item.affiliate_platform === 'Amazon') return amazonSearchUrl(item.search_query);
  if(item.affiliate_platform === 'Rakuten') return rakutenSearchUrl(item.search_query);
  if(item.affiliate_platform === 'RakutenTravel') return rakutenTravelSearchUrl(item.search_query);
  return amazonSearchUrl(item.search_query);
}

function parseQuoteSource(source){
  if(!source) return { author:'', title:null };
  const m = source.match(/『([^』]+)』/);
  if(!m) return { author:source, title:null };
  const title = m[1];
  let author = source.slice(0, m.index) + source.slice(m.index + m[0].length);
  author = author.replace(/[（(]\s*(小説|漫画|映画|アニメ|歌詞|楽曲)?\s*[）)]/g, '').replace(/(小説|漫画|映画|アニメ|歌詞|楽曲)\s*$/,'').trim();
  return { author, title };
}

function escapeHtml(str){ return String(str == null ? '' : str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function quoteSourceHtml(source){
  const { author, title } = parseQuoteSource(source);
  if(!title) return escapeHtml(source);
  const url = amazonSearchUrl((author ? author + ' ' : '') + title);
  const authorHtml = author ? escapeHtml(author) + ' ' : '';
  return `${authorHtml}<a class="quote-source-link" href="${url}" target="_blank" rel="noopener sponsored">『${escapeHtml(title)}』</a>`;
}

const SHOP_OPEN_DATE = new Date('2026-07-01T00:00:00+09:00');
const MAX_WAVE = 6;
function unlockedWaveCount(){
  const now = new Date();
  const months = (now.getFullYear() - SHOP_OPEN_DATE.getFullYear()) * 12 + (now.getMonth() - SHOP_OPEN_DATE.getMonth());
  return Math.min(MAX_WAVE, Math.max(1, months + 1));
}

function shuffleArray(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function dailySeedNumber(){
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickRecommend(catId){
  const pinned = PINNED_RECOMMEND[catId] || [];
  const wave = unlockedWaveCount();
  const pool = BOOK_POOL.filter(b=>b.tags.includes(catId) && b.wave <= wave);
  const shuffled = shuffleArray(pool);
  return pinned.concat(shuffled.slice(0, 3).map(b=>({ title:b.title, by:b.by, why:(b.hook || recommendReasonFor(catId)) })));
}

const STORY_LIMIT = 700;
function countChars(str){ return Array.from(str || '').length; }
let activeCategory = (CATEGORIES && CATEGORIES.length) ? CATEGORIES[0].id : 'moyamoya';
let libraryCache = [];
let selectedShelfMonth = 'all';

function monthKeyOf(dateStr){
  const d = new Date(dateStr);
  if(isNaN(d.getTime())) return '不明';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function monthLabelOf(key){
  if(key === '不明') return '日付不明';
  const [y, m] = key.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

const TEXTURE_GROUPS = [
  { id:'sink', label:'雨降りのように、心が重く沈んでいる', keeper:'少しお疲れのようですね。このあたりの棚に、今の心に寄り添う本があるかもしれません。', shelves:['moyamoya','kodoku','gakkari','hazukashii','ushirometai','kanashii'], tone:'heavy' },
  { id:'wave', label:'風が吹くように、心がざわざわしている', keeper:'感情が波立っているのですね。こちらの棚に並ぶ言葉が、ヒントになるかもしれません。', shelves:['aseri','kuyashii','shitto','akogare','ikari','fuan','keno','odoroki'], tone:'heavy' },
  { id:'light', label:'晴れやかに、前を向いている', keeper:'素敵な心の状態ですね。今の明るい気分にぴったりの棚を覗いてみませんか。', shelves:['wakuwaku','ando','kansha','itooshii','hokorashii','ureshii'], tone:'neutral' },
  { id:'sepia', label:'夕暮れ時のように、懐かしんでいる', keeper:'過去の頁をめくっているのですね。思い出に浸れるこちらの棚がおすすめです。', shelves:['natsukashii','ushirometai','kansha'], tone:'neutral' }
];

let currentTone = 'neutral';
let counterDraftText = '';

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
        if(!db.objectStoreNames.contains(IDB_STORE)){ db.createObjectStore(IDB_STORE); }
      };
      req.onsuccess = ()=>{ idbHandle = req.result; idbHandle.onclose = ()=>{ idbHandle = null; }; done(idbHandle); };
      req.onerror = ()=>{ idbBroken = true; done(null); };
      req.onblocked = ()=>{ done(null); };
      setTimeout(()=>{ if(!settled){ idbBroken = true; done(null); } }, 3000);
    }catch(e){ idbBroken = true; done(null); }
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

function lsGet(key){ try{ const raw = localStorage.getItem(key); if(!raw) return undefined; return JSON.parse(raw); }catch(e){ return undefined; } }
function lsSet(key, wrapped){ try{ localStorage.setItem(key, JSON.stringify(wrapped)); return true; }catch(e){ return false; } }

const DataRepository = {
  async get(key, fallback){
    let wrapped = await idbGet(key);
    if(wrapped === undefined){
      wrapped = lsGet(key);
      if(wrapped !== undefined){ idbSet(key, wrapped); }
    }
    if(wrapped === undefined || wrapped === null) return fallback;
    try{ if(typeof wrapped === 'object' && 'v' in wrapped && 'data' in wrapped){ return wrapped.data; } return wrapped; }catch(e){ return fallback; }
  },
  async set(key, value){
    const wrapped = { v: STORAGE_VERSION, data: value };
    const okIdb = await idbSet(key, wrapped);
    const okLs = lsSet(key, wrapped);
    if(!okIdb && !okLs){ warnStorageOnce('この端末では保存ができないようです。'); return false; }
    return true;
  },
  async remove(key){ await idbDelete(key); try{ localStorage.removeItem(key); }catch(e){} }
};

async function loadJSON(key, fallback){ return DataRepository.get(key, fallback); }
async function saveJSON(key, value){ return DataRepository.set(key, value); }
async function deleteKey(key){ return DataRepository.remove(key); }

/* --- 堅牢化：タイムアウト付きFetch --- */
async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

const SEASON_QUERY_BY_MONTH = { 1:'冬 新春 雪', 2:'冬 梅 立春', 3:'春 桜 卒業', 4:'春 新生活 桜', 5:'新緑 五月晴れ', 6:'梅雨 紫陽花', 7:'夏 七夕 梅雨明け', 8:'夏 花火 夏休み', 9:'初秋 実り 夜長', 10:'秋 紅葉 読書の秋', 11:'晩秋 紅葉 冬支度', 12:'冬 年末 クリスマス' };
function currentSeasonWord(){ const month = new Date().getMonth() + 1; return SEASON_QUERY_BY_MONTH[month] || ''; }
function todayStamp(){ const d = new Date(); return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate(); }

async function fetchSeasonalBooks(catLabel, extraWord, opts){
  opts = opts || {};
  const granularity = opts.granularity === 'month' ? 'month' : 'day';
  const count = opts.count || 1;
  try{
    const seasonWord = currentSeasonWord();
    const month = new Date().getMonth() + 1;
    const cacheKey = 'emotion-bookstore-bookapi-' + month + '-' + catLabel + '-' + (extraWord||'') + '-' + granularity;
    const cached = await loadJSON(cacheKey, null);
    const stampNow = granularity === 'month' ? String(month) : todayStamp();
    if(cached && cached.stamp === stampNow && Array.isArray(cached.items) && cached.items.length) return cached.items;

    const q = encodeURIComponent([seasonWord, catLabel, extraWord||''].filter(Boolean).join(' '));
    const url = 'https://www.googleapis.com/books/v1/volumes?q=' + q + '&maxResults=12&langRestrict=ja&country=JP';
    const res = await fetchWithTimeout(url, { method:'GET' }, 3000);
    if(!res.ok) throw new Error('API response not ok');
    const json = await res.json();
    const pool = (json.items || []).filter(it=>it.volumeInfo && it.volumeInfo.title).map(it=>{
      const vi = it.volumeInfo;
      return { title: vi.title || '', by: (vi.authors && vi.authors.length) ? vi.authors.join('、') : '著者不明', hook: (vi.description || '').slice(0, 70), infoLink: vi.infoLink || '', image: (vi.imageLinks && vi.imageLinks.thumbnail) ? vi.imageLinks.thumbnail : '' };
    });
    const items = shuffleArray(pool).slice(0, Math.max(count, 1));
    await saveJSON(cacheKey, { stamp: stampNow, items });
    return items;
  }catch(e){
    return null;
  }
}

async function fetchSeasonalMusic(catLabel){
  try{
    const seasonWord = currentSeasonWord();
    const cacheKey = 'emotion-bookstore-musicapi-' + (new Date().getMonth()+1) + '-' + catLabel;
    const cached = await loadJSON(cacheKey, null);
    const today = todayStamp();
    if(cached && cached.date === today && Array.isArray(cached.items)) return cached.items;

    const term = encodeURIComponent(seasonWord + ' ' + catLabel + ' 邦楽');
    const url = 'https://itunes.apple.com/search?term=' + term + '&country=jp&media=music&entity=song&limit=8&lang=ja_jp';
    const res = await fetchWithTimeout(url, { method:'GET' }, 3000);
    if(!res.ok) throw new Error('API response not ok');
    const json = await res.json();
    const items = (json.results || []).filter(r=>r.trackName && r.artistName).slice(0, 3).map(r=>({
      title: r.trackName, artist: r.artistName, comment: r.collectionName || '', image: r.artworkUrl100 || ''
    }));
    await saveJSON(cacheKey, { date: today, items });
    return items;
  }catch(e){
    return null;
  }
}

const PURIFY_LOG_KEY = 'emotion-bookstore-purify-log';
const FAVORITES_KEY = 'emotion-bookstore-favorites';
let favoritesCache = [];

function favKeyOf(type, title, by){ return type + '::' + title + '::' + (by || ''); }
function isFavorited(type, title, by){ const key = favKeyOf(type, title, by); return favoritesCache.some(f => favKeyOf(f.type, f.title, f.by) === key); }

async function toggleFavorite(type, title, by, category, extra){
  const key = favKeyOf(type, title, by);
  const idx = favoritesCache.findIndex(f => favKeyOf(f.type, f.title, f.by) === key);
  let nowFav;
  if(idx >= 0){ favoritesCache.splice(idx, 1); nowFav = false; }
  else{ favoritesCache.push({ type, title, by: by || '', category: category || '', extra: extra || '', addedAt: new Date().toISOString() }); nowFav = true; }
  await saveJSON(FAVORITES_KEY, favoritesCache);
  return nowFav;
}

function favBtnHtml(type, title, by, category, extra){
  if(!title) return '';
  const fav = isFavorited(type, title, by);
  return `<button type="button" class="fav-btn${fav ? ' is-fav' : ''}" data-fav-type="${escapeHtml(type)}" data-fav-title="${escapeHtml(title)}" data-fav-by="${escapeHtml(by || '')}" data-fav-category="${escapeHtml(category || '')}" data-fav-extra="${escapeHtml((extra || '').slice(0, 80))}" aria-pressed="${fav}">${fav ? '★ 気になる' : '☆ 気になる'}</button>`;
}

document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.fav-btn');
  if(!btn) return;
  e.preventDefault();
  const { favType, favTitle, favBy, favCategory, favExtra } = btn.dataset;
  const nowFav = await toggleFavorite(favType, favTitle, favBy, favCategory, favExtra);
  document.querySelectorAll('.fav-btn').forEach(b=>{
    if(b.dataset.favType === favType && b.dataset.favTitle === favTitle && (b.dataset.favBy || '') === (favBy || '')){
      b.classList.toggle('is-fav', nowFav);
      b.setAttribute('aria-pressed', String(nowFav));
      b.textContent = nowFav ? '★ 気になる' : '☆ 気になる';
    }
  });
  if(typeof buzz === 'function') buzz(6);
});

const NEGATIVE_SHELVES = ['moyamoya','ushirometai','kuyashii','kodoku','aseri','shitto','hazukashii','gakkari','ikari','kanashii','fuan'];

function openPurify(shelfId){
  const overlay = document.getElementById('purifyOverlay');
  if(!overlay) return;
  overlay.dataset.shelf = shelfId;
  const lead = document.getElementById('purifyLead');
  const input = document.getElementById('purifyInput');
  const msg = document.getElementById('purifyMsg');
  const btn = document.getElementById('purifyBtn');
  if(lead) lead.textContent = PURIFY_LEADS[shelfId] || 'その気持ちを、そのまま書き出してみてください。';
  if(input){ input.value = ''; input.classList.remove('dissolving'); input.style.display = ''; input.disabled = false; }
  if(btn){ btn.disabled = false; btn.textContent = '🕯 手放す'; btn.dataset.stage = 'input'; }
  if(msg){ msg.classList.add('hidden'); msg.textContent = ''; }
  overlay.classList.remove('hidden');
  if(input) setTimeout(()=>input.focus(), 100);
}

function closePurify(){ const overlay = document.getElementById('purifyOverlay'); if(overlay) overlay.classList.add('hidden'); }
const btnPurifyClose = document.getElementById('purifyClose');
if(btnPurifyClose) btnPurifyClose.onclick = closePurify;

const btnPurify = document.getElementById('purifyBtn');
if(btnPurify) btnPurify.onclick = async ()=>{
  const btn = document.getElementById('purifyBtn');
  if(btn.dataset.stage === 'done'){ closePurify(); return; }
  const input = document.getElementById('purifyInput');
  const msg = document.getElementById('purifyMsg');
  if(!input.value.trim()){ closePurify(); return; }
  btn.disabled = true; input.disabled = true; buzz(12);
  const shelfId = document.getElementById('purifyOverlay').dataset.shelf || '';
  const logEntry = { category: shelfId, text: input.value.trim(), date: new Date().toISOString() };
  loadJSON(PURIFY_LOG_KEY, []).then(log=>{ log.push(logEntry); saveJSON(PURIFY_LOG_KEY, log); });
  if(prefs.motion){ input.classList.add('dissolving'); await wait(1000); }
  input.value = ''; input.style.display = 'none';
  if(msg){ msg.textContent = pickByStyle(PURIFY_CLOSING, PURIFY_CLOSING_TSUNDERE); msg.classList.remove('hidden'); }
  btn.textContent = '閉じる'; btn.dataset.stage = 'done'; btn.disabled = false;
};

const PERSONA_TRIGGERS = [
  { persona:'jobhunter',   patterns:['就活','面接','エントリーシート','ES','説明会','内定','選考','企業研究'] },
  { persona:'student',     patterns:['学校','授業','宿題','部活','テスト','受験','クラス','先生','高校','中学'] },
  { persona:'mother',      patterns:['育児','ワンオペ','子ども','子供','ママ友','保育園','夜泣き','旦那'] },
  { persona:'career_woman', patterns:['キャリア','女性として','管理職','女子会','産休','昇進'] },
  { persona:'young_worker', patterns:['新卒','入社','新人','若手','社会人1年目','社会人２年目'] },
  { persona:'middle_worker',patterns:['部下','上司','板挟み','マネージャー','中間管理職','後輩指導'] },
  { persona:'romance',     patterns:['彼氏','彼女','恋人','失恋','片思い','浮気','デート','LINEの返信'] },
  { persona:'creater',     patterns:['創作','絵師','小説','同人','締め切り','イラスト','原稿'] },
  { persona:'resting',     patterns:['無職','休職','退職','ニート','療養中','休養中'] },
  { persona:'sensitive',   patterns:['繊細','HSP','敏感','眠れない','深夜','夜中'] },
  { persona:'freelance',   patterns:['フリーランス','自営業','個人事業','クライアント','納品','案件','受注'] },
  { persona:'caregiver',   patterns:['介護','看病','付き添い','ケアマネ','老人ホーム'] },
  { persona:'second_life',  patterns:['定年','老後','年金','孫が','セカンドライフ','シニア'] },
  { persona:'illness',     patterns:['闘病','持病','通院','入院中','治療中','検査結果','リハビリ','体調が優れ'] },
  { persona:'jobchanger',  patterns:['転職','転職活動','今の会社を辞め','キャリアチェンジ','異業種','転職エージェント','退職を考え'] }
];

function detectCounselingPersona(text){
  for(const t of PERSONA_TRIGGERS){ if(t.patterns.some(p=>text.includes(p))) return t.persona; }
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
  for(const s of STATE_TRIGGERS){ if(s.patterns.some(p=>text.includes(p))) return s.state; }
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
    if(id === 'moyamoya') continue;
    const score = CATEGORY_KEYWORDS[id].reduce((n,w)=>n + (text.includes(w) ? 1 : 0), 0);
    if(score > bestScore){ bestScore = score; bestId = id; }
  }
  if(bestScore >= (minScore || 1)) return bestId;
  const moyaScore = CATEGORY_KEYWORDS.moyamoya.reduce((n,w)=>n + (text.includes(w) ? 1 : 0), 0);
  return moyaScore >= (minScore || 1) ? 'moyamoya' : null;
}

function localCurate(title, story, chosenId){
  const combined = title + '\n' + story;
  if(CRISIS_STORY_PATTERNS.some(w=>combined.includes(w))){
    return { approved:false, category:null, note:'', reason:'その気持ちは、ここに書き留めるだけでなく、信頼できる大人の方や「よりそいホットライン」0120-279-338にも、ぜひ話してみてください。' };
  }
  if(PERSONAL_INFO_PATTERNS.some(p=>p.test(combined))){
    return { approved:false, category:null, note:'', reason:'連絡先や個人が特定できる情報が含まれているようです。そこだけ伏せて、もう一度お持ちください。' };
  }
  if(ATTACK_WORDS.some(w=>combined.includes(w))){
    return { approved:false, category:null, note:'', reason:'誰かを深く傷つける言葉が含まれているようです。ご自身の気持ちの部分だけ、綴り直してみてください。' };
  }
  let bestId = null, bestScore = 0;
  for(const id in CATEGORY_KEYWORDS){
    if(id === 'moyamoya') continue;
    const score = CATEGORY_KEYWORDS[id].reduce((n,w)=>n + (combined.includes(w) ? 1 : 0), 0);
    if(score > bestScore){ bestScore = score; bestId = id; }
  }
  const suggested = (bestScore >= 1 && bestId && bestId !== chosenId) ? bestId : chosenId;
  return { approved:true, category:suggested, note: SHOPKEEPER_NOTES[Math.floor(Math.random()*SHOPKEEPER_NOTES.length)], reason:'' };
}

function localShiori(topLabel){
  const t = SHIORI_TEMPLATES[Math.floor(Math.random()*SHIORI_TEMPLATES.length)];
  return t.replace('{cat}', topLabel);
}

let prefs = { motion:true, sound:false, keeperStyle:'gentle' };
function isTsundere(){ return prefs.keeperStyle === 'tsundere'; }
function pickByStyle(gentleArr, tsundereArr){
  const pool = (isTsundere() && Array.isArray(tsundereArr) && tsundereArr.length) ? tsundereArr : gentleArr;
  return pool[Math.floor(Math.random()*pool.length)];
}
function currentKeeperName(){ return isTsundere() ? '綴' : '巡'; }

const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function applyPrefs(){
  document.body.classList.toggle('no-motion', !prefs.motion);
  const mt = document.getElementById('motionToggle');
  if(mt){ mt.textContent = prefs.motion ? '演出：入' : '演出：切'; mt.classList.toggle('on', prefs.motion); }
}

async function initPrefs(){
  const saved = await loadJSON('emotion-bookstore-prefs', null);
  if(saved && typeof saved === 'object'){ prefs = Object.assign(prefs, saved); }
  else if(reduceQuery && reduceQuery.matches){ prefs.motion = false; }
  applyPrefs();
}

const mtBtn = document.getElementById('motionToggle');
if(mtBtn) mtBtn.onclick = ()=>{ prefs.motion = !prefs.motion; applyPrefs(); saveJSON('emotion-bookstore-prefs', prefs); };

function buzz(ms){ if(prefs.motion && navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} } }

const HEAVY_WORDS = ['つら','しんど','悲し','泣','苦し','不安','怖','孤独','疲れ','嫌','消え'];
const BRIGHT_WORDS = ['嬉し','楽し','わくわく','ワクワク','好き','幸','誇ら','最高'];
function setMood(text){
  if(!prefs.motion) return;
  const layer = document.getElementById('moodLayer');
  if(!layer) return;
  if(HEAVY_WORDS.some(w=>text.includes(w))){ layer.style.background = 'rgba(45,60,110,0.07)'; }
  else if(BRIGHT_WORDS.some(w=>text.includes(w))){ layer.style.background = 'rgba(255,150,60,0.06)'; }
  else{ layer.style.background = 'rgba(0,0,0,0)'; }
}

function scrollToId(id){
  const el = document.getElementById(id);
  if(el) { const y = el.getBoundingClientRect().top + window.scrollY - 20; window.scrollTo({ top: y, behavior: prefs.motion ? 'smooth' : 'auto' }); }
}

function setActivePageTab(id){
  document.querySelectorAll('.page-tab').forEach(btn=>{ btn.classList.toggle('active', btn.dataset.page === id); });
}

function goToPage(id){
  setActivePageTab(id);
  if(id === 'desk'){ syncCounterDraftToDesk(); updateDeskLead(); }
  if(!prefs.motion){ requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToId(id))); return; }
  const overlay = document.getElementById('pageTurnOverlay');
  if(!overlay){ requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToId(id))); return; }
  overlay.classList.remove('active'); void overlay.offsetWidth; overlay.classList.add('active'); buzz(10);
  setTimeout(()=>scrollToId(id), 260); setTimeout(()=>overlay.classList.remove('active'), 650);
}

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
    const title = document.createElement('b'); title.textContent = m + '月の店主のおすすめ棚 — 『' + cat.label + '』';
    const line = document.createElement('span'); line.className = 'fair-line'; line.textContent = fair.line;
    const go = document.createElement('button'); go.className = 'fair-go'; go.textContent = '棚へ'; go.onclick = ()=>goToShelf(fair.id);
    box.appendChild(title); box.appendChild(line); box.appendChild(go);
  }catch(e){}
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
    TEXTURE_GROUPS.forEach(group=>{
      const shelvesInGroup = group.shelves.map(id=>CATEGORIES.find(c=>c.id===id)).filter(Boolean);
      if(!shelvesInGroup.length) return;
      const groupEl = document.createElement('div'); groupEl.className = 'shelf-group';
      const row = document.createElement('div'); row.className = 'shelf-group-row';
      shelvesInGroup.forEach(cat=>{
        const btn = document.createElement('button');
        btn.className = 'shelf-tab' + (cat.id===activeCategory ? ' active' : '');
        btn.dataset.catId = cat.id;
        if(cat.id === topId){ btn.classList.add('glow'); }
        btn.textContent = cat.label;
        btn.onclick = ()=>{ activeCategory = cat.id; renderShelfTabs(); renderShelfDisplay(); };
        row.appendChild(btn);
      });
      groupEl.appendChild(row); wrap.appendChild(groupEl);
    });
    // ★追加: ランダム棚ボタン（改善5）
    const wanderRow = document.createElement('div'); wanderRow.className = 'shelf-wander-row';
    const wander = document.createElement('button'); wander.className = 'wander-btn'; wander.textContent = '⚘ 気の向くままに巡る';
    wander.onclick = ()=>{
      let pick = activeCategory;
      while(pick === activeCategory && CATEGORIES.length > 1){ pick = CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)].id; }
      activeCategory = pick; renderShelfTabs(); renderShelfDisplay();
    };
    wanderRow.appendChild(wander); wrap.appendChild(wanderRow);
  }catch(e){}
}

function renderDetourFallback(box, catId){
  const items = DETOUR_POOL[catId];
  if(!items || !items.length){ box.innerHTML = ''; return; }
  const tierLabel = { low:'ちいさな寄り道', medium:'すこし贅沢な寄り道', high:'とっておきの寄り道' };
  const picks = shuffleArray(items).slice(0, 3);
  const cardsHtml = picks.map(featured=>{
    const url = detourUrlFor(featured);
    return `
      <div class="detour-card detour-tier-${featured.tier}">
        <span class="detour-tier-badge">${tierLabel[featured.tier] || featured.tier}</span>
        <p class="detour-name">${escapeHtml(featured.name)}</p>
        <p class="detour-desc">${escapeHtml(featured.description)}</p>
        <a class="detour-link" href="${url}" target="_blank" rel="noopener sponsored">見てみる →</a>
      </div>`;
  }).join('');
  box.innerHTML = `<p class="detour-heading">今月の寄り道</p><div class="detour-cards">${cardsHtml}</div>`;
}

async function renderDetourSection(catId){
  const box = document.getElementById('detourSection');
  if(!box) return;
  const cat = CATEGORIES.find(c=>c.id===catId);
  const catLabel = cat ? cat.label : '';
  const requestedCategory = catId;
  box.innerHTML = `<p class="detour-heading">今月の寄り道</p><p class="detour-loading">……季節に合う一冊を探しています</p>`;
  const liveItems = await fetchSeasonalBooks(catLabel, '寄り道', { granularity:'month', count:3 });
  if(activeCategory !== requestedCategory) return;
  if(liveItems && liveItems.length){
    const cardsHtml = liveItems.slice(0, 3).map(b=>{
      const url = b.infoLink || amazonSearchUrl(b.title + ' ' + b.by);
      return `
        <div class="detour-card detour-live">
          <span class="detour-tier-badge">🌐 今月の一冊</span>
          <p class="detour-name">${escapeHtml(b.title)}</p>
          <p class="detour-desc">${escapeHtml(b.by)}${b.hook ? ' — ' + escapeHtml(b.hook) : ''}</p>
          <a class="detour-link" href="${url}" target="_blank" rel="noopener">見てみる →</a>
        </div>`;
    }).join('');
    box.innerHTML = `<p class="detour-heading">今月の寄り道</p><div class="detour-cards">${cardsHtml}</div>`;
    return;
  }
  renderDetourFallback(box, catId);
}

// 面陳UI（書影・ジャケ写対応）
async function renderLiveNewReleases(cat){
  const wrap = document.getElementById('livePickWrap');
  if(!wrap || !cat) return;
  const requestedCategory = cat.id;
  const [books, songs] = await Promise.all([ fetchSeasonalBooks(cat.label, '新刊'), fetchSeasonalMusic(cat.label) ]);
  if(activeCategory !== requestedCategory) return;
  let html = '';
  if(books && books.length){
    const b = books[0];
    const url = b.infoLink || amazonSearchUrl(b.title + ' ' + b.by);
    html += `<div class="live-pick-card">
      <span class="live-pick-badge">🌐 今、見つかった一冊</span>
      ${b.image ? `<img class="live-pick-cover" src="${b.image}" alt="">` : ''}
      <p class="live-pick-name">${escapeHtml(b.title)}</p>
      <p class="live-pick-desc">${escapeHtml(b.by)}${b.hook ? ' — ' + escapeHtml(b.hook) : ''}</p>
      <a class="live-pick-link" href="${url}" target="_blank" rel="noopener">見てみる →</a>
      ${favBtnHtml('book', b.title, b.by, cat.id, b.hook || '')}
    </div>`;
  }
  if(songs && songs.length){
    const s = songs[0];
    const q4 = s.title + ' ' + s.artist;
    const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q4);
    html += `<div class="live-pick-card">
      <span class="live-pick-badge">🌐 今、見つかった一曲</span>
      ${s.image ? `<img class="live-pick-cover" src="${s.image}" alt="">` : ''}
      <p class="live-pick-name">『${escapeHtml(s.title)}』${escapeHtml(s.artist)}</p>
      ${s.comment ? `<p class="live-pick-desc">${escapeHtml(s.comment)}</p>` : ''}
      <a class="live-pick-link" href="${spUrl}" target="_blank" rel="noopener">聴いてみる →</a>
      ${favBtnHtml('music', s.title, s.artist, cat.id, s.comment || '')}
    </div>`;
  }
  wrap.innerHTML = html ? `<p class="live-pick-heading">🌐 今、季節に合わせて見つかったもの</p><div class="live-pick-row">${html}</div>` : '';
}

function renderShelfDisplay(){
  try{
    const el = document.getElementById('shelfDisplay');
    if(!el) return;
    const cat = CATEGORIES.find(c=>c.id===activeCategory);
    if(!cat){ el.innerHTML = ''; return; }
    if(prefs.motion){ el.style.transition = 'opacity .16s ease'; el.style.opacity = '0'; }
    const quotes = cat.quotes || [];
    const q = quotes.length ? quotes[Math.floor(Math.random()*quotes.length)] : { text:'', source:'' };
    const recs = pickRecommend(cat.id);
    const recommendHtml = (recs && recs.length)
      ? `<div class="recommend-section">
          <p class="recommend-heading">「${cat.label}」な今のあなたに、店主が選んだ本</p>
          <div class="recommend-row">
          ${recs.map(r=>{
            const q2 = r.title + ' ' + r.by;
            return `<span class="recommend-chip">
              ${r.hook ? `<span class="recommend-hook">${r.hook}</span>` : ''}
              『${r.title}』${r.by}
              <span class="recommend-why">${r.why || ''}</span>
              <span class="recommend-shop-links">
                <a class="recommend-buy" href="${amazonSearchUrl(q2)}" target="_blank" rel="noopener">Amazon</a>
              </span>
              ${favBtnHtml('book', r.title, r.by, cat.id, r.hook || r.why || '')}
            </span>`;
          }).join('')}
          <button type="button" class="recommend-shuffle" onclick="renderShelfDisplay()">🔀 他も見る</button>
          </div>
         </div>` : '';
    const mq = MUSIC_QUERIES[cat.id] || [];
    const trackSrc = mq.length ? shuffleArray(mq).slice(0, 3).map(t=>({ title:t.title, artist:t.artist, comment:t.comment || '' })) : [];
    let musicHtml = '';
    if(trackSrc.length){
      const items = trackSrc.map(song=>{
        const q3 = song.title + ' ' + song.artist;
        const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q3);
        return `<div class="playlist-track-row">
          <span class="playlist-track-name">『${song.title}』${song.artist}</span>
          ${song.comment ? `<span class="playlist-track-comment">${song.comment}</span>` : ''}
          <span class="playlist-services"><a href="${ytUrl}" target="_blank" rel="noopener">YouTube</a></span>
          ${favBtnHtml('music', song.title, song.artist, cat.id, song.comment || '')}
        </div>`;
      }).join('');
      musicHtml = `<div class="music-row"><p class="playlist-label">🎵 「${cat.label}」なプレイリスト — 店主の選曲</p><div class="playlist-tracks">${items}</div></div>`;
    }
    const myEntries = libraryCache.filter(e=>e.category===cat.id);
    const myEpisodeCards = myEntries.map(entry=>`<div class="episode-card mine" data-entry-id="${escapeHtml(entry.id)}"><span class="who mine-who">あなたの物語</span>『${escapeHtml(entry.title)}』${escapeHtml(entry.story.slice(0,60))}</div>`);
    const storyPool = STORIES_POOL[cat.id] || [];
    const sampleEpisodeCards = shuffleArray(storyPool).slice(0, 3).map(s=>`<div class="episode-card"><span class="who">${s.author || '誰かの物語'}</span>${s.text}</div>`);
    const allEpisodeCards = myEpisodeCards.concat(sampleEpisodeCards);
    const visibleEpisodesHtml = allEpisodeCards.slice(0, 2).join('');
    const hiddenEpisodeCards = allEpisodeCards.slice(2);
    const hiddenEpisodesHtml = hiddenEpisodeCards.length
      ? `<div class="episodes-more hidden" id="episodesMore">${hiddenEpisodeCards.join('')}</div><button type="button" class="episodes-toggle" onclick="document.getElementById('episodesMore').classList.toggle('hidden')">もっと見る</button>` : '';
    
    // クイック手放し導線
    const purifyHtml = NEGATIVE_SHELVES.includes(cat.id) ? `<button type="button" class="purify-trigger" onclick="openPurify('${cat.id}')">🕯 この気持ちを吐き出して手放す</button>` : '';

    el.innerHTML = `
      <p class="definition"><b>${cat.label}</b> — ${cat.def}</p>
      <p class="quote-card">${q.text}</p>
      <p class="quote-source">— ${quoteSourceHtml(q.source)}</p>
      <p class="episodes-heading">あなたの物語・みんなの物語</p>
      <div class="episodes">${visibleEpisodesHtml}${hiddenEpisodesHtml}</div>
      ${purifyHtml}
      ${recommendHtml}
      ${musicHtml}
      <div class="live-pick-wrap" id="livePickWrap"></div>
    `;
    el.querySelectorAll('.episode-card.mine').forEach(card=>{
      card.onclick = ()=>{ const entry = libraryCache.find(e=>e.id === card.dataset.entryId); if(entry){ buzz(8); openBook(entry); } };
    });
    renderDetourSection(cat.id);
    renderLiveNewReleases(cat);
    if(prefs.motion){ requestAnimationFrame(()=>{ el.style.opacity = '1'; }); }
    
    // 背景色を感情に連動させる（改善4）
    document.documentElement.style.setProperty('--paper', `var(--mood-${cat.id}, #EAD9B8)`);
  }catch(e){}
}

function renderCategorySelect(){
  const sel = document.getElementById('categorySelect');
  if(!sel) return;
  sel.innerHTML = CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  sel.addEventListener('change', ()=>renderTitleSuggest());
}

function spineColorFor(catId){
  const idx = CATEGORIES.findIndex(c=>c.id===catId);
  return SPINE_COLORS[idx % SPINE_COLORS.length];
}

function shadeHex(hex, percent){
  const c = (hex || '#000000').replace('#','');
  const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  const adj = (v)=> Math.max(0, Math.min(255, Math.round(v + (percent < 0 ? v : 255 - v) * percent)));
  const toHex = (v)=> v.toString(16).padStart(2,'0');
  return '#' + toHex(adj(r)) + toHex(adj(g)) + toHex(adj(b));
}
function spineGradientFor(catId, seed, len){
  const base = spineColorFor(catId);
  const wobble = ((seed % 7) - 3) / 100;
  const top = shadeHex(base, 0.16 + wobble);
  const bottom = shadeHex(base, -0.12 - wobble);
  return `linear-gradient(180deg, ${top} 0%, ${base} 45%, ${bottom} 100%)`;
}

function renderShelfMonthTabs(){
  const wrap = document.getElementById('shelfMonthTabs');
  if(!wrap) return;
  const counts = {};
  libraryCache.forEach(e=>{ const k = monthKeyOf(e.date); counts[k] = (counts[k]||0) + 1; });
  const months = Object.keys(counts).sort().reverse();
  if(months.length <= 1){ wrap.innerHTML = ''; wrap.classList.add('hidden'); selectedShelfMonth = 'all'; return; }
  wrap.classList.remove('hidden'); wrap.innerHTML = '';
  const allBtn = document.createElement('button'); allBtn.className = 'shelf-month-tab' + (selectedShelfMonth === 'all' ? ' active' : ''); allBtn.textContent = `すべて (${libraryCache.length})`;
  allBtn.onclick = ()=>{ selectedShelfMonth = 'all'; renderShelf(false); }; wrap.appendChild(allBtn);
  months.forEach(key=>{
    const btn = document.createElement('button'); btn.className = 'shelf-month-tab' + (selectedShelfMonth === key ? ' active' : ''); btn.textContent = `${monthLabelOf(key)} (${counts[key]})`;
    btn.onclick = ()=>{ selectedShelfMonth = key; renderShelf(false); }; wrap.appendChild(btn);
  });
}

function renderShelf(markNewest){
  const shelf = document.getElementById('myShelf');
  if(!shelf) return;
  const emptyMsg = document.getElementById('shelfEmptyMsg');
  const countBadge = document.getElementById('shelfCount');
  renderShelfMonthTabs();
  const visible = selectedShelfMonth === 'all' ? libraryCache : libraryCache.filter(e=>monthKeyOf(e.date) === selectedShelfMonth);
  const newestId = libraryCache.length ? libraryCache[libraryCache.length - 1].id : null;
  shelf.querySelectorAll('.spine').forEach(n=>n.remove());
  if(countBadge) countBadge.textContent = libraryCache.length ? `蔵書 ${libraryCache.length}冊` : '';
  if(visible.length === 0){
    if(emptyMsg) emptyMsg.style.display = 'block';
    appendEmptySpine(shelf); applyShelfTier(); renderTrend(); renderShioriCard();
    return;
  }
  if(emptyMsg) emptyMsg.style.display = 'none';
  visible.forEach((entry, i)=>{
    const cat = CATEGORIES.find(c=>c.id===entry.category);
    const spine = document.createElement('div');
    spine.className = 'spine';
    spine.style.background = spineGradientFor(entry.category, entry.title.length + i);
    
    // 紙の束と厚みのエフェクト（文字数に応じてbox-shadowを深くする）
    const thickness = Math.min(6, Math.max(1, Math.floor(entry.story.length / 100)));
    spine.style.boxShadow = `inset -3px 0 0 rgba(0,0,0,0.15), inset 3px 0 0 rgba(255,255,255,0.08), 2px 0 ${thickness}px rgba(0,0,0,0.3)`;
    
    spine.style.height = (140 + (entry.title.length % 4) * 12) + 'px';
    const tilt = ((entry.title.length * 7 + i * 13) % 5) - 2;
    spine.style.setProperty('--tilt', tilt + 'deg');
    spine.textContent = entry.title;
    spine.title = cat ? cat.label : '';
    spine.onclick = ()=>{ buzz(8); openBook(entry); };
    if(markNewest && entry.id === newestId && prefs.motion){ spine.classList.add('new'); setTimeout(()=>spine.classList.remove('new'), 600); }
    shelf.appendChild(spine);
  });
  appendEmptySpine(shelf); applyShelfTier(); renderTrend(); renderShioriCard();
}

function applyShelfTier(){
  const wood = document.querySelector('.wood-shelf');
  if(!wood) return;
  let tier = 0;
  if(libraryCache.length >= 100) tier = 4; else if(libraryCache.length >= 50) tier = 3; else if(libraryCache.length >= 30) tier = 2; else if(libraryCache.length >= 10) tier = 1;
  ['tier1','tier2','tier3','tier4'].forEach(c=>wood.classList.remove(c));
  if(tier > 0) wood.classList.add('tier' + tier);
  let orn = document.getElementById('shelfOrnaments');
  if(!orn){ orn = document.createElement('div'); orn.id = 'shelfOrnaments'; orn.className = 'shelf-ornaments'; wood.insertBefore(orn, wood.firstChild); }
  const SHELF_TIER_ORNAMENTS = ['', '🕯', '🕯 🪴', '🏮 🕯 🪴', '🏮 🕯 🪴 🐈‍⬛'];
  orn.textContent = SHELF_TIER_ORNAMENTS[tier];
}

function appendEmptySpine(shelf){
  const ghost = document.createElement('div'); ghost.className = 'spine empty-spine'; ghost.textContent = '＋ 次の一冊';
  ghost.onclick = ()=>{ buzz(6); goToPage('desk'); }; shelf.appendChild(ghost);
}

function playSuckAnimation(catId){
  if(!prefs.motion) return;
  const wood = document.querySelector('.wood-shelf');
  if(!wood) return;
  const rect = wood.getBoundingClientRect();
  const fly = document.createElement('div'); fly.className = 'fly-book'; fly.style.background = spineColorFor(catId);
  document.body.appendChild(fly);
  const tx = rect.left + rect.width / 2 - window.innerWidth / 2;
  const ty = rect.top + rect.height / 2 - window.innerHeight / 2;
  fly.style.setProperty('--suck-x', tx + 'px'); fly.style.setProperty('--suck-y', ty + 'px');
  requestAnimationFrame(()=>fly.classList.add('go')); setTimeout(()=>fly.remove(), 950);
}

function renderTrend(){
  const box = document.getElementById('trendBox'); const bars = document.getElementById('trendBars'); const sum = document.getElementById('trendSummary');
  if(!box || !bars || !sum) return;
  if(libraryCache.length === 0){ box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const counts = {}; libraryCache.forEach(e=>{ counts[e.category] = (counts[e.category]||0) + 1; });
  const max = Math.max(...Object.values(counts));
  bars.innerHTML = CATEGORIES.filter(c=>counts[c.id]).map(c=>{
    const w = Math.max(8, Math.round(counts[c.id] / max * 100));
    return `<div class="trend-row"><span class="trend-label">${c.label}</span><div class="trend-bar" style="width:${w}%;background:${spineColorFor(c.id)}"></div><span class="trend-count">${counts[c.id]}冊</span></div>`;
  }).join('');
  const top = CATEGORIES.filter(c=>counts[c.id]).sort((a,b)=>counts[b.id]-counts[a.id]);
  if(top.length) sum.textContent = `あなたの本棚は、「${top[0].label}」の棚がいちばん厚いようです。`;
}

async function renderShioriCard(){
  const card = document.getElementById('shioriCard'); const slip = document.getElementById('shioriSlip'); const btn = document.getElementById('shioriBtn');
  if(!card || !slip || !btn) return;
  if(libraryCache.length === 0){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const cached = await loadJSON('emotion-bookstore-shiori', null);
  if(cached && cached.date === todayStamp() && cached.text){
    document.getElementById('shioriText').textContent = cached.text;
    slip.classList.remove('hidden'); btn.classList.add('hidden');
  }else{
    slip.classList.add('hidden'); btn.classList.remove('hidden'); btn.disabled = false; btn.textContent = '栞を受け取る';
  }
}

const btnShiori = document.getElementById('shioriBtn');
if(btnShiori){
  btnShiori.onclick = async ()=>{
    btnShiori.disabled = true; btnShiori.textContent = '店主が言葉を選んでいます…';
    await wait(prefs.motion ? 600 : 50);
    const topId = topCategoryId(); const topLabel = (CATEGORIES.find(c=>c.id===topId) || {}).label || 'あなた';
    const text = localShiori(topLabel);
    document.getElementById('shioriText').textContent = text;
    document.getElementById('shioriSlip').classList.remove('hidden'); btnShiori.classList.add('hidden');
    saveJSON('emotion-bookstore-shiori', { date: todayStamp(), text });
  };
}

function openBook(entry){
  const cat = CATEGORIES.find(c=>c.id===entry.category);
  document.getElementById('modalCat').textContent = cat ? cat.label + 'の棚' : '';
  document.getElementById('modalTitle').textContent = entry.title;
  document.getElementById('modalStory').textContent = entry.story;
  const noteSlip = document.getElementById('modalNote');
  if(entry.note){ document.getElementById('modalNoteText').textContent = entry.note; noteSlip.classList.remove('hidden'); } else { noteSlip.classList.add('hidden'); }
  const bModal = document.getElementById('bookModal');
  bModal.classList.remove('hidden');
  document.getElementById('modalGoShelf').onclick = ()=>{ bModal.classList.add('hidden'); goToShelf(entry.category); };
  document.getElementById('modalDel').onclick = async ()=>{
    libraryCache = libraryCache.filter(e=>e.id !== entry.id); await saveJSON('emotion-bookstore-library', libraryCache);
    renderShelf(); renderShelfTabs(); bModal.classList.add('hidden');
  };
}

const btnModalClose = document.getElementById('modalClose');
if(btnModalClose) btnModalClose.onclick = ()=>{ document.getElementById('bookModal').classList.add('hidden'); };

function runBinding(onDone){
  if(!prefs.motion){ onDone(); return; }
  const ov = document.getElementById('bindOverlay'); const txt = document.getElementById('bindText');
  let finished = false;
  function finish(){ if(finished) return; finished = true; ov.classList.add('hidden'); ov.classList.remove('animating'); ov.onclick = null; onDone(); }
  ov.classList.remove('hidden'); ov.classList.add('animating'); txt.textContent = '店主が言葉を選んでいます…';
  setTimeout(()=>{ txt.textContent = '糸をかけています…'; }, 850);
  setTimeout(finish, 1800); ov.onclick = finish;
}

function showCurateBox(message, actions){
  const box = document.getElementById('curateBox'); const msgEl = document.getElementById('curateMsg'); const actEl = document.getElementById('curateActions');
  msgEl.textContent = message; actEl.innerHTML = '';
  actions.forEach(a=>{
    const btn = document.createElement('button'); btn.className = a.primary ? 'curate-btn primary' : 'curate-btn';
    btn.textContent = a.label; btn.onclick = ()=>{ box.classList.add('hidden'); a.onClick(); }; actEl.appendChild(btn);
  });
  box.classList.remove('hidden');
}
function hideCurateBox(){ document.getElementById('curateBox').classList.add('hidden'); }

const btnAssist = document.getElementById('assistBtn');
if(btnAssist) {
  btnAssist.onclick = ()=>{
    const ta = document.getElementById('storyEventInput');
    if(!ta) return;
    if(ta.value.trim() === ''){ ta.value = 'いつ：\nどこで：\nなにがあった：\n'; updateStoryCount(); }
    ta.focus();
  };
}

/* --- 【#69】2欄分割の合算・下書き・製本ロジック --- */
function updateStoryCount(){
  const taEvent = document.getElementById('storyEventInput');
  const taEmotion = document.getElementById('storyEmotionInput');
  const el = document.getElementById('storyCount');
  if(!el) return;
  const lenEvent = taEvent ? countChars(taEvent.value) : 0;
  const lenEmotion = taEmotion ? countChars(taEmotion.value) : 0;
  const len = lenEvent + lenEmotion;
  el.textContent = `${len} / ${STORY_LIMIT}字`;
  el.classList.toggle('over', len > STORY_LIMIT);
}

const DRAFT_KEY = 'emotion-bookstore-draft';
let draftTimer = null;
const draftHandler = ()=>{
  clearTimeout(draftTimer);
  draftTimer = setTimeout(()=>{
    const taEvent = document.getElementById('storyEventInput');
    const taEmotion = document.getElementById('storyEmotionInput');
    const textEvent = taEvent ? taEvent.value : '';
    const textEmotion = taEmotion ? taEmotion.value : '';
    const combined = textEvent.trim() + textEmotion.trim();
    if(combined){ saveJSON(DRAFT_KEY, { textEvent, textEmotion, date: new Date().toISOString() }); }
    else{ deleteKey(DRAFT_KEY); }
    renderTitleSuggest();
  }, 500);
};
const inputStoryEvent = document.getElementById('storyEventInput');
const inputStoryEmotion = document.getElementById('storyEmotionInput');
if(inputStoryEvent) inputStoryEvent.addEventListener('input', ()=>{ updateStoryCount(); draftHandler(); });
if(inputStoryEmotion) inputStoryEmotion.addEventListener('input', ()=>{ updateStoryCount(); draftHandler(); });

async function restoreDraftIfAny(){
  const draft = await loadJSON(DRAFT_KEY, null);
  if(!draft) return;
  const taEvent = document.getElementById('storyEventInput');
  const taEmotion = document.getElementById('storyEmotionInput');
  if(taEvent && !taEvent.value.trim() && draft.textEvent) taEvent.value = draft.textEvent;
  if(taEmotion && !taEmotion.value.trim() && draft.textEmotion) taEmotion.value = draft.textEmotion;
  updateStoryCount();
  const msg = document.getElementById('deskMsg');
  if(msg) msg.textContent = '書きかけの下書きを復元しました。';
}

const btnSubmit = document.getElementById('submitStory');
if(btnSubmit) {
  btnSubmit.onclick = async ()=>{
    const sel = document.getElementById('categorySelect');
    if(!sel) return;
    const chosenId = sel.value;
    const taEvent = document.getElementById('storyEventInput');
    const taEmotion = document.getElementById('storyEmotionInput');
    const valEvent = taEvent ? taEvent.value.trim() : '';
    const valEmotion = taEmotion ? taEmotion.value.trim() : '';
    const story = (valEvent ? valEvent + '\n\n' : '') + valEmotion;
    const msg = document.getElementById('deskMsg');
    const btn = document.getElementById('submitStory');
    hideCurateBox();

    if(!valEmotion){
      if(msg) msg.textContent = "まずは、「感情と考え」の欄にそのときの気持ちを書いてみてください。";
      return;
    }
    const tInput = document.getElementById('titleInput');
    const title = (tInput ? tInput.value.trim() : '') || (suggestTitles(chosenId, story, 1)[0]) || generateTitle(chosenId);
    if(countChars(story) > STORY_LIMIT){ if(msg) msg.textContent = "本文が長すぎます。"; return; }
    btn.disabled = true;
    if(msg) msg.textContent = '店主が物語に目を通しています…';

    const wSel = document.getElementById('whenSelect');
    const isPast = wSel ? (wSel.value === 'past') : false;

    await wait(prefs.motion ? 500 : 30);
    const cur = localCurate(title, story, chosenId);

    const bind = (finalCategory, note)=>{
      runBinding(async ()=>{
        const priorCount = libraryCache.filter(e=>e.category===finalCategory).length;
        const entry = {
          id: Date.now().toString(), category: finalCategory, title, story, note: note || '',
          sealed: isPast, date: new Date().toISOString(),
          createdAt: new Date().toISOString(), causeCategory: '' // 1年前の栞用の仕込み
        };
        libraryCache.push(entry);
        if(taEvent) taEvent.value = '';
        if(taEmotion) taEmotion.value = '';
        playSuckAnimation(finalCategory); selectedShelfMonth = 'all'; renderShelf(true); renderShelfTabs();
        if(tInput) tInput.value = ''; deleteKey(DRAFT_KEY); updateStoryCount();
        if(msg) msg.textContent = priorCount > 0 ? `製本しました。この棚には${priorCount + 1}冊目です。` : '製本しました。';
        await saveJSON('emotion-bookstore-library', libraryCache);
        btn.disabled = false;
        setTimeout(() => goToPage('bookshelf'), 1500);
      });
    };

    if(!cur){ bind(chosenId, ''); return; }
    if(!cur.approved){
      if(msg) msg.textContent = ''; btn.disabled = false;
      showCurateBox((cur.reason || 'この内容はお預かりできません。') + '\n少し書き方を変えて、また持ってきてください。', [{ label:'書き直す', primary:true, onClick:()=>{ if(taEmotion) taEmotion.focus(); } }]);
      return;
    }
    const suggested = cur.category;
    if(suggested && suggested !== chosenId){
      const sLabel = (CATEGORIES.find(c=>c.id===suggested) || {}).label || '';
      if(msg) msg.textContent = '';
      showCurateBox('この物語、『' + sLabel + '』の棚がよく似合いそうです。どちらに納めましょうか。', [
        { label:'『' + sLabel + '』に納品', primary:true, onClick:()=>bind(suggested, cur.note) },
        { label:'このまま納品', onClick:()=>bind(chosenId, cur.note) }
      ]);
      return;
    }
    if(msg) msg.textContent = ''; bind(chosenId, cur.note);
  };
}

const btnReset = document.getElementById('resetShelf');
if(btnReset) { btnReset.onclick = async ()=>{ if(!confirm('本棚のすべての本を下げます。よろしいですか？')) return; libraryCache = []; await saveJSON('emotion-bookstore-library', libraryCache); renderShelf(); renderShelfTabs(); }; }

function renderChartOptions(nodeKey){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  const guideWrapper = document.getElementById('nextActionGuideWrapper');
  if(guideWrapper) guideWrapper.classList.add('hidden');
  if(nodeKey === 'root'){ container.innerHTML = ''; renderTextureStep(); return; }
  const node = CHAT_TREE[nodeKey]; container.innerHTML = ''; if(!node) return;
  if(node.options){
    node.options.forEach(opt=>{
      const btn = document.createElement('button'); btn.className = 'chart-btn'; btn.textContent = opt.label;
      btn.onclick = ()=>handleChartChoice(opt.label, opt.next); container.appendChild(btn);
    });
  } else if(node.shelf){
    const goBtn = document.createElement('button'); goBtn.className = 'chart-btn primary'; goBtn.textContent = '棚を見てみる'; goBtn.onclick = ()=>goToShelf(node.shelf);
    const writeBtn = document.createElement('button'); writeBtn.className = 'chart-btn'; writeBtn.textContent = 'この気持ちを綴る'; writeBtn.onclick = ()=>goToDeskWithCategory(node.shelf);
    container.appendChild(goBtn); container.appendChild(writeBtn);
  }
}

function renderSuggestionActions(shelfId){
  const container = document.getElementById('chartOptions');
  if(!container) return;
  container.innerHTML = '';
  const goBtn = document.createElement('button'); goBtn.className = 'chart-btn primary'; goBtn.textContent = '棚を見てみる'; goBtn.onclick = ()=>goToShelf(shelfId);
  const writeBtn = document.createElement('button'); writeBtn.className = 'chart-btn'; writeBtn.textContent = 'この気持ちを綴る'; writeBtn.onclick = ()=>goToDeskWithCategory(shelfId);
  container.appendChild(goBtn); container.appendChild(writeBtn);
}

function updateDeskLead(){
  const el = document.getElementById('deskLead');
  if(deskFlowFlag || counterDraftText){ el.classList.remove('hidden'); }else{ el.classList.add('hidden'); }
}
function goToDeskWithCategory(shelfId){ const sel = document.getElementById('categorySelect'); if(sel) sel.value = shelfId; deskFlowFlag = true; goToPage('desk'); renderTitleSuggest(); setTimeout(()=>{ const ta = document.getElementById('storyEventInput'); if(ta) ta.focus(); }, 400); }

async function handleChartChoice(label, nextKey){
  const container = document.getElementById('chartOptions'); if(container) container.innerHTML = '';
  appendBubble('user', label);
  const loadingBubble = document.createElement('div'); loadingBubble.className = 'bubble loading'; loadingBubble.textContent = '店主が考えています…';
  const cw = document.getElementById('chatWindow'); if(cw){ cw.appendChild(loadingBubble); cw.scrollTop = cw.scrollHeight; }
  await wait(prefs.motion ? 400 : 40);
  loadingBubble.remove();
  const node = CHAT_TREE[nextKey];
  if(!node){ renderChartOptions('root'); return; }
  if(node.options){ appendBubble('shopkeeper', '……もう少し、近いものを選んでみてください。'); renderChartOptions(nextKey); return; }
  appendBubble('shopkeeper', node.reply); renderChartOptions(nextKey);
}

function appendBubble(role, text){
  const cw = document.getElementById('chatWindow'); if(!cw) return null;
  const div = document.createElement('div'); div.className = 'bubble ' + (role === 'user' ? 'you' : 'shopkeeper');
  if(role !== 'user'){
    const name = document.createElement('span'); name.className = 'name'; name.textContent = '店主'; div.appendChild(name);
    const body = document.createElement('span'); body.textContent = text; div.appendChild(body);
  }else{ div.textContent = text; }
  cw.appendChild(div); cw.scrollTop = cw.scrollHeight; return div;
}

function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

/* --- 堅牢化：チャット送信時のエラーキャッチと確実なローディング解除 --- */
async function sendToShopkeeper(){
  const ui = document.getElementById('userInput'); const sb = document.getElementById('sendBtn'); const cw = document.getElementById('chatWindow');
  if(!ui) return; const text = ui.value.trim(); if(!text) return;
  appendBubble('user', text); counterDraftText = counterDraftText ? (counterDraftText + '\n' + text) : text;
  ui.value = ''; if(sb) sb.disabled = true; setMood(text);
  document.getElementById('earlyFreeformHint')?.classList.add('hidden');

  const loadingBubble = document.createElement('div'); loadingBubble.className = 'bubble loading'; loadingBubble.textContent = '店主が考えています…';
  if(cw){ cw.appendChild(loadingBubble); cw.scrollTop = cw.scrollHeight; }

  try {
    await wait(prefs.motion ? 600 : 60);
    const suggestedShelf = detectShelfFromText(text, 1);
    const reply = matchShopkeeperReply(text, suggestedShelf || activeCategory);
    loadingBubble.remove();
    appendBubble('shopkeeper', reply);
    
    if(suggestedShelf){ renderSuggestionActions(suggestedShelf); }else{ renderChartOptions('root'); }
  } catch (e) {
    loadingBubble.remove();
    appendBubble('shopkeeper', '……すみません、少し考え込んでしまいました。よければもう一度お話しいただけますか。');
  } finally {
    if(sb) sb.disabled = false;
  }
}

const sendBtn = document.getElementById('sendBtn');
if(sendBtn) sendBtn.onclick = sendToShopkeeper;

function renderTextureStep(){
  const box = document.getElementById('textureStep'); if(!box) return;
  box.style.display = ''; box.style.opacity = '1'; box.innerHTML = '';
  TEXTURE_GROUPS.forEach((group, i)=>{
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'texture-btn'; btn.textContent = group.label;
    btn.onclick = ()=>chooseTexture(group, btn); box.appendChild(btn);
  });
}

async function chooseTexture(group, btnEl){
  const box = document.getElementById('textureStep');
  if(box){ box.querySelectorAll('.texture-btn').forEach(b=>{ b.classList.toggle('selected', b === btnEl); b.classList.toggle('dimmed', b !== btnEl); }); }
  currentTone = group.tone; buzz(6); appendBubble('user', group.label);
  if (box) { box.style.display = 'none'; }
  await wait(prefs.motion ? 420 : 30);
  appendBubble('shopkeeper', group.keeper);
  renderEmotionChips(group);
  document.getElementById('nextActionGuideWrapper')?.classList.remove('hidden');
  document.getElementById('earlyFreeformHint')?.classList.add('hidden');
}

function renderEmotionChips(group){
  const container = document.getElementById('chartOptions'); if(!container) return; container.innerHTML = '';
  const shelves = group.shelves.filter(id=>CATEGORIES.some(c=>c.id === id));
  shelves.forEach((id)=>{
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'chart-btn shelf-chip fade-in';
    btn.textContent = shelfLabelOf(id); btn.onclick = ()=>chooseEmotionShelf(id); container.appendChild(btn);
  });
}

async function chooseEmotionShelf(shelfId){
  currentTone = NEGATIVE_SHELVES.includes(shelfId) ? 'heavy' : 'neutral'; buzz(6);
  appendBubble('user', shelfLabelOf(shelfId));
  await wait(prefs.motion ? 380 : 30);
  appendBubble('shopkeeper', `『${shelfLabelOf(shelfId)}』の棚ですね。文字を打たなくても大丈夫。そのまま棚を眺めても、一冊綴っていっても構いませんよ。`);
  renderSuggestionActions(shelfId);
  document.getElementById('nextActionGuideWrapper')?.classList.add('hidden');
}

function syncCounterDraftToDesk(){
  if(!counterDraftText) return;
  const ta = document.getElementById('storyEventInput');
  if(!ta) return;
  if(ta.value.includes(counterDraftText)) return;
  ta.value = ta.value.trim() ? (ta.value.replace(/\s+$/, '') + '\n' + counterDraftText) : counterDraftText;
  ta.dispatchEvent(new Event('input'));
}

/* --- 時間連動CSSの適用（背景色・光量） --- */
function applyTimeTheme(){
  const h = new Date().getHours();
  const root = document.documentElement;
  if (h >= 5 && h < 16) { root.setAttribute('data-time', 'morning'); }
  else if (h >= 16 && h < 19) { root.setAttribute('data-time', 'sunset'); }
  else { root.setAttribute('data-time', 'midnight'); }
}

let userProfile = { name:'', persona:'' };
function showProfileCard(){
  document.getElementById('profileOverlay').classList.remove('hidden');
  
  // 来店カードの「選択解除（トグル）」を実装
  const grid = document.getElementById('profilePersonas');
  if(!grid) return;
  let chosen = userProfile.persona || '';
  const markSelected = ()=>{ grid.querySelectorAll('.persona-chip').forEach(el=>el.classList.toggle('selected', el.dataset.personaId === chosen)); };
  
  grid.querySelectorAll('.persona-chip').forEach(btn=>{
    btn.onclick = ()=>{
      if(chosen === btn.dataset.personaId){ chosen = ''; } // トグル解除
      else{ chosen = btn.dataset.personaId; }
      markSelected();
    };
  });
  markSelected();

  document.getElementById('profileSave').onclick = async ()=>{
    userProfile.persona = chosen;
    await saveJSON('emotion-bookstore-profile', userProfile);
    document.getElementById('profileOverlay').classList.add('hidden');
    buzz(8);
  };
}

(async function init(){
  await initLanguage();
  applyTimeTheme();
  const saved = await loadJSON('emotion-bookstore-prefs', null);
  if(saved && typeof saved === 'object'){ prefs = Object.assign(prefs, saved); }
  applyPrefs();
  const savedProfile = await loadJSON('emotion-bookstore-profile', null);
  if(savedProfile && typeof savedProfile === 'object'){ userProfile = Object.assign(userProfile, savedProfile); }
  
  const hour = new Date().getHours();
  let line = (hour >= 22 || hour < 5) ? '……夜更けの来店、歓迎します。ここは誰にも見られない場所です。' : '……いらっしゃいませ。';
  document.getElementById('firstGreetingText').textContent = line + '今はどんな気分に近いですか。近いものを選んでも、下に自由に書いてもらっても構いません。';

  renderFair(); renderCategorySelect();
  libraryCache = await loadJSON('emotion-bookstore-library', []);
  renderShelfTabs(); renderShelfDisplay(); renderShelf(); updateStoryCount(); renderChartOptions('root'); renderTitleSuggest();
  restoreDraftIfAny();
})();