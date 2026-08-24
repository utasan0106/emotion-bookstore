/* =============================================================================
 * V3 Interested entrance cue — standalone local-only marker
 * -----------------------------------------------------------------------------
 * The Interested v1 payload remains unchanged. This marker stores only the last
 * displayed experienceId and timestamps so a newer save is surfaced once on a
 * later Entrance visit. No title, note, URL, private text, or network call.
 * ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'v3-interested-entrance-cue-v1';
  var memory = null;

  function validId(value) {
    return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
  }

  function validIso(value) {
    if (typeof value !== 'string') return false;
    var parsed = new Date(value);
    return !isNaN(parsed.getTime()) && parsed.toISOString() === value;
  }

  function empty() {
    return { version: 1, experienceId: null, savedAt: null, shownAt: null };
  }

  function sanitize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).sort().join(',') !== 'experienceId,savedAt,shownAt,version' ||
        value.version !== 1 || !validId(value.experienceId) ||
        !validIso(value.savedAt) || !validIso(value.shownAt)) return empty();
    return {
      version: 1,
      experienceId: value.experienceId,
      savedAt: value.savedAt,
      shownAt: value.shownAt
    };
  }

  function load() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(KEY);
      return raw ? sanitize(JSON.parse(raw)) : empty();
    } catch (error) {
      return memory ? sanitize(memory) : empty();
    }
  }

  function markShown(experienceId, savedAt) {
    if (!validId(experienceId) || !validIso(savedAt)) return false;
    var next = {
      version: 1,
      experienceId: experienceId,
      savedAt: savedAt,
      shownAt: new Date().toISOString()
    };
    memory = next;
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
    markShown: markShown
  });
})(window);
