import {
  readFile,
  writeFile,
  appendFile,
  readdir,
  mkdir,
  rm,
  copyFile
} from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  requireQuality,
  requireCurrentSource,
  resolveSource,
  planRecovery,
  repository,
  validateCoverage
} from './policy.mjs';

const [command, ...args] = process.argv.slice(2);
async function output(name, value) {
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  console.log(`${name}=${value}`);
}
if (command === 'resolve') {
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, 'utf8')
  );
  let main;
  if (process.env.GITHUB_EVENT_NAME === 'workflow_run') {
    // Check all trust fields before contacting a moving branch or executing its code.
    resolveSource('workflow_run', event, '', '', '0'.repeat(40));
    main = execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], {
      encoding: 'utf8'
    }).split(/\s/)[0];
  }
  const source = resolveSource(
    process.env.GITHUB_EVENT_NAME,
    event,
    process.env.GITHUB_REF,
    process.env.GITHUB_SHA,
    main
  );
  await output('sha', source.sha);
  await output('publish', source.publish);
} else if (command === 'gate')
  requireQuality(JSON.parse(process.env.CHECK_RESULTS));
else if (command === 'current') {
  const actual = execFileSync(
    'git',
    ['ls-remote', 'origin', 'refs/heads/main'],
    { encoding: 'utf8' }
  ).split(/\s/)[0];
  requireCurrentSource(args[0], actual);
} else if (command === 'recover') {
  // Reads facts with the workflow token, asks the pure policy, performs one action.
  const runId = args[0];
  assert.match(runId || '', /^\d+$/, 'Run id must be decimal');
  const attempt = args[1];
  assert.match(attempt || '', /^\d+$/, 'Run attempt must be decimal');
  const gh = (...parts) =>
    JSON.parse(execFileSync('gh', ['api', ...parts], { encoding: 'utf8' }));
  const base = `repos/${repository}`;
  const run = gh(`${base}/actions/runs/${runId}/attempts/${attempt}`);
  const { jobs } = gh('--paginate', '--slurp', `${base}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`)
    .reduce((all, page) => ({ jobs: all.jobs.concat(page.jobs) }), { jobs: [] });
  const annotations = {};
  for (const job of jobs.filter((item) => item.conclusion === 'cancelled'))
    annotations[job.id] = gh(`${base}/check-runs/${job.id}/annotations`);
  const mainSha = execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], {
    encoding: 'utf8'
  }).split(/\s/)[0];
  const tipRuns = gh(
    `${base}/actions/workflows/pages.yml/runs?branch=main&head_sha=${mainSha}&per_page=100`
  ).workflow_runs;
  const plan = planRecovery({ run, jobs, annotations, mainSha, tipRuns });
  console.log(`recovery=${plan.action} (${plan.reason})`);
  if (plan.action === 'rerun')
    execFileSync('gh', ['run', 'rerun', runId, '--failed', '--repo', repository], { stdio: 'inherit' });
  else if (plan.action === 'dispatch')
    execFileSync('gh', ['workflow', 'run', 'pages.yml', '--ref', 'main', '--repo', repository], { stdio: 'inherit' });
} else if (command === 'artifact') {
  const { verifyMetadata } = await import('./build-metadata.mjs');
  const metadata = await verifyMetadata(
    args[0] || '.pages-site',
    process.env.SOURCE_SHA || args[1]
  );
  await output('content-sha256', metadata.contentSha256);
} else if (command === 'coverage') {
  const reports = [], errors = [];
  const upstream = JSON.parse(process.env.CHECK_RESULTS || '{}');
  let expected, blobs = 0;
  // A local rerun must not publish a previous run's summary or merge stale blobs.
  await rm('work/qa/coverage-summary.json', { force: true });
  await rm('work/qa/all-blob-reports', { recursive: true, force: true });
  await mkdir('work/qa/all-blob-reports', { recursive: true });
  try {
    expected = JSON.parse(await readFile('work/qa/expected-tests.json', 'utf8'));
  } catch (error) {
    errors.push(error.code === 'ENOENT'
      ? 'Missing expected test inventory (check build-site and test-inventory download)'
      : `Invalid expected test inventory: ${error.message}`);
  }
  for (const index of [1, 2]) {
    const base = `work/qa/shards/browser-report-${index}`;
    try {
      reports.push(JSON.parse(await readFile(`${base}/coverage.json`, 'utf8')));
    } catch (error) {
      errors.push(error.code === 'ENOENT'
        ? `Missing shard ${index} coverage report (${base}/coverage.json)`
        : `Invalid shard ${index} coverage report: ${error.message}`);
    }
    // Diagnostic blobs are useful even when coverage is missing or a test failed.
    try {
      const files = (await readdir(`${base}/blob`)).filter(name => name.endsWith('.zip'));
      if (files.length !== 1) throw new Error('expected exactly one blob ZIP');
      await copyFile(`${base}/blob/${files[0]}`, `work/qa/all-blob-reports/shard-${index}.zip`);
      blobs++;
    } catch (error) {
      errors.push(`Missing or ambiguous blob for shard ${index}: ${error.code === 'ENOENT' ? 'no blob directory' : error.message}`);
    }
  }
  let summary;
  if (expected !== undefined) {
    try {
      summary = validateCoverage(expected, reports);
    } catch (error) {
      errors.push(`Coverage rejected: ${error.message}`);
    }
  }
  await writeFile('work/qa/coverage-diagnostics.json', JSON.stringify({ upstream, blobs, errors }, null, 2));
  // Output before failing so the workflow can still merge available diagnostics.
  await output('blobs', blobs);
  if (errors.length) {
    console.error(`Browser coverage incomplete or failed. Upstream: ${Object.entries(upstream).map(([name, job]) => `${name}=${job.result}`).join(', ') || 'not supplied'}`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    await writeFile('work/qa/coverage-summary.json', JSON.stringify({
        ...summary,
        reports: reports.map(({ results, assigned, ...rest }) => ({
          ...rest,
          tests: results.length
        }))
      }, null, 2));
    await output('tests', summary.tests);
  }
} else throw new Error(`Unknown CI command: ${command}`);
