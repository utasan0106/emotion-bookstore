/* =============================================================================
 * V3 Isolated UX Prototype — rule-based local personalization
 * -----------------------------------------------------------------------------
 * runtime AI / ML / 外部 API を使わない。すべて local な rule-based logic。
 * 使う signal は 3 つだけ:
 *   1. 本人が選んだ facet
 *   2. experience tag
 *   3. recent experience ids
 * emotion と facet を結びつけた心理的意味づけは行わない。
 * 内部の 3 分類（近い / type を変える / 別方向）は UI に一切表示しない。
 * ========================================================================== */
(function (global) {
  'use strict';

  var DECK_SIZE = 3;

  function pool(recentIds) {
    var recent = recentIds || [];
    return global.V3_DATA.EXPERIENCES.filter(function (e) {
      return recent.indexOf(e.id) === -1;
    });
  }

  /* signal を使わない通常の 3 件（Discovery 初回、および signal 不足時の戻り先）。 */
  function baseDeck(recentIds) {
    var list = pool(recentIds);
    if (list.length < DECK_SIZE) list = global.V3_DATA.EXPERIENCES.slice();
    return list.slice(0, DECK_SIZE).map(function (e) { return e.id; });
  }

  function facetTags(facets) {
    var map = global.V3_DATA.FACET_TAGS;
    var out = [];
    (facets || []).forEach(function (f) {
      (map[f] || []).forEach(function (t) {
        if (out.indexOf(t) === -1) out.push(t);
      });
    });
    return out;
  }

  function score(experience, tags) {
    var n = 0;
    experience.tags.forEach(function (t) {
      if (tags.indexOf(t) !== -1) n += 1;
    });
    return n;
  }

  function best(list, tags, predicate) {
    var found = null;
    list.forEach(function (e) {
      if (predicate && !predicate(e)) return;
      if (!found || score(e, tags) > score(found, tags)) found = e;
    });
    return found;
  }

  function remove(list, experience) {
    return list.filter(function (e) { return e.id !== experience.id; });
  }

  /* 十分な signal がある場合だけ personalized deck を返す。
     足りない場合は null を返し、呼び出し側は通常の 3 件へ戻す。 */
  function personalizedDeck(facets, recentIds) {
    var tags = facetTags(facets);
    if (tags.length === 0) return null;

    var rest = pool(recentIds);
    if (rest.length < DECK_SIZE) return null;

    var c1 = best(rest, tags);
    if (!c1 || score(c1, tags) === 0) return null;
    rest = remove(rest, c1);

    // 少し異なる Experience type
    var c2 = best(rest, tags, function (e) { return e.typeKey !== c1.typeKey; }) || best(rest, tags);
    rest = remove(rest, c2);

    // editorial 上説明できる別方向（さらに type を重ねない）
    var c3 = best(rest, tags, function (e) {
      return e.typeKey !== c1.typeKey && e.typeKey !== c2.typeKey;
    }) || rest[0];

    if (!c1 || !c2 || !c3) return null;
    return [c1.id, c2.id, c3.id];
  }

  global.V3_PERSONALIZE = {
    baseDeck: baseDeck,
    personalizedDeck: personalizedDeck,
    facetTags: facetTags
  };
})(window);
