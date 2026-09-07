'use strict';
(() => {
  // IDs and paths copied from each rights holder's Share / Embed UI, 2026-09-07.
  const recordings = Object.freeze({
    shelter: {
      kind: 'A / 2007年2月4日、下北沢SHELTERで録音',
      artist: 'Boris with Michio Kurihara',
      note: '共作アルバム『Rainbow』の発売記念公演から。',
      title: 'Bandcamp：SHELTERライブ「夕暮れのジャイロ」',
      href: 'https://boris.bandcamp.com/track/time-to-go-2',
      embed: 'https://bandcamp.com/EmbeddedPlayer/album=1846332570/size=small/bgcol=ffffff/linkcol=0687f5/artwork=none/track=2437633909/transparent=true/'
    },
    sunset: {
      kind: 'B / ソロ盤『SUNSET NOTES』の収録曲',
      artist: '栗原ミチオ / Michio Kurihara',
      note: 'ライブ盤にも収められた同じ曲を、ソロ盤の演奏で。',
      title: 'Bandcamp：SUNSET NOTES「夕暮れのジャイロ」',
      href: 'https://pedalrecords.bandcamp.com/track/time-to-go',
      embed: 'https://bandcamp.com/EmbeddedPlayer/album=3603176382/size=small/bgcol=ffffff/linkcol=0687f5/artwork=none/track=1718126851/transparent=true/'
    }
  });
  const byId = (id) => document.getElementById(id);
  const player = byId('player');
  const consent = byId('consent');
  const loadButton = byId('load-player');
  const closeButton = byId('close-player');
  const status = byId('player-status');
  const choices = [...document.querySelectorAll('[data-recording]')];
  let selected = 'shelter';

  function stop(message = '') {
    // Destroying the iframe ends its playback/network activity. No cross-origin API.
    player.replaceChildren();
    consent.hidden = false;
    closeButton.hidden = true;
    status.textContent = message;
  }

  choices.forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.recording;
    if (!Object.hasOwn(recordings, key) || selected === key) return;
    stop('演奏を選びました。プレイヤーを開くと、その演奏を聴けます。');
    selected = key;
    const recording = recordings[selected];
    byId('recording-kind').textContent = recording.kind;
    byId('artist').textContent = recording.artist;
    byId('recording-note').textContent = recording.note;
    byId('official-track').href = recording.href;
    choices.forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
  }));

  loadButton.addEventListener('click', () => {
    if (player.childElementCount) return;
    const recording = recordings[selected];
    const frame = document.createElement('iframe');
    frame.title = recording.title;
    frame.referrerPolicy = 'no-referrer';
    frame.src = recording.embed;
    // No autoplay grant, preload, background player, storage or analytics.
    player.replaceChildren(frame);
    consent.hidden = true;
    closeButton.hidden = false;
    status.textContent = '▶ で再生。曲のあとにアルバムの再生が続く場合は、上の「閉じて停止」で終えられます。';
    // Keep keyboard focus usable when the load button is hidden.
    closeButton.focus({ preventScroll: true });
  });
  closeButton.addEventListener('click', () => {
    stop('プレイヤーを閉じました。');
    loadButton.focus({ preventScroll: true });
  });
  window.addEventListener('pagehide', () => stop());
})();


