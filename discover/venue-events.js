// 会場ページの「いまここで」。催しは会期で入れ替わるので、書き込まずに毎回選び直す。
// 催し一覧と同じ門をくぐらせる（開催日が今日以降、再確認期限が切れていない）。
// JavaScript が無ければ、会場に関係する催しの一覧がそのまま日付順に読める。
// 保存しない、通信しない、計測しない。
(function () {
  'use strict';
  var week = window.V3_WEEK;
  var host = document.querySelector('[data-venue-events]');
  if (!week || !host) return;

  function show() {
    var today = week.date(Date.now());
    var rows = host.querySelectorAll('[data-event-last]');
    var kept = 0;
    for (var i = 0; i < rows.length; i++) {
      var last = rows[i].getAttribute('data-event-last');
      var review = rows[i].getAttribute('data-event-review') || '';
      var keep = last >= today && review >= today;
      rows[i].hidden = !keep;
      if (keep) kept++;
    }
    var empty = document.querySelector('[data-venue-events-empty]');
    if (empty) empty.hidden = kept > 0;
    var count = document.querySelector('[data-venue-events-count]');
    if (count) count.textContent = kept + '件';
  }
  show();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) show(); });
})();
