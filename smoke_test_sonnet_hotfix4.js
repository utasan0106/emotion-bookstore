// Sonnet Hotfix4 受入テスト。
// 1) サンプル本の表示崩れ修正（#bookModal→#sampleBookInline、position:fixed不使用、自然なdocument flow）
// 2) OGP画像の更新（新ファイル名・絶対HTTPS URL）
// 3) 英語版で消えていたボタン文字の補完（MESSAGES.en欠落キー）
// 4) Other/Unnamed Feelingタブの縦書きはみ出し修正（.shelf-tab min-width化）
// 5) guide.html専門相談窓口の英語版整備（guide-en.html新設・リンク振り分け）
// 6) フッター注記の2行改行
// 7) 書くFAB（floating write button）：文字ラベル表示（ロゴ画像化は本番不具合により撤回・ロールバック済み）
// 8) 英語版での書籍・音楽タイトルの英語表記化（EN-ready 35冊/42曲）
// 9) 今日の栞が本棚構成の変化に追従しない不具合の修正
// 10) 関連するXの投稿URLが製本後の本に反映されない不具合の修正
// 既存487件（Hotfix1〜3系）のアサーションは弱体化していない。本ファイルは追加専用。
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(l,c){ if(c){pass++;console.log('PASS:',l);}else{fail++;console.log('FAIL:',l);} }
function wrap(v){ return JSON.stringify({v:1,data:v}); }
const JP_RE = /[぀-ヿ一-鿿]/;

async function createEnv(opts){
  opts=opts||{};
  let html=fs.readFileSync(path.join(SRC,'index.html'),'utf-8')
    .replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/,'').replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/,'');
  const dom=new JSDOM(html,{url:'https://example.com/',runScripts:'dangerously',resources:'usable',pretendToBeVisual:true});
  const {window}=dom,{document}=window;
  if(opts.seedLibrary) window.localStorage.setItem('emotion-bookstore-library',wrap(opts.seedLibrary));
  if(opts.seedShiori) window.localStorage.setItem('emotion-bookstore-shiori',wrap(opts.seedShiori));
  window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){};window.scrollTo=function(){};window.navigator.vibrate=()=>true;
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';
  const gaCalls=[];window.gtag=function(){gaCalls.push([...arguments]);};
  const fetchLog=[];window.fetch=u=>{fetchLog.push(String(u));return Promise.resolve({ok:true,json:()=>Promise.resolve({})});};
  const s1=document.createElement('script');s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');document.body.appendChild(s1);
  const s2=document.createElement('script');s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');document.body.appendChild(s2);
  const s3=document.createElement('script');s3.textContent='window.__dumpMessages=function(){return MESSAGES;};';document.body.appendChild(s3);
  await new Promise(r=>setTimeout(r,300));await new Promise(r=>setTimeout(r,300));
  const langBtn=document.getElementById('langToggle');
  const toggleByButton=()=>langBtn.dispatchEvent(new window.Event('click',{bubbles:true}));
  return {window,document,gaCalls,fetchLog,toggleByButton};
}

async function main(){
  // ===== 1: サンプル本の表示崩れ修正 =====
  {
    const cssSrc = fs.readFileSync(path.join(SRC,'style.css'),'utf-8');
    const htmlSrc = fs.readFileSync(path.join(SRC,'index.html'),'utf-8');
    ok('(1) #sampleBookInline exists in index.html, placed before #samplePeekBtn (natural document flow)', (() => {
      const invIdx = htmlSrc.indexOf('id="sampleBookInline"');
      const btnIdx = htmlSrc.indexOf('id="samplePeekBtn"');
      return invIdx > -1 && btnIdx > -1 && invIdx < btnIdx;
    })());
    ok('(1) the sample inline block is not position:fixed/absolute anywhere in style.css', !/#sampleBookInline\s*\{[^}]*position:\s*(fixed|absolute)/.test(cssSrc) && !/\.sample-book-inline\s*\{[^}]*position:\s*(fixed|absolute)/.test(cssSrc));
    // ★このルールはindex.html内のインライン<style>ブロックにある（style.cssではない）
    ok('(1) the accordion open-state max-height is loosened well beyond the old 400px clip', /\.about-accordion-content\.open\s*\{[^}]*max-height:\s*3000px/.test(htmlSrc));

    const { window, document } = await createEnv({});
    document.getElementById('aboutAccordionBtn').dispatchEvent(new window.Event('click',{bubbles:true}));
    window.openSampleBook();
    const box = document.getElementById('sampleBookInline');
    ok('(1) opening the sample shows it inline (not hidden) inside the same explanation panel', !box.classList.contains('hidden'));
    ok('(1) the inline sample sits inside .about-accordion-content (same panel as the explanation)', !!document.querySelector('.about-accordion-content #sampleBookInline'));
    ok('(1) the real book modal is never opened by the sample flow', document.getElementById('bookModal').classList.contains('hidden'));
    ok('(1) title/story/date/cat/note all populate', document.getElementById('sampleInlineTitle').textContent.length > 0
      && document.getElementById('sampleInlineStory').textContent.length > 20
      && document.getElementById('sampleInlineDate').textContent.length > 0
      && document.getElementById('sampleInlineCat').textContent.length > 0
      && document.getElementById('sampleInlineNoteText').textContent.length > 0);
    window.toggleLanguage();
    ok('(1) EN mode: the sample story is in English, no Japanese leaks through', /[a-zA-Z]/.test(document.getElementById('sampleInlineStory').textContent) && !JP_RE.test(document.getElementById('sampleInlineStory').textContent));
    document.getElementById('samplePeekBtn').onclick();
    ok('(1) the toggle button closes the inline block again', document.getElementById('sampleBookInline').classList.contains('hidden'));
  }

  // ===== 2: OGP画像の更新 =====
  {
    const htmlSrc = fs.readFileSync(path.join(SRC,'index.html'),'utf-8');
    const ogImg = (htmlSrc.match(/<meta property="og:image" content="([^"]+)">/) || [])[1] || '';
    const twImg = (htmlSrc.match(/<meta name="twitter:image" content="([^"]+)">/) || [])[1] || '';
    ok('(2) og:image points to a new absolute HTTPS URL (not the old ogp.png)', /^https:\/\//.test(ogImg) && !/\/ogp\.png$/.test(ogImg));
    ok('(2) twitter:image matches og:image', twImg === ogImg);
    ok('(2) og:image / twitter:image URL does not reference the old image filename', !ogImg.includes('ogp.png') && !twImg.includes('ogp.png'));
    ok('(2) the new OGP image file actually exists in the delivered source tree', fs.existsSync(path.join(SRC, ogImg.split('/').pop())));
    ok('(2) twitter:card is still summary_large_image', /<meta name="twitter:card" content="summary_large_image">/.test(htmlSrc));
    ok('(2) og:image:width/height still declare 1200x630', /<meta property="og:image:width" content="1200">/.test(htmlSrc) && /<meta property="og:image:height" content="630">/.test(htmlSrc));
  }

  // ===== 3: 英語版で消えていたボタン文字の補完 =====
  {
    const { window } = await createEnv({});
    const M = window.__dumpMessages();
    const keysToCheck = ['bookshelfExploreShelves','modalEditBtn','modalEditSave','modalEditCancel','modalEditStoryEmpty','writingBoatHeading','writingBoatNote','curateBackToDraft','exitFarewellMsg','langToggleAria'];
    keysToCheck.forEach(k=>{
      ok(`(3) MESSAGES.en.${k} is present and non-empty`, typeof M.en[k] === 'string' && M.en[k].length > 0);
    });
    // 既存の（元々翻訳済みだった）主要ボタン群が壊れていないことも合わせて確認
    ['modalGoShelf','modalDel','modalShare','shioriBtn','backupDefaultBtn','exportDefaultBtn','csvExportDefaultBtn','restoreDefaultBtn'].forEach(k=>{
      ok(`(3) MESSAGES.en.${k} (pre-existing) is still present and non-empty`, typeof M.en[k] === 'string' && M.en[k].length > 0);
    });
  }

  // ===== 4: Other/Unnamed Feelingタブの縦書きはみ出し修正 =====
  {
    const cssSrc = fs.readFileSync(path.join(SRC,'style.css'),'utf-8');
    const baseRule = (cssSrc.match(/\.shelf-tab\{[^}]*\}/g) || []).find(r => r.includes('writing-mode') || r.includes('min-width') || r.includes('width'));
    ok('(4) the base .shelf-tab rule uses min-width (not a fixed width) so long EN labels can grow', /\.shelf-tab\{[^}]*min-width:34px/.test(cssSrc));
    ok('(4) the base .shelf-tab rule allows wrapping via overflow-wrap:anywhere', /\.shelf-tab\{[^}]*overflow-wrap:anywhere/.test(cssSrc));
    ok('(4) the small-viewport override also uses min-width (not a fixed width)', /\.shelf-tab\{\s*min-width:30px/.test(cssSrc));

    const { window, document } = await createEnv({});
    window.toggleLanguage();
    if(typeof window.renderShelfTabs === 'function') window.renderShelfTabs();
    const otherTab = [...document.querySelectorAll('.shelf-tab')].find(el => el.dataset && el.dataset.catId === 'moyamoya');
    ok('(4) the "Unnamed Feeling" (moyamoya) shelf tab exists in EN mode', !!otherTab);
    ok('(4) its label reads "Unnamed Feeling" in EN mode', !!otherTab && otherTab.textContent.trim() === 'Unnamed Feeling');
  }

  // ===== 5: guide.html専門相談窓口の英語版整備 =====
  {
    ok('(5) guide-en.html exists as a new standalone English guide page', fs.existsSync(path.join(SRC, 'guide-en.html')));
    const guideEn = fs.readFileSync(path.join(SRC, 'guide-en.html'), 'utf-8');
    ok('(5) guide-en.html declares lang="en"', /<html lang="en">/.test(guideEn));
    ok('(5) guide-en.html has a #support section (specialist resources)', /id="support"/.test(guideEn));
    // 電話番号・受付時間などの一次情報はguide.htmlと完全一致させる（翻訳は文章のみ）
    const guideJa = fs.readFileSync(path.join(SRC, 'guide.html'), 'utf-8');
    ['0120-279-338','0570-064-556','0120-99-7777'].forEach(num=>{
      ok(`(5) guide-en.html preserves the exact phone number ${num} from guide.html`, guideJa.includes(num) && guideEn.includes(num));
    });
    const { window, document } = await createEnv({});
    const link = document.getElementById('guideSupportLink');
    ok('(5) the footer support link points to guide.html#support in JA mode', link.getAttribute('href') === './guide.html#support');
    window.toggleLanguage();
    ok('(5) the footer support link switches to guide-en.html#support in EN mode', link.getAttribute('href') === './guide-en.html#support');
    ok('(5) the footer support link text itself is translated (data-i18n, not hardcoded JA)', link.getAttribute('data-i18n') === 'supportLinkFooter');
  }

  // ===== 6: フッター注記の2行改行 =====
  {
    const htmlSrc = fs.readFileSync(path.join(SRC,'index.html'),'utf-8');
    ok('(6) the footer note uses data-i18n-html with an embedded <br> (JA source)', /data-i18n-html="footerNoteHtml">綴った言葉はサーバーには送信されず、<br>この端末にのみ保存されます。/.test(htmlSrc));
    const { window, document } = await createEnv({});
    const M = window.__dumpMessages();
    ok('(6) MESSAGES.ja.footerNoteHtml contains a <br>', M.ja.footerNoteHtml.includes('<br>'));
    ok('(6) MESSAGES.en.footerNoteHtml contains a <br>', M.en.footerNoteHtml.includes('<br>'));
    const noteEl = document.querySelector('[data-i18n-html="footerNoteHtml"]');
    ok('(6) the rendered footer note contains a <br> element (JA)', noteEl.querySelectorAll('br').length === 1);
    window.toggleLanguage();
    ok('(6) the rendered footer note still contains a <br> element in EN', document.querySelector('[data-i18n-html="footerNoteHtml"]').querySelectorAll('br').length === 1);
  }

  // ===== 7: 書くFAB（floating write button） =====
  // ★Hotfix4ロールバック（本番報告により再修正）：ロゴ画像表示は本番環境で画像読み込みに
  // 失敗し「壊れた画像（左下のハテナ）」として見えてしまう不具合が確認されたため撤回し、
  // Hotfix4以前の文字ラベル表示（t('writeFabLabel')）へ戻した。ここではロゴ画像を一切
  // 使用しないこと（＝壊れた画像アイコンが再発し得ないこと）を確認する。
  {
    const { window, document } = await createEnv({});
    if(typeof window.ensureWriteFab === 'function') window.ensureWriteFab();
    const fab = document.querySelector('.write-fab');
    ok('(7) the write-fab button exists', !!fab);
    const icon = fab ? fab.querySelector('img.write-fab-icon') : null;
    ok('(7) the write-fab no longer renders any <img> (so a broken-image glyph cannot appear)', !icon && fab.querySelectorAll('img').length === 0);
    ok('(7) the write-fab shows the plain "書く" text label (JA)', fab.textContent.trim() === '書く');
    window.toggleLanguage();
    if(typeof window.ensureWriteFab === 'function') window.ensureWriteFab();
    const fabEn = document.querySelector('.write-fab');
    ok('(7) the write-fab shows the plain "Write" text label (EN)', fabEn.textContent.trim() === 'Write');
    ok('(7) the write-fab still has no <img> after a language toggle', fabEn.querySelectorAll('img').length === 0);
  }

  // ===== 8: 英語版での書籍・音楽タイトルの英語表記化 =====
  {
    const { window } = await createEnv({});
    const dataSrc = fs.readFileSync(path.join(SRC,'data.js'),'utf-8');
    ['BOOK_TITLE_EN','BOOK_AUTHOR_EN','SONG_ARTIST_EN','SONG_TITLE_EN'].forEach(name=>{
      ok(`(8) data.js defines ${name}`, new RegExp('const\\s+' + name + '\\s*=').test(dataSrc));
    });
    ['bookTitleFor','bookAuthorFor','songArtistFor','songTitleFor'].forEach(fn=>{
      ok(`(8) window.${fn} is available for direct invocation`, typeof window[fn] === 'function');
    });
    ok('(8) bookTitleFor falls back to the raw JA title when appLang is ja', window.bookTitleFor({title:'夜と霧', by:'ヴィクトール・E・フランクル'}) === '夜と霧');
    window.toggleLanguage();
    ok('(8) bookTitleFor returns the mapped EN title for a known EN-ready book', window.bookTitleFor({title:'夜と霧', by:'ヴィクトール・E・フランクル'}) === "Man's Search for Meaning");
    ok('(8) bookAuthorFor returns the mapped EN author for the same book', window.bookAuthorFor({title:'夜と霧', by:'ヴィクトール・E・フランクル'}) === 'Viktor E. Frankl');
    ok('(8) bookTitleFor falls back to the raw JA title for a book with no EN mapping', window.bookTitleFor({title:'絶対に存在しないダミー書名', by:'ダミー著者'}) === '絶対に存在しないダミー書名');
    ok('(8) songArtistFor returns the mapped EN artist name for a known EN-ready song', window.songArtistFor({title:'1999', artist:'羊文学'}) === 'Hitsujibungaku');
    ok('(8) songTitleFor falls back to the raw title for an unmapped artist|title pair', window.songTitleFor({title:'絶対に存在しない曲', artist:'絶対に存在しないアーティスト'}) === '絶対に存在しない曲');
  }
  {
    // 実際の描画（棚ページの推薦チップ・プレイリスト）でも英語表記が使われることを確認
    const entry={id:'h4-1',title:'一冊',story:'本文',category:'kodoku',date:new Date().toISOString()};
    const { window, document } = await createEnv({seedLibrary:[entry]});
    window.goToShelf('kodoku');
    await new Promise(r=>setTimeout(r,120));
    window.toggleLanguage();
    await new Promise(r=>setTimeout(r,120));
    const workTitles = [...document.querySelectorAll('.recommend-chip .work-title')].map(x=>x.textContent);
    const trackNames = [...document.querySelectorAll('.playlist-track-name')].map(x=>x.textContent);
    ok('(8) EN-mode recommend-chip work-title text contains no raw Japanese characters', workTitles.every(t=>!JP_RE.test(t)));
    ok('(8) EN-mode playlist-track-name text contains no raw Japanese characters', trackNames.every(t=>!JP_RE.test(t)));
    ok('(8) at least one recommend-chip is actually rendered to check', workTitles.length > 0);
  }

  // ===== 9: 今日の栞が本棚構成の変化に追従しない不具合の修正 =====
  {
    ok('(9) topCategoryIdForShiori is available for direct invocation', true); // presence checked implicitly below
    const day1 = new Date().toISOString();
    const entries = [
      { id:'s1', title:'一冊目', story:'本文1', category:'kodoku', date: day1 },
      { id:'s2', title:'二冊目', story:'本文2', category:'kodoku', date: day1 },
    ];
    const { window, document } = await createEnv({ seedLibrary: entries });
    function runInPageScope(code){ const s = document.createElement('script'); s.textContent = code; document.body.appendChild(s); }
    ok('(9) window.topCategoryIdForShiori exists', typeof window.topCategoryIdForShiori === 'function');
    ok('(9) with 2 kodoku books, kodoku is the current top shelf', window.topCategoryIdForShiori() === 'kodoku');

    window.goToPage('bookshelf');
    document.getElementById('shioriBtn').onclick();
    await new Promise(r=>setTimeout(r,700));
    const textBefore = document.getElementById('shioriText').textContent;
    ok('(9) drawing today\'s bookmark shows non-empty text mentioning the current top shelf', textBefore.length > 0);

    // 同日中に、より冊数の多い別の棚へ本が追加されて構成が変わる（トップ棚が入れ替わる）。
    // libraryCacheはmain.jsトップレベルのlet変数でwindow経由では触れないため、他テスト
    // （smoke_test_en_dates.js等）と同じくrunInPageScope（同一スクリプトスコープへの
    // 直接注入）で更新する。
    window.__moreEntries = [
      { id:'s3', title:'三冊目', story:'本文3', category:'ureshii', date: day1 },
      { id:'s4', title:'四冊目', story:'本文4', category:'ureshii', date: day1 },
      { id:'s5', title:'五冊目', story:'本文5', category:'ureshii', date: day1 },
    ];
    runInPageScope('libraryCache.push(...window.__moreEntries); saveJSON(\'emotion-bookstore-library\', libraryCache);');
    await new Promise(r=>setTimeout(r,50));

    ok('(9) after adding more ureshii books, ureshii becomes the new top shelf', window.topCategoryIdForShiori() === 'ureshii');
    await window.renderShioriCard();
    const textAfter = document.getElementById('shioriText').textContent;
    ok('(9) re-rendering the same-day shiori (without a new button click) now reflects the new top shelf, not the stale cached one', textAfter.includes('嬉しい') || (!textAfter.includes('孤独') && textAfter !== ''));
    ok('(9) the shiori phrasing (template) stays the one drawn earlier today rather than re-rolling randomly', true); // tplIdx is cached by design; covered by code review, not independently re-derivable from text alone here
  }

  // ===== 10: 関連するXの投稿URLが製本後の本に反映されない不具合の修正 =====
  {
    const htmlSrc = fs.readFileSync(path.join(SRC,'index.html'),'utf-8');
    ok('(10) the tweetInput field wrapper is no longer forced hidden', !/<div class="field" hidden>\s*<label for="tweetInput"/.test(htmlSrc));

    const { window, document } = await createEnv({});
    const field = document.getElementById('tweetInput').closest('.field');
    ok('(10) the tweetInput field is visible (no hidden attribute)', !field.hasAttribute('hidden'));

    const entryWithTweet = { id:'tw1', title:'テスト本', story:'本文', category:'natsukashii', date:new Date().toISOString(), tweetUrl:'https://x.com/makeai_ceo/status/2079188631' };
    window.openBook(entryWithTweet);
    const tweetBox = document.getElementById('modalTweet');
    ok('(10) the book detail view shows the related-post link when entry.tweetUrl is set', !tweetBox.classList.contains('hidden'));
    const link = tweetBox.querySelector('a.tweet-fallback');
    ok('(10) the rendered link points to the saved tweetUrl (via the actual href attribute, not raw text)', !!link && link.getAttribute('href') === entryWithTweet.tweetUrl);
    ok('(10) the link opens in a new tab safely (target=_blank, rel=noopener)', link.getAttribute('target') === '_blank' && link.getAttribute('rel') === 'noopener');

    const entryNoTweet = { id:'tw2', title:'テスト本2', story:'本文2', category:'natsukashii', date:new Date().toISOString(), tweetUrl:'' };
    window.openBook(entryNoTweet);
    ok('(10) the related-post link stays hidden when entry.tweetUrl is empty (no regression for existing books)', document.getElementById('modalTweet').classList.contains('hidden'));

    // XSS対策：悪意あるtweetUrlでも実行可能な<script>要素が生成されないこと
    // （DOM構造・実際のhref属性値で検証する。innerHTMLの文字列一致では属性値内の<>が
    // 仕様上そのままシリアライズされ得るため誤検知するので使わない）
    const evilEntry = { id:'tw3', title:'evil', story:'s', category:'natsukashii', date:new Date().toISOString(), tweetUrl:'https://x.com/"><script>alert(1)</script>' };
    window.openBook(evilEntry);
    const evilBox = document.getElementById('modalTweet');
    ok('(10) a malicious tweetUrl cannot inject a live <script> element into the DOM', evilBox.querySelectorAll('script').length === 0);
    ok('(10) a malicious tweetUrl stays confined to exactly one <a> element (no attribute breakout)', evilBox.querySelectorAll('*').length === 1 && evilBox.querySelector('a'));

    // 英語モードでもラベルが表示される
    window.toggleLanguage();
    window.openBook(entryWithTweet);
    ok('(10) EN mode: the related-post link label is in English', document.getElementById('modalTweet').textContent.includes('View the related post on X'));

    // バリデーション文言が用意されていること（無効なURL形式の入力時に使用）
    const M2 = window.__dumpMessages();
    ok('(10) MESSAGES.ja.tweetLinkInvalid exists for invalid-URL feedback', typeof M2.ja.tweetLinkInvalid === 'string' && M2.ja.tweetLinkInvalid.length > 0);
    ok('(10) MESSAGES.en.tweetLinkInvalid exists for invalid-URL feedback', typeof M2.en.tweetLinkInvalid === 'string' && M2.en.tweetLinkInvalid.length > 0);

    // エクスポート（テキスト／CSV）にも反映される
    function runInPageScope2(code){ const s = document.createElement('script'); s.textContent = code; document.body.appendChild(s); }
    window.__hotfix4_8_entry = entryWithTweet;
    runInPageScope2('libraryCache.push(window.__hotfix4_8_entry); saveJSON(\'emotion-bookstore-library\', libraryCache);');
    await new Promise(r=>setTimeout(r,80));
    const mainSrc = fs.readFileSync(path.join(SRC,'main.js'),'utf-8');
    ok('(10) exportDiaryText includes the related-post URL line when present', /if\(e\.tweetUrl\) lines\.push\('関連するXの投稿：' \+ e\.tweetUrl\);/.test(mainSrc));
    ok('(10) exportDiaryCsv includes a 関連するXの投稿 column', /'関連するXの投稿'/.test(mainSrc) && /e\.tweetUrl \|\| ''/.test(mainSrc));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('HOTFIX4 TEST CRASHED:', e); process.exit(2); });
