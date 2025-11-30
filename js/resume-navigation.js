(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.ResumeNavigation = root.ResumeNavigation || factory();
    // The script is at the end of body. Bind before the router's DOM-ready
    // activation so even the first animated visit can queue a jump correctly.
    if (!root.document.getElementById('resume') && root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function () { root.ResumeNavigation.init(root.document, root); }, { once: true });
    } else root.ResumeNavigation.init(root.document, root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var instances = new WeakMap();

  function init(doc, win) {
    if (instances.has(doc)) return instances.get(doc);
    var page = doc.getElementById('resume');
    var nav = page && page.querySelector('.resume-navigation');
    if (!nav) return null;
    var bar = nav.querySelector('.category-filter-bar');
    var scroller = win.PortfolioContentPanels.get(page);
    var buttons = Array.from(nav.querySelectorAll('[data-resume-target]'));
    var transitioning = false, pending = null;

    function available() {
      return page.classList.contains('pt-page-current') && !page.hasAttribute('inert');
    }

    function select(button) {
      buttons.forEach(function (item) {
        if (item === button) item.setAttribute('aria-current', 'location');
        else item.removeAttribute('aria-current');
      });
    }

    function reveal(button) {
      // Only move the horizontal bar; scrollIntoView would also scroll the page.
      var item = button.getBoundingClientRect(), bounds = bar.getBoundingClientRect();
      if (item.left < bounds.left + 3) bar.scrollLeft += item.left - bounds.left - 3;
      else if (item.right > bounds.right - 3) bar.scrollLeft += item.right - bounds.right + 3;
    }

    function navigate(request) {
      if (!available()) return;
      var id = request.button.getAttribute('data-resume-target');
      var target = id === 'all' ? page.querySelector('.section-title') : doc.getElementById(id);
      if (!target || !page.contains(target)) return;
      // The content panel owns scrolling; the title and controls occupy a separate grid row.
      // Measure on every request, including after native details have changed height.
      var padding = parseFloat(win.getComputedStyle(scroller).paddingTop) || 0;
      var top = id === 'all' ? 0 : scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - padding;
      if (request.keyboard) {
        var focus = target.matches('h2, h3') ? target : target.querySelector('h3') || target;
        focus.setAttribute('tabindex', '-1');
        focus.focus({ preventScroll: true });
      }
      var behavior = win.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
      // Cancel any previous smooth destination before honoring the latest request.
      scroller.scrollTo({ top: scroller.scrollTop, behavior: 'instant' });
      scroller.scrollTo({ top: Math.max(0, top), behavior: behavior });
      if (id === 'all') bar.scrollLeft = 0;
    }

    function click(event) {
      var button = event.target.closest('[data-resume-target]');
      if (!button || !nav.contains(button) || !available()) return;
      select(button);
      reveal(button);
      var request = { button: button, keyboard: event.detail === 0 };
      if (transitioning) pending = request;
      else navigate(request);
    }

    function focus(event) {
      var button = event.target.closest('[data-resume-target]');
      if (button && nav.contains(button)) reveal(button);
    }

    function reset() {
      pending = null;
      select(buttons[0]);
      bar.scrollLeft = 0;
      scroller.scrollTo({ top: 0, behavior: 'instant' });
    }

    function activate(event) {
      if (event.detail.page !== page) return;
      transitioning = true;
      reset();
    }

    function settled(event) {
      if (event.detail.page !== page) return;
      transitioning = false;
      if (pending) { var request = pending; pending = null; navigate(request); }
    }

    function destroy() {
      nav.removeEventListener('click', click);
      nav.removeEventListener('focusin', focus);
      doc.removeEventListener('portfolio:page-activate', activate);
      doc.removeEventListener('portfolio:page-settled', settled);
      win.removeEventListener('pagehide', pageHide);
      instances.delete(doc);
    }
    function pageHide(event) { if (!event.persisted) destroy(); }
    nav.addEventListener('click', click);
    nav.addEventListener('focusin', focus);
    doc.addEventListener('portfolio:page-activate', activate);
    doc.addEventListener('portfolio:page-settled', settled);
    win.addEventListener('pagehide', pageHide);
    if (available()) reset();
    var controller = { destroy: destroy };
    instances.set(doc, controller);
    return controller;
  }
  return { init: init };
});
