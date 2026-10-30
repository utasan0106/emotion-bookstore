#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const pages=['index.html','feature.html','about.html','works/honda.html','works/baus.html','works/small-bookstore.html','works/bookstore-want.html','works/basie.html','works/jirokichi.html'];
const widths=[1440,853,401,334];
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serve(){
  const server=http.createServer((request,response)=>{
    const rel=decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/, '')||'index.html';
    let file=path.resolve(root,rel);
    if(!file.startsWith(root+path.sep)&&file!==root){response.writeHead(403);return response.end();}
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)){response.writeHead(404);return response.end();}
    response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(file).pipe(response);
  });
  return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server)));
}

async function launchChrome(){
  const binary=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
  assert.ok(binary,'installed Chrome/Chromium required');
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'emotion-font-regression-'));
  const child=spawn(binary,['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--disable-gpu','about:blank'],{stdio:['ignore','ignore','pipe']});
  let log='';
  const wsUrl=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Chrome DevTools timeout '+log)),15000);
    child.stderr.on('data',chunk=>{log+=chunk.toString();const found=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(found){clearTimeout(timer);resolve(found[1]);}});
    child.once('exit',code=>reject(new Error('Chrome exited '+code+' '+log)));
  });
  return {child,profile,wsUrl};
}

class Cdp{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();}
  async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject;});this.ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&this.pending.has(message.id)){const {resolve,reject}=this.pending.get(message.id);this.pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result||{});}};}
  send(method,params={},sessionId){const id=++this.id;const message={id,method,params};if(sessionId)message.sessionId=sessionId;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify(message));});}
  close(){this.ws.close();}
}

async function evaluate(cdp,sessionId,expression){const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text||'evaluation failed');return r.result.value;}
async function openPage(cdp,base,file,width){
  const target=await cdp.send('Target.createTarget',{url:'about:blank'});
  const attached=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
  const sessionId=attached.sessionId;
  for(const method of ['Page.enable','Runtime.enable','DOM.enable','CSS.enable'])await cdp.send(method,{},sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:width<500?844:900,deviceScaleFactor:1,mobile:width<500,screenWidth:width,screenHeight:width<500?844:900},sessionId);
  const url=base+file;
  await cdp.send('Page.navigate',{url},sessionId);
  for(let i=0;i<160;i++){
    const ready=await evaluate(cdp,sessionId,`document.readyState==='complete'&&location.href===${JSON.stringify(url)}`).catch(()=>false);
    if(ready)break;
    await sleep(50);
  }
  await evaluate(cdp,sessionId,'document.fonts.ready.then(()=>true)');
  return {targetId:target.targetId,sessionId};
}

async function platformFonts(cdp,sessionId,text,weight){
  await evaluate(cdp,sessionId,`(()=>{let n=document.getElementById('qa-font-probe');if(!n){n=document.createElement('div');n.id='qa-font-probe';Object.assign(n.style,{position:'absolute',left:'0',top:'0',zIndex:'-1',opacity:'.01',fontSize:'32px',lineHeight:'1.2',whiteSpace:'nowrap'});document.body.append(n)}n.style.fontFamily='Kanjou Book Sans';n.style.fontWeight='${weight}';n.textContent=${JSON.stringify(text)};return n.offsetWidth})()`);
  const doc=await cdp.send('DOM.getDocument',{depth:0},sessionId);
  const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#qa-font-probe'},sessionId);
  return (await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId},sessionId)).fonts||[];
}

(async()=>{
  const server=await serve();
  const base='http://127.0.0.1:'+server.address().port+'/';
  const chrome=await launchChrome();
  const cdp=new Cdp(chrome.wsUrl);
  const failures=[];const results=[];const renderedChars=new Set();
  const check=(ok,label,detail)=>{if(!ok)failures.push(label+' :: '+JSON.stringify(detail));};
  try{
    await cdp.connect();
    for(const width of widths){
      for(const file of pages){
        const page=await openPage(cdp,base,file,width);
        const state=await evaluate(cdp,page.sessionId,`(()=>{const h=document.querySelector('h1');const rect=e=>{const r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};const lines=[];if(h){const walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){for(let i=0;i<n.data.length;i++){if(/\\s/.test(n.data[i]))continue;const range=document.createRange();range.setStart(n,i);range.setEnd(n,i+1);const r=range.getBoundingClientRect();let line=lines.find(x=>Math.abs(x.top-r.top)<2);if(!line){line={top:r.top,text:''};lines.push(line)}line.text+=n.data[i]}}}return{innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,h1:rect(h),header:rect(document.querySelector('.site-header')),lines:lines.sort((a,b)=>a.top-b.top).map(x=>x.text),visibleText:document.body.innerText,font400:document.fonts.check('400 16px "Kanjou Book Sans"'),font700:document.fonts.check('700 32px "Kanjou Book Sans"'),bodyFont:getComputedStyle(document.body).fontFamily,h1Font:h?getComputedStyle(h).fontFamily:null}})()`);
        check(state.innerWidth===width&&state.clientWidth===width,file+' viewport '+width,state);
        check(state.scrollWidth<=width+1,file+' horizontal fit '+width,state);
        check(state.h1&&state.h1.left>=-1&&state.h1.right<=width+1,file+' H1 fit '+width,state);
        check(!state.header||state.header.left>=-1&&state.header.right<=width+1,file+' header fit '+width,state);
        check(state.lines.length>0&&state.lines.every(line=>[...line].length>1),file+' H1 no isolated glyph line '+width,state.lines);
        check(state.font400&&state.font700&&/Kanjou Book Sans/.test(state.bodyFont),file+' Kanjou fonts loaded '+width,state);
        for(const char of state.visibleText)if(/[\u3041-\u3096\u30A1-\u30FA\u4E00-\u9FFF]/u.test(char))renderedChars.add(char);
        results.push({file,width,lines:state.lines,h1:state.h1});
        await cdp.send('Target.closeTarget',{targetId:page.targetId});
      }
    }

    const chars=[...renderedChars].sort().join('');
    const page=await openPage(cdp,base,pages[0],334);
    const missing={400:[],700:[]};
    for(const weight of [400,700])for(let offset=0;offset<chars.length;offset+=48){const text=chars.slice(offset,offset+48);const fonts=await platformFonts(cdp,page.sessionId,text,weight);if(fonts.some(font=>!font.isCustomFont&&font.glyphCount>0))for(const char of text){const one=await platformFonts(cdp,page.sessionId,char,weight);if(one.some(font=>!font.isCustomFont&&font.glyphCount>0))missing[weight].push(char);}}
    await cdp.send('Target.closeTarget',{targetId:page.targetId});
    check(missing[400].length===0&&missing[700].length===0,'existing 9 Japanese glyph coverage',missing);

    fs.writeFileSync(path.join(root,'qa/evidence/editorial-details-20261030/existing-9-font-regression.json'),JSON.stringify({pages,widths,missing,results},null,2)+'\n');
    if(failures.length)throw new Error('EDITORIAL_FONT_REGRESSION_FAIL\n- '+failures.join('\n- '));
    console.log('PASS existing 9 × 1440/853/401/334: Kanjou 400/700, Japanese fallback 0, H1 line fit/no isolated glyph, header/viewport overflow 0');
  }finally{
    try{cdp.close();}catch{}
    chrome.child.kill('SIGTERM');
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
