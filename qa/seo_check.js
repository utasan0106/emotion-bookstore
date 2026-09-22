#!/usr/bin/env node
'use strict';

const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));

for(const file of ['index.html','works.html','shelf.html','robots.txt','sitemap.xml','vercel.json','discover/index.html','discover/weekly/index.html','outings/index.html']){
  assert.ok(exists(file),'missing '+file);
}

// Canonical host migration.
const config=JSON.parse(read('vercel.json'));
const legacyRedirect=(config.redirects||[]).find(r=>(r.has||[]).some(h=>h.type==='host'&&h.value==='emotion-bookstore.vercel.app'));
assert.ok(legacyRedirect,'legacy Vercel hostname must redirect');
assert.equal(legacyRedirect.permanent,true,'legacy host redirect must be permanent');
assert.equal(legacyRedirect.destination,'https://emotionbookstore.com/:path*');
assert.equal(legacyRedirect.source,'/:path*');

// Robots + sitemap.
const robots=read('robots.txt');
assert.match(robots,/^User-agent: \*\nAllow: \/\n\nSitemap: https:\/\/emotionbookstore\.com\/sitemap\.xml/m);
const sitemap=read('sitemap.xml');
assert.doesNotMatch(sitemap,/emotion-bookstore\.vercel\.app/,'sitemap must use canonical domain');
assert.doesNotMatch(sitemap,/<loc>[^<]*\?[^<]*<\/loc>/,'query-state URLs do not belong in sitemap');
const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(locs).size,locs.length,'sitemap URLs must be unique');
for(const required of [
  'https://emotionbookstore.com/',
  'https://emotionbookstore.com/works.html',
  'https://emotionbookstore.com/discover/',
  'https://emotionbookstore.com/discover/koenji/',
  'https://emotionbookstore.com/discover/shimokitazawa/',
  'https://emotionbookstore.com/discover/kichijoji/',
  'https://emotionbookstore.com/discover/jinbocho/',
  'https://emotionbookstore.com/discover/kiyosumi/',
  'https://emotionbookstore.com/discover/weekly/',
  'https://emotionbookstore.com/outings/'
]) assert.ok(locs.includes(required),'sitemap missing '+required);

// Index/noindex split: static search landings index, stateful shelf does not.
const shelf=read('shelf.html');
assert.match(shelf,/<meta name="robots" content="noindex,follow">/,'dynamic shelf must be noindex,follow');
const works=read('works.html');
assert.doesNotMatch(works,/<meta name="robots" content="noindex/,'works catalogue should be indexable');

// Critical metadata.
const critical=[
 ['index.html','https://emotionbookstore.com/'],
 ['works.html','https://emotionbookstore.com/works.html'],
 ['discover/index.html','https://emotionbookstore.com/discover/'],
 ['discover/koenji/index.html','https://emotionbookstore.com/discover/koenji/'],
 ['discover/shimokitazawa/index.html','https://emotionbookstore.com/discover/shimokitazawa/'],
 ['discover/kichijoji/index.html','https://emotionbookstore.com/discover/kichijoji/'],
 ['discover/jinbocho/index.html','https://emotionbookstore.com/discover/jinbocho/'],
 ['discover/kiyosumi/index.html','https://emotionbookstore.com/discover/kiyosumi/'],
 ['discover/weekly/index.html','https://emotionbookstore.com/discover/weekly/'],
 ['outings/index.html','https://emotionbookstore.com/outings/']
];
const titles=[];
for(const [file,url] of critical){
 const html=read(file);
 const title=(html.match(/<title>([^<]+)<\/title>/)||[])[1];
 const description=(html.match(/<meta name="description" content="([^"]+)">/)||[])[1];
 const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/)||[])[1];
 assert.ok(title&&title.length>=8,file+': descriptive title required');
 assert.ok(description&&description.length>=35,file+': useful meta description required');
 assert.equal(canonical,url,file+': self canonical required');
 assert.doesNotMatch(html,/emotion-bookstore\.vercel\.app/,file+': old host must not appear');
 titles.push(title);
}
assert.equal(new Set(titles).size,titles.length,'critical titles should be unique');
assert.match(read('index.html'),/<title>東京5街の本・映画・音楽・文化イベント｜みんなの感情書店<\/title>/);
for(const city of ['高円寺','下北沢','吉祥寺','神保町']){
 const file={高円寺:'koenji',下北沢:'shimokitazawa',吉祥寺:'kichijoji',神保町:'jinbocho'}[city];
 assert.match(read('discover/'+file+'/index.html'),new RegExp('<title>'+city+'の本・映画・音楽・映像'));
}
assert.match(read('discover/weekly/index.html'),/<title>今週の東京カルチャー/);
assert.match(read('outings/index.html'),/<title>高円寺・下北沢・吉祥寺・神保町の文化イベント/);

// Unreviewed events must never become acquisition landing links.
const inventory=require('../tools/weekly-outings-source');
const pending=inventory.events.filter(e=>!inventory.isPublishableEvent(e)).map(e=>e.id);
const weekly=read('discover/weekly/index.html');
for(const id of pending) assert.doesNotMatch(weekly,new RegExp('/outings/events/'+id+'\\.html'), 'weekly links pending event '+id);
for(const venue of ['jirokichi','za-koenji','shelter','star-pines-cafe','jinbocho-theater']){
 const html=read('discover/venue/'+venue+'/index.html');
 for(const id of pending) assert.doesNotMatch(html,new RegExp('/outings/events/'+id+'\\.html'),venue+' links pending event '+id);
}

console.log('SEO_CHECK_GO: canonical host, clean sitemap, index split, unique metadata, reviewed-event acquisition surfaces');
