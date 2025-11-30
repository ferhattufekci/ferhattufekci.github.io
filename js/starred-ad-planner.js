(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioStarredAdPlanner = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  // A document reservation is spent independently of the provider's outcome.
  function planBatch(previous, keys, options) {
    var seen = new Set(previous.seenKeys), fresh = [];
    keys.forEach(function (key) { if (!seen.has(key)) { seen.add(key); fresh.push(key); } });
    var state = { seenKeys: Array.from(seen), newCards: previous.newCards + (options.initial ? 0 : fresh.length),
      reservedKeys: previous.reservedKeys.slice() };
    var placements = [];
    if (!options.initial && fresh.length >= options.minCardsEachSide * 2 &&
        state.reservedKeys.length < options.maxPlacements &&
        Math.floor(state.newCards / options.everyNewCards) > state.reservedKeys.length) {
      var key = 'starred-ad-' + (state.reservedKeys.length + 1);
      state.reservedKeys.push(key);
      placements.push({ key: key, afterIndex: Math.floor(fresh.length / 2) });
    }
    return { state: state, placements: placements };
  }
  return { planBatch: planBatch };
});
