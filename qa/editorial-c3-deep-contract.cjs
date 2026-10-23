'use strict';
const PS={400:'ZenKakuGothicNew-Regular',700:'ZenKakuGothicNew-Bold'};
function validateDeepFonts(rows,profile="books"){
  if(!["books","culture-film","culture-outings"].includes(profile))return false;
  if(!Array.isArray(rows)||!rows.length)return false;
  const roles={heading:0,brand:0,body:0,credit:0,nav:0,summary:0,emphasis:0,action:0,other:0};
  for(const r of rows){
    const w=Number(r.weight),family=(r.family||'').split(',')[0].trim().replace(/^["']|["']$/g,'');
    if(!(r.role in roles)||family!=='EditorialReading'||r.fontSynthesis!=='none'||!PS[w])return false;
    if(['heading','brand','nav','summary','emphasis','action'].includes(r.role)&&w!==700)return false;
    if(['body','credit','other'].includes(r.role)&&w!==400)return false;
    if(!Array.isArray(r.fonts)||!r.fonts.length||!r.fonts.every(f=>f.glyphCount>0&&f.isCustomFont===true&&f.postScriptName===PS[w]))return false;
    roles[r.role]++;
  }
  return roles.heading>=1&&roles.brand===1&&roles.body>=1&&roles.credit>=1&&roles.nav===4&&(profile==='culture-outings'?roles.summary===0:roles.summary>=1);
}
function validateDeepContent(data,expected){
  if(!data||!expected)return false;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  return data.noindex&&data.mainCount===1&&data.h1Count===1&&data.title===expected.title&&
    same(data.covers,expected.covers)&&same(data.reasons,expected.reasons)&&same(data.credits,expected.credits)&&
    same(data.relatedLinks,expected.relatedLinks)&&data.backHref==='/qa/editorial-study-c3/index.html#shelves'&&
    data.brandHref==='/qa/editorial-study-c3/index.html'&&data.detailsCount===expected.detailsCount&&
    data.duplicateIds.length===0&&data.unresolvedAria.length===0&&data.scripts.length===0&&data.facades===0&&
    data.eagerMedia===0&&data.remoteResources.length===0&&data.reducedMotion&&data.scrollBehavior==='auto'&&
    data.animations===0&&data.originalHref===expected.originalHref&&
    (!expected.homeReason||data.reasons.includes(expected.homeReason))&&
    (!expected.kind||(
      ['culture-film','culture-outings'].includes(expected.kind)&&same(data.paragraphs,expected.paragraphs)&&
      same(data.headingTexts,expected.headingTexts)&&same(data.captions,expected.captions)&&same(data.allLinks,expected.allLinks)
    ));
}
module.exports={validateDeepFonts,validateDeepContent};
