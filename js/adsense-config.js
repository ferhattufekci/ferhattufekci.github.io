(function (root, factory) {
  'use strict';
  var config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.PortfolioAdConfig = config;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  return {
    starred: {
      // Enable only after supplying the actual In-feed unit from the account.
      enabled: false,
      unit: null,
      everyNewCards: 40,
      maxPlacements: 2,
      minCardsEachSide: 6,
      minimumWidth: 250
    }
  };
});
