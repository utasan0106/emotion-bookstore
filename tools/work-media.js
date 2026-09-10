'use strict';
// Actual work media only. No decorative stand-ins for unresolved covers/stills.
const covers = require('./work-cover-source.json');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function youtube(id,title,label='公開元の映像',url='https://www.youtube.com/watch?v='+id,verb='見る'){
 if(!/^[\w-]{11}$/.test(id)) throw Error('Invalid YouTube ID: '+id);
 // Click-to-load: the page never contacts the provider until the visitor asks for it.
 // Host markup and behaviour are video-embed.js's (Founder decision 2026-09-06 v2).
 return `<figure class="official-media"><div class="wk-video v3-video" data-video-id="${id}" data-video-title="${esc(title)}｜${esc(label)}"><div class="v3-video-frame"><button class="v3-video-load wk-video-load" type="button">${esc(label)}を${esc(verb)}<span class="wk-mark" aria-hidden="true"> ▶</span></button></div></div><figcaption><span class="official-media-note">押すまでYouTubeへ接続しません。押すと、このページ内でプレイヤーが開きます。自動再生はしません。</span><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}をYouTubeで開く ↗</a></figcaption></figure>`;
}
function cover(key,title){
 const m=covers[key];
 if(!m||m.status!=='usable') return '';
 return `<figure class="official-media cover"><img src="${esc(m.imageUrl)}" alt="${esc(title)}の表紙" loading="lazy" decoding="async" width="${m.width}" height="${m.height}"><figcaption>${esc(m.credit)} · <a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">書籍情報 ↗</a></figcaption></figure>`;
}
function forItem(item){
 if(item.videoId) return youtube(item.videoId,item.title,item.kind==='audio'?'公開元の演奏・音源':'公開元の映像',undefined,item.kind==='audio'?'聴く':'見る');
 if(item.trailerVideoId) return youtube(item.trailerVideoId,item.title,item.trailerLabel || '予告編（本編ではありません）',item.trailerUrl);
 return cover(item.city+'/'+item.id,item.title);
}
const ALBUM_EMBED='https://bandcamp.com/EmbeddedPlayer/album=1846332570/size=large/bgcol=ffffff/linkcol=0687f5/minimal=true/transparent=true/';
function album(){return `<figure class="official-media album"><div class="wk-video v3-video" data-embed-src="${esc(ALBUM_EMBED)}" data-video-title="Boris with Michio Kurihara｜不透明度のジャケット"><div class="v3-video-frame"><button class="v3-video-load wk-video-load" type="button">公式Bandcampのプレーヤーを開く<span class="wk-mark" aria-hidden="true"> ▶</span></button></div></div><figcaption><span class="official-media-note">押すまでBandcampへ接続しません。押すと、このページ内でプレーヤーが開きます。自動再生はしません。</span>公式Bandcampのジャケット</figcaption></figure>`;}
module.exports={youtube,cover,forItem,album};
