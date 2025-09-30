import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseHTML } from 'linkedom';
import { renderDocument, renderTrustContent, toMarkdown } from '../lib/agent-documents.mjs';
import { ROOT } from '../lib/public-files.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';

const origin = 'https://ferhattufekci.github.io';
const links = [['About', '/about/'], ['Contact', '/contact/'], ['Privacy', '/privacy/'], ['Agent Guide', '/llms.txt'], ['Sitemap', '/sitemap.xml']];
const pages = JSON.parse(await readFile(join(ROOT, 'content/trust-pages.json'), 'utf8'));
const render = (slug, extra = {}) => renderDocument({ ...pages[slug], path: `/${slug}/`, currentPage: slug,
  body: renderTrustContent(pages[slug]), origin, themeBoot: '', ...extra });

test('R-TRUST-01: document navigation provides one explicit return action and marks only the current footer page', () => {
  for (const slug of Object.keys(pages)) {
    const { document } = parseHTML(render(slug));
    const nav = document.querySelector('nav');
    assert.equal(nav.querySelectorAll('a').length, 1);
    assert.equal(nav.querySelector('a').getAttribute('href'), '/');
    assert.equal(nav.querySelector('a [aria-hidden="true"]').textContent, '←');
    assert.equal(nav.querySelector('a').textContent.replace('←', '').trim(), 'Back to portfolio');
    assert.equal(nav.querySelectorAll('button.theme-toggle-btn').length, 1);
    const footer = document.querySelector('footer');
    assert.deepEqual([...footer.querySelectorAll('a, [aria-current]')].map(el =>
      [el.textContent.trim(), el.getAttribute('href') || `/${slug}/`]), links);
    const current = footer.querySelector('[aria-current="page"]');
    assert.equal(current.tagName, 'SPAN');
    assert.equal(current.textContent, links.find(([, href]) => href === `/${slug}/`)[0]);
    assert.equal(footer.querySelectorAll('[aria-current]').length, 1);
    assert.equal(footer.querySelectorAll(`a[href="/${slug}/"]`).length, 0);
    assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'), origin + `/${slug}/`);
    assert.equal(document.querySelector('meta[name="robots"][content="noindex"]'), null);
  }
});

test('R-TRUST-02: a standalone document without a current trust page keeps every footer destination navigable', () => {
  const { document } = parseHTML(render('about', { path: '/404.html', indexable: false, currentPage: null }));
  assert.equal(document.querySelectorAll('[aria-current]').length, 0);
  assert.deepEqual([...document.querySelectorAll('footer a')].map(el => [el.textContent, el.getAttribute('href')]), links);
  assert.equal(document.querySelector('meta[name="robots"]').content, 'noindex');
});

test('R-TRUST-03: navigation does not enter Markdown or alter generated public content and discovery files', async () => {
  for (const slug of Object.keys(pages)) {
    const content = `<html><body><h1>${pages[slug].title}</h1>${renderTrustContent(pages[slug])}</body></html>`;
    assert.equal(toMarkdown(render(slug), origin), toMarkdown(content, origin));
  }
  await withProjectFixture(async root => {
    const paths = ['index.md', '404.md', 'about/index.md', 'contact/index.md', 'privacy/index.md', 'sitemap.xml', 'llms.txt', '404.html'];
    const before = await Promise.all(paths.map(path => readFile(join(root, path))));
    execFileSync(process.execPath, ['scripts/build-agent-content.mjs'], { cwd: ROOT, env: { ...process.env, PORTFOLIO_ROOT: root }, stdio: 'pipe' });
    assert.deepEqual(await Promise.all(paths.map(path => readFile(join(root, path)))), before);
    for (const slug of Object.keys(pages)) {
      assert.ok(before[5].includes(Buffer.from(origin + `/${slug}/`)));
      assert.ok(before[6].includes(Buffer.from(origin + `/${slug}/`)));
    }
  });
});
