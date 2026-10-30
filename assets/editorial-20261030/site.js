
(() => {
  const header = document.getElementById('site-header');
  const headerTrigger = document.getElementById('header-menu-trigger');
  const floatingTrigger = document.getElementById('floating-menu-trigger');
  const dialog = document.getElementById('site-menu');
  const closeButton = document.getElementById('menu-close');
  const triggers = [headerTrigger, floatingTrigger];
  let opener = headerTrigger;
  let locked = false;
  let savedScroll = 0;
  let savedBodyStyle = null;
  let savedRootScrollBehavior = '';
  const headerVisible = () => header.getBoundingClientRect().bottom > 0;
  const syncFloating = () => {
    if (!locked) floatingTrigger.hidden = headerVisible();
  };
  const observer = new IntersectionObserver(([entry]) => {
    if (!locked) floatingTrigger.hidden = entry.isIntersecting || entry.boundingClientRect.bottom > 0;
  }, {threshold: 0});
  observer.observe(header);
  syncFloating();
  function unlock() {
    if (!locked) return;
    locked = false;
    if (savedBodyStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', savedBodyStyle);
    // Avoid a smooth-scroll jump when releasing the fixed page.
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, savedScroll);
    document.documentElement.style.scrollBehavior = savedRootScrollBehavior;
    triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
    syncFloating();
    const rect = opener.getBoundingClientRect();
    const visible = !opener.hidden && rect.bottom > 0 && rect.top < innerHeight;
    (visible ? opener : (headerVisible() ? headerTrigger : floatingTrigger)).focus({preventScroll:true});
  }
  function closeMenu() {
    if (dialog.open) dialog.close();
    unlock();
  }
  function openMenu(event) {
    if (dialog.open) return;
    opener = event.currentTarget;
    savedScroll = window.scrollY;
    savedBodyStyle = document.body.getAttribute('style');
    savedRootScrollBehavior = document.documentElement.style.scrollBehavior;
    locked = true;
    Object.assign(document.body.style, {position:'fixed', top:`-${savedScroll}px`, width:'100%', overflow:'hidden'});
    triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'true'));
    dialog.showModal();
    closeButton.focus({preventScroll:true});
  }
  triggers.forEach(trigger => trigger.addEventListener('click', openMenu));
  closeButton.addEventListener('click', closeMenu);
  dialog.addEventListener('click', event => {if (event.target === dialog) closeMenu();});
  dialog.addEventListener('cancel', event => {event.preventDefault();closeMenu();});
  dialog.addEventListener('close', unlock);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !dialog.open) return;
    const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden && element.getClientRects().length > 0);
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  });
  // Close before ordinary navigation so Back restores the reading page, not a modal.
  dialog.querySelectorAll('a[href]:not([href^="#"])').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) closeMenu(); });
  dialog.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      closeMenu();
      if (!target) return;
      if (target.tagName === 'DETAILS') target.open = true;
      requestAnimationFrame(() => {
        if (location.hash !== link.hash) location.hash = link.hash;
        target.scrollIntoView({block:'start',behavior:'instant'});
        target.focus({preventScroll:true});
      });
    });
  });
})();
