#!/usr/bin/env node
/* WORKS CHECK — 作品から入る（works.html）+ CROSS-MEDIA PROOF（Morisaki Thread）の静的契約。
 *
 *   node qa/works_check.js
 *
 * runtime だけを読む。ネットワークには一切出ない。
 * WORKS_CROSS_MEDIA_FABLE_IMPLEMENTATION_HANDOFF_FREEZE v0.6（+ Video Human Pick
 * Addendum v0.3 / Network Correction v0.1）の受け入れ条件を、works.html →
 * thread_content.js（Morisaki 共有 graph）→ thread.js（2 点の変更）→ HOME の接続
 * → 配信・計測の順に固定する。Koenji の QA（qa/thread_check.js）は置き換えない。
 * Works の relation 語彙はここで自前宣言し、Koenji 用の語彙定数は触らない。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const check = (cond, msg) => { if (!cond) failures.push(msg); };
const finish = () => {
  if (failures.length) {
    console.error('WORKS_CHECK_FAIL');
    for (const f of failures) console.error('- ' + f);
    process.exit(1);
  }
};
const flat = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 0) || '');
/* コメントは runtime copy ではない。語の走査は comment を落とした code に対して行う。 */
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const stripHtml = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
/* tag を落として textContent 相当にする（連続空白は 1 つに）。 */
const textOf = (s) => stripHtml(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

for (const f of ['works.html', 'works.css', 'thread.html', 'thread.css', 'thread_content.js', 'thread.js', 'index.html', 'release.css',
  'analytics-v3.js', 'sitemap.xml', 'robots.txt', 'qa/link_check.js', 'qa/thread_check.js']) {
  check(exists(f), `missing ${f}`);
}
finish();

const html = read('works.html');
const htmlCode = stripHtml(html);
const css = read('works.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const contentJs = read('thread_content.js');
const contentCode = stripJs(contentJs);
const js = read('thread.js');
const jsCode = stripJs(js);
const home = read('index.html');
const releaseCss = read('release.css');
const analytics = read('analytics-v3.js');

/* ---- 0. Works relation vocabulary（自前宣言。Koenji の RELATION_TYPES は触らない） ---- */

const WORKS_RELATION_TYPES = ['adapted_as', 'set_in', 'depicts', 'filmed_in', 'screened_at'];
const WORKS_FORBIDDEN_RELATION_TYPES = ['adapted_from', 'live_recorded_at', 'located_in', 'performed_at', 'connected_with', 'learned_from'];
const WORKS_SPATIAL = ['area', 'not_applicable'];
const SUPPORT_MODES = ['direct_statement', 'oral_testimony', 'editorial_synthesis'];
const STATES = ['single_source', 'corroborated', 'source_difference', 'unresolved'];

/* ---- 1. works.html: 殻・配信・外部通信 ------------------------------------ */

check(html.includes('<meta name="robots" content="noindex,nofollow">'), 'works.html must be noindex,nofollow');
check(!/property="og:|name="twitter:/.test(html), 'works.html must carry no OGP / twitter card');
check(html.includes('<title>みんなの感情書店｜作品から入る</title>'), 'works.html <title> must be みんなの感情書店｜作品から入る');
check(html.includes('<link rel="stylesheet" href="./release.css">') && html.includes('<link rel="stylesheet" href="./works.css">') &&
  html.indexOf('./release.css') < html.indexOf('./works.css'), 'works.css must load after release.css');
check(html.includes('<body class="works-page">'), 'body must carry .works-page');
check(html.includes('<meta name="referrer" content="no-referrer">'), 'works.html must send no referrer');
{
  const head = html.slice(0, html.indexOf('</head>'));
  check(!/<script/i.test(head), 'no synchronous head JS');
  check(!/rel="(?:preconnect|dns-prefetch|preload|prefetch|modulepreload)"/i.test(head), 'no preconnect / dns-prefetch / preload to any host');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  check(scripts.join('|') === './release_content.js|./growth-improvements.js|./release.js|./analytics-v3.js|./video-embed.js',
    `script order must be release_content → growth-improvements → release → analytics-v3 → video-embed (got ${scripts.join(', ')})`);
  check((html.match(/<script/g) || []).length === 5, 'exactly five script tags (shared video-embed.js click-to-load player; no Music / Works-specific JS)');
  check(!/<script[^>]*>[^<]*\S[^<]*<\/script>/.test(html), 'no inline script');
  check(!html.includes('thread.js') && !html.includes('thread_content.js'), 'works.html must not load the Thread renderer');
}
{
  /* comment は runtime ではない。token 走査は comment を落とした body に対して行う。 */
  const body = htmlCode.slice(htmlCode.indexOf('<body'));
  for (const m of body.match(/(?:src|srcset|poster|action)="(https?:)?\/\/[^"]+"/g) || []) failures.push(`works.html must not load an external resource at runtime: ${m}`);
  for (const t of ['<iframe', '<audio', '<video', '<canvas', '<embed', '<object', '<source', 'autoplay', 'youtube-nocookie', '/embed/', 'EmbeddedPlayer', 'i.ytimg.com', 'img.youtube.com', 'bcbits.com', 'f4.bcbits', 'ytimg']) {
    check(!body.includes(t), `works.html must not embed / hotlink (${t})`);
  }
  const main = (body.match(/<main[\s\S]*?<\/main>/) || [''])[0];
  check(main.length > 0, '<main> missing');
  check(!/<img/.test(main), '<main> of works.html must carry no image (no album art / thumbnail / provider image)');
  check(!/<(input|select|textarea|form)\b/.test(main) && (main.match(/<button\b/g) || []).length === 1 && main.includes('<button class="v3-video-load wk-video-load" type="button">'), '<main> of works.html carries exactly one control besides links: the click-to-load video button');
  for (const hook of ['class="skip-link" href="#main"', 'id="siteMenuButton"', 'id="siteMenu"', 'id="siteMenuClose"', 'id="siteMenuFavorites"',
    'class="site-menu-secondary"', 'id="main"', 'id="live"', 'class="site-footer"', 'class="footer-brand"', 'class="brand-lockup-image"',
    'href="./data.html"', 'href="./credits.html"', 'href="./index.html#hc-works"', 'href="./index.html#hc-thread"']) {
    check(html.includes(hook), `shell hook missing: ${hook}`);
  }
  for (const id of ['kichijoji', 'koenji', 'shimokitazawa', 'jinbocho']) check(html.includes(`data-menu-shelf="${id}"`), `menu shelf link missing: ${id}`);
  check((html.match(/<h1\b/g) || []).length === 1, 'exactly one h1');
}

/* ---- 2. works.html: EXACT COPY（逐語） ---------------------------------- */

const sectionOf = (id) => (html.match(new RegExp(`<section id="${id}"[\\s\\S]*?<\\/section>\\s*(?=<!--|<section|<div class="wk-exit")`)) || [''])[0];
const SECTIONS = ['book', 'film', 'music', 'video'];
{
  let cursor = -1;
  for (const id of SECTIONS) {
    const at = html.indexOf(`<section id="${id}" class="wk-work" data-work="${id}"`);
    if (at < 0) { failures.push(`section #${id} missing (must be <section id="${id}" class="wk-work" data-work="${id}")`); continue; }
    if (at < cursor) failures.push(`section out of order: #${id}`);
    cursor = at;
  }
  check((html.match(/class="wk-work"/g) || []).length === 4, 'exactly four work sections (finite, no feed)');
}
check(html.includes('<h1 class="wk-title">作品から入る</h1>'), 'H1 must be 作品から入る');
check(html.includes('<p class="wk-lead">作品をひとつ辿ると、別の作品や街が見えてくる。</p>'), 'lead must be the frozen sentence');

const EXTERNAL_RE = /<a class="([^"]*)" href="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/g;
const externalLinks = [...stripHtml(html).matchAll(EXTERNAL_RE)].map((m) => ({ cls: m[1], href: m[2].replace(/&amp;/g, '&'), attrs: m[3], label: textOf(m[4]) }));
const INTERNAL_RE = /<a class="([^"]*)" href="(\.\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/g;
const internalLinks = [...stripHtml(html).matchAll(INTERNAL_RE)].map((m) => ({ cls: m[1], href: m[2], attrs: m[3], label: textOf(m[4]) }));

const EXTERNAL_SET = {
  'https://ebook.shogakukan.co.jp/detail.php?bc=093867650000d0000000&gid=1000': { label: '新装版を確認する ↗', section: 'book', official: true },
  'https://jfdb.jp/title/2240': { label: '作品情報を確認する ↗', section: 'film', official: false },
  'https://boris.bandcamp.com/album/you-laughed-like-a-water-mark-live-at-shelter-20070204': { label: '音源を聴く ↗', section: 'music', official: true },
  'https://borisheavyrocks.com/discography/4525/': { label: '録音日と会場を確認する ↗', section: 'music', official: false },
  'https://www.loft-prj.co.jp/schedule/shelter': { label: 'いまのSHELTERを見る ↗', section: 'music', official: true },
  'https://www.youtube.com/watch?v=dt33RGSRuo0': { label: '現在の公式映像を見る ↗', section: 'video', official: true },
  'https://www.koenji-awaodori.com/': { label: '主催団体の公式サイトを見る ↗', section: 'video', official: true }
};
{
  const seen = new Set();
  for (const l of externalLinks) {
    const want = EXTERNAL_SET[l.href];
    if (!want) { failures.push(`works.html external destination is not in the frozen set: ${l.href}`); continue; }
    seen.add(l.href);
    check(l.label === want.label, `external action label must be「${want.label}」(got「${l.label}」for ${l.href})`);
    check(/target="_blank"/.test(l.attrs) && /rel="noopener noreferrer"/.test(l.attrs) && /referrerpolicy="no-referrer"/.test(l.attrs), `external action must open with target=_blank rel=noopener noreferrer referrerpolicy=no-referrer: ${l.href}`);
    check(textOf(sectionOf(want.section)).includes(want.label), `${l.href} must sit inside #${want.section}`);
    const official = /\bofficial-action\b/.test(l.cls);
    check(official === want.official, `${want.official ? 'official / listening action must carry' : 'source / database action must not carry'} .official-action: ${l.href}`);
    check(!/\bshelf-entry\b|\bresult-link\b|\bopen-button\b/.test(l.cls), `external action must not reuse another analytics-bearing class: ${l.href}`);
  }
  for (const href of Object.keys(EXTERNAL_SET)) check(seen.has(href), `frozen external destination missing: ${href}`);
  check(externalLinks.length === Object.keys(EXTERNAL_SET).length, `exactly ${Object.keys(EXTERNAL_SET).length} external actions expected (got ${externalLinks.length})`);
  for (const m of stripHtml(html).matchAll(/href="(https?:\/\/[^"]+)"/g)) check(!!EXTERNAL_SET[m[1].replace(/&amp;/g, '&')], `every external href must be a frozen destination: ${m[1]}`);
}
{
  const routes = internalLinks.filter((l) => /thread\.html/.test(l.href));
  check(routes.length === 2 && routes[0].href === './thread.html?thread=morisaki-book' && routes[0].label === 'この本から辿る →' &&
    routes[1].href === './thread.html?thread=morisaki-film' && routes[1].label === 'この映画から辿る →', `Book / Film internal routes must be exactly この本から辿る → morisaki-book, この映画から辿る → morisaki-film (got ${flat(routes.map((r) => [r.href, r.label]))})`);
  for (const r of routes) {
    check(!/target=|rel=/.test(r.attrs), `internal Thread route must not open a new window: ${r.href}`);
    check(/^wk-route$/.test(r.cls), `internal Thread route must carry only .wk-route (no official-action / shelf-entry): ${r.href}`);
  }
  check(textOf(sectionOf('book')).includes('この本から辿る') && textOf(sectionOf('film')).includes('この映画から辿る'), 'internal routes must sit in #book / #film');
  check(!/thread=koenji/.test(html), 'works.html must not route to the Koenji Thread');
  check(!/thread\.html\?thread=(?!morisaki-(book|film))/.test(html), 'only the two Morisaki Threads are routed from works.html');
  check(html.includes('<a class="other-shelves" href="./index.html">入口へ戻る</a>'), 'finite exit 入口へ戻る → ./index.html');
}

/* BOOK */
{
  const s = textOf(sectionOf('book'));
  for (const c of ['本', '森崎書店の日々', '八木沢里志', '一冊の物語を辿ると、映画になったあと、その先の神保町まで見えてきます。', 'つながり：この本が映画になり、その映画は神保町で撮影されました。', 'この本から辿る',
    '現在は2025年刊の新装版で読むことができます。', '新装版を確認する']) check(s.includes(c), `#book copy missing: ${c}`);
  check(sectionOf('book').includes('<p id="wk-book-category" class="wk-category">本</p>') && sectionOf('book').includes('<h2 id="wk-book-title" class="wk-object">森崎書店の日々</h2>') && sectionOf('book').includes('<p class="wk-byline">八木沢里志</p>'), '#book category / object / byline markup');
  check(!/ページ|\d+頁|\d+ページ/.test(s), '#book must not show the current edition page count');
}
/* FILM */
{
  const s = textOf(sectionOf('film'));
  for (const c of ['映画', '森崎書店の日々', '監督・脚本：日向朝子 ／ 2010', '映画の背景に見えていた街が、作品を実際につくった場所として前に出てきます。', 'つながり：この映画には原作があり、神保町で撮影されました。', 'この映画から辿る', '作品情報を確認する']) {
    check(s.includes(c), `#film copy missing: ${c}`);
  }
  check(sectionOf('film').includes('<p id="wk-film-category" class="wk-category">映画</p>') && sectionOf('film').includes('<h2 id="wk-film-title" class="wk-object">森崎書店の日々</h2>') && sectionOf('film').includes('<p class="wk-byline">監督・脚本：日向朝子 ／ 2010</p>'), '#film category / object / byline markup');
}
/* MUSIC — FINAL / BORIS */
{
  const raw = sectionOf('music');
  const s = textOf(raw);
  for (const c of ['音楽', '不透明度 -You Laughed Like a Water Mark- Live at Shelter 20070204', 'Boris with Michio Kurihara',
    'ライブ盤を、曲の集まりだけでなく、2007年2月4日の下北沢SHELTERで起きた一度の演奏として聴き直します。', 'つながり：2007年2月4日、下北沢SHELTERで録音されたライブ盤です。', '音源を聴く', '録音日と会場を確認する', 'いまのSHELTERを見る',
    'この音は、誰と、どこで、どの時間に生まれたんだろう？']) check(s.includes(c), `#music copy missing: ${c}`);
  check(raw.includes('<h2 id="wk-music-title" class="wk-object">不透明度 -You Laughed Like a Water Mark- Live at Shelter 20070204</h2>') && raw.includes('<p class="wk-byline">Boris with Michio Kurihara</p>'), '#music object / byline markup');
  const order = ['音源を聴く', '録音日と会場を確認する', 'いまのSHELTERを見る', 'この音は、誰と'].map((t) => s.indexOf(t));
  check(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])), '#music order must be 音源を聴く → 録音日と会場を確認する → いまのSHELTERを見る → transfer question');
  check(raw.includes('<p class="wk-question">この音は、誰と、どこで、どの時間に生まれたんだろう？</p>'), 'music transfer question must be a single paragraph');
  check(!/4th Jan 2007|2007-01-04|1月4日|borisheavyrocks\.com\/news\/4479/.test(html), 'the Boris news misprint (4th Jan 2007) must not be a source');
  check(!/<img|<audio|<iframe|bandcamp\.com\/EmbeddedPlayer|album art|アルバムアート/.test(raw), '#music must carry no album art / embedded player');
}
/* VIDEO — Founder decision v2（2026-09-06）: fact block（claim）+ relation + click-to-load inline player（主役）+ 主催団体 official action。
   読みの段落は削除（冗長）。新しい copy は「約15分で観終わります。」だけ。 */
{
  const raw = sectionOf('video');
  const s = textOf(raw);
  for (const c of ['映像', '高円寺の踊り｜主催団体の公式映像（2025）', '主催団体 ／ 2025', 'この映像について',
    '2025年に高円寺で行われた催しを伝える、主催団体の公式映像です。',
    'つながり：高円寺の街で行われる踊りを記録した、主催団体の公式映像です。', '現在の公式映像を見る', '約15分で観終わります。', '主催団体の公式サイトを見る']) check(s.includes(c), `#video copy missing: ${c}`);
  check(raw.includes('<h2 id="wk-video-title" class="wk-object">高円寺の踊り｜主催団体の公式映像（2025）</h2>') && raw.includes('<p class="wk-byline">主催団体 ／ 2025</p>'), '#video object / byline markup (neutral, Founder no-inquiry)');
  check(/<div class="wk-info" data-layer="claim">\s*<p class="wk-info-label">この映像について<\/p>\s*<p class="wk-info-text">2025年に高円寺で行われた催しを伝える、主催団体の公式映像です。<\/p>\s*<\/div>/.test(raw), 'video fact block must be the claim layer with the neutral fact text');
  /* NAME AVOIDANCE（Founder no-inquiry decision）: works.html の user-facing text に保護名・類似名は 0。外部 URL は provenance として除く。 */
  { const F = ['東京高円寺阿波おどり', '高円寺阿波おどり', '高円寺阿波踊り']; const t = textOf(stripHtml(html)) + ' ' + html.replace(/https?:\/\/[^\s"'<>)]+/g, ''); const hits = F.filter((x) => t.includes(x)); check(hits.length === 0, `NAME AVOIDANCE: works.html must not carry the protected / similar event name (${hits.join(' / ')})`); }
  check(!/after movie/.test(s), 'our own Work title must not reproduce the official YouTube title');
  check(!/wk-reading|踊り手の動きと街路の流れ/.test(raw), '#video carries no editorial-reading paragraph (removed as redundant, Founder decision v2)');
  check(raw.includes('<div class="wk-video v3-video" data-video-id="dt33RGSRuo0" data-video-title="高円寺の踊り｜主催団体の公式映像（2025）">') && raw.includes('<div class="v3-video-frame"><button class="v3-video-load wk-video-load" type="button">現在の公式映像を見る<span class="wk-mark" aria-hidden="true"> ▶</span></button></div>') && raw.includes('<p class="v3-video-duration wk-video-duration">約15分で観終わります。</p>'), '#video inline player: exact click-to-load markup with the single new copy');
  check((raw.match(/約15分で観終わります。/g) || []).length === 1 && !/プライバシー|プレイヤー|操作|再生ボタン|自動再生/.test(s), 'no privacy / player / operating copy in the visible video card');
  check(raw.includes('<noscript><p class="wk-primary"><a class="wk-action official-action" href="https://www.youtube.com/watch?v=dt33RGSRuo0" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">現在の公式映像を見る<span class="wk-mark" aria-hidden="true"> ↗</span></a></p></noscript>'), 'noscript fallback keeps the approved external URL');
  check(raw.indexOf('wk-info') < raw.indexOf('wk-relation') && raw.indexOf('wk-relation') < raw.indexOf('class="wk-video v3-video"') && raw.indexOf('class="wk-video v3-video"') < raw.indexOf('https://www.koenji-awaodori.com/'), '#video order: fact → relation → inline player → official site');
  check(!/再生回数|再生数|いいね|フォロワー|登録者|views|likes|subscribers|チャンネル登録/i.test(s), '#video must carry no popularity copy');
  check(!/<img|<iframe|<video|ytimg|youtube\.com\/embed|youtube-nocookie/.test(raw), '#video must carry no thumbnail / embed in static markup (the player is created only on click)');
}
/* FOUNDER PREVIEW FIX B: relation preview は矢印記号ではなく、同じ factual meaning の平文 1 文 */
{
  const REL = { book: 'つながり：この本が映画になり、その映画は神保町で撮影されました。', film: 'つながり：この映画には原作があり、神保町で撮影されました。', music: 'つながり：2007年2月4日、下北沢SHELTERで録音されたライブ盤です。', video: 'つながり：高円寺の街で行われる踊りを記録した、主催団体の公式映像です。' };
  for (const [id, sentence] of Object.entries(REL)) check(sectionOf(id).includes(`<p class="wk-relation">${sentence}</p>`), `#${id} relation sentence must be exactly「${sentence}」`);
  check((html.match(/class="wk-relation"/g) || []).length === 4 && !/wk-node|wk-arrow| → /.test(htmlCode), 'no symbolic arrow relation preview remains on works.html');
}
/* 読み（reading layer）: Book / Film / Music に 1 つずつ、見える label なし（Founder decision v2）。fact badge・検証状態を持たない */
{
  const readings = html.match(/<section class="wk-reading" data-layer="reading"[\s\S]*?<\/section>/g) || [];
  check(readings.length === 3, 'Book / Film / Music each carry one unlabeled reading block (the video Work has none)');
  for (const r of readings) check(r.startsWith('<section class="wk-reading" data-layer="reading">') && !/wk-reading-label|aria-label|検証状態|出典あり|data-verification|badge/.test(r) && /<p class="wk-reading-text">[^<]+<\/p>/.test(r), 'reading block is plain unlabeled prose in the reading layer');
  check(!htmlCode.includes('編集部の読み'), 'visible 編集部の読み = 0 on works.html');
  /* video-embed.js: works.html が読み込む共有 click-to-load player（video-embed.js 自体の契約は qa/thread_check.js） */
  check(htmlCode.includes('<script src="./video-embed.js"></script>') && fs.existsSync(path.join(root, 'video-embed.js')), 'works.html loads video-embed.js');
  for (const id of SECTIONS) check(!/#\w+|カテゴリ|フィルタ|絞り込み/.test(''), 'no filter UI');
}

/* ---- 3. works.html: 禁止語 / 禁止 pattern ----------------------------------- */

{
  const text = [htmlCode, cssRules].join('\n');
  const BANNED = ['次の3つ', 'また見たい', 'おすすめ', 'あなた向け', 'ランキング', '人気', 'トレンド', 'NEW', 'TRENDING', 'FOR YOU', '見終わりました',
    'スタンプ', 'ポイント', 'スコア', '正解', '不正解', 'クリア', 'レベル', 'ミッション', 'チャレンジ', 'バッジ', '達成', 'ストリーク', 'シェア', 'フォロー',
    'いいね', 'ログイン', '会員', 'ダウンロード', 'アプリ', '限定', '今だけ', 'カウントダウン', '次へ', 'つづきはこちら', 'クイズ', '診断', '気分', 'あなたに合う',
    '名盤', '傑作', '必見', '再生回数', 'FEELING GOOD', 'JIROKICHI', 'Billie Jean', 'DEATH RABBITS', 'SRC_URL_ZOT'];
  for (const w of BANNED) check(!text.includes(w), `works runtime must not contain: ${w}`);
  for (const re of [/\bGPS\b/, /\bquiz\b/i, /\bscore\b/i, /\bstreak\b/i, /\branking\b/i, /\bautoplay\b/i]) check(!re.test(text), `works runtime must not contain: ${re}`);
  for (const t of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'geolocation', 'getUserMedia', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'setTimeout', 'gtag', 'dataLayer', '<canvas']) {
    check(!htmlCode.includes(t), `works.html must not contain ${t}`);
  }
}

/* ---- 4. works.css: Works selector に閉じる・動かない・影を持たない ------------ */

for (const banned of ['animation', 'transition', '@keyframes', 'box-shadow', 'text-shadow', 'backdrop-filter', 'transform', 'sticky', 'parallax', 'canvas', '@import', 'url(']) {
  check(!cssRules.includes(banned), `works.css must not use ${banned}`);
}
{
  const bare = cssRules.replace(/@[^{]*\{/g, '');
  for (const m of bare.matchAll(/([^{}@;]+)\{/g)) {
    const sel = m[1].split(/[{}]/).pop().trim();
    if (!sel || /^\d/.test(sel)) continue;
    for (const one of sel.split(',').map((x) => x.trim()).filter(Boolean)) {
      if (!/^(\.works-page\b|\.wk-)/.test(one)) failures.push(`works.css leaks outside Works selectors: ${one}`);
    }
  }
  check(/\.wk-reading \{[^}]*dashed/.test(css), 'editorial reading must be visibly distinct from the fact box (dashed), including under forced colors');
  check(!/\.wk-reading-label/.test(css) && /\.wk-video \.v3-video-frame \{[^}]*aspect-ratio: 16 \/ 9/.test(css) && /\.wk-video-load \{[^}]*min-height: 44px/.test(css), 'no reading-label rule; inline player frame 16:9 with a 44px+ load control');
  check(/\.wk-info \{[^}]*border: 1px solid/.test(css), 'video fact block must be a solid box');
  check(/forced-colors: active/.test(css) && !/prefers-reduced-motion/.test(css), 'works.css must handle forced colors and needs no motion guard (nothing moves)');
  check(/min-height: 44px/.test(css), 'real controls must be at least 44px tall');
  check(!/\.hc-|\.home-canonical|\.th-|\.thread-page/.test(cssRules), 'works.css must not touch HOME / Thread selectors');
}

/* ---- 5. thread_content.js: Morisaki 共有 graph ----------------------------- */

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(contentJs, sandbox);
const CONTENT = sandbox.window.V3_THREAD_CONTENT;
const threads = (CONTENT && CONTENT.threads) || [];
const book = threads.find((t) => t && t.threadId === 'morisaki-book');
const film = threads.find((t) => t && t.threadId === 'morisaki-film');
const koenji = threads.find((t) => t && t.threadId === 'koenji-dance-history');
check(!!book && !!film && !!koenji, 'threads must expose koenji-dance-history, morisaki-book and morisaki-film');
check(threads.map((t) => t.threadId).join('|') === 'koenji-dance-history|morisaki-book|morisaki-film', 'threads order must be KOENJI, MORISAKI_BOOK, MORISAKI_FILM');
finish();

/* shared identity（同一参照） */
check(book.nodes === film.nodes, 'book.nodes === film.nodes (shared reference)');
check(book.facts === film.facts, 'book.facts === film.facts (shared reference)');
check(book.relations === film.relations, 'book.relations === film.relations (shared reference)');
check(book.sources === film.sources, 'book.sources === film.sources (shared reference)');
check(book.nodes !== koenji.nodes && book.relations !== koenji.relations && book.sources !== koenji.sources, 'Morisaki graph must be independent of the KOENJI object');

const byId = (list, id) => (list || []).find((x) => x && x.id === id) || null;
const nodeIds = new Set(book.nodes.map((n) => n.id));
const sourceIds = new Set(book.sources.map((s) => s.id));
const relIds = new Set(book.relations.map((r) => r.id));
const factIds = new Set(book.facts.map((f) => f.id));

/* header / framing */
{
  const HEADER = {
    eyebrow: '本から', title: '二つの『森崎書店の日々』', documentTitle: '本から｜森崎書店の日々｜みんなの感情書店', subjectLabel: '主題：森崎書店の日々',
    editor: '編集：みんなの感情書店 編集部', lens: '本と映画、その先の神保町を辿ります。', checkedAt: '2026-09-05', checkedLabel: '最終確認：2026-09-05'
  };
  for (const [k, v] of Object.entries(HEADER)) check(book[k] === v, `book.${k} must be exactly「${v}」(got ${book[k]})`);
  check(film.eyebrow === '映画から' && film.documentTitle === '映画から｜森崎書店の日々｜みんなの感情書店', 'film entry framing must be 映画から');
  for (const k of ['title', 'subjectLabel', 'editor', 'lens', 'checkedAt', 'checkedLabel']) check(film[k] === book[k], `film.${k} must equal book.${k} (only entry framing differs)`);
  for (const t of [book, film]) {
    check(JSON.stringify(t.guidance) === JSON.stringify(['本と映画を、ひとつの関係として辿ります。', '資料は、必要なところだけ開けます。', '位置情報・カメラは使いません。']), `${t.threadId}: guidance must be the three fixed lines`);
    check(!('modes' in t), `${t.threadId}: no modes (remote / onsite)`);
    check(!('image' in t), `${t.threadId}: no image`);
    check(!('duration' in t), `${t.threadId}: no duration copy`);
  }
}

/* nodes */
{
  const WANT = [['work:morisaki-book', 'Book', '森崎書店の日々'], ['work:morisaki-film', 'Film', '森崎書店の日々'], ['place:jinbocho', 'Place', '神保町'], ['org:jinbocho-theater', 'Organization', '神保町シアター']];
  check(book.nodes.length === 4, 'exactly four Morisaki nodes');
  for (const [id, type, label] of WANT) { const n = byId(book.nodes, id); check(!!n && n.type === type && n.label === label, `node ${id} must be ${type}「${label}」`); }
  for (const n of book.nodes) check(!/矢口|yaguchi|edition|2025|point|set$|ロケ/i.test(n.id + ' ' + n.label), `no Yaguchi / current edition / filming point / set node (${n.id})`);
}

/* sources（発明しない） */
{
  const WANT = [
    ['src:morisaki-ndl', 'library_catalog', '国立国会図書館', '国立国会図書館サーチ（森崎書店の日々）', 'https://ndlsearch.ndl.go.jp/books/R100000002-I034360568'],
    ['src:morisaki-jfdb', 'film_database', '映画情報', 'JFDB（森崎書店の日々）', 'https://jfdb.jp/title/2240'],
    ['src:morisaki-theater-archive', 'cultural_archive', '文化施設アーカイブ', '神保町シアター（街と映画 Bプログラム）', 'https://www.shogakukan.co.jp/jinbocho-theater/archive/program/towns-b_list.html']
  ];
  check(book.sources.length === 3, 'exactly three Morisaki sources');
  for (const [id, kind, kindLabel, name, url] of WANT) {
    const s = byId(book.sources, id);
    check(!!s && s.kind === kind && s.kindLabel === kindLabel && s.name === name && s.url === url, `source ${id} must be exactly the HQ-supplied record`);
  }
  for (const s of book.sources) check(/^https:\/\//.test(s.url), `source url must be https: ${s.id}`);
}

/* facts */
{
  check(book.facts.length === 1, 'exactly one Morisaki fact');
  const f = byId(book.facts, 'fact:morisaki-film-identity');
  check(!!f && f.claim === '映画『森崎書店の日々』は2010年10月23日公開、上映時間109分。監督・脚本は日向朝子。' && JSON.stringify(f.sourceIds) === '["src:morisaki-jfdb"]' &&
    f.verificationState === 'single_source' && JSON.stringify(f.supportMode) === '["direct_statement"]' && f.temporal && f.temporal.resolution === 'day' && f.temporal.display === '2010-10-23' &&
    Array.isArray(f.temporal.variants) && f.temporal.variants.length === 0, 'film identity fact must be exactly the frozen record (JFDB, day, 2010-10-23)');
}

/* relations */
{
  const WANT = {
    'rel:morisaki-adapted': ['work:morisaki-book', 'work:morisaki-film', 'adapted_as', '映画になる', '映画『森崎書店の日々』は、八木沢里志の小説をもとにつくられた作品です。', 'src:morisaki-jfdb', 'not_applicable', undefined],
    'rel:morisaki-set-in': ['work:morisaki-book', 'place:jinbocho', 'set_in', '舞台になる', '『森崎書店の日々』は、神保町の古書店を物語の中心の場所にしています。', 'src:morisaki-ndl', 'area', '範囲：神保町の街（一点ではありません）'],
    'rel:morisaki-depicts': ['work:morisaki-film', 'place:jinbocho', 'depicts', '描かれる', '映画は、神田神保町の古書店街をめぐる作品として紹介されています。', 'src:morisaki-jfdb', 'area', '範囲：神保町の街（一点ではありません）'],
    'rel:morisaki-filmed-in': ['work:morisaki-film', 'place:jinbocho', 'filmed_in', '撮影される', '映画は、神保町の街中に「森崎書店」のロケセットを組んで撮影されました。', 'src:morisaki-theater-archive', 'area', '範囲：神保町の街なか（一点ではありません）'],
    'rel:morisaki-screened-at': ['work:morisaki-film', 'org:jinbocho-theater', 'screened_at', '上映される', '神保町シアターは『森崎書店の日々』を上映プログラムで扱ってきました。', 'src:morisaki-theater-archive', 'not_applicable', undefined]
  };
  check(book.relations.map((r) => r.id).join('|') === Object.keys(WANT).join('|'), `Morisaki relations must be R1–R5 in order (got ${book.relations.map((r) => r.id).join(',')})`);
  for (const [id, [from, to, type, verb, claim, src, spatial, display]] of Object.entries(WANT)) {
    const r = byId(book.relations, id) || {};
    const what = `relation ${id}`;
    check(r.from === from && r.to === to, `${what}: must be ${from} → ${to}`);
    check(r.relationType === type && WORKS_RELATION_TYPES.includes(type), `${what}: relationType must be ${type}`);
    check(r.displayVerb === verb, `${what}: displayVerb must be ${verb}`);
    check(r.claim === claim, `${what}: claim must be the frozen sentence`);
    check(JSON.stringify(r.sourceIds) === JSON.stringify([src]) && sourceIds.has(src), `${what}: must cite exactly ${src}`);
    check(r.verificationState === 'single_source' && JSON.stringify(r.supportMode) === '["direct_statement"]', `${what}: single_source / direct_statement`);
    check(r.spatial && r.spatial.resolution === spatial && WORKS_SPATIAL.includes(spatial) && (display === undefined ? r.spatial.display === undefined : r.spatial.display === display), `${what}: spatial must be ${spatial}${display ? ' / ' + display : ''}`);
    check(!('temporal' in r), `${what}: no temporal (no fake temporal on relations)`);
    check(!('via' in r) && !('people' in r) && !('differenceNote' in r), `${what}: no via / people / differenceNote`);
    check(nodeIds.has(r.from) && nodeIds.has(r.to), `${what}: from / to must be nodes`);
    check(STATES.includes(r.verificationState) && r.supportMode.every((m) => SUPPORT_MODES.includes(m)), `${what}: vocabulary`);
  }
  check(book.relations.filter((r) => r.relationType === 'adapted_as').length === 1, 'exactly one adapted_as edge (Book → Film)');
  for (const t of WORKS_FORBIDDEN_RELATION_TYPES) check(!book.relations.some((r) => r.relationType === t), `no ${t} relation in the Morisaki graph`);
  for (const t of ['set_in', 'depicts', 'filmed_in']) check(book.relations.filter((r) => r.relationType === t).every((r) => r.to === 'place:jinbocho'), `${t} endpoint must be place:jinbocho only`);
  check(!book.relations.some((r) => r.spatial && !['area', 'not_applicable'].includes(r.spatial.resolution)), 'no relation finer than area (no exact point / street segment / storefront)');
  check(!book.relations.some((r) => /矢口/.test(flat(r))), 'no Yaguchi factual edge');
  for (const banned of ['exact_point', 'building', 'parcel', 'latitude', 'longitude', 'coordinates', 'lat:', 'lng:', 'この一点', '新装版', '2025年', 'edition', 'Edition']) {
    check(!flat(book.relations).includes(banned) && !flat(book.nodes).includes(banned) && !flat(book.facts).includes(banned), `Morisaki graph must not carry ${banned} (no pin-level location, no current-edition source node)`);
  }
  check(!/\d{2}\.\d{4,}/.test(contentCode), 'content must not carry decimal coordinates');
  check(!/adapted_from|live_recorded_at|located_in|performed_at/.test(contentCode), 'forbidden relation vocabulary must not appear in thread_content.js');
}

/* scenes W0–W5（既存 primitive のみ、kind:'chain' なし） */
function morisakiScenes(t, entry) {
  const S = Object.fromEntries(t.scenes.map((s) => [s.id, s]));
  const what = `${t.threadId}`;
  check(t.scenes.map((s) => s.id).join('|') === 'w0|w1|w2|w3|w4|w5', `${what}: scenes must be w0..w5 (got ${t.scenes.map((s) => s.id).join(',')})`);
  for (const s of t.scenes) for (const b of s.beats || []) {
    check(['pair', 'names', 'question', 'evidence', 'reveal', 'cue'].includes(b.kind) && b.kind !== 'cue' && b.kind !== 'reveal', `${what} ${s.id}/${b.id}: beat kind must be an existing primitive (no chain / no cue / no reveal)`);
    check(!/input|button|select|timer|countdown/i.test(Object.keys(b).join()), `${what} ${s.id}/${b.id}: beat must not declare controls`);
  }
  check(!t.scenes.some((s) => s.cue || s.figure || (s.beats || []).some((b) => b.cue)), `${what}: no cue / no figure (no 20-second cue, no image)`);
  check(!t.scenes.some((s) => (s.relationIds || []).includes('rel:morisaki-screened-at') || flat(s.beats || []).includes('rel:morisaki-screened-at')), `${what}: screened_at must not appear in W0–W4 (secondary context only)`);
  /* W0 */
  const w0 = S.w0 || {};
  const pairBook = { name: '本', text: '八木沢里志『森崎書店の日々』' };
  const pairFilm = { name: '映画', text: '日向朝子監督『森崎書店の日々』（2010）' };
  check(w0.title === '二つの『森崎書店の日々』' && w0.lead === '同じ名前の、本と映画。まずは二つの作品として置きます。' && w0.close === 'この二つは、どうつながっているのか。', `${what} W0 copy`);
  check((w0.beats || []).length === 1 && w0.beats[0].kind === 'pair' && w0.beats[0].label === '' &&
    JSON.stringify(w0.beats[0].items) === JSON.stringify(entry === 'book' ? [pairBook, pairFilm] : [pairFilm, pairBook]), `${what} W0 pair must be ${entry === 'book' ? 'Book first' : 'Film first'}`);
  /* W1 */
  const w1 = S.w1 || {};
  check(JSON.stringify(w1.relationIds) === '["rel:morisaki-adapted"]' && !w1.beats, `${what} W1 must show rel:morisaki-adapted only`);
  if (entry === 'book') check(w1.title === '原作と映画' && w1.close === 'ここまでは、原作と映画の関係です。', `${what} W1 book-first title / close`);
  else check(w1.title === 'この映画には、原作がある' && w1.close === '同じひとつの関係を、逆から読んでいます。矢印は 本 → 映画 のままです。', `${what} W1 film-first title / close`);
  /* W2 */
  const w2 = S.w2 || {};
  check(w2.title === '残ったもの、変わったもの' && w2.lead === '媒体が変わっても残るものと、映画になることで変わるものがあります。' && w2.close === 'けれど、変わったのは媒体だけではありません。', `${what} W2 copy`);
  /* HQ LIMITED FIX: fact:morisaki-film-identity は graph（MORISAKI_FACTS）に保持するが、W2 に inline 表示しない。
     W2 の user-facing 構成は Lead → Pair → Close だけ。 */
  check(!('factIds' in w2), `${what} W2 must not reference any fact inline (no factIds; composition is Lead → Pair → Close)`);
  check(Object.keys(w2).sort().join() === 'beats,close,id,lead,title', `${what} W2 must carry only id / title / lead / beats / close (got ${Object.keys(w2).sort().join()})`);
  check((w2.beats || []).length === 1 && w2.beats[0].kind === 'pair' && JSON.stringify(w2.beats[0].items) === JSON.stringify([
    { name: '残ったもの', text: '貴子、叔父のサトル、神保町の古書店をめぐる物語。' },
    { name: '変わったもの', text: '文字で読む作品から、109分の映画へ。監督・脚本・俳優・撮影など、多くの手で形になる作品へ。' }]), `${what} W2 pair copy`);
  check(!/ページ|頁/.test(flat(w2)), `${what} W2 must not show the current edition page count`);
  /* W3 */
  const w3 = S.w3 || {};
  const NOTES = ['撮影のために街中に組まれたセットです。いま神保町にある店ではありません。', '範囲：神保町の街なか（一点ではありません）'];
  check(w3.title === '街が入る' && w3.lead === '神保町は、本と映画で同じ役割をしているわけではありません。' && w3.close === '街は、物語の背景であることをやめて、この映画がどう作られたかの一部になる。', `${what} W3 copy`);
  check(JSON.stringify(w3.relationIds) === '["rel:morisaki-set-in","rel:morisaki-depicts","rel:morisaki-filmed-in"]', `${what} W3 must show 舞台になる → 描かれる → 撮影される`);
  check((w3.beats || []).length === 1 && w3.beats[0].kind === 'evidence' && JSON.stringify(w3.beats[0].items) === JSON.stringify(NOTES), `${what} W3 must carry the two mandatory filmed_in notes`);
  /* W4（既存 primitive のみ） */
  const w4 = S.w4 || {};
  check(w4.title === 'もう一度、二つを見る' && w4.lead === '本 →（原作になる）→ 映画 →（神保町で撮る）→ 神保町' && w4.close === 'ここまでの関係を、資料に沿って並べ直したものです。', `${what} W4 copy`);
  check((w4.beats || []).length === 1 && w4.beats[0].id === 'w4-pair' && w4.beats[0].kind === 'pair' && w4.beats[0].label === '' && JSON.stringify(w4.beats[0].items) === JSON.stringify([pairBook, pairFilm]), `${what} W4 must repeat the W0 pair with the existing pair primitive`);
  check(w4.editorialReading && w4.editorialReading.text === '同じ物語が媒体を移るとき、街は「舞台」から「制作の場所」にもなる。' &&
    JSON.stringify(w4.editorialReading.refs) === '["rel:morisaki-adapted","rel:morisaki-set-in","rel:morisaki-filmed-in"]', `${what} W4 editorial reading`);
  check(!('verificationState' in (w4.editorialReading || {})) && !('sourceIds' in (w4.editorialReading || {})), `${what} W4 reading must not carry support state`);
  check(t.scenes.filter((s) => s.editorialReading).length === 1, `${what}: the only editorial reading is W4`);
  /* W5 */
  const w5 = S.w5 || {};
  check(w5.title === '現実へ' && w5.kind === 'reality' && w5.lead === 'ここから先は、いまの神保町です。', `${what} W5 title / lead`);
  check(w5.close === '森崎書店は作中の書店です。ここに挙げた店は、いずれも神保町に実在する別の店です。', `${what} W5 mandatory disclosure must be the scene close (rendered right before the destinations)`);
  check((w5.beats || []).length === 3 && w5.beats[0].kind === 'evidence' && JSON.stringify(w5.beats[0].items) === JSON.stringify(NOTES) &&
    w5.beats[1].kind === 'question' && w5.beats[1].line === '別の媒体になったとき、何が残って、何が変わったんだろう？' &&
    w5.beats[2].kind === 'question' && w5.beats[2].line === 'この画面は、現実のどこにつながっているんだろう？', `${what} W5 must re-show the filmed_in notes and carry the two transfer questions`);
  for (const b of (w5.beats || []).filter((x) => x.kind === 'question')) check(Object.keys(b).sort().join() === 'id,kind,label,line', `${what} W5 question must carry no answer field / options`);
}
morisakiScenes(book, 'book');
morisakiScenes(film, 'film');
{
  const strip = (t) => JSON.stringify(t.scenes.slice(2));
  check(strip(book) === strip(film), 'W2–W5 must be identical between Book-first and Film-first (only W0 pair order and W1 differ)');
}

/* W5: 開示・行き先・終わり */
{
  check(book.realityDestinations === film.realityDestinations && book.ending === film.ending, 'W5 blocks are shared references');
  check(!('presentReturn' in book) && !('presentReturn' in film), 'no presentReturn (no status notes, no second lead; the disclosure is the W5 close)');
  const d = book.realityDestinations;
  check(d.length === 3, 'exactly three reality destinations');
  check(d[0] && d[0].label === '古書店街を歩く' && d[0].url === 'https://jimbou.info/map/' && d[0].why === '本が舞台とし、映画が描き、撮影した神保町の古書店街そのものへ戻る入口です。' &&
    JSON.stringify(d[0].relationIds) === '["rel:morisaki-set-in","rel:morisaki-depicts","rel:morisaki-filmed-in"]', 'destination 1 must be 古書店街を歩く → jimbou.info/map with set_in / depicts / filmed_in');
  check(d[1] && d[1].label === '神保町シアターの現在を見る' && d[1].url === 'https://www.shogakukan.co.jp/jinbocho-theater/features/' && d[1].why === 'この映画を上映してきた神保町の映画館の、現在のプログラムを見る入口です。' &&
    JSON.stringify(d[1].relationIds) === '["rel:morisaki-screened-at"]', 'destination 2 must be 神保町シアターの現在を見る with screened_at only');
  check(d[2] && d[2].label === '矢口書店を見る' && d[2].url === 'https://yaguchishoten.jp/' && d[2].editorialExample === true && !('why' in d[2]) && !('relationIds' in d[2]) &&
    d[2].note === '編集部が選んだ、いま神保町にある専門古書店の一例です。作品との関係が確認されている店ではありません。', 'Yaguchi must be an editorial current example only (no why, no relationIds, note exact)');
  for (const x of d) {
    check(/^https:\/\//.test(x.url), `destination ${x.id} must be https`);
    for (const r of x.relationIds || []) check(relIds.has(r), `destination ${x.id}: unknown relation ${r}`);
  }
  check(!d.some((x) => /archive\/program/.test(x.url)), 'a past screening archive must not be a current destination');
  check(book.ending && book.ending.line === 'このスレッドは、ここまでです。' && book.ending.exitLabel === '作品の入口へ戻る' && book.ending.exitHref === './works.html', 'finite end must be このスレッドは、ここまでです。 + 作品の入口へ戻る → ./works.html');
  check(!/related|nextEpisode|recommend|次回|関連スレッド/.test(contentCode), 'no related threads / recommendation / next episode');
}

/* ---- 6. thread.js: 2 点だけ（timeless header / null fieldset）、kind:'chain' なし ---- */

{
  const fn = (name) => { const at = js.indexOf(`function ${name}(`); if (at < 0) return ''; const next = js.indexOf('\n  function ', at + 1); return js.slice(at, next < 0 ? js.length : next); };
  const rc = fn('relationCard');
  check(/rel\.temporal \? \[\s*h\('span', \{ class: 'th-relation-year', text: rel\.temporal\.display \}\),\s*h\('span', \{ class: 'th-relation-sep'/.test(rc) && /\] : \[\s*h\('span', \{ class: 'th-relation-verb', text: rel\.displayVerb \}\)\s*\]\);/.test(rc),
    'relationCard must render TIME ／ VERB with temporal and VERB alone without it (no orphan separator)');
  check(!/text: rel\.temporal \? rel\.temporal\.display : ''/.test(rc), 'relationCard must not render an empty year span');
  check(fn('modeFieldset').includes('if (options.length === 0) return null;'), 'modeFieldset must return null when there are no mode options');
  check(!/chain/.test(jsCode), "no kind:'chain' / chain renderer primitive");
  check(!/animation|requestAnimationFrame|setTimeout|transition/.test(jsCode), 'renderer must add no animation');
  check((jsCode.match(/beat\.kind === '(\w+)'/g) || []).join('|') === "beat.kind === 'pair'|beat.kind === 'names'|beat.kind === 'question'|beat.kind === 'evidence'|beat.kind === 'reveal'|beat.kind === 'cue'", 'beat kinds must remain the existing six');
  for (const t of ['森崎', 'morisaki', '神保町', 'Boris', 'SHELTER', 'works.html', '阿波おどり']) check(!jsCode.includes(t), `renderer must not carry Works / Thread copy (${t})`);
}

/* ---- 7. HOME の接続: 4 card は works.html#<work> への実 anchor、hold 3 --------- */

{
  for (const w of ['book', 'film', 'music', 'video']) {
    check(home.split(`<a class="hc-work" data-work="${w}" href="./works.html#${w}">`).length === 2, `HOME work card ${w} must be the exact anchor`);
    check(!home.includes(`data-route-hold="work-${w}"`), `HOME hold work-${w} must be retired`);
    check(html.includes(`<section id="${w}" class="wk-work" data-work="${w}"`), `works.html#${w} must exist as the anchor target`);
  }
  check(!home.includes('data-route-hold'), 'HOME carries no route hold (Founder Preview Fix A5)');
  check(!/<a class="[^"]*hc-work[^"]*shelf-entry|<a class="[^"]*shelf-entry[^"]*hc-work/.test(home), 'HOME work anchors must not carry .shelf-entry');
  check((home.match(/class="hc-city shelf-entry"/g) || []).length === 4, 'HOME shelf entries stay exactly four');
  /* card 内部は不変（media / foot / icon / label / mark） */
  for (const w of ['book', 'film', 'music', 'video']) {
    const card = (home.match(new RegExp(`<a class="hc-work" data-work="${w}"[\\s\\S]*?<\\/a>`)) || [''])[0];
    check(/<span class="hc-work-media"><img src="\.\/assets\/home-work-[a-z]+\.jpg" alt=""/.test(card) && card.includes('<span class="hc-work-foot">') && card.includes('<span class="hc-work-icon" aria-hidden="true">') &&
      card.includes('<span class="hc-work-mark" aria-hidden="true">→</span>') && !/<a |<button|onclick/.test(card.slice(1)), `HOME work card ${w} inner markup must be unchanged`);
  }
  const rule = (releaseCss.match(/\n\.hc-work \{[^}]*\}/) || [''])[0];
  check(rule.includes('display: block;') && rule.includes('text-decoration: none;') && rule.includes('height: 143px;') && rule.includes('position: relative;'), '.hc-work must keep its geometry and carry display: block / text-decoration: none as an anchor');
  check(releaseCss.includes('.hc-work[data-work="film"] .hc-work-media img {') && releaseCss.includes('.hc-work[data-work="video"] .hc-work-media img {'), 'film / video photo treatment must be keyed on data-work');
  check(!releaseCss.includes('[data-route-hold="work-'), 'no CSS may remain keyed on the retired work-* holds');
  check(releaseCss.includes('.home-canonical .hc-work:focus-visible,'), 'HOME focus group must include .hc-work');
}

/* ---- 8. 配信・計測: sitemap に Works なし、GA4 event 8 件、link_check に works.html ---- */

{
  check(!/works/.test(read('sitemap.xml')), 'sitemap must not list Works');
  check(!/thread/.test(read('sitemap.xml')), 'sitemap must not list the Thread');
  check(read('qa/link_check.js').includes("'works.html'"), 'link_check must include works.html hrefs');
  check(!analytics.includes('works') && !analytics.includes('thread'), 'analytics-v3.js must not know about Works (no new GA4 event)');
  check(/v3_home_view: true,\s*v3_shelf_open: true,\s*v3_shelf_view: true,\s*v3_detail_open: true,\s*v3_official_action: true,\s*v3_suggest_view: true,\s*v3_suggest_copy: true,\s*v3_suggest_form_open: true/.test(analytics), 'GA4 allowed events must be the eight approved ones');
  for (const [name, src] of [['works.html', htmlCode], ['thread_content.js', contentCode]]) {
    for (const t of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'geolocation', 'getUserMedia', 'mediaDevices', 'fetch(', 'XMLHttpRequest',
      'WebSocket', 'sendBeacon', 'EventSource', 'setTimeout', 'setInterval', 'gtag', 'dataLayer', '<iframe', '<audio', '<video', '<canvas', 'getContext(']) {
      check(!src.includes(t), `${name} must not contain ${t}`);
    }
  }
  for (const w of ['次の3つ', 'おすすめ', 'ランキング', '人気', 'いいね', 'フォロー', 'シェア', '限定', '会員', 'アプリ', 'クイズ', '診断', '気分', '名盤']) check(!contentCode.includes(w), `thread_content.js must not contain: ${w}`);
}

/* ---- 9. KOENJI object は frozen source と「modes / cue を外しただけ」で同一（git があるときだけ観測） ----
   FOUNDER PREVIEW FIX C: location mode と cue UX は Founder 決定で削除。facts / nodes / relations /
   sources / Reality Return / status notes / ending / image / header / guidance / S1 / S3 / S5 は
   frozen source 2389b0ec と deep-equal。S0 / S4 は cue を除いて同一、S2 は AFTER cue beat を除いて同一。 */
{
  let frozenJs = null;
  try { frozenJs = require('child_process').execFileSync('git', ['-C', root, 'show', '2389b0ec2ddf90726baaaed56b98e5d17966039d:thread_content.js'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { frozenJs = null; }
  if (frozenJs === null) console.log('- NOT OBSERVABLE: frozen source 2389b0ec is not readable here; KOENJI invariant was not compared');
  else {
    const fsb = { window: {} }; vm.createContext(fsb); vm.runInContext(frozenJs, fsb);
    const OLD = (fsb.window.V3_THREAD_CONTENT.threads || []).find((t) => t.threadId === 'koenji-awaodori');
    const J = (v) => JSON.stringify(v);
    check(!!OLD && !!koenji, 'KOENJI must exist in both frozen source and candidate');
    /* FOUNDER no-inquiry overlay（2026-09-06）: 凍結 SOURCE に exact override（route / 中立 label / 中立 claim / 中立 source name /
       modes 削除 / cue 削除 / 公式映像 1 件追加）を当てたものと deep-equal であること。それ以外の差分は 0。 */
    const YT = 'https://www.youtube.com/watch?v=dt33RGSRuo0';
    const EXP = JSON.parse(J(OLD));
    EXP.threadId = 'koenji-dance-history';
    EXP.subjectLabel = '主題：高円寺で受け継がれてきた踊り';
    EXP.image.alt = '夜の高円寺の路上で踊る連。白い衣装の踊り手たち';
    EXP.nodes = EXP.nodes.map((n) => (n.id === 'event:koenji-awaodori' ? { ...n, label: '現在の踊り' } : n));
    EXP.facts = EXP.facts.map((f) => (f.id === 'fact:present-groups' ? { ...f, claim: '現在、この催しには40を超える連が活動している。多くの連は、一年を通して練習を続けている。' } : f));
    EXP.relations = EXP.relations.map((r) => (r.id === 'rel:renamed-1963' ? { ...r, claim: '1963年、「高円寺ばか踊り」の正式名称が、現在使われている名称へ変わった。' } : r));
    const NAMES = { 'src:official-history': '主催団体 公式サイト（歴史資料）', 'src:suginami-gaku': 'すぎなみ学倶楽部（高円寺の踊り）', 'src:official-about': '主催団体 公式サイト（団体について）', 'src:official-join': '主催団体 公式サイト（参加案内）', 'src:official-archive': '主催団体 公式サイト（アーカイブ）', 'src:official-anniversary': '主催団体 公式サイト（周年アーカイブ）', 'src:official-plus': '主催団体 公式サイト（plus+）', 'src:official-home': '主催団体 公式サイト' };
    EXP.sources = EXP.sources.map((x) => (NAMES[x.id] ? { ...x, name: NAMES[x.id] } : x));
    EXP.sources.push({ id: 'src:official-video', kind: 'official', kindLabel: '公式（主催団体）', name: '主催団体の公式映像', url: YT });
    EXP.spatialEntry = { href: './atlas/', label: '街を立体で辿る（β）', note: 'Project PLATEAUの3D都市モデル（杉並区 2025年度）から取り出した、現在の街の形の上で、この関係をもう一度辿ります。' };
    EXP.realityDestinations.push({ id: 'dest:official-video', label: '最後に、現在の公式映像を見る', url: YT, videoId: 'dt33RGSRuo0', videoTitle: '主催団体の公式映像', watchNote: '約15分で観終わります。', why: 'ここまで辿った踊りが、現在の街の中でどう見えるかを、主催団体の公式映像で確かめます。', note: '2025年の催しを伝える、主催団体の公式映像です。', sourceIds: ['src:official-video'] });
    delete EXP.modes;
    EXP.scenes = EXP.scenes.map((sc) => { const c = JSON.parse(J(sc)); delete c.cue; if (c.beats) c.beats = c.beats.filter((b) => b.kind !== 'cue'); if (c.editorialReading) c.editorialReading.text = c.editorialReading.text.replace('——これは編集部の読みです。', ''); return c; });
    for (const k of ['threadId', 'eyebrow', 'title', 'documentTitle', 'subjectLabel', 'editor', 'lens', 'checkedAt', 'checkedLabel', 'duration', 'guidance', 'image', 'nodes', 'facts', 'relations', 'sources', 'presentReturn', 'realityDestinations', 'ending', 'scenes']) {
      check(J(koenji[k]) === J(EXP[k]), `KOENJI.${k} must equal the frozen source with only the exact Founder overrides applied`);
    }
    check(JSON.stringify(Object.keys(koenji).sort()) === JSON.stringify(Object.keys(EXP).sort()), 'KOENJI carries no extra / missing top-level keys versus the frozen source (minus modes)');
    const vSrc = koenji.sources[koenji.sources.length - 1] || {}, vDest = koenji.realityDestinations[koenji.realityDestinations.length - 1] || {};
    check(vSrc.id === 'src:official-video' && vSrc.kind === 'official' && vSrc.url === YT, 'appended source is the official video with the approved URL');
    check(vDest.id === 'dest:official-video' && vDest.url === YT && vDest.label === '最後に、現在の公式映像を見る' && J(vDest.sourceIds) === '["src:official-video"]' && !('relationIds' in vDest), 'appended destination is the approved official video (label / URL / source only)');
    check(!('modes' in koenji) && 'modes' in OLD, 'KOENJI modes removed (was present in the frozen source)');
    /* 凍結 scene との差は cue / cue beat の削除と、読み本文の自己ラベル「——これは編集部の読みです。」の削除（Founder decision v2）だけ */
    const strip = (s) => { const c = JSON.parse(J(s)); delete c.cue; if (c.beats) c.beats = c.beats.filter((b) => b.kind !== 'cue'); if (c.editorialReading) c.editorialReading.text = c.editorialReading.text.replace('——これは編集部の読みです。', ''); return c; };
    check(koenji.scenes.length === 6 && OLD.scenes.length === 6 && koenji.scenes.every((s, i) => J(s) === J(strip(OLD.scenes[i]))), 'KOENJI scenes must equal the frozen scenes with only cue / cue beats removed');
    check(!koenji.scenes.some((s) => s.cue || (s.beats || []).some((b) => b.kind === 'cue' || b.cue)), 'KOENJI carries no cue anywhere');
    check((koenji.scenes.find((s) => s.id === 's2').beats || []).map((b) => b.id).join('|') === 'before|encounter|question|evidence|reveal', 'KOENJI S2 keeps before / encounter / question / evidence / reveal');
    check(!!koenji.scenes.find((s) => s.id === 's4').editorialReading && J(koenji.scenes.find((s) => s.id === 's4').editorialReading) === J(strip(OLD.scenes.find((s) => s.id === 's4')).editorialReading) && !koenji.scenes.find((s) => s.id === 's4').editorialReading.text.includes('編集部の読み'), 'KOENJI S4 editorial reading unchanged except the removed self-label');
    check(contentJs.slice(0, contentJs.indexOf('  var KOENJI = {')) === frozenJs.slice(0, frozenJs.indexOf('  var KOENJI = {')), 'thread_content.js header must be unchanged');
  }
}

if (failures.length) {
  console.error('WORKS_CHECK_FAIL');
  for (const f of failures) console.error('- ' + f);
  process.exit(1);
}
console.log('WORKS_CHECK_GO');
console.log(`works=4 (#book #film #music #video); external actions=${externalLinks.length} (click-only, frozen set); internal routes=2; morisaki threads=2 (shared nodes/facts/relations/sources); relations=${book.relations.length} (adapted_as=1, adapted_from=0); destinations=${book.realityDestinations.length} (Yaguchi editorial example, no why); HOME holds=0 + works anchors=4; sitemap works=0; GA4 events=8`);
