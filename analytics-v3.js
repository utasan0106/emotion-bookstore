(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-TGLD3KW523';
  var PROD_HOST = 'emotionbookstore.com';
  var OPTOUT_KEY = 'v3_ga_optout';
  var COOKIE_EXPIRES_SECONDS = 60 * 24 * 60 * 60;
  var ALLOWED_EVENTS = {
    v3_home_view: true,
    v3_shelf_open: true,
    v3_shelf_view: true,
    v3_detail_open: true,
    v3_official_action: true,
    v3_suggest_view: true,
    v3_suggest_copy: true,
    v3_suggest_form_open: true
  };

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

  function coarseTitle() {
    var path = location.pathname || '/';
    if (path === '/' || path === '/index.html') return 'V3 Home';
    if (path === '/shelf.html') return 'V3 Shelf';
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

  function sendEvent(name) {
    if (!ALLOWED_EVENTS[name]) return;
    window.gtag('event', name, commonParams());
  }

  window.gtag('event', 'page_view', commonParams());

  var pageTitle = coarseTitle();
  if (pageTitle === 'V3 Home') sendEvent('v3_home_view');
  else if (pageTitle === 'V3 Shelf') sendEvent('v3_shelf_view');
  else if (pageTitle === 'V3 Suggest') sendEvent('v3_suggest_view');

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
      return;
    }
    if (closest(target, '#sg-copy')) {
      sendEvent('v3_suggest_copy');
      return;
    }
    if (closest(target, '#sg-form')) {
      sendEvent('v3_suggest_form_open');
    }
  }, true);
})();
