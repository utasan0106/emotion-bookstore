'use strict';
// All three full home reasons remain visible. Horizontally off-screen shelf
// text is scrolled into its actual painted position before strict CDP evidence.
const EXPECTED={400:'ZenKakuGothicNew-Regular',700:'ZenKakuGothicNew-Bold'};
const ids=['book-one-title','book-two-title','book-three-title'];
function validateRenderedFonts(rows,{width}={}){
 if(!Number.isFinite(width)||!Array.isArray(rows)||!rows.length)return false;
 const counts={hero:0,brand:0,bookTitle:0,body:0,nav:0,metadata:0},titles=new Set(),bodies=new Set();
 for(const r of rows){
  const family=typeof r.family==='string'?r.family.split(',')[0].trim().replace(/^["']|["']$/g,''):'';
  const weight=Number(r.weight),name=EXPECTED[weight];
  if(r.visible!==true||family!=='EditorialReading'||!name||r.fontSynthesis!=='none')return false;
  if(['hero','brand','bookTitle','nav'].includes(r.role)&&weight!==700)return false;
  if(['body','metadata'].includes(r.role)&&weight!==400)return false;
  if(!['hero','brand','bookTitle','body','nav','metadata','other'].includes(r.role))return false;
  if(r.role in counts)counts[r.role]++;
  if(['bookTitle','body'].includes(r.role)){if(!ids.includes(r.bookId))return false;(r.role==='bookTitle'?titles:bodies).add(r.bookId);}
  if(!Array.isArray(r.fonts)||!r.fonts.length||!r.fonts.every(f=>f.glyphCount>0&&f.isCustomFont===true&&f.postScriptName===name))return false;
 }
 return counts.hero>=1&&counts.brand===1&&counts.nav===4&&counts.metadata>=9&&titles.size===3&&counts.body===3&&bodies.size===3;
}
module.exports={validateRenderedFonts};
