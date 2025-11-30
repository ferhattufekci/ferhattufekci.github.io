import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
const require = createRequire(import.meta.url);
const card = require('../../js/error-card.js');

test('R-404-01: shared error card exposes labelled recovery links and escapes text', () => {
  const { document } = parseHTML(card.render({
    message: '<script>untrusted()</script>', homeHref: '/?q="bad"', resumeHref: '/#resume'
  }));
  assert.equal(document.querySelector('script'), null);
  assert.equal(document.querySelector('.error-card > p:not(.error-code)').textContent, '<script>untrusted()</script>');
  assert.equal(document.querySelector('.error-code').getAttribute('aria-hidden'), 'true');
  assert.equal(document.querySelector('.error-actions a').textContent, 'Back to Home');
  assert.equal(document.querySelector('.error-actions a').getAttribute('href'), '/?q="bad"');
  assert.equal(document.querySelectorAll('.error-actions a.resume-cta').length, 2);
  assert.equal(document.querySelectorAll('.error-actions a').length, 2);
});
test('R-404-02: route error view is idempotent and moves keyboard focus to its heading', async () => {
  const { document, window } = parseHTML('<html><body><main class="subpages"></main></body></html>');
  window.PortfolioErrorCard = card;
  vm.runInNewContext(await readFile(new URL('../../js/not-found-view.js', import.meta.url), 'utf8'), { window, document, CustomEvent: window.CustomEvent });
  const container = document.querySelector('main');
  const page = window.PortfolioNotFoundView.ensure(container);
  assert.equal(window.PortfolioNotFoundView.ensure(container), page);
  assert.equal(document.querySelectorAll('#route-not-found').length, 1);
  let focused = false, activated = false;
  document.getElementById('route-error-title').focus = () => { focused = true; };
  document.addEventListener('portfolio:page-activate', event => { activated = event.detail.page === page; });
  window.PortfolioNotFoundView.activate(page);
  assert.ok(page.classList.contains('pt-page-current'));
  assert.ok(focused && activated);
});
