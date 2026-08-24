/* =============================================================================
 * V3 Sprint 03 — local-only interested Experience persistence contract
 * 実行: node verify/sprint03_interested.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const storeSource = fs.readFileSync(path.join(SRC, 'js/store.js'), 'utf8');
const appSource = fs.readFileSync(path.join(SRC, 'js/app.js'), 'utf8');
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createFakeIndexedDb() {
  const data = new Map();
  let failure = null;
  const db = {
    objectStoreNames: { contains() { return true; } },
    createObjectStore() {},
    transaction(name, mode) {
      const tx = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        aborted: false,
        abort() {
          if (tx.aborted) return;
          tx.aborted = true;
          setImmediate(() => tx.onabort && tx.onabort());
        },
        objectStore() {
          return {
            get(key) {
              const req = { onsuccess: null, onerror: null, result: undefined };
              setImmediate(() => {
                if (tx.aborted) return;
                req.result = clone(data.get(key));
                if (req.onsuccess) req.onsuccess();
                if (mode === 'readonly') {
                  setImmediate(() => tx.oncomplete && tx.oncomplete());
                }
              });
              return req;
            },
            put(value, key) {
              setImmediate(() => {
                if (tx.aborted) return;
                const activeFailure = failure;
                failure = null;
                if (activeFailure === 'error') {
                  if (tx.onerror) tx.onerror();
                  return;
                }
                if (activeFailure === 'abort') {
                  tx.aborted = true;
                  if (tx.onabort) tx.onabort();
                  return;
                }
                data.set(key, clone(value));
                if (tx.oncomplete) tx.oncomplete();
              });
              return {};
            },
            delete(key) {
              setImmediate(() => {
                data.delete(key);
                if (tx.oncomplete) tx.oncomplete();
              });
            }
          };
        }
      };
      return tx;
    }
  };
  return {
    data,
    failNext(value) { failure = value; },
    open() {
      const req = { onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null, result: db };
      setImmediate(() => req.onsuccess && req.onsuccess());
      return req;
    }
  };
}

function loadStore(indexedDB) {
  const window = { indexedDB, Promise, Date, JSON, Object, Array, RegExp, isNaN };
  vm.runInNewContext(storeSource, { window, Promise, Date, JSON, Object, Array, RegExp, isNaN }, {
    filename: 'store.js'
  });
  return window.V3_STORE;
}

(async function run() {
  const fake = createFakeIndexedDb();
  const store = loadStore(fake);
  const empty = await store.loadInterested();
  check('empty -> valid empty payload', JSON.stringify(empty) === JSON.stringify({ version: 1, items: [] }));

  const first = await store.saveInterested('EXP_001');
  check('empty -> save EXP_001 -> durable success', first.ok === true && first.value.items.length === 1 &&
    first.value.items[0].experienceId === 'EXP_001');
  const firstSavedAt = first.value.items[0].savedAt;
  check('savedAt is generated ISO-8601', new Date(firstSavedAt).toISOString() === firstSavedAt);

  const repeat = await store.saveInterested('EXP_001');
  check('save EXP_001 again -> one record', repeat.ok === true && repeat.value.items.length === 1);
  check('idempotent repeat preserves original savedAt', repeat.value.items[0].savedAt === firstSavedAt);

  const second = await store.saveInterested('EXP_007');
  check('save EXP_007 -> both exist', second.ok === true &&
    JSON.stringify(second.value.items.map((item) => item.experienceId)) === JSON.stringify(['EXP_001', 'EXP_007']));

  const reloadedStore = loadStore(fake);
  const reloaded = await reloadedStore.loadInterested();
  check('reload/new store read -> persisted', JSON.stringify(reloaded) === JSON.stringify(second.value));

  const removed = await reloadedStore.removeInterested('EXP_001');
  check('remove EXP_001 -> only EXP_007', removed.ok === true && removed.value.items.length === 1 &&
    removed.value.items[0].experienceId === 'EXP_007');
  const missing = await reloadedStore.removeInterested('EXP_999');
  check('remove missing ID -> safe/idempotent', missing.ok === true &&
    JSON.stringify(missing.value) === JSON.stringify(removed.value));

  fake.failNext('error');
  const errorResult = await reloadedStore.removeInterested('EXP_007');
  check('transaction error -> no durable success', errorResult.ok === false && errorResult.reason === 'TRANSACTION_ERROR');
  check('transaction error retains previous durable data', (await reloadedStore.loadInterested()).items[0].experienceId === 'EXP_007');

  fake.failNext('abort');
  const abortResult = await reloadedStore.saveInterested('EXP_001');
  check('transaction abort -> no durable success', abortResult.ok === false && abortResult.reason === 'TRANSACTION_ABORT');
  check('transaction abort does not add record', (await reloadedStore.loadInterested()).items.length === 1);

  const unavailable = loadStore(undefined);
  const unavailableResult = await unavailable.saveInterested('EXP_001');
  check('IndexedDB unavailable -> no durable-success claim', unavailableResult.ok === false &&
    unavailableResult.reason === 'INDEXEDDB_UNAVAILABLE');

  fake.data.set(store.INTERESTED_KEY, {
    version: 1,
    items: [{ experienceId: 'EXP_001', savedAt: firstSavedAt }],
    unexpected: 'synthetic-placeholder'
  });
  const malformedStore = loadStore(fake);
  const malformed = await malformedStore.loadInterested();
  check('malformed stored payload -> safe empty valid list', JSON.stringify(malformed) === JSON.stringify({ version: 1, items: [] }));

  fake.data.set(store.INTERESTED_KEY, clone(second.value));
  const persisted = fake.data.get(store.INTERESTED_KEY);
  check('persisted top-level allowlist exact', JSON.stringify(Object.keys(persisted).sort()) === JSON.stringify(['items', 'version']));
  check('persisted item allowlist exact', persisted.items.every((item) =>
    JSON.stringify(Object.keys(item).sort()) === JSON.stringify(['experienceId', 'savedAt'])));
  const serialized = JSON.stringify(persisted);
  check('prohibited private/Product fields absent', !/(emotion|title|creator|reason|visual|image|action|destination|trace|location|commercial|affiliate|user|device)/i.test(serialized), serialized);
  check('separate key; existing session object untouched', store.INTERESTED_KEY === 'interested-experiences-v1' &&
    !fake.data.has('session'));

  check('UI waits for durable result before decision', appSource.indexOf("result.ok !== true") <
    appSource.indexOf('interested = result.value'));
  check('failed save explicitly remains unsaved', appSource.includes('気になる状態にはしていません'));
  check('failed remove explicitly retains saved UI', appSource.includes('保存済みの状態を保ちます'));
  check('saved and unsaved states are perceivable in concise text',
    appSource.includes("return isInterested(id) ? '保存済み' : '気になる'"));
  check('saved state exposed semantically', appSource.includes("'aria-pressed': isInterested") &&
    appSource.includes("'data-interest-state': isInterested"));
  check('existing Interested architecture is bound; no new saved screen',
    appSource.includes('toggleInterested(experience.id)') &&
    appSource.includes("class: 'interested-layer'") &&
    !/go\(['\"]saved-items['\"]/.test(appSource));
  check('rehydration loads session and interested key together',
    appSource.includes('Promise.all([STORE.load(), STORE.loadInterested()])'));
  check('keyboard accessible native button retained', appSource.includes("class: 'btn btn-solid', type: 'button'"));

  check('V3 database/store exact', storeSource.includes("var DB_NAME = 'v3-prototype-db'") &&
    storeSource.includes("var STORE_NAME = 'state'") && storeSource.includes("var INTERESTED_KEY = 'interested-experiences-v1'"));
  check('no local/session storage or cookies', !/localStorage|sessionStorage|document\.cookie/.test(storeSource + appSource));
  check('save/remove network and analytics = 0', !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|\bgtag\s*\(/.test(storeSource + appSource));
  check('no geolocation/external AI', !/navigator\s*\.\s*geolocation|api\.openai|anthropic|generativelanguage/i.test(storeSource + appSource));

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
