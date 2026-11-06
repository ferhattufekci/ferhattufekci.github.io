import assert from 'node:assert/strict';
import { planRecovery, repository } from './policy.mjs';

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
  // Only cancelled jobs can carry deadline evidence.
  for (const job of jobs.filter((item) => item.conclusion === 'cancelled'))
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
  if (performed) await act(plan.action);
  return { ...plan, performed };
}
