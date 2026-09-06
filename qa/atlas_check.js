#!/usr/bin/env node
/* ATLAS CHECK — 街を立体で辿る（β）/atlas/ の静的契約（Production Beta 0、高円寺だけ、Correction C）。
   Founder POST-PREVIEW DECISION v2 → Correction C（CLAUDE_CORRECTION_C_DATA_READY_PROMPT v0.6）:
   - runtime: Cesium 0 / PLATEAU 配信 0 / タイル 0 / WebAssembly 0 / unsafe-eval 0 / wasm-unsafe-eval 0 / 位置情報 0 / カメラ 0
   - data: 公式 PLATEAU 杉並区 2025（13115、CityGML 2.0）から offline 抽出した same-origin GeoJSON だけ。
     lineage certificate（source GML SHA → gml:id → derived SHA）が実ファイルと一致しなければ FAIL。
   - historical: 1957 は通りという範囲まで（線を引かない）、1961 / 1961–62 / 1963 は地点 0、current geometry ≠ evidence。
   実ブラウザ（network 0 / CSP / overflow / 表示）は qa/atlas_browser_qa.js。
   使い方: node qa/atlas_check.js */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const html = read('atlas/index.html');
const app = read('atlas/app.js');
const css = read('atlas/styles.css');
const lens = JSON.parse(read('atlas/data/koenji-lens.json'));
const thread = JSON.parse(read('atlas/data/koenji-thread.json'));
const runtime = JSON.parse(read('atlas/data/runtime-spatial.json'));
const vercel = JSON.parse(read('vercel.json'));
const csp = vercel.headers.find((h) => h.source === '/(.*)').headers.find((h) => h.key === 'Content-Security-Policy').value;
const BASELINE_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://www.googleapis.com https://itunes.apple.com; frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const runtimeText = stripComments(html) + stripComments(app) + stripComments(css);

/* ---- 1. scope: Koenji only, noindex, sitemap excluded, return to Thread, no player ---- */
check(lens.city === 'koenji' && lens.threadId === 'koenji-dance-history' && thread.threadId === 'koenji-dance-history', 'Atlas must be Koenji-only (Production Beta 0)');
check(!exists('atlas/data/cities.json') && !/citySwitcher|city-switcher|switchCity/.test(runtimeText), 'no city switcher / city index in the Production Atlas');
for (const other of ['jinbocho', 'shimokitazawa', 'kichijoji', '神保町', '下北沢', '吉祥寺']) {
  check(!runtimeText.includes(other) && !JSON.stringify([lens, thread]).includes(other), `other research city must not appear in the Production Atlas (${other})`);
}
check(html.includes('<meta name="robots" content="noindex,nofollow">'), 'atlas/index.html must be noindex,nofollow');
check(!read('sitemap.xml').includes('atlas'), 'sitemap must not list /atlas/');
check(vercel.headers.some((h) => h.source === '/atlas/(.*)' && h.headers.some((x) => x.key === 'X-Robots-Tag' && /noindex/.test(x.value) && /nofollow/.test(x.value))), 'vercel.json must send X-Robots-Tag noindex, nofollow for /atlas/');
check(html.includes('<meta name="referrer" content="no-referrer">'), 'atlas must send no referrer');
check((html.match(/href="\.\.\/thread\.html\?thread=koenji-dance-history"/g) || []).length >= 2 && html.includes('スレッドへ戻る') && lens.return.href === '../thread.html?thread=koenji-dance-history', 'user can return from the Atlas to the Koenji Thread (top + 現実へ戻る)');
check(!/<iframe|<video|<audio|<embed|<object|<canvas|youtube-nocookie|\/embed\//.test(html + app), 'Atlas carries no inline player / iframe / canvas (official video stays a click-only link here)');
check(!/<input|<textarea|<form|<select/.test(html) && !/search|検索/.test(html), 'no search / free text input in the Atlas');

/* ---- 2. runtime: local same-origin data only; Cesium / PLATEAU provider / WebAssembly / eval = 0 ---- */
for (const t of ['Cesium', 'cesium', 'plateauview', 'reearth', 'WebAssembly', 'wasm', '3dtiles', 'tileset', 'importScripts', 'new Worker', 'eval(', 'new Function(', 'unsafe-eval', 'blob:']) {
  check(!runtimeText.includes(t), `Atlas runtime must not contain ${t}`);
}
{
  const urls = (runtimeText.match(/https?:\/\/[^"'\s)<]+/g) || []);
  const allowedStatic = new Set(['http://www.w3.org/2000/svg', 'https://www.mlit.go.jp/plateau/', 'https://www.geospatial.jp/ckan/dataset/plateau-13115-suginami-ku-2025']);
  check(urls.every((u) => allowedStatic.has(u)), `runtime files reference only the SVG namespace + the two attribution links (got ${urls.filter((u) => !allowedStatic.has(u)).join(' ')})`);
  check((app.match(/fetch\(/g) || []).length === 1 && app.includes("if (!/^\\.\\/data\\/[a-z0-9._-]+\\.(json|geojson)$/i.test(path)) throw new Error('Not a local data path: ' + path);"), 'the only fetch is guarded to ./data/*.json|geojson (same-origin, relative)');
  check(!/addEventListener\('(wheel|pointer|mouse|touch|drag)/.test(app) && !/on(wheel|pointerdown|mousedown|touchstart)/.test(app + html), 'no free-roam (no pan / zoom / drag handlers)');
  check(!/transition|animation|@keyframes|backdrop-filter|box-shadow/.test(stripComments(css)), 'atlas css: no animation / transition / shadow (reduced-motion safe)');
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((b) => b.split('{')[0].trim()).filter((s) => s && !s.startsWith('@'));
  check(selectors.every((sel) => sel.split(',').every((one) => /^\s*(\.atlas-page|\.al-)/.test(one))), 'atlas css selectors are scoped to .atlas-page / .al-');
}

/* ---- 3. privacy: no geolocation / camera / storage / analytics / private input ---- */
for (const t of ['navigator.geolocation', 'getCurrentPosition', 'watchPosition', 'getUserMedia', 'mediaDevices', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'gtag', 'dataLayer', 'sendBeacon', 'XMLHttpRequest', 'WebSocket', 'navigator.share', 'history.pushState', 'location.search']) {
  check(!app.includes(t) && !html.includes(t), `Atlas must not use ${t}`);
}
/* Measurement v0.4: the Atlas loads only the shared hostname-gated analytics-v3.js (entry spatial/koenji, continue thread/koenji_dance_history,
   evidence, external by hostname). app.js carries no measurement code; nothing about views / frames / coordinates / buildings is measured. */
check((html.match(/<script src="\.\.\/analytics-v3\.js"><\/script>/g) || []).length === 1 && !html.includes('googletagmanager') && (html.match(/<script /g) || []).length === 2, 'Atlas loads the shared analytics-v3.js once (plus app.js) and nothing else');
check(!app.includes('v3Analytics') && !app.includes('gtag') && !app.includes('dataLayer'), 'atlas/app.js carries no measurement code (measurement is central and bounded)');
{
  const analytics = read('analytics-v3.js');
  check(analytics.includes("api.entryOpen('spatial', 'koenji')") && analytics.includes("api.continueOpen('thread', THREAD_IDS[threadRoute[1]])") && analytics.includes("api.evidenceOpen('spatial', 'koenji')"), 'analytics-v3.js: Atlas entry / continue / evidence are bounded to spatial/koenji and thread/koenji_dance_history');
  check(!/gml|latitude|longitude|coordinates|zoom|viewport|camera|data-view|data-frame|al-view|measuredHeight/.test(analytics.replace(/\/\*[\s\S]*?\*\//g, '')), 'analytics-v3.js measures no view switch / frame / coordinate / building');
}

/* ---- 4. CSP: back to the remote baseline (+ atlas robots header only) ---- */
check(csp === BASELINE_CSP, 'global CSP must equal the 5743a36 baseline (Cesium / PLATEAU hosts removed, youtube-nocookie frame-src kept)');
for (const bad of ["'unsafe-eval'", "'wasm-unsafe-eval'", 'cesium.com', 'plateauview.mlit.go.jp', 'plateau.reearth.io', 'worker-src', 'blob:', '*']) check(!csp.includes(bad), `CSP must not carry ${bad}`);
check(csp.includes("frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'"), 'CSP keeps the approved youtube-nocookie frame-src');
{
  const all = JSON.stringify(vercel);
  check(/X-Frame-Options/.test(all) && /geolocation=\(\), camera=\(\), microphone=\(\), payment=\(\)/.test(all) && vercel.headers.filter((h) => h.headers.some((x) => x.key === 'Content-Security-Policy')).length === 1, 'existing security headers preserved; exactly one global CSP');
  check(vercel.headers.length === 2 && vercel.headers[1].source === '/atlas/(.*)' && vercel.headers[1].headers.length === 1, 'vercel.json adds only the /atlas/ X-Robots-Tag rule');
}
const allow = ((app.match(/const EXTERNAL_ALLOW = new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1].match(/'[^']+'/g) || []).map((s) => s.replace(/'/g, ''));
check(allow.join() === 'koenji-awaodori.com,www.koenji-awaodori.com,suginamigaku.org,www.koenji-pal.jp,www.youtube.com,www.mlit.go.jp,www.geospatial.jp', `external link allowlist is Koenji sources + PLATEAU attribution only (got ${allow.join()})`);
for (const [id, src] of Object.entries(thread.sources)) check(allow.includes(new URL(src.url).hostname) && /^https:\/\//.test(src.url), `source ${id} host must be allowlisted https`);
const KOENJI_SOURCE_URLS = ['https://koenji-awaodori.com/about/his01.html', 'https://suginamigaku.org/2022/11/koenji-awaodori.html', 'https://www.koenji-pal.jp/about', 'https://www.koenji-pal.jp/access', 'https://koenji-awaodori.com/category1/join.html', 'https://koenji-awaodori.com/', 'https://www.youtube.com/watch?v=dt33RGSRuo0'];
check(Object.values(thread.sources).map((s) => s.url).sort().join('|') === KOENJI_SOURCE_URLS.slice().sort().join('|'), 'Atlas sources are exactly the Thread sources (URLs unchanged)');

/* ---- 5. data lineage: exact dataset, certificate SHA == shipped file SHA, every id traceable ---- */
const K = 'tools/plateau/koenji/';
const manifest = JSON.parse(read(K + 'source-manifest.json'));
check(manifest.source.city_code === '13115' && manifest.source.year === 2025 && manifest.source.citygml_version === '2.0' && manifest.source.dataset_title === '3D都市モデル（Project PLATEAU）杉並区（2025年度）' && manifest.source.package === '13115_suginami-ku_pref_2025_citygml_1_op.zip' && manifest.source.package_sha256 === '9deaa984f060956f9aa2cde2507113ed7d3fcfffa0a53846081715ef68ca3816' && manifest.source.dataset_url === 'https://www.geospatial.jp/ckan/dataset/plateau-13115-suginami-ku-2025', 'source manifest pins the exact official dataset (13115 / 2025 / CityGML 2.0 / package SHA)');
check(manifest.extraction.historical_geometry === false && Array.isArray(manifest.extraction.bbox_present_day_wgs84) && manifest.extraction.bbox_present_day_wgs84.length === 4, 'source manifest: extraction window is present-day only');
check(runtime.production_eligible === true && runtime.lineage_required === true && runtime.historicalGeometry === false && runtime.dataset.city_code === '13115' && runtime.dataset.year === 2025 && runtime.dataset.citygml_version === '2.0' && runtime.mode === 'production_candidate', 'runtime-spatial.json is a certified production candidate for 13115 / 2025 / CityGML 2.0');
for (const key of ['buildings', 'roads', 'provenance']) check(typeof runtime[key] === 'string' && runtime[key].startsWith('./data/') && exists('atlas/' + runtime[key].slice(2)), `runtime ${key} path is local and exists`);
const bldgRel = 'atlas/' + runtime.buildings.slice(2), roadRel = 'atlas/' + runtime.roads.slice(2), provRel = 'atlas/' + runtime.provenance.slice(2);
const bldg = JSON.parse(read(bldgRel)), roads = JSON.parse(read(roadRel)), prov = JSON.parse(read(provRel));
const crop = manifest.extraction.bbox_present_day_wgs84;
function featureBbox(g) { const pts = []; const walk = (c) => { if (typeof c[0] === 'number') pts.push(c); else c.forEach(walk); }; walk(g.coordinates); return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]; }
for (const [label, geo, kind, rel, prefix] of [['buildings', bldg, 'bldg', bldgRel, /^bldg_[0-9a-f-]{36}$/], ['roads', roads, 'tran', roadRel, /^tran_[0-9a-f-]{36}$/]]) {
  const p = geo.properties || {};
  check(geo.type === 'FeatureCollection' && p.plateau_derived === true && p.development_fixture === false && p.municipality_code === '13115' && p.dataset_year === 2025 && p.citygml_version === '2.0' && p.historicalGeometry === false && p.feature_type === kind, `${label}: PLATEAU-derived flags (13115 / 2025 / 2.0 / not fixture / not historical)`);
  check(p.feature_count === geo.features.length && geo.features.length > 0, `${label}: feature_count matches`);
  const ids = geo.features.map((f) => f.id);
  check(ids.every((id) => typeof id === 'string' && prefix.test(id)) && new Set(ids).size === ids.length, `${label}: every feature id is a unique source gml:id`);
  check(geo.features.every((f) => f.properties.gml_id === f.id && ['53394541', '53394542'].includes(f.properties.mesh)), `${label}: gml_id + mesh recorded per feature`);
  check(geo.features.every((f) => Object.keys(f.properties).every((k) => ['gml_id', 'mesh', 'measuredHeight'].includes(k))), `${label}: minimal attributes only`);
  check(geo.features.every((f) => ['Polygon', 'MultiPolygon'].includes(f.geometry.type)), `${label}: polygon geometry only`);
  check(geo.features.every((f) => { const b = featureBbox(f.geometry); return !(b[2] < crop[0] || b[0] > crop[2] || b[3] < crop[1] || b[1] > crop[3]); }), `${label}: every feature intersects the present-day extraction window (no out-of-scope geometry)`);
  check(!JSON.stringify(geo).toLowerCase().includes('synthetic') && !JSON.stringify(geo).includes('"fixture": true'), `${label}: no synthetic / fixture geometry`);
  check(path.basename(rel).includes(sha256(rel).slice(0, 12)), `${label}: promoted file name carries its own SHA-256 prefix`);
  const certName = `koenji-plateau-2025-${label}.lineage.json`;
  check(exists(K + certName), `${label}: lineage certificate exists (${certName})`);
  if (exists(K + certName)) {
    const c = JSON.parse(read(K + certName));
    check(c.certificate_version === 'plateau-lineage-v0.1' && c.status === 'GO' && c.citygml_version === '2.0' && c.historicalGeometry === false, `${label}: certificate GO / CityGML 2.0 / historicalGeometry false`);
    check(c.geojson_sha256 === sha256(rel), `${label}: certificate GeoJSON SHA must equal the shipped file SHA (HOLD otherwise)`);
    check(c.output_features === geo.features.length && c.traceable_output_ids === geo.features.length && c.null_output_ids === 0 && Array.isArray(c.missing_output_ids) && c.missing_output_ids.length === 0, `${label}: every output feature traceable to a source gml:id`);
    const want = manifest.files.filter((f) => f.type === kind).map((f) => f.sha256).sort().join();
    check((c.source_audits || []).map((a) => a.source_sha256).sort().join() === want && c.source_audits.every((a) => a.citygml_version === '2.0'), `${label}: certificate source GML SHAs equal the manifest (CityGML 2.0)`);
    check(prov[label === 'buildings' ? 'building_lineage_certificate_sha256' : 'road_lineage_certificate_sha256'] === sha256(K + certName), `${label}: provenance references this exact certificate`);
    for (const a of c.source_audits || []) {
      const auditRel = K + 'audits/' + a.audit_file;
      check(exists(auditRel), `${label}: source audit ${a.audit_file} recorded`);
      if (exists(auditRel)) { const au = JSON.parse(read(auditRel)); check(au.citygml_version === '2.0' && au.source_sha256 === a.source_sha256 && au.feature_count === au.gml_id_count && au.gml_ids_unique === true && au.feature_count === manifest.files.find((f) => f.sha256 === a.source_sha256).features, `${label}: audit ${a.audit_file} = CityGML 2.0, gml:id complete + unique, counts match manifest`); }
    }
  }
}
check(bldg.features.every((f) => f.properties.measuredHeight === null || (typeof f.properties.measuredHeight === 'number' && f.properties.measuredHeight > 0)), 'buildings: measuredHeight is null or positive (PLATEAU -9999 sentinel never shipped as a height)');
check(prov.status === 'VERIFIED_PLATEAU_DERIVED_WITH_LINEAGE' && prov.municipality_code === '13115' && prov.dataset_year === 2025 && prov.citygml_version === '2.0' && prov.historicalGeometry === false && prov.buildings_sha256 === sha256(bldgRel) && prov.roads_sha256 === sha256(roadRel) && prov.building_features === bldg.features.length && prov.road_features === roads.features.length && prov.source_package_sha256 === manifest.source.package_sha256, 'provenance: status + identity + SHAs of the shipped files');
check(prov.license && prov.license.attribution_text === '出典：3D都市モデル（Project PLATEAU）杉並区（2025年度）（国土交通省）を加工して作成' && html.includes(prov.license.attribution_text) && html.includes('https://www.mlit.go.jp/plateau/') && html.includes(manifest.source.dataset_url), 'attribution text (README license) visible in the Atlas with source links');
check(exists('atlas/ATTRIBUTION.md') && read('atlas/ATTRIBUTION.md').includes(manifest.source.package_sha256) && !/cesium\.com|Apache License|maxlod2-latest|PLATEAU-Ortho/.test(read('atlas/ATTRIBUTION.md')), 'ATTRIBUTION.md records the package SHA; no runtime-provider (Cesium / tileset / ortho) attribution surface remains');
for (const stale of ['atlas/data/cities.json', 'atlas/data/koenji-spatial.json']) check(!exists(stale), `stale B data file removed (${stale})`);
check(fs.readdirSync(path.join(root, 'atlas/data')).filter((f) => /^koenji-plateau-2025-/.test(f)).length === 3, 'exactly one promoted set (buildings / roads / provenance) ships');

/* ---- 6. historical precision: no historical point, no hand-placed coordinates, present reference from data ---- */
check(thread.scenes.map((s) => s.id).join() === 's1957,s1961,s1961_62,s1963,snow', 'Atlas thread scene order');
for (const s of thread.scenes) {
  if (['s1961', 's1961_62', 's1963'].includes(s.id)) check(s.spatialResolution === 'not_applicable' && s.mapPolicy === 'overview' && lens.historicalPoints[s.id] === 'none', `${s.id} must not render a historical point`);
  check(typeof s.precisionCopy === 'string' && s.precisionCopy.length > 0, `${s.id} keeps its precision copy`);
}
check(thread.scenes[0].spatialResolution === 'street_segment' && lens.corridor.policy === 'no_band' && /線で示すことは、この版ではしていません/.test(thread.scenes[0].precisionCopy), '1957 = street-segment precision only; no corridor line is drawn over the PLATEAU data');
check(thread.spatialTruth && thread.spatialTruth.historicalGeometry === false, 'thread spatialTruth historicalGeometry=false');
check(!/"(coordinates|lon|lat|latitude|longitude|camera|tileset|imagery)"/.test(read('atlas/data/koenji-lens.json')), 'lens data carries no hand-placed coordinates / camera / provider fields (only the two present-day frames)');
check(lens.presentReference.historicalClaim === false && lens.presentReference.gmlIds.length === 2 && lens.presentReference.gmlIds.every((id) => bldg.features.some((f) => f.id === id)), 'present station reference is derived from PLATEAU building gml:ids that exist in the shipped data');
check(lens.views.map((v) => v.id).join() === 'relation,city,evidence,time,now' && app.includes("const VIEW_IDS = ['relation', 'city', 'evidence', 'time', 'now'];"), 'finite semantic views: 関係 / 街の形 / 証拠 / 時間 / 現在');
check(!/historicalGeometry"?\s*:\s*true/.test(read('atlas/data/koenji-lens.json') + read('atlas/data/koenji-thread.json') + read(bldgRel).slice(0, 4000) + read(roadRel).slice(0, 4000)), 'nothing claims historicalGeometry:true');

/* ---- 7. name avoidance (Founder no-inquiry decision) ---- */
{
  const F = ['東京高円寺阿波おどり', '高円寺阿波おどり', '高円寺阿波踊り'];
  const rendered = JSON.stringify({ lens, thread }, (k, v) => (k === 'url' ? '' : v));
  for (const [name, text] of [['atlas/index.html', html], ['atlas/app.js', app], ['atlas data (rendered strings)', rendered]]) {
    const hits = F.filter((t) => text.replace(/https?:\/\/[^\s"'<>)]+/g, '').includes(t));
    check(hits.length === 0, `NAME AVOIDANCE: ${name} must not carry the protected / similar event name (${hits.join(' / ')})`);
  }
  check(lens.hero.title === '踊りが街に根づくまで' && thread.sources['official-history'].label === '主催団体 公式サイト（歴史資料）' && thread.sources['official-video'].label === '現在の公式映像を見る', 'neutral title / source labels / video CTA');
  check(!/thread=koenji-awaodori\b/.test(html + app + rendered) && !(html + app + rendered).includes('編集部の読み'), 'old public route / editorial label must not appear');
}

/* ---- 8. bounded entry from the Koenji cultural path (Thread), nowhere else ---- */
{
  const content = read('thread_content.js'), index = read('index.html'), works = read('works.html');
  check((content.match(/\.\/atlas\//g) || []).length === 1 && !index.includes('atlas') && !works.includes('atlas'), 'exactly one bounded entry to /atlas/ (Koenji Thread), not HOME / Works');
  const vm = require('vm'); const sb = { window: {} }; vm.createContext(sb); vm.runInContext(content, sb);
  const threads = sb.window.V3_THREAD_CONTENT.threads;
  check(threads.filter((t) => t.spatialEntry).map((t) => t.threadId).join() === 'koenji-dance-history', 'only the Koenji Thread carries the Atlas entry');
  const entry = threads.find((t) => t.threadId === 'koenji-dance-history').spatialEntry;
  check(JSON.stringify(entry) === JSON.stringify({ href: './atlas/', label: '街を立体で辿る（β）', note: 'Project PLATEAUの3D都市モデル（杉並区 2025年度）から取り出した、現在の街の形の上で、この関係をもう一度辿ります。' }), 'Thread entry copy names the local, pre-extracted PLATEAU 2025 substrate (no runtime 3D provider claim)');
}

/* ---- 9. Trust copy matches the final runtime ---- */
{
  const trust = read('data.html');
  for (const phrase of ['利用者が映像を見る操作をした時点でYouTubeへの通信が始まります', 'Project PLATEAUの公開データから事前に作成した表示用データを感情書店のページから読み込みます', 'PLATEAUやCesiumの配信元へ接続せず', '現在地・カメラ・自由入力を使いません', '地図上の正確な座標や視点を、感情書店が定義する独自イベントの項目として送りません', '外部サービスへの移動はGA4のオン／オフとは別の操作です。']) check(trust.includes(phrase), `data.html must state: ${phrase}`);
  for (const stale of ['cesium.com', 'plateauview', 'reearth', 'youtube-nocookie', 'CesiumJSの配信元', 'Project PLATEAUの配信サービス']) check(!trust.includes(stale), `data.html must not describe the retired provider runtime (${stale})`);
  check(!/約15分で観終わります/.test(trust), 'no technical Trust paragraph is placed beside the video (video copy stays in the player only)');
}

if (failures.length) {
  console.error('ATLAS_CHECK_FAIL');
  for (const f of failures) console.error('- ' + f);
  process.exit(1);
}
console.log('ATLAS_CHECK_GO');
console.log(`atlas=koenji-only; noindex meta + X-Robots-Tag; sitemap excluded; runtime cesium/plateau/wasm/eval=0; CSP=baseline; data=PLATEAU 13115/2025 CityGML 2.0 buildings=${bldg.features.length} roads=${roads.features.length} lineage=GO (cert SHA == file SHA); historical points=0; corridor line=0; hosts=${allow.length}; entry=1 (Thread)`);
