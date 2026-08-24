/* =============================================================================
 * V3 Interested entrance cue — standalone local-only marker
 * -----------------------------------------------------------------------------
 * The Interested v1 payload remains unchanged. This marker stores only the
 * savedAt timestamp last acknowledged on Entrance so a newer save is surfaced
 * once on a later visit. No item identity, content, or network call.
 * ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'entrance-cue-ack-v1';
  var LEGACY_KEY = 'v3-interested-entrance-cue-v1';
  var memory = null;

  function validIso(value) {
    if (typeof value !== 'string') return false;
    var parsed = new Date(value);
    return !isNaN(parsed.getTime()) && parsed.toISOString() === value;
  }

  function empty() {
    return { version: 1, acknowledgedSavedAt: null };
  }

  function sanitize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).sort().join(',') !== 'acknowledgedSavedAt,version' ||
        value.version !== 1 || !validIso(value.acknowledgedSavedAt)) return empty();
    return {
      version: 1,
      acknowledgedSavedAt: value.acknowledgedSavedAt
    };
  }

  function discardLegacyMarker() {
    try {
      if (global.localStorage) global.localStorage.removeItem(LEGACY_KEY);
    } catch (error) {
      /* The retired marker is ignored when storage removal is unavailable. */
    }
  }

  function load() {
    discardLegacyMarker();
    try {
      var raw = global.localStorage && global.localStorage.getItem(KEY);
      return raw ? sanitize(JSON.parse(raw)) : (memory ? sanitize(memory) : empty());
    } catch (error) {
      return memory ? sanitize(memory) : empty();
    }
  }

  function shouldShow(savedAt, marker) {
    if (!validIso(savedAt)) return false;
    var acknowledged = marker && marker.acknowledgedSavedAt;
    return !validIso(acknowledged) || savedAt > acknowledged;
  }

  function acknowledge(savedAt) {
    if (!validIso(savedAt)) return false;
    var next = {
      version: 1,
      acknowledgedSavedAt: savedAt
    };
    memory = next;
    discardLegacyMarker();
    try {
      if (!global.localStorage) return false;
      global.localStorage.setItem(KEY, JSON.stringify(next));
      return true;
    } catch (error) {
      return false;
    }
  }

  global.V3_ENTRANCE_CUE_STORE = Object.freeze({
    KEY: KEY,
    empty: empty,
    load: load,
    shouldShow: shouldShow,
    acknowledge: acknowledge
  });
})(window);
