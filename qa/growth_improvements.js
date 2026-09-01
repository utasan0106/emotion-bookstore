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
console.log('growth_improvements: PASS');


// ---- trust boundary: this enhancement remains local-only -----------------
for (const token of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'gtag(', 'indexedDB', 'sessionStorage',
                     'navigator.geolocation', 'navigator.permissions']) {
  assert.ok(!source.includes(token), `forbidden growth runtime token: ${token}`);
}
assert.ok(source.includes("emotionBookstore.v3.interested.v2"), 'general interested storage key missing');
assert.ok(source.includes("emotionBookstore.v3.weeklyFavorites.v1"), 'legacy weekly migration key missing');
