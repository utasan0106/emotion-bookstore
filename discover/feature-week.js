// The city page leads with a different object each week. Every week of the editorial
// rotation is already in the page; this only chooses which one is shown.
// No storage, no network, no measurement. Without this script the page keeps showing
// the first entry of each rotation, which is a real object with a real destination.
(function () {
  'use strict';
  var week = window.V3_WEEK;
  var host = document.querySelector('[data-rotation-epoch]');
  if (!week || !host) return;
  var epoch = host.getAttribute('data-rotation-epoch');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(epoch)) return;

  function show() {
    var elapsed = week.stamp(week.monday(Date.now())) - week.stamp(epoch);
    if (!isFinite(elapsed)) return;
    var weeks = Math.floor(elapsed / 604800000);
    var cards = host.querySelectorAll('[data-feature-week]');
    var counts = {};
    for (var i = 0; i < cards.length; i++) {
      var kind = cards[i].getAttribute('data-feature-kind');
      counts[kind] = (counts[kind] || 0) + 1;
    }
    for (var j = 0; j < cards.length; j++) {
      var card = cards[j];
      var total = counts[card.getAttribute('data-feature-kind')];
      /* Before the rotation starts, and after it wraps, the arithmetic still lands
         on a real entry rather than on nothing. */
      var chosen = ((weeks % total) + total) % total;
      card.hidden = Number(card.getAttribute('data-feature-week')) !== chosen;
    }
  }
  show();
  /* A page left open across a Monday shows the new week when it is looked at again. */
  document.addEventListener('visibilitychange', function () { if (!document.hidden) show(); });
})();
