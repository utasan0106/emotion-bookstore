'use strict';
// Source and isolated interaction checks, not a browser/playback claim.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),css=read('site-system.css'),homeCss=read('home-discovery.css');
assert.doesNotMatch(html,/30秒|感情書店の小文|data-open-reading|id="reading"/);
assert.match(html,/href="\/discover\/kichijoji\/parks.html"/,'The film opens its existing playable detail');
assert.match(html,/href="https:\/\/www.youtube.com\/watch\?v=pm7RBghFt0I"/,'The exact official trailer remains available');
assert.match(html,/映画スチルではありません/,'The place photograph must not impersonate film artwork');
assert.match(read('discover/kichijoji/parks.html'),/data-video-id="pm7RBghFt0I"/,'The real trailer stays on the film detail');
assert.doesNotMatch(read('discover/kichijoji/parks.html'),/youtube-nocookie.com\/embed\//,'The trailer stays click-to-load');
assert.doesNotMatch(html,/class="home-canonical/,'Do not inherit the retired home theme');
for(const city of ['koenji','kichijoji','shimokitazawa','jinbocho']) {
 assert.ok(html.includes(`href="/discover/${city}/"`));
 const landing=read(`discover/${city}/index.html`);
 assert.match(landing,/class="work-card /,'Every home city link opens populated static content');
}
assert.match(css,/body\.site-polished:is\(\.shelf-page,\.works-page,\.thread-page,\.suggest-page\)\{--ink:#262626\}/,'Legacy light panels must use dark ink');
assert.match(css,/--hall-raised:#f5f5f5/,'Reading inset surfaces must not inherit the night theme');
assert.match(css,/--bone:#fff/);
assert.match(homeCss,/\.home-discovery \.site-menu\{background:#fff;color:var\(--hd-ink\)/);
const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
const ratios=[];
for(const [fg,bg] of [['#262626','#ffffff'],['#595959','#ffffff'],['#595959','#f5f5f5'],['#ffffff','#3158b8'],['#ffffff','#262626'],['#343430','#faf9f6'],['#595959','#faf9f6']]) {
 const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 assert.ok(ratio>=4.5,`${fg} on ${bg}: ${ratio}`);ratios.push(ratio.toFixed(2));
}
assert.match(html,/<h1 id="hd-title" class="hd-purpose">本・音楽・映像・街の催しに出会う文化案内<\/h1>/,'The concise site purpose is the accessible H1');
assert.doesNotMatch(html,/hd-intro|なんか、|今日の楽しみ/,'Latest direction: contents first; no promotional copy block before the works');
assert.ok(html.indexOf('class="hd-categories"')<html.indexOf('class="hd-feature"'),'Category navigation leads immediately to the first work');
assert.doesNotMatch(homeCss,/hd-intro|#faf9f6/,'Do not retain an unused promotional panel theme');
assert.doesNotMatch(css+homeCss,/#f0f3fa|#f1f3f5|#dfe3eb/,'Retired blue-grey inset palette must not return');
for (const href of ['/work-music.html','/work-video.html']) assert.ok(html.includes(`href="${href}">`),'Internal details preserve the current tab and native Back');
const location={search:'',hash:'#reading'};
let scrolled=false,focused=false,popstate;
const title={textContent:'',focus(){focused=true;}},section={scrollIntoView(){scrolled=true;}};
const cards=['book','music','video'].map(homeWork=>({dataset:{homeWork},hidden:false}));
const links=['book','music','video','all'].map(homeKind=>({dataset:{homeKind},attrs:{},getAttribute(){return `?kind=${homeKind}#hc-works`;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(_event,handler){this.handler=handler;}}));
const document={querySelector(s){return {'.home-discovery':{},'#hc-works':section,'#hd-works-title':title}[s]||null;},querySelectorAll(s){return {'[data-home-work]':cards,'[data-home-kind]':links}[s]||[];}};
vm.runInNewContext(read('home-discovery.js'),{document,location,URLSearchParams,history:{pushState(_a,_b,url){const u=new URL(url,'https://example.test/');location.search=u.search;location.hash=u.hash;}},window:{addEventListener(_event,handler){popstate=handler;}}});
assert.ok(cards.every(c=>!c.hidden),'A retired reading hash does not crash home');
for(const link of links) {
 let prevented=false;
 link.handler({button:0,preventDefault(){prevented=true;}});
 assert.ok(prevented&&scrolled&&focused);
 assert.equal(link.attrs['aria-current'],'true');
 assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.homeWork),link.dataset.homeKind==='all'?['book','music','video']:[link.dataset.homeKind]);
}
location.search='?kind=book';popstate();assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.homeWork),['book']);
location.search='?kind=unknown';popstate();assert.equal(cards.filter(c=>!c.hidden).length,3);
links[0].handler({button:0,ctrlKey:true,preventDefault(){throw Error('Modified clicks must remain native');}});
console.log('PASS 4 populated home city routes; home filters, history and retired hash; source palette contrast ratios '+ratios.join(', '));
