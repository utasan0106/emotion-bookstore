/* =============================================================================
 * V3 Public Editorial Connection — PASS C1 shell
 * -----------------------------------------------------------------------------
 * Public Editorial content is repository data, never private/user state. The
 * resolver is deliberately fail-closed: only one valid READY + human-approved
 * record per Fresh/Evergreen slot may reach the Product UI.
 * ========================================================================== */
(function (global) {
  'use strict';

  var AD = global.V3_ACTION_DESTINATION;
  var SLOT_TYPES = Object.freeze(['fresh', 'evergreen']);
  var STATUSES = Object.freeze(['draft', 'review', 'ready', 'hold', 'expired']);
  var EMBED_STATUSES = Object.freeze(['allowed', 'link_only', 'unknown']);
  var ACTIVE_RIGHTS = Object.freeze(['approved', 'link_only']);
  var SCHEMA_VERSION = 'v3-public-editorial-connection-v1';
  var RECORD_KEYS = Object.freeze([
    'connection_id', 'slot_id', 'slot_type', 'content_type', 'shelf_id', 'status',
    'headline', 'lead', 'source_context', 'target', 'fact_anchor', 'editorial_reason',
    'editorial_note', 'word_contour', 'human_approved', 'primary_action', 'provenance',
    'rights_status', 'checked_at', 'recheck_at', 'display_visual',
    'alternative_or_rejection', 'video_provider', 'video_url', 'video_embed_url',
    'video_title', 'creator_name', 'release_year', 'release_date', 'thumbnail_display_basis',
    'embed_status', 'official_fallback_url'
  ]);
  var VIDEO_KEYS = Object.freeze([
    'video_provider', 'video_url', 'video_embed_url', 'video_title', 'creator_name',
    'release_year', 'release_date', 'thumbnail_display_basis', 'embed_status', 'official_fallback_url'
  ]);
  var FORBIDDEN_KEYS = Object.freeze([
    'raw', 'content', 'full_text', 'private_body', 'private_trace', 'free_text',
    'private_user_content', 'credentials', 'secrets', 'personal_identifiers',
    'emotion_history', 'location_history', 'selected_emotion_identity',
    'affiliate', 'affiliate_url', 'commission', 'revenue', 'ranking', 'popularity'
  ]);
  var EMBED_HOSTS = Object.freeze({
    youtube: 'www.youtube-nocookie.com',
    vimeo: 'player.vimeo.com'
  });

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

  function boundedId(value) {
    var text = boundedText(value, 96);
    return text && /^[A-Za-z0-9._-]+$/.test(text) ? text : null;
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

  function isoDate(value) {
    var raw = boundedText(value, 40);
    var date;
    if (!raw || !/^\d{4}-\d{2}-\d{2}(?:T[\d:.+-]+Z?)?$/.test(raw)) return null;
    date = new Date(raw.length === 10 ? raw + 'T00:00:00Z' : raw);
    return isNaN(date.getTime()) ? null : raw;
  }

  function forbiddenKeyPath(value, path) {
    var found = null;
    if (Array.isArray(value)) {
      value.some(function (item, index) {
        found = forbiddenKeyPath(item, path + '[' + index + ']');
        return Boolean(found);
      });
      return found;
    }
    if (!isPlainObject(value)) return null;
    Object.keys(value).some(function (key) {
      var normalized = key.toLowerCase();
      if (includes(FORBIDDEN_KEYS, normalized)) {
        found = path ? path + '.' + key : key;
        return true;
      }
      found = forbiddenKeyPath(value[key], path ? path + '.' + key : key);
      return Boolean(found);
    });
    return found;
  }

  function hasUnknownKeys(value, allowed) {
    return !isPlainObject(value) || Object.keys(value).some(function (key) {
      return allowed.indexOf(key) === -1;
    });
  }

  function normalizeSourceContext(value) {
    if (hasUnknownKeys(value, ['label', 'summary'])) return null;
    var label = boundedText(value.label, 160);
    var summary = boundedText(value.summary, 500);
    if (!label || !summary) return null;
    return Object.freeze({ label: label, summary: summary });
  }

  function normalizeTarget(value) {
    if (hasUnknownKeys(value, ['title', 'kind', 'creator', 'release'])) return null;
    var title = boundedText(value.title, 240);
    var kind = boundedText(value.kind, 64);
    var creator = value.creator === undefined ? null : boundedText(value.creator, 160);
    var release = value.release === undefined ? null : boundedText(value.release, 80);
    if (!title || !kind || (value.creator !== undefined && !creator) ||
        (value.release !== undefined && !release)) return null;
    return Object.freeze({ title: title, kind: kind, creator: creator, release: release });
  }

  function normalizeProvenance(value) {
    if (hasUnknownKeys(value, ['source_name', 'source_url', 'evidence_ref'])) return null;
    var sourceName = boundedText(value.source_name, 180);
    var sourceUrl = httpsUrl(value.source_url);
    var evidenceRef = boundedText(value.evidence_ref, 240);
    if (!sourceName || !sourceUrl || !evidenceRef) return null;
    return Object.freeze({
      source_name: sourceName,
      source_url: sourceUrl,
      evidence_ref: evidenceRef
    });
  }

  function normalizeVisual(value) {
    if (value === undefined || value === null) return null;
    if (hasUnknownKeys(value, ['src', 'alt', 'rights_basis'])) return false;
    var src = boundedText(value.src, 400);
    var alt = typeof value.alt === 'string' && value.alt === value.alt.trim() &&
      value.alt.length <= 240 ? value.alt : null;
    var basis = boundedText(value.rights_basis, 240);
    if (!src || alt === null || !basis || !/^\.\/assets\/[A-Za-z0-9._\/-]+$/.test(src) ||
        src.indexOf('..') !== -1) return false;
    return Object.freeze({ src: src, alt: alt, rights_basis: basis });
  }

  function isApprovedEmbedUrl(provider, value) {
    var url = httpsUrl(value);
    var parsed;
    if (!url || !Object.prototype.hasOwnProperty.call(EMBED_HOSTS, provider)) return null;
    parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== EMBED_HOSTS[provider]) return null;
    if (provider === 'youtube' && !/^\/embed\/[A-Za-z0-9_-]+$/.test(parsed.pathname)) return null;
    if (provider === 'vimeo' && !/^\/video\/\d+$/.test(parsed.pathname)) return null;
    if (parsed.search || parsed.hash) return null;
    return parsed.href;
  }

  function normalizeVideo(record, reasons) {
    if (record.content_type !== 'video') return null;
    var provider = boundedText(record.video_provider, 48);
    var videoUrl = httpsUrl(record.video_url);
    var title = boundedText(record.video_title, 240);
    var creator = boundedText(record.creator_name, 160);
    var displayBasis = boundedText(record.thumbnail_display_basis, 240);
    var embedStatus = record.embed_status;
    var fallback = httpsUrl(record.official_fallback_url);
    var releaseYear = record.release_year === undefined ? null : boundedText(record.release_year, 4);
    var releaseDate = record.release_date === undefined ? null : isoDate(record.release_date);
    var embedUrl = null;

    if (!provider || !videoUrl || !title || !creator || !displayBasis ||
        !includes(EMBED_STATUSES, embedStatus) || !fallback ||
        (record.release_year !== undefined && (!releaseYear || !/^\d{4}$/.test(releaseYear))) ||
        (record.release_date !== undefined && !releaseDate)) {
      reasons.push('VIDEO_SCHEMA_INVALID');
      return null;
    }
    if (embedStatus === 'unknown') {
      reasons.push('VIDEO_PERMISSION_UNKNOWN');
      return null;
    }
    if (embedStatus === 'allowed') {
      embedUrl = isApprovedEmbedUrl(provider, record.video_embed_url);
      if (!embedUrl) {
        reasons.push('VIDEO_EMBED_NOT_APPROVED');
        return null;
      }
    }
    return Object.freeze({
      video_provider: provider,
      video_url: videoUrl,
      video_embed_url: embedUrl,
      video_title: title,
      creator_name: creator,
      release_year: releaseYear,
      release_date: releaseDate,
      thumbnail_display_basis: displayBasis,
      embed_status: embedStatus,
      official_fallback_url: fallback
    });
  }

  function validateRecord(record, options) {
    var reasons = [];
    var shelves = options && Array.isArray(options.shelfIds) ? options.shelfIds : [];
    var asOfRaw = options && options.asOf ? options.asOf : new Date().toISOString().slice(0, 10);
    var asOf = new Date(String(asOfRaw).slice(0, 10) + 'T00:00:00Z');
    var forbidden;
    var sourceContext;
    var target;
    var provenance;
    var action;
    var visual;
    var checkedAt;
    var recheckAt;
    var video;
    var normalized;

    if (!isPlainObject(record)) return Object.freeze({ pass: false, reasons: ['RECORD_NOT_OBJECT'], record: null });
    if (hasUnknownKeys(record, RECORD_KEYS)) reasons.push('UNKNOWN_FIELD_FAIL_CLOSED');
    forbidden = forbiddenKeyPath(record, '');
    if (forbidden) reasons.push('FORBIDDEN_FIELD:' + forbidden);
    if (!boundedId(record.connection_id)) reasons.push('CONNECTION_ID_INVALID');
    if (!boundedId(record.slot_id)) reasons.push('SLOT_ID_INVALID');
    if (!includes(SLOT_TYPES, record.slot_type)) reasons.push('SLOT_TYPE_INVALID');
    if (!boundedId(record.content_type)) reasons.push('CONTENT_TYPE_INVALID');
    if (!includes(shelves, record.shelf_id)) reasons.push('SHELF_ID_INVALID');
    if (!includes(STATUSES, record.status)) reasons.push('STATUS_INVALID');
    if (record.status !== 'ready') reasons.push('STATUS_NOT_READY');
    if (record.human_approved !== true) reasons.push('HUMAN_APPROVAL_REQUIRED');
    if (!boundedText(record.headline, 240)) reasons.push('HEADLINE_INVALID');
    if (!boundedText(record.lead, 500)) reasons.push('LEAD_INVALID');
    if (!boundedText(record.fact_anchor, 1200)) reasons.push('FACT_ANCHOR_INVALID');
    if (!boundedText(record.editorial_reason, 1200)) reasons.push('EDITORIAL_REASON_INVALID');
    if (!boundedText(record.editorial_note, 1200)) reasons.push('EDITORIAL_NOTE_INVALID');
    if (record.word_contour !== undefined && !boundedText(record.word_contour, 800)) reasons.push('WORD_CONTOUR_INVALID');
    if (record.alternative_or_rejection !== undefined &&
        !boundedText(record.alternative_or_rejection, 800)) reasons.push('ALTERNATIVE_DECISION_INVALID');

    sourceContext = normalizeSourceContext(record.source_context);
    target = normalizeTarget(record.target);
    provenance = normalizeProvenance(record.provenance);
    action = !hasUnknownKeys(record.primary_action, ['type', 'nextAction', 'officiality', 'url', 'label']) &&
      AD && AD.normalize ? AD.normalize(record.primary_action) : null;
    visual = normalizeVisual(record.display_visual);
    checkedAt = isoDate(record.checked_at);
    recheckAt = isoDate(record.recheck_at);
    if (!sourceContext) reasons.push('SOURCE_CONTEXT_INVALID');
    if (!target) reasons.push('TARGET_INVALID');
    if (!provenance) reasons.push('PROVENANCE_INVALID');
    if (!action) reasons.push('PRIMARY_ACTION_INVALID');
    if (visual === false) reasons.push('DISPLAY_RIGHTS_INVALID');
    if (!includes(ACTIVE_RIGHTS, record.rights_status)) reasons.push('RIGHTS_NOT_ACTIVE');
    if (!checkedAt) reasons.push('CHECKED_AT_INVALID');
    if (!recheckAt) reasons.push('RECHECK_AT_INVALID');
    if (recheckAt && !isNaN(asOf.getTime()) &&
        new Date(recheckAt.slice(0, 10) + 'T23:59:59Z').getTime() < asOf.getTime()) reasons.push('FRESHNESS_EXPIRED');

    video = normalizeVideo(record, reasons);
    if (record.content_type !== 'video' && VIDEO_KEYS.some(function (key) {
      return record[key] !== undefined;
    })) reasons.push('VIDEO_FIELDS_ON_NON_VIDEO');
    if (reasons.length) return Object.freeze({ pass: false, reasons: Object.freeze(reasons), record: null });

    normalized = {
      connection_id: record.connection_id,
      slot_id: record.slot_id,
      slot_type: record.slot_type,
      content_type: record.content_type,
      shelf_id: record.shelf_id,
      status: 'ready',
      headline: record.headline,
      lead: record.lead,
      source_context: sourceContext,
      target: target,
      fact_anchor: record.fact_anchor,
      editorial_reason: record.editorial_reason,
      editorial_note: record.editorial_note,
      word_contour: record.word_contour || null,
      human_approved: true,
      primary_action: action,
      provenance: provenance,
      rights_status: record.rights_status,
      checked_at: checkedAt,
      recheck_at: recheckAt,
      display_visual: visual || null,
      alternative_or_rejection: record.alternative_or_rejection || null,
      video: video
    };
    return Object.freeze({ pass: true, reasons: Object.freeze([]), record: Object.freeze(normalized) });
  }

  function resolveForShelf(records, shelfId, options) {
    var source = Array.isArray(records) ? records : [];
    var shelves = options && Array.isArray(options.shelfIds) ? options.shelfIds : [];
    var candidates = source.filter(function (record) {
      return isPlainObject(record) && record.shelf_id === shelfId && includes(SLOT_TYPES, record.slot_type);
    });
    var resolved = [];
    var rejected = [];

    if (!includes(shelves, shelfId)) {
      return Object.freeze({ shelf_id: shelfId, items: Object.freeze([]), rejected: Object.freeze([
        Object.freeze({ connection_id: null, slot_type: null, reasons: Object.freeze(['SHELF_ID_INVALID']) })
      ]) });
    }

    if (candidates.some(function (record, index) {
      return candidates.some(function (other, otherIndex) {
        return index !== otherIndex && boundedId(record.slot_id) && record.slot_id === other.slot_id;
      });
    })) {
      return Object.freeze({ shelf_id: shelfId, items: Object.freeze([]), rejected: Object.freeze([
        Object.freeze({ connection_id: null, slot_type: null, reasons: Object.freeze(['DUPLICATE_SLOT_ID_FAIL_CLOSED']) })
      ]) });
    }

    SLOT_TYPES.forEach(function (slotType) {
      var slotCandidates = candidates.filter(function (record) { return record.slot_type === slotType; });
      if (slotCandidates.length > 1) {
        rejected.push(Object.freeze({
          connection_id: null,
          slot_type: slotType,
          reasons: Object.freeze(['DUPLICATE_SLOT_FAIL_CLOSED'])
        }));
        return;
      }
      if (slotCandidates.length === 1) {
        var result = validateRecord(slotCandidates[0], options || {});
        if (result.pass) resolved.push(result.record);
        else rejected.push(Object.freeze({
          connection_id: boundedId(slotCandidates[0].connection_id),
          slot_type: slotType,
          reasons: result.reasons
        }));
      }
    });

    return Object.freeze({
      shelf_id: shelfId,
      items: Object.freeze(resolved),
      rejected: Object.freeze(rejected)
    });
  }

  function findActive(records, shelfId, connectionId, options) {
    var result = resolveForShelf(records, shelfId, options);
    return result.items.filter(function (record) { return record.connection_id === connectionId; })[0] || null;
  }

  function openHttps(url) {
    var safe = httpsUrl(url);
    if (!safe) return false;
    var opened = global.open(safe, '_blank', 'noopener,noreferrer');
    if (opened) {
      try { opened.opener = null; }
      catch (error) { /* noopener feature remains authoritative. */ }
    }
    return true;
  }

  function openPrimary(record) {
    return Boolean(record && record.primary_action && openHttps(record.primary_action.url));
  }

  function activateVideo(record, mount) {
    var video = record && record.video;
    var iframe;
    if (!video) return false;
    if (video.embed_status === 'link_only') return openHttps(video.official_fallback_url);
    if (video.embed_status !== 'allowed' || !video.video_embed_url || !mount ||
        !global.document || typeof global.document.createElement !== 'function') return false;

    iframe = global.document.createElement('iframe');
    iframe.setAttribute('src', video.video_embed_url);
    iframe.setAttribute('title', video.video_title);
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    iframe.setAttribute('allow', 'fullscreen; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    mount.appendChild(iframe);
    return true;
  }

  global.V3_PUBLIC_EDITORIAL = Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION,
    SLOT_TYPES: SLOT_TYPES,
    STATUSES: STATUSES,
    EMBED_STATUSES: EMBED_STATUSES,
    validateRecord: validateRecord,
    resolveForShelf: resolveForShelf,
    findActive: findActive,
    isApprovedEmbedUrl: isApprovedEmbedUrl,
    openPrimary: openPrimary,
    activateVideo: activateVideo
  });
})(window);
