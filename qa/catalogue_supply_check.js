#!/usr/bin/env node
'use strict';
// 作品の在庫を数える。催しの `event_supply_check.js` と対になる。
//
// 催しは会期で減るが、作品は減らない。代わりに**古びる**。だから落とし方が違う：
// 減少ではなく、ファウンダーが決めた下限を割っているかどうかで判定する。
//
//   「押したらそれぞれ最低でも10ずつは作品が出てこないとサイトから離脱しちゃうよ」
//
// これが唯一の hard rule である。分類ごとの総数が10を割ったら落とす。
// 街ごとの薄さ、保留の理由、関係が会期で終わる作品は、判断が要るので表に出すだけにする。

const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = require(path.join(root, 'tools/city-discovery-source'));
const { items, pendingItems, declined, commonVideos } = source;

const FLOOR_PER_KIND = 10;  // ファウンダー指示。トップから押した先に最低これだけ出す
const CAP_PER_CELL = 10;    // build-city-discovery.js:340 が投げる上限
const THIN_CELL = 3;        // 街×分類がこれ未満なら薄いとして表に出す（落としはしない）

const cities = { koenji: '高円寺', shimokitazawa: '下北沢', kichijoji: '吉祥寺', jinbocho: '神保町' };
const kinds = [['book', '本'], ['audio', '音楽'], ['video', '映像'], ['film', '映画']];
const label = Object.fromEntries(kinds);
const count = (city, kind) => items.filter(i => i.city === city && i.kind === kind).length;

console.log('街ごとの作品（公開中 ' + items.length + '件、上限は1枠 ' + CAP_PER_CELL + '件）');
console.log('  街        ' + kinds.map(k => k[1].padStart(5)).join('') + '    計');
for (const [id, name] of Object.entries(cities)) {
  const n = kinds.map(k => count(id, k[0]));
  console.log('  ' + name.padEnd(8) + n.map(v => String(v).padStart(6)).join('') + String(n.reduce((a, b) => a + b)).padStart(6));
}
const totals = kinds.map(([k]) => items.filter(i => i.kind === k).length);
console.log('  ' + '合計'.padEnd(8) + totals.map(v => String(v).padStart(6)).join('') + String(items.length).padStart(6));
console.log('  街をまたぐ短編 ' + commonVideos.length + '件（分類ごとの総数には数えない）');

const thin = [];
for (const [id, name] of Object.entries(cities))
  for (const [k, kl] of kinds) {
    const n = count(id, k);
    if (n > CAP_PER_CELL) { console.log('\nCATALOGUE_SUPPLY_FAIL'); console.log('- ' + name + 'の' + kl + 'が上限' + CAP_PER_CELL + '件を超えている（' + n + '件）'); process.exit(1); }
    if (n < THIN_CELL) thin.push(name + 'の' + kl + ' ' + n + '件');
  }
if (thin.length) console.log('\n薄い枠（' + THIN_CELL + '件未満。落としはしない）:\n  ' + thin.join(' / '));

// 保留は「関係が無い」ではなく「見せるものが揃っていない」。理由ごとに分けて出さないと、
// 何を用意すれば公開できるのかが分からないまま積み上がる。
if (pendingItems.length) {
  console.log('\n保留 ' + pendingItems.length + '件（関係と出典は揃っているが、公開の条件を満たしていない）');
  const covers = require(path.join(root, 'tools/work-cover-source.json'));
  for (const p of pendingItems) {
    const cover = covers[p.city + '/' + p.id];
    const need = p.videoId || p.trailerVideoId ? '—'
      : cover ? '書影 status=' + cover.status
      : '公式の予告編、または使える書影・ポスター。text-only での掲載も選べる';
    console.log('  ' + (cities[p.city] + '/' + label[p.kind]).padEnd(12) + p.title);
    console.log('      要るもの: ' + need);
  }
}

if (declined.length) console.log('\n見送り ' + declined.length + '件（直喩。基準は SELECTION-20260910.md）');

// 関係が上映に由来する作品。relationNote には年月が入っているので、事実としては
// 古びない（「2026年2月の映画祭の上映作品」は来年でも本当である）。古びるのは
// **読者にとっての意味**のほうで、「いま観られる」わけではなくなる。
// 撮影地・舞台のように動かない関係とは、入れ替えの優先度が違う。
// 文言の判断は編集部のものなので、ここでは該当を並べるだけにする。
const dated = [...items, ...pendingItems].filter(i => /上映企画|映画祭で上映|上映されました/.test(i.relation || ''));
if (dated.length) {
  console.log('\n関係が上映に由来する作品 ' + dated.length + '件（入れ替えの優先候補）');
  console.log('  出典の年月は残るが、上映が終われば「いま観に行ける」ではなくなる。');
  console.log('  撮影地・舞台の作品より先に見直す。文言を変えるかは編集部の判断。');
  for (const i of dated) console.log('  ' + (cities[i.city] + '/' + label[i.kind]).padEnd(12) + i.title + '  → ' + i.url);
}

const newest = items.map(i => i.checkedAt).filter(Boolean).sort().at(-1);
if (newest) {
  const days = Math.floor((Date.now() - Date.parse(newest + 'T00:00:00+09:00')) / 86400000);
  console.log('\n最後に作品を確認した日: ' + newest + '（' + days + '日前）');
}

const short = kinds.filter(([k]) => items.filter(i => i.kind === k).length < FLOOR_PER_KIND);
if (short.length) {
  console.log('\nCATALOGUE_SUPPLY_FAIL');
  for (const [k, kl] of short) console.log('- ' + kl + 'が' + items.filter(i => i.kind === k).length + '件。トップから押した先に ' + FLOOR_PER_KIND + '件は要る');
  console.log('足すには実在・権利・街との関係の確認が要る。数合わせで埋めない。');
  process.exit(1);
}
console.log('\nCATALOGUE_SUPPLY_GO（' + kinds.map(([k, kl]) => kl + items.filter(i => i.kind === k).length).join(' ') + '、下限 ' + FLOOR_PER_KIND + '件）');
