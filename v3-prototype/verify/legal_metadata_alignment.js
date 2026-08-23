/* =============================================================================
 * V3 Legal / Metadata Alignment — deterministic contract verification
 * Run: node verify/legal_metadata_alignment.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const BASE = '01673bfbf931ede971e5205b54149248346094e0';
const EXPECTED_BRANCH = 'codex/v3-legal-metadata-alignment';
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const readRoot = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const atBase = (rel) => cp.execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8' });
const git = (args) => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const results = [];

function check(name, pass, detail = '') {
  const ok = Boolean(pass);
  results.push({ name, pass: ok, detail: String(detail || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const index = read('index.html');
const privacy = read('privacy.html');
const terms = read('terms.html');
const css = read('css/v3.css');
const app = read('js/app.js');
const store = read('js/store.js');
const analyticsSource = read('js/analytics.js');
const editorialContent = read('js/public_editorial_content.js');
const legalMatrix = read('docs/legal/LEGAL_ALIGNMENT_MATRIX.md');
const privacyTruth = read('docs/legal/CURRENT_V3_PRIVACY_TRUTH.md');
const termsTruth = read('docs/legal/CURRENT_V3_TERMS_TRUTH.md');
const navEvidence = read('docs/legal/LEGAL_NAVIGATION_EVIDENCE.md');
const networkEvidence = read('docs/legal/NETWORK_REGRESSION_AFTER_LEGAL.md');
const runtimeJs = fs.readdirSync(path.join(SRC, 'js')).filter((name) => name.endsWith('.js'))
  .map((name) => read(`js/${name}`)).join('\n');

check('source branch exact', git(['branch', '--show-current']) === EXPECTED_BRANCH, git(['branch', '--show-current']));
check('approved base is ancestor', cp.spawnSync('git', ['merge-base', '--is-ancestor', BASE, 'HEAD'], { cwd: ROOT }).status === 0);

check('V3 Privacy page title exact', privacy.includes('<title>プライバシーポリシー | みんなの感情書店 V3</title>'));
check('V3 Terms page title exact', terms.includes('<title>利用規約 | みんなの感情書店 V3</title>'));
check('V3 Legal pages Japanese and noindex', [privacy, terms].every((page) =>
  page.includes('<html lang="ja">') && page.includes('<meta name="robots" content="noindex, nofollow">')));
check('V3 Legal pages load same-origin CSS only', [privacy, terms].every((page) =>
  page.includes('href="./css/v3.css"') && !/<link\b[^>]+href=["']https?:/i.test(page)));
check('V3 Legal pages add no script or iframe', [privacy, terms].every((page) =>
  !/<script\b|<iframe\b|rel=["'](?:preconnect|prefetch)/i.test(page)));
check('V3 Legal pages retain existing contact authority', [privacy, terms].every((page) =>
  page.includes('公式Xアカウント @emotion_books')));
check('no invented email address', !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(privacy + terms));

check('P0-01 Privacy V3 applicability exact', privacy.includes('V3の公開画面、端末内保存、確認済みの公式外部リンクおよびサイト配信に適用します'));
check('P0-01 Terms V3 applicability exact', terms.includes('V3の公開画面、端末内保存、確認済みの公式外部リンクおよびサイト配信に適用します'));
check('P0-01 V2/future boundary exact', [privacy, terms].every((page) =>
  page.includes('V2または将来機能の記載は、V3で現在有効な機能を意味しません')));
check('P0-02 GA4 current inactive exact', [privacy, terms].every((page) =>
  page.includes('Google Analytics 4その他のアクセス解析への送信を有効にしていません') &&
  page.includes('V3の計測実装には送信先が設定されておらず、イベントは外部送信されません')));
check('P0-02 future GA4 requires prior update', [privacy, terms].every((page) =>
  page.includes('将来V3専用の送信先を確認して有効化する場合は、開始前に')));
check('P0-02 does not claim GA4 Admin verified', privacy.includes('確認済みであるとは扱いません'));
check('P0-03 self-hosted font truth exact', privacy.includes('表示用フォントは自己ホスト方式') &&
  privacy.includes('fonts.googleapis.com') && privacy.includes('fonts.gstatic.com') && privacy.includes('要求しません'));
check('P0-04 inactive APIs listed accurately', [
  'Google Books API', 'Apple iTunes Search API', 'Open-Meteoその他の天気API',
  '位置情報取得', '外部AI', '外部検索による推薦表示'
].every((text) => privacy.includes(text)));
check('P0-04 no future pre-authorization', privacy.includes('将来導入を本ポリシーで事前承認するものではありません'));
check('P0-05 hosting row present', privacy.includes('サイト配信元') && privacy.includes('ページ表示時'));
check('P0-05 official host row present', privacy.includes('fng.or.jp') && privacy.includes('公式サイトを見る'));
check('P0-05 Maps row exact', privacy.includes('www.google.com') && privacy.includes('現在地、originパラメータ') && privacy.includes('位置情報を取得しません'));
check('P0-05 GA4 row says zero', privacy.includes('送信先未設定、送信0です'));
check('P0-05 Editorial row says active zero', privacy.includes('有効なEditorialレコードがないため発生しません') && privacy.includes('現在の送信は0です'));
check('P0-05 inactive future features not table rows', !/<td[^>]*>\s*(?:X|広告|Creator Support|Marketplace|Memory Print|決済)/i.test(privacy));
check('P0-06 human-approved finite 0–3 exact', terms.includes('人が承認した編集基準と確認済みの実在Experience Registryに基づき') &&
  terms.includes('0〜3件の有限な寄り道'));
check('P0-06 no API fill / no diagnosis exact', terms.includes('外部APIの自動検索結果で棚を埋めず、利用者の心理状態を診断しません'));
check('P0-07 Terms same-origin constant exact', terms.includes('現在のV3 Releaseで常時発生するのは、サイト配信元への同一オリジン通信です'));
check('P0-07 Terms explicit external action exact', terms.includes('公式サイトおよびGoogle Mapsへの移動は、利用者が該当ボタンを選んだ場合だけ発生します'));
check('P0-07 inactive external services exact', terms.includes('Google Analytics 4、外部Google Fonts、外部書籍・音楽API、天気API、共有、支援、広告、決済はV3 Releaseでは有効ではありません'));
check('P0-08 V3 has both Legal links', index.includes('href="./privacy.html">プライバシー</a>') &&
  index.includes('href="./terms.html">利用規約</a>'));
check('P0-08 links are relative with no tracking', !/href=["']\.\/(?:privacy|terms)\.html[?#]/.test(index));
check('P0-08 Legal pages return and cross-link same-origin', privacy.includes('href="./index.html"') &&
  privacy.includes('href="./terms.html"') && terms.includes('href="./index.html"') &&
  terms.includes('href="./privacy.html"'));

check('P1-01 bounded private Trust heading exact', app.includes("heading: '登録不要・記録は非公開'") &&
  app.includes("support: 'この端末に保存した記録は公開されません。'"));
check('P1-01 bounded external-AI Trust heading exact', app.includes("heading: '記録を外部AIへ送りません'") &&
  app.includes("support: 'この端末に保存した内容を、外部AIへ送る機能はありません。'"));
check('P1-01 superseded broad headings absent', !app.includes('登録不要・完全に非公開') && !app.includes('AIは使用しません'));
check('P1-02 FAQ current V3 storage/destination policy exact', app.includes('現在のV3ではこの端末のブラウザに保存し、外部サービスへ送信しません。公式サイトや地図を開いた後は、移動先の方針が適用されます。'));
check('P1-02 FAQ external AI exact', app.includes('この端末に保存した記録を外部AIへ送る機能はありません。'));
check('P1-02 FAQ no-geolocation exact', app.includes('現在のV3では位置情報を取得しません。地図を開く場合も、公開されている目的地だけをGoogle Mapsへ渡します。'));
check('P1-02 old Beta/private wording absent', !/V3 Beta0|現在のBeta0|privateな本文/.test(app));
check('P1-03 local state inventory present', privacy.includes('選んだ感情の棚と画面の進行状態、「気になる」、予定、体験後に選ぶ記録'));
check('P1-03 deletion/device loss/recovery boundary present', privacy.includes('サイトデータを削除') &&
  privacy.includes('端末・ブラウザを変更') && privacy.includes('復元できません'));
check('P1-03 cloud sync absent', [privacy, terms].every((page) => page.includes('クラウド同期')));
check('P1-04 destination policies after explicit action', privacy.includes('外部サイトや地図は、利用者が該当する操作を選んだ場合だけ') &&
  privacy.includes('移動先の利用規約・プライバシーポリシーが適用されます'));
check('P1-04 future video is current zero and gated', terms.includes('有効なEditorialレコードがないため、動画プロバイダーへの通信は発生しません'));
check('P1-05 hosting separated from analytics', privacy.includes('これはサイト配信のための通信であり、Productのアクセス解析とは区別されます'));
check('P1-05 private state not appended to URL', privacy.includes('非公開状態をURLへ付加しません'));

check('alignment matrix closes all P0', legalMatrix.includes('P0 closed: **8 / 8**') && legalMatrix.includes('P0 remaining: **0**'));
check('alignment matrix closes all P1', legalMatrix.includes('P1 closed: **5 / 5**') && legalMatrix.includes('P1 remaining: **0**'));
check('truth artifacts carry current counts', privacyTruth.includes('First-paint third-party requests: **0**') &&
  privacyTruth.includes('PRIVATE USER-AUTHORED CONTENT EXTERNAL TRANSMISSION = 0'));
check('Terms truth keeps finite no-fill semantics', termsTruth.includes('finite 0–3 Outing deck') && termsTruth.includes('external API results never pad'));
check('navigation evidence records 44px contract', navEvidence.includes('min-width: 44px') && navEvidence.includes('min-height: 44px'));
check('network evidence records current zero counts', networkEvidence.includes('First-paint third-party requests: **0**') &&
  networkEvidence.includes('Analytics outbound hosts: **0**'));

const firstPaintPages = [index, privacy, terms];
const refs = firstPaintPages.flatMap((page) => [...page.matchAll(/<(?:script|link|img|source)\b[^>]*(?:src|href|srcset)=["']([^"']+)/gi)]
  .map((match) => match[1]));
check('all first-paint document refs are same-origin relative', refs.length > 0 && refs.every((ref) => !/^https?:\/\//i.test(ref)), refs.join(','));
const cssUrls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map((match) => match[1]);
check('all CSS resources are same-origin relative', cssUrls.length > 0 && cssUrls.every((ref) => !/^https?:\/\//i.test(ref)));
check('first-paint third-party request count remains 0', !/<iframe\b|rel=["'](?:preconnect|prefetch)/i.test(index + privacy + terms) &&
  refs.every((ref) => !/^https?:\/\//i.test(ref)));
check('Legal pages activate no analytics', !/analytics\.js|gtag|dataLayer|googletagmanager|G-[A-Z0-9]{6,}/i.test(privacy + terms));

const analyticsWindow = {};
vm.runInNewContext(analyticsSource, { window: analyticsWindow, Object, Array }, { filename: 'analytics.js' });
check('GA4 destination remains absent', analyticsWindow.V3_ANALYTICS.status() === 'MEASUREMENT_CONFIG_BLOCKED' &&
  analyticsWindow.V3_ANALYTICS.MEASUREMENT_DESTINATION_STATUS === 'UNVERIFIED_QA_DESTINATION');
check('analytics outbound hosts remain 0', !/googletagmanager|google-analytics|analytics\.google/i.test(analyticsSource + index));
check('active Editorial records remain 0', /records:\s*Object\.freeze\(\[\]\)/.test(editorialContent));
check('private user-authored content external transmission remains 0', !/\b(?:fetch|sendBeacon|XMLHttpRequest|WebSocket|EventSource)\b/.test(store));
check('geolocation remains absent', !/navigator\s*\.\s*geolocation|\b(?:getCurrentPosition|watchPosition)\s*\(/.test(runtimeJs));
check('external AI remains absent', !/(api\.openai|anthropic|generativelanguage|externalAI|openai\s*\()/i.test(runtimeJs));
check('login/cloud sync remains absent', !/(oauth|signIn\s*\(|login\s*\(|cloudSync\s*\()/i.test(runtimeJs));

check('Legal links touch target >=44', /\.legal-footer-link,\s*\n\.legal-back-link\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/.test(css));
check('Legal footer is visible and not conditionally hidden', index.includes('<footer class="legal-footer"') &&
  !/\.legal-footer\s*\{[^}]*display:\s*none/i.test(css));
check('Legal links inherit visible focus', css.includes(':focus-visible {') && css.includes('outline: 2px solid var(--navy)'));
check('Legal footer wraps instead of overflowing', /\.legal-footer-links\s*\{[\s\S]*?flex-wrap:\s*wrap;/.test(css));
check('Legal content width bounded for 390/430/1440', css.includes('width: min(100% - 32px, 820px)'));
check('mobile table avoids horizontal overflow', /@media \(max-width: 599px\)[\s\S]*?\.legal-page-main table,[\s\S]*?display: block;[\s\S]*?min-width: 0;/.test(css));

const protectedPaths = [
  'v3-prototype/js/store.js', 'v3-prototype/js/data.js', 'v3-prototype/js/personalize.js',
  'v3-prototype/js/action_destination.js', 'v3-prototype/js/real_experience_registry.js',
  'v3-prototype/js/interested_retrieval.js', 'v3-prototype/js/public_editorial.js',
  'v3-prototype/js/public_editorial_content.js', 'v3-prototype/js/analytics.js'
];
protectedPaths.forEach((rel) => check(`protected byte identity: ${rel}`, readRoot(rel) === atBase(rel)));
check('root V2 privacy byte-identical', readRoot('privacy.html') === atBase('privacy.html'));
check('root V2 terms byte-identical', readRoot('terms.html') === atBase('terms.html'));

const oldNewPairs = [
  ['登録不要・完全に非公開', '登録不要・記録は非公開'],
  ['あなたの記録はあなただけのものです。', 'この端末に保存した記録は公開されません。'],
  ['AIは使用しません', '記録を外部AIへ送りません'],
  ['本文をAIが読むことはありません。', 'この端末に保存した内容を、外部AIへ送る機能はありません。'],
  ['登録不要・入力内容はこの端末を基本に扱います', '登録不要・この端末に保存した記録は公開されません'],
  ['登録しなくても利用できます。V3 Beta0の基本体験は、アカウントを作らずに使える設計です。', '登録しなくても利用できます。現在のV3 Releaseは、アカウントを作らずに使えます。'],
  ['自分の記録は公開を前提に扱いません。現在のBeta0では、この端末で扱うことを基本にしています。', '自分の記録は公開されません。現在のV3ではこの端末のブラウザに保存し、外部サービスへ送信しません。公式サイトや地図を開いた後は、移動先の方針が適用されます。'],
  ['現在のBeta0では、privateな本文を外部AIへ送る設計にはしません。', 'この端末に保存した記録を外部AIへ送る機能はありません。'],
  ['現在のBeta0では、自動で位置情報を取得しません。将来利用する場合も、本人が明示的に選べることを前提にします。', 'いいえ。現在のV3では位置情報を取得しません。地図を開く場合も、公開されている目的地だけをGoogle Mapsへ渡します。']
];
function normalizeTrust(source, indexInPair) {
  return oldNewPairs.reduce((value, pair, i) => value.split(pair[indexInPair]).join(`__LEGAL_COPY_${i}__`), source);
}
check('app mutation is copy-only within authorized Trust/FAQ pairs',
  normalizeTrust(atBase('v3-prototype/js/app.js'), 0) === normalizeTrust(app, 1));

const baseIndex = atBase('v3-prototype/index.html');
const indexWithoutLegalFooter = index.replace(/\n  <footer class="legal-footer"[\s\S]*?<\/footer>\n\n  <footer id="debugFooter"/, '\n  <footer id="debugFooter"');
check('index mutation is Legal footer only', indexWithoutLegalFooter === baseIndex);

const baseCss = atBase('v3-prototype/css/v3.css');
const cssWithoutLegal = css.replace(/\n\/\* V3 Legal \/ Metadata Alignment:[\s\S]*$/, '');
check('CSS mutation is isolated Legal block only', cssWithoutLegal === baseCss);

const changed = Array.from(new Set(
  git(['diff', '--name-only', BASE]).split('\n').filter(Boolean)
    .concat(git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean))
)).sort();
const allowed = changed.every((rel) =>
  ['v3-prototype/index.html', 'v3-prototype/privacy.html', 'v3-prototype/terms.html',
   'v3-prototype/css/v3.css', 'v3-prototype/js/app.js',
   'v3-prototype/verify/legal_metadata_alignment.js'].includes(rel) ||
  rel.startsWith('v3-prototype/docs/legal/'));
check('bounded changed-file scope exact', allowed, changed.join(','));
check('dependency delta 0', git(['diff', '--name-only', BASE, '--', 'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) === '');
check('outside V3 diff 0', git(['diff', '--name-only', BASE, '--', ':!v3-prototype']) === '');

const pass = results.filter((result) => result.pass).length;
const fail = results.length - pass;
console.log(`\nTOTAL ${results.length}  PASS ${pass}  FAIL ${fail}`);
if (fail) process.exit(1);
