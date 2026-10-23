'use strict';
// Offline contract for the exact reviewed edition. Browser decoding of all five
// routes is a separate assertion in five_city_browser_check.js, never inferred
// from permitting or blocking a request to an external publisher.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const expected={
 key:'jinbocho/kaijin', isbn:'9784488406080',
 imageUrl:'/assets/book-covers/9784488406080.jpg', width:218, height:306,
 sha256:'2156a90aba78501f47c6679552fbb2d9e784a5df9ee9434886bc0aefc9aaed40',
 originalImageUrl:'https://www.tsogen.co.jp/img/cover_image_l/40608.jpg',
 sourceUrl:'https://www.tsogen.co.jp/np/isbn/9784488406080',
 termsUrl:'https://www.tsogen.co.jp/annai/faq.html',
 credit:'『神保町の怪人』紀田順一郎／創元推理文庫（東京創元社）／装画：影山徹／装幀：山田英春',
 pages:['works.html','work-book.html','discover/jinbocho/index.html','discover/jinbocho/book.html','discover/jinbocho/kaijin.html']
};
const cover=require('../tools/work-cover-source.json')[expected.key];
assert.equal(cover.status,'usable');
for(const key of ['isbn','imageUrl','width','height','sha256','originalImageUrl','sourceUrl','termsUrl','credit'])
 assert.equal(cover[key],expected[key],'Reviewed cover metadata: '+key);
const bytes=fs.readFileSync(path.join(root,expected.imageUrl));
assert.equal(bytes.length,151683,'Complete original image bytes');
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected.sha256,'No crop, replacement, conversion or upscaling');
for(const name of expected.pages){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 const figures=[...html.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/g)].map(m=>m[0]).filter(s=>s.includes('src="'+expected.imageUrl+'"'));
 assert.equal(figures.length,1,name+': one exact local cover');
 assert.ok(figures[0].includes('width="218" height="306"'),name+': declared original dimensions');
 assert.ok(/<figcaption>[\s\S]*<\/figcaption>/.test(figures[0]),name+': adjacent credit');
 assert.ok(figures[0].match(/<figcaption>([\s\S]*?)<\/figcaption>/)[1].includes(expected.credit),name+': full artist/designer/author/imprint credit');
 assert.ok(html.includes('href="'+expected.sourceUrl+'"'),name+': official edition remains linked');
 assert.ok(!html.includes(expected.originalImageUrl),name+': no residual publisher image request');
}
console.log('PASS kaijin cover: reviewed bytes exist; exact edition, full credit and local URL on all five routes (browser decode checked separately)');
module.exports=expected;
