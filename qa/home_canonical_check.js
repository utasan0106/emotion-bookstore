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
  ['現実へ出る', 'id="hc-reality-title"'],
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
  '街から入る', '街には、文化が息づく理由がある。', 'すべて見る',
  '作品から入る', '本・映画・音楽・映像… あらゆる作品が、街とつながっている。',
  'いま辿れるスレッド', 'ひとつの痕跡から、物語をたどる。',
  '注目のスレッド', '高円寺阿波おどり', '踊りがつなぐ、街・人・記憶の輪。', 'スレッドを読む',
  '現実へ出る', '物語の終着点は、いつも現実のどこかにある。', 'お店、場所、イベント、人に会いに行く。', 'スポットを探す',
];
for (const c of COPY) check(html.includes(c), `core copy missing: ${c.slice(0, 40)}`);

const CITY_COPY = [
  ['高円寺', ['踊りは、', 'どうやって', '街の文化になった？']],
  ['吉祥寺', ['音は、', 'どうやって', '街を育てた？']],
  ['下北沢', ['舞台は、', 'どうやって', '街を変えた？']],
  ['神保町', ['本は、', 'どうやって', '街の形になった？']],
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

const HOLDS = ['thread-index', 'all-cities', 'work-book', 'work-film', 'work-music', 'work-video', 'thread-koenji-awaodori', 'spots'];
for (const h of HOLDS) {
  const re = new RegExp(`data-route-hold="${h}"`);
  check(re.test(html), `ROUTE_HOLD marker missing: ${h}`);
}
// route が無いものに嘘のリンクを作っていないこと
for (const m of html.match(/<[^>]*data-route-hold="[^"]*"[^>]*>/g) || []) {
  if (/\bhref=/.test(m) || /\bonclick=/.test(m)) failures.push(`ROUTE_HOLD element must not navigate: ${m.slice(0, 70)}`);
  if (/^<(a|button)\b/.test(m)) failures.push(`ROUTE_HOLD element must not be a/button: ${m.slice(0, 70)}`);
}

/* ---- 5. 外部通信ゼロ / 端末内保存に触れない --------------------------- */

const body = html.slice(html.indexOf('<body'));
for (const m of body.match(/(?:src|href)="(https?:)?\/\/[^"]+"/g) || []) {
  failures.push(`HOME must not reference an external host at runtime: ${m}`);
}
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
  console.log(`sections=5 in canonical order; shelf-entries=4; thread nodes=5; route holds=${HOLDS.length}; local assets=${assets.length}; external hosts=0; iframes=0`);
}
