import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/public-files.mjs';
import YAML from 'yaml';

async function withReports(callback) {
  const workspace = resolve(ROOT, 'work');
  await mkdir(workspace, { recursive: true });
  const root = await mkdtemp(join(workspace, 'ci-reports-'));
  const put = async (path, value) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), value);
  };
  try {
    await callback({ root, put });
  } finally {
    assert.equal(dirname(root), workspace);
    await rm(root, { recursive: true, force: true });
  }
}
function coverage(root, needs = {}) {
  return spawnSync(process.execPath, [join(ROOT, 'scripts/ci/commands.mjs'), 'coverage'], {
    cwd: root,
    env: { ...process.env, CHECK_RESULTS: JSON.stringify(needs), GITHUB_OUTPUT: join(root, 'outputs.txt') },
    encoding: 'utf8'
  });
}

test('R-PIPE-08: skipped upstream and absent reports produce actionable diagnostics without raw filesystem errors or stale evidence', async () => {
  await withReports(async ({ root, put }) => {
    await put('work/qa/coverage-summary.json', '{"tests":999}');
    await put('work/qa/all-blob-reports/stale.zip', 'stale');
    const cli = coverage(root, { 'unit-tests': { result: 'failure' }, 'browser-tests': { result: 'skipped' } });
    assert.equal(cli.status, 1);
    assert.doesNotMatch(cli.stderr, /ENOENT|No report files found/);
    assert.match(cli.stderr, /Missing expected test inventory/);
    assert.match(cli.stderr, /shard 1.*coverage/i);
    assert.match(cli.stderr, /shard 2.*coverage/i);
    assert.match(cli.stderr, /browser-tests=skipped/);
    assert.equal(await readFile(join(root, 'outputs.txt'), 'utf8'), 'blobs=0\n');
    assert.deepEqual(await readdir(join(root, 'work/qa/all-blob-reports')), []);
    await assert.rejects(readFile(join(root, 'work/qa/coverage-summary.json')), { code: 'ENOENT' });
    const diagnostic = JSON.parse(await readFile(join(root, 'work/qa/coverage-diagnostics.json'), 'utf8'));
    assert.equal(diagnostic.upstream['unit-tests'].result, 'failure');
    assert.equal(diagnostic.blobs, 0);
    assert.ok(diagnostic.errors.length >= 3);
  });
});

test('R-PIPE-09: failed or partial shards retain every available blob while strict coverage fails', async () => {
  for (const missing of ['coverage', 'blob', 'shard']) {
    await withReports(async ({ root, put }) => {
      await put('work/qa/expected-tests.json', '["a","b"]');
      await put('work/qa/shards/browser-report-1/blob/report.zip', 'first diagnostic');
      await put('work/qa/shards/browser-report-1/coverage.json', JSON.stringify({
        index: 1, total: 2, status: 'failed', assigned: ['a'],
        results: [{ id: 'a', status: 'failed', retry: 0 }]
      }));
      if (missing !== 'shard') {
        if (missing !== 'blob') await put('work/qa/shards/browser-report-2/blob/report.zip', 'second diagnostic');
        if (missing !== 'coverage') await put('work/qa/shards/browser-report-2/coverage.json', JSON.stringify({
          index: 2, total: 2, status: 'passed', assigned: ['b'],
          results: [{ id: 'b', status: 'passed', retry: 0 }]
        }));
      }
      const cli = coverage(root, { 'browser-tests': { result: 'failure' } });
      assert.equal(cli.status, 1);
      assert.doesNotMatch(cli.stderr, /ENOENT/);
      assert.match(cli.stderr, /Coverage rejected/);
      const count = missing === 'coverage' ? 2 : 1;
      assert.equal(await readFile(join(root, 'outputs.txt'), 'utf8'), `blobs=${count}\n`);
      assert.equal(await readFile(join(root, 'work/qa/all-blob-reports/shard-1.zip'), 'utf8'), 'first diagnostic');
      await assert.rejects(readFile(join(root, 'work/qa/coverage-summary.json')), { code: 'ENOENT' });
    });
  }
});

test('R-PIPE-10: complete disjoint passed shards publish verified coverage; malformed reports cannot pass', async () => {
  await withReports(async ({ root, put }) => {
    await put('work/qa/expected-tests.json', '["a","b"]');
    for (const [index, id] of [[1, 'a'], [2, 'b']]) {
      await put(`work/qa/shards/browser-report-${index}/blob/report.zip`, `diagnostic ${index}`);
      await put(`work/qa/shards/browser-report-${index}/coverage.json`, JSON.stringify({
        index, total: 2, status: 'passed', assigned: [id], results: [{ id, status: 'passed', retry: 0 }]
      }));
    }
    const cli = coverage(root);
    assert.equal(cli.status, 0, cli.stderr);
    const summary = JSON.parse(await readFile(join(root, 'work/qa/coverage-summary.json'), 'utf8'));
    assert.equal(summary.tests, 2);
    assert.equal(summary.shards, 2);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.flaky, 0);
    await put('work/qa/expected-tests.json', 'null');
    const invalidInventory = coverage(root);
    assert.equal(invalidInventory.status, 1);
    assert.match(invalidInventory.stderr, /Coverage rejected/);
    await assert.rejects(readFile(join(root, 'work/qa/coverage-summary.json')), { code: 'ENOENT' });
    await put('work/qa/expected-tests.json', '["a","b"]');
    await put('work/qa/shards/browser-report-2/coverage.json', '{broken');
    assert.equal(coverage(root).status, 1);
    const diagnostic = JSON.parse(await readFile(join(root, 'work/qa/coverage-diagnostics.json'), 'utf8'));
    assert.equal(diagnostic.blobs, 2);
    assert.ok(diagnostic.errors.some(error => error.includes('Invalid shard 2 coverage')));
    await assert.rejects(readFile(join(root, 'work/qa/coverage-summary.json')), { code: 'ENOENT' });
  });
});

test('R-PIPE-11: report workflow diagnoses skipped upstream, merges available failed-test blobs and uploads only existing reports', async () => {
  const q = YAML.parse(await readFile(join(ROOT, '.github/workflows/test-agent-readiness.yml'), 'utf8'));
  const job = q.jobs['merge-test-reports'];
  assert.equal(job.if, 'always()');
  for (const name of ['build-site', 'browser-tests', 'unit-tests', 'static-checks']) assert.ok(job.needs.includes(name));
  const inspect = job.steps.find(step => step.run === 'node scripts/ci/commands.mjs coverage');
  assert.equal(inspect.id, 'coverage');
  assert.match(inspect.if, /always\(\)/);
  assert.equal(inspect.env.CHECK_RESULTS, '${{ toJSON(needs) }}');
  const merge = job.steps.find(step => step.name === 'Merge browser reports');
  assert.equal(merge.if, "always() && steps.coverage.outputs.blobs != '' && steps.coverage.outputs.blobs != '0'");
  const upload = job.steps.find(step => step.name === 'Publish merged-browser-report');
  assert.match(upload.if, /always\(\).*hashFiles\(/);
  assert.doesNotMatch(upload.if, /coverage\.outcome == 'success'/);
  assert.ok(job.steps.some(step => step.with?.name === 'browser-coverage-diagnostics' && /hashFiles\(/.test(step.if)));
  const shardUpload = q.jobs['browser-tests'].steps.find(step => step.with?.name === 'browser-report-${{ matrix.shard }}');
  assert.equal(shardUpload.if, "always() && hashFiles(format('work/qa/shard-{0}/**', matrix.shard)) != ''");
  const p = YAML.parse(await readFile(join(ROOT, '.github/workflows/pages.yml'), 'utf8'));
  assert.ok(p.jobs['deploy-pages'].needs.includes('quality-checks'));
  assert.doesNotMatch(p.jobs['deploy-pages'].if, /always\(\)/);
});

test('R-PIPE-12: coverage summary exposes the failed upstream and missing shard evidence', async () => {
  await withReports(async ({ root }) => {
    assert.equal(coverage(root, { 'unit-tests': { result: 'failure' }, 'browser-tests': { result: 'skipped' } }).status, 1);
    const cli = spawnSync(process.execPath, [join(ROOT, 'scripts/ci/summary.mjs'), 'coverage'], {
      cwd: root, env: { ...process.env, GITHUB_STEP_SUMMARY: join(root, 'summary.md') }, encoding: 'utf8'
    });
    assert.equal(cli.status, 0, cli.stderr);
    const summary = await readFile(join(root, 'summary.md'), 'utf8');
    assert.match(summary, /unit-tests.*failure/);
    assert.match(summary, /browser-tests.*skipped/);
    assert.match(summary, /Missing shard 1 coverage/);
    assert.match(summary, /Missing shard 2 coverage/);
  });
});
