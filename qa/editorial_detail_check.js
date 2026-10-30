#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const strip = html => html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s/g, '');
const pages = [
  {
    file: 'works/bookstore-waits.html',
    h1: '本屋に、暮らしの相談が届く。',
    official: ['https://natsuhasha.com/book/9784904816431/', 'https://aoyamabc.jp/products/honyade-matsu'],
    related: ['bookstore-want.html'],
  },
  {
    file: 'works/cinema-rapsody.html',
    h1: '上映しない映画祭も、映画館の仕事。',
    official: ['https://prtimes.jp/main/html/rd/p/000000289.000014977.html'],
    related: ['baus.html', 'yen-work.html'],
  },
  {
    file: 'works/magic-moment.html',
    h1: '映画館の続け方は、ひとつじゃない。',
    official: ['https://magicmoment2023.wixsite.com/official', 'https://magicmoment2023.wixsite.com/official/theater'],
    related: ['cinema-rapsody.html'],
  },
  {
    file: 'works/yen-work.html',
    h1: '映画が始まる前に、描く人がいる。',
    official: ['https://mikata-ent.com/movie/1858/'],
    related: ['baus.html'],
  },
];

for (const page of pages) {
  const html = read(page.file);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, page.file + ': one H1');
  const h1 = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [,''])[1]);
  assert.equal(h1, page.h1, page.file + ': requested H1');
  assert.equal((html.match(/<section class="story-chapter"/g) || []).length, 3, page.file + ': three chapters');
  assert.match(html, /<section class="story-bibliography"/, page.file + ': bibliography');
  assert.match(html, /<nav class="story-related"/, page.file + ': related reading');
  assert.match(html, /<details class="story-notes">/, page.file + ': collapsed editorial note');
  assert.match(html, /確認日：2026年10月30日/, page.file + ': source check date');
  assert.match(html, /href="\.\.\/feature\.html#[^"]+"/, page.file + ': feature return');
  assert.match(html, /href="https:\/\/x\.com\/emotion_books"/, page.file + ': X update link');
  assert.match(html, /href="https:\/\/note\.com\/emotion__books"/, page.file + ': note update link');
  assert.match(html, /id="header-menu-trigger"[\s\S]*id="floating-menu-trigger"[\s\S]*id="site-menu"[\s\S]*id="menu-close"/, page.file + ': common menu hooks');
  assert.doesNotMatch(html, /<img[^>]+src="https?:/i, page.file + ': no new remote image');
  assert.doesNotMatch(html, /<iframe/i, page.file + ': initial iframe count is zero');
  assert.doesNotMatch(html, /未鑑賞なので|公式資料をもとに|入口を置く|その手前/, page.file + ': repetitive or defensive prose');
  for (const url of page.official) assert.ok(html.includes('href="' + url + '"'), page.file + ': official URL ' + url);
  for (const href of page.related) assert.ok(html.includes('href="' + href + '"'), page.file + ': related URL ' + href);

  const intro = (html.match(/<div class="story-intro">[\s\S]*?<p>([\s\S]*?)<\/p><\/div>/) || [,''])[1];
  const chapters = [...html.matchAll(/<div class="story-copy">([\s\S]*?)<\/div>/g)].map(match => strip(match[1]));
  const bodyLength = strip(intro).length + chapters.reduce((sum, text) => sum + text.length, 0);
  assert.ok(bodyLength >= 550 && bodyLength <= 800, page.file + ': body is about 600 Japanese characters (' + bodyLength + ')');
}

const yen = read('works/yen-work.html');
assert.match(yen, /data-trailer-video="vuajhTYk_Gw"/);
assert.match(yen, /src="\.\.\/assets\/editorial-20261030\/trailers\/yen\.jpg"/);
assert.match(yen, /src="\.\.\/assets\/editorial-20261030\/trailers\.js"/);
assert.match(yen, /href="\.\.\/assets\/editorial-20261030\/trailers\.css"/);
assert.match(yen, /61分[^<]*.*64分/s, 'yen detail records the source duration mismatch');
for (const page of pages.filter(page => !page.file.endsWith('yen-work.html'))) {
  assert.doesNotMatch(read(page.file), /data-trailer-video|trailers\.js|trailer-poster/, page.file + ': no unverified trailer UI');
}

const feature = read('feature.html');
const about = read('about.html');
for (const page of pages) {
  assert.ok(feature.includes('href="' + page.file + '"'), 'feature links ' + page.file);
  assert.ok(about.includes('href="' + page.file + '"'), 'about links ' + page.file);
}
for (const existing of ['works/honda.html','works/baus.html','works/small-bookstore.html','works/bookstore-want.html','works/basie.html','works/jirokichi.html']) {
  assert.ok(feature.includes('href="' + existing + '"'), 'feature retains ' + existing);
  assert.ok(about.includes('href="' + existing + '"'), 'about retains ' + existing);
}

const typography = read('assets/editorial-20261030/typography.css');
assert.match(typography, /kanjou-book-sans-400\.woff2/);
assert.match(typography, /kanjou-book-sans-700\.woff2/);
assert.match(read('assets/editorial-20261030/feature-stories.css'), /#b5482c|var\(--orange\)/);

console.log('PASS 4 editorial details: 3 chapters, ~600-char bodies, bibliography, official/related links, notes, routes, local trailer privacy');
