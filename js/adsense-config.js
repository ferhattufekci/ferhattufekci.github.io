(function (root, factory) {
  'use strict';
  var config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.PortfolioAdConfig = config;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  return {
    starred: {
      enabled: true,
      unit: {
        client: 'ca-pub-1316559702402555',
        slot: '4564169804',
        format: 'fluid',
        layoutKey: '-ef+6k-30-ac+ty'
      },
      everyNewCards: 40,
      maxPlacements: 2,
      minCardsEachSide: 6,
      minimumWidth: 250
    }
  };
});
