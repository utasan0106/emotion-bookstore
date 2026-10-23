'use strict';

// Dependency-free freshness gate for CI before importing/launching Playwright.
// It verifies checked-in hashes, not a replacement for fontTools cmap QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const {FAMILY, POSTSCRIPT, FONT_FILES} = require('./public-typography-font-contract.cjs');

function checkSourceIntegrity(root, {readFile = file => fs.readFileSync(file)} = {}) {
  const base = path.resolve(root), directory = 'assets/fonts/public-gothic/';
  const report = {passed: false, checks: [], limitations: [
    'Hashes verify every already-listed HTML/runtime/editorial input and .vercelignore. This Node preflight does not independently re-enumerate new delivered HTML under .vercelignore; the offline font builder/check remains the delivery-inventory gate.',
    'This is source/asset freshness evidence, not rendered-font or independent WOFF2 cmap evidence.'
  ]};
  const read = relative => {
    assert.ok(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative), 'A repository-relative input path is required');
    const resolved = path.resolve(base, relative);
    assert.ok(resolved.startsWith(base + path.sep), 'Integrity input must remain inside the checkout');
    return Buffer.from(readFile(resolved));
  };
  const verify = (relative, expectedSha256, expectedBytes) => {
    assert.match(expectedSha256 || '', /^[0-9a-f]{64}$/, 'A pinned SHA-256 is required: ' + relative);
    const bytes = read(relative), sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    report.checks.push({path: relative, bytes: bytes.length, sha256, expectedSha256, passed: sha256 === expectedSha256 && (expectedBytes === undefined || bytes.length === expectedBytes)});
    assert.equal(sha256, expectedSha256, 'Stale/changed font corpus asset: ' + relative);
    if (expectedBytes !== undefined) assert.equal(bytes.length, expectedBytes, 'Exact pinned byte count: ' + relative);
    return bytes;
  };
  try {
    const sources = JSON.parse(read(directory + 'sources.json'));
    assert.equal(sources.family, FAMILY);
    assert.equal(sources.fonts.length, 2, 'Exactly the two real font weights are pinned');
    for (const weight of [400,700]) {
      const font = sources.fonts.find(item => item.weight === weight);
      assert.ok(font, 'Pinned real font weight: ' + weight);
      assert.equal(font.postscriptName, POSTSCRIPT[weight]);
      assert.equal(directory + font.output, FONT_FILES[weight].slice(1));
      assert.ok(Number.isInteger(font.outputBytes) && font.outputBytes > 0);
      verify(directory + font.output, font.outputSha256, font.outputBytes);
    }
    verify(directory + sources.licenseFile, sources.licenseSha256);
    verify('tools/build-public-gothic-fonts.py', sources.builderSha256);
    const corpus = JSON.parse(verify(directory + 'corpus-manifest.json', sources.corpusManifestSha256));
    verify('.vercelignore', corpus.deliveryRulesSha256);
    assert.ok(Array.isArray(corpus.inputs) && corpus.inputs.length > 0, 'Nonempty recorded corpus');
    const unique = new Set();
    for (const input of corpus.inputs) {
      assert.ok(!unique.has(input.path), 'No duplicate source input: ' + input.path); unique.add(input.path);
      assert.ok(Number.isInteger(input.bytes) && input.bytes >= 0, 'Recorded corpus byte count');
      verify(input.path, input.sha256, input.bytes);
    }
    const delivered = corpus.inputs.filter(input => input.kind === 'delivered-html').map(input => input.path).sort();
    assert.deepEqual(delivered, [...corpus.deliveredHtml].sort(), 'Delivered manifest and input list agree');
    assert.equal(delivered.length, corpus.deliveredHtmlCount);
    // The browser's fallback allowance is derived, never a free-standing whitelist.
    const coverageBytes=read(directory+'coverage.json'),coverage=JSON.parse(coverageBytes);
    const upstream=new Set(sources.upstreamCodepoints);
    const wanted=[...new Set([...corpus.requiredCodepoints,...corpus.reservedKanaCodepoints.filter(codepoint=>upstream.has(codepoint))])].sort((a,b)=>a-b);
    const supported=wanted.filter(codepoint=>upstream.has(codepoint));
    const unsupported=wanted.filter(codepoint=>!upstream.has(codepoint));
    assert.equal(coverage.family,FAMILY,'Coverage family agrees with the pinned assets');
    assert.deepEqual(coverage.weights,[400,700],'Coverage contains only real weights');
    assert.deepEqual(coverage.covered_codepoints,supported,'Coverage matches required/upstream intersection');
    assert.deepEqual(coverage.upstream_unsupported_codepoints,unsupported,'Fallback allowance matches exact upstream difference');
    assert.deepEqual(coverage.fonts,sources.fonts.map(font=>({file:font.output,postscript_name:font.postscriptName,weight:font.weight})),'Coverage font identities agree');
    assert.deepEqual(coverage.upstream_unsupported.map(item=>item.codepoint),unsupported,'Fallback evidence has exactly the declared characters');
    for(const item of coverage.upstream_unsupported)assert.equal(item.character,String.fromCodePoint(item.codepoint),'Fallback character identity');
    report.checks.push({path:directory+'coverage.json',bytes:coverageBytes.length,sha256:crypto.createHash('sha256').update(coverageBytes).digest('hex'),kind:'derived coverage and explicit fallback consistency',passed:true});
    report.deliveredHtmlCount = delivered.length;
    report.corpusInputCount = corpus.inputs.length;
    report.passed = true;
    return report;
  } catch (error) {
    report.error = error.message;
    error.integrityReport = report;
    throw error;
  }
}

function checkoutIdentity(root, requestedSha = process.env.QA_SOURCE_SHA || null) {
  const result = {requestedSha, actualHead: null, verified: false, gitAvailable: false};
  try {
    result.actualHead = cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe']}).trim();
    result.gitAvailable = true;
  } catch (_) { result.note = 'No Git HEAD is available in this copy; source SHA is not verified.'; }
  if (requestedSha) {
    try {
      assert.match(requestedSha, /^[0-9a-f]{40,64}$/, 'QA_SOURCE_SHA must be an exact full lowercase commit SHA');
      assert.equal(result.actualHead, requestedSha, 'Actual git rev-parse HEAD must equal QA_SOURCE_SHA before browser launch');
      result.verified = true;
    } catch (error) { error.checkoutIdentity = result; throw error; }
  } else if (result.gitAvailable) result.note = 'Actual HEAD recorded; no QA_SOURCE_SHA was supplied for equality verification.';
  return result;
}

module.exports = {checkSourceIntegrity, checkoutIdentity};
