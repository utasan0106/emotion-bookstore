#!/usr/bin/env node
'use strict';
// 催しの在庫が尽きかけていることを、公開面が寂しくなる前に知らせる。
//
// 催しは会期があるので、足さなければ必ず減る。減っていることは索引の件数に正直に出るが、
// 出たときにはもう読者が見ている。ここで先に落とす。
//
// 見通しは「その週になったつもりで」数える。ここを今日の日付のまま数えると嘘になる：
// week.select は reviewThrough を今日と比べるので、再確認期限が切れて全件消える週も、
// 今日から見るかぎり普通に埋まって見えてしまう。実際にそうなっていた。
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
  // その週の月曜に site を開いた読者が見るもの。今週だけは「これから」なので実時刻で数える。
  const asOf = n === 0 ? now : week.stamp(start);
  const selected = week.select(events, { now: asOf, week: start });
  const byKind = {};
  for (const e of selected) for (const k of e.browseKinds) byKind[k] = (byKind[k] || 0) + 1;
  rows.push({ start, total: selected.length, byKind });
}

const label = Object.fromEntries(kinds.map(k => [k.id, k.label]));
console.log('週ごとの催し（' + week.date(now) + ' 時点、その週になったつもりで数える）');
for (const r of rows) {
  const detail = kinds.map(k => label[k.id] + (r.byKind[k.id] || 0)).join(' ');
  console.log('  ' + r.start + '  ' + String(r.total).padStart(2) + '件   ' + detail);
}

// 再確認期限は会期と別に効く。期限が切れた催しは、会期が残っていても表示から外れる。
// 全件が同じ日付だと、その翌日に催しの節がまるごと空になる。日付ごとに何件かを出す。
const byReview = {};
for (const e of events) byReview[e.reviewThrough] = (byReview[e.reviewThrough] || 0) + 1;
const reviewDates = Object.keys(byReview).sort();
console.log('\n再確認期限（この日を過ぎると会期が残っていても表示から外れる）');
for (const d of reviewDates) console.log('  ' + d + '  ' + byReview[d] + '件');
const lastReview = reviewDates[reviewDates.length - 1];
if (reviewDates.length === 1) {
  console.log('  ※ 全' + events.length + '件が同じ日。' + week.add(lastReview, 1) + ' に催しの節が一度に空になる。');
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
  console.log('直し方は二つ。会期が残っている催しを公式で再確認して reviewThrough を延ばすか、');
  console.log('新しい催しを出典付きで足すか。どちらも実在の確認が要る。数合わせで埋めない。');
  process.exit(1);
}

const soon = rows.find(r => r.total < FLOOR);
if (soon) console.log('\n注意：' + soon.start + ' の週は現時点で ' + soon.total + '件。その週が来る前に足す。');
console.log('\nEVENT_SUPPLY_GO（今週 ' + rows[0].total + '件 / 来週 ' + rows[1].total + '件、下限 ' + FLOOR + '件）');
