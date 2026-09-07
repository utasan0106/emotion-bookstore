// Compile the existing, source-checked editorial sections into separate static pages.
// Run with --check in QA. No browser script, fetch, or client-side hiding is needed.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'work-entry-source.html'), 'utf8');
const entries = [
  { id: 'book', kind: '本', title: '森崎書店の日々', byline: '八木沢里志', city: '神保町', relation: '物語の舞台', action: '本の紹介へ' },
  { id: 'film', kind: '映画', title: '森崎書店の日々', byline: '日向朝子監督 / 2010', city: '神保町', relation: '撮影された街', action: '映画の紹介へ' },
  { id: 'music', kind: '音楽', title: '不透明度 — Live at Shelter 20070204', byline: 'Boris with Michio Kurihara', city: '下北沢', relation: 'ライブが録音された街', action: 'ライブ盤の紹介へ' },
  { id: 'video', kind: '映像', title: '高円寺の踊り', byline: '主催団体の公式映像 / 2025', city: '高円寺', relation: '踊りが行われた街', action: '街の映像へ' }
];
const header = source.slice(0, source.indexOf('  <main id="main">')).replace(/<!-- 作品から入る[\s\S]*?-->/, '<!-- Built from tools/work-entry-source.html. One work per detail page; all media load only on user action. -->');
const footer = source.slice(source.indexOf('  <footer class="site-footer">'));
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function write(name, html) {
  const file = path.join(root, name);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) throw new Error('Generated page differs: ' + name);
  } else fs.writeFileSync(file, html);
}
for (const entry of entries) {
  const match = source.match(new RegExp('<section id="' + entry.id + '"[\\s\\S]*?<\\/section>\\s*(?=<!--|<section|<div class="wk-exit")'));
  if (!match) throw new Error('Missing editorial section ' + entry.id);
  const section = match[0].trim();
  const pageHeader = header.replace('<title>みんなの感情書店｜作品から入る</title>', '<title>' + entry.title + '｜' + entry.kind + 'と' + entry.city + '｜みんなの感情書店</title>');
  const main = `  <main id="main"><div class="wk-root">
    <header class="wk-head">
      <p class="wk-back"><a href="./works.html#${entry.id}">作品を選び直す ←</a></p>
      <h1 class="wk-title">${entry.kind}と${entry.city}</h1>
      <p class="wk-lead">${entry.city} · ${entry.relation}</p>
    </header>
    ${section}
    <div class="wk-exit"><p class="end-exit"><a class="other-shelves" href="./index.html">入口へ戻る</a></p></div>
  </div></main>

`;
  write('work-' + entry.id + '.html', pageHeader + main + footer);
}
const cards = entries.map(e => `      <section id="${e.id}" class="wk-entry" aria-labelledby="entry-${e.id}">
        <p class="wk-category">${e.kind} · ${e.city}</p>
        <h2 id="entry-${e.id}" class="wk-object">${escape(e.title)}</h2>
        <p class="wk-byline">${e.byline}</p>
        <p class="wk-city">${e.relation}：${e.city}</p>
        <p class="wk-primary"><a class="wk-route" href="./work-${e.id}.html">${e.action}<span aria-hidden="true"> →</span></a></p>
      </section>`).join('\n');
write('works.html', header + `  <main id="main"><div class="wk-root">
    <header class="wk-head">
      <h1 class="wk-title">作品から入る</h1>
      <p class="wk-lead">気になる作品をひとつ。紹介とつながりは、次のページで。</p>
      <p class="wk-primary"><a class="wk-route" href="./v3-prototype/culture-experience-r2/index.html">短い音・映像から楽しむ<span aria-hidden="true"> →</span></a></p>
    </header>
    <div class="wk-entry-grid">
${cards}
    </div>
    <div class="wk-exit"><p class="end-exit"><a class="other-shelves" href="./index.html">入口へ戻る</a></p></div>
  </div></main>

` + footer);
console.log('PASS work directory + 4 separate pages' + (process.argv.includes('--check') ? ' match source' : ' generated'));
