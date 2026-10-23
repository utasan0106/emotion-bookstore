'use strict';
// Pure contract helper. Unit fixtures are not rendered evidence.
// Geometry must be collected from the actual page after font/image readiness.
function validatePairs(pairs, { width, fontPercent, viewportHeight }) {
  if (!Array.isArray(pairs) || pairs.length !== 3) return false;
  return pairs.every(pair => {
    const { cover, reason } = pair;
    if (!pair.sameArticle || !pair.adjacentSiblings || !pair.visible || !cover || !reason) return false;
    if (![cover.left, cover.top, cover.right, cover.bottom, reason.left, reason.top, reason.right, reason.bottom].every(Number.isFinite)) return false;
    if (cover.right <= cover.left || cover.bottom <= cover.top || reason.right <= reason.left || reason.bottom <= reason.top) return false;
    if (cover.left < -1 || reason.left < -1 || cover.right > width + 1 || reason.right > width + 1) return false;
    const gap = (width >= 1000 || width <= 700) ? reason.top - cover.bottom : reason.left - cover.right;
    if (gap < -1 || gap > 24) return false;
    // At 200% text growth may require vertical scrolling. It must never be clipped.
    if (fontPercent === 100) {
      if (cover.bottom - cover.top < 140) return false;
      if (Math.max(cover.bottom, reason.bottom) - Math.min(cover.top, reason.top) > viewportHeight) return false;
    }
    return true;
  });
}
module.exports = { validatePairs };
