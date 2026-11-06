import assert from 'node:assert/strict';
import { planRecovery, repository } from './policy.mjs';

// Reads the facts planRecovery needs through an injected GitHub API reader and
// performs the single chosen action through an injected actor, so the whole
// path runs under test without network access or side effects.
export async function recover({ runId, attempt, api, mainSha, act }) {
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
    annotations[job.id] = await api(`${base}/check-runs/${job.id}/annotations`);
  const { workflow_runs: tipRuns } = await api(
    `${base}/actions/workflows/pages.yml/runs?branch=main&head_sha=${mainSha}&per_page=100`
  );
  const plan = planRecovery({ run, jobs, annotations, mainSha, tipRuns });
  if (plan.action !== 'none') await act(plan.action);
  return plan;
}
