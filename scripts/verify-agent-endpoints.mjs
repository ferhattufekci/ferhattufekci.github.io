import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { SaxesParser } from 'saxes';
import { parseHTML, DOMParser } from 'linkedom';
import { inventory, ROOT } from './lib/public-files.mjs';
import { createPagesServer, listen, close } from './lib/pages-preview.mjs';

export async function verify(base, { allFiles = false, fetchImpl = fetch } = {}) {
  const origin = new URL(base).origin;
  const checks = [], limitations = [], httpProbes = [];
  const publishedFiles = await inventory();
  const token = randomUUID();
  const missingPaths = [`/__agent-readiness-${token}`, `/__agent-readiness-${token}/nested/missing`];
  assert.ok(missingPaths.every(path => !publishedFiles.some(file => file === path.slice(1) || file.startsWith(path.slice(1) + '/'))));
  function requireValue(condition, kind, message) {
    if (!condition) throw Object.assign(new Error(message), { kind });
  }
  function parseXml(body) {
    try { new SaxesParser({ xmlns: true }).write(body).close(); }
    catch (error) { throw Object.assign(error, { kind: 'format' }); }
    return new DOMParser().parseFromString(body, 'text/xml');
  }
  async function check(name, callback) {
    try { checks.push({ name, pass: true, ...await callback() }); }
    catch (error) { checks.push({ name, pass: false, kind: error.kind || 'assertion', error: error.message }); }
  }
  async function get(path, accept = '*/*') {
    try {
      const response = await fetchImpl(origin + path, { method: 'GET', headers: { Accept: accept }, signal: AbortSignal.timeout(15000) });
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { body: new TextDecoder().decode(bytes), bytes: bytes.length, status: response.status,
        contentType: response.headers.get('content-type'), vary: response.headers.get('vary'), finalUrl: response.url };
    } catch (error) { throw Object.assign(error, { kind: 'network' }); }
  }
  function evidence(result, path, accept) {
    return { method: 'GET', path, accept, status: result.status, finalUrl: result.finalUrl,
      contentType: result.contentType, vary: result.vary, bodyCharacters: result.body.length,
      bodySha256: createHash('sha256').update(result.body).digest('hex'), bodyPreview: result.body.slice(0, 300) };
  }
  for (const path of ['/', ...missingPaths]) for (const accept of ['text/html', 'text/markdown']) {
    await check(`GET representation: ${path} (${accept})`, async () => {
      let result;
      try { result = await get(path, accept); }
      catch (error) { httpProbes.push({ method: 'GET', path, accept, error: { kind: 'network', message: error.message } }); throw error; }
      const item = evidence(result, path, accept);
      httpProbes.push(item);
      requireValue(result.status === (path === '/' ? 200 : 404), 'http-status', `Unexpected HTTP status ${result.status} for ${path}`);
      requireValue(/^text\/(?:html|markdown)(?:;|$)/i.test(result.contentType || ''), 'content-type', `Unexpected representation: ${result.contentType}`);
      requireValue(accept !== 'text/html' || /^text\/html/i.test(result.contentType || ''), 'content-type', 'HTML requests must receive HTML');
      requireValue(result.body.length > 20, 'format', 'Response must explain the requested resource');
      if (path !== '/') {
        assert.match(result.body, /llms\.txt/);
        assert.match(result.body, /sitemap\.xml/);
        const { document } = parseHTML(result.body);
        for (const asset of document.querySelectorAll('script[src],link[rel="stylesheet"][href],link[rel="icon"][href]')) {
          assert.match(asset.getAttribute('src') || asset.getAttribute('href'), /^(?:\/|https:\/\/)/, '404 assets must resolve from nested paths');
        }
      }
      return item;
    });
  }
  for (const path of ['/', '/index.html', '/about', '/about/', '/about/index.html', '/contact', '/contact/', '/contact/index.html', '/privacy', '/privacy/', '/privacy/index.html']) await check(`HTML: ${path}`, async () => {
    const result = await get(path, 'text/html');
    assert.equal(result.status, 200);
    assert.match(result.contentType, /^text\/html/);
    const { document } = parseHTML(result.body);
    assert.equal(document.querySelectorAll('h1').length, 1);
    document.querySelectorAll('script,style,nav,footer').forEach(node => node.remove());
    const contentCharacters = document.body.textContent.replace(/\s+/g, ' ').trim().length;
    assert.ok(contentCharacters >= 500);
    let previous = 0;
    for (const heading of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const level = Number(heading.tagName[1]);
      assert.ok(level <= previous + 1, `Heading skips ${previous} to ${level}: ${heading.textContent}`);
      previous = level;
    }
    return { status: result.status, contentType: result.contentType, finalUrl: result.finalUrl, contentCharacters };
  });
  const files = allFiles ? publishedFiles : ['index.md', '404.md', 'agent-instructions.md', 'about/index.md', 'contact/index.md', 'privacy/index.md', 'llms.txt', 'robots.txt', 'sitemap.xml', 'ads.txt', 'data/github-repos.json', 'data/github-starred.json', 'data/github-meta.json', 'data/medium-all.json', 'data/medium-software.json', 'data/medium-systems.json', 'data/medium-test.json', 'data/meta.json'];
  for (const file of files) await check(`Public file: /${file}`, async () => {
    const result = await get('/' + file);
    requireValue(result.status === 200, 'http-status', `${file}: HTTP ${result.status}`);
    assert.ok(result.bytes > 0);
    if (file.endsWith('.json')) {
      requireValue(/^application\/(?:[\w.+-]+\+)?json(?:;|$)/i.test(result.contentType || ''), 'content-type', `${file}: expected JSON, got ${result.contentType}`);
      try { JSON.parse(result.body); } catch (error) { throw Object.assign(error, { kind: 'format' }); }
    }
    if (file.endsWith('.xml')) {
      requireValue(/^(?:application|text)\/(?:[\w.+-]+\+)?xml(?:;|$)/i.test(result.contentType || ''), 'content-type', `${file}: expected XML`);
      parseXml(result.body);
    }
    if (file.endsWith('.md') || file === 'llms.txt' || file === 'robots.txt') {
      requireValue(/^text\/(?:plain|markdown)(?:;|$)/i.test(result.contentType || ''), 'content-type', `${file}: expected readable text, got ${result.contentType}`);
      if (file.endsWith('.md')) assert.match(result.body, /^# /);
    }
    return { ...evidence(result, '/' + file, '*/*'), bytes: result.bytes };
  });
  await check('Person JSON-LD description and static contact links', async () => {
    const { body } = await get('/');
    const { document } = parseHTML(body);
    const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    const person = data['@graph'].find(entity => entity['@type'] === 'Person');
    assert.ok(person.description.length > 20);
    assert.equal(document.querySelector('#h-m').getAttribute('href'), 'mailto:ferhattufekci@outlook.com.tr');
    assert.equal(document.querySelector('#h-p').getAttribute('href'), 'tel:+905076008179');
    return { description: person.description };
  });
  await check('llms.txt format, when-to-use guidance and local Markdown links', async () => {
    const { body } = await get('/llms.txt');
    assert.match(body, /^# Ferhat/);
    assert.match(body, /\n> /);
    assert.match(body, /## When to use this/);
    const links = [...body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];
    for (const [, link] of links) {
      const url = new URL(link, origin);
      if (url.hostname !== 'ferhattufekci.github.io' && url.origin !== origin) continue;
      assert.equal((await get(url.pathname)).status, 200, link);
    }
    return { links: links.length };
  });
  await check('Sitemap XML and trust pages', async () => {
    const { body } = await get('/sitemap.xml');
    const xml = parseXml(body);
    assert.equal(xml.documentElement.localName, 'urlset');
    assert.equal(xml.documentElement.getAttribute('xmlns'), 'http://www.sitemaps.org/schemas/sitemap/0.9');
    const paths = [...xml.querySelectorAll('loc')].map(node => new URL(node.textContent).pathname);
    assert.deepEqual(paths, ['/', '/about/', '/contact/', '/privacy/']);
    for (const path of paths) assert.equal((await get(path)).status, 200);
    return { urls: paths.length };
  });
  // Report unsupported audit requirements separately; direct .md files are not
  // presented as a successful content negotiation or MCP implementation.
  for (const homepage of [true, false]) {
    const samples = httpProbes.filter(probe => probe.accept === 'text/markdown' && (probe.path === '/') === homepage);
    const negotiated = samples.every(result => !result.error && /^text\/markdown(?:;|$)/i.test(result.contentType || '') && /(?:^|,\s*)Accept(?:\s*,|\s*$)/i.test(result.vary || '') && result.bodyCharacters > 20 && result.status === (homepage ? 200 : 404));
    const first = samples[0];
    limitations.push({ requirement: homepage ? 'Homepage Markdown negotiation' : 'Markdown error response', supported: negotiated,
      status: first.status, contentType: first.contentType, vary: first.vary, samples,
      explanation: samples.some(sample => sample.error) ? 'Network failure prevented verification; see failed checks.' : 'GitHub Pages serves fixed static responses; Accept-based Markdown negotiation cannot be enabled in repository files.' });
  }
  let mcp;
  await check('MCP audit-path observation (not a protocol handshake)', async () => {
    mcp = await get('/.well-known/mcp');
    return evidence(mcp, '/.well-known/mcp', '*/*');
  });
  limitations.push({ requirement: 'Live MCP server', supported: false, discoveryStatus: mcp?.status, handshakeAttempted: false,
    explanation: 'This static portfolio declares no MCP tool API. GitHub Pages cannot run a Streamable HTTP server; the audit-specific /.well-known/mcp path is not a substitute for protocol discovery.' });
  return { base: origin, verifiedAt: new Date().toISOString(), probeSource: 'fresh UUID paths absent from the repository public inventory',
    passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length, checks, httpProbes, limitations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const local = process.argv.includes('--local');
  const server = local ? createPagesServer(process.argv.includes('--artifact') ? join(ROOT, '.pages-site') : ROOT) : null;
  try {
    const base = local ? await listen(server) : (process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'https://ferhattufekci.github.io');
    const report = await verify(base, { allFiles: process.argv.includes('--all') });
    const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length);
    if (output) await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.failed ? 1 : 0;
  } finally { if (server) await close(server); }
}
