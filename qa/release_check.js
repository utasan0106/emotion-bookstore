#!/usr/bin/env node
/* Release Candidate 01 の静的契約。
   参加者が読む runtime だけを見て、棚の数・件数・言い回し・権利・外部通信の
   境界が崩れていないことを確かめる。ネットワークには一切出ない。 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

for (const file of ['index.html', 'shelf.html', 'release.css', 'release.js', 'release_content.js', 'analytics-v3.js', 'data.html', 'weekly-video.js', 'weekly-video.css']) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('release_content.js'), sandbox);
const CONTENT = sandbox.window.V3_RELEASE_CONTENT;

/* ---- 棚の形 ---------------------------------------------------------- */
const EXPECTED_SHELVES = ['kichijoji', 'koenji', 'shimokitazawa', 'jinbocho'];
if (!CONTENT || !Array.isArray(CONTENT.shelves)) failures.push('content missing');
const shelves = (CONTENT && CONTENT.shelves) || [];
if (shelves.length !== 4) failures.push(`expected exactly 4 shelves, got ${shelves.length}`);
if (shelves.map((s) => s.id).join(',') !== EXPECTED_SHELVES.join(',')) {
  failures.push(`shelf ids/order must be ${EXPECTED_SHELVES.join(',')}`);
}
if (shelves.filter((s) => s.role === 'flagship').length !== 1) failures.push('exactly one flagship shelf');
if (shelves[0] && shelves[0].role !== 'flagship') failures.push('kichijoji must be the flagship and come first');

for (const shelf of shelves) {
  const hm = shelf.heroMedia || {};
  for (const key of ['url','alt','author','source','sourceUrl','license','licenseUrl','modification']) {
    if (!hm[key]) failures.push(`${shelf.id}: heroMedia missing ${key}`);
  }
  if (!/^\.\/assets\/city-/.test(hm.url || '')) failures.push(`${shelf.id}: heroMedia must be local city image`);
  if (hm.url && !fs.existsSync(path.join(root, hm.url.replace(/^\.\//,'')))) failures.push(`${shelf.id}: heroMedia file missing`);
}
const detour = CONTENT && CONTENT.detour;
if (!detour || !Array.isArray(detour.items) || detour.items.length !== 3) failures.push('detour must have exactly 3 items');
else {
  if (detour.items.map((x) => x.kind).join(',') !== '本,映画,音楽') failures.push('detour kinds must be 本,映画,音楽');
  for (const x of detour.items) {
    for (const key of ['title','creator','why','actionLabel','actionUrl','media']) {
      if (!x[key]) failures.push(`detour ${x.kind}: missing ${key}`);
    }
    if (!/^https:\/\//.test(x.actionUrl || '')) failures.push(`detour ${x.kind}: actionUrl must be https`);
    const m = x.media || {};
    if (!['cover','publisher-link','youtube'].includes(m.kind)) failures.push(`detour ${x.kind}: invalid media.kind`);
    if (m.kind === 'cover') {
      if (!/^\.\/assets\//.test(m.url || '')) failures.push(`detour ${x.kind}: cover must be same-origin`);
      const rel = (m.url || '').replace(/^\.\//, '');
      if (!rel || !fs.existsSync(path.join(root, rel))) failures.push(`detour ${x.kind}: cover file missing`);
    }
    if (m.kind === 'publisher-link' && !/^https:\/\/www\.kodansha\.co\.jp\//.test(m.sourceUrl || '')) {
      failures.push('detour book fallback must point to Kodansha official');
    }
    if (m.kind === 'youtube') {
      if (!/^[A-Za-z0-9_-]{11}$/.test(m.videoId || '')) failures.push(`detour ${x.kind}: invalid YouTube videoId`);
      for (const key of ['videoTitle','buttonLabel','sourceLabel','sourceUrl']) if (!m[key]) failures.push(`detour ${x.kind}: YouTube media missing ${key}`);
    }
  }
  const detourRuntime = read('release.js');
  if (!detourRuntime.includes("class: 'detour-video-play'")) failures.push('release.js: detour click-to-play control missing');
  if (!detourRuntime.includes('https://www.youtube-nocookie.com/embed/')) failures.push('release.js: detour youtube-nocookie embed missing');
  if (detourRuntime.includes('i.ytimg.com')) failures.push('release.js: detour must not load YouTube thumbnail before click');
}

const releaseRuntime = read('release.js');
if (!releaseRuntime.includes("class: 'shelf-entry-media'")) {
  failures.push('release.js: Home city photo renderer missing');
}
if (!releaseRuntime.includes('shelf.heroMedia')) {
  failures.push('release.js: Home city photos must reuse shelf.heroMedia');
}
if (/https?:\/\/[^'"]+\.(?:jpg|jpeg|png|webp)/i.test(releaseRuntime)) {
  failures.push('release.js: Home city photo renderer must not introduce remote image URLs');
}

const ids = new Set();
for (const shelf of shelves) {
  if (shelf.objects.length !== 3) failures.push(`${shelf.id}: expected exactly 3 objects, got ${shelf.objects.length}`);
  if (shelf.tagline !== `${shelf.area}を、3つだけ。`) failures.push(`${shelf.id}: tagline must read ${shelf.area}を、3つだけ。`);
  for (const o of shelf.objects) {
    if (ids.has(o.id)) failures.push(`duplicate object id: ${o.id}`);
    ids.add(o.id);
    for (const key of ['objectName', 'placeName', 'typeLabel', 'mode', 'hook', 'reveal',
      'actionLabel', 'actionUrl', 'factsSourceUrl', 'verifiedAt']) {
      if (!o[key]) failures.push(`${o.id}: missing ${key}`);
    }
    if (!['evergreen', 'current'].includes(o.mode)) failures.push(`${o.id}: mode must be evergreen|current`);
    if (o.mode === 'current' && !o.expiresAt) failures.push(`${o.id}: current requires expiresAt`);
    // evergreen は日付に依存しない事実。finite expiry を持たせると、期限が来た瞬間に
    // その棚が理由なく閉じる。期限が要るなら mode を current にする。
    if (o.mode === 'evergreen' && o.expiresAt !== null && o.expiresAt !== undefined) {
      failures.push(`${o.id}: evergreen must not carry a finite expiresAt (${o.expiresAt})`);
    }
    if (!Array.isArray(o.facts) || o.facts.length !== 3) failures.push(`${o.id}: expected exactly 3 facts`);
    if (!/^https:\/\//.test(o.actionUrl || '')) failures.push(`${o.id}: actionUrl must be https`);
    if (!/^https:\/\//.test(o.factsSourceUrl || '')) failures.push(`${o.id}: factsSourceUrl must be https`);

    // 折返し分割は表示の都合。wording を1文字も変えていないこと。
    for (const [field, pf] of [['hook', 'hookPhrases'], ['reveal', 'revealPhrases']]) {
      const ph = o[pf];
      if (!Array.isArray(ph) || ph.length < 2) { failures.push(`${o.id}: ${pf} needs >= 2 phrases`); continue; }
      if (ph.some((x) => typeof x !== 'string' || !x)) { failures.push(`${o.id}: ${pf} entries must be non-empty`); continue; }
      if (ph.join('') !== o[field]) failures.push(`${o.id}: ${pf} must join back to ${field} unchanged`);
    }

    // media
    const m = o.media || {};
    if (!['photo', 'plate'].includes(m.kind)) failures.push(`${o.id}: media.kind must be photo|plate`);
    if (!m.listAlt || !m.detailAlt) failures.push(`${o.id}: media needs listAlt and detailAlt`);
    if (m.kind === 'photo') {
      if (!/^\.\/assets\//.test(m.url || '')) failures.push(`${o.id}: photo must be same-origin ./assets/*`);
      if (!fs.existsSync(path.join(root, (m.url || '').replace(/^\.\//, '')))) failures.push(`${o.id}: photo file missing`);
      if (m.crop !== 'none') failures.push(`${o.id}: photo crop must be none`);
      const r = o.rights || {};
      for (const key of ['author', 'source', 'sourceUrl', 'license', 'modification']) {
        if (!r[key]) failures.push(`${o.id}: rights missing ${key}`);
      }
    } else {
      if (!m.plateWord || !m.plateSub || !m.ratio) failures.push(`${o.id}: plate needs plateWord/plateSub/ratio`);
      if (o.rights) failures.push(`${o.id}: a typographic plate must not carry photo rights`);
    }
    // 一覧の alt が Reveal の答えを先に言っていないこと。
    // 対象の名前そのもの（活字図版の語 / 作品名）は Hook 側で既に見えているので
    // 比較から外し、それ以外の言い回しが 8 文字続けて一致したら漏れとみなす。
    const strip = (t) => {
      let out = String(t).replace(/[。、！？「」『』・\s]/g, '');
      for (const own of [m.plateWord, o.objectName, o.placeName.split(' / ')[0]]) {
        if (own) out = out.split(String(own).replace(/[。、！？「」『』・\s]/g, '')).join('');
      }
      return out;
    };
    const payoff = strip(o.reveal);
    const alt = strip(m.listAlt);
    for (let i = 0; i + 8 <= payoff.length; i++) {
      const win = payoff.slice(i, i + 8);
      if (alt.includes(win)) { failures.push(`${o.id}: listAlt leaks the reveal (${win})`); break; }
    }
  }
}

/* ---- A. site explainer が media より先に置かれている ------------------ */
const EXPLAINER = '人が選んだ場所・本・音楽・映画・催しを、街や種類ごとに少しずつ並べる文化案内です。';
if (CONTENT && CONTENT.release && CONTENT.release.siteExplainer !== EXPLAINER) {
  failures.push('release.siteExplainer must be the exact fixed sentence');
}
const explainerBlock = (src) => (src.match(/<p class="site-explainer">[\s\S]*?<\/p>/) || [''])[0];
const explainerText = (src) => explainerBlock(src).replace(/<[^>]*>/g, '').replace(/\s+/g, '');
const BRAND_SYMBOL = './assets/brand/emotion-bookstore-symbol-reversed.svg';
if (!fs.existsSync(path.join(root, 'assets/brand/emotion-bookstore-symbol-reversed.svg'))) {
  failures.push('official brand symbol missing');
}
for (const page of ['index.html', 'shelf.html', 'suggest.html']) {
  const src = read(page);
  if (!src.includes('class="brand-symbol"') || !src.includes(BRAND_SYMBOL)) {
    failures.push(`${page}: official brand symbol missing from header`);
  }
}
const cityCss = read('release.css');
for (const required of ['mix-blend-mode: multiply', 'mix-blend-mode: color', 'repeating-linear-gradient']) {
  if (!cityCss.includes(required)) failures.push(`release.css: city editorial treatment missing ${required}`);
}

for (const page of ['index.html', 'shelf.html', 'suggest.html']) {
  const src = read(page);
  if (explainerText(src) !== EXPLAINER.replace(/\s+/g, '')) {
    failures.push(`${page}: exact site explainer missing`); continue;
  }
  // 折返しは Chromium 専用の auto-phrase ではなく markup で決める。
  if (!/<span class="jp-phrase">[^<]+<\/span><wbr>/.test(explainerBlock(src))) {
    failures.push(`${page}: site explainer must keep the Safari-safe .jp-phrase + <wbr> structure`);
  }
  // static に置いていること。JS が動かなくても順序が崩れないようにする。
  const at = src.indexOf('<p class="site-explainer">');
  const main = src.indexOf('<main');
  if (at < main) failures.push(`${page}: site explainer must live inside <main>`);
  // Headerのbrand symbolは許可する。<main>内では説明より前にObject mediaを置かない。
  const mainLead = src.slice(main, at);
  for (const marker of ['objectGrid', 'media-frame', '<img']) {
    if (mainLead.includes(marker)) failures.push(`${page}: ${marker} appears before the site explainer inside main`);
  }
}

/* ---- B/C. controlled category の整合 ---------------------------------- */
const CATEGORIES = [
  ['food', '飲食・喫茶'], ['experience', '体験・おでかけ'], ['books', '本・古書'],
  ['music', '音楽・ライブ'], ['film-stage', '映画・演劇']
];
const cats = (CONTENT && CONTENT.categories) || [];
if (cats.length !== 5) failures.push(`expected exactly 5 controlled categories, got ${cats.length}`);
CATEGORIES.forEach(([id, name], i) => {
  if (!cats[i] || cats[i].id !== id || cats[i].name !== name) {
    failures.push(`category ${i} must be ${id}/${name}`);
  }
});
const catIds = new Set(cats.map((c) => c.id));
const allObjects = shelves.flatMap((sh) => sh.objects);
if (allObjects.length !== 12) failures.push(`expected exactly 12 objects, got ${allObjects.length}`);
for (const o of allObjects) {
  const list = o.categoryIds;
  if (!Array.isArray(list) || list.length < 1) { failures.push(`${o.id}: needs >= 1 categoryId`); continue; }
  if (new Set(list).size !== list.length) failures.push(`${o.id}: duplicate categoryId`);
  for (const c of list) if (!catIds.has(c)) failures.push(`${o.id}: unknown categoryId ${c}`);
}
// 1つの category の中に同じ Object が二度出ないこと。
for (const c of cats) {
  const inCat = allObjects.filter((o) => (o.categoryIds || []).includes(c.id)).map((o) => o.id);
  if (new Set(inCat).size !== inCat.length) failures.push(`category ${c.id}: duplicate object`);
}
// 玄関に二軸が明示されていること。
const foyerSrc = read('index.html');
for (const axis of ['街から見る', '種類から見る']) {
  if (!foyerSrc.includes(axis)) failures.push(`index.html: entry axis missing (${axis})`);
}
if (!foyerSrc.includes('id="categoryIndex"')) failures.push('index.html: category index container missing');

/* ---- D. 候補受付は backend を持たない -------------------------------- */
const suggest = read('suggest.html');
const APPROVED_INPUT_IDS = ['sg-name', 'sg-url', 'sg-category', 'sg-note'];
for (const id of APPROVED_INPUT_IDS) {
  if (!suggest.includes(`id="${id}"`)) failures.push(`suggest.html: missing approved field ${id}`);
}
for (const control of (suggest.match(/<(input|textarea|select)\b[^>]*/g) || [])) {
  const idMatch = control.match(/id="([^"]+)"/);
  const id = idMatch && idMatch[1];
  if (!APPROVED_INPUT_IDS.includes(id) && id !== 'sg-output') {
    failures.push(`suggest.html: unapproved input control (${id || control.slice(0, 40)})`);
  }
  if (/type="(file|password|email|tel)"/.test(control)) {
    failures.push(`suggest.html: forbidden input type in ${id}`);
  }
}
if (/enctype|<form[^>]*action=|method="post"/i.test(suggest)) failures.push('suggest.html: form must not post anywhere');
if (!suggest.includes('https://x.com/emotion_books')) failures.push('suggest.html: exact X destination missing');
if ((suggest.match(/x\.com/g) || []).length !== 1) failures.push('suggest.html: exactly one X destination expected');
if (/x\.com\/[^"']*[?&]/.test(suggest)) failures.push('suggest.html: X destination must carry no query');
/* 候補の受け取りは Google フォームへ出る link で行う。送信は Google の
   ページ側で起きるので、このページ自体は引き続き何も送らない。
   guard するのは「編集用 URL を公開しないこと」。/edit を貼ると訪問者が
   フォームそのものを書き換えられるので、これは体裁ではなく事故になる。 */
const formLinks = suggest.match(/https:\/\/docs\.google\.com\/forms\/[^"']+/g) || [];
if (formLinks.length !== 1) {
  failures.push(`suggest.html: expected exactly one Google form link (found ${formLinks.length})`);
}
for (const link of formLinks) {
  if (/\/edit\b/.test(link)) {
    failures.push('suggest.html: form link must not be an editor URL (/edit)');
  }
  /* prefill をやめている以上、query が付いていたら入力が外へ載っている疑い。 */
  if (/[?&]/.test(link)) {
    failures.push('suggest.html: form link must carry no query (no prefill)');
  }
}
for (const notice of [
  '入力内容はこのページから自動送信されません。',
  '送った候補がそのまま公開されることはありません。',
  // コピーが端末のクリップボードへ書くことと、フォームが外部であることを
  // どちらも言い落とさない。
  'サービス改善のためGoogle Analyticsでページ表示と操作段階を計測します。入力した名称・URL・自由記述・候補文はAnalyticsへ送りません。入力内容はこのページから自動送信されません。'
]) {
  if (!suggest.includes(notice)) failures.push(`suggest.html: required notice missing (${notice.slice(0, 12)}…)`);
}
// クリップボードへ書く以上、「ブラウザの外へ出ません」は言い過ぎになる。
if (suggest.includes('ブラウザの外へ出ません')) {
  failures.push('suggest.html: must not claim the input never leaves the browser (clipboard is outside it)');
}
// コピー前に browser 標準の検証を通すこと。独自の検証機構は作らない。
if (!read('release.js').includes('form.reportValidity()')) {
  failures.push('release.js: copy must run native form validation first');
}
for (const banned of ['アカウント', 'ログイン', 'メールアドレス', '電話番号', '住所', '写真をアップロード', 'いいね', '投稿数']) {
  if (suggest.includes(banned)) failures.push(`suggest.html: must not ask for ${banned}`);
}

/* ---- 参加者 runtime の境界 ------------------------------------------- */
const js = read('release.js');
if (!js.includes("media-frame card-media media-plate list-plate")) failures.push('release.js: shelf list cards must be typography-only');
const contentJs = read('release_content.js');
for (const token of ['localStorage', 'sessionStorage', 'indexedDB', 'sendBeacon', 'gtag(', 'fetch(',
  'XMLHttpRequest', 'serviceWorker', 'caches.', 'navigator.storage']) {
  if (js.includes(token)) failures.push(`forbidden runtime token: ${token}`);
}
const html = read('index.html') + read('shelf.html') + read('suggest.html');
const runtime = [html, js, contentJs].join('\n');
for (const word of ['次の3つ', 'また見たい', 'おすすめ', 'あなた向け', 'ランキング', '人気', 'トレンド',
  'NEW', 'TRENDING', 'FOR YOU', '見終わりました']) {
  if (runtime.includes(word)) failures.push(`release runtime must not contain: ${word}`);
}
/* referrer は3ページとも落とさない。外部へ出るとき、どこから来たかを
   相手に渡さない。 */
for (const page of ['index.html', 'shelf.html', 'suggest.html']) {
  if (!read(page).includes('referrer" content="no-referrer')) {
    failures.push(`${page} missing referrer no-referrer`);
  }
}
/* 公開にあたって、玄関と棚は検索に載せる。候補ページはフォーム画面で、
   棚より上に出ても人の役に立たないので載せない。prototype 時代は3ページとも
   noindex だったが、その前提はもう正しくない。 */
if (!read('suggest.html').includes('noindex,nofollow')) {
  failures.push('suggest.html must stay noindex');
}
for (const page of ['index.html', 'shelf.html']) {
  if (read(page).includes('noindex')) failures.push(`${page} must not be noindex`);
}
/* 共有されたときに何のページか分かること。description と OGP が無いと、
   リンクだけが貼られて中身が伝わらない。og:image は同一オリジンの、
   この案内のために組んだ扉。ほかの製品の画像を借りない。
   2026-08-30、公式ロゴ使用版（ogp-v3-20260830.png）へ差し替えた。
   旧扉（ogp-machi.jpg）は削除せず残す。履歴・他用途の可能性のため。 */
const OGP_IMAGE = 'https://emotionbookstore.com/assets/ogp-v3-20260830.png';
/* ブランドの正規データから起こした画像。同一オリジンに置き、ほかの製品の
   画像（ドメイン直下の shop-seal.png や ogp-v2.jpg）を借りない。
   一度 shop-seal.png を favicon に借りていたが、それは別の製品の意匠だった。 */
for (const f of ['assets/ogp-v3-20260830.png', 'assets/ogp-machi.jpg', 'assets/favicon.ico',
                 'assets/icon-512.png', 'assets/apple-touch-icon.png']) {
  if (!fs.existsSync(path.join(root, f))) failures.push(`${f} missing`);
}
/* 実寸が宣言値（1200x630）と食い違っていないこと。crawler は og:image:width/
   height を検証しないので、ここで確認しないと気づけない。
   新規 dependency は入れない指示のため、PNG の IHDR チャンクを直接読む。 */
{
  const p = path.join(root, 'assets/ogp-v3-20260830.png');
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    const isPng = buf.slice(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    const w = isPng ? buf.readUInt32BE(16) : null;
    const h = isPng ? buf.readUInt32BE(20) : null;
    if (!isPng || w !== 1200 || h !== 630) {
      failures.push(`assets/ogp-v3-20260830.png must be a 1200x630 PNG, got ${isPng ? `${w}x${h}` : 'not a PNG'}`);
    }
  }
}
for (const page of ['index.html', 'shelf.html', 'suggest.html']) {
  const src = read(page);
  for (const rel of ['rel="icon" href="./assets/favicon.ico"',
                     'rel="apple-touch-icon" href="./assets/apple-touch-icon.png"']) {
    if (!src.includes(rel)) failures.push(`${page} missing ${rel}`);
  }
  for (const foreign of ['shop-seal.png', 'ogp-v2.jpg', 'ogp.png',
                         'ogp-emotion-bookstore-20260720.jpg']) {
    if (src.includes(foreign)) {
      failures.push(`${page} must not borrow another product's image (${foreign})`);
    }
  }
}
for (const page of ['index.html', 'shelf.html', 'suggest.html']) {
  const src = read(page);
  for (const tag of ['name="description"', 'property="og:title"', 'property="og:description"',
                     'property="og:url"', 'property="og:image"', 'name="twitter:card"']) {
    if (!src.includes(tag)) failures.push(`${page} missing ${tag}`);
  }
  if (!src.includes(OGP_IMAGE)) failures.push(`${page} og:image must be ${OGP_IMAGE}`);
  const d = (src.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  if (d.length < 40) failures.push(`${page} description too short (${d.length})`);
  if (d.length > 140) failures.push(`${page} description too long (${d.length})`);
}
/* 種類の絞り込みは同じ12件の別の見え方なので、玄関へ寄せる。
   棚は街ごとに中身が違うので、静的な canonical で1つに潰さない。 */
if (!read('index.html').includes('<link rel="canonical" href="https://emotionbookstore.com/">')) {
  failures.push('index.html missing canonical to the site root');
}
if (read('shelf.html').includes('rel="canonical"')) {
  failures.push('shelf.html must not carry a static canonical (4 shelves differ)');
}
if ((read('index.html').match(/<h1\b/g) || []).length !== 1) failures.push('index.html needs exactly one h1');
if ((read('shelf.html').match(/<h1\b/g) || []).length !== 1) failures.push('shelf.html needs exactly one h1');
if ((read('suggest.html').match(/<h1\b/g) || []).length !== 1) failures.push('suggest.html needs exactly one h1');

/* ---- 玄関と終わりの言い回し ------------------------------------------ */
const foyer = read('index.html');
if (!foyer.includes('みんなの感情書店')) failures.push('foyer eyebrow missing');
const visibleCityH1 = '<h1 id="hero-title"><span class="hero-line">今日は、</span><span class="hero-line">どの街へ。</span></h1>';
if (!foyer.includes(visibleCityH1)) {
  failures.push('foyer visible H1 must be 今日は、どの街へ。');
}
const shelfHtml = read('shelf.html');
const endPlate = (shelfHtml.match(/<section class="end-plate"[\s\S]*?<\/section>/) || [''])[0];
const endText = endPlate.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
if (!endText.includes('この棚は、3つで終わりです。')) failures.push('shelf ending copy missing');
if (!endText.includes('ほかの棚を見る')) failures.push('shelf ending exit missing');
if (!/<span class="end-phrase">この棚は、<\/span><wbr><span class="end-phrase">3つで終わりです。<\/span>/.test(shelfHtml)) {
  failures.push('shelf ending must keep the Safari-safe .end-phrase + <wbr> structure');
}

/* ---- Visual Prompt OS で決めた CSS 契約 ------------------------------ */
const css = read('release.css');
const rule = (sel) => (css.match(new RegExp(sel.replace('.', '\\.') + '\\s*\\{[^}]*\\}')) || [''])[0];
const jp = rule('.jp-phrase');
if (!/word-break:\s*keep-all/.test(jp)) failures.push('.jp-phrase must be word-break: keep-all');
if (!/overflow-wrap:\s*anywhere/.test(jp)) failures.push('.jp-phrase must be overflow-wrap: anywhere');
const endPhrase = rule('.end-phrase');
if (!/word-break:\s*keep-all/.test(endPhrase)) failures.push('.end-phrase must be word-break: keep-all');
// auto-phrase を使う見出しは min-content が文節まで膨らむ。200% 拡大で横スクロールを
// 作らないよう、最終手段として折れることを必須にする。
for (const sel of ['.shelf-tagline', '.plate-word']) {
  if (!/overflow-wrap:\s*anywhere/.test(rule(sel))) {
    failures.push(`${sel} needs overflow-wrap: anywhere so it cannot widen min-content`);
  }
}
if (!/touch-action:\s*manipulation/.test(css)) failures.push('primary controls need touch-action: manipulation');
if (!css.includes('.dialog-close:focus-visible')) failures.push('dialog close focus treatment missing');
if (!/@media \(hover: none\) and \(pointer: coarse\)/.test(css)) failures.push('coarse-touch hover suppression missing');
if (!/@media \(forced-colors: active\)/.test(css)) failures.push('forced-colors block missing');

/* ---- 外部リンクの形 --------------------------------------------------- */
/* 死活そのものは静的検査では分からない（qa/link_check.js が外部ネットワークの
   ある環境で確認する）。ここで守れるのは形と、一度死んだと分かった host が
   黙って戻ってこないことだけ。
   2026-08-29、映画『街の上で』の actionUrl が失効ドメインを指したまま
   Release Candidate に載っていた。利用者には「公式サイトを見る」を押すと
   壊れたページに着く状態で、静的検査はすべて緑だった。 */
const DEAD_HOSTS = [
  /* Founder が実機で ERR_SSL_PROTOCOL_ERROR を確認。復活を確認するまで使わない。 */
  'machinouede.com'
];
for (const shelf of shelves) {
  for (const o of shelf.objects) {
    const at = `${shelf.id}/${o.id}`;
    const urls = [['actionUrl', o.actionUrl], ['factsSourceUrl', o.factsSourceUrl]];
    if (o.rights) {
      urls.push(['rights.sourceUrl', o.rights.sourceUrl]);
      if (o.rights.licenseUrl) urls.push(['rights.licenseUrl', o.rights.licenseUrl]);
    }
    for (const [field, url] of urls) {
      if (typeof url !== 'string' || !url) { failures.push(`${at} ${field} missing`); continue; }
      let parsed;
      try { parsed = new URL(url); } catch (_) { failures.push(`${at} ${field} is not a valid URL: ${url}`); continue; }
      if (parsed.protocol !== 'https:') failures.push(`${at} ${field} must be https: ${url}`);
      const host = parsed.hostname.replace(/^www\./, '');
      if (DEAD_HOSTS.includes(host)) {
        failures.push(`${at} ${field} points at a host known to be dead: ${host}`);
      }
    }
    /* 押す前に何が起きるか分かる文言であること。行き先が公式サイトでないのに
       「公式サイト」と書くと、それ自体が誤りになる。 */
    if (typeof o.actionLabel !== 'string' || !o.actionLabel.trim()) {
      failures.push(`${at} actionLabel missing`);
    }
  }
}

/* ---- E. approved Production measurement + weekly video ---------------- */
const productionIndex = read('index.html');
for (const required of ['analytics-v3.js', 'data.html', 'weekly-video.js', 'weekly-video.css']) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`missing ${required}`);
}
if (!productionIndex.includes('<script src="./analytics-v3.js"></script>')) failures.push('index.html: analytics-v3 loader missing');
if (!read('shelf.html').includes('<script src="./analytics-v3.js"></script>')) failures.push('shelf.html: analytics-v3 loader missing');
if (!read('suggest.html').includes('<script src="./analytics-v3.js"></script>')) failures.push('suggest.html: analytics-v3 loader missing');
if (!productionIndex.includes('id="weeklyVideoPlay"') || !productionIndex.includes('data-video-id="TNomzoYXWMc"')) {
  failures.push('index.html: approved weekly video module missing');
}
if (!productionIndex.includes('ページ表示時にはYouTubeへ接続しません')) failures.push('index.html: weekly video pre-click disclosure missing');
if (productionIndex.includes('i.ytimg.com')) failures.push('index.html: external YouTube thumbnail must not load before play');
const weeklyVideoJs = read('weekly-video.js');
if (!weeklyVideoJs.includes('https://www.youtube-nocookie.com/embed/')) failures.push('weekly-video.js: youtube-nocookie embed missing');
if (!weeklyVideoJs.includes("iframe.referrerPolicy = 'strict-origin-when-cross-origin'")) failures.push('weekly-video.js: iframe referrer policy missing');
if (!weeklyVideoJs.includes("button.addEventListener('click'")) failures.push('weekly-video.js: click gate missing');
for (const forbidden of ['youtube.com/iframe_api', 'localStorage', 'sessionStorage', 'indexedDB', 'geolocation']) {
  if (weeklyVideoJs.includes(forbidden)) failures.push(`weekly-video.js: forbidden runtime token ${forbidden}`);
}
const analyticsJs = read('analytics-v3.js');
if (!analyticsJs.includes("var PROD_HOST = 'emotionbookstore.com'")) failures.push('analytics-v3.js: Production hostname guard missing');
if (!analyticsJs.includes('if (location.hostname !== PROD_HOST) return;')) failures.push('analytics-v3.js: non-Production early return missing');
if (!analyticsJs.includes('send_page_view: false')) failures.push('analytics-v3.js: send_page_view must stay false');
if (!analyticsJs.includes('allow_google_signals: false')) failures.push('analytics-v3.js: Google Signals must stay off');
if (!analyticsJs.includes('allow_ad_personalization_signals: false')) failures.push('analytics-v3.js: ad personalization must stay off');
const vercelPolicy = read('vercel.json');
if (!vercelPolicy.includes("frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'")) failures.push('vercel.json: approved YouTube CSP missing');
if (!read('data.html').includes('GA4のオン／オフとは別の操作')) failures.push('data.html: YouTube/GA4 separation disclosure missing');

if (failures.length) {
  console.error('RELEASE_CHECK_FAIL');
  failures.forEach((f) => console.error('- ' + f));
  process.exit(1);
}
const counts = shelves.map((s) => `${s.id}:${s.objects.length}`).join(' ');
const plates = shelves.reduce((n, s) => n + s.objects.filter((o) => o.media.kind === 'plate').length, 0);
const currents = shelves.reduce((n, s) => n + s.objects.filter((o) => o.mode === 'current').length, 0);
const catCounts = cats.map((c) => `${c.id}:${allObjects.filter((o) => (o.categoryIds || []).includes(c.id)).length}`).join(' ');
console.log('RELEASE_CHECK_GO');
console.log(`shelves=4; ${counts}; photo=${12 - plates}; plate=${plates}; current=${currents}; storage=0; analytics=production-host-only; background fetch=0; search=0; account=0`);
console.log(`categories=5; ${catCounts}; explainer=static; suggest=no-backend`);
