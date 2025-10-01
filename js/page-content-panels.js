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
