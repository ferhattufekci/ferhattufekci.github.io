/* One owner for manual AdSense units. Provider status, not iframe presence,
   determines fill. The SDK and its consent decisions remain authoritative. */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioAdsense = api;
})(typeof window === 'object' ? window : globalThis, function (root) {
  'use strict';
  function classifyStatus(value) {
    return value === 'filled' ? 'filled' : value === 'unfilled' ? 'unfilled'
      : value === 'unfill-optimized' ? 'optimized' : 'waiting';
  }
  var doc = root.document;
  if (!doc) return { classifyStatus: classifyStatus };
  var records = new Set(), byElement = new WeakMap(), attempts = new WeakMap(), anchorFrames = new WeakMap(), sdkState = 'loading';
  var settledPage = null, pumping = false, started = false, pumpFrame = null;
  function loader(node) {
    if (!node || node.tagName !== 'SCRIPT') return false;
    try {
      var url = new URL(node.src, doc.baseURI);
      return url.origin === 'https://pagead2.googlesyndication.com' && url.pathname === '/pagead/js/adsbygoogle.js';
    } catch (_) { return false; }
  }
  // This script precedes the async SDK in the authored head, so even an SDK
  // response arriving before DOMContentLoaded cannot escape these listeners.
  doc.addEventListener('load', function (event) {
    if (!loader(event.target)) return;
    sdkState = 'ready';
    records.forEach(function (record) { if (!record.attempted) { record.failed = false; render(record); } });
    pump();
  }, true);
  doc.addEventListener('error', function (event) {
    if (!loader(event.target)) return;
    sdkState = 'failed';
    records.forEach(function (record) { if (!record.attempted) { record.failed = true; render(record); } });
  }, true);

  function holdBrowserAnchor(panel) {
    var pending = anchorFrames.get(panel);
    if (pending) root.cancelAnimationFrame(pending.frame);
    else pending = { previous: panel.style.overflowAnchor };
    // Native anchoring can choose a disappearing iframe instead of the real
    // card. Avoid double compensation during this single layout transaction.
    panel.style.overflowAnchor = 'none';
    pending.frame = root.requestAnimationFrame(function () {
      pending.frame = root.requestAnimationFrame(function () {
        panel.style.overflowAnchor = pending.previous;
        anchorFrames.delete(panel);
      });
    });
    anchorFrames.set(panel, pending);
  }
  function render(record) {
    var state = classifyStatus(record.ins && record.ins.getAttribute('data-ad-status'));
    if (record.ins && (record.ins.hasAttribute('data-adsbygoogle-status') || state !== 'waiting')) {
      record.failed = false;
      if (attempts.has(record.ins)) attempts.get(record.ins).failed = false;
      var rejected = record.wrapper.querySelector('template[data-ad-rejected]');
      if (rejected && (record.ins.hasAttribute('data-adsbygoogle-status') || state === 'filled' || state === 'optimized')) {
        record.wrapper.appendChild(record.ins); rejected.remove();
      }
    }
    if (state === 'waiting') state = record.failed ? 'unavailable' : record.attempted ? 'requested' : 'waiting';
    var anchor = null, panel = record.wrapper.closest('.page-content-panel');
    // Preserve a real content reference when our shell changes above a reader.
    // Let provider content size naturally; no reserved blank height is needed.
    if (panel && record.wrapper.dataset.adState !== state &&
        record.wrapper.getBoundingClientRect().top < panel.getBoundingClientRect().top) {
      var view = panel.getBoundingClientRect();
      anchor = Array.from(panel.querySelectorAll('.proj-card, .blog-article-card')).find(function (card) {
        var box = card.getBoundingClientRect();
        return (record.wrapper.compareDocumentPosition(card) & 4) && box.top >= view.top && box.top < view.bottom;
      });
    }
    var before = anchor && anchor.getBoundingClientRect().top;
    if (anchor) holdBrowserAnchor(panel);
    record.wrapper.dataset.adState = state;
    record.wrapper.classList.toggle('is-filled', state === 'filled');
    record.wrapper.classList.toggle('is-collapsed', state === 'unfilled' || state === 'unavailable');
    if (anchor) panel.scrollTop += anchor.getBoundingClientRect().top - before;
  }
  function available(record) {
    if (!record.wrapper.isConnected || record.attempted) return false;
    var page = record.wrapper.closest('.pt-page'), current = doc.querySelectorAll('.pt-page-current');
    if (!page || current.length !== 1 || current[0] !== page || settledPage !== page) return false;
    for (var node = record.wrapper; node && node.nodeType === 1; node = node.parentElement) {
      if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true') return false;
      var style = root.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    if (!record.near || record.wrapper.getBoundingClientRect().width < record.minimumWidth) return false;
    return !pendingContent(record);
  }
  // A unit may name the page's own loading placeholder (data-ad-await). While it
  // is displayed the content above the unit has not been rendered, so the unit's
  // position is provisional: requesting now would size the creative against a
  // layout that the first cards are about to push away.
  function pendingContent(record) {
    var selector = record.wrapper.getAttribute('data-ad-await'), page = record.wrapper.closest('.pt-page');
    var placeholder = selector && page ? page.querySelector(selector) : null;
    return !!placeholder && root.getComputedStyle(placeholder).display !== 'none';
  }
  function mount(record) {
    if (record.ins) return;
    var template = record.wrapper.querySelector('template');
    if (!template) return;
    record.wrapper.appendChild(template.content.cloneNode(true));
    template.remove();
    record.ins = record.wrapper.querySelector('ins.adsbygoogle');
    if (!record.ins) return;
    record.statusObserver = new root.MutationObserver(function () { render(record); pump(); });
    record.statusObserver.observe(record.ins, { attributes: true, attributeFilter: ['data-ad-status', 'data-adsbygoogle-status'] });
    render(record);
  }
  function cleanup(record) {
    if (record.resizeObserver) record.resizeObserver.disconnect();
    if (record.intersectionObserver) record.intersectionObserver.disconnect();
    if (record.statusObserver) record.statusObserver.disconnect();
    if (record.scrollRoot && record.onScroll) record.scrollRoot.removeEventListener('scroll', record.onScroll);
    records.delete(record);
    byElement.delete(record.wrapper);
  }
  function pump() {
    if (pumping) return;
    pumping = true;
    try {
      records.forEach(function (record) { if (!record.wrapper.isConnected) cleanup(record); });
      if (sdkState !== 'ready' || !root.adsbygoogle || typeof root.adsbygoogle.push !== 'function') return;
      records.forEach(function (record) {
        if (!available(record)) return;
        // The documented push queue has no target-element parameter. Mount
        // only the eligible unit immediately before dispatch, and let the SDK
        // claim it before making any other unprocessed unit available.
        var unclaimed = doc.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');
        if (unclaimed && unclaimed !== record.ins) return;
        mount(record);
        if (!record.ins) return;
        record.attempted = true;
        // Keep attempt identity weakly with the ins, independently of attached
        // observers. Cleanup must not make a rejected unit eligible again.
        attempts.set(record.ins, { failed: false });
        record.wrapper.dataset.adState = 'initializing';
        try { root.adsbygoogle.push({}); }
        catch (_) {
          // No blind retry: a throwing SDK may already have started this unit.
          record.failed = !record.ins.hasAttribute('data-adsbygoogle-status') && classifyStatus(record.ins.getAttribute('data-ad-status')) === 'waiting';
        }
        attempts.get(record.ins).failed = record.failed;
        if (record.failed) {
          // An unclaimed rejected ins would steal every later global push.
          // Keep that original node inert, without forging SDK attributes or
          // retrying it. Its observer can still receive late SDK acceptance.
          var rejected = doc.createElement('template');
          rejected.setAttribute('data-ad-rejected', '');
          rejected.content.appendChild(record.ins); record.wrapper.appendChild(rejected);
        }
        render(record);
      });
    } finally { pumping = false; }
  }
  function schedulePump() {
    if (pumpFrame !== null) return;
    // SDK initialization may resize or collapse the observed wrapper. Commit
    // outside ResizeObserver delivery to avoid a resize-notification loop.
    pumpFrame = root.requestAnimationFrame(function () { pumpFrame = null; pump(); });
  }
  function registerElement(wrapper) {
    if (byElement.has(wrapper)) return;
    var dynamic = wrapper.hasAttribute('data-ad-placement');
    var record = { wrapper: wrapper, ins: null, attempted: false, failed: sdkState === 'failed', near: !dynamic,
      minimumWidth: dynamic ? (root.PortfolioAdConfig && root.PortfolioAdConfig.starred.minimumWidth || 250) : 1 };
    // Register before any width/visibility/load wait can re-enter initialization.
    byElement.set(wrapper, record); records.add(record);
    var rejected = wrapper.querySelector('template[data-ad-rejected]');
    var existing = wrapper.querySelector('ins.adsbygoogle') || (rejected && rejected.content.querySelector('ins.adsbygoogle'));
    if (existing) {
      record.ins = existing;
      var previousAttempt = attempts.get(existing);
      record.attempted = !!previousAttempt || existing.hasAttribute('data-adsbygoogle-status');
      if (previousAttempt) record.failed = previousAttempt.failed;
      record.statusObserver = new root.MutationObserver(function () { render(record); pump(); });
      record.statusObserver.observe(existing, { attributes: true, attributeFilter: ['data-ad-status', 'data-adsbygoogle-status'] });
    }
    render(record);
    record.resizeObserver = new root.ResizeObserver(schedulePump);
    record.resizeObserver.observe(wrapper);
    // Hiding the placeholder changes its box, which re-evaluates this unit.
    var awaited = wrapper.getAttribute('data-ad-await'), awaitedPage = wrapper.closest('.pt-page');
    var placeholder = awaited && awaitedPage ? awaitedPage.querySelector(awaited) : null;
    if (placeholder) record.resizeObserver.observe(placeholder);
    if (dynamic) {
      record.scrollRoot = wrapper.closest('.page-content-panel');
      if (root.IntersectionObserver) {
        record.intersectionObserver = new root.IntersectionObserver(function (entries) {
          record.near = entries.some(function (entry) { return entry.isIntersecting; }); pump();
        }, { root: record.scrollRoot, rootMargin: '200px 0px', threshold: 0 });
        record.intersectionObserver.observe(wrapper);
      } else {
        record.onScroll = function () {
          var box = wrapper.getBoundingClientRect(), view = record.scrollRoot.getBoundingClientRect();
          record.near = box.top <= view.bottom + 200 && box.bottom >= view.top - 200; pump();
        };
        record.scrollRoot.addEventListener('scroll', record.onScroll, { passive: true }); record.onScroll();
      }
    }
  }
  function register(scope) {
    if (scope.matches && scope.matches('.js-adsense')) registerElement(scope);
    if (scope.querySelectorAll) scope.querySelectorAll('.js-adsense').forEach(registerElement);
    pump();
  }
  doc.addEventListener('portfolio:page-activate', function () { settledPage = null; });
  doc.addEventListener('portfolio:page-settled', function (event) { settledPage = event.detail.page; pump(); });
  function start() {
    if (started) return;
    started = true;
    var current = doc.querySelectorAll('.pt-page-current');
    if (current.length === 1 && !current[0].getAnimations().some(function (animation) { return animation.playState === 'running'; })) settledPage = current[0];
    register(doc);
    var observer = new root.MutationObserver(function (changes) {
      changes.forEach(function (change) {
        change.addedNodes.forEach(function (node) { if (node.nodeType === 1) register(node); });
      });
      pump();
    });
    observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'inert', 'aria-hidden', 'hidden'] });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  return { classifyStatus: classifyStatus, register: register };
});
