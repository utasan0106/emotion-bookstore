'use strict';
const assert=require('node:assert/strict'),{validateRouteStructure}=require('./editorial-c3-route-structure-contract.cjs');let n=0;
const good=(width=390)=>({hero:{imageVisible:true,captionVisible:true,imageCount:1,caption:'映画の場面や撮影セットの写真ではありません。',imageTop:390,imageBottom:390+(width<=390?(width-56)*853/1280:400),captionFontSize:13,captionLineHeight:21.45,captionLetterSpacing:'0px',captionBottom:800,pairTop:820,imageLeft:28,imageRight:width-28,width:width<=390?width-56:600,height:width<=390?(width-56)*853/1280:400}});
const test=(label,edit,pass=false,w=390,p=100)=>{const d=good(w);d.hero.captionFontSize*=p/100;d.hero.captionLineHeight*=p/100;edit(d);assert.equal(validateRouteStructure(d,{kind:'culture-film',width:w,fontPercent:p,viewportHeight:w<=390?844:900}),pass,label);n++;};
for(const w of [320,390,1440])test('whole hero image '+w,()=>{},true,w);
for(const [k,v] of [['imageVisible',false],['captionVisible',false],['imageCount',2],['caption','movie still'],['imageBottom',850],['captionBottom',821],['imageLeft',-2],['imageRight',392],['width',220],['height',140],['captionFontSize',12],['captionLineHeight',26],['captionLetterSpacing','1px']])test(k,d=>d.hero[k]=v);
test('zoom may scroll',d=>{d.hero.imageTop=900;d.hero.imageBottom=1100;d.hero.captionBottom=1500;d.hero.pairTop=1600;},true,390,200);
for(const k of ['captionFontSize','captionLineHeight'])for(const v of [undefined,NaN,0])test('invalid '+k,d=>d.hero[k]=v);
const outing={hero:{type:'typographic',headingTexts:['荻窪の本屋 Title','荻窪おすすめマップ','Via'],sizes:[32,24,24],mainImageCount:0}};
assert(validateRouteStructure(outing,{kind:'culture-outings'}));n++;for(const change of [d=>d.hero.sizes[0]=24,d=>d.hero.mainImageCount=1,d=>d.hero.headingTexts[0]='Other']){const d=structuredClone(outing);change(d);assert(!validateRouteStructure(d,{kind:'culture-outings'}));n++;}
console.log('PASS '+n+' route-structure fixtures; not browser evidence.');
