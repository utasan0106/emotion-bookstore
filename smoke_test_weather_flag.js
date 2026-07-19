// ★2026-07-19 公開用リリースフラグ（WEATHER_FEATURE_ENABLED）専用テストスイート。
// 既定値false（公開状態）で天気機能の入口が完全に閉じていること、および
// trueへ変更すると実装済みの天気機能がそのまま復帰する構造であることを検証する。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..'); // ★成果物内で再実行可能な相対パス（tests/の親＝ソース直下）
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}
function wrap(value){ return JSON.stringify({ v:1, data:value }); }

// forceFlagTrue: trueならWEATHER_FEATURE_ENABLEDをtrueへ差し替えて読み込む（復帰構造の検証用）。
// 既定（false指定なし）はmain.jsを一切書き換えず、出荷時のフラグ値のまま実行する。
async function createEnv(opts){
  opts = opts || {};
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
  html = html.replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '');
  html = html.replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');
  const dom = new JSDOM(html, { url:'https://example.com/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true });
  const { window } = dom;
  const { document } = window;
  if(opts.seedWeather){
    window.localStorage.setItem('emotion-bookstore-weather-settings', wrap(opts.seedWeather));
  }
  if(opts.seedCache){
    window.localStorage.setItem('emotion-bookstore-weather-cache', wrap(opts.seedCache));
  }
  window.matchMedia = function(q){ return { matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }; };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.navigator.vibrate = function(){ return true; };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';
  const gaCalls = [];
  window.gtag = function(){ gaCalls.push(Array.from(arguments)); };
  const fetchLog = [];
  window.fetch = function(url){
    fetchLog.push(String(url));
    return Promise.resolve({ ok:true, json: () => Promise.resolve({
      current: { weather_code:61, cloud_cover:80, precipitation:0.5, snowfall:0, wind_speed_10m:5 },
      hourly: { time:['a','b','c'], weather_code:[61,61,61], cloud_cover:[80,80,80], precipitation:[0.5,0.5,0.5], snowfall:[0,0,0], wind_speed_10m:[5,5,5] }
    }) });
  };
  const geoCalls = [];
  window.navigator.geolocation = {
    getCurrentPosition: function(success){ geoCalls.push(1); success && success({ coords:{ latitude:35.681, longitude:139.767 } }); }
  };
  const dataSrc = fs.readFileSync(path.join(SRC, 'data.js'), 'utf-8');
  let mainSrc = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');
  if(opts.forceFlagTrue){
    mainSrc = mainSrc.replace('const WEATHER_FEATURE_ENABLED = false;', 'const WEATHER_FEATURE_ENABLED = true;');
  }
  const s1 = document.createElement('script'); s1.textContent = dataSrc; document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = mainSrc; document.body.appendChild(s2);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));
  return { window, document, fetchLog, geoCalls, gaCalls };
}

async function main(){

  // ============================================================
  // (0) ソース上の初期値がfalseであること
  // ============================================================
  {
    const src = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');
    ok('(0) main.js ships with `const WEATHER_FEATURE_ENABLED = false;`', src.includes('const WEATHER_FEATURE_ENABLED = false;'));
    ok('(0) the flag is declared exactly once', (src.match(/WEATHER_FEATURE_ENABLED = /g) || []).length === 1);
  }

  // ============================================================
  // (1) 初期値false：天気設定UI・バッジが非表示／通信ゼロ／geolocationゼロ
  // ============================================================
  {
    const { window, document, fetchLog, geoCalls } = await createEnv({});
    const settings = document.getElementById('weatherSettings');
    ok('(1) #weatherSettings is hidden (class)', settings.classList.contains('hidden'));
    ok('(1) #weatherSettings is hidden (hidden attribute)', settings.hidden === true);
    const badge = document.getElementById('weatherBadge');
    ok('(1) #weatherBadge is hidden', badge.classList.contains('hidden') && badge.hidden === true);
    ok('(1) the weather detail popover is hidden', document.getElementById('weatherDetailPopover').classList.contains('hidden'));
    ok('(1) zero fetches to the weather API on startup', !fetchLog.some(u => u.includes('open-meteo')));
    ok('(1) zero navigator.geolocation calls', geoCalls.length === 0);
    ok('(1) body has no data-weather (regular display)', !document.body.hasAttribute('data-weather'));
  }

  // ============================================================
  // (2) 保存済みの天気設定がON（地域設定済み）でも、読み込まれず通信しない
  // ============================================================
  {
    const { window, document, fetchLog, geoCalls } = await createEnv({
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 },
      seedCache: { lat:35.68, lon:139.65, state:'rain', fetchedAt: Date.now() }
    });
    await new Promise(r => setTimeout(r, 80));
    ok('(2) a saved enabled weather setting triggers no weather API fetch', !fetchLog.some(u => u.includes('open-meteo')));
    ok('(2) a saved enabled weather setting triggers no geolocation call', geoCalls.length === 0);
    ok('(2) body[data-weather] stays unset even with a saved rain cache (regular display)', !document.body.hasAttribute('data-weather'));
    ok('(2) the badge stays hidden even with saved settings + cache', document.getElementById('weatherBadge').classList.contains('hidden'));
    ok('(2) the saved settings in localStorage are left untouched (not deleted, not rewritten)', window.localStorage.getItem('emotion-bookstore-weather-settings') !== null);
  }

  // ============================================================
  // (3) false時も通常機能（言語切替・演出設定・表紙）へ影響しない
  // ============================================================
  {
    const { window, document, gaCalls } = await createEnv({});
    let threw = false;
    try{
      window.toggleLanguage();
      window.toggleLanguage();
      window.openSampleBook();
      window.closeSampleBook();
    }catch(e){ threw = true; }
    ok('(3) language toggle and the sample book work with the flag off (no exception)', !threw);
    ok('(3) the cover CTA is still present', !!document.querySelector('.enter-btn'));
    const eventNames = gaCalls.filter(c => c[0] === 'event').map(c => c[1]);
    const knownFive = ['create_book_error','create_book_success','start_writing','view_landing','view_shelf'];
    ok('(3) no GA4 event outside the existing 5', eventNames.every(n => knownFive.includes(n)));
  }

  // ============================================================
  // (4) trueへ変更すると、実装済みの天気機能がそのまま復帰する
  // ============================================================
  {
    const { window, document, fetchLog } = await createEnv({
      forceFlagTrue: true,
      seedWeather: { enabled:true, source:'region', regionId:'tokyo', lat:35.68, lon:139.65 }
    });
    await new Promise(r => setTimeout(r, 80));
    ok('(4) with the flag true, #weatherSettings is visible again', !document.getElementById('weatherSettings').classList.contains('hidden'));
    ok('(4) with the flag true, a saved enabled region fetches weather on startup', fetchLog.some(u => u.includes('open-meteo')));
    ok('(4) with the flag true, body[data-weather] is applied', document.body.hasAttribute('data-weather'));
    ok('(4) with the flag true, the badge is shown', !document.getElementById('weatherBadge').classList.contains('hidden'));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('WEATHER FLAG TEST CRASHED:', e); process.exit(2); });
