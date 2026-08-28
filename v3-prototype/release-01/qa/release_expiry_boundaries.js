#!/usr/bin/env node
/* 期限の境目を1本の表として固定する。
 *
 * ここで守りたいこと:
 *  - 東京 flagship は日付で閉じない（evergreen に finite expiry を戻さない）。
 *  - いちばん早く切れるのは高円寺の阿波おどりで、その1分前までは GO。
 *  - その瞬間からは FAIL し、理由として当該 id が名指しされる。
 *
 * preflight を実際に起動して判定させる。preflight 自身のロジックは複製しない。
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const PREFLIGHT = path.join(__dirname, 'release_preflight.js');
const ROOT = path.resolve(__dirname, '..');

function run(at) {
  try {
    return { code: 0, out: execFileSync('node', [PREFLIGHT, '--at', at], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const failures = [];
const expect = (label, ok, detail) => { if (!ok) failures.push(`${label}${detail === undefined ? '' : ' :: ' + detail}`); };

/* 1. evergreen は finite expiry を持たない ------------------------------- */
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'release_content.js'), 'utf8'), sandbox);
for (const shelf of sandbox.window.V3_RELEASE_CONTENT.shelves) {
  for (const o of shelf.objects) {
    if (o.mode === 'evergreen' && o.expiresAt) {
      expect(`evergreen_has_no_finite_expiry ${shelf.id}/${o.id}`, false, String(o.expiresAt));
    }
  }
}
const tokyo = sandbox.window.V3_RELEASE_CONTENT.shelves.find((s) => s.id === 'tokyo');
expect('tokyo_shelf_carries_no_expiry_at_all',
  tokyo.objects.every((o) => !o.expiresAt),
  tokyo.objects.filter((o) => o.expiresAt).map((o) => o.id).join(','));

/* 2. 旧 Pilot 由来の 8/30 16:00 では、まだ何も切れていない --------------- */
const at1600 = run('2026-08-30T16:00:00+09:00');
expect('preflight_GO_at_2026-08-30T16:00+09:00', at1600.code === 0 && /RELEASE_PREFLIGHT_GO/.test(at1600.out), at1600.out.trim().split('\n')[0]);
expect('tokyo_not_named_at_1600', !/manuscript-cafe/.test(at1600.out));

/* 3. 高円寺の阿波おどりが切れる1分前まで GO ------------------------------ */
const at1959 = run('2026-08-30T19:59:00+09:00');
expect('preflight_GO_at_2026-08-30T19:59+09:00', at1959.code === 0 && /RELEASE_PREFLIGHT_GO/.test(at1959.out), at1959.out.trim().split('\n')[0]);

/* 4. その瞬間から FAIL し、理由は阿波おどり ------------------------------ */
for (const at of ['2026-08-30T20:00:00+09:00', '2026-08-30T20:01:00+09:00', '2026-08-31T09:00:00+09:00']) {
  const r = run(at);
  expect(`preflight_FAIL_at_${at}`, r.code !== 0 && /RELEASE_PREFLIGHT_FAIL/.test(r.out), r.out.trim().split('\n')[0]);
  expect(`fail_names_koenji_awaodori_at_${at}`, /koenji\/koenji-awaodori-2026/.test(r.out));
  expect(`tokyo_never_the_reason_at_${at}`, !/manuscript-cafe/.test(r.out));
}

if (failures.length) {
  console.error('RELEASE_EXPIRY_BOUNDARIES_FAIL');
  failures.forEach((f) => console.error('- ' + f));
  process.exit(1);
}
console.log('RELEASE_EXPIRY_BOUNDARIES_GO');
console.log('tokyo=no expiry; 2026-08-30 16:00 GO; 19:59 GO; 20:00 FAIL (koenji/koenji-awaodori-2026)');
