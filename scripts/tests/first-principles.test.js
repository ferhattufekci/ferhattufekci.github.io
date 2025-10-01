import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/public-files.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';

test('R-FIRST-01: fast unit failures stop CI before browser installation and E2E work', async () => {
  const workflow = await readFile(join(ROOT, '.github/workflows/test-agent-readiness.yml'), 'utf8');
  const unit = workflow.indexOf('run: npm run test:unit');
  const browser = workflow.indexOf('run: npx playwright install');
  const bdd = workflow.indexOf('run: npm run test:bdd');
  assert.ok(unit >= 0 && unit < browser && browser < bdd, 'Required order: unit tests, browser installation, BDD');
});

test('R-FIRST-02: generation reads isolated fixture inputs and preserves the working project', async () => {
  const sourceBefore = await readFile(join(ROOT, 'about/index.html'), 'utf8');
  await withProjectFixture(async root => {
    const file = join(root, 'content/trust-pages.json');
    const pages = JSON.parse(await readFile(file, 'utf8'));
    pages.about.title = 'Isolated fixture profile';
    await writeFile(file, JSON.stringify(pages));
    execFileSync(process.execPath, ['scripts/build-agent-content.mjs'], {
      cwd: ROOT, env: { ...process.env, PORTFOLIO_ROOT: root }
    });
    assert.match(await readFile(join(root, 'about/index.html'), 'utf8'), /Isolated fixture profile/);
  });
  assert.equal(await readFile(join(ROOT, 'about/index.html'), 'utf8'), sourceBefore);
});

test('R-CI-02: production verification uses the exact tested source, even if main advances during deployment', async () => {
  const quality = await readFile(join(ROOT, '.github/workflows/test-agent-readiness.yml'), 'utf8');
  const pages = await readFile(join(ROOT, '.github/workflows/pages.yml'), 'utf8');
  assert.match(quality, /value: \$\{\{ jobs\.verify\.outputs\.tested_sha \}\}/);
  assert.match(quality, /tested_sha: \$\{\{ steps\.source\.outputs\.sha \}\}/);
  assert.match(quality, /id: source\s+run: echo "sha=\$\(git rev-parse HEAD\)" >> "\$GITHUB_OUTPUT"/);
  const verification = pages.slice(pages.indexOf('  verify-live:'));
  assert.match(verification, /needs: \[quality, deploy\]/);
  assert.match(verification, /ref: \$\{\{ needs\.quality\.outputs\.tested_sha \}\}/);
  assert.doesNotMatch(verification, /ref: main\b/);
  assert.match(verification, /git rev-parse HEAD > verification-source\.txt/);
});
