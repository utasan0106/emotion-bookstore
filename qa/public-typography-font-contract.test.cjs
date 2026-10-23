#!/usr/bin/env node
'use strict';

// Offline fixtures only: no Playwright import, browser, server, network or install.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {checkSourceIntegrity} = require('./public-typography-source-preflight.cjs');
const {FAMILY, POSTSCRIPT, FONT_FILES, fallbackCategory, allowedSymbolCodepoints, splitTextRuns, assertRenderedSamples, assertLocalFontRequests} = require('./public-typography-font-contract.cjs');
let count = 0;
const allowedCodepoints = [0x2197, 0x25b6];
const requiredRoles = ['h1', 'body', 'nav'];
const weights = {h1: 700, body: 400, nav: 700};
const sample = (role, text = '街の作品 ABC 2026 ↗') => {
  const weight = weights[role];
  const style = {family: FAMILY + ', sans-serif', weight: String(weight), fontSynthesis: 'none'};
  return {role, style, textBefore: text, textAfter: text, sourceText: text,
    runs: splitTextRuns(text, allowedCodepoints).map(run => ({...run, ...style, visible: true,
      fonts: run.kind === 'space' ? [] : [{isCustomFont: run.kind !== 'allowed-symbol-fallback', postScriptName: run.kind === 'allowed-symbol-fallback' ? 'DejaVuSans' : POSTSCRIPT[weight], glyphCount: [...run.text].length}]}))};
};
const good = () => requiredRoles.map(role => sample(role));
const check = (rows, passes, label) => {
  if (passes) assert.doesNotThrow(() => assertRenderedSamples(rows, {requiredRoles, allowedCodepoints}), label);
  else assert.throws(() => assertRenderedSamples(rows, {requiredRoles, allowedCodepoints}), undefined, label);
  count++;
};
check(good(), true, 'Actual regular/bold glyphs with separately allowed arrow fallback');
check([], false, 'Empty evidence cannot pass');
check(good().slice(1), false, 'Missing h1 cannot pass');
check(requiredRoles.map(role => sample(role, '↗ ▶')), false, 'All-nonreadable samples cannot pass vacuously');
for (const weight of ['500', '600', '400']) {
  const rows = good(); rows[0].style.weight = weight;
  check(rows, false, 'Wrong computed heading weight ' + weight);
}
for (const [key, value] of [['family', 'Arial'], ['fontSynthesis', 'weight']]) {
  const rows = good(); rows[0].style[key] = value;
  check(rows, false, 'Wrong root style: ' + key);
}
for (const edit of [
  run => { run.fonts = []; },
  run => { run.fonts[0].postScriptName = 'ArialMT'; run.fonts[0].isCustomFont = false; },
  run => { run.fonts[0].postScriptName = POSTSCRIPT[400]; },
  run => { run.fonts[0].glyphCount = 0; },
  run => { run.fonts.push({postScriptName: 'ArialMT', isCustomFont: false, glyphCount: 1}); },
  run => { run.visible = false; },
  run => { run.weight = '600'; },
  run => { run.fontSynthesis = 'weight'; }
]) {
  const rows = good(); edit(rows[0].runs.find(run => run.kind === 'readable'));
  check(rows, false, 'Missing/wrong/fallback/zero-glyph/hidden/synthesized actual run');
}
for (const character of ['鷗', 'ō', 'β']) {
  const rows = good(); const run = rows[0].runs[0];
  const old = run.text; run.text = character; run.kind = 'allowed-symbol-fallback';
  rows[0].sourceText = rows[0].sourceText.replace(old, character);
  check(rows, false, character + ' cannot be relabelled as a symbol');
  assert.equal(splitTextRuns(character, [character.codePointAt(0)])[0].kind, 'readable');
  count++;
}
let rows = good(); rows[0].textAfter += '削除検出'; check(rows, false, 'Original title text must be preserved');
rows = good(); rows[0].runs.pop(); check(rows, false, 'Source runs cannot be silently omitted');
rows = good(); rows.push(sample('h1')); check(rows, false, 'Duplicate roles do not improve coverage');
const manifest = {family: FAMILY, weights: [400, 700], fonts: [400, 700].map(weight => ({weight, postscript_name: POSTSCRIPT[weight]})), upstream_unsupported_codepoints: [0x2197, 0x014d, 0x03b2, 0x9dd7]};
assert.deepEqual(allowedSymbolCodepoints(manifest), [0x2197]); count++;
assert.equal(fallbackCategory('―'), 'punctuation'); count++;
assert.equal(fallbackCategory('～'), 'punctuation'); count++;
assert.equal(fallbackCategory('↗'), 'arrow-weather-or-ui-symbol'); count++;
const requests = Object.values(FONT_FILES).map(pathname => ({pathname, status: 200, finished: true}));
assert.doesNotThrow(() => assertLocalFontRequests(requests)); count++;
assert.throws(() => assertLocalFontRequests(requests.slice(1))); count++;
assert.throws(() => assertLocalFontRequests(requests.map(request => ({...request, finished: false})))); count++;
assert.throws(() => assertLocalFontRequests(requests.map(request => ({...request, status: 404})))); count++;
const root = path.resolve(__dirname, '..');
assert.ok(checkSourceIntegrity(root).passed); count++;
// In-memory read mutations only: never modify the original site, fonts or pins.
for (const suffix of ['eb-public-gothic-400.woff2', 'eb-public-gothic-700.woff2', 'OFL.txt', 'tools/build-public-gothic-fonts.py', 'corpus-manifest.json', '.vercelignore', 'works.html']) {
  assert.throws(() => checkSourceIntegrity(root, {readFile: file => {
    const value = fs.readFileSync(file);
    return file.endsWith(suffix) ? Buffer.concat([value, Buffer.from('\nchanged')]) : value;
  }}), /Stale\/changed font corpus asset/, 'Stale bytes must stop preflight before browser: ' + suffix);
  count++;
}
assert.throws(()=>checkSourceIntegrity(root,{readFile:file=>{
  const value=fs.readFileSync(file);
  if(!file.endsWith('coverage.json'))return value;
  const changed=JSON.parse(value);changed.upstream_unsupported_codepoints.push(0x65e5);
  return Buffer.from(JSON.stringify(changed));
}}),/Fallback allowance matches exact upstream difference/,'Coverage cannot broaden fallback to a supported Japanese glyph');count++;
console.log('PASS ' + count + ' public typography evidence fixtures; no browser or server executed.');
