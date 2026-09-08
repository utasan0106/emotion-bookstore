'use strict';
(function(){
 const DAY=86400000;
 const stamp=d=>Date.parse(d+'T00:00:00+09:00');
 const date=now=>new Date(Number(now)+9*3600000).toISOString().slice(0,10);
 const add=(d,n)=>date(stamp(d)+n*DAY);
 function monday(now){const d=date(now),dow=new Date(stamp(d)+9*3600000).getUTCDay();return add(d,-((dow+6)%7));}
 function dates(e){if(e.dates)return [...e.dates].sort();const list=[];for(let d=e.start;d<=e.end;d=add(d,1))if(!(e.excluded||[]).includes(d))list.push(d);return list;}
 function state(start,end,now){return now<stamp(start)?'future':now<stamp(end)?'current':'past';}
 function select(events,{now=Date.now(),week=monday(now),city='',audience='',kind=''}={}){
  const today=date(now),end=add(week,7);
  return events.filter(e=>e.status==='scheduled'&&e.checkedAt<=today&&e.reviewThrough>=today&&(!city||e.city===city)&&(!audience||e.audiences.includes(audience))&&(!kind||(e.browseKinds||[]).includes(kind)))
   .map(e=>({...e,nextDate:dates(e).find(d=>d>=today&&d>=week&&d<end)})).filter(e=>e.nextDate).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)||a.id.localeCompare(b.id));
 }
 const api={stamp,date,add,monday,dates,state,select};
 if(typeof module!=='undefined')module.exports=api;
 if(typeof document==='undefined')return;
 const short=d=>d.slice(5).replace('-','/');
 const data=window.OUTINGS_DATA;
 if(!data)return;
 const form=document.querySelector('#event-filters');
 const query=new URLSearchParams(location.search);
 function safeParams(p){const result=new URLSearchParams();const w=p.get('week');if(/^\d{4}-\d{2}-\d{2}$/.test(w||'')&&Number.isFinite(stamp(w))&&date(stamp(w))===w)result.set('week',w);if(data.cities[p.get('city')])result.set('city',p.get('city'));if(data.audiences.some(a=>a.id===p.get('with')))result.set('with',p.get('with'));if((data.kinds||[]).some(k=>k.id===p.get('kind')))result.set('kind',p.get('kind'));return result;}
 const status=document.querySelector('[data-event-status]');
 function detailState(){if(!status)return;const e=data.events.find(x=>x.id===status.dataset.eventStatus);if(!e)return;const today=date(Date.now()),upcoming=dates(e).filter(d=>d>=today);const chosenWeek=safeParams(new URLSearchParams(query.get('from')||'')).get('week'),selectedDate=chosenWeek&&upcoming.find(d=>d>=chosenWeek&&d<add(chosenWeek,7));status.textContent=e.status==='cancelled'?'開催中止':!upcoming.length?'この催しは終了しました':today>e.reviewThrough?'開催状況を再確認中':selectedDate?'選んだ週の開催予定 '+short(selectedDate):upcoming[0]===today?'本日の開催予定':'次の開催予定 '+short(upcoming[0]);status.classList.toggle('is-past',!upcoming.length||today>e.reviewThrough);}
 const back=document.querySelector('[data-event-back]');
 if(back){const p=safeParams(new URLSearchParams(query.get('from')||''));back.href='/outings/'+(p.size?'?'+p.toString():'');}
 if(!form){detailState();document.addEventListener('visibilitychange',detailState);return;}
 const weekSelect=form.elements.week,citySelect=form.elements.city,withSelect=form.elements.with,kindSelect=form.elements.kind;
 function options(){const now=Date.now(),first=monday(now),old=weekSelect.value;weekSelect.replaceChildren();for(let n=0;n<4;n++){const w=add(first,n*7),o=document.createElement('option');o.value=w;o.textContent=(n===0?'今週のこれから':n===1?'来週':'開催週')+' · '+short(w)+'〜'+short(add(w,6));weekSelect.append(o);}if([...weekSelect.options].some(o=>o.value===old))weekSelect.value=old;}
 options();const p=safeParams(query);if([...weekSelect.options].some(o=>o.value===p.get('week')))weekSelect.value=p.get('week');citySelect.value=p.get('city')||'';withSelect.value=p.get('with')||'';kindSelect.value=p.get('kind')||'';
 // A category-only entry shows the nearest available week, while explicit week links remain exact.
 if(kindSelect.value&&!p.has('week')){const first=[...weekSelect.options].find(o=>select(data.events,{week:o.value,city:citySelect.value,audience:withSelect.value,kind:kindSelect.value}).length);if(first)weekSelect.value=first.value;}
 function render(push=false){
  const selected=select(data.events,{week:weekSelect.value,city:citySelect.value,audience:withSelect.value,kind:kindSelect.value});
  const byId=new Map(selected.map(e=>[e.id,e]));const params=new URLSearchParams();params.set('week',weekSelect.value);if(citySelect.value)params.set('city',citySelect.value);if(withSelect.value)params.set('with',withSelect.value);if(kindSelect.value)params.set('kind',kindSelect.value);
  if(push)history.replaceState(null,'','?'+params.toString());
  document.querySelectorAll('[data-event-card]').forEach(card=>{const e=byId.get(card.dataset.eventCard);card.hidden=!e;if(e){card.querySelector('[data-next-date]').textContent=short(e.nextDate);card.querySelector('[data-event-detail]').href='/outings/events/'+e.id+'.html?from='+encodeURIComponent(params.toString());}});
  // Keep reading and keyboard order consistent with the displayed chronological order.
  const grid=document.querySelector('.events-grid');
  const cards=new Map([...grid.children].map(card=>[card.dataset.eventCard,card]));
  selected.forEach(e=>grid.append(cards.get(e.id)));
  document.querySelector('#event-count').textContent=selected.length+'件の開催予定';
  document.querySelector('#event-empty').hidden=selected.length>0;
  document.querySelector('#event-updated').textContent='公式情報確認：'+data.checkedAt+'。変更・空席は各催しの公式案内へ。';
 }
 form.hidden=false;render();form.addEventListener('change',()=>render(true));form.addEventListener('submit',e=>e.preventDefault());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){options();render();}});
 // A page left open across midnight/week boundaries must not keep stale recommendations.
 setInterval(()=>{options();render();},60000);
})();
