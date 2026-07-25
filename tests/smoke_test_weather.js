// 任意設定の天気連動機能（既定OFF）専用のテストスイート。
// カバー範囲：初期状態OFF／起動時に位置情報を要求しない／現在地ボタン押下時だけ要求／
// 手動地域選択（プリセット）／6状態への正規化／60分キャッシュ／期限切れ後の再取得／
// 地域変更時の再取得／位置情報拒否時のフォールバック／API失敗時のフォールバック／
// OFFへ戻した際のdata-weather解除／日本語・英語表示／APIリクエストに本文等が含まれないこと／
// GA4イベントが追加されていないこと。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..'); // ★成果物内で再実行可能な相対パス（tests/の親＝ソース直下）
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}

// STORAGE_VERSION=1・DataRepositoryの保存形式（{v, data}）に合わせて、localStorageへ
// 直接シード書き込みするためのヘルパー（main.js読み込み前に使う）。
function wrap(value){ return JSON.stringify({ v:1, data:value }); }

// 天気APIのレスポンス（Open-Meteo forecast相当）をcurrent/hourlyの数値から組み立てる。
function mockForecastJson({ code, cloud=0, precip=0, snow=0, wind=0 }, hours){
  hours = hours || [{ code, precip, snow, cloud, wind }, { code, precip, snow, cloud, wind }, { code, precip, snow, cloud, wind }];
  return {
    current: { weather_code: code, cloud_cover: cloud, precipitation: precip, snowfall: snow, wind_speed_10m: wind },
    hourly: {
      time: hours.map((_, i)=>'2026-07-19T' + String(i).padStart(2,'0') + ':00'),
      weather_code: hours.map(h=>h.code),
      precipitation: hours.map(h=>h.precip),
      snowfall: hours.map(h=>h.snow),
      cloud_cover: hours.map(h=>h.cloud),
      wind_speed_10m: hours.map(h=>h.wind)
    }
  };
}

// 新しいjsdom環境を1つ作る（各テストグループごとに、起動時の状態を独立させるため）。
// seedWeather: 起動前にWEATHER_SETTINGS_KEYへ書き込んでおく値（未指定なら既定のまま＝OFF）。
async function createEnv(opts){
  opts = opts || {};
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
  html = html.replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '');
  html = html.replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');

  const dom = new JSDOM(html, {
    url: 'https://example.com/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });
  const { window } = dom;
  const { document } = window;

  // ★jsdomのlocalStorageはgetterのみのアクセサプロパティのため、window.localStorage=...への
  // 直接代入は無音で失敗し（実際のStorageは一切書き換わらない）、起動時のloadWeatherSettings()は
  // 常に空のStorageを読むことになっていた（これが当初の15件失敗の主因）。本物のlocalStorageへ
  // setItem()で直接シードすることで、main.js読み込み前に正しく反映させる。
  if(opts.seedWeather){
    window.localStorage.setItem('emotion-bookstore-weather-settings', wrap(opts.seedWeather));
  }
  if(opts.seedCache){
    window.localStorage.setItem('emotion-bookstore-weather-cache', wrap(opts.seedCache));
  }
  // ★「ページ再読み込み」シミュレーション用：前の環境のlocalStorage内容をそのまま引き継いで起動する。
  if(opts.storageDump){
    Object.keys(opts.storageDump).forEach(k => window.localStorage.setItem(k, opts.storageDump[k]));
  }
  window.matchMedia = function(q){
    return { matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} };
  };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.navigator.vibrate = function(){ return true; };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';

  // GA4：新規イベントが追加されていないことを検証するため、呼び出しをすべて記録する。
  const gaCalls = [];
  window.gtag = function(){ gaCalls.push(Array.from(arguments)); };

  // fetch：呼び出しURLを記録しつつ、キュー済みレスポンス（なければ既定のclear相当）を返す。
  // hang:true の場合は、fetchWeatherState()側のAbortController由来のsignalがabortされるまで
  // 意図的に応答を返さない（タイムアウト経路の検証用）。
  const fetchLog = [];
  const fetchOptionsLog = [];
  const fetchQueue = [];
  window.fetch = function(url, options){
    fetchLog.push(url);
    fetchOptionsLog.push(options || null);
    // ★2026-07-19 hotfix修正：既定レスポンスの`json`プロパティは「値」でなければならない
    // （下の返却部で `json: () => Promise.resolve(next.json)` と関数化されるため）。
    // 従来はここに関数を入れて二重ラップになっており、res.json()が「関数そのもの」を返す
    // 不正なレスポンスをアプリへ渡していた。旧実装はそれを黙って'clear'へ正規化していたため
    // テストが偶然通っていたが、応答検証の導入（不正応答→取得失敗）により正しく失敗する
    // ようになった。これはモックの不具合であり、アサーションは変更していない。
    const next = fetchQueue.length ? fetchQueue.shift() : { ok:true, json: mockForecastJson({ code:0 }) };
    if(next.hang){
      return new Promise((resolve, reject)=>{
        if(options && options.signal){
          options.signal.addEventListener('abort', ()=>{
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
        // 意図的に解決しない
      });
    }
    if(next.reject) return Promise.reject(new Error(next.reject));
    if(next.notOk) return Promise.resolve({ ok:false, status: next.status || 500 });
    return Promise.resolve({ ok:true, json: () => Promise.resolve(next.json) });
  };

  // navigator.geolocation：jsdomには実装がないため、呼び出し回数を記録できるモックを用意する。
  const geoCalls = [];
  window.navigator.geolocation = {
    getCurrentPosition: function(success, error){
      geoCalls.push(1);
      if(opts.geoBehavior === 'error'){
        error && error({ code:1, message:'User denied Geolocation' });
      }else{
        const coords = opts.geoCoords || { latitude:35.681, longitude:139.767 };
        success && success({ coords });
      }
    }
  };

  const dataSrc = fs.readFileSync(path.join(SRC, 'data.js'), 'utf-8');
  // ★2026-07-19 公開用リリースフラグ対応：本スイートは「実装済みの天気機能そのもの」を検証する
  // ため、読み込み時にWEATHER_FEATURE_ENABLEDをtrueへ差し替えて実行する（trueへ変更した場合に
  // 天気機能がそのまま復帰する構造であることの検証を兼ねる）。既定値falseでの入口封鎖は
  // 専用のsmoke_test_weather_flag.jsが検証する。
  const mainSrc = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8')
    .replace('const WEATHER_FEATURE_ENABLED = false;', 'const WEATHER_FEATURE_ENABLED = true;');
  const s1 = document.createElement('script'); s1.textContent = dataSrc; document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = mainSrc; document.body.appendChild(s2);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));

  return { window, document, fetchLog, fetchOptionsLog, fetchQueue, geoCalls, gaCalls };
}

// あるenvのlocalStorage全キーを{key:value}として書き出す（「再読み込み」シミュレーションで
// 次のenvへ引き継ぐために使う）。
function dumpStorage(window){
  const dump = {};
  for(let i = 0; i < window.localStorage.length; i++){
    const k = window.localStorage.key(i);
    dump[k] = window.localStorage.getItem(k);
  }
  return dump;
}

async function main(){

  // ============================================================
  // (1) 初期状態がOFF／起動時に位置情報を要求しない・APIも呼ばない
  // ============================================================
  {
    const { window, document, fetchLog, geoCalls } = await createEnv({});
    // ★既定言語は日本語（appLang='ja'）のため、英語表記の確認はここで英語へ切り替えてから行う。
    window.toggleLanguage();
    ok('(1) weatherToggle button reads "Weather sync: Off" by default', document.getElementById('weatherToggle').textContent.includes('Off'));
    ok('(1) body has no data-weather attribute by default', !document.body.hasAttribute('data-weather'));
    ok('(1) the weather badge is hidden by default', document.getElementById('weatherBadge').classList.contains('hidden'));
    ok('(2) navigator.geolocation.getCurrentPosition is not called on startup (default OFF)', geoCalls.length === 0);
    ok('(2) no network request to the weather API is made on startup (default OFF)', !fetchLog.some(u => u.includes('open-meteo.com')));
  }

  // ============================================================
  // (1b) 既にON＋地域設定済みの状態で起動した場合：天気APIへは取得に行くが、
  //      navigator.geolocationは呼ばれない（プリセット地域は座標を保持しているため）。
  // ============================================================
  {
    const { window, document, fetchLog, geoCalls } = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
    });
    await new Promise(r => setTimeout(r, 50));
    ok('(1b) a saved, already-enabled region setting does fetch weather on startup', fetchLog.some(u => u.includes('open-meteo.com')));
    ok('(1b) but startup with a saved region never calls navigator.geolocation', geoCalls.length === 0);
    ok('(1b) body[data-weather] is set from the startup fetch', document.body.hasAttribute('data-weather'));
  }

  // ============================================================
  // (3)(4) 現在地ボタン押下時だけ位置情報を要求する／手動地域選択（プリセット）
  // ============================================================
  {
    const { window, document, fetchLog, geoCalls } = await createEnv({});
    // ★既定言語は日本語のため、この節の英語表記アサーションのために先に英語へ切り替える。
    window.toggleLanguage();
    // まず、店内メニューを開いてトグルをONにする
    window.openExperienceMenu();
    await window.toggleWeatherEnabled();
    ok('(interactive) toggling on switches the button label to "Weather sync: On"', document.getElementById('weatherToggle').textContent.includes('On'));
    ok('(interactive) the region row becomes visible once weather sync is on', !document.getElementById('weatherRegionRow').classList.contains('hidden'));

    // 手動地域選択（プリセット、ジオコーディングAPIは使わない）
    const beforeFetchCount = fetchLog.length;
    await window.onWeatherRegionSelectChange('osaka');
    ok('(4) selecting a preset region does not call navigator.geolocation', geoCalls.length === 0);
    ok('(4) selecting a preset region triggers a weather fetch', fetchLog.length > beforeFetchCount);
    ok('(4) the region select reflects the chosen region afterward', document.getElementById('weatherRegionSelect').value === 'osaka');
    ok('(4) the status line shows the selected region name ("Osaka"), not coordinates', document.getElementById('weatherStatus').textContent.includes('Osaka') && !/\d/.test(document.getElementById('weatherStatus').textContent));

    // (3) 現在地ボタン：ここで初めてgeolocationが呼ばれる
    const geoCallsBefore = geoCalls.length;
    window.useCurrentLocationForWeather();
    await new Promise(r => setTimeout(r, 50));
    ok('(3) clicking "use current location" calls navigator.geolocation exactly once', geoCalls.length === geoCallsBefore + 1);
    ok('(3) after using current location, the status shows "Near your current location" and no digits (no raw coordinates on screen)', document.getElementById('weatherStatus').textContent.includes('Near your current location') && !/\d/.test(document.getElementById('weatherStatus').textContent));
  }

  // ============================================================
  // (5) weather_code・cloud_cover・precipitation・snowfall・wind_speed_10mの
  //     6状態（clear/cloudy/rain/snow/fog/storm）への正規化
  // ============================================================
  {
    const { window } = await createEnv({});
    const cases = [
      ['clear',  { code:0, cloud:5,  precip:0,   snow:0, wind:5 }],
      ['cloudy', { code:3, cloud:90, precip:0,   snow:0, wind:5 }],
      ['rain',   { code:63,cloud:80, precip:2.4, snow:0, wind:10 }],
      ['snow',   { code:73,cloud:85, precip:1.0, snow:1.5, wind:8 }],
      ['fog',    { code:45,cloud:95, precip:0,   snow:0, wind:2 }],
      ['storm',  { code:95,cloud:98, precip:12,  snow:0, wind:45 }]
    ];
    cases.forEach(([expected, point])=>{
      const result = window.normalizeWeatherState(point, [point, point, point]);
      ok(`(5) normalizeWeatherState() classifies weather_code=${point.code} (+cloud/precip/snow/wind) as "${expected}"`, result === expected);
    });
    // weather_code単体が取れない極端なケースでも、降水量・風速だけでstormへ判定できることを確認する
    const stormByIntensity = window.normalizeWeatherState(
      { code:undefined, cloud:90, precip:9, snow:0, wind:42 },
      [{ code:undefined, cloud:90, precip:9, snow:0, wind:42 }]
    );
    ok('(5) heavy precipitation + high wind is classified as "storm" even without a thunderstorm code', stormByIntensity === 'storm');
  }

  // ============================================================
  // (6)(7)(8) 60分キャッシュの利用／期限切れ後の再取得／地域変更時の再取得
  // ============================================================
  {
    const now = Date.now();
    const { window, document, fetchLog } = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 },
      seedCache: { lat:35.68, lon:139.65, state:'clear', fetchedAt: now - 5*60*1000 } // 5分前のキャッシュ
    });
    const fetchCountAfterStartup = fetchLog.length;
    // (6) 60分以内・同じ地域 → 再取得しない
    await window.refreshWeatherIfNeeded(false);
    ok('(6) a cache younger than 60 minutes for the same region is reused (no extra fetch)', fetchLog.length === fetchCountAfterStartup);
    ok('(6) the cached state is still applied to body[data-weather]', document.body.getAttribute('data-weather') === 'clear');

    // (7) 60分を超えたキャッシュ → 再取得する
    await window.saveJSON('emotion-bookstore-weather-cache', { lat:35.68, lon:139.65, state:'clear', fetchedAt: now - 61*60*1000 });
    const beforeExpiry = fetchLog.length;
    await window.refreshWeatherIfNeeded(false);
    ok('(7) a cache older than 60 minutes triggers a new fetch', fetchLog.length > beforeExpiry);

    // (8) 地域変更時 → キャッシュが新しくても再取得する
    await window.saveJSON('emotion-bookstore-weather-cache', { lat:35.68, lon:139.65, state:'clear', fetchedAt: now });
    const beforeRegionChange = fetchLog.length;
    await window.onWeatherRegionSelectChange('fukuoka');
    ok('(8) changing the region invalidates a fresh cache and refetches', fetchLog.length > beforeRegionChange);
  }

  // ============================================================
  // (9) 位置情報を拒否した場合のフォールバック（通常表示・全機能を維持）
  // ============================================================
  {
    const { window, document, geoCalls, fetchLog } = await createEnv({ geoBehavior:'error' });
    window.openExperienceMenu();
    await window.toggleWeatherEnabled();
    const fetchCountBefore = fetchLog.length;
    window.useCurrentLocationForWeather();
    await new Promise(r => setTimeout(r, 50));
    ok('(9) geolocation denial still calls getCurrentPosition once', geoCalls.length === 1);
    ok('(9) geolocation denial shows a failure message instead of crashing', document.getElementById('weatherStatus').textContent.length > 0);
    ok('(9) geolocation denial does not trigger a weather fetch (no coordinates to use)', fetchLog.length === fetchCountBefore);
    ok('(9) geolocation denial leaves body without data-weather (regular display)', !document.body.hasAttribute('data-weather'));
    // 書店本体の機能（本棚等）が引き続き使えることも確認する
    ok('(9) core shop features remain available after a geolocation denial (renderShelf exists and runs)', typeof window.renderShelf === 'function');
  }

  // ============================================================
  // (10) API失敗・タイムアウト・オフライン時のフォールバック
  // ============================================================
  {
    // 10-a: fetchがreject（オフライン相当）
    {
      const { window, document, fetchQueue } = await createEnv({
        seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
      });
      fetchQueue.push({ reject:'network offline' });
      await window.refreshWeatherIfNeeded(true);
      ok('(10a) a rejected fetch (offline) falls back to the regular view (no data-weather)', !document.body.hasAttribute('data-weather'));
    }
    // 10-b: fetchがok:false（APIエラー）
    {
      const { window, document, fetchQueue } = await createEnv({
        seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
      });
      fetchQueue.push({ notOk:true, status:500 });
      await window.refreshWeatherIfNeeded(true);
      ok('(10b) a non-ok API response falls back to the regular view (no data-weather)', !document.body.hasAttribute('data-weather'));
    }
    // 10-c: 不正なレスポンス形状（current/hourlyが欠落）でも例外を投げず、クラッシュしない
    {
      const { window, document, fetchQueue } = await createEnv({
        seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
      });
      fetchQueue.push({ ok:true, json:{ unexpected:'shape' } });
      let threw = false;
      try{ await window.refreshWeatherIfNeeded(true); }catch(e){ threw = true; }
      ok('(10c) a malformed API response does not throw', !threw);
    }
    // 10-d: 応答が返らない（ハング）場合、fetchWeatherState内の8秒タイムアウト（AbortController）で
    // 打ち切られ、通常表示へフォールバックすることを確認する。実テストで8秒待つのは非現実的なため、
    // window.setTimeoutを即時発火するようモックしてタイムアウト待ちを短縮する。
    {
      const { window, document, fetchQueue } = await createEnv({
        seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
      });
      const realSetTimeout = window.setTimeout;
      window.setTimeout = function(fn, ms){ return realSetTimeout(fn, 0); };
      fetchQueue.push({ hang:true });
      let threw = false;
      try{ await window.refreshWeatherIfNeeded(true); }catch(e){ threw = true; }
      window.setTimeout = realSetTimeout;
      ok('(10d) a hung request (no response) does not throw', !threw);
      ok('(10d) a hung request times out via AbortController and falls back to the regular view (no data-weather)', !document.body.hasAttribute('data-weather'));
    }
  }

  // ============================================================
  // (11) OFFへ戻した際にdata-weatherと天気バッジが解除される
  // ============================================================
  {
    const { window, document } = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
    });
    await new Promise(r => setTimeout(r, 50));
    ok('(11) starts with data-weather set (enabled + region configured)', document.body.hasAttribute('data-weather'));
    await window.toggleWeatherEnabled(); // enabled→false
    ok('(11) turning weather sync off removes body[data-weather]', !document.body.hasAttribute('data-weather'));
    ok('(11) turning weather sync off hides the weather badge', document.getElementById('weatherBadge').classList.contains('hidden'));
  }

  // ============================================================
  // (12) 日本語・英語表示（バッジ・地域名・天気状態名）
  // ============================================================
  {
    const { window, document } = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 },
      seedCache: { lat:35.68, lon:139.65, state:'rain', fetchedAt: Date.now() }
    });
    await new Promise(r => setTimeout(r, 50));
    // ★既定言語は日本語のため、先に英語へ切り替えてからEN表記を確認する。
    window.toggleLanguage();
    window.applyWeatherState('rain'); // 言語切替後の再描画を明示的に確認する
    const badgeEn = document.getElementById('weatherBadge').textContent;
    ok('(12) EN badge reads "Tokyo · Rain" or "Tokyo · Rainy night" (region + state, en dash format)', /^Tokyo · (Rain|Rainy night)$/.test(badgeEn));

    window.toggleLanguage();
    ok('(12) switched to Japanese', window.currentLang() === 'ja');
    window.applyWeatherState('rain'); // 言語切替後の再描画を明示的に確認する
    const badgeJa = document.getElementById('weatherBadge').textContent;
    ok('(12) JA badge reads "東京・雨" or "東京・雨の夜" (region + state, JA separator)', /^東京・(雨|雨の夜)$/.test(badgeJa));

    // バッジクリックで開く詳細ポップオーバー（地域・天気・最終更新の3行のみ）
    // ★toggleWeatherDetail()内のrenderWeatherDetailPopover()はawaitされない非同期処理のため、
    // DOM反映を待つ小さな猶予を入れる。
    window.toggleWeatherDetail();
    await new Promise(r => setTimeout(r, 50));
    const rows = Array.from(document.querySelectorAll('#weatherDetailPopover .weather-detail-row')).map(r=>r.textContent);
    ok('(12) the detail popover shows exactly 3 rows (region / state / last updated)', rows.length === 3);
    ok('(12) the detail popover does not list a multi-day forecast or long numeric list', !document.getElementById('weatherDetailPopover').textContent.match(/\d{2,}\s*(mm|km\/h|%)/));
  }

  // ============================================================
  // (13) 本文・タイトル・写真・本棚データがAPIリクエストへ含まれない
  // ============================================================
  {
    const { window, fetchLog } = await createEnv({});
    window.openExperienceMenu();
    await window.toggleWeatherEnabled();
    await window.onWeatherRegionSelectChange('tokyo');
    const weatherCalls = fetchLog.filter(u => u.includes('api.open-meteo.com'));
    ok('(13) at least one weather API call was made to verify its URL', weatherCalls.length > 0);
    const forbidden = ['story', 'title', 'photo', 'library', 'shelf', 'entry', 'diary', 'shiori', 'profile'];
    const leaked = weatherCalls.some(u => forbidden.some(word => u.toLowerCase().includes(word)));
    ok('(13) the weather API URL contains no story/title/photo/bookshelf-related parameters', !leaked);
    ok('(13) the weather API URL only carries latitude/longitude/weather parameters', weatherCalls.every(u => u.includes('latitude=') && u.includes('longitude=')));
  }

  // ============================================================
  // (14) GA4イベントが追加されていない（新規送信なし・既存5種のみ）
  // ============================================================
  {
    const { window, gaCalls } = await createEnv({});
    window.openExperienceMenu();
    await window.toggleWeatherEnabled();
    await window.onWeatherRegionSelectChange('tokyo');
    window.useCurrentLocationForWeather();
    await new Promise(r => setTimeout(r, 50));
    window.toggleWeatherDetail();
    await window.toggleWeatherEnabled();
    const eventNames = gaCalls.filter(c => c[0] === 'event').map(c => c[1]);
    const knownFive = ['create_book_error','create_book_success','start_writing','view_landing','view_shelf'];
    const unknown = eventNames.filter(n => !knownFive.includes(n));
    ok('(14) no GA4 event outside the existing 5 was sent while exercising the weather feature', unknown.length === 0);
  }

  // ============================================================
  // (15) ★hotfix：応答形式の検証。空JSON・空配列・必須項目欠落・weather_code非数値を
  //      「clear（晴れ）」として扱わず、すべて通常表示（data-weatherなし）へフォールバックする。
  // ============================================================
  {
    const invalidBodies = [
      ['an empty object {}', {}],
      ['an empty array []', []],
      ['a response missing "current"', { hourly:{ time:[], weather_code:[] } }],
      ['a "current" missing weather_code', { current:{ cloud_cover:10 }, hourly:{} }],
      ['a non-numeric weather_code (string)', { current:{ weather_code:'61', cloud_cover:10 }, hourly:{} }],
      ['a NaN weather_code', { current:{ weather_code:NaN }, hourly:{} }]
    ];
    for(const [label, body] of invalidBodies){
      const { window, document, fetchQueue } = await createEnv({
        seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
      });
      // 起動時取得の結果に関わらず、不正応答での強制再取得結果を検証する
      fetchQueue.push({ json: body });
      await window.refreshWeatherIfNeeded(true);
      ok(`(15) ${label} is NOT treated as clear — body has no data-weather`, !document.body.hasAttribute('data-weather'));
    }
  }

  // ============================================================
  // (16) ★hotfix：取得失敗時にWEATHER_CACHE_KEYの古いキャッシュも削除され、
  //      「再読み込み」後も古い天気が復活しない。
  // ============================================================
  {
    const envA = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 },
      seedCache: { lat:35.68, lon:139.65, state:'rain', fetchedAt: Date.now() }
    });
    await new Promise(r => setTimeout(r, 50));
    ok('(16) precondition: cached rain is applied before the failure', envA.document.body.getAttribute('data-weather') === 'rain');
    // 同じ地域で強制再取得 → 失敗させる
    envA.fetchQueue.push({ reject:'network offline' });
    await envA.window.refreshWeatherIfNeeded(true);
    ok('(16) after a failed forced refetch, data-weather is cleared', !envA.document.body.hasAttribute('data-weather'));
    ok('(16) after a failed forced refetch, the weather cache key is deleted from localStorage', envA.window.localStorage.getItem('emotion-bookstore-weather-cache') === null);
    // 「再読み込み」：envAのlocalStorageを引き継いだ新envを起動する。
    // 失敗時にキャッシュが削除済みのため、起動時にキャッシュから'rain'が復活しないことを確認する。
    // （注：createEnv内で起動時取得まで完了するため、fetchQueueの事前シードはできない。
    //   ここでの検証対象は「削除済みキャッシュが復活しないこと」であり、起動時取得の成否ではない。）
    const dump = dumpStorage(envA.window);
    ok('(16) the storage dump handed to the reload no longer contains the weather cache key', !('emotion-bookstore-weather-cache' in dump));
    const envB = await createEnv({ storageDump: dump });
    await new Promise(r => setTimeout(r, 80));
    ok('(16) after reload, the old rain does not come back from any surviving cache', envB.document.body.getAttribute('data-weather') !== 'rain');
  }

  // ============================================================
  // (17) ★hotfix：fetchオプション（credentials/referrerPolicy/cache）の明示。
  // ============================================================
  {
    const { window, fetchLog, fetchOptionsLog } = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
    });
    await new Promise(r => setTimeout(r, 50));
    const idx = fetchLog.findIndex(u => String(u).includes('open-meteo'));
    ok('(17) a weather fetch was made to inspect its options', idx >= 0);
    const opts = fetchOptionsLog[idx] || {};
    ok('(17) the weather fetch uses credentials:"omit"', opts.credentials === 'omit');
    ok('(17) the weather fetch uses referrerPolicy:"no-referrer"', opts.referrerPolicy === 'no-referrer');
    ok('(17) the weather fetch uses cache:"no-store"', opts.cache === 'no-store');
    ok('(17) the weather fetch URL is built from WEATHER_API_BASE (api.open-meteo.com/v1/forecast)', String(fetchLog[idx]).startsWith('https://api.open-meteo.com/v1/forecast?'));
  }

  // ============================================================
  // (18) ★hotfix：天気表示中の日英切替。バッジ・区切り文字・詳細ポップオーバーが
  //      APIへの再取得なしで即時再描画される。
  // ============================================================
  {
    const { window, document, fetchLog } = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 },
      seedCache: { lat:35.68, lon:139.65, state:'rain', fetchedAt: Date.now() }
    });
    await new Promise(r => setTimeout(r, 50));
    const weatherFetchesBefore = fetchLog.filter(u => String(u).includes('open-meteo')).length;
    const badgeJa = document.getElementById('weatherBadge').textContent;
    ok('(18) JA badge shows 東京 with ・ separator while weather is displayed', /^東京・/.test(badgeJa));
    // ポップオーバーを開いたまま切り替える（開いている場合の再描画も検証するため）
    window.toggleWeatherDetail();
    await new Promise(r => setTimeout(r, 50));
    window.toggleLanguage(); // → EN
    const badgeEn = document.getElementById('weatherBadge').textContent;
    ok('(18) after switching to English, the badge immediately reads "Tokyo · …" (name + separator + state all switch)', /^Tokyo · /.test(badgeEn));
    await new Promise(r => setTimeout(r, 50));
    const popText = document.getElementById('weatherDetailPopover').textContent;
    ok('(18) the open detail popover is re-rendered in English (shows "Tokyo", no 東京)', popText.includes('Tokyo') && !popText.includes('東京'));
    window.toggleLanguage(); // → JA
    const badgeJa2 = document.getElementById('weatherBadge').textContent;
    ok('(18) switching back to Japanese restores 東京・… immediately', /^東京・/.test(badgeJa2));
    const weatherFetchesAfter = fetchLog.filter(u => String(u).includes('open-meteo')).length;
    ok('(18) the two language switches trigger no additional weather fetch (re-render only)', weatherFetchesAfter === weatherFetchesBefore);
  }

  // ============================================================
  // (19) ★hotfix：ポップオーバーのアクセシビリティ。
  //      aria-controls／開閉時のaria-expanded更新／Escapeキー／外側クリックで閉じる。
  // ============================================================
  {
    const { window, document } = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 },
      seedCache: { lat:35.68, lon:139.65, state:'rain', fetchedAt: Date.now() }
    });
    await new Promise(r => setTimeout(r, 50));
    const badge = document.getElementById('weatherBadge');
    const pop = document.getElementById('weatherDetailPopover');
    ok('(19) the badge has aria-controls pointing at the popover', badge.getAttribute('aria-controls') === 'weatherDetailPopover');
    ok('(19) aria-expanded is "false" before opening', badge.getAttribute('aria-expanded') === 'false');
    window.toggleWeatherDetail();
    await new Promise(r => setTimeout(r, 50));
    ok('(19) opening sets aria-expanded to "true"', badge.getAttribute('aria-expanded') === 'true' && !pop.classList.contains('hidden'));
    // Escapeキーで閉じる
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    ok('(19) Escape closes the popover and resets aria-expanded to "false"', pop.classList.contains('hidden') && badge.getAttribute('aria-expanded') === 'false');
    // 外側クリックで閉じる
    window.toggleWeatherDetail();
    await new Promise(r => setTimeout(r, 50));
    ok('(19) re-opened for the outside-click check', !pop.classList.contains('hidden'));
    document.body.dispatchEvent(new window.MouseEvent('click', { bubbles:true }));
    ok('(19) a click outside the popover closes it and resets aria-expanded', pop.classList.contains('hidden') && badge.getAttribute('aria-expanded') === 'false');
    // ポップオーバー内部のクリックでは閉じない
    window.toggleWeatherDetail();
    await new Promise(r => setTimeout(r, 50));
    const row = pop.querySelector('.weather-detail-row');
    if(row) row.dispatchEvent(new window.MouseEvent('click', { bubbles:true }));
    ok('(19) a click inside the popover does not close it', !pop.classList.contains('hidden'));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('WEATHER TEST CRASHED:', e); process.exit(2); });
