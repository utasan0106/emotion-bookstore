/* =============================================================================
 * Place Detail Content / Typography Limited Fix contract
 * 実行: node verify/place_detail_content_typography.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const dataSource = read('js/data.js');
const adSource = read('js/action_destination.js');
const registrySource = read('js/real_experience_registry.js');
const appSource = read('js/app.js');
const css = read('css/v3.css');
const productJs = fs.readdirSync(path.join(SRC, 'js'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => read('js/' + name))
  .join('\n');

const window = { URL, open() { return null; } };
vm.runInNewContext(dataSource, { window }, { filename: 'data.js' });
vm.runInNewContext(adSource, { window, URL, Object }, { filename: 'action_destination.js' });
vm.runInNewContext(registrySource, {
  window, URL, Object, Date, JSON, RegExp, isNaN
}, { filename: 'real_experience_registry.js' });

const R = window.V3_REAL_EXPERIENCE_REGISTRY;
const AD = window.V3_ACTION_DESTINATION;
const exp = R.byId('EXP_007', '2026-08-23');
const actions = AD.actionsForExperience(exp);
const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

check('EXP_007 remains the approved real place record', exp && exp.title === '新宿御苑' && exp.type === '場所');
check('どんな場所か content is present and place-specific',
  /58\.3ヘクタール/.test(exp.placeDetail.description) &&
  /風景式庭園/.test(exp.placeDetail.description) &&
  /整形式庭園/.test(exp.placeDetail.description) &&
  /日本庭園/.test(exp.placeDetail.description) &&
  /左右対称のプラタナス並木/.test(exp.placeDetail.description) &&
  /景色の秩序そのものが切り替わ/.test(exp.placeDetail.description));
check('どんな場所か passes place-name substitution test',
  /新宿御苑/.test(exp.placeDetail.description) &&
  !/緑が多い場所です|静かな公園です|都心の広い公園です/.test(exp.placeDetail.description));
check('おすすめの過ごし方 uses Shinjuku-Gyoen-specific spatial contrast',
  /風景式庭園と整形式庭園の二つを歩き比べ/.test(exp.placeDetail.recommendedStay) &&
  /広い芝生と巨樹/.test(exp.placeDetail.recommendedStay) &&
  /左右対称のプラタナス並木へ移り/.test(exp.placeDetail.recommendedStay) &&
  /視界の組み立て方がどう変わるか/.test(exp.placeDetail.recommendedStay));
check('placement reason includes emotion × place specificity × placement purpose',
  /まだ名前がない/.test(exp.placeDetail.placementReason) &&
  /新宿御苑/.test(exp.placeDetail.placementReason) &&
  /風景式・整形式・日本庭園/.test(exp.placeDetail.placementReason) &&
  /景色の秩序が切り替わ/.test(exp.placeDetail.placementReason) &&
  /この棚に置いています/.test(exp.placeDetail.placementReason));
check('placement reason passes Emotion-substitution test',
  /ひとつの言葉に決める前/.test(exp.placeDetail.placementReason) &&
  !/感情を入口に|気分転換/.test(exp.placeDetail.placementReason));
check('copy contains no diagnosis or therapeutic promise',
  !/(あなたは|診断|癒|治療|落ち着くはず|整う|元気にする|気分を改善)/.test([
    exp.placeDetail.description,
    exp.placeDetail.recommendedStay,
    exp.placeDetail.placementReason
  ].join('\n')));
check('generic registry reason is not reused on Place Detail',
  appSource.includes('text: placeDetail.placementReason') &&
  appSource.includes("text: 'この棚に置いた理由'") &&
  !appSource.includes("class: 'body-lg place-detail-body', text: experience.reason"));

check('address is exact approved public destination',
  exp.placeDetail.access.address === '東京都新宿区内藤町11' &&
  exp.physicalDestination.address === exp.placeDetail.access.address &&
  exp.physicalDestination.approved === true);
check('nearest station and walking time are present',
  exp.placeDetail.access.nearestStation === '東京メトロ丸ノ内線 新宿御苑前駅 出口1' &&
  exp.placeDetail.access.walkingTime === '徒歩5分');
check('official garden/access provenance is recorded',
  exp.placeDetail.provenance.garden === 'https://fng.or.jp/shinjuku/place/garden/' &&
  exp.placeDetail.provenance.access === 'https://fng.or.jp/shinjuku/access/' &&
  exp.placeDetail.provenance.verifiedOn === '2026-08-23');

check('official site remains primary', actions.length === 2 &&
  actions[0].kind === 'primary' && actions[0].url === 'https://fng.or.jp/shinjuku/' &&
  actions[0].label === '公式サイトを見る');
check('地図で見る is rendered as the place-detail secondary action',
  actions[1].kind === 'maps' &&
  appSource.includes("placeDetail && action.kind === 'maps' ? '地図で見る' : action.label"));
const maps = new URL(actions[1].url);
check('Google Maps deep link contains destination',
  maps.origin === 'https://www.google.com' &&
  maps.pathname === '/maps/dir/' &&
  maps.searchParams.get('api') === '1' &&
  maps.searchParams.get('destination') === '東京都新宿区内藤町11');
check('Google Maps deep link contains no origin', !maps.searchParams.has('origin'));

['どんな場所か', 'おすすめの過ごし方', 'この棚に置いた理由', '訪れるための情報'].forEach((label) => {
  check(`Detail renders ${label}`, appSource.includes(`text: '${label}'`));
});
check('address / station / walk facts render from approved record',
  appSource.includes("h('dt', { text: '住所' })") &&
  appSource.includes("h('dt', { text: '最寄駅' })") &&
  appSource.includes("h('dt', { text: '徒歩' })"));
check('place-only class scopes the typography change',
  appSource.includes("surface.classList.add('place-detail')") &&
  css.includes('.place-detail-title') && css.includes('.place-detail-body') &&
  css.includes('.place-detail .section-title'));
check('title remains serif and is reduced',
  css.includes('.place-detail-title {') && css.includes('font-size: 22px;') &&
  appSource.includes("class: 'display display-sm' + (placeDetail ? ' place-detail-title' : '')"));
check('section/body/meta use sans hierarchy',
  css.includes('.place-detail-meta {') && css.includes('.place-detail-body {') &&
  (css.match(/font-family: var\(--sans\);/g) || []).length >= 3);
check('Detail spacing is compacted',
  css.includes('.place-detail-section + .place-detail-section') &&
  css.includes('margin-top: 20px;') && css.includes('margin-top: 7px;'));

check('geolocation usage remains zero',
  !/navigator\s*\.\s*geolocation|\bgetCurrentPosition\s*\(/.test(productJs));
check('analytics/network sender remains zero',
  !/\bgtag\s*\(|\bsendBeacon\s*\(|\bfetch\s*\(|XMLHttpRequest/.test(productJs));
check('storage implementation is not part of this fix',
  !registrySource.includes('localStorage') && !registrySource.includes('indexedDB'));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
