'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const ready=require('./outings_state_ready');
const expected={url:'https://local.test/outings/?week=all&city=koenji&kind=stage&with=solo',filters:{week:'all',city:'koenji',kind:'stage',with:'solo'},ids:['koenji-dna2026','koenji-akame2026']};
function probe({url=expected.url,state='complete',form=true,hidden=false,filters=expected.filters,ids=expected.ids,painted=true}={}){
 const el={hidden,querySelector:selector=>{const name=selector.match(/name="([^"]+)"/)[1];return name in filters?{value:filters[name]}:null;}};
 const document={readyState:state,querySelector:()=>form?el:null,querySelectorAll:()=>ids.map(id=>({dataset:{eventCard:id},hidden:false,getClientRects:()=>painted?[{}]:[]}))};
 return vm.runInNewContext('('+ready.toString()+')(expected)',{document,location:{href:url},expected});
}
assert.equal(probe(),true);
for(const mutation of [{url:'https://local.test/outings/events/koenji-akame2026.html'},{state:'loading'},{form:false},{hidden:true},{ids:[]},{ids:[...expected.ids].reverse()},{ids:[...expected.ids,'extra']},{painted:false}])assert.equal(probe(mutation),false);
for(const key of Object.keys(expected.filters))assert.equal(probe({filters:{...expected.filters,[key]:'wrong'}}),false,'Wrong '+key+' cannot pass');
console.log('PASS outings readiness: exact URL, render readiness, four filters, complete ordered visible IDs; empty/wrong/stale states rejected');
