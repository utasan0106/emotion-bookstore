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

for (const file of ['index.html', 'shelf.html', 'release.css', 'release.js', 'release_content.js']) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('release_content.js'), sandbox);
const CONTENT = sandbox.window.V3_RELEASE_CONTENT;

/* ---- 棚の形 ---------------------------------------------------------- */
const EXPECTED_SHELVES = ['tokyo', 'koenji', 'shimokitazawa', 'jinbocho'];
if (!CONTENT || !Array.isArray(CONTENT.shelves)) failures.push('content missing');
const shelves = (CONTENT && CONTENT.shelves) || [];
if (shelves.length !== 4) failures.push(`expected exactly 4 shelves, got ${shelves.length}`);
if (shelves.map((s) => s.id).join(',') !== EXPECTED_SHELVES.join(',')) {
  failures.push(`shelf ids/order must be ${EXPECTED_SHELVES.join(',')}`);
}
if (shelves.filter((s) => s.role === 'flagship').length !== 1) failures.push('exactly one flagship shelf');
if (shelves[0] && shelves[0].role !== 'flagship') failures.push('tokyo must be the flagship and come first');

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
  // 説明より前に Object の media が来ていないこと。
  for (const marker of ['objectGrid', 'media-frame', '<img']) {
    const m = src.indexOf(marker);
    if (m !== -1 && m < at) failures.push(`${page}: ${marker} appears before the site explainer`);
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
for (const notice of [
  '入力内容はこのページから自動送信されません。',
  '送った候補がそのまま公開されることはありません。'
]) {
  if (!suggest.includes(notice)) failures.push(`suggest.html: required notice missing (${notice.slice(0, 12)}…)`);
}
for (const banned of ['アカウント', 'ログイン', 'メールアドレス', '電話番号', '住所', '写真をアップロード', 'いいね', '投稿数']) {
  if (suggest.includes(banned)) failures.push(`suggest.html: must not ask for ${banned}`);
}

/* ---- 参加者 runtime の境界 ------------------------------------------- */
const js = read('release.js');
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
for (const attr of ['noindex,nofollow', 'referrer" content="no-referrer']) {
  for (const page of ['index.html', 'shelf.html', 'suggest.html']) {
    if (!read(page).includes(attr)) failures.push(`${page} missing ${attr}`);
  }
}
if ((read('index.html').match(/<h1\b/g) || []).length !== 1) failures.push('index.html needs exactly one h1');
if ((read('shelf.html').match(/<h1\b/g) || []).length !== 1) failures.push('shelf.html needs exactly one h1');
if ((read('suggest.html').match(/<h1\b/g) || []).length !== 1) failures.push('suggest.html needs exactly one h1');

/* ---- 玄関と終わりの言い回し ------------------------------------------ */
const foyer = read('index.html');
if (!foyer.includes('みんなの感情書店')) failures.push('foyer eyebrow missing');
if (!foyer.includes('今日は、')) failures.push('foyer lead missing');
if (!foyer.includes('どの棚へ。')) failures.push('foyer lead missing');
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
console.log(`shelves=4; ${counts}; photo=${12 - plates}; plate=${plates}; current=${currents}; storage=0; analytics=0; background fetch=0; search=0; account=0`);
console.log(`categories=5; ${catCounts}; explainer=static; suggest=no-backend`);
