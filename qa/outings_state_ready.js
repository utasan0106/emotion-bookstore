'use strict';
// Serialized into the browser by waitForFunction; intentionally no closure state.
module.exports=function outingsStateReady(expected){
 if(location.href!==expected.url||document.readyState==='loading')return false;
 const form=document.querySelector('#event-filters');
 if(!form||form.hidden)return false;
 for(const [name,value] of Object.entries(expected.filters)){
  const input=form.querySelector('select[name="'+name+'"]');
  if(!input||input.value!==value)return false;
 }
 const ids=[...document.querySelectorAll('[data-event-card]')].filter(el=>!el.hidden&&el.getClientRects().length>0).map(el=>el.dataset.eventCard);
 return JSON.stringify(ids)===JSON.stringify(expected.ids);
};
