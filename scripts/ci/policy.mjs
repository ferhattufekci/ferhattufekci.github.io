import assert from 'node:assert/strict';

export const repository = 'ferhattufekci/ferhattufekci.github.io';
export const requiredChecks = [
  'static-checks',
  'unit-tests',
  'build-site',
  'browser-tests',
  'verify-artifact',
  'merge-test-reports'
];
export function resolveSource(eventName, event, ref, sha, mainSha) {
  assert.equal(
    event.repository?.full_name,
    repository,
    'Unexpected repository'
  );
  if (eventName === 'workflow_run') {
    const run = event.workflow_run;
    const writers = {
      'Fetch Medium Articles': '.github/workflows/fetch-medium.yml',
      'Fetch GitHub Repos': '.github/workflows/fetch-github.yml'
    };
    assert.ok(Object.hasOwn(writers, run?.name), 'Unexpected source workflow');
    assert.equal(
      run.path,
      writers[run.name],
      'Unexpected source workflow path'
    );
    assert.equal(
      run.head_repository?.full_name,
      repository,
      'Untrusted source repository'
    );
    assert.equal(run.head_branch, 'main', 'Unexpected source branch');
    assert.equal(run.conclusion, 'success', 'Unsuccessful source workflow');
    assert.ok(
      ['schedule', 'workflow_dispatch'].includes(run.event),
      'Unexpected writer trigger'
    );
    // GITHUB_TOKEN's data commit is newer than workflow_run.head_sha. Resolve main
    // once here; every subsequent job receives this immutable SHA.
    sha = mainSha;
  } else
    assert.ok(
      ['push', 'pull_request', 'workflow_dispatch'].includes(eventName),
      'Unexpected trigger'
    );
  assert.match(sha, /^[a-f0-9]{40}$/, 'Invalid source SHA');
  return {
    sha,
    publish:
      eventName !== 'pull_request' &&
      (eventName === 'workflow_run' || ref === 'refs/heads/main')
  };
}
export function requireQuality(needs) {
  for (const job of requiredChecks)
    assert.equal(
      needs[job]?.result,
      'success',
      `Required check ${job} did not succeed`
    );
}
export function requireCurrentSource(expected, actual) {
  assert.match(expected, /^[a-f0-9]{40}$/);
  assert.equal(
    actual,
    expected,
    'Superseded source: refusing to deploy an older run'
  );
}
export function validateCoverage(expected, shards, count = 2) {
  assert.equal(shards.length, count, 'Missing shard report');
  const all = new Set(expected);
  assert.equal(all.size, expected.length, 'Duplicate expected test ID');
  assert.ok(all.size > 0, 'Empty expected coverage');
  const seen = new Set(),
    indexes = new Set();
  for (const shard of shards) {
    assert.equal(shard.total, count);
    assert.ok(
      shard.index >= 1 && shard.index <= count && !indexes.has(shard.index),
      'Duplicate/invalid shard index'
    );
    indexes.add(shard.index);
    assert.equal(shard.status, 'passed', 'Shard execution failed');
    assert.equal(
      shard.assigned.length,
      shard.results.length,
      'Incomplete shard results'
    );
    assert.deepEqual(
      [...shard.assigned].sort(),
      shard.results.map((r) => r.id).sort(),
      'Assigned/result mismatch'
    );
    for (const result of shard.results) {
      assert.ok(
        all.has(result.id) && !seen.has(result.id),
        'Unknown or repeated test'
      );
      assert.equal(result.status, 'passed', 'Failed/skipped test');
      assert.equal(result.retry, 0, 'Unexpected retried/flaky test');
      seen.add(result.id);
    }
  }
  assert.equal(seen.size, all.size, 'Coverage was lost across shards');
  return { tests: seen.size, shards: shards.length, flaky: 0, skipped: 0 };
}
