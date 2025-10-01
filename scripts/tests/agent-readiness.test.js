import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseHTML } from 'linkedom';
import { ROOT } from '../lib/public-files.mjs';
import { createPagesServer, listen, close } from '../lib/pages-preview.mjs';
import { verify } from '../verify-agent-endpoints.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';

let server, origin;
before(async () => { server = createPagesServer(); origin = await listen(server); });
after(async () => { await close(server); });

test('all intended public files, raw HTML, trust pages, 404 and machine-readable files pass', async () => {
  const report = await verify(origin, { allFiles: true });
  assert.equal(report.failed, 0, JSON.stringify(report.checks.filter(check => !check.pass), null, 2));
  assert.equal(report.limitations.length, 3);
  assert.ok(report.limitations.every(item => !item.supported));
});

test('GitHub Pages deployment retains .nojekyll and contains no fictitious MCP endpoint', async () => {
  await readFile(join(ROOT, '.nojekyll'));
  await assert.rejects(readFile(join(ROOT, '.well-known/mcp')));
  const guide = await readFile(join(ROOT, 'agent-instructions.md'), 'utf8');
  for (const phrase of ['When to use this', 'Java/Spring', 'requirements', '/data/github-repos.json', '/data/medium-all.json', 'does not provide an MCP server']) assert.ok(guide.includes(phrase));
});

test('homepage has sequential headings, a Markdown alternate and contact without JavaScript', async () => {
  const { document } = parseHTML(await readFile(join(ROOT, 'index.html'), 'utf8'));
  assert.equal(document.querySelectorAll('h5.section-description').length, 0);
  assert.equal(document.querySelector('link[type="text/markdown"]').getAttribute('href'), '/index.md');
  assert.equal(document.querySelector('link[rel="describedby"]').getAttribute('href'), '/llms.txt');
  assert.match(document.querySelector('#h-p').textContent, /507/);
  assert.match(document.querySelector('#h-m').textContent, /outlook/);
});

test('Certifications places the Illinois course immediately after STG using the existing timeline and link semantics', async () => {
  const { document } = parseHTML(await readFile(join(ROOT, 'index.html'), 'utf8'));
  const section = [...document.querySelectorAll('.resume-section')].find(node => node.querySelector('.resume-section-title')?.textContent === 'Certifications');
  const stg = [...section.querySelectorAll('.timeline-item')].find(node => node.querySelector('.item-period').textContent === 'STG Mühendislik');
  const course = stg.nextElementSibling;
  assert.equal(course.className, stg.className);
  assert.equal(course.querySelector('.item-period').textContent, 'University of Illinois Urbana-Champaign');
  const link = course.querySelector('.item-title a');
  assert.equal(link.childNodes[0].textContent.trim(), 'Object-Oriented Data Structures in C++');
  assert.equal(link.getAttribute('href'), 'https://www.coursera.org/account/accomplishments/verify/F2T8N49M4JQ7');
  for (const name of ['class', 'target', 'rel']) assert.equal(link.getAttribute(name), stg.querySelector('a').getAttribute(name));
  assert.equal(link.querySelector('.resume-cert-external-icon').getAttribute('aria-hidden'), 'true');
});

test('agent Markdown contains resume, evidence links and contact with no script or UI skeletons', async () => {
  const body = await readFile(join(ROOT, 'index.md'), 'utf8');
  for (const phrase of ['# Ferhat Tüfekçi', '## Resume', '### Experience', '## Projects', '## Blog', '## Contact', 'mailto:ferhattufekci@outlook.com.tr', 'https://github.com/ferhattufekci/SurveyApp', '/privacy/']) assert.ok(body.includes(phrase), phrase);
  assert.doesNotMatch(body, /<script|<style|Loading articles|Show more|data-lang-filter/);
});

test('privacy notice reflects actual providers and storage keys', async () => {
  const notice = await readFile(join(ROOT, 'privacy/index.md'), 'utf8');
  const html = await readFile(join(ROOT, 'index.html'), 'utf8');
  for (const term of ['Google Analytics', 'Google AdSense', 'Calendly', 'GitHub Pages', 'ft-theme', 'calendlyPermanentlyClosed']) assert.ok(notice.includes(term), term);
  for (const id of ['G-Z00CDE35NT', 'ca-pub-1316559702402555']) { assert.ok(html.includes(id)); assert.ok(notice.includes(id)); }
});

test('custom error has absolute assets, recovery links, a noindex directive and Markdown companion', async () => {
  const { document } = parseHTML(await readFile(join(ROOT, '404.html'), 'utf8'));
  assert.equal(document.querySelector('meta[name="robots"]').getAttribute('content'), 'noindex');
  for (const node of document.querySelectorAll('link[href],a[href]')) {
    // The shared shell includes external social profiles; local targets stay root-absolute.
    assert.match(node.getAttribute('href'), /^(?:\/|https:\/\/)/);
  }
  assert.match(await readFile(join(ROOT, '404.md'), 'utf8'), /\[agent guide\]\(\/llms\.txt\)/);
  const response = await fetch(origin + '/deep/missing/path', { headers: { Accept: 'text/markdown' } });
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /^text\/html/);
});

test('Markdown generator and synchronized content are deterministic', async () => {
  await withProjectFixture(async root => {
    const paths = ['index.md', '404.html', '404.md', 'sitemap.xml', 'about/index.html', 'about/index.md', 'contact/index.html', 'contact/index.md', 'privacy/index.html', 'privacy/index.md', 'llms.txt', 'index.html'];
    const options = { cwd: ROOT, env: { ...process.env, PORTFOLIO_ROOT: root } };
    function generate() {
      execFileSync(process.execPath, ['scripts/build-static-seo.js'], options);
      execFileSync(process.execPath, ['scripts/build-agent-content.mjs'], options);
    }
    generate();
    const before = await Promise.all(paths.map(path => readFile(join(root, path), 'utf8')));
    generate();
    const after = await Promise.all(paths.map(path => readFile(join(root, path), 'utf8')));
    assert.deepEqual(after, before);
  });
});

test('sync workflows regenerate and commit Markdown together with source data', async () => {
  for (const file of ['fetch-medium.yml', 'fetch-github.yml']) {
    const workflow = await readFile(join(ROOT, '.github/workflows', file), 'utf8');
    assert.match(workflow, /run: npm ci/);
    assert.match(workflow, /run: npm run generate/);
    assert.match(workflow, /git add [^\n]*index\.md[^\n]*llms\.txt[^\n]*sitemap\.xml/);
  }
});
