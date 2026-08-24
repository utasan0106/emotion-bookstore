/* Internal-only S1A cardinality fixture. /v3-prototype/verify is excluded from
   Vercel delivery; Product data and the approved Registry remain untouched. */
(function (global) {
  'use strict';

  var original = global.V3_REAL_EXPERIENCE_REGISTRY;
  var query = new URLSearchParams(global.location.search);
  var requested = Number(query.get('count'));
  var count = [0, 1, 2, 3].indexOf(requested) === -1 ? 3 : requested;
  var mode = query.get('mode') === 'error' ? 'error' : 'finite';
  var fixtureShelf = query.get('shelf') || 'atatamaru';
  var ids = ['EXP_007', 'EXP_101', 'EXP_102'].slice(0, count);
  var fixtureRegistry = {};
  Object.keys(original).forEach(function (key) { fixtureRegistry[key] = original[key]; });

  fixtureRegistry.deckForEmotion = function (emotionId, asOf) {
      if (emotionId !== fixtureShelf) return original.deckForEmotion(emotionId, asOf);
      if (mode === 'error') throw new Error('S1A isolated malformed-registry fixture');
      return Object.freeze({
        id: 'S1A-QA-' + count,
        emotionId: emotionId,
        ids: Object.freeze(ids.slice())
      });
    };
  global.V3_REAL_EXPERIENCE_REGISTRY = Object.freeze(fixtureRegistry);

  global.__S1A_QA__ = Object.freeze({
    mode: mode, count: count, shelfId: fixtureShelf, ids: ids.slice()
  });
})(window);
