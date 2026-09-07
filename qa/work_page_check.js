'use strict';
// Published files, not just the editorial input: split routes, sources, playback boundary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const clean = s => s.replace(/<!--[\s\S]*?-->/g, '');
const main = s => s.match(/<main\b[\s\S]*?<\/main>/)[0];
const entries = ['book', 'film', 'music', 'video'];
const directory = main(read('works.html'));
assert.doesNotMatch(directory, /class="wk-work"|class="wk-reading"|class="wk-info"|data-video-id/);
assert.equal((directory.match(/class="wk-entry"/g) || []).length, 4);
for (const id of entries) {
  const target = 'work-' + id + '.html';
  assert.equal((directory.match(new RegExp('href="./' + target + '"', 'g')) || []).length, 1);
  assert.match(directory, new RegExp('id="' + id + '"')); // Existing saved hashes remain useful.
  const html = read(target), body = main(html);
  assert.deepEqual([...body.matchAll(/class="wk-work" data-work="([^"]+)"/g)].map(m => m[1]), [id]);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok(body.includes('href="./works.html#' + id + '"'));
  const city = {book:'神保町', film:'神保町', music:'下北沢', video:'高円寺'}[id];
  assert.ok(body.includes(city));
  const editSource = read('tools/work-entry-source.html').match(new RegExp('<section id="' + id + '"[\\s\\S]*?<\\/section>\\s*(?=<!--|<section|<div class="wk-exit")'))[0].trim();
  assert.ok(body.includes(editSource), target + ' must preserve the verified editorial section intact');
  const links = [...body.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(links).size, links.length, target + ' duplicates a destination within main');
  assert.doesNotMatch(clean(html), /<iframe\b|<audio\b|<video\b|autoplay|rel="preconnect"/);
  assert.match(read('index.html'), new RegExp('data-work="' + id + '" href="./' + target + '"'));
}
for (const name of ['works.html', ...entries.map(id => 'work-' + id + '.html')]) {
  const html = clean(read(name));
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  assert.equal(ids.size, [...html.matchAll(/\bid="([^"]+)"/g)].length, name + ': duplicate ids');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^https?:/.test(href)) continue;
    const u = new URL(href, 'https://local.test/' + name);
    let file = path.join(root, u.pathname);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    assert.ok(fs.existsSync(file), name + ': missing ' + href);
    if (u.hash) assert.ok(read(path.relative(root, file)).includes('id="' + u.hash.slice(1) + '"'), name + ': missing hash ' + href);
  }
}
assert.ok(read('work-music.html').indexOf('?recording=shelter') < read('work-music.html').indexOf('この演奏が生まれた背景'));
assert.match(read('work-video.html'), /data-video-id="dt33RGSRuo0"/);
assert.match(read('.vercelignore'), /^\/tools\/work-entry-source.html$/m);
console.log('PASS separate work pages: real routes, unique destinations, source parity, no initial embed');
