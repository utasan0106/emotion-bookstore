'use strict';
const assert = require('node:assert/strict');
const { validateRenderedFonts } = require('./editorial-type-font-contract.cjs');
const font = { glyphCount: 12, isCustomFont: true, postScriptName: 'NotoSansJP-Thin' };
const good = () => ({ family: 'DeskSans, sans-serif', fonts: [{ ...font }] });

assert.equal(validateRenderedFonts([good(), good()]), true, 'consistent chosen font passes');
assert.equal(validateRenderedFonts([]), false, 'no collected evidence fails');
assert.equal(validateRenderedFonts([{ family: 'DeskSans', fonts: [] }]), false, 'no actual glyph evidence fails');
assert.equal(validateRenderedFonts([{ ...good(), family: 'serif' }]), false, 'wrong CSS family fails');
assert.equal(validateRenderedFonts([{ ...good(), family: 'OtherDeskSans, sans-serif' }]), false, 'substring family match fails');
assert.equal(validateRenderedFonts([{ ...good(), fonts: [{ ...font, isCustomFont: false }] }]), false, 'system fallback fails');
assert.equal(validateRenderedFonts([{ ...good(), fonts: [{ ...font, postScriptName: 'ShipporiMincho-Medium' }] }]), false, 'obsolete chosen face fails');
assert.equal(validateRenderedFonts([{ ...good(), fonts: [font, { glyphCount: 1, isCustomFont: false, postScriptName: 'WenQuanYiZenHei' }] }]), false, 'a single fallback glyph fails');
assert.equal(validateRenderedFonts([{ ...good(), fonts: [{ ...font, glyphCount: 0 }] }]), false, 'zero glyph count is not evidence');
console.log('PASS 9 font-contract unit cases (no browser executed).');
