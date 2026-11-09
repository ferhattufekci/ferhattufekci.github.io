import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { parseHTML } from 'linkedom';
import { frontendDigest } from '../lib/frontend-preservation.mjs';
import { ROOT } from '../lib/public-files.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';
import { packagePages } from '../package-pages.mjs';

const contract = JSON.parse(await readFile(join(ROOT, 'tests/fixtures/frontend-preservation.json'), 'utf8'));
async function verify(root) {
  for (const [path, expected] of Object.entries(contract.files))
    assert.equal(frontendDigest(path, await readFile(join(root, path))), expected, `Unapproved visible source change: ${path}`);
  const { document } = parseHTML(await readFile(join(root, 'index.html'), 'utf8'));
  assert.equal(document.querySelectorAll('.role-evidence, [aria-label="Explore evidence by role"]').length, 0);
  assert.equal(document.querySelectorAll('.hp-buttons a').length, 1, 'Original single hero CTA');
  assert.equal(document.querySelector('.hp-buttons a').getAttribute('href'), '#resume');
  assert.ok(document.querySelector('.resume-bottom-cta a[href*="FerhatTufekci_CV.pdf"]'));
  for (const id of ['projects', 'contact']) assert.ok(document.querySelector(`.site-main-menu a[href="#${id}"]`));
}
test('REQ-UI-PRESERVE AC1/2: source matches independent pre-edit reference', async () => verify(ROOT));
test('REQ-UI-PRESERVE AC3: rejected menu is detected without changing reference', async () => {
  const path = 'index.html', source = await readFile(join(ROOT, path), 'utf8');
  const changed = source.replace('<h2 class="hp-main-title">', '<nav>Explore evidence by role</nav><h2 class="hp-main-title">');
  assert.notEqual(changed, source);
  assert.notEqual(frontendDigest(path, Buffer.from(changed)), contract.files[path]);
});
test('REQ-UI-PRESERVE AC5: artifact preserves UI and excludes hiring/maintenance inputs', async () => {
  await withProjectFixture(async root => {
    for (const path of ['docs/CASE-STUDIES.md', 'specs/frontend-preservation/spec.md', 'evidence/local.json', 'engineering/index.html']) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), 'Synthetic private hiring/maintenance content');
    }
    const output = await packagePages(root, 'a'.repeat(40), {});
    await verify(output);
    const metadata = JSON.parse(await readFile(join(output, 'build-metadata.json'), 'utf8'));
    assert.ok(metadata.files.every(file => !/^(?:docs|specs|work|evidence|content|engineering)\//.test(file.path)));
  });
});
