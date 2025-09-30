import { mkdir, mkdtemp, cp, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { ROOT, inventory } from '../../lib/public-files.mjs';

export async function withProjectFixture(callback) {
  const workspace = resolve(ROOT, 'work');
  await mkdir(workspace, { recursive: true });
  const root = await mkdtemp(join(workspace, 'test-project-'));
  try {
    for (const path of [...await inventory(), '.nojekyll', 'content/trust-pages.json']) {
      const destination = join(root, path);
      await mkdir(dirname(destination), { recursive: true });
      await cp(join(ROOT, path), destination);
    }
    return await callback(root);
  } finally {
    if (dirname(resolve(root)) !== workspace || !basename(root).startsWith('test-project-')) {
      throw new Error('Refusing cleanup outside the test fixture directory.');
    }
    await rm(root, { recursive: true, force: true });
  }
}
