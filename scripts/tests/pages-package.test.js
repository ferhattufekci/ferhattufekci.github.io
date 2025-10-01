import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, lstat, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { inventory } from '../lib/public-files.mjs';
import { packagePages } from '../package-pages.mjs';
import { verifyMetadata } from '../ci/build-metadata.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';

async function artifactFiles(root, relative = '') {
  const paths = [];
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    const path = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) paths.push(...await artifactFiles(root, path));
    else paths.push(path);
  }
  return paths.sort();
}

test('R-DEPLOY-01: deployment artifact contains exactly public assets without repository or test internals', async () => {
  await withProjectFixture(async root => {
    // Absence assertions are meaningful only if private inputs actually exist.
    for (const path of ['.env', '.github/workflows/private.yml', 'node_modules/mock/index.js',
      'scripts/private.js', 'tests/private.json', 'docs/testing/private.md', 'README.md', 'TEST-STRATEGY.md', 'package.json']) {
      const file = join(root, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, 'Synthetic private test input; no credentials.');
    }
    const destination = await packagePages(root);
    assert.deepEqual(await artifactFiles(destination), [...await inventory(root), '.nojekyll', 'build-metadata.json'].sort(),
      'The complete artifact inventory must contain no extra source or maintenance files');
    await readFile(join(destination, '.nojekyll'));
    const manifest = JSON.parse(await readFile(join(destination, 'build-metadata.json'), 'utf8'));
    await verifyMetadata(destination, manifest.sourceSha);
    assert.ok(!manifest.files.some(file => file.path === 'build-metadata.json'), 'No self-referential metadata hash');
    for (const path of await inventory(root)) {
      assert.deepEqual(await readFile(join(destination, path)), await readFile(join(root, path)), path);
      assert.ok((await lstat(join(destination, path))).isFile());
    }
    for (const privatePath of ['.git', '.github', '.env', 'node_modules', 'scripts', 'tests', 'docs', 'README.md', 'TEST-STRATEGY.md', 'package.json', 'content']) {
      await assert.rejects(lstat(join(destination, privatePath)), { code: 'ENOENT' });
    }
  });
});
