#!/usr/bin/env node
'use strict';
// CI-only render evidence. This script starts a server for THIS checkout; no remote origin override.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'artifacts/editorial-preview');
fs.mkdirSync(out, {recursive: true});
const widths = [320, 390, 430, 768, 1440];
const routes = ['/qa/editorial-preview/index.html', '/qa/editorial-preview/article.html'];
const report = {sourceSha: process.env.QA_SOURCE_SHA || null, checkoutSha: null,
  widths, fontPercents: [100, 200], passed: false, cases: [], errors: [],
  contrastMethod: 'WCAG AA text-node computed foreground over composited solid ancestor backgrounds. Unsupported painted backgrounds/effects are reported, never passed. Not a complete accessibility audit.'};
try { report.checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(); } catch (_) {}
function save() { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
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

(async () => {
  let browser;
  try {
    await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const origin='http://127.0.0.1:'+server.address().port;
    const checkedLinks=new Map();
    report.origin=origin;
    browser=await chromium.launch({headless:true,...((process.env.CHROMIUM_EXECUTABLE_PATH||process.env.CHROMIUM_PATH)?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||process.env.CHROMIUM_PATH}:{})});
    for (const route of routes) for (const width of widths) for (const fontPercent of [100,200]) {
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
          const noindex=[...document.querySelectorAll('meta[name=robots]')].some(el=>/\bnoindex\b/i.test(el.content));
          const eagerFrames=[...document.querySelectorAll('iframe[src]')].map(el=>el.src);
          const remoteSources=[...document.querySelectorAll('img[src],script[src],link[rel=stylesheet][href],source[src],video[src],audio[src]')].map(el=>el.src||el.href).filter(url=>new URL(url,location.href).origin!==origin);
          const productionLinks=[...document.querySelectorAll('a[href]')].map(a=>a.href).filter(href=>/^https?:\/\/(www\.)?emotionbookstore\.com(?:\/|$)/i.test(href));
          return {noindex,eagerFrames,remoteSources,productionLinks,passed:noindex&&!eagerFrames.length&&!remoteSources.length&&!productionLinks.length};
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
          for(const img of document.images) {
            img.loading='eager';
            let error=null;
            try {await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image decode timeout')),15000))]);} catch(e) {error=e.message;}
            const box=img.getBoundingClientRect(),style=getComputedStyle(img);
            const declared=style.aspectRatio.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
            // Explicit CSS ratios must actually size the image box. Uncropped
            // editorial/book images must not retain a huge HTML height attribute.
            const expectedRatio=declared?Number(declared[1])/Number(declared[2]):img.matches('.book-mat img,.feature-story img')?img.naturalWidth/img.naturalHeight:null;
            const actualRatio=box.width/box.height;
            const ratioPassed=expectedRatio===null||(Number.isFinite(actualRatio)&&Math.abs(actualRatio/expectedRatio-1)<=0.02);
            rows.push({src:img.currentSrc||img.src,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
              renderedWidth:box.width,renderedHeight:box.height,cssAspectRatio:style.aspectRatio,objectFit:style.objectFit,
              expectedRatio,actualRatio,ratioPassed,error,passed:!error&&img.naturalWidth>0&&img.naturalHeight>0&&box.width>0&&box.height>0&&ratioPassed});
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
    report.passed=report.cases.length===20&&report.cases.every(x=>x.passed);
  } catch(e) {report.errors.push(e.stack||String(e));}
  finally {
    if(browser) await browser.close().catch(e=>report.errors.push(e.message));
    if(server.listening) await new Promise(resolve=>server.close(resolve));
    if(report.errors.length) report.passed=false;
    save();
  }
  console.log(`${report.passed?'PASS':'FAIL'} editorial preview: ${report.cases.filter(x=>x.passed).length}/20 cases. Evidence: ${out}`);
  if(!report.passed) process.exitCode=1;
})().catch(e=>{report.errors.push(e.stack||String(e));save();console.error(e);process.exitCode=1;});
