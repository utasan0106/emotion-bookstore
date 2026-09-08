'use strict';
(function(){
 function tokyoPeriod(now=new Date()) {
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'}).format(now));
  return hour>=5&&hour<10?'morning':hour>=10&&hour<16?'day':hour>=16&&hour<19?'evening':'night';
 }
 if(typeof module!=='undefined')module.exports={tokyoPeriod};
 if(typeof document==='undefined')return;
 function update(){
  document.body.dataset.daypart=tokyoPeriod();
  // Use a genuinely relit drawing at night; never darken a daytime sky with a filter.
  const scene=document.querySelector('[data-city-scene-image]');
  if(scene){
   const night=document.body.dataset.daypart==='night';
   const src='/assets/home-encounter-'+(night?'night':'day')+'-20260908.webp';
   if(scene.getAttribute('src')!==src)scene.setAttribute('src',src);
   scene.alt=night?'灯りのともる本屋で、一冊を見つけた二人。架空の街の夜のイラスト':'本屋で一冊を見つけ、振り返る二人。架空の街のイラスト';
  }
  document.querySelectorAll('[data-time-of-day]').forEach(el=>{
   const en=document.documentElement.lang==='en';
   el.textContent=(en?{morning:'Tokyo · morning',day:'Tokyo · daytime',evening:'Tokyo · evening',night:'Tokyo · night'}:{morning:'東京の朝',day:'東京の昼',evening:'東京の夕方',night:'東京の夜'})[document.body.dataset.daypart];
  });
 }
 update();setInterval(()=>{if(!document.hidden)update();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
})();
