#!/usr/bin/env node
'use strict';
// CI-only render evidence. This script starts a server for THIS checkout; no remote origin override.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'artifacts/editorial-preview-v4');
fs.mkdirSync(out, {recursive: true});
const widths = [320, 390, 430, 768, 1440];
const routes = ['/qa/editorial-preview-v4/index.html', '/qa/editorial-preview-v4/outings.html',
  '/qa/editorial-preview-v4/books/naruse-wa-tenka-wo-toriniiku.html', '/qa/editorial-preview-v4/books/omowazu-kangaechau.html',
  '/qa/editorial-preview-v4/shelves/ordinary-day-curiosities.html', '/qa/editorial-preview-v4/shelves/after-a-good-day.html', '/qa/editorial-preview-v4/shelves/people-behind-the-place.html', '/qa/editorial-preview-v4/shelves/places-to-share.html'];
const fontPercents = [100, 200];
const expectedCases = routes.length * widths.length * fontPercents.length;
const report = {sourceSha: process.env.QA_SOURCE_SHA || null, checkoutSha: null,
  routes, widths, fontPercents, expectedCases, imageMethod: 'Decoded natural dimensions and CSS content-box/object-fit geometry only; no image/video playback or visual-semantic claim. Book covers must preserve natural proportions and remain fully visible. Photographs may intentionally use cover cropping.', passed: false, cases: [], errors: [],
  contrastMethod: 'WCAG AA text-node computed foreground over composited solid ancestor backgrounds. Unsupported painted backgrounds/effects are reported, never passed. Not a complete accessibility audit.'};
try { report.checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(); } catch (_) {}
const interactionReport = {sourceSha: report.sourceSha, checkoutSha: report.checkoutSha,
  method: 'Fresh page per host and keyboard key (Enter/Space). External HTTP and WebSocket requests remain blocked. Verifies iframe DOM creation, URL, no autoplay, idempotence, focus, and top-level navigation only; actual playback is neither attempted nor verified.',
  widths: [390], fontPercents: [100], keys: ['Enter', 'Space'], inventory: [], expectedCases: 0, cases: [], errors: [], passed: false};
function save() {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'interaction-report.json'), JSON.stringify(interactionReport, null, 2) + '\n');
}
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {res.writeHead(403); return res.end();}
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404); return res.end();}
    const real = fs.realpathSync(file);
    if (!real.startsWith(root + path.sep)) {res.writeHead(403); return res.end();}
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  } catch (_) {res.writeHead(400); res.end();}
});

// Serialized into the page, with no dependence on the Node environment.
function measureContrast() {
  const rows = [];
  // Resolve only simple absolute decorations in their own positioned ancestor.
  // Any unmodelled geometry remains unsupported, never silently passed.
  function pseudoBounds(p, ps) {
    const owner=getComputedStyle(p);
    const px=v=>/^[-\d.]+px$/.test(v)?parseFloat(v):null;
    if(ps.position!=='absolute'||owner.position==='static'||owner.transform!=='none'||(owner.zoom&&Number(owner.zoom)!==1)||ps.transform!=='none'||ps.boxShadow!=='none'||ps.filter!=='none'||ps.writingMode!=='horizontal-tb') return null;
    for(let a=p.parentElement;a;a=a.parentElement) if(getComputedStyle(a).transform!=='none'||(getComputedStyle(a).zoom&&Number(getComputedStyle(a).zoom)!==1)) return null;
    if(['marginLeft','marginRight','marginTop','marginBottom'].some(k=>px(ps[k])!==0)) return null;
    const w=px(ps.width),h=px(ps.height);
    if(w===null||h===null) return null;
    const extras=keys=>keys.reduce((n,k)=>n+(px(ps[k])??NaN),0);
    const width=w+(ps.boxSizing==='border-box'?0:extras(['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth']));
    const height=h+(ps.boxSizing==='border-box'?0:extras(['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth']));
    const r=p.getBoundingClientRect(),left=px(ps.left),right=px(ps.right),top=px(ps.top),bottom=px(ps.bottom);
    if(!Number.isFinite(width)||!Number.isFinite(height)||(left===null&&right===null)||(top===null&&bottom===null)) return null;
    const x=r.left+p.clientLeft-p.scrollLeft+(left===null?p.clientWidth-right-width:left);
    const y=r.top+p.clientTop-p.scrollTop+(top===null?p.clientHeight-bottom-height:top);
    return {left:x,top:y,right:x+width,bottom:y+height};
  }
  const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const media=[...document.querySelectorAll('img,video,canvas,svg')].map(el=>({el,rect:el.getBoundingClientRect()}));
  const rgba = value => {
    const m = value.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const n = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return n.length >= 3 ? [n[0], n[1], n[2], n.length > 3 ? n[3] : 1] : null;
  };
  const over = (a, b) => [0,1,2].map(i => a[i] * a[3] + b[i] * (1-a[3])).concat(1);
  const luminance = c => c.slice(0,3).map(v => {v /= 255; return v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4;}).reduce((s,v,i) => s+v*[.2126,.7152,.0722][i],0);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || ['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)) continue;
    const style = getComputedStyle(el), range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(r => r.width && r.height);
    if (!rects.length || style.visibility !== 'visible' || !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) continue;
    const row = {text:node.textContent.trim().slice(0,180),tag:el.tagName.toLowerCase(),className:el.className,
      color:style.color,fontSize:parseFloat(style.fontSize),fontWeight:style.fontWeight};
    const unsupported = [], backgrounds = [];
    let opaque = false, opaqueElement = null;
    for (let p=el; p; p=p.parentElement) {
      const s=getComputedStyle(p);
      if (parseFloat(s.opacity) !== 1) unsupported.push('ancestor opacity: '+s.opacity);
      if (s.filter !== 'none' || s.backdropFilter !== 'none' || s.mixBlendMode !== 'normal') unsupported.push('filter/backdrop/blending');
      if (!opaque) {
        if (s.backgroundImage !== 'none') unsupported.push('gradient/image background: '+s.backgroundImage);
        const c=rgba(s.backgroundColor);
        if (!c) unsupported.push('unsupported background color: '+s.backgroundColor);
        else {backgrounds.push(c); if (c[3] === 1) {opaque=true;opaqueElement=p;}}
      }
      for (const pseudo of ['::before','::after']) {
        const ps=getComputedStyle(p,pseudo);
        if (ps.content !== 'none' && ps.content !== 'normal' && ps.display !== 'none' && (ps.backgroundImage !== 'none' || (rgba(ps.backgroundColor)||[0,0,0,0])[3]>0)) {
          const bounds=pseudoBounds(p,ps);
          if(!bounds||rects.some(r=>intersects(r,bounds))) unsupported.push('painted pseudo-element: '+pseudo+(bounds?' overlaps text':' geometry unmodelled'));
        }
      }
    }
    // Text laid over a sibling photo/video cannot be proven from ancestor colors.
    for (const r of rects) {
      const x=r.left+r.width/2, y=r.top+r.height/2;
      if (media.some(({el:p,rect:m})=>m.width&&m.height&&x>=m.left&&x<=m.right&&y>=m.top&&y<=m.bottom&&!el.contains(p)&&(!opaqueElement||opaqueElement.contains(p)))) unsupported.push('potential overlapping image/video/canvas/SVG; manual paint-order review');
    }
    const fg=rgba(style.color);
    if (!fg) unsupported.push('unsupported foreground color');
    if (style.webkitTextFillColor && style.webkitTextFillColor !== style.color) unsupported.push('text fill differs from color');
    if (unsupported.length) {rows.push({...row,status:'unsupported',review:'manual-review-needed',reasons:[...new Set(unsupported)]});continue;}
    let bg=[255,255,255,1];
    for (const c of backgrounds.reverse()) bg=over(c,bg);
    const actual=over(fg,bg), l1=luminance(actual),l2=luminance(bg);
    const ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    const large=row.fontSize>=24 || (row.fontSize>=18.6666667 && parseInt(style.fontWeight,10)>=700);
    const required=large?3:4.5;
    rows.push({...row,background:bg.slice(0,3),effectiveForeground:actual.slice(0,3),ratio,required,status:ratio>=required?'pass':'fail'});
  }
  return {passed:rows.length>0 && rows.every(x=>x.status==='pass'),checked:rows.length,rows};
}

// Kept separate from the 70 untouched pre-interaction render cases.
async function checkInteractions(browser, origin) {
  for(const route of routes) {
    const baseline=report.cases.find(c=>c.route===route&&c.width===390&&c.fontPercent===100);
    if(!baseline?.invariants?.videoHosts) {interactionReport.errors.push('Missing video inventory: '+route);continue;}
    const hosts=baseline.invariants.videoHosts;
    interactionReport.inventory.push({route,hosts});
    interactionReport.expectedCases+=hosts.length*2;
    for(const host of hosts) for(const key of interactionReport.keys) {
      const row={route,hostIndex:host.index,videoId:host.videoId,key,width:390,fontPercent:100,
        passed:false,errors:[],externalRequests:[],pageErrors:[],failedLocalRequests:[],playbackVerified:false};
      interactionReport.cases.push(row);
      let context,page,phase='before activation';
      try {
        if(host.embedSrc||! /^[A-Za-z0-9_-]{11}$/.test(host.videoId)) throw new Error('Expected YouTube video ID without provider override');
        const expectedSrc='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(host.videoId)+'?playsinline=1&rel=0';
        row.expectedSrc=expectedSrc;
        context=await browser.newContext({viewport:{width:390,height:1100},reducedMotion:'reduce',serviceWorkers:'block'});
        await context.route('**/*', async r=>{
          const url=r.request().url();
          if(new URL(url).origin===origin) return r.continue();
          row.externalRequests.push({url,resourceType:r.request().resourceType(),phase,blocked:true});
          return r.abort('blockedbyclient');
        });
        await context.routeWebSocket('**/*',ws=>{row.externalRequests.push({url:ws.url(),resourceType:'websocket',phase,blocked:true});ws.close();});
        page=await context.newPage();
        page.on('pageerror',e=>row.pageErrors.push(e.message));
        page.on('response',r=>{if(r.url().startsWith(origin+'/')&&r.status()>=400) row.failedLocalRequests.push({url:r.url(),status:r.status()});});
        page.on('requestfailed',r=>{if(r.url().startsWith(origin+'/')) row.failedLocalRequests.push({url:r.url(),error:r.failure()});});
        const response=await page.goto(origin+route,{waitUntil:'networkidle',timeout:30000});
        if(!response?.ok()) throw new Error('Fresh page navigation failed');
        const initialURL=page.url();
        const button=page.locator('.v3-video').nth(host.index).locator('.v3-video-load');
        row.before=await page.evaluate(index=>{
          const host=document.querySelectorAll('.v3-video')[index];
          window.__qaOriginalVideoButton=host.querySelector('.v3-video-load');
          window.__qaCreatedFrames=0;
          // Counts every iframe insertion, including a duplicate subsequently removed.
          window.__qaFrameObserver=new MutationObserver(records=>{
            for(const record of records) for(const node of record.addedNodes) {
              if(node.nodeType!==Node.ELEMENT_NODE) continue;
              window.__qaCreatedFrames+=(node.matches('iframe')?1:0)+node.querySelectorAll('iframe').length;
            }
          });
          window.__qaFrameObserver.observe(document.body,{childList:true,subtree:true});
          return {iframeCount:document.querySelectorAll('iframe').length,state:host.dataset.videoState,
            nativeButton:window.__qaOriginalVideoButton?.tagName==='BUTTON',disabled:window.__qaOriginalVideoButton?.disabled};
        },host.index);
        if(row.externalRequests.length||row.before.iframeCount!==0||row.before.state!=='idle'||!row.before.nativeButton||row.before.disabled) throw new Error('Fresh-page privacy or native-button precondition failed');
        await button.focus();
        if(!await button.evaluate(el=>document.activeElement===el)) throw new Error('Load button did not receive keyboard focus');
        phase='after activation';
        await page.keyboard.press(key);
        await page.waitForFunction(index=>document.querySelectorAll('.v3-video')[index]?.dataset.videoState==='loaded',host.index,{timeout:5000});
        row.after=await page.evaluate(index=>{
          const host=document.querySelectorAll('.v3-video')[index], iframe=host.querySelector('iframe');
          return {iframeCount:document.querySelectorAll('iframe').length,hostIframeCount:host.querySelectorAll('iframe').length,
            state:host.dataset.videoState,src:iframe?.src,title:iframe?.title,allow:iframe?.allow,
            referrerPolicy:iframe?.referrerPolicy,focusedIframe:document.activeElement===iframe,
            buttonRemoved:!host.querySelector('.v3-video-load'),createdFrames:window.__qaCreatedFrames};
        },host.index);
        const src=new URL(row.after.src);
        row.creationPassed=row.after.iframeCount===1&&row.after.hostIframeCount===1&&row.after.createdFrames===1&&row.after.state==='loaded'&&row.after.src===expectedSrc&&row.after.buttonRemoved;
        row.noAutoplayPassed=!src.searchParams.has('autoplay')&&!/(^|;)\s*autoplay\b/i.test(row.after.allow||'');
        row.focusPassed=row.after.focusedIframe;
        // A repeated real key targets the now-focused iframe, not a second button.
        await page.keyboard.press(key);
        // Re-trigger the retained original click handler and remount to exercise
        // the script's loaded guard even though its button was removed from DOM.
        await page.evaluate(()=>{window.__qaOriginalVideoButton.click();window.V3_VIDEO_EMBED.mount(document);window.__qaOriginalVideoButton.click();});
        row.repeat=await page.evaluate(index=>({iframeCount:document.querySelectorAll('iframe').length,
          hostIframeCount:document.querySelectorAll('.v3-video')[index].querySelectorAll('iframe').length,
          createdFrames:window.__qaCreatedFrames}),host.index);
        row.repeatPassed=row.repeat.iframeCount===1&&row.repeat.hostIframeCount===1&&row.repeat.createdFrames===1;
        // The loader intentionally moves focus to the iframe. Confirm keyboard
        // navigation can leave that frame for the next visible parent-page control.
        const nextControl=await page.evaluate(index=>{
          const iframe=document.querySelectorAll('.v3-video')[index].querySelector('iframe');
          iframe.focus();
          const controls=[...document.querySelectorAll('a[href],button,input,select,textarea,iframe,[tabindex]')]
            .filter(el=>el.tabIndex>=0&&!el.disabled&&el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));
          const next=controls[controls.indexOf(iframe)+1];
          window.__qaNextControl=next;
          return next?{tag:next.tagName,href:next.getAttribute('href'),text:next.textContent.trim().slice(0,100)}:null;
        },host.index);
        if(!nextControl) throw new Error('No following visible keyboard control for focus navigation check');
        await page.keyboard.press('Tab');
        row.tabNavigation={expectedNext:nextControl,passed:await page.evaluate(()=>document.activeElement===window.__qaNextControl)};
        row.navigation={initialURL,finalURL:page.url(),passed:page.url()===initialURL};
        row.network={passed:row.externalRequests.every(r=>r.phase==='after activation'&&r.url===expectedSrc&&r.resourceType==='document'&&r.blocked),externalRequestsBlocked:true};
        row.runtime={passed:!row.pageErrors.length&&!row.failedLocalRequests.length};
        row.passed=row.creationPassed&&row.noAutoplayPassed&&row.focusPassed&&row.repeatPassed&&row.tabNavigation.passed&&row.navigation.passed&&row.network.passed&&row.runtime.passed;
      } catch(e) {row.errors.push(e.stack||String(e));}
      finally {
        if(context) await context.close().catch(e=>row.errors.push(e.message));
        if(row.errors.length) row.passed=false;
        save();
        console.log(`${row.passed?'PASS':'FAIL'} interaction ${route} host ${host.index} ${key} (iframe creation only)`);
      }
    }
  }
  interactionReport.passed=interactionReport.inventory.length===routes.length&&interactionReport.expectedCases>0&&interactionReport.cases.length===interactionReport.expectedCases&&interactionReport.cases.every(c=>c.passed)&&!interactionReport.errors.length;
}

(async () => {
  let browser;
  try {
    await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const origin='http://127.0.0.1:'+server.address().port;
    const checkedLinks=new Map();
    report.origin=origin;
    browser=await chromium.launch({headless:true,...((process.env.CHROMIUM_EXECUTABLE_PATH||process.env.CHROMIUM_PATH)?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||process.env.CHROMIUM_PATH}:{})});
    for (const route of routes) for (const width of widths) for (const fontPercent of fontPercents) {
      const result={route,width,fontPercent,passed:false,errors:[],externalRequests:[],pageErrors:[],failedLocalRequests:[]};
      report.cases.push(result);
      let context,page;
      try {
        context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce',serviceWorkers:'block'});
        await context.route('**/*', async r => {
          const url=r.request().url();
          if (new URL(url).origin===origin) return r.continue();
          result.externalRequests.push({url,resourceType:r.request().resourceType(),phase:'before interaction'});
          return r.abort('blockedbyclient');
        });
        await context.routeWebSocket('**/*', ws=>{result.externalRequests.push({url:ws.url(),resourceType:'websocket',phase:'before interaction'});ws.close();});
        page=await context.newPage();
        page.on('pageerror', e=>result.pageErrors.push(e.message));
        page.on('response', r=>{if(r.url().startsWith(origin+'/') && r.status()>=400) result.failedLocalRequests.push({url:r.url(),status:r.status()});});
        page.on('requestfailed', r=>{if(r.url().startsWith(origin+'/')) result.failedLocalRequests.push({url:r.url(),error:r.failure()});});
        const response=await page.goto(origin+route,{waitUntil:'networkidle',timeout:30000});
        result.invariants=await page.evaluate(origin=>{
          const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
          const duplicateIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
          const noindex=[...document.querySelectorAll('meta[name=robots]')].some(el=>/\bnoindex\b/i.test(el.content));
          const eagerFrames=[...document.querySelectorAll('iframe[src]')].map(el=>el.src);
          const remoteSources=[...document.querySelectorAll('img[src],script[src],link[rel=stylesheet][href],source[src],video[src],audio[src]')].map(el=>el.src||el.href).filter(url=>new URL(url,location.href).origin!==origin);
          const productionLinks=[...document.querySelectorAll('a[href]')].map(a=>a.href).filter(href=>/^https?:\/\/(www\.)?emotionbookstore\.com(?:\/|$)/i.test(href));
          const videoHosts=[...document.querySelectorAll('.v3-video')].map((el,index)=>({index,videoId:el.dataset.videoId||'',embedSrc:el.dataset.embedSrc||''}));
          return {noindex,duplicateIds,eagerFrames,remoteSources,productionLinks,videoHosts,passed:noindex&&!duplicateIds.length&&!eagerFrames.length&&!remoteSources.length&&!productionLinks.length};
        },origin);
        result.navigation={status:response.status(),passed:response.ok()};
        // Snapshot computed sizes first, then scale ALL text, including fixed-pixel text.
        if (fontPercent===200) await page.evaluate(()=>{
          const sizes=[...document.querySelectorAll('*')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);
          for(const [el,size] of sizes) if(Number.isFinite(size)) el.style.setProperty('font-size',size*2+'px','important');
        });
        await page.evaluate(()=>document.fonts.ready);
        result.images=await page.evaluate(async()=>{
          const rows=[];
          // Finish lazy image layout before capturing adjacent text rectangles.
          for(const img of document.images) img.loading='eager';
          const decodeErrors=new Map();
          await Promise.all([...document.images].map(async img=>{
            try {await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image decode timeout')),15000))]);}
            catch(e) {decodeErrors.set(img,e.message);}
          }));
          // Range rectangles cover text glyph runs, not broad parent boxes. This
          // permits contain letterboxing while catching cover intrusion into text.
          const textRects=[];
          const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          for(let node;(node=walker.nextNode());) {
            const el=node.parentElement;
            if(!node.textContent.trim()||!el||['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)||!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) continue;
            const range=document.createRange();range.selectNodeContents(node);
            for(const r of range.getClientRects()) if(r.width&&r.height) textRects.push({el,text:node.textContent.trim().slice(0,100),left:r.left,top:r.top,right:r.right,bottom:r.bottom});
          }
          for(const img of document.images) {
            const error=decodeErrors.get(img)||null;
            const box=img.getBoundingClientRect(),style=getComputedStyle(img);
            const px=k=>parseFloat(style[k])||0;
            const insetX=px('paddingLeft')+px('paddingRight')+px('borderLeftWidth')+px('borderRightWidth');
            const insetY=px('paddingTop')+px('paddingBottom')+px('borderTopWidth')+px('borderBottomWidth');
            const contentWidth=box.width-insetX,contentHeight=box.height-insetY;
            const naturalRatio=img.naturalWidth/img.naturalHeight;
            const actualRatio=contentWidth/contentHeight;
            const isBookCover=img.matches('.work-art img,.book-mat img,[data-full-cover]')||/\/book-covers\//.test(img.currentSrc||img.src);
            const declared=style.aspectRatio.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
            const expectedRatio=declared?Number(declared[1])/Number(declared[2]):null;
            const declaredBoxRatio=style.boxSizing==='border-box'?box.width/box.height:actualRatio;
            const declaredRatioPassed=expectedRatio===null||(Number.isFinite(declaredBoxRatio)&&Math.abs(declaredBoxRatio/expectedRatio-1)<=0.02);
            const fit=style.objectFit;
            const sx=contentWidth/img.naturalWidth,sy=contentHeight/img.naturalHeight;
            let paintedWidth=contentWidth,paintedHeight=contentHeight;
            if(['contain','cover','none','scale-down'].includes(fit)) {
              const scale=fit==='none'?1:fit==='cover'?Math.max(sx,sy):fit==='scale-down'?Math.min(1,sx,sy):Math.min(sx,sy);
              paintedWidth=img.naturalWidth*scale;paintedHeight=img.naturalHeight*scale;
            }
            const paintedRatio=paintedWidth/paintedHeight;
            const stretched=!Number.isFinite(paintedRatio)||Math.abs(paintedRatio/naturalRatio-1)>0.02;
            const objectCropped=paintedWidth>contentWidth+1||paintedHeight>contentHeight+1;
            const coverIssues=[];
            let workArtBounds=null, overlappingText=[];
            // Use percentage positioning to locate the actual painted object, not
            // letterboxing. Unsupported positioning/transforms never prove a cover safe.
            const position=style.objectPosition.match(/^(-?[\d.]+)%\s+(-?[\d.]+)%$/);
            let paintedBounds=null;
            if(position) {
              const left=box.left+px('borderLeftWidth')+px('paddingLeft')+(contentWidth-paintedWidth)*Number(position[1])/100;
              const top=box.top+px('borderTopWidth')+px('paddingTop')+(contentHeight-paintedHeight)*Number(position[2])/100;
              paintedBounds={left,top,right:left+paintedWidth,bottom:top+paintedHeight};
            } else if(isBookCover) coverIssues.push('unsupported object-position geometry');
            if(isBookCover) {
              const workArt=img.closest('.work-art');
              if(!workArt) coverIssues.push('book cover missing required .work-art container');
              if(workArt&&paintedBounds) {
                const r=workArt.getBoundingClientRect();
                // Require containment regardless of overflow:visible. Use the
                // inner border edge (padding box), not the image element box.
                workArtBounds={left:r.left+workArt.clientLeft,top:r.top+workArt.clientTop,
                  right:r.left+workArt.clientLeft+workArt.clientWidth,bottom:r.top+workArt.clientTop+workArt.clientHeight};
                if(paintedBounds.left<workArtBounds.left-1||paintedBounds.right>workArtBounds.right+1||paintedBounds.top<workArtBounds.top-1||paintedBounds.bottom>workArtBounds.bottom+1) coverIssues.push('painted book cover escapes .work-art bounds (including visible overflow)');
              }
              if(paintedBounds) {
                overlappingText=textRects.filter(r=>paintedBounds.left<r.right&&paintedBounds.right>r.left&&paintedBounds.top<r.bottom&&paintedBounds.bottom>r.top)
                  .map(({text,left,top,right,bottom})=>({text,left,top,right,bottom}));
                if(overlappingText.length) coverIssues.push('painted book cover overlaps text glyph-run rectangles');
              }
              if(fit==='cover') coverIssues.push('book cover uses cover fit; require contain or uncropped natural proportions');
              if(stretched) coverIssues.push('book cover stretched');
              if(objectCropped) coverIssues.push('book cover cropped by object-fit');
              for(let ancestor=img;ancestor;ancestor=ancestor.parentElement) {
                const s=getComputedStyle(ancestor);
                if(s.transform!=='none'||s.clipPath!=='none'||s.maskImage!=='none'||s.clip!=='auto'||(s.zoom&&Number(s.zoom)!==1)) coverIssues.push('unsupported transformed/masked/clipped cover geometry');
                if(ancestor===img||!paintedBounds) continue;
                const r=ancestor.getBoundingClientRect(),left=r.left+ancestor.clientLeft,top=r.top+ancestor.clientTop;
                if(['hidden','clip','scroll','auto'].includes(s.overflowX)&&(paintedBounds.left<left-1||paintedBounds.right>left+ancestor.clientWidth+1)) coverIssues.push('book cover clipped horizontally by ancestor');
                if(['hidden','clip','scroll','auto'].includes(s.overflowY)&&(paintedBounds.top<top-1||paintedBounds.bottom>top+ancestor.clientHeight+1)) coverIssues.push('book cover clipped vertically by ancestor');
              }
            }
            const ratioPassed=declaredRatioPassed&&!stretched&&(!isBookCover||coverIssues.length===0);
            rows.push({src:img.currentSrc||img.src,isBookCover,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,naturalRatio,
              renderedWidth:box.width,renderedHeight:box.height,contentWidth,contentHeight,
              paintedWidth,paintedHeight,paintedRatio,paintedBounds,workArtBounds,overlappingText,objectCropped,stretched,
              cssAspectRatio:style.aspectRatio,objectFit:fit,objectPosition:style.objectPosition,
              expectedRatio,actualRatio,declaredRatioPassed,coverIssues:[...new Set(coverIssues)],ratioPassed,error,
              passed:!error&&img.naturalWidth>0&&img.naturalHeight>0&&contentWidth>0&&contentHeight>0&&ratioPassed});
          }
          return {passed:rows.length>0&&rows.every(x=>x.passed),rows};
        });
        result.layout=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),passed:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)<=innerWidth+1}));
        const links=await page.evaluate(()=>[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.href))]);
        result.links={passed:true,rows:[]};
        for(const href of links) {
          const url=new URL(href);
          if(url.origin!==origin) {result.links.rows.push({href,status:'external-not-requested'});continue;}
          if(checkedLinks.has(href)) {const cached=checkedLinks.get(href);result.links.rows.push({...cached,cached:true});if(!cached.passed) result.links.passed=false;continue;}
          try {
            const response=await context.request.get(href,{maxRedirects:0,timeout:15000});
            const status=response.status();
            let anchor=null;
            if(url.hash && response.ok()) {
              const html=await response.text();
              anchor=await page.evaluate(({html,hash})=>{
                const doc=new DOMParser().parseFromString(html,'text/html');
                const id=decodeURIComponent(hash.slice(1));
                return !!doc.getElementById(id)||[...doc.querySelectorAll('[name]')].some(el=>el.getAttribute('name')===id);
              },{html,hash:url.hash});
            }
            const passed=response.ok()&&anchor!==false;
            const row={href,status,anchor,passed};
            result.links.rows.push(row);checkedLinks.set(href,row);
            if(!passed) result.links.passed=false;
            await response.dispose();
          } catch(e) {result.links.rows.push({href,passed:false,error:e.message});result.links.passed=false;}
        }
        // Geometry works for off-screen text too; no click, scroll, or provider interaction.
        result.contrast=await page.evaluate(measureContrast);
        // networkidle and decoded images already establish render readiness.
        result.privacy={passed:result.externalRequests.length===0,interactionPerformed:false};
        result.runtime={passed:result.pageErrors.length===0&&result.failedLocalRequests.length===0};
        result.passed=['navigation','invariants','images','layout','links','contrast','privacy','runtime'].every(k=>result[k].passed);
      } catch(e) {result.errors.push(e.stack||String(e));}
      finally {
        if(page) {
          const filename=path.basename(route,'.html')+'-'+width+'-'+fontPercent+'.png';
          try {await page.screenshot({path:path.join(out,filename),fullPage:true,timeout:30000});result.screenshot=filename;}
          catch(e) {result.errors.push('Screenshot: '+e.message);result.passed=false;}
        }
        if(context) await context.close().catch(e=>result.errors.push('Context close: '+e.message));
        if(result.errors.length) result.passed=false;
        save();
        console.log(`${result.passed?'PASS':'FAIL'} ${route} ${width}px ${fontPercent}%`);
      }
    }
    await checkInteractions(browser,origin);
    report.interactions={file:"interaction-report.json",passed:interactionReport.passed,expectedCases:interactionReport.expectedCases};
    report.passed=report.cases.length===expectedCases&&report.cases.every(x=>x.passed)&&interactionReport.passed;
  } catch(e) {report.errors.push(e.stack||String(e));}
  finally {
    if(browser) await browser.close().catch(e=>report.errors.push(e.message));
    if(server.listening) await new Promise(resolve=>server.close(resolve));
    if(report.errors.length) report.passed=false;
    save();
  }
  console.log(`${report.passed?'PASS':'FAIL'} editorial preview V4: ${report.cases.filter(x=>x.passed).length}/${expectedCases} cases. Evidence: ${out}`);
  if(!report.passed) process.exitCode=1;
})().catch(e=>{report.errors.push(e.stack||String(e));save();console.error(e);process.exitCode=1;});
