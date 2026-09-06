#!/usr/bin/env node
/* HOME CANONICAL CHECK — 853px VISUAL_CANONICAL の静的契約。
 *
 * Founder/HQ 承認済み HOME 画像が定める新しい HOME の形を、runtime だけを
 * 読んで固定する。ネットワークには一切出ない。
 *
 * この file は qa/release_check.js を置き換えない。release_check.js は
 * 旧 HOME（今日は、どの街へ。／ 種類から見る ／ 今週の寄り道 ／ 週間動画）を
 * 前提にした assertion を持っているので、canonical がそれを supersede する
 * かどうかは Founder/HQ の決定。ここでは新しい契約だけを検証する。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const check = (cond, msg) => { if (!cond) failures.push(msg); };

const html = read('index.html');
const css = read('release.css');

/* ---- 1. section の並びが canonical のとおり ---------------------------- */

const SECTIONS = [
  ['HERO', 'class="hc-hero"'],
  ['街から入る', 'id="hc-cities-title"'],
  ['作品から入る', 'id="hc-works-title"'],
  ['いま辿れるスレッド', 'id="hc-thread-title"'],
  ['実際の場所へ', 'id="hc-reality-title"'],
];
let cursor = -1;
for (const [name, marker] of SECTIONS) {
  const at = html.indexOf(marker);
  if (at < 0) { failures.push(`section missing: ${name}`); continue; }
  if (at < cursor) failures.push(`section out of order: ${name}`);
  cursor = at;
}
// canonical に無い旧 HOME section が復活していないこと
for (const [name, marker] of [
  ['週間動画', 'weekly-video-section'],
  ['種類から見る', 'id="by-kind"'],
  ['今週の寄り道', 'id="weekly-detour"'],
  ['候補を教える lane', 'suggest-lane'],
]) {
  if (html.includes(marker)) failures.push(`section not in canonical is present: ${name}`);
}

/* ---- 2. core copy が一字も違わない ------------------------------------ */

const COPY = [
  '<span class="hc-hero-line">文化の</span><span class="hc-hero-line">つながりを、</span><span class="hc-hero-line">歩く。</span>',
  '街から。作品から。ひとつの痕跡から。',
  'スレッドを見る',
  '街から入る', '街には、文化が息づく理由がある。',
  '作品から入る', '本・映画・音楽・映像… あらゆる作品が、街とつながっている。',
  'いま辿れるスレッド', 'ひとつの痕跡から、物語をたどる。',
  '注目のスレッド', '踊りが街に根づくまで', '踊りがつなぐ、街・人・記憶の輪。', 'スレッドを読む',
  '実際の場所へ', '気になった場所は、公式情報を確かめて、', '実際の街へ。',
];
for (const c of COPY) check(html.includes(c), `core copy missing: ${c.slice(0, 40)}`);

const CITY_COPY = [
  /* FOUNDER PREVIEW FIX A3: 因果の問いは shelf route が答えないので、4 街とも実際の遷移内容に合う同じ copy。 */
  ['高円寺', ['この街で出会える', '場所・作品などを', '3つだけ。']],
  ['吉祥寺', ['この街で出会える', '場所・作品などを', '3つだけ。']],
  ['下北沢', ['この街で出会える', '場所・作品などを', '3つだけ。']],
  ['神保町', ['この街で出会える', '場所・作品などを', '3つだけ。']],
];
for (const [city, lines] of CITY_COPY) {
  check(html.includes(`>${city}</span>`), `city name missing: ${city}`);
  for (const l of lines) check(html.includes(`<span class="hc-city-q-line">${l}</span>`), `city question line missing: ${city} / ${l}`);
}
for (const w of ['本', '映画', '音楽', '映像']) {
  check(html.includes(`<span class="hc-work-label">${w}</span>`), `work entry missing: ${w}`);
}
const NODES = [['街', '高円寺'], ['出来事', '阿波おどり'], ['人', '踊り手たち'], ['資料', '記録と写真'], ['現在', 'つづく祭り']];
let nodeCursor = -1;
for (const [kind, name] of NODES) {
  const at = html.indexOf(`<span class="hc-node-kind">${kind}</span><span class="hc-node-name">${name}</span>`);
  if (at < 0) { failures.push(`thread node missing: ${kind}/${name}`); continue; }
  if (at < nodeCursor) failures.push(`thread node out of order: ${kind}/${name}`);
  nodeCursor = at;
}
check((html.match(/class="hc-node"/g) || []).length === 5, 'thread chain must have exactly 5 nodes');

/* ---- 3. 既存の functional contract を壊していない ---------------------- */

// 4街の棚リンク。GA4 の v3_shelf_open は .shelf-entry を closest() で拾うので、
// class を落とすと計測が黙って止まる。
for (const id of ['koenji', 'kichijoji', 'shimokitazawa', 'jinbocho']) {
  const re = new RegExp(`<a class="hc-city shelf-entry" href="\\./shelf\\.html\\?shelf=${id}">`);
  check(re.test(html), `shelf link with .shelf-entry missing: ${id}`);
}
check((html.match(/class="hc-city shelf-entry"/g) || []).length === 4, 'exactly 4 shelf entries expected');

check(html.includes('<script src="./analytics-v3.js"></script>'), 'analytics-v3 loader missing');
check(html.includes('<script src="./release.js"></script>'), 'release.js loader missing');
check(html.includes('<script src="./release_content.js"></script>'), 'release_content.js loader missing');
check(html.includes('<script src="./growth-improvements.js"></script>'), 'growth-improvements.js loader missing');
check(/<a\b[^>]*href="\.\/data\.html"[^>]*>データの扱い<\/a>/.test(html), 'data.html link missing');
check(html.includes('href="./suggest.html"'), 'suggest flow entry missing');

// menu dialog の hook（release.js initSiteMenu / renderMenuFavorites）
for (const hook of ['id="siteMenuButton"', 'id="siteMenu"', 'id="siteMenuClose"', 'id="siteMenuFavorites"', 'class="site-menu-secondary"']) {
  check(html.includes(hook), `site menu hook missing: ${hook}`);
}
for (const id of ['kichijoji', 'koenji', 'shimokitazawa', 'jinbocho']) {
  check(html.includes(`data-menu-shelf="${id}"`), `menu shelf link missing: ${id}`);
}
check(html.includes('class="skip-link" href="#main"'), 'skip link missing');
check(html.includes('id="main"'), '#main missing');
check(html.includes('id="live"'), 'live region missing');
check(html.includes('<link rel="canonical" href="https://emotionbookstore.com/">'), 'canonical link missing');
check((html.match(/<h1\b/g) || []).length === 1, 'exactly one h1 expected');

// 行き先の無い anchor を残さない
check(!html.includes('index.html#weekly-detour'), 'dead anchor: #weekly-detour');
check(!html.includes('index.html#by-kind'), 'dead anchor: #by-kind');
check(!html.includes('index.html#archive'), 'dead anchor: #archive (archive lives on explore.html)');

/* ---- 4. ROUTE_HOLD は navigate しない -------------------------------- */

/* FOUNDER PREVIEW FIX A5: false affordance を持たない。route hold は 0。 */
const HOLDS = [];
for (const h of HOLDS) {
  const re = new RegExp(`data-route-hold="${h}"`);
  check(re.test(html), `ROUTE_HOLD marker missing: ${h}`);
}
// route が無いものに嘘のリンクを作っていないこと
for (const m of html.match(/<[^>]*data-route-hold="[^"]*"[^>]*>/g) || []) {
  if (/\bhref=/.test(m) || /\bonclick=/.test(m)) failures.push(`ROUTE_HOLD element must not navigate: ${m.slice(0, 70)}`);
  if (/^<(a|button)\b/.test(m)) failures.push(`ROUTE_HOLD element must not be a/button: ${m.slice(0, 70)}`);
}
check((html.match(/data-route-hold="/g) || []).length === HOLDS.length, `exactly ${HOLDS.length} route holds expected`);
// KOENJI R2 + FOUNDER PREVIEW FIX A1: section 4 の「スレッドを読む」と hero の「スレッドを見る」が同じ実 route（thread.html?thread=koenji-awaodori）。
const THREAD_ANCHOR = '<a class="hc-thread-read" href="./thread.html?thread=koenji-dance-history">スレッドを読む<span class="hc-thread-read-mark" aria-hidden="true">→</span></a>';
check(html.split(THREAD_ANCHOR).length === 2, 'thread read must be the real anchor to ./thread.html?thread=koenji-dance-history, exactly once');
check(!html.includes('data-route-hold="thread-koenji-awaodori"'), 'retired hold thread-koenji-awaodori must not remain');
const HERO_ANCHOR = '<a class="hc-hero-cta" href="./thread.html?thread=koenji-dance-history"><span class="hc-hero-cta-label">スレッドを見る</span><span class="hc-hero-cta-mark" aria-hidden="true">→</span></a>';
check(html.split(HERO_ANCHOR).length === 2, 'hero スレッドを見る must be the real anchor to ./thread.html?thread=koenji-dance-history, exactly once (no data-route-hold)');
check(!html.includes('data-route-hold'), 'HOME must carry no data-route-hold at all');
check((html.match(/thread\.html/g) || []).length === 2, 'HOME must link the Thread route exactly twice (hero CTA + section 4)');
// FOUNDER PREVIEW FIX A2 / A4: route の無い「すべて見る」「スポットを探す」は出さない（新しい一覧 / spots page も作らない）
check(!html.includes('すべて見る') && !html.includes('hc-section-more'), 'false affordance すべて見る must be absent');
check(!html.includes('スポットを探す') && !html.includes('hc-reality-cta'), 'false affordance スポットを探す must be absent');
check(!/どうやって/.test(html), 'the retired causal city questions must be absent');
check(fs.existsSync(path.join(root, 'thread.html')), 'thread route target thread.html must exist on disk');
// WORKS ENTRY: 作品 4 card（本 / 映画 / 音楽 / 映像）は works.html#book / #film / #music / #video への
// 実 anchor（hold 7 → 3）。hc-work-media / hc-work-foot / icon / label / → / 画像 / 順序 / copy は不変。
// .shelf-entry は付けない（GA4 v3_shelf_open が誤発火する）。
for (const w of ['book', 'film', 'music', 'video']) {
  check(html.split(`<a class="hc-work" data-work="${w}" href="./works.html#${w}">`).length === 2, `work card must be the real anchor to ./works.html#${w}, exactly once`);
  check(!html.includes(`data-route-hold="work-${w}"`), `retired hold work-${w} must not remain`);
}
check((html.match(/class="hc-work"/g) || []).length === 4, 'exactly four work anchors expected');
check(!/<a class="[^"]*hc-work[^"]*shelf-entry|<a class="[^"]*shelf-entry[^"]*hc-work/.test(html), 'work anchors must not carry .shelf-entry (GA4 v3_shelf_open)');
check((html.match(/href="\.\/works\.html#/g) || []).length === 4, 'HOME must link works.html exactly four times (one per card)');
check(fs.existsSync(path.join(root, 'works.html')), 'works route target works.html must exist on disk');

/* ---- 5. 外部通信ゼロ / 端末内保存に触れない --------------------------- */

/* FOUNDER PREVIEW FIX UNIT D: 外部へ出る href は「実際の場所へ」の 3 つの公式 destination だけ（click まで通信なし）。
   それ以外の外部 src / href は引き続き 0。 */
const REALITY_DESTINATIONS = [
  ['井の頭恩賜公園', '東京都公式を見る', 'https://www.kensetsu.metro.tokyo.lg.jp/jimusho/seibuk/inokashira', './assets/inokashira-pond.jpg'],
  ['矢口書店', '公式サイトを見る', 'https://yaguchishoten.jp/', './assets/yaguchi-shoten.jpg'],
  ['下北沢 SHELTER', '予定を見る', 'https://www.loft-prj.co.jp/schedule/shelter/schedule', './assets/shimokitazawa-shelter.jpg'],
];
const body = html.slice(html.indexOf('<body'));
const allowedHrefs = REALITY_DESTINATIONS.map((d) => `href="${d[2]}"`);
const externalRefs = body.match(/(?:src|href)="(https?:)?\/\/[^"]+"/g) || [];
for (const m of externalRefs) {
  if (!allowedHrefs.includes(m)) failures.push(`HOME must not reference an external host at runtime (only the three official destinations may be linked): ${m}`);
}
check(externalRefs.length === 3 && allowedHrefs.every((h) => externalRefs.includes(h)), 'HOME links exactly the three official destinations and nothing else external');
check(!/<(iframe|video|audio|embed|object)\b/i.test(html) && !/instagram\.com/i.test(html), 'HOME carries no embed and no Instagram destination');
const cards = html.match(/<a class="hc-reality-card official-action"[^>]*>[\s\S]*?<\/a>/g) || [];
check(cards.length === 3 && (html.match(/hc-reality-card/g) || []).length === 3, 'exactly three reality destination cards (finite)');
cards.forEach((c, i) => {
  const [name, action, url, img] = REALITY_DESTINATIONS[i] || [];
  check(c.includes(`href="${url}"`) && c.includes('target="_blank"') && c.includes('rel="noopener noreferrer"') && c.includes('referrerpolicy="no-referrer"')
    && c.includes(`<span class="hc-reality-name">${name}</span>`) && c.includes(`<span class="hc-reality-action">${action}<span class="hc-reality-mark" aria-hidden="true"> ↗</span></span>`)
    && c.includes(`<figure class="hc-reality-shot"><img src="${img}"`) && /alt="[^"]+"/.test(c) && !/data-route-hold/.test(c),
    `reality card ${i + 1} must be ${name} → ${url} with the exact action label, its photo and click-only attributes`);
});
check(!html.includes('home-reality-kichijoji-cafe'), 'the generic Kichijoji tea-shop image must not be a clickable destination on HOME');
check(html.replace(/<[^>]+>/g, '').includes('気になった場所は、公式情報を確かめて、実際の街へ。'), 'reality lead must read the exact sentence across its line spans');
check(!/<iframe/i.test(html), 'HOME must not embed an iframe');
for (const t of ['localStorage', 'sessionStorage', 'indexedDB', 'navigator.geolocation', 'fetch(', 'XMLHttpRequest']) {
  check(!html.includes(t), `HOME markup must not contain ${t}`);
}

/* ---- 6. asset が全部ローカルに実在する -------------------------------- */

const assets = [...new Set((html.match(/(?:src|href)="\.\/assets\/[^"]+"/g) || [])
  .map((s) => s.replace(/^[^"]*"\.\//, '').replace(/"$/, '')))];
check(assets.length > 0, 'no local asset referenced');
for (const a of assets) {
  check(fs.existsSync(path.join(root, a)), `asset referenced but missing on disk: ${a}`);
}
// canonical 画像そのものを runtime 素材にしていないこと
check(!/文化のつながり/.test(html), 'VISUAL_CANONICAL image must not be used as a runtime asset');

// 作品 card: 図版が入った card は image plane（./assets/home-work-*.jpg）を持ち、
// 入っていない card は data-asset-hold を明示する。どちらでもない中間状態を残さない。
for (const m of html.match(/<a class="hc-work[^"]*"[^>]*>[\s\S]*?<span class="hc-work-foot">/g) || []) {
  const held = /data-asset-hold="work-[a-z]+"/.test(m) && /\bis-asset-hold\b/.test(m);
  const photo = /<span class="hc-work-media"><img src="\.\/assets\/home-work-[a-z]+\.jpg" alt=""/.test(m);
  if (held === photo) failures.push(`work card must be either asset-held or carry its photo, not both/neither: ${m.slice(0, 70)}`);
}
check((html.match(/class="hc-work-media"/g) || []).length <= 4, 'at most four work image planes');
// Featured Thread / 現実へ出る #1 は Asset Round 3 で HQ が権利確認した写真
check(/<div class="hc-thread-media">\s*<img src="\.\/assets\/home-thread-koenji-awaodori\.jpg"/.test(html), 'thread image must be the Awa Odori asset');
check(/<div class="hc-reality-strip">\s*<a class="hc-reality-card official-action" href="https:\/\/www\.kensetsu\.metro\.tokyo\.lg\.jp\/jimusho\/seibuk\/inokashira"[^>]*>\s*<figure class="hc-reality-shot"><img src="\.\/assets\/inokashira-pond\.jpg"/.test(html), 'reality strip #1 must be the 井の頭恩賜公園 official destination with the pond asset');

/* ---- 6b. NAME AVOIDANCE（Founder no-inquiry decision 2026-09-06）------------
   自分たちの user-facing surface に保護名・類似名を出さない。外部 URL / asset filename /
   Commons の File 名は provenance なので scan から除く。public route は koenji-dance-history。 */
{
  const FORBIDDEN = ['東京高円寺阿波おどり', '高円寺阿波おどり', '高円寺阿波踊り'];
  const provenanceFree = (s) => s.replace(/https?:\/\/[^\s"'<>)]+/g, '').replace(/[\w.-]+\.(?:jpg|jpeg|png|webp|svg)\b/g, '').replace(/File:[^"'<>\s]+/g, '');
  for (const [name, text] of [['index.html', html], ['works.html', fs.readFileSync(path.join(root, 'works.html'), 'utf8')], ['credits.html', fs.readFileSync(path.join(root, 'credits.html'), 'utf8')], ['thread.html', fs.readFileSync(path.join(root, 'thread.html'), 'utf8')]]) {
    const hits = FORBIDDEN.filter((t) => provenanceFree(text).includes(t));
    check(hits.length === 0, `NAME AVOIDANCE: ${name} must not carry the protected / similar event name (${hits.join(' / ')})`);
    check(!/thread=koenji-awaodori\b/.test(text), `NAME AVOIDANCE: ${name} must not expose the old public route thread=koenji-awaodori`);
  }
  check((html.match(/thread=koenji-dance-history/g) || []).length === 2, 'HOME must link the public route thread=koenji-dance-history exactly twice (hero + section 4)');
  check(html.includes('<p class="hc-thread-title">踊りが街に根づくまで</p>'), 'featured Thread title must be the neutral「踊りが街に根づくまで」');
}

/* ---- 7. CSS は .home-canonical の外へ出ない --------------------------- */

const MARK = 'HOME — CONTENT-LED IMMERSIVE TIME';
const at = css.indexOf(MARK);
check(at > 0, 'HOME canonical CSS block missing from release.css');
if (at > 0) {
  const block = css.slice(css.lastIndexOf('/*', at));
  check(html.includes('<body class="home-canonical">'), 'body must carry .home-canonical');
  // block 内の全 selector が .home-canonical か .hc- で始まる rule に閉じている。
  // comment を落としてから { の直前の塊だけを selector として読む。
  const bare = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@[^{]*\{/g, '');
  for (const m of bare.matchAll(/([^{}@;]+)\{/g)) {
    const sel = m[1].split(/[{}]/).pop().trim();
    if (!sel || /^\d/.test(sel)) continue;              // @media の中身の開き括弧など
    for (const one of sel.split(',').map((x) => x.trim()).filter(Boolean)) {
      if (!/^(\.home-canonical\b|\.hc-)/.test(one)) {
        failures.push(`HOME canonical CSS leaks outside its scope: ${one}`);
      }
    }
  }
  // 共有 page の style を書き換えていないこと
  check(!/^\s*(body|html|a|p|h1|h2)\s*\{/m.test(block), 'HOME canonical CSS must not restyle bare elements');
}

/* ---- 8. anti-drift ---------------------------------------------------- */

for (const banned of ['backdrop-filter', 'text-shadow', 'box-shadow', '@keyframes', 'parallax', 'canvas', 'WebGL']) {
  if (at > 0 && css.slice(at).includes(banned)) failures.push(`anti-drift: ${banned} in HOME canonical CSS`);
}

/* ---- 9. runtime が HOME を育てない ------------------------------------ */

// 時間経過（weekly feature の期限切れ）で生まれる ARCHIVE は explore.html の
// 明示的な host にだけ描く。HOME の #main に section を足す経路を runtime が
// 持っていないこと。deploy 無しで HOME の構成が変わる経路を残さない。
const growth = read('growth-improvements.js');
check(!growth.includes("getElementById('main')"), 'growth-improvements.js must not append into #main (HOME would grow after expiry)');
check(growth.includes("getElementById('archiveHost')"), 'growth-improvements.js archive must target the explicit explore.html host only');
check(!html.includes('id="archiveHost"'), 'HOME must not carry an archive host');
check(!html.includes('id="categoryIndex"') && !html.includes('id="categoryResults"'), 'HOME must not carry the category index DOM');
check(!/index\.html#hc-/.test(growth), 'growth-improvements.js must not route saved records to HOME sections (fake route)');

/* ---- 結果 ------------------------------------------------------------- */

if (failures.length) {
  console.error('HOME_CANONICAL_CHECK_FAIL');
  for (const f of failures) console.error('- ' + f);
  process.exitCode = 1;
} else {
  console.log('HOME_CANONICAL_CHECK_GO');
  console.log(`sections=5 in canonical order; shelf-entries=4; thread nodes=5; route holds=${HOLDS.length}; hero anchor=1; works anchors=4; local assets=${assets.length}; external hrefs=3 official destinations (click-only); other external hosts=0; iframes=0`);
}
