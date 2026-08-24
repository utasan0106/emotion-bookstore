/* =============================================================================
 * V3 Google Calendar explicit-click action
 * -----------------------------------------------------------------------------
 * Builds a public event-creation URL locally. It is not sync, an account
 * connection, or a background request. Only an explicit click opens Google.
 * ========================================================================== */
(function (global) {
  'use strict';

  function pad(value) { return value < 10 ? '0' + value : String(value); }

  function compactDate(date) {
    return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
  }

  function compactDateTime(date) {
    return compactDate(date) + 'T' + pad(date.getHours()) + pad(date.getMinutes()) + '00';
  }

  function dateOnlyRange(date) {
    var end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return compactDate(date) + '/' + compactDate(end);
  }

  function planRange(plan, now) {
    if (!plan || typeof plan !== 'object') return null;
    var base = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    var date;
    if (plan.when === 'datetime' && /^\d{4}-\d{2}-\d{2}$/.test(plan.date || '')) {
      date = new Date(plan.date + 'T00:00:00');
      if (isNaN(date.getTime())) return null;
      if (/^\d{2}:\d{2}$/.test(plan.time || '')) {
        var parts = plan.time.split(':');
        date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        if (isNaN(date.getTime())) return null;
        var endTime = new Date(date.getTime() + 60 * 60 * 1000);
        return compactDateTime(date) + '/' + compactDateTime(endTime);
      }
      return dateOnlyRange(date);
    }
    date = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    if (plan.when === 'tomorrow') date.setDate(date.getDate() + 1);
    else if (plan.when === 'weekend') {
      var day = date.getDay();
      date.setDate(date.getDate() + (day === 0 || day === 6 ? 0 : 6 - day));
    } else if (plan.when !== 'today') return null;
    return dateOnlyRange(date);
  }

  function publicText(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
  }

  function buildUrl(experience, plan, now) {
    if (!experience || !publicText(experience.title, 180)) return null;
    var range = planRange(plan, now);
    if (!range) return null;
    var params = new global.URLSearchParams();
    params.set('action', 'TEMPLATE');
    params.set('text', publicText(experience.title, 180));
    params.set('dates', range);
    var destination = experience.actionDestination;
    var officialUrl = destination && /^https:\/\//.test(destination.url || '')
      ? destination.url : '';
    var summary = experience.placeDetail && experience.placeDetail.officialSummary
      ? publicText(experience.placeDetail.officialSummary, 360) : '';
    var details = [summary, officialUrl ? '公式情報：' + officialUrl : ''].filter(Boolean).join('\n');
    if (details) params.set('details', details);
    var physical = experience.physicalDestination;
    if (physical && physical.approved === true) {
      var location = publicText(physical.address, 300);
      if (location) params.set('location', location);
    }
    params.set('ctz', 'Asia/Tokyo');
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  function open(experience, plan) {
    var url = buildUrl(experience, plan);
    if (!url) return false;
    var opened = global.open(url, '_blank', 'noopener,noreferrer');
    if (opened) {
      try { opened.opener = null; } catch (error) { /* noopener remains authoritative */ }
    }
    return true;
  }

  global.V3_CALENDAR_ACTION = Object.freeze({
    planRange: planRange,
    buildUrl: buildUrl,
    open: open
  });
})(window);
