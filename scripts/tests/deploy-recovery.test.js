import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planRecovery } from '../ci/policy.mjs';

// Facts trimmed from real Actions data: run 42043003964 lost two jobs to their
// deadline, and run 42028696513 (attempt 2) was rejected by the superseded guard.
const fixture = JSON.parse(
  await readFile(
    new URL('./fixtures/deploy-recovery-runs.json', import.meta.url),
    'utf8'
  )
);
const clone = (value) => structuredClone(value);
const hex = (char) => char.repeat(40);
const timeout = () => clone(fixture.timeout);
const superseded = () => clone(fixture.superseded);
const tip = fixture.timeout.run.head_sha;

test('R-CI-RECOVER-01: deadline-cancelled jobs on the newest commit are rerun once', () => {
  const { run, jobs, annotations } = timeout();
  assert.equal(
    planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] }).action,
    'rerun'
  );
});
test('R-CI-RECOVER-02: a run that was already retried is never retried again', () => {
  const { run, jobs, annotations } = timeout();
  run.run_attempt = 2;
  const plan = planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] });
  assert.equal(plan.action, 'none');
  assert.match(plan.reason, /Already retried/);
});
test('R-CI-RECOVER-03: a genuine test failure is left visible', () => {
  const { run, jobs, annotations } = timeout();
  jobs.find((job) => job.name.endsWith('Unit Tests')).conclusion = 'failure';
  const plan = planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] });
  assert.equal(plan.action, 'none');
  assert.match(plan.reason, /Genuine failure: .*Unit Tests/);
});
test('R-CI-RECOVER-04: a cancellation without a deadline annotation is a manual stop', () => {
  const { run, jobs, annotations } = timeout();
  annotations['127298854348'] = [{ message: 'Canceling since a higher priority waiting request exists' }];
  assert.equal(
    planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] }).action,
    'none'
  );
});
test('R-CI-RECOVER-05: every cancelled job needs deadline evidence, not just one', () => {
  const { run, jobs, annotations } = timeout();
  delete annotations['127298854348'];
  assert.equal(
    planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] }).action,
    'none'
  );
});
test('R-CI-RECOVER-06: a superseded rejection dispatches the newest commit only when nothing covers it', () => {
  const { run, jobs } = superseded();
  const mainSha = hex('a');
  assert.equal(
    planRecovery({ run, jobs, mainSha, tipRuns: [] }).action,
    'dispatch'
  );
  const covering = {
    ...run,
    id: 1,
    head_sha: mainSha,
    event: 'workflow_run',
    run_attempt: 1,
    conclusion: null
  };
  const plan = planRecovery({ run, jobs, mainSha, tipRuns: [covering] });
  assert.equal(plan.action, 'none');
  assert.match(plan.reason, /already covers/);
});
test('R-CI-RECOVER-07: a run for the newest commit on a foreign repository or branch does not count as coverage', () => {
  const { run, jobs } = superseded();
  const mainSha = hex('b');
  const foreign = { ...run, head_sha: mainSha, head_repository: { full_name: 'someone/fork' } };
  const pull = { ...run, head_sha: mainSha, event: 'pull_request' };
  assert.equal(
    planRecovery({ run, jobs, mainSha, tipRuns: [foreign, pull] }).action,
    'dispatch'
  );
});
test('R-CI-RECOVER-08: a superseded rejection on the newest commit is not retried blindly', () => {
  const { run, jobs } = superseded();
  assert.equal(
    planRecovery({ run, jobs, mainSha: run.head_sha, tipRuns: [] }).action,
    'none'
  );
});
test('R-CI-RECOVER-09: a deadline loss on an outdated commit dispatches the newest one instead of rerunning', () => {
  const { run, jobs, annotations } = timeout();
  assert.equal(
    planRecovery({ run, jobs, annotations, mainSha: hex('c'), tipRuns: [] }).action,
    'dispatch'
  );
});
test('R-CI-RECOVER-10: untrusted or unrelated runs never trigger an action', () => {
  const mutations = [
    (run) => (run.name = 'Fetch Medium Articles'),
    (run) => (run.path = '.github/workflows/evil.yml'),
    (run) => (run.head_branch = 'feature'),
    (run) => (run.head_repository = { full_name: 'someone/fork' }),
    (run) => (run.event = 'pull_request'),
    (run) => (run.conclusion = 'success')
  ];
  for (const mutate of mutations) {
    const { run, jobs, annotations } = timeout();
    mutate(run);
    assert.equal(
      planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] }).action,
      'none'
    );
  }
});
test('R-CI-RECOVER-11: the main SHA must be a full commit id', () => {
  const { run, jobs, annotations } = timeout();
  assert.throws(
    () => planRecovery({ run, jobs, annotations, mainSha: 'abc123', tipRuns: [] }),
    /Invalid main SHA/
  );
});
test('R-CI-RECOVER-12: the recovery workflow is a least-privilege, main-only follower of the production run', async () => {
  const text = await readFile(
    new URL('../../.github/workflows/recover-release.yml', import.meta.url),
    'utf8'
  );
  const triggers = text.slice(text.indexOf('\non:'), text.indexOf('\npermissions:'));
  assert.match(triggers, /workflow_run:\s+workflows:\s+- Portfolio CI\/CD\s+types:\s+- completed/);
  assert.doesNotMatch(triggers, /pull_request|push:|schedule:/);
  assert.match(text, /^permissions:\n  contents: read$/m);
  assert.match(text, /^ {4}permissions:\n {6}contents: read\n {6}actions: write$/m);
  assert.doesNotMatch(text, /contents: write|pull-requests|id-token|pages:/);
  const guard = text.match(/^ {4}if: (.+)$/m)?.[1] || '';
  for (const part of [
    "github.event.workflow_run.head_branch == 'main'",
    'github.event.workflow_run.head_repository.full_name == github.repository',
    "github.event.workflow_run.conclusion == 'failure'",
    "github.event.workflow_run.conclusion == 'cancelled'"
  ]) assert.ok(guard.includes(part), `Missing guard: ${part}`);
  assert.match(text, /uses: actions\/checkout@[a-f0-9]{40} # v/);
  assert.match(text, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(text, /persist-credentials: false/);
  assert.match(text, /commands\.mjs recover "\$RUN_ID" "\$RUN_ATTEMPT"/);
});
test('R-CI-RECOVER-13: a deployed release whose verification hit its deadline is retried on the newest commit and left alone once main moved on', () => {
  // Real run 42108859656: Deploy succeeded, Verify Production exceeded 10 minutes.
  const { run, jobs, annotations } = clone(fixture.verifyTimeout);
  assert.equal(jobs.find((job) => job.name === 'Deploy GitHub Pages').conclusion, 'success');
  assert.equal(
    planRecovery({ run, jobs, annotations, mainSha: run.head_sha, tipRuns: [] }).action,
    'rerun'
  );
  const moved = { ...run, id: 2, head_sha: hex('d'), event: 'workflow_run', conclusion: null };
  assert.equal(
    planRecovery({ run, jobs, annotations, mainSha: moved.head_sha, tipRuns: [moved] }).action,
    'none'
  );
});
