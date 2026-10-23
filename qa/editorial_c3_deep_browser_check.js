#!/usr/bin/env node
'use strict';
const {observeLocalLcp,readLocalLcp,summarizeLocalLcp}=require('./editorial-c3-local-performance.cjs');
// CI-only local-checkout runner. Never navigates to an external origin or executes
// out-of-scope production pages. Six routes x three widths x two text sizes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {chromium}=require('playwright');
const {measureContrast,measureImages}=require('./editorial-c3-deep-browser-helpers.cjs');
const {validateDeepFonts,validateDeepContent}=require('./editorial-c3-deep-contract.cjs');
const {readPaintedFonts}=require('./editorial-c3-readiness.cjs');
const {navigationSnapshot,validateNavigation}=require('./editorial-c3-navigation-contract.cjs');
const {validateRouteStructure}=require('./editorial-c3-route-structure-contract.cjs');
const expected=require('./editorial-c3-deep-content.json');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts/editorial-c3-deep');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'qa/editorial-study-c3/assets/deep-font-manifest.json')));
for(const f of manifest.fonts){if(createHash('sha256').update(fs.readFileSync(path.join(root,'qa/editorial-study-c3/assets',f.file))).digest('hex')!==f.sha256)throw Error('Union font hash mismatch: '+f.file);}
for(const p of manifest.pages){if(createHash('sha256').update(fs.readFileSync(path.join(root,p.route))).digest('hex')!==p.sha256)throw Error('Font corpus page hash mismatch: '+p.route);}
fs.mkdirSync(out,{recursive:true});
const widths=[320,390,1440],fontPercents=[100,200];
const report={sourceSha:process.env.QA_SOURCE_SHA||null,checkoutSha:null,widths,fontPercents,expectedCases:36,cases:[],roundTrips:[],errors:[],passed:false,visualApproval:false,
 method:'Fresh isolated context per render. All external HTTP/WebSocket requests blocked. Native disclosures are opened with Enter, closed with Space, reopened with Enter. Every visible glyph after opening is checked via CDP. No production saved-memory page is executed; its unchanged local route is checked as a static HTTP response only.'};
try{report.checkoutSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch(_){}
const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))throw Error('Outside checkout');if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404);return res.end();}if(!fs.realpathSync(file).startsWith(root+path.sep))throw Error('Outside checkout');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch(_){res.writeHead(403);res.end();}});
function prohibitStorage(){
  const accesses=[];Object.defineProperty(window,'__qaStorageAccesses',{value:accesses});
  const deny=name=>{accesses.push(name);window.__qaRecordStorage(name).catch(()=>{});throw new Error('Draft attempted prohibited storage access: '+name);};
  for(const key of ['localStorage','sessionStorage','indexedDB','caches'])Object.defineProperty(window,key,{configurable:false,get(){return deny(key);}});
  Object.defineProperty(document,'cookie',{configurable:false,get(){return deny('cookie read');},set(){deny('cookie write');}});
  Object.defineProperty(navigator,'storage',{configurable:false,get(){return deny('navigator.storage');}});
}
async function fresh(browser,origin,row,width=390){
  const context=await browser.newContext({viewport:{width,height:width<=390?844:900},reducedMotion:'reduce',serviceWorkers:'block'});
  row.storageAttempts=[];
  await context.exposeBinding('__qaRecordStorage',(source,name)=>{row.storageAttempts.push({url:source.frame.url(),name});});
  await context.addInitScript(prohibitStorage);
  await context.addInitScript(observeLocalLcp);
  await context.route('**/*',r=>{const u=r.request().url();if(new URL(u).origin===origin)return r.continue();row.externalRequests.push(u);return r.abort('blockedbyclient');});
  await context.routeWebSocket('**/*',ws=>{row.externalRequests.push(ws.url());ws.close();});
  const page=await context.newPage();
  page.on('pageerror',e=>row.pageErrors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(origin+'/')&&r.status()>=400)row.failedLocalRequests.push({url:r.url(),status:r.status()});});
  page.on('requestfailed',r=>{if(r.url().startsWith(origin+'/'))row.failedLocalRequests.push({url:r.url(),failure:r.failure()});});
  page.on('request',r=>{if(r.url().startsWith(origin+'/'))row.pageRequests.push({url:r.url(),type:r.resourceType()});});
  return {context,page};
}
async function waitForLocalReady(page){
  const result=await page.evaluate(async()=>{
    const bounded=(promise,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error(label+' readiness timeout')),15000))]);
    for(const img of document.images)img.loading='eager';
    await bounded(document.fonts.ready,'font');
    await Promise.all([...document.images].map(img=>bounded(img.decode(),'image '+img.getAttribute('src'))));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {images:document.images.length,fonts:document.fonts.status};
  });
  await page.waitForLoadState('networkidle',{timeout:15000});
  return result;
}
async function twoPaintFrames(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function actualFonts(context,page,profile="books"){
  const inventory=await page.evaluate(()=>{
    window.__qaFontView={x:scrollX,y:scrollY,focus:document.activeElement};
    const list=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
    while((n=walker.nextNode())){const el=n.parentElement;if(!n.textContent.trim()||!el||['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)||!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;const range=document.createRange();range.selectNode(n);if(![...range.getClientRects()].some(r=>r.width&&r.height))continue;list.push(n);}
    return list.map((node,id)=>{const el=node.parentElement;
      const role=el.closest('h1,h2,h3')?'heading':el.closest('.brand-name')?'brand':el.closest('.masthead nav')?'nav':el.closest('summary')?'summary':el.closest('strong')?'emphasis':el.closest('.actions > a,.route-primary')?'action':el.closest('.credit,.route-source,.route-caution,.street-photo figcaption')?'credit':el.closest('.selection-reason,.book-fact,.connection-copy,.source-copy,.author,.shelf-lead,.book-meta,.route-lead')?'body':'other';
      const span=document.createElement('span');span.dataset.qaFontRun=String(id);node.replaceWith(span);span.appendChild(node);const css=getComputedStyle(span);
      return {id,role,isSkip:!!el.closest('.skip'),text:node.textContent.trim().slice(0,180),family:css.fontFamily,weight:css.fontWeight,fontSynthesis:css.fontSynthesis};
    });
  });
  await page.evaluate(()=>document.fonts.ready);await twoPaintFrames(page);
  const session=await context.newCDPSession(page),rows=[];let restoration=null;
  try{await session.send('DOM.enable');await session.send('CSS.enable');const {root:doc}=await session.send('DOM.getDocument');
    for(const item of inventory){
      const selector='[data-qa-font-run="'+item.id+'"]';
      const prepare=async()=>{await page.locator(selector).evaluate(el=>{const skip=el.closest('.skip');if(skip)skip.focus();else el.scrollIntoView({block:'center',inline:'nearest'});});await page.evaluate(()=>document.fonts.ready);await twoPaintFrames(page);};
      if(item.isSkip)await prepare();
      const {nodeId}=await session.send('DOM.querySelector',{nodeId:doc.nodeId,selector});
      const evidence=await readPaintedFonts(async()=>{const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});return fonts.filter(f=>f.glyphCount>0);},prepare,3);
      rows.push({...item,...evidence});
    }
  }finally{await session.detach();restoration=await page.evaluate(()=>{document.querySelectorAll('[data-qa-font-run]').forEach(el=>el.replaceWith(...el.childNodes));const state=window.__qaFontView;if(state?.focus===document.body){const old=document.body.getAttribute('tabindex');document.body.tabIndex=-1;document.body.focus({preventScroll:true});if(old===null)document.body.removeAttribute('tabindex');else document.body.setAttribute('tabindex',old);}else if(state?.focus?.isConnected)state.focus.focus({preventScroll:true});if(state)scrollTo(state.x,state.y);const result={focusRestored:!state||document.activeElement===state.focus,scrollRestored:!state||(Math.abs(scrollX-state.x)<1&&Math.abs(scrollY-state.y)<1)};result.passed=result.focusRestored&&result.scrollRestored;delete window.__qaFontView;return result;});await twoPaintFrames(page);}
  return {passed:validateDeepFonts(rows,profile)&&restoration?.passed,rows,restoration,method:'Temporary unstyled inline spans isolate each original visible text node, including mixed-weight parents; removed before screenshots/geometry. Real custom CDP font for every nonzero glyph. getComputedStyle fontSynthesis must be none; empty never accepted.'};
}
function contentSnapshot(){
  const text=sel=>[...document.querySelectorAll(sel)].map(e=>e.textContent.trim());const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
  const unresolvedAria=[...document.querySelectorAll('[aria-labelledby],[aria-describedby]')].flatMap(e=>[e.getAttribute('aria-labelledby'),e.getAttribute('aria-describedby')].filter(Boolean).flatMap(s=>s.split(/\s+/))).filter(id=>!document.getElementById(id));
  return {paragraphs:text('main p'),headingTexts:text('main h2,main h3'),captions:text('main figcaption'),allLinks:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),noindex:!!document.querySelector('meta[name="robots"][content="noindex,nofollow"]'),mainCount:document.querySelectorAll('main').length,h1Count:document.querySelectorAll('h1').length,title:document.querySelector('h1')?.textContent.trim(),covers:[...document.querySelectorAll('main img')].map(e=>e.getAttribute('src')),reasons:text('.selection-reason'),credits:text('p.credit'),relatedLinks:[...document.querySelectorAll('.related-book h3 a,.shelf-book h2 a')].map(a=>a.getAttribute('href')),detailsCount:document.querySelectorAll('details').length,backHref:document.querySelector('.back,.route-back')?.getAttribute('href'),brandHref:document.querySelector('.brand')?.getAttribute('href'),originalHref:document.querySelector('.original-page a')?.getAttribute('href')||null,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),unresolvedAria,scripts:[...document.scripts].map(s=>s.src||'inline'),facades:document.querySelectorAll('form,button,input,textarea,[data-memory-note]').length,eagerMedia:document.querySelectorAll('iframe,audio,video').length,remoteResources:[...document.querySelectorAll('img[src],script[src],link[rel="stylesheet"][href],link[rel="preload"][href]')].map(e=>e.src||e.href).filter(url=>new URL(url).origin!==location.origin),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior,animations:document.getAnimations().filter(a=>a.playState==='running').length};
}
const layoutSnapshot=()=>({width:innerWidth,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),passed:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)<=innerWidth+1});
async function disclosures(page,expectedCount){
  const rows=[],details=page.locator('details');
  for(let i=0;i<await details.count();i++){
    const d=details.nth(i),summary=d.locator('summary').first();const r={index:i,initiallyClosed:!await d.getAttribute('open').then(v=>v!==null)};
    await summary.focus();r.focused=await summary.evaluate(e=>document.activeElement===e);await page.keyboard.press('Enter');r.enterOpens=await d.evaluate(e=>e.open);
    r.contentVisible=await d.evaluate(e=>[...e.children].filter(n=>n.tagName!=='SUMMARY').length>0&&[...e.children].filter(n=>n.tagName!=='SUMMARY').every(n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})));
    await page.keyboard.press('Space');r.spaceCloses=await d.evaluate(e=>!e.open);await page.keyboard.press('Enter');r.reopens=await d.evaluate(e=>e.open);
    r.passed=r.initiallyClosed&&r.focused&&r.enterOpens&&r.contentVisible&&r.spaceCloses&&r.reopens;rows.push(r);
  }
  return {passed:rows.length===expectedCount&&rows.every(r=>r.passed),rows};
}
async function keyboardFocus(page){
  await page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();document.body.removeAttribute('tabindex');});
  const controls=page.locator('a[href],summary'),count=await controls.count(),rows=[];
  for(let i=0;i<count;i++){await page.keyboard.press('Tab');const r=await controls.nth(i).evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {text:e.textContent.trim(),focused:document.activeElement===e,visible:e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}),withinWidth:r.left>=-1&&r.right<=innerWidth+1,withinHeight:r.top>=-1&&r.bottom<=innerHeight+1,indicator:s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0};});r.passed=r.focused&&r.visible&&r.withinWidth&&r.withinHeight&&r.indicator;rows.push(r);}
  return {passed:count>0&&rows.every(r=>r.passed),rows};
}
async function localLinks(context,page,origin,cache){
  const rows=[];for(const href of await page.locator('a[href]').evaluateAll(a=>[...new Set(a.map(e=>e.href))])){const u=new URL(href);if(u.origin!==origin){rows.push({href,status:'external-not-requested',passed:true});continue;}if(cache.has(href)){rows.push({...cache.get(href),cached:true});continue;}
    let r;try{const response=await context.request.get(href,{maxRedirects:0,timeout:15000});let anchor=true;if(u.hash&&response.ok()){const html=await response.text();anchor=await page.evaluate(({html,id})=>!!new DOMParser().parseFromString(html,'text/html').getElementById(id),{html,id:decodeURIComponent(u.hash.slice(1))});}r={href,status:response.status(),anchor,passed:response.ok()&&anchor};await response.dispose();}catch(e){r={href,passed:false,error:e.message};}cache.set(href,r);rows.push(r);
  }return {passed:rows.length>0&&rows.every(r=>r.passed),rows,method:'Local HTTP/fragment only for routes outside C3; never executes their scripts or storage.'};
}
async function roundTrips(browser,origin){
  // Reuse six extra contexts only, not additional viewport matrices.
  for(const exp of expected){const r={route:exp.route,externalRequests:[],pageErrors:[],failedLocalRequests:[],pageRequests:[],errors:[],links:[],passed:false};report.roundTrips.push(r);let context,page;
    try{({context,page}=await fresh(browser,origin,r));await page.goto(origin+exp.route,{waitUntil:'networkidle'});r.initialReadiness=await waitForLocalReady(page);
      const targets=await page.locator('a[href]').evaluateAll(links=>[...new Set(links.map(a=>a.getAttribute('href')).filter(h=>h?.startsWith('/qa/editorial-study-c3/')&&h!==location.pathname))]);
      for(const href of targets){const item={href};const anchor=page.locator('a[href="'+href+'"]').first();await anchor.focus();await Promise.all([page.waitForURL(origin+href),page.keyboard.press('Enter')]);item.forwardReadiness=await waitForLocalReady(page);item.forward=page.url()===origin+href;
        if(href.includes('#'))item.target=await page.evaluate(()=>{const e=document.getElementById(decodeURIComponent(location.hash.slice(1)));return !!e&&e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});});else item.target=await page.locator('h1').count()===1;
        item.storageForward=await page.evaluate(()=>window.__qaStorageAccesses.slice());await page.goBack({waitUntil:'domcontentloaded'});item.backReadiness=await waitForLocalReady(page);item.back=page.url()===origin+exp.route;item.passed=item.forward&&item.target&&item.back&&!item.storageForward.length;r.links.push(item);
      }
      // The shelf's three local connection anchors are genuine keyboard paths.
      if(exp.route.includes('/shelves/')){await page.locator('details').evaluateAll(ds=>ds.forEach(d=>d.open=true));for(const href of ['#honnoniwa','#honda','#gou-gou-book']){const a=page.locator('a[href="'+href+'"]').first();await a.focus();await page.keyboard.press('Enter');const target=await page.evaluate(()=>{const e=document.getElementById(location.hash.slice(1)),b=e?.getBoundingClientRect();return !!e&&e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&b.top>=-1&&b.top<innerHeight;});await page.goBack({waitUntil:'domcontentloaded'});await waitForLocalReady(page);r.links.push({href,passed:target&&page.url()===origin+exp.route});}}
      r.storage=await page.evaluate(()=>window.__qaStorageAccesses.slice());r.passed=r.links.length>0&&r.links.every(l=>l.passed)&&!r.storage.length&&!r.storageAttempts.length&&!r.externalRequests.length&&!r.pageErrors.length&&!r.failedLocalRequests.length;
    }catch(e){r.errors.push(e.stack||String(e));}finally{if(context)await context.close();if(r.errors.length)r.passed=false;save();console.log((r.passed?'PASS':'FAIL')+' deep round trips '+exp.route);}
  }
}
(async()=>{let browser;try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;report.origin=origin;
  browser=await chromium.launch({headless:true,...((process.env.CHROMIUM_EXECUTABLE_PATH||process.env.CHROMIUM_PATH)?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||process.env.CHROMIUM_PATH}:{})});const cache=new Map();
  for(const exp of expected)for(const width of widths)for(const fontPercent of fontPercents){const r={route:exp.route,width,fontPercent,externalRequests:[],pageErrors:[],failedLocalRequests:[],pageRequests:[],errors:[],passed:false};report.cases.push(r);let context,page;
    try{({context,page}=await fresh(browser,origin,r,width));const response=await page.goto(origin+exp.route,{waitUntil:'networkidle',timeout:30000});r.navigation={passed:response?.ok(),status:response?.status()};
      r.localNavigationLcp=summarizeLocalLcp(await page.evaluate(readLocalLcp));
      if(fontPercent===200)await page.evaluate(()=>{const sizes=[...document.querySelectorAll('*')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const [e,s] of sizes)if(Number.isFinite(s))e.style.setProperty('font-size',s*2+'px','important');});await page.evaluate(()=>document.fonts.ready);
      r.initialReadiness=await waitForLocalReady(page);await page.evaluate(()=>scrollTo(0,0));await twoPaintFrames(page);
      r.navigationItems=await page.evaluate(navigationSnapshot);r.navigationItems.passed=validateNavigation(r.navigationItems,exp.route);
      r.content=await page.evaluate(contentSnapshot);r.content.passed=validateDeepContent(r.content,exp);r.images=await page.evaluate(measureImages);
      for(const image of r.images.rows)if(image.src.endsWith('/9784048532587.webp')){image.nativeSizePassed=image.renderedWidth<=image.naturalWidth+1&&image.renderedHeight<=image.naturalHeight+1;r.images.passed=r.images.passed&&image.nativeSizePassed;}
      if(exp.kind==='culture-film')r.images.passed=r.images.passed&&r.images.rows.filter(i=>i.src.endsWith('/assets/city-jinbocho-suzuran.jpg')).every(i=>!i.objectCropped&&!i.stretched);
      r.structure=await page.evaluate(kind=>{
        let hero=null;
        if(kind==='culture-film'){
          const photo=document.querySelector('.route-hero-photo'),pair=document.querySelector('.work-pair'),image=photo?.querySelector('img'),caption=photo?.querySelector('figcaption'),b=image?.getBoundingClientRect(),c=caption?.getBoundingClientRect(),p=pair?.getBoundingClientRect(),visible=e=>!!e&&e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
          hero={imageVisible:visible(image),captionVisible:visible(caption),caption:caption?.textContent.trim(),imageCount:document.querySelectorAll('img[src="/assets/city-jinbocho-suzuran.jpg"]').length,imageTop:b?.top,imageBottom:b?.bottom,imageLeft:b?.left,imageRight:b?.right,captionFontSize:caption?parseFloat(getComputedStyle(caption).fontSize):null,captionLineHeight:caption?parseFloat(getComputedStyle(caption).lineHeight):null,captionLetterSpacing:caption?getComputedStyle(caption).letterSpacing:null,captionBottom:c?.bottom,pairTop:p?.top,width:b?.width,height:b?.height};
        }
        if(kind==='culture-outings'){const headings=[...document.querySelectorAll('.outing-stop h2')];hero={type:'typographic',headingTexts:headings.map(e=>e.textContent.trim()),sizes:headings.map(e=>parseFloat(getComputedStyle(e).fontSize)),mainImageCount:document.querySelectorAll('main img').length};}
        return {hero,viewportHeight:innerHeight};
      },exp.kind);
      r.structure.passed=validateRouteStructure(r.structure,{kind:exp.kind,width,fontPercent,viewportHeight:r.structure.viewportHeight});
      r.closedLayout=await page.evaluate(layoutSnapshot);r.closedContrast=await page.evaluate(measureContrast);
      const prefix=exp.route.split('/').at(-1).replace('.html','')+'-'+width+'-'+fontPercent;
      r.firstViewportScreenshot=prefix+'-first-viewport.png';await page.screenshot({path:path.join(out,r.firstViewportScreenshot),fullPage:false});r.closedScreenshot=prefix+'-fullpage.png';await page.screenshot({path:path.join(out,r.closedScreenshot),fullPage:true});
      r.disclosures=await disclosures(page,exp.detailsCount);await page.evaluate(()=>document.fonts.ready);r.studyFont=await actualFonts(context,page,exp.kind||"books");
      r.publisherNames=await page.evaluate(()=>{const rows=[...document.querySelectorAll('.publisher-name')].map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,nowrap:getComputedStyle(el).whiteSpace==='nowrap',visible:el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}),withinWidth:r.width>0&&r.left>=-1&&r.right<=innerWidth+1};});return {rows};});
      r.publisherNames.passed=JSON.stringify(r.publisherNames.rows.map(r=>r.text))===JSON.stringify(exp.publisherNames)&&r.publisherNames.rows.every(r=>r.nowrap&&r.visible&&r.withinWidth);r.openLayout=await page.evaluate(layoutSnapshot);r.openContrast=await page.evaluate(measureContrast);r.links=await localLinks(context,page,origin,cache);r.safeFocus=await keyboardFocus(page);
      if(width===390&&fontPercent===100&&exp.detailsCount>0){r.openScreenshot=prefix+'-disclosures-open.png';await page.screenshot({path:path.join(out,r.openScreenshot),fullPage:true});}
      r.storage={accesses:await page.evaluate(()=>window.__qaStorageAccesses.slice())};r.storage.passed=r.storage.accesses.length===0&&r.storageAttempts.length===0;
      r.privacy={passed:r.externalRequests.length===0&&r.content.scripts.length===0&&!r.pageRequests.some(x=>x.type==='script'),externalRequestsBlocked:true,pageScriptElements:r.content.scripts.length,pageScriptRequests:r.pageRequests.filter(x=>x.type==='script')};r.runtime={passed:!r.pageErrors.length&&!r.failedLocalRequests.length};
      r.passed=['navigation','navigationItems','content','images','structure','closedLayout','closedContrast','disclosures','studyFont','openLayout','openContrast','links','safeFocus','publisherNames','storage','privacy','runtime'].every(k=>r[k]?.passed);
    }catch(e){r.errors.push(e.stack||String(e));}finally{if(context)await context.close().catch(e=>r.errors.push(e.message));if(r.errors.length)r.passed=false;save();console.log((r.passed?'PASS':'FAIL')+' deep '+exp.route+' '+width+' '+fontPercent+'%');}
  }
  await roundTrips(browser,origin);report.passed=report.cases.length===36&&report.cases.every(r=>r.passed)&&report.roundTrips.length===6&&report.roundTrips.every(r=>r.passed);
}catch(e){report.errors.push(e.stack||String(e));}finally{if(browser)await browser.close();if(server.listening)await new Promise(resolve=>server.close(resolve));if(report.errors.length)report.passed=false;save();}
console.log((report.passed?'PASS':'FAIL')+' C3 deep pages '+report.cases.filter(r=>r.passed).length+'/36; actual screenshot review still pending.');if(!report.passed)process.exitCode=1;
})().catch(e=>{report.errors.push(e.stack||String(e));save();console.error(e);process.exitCode=1;});
