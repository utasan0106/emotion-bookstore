'use strict';
(() => {
  // Reuse the public click-to-load implementation without changing its contract.
  // This isolated page does not load analytics-v3.js or send measurement events.
  const host = document.getElementById('trailer');
  const stopButton = document.getElementById('stop-video');
  const status = document.getElementById('video-status');
  if (!host || !window.V3_VIDEO_EMBED) return;
  host.querySelector('.v3-video-load').hidden = false;
  const initialFrame = host.querySelector('.v3-video-frame').cloneNode(true);

  function stop(message = '') {
    host.replaceChildren(initialFrame.cloneNode(true));
    host.removeAttribute('data-video-state');
    window.V3_VIDEO_EMBED.mount(document);
    stopButton.hidden = true;
    status.textContent = message;
  }

  host.addEventListener('click', () => {
    if (!host.querySelector('iframe')) return;
    stopButton.hidden = false;
    status.textContent = 'プレイヤーの ▶ で再生できます。終わるときは「閉じて停止」。';
    // Focus remains in the official iframe, as in the existing video component.
  });
  stopButton.addEventListener('click', () => {
    stop('プレイヤーを閉じました。');
    host.querySelector('.v3-video-load').focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-leave]').forEach(link => link.addEventListener('click', () => {
    if (host.querySelector('iframe')) stop('プレイヤーを閉じました。');
  }));
  window.addEventListener('pagehide', () => stop());
})();
