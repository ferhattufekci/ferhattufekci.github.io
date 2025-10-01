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
  validateCoverage
} from './policy.mjs';
import { verifyMetadata } from './build-metadata.mjs';

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
} else if (command === 'artifact') {
  const metadata = await verifyMetadata(
    args[0] || '.pages-site',
    process.env.SOURCE_SHA || args[1]
  );
  await output('content-sha256', metadata.contentSha256);
} else if (command === 'coverage') {
  const expected = JSON.parse(
    await readFile('work/qa/expected-tests.json', 'utf8')
  );
  const reports = [];
  // A local rerun must not publish a previous run's summary or merge stale blobs.
  await rm('work/qa/coverage-summary.json', { force: true });
  await rm('work/qa/all-blob-reports', { recursive: true, force: true });
  await mkdir('work/qa/all-blob-reports', { recursive: true });
  for (const index of [1, 2]) {
    const base = `work/qa/shards/browser-report-${index}`;
    reports.push(JSON.parse(await readFile(`${base}/coverage.json`, 'utf8')));
    const blobs = (await readdir(`${base}/blob`)).filter((name) =>
      name.endsWith('.zip')
    );
    if (blobs.length !== 1)
      throw new Error(`Missing or ambiguous blob for shard ${index}`);
    await copyFile(
      `${base}/blob/${blobs[0]}`,
      `work/qa/all-blob-reports/shard-${index}.zip`
    );
  }
  const summary = validateCoverage(expected, reports);
  await writeFile(
    'work/qa/coverage-summary.json',
    JSON.stringify(
      {
        ...summary,
        reports: reports.map(({ results, assigned, ...rest }) => ({
          ...rest,
          tests: results.length
        }))
      },
      null,
      2
    )
  );
  await output('tests', summary.tests);
} else throw new Error(`Unknown CI command: ${command}`);
