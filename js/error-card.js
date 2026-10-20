(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioErrorCard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var content = Object.freeze({
    title: '404 — Page Not Found',
    message: 'The page you are looking for does not exist or may have moved.',
    homeSection: 'about-me',
    resumeSection: 'resume'
  });

  function links(staticPage) {
    return {
      homeHref: staticPage ? '/' : '#' + content.homeSection,
      resumeHref: (staticPage ? '/' : '') + '#' + content.resumeSection
    };
  }

  function escapeHtml(value) {
    var entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value).replace(/[&<>"']/g, function (character) {
      return entities[character];
    });
  }

  function render(options) {
    options = Object.assign({ message: content.message }, links(false), options);
    return [
      '<div class="error-card">',
      '  <p class="error-code" aria-hidden="true">404</p>',
      '  <p>' + escapeHtml(options.message) + '</p>',
      '  <div class="error-actions">',
      '    <a class="resume-cta" href="' + escapeHtml(options.homeHref) + '">Back to Home</a>',
      '    <a class="resume-cta" href="' + escapeHtml(options.resumeHref) + '">View Resume</a>',
      '  </div>',
      '  <p class="error-help"><a href="/llms.txt">Agent Guide</a> · <a href="/sitemap.xml">Sitemap</a></p>',
      '</div>'
    ].join('\n');
  }

  function renderView(staticPage) {
    return [
      '<section id="route-not-found" class="pt-page route-error' + (staticPage ? ' pt-page-current' : '') + '" data-id="not-found" aria-labelledby="route-error-title">',
      '  <div class="section-inner custom-page-content">',
      '    <div class="section-title-block second-style">',
      '      <h2 id="route-error-title" class="section-title" tabindex="-1">' + content.title + '</h2>',
      '    </div>',
      '    <div class="section-content">',
      render(links(staticPage)),
      '    </div>',
      '  </div>',
      '</section>'
    ].join('\n');
  }

  return { content: content, links: links, render: render, renderView: renderView };
});
