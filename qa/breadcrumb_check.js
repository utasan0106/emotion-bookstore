#!/usr/bin/env node
'use strict';
// パンくずが、読者の通る道と一致しているか。
//
// 街 → 種類 → 作品。作品ページの eyebrow に「高円寺 / 本・漫画」と出ている、
// その階層そのものを機械に渡している。**見えている道と違う道を機械に教えない**
// ことがここの目的である。だから各段の行き先が実在するかまで見る。
//
// 街の外にある一覧（記事・会場・特集・今週号）は親が一つに決まらないので書かない。
// このテストは「書いていないこと」のほうも固定する。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { items } = require('../tools/city-discovery-source');

const root = path.resolve(__dirname, '..');
const SITE = 'https://emotionbookstore.com/discover/';
const cityNames = { koenji: '高円寺', shimokitazawa: '下北沢', kichijoji: '吉祥寺', jinbocho: '神保町' };
const categoryNames = { audio: '音楽・サウンド', video: '映像', book: '本・漫画', film: '映画' };

const crumbsOf = file => {
  const html = fs.readFileSync(path.join(root, 'discover', file), 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m => JSON.parse(m[1].replace(/\\u003c/g, '<')));
  const found = blocks.filter(o => o['@type'] === 'BreadcrumbList');
  assert.ok(found.length <= 1, file + ': パンくずが二つある');
  return found[0] || null;
};

// 行き先が実在しないパンくずは、機械を行き止まりへ送る。
const fileFor = url => {
  assert.ok(url.startsWith(SITE), 'discover の外を指すパンくず: ' + url);
  const rest = url.slice(SITE.length);
  return path.join(root, 'discover', rest === '' ? 'index.html' : rest.endsWith('/') ? rest + 'index.html' : rest);
};

function expect(file, names) {
  const list = crumbsOf(file);
  assert.ok(list, file + ': パンくずが無い');
  assert.equal(list['@context'], 'https://schema.org', file);
  const steps = list.itemListElement;
  assert.deepEqual(steps.map(s => s.name), names, file + ': 道順が読者の通る道と違う');
  steps.forEach((step, i) => {
    assert.equal(step['@type'], 'ListItem', file);
    assert.equal(step.position, i + 1, file + ': 順番が飛んでいる');
    assert.ok(fs.existsSync(fileFor(step.item)), file + ': 行き先が実在しない ' + step.item);
  });
  assert.equal(steps[0].name, '街から探す', file + ': 起点は街の一覧');
  assert.equal(steps.at(-1).item, SITE + file.replace(/index\.html$/, ''),
    file + ': 最後の段はこのページ自身');
  return steps.length;
}

let detail = 0, category = 0, city = 0;
for (const item of items) {
  expect(`${item.city}/${item.id}.html`,
    ['街から探す', cityNames[item.city], categoryNames[item.kind], item.title]);
  detail++;
}
for (const id of Object.keys(cityNames)) {
  expect(`${id}/index.html`, ['街から探す', cityNames[id]]);
  city++;
  for (const kind of Object.keys(categoryNames)) {
    if (!items.some(i => i.city === id && i.kind === kind)) continue;
    expect(`${id}/${kind}.html`, ['街から探す', cityNames[id], categoryNames[kind]]);
    category++;
  }
}

// 親が一つに決まらないページには書かない。
for (const file of ['index.html', 'essays/index.html', 'listening/index.html',
                    'short-films/index.html', 'weekly/index.html']) {
  if (!fs.existsSync(path.join(root, 'discover', file))) continue;
  assert.equal(crumbsOf(file), null, file + ': 親が一つに決まらないページに道順を書かない');
}

console.log('PASS パンくず ' + (detail + category + city) + 'ページ（作品 ' + detail
  + ' / 種類 ' + category + ' / 街 ' + city + '）。各段の行き先は実在し、'
  + '親が決まらない一覧には書いていない');
