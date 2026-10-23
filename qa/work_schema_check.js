#!/usr/bin/env node
'use strict';
// 作品の構造化データを表示本文・確認済みの書誌と照合する。
// 未確認の役割・版・体験・評価は補わない。街との関係を所在地へ変換しない。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { items } = require('../tools/city-discovery-source');

const root = path.resolve(__dirname, '..');
// この小修正は出典不明のコメント削除だけ。検索・学習の許可を変えない。
const robotsDirectives = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8')
  .split(/(?<=\n)/).filter(line => !/^\s*#/.test(line)).join('');
assert.equal(robotsDirectives,
  'User-agent: *\nAllow: /\n\nSitemap: https://emotionbookstore.com/sitemap.xml\n\n',
  'robots.txt: コメント以外の実ディレクティブを変更しない');
const expected = { book: 'Book', film: 'Movie', audio: 'MusicRecording', video: 'VideoObject' };
const ld = file => {
  const html = fs.readFileSync(path.join(root, 'discover', file), 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, file + ': 構造化データが無い');
  return JSON.parse(m[1].replace(/\\u003c/g, '<'));
};

// Source-independent expectations for the reviewed Book author/edition change.
const bookAuthors = {
  'koenji/junjo':'ねじめ正一', 'koenji/shiroku-somaru':'安倍雄太郎', 'koenji/1q84':'村上春樹',
  'shimokitazawa/nekomachi':'萩原朔太郎', 'shimokitazawa/lady-jane':'大木雄高',
  'shimokitazawa/indies':'岡崎琢磨', 'shimokitazawa/honda':'徳永京子',
  'kichijoji/cinema-history':'本田拓夫', 'kichijoji/honnoniwa':'藤野ふじの',
  'kichijoji/gou-gou-book':'大島弓子', 'jinbocho/morisaki':'八木沢里志',
  'jinbocho/morisaki-sequel':'八木沢里志', 'jinbocho/furuhon':'原田ひ香',
  'jinbocho/furuhon-sequel':'原田ひ香', 'jinbocho/kaijin':'紀田順一郎'
};
const bookIsbns = {
  'koenji/junjo':'9784101021126', 'shimokitazawa/indies':'9784408557588',
  'shimokitazawa/honda':'9784835638492', 'kichijoji/honnoniwa':'9784867168523',
  'kichijoji/gou-gou-book':'9784048532587', 'jinbocho/kaijin':'9784488406080'
};
const covers = require('../tools/work-cover-source.json');
const escaped = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validIsbn13 = value => /^\d{13}$/.test(value) && [...value].reduce((sum,n,i)=>sum+Number(n)*(i%2?3:1),0)%10===0;

const counts = {};
for (const item of items) {
  const file = `${item.city}/${item.id}.html`;
  const page = ld(file);
  const work = page.mainEntity;

  assert.equal(page['@type'], 'WebPage', file + ': ページ自体は WebPage のまま');
  assert.ok(work, file + ': 作品そのものが機械に渡っていない');
  assert.equal(work['@type'], expected[item.kind], file + ': 種類が元データと違う');
  counts[work['@type']] = (counts[work['@type']] || 0) + 1;
  assert.equal(work.name, item.title, file + ': 題名が一致しない');
  assert.equal(work.description, item.hook, file + ': 紹介文が一致しない');
  assert.equal(work.url, 'https://emotionbookstore.com/discover/' + file, file + ': ページの住所が違う');

  const key = item.city+'/'+item.id;
  const citationOnly = key === 'koenji/1q84';
  if (citationOnly) {
    assert.ok(!('sameAs' in work), file + ': ゆかりの地記事を作品と同一視しない');
    assert.equal(page.citation, item.url, file + ': 紹介ページの根拠を保持する');
    assert.ok(!('citation' in work), file + ': 元の本が後年の記事を引用したとは言わない');
  } else if (/^https:\/\//.test(item.url)) {
    assert.equal(work.sameAs, item.url, file + ': 既存の公式行き先が一致しない');
  } else {
    assert.ok(!('sameAs' in work), file + ': サイト内のページを作品そのものとして書かない');
  }
  if (bookAuthors[key]) {
    assert.equal(item.kind, 'book');
    assert.deepEqual(work.author, {'@type':'Person',name:bookAuthors[key]}, file + ': 確認済み著者と一致');
    const displayCreator = key === 'shimokitazawa/honda' ? '本多一夫 語り / 徳永京子 著' : bookAuthors[key];
    assert.equal(item.creator, displayCreator, file + ': 語り手と著者の役割を混ぜない');
    const html = fs.readFileSync(path.join(root,'discover',file),'utf8');
    assert.ok(html.includes('<p class="detail-creator">'+escaped(displayCreator)+'</p>'), file + ': 表示本文とも一致');
  } else {
    assert.ok(!('author' in work), file + ': 編者・未確認の役割を著者へ変換しない');
  }
  if (bookIsbns[key]) {
    assert.equal(work.isbn, bookIsbns[key]);
    assert.equal(covers[key].isbn, work.isbn, file + ': 既存版台帳と一致');
    assert.ok(validIsbn13(work.isbn), file + ': ISBN-13 checksum');
  } else {
    assert.ok(!('isbn' in work), file + ': 未確認の版や1Q84の一冊を全作品へ流用しない');
  }
  for (const key of ['director', 'byArtist', 'creator', 'actor', 'musicBy']) {
    assert.ok(!(key in work), file + ': ' + key + ' は自由文しか持っていない');
  }
  for (const key of ['contentLocation', 'spatialCoverage', 'locationCreated']) {
    assert.ok(!(key in work), file + ': 街との関係は「上映」も含む。場所として書かない');
  }
  for (const key of ['image', 'thumbnailUrl', 'datePublished', 'uploadDate', 'duration',
                     'aggregateRating', 'review', 'offers']) {
    assert.ok(!(key in work), file + ': ' + key + ' は持っていない');
  }
}

// 作品ページ以外に広げない。街の一覧や特集は作品そのものではない。
const notWork = ['index.html', 'koenji/index.html', 'koenji/book.html', 'listening/index.html'];
for (const file of notWork) {
  if (!fs.existsSync(path.join(root, 'discover', file))) continue;
  assert.ok(!('mainEntity' in ld(file)), file + ': 一覧ページを作品として書かない');
}

// Independently reviewed edition expectations, not inferred from title strings.
const newEditions={
 '9784103549512':{title:'成瀬は天下を取りにいく',author:'宮島未奈',date:'2023-03-17'},
 '9784103524519':{title:'思わず考えちゃう',author:'ヨシタケシンスケ',date:'2019-03-29'}
};
for(const book of require('../tools/work-catalogue').catalogue().books) {
  const html=fs.readFileSync(path.join(root,book.path),'utf8');
  const page=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const work=page.mainEntity, expected=newEditions[book.isbn];
  assert.ok(expected,'New editions require independent QA evidence');
  assert.equal(page['@type'],'WebPage');assert.equal(work['@type'],'Book');
  assert.equal(page.url,'https://emotionbookstore.com'+book.path);
  assert.equal(work['@id'],page.url+'#book');assert.equal(work.url,page.url);
  assert.equal(work.name,expected.title);assert.deepEqual(work.author,{'@type':'Person',name:expected.author});
  assert.equal(work.isbn,book.isbn,'Independent Book ISBN matches its reviewed edition');assert.ok(validIsbn13(work.isbn));
  assert.deepEqual(work.publisher,{'@type':'Organization',name:'新潮社'});
  assert.equal(work.datePublished,expected.date);assert.equal(work.sameAs,book.sourceUrl);
  assert.deepEqual(page.citation,book.sources.map(s=>s.url));
  for(const value of [expected.title,expected.author,work.isbn,expected.date,book.editionLabel,book.sourceCheckedOn]) assert.ok(html.includes(escaped(value)),'Visible edition fact missing: '+value);
  for(const field of ['review','aggregateRating','offers','locationCreated','contentLocation']) assert.ok(!(field in work));
  assert.ok(!('datePublished' in page)&&!('dateModified' in page),'Book publication/source checks cannot fabricate a page publication date');
}

console.log('PASS ' + items.length + '件の作品に構造化データ（'
  + Object.entries(counts).map(([t, n]) => t + ' ' + n).join(' / ')
  + '）。題名・紹介文・公式の行き先は元データと一致し、持っていない事実は書いていない');
