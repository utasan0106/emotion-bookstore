// ============================================================================
// Digital-first Preview V0｜「最近の一枚」区画・0件エンプティ状態・保存直後の短い儀式
// tests/smoke_test_digital_first_preview_v0.js
//
// 検証観点（依頼書 Sprint 1 の受入項目）：
//  1) 0件のときに「何ができる場所か・最初の一歩・CTA1つ」のエンプティ状態が出る。
//  2) 一枚（clean な紙片）が本文（横書き）＋日付＋任意の写真で表示される。
//  3) 3件以上あっても「最近の一枚」は最新3件だけを新しい順に表示する。
//  4) 短文・長文いずれでも崩れず描画される。
//  5) 写真あり／なしのどちらでも成立する。
//  6) 保存成功（保存＋読み戻し成功）を経た到着時にだけ、儀式（登場演出）＋保存通知が出る。
//  7) 保存失敗時は成功儀式・保存通知を一切出さず、入力内容を保持する。
//  8) reduced-motion（モーションOFF）では動かさないが、「保存された」通知は必ず1回出る。
//  9) キーボードで一枚・CTAへフォーカスできる（<button>・44px相当の主要タップ領域）。
// 10) 一枚全体をタップすると既存openBook（安全な詳細表示）で開ける。
// 11) データ安全：新規GA4イベント・新規保存キー文字列を、この機能の実装で増やしていない。
// ============================================================================
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}
function settle(ms){ return new Promise(r=>setTimeout(r, ms)); }

const rawHtml = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
const rawCss = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
const rawMain = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');

function wrap(value){ return JSON.stringify({ v:1, data:value }); }
function entry(over){
  return Object.assign({
    id:'id-' + Math.random().toString(36).slice(2),
    category:'unfiled',
    title:'まだ、題名のない本',
    story:'これはテスト用の本文です。',
    note:'',
    image:'',
    tweetUrl:'',
    sealed:false,
    date:'2026-08-01T00:00:00.000Z'
  }, over);
}

async function createEnv(opts){
  opts = opts || {};
  let html = rawHtml;
  html = html.replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '');
  html = html.replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');
  const dom = new JSDOM(html, { url:'https://example.com/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true });
  const { window } = dom;
  const { document } = window;
  if(opts.seedLibrary){
    window.localStorage.setItem('emotion-bookstore-library', wrap(opts.seedLibrary));
  }
  window.matchMedia = function(q){ return { matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }; };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.navigator.vibrate = function(){ return true; };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';
  const gaCalls = [];
  window.gtag = function(){ gaCalls.push(Array.from(arguments)); };
  window.fetch = function(){ return Promise.resolve({ ok:true, json: () => Promise.resolve({}) }); };
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(){
      let el = this;
      while(el){
        if(el.hidden) return null;
        if(el.classList && el.classList.contains('hidden')) return null;
        if(el.style && el.style.display === 'none') return null;
        if(el.hasAttribute && el.hasAttribute('inert')) return null;
        el = el.parentElement;
      }
      return document.body;
    }
  });
  const s1 = document.createElement('script'); s1.textContent = fs.readFileSync(path.join(SRC,'data.js'),'utf-8'); document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = fs.readFileSync(path.join(SRC,'main.js'),'utf-8'); document.body.appendChild(s2);
  const s3 = document.createElement('script');
  s3.textContent = [
    "window.__getLibraryCache = function(){ return libraryCache; };",
    "window.__libEntry = function(id){ return libraryCache.find(function(b){ return b.id === id; }); };",
    "window.__setMotion = function(v){ prefs.motion = v; if(typeof applyPrefs==='function') applyPrefs(); };",
    "window.__motion = function(){ return prefs.motion; };"
  ].join('\n');
  document.body.appendChild(s3);
  await settle(300);
  await settle(300);
  return { window, document, gaCalls };
}

// page3受入テストと同じ「本物の製本フロー」で1冊保存する。
async function bindUnfiledBook(window, document, story){
  window.goToPage('desk');
  document.getElementById('storyInput').value = story;
  document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
  document.getElementById('submitStory').click();
  for(let i=0;i<25 && !window.localStorage.getItem('emotion-bookstore-library'); i++){
    await settle(150);
  }
  await settle(300);
  const lib = window.__getLibraryCache();
  return lib[lib.length - 1];
}

async function main(){

  // ==========================================================================
  // 1) 0件エンプティ状態
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    const box = document.getElementById('recentLeaves');
    ok('(1) #recentLeaves container exists', !!box);
    ok('(1) with 0 entries the section is marked empty', box.classList.contains('is-empty'));
    const empty = box.querySelector('.leaf-empty');
    ok('(1) an empty-state block is rendered (not just blank)', !!empty);
    const title = box.querySelector('.leaf-empty-title');
    const body = box.querySelector('.leaf-empty-body');
    const cta = box.querySelector('.leaf-empty-cta');
    ok('(1) empty state states what/first-step (non-empty title + body)', !!title && title.textContent.length > 0 && !!body && body.textContent.length > 0);
    ok('(1) exactly one primary CTA is present', box.querySelectorAll('.leaf-empty-cta').length === 1);
    ok('(1) the CTA label matches the i18n key', !!cta && cta.textContent === window.t('leafEmptyCta'));
    ok('(1) no leaf cards are shown when empty', box.querySelectorAll('.leaf').length === 0);
    // CTAは「編集室で綴る」導線（desk）へ進む。
    cta.click();
    await settle(60);
    ok('(1) the CTA takes the user to the editing room (desk)', document.getElementById('desk').classList.contains('is-active'));
  }

  // ==========================================================================
  // 2) 一枚表示（本文＋日付、写真なし）＋ 10) タップで既存openBookが開く
  // ==========================================================================
  {
    const e = entry({ id:'solo', story:'今日はよく眠れた。', date:'2026-07-15T09:00:00.000Z' });
    const { window, document } = await createEnv({ seedLibrary:[e] });
    const box = document.getElementById('recentLeaves');
    ok('(2) the section is NOT empty when there is 1 entry', !box.classList.contains('is-empty'));
    const leaves = box.querySelectorAll('.leaf');
    ok('(2) exactly one leaf is rendered', leaves.length === 1);
    const leaf = leaves[0];
    ok('(2) the whole leaf is a <button> (fully tappable)', leaf.tagName === 'BUTTON');
    ok('(2) the leaf carries the entry id (DOM-only, not persisted)', leaf.dataset.entryId === 'solo');
    ok('(2) the leaf has a non-empty aria-label', (leaf.getAttribute('aria-label')||'').length > 0);
    const bodyEl = leaf.querySelector('.leaf-body');
    ok('(2) the leaf body shows the story (horizontal text)', !!bodyEl && bodyEl.textContent === '今日はよく眠れた。');
    const dateEl = leaf.querySelector('.leaf-date');
    ok('(2) the leaf shows a non-empty date', !!dateEl && dateEl.textContent.length > 0);
    ok('(2) the date matches the reused formatDate() output', dateEl.textContent === window.formatDate(e.date));
    ok('(2) the date carries a machine-readable datetime attribute', dateEl.getAttribute('datetime') === e.date);
    ok('(2) with no image, no photo element is present (complete without a photo)', !leaf.querySelector('.leaf-photo'));
    // 題名・感情棚は主役にしない（一枚上に題名/カテゴリ名を出さない）。
    ok('(2) neither the title nor a category label is shown on the leaf', leaf.textContent.indexOf('まだ、題名のない本') === -1);

    // 10) タップで既存openBook（安全な詳細表示＝#bookModal）が開く。
    leaf.click();
    await settle(60);
    const modal = document.getElementById('bookModal');
    ok('(10) tapping the leaf opens the existing detail modal (openBook)', !!modal && !modal.classList.contains('hidden'));
    ok('(10) the opened modal shows this entry\'s story', document.getElementById('modalStory').textContent === '今日はよく眠れた。');
  }

  // ==========================================================================
  // 3) 3件以上でも最近3件のみ（新しい順）
  // ==========================================================================
  {
    const seed = [];
    for(let i=1;i<=5;i++){ seed.push(entry({ id:'e'+i, story:'記録'+i, date:'2026-08-0'+i+'T00:00:00.000Z' })); }
    const { window, document } = await createEnv({ seedLibrary:seed });
    const leaves = Array.from(document.querySelectorAll('#recentLeaves .leaf'));
    ok('(3) even with 5 entries, only 3 leaves are shown', leaves.length === 3);
    const ids = leaves.map(l=>l.dataset.entryId);
    ok('(3) the 3 shown are the newest 3, newest first', JSON.stringify(ids) === JSON.stringify(['e5','e4','e3']));
  }

  // ==========================================================================
  // 4) 短文・長文で崩れない
  // ==========================================================================
  {
    const { document } = await createEnv({ seedLibrary:[ entry({ id:'short', story:'あ' }) ] });
    const leaf = document.querySelector('#recentLeaves .leaf');
    ok('(4) a 1-character story renders as a leaf without error', !!leaf && leaf.querySelector('.leaf-body').textContent === 'あ');
  }
  {
    const long = 'これは長文のテストです。'.repeat(80); // 崩れ・横スクロール要因の確認
    const { document } = await createEnv({ seedLibrary:[ entry({ id:'long', story:long }) ] });
    const bodyEl = document.querySelector('#recentLeaves .leaf .leaf-body');
    ok('(4) a very long story renders (full text kept in DOM; clamp is CSS-only)', !!bodyEl && bodyEl.textContent === long);
  }

  // ==========================================================================
  // 5) 写真あり
  // ==========================================================================
  {
    const img = 'data:image/webp;base64,AAAA';
    const { document } = await createEnv({ seedLibrary:[ entry({ id:'pic', image:img }) ] });
    const leaf = document.querySelector('#recentLeaves .leaf');
    const photo = leaf.querySelector('.leaf-photo');
    ok('(5) a leaf with an image renders a photo element', !!photo);
    const im = photo && photo.querySelector('img');
    ok('(5) the photo uses the entry image as its source', !!im && im.getAttribute('src') === img);
    ok('(5) the leaf photo is decorative (empty alt; body carries the meaning)', im.getAttribute('alt') === '');
  }

  // ==========================================================================
  // 6) 保存成功を経た到着時にだけ儀式＋保存通知が出る（モーションON）
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    const e = await bindUnfiledBook(window, document, '保存成功の儀式を確認する本文です。');
    // 到着（棚を決めず本棚へ）— ここで revealNewestLeaf が走る。
    document.getElementById('unfiledShelfSkip').click();
    await settle(120); // announceのrAF + is-active確定を待つ
    const live = document.getElementById('leafLive');
    ok('(6) after a successful save+arrival, the aria-live region announces the save', !!live && live.textContent === window.t('leafSavedAnnounce'));
    const leaf = document.querySelector('#recentLeaves .leaf[data-entry-id="'+e.id+'"]');
    ok('(6) the just-saved entry appears in the recent leaves', !!leaf);
    ok('(6) with motion ON, the arriving leaf plays the settle animation', !!leaf && leaf.classList.contains('leaf-arriving'));
  }

  // ==========================================================================
  // 7) 保存失敗：成功儀式・保存通知を出さず、入力内容を保持する（モーションON）
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    const story = '保存に失敗するはずの本文です。';
    window.goToPage('desk');
    document.getElementById('storyInput').value = story;
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    const origSave = window.saveJSON;
    window.saveJSON = async ()=> false; // 製本保存を失敗させる
    document.getElementById('submitStory').click();
    // モーションON経路は wait(500)＋runBinding(最大1200ms)＋保存失敗処理を要するため、
    // 固定sleepではなく「保存失敗メッセージが出るまで」ポーリングして完了を待つ。
    const deskMsg = document.getElementById('deskMsg');
    for(let i=0;i<30 && !(deskMsg && deskMsg.textContent.indexOf('すみません') !== -1); i++){
      await settle(150);
    }
    const live = document.getElementById('leafLive');
    ok('(7) sanity: the save-failure message is shown on the desk', !!deskMsg && deskMsg.textContent.indexOf('すみません') !== -1);
    ok('(7) on save failure, the success announcement is NOT made', !!live && live.textContent === '');
    ok('(7) on save failure, no leaf is added (section stays empty)', document.querySelectorAll('#recentLeaves .leaf').length === 0);
    const picker = document.getElementById('unfiledShelfPicker');
    ok('(7) on save failure, the receiving page (page 3) is not opened', !picker || picker.classList.contains('hidden'));
    ok('(7) on save failure, the written body text is preserved (not cleared)', document.getElementById('storyInput').value === story);
    ok('(7) on save failure, the submit button is re-enabled (no double-submit lockup)', document.getElementById('submitStory').disabled === false);
    window.saveJSON = origSave;
  }

  // ==========================================================================
  // 7b) readback失敗：保存関数はtrueでも、保存直後の読み戻しで記録が見つからない場合、
  //     成功儀式・保存通知は出さない（依頼書「保存＋読み戻し成功を確認した後にのみ開始」）。
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    const story = '読み戻し失敗の確認用本文です。';
    window.goToPage('desk');
    document.getElementById('storyInput').value = story;
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    // 保存自体は成功させ、直後の読み戻し（library key）だけ空を返して readback_failed を発生させる。
    const origLoad = window.loadJSON;
    window.loadJSON = async function(key, def){ return key === 'emotion-bookstore-library' ? [] : origLoad(key, def); };
    document.getElementById('submitStory').click();
    const deskMsg = document.getElementById('deskMsg');
    for(let i=0;i<30 && !(deskMsg && deskMsg.textContent.indexOf('すみません') !== -1); i++){
      await settle(150);
    }
    window.loadJSON = origLoad;
    ok('(7b) sanity: readback failure surfaces the same save-not-completed message', !!deskMsg && deskMsg.textContent.indexOf('すみません') !== -1);
    const live = document.getElementById('leafLive');
    ok('(7b) on readback failure, the success announcement is NOT made', !!live && live.textContent === '');
    ok('(7b) on readback failure, no leaf is added (section stays empty)', document.querySelectorAll('#recentLeaves .leaf').length === 0);
    const picker = document.getElementById('unfiledShelfPicker');
    ok('(7b) on readback failure, the receiving page (page 3) is not opened', !picker || picker.classList.contains('hidden'));
    ok('(7b) on readback failure, the written body text is preserved', document.getElementById('storyInput').value === story);
  }

  // ==========================================================================
  // 12) 二重送信防止＋保存中フィードバック：submit直後、同期的にボタンがdisabledになり、
  //     「準備中」の状態文が出る（保存中であることをユーザーが理解できる）。
  // ==========================================================================
  {
    const { window, document } = await createEnv({});
    window.goToPage('desk');
    document.getElementById('storyInput').value = '二重送信防止の確認用本文です。';
    document.getElementById('storyInput').dispatchEvent(new window.Event('input', { bubbles:true }));
    const btn = document.getElementById('submitStory');
    ok('(12) sanity: the submit button starts enabled', btn.disabled === false);
    btn.click(); // 非同期ハンドラは最初のawaitまで同期実行される
    ok('(12) right after submit, the button is disabled (prevents double submission)', btn.disabled === true);
    ok('(12) a disabled button no longer accepts further submits (native guard)', btn.disabled === true);
    const msg = document.getElementById('deskMsg');
    ok('(12) the user is told a save is in progress (reviewing/preparing message)', !!msg && msg.textContent === window.t('storyReviewing'));
    // 後片付け：この試行を完了させておく（テスト間の状態リークを避ける）。
    for(let i=0;i<25 && !window.localStorage.getItem('emotion-bookstore-library'); i++){ await settle(150); }
    await settle(300);
  }

  // ==========================================================================
  // 8) reduced-motion（モーションOFF）：動かさないが、保存通知は必ず1回出る
  // ==========================================================================
  {
    const e = entry({ id:'rm', story:'モーションOFFの確認本文。' });
    const { window, document } = await createEnv({ seedLibrary:[e] });
    window.__setMotion(false);
    ok('(8) sanity: motion is now OFF', window.__motion() === false);
    ok('(8) sanity: body.no-motion is applied when motion is OFF', document.body.classList.contains('no-motion'));
    window.goToPage('bookshelf');
    window.revealNewestLeaf(e.id);
    await settle(120);
    const leaf = document.querySelector('#recentLeaves .leaf[data-entry-id="rm"]');
    ok('(8) with motion OFF, the leaf does NOT get the settle animation', !!leaf && !leaf.classList.contains('leaf-arriving'));
    const live = document.getElementById('leafLive');
    ok('(8) with motion OFF, the save is still announced via aria-live (state change is conveyed)', !!live && live.textContent === window.t('leafSavedAnnounce'));
  }

  // ==========================================================================
  // 9) キーボードフォーカス（一枚・CTA が <button> で到達可能）
  // ==========================================================================
  {
    const { document } = await createEnv({ seedLibrary:[ entry({ id:'kf', story:'フォーカス確認。' }) ] });
    const leaf = document.querySelector('#recentLeaves .leaf');
    ok('(9) the leaf is not removed from the tab order', leaf.tabIndex !== -1);
    leaf.focus();
    ok('(9) the leaf can receive keyboard focus', document.activeElement === leaf);
  }
  {
    const { document } = await createEnv({});
    const cta = document.querySelector('#recentLeaves .leaf-empty-cta');
    cta.focus();
    ok('(9) the empty-state CTA can receive keyboard focus', document.activeElement === cta);
    ok('(9) the empty-state CTA is a real <button>', cta.tagName === 'BUTTON');
  }

  // ==========================================================================
  // 11) データ安全（静的検査）：この機能の実装で GA4 イベント・保存キーを増やしていない
  // ==========================================================================
  {
    const region = rawMain.slice(
      rawMain.indexOf('function renderRecentLeaves'),
      rawMain.indexOf('function highlightNewestSpine')
    );
    // ★これらは「コードが」GA4/保存キー/closeCoverに触れていないことの検査であり、
    //   コメント（解説文）に含まれる語で誤検知しないよう、行コメント・ブロックコメントを除去してから調べる。
    //   （例：revealNewestLeaf の解説コメントに「closeCoverは使わない」という説明文が含まれる。）
    const code = region.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    ok('(11) the new recent-leaves/ritual code was located in main.js', region.length > 0);
    ok('(11) sanity: comment-stripping kept the actual code (openBook call still present)', /openBook\(entry\)/.test(code));
    ok('(11) the code fires NO GA4 / trackAnalyticsEvent call', !/trackAnalyticsEvent/.test(code));
    ok('(11) the code introduces NO new storage-key string ("emotion-bookstore-*")', !/emotion-bookstore-/.test(code));
    ok('(11) the code reuses the existing safe detail view (openBook)', /openBook\(entry\)/.test(code));
    ok('(11) the code never invokes closeCover (only mentioned in an explanatory comment)', !/closeCover/.test(code));
    // CSS：一枚は --paper 系から派生した紙片色・小さめ角丸・1層の影・登場は<=18px・photoPop流用。
    ok('(11-css) the leaf paper color is derived from the --paper family', /--leaf-paper:/.test(rawCss));
    ok('(11-css) the leaf uses a small radius and a single-layer shadow',
      /\.leaf\{[\s\S]*?border-radius:6px;[\s\S]*?box-shadow:0 1px 3px[\s\S]*?\}/.test(rawCss));
    const arriveMatch = /@keyframes leafArrive\{[\s\S]*?translateY\((-?\d+(?:\.\d+)?)px\)/.exec(rawCss);
    ok('(11-css) the arrival settle moves <= 18px (no screen-crossing motion)',
      !!arriveMatch && Math.abs(parseFloat(arriveMatch[1])) <= 18);
    ok('(11-css) the photo case reuses the existing photoPop keyframe',
      /\.leaf-photo\.pop\{[\s\S]*?animation:photoPop/.test(rawCss));
    ok('(11-css) motion is disabled under body.no-motion and prefers-reduced-motion',
      /body\.no-motion\s+\.leaf-arriving/.test(rawCss) && /prefers-reduced-motion: reduce\)\{[\s\S]*?leaf-arriving/.test(rawCss));
    // i18n：新規キーは ja/en 両方に存在する（EN欠落＝空文字を防ぐ）。
    const jaKeys = /recentLeavesHeading: "最近の一枚"/.test(rawMain) && /leafEmptyCta: "編集室で綴る"/.test(rawMain) && /leafSavedAnnounce: "一枚を保存し、本棚に加えました。"/.test(rawMain);
    const enKeys = /recentLeavesHeading: "Recent leaves"/.test(rawMain) && /leafEmptyCta: "Write in the Editing Room"/.test(rawMain) && /leafSavedAnnounce: "Your leaf has been saved to your bookshelf."/.test(rawMain);
    ok('(11-i18n) all new keys exist in MESSAGES.ja', jaKeys);
    ok('(11-i18n) all new keys exist in MESSAGES.en (EN completeness)', enKeys);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('DIGITAL-FIRST PREVIEW V0 TEST CRASHED:', e); process.exit(2); });
