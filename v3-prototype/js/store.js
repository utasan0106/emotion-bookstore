/* =============================================================================
 * V3 Isolated UX Prototype — local state store
 * -----------------------------------------------------------------------------
 * prototype 専用の IndexedDB（database 名も store 名も v3-prototype 固有）。
 * 本番の storage key / storage format には一切触れない。
 * 保存先は端末内のみ。network 送信は 0。
 * IndexedDB が使えない環境（file:// 等）では in-memory にフォールバックする。
 * ========================================================================== */
(function (global) {
  'use strict';

  var DB_NAME = 'v3-prototype-db';
  var DB_VERSION = 1;
  var STORE_NAME = 'state';
  var STATE_KEY = 'session';
  var INTERESTED_KEY = 'interested-experiences-v1';

  var memory = null;      // フォールバック用
  var dbPromise = null;

  function emptyState() {
    return {
      emotion: null,
      deck: null,           // { mode, ids, index, decisions, facets }
      selectedId: null,
      plan: null,           // { when, date, time, experienceId, status }
      traceFacets: [],
      recentIds: []
    };
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var req;
      try {
        if (!global.indexedDB) { resolve(null); return; }
        req = global.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        resolve(null);
        return;
      }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
      req.onblocked = function () { resolve(null); };
    });
    return dbPromise;
  }

  function load() {
    return openDb().then(function (db) {
      if (!db) return memory ? clone(memory) : emptyState();
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var req = tx.objectStore(STORE_NAME).get(STATE_KEY);
        req.onsuccess = function () { resolve(req.result ? req.result : emptyState()); };
        req.onerror = function () { resolve(emptyState()); };
      });
    });
  }

  function save(state) {
    memory = clone(state);
    return openDb().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(clone(state), STATE_KEY);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    });
  }

  function emptyInterested() {
    return { version: 1, items: [] };
  }

  function validExperienceId(value) {
    return typeof value === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
  }

  function validIsoDate(value) {
    if (typeof value !== 'string') return false;
    var parsed = new Date(value);
    return !isNaN(parsed.getTime()) && parsed.toISOString() === value;
  }

  /* Malformed top-level payloads fail closed to empty. Structurally invalid
     items are discarded; valid allowlisted records keep their first timestamp. */
  function sanitizeInterested(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        value.version !== 1 || !Array.isArray(value.items) ||
        Object.keys(value).sort().join(',') !== 'items,version') {
      return emptyInterested();
    }
    var seen = {};
    var items = value.items.filter(function (item) {
      if (!item || typeof item !== 'object' || Array.isArray(item) ||
          Object.keys(item).sort().join(',') !== 'experienceId,savedAt' ||
          !validExperienceId(item.experienceId) || !validIsoDate(item.savedAt) ||
          seen[item.experienceId]) return false;
      seen[item.experienceId] = true;
      return true;
    }).map(function (item) {
      return { experienceId: item.experienceId, savedAt: item.savedAt };
    });
    return { version: 1, items: items };
  }

  function loadInterested() {
    return openDb().then(function (db) {
      if (!db) return emptyInterested();
      return new Promise(function (resolve) {
        var settled = false;
        function finish(value) {
          if (settled) return;
          settled = true;
          resolve(value);
        }
        try {
          var tx = db.transaction(STORE_NAME, 'readonly');
          var req = tx.objectStore(STORE_NAME).get(INTERESTED_KEY);
          req.onsuccess = function () { finish(sanitizeInterested(req.result)); };
          req.onerror = function () { finish(emptyInterested()); };
          tx.onerror = function () { finish(emptyInterested()); };
          tx.onabort = function () { finish(emptyInterested()); };
        } catch (error) {
          finish(emptyInterested());
        }
      });
    });
  }

  function writeInterested(transform) {
    return openDb().then(function (db) {
      if (!db) return { ok: false, reason: 'INDEXEDDB_UNAVAILABLE', value: null };
      return new Promise(function (resolve) {
        var settled = false;
        var next = null;
        function finish(result) {
          if (settled) return;
          settled = true;
          resolve(result);
        }
        try {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          var store = tx.objectStore(STORE_NAME);
          var req = store.get(INTERESTED_KEY);
          req.onsuccess = function () {
            try {
              next = sanitizeInterested(transform(sanitizeInterested(req.result)));
              store.put(clone(next), INTERESTED_KEY);
            } catch (error) {
              try { tx.abort(); } catch (abortError) {
                finish({ ok: false, reason: 'TRANSACTION_ABORT', value: null });
              }
            }
          };
          req.onerror = function () {
            try { tx.abort(); } catch (error) {
              finish({ ok: false, reason: 'TRANSACTION_ERROR', value: null });
            }
          };
          tx.oncomplete = function () {
            finish({ ok: true, reason: null, value: clone(next || emptyInterested()) });
          };
          tx.onerror = function () {
            finish({ ok: false, reason: 'TRANSACTION_ERROR', value: null });
          };
          tx.onabort = function () {
            finish({ ok: false, reason: 'TRANSACTION_ABORT', value: null });
          };
        } catch (error) {
          finish({ ok: false, reason: 'TRANSACTION_ERROR', value: null });
        }
      });
    });
  }

  function saveInterested(experienceId) {
    if (!validExperienceId(experienceId)) {
      return Promise.resolve({ ok: false, reason: 'INVALID_EXPERIENCE_ID', value: null });
    }
    return writeInterested(function (current) {
      var exists = current.items.some(function (item) {
        return item.experienceId === experienceId;
      });
      if (!exists) {
        current.items.push({ experienceId: experienceId, savedAt: new Date().toISOString() });
      }
      return current;
    });
  }

  function removeInterested(experienceId) {
    if (!validExperienceId(experienceId)) {
      return Promise.resolve({ ok: false, reason: 'INVALID_EXPERIENCE_ID', value: null });
    }
    return writeInterested(function (current) {
      current.items = current.items.filter(function (item) {
        return item.experienceId !== experienceId;
      });
      return current;
    });
  }

  function clear() {
    memory = null;
    return openDb().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(STATE_KEY);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  global.V3_STORE = {
    emptyState: emptyState,
    emptyInterested: emptyInterested,
    load: load,
    save: save,
    clear: clear,
    loadInterested: loadInterested,
    saveInterested: saveInterested,
    removeInterested: removeInterested,
    INTERESTED_KEY: INTERESTED_KEY
  };
})(window);
