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
    html = html.replace('<section class="work-grid" aria-label="吉祥寺の作品">',
      '<div class="dr-section-label"><span>作品を楽しむ</span><p>音楽・映像・本・映画から、一つずつ。</p></div><section class="work-grid" aria-label="吉祥寺の作品">');
  }
  if (html.includes('class="detail research-article"') && !html.includes('class="dr-article-opening"')) {
    html = html.replace('<article class="detail research-article">', '<article class="detail research-article"><header class="dr-article-opening">')
      .replace('<nav class="research-toc"', '</header><nav class="research-toc"');
  }
  html=html.replace('<a class="brand" href="/">みんなの感情書店<span>', '<a class="brand dr-outings-brand" href="/"><img src="/assets/brand/emotion-bookstore-lockup-reversed.png" alt="" width="1429" height="331"><span class="sr-only">みんなの感情書店</span><span>');
  return html;
};
