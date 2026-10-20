import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { inventory } from '../lib/public-files.mjs';
import { packagePages } from '../package-pages.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';

test('R-DEPLOY-01: deployment artifact contains exactly public assets without repository or test internals', async () => {
  await withProjectFixture(async root => {
    const destination = await packagePages(root);
    await readFile(join(destination, '.nojekyll'));
    for (const path of await inventory(root)) {
      assert.deepEqual(await readFile(join(destination, path)), await readFile(join(root, path)), path);
      assert.ok((await lstat(join(destination, path))).isFile());
    }
    for (const privatePath of ['.git', '.github', 'node_modules', 'scripts', 'tests', 'package.json', 'content']) {
      await assert.rejects(lstat(join(destination, privatePath)), { code: 'ENOENT' });
    }
  });
});
