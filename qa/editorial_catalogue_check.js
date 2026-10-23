'use strict';
// All simulated approvals and destructive fixtures live in an isolated temp copy.
// Tests never approve the real source, mutate saved data, contact the network,
// publish, or assert that the owner has adopted any proposed work.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const {catalogue,bookProposals,shelfProposals}=require('../tools/work-catalogue');
const cityItems=require('../tools/city-discovery-source').items;
const safety=require('./editorial_output_safety');
const ui=require('./editorial_ui_contract');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'tools/editorial-proposals/shelves.css'))).digest('hex'),ui.cssSha256,'B shared CSS remains byte-identical');
const clone=x=>JSON.parse(JSON.stringify(x));
const pending=list=>clone(list).map(x=>({...x,editorialReview:'pending',adoption:null}));
const approved=list=>clone(list).map(x=>({...x,editorialReview:'approved',adoption:{reference:'ISOLATED TEST FIXTURE, NOT OWNER ADOPTION',confirmedOn:'2026-10-23'}}));
const baseBooks=cityItems.filter(w=>w.kind==='book').length;
const pendingCat=catalogue({books:pending(bookProposals),shelves:pending(shelfProposals)});
assert.equal(pendingCat.works.filter(w=>w.kind==='book').length,baseBooks);
assert.equal(pendingCat.publishablePaths.size,0);
assert.deepEqual(pendingCat.works.map(w=>w.key),cityItems.map(w=>w.city+'/'+w.id));
const approvedCat=catalogue({books:approved(bookProposals),shelves:approved(shelfProposals)});
assert.equal(approvedCat.works.filter(w=>w.kind==='book').length,baseBooks+bookProposals.length);
const approvedUrlCount=bookProposals.length+shelfProposals.length;
assert.equal(approvedCat.publishablePaths.size,approvedUrlCount);
assert.deepEqual(approvedCat.works.filter(w=>w.origin==='city').map(w=>w.path),pendingCat.works.map(w=>w.path));
assert.ok(approvedCat.books.every(w=>w.cities.length===0&&!w.city),'Independent books have no invented city membership');
const ignore=fs.readFileSync(path.join(root,'.vercelignore'),'utf8');
for(const excluded of ['/tools/editorial-proposals/','/tools/work-catalogue.js','/tools/build-editorial-pages.js']) assert.ok(ignore.split(/\r?\n/).includes(excluded),'Unapproved build inputs must not be deployed: '+excluded);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'emotion-editorial-test-'));
const fixture=path.join(temp,'repo');
const actualInputHash=crypto.createHash('sha256').update(JSON.stringify([bookProposals,shelfProposals])).digest('hex');
let negatives=0, metaNegatives=0;
function verifyResult(result,file,diagnostic=null) {
  assert.equal(result.error,undefined,'Fixture process error: '+file+' '+result.error);
  assert.equal(result.signal,null,'Fixture process signal: '+file+' '+result.signal);
  assert.equal(result.status,diagnostic?1:0,'Unexpected fixture exit: '+file+'\n'+result.stdout+'\n'+result.stderr);
  if(diagnostic) assert.match((result.stdout||'')+'\n'+(result.stderr||''),diagnostic,'Unexpected rejection diagnostic: '+file);
}
// A timeout, spawn error, signal, wrong status or unrelated exception is not
// evidence that the intended guard rejected the supplied regression.
const timeout=cp.spawnSync(process.execPath,['-e','setTimeout(()=>{},1000)'],{encoding:'utf8',timeout:5});
const spawnError=cp.spawnSync(path.join(temp,'missing-executable'),[],{encoding:'utf8'});
for(const result of [timeout,spawnError,{status:1,signal:'SIGTERM'}, {status:2,signal:null,stderr:'expected guard'}, {status:1,signal:null,stderr:'unrelated error'}]) {
  assert.throws(()=>verifyResult(result,'meta fixture',/expected guard/));metaNegatives++;
}
try {
  fs.cpSync(root,fixture,{recursive:true,mode:fs.constants.COPYFILE_FICLONE,
    filter:source=>!path.relative(root,source).split(path.sep).includes('.git')&&!path.relative(root,source).startsWith('qa/artifacts')});
  const read=file=>fs.readFileSync(path.join(fixture,file),'utf8');
  const write=(file,text)=>{const target=path.join(fixture,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);};
  function inputs(books,shelves) {write('tools/editorial-proposals/books.json',JSON.stringify(books));write('tools/editorial-proposals/shelves.json',JSON.stringify(shelves));}
  function run(file,args=[],diagnostic=null) {
    const result=cp.spawnSync(process.execPath,[file,...args],{cwd:fixture,encoding:'utf8',timeout:30000});
    verifyResult(result,file+' '+args,diagnostic);
    if(diagnostic) negatives++;
    return result;
  }
  const oldPublic=new Map();
  function rememberPublic(dir) {for(const file of fs.readdirSync(dir,{withFileTypes:true})) {const full=path.join(dir,file.name),rel=path.relative(fixture,full);if(['.git','qa','tools'].includes(rel))continue;if(file.isDirectory())rememberPublic(full);else if(file.name.endsWith('.html')||rel==='sitemap.xml')oldPublic.set(rel,fs.readFileSync(full));}}
  rememberPublic(fixture);
  function build() {run('tools/build-editorial-pages.js');run('tools/build-work-pages.js');run('tools/refresh-sitemap.js');}
  inputs(pending(bookProposals),pending(shelfProposals));build();
  const before=new Map(['works.html','work-book.html','work-film.html','work-music.html','sitemap.xml'].map(f=>[f,read(f)]));
  assert.ok(read('works.html').includes('本 '+baseBooks+'件'));
  for(const route of pendingCat.managedPaths) assert.ok(!fs.existsSync(path.join(fixture,route)));
  run('tools/build-editorial-pages.js',['--check']);
  // Missing owner-adoption record and unknown review states do not unlock output.
  let books=approved(bookProposals);books[0].adoption=null;inputs(books,pending(shelfProposals));run('tools/build-editorial-pages.js',[],/Approved proposal lacks explicit adoption record/);
  books=pending(bookProposals);books[0].editorialReview='ready';inputs(books,pending(shelfProposals));run('tools/build-editorial-pages.js',[],/Invalid editorial review/);
  inputs(pending(bookProposals),approved(shelfProposals));run('tools/build-editorial-pages.js',[],/Approved shelf references unpublished work/);
  books=approved(bookProposals);books[1]={...books[1],id:books[0].id,slug:books[0].slug,path:books[0].path};inputs(books,pending(shelfProposals));run('tools/build-editorial-pages.js',[],/Duplicate work identity/);
  books=approved(bookProposals);books[0].isbn='9784103549513';books[0].editionLabel=books[0].editionLabel.replace('9784103549512',books[0].isbn);books[0].cover.file=books[0].isbn+'.jpg';books[0].cover.path='/assets/editorial-books/'+books[0].cover.file;inputs(books,pending(shelfProposals));run('tools/build-editorial-pages.js',[],/Book author\/edition mismatch/);
  books=approved(bookProposals);books[0].author='別の著者';books[0].creator='別の著者';inputs(books,pending(shelfProposals));run('tools/build-editorial-pages.js',[],/Cover\/edition evidence mismatch/);
  books=approved(bookProposals);books[0].cover.file=books[1].cover.file;inputs(books,pending(shelfProposals));run('tools/build-editorial-pages.js',[],/Invalid independent edition\/asset path/);
  inputs(approved(bookProposals),approved(shelfProposals));
  const coverInput=path.join(fixture,'tools/editorial-proposals/assets',bookProposals[0].cover.file);
  const coverBytes=fs.readFileSync(coverInput);fs.writeFileSync(coverInput,Buffer.from('altered cover bytes'));
  run('tools/build-editorial-pages.js',[],/Reviewed cover bytes changed/);fs.writeFileSync(coverInput,coverBytes);
  inputs(approved(bookProposals),approved(shelfProposals));
  write('assets/editorial-books/shelves.css','not owned by this compiler');
  run('tools/build-editorial-pages.js',[],/Unmanaged or edited output collision/);
  assert.equal(read('assets/editorial-books/shelves.css'),'not owned by this compiler');
  assert.ok(!fs.existsSync(path.join(fixture,bookProposals[0].path)),'Collision must be detected before any public page is written');
  fs.unlinkSync(path.join(fixture,'assets/editorial-books/shelves.css'));
  // Independent books may be adopted without a shelf; labels must remain true.
  inputs(approved(bookProposals),pending(shelfProposals));build();
  const booksOnlyCat=catalogue({books:approved(bookProposals),shelves:pending(shelfProposals)});
  for(const book of booksOnlyCat.books)ui.checkUi(read(book.path),book.path,booksOnlyCat);
  // The first shelf can be adopted independently; secondary shelves stay held.
  const firstShelfOnly=pending(shelfProposals).map(s=>s.slug==='ordinary-day-curiosities'?approved([s])[0]:s);
  inputs(approved(bookProposals),firstShelfOnly);build();
  assert.equal([...read('sitemap.xml').matchAll(/<loc>https:\/\/emotionbookstore\.com\/(?:books|shelves)\//g)].length,bookProposals.length+1);
  for(const shelf of firstShelfOnly.filter(s=>s.editorialReview==='pending')) assert.ok(!fs.existsSync(path.join(fixture,shelf.path)));
  // Owner-facing adoption request covers only the two featured proposals.
  // Approval is simulated here only; held secondary shelves must not leak.
  const featuredOnly=pending(shelfProposals).map(s=>s.featuredProposal?approved([s])[0]:s);
  const featuredCount=featuredOnly.filter(s=>s.editorialReview==='approved').length;
  const featuredCat=catalogue({books:approved(bookProposals),shelves:featuredOnly});
  inputs(approved(bookProposals),featuredOnly);build();
  assert.equal(featuredCat.works.filter(w=>w.kind==='book').length,baseBooks+bookProposals.length);
  assert.equal(featuredCat.publishablePaths.size,bookProposals.length+featuredCount);
  assert.equal([...read('sitemap.xml').matchAll(/<loc>https:\/\/emotionbookstore\.com\/(?:books|shelves)\//g)].length,bookProposals.length+featuredCount);
  for(const route of featuredCat.publishablePaths)ui.checkUi(read(route),route,featuredCat);
  const publishedHtml=['works.html','work-book.html',...featuredCat.publishablePaths].map(file=>read(file.replace(/^\//,'')));
  for(const held of featuredOnly.filter(s=>s.editorialReview==='pending')) {
    assert.ok(!fs.existsSync(path.join(fixture,held.path)),'Held secondary shelf has a public file');
    assert.ok(!read('sitemap.xml').includes('https://emotionbookstore.com'+held.path),'Held secondary shelf leaked into sitemap');
    for(const html of publishedHtml) assert.ok(!html.includes('href="'+held.path+'"')&&!html.includes('href="https://emotionbookstore.com'+held.path+'"'),'Public link to held secondary shelf');
  }
  for(const file of ['qa/work_page_check.js','qa/work_schema_check.js','qa/seo_check.js'])run(file);
  run('tools/build-editorial-pages.js',['--check']);run('tools/refresh-sitemap.js',['--check']);
  inputs(approved(bookProposals),approved(shelfProposals));build();
  assert.ok(read('works.html').includes('本 '+(baseBooks+bookProposals.length)+'件'));
  for(const book of approvedCat.books) assert.ok(read('work-book.html').includes('href="'+book.path+'"'));
  const urls=html=>[...html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.equal(urls(read('sitemap.xml')).length,urls(before.get('sitemap.xml')).length+approvedUrlCount);
  for(const route of approvedCat.publishablePaths) {
    assert.ok(read('sitemap.xml').includes('<loc>https://emotionbookstore.com'+route+'</loc>'));
    const html=read(route.slice(1));
    ui.checkUi(html,route,approvedCat);
    assert.ok(safety.staticHtml(html),'New pages must remain static without remote loading');
    assert.ok(html.includes('<link rel="canonical" href="https://emotionbookstore.com'+route+'">'));
    assert.doesNotMatch(html,/noindex|data-memory-note|localStorage|gtag|<iframe|rel="preconnect"/);
    assert.ok(html.includes('application/ld+json'));
    const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    if(route.startsWith('/shelves/')) {
      assert.equal(schema['@type'],'CollectionPage');assert.equal(schema.mainEntity['@type'],'ItemList');
      assert.deepEqual(schema.mainEntity.itemListElement.map(x=>x.position),[1,2,3]);
    }
    // Same-origin absolute URLs are tested locally too, not skipped as external.
    for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url=new URL(href,'https://emotionbookstore.com'+route);
      if(url.origin!=='https://emotionbookstore.com') continue;
      let target=path.join(fixture,url.pathname);if(fs.existsSync(target)&&fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
      assert.ok(fs.existsSync(target),'Missing internal route: '+href);
      if(url.hash) assert.ok(fs.readFileSync(target,'utf8').includes('id="'+url.hash.slice(1)+'"'),'Missing fragment: '+href);
    }
  }
  assert.ok(safety.staticStylesheet(read('assets/editorial-books/shelves.css')));
  for(const payload of ['<script src="https://example.com/metrics.js"></script>','<img src="/x" onload="alert(1)">','<iframe src="/frame"></iframe>','<img src="https://example.com/pixel">','<link rel="preconnect" href="https://example.com/">','<img src=https://example.com/pixel>','<img src = "https://example.com/pixel">','<img srcset="https://example.com/pixel 1x">','<link rel="prefetch" href="https://example.com/pixel">','<a href = "javascript:alert(1)">','<img src="/&#x2f;example.com/pixel">']) {assert.equal(safety.staticHtml(payload),false);negatives++;}
  for(const css of ['@import "https://example.com/a.css";','a{background:url(https://example.com/pixel)}']) {assert.equal(safety.staticStylesheet(css),false);negatives++;}
  for(const file of ['qa/work_page_check.js','qa/work_schema_check.js','qa/seo_check.js'])run(file);
  // The existing city/freshness build must not drop new independent URLs.
  run('tools/build-city-discovery.js',['--check']);run('tools/build-editorial-pages.js',['--check']);
  run('tools/refresh-sitemap.js',['--check']);
  // Symlink/hardlink fixtures are confined to this disposable directory. Both
  // generation and revocation must reject them without changing either tree.
  function snapshot(target) {
    let stat;try {stat=fs.lstatSync(target);} catch(error) {if(error.code==='ENOENT')return null;throw error;}
    if(stat.isSymbolicLink())return {link:fs.readlinkSync(target)};
    if(stat.isDirectory())return Object.fromEntries(fs.readdirSync(target).sort().map(name=>[name,snapshot(path.join(target,name))]));
    if(stat.isFile())return {hash:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),links:stat.nlink};
    return {mode:stat.mode};
  }
  let pathFixture=0;
  function rejectUnsafePath(relative,kind,state='approved',internal=false) {
    inputs(state==='pending'?pending(bookProposals):approved(bookProposals),state==='pending'?pending(shelfProposals):approved(shelfProposals));
    const target=path.join(fixture,relative), saved=path.join(internal?fixture:temp,'path-backup-'+(++pathFixture));
    fs.renameSync(target,saved);
    const missing=path.join(temp,'missing-link-target-'+pathFixture);
    if(kind==='symlink'||kind==='dangling')fs.symlinkSync(kind==='dangling'?missing:saved,target);
    else if(kind==='hardlink')fs.linkSync(saved,target);
    else if(kind==='directory')fs.mkdirSync(target);
    else if(kind==='file')fs.writeFileSync(target,'not a directory');
    else throw Error('Unknown isolated path fixture');
    const diagnostic=kind==='symlink'||kind==='dangling'?/Unsafe managed symlink/:
      kind==='file'?/Unsafe managed non-directory parent/:/Unsafe managed non-regular or hardlinked target/;
    const footprint=()=>({books:snapshot(path.join(fixture,'books')),shelves:snapshot(path.join(fixture,'shelves')),
      assets:snapshot(path.join(fixture,'assets')),inputs:snapshot(path.join(fixture,'tools/editorial-proposals')),
      outside:snapshot(saved),missing:snapshot(missing)});
    const original=footprint();
    try {
      for(const args of [[],['--check']]) {
        run('tools/build-editorial-pages.js',args,diagnostic);
        assert.deepEqual(footprint(),original,'Unsafe path rejection mutated files: '+relative+' '+kind+' '+state);
      }
    } finally {
      if(kind==='directory')fs.rmdirSync(target);else fs.unlinkSync(target);
      fs.renameSync(saved,target);
      inputs(approved(bookProposals),approved(shelfProposals));
    }
  }
  for(const relative of ['books','shelves','assets','assets/editorial-books']) rejectUnsafePath(relative,'symlink');
  rejectUnsafePath('books','symlink','approved',true);
  rejectUnsafePath('books','dangling');
  rejectUnsafePath(bookProposals[0].path.slice(1),'symlink');
  rejectUnsafePath(bookProposals[0].path.slice(1),'dangling');
  rejectUnsafePath('tools/editorial-proposals/generated-outputs.json','symlink');
  rejectUnsafePath('tools/editorial-proposals/generated-outputs.json','dangling');
  rejectUnsafePath('tools/editorial-proposals','symlink');
  rejectUnsafePath(bookProposals[0].path.slice(1),'hardlink');
  rejectUnsafePath('tools/editorial-proposals/generated-outputs.json','hardlink');
  rejectUnsafePath(bookProposals[0].path.slice(1),'directory');
  rejectUnsafePath('books','file');
  rejectUnsafePath('books','symlink','pending');
  rejectUnsafePath(bookProposals[0].path.slice(1),'symlink','pending');
  run('tools/build-editorial-pages.js',['--check']);
  const generated=read('books/naruse-wa-tenka-wo-toriniiku.html');
  for(const corrupted of [generated.replace('class="brand-band"','class="old-masthead"'),generated.replace('/works.html#editorial-shelves','/works.html#shelves'),generated.replace('どちらへ寄り道する？','ここから次へ'),generated.replace('class="back"','class="old-back"')]) {
    assert.throws(()=>ui.checkUi(corrupted,'/books/naruse-wa-tenka-wo-toriniiku.html',approvedCat),/B UI:/);negatives++;
  }
  const shelfHtml=read('shelves/places-to-share.html');
  assert.throws(()=>ui.checkUi(shelfHtml.replace('class="meta"','class="old-meta"'),'/shelves/places-to-share.html',approvedCat),/B UI:/);negatives++;
  write('books/naruse-wa-tenka-wo-toriniiku.html',generated.replace('"isbn":"9784103549512"','"isbn":"9784103524519"'));
  run('qa/work_schema_check.js',[],/Independent Book ISBN matches its reviewed edition/);write('books/naruse-wa-tenka-wo-toriniiku.html',generated);
  const directory=read('work-book.html');write('work-book.html',directory.replaceAll('/books/naruse-wa-tenka-wo-toriniiku.html','/books/not-in-catalogue.html'));run('qa/work_page_check.js',[],/work-book\.html must reach every published book/);write('work-book.html',directory);
  inputs(pending(bookProposals),pending(shelfProposals));
  run('tools/build-editorial-pages.js',['--check'],/Unapproved editorial output remains/);run('tools/refresh-sitemap.js');
  for(const route of pendingCat.managedPaths) assert.ok(!read('sitemap.xml').includes('https://emotionbookstore.com'+route),'Pending stale files do not leak into sitemap');
  build();
  for(const route of pendingCat.managedPaths) assert.ok(!fs.existsSync(path.join(fixture,route)),'Revoked generated page remains');
  for(const [file,text] of before) assert.equal(read(file),text,'Pending restoration changed existing output: '+file);
  for(const file of ['tools/build-editorial-pages.js','tools/build-work-pages.js','tools/refresh-sitemap.js'])run(file,['--check']);
  run('qa/work_schema_check.js');run('qa/seo_check.js');
  // Removing rows is not a way to evade stale-output cleanup. The private
  // ownership record retains and verifies the exact prior generated artifacts.
  inputs(approved(bookProposals),approved(shelfProposals));build();
  inputs([],[]);run('tools/build-editorial-pages.js',['--check'],/Unapproved editorial output remains/);build();
  for(const route of pendingCat.managedPaths) assert.ok(!fs.existsSync(path.join(fixture,route)));
  assert.deepEqual(JSON.parse(read('tools/editorial-proposals/generated-outputs.json')).outputs,{});
  inputs(pending(bookProposals),pending(shelfProposals));build();
  for(const [file,text] of before) assert.equal(read(file),text);
  for(const [file,bytes] of oldPublic)assert.ok(fs.readFileSync(path.join(fixture,file)).equals(bytes),'Existing public file changed after pending restoration: '+file);
} finally {
  assert.ok(temp.startsWith(path.join(os.tmpdir(),'emotion-editorial-test-')));
  fs.rmSync(temp,{recursive:true,force:true});
}
const afterInputs=[JSON.parse(fs.readFileSync(path.join(root,'tools/editorial-proposals/books.json'))),JSON.parse(fs.readFileSync(path.join(root,'tools/editorial-proposals/shelves.json')))];
assert.equal(crypto.createHash('sha256').update(JSON.stringify(afterInputs)).digest('hex'),actualInputHash,'Fixtures must never mutate real adoption state');
console.log('PASS editorial foundation: pending '+baseBooks+' books; first-shelf fixture '+(baseBooks+bookProposals.length)+' books / '+(bookProposals.length+1)+' new URLs; featured-only fixture '+(baseBooks+bookProposals.length)+' books / '+(bookProposals.length+shelfProposals.filter(s=>s.featuredProposal).length)+' new URLs; all-proposals fixture '+approvedUrlCount+' new URLs; '+negatives+' negative cases; B UI static contract; '+metaNegatives+' process-result meta cases; pending restored; no owner adoption asserted');
