#!/usr/bin/env node
'use strict';
// Render only this checkout. Never contact the protected deployment or external providers.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts/home-cover');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const source=require('../tools/city-discovery-source');
const edition=require('../tools/weekly-home-ledger.json').weeks.at(-1);
const feature=source.items.find(item=>item.id===edition.topFeatureId);
const report={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),tree:cp.execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim(),sourceSha:process.env.QA_SOURCE_SHA||null,feature:edition.topFeatureId,viewports:[],limits:['Checkout rendering only; Vercel authentication, response headers and live external provider behavior are not tested.','Weather uses a local unavailable-data fixture. All external requests are blocked.']};
fs.mkdirSync(out,{recursive:true});
let server,browser;
async function serve(){
 const s=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/tokyo-weather'){res.writeHead(200,{'content-type':'application/json'});res.end('{"forecast":null,"stations":{}}');return;}
  let file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));
 });
 await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});return s;
}
(async()=>{
 server=await serve();const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{});
 for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.name==='mobile',hasTouch:viewport.name==='mobile',deviceScaleFactor:1,reducedMotion:'reduce'});
  const blocked=[],errors=[];let phase='home';
  await context.route('**/*',route=>{const url=route.request().url();if(new URL(url).origin!==origin){blocked.push({phase,url});return route.abort('blockedbyclient');}return route.continue();});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/',{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('.hd-feature img').waitFor({state:'visible'});
   const layout=await page.evaluate(()=>{
    const image=document.querySelector('.hd-feature img'),title=document.querySelector('#hd-feature-title'),primary=document.querySelector('.hd-feature .hd-primary');
    const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:title.textContent.trim(),titleBox:box(title),font:getComputedStyle(title).fontFamily,displayFontLoaded:document.fonts.check('500 32px "EB Display"'),readingFontLoaded:document.fonts.check('400 16px "EB Reading"'),image:{src:image.getAttribute('src'),objectFit:getComputedStyle(image).objectFit,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,declaredWidth:Number(image.getAttribute('width')),declaredHeight:Number(image.getAttribute('height')),render:box(image)},primary:{href:primary.getAttribute('href'),render:box(primary)},iframedProviders:document.querySelectorAll('iframe').length};
   });
   assert.ok(layout.scrollWidth<=viewport.width,'No horizontal overflow');
   assert.ok(layout.title.length>0&&layout.titleBox.width<=viewport.width,'Feature headline fits');
   assert.ok(layout.displayFontLoaded&&layout.readingFontLoaded&&layout.font.includes('EB Display'),'Local Japanese fonts must load');
   assert.ok(layout.image.src.startsWith('/assets/')&&layout.image.naturalWidth>0,'Local feature image loaded');
   assert.equal(layout.image.naturalWidth,layout.image.declaredWidth,'Image width metadata matches pixels');
   assert.equal(layout.image.naturalHeight,layout.image.declaredHeight,'Image height metadata matches pixels');
   const imageRatio=layout.image.render.width/layout.image.render.height;
   const naturalRatio=layout.image.naturalWidth/layout.image.naturalHeight;
   if(viewport.name==='desktop'&&['indies','mot-collection-light'].includes(edition.topFeatureId)){assert.equal(layout.image.objectFit,'cover','Reviewed desktop weekly cover uses a crop, never stretched pixels');assert.ok(Math.abs(imageRatio-2)<0.02,'Reviewed desktop weekly photograph keeps its intentional 2:1 crop');}
   else assert.ok(Math.abs(imageRatio-naturalRatio)<0.02,'Uncropped feature photograph is not stretched');
   assert.ok(layout.primary.render.height>=44,'Primary target has adequate height');
   assert.ok(layout.primary.render.y+layout.primary.render.height<=viewport.height,'Primary cover action is visible in the opening viewport');
   assert.equal(layout.iframedProviders,0,'External players remain unloaded');
   assert.equal(blocked.length,0,'Home must not request any external resource');
   if(feature){assert.equal(layout.primary.href,'/discover/'+feature.city+'/'+feature.id+'.html');assert.equal(await page.locator('.hd-feature .hd-detail').getAttribute('href'),feature.url);}
   await page.screenshot({path:path.join(out,viewport.name+'-cover.png')});

   // Exercise keyboard focus, repeat opening, Escape/Close and returned focus.
   const menu=page.locator('#siteMenuButton');await menu.focus();await page.keyboard.press('Enter');
   await page.locator('#siteMenu[open]').waitFor();await page.keyboard.press('Escape');
   assert.equal(await page.locator('#siteMenu').getAttribute('open'),null,'Escape closes menu');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'siteMenuButton','Focus returns after Escape');
   await page.keyboard.press('Enter');await page.locator('#siteMenu[open]').waitFor();await page.locator('#siteMenuClose').click();
   assert.equal(await page.locator('#siteMenu').getAttribute('open'),null,'Close closes repeated menu');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'siteMenuButton','Focus returns after Close');
   const primary=page.locator('.hd-feature .hd-primary');await primary.focus();
   const focus=await primary.evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:parseFloat(getComputedStyle(el).outlineWidth)}));
   assert.ok(focus.style!=='none'&&focus.width>=2,'Keyboard focus indicator remains visible');

   const follow=page.locator('.hd-footer nav[aria-label="公式X・note"]');await follow.scrollIntoViewIfNeeded();
   const links=await follow.locator('a').evaluateAll(elements=>elements.map(el=>({href:el.getAttribute('href'),rel:el.rel,target:el.target,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
   assert.deepEqual(links.map(a=>a.href),['https://x.com/emotion_books','https://note.com/emotion__books']);
   for(const link of links){assert.ok(link.rel.includes('noopener')&&link.rel.includes('noreferrer'));assert.equal(link.target,'_blank');assert.ok(link.height>=44);}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Footer has no overflow');
   await follow.locator('a').first().focus();await page.screenshot({path:path.join(out,viewport.name+'-footer.png')});
   const homeExternal=blocked.filter(request=>request.phase==='home');assert.equal(homeExternal.length,0,'No external request while viewing home/footer');

   phase='detail';await primary.click();await page.waitForURL(origin+layout.primary.href);
   assert.ok(await page.locator('main h1').isVisible(),'Primary link reaches a rendered detail');
   if(feature)assert.equal((await page.locator('main h1').innerText()).replace(/\s/g,''),feature.title.replace(/\s/g,''));
   await page.goBack({waitUntil:'networkidle'});assert.equal(new URL(page.url()).pathname,'/');
   assert.ok(await page.locator('.hd-feature .hd-primary').isVisible(),'Back returns to cover');
   assert.deepEqual(errors,[],'No page-script errors');
   report.viewports.push({...viewport,layout,focus,links,blockedExternalRequests:blocked,passed:true});
   console.log('PASS '+viewport.name+': rendered image/fonts, layout, official exits, keyboard/menu, detail and Back');
  }catch(error){await page.screenshot({path:path.join(out,viewport.name+'-failure.png')}).catch(()=>{});report.viewports.push({...viewport,passed:false,error:error.message,blockedExternalRequests:blocked});throw error;}
  finally{await context.close();}
 }
 report.passed=true;
})().catch(error=>{report.passed=false;report.error=error.message;console.error(error);process.exitCode=1;}).finally(async()=>{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
});
