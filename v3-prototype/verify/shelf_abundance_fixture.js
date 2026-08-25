/* =============================================================================
 * Internal-only Shelf Abundance fixture (cover / collection cardinality).
 * /v3-prototype/verify is excluded from Vercel delivery. Product data and the
 * approved Registry are never modified: this fixture only simulates a FUTURE
 * inventory depth (6–15) that current Human approval does not yet contain.
 *
 * Query:
 *   ?collection=N   authored collection size (0–16, default 8)
 *   &cover=K        authored cover size (0–4, default min(3, N))
 *   &shelf=<id>     fixture shelf (default miwohiku)
 *   &stale=1        insert one authored id whose record resolves to null
 *   &dup=1          insert a duplicate authored id (structural failure)
 *
 * The real validateShelfPlan and the real COLLECTION_MIN_AVAILABLE /
 * COLLECTION_MAX thresholds are reused; only the record source is simulated.
 * ========================================================================== */
(function (global) {
  'use strict';

  var original = global.V3_REAL_EXPERIENCE_REGISTRY;
  var MATCHING = global.V3_CULTURAL_MATCHING;
  var query = new URLSearchParams(global.location.search);
  var fixtureShelf = query.get('shelf') || 'miwohiku';
  var requested = Number(query.get('collection'));
  var collectionSize = isNaN(requested) || requested < 0 || requested > 16 ? 8 : requested;
  var requestedCover = Number(query.get('cover'));
  var coverSize = isNaN(requestedCover) || requestedCover < 0 || requestedCover > 4
    ? Math.min(3, collectionSize) : requestedCover;
  var withStale = query.get('stale') === '1';
  var withDuplicate = query.get('dup') === '1';

  /* Human Editorial order. The first three positions stay place-grounded so the
     existing cover contract (official grounding required) is unchanged; the
     深部 positions add type-neutral objects without placeDetail so the
     cross-category Detail path is genuinely exercised. */
  var TYPE_PLAN = [
    'Place', 'Activity', 'Exhibition', 'Book', 'Place', 'Film',
    'Exhibition', 'Music', 'Place', 'Event', 'Book', 'Activity',
    'Film', 'Exhibition', 'Music', 'Place'
  ];
  /* Only these types are re-typed away from their place-grounded base. */
  var TYPE_LABELS = { Book: '本', Film: '映画', Music: '音楽', Event: 'イベント' };
  var TRUTH_BY_TYPE = {
    Book: { author: '検証用著者', publisher: '検証用出版社', publicationDate: '2026-01-20', format: '単行本', officialRoute: '出版社の公式ページ' },
    Film: { director: '検証用監督', year: '2026', runtime: '112分', language: '日本語', viewingStatus: '公式の配信案内' },
    Music: { artist: '検証用アーティスト', workType: 'アルバム', duration: '48分', listeningStatus: '公式の試聴案内' },
    Event: { venue: '検証用会場', startDate: '2026-09-12', endDate: '2026-09-13', hours: '13:00–17:00', price: '無料', ticketStatus: '事前申込制' }
  };

  var BASE_PLACE = original.byId('EXP_107', '2026-08-24');
  var BASE_ACTIVITY = original.byId('EXP_102', '2026-08-24');
  var BASE_EXHIBITION = original.byId('EXP_103', '2026-08-24');

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function baseFor(type) {
    if (type === 'Place') return BASE_PLACE;
    if (type === 'Activity') return BASE_ACTIVITY;
    return BASE_EXHIBITION;
  }

  function qaId(index) { return 'QA_EXP_' + (index < 9 ? '0' : '') + (index + 1); }

  function buildRecord(index) {
    var type = TYPE_PLAN[index % TYPE_PLAN.length];
    var base = baseFor(type);
    if (!base) return null;
    var record = clone(base);
    record.id = qaId(index);
    record.title = '検証用文化物 ' + (index + 1) + '（' + type + '）';
    record.reason = '「身を引く」棚の奥行き検証のために用意した、編集部の置き理由の本文です。' +
      'この本文は実在の案内ではなく、compact card の line clamp と Detail の完全表示を' +
      '確かめるための固定長テキストとして ' + (index + 1) + ' 番目の位置に置いています。';
    record.editorial = record.editorial || {};
    record.editorial.relation = 'direct';
    if (TRUTH_BY_TYPE[type]) {
      record.canonicalType = type;
      record.type = TYPE_LABELS[type];
      record.practicalTruth = clone(TRUTH_BY_TYPE[type]);
      /* Type-neutral objects carry no place-specific truth. */
      delete record.placeDetail;
      delete record.physicalDestination;
    }
    if (record.visualAsset) record.visualAsset.altTextJa = record.title + 'のカテゴリ図版';
    if (record.placeDetail) record.placeDetail.placementReason = record.reason;
    return record;
  }

  var qaRecords = {};
  var authoredIds = [];
  var i;
  for (i = 0; i < collectionSize; i += 1) {
    var record = buildRecord(i);
    if (record) {
      qaRecords[record.id] = record;
      authoredIds.push(record.id);
    }
  }
  if (withStale) {
    authoredIds.push('QA_EXP_STALE');
  }
  if (withDuplicate && authoredIds.length) {
    authoredIds.push(authoredIds[0]);
  }
  var coverIds = authoredIds.slice(0, coverSize);

  var fixtureRegistry = {};
  Object.keys(original).forEach(function (key) { fixtureRegistry[key] = original[key]; });

  fixtureRegistry.byId = function (id, asOf) {
    if (Object.prototype.hasOwnProperty.call(qaRecords, id)) return qaRecords[id];
    if (id === 'QA_EXP_STALE') return null;
    return original.byId(id, asOf || '2026-08-24');
  };

  fixtureRegistry.validateRecord = function (record, asOf) {
    if (record && Object.prototype.hasOwnProperty.call(qaRecords, record.id)) {
      return { pass: true, reasons: [] };
    }
    return original.validateRecord(record, asOf);
  };

  fixtureRegistry.deckForEmotion = function (emotionId, asOf) {
    if (emotionId !== fixtureShelf) return original.deckForEmotion(emotionId, asOf);
    return Object.freeze({
      deckRef: original.DECK_REF,
      emotionId: emotionId,
      ids: Object.freeze(coverIds.slice()),
      relationCoverage: Object.freeze({ direct: coverIds.length, adjacent: 0, opening: 0 }),
      fillFlag: false
    });
  };

  fixtureRegistry.collectionForEmotion = function (emotionId, asOf) {
    if (emotionId !== fixtureShelf) return original.collectionForEmotion(emotionId, asOf);
    var plan = original.validateShelfPlan({
      coverIds: coverIds.slice(), collectionIds: authoredIds.slice()
    });
    if (!plan.pass) {
      return Object.freeze({
        shelfId: emotionId, state: 'error', reasons: Object.freeze(plan.reasons.slice()),
        ids: Object.freeze([]), coverIds: Object.freeze([]), count: 0, available: false
      });
    }
    var ids = authoredIds.filter(function (id) {
      return Boolean(fixtureRegistry.byId(id, asOf));
    });
    return Object.freeze({
      shelfId: emotionId,
      state: 'ok',
      reasons: Object.freeze([]),
      ids: Object.freeze(ids),
      coverIds: Object.freeze(coverIds.slice()),
      count: ids.length,
      available: ids.length >= original.COLLECTION_MIN_AVAILABLE &&
        ids.length <= original.COLLECTION_MAX
    });
  };

  fixtureRegistry.shelfForExperience = function (experienceId, asOf) {
    if (authoredIds.indexOf(experienceId) !== -1) {
      return fixtureRegistry.byId(experienceId, asOf) ? fixtureShelf : null;
    }
    return original.shelfForExperience(experienceId, asOf);
  };

  global.V3_REAL_EXPERIENCE_REGISTRY = Object.freeze(fixtureRegistry);

  /* The prototype adapter captured the approved registry before this fixture
     loaded; extend it so simulated depth objects behave like real records for
     durable-Interested eligibility. Storage schema and behavior are unchanged. */
  if (global.V3_DATA && typeof global.V3_DATA.byId === 'function') {
    var originalDataById = global.V3_DATA.byId;
    global.V3_DATA.byId = function (id) {
      if (Object.prototype.hasOwnProperty.call(qaRecords, id)) return qaRecords[id];
      return originalDataById(id);
    };
  }

  global.__SHELF_ABUNDANCE_QA__ = Object.freeze({
    shelfId: fixtureShelf,
    collectionSize: collectionSize,
    coverSize: coverSize,
    authoredIds: Object.freeze(authoredIds.slice()),
    coverIds: Object.freeze(coverIds.slice()),
    types: Object.freeze(authoredIds.map(function (id) {
      var qa = qaRecords[id];
      return qa && MATCHING ? qa.canonicalType : null;
    }))
  });
})(window);
