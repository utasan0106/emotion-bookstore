'use strict';
module.exports=function chrome(html){
 // One shared visual contract for the public catalogue and its reading pages.
 // Keep the accepted home and historical experiments on their own stylesheets.
 const polished=/href="\/discover\/discover\.css"|<body class="(?:works-page|thread-page|shelf-page|suggest-page)/.test(html);
 if(polished){
  html=html.replace(/<body\b([^>]*)>/,(_,attrs)=>'<body'+(/class="/.test(attrs)?attrs.replace(/class="([^"]*)"/,(_m,cls)=>'class="'+[...new Set((cls+' site-polished').split(/\s+/))].join(' ')+'"'):attrs+' class="site-polished"')+'>');
  html=html.replace(/<meta name="color-scheme" content="dark">/,'<meta name="color-scheme" content="light">');
  html=html.replace(/<meta name="theme-color" content="[^"]+">/,'<meta name="theme-color" content="#ffffff">');
  let navCss=false,navJs=false,pageTop=false;
  html=html.replace(/<link rel="stylesheet" href="\/page-nav\.css">/g,tag=>navCss?'':(navCss=true,tag))
   .replace(/<script src="\/page-nav\.js" defer><\/script>/g,tag=>navJs?'':(navJs=true,tag))
   .replace(/<span id="page-top" tabindex="-1"><\/span>/g,tag=>pageTop?'':(pageTop=true,tag));
  if(!html.includes('href="/site-system.css"')) html=html.replace('</head>','<link rel="stylesheet" href="/site-system.css"></head>');
 }
 html=html.replace(/(<a class="brand" href="\/">)(みんなの感情書店|Emotion Bookstore)(<\/a>)/, '$1<img src="/assets/brand/emotion-bookstore-lockup-reversed.png" alt="$2" width="1429" height="331">$3');
 const canonical=(html.match(/<link rel="canonical" href="https:\/\/emotionbookstore\.com([^"?]+)"/)||[])[1];
 const post=require('./social-posts-source').find(p=>p.path===canonical);
 if(post&&!html.includes('data-social-post')){
  const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const src='https://embed.bsky.app/embed/'+encodeURIComponent(post.did)+'/app.bsky.feed.post/'+post.rkey+'?colorMode=dark';
  const social=`<section class="social-post" data-social-post="${src}" data-review-through="${post.reviewThrough}"><h2>Blueskyの関連投稿</h2><p>${esc(post.reason)}</p><p class="social-author">${esc(post.author)} · ${post.postedOn}の投稿</p><button type="button" aria-expanded="false" hidden>Blueskyの投稿を表示</button><p>表示を押すとBlueskyに接続します。</p><div data-social-frame></div><p role="status" aria-live="polite"></p><a href="${post.url}" target="_blank" rel="noopener noreferrer">元の投稿・会話を読む ↗</a></section>`;
  html=html.replace('</main>',social+'</main>').replace('</head>','<script src="/social-post.js" defer></script></head>');
 }
 if(html.includes('data-memory-note')) html=html.replace(/<details class="memory-note"[^>]*>[\s\S]*?<textarea data-memory-export[^>]*>[\s\S]*?<\/textarea><\/details>/, memoryForm(/<html[^>]*lang="en"/.test(html)));
 const detail=/class="(?:detail|event-detail|wk-work)"/.test(html);
 if(detail&&!html.includes('data-memory-note')){
  const note=memoryForm();
  html=html.replace('</main>',note+'</main>').replace('</head>','<script src="/memory-note.js" defer></script></head>');
 }
 if(html.includes('data-page-tools')) return html.replace(/(<nav class="page-tools"[^>]*>)(?!<a href="\/saved.html")/, '$1<a href="/saved.html" class="page-saved">'+(/<html[^>]*lang="en"/.test(html)?'Saved':'保存した想い')+'</a>');
 const en=/<html[^>]*lang="en"/.test(html);
 const nav=`<nav class="page-tools" data-page-tools aria-label="${en?'Page navigation':'ページ移動'}"><a href="/saved.html" class="page-saved">${en?'Saved':'保存した想い'}</a><a href="/" class="page-home">${en?'Home':'トップへ'}</a><a href="#page-top" class="page-up" data-page-up>${en?'Back to top ↑':'ページ上部へ ↑'}</a></nav>`;
 html=html.replace(/<body\b([^>]*)>/, '<body$1><span id="page-top" tabindex="-1"></span>');
 return html.replace(polished?'<link rel="stylesheet" href="/site-system.css">':'</head>','<link rel="stylesheet" href="/page-nav.css"><script src="/page-nav.js" defer></script>'+(polished?'<link rel="stylesheet" href="/site-system.css">':'</head>')).replace('</body>',nav+'</body>');
};

function memoryForm(en=false) {
 const labels=en?['Moved me','Lifted my spirits','Want to share','Want to go']:['心に残った','元気をもらった','誰かに伝えたい','行ってみたい'];
 const keys=['心に残った','元気をもらった','誰かに伝えたい','行ってみたい'];
 const stamps=keys.map((key,i)=>`<button type="button" data-memory-stamp="${key}" aria-pressed="false">${labels[i]}</button>`).join('');
 return `<details class="memory-note" data-memory-note><summary>${en?'Keep a thought':'想いを残す'}</summary><p>${en?'A stamp, a few words, or both.':'スタンプだけでも、ひとことでも。'}</p><div class="memory-stamps" role="group" aria-label="${en?'Choose any stamps':'気持ちのスタンプ（複数選択可）'}">${stamps}</div><label for="memory-text">${en?'What stayed with you? (optional)':'どんな場面や言葉が残りましたか？（任意）'}</label><textarea id="memory-text" maxlength="500" rows="3" placeholder="${en?'A few words are enough.':'ひとことだけでも。'}"></textarea><p data-memory-save-status role="status" aria-live="polite"></p><p>${en?'Saved automatically in this browser. No account or device sync.':'このブラウザに自動保存します。別の端末との同期はありません。'} <a href="/saved.html">${en?'See saved thoughts':'保存した想いを見る'} →</a></p><div class="memory-actions"><button type="button" data-memory-share hidden>${en?'Share to an app':'メモ・日記アプリへ送る'}</button><button type="button" data-memory-copy>${en?'Copy with link':'コピーして持ち帰る'}</button></div><details class="memory-calendar"><summary>${en?'Add a day to your calendar':'カレンダーに残す'}</summary><label for="memory-day">${en?'Day to remember':'メモを残す日'}</label><input id="memory-day" data-memory-date type="date" required><p>${en?'Creates an all-day personal reminder. Check event times and tickets with the venue.':'選んだ日に終日のメモを作ります。催しの開演時刻・予約は公式案内で確認してください。'}</p><div class="memory-actions"><button type="button" data-memory-google>${en?'Open Google Calendar ↗':'Googleカレンダーで開く ↗'}</button><button type="button" data-memory-ics>${en?'Apple / Outlook (.ics)':'Apple・Outlook用（.ics）'}</button></div><p data-memory-calendar-status role="status" aria-live="polite"></p><div data-memory-calendar-help hidden><p>${en?'Open the downloaded .ics file in Calendar on Mac, or use Add calendar → Upload from file in Outlook on the web. On iPhone, open an .ics attachment in Mail.':'Macはダウンロードしたファイルをカレンダーで開きます。OutlookのWeb版は「カレンダーを追加 → ファイルからアップロード」。iPhoneはメールに添付した .ics を開く方法に対応しています。'}</p><p><a href="https://support.apple.com/ja-jp/guide/calendar/icl1023/mac" target="_blank" rel="noopener noreferrer">Apple</a> · <a href="https://support.microsoft.com/ja-jp/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web" target="_blank" rel="noopener noreferrer">Outlook</a></p></div></details><p data-memory-action-status role="status" aria-live="polite"></p><textarea data-memory-export aria-label="${en?'Text to copy':'コピー用の文章'}" readonly hidden rows="6"></textarea></details>`;
}
module.exports.memoryForm=memoryForm;
