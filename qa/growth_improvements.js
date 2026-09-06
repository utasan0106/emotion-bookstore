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

// ---- legacy HOME routes: NO EVIDENCE = NO ROUTE ---------------------------
// 旧 HOME の anchor（#by-kind / #archive / #weekly-detour / #weekly-video-title）は
// 消えた。保存済み record の href は表示時に explore.html へ読み替えるが、現在の
// 受け手が無いもの（寄り道 / 週間動画）は無関係な section へ振らず null にする。
const G = sandbox.window.V3_GROWTH;
assert.strictEqual(typeof G.migrateLegacyHref, 'function', 'migrateLegacyHref exposed');
assert.strictEqual(typeof G.recordRoute, 'function', 'recordRoute exposed');
assert.strictEqual(typeof G.archiveRecord, 'function', 'archiveRecord exposed');

// 1. query-before-hash keeps the declared category / town
assert.strictEqual(G.migrateLegacyHref('./index.html?category=music&town=koenji#by-kind'),
  './explore.html?category=music&town=koenji', 'category+town survive the migration');
assert.strictEqual(G.migrateLegacyHref('./index.html?town=koenji&category=music#by-kind'),
  './explore.html?category=music&town=koenji', 'param order is normalised');
assert.strictEqual(G.migrateLegacyHref('./index.html?category=music#by-kind'), './explore.html?category=music');
assert.strictEqual(G.migrateLegacyHref('./index.html?town=jinbocho#by-kind'), './explore.html?town=jinbocho');
assert.strictEqual(G.migrateLegacyHref('index.html?category=books&town=jinbocho#by-kind'),
  './explore.html?category=books&town=jinbocho', 'works without the ./ prefix');
assert.strictEqual(G.migrateLegacyHref('./index.html?category=music&utm=x#by-kind'),
  './explore.html?category=music', 'only category / town are carried');
// 2. bare by-kind
assert.strictEqual(G.migrateLegacyHref('./index.html#by-kind'), './explore.html');
// 3. detour / weekly video: no current surface → no route, record preserved
assert.strictEqual(G.migrateLegacyHref('./index.html#weekly-detour'), null);
assert.strictEqual(G.migrateLegacyHref('./index.html#weekly-video-title'), null);
const detour = { id: 'detour:2026-09-01:PERFECT DAYS', kind: 'detour', kindLabel: '映画', title: 'PERFECT DAYS', area: '今週の寄り道', href: './index.html#weekly-detour' };
const video = { id: 'weekly-video:TNomzoYXWMc', kind: 'weekly-video', kindLabel: '今週の一本', title: 'NOTHING LIKE TOKYO - Culture', area: '今週の、街と気持ち。', href: './index.html#weekly-video-title' };
// 9ac0541 で一度 HOME の実 section へ付け替えられた形も、kind で判定して同じ扱い
const detourRepointed = Object.assign({}, detour, { href: './index.html#hc-thread' });
const videoRepointed = Object.assign({}, video, { href: './index.html#hc-works' });
for (const r of [detour, video, detourRepointed, videoRepointed]) {
  assert.strictEqual(G.recordRoute(r), null, `no clickable route for legacy ${r.kind} (${r.href})`);
}
const kept = G.normalizeInterestedItems([detour, video], Date.parse('2026-09-01T22:30:00+09:00'));
// 同じ参照がそのまま返る＝題名・meta・href を一切書き換えず、消してもいない
assert.ok(kept.length === 2 && kept[0] === detour && kept[1] === video, 'legacy records are preserved verbatim (title / meta / href), not deleted or rewritten');
assert.strictEqual(detour.href, './index.html#weekly-detour', 'saved href is left as stored (display-time migration only)');
// 4. archive records land on explore.html#archive
assert.strictEqual(G.archiveRecord({ id: 'x', title: 't' }).href, './explore.html#archive');
assert.strictEqual(normalizedExpired[0].href, './explore.html#archive', 'expired saved weekly feature routes to the explore archive');
assert.strictEqual(G.migrateLegacyHref('./index.html#archive'), './explore.html#archive');
assert.strictEqual(G.recordRoute({ id: 'archive:old', kind: 'archive', title: 'old', href: './index.html#archive' }), './explore.html#archive');
// 5. idempotent, and non-HOME hrefs pass through untouched
for (const href of ['./index.html?category=music&town=koenji#by-kind', './index.html#by-kind', './index.html#archive',
  './explore.html?category=books', './explore.html#archive', './shelf.html?shelf=koenji', './index.html']) {
  const once = G.migrateLegacyHref(href);
  assert.strictEqual(G.migrateLegacyHref(once), once, `idempotent: ${href}`);
}
assert.strictEqual(G.migrateLegacyHref('./shelf.html?shelf=koenji'), './shelf.html?shelf=koenji');
assert.strictEqual(G.migrateLegacyHref('./index.html'), './index.html');
assert.strictEqual(G.recordRoute({ id: 'object:x', kind: 'object', title: 'x', shelfId: 'koenji', href: './shelf.html?shelf=koenji' }), './shelf.html?shelf=koenji');
assert.strictEqual(G.recordRoute({ id: 'weekly:koenji:x', kind: 'weekly-feature', title: 'x', shelfId: 'koenji' }), './shelf.html?shelf=koenji');
// 6. static: the runtime never routes a saved record or a traversal link to a HOME section,
//    and ARCHIVE renders only into the explicit explore.html host (never into #main).
assert.ok(!/index\.html#hc-/.test(source), 'growth runtime must not route saved records / traversal to HOME sections');
assert.ok(!source.includes("getElementById('main')"), 'archive must never be appended to #main (HOME would grow after expiry)');
assert.ok(source.includes("getElementById('archiveHost')"), 'archive renders only into the explicit host');
assert.ok(source.includes("exploreHref({ category: category.id, town: shelf.id }, '')"), 'same-town traversal keeps category + town');
assert.ok(source.includes("exploreHref({ category: category.id }, '')"), 'all-town traversal keeps category');
assert.ok(!source.includes('decorateDetour') && !source.includes('decorateWeeklyVideo'), 'retired detour / weekly video record factories are gone');
console.log('growth_improvements: legacy routes PASS');
