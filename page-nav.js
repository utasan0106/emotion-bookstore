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
