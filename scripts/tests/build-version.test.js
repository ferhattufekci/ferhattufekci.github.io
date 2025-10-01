import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, cp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parseHTML } from 'linkedom';
import YAML from 'yaml';
import { packagePages } from '../package-pages.mjs';
import { inventory } from '../lib/public-files.mjs';
import { verifyMetadata, hash } from '../ci/build-metadata.mjs';
import { waitForRelease } from '../ci/verify-release.mjs';
import { resolveSource, repository } from '../ci/policy.mjs';
import { toMarkdown } from '../lib/agent-documents.mjs';
import { withProjectFixture } from './helpers/project-fixture.js';

const sha = 'a'.repeat(40);
const targets = ['index.html', 'about/index.html', 'contact/index.html', 'privacy/index.html', '404.html'];
const environment = {
  CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'ferhattufekci/ferhattufekci.github.io',
  GITHUB_WORKFLOW: 'Portfolio CI/CD', GITHUB_RUN_ID: '41706031837',
  GITHUB_RUN_NUMBER: '132', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'b'.repeat(40)
};
const expectedBuild = {
  runId: '41706031837', runNumber: '132', buildAttempt: '1',
  runUrl: 'https://github.com/ferhattufekci/ferhattufekci.github.io/actions/runs/41706031837'
};
const start = '<!-- BUILD-INFO:START -->', end = '<!-- BUILD-INFO:END -->';
const withoutBuild = html => html.replace(/(<!-- BUILD-INFO:START -->)[\s\S]*?(<!-- BUILD-INFO:END -->)/g, '$1$2');
async function snapshot(root) {
  const files = {};
  for (const path of await inventory(root)) files[path] = await readFile(join(root, path));
  return files;
}
async function packaged(root, env = environment) {
  const destination = await packagePages(root, sha, env);
  const metadata = await verifyMetadata(destination, sha);
  return { destination, metadata, bytes: await snapshot(destination) };
}
function document(html) { return parseHTML(String(html)).document; }

test('R-BUILD-B01 | AC01/02/04/08/10 | Resolved source, static link and manifest agree while every unrelated public byte and source stays intact', async () => {
  await withProjectFixture(async root => {
    const before = await snapshot(root);
    await mkdir(join(root, 'work'), { recursive: true });
    await writeFile(join(root, 'work', 'private-review.md'), 'Must not publish');
    const { destination, metadata, bytes } = await packaged(root);
    assert.equal(metadata.schemaVersion, 2);
    assert.equal(metadata.sourceSha, sha, 'Use resolved source, not GITHUB_SHA');
    assert.deepEqual(metadata.build, expectedBuild);
    assert.ok(!metadata.files.some(f => /^(work|docs|outputs)\//.test(f.path)));
    assert.ok(!metadata.files.some(f => f.path === 'build-metadata.json'));
    assert.deepEqual(await snapshot(root), before, 'Packaging never writes run identity into sources');
    for (const [path, original] of Object.entries(before)) {
      if (targets.includes(path)) {
        const html = bytes[path].toString();
        const links = document(html).querySelectorAll('a.build-info');
        assert.equal(links.length, 1, path);
        assert.equal(links[0].textContent.trim(), 'Build 132.1');
        assert.equal(links[0].getAttribute('href'), expectedBuild.runUrl);
        assert.equal(withoutBuild(html), withoutBuild(original.toString()), 'Only the bounded marker may change: ' + path);
      } else assert.deepEqual(bytes[path], original, path);
      assert.equal(metadata.files.find(f => f.path === path).sha256, hash(bytes[path]), path);
    }
    await verifyMetadata(destination, sha);
  });
});

test('R-BUILD-B02 | AC07 | Missing or hostile CI context fails before replacing an existing artifact', async () => {
  await withProjectFixture(async root => {
    const { destination } = await packaged(root);
    const prior = await readFile(join(destination, 'build-metadata.json'));
    const invalid = [
      { CI: 'true' },
      ...Object.keys(environment).filter(k => !['GITHUB_SHA', 'CI'].includes(k)).map(key => ({ ...environment, [key]: '' })),
      ...['0', '-1', '1.2', ' 132', '132\n', '1e3', '<img src=x>'].map(value => ({ ...environment, GITHUB_RUN_NUMBER: value })),
      { ...environment, GITHUB_RUN_ID: '132/../../evil' },
      { ...environment, GITHUB_RUN_ATTEMPT: '0' },
      { ...environment, GITHUB_SERVER_URL: 'javascript:alert(1)' },
      { ...environment, GITHUB_SERVER_URL: 'https://github.com.evil.test' },
      { ...environment, GITHUB_SERVER_URL: 'https://user:password@github.com' },
      { ...environment, GITHUB_REPOSITORY: 'attacker/fork' },
      { ...environment, GITHUB_WORKFLOW: 'Fetch Medium Articles' }
    ];
    for (const env of invalid) {
      await assert.rejects(packagePages(root, sha, env), /build|context|identity|workflow|repository|github|CI/i);
      assert.deepEqual(await readFile(join(destination, 'build-metadata.json')), prior, 'Invalid CI must not destroy the previous package');
    }
  });
});

test('R-BUILD-B03 | AC07 | Local packaging has no invented Actions link', async () => {
  await withProjectFixture(async root => {
    const { metadata, bytes } = await packaged(root, {});
    assert.equal(metadata.build, null);
    for (const path of targets) assert.equal(document(bytes[path]).querySelectorAll('a.build-info').length, 0, path);
  });
});

test('R-BUILD-B04 | AC03/05/11 | Same source in a new run or new build attempt has a new identity; a saved old artifact retains its own identity', async () => {
  await withProjectFixture(async root => {
    const first = await packaged(root);
    const newer = await packaged(root, { ...environment, GITHUB_RUN_ID: '41706039999', GITHUB_RUN_NUMBER: '133' });
    const rerun = await packaged(root, { ...environment, GITHUB_RUN_ATTEMPT: '2' });
    assert.equal(first.metadata.sourceSha, newer.metadata.sourceSha);
    assert.notEqual(first.metadata.contentSha256, newer.metadata.contentSha256);
    assert.equal(document(newer.bytes['index.html']).querySelector('a.build-info').textContent.trim(), 'Build 133.1');
    assert.equal(document(rerun.bytes['index.html']).querySelector('a.build-info').textContent.trim(), 'Build 132.2');
    assert.equal(first.metadata.build.buildAttempt, '1');
    assert.equal(document(first.bytes['index.html']).querySelector('a.build-info').textContent.trim(), 'Build 132.1');
    assert.equal(first.metadata.build.runUrl, expectedBuild.runUrl);
  });
});

test('R-BUILD-B05 | AC08 | Repackaging the same build is byte-identical and never duplicates the indicator', async () => {
  await withProjectFixture(async root => {
    const first = await packaged(root);
    const second = await packaged(root);
    assert.deepEqual(second.metadata, first.metadata);
    assert.deepEqual(second.bytes, first.bytes);
    for (const path of targets) assert.equal(document(second.bytes[path]).querySelectorAll('a.build-info').length, 1);
  });
});

test('R-BUILD-B06 | AC08/10 | Missing, duplicated and reversed insertion markers fail for every target shell', async () => {
  await withProjectFixture(async root => {
    for (const path of targets) {
      const original = await readFile(join(root, path), 'utf8');
      assert.equal(original.split(start).length - 1, 1, 'One source marker: ' + path);
      assert.equal(original.split(end).length - 1, 1, 'One source marker: ' + path);
      for (const broken of [original.replace(start, ''), original + start + end, original.replace(start, '__START__').replace(end, start).replace('__START__', end)]) {
        await writeFile(join(root, path), broken);
        await assert.rejects(packagePages(root, sha, environment), /marker|insertion|build/i, path);
      }
      await writeFile(join(root, path), original);
    }
  });
});

test('R-BUILD-B07 | AC03/04/05/12 | Workflow keeps resolved-source and exact-artifact deployment and distinguishes rebuilt attempts', async () => {
  // Resolve Source intentionally runs before npm ci. Exercise an isolated checkout
  // with no ancestor node_modules, not the developer's installed dependency tree.
  const bootstrap = await mkdtemp(join(tmpdir(), 'portfolio-ci-bootstrap-'));
  try {
    await cp('scripts/ci', join(bootstrap, 'scripts/ci'), { recursive: true });
    const eventPath = join(bootstrap, 'event.json');
    await writeFile(eventPath, JSON.stringify({ repository: { full_name: repository } }));
    const result = spawnSync(process.execPath, ['scripts/ci/commands.mjs', 'resolve'], {
      cwd: bootstrap, encoding: 'utf8', env: { ...process.env,
        GITHUB_EVENT_PATH: eventPath, GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_REF: 'refs/pull/24/merge', GITHUB_SHA: sha }
    });
    assert.equal(result.status, 0, 'Pre-install source resolution must succeed: ' + result.stderr);
    assert.match(result.stdout, new RegExp(`sha=${sha}`));
    assert.match(result.stdout, /publish=false/);
  } finally {
    await rm(bootstrap, { recursive: true, force: true });
  }
  const p = YAML.parse(await readFile('.github/workflows/pages.yml', 'utf8'));
  const q = YAML.parse(await readFile('.github/workflows/test-agent-readiness.yml', 'utf8'));
  const build = q.jobs['build-site'];
  const upload = build.steps.find(s => s.uses?.startsWith('actions/upload-pages-artifact@'));
  const render = (template, runId, attempt) => template.replace(/\$\{\{\s*inputs.source-sha\s*\}\}/g, sha)
    .replace(/\$\{\{\s*github.run_id\s*\}\}/g, runId).replace(/\$\{\{\s*github.run_attempt\s*\}\}/g, attempt);
  const first = render(upload.with.name, '41706031837', '1');
  assert.notEqual(first, render(upload.with.name, '41706031837', '2'), 'A rebuilt attempt cannot collide with its old immutable artifact');
  assert.notEqual(first, render(upload.with.name, '41706039999', '1'));
  assert.equal(build.outputs['artifact-name'], upload.with.name);
  const deploy = p.jobs['deploy-pages'];
  assert.equal(deploy.steps.find(s => s.uses?.startsWith('actions/deploy-pages@')).with.artifact_name, '${{ needs.quality-checks.outputs.artifact-name }}');
  for (const job of [deploy, p.jobs['verify-production']]) assert.ok(!job.steps.some(s => /package:pages|npm run generate/.test(s.run || '')), 'Deploy and smoke must never repackage/relabel');
  assert.ok(deploy.steps.some(s => s.run === 'node scripts/ci/commands.mjs current "$SOURCE_SHA"'));
  const source = resolveSource('workflow_run', {
    repository: { full_name: repository }, workflow_run: {
      name: 'Fetch Medium Articles', path: '.github/workflows/fetch-medium.yml',
      head_repository: { full_name: repository }, head_branch: 'main', conclusion: 'success', event: 'schedule', head_sha: 'b'.repeat(40)
    }
  }, '', 'b'.repeat(40), sha);
  assert.deepEqual(source, { sha, publish: true });
});

test('R-BUILD-B08 | AC08 | Generated reading content excludes build chrome', () => {
  const html = '<html><body><main><h1>Portfolio content</h1></main><a class="build-info" href="https://github.com/ferhattufekci/ferhattufekci.github.io/actions/runs/41706031837">Build 132.1</a></body></html>';
  assert.equal(toMarkdown(html, 'https://ferhattufekci.github.io'), '# Portfolio content\n');
});

test('R-BUILD-B09 | AC01/05 | Manifest verification rejects forged build identity and remains independent of a later deploy attempt environment', async () => {
  await withProjectFixture(async root => {
    const { destination, metadata } = await packaged(root);
    for (const build of [{ ...expectedBuild, runUrl: 'https://evil.test/' }, { ...expectedBuild, runNumber: '133' }]) {
      await writeFile(join(destination, 'build-metadata.json'), JSON.stringify({ ...metadata, build }));
      await assert.rejects(verifyMetadata(destination, sha), /build|identity|run|link/i);
    }
    await writeFile(join(destination, 'build-metadata.json'), JSON.stringify(metadata));
    const before = await readFile(join(destination, 'build-metadata.json'));
    const priorAttempt = process.env.GITHUB_RUN_ATTEMPT;
    try {
      process.env.GITHUB_RUN_ATTEMPT = '99';
      assert.deepEqual((await verifyMetadata(destination, sha)).build, expectedBuild);
      assert.deepEqual(await readFile(join(destination, 'build-metadata.json')), before);
    } finally {
      if (priorAttempt === undefined) delete process.env.GITHUB_RUN_ATTEMPT;
      else process.env.GITHUB_RUN_ATTEMPT = priorAttempt;
    }
  });
});

test('R-BUILD-B10 | AC03/11 | Readiness rejects an older build on the same SHA and mixed old HTML, then accepts exact tested bytes', async () => {
  await withProjectFixture(async root => {
    const old = await packaged(root);
    const current = await packaged(root, { ...environment, GITHUB_RUN_ATTEMPT: '2' });
    async function readiness(servedMeta, servedBytes) {
      let time = 0;
      return waitForRelease('https://example.test/', current.metadata, {
        timeoutMs: 30, intervalMs: 10, now: () => time, sleep: async ms => { time += ms; },
        fetcher: async url => {
          const path = new URL(url).pathname.slice(1);
          return path === 'build-metadata.json'
            ? { status: 200, json: async () => servedMeta }
            : { status: servedBytes[path] ? 200 : 404, arrayBuffer: async () => servedBytes[path] };
        }
      });
    }
    assert.equal((await readiness(old.metadata, old.bytes)).passed, false, 'HTTP200 and same source SHA are insufficient');
    assert.equal((await readiness(current.metadata, { ...current.bytes, 'index.html': old.bytes['index.html'] })).passed, false);
    assert.equal((await readiness(current.metadata, current.bytes)).passed, true);
  });
});
