'use strict';
const assert=require('node:assert/strict'),{items,validateNavigation}=require('./editorial-c3-navigation-contract.cjs');let n=0;
const good=(route='/qa/editorial-study-c3/index.html')=>({width:390,brand:{left:16,top:8,right:190,bottom:52},rows:items.map(([text,href],i)=>({text,href,current:href===route?'page':null,visible:true,size:14,box:{left:16+i*80,right:60+i*80,top:56,bottom:100,width:44,height:44}}))});
const run=(label,edit,pass=false,route='/qa/editorial-study-c3/index.html')=>{const d=good(route);edit(d);assert.equal(validateNavigation(d,route),pass,label);n++;};
run('two-row exact navigation',()=>{},true);run('film current only',()=>{},true,items[2][1]);run('outings current only',()=>{},true,items[3][1]);run('deep none current',()=>{},true,'/qa/editorial-study-c3/books/naruse.html');
for(const [k,v] of [['text','映画と本'],['href','#listen'],['current','page'],['visible',false],['size',12]])run(k,d=>d.rows[1][k]=v);run('missing fourth entry',d=>d.rows.pop());run('order drift',d=>d.rows.reverse());run('tiny target',d=>d.rows[0].box.height=43);run('outside width',d=>d.rows[3].box.right=400);run('brand overlap',d=>Object.assign(d.rows[0].box,{top:8,bottom:52}));run('nav overlap',d=>d.rows[1].box={...d.rows[0].box});run('wrong current',d=>d.rows[2].current=null,false,items[2][1]);
console.log('PASS '+n+' stable navigation fixtures; not browser evidence.');
