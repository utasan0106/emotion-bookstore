#!/usr/bin/env node
/* Release Candidate 01 の静的契約。
   参加者が読む runtime だけを見て、棚の数・件数・言い回し・権利・外部通信の
   境界が崩れていないことを確かめる。ネットワークには一切出ない。 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

for (const file of ['index.html', 'shelf.html', 'suggest.html', 'data.html', 'credits.html', 'explore.html', 'release.css', 'release.js', 'release_content.js', 'analytics-v3.js', 'growth-improvements.js']) {
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
  const wf = shelf.weeklyFeature || {};
  for (const key of ['title','titlePhrases','calendarDates','dateLabel','venue','why','actionLabel','actionUrl','verifiedAt','expiresAt']) {
    if (!wf[key]) failures.push(`${shelf.id}: weeklyFeature missing ${key}`);
  }
  if (Array.isArray(wf.titlePhrases) && wf.titlePhrases.join('') !== wf.title) {
    failures.push(`${shelf.id}: weeklyFeature titlePhrases must join back to title`);
  }
  if (wf.calendarDates && !/^\d{8}\/\d{8}$/.test(wf.calendarDates)) {
    failures.push(`${shelf.id}: weeklyFeature calendarDates must be YYYYMMDD/YYYYMMDD`);
  }
  if (wf.actionUrl && !/^https:\/\//.test(wf.actionUrl)) failures.push(`${shelf.id}: weeklyFeature actionUrl must be https`);
  if (wf.expiresAt && isNaN(Date.parse(wf.expiresAt))) failures.push(`${shelf.id}: weeklyFeature expiresAt invalid`);

  const hm = shelf.heroMedia || {};
  for (const key of ['url','alt','author','source','sourceUrl','license','licenseUrl','modification']) {
    if (!hm[key]) failures.push(`${shelf.id}: heroMedia missing ${key}`);
  }
  if (!/^\.\/assets\/city-/.test(hm.url || '')) failures.push(`${shelf.id}: heroMedia must be local city image`);
  if (hm.url && !fs.existsSync(path.join(root, hm.url.replace(/^\.\//,'')))) failures.push(`${shelf.id}: heroMedia file missing`);

  const em = shelf.entryMedia || {};
  for (const key of ['kind','url','alt','provenance']) {
    if (!em[key]) failures.push(`${shelf.id}: entryMedia missing ${key}`);
  }
  if (em.kind !== 'illustration') failures.push(`${shelf.id}: entryMedia.kind must be illustration`);
  if (!/^\.\/assets\/entry-[a-z-]+\.webp$/.test(em.url || '')) {
    failures.push(`${shelf.id}: entryMedia must be same-origin WebP`);
  }
  if (em.url && !fs.existsSync(path.join(root, em.url.replace(/^\.\//,'')))) {
    failures.push(`${shelf.id}: entryMedia file missing`);
  }
  if (em.width !== 1942 || em.height !== 809) {
    failures.push(`${shelf.id}: entryMedia dimensions must be 1942x809`);
  }
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
    if (!Array.isArray(x.destinations) || !x.destinations.length) failures.push(`detour ${x.kind}: destinations required`);
    for (const d of (x.destinations || [])) {
      if (!d.label || !/^https:\/\//.test(d.url || '')) failures.push(`detour ${x.kind}: invalid destination`);
    }
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
if (!releaseRuntime.includes('shelf.entryMedia || shelf.heroMedia')) {
  failures.push('release.js: Home city renderer must prefer entryMedia and fall back to heroMedia');
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
const EXPLAINER = '感情書店の編集部が選んだ場所・本・音楽・映画・催しを、街や種類ごとに少しずつ並べる文化案内です。';
if (CONTENT && CONTENT.release && CONTENT.release.siteExplainer !== EXPLAINER) {
  failures.push('release.siteExplainer must be the exact fixed sentence');
}
const explainerBlock = (src) => (src.match(/<p class="site-explainer">[\s\S]*?<\/p>/) || [''])[0];
const explainerText = (src) => explainerBlock(src).replace(/<[^>]*>/g, '').replace(/\s+/g, '');
const BRAND_LOCKUP = './assets/brand/emotion-bookstore-lockup-reversed.png';
if (!fs.existsSync(path.join(root, 'assets/brand/emotion-bookstore-lockup-reversed.png'))) {
  failures.push('official brand lockup missing');
}
for (const page of ['shelf.html', 'suggest.html', 'data.html', 'credits.html', 'explore.html']) {
  const src = read(page);
  if (!src.includes('class="brand-lockup-image"') || !src.includes(BRAND_LOCKUP)) {
    failures.push(`${page}: official brand lockup missing from header`);
  }
  if (src.includes('emotion-bookstore-symbol-reversed.svg')) {
    failures.push(`${page}: obsolete header symbol must not remain`);
  }
}
/* HOME は Founder/HQ 承認の VISUAL_CANONICAL（853）どおり wordmark-only。
   旧 symbol + wordmark lockup へ戻さない（HOME 853 brief §2）。 */
{
  const src = read('index.html');
  if (!src.includes('<a class="hc-brand-link" href="./index.html">みんなの感情書店</a>')) {
    failures.push('index.html: canonical wordmark header missing');
  }
  for (const stale of ['brand-lockup-image', 'emotion-bookstore-symbol-reversed.svg', 'emotion-bookstore-lockup-reversed.png']) {
    if (src.includes(stale)) failures.push(`index.html: HOME header must be wordmark-only (${stale})`);
  }
}
const shelfPage = read('shelf.html');
const releaseRuntimeForShelf = read('release.js');
if (shelfPage.includes('id="shelfPortrait"') || shelfPage.includes('class="shelf-portrait"')) {
  failures.push('shelf.html: city portrait must not exist at the top of shelf pages');
}
if (releaseRuntimeForShelf.includes('renderShelfPortrait')) {
  failures.push('release.js: shelf portrait renderer must be removed');
}

const OFFICIAL_OGP = 'https://emotionbookstore.com/assets/ogp-official-artwork-20260901.png';
if (!fs.existsSync(path.join(root, 'assets/ogp-official-artwork-20260901.png'))) {
  failures.push('official OGP artwork missing');
}
for (const page of ['index.html', 'shelf.html', 'suggest.html']) {
  const src = read(page);
  if (!src.includes(OFFICIAL_OGP)) failures.push(`${page}: official OGP artwork URL missing`);
  for (const stale of ['ogp-v3-20260830.png','ogp-v3-city-20260901.png','ogp-official-logo-20260901.png']) {
    if (src.includes(stale)) failures.push(`${page}: stale OGP URL remains (${stale})`);
  }
}

for (const page of ['index.html', 'shelf.html', 'suggest.html', 'data.html', 'credits.html', 'explore.html']) {
  const src = read(page);
  if (!src.includes('id="siteMenuButton"') || !src.includes('id="siteMenu"')) {
    failures.push(`${page}: MENU trigger/dialog missing`);
  }
}
const shelfHtmlForFeature = read('shelf.html');
if (!shelfHtmlForFeature.includes('id="weeklyFeature"') ||
    !shelfHtmlForFeature.includes('id="weeklyFeatureContent"')) {
  failures.push('shelf.html: weekly feature container missing');
}
const menuRuntime = read('release.js');
if (!menuRuntime.includes('function initSiteMenu()')) failures.push('release.js: site menu runtime missing');
if (!menuRuntime.includes('function renderWeeklyFeature(shelf)')) failures.push('release.js: weekly feature runtime missing');
if (!menuRuntime.includes('renderWeeklyFeature(shelf);')) failures.push('release.js: weekly feature must render from selected shelf');

const FINAL_AMAZON_TAG = 'uta0106-22';
const FINAL_RAKUTEN_AFFILIATE_ID = '5590cc07.86ee74b4.5590cc08.a766f047';
const finalContent = read('release_content.js');
if (!finalContent.includes(FINAL_AMAZON_TAG)) failures.push('Amazon tracking ID missing');
if (!finalContent.includes(FINAL_RAKUTEN_AFFILIATE_ID)) failures.push('Rakuten affiliate ID missing');
if (!finalContent.includes('open.spotify.com/track/36Thm3dOVuCR4SFyzwJioN')) failures.push('Spotify destination missing');
if (!finalContent.includes('music.apple.com/jp/search?')) failures.push('Apple Music destination missing');
if (!finalContent.includes('primevideo.com/-/ja/detail/0IBT9N6EWCZ8AEEA4511KKYAE3')) failures.push('Prime Video destination missing');

const freshnessRuntime = read('release.js');
for (const required of [
  'function formatVerifiedDate(value)',
  "class: 'detail-freshness'",
  "class: 'weekly-feature-verified'",
  "class: 'archive-verified'"
]) {
  if (!freshnessRuntime.includes(required)) failures.push(`release.js: visible freshness missing ${required}`);
}

const finalRuntime = read('release.js');
for (const required of [
  'emotionBookstore.v3.weeklyFavorites.v1',
  'function renderMenuFavorites()',
  'https://calendar.google.com/calendar/render?',
  'function detourDestinations(item)'
]) {
  if (!finalRuntime.includes(required)) failures.push(`release.js: final UI runtime missing ${required}`);
}

/* MENU は全ページ同じ。旧 HOME の「今週の寄り道」「種類から見る」は canonical に
   無いので、Founder/HQ の指示どおり「いま辿れるスレッド」「作品から入る」へ。
   写真・出典（credits.html）は HOME 本文へ長い attribution を載せない代わりの
   静かな surface なので、どのページの MENU からも届くこと。 */
const MENU_PAGES = ['index.html','shelf.html','suggest.html','data.html','credits.html','explore.html'];
for (const page of MENU_PAGES) {
  const src = read(page);
  if (src.includes('<p class="pilot-label">4つの街</p>')) failures.push(`${page}: header must not show 4つの街 beside MENU`);
  for (const label of ['作品から入る','いま辿れるスレッド','候補を教える','気になるリスト','データの扱い','写真・出典']) {
    if (!src.includes(label)) failures.push(`${page}: MENU missing ${label}`);
  }
  for (const [href, label] of [['./index.html#hc-works','作品から入る'],['./index.html#hc-thread','いま辿れるスレッド'],['./credits.html','写真・出典'],['./suggest.html','候補を教える'],['./data.html','データの扱い']]) {
    if (!src.includes(`href="${href}"`)) failures.push(`${page}: MENU link missing ${label} → ${href}`);
  }
  for (const retired of ['<span>今週の寄り道</span>','<span>種類から見る</span>','#weekly-detour','#by-kind']) {
    if (src.includes(retired)) failures.push(`${page}: retired HOME anchor/label remains (${retired})`);
  }
}
/* affiliate disclosure は affiliate 導線が描画されるページに置く。canonical HOME
   には footer も affiliate link も無い（無いことを確認する）。 */
for (const page of ['shelf.html','suggest.html','data.html']) {
  if (!read(page).includes('Amazon のアソシエイトとして、みんなの感情書店は適格販売により収入を得ています。')) {
    failures.push(`${page}: Amazon disclosure missing`);
  }
}
for (const token of ['amazon.co.jp', 'rakuten.co.jp', 'a.r10.to', 'amzn.to', 'tag=uta0106-22']) {
  if (read('index.html').includes(token)) failures.push(`index.html: HOME must not carry affiliate links (${token}) — it has no disclosure surface`);
}
/* 行き先の無い anchor を残さない。index.html#xxx への link は、index.html に
   静的に存在する id か、growth-improvements.js が runtime で作る id だけ。 */
{
  const homeIds = new Set([...read('index.html').matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const runtimeIds = new Set([...read('growth-improvements.js').matchAll(/\.id = '([^']+)'/g)].map((m) => m[1]));
  for (const file of [...MENU_PAGES, 'growth-improvements.js', 'release.js']) {
    for (const m of read(file).matchAll(/index\.html#([A-Za-z0-9_-]+)/g)) {
      if (!homeIds.has(m[1]) && !runtimeIds.has(m[1])) failures.push(`${file}: links to index.html#${m[1]} but HOME has no such id`);
    }
  }
  for (const id of ['hc-works', 'hc-thread']) if (!homeIds.has(id)) failures.push(`index.html: section id missing (${id})`);
}
for (const page of ['shelf.html','suggest.html','data.html','credits.html','explore.html']) {
  const src = read(page);
  if (!src.includes('class="footer-brand"') ||
      !src.includes('class="footer-brand-image"') ||
      !src.includes('./assets/brand/emotion-bookstore-lockup-reversed.png')) {
    failures.push(`${page}: official footer brand lockup missing`);
  }
}
if (read('index.html').includes('class="site-footer"')) failures.push('index.html: canonical HOME ends at 現実へ出る — no footer');

const dataPageFinal = read('data.html');
if (!dataPageFinal.includes('気になる') || !dataPageFinal.includes('localStorage')) failures.push('data.html: favorites storage explanation missing');
if (!dataPageFinal.includes('Amazon のアソシエイトとして')) failures.push('data.html: affiliate explanation missing');
if (!dataPageFinal.includes('id="siteMenuButton"')) failures.push('data.html: MENU missing');

const responsiveCss = read('release.css');
for (const required of [
  '.site-explainer .explainer-line',
  'HOME — CONTENT-LED IMMERSIVE TIME',
  '.hc-hero-trace'
]) {
  if (!responsiveCss.includes(required)) {
    failures.push(`release.css: mobile/editorial contract missing ${required}`);
  }
}

/* ---- HOME canonical (853) — 専用 gate をこの gate の一部として走らせる ---- */
{
  const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'home_canonical_check.js')], { encoding: 'utf8' });
  if (r.status !== 0) {
    failures.push('qa/home_canonical_check.js FAIL');
    for (const line of String(r.stderr || '').split('\n')) if (line.startsWith('- ')) failures.push('  home_canonical: ' + line.slice(2));
  }
}
/* 4街の写真は canonical の夜の階調へ CSS だけで寄せる（原本無加工）。 */
const cityCss = read('release.css');
const hcCss = cityCss.slice(cityCss.indexOf('HOME — CONTENT-LED IMMERSIVE TIME'));
for (const required of ['.hc-hero-media::after', '.hc-city-media img', '.hc-city-media::after', 'object-fit: cover', '.hc-reality-shot img']) {
  if (!hcCss.includes(required)) failures.push(`release.css: HOME canonical photo treatment missing ${required}`);
}
/* Cultural trace は装飾。操作面に乗らず、年号は Evidence 済みの4つだけ。 */
{
  const src = read('index.html');
  const svg = (src.match(/<svg class="hc-hero-trace"[\s\S]*?<\/svg>/) || [''])[0];
  if (!svg) failures.push('index.html: hero cultural trace missing');
  const years = [...svg.matchAll(/<text[^>]*>(\d{4})<\/text>/g)].map((m) => m[1]);
  if (years.join(',') !== '1957,1961,1963,2026') failures.push(`index.html: hero trace years must be exactly the evidence-cleared 1957,1961,1963,2026 (got ${years.join(',') || 'none'})`);
  if (!/aria-hidden="true"/.test(svg)) failures.push('index.html: hero trace must be aria-hidden');
  if (/<(a|animate|animateTransform|animateMotion|set|script)\b/.test(svg)) failures.push('index.html: hero trace must be static and non-interactive');
  if (!/\.hc-hero-trace\s*\{[^}]*pointer-events:\s*none/.test(hcCss)) failures.push('release.css: .hc-hero-trace needs pointer-events: none');
}

/* canonical HOME には site-explainer が無い。HOME では hero の copy（H1 + sub）が
   最初の街の写真より DOM 上で先にあり、HERO の写真は装飾（alt=""）であること。 */
{
  const src = read('index.html');
  const h1 = src.indexOf('<h1 id="hc-hero-title"');
  const sub = src.indexOf('街から。作品から。ひとつの痕跡から。');
  const firstCity = src.indexOf('class="hc-city shelf-entry"');
  if (h1 < 0 || sub < 0 || firstCity < 0 || h1 > firstCity || sub > firstCity) failures.push('index.html: hero copy must precede the first city entry');
  if (!src.includes('<img src="./assets/city-koenji.jpg" alt="" width="1200" height="1600" fetchpriority="high"')) failures.push('index.html: hero photograph must be decorative (alt="") and fetchpriority high');
}
for (const page of ['shelf.html', 'suggest.html', 'data.html', 'credits.html', 'explore.html']) {
  const src = read(page);
  if (explainerText(src) !== EXPLAINER.replace(/\s+/g, '')) {
    failures.push(`${page}: exact site explainer missing`); continue;
  }
  // 折返しは Chromium 専用の auto-phrase ではなく markup で決める。
  if (!/<span class="[^"]*\bjp-phrase\b[^"]*">[^<]+<\/span><wbr>/.test(explainerBlock(src))) {
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
if (!Array.isArray(CONTENT.archive)) failures.push('archive must be an array');
const archiveIds = new Set();
for (const entry of (CONTENT.archive || [])) {
  for (const key of ['id','sourceKind','shelfId','area','categoryIds','title','typeLabel','summary','verifiedAt','archivedAt']) {
    if (!entry[key]) failures.push(`archive entry missing ${key}`);
  }
  if (archiveIds.has(entry.id)) failures.push(`duplicate archive id: ${entry.id}`);
  archiveIds.add(entry.id);
  if (!EXPECTED_SHELVES.includes(entry.shelfId)) failures.push(`${entry.id}: archive shelfId must be known`);
  if (!Array.isArray(entry.categoryIds) || !entry.categoryIds.length) failures.push(`${entry.id}: archive categoryIds required`);
  for (const c of (entry.categoryIds || [])) if (!catIds.has(c)) failures.push(`${entry.id}: unknown archive category ${c}`);
  if (entry.actionUrl && !/^https:\/\//.test(entry.actionUrl)) failures.push(`${entry.id}: archive actionUrl must be https`);
}
const allObjects = shelves.flatMap((sh) => sh.objects);
for (const object of allObjects) {
  if (!object.verifiedAt || Number.isNaN(Date.parse(object.verifiedAt))) {
    failures.push(`${object.id}: verifiedAt required and must be parseable`);
  }
}
for (const shelf of shelves) {
  const wf = shelf.weeklyFeature;
  if (wf && (!wf.verifiedAt || Number.isNaN(Date.parse(wf.verifiedAt)))) {
    failures.push(`${shelf.id}: weeklyFeature verifiedAt required and must be parseable`);
  }
}
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
/* canonical HOME の二軸は「街から入る」「作品から入る」。旧 category 索引
   （種類から見る / categoryIndex / categoryTownIndex / categoryArchive）は
   HOME から外れているので、復活していないことも見る。 */
const foyerSrc = read('index.html');
for (const [axis, id] of [['街から入る', 'hc-cities-title'], ['作品から入る', 'hc-works-title']]) {
  if (!foyerSrc.includes(`id="${id}"`) || !foyerSrc.includes(axis)) failures.push(`index.html: entry axis missing (${axis})`);
}
for (const stale of ['id="categoryIndex"', 'id="categoryTownIndex"', 'id="categoryArchive"', 'id="by-kind"', 'id="weekly-detour"', 'class="entry-axis"']) {
  if (foyerSrc.includes(stale)) failures.push(`index.html: retired HOME surface present (${stale})`);
}
if ((foyerSrc.match(/class="hc-work(?:\s|")/g) || []).length !== 4) failures.push('index.html: 作品から入る must have exactly 4 entries');
const categoryRuntimeFinal = read('release.js');
for (const required of [
  'function archiveInCategory(categoryId, townId)',
  'function archiveResult(entry)',
  "queryParams().get('town')",
  "class: 'category-town-link'"
]) {
  if (!categoryRuntimeFinal.includes(required)) failures.push(`release.js: category town/archive runtime missing ${required}`);
}

/* ---- F. explore.html — 有限 compatibility surface ----------------------
   旧 HOME の「種類から見る」（街 × 種類の有限索引）と ARCHIVE は Canonical HOME
   に戻さず、explore.html だけがその DOM を持つ。新しい推薦・feed・ranking・
   data model ではない。saved record / traversal の行き先は意味を保つ
   （NO EVIDENCE = NO ROUTE）。ARCHIVE は explore.html の host にだけ描く。 */
{
  const ex = read('explore.html');
  for (const hook of ['id="categoryTownIndex"', 'id="categoryIndex"', 'id="categoryResults"', 'id="categoryArchive"',
    'id="categoryArchiveResults"', 'id="archiveHost"', 'id="live"', 'id="main"', 'class="skip-link" href="#main"']) {
    if (!ex.includes(hook)) failures.push(`explore.html: required hook missing (${hook})`);
  }
  if (!/<div id="archiveHost"[^>]*\bhidden\b/.test(ex)) failures.push('explore.html: archive host must start hidden (no empty archive UI)');
  if (/\bid="archive"/.test(ex)) failures.push('explore.html: #archive must exist only at runtime, when entries exist');
  if (ex.includes('id="shelfList"') || ex.includes('id="detourList"') || ex.includes('weeklyVideoPlay')) failures.push('explore.html: must not host retired HOME modules (shelf list / detour / weekly video)');
  if ((ex.match(/<h1\b/g) || []).length !== 1) failures.push('explore.html needs exactly one h1');
  if (ex.includes('rel="canonical"')) failures.push('explore.html: compatibility surface carries no canonical');
  for (const s of ['./release_content.js', './growth-improvements.js', './release.js', './analytics-v3.js']) {
    if (!ex.includes(`<script src="${s}"></script>`)) failures.push(`explore.html: loader missing ${s}`);
  }
  const exBody = ex.slice(ex.indexOf('<body'));
  for (const m of exBody.match(/(?:src|href)="(?:https?:)?\/\/[^"]+"/g) || []) failures.push(`explore.html must not reference an external host: ${m}`);
  if (/<iframe/i.test(ex)) failures.push('explore.html must not embed an iframe');
  for (const t of ['pagin', 'もっと見る', 'load-more', 'infinite']) {
    if (ex.toLowerCase().includes(t)) failures.push(`explore.html: must stay finite (${t})`);
  }

  /* release.js: 索引は explore.html へ向き、旧 HOME の shelfList 無しでも描ける。
     Canonical HOME にはその DOM が無いので HOME では動かない。 */
  const rel = read('release.js');
  if (!rel.includes("var EXPLORE_PAGE = './explore.html';")) failures.push('release.js: EXPLORE_PAGE missing');
  if (!rel.includes("else if (document.getElementById('categoryIndex')) renderCategoryIndex();")) {
    failures.push('release.js: category index must initialise on explore.html without the retired shelfList');
  }
  if (/'\.\/index\.html\?(?:category|town)=/.test(rel)) failures.push('release.js: category / town links must not point at HOME');
  for (const required of ["return EXPLORE_PAGE + (q ? '?' + q : '');",
    "EXPLORE_PAGE + '?town=' + encodeURIComponent(town.id)", "EXPLORE_PAGE + '?category=' + encodeURIComponent(category.id)"]) {
    if (!rel.includes(required)) failures.push(`release.js: explore index link missing ${required}`);
  }

  /* growth-improvements.js: 意味のある route だけ。ARCHIVE は host 限定。 */
  const growth = read('growth-improvements.js');
  if (!growth.includes("exploreHref({ category: category.id, town: shelf.id }, '')")) failures.push('growth-improvements.js: same-town traversal must carry category + town');
  if (!growth.includes("exploreHref({ category: category.id }, '')")) failures.push('growth-improvements.js: all-town traversal must carry the category');
  if (/index\.html#hc-/.test(growth)) failures.push('growth-improvements.js: saved records / traversal must not be routed to HOME sections (fake route)');
  if (growth.includes("'./index.html#archive'")) failures.push('growth-improvements.js: archive records must point at explore.html#archive');
  if (growth.includes("getElementById('main')")) failures.push('growth-improvements.js: archive must never be appended to #main');
  if (!growth.includes("getElementById('archiveHost')")) failures.push('growth-improvements.js: archive must render only into the explore.html host');
  for (const legacy of ["'#by-kind'", "'#archive'", "'#weekly-detour'", "'#weekly-video-title'"]) {
    if (!growth.includes(legacy)) failures.push(`growth-improvements.js: legacy HOME hash handling missing ${legacy}`);
  }
  if (!growth.includes('旧HOME掲載項目')) failures.push('growth-improvements.js: unavailable legacy records need the non-clickable state');
  if (growth.includes('decorateDetour') || growth.includes('decorateWeeklyVideo')) {
    failures.push('growth-improvements.js: retired detour / weekly video record factories must not mint HOME-section routes');
  }
  for (const token of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'gtag(', 'indexedDB', 'sessionStorage']) {
    if (growth.includes(token)) failures.push(`growth-improvements.js: forbidden runtime token ${token}`);
  }

  /* data.html の trust copy は現在の runtime だけを言う。旧 HOME の週間動画は
     canonical HOME に無く、いまどのページも YouTube を読まない。 */
  const trust = read('data.html');
  for (const stale of ['週末の前の一本', '31秒の動画を再生', 'weeklyVideoPlay', 'youtube-nocookie']) {
    if (trust.includes(stale)) failures.push(`data.html: retired HOME video claim remains (${stale})`);
  }
  if (/トップページ[^<]*(?:YouTube|動画)/.test(trust)) failures.push('data.html: must not describe a HOME video / YouTube behaviour that no longer exists');
  if (!trust.includes('外部サービスへの移動はGA4のオン／オフとは別の操作です。')) failures.push('data.html: external navigation / GA4 separation missing');
  if (!trust.includes('Google Analytics 4（GA4）')) failures.push('data.html: GA4 description missing');
  if (!trust.includes('利用者が押した場合だけ開きます')) failures.push('data.html: explicit external navigation must be described as user-initiated');
}

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
for (const token of ['sessionStorage', 'indexedDB', 'sendBeacon', 'gtag(', 'fetch(',
  'XMLHttpRequest', 'serviceWorker', 'caches.', 'navigator.storage']) {
  if (js.includes(token)) failures.push(`forbidden runtime token: ${token}`);
}
// localStorage は「今週の特集 > 気になる」専用キーだけを許可する。
// それ以外の保存用途へ広がったらFAIL。
const FAVORITES_STORAGE_KEY = "emotionBookstore.v3.weeklyFavorites.v1";
if (!js.includes(`var WEEKLY_FAVORITES_KEY = '${FAVORITES_STORAGE_KEY}';`)) {
  failures.push('release.js: weekly favorites storage key missing');
}
const localStorageCalls = js.match(/localStorage\.(?:getItem|setItem|removeItem|clear)\([^;\n]*/g) || [];
if (localStorageCalls.length !== 3) {
  failures.push(`release.js: expected exactly 3 localStorage calls for weekly favorites, got ${localStorageCalls.length}`);
}
for (const call of localStorageCalls) {
  if (!call.includes('WEEKLY_FAVORITES_KEY')) {
    failures.push(`release.js: unapproved localStorage call (${call})`);
  }
}
const html = read('index.html') + read('shelf.html') + read('suggest.html') + read('explore.html');
const runtime = [html, js, contentJs].join('\n');
for (const word of ['次の3つ', 'また見たい', 'おすすめ', 'あなた向け', 'ランキング', '人気', 'トレンド',
  'NEW', 'TRENDING', 'FOR YOU', '見終わりました']) {
  if (runtime.includes(word)) failures.push(`release runtime must not contain: ${word}`);
}
/* referrer は3ページとも落とさない。外部へ出るとき、どこから来たかを
   相手に渡さない。 */
for (const page of ['index.html', 'shelf.html', 'suggest.html', 'data.html', 'credits.html', 'explore.html']) {
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
/* 写真・出典は静かな surface。棚より上に検索で出す理由が無いので noindex。 */
if (!read('credits.html').includes('noindex,nofollow')) failures.push('credits.html must stay noindex');
/* explore.html は旧 HOME の索引を引き継ぐ compatibility surface。棚より上に
   検索で出す理由が無いので noindex。 */
if (!read('explore.html').includes('noindex,nofollow')) failures.push('explore.html must stay noindex');
for (const page of ['index.html', 'shelf.html']) {
  if (read(page).includes('noindex')) failures.push(`${page} must not be noindex`);
}
/* 共有されたときに何のページか分かること。description と OGP が無いと、
   リンクだけが貼られて中身が伝わらない。og:image は同一オリジンの、
   この案内のために組んだ扉。ほかの製品の画像を借りない。
   2026-08-30、公式ロゴ使用版（ogp-official-artwork-20260901.png）へ差し替えた。
   旧扉（ogp-machi.jpg）は削除せず残す。履歴・他用途の可能性のため。 */
const OGP_IMAGE = 'https://emotionbookstore.com/assets/ogp-official-artwork-20260901.png';
/* ブランドの正規データから起こした画像。同一オリジンに置き、ほかの製品の
   画像（ドメイン直下の shop-seal.png や ogp-v2.jpg）を借りない。
   一度 shop-seal.png を favicon に借りていたが、それは別の製品の意匠だった。 */
for (const f of ['assets/ogp-official-artwork-20260901.png', 'assets/ogp-machi.jpg', 'assets/favicon.ico',
                 'assets/icon-512.png', 'assets/apple-touch-icon.png',
                 'assets/brand/emotion-bookstore-lockup-reversed.png']) {
  if (!fs.existsSync(path.join(root, f))) failures.push(`${f} missing`);
}
/* 実寸が宣言値（1200x630）と食い違っていないこと。crawler は og:image:width/
   height を検証しないので、ここで確認しないと気づけない。
   新規 dependency は入れない指示のため、PNG の IHDR チャンクを直接読む。 */
{
  const p = path.join(root, 'assets/ogp-official-artwork-20260901.png');
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    const isPng = buf.slice(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    const w = isPng ? buf.readUInt32BE(16) : null;
    const h = isPng ? buf.readUInt32BE(20) : null;
    if (!isPng || w !== 1200 || h !== 630) {
      failures.push(`assets/ogp-official-artwork-20260901.png must be a 1200x630 PNG, got ${isPng ? `${w}x${h}` : 'not a PNG'}`);
    }
  }
}
for (const page of ['index.html', 'shelf.html', 'suggest.html', 'data.html', 'credits.html', 'explore.html']) {
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
const visibleCityH1 = '<h1 id="hc-hero-title" class="hc-hero-title"><span class="hc-hero-line">文化の</span><span class="hc-hero-line">つながりを、</span><span class="hc-hero-line">歩く。</span></h1>';
if (!foyer.includes(visibleCityH1)) {
  failures.push('foyer visible H1 must be 文化の／つながりを、／歩く。 (VISUAL_CANONICAL)');
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
for (const sel of ['.plate-word']) {
  if (!/overflow-wrap:\s*anywhere/.test(rule(sel))) {
    failures.push(`${sel} needs overflow-wrap: anywhere so it cannot widen min-content`);
  }
}
/* canonical HOME の折返しは markup で決める（auto-phrase に依存しない）。
   行の span は block でなければ canonical の行数にならない。 */
for (const sel of ['.hc-hero-line', '.hc-city-q-line', '.hc-hero-aside-line', '.hc-reality-line']) {
  if (!/display:\s*block/.test(rule(sel))) failures.push(`${sel} must be display: block (canonical hard line break)`);
}
if (read('index.html').includes('shelf-tagline')) failures.push('index.html: retired .shelf-tagline entry must not return to HOME');
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

/* ---- 写真・出典（credits.html）------------------------------------------
   HOME 本文へ長い attribution を常時載せない代わりの surface。HOME が参照する
   第三者写真は全部ここに、8項目そろって記録されていること。CC0 も provenance
   として同じ形で残す。credits.html があることは「法務的に完全 OK」の自己判定
   ではない —— 各 license の条件確認は Founder/HQ の gate。 */
{
  const credits = read('credits.html');
  const OWN = new Set(['favicon.ico', 'icon-512.png', 'apple-touch-icon.png', 'ogp-official-artwork-20260901.png']);
  const homePhotos = [...new Set([...read('index.html').matchAll(/\.\/assets\/([^"/]+\.(?:jpg|jpeg|png|webp))"/g)].map((m) => m[1]))]
    .filter((f) => !OWN.has(f));
  if (!homePhotos.length) failures.push('index.html: no photograph referenced — canonical HOME has eight photo slots');
  for (const f of homePhotos) {
    const entry = (credits.match(new RegExp(`<article class="credits-entry" data-credit-asset="${f.replace(/\./g, '\\.')}">[\\s\\S]*?<\\/article>`)) || [''])[0];
    if (!entry) { failures.push(`credits.html: HOME photo has no credit entry (${f})`); continue; }
    for (const field of ['使用場所', '被写体', '作者', '出典', '出典URL', 'ライセンス', 'ライセンスURL', '改変']) {
      if (!entry.includes(`<dt>${field}</dt>`)) failures.push(`credits.html: ${f} entry missing ${field}`);
    }
    if (!/href="https:\/\/creativecommons\.org\/(licenses|publicdomain)\//.test(entry)) failures.push(`credits.html: ${f} entry needs a CC license URL`);
    if (!/href="https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(entry)) failures.push(`credits.html: ${f} entry needs its source File page URL`);
    if (!entry.includes('トップ')) failures.push(`credits.html: ${f} entry must say it is used on トップ`);
  }
  /* credits に載っている作者・出典・license は release_content.js の rights /
     heroMedia と食い違わないこと。 */
  const known = {};
  for (const shelf of shelves) {
    if (shelf.heroMedia && shelf.heroMedia.url) known[shelf.heroMedia.url.replace(/^\.\/assets\//, '')] = shelf.heroMedia;
    for (const o of shelf.objects) if (o.rights && o.media && o.media.url) known[o.media.url.replace(/^\.\/assets\//, '')] = o.rights;
  }
  /* HOME 専用写真（棚の heroMedia でも Object の media でもない図版）の権利は
     release_content.js の content model には属さない。HQ 決定（HOME_ASSET_R3_RESUME_V2
     §5）で別台帳 HOME_ASSET_LEDGER.json を source of truth にする。QA を通すためだけの
     偽 Object を release_content.js に足さない。棚 / Object media の既存契約は不変。 */
  const LEDGER = 'experiments/home-visual-fidelity/asset-round-3/HOME_ASSET_LEDGER.json';
  const ledgerByFile = {};
  if (fs.existsSync(path.join(root, LEDGER))) {
    let ledger = [];
    try { ledger = JSON.parse(read(LEDGER)); } catch (e) { failures.push(`${LEDGER}: invalid JSON (${e.message})`); }
    if (!Array.isArray(ledger)) { failures.push(`${LEDGER}: must be an array of entries`); ledger = []; }
    for (const e of ledger) {
      const rp = String((e && e.runtimePath) || '');
      if (!/^\.\/assets\/[^/]+\.(?:jpg|jpeg|png|webp)$/.test(rp)) { failures.push(`${LEDGER}: runtimePath must be ./assets/<file> (${rp})`); continue; }
      const f = rp.replace(/^\.\/assets\//, '');
      if (ledgerByFile[f]) failures.push(`${LEDGER}: duplicate entry ${f}`);
      ledgerByFile[f] = e;
      const abs = path.join(root, rp.replace(/^\.\//, ''));
      if (!fs.existsSync(abs)) failures.push(`${LEDGER}: runtime file missing ${rp}`);
      for (const k of ['slot', 'author', 'source', 'sourceUrl', 'license', 'licenseUrl', 'modification', 'derivativeSha256', 'checkedAt']) {
        if (!e[k] || !String(e[k]).trim()) failures.push(`${LEDGER}: ${f} missing ${k}`);
      }
      for (const k of ['sourceUrl', 'licenseUrl']) if (e[k] && !/^https:\/\//.test(e[k])) failures.push(`${LEDGER}: ${f} ${k} must be https`);
      for (const k of ['sourceDimensions', 'derivativeDimensions']) {
        if (!Array.isArray(e[k]) || e[k].length !== 2 || !e[k].every((n) => Number.isInteger(n) && n > 0)) failures.push(`${LEDGER}: ${f} ${k} must be [width, height]`);
      }
      if (e.derivativeSha256 && fs.existsSync(abs)) {
        const actual = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
        if (actual !== e.derivativeSha256) failures.push(`${LEDGER}: ${f} derivativeSha256 does not match the file on disk`);
      }
      if (!homePhotos.includes(f)) failures.push(`${LEDGER}: ${f} is in the ledger but index.html does not use it`);
      if (known[f]) failures.push(`${LEDGER}: ${f} is shelf/Object media — its rights live in release_content.js, not in the ledger`);
      const entry = (credits.match(new RegExp(`data-credit-asset="${f.replace(/\./g, '\\.')}">[\\s\\S]*?<\\/article>`)) || [''])[0];
      if (!entry) { failures.push(`credits.html: ledger asset ${f} has no credit entry`); continue; }
      for (const [k, v] of [['author', e.author], ['license', e.license], ['sourceUrl', e.sourceUrl], ['licenseUrl', e.licenseUrl]]) {
        if (v && !entry.includes(String(v))) failures.push(`credits.html: ${f} ${k} does not match ${LEDGER} (${v})`);
      }
    }
  }
  for (const f of homePhotos) {
    const r = known[f];
    if (!r) {
      if (!ledgerByFile[f]) failures.push(`HOME photo ${f} has neither a release_content.js rights record nor a HOME asset ledger entry (${LEDGER})`);
      continue;
    }
    const entry = (credits.match(new RegExp(`data-credit-asset="${f.replace(/\./g, '\\.')}">[\\s\\S]*?<\\/article>`)) || [''])[0];
    for (const [k, v] of [['author', r.author], ['license', r.license], ['sourceUrl', r.sourceUrl], ['licenseUrl', r.licenseUrl]]) {
      const needle = k === 'author' ? String(v).split(' / ')[0] : String(v);
      if (v && !entry.includes(needle)) failures.push(`credits.html: ${f} ${k} does not match release_content.js (${needle})`);
    }
  }
  if (/<iframe|<script src="http|<img src="http/.test(credits)) failures.push('credits.html: must not load external resources');
  if ((credits.match(/<h1\b/g) || []).length !== 1) failures.push('credits.html needs exactly one h1');
  if (!/<a\b[^>]*href="\.\/data\.html"[^>]*>データの扱い<\/a>/.test(credits)) failures.push('credits.html: data.html link missing');
}

/* ---- E. approved Production measurement + weekly video ---------------- */
const productionIndex = read('index.html');
for (const required of ['analytics-v3.js', 'data.html', 'credits.html']) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`missing ${required}`);
}
if (!productionIndex.includes('<script src="./analytics-v3.js"></script>')) failures.push('index.html: analytics-v3 loader missing');
if (!read('shelf.html').includes('<script src="./analytics-v3.js"></script>')) failures.push('shelf.html: analytics-v3 loader missing');
if (!read('suggest.html').includes('<script src="./analytics-v3.js"></script>')) failures.push('suggest.html: analytics-v3 loader missing');
/* canonical HOME に週間動画 module は無い。旧 module の「押すまで YouTube へ
   接続しない」より強い契約 —— HOME は表示時も操作時も外部 host へ出ない —— を
   ここで固定する（qa/home_canonical_check.js が external host 0 を見る）。 */
for (const retired of ['weekly-video.js', 'weekly-video.css', 'id="weeklyVideoPlay"', 'data-video-id=', 'youtube', 'i.ytimg.com', '<iframe']) {
  if (productionIndex.includes(retired)) failures.push(`index.html: canonical HOME must not carry the retired weekly video module (${retired})`);
}
/* weekly-video.js はどのページからも読まれなくなったが、file が残る限り
   その click gate 契約は維持する（再接続されたときに黙って弱くならない）。 */
if (fs.existsSync(path.join(root, 'weekly-video.js'))) {
  const weeklyVideoJs = read('weekly-video.js');
  if (!weeklyVideoJs.includes('https://www.youtube-nocookie.com/embed/')) failures.push('weekly-video.js: youtube-nocookie embed missing');
  if (!weeklyVideoJs.includes("iframe.referrerPolicy = 'strict-origin-when-cross-origin'")) failures.push('weekly-video.js: iframe referrer policy missing');
  if (!weeklyVideoJs.includes("button.addEventListener('click'")) failures.push('weekly-video.js: click gate missing');
  for (const forbidden of ['youtube.com/iframe_api', 'localStorage', 'sessionStorage', 'indexedDB', 'geolocation']) {
    if (weeklyVideoJs.includes(forbidden)) failures.push(`weekly-video.js: forbidden runtime token ${forbidden}`);
  }
}
for (const page of ['shelf.html', 'suggest.html', 'data.html', 'credits.html', 'explore.html']) {
  if (read(page).includes('weekly-video.js')) failures.push(`${page}: retired weekly video module must not be loaded`);
}
const analyticsJs = read('analytics-v3.js');
if (!analyticsJs.includes("var PROD_HOST = 'emotionbookstore.com'")) failures.push('analytics-v3.js: Production hostname guard missing');
if (!analyticsJs.includes('if (location.hostname !== PROD_HOST) return;')) failures.push('analytics-v3.js: non-Production early return missing');
if (!analyticsJs.includes('send_page_view: false')) failures.push('analytics-v3.js: send_page_view must stay false');
if (!analyticsJs.includes('allow_google_signals: false')) failures.push('analytics-v3.js: Google Signals must stay off');
if (!analyticsJs.includes('allow_ad_personalization_signals: false')) failures.push('analytics-v3.js: ad personalization must stay off');
const vercelPolicy = read('vercel.json');
if (!vercelPolicy.includes("frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'")) failures.push('vercel.json: approved YouTube CSP missing');
if (!read('data.html').includes('GA4のオン／オフとは別の操作')) failures.push('data.html: external navigation / GA4 separation disclosure missing');

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
