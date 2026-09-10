(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-TGLD3KW523';
  var PROD_HOST = 'emotionbookstore.com';
  var OPTOUT_KEY = 'v3_ga_optout';
  var COOKIE_EXPIRES_SECONDS = 60 * 24 * 60 * 60;

  /* Measurement v4.1 (2026-09-06, Production Beta 0 — inline video + Koenji Spatial Beta).
     The eight Beta events stay as they were. Nine bounded events are added on top.
     Every custom param is allowlisted (content_type / content_id / link_domain only) and every value
     is checked against a closed vocabulary; anything unknown drops the whole event, never coerced.
     Never sent as a custom event value: visible title, body text, free text, full external URL / query / hash,
     video id, organizer name, exact position, map frame / camera / view, selected building or its id,
     GPS, favorites, private input, emotion, account / user id. */
  var ALLOWED_EVENTS = {
    v3_home_view: true,
    v3_shelf_open: true,
    v3_shelf_view: true,
    v3_detail_open: true,
    v3_official_action: true,
    v3_suggest_view: true,
    v3_suggest_copy: true,
    v3_suggest_form_open: true,

    v3_entry_open: true,
    v3_works_section_view: true,
    v3_thread_start: true,
    v3_thread_stage: true,
    v3_thread_complete: true,
    v3_evidence_open: true,
    v3_external_open: true,
    v3_continue_open: true,
    v3_media_preview_open: true
  };

  var SAFE_CONTENT_TYPES = {
    home: true,
    city: true,
    shelf: true,
    work: true,
    thread: true,
    thread_stage: true,
    spatial: true,
    external: true,
    video: true
  };

  var SAFE_CONTENT_IDS = {
    // Bounded origin classes (v3_external_open / v3_media_preview_open).
    home: true,
    shelf: true,
    work: true,
    thread: true,
    spatial: true,
    outings: true,

    // Public content ids: the four cities, the four Works entries, the five Threads.
    koenji: true,
    jinbocho: true,
    shimokitazawa: true,
    kichijoji: true,
    book: true,
    film: true,
    music: true,
    video: true,
    morisaki_book: true,
    morisaki_film: true,
    koenji_dance_history: true,
    kichijoji_parks: true,
    shimokitazawa_ladyjane: true,
    'shimokitazawa_ladyjane:l0': true, 'shimokitazawa_ladyjane:l1': true,
    'shimokitazawa_ladyjane:l2': true, 'shimokitazawa_ladyjane:l3': true,
    'kichijoji_parks:p0': true, 'kichijoji_parks:p1': true,
    'kichijoji_parks:p2': true, 'kichijoji_parks:p3': true,

    // Composite thread-stage ids (thread:stage). Bare stage ids are not allowed.
    'koenji_dance_history:s0': true, 'koenji_dance_history:s1': true, 'koenji_dance_history:s2': true,
    'koenji_dance_history:s3': true, 'koenji_dance_history:s4': true, 'koenji_dance_history:s5': true,
    'morisaki_book:w0': true, 'morisaki_book:w1': true, 'morisaki_book:w2': true,
    'morisaki_book:w3': true, 'morisaki_book:w4': true, 'morisaki_book:w5': true,
    'morisaki_film:w0': true, 'morisaki_film:w1': true, 'morisaki_film:w2': true,
    'morisaki_film:w3': true, 'morisaki_film:w4': true, 'morisaki_film:w5': true
  };

  /* Public routes → bounded ids. The route value itself never leaves the page; only the mapped id can. */
  var THREAD_IDS = {
    'koenji-dance-history': 'koenji_dance_history',
    'kichijoji-parks': 'kichijoji_parks',
    'shimokitazawa-ladyjane': 'shimokitazawa_ladyjane',
    'morisaki-book': 'morisaki_book',
    'morisaki-film': 'morisaki_film'
  };
  var SHELF_IDS = { koenji: 'koenji', kichijoji: 'kichijoji', shimokitazawa: 'shimokitazawa', jinbocho: 'jinbocho' };
  var WORK_ENTRY_IDS = { book: 'book', film: 'film', music: 'music', video: 'video' };

  /* Approved external surfaces per public page. Nothing else (calendar utility, credits, menu, arbitrary anchors) is measured. */
  var EXTERNAL_SURFACES = {
    home: [{ anchor: 'a.hc-reality-card.official-action[href]' }, { anchor: 'a.hc-hero-cta[data-featured-work][href]' }],
    shelf: [{ anchor: 'a.official-action[href]' }, { anchor: 'a.weekly-feature-official[href]' }],
    work: [{ anchor: 'a.wk-action[href]' }],
    thread: [{ anchor: 'a.th-source-link[href]' }, { anchor: 'a.th-destination-link[href]' }],
    spatial: [{ anchor: 'a.al-link[href]' }, { anchor: 'a[href]', within: '.al-attribution-links' }],
    /* 催しの公式・予約先だけ。カードに出している出典・記録のリンク（class 無し）は
       根拠であって行き先ではないので、意図的に入れない。 */
    outings: [{ anchor: 'a.event-official[href]' }, { anchor: 'a.primary[href]' }]
  };

  function isAllowedContentType(value) {
    return !!SAFE_CONTENT_TYPES[String(value || '')];
  }

  function isAllowedContentId(value) {
    return !!SAFE_CONTENT_IDS[String(value || '')];
  }

  function safeDomain(value) {
    if (!value) return '';
    try {
      var host = String(value).indexOf('://') >= 0 ? new URL(value).hostname : String(value);
      return /^[a-z0-9.-]+$/i.test(host) ? host.toLowerCase() : '';
    } catch (_) {
      return '';
    }
  }

  if (location.hostname !== PROD_HOST) return;

  var initialUrl;
  try {
    initialUrl = new URL(location.href);
  } catch (_) {
    return;
  }

  var analyticsControl = initialUrl.searchParams.get('analytics');
  var campaignSource = initialUrl.searchParams.get('src');
  campaignSource = campaignSource === 'x' || campaignSource === 'note' ? campaignSource : '';

  if (analyticsControl === 'off' || analyticsControl === 'on') {
    try {
      if (analyticsControl === 'off') localStorage.setItem(OPTOUT_KEY, '1');
      else localStorage.removeItem(OPTOUT_KEY);
    } catch (_) {}

    initialUrl.searchParams.delete('analytics');
    if (history && typeof history.replaceState === 'function') {
      history.replaceState(null, '', initialUrl.pathname + initialUrl.search + initialUrl.hash);
    }
    if (analyticsControl === 'off') return;
  }

  var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') return;

  try {
    if (localStorage.getItem(OPTOUT_KEY) === '1') return;
  } catch (_) {}

  /* Bounded page class: which public surface this is. Nothing finer than the surface is derived from the URL. */
  function pageClass() {
    var path = location.pathname || '/';
    if (path === '/' || path === '/index.html') return 'home';
    if (path === '/shelf.html') return 'shelf';
    if (path === '/works.html' || path === '/work-book.html' || path === '/work-film.html' || path === '/work-music.html' || path === '/work-video.html') return 'work';
    if (path === '/thread.html') return 'thread';
    if (path === '/atlas/' || path === '/atlas/index.html') return 'spatial';
    /* 催しのページ。ここは「現実へ出る」導線の本体だが、種別が無かったため公式サイトへの
       退出が1件も測れていなかった。2026-09-11、催し一覧1ページだけで試している。
       ここが 'outings' を返しても、スクリプトを読み込んでいないページでは何も起きない。 */
    if (path.indexOf('/outings/') === 0) return 'outings';
    return '';
  }

  function coarseTitle() {
    var page = pageClass();
    if (page === 'home') return 'V3 Home';
    if (page === 'shelf') return 'V3 Shelf';
    if (page === 'work') return 'V3 Works';
    if (page === 'thread') return 'V3 Thread';
    if (page === 'spatial') return 'V3 Spatial Beta';
    if (page === 'outings') return 'V3 Outings';
    var path = location.pathname || '/';
    if (path === '/suggest.html') return 'V3 Suggest';
    if (path === '/data.html') return 'V3 Data';
    return 'V3 Public';
  }

  function safeLocation() {
    return location.origin + (location.pathname || '/');
  }

  function safeReferrer() {
    if (!document.referrer) return '';
    try {
      var ref = new URL(document.referrer);
      return ref.origin;
    } catch (_) {
      return '';
    }
  }

  /* A route parameter read from an internal href, mapped only through a closed table. */
  function routeParam(href, key) {
    try {
      return new URL(String(href || ''), location.origin).searchParams.get(key) || '';
    } catch (_) {
      return '';
    }
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(Array.prototype.slice.call(arguments));
  }
  window.gtag = window.gtag || gtag;

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted'
  });
  window.gtag('js', new Date());
  /* Privacy hardening: the config itself carries only the sanitized page fields, so automatic collection
     never sees the full URL (query / hash), the visible title or the referrer path. */
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: COOKIE_EXPIRES_SECONDS,
    cookie_flags: 'SameSite=Lax;Secure',
    page_location: safeLocation(),
    page_title: coarseTitle(),
    page_referrer: safeReferrer()
  });

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(script);

  function commonParams() {
    var params = {
      page_location: safeLocation(),
      page_title: coarseTitle(),
      page_referrer: safeReferrer()
    };
    if (campaignSource) params.campaign_source = campaignSource;
    return params;
  }

  function boundedParams(extra) {
    var params = commonParams();
    extra = extra || {};

    if (extra.content_type && isAllowedContentType(extra.content_type)) {
      params.content_type = String(extra.content_type);
    }
    if (extra.content_id && isAllowedContentId(extra.content_id)) {
      params.content_id = String(extra.content_id);
    }
    if (extra.link_domain) {
      var domain = safeDomain(extra.link_domain);
      if (domain) params.link_domain = domain;
    }
    return params;
  }

  function sendEvent(name, params) {
    if (!ALLOWED_EVENTS[name]) return;
    window.gtag('event', name, boundedParams(params));
  }

  /* A bounded event: the whole event drops when its type / id is outside the closed vocabulary. */
  function sendBounded(name, type, id, extra) {
    if (!isAllowedContentType(type) || !isAllowedContentId(id)) return;
    var params = { content_type: type, content_id: id };
    if (extra && extra.link_domain) params.link_domain = extra.link_domain;
    sendEvent(name, params);
  }

  window.gtag('event', 'page_view', commonParams());

  var pageTitle = coarseTitle();
  if (pageTitle === 'V3 Home') sendEvent('v3_home_view');
  else if (pageTitle === 'V3 Shelf') sendEvent('v3_shelf_view');
  else if (pageTitle === 'V3 Suggest') sendEvent('v3_suggest_view');

  var pageSeen = Object.create(null);
  function once(key, fn) {
    if (pageSeen[key]) return;
    pageSeen[key] = true;
    fn();
  }

  function closest(target, selector) {
    if (!target) return null;
    if (typeof target.closest === 'function') return target.closest(selector);
    var node = target;
    while (node && node !== document) {
      if (typeof node.matches === 'function' && node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }

  var page = pageClass();

  /* Bounded API. Page adapters below and video-embed.js call only these. */
  var api = Object.freeze({
    entryOpen: function (type, id) {
      once('entry:' + type + ':' + id, function () {
        sendBounded('v3_entry_open', type, id);
      });
    },
    worksSectionView: function (sectionId) {
      var id = WORK_ENTRY_IDS[String(sectionId || '')];
      if (!id) return;
      once('works-section:' + id, function () {
        sendBounded('v3_works_section_view', 'work', id);
      });
    },
    threadStart: function (id) {
      once('thread-start:' + id, function () {
        sendBounded('v3_thread_start', 'thread', id);
      });
    },
    threadStage: function (threadId, stageId) {
      var composite = String(threadId || '') + ':' + String(stageId || '');
      once('thread-stage:' + composite, function () {
        sendBounded('v3_thread_stage', 'thread_stage', composite);
      });
    },
    threadComplete: function (id) {
      once('thread-complete:' + id, function () {
        sendBounded('v3_thread_complete', 'thread', id);
      });
    },
    evidenceOpen: function (type, id) {
      once('evidence:' + type + ':' + id, function () {
        sendBounded('v3_evidence_open', type, id);
      });
    },
    externalOpen: function (originId, href) {
      var domain = safeDomain(href);
      if (!domain) return;
      sendBounded('v3_external_open', 'external', originId, { link_domain: domain });
    },
    continueOpen: function (type, id) {
      once('continue:' + type + ':' + id, function () {
        sendBounded('v3_continue_open', type, id);
      });
    },
    /* Inline official video: only when the visitor's explicit click created the player (video-embed.js,
       which removes the load button, so each player host can call this once). The origin class is the
       only id (thread | work); no video id, title, duration or playback state. Not a playback proof. */
    mediaPreviewOpen: function (id) {
      var origin = id || page;
      if (origin !== 'thread' && origin !== 'work') return;
      sendEvent('v3_media_preview_open', { content_type: 'video', content_id: origin });
    }
  });
  window.v3Analytics = api;

  /* ---- entry: the Spatial Beta counts on arrival (it has one bounded entrance); every other entry is a HOME click ---- */
  if (page === 'spatial') api.entryOpen('spatial', 'koenji');

  function homeEntry(target) {
    var cityEntry = closest(target, 'a.hc-city.shelf-entry[href]');
    if (cityEntry) {
      var cityHref = cityEntry.getAttribute('href') || '';
      var cityPath = cityHref.match(/^\/discover\/(koenji|kichijoji|shimokitazawa|jinbocho)\/(?:index\.html)?$/);
      var cityId = SHELF_IDS[cityPath ? cityPath[1] : routeParam(cityHref, 'shelf')];
      if (cityId) api.entryOpen('city', cityId);
      return;
    }
    var workEntry = closest(target, 'a.hc-work[data-work][href]');
    if (workEntry) {
      var workId = WORK_ENTRY_IDS[String(workEntry.getAttribute('data-work') || '')];
      if (workId) api.entryOpen('work', workId);
      return;
    }
    var threadEntry = closest(target, 'a.hc-hero-cta[href], a.hc-thread-read[href]');
    if (threadEntry) {
      var threadId = THREAD_IDS[routeParam(threadEntry.getAttribute('href'), 'thread')];
      if (threadId) api.entryOpen('thread', threadId);
    }
  }

  function approvedExternalAnchor(target) {
    var surfaces = EXTERNAL_SURFACES[page] || [];
    for (var i = 0; i < surfaces.length; i++) {
      var anchor = closest(target, surfaces[i].anchor);
      if (!anchor) continue;
      if (surfaces[i].within && !closest(anchor, surfaces[i].within)) continue;
      var href = String(anchor.getAttribute('href') || '');
      if (/^https?:\/\//i.test(href)) return href;
    }
    return '';
  }

  /* ---- clicks: the eight Beta events as before; HOME entries, approved external opens and cultural continuation on top ---- */
  document.addEventListener('click', function (event) {
    var target = event.target;

    if (page === 'home') homeEntry(target);

    if (closest(target, '.shelf-entry, .result-link')) {
      sendEvent('v3_shelf_open');
      return;
    }
    if (closest(target, '.open-button')) {
      sendEvent('v3_detail_open');
      return;
    }
    if (closest(target, 'a.official-action[href]')) {
      sendEvent('v3_official_action');
    }
    if (closest(target, '#sg-copy')) {
      sendEvent('v3_suggest_copy');
      return;
    }
    if (closest(target, '#sg-form')) {
      sendEvent('v3_suggest_form_open');
      return;
    }
    if (!page) return;

    var externalHref = approvedExternalAnchor(target);
    if (externalHref) {
      api.externalOpen(page, externalHref);
      return;
    }

    /* cultural continuation between public surfaces (not generic navigation) */
    var anchor = closest(target, 'a[href]');
    if (!anchor) return;
    var route = String(anchor.getAttribute('href') || '').split('#')[0];
    var threadRoute = route.match(/(?:^|\/)thread\.html\?thread=([a-z0-9-]+)$/);
    if (threadRoute && THREAD_IDS[threadRoute[1]] && (page === 'work' || page === 'spatial')) {
      api.continueOpen('thread', THREAD_IDS[threadRoute[1]]);
    } else if (page === 'thread' && /(?:^|\/)atlas\/?$/.test(route)) {
      api.continueOpen('spatial', 'koenji');
    }
  }, true);

  /* ---- evidence: a drawer opened on the Thread or the Spatial Beta ---- */
  document.addEventListener('toggle', function (event) {
    var el = event.target;
    if (!el || String(el.tagName).toUpperCase() !== 'DETAILS' || !el.open) return;
    if (page === 'thread') {
      var article = document.getElementById('threadRoot');
      article = article && article.querySelector('.th-thread[data-thread-id]');
      var tid = article ? THREAD_IDS[String(article.getAttribute('data-thread-id') || '')] : '';
      if (tid && closest(el, '.th-evidence')) api.evidenceOpen('thread', tid);
    } else if (page === 'spatial' && closest(el, '.al-evidence')) {
      api.evidenceOpen('spatial', 'koenji');
    }
  }, true);

  /* ---- reach: Thread start / stage / complete and Works sections, by visibility ---- */
  function observeReach(elements, onReach) {
    if (typeof IntersectionObserver !== 'function' || !elements.length) return;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        onReach(entries[i].target);
        io.unobserve(entries[i].target);
      }
    }, { threshold: 0, rootMargin: '0px 0px -40% 0px' });
    for (var j = 0; j < elements.length; j++) io.observe(elements[j]);
  }

  function threadAdapter() {
    /* only a Thread that actually rendered (lost / unknown routes emit nothing) */
    var root = document.getElementById('threadRoot');
    var article = root && root.querySelector('.th-thread[data-thread-id]');
    var tid = article ? THREAD_IDS[String(article.getAttribute('data-thread-id') || '')] : '';
    if (!tid) return;
    api.threadStart(tid);
    var scenes = Array.prototype.slice.call(article.querySelectorAll('.th-scene[data-scene]'));
    var end = article.querySelector('.th-end');
    observeReach(end ? scenes.concat([end]) : scenes, function (el) {
      if (el === end) api.threadComplete(tid);
      else api.threadStage(tid, el.getAttribute('data-scene') || '');
    });
  }

  function worksAdapter() {
    var sections = Array.prototype.slice.call(document.querySelectorAll('.wk-work[data-work]'));
    observeReach(sections, function (el) { api.worksSectionView(el.getAttribute('data-work') || ''); });
  }

  function runAdapters() {
    if (page === 'thread') threadAdapter();
    else if (page === 'work') worksAdapter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runAdapters);
  else runAdapters();
})();
