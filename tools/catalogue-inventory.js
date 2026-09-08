'use strict';
// Editorial-only inventory. Does not fetch, approve, publish, or change source data.
const {items,excludedItems}=require('./city-discovery-source');
const covers=require('./work-cover-source.json');
const cities={koenji:'高円寺',kichijoji:'吉祥寺',shimokitazawa:'下北沢',jinbocho:'神保町'};
const kinds={audio:'音楽',video:'映像',book:'本・漫画',film:'映画'};
function inventory() {
  const rows=Object.entries(cities).flatMap(([city,cityName])=>Object.entries(kinds).map(([kind,kindName])=>{
    const published=items.filter(i=>i.city===city&&i.kind===kind);
    const held=excludedItems.filter(i=>i.city===city&&i.kind===kind);
    return {city,cityName,kind,kindName,published:published.length,held:held.length,remainingBeforeListLimit:Math.max(0,10-published.length)};
  }));
  const candidates=excludedItems.map(i=>{
    const cover=covers[i.city+'/'+i.id];
    return {id:i.city+'/'+i.id,title:i.title,creator:i.creator,kind:i.kind,relation:i.relation,
      relationNote:i.relationNote,sources:i.sources,checkedAt:i.checkedAt,
      status:'hold',reason:i.kind==='book'?'usable-cover-unconfirmed':'usable-media-unconfirmed',
      coverStatus:cover?.status||'not-recorded',
      nextCheck:i.kind==='book'?'出版社等で版・書影利用条件・画像と紹介対象の一致を確認':'公式予告・公開元・作品一致・再生可否を確認',
      autoPublish:false};
  });
  return {published:items.length,held:excludedItems.length,rows,candidates};
}
module.exports=inventory;
if(require.main===module) console.log(JSON.stringify(inventory(),null,2));
