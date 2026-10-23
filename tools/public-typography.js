'use strict';
// A finite route opt-in. No inferred route, descendant selector, or runtime JS gate.
const paths = new Set(require('./public-typography-routes.json').routes.map(r => r.canonical_path));
const css = '<link rel="stylesheet" href="/public-typography.css">';
module.exports = function publicTypography(html) {
  const canonical = (html.match(/<link rel="canonical" href="https:\/\/emotionbookstore\.com([^"?]+)"/) || [])[1];
  if (!paths.has(canonical)) return html;
  if (!/<body[^>]*class="[^"]*\bsite-polished\b/.test(html)) throw Error('Typography route must retain its public page contract: ' + canonical);
  html = html.replace(/(<body[^>]*class=")([^"]*)"/, (_, prefix, classes) => prefix + [...new Set([...classes.split(/\s+/).filter(Boolean), 'public-gothic'])].join(' ') + '"');
  // Always last: upstream generators may have just re-appended their legacy theme.
  return html.replace(/<link rel="stylesheet" href="\/public-typography\.css">/g, '').replace('</head>', css + '</head>');
};
module.exports.paths = paths;
