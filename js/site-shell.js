/* Navigation shared by the SPA and generated 404; no routing or plugin dependency. */
(function () {
  'use strict';

  function init() {
    var header = document.getElementById('site_header');
    var mobileHeader = document.querySelector('.mobile-header');
    var toggle = document.querySelector('.menu-toggle');
    if (!header || !mobileHeader || !toggle) return;

    function syncHeaderHeight() {
      var height = mobileHeader.getBoundingClientRect().height;
      var style = document.documentElement.style;
      if (height > 0) {
        if (style.getPropertyValue('--mobile-header-height') !== height + 'px') {
          style.setProperty('--mobile-header-height', height + 'px');
        }
      } else style.removeProperty('--mobile-header-height');
    }

    function setOpen(open, restoreFocus) {
      var wasOpen = document.body.classList.contains('mobile-menu-open');
      document.body.classList.toggle('mobile-menu-open', open);
      header.classList.toggle('mobile-menu-hide', !open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      var icon = toggle.querySelector('i');
      icon.classList.toggle('fa-bars', !open);
      icon.classList.toggle('fa-times', open);
      if (wasOpen && !open && restoreFocus && toggle.getClientRects().length) {
        toggle.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener('click', function (event) {
      syncHeaderHeight();
      header.classList.add('animate');
      setOpen(toggle.getAttribute('aria-expanded') !== 'true', event.detail === 0);
    });
    document.addEventListener('click', function (event) {
      var navigation = event.target.closest('.pt-trigger');
      var outside = document.body.classList.contains('mobile-menu-open') && !event.target.closest('#site_header, .menu-toggle');
      if (navigation || outside) setOpen(false, event.detail === 0);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && document.body.classList.contains('mobile-menu-open')) {
        event.preventDefault();
        setOpen(false, true);
      }
    });
    window.addEventListener('resize', function () {
      syncHeaderHeight();
      setOpen(false, false);
      if (window.innerWidth >= 992) header.classList.remove('animate');
    });
    if (window.ResizeObserver) new ResizeObserver(syncHeaderHeight).observe(mobileHeader);
    if (document.fonts) document.fonts.ready.then(syncHeaderHeight);
    syncHeaderHeight();
    setOpen(false, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
