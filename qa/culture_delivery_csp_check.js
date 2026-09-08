// Static route-intent gate; live Vercel headers and playback are separate gates.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const prefix = '/v3-prototype/culture-experience-r2/shimokitazawa';
const policy = url => config.headers.flatMap(rule =>
  new RegExp('^' + rule.source + '$').test(url)
    ? rule.headers.filter(h => h.key.toLowerCase() === 'content-security-policy').map(h => h.value)
    : []);
const directive = (csp, name) => csp.split(';').map(p => p.trim().split(/\s+/)).find(p => p[0] === name)?.slice(1);
const special = [prefix, prefix + '/', prefix + '/index.html', prefix + '/room.js'];
const ordinary = ['/', '/index.html', '/works.html', '/thread.html', '/shelf.html',
  '/data.html', '/suggest.html', '/atlas/', '/v3-prototype/culture-experience-r2/',
  '/v3-prototype/culture-experience-r2/kichijoji/', prefix + '-other/', prefix + 'x'];
const social = ['/outings/events/shimokita-moon.html', '/outings/events/koenji-midsummer.html'];
for (const url of [...special, ...ordinary, ...social]) {
  const policies = policy(url);
  assert.equal(policies.length, 1, url + ': exactly one HTTP CSP');
  assert.deepEqual(directive(policies[0], 'frame-src'),
    special.includes(url) ? ['https://bandcamp.com'] : social.includes(url) ? ['https://www.youtube-nocookie.com', 'https://embed.bsky.app', 'https://www.instagram.com'] : ['https://www.youtube-nocookie.com'], url);
  assert.deepEqual(directive(policies[0], 'frame-ancestors'), ["'none'"], url);
  if (special.includes(url)) assert.deepEqual(directive(policies[0], 'connect-src'), ["'none'"]);
}
const html = fs.readFileSync(path.join(root, prefix, 'index.html'), 'utf8');
assert.ok(html.includes('frame-src https://bandcamp.com'));
assert.match(html, /noindex/);
const common = config.headers.find(r => r.source === '/(.*)').headers;
assert.equal(common.find(h => h.key === 'X-Frame-Options').value, 'DENY');
assert.equal(common.find(h => h.key === 'Permissions-Policy').value, 'geolocation=(), camera=(), microphone=(), payment=()');
console.log('PASS: ' + (special.length + ordinary.length + social.length) + ' route cases; scoped Bandcamp and common privacy headers.');
console.log('PENDING: Vercel matcher compilation, actual response headers, and audible playback.');
