import {
  readFile,
  writeFile,
  appendFile,
  readdir,
  mkdir,
  rm,
  copyFile
} from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import {
  requireQuality,
  requireCurrentSource,
  resolveSource,
  repository,
  validateCoverage
} from './policy.mjs';
import { actionArgv, recover } from './recovery.mjs';

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
  const gh = (...parts) =>
    JSON.parse(execFileSync('gh', ['api', ...parts], { encoding: 'utf8' }));
  const mainSha = execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], {
    encoding: 'utf8'
  }).split(/\s/)[0];
  const act = (action) => {
    const [runId] = args;
    execFileSync('gh', actionArgv(action, runId), { stdio: 'inherit' });
  };
  // Acting is opt-in (repository variable); everything else only reports.
  const observeOnly = process.env.RECOVERY_ACT !== 'true';
  const plan = await recover({ runId: args[0], attempt: args[1], api: gh, mainSha, act, observeOnly });
  const performed = plan.failed ? 'failed' : plan.performed;
  const line = `recovery=${plan.action} mode=${observeOnly ? 'observe' : 'act'} performed=${performed} (${plan.reason})${plan.failed ? ` error=${JSON.stringify(plan.error)}` : ''}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `## Release recovery\n\nRun \`${args[0]}\` attempt \`${args[1]}\` against main \`${mainSha}\`.\n\n- Decision: **${plan.action}**\n- Mode: ${observeOnly ? 'observe only (no action taken)' : 'act'}\n- Performed: ${performed}\n- Reason: ${plan.reason}\n${plan.failed ? `- Error: ${plan.error}\n` : ''}`
    );
  // A failed action stays visible as a failed step, after the record was written.
  if (plan.failed) process.exitCode = 1;
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
