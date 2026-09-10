#!/usr/bin/env node
'use strict';
// 催しの在庫が尽きかけていることを、公開面が寂しくなる前に知らせる。
//
// 催しは会期があるので、足さなければ必ず減る。減っていることは索引の件数に正直に出るが、
// 出たときにはもう読者が見ている。ここで先に落とす。
//
// 判定は「今週」と「来週」だけ。それより先は、その週が来るまでに足せばよいので、
// 落とさずに見通しだけ出す。種類ごとの内訳も出す（ひとつの種類だけ枯れることがある）。

const path = require('node:path');
const root = path.resolve(__dirname, '..');
const week = require(path.join(root, 'outings/week.js'));
const { events, kinds } = require(path.join(root, 'tools/weekly-outings-source'));

const FLOOR = 5;          // 今週・来週に最低これだけは出す
const OUTLOOK_WEEKS = 6;  // 見通しを出す週数

const now = Date.now();
const rows = [];
for (let n = 0; n < OUTLOOK_WEEKS; n++) {
  const start = week.add(week.monday(now), n * 7);
  const selected = week.select(events, { now, week: start });
  const byKind = {};
  for (const e of selected) for (const k of e.browseKinds) byKind[k] = (byKind[k] || 0) + 1;
  rows.push({ start, total: selected.length, byKind });
}

const label = Object.fromEntries(kinds.map(k => [k.id, k.label]));
console.log('週ごとの催し（' + week.date(now) + ' 時点）');
for (const r of rows) {
  const detail = kinds.map(k => label[k.id] + (r.byKind[k.id] || 0)).join(' ');
  console.log('  ' + r.start + '  ' + String(r.total).padStart(2) + '件   ' + detail);
}

const uncategorised = events.filter(e => !e.browseKinds.length);
if (uncategorised.length) {
  console.log('\n種類が付いていない催し（「すべての催し」からしか辿れない）:');
  for (const e of uncategorised) console.log('  ' + e.kind + '  ' + e.id);
}

const thin = rows.slice(0, 2).filter(r => r.total < FLOOR);
if (thin.length) {
  console.log('\nEVENT_SUPPLY_FAIL');
  for (const r of thin) console.log('- ' + r.start + ' の週は ' + r.total + '件。' + FLOOR + '件を下回っている');
  console.log('催しを足すには実在の確認と出典が要る。数合わせで埋めない。');
  process.exit(1);
}

const soon = rows.find(r => r.total < FLOOR);
if (soon) console.log('\n注意：' + soon.start + ' の週は現時点で ' + soon.total + '件。その週が来る前に足す。');
console.log('\nEVENT_SUPPLY_GO（今週 ' + rows[0].total + '件 / 来週 ' + rows[1].total + '件、下限 ' + FLOOR + '件）');
