'use strict';
(function () {
  const boxes = document.querySelectorAll('[data-social-post]');
  const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  for (const box of boxes) {
    const host = box.querySelector('[data-social-frame]'), button = box.querySelector('button');
    const note = box.querySelector('[role="status"]');
    const close = () => { host.replaceChildren(); button.textContent = 'Blueskyの投稿を表示'; button.setAttribute('aria-expanded', 'false'); };
    const valid = () => { if (today() > box.dataset.reviewThrough) { close(); box.hidden = true; return false; } return true; };
    if (!valid()) continue;
    button.hidden = false;
    button.addEventListener('click', () => {
      if (!valid()) return;
      if (host.firstChild) { close(); note.textContent = ''; return; }
      const url = new URL(box.dataset.socialPost);
      if (url.origin !== 'https://embed.bsky.app' || !/^\/embed\/did%3Aplc%3A[a-z2-7]+\/app\.bsky\.feed\.post\/[a-z2-7]+$/.test(url.pathname)) return;
      const frame = document.createElement('iframe');
      frame.title = 'Blueskyの関連投稿'; frame.src = url.href; frame.referrerPolicy = 'no-referrer';
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
      frame.addEventListener('error', () => { close(); note.textContent = '投稿を表示できません。元の投稿へのリンクから確認できます。'; });
      host.append(frame); button.textContent = '投稿を閉じる'; button.setAttribute('aria-expanded', 'true');
      note.textContent = '投稿内の会話はBlueskyで読めます。表示されない場合は、下の元投稿へのリンクをお使いください。';
    });
    document.addEventListener('visibilitychange', valid);
    window.addEventListener('pagehide', close);
  }
})();
