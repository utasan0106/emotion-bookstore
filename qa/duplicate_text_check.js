#!/usr/bin/env node
'use strict';
// 同じページに同じ文が二度出ていないか。
//
// 2026-09-11、作品ページが街との関係の説明を「◯◯とのつながり」の節と開閉ブロックの
// 両方に、一字一句同じ文面で出していた。テストは全部通っていた。誰も見ていなかったから。
// ファウンダーがスクリーンショットで見つけた。次は機械が見つける。
//
// 正当な繰り返しもある。プレイヤーごとのクリック起動の注記は、カードが6枚あれば6回要る。
// 数えるのは「同じ文が二度出ること」ではなく「同じ文が、繰り返す理由の無いところで
// 二度出ること」なので、部品ごとに何回までなら正当かを allowed に書く。書けば通るが、
// 書くときは理由を添えること。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKIP = ['.git', 'node_modules', 'archive', 'v3-prototype', 'visual-refit-v2-prototype', 'experiments', 'qa'];
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e =>
  SKIP.includes(e.name) ? [] :
  e.isDirectory() ? walk(path.join(d, e.name)) :
  e.name.endsWith('.html') ? [path.join(d, e.name)] : []);

const MIN = 20; // これより短い文は、ラベルとして繰り返されて当然

// 繰り返して良い文。分けているのは「引用か、地の文か」である。
// 同じ出典を二度挙げるのは普通のこと（本文で引いて、末尾の一覧にも載せる。
// 別々の論点を同じ資料で支えることもある）。ファウンダーが見つけた不具合は
// 地の文が二度出ていたもので、そちらは繰り返す理由が無い。
const citation = html => /<a\s[^>]*href=/.test(html);

const repeatable = [
  // プレイヤーはカードの数だけあり、注記はそれぞれの操作に付く。まとめて1回にすると
  // どのボタンの説明なのか分からなくなる。
  /^押すまでYouTubeへ接続しません。/,
  // 作品ごとに1つ付く、編集文であることの但し書き。
  /^感情書店の(独自)?編集文/,
  // 街ごとの件数。たまたま同じ内訳の街が並ぶことがある（高円寺と下北沢）。
  /^(音楽|映像|本・漫画|映画) \d+ \//,
  // 同じ作り手の作品が同じ棚に2つ並べば、経歴も2回出る。作品ごとに要る情報。
  /^(シンガーソングライター|バンド|音楽家|映像作家)。/,
  // カード上の分類ラベル。同じ分類の作品が並べば同じ文字列になる。
  /^(音楽・サウンド|映像|本・漫画|映画) · /
];

const blocks = html => {
  const body = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '');
  const main = (body.match(/<main[\s\S]*?<\/main>/) || [body])[0];
  return [...main.matchAll(/<(p|h1|h2|h3|li|figcaption|summary)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .filter(m => !citation(m[2]))
    .map(m => m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(t => t.length >= MIN);
};

// 編集判断を待っている重複。文言は編集部が決めるので、こちらでは書き換えない。
// **消すのではなく、名指しで残す。** ここに載っていない重複が出れば、今までどおり落ちる。
//
// 2026-09-11：kichijoji/kichion-toranoko と kichijoji/kichion-lady が同じ relationNote を
// 持っている（どちらも「吉祥寺音楽祭『キチオン37』の公開ライブ映像です。」）。同じ音楽祭の
// 別バンドなので事実は正しいが、棚に2枚並ぶと「なぜこの街？」が同じ文で二度出る。
// 出演者・ステージ・年など、2作品を見分けられる一文に分けるかは編集部の判断。
const pendingEditorial = [
  'なぜこの街？吉祥寺音楽祭「キチオン37」の公開ライブ映像です。'
];

const pages = walk('.');
const offenders = [], pending = new Set();
for (const file of pages) {
  const count = {};
  for (const t of blocks(fs.readFileSync(file, 'utf8'))) count[t] = (count[t] || 0) + 1;
  for (const [text, n] of Object.entries(count)) {
    if (n < 2) continue;
    if (repeatable.some(re => re.test(text))) continue;
    if (pendingEditorial.includes(text)) { pending.add(text); continue; }
    offenders.push({file, n, text});
  }
}

if (offenders.length) {
  console.log('DUPLICATE_TEXT_FAIL');
  for (const o of offenders.slice(0, 20))
    console.log('- ' + o.file + '  ×' + o.n + '\n    ' + o.text.slice(0, 100));
  console.log('\n同じ文を同じページに二度出している。片方を消すか、繰り返す理由があるなら');
  console.log('qa/duplicate_text_check.js の repeatable に、理由を書いて足すこと。');
  process.exit(1);
}
if (pending.size) {
  console.log('編集判断待ちの重複 ' + pending.size + '件（落とさない。文言は編集部が決める）:');
  for (const t of pending) console.log('  ' + t.slice(0, 90));
  console.log('');
}
// 直った重複が pendingEditorial に残り続けると、次の重複を隠す。
for (const t of pendingEditorial) if (!pending.has(t))
  assert.fail('pendingEditorial に、もう起きていない重複が残っている。消すこと: ' + t.slice(0, 60));
console.log('PASS ' + pages.length + ' pages: no sentence repeated within a page');
