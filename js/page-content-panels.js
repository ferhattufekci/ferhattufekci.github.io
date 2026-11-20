(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.PortfolioContentPanels = root.PortfolioContentPanels || factory();
    root.PortfolioContentPanels.init(root.document, root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var instances = new WeakMap();
  function get(page) { return page.querySelector('.page-content-panel') || page; }
  function reset(page) {
    if (!page || !page.classList.contains('pt-page-current') || page.hasAttribute('inert')) return;
    get(page).scrollTo({ top: 0, behavior: 'instant' });
  }
  function init(doc, win) {
    if (instances.has(doc)) return instances.get(doc);
    // Even inactive pages participate in layout. Observe intrinsic row contents,
    // not their grid tracks, so the shared minimum can shrink again after reflow.
    function matchRow(selector, property) {
      if (!win.ResizeObserver) return null;
      var sizes = new Map();
      var observer = new win.ResizeObserver(function (entries) {
        entries.forEach(function (entry) {
          sizes.set(entry.target, entry.borderBoxSize[0].blockSize);
        });
        doc.documentElement.style.setProperty(property, Math.max(...sizes.values()) + 'px');
      });
      doc.querySelectorAll(selector).forEach(function (row) {
        observer.observe(row, { box: 'border-box' });
      });
      return observer;
    }
    var descriptions = matchRow('.page-controls-panel .section-description', '--panel-description-size');
    var navRows = matchRow('.page-controls-panel .category-filter-scroll', '--panel-nav-row-size');
    function keydown(event) {
      var panel = event.target;
      // Scope keyboard paging to the region itself. A native PageUp animation
      // can otherwise continue after End and undo the requested destination.
      if (!panel.classList.contains('page-content-panel') || !['Home', 'End', 'PageUp', 'PageDown'].includes(event.key) ||
          event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || panel.closest('[inert]')) return;
      event.preventDefault();
      var top = event.key === 'Home' ? 0 : event.key === 'End' ? panel.scrollHeight :
        panel.scrollTop + panel.clientHeight * 0.9 * (event.key === 'PageUp' ? -1 : 1);
      panel.scrollTo({ top: panel.scrollTop, behavior: 'instant' });
      panel.scrollTo({ top: top,
        behavior: win.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    function destroy() {
      if (descriptions) descriptions.disconnect();
      if (navRows) navRows.disconnect();
      doc.removeEventListener('keydown', keydown);
      win.removeEventListener('pagehide', pageHide);
      instances.delete(doc);
    }
    function pageHide(event) { if (!event.persisted) destroy(); }
    doc.addEventListener('keydown', keydown);
    win.addEventListener('pagehide', pageHide);
    var controller = { destroy: destroy };
    instances.set(doc, controller);
    return controller;
  }
  return { get: get, reset: reset, init: init };
});
