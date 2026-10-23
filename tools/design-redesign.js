'use strict';
// Stage C: founder-approved public catalogue design, applied at generation time.
// The article's claims, summaries and sources remain in city-research.js.
module.exports = function redesign(file, html) {
  html = html.replace(/<link rel="stylesheet" href="\/design-redesign\.css">/g, '').replace('</head>', '<link rel="stylesheet" href="/design-redesign.css"></head>')
    .replace(/(<body[^>]*class=")([^"]*)"/, (_all, prefix, classes) => prefix + [...new Set(['design-redesign', ...classes.split(/\s+/).filter(Boolean)])].join(' ') + '"');
  if (!/<body[^>]*class=/.test(html)) html=html.replace(/<body\b([^>]*)>/,'<body$1 class="design-redesign">');
  if (file === 'kichijoji/index.html' && !html.includes('dr-city-lead')) {
    html = html.replace('<h1>吉祥寺<span>の作品</span></h1>',
      '<h1>吉祥寺<span>の作品</span></h1><p class="dr-city-lead">公園の声、ライブハウスの演奏、映画館の記憶。作品から、この街を知る。</p><a class="dr-text-link" href="/discover/essays/kichijoji-advertising.html">広告が描く吉祥寺も、読んでみる</a>');
    // Anchored on the section itself, not on the exact attributes it happened to carry.
    html = html.replace(/<section class="work-grid" aria-label="吉祥寺の作品"[^>]*>/,
      m => '<div class="dr-section-label"><span>作品を楽しむ</span><p>音楽・映像・本・映画から、一つずつ。</p></div>' + m);
  }
  if (html.includes('class="detail research-article"') && !html.includes('class="dr-article-opening"')) {
    html = html.replace('<article class="detail research-article">', '<article class="detail research-article"><header class="dr-article-opening">')
      .replace('<nav class="research-toc"', '</header><nav class="research-toc"');
  }
  // Editorial phrase boundaries: unchanged text, no hard breaks or inserted spaces.
  const titlePhrases = {
    'essays/kichijoji-advertising.html': ['吉祥寺の広告は、', '誰のための街を', '描くのか。'],
    'essays/shimokitazawa-railway.html': ['下北沢の', '線路があった', '場所で、', 'いま何を', 'している？']
  };
  const phrases = titlePhrases[file];
  if (phrases) html = html.replace('<h1>' + phrases.join('') + '</h1>', '<h1>' + phrases.map(text => '<span class="dr-title-phrase">' + text + '</span>').join('') + '</h1>');
  // Context photography is not evidence of the advertisements / railway-site history.
  // Preserve the complete licensed image, including the photographer's watermark.
  const articlePhotos = {
    'essays/kichijoji-advertising.html': {src:'city-kichijoji.jpg', width:1200, height:1600, alt:'赤い提灯と店の看板が並ぶ、吉祥寺のハーモニカ横丁', caption:'街の風景：ハーモニカ横丁。記事中の広告資料ではありません。', credit:'Stephen Kelly / CC BY 2.0', href:'/credits.html'},
    'essays/shimokitazawa-railway.html': {src:'city-shimokitazawa.jpg', width:1600, height:1200, alt:'2015年の下北沢の商店街。線路跡地の写真ではありません', caption:'2015年の下北沢の通り。線路跡地の写真ではありません。', credit:'Aw1805 / CC BY-SA 4.0', href:'/credits.html#shimokitazawa-street'}
  };
  const photo = articlePhotos[file];
  if (photo && !html.includes('class="dr-article-photo"')) {
    const figure = '<figure class="dr-article-photo"><img src="/assets/' + photo.src + '" width="' + photo.width + '" height="' + photo.height + '" alt="' + photo.alt + '" decoding="async"><figcaption>' + photo.caption + '<br>撮影：' + photo.credit + ' · <a href="' + photo.href + '">出典・ライセンス</a></figcaption></figure>';
    html = html.replace('</h1><p class="detail-hook">', '</h1>' + figure + '<p class="detail-hook">');
  }
  html=html.replace('<a class="brand" href="/">みんなの感情書店<span>', '<a class="brand dr-outings-brand" href="/"><img src="/assets/brand/emotion-bookstore-lockup-reversed.png" alt="" width="1429" height="331"><span class="sr-only">みんなの感情書店</span><span>');
  return html;
};
