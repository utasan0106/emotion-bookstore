/* =============================================================================
 * V3 Sprint 02.5 — Visual Asset Gate v1.1 contract and regression
 * 実行: node verify/visual_asset_gate.js
 * ========================================================================== */
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const BASE = 'db8689eeb4c329fb29bef6899a68ba217a879ff6';
const PLACE_PATH = 'v3-prototype/assets/real-experience/EXP_007_shinjuku_gyoen_official_landscape.jpg';
const PLACE_SHA256 = '4d4f866e1391b069a2df9cdd8a0d88a7e4d7f65582277c7826b470223f7edcd2';
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function git(args, buffer = false) {
  return cp.execFileSync('git', args, { cwd: REPO, encoding: buffer ? null : 'utf8' });
}
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function changedPaths(pathspec) {
  const tracked = git(['diff', '--name-only', BASE, '--'].concat(pathspec ? [pathspec] : [])).trim().split('\n').filter(Boolean);
  const untrackedArgs = ['ls-files', '--others', '--exclude-standard'];
  if (pathspec) untrackedArgs.push('--', pathspec);
  const untracked = git(untrackedArgs).trim().split('\n').filter(Boolean);
  return Array.from(new Set(tracked.concat(untracked))).sort();
}
function loadRegistry(source) {
  const window = { URL, open() { return null; } };
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'js/data.js'), 'utf8'), { window });
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'js/action_destination.js'), 'utf8'), { window, URL, Object });
  vm.runInNewContext(source, { window, URL, Object, Date, JSON, RegExp, isNaN });
  return window.V3_REAL_EXPERIENCE_REGISTRY;
}
function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

const registrySource = fs.readFileSync(path.join(SRC, 'js/real_experience_registry.js'), 'utf8');
const baseRegistrySource = git(['show', `${BASE}:v3-prototype/js/real_experience_registry.js`]);
const R = loadRegistry(registrySource);
const BASE_R = loadRegistry(baseRegistrySource);
const records = R.snapshot();
const baseRecords = BASE_R.snapshot();
const exp001 = records.find((record) => record.id === 'EXP_001');
const exp007 = records.find((record) => record.id === 'EXP_007');
const base001 = baseRecords.find((record) => record.id === 'EXP_001');
const base007 = baseRecords.find((record) => record.id === 'EXP_007');
const fallback = exp001.visualAsset;
const real = exp007.visualAsset;
const app = fs.readFileSync(path.join(SRC, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'css/v3.css'), 'utf8');
const productJs = fs.readdirSync(path.join(SRC, 'js'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(path.join(SRC, 'js', name), 'utf8'))
  .join('\n');

check('Visual Asset status enum implemented', registrySource.includes("['real_ready', 'brand_fallback_ready', 'hold']"));
check('real_ready validates rights/source fields', R.validateVisualAsset(real, '2026-08-22').pass);
check('brand_fallback_ready validates approved brand/category/reason', R.validateVisualAsset(fallback, '2026-08-22').pass);
const hold = clone(fallback); hold.status = 'hold';
check('hold does not validate active', !R.validateVisualAsset(hold, '2026-08-22').pass);
check('missing visualAsset fails', !R.validateVisualAsset(null, '2026-08-22').pass);
const unknownRights = clone(real); unknownRights.rightsBasis = '';
check('real image with unknown rights fails', !R.validateVisualAsset(unknownRights, '2026-08-22').pass);
const missingCredit = clone(real); missingCredit.attributionText = null;
check('missing required credit fails', !R.validateVisualAsset(missingCredit, '2026-08-22').pass);
check('expired real-asset recheck fails', !R.validateVisualAsset(real, '2027-02-19').pass);
check('brand fallback remains valid independently of third-party rights', R.validateVisualAsset(fallback, '2030-01-01').pass);
const fakeFallback = clone(fallback); fakeFallback.altTextJa = 'フリーレン第1巻の書影';
check('fallback alt cannot claim nonexistent cover', !R.validateVisualAsset(fakeFallback, '2026-08-22').pass);

check('EXP_001 ISBN/title exact', exp001.isbn13 === '9784098501222' && exp001.title === '『葬送のフリーレン』第1巻');
check('EXP_001 uses approved 本 Category Visual fallback', fallback.status === 'brand_fallback_ready' &&
  fallback.assetType === 'category_visual' && fallback.sourceKind === 'emotion_bookstore_category_visual' &&
  fallback.categoryId === 'book' && fallback.categoryLabel === '本');
check('EXP_001 cover availability/reuse not fabricated', fallback.sourceUrl === null && fallback.fallbackReason === 'real_visual_reuse_not_verified');
check('EXP_001 fallback points to approved local Category Visual', fallback.localAssetPath === './assets/category-visual/category_book.webp');
check('EXP_001 CTA/AD unchanged', JSON.stringify(exp001.actionDestination) === JSON.stringify(base001.actionDestination) && /電子コミック/.test(exp001.actionDestination.label));

check('EXP_007 real official place photo ready', real.status === 'real_ready' && real.assetType === 'place_photo' && real.sourceKind === 'official_free_download');
check('EXP_007 source is current official Photo Album', real.sourceUrl === 'https://policies.env.go.jp/national-garden/shinjukugyoen/photography/photo_album/images/photo_modal_07_01.jpg');
check('EXP_007 rights basis and owner recorded', real.sourceOwner === '環境省 新宿御苑管理事務所' && real.rightsBasis === 'official_photo_album_free_download_under_photo_loan_conditions');
check('EXP_007 required credit exact', real.attributionRequired === true && real.attributionText === '写真提供「新宿御苑管理事務所」');
check('EXP_007 original JPEG preserved', sha(fs.readFileSync(path.join(REPO, PLACE_PATH))) === PLACE_SHA256, sha(fs.readFileSync(path.join(REPO, PLACE_PATH))));
const dimensions = jpegDimensions(fs.readFileSync(path.join(REPO, PLACE_PATH)));
check('EXP_007 official JPEG dimensions 2250x1499', dimensions && dimensions.width === 2250 && dimensions.height === 1499, JSON.stringify(dimensions));
check('EXP_007 uses contain to avoid crop/stretch', real.fitMode === 'contain' && css.includes('.real-experience-visual-image.fit-contain { object-fit: contain; }'));
check('EXP_007 alt describes visible scene only', /庭園.*都市景観.*風景/.test(real.altTextJa) && !/癒|心|気持ち|感情/.test(real.altTextJa));
check('EXP_007 officiality/AD unchanged', JSON.stringify(exp007.actionDestination) === JSON.stringify(base007.actionDestination) && exp007.actionDestination.officiality === 'official');

check('no generated/fake visual source kind', records.every((record) => !/(generated|synthetic|ai_|mock)/i.test(JSON.stringify(record.visualAsset))));
check('no social/UGC/search-result source', records.every((record) => !/(pinterest|instagram|facebook|tiktok|googleusercontent|search-result|ugc)/i.test(JSON.stringify(record.visualAsset))));
check('only approved Category Visual set and rights-verified real image added',
  JSON.stringify(changedPaths('v3-prototype/assets')) === JSON.stringify([
    'v3-prototype/assets/category-visual/category_book.webp',
    'v3-prototype/assets/category-visual/category_bookstore.webp',
    'v3-prototype/assets/category-visual/category_event.webp',
    'v3-prototype/assets/category-visual/category_exhibition.webp',
    'v3-prototype/assets/category-visual/category_film.webp',
    'v3-prototype/assets/category-visual/category_food_cafe.webp',
    'v3-prototype/assets/category-visual/category_library.webp',
    'v3-prototype/assets/category-visual/category_music.webp',
    'v3-prototype/assets/category-visual/category_place.webp',
    'v3-prototype/assets/category-visual/category_workshop.webp',
    PLACE_PATH
  ]));
check('fallback category label and accessible alt present', fallback.categoryLabel === '本' && /カテゴリーを示すイラスト/.test(fallback.altTextJa));
check('real category label and accessible alt present', real.categoryLabel === '場所' && Boolean(real.altTextJa));

check('Product binds visual on Discovery card', app.includes("experienceVisual(experience, 'card')"));
check('Product binds visual on review and Detail', app.includes("experienceVisual(experience, 'review')") && app.includes("experienceVisual(experience, 'detail')"));
check('required credit is rendered', app.includes("class: 'real-experience-attribution'") && app.includes('asset.attributionText'));
check('fallback category is rendered separately from title', app.includes("class: 'real-experience-category-label'") && app.includes('asset.categoryLabel'));
check('no stretch rule: only contain/cover object-fit classes', css.includes('.fit-contain { object-fit: contain; }') && css.includes('.fit-cover { object-fit: cover; }'));
check('canonical CSS changes are additive only', !git(['diff', '--unified=0', BASE, '--', 'v3-prototype/css/v3.css']).split('\n').some((line) => /^-[^-]/.test(line)));

const deck = R.deckForEmotion('mada', '2026-08-22');
check('approved visual records remain EXP_001 / EXP_007',
  JSON.stringify(R.APPROVED_IDS) === JSON.stringify(['EXP_001', 'EXP_007']));
check('Outing deck uses only EXP_007 and does not fill',
  deck && JSON.stringify(deck.ids) === JSON.stringify(['EXP_007']) && deck.fillFlag === false);
['EXP_003', 'EXP_005', 'EXP_008', 'EXP_010', 'EXP_011', 'EXP_012'].forEach((id) => {
  check(`${id} absent`, R.byId(id, '2026-08-22') === null);
});
check('Sprint 01 Action Destination source unchanged',
  fs.readFileSync(path.join(SRC, 'js/action_destination.js')).equals(git(['show', `${BASE}:v3-prototype/js/action_destination.js`], true)));
check('fixture data unchanged', fs.readFileSync(path.join(SRC, 'js/data.js')).equals(git(['show', `${BASE}:v3-prototype/js/data.js`], true)));
const storeSource = fs.readFileSync(path.join(SRC, 'js/store.js'), 'utf8');
check('Sprint03 storage uses separate V3-only key',
  storeSource.includes("var DB_NAME = 'v3-prototype-db'") &&
  storeSource.includes("var STORE_NAME = 'state'") &&
  storeSource.includes("var INTERESTED_KEY = 'interested-experiences-v1'"));
check('personalization diff 0', fs.readFileSync(path.join(SRC, 'js/personalize.js')).equals(git(['show', `${BASE}:v3-prototype/js/personalize.js`], true)));
check('analytics network 0', !/\bgtag\s*\(|\bsendBeacon\s*\(|\bfetch\s*\(|XMLHttpRequest/.test(productJs));
check('external AI 0', !/(api\.openai|generativelanguage|anthropic|gemini)/i.test(productJs));
check('geolocation 0', !/navigator\s*\.\s*geolocation|\bgetCurrentPosition\s*\(/.test(productJs));

const changed = changedPaths();
check('dependency diff 0', !changed.some((file) => /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file)));
check('V2/main/Production/.ai-handoff/.github untouched', changed.every((file) =>
  file.startsWith('v3-prototype/') && !file.startsWith('.ai-handoff/') && !file.startsWith('.github/')),
  changed.join(', '));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
