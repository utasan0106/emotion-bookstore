'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const files=require('../tools/build-design-redesign');
// What the reader could reach and read at the approved baseline must still be on the
// site. Editorial work adds objects and moves which one a city page leads with, so
// this is checked across the whole catalogue rather than page by page: a destination
// or a sentence may move to another page, but it may not disappear.
const baselineLinks=new Set(),currentLinks=new Set(),baselineText=new Set(),currentText=[];
const eventSource=require('../tools/weekly-outings-source'),eventWeek=require('../outings/week');
const eventToday=eventWeek.date(Date.now());
const retiredEventLinks=new Set(eventSource.events.filter(e=>!(eventSource.isPublishableEvent(e)&&e.status==='scheduled'&&e.checkedAt<=eventToday&&e.reviewThrough>=eventToday&&eventWeek.dates(e).at(-1)>=eventToday)).flatMap(e=>['/outings/events/'+e.id+'.html',e.url]));
const redirectDestinations=new Map((JSON.parse(fs.readFileSync('vercel.json','utf8')).redirects||[]).filter(r=>r.source&&r.destination).map(r=>[r.source,r.destination]));
const retiredShortLinks=new Set([
  'https://emotionbookstore.com/discover/short-films/panasonic-life.html',
  'https://www.youtube-nocookie.com/embed/Bu5LNJYGY8k?autoplay=0&amp;playsinline=1&amp;rel=0',
  'https://www.youtube.com/watch?v=Bu5LNJYGY8k',
  'https://channel.panasonic.com/jp/',
  'https://emotionbookstore.com/discover/short-films/find-my-tokyo.html',
  'https://www.youtube-nocookie.com/embed/RpSlspjIeG8?autoplay=0&amp;playsinline=1&amp;rel=0',
  'https://www.youtube.com/watch?v=RpSlspjIeG8',
  'https://www.tokyometro.jp/news/2024/218221.html',
  'https://emotionbookstore.com/discover/short-films/toyota-loving-eyes.html',
  'https://www.youtube-nocookie.com/embed/mh_QCvulKSY?autoplay=0&amp;playsinline=1&amp;rel=0',
  'https://www.youtube.com/watch?v=mh_QCvulKSY'
]);
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
  // HOMEの週替わり面は固定本文ではない。top feature と「気になるものから」は
  // weekly ledger / home_weekly_refresh_check が有限性・更新・行き先を検証する。
  .replace(/<section class="hd-feature"[^>]*>[\s\S]*?<\/section>/g,'')
  .replace(/<section id="hc-works"[^>]*>[\s\S]*?<\/section>/g,'')
  .replace(/<section[^>]*aria-labelledby="hd-shorts-title"[^>]*>[\s\S]*?<\/section>/g,'')
  // 時間依存の一覧は design の固定本文ではない。専用の freshness / event QA で守る。
  .replace(/<section[^>]*id="city-signals"[^>]*>[\s\S]*?<\/section>/g,'')
  .replace(/<ul[^>]*data-ending-list[^>]*>[\s\S]*?<\/ul>/g,'')
  .replace(/<ul[^>]*data-venue-events[^>]*>[\s\S]*?<\/ul>/g,'')
  // 2026-09-22：画像直下は鑑賞・発見の表面。出典・作者・権利・「〜ではありません」
  // は Credits / source QA に集約したため、figcaption は本文保存契約の対象外にする。
  .replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/g,'')
  // 催し一覧は週次で入れ替わる運用面。古い event-card の文言を永続保存せず、
  // weekly_outings / timing / pending gate / generated-page QA で現在性を守る。
  .replace(/<article class="event-card"[^>]*>[\s\S]*?<\/article>/g,'')
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
  '?kind=video#hc-works': '/work-video.html',
  // 2026-09-11：「すべて」だけが向け直されずに残っていた。HOMEの初期状態がもともと
  // all なので、押しても表示は何も変わらない。ファウンダーが「押しても何もならない」と
  // 指摘したのはこれ。上の3つと同じ方針で、件数の見える作品のハブへ渡す。
  '?kind=all#hc-works': '/works.html',
  // 2026-09-22：HOME画像直下の個別クレジットを表面から外し、詳細はCreditsへ集約。
  '/credits.html#inokashira-pond': '/credits.html',
  // 2026-09-22：HOMEから外した外部書影URLは、権利・出典をCreditsへ集約。
  'https://img.hanmoto.com/bd/img/9784911191026.jpg?lastupdated=2025-04-23T10%3A22%3A06%2B09%3A00': '/credits.html'
};
for(const l of baselineLinks){
 if(currentLinks.has(l)) continue;
 const replacement=retiredDestinations[l] || (retiredEventLinks.has(l) ? '/outings/' : undefined) || (retiredShortLinks.has(l) ? '/discover/short-films/' : undefined) || redirectDestinations.get(l);
 // 2026-09-22：終了・再確認期限切れの催し詳細は検索/runtimeから物理削除する。
 // 旧URLを無関係な現行ページへHTTP redirectせず、サイト内には現在の催し一覧を残す。
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
  '4（GA4）でページ表示のほか、街・作品・催し・スレッドなど公開中のコンテンツについて、どの種類の入口を開いたか、どの公開ページや段階まで到達したか、資料を開いたか、公式サイトなど現実側の外部リンクへ進んだかを、限定した公開IDで計測する場合があります。',
  // 2026-09-11：催しを公式ページで再確認したので、この日付が最新の確認日に変わった。
  // 文そのものは書き換えていない。日付は件数と同じくカタログから導かれる値で、
  // 編集部が書いた文言ではない。読者に古い確認日を見せ続けないために更新される。
  '開催週の絞り込みにはJavaScriptを使います。確認時（2026-09-08）の開催予定：':
  '開催週の絞り込みにはJavaScriptを使います。確認時（2026-09-11）の開催予定：',
  // 2026-09-22：検索結果でサイトの対象地域と内容が分かるよう、HOME title を
  // ブランド中心から「東京5街 × 本・映画・音楽・文化イベント」の検索意図へ改定。
  'みんなの感情書店｜作品から、街へ。':
  '東京5街の本・映画・音楽・文化イベント｜みんなの感情書店',
  // PARKSの旧一文は、現在の詳細ページで作品フックと街との関係に分けて具体化。
  '井の頭公園を舞台に、音楽と人がつながる映画。':
  '一曲が時代をつなぐ映画から、公園の声を聴きにいく。',
  '作品と吉祥寺のつながり':
  '作品と街のつながりを読む',
  '公式予告をYouTubeで観る':
  '公式予告と公園の声を観る',
  'みんなの感情書店｜作品から入る':
  '東京の本・映画・音楽・映像｜みんなの感情書店',
  '街から音楽、映像、本、映画を探す｜みんなの感情書店':
  '東京5街から本・映画・音楽・文化を探す｜みんなの感情書店',
  '高円寺の作品｜みんなの感情書店':
  '高円寺の本・映画・音楽・映像｜みんなの感情書店',
  '下北沢の作品｜みんなの感情書店':
  '下北沢の本・映画・音楽・映像｜みんなの感情書店',
  '吉祥寺の作品｜みんなの感情書店':
  '吉祥寺の本・映画・音楽・映像｜みんなの感情書店',
  '神保町の作品｜みんなの感情書店':
  '神保町の本・映画・音楽・映像｜みんなの感情書店',
  '今週の感情書店｜みんなの感情書店':
  '今週の東京カルチャー｜高円寺・下北沢・吉祥寺・神保町｜みんなの感情書店',
  '今、街で出会える文化｜みんなの感情書店':
  '高円寺・下北沢・吉祥寺・神保町の文化イベント｜今週のライブ・舞台・映画・展示｜みんなの感情書店'
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
