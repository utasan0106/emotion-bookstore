#!/usr/bin/env node
/* 期限の境目を1本の表として固定する。
 *
 * 守りたいのは特定の会期ではなく、次の3つ:
 *   - 日付に依存しない事実（evergreen）に finite expiry を持たせないこと
 *   - 東京 flagship が日付で閉じないこと
 *   - いちばん早く切れるものの境目が、本当にその1分の間にあること
 *
 * だから対象は release_content.js から実行時に導出する。id や日付をここへ
 * 書くと、content を差し替えた瞬間に落ちて、product の欠陥と fixture の
 * 賞味期限切れを判定者が区別できなくなる。
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
const iso = (ms) => new Date(ms).toISOString();

const failures = [];
const unobserved = [];
const expect = (label, ok, detail) => {
  if (!ok) failures.push(`${label}${detail === undefined ? '' : ' :: ' + detail}`);
};

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'release_content.js'), 'utf8'), sandbox);
const CONTENT = sandbox.window.V3_RELEASE_CONTENT;

/* 1. evergreen は finite expiry を持たない ------------------------------- */
for (const shelf of CONTENT.shelves) {
  for (const o of shelf.objects) {
    if (o.mode === 'evergreen' && o.expiresAt) {
      expect(`evergreen_has_no_finite_expiry ${shelf.id}/${o.id}`, false, String(o.expiresAt));
    }
  }
}

/* 2. 東京 flagship は日付で閉じない -------------------------------------- */
const flagship = CONTENT.shelves.find((s) => s.role === 'flagship');
expect('a_flagship_shelf_exists', !!flagship);
if (flagship) {
  const dated = flagship.objects.filter((o) => o.expiresAt).map((o) => o.id);
  expect(`${flagship.id}_carries_no_expiry_at_all`, dated.length === 0, dated.join(','));
}

/* 3/4. いちばん早く切れるものの境目 -------------------------------------- */
const dated = [];
for (const shelf of CONTENT.shelves) {
  for (const o of shelf.objects) {
    if (!o.expiresAt) continue;
    const at = Date.parse(o.expiresAt);
    if (!isNaN(at)) dated.push({ shelf, object: o, at });
  }
}
dated.sort((a, b) => a.at - b.at);
const soonest = dated[0];

if (!soonest) {
  // 期限を持つ object が content に無い。境目は実物では観測できない。
  // 黙って通さず、見られなかったこととして残す。
  unobserved.push('expiry_boundary :: no object in release_content.js carries an expiresAt');
} else {
  const before = run(iso(soonest.at - 60 * 1000));
  expect(`preflight_GO_one_minute_before_${soonest.object.id}_expires`,
    before.code === 0 && /RELEASE_PREFLIGHT_GO/.test(before.out),
    before.out.trim().split('\n')[0]);

  for (const offset of [0, 60 * 1000, 24 * 3600 * 1000]) {
    const at = iso(soonest.at + offset);
    const r = run(at);
    expect(`preflight_FAIL_at_${at}`,
      r.code !== 0 && /RELEASE_PREFLIGHT_FAIL/.test(r.out), r.out.trim().split('\n')[0]);
    expect(`fail_names_${soonest.object.id}_at_${at}`,
      r.out.includes(`${soonest.shelf.id}/${soonest.object.id}`));
    if (flagship) {
      for (const o of flagship.objects) {
        expect(`${flagship.id}_never_the_reason_at_${at}`, !r.out.includes(`${flagship.id}/${o.id}`));
      }
    }
  }
}

if (failures.length) {
  console.error('RELEASE_EXPIRY_BOUNDARIES_FAIL');
  failures.forEach((f) => console.error('- ' + f));
  unobserved.forEach((u) => console.error('- NOT OBSERVABLE ' + u));
  process.exit(1);
}
console.log(`RELEASE_EXPIRY_BOUNDARIES_GO${unobserved.length ? `, ${unobserved.length} NOT OBSERVABLE` : ''}`);
if (soonest) {
  console.log(`flagship=${flagship ? flagship.id : 'n/a'} no expiry; ` +
    `soonest ${soonest.shelf.id}/${soonest.object.id} at ${soonest.object.expiresAt}; ` +
    'GO one minute before, FAIL from that instant');
}
unobserved.forEach((u) => console.log('- NOT OBSERVABLE ' + u));
