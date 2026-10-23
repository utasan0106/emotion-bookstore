'use strict';

// This is a validation helper, not a browser renderer. Rows must be collected
// from CSS.getPlatformFontsForNode after document.fonts.ready on the real page.
// The Noto variable font's PostScript name says Thin at every selected weight;
// it must not be interpreted as the actual CSS/rendered weight.
function validateRenderedFonts(rows) {
  const expectedPostScriptName = 'NotoSansJP-Thin';
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.every(row =>
    typeof row.family === 'string' &&
    row.family.split(',')[0].trim().replace(/^["']|["']$/g, '') === 'DeskSans' &&
    Array.isArray(row.fonts) && row.fonts.length > 0 &&
    row.fonts.every(font =>
      font.glyphCount > 0 && font.isCustomFont === true &&
      font.postScriptName === expectedPostScriptName
    )
  );
}

module.exports = { validateRenderedFonts };
