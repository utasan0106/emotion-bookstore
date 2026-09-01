#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

for (const file of ['index.html','shelf.html','data.html','robots.txt','sitemap.xml']) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}

if (!failures.length) {
  const index = read('index.html');
  const shelf = read('shelf.html');
  const runtime = read('release.js');
  const data = read('data.html');
  const robots = read('robots.txt');
  const sitemap = read('sitemap.xml');

  if (index.includes('人が選んだ店・場所・本・映画・音楽・催し')) {
    failures.push('index.html: stale anonymous editorial metadata remains');
  }
  if (!index.includes('感情書店の編集部が選んだ店・場所・本・映画・音楽・催し')) {
    failures.push('index.html: editorial-team metadata missing');
  }
  if (!index.includes('type="application/ld+json"') ||
      !index.includes('"@type": "WebSite"') ||
      !index.includes('"url": "https://emotionbookstore.com/"')) {
    failures.push('index.html: WebSite JSON-LD missing');
  }

  if (data.includes('<span class="jp-phrase">人が選んだ</span>')) {
    failures.push('data.html: stale 人が選んだ copy remains');
  }
  if (!data.includes('<span class="jp-phrase">感情書店の編集部が選んだ</span>')) {
    failures.push('data.html: editorial-team copy missing');
  }

  if (!shelf.includes('name="twitter:title"') ||
      !shelf.includes('name="twitter:description"')) {
    failures.push('shelf.html: Twitter metadata missing');
  }

  if (shelf.includes('rel="canonical"')) {
    failures.push('shelf.html: static canonical must remain absent because 4 shelves differ');
  }

  for (const required of [
    'function syncShelfMetadata(shelf)',
    "document.createElement('link')",
    "canonical.rel = 'canonical'",
    "https://emotionbookstore.com/shelf.html?shelf=",
    `setMeta('meta[property=\"og:url\"]', canonicalUrl)`,
    `setMeta('meta[name=\"twitter:title\"]', pageTitle)`,
    "syncShelfMetadata(shelf);"
  ]) {
    if (!runtime.includes(required)) failures.push(`release.js: shelf canonical/social sync missing ${required}`);
  }

  if (!runtime.includes("if (id === 'tokyo') id = 'kichijoji';")) {
    failures.push('release.js: legacy tokyo shelf normalization missing');
  }

  if (!/^User-agent: \*\nAllow: \/\n\nSitemap: https:\/\/emotionbookstore\.com\/sitemap\.xml\n$/.test(robots)) {
    failures.push('robots.txt: exact allow-all + sitemap contract missing');
  }

  const requiredUrls = [
    'https://emotionbookstore.com/',
    'https://emotionbookstore.com/shelf.html?shelf=kichijoji',
    'https://emotionbookstore.com/shelf.html?shelf=koenji',
    'https://emotionbookstore.com/shelf.html?shelf=shimokitazawa',
    'https://emotionbookstore.com/shelf.html?shelf=jinbocho'
  ];
  for (const url of requiredUrls) {
    if (!sitemap.includes(`<loc>${url}</loc>`)) failures.push(`sitemap.xml missing ${url}`);
  }
}

if (failures.length) {
  console.error('SEO_CHECK_FAIL');
  failures.forEach((x) => console.error('- ' + x));
  process.exit(1);
}

console.log('SEO_CHECK_GO');
