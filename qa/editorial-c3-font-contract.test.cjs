'use strict';
const assert=require('node:assert/strict'),{validateRenderedFonts}=require('./editorial-c3-font-contract.cjs');
let n=0;const ids=['book-one-title','book-two-title','book-three-title'];
const row=(role,weight,bookId=null)=>({role,weight:String(weight),bookId,visible:true,family:'EditorialReading, sans-serif',fontSynthesis:'none',fonts:[{glyphCount:10,isCustomFont:true,postScriptName:weight===700?'ZenKakuGothicNew-Bold':'ZenKakuGothicNew-Regular'}]});
const good=(width=390)=>[row('hero',700),row('brand',700),...ids.map(id=>row('bookTitle',700,id)),...Array.from({length:4},()=>row('nav',700)),...Array.from({length:9},()=>row('metadata',400)),...(width>700?ids.map(id=>row('body',400,id)):[]),row('other',400)];
const check=(rows,pass,label,width=390)=>{assert.equal(validateRenderedFonts(rows,{width}),pass,label);n++;};
check(good(),true,'mobile has no visible reason evidence');check(good(1440),true,'desktop has all three reasons',1440);check([],false,'empty fails');
for(const [key,value] of [['family','Arial'],['weight','500'],['fontSynthesis',''],['fontSynthesis','weight'],['role','unknown'],['visible',false]]){let d=good();d[2][key]=value;check(d,false,key);}
for(const [key,value] of [['postScriptName','NotoSansJP-Thin'],['isCustomFont',false],['glyphCount',0]]){let d=good();d[1].fonts[0][key]=value;check(d,false,key);}
let d=good();d[0]=row('hero',400);check(d,false,'hero real bold');d=good();d[2].bookId='unknown';check(d,false,'title is tied to a real card');d=good();d[2].bookId=ids[1];check(d,false,'all three titles represented');
d=good();d[2].fonts=[];check(d,false,'empty glyph never accepted');d=good();d[0].fonts.push({glyphCount:1,isCustomFont:false,postScriptName:'ArialMT'});check(d,false,'mixed fallback rejected');
for(const role of ['brand','nav','metadata']){d=good();d.splice(d.findIndex(x=>x.role===role),1);check(d,false,'missing '+role);}
d=good();d.push(row('body',400,ids[0]));check(d,false,'hidden mobile reason cannot count as visible');d=good(1440);d.splice(d.findIndex(x=>x.role==='body'),1);check(d,false,'desktop reason cannot disappear',1440);
d=good(1440);d[d.findIndex(x=>x.role==='body')]=row('body',700,ids[0]);check(d,false,'desktop body must be real regular',1440);
d=good();d[d.findIndex(x=>x.role==='nav')]=row('nav',400);check(d,false,'navigation must be real bold');d=good();d.push(row('other',700));check(d,true,'other deliberate real bold');
console.log('PASS '+n+' visible role-font fixtures; no browser executed.');
