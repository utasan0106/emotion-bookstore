(function () {
  'use strict';

  var button = document.getElementById('weeklyVideoPlay');
  var host = document.getElementById('weeklyVideoHost');
  var status = document.getElementById('weeklyVideoStatus');
  if (!button || !host) return;

  var loaded = false;
  button.addEventListener('click', function () {
    if (loaded) return;
    loaded = true;

    var videoId = button.getAttribute('data-video-id') || '';
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      loaded = false;
      if (status) status.textContent = '動画を読み込めませんでした。';
      return;
    }

    var iframe = document.createElement('iframe');
    iframe.title = button.getAttribute('data-video-title') || '週末の前の一本';
    iframe.loading = 'eager';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&playsinline=1&rel=0';

    host.className = 'weekly-video-player';
    while (host.firstChild) host.removeChild(host.firstChild);
    host.appendChild(iframe);
    button.disabled = true;
    button.textContent = '動画を読み込みました';
    if (status) status.textContent = 'YouTubeの動画を読み込みました。';
  }, { once: true });
})();
