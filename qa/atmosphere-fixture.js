// Dev-only, explicitly labelled fixtures. Never loaded by delivered HTML.
(()=>{
 const params=new URLSearchParams(location.search),theme=params.get('qa-atmosphere');
 if(!['clear','cloudy','rain','snow'].includes(theme))return;
 const NativeDate=Date,base=new NativeDate(),day=new NativeDate(+base+9*3600000).toISOString().slice(0,10);
 const hour=Math.max(0,Math.min(23,Number(params.get('qa-hour')||18)));
 const at=NativeDate.parse(day+'T'+String(hour).padStart(2,'0')+':30:00+09:00');
 window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[at]));}static now(){return at;}};
 const nativeFetch=window.fetch.bind(window);
 window.fetch=(url,opts)=>url==='/api/tokyo-weather'?Promise.resolve(new Response(JSON.stringify({forecast:{date:day,issuedAt:new Date(at-3600000).toISOString(),description:{clear:'晴れ',cloudy:'くもり',rain:'雨',snow:'雪'}[theme],theme},stations:{'44132':{name:'東京',temperature:26.7,observedAt:new Date(at-600000).toISOString()},'44071':{name:'練馬',temperature:25,observedAt:new Date(at-600000).toISOString()}}}),{headers:{'Content-Type':'application/json'}})):nativeFetch(url,opts);
 document.addEventListener('DOMContentLoaded',()=>{const label=document.createElement('p');label.textContent='開発確認用：模擬天気・東京 '+hour+' 時';label.style.cssText='position:fixed;left:0;top:0;margin:0;background:#fff;color:#111;font:11px system-ui;padding:4px;z-index:9999';document.body.append(label);});
})();
