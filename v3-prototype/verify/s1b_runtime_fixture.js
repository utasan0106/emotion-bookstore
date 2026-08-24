/* Internal-only S1B Featured/video fixture. This file is under /verify and is
   never Product inventory. It does not source, scrape or activate live media. */
(function (global) {
  'use strict';

  var query = new URLSearchParams(global.location.search);
  if (query.get('s1b') !== '1') return;

  function localDate() {
    var now = new Date();
    function pad(value) { return value < 10 ? '0' + value : String(value); }
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  var shelfId = query.get('shelf') || 'atatamaru';
  var withEditorial = query.get('editorial') === 'video';
  global.V3_S1B_EDITORIAL_CONTENT = Object.freeze({
    version: 'v3-s1b-isolated-runtime-fixture-v1',
    featured: Object.freeze(withEditorial ? [{
      featuredId: 'FIXTURE-FEATURED-1',
      contentId: 'FIXTURE-WORK-1',
      shelfId: shelfId,
      title: 'S1B Featured isolated fixture',
      status: 'READY',
      featured: true,
      featuredSince: localDate(),
      officialFact: '隔離fixtureの表示事実です。Product inventoryではありません。',
      editorialWhy: 'Featuredの事実と編集理由を分離して表示するための隔離fixtureです。',
      rightsState: 'fallback_ready',
      officialUrl: 'https://example.com/s1b-featured-fixture'
    }] : []),
    videos: Object.freeze(withEditorial ? [{
      videoId: 'FIXTURE-VIDEO-1',
      shelfId: shelfId,
      title: 'S1B editorial video isolated fixture',
      mediaState: 'CLICK_TO_LOAD_READY',
      provider: 'youtube',
      officialUrl: 'https://example.com/s1b-video-fixture',
      embedUrl: 'https://www.youtube-nocookie.com/embed/TEST_123',
      sourceOfficial: true,
      rightsState: 'approved',
      editorialWhy: '映像を棚の定義や選好シグナルにしないことを確認する隔離fixtureです。',
      viewingPoint: '再生しなくても棚の意味が分かり、再生は明示操作だけで始まります。',
      mediaShape: 'landscape',
      nativeWidth: 1440,
      nativeHeight: 1080,
      autoplay: false,
      soundOnLoad: false,
      firstPaintPlayerRequest: false
    }] : []),
    dailyLineups: Object.freeze([])
  });

  global.__S1B_QA__ = Object.freeze({
    shelfId: shelfId,
    editorialFixture: withEditorial
  });
})(window);
