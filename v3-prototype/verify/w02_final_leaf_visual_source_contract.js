/* W02 Final Leaf Visual Fix — dependency-free source/protected contract */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const cp = require('child_process');

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..');
const OUTPUT = path.join(REPO, 'outputs/V3_W02_FINAL_LEAF_VISUAL_FIX_2026-08-22');
const PRE_RESTORE = path.join(REPO, 'work/w02-final-leaf-prechange-restore');
const PRE_MANIFEST = path.join(OUTPUT, 'snapshot/PRECHANGE_SOURCE_MANIFEST.json');
const NEW_VERIFIER = 'v3-prototype/verify/w02_final_leaf_visual_source_contract.js';
const FINAL_CSS_SHA256 = 'bca791356856621332717c2aed0b672b35425be3a92f2d2503b12009a63e71ad';
const LEAF_SHA256 = '6f65ea91c38ab38af784ea0f46b53cf80c4df83086db82b1b05e99b4c98aaa57';
const MARKER = '/* =============================================================================\n * W02 Final Leaf Visual Fix — 2026-08-22';
const results = [];

function check(name, pass, detail = '') {
  const item = { name, pass: Boolean(pass), detail: String(detail || '') };
  results.push(item);
  console.log(`${item.pass ? 'PASS' : 'FAIL'} ${name}${item.detail ? ` — ${item.detail}` : ''}`);
}
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function git(...args) { return cp.execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim(); }
function listFiles(root, base = root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(abs, base));
    else if (entry.isFile()) out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out.sort();
}

const pre = JSON.parse(fs.readFileSync(PRE_MANIFEST, 'utf8'));
const preByPath = new Map(pre.files.map((item) => [item.path, item]));
const preCss = fs.readFileSync(path.join(PRE_RESTORE, 'v3-prototype/css/v3.css'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'css/v3.css'), 'utf8');
const app = fs.readFileSync(path.join(SRC, 'js/app.js'), 'utf8');
const data = fs.readFileSync(path.join(SRC, 'js/data.js'), 'utf8');
const markerAt = css.indexOf(MARKER);
const suffix = markerAt >= 0 ? css.slice(markerAt) : '';

check('branch exact', git('branch', '--show-current') === 'codex/v3-99-canonical-rebuild');
check('HEAD exact', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('origin/main exact', git('rev-parse', 'origin/main') === '910dbac29e70143fe50bc6e192eaaafa40729174');
check('prechange manifest exact count', pre.file_count === 93 && pre.files.length === 93);
check('final CSS exact SHA-256', sha(path.join(SRC, 'css/v3.css')) === FINAL_CSS_SHA256);
check('marker occurs once', markerAt >= 0 && css.indexOf(MARKER, markerAt + 1) === -1);
check('prechange CSS exact prefix', markerAt === preCss.length + 1 && css.slice(0, markerAt) === `${preCss}\n`);

const missing = [];
const changed = [];
for (const item of pre.files) {
  const file = path.join(REPO, item.path);
  if (!fs.existsSync(file)) missing.push(item.path);
  else if (sha(file) !== item.sha256) changed.push(item.path);
}
check('all prechange files present', missing.length === 0, missing.join(', '));
check('only pre-existing CSS changed', JSON.stringify(changed) === JSON.stringify(['v3-prototype/css/v3.css']), changed.join(', '));
const currentV3 = listFiles(SRC).map((rel) => `v3-prototype/${rel}`);
const preV3 = pre.files.filter((item) => item.path.startsWith('v3-prototype/')).map((item) => item.path);
const additions = currentV3.filter((item) => !preV3.includes(item));
check('only dedicated verifier added', JSON.stringify(additions) === JSON.stringify([NEW_VERIFIER]), additions.join(', '));

const exactSuffix = `/* =============================================================================
 * W02 Final Leaf Visual Fix — 2026-08-22
 * Neutralize the blend that exposes the authoritative RGB asset's paper box.
 * ========================================================================== */

@media (min-width: 1200px) {
  .emotion-guidance-leaf {
    opacity: 1;
    mix-blend-mode: normal;
  }
}
`;
check('residual CSS suffix exact', suffix === exactSuffix);
check('only leaf selector occurs in suffix', (suffix.match(/\.[a-z][a-z0-9-]*\s*\{/g) || []).join('|') === '.emotion-guidance-leaf {');
const declarations = [...suffix.matchAll(/^\s+([a-z-]+)\s*:/gm)].map((match) => match[1]);
check('only opacity/blend declarations added', JSON.stringify(declarations) === JSON.stringify(['opacity', 'mix-blend-mode']));
check('desktop-only scope', suffix.includes('@media (min-width: 1200px)') && !suffix.includes('max-width'));

for (const rel of ['index.html', 'js/app.js', 'js/data.js', 'js/store.js', 'js/personalize.js']) {
  check(`${rel} byte-identical`, sha(path.join(SRC, rel)) === preByPath.get(`v3-prototype/${rel}`).sha256);
}
for (const family of ['assets/canonical-m01-w01/', 'assets/canonical-m02-w02/', 'assets/canonical-m03-w03/', 'assets/fonts/']) {
  const items = pre.files.filter((item) => item.path.startsWith(`v3-prototype/${family}`));
  check(`${family} protected`, items.every((item) => sha(path.join(REPO, item.path)) === item.sha256), `${items.length} files`);
}

const leaf = path.join(SRC, 'assets/canonical-m02-w02/guidance_leaf.png');
const png = fs.readFileSync(leaf);
check('leaf asset exact SHA-256', sha(leaf) === LEAF_SHA256 && sha(leaf) === preByPath.get('v3-prototype/assets/canonical-m02-w02/guidance_leaf.png').sha256);
check('leaf asset dimensions exact 70x72', png.readUInt32BE(16) === 70 && png.readUInt32BE(20) === 72);
check('leaf asset RGB/no alpha', png[25] === 2, `PNG color type ${png[25]}`);
check('prior 54px position/size rule retained', preCss.includes('.emotion-guidance-leaf { width: 54px; }') && css.includes('.emotion-guidance-leaf { width: 54px; }'));
check('prior guidance geometry retained', ['min-height: 84px;', 'gap: 22px;', 'padding: 12px 30px;', 'background: transparent;'].every((token) => preCss.includes(token) && css.includes(token)));
check('prior card/phrase/selection source retained', app.includes('descriptionPhraseLines(word.description)') && app.includes("onclick: function (event) { chooseEmotion(word, event); }") && css.includes('.emotion-description-phrase {'));
check('W02 hero source retained', app.includes("src: './assets/canonical-m02-w02/w02_hero.png'"));

new vm.Script(app, { filename: 'app.js' });
new vm.Script(data, { filename: 'data.js' });
check('app/data syntax', true);
const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
check('CSS brace balance', (cleanCss.match(/\{/g) || []).length === (cleanCss.match(/\}/g) || []).length);
check('package/lockfiles absent', !['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].some((name) => fs.existsSync(path.join(SRC, name))));
check('suffix has no URL/generated copy', !/url\s*\(|(^|[;{])\s*content\s*:/im.test(suffix));
check('no commit created', git('rev-parse', 'HEAD') === '910dbac29e70143fe50bc6e192eaaafa40729174');

const passed = results.filter((item) => item.pass).length;
const failed = results.length - passed;
console.log(`\nW02_FINAL_LEAF_VISUAL_SOURCE_CONTRACT: ${passed} PASS / ${failed} FAIL`);
if (failed) process.exit(1);
