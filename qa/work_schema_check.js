#!/usr/bin/env node
'use strict';
// 作品77件の構造化データが、持っている事実と食い違っていないか。
//
// 催しのときと同じ線を引いている。**多く書くほど良い、ではない。**
// creator は「犬童一心 監督 / 田中泯」「ドキュメンタリー」のような自由文で、
// 著者・監督・演奏者として型に入れられる形では持っていない。街との関係も
// 「物語の舞台」から「高円寺の映画祭で上映」まで40通り以上あり、
// contentLocation にすると、上映しただけの街を作品の舞台だと言うことになる。
// 書かないことが正しい。このテストは、書かないことのほうを固定する。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { items } = require('../tools/city-discovery-source');

const root = path.resolve(__dirname, '..');
const expected = { book: 'Book', film: 'Movie', audio: 'MusicRecording', video: 'VideoObject' };
const ld = file => {
  const html = fs.readFileSync(path.join(root, 'discover', file), 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, file + ': 構造化データが無い');
  return JSON.parse(m[1].replace(/\\u003c/g, '<'));
};

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

  // 公式・一次の行き先だけを sameAs にする。サイト内のページは同じものではない。
  if (/^https:\/\//.test(item.url)) {
    assert.equal(work.sameAs, item.url, file + ': 公式の行き先が一致しない');
  } else {
    assert.ok(!('sameAs' in work), file + ': サイト内のページを作品そのものとして書かない');
  }

  // 型に入れられる形で持っていないものは書かない。
  for (const key of ['author', 'director', 'byArtist', 'creator', 'actor', 'musicBy']) {
    assert.ok(!(key in work), file + ': ' + key + ' は自由文しか持っていない');
  }
  for (const key of ['contentLocation', 'spatialCoverage', 'locationCreated']) {
    assert.ok(!(key in work), file + ': 街との関係は「上映」も含む。場所として書かない');
  }
  for (const key of ['image', 'thumbnailUrl', 'datePublished', 'uploadDate', 'duration',
                     'isbn', 'aggregateRating', 'review', 'offers']) {
    assert.ok(!(key in work), file + ': ' + key + ' は持っていない');
  }
}

// 作品ページ以外に広げない。街の一覧や特集は作品そのものではない。
const notWork = ['index.html', 'koenji/index.html', 'koenji/book.html', 'listening/index.html'];
for (const file of notWork) {
  if (!fs.existsSync(path.join(root, 'discover', file))) continue;
  assert.ok(!('mainEntity' in ld(file)), file + ': 一覧ページを作品として書かない');
}

console.log('PASS ' + items.length + '件の作品に構造化データ（'
  + Object.entries(counts).map(([t, n]) => t + ' ' + n).join(' / ')
  + '）。題名・紹介文・公式の行き先は元データと一致し、持っていない事実は書いていない');
