/* ============================================================
 * main.js — 対話ロジック・IndexedDB・番台制御など
 * 「みんなの感情書店」のロジック本体です。
 * data.js（BOOK_POOL, CATEGORIES, CHAT_TREE などのデータ）を
 * 先に読み込んだ後にこのファイルを読み込んでください。
 * <script src="data.js"></script>
 * <script src="main.js"></script>
 * ============================================================ */

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

/* 楽天トラベルの検索URLを、rakutenSearchUrlと同じID付与方式で生成する */
function rakutenTravelSearchUrl(query){
  const target = 'https://travel.rakuten.co.jp/dsearch/?f_keyword=' + encodeURIComponent(query) + '&f_hi_item=1';
  if(RAKUTEN_AFFILIATE_ID){
    return 'https://hb.afl.rakuten.co.jp/hgc/' + RAKUTEN_AFFILIATE_ID + '/?pc=' + encodeURIComponent(target) + '&m=' + encodeURIComponent(target);
  }
  return target;
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
let activeCategory = (CATEGORIES && CATEGORIES.length) ? CATEGORIES[0].id : 'moya';
let libraryCache = [];

/* ---------- 番台：脱・言語化の2ステップUI ---------- */
const TEXTURE_GROUPS = [
  {
    id:'sink',
    label:'心が重く沈んでいる、気分が落ち込んでいる（静かな憂鬱）',
    keeper:'少しお疲れのようですね。このあたりの棚に、今の心に寄り添う本があるかもしれません。',
    shelves:['moya','kodoku','gakkari','hazukashii','ushirometai'],
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
const NEGATIVE_SHELVES = ['moya','ushirometai','kuyashii','kodoku','aseri','shitto','hazukashii','gakkari'];

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
  { persona:'jobhunter',    patterns:['就活','面接','エントリーシート','ES','説明会','内定','選考','企業研究','ガクチカ','自己PR','GD','グループディスカッション','1次面接','最終面接','お祈りメール','サイレント','早期選考','リクナビ','マイナビ','就活生','インターン','27卒','28卒'] },
  { persona:'student',      patterns:['学校','授業','宿題','部活','テスト','受験','クラス','先生','高校','大学','中学','課題','レポート','単位','留年','サークル','ゼミ','中間テスト','期末テスト','学祭','文化祭','通学','塾','コミュ障'] },
  { persona:'mother',       patterns:['育児','ワンオペ','子ども','子供','ママ友','保育園','夜泣き','旦那','離乳食','幼稚園','保活','イヤイヤ期','トイトレ','ワンオペ育児','おむつ','小1の壁','送迎','発熱','愚痴','夫','寝かしつけ'] },
  { persona:'career_woman', patterns:['キャリア','女性として','管理職','女子会','産休','昇進','育休','ワーママ','両立','独身','キャリアアップ','役職','アラサー','ライフステージ','ライフイベント','ガラスの天井','お局'] },
  { persona:'young_worker', patterns:['新卒','入社','新人','若手','社会人1年目','社会人２年目','社会人3年目','第二新卒','研修','配属','OJT','五月病','電話対応','ビジネスマナー','怒られた','ミスした','覚えること多すぎ'] },
  { persona:'middle_worker',patterns:['部下','上司','板挟み','マネージャー','中間管理職','後輩指導','後輩','マネジメント','評価','面談','板挟み','愚痴','承認','決裁','パワハラ','チーム','プレイングマネージャー','管理職'] },
  { persona:'romance',      patterns:['彼氏','彼女','恋人','失恋','片思い','浮気','デート','LINEの返信','既読無視','未読無視','マッチングアプリ','メンヘラ','恋活','婚活','脈あり','脈なし','好きな人','同棲','破局'] },
  { persona:'creater',      patterns:['創作','絵師','小説','同人','締め切り','イラスト','原稿','クリエイター','二次創作','一次創作','ネーム','下書き','進捗','アクキー','即売会','コミケ','イベント','インプ数','フォロワー','神絵師'] },
  { persona:'resting',      patterns:['無職','休職','退職','ニート','療養中','休養中','引きこもり','自宅療養','うつ病','適応障害','退職代行','傷病手当','自己都合','有給消化','ニート生活','働きたくない','履歴書の空白'] },
  { persona:'sensitive',    patterns:['繊細','HSP','敏感','眠れない','深夜','夜中','生きづらい','疲れやすい','気にしすぎ','自己嫌悪','メンタル','気疲れ','考えすぎる','不安','不眠','ネガティブ','生きづらさ','繊細さん'] }
];

function detectCounselingPersona(text){
  for(const t of PERSONA_TRIGGERS){
    if(t.patterns.some(p=>text.includes(p))) return t.persona;
  }
  return 'young_worker'; // 最も汎用性の高いデフォルト
}

const STATE_TRIGGERS = [
  { state:'menbure',  patterns:['メンブレ','限界','崩れ','折れ','涙が止まらない','壊れそう','パニック','無理','しんどい','しにそう','辛い','つらい','泣きそう','号泣','病み散らか','精神崩壊','メンタル崩壊','キャパ崩壊','病み期','ボロボロ','ズタズタ'] },
  { state:'kagiaka',  patterns:['鍵垢','裏アカ','本音','誰にも言えない','言えない本音','愚痴','吐き出し','愚痴垢','吐き捨てる','秘密','誰も分かってくれない','ここだけの話','隠し事','建前','偽り','本当の気持ち','誰にも見せない','内緒','壁打ち'] },
  { state:'capaover', patterns:['キャパオーバー','キャパ超え','溢れ','パンク','抱えきれ','多すぎ','予定詰まり','手につかない','パツパツ','いっぱいいっぱい','タスク過多','頭が回らない','パンクしそう','余裕がない','スケジュール帳真っ黒','パンパン','終わらない','手遅れ','追いつかない'] },
  { state:'darui',    patterns:['だるい','めんどくさい','やる気が出ない','動けない','サボり','サボる','何もしたくない','布団から出られない','ベッドから出られない','やる気ゼロ','無気力','ダルい','モチベ皆無','モチベーション低下','後回し','サボりたい','だるすぎる','おやすみ','休みたい'] },
  { state:'oshi',     patterns:['推し','担当','箱推し','ライブ','担降り','布教','推し活','尊い','アクスタ','自引','グッズ','推し事','現場','チケ発','当選','落選','神席','遠征','限界オタク','推し尊い','解釈一致','オタ活','ファンサ'] },
  { state:'yami',     patterns:['病んで','病む','消えたい','真っ暗','どん底','孤独','苦しい','消えちゃいたい','逃げたい','暗闇','底に沈む','一人ぼっち','ひとりぼっち','息ができない','胸が痛い','辛すぎる','拒絶','誰もいない','闇','ネガティブ','闇堕ち'] }
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

const HEAVY_WORDS = ['つら','しんど','悲し','泣','苦し','不安','怖','孤独','疲れ','嫌','無理','だる',
                     'ダル','メンブレ','限界','崩れ','折れ','病ん','病む','辛','ツラ','キツ','きつ','痛',
                     '重','暗','怒','イラ','むかつ','ムカつ','うざ','ウザ','うつ','鬱','ダメ','だめ','駄目',
                     '逃げ','拒絶','焦','迷','困','悩','ヘコ','凹','沈','震','怯','寂','さびし','サビシ','虚し',
                     'むなし','悔し','くやし','情けな','惨め','みじめ','最悪','どん底','絶望','パニック','パンク',
                     '一杯一杯','いっぱいいっぱい','余裕な','終わった','オワタ','おわた','しにそう','死にそう',
                     '死にたい','タヒ','キショ','きしょ','グロ','しんどい','つまら','つまん','飽き','冷め','呆れ',
                     'ボロボロ','ぼろぼろ','ズタズタ','ずたずた','ガタガタ','がたがた','ヘトヘト','へとへと','トホホ''消え'];
const BRIGHT_WORDS = ['嬉し','楽し','わくわく','ワクワク','好き','幸','尊','たっと','愛','好','推し','おし','オシ','ヤバ',
                      'やば','神','天才','優秀','勝った','勝訴','歓喜','感謝','ありがと','アリガト','サンキュー','あざす',
                      'ぴかぴか','キラキラ','きらきら','ギラギラ','ギラつ','ノリノリ','のりのり','アゲアゲ','あげあげ','アツい',
                      'あつい','熱い','エモ','えも','エモい','涙目（嬉','泣（嬉','泣ける（良','大満足','完璧','カンペキ','かんぺき',
                      '最強','無敵','優勝','ハッピー','はっぴー','ピース','ぴーす','いいね','イイネ','グッド','ぐっど''誇ら','最高'];
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
  if(id === 'desk') syncCounterDraftToDesk();
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
  box.innerHTML = `
    <p class="detour-heading">寄り道（今日のあなたへ）</p>
    <div class="detour-cards">
      ${items.map(it=>{
        const url = detourUrlFor(it);
        return `<div class="detour-card detour-tier-${it.tier}">
          <span class="detour-tier-badge">${tierLabel[it.tier] || it.tier}</span>
          <p class="detour-name">${it.name}</p>
          <p class="detour-desc">${it.description}</p>
          <a class="detour-link" href="${url}" target="_blank" rel="noopener sponsored">見てみる →</a>
        </div>`;
      }).join('')}
    </div>`;
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
          <p class="recommend-subtext">読むための本というより、この気持ちのお守りになる一冊です（今月は${unlockedWaveCount()}/${MAX_WAVE}段階まで棚が開いています）</p>
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
    const playlist = PINNED_SONGS[cat.id];
    let musicHtml;
    if(playlist && playlist.length){
      const items = playlist.map(song=>{
        const q3 = song.title + ' ' + song.artist;
        const amUrl = amazonSearchUrl(q3 + ' 音楽');
        const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q3);
        const spUrl = 'https://open.spotify.com/search/' + encodeURIComponent(q3);
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
      const mq = MUSIC_QUERIES[cat.id];
      let musicUrl, musicLinkLabel;
      if(Array.isArray(mq) && mq.length){
        const pick = mq[Math.floor(Math.random()*mq.length)];
        const q4 = pick.title + ' ' + pick.artist;
        musicUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q4);
        musicLinkLabel = `🎵 『${pick.title}』${pick.artist} — ${pick.comment || ''}`;
      }else{
        const fallbackQuery = cat.label + ' 邦楽 プレイリスト';
        musicUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(fallbackQuery);
        musicLinkLabel = '🎵 YouTubeでBGMを探す';
      }
      musicHtml = `<div class="music-row"><a class="music-link" href="${musicUrl}" target="_blank" rel="noopener">${musicLinkLabel}</a></div>`;
    }
    const myEntries = libraryCache.filter(e=>e.category===cat.id);
    const myEpisodesHtml = myEntries.map(entry=>
      `<div class="episode-card mine" data-entry-id="${entry.id}"><span class="who mine-who">あなたの物語${entry.tweetUrl ? ' 🐦' : ''}</span>『${entry.title}』${entry.story.length > 60 ? entry.story.slice(0,60) + '…' : entry.story}</div>`
    ).join('');
    const storyPool = STORIES_POOL[cat.id] || [];
    const shuffledStories = shuffleArray(storyPool).slice(0, 3);
    const sampleEpisodesHtml = shuffledStories.map(s=>`<div class="episode-card"><span class="who">${s.author || '名もなき誰かの物語'}</span>${s.text}</div>`).join('');
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

/* ★推薦状（item 5）：ここは店主の支援的な言葉＋棚への簡単な導線のみ。
   商品・Amazon・楽天・アフィリエイトの要素は一切含めない。
   商品要素は renderDetourSection（棚ページの「寄り道」セクション）に完全移設済み。 */
function showInvitation(catId){
  const inv = INVITES[catId];
  if(!inv) return;
  const t = document.getElementById('invTitle');
  if(t) t.textContent = inv.t;
  const b = document.getElementById('invBody');
  if(b) b.textContent = inv.b;
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
    const title = (tInput ? tInput.value.trim() : '') || generateTitle(chosenId);
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
  if(Math.random() < 0.35){
    const flavor = counselingFlavorReply(text, fallbackShelfId);
    if(flavor) return flavor;
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
  const scrollToBottom = () => {
    if(cw) cw.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block: 'end' });
  };
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

  const container = document.getElementById('chartOptions');
  if(container){
    setTimeout(() => {
      container.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block: 'center' });
    }, prefs.motion ? 300 : 50);
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

  const container = document.getElementById('chartOptions');
  if(container){
    setTimeout(() => {
      container.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block: 'center' });
    }, prefs.motion ? 200 : 20);
  }
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

  const container = document.getElementById('chartOptions');
  if(container){
    setTimeout(() => {
      container.scrollIntoView({ behavior: prefs.motion ? 'smooth' : 'auto', block: 'center' });
    }, prefs.motion ? 200 : 20);
  }
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

const EMOTION_GRADIENTS = {
  moya:['#5C6B8A','#2E3A5C'], kodoku:['#3E4A6B','#1E2440'], gakkari:['#8A7A6B','#4A4038'],
  hazukashii:['#D8909B','#8A4A5C'], ushirometai:['#6B5C7A','#3A3048'], aseri:['#C97F5A','#7A3E2E'],
  kuyashii:['#A85C5C','#5C2E2E'], shitto:['#5C7A5C','#2E402E'], akogare:['#7FA8C9','#3E5C8A'],
  wakuwaku:['#F0C060','#C97F3D'], ando:['#A8C9A0','#5C8A6B'], kansha:['#E8B87F','#B7791F'],
  itooshii:['#E8A0B0','#C96B8A'], hokorashii:['#C9A85C','#8A6B2E'], natsukashii:['#D8B48A','#8A6B4A']
};

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
  let keeperWords = (cachedShiori && cachedShiori.text)
    ? cachedShiori.text
    : ((latest && latest.note) ? latest.note : '今日も、自分の気持ちに名前をあげられましたね。');
  if(keeperWords.length > 96) keeperWords = keeperWords.slice(0, 95) + '…';
  const photo = (latest && latest.image) ? await loadImageFromDataUrl(latest.image) : null;

  const hour = new Date().getHours();
  const pair = (latest && EMOTION_GRADIENTS[latest.category])
    || ((hour >= 17 || hour < 5) ? ['#8A5C6B','#1E2440'] : ['#E8C9A0','#C97F8A']);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, pair[0]);
  grad.addColorStop(1, pair[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if(photo){
    try{
      ctx.save();
      ctx.filter = 'blur(42px) brightness(0.55)';
      drawImageCover(ctx, photo, -60, -60, W + 120, H + 120);
      ctx.restore();
    }catch(e){}
    ctx.fillStyle = 'rgba(20,14,20,0.35)';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = 'rgba(255,245,220,0.20)';
  for(let i = 0; i < 26; i++){
    const px = (i * 137) % W, py = (i * 263) % H, pr = 2 + (i % 3);
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,249,236,0.92)';
  ctx.font = '600 30px ' + MINCHO;
  ctx.fillText('EMOTIONAL BINDERY & BOOKSHOP', W / 2, 150);
  ctx.font = '700 46px ' + MINCHO;
  ctx.fillText('みんなの感情書店', W / 2, 215);

  const cardW = 800, cardX = (W - cardW) / 2, cardY = 330, pad = 56;
  const photoSize = cardW - pad * 2;
  ctx.font = '400 38px ' + MINCHO;
  const wordLines = wrapTextLines(ctx, keeperWords, photoSize - 20).slice(0, 7);
  const cardH = pad + photoSize + 70 + 60 + wordLines.length * 62 + 120;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#FFFDF6';
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 10);
  ctx.fill();
  ctx.restore();

  const pX = cardX + pad, pY = cardY + pad;
  if(photo){
    ctx.save();
    roundRectPath(ctx, pX, pY, photoSize, photoSize, 6);
    ctx.clip();
    drawImageCover(ctx, photo, pX, pY, photoSize, photoSize);
    ctx.restore();
  }else{
    const g2 = ctx.createLinearGradient(pX, pY, pX, pY + photoSize);
    g2.addColorStop(0, pair[0]);
    g2.addColorStop(1, pair[1]);
    ctx.fillStyle = g2;
    roundRectPath(ctx, pX, pY, photoSize, photoSize, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,249,236,0.85)';
    ctx.setLineDash([12, 9]);
    ctx.lineWidth = 3;
    ctx.strokeRect(pX + 30, pY + 30, photoSize - 60, photoSize - 60);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,249,236,0.95)';
    ctx.font = '600 46px ' + MINCHO;
    ctx.fillText('栞', pX + photoSize / 2, pY + photoSize / 2 - 40);
    ctx.font = '400 30px ' + MINCHO;
    ctx.fillText('— 店主より —', pX + photoSize / 2, pY + photoSize / 2 + 30);
    ctx.fillText(`蔵書 ${libraryCache.length}冊の本棚`, pX + photoSize / 2, pY + photoSize / 2 + 90);
  }

  const titleText = latest ? ('『' + latest.title + '』') : '『これからの一冊』';
  ctx.fillStyle = '#3A2E22';
  ctx.font = '700 46px ' + MINCHO;
  ctx.fillText(titleText, W / 2, pY + photoSize + 85);
  const d = (latest && latest.date) ? new Date(latest.date) : new Date();
  ctx.fillStyle = '#8A7A5C';
  ctx.font = '400 30px ' + MINCHO;
  ctx.fillText(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`, W / 2, pY + photoSize + 140);

  ctx.fillStyle = '#4A3B2C';
  ctx.font = '400 38px ' + MINCHO;
  let ty = pY + photoSize + 225;
  for(const line of wordLines){
    ctx.fillText(line, W / 2, ty);
    ty += 62;
  }

  ctx.fillStyle = 'rgba(255,249,236,0.85)';
  ctx.font = '400 28px ' + MINCHO;
  ctx.fillText('名もなき気持ちに、名前をあげる。', W / 2, H - 140);
  ctx.font = '400 24px ' + MINCHO;
  ctx.fillText('みんなの感情書店', W / 2, H - 90);

  return canvas;
}

const BACKUP_KEYS = [
  'emotion-bookstore-library',
  PURIFY_LOG_KEY,
  'emotion-bookstore-shiori',
  'emotion-bookstore-prefs',
  'emotion-bookstore-milestones',
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

(async function init(){
  applySeasonalAccent();
  applyNightModeIfNeeded();
  restoreDraftIfAny();
  ensureBackToTopButton();
  const greetingEl = document.getElementById('firstGreetingText');
  if(greetingEl){
    const hour = new Date().getHours();
    let line;
    if(hour >= 22 || hour < 5){
      line = MIDNIGHT_GREETINGS[Math.floor(Math.random()*MIDNIGHT_GREETINGS.length)];
    }else{
      let bucket;
      if(hour >= 5 && hour < 11) bucket = TIME_GREETINGS.morning;
      else if(hour >= 11 && hour < 17) bucket = TIME_GREETINGS.day;
      else bucket = TIME_GREETINGS.evening;
      if(!bucket || !bucket.length) bucket = TIME_GREETINGS.day;
      line = bucket[Math.floor(Math.random()*bucket.length)] + '近いものを選んでも、下に自由に書いてもらっても構いません。';
    }
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
