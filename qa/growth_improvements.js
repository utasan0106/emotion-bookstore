'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const sideBySide = path.join(__dirname, 'growth-improvements.js');
const repoRoot = path.join(__dirname, '..', 'growth-improvements.js');
const sourcePath = fs.existsSync(sideBySide) ? sideBySide : repoRoot;
const source = fs.readFileSync(sourcePath, 'utf8');
const content = {
  archive: [{ id: 'existing', title: 'existing' }],
  shelves: [
    { id: 'a', area: 'A', weeklyFeature: { title: 'expired', why: 'why', actionUrl: 'https://example.com', verifiedAt: '2026-08-01T00:00:00+09:00', expiresAt: '2026-08-02T00:00:00+09:00' }, objects: [] },
    { id: 'b', area: 'B', weeklyFeature: { title: 'live', expiresAt: '2026-12-01T00:00:00+09:00' }, objects: [] }
  ]
};
const sandbox = { window: { V3_RELEASE_CONTENT: content }, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
assert.ok(sandbox.window.V3_GROWTH, 'pure helper API is exposed');
const generated = sandbox.window.V3_GROWTH.generatedWeeklyArchiveEntries(content, Date.parse('2026-09-01T22:30:00+09:00'));
assert.strictEqual(generated.length, 1, 'only expired weekly feature is archived');
assert.strictEqual(generated[0].title, 'expired');
assert.deepStrictEqual(Array.from(generated[0].categoryIds), ['experience']);
assert.strictEqual(content.archive.filter(x => x.id.indexOf('weekly:a:') === 0).length, 1, 'runtime lifecycle appends the expired feature once');
vm.runInContext(source, sandbox);
assert.strictEqual(content.archive.filter(x => x.id.indexOf('weekly:a:') === 0).length, 1, 'lifecycle is idempotent');

const normalizedExpired = sandbox.window.V3_GROWTH.normalizeInterestedItems([
  {
    id: 'weekly:a:2026-08-02T00:00:00+09:00',
    kind: 'weekly-feature',
    kindLabel: '今週の特集',
    title: 'expired',
    area: 'A',
    shelfId: 'a',
    expiresAt: '2026-08-02T00:00:00+09:00'
  }
], Date.parse('2026-09-01T22:30:00+09:00'));
assert.strictEqual(normalizedExpired.length, 1, 'expired saved weekly feature is retained only through Archive');
assert.strictEqual(normalizedExpired[0].kind, 'archive', 'expired saved weekly feature becomes Archive');
assert.strictEqual(normalizedExpired[0].title, 'expired');
assert.strictEqual(normalizedExpired[0].archivedAt, '2026-08-02T00:00:00+09:00');

const normalizedLive = sandbox.window.V3_GROWTH.normalizeInterestedItems([
  {
    id: 'weekly:b:2026-12-01T00:00:00+09:00',
    kind: 'weekly-feature',
    kindLabel: '今週の特集',
    title: 'live',
    area: 'B',
    shelfId: 'b',
    expiresAt: '2026-12-01T00:00:00+09:00'
  }
], Date.parse('2026-09-01T22:30:00+09:00'));
assert.strictEqual(normalizedLive.length, 1, 'live saved weekly feature remains');
assert.strictEqual(normalizedLive[0].kind, 'weekly-feature', 'live weekly state is unchanged');
console.log('growth_improvements: PASS');


// ---- trust boundary: this enhancement remains local-only -----------------
for (const token of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'gtag(', 'indexedDB', 'sessionStorage',
                     'navigator.geolocation', 'navigator.permissions']) {
  assert.ok(!source.includes(token), `forbidden growth runtime token: ${token}`);
}
assert.ok(source.includes("emotionBookstore.v3.interested.v2"), 'general interested storage key missing');
assert.ok(source.includes("emotionBookstore.v3.weeklyFavorites.v1"), 'legacy weekly migration key missing');
