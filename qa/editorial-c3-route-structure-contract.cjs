'use strict';
function validateRouteStructure(d,{kind,width,fontPercent,viewportHeight}){
 if(!d)return false;
 if(kind==='culture-film'){
  const h=d.hero;if(!h||!h.imageVisible||!h.captionVisible||h.imageCount!==1||!h.caption?.includes('映画の場面や撮影セットの写真ではありません。'))return false;
  if(!(h.imageBottom<=h.pairTop&&h.captionBottom<=h.pairTop&&h.imageLeft>=-1&&h.imageRight<=width+1))return false;
  // The whole street photograph occupies at least 80% of a small screen; this
  // accepts the real 264px content area at320 without forcing overflow/cropping.
  if(fontPercent===100&&!(h.imageTop>=0&&h.imageBottom<=viewportHeight+1&&h.width>=width*(width<=390?.8:.25)&&h.height>=(width<=390?160:240)))return false;
  if(!Number.isFinite(h.captionFontSize)||!Number.isFinite(h.captionLineHeight)||h.captionFontSize<=0||h.captionLineHeight<=0)return false;
  const zoom=fontPercent/100;if(h.captionFontSize<13*zoom-.01||h.captionFontSize>13*zoom+.01||h.captionLineHeight<h.captionFontSize*1.6||h.captionLineHeight>h.captionFontSize*1.7||!['0px','normal'].includes(h.captionLetterSpacing))return false;
  return true;
 }
 if(kind==='culture-outings'){
  const h=d.hero;return !!h&&h.type==='typographic'&&h.headingTexts?.length===3&&h.headingTexts[0]==='荻窪の本屋 Title'&&h.sizes?.length===3&&h.sizes[0]>h.sizes[1]&&h.sizes[0]>h.sizes[2]&&h.mainImageCount===0;
 }
 return kind===undefined;
}
module.exports={validateRouteStructure};
