import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const execute = promisify(execFile);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const files = ['medium-all.json', 'medium-systems.json', 'medium-test.json',
  'medium-software.json', 'meta.json', 'github-repos.json', 'github-meta.json', 'github-starred.json'];
const introduction = 'Clear requirements help every stakeholder understand the same intended behavior.';
const article = (id, title, tag, description = introduction) => `<item>
  <title>${title}</title><link>https://medium.com/@ferhattufekci/article-${id}</link>
  <pubDate>Wed, 28 Oct 2026 00:00:00 GMT</pubDate><category>${tag}</category>
  <description>${description}</description></item>`;
const rss = `<rss><channel>${article('aaaaaaaaaaaa', 'Requirements engineering', 'requirements', '')}
  ${article('bbbbbbbbbbbb', 'QA testing', 'testing')}
  ${article('cccccccccccc', 'Java backend', 'java')}
  ${article('1ee2f58f131d', 'About Me', 'systems')}</channel></rss>`;
const repo = (name, stars = 0, extra = {}) => ({
  name, description: 'Java backend', html_url: `https://github.com/ferhattufekci/${name}`,
  owner: { login: 'ferhattufekci' }, language: 'Java', topics: ['java'],
  stargazers_count: stars, forks_count: 0, pushed_at: '2026-10-28T00:00:00Z', ...extra,
});

function respond(request, response, scenario) {
  const url = new URL(request.url, 'http://localhost');
  const page = url.searchParams.get('page');
  let body;
  let status = 200;
  if (scenario === 'network-error') return request.socket.destroy();
  if (scenario === 'timeout') return;
  if (scenario === 'body-timeout') {
    response.writeHead(200);
    response.write(' ');
    return;
  }
  if (url.pathname === '/feed/@ferhattufekci') {
    body = scenario === 'empty-rss' ? '<rss><channel/></rss>' : rss;
    if (scenario === 'rss-http') status = 503;
    if (scenario === 'truncated-rss') body = rss.replace('</channel></rss>', '');
  } else if (url.pathname.startsWith('/@ferhattufekci/')) {
    body = `<html><meta name="description" content="${introduction}"></html>`;
  } else if (url.pathname === '/graphql') {
    body = { data: { user: { pinnedItems: { nodes: [{ name: 'pinned-project' }] } } } };
    if (scenario === 'graphql-errors') body.errors = [{ message: 'Unavailable' }];
    if (scenario === 'graphql-invalid') body = { data: { user: null } };
    if (scenario === 'graphql-http') status = 403;
    if (scenario === 'graphql-json') body = '{';
    if (scenario === 'graphql-invalid-node') body.data.user.pinnedItems.nodes = [{}];
  } else if (url.pathname.endsWith('/repos')) {
    assert.equal(url.searchParams.get('type'), 'public');
    assert.equal(url.searchParams.get('per_page'), '100');
    body = page === '1'
      ? [repo('pinned-project', 1), repo('ferhattufekci'),
        ...Array.from({ length: 98 }, (_, i) => repo(`archived-${i}`, 0, { archived: true }))]
      : [repo('popular-project', 20, { description: 'Türkçe Java projesi' })];
    if (scenario === 'empty-repos') body = [];
    if (scenario === 'repos-invalid') body = {};
    if (scenario.startsWith('repos-http-')) status = Number(scenario.split('-').at(-1));
    if (scenario === 'repos-page2-http' && page === '2') status = 500;
    if (scenario === 'repos-json') body = '{';
  } else if (url.pathname.endsWith('/languages')) {
    body = { Java: 75, Shell: 25 };
    if (scenario === 'languages-http') status = 500;
    if (scenario === 'languages-invalid') body = [];
    if (scenario === 'languages-empty') body = {};
  } else if (url.pathname.endsWith('/starred')) {
    body = page === '1' ? Array.from({ length: 100 }, (_, i) => repo(`star-${i}`, i)) : [repo('star-last', 500)];
    if (scenario === 'starred-http' && page === '2') status = 429;
    if (scenario === 'starred-invalid') body = {};
    if (scenario === 'starred-empty') body = [];
    if (scenario === 'starred-json' && page === '2') body = '{';
  } else {
    status = 404;
    body = { message: 'Unexpected fixture request' };
  }
  response.writeHead(status);
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function runFetcher(script, scenario = 'success', token = 'synthetic-test-token') {
  const workspace = resolve(ROOT, 'work');
  await mkdir(workspace, { recursive: true });
  const root = await mkdtemp(join(workspace, 'sync-test-'));
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ url: request.url, method: request.method, headers: request.headers });
    respond(request, response, scenario);
  });
  try {
    for (const file of ['package.json', 'scripts/package.json', 'scripts/fetch-medium.js',
      'scripts/fetch-github.js', 'js/medium-language.js', 'js/medium-excerpt.js']) {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await cp(join(ROOT, file), join(root, file));
    }
    await mkdir(join(root, 'data'));
    const previous = Object.fromEntries(files.map(file => [file, JSON.stringify({ previous: file })]));
    await Promise.all(files.map(file => writeFile(join(root, 'data', file), previous[file])));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let code = 0;
    let output;
    try {
      const result = await execute(process.execPath, ['--import',
        new URL('./fixtures/sync-fetch.mjs', import.meta.url).href, `scripts/${script}.js`], {
        cwd: root, timeout: 15000,
        env: { ...process.env, NODE_OPTIONS: '', GITHUB_TOKEN: token,
          SYNC_TEST_TIMEOUT: ['timeout', 'body-timeout'].includes(scenario) ? '1' : '',
          SYNC_TEST_ORIGIN: `http://127.0.0.1:${server.address().port}` },
      });
      output = result.stdout + result.stderr;
    } catch (error) {
      assert.equal(typeof error.code, 'number', error.message);
      code = error.code;
      output = error.stdout + error.stderr;
    }
    const contents = Object.fromEntries(await Promise.all(files.map(async file =>
      [file, await readFile(join(root, 'data', file), 'utf8')])));
    assert.ok(!output.includes('synthetic-test-token'), 'Credentials must not appear in logs');
    return { code, output, previous, contents, requests };
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (dirname(root) !== workspace || !basename(root).startsWith('sync-test-')) {
      throw new Error('Refusing cleanup outside the sync fixture directory');
    }
    await rm(root, { recursive: true, force: true });
  }
}

test('sync entry point: Medium uses native fetch, loads local CJS helpers and preserves categories/exclusions', async () => {
  const result = await runFetcher('fetch-medium');
  assert.equal(result.code, 0, result.output);
  const all = JSON.parse(result.contents['medium-all.json']);
  assert.equal(all.length, 3);
  assert.equal(all[0].excerpt, introduction);
  assert.deepEqual(all.map(item => item.category), ['systems', 'test', 'software']);
  assert.ok(all.every(item => item.lang === 'en'));
  for (const category of ['systems', 'test', 'software']) {
    const bucket = JSON.parse(result.contents[`medium-${category}.json`]);
    assert.equal(bucket.length, 1);
    assert.ok(!('category' in bucket[0]));
  }
  assert.deepEqual(JSON.parse(result.contents['meta.json']).counts, { systems: 1, test: 1, software: 1, total: 3 });
  assert.equal(result.requests.length, 2, 'RSS and public preview both use the real HTTP stack');
});

test('sync entry point: GitHub fetches REST/GraphQL, paginates, filters and sorts before writing', async () => {
  const result = await runFetcher('fetch-github');
  assert.equal(result.code, 0, result.output);
  const repos = JSON.parse(result.contents['github-repos.json']);
  assert.deepEqual(repos.map(item => item.name), ['pinned-project', 'popular-project']);
  assert.deepEqual(repos.map(item => item.pinned), [true, false]);
  assert.deepEqual(repos.map(item => item.lang), ['en', 'tr']);
  assert.deepEqual(repos[0].languages.map(item => item.percent), [75, 25]);
  assert.equal(JSON.parse(result.contents['github-meta.json']).counts.total, 2);
  const starred = JSON.parse(result.contents['github-starred.json']);
  assert.equal(starred.length, 101);
  assert.equal(starred[0].name, 'star-last');
  assert.equal(result.requests.find(request => request.url === '/graphql').method, 'POST');
  assert.ok(result.requests.every(request => request.headers.authorization === 'Bearer synthetic-test-token'));
  assert.ok(result.requests.every(request => request.headers.accept === 'application/vnd.github+json'));
});

test('sync entry point: GitHub retains the public no-token mode and legitimate empty metadata', async () => {
  const result = await runFetcher('fetch-github', 'languages-empty', '');
  assert.equal(result.code, 0, result.output);
  assert.ok(!result.requests.some(request => request.url === '/graphql'));
  assert.ok(result.requests.every(request => !request.headers.authorization));
  assert.ok(JSON.parse(result.contents['github-repos.json']).every(repo => !repo.pinned && repo.languages.length === 0));
  const emptyStars = await runFetcher('fetch-github', 'starred-empty');
  assert.equal(emptyStars.code, 0, emptyStars.output);
  assert.deepEqual(JSON.parse(emptyStars.contents['github-starred.json']), []);
});

for (const [script, scenarios] of [
  ['fetch-medium', ['rss-http', 'network-error', 'empty-rss', 'truncated-rss', 'timeout', 'body-timeout']],
  ['fetch-github', ['repos-http-401', 'repos-http-403', 'repos-http-429', 'repos-http-500',
    'network-error', 'empty-repos', 'repos-invalid', 'graphql-errors', 'graphql-invalid',
    'graphql-http', 'languages-http', 'languages-invalid', 'starred-http', 'starred-invalid',
    'repos-page2-http', 'repos-json', 'graphql-json', 'graphql-invalid-node', 'starred-json', 'timeout', 'body-timeout']],
]) {
  for (const scenario of scenarios) test(`sync entry point: ${script} preserves all snapshots and fails on ${scenario}`, async () => {
    const result = await runFetcher(script, scenario);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /Fatal:/);
    assert.deepEqual(result.contents, result.previous);
  });
}

test('sync workflows share the root install, lock/cache, supported Node and GitHub token wiring', async () => {
  const manifest = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(manifest.engines.node, '>=20');
  for (const name of ['medium', 'github']) {
    const workflow = YAML.parse(await readFile(join(ROOT, `.github/workflows/fetch-${name}.yml`), 'utf8'));
    const job = workflow.jobs['fetch-and-commit'];
    assert.equal(job.defaults.run['working-directory'], '.');
    const setup = job.steps.find(step => step.uses?.startsWith('actions/setup-node@'));
    assert.equal(setup.with['node-version'], '22');
    assert.equal(setup.with.cache, 'npm');
    assert.equal(setup.with['cache-dependency-path'], 'package-lock.json');
    assert.ok(job.steps.some(step => step.run === 'npm ci'));
    const fetchStep = job.steps.find(step => step.run === `node scripts/fetch-${name}.js`);
    assert.ok(fetchStep);
    if (name === 'github') assert.equal(fetchStep.env.GITHUB_TOKEN, '${{ secrets.GITHUB_TOKEN }}');
  }
});
