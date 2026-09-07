'use strict';
(() => {
  // Reuse the public click-to-load implementation without changing its contract.
  // This isolated page does not load analytics-v3.js or send measurement events.
  const host = document.getElementById('trailer');
  const stopButton = document.getElementById('stop-video');
  const status = document.getElementById('video-status');
  if (!host || !window.V3_VIDEO_EMBED) return;
  const scenes = Object.freeze({
    film: {
      id: 'pm7RBghFt0I', title: '日活公式『PARKS パークス』予告（1分59秒）',
      label: 'PARKS 公式予告 · 1分59秒', invitation: 'PARKS', meta: 'パークス / 2017',
      load: '公式予告プレイヤーを開く ▶',
      note: '2017年の発売告知を含む予告です。作品・ディスク情報は下の公式サイトで確認できます。',
      href: 'https://www.youtube.com/watch?v=pm7RBghFt0I', exit: '日活公式YouTubeで観る ↗'
    },
    park: {
      id: '80y5COiKdDw', title: 'みらいレコーズ公式：井の頭公園100年記念放送 サンプル（57秒）',
      label: '井の頭公園100周年記念放送 · 57秒', invitation: '井の頭公園', meta: '100周年記念放送 / 記録映像',
      load: '公園放送プレイヤーを開く ▶',
      note: 'やくしまるえつこの声を公園で記録した公式サンプルです。現在の放送案内ではありません。この動画には提供元の字幕がありません。',
      href: 'https://www.youtube.com/watch?v=80y5COiKdDw', exit: 'みらいレコーズ公式YouTubeで観る ↗'
    }
  });
  let selected = 'film';
  const choices = [...document.querySelectorAll('[data-scene]')];
  document.getElementById('scene-choices').hidden = false;
  host.querySelector('.v3-video-load').hidden = false;
  const initialFrame = host.querySelector('.v3-video-frame').cloneNode(true);

  function stop(message = '') {
    host.replaceChildren(initialFrame.cloneNode(true));
    const scene = scenes[selected];
    host.querySelector('.invitation-title').textContent = scene.invitation;
    host.querySelector('.invitation-meta').textContent = scene.meta;
    host.querySelector('.v3-video-load').textContent = scene.load;
    host.removeAttribute('data-video-state');
    window.V3_VIDEO_EMBED.mount(document);
    stopButton.hidden = true;
    status.textContent = message;
  }

  function select(key) {
    if (!Object.hasOwn(scenes, key) || selected === key) return;
    selected = key;
    const scene = scenes[key];
    host.setAttribute('data-video-id', scene.id);
    host.setAttribute('data-video-title', scene.title);
    // Selecting a scene only changes the local invitation; no iframe or autoplay.
    stop(scene.label + 'を選びました。プレイヤーを開いて観られます。');
    document.getElementById('scene-title').textContent = scene.label;
    document.getElementById('scene-note').textContent = scene.note;
    const official = document.getElementById('official-video');
    official.href = scene.href;
    official.textContent = scene.exit;
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.getAttribute('data-scene') === key)));
  }

  function choose(key) {
    select(key);
    if (window.location && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.set('scene', selected);
      window.history.replaceState(null, '', url);
    }
  }
  if (window.location) select(new URL(window.location.href).searchParams.get('scene'));

  choices.forEach(button => button.addEventListener('click', () => choose(button.getAttribute('data-scene'))));
  document.querySelectorAll('[data-scene-target]').forEach(link => link.addEventListener('click', () => choose(link.getAttribute('data-scene-target'))));

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
  window.addEventListener('securitypolicyviolation', event => {
    if (!host.querySelector('iframe') || event.disposition !== 'enforce') return;
    if (!['frame-src', 'child-src', 'default-src'].includes(event.effectiveDirective)) return;
    if (!/^https:\/\/www\.youtube-nocookie\.com(?:\/|$)/.test(event.blockedURI || '')) return;
    stop('このページで動画を表示できませんでした。下の公式YouTubeで観られます。');
    document.getElementById('official-video').focus({ preventScroll: true });
  });
  window.addEventListener('pagehide', () => stop());
})();
