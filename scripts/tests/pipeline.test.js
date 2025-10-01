import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import {
  repository,
  resolveSource,
  requireQuality,
  requireCurrentSource,
  validateCoverage,
  requiredChecks
} from '../ci/policy.mjs';
import {
  createMetadata,
  verifyMetadata,
  hash,
  contentHash
} from '../ci/build-metadata.mjs';
import { waitForRelease, criticalFiles } from '../ci/verify-release.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';
const sha = 'a'.repeat(40),
  other = 'b'.repeat(40);
const event = {
  repository: { full_name: repository },
  workflow_run: {
    name: 'Fetch Medium Articles',
    path: '.github/workflows/fetch-medium.yml',
    head_repository: { full_name: repository },
    head_branch: 'main',
    conclusion: 'success',
    event: 'schedule',
    head_sha: other
  }
};
test('R-PIPE-01: PR and branch CI never publish; successful trusted writers resolve the actual data commit once', () => {
  assert.deepEqual(
    resolveSource('pull_request', event, 'refs/pull/1/merge', sha),
    { sha, publish: false }
  );
  assert.equal(
    resolveSource('workflow_dispatch', event, 'refs/heads/feature', sha)
      .publish,
    false
  );
  assert.equal(
    resolveSource('push', event, 'refs/heads/main', sha).publish,
    true
  );
  assert.deepEqual(resolveSource('workflow_run', event, '', other, sha), {
    sha,
    publish: true
  });
  for (const mutation of [
    (e) => (e.workflow_run.head_repository.full_name = 'attacker/fork'),
    (e) => (e.workflow_run.head_branch = 'feature'),
    (e) => (e.workflow_run.conclusion = 'failure'),
    (e) => (e.workflow_run.path = '.github/workflows/evil.yml'),
    (e) => (e.workflow_run.event = 'pull_request'),
    (e) => (e.repository.full_name = 'another/repo')
  ]) {
    const e = structuredClone(event);
    mutation(e);
    assert.throws(() => resolveSource('workflow_run', e, '', other, sha));
  }
});
test('R-PIPE-02: each required failed, cancelled, skipped or absent check blocks publication and returns nonzero', () => {
  const needs = Object.fromEntries(
    requiredChecks.map((key) => [key, { result: 'success' }])
  );
  requireQuality(needs);
  for (const key of requiredChecks)
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      const fixture = structuredClone(needs);
      fixture[key] = { result };
      assert.throws(() => requireQuality(fixture));
    }
  const bad = { ...needs, 'browser-tests': { result: 'failure' } };
  const cli = spawnSync(process.execPath, ['scripts/ci/commands.mjs', 'gate'], {
    env: { ...process.env, CHECK_RESULTS: JSON.stringify(bad) },
    encoding: 'utf8'
  });
  assert.equal(cli.status, 1);
  assert.throws(() => requireCurrentSource(other, sha));
  requireCurrentSource(sha, sha);
});
const shards = [
  {
    index: 1,
    total: 2,
    status: 'passed',
    assigned: ['a'],
    results: [{ id: 'a', status: 'passed', retry: 0 }]
  },
  {
    index: 2,
    total: 2,
    status: 'passed',
    assigned: ['b'],
    results: [{ id: 'b', status: 'passed', retry: 0 }]
  }
];
test('R-PIPE-03: coverage union rejects missing shard, duplicated suite, lost test, skipped test and hidden flaky retries', () => {
  assert.equal(validateCoverage(['a', 'b'], shards).tests, 2);
  for (const mutate of [
    (s) => s.pop(),
    (s) => (s[1].results = []),
    (s) => {
      s[1].assigned = ['a'];
      s[1].results[0].id = 'a';
    },
    (s) => (s[1].results[0].status = 'skipped'),
    (s) => (s[1].results[0].retry = 1),
    (s) => (s[1].status = 'failed')
  ]) {
    const fixture = structuredClone(shards);
    mutate(fixture);
    assert.throws(() => validateCoverage(['a', 'b'], fixture));
  }
});
test('R-PIPE-04: metadata has no self-hash cycle and rejects changed bytes, forged digests and wrong source', async () => {
  await withProjectFixture(async (root) => {
    const meta = await createMetadata(root, sha);
    assert.ok(!meta.files.some((f) => f.path === 'build-metadata.json'));
    await verifyMetadata(root, sha);
    await assert.rejects(verifyMetadata(root, other));
    await writeFile(
      join(root, 'build-metadata.json'),
      JSON.stringify({ ...meta, contentSha256: '0'.repeat(64) })
    );
    await assert.rejects(verifyMetadata(root, sha));
    await writeFile(join(root, 'build-metadata.json'), JSON.stringify(meta));
    await writeFile(join(root, 'index.html'), 'Changed');
    await assert.rejects(verifyMetadata(root, sha));
    const cli = spawnSync(
      process.execPath,
      ['scripts/ci/commands.mjs', 'artifact', root, sha],
      {
        env: { ...process.env, SOURCE_SHA: sha },
        encoding: 'utf8'
      }
    );
    assert.equal(
      cli.status,
      1,
      'Artifact CLI must propagate a byte mismatch as failure'
    );
  });
});
function fake(expected, { old = false, corruptFirst = false } = {}) {
  let time = 0,
    attempt = 0;
  const files = Object.fromEntries(
    expected.files.map((f) => [f.path, Buffer.from(f.path)])
  );
  return {
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
    fetcher: async (url) => {
      const path = new URL(url).pathname.slice(1);
      if (path === 'build-metadata.json') {
        attempt++;
        return {
          status: 200,
          json: async () => (old ? { ...expected, sourceSha: other } : expected)
        };
      }
      const bytes =
        corruptFirst && attempt === 1 ? Buffer.from('wrong') : files[path];
      return { status: 200, arrayBuffer: async () => bytes };
    }
  };
}
const files = criticalFiles.map((path) => ({
  path,
  size: Buffer.byteLength(path),
  sha256: hash(path)
}));
const manifest = {
  schemaVersion: 1,
  sourceSha: sha,
  files,
  contentSha256: contentHash(files)
};
test('R-PIPE-05: 200 OK from an old release times out, while partial CDN rollout retries only within the bounded deadline', async () => {
  const stale = await waitForRelease('https://example.test/', manifest, {
    timeoutMs: 30,
    intervalMs: 10,
    ...fake(manifest, { old: true })
  });
  assert.equal(stale.passed, false);
  assert.equal(stale.attempts.length, 3);
  const ready = await waitForRelease('https://example.test/', manifest, {
    timeoutMs: 30,
    intervalMs: 10,
    ...fake(manifest, { corruptFirst: true })
  });
  assert.equal(ready.passed, true);
  assert.equal(ready.attempts.length, 2);
  assert.equal(ready.verified.length, criticalFiles.length);
});
test('R-PIPE-06: action pins, matrix coverage, strict gate and protected production lock are explicit in workflow configuration', async () => {
  const q = YAML.parse(
      await readFile('.github/workflows/test-agent-readiness.yml', 'utf8')
    ),
    p = YAML.parse(await readFile('.github/workflows/pages.yml', 'utf8'));
  assert.deepEqual(q.jobs['browser-tests'].strategy.matrix.shard, [1, 2]);
  assert.equal(q.jobs['browser-tests'].strategy['fail-fast'], false);
  assert.equal(q.jobs['quality-gate'].if, 'always()');
  assert.deepEqual(q.jobs['quality-gate'].needs, requiredChecks);
  for (const workflow of [p, q])
    for (const job of Object.values(workflow.jobs))
      for (const step of job.steps || []) {
        if (step.uses?.startsWith('actions/'))
          assert.match(step.uses, /@[a-f0-9]{40}$/);
        assert.notEqual(step['continue-on-error'], true);
      }
  assert.equal(
    q.jobs['build-site'].steps.filter((s) => s.run === 'npm run generate')
      .length,
    1
  );
});
