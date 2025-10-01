import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/public-files.mjs';
import { requiredChecks } from '../ci/policy.mjs';

test('R-PIPE-13: real Playwright blobs merge successful and failed results while incomplete coverage and mandatory jobs block the gate', async () => {
  const workspace = resolve(ROOT, 'work');
  await mkdir(workspace, { recursive: true });
  const root = await mkdtemp(join(workspace, 'ci-real-report-flow-'));
  const commands = join(ROOT, 'scripts/ci/commands.mjs');
  const playwright = join(ROOT, 'node_modules/@playwright/test/cli.js');
  const run = (args, env = {}) => spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, CI_SHARD: '', TEST_INVENTORY: '', GITHUB_OUTPUT: join(root, 'outputs.txt'), ...env }
  });
  const expectExit = (result, code) => assert.equal(result.status, code, result.stdout + '\n' + result.stderr);
  const json = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
  const removeShard = async index => {
    const path = resolve(root, `work/qa/shards/browser-report-${index}`);
    assert.equal(dirname(path), resolve(root, 'work/qa/shards'));
    await rm(path, { recursive: true, force: true });
  };
  const publishShard = async index => {
    await removeShard(index);
    await cp(join(root, `work/qa/shard-${index}`), join(root, `work/qa/shards/browser-report-${index}`), { recursive: true });
  };
  const coverage = (needs = {}) => run([commands, 'coverage'], { CHECK_RESULTS: JSON.stringify(needs) });
  const merge = () => {
    expectExit(run([playwright, 'merge-reports', '--config=merge.config.mjs', 'work/qa/all-blob-reports']), 0);
    return json('work/qa/merged-results.json');
  };
  const passedJobs = Object.fromEntries(requiredChecks.map(name => [name, { result: 'success' }]));
  const gate = needs => run([commands, 'gate'], { CHECK_RESULTS: JSON.stringify(needs) });
  try {
    // Real assertion outcomes and native reporters exercise the report format;
    // these fixture tests do not launch a browser or replace the mandatory suite.
    await writeFile(join(root, 'first.spec.mjs'), "import {test,expect} from '@playwright/test'; test('first result',()=>expect(2 + 2).toBe(4));");
    await writeFile(join(root, 'second.spec.mjs'), "import {test,expect} from '@playwright/test'; test('second result',()=>expect(process.env.FAIL_REPORT_FIXTURE || 'passed').toBe('passed'));");
    await writeFile(join(root, 'playwright.config.mjs'), `export default {
      testDir: '.', testMatch: '*.spec.mjs', workers: 1, retries: 0,
      reporter: [['blob', {outputDir: 'work/qa/shard-' + process.env.CI_SHARD + '/blob'}],
        [${JSON.stringify(join(ROOT, 'scripts/ci/coverage-reporter.mjs'))}]]
    };`);
    await writeFile(join(root, 'merge.config.mjs'), await readFile(join(ROOT, 'playwright.merge.config.mjs'), 'utf8'));
    expectExit(run([playwright, 'test', '--list', `--reporter=${join(ROOT, 'scripts/ci/coverage-reporter.mjs')}`], {
      TEST_INVENTORY: 'work/qa/expected-tests.json'
    }), 0);
    for (const index of [1, 2])
      expectExit(run([playwright, 'test', `--shard=${index}/2`], { CI_SHARD: String(index) }), 0);

    // A missing first shard must not prevent collecting the second shard.
    await publishShard(2);
    const partial = coverage();
    expectExit(partial, 1);
    assert.doesNotMatch(partial.stderr, /ENOENT/);
    assert.match(partial.stderr, /Missing shard 1 coverage/);
    assert.match(partial.stdout, /blobs=1/);
    assert.equal((await merge()).stats.expected, 1);
    expectExit(gate({ ...passedJobs, 'merge-test-reports': { result: 'failure' } }), 1);

    await publishShard(1);
    expectExit(coverage(), 0);
    assert.equal((await json('work/qa/coverage-summary.json')).tests, 2);
    const passed = await merge();
    assert.equal(passed.stats.expected, 2);
    assert.equal(passed.stats.unexpected, 0);
    assert.equal(passed.stats.skipped, 0);
    expectExit(gate(passedJobs), 0);

    // A failed test still has a readable, nonempty blob and failure details.
    expectExit(run([playwright, 'test', '--shard=2/2'], { CI_SHARD: '2', FAIL_REPORT_FIXTURE: 'intentional failure' }), 1);
    await publishShard(2);
    const failed = coverage({ 'browser-tests': { result: 'failure' } });
    expectExit(failed, 1);
    assert.match(failed.stdout, /blobs=2/);
    const failedReport = await merge();
    assert.equal(failedReport.stats.expected, 1);
    assert.equal(failedReport.stats.unexpected, 1);
    assert.ok(JSON.stringify(failedReport).includes('intentional failure'));
    await assert.rejects(readFile(join(root, 'work/qa/coverage-summary.json')), { code: 'ENOENT' });
    expectExit(gate({ ...passedJobs, 'browser-tests': { result: 'failure' } }), 1);

    for (const index of [1, 2]) await removeShard(index);
    const upstream = { 'unit-tests': { result: 'failure' }, 'browser-tests': { result: 'skipped' } };
    const absent = coverage(upstream);
    expectExit(absent, 1);
    assert.match(absent.stdout, /blobs=0/);
    assert.match(absent.stderr, /browser-tests=skipped/);
    assert.equal((await json('work/qa/coverage-diagnostics.json')).blobs, 0);
    expectExit(gate({ ...passedJobs, ...upstream }), 1);
  } finally {
    assert.equal(dirname(root), workspace);
    await rm(root, { recursive: true, force: true });
  }
});
