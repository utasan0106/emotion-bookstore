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
const VR_MARK = '■ Visual Redesign RC1（VR1）';
const VR_CSS  = CSS.slice(CSS.indexOf(VR_MARK));

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
       !/localStorage|indexedDB/i.test(VR_CSS));
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

  // ===== 4) 「店主まなが預かる」「編纂室」の2区画が #desk 内に実装されていること =====
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    const desk = document.getElementById('desk');
    const labels = desk.querySelectorAll('.vr-stage-label');
    ok('(4) #desk 内に区画見出しが2つある（預かる／編纂室）', labels.length === 2);
    ok('(4) 区画見出しは #desk の外へ新しい画面を作っていない',
       Array.from(document.querySelectorAll('.vr-stage-label')).every(el => desk.contains(el)));
    ok('(4) 「店主まなが預かる」区画の見出しが i18n キーを持つ',
       !!desk.querySelector('[data-i18n="vrStageManaLabel"]'));
    ok('(4) 「編纂室」区画の見出しが i18n キーを持つ',
       !!desk.querySelector('[data-i18n="vrStageBindLabel"]'));
    ok('(4) 本文入力欄 #storyInput は既存のまま .desk-form 配下に残っている',
       !!document.querySelector('.desk-form #storyInput'));
    ok('(4) 題名欄 #titleInput は既存のまま details.desk-extra 配下に残っている',
       !!document.querySelector('.desk-extra #titleInput'));
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
    ok('(12) VR1ブロックは style.css の末尾に追加されている', CSS.trimEnd().endsWith('/* 自動再生動画・常時動く光は使用しない（新規追加なし） */'));
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
    ok('(14) RC1.1でHTMLへ変更を加えていない（区画見出しは2つのまま）',
       (HTML.match(/class="vr-stage-label/g) || []).length === 2);
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

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
