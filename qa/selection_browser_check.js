#!/usr/bin/env node
'use strict';
// Exact local checkout only. External requests are recorded and blocked, never replayed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts/selection');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const report={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceSha:process.env.QA_SOURCE_SHA||null,viewports:[],limits:['Local checkout rendering; live provider playback and deployment headers are not tested.','All external requests are blocked and counted. Native browser Back may restore an open disclosure without application storage.']};
fs.mkdirSync(out,{recursive:true});let server,browser;
async function serve(){const s=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/tokyo-weather'){res.writeHead(200,{'content-type':'application/json'});res.end('{"forecast":null,"stations":{}}');return;}
 let file=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));
});await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});return s;}
const state=page=>page.evaluate(()=>({url:location.href,history:history.length,title:document.title,local:{...localStorage},session:{...sessionStorage},cookie:document.cookie,dataLayer:window.dataLayer??null,analytics:typeof window.v3Analytics,scripts:[...document.scripts].filter(el=>el.type!=='application/ld+json').length,iframes:document.querySelectorAll('iframe').length}));
(async()=>{
 server=await serve();const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{});
 for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const requests=[],external=[],errors=[];let phase='home';
  await context.route('**/*',route=>{const req=route.request(),record={phase,url:req.url(),method:req.method(),body:req.postData()};requests.push(record);if(new URL(req.url()).origin!==origin){external.push(record);return route.abort('blockedbyclient');}return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/',{waitUntil:'networkidle'});
   const entry=page.locator('a[href="/discover/selection/"]');await entry.scrollIntoViewIfNeeded();await entry.focus();
   await page.screenshot({path:path.join(out,viewport.name+'-home-entry.png')});
   phase='selection';await page.keyboard.press('Enter');await page.waitForURL(origin+'/discover/selection/');await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
   const before=await state(page);assert.equal(before.scripts,0);assert.equal(before.analytics,'undefined');assert.equal(before.dataLayer,null);assert.equal(before.iframes,0);
   assert.equal(await page.locator('details').getAttribute('open'),null);
   const fonts=await page.evaluate(()=>({display:document.fonts.check('500 32px "EB Display"'),reading:document.fonts.check('400 16px "EB Reading"')}));assert.ok(fonts.display&&fonts.reading,'Local Japanese fonts loaded');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Closed view has no overflow');
   await page.screenshot({path:path.join(out,viewport.name+'-closed.png'),fullPage:true});
   const summary=page.locator('details>summary');await summary.focus();
   const focus=await summary.evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:parseFloat(getComputedStyle(el).outlineWidth),height:el.getBoundingClientRect().height}));assert.ok(focus.style!=='none'&&focus.width>=2);assert.ok(focus.height>=44);
   const requestStart=requests.length;phase='toggle';
   await page.keyboard.press('Enter');assert.notEqual(await page.locator('details').getAttribute('open'),null);
   await page.keyboard.press('Space');assert.equal(await page.locator('details').getAttribute('open'),null);
   await page.keyboard.press('Enter');assert.notEqual(await page.locator('details').getAttribute('open'),null);
   await page.waitForLoadState('networkidle');
   assert.deepEqual(await state(page),before,'Opening/closing does not change URL, history, storage, cookie, title or analytics');
   assert.equal(requests.length,requestStart,'Opening and closing makes zero requests');
   assert.equal(await page.locator('.selection-works article').count(),3);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Open view has no overflow');
   await page.screenshot({path:path.join(out,viewport.name+'-open.png'),fullPage:true});
   const links=await page.locator('.selection-work-link').evaluateAll(els=>els.map(el=>({href:el.getAttribute('href'),rel:el.rel,height:el.getBoundingClientRect().height})));
   assert.deepEqual(links.map(x=>x.href),['/discover/short-films/musashino-green.html','/discover/jinbocho/gorilla-secret.html','/discover/jinbocho/morisaki.html']);
   for(const link of links){assert.ok(link.height>=44);assert.equal(link.rel,'noreferrer');}
   phase='detail';
   for(const [i,title] of ['緑あふれるまち 武蔵野市','秘密','森崎書店の日々'].entries()){
    if(await page.locator('details').getAttribute('open')===null)await summary.click();
    await page.locator('.selection-work-link').nth(i).click();await page.waitForURL(origin+links[i].href);await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('main h1').innerText(),title);assert.equal(await page.evaluate(()=>document.referrer),'','No selected-feature referrer is sent');
    assert.equal(new URL(page.url()).search,'');assert.equal(new URL(page.url()).hash,'');
    await page.goBack({waitUntil:'networkidle'});assert.equal(page.url(),origin+'/discover/selection/');
   }
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('details').getAttribute('open'),null,'Reload starts unselected');
   assert.deepEqual(await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage},cookie:document.cookie})),{local:before.local,session:before.session,cookie:before.cookie},'No saved selection after link and Back flows');
   assert.equal(external.length,0,'No external request in feature or existing destination initial states');assert.deepEqual(errors,[]);
   report.viewports.push({...viewport,passed:true,fonts,focus,links,toggleRequestCount:requests.slice(requestStart).filter(r=>r.phase==='toggle').length,externalRequestCount:external.length,selectionStateBefore:before,requestPaths:requests.map(r=>({phase:r.phase,path:new URL(r.url).pathname,method:r.method}))});
   console.log('PASS '+viewport.name+': fonts/layout, keyboard repeated toggle, zero request/state changes, three detail and Back flows');
  }catch(error){await page.screenshot({path:path.join(out,viewport.name+'-failure.png'),fullPage:true}).catch(()=>{});report.viewports.push({...viewport,passed:false,error:error.message,externalRequests:external});throw error;}
  finally{await context.close();}
 }
 report.passed=true;
})().catch(error=>{report.passed=false;report.error=error.message;console.error(error);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
