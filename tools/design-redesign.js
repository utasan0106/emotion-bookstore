'use strict';
// Stage B: deliberately limited to one city and one article until direction review.
// The article's claims, summaries and sources remain in city-research.js.
const targets = new Set(['kichijoji/index.html', 'essays/kichijoji-advertising.html']);
module.exports = function redesign(file, html) {
  if (!targets.has(file)) return html;
  html = html.replace('</head>', '<link rel="stylesheet" href="/design-redesign.css"></head>')
    .replace(/(<body[^>]*class=")([^"]*)"/, (_all, prefix, classes) => prefix + ['design-redesign', ...classes.split(/\s+/).filter(Boolean)].join(' ') + '"');
  if (file === 'kichijoji/index.html') {
    html = html.replace('<h1>吉祥寺<span>の作品</span></h1>',
      '<h1>吉祥寺<span>の作品</span></h1><p class="dr-city-lead">公園の声、ライブハウスの演奏、映画館の記憶。作品から、この街を知る。</p><a class="dr-text-link" href="/discover/essays/kichijoji-advertising.html">広告が描く吉祥寺も、読んでみる</a>');
    html = html.replace('<section class="work-grid" aria-label="吉祥寺の作品">',
      '<div class="dr-section-label"><span>作品を楽しむ</span><p>音楽・映像・本・映画から、一つずつ。</p></div><section class="work-grid" aria-label="吉祥寺の作品">');
  } else {
    html = html.replace('<article class="detail research-article">', '<article class="detail research-article"><header class="dr-article-opening">')
      .replace('<nav class="research-toc"', '</header><nav class="research-toc"');
  }
  return html;
};
