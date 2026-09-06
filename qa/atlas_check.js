#!/usr/bin/env node
/* ATLAS CHECK — 街を立体で辿る（β）/atlas/ の静的契約（Production Beta 0、高円寺だけ）。
   Founder POST-PREVIEW DECISION v2（2026-09-06）/ ATLAS_KOENJI_RUNTIME_FALLBACK_ACCEPTANCE v0.2 /
   CSP_PRODUCTION_BETA / SEO_BETA_DECISION / NAME_AVOIDANCE。
   実ブラウザの fallback / provider / CSP は qa/atlas_browser_qa.js。
   使い方: node qa/atlas_check.js */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const html = read('atlas/index.html');
const app = read('atlas/app.js');
const css = read('atlas/styles.css');
const cities = JSON.parse(read('atlas/data/cities.json'));
const thread = JSON.parse(read('atlas/data/koenji-thread.json'));
const spatial = JSON.parse(read('atlas/data/koenji-spatial.json'));
const vercel = JSON.parse(read('vercel.json'));
const csp = vercel.headers.find((h) => h.source === '/(.*)').headers.find((h) => h.key === 'Content-Security-Policy').value;

/* ---- 1. scope: Koenji only, no other research city in navigation, noindex, sitemap excluded ---- */
check(cities.cities.map((c) => c.id).join() === 'koenji' && cities.defaultCity === 'koenji', 'Atlas must be Koenji-only (Production Beta 0)');
for (const other of ['jinbocho', 'shimokitazawa', 'kichijoji', '神保町', '下北沢', '吉祥寺']) {
  check(!html.includes(other) && !app.includes(other) && !css.includes(other) && !JSON.stringify(cities).includes(other), `other research city must not appear in the Production Atlas (${other})`);
}
check(html.includes('<meta name="robots" content="noindex,nofollow">'), 'atlas/index.html must be noindex,nofollow');
check(!read('sitemap.xml').includes('atlas'), 'sitemap must not list /atlas/');
check(vercel.headers.some((h) => h.source === '/atlas/(.*)' && h.headers.some((x) => x.key === 'X-Robots-Tag' && /noindex/.test(x.value) && /nofollow/.test(x.value))), 'vercel.json must send X-Robots-Tag noindex, nofollow for /atlas/');
check(html.includes('<meta name="referrer" content="no-referrer">'), 'atlas must send no referrer');
check(html.includes('href="../thread.html?thread=koenji-dance-history"') && html.includes('スレッドへ戻る'), 'user can return from the Atlas to the Koenji Thread (culture)');
check(!/<iframe|<video|<audio|youtube-nocookie|\/embed\//.test(html + app), 'Atlas carries no inline player / iframe (official video stays a click-only link here)');

/* ---- 2. 2.5D first usable, PLATEAU progressive, ?mode=2d provider-free ---- */
check(app.includes('void upgradeToPlateau') && !app.includes('await upgradeToPlateau'), 'PLATEAU upgrade must be background / non-awaited (2.5D usable first)');
check(app.indexOf("params.get('mode')==='2d'") > 0 && app.indexOf("params.get('mode')==='2d'") < app.indexOf("const plateauLayer=document.createElement('div')"), '?mode=2d guard must run before any provider layer / script is created');
check(app.indexOf('await state.fallbackAdapter.init()') < app.indexOf('void upgradeToPlateau'), 'fallback adapter initialises before the PLATEAU upgrade starts');
check(/\$\('loading'\)\.style\.display='none'/.test(app) && app.indexOf("$('loading').style.display='none'") > app.indexOf('await switchCity(requested,false)'), 'loading overlay is released once the 2.5D baseline is ready (not after PLATEAU)');
check(app.includes("window.CESIUM_BASE_URL='https://cesium.com/downloads/cesiumjs/releases/1.117/Build/Cesium/'"), 'CesiumJS 1.117 from cesium.com (aligned with the PLATEAU official sample)');
check(!app.includes('unsafe-eval') && !/\beval\(|new Function\(/.test(app), 'Atlas runtime must not eval');
check(spatial.plateauEnabled === true && spatial.municipalityCode === '13115' && spatial.plateau.tileset === 'https://api.plateauview.mlit.go.jp/datacatalog/3dtiles/13115-bldg-maxlod2-latest/tileset.json' && /^https:\/\/tile\.plateauview\.mlit\.go\.jp\//.test(spatial.plateau.imagery), 'PLATEAU Suginami (13115) maxlod2-latest tileset + PLATEAU-Ortho imagery');

/* ---- 3. privacy: no geolocation / camera permission / storage / analytics / private input ---- */
for (const t of ['navigator.geolocation', 'getCurrentPosition', 'watchPosition', 'getUserMedia', 'mediaDevices', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'gtag', 'dataLayer', 'sendBeacon', 'XMLHttpRequest', 'WebSocket', '<input', '<textarea', '<form']) {
  check(!app.includes(t) && !html.includes(t), `Atlas must not use ${t}`);
}
check((app.match(/fetch\(/g) || []).length === 1 && app.includes("fetch(path,{cache:'no-store'})"), 'the only fetch is the same-origin cultural JSON');

/* ---- 4. external hosts: bounded allowlist, CSP declares exactly the providers ---- */
check(!csp.includes("'unsafe-eval'"), "CSP must not carry 'unsafe-eval'");
for (const required of ['https://cesium.com', 'https://api.plateauview.mlit.go.jp', 'https://tile.plateauview.mlit.go.jp', 'https://assets.cms.plateau.reearth.io', "worker-src 'self' blob: https://cesium.com", "frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'", "img-src 'self' data: blob: https:"]) {
  check(csp.includes(required), `CSP must declare ${required}`);
}
check(/script-src 'self' 'unsafe-inline' https:\/\/www\.googletagmanager\.com https:\/\/cesium\.com;/.test(csp), 'script-src adds only cesium.com');
check(/X-Frame-Options/.test(JSON.stringify(vercel)) && /Permissions-Policy/.test(JSON.stringify(vercel)) && /geolocation=\(\), camera=\(\), microphone=\(\), payment=\(\)/.test(JSON.stringify(vercel)), 'existing security headers preserved (frame deny, geolocation/camera/microphone/payment denied)');
const allow = (app.match(/const EXTERNAL_ALLOW=new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1].match(/'[^']+'/g).map((s) => s.replace(/'/g, ''));
check(allow.join() === 'koenji-awaodori.com,www.koenji-awaodori.com,suginamigaku.org,www.koenji-pal.jp,www.youtube.com,www.mlit.go.jp,docs.plateauview.mlit.go.jp', `external link allowlist is Koenji + PLATEAU docs only (got ${allow.join()})`);
for (const [id, src] of Object.entries(thread.sources)) check(allow.includes(new URL(src.url).hostname) && /^https:\/\//.test(src.url), `source ${id} host must be allowlisted https`);
const KOENJI_SOURCE_URLS = ['https://koenji-awaodori.com/about/his01.html', 'https://suginamigaku.org/2022/11/koenji-awaodori.html', 'https://www.koenji-pal.jp/about', 'https://www.koenji-pal.jp/access', 'https://koenji-awaodori.com/category1/join.html', 'https://koenji-awaodori.com/', 'https://www.youtube.com/watch?v=dt33RGSRuo0'];
check(Object.values(thread.sources).map((s) => s.url).sort().join('|') === KOENJI_SOURCE_URLS.slice().sort().join('|'), 'Atlas sources are exactly the Thread sources (URLs unchanged)');

/* ---- 5. historical precision: 1957 street segment only; no historical point; current geometry != evidence ---- */
check(thread.threadId === 'koenji-dance-history' && thread.scenes.map((s) => s.id).join() === 's1957,s1961,s1961_62,s1963,snow', 'Atlas thread id / scene order');
for (const g of spatial.geometries || []) check(g.historicalGeometry === false && ['corridor', 'area', 'current_place'].includes(g.kind), `geometry ${g.id} must not claim a historical boundary`);
check((spatial.geometries || []).length === 1 && spatial.geometries[0].kind === 'corridor' && spatial.geometries[0].sceneIds.join() === 's1957' && spatial.geometries[0].spatialResolution === 'street_segment', 'only the 1957 street-segment corridor exists (no 1961 / 1961–62 / 1963 point)');
for (const s of thread.scenes) {
  if (['s1961', 's1961_62', 's1963'].includes(s.id)) check(s.spatialResolution === 'not_applicable' && s.mapPolicy === 'overview', `${s.id} must not render a historical point`);
  check(typeof s.precisionCopy === 'string' && s.precisionCopy.length > 0, `${s.id} keeps its precision copy`);
}
for (const r of spatial.presentReferences || []) check(r.historicalClaim === false, `present reference ${r.id} is not a historical claim`);
check(html.includes('3D都市モデル: Project PLATEAU / 国土交通省') && html.includes('https://www.mlit.go.jp/plateau/'), 'PLATEAU attribution visible in the Atlas');
check(fs.existsSync(path.join(root, 'atlas/ATTRIBUTION.md')), 'PLATEAU / CesiumJS attribution recorded');

/* ---- 6. name avoidance (Founder no-inquiry decision) ---- */
{
  const F = ['東京高円寺阿波おどり', '高円寺阿波おどり', '高円寺阿波踊り'];
  const rendered = JSON.stringify({ cities, thread, spatial }, (k, v) => (k === 'url' || k === 'tileset' || k === 'imagery' ? '' : v));
  for (const [name, text] of [['atlas/index.html', html], ['atlas/app.js', app], ['atlas data (rendered strings)', rendered]]) {
    const hits = F.filter((t) => text.replace(/https?:\/\/[^\s"'<>)]+/g, '').includes(t));
    check(hits.length === 0, `NAME AVOIDANCE: ${name} must not carry the protected / similar event name (${hits.join(' / ')})`);
  }
  check(cities.cities[0].heroTitle === '踊りが街に<br>根づくまで' && thread.sources['official-history'].label === '主催団体 公式サイト（歴史資料）' && thread.sources['official-video'].label === '現在の公式映像を見る', 'neutral title / source labels / video CTA');
  check(!/thread=koenji-awaodori\b/.test(html + app + rendered), 'old public route must not appear');
}

/* ---- 7. bounded entry from the Koenji cultural path (Thread), nowhere else ---- */
{
  const content = read('thread_content.js'), index = read('index.html'), works = read('works.html');
  check((content.match(/\.\/atlas\//g) || []).length === 1 && !index.includes('atlas') && !works.includes('atlas'), 'exactly one bounded entry to /atlas/ (Koenji Thread), not HOME / Works');
  const vm = require('vm'); const sb = { window: {} }; vm.createContext(sb); vm.runInContext(content, sb);
  const threads = sb.window.V3_THREAD_CONTENT.threads;
  check(threads.filter((t) => t.spatialEntry).map((t) => t.threadId).join() === 'koenji-dance-history', 'only the Koenji Thread carries the Atlas entry');
}

if (failures.length) {
  console.error('ATLAS_CHECK_FAIL');
  for (const f of failures) console.error('- ' + f);
  process.exit(1);
}
console.log('ATLAS_CHECK_GO');
console.log(`atlas=koenji-only; noindex meta + X-Robots-Tag; sitemap excluded; 2.5D first (non-awaited PLATEAU); ?mode=2d guard before provider; geometries=${(spatial.geometries || []).length} (1957 corridor only); geolocation/storage/analytics=0; CSP unsafe-eval=0; hosts=${allow.length}; entry=1 (Thread)`);
