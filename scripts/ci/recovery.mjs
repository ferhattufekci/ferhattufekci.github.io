import assert from 'node:assert/strict';
import { planRecovery, repository } from './policy.mjs';

// The only two commands recovery may ever run. Anything else is a programming
// error and must stop here, never fall through to a default action.
// Validate the inputs before anything is read from GitHub.
export function requireRunArgs(runId, attempt) {
  assert.match(runId || '', /^\d+$/, 'Run id must be decimal');
  assert.match(attempt || '', /^\d+$/, 'Run attempt must be decimal');
}

export function actionArgv(action, runId, repo = repository) {
  assert.match(runId || '', /^\d+$/, 'Run id must be decimal');
  if (action === 'rerun') return ['run', 'rerun', runId, '--failed', '--repo', repo];
  if (action === 'dispatch')
    return ['workflow', 'run', 'pages.yml', '--ref', 'main', '--repo', repo];
  throw new Error(`Unknown recovery action: ${JSON.stringify(action)}`);
}

// Reads the facts planRecovery needs through an injected GitHub API reader and
// performs the single chosen action through an injected actor, so the whole
// path runs under test without network access or side effects. observeOnly
// reports the decision without acting (first rollout, manual dry runs).
export async function recover({ runId, attempt, api, mainSha, act, observeOnly = false }) {
  assert.match(runId || '', /^\d+$/, 'Run id must be decimal');
  assert.match(attempt || '', /^\d+$/, 'Run attempt must be decimal');
  const base = `repos/${repository}`;
  const run = await api(`${base}/actions/runs/${runId}/attempts/${attempt}`);
  const pages = await api(
    '--paginate',
    '--slurp',
    `${base}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`
  );
  const jobs = pages.flatMap((page) => page.jobs);
  const annotations = {};
  // Only cancelled jobs (job deadline) and failed jobs (step deadline) can carry evidence.
  for (const job of jobs.filter((item) => ['cancelled', 'failure'].includes(item.conclusion)))
    annotations[job.id] = (
      await api('--paginate', '--slurp', `${base}/check-runs/${job.id}/annotations?per_page=100`)
    ).flat();
  const { workflow_runs: tipRuns } = await api(
    `${base}/actions/workflows/pages.yml/runs?branch=main&head_sha=${mainSha}&per_page=100`
  );
  const plan = planRecovery({ run, jobs, annotations, mainSha, tipRuns });
  if (plan.action === 'rerun') {
    // `gh run rerun` targets the newest attempt; never act on a stale decision.
    const latest = await api(`${base}/actions/runs/${runId}`);
    if (String(latest.run_attempt) !== String(attempt))
      return { action: 'none', reason: 'Run was rerun meanwhile', performed: false };
  }
  const performed = plan.action !== 'none' && !observeOnly;
  if (!performed) return { ...plan, performed };
  try {
    await act(plan.action);
  } catch (error) {
    // The decision must survive a failed action so it can be logged and summarised.
    return { ...plan, performed: false, failed: true, error: String(error?.message || error) };
  }
  return { ...plan, performed };
}
