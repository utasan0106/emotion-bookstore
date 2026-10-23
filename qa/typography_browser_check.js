#!/usr/bin/env node
'use strict';
// Run against the local checkout server; all non-local requests are blocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8765';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Local preview only');
const out=path.join(__dirname,'artifacts/typography');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{});
 const results=[];
 try{
  for(const width of [320,390,430,768,1440])for(const fontPercent of [100,200])for(const route of ['/','/discover/essays/kichijoji-advertising.html','/discover/essays/shimokitazawa-railway.html']){
   const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
   await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   const page=await context.newPage();await page.goto(origin+route,{waitUntil:'networkidle'});
   await page.evaluate(percent=>{document.documentElement.style.fontSize=percent+'%'},fontPercent);await page.evaluate(()=>document.fonts.ready);
   const layout=await page.evaluate(()=>{
    const heading=document.querySelector('#hd-feature-title')||document.querySelector('.dr-article-opening h1');
    const spans=[...heading.querySelectorAll('.hd-title-phrase,.dr-title-phrase')];
    return {text:heading.textContent,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,font:getComputedStyle(heading).fontFamily,weight:getComputedStyle(heading).fontWeight,publicGothic:document.body.classList.contains('public-gothic'),spans:spans.map(el=>{
     const r=document.createRange();r.selectNodeContents(el);const rects=[...r.getClientRects()];
     return {text:el.textContent,width:el.getBoundingClientRect().width,lines:new Set(rects.map(r=>Math.round(r.top))).size};
    })};
   });
   assert.ok(layout.scrollWidth<=width+1,`${route} ${width} ${fontPercent}% overflow`);
   assert.ok(layout.spans.length>=2,'Semantic title phrases must exist');
   if(fontPercent===100)for(const span of layout.spans)assert.equal(span.lines,1,`${span.text}: no character-level break at normal size`);
   // HOME stays frozen; only the two opted-in articles change to real Gothic Bold.
   // Actual rendered PostScript identity is checked by public_typography_browser_check.
   const bridged=route!=='/';
   assert.equal(layout.publicGothic,bridged,'Only approved article routes use the bridge');
   assert.ok(layout.font.includes(bridged?'EB Public Gothic':'EB Display'),'Preserve the route-specific display contract');
   assert.equal(layout.weight,bridged?'700':'500','Use the actual intended font weight');
   await page.screenshot({path:path.join(out,`${route==='/'?'home':path.basename(route,'.html')}-${width}-${fontPercent}.png`)});
   results.push({route,width,fontPercent,layout,passed:true});await context.close();
  }
 }finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2)+'\n');await browser.close();}
 console.log(`PASS ${results.length} responsive/text enlargement cases`);
})().catch(e=>{console.error(e);process.exitCode=1});
