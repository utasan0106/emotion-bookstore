'use strict';
(function(){
 // 種類での絞り込みは URL の ?kind= でだけ効く。HOMEに絞り込みのリンクは置いていない。
 // かつて「すべて」だけが data-home-kind を持っていたが、初期状態がもともと all なので
 // 押しても何も変わらなかった。いまは作品のハブ（/works.html）へ渡す普通のリンクである。
 // 既に共有された ?kind=book 等のURLを壊さないよう、絞り込み自体はここに残す。
 const root=document.querySelector('.home-discovery');if(!root)return;
 const labels={book:'本から見つける',music:'音楽から見つける',video:'映像から見つける',all:'気になるものから'};
 const section=document.querySelector('#hc-works'),title=document.querySelector('#hd-works-title');
 function filter(kind){
  kind=Object.hasOwn(labels,kind)?kind:'all';
  document.querySelectorAll('[data-home-work]').forEach(card=>{card.hidden=kind!=='all'&&card.dataset.homeWork!==kind;});
  document.querySelectorAll('[data-home-kind]').forEach(link=>{if(link.dataset.homeKind===kind)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
  title.textContent=labels[kind];
 }
 function fromUrl(){filter(new URLSearchParams(location.search).get('kind'));}
 document.querySelectorAll('[data-home-kind]').forEach(link=>link.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();history.pushState(null,'',link.getAttribute('href'));filter(link.dataset.homeKind);section.scrollIntoView({block:'start'});title.tabIndex=-1;title.focus({preventScroll:true});
 }));
 window.addEventListener('popstate',fromUrl);fromUrl();
})();
