(function (root) {
  'use strict';
  var state = { seenKeys: [], newCards: 0, reservedKeys: [] };
  var currentGroup = null;
  function verified(config) {
    var unit = config && config.unit;
    return config && config.enabled === true && unit &&
      /^ca-pub-\d{16}$/.test(unit.client) && /^\d+$/.test(unit.slot) &&
      unit.format === 'fluid' && typeof unit.layoutKey === 'string' && unit.layoutKey.length > 0;
  }
  function placement(key, unit) {
    var wrapper = document.createElement('aside');
    wrapper.className = 'ads-resume-post-advertising js-adsense';
    wrapper.dataset.adPlacement = key;
    var label = document.createElement('span');
    label.className = 'ad-label'; label.id = key + '-label'; label.textContent = 'Advertisements';
    wrapper.setAttribute('aria-labelledby', label.id); wrapper.appendChild(label);
    var template = document.createElement('template'), ins = document.createElement('ins');
    ins.className = 'adsbygoogle'; ins.style.display = 'block';
    ins.dataset.adClient = unit.client; ins.dataset.adSlot = unit.slot;
    ins.dataset.adFormat = unit.format; ins.dataset.adLayoutKey = unit.layoutKey;
    template.content.appendChild(ins); wrapper.appendChild(template);
    return wrapper;
  }
  function append(grid, cards, keys, initial) {
    var config = root.PortfolioAdConfig && root.PortfolioAdConfig.starred;
    var result = verified(config) ? root.PortfolioStarredAdPlanner.planBatch(state, keys,
      Object.assign({}, config, { initial: initial })) : null;
    if (result) state = result.state;
    function group() {
      if (!currentGroup || !grid.contains(currentGroup)) {
        currentGroup = document.createElement('div');
        currentGroup.className = 'starred-card-group'; grid.appendChild(currentGroup);
      }
      return currentGroup;
    }
    cards.forEach(function (card, index) {
      (result ? group() : grid).appendChild(card);
      if (result) result.placements.forEach(function (item) {
        if (item.afterIndex === index + 1) {
          grid.appendChild(placement(item.key, config.unit)); currentGroup = null;
        }
      });
    });
    // Every static and dynamic unit has the same lifecycle owner.
    if (root.PortfolioAdsense) root.PortfolioAdsense.register(grid);
  }
  root.PortfolioStarredAds = { append: append };
})(window);
