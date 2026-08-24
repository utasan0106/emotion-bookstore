/* =============================================================================
 * V3 SEO / AIO Release Hardening — deterministic verification
 * Run: node v3-prototype/verify/seo_aio_release_hardening.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const BASE = 'ed9d574490e46ec16d82971a18f1df23f5637040';
const EXPECTED_BRANCH = 'codex/v3-seo-aio-release-hardening';
const ORIGIN = 'https://emotion-bookstore.vercel.app';
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const bytes = (rel) => fs.readFileSync(path.join(SRC, rel));
const readRoot = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const atBase = (rel) => cp.execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8' });
const git = (args) => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const results = [];

function check(name, pass, detail = '') {
  const ok = Boolean(pass);
  results.push({ name, pass: ok, detail: String(detail || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function bodyOf(html) {
  const match = html.match(/<body\b[\s\S]*<\/body>/i);
  return match ? match[0] : '';
}

function headOf(html) {
  const match = html.match(/<head>[\s\S]*<\/head>/i);
  return match ? match[0] : '';
}

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

const index = read('index.html');
const privacy = read('privacy.html');
const terms = read('terms.html');
const app = read('js/app.js');
const css = read('css/v3.css');
const analyticsSource = read('js/analytics.js');
const editorialContent = read('js/public_editorial_content.js');
const matrix = read('docs/seo-aio/METADATA_MATRIX.md');
const oldCopy = read('docs/seo-aio/OLD_COPY_SCAN.md');
const structuredEvidence = read('docs/seo-aio/STRUCTURED_DATA_VALIDATION.md');
const networkEvidence = read('docs/seo-aio/NETWORK_DRIFT.md');
const pages = [index, privacy, terms];
const heads = pages.map(headOf);

check('source branch exact', git(['branch', '--show-current']) === EXPECTED_BRANCH, git(['branch', '--show-current']));
check('approved Legal Alignment base is ancestor', cp.spawnSync('git', ['merge-base', '--is-ancestor', BASE, 'HEAD'], { cwd: ROOT }).status === 0);
check('all V3 pages remain Japanese-only', pages.every((page) => page.includes('<html lang="ja">')));

check('V3 entrance title exact', index.includes('<title>みんなの感情書店 V3｜二つの入口から文化へ</title>'));
check('V3 entrance description factual', index.includes('感情の棚から、または棚を選ばずに') &&
  index.includes('感情書店の編集部が理由を説明できる') && index.includes('0〜3件の有限な寄り道') &&
  index.includes('心理状態の診断やパーソナライズ推薦は行いません'));
check('V3 entrance canonical exact', index.includes(`<link rel="canonical" href="${ORIGIN}/v3-prototype/">`));
check('V3 entrance robots indexable', index.includes('<meta name="robots" content="index, follow, max-image-preview:large">'));
check('entrance has one title/description/canonical/robots',
  count(index, /<title>/g) === 1 && count(index, /<meta name="description"/g) === 1 &&
  count(index, /<link rel="canonical"/g) === 1 && count(index, /<meta name="robots"/g) === 1);

check('Privacy title retained', privacy.includes('<title>プライバシーポリシー | みんなの感情書店 V3</title>'));
check('Privacy description current truth', privacy.includes('端末内保存、サイト配信、明示操作による外部送信と、現在無効の計測機能'));
check('Privacy canonical exact', privacy.includes(`<link rel="canonical" href="${ORIGIN}/v3-prototype/privacy.html">`));
check('Privacy robots appropriate', privacy.includes('<meta name="robots" content="noindex, follow">'));
check('Terms title retained', terms.includes('<title>利用規約 | みんなの感情書店 V3</title>'));
check('Terms description current truth', terms.includes('V3 Releaseの体験、端末内保存、外部サービスへの明示的な移動、利用条件'));
check('Terms canonical exact', terms.includes(`<link rel="canonical" href="${ORIGIN}/v3-prototype/terms.html">`));
check('Terms robots appropriate', terms.includes('<meta name="robots" content="noindex, follow">'));
check('Legal pages each have one title/description/canonical/robots', [privacy, terms].every((page) =>
  count(page, /<title>/g) === 1 && count(page, /<meta name="description"/g) === 1 &&
  count(page, /<link rel="canonical"/g) === 1 && count(page, /<meta name="robots"/g) === 1));

check('Legal P0 applicability/version boundary retained', [privacy, terms].every((page) =>
  page.includes('V3の公開画面、端末内保存、確認済みの公式外部リンクおよびサイト配信に適用します') &&
  page.includes('V2または将来機能の記載は、V3で現在有効な機能を意味しません')));
check('Legal P0 GA4 inactive truth retained', [privacy, terms].every((page) =>
  page.includes('Google Analytics 4その他のアクセス解析への送信を有効にしていません') &&
  page.includes('V3の計測実装には送信先が設定されておらず、イベントは外部送信されません')));
check('Legal P0 self-hosted font truth retained', privacy.includes('表示用フォントは自己ホスト方式') &&
  privacy.includes('fonts.googleapis.com') && privacy.includes('fonts.gstatic.com') && privacy.includes('要求しません'));
check('Legal P0 inactive API truth retained', ['Google Books API', 'Apple iTunes Search API',
  'Open-Meteoその他の天気API', '位置情報取得', '外部AI', '外部検索による推薦表示']
  .every((text) => privacy.includes(text)));
check('Legal P0 external-transmission table retained', privacy.includes('サイト配信元') &&
  privacy.includes('fng.or.jp') && privacy.includes('www.google.com') &&
  privacy.includes('送信先未設定、送信0です') && privacy.includes('現在の送信は0です'));
check('Legal P0 Human Editorial finite semantics retained', terms.includes('人が承認した編集基準') &&
  terms.includes('0〜3件の有限な寄り道') && terms.includes('外部APIの自動検索結果で棚を埋めず'));
check('Legal P0 explicit external-service semantics retained', terms.includes('サイト配信元への同一オリジン通信') &&
  terms.includes('利用者が該当ボタンを選んだ場合だけ発生します'));
check('Legal P0 discoverable same-origin links retained', index.includes('href="./privacy.html">プライバシー</a>') &&
  index.includes('href="./terms.html">利用規約</a>') && privacy.includes('href="./terms.html"') &&
  terms.includes('href="./privacy.html"'));
check('Legal P1 bounded Trust headings retained', app.includes("heading: '登録不要・記録は非公開'") &&
  app.includes("heading: '記録を外部AIへ送りません'"));
check('Legal P1 bounded FAQ truth retained', app.includes('現在のV3ではこの端末のブラウザに保存し、外部サービスへ送信しません') &&
  app.includes('この端末に保存した記録を外部AIへ送る機能はありません') &&
  app.includes('現在のV3では位置情報を取得しません'));
check('Legal P1 local storage/recovery boundary retained', privacy.includes('サイトデータを削除') &&
  privacy.includes('端末・ブラウザを変更') && privacy.includes('復元できません') && privacy.includes('クラウド同期'));
check('Legal P1 explicit destination policy retained', privacy.includes('利用者が該当する操作を選んだ場合だけ') &&
  privacy.includes('移動先の利用規約・プライバシーポリシーが適用されます'));
check('Legal P1 hosting metadata separated from analytics', privacy.includes('サイト配信のための通信であり、Productのアクセス解析とは区別されます') &&
  privacy.includes('非公開状態をURLへ付加しません'));
check('root V2 Legal authority byte-identical', readRoot('privacy.html') === atBase('privacy.html') &&
  readRoot('terms.html') === atBase('terms.html'));
check('Legal P0/P1 closure matrix retained', read('docs/legal/LEGAL_ALIGNMENT_MATRIX.md').includes('P0 closed: **8 / 8**') &&
  read('docs/legal/LEGAL_ALIGNMENT_MATRIX.md').includes('P1 closed: **5 / 5**'));

check('canonical origin grounded in existing Production sitemap', readRoot('sitemap.xml').includes(`<loc>${ORIGIN}/</loc>`));
check('Preview host never appears in canonical metadata', !/emotion-bookstore-[a-z0-9-]+\.vercel\.app/i.test(heads.join('\n')));
check('canonical and og:url align per page',
  index.includes(`<meta property="og:url" content="${ORIGIN}/v3-prototype/">`) &&
  privacy.includes(`<meta property="og:url" content="${ORIGIN}/v3-prototype/privacy.html">`) &&
  terms.includes(`<meta property="og:url" content="${ORIGIN}/v3-prototype/terms.html">`));

check('OGP core fields complete on all pages', pages.every((page) =>
  ['og:type', 'og:locale', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']
    .every((property) => page.includes(`property="${property}"`))));
check('OGP type/locale/site name exact', pages.every((page) =>
  page.includes('<meta property="og:type" content="website">') &&
  page.includes('<meta property="og:locale" content="ja_JP">') &&
  page.includes('<meta property="og:site_name" content="みんなの感情書店 V3">')));
check('Twitter fields complete on all pages', pages.every((page) =>
  ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']
    .every((name) => page.includes(`name="${name}"`))));
check('Twitter card hierarchy exact', index.includes('<meta name="twitter:card" content="summary_large_image">') &&
  [privacy, terms].every((page) => page.includes('<meta name="twitter:card" content="summary">')));
check('OGP/Twitter image uses approved same-origin V3 asset', pages.every((page) =>
  page.includes(`${ORIGIN}/v3-prototype/assets/canonical-m01-w01/w01_hero.png`)));
const hero = bytes('assets/canonical-m01-w01/w01_hero.png');
check('OG image bytes are valid PNG', hero.subarray(1, 4).toString('ascii') === 'PNG');
check('OG image dimensions match metadata', hero.readUInt32BE(16) === 941 && hero.readUInt32BE(20) === 680 &&
  index.includes('<meta property="og:image:width" content="941">') &&
  index.includes('<meta property="og:image:height" content="680">'));
check('OG image alt describes current visual', pages.every((page) =>
  page.includes('本の頁のあいだに開けた青空と道を歩く人の水彩画')));

const jsonLdMatches = [...index.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
check('exactly one JSON-LD block', jsonLdMatches.length === 1);
let jsonLd = null;
try { jsonLd = JSON.parse(jsonLdMatches[0] ? jsonLdMatches[0][1] : ''); } catch (_) { jsonLd = null; }
check('JSON-LD parses', jsonLd !== null);
check('JSON-LD type is factual WebSite only', jsonLd && jsonLd['@type'] === 'WebSite');
check('JSON-LD canonical identity exact', jsonLd && jsonLd['@id'] === `${ORIGIN}/v3-prototype/#website` &&
  jsonLd.url === `${ORIGIN}/v3-prototype/` && jsonLd.name === 'みんなの感情書店 V3' && jsonLd.inLanguage === 'ja');
check('JSON-LD current Product truth exact', jsonLd && jsonLd.description.includes('感情書店の編集部が理由を説明できる') &&
  jsonLd.description.includes('0〜3件の有限な寄り道') && jsonLd.description.includes('実在する文化や場所') &&
  jsonLd.description.includes('診断やパーソナライズ推薦は行いません'));
const jsonKeys = jsonLd ? Object.keys(jsonLd).sort() : [];
check('JSON-LD field allowlist exact', JSON.stringify(jsonKeys) === JSON.stringify([
  '@context', '@id', '@type', 'alternateName', 'description', 'inLanguage', 'name', 'url'
].sort()), jsonKeys.join(','));
check('forbidden structured-data claims absent', !/(Organization|Person|Review|AggregateRating|FAQPage|Product|Offer|price|rating|review|popularity|creator|seller|sponsor)/i.test(JSON.stringify(jsonLd || {})));
check('recommendation action schema absent', !/(potentialAction|SearchAction|RecommendAction|personaliz)/i.test(JSON.stringify(jsonLd || {}).replace(/personalized recommendation/gi, '')));
check('Legal pages add no unnecessary structured data', [privacy, terms].every((page) => !/application\/ld\+json/.test(page)));

const metadataText = heads.join('\n');
check('superseded prototype title absent', !metadataText.includes('V3 UX Prototype'));
check('old V2/Beta metadata absent', !/(Beta0|21種類|自分だけの本棚|製本|店主まな|AI recommendation|mental health)/i.test(metadataText));
check('no best-match or diagnostic promise', !/(あなたにぴったり|最適な推薦|診断します|心理状態を判定)/.test(metadataText));
check('diagnosis mention is negative boundary only', !/心理状態の診断(?!やパーソナライズ推薦は行いません)/.test(index));
check('no future Product/commerce activation in metadata', !/(Creator Support|Marketplace|Memory Print|スポンサー|決済|購入|広告)/i.test(metadataText));
check('no private or selected-state identity in metadata', !/(experienceId|shelf_id|selected shelf|Interested|savedAt|private title|private body|photo)/i.test(metadataText));
check('no keyword stuffing or keyword meta', !/<meta name="keywords"/i.test(metadataText) && !/(感情の棚[、, ]*){3,}/.test(metadataText));
check('no hidden SEO text added', bodyOf(index) === bodyOf(atBase('v3-prototype/index.html')));

check('existing semantic landmarks retained', /<header\b/.test(index) && /<nav\b/.test(index) &&
  /<main\b/.test(index) && /<footer\b/.test(index));
check('rendered entrance retains visible h1 brand line', app.includes("h('h1', { class: 'display'") &&
  app.includes("text: '感じていることから、'") && app.includes("text: '次に触れるものを見つける。'"));
check('Legal pages retain visible h1 and section h2', [privacy, terms].every((page) =>
  count(page, /<h1>/g) === 1 && count(page, /<h2\b/g) >= 8));

const resourceRefs = pages.flatMap((page) => [
  ...page.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/gi),
  ...page.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)/gi),
  ...page.matchAll(/<(?:img|source)\b[^>]*(?:src|srcset)=["']([^"']+)/gi)
].map((match) => match[1]));
check('all first-paint resources remain same-origin relative', resourceRefs.length > 0 &&
  resourceRefs.every((ref) => !/^https?:\/\//i.test(ref)), resourceRefs.join(','));
check('no preconnect/prefetch/dns-prefetch added', !/rel=["'](?:preconnect|prefetch|dns-prefetch)/i.test(metadataText));
check('no external script/font activation', !/<script\b[^>]+src=["']https?:|fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(metadataText));
check('JSON-LD is non-executable and request-free', !/<script(?! type="application\/ld\+json")[^>]*>[\s\S]*schema\.org/i.test(index) &&
  !/(fetch\(|sendBeacon|XMLHttpRequest)/.test(jsonLdMatches[0] ? jsonLdMatches[0][1] : ''));

const analyticsWindow = {};
vm.runInNewContext(analyticsSource, { window: analyticsWindow, Object, Array }, { filename: 'analytics.js' });
check('GA4 remains fail-closed with no destination', analyticsWindow.V3_ANALYTICS.status() === 'MEASUREMENT_CONFIG_BLOCKED' &&
  analyticsWindow.V3_ANALYTICS.MEASUREMENT_DESTINATION_STATUS === 'UNVERIFIED_QA_DESTINATION');
check('analytics sender/host remains absent', !/\b(?:gtag|dataLayer|fetch|sendBeacon)\b|googletagmanager|google-analytics/i.test(analyticsSource + index));
check('Product-active Editorial records remain 0', /records:\s*Object\.freeze\(\[\]\)/.test(editorialContent));

check('Product JS/CSS/assets byte-identical to Legal base', git(['diff', '--name-only', BASE, '--',
  'v3-prototype/js', 'v3-prototype/css', 'v3-prototype/assets']) === '');
check('Product data/storage/GA4 activation diff 0', git(['diff', '--name-only', BASE, '--',
  'v3-prototype/js/data.js', 'v3-prototype/js/store.js', 'v3-prototype/js/analytics.js',
  'v3-prototype/js/public_editorial_content.js']) === '');
check('V3 entrance body byte-identical', bodyOf(index) === bodyOf(atBase('v3-prototype/index.html')));
check('V3 Privacy body byte-identical', bodyOf(privacy) === bodyOf(atBase('v3-prototype/privacy.html')));
check('V3 Terms body byte-identical', bodyOf(terms) === bodyOf(atBase('v3-prototype/terms.html')));
check('390/430/1440 visual geometry unchanged', css === atBase('v3-prototype/css/v3.css') &&
  [index, privacy, terms].every((page, i) => bodyOf(page) === bodyOf(atBase(`v3-prototype/${['index.html', 'privacy.html', 'terms.html'][i]}`))));
check('existing 44px Legal focus/touch contract retained', css.includes('min-width: 44px;') &&
  css.includes('min-height: 44px;') && css.includes(':focus-visible {'));
check('existing responsive overflow guards retained', css.includes('width: min(100% - 32px, 820px)') &&
  css.includes('@media (max-width: 599px)'));

check('metadata matrix covers all three pages', matrix.includes('V3 entrance') && matrix.includes('V3 Privacy') && matrix.includes('V3 Terms'));
check('old-copy scan records negative-boundary distinction', oldCopy.includes('Intentionally present as a negative boundary'));
check('structured-data evidence records forbidden types', structuredEvidence.includes('`FAQPage`') &&
  structuredEvidence.includes('`Product` / `Offer`') && structuredEvidence.includes('recommendation/personalization'));
check('network evidence records zero drift', networkEvidence.includes('Third-party request count: **0**') &&
  networkEvidence.includes('Analytics outbound hosts: **0**') && networkEvidence.includes('Product content activation: **0**'));

const changed = Array.from(new Set(
  git(['diff', '--name-only', BASE]).split('\n').filter(Boolean)
    .concat(git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean))
)).sort();
const allowed = changed.every((rel) =>
  ['v3-prototype/index.html', 'v3-prototype/privacy.html', 'v3-prototype/terms.html',
    'v3-prototype/verify/seo_aio_release_hardening.js'].includes(rel) ||
  rel.startsWith('v3-prototype/docs/seo-aio/'));
check('bounded SEO/AIO changed-file scope exact', allowed, changed.join(','));
check('dependency delta 0', git(['diff', '--name-only', BASE, '--',
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) === '');
check('root V2/Production/main configuration diff 0', git(['diff', '--name-only', BASE, '--', ':!v3-prototype']) === '');
check('root sitemap/robots/vercel remain byte-identical', ['sitemap.xml', 'vercel.json'].every((rel) => readRoot(rel) === atBase(rel)));

const pass = results.filter((result) => result.pass).length;
const fail = results.length - pass;
console.log(`\nTOTAL ${results.length}  PASS ${pass}  FAIL ${fail}`);
if (fail) process.exit(1);
