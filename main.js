ら', artist:'荒井由実' },
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
    setTimeout(()=>{ backupBtn.textContent = '🔑 本棚の鍵を更新する（全データ保存）'; }, 2500);
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

(async function init(){
  applySeasonalAccent();
  applyNightModeIfNeeded();
  restoreDraftIfAny();
  const greetingEl = document.getElementById('firstGreetingText');
  if(greetingEl){
    const hour = new Date().getHours();
    let line;
    if(hour >= 22 || hour < 5){
      line = MIDNIGHT_GREETINGS[Math.floor(Math.random()*MIDNIGHT_GREETINGS.length)];
    }else{
      line = GREETING_LINES[Math.floor(Math.random()*GREETING_LINES.length)] + '近いものを選んでも、下に自由に書いてもらっても構いません。';
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
})();