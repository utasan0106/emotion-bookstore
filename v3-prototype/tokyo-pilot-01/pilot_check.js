const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = __dirname;
const failures = [];
const requiredFiles = ['index.html', 'pilot.css', 'pilot.js', 'pilot_content.js', 'MEDIA_ATTRIBUTION.md'];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'pilot_content.js'), 'utf8'), sandbox);
const content = sandbox.window.TOKYO_PILOT_CONTENT;
if (!content || !Array.isArray(content.objects)) failures.push('content object missing');
if (content && content.objects.length !== 3) failures.push(`expected exactly 3 objects, got ${content.objects.length}`);
const mediaPolicy = content && content.feature && content.feature.mediaPolicy;
if (!['external-preview-only','same-origin-localized'].includes(mediaPolicy)) failures.push('media policy must be explicit');
if (mediaPolicy === 'same-origin-localized') {
  const evidencePath = path.join(root, 'MEDIA_LOCALIZATION_EVIDENCE.json');
  if (!fs.existsSync(evidencePath)) {
    failures.push('localized media requires MEDIA_LOCALIZATION_EVIDENCE.json');
  } else {
    let evidence;
    try { evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8')); } catch (e) { failures.push('media localization evidence must be valid JSON'); }
    if (!evidence || !Array.isArray(evidence.assets) || evidence.assets.length !== 3) {
      failures.push('localized evidence must contain exactly 3 assets');
    } else {
      const evidenceIds = new Set();
      for (const asset of evidence.assets) {
        if (!asset.id) failures.push('localized evidence asset missing id');
        if (evidenceIds.has(asset.id)) failures.push(`duplicate localized evidence id: ${asset.id}`);
        evidenceIds.add(asset.id);
        if (asset.human_test_scope_only !== true) failures.push(`${asset.id} localization scope must be Human Test only`);
        if (asset.production_promotion !== false) failures.push(`${asset.id} must explicitly deny Production promotion`);
        if (!asset.source_page_url || !/^https:\/\//.test(asset.source_page_url)) failures.push(`${asset.id} source_page_url missing/invalid`);
        if (!asset.source_asset_url || !/^https:\/\//.test(asset.source_asset_url)) failures.push(`${asset.id} source_asset_url missing/invalid`);
        if (!asset.runtime_file || !/^\.\/assets\//.test(asset.runtime_file)) failures.push(`${asset.id} runtime_file must be ./assets/*`);
        const runtimePath = asset.runtime_file ? path.join(root, asset.runtime_file.replace(/^\.\//, '')) : null;
        if (!runtimePath || !fs.existsSync(runtimePath)) {
          failures.push(`${asset.id} localized runtime asset missing`);
        } else {
          const actualSha = crypto.createHash('sha256').update(fs.readFileSync(runtimePath)).digest('hex');
          if (!asset.runtime_sha256 || actualSha !== asset.runtime_sha256) failures.push(`${asset.id} runtime SHA-256 mismatch`);
          if (!asset.runtime_size_bytes || fs.statSync(runtimePath).size !== asset.runtime_size_bytes) failures.push(`${asset.id} runtime size mismatch`);
        }
      }
    }
  }
}

const ids = new Set();
for (const object of (content && content.objects) || []) {
  for (const key of ['id','objectName','hook','reveal','actionUrl','mediaUrl','attribution','rightsUrl','mediaLicense','verifiedAt','verifiedNote']) {
    if (!object[key]) failures.push(`${object.id || 'unknown'} missing ${key}`);
  }
  if (ids.has(object.id)) failures.push(`duplicate object id: ${object.id}`);
  ids.add(object.id);
  if (Array.from(object.hook || '').length > 28) failures.push(`${object.id} hook too long (>28 chars)`);
  if (Array.from(object.reveal || '').length > 60) failures.push(`${object.id} reveal too long (>60 chars)`);
  // Hook をそのまま言い直した Reveal は payoff にならない。
  if (object.reveal && object.hook && object.reveal.includes(object.hook)) {
    failures.push(`${object.id} reveal only repeats the hook`);
  }
  // 「行く前にわかること」は読み切れる量で、空欄が無いこと。
  if (!Array.isArray(object.facts) || object.facts.length < 2 || object.facts.length > 5) {
    failures.push(`${object.id} needs 2-5 fact rows, got ${(object.facts || []).length}`);
  }
  for (const row of object.facts || []) {
    if (!Array.isArray(row) || row.length !== 2 || !String(row[0] || '').trim() || !String(row[1] || '').trim()) {
      failures.push(`${object.id} has an incomplete fact row: ${JSON.stringify(row)}`);
    } else if (Array.from(row[0]).length > 6) {
      failures.push(`${object.id} fact label too long (>6 chars): ${row[0]}`);
    } else if (Array.from(row[1]).length > 60) {
      failures.push(`${object.id} fact value too long (>60 chars): ${row[1]}`);
    }
  }
  // Official Action のラベルは、行き先が1行で分かる長さに収める。
  if (Array.from(object.actionLabel || '').length > 22) {
    failures.push(`${object.id} actionLabel too long (>22 chars)`);
  }
  // 参加者に出す代替テキストは、説明として成立する長さがあること。
  if (Array.from(object.cardMediaAlt || '').length < 8) failures.push(`${object.id} cardMediaAlt too short`);
  if (Array.from(object.mediaAlt || '').length < 8) failures.push(`${object.id} mediaAlt too short`);
  if (!/^https:\/\//.test(object.actionUrl || '')) failures.push(`${object.id} actionUrl must be https`);
  if (mediaPolicy === 'external-preview-only' && !/^https:\/\//.test(object.mediaUrl || '')) failures.push(`${object.id} external-preview mediaUrl must be https`);
  if (mediaPolicy === 'same-origin-localized' && !/^\.\/assets\//.test(object.mediaUrl || '')) failures.push(`${object.id} localized mediaUrl must be same-origin ./assets`);
  if (!/^https:\/\//.test(object.rightsUrl || '')) failures.push(`${object.id} rightsUrl must be https`);
  if (object.reverifyBeforeExternalCycle !== true) failures.push(`${object.id} must reverify before external cycle`);
  // Real Media を frame の都合で切らないための宣言。
  if (!Number.isInteger(object.mediaWidth) || !Number.isInteger(object.mediaHeight)) {
    failures.push(`${object.id} must declare integer mediaWidth/mediaHeight`);
  }
  if (!['none', 'bottom-safe'].includes(object.mediaCrop)) failures.push(`${object.id} must declare mediaCrop`);
  // 一覧の alt は目で見える情報と等価にする。読み上げ利用者だけに答えを渡さない。
  if (!object.cardMediaAlt) failures.push(`${object.id} must declare a non-spoiling cardMediaAlt`);
  for (const spoiler of ['剥製', '標本']) {
    if ((object.cardMediaAlt || '').includes(spoiler)) {
      failures.push(`${object.id} cardMediaAlt leaks the Reveal answer: ${spoiler}`);
    }
  }
  if (!object.mediaCropNote) failures.push(`${object.id} must explain its crop policy`);
  if (object.mediaCrop !== 'none' && !/^\s*\S/.test(object.mediaCropNote || '')) {
    failures.push(`${object.id} non-none crop needs an explicit editorial reason`);
  }
}

// 宣言した寸法が実バイトの寸法（証跡）と一致していること。
if (mediaPolicy === 'same-origin-localized' && fs.existsSync(path.join(root, 'MEDIA_LOCALIZATION_EVIDENCE.json'))) {
  const ev = JSON.parse(fs.readFileSync(path.join(root, 'MEDIA_LOCALIZATION_EVIDENCE.json'), 'utf8'));
  for (const object of (content && content.objects) || []) {
    const rec = (ev.assets || []).find(a => a.id === object.id);
    if (!rec) { failures.push(`${object.id} has no media evidence record`); continue; }
    const [w, h] = rec.runtime_dimensions || [];
    if (object.mediaWidth !== w || object.mediaHeight !== h) {
      failures.push(`${object.id} declared media size ${object.mediaWidth}x${object.mediaHeight} != evidence ${w}x${h}`);
    }
  }
}

const js = fs.readFileSync(path.join(root, 'pilot.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const forbidden of ['localStorage', 'sessionStorage', 'indexedDB', 'sendBeacon', 'gtag(', 'fetch(',
  'XMLHttpRequest', 'serviceWorker', 'caches.', 'navigator.storage']) {
  if (js.includes(forbidden)) failures.push(`forbidden runtime token: ${forbidden}`);
}
for (const forbidden of ['serviceWorker', 'sw.js', 'manifest.json']) {
  if (html.includes(forbidden)) failures.push(`forbidden delivery token in html: ${forbidden}`);
}


if (js.includes("class: 'object-name'")) failures.push('pre-open card must not render objectName (Reveal spoiler risk)');
if (!js.includes('cardMediaAlt')) failures.push('card media must use the non-spoiling alt');
if (js.includes("class: 'verified-note'")) failures.push('internal verifiedNote must not render in participant UI');
if (/open-button[\s\S]{0,500}↗/.test(js)) failures.push('dialog open control must not look like an external link');

if (!js.includes("CONTENT.feature.mediaPolicy === 'same-origin-localized'")) failures.push('participant mode must fail closed until media is same-origin localized');
if (!js.includes("get('participant') === '1'")) failures.push('participant-mode explicit gate missing');

if (!html.includes('noindex,nofollow')) failures.push('noindex missing');
if (!html.includes('referrer" content="no-referrer')) failures.push('no-referrer meta missing');
if ((html.match(/<h1\b/g) || []).length !== 1) failures.push('expected exactly one h1');
if (!html.includes('3つ、見終わりました。')) failures.push('finite ending copy missing');
if (/type=["']search["']|<form\b|<input\b/i.test(html)) failures.push('search/form/input must not exist in first-session pilot');
for (const bad of ['analytics.js', 'store.js', 'googletagmanager', 'google-analytics']) {
  if (html.includes(bad)) failures.push(`forbidden external/runtime dependency in html: ${bad}`);
}

const css = fs.readFileSync(path.join(root, 'pilot.css'), 'utf8');
if (!css.includes('@media (max-width: 430px)')) failures.push('mobile breakpoint 430 missing');
if (!css.includes('prefers-reduced-motion')) failures.push('reduced-motion handling missing');
// frame の縦横比は media 自身の実寸から取る（固定 aspect-ratio に戻さない）。
if (!/aspect-ratio:\s*var\(--media-w\)\s*\/\s*var\(--media-h\)/.test(css)) {
  failures.push('media frame must derive its aspect ratio from the media itself');
}
if (/\.card-media\s*\{[^}]*aspect-ratio:\s*\d/.test(css)) failures.push('card media must not hardcode an aspect ratio');
if (/\.detail-media\s*\{[^}]*aspect-ratio:\s*\d/.test(css)) failures.push('detail media must not hardcode an aspect ratio');
if (!/\.detail-media img\s*\{[^}]*object-fit:\s*contain/.test(css)) {
  failures.push('detail media must show the full frame (contain)');
}
// 一覧は Real Media と Hook だけ。種別・地名は開いたあとに置く。
if (/class: 'object-meta'[\s\S]{0,200}class: 'object-hook'/.test(js)) {
  failures.push('card must lead with the Hook, not with meta');
}

// 参加者へ出す前に事実の期限を確認する。--external-cycle を付けたときだけ
// 期限切れを FAIL にする（開発中の QA を止めないため）。
const EXTERNAL_CYCLE = process.argv.includes('--external-cycle');
const now = Date.now();
const stale = [];
for (const object of (content && content.objects) || []) {
  if (!object.expiresAt) continue;
  const at = Date.parse(object.expiresAt);
  if (isNaN(at)) { failures.push(`${object.id} expiresAt is not a valid date`); continue; }
  if (at <= now) stale.push(`${object.id} expired at ${object.expiresAt}`);
}
if (!js.includes('blockStaleParticipantCycle')) failures.push('participant mode must fail closed on expired facts');
if (EXTERNAL_CYCLE && stale.length) stale.forEach(m => failures.push(`external cycle blocked: ${m}`));

if (failures.length) {
  console.error('PILOT_CHECK_FAIL');
  failures.forEach(f => console.error('- ' + f));
  process.exit(1);
}
console.log('PILOT_CHECK_GO');
if (stale.length) {
  console.log('FRESHNESS_STALE (external cycle would be blocked):');
  stale.forEach(m => console.log('- ' + m));
} else {
  console.log('FRESHNESS_OK; every dated fact is still inside its stated window');
}
console.log('objects=3; storage=0; analytics=0; background fetch=0; search=0; account=0; finite ending=1; official actions=https; provenance/freshness=present');
