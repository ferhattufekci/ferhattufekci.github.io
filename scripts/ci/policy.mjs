import assert from 'node:assert/strict';

export const repository = 'ferhattufekci/ferhattufekci.github.io';
export const requiredChecks = [
  'static-checks',
  'unit-tests',
  'build-site',
  'browser-tests',
  'verify-artifact',
  'merge-test-reports',
  'keyboard-tests'
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
const productionWorkflow = {
  name: 'Portfolio CI/CD',
  path: '.github/workflows/pages.yml'
};
const productionEvents = ['push', 'workflow_run', 'workflow_dispatch'];
const timeoutAnnotation = /exceeded the maximum execution time/i;
const supersededStep = 'Reject superseded release';
// Downstream aggregators fail because an upstream job did; they carry no cause.
const aggregateJobs = ['Merge Test Reports', 'Quality Gate'];
const jobLabel = (job) => String(job.name).split(' / ').pop();
const isAggregate = (job) => aggregateJobs.includes(jobLabel(job));
const isSupersededDeploy = (job) =>
  job.conclusion === 'failure' &&
  (job.steps || []).some(
    (step) => step.name === supersededStep && step.conclusion === 'failure'
  );
function isProductionRun(run) {
  return (
    run?.name === productionWorkflow.name &&
    // The API may append the ref ('path@refs/heads/main') for some events.
    String(run.path).split('@')[0] === productionWorkflow.path &&
    run.head_branch === 'main' &&
    run.head_repository?.full_name === repository &&
    productionEvents.includes(run.event)
  );
}
/**
 * Decide whether a finished production run needs an automatic follow-up.
 * Pure: callers supply facts read from the Actions API and act on the answer.
 *
 * - rerun: the run lost jobs to the job deadline (infrastructure), is still the
 *   newest main commit and was not retried yet.
 * - dispatch: a newer main commit exists (or the run was rejected as
 *   superseded) and no run exists for that commit, so nothing will publish it.
 * - none: genuine test failures, manual cancellation, retried runs, and any case
 *   where another run already covers the newest commit. A real failure must
 *   stay visible, never be retried away.
 */
export function planRecovery({ run, jobs, annotations, mainSha, tipRuns }) {
  assert.match(mainSha, /^[a-f0-9]{40}$/, 'Invalid main SHA');
  const none = (reason) => ({ action: 'none', reason });
  if (!isProductionRun(run)) return none('Not a production run');
  if (!['failure', 'cancelled'].includes(run.conclusion))
    return none(`Run concluded ${run.conclusion}`);
  // Strict by construction: only outcomes with a known benign meaning are
  // tolerated; any other conclusion (failure, timed_out, neutral, unfinished)
  // is treated as genuine and blocks recovery.
  const benign = (job) =>
    ['success', 'skipped', 'cancelled'].includes(job.conclusion) ||
    (job.conclusion === 'failure' && (isAggregate(job) || isSupersededDeploy(job)));
  const real = jobs.filter((job) => !benign(job));
  if (real.length)
    return none(`Genuine failure: ${real.map((job) => job.name).join(', ')}`);
  const cancelled = jobs.filter((job) => job.conclusion === 'cancelled');
  const timedOut =
    cancelled.length > 0 &&
    cancelled.every((job) =>
      (annotations?.[job.id] || []).some((note) =>
        timeoutAnnotation.test(note.message || '')
      )
    );
  const superseded = jobs.some(isSupersededDeploy);
  // One unexplained cancellation (a person, a concurrency rule) vetoes recovery.
  if (cancelled.length > 0 && !timedOut)
    return none('Cancellation without deadline evidence (manual stop)');
  if (!timedOut && !superseded)
    return none('No infrastructure cause (manual cancellation or unknown)');
  if (timedOut && run.head_sha === mainSha) {
    return run.run_attempt === 1
      ? { action: 'rerun', reason: 'Job deadline exceeded on the newest commit' }
      : none('Already retried once');
  }
  if (run.head_sha === mainSha)
    return none('Superseded rejection on the newest commit needs investigation');
  // A skipped run (writer failed, so resolve-source never ran) built nothing.
  const covered = (tipRuns || []).some(
    (other) =>
      other.head_sha === mainSha &&
      isProductionRun(other) &&
      other.conclusion !== 'skipped'
  );
  return covered
    ? none('A newer run already covers main')
    : { action: 'dispatch', reason: 'Main advanced and no run covers it' };
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
