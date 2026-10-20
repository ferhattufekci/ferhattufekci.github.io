import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createPagesServer, listen, close } from '../lib/pages-preview.mjs';
import { verify } from '../verify-agent-endpoints.mjs';

let server, origin;
before(async () => { server = createPagesServer(); origin = await listen(server); });
after(async () => { await close(server); });
const response = (url, body, type, status = 200) => {
  const result = new Response(body, { status, headers: { 'Content-Type': type } });
  Object.defineProperty(result, 'url', { value: String(url) });
  return result;
};

test('R-HTTP-01: GET evidence covers both Accept values at home and fresh absent root/nested paths', async () => {
  const calls = [];
  const fetchImpl = (url, options) => { calls.push(options.method); return fetch(url, options); };
  const first = await verify(origin, { fetchImpl });
  const second = await verify(origin);
  assert.equal(first.failed, 0);
  assert.equal(first.httpProbes.length, 6);
  assert.ok(calls.length > 6 && calls.every(method => method === 'GET'));
  const absent = [...new Set(first.httpProbes.filter(p => p.path !== '/').map(p => p.path))];
  assert.equal(absent.length, 2);
  assert.ok(absent.some(path => path.split('/').length > 2));
  assert.ok(absent.every(path => !second.httpProbes.some(p => p.path === path)));
  for (const probe of first.httpProbes) {
    assert.ok(probe.finalUrl.startsWith(origin));
    assert.match(probe.contentType, /^text\/html/);
    assert.ok(Object.hasOwn(probe, 'vary'));
    assert.ok(probe.bodyCharacters > 20 && probe.bodySha256.length === 64);
    assert.equal(probe.status, probe.path === '/' ? 200 : 404);
  }
  assert.equal(first.limitations.length, 3);
  assert.ok(first.limitations.every(item => item.supported === false));
});

test('R-HTTP-02: a 200 HTML fallback for an absent path fails independently of Markdown limitations', async () => {
  const report = await verify(origin, { fetchImpl: (url, options) =>
    new URL(url).pathname.startsWith('/__agent-readiness-')
      ? Promise.resolve(response(url, '<h1>Home</h1>', 'text/html')) : fetch(url, options) });
  assert.ok(report.checks.some(check => !check.pass && check.kind === 'http-status'));
});

for (const [body, type, kind] of [['[]', 'text/html', 'content-type'], ['<html>fallback</html>', 'application/json', 'format']]) {
  test(`R-HTTP-03: JSON rejects ${kind} failures even when HTTP status is 200`, async () => {
    const report = await verify(origin, { fetchImpl: (url, options) => String(url).endsWith('/data/github-repos.json')
      ? Promise.resolve(response(url, body, type)) : fetch(url, options) });
    const check = report.checks.find(check => check.name === 'Public file: /data/github-repos.json');
    assert.equal(check.pass, false);
    assert.equal(check.kind, kind);
  });
}

test('R-HTTP-04: malformed XML is rejected instead of being repaired by a tolerant DOM parser', async () => {
  const report = await verify(origin, { fetchImpl: async (url, options) => {
    const result = await fetch(url, options);
    if (!String(url).endsWith('/sitemap.xml')) return result;
    return response(url, (await result.text()).replace('</urlset>', ''), 'application/xml');
  } });
  assert.ok(report.checks.some(check => !check.pass && check.kind === 'format'));
});

test('R-HTTP-05: network failure is a failed check, not an unsupported capability or HTTP error', async () => {
  const report = await verify(origin, { fetchImpl: (url, options) => {
    if (new URL(url).pathname === '/' && options.headers.Accept === 'text/markdown') throw new TypeError('Simulated DNS failure');
    return fetch(url, options);
  } });
  assert.ok(report.checks.some(check => !check.pass && check.kind === 'network'));
  const probe = report.httpProbes.find(p => p.path === '/' && p.accept === 'text/markdown');
  assert.equal(probe.error.kind, 'network');
  assert.equal(probe.status, undefined);
});
