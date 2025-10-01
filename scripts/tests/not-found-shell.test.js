import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { parseHTML } from 'linkedom';
import { ROOT } from '../lib/public-files.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';
const require = createRequire(import.meta.url);
const card = require('../../js/error-card.js');

test('R-SHELL-01: static 404 keeps the portfolio shell and absolute nested-path navigation without the SPA runtime', async () => {
  const { document: source } = parseHTML(await readFile(join(ROOT, 'index.html'), 'utf8'));
  const { document: output } = parseHTML(await readFile(join(ROOT, '404.html'), 'utf8'));
  for (const selector of ['#site_header', '.mobile-header', '.mobile-menu-overlay', '.lmpixels-arrows-nav']) assert.ok(output.querySelector(selector), selector);
  assert.equal(output.querySelectorAll('h1').length, 1);
  assert.equal(output.querySelectorAll('main').length, 1);
  assert.equal(output.querySelector('meta[name="robots"]').content, 'noindex');
  assert.equal(output.querySelector('meta[http-equiv="refresh"]'), null);
  assert.equal(output.querySelector('link[rel="canonical"]'), null);
  const menu = document => [...document.querySelectorAll('.site-main-menu a')].map(link => [link.textContent.trim(), new URL(link.getAttribute('href'), 'https://ferhattufekci.github.io/').href]);
  assert.deepEqual(menu(output), menu(source));
  for (const node of output.querySelectorAll('[src], link[href], .pt-trigger[href]')) assert.match(node.getAttribute('src') || node.getAttribute('href'), /^\//);
  assert.deepEqual([...output.querySelectorAll('script[src]')].map(node => node.getAttribute('src')), ['/js/theme.js', '/js/motion-completion.js', '/js/site-shell.js']);
  assert.equal(output.querySelector('#calendlyContainer'), null);
  assert.equal(output.querySelector('#site_header script'), null);
});

test('R-SHELL-02: generated HTML and Markdown share the same error copy and recovery meaning', async () => {
  const { document } = parseHTML(await readFile(join(ROOT, '404.html'), 'utf8'));
  assert.equal(document.querySelector('#route-error-title').textContent, card.content.title);
  assert.equal(document.querySelector('.error-card > p:not(.error-code)').textContent, card.content.message);
  assert.deepEqual([...document.querySelectorAll('.error-actions a')].map(link => link.getAttribute('href')), Object.values(card.links(true)));
  const markdown = await readFile(join(ROOT, '404.md'), 'utf8');
  assert.ok(markdown.includes(card.content.message));
  assert.ok(markdown.includes(card.content.title));
});

test('R-SHELL-03: changing the source shell is reflected in the next generated 404', async () => {
  await withProjectFixture(async root => {
    const source = await readFile(join(root, 'index.html'), 'utf8');
    await writeFile(join(root, 'index.html'), source.replace('Software Crafter</div>', 'Shared shell regression probe</div>'));
    execFileSync(process.execPath, ['scripts/build-agent-content.mjs'], { cwd: ROOT, env: { ...process.env, PORTFOLIO_ROOT: root }, stdio: 'pipe' });
    const { document } = parseHTML(await readFile(join(root, '404.html'), 'utf8'));
    assert.equal(document.querySelector('#site_header .site-subtitle').textContent, 'Shared shell regression probe');
  });
});
