import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { ROOT } from '../lib/public-files.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';
const quality = YAML.parse(
  await readFile(
    join(ROOT, '.github/workflows/test-agent-readiness.yml'),
    'utf8'
  )
);
const pages = YAML.parse(
  await readFile(join(ROOT, '.github/workflows/pages.yml'), 'utf8')
);
test('R-FIRST-01: independent unit/static gates block browser work while generation has one build owner', () => {
  assert.equal(quality.jobs['unit-tests'].needs, undefined);
  assert.equal(quality.jobs['static-checks'].needs, undefined);
  assert.deepEqual(quality.jobs['browser-tests'].needs, [
    'build-site',
    'static-checks',
    'unit-tests'
  ]);
  const generations = Object.values(quality.jobs)
    .flatMap((j) => j.steps || [])
    .filter((step) => step.run === 'npm run generate');
  assert.equal(generations.length, 1);
  assert.equal(
    quality.jobs['browser-tests'].env.PORTFOLIO_TEST_ROOT,
    '.pages-site'
  );
  assert.deepEqual(quality.jobs['verify-artifact'].needs, 'build-site');
});
test('R-FIRST-02: generation reads isolated fixture inputs and preserves the working project', async () => {
  const before = await readFile(join(ROOT, 'about/index.html'), 'utf8');
  await withProjectFixture(async (root) => {
    const file = join(root, 'content/trust-pages.json'),
      pages = JSON.parse(await readFile(file, 'utf8'));
    pages.about.title = 'Isolated fixture profile';
    await writeFile(file, JSON.stringify(pages));
    execFileSync(process.execPath, ['scripts/build-agent-content.mjs'], {
      cwd: ROOT,
      env: { ...process.env, PORTFOLIO_ROOT: root }
    });
    assert.match(
      await readFile(join(root, 'about/index.html'), 'utf8'),
      /Isolated fixture profile/
    );
  });
  assert.equal(await readFile(join(ROOT, 'about/index.html'), 'utf8'), before);
});
test('R-CI-02: all jobs check out the resolved SHA and deploy the one tested artifact under a workflow-wide production lock', () => {
  for (const job of Object.values(quality.jobs))
    for (const step of job.steps || [])
      if (step.uses?.startsWith('actions/checkout@'))
        assert.equal(step.with.ref, '${{ inputs.source-sha }}');
  for (const id of ['deploy-pages', 'verify-production']) {
    const step = pages.jobs[id].steps.find((s) =>
      s.uses?.startsWith('actions/checkout@')
    );
    assert.equal(step.with.ref, '${{ needs.resolve-source.outputs.sha }}');
  }
  assert.match(
    pages.jobs['deploy-pages'].if,
    /github.event_name != 'pull_request'/
  );
  assert.match(pages.jobs['deploy-pages'].if, /refs\/heads\/main/);
  assert.deepEqual(pages.jobs['verify-production'].needs, [
    'resolve-source',
    'quality-checks',
    'deploy-pages'
  ]);
  assert.equal(
    pages.jobs['deploy-pages'].steps.find((s) =>
      s.uses?.startsWith('actions/deploy-pages@')
    ).with.artifact_name,
    '${{ needs.quality-checks.outputs.artifact-name }}'
  );
  assert.equal(
    pages.jobs['verify-production'].steps.find((s) =>
      s.uses?.startsWith('actions/download-artifact@')
    ).with['artifact-ids'],
    '${{ needs.quality-checks.outputs.artifact-id }}'
  );
  assert.match(pages.concurrency.group, /portfolio-production/);
  assert.match(
    pages.concurrency['cancel-in-progress'],
    /github\.ref != 'refs\/heads\/main'/
  );
  for (const [id, job] of Object.entries(pages.jobs))
    if (id !== 'deploy-pages') {
      assert.notEqual(job.permissions?.pages, 'write');
      assert.notEqual(job.permissions?.['id-token'], 'write');
    }
  assert.equal(pages.on.pull_request_target, undefined);
});
