/* Isolated Frontstage QA fixture. It mounts no Product inventory and is loaded
   only by /verify/frontstage_runtime_fixture.html. */
(function (global) {
  'use strict';

  var query = new URLSearchParams(global.location.search);
  var ids = ['EXP_101', 'EXP_102', 'EXP_103'];
  var mode = query.get('mode') || 'valid';
  var count = Number(query.get('count') || '0');
  var itemIds = ids.slice(0, Math.max(0, Math.min(3, count)));
  var startsOn = '2026-01-01';
  var expiresOn = '2027-12-31';

  if (mode === 'too-many') itemIds = ['EXP_101', 'EXP_102', 'EXP_103', 'EXP_104'];
  if (mode === 'duplicate') itemIds = ['EXP_101', 'EXP_101'];
  if (mode === 'invalid') itemIds = ['EXP_999'];
  if (mode === 'expired') {
    startsOn = '2025-01-01';
    expiresOn = '2025-12-31';
  }

  var config = Object.freeze({
    status: 'READY',
    configVersion: 'frontstage-isolated-fixture-v1',
    label: '編集部の仕入れ',
    startsOn: startsOn,
    expiresOn: expiresOn,
    itemIds: Object.freeze(itemIds)
  });
  var configs = mode === 'duplicate-config'
    ? Object.freeze([config, Object.freeze(Object.assign({}, config, {
      configVersion: 'frontstage-isolated-fixture-v2'
    }))])
    : Object.freeze([config]);

  global.V3_S1B_EDITORIAL_CONTENT = Object.freeze({
    version: 'v3-frontstage-isolated-runtime-fixture-v1',
    featured: Object.freeze([]),
    videos: Object.freeze([]),
    dailyLineups: Object.freeze([]),
    noEmotionLineups: configs
  });

  if (query.get('firstPull') === 'approved') {
    var baseRegistry = global.V3_REAL_EXPERIENCE_REGISTRY;
    var wrapper = {};
    Object.keys(baseRegistry).forEach(function (key) { wrapper[key] = baseRegistry[key]; });
    wrapper.byId = function (id, asOf) {
      var record = baseRegistry.byId(id, asOf);
      if (!record || id !== 'EXP_101') return record;
      var copy = JSON.parse(JSON.stringify(record));
      copy.firstPull = {
        status: 'READY',
        reviewerHuman: true,
        text: '空間を越えて移動する作品を、自分の歩幅で追う。'
      };
      return Object.freeze(copy);
    };
    global.V3_REAL_EXPERIENCE_REGISTRY = Object.freeze(wrapper);
  }
})(window);
