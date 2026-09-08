'use strict';
const fs=require('node:fs'),path=require('node:path');
const {audiences,issues}=require('./weekly-outings-source');
const root=path.resolve(__dirname,'..'), out=path.join(root,'outings');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const files=[];
function write(file,body,title){
 files.push(file); const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}｜みんなの感情書店</title><meta name="description" content="誰と出かけるかで選ぶ、街と文化のおすすめ。掲載週と選んだ理由、公式案内を確認できます。"><link rel="canonical" href="https://emotionbookstore.com/outings/${file.replace(/index.html$/,'')}"><link rel="stylesheet" href="/discover/discover.css"><link rel="stylesheet" href="/outings/outings.css"><script src="/outings/week.js" defer></script></head><body><header class="masthead"><a class="brand" href="/">みんなの感情書店</a></header><main>${body}</main><footer class="footer"><a href="/discover/">街と作品を探す</a><a href="/credits.html">写真・出典</a></footer></body></html>`;
 const dest=path.join(out,file);if(process.argv.includes('--check')){if(!fs.existsSync(dest)||fs.readFileSync(dest,'utf8')!==html)throw Error('Generated page differs: '+file);}else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html);}
}
const pathFor=(issue,s)=>`${issue.start}/${s.id}.html`;
for(let n=0;n<issues.length;n++){
 const i=issues[n];if(!/^\d{4}-\d{2}-\d{2}$/.test(i.start)||!/^\d{4}-\d{2}-\d{2}$/.test(i.end)||new Date(i.end)-new Date(i.start)!==7*864e5)throw Error('Issue must cover seven days');
 if(n&&issues[n-1].end>i.start)throw Error('Overlapping issues');
 for(const a of audiences)if(i.spots.filter(s=>s.audience===a.id).length!==1)throw Error('One recommendation per audience per issue');
 for(const s of i.spots){
  if(!s.url.startsWith('https://')||!s.reason||!s.practical||!fs.existsSync(path.join(root,s.image)))throw Error('Missing evidence or image');
  const a=audiences.find(a=>a.id===s.audience);
  write(pathFor(i,s),`<a class="back" href="/outings/${a.id}.html">${a.label}のおすすめへ ←</a><article class="detail"><p class="eyebrow">${a.label} / ${esc(s.city)}</p><p data-week-start="${i.start}" data-week-end="${i.end}" class="week-state">${i.label}掲載</p><h1>${esc(s.name)}</h1><figure><img class="spot-photo" src="${s.image}" alt="${esc(s.imageAlt)}"><figcaption>${esc(s.imageAlt)}</figcaption></figure><p class="detail-hook">${esc(s.hook)}</p><p>${esc(s.reason)}</p><p>${esc(s.format)} · 滞在 ${esc(s.time)}（目安）</p><h2>出かける前に</h2><p>${esc(s.practical)}</p><a class="primary" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.action)} ↗</a><p class="checked">公式情報確認：${i.checkedAt}。おすすめの掲載期間は、施設の開催期間・営業保証ではありません。</p><section class="background"><h2>文化の寄り道</h2><p>${esc(s.culture)}</p><a href="${s.cultureUrl}">関連する作品へ →</a></section></article>`,s.name);
 }
}
write('index.html',`<section class="intro"><p class="eyebrow">週替わりの街と文化案内</p><h1>誰と出かける？</h1><p class="lead">今日の過ごし方に合わせて、気になる場所を一つ。毎週の編集で選んだおすすめです。</p><p>「子どもと」は小さな子との設備や休憩を重視。「家族で」は世代を問わず一緒に楽しむ提案です。</p></section><div class="audience-grid">${audiences.map(a=>`<a href="/outings/${a.id}.html"><h2>${a.label} →</h2><p>${a.note}</p></a>`).join('')}</div><p class="checked">初回は高円寺・吉祥寺・神保町から。紹介する街は週ごとの編集で選びます。</p>`,'誰と出かける？');
for(const a of audiences)write(`${a.id}.html`,`<a class="back" href="/outings/">過ごし方を選び直す ←</a><section class="intro"><h1>${a.label}</h1><p>${a.note}</p></section>${[...issues].reverse().map(i=>{const s=i.spots.find(s=>s.audience===a.id);return `<section class="issue" data-issue-start="${i.start}"><p class="week-state" data-week-start="${i.start}" data-week-end="${i.end}">${i.label}掲載</p><a class="spot-card" href="/outings/${pathFor(i,s)}"><img src="${s.image}" alt="${esc(s.imageAlt)}" loading="lazy"><div><p>${esc(s.city)} · ${esc(s.format)}</p><h2>${esc(s.name)}</h2><p>${esc(s.hook)}</p><span>この場所の楽しみ方を見る →</span></div></a></section>`}).join('')}`,`${a.label}のおすすめ`);
module.exports=files.map(f=>'outings/'+f.replace(/index.html$/,''));
console.log('PASS '+files.length+' weekly outing pages '+(process.argv.includes('--check')?'match source':'generated'));
