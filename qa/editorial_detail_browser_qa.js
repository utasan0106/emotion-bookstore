#!/usr/bin/env node
'use strict';
/* Dependency-free Chrome DevTools Protocol QA for the four 2026-10-30
   editorial detail pages. Uses an already-installed Chrome/Chromium only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'qa/evidence/editorial-details-20261030'));
const allPages = [
  ['bookstore-waits', 'works/bookstore-waits.html', 'bookstore-want.html'],
  ['cinema-rapsody', 'works/cinema-rapsody.html', 'baus.html'],
  ['magic-moment', 'works/magic-moment.html', 'cinema-rapsody.html'],
  ['yen-work', 'works/yen-work.html', 'baus.html'],
];
const pages = process.env.QA_PAGE ? allPages.filter(([id])=>id===process.env.QA_PAGE) : allPages;
assert.ok(pages.length, 'QA_PAGE must name one of '+allPages.map(([id])=>id).join(', '));
const widths = process.env.QA_WIDTHS ? process.env.QA_WIDTHS.split(',').map(Number) : [1440, 853, 401, 334];
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function serve() {
  const server = http.createServer((request, response) => {
    const rel = decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    let file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403); return response.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { response.writeHead(404); return response.end(); }
    response.writeHead(200, {'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control':'no-store'});
    fs.createReadStream(file).pipe(response);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function chromeBinary() {
  const candidates = [process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find(candidate => candidate && fs.existsSync(candidate));
}

async function launchChrome() {
  const binary = chromeBinary();
  assert.ok(binary, 'No installed Chrome/Chromium found; set CHROME_BIN');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'emotion-editorial-chrome-'));
  const child = spawn(binary, [
    '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--disable-extensions', '--disable-gpu', 'about:blank'
  ], {stdio:['ignore','ignore','pipe']});
  let log = '';
  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome DevTools endpoint timeout: ' + log)), 15000);
    child.stderr.on('data', chunk => {
      log += chunk.toString();
      const found = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (found) { clearTimeout(timer); resolve(found[1]); }
    });
    child.once('exit', code => reject(new Error('Chrome exited before DevTools was ready: ' + code + '\n' + log)));
  });
  return {child, profile, wsUrl};
}

class Cdp {
  constructor(url) { this.url=url; this.id=0; this.pending=new Map(); this.listeners=new Map(); }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => { this.ws.onopen=resolve; this.ws.onerror=reject; });
    this.ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const {resolve,reject} = this.pending.get(message.id); this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message)); else resolve(message.result || {});
        return;
      }
      const key = (message.sessionId || '') + ':' + message.method;
      for (const listener of this.listeners.get(key) || []) listener(message.params || {});
    };
  }
  send(method, params={}, sessionId) {
    const id=++this.id; const message={id,method,params}; if (sessionId) message.sessionId=sessionId;
    return new Promise((resolve,reject)=>{ this.pending.set(id,{resolve,reject}); this.ws.send(JSON.stringify(message)); });
  }
  on(method, sessionId, listener) {
    const key=(sessionId||'')+':'+method; if(!this.listeners.has(key))this.listeners.set(key,[]); this.listeners.get(key).push(listener);
  }
  close(){ this.ws.close(); }
}

async function ready(cdp, sessionId) {
  for (let i=0;i<100;i++) {
    const result = await cdp.send('Runtime.evaluate', {expression:'document.readyState',returnByValue:true}, sessionId);
    if (result.result && result.result.value === 'complete') break;
    await sleep(50);
  }
  await cdp.send('Runtime.evaluate', {expression:'document.fonts.ready.then(()=>true)',awaitPromise:true,returnByValue:true}, sessionId);
}

async function navigate(cdp, sessionId, url) {
  await cdp.send('Page.navigate', {url}, sessionId);
  for (let i=0;i<120;i++) {
    const current = await cdp.send('Runtime.evaluate', {expression:`document.readyState==='complete'&&location.href===${JSON.stringify(url)}&&performance.getEntriesByType('navigation').some(entry=>entry.name===${JSON.stringify(url)})`,returnByValue:true}, sessionId).catch(()=>({}));
    if (current.result && current.result.value === true) break;
    await sleep(50);
  }
  await ready(cdp, sessionId);
  await evaluate(cdp,sessionId,`(async()=>{history.scrollRestoration='manual';document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,0);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return scrollY})()`);
  await sleep(80);
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send('Runtime.evaluate', {expression,awaitPromise:true,returnByValue:true}, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  return result.result.value;
}

async function waitFor(cdp, sessionId, expression) {
  for(let i=0;i<120;i++){
    if(await evaluate(cdp,sessionId,expression))return;
    await sleep(50);
  }
  throw new Error('Timed out waiting for: '+expression);
}

async function platformFonts(cdp, sessionId, text, weight) {
  await evaluate(cdp, sessionId, `(()=>{let n=document.getElementById('qa-font-probe');if(!n){n=document.createElement('div');n.id='qa-font-probe';Object.assign(n.style,{position:'absolute',left:'0',top:'0',zIndex:'-1',opacity:'.01',fontSize:'32px',lineHeight:'1.2',whiteSpace:'nowrap'});document.body.append(n)}n.style.fontFamily='Kanjou Book Sans';n.style.fontWeight='${weight}';n.textContent=${JSON.stringify(text)};return n.offsetWidth})()`);
  const doc = await cdp.send('DOM.getDocument', {depth:0}, sessionId);
  const node = await cdp.send('DOM.querySelector', {nodeId:doc.root.nodeId,selector:'#qa-font-probe'}, sessionId);
  return (await cdp.send('CSS.getPlatformFontsForNode', {nodeId:node.nodeId}, sessionId)).fonts || [];
}

(async()=>{
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const origin = new URL(base).origin;
  const chrome = await launchChrome();
  const cdp = new Cdp(chrome.wsUrl);
  const failures=[]; const external=[]; const screenshotFiles=[]; const viewportEvidence=[];
  const check=(ok,label,detail)=>{ if(!ok) failures.push(label + (detail===undefined?'':' :: '+JSON.stringify(detail))); };
  try {
    await cdp.connect();
    const target = await cdp.send('Target.createTarget', {url:'about:blank'});
    const attached = await cdp.send('Target.attachToTarget', {targetId:target.targetId,flatten:true});
    const sessionId=attached.sessionId;
    for(const method of ['Page.enable','Runtime.enable','Network.enable','DOM.enable','CSS.enable']) await cdp.send(method,{},sessionId);
    cdp.on('Network.requestWillBeSent',sessionId,event=>{ try{const u=new URL(event.request.url);if(u.origin!==origin && u.protocol!=='data:' && u.protocol!=='about:')external.push(event.request.url);}catch{} });
    fs.mkdirSync(out,{recursive:true});

    for (const width of widths) {
      await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:width<500?844:900,deviceScaleFactor:1,mobile:width<500,screenWidth:width,screenHeight:width<500?844:900},sessionId);
      for (const [id,file] of pages) {
        console.log('CHECK '+width+' '+file);
        await cdp.send('Page.navigate',{url:'about:blank'},sessionId);
        await waitFor(cdp,sessionId,`location.href==='about:blank'`);
        const start=external.length;
        await navigate(cdp,sessionId,base+file);
        if(id==='yen-work')await evaluate(cdp,sessionId,`(async()=>{const image=document.querySelector('.trailer-poster img');image.loading='eager';image.scrollIntoView({block:'center'});await Promise.race([image.decode().catch(()=>false),new Promise(resolve=>setTimeout(resolve,1500))]);window.scrollTo(0,0);await new Promise(resolve=>setTimeout(resolve,100));return image.naturalWidth})()`);
        const state=await evaluate(cdp,sessionId,`(()=>{const h=document.querySelector('h1');const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};const spans=[...h.children].map(s=>({text:s.textContent.trim(),width:s.getBoundingClientRect().width,scroll:s.scrollWidth}));const wraps=[...document.querySelectorAll('.story-wrap')].map(rect);return{path:location.pathname,scrollY,innerWidth,innerHeight,visualWidth:visualViewport.width,screenWidth:screen.width,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,h1:document.querySelectorAll('h1').length,spans,wraps,deck:rect(document.querySelector('.story-deck')),meta:rect(document.querySelector('.story-meta-line')),header:rect(document.querySelector('.site-header')),headerTools:rect(document.querySelector('.site-header-tools')),headerMenu:rect(document.getElementById('header-menu-trigger')),frames:document.querySelectorAll('iframe').length,font400:document.fonts.check('400 16px "Kanjou Book Sans"'),font700:document.fonts.check('700 32px "Kanjou Book Sans"'),bodyFont:getComputedStyle(document.body).fontFamily,h1Font:getComputedStyle(h).fontFamily,h1Weight:getComputedStyle(h).fontWeight,thumb:${JSON.stringify(id)}==='yen-work'?{count:document.querySelectorAll('.trailer-poster img[src$="/yen.jpg"]').length,width:document.querySelector('.trailer-poster img')?.naturalWidth||0}:null}})()`);
        check(state.path.endsWith('/'+file),file+' correct document at '+width,state.path);
        check(!state.overflow,file+' no horizontal overflow at '+width,state);
        check(Math.abs(state.innerWidth-width)<1&&Math.abs(state.visualWidth-width)<1&&state.clientWidth===width,file+' viewport and capture width agree at '+width,state);
        check(state.wraps.every(r=>r.left>=-1&&r.right<=state.innerWidth+1)&&state.deck.left>=-1&&state.deck.right<=state.innerWidth+1&&state.meta.left>=-1&&state.meta.right<=state.innerWidth+1,file+' story content rectangles fit viewport at '+width,state);
        check(state.scrollY===0&&state.header.top>=-1&&state.header.left>=-1&&state.header.right<=state.innerWidth+1&&state.headerTools.left>=-1&&state.headerTools.right<=state.innerWidth+1&&state.headerMenu.left>=-1&&state.headerMenu.right<=state.innerWidth+1,file+' page starts at top and header/menu fit viewport at '+width,state);
        check(state.h1===1,file+' one H1 at '+width,state.h1);
        check(state.spans.length===2 && state.spans.every(s=>s.width<=width && s.scroll<=s.width+1),file+' H1 phrase lines fit at '+width,state.spans);
        check(state.frames===0,file+' initial iframe zero at '+width,state.frames);
        check(state.font400 && state.font700 && /Kanjou Book Sans/.test(state.bodyFont) && /Kanjou Book Sans/.test(state.h1Font) && Number(state.h1Weight)>=700,file+' local fonts loaded at '+width,state);
        if(id==='yen-work')check(state.thumb.count===1&&state.thumb.width>0,file+' local trailer thumbnail at '+width,state.thumb);
        check(external.length===start,file+' no initial external request at '+width,external.slice(start));

        if(width===334){
          await evaluate(cdp,sessionId,`(async()=>{window.scrollTo(0,0);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return scrollY})()`); await sleep(80);
          const pageHeight=await evaluate(cdp,sessionId,'Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)');
          const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,clip:{x:0,y:0,width:334,height:Math.ceil(pageHeight),scale:1}},sessionId);
          const targetFile=path.join(out,id+'-334.png'); fs.writeFileSync(targetFile,Buffer.from(shot.data,'base64')); screenshotFiles.push(targetFile);
        }

        await evaluate(cdp,sessionId,`window.scrollTo({top:0,left:0,behavior:'instant'})`); await sleep(80);
        for(let step=0;step<8;step++){
          const natural=await evaluate(cdp,sessionId,`(()=>{const m=document.getElementById('floating-menu-trigger');return !m.hidden&&getComputedStyle(m).display!=='none'})()`);
          if(natural)break;
          await evaluate(cdp,sessionId,`window.scrollTo({top:Math.min(scrollY+420,document.documentElement.scrollHeight-innerHeight),behavior:'instant'})`);
          await sleep(120);
        }
        const menu=await evaluate(cdp,sessionId,`(()=>{const m=document.getElementById('floating-menu-trigger');const r=m.getBoundingClientRect();const hits=[...document.querySelectorAll('main p,main h2,main a')].filter(n=>{const x=n.getBoundingClientRect();return x.bottom>0&&x.top<innerHeight&&x.right>r.left&&x.left<r.right&&x.bottom>r.top&&x.top<r.bottom}).map(n=>n.textContent.trim().slice(0,40));const naturalVisible=!m.hidden&&getComputedStyle(m).display!=='none';if(naturalVisible){m.focus();m.click()}return{naturalVisible,hidden:m.hidden,display:getComputedStyle(m).display,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},viewport:{innerWidth,innerHeight},headerBottom:document.getElementById('site-header').getBoundingClientRect().bottom,hits,open:document.getElementById('site-menu').open,focus:document.activeElement.id,expanded:m.getAttribute('aria-expanded')}})()`);
        viewportEvidence.push({file,width,state:{scrollY:state.scrollY,innerWidth:state.innerWidth,innerHeight:state.innerHeight,visualWidth:state.visualWidth,screenWidth:state.screenWidth,clientWidth:state.clientWidth,wraps:state.wraps,deck:state.deck,meta:state.meta,header:state.header,headerTools:state.headerTools,headerMenu:state.headerMenu},floatingMenu:menu});
        check(menu.naturalVisible && menu.rect.left>=-1 && menu.rect.right<=menu.viewport.innerWidth+1 && menu.hits.length===0 && menu.open && menu.focus==='menu-close' && menu.expanded==='true',file+' floating menu naturally appears, fits, opens and focuses at '+width,menu);
        await cdp.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27},sessionId); await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27},sessionId); await sleep(40);
        const closed=await evaluate(cdp,sessionId,`({open:document.getElementById('site-menu').open,focus:document.activeElement.id,expanded:document.getElementById('floating-menu-trigger').getAttribute('aria-expanded')})`);
        check(!closed.open && closed.focus==='floating-menu-trigger' && closed.expanded==='false',file+' Escape closes and restores focus at '+width,closed);

        if(width===1440){
          const metrics=await cdp.send('Page.getLayoutMetrics',{},sessionId); const size=metrics.cssContentSize||metrics.contentSize;
          const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,clip:{x:0,y:0,width:1440,height:Math.ceil(size.height),scale:1}},sessionId);
          const targetFile=path.join(out,id+'-1440.png'); fs.writeFileSync(targetFile,Buffer.from(shot.data,'base64')); screenshotFiles.push(targetFile);
        }
        console.log('OK '+width+' '+file);
      }
    }

    /* Render every Japanese character used by the new articles in each weight.
       If a batch uses fallback, narrow it to exact characters for the report. */
    const chars=[...new Set(pages.flatMap(([,file])=>[...fs.readFileSync(path.join(root,file),'utf8')]).filter(c=>/[\u3041-\u3096\u30A1-\u30FA\u4E00-\u9FFF]/u.test(c)))].sort().join('');
    const missing={400:[],700:[]};
    await evaluate(cdp,sessionId,'document.fonts.ready.then(()=>true)');
    for(const weight of [400,700]){
      console.log('FONT CHECK '+weight+' '+chars.length+' chars');
      let customGlyphs=0;
      for(let offset=0;offset<chars.length;offset+=48){
        const text=chars.slice(offset,offset+48);
        const batch=await platformFonts(cdp,sessionId,text,weight);
        customGlyphs+=batch.filter(font=>font.isCustomFont).reduce((sum,font)=>sum+font.glyphCount,0);
        if(batch.some(font=>!font.isCustomFont&&font.glyphCount>0)){
          for(const char of text){const fonts=await platformFonts(cdp,sessionId,char,weight);if(fonts.some(font=>!font.isCustomFont&&font.glyphCount>0))missing[weight].push(char);}
        }
      }
      check(customGlyphs>0,'Kanjou Book Sans '+weight+' custom font rendered',{customGlyphs});
      console.log('FONT OK '+weight);
    }
    console.log('FONT_FALLBACK_NEW_JA='+JSON.stringify(missing));

    if(!process.env.QA_PAGE){
      /* Feature -> detail -> Back, then each related route in a real history. */
      await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false,screenWidth:1440,screenHeight:900},sessionId);
      for(const [id,file,related] of pages){
        await navigate(cdp,sessionId,base+'feature.html#'+id);
        await evaluate(cdp,sessionId,`document.querySelector('#${id} .detail-link').click()`);
        await waitFor(cdp,sessionId,'location.pathname.endsWith('+JSON.stringify('/'+file)+')');
        await ready(cdp,sessionId);
        check(await evaluate(cdp,sessionId,'location.pathname.endsWith('+JSON.stringify('/'+file)+')'),id+' feature opens detail');
        const history=await cdp.send('Page.getNavigationHistory',{},sessionId); const prior=history.entries[history.currentIndex-1]; await cdp.send('Page.navigateToHistoryEntry',{entryId:prior.id},sessionId); await waitFor(cdp,sessionId,`location.pathname.endsWith('/feature.html')&&location.hash==='#${id}'`); await ready(cdp,sessionId);
        check(await evaluate(cdp,sessionId,`location.pathname.endsWith('/feature.html')&&location.hash==='#${id}'`),id+' Back returns to feature anchor');
        await navigate(cdp,sessionId,base+file);
        await evaluate(cdp,sessionId,`document.querySelector('.story-related a[href="${related}"]').click()`); await waitFor(cdp,sessionId,'location.pathname.endsWith('+JSON.stringify('/works/'+related)+')'); await ready(cdp,sessionId);
        check(await evaluate(cdp,sessionId,'location.pathname.endsWith('+JSON.stringify('/works/'+related)+')'),id+' related article opens');
      }

      /* Trailer remains click-to-load and uses only the verified privacy-enhanced ID. */
      await navigate(cdp,sessionId,base+'works/yen-work.html'); const before=external.length;
      await evaluate(cdp,sessionId,`document.querySelector('.trailer-poster').click()`); await sleep(150);
      const trailer=await evaluate(cdp,sessionId,`({count:document.querySelectorAll('.trailer-player').length,src:document.querySelector('.trailer-player')?.src||'',focus:document.activeElement.className})`);
      check(trailer.count===1&&trailer.src.startsWith('https://www.youtube-nocookie.com/embed/vuajhTYk_Gw')&&/trailer-player/.test(trailer.focus),'yen click-to-load verified trailer',trailer);
      check(external.slice(before).every(url=>url.startsWith('https://www.youtube-nocookie.com/embed/vuajhTYk_Gw')),'yen trailer only requests verified embed',external.slice(before));
    }

    if(failures.length)throw new Error('EDITORIAL_DETAIL_BROWSER_QA_FAIL\n- '+failures.join('\n- '));
    const evidenceName=process.env.QA_PAGE?'viewport-rects-'+process.env.QA_PAGE+'-'+widths.join('-')+'.json':'viewport-rects.json';
    fs.writeFileSync(path.join(out,evidenceName),JSON.stringify(viewportEvidence,null,2)+'\n');
    console.log('PASS browser: '+pages.length+' page(s) × '+widths.join('/')+', viewport/rects, fonts+Japanese coverage, H1/overflow/natural menu/Escape/focus, initial iframe=0'+(process.env.QA_PAGE?'':' , routes+Back, click-to-load trailer'));
    console.log('screenshots='+screenshotFiles.map(file=>path.relative(root,file)).join(','));
  } finally {
    try{cdp.close();}catch{}
    chrome.child.kill('SIGTERM');
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
