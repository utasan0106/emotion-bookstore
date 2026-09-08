'use strict';

// Public regional data only. No request parameters, IPs, cookies or user content
// are forwarded to JMA. Keep URLs fixed rather than exposing a proxy endpoint.
const FORECAST_URL = 'https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json';
const LATEST_URL = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt';
const STATIONS = { '44132': '東京', '44071': '練馬' };
const TTL = 15 * 60 * 1000;
const OBSERVATION_MAX_AGE = 90 * 60 * 1000;
let cache = null;
let pending = null;

function dayInTokyo(value) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? new Date(ms + 9 * 3600000).toISOString().slice(0, 10) : '';
}
function recent(value, now, maxAge) {
  const age = now - Date.parse(value);
  return Number.isFinite(age) && age >= -5 * 60000 && age <= maxAge;
}
function selectForecast(data, now) {
  const today = dayInTokyo(now);
  const report = Array.isArray(data) && data.find(r => Array.isArray(r?.timeSeries) && r.timeSeries.some(s => Array.isArray(s?.areas) && s.areas.some(a => a?.weathers)));
  if (!report || !recent(report.reportDatetime, now, 36 * 3600000)) return null;
  const series = report.timeSeries.find(s => Array.isArray(s?.areas) && s.areas.some(a => a?.area?.code === '130010' && Array.isArray(a.weathers)));
  const index = Array.isArray(series?.timeDefines) ? series.timeDefines.findIndex(t => dayInTokyo(t) === today) : -1;
  if (index == null || index < 0) return null;
  const area = series.areas.find(a => a?.area?.code === '130010' && Array.isArray(a.weathers));
  const description = area.weathers[index];
  const code = String(area.weatherCodes?.[index] || '');
  if (typeof description !== 'string' || !description.trim() || !/^[1-4]\d{2}$/.test(code)) return null;
  // Theme follows the principal category of today's forecast, not a claim about
  // the weather at this minute. Keep the complete official wording visible.
  const theme = { '1': 'clear', '2': 'cloudy', '3': 'rain', '4': 'snow' }[code[0]];
  return { date: today, area: '東京地方', areaCode: '130010', description: description.replace(/[\s\u3000]+/g, ' ').trim(), code, theme, issuedAt: report.reportDatetime };
}
function selectObservations(data, observedAt, now) {
  if (!recent(observedAt, now, OBSERVATION_MAX_AGE)) return {};
  const stations = {};
  for (const [id, name] of Object.entries(STATIONS)) {
    const reading = data?.[id]?.temp;
    if (!Array.isArray(reading) || reading[1] !== 0 || typeof reading[0] !== 'number' || !Number.isFinite(reading[0]) || reading[0] < -50 || reading[0] > 60) continue;
    stations[id] = { name, temperature: reading[0], observedAt };
  }
  return stations;
}
async function readText(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json, text/plain' } });
  if (!response.ok) throw new Error('Weather source unavailable');
  const text = await response.text();
  if (text.length > 3000000) throw new Error('Unexpected weather response');
  return text;
}
async function loadWeather(fetcher = fetch, now = Date.now()) {
  const [forecastResult, observationResult] = await Promise.allSettled([
    readText(FORECAST_URL, fetcher).then(JSON.parse),
    (async () => {
      const observedAt = (await readText(LATEST_URL, fetcher)).trim();
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(observedAt) || !recent(observedAt, now, OBSERVATION_MAX_AGE)) return {};
      const stamp = observedAt.slice(0, 19).replace(/[-:T]/g, '');
      const data = JSON.parse(await readText('https://www.jma.go.jp/bosai/amedas/data/map/' + stamp + '.json', fetcher));
      return selectObservations(data, observedAt, now);
    })()
  ]);
  const forecast = forecastResult.status === 'fulfilled' ? selectForecast(forecastResult.value, now) : null;
  const stations = observationResult.status === 'fulfilled' ? observationResult.value : {};
  return { generatedAt: new Date(now).toISOString(), forecast, stations };
}
async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  const now = Date.now();
  let snapshot = cache;
  const cacheTTL = snapshot?.data.forecast || Object.keys(snapshot?.data.stations || {}).length ? TTL : 60000;
  if (!snapshot || now - snapshot.at >= cacheTTL || dayInTokyo(snapshot.at) !== dayInTokyo(now)) {
    if (!pending) pending = loadWeather().then(data => (cache = { at: Date.now(), data })).finally(() => { pending = null; });
    snapshot = await pending;
  }
  const ok = Boolean(snapshot.data.forecast || Object.keys(snapshot.data.stations).length);
  res.statusCode = ok ? 200 : 503;
  // The client also checks date/age: a CDN response crossing midnight must not
  // keep yesterday's design. Unavailable data is retried after one minute.
  res.setHeader('Cache-Control', ok ? 'public, max-age=60, s-maxage=900' : 'no-store');
  res.end(req.method === 'HEAD' ? '' : JSON.stringify(ok ? snapshot.data : { forecast: null, stations: {} }));
}
module.exports = handler;
module.exports.selectForecast = selectForecast;
module.exports.selectObservations = selectObservations;
module.exports.loadWeather = loadWeather;
module.exports.dayInTokyo = dayInTokyo;
