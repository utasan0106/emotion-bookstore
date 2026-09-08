'use strict';
(function(){
 const nav=document.querySelector('[data-page-tools]');if(!nav)return;
 const update=()=>nav.classList.toggle('is-scrolled',window.scrollY>Math.max(300,window.innerHeight/2));
 window.addEventListener('scroll',update,{passive:true});update();
 const up=nav.querySelector('[data-page-up]');
 up.addEventListener('click',e=>{const target=document.querySelector('#page-top');if(!target)return;e.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target.focus({preventScroll:true});});
})();
