#!/usr/bin/env node
'use strict';
// Exact checkout, deterministic October 1 legacy and October 5 supply calendars. External navigation is intercepted.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts/outings');
const source=require('../tools/weekly-outings-source'),week=require('../outings/week');
const newlyReviewed=['kichijoji-tsuijuku','jinbocho-joyu','shimokita-rekishi','koenji-beyond'];
const octoberReviewed=['koenji-tomovsky','shimokita-bergson'];
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const report={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceSha:process.env.QA_SOURCE_SHA||null,asOf:'2026-10-01T09:00:00Z',supplyAsOf:'2026-10-05T00:00:00+09:00',viewports:[],limits:['Local checkout: external navigation targets are intercepted, not live provider availability or purchase tests.','Calendar is fixed to October 1 for the four legacy reviewed cards and October 5 for two October 2 additions and next-week supply; expiry is additionally checked at November 4 JST.','The existing Shimokitazawa publisher cover request is recorded and blocked; reviewed event flows must not add automatic external resources.']};
fs.mkdirSync(out,{recursive:true});let server,browser,discoveryOverride=null;
const emptyDiscovery=require('./freshness_workflow_check').generatedDiscoveryAt('2026-10-05T00:00:00+09:00');
(async()=>{
 server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/discover/'&&discoveryOverride){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(discoveryOverride);return;}
  if(pathname==='/api/tokyo-weather'){res.writeHead(200,{'content-type':'application/json'});res.end('{"forecast":null,"stations":{}}');return;}
  let file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch();
 for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
  discoveryOverride=null;
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'});
  const external=[],errors=[],missing=[];let phase='existing-city';
  await context.route('**/*',route=>{
   const req=route.request();if(new URL(req.url()).origin===origin)return route.continue();
   external.push({phase,url:req.url(),navigation:req.isNavigationRequest()});
   if(!req.isNavigationRequest())return route.abort('blockedbyclient');
   return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>External destination test fixture</title><p>Network blocked by the local verification harness.</p>'});
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)missing.push({url:r.url(),status:r.status()});});
  await page.clock.setFixedTime(new Date(report.asOf));
  const flows=[];
  const screen=async name=>{await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow: '+name);await page.screenshot({path:path.join(out,viewport.name+'-'+name+'.png'),fullPage:true});};
  try{
   await page.goto(origin+'/',{waitUntil:'networkidle'});
   await page.locator('#siteMenuButton').click();await page.locator('#siteMenu[open]').waitFor();
   assert.equal((await page.locator('a[href="/discover/#city-signals"]').innerText()).replace(/\s*→\s*$/,''),'街の動き');
   await page.locator('a[href="/discover/#city-signals"]').click();await page.waitForURL(origin+'/discover/#city-signals');
   assert.ok(await page.locator('#city-signals').isVisible());assert.equal(await page.locator('#city-signals h2').innerText(),'今の街の動き');
   flows.push({name:'month-neutral menu',url:page.url()});
   // All five Home city links remain usable and their local hero images load.
   for(const city of ['koenji','kichijoji','shimokitazawa','jinbocho','kiyosumi']){
    await page.goto(origin+'/',{waitUntil:'networkidle'});await page.locator('.hd-cities a[href="/discover/'+city+'/"]').click();await page.waitForURL(origin+'/discover/'+city+'/');await page.waitForLoadState('networkidle');
    assert.ok(await page.locator('main h1').innerText());
    const hero=page.locator('.city-panorama img');await hero.scrollIntoViewIfNeeded();await hero.evaluate(el=>el.decode());assert.ok(await hero.evaluate(el=>el.complete&&el.naturalWidth>0),'City image loaded: '+city);
    flows.push({name:'home city '+city,url:page.url()});
   }
   await page.getByRole('link',{name:'清澄庭園',exact:true}).click();await page.waitForLoadState('networkidle');await page.locator('[data-object-id="kiyosumi-garden"] .open-button').click();await page.locator('#detailDialog[open]').waitFor();
   await page.locator('#closeDialog').click();assert.equal(await page.locator('#detailDialog').getAttribute('open'),null);
   const fallback=page.locator('#cityCulturePaths a').nth(1);assert.equal(await fallback.innerText(),'ほかの街の催しを見る →');assert.equal(await fallback.getAttribute('href'),'./outings/');
   await fallback.scrollIntoViewIfNeeded();await screen('kiyosumi-route');await fallback.click();await page.waitForURL(origin+'/outings/');await page.waitForLoadState('networkidle');
   assert.equal(new URL(page.url()).search,'');assert.equal(await page.locator('select[name=city]').inputValue(),'');flows.push({name:'kiyosumi honest fallback',url:page.url()});
   phase='reviewed-outings';
   const published=source.events.filter(source.isPublishableEvent);
   assert.equal(await page.locator('[data-event-card]:visible').count(),week.select(published,{now:Date.parse(report.asOf)}).length);
   await screen('current-list');
   for(const id of [...newlyReviewed,...octoberReviewed]){
    if(octoberReviewed.includes(id))await page.clock.setFixedTime(new Date('2026-10-05T00:00:00+09:00'));
    const e=source.events.find(x=>x.id===id),next=week.dates(e).find(d=>d>='2026-10-01'),selectedWeek=week.monday(week.stamp(next));
    await page.goto(origin+'/outings/',{waitUntil:'networkidle'});
    await page.locator('select[name=week]').selectOption(selectedWeek);await page.locator('select[name=city]').selectOption(e.city);
    const card=page.locator('[data-event-card="'+id+'"]');assert.ok(await card.isVisible(),id+' appears in its actual week/city');await card.scrollIntoViewIfNeeded();await card.locator('img').evaluate(el=>el.decode());assert.ok(await card.locator('img').evaluate(el=>el.complete&&el.naturalWidth>0));
    await card.locator('[data-event-detail]').click();await page.waitForLoadState('networkidle');assert.equal(await page.locator('main h1').innerText(),e.title);
    assert.equal(await page.locator('.event-detail a.primary').getAttribute('href'),e.url);await screen(id);
    const popupPromise=page.waitForEvent('popup');await page.locator('.event-detail a.primary').click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');assert.equal(popup.url(),e.url);await popup.close();
    const detail=page.url();await page.goBack({waitUntil:'networkidle'});assert.equal(await page.locator('select[name=city]').inputValue(),e.city);assert.equal(await page.locator('select[name=week]').inputValue(),selectedWeek);flows.push({name:id,detail,official:e.url,back:true});
   }
   await page.goto(origin+'/outings/?week=2026-10-12',{waitUntil:'networkidle'});
   assert.equal(await page.locator('select[name=week] option:checked').innerText(),'来週 · 10/12〜10/18');
   assert.equal(await page.locator('[data-event-card]:visible').count(),5,'October 5 next-week inventory has five reviewed events');
   for(const id of octoberReviewed)assert.ok(await page.locator('[data-event-card="'+id+'"]').isVisible(),id+' is visible in next-week supply');
   // Full-page screenshots do not trigger off-screen lazy images on narrow screens.
   for(const img of await page.locator('[data-event-card]:visible img').all()){
    await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert.ok(await img.evaluate(el=>el.complete&&el.naturalWidth>0),'Every next-week card image loads');
   }
   await page.evaluate(()=>window.scrollTo(0,0));
   await screen('october-12-next-week');flows.push({name:'Oct 5 next week includes both October 2 additions',url:page.url(),count:5});
   // City-first layout and an explicit all-dates choice retain the current-week default.
   const allAsOf='2026-10-02T09:00:00+09:00';await page.clock.setFixedTime(new Date(allAsOf));
   await page.goto(origin+'/outings/',{waitUntil:'networkidle'});
   const filterOrder=await page.locator('#event-filters select').evaluateAll(els=>els.map(el=>el.name));
   assert.deepEqual(filterOrder,['city','week','kind','with']);
   const cityBox=await page.locator('select[name=city]').boundingBox(),periodBox=await page.locator('select[name=week]').boundingBox();
   assert.ok(cityBox.x<periodBox.x&&Math.abs(cityBox.y-periodBox.y)<2,'City is top left and period is immediately to its right');
   await page.locator('select[name=city]').focus();
   for(const name of ['week','kind','with']){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.name),name,'Keyboard follows visual filter order');}
   assert.equal(await page.locator('select[name=week]').inputValue(),week.monday(Date.parse(allAsOf)),'Default remains this week');
   await page.locator('select[name=week]').selectOption('all');
   const allExpected=week.select(published,{now:Date.parse(allAsOf),week:'all'}).map(e=>e.id);
   const visibleIds=()=>page.locator('[data-event-card]:visible').evaluateAll(els=>els.map(el=>el.dataset.eventCard));
   assert.deepEqual(await visibleIds(),allExpected,'All reviewed upcoming events appear once in next-date order');
   assert.equal(new URL(page.url()).searchParams.get('week'),'all');
   assert.equal(new Set(await visibleIds()).size,allExpected.length,'Multi-day events are not repeated');
   for(const img of await page.locator('[data-event-card]:visible img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert.ok(await img.evaluate(el=>el.complete&&el.naturalWidth>0));}

   for(const card of await page.locator('[data-event-card]:visible').all()){
    const title=await card.locator('h2').boundingBox(),dateBox=await card.locator('.event-date').boundingBox(),photoBox=await card.locator('figure').boundingBox();
    assert.ok(await card.locator('h2').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=24&&document.fonts.check('500 24px \"EB Display\"')),'Loaded Mincho title stays at least 24px');
    assert.ok(title.y+title.height<=photoBox.y&&dateBox.y+dateBox.height<=photoBox.y,'Title and complete date summary precede the contextual image');
    assert.ok((await card.locator('[data-next-date]').innerText()).includes('開催予定'),'Next date includes its meaning');
    const id=await card.getAttribute('data-event-card'),e=source.events.find(e=>e.id===id);
    assert.equal(await card.locator('.event-official').getAttribute('href'),e.url);
    assert.ok((await card.locator('figcaption').innerText()).match(/会場：|街の風景：/));
   }
   const firstCard=page.locator('[data-event-card]:visible').first();
   await firstCard.locator('.event-official').focus();await page.keyboard.press('Tab');
   assert.ok(await firstCard.locator('[data-event-detail]').evaluate(el=>el===document.activeElement),'Keyboard distinguishes official and internal actions');
   const officialUrl=await firstCard.locator('.event-official').getAttribute('href'),officialPopup=page.waitForEvent('popup');
   await firstCard.locator('.card-action').click();const officialPage=await officialPopup;await officialPage.waitForLoadState('domcontentloaded');assert.equal(officialPage.url(),officialUrl);await officialPage.close();
   await page.evaluate(()=>window.scrollTo(0,0));await screen('all-dates');
   await page.locator('select[name=city]').selectOption('koenji');await page.locator('select[name=kind]').selectOption('live');await page.locator('select[name=with]').selectOption('solo');
   const combined=week.select(published,{now:Date.parse(allAsOf),week:'all',city:'koenji',kind:'live',audience:'solo'}).map(e=>e.id);
   assert.deepEqual(await visibleIds(),combined,'All dates combines city, kind and companion with AND');
   await page.evaluate(()=>window.scrollTo(0,0));await screen('all-dates-koenji-live');
   const allListUrl=page.url();await page.reload({waitUntil:'networkidle'});assert.deepEqual(await visibleIds(),combined,'Shared all-dates URL restores filters');
   await page.locator('[data-event-card="koenji-tomovsky"] [data-event-detail]').click();await page.waitForLoadState('networkidle');
   assert.equal(new URLSearchParams(new URL(page.url()).searchParams.get('from')).get('week'),'all');
   assert.equal(await page.locator('[data-event-status]').innerText(),'次の開催予定 10/16','All dates detail does not claim a selected week or parse all as a date');
   const allDetailUrl=page.url();await page.goBack({waitUntil:'networkidle'});assert.equal(page.url(),allListUrl);assert.deepEqual(await visibleIds(),combined);
   for(const [name,value] of [['week','all'],['city','koenji'],['kind','live'],['with','solo']])assert.equal(await page.locator('select[name='+name+']').inputValue(),value,'Back retains '+name);
   await page.goForward({waitUntil:'networkidle'});assert.equal(page.url(),allDetailUrl);await page.locator('[data-event-back]').click();await page.waitForLoadState('networkidle');assert.equal(page.url(),allListUrl);assert.deepEqual(await visibleIds(),combined,'Detail return retains all four filters');
   await page.locator('select[name=with]').selectOption('children');assert.equal((await visibleIds()).length,0);assert.ok(await page.locator('#event-empty').isVisible());await screen('all-dates-empty');
   await page.goto(origin+'/outings/?kind=live',{waitUntil:'networkidle'});assert.equal(await page.locator('select[name=week]').inputValue(),'2026-10-05','Category-only entry still picks the nearest matching week, not all dates');
   await page.goto(origin+'/outings/?week=all',{waitUntil:'networkidle'});
   // A tab retained across the event's JST end date still keeps all selected and retires it.
   await page.clock.setFixedTime(new Date('2026-10-17T00:00:00+09:00'));await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('select[name=week]').inputValue(),'all');assert.ok(!(await visibleIds()).includes('koenji-tomovsky'));assert.ok((await visibleIds()).includes('shimokita-bergson'));
   await page.clock.setFixedTime(new Date('2026-11-04T00:00:00+09:00'));await page.reload({waitUntil:'networkidle'});assert.equal((await visibleIds()).length,0);assert.ok(await page.locator('#event-empty').isVisible(),'All dates cannot restore ended or unreviewed events');
   flows.push({name:'City-first all dates',asOf:allAsOf,count:allExpected.length,filterOrder,combined,back:true,forward:true,detailReturn:true,expiry:true});
   await page.clock.setFixedTime(new Date(report.asOf));
   await page.goto(origin+'/outings/?week=2026-10-05',{waitUntil:'networkidle'});assert.equal(await page.locator('[data-event-card]:visible').count(),5,'Next week has five reviewed events, without pending drafts');await screen('next-week');
   discoveryOverride=emptyDiscovery;await page.clock.setFixedTime(new Date('2026-10-05T00:00:00+09:00'));
   await page.goto(origin+'/',{waitUntil:'networkidle'});await page.locator('#siteMenuButton').click();await page.locator('a[href="/discover/#city-signals"]').click();await page.waitForURL(origin+'/discover/#city-signals');
   assert.ok(await page.locator('#city-signals').isVisible());assert.equal(await page.locator('#city-signals article').count(),0);assert.ok((await page.locator('#city-signals').innerText()).includes('現在、掲載できる街の動きはありません。'));
   await page.locator('#city-signals').scrollIntoViewIfNeeded();await screen('empty-signals');await page.locator('#city-signals a[href="/outings/"]').click();await page.waitForURL(origin+'/outings/');await page.waitForLoadState('networkidle');assert.equal(await page.locator('[data-event-card]:visible').count(),5,'Empty editorial signals do not imply no events');flows.push({name:'Oct 5 empty signal anchor and exit',url:page.url()});
   await page.clock.setFixedTime(new Date('2026-11-04T00:00:00+09:00'));await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-event-card]:visible').count(),0,'Expired events disappear');assert.ok(await page.locator('#event-empty').isVisible());
   for(const e of source.events.filter(e=>!source.isPublishableEvent(e)))assert.equal(await page.locator('[data-event-card="'+e.id+'"]').count(),0,'Pending has no runtime card');
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.ok(external.filter(x=>x.phase==='reviewed-outings').every(x=>x.navigation),'Reviewed outings and empty-state flows load no automatic external resources');
   const legacyCover='https://www.j-n.co.jp/wp/wp-content/uploads/2022/09/R978-4-408-55758-8.jpg';
   assert.ok(external.filter(x=>!x.navigation).every(x=>x.phase==='existing-city'&&x.url===legacyCover),'Only the existing city catalogue publisher cover may be requested; it is blocked in CI');
   report.viewports.push({...viewport,passed:true,flows,externalTargets:external,missing,errors});console.log('PASS '+viewport.name+': five cities, month-neutral menu, Kiyosumi fallback, four legacy + two October reviewed cards/official targets/Back, Oct 5 next-week supply and expiry');
  }catch(e){await page.screenshot({path:path.join(out,viewport.name+'-failure.png'),fullPage:true}).catch(()=>{});report.viewports.push({...viewport,passed:false,error:e.message,flows,external,missing,errors});throw e;}
  finally{await context.close();}
 }
 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const noJsPage=await noJs.newPage();await noJsPage.goto(origin+'/outings/?week=all',{waitUntil:'networkidle'});
 assert.equal(await noJsPage.locator('[data-event-card]:visible').count(),0);
 assert.ok(await noJsPage.locator('noscript').isVisible());
 for(const e of source.events.filter(source.isPublishableEvent)){
  if(await noJsPage.locator('noscript a[href="/outings/events/'+e.id+'.html"]').count())assert.ok((await noJsPage.locator('noscript').innerText()).includes(e.schedule),'No-JS complete schedule '+e.id);
 }
 await noJsPage.screenshot({path:path.join(out,'mobile-no-js.png'),fullPage:true});await noJs.close();
 report.noJs=true;
 report.passed=true;
})().catch(e=>{report.passed=false;report.error=e.message;console.error(e);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
