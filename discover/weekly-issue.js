// 今週号。会期が今週で終わる催しだけを残す。
// JavaScript が無ければ、終わる順に並んだ催しの一覧がそのまま読める。
// 保存しない、通信しない、計測しない。feature-week.js と同じ約束。
(function () {
  'use strict';
  var week = window.V3_WEEK;
  var host = document.querySelector('[data-ending-list]');
  if (!week || !host) return;

  function show() {
    var today = week.date(Date.now());
    var end = week.add(week.monday(Date.now()), 7);
    var rows = host.querySelectorAll('[data-ends]');
    var kept = 0;
    for (var i = 0; i < rows.length; i++) {
      var last = rows[i].getAttribute('data-ends');
      /* 催し一覧と同じ門をくぐらせる。再確認期限を過ぎた催しは向こうで消えるので、
         今週号だけが出し続けると、リンク先の無い催しを勧めることになる。 */
      var review = rows[i].getAttribute('data-review') || '';
      var keep = last >= today && last < end && review >= today;
      rows[i].hidden = !keep;
      if (keep) kept++;
    }
    var empty = document.querySelector('[data-ending-empty]');
    if (empty) empty.hidden = kept > 0;
    var count = document.querySelector('[data-ending-count]');
    if (count) count.textContent = kept ? kept + '件' : '0件';
  }
  show();
  /* 月曜をまたいで開きっぱなしのページが、先週の号を出し続けないように。 */
  document.addEventListener('visibilitychange', function () { if (!document.hidden) show(); });
})();
