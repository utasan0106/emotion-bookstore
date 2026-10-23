'use strict';
const assert = require('node:assert/strict');
const { validatePairs } = require('./editorial-c2-layout-contract.cjs');
const options = { width: 390, fontPercent: 100, viewportHeight: 844 };
const good = () => ({sameArticle:true,adjacentSiblings:true,visible:true,cover:{left:32,top:600,right:141,bottom:760},reason:{left:32,top:780,right:358,bottom:960}});
const rows = () => [good(),good(),good()];
assert.equal(validatePairs(rows(), options),true,'adjacent mobile rows pass fixture');
assert.equal(validatePairs([], options),false,'no evidence fails');
assert.equal(validatePairs([good(),good()], options),false,'missing book fails');
for (const prop of ['sameArticle','adjacentSiblings','visible']) {
  const r=rows();r[0][prop]=false;assert.equal(validatePairs(r,options),false,prop+' false fails');
}
let r=rows();r[0].cover.bottom=700;assert.equal(validatePairs(r,options),false,'tiny cover fails at 100%');
r=rows();r[0].reason.top=790;assert.equal(validatePairs(r,options),false,'detached reason fails');
r=rows();r[0].reason.right=400;assert.equal(validatePairs(r,options),false,'horizontal overflow fails');
r=rows();r[0].reason.bottom=1700;assert.equal(validatePairs(r,options),false,'cannot see pair together at 100% fails');
assert.equal(validatePairs(r,{...options,fontPercent:200}),true,'vertical reading at 200% permitted if unclipped');
const desktop=()=>({sameArticle:true,adjacentSiblings:true,visible:true,cover:{left:100,top:500,right:250,bottom:720},reason:{left:60,top:740,right:400,bottom:900}});
assert.equal(validatePairs([desktop(),desktop(),desktop()],{width:1440,fontPercent:100,viewportHeight:900}),true,'cover then reason desktop fixture passes');
r=[desktop(),desktop(),desktop()];r[0].reason.top=746;assert.equal(validatePairs(r,{width:1440,fontPercent:100,viewportHeight:900}),false,'desktop gap over 24 fails');
// The 701–999px CSS branch puts the reason beside the cover, not below it.
// Keep the mobile/desktop fixtures above; exercise this branch and its edges.
const tablet = (width, index=0) => ({
  sameArticle:true, adjacentSiblings:true, visible:true,
  cover:{left:56,top:200+index*320,right:206,bottom:420+index*320},
  reason:{left:230,top:280+index*320,right:width-56,bottom:440+index*320}
});
const tabletRows = width => [0,1,2].map(index=>tablet(width,index));
const tabletOptions = {width:800,fontPercent:100,viewportHeight:900};
for (const width of [701,800,999]) {
  assert.equal(validatePairs(tabletRows(width),{...tabletOptions,width}),true,'side-by-side branch valid at '+width+'px');
}
r=tabletRows(800);r[0].reason.left=231;
assert.equal(validatePairs(r,tabletOptions),false,'side-by-side gap over 24px fails');
r=tabletRows(800);r[0].reason.left=204;
assert.equal(validatePairs(r,tabletOptions),false,'side-by-side reason overlaps cover horizontally');
r=tabletRows(800);r[0].reason={left:56,top:440,right:744,bottom:620};
assert.equal(validatePairs(r,tabletOptions),false,'vertical stack is not the 800px side-by-side contract');
r=tabletRows(800);r[0].reason.right=802;
assert.equal(validatePairs(r,tabletOptions),false,'side-by-side overflow beyond the viewport fails');
r=tabletRows(800);r[0].reason.bottom=1400;
assert.equal(validatePairs(r,tabletOptions),false,'side-by-side pair taller than viewport fails at 100%');
assert.equal(validatePairs(r,{...tabletOptions,fontPercent:200}),true,'side-by-side long text can scroll vertically at 200%');
console.log('PASS 22 C2 layout-contract unit cases (fixture checks, no browser executed).');
