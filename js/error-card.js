(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioErrorCard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function escapeHtml(value) {
    var entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value).replace(/[&<>"']/g, function (character) {
      return entities[character];
    });
  }

  function render(options) {
    return [
      '<div class="error-card">',
      '  <p class="error-code" aria-hidden="true">404</p>',
      '  <p>' + escapeHtml(options.message) + '</p>',
      '  <div class="error-actions">',
      '    <a class="portfolio-button portfolio-button-primary" href="' + escapeHtml(options.homeHref) + '">Back to Home</a>',
      '    <a class="portfolio-button portfolio-button-secondary" href="' + escapeHtml(options.resumeHref) + '">View Resume</a>',
      '  </div>',
      '  <p class="error-help"><a href="/llms.txt">Agent Guide</a> · <a href="/sitemap.xml">Sitemap</a></p>',
      '</div>'
    ].join('\n');
  }

  return { render: render };
});
