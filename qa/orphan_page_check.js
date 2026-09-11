#!/usr/bin/env node
'use strict';
// どこからも行けないページを見つける。
//
// リンクは JS が後から足すことがある（`release.js` は explore.html への導線を
// 実行時に描く）。**静的に href を数えるだけでは、行けるページを行けないと
// 言ってしまう。** だから実際にブラウザで開いて、そのとき DOM にあるリンクを数える。
//
// 「どこからも行けない」こと自体は欠陥ではない。役目を終えた URL を
// 404 にせず noindex で残すのは正しい扱いである。欠陥なのは
// **検索に載せるつもりのページが、どこからも行けない**状態のほうである。
//
//   NODE_PATH=/opt/node22/lib/node_modules node qa/orphan_page_check.js
//
// playwright とブラウザが要るので verify-product には入れていない。週次で回す。

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 8932;
const ROOT = path.resolve(__dirname, '..');
// 配信面のうち、いまの V3 文化案内だけを見る。凍結済みの prototype と
// 内部ファイルは `.vercelignore` と README の扱いが別なので混ぜない。
const SKIP = /^(\.git|qa|docs|archive|experiments|node_modules|\.claude|tools|assets|visual-refit-v2-prototype|v3-prototype)(\/|$)/;
// 入口には入ってくるリンクが無くて当たり前である。
const ENTRIES = new Set(['index.html']);

// robots の書き方は1つではない。このサイトには noindex / noindex,nofollow /
// noindex, follow の3通りある。**`content="noindex"` の完全一致で探すと、
// 意図して畳んだページを「行けない欠陥」として数えてしまう。** 実際そうなった。
const noindex = html => {
  const m = html.match(/<meta name="robots" content="([^"]*)"/i);
  return !!m && m[1].split(',').some(token => token.trim().toLowerCase() === 'noindex');
};

function pages() {
  const out = [];
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (SKIP.test(r)) continue;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else if (e.name.endsWith('.html')) out.push(r);
    }
  })(ROOT, '');
  return out;
}

const toPage = (from, href) => {
  if (!href || /^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(href)) return null;
  let t = href.split('#')[0].split('?')[0];
  if (!t) return null;
  t = t.startsWith('/') ? t.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(from), t));
  if (t.startsWith('..')) return null;
  if (t === '' || t.endsWith('/')) t += 'index.html';
  return t.endsWith('.html') ? t : null;
};

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch {
    console.log('SKIP playwright が無い。NODE_PATH=/opt/node22/lib/node_modules を付けて実行する。');
    return;
  }

  const all = pages();
  const inbound = new Map(all.map(p => [p, 0]));
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const deadEnds = [];
  let read = 0;

  try {
    for (const p of all) {
      try { await page.goto(`http://127.0.0.1:${PORT}/${p}`, { waitUntil: 'load', timeout: 15000 }); }
      catch { continue; }
      // JS が足すリンクも数えたいので、描き終わるまで少し待つ。
      await page.waitForTimeout(250);
      read++;
      const hrefs = await page.locator('a[href]').evaluateAll(els => els.map(el => el.getAttribute('href')));
      // 本文から次へ行けるか。共通のヘッダ・フッタは全ページに付くので、
      // それだけを「行き先がある」と数えると、行き止まりは永遠に0件になる。
      const inMain = await page.locator('main a[href]').evaluateAll(els => els.map(el => el.getAttribute('href')));
      if (!inMain.some(href => toPage(p, href))) deadEnds.push(p);
      const seen = new Set();
      for (const href of hrefs) {
        const target = toPage(p, href);
        if (!target || target === p || seen.has(target) || !inbound.has(target)) continue;
        seen.add(target);
        inbound.set(target, inbound.get(target) + 1);
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  const orphans = all.filter(p => inbound.get(p) === 0 && !ENTRIES.has(p));
  const retired = orphans.filter(p => noindex(fs.readFileSync(path.join(ROOT, p), 'utf8')));
  const found = orphans.filter(p => !retired.includes(p));

  console.log(`${read}/${all.length}ページを開いて、実際に出ているリンクを数えた。`);
  console.log(`役目を終えた URL（noindex で残してある）：${retired.length}件。欠陥ではない。`);
  // 本文から次へ行けないページ。辿る製品なので、ここが空でないこと自体が欠陥である。
  const stranded = deadEnds.filter(p => !retired.includes(p));
  if (stranded.length) {
    console.log('\n本文から次へ行けないページ：');
    for (const p of stranded) console.log('  ' + p);
  } else {
    console.log(`本文から次へ行けないページ：0件（${deadEnds.length}件の noindex を除く）。`);
  }
  if (found.length || stranded.length) {
    if (found.length) {
      console.log('\n検索に載せるつもりなのに、どこからも行けないページ：');
      for (const p of found) console.log('  ' + p);
    }
    console.log('ORPHAN_PAGE_FAIL');
    process.exitCode = 1;
    return;
  }
  console.log('ORPHAN_PAGE_GO — 新しく行けなくなったページも、行き止まりも無い');
}

main();
