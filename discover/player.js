// Add a real stop/return lifecycle to the existing explicit-click video embed.
// Loading an iframe is not treated as successful playback. No new tracking/storage.
(function () {
  'use strict';
  var host = document.querySelector('.v3-video');
  if (!host) return;
  var frame = host.querySelector('.v3-video-frame');
  var open = host.querySelector('.v3-video-load');
  var stop = host.querySelector('.player-stop');
  var status = host.querySelector('.player-status');
  if (!window.V3_VIDEO_EMBED || host.getAttribute('data-video-state') !== 'idle') return;
  /* Pages that only carry the click-to-load frame have no stop/return controls.
     There is nothing to add there, so leave their player exactly as it is. */
  if (!frame || !open || !stop || !status) return;
  open.hidden = false;
  status.textContent = '開くとYouTubeに接続します。再生はプレイヤーの ▶ から。';
  function close(focus) {
    if (host.getAttribute('data-video-state') !== 'loaded') return;
    frame.textContent = '';
    frame.appendChild(open);
    host.setAttribute('data-video-state', 'idle');
    stop.hidden = true;
    status.textContent = 'プレイヤーを閉じました。もう一度開いて再生できます。';
    if (focus) open.focus();
  }
  open.addEventListener('click', function () {
    if (host.getAttribute('data-video-state') !== 'loaded') return;
    stop.hidden = false;
    status.textContent = '再生はプレイヤーの ▶ から。表示されないときは下のYouTubeへのリンクを使えます。';
  });
  stop.addEventListener('click', function () { close(true); });
  document.addEventListener('click', function (event) {
    if (event.target.closest && event.target.closest('a[href]')) close(false);
  }, true);
  window.addEventListener('pagehide', function () { close(false); });
  document.addEventListener('securitypolicyviolation', function (event) {
    if (event.disposition !== 'enforce' || !/^(frame-src|child-src|default-src)$/.test(event.effectiveDirective || '')) return;
    if (!/^https:\/\/www\.youtube-nocookie\.com(?:\/|$)/.test(event.blockedURI || '')) return;
    if (host.getAttribute('data-video-state') !== 'loaded') return;
    close(false);
    status.textContent = 'このページではプレイヤーを表示できません。下のYouTubeへのリンクから同じ映像を観られます。';
    var exit = document.querySelector('.official-exit');
    if (exit) exit.focus();
  });
})();
