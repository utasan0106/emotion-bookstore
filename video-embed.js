/* Official video — click-to-load inline player（Founder decision 2026-09-06 v2）.
   - 表示しただけでは動画 provider（YouTube と、その画像・配信 host）へ接続しない。
     サムネイルの hotlink・事前接続・事前読込も無い。
   - 利用者が「現在の公式映像を見る」を押したときだけ、そのページ内に
     YouTube のプライバシー強化モード（youtube-nocookie.com）の player を置く。
   - 自動再生はしない（player の再生ボタンを押して初めて再生される）。
   - 保存しない。位置情報・カメラ・fetch・XHR を使わない。計測は、押して player を作った瞬間の
     bounded event 1 回だけ（analytics-v3.js、本番 host だけ）。
   - host は data-video-id（11 文字の YouTube video id）と data-video-title を持つ
     .v3-video。中の .v3-video-frame に .v3-video-load ボタンがある。 */
(function () {
  'use strict';

  var PROVIDER = 'https://www.youtube-nocookie.com/embed/';

  function mountOne(host) {
    if (!host || host.getAttribute('data-video-state')) return;
    var videoId = host.getAttribute('data-video-id') || '';
    var frame = host.querySelector('.v3-video-frame');
    var button = host.querySelector('.v3-video-load');
    if (!frame || !button) return;
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) { button.disabled = true; return; }
    host.setAttribute('data-video-state', 'idle');
    button.addEventListener('click', function () {
      if (host.getAttribute('data-video-state') === 'loaded') return;
      var iframe = document.createElement('iframe');
      iframe.className = 'v3-video-iframe';
      iframe.title = host.getAttribute('data-video-title') || '';
      iframe.allow = 'encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.src = PROVIDER + encodeURIComponent(videoId) + '?playsinline=1&rel=0';
      frame.textContent = '';
      frame.appendChild(iframe);
      host.setAttribute('data-video-state', 'loaded');
      iframe.focus();
      /* Measurement v0.4: the explicit click that created the player, once per page load.
         Origin class only (thread | work); no video id / title / duration / playback. */
      if (window.v3Analytics && typeof window.v3Analytics.mediaPreviewOpen === 'function') window.v3Analytics.mediaPreviewOpen();
    });
  }

  function mount(root) {
    var scope = root || document;
    var hosts = scope.querySelectorAll('.v3-video');
    for (var i = 0; i < hosts.length; i++) mountOne(hosts[i]);
  }

  window.V3_VIDEO_EMBED = { mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mount(document); });
  else mount(document);
})();
