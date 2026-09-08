'use strict';
(() => {
  const cities = {
    koenji: { name:'高円寺', image:'assets/city-koenji.jpg', alt:'夜の高円寺の通り', place:'夜の通り', kind:'本', title:'高円寺純情商店街', hook:'店を営む家族の日常から、商店街の人間模様へ。', relation:'高円寺の風景から、同じ街の商店街を描く小説へ。写真が物語の具体的な地点を示すわけではありません。', path:'koenji/junjo.html', line:'商店街には、どんな物語があるのでしょう。' },
    kichijoji: { name:'吉祥寺', image:'assets/city-kichijoji.jpg', alt:'吉祥寺のハーモニカ横丁', place:'ハーモニカ横丁', kind:'映画', title:'PARKS パークス', hook:'一曲が時代をつなぐ映画から、公園の声を聴きにいく。', relation:'吉祥寺の風景から、同じ街の井の頭公園を舞台にした映画へ。写真の横丁とは別の場所です。', path:'kichijoji/parks.html', line:'一曲が、昔と今をつなぐことも。' },
    shimokitazawa: { name:'下北沢', image:'assets/city-shimokitazawa.jpg', alt:'下北沢の商店が並ぶ通り', place:'商店が並ぶ通り', kind:'映画', title:'街の上で', hook:'偶然の会話と出会いを、一日分の散歩のように観る。', relation:'下北沢の風景から、この街を舞台にした映画へ。写真を映画の撮影地点として紹介するものではありません。', path:'shimokitazawa/machinouede.html', line:'寄り道の途中に、物語が始まるかもしれません。' },
    jinbocho: { name:'神保町', image:'assets/city-jinbocho-suzuran.jpg', alt:'神保町・すずらん通り', place:'すずらん通り', kind:'本', title:'森崎書店の日々', hook:'古書店で過ごす時間から、人との出会いへ。', relation:'神保町の風景から、古書店街を舞台にした小説へ。写真の通りを小説の特定場面として示すものではありません。', path:'jinbocho/morisaki.html', line:'本を開くと、街の見え方も変わりそうです。' }
  };
  const $ = id => document.getElementById(id);
  let activeCity = null;
  function selectCity(id) {
    const city = cities[id];
    if (!city || id === activeCity) return;
    activeCity = id;
    document.querySelectorAll('[data-city]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.city === id)));
    $('scene-error').hidden = true;
    $('scene-image').alt = city.alt;
    $('scene-image').src = city.image;
    $('scene-title').textContent = city.name;
    $('scene').hidden = false;
    $('mosaic').hidden = true;
    $('reset').hidden = false;
    $('next-story').hidden = false;
    $('selection-status').textContent = `${city.name}・${city.place}。撮影時の記録です。`;
    $('story-kind').textContent = `${city.name}から出会う ${city.kind}`;
    $('story-title').textContent = city.title;
    $('story-hook').textContent = city.hook;
    $('story-relation').textContent = city.relation;
    $('story-link').href = `https://emotionbookstore.com/discover/${city.path}`;
    $('story-link').setAttribute('aria-label', `${city.title}の紹介へ（感情書店の公開サイト）`);
  }
  document.querySelectorAll('[data-city]').forEach(button => button.addEventListener('click', () => selectCity(button.dataset.city)));
  $('scene-image').addEventListener('error', () => { $('scene-error').hidden = false; });
  $('scene-image').addEventListener('load', () => { $('scene-error').hidden = true; });
  $('reset').addEventListener('click', () => {
    const previous = activeCity;
    activeCity = null;
    document.querySelectorAll('[data-city]').forEach(button => button.setAttribute('aria-pressed','false'));
    $('scene').hidden = true;
    $('mosaic').hidden = false;
    $('scene-error').hidden = true;
    $('reset').hidden = true;
    $('next-story').hidden = true;
    $('selection-status').textContent = '4つの街に戻りました。見たい風景を選べます。';
    document.querySelector(`[data-city="${previous || 'koenji'}"]`).focus();
  });
})();
