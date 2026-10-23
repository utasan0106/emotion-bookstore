'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const kaijin=require('./kaijin_cover_check');
const kaijinAsOf='2026-10-12T12:00:00+09:00';
const root=path.resolve(__dirname,'..'),out=process.env.QA_OUTPUT_DIR||path.join(__dirname,'artifacts/five-city');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
(async()=>{let browser;const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});for(const width of [320,390,1440]){const ctx=await browser.newContext({viewport:{width,height:844}});await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-23T12:00:00+09:00'));
await p.goto(origin+'/outings/?city=kiyosumi&week=all');await p.locator('#event-filters').waitFor();assert.equal(await p.locator('select[name=city]').inputValue(),'kiyosumi');assert.equal(await p.locator('select[name=city] option').count(),6);assert.equal(await p.locator('#event-count').innerText(),'1件の開催予定');assert.equal(await p.locator('[data-event-card]:visible').count(),1);assert.ok(await p.locator('[data-event-card="kiyosumi-tada2026"]').isVisible());
await p.locator('select[name=city]').selectOption('kichijoji');assert.equal(await p.locator('#event-count').innerText(),'1件の開催予定');assert.equal(await p.locator('[data-event-card]:visible').count(),1);await p.locator('select[name=city]').selectOption('kiyosumi');assert.equal(new URL(p.url()).searchParams.get('city'),'kiyosumi');await p.reload();assert.equal(await p.locator('select[name=city]').inputValue(),'kiyosumi');assert.equal(await p.locator('#event-count').innerText(),'1件の開催予定');await p.screenshot({path:path.join(out,width+'-kiyosumi-event.png'),fullPage:true});
await p.goto(origin+'/outings/?city=kiyosumi&week=all');await p.clock.setFixedTime(new Date('2026-11-04T00:00:00+09:00'));await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(await p.locator('#event-count').innerText(),'0件の開催予定');
assert.ok(await p.locator('#event-empty').isVisible());assert.ok(await p.locator('#event-empty a[href="/discover/kiyosumi/"]').isVisible());await p.screenshot({path:path.join(out,width+'-kiyosumi-expired.png'),fullPage:true});
await p.goto(origin+'/visit/');assert.equal(await p.locator('.visit-city').count(),5);const card=p.locator('.visit-city').filter({hasText:'Kiyosumi-Shirakawa'});await card.scrollIntoViewIfNeeded();await card.locator('img').evaluate(x=>x.decode());assert.ok(await card.locator('img').evaluate(x=>x.naturalWidth>0));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:path.join(out,width+'-visit-five.png'),fullPage:true});for(const key of ['koenji/junjo','koenji/1q84','kichijoji/gou-gou-book','kichijoji/honnoniwa','shimokitazawa/honda']) {
 const cover=require('../tools/work-cover-source.json')[key];assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,cover.imageUrl))).digest('hex'),cover.sha256,'Exact reviewed cover bytes '+key);await p.goto(origin+'/discover/'+key+'.html');
 const img=p.locator('img[src="'+cover.imageUrl+'"]');assert.equal(await img.count(),1,'Exact reviewed cover '+key);
 await img.scrollIntoViewIfNeeded();await img.evaluate(x=>x.decode());const size=await img.evaluate(x=>({w:x.naturalWidth,h:x.naturalHeight}));
 assert.deepEqual(size,{w:cover.width,h:cover.height},'Decoded original edition dimensions '+key);
 assert.ok(await img.isVisible());assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.screenshot({path:path.join(out,width+'-cover-'+key.replace('/','-')+'.png'),fullPage:true});
}
// Same-origin kaijin is not a permitted-but-blocked external request. Decode
// the exact local bytes on every generated route at every tested width.
// This real rotation week naturally shows slot 4 on the city index. Do not
// force hidden cards visible or change the product rotation for the test.
await p.clock.setFixedTime(new Date(kaijinAsOf));
for(const route of kaijin.pages){
 await p.goto(origin+'/'+route);
 const img=p.locator('img[src="'+kaijin.imageUrl+'"]');
 assert.equal(await img.count(),1,'Exact local kaijin cover on '+route);
 await img.scrollIntoViewIfNeeded();await img.evaluate(x=>x.decode());
 const decoded=await img.evaluate(x=>({complete:x.complete,w:x.naturalWidth,h:x.naturalHeight,source:x.currentSrc}));
 assert.deepEqual({complete:decoded.complete,w:decoded.w,h:decoded.h},{complete:true,w:kaijin.width,h:kaijin.height},'Decoded reviewed edition on '+route);
 assert.equal(decoded.source,origin+kaijin.imageUrl,'Same-origin cover, not an external fallback');
 assert.ok(await img.isVisible(),'Cover visible on '+route);
 assert.ok((await img.locator('..').locator('figcaption').innerText()).includes(kaijin.credit),'Full adjacent credit on '+route);
 await p.screenshot({path:path.join(out,width+'-cover-kaijin-'+route.replaceAll('/','-').replace('.html','')+'.png'),fullPage:true});
}
assert.deepEqual(errors,[]);await ctx.close();}fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({sourceSha:process.env.QA_SOURCE_SHA||null,widths:[320,390,1440],passed:true,externalRequestsBlocked:true,remoteCoverRenderPending:['shimokitazawa/indies'],localKaijinDecode:{asOf:kaijinAsOf,pages:kaijin.pages,widths:[320,390,1440],sha256:kaijin.sha256,passed:true},coverKeys:['koenji/junjo','koenji/1q84','kichijoji/gou-gou-book','kichijoji/honnoniwa','shimokitazawa/honda','jinbocho/kaijin']},null,2)+'\n');console.log('PASS mobile/desktop fifth-city URL/reload/filter/empty route, expiry rollover, English fifth card and local image; external requests blocked. Screenshots: '+out);
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
