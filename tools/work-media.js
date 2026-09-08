'use strict';
// Actual work media only. No decorative stand-ins for unresolved covers/stills.
const covers = require('./work-cover-source.json');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function youtube(id,title,label='公開元の映像',url='https://www.youtube.com/watch?v='+id){
 if(!/^[\w-]{11}$/.test(id)) throw Error('Invalid YouTube ID: '+id);
 return `<figure class="official-media"><iframe title="${esc(title)}｜${esc(label)}" src="https://www.youtube-nocookie.com/embed/${id}?autoplay=0&amp;playsinline=1&amp;rel=0" width="560" height="315" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe><figcaption><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}をYouTubeで開く ↗</a></figcaption></figure>`;
}
function cover(key,title){
 const m=covers[key];
 if(!m||m.status!=='usable') return '';
 return `<figure class="official-media cover"><img src="${esc(m.imageUrl)}" alt="${esc(title)}の表紙" loading="lazy" decoding="async" width="${m.width}" height="${m.height}"><figcaption>${esc(m.credit)} · <a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">書籍情報 ↗</a></figcaption></figure>`;
}
function forItem(item){
 if(item.videoId) return youtube(item.videoId,item.title,item.kind==='audio'?'公開元の演奏・音源':'公開元の映像');
 if(item.trailerVideoId) return youtube(item.trailerVideoId,item.title,item.trailerLabel || '予告編（本編ではありません）',item.trailerUrl);
 return cover(item.city+'/'+item.id,item.title);
}
function album(){return '<figure class="official-media album"><iframe title="Boris with Michio Kurihara｜不透明度のジャケット" src="https://bandcamp.com/EmbeddedPlayer/album=1846332570/size=large/bgcol=ffffff/linkcol=0687f5/minimal=true/transparent=true/" width="170" height="170" loading="lazy" seamless></iframe><figcaption>公式Bandcampのジャケット</figcaption></figure>';}
module.exports={youtube,cover,forItem,album};
