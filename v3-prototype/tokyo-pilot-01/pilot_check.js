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
  if (!/^https:\/\//.test(object.actionUrl || '')) failures.push(`${object.id} actionUrl must be https`);
  if (mediaPolicy === 'external-preview-only' && !/^https:\/\//.test(object.mediaUrl || '')) failures.push(`${object.id} external-preview mediaUrl must be https`);
  if (mediaPolicy === 'same-origin-localized' && !/^\.\/assets\//.test(object.mediaUrl || '')) failures.push(`${object.id} localized mediaUrl must be same-origin ./assets`);
  if (!/^https:\/\//.test(object.rightsUrl || '')) failures.push(`${object.id} rightsUrl must be https`);
  if (object.reverifyBeforeExternalCycle !== true) failures.push(`${object.id} must reverify before external cycle`);
}

const js = fs.readFileSync(path.join(root, 'pilot.js'), 'utf8');
for (const forbidden of ['localStorage', 'sessionStorage', 'indexedDB', 'sendBeacon', 'gtag(', 'fetch(', 'XMLHttpRequest']) {
  if (js.includes(forbidden)) failures.push(`forbidden runtime token: ${forbidden}`);
}


if (js.includes("class: 'object-name'")) failures.push('pre-open card must not render objectName (Reveal spoiler risk)');
if (js.includes("class: 'verified-note'")) failures.push('internal verifiedNote must not render in participant UI');
if (/open-button[\s\S]{0,500}↗/.test(js)) failures.push('dialog open control must not look like an external link');

if (!js.includes("CONTENT.feature.mediaPolicy === 'same-origin-localized'")) failures.push('participant mode must fail closed until media is same-origin localized');
if (!js.includes("get('participant') === '1'")) failures.push('participant-mode explicit gate missing');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
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

if (failures.length) {
  console.error('PILOT_CHECK_FAIL');
  failures.forEach(f => console.error('- ' + f));
  process.exit(1);
}
console.log('PILOT_CHECK_GO');
console.log('objects=3; storage=0; analytics=0; background fetch=0; search=0; account=0; finite ending=1; official actions=https; provenance/freshness=present');
