(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.CategoryFilterHints = factory();
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function () { root.CategoryFilterHints.init(root.document, root); }, { once: true });
    } else root.CategoryFilterHints.init(root.document, root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var instances = new WeakMap();
  var SCROLL_TOLERANCE = 2;

  function init(doc, win) {
    if (instances.has(doc)) return instances.get(doc);
    var entries = Array.from(doc.querySelectorAll('.category-filter-bar')).map(function (list) {
      return { list: list, hint: list.closest('.category-filter-scroll'), page: list.closest('.pt-page') };
    }).filter(function (entry) { return entry.hint && entry.page; });
    var frame = null, destroyed = false;

    function update() {
      frame = null;
      entries.forEach(function (entry) {
        var list = entry.list;
        if (!entry.page.classList.contains('pt-page-current') || !list.clientWidth) return;
        var overflow = list.scrollWidth > list.clientWidth + SCROLL_TOLERANCE;
        var atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - SCROLL_TOLERANCE;
        entry.hint.classList.toggle('has-overflow', overflow);
        entry.hint.classList.toggle('at-end', !overflow || atEnd);
      });
    }

    function schedule() {
      if (!destroyed && frame === null) frame = win.requestAnimationFrame(update);
    }

    function activate(event) {
      entries.forEach(function (entry) {
        if (event && entry.page !== event.detail.page) return;
        if (!entry.page.classList.contains('pt-page-current')) return;
        var defaultButton = entry.list.querySelector('[data-filter-default]');
        if (defaultButton && defaultButton.getAttribute('aria-pressed') === 'true') entry.list.scrollLeft = 0;
      });
      schedule();
    }

    var observer = win.ResizeObserver ? new win.ResizeObserver(schedule) : null;
    entries.forEach(function (entry) {
      entry.list.addEventListener('scroll', schedule, { passive: true });
      if (observer) observer.observe(entry.list);
    });
    win.addEventListener('resize', schedule);
    doc.addEventListener('portfolio:page-activate', activate);
    doc.addEventListener('portfolio:page-settled', schedule);
    if (doc.fonts) {
      doc.fonts.ready.then(schedule);
      doc.fonts.addEventListener('loadingdone', schedule);
    }

    function destroy() {
      destroyed = true;
      if (frame !== null) win.cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      entries.forEach(function (entry) { entry.list.removeEventListener('scroll', schedule); });
      win.removeEventListener('resize', schedule);
      win.removeEventListener('pagehide', pageHide);
      doc.removeEventListener('portfolio:page-activate', activate);
      doc.removeEventListener('portfolio:page-settled', schedule);
      if (doc.fonts) doc.fonts.removeEventListener('loadingdone', schedule);
      instances.delete(doc);
    }

    function pageHide(event) { if (!event.persisted) destroy(); }
    win.addEventListener('pagehide', pageHide);
    var controller = { destroy: destroy };
    instances.set(doc, controller);
    activate();
    return controller;
  }
  return { init: init };
});
