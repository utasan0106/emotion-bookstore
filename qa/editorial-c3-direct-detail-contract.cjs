'use strict';
// Evidence-led replacement for the historical same-page cover-to-reason overview.
// One card per book at every width. Mobile omits home prose, never destination prose.
const expected=require('./editorial-c3-home-books.json');
const box=r=>r&&['left','top','right','bottom','width','height'].every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0;
const inWidth=(r,w)=>box(r)&&r.left>=-1&&r.right<=w+1;
const inView=(r,w,h)=>inWidth(r,w)&&r.top>=-1&&r.bottom<=h+1;
function validateDirectDetail(d,{width,fontPercent,viewportHeight}){
 if(!d||d.cardCount!==3||d.bookListCount!==1||d.retiredDetailListCount!==0||!Array.isArray(d.mappings)||d.mappings.length!==3)return false;
 if(!inWidth(d.header,width)||!inWidth(d.theme,width))return false;
 for(let i=0;i<3;i++){
  const r=d.mappings[i],e=expected[i];
  if(r.id!==e.id||r.bookTitleText!==e.title||r.authorText!==e.author||r.publisherText!==e.publisher||r.coverSrc!==e.cover||r.href!==e.href||r.titleHref!==e.href||r.credit!==e.source||r.creditText!==e.author+'『'+e.title+'』'+e.publisher||r.reasonText!==e.reason)return false;
  if(r.accessibleName!==e.author+'『'+e.title+'』'||r.visibleTitleCount!==1||!r.visible||!r.authorVisible||!r.publisherVisible||!r.creditTitleVisible||!r.sourceVisible)return false;
  if(![r.cover,r.bookTitle,r.authorBox,r.publisherBox,r.creditTitleBox,r.sourceBox,r.coverLinkBox,r.titleLinkBox].every(b=>inWidth(b,width)))return false;
  if(r.coverLinkBox.height<44||r.titleLinkBox.height<44||r.sourceBox.height<44)return false;
  if(width<=700){if(r.reasonVisible||r.reasonDisplay!=='none')return false;}
  else if(!r.reasonVisible||!inWidth(r.reason,width))return false;
 }
 if(fontPercent===100){
  const minHeight=width<=360?120:width<=700?136:190;
  if(d.mappings.some(r=>r.cover.height<minHeight||r.bookTitleSize<(width<=700?16:18)||r.authorSize<13||r.publisherSize<13||r.creditSize<13))return false;
  if(Math.max(...d.mappings.map(r=>r.cover.height))-Math.min(...d.mappings.map(r=>r.cover.height))>2)return false;
  if(width===390&&(d.heroFontSize<32||d.heroFontSize>36||d.header.height>112))return false;
  if(width===1440&&(d.heroFontSize<56||d.heroFontSize>64||d.header.height>88))return false;
 }
 if(d.requireInitial){
  if(fontPercent!==100||![390,1440].includes(width)||!inView(d.theme,width,viewportHeight))return false;
  if(d.mappings.some(r=>!inView(r.cover,width,viewportHeight)||!inView(r.bookTitle,width,viewportHeight)))return false;
 }
 return true;
}
function validateDestination(d,book){
 return !!d&&d.title===book.title&&d.titleVisible===true&&d.reason===book.reason&&d.reasonVisible===true&&d.cover===book.cover&&d.coverVisible===true&&d.source===book.source&&d.sourceVisible===true&&d.localErrors===0&&d.externalRequests===0;
}
module.exports={validateDirectDetail,validateDestination};
