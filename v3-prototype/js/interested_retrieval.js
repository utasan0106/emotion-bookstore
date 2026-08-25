/* =============================================================================
 * V3 Interested retrieval — current-authority resolver
 * -----------------------------------------------------------------------------
 * Saved records keep only experienceId + savedAt. Reader-facing fields are
 * resolved at read time from the current approved Real Experience Registry.
 * No URL, Action Destination, shelf identity, or private data is persisted.
 * ========================================================================== */
(function (global) {
  'use strict';

  var REAL = global.V3_REAL_EXPERIENCE_REGISTRY;
  var AD = global.V3_ACTION_DESTINATION;

  function validItem(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        Object.keys(item).sort().join(',') !== 'experienceId,savedAt' ||
        typeof item.experienceId !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(item.experienceId) ||
        typeof item.savedAt !== 'string') return false;
    var parsed = new Date(item.savedAt);
    return !isNaN(parsed.getTime()) && parsed.toISOString() === item.savedAt;
  }

  function sortedItems(payload) {
    if (!payload || payload.version !== 1 || !Array.isArray(payload.items)) return [];
    return payload.items.slice().sort(function (a, b) {
      var aTime = validItem(a) ? new Date(a.savedAt).getTime() : -Infinity;
      var bTime = validItem(b) ? new Date(b.savedAt).getTime() : -Infinity;
      return bTime - aTime;
    });
  }

  /* Shelf membership authority. A saved object stays resolvable while it is
     currently approved shelf membership, independent of cover visibility
     (Shelf Abundance: cover <=3 highlight / collection <=15 membership).
     The legacy cover scan remains only as a fallback for registries that do
     not expose the membership resolver. */
  function approvedShelfFor(experienceId, asOf) {
    if (!REAL) return null;
    if (typeof REAL.shelfForExperience === 'function') {
      return REAL.shelfForExperience(experienceId, asOf);
    }
    if (!Array.isArray(REAL.SHELF_IDS) ||
        typeof REAL.deckForEmotion !== 'function') return null;
    var matches = REAL.SHELF_IDS.filter(function (shelfId) {
      var deck = REAL.deckForEmotion(shelfId, asOf);
      return Boolean(deck && Array.isArray(deck.ids) &&
        deck.ids.indexOf(experienceId) !== -1);
    });
    return matches.length === 1 ? matches[0] : null;
  }

  function unavailable(item, reason) {
    return Object.freeze({
      status: 'unavailable',
      experienceId: validItem(item) ? item.experienceId : null,
      savedAt: validItem(item) ? item.savedAt : null,
      reason: reason
    });
  }

  function resolveItem(item, asOf) {
    if (!validItem(item)) return unavailable(item, 'INVALID_SAVED_RECORD');
    if (!REAL || typeof REAL.byId !== 'function' ||
        typeof REAL.validateRecord !== 'function') {
      return unavailable(item, 'REGISTRY_UNAVAILABLE');
    }

    var record = REAL.byId(item.experienceId, asOf);
    if (!record) return unavailable(item, 'NOT_CURRENTLY_APPROVED');
    var validation = REAL.validateRecord(record, asOf);
    if (!validation || validation.pass !== true) {
      return unavailable(item, 'CURRENT_AUTHORITY_INVALID');
    }

    var shelfId = approvedShelfFor(item.experienceId, asOf);
    if (!shelfId) return unavailable(item, 'NO_CURRENT_OUTING_RELATION');

    var actions = AD && typeof AD.actionsForExperience === 'function'
      ? AD.actionsForExperience(record) : [];
    var primaryCount = actions.filter(function (action) {
      return action && action.kind === 'primary';
    }).length;
    if (primaryCount !== 1) return unavailable(item, 'PRIMARY_ACTION_UNAVAILABLE');

    return Object.freeze({
      status: 'actionable',
      experienceId: item.experienceId,
      savedAt: item.savedAt,
      shelfId: shelfId,
      title: record.title,
      type: record.type,
      place: record.placeDetail && record.placeDetail.access
        ? record.placeDetail.access.address : null
    });
  }

  function resolveAll(payload, asOf) {
    return sortedItems(payload).map(function (item) {
      return resolveItem(item, asOf);
    });
  }

  global.V3_INTERESTED_RETRIEVAL = Object.freeze({
    sortedItems: sortedItems,
    resolveItem: resolveItem,
    resolveAll: resolveAll
  });
})(window);
