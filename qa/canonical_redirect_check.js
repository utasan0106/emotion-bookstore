#!/usr/bin/env node
'use strict';

// Source-contract check by default; --live checks actual HTTP responses.
// This is deliberately NOT a substitute for Vercel's route compiler or preview QA.
// Vercel sourceToRegex uses strict:true. A segment wildcard /:path* misses
// root and trailing-slash paths; a named .* capture includes both.
// https://github.com/vercel/vercel/blob/main/packages/routing-utils/src/superstatic.ts
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
const legacy = 'emotion-bookstore.vercel.app';
const canonical = 'https://emotionbookstore.com';
const rule = config.redirects[0];
assert.equal(rule.source, '/:path(.*)');
assert.equal(rule.destination, canonical + '/:path');
assert.equal(rule.permanent, true);
assert.deepEqual(rule.has, [{ type: 'host', value: legacy }]);
assert.ok(!rule.missing);

const cases = [
  '/', '/?ref=canonical-check', '/index.html',
  '/discover/', '/discover/essays/', '/discover/essays/?ref=canonical-check',
  '/discover/essays', '/discover/essays/index.html', '/discover/koenji/book.html',
  '/site-system.css', '/release.js', '/sitemap.xml',
  '/shelf.html?shelf=koenji&ref=canonical-check',
  '/not-existing-route', '/not-existing-route/',
];
console.log('PASS: canonical redirect source contract; host-scoped, permanent, first in order.');

async function live() {
  const failures = [];
  for (const pathname of cases) {
    const response = await fetch('https://' + legacy + pathname, {
      method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    const location = response.headers.get('location');
    const expected = canonical + pathname;
    if (response.status !== 308 || location !== expected) {
      failures.push(`${pathname}: ${response.status} ${location}; expected 308 ${expected}`);
    }
  }
  for (const pathname of ['/', '/discover/essays/', '/site-system.css']) {
    const response = await fetch(canonical + pathname, {
      method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 200 || response.headers.has('location')) {
      failures.push(`Canonical ${pathname}: expected 200 without redirect; got ${response.status}`);
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
  console.log(`PASS: ${cases.length} live legacy path/query redirects; 3 canonical responses without loops.`);
}

if (process.argv.includes('--live')) {
  live().catch(error => { console.error(error); process.exitCode = 1; });
} else {
  console.log('PENDING: exact Vercel compiler, deployed HTTP redirects, and rendered browser stylesheet checks.');
}
