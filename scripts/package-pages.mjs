import { cp, mkdir, rm, lstat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ROOT, inventory } from './lib/public-files.mjs';
import { createMetadata } from './ci/build-metadata.mjs';
import { resolveBuildContext, applyBuildIdentity } from './ci/build-identity.mjs';

export async function packagePages(projectRoot = ROOT, sourceSha = process.env.SOURCE_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), buildEnvironment = process.env) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error('Invalid build source SHA.');
  const build = resolveBuildContext(buildEnvironment);
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
  await applyBuildIdentity(destination, build);
  await createMetadata(destination, sourceSha, build);
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('Static Pages artifact: ' + await packagePages());
}
