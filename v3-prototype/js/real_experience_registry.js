/* =============================================================================
 * V3 Release Muscle Sprint 02 — approved Real Experience Registry
 * -----------------------------------------------------------------------------
 * Prototype/Visual fixtures in data.js remain a separate authority.
 * Only the human-approved Phase 0 Deck records below may be mounted by Product.
 * This module performs no editorial selection, network request, analytics call,
 * geolocation access, or commercial processing.
 * ========================================================================== */
(function (global) {
  'use strict';

  var AD = global.V3_ACTION_DESTINATION;
  var APPROVED_STATE = 'EDITORIAL_APPROVED';
  var SOURCE_CLASS = 'approved-real-experience';
  var DECK_REF = 'DECK-P0-001';
  var EMOTION_ID = 'mada';
  var fixtureById = global.V3_DATA && global.V3_DATA.byId;

  var CATEGORY_VISUALS = {
    book: { label: '本', file: 'category_book.webp' },
    film: { label: '映画', file: 'category_film.webp' },
    music: { label: '音楽', file: 'category_music.webp' },
    place: { label: '場所', file: 'category_place.webp' },
    exhibition: { label: '展示', file: 'category_exhibition.webp' },
    bookstore: { label: '書店', file: 'category_bookstore.webp' },
    library: { label: '図書館', file: 'category_library.webp' },
    food_cafe: { label: '喫茶・食', file: 'category_food_cafe.webp' },
    event: { label: 'イベント', file: 'category_event.webp' },
    workshop: { label: '工房・ワークショップ', file: 'category_workshop.webp' }
  };

  function categoryVisualFor(categoryId, fallbackReason) {
    var category = CATEGORY_VISUALS[categoryId];
    if (!category) return null;
    return {
      status: 'brand_fallback_ready',
      assetType: 'category_visual',
      sourceKind: 'emotion_bookstore_category_visual',
      categoryId: categoryId,
      categoryLabel: category.label,
      sourceUrl: null,
      sourceOwner: 'Emotion Bookstore',
      rightsBasis: 'founder_provided_for_emotion_bookstore_service_use',
      attributionRequired: false,
      attributionText: null,
      reuseOrCacheAllowed: true,
      checkedAt: '2026-08-22',
      recheckBy: null,
      localAssetPath: './assets/category-visual/' + category.file,
      altTextJa: '感情書店の「' + category.label + '」カテゴリーを示すイラスト',
      fitMode: 'cover',
      fallbackReason: fallbackReason || 'real_visual_reuse_not_verified'
    };
  }

  function brandLogoFallback(categoryLabel, fallbackReason) {
    return {
      status: 'brand_fallback_ready',
      assetType: 'brand_fallback',
      sourceKind: 'emotion_bookstore_brand',
      categoryId: null,
      categoryLabel: categoryLabel || 'その他',
      sourceUrl: null,
      sourceOwner: 'Emotion Bookstore',
      rightsBasis: 'existing_approved_v3_canonical_brand_asset',
      attributionRequired: false,
      attributionText: null,
      reuseOrCacheAllowed: true,
      checkedAt: '2026-08-22',
      recheckBy: null,
      localAssetPath: './assets/canonical-m01-w01/m01_stacked_lockup.png',
      altTextJa: '感情書店の「' + (categoryLabel || 'その他') + '」カテゴリーを示すブランド表示',
      fitMode: 'contain',
      fallbackReason: fallbackReason || 'approved_category_visual_unavailable'
    };
  }

  function resolveVisualAsset(rightsSupportedRealVisual, categoryId, categoryLabel, fallbackReason) {
    if (rightsSupportedRealVisual && rightsSupportedRealVisual.status === 'real_ready') {
      return clone(rightsSupportedRealVisual);
    }
    return categoryVisualFor(categoryId, fallbackReason) ||
      brandLogoFallback(categoryLabel, fallbackReason);
  }

  var records = [
    {
      id: 'EXP_001',
      isbn13: '9784098501222',
      sourceClass: SOURCE_CLASS,
      title: '『葬送のフリーレン』第1巻',
      type: '電子コミック',
      tags: ['作品に触れる'],
      reason: '感情を入口に、作品という角度から世界へ触れるために置いています。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-P0-001',
        reviewerHuman: true,
        reviewedAt: '2026-08-22T20:05:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-22T19:17:42+09:00'
      },
      editorial: { relation: 'direct' },
      freshness: { recheckBy: '2027-08-22' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      visualAsset: resolveVisualAsset(
        null, 'book', '本', 'real_visual_reuse_not_verified'
      ),
      actionDestination: {
        type: 'official_purchase',
        nextAction: 'purchase',
        officiality: 'official',
        url: 'https://e-comi.shogakukan.co.jp/books/098501800000d0000000',
        label: '電子コミックを公式サイトで購入する'
      }
    },
    {
      id: 'EXP_007',
      sourceClass: SOURCE_CLASS,
      title: '新宿御苑',
      type: '場所',
      tags: ['場所を訪れる'],
      reason: '感情を入口に、場所という角度から世界へ触れるために置いています。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-P0-003',
        reviewerHuman: true,
        reviewedAt: '2026-08-22T20:05:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-22T19:17:42+09:00'
      },
      editorial: { relation: 'opening' },
      freshness: { recheckBy: '2027-02-18' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      visualAsset: {
        status: 'real_ready',
        assetType: 'place_photo',
        sourceKind: 'official_free_download',
        sourceUrl: 'https://policies.env.go.jp/national-garden/shinjukugyoen/photography/photo_album/images/photo_modal_07_01.jpg',
        sourceOwner: '環境省 新宿御苑管理事務所',
        rightsBasis: 'official_photo_album_free_download_under_photo_loan_conditions',
        attributionRequired: true,
        attributionText: '写真提供「新宿御苑管理事務所」',
        reuseOrCacheAllowed: true,
        checkedAt: '2026-08-22',
        recheckBy: '2027-02-18',
        localAssetPath: './assets/real-experience/EXP_007_shinjuku_gyoen_official_landscape.jpg',
        altTextJa: '新宿御苑の庭園と周囲の都市景観を上空から見渡した風景',
        fitMode: 'contain',
        categoryLabel: '場所',
        fallbackReason: null
      },
      actionDestination: {
        type: 'official_page',
        nextAction: 'visit',
        officiality: 'official',
        url: 'https://fng.or.jp/shinjuku/',
        label: '公式サイトを見る'
      }
    }
  ];

  /* These IDs are disposition evidence only, never display records. */
  var excluded = {
    EXP_003: 'NOT_IN_HUMAN_APPROVED_DECK',
    EXP_005: 'NOT_IN_HUMAN_APPROVED_DECK',
    EXP_008: 'NOT_IN_HUMAN_APPROVED_DECK',
    EXP_010: 'NOT_IN_HUMAN_APPROVED_DECK',
    EXP_011: 'NOT_IN_HUMAN_APPROVED_DECK',
    EXP_012: 'RETURNED_NOT_HUMAN_APPROVED'
  };

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  records.forEach(deepFreeze);
  Object.freeze(records);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    var parsed = new Date(value + 'T00:00:00Z');
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function pad2(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function todayLocal() {
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  }

  function isFresh(record, asOf) {
    var date = asOf || todayLocal();
    return isDateOnly(date) && record && record.freshness &&
      isDateOnly(record.freshness.recheckBy) && date <= record.freshness.recheckBy;
  }

  function hasOnlyApprovedAction(record) {
    if (!AD || !record) return false;
    var actions = AD.actionsForExperience(record);
    return actions.length === 1 && actions[0].kind === 'primary';
  }

  function validateVisualAsset(asset, asOf) {
    var reasons = [];
    var date = asOf || todayLocal();
    var statuses = ['real_ready', 'brand_fallback_ready', 'hold'];
    var assetTypes = ['book_cover', 'place_photo', 'category_visual', 'brand_fallback'];
    var sourceKinds = [
      'licensed_api', 'official_free_download', 'partner_provided',
      'emotion_bookstore_category_visual', 'emotion_bookstore_brand'
    ];
    if (!asset || statuses.indexOf(asset.status) === -1) reasons.push('VISUAL_STATUS_INVALID');
    if (!asset || assetTypes.indexOf(asset.assetType) === -1) reasons.push('VISUAL_ASSET_TYPE_INVALID');
    if (!asset || sourceKinds.indexOf(asset.sourceKind) === -1) reasons.push('VISUAL_SOURCE_KIND_INVALID');
    if (!asset || !asset.altTextJa || !asset.categoryLabel) reasons.push('VISUAL_ACCESSIBILITY_INCOMPLETE');
    if (!asset || (asset.fitMode !== 'contain' && asset.fitMode !== 'cover')) reasons.push('VISUAL_FIT_MODE_INVALID');
    if (!asset || !isDateOnly(asset.checkedAt)) reasons.push('VISUAL_CHECK_DATE_INVALID');
    if (asset && asset.status === 'hold') reasons.push('VISUAL_HOLD');

    if (asset && asset.status === 'real_ready') {
      if (asset.assetType === 'brand_fallback' || asset.assetType === 'category_visual' ||
          asset.sourceKind === 'emotion_bookstore_brand' ||
          asset.sourceKind === 'emotion_bookstore_category_visual') {
        reasons.push('REAL_VISUAL_SOURCE_INVALID');
      }
      if (!asset.sourceUrl || !/^https:\/\//.test(asset.sourceUrl) || !asset.sourceOwner ||
          !asset.rightsBasis || !asset.localAssetPath || asset.reuseOrCacheAllowed !== true) {
        reasons.push('REAL_VISUAL_RIGHTS_OR_SOURCE_INCOMPLETE');
      }
      if (asset.attributionRequired === true && !asset.attributionText) {
        reasons.push('REAL_VISUAL_ATTRIBUTION_MISSING');
      }
      if (!isDateOnly(date) || !isDateOnly(asset.recheckBy) || date > asset.recheckBy) {
        reasons.push('REAL_VISUAL_RECHECK_EXPIRED');
      }
    }

    if (asset && asset.status === 'brand_fallback_ready') {
      var category = asset.categoryId && CATEGORY_VISUALS[asset.categoryId];
      var validCategory = asset.assetType === 'category_visual' &&
        asset.sourceKind === 'emotion_bookstore_category_visual' && category &&
        asset.categoryLabel === category.label &&
        asset.localAssetPath === './assets/category-visual/' + category.file &&
        asset.rightsBasis === 'founder_provided_for_emotion_bookstore_service_use' &&
        asset.attributionRequired === false && asset.fitMode === 'cover';
      var validBrand = asset.assetType === 'brand_fallback' &&
        asset.sourceKind === 'emotion_bookstore_brand' &&
        asset.localAssetPath === './assets/canonical-m01-w01/m01_stacked_lockup.png' &&
        asset.fitMode === 'contain';
      if ((!validCategory && !validBrand) || asset.sourceUrl !== null ||
          !asset.fallbackReason || asset.reuseOrCacheAllowed !== true) {
        reasons.push('BRAND_FALLBACK_INCOMPLETE');
      }
      if (/表紙|書影|写真|新宿御苑の風景/.test(asset.altTextJa || '')) {
        reasons.push('BRAND_FALLBACK_ALT_MISREPRESENTS_REAL_VISUAL');
      }
    }

    return { pass: reasons.length === 0, reasons: reasons };
  }

  function validateRecord(record, asOf) {
    var reasons = [];
    if (!record || records.indexOf(record) === -1) reasons.push('RECORD_NOT_IN_APPROVED_REGISTRY');
    if (!record || !/^EXP_\d{3}$/.test(String(record.id || ''))) reasons.push('INVALID_EXPERIENCE_ID');
    if (!record || record.sourceClass !== SOURCE_CLASS) reasons.push('INVALID_SOURCE_CLASS');
    if (!record || !record.authority || record.authority.state !== APPROVED_STATE ||
        record.authority.deckRef !== DECK_REF || record.authority.reviewerHuman !== true ||
        record.authority.realDataGateResult !== 'REAL_DATA_GATE_READY_FOR_PHASE0') {
      reasons.push('HUMAN_APPROVAL_MISSING');
    }
    if (!record || !record.editorial ||
        (record.id === 'EXP_001' && record.editorial.relation !== 'direct') ||
        (record.id === 'EXP_007' && record.editorial.relation !== 'opening')) {
      reasons.push('APPROVED_RELATION_MISMATCH');
    }
    if (!record || !record.title || !record.reason) reasons.push('READER_FIELDS_INCOMPLETE');
    if (!isFresh(record, asOf)) reasons.push('STALE_OR_INVALID_FRESHNESS');
    if (!hasOnlyApprovedAction(record)) reasons.push('ACTION_DESTINATION_INVALID');
    var visual = validateVisualAsset(record && record.visualAsset, asOf);
    if (!visual.pass) reasons.push.apply(reasons, visual.reasons);
    if (!record || !record.rights || record.rights.imageReuseApproved !== false ||
        record.rights.textReuseApproved !== false) {
      reasons.push('RIGHTS_NOT_FAIL_CLOSED');
    }
    return { pass: reasons.length === 0, reasons: reasons };
  }

  function byId(id, asOf) {
    for (var i = 0; i < records.length; i += 1) {
      if (records[i].id === id && validateRecord(records[i], asOf).pass) return records[i];
    }
    return null;
  }

  function deckForEmotion(emotionId, asOf) {
    if (emotionId !== EMOTION_ID) return null;
    var active = records.filter(function (record) {
      return validateRecord(record, asOf).pass;
    });
    if (active.length !== 2 || active[0].id !== 'EXP_001' || active[1].id !== 'EXP_007') return null;
    return {
      deckRef: DECK_REF,
      emotionId: EMOTION_ID,
      ids: active.map(function (record) { return record.id; }),
      relationCoverage: { direct: 1, adjacent: 0, opening: 1 },
      fillFlag: false
    };
  }

  /* Adapter only: it does not append real records to the prototype fixture pool. */
  if (global.V3_DATA && typeof fixtureById === 'function') {
    global.V3_DATA.byId = function (id) {
      return byId(id) || fixtureById(id);
    };
  }

  global.V3_REAL_EXPERIENCE_REGISTRY = Object.freeze({
    VERSION: 'sprint02-activation-v1.0',
    SOURCE_CLASS: SOURCE_CLASS,
    DECK_REF: DECK_REF,
    EMOTION_ID: EMOTION_ID,
    APPROVED_IDS: Object.freeze(['EXP_001', 'EXP_007']),
    CATEGORY_IDS: Object.freeze(Object.keys(CATEGORY_VISUALS)),
    EXCLUDED_DISPOSITIONS: Object.freeze(clone(excluded)),
    categoryVisualFor: categoryVisualFor,
    resolveVisualAsset: resolveVisualAsset,
    byId: byId,
    deckForEmotion: deckForEmotion,
    validateRecord: validateRecord,
    validateVisualAsset: validateVisualAsset,
    isFresh: isFresh,
    snapshot: function () { return clone(records); }
  });
})(window);
