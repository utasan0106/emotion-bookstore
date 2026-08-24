/* V3 S1B live editorial seams. Empty is truthful until HQ supplies records
   that have completed Source / Official / Rights / Human Editorial review. */
(function (global) {
  'use strict';

  global.V3_S1B_EDITORIAL_CONTENT = Object.freeze({
    version: 'v3-frontstage-editorial-content-v1',
    featured: Object.freeze([]),
    videos: Object.freeze([]),
    dailyLineups: Object.freeze([]),
    /* HQ may mount one READY weekly config after its referenced Registry records
       pass Source / Official / Rights / Freshness / Human Editorial review:
       { status, configVersion, label: '編集部の仕入れ', startsOn, expiresOn,
         itemIds: [0..3 unique approved Registry IDs] }. */
    noEmotionLineups: Object.freeze([])
  });
})(window);
