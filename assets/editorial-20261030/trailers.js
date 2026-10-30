(() => {
  'use strict';
  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      document.body.classList.toggle('has-trailer-in-view', visible.size > 0);
    });
    document.querySelectorAll('.trailer-stage').forEach(stage => observer.observe(stage));
  }
  document.querySelectorAll('[data-trailer-video]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.trailerVideo;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
      const frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      frame.title = button.dataset.trailerTitle || '予告編';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.className = 'trailer-player';
      button.replaceWith(frame);
      frame.focus();
    }, { once: true });
  });
})();
