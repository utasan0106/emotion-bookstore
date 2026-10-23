'use strict';
// Constrained generated markup contract, not a general HTML parser or visual pass.
const assert=require('node:assert/strict');
const reference=require('../tools/editorial-proposals/ui-reference.json');
const covers=require('../tools/work-cover-source.json');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function checkUi(html,route,cat) {
  const shelfNavigation=cat.shelves.length>0;
  const entry=shelfNavigation?{path:'/works.html#editorial-shelves',label:'棚をのぞく'}:{path:'/works.html',label:'作品を探す'};
  assert.ok(html.includes('<div class="brand-band">')&&html.includes('<div class="nav-band">')&&html.includes('<div class="location-band">'),'B UI: three header bands');
  const nav=html.match(/<nav class="wrap nav" aria-label="主な入口">([\s\S]*?)<\/nav>/)?.[1];
  assert.equal(nav,`<a href="${entry.path}"><span>${entry.label}</span></a><a href="/work-music.html"><span>音楽を探す</span></a><a href="/discover/"><span>街へ寄り道</span></a>`,'B UI: truthful available navigation');
  assert.ok(html.includes('<nav class="wrap breadcrumbs" aria-label="現在地">'),'B UI: location breadcrumb');
  assert.doesNotMatch(html,/href="(?:[^"#]*#listen|[^"#]*#shelves|[^"#]*outings\.html)"/,'B UI: no borrowed dead preview destinations');
  assert.ok(html.includes('<p class="prototype">選書と作品同士のつながりは、公開資料に基づく編集提案です。'),'B UI: visible editorial scope');
  const book=cat.books.find(w=>w.path===route), shelf=cat.shelves.find(s=>s.path===route);
  assert.ok(book||shelf,'B UI: must be an approved catalogue route');
  assert.ok(html.includes('<span aria-current="page">'+esc((book||shelf).title)+'</span>'),'B UI: actual page breadcrumb');
  if(book) {
    const returnShelf=cat.shelves.find(s=>s.works.some(w=>w.id===book.key));
    const back=returnShelf?{path:returnShelf.path,label:returnShelf.title}:{path:'/work-book.html',label:'本を選び直す'};
    assert.ok(html.includes(`<a class="back" href="${back.path}">← ${esc(back.label)}</a>`),'B UI: approved contextual book back link');
    assert.ok(html.includes('<section class="related-section" aria-labelledby="next-title"><p class="eyebrow">ここから、次の一冊へ。</p><h2 id="next-title">どちらへ寄り道する？</h2>'),'B UI: related section hierarchy');
    assert.ok(html.includes('本 / '+esc(book.editionLabel.split(' · ISBN ')[0])),'B UI: edition eyebrow');
    assert.equal((html.match(/class="related-work"/g)||[]).length,book.relatedWorks.filter(r=>cat.byId.has(r.id)).length,'B UI: only available related works');
  } else {
    assert.ok(html.includes('<p class="eyebrow">3作品の棚 / 公開資料に基づく選書</p>'),'B UI: shelf scope');
    assert.ok(html.includes('<strong>選び方について</strong>'),'B UI: shelf selection explanation');
    assert.equal((html.match(/<article class="work"/g)||[]).length,3,'B UI: three shelf works');
    const cards=[...html.matchAll(/<article class="work"[^>]*>([\s\S]*?)<\/article>/g)].map(m=>m[1]);
    const top=html.match(/<div class="detail-top">([\s\S]*?)<\/div><div class="detail-works">/)?.[1];
    assert.ok(top&&!top.includes('<aside'),'B UI: works precede selection-method disclosure');
    assert.ok(html.indexOf('<aside class="editor-note shelf-method">')>html.lastIndexOf('</article>'),'B UI: method disclosure follows all works');
    assert.equal((html.match(/<aside class="editor-note shelf-method">/g)||[]).length,1,'B UI: method disclosure retained exactly once');
    assert.ok(html.includes('<strong>選び方について</strong>'+esc(shelf.note)+'</aside>'),'B UI: complete method disclosure remains visible');
    for(let i=0;i<cards.length;i++) {
      const card=cards[i],work=cat.byId.get(shelf.works[i].id);
      const order=['<h2 class="work-title"','<div class="work-art">','<p class="meta">','<div class="work-copy">'].map(token=>card.indexOf(token));
      assert.ok(order[0]===0&&order.every((x,j)=>x>=0&&(j===0||x>order[j-1])),'B UI: title art metadata copy DOM order');
      assert.ok(card.slice(0,order[1]).includes('<a href="'+work.path+'">'+esc(work.title)+'</a>'),'B UI: full unchanged work title and destination');
      const artwork=card.slice(order[1],order[2]);
      if(artwork.includes('<img ')) assert.ok(artwork.includes('<a href="'+esc(work.path)+'"><img '),'B UI: shelf cover preserves its work link');
      assert.doesNotMatch(artwork,/tabindex=/,'B UI: shelf cover preserves natural Tab order');
      const copy=card.slice(order[3]);
      const texts=['class="reason"','class="source"','class="credit"','class="bridge"'].map(token=>copy.indexOf(token));
      assert.ok(texts.slice(0,3).every((x,j)=>x>=0&&(j===0||x>texts[j-1]))&&(!shelf.works[i].next||texts[3]>texts[2]),'B UI: explanation source rights bridge DOM order');
    }
    for(const item of shelf.works) {
      const work=cat.byId.get(item.id),edition=work.origin==='editorial'?work.editionLabel:reference.existingDisplay[work.key].edition;
      assert.ok(html.includes(`<p class="meta">${esc(work.creator)}<br>${esc(edition)}</p>`),'B UI: creator role and edition visible');
      const cover=work.origin==='editorial'?work.cover:covers[work.key];
      if(work.origin==='editorial'||(cover?.status==='usable'&&cover.imageUrl.startsWith('/'))) assert.ok(html.includes(esc(cover.credit)),'B UI: full rights credit preserved');
      else assert.ok(html.includes(esc(reference.existingDisplay[work.key].noMediaNote)),'B UI: no-media explanation preserved');
    }
  }
  for(const held of require('../tools/editorial-proposals/shelves.json').filter(s=>!cat.shelves.some(a=>a.id===s.id))) assert.ok(!html.includes('href="'+held.path+'"'),'B UI: held shelf has no public link');
  return true;
}
module.exports={checkUi,cssSha256:reference.cssSha256};
