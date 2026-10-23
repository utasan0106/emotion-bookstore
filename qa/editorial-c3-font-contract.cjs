'use strict';
// C3 only: inspect actual custom-font glyphs for visible direct text parents.
// Never use CSS family names or FontFaceSet alone as proof of rendered type.
const EXPECTED={400:'ZenKakuGothicNew-Regular',700:'ZenKakuGothicNew-Bold'};
function validateRenderedFonts(rows) {
  if(!Array.isArray(rows)||!rows.length) return false;
  const counts={hero:0,brand:0,bookTitle:0,body:0};
  for(const row of rows) {
    const family=typeof row.family==='string'?row.family.split(',')[0].trim().replace(/^["']|["']$/g,''):'';
    const weight=Number(row.weight), expected=EXPECTED[weight];
    if(family!=='EditorialReading'||!expected||row.fontSynthesis!=='none') return false;
    if(['hero','brand','bookTitle'].includes(row.role)&&weight!==700) return false;
    if(row.role==='body'&&weight!==400) return false;
    if(!['hero','brand','bookTitle','body','other'].includes(row.role)) return false;
    if(row.role in counts) counts[row.role]++;
    if(!Array.isArray(row.fonts)||!row.fonts.length||!row.fonts.every(font=>font.glyphCount>0&&font.isCustomFont===true&&font.postScriptName===expected)) return false;
  }
  return counts.hero>=1&&counts.brand===1&&counts.bookTitle>=6&&counts.body===3;
}
module.exports={validateRenderedFonts};
