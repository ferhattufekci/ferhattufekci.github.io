import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseHTML } from 'linkedom';
import { ROOT, inventory } from '../lib/public-files.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';

const require = createRequire(import.meta.url);
const facts = JSON.parse(await readFile(join(ROOT, 'tests/fixtures/blog-sharing.json'), 'utf8'));

// Proposed public Interface at the approved pure-data seam. No production file
// or stand-in is created in Stage 2. Loading is deferred to test execution:
// missing-module errors are preparation failures, never meaningful behavior red.
const subject = () => require('../../js/blog-sharing-data.js');

for (const key of ['A', 'B', 'U']) {
  test(`R-BLOG-SHARE-02 | N01.${key} | Given a reviewed URL, when preparing share data, then its original string survives`, () => {
    const article = Object.freeze({ ...facts.articles[key] });
    assert.deepEqual(subject().prepareShareData(article), { title: article.title, url: article.url });
  });
}

for (const [index, url] of facts.invalidUrls.entries()) {
  test(`R-BLOG-SHARE-11 | N01.invalid-${index} | Given an unsafe or invalid URL, then no share payload is produced`, () => {
    assert.equal(subject().prepareShareData({ title: 'Invalid URL', url }), null);
  });
}

test('R-BLOG-SHARE-11 | N02.text | Given hostile title text, then payload preparation preserves plain text without mutating its input', () => {
  const article = Object.freeze({ ...facts.articles.A, title: facts.hostileTitle });
  assert.deepEqual(subject().prepareShareData(article), { title: facts.hostileTitle, url: facts.articles.A.url });
  assert.equal(article.title, facts.hostileTitle);
});

test('R-BLOG-SHARE-02 | N02.empty-title | Given a valid URL and no title, then only the title is empty', () => {
  assert.deepEqual(subject().prepareShareData({ url: facts.articles.B.url }), { title: '', url: facts.articles.B.url });
});

for (const [name, secure, sharePresent, canShareMode, expected] of [
  ['supported', true, true, 'true', true],
  ['canShare-absent', true, true, 'absent', true],
  ['canShare-false', true, true, 'false', false],
  ['canShare-throws', true, true, 'throw', false],
  ['share-absent', true, false, 'true', false],
  ['insecure', false, true, 'true', false]
]) {
  test(`R-BLOG-SHARE-05 | N02.${name} | Given platform capabilities, then native availability matches the approved decision table`, () => {
    const payload = { title: facts.articles.B.title, url: facts.articles.B.url };
    const environment = { isSecureContext: secure };
    if (sharePresent) environment.share = () => { throw new Error('Capability detection must not start sharing'); };
    if (canShareMode !== 'absent') environment.canShare = actual => {
      assert.deepEqual(actual, payload);
      if (canShareMode === 'throw') throw new Error('Capability unavailable');
      return canShareMode === 'true';
    };
    assert.equal(subject().canUseNativeShare(environment, payload), expected);
  });
}

test('R-BLOG-SHARE-13 | B13/G01 | Given source facts, when generating twice in an isolated project, then links/content survive without interactive sharing text or second-pass drift', async () => {
  await withProjectFixture(async root => {
    // Independent source fixture, confined to the existing disposable project.
    // This is not a production-module stub or a rewrite of repository datasets.
    await writeFile(join(root, 'data/medium-all.json'), JSON.stringify([facts.articles.B, facts.articles.A]));
    const generate = () => {
      for (const script of ['scripts/build-static-seo.js', 'scripts/build-agent-content.mjs']) {
        execFileSync(process.execPath, [script], { cwd: ROOT, env: { ...process.env, PORTFOLIO_ROOT: root }, stdio: 'pipe' });
      }
    };
    generate();
    const html = await readFile(join(root, 'index.html'), 'utf8');
    const markdown = await readFile(join(root, 'index.md'), 'utf8');
    const { document } = parseHTML(html);
    const noscript = document.querySelector('.pt-page[data-id="blog"] noscript');
    // Parse the noscript fragment independently of script-enabled DOM parsing.
    const { document: fallback } = parseHTML('<html><body>' + noscript.innerHTML + '</body></html>');
    for (const key of ['A', 'B']) {
      assert.ok([...fallback.querySelectorAll('a')].some(a => a.getAttribute('href') === facts.articles[key].url));
      assert.ok(markdown.includes(facts.articles[key].url));
    }
    const blog = markdown.slice(markdown.indexOf('## Blog'), markdown.indexOf('## Contact'));
    for (const messages of Object.values(facts.messages)) {
      for (const key of ['COPY', 'COPY_BUSY', 'COPY_MANUAL', 'NATIVE_PENDING']) assert.ok(!blog.includes(messages[key]), key + ' leaked into Markdown');
    }
    for (const label of Object.values(facts.retiredNativeLabels)) assert.ok(!blog.includes(label), 'Retired native action leaked into Markdown');
    const resume = JSON.parse(await readFile(join(ROOT, 'tests/fixtures/resume-content.json'), 'utf8'));
    assert.deepEqual([...document.querySelectorAll('.resume-summary-text p')].map(p => p.textContent.replace(/\s+/g, ' ').trim()), resume.summary);
    const firstInventory = await inventory(root);
    const first = await Promise.all(firstInventory.map(path => readFile(join(root, path))));
    generate();
    assert.deepEqual(await inventory(root), firstInventory);
    assert.deepEqual(await Promise.all(firstInventory.map(path => readFile(join(root, path)))), first);
  });
});
