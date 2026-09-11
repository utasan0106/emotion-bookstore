#!/usr/bin/env node
'use strict';
// 編集部が読むための一枚。下書き（hook / relation）を、出典と突き合わせて並べる。
//
// `hook` と `relation` は私が書けるのは下書きまでで、採否と文言は編集部のものである
// （CLAUDE.md「Human Editorial first」、AUTONOMY §2-B 14「自分の下書きを自分で承認しない」）。
// だから**このコマンドは承認しない。** 読む手間を下げるだけである。
//
//   node tools/review-event-drafts.js              … 型だけ見る（通信なし）
//   node tools/review-event-drafts.js --check-sources  … 公式ページを実際に読んで突き合わせる
//
// 突き合わせるのは、機械が確かめられる事実だけ：会場名・料金の数字・『』で括った書名・初日。
// **「この文がふさわしいか」は機械には分からない。** そこは人が読む。

const { events } = require('./weekly-outings-source');

// AUTONOMY §4。ランキングを持ち込む語と、読者を決めつける書き方。
const BANNED = ['必見', '話題の', '人気の', '大人気', '感動の', '絶対に', 'おすすめの'];
const norm = s => String(s).replace(/[,\s　]/g, '');

function styleFindings(e) {
  const out = [];
  for (const word of BANNED) {
    if ((e.hook + e.relation).includes(word)) out.push(`「${word}」は使わない`);
  }
  if (/なあなたへ|あなたに/.test(e.hook)) out.push('読者を決めつける書き方');
  // hook は一文。二つ以上の文に分かれていないか。
  if ((e.hook.match(/。/g) || []).length > 1) out.push('hook が一文になっていない');
  if (!/。$/.test(e.hook)) out.push('hook が句点で終わっていない');
  return out;
}

// 会場名はこちらの合成であることがある（公式は「東京・高円寺のライブハウス、JIROKICHI」）。
// だから丸ごとの一致ではなく、名前の部分が出典にあるかを見る。
const venueTokens = venue => venue.split(/[\s　]+/).flatMap(part => {
  const latin = part.match(/[A-Za-z][A-Za-z0-9&'-]{2,}/g) || [];
  return latin.length ? latin : [part];
});

function factFindings(e, text) {
  const t = norm(text);
  const out = [];
  if (!venueTokens(e.venue).some(token => t.includes(norm(token)))) out.push('会場「' + e.venue + '」が出典に見当たらない');
  for (const m of (e.practical || '').matchAll(/([0-9][0-9,]{2,})円/g)) {
    if (!t.includes(norm(m[1]))) out.push('料金 ' + m[1] + '円 が出典に見当たらない');
  }
  for (const m of (e.relation || '').matchAll(/『([^』]+)』/g)) {
    if (!t.includes(norm(m[1]))) out.push('『' + m[1] + '』が出典に見当たらない');
  }
  const first = (e.dates || [])[0];
  if (first) {
    const mo = Number(first.slice(5, 7)), da = Number(first.slice(8, 10));
    const forms = [mo + '月' + da + '日', mo + '/' + da,
      String(mo).padStart(2, '0') + '/' + String(da).padStart(2, '0'),
      String(mo).padStart(2, '0') + '.' + String(da).padStart(2, '0')];
    if (!forms.some(f => t.includes(f))) out.push('初日 ' + mo + '/' + da + ' が出典に見当たらない');
  }
  return out;
}

async function main() {
  const pending = events.filter(e => e.editorialReview === 'pending');
  const check = process.argv.includes('--check-sources');
  const sources = new Map();
  if (check) {
    for (const e of pending) {
      try {
        const r = await fetch(e.url, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
        const html = r.ok ? await r.text() : '';
        sources.set(e.id, r.ok
          ? html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
              .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
          : null);
      } catch { sources.set(e.id, null); }
    }
  }

  const lines = ['# 催しの下書き — 編集部が読む一枚', '',
    `対象：${pending.length}件（\`editorialReview: 'pending'\` のもの）`, '',
    '**このファイルは承認ではない。** 機械が確かめられるのは、会場・料金・書名・初日が',
    '出典に載っているかまでで、「この文がふさわしいか」は分からない。そこを読んでほしい。', '',
    '読み終えたものは `tools/weekly-outings-source.js` から `editorialReview` を外す。', ''];

  let clean = 0;
  for (const e of pending) {
    const style = styleFindings(e);
    const text = sources.get(e.id);
    const facts = check ? (text === null ? ['出典を読めなかった'] : factFindings(e, text)) : [];
    const findings = [...style, ...facts];
    if (!findings.length) clean++;
    lines.push(`## ${e.title}`, '',
      `- 街・会場：${e.venue}（${e.city}）`,
      `- 日程：${e.schedule}`,
      `- hook：**${e.hook}**`,
      `- なぜこの街か：${e.relation}`,
      `- 料金・条件：${e.practical}`,
      `- 出典：${e.url}`,
      findings.length ? `- **要確認：${findings.join(' / ')}**` : '- 機械で確かめた範囲（会場・料金・書名・初日）は出典と一致',
      '');
  }
  lines.splice(4, 0, check
    ? `出典と突き合わせた結果：${clean}/${pending.length}件が、機械で確かめた範囲では一致。`
    : '（`--check-sources` を付けると、公式ページを読んで突き合わせる）', '');
  process.stdout.write(lines.join('\n'));
}

main();
