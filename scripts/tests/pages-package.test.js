import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, inventory } from '../lib/public-files.mjs';
import { packagePages } from '../package-pages.mjs';

test('R-DEPLOY-01: deployment artifact contains exactly public assets without repository or test internals', async () => {
  const destination = await packagePages();
  await readFile(join(destination, '.nojekyll'));
  for (const path of await inventory()) {
    assert.deepEqual(await readFile(join(destination, path)), await readFile(join(ROOT, path)), path);
    assert.ok((await lstat(join(destination, path))).isFile());
  }
  for (const privatePath of ['.git', '.github', 'node_modules', 'scripts', 'tests', 'package.json', 'content']) {
    await assert.rejects(lstat(join(destination, privatePath)), { code: 'ENOENT' });
  }
});
