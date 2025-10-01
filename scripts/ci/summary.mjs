import { readFile, appendFile } from 'node:fs/promises';

const mode = process.argv[2];
const run = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
let text = `## ${mode === 'production' ? 'Production verification' : 'Quality evidence'}\n\nSource: ${process.env.SOURCE_SHA}\n\n[Run, job timings and report artifacts](${run})\n\n`;

if (mode === 'quality') {
  const needs = JSON.parse(process.env.CHECK_RESULTS);
  text += '| Required job | Result |\n|---|---|\n';
  text += Object.entries(needs)
    .map(([name, value]) => `| ${name} | ${value.result} |`)
    .join('\n');
  text += `\n\nArtifact: ${process.env.ARTIFACT_NAME}, ID ${process.env.ARTIFACT_ID}\n\nContent SHA-256: ${process.env.CONTENT_SHA256}\n`;
} else if (mode === 'unit') {
  const tap = await readFile('work/qa/unit.tap', 'utf8');
  for (const label of [
    'tests',
    'pass',
    'fail',
    'cancelled',
    'skipped',
    'duration_ms'
  ]) {
    text += `${label}: ${tap.match(new RegExp(`^# ${label} (.+)$`, 'm'))?.[1] ?? 'not reported'}\n\n`;
  }
} else if (mode === 'coverage') {
  try {
    const summary = JSON.parse(
      await readFile('work/qa/coverage-summary.json', 'utf8')
    );
    text += `Tests: ${summary.tests}; shards: ${summary.shards}; skipped: ${summary.skipped}; flaky: ${summary.flaky}\n\n`;
    text +=
      '| Shard | Tests | Seconds | Workers | CPUs | Memory GiB |\n|---|---|---|---|---|---|\n';
    text += summary.reports
      .map(
        (r) =>
          `| ${r.index}/2 | ${r.tests} | ${(r.duration / 1000).toFixed(1)} | ${r.workers} | ${r.cpus} | ${r.memoryGiB.toFixed(1)} |`
      )
      .join('\n');
  } catch {
    text += 'Incomplete reports: quality gate must fail.\n';
  }
} else if (mode === 'production') {
  text += `Deployment completed: ${process.env.DEPLOYMENT_URL}\n\nProduction verification: ${process.env.RESULT}\n\nArtifact ID: ${process.env.ARTIFACT_ID}\n\nA verification failure does not perform an automatic rollback.\n`;
  for (const [name, path] of [
    ['Readiness', 'work/qa/production-readiness.json'],
    ['Endpoints', 'work/qa/verification-production.json'],
    ['Browser smoke', 'work/qa/production-smoke/results.json']
  ]) {
    try {
      const result = JSON.parse(await readFile(path, 'utf8'));
      const status =
        typeof result.passed === 'number'
          ? `${result.passed} passed, ${result.failed} failed`
          : result.passed === true
            ? 'passed'
            : 'failed';
      text += `\n${name}: ${status}\n`;
    } catch {
      text += `\n${name}: not completed\n`;
    }
  }
  // Read-only Actions access is scoped to this reporting job. Never print the token.
  try {
    const response = await fetch(
      `${process.env.GITHUB_API_URL}/repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}/jobs?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        },
        signal: AbortSignal.timeout(15000)
      }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { jobs } = await response.json();
    text +=
      '\nJob durations measured at this summary step (current job is still running):\n\n| Job | Result | Seconds |\n|---|---|---|\n';
    let seconds = 0;
    for (const job of jobs) {
      const duration = job.started_at
        ? Math.max(
            0,
            (new Date(job.completed_at || Date.now()) -
              new Date(job.started_at)) /
              1000
          )
        : 0;
      seconds += duration;
      text += `| [${job.name}](${job.html_url}) | ${job.conclusion || job.status} | ${duration.toFixed(1)} |\n`;
    }
    text += `\nRunner-minutes so far: ${(seconds / 60).toFixed(2)}. Final durations are in the linked run.\n`;
    const measuredSteps = new Set([
      'Install locked dependencies',
      'Generate site content',
      'Package site and metadata',
      'Test units and HTTP contracts',
      'Install Chromium dependencies',
      'Test assigned browser shard',
      'Verify artifact endpoints',
      'Wait for expected release',
      'Verify public endpoints',
      'Test published browser flows'
    ]);
    text += '\n| Job / phase | Result | Seconds |\n|---|---|---|\n';
    for (const job of jobs)
      for (const step of job.steps || []) {
        if (!measuredSteps.has(step.name) || !step.started_at) continue;
        const duration = Math.max(
          0,
          (new Date(step.completed_at || Date.now()) -
            new Date(step.started_at)) /
            1000
        );
        text += `| ${job.name} / ${step.name} | ${step.conclusion || step.status} | ${duration.toFixed(1)} |\n`;
      }
  } catch (error) {
    text += `\nJob timing API unavailable: ${error.message}. Use the linked Actions run.\n`;
  }
}

if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(process.env.GITHUB_STEP_SUMMARY, text + '\n');
console.log(text);
