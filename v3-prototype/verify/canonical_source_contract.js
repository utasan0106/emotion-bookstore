/* =============================================================================
 * V3 M01/W01 + M02/W02 — source / manifest / hash contract (Playwright不要)
 * 実行: node verify/canonical_source_contract.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const CANONICAL = path.resolve(REPO, '..', '99_v3_canonical_clean_v1', '99_v3_canonical_clean_v1');
const M02_HANDOFF = path.resolve(REPO, 'outputs', 'V3_M02_W02_CANONICAL_REBUILD_2026-08-21', 'handoff');
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
function file(rel) { return path.join(ROOT, rel); }
function read(rel) { return fs.readFileSync(file(rel), 'utf8'); }
function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function pngSize(p) {
  const b = fs.readFileSync(p);
  if (b.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}
function fontNames(p) {
  const b = fs.readFileSync(p);
  const numTables = b.readUInt16BE(4);
  let nameOffset = 0;
  for (let i = 0; i < numTables; i++) {
    const off = 12 + i * 16;
    if (b.toString('ascii', off, off + 4) === 'name') nameOffset = b.readUInt32BE(off + 8);
  }
  if (!nameOffset) return [];
  const count = b.readUInt16BE(nameOffset + 2);
  const strings = nameOffset + b.readUInt16BE(nameOffset + 4);
  const names = [];
  for (let i = 0; i < count; i++) {
    const off = nameOffset + 6 + i * 12;
    const platform = b.readUInt16BE(off);
    const nameID = b.readUInt16BE(off + 6);
    const length = b.readUInt16BE(off + 8);
    const stringOffset = b.readUInt16BE(off + 10);
    if (![1, 2, 16, 17].includes(nameID)) continue;
    const raw = b.subarray(strings + stringOffset, strings + stringOffset + length);
    let value;
    if (platform === 0 || platform === 3) {
      const swapped = Buffer.alloc(raw.length);
      for (let j = 0; j + 1 < raw.length; j += 2) { swapped[j] = raw[j + 1]; swapped[j + 1] = raw[j]; }
      value = swapped.toString('utf16le');
    } else value = raw.toString('latin1');
    names.push(value.replace(/\0/g, ''));
  }
  return [...new Set(names)];
}
function git(...args) { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim(); }
function contrast(a, b) {
  const luminance = (hex) => {
    const rgb = hex.match(/[0-9a-f]{2}/ig).map((x) => parseInt(x, 16) / 255)
      .map((x) => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const app = read('js/app.js');
const dataSource = read('js/data.js');
const css = read('css/v3.css');
const html = read('index.html');
const fontManifest = JSON.parse(read('assets/fonts/FONT_MANIFEST.json'));
const assetManifest = JSON.parse(read('assets/canonical-m01-w01/ASSET_MANIFEST.json'));
const m02AssetManifest = JSON.parse(read('assets/canonical-m02-w02/ASSET_MANIFEST.json'));

check('branch = codex/v3-99-canonical-rebuild', git('branch', '--show-current') === 'codex/v3-99-canonical-rebuild');
check('HEAD = origin/main audited SHA', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('origin/main = audited SHA', git('rev-parse', 'refs/remotes/origin/main') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('tracked files remain clean', git('diff', '--name-only') === '');

const unchanged = {
  'README.md': '49b1b8ddfe3480874518bf9d98452ef6fa6387f355c6ac1f530b2f30dfc8253c',
  'index.html': 'a093a0d3e9089dd97ecc126923bfad9688dc8dc1b3eb37bd2a02b07888831dcf',
  'js/store.js': '651a15cc540c220e2afa9f3bcb8d89433feb03f4cbbe0cb9e80b325427c17bda',
  'js/personalize.js': '1125d767bac6aed317e2bdc8ba69311fda71d0a8450a264e48c536c9717bb65a'
};
for (const [rel, expected] of Object.entries(unchanged)) {
  const s1aApprovedIndexHash = '63ee5078027d376948509affc51d3a04cfe6564d81fb15f9ee31f48a839e2381';
  check(`protected or explicitly approved hash: ${rel}`,
    sha(file(rel)) === expected || (rel === 'index.html' && sha(file(rel)) === s1aApprovedIndexHash),
    sha(file(rel)));
}
check('package.json dependency addition 0', !fs.existsSync(file('package.json')) && !fs.existsSync(file('package-lock.json')));

new vm.Script(app, { filename: 'app.js' });
new vm.Script(dataSource, { filename: 'data.js' });
new vm.Script(read('js/store.js'), { filename: 'store.js' });
new vm.Script(read('js/personalize.js'), { filename: 'personalize.js' });
check('JS parse: app/data/store/personalize', true);

check('Font Manifest external request expectation = 0', fontManifest.runtime_external_font_requests_expected === 0);
check('Font Manifest includes 4 faces only', fontManifest.fonts.length === 4, String(fontManifest.fonts.length));
check('Font Manifest weights = 400/500 only',
  [...new Set(fontManifest.fonts.map((x) => x.weight))].sort().join(',') === '400,500');
check('Font Manifest families exact',
  [...new Set(fontManifest.fonts.map((x) => x.family))].sort().join('|') === 'Noto Sans JP|Noto Serif JP');
check('Font source is official Google Fonts only',
  fontManifest.fonts.every((x) => x.official_source_url.startsWith('https://fonts.google.com/download?')));
check('Font files marked unmodified', fontManifest.fonts.every((x) => x.unmodified === true));
check('Font CSS unicode-range decision recorded',
  fontManifest.fonts.every((x) => x.unicode_range.includes('full official static font')));

for (const face of fontManifest.fonts) {
  const p = file(face.local_path.replace(/^assets\//, 'assets/'));
  const magic = fs.readFileSync(p).subarray(0, 4).toString('hex');
  check(`font exists/hash/bytes: ${path.basename(p)}`,
    fs.existsSync(p) && sha(p) === face.sha256 && fs.statSync(p).size === face.bytes,
    `${fs.statSync(p).size} ${sha(p)}`);
  check(`font sfnt signature: ${path.basename(p)}`, magic === '00010000' || magic === '4f54544f', magic);
  const names = fontNames(p);
  check(`font internal family/style names: ${path.basename(p)}`,
    names.includes(face.family) && names.some((x) => x === (face.weight === 400 ? 'Regular' : 'Medium')),
    names.join(' | '));
}
check('shared OFL.txt exists', fs.existsSync(file('assets/fonts/OFL.txt')) && read('assets/fonts/OFL.txt').includes('SIL OPEN FONT LICENSE Version 1.1'));
check('per-family OFL files exist',
  fs.existsSync(file('assets/fonts/noto-sans-jp/OFL.txt')) && fs.existsSync(file('assets/fonts/noto-serif-jp/OFL.txt')));
check('@font-face count = 4', (css.match(/@font-face\s*\{/g) || []).length === 4);
for (const face of fontManifest.fonts) {
  const cssRel = '../' + face.local_path.replace(/^assets\//, 'assets/');
  check(`CSS local face path: ${path.basename(face.local_path)}`, css.includes(`url("${cssRel}")`));
}
check('runtime external Font CDN reference 0', !/fonts\.(googleapis|gstatic)\.com/i.test(css + html + app));
check('CSS @import 0', !/@import\b/i.test(css));
check('font Base64 embedding 0', !/data:font\//i.test(css));
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
check('CSS brace balance',
  (cssNoComments.match(/\{/g) || []).length === (cssNoComments.match(/\}/g) || []).length,
  `${(cssNoComments.match(/\{/g) || []).length}/${(cssNoComments.match(/\}/g) || []).length}`);
const localCssUrls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]).filter((x) => !x.startsWith('data:'));
check('all local CSS url() targets exist',
  localCssUrls.every((rel) => fs.existsSync(path.resolve(ROOT, 'css', rel))), localCssUrls.join(', '));

check('Asset authority = 99_v3 only', assetManifest.authority === '99_v3_canonical_clean_v1.zip only');
check('Asset count = 17', assetManifest.assets.length === 17, String(assetManifest.assets.length));
check('Asset production rights are unapproved', assetManifest.assets.every((x) => x.production_rights_approved === false));
check('Asset transforms are pixel-crop only', assetManifest.assets.every((x) => x.transformation.startsWith('pixel crop only')));
for (const asset of assetManifest.assets) {
  const p = file(asset.local_path.replace(/^assets\//, 'assets/'));
  const size = pngSize(p);
  check(`asset exists/hash/dim: ${path.basename(p)}`,
    fs.existsSync(p) && sha(p) === asset.sha256 && fs.statSync(p).size === asset.bytes &&
    size && size.width === asset.output_width && size.height === asset.output_height,
    size ? `${size.width}x${size.height} ${sha(p)}` : 'not PNG');
}
check('M01 canonical source hash exact',
  assetManifest.source_files.M01.sha256 === sha(path.join(CANONICAL, 'canonical/mobile/M01_Entrance.png')));
check('W01 canonical source hash exact',
  assetManifest.source_files.W01.sha256 === sha(path.join(CANONICAL, 'canonical/web/W01_Entrance.png')));

/* --------------------------------------------------------- M02/W02 assets */
check('M02/W02 Asset authority = 99_v3 canonical',
  m02AssetManifest.authority === '99_v3_canonical_clean_v1');
check('M02/W02 production rights remain unreviewed prototype-only',
  m02AssetManifest.production_rights_status === 'UNREVIEWED_PROTOTYPE_ONLY');
check('M02/W02 Asset count = 10', m02AssetManifest.assets.length === 10, String(m02AssetManifest.assets.length));
check('M02/W02 crop rules prohibit generation/redraw/recolor/full screenshot/text crop',
  ['pixel crops only', 'no AI generation', 'no redraw', 'no recolor',
   'no full canonical screenshot background', 'no text-baked crop']
    .every((rule) => m02AssetManifest.rules.includes(rule)));

for (const [sourceName, source] of Object.entries(m02AssetManifest.sources)) {
  const p = path.join(M02_HANDOFF, 'canonical', sourceName);
  const size = pngSize(p);
  check(`M02/W02 canonical source exists/hash/dim: ${sourceName}`,
    fs.existsSync(p) && sha(p) === source.sha256 && size &&
    size.width === source.width && size.height === source.height,
    size ? `${size.width}x${size.height} ${sha(p)}` : 'missing/not PNG');
}
check('M02 canonical exact identity',
  m02AssetManifest.sources['M02_Emotion.png'].sha256 ===
    '212f68d5551262d84f4cac996331daa5af2029ee47ce478d58ba644e5e26bbf0');
check('W02 canonical exact identity',
  m02AssetManifest.sources['W02_Emotion.png'].sha256 ===
    '8b78c91e9d7a87b9add491dcdec9114324f4737bf343451dad88650675558389');

for (const asset of m02AssetManifest.assets) {
  const rel = asset.file.replace(/^assets\//, 'assets/');
  const p = file(rel);
  const size = pngSize(p);
  const sourceName = path.basename(asset.source);
  const source = m02AssetManifest.sources[sourceName];
  const [x, y, width, height] = asset.crop_xywh;
  const inBounds = x >= 0 && y >= 0 && width > 0 && height > 0 &&
    x + width <= source.width && y + height <= source.height;
  check(`M02/W02 asset exists/hash/dim/crop bounds: ${path.basename(p)}`,
    fs.existsSync(p) && sha(p) === asset.output_sha256 && size &&
    size.width === asset.output_width && size.height === asset.output_height &&
    width === asset.output_width && height === asset.output_height && inBounds,
    size ? `${size.width}x${size.height} ${sha(p)} bounds=${inBounds}` : 'missing/not PNG');
}

/* ----------------------------------------------------------- M02/W02 data */
const dataContext = { window: {} };
vm.runInNewContext(dataSource, dataContext, { filename: 'data.js' });
const emotions = dataContext.window.V3_DATA.EMOTIONS;
const expectedEmotions = [
  ['hajimu', '心が弾む', 'わくわくする、軽やか、嬉しいような気持ち', 'emotion_hajimu.png'],
  ['atatamaru', '心があたたまる', 'ほっとする、やさしい、つながりを感じる', 'emotion_atatamaru.png'],
  ['hikareru', '惹かれる', '惹きつけられる、気になる、もっと知りたい', 'emotion_hikareru.png'],
  ['shizumu', '沈む', '落ち込む、寂しい、気持ちが重い', 'emotion_shizumu.png'],
  ['zawatsuku', 'ざわつく', '落ち着かない、心配、なんとなく気になる', 'emotion_zawatsuku.png'],
  ['butsukaru', 'ぶつかる', 'イライラする、反発する、納得できない', 'emotion_butsukaru.png'],
  ['miwohiku', '身を引く', 'こわい、避けたい、距離を置きたい', 'emotion_miwohiku.png'],
  ['mada', 'まだ名前がない', 'どの言葉もしっくりこない、うまく言えない', 'emotion_mada.png']
];
check('M02/W02 exact 8 emotion records', emotions.length === 8, String(emotions.length));
check('M02/W02 exact label order',
  emotions.map((x) => x.label).join('|') === expectedEmotions.map((x) => x[1]).join('|'),
  emotions.map((x) => x.label).join('|'));
check('M02/W02 exact ids/descriptions/assets',
  emotions.every((x, i) => [x.id, x.label, x.description, x.asset].join('|') === expectedEmotions[i].join('|')));

for (const copy of [
  '感情を選ぶ', '1 / 3', 'いま、', 'どの言葉の近くにいますか？',
  'STEP 1', 'いまの気持ちに、', 'いちばん近い言葉を選ぶ',
  '正解はありません。',
  'いまのあなたに、いちばんしっくりくる言葉をひとつ選んでください。',
  'あとから選び直すこともできます。',
  'どの言葉もしっくりこないときは、「まだ名前がない」を選んでも大丈夫です。',
  '選んだ言葉は、あなただけの手がかりとして使われます。',
  '他の人に見られることはありません。'
]) check(`exact M02/W02 copy: ${copy}`, app.includes(copy));

check('M02/W02 cards are semantic buttons with accessible state/name',
  app.includes("class: 'emotion-card', type: 'button'") &&
  app.includes("'aria-label': word.label + '。' + word.description") &&
  app.includes("'aria-pressed': state.emotion === word.id ? 'true' : 'false'"));
check('M02/W02 one-select/reselect contract encoded',
  app.includes("document.querySelectorAll('.emotion-card').forEach") &&
  app.includes("node.setAttribute('aria-pressed', node === button ? 'true' : 'false')"));
check('M02/W02 no automatic/default selection encoded',
  !/aria-pressed['"]?\s*:\s*['"]true['"]/.test(app) &&
  !app.includes("class: 'emotion-card is-selected'"));
check('M02/W02 selection preserves state/persist/Understanding route',
  app.includes('state.emotion = word.id;') && app.includes('state.deck = null;') &&
  app.includes('persist();') && app.includes("go('understanding');"));
check('M02/W02 まだ名前がない parity / old undecided control removed',
  emotions[7].id === 'mada' && !app.includes('word-undecided') && !app.includes('まだ選べない'));
check('M02/W02 canonical local assets only / full screenshots not used at runtime',
  app.includes('./assets/canonical-m02-w02/') && !/M02_Emotion\.png|W02_Emotion\.png/.test(app));
check('M02/W02 W02 hero and guidance assets encoded',
  app.includes('./assets/canonical-m02-w02/w02_hero.png') &&
  app.includes('./assets/canonical-m02-w02/guidance_leaf.png'));
check('M02/W02 responsive 2-column / 4-column contracts encoded',
  css.includes('grid-template-columns: repeat(2, minmax(0, 1fr));') &&
  css.includes('grid-template-columns: repeat(4, minmax(0, 1fr));') &&
  css.includes('@media (min-width: 700px) and (max-width: 1199px)'));
check('W02 desktop intro/card/footer geometry encoded',
  css.includes('grid-template-columns: 50.78% 49.22%;') &&
  css.includes('grid-template-columns: 150px minmax(0, 1fr);') &&
  css.includes('grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.15fr);'));
check('M02/W02 Trust review marker exact',
  app.includes('PRODUCTION_COPY_REVIEW_REQUIRED') && css.includes('PRODUCTION_COPY_REVIEW_REQUIRED'));

for (const copy of [
  '感じていることから、', '次に触れるものを見つける。', 'はじめる', '感情の言葉を選ぶ',
  '外へ出る', '実際に触れてみる', '感情に近い3つの候補から、', '気になるものを見つける',
  '読む・観る・聴く・訪れる。', '外の世界とつながる', '心に残ったものを選んで、',
  '自分だけの記録にする', '登録不要・入力内容はこの端末を基本に扱います',
  '登録不要・完全に非公開', 'あなたの記録はあなただけのものです。',
  'AIは使用しません', '本文をAIが読むことはありません。', '記録はまずこの端末へ',
  '大切な記録は、あなたの端末に保存されます。'
]) check(`exact canonical copy: ${copy}`, app.includes(copy));

check('PRODUCTION_COPY_REVIEW_REQUIRED marker exists', (app + css).includes('PRODUCTION_COPY_REVIEW_REQUIRED'));
check('old cautious Trust copy removed',
  !app.includes('本文を外部AIへ送信しません') && !app.includes('選んだ言葉や記録を公開する機能はありません'));
check('M01/W01 app uses canonical asset directory only',
  !/assets\/reference\/(m01|w01)/.test(app) && app.includes('assets/canonical-m01-w01/'));
check('W01 header uses canonical horizontal lockup',
  html.includes('./assets/canonical-m01-w01/w01_horizontal_lockup.png'));
check('W01 old top-right dark CTA removed', !html.includes('id="headerCta"'));
check('W01 Hero primary CTA source unchanged',
  app.includes("class: 'btn btn-primary cta-primary'") &&
  app.includes("class: 'cta-main', text: 'はじめる'") &&
  app.includes("class: 'cta-sub', text: '感情の言葉を選ぶ'"));
const entranceSource = (app.match(/function surfaceEntrance\(\)[\s\S]*?function loopSection\(\)/) || [''])[0];
check('W01 closed source has one Hero primary start CTA',
  (entranceSource.match(/class: 'btn btn-primary cta-primary'/g) || []).length === 1);
check('W01 MENU trigger semantic contract',
  /<button id="headerMenuTrigger" class="header-menu-trigger" type="button"\s+aria-expanded="false" aria-controls="headerNavPanel" aria-haspopup="true">MENU<\/button>/.test(html));
check('W01 MENU panel is a hidden nav landmark with list semantics',
  /<nav id="headerNavPanel" class="site-nav header-nav-panel"\s+aria-label="サイト内ナビゲーション" hidden>/.test(html) &&
  html.includes('<ul>') && !/role="menu(item)?"/.test(html));
const headerItems = [...html.matchAll(/class="site-nav-link"[^>]*>([^<]+)</g)].map((m) => m[1]);
check('W01 MENU exact item order',
  headerItems.join('|') === 'はじめる|体験の流れ|感情の言葉|よくある質問', headerItems.join('|'));
check('W01 MENU exact existing destinations retained',
  /data-nav="start">はじめる/.test(html) &&
  /href="#core-loop" data-nav="scroll">体験の流れ/.test(html) &&
  /data-nav="start">感情の言葉/.test(html) &&
  /href="#trust" data-nav="scroll">よくある質問/.test(html));
check('W01 MENU keyboard/focus/dismiss contract encoded',
  app.includes("firstItem.focus();") && app.includes("event.key === 'Escape'") &&
  app.includes("!panel.contains(event.target) && event.target !== trigger") &&
  app.includes("closeHeaderMenu(true)"));
check('W01 MENU trigger re-click toggle encoded',
  app.includes("trigger.getAttribute('aria-expanded') === 'true') closeHeaderMenu(true)") &&
  app.includes('else openHeaderMenu();'));
check('W01 MENU selection closes before existing actions',
  (app.match(/closeHeaderMenu\(false\);/g) || []).length >= 4 &&
  app.includes("go('emotion');") && app.includes('scrollToId(node.getAttribute(\'href\').slice(1));'));
check('W01 MENU hidden state and desktop breakpoint encoded',
  css.includes('.header-nav-panel[hidden] { display: none; }') &&
  css.includes('.header-nav-panel:not([hidden])') && app.includes('global.innerWidth < 1200'));
check('W01 MENU is finite/no overlay/no heavy shadow',
  css.includes('width: 292px;') && !css.includes('.header-nav-panel { width: 100vw') &&
  !css.includes('.header-nav-panel { height: 100vh') && !/\.header-nav-panel[\s\S]{0,700}box-shadow/.test(css));
check('M01 header and MENU remain hidden below desktop breakpoint',
  css.includes('.header-menu-trigger,\n.header-nav-panel { display: none; }') &&
  css.includes('@media (min-width: 1200px)'));
check('W01 Header height and locale copy retained',
  css.includes('height: 106px;') && html.includes('表示言語：日本語。言語切替は未提供です'));
check('connector DOM count contract encoded', app.includes("class: 'loop-connector'") && app.includes("text: '•••'"));
check('Trust structure encoded as distinct icon + heading + support',
  app.includes("class: 'trust-icon'") && app.includes("class: 'trust-heading'") && app.includes("class: 'trust-support'"));
check('M01 horizontal 4-column contract', /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/.test(css));
check('W01 header/hero/loop/trust native geometry contracts encoded',
  css.includes('height: 106px;') && css.includes('height: 528px;') && css.includes('height: 276px;') && css.includes('height: 99px;'));
check('M01 full viewport shell contract', css.includes('width: 100vw;') && css.includes('margin-left: calc(50% - 50vw);'));
check('No analytics/fetch/XHR invocation added to M01/W01 app',
  !/\bfetch\s*\(|new\s+XMLHttpRequest|sendBeacon\s*\(|\bgtag\s*\(/.test(app));
check('CTA contrast >= 4.5:1', contrast('0d2339', 'fffdf9') >= 4.5, contrast('0d2339', 'fffdf9').toFixed(2));
check('body text contrast >= 4.5:1', contrast('203044', 'faf6ef') >= 4.5, contrast('203044', 'faf6ef').toFixed(2));
check('focus-visible outline retained', css.includes(':focus-visible') && css.includes('outline: 2px solid var(--navy)'));

const shots = read('verify/screenshots.js');
for (const target of ['W01_1536x1024', 'M01_941x1672', 'M01_390x844', 'M01_430x932', 'M01_tablet_768x1024', 'W01_sanity_1536x960']) {
  check(`screenshot target prepared: ${target}`, shots.includes(target));
}
for (const target of [
  'M02_1024x1536_unselected', 'M02_1024x1536_selected', 'M02_390x844',
  'M02_430x932', 'M02_768x1024', 'W02_1536x1024_closed',
  'W02_1536x1024_open', 'W02_1536x1024_selected', 'W02_1536x960_sanity'
]) check(`M02/W02 screenshot target prepared: ${target}`, shots.includes(target));
check('screenshot evidence includes computed styles', shots.includes('computed_styles.json'));
check('screenshot evidence includes font request log', shots.includes('font_request_log.json'));
check('M02/W02 screenshot evidence includes console and comparison targets',
  shots.includes('console_errors.json') && shots.includes('comparison_targets.json'));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
