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
    load: load,
    save: save,
    clear: clear
  };
})(window);
