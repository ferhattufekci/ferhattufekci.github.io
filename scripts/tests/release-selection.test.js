import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { repository } from '../ci/policy.mjs';

const run = promisify(execFile);
const selected = 'a'.repeat(40);
const newer = 'b'.repeat(40);
const token = 'fixture-token';
const main = 'refs/heads/main';
const writer = {
  repository: { full_name: repository },
  workflow_run: {
    name: 'Fetch Medium Articles',
    path: '.github/workflows/fetch-medium.yml',
    head_repository: { full_name: repository },
    head_branch: 'main',
    conclusion: 'success',
    event: 'schedule'
  }
};

async function withReleaseFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'release-selection-'));
  const requests = [];
  let status = 200;
  let response = { object: { sha: selected } };
  const server = createServer((request, reply) => {
    requests.push({
      method: request.method, path: request.url, authorization: request.headers.authorization
    });
    reply.writeHead(status, { 'Content-Type': 'application/json' });
    reply.end(JSON.stringify(response));
  });
  t.after(async () => {
    try {
      if (server.listening) {
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const eventPath = join(root, 'event.json');
  const summaryPath = join(root, 'summary.md');
  return {
    requests,
    response(code, body) {
      status = code;
      response = body;
    },
    summary: () => readFile(summaryPath, 'utf8'),
    async call(command, { event = {}, trigger = 'workflow_dispatch', ref = main, sha = selected, credential = token } = {}) {
      await writeFile(eventPath, JSON.stringify({ repository: { full_name: repository }, ...event }));
      return run(process.execPath, ['scripts/ci/commands.mjs', ...command], {
        env: {
          ...process.env,
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_EVENT_NAME: trigger,
          GITHUB_REF: ref,
          GITHUB_SHA: sha,
          GITHUB_API_URL: `http://127.0.0.1:${server.address().port}`,
          GITHUB_OUTPUT: '',
          GITHUB_STEP_SUMMARY: summaryPath,
          GH_TOKEN: credential,
          GIT_CONFIG_COUNT: '1',
          GIT_CONFIG_KEY_0: 'protocol.https.allow',
          GIT_CONFIG_VALUE_0: 'never'
        },
        timeout: 5000
      });
    }
  };
}

const refRequest = {
  method: 'GET',
  path: `/repos/${repository}/git/ref/heads/main`,
  authorization: `Bearer ${token}`
};
const select = release_sha => ({ inputs: { release_sha } });

test('R-RELEASE-01: a trusted writer authenticates to read main once and can only validate', async t => {
  const fixture = await withReleaseFixture(t);
  await assert.rejects(fixture.call(['resolve'], {
    trigger: 'workflow_run',
    event: { ...writer, workflow_run: { ...writer.workflow_run, head_branch: 'feature' } }
  }), /Unexpected source branch/);
  assert.deepEqual(fixture.requests, []);
  const { stdout } = await fixture.call(['resolve'], { trigger: 'workflow_run', event: writer, sha: newer });
  assert.match(stdout, new RegExp(`^sha=${selected}$`, 'm'));
  assert.match(stdout, /^publish=false$/m);
  assert.deepEqual(fixture.requests, [refRequest]);
});

test('R-RELEASE-02: main dispatch publishes only an exact, explicit main SHA', async t => {
  const fixture = await withReleaseFixture(t);
  const validation = await fixture.call(['resolve']);
  assert.match(validation.stdout, /^publish=false$/m);
  const approved = await fixture.call(['resolve'], { event: select(selected) });
  assert.match(approved.stdout, new RegExp(`^sha=${selected}$`, 'm'));
  assert.match(approved.stdout, /^publish=true$/m);
  for (const input of [
    { event: select(selected.slice(0, 7)) },
    { event: select(newer) },
    { event: select(selected), ref: 'refs/heads/feature' }
  ]) await assert.rejects(fixture.call(['resolve'], input), { code: 1 });
});

test('R-RELEASE-03: pre-deploy verifies the selected SHA, records it, and rejects a newer main tip', async t => {
  const fixture = await withReleaseFixture(t);
  const { stdout } = await fixture.call(['current', selected]);
  assert.match(stdout, new RegExp(selected));
  assert.match(await fixture.summary(), new RegExp(selected));
  assert.deepEqual(fixture.requests, [refRequest]);
  fixture.response(200, { object: { sha: newer } });
  await assert.rejects(fixture.call(['current', selected]), /Superseded source/);
  assert.deepEqual(fixture.requests, [refRequest, refRequest]);
});

test('R-RELEASE-04: missing credentials and invalid authenticated responses fail closed', async t => {
  const fixture = await withReleaseFixture(t);
  await assert.rejects(fixture.call(['current', selected], { credential: '' }), { code: 1 });
  assert.deepEqual(fixture.requests, []);
  fixture.response(403, { message: token });
  await assert.rejects(fixture.call(['current', selected]), error => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /403/);
    assert.doesNotMatch(error.stderr, new RegExp(token));
    return true;
  });
  fixture.response(200, { object: { sha: 'bad-ref' } });
  await assert.rejects(fixture.call(['current', selected]), { code: 1 });
});
