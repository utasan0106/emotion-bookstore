'use strict';
// Optional reference data only. Never feeds any pass/fail or field-Web-Vitals claim.
function observeLocalLcp(){
 const state={supported:false,entryCount:0,last:null,reason:null};window.__qaLocalLcp=state;
 const collect=entries=>{for(const e of entries){state.entryCount++;state.last={startTime:e.startTime,renderTime:e.renderTime,loadTime:e.loadTime,size:e.size,element:e.element?.tagName?.toLowerCase()||null};}};
 try{if(!('PerformanceObserver' in window)||!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')){state.reason='largest-contentful-paint observation unavailable';return;}state.supported=true;const observer=new PerformanceObserver(list=>collect(list.getEntries()));observer.observe({type:'largest-contentful-paint',buffered:true});window.__qaReadLocalLcp=()=>{collect(observer.takeRecords());return {...state};};}catch(e){state.reason=e.message;}
}
function readLocalLcp(){return typeof window.__qaReadLocalLcp==='function'?window.__qaReadLocalLcp():window.__qaLocalLcp||null;}
function summarizeLocalLcp(raw){
 const value=raw?.last?.startTime,observed=raw?.supported===true&&Number.isFinite(value)&&value>0;
 return {status:observed?'observed':'unavailable',lcpMs:observed?value:null,entryCount:Number.isInteger(raw?.entryCount)?raw.entryCount:0,entry:observed?raw.last:null,reason:observed?null:raw?.reason||'No positive LCP entry observed by snapshot',scope:'CI Chromium, local HTTP checkout, one navigation sample; networkidle snapshot before text enlargement and QA scrolling. Uncalibrated reference only, not field-user 75th percentile or a Web Vitals pass.',sampleTextPercent:100};
}
module.exports={observeLocalLcp,readLocalLcp,summarizeLocalLcp};
