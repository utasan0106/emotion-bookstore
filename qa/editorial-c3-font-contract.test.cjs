'use strict';
const assert=require('node:assert/strict');
const {validateRenderedFonts}=require('./editorial-c3-font-contract.cjs');
let checks=0;
const row=(role,weight)=>({role,weight:String(weight),family:'EditorialReading, sans-serif',fontSynthesis:'none',fonts:[{glyphCount:10,isCustomFont:true,postScriptName:weight===700?'ZenKakuGothicNew-Bold':'ZenKakuGothicNew-Regular'}]});
const good=()=>[row('hero',700),row('brand',700),...Array.from({length:6},()=>row('bookTitle',700)),...Array.from({length:3},()=>row('body',400)),row('other',400)];
const check=(data,expected,message)=>{assert.equal(validateRenderedFonts(data),expected,message);checks++;};
check(good(),true,'correct actual role fonts pass');
check([],false,'empty actual-font evidence fails');
for(const [property,value] of [['family','Arial, sans-serif'],['weight','500'],['fontSynthesis','weight'],['fontSynthesis',''],['role','unknown']]){let r=good();r[2][property]=value;check(r,false,property+' drift fails');}
for(const [property,value] of [['postScriptName','NotoSansJP-Thin'],['isCustomFont',false],['glyphCount',0]]){let r=good();r[1].fonts[0][property]=value;check(r,false,property+' fails');}
let r=good();r[0]=row('hero',400);check(r,false,'regular hero cannot silently pass');
r=good();r[8]=row('body',700);check(r,false,'body cannot silently become bold');
r=good();r[0].fonts.push({glyphCount:1,isCustomFont:false,postScriptName:'ArialMT'});check(r,false,'one system fallback glyph fails');
r=good();r=r.filter(x=>x.role!=='brand');check(r,false,'brand evidence required');
r=good();r.splice(2,1);check(r,false,'all cover and detail titles require evidence');
r=good();r.splice(8,1);check(r,false,'all three reading paragraphs require evidence');
r=good();r.push(row('other',700));check(r,true,'other deliberate bold text allowed');
console.log(`PASS ${checks} C3 role-font fixtures; no browser executed.`);
