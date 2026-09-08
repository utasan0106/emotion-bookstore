'use strict';
(function () {
  if (document.documentElement.lang !== 'ja' || document.querySelector('[data-city-weather]')) return;
  const cities = {
    tokyo: { label: '東京', station: '44132' },
    koenji: { label: '高円寺', station: '44071' },
    kichijoji: { label: '吉祥寺', station: '44071' },
    shimokitazawa: { label: '下北沢', station: '44132' },
    jinbocho: { label: '神保町', station: '44132' }
  };
  const path = location.pathname;
  const params = new URLSearchParams(location.search);
  const cityFromPath = path.match(/^\/discover\/([^/]+)\//)?.[1];
  const eligible = path === '/' || path === '/index.html' || path === '/shelf.html' || /^\/discover\/(?:index\.html)?$/.test(path) || /^\/discover\/[^/]+\/(?:(?:index|audio|video|book|film)\.html)?$/.test(path) || /^\/outings\/(?:index\.html)?$/.test(path);
  if (!eligible) return;
  const main = document.querySelector('main');
  if (!main) return;
  const initial = cityFromPath || params.get('shelf') || params.get('city') || 'tokyo';
  let city = cities[initial] ? initial : 'tokyo';
  let data = null;
  let inFlight = false;
  let lastAttempt = 0;
  let dismissed = false;
  const wrapper = document.createElement('div');
  wrapper.className = 'city-weather-wrap';
  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'city-weather-restore';
  restore.textContent = '天気を表示';
  restore.hidden = true;
  restore.setAttribute('aria-controls', 'city-weather-panel');
  restore.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('section');
  panel.id = 'city-weather-panel';
  panel.className = 'city-weather';
  panel.dataset.cityWeather = '';
  panel.setAttribute('aria-label', '街の天気と気温');
  panel.innerHTML = '<div class="city-weather-row"><label class="city-weather-place">街 <select aria-label="天気を調べる街"></select></label><button class="city-weather-close" type="button" aria-label="天気を閉じる">閉じる ×</button><span class="city-weather-icon" data-weather-icon aria-hidden="true">—</span><p class="city-weather-reading" role="status">天気を読み込んでいます</p><details class="city-weather-details"><summary>予報・観測地点</summary><div class="city-weather-info"><p data-weather-forecast></p><p data-weather-observation></p><p>予報は東京地方、気温は選んだ街の近くの観測地点の値です。</p><p><a href="https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=130000" target="_blank" rel="noopener noreferrer">出典：気象庁</a>の予報・観測データを整理して表示</p></div></details></div>';
  const select = panel.querySelector('select');
  Object.entries(cities).forEach(([key, item]) => {
    const option = document.createElement('option'); option.value = key; option.textContent = item.label; select.append(option);
  });
  select.value = city;
  wrapper.append(panel, restore);
  const homeWeather = document.querySelector('[data-home-weather]');
  if (homeWeather) homeWeather.append(wrapper); else main.append(wrapper);
  const details = panel.querySelector('details');
  const summaryControl = panel.querySelector('summary');
  details.addEventListener('toggle', () => { summaryControl.textContent = details.open ? '詳細を閉じる' : '予報・観測地点'; });
  panel.querySelector('.city-weather-close').addEventListener('click', () => {
    dismissed = true;
    panel.hidden = true;
    details.open = false;
    restore.hidden = false;
    restore.setAttribute('aria-expanded', 'false');
    delete document.body.dataset.cityWeather;
    restore.focus();
  });
  restore.addEventListener('click', () => {
    dismissed = false;
    panel.hidden = false;
    restore.hidden = true;
    restore.setAttribute('aria-expanded', 'true');
    render();
    refresh();
    select.focus();
  });
  const reading = panel.querySelector('.city-weather-reading');
  const forecastLine = panel.querySelector('[data-weather-forecast]');
  const observationLine = panel.querySelector('[data-weather-observation]');
  const dateKey = value => {
    const n = new Date(value).getTime();
    return Number.isFinite(n) ? new Date(n + 9 * 3600000).toISOString().slice(0, 10) : '';
  };
  const time = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  function render() {
    if (dismissed) return;
    const now = Date.now();
    const forecast = data?.forecast?.date === dateKey(now) && now - Date.parse(data.forecast.issuedAt) <= 36 * 3600000 && now - Date.parse(data.forecast.issuedAt) >= -300000 ? data.forecast : null;
    const obs = data?.stations?.[cities[city].station];
    const age = now - Date.parse(obs?.observedAt);
    const validObs = obs && Number.isFinite(obs.temperature) && age >= -300000 && age <= 90 * 60000;
    const themes = { clear: '晴れ', cloudy: 'くもり', rain: '雨', snow: '雪' };
    const theme = forecast && themes[forecast.theme] ? forecast.theme : '';
    const icon = panel.querySelector('[data-weather-icon]');
    if (icon) icon.textContent = { clear: '☀', cloudy: '☁', rain: '☂', snow: '❄' }[theme] || '—';
    const summary = [];
    if (forecast) summary.push('今日の予報 · ' + forecast.description.split('所により')[0].trim());
    if (validObs) summary.push(obs.temperature.toFixed(1) + '℃（' + obs.name + '・' + time(obs.observedAt) + '）');
    reading.textContent = summary.length ? summary.join('　') : '天気・気温は現在取得できません';
    forecastLine.textContent = forecast ? '東京地方：' + forecast.description + '（' + time(forecast.issuedAt) + '発表）' : '今日の予報は取得できません。';
    observationLine.textContent = validObs ? cities[city].label + 'の近くの観測地点：' + obs.name + '。' + time(obs.observedAt) + '、' + obs.temperature.toFixed(1) + '℃。' : '新しい観測気温は取得できません。';
    if (theme) document.body.dataset.cityWeather = theme;
    else delete document.body.dataset.cityWeather;
  }
  async function refresh() {
    if (lastAttempt) render();
    if (dismissed || inFlight || document.hidden || Date.now() - lastAttempt < 60000) return;
    inFlight = true; lastAttempt = Date.now();
    try {
      // Keep the existing same-origin Preview session; nothing is forwarded to JMA.
      const response = await fetch('/api/tokyo-weather', { credentials: 'same-origin', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(42000) });
      if (!response.ok) throw new Error('unavailable');
      data = await response.json();
    } catch (_) { data = null; }
    finally { inFlight = false; render(); }
  }
  select.addEventListener('change', () => { city = select.value; render(); });
  document.addEventListener('visibilitychange', () => {
    document.body.dataset.weatherVisibility = document.hidden ? 'hidden' : 'visible';
    if (!document.hidden) refresh();
  });
  // Clear yesterday's theme and stale readings at most one minute after expiry,
  // while keeping network refreshes fifteen minutes apart.
  setInterval(() => {
    if (dismissed || document.hidden) return;
    if (Date.now() - lastAttempt >= 15 * 60000) refresh();
    else if (!inFlight) render();
  }, 60000);
  refresh();
})();
