#!/usr/bin/env node
'use strict';
const fs=require('fs'),cp=require('child_process'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const allowed=new Set(['index.html','shelf.html','suggest.html','data.html','credits.html','explore.html','vercel.json','analytics-v3.js','video-embed.js','atlas/index.html','weekly-video.js','weekly-video.css','growth-improvements.js','qa/growth_improvements.js','qa/ga4_v3_client_selftest.js','qa/measurement_v04_selftest.js','qa/release_check.js','qa/browser_qa.js','qa/home_canonical_check.js','qa/thread_check.js','qa/works_check.js','qa/atlas_check.js','qa/atlas_browser_qa.js']);
/* Measurement v0.4 (2026-09-06): the eight Beta events + nine bounded events. Params are content_type / content_id / link_domain only. */
const approvedEvents=new Set(['v3_home_view','v3_shelf_open','v3_shelf_view','v3_detail_open','v3_official_action','v3_suggest_view','v3_suggest_copy','v3_suggest_form_open','v3_entry_open','v3_works_section_view','v3_thread_start','v3_thread_stage','v3_thread_complete','v3_evidence_open','v3_external_open','v3_continue_open','v3_media_preview_open']);
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
/* Editorial HOME opens one official video on click. No external media on paint.
   Event definitions and bounded payloads remain unchanged. */
const index=read('index.html'); for(const t of ['id="weeklyVideoPlay"','data-video-id=','./weekly-video.css','./weekly-video.js','i.ytimg.com','<iframe']) assert(!index.includes(t),'retired weekly video token on HOME: '+t);
const indexBody=index.slice(index.indexOf('<body'));
/* FOUNDER PREVIEW FIX UNIT D: HOME body の外部 href は「実際の場所へ」の 3 つの公式 destination（a.official-action、click まで通信なし）だけ。
   それ以外の外部 src / href は引き続き 0。GA4 は既存の v3_official_action を再利用し、event / param は増やさない。 */
// Current HOME routes to the curated catalogue and event list on this origin.
const homeExternal=indexBody.match(/(?:src|href)="(?:https?:)?\/\/[^"]+"/g)||[];
assert(homeExternal.length===1&&homeExternal[0]==='href="https://www.youtube.com/watch?v=dt33RGSRuo0"','HOME permits only its explicitly selected official feature link');
assert(indexBody.includes('href="./outings/"')&&indexBody.includes('href="./discover/index.html"'),'HOME must expose working event and work entries');
assert(index.includes('id="hc-works"')&&index.includes('id="hc-thread"'),'HOME section ids');
for(const rel of ['index.html','shelf.html','suggest.html','data.html','credits.html','explore.html']){const h=read(rel);assert(!h.includes('#weekly-detour')&&!h.includes('#by-kind'),rel+': retired HOME anchor');assert(h.includes('href="./credits.html"'),rel+': credits link')}
if(fs.existsSync(path.join(ROOT,'weekly-video.js'))){const video=read('weekly-video.js'); assert(video.includes('https://www.youtube-nocookie.com/embed/'),'nocookie'); assert(video.includes("iframe.referrerPolicy = 'strict-origin-when-cross-origin'"),'referrer'); assert(video.includes("button.addEventListener('click'"),'click gate'); assert(!video.includes('youtube.com/iframe_api'),'YT API'); assert(!video.includes('localStorage')&&!video.includes('geolocation'),'video storage/location');}
const vercel=read('vercel.json'); assert(vercel.includes("frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'"),'CSP'); assert(!vercel.includes("frame-src 'none'"),'old CSP');
/* data.html の trust copy は現在の runtime だけを言う。旧 HOME の週間動画
   （週末の前の一本 / 31秒の動画を再生 / HOME の YouTube 埋め込み）は canonical HOME に
   無く、いまどのページも YouTube を読まない。外部サービスへの移動は「押したときだけ」
   で、GA4 のオン／オフとは別の操作であることは引き続き言う。 */
const data=read('data.html'); for(const t of ['週末の前の一本','31秒の動画を再生','weeklyVideoPlay','youtube-nocookie']) assert(!data.includes(t),'data.html: retired HOME video claim remains: '+t); assert(!/トップページ[^<]*(YouTube|動画)/.test(data),'data.html: must not describe a HOME video/YouTube behaviour'); assert(data.includes('外部サービスへの移動はGA4のオン／オフとは別の操作です。'),'GA4/external navigation distinction'); for(const t of ['どの種類の入口を開いたか、どの公開ページや段階まで到達したか、資料を開いたか、公式サイトなど現実側の外部リンクへ進んだかを、限定した公開IDで計測する場合があります','Cookie等の識別子、閲覧・操作のイベント、端末・ブラウザの情報、IPアドレス等から推定されるおおよその地域、参照元（リファラー）','「気になる」の内容、感情、GPSや現在地、アカウントやユーザーのIDを送りません','外部リンクの完全なURL・クエリ・ハッシュ、動画のID、正確な座標、視点や表示範囲、選択した建物やその識別子も送りません']) assert(data.includes(t),'data.html: v4.1 Trust disclosure missing: '+t); for(const t of ['位置情報はGA4へ送らない','位置情報を送りません','個人情報を送りません']) assert(!data.includes(t),'data.html: over-broad privacy claim: '+t);
for(const p of ['release.js','release_content.js','release.css']) assert(git(['diff','--',p])==='','protected changed '+p); git(['diff','--check']); const status=git(['status','--porcelain']); if(status)for(const line of status.split(/\r?\n/)){let rel=line.slice(3).trim();if(rel.includes(' -> '))rel=rel.split(' -> ',2)[1];assert(allowed.has(rel),'unexpected '+rel)}
console.log('V3_RELEASE_GROWTH_SELFTEST_GO');
