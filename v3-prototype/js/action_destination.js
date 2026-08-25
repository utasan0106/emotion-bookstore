/* =============================================================================
 * V3 Action Destination foundation
 * -----------------------------------------------------------------------------
 * Product は approved content を機械的に検証・表示するだけで、行き先の
 * Editorial 判定は行わない。外部遷移は HTTPS / new tab / noopener /
 * noreferrer に限定し、欠落・不正値には別 URL を補わない。
 * ========================================================================== */
(function (global) {
  'use strict';

  var ACTION_TYPES = Object.freeze([
    'official_page',
    'official_booking',
    'official_purchase',
    'official_viewing',
    'map_directions'
  ]);
  var NEXT_ACTIONS = Object.freeze([
    'read', 'view', 'listen', 'visit', 'book', 'attend', 'purchase', 'other'
  ]);
  var OFFICIALITY = Object.freeze([
    'official', 'official_designated', 'no_official_exists'
  ]);

  var externalOpenHandler = null;

  function includes(list, value) {
    return list.indexOf(value) !== -1;
  }

  function isPlainObject(value) {
    return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
  }

  function boundedText(value, maxLength) {
    if (typeof value !== 'string' || value !== value.trim()) return null;
    if (!value || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) return null;
    return value;
  }

  function httpsUrl(value) {
    var raw = boundedText(value, 2048);
    var parsed;
    if (!raw) return null;
    try { parsed = new URL(raw); }
    catch (error) { return null; }
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.href;
  }

  function normalize(destination) {
    if (!isPlainObject(destination) ||
        !includes(ACTION_TYPES, destination.type) ||
        !includes(NEXT_ACTIONS, destination.nextAction) ||
        !includes(OFFICIALITY, destination.officiality)) return null;

    var url = httpsUrl(destination.url);
    var label = boundedText(destination.label, 120);
    if (!url || !label) return null;

    /* Commercial / tracking fields and unknown input are deliberately not copied. */
    return Object.freeze({
      type: destination.type,
      nextAction: destination.nextAction,
      officiality: destination.officiality,
      url: url,
      label: label
    });
  }

  /* ---------------------------------------------------------------------------
   * Music Action Bridge — optional secondaryActionDestinations (additive).
   * Primaryの契約は完全互換のまま。secondaryはcontent dataが後から与える
   * 外部リンクのみで、provider名はここに実装しない。Music以外・3件以上・
   * 不正URL・重複などはsecondary一式をfail closedし、truncate・URL補完は
   * 行わない（Primaryは常に従来どおり）。
   * ------------------------------------------------------------------------- */
  var SECONDARY_MAX = 2;
  var SECONDARY_NEXT_ACTIONS = Object.freeze(['listen']);
  var SECONDARY_ACTION_TYPES = Object.freeze(['official_viewing', 'official_page']);
  var SECONDARY_OFFICIALITY = Object.freeze(['official', 'official_designated']);

  function normalizeSecondary(item) {
    if (!isPlainObject(item) ||
        !includes(SECONDARY_ACTION_TYPES, item.type) ||
        !includes(SECONDARY_NEXT_ACTIONS, item.nextAction) ||
        !includes(SECONDARY_OFFICIALITY, item.officiality)) return null;

    var url = httpsUrl(item.url);
    var label = boundedText(item.label, 120);
    if (!url || !label) return null;

    return Object.freeze({
      type: item.type,
      nextAction: item.nextAction,
      officiality: item.officiality,
      url: url,
      label: label
    });
  }

  function secondaryDestinations(experience, primary) {
    var raw = experience && experience.secondaryActionDestinations;
    if (raw === undefined || raw === null) return [];
    if (!experience || experience.canonicalType !== 'Music') return [];
    if (!Array.isArray(raw) || raw.length > SECONDARY_MAX) return [];

    var normalized = [];
    var seenUrls = { };
    var seenLabels = { };
    seenUrls[primary.url] = true;
    seenLabels[primary.label] = true;
    for (var i = 0; i < raw.length; i += 1) {
      var secondary = normalizeSecondary(raw[i]);
      if (!secondary || seenUrls[secondary.url] || seenLabels[secondary.label]) return [];
      seenUrls[secondary.url] = true;
      seenLabels[secondary.label] = true;
      normalized.push(secondary);
    }
    return normalized;
  }

  function approvedPublicAddress(experience) {
    var physical = experience && experience.physicalDestination;
    if (!isPlainObject(physical) || physical.approved !== true) return null;
    return boundedText(physical.address, 300);
  }

  function buildMapsDirectionsUrl(destination) {
    var address = boundedText(destination, 300);
    if (!address) return null;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address);
  }

  function actionsForExperience(experience) {
    var destination = normalize(experience && experience.actionDestination);
    if (!destination) return [];

    var actions = [{
      kind: 'primary',
      url: destination.url,
      label: destination.label,
      actionType: destination.nextAction,
      destinationClass: destination.type,
      officiality: destination.officiality
    }];
    secondaryDestinations(experience, destination).forEach(function (secondary) {
      actions.push({
        kind: 'secondary',
        url: secondary.url,
        label: secondary.label,
        actionType: secondary.nextAction,
        destinationClass: secondary.type,
        officiality: secondary.officiality
      });
    });
    var address = approvedPublicAddress(experience);
    var mapsUrl = address ? buildMapsDirectionsUrl(address) : null;
    if (mapsUrl) {
      actions.push({
        kind: 'maps',
        url: mapsUrl,
        label: 'Googleマップで行き方を見る',
        actionType: 'visit',
        destinationClass: 'map_directions',
        officiality: destination.officiality
      });
    }
    return actions;
  }

  function notifyExternalOpen(experienceId, action) {
    if (!externalOpenHandler || typeof experienceId !== 'string' || !experienceId) return;
    try {
      externalOpenHandler({
        experienceId: experienceId,
        actionType: action.actionType,
        destinationClass: action.destinationClass
      });
    } catch (error) {
      /* A future analytics adapter must never block the user action. */
    }
  }

  function openAction(action, experienceId) {
    if (!isPlainObject(action) ||
        !includes(['primary', 'secondary', 'maps'], action.kind) ||
        !includes(NEXT_ACTIONS, action.actionType) ||
        !includes(ACTION_TYPES, action.destinationClass)) return false;

    var url = httpsUrl(action.url);
    if (!url) return false;

    var opened = global.open(url, '_blank', 'noopener,noreferrer');
    if (opened) {
      try { opened.opener = null; }
      catch (error) { /* noopener feature remains authoritative. */ }
    }
    notifyExternalOpen(experienceId, action);
    return true;
  }

  function onExternalOpen(handler) {
    externalOpenHandler = typeof handler === 'function' ? handler : null;
  }

  global.V3_ACTION_DESTINATION = Object.freeze({
    ACTION_TYPES: ACTION_TYPES,
    NEXT_ACTIONS: NEXT_ACTIONS,
    OFFICIALITY: OFFICIALITY,
    normalize: normalize,
    actionsForExperience: actionsForExperience,
    buildMapsDirectionsUrl: buildMapsDirectionsUrl,
    openAction: openAction,
    onExternalOpen: onExternalOpen
  });
})(window);
