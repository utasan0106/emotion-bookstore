'use strict';
// Evidence-led replacement for the historical same-page cover-to-reason overview.
// One card per book at every width. Mobile is a native finite shelf with full prose.
const expected=require('./editorial-c3-home-books.json');
const box=r=>r&&['left','top','right','bottom','width','height'].every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0;
const inWidth=(r,w)=>box(r)&&r.left>=-1&&r.right<=w+1;
const inView=(r,w,h)=>inWidth(r,w)&&r.top>=-1&&r.bottom<=h+1;
// Every card is measured after native focus has brought that card into the
// finite viewport. Initial-position evidence remains separate and cannot stand
// in for reachability, full text, whole-image geometry or keyboard restoration.
function validateDirectDetail(d,{width,fontPercent,viewportHeight}){
 if(!d||d.cardCount!==3||d.bookListCount!==1||d.retiredDetailListCount!==0||!Array.isArray(d.mappings)||d.mappings.length!==3)return false;
 if(!Number.isFinite(d.rootFontSize)||Math.abs(d.rootFontSize-16*fontPercent/100)>.01||!Number.isFinite(d.shelfContentWidth)||d.shelfContentWidth<=0)return false;
 if(!Number.isFinite(d.heroFontSize)||typeof d.requireInitial!=='boolean')return false;
 if(!inWidth(d.header,width)||!inWidth(d.theme,width)||!inWidth(d.shelfViewport,width)||!d.restoredShelf)return false;
 if(!['shelfScrollHeight','shelfClientHeight','shelfScrollWidth','shelfClientWidth'].every(k=>Number.isFinite(d[k])&&d[k]>0)||!Number.isFinite(d.shelfScrollLeft))return false;
 if(width<=700&&(!['auto','scroll'].includes(d.shelfOverflowX)||d.shelfScrollHeight>d.shelfClientHeight+1))return false;
 for(let i=0;i<3;i++){
  const r=d.mappings[i],e=expected[i];
  // 760a2's 200% rows also shrank to82/100px. Enforce the actual intended
  // fixed track at every text size, not only the initial100% cover contract.
  if(width<=700&&(!box(r.cardBox)||Math.abs(r.cardBox.width-Math.min(9*d.rootFontSize,d.shelfContentWidth))>1))return false;
  if(r.id!==e.id||r.bookTitleText!==e.title||r.authorText!==e.author||r.publisherText!==e.publisher||r.coverSrc!==e.cover||r.href!==e.href||r.titleHref!==e.href||r.credit!==e.source||r.creditText!==e.author+'『'+e.title+'』'+e.publisher||r.reasonText!==e.reason)return false;
  if(r.accessibleName!==e.author+'『'+e.title+'』'||r.visibleTitleCount!==1||!r.visible||!r.authorVisible||!r.publisherVisible||!r.creditTitleVisible||!r.sourceVisible||!r.reachFocused)return false;
  if(r.sourceText!==e.publisher||r.creditLinks!==1||r.creditDecoration!=='none')return false;
  if(![r.cover,r.bookTitle,r.authorBox,r.publisherBox,r.creditTitleBox,r.sourceBox,r.coverLinkBox,r.titleLinkBox,r.reason,r.cardBox].every(b=>inWidth(b,width)))return false;
  if(!box(r.reachShelfBox)||![r.cover,r.bookTitle,r.sourceBox,r.reason,r.cardBox].every(b=>b.left>=r.reachShelfBox.left-1&&b.right<=r.reachShelfBox.right+1))return false;
  if(![r.cover,r.bookTitle,r.authorBox,r.publisherBox,r.creditTitleBox,r.sourceBox,r.reason].every(b=>b.top>=r.reachShelfBox.top-1&&b.bottom<=r.reachShelfBox.bottom+1))return false;
  if(r.coverLinkBox.height<44||r.titleLinkBox.height<44||r.sourceBox.height<44||r.sourceBox.width<44)return false;
  if(!r.reasonVisible||r.reasonDisplay==='none'||r.reasonClamp!=='none'||r.reasonOverflow!=='visible')return false;
  if(!['bookTitleSize','reasonSize','authorSize','publisherSize','creditSize'].every(k=>Number.isFinite(r[k])&&r[k]>0))return false;
  const zoom=fontPercent/100;
  if(r.bookTitleSize<(width<=700?16:18)*zoom-.01||r.reasonSize<16*zoom-.01||r.authorSize<13*zoom-.01||r.publisherSize<13*zoom-.01||r.creditSize<13*zoom-.01)return false;
 }
 if(width<=700&&d.mappings.some(r=>r.cover.height<179))return false;
 if(fontPercent===100){
  const minHeight=width<=700?179:190;
  if(d.mappings.some(r=>r.cover.height<minHeight))return false;
  if(Math.max(...d.mappings.map(r=>r.cover.height))-Math.min(...d.mappings.map(r=>r.cover.height))>2)return false;
  if(width===390&&(d.heroFontSize<32||d.heroFontSize>36||d.header.height>112))return false;
  if(width===1440&&(d.heroFontSize<56||d.heroFontSize>64||d.header.height>88))return false;
 }
 if(d.requireInitial){
  if(fontPercent!==100||![390,1440].includes(width)||!inView(d.theme,width,viewportHeight)||!Array.isArray(d.initialCards)||d.initialCards.length!==3)return false;
  const initial=d.initialCards;
  if(width===390){
   if(d.shelfScrollLeft!==0||d.shelfScrollWidth<=d.shelfClientWidth||initial.some(r=>r.card.width<140||r.card.width>152))return false;
   if(initial.slice(0,2).some(r=>!inView(r.cover,width,viewportHeight)||!inView(r.title,width,viewportHeight)||r.card.right>d.shelfViewport.right+1))return false;
   const third=initial[2],peek=d.shelfViewport.right-third.cover.left;
   if(!(peek>=12&&peek<third.cover.width-12&&third.cover.top>=0&&third.cover.bottom<=viewportHeight+1))return false;
  }else if(initial.some(r=>!inView(r.cover,width,viewportHeight)||!inView(r.title,width,viewportHeight)))return false;
 }
 return true;
}
function validateDestination(d,book){
 return !!d&&d.title===book.title&&d.titleVisible===true&&d.reason===book.reason&&d.reasonVisible===true&&d.cover===book.cover&&d.coverVisible===true&&d.source===book.source&&d.sourceVisible===true&&d.localErrors===0&&d.externalRequests===0;
}
module.exports={validateDirectDetail,validateDestination};
