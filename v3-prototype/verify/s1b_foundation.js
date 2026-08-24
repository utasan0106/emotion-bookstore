#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const matchingSource = read('v3-prototype/js/cultural_matching.js');
const actionSource = read('v3-prototype/js/action_destination.js');
const dataSource = read('v3-prototype/js/data.js');
const registrySource = read('v3-prototype/js/real_experience_registry.js');
const contentSource = read('v3-prototype/js/s1b_editorial_content.js');
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function loadFoundation() {
  const window = {};
  vm.runInNewContext(matchingSource, {
    window, URL, Date, Object, Array, JSON, RegExp, Number, isNaN
  }, { filename: 'cultural_matching.js' });
  return window.V3_CULTURAL_MATCHING;
}

function loadProduct() {
  const window = { URL, open() { return null; } };
  const context = { window, URL, Date, Object, Array, JSON, RegExp, Number, isNaN };
  vm.runInNewContext(dataSource, context, { filename: 'data.js' });
  vm.runInNewContext(actionSource, context, { filename: 'action_destination.js' });
  vm.runInNewContext(matchingSource, context, { filename: 'cultural_matching.js' });
  vm.runInNewContext(registrySource, context, { filename: 'real_experience_registry.js' });
  vm.runInNewContext(contentSource, context, { filename: 's1b_editorial_content.js' });
  return window;
}

function truthFixture(canonicalType, practicalTruth) {
  return { canonicalType, practicalTruth };
}

const M = loadFoundation();

check('canonical type set is exact', JSON.stringify(Array.from(M.CANONICAL_TYPES)) === JSON.stringify([
  'Book', 'Film', 'Music', 'Exhibition', 'Place',
  'Dining', 'Travel', 'Activity', 'Event'
]));

const typeFixtures = {
  Book: truthFixture('Book', {
    author: '著者', publisher: '出版社', publicationDate: '2026-08-24', format: '単行本'
  }),
  Film: truthFixture('Film', {
    director: '監督', year: '2026', runtime: '120分', viewingStatus: '公式上映案内あり'
  }),
  Music: truthFixture('Music', {
    artist: '演奏者', workType: 'アルバム', duration: '42分', listeningStatus: '公式視聴案内あり'
  }),
  Exhibition: truthFixture('Exhibition', {
    venue: '会場', startDate: '2026-08-01', endDate: '2026-09-01', hours: '10:00–18:00'
  }),
  Place: truthFixture('Place', {
    area: '東京都内', hours: '10:00–18:00', access: '駅から徒歩5分', reservation: '不要'
  }),
  Dining: truthFixture('Dining', {
    area: '東京都内', serviceInfo: '昼営業', reservation: '公式で確認', price: '3,000円前後'
  }),
  Travel: truthFixture('Travel', {
    location: '目的地', duration: '一泊二日', availability: '指定日', reservation: '必要'
  }),
  Activity: truthFixture('Activity', {
    location: '会場', duration: '90分', eligibility: '公式参加条件あり', price: '2,000円'
  }),
  Event: truthFixture('Event', {
    venue: '会場', startDate: '2026-08-24', hours: '18:00開始', ticketStatus: '公式販売あり'
  })
};

Object.entries(typeFixtures).forEach(([type, fixture]) => {
  const truth = M.resolvePracticalTruth(fixture);
  check(`${type}: type-specific Practical Truth resolves`,
    truth && truth.type === type && truth.discoveryFacts.length >= 2 && truth.discoveryFacts.length <= 4,
    truth && JSON.stringify(truth.discoveryFacts));
});
check('missing facts remain omitted',
  M.resolvePracticalTruth(truthFixture('Book', { author: '著者' })).facts.length === 1);
check('unknown practical field fails closed',
  M.resolvePracticalTruth(truthFixture('Book', { author: '著者', rating: '5' })) === null);
check('native media grammar remains type-specific',
  M.resolvePracticalTruth(typeFixtures.Book).mediaShape === 'portrait' &&
  M.resolvePracticalTruth(typeFixtures.Music).mediaShape === 'square' &&
  M.resolvePracticalTruth(typeFixtures.Place).mediaShape === 'landscape');

const contextSession = M.createContextSession();
const contextRecords = [
  { id: 'UNKNOWN', title: '条件不明は推測で除外しない' },
  { id: 'FREE', title: '無料', contextEligibility: { budgetBand: ['free', 'under-3000', 'under-5000', 'flexible'] } },
  { id: 'HIGH', title: '高予算', contextEligibility: { budgetBand: ['under-5000', 'flexible'] } }
];
check('Context skip returns full eligible set',
  M.applyContext(contextRecords, contextSession.snapshot()).visibleCount === 3);
check('unsupported demographic field is rejected', contextSession.set('ageBand', '40s') === false);
check('coarse explicit Context value is accepted', contextSession.set('budgetBand', 'free') === true);
const filtered = M.applyContext(contextRecords, contextSession.snapshot());
check('Context removes only deterministic factual mismatch',
  filtered.visibleCount === 2 && filtered.removed.length === 1 && filtered.removed[0].record.id === 'HIGH',
  JSON.stringify(filtered.removed));
check('Context removal has ordinary-language explanation', /予算.*無料.*合わない/.test(filtered.removed[0].reason));
contextSession.clearAll();
check('Context clear restores broader original set',
  M.applyContext(contextRecords, contextSession.snapshot()).visibleCount === 3 && contextSession.isEmpty());
const contextBlock = matchingSource.slice(
  matchingSource.indexOf('function createContextSession'),
  matchingSource.indexOf('function validateFeatured')
);
check('Context implementation has no durable/URL/analytics/private-state primitive',
  !/localStorage|sessionStorage|indexedDB|V3_STORE|analytics|gtag|dataLayer|location|history|URLSearchParams|Interested|Trace|private/i.test(contextBlock));
check('Context implementation contains no inferred stereotype vocabulary',
  !/couple|parent|family|gender|personality|affinity|people like you|おすすめスコア/i.test(contextBlock));

function featuredSince(date) {
  return {
    featuredId: 'FEAT-1', contentId: 'WORK-1', shelfId: 'hajimu', title: '代表作',
    status: 'READY', featured: true, featuredSince: date,
    officialFact: '公式に確認した事実', editorialWhy: '編集部が置いた理由',
    rightsState: 'fallback_ready', officialUrl: 'https://example.com/work'
  };
}
const day0 = M.resolveFeatured([featuredSince('2026-08-24')], 'hajimu', '2026-08-24');
const day6 = M.resolveFeatured([featuredSince('2026-08-18')], 'hajimu', '2026-08-24');
const day7 = M.resolveFeatured([featuredSince('2026-08-17')], 'hajimu', '2026-08-24');
check('Featured day 0 shows new-to-shelf badge', day0.item && day0.item.newlyShelved === true);
check('Featured day 6 shows new-to-shelf badge', day6.item && day6.item.newlyShelved === true);
check('Featured day 7 hides badge but item persists',
  day7.item && day7.item.newlyShelved === false && day7.item.featured === true);
check('Featured future date fails closed',
  M.resolveFeatured([featuredSince('2026-08-25')], 'hajimu', '2026-08-24').item === null);
check('Featured invalid date fails closed',
  M.resolveFeatured([featuredSince('2026-02-30')], 'hajimu', '2026-08-24').item === null);
check('Featured duplicate slot fails closed',
  M.resolveFeatured([featuredSince('2026-08-24'), Object.assign(featuredSince('2026-08-24'), { featuredId: 'FEAT-2' })],
    'hajimu', '2026-08-24').reasons.includes('FEATURED_SLOT_DUPLICATE'));
check('Featured has no weekly replacement or random churn primitive',
  !/Math\.random|setInterval|countdown|replaceWeekly|mandatoryReplacement/.test(matchingSource));

function videoFixture(shelfId = 'hajimu') {
  return {
    videoId: 'VIDEO-' + shelfId, shelfId, title: '公式映像',
    mediaState: 'CLICK_TO_LOAD_READY', provider: 'youtube',
    officialUrl: 'https://example.com/official-video',
    embedUrl: 'https://www.youtube-nocookie.com/embed/TEST_123',
    sourceOfficial: true, rightsState: 'approved',
    editorialWhy: '編集部が置いた理由', viewingPoint: 'この棚で見るポイント',
    mediaShape: 'landscape', nativeWidth: 1440, nativeHeight: 1080,
    autoplay: false, soundOnLoad: false, firstPaintPlayerRequest: false
  };
}
const video = videoFixture();
check('video click-to-load fixture validates', M.validateVideo(video, 'hajimu').pass);
check('video native ratio token preserves non-16:9 source shape',
  M.videoRatioClass(video) === 'media-ratio-4-3' &&
  !M.validateVideo(Object.assign({}, video, { nativeWidth: 1000, nativeHeight: 777 }), 'hajimu').pass);
check('video embed rejects autoplay query',
  M.approvedEmbedUrl('youtube', video.embedUrl + '?autoplay=1') === null);
check('video passive load/autoplay fails closed',
  !M.validateVideo(Object.assign({}, video, { autoplay: true }), 'hajimu').pass &&
  !M.validateVideo(Object.assign({}, video, { soundOnLoad: true }), 'hajimu').pass &&
  !M.validateVideo(Object.assign({}, video, { firstPaintPlayerRequest: true }), 'hajimu').pass);
const created = [];
const fakeMount = { textContent: 'placeholder', appendChild(node) { this.child = node; } };
const fakeDocument = {
  createElement(tag) {
    const node = { tag, attrs: {}, setAttribute(name, value) { this.attrs[name] = String(value); } };
    created.push(node);
    return node;
  }
};
check('video first paint creates no third-party player', created.length === 0);
const activated = M.activateVideo(video, fakeMount, fakeDocument, () => null);
check('video player is created only after explicit activation',
  activated.ok && activated.mode === 'click_to_load' && created.length === 1 &&
  !/autoplay/.test(created[0].attrs.src));
check('video native ratio is carried to player attributes',
  created[0].attrs.width === '1440' && created[0].attrs.height === '1080');
const opened = [];
const linkVideo = Object.assign({}, video, { mediaState: 'LINK_ONLY_READY', embedUrl: null });
check('video official-link fallback works',
  M.activateVideo(linkVideo, null, null, (url) => { opened.push(url); return { opener: null }; }).ok &&
  opened.length === 1);

check('Daily lineup 0 is truthful', M.resolveLineup([], '2026-08-24', []).items.length === 0);
const lineupConfig = [{
  status: 'READY', effectiveDate: '2026-08-24', label: '本日のラインナップ',
  itemIds: ['A', 'B', 'C'], configVersion: 'fixture-v1'
}];
const lineupA = M.resolveLineup(lineupConfig, '2026-08-24', ['A', 'B', 'C']);
const lineupB = M.resolveLineup(lineupConfig, '2026-08-24', ['A', 'B', 'C']);
check('Daily lineup is finite and deterministic',
  lineupA.items.length === 3 && JSON.stringify(lineupA) === JSON.stringify(lineupB));
check('Daily lineup stale/ineligible item fails closed',
  M.resolveLineup(lineupConfig, '2026-08-24', ['A', 'B']).items.length === 0);
check('Daily lineup never randomizes or force-fills', !/Math\.random|while\s*\([^)]*length\s*<\s*3/.test(matchingSource));

const product = loadProduct();
const liveRelations = product.V3_REAL_EXPERIENCE_REGISTRY.releaseRelations('2026-08-24');
const liveAudit = M.auditReleaseReadiness({
  shelfIds: Array.from(product.V3_REAL_EXPERIENCE_REGISTRY.SHELF_IDS),
  relations: liveRelations,
  videos: Array.from(product.V3_S1B_EDITORIAL_CONTENT.videos)
});
check('live runtime remains exactly one eligible work per shelf',
  liveAudit.shelves.every((shelf) => shelf.worksReady === 1),
  JSON.stringify(liveAudit.shelves));
check('live editorial video readiness remains zero without approved records',
  liveAudit.shelves.every((shelf) => shelf.videoReady === 0));
check('Release Content Gate truthfully remains not ready',
  liveAudit.gateReady === false && liveAudit.totalWorksReady === 8 && liveAudit.totalVideosReady === 0);

const gateRelations = [];
const gateVideos = [];
Array.from(product.V3_REAL_EXPERIENCE_REGISTRY.SHELF_IDS).forEach((shelfId, shelfIndex) => {
  ['Book', 'Film', 'Place'].forEach((type, index) => gateRelations.push({
    shelfId, contentId: `${shelfId}-${index}`, canonicalObjectId: `https://example.com/${shelfId}/${index}`,
    normalizedType: type, sourceFamily: `source-${index}`, sourceUrl: `https://example.com/${shelfId}/${index}`,
    sourceTraceable: true, officialVerified: true, editorialWhy: '人が承認した棚固有の理由',
    actionStatus: 'ready', freshnessStatus: 'ready', mediaStatus: 'fallback_ready',
    language: 'ja', eligible: true, role: 'base'
  }));
  gateVideos.push(videoFixture(shelfId));
});
const gateAudit = M.auditReleaseReadiness({
  shelfIds: Array.from(product.V3_REAL_EXPERIENCE_REGISTRY.SHELF_IDS),
  relations: gateRelations,
  videos: gateVideos
});
check('dedicated 3 works + 1 video fixture can pass Release Content Gate', gateAudit.gateReady === true);
check('release validator reports category distribution and source concentration',
  gateAudit.shelves.every((shelf) =>
    Object.keys(shelf.normalizedCategoryDistribution).length === 3 &&
    Object.keys(shelf.sourceConcentration).length === 3));
const duplicateGate = M.auditReleaseReadiness({
  shelfIds: Array.from(product.V3_REAL_EXPERIENCE_REGISTRY.SHELF_IDS),
  relations: gateRelations.concat([Object.assign({}, gateRelations[0], { contentId: 'extra-duplicate' })]),
  videos: gateVideos
});
check('release validator detects duplicate canonical object',
  duplicateGate.blocking.some((reason) => reason.startsWith('DUPLICATE_CANONICAL_OBJECT:')));
const duplicateIdGate = M.auditReleaseReadiness({
  shelfIds: Array.from(product.V3_REAL_EXPERIENCE_REGISTRY.SHELF_IDS),
  relations: gateRelations.concat([Object.assign({}, gateRelations[0], {
    canonicalObjectId: 'https://example.com/extra-object'
  })]),
  videos: gateVideos
});
check('release validator detects duplicate ID',
  duplicateIdGate.blocking.some((reason) => reason.startsWith('DUPLICATE_ID:')));
check('live S1B editorial packet is explicitly empty, not filler',
  /featured:\s*Object\.freeze\(\[\]\)/.test(contentSource) &&
  /videos:\s*Object\.freeze\(\[\]\)/.test(contentSource) &&
  /dailyLineups:\s*Object\.freeze\(\[\]\)/.test(contentSource) &&
  /noEmotionLineups:\s*Object\.freeze\(\[\]\)/.test(contentSource));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exitCode = failed.length ? 1 : 0;
