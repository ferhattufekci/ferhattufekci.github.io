import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseHTML } from 'linkedom';
import { ROOT } from '../lib/public-files.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';

test('R-ASSET-01: generation changes a cached stylesheet URL when its bytes change, preserves other assets and is idempotent', async () => {
  await withProjectFixture(async root => {
    const options = { cwd: ROOT, env: { ...process.env, PORTFOLIO_ROOT: root }, stdio: 'pipe' };
    const generate = () => execFileSync(process.execPath, ['scripts/build-agent-content.mjs'], options);
    const links = html => {
      const { document } = parseHTML(html);
      return [...document.querySelectorAll('link[rel="stylesheet"],script[src]')].map(node => node.getAttribute('href') || node.getAttribute('src'));
    };
    await writeFile(join(root, 'css/blog-cards.css'), 'abc');
    generate();
    const first = await readFile(join(root, 'index.html'), 'utf8'), before = links(first);
    // Standard SHA-256 test vector, independent of the generator.
    assert.ok(before.includes('css/blog-cards.css?v=ba7816bf8f01cfea'));
    generate();
    assert.equal(await readFile(join(root, 'index.html'), 'utf8'), first);
    await writeFile(join(root, 'css/blog-cards.css'), 'abcd');
    generate();
    const after = links(await readFile(join(root, 'index.html'), 'utf8'));
    assert.ok(after.includes('css/blog-cards.css?v=88d4266fd4e6338d'));
    assert.deepEqual(after.filter(url => !url.startsWith('css/blog-cards.css')), before.filter(url => !url.startsWith('css/blog-cards.css')));
    for (const path of ['404.html', 'about/index.html', 'contact/index.html', 'privacy/index.html']) {
      const urls = links(await readFile(join(root, path), 'utf8'));
      for (const value of urls) {
        const url = new URL(value, 'https://ferhattufekci.github.io');
        if (url.origin === 'https://ferhattufekci.github.io') assert.match(url.searchParams.get('v') || '', /^[a-f0-9]{16}$/, path);
      }
    }
    assert.ok(links(await readFile(join(root, '404.html'), 'utf8')).includes('/css/blog-cards.css?v=88d4266fd4e6338d'));
  });
});
