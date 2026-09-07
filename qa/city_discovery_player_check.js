'use strict';
// Execute the shared embed and new host together. Minimal DOM, no network/browser.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'..');
let focus;
class Element extends EventTarget {
  constructor(tag, attrs={}){super();this.tag=tag;this.attrs={...attrs};this.children=[];this.hidden='hidden' in attrs;}
  getAttribute(k){return this.attrs[k]??null;}
  setAttribute(k,v){this.attrs[k]=v;}
  matches(s){return s[0]==='.'?(this.attrs.class||'').split(' ').includes(s.slice(1)):s===this.tag;}
  querySelectorAll(s){return this.children.flatMap(e=>[...(e.matches(s)?[e]:[]),...e.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  appendChild(c){c.parent=this;this.children.push(c);return c;}
  set textContent(v){this.children.forEach(c=>c.parent=null);this.children=[];this.text=v;}
  get textContent(){return this.text||'';}
  focus(){focus=this;}
  click(){this.dispatchEvent(new Event('click'));}
}
function setup(loader=true){
 const document=new Element('document');document.readyState='complete';document.createElement=t=>new Element(t);
 const host=document.appendChild(new Element('section',{class:'v3-video','data-video-id':'80y5COiKdDw','data-video-title':'公園の声'}));
 const frame=host.appendChild(new Element('div',{class:'v3-video-frame'}));
 const open=frame.appendChild(new Element('button',{class:'v3-video-load',hidden:''}));
 const stop=host.appendChild(new Element('button',{class:'player-stop',hidden:''}));
 const status=host.appendChild(new Element('p',{class:'player-status'}));
 const exit=document.appendChild(new Element('a',{class:'official-exit'}));
 const window=new EventTarget();const context=vm.createContext({window,document});
 if(loader)vm.runInContext(fs.readFileSync(path.join(root,'video-embed.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(root,'discover/player.js'),'utf8'),context);
 return {document,window,host,frame,open,stop,status,exit};
}
const a=setup();
assert.equal(a.frame.querySelector('iframe'),null);assert.equal(a.open.hidden,false);assert.equal(a.stop.hidden,true);
a.open.click();
assert.equal(a.frame.children.length,1);let first=a.frame.children[0];
assert.equal(first.src,'https://www.youtube-nocookie.com/embed/80y5COiKdDw?playsinline=1&rel=0');
assert.doesNotMatch(first.allow,/autoplay/);assert.equal(a.stop.hidden,false);assert.equal(focus,first);
assert.doesNotMatch(a.status.textContent,/再生中|視聴済み|完了/);
a.open.click();assert.equal(a.frame.children[0],first);
a.stop.click();assert.equal(first.parent,null);assert.equal(a.frame.children[0],a.open);assert.equal(focus,a.open);
a.open.click();assert.notEqual(a.frame.children[0],first);
a.window.dispatchEvent(new Event('pagehide'));assert.equal(a.frame.querySelector('iframe'),null);
a.open.click();assert.ok(a.frame.querySelector('iframe'),'Return from back-cache can reload');
const exitClick=Object.assign(new Event('click'),{});Object.defineProperty(exitClick,'target',{value:{closest:s=>s==='a[href]'?a.exit:null}});
a.document.dispatchEvent(exitClick);assert.equal(a.frame.querySelector('iframe'),null,'External exit stops the hidden player');
a.open.click();first=a.frame.children[0];
const violation=extra=>Object.assign(new Event('securitypolicyviolation'),{disposition:'enforce',effectiveDirective:'frame-src',blockedURI:'https://www.youtube-nocookie.com/embed/80y5COiKdDw',...extra});
for(const extra of [{disposition:'report'},{effectiveDirective:'img-src'},{blockedURI:'https://www.youtube-nocookie.com.evil.test/'}])a.document.dispatchEvent(violation(extra));
assert.equal(a.frame.children[0],first);
a.document.dispatchEvent(violation());assert.equal(first.parent,null);assert.equal(focus,a.exit);assert.match(a.status.textContent,/表示できません/);
const unavailable=setup(false);assert.equal(unavailable.open.hidden,true);assert.equal(unavailable.frame.querySelector('iframe'),null);
console.log('PASS explicit load, single frame, stop/reopen, back-cache, external exit, precise CSP fallback, missing-loader fallback');
