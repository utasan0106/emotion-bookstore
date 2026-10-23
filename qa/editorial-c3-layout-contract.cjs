'use strict';
// Pure geometry/semantic helper. Fixtures are not browser or visual evidence.
// C3 consciously changes C2's serial one-cover-first-fold contract to a linked
// overview: three covers and exact book titles first, full-width reasons below.
// Cover navigation is native, same-page, and individually named. No extra labels.
const finiteBox = r => r && ['left','top','right','bottom','width','height'].every(k=>Number.isFinite(r[k])) && r.width>0 && r.height>0 && r.right>r.left && r.bottom>r.top;
const inWidth=(r,width)=>finiteBox(r)&&r.left>=-1&&r.right<=width+1;
const inViewport=(r,width,height)=>inWidth(r,width)&&r.top>=-1&&r.bottom<=height+1;
function validateOverview(data, {width,fontPercent,viewportHeight}) {
  if(!data||!Array.isArray(data.mappings)||data.mappings.length!==3) return false;
  if(!inWidth(data.header,width)||!inWidth(data.theme,width)) return false;
  const required=['book-one-title','book-two-title','book-three-title'];
  const covers=['/qa/editorial-preview-v4/assets/book-covers/9784103549512.jpg','/qa/editorial-preview-v4/assets/book-covers/9784103524519.jpg','/assets/book-covers/9784101021126.jpg'];
  const titles=['成瀬は天下を取りにいく','思わず考えちゃう','高円寺純情商店街'];
  if(!data.mappings.every((row,index)=>row.visible&&row.targetVisible&&
      row.targetId===required[index]&&row.href==='#'+required[index]&&row.bookTitleText===titles[index]&&row.coverSrc===covers[index]&&
      typeof row.accessibleName==='string'&&row.accessibleName.length>8&&
      typeof row.reasonText==='string'&&row.reasonText.length>20&&
      /^https:\/\/www\.shinchosha\.co\.jp\/book\/\d+\/$/.test(row.credit||'')&&
      typeof row.workHref==='string'&&row.workHref.startsWith('/')&&
      [row.cover,row.bookTitle,row.target,row.reason].every(r=>inWidth(r,width)))) return false;
  // Proportion/cropping, all glyph fonts, contrast, keyboard and privacy remain
  // independently checked by the browser runner. No geometry fixture replaces them.
  // Owner changed mobile captions to16 after actual390 screenshots showed poor
  // semantic wraps at18. Desktop18 and all zoom/cover/link requirements remain.
  if(fontPercent===100) {
    const minHeight=width<=360?120:width<=700?136:190;
    if(data.mappings.some(row=>row.cover.height<minHeight||row.bookTitleSize<(width<=700?16:18))) return false;
    if(Math.max(...data.mappings.map(row=>row.cover.height))-Math.min(...data.mappings.map(row=>row.cover.height))>2) return false;
    if(width===390&&(data.heroFontSize<32||data.heroFontSize>36)) return false;
    if(width===1440&&(data.heroFontSize<56||data.heroFontSize>64)) return false;
    if(width===390&&data.header.height>76) return false;
    if(width===1440&&data.header.height>88) return false;
  }
  if(data.requireInitial) {
    if(fontPercent!==100||![390,1440].includes(width)) return false;
    if(!inViewport(data.theme,width,viewportHeight)) return false;
    if(data.mappings.some(row=>!inViewport(row.cover,width,viewportHeight)||!inViewport(row.bookTitle,width,viewportHeight))) return false;
  }
  return true;
}
module.exports={validateOverview};
