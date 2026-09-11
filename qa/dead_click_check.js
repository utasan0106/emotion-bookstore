#!/usr/bin/env node
'use strict';
// 押しても何も起きないリンクを、実際に押して見つける。
//
// 2026-09-11、ファウンダーが HOME の「すべて」を押しても何も起きないと指摘した。
// リンクは存在し、行き先も書いてあり、既存のどのテストも緑だった。
// 実際には JS がクリックを横取りし、URL に ?kind=all が付くだけで表示は何も変わらない。
// **リンクの静的な検査では捕まらない。押してみないと分からなかった。**
//
// ここは「読者にとって何か起きたか」だけを見る。ページが変わっていない（同じパス）のに
// 見えるものも変わらなければ、そのリンクは読者にとって死んでいる。
//
//   NODE_PATH=/opt/node22/lib/node_modules node qa/dead_click_check.js
//
// playwright とブラウザが要るので verify-product には入れていない（環境依存）。
// 週次の運用で回す。qa/KNOWN-FAILURES を参照。

const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8931;
const ROOT = path.resolve(__dirname, '..');
// HOME と、そこから読者が最初に降りる先。全ページを押して回ると重いので入口に絞る。
const PAGES = ['/index.html', '/works.html', '/discover/', '/outings/'];

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch {
    console.log('SKIP playwright が無い。NODE_PATH=/opt/node22/lib/node_modules を付けて実行する。');
    return;
  }

  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const base = 'http://127.0.0.1:' + PORT;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dead = [];
  let checked = 0;

  try {
    for (const p of PAGES) {
      const sel = 'main a, .hd-shell a';
      await page.goto(base + p, { waitUntil: 'load' });
      const links = await page.locator(sel).evaluateAll(els =>
        els.map((el, i) => ({ i, text: (el.textContent || '').trim().slice(0, 30), href: el.getAttribute('href') || '' })));

      for (const l of links) {
        // 外部リンクと、ページ内アンカー（スクロールするだけが正しい動作）は見ない。
        if (!l.href || /^(https?:|mailto:|tel:|#)/.test(l.href)) continue;
        checked++;
        await page.goto(base + p, { waitUntil: 'load' });
        const beforeUrl = page.url();
        const beforeText = await page.locator('body').innerText();
        try { await page.locator(sel).nth(l.i).click({ timeout: 3000 }); } catch { continue; }
        await page.waitForTimeout(350);
        const afterUrl = page.url();
        const afterText = await page.locator('body').innerText();
        if (new URL(beforeUrl).pathname === new URL(afterUrl).pathname && beforeText === afterText) {
          dead.push({ page: p, text: l.text, href: l.href, urlChanged: beforeUrl !== afterUrl });
        }
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.log(PAGES.length + 'ページ、' + checked + '本のリンクを実際に押した。');
  if (dead.length) {
    console.log('\nDEAD_CLICK_FAIL — 押しても読者には何も起きないリンク ' + dead.length + '件');
    for (const d of dead) {
      console.log('  ' + d.page + '  「' + d.text + '」 → ' + d.href
        + (d.urlChanged ? '（URLは変わるが表示は同じ）' : ''));
    }
    console.log('\n行き先を与えるか、リンクをやめる。URLだけ変えて表示が変わらないものは読者には見えない。');
    process.exitCode = 1;
    return;
  }
  console.log('DEAD_CLICK_GO — 押して何も起きないリンクは無い');
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
