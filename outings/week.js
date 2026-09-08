'use strict';
(function(){
 function state(start,end,now){const begin=Date.parse(start+'T00:00:00+09:00'),finish=Date.parse(end+'T00:00:00+09:00');return now<begin?'future':now<finish?'current':'past';}
 if(typeof module!=='undefined')module.exports={state};
 if(typeof document==='undefined')return;
 document.querySelectorAll('[data-week-start]').forEach(el=>{const s=state(el.dataset.weekStart,el.dataset.weekEnd,Date.now());const label=el.dataset.weekStart+' 掲載週';el.textContent=(s==='current'?'今週のおすすめ · ':s==='past'?'過去のおすすめ · ':'公開予定 · ')+label;});
 document.querySelectorAll('[data-issue-start]').forEach(el=>{el.hidden=Date.now()<Date.parse(el.dataset.issueStart+'T00:00:00+09:00');});
})();
