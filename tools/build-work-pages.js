// Compile the existing, source-checked editorial sections into separate static pages.
// Run with --check in QA. No browser script, fetch, or client-side hiding is needed.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'work-entry-source.html'), 'utf8');
const media=require('./work-media');
const mediaFor=entry=>entry.id==='music'?media.album():entry.id==='video'?media.youtube('dt33RGSRuo0',entry.title,'主催団体の公式映像（5分39秒）'):entry.id==='film'?media.youtube('6M0vx8wLEbM',entry.title,'予告編（本編ではありません）'):media.cover('jinbocho/kaijin',entry.title);
const entries = [
  { id: 'book', kind: '本', title: '神保町の怪人', byline: '紀田順一郎', city: '神保町', relation: '物語の舞台', action: '本の紹介へ' },
  { id: 'film', kind: '映画', title: '森崎書店の日々', byline: '日向朝子監督 / 2010', city: '神保町', relation: '撮影された街', action: '映画の紹介へ' },
  { id: 'music', kind: '音楽', title: '不透明度 — Live at Shelter 20070204', byline: 'Boris with Michio Kurihara', city: '下北沢', relation: 'ライブが録音された街', action: 'ライブ盤の紹介へ' },
  { id: 'video', kind: '映像', title: '高円寺の踊り', byline: '主催団体の公式映像 / 2025', city: '高円寺', relation: '踊りが行われた街', action: '街の映像へ' }
];
const header = source.slice(0, source.indexOf('  <main id="main">')).replace(/<!-- 作品から入る[\s\S]*?-->/, '<!-- Built from tools/work-entry-source.html. Official work previews load when visible, without autoplay. -->');
const footer = source.slice(source.indexOf('  <footer class="site-footer">'));
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const officialActions={};
function write(name, html) {
  html=require('./page-chrome')(html).replace(/[ \t]+$/gm,'');
  const file = path.join(root, name);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) throw new Error('Generated page differs: ' + name);
  } else fs.writeFileSync(file, html);
}
for (const entry of entries) {
  const match = source.match(new RegExp('<section id="' + entry.id + '"[\\s\\S]*?<\\/section>\\s*(?=<!--|<section|<div class="wk-exit")'));
  if (!match) throw new Error('Missing editorial section ' + entry.id);
  let section = match[0].trim().replace(/aria-labelledby="wk-[^"]+"/,'aria-label="'+entry.kind+'の紹介"');
  if(entry.id==='book') section=`<section id="book" class="wk-entry" aria-label="本の紹介"><p class="wk-byline">紀田順一郎／創元推理文庫</p><p>本を集める情熱が、謎と事件へ姿を変える。</p><p>古書収集と神保町を扱う三つのミステリーを収めた短編集。街の古書店に並ぶ本を見る目が、少し変わるかもしれません。</p><p class="wk-primary"><a class="wk-action official-action" href="https://www.tsogen.co.jp/np/isbn/9784488406080" target="_blank" rel="noopener noreferrer">出版社で本の紹介を見る</a></p><p><a href="/discover/jinbocho/kaijin.html">作品と街のつながりを読む →</a></p></section>`;
  if(entry.id==='video') section=section.replace(/<div class="wk-video v3-video"[\s\S]*?<\/noscript>\s*<\/div>/,'');
  section=section.replace(/<p id="wk-[^"]+-category"[\s\S]*?<\/p>\s*<h2 id="wk-[^"]+-title"[\s\S]*?<\/h2>/,'');
  section=section.replace(/(<p class="wk-byline">[\s\S]*?<\/p>)/,'$1'+mediaFor(entry));
  // The official work destination precedes the optional background trail.
  const official=section.match(/<p class="(?:wk-action-row|wk-primary)"><a class="wk-action(?: official-action)?" href="https:[\s\S]*?<\/p>/);
  if(official){
    officialActions[entry.id]=official[0].replace(/class="(?:wk-action-row|wk-primary)"/,'class="wk-primary work-official"');
    section=section.replace(official[0],'').replace(/(<p class="wk-byline">[\s\S]*?<\/p>(?:<figure[\s\S]*?<\/figure>)?)/,'$1'+officialActions[entry.id]);
  }
  const pageHeader = header.replace('<title>みんなの感情書店｜作品から入る</title>', '<title>' + entry.title + '｜' + entry.kind + 'と' + entry.city + '｜みんなの感情書店</title>');
  const main = `  <main id="main"><div class="wk-root">
    <header class="wk-head">
      <p class="wk-back"><a href="./works.html#${entry.id}">作品を選び直す ←</a></p>
      <h1 class="wk-title">${entry.title}</h1>
      <p class="wk-lead">${entry.kind} · ${entry.city} · ${entry.relation}</p>
    </header>
    ${section}
    <div class="wk-exit"><p class="end-exit"><a class="other-shelves" href="./index.html">入口へ戻る</a></p></div>
  </div></main>

`;
  write('work-' + entry.id + '.html', pageHeader + main + footer);
}
const cards = entries.map(e => `      <section id="${e.id}" class="wk-entry" aria-labelledby="entry-${e.id}">
        ${mediaFor(e)}
        <p class="wk-category">${e.kind} · ${e.city}</p>
        <h2 id="entry-${e.id}" class="wk-object">${escape(e.title)}</h2>
        <p class="wk-byline">${e.byline}</p>
        <p class="wk-city">${e.relation}：${e.city}</p>
        ${officialActions[e.id]||''}
        <p class="wk-primary"><a class="wk-route" href="./work-${e.id}.html">${e.action}<span aria-hidden="true"> →</span></a></p>
      </section>`).join('\n');
write('works.html', header + `  <main id="main"><div class="wk-root">
    <header class="wk-head">
      <h1 class="wk-title">作品から入る</h1>
      <p class="wk-lead">気になる作品をひとつ。紹介とつながりは、次のページで。</p>
      <p class="wk-primary"><a class="wk-route" href="./v3-prototype/culture-experience-r2/index.html">短い音・映像から楽しむ<span aria-hidden="true"> →</span></a></p>
      <p class="wk-primary"><a class="wk-route" href="./discover/index.html">街別の映像・本・映画を選ぶ<span aria-hidden="true"> →</span></a></p>
    </header>
    <div class="wk-entry-grid">
${cards}
    </div>
    <div class="wk-exit"><p class="end-exit"><a class="other-shelves" href="./index.html">入口へ戻る</a></p></div>
  </div></main>

` + footer);
console.log('PASS work directory + 4 separate pages' + (process.argv.includes('--check') ? ' match source' : ' generated'));
