import { cp, mkdir, rm, lstat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, inventory } from './lib/public-files.mjs';

export async function packagePages(projectRoot = ROOT) {
  const root = resolve(projectRoot);
  const destination = resolve(root, '.pages-site');
  // Never remove a caller-supplied path or follow a substituted directory link.
  if (dirname(destination) !== root) throw new Error('Invalid Pages artifact directory.');
  const previous = await lstat(destination).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous?.isSymbolicLink()) throw new Error('Pages artifact directory must not be a symlink.');
  await rm(destination, { recursive: true, force: true });
  for (const path of [...await inventory(root), '.nojekyll']) {
    const target = join(destination, path);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(root, path), target);
  }
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('Static Pages artifact: ' + await packagePages());
}
