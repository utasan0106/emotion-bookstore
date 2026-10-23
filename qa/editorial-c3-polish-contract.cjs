'use strict';
const box=r=>r&&['left','right','top','bottom','width','height'].every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0;
const near=(a,b)=>Math.abs(a-b)<=1;
function validatePolish(d,{width,fontPercent}){
  if(!d||![d.scene,d.deskArt,d.shelf,d.musicBox,d.photoBox,d.musicButtonBox].every(box))return false;
  // The decorative image ends at the actual book section, never midway through prose.
  if(!near(d.deskArt.bottom,d.scene.bottom)||!near(d.scene.bottom,d.shelf.bottom)||!near(d.musicBox.top,d.scene.bottom))return false;
  // Cover/title/reason now live in one article rather than two repeated lists.
  if(d.mappings.length!==3||d.mappings.some(m=>![m.choiceBox,m.cardBox].every(box)||!near(m.choiceBox.left,m.cardBox.left)||!near(m.choiceBox.right,m.cardBox.right)))return false;
  const p=d.visualPolish;
  if(!p||p.primaryMusicControls!==1||p.secondaryHref!=='https://www.youtube.com/watch?v=3lzRKhS08Zo'||p.privacy!=='押すまでYouTubeへ接続せず、自動再生もしません。')return false;
  if(JSON.stringify(p.cultureLinks)!==JSON.stringify(['/qa/editorial-study-c3/film-and-books.html','/qa/editorial-study-c3/outings.html']))return false;
  if(!(p.secondaryFontSize<p.buttonFontSize))return false;
  if(fontPercent===100){if(d.photoBox.width>(width<=700?112:220)+1)return false;if(d.musicButtonBox.height<60)return false;}
  return true;
}
module.exports={validatePolish};
