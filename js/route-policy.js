(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioRoutePolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Route decisions are independent of jQuery, DOM mutation and animation state.
  function resolve(hash, routes, detailPages) {
    if (!routes.length) return null;
    var decoded;
    try {
      decoded = decodeURIComponent(hash || routes[0]);
    } catch (error) {
      return null;
    }
    var base = decoded.split('/')[0];
    if (routes.indexOf(base) === -1) return null;
    if (decoded !== base) {
      var knownDetail = (detailPages || []).some(function (href) {
        return decoded === base + '/' + href.replace(/\.html$/, '');
      });
      if (!knownDetail) return null;
    }
    return base;
  }

  return { resolve: resolve };
});
