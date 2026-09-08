'use strict';
// Explicit editorial mapping. A venue/street photo is labelled as such, never as event artwork.
// Asset rights and source URLs are recorded in EVENT_MEDIA_ATTRIBUTION.md and credits.html.
const venues={
 za:{src:'/assets/events/za-koenji.webp',width:960,height:625,alt:'座・高円寺の建物',caption:'会場：座・高円寺（2018年）'},
 museum:{src:'/assets/events/kichijoji-museum.webp',width:960,height:1280,alt:'武蔵野市立吉祥寺美術館の入口',caption:'会場：吉祥寺美術館（2010年）'},
 theatre:{src:'/assets/events/kichijoji-theatre.webp',width:960,height:540,alt:'吉祥寺シアターの外観',caption:'会場：吉祥寺シアター（2019年）'},
 cinema:{src:'/assets/events/jinbocho-theatre.webp',width:960,height:720,alt:'神保町シアターの入口',caption:'会場：神保町シアター（2011年）'}
};
const streets={
 koenji:{src:'/assets/city-koenji.jpg',width:1200,height:1600,alt:'高円寺の路地',caption:'街の風景：高円寺'},
 kichijoji:{src:'/assets/city-kichijoji.jpg',width:1200,height:1600,alt:'吉祥寺のハーモニカ横丁',caption:'街の風景：吉祥寺'},
 shimokitazawa:{src:'/assets/city-shimokitazawa.jpg',width:1280,height:960,alt:'下北沢の通り',caption:'街の風景：下北沢'},
 jinbocho:{src:'/assets/city-jinbocho-suzuran.jpg',width:1280,height:853,alt:'神保町すずらん通り',caption:'街の風景：神保町'}
};
const byId={
 'koenji-midsummer':'za','koenji-bakumatsu':'za','koenji-cafetalk':'za',
 'kichijoji-hard-problem':'theatre','kichijoji-winter':'theatre',
 'kichijoji-taniguchi':'museum','kichijoji-livepainting':'museum',
 'jinbocho-mizoguchi':'cinema','jinbocho-ginga':'cinema','jinbocho-pokemon':'cinema'
};
const artistPost={url:'https://www.instagram.com/p/DbrZqrgEyrd/',embed:'https://www.instagram.com/p/DbrZqrgEyrd/embed/captioned/',author:'谷口智則',checkedAt:'2026-09-08',evidence:'Native Instagram embed verified in browser: author tomonori_taniguchi; exhibition title, Sep19–Nov3 2026 and Kichijoji Art Museum match the official event.'};
function mediaFor(e){return venues[byId[e.id]]||streets[e.city];}
function postFor(e){return ['kichijoji-taniguchi','kichijoji-livepainting'].includes(e.id)?artistPost:null;}
module.exports={mediaFor,postFor,venues,streets};
