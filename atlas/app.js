/* 街を立体で辿る（β）— Production Beta 0、高円寺だけ。Cultural Signal Lens。
   - 現在の街の形は、Project PLATEAU（杉並区 2025年度）から事前に取り出した same-origin の GeoJSON だけ。
     外部の配信元・タイル・3D エンジン・バイナリ実行モジュールは使わない。
   - 関係が主役、街の形は土台。見方は有限（関係 / 街の形 / 証拠 / 時間 / 現在）。自由な視点操作は無い。
   - 現在の街の形は歴史の証拠ではない（historicalGeometry:false）。1957 は『通り』という範囲まで、
     1961 / 1961–62 / 1963 は地点を作らない。現在の駅は目安（PLATEAU の建物 gml:id から導く）。
   - 位置情報・カメラ・入力欄・保存・計測は使わない。外部 link は allowlist の host だけ、押したときだけ。 */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const EXTERNAL_ALLOW = new Set([
  'koenji-awaodori.com', 'www.koenji-awaodori.com', 'suginamigaku.org', 'www.koenji-pal.jp', 'www.youtube.com',
  'www.mlit.go.jp', 'www.geospatial.jp'
]);
const VIEW_IDS = ['relation', 'city', 'evidence', 'time', 'now'];
const GML_ID = { bldg: /^bldg_[0-9a-f-]{36}$/, tran: /^tran_[0-9a-f-]{36}$/ };
const state = { lens: null, thread: null, runtime: null, buildings: null, roads: null, provenance: null, sceneIndex: 0, view: 'relation', frames: {}, station: null };

async function loadJson(path) {
  if (!/^\.\/data\/[a-z0-9._-]+\.(json|geojson)$/i.test(path)) throw new Error('Not a local data path: ' + path);
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}
function setStatus(text, hold) { const el = $('dataStatus'); el.textContent = text; if (hold) el.dataset.state = 'hold'; else delete el.dataset.state; }
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
function svgEl(tag, attrs) { const n = document.createElementNS(SVG_NS, tag); for (const k in attrs) n.setAttribute(k, String(attrs[k])); return n; }
function externalLink(label, url, kind) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !EXTERNAL_ALLOW.has(u.hostname)) throw new Error('External host not allowlisted: ' + u.hostname);
  const a = el('a', 'al-link', label + ' ↗');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.referrerPolicy = 'no-referrer';
  if (kind) a.appendChild(el('span', 'al-link-kind', kind.replace(/_/g, ' ')));
  return a;
}

/* ---------------------------------------------------------------- contracts (fail closed) */
function validateThread(t) {
  if (!t || t.threadId !== 'koenji-dance-history' || !Array.isArray(t.scenes) || !t.scenes.length) throw new Error('thread data');
  const allowedPolicy = new Set(['overview', 'corridor']);
  const allowedResolution = new Set(['not_applicable', 'street_segment', 'city_overview']);
  for (const s of t.scenes) {
    if (!allowedPolicy.has(s.mapPolicy) || !allowedResolution.has(s.spatialResolution)) throw new Error('scene policy ' + s.id);
    if (s.spatialResolution === 'not_applicable' && s.mapPolicy !== 'overview') throw new Error('non-spatial scene cannot render geometry ' + s.id);
    if (typeof s.precisionCopy !== 'string' || !s.precisionCopy) throw new Error('precision copy ' + s.id);
    for (const id of s.sourceIds || []) if (!t.sources[id]) throw new Error('missing source ' + id);
  }
  for (const id in t.sources) { const u = new URL(t.sources[id].url); if (u.protocol !== 'https:' || !EXTERNAL_ALLOW.has(u.hostname)) throw new Error('source host denied ' + id); }
  if (!t.spatialTruth || t.spatialTruth.historicalGeometry !== false) throw new Error('spatialTruth');
}
function validateLens(l) {
  if (!l || l.city !== 'koenji' || l.threadId !== 'koenji-dance-history') throw new Error('lens data');
  if (!Array.isArray(l.views) || l.views.map((v) => v.id).join() !== VIEW_IDS.join()) throw new Error('views must be exactly ' + VIEW_IDS.join('/'));
  if (!l.corridor || l.corridor.policy !== 'no_band') throw new Error('corridor policy');
  if (!l.presentReference || l.presentReference.historicalClaim !== false || !Array.isArray(l.presentReference.gmlIds) || !l.presentReference.gmlIds.length) throw new Error('present reference');
  for (const k of ['s1961', 's1961_62', 's1963']) if (!l.historicalPoints || l.historicalPoints[k] !== 'none') throw new Error('historical point policy ' + k);
  for (const k of ['overview', 'close']) { const f = l.substrate.frames[k]; if (!Array.isArray(f) || f.length !== 4 || !(f[0] < f[2] && f[1] < f[3])) throw new Error('frame ' + k); }
}
function validateRuntime(r) {
  if (!r || r.production_eligible !== true || r.lineage_required !== true || r.historicalGeometry !== false) throw new Error('runtime manifest is not a certified production candidate');
  const d = r.dataset || {};
  if (String(d.city_code) !== '13115' || Number(d.year) !== 2025 || d.citygml_version !== '2.0') throw new Error('runtime dataset identity');
}
function validateCollection(g, kind) {
  const p = (g && g.properties) || {};
  if (!g || g.type !== 'FeatureCollection' || !Array.isArray(g.features) || !g.features.length) throw new Error(kind + ' collection');
  if (p.plateau_derived !== true || p.development_fixture !== false || String(p.municipality_code) !== '13115' || Number(p.dataset_year) !== 2025 || p.citygml_version !== '2.0' || p.historicalGeometry !== false) throw new Error(kind + ' provenance flags');
  if (p.feature_type !== kind || Number(p.feature_count) !== g.features.length) throw new Error(kind + ' feature count');
  for (const f of g.features) {
    if (typeof f.id !== 'string' || !GML_ID[kind].test(f.id)) throw new Error(kind + ' feature id is not a source gml:id');
    const t = f.geometry && f.geometry.type;
    if (t !== 'Polygon' && t !== 'MultiPolygon') throw new Error(kind + ' geometry type');
  }
}
function validateProvenance(p, b, r) {
  if (!p || p.status !== 'VERIFIED_PLATEAU_DERIVED_WITH_LINEAGE' || p.historicalGeometry !== false) throw new Error('provenance status');
  if (String(p.municipality_code) !== '13115' || Number(p.dataset_year) !== 2025 || p.citygml_version !== '2.0') throw new Error('provenance identity');
  if (Number(p.building_features) !== b.features.length || Number(p.road_features) !== r.features.length) throw new Error('provenance counts');
}

/* ---------------------------------------------------------------- projection (present-day frame only) */
function polygons(geometry) { return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates; }
function makeFrame(bbox, rect) {
  const lat0 = (bbox[1] + bbox[3]) / 2;
  const mx = 111320 * Math.cos(lat0 * Math.PI / 180), my = 110940;
  const wm = (bbox[2] - bbox[0]) * mx, hm = (bbox[3] - bbox[1]) * my;
  const scale = Math.min(rect.w / wm, rect.h / hm);
  const ox = rect.x + (rect.w - wm * scale) / 2, oy = rect.y + (rect.h - hm * scale) / 2;
  return { scale, project: (p) => [ox + (p[0] - bbox[0]) * mx * scale, oy + (bbox[3] - p[1]) * my * scale] };
}
function pathD(points, close) { let d = ''; for (let i = 0; i < points.length; i++) d += (i ? 'L' : 'M') + points[i][0].toFixed(1) + ' ' + points[i][1].toFixed(1); return close ? d + 'Z' : d; }

function renderSubstrate(frame) {
  const visual = state.lens.substrate.visual;
  const hpx = (h) => Math.min(h, visual.maxVisualHeightMetres) * visual.pxPerMetreOfHeight * frame.scale;
  const roads = $('roadLayer'), bldgs = $('buildingLayer');
  roads.replaceChildren(); bldgs.replaceChildren();
  for (const f of state.roads.features) {
    let d = '';
    for (const poly of polygons(f.geometry)) for (const ring of poly) d += pathD(ring.map(frame.project), true);
    const p = svgEl('path', { d, 'data-gml-id': f.id }); roads.appendChild(p);
  }
  const stationIds = new Set(state.lens.presentReference.gmlIds);
  const items = [];
  for (const f of state.buildings.features) {
    const rings = polygons(f.geometry).map((poly) => poly[0].map(frame.project));
    let cx = 0, cy = 0, n = 0; for (const r of rings) for (const p of r) { cx += p[0]; cy += p[1]; n++; }
    items.push({ f, rings, depth: cy / n - 0.25 * (cx / n) });
  }
  items.sort((a, b) => a.depth - b.depth); /* 奥（上・右）から手前へ */
  for (const it of items) {
    const h = it.f.properties.measuredHeight;
    const g = svgEl('g', { 'data-gml-id': it.f.id, class: stationIds.has(it.f.id) ? 'al-building al-station' : 'al-building' });
    if (typeof h !== 'number' || !(h > 0)) {
      for (const r of it.rings) g.appendChild(svgEl('path', { class: 'al-flat', d: pathD(r, true) }));
    } else {
      const dz = hpx(h), dx = dz * 0.25;
      let sides = '', tops = '';
      for (const r of it.rings) {
        const top = r.map((p) => [p[0] + dx, p[1] - dz]);
        for (let i = 0; i < r.length - 1; i++) sides += pathD([r[i], r[i + 1], top[i + 1], top[i]], true);
        tops += pathD(top, true);
      }
      g.appendChild(svgEl('path', { class: 'al-side', d: sides }));
      g.appendChild(svgEl('path', { class: 'al-top', d: tops }));
    }
    bldgs.appendChild(g);
  }
  /* 現在の駅（目安）: PLATEAU の建物 gml:id から外接矩形の中心を導く。歴史上の地点ではない。 */
  const ref = $('refLayer'); ref.replaceChildren();
  const pts = [];
  for (const f of state.buildings.features) if (stationIds.has(f.id)) for (const poly of polygons(f.geometry)) for (const p of poly[0]) pts.push(p);
  if (pts.length) {
    const lon = (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2;
    const lat = (Math.min(...pts.map((p) => p[1])) + Math.max(...pts.map((p) => p[1]))) / 2;
    const [x, y] = frame.project([lon, lat]);
    const label = state.lens.presentReference.label;
    const w = label.length * 30 + 24;
    ref.appendChild(svgEl('rect', { class: 'al-ref-plate', x: (x - w / 2).toFixed(1), y: (y - 70).toFixed(1), width: w, height: 44, rx: 2 }));
    const t = svgEl('text', { class: 'al-ref-label', x: x.toFixed(1), y: (y - 38).toFixed(1), 'text-anchor': 'middle' }); t.textContent = label; ref.appendChild(t);
    ref.appendChild(svgEl('circle', { class: 'al-ref-dot', cx: x.toFixed(1), cy: y.toFixed(1), r: 9 }));
    state.station = { lon, lat };
  }
}
function applyFrame(name) {
  const rect = { x: 0, y: 30, w: 1000, h: 860 };
  if (!state.frames[name]) state.frames[name] = makeFrame(state.lens.substrate.frames[name], rect);
  renderSubstrate(state.frames[name]);
  document.querySelector('.al-lens').dataset.frame = name;
}

/* ---------------------------------------------------------------- views (finite) */
function renderViews() {
  const nav = $('views'); nav.replaceChildren();
  for (const v of state.lens.views) {
    const b = el('button', 'al-view', v.label); b.type = 'button'; b.dataset.view = v.id; b.setAttribute('aria-pressed', v.id === state.view ? 'true' : 'false');
    b.addEventListener('click', () => setView(v.id)); nav.appendChild(b);
  }
}
function setView(id) {
  const v = state.lens.views.find((x) => x.id === id); if (!v) return;
  const previous = state.view; state.view = id;
  const lens = document.querySelector('.al-lens'); lens.dataset.view = id;
  lens.classList.toggle('al-lens-emphasis', id === 'time');
  for (const b of $('views').children) b.setAttribute('aria-pressed', b.dataset.view === id ? 'true' : 'false');
  $('viewChapter').textContent = v.chapter; $('viewCaption').textContent = v.caption;
  if (!previous || state.lens.views.find((x) => x.id === previous).frame !== v.frame || !$('buildingLayer').childElementCount) applyFrame(v.frame);
  if (id === 'evidence') $('evidenceDetails').open = true;
  if (id === 'now') selectScene(state.thread.scenes.length - 1);
}

/* ---------------------------------------------------------------- timeline + story */
function renderTimeline() {
  const rail = $('timeline'); rail.replaceChildren();
  state.thread.scenes.forEach((s, i) => {
    const b = el('button', 'al-rail-item'); b.type = 'button'; b.appendChild(el('strong', '', s.year)); b.appendChild(document.createTextNode(s.title));
    b.setAttribute('aria-pressed', i === state.sceneIndex ? 'true' : 'false'); b.addEventListener('click', () => selectScene(i)); rail.appendChild(b);
  });
}
function renderStory() {
  const s = state.thread.scenes[state.sceneIndex];
  $('year').textContent = s.year; $('title').textContent = s.title; $('claim').textContent = s.claim; $('precision').textContent = s.precisionCopy; $('relation').textContent = s.relation;
  const note = $('note'); note.hidden = !s.note; note.textContent = s.note || '';
  const links = $('links'); links.replaceChildren();
  for (const id of s.sourceIds || []) { const src = state.thread.sources[id]; const li = el('li', 'al-link-item'); li.appendChild(externalLink(src.label, src.url, src.kind)); links.appendChild(li); }
  const last = state.sceneIndex === state.thread.scenes.length - 1;
  $('nextBtn').textContent = last ? '最初から辿る ↺' : '次の関係へ →';
  [...$('timeline').children].forEach((b, i) => b.setAttribute('aria-pressed', i === state.sceneIndex ? 'true' : 'false'));
  $('evidenceDetails').open = state.view === 'evidence';
}
function selectScene(i) { state.sceneIndex = i; renderStory(); }

function renderLegend() { const ul = $('legend'); ul.replaceChildren(); for (const item of state.lens.legend) { const li = el('li'); const sw = el('span', 'al-swatch'); sw.dataset.key = item.id; sw.setAttribute('aria-hidden', 'true'); li.appendChild(sw); li.appendChild(document.createTextNode(item.label)); ul.appendChild(li); } }
function renderHero() {
  const h = state.lens.hero; $('heroEyebrow').textContent = h.eyebrow; $('heroTitle').textContent = h.title; $('heroLead').textContent = h.lead; $('heroNote').textContent = h.note;
  $('returnLead').textContent = state.lens.return.lead; const rl = $('returnLink'); rl.textContent = state.lens.return.label + ' →'; rl.href = state.lens.return.href;
}
function renderProvenance() {
  const p = state.provenance;
  $('attribution').textContent = p.license.attribution_text;
  $('provenanceNote').textContent = '対象範囲: 高円寺駅周辺（事前に取り出した建物 ' + p.building_features.toLocaleString('ja-JP') + ' 件・道路 ' + p.road_features.toLocaleString('ja-JP') + ' 件、CityGML ' + p.citygml_version + '、' + p.spec + '）。' + p.license.readme_caution;
}

async function init() {
  try {
    [state.lens, state.thread] = await Promise.all([loadJson('./data/koenji-lens.json'), loadJson('./data/koenji-thread.json')]);
    validateLens(state.lens); validateThread(state.thread);
    renderHero(); renderViews(); renderTimeline(); renderLegend(); renderStory();
  } catch (e) {
    setStatus('文化データを読み込めませんでした。スレッドへ戻って本文を読めます。', true);
    return;
  }
  try {
    state.runtime = await loadJson(state.lens.substrate.runtime); validateRuntime(state.runtime);
    [state.buildings, state.roads, state.provenance] = await Promise.all([loadJson(state.runtime.buildings), loadJson(state.runtime.roads), loadJson(state.runtime.provenance)]);
    validateCollection(state.buildings, 'bldg'); validateCollection(state.roads, 'tran'); validateProvenance(state.provenance, state.buildings, state.roads);
    for (const id of state.lens.presentReference.gmlIds) if (!state.buildings.features.some((f) => f.id === id)) throw new Error('present reference gml:id missing ' + id);
    setView('relation');
    renderProvenance();
    setStatus('現在の街の形: Project PLATEAU 杉並区（2025年度）から事前に取り出した建物 ' + state.buildings.features.length.toLocaleString('ja-JP') + ' 件・道路 ' + state.roads.features.length.toLocaleString('ja-JP') + ' 件（このサイト内のデータ）。歴史の証拠ではありません。', false);
  } catch (e) {
    /* 街の形が出なくても、関係・資料・現実への導線は失わない。 */
    state.buildings = null; state.roads = null;
    $('roadLayer').replaceChildren(); $('buildingLayer').replaceChildren(); $('refLayer').replaceChildren();
    const v = state.lens.views[0]; $('viewChapter').textContent = v.chapter; $('viewCaption').textContent = '現在の街の形を表示できませんでした。関係と資料はこのまま読めます。';
    setStatus('現在の街の形を表示できません（' + (e && e.message ? e.message : 'unknown') + '）。関係と資料はこのまま読めます。', true);
  }
}
$('nextBtn').addEventListener('click', () => selectScene((state.sceneIndex + 1) % state.thread.scenes.length));
window.addEventListener('DOMContentLoaded', init);
})();
