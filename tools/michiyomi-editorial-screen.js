'use strict';

/*
 * Editorial screening for Michiyomi research candidates.
 *
 * This is NOT a publishability classifier. It only helps a human reviewer find
 * potentially distinctive street fragments. Private-life / access / cultural
 * meaning must still be reviewed from the source image and independent sources.
 */

const POSITIVE = [
  ['路地', 3, '路地'],
  ['店舗', 2, '店舗'],
  ['商店', 2, '商店'],
  ['看板', 2, '看板'],
  ['植木鉢', 2, '植木鉢'],
  ['落書き', 2, '壁面の痕跡'],
  ['階段', 2, '階段'],
  ['高架', 2, '高架下・構造物'],
  ['広場', 3, '広場'],
  ['公園', 3, '公園'],
  ['神社', 3, '神社'],
  ['寺院', 3, '寺院'],
  ['寺社', 3, '寺社'],
  ['銭湯', 4, '銭湯'],
  ['商業施設', 2, '商業施設'],
  ['住宅・店舗', 3, '住宅と店舗の混在'],
  ['住宅・商業', 3, '住宅と商業の混在'],
  ['アーケード', 3, 'アーケード'],
  ['シャッター', 2, 'シャッター'],
  ['路上', 1, '路上の痕跡']
];

const RAIL = ['鉄道車両','運転台','駅ホーム','線路','ホーム上','鉄道駅'];
const PRIVATE = ['住宅街','住宅地','戸建て住宅','戸建住宅','アパート','マンション'];

function screenCandidate(candidate) {
  const text = String(candidate.summary || '');
  const positive = [];
  let score = 0;

  for (const [term, weight, reason] of POSITIVE) {
    if (text.includes(term)) {
      score += weight;
      positive.push(reason);
    }
  }

  const railHits = RAIL.filter(term => text.includes(term));
  const privateHits = PRIVATE.filter(term => text.includes(term));

  if (railHits.length) score -= 8;
  if (privateHits.length) score -= 2;

  const status = railHits.length
    ? 'REJECT_RAIL'
    : score >= 3
      ? 'HUMAN_REVIEW'
      : 'LOW_SIGNAL';

  return {
    ...candidate,
    editorialScreen: {
      status,
      score,
      positiveReasons: [...new Set(positive)],
      railContext: railHits,
      privateContext: privateHits,
      note: status === 'HUMAN_REVIEW'
        ? 'Source image review required. Do not infer public access, place identity or cultural meaning from the VLM text alone.'
        : null
    }
  };
}

function screenSet(payload) {
  if (!payload || !Array.isArray(payload.candidates)) throw new Error('candidates array required');
  const screened = payload.candidates.map(screenCandidate);
  return {
    source: payload.source,
    fetchedAt: payload.fetchedAt,
    query: payload.query,
    coverage: payload.coverage,
    totals: {
      all: screened.length,
      humanReview: screened.filter(x => x.editorialScreen.status === 'HUMAN_REVIEW').length,
      rejectRail: screened.filter(x => x.editorialScreen.status === 'REJECT_RAIL').length,
      lowSignal: screened.filter(x => x.editorialScreen.status === 'LOW_SIGNAL').length
    },
    candidates: screened.sort((a,b) =>
      b.editorialScreen.score - a.editorialScreen.score ||
      (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity)
    )
  };
}

function main() {
  const fs = require('node:fs');
  const file = process.argv[2];
  if (!file) throw new Error('usage: node tools/michiyomi-editorial-screen.js <candidate.json>');
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  process.stdout.write(JSON.stringify(screenSet(payload), null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = {screenCandidate, screenSet};
