// WeatherPrototype1（時間帯のみ版）受入テスト。
// 端末時刻だけで表紙の「店外の空の色」を変える演出の検証。
// 位置情報・天気API・外部通信・保存は一切行わないことを機械的に確認する。
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const SRC = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(l,c){ if(c){pass++;console.log('PASS:',l);}else{fail++;console.log('FAIL:',l);} }

async function createEnv(opts){
  opts=opts||{};
  let html=fs.readFileSync(path.join(SRC,'index.html'),'utf-8')
    .replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/,'').replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/,'');
  const dom=new JSDOM(html,{url:'https://example.com/',runScripts:'dangerously',resources:'usable',pretendToBeVisual:true});
  const {window}=dom,{document}=window;
  window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView=function(){};window.scrollTo=function(){};window.navigator.vibrate=()=>true;
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},fillRect(){},clearRect(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'x';window.gtag=function(){};
  const fetchLog=[];window.fetch=u=>{fetchLog.push(String(u));return Promise.resolve({ok:true,json:()=>Promise.resolve({})});};
  // 位置情報APIが呼ばれたら記録する（呼ばれないことの証明用）
  const geoCalls=[];
  window.navigator.geolocation={
    getCurrentPosition:function(){ geoCalls.push('getCurrentPosition'); },
    watchPosition:function(){ geoCalls.push('watchPosition'); }
  };
  const s1=document.createElement('script');s1.textContent=fs.readFileSync(path.join(SRC,'data.js'),'utf-8');document.body.appendChild(s1);
  const s2=document.createElement('script');s2.textContent=fs.readFileSync(path.join(SRC,'main.js'),'utf-8');document.body.appendChild(s2);
  const s3=document.createElement('script');s3.textContent='window.__weatherFlag=function(){return WEATHER_FEATURE_ENABLED;};';document.body.appendChild(s3);
  await new Promise(r=>setTimeout(r,300));await new Promise(r=>setTimeout(r,300));
  return {window,document,fetchLog,geoCalls};
}

async function main(){
  const cssSrc = fs.readFileSync(path.join(SRC,'style.css'),'utf-8');
  const mainSrc = fs.readFileSync(path.join(SRC,'main.js'),'utf-8');

  // ===== 1: 時間帯判定 =====
  {
    const { window } = await createEnv({});
    const f = window.currentDaypart;
    ok('(1) currentDaypart() is available', typeof f === 'function');
    const cases = [
      [5,'morning'],[7,'morning'],[8,'morning'],
      [9,'day'],[12,'day'],[15,'day'],
      [16,'evening'],[17,'evening'],[18,'evening'],
      [19,'night'],[21,'night'],[22,'night'],
      [23,'midnight'],[0,'midnight'],[3,'midnight'],[4,'midnight']
    ];
    cases.forEach(([h,expected])=>{
      ok(`(1) ${String(h).padStart(2,'0')}:00 -> ${expected}`, f(h) === expected);
    });
    // 24時間すべてが5区分のいずれかに必ず割り当たる（穴がない）
    const all = [];
    for(let h=0;h<24;h++) all.push(f(h));
    ok('(1) all 24 hours resolve to one of the 5 dayparts',
      all.every(d=>['morning','day','evening','night','midnight'].includes(d)));
    ok('(1) all 5 dayparts actually occur during a day',
      new Set(all).size === 5);
  }

  // ===== 2: 表紙にのみ適用され、店内には波及しない =====
  {
    const { window, document } = await createEnv({});
    const hero = document.querySelector('.entrance.hero');
    ok('(2) the cover (.entrance.hero) has a data-daypart attribute after init', hero.hasAttribute('data-daypart'));
    ok('(2) the value is one of the 5 dayparts',
      ['morning','day','evening','night','midnight'].includes(hero.getAttribute('data-daypart')));
    // 店内側の主要セクションに data-daypart が付いていないこと
    ['#desk','#counter','#shelf','#bookshelf','#bookModal','.experience-menu'].forEach(sel=>{
      const el = document.querySelector(sel);
      if(el) ok(`(2) "${sel}" (inside the shop) has NO daypart attribute`, !el.hasAttribute('data-daypart'));
    });
    ok('(2) body itself is not given a daypart attribute (no global sky)',
      !document.body.hasAttribute('data-daypart'));
    ok('(2) exactly one element in the whole document carries data-daypart',
      document.querySelectorAll('[data-daypart]').length === 1);
  }

  // ===== 3: 位置情報・天気API・外部通信を使わない =====
  {
    const { window, fetchLog, geoCalls } = await createEnv({});
    ok('(3) geolocation was NEVER requested', geoCalls.length === 0);
    ok('(3) WEATHER_FEATURE_ENABLED is still false (not flipped on)', window.__weatherFlag() === false);
    const weatherFetches = fetchLog.filter(u=>/weather|openweather|api\.open-meteo|geocod/i.test(u));
    ok('(3) no weather/geocoding API was called', weatherFetches.length === 0);
    ok('(3) the daypart code contains no fetch/XMLHttpRequest', (()=>{
      const fn = (mainSrc.match(/function\s+applyDaypartSky\s*\([\s\S]*?\n\}/)||[''])[0]
               + (mainSrc.match(/function\s+currentDaypart\s*\([\s\S]*?\n\}/)||[''])[0];
      return !/fetch\(|XMLHttpRequest|geolocation/.test(fn);
    })());
    ok('(3) the daypart code writes nothing to localStorage', (()=>{
      const fn = (mainSrc.match(/function\s+applyDaypartSky\s*\([\s\S]*?\n\}/)||[''])[0]
               + (mainSrc.match(/function\s+currentDaypart\s*\([\s\S]*?\n\}/)||[''])[0];
      return !/localStorage|saveJSON/.test(fn);
    })());
    ok('(3) the daypart code only reads the device clock (new Date)',
      /function\s+currentDaypart[\s\S]*?new Date\(\)\.getHours\(\)/.test(mainSrc));
  }

  // ===== 3.5: CSSOMによる実パース検証 =====
  // ★WeatherPrototype1.1追加：正規表現による静的検査は、コメントの閉じ忘れ等でルールが
  // 不正なqualified ruleとして飲み込まれてしまう構文不良を検出できない。
  // ここでは実際にstyle.cssをブラウザ相当のCSSパーサ（jsdomのCSSOM）へ読み込ませ、
  // 5つのセレクタが「独立した有効なCSSRule」として存在することを確認する。
  // 新しい依存ライブラリは追加せず、既存のjsdom環境のみを使う。
  {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const { window } = dom;
    const styleEl = window.document.createElement('style');
    styleEl.textContent = cssSrc;
    window.document.head.appendChild(styleEl);
    const sheet = styleEl.sheet;
    ok('(3.5) style.css was parsed by the CSSOM without throwing', !!sheet);

    // パースされた全ルールのセレクタを収集（@media等のネストも辿る）
    const selectors = [];
    function walk(rules){
      for(const r of rules){
        if(r.selectorText) selectors.push(r.selectorText);
        if(r.cssRules) walk(r.cssRules);
      }
    }
    walk(sheet.cssRules);
    ok('(3.5) the parsed stylesheet contains a meaningful number of rules', selectors.length > 200);

    const wanted = ['morning','day','evening','night','midnight'];
    wanted.forEach(d=>{
      const target = '.entrance.hero[data-daypart="' + d + '"]';
      // CSSOMはセレクタ文字列を正規化することがあるため、引用符の差異を吸収して比較する
      const norm = s=>s.replace(/["']/g,'"').replace(/\s+/g,' ').trim();
      const found = selectors.some(s=>norm(s) === norm(target));
      ok(`(3.5) "${target}" exists as an independent, valid CSS rule`, found);
    });

    // 各ルールが実際に宣言（カスタムプロパティ）を保持していることも確認する
    wanted.forEach(d=>{
      const norm = s=>s.replace(/["']/g,'"').replace(/\s+/g,' ').trim();
      const target = norm('.entrance.hero[data-daypart="' + d + '"]');
      let rule = null;
      function find(rules){
        for(const r of rules){
          if(r.selectorText && norm(r.selectorText) === target) rule = r;
          if(r.cssRules) find(r.cssRules);
        }
      }
      find(sheet.cssRules);
      ok(`(3.5) the "${d}" rule actually carries its declarations (non-empty body)`,
        !!rule && rule.style && rule.style.length > 0);
    });

    // コメントの開閉が全体で釣り合っていること（今回の不具合の直接的な再発防止）
    ok('(3.5) block comments in style.css are balanced (no stray or unclosed */)',
      cssSrc.split('/*').length === cssSrc.split('*/').length);
    ok('(3.5) no orphaned comment fragment leaks before the daypart rules', (()=>{
      // daypartの最初のルール直前に、コメント外の日本語説明行が残っていないこと
      const idx = cssSrc.indexOf('.entrance.hero[data-daypart="morning"]');
      const before = cssSrc.slice(Math.max(0, idx-400), idx);
      const lastClose = before.lastIndexOf('*/');
      const tail = before.slice(lastClose + 2);
      // 直前のコメント閉じ以降に残ってよいのは、空白と /* ... */ のコメントのみ
      return !/[^\s]/.test(tail.replace(/\/\*[\s\S]*?\*\//g, ''));
    })());
  }

  // ===== 4: CSS：5区分すべてに色定義があり、表紙スコープに閉じている =====
  {
    ['morning','day','evening','night','midnight'].forEach(d=>{
      ok(`(4) style.css defines colors for "${d}"`,
        new RegExp('\\.entrance\\.hero\\[data-daypart="'+d+'"\\]\\s*\\{').test(cssSrc));
    });
    // すべての daypart セレクタが .entrance.hero スコープであること（店内へ漏れない）
    const daypartSelectors = cssSrc.match(/^[^\n{]*\[data-daypart[^\n{]*\{/gm) || [];
    ok('(4) every daypart CSS rule is scoped to .entrance.hero (never body or a shop section)',
      daypartSelectors.length > 0 && daypartSelectors.every(s=>/\.entrance\.hero\[data-daypart/.test(s)));
    ok('(4) no daypart rule targets the body element', !/body\[data-daypart/.test(cssSrc));
  }

  // ===== 5: 可読性：ベールの濃度(alpha)は時間帯によらず固定 =====
  {
    const veil = (cssSrc.match(/\.hero-photo::after\s*\{[\s\S]*?\}/)||[''])[0];
    ok('(5) the photo veil keeps its original fixed alphas (0.22 / 0.32 / 0.48)',
      /0\.22/.test(veil) && /0\.32/.test(veil) && /0\.48/.test(veil));
    ok('(5) only the hue (rgb triplet) is variable, via --sky-veil-* custom properties',
      /--sky-veil-top/.test(veil) && /--sky-veil-mid/.test(veil) && /--sky-veil-bottom/.test(veil));
    ok('(5) the veil has a fallback triplet so it renders even without a daypart',
      /var\(--sky-veil-top,\s*11,18,28\)/.test(veil));
    ['morning','day','evening','night','midnight'].forEach(d=>{
      const block = (cssSrc.match(new RegExp('\\.entrance\\.hero\\[data-daypart="'+d+'"\\]\\s*\\{[\\s\\S]*?\\}'))||[''])[0];
      ok(`(5) "${d}" defines veil hues but no alpha override`,
        /--sky-veil-top/.test(block) && !/opacity/.test(block));
    });
  }

  // ===== 6: 演出が「主役」にならない（アニメーション・重い処理を足していない） =====
  {
    ok('(6) no new @keyframes were added for the sky', !/@keyframes\s+(sky|daypart|star|cloud)/i.test(cssSrc));
    ok('(6) the daypart feature adds no canvas/WebGL/requestAnimationFrame', (()=>{
      const fn = (mainSrc.match(/function\s+applyDaypartSky\s*\([\s\S]*?\n\}/)||[''])[0];
      return !/requestAnimationFrame|getContext|WebGL|setInterval/.test(fn);
    })());
    ok('(6) no daypart rule introduces a background-image or video', (()=>{
      return ['morning','day','evening','night','midnight'].every(d=>{
        const block = (cssSrc.match(new RegExp('\\.entrance\\.hero\\[data-daypart="'+d+'"\\]\\s*\\{[\\s\\S]*?\\}'))||[''])[0];
        return !/background-image|url\(|video/.test(block);
      });
    })());
    ok('(6) applyDaypartSky only sets a single attribute (no DOM elements created)', (()=>{
      const fn = (mainSrc.match(/function\s+applyDaypartSky\s*\([\s\S]*?\n\}/)||[''])[0];
      return /setAttribute\('data-daypart'/.test(fn) && !/createElement/.test(fn);
    })());
  }

  // ===== 7: 既存の見た目・機能を壊していない =====
  {
    const { window, document } = await createEnv({});
    ok('(7) the cover copy is unchanged', document.querySelector('.entrance.hero h1').textContent === 'みんなの感情書店');
    ok('(7) the main CTA is unchanged', document.querySelector('.entrance.hero .enter-btn').textContent === '今の気持ちを書く');
    ok('(7) the hero photo element is still present', !!document.querySelector('.hero-photo'));
    ok('(7) the hero seal (shop logo) is still present', !!document.querySelector('.hero-seal'));
    ok('(7) OGP meta is untouched', (()=>{
      const htmlSrc = fs.readFileSync(path.join(SRC,'index.html'),'utf-8');
      return /ogp-emotion-bookstore-20260720\.jpg/.test(htmlSrc);
    })());
    ok('(7) the night-mode class logic still exists (unchanged)', /function applyNightModeIfNeeded/.test(mainSrc));
    // Hotfix4.1の英語棚選択が維持されていること
    ok('(7) the Hotfix4.1 shelf-label fix is still in place',
      /o\.textContent\s*=\s*categoryLabelFor\(c\)/.test(mainSrc));
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e=>{ console.error('WEATHER PROTOTYPE TEST CRASHED:', e); process.exit(2); });
