/* =============================================================================
 * V3 Local Advance — approved Category Visual integration contract
 * 実行: node verify/category_visual.js
 * ========================================================================== */
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const START = '2d2e1c9468787b2fedf207101c57847fca96adf7';
const PLACE = 'v3-prototype/assets/real-experience/EXP_007_shinjuku_gyoen_official_landscape.jpg';
const results = [];
const authority = {
  book: ['本', 'category_book.webp', '725e0b695d0862fe33e26c2cfc2d19be3b8054ca8fe6f0e18019a4968d3c9935'],
  film: ['映画', 'category_film.webp', '3a5fdbcf6cfd0ac5e7e68a8dd0de090f32fe956da776f1795672281dc592a018'],
  music: ['音楽', 'category_music.webp', '0ce843f6e7803e01d07dbae326b932c870174564e235230f6a9c61b9011b9fe7'],
  place: ['場所', 'category_place.webp', 'c4cea650dccc2ad9624663aabae19afaeeafa736df0b3fbcf9f43361050db1ba'],
  exhibition: ['展示', 'category_exhibition.webp', '9ffb6816298c85c808ea71dcb73e30b459345796e16969d558bec4cfdb5a9b73'],
  bookstore: ['書店', 'category_bookstore.webp', '40edcc3829fa7af1ca75cb8cc99b2d859284e944258561df002eda31e08ef4c0'],
  library: ['図書館', 'category_library.webp', '9727bce5cbecc97fa95b926b04179b03fbd4e7752dd458f1407fbdd450bae149'],
  food_cafe: ['喫茶・食', 'category_food_cafe.webp', '9c5f119ac1fc9e8220832e370019c26bd512519a3117bebf57ebdd2a6eec292a'],
  event: ['イベント', 'category_event.webp', '6f9bf42f8cfb08220866db7fdeab73c6094f098c8daf8a369680691531e821f1'],
  workshop: ['工房・ワークショップ', 'category_workshop.webp', 'e638f32590340da6def1f58d38a39b283a44c9f8706fec0a8216c8b101b2c159']
};

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function atStart(rel) { return cp.execFileSync('git', ['show', `${START}:${rel}`], { cwd: REPO }); }
function current(rel) { return fs.readFileSync(path.join(REPO, rel)); }

const window = { URL, open() { return null; } };
vm.runInNewContext(current('v3-prototype/js/data.js').toString(), { window });
vm.runInNewContext(current('v3-prototype/js/action_destination.js').toString(), { window, URL, Object });
vm.runInNewContext(current('v3-prototype/js/cultural_matching.js').toString(), {
  window, URL, Object, Date, JSON, RegExp, Number, isNaN
});
vm.runInNewContext(current('v3-prototype/js/real_experience_registry.js').toString(), {
  window, URL, Object, Date, JSON, RegExp, isNaN
});
const R = window.V3_REAL_EXPERIENCE_REGISTRY;
const records = R.snapshot();
const exp001 = records.find((record) => record.id === 'EXP_001');
const exp007 = records.find((record) => record.id === 'EXP_007');

check('10 category IDs exact and deterministic', JSON.stringify(R.CATEGORY_IDS) === JSON.stringify(Object.keys(authority)));
Object.keys(authority).forEach((id) => {
  const expected = authority[id];
  const asset = R.categoryVisualFor(id);
  const rel = `v3-prototype/assets/category-visual/${expected[1]}`;
  check(`${id} runtime asset hash exact`, sha(current(rel)) === expected[2], sha(current(rel)));
  check(`${id} resolver contract exact`, asset &&
    asset.status === 'brand_fallback_ready' && asset.assetType === 'category_visual' &&
    asset.sourceKind === 'emotion_bookstore_category_visual' && asset.categoryId === id &&
    asset.categoryLabel === expected[0] && asset.localAssetPath === `./assets/category-visual/${expected[1]}` &&
    asset.rightsBasis === 'founder_provided_for_emotion_bookstore_service_use' &&
    asset.attributionRequired === false && asset.sourceUrl === null && asset.fitMode === 'cover' &&
    R.validateVisualAsset(asset, '2026-08-22').pass);
});

const unknown = R.resolveVisualAsset(null, 'unknown_category', 'その他', 'category_not_approved');
check('unknown category resolves to approved Logo fallback', unknown.assetType === 'brand_fallback' &&
  unknown.sourceKind === 'emotion_bookstore_brand' &&
  unknown.localAssetPath === './assets/canonical-m01-w01/m01_stacked_lockup.png');
const category = R.resolveVisualAsset(null, 'book', '本');
check('Category Visual beats Logo fallback', category.assetType === 'category_visual' && category.categoryId === 'book');
const real = R.resolveVisualAsset(exp007.visualAsset, 'book', '本');
check('rights-supported real visual beats Category Visual', real.status === 'real_ready' &&
  real.localAssetPath === exp007.visualAsset.localAssetPath);
check('Category Visual is never marked official image', Object.keys(authority).every((id) => {
  const asset = R.categoryVisualFor(id);
  return asset.status === 'brand_fallback_ready' && asset.sourceUrl === null &&
    !/official|公式/.test(asset.sourceKind + asset.rightsBasis + asset.altTextJa);
}));

check('EXP_001 resolves to category_book.webp', exp001.visualAsset.assetType === 'category_visual' &&
  exp001.visualAsset.localAssetPath === './assets/category-visual/category_book.webp');
check('EXP_001 identity/editorial/AD unchanged',
  exp001.title === '『葬送のフリーレン』第1巻' &&
  exp001.reason === '感情を入口に、作品という角度から世界へ触れるために置いています。' &&
  exp001.actionDestination.url === 'https://e-comi.shogakukan.co.jp/books/098501800000d0000000');
check('EXP_007 official JPEG byte-identical', sha(current(PLACE)) === sha(atStart(PLACE)), sha(current(PLACE)));
check('EXP_007 credit and visual contract unchanged', exp007.visualAsset.status === 'real_ready' &&
  exp007.visualAsset.localAssetPath === './assets/real-experience/EXP_007_shinjuku_gyoen_official_landscape.jpg' &&
  exp007.visualAsset.attributionText === '写真提供「新宿御苑管理事務所」');
const deck = R.deckForEmotion('mada', '2026-08-22');
check('Outing deck excludes Culture Sidecar candidate and never pads',
  deck && JSON.stringify(deck.ids) === JSON.stringify(['EXP_007']) && deck.fillFlag === false &&
  R.OUTING_IDS.indexOf('EXP_001') === -1);

const productJs = fs.readdirSync(path.join(SRC, 'js')).filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(path.join(SRC, 'js', name), 'utf8')).join('\n');
check('external image/network/analytics remain 0', !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|\bgtag\s*\(/.test(productJs));
const storeSource = current('v3-prototype/js/store.js').toString();
check('Sprint03 storage delta is isolated from session key',
  storeSource.includes("var STATE_KEY = 'session'") &&
  storeSource.includes("var INTERESTED_KEY = 'interested-experiences-v1'") &&
  !/emotion|title|creator|visualAsset|actionDestination/.test(
    storeSource.slice(storeSource.indexOf('function emptyInterested'), storeSource.indexOf('function clear'))
  ));
const dependencyDiff = cp.execFileSync('git', [
  'diff', '--name-only', START, '--', 'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'
], { cwd: REPO, encoding: 'utf8' }).trim();
check('Stage A dependency files unchanged', dependencyDiff === '', dependencyDiff);

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
