// RC3 CounterAtmosphere 受入テスト。
// 番台の店主ビジュアルを、人物ピクトグラム（丸い頭・四角い本・台形の胴体）から、
// 人物を描かない静物（木の番台・小さな卓上ランプ・開かれた帳面・栞）へ差し替えた
// ことを検証する。ご指定の15項目のうち、1〜13をこのファイルで直接検証する。
// 14（Daypartの74件）・15（RC2のページ切替削除テスト26件）は、既存の専用ファイル
// （smoke_test_weather_prototype1.js / smoke_test_daypart1_rc2_pageturn.js）が
// 全回帰テストの一部としてそのまま実行されることで満たされる（本ファイルでは重複させない）。
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
  window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.scrollTo=function(){};
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';
  const gtagCalls = [];
  window.gtag = function(){ gtagCalls.push(Array.from(arguments)); };
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  const s1=document.createElement('script');s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');document.body.appendChild(s1);
  const s2=document.createElement('script');s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');document.body.appendChild(s2);
  await new Promise(r=>setTimeout(r,300));await new Promise(r=>setTimeout(r,300));
  const langBtn=document.getElementById('langToggle');
  const toggleByButton=()=>langBtn.dispatchEvent(new window.Event('click',{bubbles:true}));
  return {window,document,toggleByButton,gtagCalls};
}

async function main(){

  // ===== 1) 公開番台に人物の頭・顔・身体を表す旧SVGが存在しない =====
  {
    const { document } = await createEnv({});
    const svg = document.querySelector('.keeper-vignette svg');
    ok('(1) #keeperFigure (old person wrapper) no longer exists', document.getElementById('keeperFigure') === null);
    ok('(1) no element with the old "keeper" class exists', document.querySelectorAll('.keeper').length === 0);
    ok('(1) no element with class "head" (old person head) exists inside the vignette', svg.querySelectorAll('.head').length === 0);
    ok('(1) no element with class "book" as a person-holding prop (old scheme) exists', svg.querySelectorAll('g.book').length === 0);
    // 旧デザインは胴体をpathの塗りつぶし(var(--ink))で表現していた。人物の胴体を示す
    // 大きな単色fill=var(--ink)のpathが残っていないことも確認する。
    const inkFills = Array.from(svg.querySelectorAll('path')).filter(p=>(p.getAttribute('fill')||'') === 'var(--ink)');
    ok('(1) no path still fills with var(--ink) as a person silhouette', inkFills.length === 0);
  }

  // ===== 2) 新しい静物ビジュアルに、番台・ランプ・帳面の構造が存在する =====
  {
    const { document } = await createEnv({});
    const svg = document.querySelector('.keeper-vignette svg');
    ok('(2) the wooden counter still-life group exists', svg.querySelectorAll('.counter-desk-still').length === 1);
    ok('(2) the lamp still-life group exists', svg.querySelectorAll('.counter-lamp-still').length === 1);
    ok('(2) the open ledger still-life group exists', svg.querySelectorAll('.counter-ledger-still').length === 1);
    const desk = svg.querySelector('.counter-desk-still');
    const lamp = svg.querySelector('.counter-lamp-still');
    const ledger = svg.querySelector('.counter-ledger-still');
    ok('(2) the counter still-life has visible fill shapes (not an empty group)',
      !!desk && desk.querySelectorAll('path').length >= 2);
    ok('(2) the lamp still-life has a shade and a stem (not just a circle)',
      !!lamp && lamp.querySelectorAll('path, rect').length >= 2);
    ok('(2) the ledger still-life has two page shapes plus a spine line',
      !!ledger && ledger.querySelectorAll('path').length >= 3);
  }

  // ===== 3) 新しいSVGがaria-hidden="true"である =====
  {
    const { document } = await createEnv({});
    const svg = document.querySelector('.keeper-vignette svg');
    ok('(3) the decorative SVG has aria-hidden="true"', svg.getAttribute('aria-hidden') === 'true');
    ok('(3) the decorative SVG has focusable="false"', svg.getAttribute('focusable') === 'false');
    ok('(3) the wrapping div also keeps aria-hidden="true" (unchanged from before)',
      document.querySelector('.keeper-vignette').getAttribute('aria-hidden') === 'true');
  }

  // ===== 4) 外部画像や外部URLを追加していない =====
  {
    const svgHtml = (()=>{
      const html = fs.readFileSync(path.join(SRC,'index.html'),'utf-8');
      const m = html.match(/<div class="keeper-vignette"[^>]*>[\s\S]*?<\/div>\s*(?=<details)/);
      return m ? m[0] : '';
    })();
    ok('(4) no <img> tag inside the counter vignette', !/<img[\s>]/i.test(svgHtml));
    ok('(4) no <image> (raster-embedding) tag inside the SVG', !/<image[\s>]/i.test(svgHtml));
    // xmlns="http://www.w3.org/2000/svg" は名前空間宣言であり外部リソース読み込みではないため除外する
    const withoutNamespace = svgHtml.replace(/xmlns(:\w+)?="https?:\/\/[^"]*"/g, '');
    ok('(4) no external URL (http/https) referenced inside the vignette markup (namespace declarations excluded)', !/https?:\/\//.test(withoutNamespace));
    ok('(4) no reference to a new external asset file (png/jpg/webp/svg file) inside the vignette', !/\.(png|jpe?g|webp)["'\s]/i.test(svgHtml) && !/href=["'][^"']+\.svg["']/i.test(svgHtml));
  }

  // ===== 5) 番台ビジュアルにanimation、@keyframes、タイマーがない =====
  {
    const css = fs.readFileSync(path.join(SRC,'style.css'),'utf-8');
    // 今回追加した番台関連ルールだけを対象に抜き出して検査する
    const startMarker = '/* ★RC3 CounterAtmosphere：人物ピクトグラム';
    const idx = css.indexOf(startMarker);
    ok('(5) the RC3 counter-atmosphere CSS block is present', idx !== -1);
    // .counter-note 〜 .counter-greeting の範囲、および人物頷き廃止コメントの周辺を対象にする
    const noteBlockStart = css.indexOf('.counter-note{');
    const noteBlockEnd = css.indexOf('.counter-shelf-return-note{');
    const noteBlock = (noteBlockStart !== -1 && noteBlockEnd !== -1) ? css.slice(noteBlockStart, noteBlockEnd) : '';
    ok('(5) the note-card CSS block was located for inspection', noteBlock.length > 0);
    ok('(5) no @keyframes in the note-card CSS block', !/@keyframes/.test(noteBlock));
    ok('(5) no "animation:" property in the note-card CSS block', !/animation\s*:/.test(noteBlock));
    const retiredBlockStart = idx;
    const retiredBlockEnd = css.indexOf('.chat-window{');
    const retiredBlock = (retiredBlockStart !== -1 && retiredBlockEnd !== -1) ? css.slice(retiredBlockStart, retiredBlockEnd) : '';
    ok('(5) the retired keeper-listening comment block contains no live @keyframes/animation declarations',
      !/@keyframes\s+\w/.test(retiredBlock.replace(/\/\*[\s\S]*?\*\//g,'')) &&
      !/animation\s*:\s*\w/.test(retiredBlock.replace(/\/\*[\s\S]*?\*\//g,'')));
    // main.js側：新規追加分（counterNoteLabel関連）にsetInterval/requestAnimationFrameが無いこと
    const mainjs = fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    ok('(5) main.js has no new setInterval call introduced for the counter visual', !/setInterval\(/.test(mainjs) || (mainjs.match(/setInterval\(/g)||[]).length === 0);
  }

  // ===== 6) counterGreetingのID・文章・i18n属性が維持されている =====
  {
    const { document } = await createEnv({});
    const greeting = document.getElementById('counterGreeting');
    ok('(6) #counterGreeting still exists', !!greeting);
    ok('(6) #counterGreeting keeps its data-i18n attribute', greeting.getAttribute('data-i18n') === 'counterGreetingUnified');
    ok('(6) #counterGreeting text is unchanged (JA)', greeting.textContent === 'こんばんは。まだ名前のつかない気持ちも、そのままで大丈夫です。今は、どんな手触りですか。');
    ok('(6) #counterGreeting is not styled as a chat bubble (no .bubble class)', !greeting.classList.contains('bubble'));
    const note = document.querySelector('.counter-note');
    ok('(6) the new note wrapper exists around the greeting', !!note && note.contains(greeting));
  }

  // ===== 7) 日本語と英語の切替で挨拶文が正常に切り替わる =====
  {
    const { document, toggleByButton, window } = await createEnv({});
    toggleByButton();
    ok('(7) switched to English mode', window.currentLang() === 'en');
    const greetingEn = document.getElementById('counterGreeting').textContent;
    ok('(7) EN greeting matches the existing English copy',
      greetingEn === 'Good evening. Feelings that don’t have a name yet are fine just as they are. What does it feel like right now?');
    const labelEn = document.querySelector('.counter-note-label').textContent;
    ok('(7) EN note label is translated', labelEn === 'A Note from the Shopkeeper');
    toggleByButton();
    ok('(7) switched back to Japanese mode', window.currentLang() === 'ja');
    const greetingJa = document.getElementById('counterGreeting').textContent;
    ok('(7) JA greeting is restored exactly', greetingJa === 'こんばんは。まだ名前のつかない気持ちも、そのままで大丈夫です。今は、どんな手触りですか。');
  }

  // ===== 8) 名札を追加した場合、日英で正しく切り替わる =====
  {
    const { document } = await createEnv({});
    const nameplate = document.querySelector('.keeper-nameplate');
    if(nameplate){
      ok('(8) the nameplate has a data-i18n attribute (uses the standard i18n mechanism)', nameplate.hasAttribute('data-i18n'));
    }else{
      // 今回は「帳面・ランプ・番台・栞」のみで構成し、名札は追加していない
      // （視覚的な過密を避けるための、ご指示どおりの選択）。追加していないこと自体は
      // 不具合ではないため、判定はスキップ扱いのPASSとする。
      ok('(8) no nameplate was added this round (allowed fallback per spec; desk+lamp+ledger+bookmark only)', true);
    }
  }

  // ===== 9) counterShelfGroupsが従来どおり表示される =====
  {
    const { window, document } = await createEnv({});
    window.renderCounterShelfGuideRoot();
    const box = document.getElementById('counterShelfGroups');
    const buttons = box.querySelectorAll('button');
    ok('(9) counterShelfGroups renders its usual button set (group choices + "other")', buttons.length >= 5);
    ok('(9) the "write without choosing" button is unaffected and still present separately',
      !!document.getElementById('counterWriteWithoutChoosing'));
  }

  // ===== 10) 「まだ決めずに書く」が従来どおり動作する =====
  {
    const { window, document } = await createEnv({});
    window.initCounterShelfGuide();
    const writeBtn = document.getElementById('counterWriteWithoutChoosing');
    ok('(10) the write-without-choosing button exists and is wired', typeof writeBtn.onclick === 'function');
    writeBtn.click();
    await new Promise(r=>setTimeout(r,50));
    ok('(10) clicking it navigates to the writing desk (#desk becomes active)',
      document.getElementById('desk').classList.contains('is-active'));
  }

  // ===== 11) 旧chatWindowが公開画面では非表示のまま =====
  {
    const { document } = await createEnv({});
    const cw = document.getElementById('chatWindow');
    ok('(11) #chatWindow still exists in the DOM (not deleted, compatibility preserved)', !!cw);
    ok('(11) #chatWindow still carries the hidden attribute', cw.hasAttribute('hidden'));
    ok('(11) #chatWindow still carries the .hidden class', cw.classList.contains('hidden'));
    ok('(11) #firstGreeting (old bubble) is untouched inside it', !!document.getElementById('firstGreeting'));
  }

  // ===== 12) 保存キー・スキーマに変更がない =====
  {
    const seed = [{ id:'x1', title:'t', story:'s', category:'kanashii', date:'2026-07-20T00:00:00.000Z' }];
    const { window, document } = await createEnv({ seedLibrary: seed });
    const raw = window.localStorage.getItem('emotion-bookstore-library');
    ok('(12) the existing save key "emotion-bookstore-library" still round-trips seeded data', !!raw && JSON.parse(raw).data.length === 1);
    const mainjs = fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    const noteAdditionIdx = mainjs.indexOf('counterNoteLabel: "店主のことば"');
    ok('(12) the counterNoteLabel i18n addition itself contains no save-key/localStorage code', (()=>{
      const around = mainjs.slice(Math.max(0,noteAdditionIdx-200), noteAdditionIdx+200);
      return !/localStorage|saveJSON|loadJSON/.test(around);
    })());
  }

  // ===== 13) GA4イベントに変更がない =====
  {
    const { window, document, gtagCalls } = await createEnv({});
    window.goToPage('shelves');
    await new Promise(r=>setTimeout(r,50));
    const viewShelfCalls = gtagCalls.filter(c=>c[0]==='event' && c[1]==='view_shelf');
    ok('(13) view_shelf still fires exactly once on first entry to shelves (unaffected by the counter redesign)', viewShelfCalls.length === 1);
    window.goToPage('counter');
    await new Promise(r=>setTimeout(r,50));
    const anyCounterEvent = gtagCalls.filter(c=>c[0]==='event' && String(c[1]).toLowerCase().includes('counter'));
    ok('(13) no new GA4 event was introduced for the counter still-life redesign', anyCounterEvent.length === 0);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e=>{ console.error('RC3 COUNTER ATMOSPHERE TEST CRASHED:', e); process.exit(2); });
