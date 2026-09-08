'use strict';
module.exports=function chrome(html){
 const canonical=(html.match(/<link rel="canonical" href="https:\/\/emotionbookstore\.com([^"?]+)"/)||[])[1];
 const post=require('./social-posts-source').find(p=>p.path===canonical);
 if(post&&!html.includes('data-social-post')){
  const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const src='https://embed.bsky.app/embed/'+encodeURIComponent(post.did)+'/app.bsky.feed.post/'+post.rkey+'?colorMode=dark';
  const social=`<section class="social-post" data-social-post="${src}" data-review-through="${post.reviewThrough}"><h2>Blueskyの関連投稿</h2><p>${esc(post.reason)}</p><p class="social-author">${esc(post.author)} · ${post.postedOn}の投稿</p><button type="button" aria-expanded="false" hidden>Blueskyの投稿を表示</button><p>表示を押すとBlueskyに接続します。</p><div data-social-frame></div><p role="status" aria-live="polite"></p><a href="${post.url}" target="_blank" rel="noopener noreferrer">元の投稿・会話を読む ↗</a></section>`;
  html=html.replace('</main>',social+'</main>').replace('</head>','<script src="/social-post.js" defer></script></head>');
 }
 const detail=/class="(?:detail|event-detail|wk-work)"/.test(html);
 if(detail&&!html.includes('data-memory-note')){
  const stamps=['心に残った','元気をもらった','誰かに伝えたい','行ってみたい'].map(label=>`<button type="button" data-memory-stamp="${label}" aria-pressed="false">${label}</button>`).join('');
  const note=`<details class="memory-note" data-memory-note><summary>想いを残す</summary><p>スタンプだけでも、ひとことでも。</p><div class="memory-stamps" role="group" aria-label="気持ちのスタンプ（複数選択可）">${stamps}</div><label for="memory-text">どんな場面や言葉が残りましたか？（任意）</label><textarea id="memory-text" maxlength="500" rows="3" placeholder="ひとことだけでも。"></textarea><p>スタンプ・文章は自動保存されません。いつものアプリへ持ち帰れます。</p><div class="memory-actions"><button type="button" data-memory-share hidden>メモ・日記アプリへ送る</button><button type="button" data-memory-copy>コピーして持ち帰る</button></div><p>共有先は端末やインストールしたアプリによって異なります。</p><details class="memory-calendar"><summary>カレンダーに残す</summary><label for="memory-day">メモを残す日</label><input id="memory-day" data-memory-date type="date" required><p>選んだ日に終日のメモを作ります。催しの開演時刻・予約は公式案内で確認し、カレンダーで調整できます。</p><div class="memory-actions"><button type="button" data-memory-google>Googleカレンダーで開く ↗</button><button type="button" data-memory-ics>ほかのカレンダー用に保存</button></div></details><p role="status" aria-live="polite"></p><textarea data-memory-export aria-label="コピー用の文章" readonly hidden rows="6"></textarea></details>`;
  html=html.replace('</main>',note+'</main>').replace('</head>','<script src="/memory-note.js" defer></script></head>');
 }
 if(html.includes('data-page-tools'))return html;
 const en=/<html[^>]*lang="en"/.test(html);
 const nav=`<nav class="page-tools" data-page-tools aria-label="${en?'Page navigation':'ページ移動'}"><a href="/" class="page-home">${en?'Home':'トップへ'}</a><a href="#page-top" class="page-up" data-page-up>${en?'Back to top ↑':'ページ上部へ ↑'}</a></nav>`;
 html=html.replace(/<body\b([^>]*)>/, '<body$1><span id="page-top" tabindex="-1"></span>');
 return html.replace('</head>','<link rel="stylesheet" href="/page-nav.css"><script src="/page-nav.js" defer></script></head>').replace('</body>',nav+'</body>');
};
