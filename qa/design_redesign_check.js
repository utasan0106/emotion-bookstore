'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const files=require('../tools/build-design-redesign');
// What the reader could reach and read at the approved baseline must still be on the
// site. Editorial work adds objects and moves which one a city page leads with, so
// this is checked across the whole catalogue rather than page by page: a destination
// or a sentence may move to another page, but it may not disappear.
const baselineLinks=new Set(),currentLinks=new Set(),baselineText=new Set(),currentText=[];
for(const file of files){
 const html=fs.readFileSync(file,'utf8');
 assert.equal((html.match(/href="\/design-redesign.css"/g)||[]).length,1,file+' stylesheet count');
 assert.match(html,/<body[^>]*class="[^"]*\bdesign-redesign\b/,file+' scoped theme');
 const once=require('../tools/design-redesign')(file.replace(/^discover\//,''),html);
 assert.equal(require('../tools/design-redesign')(file.replace(/^discover\//,''),once),once,file+' idempotence');
 // Pages added after the baseline have nothing to preserve; the checks above still apply.
 let base=null;
 try{base=cp.execFileSync('git',['show','2f4a156:'+file],{encoding:'utf8',stdio:['pipe','pipe','pipe']});}catch{continue;}
 // All original links and content remain available; only wrappers/classes/styles change.
 // Official players are click-to-load: the provider URL now rides on data-embed-src
 // instead of src, so it still has to be there. The loader itself is not a destination.
 // A click-to-load YouTube player carries its id; it still resolves to the same
 // provider target the page used to embed directly, so compare it in that form.
 const expand=s=>s.replace(/data-video-id="([A-Za-z0-9_-]{11})"/g,(_m,id)=>'data-embed-src="https://www.youtube-nocookie.com/embed/'+id+'?autoplay=0&amp;playsinline=1&amp;rel=0"');
 const links=s=>[...expand(s).matchAll(/(?:href|src|data-embed-src)="([^"]+)"/g)].map(m=>m[1]).filter(v=>!v.endsWith('.css')&&v!=='/assets/brand/emotion-bookstore-lockup-reversed.png'&&!/(?:^|\/)(?:video-embed|player)\.js$/.test(v)).sort();
 for(const l of links(base)) baselineLinks.add(l);
 for(const l of links(html)) currentLinks.add(l);
 // Everything the reader had must still be there. The only addition allowed is the
 // click-to-load affordance itself: its button and the sentence explaining it.
 const text=s=>s.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g,'')
  .replace(/<button class="v3-video-load[^"]*"[^>]*>[\s\S]*?<\/button>/g,'')
  .replace(/<(span|p) class="official-media-note">[\s\S]*?<\/\1>/g,'')
  .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 // Counts are derived from the catalogue, not written by an editor: a collection that
 // held one object and now holds three legitimately stops saying 1件. Everything a
 // person actually wrote is still compared.
 const derived=/^[0-9０-９]+(件|本|冊)?$/;
 for(const seg of text(base).split(' ')) if(seg&&!derived.test(seg)) baselineText.add(seg);
 currentText.push(text(html));
}
// 意図して閉じた行き先は、代わりにどこへ行くのかを書く。書かなければ落ちる。
// 2026-09-10：トップのカテゴリはページ内の絞り込みだった。押しても1件しか出ず、
// 読者が離脱する。全件のある一覧へ向け直した。
const retiredDestinations={
  '?kind=book#hc-works': '/work-book.html',
  '?kind=music#hc-works': '/work-music.html',
  '?kind=video#hc-works': '/work-video.html'
};
for(const l of baselineLinks){
 if(currentLinks.has(l)) continue;
 const replacement=retiredDestinations[l];
 assert.ok(replacement,'destination no longer anywhere on the site: '+l);
 assert.ok(currentLinks.has(replacement),'retired destination '+l+' names a replacement that is not linked: '+replacement);
}
const everything=currentText.join(' ');
// 書き換えた文は、何に書き換えたのかを書く。書かなければ落ちる。行き先と同じ扱い。
// 2026-09-11：催しの退出計測を1ページで試すにあたり、data.html の計測範囲の説明に
// 「催し」を加えた。読者への説明が実装より狭いままにならないようにするため。
const revisedText={
  // 2026-09-11：詳細ページで、街との関係の説明が「◯◯とのつながり」の節と、この開閉
  // ブロックの両方に、同じ文面で二度出ていた。48件は開いても確認日しか入っていない。
  // 説明・出典・確認日を一つの節にまとめ、開閉ブロックを畳んだ。見出しは節が引き継ぐ。
  'この街との関係・出典': 'とのつながり',
  '4（GA4）でページ表示のほか、街・作品・スレッドなど公開中のコンテンツについて、どの種類の入口を開いたか、どの公開ページや段階まで到達したか、資料を開いたか、公式サイトなど現実側の外部リンクへ進んだかを、限定した公開IDで計測する場合があります。':
  '4（GA4）でページ表示のほか、街・作品・催し・スレッドなど公開中のコンテンツについて、どの種類の入口を開いたか、どの公開ページや段階まで到達したか、資料を開いたか、公式サイトなど現実側の外部リンクへ進んだかを、限定した公開IDで計測する場合があります。'
};
for(const seg of baselineText){
 if(everything.includes(seg)) continue;
 const revised=revisedText[seg];
 assert.ok(revised,'content no longer anywhere on the site: '+JSON.stringify(seg.slice(0,40)));
 assert.ok(everything.includes(revised),'revised text names a replacement that is not on the site: '+JSON.stringify(revised.slice(0,40)));
}
// analytics-v3.js はここを外れた。2026-09-11、催しの退出計測を入れるため。
// バイト一致は「一切変えるな」としか言えず、何を守りたかったのかを検証できない。
// 同じ強さの契約を qa/analytics_contract_check.js に移した（出来事の名前・プライバシー
// 設定・生URLを送らない関門・計測して良いリンク・計測を読み込むページ数）。緩めていない。
for(const file of ['release.js','release_content.js','release.css','memory-note.js','api/tokyo-weather.js']){
 assert.equal(fs.readFileSync(file,'utf8'),cp.execFileSync('git',['show','2f4a156:'+file],{encoding:'utf8'}),file+' protected contract');
}
// vercel.json carries the redirects that keep retired URLs alive, and editorial work
// edits it: publishing an object replaces its redirect with the real page. So what is
// checked is the promise itself — every address that answered at the baseline still
// answers, either as a redirect or as a page on disk.
{
 const routes=j=>Object.fromEntries((JSON.parse(j).redirects||[]).map(r=>[r.source,r.destination]));
 const base=routes(cp.execFileSync('git',['show','2f4a156:vercel.json'],{encoding:'utf8'}));
 const now=routes(fs.readFileSync('vercel.json','utf8'));
 for(const source of Object.keys(base)){
  if(now[source]) continue;
  const page=source.replace(/^\//,'');
  assert.ok(fs.existsSync(page)||fs.existsSync(page.replace(/\/$/,'/index.html')),'retired address stopped answering: '+source);
 }
 assert.equal(JSON.stringify(JSON.parse(fs.readFileSync('vercel.json','utf8')).headers),JSON.stringify(JSON.parse(cp.execFileSync('git',['show','2f4a156:vercel.json'],{encoding:'utf8'})).headers),'vercel.json headers are a protected contract');
}
console.log('PASS '+files.length+' pages: theme, idempotence, content/destination preservation; protected runtime unchanged');
