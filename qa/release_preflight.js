#!/usr/bin/env node
/* Release preflight — 期限切れの current を公開させないための門。
 *
 *   node qa/release_preflight.js            … いまの時刻で判定
 *   node qa/release_preflight.js --at <ISO> … 指定時刻で判定（負のテスト用）
 *
 * now >= expiresAt の current が1件でもあれば FAIL する。
 * client 側で黙って別の Object へ差し替えることはしない。差し替えは人の編集。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const atIndex = args.indexOf('--at');
const now = atIndex === -1 ? new Date() : new Date(args[atIndex + 1]);
if (isNaN(now.getTime())) {
  console.error('RELEASE_PREFLIGHT_FAIL');
  console.error('- --at must be a parsable ISO 8601 timestamp');
  process.exit(1);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'release_content.js'), 'utf8'), sandbox);
const CONTENT = sandbox.window.V3_RELEASE_CONTENT;

const expired = [];
const missing = [];
const live = [];

for (const shelf of (CONTENT && CONTENT.shelves) || []) {
  for (const o of shelf.objects) {
    if (o.mode !== 'current') {
      if (o.expiresAt && Date.parse(o.expiresAt) <= now.getTime()) {
        // evergreen でも期限を持たせているものは同じ扱いにする。
        expired.push({ shelf: shelf.id, id: o.id, expiresAt: o.expiresAt });
      }
      continue;
    }
    if (!o.verifiedAt || !o.expiresAt) { missing.push({ shelf: shelf.id, id: o.id }); continue; }
    const at = Date.parse(o.expiresAt);
    if (isNaN(at)) { missing.push({ shelf: shelf.id, id: o.id }); continue; }
    if (at <= now.getTime()) expired.push({ shelf: shelf.id, id: o.id, expiresAt: o.expiresAt });
    else live.push({ shelf: shelf.id, id: o.id, expiresAt: o.expiresAt });
  }
}

if (missing.length || expired.length) {
  console.error('RELEASE_PREFLIGHT_FAIL');
  console.error(`- judged at ${now.toISOString()}`);
  missing.forEach((x) => console.error(`- ${x.shelf}/${x.id}: current requires verifiedAt and a parsable expiresAt`));
  expired.forEach((x) => console.error(`- ${x.shelf}/${x.id}: expired at ${x.expiresAt}. Human editorial replacement required; the shelf stays closed until then.`));
  process.exit(1);
}

console.log('RELEASE_PREFLIGHT_GO');
console.log(`judged at ${now.toISOString()}`);
live
  .sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt))
  .forEach((x) => console.log(`  ${x.shelf}/${x.id} expires ${x.expiresAt}`));
