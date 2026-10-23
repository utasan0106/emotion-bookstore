'use strict';
const assert=require('node:assert/strict'),{summarizeLocalLcp}=require('./editorial-c3-local-performance.cjs');let count=0;
for(const value of [null,undefined,{}, {supported:false,last:{startTime:120}}, {supported:true,last:{startTime:0}}, {supported:true,last:{startTime:NaN}}, {supported:true,last:{startTime:-1}}]){const r=summarizeLocalLcp(value);assert.equal(r.status,'unavailable');assert.equal(r.lcpMs,null);assert(!('passed' in r));count++;}
const r=summarizeLocalLcp({supported:true,entryCount:2,last:{startTime:321.5,renderTime:321.5,size:123}});assert.equal(r.status,'observed');assert.equal(r.lcpMs,321.5);assert.equal(r.sampleTextPercent,100);assert(!('passed' in r));count++;
console.log('PASS '+count+' optional LCP serialization fixtures; no browser/timing performance claim.');
