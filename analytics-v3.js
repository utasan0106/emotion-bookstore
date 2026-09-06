(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-TGLD3KW523';
  var PROD_HOST = 'emotionbookstore.com';
  var OPTOUT_KEY = 'v3_ga_optout';
  var COOKIE_EXPIRES_SECONDS = 60 * 24 * 60 * 60;

  /* Measurement v0.4 (2026-09-06, Production Beta 0 — inline video + Koenji Spatial Beta).
     The eight Beta events stay as they were. Nine bounded events are added on top.
     Every custom param is allowlisted (content_type / content_id / link_domain only) and every value
     is checked against a closed vocabulary; anything unknown is dropped, never coerced.
     Never sent: visible title, body text, free text, full URL / path / query / hash, video id,
     organizer name, map position or view state, selected building or its source id,
     location, favorites, private input, emotion, account / user id. */
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
    shelf: true,
    work: true,
    thread: true,
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

    // Public content ids: the Works page, the four cities, the three public Threads.
    works: true,
    koenji: true,
    jinbocho: true,
    shimokitazawa: true,
    kichijoji: true,
    morisaki_book: true,
    morisaki_film: true,
    koenji_dance_history: true,

    // Bounded thread-stage ids (Koenji s0..s5, Morisaki w0..w5).
    s0: true, s1: true, s2: true, s3: true, s4: true, s5: true,
    w0: true, w1: true, w2: true, w3: true, w4: true, w5: true
  };

  /* Public routes → bounded ids. The route value itself never leaves the page; only the mapped id can. */
  var THREAD_IDS = {
    'koenji-dance-history': 'koenji_dance_history',
    'morisaki-book': 'morisaki_book',
    'morisaki-film': 'morisaki_film'
  };
  var SHELF_IDS = { koenji: 'koenji', kichijoji: 'kichijoji', shimokitazawa: 'shimokitazawa', jinbocho: 'jinbocho' };

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
    if (path === '/works.html') return 'work';
    if (path === '/thread.html') return 'thread';
    if (path === '/atlas/' || path === '/atlas/index.html') return 'spatial';
    return '';
  }

  function coarseTitle() {
    var page = pageClass();
    if (page === 'home') return 'V3 Home';
    if (page === 'shelf') return 'V3 Shelf';
    if (page === 'work') return 'V3 Works';
    if (page === 'thread') return 'V3 Thread';
    if (page === 'spatial') return 'V3 Spatial Beta';
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

  function threadIdFromRoute() {
    return THREAD_IDS[initialUrl.searchParams.get('thread') || ''] || '';
  }

  function shelfIdFromRoute() {
    return SHELF_IDS[initialUrl.searchParams.get('shelf') || ''] || '';
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
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: COOKIE_EXPIRES_SECONDS,
    cookie_flags: 'SameSite=Lax;Secure'
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

  /* Bounded API. Page adapters below and video-embed.js call only these.
     A call with a value outside the closed vocabulary sends nothing at all. */
  function bounded(type, id) {
    return isAllowedContentType(type) && isAllowedContentId(id);
  }
  var api = Object.freeze({
    entryOpen: function (type, id) {
      if (!bounded(type, id)) return;
      once('entry:' + type + ':' + id, function () {
        sendEvent('v3_entry_open', { content_type: type, content_id: id });
      });
    },
    worksSectionView: function () {
      once('works-section', function () {
        sendEvent('v3_works_section_view', { content_type: 'work', content_id: 'works' });
      });
    },
    threadStart: function (id) {
      if (!bounded('thread', id)) return;
      once('thread-start:' + id, function () {
        sendEvent('v3_thread_start', { content_type: 'thread', content_id: id });
      });
    },
    threadStage: function (stageId) {
      if (!bounded('thread', stageId)) return;
      once('thread-stage:' + stageId, function () {
        sendEvent('v3_thread_stage', { content_type: 'thread', content_id: stageId });
      });
    },
    threadComplete: function (id) {
      if (!bounded('thread', id)) return;
      once('thread-complete:' + id, function () {
        sendEvent('v3_thread_complete', { content_type: 'thread', content_id: id });
      });
    },
    evidenceOpen: function (type, id) {
      if (!bounded(type, id)) return;
      once('evidence:' + type + ':' + id, function () {
        sendEvent('v3_evidence_open', { content_type: type, content_id: id });
      });
    },
    externalOpen: function (originId, href) {
      var domain = safeDomain(href);
      if (!bounded('external', originId) || !domain) return;
      sendEvent('v3_external_open', {
        content_type: 'external',
        content_id: originId,
        link_domain: domain
      });
    },
    continueOpen: function (type, id) {
      if (!bounded(type, id)) return;
      once('continue:' + type + ':' + id, function () {
        sendEvent('v3_continue_open', { content_type: type, content_id: id });
      });
    },
    /* Inline official video: only when the visitor's explicit click created the player
       (video-embed.js). Once per page load. The origin class is the only id (thread | work);
       no video id, title, duration or playback state. */
    mediaPreviewOpen: function (id) {
      var origin = id || page;
      if (origin !== 'thread' && origin !== 'work') return;
      once('media:' + origin, function () {
        sendEvent('v3_media_preview_open', { content_type: 'video', content_id: origin });
      });
    }
  });
  window.v3Analytics = api;

  /* ---- entry: landing on a bounded public surface ---- */
  if (page === 'shelf') { var shelfId = shelfIdFromRoute(); if (shelfId) api.entryOpen('shelf', shelfId); }
  else if (page === 'work') api.entryOpen('work', 'works');
  else if (page === 'thread') { var threadId = threadIdFromRoute(); if (threadId) api.entryOpen('thread', threadId); }
  else if (page === 'spatial') api.entryOpen('spatial', 'koenji');

  /* ---- clicks: the eight Beta events as before; external opens and cultural continuation on top ---- */
  document.addEventListener('click', function (event) {
    var target = event.target;

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

    var anchor = closest(target, 'a[href]');
    if (!anchor || !page) return;
    var href = String(anchor.getAttribute('href') || '');
    if (/^https?:\/\//i.test(href)) {
      /* external open: origin class + hostname only */
      api.externalOpen(page, href);
      return;
    }
    /* cultural continuation between public surfaces (not generic navigation) */
    var route = href.split('#')[0];
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
      var tid = threadIdFromRoute();
      if (tid && closest(el, '.th-evidence')) api.evidenceOpen('thread', tid);
    } else if (page === 'spatial' && closest(el, '.al-evidence')) {
      api.evidenceOpen('spatial', 'koenji');
    }
  }, true);

  /* ---- reach: Thread start / stage / complete and Works section, by visibility ---- */
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
    var tid = threadIdFromRoute();
    var root = document.getElementById('threadRoot');
    if (!tid || !root || !root.querySelector('.th-thread')) return;
    api.threadStart(tid);
    var scenes = Array.prototype.slice.call(root.querySelectorAll('.th-scene[data-scene]'));
    var end = root.querySelector('.th-end');
    observeReach(end ? scenes.concat([end]) : scenes, function (el) {
      if (el === end) api.threadComplete(tid);
      else api.threadStage(el.getAttribute('data-scene') || '');
    });
  }

  function worksAdapter() {
    var sections = Array.prototype.slice.call(document.querySelectorAll('.wk-work[data-work]'));
    observeReach(sections, function () { api.worksSectionView(); });
  }

  function runAdapters() {
    if (page === 'thread') threadAdapter();
    else if (page === 'work') worksAdapter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runAdapters);
  else runAdapters();
})();
