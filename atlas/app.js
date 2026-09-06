/* 街を立体で辿る（β）— Production Beta 0、高円寺だけ。
   - 2.5D（FallbackAdapter）が先に使える。PLATEAU / CesiumJS は非同期の progressive enhancement で、
     失敗・遅延しても story / timeline / evidence は使える。
   - ?mode=2d は Cesium / PLATEAU への request 0。
   - 位置情報・カメラ・保存・計測は使わない。外部 link は allowlist の host だけ、押したときだけ。
   - 現在の 3D 都市モデルは歴史の証拠ではない（historicalGeometry:false、1961 以降は地点を作らない）。 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const EXTERNAL_ALLOW=new Set([
  'koenji-awaodori.com','www.koenji-awaodori.com','suginamigaku.org','www.koenji-pal.jp','www.youtube.com',
  'www.mlit.go.jp','docs.plateauview.mlit.go.jp'
]);
const state={index:null,city:null,thread:null,spatial:null,sceneIndex:0,adapter:null,fallbackAdapter:null,quality:'normal',compare:false,cityToken:0};
const bundle=window.__V3_SPATIAL_BUNDLE__||null;

function clone(x){return JSON.parse(JSON.stringify(x))}
function externalLink(label,url,kind){
  const u=new URL(url);
  if(!EXTERNAL_ALLOW.has(u.hostname)) throw new Error('External host not allowlisted: '+u.hostname);
  const a=document.createElement('a');a.textContent=label+' ↗';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';
  if(kind){const s=document.createElement('span');s.className='source-kind';s.textContent=kind.replaceAll('_',' ');a.appendChild(s);}
  return a;
}
function scene(){return state.thread.scenes[state.sceneIndex]}
function sourcesFor(s){return (s.sourceIds||[]).map(id=>{const x=state.thread.sources[id];if(!x)throw new Error('Missing source '+id);return x;})}
function setStatus(text,ok){$('dataStatus').textContent=text;$('dataStatus').classList.toggle('ok',!!ok);$('dataStatus').classList.toggle('warn',!ok)}
function showTech(msg){const el=$('techNote');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),6500)}
function setPressed(id,on){$(id).setAttribute('aria-pressed',on?'true':'false')}

async function loadJson(path){
  if(bundle && bundle[path]) return clone(bundle[path]);
  const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path+' '+r.status);return r.json();
}
function validateCity(city,thread,spatial){
  if(!city||!thread||!spatial)throw new Error('Missing city data');
  if(!thread.scenes?.length)throw new Error(city.id+': No scenes');
  const allowedPolicy=new Set(['overview','corridor','area','current_place']);
  const allowedResolution=new Set(['not_applicable','street_segment','area','place_identity','current_place','city_overview']);
  for(const s of thread.scenes){
    if(!allowedPolicy.has(s.mapPolicy))throw new Error(city.id+': unknown mapPolicy '+s.mapPolicy);
    if(!allowedResolution.has(s.spatialResolution))throw new Error(city.id+': unknown spatialResolution '+s.spatialResolution);
    if(s.mapPolicy==='corridor'&&s.spatialResolution!=='street_segment')throw new Error(city.id+': corridor requires street_segment');
    if(s.mapPolicy==='area'&&s.spatialResolution!=='area')throw new Error(city.id+': area requires area resolution');
    if(s.mapPolicy==='current_place'&&!['place_identity','current_place'].includes(s.spatialResolution))throw new Error(city.id+': current_place requires place identity');
    if(s.spatialResolution==='not_applicable'&&s.mapPolicy!=='overview')throw new Error(city.id+': non-spatial scene cannot render geometry');
    for(const id of s.sourceIds||[]){if(!thread.sources[id])throw new Error(city.id+': missing source '+id)}
  }
  for(const [id,src] of Object.entries(thread.sources||{})){const u=new URL(src.url);if(!EXTERNAL_ALLOW.has(u.hostname))throw new Error(city.id+': source host denied '+id)}
  for(const g of spatial.geometries||[]){
    if(g.historicalGeometry!==false)throw new Error(city.id+': geometry must not claim historical boundary');
    if(!['corridor','area','current_place'].includes(g.kind))throw new Error(city.id+': geometry kind denied '+g.kind);
  }
  if(spatial.plateauEnabled && !spatial.plateau.tileset.includes(spatial.municipalityCode+'-bldg-maxlod2-latest'))throw new Error(city.id+': unexpected PLATEAU tileset');
}

function renderCitySwitcher(){
  const nav=$('citySwitcher');nav.replaceChildren();
  nav.hidden=state.index.cities.length<2; // Production Beta 0: 高円寺だけ。他の街は navigation に出さない。
  state.index.cities.forEach(c=>{
    const b=document.createElement('button');b.className='city-tab'+(c.state==='hold'?' hold':'');b.dataset.city=c.id;
    b.innerHTML='<span>'+c.label+'</span><span class="city-state">'+c.stateLabel+'</span>';
    b.setAttribute('aria-current',c.id===state.city?.id?'true':'false');
    b.addEventListener('click',()=>switchCity(c.id,true));nav.appendChild(b);
  });
}
function renderHero(){
  $('mapStage').dataset.city=state.city.id;
  $('heroCity').textContent=state.city.label.toUpperCase()+' · SPATIAL CULTURE';
  $('heroTitle').innerHTML=state.city.heroTitle;
  $('heroLead').textContent=state.city.heroLead;
  $('panelTitle').textContent=state.city.panelTitle;
  $('panelLead').textContent=state.city.panelLead;
  $('cityContext').textContent=state.city.context;
  $('cityRouteNote').textContent=state.city.routeNote;
  const maturity=$('maturity');maturity.textContent=state.city.stateLabel;maturity.classList.toggle('hold',state.city.state==='hold');
  const badge=$('factBadge');badge.dataset.maturity=state.city.state;badge.textContent=state.city.state==='hold'?'EDITORIAL HOLD':'VERIFIED';
  const hold=$('holdBanner');hold.classList.toggle('show',state.city.state==='hold');
  hold.textContent=state.city.state==='hold'?'この街は、3Dを先に作るのではなく、Evidenceのある文化関係が揃うまでSpatial化を止めています。':'';
  $('panelFoot').innerHTML=state.spatial.plateauEnabled
    ? '3D都市モデル: Project PLATEAU / 国土交通省。自治体コード <code>'+state.spatial.municipalityCode+'</code> の建築物 <code>maxlod2-latest</code> を利用。配信失敗時は同じ文化データを使う2.5D fallbackへ切替。'
    : 'この街はEDITORIAL HOLDのためPLATEAUを意図的に読み込みません。3Dが使えること自体を文化関係の根拠にしません。';
}
function renderTimeline(){
  const el=$('timeline');el.replaceChildren();
  state.thread.scenes.forEach((s,i)=>{
    const b=document.createElement('button');b.innerHTML='<strong>'+s.year+'</strong>'+s.title;b.classList.toggle('active',i===state.sceneIndex);
    b.addEventListener('click',()=>selectScene(i));el.appendChild(b);
  });
  el.style.gridTemplateColumns='repeat('+Math.min(state.thread.scenes.length,5)+',1fr)';
}
function renderCompare(){
  const list=$('compareList');list.replaceChildren();
  state.thread.scenes.forEach((s,i)=>{
    const b=document.createElement('button');b.className='compare-item';
    b.innerHTML='<small>'+s.year+'</small><strong>'+s.title+'</strong><span>'+s.claim+'</span>';
    b.addEventListener('click',()=>{selectScene(i);setCompare(false);$('storyPanel').scrollIntoView({block:'start'});});list.appendChild(b);
  });
}
function renderStory(){
  const s=scene();
  $('year').textContent=s.year;$('title').textContent=s.title;$('claim').textContent=s.claim;$('precision').textContent=s.precisionCopy;$('relation').textContent=s.relation;
  $('note').style.display=s.note?'block':'none';$('note').textContent=s.note||'';
  $('links').replaceChildren(...sourcesFor(s).map(x=>externalLink(x.label,x.url,x.kind)));
  $('nextBtn').textContent=state.sceneIndex===state.thread.scenes.length-1?(state.thread.scenes.length===1?'この街はここまで':'最初から辿る ↺'):'次の関係へ →';
  $('nextBtn').disabled=state.thread.scenes.length===1;
  $('focusBtn').textContent=s.mapPolicy==='corridor'?'商店街方向へ近づく':s.mapPolicy==='area'?'街の範囲を見る':s.mapPolicy==='current_place'?'現在の場所を見る':'街の俯瞰を保つ';
  $('focusBtnTop').textContent=$('focusBtn').textContent;
  [...$('timeline').children].forEach((b,i)=>b.classList.toggle('active',i===state.sceneIndex));
  if(state.adapter)state.adapter.applyScene(s);
  $('evidenceDetails').open=false;
}
function selectScene(i){state.sceneIndex=i;renderStory()}
function setCompare(open){state.compare=open;$('compareOverlay').classList.toggle('open',open);$('compareOverlay').setAttribute('aria-hidden',open?'false':'true');setPressed('compareBtn',open)}
function updateUrl(cityId){const u=new URL(location.href);u.searchParams.set('city',cityId);history.replaceState({},'',u)}

class FallbackAdapter{
  constructor(container,spatial,city){this.container=container;this.spatial=spatial;this.city=city;this.world=null;this.corridor=null;this.area=null;this.current=null}
  async init(){
    this.container.replaceChildren();
    const city=document.createElement('div');city.className='fallback-city';
    const world=document.createElement('div');world.className='fallback-world';
    world.innerHTML='<div class="f-street s1"></div><div class="f-street s2"></div><div class="f-street s3"></div><div class="f-block"></div><div class="f-block"></div><div class="f-block"></div><div class="f-block"></div><div class="f-block"></div><div class="f-block"></div><div class="f-corridor"></div><div class="f-area"></div><div class="f-current"></div><div class="f-station"></div>';
    city.appendChild(world);this.container.appendChild(city);this.world=world;this.corridor=world.querySelector('.f-corridor');this.area=world.querySelector('.f-area');this.current=world.querySelector('.f-current');
    const station=world.querySelector('.f-station');const ref=this.spatial.presentReferences?.[0];station.dataset.label=ref?.label||('現在の'+this.city.label);station.style.display=ref?'block':'none';this.current.dataset.label=ref?.label||'現在の場所';return this;
  }
  overview(){this.world.classList.remove('street-focus')}
  focus(){this.world.classList.add('street-focus')}
  applyScene(s){this.corridor.classList.toggle('show',s.mapPolicy==='corridor');this.area.classList.toggle('show',s.mapPolicy==='area');this.current.classList.toggle('show',s.mapPolicy==='current_place');s.mapPolicy==='overview'?this.overview():this.focus()}
  setQuality(){}
  destroy(){this.container.replaceChildren()}
}

let cesiumLoadPromise=null;
function loadCesium(){
  if(window.Cesium)return Promise.resolve(window.Cesium);
  if(cesiumLoadPromise)return cesiumLoadPromise;
  cesiumLoadPromise=new Promise((resolve,reject)=>{
    window.CESIUM_BASE_URL='https://cesium.com/downloads/cesiumjs/releases/1.117/Build/Cesium/';
    const css=document.createElement('link');css.rel='stylesheet';css.href=window.CESIUM_BASE_URL+'Widgets/widgets.css';document.head.appendChild(css);
    const script=document.createElement('script');script.src=window.CESIUM_BASE_URL+'Cesium.js';script.async=true;
    script.onload=()=>window.Cesium?resolve(window.Cesium):reject(new Error('Cesium loaded without global'));
    script.onerror=()=>reject(new Error('CesiumJS network error'));document.head.appendChild(script);
  });return cesiumLoadPromise;
}

class PlateauAdapter{
  constructor(container,spatial,city){this.container=container;this.spatial=spatial;this.city=city;this.viewer=null;this.tileset=null;this.entities=[]}
  async init(){
    await loadCesium();if(!window.Cesium)throw new Error('CesiumJS unavailable');const C=window.Cesium;this.container.replaceChildren();
    const imagery=new C.UrlTemplateImageryProvider({url:this.spatial.plateau.imagery,maximumLevel:19,credit:'PLATEAU-Ortho / Project PLATEAU'});
    this.viewer=new C.Viewer(this.container,{baseLayer:false,terrainProvider:new C.EllipsoidTerrainProvider(),animation:false,timeline:false,geocoder:false,homeButton:false,sceneModePicker:false,baseLayerPicker:false,navigationHelpButton:false,fullscreenButton:false,selectionIndicator:false,infoBox:false,shouldAnimate:false,requestRenderMode:true,maximumRenderTimeChange:Infinity});
    this.viewer.scene.imageryLayers.addImageryProvider(imagery);
    this.viewer.scene.globe.baseColor=C.Color.fromCssColorString('#1d2824');this.viewer.scene.globe.showGroundAtmosphere=false;this.viewer.scene.skyAtmosphere.show=false;this.viewer.scene.fog.enabled=true;this.viewer.scene.fog.density=.00018;this.viewer.scene.backgroundColor=C.Color.fromCssColorString('#101816');this.viewer.scene.screenSpaceCameraController.minimumZoomDistance=35;this.viewer.resolutionScale=this.defaultScale();
    this.tileset=await C.Cesium3DTileset.fromUrl(this.spatial.plateau.tileset,{maximumScreenSpaceError:this.defaultSSE()});
    this.viewer.scene.primitives.add(this.tileset);this.tileset.style=new C.Cesium3DTileStyle({color:"color('#d9d1bd',0.90)"});
    this.addEditorialGeometry();this.setView(this.spatial.camera.overview,false);this.viewer.scene.requestRender();return this;
  }
  defaultScale(){return innerWidth<=640?Math.min(.72,1/devicePixelRatio):Math.min(1,1/devicePixelRatio*1.25)}
  defaultSSE(){return innerWidth<=640?24:14}
  addEditorialGeometry(){
    const C=window.Cesium;
    for(const ref of this.spatial.presentReferences||[]){
      const e=this.viewer.entities.add({id:'ref:'+ref.id,position:C.Cartesian3.fromDegrees(ref.lon,ref.lat,10),show:false,point:{pixelSize:9,color:C.Color.fromCssColorString('#f2d28e'),outlineColor:C.Color.fromCssColorString('#171c1a'),outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:ref.label,font:'12px sans-serif',fillColor:C.Color.fromCssColorString('#f5efdf'),showBackground:true,backgroundColor:C.Color.fromBytes(18,23,22,190),pixelOffset:new C.Cartesian2(0,-24),disableDepthTestDistance:Number.POSITIVE_INFINITY}});
      this.entities.push({kind:'reference',id:ref.id,entity:e});
    }
    for(const g of this.spatial.geometries||[]){
      let e=null;
      if(g.kind==='corridor'){
        e=this.viewer.entities.add({show:false,corridor:{positions:C.Cartesian3.fromDegreesArray(g.coordinates.flat()),width:28,material:C.Color.fromCssColorString('#c88d39').withAlpha(.34),outline:true,outlineColor:C.Color.fromCssColorString('#f1ce86').withAlpha(.85),height:2}});
      }else if(g.kind==='area'){
        e=this.viewer.entities.add({position:C.Cartesian3.fromDegrees(g.center[0],g.center[1],3),show:false,ellipse:{semiMajorAxis:g.semiMajorAxis,semiMinorAxis:g.semiMinorAxis,material:C.Color.fromCssColorString('#c88d39').withAlpha(.13),outline:true,outlineColor:C.Color.fromCssColorString('#f1ce86').withAlpha(.72),height:2}});
      }else if(g.kind==='current_place'){
        const ref=(this.spatial.presentReferences||[]).find(x=>x.id===g.referenceId);if(ref)e=this.viewer.entities.getById('ref:'+ref.id);
      }
      if(e)this.entities.push({kind:'geometry',id:g.id,scenes:g.sceneIds||[],entity:e,geometry:g});
    }
  }
  setView(c,fly=true){const C=window.Cesium;const opts={destination:C.Cartesian3.fromDegrees(c.lon,c.lat,c.height),orientation:{heading:C.Math.toRadians(c.heading),pitch:C.Math.toRadians(c.pitch),roll:0}};fly?this.viewer.camera.flyTo({...opts,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.7}):this.viewer.camera.setView(opts)}
  overview(){this.setView(this.spatial.camera.overview,true)}
  focus(){this.setView(this.spatial.camera.focus||this.spatial.camera.street||this.spatial.camera.overview,true)}
  applyScene(s){
    for(const x of this.entities){x.entity.show=false}
    for(const x of this.entities){if(x.kind==='geometry'&&x.scenes.includes(s.id))x.entity.show=true}
    if(s.mapPolicy==='current_place'){for(const x of this.entities){if(x.kind==='reference')x.entity.show=true}}
    s.mapPolicy==='overview'?this.overview():this.focus();this.viewer.scene.requestRender();
  }
  setQuality(low){this.viewer.resolutionScale=low?Math.min(.62,1/devicePixelRatio):this.defaultScale();if(this.tileset)this.tileset.maximumScreenSpaceError=low?32:this.defaultSSE();this.viewer.scene.requestRender()}
  destroy(){if(this.viewer&&!this.viewer.isDestroyed())this.viewer.destroy();this.viewer=null;this.container.replaceChildren()}
}

async function upgradeToPlateau(token,plateauLayer,fallbackLayer){
  const adapter=new PlateauAdapter(plateauLayer,state.spatial,state.city);
  try{
    await adapter.init();
    if(token!==state.cityToken){adapter.destroy();return}
    state.adapter=adapter;
    plateauLayer.classList.remove('hidden');
    fallbackLayer.classList.add('hidden');
    $('mapCredit').hidden=false;
    setStatus('PLATEAU '+state.city.label+' maxLOD2',true);
    adapter.applyScene(scene());
  }catch(e){
    if(token!==state.cityToken)return;
    try{adapter.destroy()}catch(_){}
    plateauLayer.remove();
    state.adapter=state.fallbackAdapter;
    setStatus('2.5D fallback',false);
    showTech('PLATEAU/Cesiumを利用できなかったため2.5D表示を継続します。 '+e.message);
  }
}

async function initAdapter(token){
  const container=$('mapStage');container.replaceChildren();$('mapCredit').hidden=true;
  const fallbackLayer=document.createElement('div');fallbackLayer.className='spatial-layer';container.appendChild(fallbackLayer);
  state.fallbackAdapter=new FallbackAdapter(fallbackLayer,state.spatial,state.city);
  await state.fallbackAdapter.init();
  if(token!==state.cityToken)return;
  state.adapter=state.fallbackAdapter;

  // The 2.5D layer is the usable baseline, not a loading placeholder.
  // PLATEAU is progressive enhancement and must never block the story UI.
  if(!state.spatial.plateauEnabled){setStatus('2.5D only',false);return}
  setStatus('2.5D ready · PLATEAU読込中',false);
  const params=new URLSearchParams(location.search);
  if(params.get('mode')==='2d'){setStatus('2.5D manual',false);return}

  const plateauLayer=document.createElement('div');plateauLayer.className='spatial-layer hidden';container.appendChild(plateauLayer);
  // Intentionally not awaited. Failure or delay leaves the fallback fully usable.
  void upgradeToPlateau(token,plateauLayer,fallbackLayer);
}
async function switchCity(id,userAction=false){
  const city=state.index.cities.find(c=>c.id===id)||state.index.cities.find(c=>c.id===state.index.defaultCity);
  const token=++state.cityToken;
  if(state.adapter?.destroy)state.adapter.destroy();
  state.city=city;state.sceneIndex=0;state.compare=false;setCompare(false);setStatus('文化データ 読み込み中',false);
  if(userAction)updateUrl(city.id);
  [state.thread,state.spatial]=await Promise.all([loadJson(city.thread),loadJson(city.spatial)]);
  if(token!==state.cityToken)return;
  validateCity(city,state.thread,state.spatial);renderCitySwitcher();renderHero();renderTimeline();renderCompare();await initAdapter(token);if(token!==state.cityToken)return;renderStory();
}
async function init(){
  try{
    state.index=await loadJson('./data/cities.json');
    const params=new URLSearchParams(location.search);const requested=params.get('city')||state.index.defaultCity;
    await switchCity(requested,false);$('loading').style.display='none';if(params.get('view')==='list')setCompare(true);
  }catch(e){$('loadingTitle').textContent='Spatial Engineを開始できませんでした。';$('loadingText').textContent=e.message;document.querySelector('.loader').style.display='none'}
}
$('nextBtn').addEventListener('click',()=>{if(state.thread.scenes.length>1)selectScene((state.sceneIndex+1)%state.thread.scenes.length)});
$('focusBtn').addEventListener('click',()=>state.adapter?.focus());
$('focusBtnTop').addEventListener('click',()=>state.adapter?.focus());
$('overviewBtn').addEventListener('click',()=>state.adapter?.overview());
$('compareBtn').addEventListener('click',()=>setCompare(!state.compare));$('closeCompare').addEventListener('click',()=>setCompare(false));
$('qualityBtn').addEventListener('click',()=>{const low=state.quality!=='low';state.quality=low?'low':'normal';setPressed('qualityBtn',low);state.adapter?.setQuality(low)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')setCompare(false);if(e.key==='ArrowRight'&&!state.compare&&state.thread?.scenes.length>1)selectScene((state.sceneIndex+1)%state.thread.scenes.length);if(e.key==='ArrowLeft'&&!state.compare&&state.thread?.scenes.length>1)selectScene((state.sceneIndex-1+state.thread.scenes.length)%state.thread.scenes.length)});
window.addEventListener('DOMContentLoaded',init);
})();