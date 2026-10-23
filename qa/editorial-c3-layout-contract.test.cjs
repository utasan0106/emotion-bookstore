'use strict';
const assert=require('node:assert/strict');
const {validateOverview}=require('./editorial-c3-layout-contract.cjs');
let checks=0;
const check=(actual,expected,label)=>{assert.equal(actual,expected,label);checks++;};
const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
function good(width=390) {
  const desktop=width>700,coverH=desktop?204:width<=360?122:148;
  const ids=['one','two','three'];
  return {heroFontSize:width>700?64:34,header:box(0,0,width,60),theme:box(28,140,width-56,86),requireInitial:[390,1440].includes(width),
    mappings:ids.map((name,index)=>({visible:true,targetVisible:true,targetId:`book-${name}-title`,href:`#book-${name}-title`,
      coverSrc:['/qa/editorial-preview-v4/assets/book-covers/9784103549512.jpg','/qa/editorial-preview-v4/assets/book-covers/9784103524519.jpg','/assets/book-covers/9784101021126.jpg'][index],bookTitleSize:18,bookTitleText:['成瀬は天下を取りにいく','思わず考えちゃう','高円寺純情商店街'][index],accessibleName:`書名と著者 ${name}：選んだ理由`,reasonText:'作品の公開資料に基づいた具体的な選書の理由がここにあります。',
      credit:'https://www.shinchosha.co.jp/book/354951/',workHref:'/qa/editorial-preview-v4/books/example.html',
      cover:box(26+index*(width-52)/3,300,Math.min(100,(width-64)/3),coverH),
      bookTitle:box(26+index*(width-52)/3,320+coverH,Math.min(100,(width-64)/3),44),
      target:box(28,700+index*320,width-56,72),reason:box(28,800+index*320,width-56,130)}))};
}
const options=(width=390,fontPercent=100)=>({width,fontPercent,viewportHeight:width<=390?844:900});
for(const width of [320,390,700,800,1000,1440]) check(validateOverview(good(width),options(width)),true,'valid measured-shape fixture '+width);
for(const key of ['visible','targetVisible']){let d=good();d.mappings[1][key]=false;check(validateOverview(d,options()),false,key);}
check(validateOverview({},options()),false,'missing measurements');
let d=good();d.mappings.pop();check(validateOverview(d,options()),false,'missing third cover');
d=good();d.mappings[2].href='#book-one-title';check(validateOverview(d,options()),false,'wrong cover target');
d=good();d.mappings[0].accessibleName='';check(validateOverview(d,options()),false,'unnamed cover link');
d=good();d.mappings[0].cover=box(26,300,80,108);check(validateOverview(d,options()),false,'tiny cover');
d=good();d.mappings[2].cover.top=850;d.mappings[2].cover.bottom=998;check(validateOverview(d,options()),false,'third cover outside first fold');
d=good();d.mappings[2].bookTitle=box(250,850,100,44);check(validateOverview(d,options()),false,'book title missing first fold');
d=good();d.header=box(0,0,390,118);check(validateOverview(d,options()),false,'old tall header');
d=good();d.mappings[0].reason=box(28,800,400,130);check(validateOverview(d,options()),false,'reason overflows');
d=good();d.mappings[0].credit='https://unverified.example/book';check(validateOverview(d,options()),false,'source contract altered');
d=good();d.requireInitial=false;d.header=box(0,0,390,160);d.mappings[2].bookTitle=box(250,1200,100,220);check(validateOverview(d,options(390,200)),true,'text zoom may scroll vertically, with all content intact');
d=good();d.requireInitial=false;d.mappings[0].target=box(-20,800,362,130);check(validateOverview(d,options(390,200)),false,'text zoom cannot escape horizontally');
d=good();d.mappings[1].coverSrc='/wrong-book.jpg';check(validateOverview(d,options()),false,'cover must identify the correct work');
d=good();d.mappings[1].cover=box(140,300,100,144);check(validateOverview(d,options()),false,'unequal cover heights fail');
d=good();d.mappings[1].bookTitleSize=13;check(validateOverview(d,options()),false,'tiny cover title fails');
d=good();d.heroFontSize=28;check(validateOverview(d,options()),false,'mobile hero hierarchy not restored');
d=good();d.mappings.forEach(m=>m.bookTitleSize=16);check(validateOverview(d,options()),true,'reference-reviewed mobile16 captions pass without shrinking body');
d=good();d.mappings[0].bookTitleSize=15.9;check(validateOverview(d,options()),false,'mobile captions below16 fail');
d=good(1440);d.mappings[0].bookTitleSize=17;check(validateOverview(d,options(1440)),false,'desktop captions still require18');
console.log(`PASS ${checks} C3 geometry/semantic fixture cases; no browser executed.`);
