/* =============================================================================
 * V3 M03/W03 — dependency-free Canonical/source/asset/interaction contract
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execFileSync } = require('child_process');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const EVIDENCE = path.join(REPO, 'outputs/V3_M03_W03_CANONICAL_REBUILD_2026-08-21');
const HANDOFF = path.join(EVIDENCE, 'handoff');
const ASSET_DIR = path.join(SRC, 'assets/canonical-m03-w03');
const results = [];

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function check(ok, name, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
function pngDimensions(file) {
  const data = fs.readFileSync(file);
  if (data.toString('ascii', 1, 4) !== 'PNG') throw new Error('not PNG: ' + file);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}
function git(...args) { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim(); }

check(git('branch', '--show-current') === 'codex/v3-99-canonical-rebuild', 'branch exact');
check(git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174', 'HEAD exact');
check(git('rev-parse', 'origin/main') === '910dbac29e70143fe50bc6e192eaaafa40729174', 'origin/main exact');

const protectedHashes = {
  'index.html': 'a093a0d3e9089dd97ecc126923bfad9688dc8dc1b3eb37bd2a02b07888831dcf',
  'js/store.js': '651a15cc540c220e2afa9f3bcb8d89433feb03f4cbbe0cb9e80b325427c17bda',
  'js/personalize.js': '1125d767bac6aed317e2bdc8ba69311fda71d0a8450a264e48c536c9717bb65a'
};
Object.entries(protectedHashes).forEach(([rel, expected]) => {
  const actual = sha256(path.join(SRC, rel));
  check(actual === expected, 'protected hash exact: ' + rel, actual);
});

const canonicals = [
  ['canonical/M03_Discovery.png', 1024, 1536, 'f2c0a98042bd53a0160c1dd31eac48011421170d6acd2d502451331df713df83'],
  ['canonical/W03_Discovery.png', 1536, 1024, '9f4b3d4ddbdbd38f6c1755675a786fca1728405f4c0349778cb9cc17c0de1361'],
  ['provenance_sources/M04_DiscoveryReview_A.png', 1024, 1536, 'f128dc970cbe073033ec4d86042e9d33cc46055a330e6eb10fa03ce55f1269a1']
];
canonicals.forEach(([rel, width, height, expected]) => {
  const file = path.join(HANDOFF, rel);
  const dim = pngDimensions(file);
  check(fs.existsSync(file), 'Canonical/provenance source exists: ' + rel);
  check(sha256(file) === expected, 'Canonical/provenance SHA exact: ' + rel);
  check(dim.width === width && dim.height === height, 'Canonical/provenance dimensions exact: ' + rel, `${dim.width}x${dim.height}`);
});

const manifest = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'ASSET_MANIFEST.json'), 'utf8'));
check(manifest.authority === '99_v3_canonical_clean_v1', 'Asset authority = 99_v3 only');
check(manifest.production_rights_status === 'UNREVIEWED_PROTOTYPE_ONLY', 'Production rights remain unreviewed');
check(manifest.assets.length === 10, 'Asset count exact', String(manifest.assets.length));
check(manifest.rules.some((rule) => rule.includes('no AI generation')), 'AI/inpainting/redraw/recolor prohibited');
check(manifest.rules.some((rule) => rule.includes('no text-baked target crop')), 'text-baked target crop prohibited');

manifest.assets.forEach((asset) => {
  const target = path.join(SRC, asset.file);
  const source = path.join(HANDOFF, asset.source);
  const dim = pngDimensions(target);
  const sourceDim = pngDimensions(source);
  const [x, y, width, height] = asset.crop_xywh;
  const bounds = x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= sourceDim.width && y + height <= sourceDim.height;
  check(fs.existsSync(target), 'asset exists: ' + path.basename(target));
  check(sha256(target) === asset.output_sha256, 'asset SHA exact: ' + path.basename(target));
  check(dim.width === asset.output_width && dim.height === asset.output_height, 'asset dimensions exact: ' + path.basename(target), `${dim.width}x${dim.height}`);
  check(bounds, 'asset crop bounds valid: ' + path.basename(target));
  check(sha256(source) === asset.source_sha256, 'asset provenance source exact: ' + path.basename(target));
});

const manifestHandoff = fs.readFileSync(path.join(HANDOFF, 'ASSET_MANIFEST.json'));
check(Buffer.compare(manifestHandoff, fs.readFileSync(path.join(ASSET_DIR, 'ASSET_MANIFEST.json'))) === 0, 'product Asset Manifest copied without modification');
const cleanCafe = manifest.assets.find((asset) => asset.file.endsWith('m03_cafe_clean.png'));
check(cleanCafe.source === 'provenance_sources/M04_DiscoveryReview_A.png', 'M03 clean cafe exception source exact');
check(cleanCafe.css_treatment.includes('HTML/CSS location badge'), 'M03 location badge required as HTML/CSS');

const dataSandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(SRC, 'js/data.js'), 'utf8'), dataSandbox);
const D = dataSandbox.window.V3_DATA;
const fixtures = D.DISCOVERY_FIXTURES;
check(Array.isArray(fixtures) && fixtures.length === 3, 'exact 3 visual fixture slots');
check(fixtures.map((item) => item.slot).join('|') === 'cafe|book|film', 'fixture slot order cafe/book/film');
check(fixtures.map((item) => item.recordId).join('|') === 'E01|E02|E03', 'fixture record IDs preserve existing deck schema');
check(fixtures[0].mobileTitle === 'リトルモア喫茶室', 'cafe title exact');
check(fixtures[0].address === '東京都江東区三好1-7-14（清澄白河）', 'cafe address exact');
check(fixtures[0].mobileFacts.map((f) => f.value + '/' + f.label).join('|') === 'カフェ/Type|30分/Duration|¥900〜1,300/Price|火曜定休/Close', 'M03 facts exact');
check(fixtures[0].mobileReason.join('|') === '何かを決める代わりに、|いつもと少し違う景色をひとつ入れる。', 'M03 Editorial Reason exact');
check(fixtures[0].desktopReason.join('|') === 'ざわつく日は、少しだけ外の世界に出てみたくなる日。|この場所は、街の気配を感じながらも、|自分のペースを取り戻せる静けさがあります。|窓からの光や、ゆっくりとした時間の流れが、|あなたの心のざわめきをやさしくほどいてくれるはずです。', 'W03 long Editorial Reason exact');
check(fixtures[1].mobileTitle === '「また、同じ夢を見ていた」' && fixtures[1].creator === '住野よる（双葉社）', 'book copy exact');
check(fixtures[2].mobileTitle === '「PERFECT DAYS」' && fixtures[2].creator === '監督：ヴィム・ヴェンダース', 'film copy exact');

const app = fs.readFileSync(path.join(SRC, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'css/v3.css'), 'utf8');
const runtime = fs.readFileSync(path.join(SRC, 'verify/m03_w03_runtime.js'), 'utf8');
const exactCopy = [
  '「ざわつく」を入口に、', '3つの体験を選びました。', 'まずは、1つ目の体験を見てみましょう。',
  '清澄白河', '徒歩12分', 'Editorial Reason', 'お店の情報を見る（公式サイト）',
  '今回は違う', '気になる', 'カードを左右に動かすこともできます',
  '感情の言葉に戻る', 'STEP 2/4', '気になる3つの体験から選ぶ',
  '3つのうち、気になるものを1つ選んでください', '公式サイトを見る', 'Googleマップで見る',
  '他の2つの体験も見る', '左右にスクロールできます', '詳細を見る',
  'ここで紹介しているのは編集部の視点です。選ぶのはあなた自身の気持ちです。'
];
exactCopy.forEach((copy) => check(app.includes(copy), 'exact visible copy: ' + copy));
['PRODUCTION_COPY_REVIEW_REQUIRED', 'PROTOTYPE_FIXTURE_NOT_VERIFIED', 'PROTOTYPE_EXTERNAL_LINK_STUB', 'PRODUCTION_RIGHTS_UNREVIEWED'].forEach((marker) => {
  check(app.includes(marker) || fs.readFileSync(path.join(SRC, 'js/data.js'), 'utf8').includes(marker), 'Production marker present: ' + marker);
});
check(app.includes("class: 'm03-decision m03-pass', type: 'button'"), 'M03 pass is a semantic button');
check(app.includes("class: 'm03-decision m03-keep', type: 'button'"), 'M03 keep is a semantic button');
check(app.includes('attachSwipe(card,'), 'optional swipe enhancement retained');
check(app.includes("function () { decide(recordId, 'pass'); }"), 'pass button remains always available');
check(app.includes("function () { decide(recordId, 'keep'); }"), 'keep button remains always available');
check(app.includes('function singleKeepToReview(recordId)'), 'W03 SINGLE_KEEP_TO_REVIEW encoded');
check(app.includes("state.deck.decisions[id] = id === recordId ? 'keep' : 'pass'"), 'single keep marks other two pass');
check(app.includes('state.deck.index = state.deck.ids.length'), 'single keep completes finite deck');
check(app.includes("class: 'w03-detail-button', type: 'button'"), 'alternate detail is active-detail button only');
check(app.includes("class: 'w03-thumbnail', type: 'button'"), 'gallery thumbnails are semantic buttons');
check(app.includes("'aria-pressed': galleryIndex === index ? 'true' : 'false'"), 'gallery active state exposed');
check(app.includes("'aria-pressed': 'false', onclick: onKeep"), 'no default alternate keep');
check(app.includes('externalPrototypeStub'), 'external actions are prototype stubs');
check(!/fetch\s*\(|XMLHttpRequest|https?:\/\//.test(app.slice(app.indexOf('function externalPrototypeStub'), app.indexOf('function personalizedExplanation'))), 'M03/W03 network and fabricated URL = 0');
check(!app.includes("href: '#'"), 'dead href # absent');
check(app.includes("class: 'm03-location-badge'"), 'location badge is HTML/CSS');

const cssTokens = [
  'body:has(.discovery-canonical)', '.discovery-mobile-only', '.discovery-desktop-only',
  '@media (min-width: 900px) and (max-width: 1199px)',
  'body:has(.discovery-canonical) .stepbar-step { display: none; }',
  'body:has(.discovery-canonical) .stepbar-progress { display: block; }',
  '@media (min-width: 1200px)', 'body:has(.discovery-canonical) #stepbar { display: none; }',
  'grid-template-columns: repeat(4, minmax(0, 1fr))', '.w03-main-card', '.w03-alternates',
  '@media (prefers-reduced-motion: reduce)'
];
cssTokens.forEach((token) => check(css.includes(token), 'M03/W03 CSS contract: ' + token));
check(css.split('{').length === css.split('}').length, 'CSS brace balance');

['M03_1024x1536_candidate1', 'M03_1024x1536_candidate2', 'M03_1024x1536_candidate3', 'M03_390x844', 'M03_430x932', 'M03_768x1024', 'W03_1536x1024_closed', 'W03_1536x1024_open', 'W03_1536x960_sanity'].forEach((target) => {
  check(runtime.includes(target), 'runtime target prepared: ' + target);
});
check(runtime.includes('consoleErrors'), 'runtime verifier records console errors');
check(runtime.includes('scrollWidth') && runtime.includes('clientWidth'), 'runtime verifier checks horizontal overflow');
check(runtime.includes('PROTOTYPE_EXTERNAL_LINK_STUB'), 'runtime verifier checks external stub feedback');

const failed = results.filter((ok) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) process.exitCode = 1;
