import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { parseHTML, DOMParser } from 'linkedom';
import { inventory, ROOT } from './lib/public-files.mjs';
import { createPagesServer, listen, close } from './lib/pages-preview.mjs';

export async function verify(base, { allFiles = false } = {}) {
  const origin = new URL(base).origin;
  const checks = [], limitations = [];
  async function check(name, callback) {
    try { checks.push({ name, pass: true, ...await callback() }); }
    catch (error) { checks.push({ name, pass: false, error: error.message }); }
  }
  async function get(path, accept = '*/*') {
    const response = await fetch(origin + path, { headers: { Accept: accept }, signal: AbortSignal.timeout(15000) });
    const body = await response.text();
    return { body, status: response.status, contentType: response.headers.get('content-type'), vary: response.headers.get('vary'), finalUrl: response.url };
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
  await check('Missing page retains HTTP 404 and provides recovery links', async () => {
    const result = await get('/__agent-readiness-missing-page', 'text/html');
    assert.equal(result.status, 404);
    assert.match(result.body, /llms\.txt/);
    assert.match(result.body, /sitemap\.xml/);
    assert.ok(result.body.length >= 20);
    return { status: result.status, contentType: result.contentType };
  });
  const files = allFiles ? await inventory() : ['index.md', '404.md', 'agent-instructions.md', 'about/index.md', 'contact/index.md', 'privacy/index.md', 'llms.txt', 'robots.txt', 'sitemap.xml', 'ads.txt', 'data/github-repos.json', 'data/github-starred.json', 'data/github-meta.json', 'data/medium-all.json', 'data/medium-software.json', 'data/medium-systems.json', 'data/medium-test.json', 'data/meta.json'];
  for (const file of files) await check(`Public file: /${file}`, async () => {
    const response = await fetch(origin + '/' + file, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    const body = await response.arrayBuffer();
    assert.ok(body.byteLength > 0);
    const text = new TextDecoder().decode(body);
    if (file.endsWith('.json')) JSON.parse(text);
    if (file.endsWith('.md')) { assert.doesNotMatch(response.headers.get('content-type') || '', /text\/html/); assert.match(text, /^# /); }
    return { status: response.status, contentType: response.headers.get('content-type'), bytes: body.byteLength };
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
    const xml = new DOMParser().parseFromString(body, 'text/xml');
    assert.equal(xml.documentElement.localName, 'urlset');
    assert.equal(xml.documentElement.getAttribute('xmlns'), 'http://www.sitemaps.org/schemas/sitemap/0.9');
    const paths = [...xml.querySelectorAll('loc')].map(node => new URL(node.textContent).pathname);
    assert.deepEqual(paths, ['/', '/about/', '/contact/', '/privacy/']);
    for (const path of paths) assert.equal((await get(path)).status, 200);
    return { urls: paths.length };
  });
  // Report unsupported audit requirements separately; direct .md files are not
  // presented as a successful content negotiation or MCP implementation.
  for (const path of ['/', '/__agent-readiness-missing-page']) {
    const result = await get(path, 'text/markdown');
    const negotiated = result.contentType?.startsWith('text/markdown') && /(?:^|,\s*)Accept(?:,|$)/i.test(result.vary || '') && result.body.length > 20 && result.status === (path === '/' ? 200 : 404);
    limitations.push({ requirement: path === '/' ? 'Homepage Markdown negotiation' : 'Markdown error response', supported: Boolean(negotiated), status: result.status, contentType: result.contentType, vary: result.vary, explanation: 'GitHub Pages serves fixed static responses; Accept-based Markdown negotiation cannot be enabled in repository files.' });
  }
  const mcp = await get('/.well-known/mcp');
  limitations.push({ requirement: 'Live MCP server', supported: false, discoveryStatus: mcp.status, explanation: 'GitHub Pages cannot run a Streamable HTTP MCP server. No manifest advertising an unavailable service is published.' });
  return { base: origin, verifiedAt: new Date().toISOString(), passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length, checks, limitations };
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
