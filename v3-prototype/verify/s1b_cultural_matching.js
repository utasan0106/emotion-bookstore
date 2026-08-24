#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const START = '38bf9ee4a642069f2e992f48c924e5cc23f14c88';
const BRANCH = 'codex/v3-cultural-matching-s1b-20260824';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const git = (args) => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const app = read('v3-prototype/js/app.js');
const matching = read('v3-prototype/js/cultural_matching.js');
const registry = read('v3-prototype/js/real_experience_registry.js');
const content = read('v3-prototype/js/s1b_editorial_content.js');
const index = read('v3-prototype/index.html');
const css = read('v3-prototype/css/v3.css');
const canonicalGate = read('v3-prototype/verify/canonical_source_contract.js');
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function block(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return from >= 0 && to > from ? source.slice(from, to) : '';
}

function sameAtStart(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel)).equals(
      cp.execFileSync('git', ['show', `${START}:${rel}`], { cwd: ROOT })
    );
  } catch (error) {
    return false;
  }
}

check('exact S1B branch', git(['branch', '--show-current']) === BRANCH, git(['branch', '--show-current']));
let ancestor = true;
try { cp.execFileSync('git', ['merge-base', '--is-ancestor', START, 'HEAD'], { cwd: ROOT }); }
catch (error) { ancestor = false; }
check('exact frozen S1A Start is ancestor', ancestor, START);
check('S1B lineage merge-base is exact Start', git(['merge-base', START, 'HEAD']) === START);

const protectedFiles = [
  'vercel.json', '.vercelignore', 'package.json', 'package-lock.json',
  'v3-prototype/privacy.html', 'v3-prototype/terms.html',
  'v3-prototype/js/store.js', 'v3-prototype/js/interested_retrieval.js',
  'v3-prototype/js/personalize.js', 'v3-prototype/js/analytics.js',
  'v3-prototype/js/action_destination.js'
].filter((rel) => fs.existsSync(path.join(ROOT, rel)));
protectedFiles.forEach((rel) => check(`protected Start byte-identical: ${rel}`, sameAtStart(rel)));
check('no V2/main/Production/domain configuration diff',
  git(['diff', '--name-only', START, '--', ':!v3-prototype']).split('\n').filter(Boolean).length === 0 &&
  !git(['diff', '--name-only', START]).split('\n').some((rel) =>
    /^(?:vercel\.json|\.vercelignore|privacy\.html|terms\.html|js\/analytics\.js)/.test(rel)));

const scripts = index.match(/<script\s+src="([^"]+)"/g) || [];
check('S1B foundation loads before Registry and App',
  scripts.indexOf('<script src="./js/cultural_matching.js"') < scripts.indexOf('<script src="./js/real_experience_registry.js"') &&
  scripts.indexOf('<script src="./js/s1b_editorial_content.js"') < scripts.indexOf('<script src="./js/app.js"'));
check('first paint scripts remain same-origin only', scripts.every((tag) => /src="\.\//.test(tag)));
check('Product background network remains blocked', /connect-src 'none'/.test(index));
check('canonical index gate accepts only exact S1B hash with provenance',
  canonicalGate.includes("const S1B_AUTHORIZED_INDEX_HASH = 'ed249b6635d142581fba50874714ad51ce63338061b50afd652b947b7f66c082'") &&
  canonicalGate.includes('38bf9ee4a642069f2e992f48c924e5cc23f14c88') &&
  !/S1B_AUTHORIZED_INDEX_HASH\.(?:startsWith|includes)|slice\([^)]*S1B_AUTHORIZED_INDEX_HASH/.test(canonicalGate));
check('no third-party player is present in static Product HTML', !/<iframe\b|youtube-nocookie|player\.vimeo\.com\/video/i.test(
  index.replace(/content="[^"]*frame-src[^"]*"/, '')
));

check('finite deck remains exact 0/1/2/3 and duplicate-safe',
  app.includes('deck.ids.length > 3') && app.includes('deck.ids.indexOf(id) !== index') &&
  registry.includes('fillFlag: false'));
check('runtime context derives from approved base deck only',
  block(app, 'function contextualRealDeck', 'function publicDeckState').includes('var base = approvedRealDeck(emotionId)') &&
  block(app, 'function contextualRealDeck', 'function publicDeckState').includes('MATCHING.applyContext'));
const contextApp = block(app, 'var CONTEXT_OPTIONS', 'function surfaceUnderstanding');
check('Context controls are optional/coarse and resettable',
  contextApp.includes('行きやすさの条件を加える（任意）') &&
  contextApp.includes("contextSession.clearAll()") &&
  contextApp.includes("'data-context-storage': 'memory-only'"));
check('Context controls do not persist, measure, or serialize',
  !/persist\s*\(|STORE\.|measure|history|location|URLSearchParams|Interested|Trace/.test(contextApp));
check('age/family relationship fields are absent from Product Context UI',
  !/\bage\b|\bchild\b|\bfamily\b|\bcompanion\b|\brelationship\b|\bgender\b/i.test(contextApp));

const discovery = block(app, 'function surfaceLegacyDiscovery', 'function discoveryAsset');
check('Discovery informational action is Primary',
  discovery.includes('btn btn-primary real-discovery-primary real-discovery-detail') &&
  discovery.indexOf('real-discovery-detail') < discovery.indexOf('real-discovery-interest'));
check('Discovery external purchase/reservation/watch action is absent',
  !/openApprovedDestination|data-action-destination|primaryAction\.label/.test(discovery));
check('Discovery has no pass/review decision semantics',
  !/今回は違う|decideWithInterest|state\.deck\.decisions|go\('review'\)/.test(discovery));
check('swipe remains navigation-only',
  discovery.includes('navigateDeck(1, false)') && discovery.includes('navigateDeck(-1, false)'));

const infoContract = block(app, 'function experienceInformationContract', 'function experienceCard');
check('Product information contract resolves polymorphic truth',
  infoContract.includes('MATCHING.resolvePracticalTruth(experience)') &&
  infoContract.includes('practicalTruth: typeTruth'));
const detail = block(app, 'function surfaceDetail', 'function planSummary');
const detailSummary = block(detail, 'var summary = [', 'var nodes = [');
const detailNodes = block(detail, 'var nodes = [', "var surface = section('05-experience-detail'");
const detailOrder = [
  detailSummary.indexOf('detail-practical-truth'), detailSummary.indexOf('detail-editorial-reason'),
  detailNodes.indexOf('detail-visual-column'), detailNodes.indexOf("class: 'actions detail-actions'"),
  detailNodes.indexOf('detail-official-description')
];
check('Detail skeleton order is Hero -> Identity/Truth -> Editorial -> Action -> Official detail',
  detailOrder.every((position) => position >= 0) &&
  detailOrder[0] < detailOrder[1] && detailOrder[2] < detailOrder[3] && detailOrder[3] < detailOrder[4],
  JSON.stringify(detailOrder));
check('Detail back route cannot reopen legacy Review',
  detail.includes("onclick: function () { go('discovery'); }") && !detail.includes("go(validActiveId() ? 'review'"));

check('all nine canonical type resolvers are explicit',
  ['Book', 'Film', 'Music', 'Exhibition', 'Place', 'Dining', 'Travel', 'Activity', 'Event']
    .every((type) => matching.includes(`${type}: Object.freeze([`)));
check('missing/unknown type facts fail closed',
  matching.includes('Object.keys(record.practicalTruth).some') && matching.includes('return null;'));
check('live Registry declares explicit normalized type and Practical Truth',
  (registry.match(/canonicalType:/g) || []).length === 9 &&
  (registry.match(/practicalTruth:/g) || []).length === 9);
check('type/category diversity and source concentration are report-only',
  matching.includes('normalizedCategoryDistribution') && matching.includes('sourceConcentration') &&
  !/sort\s*\([^)]*(?:score|rating|popularity|conversion|affiliate)/i.test(matching));

check('Featured/newlyShelved/timelyNow remain distinct',
  matching.includes('item.newlyShelved') && matching.includes('item.featured = true') &&
  matching.includes('item.timelyNow = item.timelyNow || null'));
check('Featured badge boundary is local day 0–6',
  matching.includes('validation.diff >= 0 && validation.diff <= 6'));
check('video is separate from Cultural Matching deck',
  app.includes("'data-video-separate-from-deck': 'true'") &&
  !block(app, 'function s1bVideoCard', 'function s1bEditorialShelf').includes('startDeck'));
check('video is explicit-click only with official fallback',
  matching.indexOf("documentRef.createElement('iframe')") > matching.indexOf('function activateVideo') &&
  matching.includes("record.mediaState === 'LINK_ONLY_READY'") && matching.includes('official_link_fallback'));
check('native media shapes avoid destructive cover crop',
  css.includes('.media-shape-portrait') && css.includes('.media-shape-square') &&
  app.includes('MATCHING.videoRatioClass(record)') &&
  css.includes('.s1b-video-mount.media-ratio-4-3 { aspect-ratio: 4 / 3; }') &&
  !/s1b-video[^}]*object-fit:\s*cover/s.test(css));
check('live Featured/video/daily inventory is zero, not invented',
  /featured:\s*Object\.freeze\(\[\]\)/.test(content) &&
  /videos:\s*Object\.freeze\(\[\]\)/.test(content) &&
  /dailyLineups:\s*Object\.freeze\(\[\]\)/.test(content));
check('release gate is separate from runtime finite contract',
  matching.includes('targetWorksPerShelf: 3') && matching.includes('targetVideosPerShelf: 1') &&
  matching.includes('runtimeMin: 0') && matching.includes('runtimeMax: 3'));
check('no random refresh/hidden score/profile or commercial ranking primitive',
  !/Math\.random|affinityScore|tasteScore|popularityScore|reviewScore|conversionScore|affiliateScore|peopleLikeYou/.test(matching + app));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exitCode = failed.length ? 1 : 0;
