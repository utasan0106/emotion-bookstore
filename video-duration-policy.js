'use strict';
(function(root,factory){
  const policy=factory();
  if(typeof module==='object'&&module.exports) module.exports=policy;
  if(root) root.EMOTION_BOOKSTORE_VIDEO_POLICY=policy;
  if(typeof document==='undefined') return;

  const blocked=new Set(policy.blockedPaths);
  const approvedIds=new Set(Object.values(policy.approved).map(x=>x.videoId));

  function cityRoot(pathname){
    if(/^\/discover\/[^/]+\/video\.html$/.test(pathname)) return '/discover/outing/';
    const m=pathname.match(/^\/discover\/([^/]+)\/[^/]+\.html$/);
    return m?'/discover/'+m[1]+'/':'/';
  }
  if(blocked.has(location.pathname)){
    location.replace(cityRoot(location.pathname));
    return;
  }
  document.querySelectorAll('a[href]').forEach(a=>{
    let p='';
    try{p=new URL(a.href,location.href).pathname;}catch(_){}
    if(!blocked.has(p)) return;
    const row=a.closest('article,li');
    if(row) row.hidden=true;
    else a.hidden=true;
  });
  document.querySelectorAll('[data-video-id]').forEach(node=>{
    const id=node.getAttribute('data-video-id');
    if(approvedIds.has(id)) return;
    const path=location.pathname;
    if(blocked.has(path)){
      node.replaceChildren();
      const p=document.createElement('p');
      p.className='media-unavailable';
      p.textContent='この映像は尺確認中のため現在掲載していません。';
      node.appendChild(p);
    }
  });
})(typeof window!=='undefined'?window:null,function(){
  return {
    standardMaxSeconds:180,
    absoluteMaxSeconds:300,
    approved:{
      'common/find-my-tokyo':{
        videoId:'CMM0QCw99c4',durationSeconds:30,
        durationSource:'https://yutura.net/channel/15597/latest/?p=6',
        sourceUrl:'https://www.youtube.com/watch?v=CMM0QCw99c4',
        reason:'東京メトロ公式の街歩きキャンペーンCM。'
      },
      'common/newline-project':{
        videoId:'rjFh_eBwV_k',durationSeconds:30,
        durationSource:'https://yutura.net/channel/15597/latest/?p=4',
        sourceUrl:'https://www.tokyometro-newline.jp/movie/',
        reason:'東京メトロ公式の30秒新線プロジェクト映像。'
      },
      'common/toyota-loving-eyes':{
        videoId:'mh_QCvulKSY',durationSeconds:206,
        durationSource:'https://dougamarketing.net/20170601/',
        sourceUrl:'https://www.youtube.com/watch?v=mh_QCvulKSY',
        exceptionReason:'父と娘の同じ時間を二つの視点で描く構造が作品の核で、3分26秒でも最後まで見る理由が明確。'
      },
      'city/kichijoji/park-voice':{
        videoId:'80y5COiKdDw',durationSeconds:57,
        durationSource:'https://yakushimaruetsuko.com/archives/2398/',
        sourceUrl:'https://www.youtube.com/watch?v=80y5COiKdDw',
        reason:'井の頭公園で実際に流れた放送の57秒サンプル記録。'
      }
    },
    blockedPaths:[
      '/discover/koenji/video.html',
      '/discover/shimokitazawa/video.html',
      '/discover/kichijoji/video.html',
      '/discover/jinbocho/video.html',
      '/discover/koenji/awa-2025.html',
      '/discover/koenji/tenguren.html',
      '/discover/koenji/awa-history.html',
      '/discover/koenji/pal-street.html',
      '/discover/koenji/street-food.html',
      '/discover/koenji/next-town-koenji.html',
      '/discover/shimokitazawa/shelter-news.html',
      '/discover/shimokitazawa/kitazawa-guide.html',
      '/discover/shimokitazawa/tefu-1500.html',
      '/discover/shimokitazawa/obonro-walk.html',
      '/discover/shimokitazawa/womenslib-interview.html',
      '/discover/shimokitazawa/bocchi-main-pv.html',
      '/discover/kichijoji/uplink.html',
      '/discover/kichijoji/kichion-ichihara.html',
      '/discover/kichijoji/kichion-toranoko.html',
      '/discover/kichijoji/kichion-lady.html',
      '/discover/kichijoji/musashino-green.html',
      '/discover/jinbocho/gyokueido.html',
      '/discover/jinbocho/italia.html',
      '/discover/jinbocho/jinbocho-1960s.html',
      '/discover/jinbocho/iwanami-hall.html',
      '/discover/jinbocho/used-book-festival.html'
    ]
  };
});
