#!/usr/bin/env node
'use strict';
const fs=require('fs'),cp=require('child_process'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const allowed=new Set(['index.html','shelf.html','suggest.html','data.html','credits.html','explore.html','vercel.json','analytics-v3.js','video-embed.js','atlas/index.html','weekly-video.js','weekly-video.css','growth-improvements.js','qa/growth_improvements.js','qa/ga4_v3_client_selftest.js','qa/measurement_v04_selftest.js','qa/release_check.js','qa/browser_qa.js','qa/home_canonical_check.js','qa/thread_check.js','qa/works_check.js','qa/atlas_check.js','qa/atlas_browser_qa.js']);
// Founder-requested Stage B presentation review. Measurement/storage checks below remain unchanged.
for(const file of ['design-redesign.css','tools/design-redesign.js','docs/design-redesign-20260910.md','qa/design-redesign/','qa/design-redesign/index.html','qa/design-redesign/before-home.html','qa/design-redesign/before-city.html','qa/design-redesign/before-article.html']) allowed.add(file);
for(const f of ['index.html','kichijoji/index.html','shimokitazawa/index.html','link-list/film.html','link-list/music.html']) allowed.add('v3-prototype/culture-experience-r2/'+f);
// Founder approved full-page design expansion; runtime payload assertions are unchanged.
for(const f of ['visit/index.html','tools/build-design-redesign.js','qa/design_redesign_check.js','qa/design-redesign/routes.json','docs/design-redesign-stage-c-20260910.md']) allowed.add(f);
/* Measurement v0.4 (2026-09-06): the eight Beta events + nine bounded events. Params are content_type / content_id / link_domain only. */
for(const file of ['home-discovery.css','home-discovery.js','outings/events-data.js','outings/index.html','outings/week.js','outings/outings.css','tools/build-weekly-outings.js','tools/weekly-outings-source.js','qa/home_discovery_check.js','qa/event_supply_check.js','qa/catalogue_supply_check.js','qa/site_integration_check.js','discover/weekly-issue.js','feed.xml','qa/analytics_contract_check.js','data.html','qa/duplicate_text_check.js','tools/venue-source.js','discover/venue-events.js','tools/places-source.js','qa/home-integration-layout.html','qa/HOME_INTEGRATION.md']) allowed.add(file);
const approvedEvents=new Set(['v3_home_view','v3_shelf_open','v3_shelf_view','v3_detail_open','v3_official_action','v3_suggest_view','v3_suggest_copy','v3_suggest_form_open','v3_entry_open','v3_works_section_view','v3_thread_start','v3_thread_stage','v3_thread_complete','v3_evidence_open','v3_external_open','v3_continue_open','v3_media_preview_open']);
// Morning polish: visual changes, explicit regional-weather labels, directory
// Approved editorial summary and city art work; no tracking changes.
for(const file of ['docs/city-discovery/EDITORIAL-STANDARDS-20260910.md']) allowed.add(file);
// Source-based editorial method and claim ledger only; analytics contracts unchanged.
allowed.add('docs/city-discovery/RESEARCH-METHODS-20260910.md');
// Keep the city-page article teaser consistent with the revised evidence-led essay.
allowed.add('tools/city-editorials.js');
/* docs/ は .vercelignore で配信面から外れている内部文書で、runtime には出ない。
   ここが見るのは「保護された runtime が変わっていないこと」なので、文書は対象外でよい。
   1件ずつ許可を足していくと、作業のたびに検査を緩める癖がつく。分類として一度で決める。
   CLAUDE.md も同じ（正本だが配信物ではない）。 */
const internalDoc = p => p === 'CLAUDE.md' || p.startsWith('docs/');
// 催しの再確認と補充にあわせて、在庫下限と再確認期限の契約を実態へ書き直した。
allowed.add('qa/weekly_outings_check.js');
// 足した催しのうち、会場写真があるものを会場に結び直した。権利は既存の記載のまま。
allowed.add('tools/event-media-source.js');
// Xの投稿が140字（weighted 280）に収まっているかを測る。配信面には出ない。
allowed.add('tools/check-post-length.js');
/* 再確認期限の固まりを、切れる前に見つける。9/21 の事故は「切れてから」しか
   鳴らさなかったことで見逃された。検知と、その契約を固定するテストを足した。 */
for (const f of ['tools/review-culture-events.js', 'qa/events_expiry_cluster_check.js',
  'qa/verify-product.js']) allowed.add(f);
for(const file of ['assets/city-editorial/','docs/city-discovery/CITY-ART-20260910.md']) allowed.add(file);
for(const city of ['kichijoji','koenji','shimokitazawa','jinbocho']) allowed.add('assets/city-editorial/'+city+'.webp');
// routing and their bounded QA. The measurement code/payload contract is unchanged.
for(const file of ['city-weather.js','discover/index.html','page-nav.css','site-system.css','tools/build-city-discovery.js','qa/catalogue_regression_check.js','qa/city_discovery_check.js','qa/weather_client_check.js','qa/type-layout.html','qa/morning-layout.html','DESIGN.md','docs/morning-polish-20260909.md']) allowed.add(file);
// Source-reviewed city research changes presentation and provenance only. It does
// not alter the bounded measurement vocabulary or attach analytics to research data.
for(const file of ['tools/city-research.js','discover/discover.css','discover/index.html','discover/essays/index.html','discover/essays/kichijoji-advertising.html','qa/city_discovery_check.js','tools/build-city-discovery.js','sitemap.xml','docs/city-discovery/RESEARCH-PILOT-20260909.md']) allowed.add(file);
// Editorial launch slice: new sourced article and navigation only; no new analytics payloads.
for(const file of ['discover/essays/shimokitazawa-railway.html','discover/shimokitazawa/index.html','docs/city-discovery/EDITORIAL-GROWTH-20260909.md','docs/city-discovery/LAUNCH-COPY-20260909.md']) allowed.add(file);
// Navigation/readability audit: explicit generated pages and presentation files.
// Analytics vocabulary, payload checks and protected runtime checks remain intact.
for(const file of [
 "about.html",
 "credits.html",
 "data.html",
 "discover/essays/index.html",
 "discover/essays/kichijoji-advertising.html",
 "discover/essays/shimokitazawa-railway.html",
 "discover/index.html",
 "discover/jinbocho/audio.html",
 "discover/jinbocho/book.html",
 "discover/jinbocho/chikuon-beautiful.html",
 "discover/jinbocho/film.html",
 "discover/jinbocho/gorilla-secret.html",
 "discover/jinbocho/gyokueido.html",
 "discover/jinbocho/honobe-girl.html",
 "discover/jinbocho/index.html",
 "discover/jinbocho/italia.html",
 "discover/jinbocho/iwanami-hall.html",
 "discover/jinbocho/jinbocho-1960s.html",
 "discover/jinbocho/kaijin.html",
 "discover/jinbocho/morisaki-film.html",
 "discover/jinbocho/motoki-tongping.html",
 "discover/jinbocho/sunshin-anniversary.html",
 "discover/jinbocho/ugetsu.html",
 "discover/jinbocho/used-book-festival.html",
 "discover/jinbocho/video.html",
 "discover/kichijoji/audio.html",
 "discover/kichijoji/baus.html",
 "discover/kichijoji/book.html",
 "discover/kichijoji/film.html",
 "discover/kichijoji/honnoniwa.html",
 "discover/kichijoji/index.html",
 "discover/kichijoji/kichion-ichihara.html",
 "discover/kichijoji/kichion-lady.html",
 "discover/kichijoji/kichion-toranoko.html",
 "discover/kichijoji/kobayashi-kokuhaku.html",
 "discover/kichijoji/musashino-green.html",
 "discover/kichijoji/park-voice.html",
 "discover/kichijoji/parks.html",
 "discover/kichijoji/rocky-horror.html",
 "discover/kichijoji/takeuchi-ai-rain.html",
 "discover/kichijoji/uchu-mao-haircolor.html",
 "discover/kichijoji/uplink.html",
 "discover/kichijoji/video.html",
 "discover/kichijoji/yoshida-night-edge.html",
 "discover/kichijoji/yoshida-tinderness.html",
 "discover/koenji/audio.html",
 "discover/koenji/awa-2025.html",
 "discover/koenji/awa-history.html",
 "discover/koenji/big-the-grape.html",
 "discover/koenji/book.html",
 "discover/koenji/film.html",
 "discover/koenji/index.html",
 "discover/koenji/jirokichi.html",
 "discover/koenji/moon-in-june-play.html",
 "discover/koenji/next-town-koenji.html",
 "discover/koenji/night-glory-scarlet.html",
 "discover/koenji/pal-street.html",
 "discover/koenji/pink-minds-live.html",
 "discover/koenji/ramen-heads.html",
 "discover/koenji/rokkoku-kitchen.html",
 "discover/koenji/seabirth-live.html",
 "discover/koenji/shogakko.html",
 "discover/koenji/street-food.html",
 "discover/koenji/tenguren.html",
 "discover/koenji/unnameable-dance.html",
 "discover/koenji/video.html",
 "discover/shimokitazawa/aterui.html",
 "discover/shimokitazawa/audio.html",
 "discover/shimokitazawa/bilingualboy-love.html",
 "discover/shimokitazawa/blazer.html",
 "discover/shimokitazawa/bocchi-main-pv.html",
 "discover/shimokitazawa/book.html",
 "discover/shimokitazawa/film.html",
 "discover/shimokitazawa/gekijyo.html",
 "discover/shimokitazawa/index.html",
 "discover/shimokitazawa/indies.html",
 "discover/shimokitazawa/kaho-asa.html",
 "discover/shimokitazawa/kitazawa-guide.html",
 "discover/shimokitazawa/mabuta-roundabout.html",
 "discover/shimokitazawa/machinouede.html",
 "discover/shimokitazawa/metrois-tokyo.html",
 "discover/shimokitazawa/obonro-walk.html",
 "discover/shimokitazawa/shelter-news.html",
 "discover/shimokitazawa/sleepinside-recycle.html",
 "discover/shimokitazawa/tefu-1500.html",
 "discover/shimokitazawa/video.html",
 "discover/shimokitazawa/womenslib-interview.html",
 "discover/short-films/find-my-tokyo.html",
 "discover/short-films/index.html",
 "discover/short-films/panasonic-life.html",
 "discover/short-films/toyota-loving-eyes.html",
 "docs/city-discovery/NAVIGATION-READABILITY-20260909.md",
 "explore.html",
 "index.html",
 "outings/2026-09-07/inokashira-zoo.html",
 "outings/2026-09-07/inokashira.html",
 "outings/2026-09-07/jimbocho-bookcenter.html",
 "outings/2026-09-07/kichijoji-museum.html",
 "outings/2026-09-07/za-koenji.html",
 "outings/children.html",
 "outings/couple.html",
 "outings/events/jinbocho-ginga.html",
 "outings/events/jinbocho-mizoguchi.html",
 "outings/events/jinbocho-pokemon.html",
 "outings/events/jinbocho-silent.html",
 "outings/events/jinbocho-taiwan.html",
 "outings/events/jinbocho-whale.html",
 "outings/events/kichijoji-festival.html",
 "outings/events/kichijoji-hard-problem.html",
 "outings/events/kichijoji-kunita.html",
 "outings/events/kichijoji-livepainting.html",
 "outings/events/kichijoji-taniguchi.html",
 "outings/events/kichijoji-winter.html",
 "outings/events/koenji-azuma.html",
 "outings/events/koenji-bakumatsu.html",
 "outings/events/koenji-cafetalk.html",
 "outings/events/koenji-mambo.html",
 "outings/events/koenji-midsummer.html",
 "outings/events/koenji-percussion.html",
 "outings/events/shimokita-criticism.html",
 "outings/events/shimokita-goat.html",
 "outings/events/shimokita-hug.html",
 "outings/events/shimokita-moon.html",
 "outings/events/shimokita-oshibon.html",
 "outings/events/shimokita-unknown.html",
 "outings/family.html",
 "outings/friends.html",
 "outings/index.html",
 "outings/solo.html",
 "page-nav.css",
 "qa/city_discovery_check.js",
 "qa/culture_continuity_check.js",
 "qa/navigation-layout.html",
 "qa/navigation_readability_check.js",
 "qa/release_check.js",
 "qa/verify-product.js",
 "saved.html",
 "shelf.html",
 "site-system.css",
 "suggest.html",
 "thread.html",
 "tools/build-city-discovery.js",
 "tools/city-research.js",
 "tools/page-chrome.js",
 "tools/site-navigation.js",
 "work-book.html",
 "work-film.html",
 "work-music.html",
 "work-video.html",
 "works.html"
]) allowed.add(file);
function fail(m){console.error('V3_RELEASE_GROWTH_SELFTEST_FAIL: '+m);process.exit(1)}
function assert(c,m){if(!c)fail(m)} function read(r){return fs.readFileSync(path.join(ROOT,r),'utf8')} function git(a){return cp.execFileSync('git',['-C',ROOT].concat(a),{encoding:'utf8'}).trimEnd()}
const analytics=read('analytics-v3.js');
assert(analytics.includes("var PROD_HOST = 'emotionbookstore.com'"),'prod host guard');
assert(analytics.includes('if (location.hostname !== PROD_HOST) return;'),'hostname early return');
assert(analytics.includes('send_page_view: false'),'send_page_view false');
assert(analytics.includes('allow_google_signals: false'),'signals false');
assert(analytics.includes('allow_ad_personalization_signals: false'),'ad personalization false');
assert(analytics.includes("ad_storage: 'denied'"),'ad storage denied');
assert(analytics.includes('COOKIE_EXPIRES_SECONDS = 60 * 24 * 60 * 60'),'60d cookie');
assert(analytics.includes("campaignSource === 'x' || campaignSource === 'note'"),'src whitelist');
assert(!analytics.includes('target.href'),'external URL read into analytics');
assert(!analytics.includes('objectName'),'object name analytics leak');
/* v0.4 bounded vocabulary: no free values, no koenji_awaodori, no video id / coordinates vocabulary; unknown ids drop */
const analyticsCode=analytics.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,''); for(const t of ['koenji_awaodori','video_id','videoId','data-video-id','gml','latitude','longitude','coordinates','viewport','textContent','innerText','document.title']) assert(!analyticsCode.includes(t),'forbidden measurement vocabulary '+t);
for(const t of ["v3_media_preview_open', { content_type: 'video', content_id: origin }","if (origin !== 'thread' && origin !== 'work') return;","'koenji-dance-history': 'koenji_dance_history'","function isAllowedContentId(value)","var domain = safeDomain(href);","link_domain: domain","thread_stage: true","'koenji_dance_history:s5': true","'morisaki_film:w5': true","var WORK_ENTRY_IDS = { book: 'book', film: 'film', music: 'music', video: 'video' };","a.hc-city.shelf-entry[href]","a.hc-work[data-work][href]","a.hc-hero-cta[href], a.hc-thread-read[href]","a.hc-reality-card.official-action[href]","a.weekly-feature-official[href]","a.wk-action[href]","a.th-source-link[href]","a.th-destination-link[href]","a.al-link[href]","within: '.al-attribution-links'",".th-thread[data-thread-id]","function sendBounded(name, type, id, extra)"]) assert(analytics.includes(t),'v4.1 contract missing: '+t);
/* v4.1: no generic works id, no bare stage ids, no landing-based entry for shelf / works / thread, no calendar utility; GA4 config carries sanitized page fields */
for(const t of ["works: true","s0: true","w0: true","api.entryOpen('work', 'works')","api.entryOpen('shelf'","threadIdFromRoute","weekly-feature-calendar","calendar.google.com"]) assert(!analyticsCode.includes(t),'v4.1 forbids: '+t);
/* v4.1: the only landing-based entry is the Spatial Beta; every other entry is a HOME click on a cultural entrance */
{const landing=(analyticsCode.match(/api\.entryOpen\([^)]*\)/g)||[]); assert(landing.length===4&&landing.includes("api.entryOpen('spatial', 'koenji')")&&landing.includes("api.entryOpen('city', cityId)")&&landing.includes("api.entryOpen('work', workId)")&&landing.includes("api.entryOpen('thread', threadId)"),'v4.1 entry call sites: '+landing.join(' | ')); assert(analyticsCode.indexOf("if (page === 'spatial') api.entryOpen('spatial', 'koenji');")>0&&analyticsCode.indexOf("function homeEntry(target)")>0,'v4.1 entry structure');}
{const i=analytics.indexOf("window.gtag('config', MEASUREMENT_ID, {"); const cfg=analytics.slice(i,analytics.indexOf('});',i)); for(const t of ['send_page_view: false','allow_google_signals: false','allow_ad_personalization_signals: false','cookie_expires: COOKIE_EXPIRES_SECONDS','page_location: safeLocation()','page_title: coarseTitle()','page_referrer: safeReferrer()']) assert(cfg.includes(t),'GA4 config hardening missing: '+t);}
const measurementSelftest=cp.spawnSync(process.execPath,[path.join(ROOT,'qa/measurement_v04_selftest.js')],{encoding:'utf8'}); assert(measurementSelftest.status===0&&/MEASUREMENT_V4_1_SELFTEST_GO/.test(measurementSelftest.stdout),'measurement v4.1 selftest: '+(measurementSelftest.stdout+measurementSelftest.stderr).slice(0,600));
const ve=read('video-embed.js'); assert(ve.includes('window.v3Analytics.mediaPreviewOpen()')&&ve.indexOf("host.setAttribute('data-video-state', 'loaded');")<ve.indexOf('window.v3Analytics.mediaPreviewOpen()')&&!ve.includes('gtag')&&!ve.includes('dataLayer'),'video-embed.js: media preview event only after the click created the player, via the bounded API');
assert(read('atlas/index.html').includes('<script src="../analytics-v3.js"></script>')&&!read('atlas/app.js').includes('v3Analytics')&&!read('atlas/app.js').includes('gtag'),'atlas: shared loader only; app.js carries no measurement code');
const tokens=new Set(analytics.match(/v3_[a-z_]+/g)||[]); for(const t of tokens)assert(approvedEvents.has(t)||t==='v3_ga_optout','unapproved event '+t); for(const e of approvedEvents)assert(tokens.has(e),'missing event '+e);
for(const rel of ['index.html','shelf.html','suggest.html','data.html','credits.html','explore.html']){const h=read(rel);assert(!h.includes('このページでは保存・計測・個人ごとの推薦を行いません'),rel+': old copy');assert(h.includes('<script src="./analytics-v3.js"></script>'),rel+': analytics loader');assert(/<a\b[^>]*href="\.\/data\.html"[^>]*>データの扱い<\/a>/.test(h),rel+': data link')}
/* Discovery HOME uses an approved book cover and official Bandcamp artwork.
   PARKS uses its reviewed official trailer; event definitions and bounded payloads are unchanged. */
const index=read('index.html'); for(const t of ['id="weeklyVideoPlay"','data-video-id=','./weekly-video.css','./weekly-video.js','i.ytimg.com']) assert(!index.includes(t),'retired weekly video token on HOME: '+t);
const indexBody=index.slice(index.indexOf('<body'));
const approvedHomeMedia=new Set([
 'https://www.hanmoto.com/bd/isbn/9784911191026',
 'https://img.hanmoto.com/bd/img/9784911191026.jpg?lastupdated=2025-04-23T10%3A22%3A06%2B09%3A00',
 'https://bandcamp.com/EmbeddedPlayer/album=1846332570/size=large/bgcol=ffffff/linkcol=0687f5/minimal=true/transparent=true/',
 'https://boris.bandcamp.com/album/you-laughed-like-a-water-mark-live-at-shelter-20070204',
 'https://www.youtube.com/watch?v=dt33RGSRuo0',
 'https://www.youtube.com/watch?v=pm7RBghFt0I',
 'https://www.youtube-nocookie.com/embed/pm7RBghFt0I?autoplay=0&amp;playsinline=1&amp;rel=0'
]);
for(const [,url] of indexBody.matchAll(/(?:src|href)="((?:https?:)?\/\/[^"]+)"/g)) assert(approvedHomeMedia.has(url),'Unreviewed external home source: '+url);
assert(indexBody.includes('href="/outings/"')&&indexBody.includes('href="/discover/"'),'HOME must expose working event and work entries');
for(const [,src] of index.matchAll(/<iframe[^>]*src="([^"]+)"/g)) assert(approvedHomeMedia.has(src)&&(/bandcamp\.com\/EmbeddedPlayer\/|youtube-nocookie\.com\/embed\/pm7RBghFt0I\?autoplay=0/.test(src)),'Only the reviewed album and PARKS trailer may load on HOME');
assert(index.includes('id="hc-works"')&&index.includes('id="hc-thread"'),'HOME section ids');
for(const rel of ['index.html','shelf.html','suggest.html','data.html','credits.html','explore.html']){const h=read(rel);assert(!h.includes('#weekly-detour')&&!h.includes('#by-kind'),rel+': retired HOME anchor');assert(h.includes('href="./credits.html"'),rel+': credits link')}
if(fs.existsSync(path.join(ROOT,'weekly-video.js'))){const video=read('weekly-video.js'); assert(video.includes('https://www.youtube-nocookie.com/embed/'),'nocookie'); assert(video.includes("iframe.referrerPolicy = 'strict-origin-when-cross-origin'"),'referrer'); assert(video.includes("button.addEventListener('click'"),'click gate'); assert(!video.includes('youtube.com/iframe_api'),'YT API'); assert(!video.includes('localStorage')&&!video.includes('geolocation'),'video storage/location');}
const vercel=read('vercel.json'); assert(vercel.includes("frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'"),'CSP'); assert(!vercel.includes("frame-src 'none'"),'old CSP');
/* data.html の trust copy は現在の runtime だけを言う。旧 HOME の週間動画
   （週末の前の一本 / 31秒の動画を再生 / HOME の YouTube 埋め込み）は canonical HOME に
   無く、いまどのページも YouTube を読まない。外部サービスへの移動は「押したときだけ」
   で、GA4 のオン／オフとは別の操作であることは引き続き言う。 */
const data=read('data.html'); for(const t of ['週末の前の一本','31秒の動画を再生','weeklyVideoPlay','youtube-nocookie']) assert(!data.includes(t),'data.html: retired HOME video claim remains: '+t); assert(data.includes('トップではYouTubeプレーヤーを読み込みません。'),'data.html: disclose the homepage trailer link accurately'); assert(data.includes('外部サービスへの移動はGA4のオン／オフとは別の操作です。'),'GA4/external navigation distinction'); for(const t of ['どの種類の入口を開いたか、どの公開ページや段階まで到達したか、資料を開いたか、公式サイトなど現実側の外部リンクへ進んだかを、限定した公開IDで計測する場合があります','Cookie等の識別子、閲覧・操作のイベント、端末・ブラウザの情報、IPアドレス等から推定されるおおよその地域、参照元（リファラー）','「気になる」の内容、感情、GPSや現在地、アカウントやユーザーのIDを送りません','外部リンクの完全なURL・クエリ・ハッシュ、動画のID、正確な座標、視点や表示範囲、選択した建物やその識別子も送りません']) assert(data.includes(t),'data.html: v4.1 Trust disclosure missing: '+t); for(const t of ['位置情報はGA4へ送らない','位置情報を送りません','個人情報を送りません']) assert(!data.includes(t),'data.html: over-broad privacy claim: '+t);
/* 催しの再確認・補充は毎週の定常作業で、1件でも直せば催しの個別ページ・会場ページ・今週号が
   必ず作り直される。中身は各 build の --check が別に照合するので、ここでは所在だけ許可する。 */
const rebuiltByEvents=p=>p.startsWith('outings/events/')||p.startsWith('discover/venue/')||p==='discover/weekly/index.html';
for(const p of ['release.js','release_content.js','release.css']) assert(git(['diff','--',p])==='','protected changed '+p); git(['diff','--check']); const status=git(['status','--porcelain']); if(status)for(const line of status.split(/\r?\n/)){let rel=line.slice(3).trim();if(rel.includes(' -> '))rel=rel.split(' -> ',2)[1];assert(allowed.has(rel)||rebuiltByEvents(rel)||internalDoc(rel),'unexpected '+rel)}
console.log('V3_RELEASE_GROWTH_SELFTEST_GO');
