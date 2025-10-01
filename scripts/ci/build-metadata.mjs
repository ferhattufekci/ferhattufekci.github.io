import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const metadataPath = 'build-metadata.json';
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const contentHash = (files) => hash(JSON.stringify(files));
async function filesUnder(root, relative = '') {
  const files = [];
  for (const item of await readdir(join(root, relative), {
    withFileTypes: true
  })) {
    const path = relative ? `${relative}/${item.name}` : item.name;
    assert.ok(!item.isSymbolicLink(), 'Artifact must not contain symlinks');
    if (item.isDirectory()) files.push(...(await filesUnder(root, path)));
    else {
      assert.ok(item.isFile());
      if (path !== metadataPath) files.push(path);
    }
  }
  return files.sort();
}
export async function createMetadata(root, sourceSha) {
  assert.match(sourceSha, /^[a-f0-9]{40}$/);
  const files = [];
  for (const path of await filesUnder(root)) {
    const bytes = await readFile(join(root, path));
    files.push({ path, size: bytes.length, sha256: hash(bytes) });
  }
  const metadata = {
    schemaVersion: 1,
    sourceSha,
    contentSha256: contentHash(files),
    files
  };
  await writeFile(
    join(root, metadataPath),
    JSON.stringify(metadata, null, 2) + '\n'
  );
  return metadata;
}
export async function verifyMetadata(root, expectedSha) {
  const metadata = JSON.parse(await readFile(join(root, metadataPath), 'utf8'));
  assert.equal(metadata.schemaVersion, 1);
  assert.equal(metadata.sourceSha, expectedSha, 'Artifact source SHA mismatch');
  assert.equal(
    metadata.contentSha256,
    contentHash(metadata.files),
    'Invalid content digest'
  );
  assert.deepEqual(
    await filesUnder(root),
    metadata.files.map((file) => file.path),
    'Artifact inventory mismatch'
  );
  for (const file of metadata.files) {
    assert.ok(
      !file.path.startsWith('/') &&
        !file.path.split('/').includes('..') &&
        !file.path.includes('\\')
    );
    const bytes = await readFile(join(root, file.path));
    assert.equal(
      bytes.length,
      file.size,
      `Artifact size changed: ${file.path}`
    );
    assert.equal(
      hash(bytes),
      file.sha256,
      `Artifact bytes changed: ${file.path}`
    );
  }
  return metadata;
}
