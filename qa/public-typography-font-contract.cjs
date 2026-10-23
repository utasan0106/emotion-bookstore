'use strict';

// Pure evidence validation shared by the future browser run and offline fixtures.
// A CSS family name, document.fonts.check(), or an empty CDP result is not proof.
const assert = require('node:assert/strict');
const FAMILY = 'EB Public Gothic';
const POSTSCRIPT = Object.freeze({400: 'EBPublicGothic-Regular', 700: 'EBPublicGothic-Bold'});
const FONT_FILES = Object.freeze({400: '/assets/fonts/public-gothic/eb-public-gothic-400.woff2', 700: '/assets/fonts/public-gothic/eb-public-gothic-700.woff2'});
const ROLE_WEIGHTS = Object.freeze({h1: 700, cardHeading: 700, body: 400, nav: 700, eventDate: 700, detailDate: 400, noscriptEvent: 400});

function isReadable(character) {
  // Includes Japanese, Latin/Greek letters, numbers and combining marks. In
  // particular 鷗, ō and β can NEVER enter the symbol-fallback allowance.
  return /[\p{L}\p{N}\p{M}]/u.test(character);
}

function fallbackCategory(character) {
  // U+FF5E is Unicode Sm but functions as punctuation in these existing titles.
  // Keep the title dash/wave separate from arrows, weather and interface icons.
  return character === '―' || character === '～' || /\p{P}/u.test(character) ? 'punctuation' : 'arrow-weather-or-ui-symbol';
}

function allowedSymbolCodepoints(coverage) {
  assert.equal(coverage.family, FAMILY, 'The coverage manifest is for this family');
  assert.deepEqual(coverage.weights, [400, 700], 'Both real weights are covered');
  for (const weight of [400, 700]) {
    const font = coverage.fonts.find(item => item.weight === weight);
    assert.equal(font && font.postscript_name, POSTSCRIPT[weight], 'Pinned binary PostScript identity: ' + weight);
  }
  return coverage.upstream_unsupported_codepoints.filter(codepoint => {
    const character = String.fromCodePoint(codepoint);
    return !isReadable(character) && /[\p{P}\p{S}]/u.test(character);
  });
}

function splitTextRuns(text, allowedCodepoints) {
  const allowed = new Set(allowedCodepoints);
  const runs = [];
  for (const character of text) {
    const kind = /\s/u.test(character) ? 'space' : isReadable(character) ? 'readable' :
      allowed.has(character.codePointAt(0)) ? 'allowed-symbol-fallback' : 'supported-symbol';
    const previous = runs[runs.length - 1];
    if (previous && previous.kind === kind && (kind !== 'allowed-symbol-fallback' || previous.fallbackCategory === fallbackCategory(character))) previous.text += character;
    else runs.push({text: character, kind, ...(kind === 'allowed-symbol-fallback' ? {fallbackCategory: fallbackCategory(character)} : {})});
  }
  return runs;
}

function firstFamily(family) {
  return String(family || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
}

function assertStyle(style, expectedWeight, label) {
  assert.equal(firstFamily(style.family), FAMILY, label + ': computed primary family');
  assert.equal(Number(style.weight), expectedWeight, label + ': computed real weight');
  assert.equal(style.fontSynthesis, 'none', label + ': no synthesized weight/style');
}

function assertRenderedSamples(samples, {requiredRoles, allowedCodepoints = []}) {
  assert.ok(Array.isArray(samples) && samples.length > 0, 'Nonempty rendered sample evidence is required');
  const roles = new Set(), allowed = new Set(allowedCodepoints);
  let readableRuns = 0, readableGlyphs = 0;
  for (const sample of samples) {
    assert.ok(Object.hasOwn(ROLE_WEIGHTS, sample.role), 'Known sample role');
    assert.ok(!roles.has(sample.role), 'One transparent first-visible sample per role');
    roles.add(sample.role);
    const expectedWeight = ROLE_WEIGHTS[sample.role];
    assertStyle(sample.style, expectedWeight, sample.role);
    assert.equal(sample.textAfter, sample.textBefore, sample.role + ': probing must preserve all original text');
    assert.ok(Array.isArray(sample.runs) && sample.runs.length > 0, sample.role + ': nonempty text runs');
    assert.equal(sample.runs.map(run => run.text).join(''), sample.sourceText, sample.role + ': no omitted sample characters');
    let sampleReadable = 0;
    for (const run of sample.runs) {
      assert.ok(typeof run.text === 'string' && run.text.length > 0, 'Nonempty source run');
      const expectedRuns = splitTextRuns(run.text, allowedCodepoints);
      assert.equal(expectedRuns.length, 1, 'A probe cannot mix readable text and fallback symbols');
      assert.equal(expectedRuns[0].kind, run.kind, 'The reported classification must match the actual characters');
      if (run.kind === 'space') continue;
      assert.equal(run.visible, true, sample.role + ': probe is actually in the painted viewport');
      assertStyle(run, expectedWeight, sample.role + ' ' + JSON.stringify(run.text));
      assert.ok(Array.isArray(run.fonts) && run.fonts.length > 0, sample.role + ': nonempty CDP platform-font evidence');
      assert.ok(run.fonts.every(font => Number.isFinite(font.glyphCount) && font.glyphCount > 0), 'Every reported font has actual rendered glyphs');
      if (run.kind === 'allowed-symbol-fallback') {
        assert.ok([...run.text].every(character => allowed.has(character.codePointAt(0)) && !isReadable(character)), 'Only exact manifest-listed non-readable symbols may fall back');
      } else {
        assert.ok(run.fonts.every(font => font.isCustomFont === true && font.postScriptName === POSTSCRIPT[expectedWeight]),
          sample.role + ': actual glyphs must use ' + POSTSCRIPT[expectedWeight] + ', not a fallback: ' + JSON.stringify(run.fonts));
      }
      if (run.kind === 'readable') {
        sampleReadable++;
        readableRuns++;
        readableGlyphs += run.fonts.reduce((sum, font) => sum + font.glyphCount, 0);
      }
    }
    assert.ok(sampleReadable > 0, sample.role + ': a symbol-only or empty sample is not readable-font evidence');
  }
  for (const role of requiredRoles) assert.ok(roles.has(role), 'Required visible role: ' + role);
  assert.ok(readableRuns > 0 && readableGlyphs > 0, 'Non-vacuous actual rendered text evidence');
  return {roles: [...roles], readableRuns, readableGlyphs};
}

function assertLocalFontRequests(requests) {
  for (const pathname of Object.values(FONT_FILES)) {
    assert.ok(requests.some(request => request.pathname === pathname && request.finished === true && request.status >= 200 && request.status < 300),
      'A completed successful local font request is required: ' + pathname);
    assert.ok(!requests.some(request => request.pathname === pathname && (request.failed || request.status >= 400)),
      'No failed request for required font: ' + pathname);
  }
}

module.exports = {FAMILY, POSTSCRIPT, FONT_FILES, ROLE_WEIGHTS, isReadable, fallbackCategory, allowedSymbolCodepoints, splitTextRuns, firstFamily, assertStyle, assertRenderedSamples, assertLocalFontRequests};
