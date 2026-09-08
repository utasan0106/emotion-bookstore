#!/usr/bin/env node
'use strict';
// Read-only operations report. HTTP success is never treated as editorial verification.
const fs = require('node:fs');
const path = require('node:path');
const { events, cities } = require('./weekly-outings-source');
const socialPosts = require('./social-posts-source');
const { monday, select, add, date } = require('../outings/week');

async function main() {
  const arg = process.argv.find(a => a.startsWith('--date='));
  const now = arg ? Date.parse(arg.slice(7) + 'T12:00:00+09:00') : Date.now();
  if (!Number.isFinite(now)) throw Error('Invalid --date (YYYY-MM-DD required)');
  const first = monday(now), today = date(now);
  const coverage = [0, 1].flatMap(n => Object.entries(cities).map(([city, label]) => {
    const week = add(first, n * 7);
    const items = select(events, { now, week, city });
    return { week, city, label, count: items.length, ids: items.map(e => e.id) };
  }));
  const expired = events.filter(e => e.reviewThrough < today).map(e => e.id);
  const socialExpired = socialPosts.filter(p => p.reviewThrough < today).map(p => p.path);
  const checks = [];
  const socialChecks = [];
  if (process.argv.includes('--check-links')) {
    const pending = [...new Set(events.map(e => e.url))];
    const worker = async () => {
      while (pending.length) {
        const url = pending.shift();
        try {
          const r = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'follow' });
          await r.body?.cancel();
          checks.push({ url, status: r.status, finalUrl: r.url, reachable: r.ok });
        } catch (e) { checks.push({ url, reachable: false, error: e.name }); }
      }
    };
    await Promise.all([worker(), worker()]);
  }
  if (process.argv.includes('--check-links')) {
    for (const post of socialPosts) {
      try {
        const url = new URL('https://embed.bsky.app/oembed'); url.searchParams.set('url', post.url);
        const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const body = r.ok ? await r.json() : {};
        const available = r.ok && typeof body.html === 'string' && body.html.includes(post.did) && body.html.includes(post.rkey);
        socialChecks.push({ path: post.path, url: post.url, status: r.status, available });
      } catch (error) { socialChecks.push({ path: post.path, available: false, error: error.name }); }
    }
  }
  const needsAttention = coverage.some(r => r.count < 3) || expired.length > 0 || checks.some(r => !r.reachable) || socialExpired.length > 0 || socialChecks.some(r => !r.available);
  const report = { checkedOn: today, needsAttention, coverage, expiredVerification: expired, linkChecks: checks, socialExpired, socialChecks,
    limitation: 'リンク到達確認は、開催継続・料金・空席・内容の確認ではありません。確認日を自動更新しません。' };
  const text = [
    '# 街の文化イベント 運営点検', '', `確認日：${today}（日本時間）`, '',
    needsAttention ? '**要対応：件数・確認期限・リンクを確認してください。**' : '今週・来週とも各街3件以上。確認期限内です。', '',
    '| 開催週（月曜） | 街 | 掲載件数 |', '| --- | --- | ---: |',
    ...coverage.map(r => `| ${r.week} | ${r.label} | ${r.count}${r.count < 3 ? ' 要補充' : ''} |`), '',
    `確認期限切れ：${expired.length}件。期限切れ情報は公開一覧に出ません。`, '',
    ...checks.filter(r => !r.reachable).map(r => `- 要確認：${r.url}（${r.status || r.error}）`), '',
    `関連投稿の確認期限切れ：${socialExpired.length}件。`,
    ...socialChecks.filter(r => !r.available).map(r => `- 関連投稿の要確認：${r.path}（${r.status || r.error}）`),
    report.limitation, '',
    '対応：公式の日時と内容を再確認 → 掲載理由と街・作品の関係を確認 → 元データ修正 → 生成・テスト → 反映。',
    '無関係なイベントで件数を埋めたり、古い催しを新しい週として再掲したりしません。', ''
  ].join('\n');
  const output = path.resolve(process.env.CULTURE_REVIEW_OUTPUT || path.join(__dirname, '../qa/artifacts/culture-events'));
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'review.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'review.md'), text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  console.log(text);
  if (process.argv.includes('--strict') && needsAttention) process.exitCode = 1;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
