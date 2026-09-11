#!/usr/bin/env node
'use strict';
// X の投稿が上限に収まっているかを測る。
//
// X は文字数をそのまま数えない。重みがある：日本語などは1文字を2、半角英数記号は1、
// URL は長さに関わらず 23 として数え、合計 280 までを受け付ける。
// つまり日本語だけなら 140字、URL を1本入れると本文は 128字ほどになる。
// 「URL が長いから本文を削る」必要はない。短縮も要らない。
//
//   node tools/check-post-length.js docs/city-discovery/LAUNCH-COPY-202610.md
//
// 原稿の「### 日付｜街」から次の見出しまでを1稿とし、本文は見出しの次の行から
// 最初の URL 行まで。「**投稿前の確認**」以降は編集部向けの注記で、投稿しないので数えない。

const LIMIT = 280;

function weighted(text) {
  const urls = text.match(/https?:\/\/\S+/g) || [];
  let n = urls.length * 23;
  for (const ch of text.replace(/https?:\/\/\S+/g, '')) {
    const c = ch.codePointAt(0);
    const light = (c >= 0x0000 && c <= 0x10ff)
      || (c >= 0x2000 && c <= 0x200d)
      || (c >= 0x2010 && c <= 0x201f)
      || (c >= 0x2032 && c <= 0x2037);
    n += light ? 1 : 2;
  }
  return n;
}

// 本文は見出しの次の行から、編集部向けの注記が始まる手前まで。
//
// URL の行で打ち切ってはいけない。10/22 のように、リンクのあとに開催情報を続け、
// 末尾にもう1本、出典の URL を置く稿がある。最初の URL で切ると、
// 実際に投稿される本文の半分しか測らないまま「収まっている」と言ってしまう。
function bodyOf(section) {
  const out = [];
  for (const line of section.split('\n')) {
    if (/^\*\*/.test(line)) break;
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { weighted, bodyOf, LIMIT };

if (require.main === module) {
  const fs = require('node:fs');
  const file = process.argv[2];
  if (!file) { console.error('使い方: node tools/check-post-length.js <原稿.md>'); process.exit(2); }
  const md = fs.readFileSync(file, 'utf8');
  const posts = [...md.matchAll(/^### (.+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)];
  const over = [];
  const tight = [];
  console.log(file + '（上限 ' + LIMIT + '。日本語140字ぶん。URL は一律23）\n');
  for (const [, head, raw] of posts) {
    const body = bodyOf(raw);
    if (!body.includes('http')) continue;
    const w = weighted(body);
    if (w > LIMIT) over.push(head);
    else if (w > LIMIT - 20) tight.push(head);
    console.log('  ' + String(w).padStart(3) + '/' + LIMIT + '  ' + (w > LIMIT ? 'OVER' : '    ') + '  ' + head);
  }
  if (tight.length) console.log('\n残り20を切っている稿（直すとすぐ溢れる）: ' + tight.join(' / '));
  if (over.length) {
    console.log('\nPOST_LENGTH_FAIL — 上限を超えた稿: ' + over.join(' / '));
    process.exit(1);
  }
  console.log('\nPOST_LENGTH_GO — 全' + posts.length + '稿が上限内');
}
