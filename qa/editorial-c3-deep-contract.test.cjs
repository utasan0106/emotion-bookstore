'use strict';
const assert=require('node:assert/strict');
const {validateDeepFonts,validateDeepContent}=require('./editorial-c3-deep-contract.cjs');
let n=0;const test=(label,fn)=>{fn();n++;console.log('PASS '+label);};
const row=(role,w)=>({role,weight:String(w),family:'EditorialReading, sans-serif',fontSynthesis:'none',fonts:[{glyphCount:5,isCustomFont:true,postScriptName:w===400?'ZenKakuGothicNew-Regular':'ZenKakuGothicNew-Bold'}]});
const valid=[row('heading',700),row('brand',700),row('body',400),row('credit',400),...Array.from({length:3},()=>row('nav',700)),row('summary',700)];
const copy=()=>structuredClone(valid);
test('real role fonts',()=>assert(validateDeepFonts(valid)));
for(const [label,edit] of [
 ['empty synthesis',r=>r[0].fontSynthesis=''],['synthetic weight',r=>r[0].fontSynthesis='weight'],['wrong actual font',r=>r[0].fonts[0].postScriptName='Arial'],['system fallback',r=>r[0].fonts[0].isCustomFont=false],['mixed fallback glyph',r=>r[0].fonts.push({glyphCount:1,isCustomFont:false,postScriptName:'Arial'})],['empty glyphs',r=>r[0].fonts=[]],['zero glyphs',r=>r[0].fonts[0].glyphCount=0],['unregistered weight',r=>r[0].weight='500'],['wrong heading weight',r=>r[0]=row('heading',400)],['wrong body weight',r=>r[2]=row('body',700)],['wrong declared family',r=>r[0].family='serif'],['unknown role',r=>r[0].role='missing'],['missing brand',r=>r.splice(1,1)],['duplicate brand',r=>r.push(row('brand',700))],['missing summary',r=>r.pop()]
])test(label,()=>{let r=copy();edit(r);assert(!validateDeepFonts(r));});
for(const role of ['emphasis','action']){test(role+' real bold',()=>assert(validateDeepFonts([...valid,row(role,700)])));test(role+' cannot be regular',()=>assert(!validateDeepFonts([...valid,row(role,400)])));}
test('default prose real regular',()=>assert(validateDeepFonts([...valid,row('other',400)])));
test('default prose cannot silently become bold',()=>assert(!validateDeepFonts([...valid,row('other',700)])));
const e={title:'作品',covers:['cover.jpg'],reasons:['理由'],credits:['出典'],relatedLinks:['/related'],detailsCount:1,originalHref:null};
const d={...e,noindex:true,mainCount:1,h1Count:1,backHref:'/qa/editorial-study-c3/index.html#shelves',brandHref:'/qa/editorial-study-c3/index.html',duplicateIds:[],unresolvedAria:[],scripts:[],facades:0,eagerMedia:0,remoteResources:[],reducedMotion:true,scrollBehavior:'auto',animations:0};
test('exact deep content',()=>assert(validateDeepContent(d,e)));
for(const [key,value] of Object.entries({noindex:false,mainCount:2,h1Count:0,title:'wrong',covers:[],reasons:[],credits:[],relatedLinks:[],backHref:'/',brandHref:'/',detailsCount:0,duplicateIds:['x'],unresolvedAria:['x'],scripts:['memory-note.js'],facades:1,eagerMedia:1,remoteResources:['https://x'],reducedMotion:false,scrollBehavior:'smooth',animations:1,originalHref:'/self'}))test('reject '+key,()=>assert(!validateDeepContent({...d,[key]:value},e)));
console.log(n+' C3 deep contract fixtures passed; not browser evidence.');
