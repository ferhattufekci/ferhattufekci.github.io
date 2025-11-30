(function (root) {
  'use strict';

  function ensure(container) {
    var page = document.getElementById('route-not-found');
    if (page) return page;

    container.insertAdjacentHTML('beforeend', root.PortfolioErrorCard.renderView(false));
    return container.querySelector('#route-not-found');
  }

  function activate(page) {
    page.classList.add('pt-page-current');
    page.scrollTop = 0;
    document.dispatchEvent(new CustomEvent('portfolio:page-activate', { detail: { page: page } }));
    document.getElementById('route-error-title').focus({ preventScroll: true });
  }

  root.PortfolioNotFoundView = { ensure: ensure, activate: activate };
})(window);
