#!/usr/bin/env node
'use strict';
const fs=require('fs'),cp=require('child_process'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const allowed=new Set(['index.html','shelf.html','suggest.html','vercel.json','analytics-v3.js','data.html','weekly-video.js','weekly-video.css','growth-improvements.js','qa/growth_improvements.js','qa/ga4_v3_client_selftest.js','qa/release_check.js']);
const approvedEvents=new Set(['v3_home_view','v3_shelf_open','v3_shelf_view','v3_detail_open','v3_official_action','v3_suggest_view','v3_suggest_copy','v3_suggest_form_open']);
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
const tokens=new Set(analytics.match(/v3_[a-z_]+/g)||[]); for(const t of tokens)assert(approvedEvents.has(t)||t==='v3_ga_optout','unapproved event '+t); for(const e of approvedEvents)assert(tokens.has(e),'missing event '+e);
for(const rel of ['index.html','shelf.html','suggest.html']){const h=read(rel);assert(!h.includes('このページでは保存・計測・個人ごとの推薦を行いません'),rel+': old copy');assert(h.includes('<script src="./analytics-v3.js"></script>'),rel+': analytics loader');assert(/<a\b[^>]*href="\.\/data\.html"[^>]*>データの扱い<\/a>/.test(h),rel+': data link')}
const index=read('index.html'); assert(index.includes('id="weeklyVideoPlay"'),'weekly play'); assert(index.includes('data-video-id="TNomzoYXWMc"'),'video id'); assert(index.includes('東京都公式「東京動画」掲載'),'provenance'); assert(index.includes('ページ表示時にはYouTubeへ接続しません'),'disclosure'); assert(index.includes('./weekly-video.css'),'video css'); assert(index.includes('./weekly-video.js'),'video js'); assert(!index.includes('i.ytimg.com'),'external thumbnail');
const video=read('weekly-video.js'); assert(video.includes('https://www.youtube-nocookie.com/embed/'),'nocookie'); assert(video.includes("iframe.referrerPolicy = 'strict-origin-when-cross-origin'"),'referrer'); assert(video.includes("button.addEventListener('click'"),'click gate'); assert(!video.includes('youtube.com/iframe_api'),'YT API'); assert(!video.includes('localStorage')&&!video.includes('geolocation'),'video storage/location');
const vercel=read('vercel.json'); assert(vercel.includes("frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'"),'CSP'); assert(!vercel.includes("frame-src 'none'"),'old CSP');
const data=read('data.html'); assert(data.includes('youtube-nocookie.com'),'YouTube disclosure'); assert(data.includes('GA4のオン／オフとは別の操作'),'GA4/YouTube distinction');
for(const p of ['release.js','release_content.js','release.css']) assert(git(['diff','--',p])==='','protected changed '+p); git(['diff','--check']); const status=git(['status','--porcelain']); if(status)for(const line of status.split(/\r?\n/)){let rel=line.slice(3).trim();if(rel.includes(' -> '))rel=rel.split(' -> ',2)[1];assert(allowed.has(rel),'unexpected '+rel)}
console.log('V3_RELEASE_GROWTH_SELFTEST_GO');
