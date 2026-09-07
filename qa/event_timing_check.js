'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'release.js'), 'utf8');
const timing = vm.runInNewContext('(' + source.match(/function featureTimingLabel\(feature, now\) \{[\s\S]*?\n  \}/)[0] + ')');
const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'release_content.js'), 'utf8'), sandbox);
for (const shelf of sandbox.window.V3_RELEASE_CONTENT.shelves) {
  const f = shelf.weeklyFeature;
  assert.ok(f.eventType && shelf.area);
  const d = f.calendarDates.slice(0, 8);
  const start = Date.parse(d.slice(0,4) + '-' + d.slice(4,6) + '-' + d.slice(6,8) + 'T00:00:00+09:00');
  const end = Date.parse(f.expiresAt);
  assert.equal(timing(f, start - 1), '開催予定');
  assert.equal(timing(f, start), '開催期間内');
  assert.equal(timing(f, end - 1), '開催期間内');
  assert.equal(timing(f, end), '終了');
  assert.equal(timing(f, Date.parse('2026-09-08T00:00:00+09:00')), '開催予定');
}
for (const f of [{}, {calendarDates:'bad',expiresAt:'2026-09-10'}, {calendarDates:'20260920/20260921',expiresAt:'2026-09-19'}]) {
  assert.equal(timing(f, Date.now()), '日程は公式で確認');
}
assert.match(source, /expires <= Date.now\(\)\) return/); // Ended event cards remain hidden.
assert.match(source, /開催日・開場時間は公式で確認/);
assert.match(fs.readFileSync(path.join(root, 'shelf.html'), 'utf8'), /この街のイベント/);
console.log('PASS event period labels: JST boundaries, future, expired, unknown; never claim doors open');
