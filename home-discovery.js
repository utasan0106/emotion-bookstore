'use strict';
(function(){
 const root=document.querySelector('.home-discovery');if(!root)return;
 const labels={book:'本から見つける',music:'音楽から見つける',video:'映像から見つける',all:'気になるものから'};
 const section=document.querySelector('#hc-works'),title=document.querySelector('#hd-works-title');
 function filter(kind){
  kind=Object.hasOwn(labels,kind)?kind:'all';
  document.querySelectorAll('[data-home-work]').forEach(card=>{card.hidden=kind!=='all'&&card.dataset.homeWork!==kind;});
  document.querySelectorAll('[data-home-kind]').forEach(link=>{if(link.dataset.homeKind===kind)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
  title.textContent=labels[kind];
 }
 function fromUrl(){filter(new URLSearchParams(location.search).get('kind'));if(location.hash==='#reading')document.querySelector('#reading').open=true;}
 document.querySelectorAll('[data-home-kind]').forEach(link=>link.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();history.pushState(null,'',link.getAttribute('href'));filter(link.dataset.homeKind);section.scrollIntoView({block:'start'});title.tabIndex=-1;title.focus({preventScroll:true});
 }));
 document.querySelectorAll('[data-open-reading]').forEach(link=>link.addEventListener('click',()=>{document.querySelector('#reading').open=true;}));
 window.addEventListener('popstate',fromUrl);fromUrl();
})();
