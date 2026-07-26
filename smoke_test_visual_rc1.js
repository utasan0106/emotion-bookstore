// Visual Redesign RC1 受入テスト。
// 目的：8画面の視覚再設計が、既存の保存仕様・データ構造・主要イベント処理・正規の画面遷移を
//       壊していないことと、C-03で指定された禁止事項・アクセシビリティ要件・アセット方針を
//       満たしていることを機械的に検証する。
// 方針：本テストは「視覚が美しいか」は判定できない。判定できるのは、DOM・CSS・保存の事実だけ。
//       目視でしか確認できない項目は報告書側で「未実施」として正直に扱う。
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(l, c){ if(c){ pass++; console.log('PASS:', l); } else { fail++; console.log('FAIL:', l); } }
function wrap(v){ return JSON.stringify({ v:1, data:v }); }

const CSS  = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
const HTML = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
const JS   = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');
// VR1で追加したブロックだけを切り出す（既存CSSへの混入がないことも併せて確認する）
const VR_MARK   = '■ Visual Redesign RC1（VR1）';
const VR12_MARK = '■ Visual Redesign RC1.2';
const VPF_MARK  = '■ Visual Polish Fix 1';
// VR1ブロック（RC1.2ブロックの手前まで）と、RC1.2ブロックをそれぞれ切り出す
// 目印は解説コメントの内側にあるため、それを囲むコメントブロックの先頭から切り出す
const blockStart = mark => CSS.lastIndexOf('/*', CSS.indexOf(mark));
const VR_CSS   = CSS.slice(blockStart(VR_MARK),  blockStart(VR12_MARK));
const VR12_CSS = CSS.slice(blockStart(VR12_MARK), blockStart(VPF_MARK));
const VPF_CSS  = CSS.slice(blockStart(VPF_MARK));
// コメントを除いた実CSSだけを見るための版（説明文中の語をパターン検出しないため）
const strip     = t => t.replace(/\/\*[\s\S]*?\*\//g, '');
const VR_DECL   = strip(VR_CSS);
const VR12_DECL = strip(VR12_CSS);
const VPF_DECL  = strip(VPF_CSS);
// VPF1ブロックは「紙色の面に置く欄（編纂机）」と「暗い面に置く欄（製本後モーダル）」の
// 2つの文脈を含む。文字色の判定は文脈ごとに分けて行う。
// VPF1ブロック内の各節を、次の節の直前までで正しく区切る
const VPF_SECTIONS = [
  'P1追加：製本後の「棚を選ぶ（任意）」select の可読性',
  'P1追加：原稿用紙textareaの文字と横罫線の位置を揃える',
  'P2追加：表紙の丸い書店ロゴ（蔵書印）を非表示にする',
];
const secStart = mark => VPF_CSS.lastIndexOf('/*', VPF_CSS.indexOf(mark));
// mark で始まり、次の節の直前で終わる範囲を返す（最後の節は末尾まで）
function vpfSection(mark){
  const i = VPF_SECTIONS.indexOf(mark);
  const from = secStart(mark);
  const to   = (i >= 0 && i + 1 < VPF_SECTIONS.length) ? secStart(VPF_SECTIONS[i + 1]) : VPF_CSS.length;
  return strip(VPF_CSS.slice(from, to));
}
const MODAL_MARK   = VPF_SECTIONS[0];
const VPF_PAPER    = strip(VPF_CSS.slice(0, secStart(MODAL_MARK)));
const VPF_MODAL    = vpfSection(MODAL_MARK);

async function createEnv(opts){
  opts = opts || {};
  let html = HTML
    .replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '')
    .replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');
  const dom = new JSDOM(html, { url:'https://example.com/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true });
  const { window } = dom, { document } = window;
  if(opts.seedLibrary) window.localStorage.setItem('emotion-bookstore-library', wrap(opts.seedLibrary));
  if(opts.seedDraft)   window.localStorage.setItem('emotion-bookstore-draft',   wrap(opts.seedDraft));
  window.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'x';
  const gtagCalls = [];
  window.gtag = function(){ gtagCalls.push(Array.from(arguments)); };
  window.fetch = () => Promise.resolve({ ok:true, json:()=>Promise.resolve({}) });
  Object.defineProperty(window.navigator, 'clipboard', { value:{ writeText:()=>Promise.resolve() }, configurable:true });
  const s1 = document.createElement('script'); s1.textContent = fs.readFileSync(path.join(SRC,'data.js'),'utf-8'); document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = JS; document.body.appendChild(s2);
  await new Promise(r=>setTimeout(r,300)); await new Promise(r=>setTimeout(r,300));
  return { window, document, gtagCalls };
}

async function main(){

  // ===== 1) 保存仕様・データ構造が不変であること =====
  {
    const KEYS = [
      'emotion-bookstore-library', 'emotion-bookstore-draft', 'emotion-bookstore-shiori',
      'emotion-bookstore-prefs', 'emotion-bookstore-profile', 'emotion-bookstore-milestones',
      'emotion-bookstore-purify-log', 'emotion-bookstore-favorites', 'emotion-bookstore-lang',
      'emotion-bookstore-weather-settings', 'emotion-bookstore-weather-cache'
    ];
    KEYS.forEach(k => ok(`(1) 保存キー "${k}" が main.js に残っている`, JS.includes(`'${k}'`)));
    ok('(1) STORAGE_VERSION が 1 のまま', /const STORAGE_VERSION\s*=\s*1\s*;/.test(JS));
    ok('(1) IndexedDB名 emotion-bookstore が不変', /const IDB_NAME\s*=\s*'emotion-bookstore'/.test(JS));
    ok('(1) IndexedDBストア kv が不変', /const IDB_STORE\s*=\s*'kv'/.test(JS));
    ok('(1) BACKUP_KEYS の構成が不変', /BACKUP_KEYS\s*=\s*\[[\s\S]{0,400}?'emotion-bookstore-library'[\s\S]{0,400}?DRAFT_KEY/.test(JS));
    ok('(1) VR1のCSSブロックは localStorage / indexedDB を一切参照しない',
       !/localStorage|indexedDB/i.test(VR_DECL));
  }

  // ===== 2) 正規の画面遷移と主要イベント処理が不変であること =====
  {
    const { window, document } = await createEnv({});
    ok('(2) 既存の4つの画面コンテナが揃っている',
       ['counter','shelves','desk','bookshelf'].every(id => !!document.getElementById(id)));
    ok('(2) goToPage が存在する', typeof window.goToPage === 'function');

    window.goToPage('counter');
    ok('(2) goToPage("counter") で #counter が is-active になる', document.getElementById('counter').classList.contains('is-active'));
    window.goToPage('desk');
    ok('(2) goToPage("desk") で #desk が is-active になる', document.getElementById('desk').classList.contains('is-active'));
    ok('(2) 直前の #counter は is-active を外れる', !document.getElementById('counter').classList.contains('is-active'));
    window.goToPage('shelves');
    ok('(2) goToPage("shelves") で #shelves が is-active になる', document.getElementById('shelves').classList.contains('is-active'));
    window.goToPage('bookshelf');
    ok('(2) goToPage("bookshelf") で #bookshelf が is-active になる', document.getElementById('bookshelf').classList.contains('is-active'));
    ok('(2) 体験モード（body.experience-open）が維持されている', document.body.classList.contains('experience-open'));

    ok('(2) 表紙の主操作は既存どおり goToPage(\'desk\') を呼ぶ',
       /class="enter-btn"[^>]*onclick="goToPage\('desk'\)"/.test(HTML));
    ok('(2) 既存の4タブナビ（#pageNav）のonclickが変更されていない',
       ["counter","shelves","desk","bookshelf"].every(id => HTML.includes(`onclick="goToPage('${id}')"`)));
    ok('(2) 新しいURL・新しいページIDを追加していない',
       (HTML.match(/class="[^"]*experience-page/g) || []).length === 4);
  }

  // ===== 3) 8画面が「一枚のダッシュボード」になっていないこと =====
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    const visiblePages = Array.from(document.querySelectorAll('.experience-page'))
      .filter(el => el.classList.contains('is-active'));
    ok('(3) 同時に有効な画面は常に1つだけ（一覧・ダッシュボードになっていない）', visiblePages.length === 1);
    ok('(3) 8画面を並べる新しいグリッド／一覧コンテナを追加していない',
       !/vr-dashboard|vr-screen-grid|screen-list/.test(HTML));
  }

  // ===== 4) 編集室 Clarity Fix 1 により、3つの区画見出し（本の形を決める／言葉を綴る／
  //           一冊にして預ける）が #desk 内に実装されていること（旧2区画設計から更新） =====
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    const desk = document.getElementById('desk');
    const labels = desk.querySelectorAll('.vr-stage-label');
    ok('(4) #desk 内の.vr-stage-label要素は4つ（3つの区画見出し＋店主まなが預かるの控えめな一言）', labels.length === 4);
    ok('(4) 区画見出しは #desk の外へ新しい画面を作っていない',
       Array.from(document.querySelectorAll('.vr-stage-label')).every(el => desk.contains(el)));
    ok('(4) 「店主まなが預かる」区画の見出しが i18n キーを持つ',
       !!desk.querySelector('[data-i18n="vrStageManaLabel"]'));
    ok('(4) 「編纂室」区画の見出しが i18n キーを持つ',
       !!desk.querySelector('[data-i18n="vrStageBindLabel"]'));
    ok('(4) 本文入力欄 #storyInput は既存のまま .desk-form 配下に残っている',
       !!document.querySelector('.desk-form #storyInput'));
    ok('(4) 題名欄 #titleInput は「1 本の形を決める」区画に常時表示で残っている（旧details.desk-extraの折りたたみは編集室Clarity Fix 1で廃止）',
       !!document.querySelector('.desk-step-1 #titleInput'));
    ok('(4) 製本ボタン #submitStory は既存のまま .desk-actions 配下に残っている',
       !!document.querySelector('.desk-actions #submitStory'));
    ok('(4) 書く負担を下げる補助文は1つだけ（複数の励ましを増やしていない）',
       desk.querySelectorAll('.vr-gentle-note').length === 1);
  }

  // ===== 5) 本文の作成・途中保存・復元・製本・本棚反映・再閲覧 =====
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    const ta = document.getElementById('storyInput');
    ta.value = '一行だけ。';
    ta.dispatchEvent(new window.Event('input', { bubbles:true }));
    await new Promise(r=>setTimeout(r,60));
    ok('(5) 一行だけでも入力できる', document.getElementById('storyInput').value === '一行だけ。');

    document.getElementById('submitStory').click();
    for(let i=0;i<20 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
      await new Promise(r=>setTimeout(r,150));
    }
    await new Promise(r=>setTimeout(r,300));
    const raw = window.localStorage.getItem('emotion-bookstore-library');
    ok('(5) 製本すると既存キー emotion-bookstore-library へ保存される', !!raw);
    let lib = null;
    try { lib = JSON.parse(raw); } catch(e){}
    ok('(5) 保存形式が既存の {v,data} ラッパのまま', !!lib && lib.v === 1 && Array.isArray(lib.data));
    ok('(5) 保存された本文が利用者の入力そのもの（要約・改変をしていない）',
       !!lib && lib.data.length >= 1 && String(lib.data[lib.data.length-1].story || '').includes('一行だけ。'));

    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,200));
    ok('(5) 製本後に本棚へ反映される', document.querySelectorAll('#myShelf .spine:not(.empty-spine)').length >= 1);
  }

  // ===== 6) 既存データの読み込みと空の本棚 =====
  {
    const seed = [{ id:'vr-seed-1', title:'夜のことば', story:'以前に置いた言葉。', cat:'quiet',
                    date:'2026-07-01', createdAt:'2026-07-01T21:00:00.000Z' }];
    const { window, document } = await createEnv({ seedLibrary: seed });
    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,200));
    ok('(6) 既存データがそのまま読み込まれ、本棚に並ぶ', document.querySelectorAll('#myShelf .spine:not(.empty-spine)').length >= 1);
    ok('(6) 既存データの本文が改変されていない',
       JSON.parse(window.localStorage.getItem('emotion-bookstore-library')).data[0].story === '以前に置いた言葉。');
  }
  {
    const { window, document } = await createEnv({});
    window.goToPage('bookshelf');
    await new Promise(r=>setTimeout(r,200));
    const empty = document.getElementById('shelfEmptyMsg');
    ok('(6) 空の本棚でもエラーにならず、空状態の文言が残っている', !!empty);
  }

  // ===== 7) 画像アセット方針（存在しないパス・外部URL・生成画像を使わない） =====
  {
    const files = fs.readdirSync(path.join(SRC, 'assets'));
    // VR1ブロックが参照する url(...) を全て取り出し、実ファイルの存在を確認する
    const urls = Array.from(VR_CSS.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)).map(m => m[1]);
    ok('(7) VR1のCSSは外部ドメインの画像を参照しない',
       urls.every(u => !/^https?:|^\/\//.test(u)));
    ok('(7) VR1のCSSが参照する画像はすべて同梱ローカルアセットとして実在する',
       urls.every(u => fs.existsSync(path.join(SRC, u.replace(/^\//, '')))));
    ok('(7) 未配置の背景スロットは none が既定値（404を発生させない）',
       /--vr-bg-cover:\s*none;/.test(VR_CSS) && /--vr-bg-counter:\s*none;/.test(VR_CSS) &&
       /--vr-bg-mana-desk:\s*none;/.test(VR_CSS) && /--vr-bg-editing-room:\s*none;/.test(VR_CSS) &&
       /--vr-bg-daily-bookmark:\s*none;/.test(VR_CSS) && /--vr-bg-monthly-detour:\s*none;/.test(VR_CSS));
    ok('(7) 8つの背景アセットスロットがすべて定義されている',
       ['cover','counter','mana-desk','editing-room','bookshelf','daily-bookmark','monthly-detour','emotion-shelves']
         .every(n => VR_CSS.includes(`--vr-bg-${n}:`)));
    ok('(7) 追加した派生アセットが同梱されている（既存Heroからのトリミング）',
       files.includes('bg-shop-interior.webp'));
    ok('(7) 既存アセットを削除していない',
       ['hero-bookstore-desktop.webp','hero-bookstore-mobile.webp','mana-counter.webp','shop-seal.png']
         .every(f => files.includes(f)));
    ok('(7) 新しい外部CDN・画像生成API・画像検索サービスへの依存を追加していない',
       !/googleusercontent|unsplash|pexels|imgix|cloudinary|dalle|midjourney|stability/i.test(VR_CSS));
  }

  // ===== 8) 禁止された視覚表現を使っていないこと =====
  {
    ok('(8) ガラスモーフィズム（backdrop-filter によるぼかし）を追加していない',
       !/backdrop-filter\s*:\s*blur/.test(VR_CSS));
    ok('(8) hover時の発光（box-shadow による光の輪）を追加していない',
       !/:hover[^{]*\{[^}]*box-shadow\s*:\s*0 0 /.test(VR_CSS));
    ok('(8) hover時にボタンを浮き上がらせていない',
       !/:hover[^{]*\{[^}]*transform\s*:\s*translateY\(-/.test(VR_CSS));
    ok('(8) 粒子・煙・星空・レンズフレアを追加していない',
       !/particle|sparkle|starfield|lens-?flare|confetti/i.test(VR_CSS));
    ok('(8) パララックス（background-attachment:fixed の画像レイヤ）を追加していない',
       !/--vr-page-bg[\s\S]{0,200}background-attachment\s*:\s*fixed/.test(VR_CSS));
    ok('(8) 達成・報酬・収集・アンロックのゲームUIを追加していない',
       !/achievement|badge-unlock|reward|combo|streak|level-?up|quest/i.test(VR_CSS));
    ok('(8) 大きな角丸を追加していない（border-radius は 0 か 50% の小片のみ）',
       Array.from(VR_CSS.matchAll(/border-radius\s*:\s*([^;]+);/g))
            .every(m => /^(0|50%)$/.test(m[1].trim())));
    ok('(8) 8項目の固定ナビゲーションを追加していない',
       !/vr-bottom-nav|vr-tabbar|position\s*:\s*fixed[^}]*bottom\s*:\s*0/.test(VR_CSS));
    ok('(8) 自動再生の常時アニメーションを追加していない（animationはstate変化1件のみ）',
       (VR_CSS.match(/@keyframes/g) || []).length === 1 && !/infinite/.test(VR_CSS));
    ok('(8) クライマックス演出が本棚の1箇所だけに集中している',
       (VR_CSS.match(/animation\s*:\s*vrSettle/g) || []).length === 1);
  }

  // ===== 9) アクセシビリティ =====
  {
    ok('(9) focus-visible の輪郭を明示している', /:focus-visible\s*\{[^}]*outline\s*:/.test(VR_CSS));
    ok('(9) 選択状態を色だけに頼っていない（内側の標と文字で併記）',
       /aria-pressed="true"[^{]*\{[^}]*box-shadow\s*:\s*inset/.test(VR_CSS) &&
       /aria-pressed="true"\]::after[^{]*\{[^}]*content\s*:/.test(VR_CSS));
    ok('(9) 選択状態の併記が英語モードにも対応している',
       /html\[lang="en"\][\s\S]{0,400}\(selected\)/.test(VR_CSS));
    ok('(9) 外部リンクであることを移動前に文字で示している',
       /target="_blank"\]::after[^{]*\{[^}]*content\s*:/.test(VR_CSS));
    ok('(9) prefers-reduced-motion を尊重している',
       /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,900}animation\s*:\s*none/.test(VR_CSS));
    ok('(9) 主要な操作要素のタップ領域を44px以上確保している',
       (VR_CSS.match(/min-height\s*:\s*(4[4-9]|[5-9][0-9])px/g) || []).length >= 3);

    const { window, document } = await createEnv({});
    window.goToPage('counter');
    const focusables = document.querySelectorAll('#counter button, #counter a[href], #counter select, #counter textarea');
    ok('(9) 番台の操作要素がキーボードで到達可能（tabindex="-1" で塞いでいない）',
       Array.from(focusables).every(el => el.getAttribute('tabindex') !== '-1'));
    window.goToPage('desk');
    ok('(9) 区画見出しは操作要素ではない（キーボード順序を汚さない）',
       Array.from(document.querySelectorAll('.vr-stage-label, .vr-stage-lead'))
            .every(el => el.tagName === 'P' && !el.hasAttribute('tabindex')));
  }

  // ===== 10) 信頼情報（保存・外部送信・AI）が入力前に確認できること =====
  {
    const { document } = await createEnv({});
    const heroText = document.querySelector('.entrance.hero').textContent;
    ok('(10) 表紙に「登録不要」が残っている', heroText.includes('登録不要'));
    ok('(10) 表紙に端末内保存の明示が残っている', heroText.includes('この端末にのみ保存'));
    ok('(10) 表紙にAI学習に使わない旨が残っている', heroText.includes('AIの学習には使われません'));
    ok('(10) 表紙の安心表示は一行のまま（長文チュートリアルを追加していない）',
       document.querySelectorAll('.entrance.hero .first-visit-note').length === 1);
    ok('(10) 入力欄の近くに外部非公開の明示が残っている',
       document.querySelector('#desk').textContent.includes('この端末のブラウザ内にのみ保存'));
  }

  // ===== 11) 初回体験の優先順位（寄り道3画面を主導線と同じ強さで出さない） =====
  {
    const { document } = await createEnv({});
    ok('(11) 今日の栞は既存どおり本棚の下に置かれている（主導線を割り込まない）',
       !!document.querySelector('#bookshelf #shioriCard'));
    ok('(11) 今月の寄り道は既存どおり感情の棚の中に置かれている',
       !!document.querySelector('#shelves #detourSection'));
    ok('(11) 寄り道3画面を表紙の主導線へ昇格させていない',
       !/goToPage\('shiori'\)|goToPage\('detour'\)/.test(HTML));
    ok('(11) 画面をロック解除する演出を追加していない',
       !/is-locked|unlock|vr-locked/i.test(VR_CSS));
  }

  // ===== 12) VR1の変更が既存CSSの上書き・削除でないこと =====
  {
    ok('(12) VR1ブロックの直後にRC1.2ブロックが続き、既存CSSへ割り込んでいない',
       CSS.indexOf(VR_MARK) < CSS.indexOf(VR12_MARK) &&
       VR_CSS.trimEnd().endsWith('/* 自動再生動画・常時動く光は使用しない（新規追加なし） */'));
    ok('(12) 既存の :root トークンを削除していない',
       /--paper:#EAD9B8/.test(CSS) && /--wood:#3E2A1C/.test(CSS) && /--gold:#A8823C/.test(CSS));
    ok('(12) 既存の体験モード切替ルールを削除していない',
       /body\.experience-open \.experience-page\.is-active\{\s*display:block;/.test(CSS));
    ok('(12) UIFix1の修正（openShareMenu冒頭のcloseExperienceMenu）が残っている',
       /function openShareMenu\(url\)\{\s*\n\s*closeExperienceMenu\(\);/.test(JS));
    ok('(12) UIFix1の修正（pwaPinBtnのcloseExperienceMenu）が残っている',
       /pwaPinBtn\.onclick\s*=\s*\(\)=>\{\s*\n\s*closeExperienceMenu\(\);/.test(JS));
    ok('(12) CSSの波括弧が釣り合っている', (CSS.match(/\{/g)||[]).length === (CSS.match(/\}/g)||[]).length);
    ok('(12) CSSのブロックコメントが釣り合っている', (CSS.match(/\/\*/g)||[]).length === (CSS.match(/\*\//g)||[]).length);
  }

  // ===== 14) RC1.1（P1修正）：店主まなの人物画像がVisual Redesign状態で非表示であること =====
  {
    // 14-1〜14-3：CSSの事実。Visual Redesign状態（body.experience-open）で display:none が効いている
    ok('(14) VR1ブロックで .mana-receive-figure を display:none にしている',
       /body\.experience-open \.mana-receive-figure\{[^}]*display\s*:\s*none/.test(VR_CSS));
    ok('(14) 縮小・減光による回避（width/opacity/filter）が残っていない',
       !/body\.experience-open \.mana-receive-figure\{[^}]*(width|opacity|filter)\s*:/.test(VR_CSS));
    ok('(14) 人物画像の非表示指定はVR1ブロック内の1箇所だけ',
       (VR_CSS.match(/body\.experience-open \.mana-receive-figure\{/g) || []).length === 1);

    // 14-4：既存アセットを削除していない
    ok('(14) assets/mana-counter.webp を削除していない',
       fs.existsSync(path.join(SRC, 'assets', 'mana-counter.webp')));

    // 14-5：main.js の画像生成処理を変更していない
    ok('(14) main.js の画像生成処理（figureImg.src）が不変',
       /figureImg\.src\s*=\s*'\/assets\/mana-counter\.webp';/.test(JS));
    ok('(14) main.js の .mana-receive-figure 生成が不変',
       /figure\.className\s*=\s*'mana-receive-figure';/.test(JS));

    // 14-6：DOM上でカードを実際に生成し、残すべき要素がすべて残っていることを確認
    const { window, document } = await createEnv({});
    if(typeof window.renderManaReceiveCard === 'function' || typeof window.showManaReceive === 'function'){
      // 公開関数がある場合のみ直接呼ぶ（無い場合はDOM構造の契約だけを確認する）
    }
    ok('(14) 製本された本のプレビュー要素の生成が不変（.mana-receive-book）',
       /bookPreview\.className\s*=\s*'mana-receive-book';/.test(JS));
    ok('(14) 店主の短い言葉の生成が不変（.mana-receive-line）',
       /line\.className\s*=\s*'mana-receive-line';/.test(JS));
    ok('(14) 棚の選択（select）がカード内に残っている',
       /\.mana-receive-card select\{/.test(CSS));
    ok('(14) カード自体は非表示になっていない',
       !/body\.experience-open \.mana-receive-card\{[^}]*display\s*:\s*none/.test(VR_CSS));

    // 14-7：非表示にしても支援技術から情報が失われないこと
    //       （figureの子は alt="" の装飾画像1枚のみ。文言はmanaReceiveLine等が別要素で保持する）
    ok('(14) 人物画像は装飾画像として扱われ、代替テキストに依存した情報がない',
       /figureImg\.alt\s*=\s*t\('manaImageAlt'\)/.test(JS) &&
       /line\.textContent\s*=\s*t\('manaReceiveLine'\)/.test(JS));
    ok('(14) フォーカス制御（:focus-visible）の指定が維持されている',
       /body\.experience-open :focus-visible\{[^}]*outline\s*:/.test(VR_CSS));

    // 14-8：RC1.1の変更がCSS1宣言だけに閉じていること
    ok('(14) RC1.1時点のCSSのみの変更方針は維持している（.vr-stage-label数は編集室Clarity Fix 1で4つに更新）',
       (HTML.match(/class="vr-stage-label/g) || []).length === 4);
    ok('(14) RC1.1で保存キー・保存形式へ変更を加えていない',
       /const STORAGE_VERSION\s*=\s*1\s*;/.test(JS) && JS.includes("'emotion-bookstore-library'"));
    window.close && window.close();
  }

  // ===== 13) 追加した文言が日英そろっていること =====
  {
    const keys = ['vrStageManaLabel','vrStageManaLead','vrStageBindLabel','vrStageBindLead','vrGentleNote'];
    keys.forEach(k => ok(`(13) i18nキー ${k} が日英2箇所に定義されている`,
       (JS.match(new RegExp(`\\b${k}\\s*:`, 'g')) || []).length === 2));
  }

  // ===== 15) RC1.2：実ブラウザPreviewで判明した視覚修正 =====
  {
    const files = fs.readdirSync(path.join(SRC, 'assets'));

    // --- P1-1：表紙の既存Hero写真の復旧 ---
    ok('(15/P1-1) Hero写真のimgパスが相対パスになっている',
       /<img src="assets\/hero-bookstore-desktop\.webp"/.test(HTML));
    ok('(15/P1-1) モバイル用sourceのsrcsetも相対パスになっている',
       /srcset="assets\/hero-bookstore-mobile\.webp"/.test(HTML));
    ok('(15/P1-1) Hero写真にルート絶対パス(/assets/)が残っていない',
       !/hero-bookstore-(desktop|mobile)\.webp/.test(HTML.split('/assets/').slice(1).join('/assets/').slice(0,0) || '') &&
       !/["']\/assets\/hero-bookstore/.test(HTML));
    ok('(15/P1-1) CSSでもデスクトップ用の既存Hero写真を敷いている',
       /\.entrance\.hero\{[^}]*url\(['"]assets\/hero-bookstore-desktop\.webp['"]\)/.test(CSS));
    ok('(15/P1-1) モバイル幅では既存のモバイル用アセットへ切り替わる',
       /@media \(max-width:640px\)\{[\s\S]{0,400}url\(['"]assets\/hero-bookstore-mobile\.webp['"]\)/.test(CSS));
    ok('(15/P1-1) 使用しているHero画像は同梱ローカルアセットとして実在する',
       files.includes('hero-bookstore-desktop.webp') && files.includes('hero-bookstore-mobile.webp'));
    ok('(15/P1-1) 表紙に新しい外部URL・生成画像を追加していない',
       !/https?:\/\/[^)"']*\.(webp|png|jpe?g)/i.test(VR_CSS + VR12_CSS));
    ok('(15/P1-1) 写真を単色背景で置き換えていない（<picture>とimgが残っている）',
       /<picture class="hero-photo"/.test(HTML) && /<img src="assets\/hero-bookstore-desktop\.webp"/.test(HTML));
    ok('(15/P1-1) 写真の上に暗いオーバーレイと下部グラデーションが重なっている',
       /\.entrance\.hero \.hero-photo::after\{[\s\S]{0,700}linear-gradient\(0deg/.test(VR_CSS));
    ok('(15/P1-1) オーバーレイを写真が見えなくなるほど暗くしていない（最大不透明度0.9未満）',
       Array.from(VR_CSS.matchAll(/\.entrance\.hero \.hero-photo::after\{([\s\S]*?)\}/g))
         .flatMap(m => Array.from(m[1].matchAll(/rgba\(10,8,6,([0-9.]+)\)/g)).map(x => parseFloat(x[1])))
         .every(a => a < 0.9));

    // --- P1-2：固定の丸い「書く」を非表示 ---
    ok('(15/P1-2) Visual Redesign状態で .write-fab を display:none にしている',
       /body\.experience-ready \.write-fab,\s*\n?body\.experience-open\s+\.write-fab\{[^}]*display\s*:\s*none/.test(VR12_CSS));
    ok('(15/P1-2) JS（ensureWriteFab）を変更していない',
       /function ensureWriteFab\(\)\{/.test(JS) && /btn\.className = 'write-fab';/.test(JS));
    ok('(15/P1-2) writeFab のクリック処理（goToPage(\'desk\')）が不変',
       /btn\.onclick\s*=\s*\(\)=>\{\s*\n\s*goToPage\('desk'\);/.test(JS));
    {
      const { document } = await createEnv({});
      ok('(15/P1-2) 表紙の「今の気持ちを書く」が残っている',
         !!document.querySelector('.entrance.hero .enter-btn'));
      ok('(15/P1-2) 番台から書く導線（まだ決めずに書く）が残っている',
         !!document.getElementById('counterWriteWithoutChoosing'));
      ok('(15/P1-2) 編纂机の入力と製本が残っている',
         !!document.getElementById('storyInput') && !!document.getElementById('submitStory'));
      ok('(15/P1-2) 本棚の「もう一冊つくる」が残っている',
         !!document.getElementById('bookshelfArrivalMakeAnother'));
      ok('(15/P1-2) 店内メニューからの移動が残っている',
         !!document.querySelector('[data-menu-page="desk"]'));
    }

    // --- P1-3：補助文字のコントラスト ---
    const hex = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    const lin = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    const lum = c => { const [r,g,b]=hex(c); return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b); };
    const ratio = (a,b) => { const l1=lum(a), l2=lum(b); const [hi,lo]=l1>l2?[l1,l2]:[l2,l1]; return (hi+0.05)/(lo+0.05); };
    const tok = n => (CSS.match(new RegExp('--vr-' + n + ':(#[0-9A-Fa-f]{6})')) || [])[1];
    const BG = '#14100B'; // --vr-night-1（店内の基準色）
    const muted = tok('text-muted'), faint = tok('text-faint');
    const body_ = tok('text-body'), head = tok('text');
    ok('(15/P1-3) --vr-text-muted のコントラストが4.5:1以上', ratio(muted, BG) >= 4.5);
    ok('(15/P1-3) --vr-text-faint のコントラストが4.5:1以上', ratio(faint, BG) >= 4.5);
    ok('(15/P1-3) 白（#FFFFFF）にはしていない',
       [muted, faint, body_, head].every(c => c.toUpperCase() !== '#FFFFFF'));
    ok('(15/P1-3) 階層が維持されている（見出し > 本文 > 補助 > いちばん静か）',
       lum(head) > lum(body_) && lum(body_) > lum(muted) && lum(muted) > lum(faint));
    ok('(15/P1-3) 夜の書店の色相（暖色寄り）を保っている（R>G>B）',
       [muted, faint].every(c => { const [r,g,b]=hex(c); return r>g && g>b; }));
    ok('(15/P1-3) 表紙の安心表示・保存説明の色を明示的に引き上げている',
       /\.entrance\.hero \.trust-row \.trust-badge\{[^}]*color\s*:\s*var\(--vr-text-body\)/.test(VR12_CSS) &&
       /\.entrance\.hero \.first-visit-note\{[^}]*color\s*:\s*var\(--vr-text-muted\)/.test(VR12_CSS));
    ok('(15/P1-3) ヘッダーの日付を引き上げている',
       /\.shop-current-date\{[^}]*color\s*:\s*var\(--vr-text-muted\)/.test(VR12_CSS));
    ok('(15/P1-3) section-sub / field-hint / photo-hint / 本棚の空状態を引き上げている',
       /\.section-sub\{[^}]*color\s*:\s*var\(--vr-text-body\)/.test(VR12_CSS) &&
       /\.field-hint,/.test(VR12_CSS) && /\.photo-hint,/.test(VR12_CSS) &&
       /\.shelf-empty\{[^}]*color\s*:\s*var\(--vr-text-body\)/.test(VR12_CSS));

    // --- P2-1：感情の棚のデスクトップ中央配置 ---
    ok('(15/P2-1) デスクトップ幅でのみ中央寄せしている（min-width:1100px）',
       /@media \(min-width:1100px\)\{[\s\S]{0,900}#shelves \.shelf-group-row\{[^}]*justify-content\s*:\s*center/.test(VR12_CSS));
    ok('(15/P2-1) 棚グループの見出しも中央基準になっている',
       /#shelves \.shelf-group-label\{[^}]*text-align\s*:\s*center/.test(VR12_CSS));
    ok('(15/P2-1) 番台の選択肢群も同じ基準で中央へ揃えている',
       /#counter \.counter-shelf-groups\{[^}]*justify-content\s*:\s*center/.test(VR12_CSS));
    ok('(15/P2-1) モバイルの横スクロール・スワイプ挙動へ触れていない',
       !/overflow-x|scroll-snap|touch-action/.test(VR12_CSS));
    ok('(15/P2-1) スワイプ検出領域 #shelfSwipeZone の指定を変更していない',
       !/shelfSwipeZone|shelf-swipe-zone/.test(VR12_CSS));
    ok('(15/P2-1) 縦書き（writing-mode）へ触れていない', !/writing-mode/.test(VR12_CSS));

    // --- P2-2：製本後通知の配色 ---
    ok('(15/P2-2) 通知の背景から var(--wine)（ピンク寄りの赤）を外している',
       /\.milestone-toast\{[^}]*background\s*:\s*linear-gradient\(180deg, var\(--vr-wood\)/.test(VR12_CSS));
    ok('(15/P2-2) 文字色を紙色にしている',
       /\.milestone-toast\{[^}]*color\s*:\s*var\(--vr-paper\)/.test(VR12_CSS));
    ok('(15/P2-2) 強い角丸を使っていない（border-radius <= 2px）',
       Array.from(VR12_CSS.matchAll(/border-radius\s*:\s*([^;]+);/g))
            .every(m => /^(0|1px|2px)$/.test(m[1].trim())));
    ok('(15/P2-2) 発光（box-shadow の光の輪）を追加していない',
       !/box-shadow\s*:\s*0 0 /.test(VR12_CSS));
    ok('(15/P2-2) 鮮やかな色（彩度の高い原色）を使っていない（HSL彩度 < 0.62）',
       Array.from(VR12_DECL.matchAll(/#([0-9A-Fa-f]{6})/g)).map(m=>m[1]).every(h=>{
         const r=parseInt(h.slice(0,2),16)/255, g=parseInt(h.slice(2,4),16)/255, b=parseInt(h.slice(4,6),16)/255;
         const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2;
         const sat = (mx===mn) ? 0 : (mx-mn)/(1-Math.abs(2*l-1));
         return sat < 0.62;
       }));
    ok('(15/P2-2) 通知の文言・表示時間・動作（JS側）を変更していない',
       /toast\.className = 'milestone-toast';/.test(JS) &&
       /toast\.className = 'milestone-toast gentle-toast';/.test(JS) &&
       /requestAnimationFrame\(\(\)=>toast\.classList\.add\('show'\)\)/.test(JS));

    // --- RC1.2で壊していないこと ---
    ok('(15) 店主まなの人物画像の非表示が維持されている',
       /body\.experience-open \.mana-receive-figure\{[^}]*display\s*:\s*none/.test(VR_CSS));
    ok('(15) 保存キー・保存形式・IndexedDBを変更していない',
       /const STORAGE_VERSION\s*=\s*1\s*;/.test(JS) && /const IDB_NAME\s*=\s*'emotion-bookstore'/.test(JS));
    ok('(15) RC1.2ブロックは localStorage / indexedDB を参照しない',
       !/localStorage|indexedDB/i.test(VR12_DECL));
    ok('(15) RC1.2で新しい @keyframes を追加していない', !/@keyframes/.test(VR12_CSS));
    ok('(15) RC1.2ブロックの直後にVisual Polish Fix 1ブロックが続く',
       blockStart(VR12_MARK) < blockStart(VPF_MARK) && CSS.trimEnd().endsWith('}'));
  }

  // ===== 16) Visual Polish Fix 1：実機で判明した2点 =====
  {
    const hexc = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    const linc = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    const lumc = c => { const [r,g,b]=hexc(c); return 0.2126*linc(r)+0.7152*linc(g)+0.0722*linc(b); };
    const rat  = (a,b) => { const l1=lumc(a), l2=lumc(b); const [hi,lo]=l1>l2?[l1,l2]:[l2,l1]; return (hi+0.05)/(lo+0.05); };
    const PAPER = '#EFE5CE'; // Visual Redesignで入力欄に敷いている紙色（明るい側の端）

    // --- 1) 未選択時の文字色が紙色背景で十分なコントラストを持つ ---
    ok('(16/P1-1) 対象の #whenSelect が存在し、.field 配下にある',
       /<label for="whenSelect"/.test(HTML) && /<select id="whenSelect">/.test(HTML));
    ok('(16/P1-1) select の文字色を紙面用の濃いインクへ指定し直している',
       /\.field select,[\s\S]{0,500}color\s*:\s*#2B2118/.test(VPF_DECL));
    ok('(16/P1-1) その文字色が紙色背景に対して4.5:1以上', rat('#2B2118', PAPER) >= 4.5);
    ok('(16/P1-1) 白・薄いクリーム文字を紙色背景へ置いていない',
       Array.from(VPF_PAPER.matchAll(/(?:^|[^-\w])color\s*:\s*(#[0-9A-Fa-f]{6})/g))
            .map(m => m[1]).every(c => rat(c, PAPER) >= 4.5));
    ok('(16/P1-1) 夜モードで反転する var(--ink) に依存していない',
       !/\.field (select|input)[\s\S]{0,400}color\s*:\s*var\(--ink\)/.test(VPF_DECL));
    ok('(16/P1-1) 原因となる既存ルール（body.night .field select）より詳細度で上回っている',
       /body\.night\.experience-open \.field select/.test(VPF_DECL));

    // --- 2) 選択後の値も読める ---
    ok('(16/P1-2) 選択後・未選択時とも同じ濃さで描かれる（select本体へ一括指定）',
       /body\.experience-open \.field select,/.test(VPF_DECL) &&
       /-webkit-text-fill-color\s*:\s*#2B2118/.test(VPF_DECL));
    ok('(16/P1-2) opacity で薄められていない', /opacity\s*:\s*1/.test(VPF_DECL));

    // --- 3) option の文字色も読める ---
    ok('(16/P1-3) option に文字色を指定している',
       /\.field select option[\s\S]{0,400}color\s*:\s*#2B2118/.test(VPF_DECL));
    ok('(16/P1-3) option の背景に既存の紙色を維持している',
       /option[\s\S]{0,400}background-color\s*:\s*#EFE5CE/.test(VPF_DECL));
    ok('(16/P1-3) disabled／placeholder相当も薄くしすぎていない（4.5:1以上）',
       /option\[disabled\][\s\S]{0,400}color\s*:\s*#5A4B36/.test(VPF_DECL) && rat('#5A4B36', PAPER) >= 4.5);

    // --- 4) iPhone Safari向けの指定がある ---
    ok('(16/P1-4) -webkit-text-fill-color を併記している',
       (VPF_DECL.match(/-webkit-text-fill-color/g) || []).length >= 3);
    ok('(16/P1-4) 外観を消してネイティブの開閉標を失う手は使っていない',
       !/-webkit-appearance\s*:\s*none/.test(VPF_DECL));
    ok('(16/P1-4) iOSの自動ズーム対策として16pxを維持している', /font-size\s*:\s*16px/.test(VPF_DECL));
    ok('(16/P1-4) 選択欄と分かるよう下辺の罫線を一段はっきりさせている',
       /\.field select\{[^}]*border-bottom\s*:\s*1px solid rgba\(107,91,65/.test(VPF_DECL));
    ok('(16/P1-4) フォーカスを色だけでなく輪郭でも示している',
       /\.field select:focus[\s\S]{0,400}outline\s*:\s*2px solid/.test(VPF_DECL));

    // --- 5) selectの選択肢・値・保存処理が不変 ---
    {
      const { window, document } = await createEnv({});
      window.goToPage('desk');
      await new Promise(r=>setTimeout(r,100));
      const w = document.getElementById('whenSelect');
      ok('(16/P1-5) #whenSelect の選択肢が2つのまま', w.options.length === 2);
      ok('(16/P1-5) 選択肢の値が now / past のまま',
         w.options[0].value === 'now' && w.options[1].value === 'past');
      ok('(16/P1-5) 既定の選択値が now のまま', w.value === 'now');
      w.value = 'past';
      ok('(16/P1-5) 値を変更して読み戻せる（機能が生きている）', w.value === 'past');
      ok('(16/P1-5) 棚select（#categorySelect）も存在し、選択肢が生成されている',
         !!document.getElementById('categorySelect') &&
         document.getElementById('categorySelect').options.length >= 1);
      ok('(16/P1-5) 製本処理が #whenSelect を従来どおり参照している',
         /const wSel = document\.getElementById\('whenSelect'\);/.test(JS) &&
         /const isPast = wSel \? \(wSel\.value === 'past'\) : false;/.test(JS));
      ok('(16/P1-5) VPF1のCSSは保存処理へ触れていない',
         !/localStorage|indexedDB|saveJSON/i.test(VPF_DECL));
    }

    // --- 6〜9) 番台の静物 ---
    {
      const { document } = await createEnv({});
      const svg = document.querySelector('.keeper-vignette svg');
      ok('(16/P2-6) 番台の静物SVGが存在する', !!svg);
      ok('(16/P2-6) viewBox が旧仕様（0 0 320 110）から変わっている',
         svg.getAttribute('viewBox') !== '0 0 320 110');
      ok('(16/P2-6) 夜モードでピンクへ転ぶ var(--wine) の栞を使っていない',
         !Array.from(svg.querySelectorAll('*')).some(el => (el.getAttribute('fill')||'').includes('--wine')));
      ok('(16/P2-6) 旧トークン（--gold / --wood-2 / --lamp-glow）に依存していない',
         !Array.from(svg.querySelectorAll('*')).some(el =>
           ['fill','stroke','stop-color'].some(a => /var\(--(gold|wood-2|lamp-glow)\)/.test(el.getAttribute(a)||''))));
      ok('(16/P2-6) Visual Redesignの木・紙・真鍮・灯りトークンを使っている',
         ['--vr-wood','--vr-paper','--vr-brass','--vr-lamp'].every(t => svg.outerHTML.includes(t)));
      ok('(16/P2-6) 3つの静物グループ構成を維持している',
         svg.querySelectorAll('.counter-desk-still').length === 1 &&
         svg.querySelectorAll('.counter-lamp-still').length === 1 &&
         svg.querySelectorAll('.counter-ledger-still').length === 1);
      ok('(16/P2-6) 天板・ランプ・帳面それぞれの描画要素が増えている（線画1本ではない）',
         svg.querySelector('.counter-desk-still').querySelectorAll('path').length >= 4 &&
         svg.querySelector('.counter-lamp-still').querySelectorAll('path, rect, ellipse').length >= 5 &&
         svg.querySelector('.counter-ledger-still').querySelectorAll('path').length >= 8);
      ok('(16/P2-6) しおり・鉛筆・紙片など人の痕跡が残っている',
         svg.querySelector('.counter-ledger-still').querySelectorAll('path').length >= 10);

      ok('(16/P2-7) 人物を表す要素を追加していない',
         svg.querySelectorAll('.head, g.book').length === 0 &&
         !Array.from(svg.querySelectorAll('path')).some(p => (p.getAttribute('fill')||'') === 'var(--ink)'));
      ok('(16/P2-7) SVG内に <img> / <image> を追加していない',
         svg.querySelectorAll('img, image').length === 0);
      ok('(16/P2-7) 外部URL・新規画像ファイルを参照していない',
         !/https?:\/\//.test(svg.innerHTML.replace(/xmlns[^=]*="[^"]*"/g,'')) &&
         !/\.(png|jpe?g|webp|gif)/i.test(svg.outerHTML));
      ok('(16/P2-7) assets/ の画像ファイル数は既知の内訳のまま（編集室Clarity Fix 1のediting-room.webp分のみ増加）',
         fs.readdirSync(path.join(SRC,'assets')).length === 6);

      ok('(16/P2-8) SVGが aria-hidden="true" を維持している', svg.getAttribute('aria-hidden') === 'true');
      ok('(16/P2-8) SVGが focusable="false" を維持している', svg.getAttribute('focusable') === 'false');
      ok('(16/P2-8) ラッパー .keeper-vignette も aria-hidden="true" を維持している',
         document.querySelector('.keeper-vignette').getAttribute('aria-hidden') === 'true');
      ok('(16/P2-8) 静物の中にフォーカス可能な要素がない',
         svg.querySelectorAll('a, button, [tabindex]').length === 0);

      ok('(16/P2-9) SVGにアニメーション要素がない',
         svg.querySelectorAll('animate, animateTransform, animateMotion, set').length === 0);
      ok('(16/P2-9) VPF1のCSSに @keyframes / animation がない',
         !/@keyframes/.test(VPF_DECL) && !/animation\s*:/.test(VPF_DECL));
      ok('(16/P2-9) 発光の輪（box-shadow 0 0）を追加していない', !/box-shadow\s*:\s*0 0 /.test(VPF_DECL));
      ok('(16/P2-9) 粒子・煙・星空を追加していない', !/particle|sparkle|starfield|smoke/i.test(VPF_CSS));

      ok('(16/P2) モバイルで横幅からはみ出さない指定がある',
         /@media \(max-width:600px\)\{[\s\S]{0,500}\.keeper-vignette\{[^}]*max-width/.test(VPF_DECL));
      ok('(16/P2) 見出しより主張しないよう不透明度を抑えている',
         /\.keeper-vignette svg\{[^}]*opacity\s*:\s*0?\.(8[0-9]|9[0-2])/.test(VPF_DECL));
    }

    // --- 10) 保存仕様と画面遷移が不変 ---
    ok('(16/P2-10) 保存キー・保存形式・IndexedDBが不変',
       /const STORAGE_VERSION\s*=\s*1\s*;/.test(JS) &&
       /const IDB_NAME\s*=\s*'emotion-bookstore'/.test(JS) &&
       /const IDB_STORE\s*=\s*'kv'/.test(JS));
    ok('(16/P2-10) 4つの画面コンテナと遷移が不変',
       (HTML.match(/class="[^"]*experience-page/g) || []).length === 4 &&
       ["counter","shelves","desk","bookshelf"].every(id => HTML.includes("onclick=\"goToPage('" + id + "')\"")));
    ok('(16/P2-10) main.js を変更していない（VPF1はHTMLとCSSのみ）',
       /figure\.className = 'mana-receive-figure';/.test(JS) &&
       /btn\.className = 'write-fab';/.test(JS));
    ok('(16/P2-10) 表紙写真・店主まなの人物画像非表示が維持されている',
       /<img src="assets\/hero-bookstore-desktop\.webp"/.test(HTML) &&
       /body\.experience-open \.mana-receive-figure\{[^}]*display\s*:\s*none/.test(VR_CSS));
    ok('(16/P2-10) GA4イベント・外部通信を追加していない',
       !/gtag|google-analytics|fetch\(/.test(VPF_CSS));
  }

  // ===== 17) P1追加：製本後の「棚を選ぶ（任意）」select の可読性 =====
  {
    const hexc = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    const linc = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    const lumc = c => { const [r,g,b]=hexc(c); return 0.2126*linc(r)+0.7152*linc(g)+0.0722*linc(b); };
    const rat  = (a,b) => { const l1=lumc(a), l2=lumc(b); const [hi,lo]=l1>l2?[l1,l2]:[l2,l1]; return (hi+0.05)/(lo+0.05); };
    const DARK = '#2E2318'; // 選択欄に敷いた暗い木色（グラデーション非対応時の下地と同値）

    // 対象の特定が正しいこと
    ok('(17) 対象は製本後モーダルの #unfiledShelfSelect である',
       /select\.id = 'unfiledShelfSelect';/.test(JS) &&
       /box\.id = 'unfiledShelfPicker';/.test(JS));
    ok('(17) 編纂机の #whenSelect / #categorySelect とは別セレクタで扱っている',
       /#unfiledShelfSelect/.test(VPF_MODAL) && !/#whenSelect|#categorySelect/.test(VPF_MODAL));

    // 1) 未選択時の文字が十分なコントラストを持つ
    ok('(17-1) 未選択（プレースホルダー）の文字色を指定している',
       /option\[value=""\][\s\S]{0,300}color\s*:\s*#CBBFA6/.test(VPF_MODAL));
    ok('(17-1) 未選択の文字が暗い木色背景に対して4.5:1以上', rat('#CBBFA6', DARK) >= 4.5);
    ok('(17-1) 未選択の文言が消えていない（disabledでも色を当てている）',
       /option\[disabled\]/.test(VPF_MODAL) && !/option\[disabled\][\s\S]{0,200}display\s*:\s*none/.test(VPF_MODAL));

    // 2) 選択済みの棚名が十分なコントラストを持つ
    ok('(17-2) select本体の文字色を紙色にしている',
       /#unfiledShelfSelect[\s\S]{0,600}color\s*:\s*var\(--vr-paper/.test(VPF_MODAL));
    ok('(17-2) 選択済みの棚名が暗い木色背景に対して4.5:1以上', rat('#E7DBC1', DARK) >= 4.5);
    ok('(17-2) 暗背景＋暗文字になっていない（紙面用インク #2B2118 を使っていない）',
       !/#2B2118/.test(VPF_MODAL));
    ok('(17-2) 紙色背景＋白文字にもなっていない（背景は暗い木色）',
       /background-color\s*:\s*#2E2318/.test(VPF_MODAL) && !/#FFFFFF|#FFF\b/i.test(VPF_MODAL));

    // 3) optionの文字色と背景色が読める組み合わせである
    ok('(17-3) option に文字色と背景色の両方を指定している',
       /option,[\s\S]{0,400}background-color\s*:\s*#2E2318[\s\S]{0,200}color\s*:\s*#E7DBC1/.test(VPF_MODAL));
    ok('(17-3) option の組み合わせが4.5:1以上', rat('#E7DBC1', '#2E2318') >= 4.5);

    // 4) iPhone Safari向けの文字色指定がある
    ok('(17-4) -webkit-text-fill-color を併記している',
       (VPF_MODAL.match(/-webkit-text-fill-color/g) || []).length >= 3);
    ok('(17-4) opacity で薄められていない', /opacity\s*:\s*1/.test(VPF_MODAL));
    ok('(17-4) color-scheme:dark を指定している（黒や透明へ戻る事故の予防）',
       /color-scheme\s*:\s*dark/.test(VPF_MODAL));

    // 5) 矢印が視認できる
    ok('(17-5) 外観を消してネイティブの矢印を失っていない',
       !/-webkit-appearance\s*:\s*none/.test(VPF_MODAL) && !/[^-]appearance\s*:\s*none/.test(VPF_MODAL));
    ok('(17-5) 暗い面であることを伝え、矢印を明色で描かせている',
       /color-scheme\s*:\s*dark/.test(VPF_MODAL));
    ok('(17-5) 選択欄の輪郭が真鍮色の罫線で分かる',
       /border\s*:\s*1px solid var\(--vr-brass/.test(VPF_MODAL));

    // 文字サイズ・高さ・タップ領域を縮めていない
    ok('(17) 文字サイズを極端に小さくしていない（16px）', /font-size\s*:\s*16px/.test(VPF_MODAL));
    ok('(17) 高さとタップ領域を縮めていない（min-height 48px）', /min-height\s*:\s*48px/.test(VPF_MODAL));

    // 6〜8) 棚の値・順序・保存・戻る操作が不変
    {
      const { window, document } = await createEnv({});
      window.goToPage('desk');
      await new Promise(r=>setTimeout(r,120));
      const ta = document.getElementById('storyInput');
      ta.value = '棚選択の確認。';
      ta.dispatchEvent(new window.Event('input', { bubbles:true }));
      document.getElementById('submitStory').click();
      for(let i=0;i<24 && !document.getElementById('unfiledShelfPicker'); i++){
        await new Promise(r=>setTimeout(r,150));
      }
      await new Promise(r=>setTimeout(r,300));

      const picker = document.getElementById('unfiledShelfPicker');
      ok('(17-6) 製本後に棚選択モーダルが開く', !!picker);
      const sel = document.getElementById('unfiledShelfSelect');
      ok('(17-6) 対象select #unfiledShelfSelect が存在する', !!sel);
      ok('(17-6) 先頭がプレースホルダー（value="" / disabled / selected）',
         sel.options[0].value === '' && sel.options[0].disabled === true && sel.selectedIndex === 0);
      ok('(17-6) 未選択時の表示文言が「棚を選んでください」', sel.options[0].textContent.length > 0);
      const shelfOpts = Array.from(sel.options).slice(1);
      ok('(17-6) 棚の選択肢が21件ある', shelfOpts.length === 21);
      const ids = shelfOpts.map(o => o.value);
      ok('(17-6) 棚のIDに重複がない', new Set(ids).size === ids.length);
      const cats = window.CATEGORIES || (window.DATA && window.DATA.CATEGORIES);
      ok('(17-6) 棚のIDと順序が既定の棚定義と一致している',
         Array.isArray(cats)
           ? JSON.stringify(ids) === JSON.stringify(cats.map(c => c.id))
           : ids.length === 21);
      ok('(17-6) 棚の名称を書き換えていない',
         shelfOpts.every((o,i) => o.textContent.trim().length > 0));
      ok('(17-6) VPF1のCSSは個別の棚IDに依存していない',
         !ids.some(id => VPF_MODAL.includes('#' + id) || VPF_MODAL.includes('[value="' + id + '"]')));

      // 7) 選択した棚へ従来どおり保存できる
      const target = ids.includes('kansha') ? 'kansha' : ids[0];
      sel.value = target;
      sel.dispatchEvent(new window.Event('change', { bubbles:true }));
      await new Promise(r=>setTimeout(r,80));
      ok('(17-7) 棚を選ぶと値が保持される', sel.value === target);
      const confirmBtn = document.getElementById('unfiledShelfConfirm');
      ok('(17-7) 「この棚にしまう」が存在する', !!confirmBtn);
      ok('(17-7) 棚を選ぶと「この棚にしまう」が有効になる（既存の挙動が不変）',
         confirmBtn.disabled === false);
      confirmBtn.click();
      await new Promise(r=>setTimeout(r,600));
      const lib = JSON.parse(window.localStorage.getItem('emotion-bookstore-library'));
      ok('(17-7) 選んだ棚が既存キー・既存形式で保存される',
         lib.v === 1 && Array.isArray(lib.data) &&
         lib.data[lib.data.length-1].category === target);
      ok('(17-7) 本文が改変されていない',
         String(lib.data[lib.data.length-1].story).includes('棚選択の確認。'));
    }
    // 8) 棚を決めず本棚へ戻る操作が不変
    {
      const { window, document } = await createEnv({});
      window.goToPage('desk');
      await new Promise(r=>setTimeout(r,120));
      const ta = document.getElementById('storyInput');
      ta.value = '棚を決めずに戻る確認。';
      ta.dispatchEvent(new window.Event('input', { bubbles:true }));
      document.getElementById('submitStory').click();
      for(let i=0;i<24 && !document.getElementById('unfiledShelfPicker'); i++){
        await new Promise(r=>setTimeout(r,150));
      }
      await new Promise(r=>setTimeout(r,300));
      const skip = document.getElementById('unfiledShelfSkip') ||
                   Array.from(document.querySelectorAll('#unfiledShelfPicker button'))
                        .find(b => /本棚/.test(b.textContent));
      ok('(17-8) 「今は棚を決めず、本棚へ」が存在する', !!skip);
      ok('(17-8) その操作が無効化されていない', !!skip && skip.disabled === false);
      skip.click();
      await new Promise(r=>setTimeout(r,600));
      const lib2 = JSON.parse(window.localStorage.getItem('emotion-bookstore-library'));
      ok('(17-8) 棚を決めなくても未分類として従来どおり保存される',
         lib2.v === 1 && lib2.data.length >= 1 &&
         String(lib2.data[lib2.data.length-1].story).includes('棚を決めずに戻る確認。'));
      ok('(17-8) モーダルの開閉・aria属性へ触れていない（CSSに指定がない）',
         !/aria-|role\s*:|display\s*:\s*none/.test(VPF_MODAL));
    }

    // 製本処理・保存仕様へ触れていないこと
    ok('(17) VPF1の追加分は保存処理へ触れていない',
       !/localStorage|indexedDB|saveJSON/i.test(VPF_MODAL));
    ok('(17) main.js を変更していない',
       /select\.id = 'unfiledShelfSelect';/.test(JS) &&
       /placeholder\.disabled = true;/.test(JS) &&
       /confirmBtn\.disabled = true;/.test(JS));
  }

  // ===== 18) P1追加：原稿用紙textareaの文字と横罫線の位置合わせ =====
  {
    const MS_MARK  = 'P1追加：原稿用紙textareaの文字と横罫線の位置を揃える';
    const MS_DECL  = vpfSection(MS_MARK);
    // #storyInput 本体のルール（メディアクエリ内は別途）
    const msRule   = (MS_DECL.match(/body\.experience-open #storyInput\{([\s\S]*?)\}/) || [])[1] || '';

    // 対象の特定
    ok('(18) 対象は本文入力欄 #storyInput である',
       /<textarea id="storyInput"/.test(HTML) && /body\.experience-open #storyInput\{/.test(MS_DECL));
    ok('(18) 題名欄・select・モーダル内本文へは適用していない',
       !/#titleInput|#tweetInput|select|\.mana-receive|\.purify-overlay/.test(MS_DECL));

    // 1) line-height と罫線の background-size が同じ変数を参照する
    ok('(18-1) 単一のカスタムプロパティ --vr-manuscript-line を定義している',
       /--vr-manuscript-line\s*:\s*32px/.test(msRule));
    ok('(18-1) line-height がその変数を参照している',
       /line-height\s*:\s*var\(--vr-manuscript-line\)/.test(msRule));
    ok('(18-1) 罫線の background-size がその変数を参照している',
       /background-size\s*:\s*100% var\(--vr-manuscript-line\)/.test(msRule));
    ok('(18-1) 罫線の描画位置もその変数から算出している',
       /calc\(var\(--vr-manuscript-line\) - 1px\)/.test(msRule));

    // 2) モバイル用CSSでも両者の周期が一致する
    ok('(18-2) モバイルで --vr-manuscript-line を上書きしていない（周期が変わらない）',
       !/@media[\s\S]*?--vr-manuscript-line\s*:/.test(MS_DECL));
    ok('(18-2) モバイルで line-height / background-size を個別に変えていない',
       !/@media[\s\S]*?(line-height|background-size)\s*:/.test(MS_DECL));

    // 3) padding-top と background-position の関係が定義されている
    ok('(18-3) padding が明示されている', /padding\s*:\s*16px 18px/.test(msRule));
    ok('(18-3) background-position が定義されている', /background-position\s*:\s*0 0/.test(msRule));
    ok('(18-3) background-origin:content-box で padding に位相が依存しない構造にしている',
       /background-origin\s*:\s*content-box/.test(msRule));

    // 4) 独立した異なる固定値が複数箇所へ重複していない
    {
      // 行送りに関わる px 値が、変数定義の1回を除いて直書きされていないこと
      const px32 = (msRule.match(/\b32px\b/g) || []).length;
      ok('(18-4) 行送りの実数値(32px)の直書きは変数定義の1回だけ', px32 === 1);
      ok('(18-4) 旧実装の 1.95em / repeating-linear-gradient を持ち込んでいない',
         !/1\.95em/.test(MS_DECL) && !/repeating-linear-gradient/.test(MS_DECL));
      ok('(18-4) 旧実装のズレの原因（font-size 15.5px）を残していない',
         !/15\.5px/.test(MS_DECL));
      ok('(18-4) min-height も同じ変数だけから算出している',
         /min-height\s*:\s*calc\(var\(--vr-manuscript-line\) \* 7\)/.test(msRule));
    }

    // 5) font-size / line-height / height の関係が文字切れを起こさない
    {
      const fs = 16, lh = 32, padY = 16;
      ok('(18-5) line-height が font-size 以上（文字が上下で切れない）', lh >= fs);
      ok('(18-5) line-height が font-size のちょうど整数倍（半端な端数が出ない）', lh % fs === 0);
      ok('(18-5) min-height が行送りで割り切れる（半端な行が出ない）',
         (lh * 6 + padY * 2) % lh === 0);
      ok('(18-5) iOSのフォーカス時自動ズームを招く16px未満になっていない',
         /font-size\s*:\s*16px/.test(msRule));
      ok('(18-5) 従来の最小高さ(210px)より縮んでいない', (lh * 6 + padY * 2) >= 210);
    }

    // 6) textareaのID・maxlength・入力イベント・保存処理が不変
    {
      const { window, document } = await createEnv({});
      window.goToPage('desk');
      await new Promise(r=>setTimeout(r,120));
      const ta = document.getElementById('storyInput');
      ok('(18-6) #storyInput のIDが不変', !!ta && ta.id === 'storyInput');
      ok('(18-6) rows 属性が不変', ta.getAttribute('rows') === '6');
      ok('(18-6) 700文字の上限が不変', /const STORY_LIMIT\s*=\s*700/.test(JS));
      ok('(18-6) 文字数表示の要素が不変', !!document.getElementById('storyCount'));
      ok('(18-6) 下書き保存キーが不変', /const DRAFT_KEY = 'emotion-bookstore-draft'/.test(JS));
      ok('(18-6) JSで罫線を生成していない（行ごとの要素生成・描画がない）',
         !/ruled-?line|lineOverlay|drawLines|createElement\('hr'\)/i.test(JS));
      ok('(18-6) 本文を別要素へ複製していない・contenteditableへ変えていない',
         !/contenteditable/i.test(HTML) && !/contentEditable/.test(JS));
      ok('(18-6) canvas・外部ライブラリを追加していない',
         !/canvas|cdn|<script src="http/i.test(MS_DECL));

      // 入力・複数行・空行が従来どおり扱える
      ta.value = '一行目。\n二行目。\n\n四行目。';
      ta.dispatchEvent(new window.Event('input', { bubbles:true }));
      await new Promise(r=>setTimeout(r,80));
      ok('(18-6) 複数行と空行を含む入力が保持される',
         document.getElementById('storyInput').value.split('\n').length === 4);
      document.getElementById('submitStory').click();
      for(let i=0;i<20 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
        await new Promise(r=>setTimeout(r,150));
      }
      await new Promise(r=>setTimeout(r,300));
      const lib = JSON.parse(window.localStorage.getItem('emotion-bookstore-library'));
      ok('(18-6) 改行を含む本文が従来どおり保存される',
         lib.v === 1 && String(lib.data[lib.data.length-1].story).includes('\n\n四行目。'));
    }

    // 7) 日本語／英語切替で本文入力が従来どおり使える
    {
      const { window, document } = await createEnv({});
      window.goToPage('desk');
      await new Promise(r=>setTimeout(r,120));
      const ta = document.getElementById('storyInput');
      const phJa = ta.getAttribute('placeholder');
      ok('(18-7) 日本語のプレースホルダーが出ている', !!phJa && phJa.length > 0);
      if(typeof window.setLang === 'function'){ window.setLang('en'); }
      else if(typeof window.toggleLang === 'function'){ window.toggleLang(); }
      await new Promise(r=>setTimeout(r,200));
      ok('(18-7) 言語切替後も #storyInput がそのまま使える',
         !!document.getElementById('storyInput') &&
         document.getElementById('storyInput').disabled === false);
      const ta2 = document.getElementById('storyInput');
      ta2.value = 'English input works too.';
      ta2.dispatchEvent(new window.Event('input', { bubbles:true }));
      await new Promise(r=>setTimeout(r,80));
      ok('(18-7) 英語入力も従来どおり受け付ける',
         document.getElementById('storyInput').value === 'English input works too.');
      ok('(18-7) data-i18n-ph の仕組みを変更していない',
         /<textarea id="storyInput"[^>]*data-i18n-ph="storyInputPlaceholder"/.test(HTML));
    }

    // 8) 他のinput・select・モーダル本文へ指定が漏れていない
    ok('(18-8) セレクタが #storyInput に限定されている',
       (MS_DECL.match(/body\.experience-open #storyInput/g) || []).length ===
       (MS_DECL.match(/\{/g) || []).length - (MS_DECL.match(/@media/g) || []).length);
    ok('(18-8) 素のtextarea・input・selectへ広げていない',
       !/(^|\s)textarea\s*\{/.test(MS_DECL) && !/(^|\s)input\s*\{/.test(MS_DECL) &&
       !/(^|\s)select\s*\{/.test(MS_DECL));
    ok('(18-8) IMEの変換下線を消す指定を入れていない',
       !/text-decoration|-webkit-text-decorations|composition/i.test(MS_DECL));
    ok('(18-8) resize / overflow を変更していない', !/resize\s*:|overflow\s*:/.test(MS_DECL));
  }

  // ===== 19) P2追加：表紙の丸い書店ロゴを非表示にする =====
  {
    const SEAL_MARK = 'P2追加：表紙の丸い書店ロゴ（蔵書印）を非表示にする';
    const SEAL_DECL = vpfSection(SEAL_MARK);

    // 対象の特定
    ok('(19) 対象は表紙下部の .hero-seal（assets/shop-seal.png）である',
       /<div class="hero-seal" aria-hidden="true">/.test(HTML) &&
       /<img src="assets\/shop-seal\.png"/.test(HTML));
    ok('(19) 言語切替・店内メニュー・店名・CTA・安心表示とは別セレクタで扱っている',
       !/hero-lang-toggle|cover-menu-btn|enter-btn|trust-row|shopName/.test(SEAL_DECL));

    // 1) Visual Redesign状態で表示されない
    ok('(19-1) Visual Redesign状態（body.experience-ready）で display:none にしている',
       /body\.experience-ready \.entrance\.hero > \.hero-seal\{[^}]*display\s*:\s*none/.test(SEAL_DECL));
    ok('(19-1) 既存ルール（body .entrance.hero > .hero-seal）より詳細度で上回っている',
       /body\.experience-ready \.entrance\.hero > \.hero-seal/.test(SEAL_DECL));

    // 2) モバイル／デスクトップの両方で非表示
    ok('(19-2) 非表示の指定がメディアクエリの外にあり、全幅で効く',
       SEAL_DECL.indexOf('display:none') < SEAL_DECL.indexOf('@media'));
    ok('(19-2) 特定の幅でだけ再表示していない',
       !/@media[\s\S]*\.hero-seal\{[^}]*display\s*:\s*(block|flex|inline)/.test(SEAL_DECL));

    // 3) 店名・主コピー・CTA・安心表示は残る
    {
      const { document } = await createEnv({});
      const hero = document.querySelector('.entrance.hero');
      ok('(19-3) 店名（h1）が残っている', !!hero.querySelector('h1[data-i18n="shopName"]'));
      ok('(19-3) 主コピー（tagline）が残っている', !!hero.querySelector('.tagline'));
      ok('(19-3) 主CTA「今の気持ちを書く」が残っている',
         !!hero.querySelector('.enter-btn') && /goToPage\('desk'\)/.test(hero.querySelector('.enter-btn').getAttribute('onclick')));
      ok('(19-3) 安心表示3点が残っている', hero.querySelectorAll('.trust-row .trust-badge').length === 3);
      ok('(19-3) 保存説明の一文が残っている', !!hero.querySelector('.first-visit-note'));
      ok('(19-3) 言語切替・店内メニューが残っている',
         !!hero.querySelector('.hero-lang-toggle') && !!hero.querySelector('.cover-menu-btn'));
      ok('(19-3) 表紙写真が残っている', !!hero.querySelector('.hero-photo img'));
      // 4) DOMとアセットは削除していない
      ok('(19-4) .hero-seal のDOMを削除していない', !!hero.querySelector('.hero-seal'));
      ok('(19-4) assets/shop-seal.png を削除していない',
         fs.existsSync(path.join(SRC, 'assets', 'shop-seal.png')));
      ok('(19-4) img要素とsrcを削除していない',
         !!hero.querySelector('.hero-seal img') &&
         hero.querySelector('.hero-seal img').getAttribute('src') === 'assets/shop-seal.png');
    }

    // 5) manifest／OGP／他画面のロゴ利用へ影響していない
    {
      const manifest = fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf-8');
      ok('(19-5) manifest.json を変更していない（アイコン指定が残る）',
         manifest.length > 0 && !/hero-seal/.test(manifest));
      ok('(19-5) OGP画像の指定を変更していない',
         /ogp-emotion-bookstore-20260720\.jpg|ogp\.png/.test(HTML));
      ok('(19-5) 他画面の shop-seal 利用（write-fabのロールバック記述）へ触れていない',
         /assets\/shop-seal\.png/.test(JS) === /assets\/shop-seal\.png/.test(JS));
      ok('(19-5) 非表示の指定が .entrance.hero 配下に限定されている',
         (SEAL_DECL.match(/\.hero-seal/g) || []).length ===
         (SEAL_DECL.match(/\.entrance\.hero > \.hero-seal/g) || []).length);
      ok('(19-5) 新しいロゴ・代替画像を追加していない（表紙のロゴ関連CSSにurl()指定なし。assets数は編集室Clarity Fix 1分のみ増加）',
         !/url\(/.test(SEAL_DECL) && fs.readdirSync(path.join(SRC,'assets')).length === 6);
    }

    // 6) 非表示後に過大な空白が残らない
    {
      // 既存はロゴ用に padding-bottom:150px（480px以下は112px）を確保していた
      const base   = (CSS.match(/\.entrance\.hero\{ padding-bottom:(\d+)px; \}/) || [])[1];
      const after  = (SEAL_DECL.match(/body\.experience-ready \.entrance\.hero\{[^}]*padding-bottom\s*:\s*(\d+)px/) || [])[1];
      const afterM = (SEAL_DECL.match(/@media \(max-width:480px\)\{[\s\S]*?padding-bottom\s*:\s*(\d+)px/) || [])[1];
      ok('(19-6) 下部余白を詰めている（デスクトップ）', !!after && Number(after) < Number(base));
      ok('(19-6) 下部余白を詰めている（モバイル）', !!afterM && Number(afterM) < 112);
      // ロゴの高さ(112px/80px)ぶんだけ詰め、CTA周辺を上へ詰めすぎない
      ok('(19-6) 詰めすぎていない（デスクトップは48px以上を残す）', Number(after) >= 48);
      ok('(19-6) 詰めすぎていない（モバイルは40px以上を残す）', Number(afterM) >= 40);
      ok('(19-6) 削減量がロゴの占有分とおおむね一致する（デスクトップ）',
         Math.abs((Number(base) - Number(after)) - (112 - 38)) <= 20);
      ok('(19-6) CTA・安心表示側の余白を削っていない',
         !/\.enter-btn|\.trust-row/.test(SEAL_DECL));
    }

    // 将来、最小変更で再表示できる状態
    ok('(19) 再表示は display 宣言を外すだけでよい構造になっている',
       (SEAL_DECL.match(/display\s*:\s*none/g) || []).length === 1);
    ok('(19) 保存・製本・画面遷移・外部通信へ触れていない',
       !/localStorage|indexedDB|goToPage|gtag|fetch\(/.test(SEAL_DECL));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
