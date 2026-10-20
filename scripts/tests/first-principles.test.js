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
