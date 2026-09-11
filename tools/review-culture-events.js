#!/usr/bin/env node
'use strict';
// Read-only operations report. HTTP success is never treated as editorial verification.
const fs = require('node:fs');
const path = require('node:path');
const { events, cities } = require('./weekly-outings-source');
const socialPosts = require('./social-posts-source');
const { monday, select, add, date, dates } = require('../outings/week');

// 再確認期限が同じ日に固まっていると、その翌日に催しの節がまとめて空く。
// 2026-09-21 の事故がこれだった。公開中24件の期限が全件 2026-09-20 で揃っていて、
// 誰も気づかないまま10日前になって見つかった。
//
// 気づけなかった理由は、この道具が「切れてから」しか鳴らさなかったことにある
// （expired は reviewThrough < today）。切れた日にはもう読者も見ている。
// そこで、切れる前に鳴らす。
//
// ただし会期が先に終わる催しは、期限が切れても公開面から何も減らない。
// 数えるのは「期限の翌日にも会期が残っている」もの、つまり本当に消えるものだけ。
const HORIZON_DAYS = 21;   // 何日先まで見るか。補充には公式ページを辿る時間が要る
const CLUSTER = 3;         // 同じ日にこれだけ一度に消えると、街ごとの下限3件を割りうる
const REVIEW_BACKLOG = 10; // 編集部が読む前提の下書きが、これを超えて溜まったら増やすのをやめる
function expiringClusters(events, today) {
  const byDate = {};
  for (const e of events) {
    if (e.reviewThrough < today) continue;
    const days = Math.round((Date.parse(e.reviewThrough) - Date.parse(today)) / 86400000);
    if (days > HORIZON_DAYS) continue;
    // 期限の翌日にも開催日が残っているか。残っていなければ、消えても穴は空かない。
    if (!dates(e).some(d => d > e.reviewThrough)) continue;
    (byDate[e.reviewThrough] ||= []).push(e.id);
  }
  return Object.entries(byDate)
    .filter(([, ids]) => ids.length >= CLUSTER)
    .map(([d, ids]) => ({
      date: d,
      days: Math.round((Date.parse(d) - Date.parse(today)) / 86400000),
      count: ids.length,
      ids,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

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
  const clusters = expiringClusters(events, today);
  // 編集部が読む前提の下書き（hook / relation）が、読まれないまま溜まっていないか。
  // CNET は AI が書いた77本のうち41本に訂正が入った。量・開示・レビューの三つが
  // 同時に崩れたためで、いちばん効くのは「読まれていないものが見えていること」である。
  const awaitingReview = events.filter(e => e.editorialReview === 'pending').map(e => e.id);
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
  const needsAttention = coverage.some(r => r.count < 3) || expired.length > 0 || clusters.length > 0 || awaitingReview.length > REVIEW_BACKLOG || checks.some(r => !r.reachable) || socialExpired.length > 0 || socialChecks.some(r => !r.available);
  const report = { checkedOn: today, needsAttention, coverage, expiredVerification: expired, expiringClusters: clusters, awaitingEditorialReview: awaitingReview, linkChecks: checks, socialExpired, socialChecks,
    limitation: 'リンク到達確認は、開催継続・料金・空席・内容の確認ではありません。確認日を自動更新しません。' };
  const text = [
    '# 街の文化イベント 運営点検', '', `確認日：${today}（日本時間）`, '',
    needsAttention ? '**要対応：件数・確認期限・リンクを確認してください。**' : '今週・来週とも各街3件以上。確認期限内です。', '',
    '| 開催週（月曜） | 街 | 掲載件数 |', '| --- | --- | ---: |',
    ...coverage.map(r => `| ${r.week} | ${r.label} | ${r.count}${r.count < 3 ? ' 要補充' : ''} |`), '',
    `確認期限切れ：${expired.length}件。期限切れ情報は公開一覧に出ません。`, '',
    ...(awaitingReview.length ? [
      '編集部の確認待ち：' + awaitingReview.length + '件（hook と「なぜこの街か」の下書き）。'
        + (awaitingReview.length > REVIEW_BACKLOG
          ? '**' + REVIEW_BACKLOG + '件を超えた。確認が追いつくまで新しい下書きを作らないこと。**'
          : '読み終えた催しは weekly-outings-source.js から editorialReview を外す。'), '',
    ] : []),
    ...(clusters.length ? [
      `**${HORIZON_DAYS}日以内に、会期が残ったまま一度に消える催しがあります。**`,
      '切れてからでは読者も見ています。公式ページで開催を確かめてから期限を延ばすか、先に補充してください。',
      ...clusters.map(c => `- ${c.date}（${c.days}日後）に ${c.count}件：${c.ids.join(' / ')}`), '',
    ] : []),
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
module.exports = { expiringClusters, HORIZON_DAYS, CLUSTER };
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
