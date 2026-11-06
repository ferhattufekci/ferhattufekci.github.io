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
  assert.match(triggers, /workflow_dispatch:/);
  assert.match(text, /^permissions:\n  contents: read$/m);
  assert.match(text, /^ {4}permissions:\n {6}contents: read\n {6}actions: write$/m);
  assert.doesNotMatch(text, /contents: write|pull-requests|id-token|pages:/);
  const guard = text.match(/^ {4}if: (.+)$/m)?.[1] || '';
  for (const part of [
    "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'",
    "github.event.workflow_run.head_branch == 'main'",
    'github.event.workflow_run.head_repository.full_name == github.repository',
    "github.event.workflow_run.conclusion == 'failure'",
    "github.event.workflow_run.conclusion == 'cancelled'"
  ]) assert.ok(guard.includes(part), `Missing guard: ${part}`);
  assert.match(text, /uses: actions\/checkout@[a-f0-9]{40} # v/);
  assert.match(text, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(text, /persist-credentials: false/);
  assert.match(text, /commands\.mjs recover "\$RUN_ID" "\$RUN_ATTEMPT"/);
  // Acting is opt-in and impossible from a manual dispatch.
  assert.match(text, /RECOVERY_ACT: \$\{\{ github\.event_name == 'workflow_run' && vars\.PORTFOLIO_RECOVERY_ACT == 'true' && 'true' \|\| 'false' \}\}/);
  // Per-run concurrency: a shared group would drop all but one pending recovery.
  assert.match(text, /group: portfolio-recovery-\$\{\{ github\.event\.workflow_run\.id \|\| inputs\.run-id \}\}/);
  // Untrusted-looking values reach the shell only through env.
  const runLines = text.split('\n').filter((line) => /^\s+run: /.test(line));
  for (const line of runLines) assert.doesNotMatch(line, /\$\{\{/);
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
test('R-CI-RECOVER-14: the API-reading path asks for annotations only on cancelled jobs, pages jobs, and performs exactly one action', async () => {
  const { recover } = await import('../ci/recovery.mjs');
  const { run, jobs, annotations } = clone(fixture.timeout);
  const calls = [], acts = [];
  const api = async (...parts) => {
    const url = parts.at(-1);
    calls.push(parts.join(' '));
    if (url.includes('/annotations')) return [annotations[url.match(/check-runs\/(\d+)/)[1]]];
    if (url.includes('/jobs?')) return [{ jobs: jobs.slice(0, 5) }, { jobs: jobs.slice(5) }];
    if (url.includes('/workflows/pages.yml/runs')) return { workflow_runs: [] };
    return run;
  };
  const plan = await recover({ runId: '42043003964', attempt: '1', api, mainSha: tip, act: async (a) => acts.push(a) });
  assert.equal(plan.action, 'rerun');
  assert.deepEqual(acts, ['rerun']);
  assert.deepEqual(
    calls.filter((c) => c.includes('annotations')).map((c) => c.match(/check-runs\/(\d+)/)[1]).sort(),
    ['127298757947', '127298854348']
  );
  assert.ok(calls.some((c) => c.startsWith('--paginate --slurp ')), 'jobs must be paged');
  assert.ok(calls.some((c) => c.includes(`head_sha=${tip}`)));
  // A decision of none performs nothing.
  acts.length = 0;
  const none = await recover({ runId: '42043003964', attempt: '2', api: async (...p) => { const r = await api(...p); return r === run ? { ...run, run_attempt: 2 } : r; }, mainSha: tip, act: async (a) => acts.push(a) });
  assert.equal(none.action, 'none');
  assert.deepEqual(acts, []);
  await assert.rejects(recover({ runId: 'x', attempt: '1', api, mainSha: tip, act() {} }), /decimal/);
});
test('R-CI-RECOVER-15: a skipped run for the newest commit built nothing and does not count as coverage', () => {
  // Real run 42129120936 shape: workflow_run at the tip with every job skipped.
  const { run, jobs } = superseded();
  const mainSha = hex('e');
  const skipped = { ...run, id: 3, head_sha: mainSha, event: 'workflow_run', run_attempt: 1, conclusion: 'skipped' };
  assert.equal(planRecovery({ run, jobs, mainSha, tipRuns: [skipped] }).action, 'dispatch');
  const failed = { ...skipped, conclusion: 'failure' };
  assert.equal(planRecovery({ run, jobs, mainSha, tipRuns: [failed] }).action, 'none');
});
test('R-CI-RECOVER-16: observe-only mode reports the decision and never acts', async () => {
  const { recover } = await import('../ci/recovery.mjs');
  const { run, jobs, annotations } = clone(fixture.timeout);
  const acts = [];
  const api = async (...parts) => {
    const url = parts.at(-1);
    if (url.includes('/annotations')) return [annotations[url.match(/check-runs\/(\d+)/)[1]]];
    if (url.includes('/jobs?')) return [{ jobs }];
    if (url.includes('/workflows/pages.yml/runs')) return { workflow_runs: [] };
    return run;
  };
  const observed = await recover({ runId: '1', attempt: '1', api, mainSha: tip, act: async (a) => acts.push(a), observeOnly: true });
  assert.deepEqual([observed.action, observed.performed, acts], ['rerun', false, []]);
  const acted = await recover({ runId: '1', attempt: '1', api, mainSha: tip, act: async (a) => acts.push(a) });
  assert.deepEqual([acted.action, acted.performed, acts], ['rerun', true, ['rerun']]);
});
test('R-CI-RECOVER-17: mixed causes and unknown job conclusions never recover', () => {
  // Superseded deploy plus a manually cancelled job: the manual stop wins.
  const sup = superseded();
  sup.jobs.find((job) => job.name === 'Verify Production').conclusion = 'cancelled';
  assert.equal(planRecovery({ run: sup.run, jobs: sup.jobs, annotations: {}, mainSha: hex('f'), tipRuns: [] }).action, 'none');
  // Conclusions without a benign meaning are genuine, even beside a deadline loss.
  for (const conclusion of ['timed_out', 'neutral', 'action_required', null]) {
    const { run, jobs, annotations } = timeout();
    jobs.find((job) => job.name.endsWith('Unit Tests')).conclusion = conclusion;
    const plan = planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] });
    assert.equal(plan.action, 'none', String(conclusion));
    assert.match(plan.reason, /Genuine failure/);
  }
});
test('R-CI-RECOVER-18: the API may suffix the workflow path with its ref', () => {
  const { run, jobs, annotations } = timeout();
  run.path = '.github/workflows/pages.yml@refs/heads/main';
  assert.equal(planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] }).action, 'rerun');
  run.path = '.github/workflows/other.yml@refs/heads/main';
  assert.equal(planRecovery({ run, jobs, annotations, mainSha: tip, tipRuns: [] }).action, 'none');
});
test('R-CI-RECOVER-19: a decision made on a stale attempt is dropped before acting', async () => {
  const { recover } = await import('../ci/recovery.mjs');
  const { run, jobs, annotations } = clone(fixture.timeout);
  const acts = [];
  let latestAttempt = 1;
  const api = async (...parts) => {
    const url = parts.at(-1);
    if (url.includes('/annotations')) return [annotations[url.match(/check-runs\/(\d+)/)[1]]];
    if (url.includes('/jobs?')) return [{ jobs }];
    if (url.includes('/workflows/pages.yml/runs')) return { workflow_runs: [] };
    return /\/attempts\/\d+$/.test(url) ? run : { ...run, run_attempt: latestAttempt };
  };
  const act = async (a) => acts.push(a);
  assert.equal((await recover({ runId: '1', attempt: '1', api, mainSha: tip, act })).performed, true);
  latestAttempt = 2; // a person reran it while the decision was being made
  const stale = await recover({ runId: '1', attempt: '1', api, mainSha: tip, act });
  assert.deepEqual([stale.action, stale.performed, acts], ['none', false, ['rerun']]);
});
test('R-CI-RECOVER-20: workflow_run production runs are keyed on the data commit they were triggered at', () => {
  // Real data: run 42043003964 (event workflow_run) has head_sha 02dc911, the
  // 14:13 data commit that was main when it started, so head_sha === main works.
  const { run } = timeout();
  assert.equal(run.event, 'workflow_run');
  assert.match(run.head_sha, /^02dc911/);
});
