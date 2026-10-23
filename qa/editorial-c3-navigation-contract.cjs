'use strict';
const items=[['本の棚','/qa/editorial-study-c3/index.html#shelves'],['音楽','/qa/editorial-study-c3/index.html#listen'],['映画','/qa/editorial-study-c3/film-and-books.html'],['街へ','/qa/editorial-study-c3/outings.html']];
function navigationSnapshot(){
 const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 return {width:innerWidth,brand:rect(document.querySelector('.brand')),rows:[...document.querySelectorAll('.masthead nav a')].map(e=>({text:e.textContent.trim(),href:e.getAttribute('href'),current:e.getAttribute('aria-current'),visible:e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}),size:parseFloat(getComputedStyle(e).fontSize),box:rect(e)}))};
}
function validateNavigation(d,route){
 if(!d||!Array.isArray(d.rows)||d.rows.length!==4||!d.brand)return false;
 const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
 for(let i=0;i<4;i++){
  const r=d.rows[i],b=r.box;if(r.text!==items[i][0]||r.href!==items[i][1]||r.current!==(r.href===route?'page':null)||!r.visible||r.size<14)return false;
  if(!b||b.width<44||b.height<44||b.left< -1||b.right>d.width+1||overlap(b,d.brand))return false;
  if(d.rows.slice(0,i).some(other=>overlap(b,other.box)))return false;
 }
 return true;
}
module.exports={items,navigationSnapshot,validateNavigation};
