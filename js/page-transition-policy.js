(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortfolioPageTransitionPolicy = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function select(options) {
    if (options.reducedMotion) return 0;
    if (!options.mobile) return null;
    return options.toIndex < options.fromIndex ? 2 : 1;
  }
  return { select: select };
});
