(function (root) {
  'use strict';

  function ensure(container) {
    var page = document.getElementById('route-not-found');
    if (page) return page;

    page = document.createElement('section');
    page.id = 'route-not-found';
    page.className = 'pt-page route-error';
    page.setAttribute('data-id', 'not-found');
    page.setAttribute('aria-labelledby', 'route-error-title');
    page.innerHTML = [
      '<div class="section-inner custom-page-content">',
      '  <div class="section-title-block second-style">',
      '    <h2 id="route-error-title" class="section-title" tabindex="-1">404 — Page Not Found</h2>',
      '  </div>',
      '  <div class="section-content">',
      root.PortfolioErrorCard.render({
        message: 'This section does not exist. Check the address or use the links below to continue.',
        homeHref: '#about-me',
        resumeHref: '#resume'
      }),
      '  </div>',
      '</div>'
    ].join('\n');
    container.appendChild(page);
    return page;
  }

  function activate(page) {
    page.classList.add('pt-page-current');
    page.scrollTop = 0;
    document.dispatchEvent(new CustomEvent('portfolio:page-activate', { detail: { page: page } }));
    document.getElementById('route-error-title').focus({ preventScroll: true });
  }

  root.PortfolioNotFoundView = { ensure: ensure, activate: activate };
})(window);
