/* =============================================================================
 * V2 Beta0 — Round 2.1 / Protected Contracts 差分監査（静的）
 * -----------------------------------------------------------------------------
 * base（canonical HEAD）と作業ツリーを比べ、触ってはいけない契約に差分が出ていないかを
 * ソース上で確認する。実行時の挙動は tests/qa_r21_network_audit.js 側で確認する。
 *
 * 使い方: node tests/qa_r21_protected_contracts.js [baseRef]
 * ========================================================================== */
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.argv[2] || 'bc0d435a2bb1c59485196186970c07a88887ee13';

function show(ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
  } catch (e) { return ''; }
}
function read(file) {
  return require('fs').readFileSync(path.join(ROOT, file), 'utf8');
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '\n         → ' + detail));
}

/* 抽出器：順不同の集合として比べる（並び替えだけの差分は無視しない＝集合が同じかを見る） */
const EXTRACT = {
  'storage キー（文字列リテラル）': s =>
    (s.match(/'emotion-bookstore[^']*'/g) || []).concat(s.match(/"emotion-bookstore[^"]*"/g) || []),
  'storage キー定数の宣言': s =>
    (s.match(/const\s+[A-Z0-9_]*(?:KEY|KEYS)\s*=\s*['"][^'"]+['"]/g) || []),
  'IndexedDB / localStorage の直接呼び出し': s =>
    (s.match(/indexedDB\.\w+|localStorage\.\w+|idbGet|idbSet|idbDel|lsGet|lsSet/g) || []),
  'book / draft schema のフィールド': s => {
    const m = s.match(/const entry = \{[\s\S]*?\n\s{10}\};/);
    return m ? m[0].split('\n').map(x => x.trim()).filter(Boolean) : [];
  },
  'GA4 イベント名': s =>
    (s.match(/trackAnalyticsEvent\(\s*['"][a-z0-9_]+['"]/g) || []),
  'GA4 許可リスト / measurement id': s =>
    (s.match(/G-[A-Z0-9]{6,}|ALLOWED_ANALYTICS[A-Z_]*|send_page_view/g) || []),
  'ネットワーク宛先': s =>
    (s.match(/https?:\/\/[a-z0-9.\-]+\.[a-z]{2,}/gi) || []),
  'fetch / XHR / sendBeacon の呼び出し': s =>
    (s.match(/\bfetch\(|\bnew XMLHttpRequest\b|sendBeacon\(/g) || []),
  'backup / export / restore の形式': s =>
    (s.match(/BACKUP_[A-Z_]*|payload\.stores|schemaVersion|version:\s*\d+/g) || []),
  '写真契約（圧縮・保存）': s =>
    (s.match(/attachedPhoto|photoPreviewImg|MAX_PHOTO[A-Z_]*|800/g) || []),
  'bookification / 棚割り当て': s =>
    (s.match(/function (bind|runBinding|localCurate|assignShelf|skipShelf)\b|libraryCache\.push|unfiled/g) || [])
};

const FILES = ['main.js', 'index.html', 'v2-mount.js',
  'visual-refit-v2-prototype/adapter/bookshelf-adapter.js',
  'visual-refit-v2-prototype/adapter/form-adapter.js',
  'visual-refit-v2-prototype/adapter/emotion-shelf-adapter.js',
  'visual-refit-v2-prototype/adapter/navigation-adapter.js'];

console.log(`base = ${BASE}\n`);
for (const [label, fn] of Object.entries(EXTRACT)) {
  const before = [], after = [];
  for (const f of FILES) {
    before.push(...fn(show(BASE, f)));
    after.push(...fn(read(f)));
  }
  const cnt = arr => arr.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
  const b = cnt(before), a = cnt(after);
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const diff = [...keys].filter(k => (b[k] || 0) !== (a[k] || 0))
    .map(k => `${(a[k] || 0) > (b[k] || 0) ? '+' : '-'} ${k}  (${b[k] || 0} → ${a[k] || 0})`);
  check(label + ' に差分がない', diff.length === 0, diff.slice(0, 12).join('\n         → '));
}

/* 変更したファイルの一覧も出す（想定外のファイルに触れていないか） */
const changed = execFileSync('git', ['diff', '--name-only', BASE], { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
console.log('\n=== base からの変更ファイル ===');
changed.forEach(f => console.log('  ' + f));

const fail = results.filter(r => !r.ok);
console.log(`\ntotal=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
process.exit(fail.length ? 1 : 0);
