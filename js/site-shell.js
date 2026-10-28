/* Navigation shared by the SPA and generated 404; no routing or plugin dependency. */
(function () {
  'use strict';

  function init() {
    var skip = document.querySelector('.skip-link');
    if (skip) skip.addEventListener('click', function (event) {
      // The SPA owns route hashes. Skipping repeated navigation must keep its URL.
      event.preventDefault();
      var target = document.querySelector('.pt-page-current h1, .pt-page-current h2') || document.getElementById('main');
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
    var header = document.getElementById('site_header');
    var mobileHeader = document.querySelector('.mobile-header');
    var toggle = document.querySelector('.menu-toggle');
    if (!header || !mobileHeader || !toggle) return;
    var overlay = document.querySelector('.mobile-menu-overlay');
    // Hybrid devices can expose mouse hover while a touch leaves :hover latched.
    // Track input modality only here; pressed/cancelled state remains native CSS.
    var arrows = document.querySelector('.lmpixels-arrows-nav');
    if (arrows) ['pointerover', 'pointermove', 'pointerdown'].forEach(function (type) {
      arrows.addEventListener(type, function (event) {
        if (arrows.getAttribute('data-pointer-type') !== event.pointerType) arrows.setAttribute('data-pointer-type', event.pointerType);
      });
    });
    var closing = Promise.resolve(), closingMotion, openingMotion;

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
      if (!open && openingMotion) { openingMotion.cancel(); openingMotion = null; }
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
      // Descendant visibility transitions can still intercept taps after the drawer fades out.
      if (!open && toggle.getClientRects().length) {
        header.setAttribute('inert', '');
        header.setAttribute('aria-hidden', 'true');
      } else {
        header.removeAttribute('inert');
        header.removeAttribute('aria-hidden');
      }
      if (wasOpen && !open) {
        if (closingMotion) closingMotion.cancel();
        closingMotion = PortfolioMotionCompletion.wait([header, overlay], 'transition');
        closing = closingMotion.finished;
      }
    }

    function closeMenu() {
      setOpen(false, false);
      var pending = closing;
      return pending.then(function () {
        if (pending !== closing || document.body.classList.contains('mobile-menu-open')) return closeMenu();
      });
    }
    window.PortfolioSiteShell = { closeMenu: closeMenu };

    toggle.addEventListener('click', function (event) {
      syncHeaderHeight();
      header.classList.add('animate');
      setOpen(toggle.getAttribute('aria-expanded') !== 'true', event.detail === 0);
      // The drawer precedes its toggle in the DOM. Enter it explicitly when
      // opened by keyboard; ordinary navigation does not need a focus trap.
      if (event.detail === 0 && toggle.getAttribute('aria-expanded') === 'true') {
        // Wait for the actual drawer motion, without overriding a later action.
        var motion = openingMotion = PortfolioMotionCompletion.wait([header, overlay], 'transition');
        motion.finished.then(function () {
          if (openingMotion !== motion) return;
          openingMotion = null;
          if (toggle.getAttribute('aria-expanded') === 'true' && document.activeElement === toggle) {
            header.querySelector('.site-main-menu a').focus({ preventScroll: true });
          }
        });
      }
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
