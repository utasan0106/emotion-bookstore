#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path'), crypto=require('crypto'), {execFileSync}=require('child_process');
const { chromium }=require('playwright');
const HERE=__dirname, PILOT=path.resolve(HERE,'../..');
const OUT=path.join(HERE,'preview_evidence.json');
const CHECK_ONLY=process.argv.includes('--check-only');
const arg=process.argv.slice(2).find(x=>x!=='--check-only');
if(!arg){ console.error('PREVIEW_V3_VERIFY_FAIL\n- exact Preview Tokyo Pilot root URL required'); process.exit(2); }
let root;
try{ root=new URL(arg); }catch(e){ console.error('PREVIEW_V3_VERIFY_FAIL\n- invalid URL'); process.exit(2); }
if(root.protocol!=='https:' || !/\/v3-prototype\/tokyo-pilot-01\/?$/.test(root.pathname)){
  console.error('PREVIEW_V3_VERIFY_FAIL\n- URL must be exact HTTPS /v3-prototype/tokyo-pilot-01/ Preview root'); process.exit(2);
}
const accessParams=new URLSearchParams(root.search);
root.search=''; root.hash=''; if(!root.pathname.endsWith('/')) root.pathname+='/' ;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const local=(rel)=>fs.readFileSync(path.join(PILOT,rel));
const exact=['index.html','pilot.css','pilot_content.js','pilot.js','assets/manuscript-cafe.png','assets/hachiko.jpg','assets/meguro-tapeworm.jpg'];
const hidden=['qa/human-test-v3/README.md','qa/browser_qa.js','MEDIA_ATTRIBUTION.md','MEDIA_LOCALIZATION_EVIDENCE.json','PRODUCT_BET_20260827.md'];
(async()=>{
 const browser=await chromium.launch();
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const page=await ctx.newPage(); const requests=[], pageErrors=[], consoleErrors=[];
 page.on('request',r=>requests.push(r.url())); page.on('pageerror',e=>pageErrors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text())});
 const first=new URL('index.html?participant=1&order=abc',root);
 for(const [k,v] of accessParams) first.searchParams.append(k,v);
 const response=await page.goto(first.toString(),{waitUntil:'load',timeout:45000});
 if(!response || !response.ok()) throw new Error('participant page HTTP '+(response&&response.status()));
 await page.waitForFunction(()=>document.querySelectorAll('.object-card').length===3);
 await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
 const visible=await page.evaluate(()=>({
   cards:document.querySelectorAll('.object-card').length,
   end:document.querySelector('.end-plate')?.innerText||'',
   body:document.body.innerText,
   media:[...document.querySelectorAll('.object-card img')].map(i=>({src:i.currentSrc,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,fit:getComputedStyle(i).objectFit}))
 }));
 const errors=[];
 if(visible.cards!==3) errors.push('expected exactly 3 objects');
 if(!visible.end.includes('この棚は、3つで終わりです。')) errors.push('neutral finite ending missing');
 for(const bad of ['次の3つ','また見たい','見終わりました']) if(visible.body.includes(bad)) errors.push('participant runtime contains '+bad);
 if(visible.media.length!==3 || visible.media.some(x=>!x.naturalWidth||x.fit!=='contain')) errors.push('Real Media decode/contain mismatch');
 const origin=root.origin;
 const external=[...new Set(requests.filter(u=>{try{return new URL(u).origin!==origin}catch{return true}}))];
 if(external.length) errors.push('external request(s) before Official Action: '+external.join(', '));
 if(pageErrors.length) errors.push('page errors: '+pageErrors.join(' | '));
 if(consoleErrors.length) errors.push('console errors: '+consoleErrors.join(' | '));
 const runtime={};
 for(const rel of exact){
   const u=new URL(rel,root).toString(); const r=await ctx.request.get(u,{timeout:30000});
   if(!r.ok()){ errors.push(rel+' HTTP '+r.status()); continue; }
   const bytes=Buffer.from(await r.body()); const localBytes=local(rel);
   runtime[rel]={remoteSha256:sha(bytes),localSha256:sha(localBytes),bytes:bytes.length};
   if(runtime[rel].remoteSha256!==runtime[rel].localSha256) errors.push(rel+' remote/local SHA mismatch');
 }
 const hiddenStatus={};
 for(const rel of hidden){ const r=await ctx.request.get(new URL(rel,root).toString(),{timeout:30000}); hiddenStatus[rel]=r.status(); if(r.status()===200) errors.push('internal file publicly delivered: '+rel); }
 // Rights are visible in details, but Official Action is never clicked.
 for(let i=1;i<=3;i++){
   await page.locator(`.object-card:nth-child(${i}) .open-button`).click();
   await page.waitForSelector('.detail-dialog[open]');
   const detail=await page.evaluate(()=>({id:document.querySelector('.detail-article')?.dataset.objectId,links:[...document.querySelectorAll('.rights-link')].map(a=>a.href)}));
   if(detail.id==='hachiko-taxidermy' && !detail.links.some(x=>x.includes('creativecommons.org/licenses/by-sa/3.0/'))) errors.push('Hachiko direct CC deed missing');
   if(detail.id==='meguro-tapeworm' && !detail.links.some(x=>x.includes('creativecommons.org/licenses/by-sa/2.0/'))) errors.push('Meguro direct CC deed missing');
   await page.keyboard.press('Escape');
 }
 let head=''; try{head=execFileSync('git',['rev-parse','HEAD'],{cwd:PILOT,encoding:'utf8'}).trim()}catch{}
 const evidence={schemaVersion:'tokyo-preview-v3.1-1',verdict:errors.length?'FAIL':'GO',verifiedAt:new Date().toISOString(),previewUrl:root.toString(),sourceGitHead:head,runtime,hiddenStatus,externalRequests:external,pageErrors,consoleErrors};
 if(!CHECK_ONLY) fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
 await ctx.close(); await browser.close();
 if(errors.length){ console.error('PREVIEW_V3_VERIFY_FAIL'); errors.forEach(x=>console.error('- '+x)); process.exit(1); }
 console.log(CHECK_ONLY?'PREVIEW_V3_CHECK_ONLY_GO':'PREVIEW_V3_VERIFY_GO'); console.log('preview='+root.toString()); console.log('source_git_head='+head); console.log('participant_files_sha_match='+exact.length); console.log('internal_files_public=0');
})().catch(e=>{ console.error('PREVIEW_V3_VERIFY_FAIL\n- '+(e&&e.stack||e)); process.exit(1); });
