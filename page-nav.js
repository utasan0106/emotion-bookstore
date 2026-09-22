'use strict';
(function(){
 const nav=document.querySelector('[data-page-tools]');if(!nav)return;
 const update=()=>nav.classList.toggle('is-scrolled',window.scrollY>Math.max(300,window.innerHeight/2));
 window.addEventListener('scroll',update,{passive:true});update();
 const up=nav.querySelector('[data-page-up]');
 up.addEventListener('click',e=>{const target=document.querySelector('#page-top');if(!target)return;e.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target.focus({preventScroll:true});});
})();
// Optional weather enhancement. Detail/reading pages do not request weather.
(function(){
 const path=location.pathname;
 if(document.documentElement.lang!=='ja'||!(path==='/'||path==='/index.html'||path==='/shelf.html'||/^\/(?:discover|outings)\/(?:[^/]+\/)?(?:(?:index|audio|video|book|film)\.html)?$/.test(path)))return;
 const script=document.createElement('script');script.src='/city-weather.js';script.defer=true;document.head.append(script);
})();
// Tokyo time changes the shared palette without a weather request or location permission.
(function(){const script=document.createElement('script');script.src='/time-of-day.js';script.defer=true;document.head.append(script);})();

// Media integrity: external images must never leave a broken-image icon.
// Reviewed images may declare a same-origin fallback; unreviewed failures collapse
// to a short accessible note while preserving the surrounding title/action.
(function(){
 function fail(img){
  if(!img||img.dataset.imageHandled==='1')return;
  const fallback=img.dataset.imageFallback;
  if(fallback&&img.dataset.imageFallbackTried!=='1'){
   img.dataset.imageFallbackTried='1';
   img.src=fallback;
   return;
  }
  img.dataset.imageHandled='1';
  img.hidden=true;
  const host=img.closest('figure')||img.parentElement;
  if(host&&!host.querySelector('.media-unavailable')){
   const note=document.createElement('p');
   note.className='media-unavailable';
   note.setAttribute('role','status');
   note.textContent='画像を表示できません。本文と公式リンクは利用できます。';
   host.appendChild(note);
  }
 }
 document.addEventListener('error',e=>{if(e.target&&e.target.tagName==='IMG')fail(e.target);},true);
 document.querySelectorAll('img').forEach(img=>{if(img.complete&&img.naturalWidth===0)fail(img);});
})();
// Video-length policy is a public fail-closed guard. The policy file also exports
// the same data to Node QA, so browser behavior and release checks share one source.
(function(){
 const script=document.createElement('script');
 script.src='/video-duration-policy.js';
 script.defer=true;
 document.head.appendChild(script);
})();
