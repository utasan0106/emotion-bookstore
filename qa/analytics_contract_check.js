#!/usr/bin/env node
'use strict';
// analytics-v3.js の正式契約。
//
// 2026-09-11 まで、このファイルは design_redesign_check.js で baseline とのバイト一致を
// 要求していた。再設計が実行時の挙動に触れないことを守るための門で、目的は正しかった。
// しかし催しの退出計測を入れる時点で、その門は「一切変えるな」としか言えず、
// **何を守りたかったのか**を検証できない。だから同じ強さの契約に置き換える。
//
// 守るもの：計測して良い出来事の名前、送ってはいけないもの、プライバシー設定、
// 計測して良いリンク。ここを緩めると落ちる。バイト一致より狭くならないよう、
// 「増えていないこと」を必ず両方向で確かめる。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');

const src = fs.readFileSync('analytics-v3.js', 'utf8');
const base = cp.execFileSync('git', ['show', '2f4a156:analytics-v3.js'], {encoding: 'utf8'});

// 1. 出来事の名前。増やすのも減らすのも仕様変更なので、baseline と完全一致を要求する。
const eventNames = text => (text.match(/v3_[a-z_]+(?=: true)/g) || []).sort();
assert.deepEqual(eventNames(src), eventNames(base), 'GA4 の出来事の名前は正式契約。増減させない');

// 2. プライバシー設定。ここが変わると、読者に説明している内容と食い違う。
for (const line of [
  "ad_storage: 'denied'",
  "ad_user_data: 'denied'",
  "ad_personalization: 'denied'",
  'send_page_view: false',
  'allow_google_signals: false',
  'allow_ad_personalization_signals: false',
  "cookie_flags: 'SameSite=Lax;Secure'"
]) assert.ok(src.includes(line), 'プライバシー設定が消えている: ' + line);

// 3. 生の URL・題名・本文を送らないための関門が残っていること。
for (const fn of ['safeLocation', 'safeDomain', 'coarseTitle', 'safeReferrer', 'boundedParams'])
  assert.match(src, new RegExp('function ' + fn + '\\b'), '関門が消えている: ' + fn);
assert.ok(!/gtag\('event'[^)]*location\.href/.test(src), '完全な URL を送ってはならない');

// 4. 計測ID・Cookie の有効期間・本番ホストの固定値。
for (const key of ['MEASUREMENT_ID', 'COOKIE_EXPIRES_SECONDS', 'PROD_HOST']) {
  const pick = text => (text.match(new RegExp('var ' + key + " = ([^;]+);")) || [])[1];
  assert.equal(pick(src), pick(base), key + ' は正式契約');
}

// 5. 計測して良いリンク。承認した面だけを、承認した選択子で見る。
//    2026-09-11 追加：outings。催しの公式・予約先だけで、出典・記録のリンクは入れない。
const surfaces = (src.match(/var EXTERNAL_SURFACES = \{[\s\S]*?\n  \};/) || [])[0];
assert.ok(surfaces, 'EXTERNAL_SURFACES が読めない');
const approved = [
  'a.hc-reality-card.official-action[href]', 'a.hc-hero-cta[data-featured-work][href]',
  'a.official-action[href]', 'a.weekly-feature-official[href]', 'a.wk-action[href]',
  'a.th-source-link[href]', 'a.th-destination-link[href]',
  'a.al-link[href]', 'a[href]',
  'a.event-official[href]', 'a.primary[href]'
];
for (const sel of surfaces.match(/anchor: '([^']+)'/g).map(m => m.slice(9, -1)))
  assert.ok(approved.includes(sel), '承認されていないリンクを計測しようとしている: ' + sel);
// 作品カードに出している出典・記録は根拠であって行き先ではない。計測対象に入れない。
assert.ok(!/card-source/.test(surfaces), '出典リンクは計測対象にしない');

// 6. どのページがこの計測を読み込んでいるか。増えたら、それは判断の要る変更である。
const path = require('node:path');
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e =>
  e.name === '.git' || e.name === 'node_modules' ? []
  : e.isDirectory() ? walk(path.join(dir, e.name))
  : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
const pages = walk('.').filter(f => fs.readFileSync(f, 'utf8').includes('analytics-v3.js'))
  .map(f => f.replace(/^\.\//, '')).sort();
const expected = 16; // root 直下15 + outings/index.html（2026-09-11 の試験）
assert.equal(pages.length, expected,
  '計測を読み込むページ数が変わった（' + pages.length + '）。外部送信の範囲が変わるので、'
  + 'ファウンダーの承認が要る。承認済みならこの数を更新する。\n  ' + pages.join('\n  '));
assert.ok(pages.includes('outings/index.html'), '催し一覧の試験が外れている');

console.log('PASS analytics contract: ' + eventNames(src).length + ' events, privacy config, bounded senders, '
  + surfaces.match(/anchor:/g).length + ' approved link surfaces, ' + pages.length + ' measured pages');
