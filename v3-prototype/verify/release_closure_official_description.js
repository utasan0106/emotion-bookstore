/* =============================================================================
 * Release Closure — S1B Truth → Editorial → Action → Official Detail contract
 * 実行: node verify/release_closure_official_description.js
 * -----------------------------------------------------------------------------
 * 検証する新しい正式契約:
 *  - 8件の Outing に出典明示された公式説明レイヤーが存在する
 *  - 公式説明は公式一次情報にもとづく要約であり、公式文の転載ではない
 *  - Fact（公式説明）と Interpretation（なぜ、この棚に？）が分離されている
 *  - Detail の読み順が FIRST PULL → Identity → Editorial → Official Truth → Action
 *  - 公式出典 host が既存の承認済み Action destination host を超えない
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const appSource = read('js/app.js');
const css = read('css/v3.css');
const matchingSource = read('js/cultural_matching.js');
const registrySource = read('js/real_experience_registry.js');

const window = { URL, open() { return null; } };
vm.runInNewContext(read('js/data.js'), { window }, { filename: 'data.js' });
vm.runInNewContext(read('js/action_destination.js'), { window, URL, Object }, { filename: 'ad.js' });
vm.runInNewContext(matchingSource, {
  window, URL, Object, Date, JSON, RegExp, Number, isNaN
}, { filename: 'cultural_matching.js' });
vm.runInNewContext(registrySource, {
  window, URL, Object, Date, JSON, RegExp, isNaN
}, { filename: 'registry.js' });

const R = window.V3_REAL_EXPERIENCE_REGISTRY;
const OUTINGS = ['EXP_101', 'EXP_102', 'EXP_103', 'EXP_104', 'EXP_105', 'EXP_106', 'EXP_107', 'EXP_007'];
const ASOF = '2026-08-23';

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/* ---------------------------------------------------- registry content 契約 */
const actionHosts = new Set();
OUTINGS.forEach((id) => {
  const record = R.byId(id, ASOF);
  check(`${id} resolves as approved Outing`, Boolean(record));
  if (!record) return;
  actionHosts.add(new URL(record.actionDestination.url).host);

  const pd = record.placeDetail;
  const os = pd && pd.officialSource;
  check(`${id} has officialSource block`, Boolean(os));
  if (!os) return;

  check(`${id} attribution label is source-attributed`,
    os.attributionLabel === '公式情報より' || os.attributionLabel === '公式サイトによると',
    os.attributionLabel);
  check(`${id} declares paraphrase mode, not reproduction`,
    os.mode === 'source_grounded_paraphrase' && os.quotedExcerpt === null,
    `${os.mode}/${os.quotedExcerpt}`);
  check(`${id} rights basis is fail-closed paraphrase`,
    os.rightsBasis === 'official_source_grounded_paraphrase_no_reproduction', os.rightsBasis);
  check(`${id} source name and https official URL recorded`,
    typeof os.sourceName === 'string' && os.sourceName.length > 3 &&
    /^https:\/\//.test(os.sourceUrl), `${os.sourceName} ${os.sourceUrl}`);
  check(`${id} source verified date is a real date-only value`,
    /^\d{4}-\d{2}-\d{2}$/.test(os.verifiedOn), os.verifiedOn);
  check(`${id} official source host is already an approved action host`,
    new URL(os.sourceUrl).host === new URL(record.actionDestination.url).host,
    `${new URL(os.sourceUrl).host} vs ${new URL(record.actionDestination.url).host}`);

  check(`${id} card official summary is a single short line`,
    typeof pd.officialSummary === 'string' &&
    pd.officialSummary.length > 8 && pd.officialSummary.length <= 44 &&
    !/\n/.test(pd.officialSummary), `${pd.officialSummary && pd.officialSummary.length}字`);

  /* Fact と Interpretation の分離 */
  check(`${id} official description carries no shelf interpretation`,
    !/感情書店では/.test(pd.description) && !/に置きました/.test(pd.description));
  /* frozen Why は「置きました」「読みました」の2形を持つ。文面は変更しない。 */
  check(`${id} placement reason remains the interpretation layer`,
    /感情書店では/.test(pd.placementReason) &&
    /(に置きました|として読みました)/.test(pd.placementReason));
  check(`${id} official summary carries no shelf interpretation`,
    !/感情書店では/.test(pd.officialSummary) && !/に置きました/.test(pd.officialSummary));
  check(`${id} no diagnosis / scoring / therapeutic claim in public copy`,
    !/(あなたは|診断|癒|治療|効果|ランキング|スコア|おすすめ度)/.test(
      [pd.description, pd.officialSummary, pd.placementReason].join('\n')));
});

check('official source hosts introduce no new external host',
  actionHosts.size > 0 && OUTINGS.every((id) => {
    const r = R.byId(id, ASOF);
    return r && actionHosts.has(new URL(r.placeDetail.officialSource.sourceUrl).host);
  }), Array.from(actionHosts).join(','));

/* --------------------------------------------------------- render 順序契約 */
const detailStart = appSource.indexOf('function surfaceDetail(');
const detailEnd = appSource.indexOf('function planSummary(');
const detailSrc = appSource.slice(detailStart, detailEnd);
check('surfaceDetail source block located', detailStart > 0 && detailEnd > detailStart);

const summaryStart = detailSrc.indexOf('var summary = [');
const nodesStart = detailSrc.indexOf('var nodes = [', summaryStart);
const summarySrc = detailSrc.slice(summaryStart, nodesStart);
const nodesSrc = detailSrc.slice(nodesStart);
const iPull = summarySrc.indexOf('contract.firstPull');
const iTitle = summarySrc.indexOf("id: 'surface-title'");
const iTruth = summarySrc.indexOf('detail-practical-truth');
const iWhy = summarySrc.indexOf('detail-editorial-reason');
const iHero = nodesSrc.indexOf('detail-visual-column');
const iActions = nodesSrc.indexOf("class: 'actions detail-actions'");
const iOfficial = nodesSrc.indexOf('detail-official-description');
const iFacts = nodesSrc.indexOf('place-detail-access');
check('reader order: FIRST PULL < Identity < Editorial Why < Practical Truth',
  iPull >= 0 && iTitle > iPull && iWhy > iTitle && iTruth > iWhy,
  `${iPull}/${iTitle}/${iWhy}/${iTruth}`);
check('reader order: Hero < Official Detail < deeper access < Official Action',
  iHero >= 0 && iOfficial > iHero && iFacts > iOfficial && iActions > iFacts,
  `${iHero}/${iOfficial}/${iFacts}/${iActions}`);
check('official description renders attribution and source link',
  detailSrc.includes('detail-official-attribution') &&
  detailSrc.includes('detail-official-source-link') &&
  detailSrc.includes("rel: 'noopener noreferrer'") &&
  detailSrc.includes("target: '_blank'"));
check('official description section has explicit deeper-fact heading',
  detailSrc.includes("text: '公式情報からわかること'"));
check('Discovery card renders a one-line official summary',
  appSource.includes('cardOfficialSummary') && appSource.includes('real-discovery-official'));

/* --------------------------------------------------------------- CSS 契約 */
check('official description layer has its own visual separation',
  css.includes('.detail-official-description') &&
  css.includes('.detail-official-attribution') &&
  css.includes('.detail-official-provenance') &&
  css.includes('.detail-official-source-link'));
check('source link exposes a visible focus state',
  css.includes('.detail-official-source-link:focus-visible'));

/* ------------------------------------------ 保護されている契約が動いていない */
const productJs = fs.readdirSync(path.join(SRC, 'js'))
  .filter((n) => n.endsWith('.js')).map((n) => read('js/' + n)).join('\n');
check('no analytics/network sender introduced',
  !/\bgtag\s*\(|\bsendBeacon\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/.test(productJs));
check('no geolocation introduced', !/navigator\s*\.\s*geolocation/.test(productJs));
/* Culture 側の public_editorial.js には既存の embed 取り扱いがある（本round対象外）。
   本roundが触れる Outing 経路と index.html に embed を持ち込んでいないことを見る。 */
check('no iframe / video embed introduced in this round',
  !/<iframe|createElement\(['"]iframe/.test(
    appSource + registrySource + read('index.html')));
check('storage keys unchanged',
  read('js/store.js').includes("var INTERESTED_KEY = 'interested-experiences-v1'") &&
  read('js/store.js').includes("var STATE_KEY = 'session'"));
check('registry performs no storage access',
  !registrySource.includes('localStorage') && !registrySource.includes('indexedDB'));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
