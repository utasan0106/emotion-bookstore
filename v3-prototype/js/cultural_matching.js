/* =============================================================================
 * V3 S1B Cultural Matching foundation
 * -----------------------------------------------------------------------------
 * Dependency-free, finite and fail-closed contracts for type-specific Practical
 * Truth, session-only Context Fit, Featured, editorial video, finite lineup and
 * the separately invoked 3 works + 1 video Release Content Gate.
 *
 * This module does not select Product inventory, persist user context, rank,
 * infer preferences, send analytics, or perform a network request.
 * ========================================================================== */
(function (global) {
  'use strict';

  var CANONICAL_TYPES = Object.freeze([
    'Book', 'Film', 'Music', 'Exhibition', 'Place',
    'Dining', 'Travel', 'Activity', 'Event'
  ]);
  var TYPE_LABELS = Object.freeze({
    Book: '本', Film: '映画', Music: '音楽', Exhibition: '展示', Place: '場所',
    Dining: '食', Travel: '旅', Activity: '体験', Event: 'イベント'
  });
  var MEDIA_SHAPES = Object.freeze({
    Book: 'portrait', Film: 'portrait', Music: 'square', Exhibition: 'source',
    Place: 'landscape', Dining: 'landscape', Travel: 'landscape',
    Activity: 'landscape', Event: 'source'
  });
  var TYPE_SCHEMAS = Object.freeze({
    Book: Object.freeze([
      ['author', '著者'], ['publisher', '出版社'], ['publicationDate', '刊行日'],
      ['format', '形式'], ['officialRoute', '公式の行き先']
    ]),
    Film: Object.freeze([
      ['director', '監督'], ['year', '年'], ['runtime', '上映時間'],
      ['language', '言語・字幕'], ['viewingStatus', '公式の視聴案内']
    ]),
    Music: Object.freeze([
      ['artist', 'アーティスト'], ['workType', '作品形式'], ['duration', '長さ'],
      ['listeningStatus', '公式の視聴案内']
    ]),
    Exhibition: Object.freeze([
      ['venue', '会場'], ['startDate', '開始日'], ['endDate', '終了日'],
      ['hours', '時間'], ['area', '場所'], ['price', '料金'],
      ['ticketStatus', 'チケット']
    ]),
    Place: Object.freeze([
      ['area', '場所'], ['hours', '時間'], ['access', 'アクセス'],
      ['reservation', '予約'], ['admission', '入場']
    ]),
    Dining: Object.freeze([
      ['area', '場所'], ['serviceInfo', '営業・提供'], ['reservation', '予約'],
      ['price', '予算']
    ]),
    Travel: Object.freeze([
      ['location', '行き先'], ['duration', '所要時間'], ['availability', '日程・提供'],
      ['reservation', '予約'], ['eligibility', '利用条件'], ['price', '料金']
    ]),
    Activity: Object.freeze([
      ['location', '場所'], ['duration', '所要時間'], ['hours', '時間'],
      ['availability', '日程・提供'], ['reservation', '予約'],
      ['eligibility', '参加条件'], ['price', '料金']
    ]),
    Event: Object.freeze([
      ['venue', '会場'], ['startDate', '開始日'], ['endDate', '終了日'],
      ['hours', '時間'], ['price', '料金'], ['ticketStatus', 'チケット']
    ])
  });
  var CONTEXT_VALUES = Object.freeze({
    area: Object.freeze(['tokyo-core', 'tokyo-wide']),
    timing: Object.freeze(['weekday', 'weekend', 'daytime', 'evening']),
    availableTime: Object.freeze(['short', 'half-day', 'full-day']),
    budgetBand: Object.freeze(['free', 'under-3000', 'under-5000', 'flexible']),
    logisticalNeed: Object.freeze(['step-free', 'reservation-not-required'])
  });
  var CONTEXT_LABELS = Object.freeze({
    area: 'エリア', timing: '時期・時間帯', availableTime: '使える時間',
    budgetBand: '予算', logisticalNeed: '利用条件'
  });
  var CONTEXT_VALUE_LABELS = Object.freeze({
    'tokyo-core': '東京23区内', 'tokyo-wide': '東京都内（23区外）',
    weekday: '平日', weekend: '週末', daytime: '日中', evening: '夕方以降',
    short: '短時間', 'half-day': '半日', 'full-day': '一日',
    free: '無料', 'under-3000': '3,000円以内', 'under-5000': '5,000円以内',
    flexible: '幅を持たせる', 'step-free': '段差の少ない利用',
    'reservation-not-required': '予約なしで利用'
  });
  var VIDEO_STATES = Object.freeze([
    'LINK_ONLY_READY', 'CLICK_TO_LOAD_READY', 'EMBED_READY', 'HOLD'
  ]);
  var VIDEO_RATIO_CLASSES = Object.freeze({
    '1:1': 'media-ratio-1-1',
    '2:3': 'media-ratio-2-3',
    '3:2': 'media-ratio-3-2',
    '3:4': 'media-ratio-3-4',
    '4:3': 'media-ratio-4-3',
    '9:16': 'media-ratio-9-16',
    '16:9': 'media-ratio-16-9',
    '37:20': 'media-ratio-37-20',
    '239:100': 'media-ratio-239-100'
  });

  function includes(list, value) {
    return Array.prototype.indexOf.call(list, value) !== -1;
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function boundedText(value, max) {
    if (typeof value !== 'string') return null;
    var normalized = value.trim();
    return normalized && normalized.length <= (max || 480) ? normalized : null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze(value[key]); });
    return Object.freeze(value);
  }

  function isDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    var parsed = new Date(value + 'T00:00:00Z');
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function dateNumber(value) {
    if (!isDateOnly(value)) return null;
    var parts = value.split('-').map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  function localDateDiff(from, to) {
    var start = dateNumber(from);
    var end = dateNumber(to);
    return start === null || end === null ? null : Math.floor((end - start) / 86400000);
  }

  function greatestCommonDivisor(left, right) {
    var a = Math.abs(left);
    var b = Math.abs(right);
    while (b) {
      var next = a % b;
      a = b;
      b = next;
    }
    return a;
  }

  function videoRatioClass(record) {
    if (!record || !Number.isInteger(record.nativeWidth) || record.nativeWidth <= 0 ||
        !Number.isInteger(record.nativeHeight) || record.nativeHeight <= 0) return null;
    var divisor = greatestCommonDivisor(record.nativeWidth, record.nativeHeight);
    var key = (record.nativeWidth / divisor) + ':' + (record.nativeHeight / divisor);
    return VIDEO_RATIO_CLASSES[key] || null;
  }

  function httpsUrl(value) {
    if (!boundedText(value, 2048)) return null;
    try {
      var parsed = new URL(value);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
      return parsed.href;
    } catch (error) {
      return null;
    }
  }

  function resolvePracticalTruth(record) {
    if (!isPlainObject(record) || !includes(CANONICAL_TYPES, record.canonicalType) ||
        !isPlainObject(record.practicalTruth)) return null;
    var type = record.canonicalType;
    var schema = TYPE_SCHEMAS[type];
    var allowed = schema.map(function (field) { return field[0]; });
    if (Object.keys(record.practicalTruth).some(function (key) {
      return !includes(allowed, key);
    })) return null;
    var facts = schema.map(function (field) {
      var value = boundedText(record.practicalTruth[field[0]], 240);
      return value ? Object.freeze({ key: field[0], label: field[1], value: value }) : null;
    }).filter(Boolean);
    if (!facts.length) return null;
    return Object.freeze({
      type: type,
      typeLabel: TYPE_LABELS[type],
      mediaShape: MEDIA_SHAPES[type],
      facts: Object.freeze(facts),
      discoveryFacts: Object.freeze(facts.slice(0, 4))
    });
  }

  function createContextSession() {
    var state = {};

    function snapshot() {
      return freeze(clone(state));
    }

    function set(field, value) {
      if (!Object.prototype.hasOwnProperty.call(CONTEXT_VALUES, field)) return false;
      if (value === null || value === undefined || value === '') {
        delete state[field];
        return true;
      }
      if (!includes(CONTEXT_VALUES[field], value)) return false;
      state[field] = value;
      return true;
    }

    function clearField(field) {
      if (!Object.prototype.hasOwnProperty.call(CONTEXT_VALUES, field)) return false;
      delete state[field];
      return true;
    }

    function clearAll() {
      state = {};
    }

    function isEmpty() {
      return Object.keys(state).length === 0;
    }

    return Object.freeze({
      snapshot: snapshot,
      set: set,
      clearField: clearField,
      clearAll: clearAll,
      isEmpty: isEmpty
    });
  }

  function contextReason(field, value) {
    return (CONTEXT_LABELS[field] || field) + '「' +
      (CONTEXT_VALUE_LABELS[value] || value) + '」と、確認済みの利用条件が合わないため';
  }

  /* Input records have already passed Source -> Rights -> Freshness -> Action
     -> Editorial Shelf Fit. Unknown feasibility keeps an item visible; Context
     never invents a mismatch and never rescues invalid base inventory. */
  function applyContext(records, context) {
    var source = Array.isArray(records) ? records.slice() : [];
    var selected = isPlainObject(context) ? context : {};
    var items = [];
    var removed = [];
    source.forEach(function (record) {
      var eligibility = isPlainObject(record && record.contextEligibility)
        ? record.contextEligibility : {};
      var reason = null;
      Object.keys(selected).some(function (field) {
        var value = selected[field];
        var allowed = Array.isArray(eligibility[field]) ? eligibility[field] : null;
        if (!Object.prototype.hasOwnProperty.call(CONTEXT_VALUES, field) ||
            !includes(CONTEXT_VALUES[field], value)) return false;
        if (allowed && allowed.length && !includes(allowed, value)) {
          reason = contextReason(field, value);
          return true;
        }
        return false;
      });
      if (reason) removed.push(Object.freeze({ record: record, reason: reason }));
      else items.push(record);
    });
    return Object.freeze({
      baseCount: source.length,
      visibleCount: items.length,
      items: Object.freeze(items),
      removed: Object.freeze(removed),
      context: freeze(clone(selected))
    });
  }

  function validateFeatured(record, shelfId, asOf) {
    var reasons = [];
    var diff;
    if (!isPlainObject(record) || record.shelfId !== shelfId || record.status !== 'READY' ||
        record.featured !== true) reasons.push('FEATURED_NOT_READY');
    if (!boundedText(record && record.featuredId, 120) ||
        !boundedText(record && record.contentId, 120) ||
        !boundedText(record && record.title, 240)) reasons.push('FEATURED_IDENTITY_MISSING');
    if (!boundedText(record && record.editorialWhy, 720) ||
        !boundedText(record && record.officialFact, 720)) reasons.push('FEATURED_TRUTH_MISSING');
    if (!isDateOnly(record && record.featuredSince) || !isDateOnly(asOf)) {
      reasons.push('FEATURED_DATE_INVALID');
    } else {
      diff = localDateDiff(record.featuredSince, asOf);
      if (diff === null || diff < 0) reasons.push('FEATURED_FUTURE_DATE');
    }
    if (!includes(['approved', 'fallback_ready', 'link_only'], record && record.rightsState)) {
      reasons.push('FEATURED_RIGHTS_NOT_READY');
    }
    if (!httpsUrl(record && record.officialUrl)) reasons.push('FEATURED_SOURCE_INVALID');
    return Object.freeze({ pass: reasons.length === 0, reasons: Object.freeze(reasons), diff: diff });
  }

  function resolveFeatured(records, shelfId, asOf) {
    var source = Array.isArray(records) ? records : [];
    var candidates = source.filter(function (record) {
      return record && record.shelfId === shelfId && record.featured === true && record.status === 'READY';
    });
    if (candidates.length === 0) {
      return Object.freeze({ item: null, reasons: Object.freeze([]) });
    }
    if (candidates.length > 1) {
      return Object.freeze({ item: null, reasons: Object.freeze(['FEATURED_SLOT_DUPLICATE']) });
    }
    var validation = validateFeatured(candidates[0], shelfId, asOf);
    if (!validation.pass) return Object.freeze({ item: null, reasons: validation.reasons });
    var item = clone(candidates[0]);
    item.newlyShelved = validation.diff >= 0 && validation.diff <= 6;
    item.featured = true;
    item.timelyNow = item.timelyNow || null;
    item.localDateDiff = validation.diff;
    return Object.freeze({ item: freeze(item), reasons: Object.freeze([]) });
  }

  function approvedEmbedUrl(provider, value) {
    var url = httpsUrl(value);
    var parsed;
    if (!url) return null;
    try { parsed = new URL(url); } catch (error) { return null; }
    if (parsed.search || parsed.hash) return null;
    if (provider === 'youtube' && parsed.hostname === 'www.youtube-nocookie.com' &&
        /^\/embed\/[A-Za-z0-9_-]+$/.test(parsed.pathname)) return parsed.href;
    if (provider === 'vimeo' && parsed.hostname === 'player.vimeo.com' &&
        /^\/video\/\d+$/.test(parsed.pathname)) return parsed.href;
    return null;
  }

  function validateVideo(record, shelfId) {
    var reasons = [];
    var state = record && record.mediaState;
    if (!isPlainObject(record) || record.shelfId !== shelfId ||
        !includes(VIDEO_STATES, state)) reasons.push('VIDEO_STATE_INVALID');
    if (state === 'HOLD') reasons.push('VIDEO_HOLD');
    if (!boundedText(record && record.videoId, 120) ||
        !boundedText(record && record.title, 240)) reasons.push('VIDEO_IDENTITY_MISSING');
    if (record && record.sourceOfficial !== true ||
        !httpsUrl(record && record.officialUrl)) reasons.push('VIDEO_OFFICIAL_SOURCE_INVALID');
    if (!includes(['approved', 'link_only'], record && record.rightsState)) {
      reasons.push('VIDEO_RIGHTS_NOT_READY');
    }
    if (!boundedText(record && record.editorialWhy, 720) ||
        !boundedText(record && record.viewingPoint, 720)) reasons.push('VIDEO_EDITORIAL_CONTEXT_MISSING');
    if (!includes(['landscape', 'portrait', 'square', 'source'], record && record.mediaShape)) {
      reasons.push('VIDEO_MEDIA_SHAPE_INVALID');
    }
    if (!(record && Number.isInteger(record.nativeWidth) && record.nativeWidth > 0 &&
        Number.isInteger(record.nativeHeight) && record.nativeHeight > 0)) {
      reasons.push('VIDEO_NATIVE_RATIO_INVALID');
    } else if (!videoRatioClass(record)) {
      reasons.push('VIDEO_NATIVE_RATIO_UNSUPPORTED');
    }
    if (record && (record.autoplay === true || record.soundOnLoad === true ||
        record.firstPaintPlayerRequest === true)) reasons.push('VIDEO_PASSIVE_REQUEST_FORBIDDEN');
    if (state === 'LINK_ONLY_READY' && record && record.embedUrl) reasons.push('VIDEO_LINK_ONLY_HAS_EMBED');
    if ((state === 'CLICK_TO_LOAD_READY' || state === 'EMBED_READY') &&
        !approvedEmbedUrl(record && record.provider, record && record.embedUrl)) {
      reasons.push('VIDEO_EMBED_INVALID');
    }
    return Object.freeze({ pass: reasons.length === 0, reasons: Object.freeze(reasons) });
  }

  function resolveVideo(records, shelfId) {
    var source = Array.isArray(records) ? records : [];
    var candidates = source.filter(function (record) {
      return record && record.shelfId === shelfId && record.mediaState !== 'HOLD';
    });
    if (!candidates.length) return Object.freeze({ item: null, reasons: Object.freeze([]) });
    if (candidates.length > 1) {
      return Object.freeze({ item: null, reasons: Object.freeze(['VIDEO_SLOT_DUPLICATE']) });
    }
    var validation = validateVideo(candidates[0], shelfId);
    return validation.pass
      ? Object.freeze({ item: freeze(clone(candidates[0])), reasons: Object.freeze([]) })
      : Object.freeze({ item: null, reasons: validation.reasons });
  }

  function openOfficial(url, openFn) {
    var safe = httpsUrl(url);
    if (!safe || typeof openFn !== 'function') return false;
    var opened = openFn(safe, '_blank', 'noopener,noreferrer');
    if (opened) opened.opener = null;
    return Boolean(opened);
  }

  function activateVideo(record, mount, documentRef, openFn) {
    var validation = validateVideo(record, record && record.shelfId);
    if (!validation.pass) return Object.freeze({ ok: false, mode: 'hold' });
    if (record.mediaState === 'LINK_ONLY_READY') {
      return Object.freeze({
        ok: openOfficial(record.officialUrl, openFn), mode: 'official_link'
      });
    }
    if (!mount || !documentRef || typeof documentRef.createElement !== 'function') {
      return Object.freeze({
        ok: openOfficial(record.officialUrl, openFn), mode: 'official_link_fallback'
      });
    }
    var iframe = documentRef.createElement('iframe');
    iframe.setAttribute('src', approvedEmbedUrl(record.provider, record.embedUrl));
    iframe.setAttribute('title', record.title);
    iframe.setAttribute('width', String(record.nativeWidth));
    iframe.setAttribute('height', String(record.nativeHeight));
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    iframe.setAttribute('allow', 'fullscreen; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    mount.textContent = '';
    mount.appendChild(iframe);
    return Object.freeze({ ok: true, mode: 'click_to_load' });
  }

  function resolveLineup(configs, asOf, eligibleIds) {
    if (!isDateOnly(asOf)) return Object.freeze({ items: Object.freeze([]), reasons: Object.freeze(['LINEUP_DATE_INVALID']) });
    var source = Array.isArray(configs) ? configs : [];
    var eligible = Array.isArray(eligibleIds) ? eligibleIds : [];
    var active = source.filter(function (config) {
      return config && config.status === 'READY' && config.effectiveDate === asOf;
    });
    if (!active.length) return Object.freeze({ items: Object.freeze([]), reasons: Object.freeze([]) });
    if (active.length !== 1) return Object.freeze({ items: Object.freeze([]), reasons: Object.freeze(['LINEUP_CONFIG_DUPLICATE']) });
    var config = active[0];
    if (config.label !== '本日のラインナップ' || !boundedText(config.configVersion, 120) ||
        !Array.isArray(config.itemIds) ||
        config.itemIds.length > 3 || config.itemIds.some(function (id, index) {
          return !boundedText(id, 120) || config.itemIds.indexOf(id) !== index || !includes(eligible, id);
        })) {
      return Object.freeze({ items: Object.freeze([]), reasons: Object.freeze(['LINEUP_CONFIG_INVALID']) });
    }
    return Object.freeze({
      label: config.label,
      items: Object.freeze(config.itemIds.slice()),
      reasons: Object.freeze([]),
      deterministicKey: asOf + ':' + boundedText(config.configVersion, 120)
    });
  }

  /* Shelf-independent Frontstage lineup. HQ owns the finite ordered IDs; this
     resolver only validates and returns them. It never selects, ranks, fills,
     truncates, randomizes, or mutates a reader state. */
  function resolveNoEmotionLineup(configs, asOf, resolveRecord) {
    if (!isDateOnly(asOf)) {
      return Object.freeze({
        label: null, items: Object.freeze([]),
        reasons: Object.freeze(['NO_EMOTION_DATE_INVALID']), deterministicKey: null
      });
    }
    var source = Array.isArray(configs) ? configs : [];
    var ready = source.filter(function (config) {
      return config && config.status === 'READY';
    });
    if (!ready.length) {
      return Object.freeze({
        label: '編集部の仕入れ', items: Object.freeze([]),
        reasons: Object.freeze([]), deterministicKey: asOf + ':empty'
      });
    }
    var malformed = ready.some(function (config) {
      return !isDateOnly(config.startsOn) || !isDateOnly(config.expiresOn) ||
        config.startsOn > config.expiresOn;
    });
    if (malformed) {
      return Object.freeze({
        label: null, items: Object.freeze([]),
        reasons: Object.freeze(['NO_EMOTION_LINEUP_INVALID']), deterministicKey: null
      });
    }
    var active = ready.filter(function (config) {
      return config.startsOn <= asOf && asOf <= config.expiresOn;
    });
    if (!active.length) {
      return Object.freeze({
        label: null, items: Object.freeze([]),
        reasons: Object.freeze(['NO_EMOTION_LINEUP_EXPIRED']), deterministicKey: null
      });
    }
    if (active.length !== 1) {
      return Object.freeze({
        label: null, items: Object.freeze([]),
        reasons: Object.freeze(['NO_EMOTION_LINEUP_DUPLICATE']), deterministicKey: null
      });
    }
    var config = active[0];
    var ids = config.itemIds;
    if (config.label !== '編集部の仕入れ' || !boundedText(config.configVersion, 120) ||
        !Array.isArray(ids) || ids.length > 3 || ids.some(function (id, index) {
          return !boundedText(id, 120) || ids.indexOf(id) !== index;
        }) || typeof resolveRecord !== 'function') {
      return Object.freeze({
        label: null, items: Object.freeze([]),
        reasons: Object.freeze(['NO_EMOTION_LINEUP_INVALID']), deterministicKey: null
      });
    }
    var records = ids.map(function (id) { return resolveRecord(id, asOf); });
    if (records.some(function (record) { return !record; })) {
      return Object.freeze({
        label: null, items: Object.freeze([]),
        reasons: Object.freeze(['NO_EMOTION_ITEM_INVALID']), deterministicKey: null
      });
    }
    return Object.freeze({
      label: config.label,
      items: Object.freeze(ids.slice()),
      reasons: Object.freeze([]),
      deterministicKey: asOf + ':' + config.configVersion
    });
  }

  /* FIRST PULL is optional Human Editorial copy. Invalid or incomplete input is
     omitted; Product never synthesizes a fallback. */
  function resolveFirstPull(record) {
    var pull = record && record.firstPull;
    var text = boundedText(pull && pull.text, 180);
    if (!isPlainObject(pull) || pull.status !== 'READY' ||
        pull.reviewerHuman !== true || !text) return null;
    return text;
  }

  function sourceCounts(rows) {
    return rows.reduce(function (counts, row) {
      var key = boundedText(row.sourceFamily, 160) || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function releaseRowReady(row) {
    return Boolean(row && row.eligible === true && boundedText(row.contentId, 120) &&
      boundedText(row.canonicalObjectId, 2048) && includes(CANONICAL_TYPES, row.normalizedType) &&
      httpsUrl(row.sourceUrl) && row.sourceTraceable === true && row.officialVerified === true &&
      boundedText(row.editorialWhy, 720) &&
      includes(['ready', 'not_required'], row.actionStatus) && row.freshnessStatus === 'ready' &&
      includes(['real_ready', 'fallback_ready', 'link_only_ready'], row.mediaStatus) &&
      boundedText(row.language, 32));
  }

  function auditReleaseReadiness(input) {
    var shelfIds = input && Array.isArray(input.shelfIds) ? input.shelfIds.slice() : [];
    var rows = input && Array.isArray(input.relations) ? input.relations.slice() : [];
    var videos = input && Array.isArray(input.videos) ? input.videos.slice() : [];
    var blocking = [];
    var allIds = {};
    var allCanonical = {};
    var shelves = shelfIds.map(function (shelfId) {
      var visible = rows.filter(function (row) {
        return row && row.shelfId === shelfId && row.role !== 'featured' && row.role !== 'timelyNow';
      }).filter(releaseRowReady);
      var ids = visible.map(function (row) { return row.contentId; });
      var canonical = visible.map(function (row) { return row.canonicalObjectId; });
      var categories = visible.reduce(function (counts, row) {
        counts[row.normalizedType] = (counts[row.normalizedType] || 0) + 1;
        return counts;
      }, {});
      if (visible.length > 3) blocking.push('RUNTIME_DECK_OVER_3:' + shelfId);
      ids.forEach(function (id) {
        if (allIds[id]) blocking.push('DUPLICATE_ID:' + id);
        allIds[id] = true;
      });
      canonical.forEach(function (id) {
        if (allCanonical[id]) blocking.push('DUPLICATE_CANONICAL_OBJECT:' + id);
        allCanonical[id] = true;
      });
      var video = resolveVideo(videos, shelfId);
      if (video.reasons.length) blocking.push.apply(blocking, video.reasons.map(function (reason) {
        return reason + ':' + shelfId;
      }));
      return Object.freeze({
        shelfId: shelfId,
        visibleEligibleCount: visible.length,
        worksReady: Math.min(visible.length, 3),
        videoReady: video.item ? 1 : 0,
        duplicateIdCount: ids.length - Object.keys(ids.reduce(function (set, id) { set[id] = true; return set; }, {})).length,
        duplicateCanonicalCount: canonical.length - Object.keys(canonical.reduce(function (set, id) { set[id] = true; return set; }, {})).length,
        normalizedCategoryDistribution: freeze(categories),
        sourceConcentration: freeze(sourceCounts(visible)),
        releaseContentReady: visible.length === 3 && Boolean(video.item)
      });
    });
    var gateReady = shelfIds.length === 8 && shelves.every(function (shelf) {
      return shelf.releaseContentReady;
    }) && blocking.length === 0;
    return Object.freeze({
      targetWorksPerShelf: 3,
      targetVideosPerShelf: 1,
      runtimeMin: 0,
      runtimeMax: 3,
      gateReady: gateReady,
      shelves: Object.freeze(shelves),
      blocking: Object.freeze(blocking),
      totalWorksReady: shelves.reduce(function (sum, shelf) { return sum + shelf.worksReady; }, 0),
      totalVideosReady: shelves.reduce(function (sum, shelf) { return sum + shelf.videoReady; }, 0)
    });
  }

  global.V3_CULTURAL_MATCHING = Object.freeze({
    VERSION: 'v3-cultural-matching-s1b-v1',
    CANONICAL_TYPES: CANONICAL_TYPES,
    TYPE_LABELS: TYPE_LABELS,
    MEDIA_SHAPES: MEDIA_SHAPES,
    CONTEXT_VALUES: CONTEXT_VALUES,
    VIDEO_STATES: VIDEO_STATES,
    VIDEO_RATIO_CLASSES: VIDEO_RATIO_CLASSES,
    resolvePracticalTruth: resolvePracticalTruth,
    createContextSession: createContextSession,
    applyContext: applyContext,
    localDateDiff: localDateDiff,
    resolveFeatured: resolveFeatured,
    validateVideo: validateVideo,
    videoRatioClass: videoRatioClass,
    resolveVideo: resolveVideo,
    activateVideo: activateVideo,
    approvedEmbedUrl: approvedEmbedUrl,
    resolveLineup: resolveLineup,
    resolveNoEmotionLineup: resolveNoEmotionLineup,
    resolveFirstPull: resolveFirstPull,
    auditReleaseReadiness: auditReleaseReadiness
  });
})(window);
