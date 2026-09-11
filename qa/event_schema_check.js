#!/usr/bin/env node
'use strict';
// 催しの構造化データが、持っている事実と食い違っていないか。
//
// 2026-09-11 まで、催しページには構造化データが一つも無かった。日時と会場を
// 持っているのに、検索エンジンにもAIにも、ただのページに見えていた。
//
// ここで見るのは「書いてあることが本当か」だけである。**多く書くほど良い、では
// ない。** 価格・画像・主催者は、データとして持っていないか、持っていても
// その催しのものではない（会場や街の写真）ので、書かないことが正しい。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { events } = require('../tools/weekly-outings-source');
const { dates } = require('../outings/week');

const root = path.resolve(__dirname, '..');
const read = id => {
  const html = fs.readFileSync(path.join(root, 'outings/events', id + '.html'), 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, id + ': 構造化データが無い');
  return JSON.parse(m[1].replace(/\\u003c/g, '<'));
};

let series = 0, single = 0;
for (const e of events) {
  const o = read(e.id);
  const all = dates(e);

  assert.equal(o['@context'], 'https://schema.org', e.id);
  assert.equal(o.name, e.title, e.id + ': 題名が一致しない');
  assert.equal(o.location.name, e.venue, e.id + ': 会場が一致しない');
  assert.equal(o.url, 'https://emotionbookstore.com/outings/events/' + e.id + '.html', e.id);
  assert.equal(o.startDate, all[0], e.id + ': 開始日が実際の開催日と違う');
  assert.equal(o.endDate, all.at(-1), e.id + ': 終了日が実際の開催日と違う');

  // 持っていないもの、その催しのものでないものは書かない。
  assert.ok(!('offers' in o), e.id + ': 価格は自由文なので構造化しない');
  assert.ok(!('image' in o), e.id + ': 画像は会場・街の写真で、催しの写真ではない');
  assert.ok(!('performer' in o), e.id + ': 出演者は構造化して持っていない');
  assert.ok(!('organizer' in o), e.id + ': 主催者は構造化して持っていない');
  assert.ok(!o.location.address, e.id + ': 住所は持っていない。会場名だけを書く');

  if (!e.start && all.length > 1) {
    // 飛び飛びの日程。ひとつの Event にすると「その間ずっと開催」と読まれる。
    series++;
    assert.equal(o['@type'], 'EventSeries', e.id + ': 飛び飛びの日程は EventSeries');
    assert.equal(o.subEvent.length, all.length, e.id + ': 開催日の数と subEvent の数が違う');
    assert.deepEqual(o.subEvent.map(s => s.startDate), all, e.id + ': subEvent の日付が実際と違う');
    for (const s of o.subEvent) assert.equal(s.startDate, s.endDate, e.id + ': subEvent は1日ずつ');
  } else {
    single++;
    assert.equal(o['@type'], 'Event', e.id);
  }
}

console.log('PASS ' + events.length + '件の催しに構造化データ（Event ' + single
  + ' / EventSeries ' + series + '）。日付・会場・題名は元データと一致し、'
  + '持っていない事実は書いていない');
