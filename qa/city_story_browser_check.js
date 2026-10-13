#!/usr/bin/env node
'use strict';
// Exact local checkout only. External requests are recorded and blocked, never replayed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts/city-story');
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
(async()=>{
 server=await serve();const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{} )});
 for(const width of [390,1440])for(const javaScriptEnabled of [true,false]){
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled});
  const external=[],errors=[];await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const article='/discover/essays/creephyp-daisybar.html';
  await page.goto(origin+'/discover/shimokitazawa/',{waitUntil:'networkidle'});
  const requestsBeforeArticle=external.length;
  const entrance=page.locator('a[href="'+article+'"]');await entrance.focus();await page.keyboard.press('Enter');await page.waitForURL(origin+article);await page.waitForLoadState('networkidle');
  await page.evaluate(()=>document.fonts.ready);
  const fonts=await page.evaluate(()=>({display:document.fonts.check('500 32px "EB Display"'),reading:document.fonts.check('400 16px "EB Reading"'),heading:getComputedStyle(document.querySelector('h1')).fontFamily,titleWrap:getComputedStyle(document.querySelector('h1')).textWrap,titleWordBreak:getComputedStyle(document.querySelector('h1')).wordBreak}));
  assert.equal(fonts.titleWrap,'balance');assert.equal(fonts.titleWordBreak,'normal');assert.ok(fonts.display&&fonts.reading);assert.ok(fonts.heading.includes('EB Display'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await page.locator('main h1').count(),1);
  assert.equal(external.length,requestsBeforeArticle,'Article makes no automatic external request');
  await page.screenshot({path:path.join(out,width+'-'+(javaScriptEnabled?'js':'nojs')+'.png'),fullPage:true});
  const action=page.locator('#venue-action .official-exit');assert.equal(await action.getAttribute('href'),'https://daisybar.jp/schedule/');assert.equal(await action.getAttribute('target'),'_blank');
  await action.focus();const focus=await action.evaluate(el=>({active:el===document.activeElement,outline:getComputedStyle(el).outlineStyle}));assert.ok(focus.active);assert.equal(focus.outline,'solid');
  const popupPromise=page.waitForEvent('popup');await page.keyboard.press('Enter');const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded').catch(()=>{});await popup.close();
  assert.ok(external.some(url=>url==='https://daisybar.jp/schedule/'),'Official action attempted correct destination; provider content blocked by test');
  await page.locator('a[href="#research-sources"]').click();assert.ok(page.url().endsWith('#research-sources'));await page.goBack();assert.equal(page.url(),origin+article);
  for(const link of ['/discover/shimokitazawa/audio.html','/outings/?city=shimokitazawa','/discover/shimokitazawa/','/discover/essays/']){
   await page.locator('article a[href="'+link+'"]').last().click();await page.waitForURL(origin+link);await page.goBack({waitUntil:'networkidle'});assert.equal(page.url(),origin+article);
  }
  await page.reload({waitUntil:'networkidle'});assert.ok(await page.locator('#research-sources').isVisible());assert.deepEqual(errors,[]);
  report.viewports.push({width,javaScriptEnabled,passed:true,fonts,focus,externalRequests:external});await context.close();
 }
 report.passed=true;console.log('PASS 390/1440 × JS on/off: fonts, layout, keyboard, sources, official action, discovery and Back flows');
})().catch(error=>{report.passed=false;report.error=error.message;console.error(error);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
