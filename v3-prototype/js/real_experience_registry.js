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
  var MATCHING = global.V3_CULTURAL_MATCHING;
  var APPROVED_STATE = 'EDITORIAL_APPROVED';
  var SOURCE_CLASS = 'approved-real-experience';
  var DECK_REF = 'DECK-P0-001';
  var EMOTION_ID = 'mada';
  var SHELF_IDS = [
    'hajimu', 'atatamaru', 'hikareru', 'shizumu',
    'zawatsuku', 'butsukaru', 'miwohiku', 'mada'
  ];
  var OUTING_RELATIONS = {
    hajimu: [{ experienceId: 'EXP_101', relation: 'direct' }],
    atatamaru: [{ experienceId: 'EXP_102', relation: 'direct' }],
    hikareru: [{ experienceId: 'EXP_103', relation: 'direct' }],
    shizumu: [{ experienceId: 'EXP_104', relation: 'direct' }],
    zawatsuku: [{ experienceId: 'EXP_105', relation: 'direct' }],
    butsukaru: [{ experienceId: 'EXP_106', relation: 'direct' }],
    miwohiku: [{ experienceId: 'EXP_107', relation: 'direct' }],
    mada: [{ experienceId: 'EXP_007', relation: 'opening' }]
  };

  /* ---------------------------------------------------------------------------
   * Shelf Abundance Foundation — cover / collection separation
   * COVER  = OUTING_RELATIONS（<=3、現行の有限Discovery表紙。挙動不変更）
   * COLLECTION = 棚の現行承認メンバーシップ全体（<=15、Human Editorial順、
   *              cover項目を必ず含む）。編集判断の器であり、quotaではない。
   * 現行の実在承認inventoryではcollectionはcoverと同一内容（各棚1件）。
   * force-fill・並び替え・engagement要素は導入しない。
   * ------------------------------------------------------------------------- */
  var COVER_MAX = 3;
  var COLLECTION_MAX = 15;
  var COLLECTION_MIN_AVAILABLE = 6;
  var COLLECTION_RELATIONS = {
    hajimu: [{ experienceId: 'EXP_101', relation: 'direct' }],
    atatamaru: [{ experienceId: 'EXP_102', relation: 'direct' }],
    hikareru: [{ experienceId: 'EXP_103', relation: 'direct' }],
    shizumu: [{ experienceId: 'EXP_104', relation: 'direct' }],
    zawatsuku: [{ experienceId: 'EXP_105', relation: 'direct' }],
    butsukaru: [{ experienceId: 'EXP_106', relation: 'direct' }],
    miwohiku: [{ experienceId: 'EXP_107', relation: 'direct' }],
    mada: [{ experienceId: 'EXP_007', relation: 'opening' }]
  };

  /* Pure structural contract for one shelf plan. Order-preserving, fail-closed.
     coverIds.length <= 3, collectionIds.length <= 15, no duplicates, and every
     coverId must exist in collectionIds. Missing depth is NOT a failure. */
  function validateShelfPlan(plan) {
    var reasons = [];
    var coverIds = plan && Array.isArray(plan.coverIds) ? plan.coverIds : null;
    var collectionIds = plan && Array.isArray(plan.collectionIds) ? plan.collectionIds : null;
    if (!coverIds || !collectionIds) {
      return { pass: false, reasons: ['SHELF_PLAN_SHAPE_INVALID'] };
    }
    if (coverIds.length > COVER_MAX) reasons.push('COVER_OVER_3');
    if (collectionIds.length > COLLECTION_MAX) reasons.push('COLLECTION_OVER_15');
    collectionIds.forEach(function (id, index) {
      if (typeof id !== 'string' || !id) reasons.push('COLLECTION_ID_INVALID');
      else if (collectionIds.indexOf(id) !== index) reasons.push('COLLECTION_DUPLICATE_ID:' + id);
    });
    coverIds.forEach(function (id, index) {
      if (coverIds.indexOf(id) !== index) reasons.push('COVER_DUPLICATE_ID:' + id);
      if (collectionIds.indexOf(id) === -1) reasons.push('COVER_NOT_IN_COLLECTION:' + id);
    });
    return { pass: reasons.length === 0, reasons: reasons };
  }
  var fixtureById = global.V3_DATA && global.V3_DATA.byId;

  var CATEGORY_VISUALS = {
    book: { label: '本', file: 'category_book.webp' },
    film: { label: '映画', file: 'category_film.webp' },
    music: { label: '音楽', file: 'category_music.webp' },
    place: { label: '場所', file: 'category_place.webp' },
    exhibition: { label: '展示', file: 'category_exhibition.webp' },
    bookstore: { label: '書店', file: 'category_book.webp' },
    library: { label: '図書館', file: 'category_book.webp' },
    food_cafe: { label: '喫茶・食', file: 'category_dining.webp' },
    event: { label: 'イベント', file: 'category_event.webp' },
    workshop: { label: '工房・ワークショップ', file: 'category_activity.webp' }
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
      localAssetPath: './assets/visual-system-v1/runtime_webp/category/' + category.file,
      altTextJa: '感情書店の「' + category.label + '」カテゴリーを表す抽象図版',
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
      canonicalType: 'Book',
      practicalTruth: {
        format: '電子コミック'
      },
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
      id: 'EXP_101',
      sourceClass: SOURCE_CLASS,
      title: 'チームラボボーダレス',
      type: '展示',
      duration: '通常 8:30–21:00（休館・短縮営業あり）',
      price: '大人 3,600円〜',
      canonicalType: 'Exhibition',
      practicalTruth: {
        hours: '通常 8:30–21:00（休館・短縮営業あり）',
        area: '東京都港区虎ノ門5-9 麻布台ヒルズ ガーデンプラザB B1',
        price: '大人 3,600円〜',
        ticketStatus: '日時指定・料金変動あり。公式サイトで最新の営業日・時間・チケットを確認'
      },
      contextEligibility: {
        area: ['tokyo-core', 'tokyo-wide'],
        budgetBand: ['under-5000', 'flexible']
      },
      tags: ['展示を歩く'],
      reason: '館内には地図がなく、作品も空間を移動する。感情書店では、決められた順路をたどるより、次の空間を自分で探しながら進む構造を見て、この場所を「心が弾む」に置きました。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-RWO-001',
        reviewerHuman: true,
        reviewedAt: '2026-08-23T22:33:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-25T09:00:00+09:00'
      },
      editorial: { relation: 'direct' },
      /* 2026-08-25 公式再確認。直近の例外（8/25休館・9/1 17:00閉館・9/8休館）
         のため再確認期限は9/7まで。以降は既存freshness gateでfail closedする。 */
      freshness: { recheckBy: '2026-09-07' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      placeDetail: {
        description: '作品同士が境界を越えて移動し、ほかの作品と影響し合いながら連続する、地図のないミュージアムです。',
        officialSummary: '地図を持たず、移動する作品のあいだを歩くミュージアム。',
        officialSource: {
          attributionLabel: '公式情報より',
          mode: 'source_grounded_paraphrase',
          sourceName: 'チームラボボーダレス 公式サイト',
          sourceUrl: 'https://www.teamlab.art/jp/e/tokyo/',
          verifiedOn: '2026-08-25',
          quotedExcerpt: null,
          rightsBasis: 'official_source_grounded_paraphrase_no_reproduction'
        },
        recommendedStay: '順路を決めすぎず、ひとつの作品を追って別の空間へ進み、作品同士の重なりや変化を確かめます。',
        placementReason: '館内には地図がなく、作品も空間を移動する。感情書店では、決められた順路をたどるより、次の空間を自分で探しながら進む構造を見て、この場所を「心が弾む」に置きました。',
        access: {
          address: '東京都港区虎ノ門5-9 麻布台ヒルズ ガーデンプラザB B1',
          nearestStation: '東京メトロ日比谷線 神谷町駅 5番出口',
          walkingTime: '駅直結'
        },
        provenance: {
          garden: 'https://www.teamlab.art/jp/e/tokyo/',
          access: 'https://www.teamlab.art/jp/e/tokyo/',
          verifiedOn: '2026-08-25'
        }
      },
      physicalDestination: {
        approved: true,
        address: '東京都港区虎ノ門5-9 麻布台ヒルズ ガーデンプラザB B1'
      },
      visualAsset: resolveVisualAsset(
        null, 'exhibition', '展示', 'real_visual_reuse_not_verified'
      ),
      actionDestination: {
        type: 'official_page',
        nextAction: 'visit',
        officiality: 'official',
        url: 'https://www.teamlab.art/jp/e/tokyo/',
        label: '公式サイトで日時とチケットを見る'
      }
    },
    {
      id: 'EXP_102',
      sourceClass: SOURCE_CLASS,
      title: '東京おもちゃ美術館',
      type: '美術館',
      duration: '10:00–16:00',
      price: '大人 1,100円〜',
      canonicalType: 'Activity',
      practicalTruth: {
        location: '東京都新宿区四谷4-20 四谷ひろば内',
        hours: '10:00–16:00',
        price: '大人 1,100円〜'
      },
      contextEligibility: {
        area: ['tokyo-core', 'tokyo-wide'],
        budgetBand: ['under-3000', 'under-5000', 'flexible']
      },
      tags: ['おもちゃで遊ぶ'],
      reason: 'ここでは、おもちゃを展示として眺めるだけでなく、実際に触れて遊び、おもちゃ学芸員が遊びと人の出会いをつなぐ。感情書店では、おもちゃを間にして人と人のやりとりが生まれる仕組みを見て、この場所を「心があたたまる」に置きました。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-RWO-002',
        reviewerHuman: true,
        reviewedAt: '2026-08-23T22:33:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-23T22:33:00+09:00'
      },
      editorial: { relation: 'direct' },
      freshness: { recheckBy: '2026-09-06' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      placeDetail: {
        description: '旧校舎を活用した館内に、世界およそ100か国・約1万5千点のおもちゃが集まり、遊びを案内する「おもちゃ学芸員」がいます。',
        officialSummary: '世界のおもちゃに実際に触れて遊べる、旧校舎の美術館。',
        officialSource: {
          attributionLabel: '公式情報より',
          mode: 'source_grounded_paraphrase',
          sourceName: '東京おもちゃ美術館 公式サイト',
          sourceUrl: 'https://art-play.or.jp/ttm/info/',
          verifiedOn: '2026-08-23',
          quotedExcerpt: null,
          rightsBasis: 'official_source_grounded_paraphrase_no_reproduction'
        },
        recommendedStay: '展示を眺めるだけでなく、おもちゃ学芸員に遊び方を尋ね、世代の異なる人が同じおもちゃをどう扱うかを見てみます。',
        placementReason: 'ここでは、おもちゃを展示として眺めるだけでなく、実際に触れて遊び、おもちゃ学芸員が遊びと人の出会いをつなぐ。感情書店では、おもちゃを間にして人と人のやりとりが生まれる仕組みを見て、この場所を「心があたたまる」に置きました。',
        access: {
          address: '東京都新宿区四谷4-20 四谷ひろば内',
          nearestStation: '東京メトロ丸ノ内線 四谷三丁目駅 2番出口',
          walkingTime: '徒歩5分'
        },
        provenance: {
          garden: 'https://art-play.or.jp/ttm/info/',
          access: 'https://art-play.or.jp/ttm/info/',
          verifiedOn: '2026-08-23'
        }
      },
      physicalDestination: {
        approved: true,
        address: '東京都新宿区四谷4-20 四谷ひろば内'
      },
      visualAsset: resolveVisualAsset(
        null, 'place', '場所', 'real_visual_reuse_not_verified'
      ),
      actionDestination: {
        type: 'official_page',
        nextAction: 'visit',
        officiality: 'official',
        url: 'https://art-play.or.jp/ttm/info/',
        label: '公式サイトで利用案内を見る'
      }
    },
    {
      id: 'EXP_103',
      sourceClass: SOURCE_CLASS,
      title: 'ザ・ペーパーログ：膜と核',
      type: '展示',
      duration: '10:00–19:00',
      price: '無料',
      canonicalType: 'Exhibition',
      practicalTruth: {
        hours: '10:00–19:00',
        area: '東京都港区赤坂9-7-6 東京ミッドタウン・ガーデン内',
        price: '無料'
      },
      contextEligibility: {
        area: ['tokyo-core', 'tokyo-wide'],
        budgetBand: ['free', 'under-3000', 'under-5000', 'flexible']
      },
      tags: ['素材と形を見る'],
      reason: '衣服のプリーツ加工で生まれる副産物の紙が、「膜」のオブジェと「核」の家具プロトタイプへ、対照的な方法で展開されている。感情書店では、同じ紙が別の姿へ変わる対照そのものを入口にして、この展示を「惹かれる」に置きました。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-RWO-003',
        reviewerHuman: true,
        reviewedAt: '2026-08-23T22:33:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-23T22:33:00+09:00'
      },
      editorial: { relation: 'direct' },
      freshness: { recheckBy: '2026-09-13' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      placeDetail: {
        description: 'プリーツ製品の製造工程から生まれる副産物の紙「ペーパーログ」を、膜のような物体や家具の核へ展開する展示です。',
        officialSummary: 'プリーツ加工の副産物の紙が、膜と家具へ展開する展示。',
        officialSource: {
          attributionLabel: '公式情報より',
          mode: 'source_grounded_paraphrase',
          sourceName: '21_21 DESIGN SIGHT 公式サイト',
          sourceUrl: 'https://2121designsight.jp/gallery3/the_paper_log/',
          verifiedOn: '2026-08-23',
          quotedExcerpt: null,
          rightsBasis: 'official_source_grounded_paraphrase_no_reproduction'
        },
        recommendedStay: '作品の形へ先に近づき、素材の由来を知ったあとでもう一度、膜と核の違いを見比べます。',
        placementReason: '衣服のプリーツ加工で生まれる副産物の紙が、「膜」のオブジェと「核」の家具プロトタイプへ、対照的な方法で展開されている。感情書店では、同じ紙が別の姿へ変わる対照そのものを入口にして、この展示を「惹かれる」に置きました。',
        access: {
          address: '東京都港区赤坂9-7-6 東京ミッドタウン・ガーデン内',
          nearestStation: '都営大江戸線 六本木駅／東京メトロ千代田線 乃木坂駅',
          walkingTime: '徒歩5分'
        },
        provenance: {
          garden: 'https://2121designsight.jp/gallery3/the_paper_log/',
          access: 'https://2121designsight.jp/gallery3/the_paper_log/',
          verifiedOn: '2026-08-23'
        }
      },
      physicalDestination: {
        approved: true,
        address: '東京都港区赤坂9-7-6 東京ミッドタウン・ガーデン内'
      },
      visualAsset: resolveVisualAsset(
        null, 'exhibition', '展示', 'real_visual_reuse_not_verified'
      ),
      actionDestination: {
        type: 'official_page',
        nextAction: 'visit',
        officiality: 'official',
        url: 'https://2121designsight.jp/gallery3/the_paper_log/',
        label: '公式サイトで開催情報を見る'
      }
    },
    {
      id: 'EXP_104',
      sourceClass: SOURCE_CLASS,
      title: '東京都復興記念館',
      type: '記念館',
      duration: '9:00–17:00',
      price: '無料',
      canonicalType: 'Place',
      practicalTruth: {
        area: '東京都墨田区横網2-3-25',
        hours: '9:00–17:00',
        access: '都営大江戸線 両国駅 A1出口から徒歩2分',
        admission: '無料'
      },
      contextEligibility: {
        area: ['tokyo-core', 'tokyo-wide'],
        budgetBand: ['free', 'under-3000', 'under-5000', 'flexible']
      },
      tags: ['都市の記憶を見る'],
      reason: '関東大震災の被災物や写真、絵画、復興模型に加え、東京空襲の実物資料も同じ建物に残されている。感情書店では、被害と復興の時間が資料として積み重なった場所に留まって見る入口として、この場所を「沈む」に置きました。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-RWO-004',
        reviewerHuman: true,
        reviewedAt: '2026-08-23T22:33:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-23T22:33:00+09:00'
      },
      editorial: { relation: 'direct' },
      freshness: { recheckBy: '2026-12-27' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      placeDetail: {
        description: '関東大震災と東京大空襲の被害、復興の歩みを、損傷した日用品、写真、絵画、模型などで伝える記念館です。',
        officialSummary: '関東大震災と東京空襲の資料を、同じ建物に残す記念館。',
        officialSource: {
          attributionLabel: '公式情報より',
          mode: 'source_grounded_paraphrase',
          sourceName: '東京都復興記念館（東京都慰霊協会）公式サイト',
          sourceUrl: 'https://tokyoireikyoukai.or.jp/museum/tenji.html',
          verifiedOn: '2026-08-23',
          quotedExcerpt: null,
          rightsBasis: 'official_source_grounded_paraphrase_no_reproduction'
        },
        recommendedStay: '損傷した実物と記録を急いで見終えず、都市の日常が壊れ、再びつくられてきた時間を一点ずつ確かめます。',
        placementReason: '関東大震災の被災物や写真、絵画、復興模型に加え、東京空襲の実物資料も同じ建物に残されている。感情書店では、被害と復興の時間が資料として積み重なった場所に留まって見る入口として、この場所を「沈む」に置きました。',
        access: {
          address: '東京都墨田区横網2-3-25',
          nearestStation: '都営大江戸線 両国駅 A1出口',
          walkingTime: '徒歩2分'
        },
        provenance: {
          garden: 'https://tokyoireikyoukai.or.jp/museum/tenji.html',
          access: 'https://tokyoireikyoukai.or.jp/museum/riyou.html',
          verifiedOn: '2026-08-23'
        }
      },
      physicalDestination: {
        approved: true,
        address: '東京都墨田区横網2-3-25'
      },
      visualAsset: resolveVisualAsset(
        null, 'place', '場所', 'real_visual_reuse_not_verified'
      ),
      actionDestination: {
        type: 'official_page',
        nextAction: 'visit',
        officiality: 'official',
        url: 'https://tokyoireikyoukai.or.jp/museum/riyou.html',
        label: '公式サイトで利用案内を見る'
      }
    },
    {
      id: 'EXP_105',
      sourceClass: SOURCE_CLASS,
      title: 'TOPコレクション 明日の食卓',
      type: '展示',
      duration: '10:00–18:00',
      price: '一般 700円',
      canonicalType: 'Exhibition',
      practicalTruth: {
        hours: '10:00–18:00',
        area: '東京都目黒区三田1-13-3 恵比寿ガーデンプレイス内',
        price: '一般 700円'
      },
      contextEligibility: {
        area: ['tokyo-core', 'tokyo-wide'],
        budgetBand: ['under-3000', 'under-5000', 'flexible']
      },
      tags: ['写真を見る'],
      reason: '「食」を入口に、記憶や人とのつながりだけでなく、環境、高齢化、孤食などの社会的な問いまで見せる展覧会。感情書店では、見慣れた「食べる」という行為の周りに別の層が現れる構成を見て、この展示を「ざわつく」に置きました。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-RWO-005',
        reviewerHuman: true,
        reviewedAt: '2026-08-23T22:33:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-23T22:33:00+09:00'
      },
      editorial: { relation: 'direct' },
      freshness: { recheckBy: '2026-09-21' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      placeDetail: {
        description: '東京都写真美術館のコレクションから、食をめぐる記憶や家族、孤食、高齢化、環境などを写真でたどる展覧会です。',
        officialSummary: '「食」をめぐる写真から、記憶と社会の層をたどる展覧会。',
        officialSource: {
          attributionLabel: '公式情報より',
          mode: 'source_grounded_paraphrase',
          sourceName: '東京都写真美術館 公式サイト',
          sourceUrl: 'https://topmuseum.jp/exhibition/5419/',
          verifiedOn: '2026-08-23',
          quotedExcerpt: null,
          rightsBasis: 'official_source_grounded_paraphrase_no_reproduction'
        },
        recommendedStay: '身近な食卓を写した作品から見始め、安心していた見方がどの作品で揺れるかを立ち止まって確かめます。',
        placementReason: '「食」を入口に、記憶や人とのつながりだけでなく、環境、高齢化、孤食などの社会的な問いまで見せる展覧会。感情書店では、見慣れた「食べる」という行為の周りに別の層が現れる構成を見て、この展示を「ざわつく」に置きました。',
        access: {
          address: '東京都目黒区三田1-13-3 恵比寿ガーデンプレイス内',
          nearestStation: 'JR恵比寿駅 東口',
          walkingTime: '徒歩7分'
        },
        provenance: {
          garden: 'https://topmuseum.jp/exhibition/5419/',
          access: 'https://topmuseum.jp/exhibition/5419/',
          verifiedOn: '2026-08-23'
        }
      },
      physicalDestination: {
        approved: true,
        address: '東京都目黒区三田1-13-3 恵比寿ガーデンプレイス内'
      },
      visualAsset: resolveVisualAsset(
        null, 'exhibition', '展示', 'real_visual_reuse_not_verified'
      ),
      actionDestination: {
        type: 'official_page',
        nextAction: 'visit',
        officiality: 'official',
        url: 'https://topmuseum.jp/exhibition/5419/',
        label: '公式サイトで開催情報を見る'
      }
    },
    {
      id: 'EXP_106',
      sourceClass: SOURCE_CLASS,
      title: '80 GRAPHIC TRIALS',
      type: '展示',
      duration: '10:00–18:00',
      price: '無料',
      canonicalType: 'Exhibition',
      practicalTruth: {
        hours: '10:00–18:00',
        area: '東京都文京区水道1-3-3 トッパン小石川本社ビル',
        price: '無料'
      },
      contextEligibility: {
        area: ['tokyo-core', 'tokyo-wide'],
        budgetBand: ['free', 'under-3000', 'under-5000', 'flexible']
      },
      tags: ['グラフィックを見る'],
      reason: 'GRAPHIC TRIALは、クリエイターとTOPPANの共創で、グラフィックデザインと印刷表現の新しい可能性を探ってきた20年の試み。感情書店では、異なる発想と技術が接触し、その試行の積み重ねが見えることを「ぶつかる」として読みました。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-RWO-006',
        reviewerHuman: true,
        reviewedAt: '2026-08-23T22:33:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-23T22:33:00+09:00'
      },
      editorial: { relation: 'direct' },
      freshness: { recheckBy: '2026-08-28' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      placeDetail: {
        description: 'クリエイターと印刷会社が協働し、印刷表現の可能性を探ってきた企画から、80人のクリエイターによるグラフィック作品を紹介する展覧会です。',
        officialSummary: '20年続く印刷表現の試みを、80人の作品でたどる展覧会。',
        officialSource: {
          attributionLabel: '公式情報より',
          mode: 'source_grounded_paraphrase',
          sourceName: '印刷博物館 公式サイト',
          sourceUrl: 'https://www.printing-museum.org/collection/exhibition/g20260627.php',
          verifiedOn: '2026-08-23',
          quotedExcerpt: null,
          rightsBasis: 'official_source_grounded_paraphrase_no_reproduction'
        },
        recommendedStay: '一枚ずつ完成形だけを見るのではなく、異なる発想と印刷技術がどこで接触して表現になったかを見比べます。',
        placementReason: 'GRAPHIC TRIALは、クリエイターとTOPPANの共創で、グラフィックデザインと印刷表現の新しい可能性を探ってきた20年の試み。感情書店では、異なる発想と技術が接触し、その試行の積み重ねが見えることを「ぶつかる」として読みました。',
        access: {
          address: '東京都文京区水道1-3-3 トッパン小石川本社ビル',
          nearestStation: '東京メトロ有楽町線 江戸川橋駅 4番出口',
          walkingTime: '徒歩8分'
        },
        provenance: {
          garden: 'https://www.printing-museum.org/collection/exhibition/g20260627.php',
          access: 'https://www.printing-museum.org/collection/exhibition/g20260627.php',
          verifiedOn: '2026-08-23'
        }
      },
      physicalDestination: {
        approved: true,
        address: '東京都文京区水道1-3-3 トッパン小石川本社ビル'
      },
      visualAsset: resolveVisualAsset(
        null, 'exhibition', '展示', 'real_visual_reuse_not_verified'
      ),
      actionDestination: {
        type: 'official_page',
        nextAction: 'visit',
        officiality: 'official',
        url: 'https://www.printing-museum.org/collection/exhibition/g20260627.php',
        label: '公式サイトで開催情報を見る'
      }
    },
    {
      id: 'EXP_107',
      sourceClass: SOURCE_CLASS,
      title: '文喫 六本木',
      type: '書店',
      duration: '9:00–21:00',
      price: '平日 2,750円〜',
      canonicalType: 'Place',
      practicalTruth: {
        area: '東京都港区六本木6-1-20 六本木電気ビル1F',
        hours: '9:00–21:00',
        access: '六本木駅 3・1a出口から徒歩1分',
        admission: '平日 2,750円〜'
      },
      contextEligibility: {
        area: ['tokyo-core', 'tokyo-wide'],
        budgetBand: ['under-3000', 'under-5000', 'flexible']
      },
      tags: ['本に囲まれて過ごす'],
      reason: '文喫は、約3万冊の本を販売しながら、一人で本と向き合う閲覧室などを備え、入場料を払って滞在する書店。感情書店では、何かをすぐ選ぶより、本に囲まれる時間そのものを先に確保する仕組みを見て、この場所を「身を引く」に置きました。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-RWO-007',
        reviewerHuman: true,
        reviewedAt: '2026-08-23T22:33:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-23T22:33:00+09:00'
      },
      editorial: { relation: 'direct' },
      freshness: { recheckBy: '2026-09-22' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      placeDetail: {
        description: '約3万冊の本を販売しながら、閲覧室や研究室、喫茶室で本に囲まれて過ごせる入場制の書店です。',
        officialSummary: '入場料を払って、本に囲まれる時間を先に確保する書店。',
        officialSource: {
          attributionLabel: '公式情報より',
          mode: 'source_grounded_paraphrase',
          sourceName: '文喫 六本木 公式サイト',
          sourceUrl: 'https://roppongi.bunkitsu.jp/store/',
          verifiedOn: '2026-08-23',
          quotedExcerpt: null,
          rightsBasis: 'official_source_grounded_paraphrase_no_reproduction'
        },
        recommendedStay: '目的の本をすぐ決めず、閲覧室や研究室で棚を眺め、いつもの情報の流れから距離を取る時間をつくります。',
        placementReason: '文喫は、約3万冊の本を販売しながら、一人で本と向き合う閲覧室などを備え、入場料を払って滞在する書店。感情書店では、何かをすぐ選ぶより、本に囲まれる時間そのものを先に確保する仕組みを見て、この場所を「身を引く」に置きました。',
        access: {
          address: '東京都港区六本木6-1-20 六本木電気ビル1F',
          nearestStation: '東京メトロ日比谷線／都営大江戸線 六本木駅 3・1a出口',
          walkingTime: '徒歩1分'
        },
        provenance: {
          garden: 'https://roppongi.bunkitsu.jp/store/',
          access: 'https://roppongi.bunkitsu.jp/store/',
          verifiedOn: '2026-08-23'
        }
      },
      physicalDestination: {
        approved: true,
        address: '東京都港区六本木6-1-20 六本木電気ビル1F'
      },
      visualAsset: resolveVisualAsset(
        null, 'bookstore', '書店', 'real_visual_reuse_not_verified'
      ),
      actionDestination: {
        type: 'official_page',
        nextAction: 'visit',
        officiality: 'official',
        url: 'https://roppongi.bunkitsu.jp/store/',
        label: '公式サイトで利用案内を見る'
      }
    },
    {
      id: 'EXP_007',
      sourceClass: SOURCE_CLASS,
      title: '新宿御苑',
      type: '場所',
      duration: '9:00–18:00（8–9月）',
      price: '一般 500円',
      canonicalType: 'Place',
      practicalTruth: {
        area: '東京都新宿区内藤町11',
        hours: '9:00–18:00（8–9月）',
        access: '新宿御苑前駅 出口1から徒歩5分',
        admission: '一般 500円'
      },
      contextEligibility: {
        area: ['tokyo-core', 'tokyo-wide'],
        budgetBand: ['under-3000', 'under-5000', 'flexible']
      },
      tags: ['場所を訪れる'],
      reason: '新宿御苑では、整形式庭園、風景式庭園、日本庭園など、歩くうちに景色の組み立て方が切り替わる。感情書店では、ひとつの見方に名前をつけて固定する前に、異なる景色の秩序を行き来してみる場所として、この場所を「まだ名前がない」に置きました。',
      authority: {
        state: APPROVED_STATE,
        deckRef: DECK_REF,
        placementRef: 'PH-P0-003',
        reviewerHuman: true,
        reviewedAt: '2026-08-23T22:33:00+09:00',
        realDataGateResult: 'REAL_DATA_GATE_READY_FOR_PHASE0',
        livenessCheckedAt: '2026-08-23T22:33:00+09:00'
      },
      editorial: { relation: 'opening' },
      freshness: { recheckBy: '2026-09-29' },
      rights: { imageReuseApproved: false, textReuseApproved: false },
      placeDetail: {
        description: '新宿御苑は、ただ広い緑地ではありません。58.3ヘクタールの同じ園内で、芝生と巨樹がゆるやかな景色をつくる風景式庭園、左右対称のプラタナス並木を軸にした整形式庭園、日本庭園へと、歩くにつれて景色の秩序そのものが切り替わります。',
        officialSummary: '歩くうちに庭園の秩序が切り替わる、58.3ヘクタールの庭園。',
        officialSource: {
          attributionLabel: '公式情報より',
          mode: 'source_grounded_paraphrase',
          sourceName: '新宿御苑（国民公園協会）公式サイト',
          sourceUrl: 'https://fng.or.jp/shinjuku/place/garden/',
          verifiedOn: '2026-08-23',
          quotedExcerpt: null,
          rightsBasis: 'official_source_grounded_paraphrase_no_reproduction'
        },
        recommendedStay: '全部を見ようとせず、風景式庭園と整形式庭園の二つを歩き比べます。広い芝生と巨樹の間から、左右対称のプラタナス並木へ移り、同じ園内で視界の組み立て方がどう変わるかを見てみます。',
        placementReason: '新宿御苑では、整形式庭園、風景式庭園、日本庭園など、歩くうちに景色の組み立て方が切り替わる。感情書店では、ひとつの見方に名前をつけて固定する前に、異なる景色の秩序を行き来してみる場所として、この場所を「まだ名前がない」に置きました。',
        access: {
          address: '東京都新宿区内藤町11',
          nearestStation: '東京メトロ丸ノ内線 新宿御苑前駅 出口1',
          walkingTime: '徒歩5分'
        },
        provenance: {
          garden: 'https://fng.or.jp/shinjuku/place/garden/',
          access: 'https://fng.or.jp/shinjuku/access/',
          verifiedOn: '2026-08-23'
        }
      },
      physicalDestination: {
        approved: true,
        address: '東京都新宿区内藤町11'
      },
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
        recheckBy: '2026-09-29',
        localAssetPath: './assets/real-experience/EXP_007_shinjuku_gyoen_official_landscape-1440.webp',
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
    var hasApprovedPhysicalDestination = record.physicalDestination &&
      record.physicalDestination.approved === true;
    if (!actions.length || actions[0].kind !== 'primary') return false;
    if (!hasApprovedPhysicalDestination) return actions.length === 1;
    return actions.length === 2 && actions[1].kind === 'maps' &&
      actions[1].destinationClass === 'map_directions';
  }

  function hasCompletePlaceDetail(record) {
    if (!record || !record.physicalDestination || record.physicalDestination.approved !== true) {
      return true;
    }
    var detail = record.placeDetail;
    var access = detail && detail.access;
    var provenance = detail && detail.provenance;
    return Boolean(detail && detail.description && detail.recommendedStay &&
      detail.placementReason && access && access.address && access.nearestStation &&
      access.walkingTime && provenance && /^https:\/\//.test(provenance.garden || '') &&
      /^https:\/\//.test(provenance.access || '') && isDateOnly(provenance.verifiedOn) &&
      record.physicalDestination && record.physicalDestination.approved === true &&
      record.physicalDestination.address === access.address);
  }

  function approvedRelationFor(recordId) {
    var found = null;
    SHELF_IDS.some(function (shelfId) {
      var placements = OUTING_RELATIONS[shelfId] || [];
      for (var i = 0; i < placements.length; i += 1) {
        if (placements[i].experienceId === recordId) {
          found = placements[i].relation;
          return true;
        }
      }
      return false;
    });
    return found;
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
        asset.localAssetPath === './assets/visual-system-v1/runtime_webp/category/' + category.file &&
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
    var approvedRelation = record && approvedRelationFor(record.id);
    if (!record || !record.editorial ||
        (record.id === 'EXP_001' && record.editorial.relation !== 'direct') ||
        (record.id !== 'EXP_001' &&
          (!approvedRelation || record.editorial.relation !== approvedRelation))) {
      reasons.push('APPROVED_RELATION_MISMATCH');
    }
    if (!record || !record.title || !record.reason) reasons.push('READER_FIELDS_INCOMPLETE');
    if (!MATCHING || typeof MATCHING.resolvePracticalTruth !== 'function' ||
        !MATCHING.resolvePracticalTruth(record)) reasons.push('TYPE_SPECIFIC_TRUTH_INVALID');
    if (!hasCompletePlaceDetail(record)) reasons.push('PLACE_DETAIL_INCOMPLETE');
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
    if (SHELF_IDS.indexOf(emotionId) === -1) return null;
    var approvedRelations = OUTING_RELATIONS[emotionId] || [];
    var active = approvedRelations.map(function (placement) {
      var record = byId(placement.experienceId, asOf);
      if (!record || !record.physicalDestination ||
          record.physicalDestination.approved !== true ||
          !record.editorial || record.editorial.relation !== placement.relation) return null;
      return record;
    }).filter(function (record) {
      return Boolean(record);
    });
    return {
      deckRef: DECK_REF,
      emotionId: emotionId,
      ids: active.map(function (record) { return record.id; }),
      relationCoverage: active.reduce(function (coverage, record) {
        coverage[record.editorial.relation] += 1;
        return coverage;
      }, { direct: 0, adjacent: 0, opening: 0 }),
      fillFlag: false
    };
  }

  /* Full-shelf membership resolver. Structural violations fail the whole shelf
     closed; individually stale/invalid records are excluded (same policy as the
     cover). Order stays exact Human Editorial input order. Never fills slots.
     Collection eligibility relies on validateRecord + relation integrity; the
     cover keeps its additional physical-outing gate unchanged. */
  function collectionForEmotion(emotionId, asOf) {
    if (SHELF_IDS.indexOf(emotionId) === -1) return null;
    var authored = COLLECTION_RELATIONS[emotionId] || [];
    var cover = OUTING_RELATIONS[emotionId] || [];
    var plan = validateShelfPlan({
      coverIds: cover.map(function (placement) { return placement.experienceId; }),
      collectionIds: authored.map(function (placement) { return placement.experienceId; })
    });
    if (!plan.pass) {
      return Object.freeze({
        shelfId: emotionId, state: 'error', reasons: Object.freeze(plan.reasons.slice()),
        ids: Object.freeze([]), coverIds: Object.freeze([]), count: 0, available: false
      });
    }
    var active = authored.filter(function (placement) {
      var record = byId(placement.experienceId, asOf);
      return Boolean(record && record.editorial &&
        record.editorial.relation === placement.relation);
    });
    var ids = active.map(function (placement) { return placement.experienceId; });
    var coverDeck = deckForEmotion(emotionId, asOf);
    var coverIds = coverDeck && Array.isArray(coverDeck.ids) ? coverDeck.ids.slice() : [];
    return Object.freeze({
      shelfId: emotionId,
      state: 'ok',
      reasons: Object.freeze([]),
      ids: Object.freeze(ids),
      coverIds: Object.freeze(coverIds),
      count: ids.length,
      available: ids.length >= COLLECTION_MIN_AVAILABLE && ids.length <= COLLECTION_MAX
    });
  }

  /* Current-authority shelf membership for one experience, independent of
     cover visibility. Interested resolution uses this instead of the cover. */
  function shelfForExperience(experienceId, asOf) {
    var matches = SHELF_IDS.filter(function (shelfId) {
      return (COLLECTION_RELATIONS[shelfId] || []).some(function (placement) {
        return placement.experienceId === experienceId;
      });
    });
    if (matches.length !== 1) return null;
    var record = byId(experienceId, asOf);
    if (!record) return null;
    var placement = (COLLECTION_RELATIONS[matches[0]] || []).filter(function (item) {
      return item.experienceId === experienceId;
    })[0];
    return record.editorial && placement &&
      record.editorial.relation === placement.relation ? matches[0] : null;
  }

  function releaseRelations(asOf) {
    var rows = [];
    SHELF_IDS.forEach(function (shelfId) {
      (OUTING_RELATIONS[shelfId] || []).forEach(function (placement) {
        var record = byId(placement.experienceId, asOf);
        var truth = record && MATCHING && MATCHING.resolvePracticalTruth(record);
        var source = record && record.placeDetail && record.placeDetail.officialSource;
        var action = record && AD && AD.actionsForExperience(record).filter(function (item) {
          return item.kind === 'primary';
        })[0];
        var host = null;
        try { host = source && new URL(source.sourceUrl).hostname; } catch (error) { host = null; }
        if (!record || !truth || !source || !action) return;
        rows.push({
          shelfId: shelfId,
          contentId: record.id,
          canonicalObjectId: source.sourceUrl,
          normalizedType: truth.type,
          sourceFamily: host,
          sourceUrl: source.sourceUrl,
          sourceTraceable: true,
          officialVerified: Boolean(source.verifiedOn),
          editorialWhy: record.placeDetail.placementReason,
          actionStatus: 'ready',
          freshnessStatus: isFresh(record, asOf) ? 'ready' : 'stale',
          mediaStatus: record.visualAsset.status === 'real_ready' ? 'real_ready' : 'fallback_ready',
          language: 'ja',
          eligible: true,
          role: 'base'
        });
      });
    });
    return clone(rows);
  }

  /* Adapter only: it does not append real records to the prototype fixture pool. */
  if (global.V3_DATA && typeof fixtureById === 'function') {
    global.V3_DATA.byId = function (id) {
      return byId(id) || fixtureById(id);
    };
  }

  global.V3_REAL_EXPERIENCE_REGISTRY = Object.freeze({
    VERSION: 'real-world-outing-activation-v1.0',
    SOURCE_CLASS: SOURCE_CLASS,
    DECK_REF: DECK_REF,
    EMOTION_ID: EMOTION_ID,
    SHELF_IDS: Object.freeze(SHELF_IDS.slice()),
    APPROVED_IDS: Object.freeze([
      'EXP_001', 'EXP_101', 'EXP_102', 'EXP_103', 'EXP_104',
      'EXP_105', 'EXP_106', 'EXP_107', 'EXP_007'
    ]),
    OUTING_IDS: Object.freeze([
      'EXP_101', 'EXP_102', 'EXP_103', 'EXP_104',
      'EXP_105', 'EXP_106', 'EXP_107', 'EXP_007'
    ]),
    OUTING_EXCLUSIONS: Object.freeze({
      EXP_001: 'CULTURE_SIDECAR_NOT_OUTING_EXACT_SHELF_RELATION_NOT_APPROVED'
    }),
    CATEGORY_IDS: Object.freeze(Object.keys(CATEGORY_VISUALS)),
    EXCLUDED_DISPOSITIONS: Object.freeze(clone(excluded)),
    COVER_MAX: COVER_MAX,
    COLLECTION_MAX: COLLECTION_MAX,
    COLLECTION_MIN_AVAILABLE: COLLECTION_MIN_AVAILABLE,
    categoryVisualFor: categoryVisualFor,
    resolveVisualAsset: resolveVisualAsset,
    byId: byId,
    deckForEmotion: deckForEmotion,
    validateShelfPlan: validateShelfPlan,
    collectionForEmotion: collectionForEmotion,
    shelfForExperience: shelfForExperience,
    validateRecord: validateRecord,
    validateVisualAsset: validateVisualAsset,
    isFresh: isFresh,
    releaseRelations: releaseRelations,
    snapshot: function () { return clone(records); }
  });
})(window);
